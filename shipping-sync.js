/* ============================================================================
   Smackin' OS — swappable shipping sync  (shipping-sync.js)
   Pulls shipments and orders from the configured carrier source and upserts
   a normalized record into the existing `shipping_log` table.

   Why not `orders`: that table is the customer-order board (SPS / Stripe /
   manual). Its id is a serial integer and it has no cost, service, or items
   columns. Putting carrier traffic there would show shipments as customer
   orders. `shipping_log` already has ship_date, carrier, tracking, cost,
   status, and contents. The order number is stored on recipient, the service
   on ship_type, and a [[SHIPSYNC:provider:kind:id]] marker in notes so a
   repeat poll updates the same row. The sync cursor lives in kv_status.

   Provider is chosen by SMACKIN_CONFIG.shippingProvider ("shipstation" today,
   "globalship" later). ShipStation is the v1 API at https://ssapi.shipstation.com
   (Basic auth). GlobalShip is a stub until Smackin's server exists.

   Credentials are NOT in this repo. The module asks the Supabase edge
   function `shipping-credentials` (absent today). With no credentials it
   logs one quiet note and does not poll or write. Cloud mode only.
   Data polling uses setTimeout. The nav item is kept by a MutationObserver
   on #nav — no DOM timers.
   ========================================================================== */
(function () {
  "use strict";

  var POLL_MS = 3 * 60 * 1000;
  var FIRST_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
  var OVERLAP_MS = 2 * 60 * 1000;
  var PAGE_CAP = 4;
  var SS_BASE = "https://ssapi.shipstation.com";
  var CURSOR_PREFIX = "shipping-sync:";
  var MARK = "[[SHIPSYNC:";

  var state = {
    booted: false,
    noted: false,
    busy: false,
    connected: false,
    ready: false,
    reason: "",
    creds: null,
    cursor: "",
    pollTimer: 0,
    viewOpen: false
  };

  function cfg() { return window.SMACKIN_CONFIG || {}; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function noteOnce(msg) {
    if (state.noted) return;
    state.noted = true;
    try { console.info("[shipping-sync] " + msg); } catch (e) {}
  }
  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    return "$" + v.toFixed(2);
  }
  function day(s) {
    s = String(s || "");
    if (!s) return "";
    return s.slice(0, 10);
  }
  function ssStamp(input) {
    var d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) d = new Date(Date.now() - FIRST_LOOKBACK_MS);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
      " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }
  function stableId(key) {
    var h1 = 2166136261, h2 = 2166136261 ^ 0x9e3779b9, h3 = 2166136261 ^ 0x85ebca6b, h4 = 2166136261 ^ 0xc2b2ae35;
    for (var i = 0; i < key.length; i++) {
      var c = key.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 2246822519);
      h3 = Math.imul(h3 ^ c, 3266489917);
      h4 = Math.imul(h4 ^ c, 668265263);
    }
    function hex(n) { return ("00000000" + (n >>> 0).toString(16)).slice(-8); }
    var s = hex(h1) + hex(h2) + hex(h3) + hex(h4);
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20, 32);
  }
  function itemsText(items) {
    return (items || []).map(function (it) {
      var bit = (it.sku ? it.sku + " " : "") + (it.name || "");
      if (it.qty != null && it.qty !== "") bit += " x" + it.qty;
      return bit.trim();
    }).filter(Boolean).join("; ");
  }
  function marker(rec) { return MARK + rec.provider + ":" + rec.kind + ":" + rec.externalId + "]]"; }
  function parseMarker(notes) {
    var m = /\[\[SHIPSYNC:([^:\]]+):([^:\]]+):([^\]]+)\]\]/.exec(notes || "");
    if (!m) return null;
    return { provider: m[1], kind: m[2], externalId: m[3] };
  }
  function carrierName(code) {
    var c = String(code || "").toLowerCase();
    var map = {
      stamps_com: "USPS", usps: "USPS", ups: "UPS", ups_walleted: "UPS",
      fedex: "FedEx", fedex_walleted: "FedEx", dhl_express: "DHL", dhl_ecommerce: "DHL",
      globalpost: "GlobalPost"
    };
    if (!c) return "";
    return map[c] || c.replace(/_/g, " ");
  }
  function serviceName(code) {
    return String(code || "").replace(/_/g, " ");
  }
  function mapItems(list) {
    return (list || []).map(function (it) {
      return {
        sku: it.sku || it.lineItemKey || "",
        name: it.name || "",
        qty: it.quantity != null ? it.quantity : (it.qty != null ? it.qty : "")
      };
    }).filter(function (it) { return it.sku || it.name; });
  }

  function normalizeShipment(raw, provider) {
    if (!raw || raw.shipmentId == null) return null;
    var cost = (Number(raw.shipmentCost) || 0) + (Number(raw.insuranceCost) || 0);
    return {
      provider: provider,
      kind: "shipment",
      externalId: String(raw.shipmentId),
      orderNumber: raw.orderNumber || raw.orderKey || "",
      carrier: carrierName(raw.carrierCode),
      service: serviceName(raw.serviceCode),
      tracking: raw.trackingNumber || "",
      shipDate: day(raw.shipDate || raw.createDate),
      cost: Math.round(cost * 100) / 100,
      status: raw.voided ? "voided" : "shipped",
      items: mapItems(raw.shipmentItems)
    };
  }
  function normalizeOrder(raw, provider) {
    if (!raw || raw.orderId == null) return null;
    var status = String(raw.orderStatus || "open").toLowerCase();
    return {
      provider: provider,
      kind: "order",
      externalId: String(raw.orderId),
      orderNumber: raw.orderNumber || raw.orderKey || "",
      carrier: carrierName(raw.carrierCode),
      service: serviceName(raw.serviceCode),
      tracking: raw.trackingNumber || "",
      shipDate: day(raw.shipDate || raw.orderDate || raw.modifyDate),
      cost: Math.round((Number(raw.shippingAmount) || 0) * 100) / 100,
      status: status,
      items: mapItems(raw.items)
    };
  }
  function toRow(rec) {
    return {
      id: stableId(rec.provider + ":" + rec.kind + ":" + rec.externalId),
      ship_date: rec.shipDate || new Date().toISOString().slice(0, 10),
      ship_type: rec.service || rec.kind,
      recipient: rec.orderNumber || "",
      address: "",
      carrier: rec.carrier || "",
      tracking: rec.tracking || "",
      requested_by: "",
      contents: itemsText(rec.items),
      lot: "",
      status: rec.status || "",
      cost: Number(rec.cost) || 0,
      notes: marker(rec),
      entered_by: "sync:" + rec.provider
    };
  }

  var shipstation = {
    id: "shipstation",
    label: "ShipStation",
    stub: false,
    normalizeShipment: function (raw) { return normalizeShipment(raw, "shipstation"); },
    normalizeOrder: function (raw) { return normalizeOrder(raw, "shipstation"); },
    fetchUpdated: function (since, creds) {
      if (creds && creds.proxy) {
        return pullProxy("shipstation", since).then(function (pack) { pack.complete = true; return pack; });
      }
      return Promise.all([
        pullShipStation("/shipments", "shipments", since, creds),
        pullShipStation("/orders", "orders", since, creds)
      ]).then(function (pair) {
        var rawS = pair[0].rows, rawO = pair[1].rows, max = 0;
        rawS.concat(rawO).forEach(function (r) {
          var t = new Date(r.modifyDate || r.shipDate || r.createDate || 0).getTime();
          if (t > max) max = t;
        });
        return {
          shipments: rawS.map(function (r) { return normalizeShipment(r, "shipstation"); }).filter(Boolean),
          orders: rawO.map(function (r) { return normalizeOrder(r, "shipstation"); }).filter(Boolean),
          complete: !!(pair[0].complete && pair[1].complete),
          cursor: max ? new Date(max).toISOString() : ""
        };
      });
    }
  };

  var globalship = {
    id: "globalship",
    label: "GlobalShip",
    stub: true,
    normalizeShipment: function () { return null; },
    normalizeOrder: function () { return null; },
    fetchUpdated: function () {
      return Promise.resolve({ shipments: [], orders: [], stub: true });
    }
  };

  window.ShippingProviders = { shipstation: shipstation, globalship: globalship };

  function currentProvider() {
    var id = String(cfg().shippingProvider || "shipstation").toLowerCase();
    return window.ShippingProviders[id] || null;
  }

  function fnUrl(name) {
    return String(cfg().SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/" + name;
  }
  function fnHeaders() {
    var key = cfg().SUPABASE_ANON_KEY || "";
    return { apikey: key, Authorization: "Bearer " + key, Accept: "application/json", "Content-Type": "application/json" };
  }
  function basicAuth(creds) {
    var raw = String(creds.apiKey || "") + ":" + String(creds.apiSecret || "");
    var b64 = (typeof btoa === "function") ? btoa(raw) : "";
    return "Basic " + b64;
  }
  function sbClient() {
    if (!window.supabase || !cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return null;
    try { return window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY); } catch (e) { return null; }
  }

  function fetchTimeout(url, opts, ms) {
    var ctrl = (typeof AbortController === "function") ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 8000);
    var o = {};
    opts = opts || {};
    Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
    if (ctrl) o.signal = ctrl.signal;
    return fetch(url, o).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }
  function loadCredentials() {
    var inline = cfg().shippingCredentials;
    if (inline && (inline.proxy || (inline.apiKey && inline.apiSecret))) return Promise.resolve(inline);
    if (!cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return Promise.resolve(null);
    return fetchTimeout(fnUrl("shipping-credentials"), { headers: fnHeaders() }, 8000).then(function (r) {
      if (!r.ok) return null;
      return r.json().catch(function () { return null; });
    }).then(function (body) {
      if (!body || typeof body !== "object") return null;
      if (body.proxy === true && !body.apiKey && !body.apiSecret) return { proxy: true };
      var apiKey = body.apiKey || body.key || body.api_key || "";
      var apiSecret = body.apiSecret || body.secret || body.api_secret || "";
      if (apiKey && apiSecret) return { apiKey: apiKey, apiSecret: apiSecret, proxy: !!body.proxy };
      return null;
    }).catch(function () { return null; });
  }

  function pullShipStation(path, listKey, since, creds) {
    var page = 1, pages = 1, out = [];
    function next() {
      var qs = "?pageSize=100&page=" + page +
        "&sortBy=ModifyDate&sortDir=ASC&modifyDateStart=" + encodeURIComponent(ssStamp(since));
      return fetch(SS_BASE + path + qs, {
        headers: { Authorization: basicAuth(creds), Accept: "application/json" }
      }).then(function (r) {
        if (!r.ok) throw new Error("shipstation " + r.status);
        return r.json();
      }).then(function (body) {
        var rows = (body && body[listKey]) || (Array.isArray(body) ? body : []);
        out = out.concat(rows);
        pages = (body && body.pages) || 1;
        if (page < pages && page < PAGE_CAP) { page++; return next(); }
        return { rows: out, complete: page >= pages };
      });
    }
    return next();
  }
  function pullProxy(providerId, since) {
    return fetch(fnUrl("shipping-pull"), {
      method: "POST",
      headers: fnHeaders(),
      body: JSON.stringify({ provider: providerId, since: new Date(since).toISOString() })
    }).then(function (r) {
      if (!r.ok) throw new Error("shipping-pull " + r.status);
      return r.json();
    }).then(function (body) {
      body = body || {};
      var p = providerId;
      return {
        shipments: (body.shipments || []).map(function (r) { return normalizeShipment(r, p); }).filter(Boolean),
        orders: (body.orders || []).map(function (r) { return normalizeOrder(r, p); }).filter(Boolean)
      };
    });
  }

  function readCursor(providerId) {
    if (state.cursor) return state.cursor;
    try {
      var v = window.DB && DB.kvGet ? DB.kvGet(CURSOR_PREFIX + providerId) : "";
      return v || "";
    } catch (e) { return ""; }
  }
  function writeCursor(providerId, iso) {
    state.cursor = iso;
    try { if (window.DB && DB.kvSet) DB.kvSet(CURSOR_PREFIX + providerId, iso); } catch (e) {}
  }
  function sinceDate(providerId) {
    var cur = readCursor(providerId);
    var t = cur ? new Date(cur).getTime() : (Date.now() - FIRST_LOOKBACK_MS);
    if (isNaN(t)) t = Date.now() - FIRST_LOOKBACK_MS;
    return new Date(t - OVERLAP_MS);
  }

  function upsertAll(recs) {
    var client = sbClient();
    if (!client) return Promise.resolve({ ok: false });
    var rows = [];
    var seen = {};
    recs.forEach(function (rec) {
      if (!rec || !rec.externalId) return;
      var row = toRow(rec);
      if (seen[row.id]) return;
      seen[row.id] = true;
      rows.push(row);
    });
    if (!rows.length) return Promise.resolve({ ok: true, n: 0 });
    function chunk(i) {
      if (i >= rows.length) return Promise.resolve({ ok: true, n: rows.length });
      var part = rows.slice(i, i + 100);
      return client.from("shipping_log").upsert(part, { onConflict: "id" }).then(function (res) {
        if (res && res.error) throw new Error(res.error.message || "upsert failed");
        return chunk(i + 100);
      });
    }
    return chunk(0);
  }

  function syncOnce() {
    var provider = currentProvider();
    if (!provider || provider.stub || !state.connected || !state.creds) return Promise.resolve({ ok: false, skipped: true });
    if (!window.DB || DB.mode !== "cloud") return Promise.resolve({ ok: false, skipped: true });
    if (state.busy) return Promise.resolve({ ok: false, skipped: true });
    state.busy = true;
    var since = sinceDate(provider.id);
    return provider.fetchUpdated(since, state.creds).then(function (pack) {
      pack = pack || {};
      var recs = (pack.shipments || []).concat(pack.orders || []);
      return upsertAll(recs).then(function (res) {
        if (pack.complete === false && pack.cursor) writeCursor(provider.id, pack.cursor);
        else writeCursor(provider.id, new Date().toISOString());
        if (state.viewOpen) renderView();
        return res;
      });
    }).catch(function (err) {
      noteOnce("Shipping sync did not complete (" + (err && err.message ? err.message : "request failed") + ").");
      return { ok: false };
    }).then(function (res) {
      state.busy = false;
      return res;
    });
  }

  function arm(ms) {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    state.pollTimer = setTimeout(function () {
      state.pollTimer = 0;
      syncOnce().then(function () { if (state.connected) arm(POLL_MS); });
    }, ms);
  }

  function boot() {
    if (state.booted) return;
    if (!window.DB || DB.mode !== "cloud") return;
    state.booted = true;
    var provider = currentProvider();
    if (!provider) {
      state.ready = true;
      state.reason = "unknown";
      noteOnce("Not connected — shippingProvider is not a known adapter.");
      if (state.viewOpen) renderView();
      return;
    }
    if (provider.stub) {
      state.ready = true;
      state.connected = false;
      state.reason = "stub";
      noteOnce(provider.label + " is not connected yet.");
      if (state.viewOpen) renderView();
      return;
    }
    loadCredentials().then(function (creds) {
      state.ready = true;
      state.creds = creds;
      if (!creds) {
        state.connected = false;
        state.reason = "nocreds";
        noteOnce("Not connected — no shipping credentials configured.");
        if (state.viewOpen) renderView();
        return;
      }
      state.connected = true;
      state.reason = "";
      syncOnce();
      arm(POLL_MS);
      if (state.viewOpen) renderView();
    });
  }

  function recentRows() {
    var provider = currentProvider();
    var client = sbClient();
    if (!provider || !client || !state.connected) return Promise.resolve([]);
    return client.from("shipping_log").select("*").eq("entered_by", "sync:" + provider.id)
      .order("ship_date", { ascending: false }).limit(40)
      .then(function (res) { return (res && res.data) || []; })
      .catch(function () { return []; });
  }

  function statusPill(status) {
    var s = String(status || "").toLowerCase();
    var cls = "low";
    if (s === "shipped" || s === "complete" || s === "completed") cls = "ok";
    else if (s === "voided" || s === "cancelled" || s === "canceled") cls = "out";
    return '<span class="pill ' + cls + '">' + esc(status || "n/a") + "</span>";
  }

  function renderView() {
    var host = $("view"); if (!host) return;
    state.viewOpen = true;
    var provider = currentProvider();
    var label = provider ? provider.label : "Shipping";
    if (!state.ready) {
      host.innerHTML = '<div class="card"><h2>Shipping</h2><p class="hint">Checking the shipping connection…</p></div>';
      return;
    }
    if (!state.connected) {
      host.innerHTML = '<div class="card"><h2>Shipping</h2>' +
        '<p class="hint">Shipping data is not connected yet. It will appear here once ShipStation credentials are added.</p></div>';
      return;
    }
    host.innerHTML = '<div class="card"><h2>Shipping</h2><p class="hint">Recent ' + esc(label) +
      " shipments and orders. Read only.</p>" +
      '<p class="muted" id="ship-sync-body">Loading…</p></div>';
    recentRows().then(function (rows) {
      if (!state.viewOpen) return;
      var body = $("ship-sync-body"); if (!body) return;
      if (!rows.length) {
        body.textContent = "No shipments synced yet.";
        return;
      }
      var html = '<div class="tblwrap"><table class="sortable"><thead><tr>' +
        "<th>Ship date</th><th>Type</th><th>Order</th><th>Carrier</th><th>Service</th>" +
        "<th>Tracking</th><th class=\"right\">Cost</th><th>Status</th><th>Items</th>" +
        "</tr></thead><tbody>";
      rows.forEach(function (r) {
        var meta = parseMarker(r.notes) || {};
        html += "<tr><td class=\"sm\">" + esc(day(r.ship_date)) + "</td>" +
          "<td>" + esc(meta.kind || "") + "</td>" +
          "<td><b>" + esc(r.recipient || "") + "</b></td>" +
          "<td>" + esc(r.carrier || "") + "</td>" +
          "<td>" + esc(r.ship_type || "") + "</td>" +
          "<td class=\"sm\">" + esc(r.tracking || "") + "</td>" +
          '<td class="right">' + esc(money(r.cost)) + "</td>" +
          "<td>" + statusPill(r.status) + "</td>" +
          "<td class=\"sm\">" + esc(r.contents || "") + "</td></tr>";
      });
      html += "</tbody></table></div>";
      body.outerHTML = html;
    });
  }

  function markActive() {
    var nav = $("nav"); if (!nav) return;
    var items = nav.querySelectorAll(".navitem");
    for (var i = 0; i < items.length; i++) items[i].classList.remove("active");
    var mine = $("ship-sync-nav"); if (mine) mine.classList.add("active");
  }
  function openView(ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    markActive();
    try { var n = $("nav"), b = $("navBackdrop"); if (n) n.classList.remove("open"); if (b) b.classList.remove("show"); } catch (e) {}
    renderView();
  }

  function ensureNav() {
    var nav = $("nav"); if (!nav || $("ship-sync-nav")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "ship-sync-nav";
    btn.className = "navitem";
    btn.innerHTML = '<i class="navico" data-lucide="ship"></i><span>Shipments</span>';
    btn.addEventListener("click", openView);
    var anchor = null;
    var items = nav.querySelectorAll(".navitem");
    for (var i = 0; i < items.length; i++) {
      var oc = items[i].getAttribute("onclick") || "";
      if (oc.indexOf("'shiplog'") >= 0) { anchor = items[i]; break; }
    }
    if (anchor && anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else if (anchor) anchor.parentNode.appendChild(btn);
    else nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  function watchNav() {
    var nav = $("nav");
    if (!nav || nav.__shipSyncObs || typeof MutationObserver !== "function") return;
    ensureNav();
    var obs = new MutationObserver(function () { ensureNav(); });
    nav.__shipSyncObs = obs;
    obs.observe(nav, { childList: true });
  }

  document.addEventListener("click", function (e) {
    var it = e.target && e.target.closest ? e.target.closest(".navitem") : null;
    if (!it || it.id === "ship-sync-nav") return;
    state.viewOpen = false;
  }, true);

  var cloudWaits = 0;
  function waitCloud() {
    if (state.booted || state.ready) return;
    if (window.DB && DB.mode === "cloud") { boot(); return; }
    cloudWaits++;
    if (cloudWaits > 40) {
      state.ready = true;
      state.reason = "local";
      noteOnce("Not connected — shipping sync runs only in cloud mode.");
      if (state.viewOpen) renderView();
      return;
    }
    setTimeout(waitCloud, 400);
  }
  if (window.DB && DB.onChange) DB.onChange(function () { if (DB.mode === "cloud") boot(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { watchNav(); waitCloud(); });
  else { watchNav(); waitCloud(); }

  window.SHIPPING_SYNC = {
    provider: currentProvider,
    connected: function () { return state.connected; },
    syncOnce: syncOnce,
    toRow: toRow,
    stableId: stableId,
    parseMarker: parseMarker,
    normalizeShipment: normalizeShipment,
    normalizeOrder: normalizeOrder
  };
})();

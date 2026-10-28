/* ============================================================================
   Smackin' OS - Shipments view  (shipping-sync.js)
   Reads shipping_log and kv_status written by the shipping-sync edge function.
   The browser does not call XPO, Worldwide Express, or EasyPost and does not fetch credentials.
   The nav item is kept by a MutationObserver on #nav. No DOM timers.
   ========================================================================== */
(function () {
  "use strict";

  var MARK_RE = /\[\[SHIPSYNC:([^:\]]+):([^:\]]+):([^\]]+)\]\]/;
  var state = { viewOpen: false, token: 0 };

  function cfg() { return window.SMACKIN_CONFIG || {}; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).replace("T", " ").slice(0, 16);
    try { return d.toLocaleString(); } catch (e) { return String(iso).replace("T", " ").slice(0, 16); }
  }
  function parseMarker(notes) {
    var m = MARK_RE.exec(notes || "");
    if (!m) return null;
    return { provider: m[1], kind: m[2], externalId: m[3] };
  }
  function prettyStatus(status) {
    var s = String(status || "").replace(/_/g, " ").trim();
    return s || "n/a";
  }
  function sbClient() {
    if (!window.supabase || !cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return null;
    try { return window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY); } catch (e) { return null; }
  }
  function styleOnce() {
    if ($("shs-style")) return;
    var s = document.createElement("style");
    s.id = "shs-style";
    s.textContent = [
      ".shs-banner{padding:10px 12px;border-radius:8px;font-size:14px;line-height:1.45;margin:0 0 12px}",
      ".shs-ok{background:#e0f4e8;color:#1d5631;border:1px solid #b7e4c7}",
      ".shs-wait{background:#fff6e9;color:#7a4d05;border:1px solid #f3d7a1}",
      ".shs-bad{background:#fbe3e0;color:#8d1f1a;border:1px solid #f3c0bc}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }
  function statusPill(status) {
    var s = String(status || "").toLowerCase();
    var cls = "low";
    if (s === "shipped" || s === "complete" || s === "completed") cls = "ok";
    else if (s === "voided" || s === "cancelled" || s === "canceled") cls = "out";
    return '<span class="pill ' + cls + '">' + esc(prettyStatus(status)) + "</span>";
  }
  function providerLabel(sync) {
    if (sync && sync.label) return String(sync.label);
    if (sync && sync.provider) return String(sync.provider);
    return "the shipping provider";
  }
  function trackHref(carrier, num) {
    var n = encodeURIComponent(String(num || "").trim());
    if (!n) return "";
    var c = String(carrier || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.indexOf("XPO") === 0) return "https://ltl.xpo.com/webapp/manifestrpts_p_app/shipmentTracking.do?PRO=" + n;
    if (c.indexOf("WORLDWIDE") === 0 || c === "WWEX" || c.indexOf("SPEEDSHIP") === 0) return "https://track.speedship.com/#" + n;
    if (c.indexOf("UPS") === 0) return "https://www.ups.com/track?tracknum=" + n;
    if (c.indexOf("FEDEX") === 0) return "https://www.fedex.com/fedextrack/?trknbr=" + n;
    if (c.indexOf("USPS") === 0) return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + n;
    if (c.indexOf("DHL") === 0) return "https://www.dhl.com/us-en/home/tracking.html?tracking-id=" + n;
    return "";
  }
  function banner(sync, rowCount) {
    if (sync && sync.stub) {
      return '<div class="shs-banner shs-wait">' + esc(sync.message || ((sync.label || "Shipping") + " is not connected yet.")) + "</div>";
    }
    var named = sync && (sync.provider || sync.label);
    var connected = named && (rowCount > 0 || sync.ok || sync.at);
    if (connected) {
      var parts = ["Connected to " + providerLabel(sync) + "."];
      if (sync && sync.at) parts.push("Last sync " + when(sync.at) + ".");
      if (sync && (sync.shipments != null || sync.orders != null)) {
        var nShip = Number(sync.shipments) || 0;
        var nOrder = Number(sync.orders) || 0;
        parts.push("Last run: " + nShip + (nShip === 1 ? " shipment" : " shipments") + ", " + nOrder + (nOrder === 1 ? " order" : " orders") + ".");
      }
      var html = '<div class="shs-banner ' + (sync && sync.ok === false ? "shs-wait" : "shs-ok") + '">' + esc(parts.join(" "));
      if (sync && sync.ok === false) {
        html += "<br>" + esc("The latest run did not finish.");
      }
      if (sync && sync.message) html += "<br>" + esc(sync.message);
      return html + "</div>";
    }
    if (sync && sync.ok === false) {
      return '<div class="shs-banner shs-bad">' + esc("The latest run did not finish.") +
        (sync.at ? " " + esc("Last sync " + when(sync.at) + ".") : "") +
        (sync.message ? "<br>" + esc(sync.message) : "") + "</div>";
    }
    return '<div class="shs-banner shs-wait">' + esc(providerLabel(sync) + " sync has not run yet. Shipments appear here after the server sync.") + "</div>";
  }
  function load() {
    var client = sbClient();
    if (!client) return Promise.resolve({ sync: null, rows: [], error: "Not connected." });
    return Promise.all([
      client.from("kv_status").select("value").eq("key", "shipping:last_sync").limit(1),
      client.from("shipping_log").select("id,ship_date,ship_type,recipient,carrier,tracking,contents,status,cost,notes,entered_by")
        .like("entered_by", "sync:%")
        .order("ship_date", { ascending: false })
        .limit(50)
    ]).then(function (res) {
      var sync = null;
      var kv = res[0];
      if (kv && kv.error) return { sync: null, rows: [], error: kv.error.message || "Could not read sync status." };
      if (kv && kv.data && kv.data[0] && kv.data[0].value) {
        try { sync = JSON.parse(kv.data[0].value); } catch (e) { sync = null; }
      }
      var rowsRes = res[1];
      if (rowsRes && rowsRes.error) return { sync: sync, rows: [], error: rowsRes.error.message || "Could not read shipments." };
      var rows = ((rowsRes && rowsRes.data) || []).filter(function (r) { return parseMarker(r.notes); });
      return { sync: sync, rows: rows, error: "" };
    }).catch(function () {
      return { sync: null, rows: [], error: "Could not read shipments." };
    });
  }
  function table(rows) {
    if (!rows.length) return '<p class="muted">No shipments yet.</p>';
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
        "<td class=\"sm\">" + (function () {
          var href = trackHref(r.carrier, r.tracking);
          return href ? '<a href="' + href + '" target="_blank" rel="noopener">' + esc(r.tracking || "") + "</a>" : esc(r.tracking || "");
        })() + "</td>" +
        '<td class="right">' + esc(money(r.cost)) + "</td>" +
        "<td>" + statusPill(r.status) + "</td>" +
        "<td class=\"sm\">" + esc(r.contents || "") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }
  function renderView() {
    var host = $("view");
    if (!host) return;
    state.viewOpen = true;
    var token = ++state.token;
    styleOnce();
    host.innerHTML = '<div class="card"><h2>Shipments</h2>' +
      '<p class="hint">The server syncs the selected shipping provider into this list. This screen only reads the database.</p>' +
      '<div id="shs-sync"><p class="muted">Loading...</p></div>' +
      '<div id="shs-body"></div></div>';
    load().then(function (pack) {
      if (!state.viewOpen || token !== state.token) return;
      var syncEl = $("shs-sync");
      var bodyEl = $("shs-body");
      if (!syncEl || !bodyEl) return;
      if (pack.error && !pack.rows.length && !pack.sync) {
        syncEl.innerHTML = '<div class="shs-banner shs-bad">' + esc(pack.error) + "</div>";
        bodyEl.innerHTML = "";
        return;
      }
      syncEl.innerHTML = banner(pack.sync, (pack.rows || []).length);
      if (pack.error) {
        bodyEl.innerHTML = '<p class="muted">' + esc(pack.error) + "</p>";
        return;
      }
      bodyEl.innerHTML = table(pack.rows || []);
    });
  }
  function markActive() {
    var nav = $("nav");
    if (!nav) return;
    var items = nav.querySelectorAll(".navitem");
    for (var i = 0; i < items.length; i++) items[i].classList.remove("active");
    var mine = $("shs-nav");
    if (mine) mine.classList.add("active");
  }
  function openView(ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    markActive();
    ensureRt();
    try {
      var n = $("nav"), b = $("navBackdrop");
      if (n) n.classList.remove("open");
      if (b) b.classList.remove("show");
    } catch (e) {}
    renderView();
  }
  function ensureNav() {
    var nav = $("nav");
    if (!nav || $("shs-nav")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "shs-nav";
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

  var rtOn = false;
  function ensureRt() {
    if (rtOn) return;
    var client = sbClient();
    if (!client) return;
    rtOn = true;
    try {
      client.channel("ship-sync-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "shipping_log" }, function () { if (state.viewOpen) renderView(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "kv_status", filter: "key=eq.shipping:last_sync" }, function () { if (state.viewOpen) renderView(); })
        .subscribe();
    } catch (e) { rtOn = false; }
  }
  document.addEventListener("click", function (e) {
    var it = e.target && e.target.closest ? e.target.closest(".navitem") : null;
    if (!it || it.id === "shs-nav") return;
    state.viewOpen = false;
  }, true);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && state.viewOpen) renderView();
  });
  window.SMK_VIEW_LOCKS = window.SMK_VIEW_LOCKS || [];
  window.SMK_VIEW_LOCKS.push(function () { return state.viewOpen; });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchNav);
  else watchNav();

  window.SHIPPING_SYNC = { open: openView, parseMarker: parseMarker };
})();

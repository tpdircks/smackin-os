/* ============================================================================
   Smackin' OS - SPS Feed  (sps-feed.js)
   Viewer + parser for the SPS Commerce Transaction API documents (850 PO,
   856 ASN, 810 invoice) that flow into the app as JSON.

   Architecture: the live pull is server-to-server (the SPS Transaction API
   uses token auth and does not allow browser CORS), so a Supabase Edge
   Function authenticates to SPS, pulls the /testout (then live) documents, and
   writes them to the `sps_transactions` table. THIS screen reads that table,
   shows each document, and - until the live feed is wired - lets you paste a
   sample JSON document to validate the parser end to end.

   Adds an "SPS Feed" nav item. Self-contained, no app.js edit.
   ==========================================================================*/
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null;
  function client() { if (!sb && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) {} } return sb; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---- best-effort field extraction from an SPS JSON document ----------------
  // Deep-search helpers: the exact SPS JSON shape is confirmed once we see a real
  // /testout sample; these find fields wherever they sit so the viewer works now.
  function deepFind(obj, re, depth) {
    depth = depth || 0; if (obj == null || depth > 8) return null;
    if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) { var v = deepFind(obj[i], re, depth + 1); if (v != null) return v; } return null; }
    if (typeof obj === "object") {
      for (var k in obj) { if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (re.test(k) && (typeof obj[k] === "string" || typeof obj[k] === "number")) return obj[k];
      }
      for (var k2 in obj) { if (!Object.prototype.hasOwnProperty.call(obj, k2)) continue; var v2 = deepFind(obj[k2], re, depth + 1); if (v2 != null) return v2; }
    }
    return null;
  }
  function deepArray(obj, re, depth) {
    depth = depth || 0; if (obj == null || depth > 8) return null;
    if (typeof obj === "object") {
      for (var k in obj) { if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (re.test(k) && Array.isArray(obj[k])) return obj[k];
      }
      var vals = Array.isArray(obj) ? obj : Object.keys(obj).map(function (k) { return obj[k]; });
      for (var i = 0; i < vals.length; i++) { var a = deepArray(vals[i], re, depth + 1); if (a) return a; }
    }
    return null;
  }
  // find the ship-to (AddressTypeCode "ST") name anywhere in the doc, for a human-readable partner
  function shipToName(obj, depth) {
    depth = depth || 0; if (obj == null || depth > 8) return null;
    if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) { var r = shipToName(obj[i], depth + 1); if (r) return r; } return null; }
    if (typeof obj === "object") {
      if (obj.AddressTypeCode === "ST" && obj.AddressName) return obj.AddressName;
      for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) { var v = shipToName(obj[k], depth + 1); if (v) return v; } }
    }
    return null;
  }
  function parseDoc(json) {
    var h = json.Header || {};
    var invoice = deepFind(json, /invoicenumber/i);
    var po = deepFind(json, /purchaseordernumber/i) || deepFind(json, /customerordernumber|^ponumber$/i);
    var shipId = deepFind(json, /shipmentidentification|bentonvilleasnnumber|shipnoticenumber/i);
    var bol = deepFind(json, /billofladingnumber/i);
    var explicit = deepFind(json, /documenttype|transactionset|transactiontype/i);
    var docType = "Unknown";
    if (explicit) docType = String(explicit);
    else if (invoice != null) docType = "810 Invoice";
    else if (h.ShipmentHeader || shipId != null || bol != null) docType = "856 Ship Notice";
    else if (h.OrderHeader || po != null) docType = "850 Purchase Order";
    var tpid = deepFind(json, /tradingpartnerid/i);
    var partner = shipToName(json) || (tpid != null ? String(tpid) : "");
    var lines = deepArray(json, /^lineitem$|^orderline$|^itemlevel$|invoiceline/i);
    var lineCount = lines ? lines.length : (deepFind(json, /totallineitemnumber/i) || 0);
    return {
      docType: docType,
      po: po != null ? String(po) : (invoice != null ? String(invoice) : ""),
      invoice: invoice != null ? String(invoice) : "",
      partner: partner,
      partnerId: tpid != null ? String(tpid) : "",
      lineCount: lineCount,
      poDate: deepFind(json, /purchaseorderdate|orderdate/i) || "",
      shipDate: deepFind(json, /^shipdate$|shippeddate|deliverydate/i) || "",
      invDate: deepFind(json, /invoicedate/i) || ""
    };
  }

  function styleOnce() {
    if ($("sf-style")) return;
    var s = document.createElement("style"); s.id = "sf-style";
    s.textContent = [
      ".sf-pill{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:#e5edff;color:#1e3a8a}",
      ".sf-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}",
      ".sf-850{background:#dbeafe;color:#1e40af}.sf-856{background:#dcfce7;color:#166534}.sf-810{background:#fef3c7;color:#92400e}.sf-unk{background:#f1f5f9;color:#64748b}",
      "#sf-raw{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;max-height:300px;overflow:auto}",
      ".sf-kv{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;font-size:13px;margin:8px 0}",
      ".sf-kv b{color:#475569;font-weight:600}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }
  function badge(dt) { var c = /^850/.test(dt) ? "sf-850" : /^856/.test(dt) ? "sf-856" : /^810/.test(dt) ? "sf-810" : "sf-unk"; return '<span class="sf-badge ' + c + '">' + esc(dt) + '</span>'; }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    var baseUrl = "", ep = "";
    try { baseUrl = localStorage.getItem("sps_base_url") || ""; ep = localStorage.getItem("sps_endpoint") || ""; } catch (e) {}
    host.innerHTML =
      '<div class="card"><h2>SPS Feed</h2>' +
      '<p class="hint">Documents from the SPS Commerce Transaction API - purchase orders (850), ship notices (856) and invoices (810) - as they flow into the app. The live pull runs server-side (Supabase Edge Function) because the SPS API is token-based and not browser-accessible. Until that is switched on, paste a sample document below to confirm the parser reads it correctly.</p>' +
      '<div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:10px 12px;border-radius:8px;font-size:13px">Status: <b>waiting on SPS credentials + /testout endpoint</b> from Raul (SPS). Once those land, the Edge Function fills this feed automatically.</div>' +
      '</div>' +

      '<div class="card"><h2 class="sub2">Test the parser with a sample document</h2>' +
      '<p class="hint">Paste one SPS JSON document (from /testout, e.g. McLane PO MO10106510-01) and click Parse. If it looks right, Save it to the feed.</p>' +
      '<textarea id="sf-input" rows="7" placeholder=\'{ "purchaseOrder": { "purchaseOrderNumber": "MO10106510-01", ... } }\' style="width:100%;font-family:ui-monospace,monospace;font-size:12px"></textarea>' +
      '<div style="margin-top:8px"><button class="primary" onclick="SPSFEED.parse()">Parse</button> ' +
      '<button class="ghost" onclick="SPSFEED.saveSample()" id="sf-savebtn" style="display:none">Save to feed</button></div>' +
      '<div id="sf-preview" style="margin-top:12px"></div>' +
      '</div>' +

      '<div class="card"><h2 class="sub2">Connection (fill in when SPS sends it)</h2>' +
      '<div class="row"><div><label>API base URL</label><input id="sf-base" autocomplete="off" placeholder="https://api.spscommerce.com/..." value="' + esc(baseUrl) + '"></div>' +
      '<div><label>/testout endpoint or path</label><input id="sf-ep" autocomplete="off" placeholder="e.g. /testout or /documents?folder=testout" value="' + esc(ep) + '"></div></div>' +
      '<p class="hint">Stored only in this browser, never in the app files. Credentials/token are held by the Edge Function on the server, not here.</p>' +
      '<button class="ghost sm" onclick="SPSFEED.saveCfg()">Save connection</button></div>' +

      '<div class="card"><h2 class="sub2">Received documents</h2><div id="sf-list"><p class="muted">Loading…</p></div></div>';
    loadFeed();
  }

  var lastParsed = null, lastRaw = null;
  function showPreview(p, raw) {
    var el = $("sf-preview"); if (!el) return;
    el.innerHTML =
      '<div class="sf-kv">' +
      '<b>Document type</b><div>' + badge(p.docType) + '</div>' +
      '<b>PO / reference</b><div>' + (esc(p.po) || '<span class="muted">not found</span>') + '</div>' +
      (p.invoice ? '<b>Invoice #</b><div>' + esc(p.invoice) + '</div>' : '') +
      '<b>Trading partner</b><div>' + (esc(p.partner) || '<span class="muted">not found</span>') + (p.partnerId ? ' <span class="muted sm">(' + esc(p.partnerId) + ')</span>' : '') + '</div>' +
      '<b>Line items</b><div>' + p.lineCount + '</div>' +
      (p.poDate ? '<b>PO date</b><div>' + esc(p.poDate) + '</div>' : '') +
      (p.shipDate ? '<b>Ship date</b><div>' + esc(p.shipDate) + '</div>' : '') +
      (p.invDate ? '<b>Invoice date</b><div>' + esc(p.invDate) + '</div>' : '') +
      '</div>' +
      '<details style="margin-top:6px"><summary class="muted sm" style="cursor:pointer">Raw JSON</summary><pre id="sf-raw">' + esc(JSON.stringify(raw, null, 2)) + '</pre></details>';
    var b = $("sf-savebtn"); if (b) b.style.display = "";
  }

  function loadFeed() {
    var el = $("sf-list"); if (!el) return;
    var c = client(); if (!c) { el.innerHTML = '<p class="muted">Not connected.</p>'; return; }
    c.from("sps_transactions").select("id,doc_type,partner,po_number,status,received_at").order("received_at", { ascending: false }).limit(200)
      .then(function (r) {
        if (r.error) { el.innerHTML = '<p class="muted">No feed yet. (Table `sps_transactions` not created - run the setup SQL, or this fills once SPS is connected.)</p>'; return; }
        var d = (r.data) || [];
        if (!d.length) { el.innerHTML = '<p class="muted">No documents received yet. Paste a sample above to test, or wait for the SPS feed.</p>'; return; }
        var rows = d.map(function (x) {
          return '<tr><td>' + badge(x.doc_type || "Unknown") + '</td><td><b>' + esc(x.po_number || "") + '</b></td>' +
            '<td>' + esc(x.partner || "") + '</td><td class="sm">' + esc(x.status || "") + '</td>' +
            '<td class="sm muted">' + esc(String(x.received_at || "").slice(0, 16).replace("T", " ")) + '</td></tr>';
        }).join("");
        el.innerHTML = '<div class="tblwrap"><table class="sortable"><thead><tr><th>Type</th><th>PO / ref</th><th>Partner</th><th>Status</th><th>Received</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      });
  }

  window.SPSFEED = {
    open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); markActive(); render(); },
    parse: function () {
      var t = $("sf-input"); var el = $("sf-preview");
      var raw; try { raw = JSON.parse(t.value); } catch (e) { el.innerHTML = '<div style="color:#b52024">Not valid JSON: ' + esc(e.message) + '</div>'; var b = $("sf-savebtn"); if (b) b.style.display = "none"; return; }
      lastParsed = parseDoc(raw); lastRaw = raw; showPreview(lastParsed, raw);
    },
    saveSample: function () {
      if (!lastParsed) return; var c = client(); if (!c) return;
      c.from("sps_transactions").insert({
        doc_type: lastParsed.docType, partner: lastParsed.partner, po_number: lastParsed.po || lastParsed.invoice,
        direction: "in", status: "test", received_at: new Date().toISOString(), payload: lastRaw
      }).then(function (r) {
        var el = $("sf-preview");
        if (r.error) { el.insertAdjacentHTML("beforeend", '<div style="color:#b52024;margin-top:8px">Could not save: ' + esc(r.error.message) + ' (create the sps_transactions table first.)</div>'); }
        else { loadFeed(); el.insertAdjacentHTML("beforeend", '<div style="color:#166534;margin-top:8px">Saved to feed as a test document.</div>'); }
      });
    },
    saveCfg: function () {
      try { localStorage.setItem("sps_base_url", ($("sf-base") || {}).value || ""); localStorage.setItem("sps_endpoint", ($("sf-ep") || {}).value || ""); } catch (e) {}
      var el = $("sf-preview"); // reuse area not ideal; just toast via alert-free note
    }
  };

  function markActive() { try { var nav = $("nav"); if (!nav) return; nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); }); var m = $("sf-nav"); if (m) m.classList.add("active"); } catch (e) {} }
  function injectNav() {
    var nav = $("nav"); if (!nav || $("sf-nav")) return;
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "sf-nav";
    btn.setAttribute("onclick", "SPSFEED.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="plug"></i><span>SPS Feed</span>';
    nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  try { var mo = new MutationObserver(function () { injectNav(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

/* ============================================================================
   Smackin' OS - SPS Feed  (sps-feed.js)
   Live view of SPS Commerce documents written by the sps-sync Edge Function.
   The browser only reads Supabase. The client secret stays on the function.
   ========================================================================== */
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null;
  function client() {
    if (!sb && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
      try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) {}
    }
    return sb;
  }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function mapApi() { return window.SPSMap || null; }

  function styleOnce() {
    if ($("sf-style")) return;
    var s = document.createElement("style");
    s.id = "sf-style";
    s.textContent = [
      ".sf-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}",
      ".sf-850{background:#dbeafe;color:#1e40af}.sf-856{background:#dcfce7;color:#166534}.sf-810{background:#fef3c7;color:#92400e}.sf-unk{background:#f1f5f9;color:#64748b}",
      ".sf-flag{display:inline-block;margin:0 6px 6px 0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#fbe3e0;color:#b52024}",
      ".sf-banner{padding:10px 12px;border-radius:8px;font-size:13px}",
      ".sf-ok{background:#e0f4e8;color:#1d5631;border:1px solid #b7e4c7}",
      ".sf-wait{background:#fff6e9;color:#7a4d05;border:1px solid #f3d7a1}",
      ".sf-bad{background:#fbe3e0;color:#b52024;border:1px solid #f3c0bc}",
      ".sf-kv{display:grid;grid-template-columns:minmax(120px,150px) 1fr;gap:4px 12px;font-size:13px;margin:8px 0}",
      ".sf-kv b{color:#475569;font-weight:600}",
      "@media(max-width:700px){.sf-kv{grid-template-columns:1fr}}",
      "#sf-preview,#sf-flags,#sf-detail,#sf-list{overflow-wrap:anywhere}",
      "#sf-raw{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;max-height:300px;overflow:auto}",
      "tr.sf-row{cursor:pointer}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }
  function badge(dt) {
    var c = /^850/.test(dt || "") ? "sf-850" : /^856/.test(dt || "") ? "sf-856" : /^810/.test(dt || "") ? "sf-810" : "sf-unk";
    return '<span class="sf-badge ' + c + '">' + esc(dt || "Unknown") + '</span>';
  }
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
    return d.toLocaleString();
  }
  function moneyOf(n) {
    var api = mapApi();
    if (api && n != null && n !== "") return api.money(n);
    return n == null || n === "" ? "" : String(n);
  }

  var docs = [];
  var openId = null;

  function banner(sync) {
    if (!sync) {
      return '<div class="sf-banner sf-wait">No sync yet. The server pulls SPS every 5 minutes once the sps-sync function is deployed and its SPS credentials are set. Open this screen again to refresh.</div>';
    }
    if (sync.ok === false) {
      return '<div class="sf-banner sf-bad">Last attempt ' + esc(when(sync.at)) + (sync.folder ? " · folder " + esc(sync.folder) : "") + "<br>" + esc(sync.message || "The last pull did not finish.") + "</div>";
    }
    var age = sync.at ? (Date.now() - new Date(sync.at).getTime()) : 0;
    var stale = age > 20 * 60 * 1000;
    var cls = stale ? "sf-wait" : "sf-ok";
    var line = "Last sync " + esc(when(sync.at)) +
      " · folder " + esc(sync.folder || "") +
      " · " + esc(sync.listed == null ? "?" : sync.listed) + " files on SPS" +
      " · " + esc(sync.processed == null ? 0 : sync.processed) + " new this run" +
      " · " + esc(sync.flagged || 0) + " flagged";
    if (sync.pending > sync.processed) line += " · " + esc(sync.pending - sync.processed) + " still waiting";
    if (sync.errors && sync.errors.length) line += "<br>" + esc(sync.errors[0]);
    if (stale) line += "<br>The last success is more than 20 minutes old.";
    return '<div class="sf-banner ' + cls + '">' + line + "</div>";
  }

  function render() {
    styleOnce();
    var host = $("view");
    if (!host) return;
    host.innerHTML =
      '<div class="card"><h2>SPS Feed</h2>' +
      '<p class="hint">Purchase orders (850), ship notices (856), and invoices (810) from SPS Commerce. The server reads the Transaction API every 5 minutes and writes them here. This screen only reads Supabase.</p>' +
      '<div id="sf-sync"><p class="muted">Loading sync status…</p></div></div>' +
      '<div class="card"><h2 class="sub2">Flagged</h2><div id="sf-flags"><p class="muted">Loading…</p></div></div>' +
      '<div class="card"><h2 class="sub2">Documents</h2><div id="sf-list"><p class="muted">Loading…</p></div><div id="sf-detail"></div></div>' +
      '<div class="card"><h2 class="sub2">Check a sample document</h2>' +
      '<p class="hint">Paste one SPS JSON file to see how it maps. Saving stores a test row on this feed only.</p>' +
      '<textarea id="sf-input" rows="6" placeholder=\'{ "Header": { "OrderHeader": { "PurchaseOrderNumber": "..." } } }\' style="width:100%;font-family:ui-monospace,monospace;font-size:12px"></textarea>' +
      '<div style="margin-top:8px"><button class="primary" onclick="SPSFEED.parse()">Parse</button> ' +
      '<button class="ghost" onclick="SPSFEED.saveSample()" id="sf-savebtn" style="display:none">Save to feed</button></div>' +
      '<div id="sf-preview" style="margin-top:12px"></div></div>';
    loadFeed();
  }

  function flagPills(flags) {
    return (flags || []).map(function (f) {
      var api = mapApi();
      var label = api ? api.flagLabel(f) : f;
      return '<span class="sf-flag">' + esc(label) + "</span>";
    }).join("");
  }

  function draw(sync, rows) {
    var syncEl = $("sf-sync");
    var flagEl = $("sf-flags");
    var listEl = $("sf-list");
    if (!syncEl || !listEl) return;
    syncEl.innerHTML = banner(sync);
    docs = rows || [];
    var flagged = docs.filter(function (r) {
      var p = r.payload || {};
      return (p.flags && p.flags.length) || r.status === "flagged" || r.status === "rejected";
    });
    if (!flagged.length) flagEl.innerHTML = '<p class="muted">No flagged documents.</p>';
    else {
      flagEl.innerHTML = flagged.map(function (r) {
        var p = r.payload || {};
        var detail = (p.flag_detail || []).slice(0, 3).map(function (d) { return "<div>" + esc(d) + "</div>"; }).join("");
        return '<div style="margin-bottom:10px">' + badge(r.doc_type) + " <b>" + esc(r.po_number || "") + "</b> · " + esc(r.partner || "") +
          '<div style="margin-top:4px">' + flagPills(p.flags || []) + "</div>" + detail + "</div>";
      }).join("");
    }
    if (!docs.length) {
      listEl.innerHTML = '<p class="muted">No documents yet.</p>';
      return;
    }
    var body = docs.map(function (r) {
      var p = r.payload || {};
      var sum = p.summary || {};
      var totals = "";
      if (sum.computedTotal != null) totals = moneyOf(sum.computedTotal);
      if (sum.statedTotal != null && sum.statedTotal !== sum.computedTotal) totals += (totals ? " file " : "") + moneyOf(sum.statedTotal);
      return '<tr class="sf-row" onclick="SPSFEED.show(\'' + esc(r.id) + '\')"><td>' + badge(r.doc_type) + "</td><td><b>" +
        esc(r.po_number || (sum.invoice || "")) + "</b></td><td>" + esc(r.partner || "") + "</td><td>" +
        (p.flags && p.flags.length ? flagPills(p.flags) : esc(r.status || "")) + "</td><td class=\"sm\">" + esc(totals) +
        '</td><td class="sm muted">' + esc(when(r.received_at)) + "</td></tr>";
    }).join("");
    listEl.innerHTML = '<div class="tblwrap"><table class="sortable"><thead><tr><th>Type</th><th>PO</th><th>Partner</th><th>Status</th><th>Total</th><th>Received</th></tr></thead><tbody>' +
      body + "</tbody></table></div>";
    if (openId) showDetail(openId);
  }

  function showDetail(id) {
    var el = $("sf-detail");
    if (!el) return;
    var row = null;
    for (var i = 0; i < docs.length; i++) if (String(docs[i].id) === String(id)) row = docs[i];
    if (!row) { el.innerHTML = ""; return; }
    var p = row.payload || {};
    var sum = p.summary || {};
    var ship = sum.shipTo ? ((sum.shipTo.name || "") + (sum.shipTo.location ? " (" + sum.shipTo.location + ")" : "")) : "";
    el.innerHTML = '<div class="sf-kv" style="margin-top:12px">' +
      "<b>Document</b><div>" + badge(row.doc_type) + "</div>" +
      "<b>PO</b><div>" + esc((sum.pos || [row.po_number]).filter(Boolean).join(", ")) + "</div>" +
      "<b>Partner</b><div>" + esc(row.partner || "") + (sum.partnerId ? ' <span class="muted sm">' + esc(sum.partnerId) + "</span>" : "") + "</div>" +
      (sum.vendor ? "<b>Vendor</b><div>" + esc(sum.vendor) + "</div>" : "") +
      (ship ? "<b>Ship to</b><div>" + esc(ship) + "</div>" : "") +
      (sum.invoice ? "<b>Invoice</b><div>" + esc(sum.invoice) + "</div>" : "") +
      (sum.bol ? "<b>BOL</b><div>" + esc(sum.bol) + "</div>" : "") +
      (sum.computedTotal != null ? "<b>Line sum</b><div>" + esc(moneyOf(sum.computedTotal)) + "</div>" : "") +
      (sum.statedTotal != null ? "<b>File total</b><div>" + esc(moneyOf(sum.statedTotal)) + "</div>" : "") +
      "<b>Folder</b><div>" + esc(p.folder || "") + "</div>" +
      "</div>" + flagPills(p.flags) +
      ((p.flag_detail || []).map(function (d) { return '<div class="sm">' + esc(d) + "</div>"; }).join("")) +
      (p.document ? '<details style="margin-top:8px"><summary class="muted sm" style="cursor:pointer">Raw JSON</summary><pre id="sf-raw">' +
        esc(JSON.stringify(p.document, null, 2)) + "</pre></details>" : "");
  }

  function loadFeed() {
    var c = client();
    var listEl = $("sf-list");
    if (!c) {
      if (listEl) listEl.innerHTML = '<p class="muted">Not connected.</p>';
      var syncEl = $("sf-sync");
      if (syncEl) syncEl.innerHTML = banner(null);
      return;
    }
    Promise.all([
      c.from("kv_status").select("key,value").eq("key", "sps:last_sync").limit(1),
      c.from("sps_transactions").select("id,doc_type,partner,po_number,status,received_at,payload").order("received_at", { ascending: false }).limit(150)
    ]).then(function (res) {
      var sync = null;
      if (res[0] && res[0].data && res[0].data[0] && res[0].data[0].value) {
        try { sync = JSON.parse(res[0].data[0].value); } catch (e) { sync = null; }
      }
      if (res[1] && res[1].error) {
        var el = $("sf-list");
        if (el) el.innerHTML = '<p class="muted">Could not read the feed: ' + esc(res[1].error.message) + "</p>";
        var s = $("sf-sync");
        if (s) s.innerHTML = banner(sync);
        return;
      }
      draw(sync, (res[1] && res[1].data) || []);
    });
  }

  var lastParsed = null;
  var lastRaw = null;
  function showPreview(mapped, flagInfo) {
    var el = $("sf-preview");
    if (!el) return;
    var lines = (mapped.lines || []).slice(0, 12).map(function (l) {
      return "<div>" + esc(l.upc || l.buyerItem || "line") + " · qty " + esc(l.qty) + " " + esc(l.uom || "") +
        (l.unitPrice != null ? " · " + esc(moneyOf(l.unitPrice)) : "") +
        (l.description ? " · " + esc(l.description) : "") + "</div>";
    }).join("");
    el.innerHTML = '<div class="sf-kv">' +
      "<b>Document</b><div>" + badge(mapped.label) + "</div>" +
      "<b>Partner</b><div>" + esc(mapped.partner || "") + (mapped.partnerId ? " (" + esc(mapped.partnerId) + ")" : "") + "</div>" +
      "<b>PO</b><div>" + esc((mapped.pos || []).join(", ") || "") + "</div>" +
      (mapped.computedTotal != null ? "<b>Line sum</b><div>" + esc(moneyOf(mapped.computedTotal)) + "</div>" : "") +
      (mapped.statedTotal != null ? "<b>File total</b><div>" + esc(moneyOf(mapped.statedTotal)) + "</div>" : "") +
      "</div>" + lines + '<div style="margin-top:6px">' + flagPills(flagInfo.flags) + "</div>" +
      (flagInfo.details || []).map(function (d) { return '<div class="sm">' + esc(d) + "</div>"; }).join("");
    var b = $("sf-savebtn");
    if (b) b.style.display = "";
  }

  window.SPSFEED = {
    open: function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      markActive();
      render();
    },
    show: function (id) { openId = id; showDetail(id); },
    parse: function () {
      var t = $("sf-input");
      var el = $("sf-preview");
      var api = mapApi();
      var raw;
      try { raw = JSON.parse(t.value); } catch (e) {
        el.innerHTML = '<div style="color:#b52024">Not valid JSON: ' + esc(e.message) + "</div>";
        var b = $("sf-savebtn");
        if (b) b.style.display = "none";
        return;
      }
      if (!api) { el.innerHTML = '<div style="color:#b52024">Mapper is not loaded.</div>'; return; }
      lastRaw = raw;
      lastParsed = api.mapDocument(raw);
      var folded = api.interpret([{ json: raw }]);
      var flags = { flags: [], details: [] };
      Object.keys(folded.states).forEach(function (k) {
        var one = api.flagsOf(folded.states[k]);
        flags.flags = flags.flags.concat(one.flags);
        flags.details = flags.details.concat(one.details);
      });
      showPreview(lastParsed, flags);
    },
    saveSample: function () {
      if (!lastParsed || !lastRaw) return;
      var c = client();
      var el = $("sf-preview");
      if (!c) { if (el) el.insertAdjacentHTML("beforeend", '<div style="color:#b52024;margin-top:8px">Not connected.</div>'); return; }
      var api = mapApi();
      var folded = api.interpret([{ json: lastRaw }]);
      var flags = [];
      var details = [];
      Object.keys(folded.states).forEach(function (k) {
        var one = api.flagsOf(folded.states[k]);
        flags = flags.concat(one.flags);
        details = details.concat(one.details);
      });
      c.from("sps_transactions").insert({
        doc_type: lastParsed.label,
        partner: lastParsed.partner,
        po_number: (lastParsed.pos && lastParsed.pos[0]) || "",
        direction: "in",
        status: "test",
        received_at: new Date().toISOString(),
        payload: {
          file_path: "paste:" + Date.now(),
          folder: "paste",
          flags: flags,
          flag_detail: details,
          po_numbers: lastParsed.pos || [],
          summary: {
            docType: lastParsed.label, partner: lastParsed.partner, partnerId: lastParsed.partnerId,
            pos: lastParsed.pos, vendor: lastParsed.vendor, shipTo: lastParsed.shipTo,
            lineCount: lastParsed.lineCount, statedTotal: lastParsed.statedTotal, computedTotal: lastParsed.computedTotal,
            invoice: lastParsed.invoice ? lastParsed.invoice.number : ""
          },
          document: lastRaw
        }
      }).then(function (r) {
        if (r.error) el.insertAdjacentHTML("beforeend", '<div style="color:#b52024;margin-top:8px">Could not save: ' + esc(r.error.message) + "</div>");
        else { el.insertAdjacentHTML("beforeend", '<div style="color:#166534;margin-top:8px">Saved as a test document.</div>'); loadFeed(); }
      });
    }
  };

  function markActive() {
    try {
      var nav = $("nav");
      if (!nav) return;
      nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
      var m = $("sf-nav");
      if (m) m.classList.add("active");
    } catch (e) {}
  }
  function injectNav() {
    var nav = $("nav");
    if (!nav || $("sf-nav")) return;
    var btn = document.createElement("button");
    btn.className = "navitem";
    btn.id = "sf-nav";
    btn.setAttribute("onclick", "SPSFEED.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="plug"></i><span>SPS Feed</span>';
    nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  try {
    var mo = new MutationObserver(function () { injectNav(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

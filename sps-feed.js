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
      ".sf-badge{display:inline-block;padding:4px 10px;border-radius:7px;font-size:13px;font-weight:700;line-height:1.3;white-space:nowrap}",
      ".sf-850{background:#dbeafe;color:#1e40af}.sf-856{background:#dcfce7;color:#166534}.sf-810{background:#fef3c7;color:#92400e}.sf-unk{background:#f1f5f9;color:#3d4c5e}",
      ".sf-flag{display:inline-block;margin:0 6px 6px 0;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;background:#fbe3e0;color:#8d1f1a}",
      ".sf-banner{padding:10px 12px;border-radius:8px;font-size:14px;line-height:1.45}",
      ".sf-ok{background:#e0f4e8;color:#1d5631;border:1px solid #b7e4c7}",
      ".sf-wait{background:#fff6e9;color:#7a4d05;border:1px solid #f3d7a1}",
      ".sf-bad{background:#fbe3e0;color:#8d1f1a;border:1px solid #f3c0bc}",
      ".sf-kv{display:grid;grid-template-columns:minmax(120px,160px) 1fr;gap:6px 12px;font-size:14px;margin:8px 0}",
      ".sf-kv b{color:#3d4c5e;font-weight:700}",
      ".sf-group{border-bottom:1px solid #e6ebf1}",
      ".sf-group summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;cursor:pointer;padding:9px 2px;list-style:none}",
      ".sf-group summary::-webkit-details-marker{display:none}",
      ".sf-group summary::before{content:'\\25B8';color:#3d4c5e;font-size:12px;width:12px}",
      ".sf-group[open] summary::before{content:'\\25BE'}",
      ".sf-glabel{font-weight:700;font-size:14px;color:#1c2b3a}",
      ".sf-gpartner{font-size:13px;color:#3d4c5e}",
      ".sf-gcount{margin-left:auto;min-width:1.6em;text-align:center;background:#B52024;color:#fff;font-size:12px;font-weight:800;border-radius:999px;padding:2px 8px}",
      ".sf-docs{padding:0 0 10px 22px;display:flex;flex-direction:column;gap:6px}",
      ".sf-doc{display:flex;gap:12px;align-items:baseline;width:100%;text-align:left;background:#f7f9fb;border:1px solid #e3e8ee;border-radius:8px;padding:7px 10px;cursor:pointer;font:inherit;font-size:13px;color:#243140}",
      ".sf-doc b{white-space:nowrap}",
      ".sf-doc span{color:#3d4c5e}",
      ".sf-table{font-size:14px}",
      ".sf-table th,.sf-table td{padding:9px 10px;vertical-align:middle}",
      ".sf-table td{color:#243140}",
      ".sf-status{display:inline-block;font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;white-space:nowrap}",
      ".sf-status-bad{background:#fbe3e0;color:#8d1f1a}",
      ".sf-status-ok{background:#e0f4e8;color:#1d5631}",
      ".sf-status-mid{background:#eef1f5;color:#3d4c5e}",
      ".sf-when{font-size:13px;color:#3d4c5e;white-space:nowrap}",
      "@media(max-width:700px){.sf-kv{grid-template-columns:1fr}.sf-when{white-space:normal}}",
      "#sf-preview,#sf-flags,#sf-detail,#sf-list{overflow-wrap:anywhere}",
      "#sf-raw{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;max-height:300px;overflow:auto}",
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
  function whenShort(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
    try {
      return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return when(iso);
    }
  }
  var SHORT_FLAG = {
    total_x100: "Total is 100x the line sum",
    total_mismatch: "Total does not match the line sum",
    overship: "Shipped quantity is above ordered",
    invoice_qty_mismatch: "Invoice quantity does not match shipped",
    price_mismatch: "Price does not match the order",
    uom_mismatch: "Quantity units differ",
    rejected: "No line items or summary",
    flagged: "Needs review"
  };
  function shortFlag(code) {
    return SHORT_FLAG[code] || String(code || "Flagged").replace(/_/g, " ");
  }
  function detailForFlag(code, details) {
    var list = details || [];
    var i, d;
    for (i = 0; i < list.length; i++) {
      d = String(list[i] || "");
      if (code === "total_x100" && /100/.test(d)) return d;
      if (code === "total_mismatch" && /says|sum/i.test(d) && !/100/.test(d)) return d;
      if (code === "overship" && /against order qty/i.test(d)) return d;
      if (code === "invoice_qty_mismatch" && /against shipped/i.test(d)) return d;
      if (code === "price_mismatch" && /price/i.test(d)) return d;
      if (code === "uom_mismatch" && /units differ/i.test(d)) return d;
      if (code === "rejected" && /line items|summary|rejected/i.test(d)) return d;
    }
    return list[0] || "";
  }
  function condenseDetail(text) {
    text = String(text || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    var moneys = text.match(/\$[\d,]+(?:\.\d+)?/g);
    if (moneys && moneys.length >= 2) {
      var line = moneys[0] + " vs " + moneys[1];
      if (/100/.test(text)) line += " (100x)";
      return line;
    }
    var qty = text.match(/shipped\s+([0-9]+(?:\.[0-9]+)?)\s+against order qty\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (qty) return "Shipped " + qty[1] + " vs ordered " + qty[2];
    var invq = text.match(/invoiced\s+([0-9]+(?:\.[0-9]+)?)\s+against shipped\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (invq) return "Invoiced " + invq[1] + " vs shipped " + invq[2];
    text = text.replace(/The line sum was stored\.?/gi, "").replace(/\s+/g, " ").trim();
    if (text.length > 72) return text.slice(0, 69).trim() + "...";
    return text;
  }
  function groupFlagged(rows) {
    var map = {};
    var order = [];
    (rows || []).forEach(function (r) {
      var p = r.payload || {};
      var flags = (p.flags && p.flags.length) ? p.flags.slice() : [];
      if (!flags.length) flags = [r.status === "rejected" ? "rejected" : "flagged"];
      var partner = r.partner || "Unknown partner";
      flags.forEach(function (code) {
        var key = code + "\n" + partner;
        if (!map[key]) {
          map[key] = { code: code, partner: partner, label: shortFlag(code), docs: [] };
          order.push(map[key]);
        }
        map[key].docs.push(r);
      });
    });
    order.sort(function (a, b) {
      if (b.docs.length !== a.docs.length) return b.docs.length - a.docs.length;
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return a.partner < b.partner ? -1 : a.partner > b.partner ? 1 : 0;
    });
    return order;
  }
  function badgeForGroup(g) {
    var counts = {};
    var best = "";
    var bestN = 0;
    g.docs.forEach(function (r) {
      var dt = r.doc_type || "Doc";
      counts[dt] = (counts[dt] || 0) + 1;
      if (counts[dt] > bestN) { bestN = counts[dt]; best = dt; }
    });
    return badge(best);
  }
  function renderFlagged(rows) {
    if (!rows.length) return '<p class="muted">No flagged documents.</p>';
    return groupFlagged(rows).map(function (g) {
      var docs = g.docs.map(function (r) {
        var p = r.payload || {};
        var sum = p.summary || {};
        var po = r.po_number || sum.invoice || sum.bol || "Document";
        var detail = condenseDetail(detailForFlag(g.code, p.flag_detail));
        return '<button type="button" class="sf-doc" onclick="SPSFEED.show(\'' + esc(r.id) + '\')"><b>' +
          esc(po) + "</b>" + (detail ? "<span>" + esc(detail) + "</span>" : "") + "</button>";
      }).join("");
      return '<details class="sf-group"><summary>' + badgeForGroup(g) +
        '<span class="sf-glabel">' + esc(g.label) + "</span>" +
        '<span class="sf-gpartner">' + esc(g.partner) + "</span>" +
        '<span class="sf-gcount">' + g.docs.length + "</span></summary>" +
        '<div class="sf-docs">' + docs + "</div></details>";
    }).join("");
  }
  function statusCell(r) {
    var p = r.payload || {};
    var flags = p.flags || [];
    var st = String(r.status || "");
    if (st === "rejected" || flags.indexOf("rejected") >= 0) return '<span class="sf-status sf-status-bad">Rejected</span>';
    if (flags.length) return '<span class="sf-status sf-status-bad">' + (flags.length === 1 ? "1 flag" : flags.length + " flags") + "</span>";
    if (!st || st === "ok" || st === "live" || st === "accepted") return '<span class="sf-status sf-status-ok">' + esc(st || "OK") + "</span>";
    return '<span class="sf-status sf-status-mid">' + esc(st) + "</span>";
  }
  function moneyOf(n) {
    var api = mapApi();
    if (api && n != null && n !== "") return api.money(n);
    return n == null || n === "" ? "" : String(n);
  }

  var docs = [];
  var openId = null;
  var feedOpen = false;

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
    feedOpen = true;
    host.innerHTML =
      '<div class="card"><h2>SPS Feed</h2>' +
      '<p class="hint">Purchase orders (850), ship notices (856), and invoices (810) from SPS Commerce. The server reads the Transaction API every 5 minutes and writes them here. This screen only reads Supabase.</p>' +
      '<div id="sf-sync"><p class="muted">Loading sync status…</p></div></div>' +
      '<div class="card"><h2 class="sub2">Flagged</h2><p class="hint">Grouped by issue and partner. Open a row to see the documents.</p><div id="sf-flags"><p class="muted">Loading…</p></div></div>' +
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
    if (flagEl) flagEl.innerHTML = renderFlagged(flagged);
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
        statusCell(r) + "</td><td>" + esc(totals) +
        '</td><td class="sf-when">' + esc(whenShort(r.received_at)) + "</td></tr>";
    }).join("");
    listEl.innerHTML = '<div class="tblwrap"><table class="sortable sf-table"><thead><tr><th>Type</th><th>PO</th><th>Partner</th><th>Status</th><th>Total</th><th>Received</th></tr></thead><tbody>' +
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
      feedOpen = true;
      markActive();
      ensureRt();
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
  function ensureRt() {
    var c = client();
    if (!c || ensureRt.done) return;
    ensureRt.done = true;
    try {
      c.channel("sps-feed-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "sps_transactions" }, function () { if (feedOpen) loadFeed(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "kv_status", filter: "key=eq.sps:last_sync" }, function () { if (feedOpen) loadFeed(); })
        .subscribe();
    } catch (e) { ensureRt.done = false; }
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#nav .navitem") : null;
    if (t && t.id !== "sf-nav") feedOpen = false;
  }, true);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && feedOpen) loadFeed();
  });
  window.SMK_VIEW_LOCKS = window.SMK_VIEW_LOCKS || [];
  window.SMK_VIEW_LOCKS.push(function () { return feedOpen; });
  try {
    var mo = new MutationObserver(function () { injectNav(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

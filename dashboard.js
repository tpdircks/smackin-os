/* ============================================================================
   Smackin' OS - Floor dashboard (dashboard.js)
   The home screen (viewHome) renders this. Live cloud data only:
     - Out of stock / low stock: same rule as stock-alerts.js
         OUT: reorder > 0 and on-hand <= 0
         LOW: reorder > 0 and 0 < on-hand < reorder
     - Pulled orders: orders.created_at on that SLC (America/Denver) calendar
       day. That timestamp is when the row was first saved into Smackin OS
       (SPS Feed, SPS Sync, or a manual add). Ship date, invoice date, and
       demand due date are shown as detail and do not pick the day.
       demand_lines supply the flavor / bag summary for the same PO. A demand
       PO with no orders row is listed on the day its lines were first saved.
     - Inbound: open and partially received supplier_pos (po-status.js) plus
       legacy purchase_orders still ordered or partial. Closed, received, and
       cancelled POs are out. [[STATUS:...]] notes show as a pill on the PO.
   No writes. No timers.
   ========================================================================== */
(function () {
  "use strict";

  var TZ = "America/Denver";
  var SHOW_CAP = 24;

  function lang() {
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) {
    var l = lang();
    return (v && (v[l] || v.en)) || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    var x = Number(n);
    if (isNaN(x)) x = 0;
    return (Math.round(x * 100) / 100).toLocaleString();
  }
  function cloud() {
    try { return !!(window.DB && DB.mode === "cloud"); } catch (e) { return false; }
  }
  function slcDay(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }
  function slcClock(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
    } catch (e) { return ""; }
  }
  function shiftDay(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function pretty(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return iso || "";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[(+p[1] || 1) - 1] + " " + (+p[2]) + ", " + p[0];
  }
  function poKey(s) {
    return String(s || "").toUpperCase().replace(/\s+/g, "").replace(/-\d{2}$/, "");
  }
  function linesOf(po) {
    try {
      var l = typeof po.lines === "string" ? JSON.parse(po.lines || "[]") : (po.lines || []);
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }
  function styleOnce() {
    if (document.getElementById("df-style")) return;
    var s = document.createElement("style");
    s.id = "df-style";
    s.textContent = [
      ".df-banner{border:1px solid #E39412;background:#FFF8EC;border-radius:10px;padding:10px 12px;margin:0 0 12px;font-weight:700;color:#1a1204}",
      ".df-lead{margin-top:0}",
      ".df-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 12px;align-items:start}",
      ".df-grid .card{margin:0}",
      ".df-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 0 6px}",
      ".df-head h2{margin:0;flex:1}",
      ".df-links{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}",
      ".df-links a{cursor:pointer;font-weight:700;font-size:13px;white-space:nowrap}",
      ".df-scroll{max-height:440px;overflow:auto}",
      ".df-empty{margin:10px 0 2px;font-weight:800;color:var(--navy,#1F3864);font-size:16px}",
      ".df-sub{margin:4px 0 0;color:#3d4c5e;font-size:13px}",
      ".df-pill{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.3px;padding:2px 7px;border-radius:999px;color:#fff;vertical-align:middle}",
      ".df-out{background:#B52024}.df-low{background:#E39412;color:#1a1204}.df-open{background:#1F3864}.df-ship{background:#2E6FB5}.df-done{background:#5e6b7a}",
      "table.df{width:100%;border-collapse:collapse}",
      "table.df.df-wide{min-width:760px}",
      "table.df th{font-size:12px;text-align:left;color:#3d4c5e;font-weight:800;padding:6px 8px;border-bottom:1px solid var(--line,#d7dde6);position:sticky;top:0;background:#fff}",
      "table.df td{padding:7px 8px;border-bottom:1px solid #eef2f6;vertical-align:top;font-size:14px}",
      "table.df tr.df-row-out td{background:#F8D0CC}",
      "table.df tr.df-row-low td{background:#FDE4B8}",
      ".df-name{font-weight:800;color:var(--navy,#04223B)}",
      ".df-meta{font-size:12px;color:#3d4c5e;font-weight:600}",
      ".df-more{display:block;width:100%;margin-top:8px;background:#fff;border:1px solid var(--line,#d7dde6);border-radius:8px;padding:8px 12px;font-family:inherit;font-weight:700;font-size:13px;color:var(--navy,#1F3864);cursor:pointer}",
      ".df-note{font-size:13px;color:#3d4c5e;margin:0 0 12px}",
      "@media(max-width:900px){.df-grid{grid-template-columns:1fr}.df-head{flex-direction:column}.df-links{justify-content:flex-start}}"
    ].join("");
    document.head.appendChild(s);
  }

  function stockSplit() {
    var out = [], low = [];
    var items = [];
    try { items = (window.DB && DB.items) ? (DB.items() || []) : []; } catch (e) { items = []; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !(Number(it.reorder) > 0)) continue;
      var oh = null;
      try { oh = DB.onHand(it.id); } catch (e2) { oh = null; }
      if (oh == null || oh !== oh) continue;
      if (oh <= 0) out.push({ it: it, oh: oh });
      else if (oh < Number(it.reorder)) low.push({ it: it, oh: oh });
    }
    out.sort(function (a, b) { return String(a.it.name || "").localeCompare(String(b.it.name || "")); });
    low.sort(function (a, b) {
      var ga = Number(a.it.reorder) - a.oh, gb = Number(b.it.reorder) - b.oh;
      return gb - ga || String(a.it.name || "").localeCompare(String(b.it.name || ""));
    });
    return { out: out, low: low };
  }

  function indexDemand() {
    var by = {};
    var lines = [];
    try { lines = (DB.demandLines ? DB.demandLines() : []) || []; } catch (e) { lines = []; }
    lines.forEach(function (l) {
      var k = poKey(l.po);
      if (!k) return;
      (by[k] = by[k] || []).push(l);
    });
    return by;
  }
  function flavorSummary(lines) {
    var bags = {}, cases = {};
    (lines || []).forEach(function (l) {
      var f = String(l.flavor || "").replace(/^UNMAPPED:\s*/i, "Unmapped: ");
      if (!f || /^UNMAPPED$/i.test(f)) f = "Unmapped";
      var b = Number(l.bags) || 0, c = Number(l.cases) || 0;
      if (b) bags[f] = (bags[f] || 0) + b;
      else if (c) cases[f] = (cases[f] || 0) + c;
    });
    function top(map, unit) {
      return Object.keys(map).map(function (f) { return { f: f, n: map[f] }; })
        .sort(function (a, b) { return b.n - a.n; })
        .slice(0, 3)
        .map(function (x) { return x.f + " " + fmt(x.n) + " " + unit; });
    }
    var parts = top(bags, "bags").concat(top(cases, "cases"));
    var more = Math.max(0, Object.keys(bags).length + Object.keys(cases).length - parts.length);
    if (!parts.length) return "";
    return parts.join(" · ") + (more ? " · +" + more + " more" : "");
  }
  function linesForOrder(o, by) {
    var keys = [poKey(o.customer_po), poKey(o.order_id)];
    var seen = {}, out = [];
    keys.forEach(function (k) {
      if (!k || seen[k] || !by[k]) return;
      seen[k] = 1;
      out = out.concat(by[k]);
    });
    return out;
  }

  function pulledOrders() {
    var orders = [];
    try { orders = (DB.orders ? DB.orders() : []) || []; } catch (e) { orders = []; }
    var by = indexDemand();
    var known = {};
    orders.forEach(function (o) {
      var a = poKey(o.customer_po), b = poKey(o.order_id);
      if (a) known[a] = 1;
      if (b) known[b] = 1;
    });
    var rows = orders.map(function (o) {
      return {
        day: slcDay(o.created_at),
        at: o.created_at || "",
        customer: o.customer || "",
        po: o.customer_po || o.order_id || "",
        oid: o.order_id && o.order_id !== o.customer_po ? o.order_id : "",
        status: o.status || "Open",
        ship: o.ship_date || o.invoice_date || "",
        source: o.entered_by || "",
        flavors: flavorSummary(linesForOrder(o, by))
      };
    }).filter(function (r) { return r.day; });

    var groups = {};
    var dlines = [];
    try { dlines = (DB.demandLines ? DB.demandLines() : []) || []; } catch (e2) { dlines = []; }
    dlines.forEach(function (l) {
      var k = poKey(l.po);
      if (!k || known[k]) return;
      var g = groups[k] || (groups[k] = { po: l.po || "", customer: l.partner || "", at: l.created_at || "", status: l.status || "Open", ship: l.due_date || "", source: l.imported_by || "Demand", lines: [] });
      if ((l.created_at || "") < (g.at || "\uffff")) g.at = l.created_at || g.at;
      if (String(l.status || "").toLowerCase() === "open") g.status = "Open";
      if (!g.ship && l.due_date) g.ship = l.due_date;
      g.lines.push(l);
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      rows.push({
        day: slcDay(g.at), at: g.at, customer: g.customer, po: g.po, oid: "",
        status: g.status || "Open", ship: g.ship || "", source: g.source || "Demand",
        flavors: flavorSummary(g.lines)
      });
    });
    rows.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    return rows;
  }

  function statusPill(st) {
    var s = String(st || "Open");
    var low = s.toLowerCase();
    var cls = low === "open" ? "df-open" : (low === "shipped" ? "df-ship" : "df-done");
    return '<span class="df-pill ' + cls + '">' + esc(s) + '</span>';
  }

  function orderTable(list, capId) {
    if (!list.length) return "";
    var head = '<table class="df df-wide"><thead><tr><th>Customer</th><th>PO / order</th><th>Status</th><th>Ship / due</th><th>Flavors</th></tr></thead><tbody>';
    var body = list.map(function (r, i) {
      var hide = i >= SHOW_CAP ? ' data-df-extra="1" hidden' : "";
      var id = r.oid ? '<div class="df-meta">' + esc(r.oid) + '</div>' : "";
      var when = slcClock(r.at);
      var src = (r.source ? esc(r.source) : "") + (when ? (r.source ? " · " : "") + esc(when) : "");
      return '<tr' + hide + '><td><div class="df-name">' + esc(r.customer || "—") + '</div>' +
        (src ? '<div class="df-meta">' + src + '</div>' : "") + '</td>' +
        '<td><b>' + esc(r.po || "—") + '</b>' + id + '</td>' +
        '<td>' + statusPill(r.status) + '</td>' +
        '<td>' + esc(r.ship || "—") + '</td>' +
        '<td>' + (r.flavors ? esc(r.flavors) : '<span class="df-meta">No flavor lines on the demand board</span>') + '</td></tr>';
    }).join("");
    var more = list.length > SHOW_CAP
      ? '<button type="button" class="df-more" onclick="DASHBOARD.more(this)">' + tx({ en: "Show all " + list.length, es: "Ver los " + list.length, pt: "Ver todos os " + list.length }) + '</button>'
      : "";
    return '<div class="df-scroll" id="' + capId + '">' + head + body + '</tbody></table></div>' + more;
  }

  function stockTable(list, kind) {
    if (!list.length) return "";
    var head = '<table class="df"><thead><tr><th>Item</th><th class="right">On hand</th><th class="right">Reorder</th><th></th></tr></thead><tbody>';
    var body = list.map(function (r, i) {
      var it = r.it;
      var hide = i >= SHOW_CAP ? ' data-df-extra="1" hidden' : "";
      var gap = Math.max(0, (Number(it.reorder) || 0) - r.oh);
      return '<tr class="df-row-' + kind + '"' + hide + '><td><div class="df-name">' + esc(it.name || it.code || "") + '</div><div class="df-meta">' + esc(it.code || it.id || "") + '</div></td>' +
        '<td class="right"><b>' + fmt(r.oh) + '</b> ' + esc(it.unit || "") + '</td>' +
        '<td class="right">' + fmt(it.reorder) + '</td>' +
        '<td class="right"><span class="df-pill ' + (kind === "out" ? "df-out" : "df-low") + '">' + (kind === "out" ? "OUT" : "LOW") + '</span>' +
        (gap ? '<div class="df-meta">' + fmt(gap) + ' short</div>' : "") + '</td></tr>';
    }).join("");
    var more = list.length > SHOW_CAP
      ? '<button type="button" class="df-more" onclick="DASHBOARD.more(this)">Show all ' + list.length + '</button>'
      : "";
    return '<div class="df-scroll">' + head + body + '</tbody></table></div>' + more;
  }

  function itemName(id) {
    var items = [];
    try { items = DB.items() || []; } catch (e) { items = []; }
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) === String(id) || String(items[i].code) === String(id)) return items[i].name || items[i].code || id;
    }
    return id || "";
  }
  function numQty(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function inboundPos() {
    var out = [];
    var spos = [];
    try { spos = (DB.supplierPos ? DB.supplierPos() : []) || []; } catch (e) { spos = []; }
    var rlog = [];
    try { rlog = (DB.receivingLog ? DB.receivingLog() : []) || []; } catch (e2) { rlog = []; }
    spos.forEach(function (po) {
      var derived = null;
      try { if (window.POSTATUS && POSTATUS.derive) derived = POSTATUS.derive(po, rlog, spos); } catch (e3) { derived = null; }
      if (derived && derived.status !== "open" && derived.status !== "partial") return;
      if (!derived && /\b(cancel+ed|cancel|void(ed)?)\b/i.test(String(po.notes || ""))) return;
      var raw = linesOf(po);
      var openLines = [];
      raw.forEach(function (l, i) {
        var recv = false;
        if (derived && derived.lines && derived.lines[i]) recv = !!derived.lines[i].recv;
        else recv = !!(l.recv || l.received === true);
        if (recv) return;
        openLines.push({
          desc: l.desc || l.description || l.product || l.item || l.item_no || "Line",
          qty: l.qty || l.quantity || "",
          uom: l.uom || l.unit_of_measure || "",
          ship: String(l.ship || l.ship_date || l.expected || l.eta || "").slice(0, 10)
        });
      });
      if (raw.length && !openLines.length) return;
      var expect = openLines.map(function (l) { return l.ship; }).filter(Boolean).sort()[0] || "";
      var chip = "";
      try { if (window.POSTATUS && POSTATUS.statusLabel) chip = POSTATUS.statusLabel(po.notes); } catch (eChip) { chip = ""; }
      out.push({
        num: po.po_num || po.id || "",
        vendor: po.vendor || "",
        date: String(po.po_date || po.created_at || "").slice(0, 10),
        total: po.total || "",
        expect: expect,
        lines: openLines,
        bare: !raw.length,
        partial: !!(derived && derived.status === "partial"),
        statusLabel: chip
      });
    });
    var legacy = [];
    try { legacy = (DB.purchaseOrders ? DB.purchaseOrders() : []) || []; } catch (e4) { legacy = []; }
    legacy.forEach(function (po) {
      var st = String(po.status || "").toLowerCase();
      if (st !== "ordered" && st !== "partial") return;
      var openLines = [];
      (po.lines || []).forEach(function (l) {
        var open = (Number(l.qty) || 0) - (Number(l.received) || 0);
        if (!(open > 0)) return;
        openLines.push({ desc: itemName(l.item_id), qty: open, uom: "", ship: String(po.expected || "").slice(0, 10) });
      });
      if (!openLines.length) return;
      var vendor = po.supplier || "";
      try { if (DB.supplierName) vendor = DB.supplierName(po.supplier) || vendor; } catch (e5) {}
      out.push({
        num: po.id || "",
        vendor: vendor,
        date: String(po.ordered || po.created || "").slice(0, 10),
        total: "",
        expect: String(po.expected || "").slice(0, 10),
        lines: openLines,
        bare: false
      });
    });
    out.sort(function (a, b) {
      var ae = a.expect || "9999-99-99", be = b.expect || "9999-99-99";
      if (ae !== be) return ae < be ? -1 : 1;
      return String(b.date).localeCompare(String(a.date));
    });
    return out;
  }

  function qtyText(v) {
    if (v == null || String(v).trim() === "") return "";
    var raw = String(v).trim();
    if (!/^[-+]?\d[\d,]*(\.\d+)?$/.test(raw)) return raw;
    return fmt(numQty(raw));
  }
  function lineBits(lines) {
    if (!lines.length) return '<span class="df-meta">No line detail on this PO</span>';
    var shown = lines.slice(0, 4).map(function (l) {
      var q = qtyText(l.qty);
      return esc(l.desc) + (q ? " · " + esc(q) + (l.uom ? " " + esc(l.uom) : "") : "");
    });
    var extra = lines.length > 4 ? '<div class="df-meta">+' + (lines.length - 4) + ' more lines</div>' : "";
    return shown.map(function (s) { return '<div>' + s + '</div>'; }).join("") + extra;
  }

  function inboundTable(list) {
    if (!list.length) return "";
    var head = '<table class="df df-wide"><thead><tr><th>PO</th><th>Vendor</th><th>Ordered</th><th>Still open</th><th>Expected</th></tr></thead><tbody>';
    var body = list.map(function (r, i) {
      var hide = i >= SHOW_CAP ? ' data-df-extra="1" hidden' : "";
      var tot = "";
      var totNum = parseFloat(String(r.total == null ? "" : r.total).replace(/[^0-9.\-]/g, ""));
      if (totNum > 0) tot = '<div class="df-meta">$' + totNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</div>';
      var pills = "";
      if (r.partial) pills += ' <span class="pill partial">Partially received</span>';
      if (r.statusLabel) pills += ' <span class="pill status">' + esc(r.statusLabel) + '</span>';
      return '<tr' + hide + '><td><b>' + esc(r.num || "—") + '</b>' + pills + tot + '</td>' +
        '<td>' + esc(r.vendor || "—") + '</td>' +
        '<td>' + esc(r.date || "—") + '</td>' +
        '<td>' + lineBits(r.lines) + '</td>' +
        '<td>' + esc(r.expect || "—") + '</td></tr>';
    }).join("");
    var more = list.length > SHOW_CAP
      ? '<button type="button" class="df-more" onclick="DASHBOARD.more(this)">Show all ' + list.length + '</button>'
      : "";
    return '<div class="df-scroll">' + head + body + '</tbody></table></div>' + more;
  }

  function head(title, links) {
    return '<div class="df-head"><h2 class="sub2">' + title + '</h2><div class="df-links">' + links + '</div></div>';
  }
  function go(tab, label) {
    return '<a onclick="UI_go(\'' + tab + '\')">' + label + '</a>';
  }

  function lastPull(rows) {
    var best = "", n = 0;
    rows.forEach(function (r) { if (r.day && r.day > best) best = r.day; });
    if (!best) return null;
    rows.forEach(function (r) { if (r.day === best) n++; });
    return { day: best, n: n };
  }

  function orderCard(which, day, rows, all) {
    var list = rows.filter(function (r) { return r.day === day; });
    var title = which === "today"
      ? tx({ en: "Pulled today", es: "Entrado hoy", pt: "Entraram hoje" })
      : tx({ en: "Pulled yesterday", es: "Entrado ayer", pt: "Entraram ontem" });
    var empty = which === "today"
      ? tx({ en: "No orders pulled today yet.", es: "Ninguna orden entrada hoy todavia.", pt: "Nenhum pedido entrou hoje ainda." })
      : tx({ en: "No orders pulled yesterday.", es: "Ninguna orden entrada ayer.", pt: "Nenhum pedido entrou ontem." });
    var body;
    if (!cloud()) {
      body = '<p class="df-empty">' + tx({ en: "Live orders load only when this screen is on the cloud database.", es: "Las ordenes en vivo cargan solo en la base de la nube.", pt: "Os pedidos ao vivo carregam so na base da nuvem." }) + '</p>';
    } else if (!list.length) {
      var last = lastPull(all);
      var extra = "";
      if (last) {
        extra = '<p class="df-sub">' + tx({
          en: "Last pull into Smackin OS was " + pretty(last.day) + " (" + last.n + (last.n === 1 ? " order" : " orders") + ").",
          es: "La ultima entrada fue " + pretty(last.day) + " (" + last.n + ").",
          pt: "A ultima entrada foi " + pretty(last.day) + " (" + last.n + ")."
        }) + '</p>';
      }
      body = '<p class="df-empty">' + empty + '</p>' + extra;
    } else {
      body = '<p class="df-sub">' + list.length + (list.length === 1 ? " order" : " orders") + " · " + pretty(day) + '</p>' + orderTable(list, "df-" + which);
    }
    return '<div class="card">' + head(title + ' <span class="df-meta">' + esc(pretty(day)) + '</span>', go("orders", "Orders →") + go("demandboard", "Demand →")) + body + '</div>';
  }

  function stockCard(kind, list) {
    var title = kind === "out"
      ? tx({ en: "Out of stock", es: "Agotado", pt: "Esgotado" })
      : tx({ en: "Low stock", es: "Stock bajo", pt: "Estoque baixo" });
    var empty = kind === "out"
      ? tx({ en: "Nothing is out of stock.", es: "Nada esta agotado.", pt: "Nada esta esgotado." })
      : tx({ en: "Nothing is under its reorder point.", es: "Nada esta bajo su punto de reorden.", pt: "Nada esta abaixo do ponto de reposicao." });
    var body;
    if (!list.length) body = '<p class="df-empty">' + empty + '</p>';
    else body = '<p class="df-sub">' + list.length + (list.length === 1 ? " item" : " items") + (kind === "out" ? " at zero with a reorder point." : " above zero and under the reorder point.") + '</p>' + stockTable(list, kind);
    return '<div class="card" id="df-' + kind + '">' + head(title, go("dash", "Inventory →") + go("alerts", "Alerts →")) + body + '</div>';
  }

  function html() {
    styleOnce();
    var today = slcDay(new Date().toISOString());
    var yday = shiftDay(today, -1);
    var split = { out: [], low: [] };
    var pulled = [];
    var inbound = [];
    try { split = stockSplit(); } catch (e) { split = { out: [], low: [] }; }
    try { pulled = pulledOrders(); } catch (e2) { pulled = []; }
    try { inbound = inboundPos(); } catch (e3) { inbound = []; }

    var banner = cloud() ? "" : '<div class="df-banner">' + tx({
      en: "This browser is not on the shared cloud database. Stock, orders, and POs below are not live plant data.",
      es: "Este navegador no esta en la base compartida. Lo de abajo no es dato en vivo de la planta.",
      pt: "Este navegador nao esta na base compartilhada. O que aparece abaixo nao e dado ao vivo da planta."
    }) + '</div>';

    var inboundBody;
    if (!cloud()) {
      inboundBody = '<p class="df-empty">' + tx({ en: "Open purchase orders load from the cloud database.", es: "Las ordenes de compra abiertas cargan de la nube.", pt: "As ordens de compra abertas carregam da nuvem." }) + '</p>';
    } else if (!inbound.length) {
      inboundBody = '<p class="df-empty">' + tx({ en: "No open inbound POs. Nothing is waiting on a supplier right now.", es: "No hay ordenes de compra abiertas.", pt: "Nao ha ordens de compra abertas." }) + '</p>';
    } else {
      inboundBody = '<p class="df-sub">' + inbound.length + (inbound.length === 1 ? " open PO" : " open POs") + '. Received and closed POs stay off this list.</p>' + inboundTable(inbound);
    }

    var note = '<p class="df-note">Pulled means the order was saved into Smackin OS that SLC day. The ship date on the row is not the pull day. Flavor totals come from the demand board for that PO. Inbound is supplier POs that are still open.</p>';

    return banner +
      '<div class="card df-lead"><h2>' + tx({ en: "Dashboard", es: "Panel", pt: "Painel" }) + '</h2>' +
      '<p class="hint">Out of stock, low stock, orders already pulled into Smackin OS, and inbound supply still open.</p></div>' +
      '<div class="df-grid">' + stockCard("out", split.out) + stockCard("low", split.low) + '</div>' +
      '<div class="df-grid">' + orderCard("yest", yday, pulled, pulled) + orderCard("today", today, pulled, pulled) + '</div>' +
      '<div class="card" id="df-inbound">' + head(tx({ en: "Inbound — ordered and still open", es: "Entrada — pedido y aun abierto", pt: "Entrada — pedido e ainda aberto" }), go("purchasing", "Purchasing →") + go("expreceipts", "Expected receipts →")) + inboundBody + '</div>' +
      note;
  }

  window.DASHBOARD = {
    html: html,
    more: function (btn) {
      var card = btn && btn.parentNode;
      if (!card) return;
      var rows = card.querySelectorAll("[data-df-extra]");
      for (var i = 0; i < rows.length; i++) rows[i].hidden = false;
      btn.parentNode.removeChild(btn);
    },
    _slcDay: slcDay,
    _poKey: poKey,
    _shiftDay: shiftDay
  };
})();

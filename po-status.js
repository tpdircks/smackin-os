/* ============================================================================
   Smackin' OS - Supplier PO derived status  (po-status.js)
   supplier_pos has no status column, so every PO looked "open". This module
   derives Open / Closed per PO client-side from existing data only (no writes,
   no schema change):
     - a line is RECEIVED when its JSON carries recv:true / received:true
       (set by DB.markLineReceived) OR the receiving_log has an entry for the
       same PO number (single-line PO -> that line; multi-line -> lines whose
       desc/item matches the log "contents", or all lines once the log has at
       least as many entries as the PO has lines).
     - a PO is CLOSED when: notes say cancelled/void, OR it has lines and every
       line is received, OR it has no lines but the receiving_log shows it was
       received, OR it is older than AGED_DAYS with no unreceived line still
       carrying a recent/future ship date ("Closed - aged").
     - otherwise OPEN.
   Digit-run receive match: after the existing exact/contains rules, a
   receiving_log row also links when the longest digit run of length >= 6
   from one normalized po_num appears inside the other (Txt092326StrChz
   links to MN092326-01 via 092326). The row is kept only for the supplier_pos
   po_num with the strictly longest overlap, so a shared date code cannot
   close an unrelated PO. A supplier_pos row is required.
   Some-but-not-all received lines are status "partial" (Partially Received).
   [[STATUS:Label]] in notes is a purchasing chip (POSTATUS.statusLabel).
   Overrides DB.expectedReceipts (adds receiving_log evidence; closed POs drop
   out of the open list) and DB.onOrderMap (On Order tile now reads open
   supplier_pos lines, unioned with the legacy purchase_orders result).
   Exposes window.POSTATUS for the Purchasing list filter. Read-only.
   Nav badges on Purchasing and Expected Receipts are rewritten here too:
   app.js sums reorder alerts into those badges (out + low + overdue lines),
   which is not a PO count. Both badges are set to the number of POs the On
   Order tile treats as already covering a low/out item. Received, closed,
   cancelled, completed, and archived POs never count. A MutationObserver on
   #nav applies the number after each nav render (no timers).
   ==========================================================================*/
(function () {
  "use strict";
  var AGED_DAYS = 120;
  var LS_FILTER = "po-status-filter";
  var filter = "open";
  try { filter = localStorage.getItem(LS_FILTER) || "open"; } catch (e) {}
  if (filter !== "all" && filter !== "closed" && filter !== "partial" && filter !== "open") filter = "open";

  function norm(x) { return String(x == null ? "" : x).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function words(x) { return String(x || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; }); }
  function linesOf(po) { try { var l = typeof po.lines === "string" ? JSON.parse(po.lines || "[]") : (po.lines || []); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  // PO dates come in many shapes: 2026-10-21, 10/15/26, 6-18-26, 02-11-2025
  function parseDate(s) {
    s = String(s || "").trim(); if (!s) return null; var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/))) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]); }
    var d = new Date(s); return isNaN(d) ? null : d;
  }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function todayISO() { return iso(new Date()); }
  function lineShip(l) { return String(l.ship || l.ship_date || l.expected || l.eta || "").slice(0, 10); }
  function lineFlag(l) { return !!(l.recv || l.received === true); }

  function legacyPoMatch(pn, q) {
    if (!pn || !q) return false;
    return q === pn || (pn.length >= 6 && q.indexOf(pn) >= 0) || (q.length >= 8 && pn.indexOf(q) >= 0);
  }
  function longestDigitRuns(s) {
    var runs = String(s || "").match(/\d{6,}/g) || [], best = 0, out = [];
    for (var i = 0; i < runs.length; i++) {
      if (runs[i].length > best) { best = runs[i].length; out = [runs[i]]; }
      else if (runs[i].length === best) out.push(runs[i]);
    }
    return out;
  }
  // Length of the longest digit run (>=6) from either normalized po_num that
  // appears inside the other. 0 when neither side has that kind of overlap.
  function digitOverlap(pn, q) {
    var best = 0;
    function hit(run, hay) {
      if (run && run.length >= 6 && hay.indexOf(run) >= 0 && run.length > best) best = run.length;
    }
    longestDigitRuns(pn).forEach(function (run) { hit(run, q); });
    longestDigitRuns(q).forEach(function (run) { hit(run, pn); });
    return best;
  }
  function catalogFor(po, catalog) {
    var list = catalog;
    if (!list) { try { list = allPos(); } catch (e) { list = []; } }
    if (!list || !list.length) return [po];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p) continue;
      if (p === po) return list;
      if (po && po.id && p.id === po.id) return list;
      if (po && po.po_num && p.po_num === po.po_num && norm(p.po_num)) return list;
    }
    return list.concat([po]);
  }
  var linkMemo = null;
  function buildLinks(pos, rows) {
    var byIdx = [], norms = [];
    for (var i = 0; i < pos.length; i++) { byIdx.push([]); norms.push(norm(pos[i] && pos[i].po_num)); }
    (rows || []).forEach(function (r) {
      var q = norm(r && r.po_num);
      if (!q) return;
      var legacy = [];
      for (var i = 0; i < pos.length; i++) if (legacyPoMatch(norms[i], q)) legacy.push(i);
      if (legacy.length) {
        for (var a = 0; a < legacy.length; a++) byIdx[legacy[a]].push(r);
        return;
      }
      var best = 0, winnerNorms = [];
      for (var j = 0; j < pos.length; j++) {
        if (!norms[j]) continue;
        var score = digitOverlap(norms[j], q);
        if (score < 6) continue;
        if (score > best) { best = score; winnerNorms = [norms[j]]; }
        else if (score === best && winnerNorms.indexOf(norms[j]) < 0) winnerNorms.push(norms[j]);
      }
      if (winnerNorms.length !== 1) return;
      var win = winnerNorms[0];
      for (var k = 0; k < norms.length; k++) if (norms[k] === win) byIdx[k].push(r);
    });
    return byIdx;
  }
  function rlogFor(po, rlog, catalog) {
    var pn = norm(po && po.po_num); if (!pn) return [];
    var rows = rlog || [];
    var pos = catalogFor(po, catalog);
    if (!linkMemo || linkMemo.rlog !== rows || linkMemo.pos !== pos) {
      linkMemo = { rlog: rows, pos: pos, byIdx: buildLinks(pos, rows) };
    }
    var idx = -1;
    for (var i = 0; i < pos.length; i++) if (pos[i] === po) { idx = i; break; }
    if (idx < 0 && po && po.id) {
      for (var j = 0; j < pos.length; j++) if (pos[j] && pos[j].id === po.id) { idx = j; break; }
    }
    if (idx < 0) {
      for (var k = 0; k < pos.length; k++) if (norm(pos[k] && pos[k].po_num) === pn) { idx = k; break; }
    }
    return idx >= 0 ? linkMemo.byIdx[idx] : [];
  }
  function lineMatchesLog(l, r) {
    var c = String(r.contents || "") + " " + String(r.notes || "");
    if (l.item && norm(c).indexOf(norm(l.item)) >= 0 && norm(l.item).length >= 4) return true;
    var lw = words(l.desc || l.description || l.product), cw = words(c); if (!lw.length || !cw.length) return false;
    var hit = lw.filter(function (w) { return cw.indexOf(w) >= 0; }).length;
    return hit >= Math.min(2, lw.length);
  }

  // Core derivation. Returns { status:'open'|'partial'|'closed', reason, lines:[{recv,recv_date,src}], rl:[...] }
  function derive(po, rlog, catalog) {
    var lines = linesOf(po), rl = rlogFor(po, rlog || [], catalog);
    var lastRl = rl.map(function (r) { return String(r.recv_date || "").slice(0, 10); }).sort().pop() || "";
    var out = lines.map(function (l) {
      if (lineFlag(l)) return { recv: true, recv_date: String(l.recv_date || "").slice(0, 10), src: "line" };
      if (!rl.length) return { recv: false };
      if (lines.length === 1 || rl.length >= lines.length) return { recv: true, recv_date: lastRl, src: "receiving_log" };
      var m = rl.filter(function (r) { return lineMatchesLog(l, r); });
      if (m.length) return { recv: true, recv_date: String(m[0].recv_date || "").slice(0, 10), src: "receiving_log" };
      return { recv: false };
    });
    var res = { status: "open", reason: "", lines: out, rl: rl };
    if (/\b(cancel+ed|cancel|void(ed)?)\b/i.test(String(po.notes || ""))) { res.status = "closed"; res.reason = "Cancelled"; return res; }
    if (lines.length && out.every(function (x) { return x.recv; })) { res.status = "closed"; res.reason = "Received"; return res; }
    if (!lines.length && rl.length) { res.status = "closed"; res.reason = "Received"; return res; }
    if (lines.length && out.some(function (x) { return x.recv; })) { res.status = "partial"; res.reason = "Partially Received"; return res; }
    var d = parseDate(po.po_date) || parseDate(po.created_at);
    var age = d ? Math.floor((Date.now() - d.getTime()) / 864e5) : 0;
    if (age > AGED_DAYS) {
      var cut = iso(new Date(Date.now() - 30 * 864e5));
      var live = lines.some(function (l, i) { return !out[i].recv && lineShip(l) && lineShip(l) >= cut; });
      if (!live) { res.status = "closed"; res.reason = "Aged (" + age + "d)"; return res; }
    }
    return res;
  }

  function rlog() { try { return (window.DB && DB.receivingLog) ? DB.receivingLog() : []; } catch (e) { return []; } }
  function allPos() { try { return (window.DB && DB.supplierPos) ? DB.supplierPos() : []; } catch (e) { return []; } }
  function statusOf(po) { var pos = allPos(); return derive(po, rlog(), pos.length ? pos : [po]); }
  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function noteClass(label) {
    var s = String(label || "").toLowerCase();
    if (s.indexOf("awaiting payment") >= 0) return "fc-pay";
    if (s.indexOf("pre-production") >= 0 || s.indexOf("preproduction") >= 0) return "fc-pre";
    if (s.indexOf("closed") >= 0) return "fc-closed";
    return "fc-note";
  }
  function statusLabel(notes) {
    var m = /\[\[STATUS:\s*([^\]\r\n]+?)\s*\]\]/i.exec(String(notes || ""));
    if (!m) return "";
    var label = m[1].replace(/\s+/g, " ").trim();
    if (!label || label.length > 40) return "";
    return label;
  }

  // Statuses that are not "on order". Legacy purchase_orders use ordered/partial;
  // anything in this list (and drafts) is excluded, same as DB.onOrderMap.
  var TERMINAL_STATUS = /\b(received|closed|cancelled|canceled|completed|complete|archived)\b/i;
  function isTerminalStatus(s) { return TERMINAL_STATUS.test(String(s || "")); }
  function poKey(po) {
    var k = norm((po && (po.po_num || po.id)) || "");
    return k || ("ID" + norm(po && po.id));
  }
  function itemIdFor(l) {
    try {
      var items = DB.items ? DB.items() : [];
      var code = norm(l.item || l.item_no || ""), desc = String(l.desc || l.description || "").trim().toLowerCase();
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        if (code && (norm(it.id) === code || norm(it.code) === code)) return it.id;
      }
      if (desc) for (var j = 0; j < items.length; j++) { if (String(items[j].name || "").trim().toLowerCase() === desc) return items[j].id; }
    } catch (e) {}
    return null;
  }
  function addQty(into, id, q, key) {
    if (!id || !(q > 0)) return;
    var rec = into[id] || (into[id] = { qty: 0, pos: {} });
    rec.qty += q;
    if (key) rec.pos[key] = true;
  }
  // Same population as the On Order tile's DB.onOrderMap: open supplier lines
  // that are not received, plus legacy purchase_orders in ordered/partial with
  // outstanding qty. Terminal statuses never contribute.
  function collectOnOrder() {
    var into = {};
    try {
      var legacy = (window.DB && DB.purchaseOrders) ? DB.purchaseOrders() : [];
      legacy.forEach(function (po) {
        var st = String(po.status || "").toLowerCase();
        if (st !== "ordered" && st !== "partial") return;
        if (isTerminalStatus(st)) return;
        (po.lines || []).forEach(function (l) {
          var open = (Number(l.qty) || 0) - (Number(l.received) || 0);
          addQty(into, l.item_id, open, poKey(po));
        });
      });
    } catch (e) {}
    var rl = rlog();
    var pos = allPos();
    pos.forEach(function (po) {
      if (isTerminalStatus(po.status) || isTerminalStatus(po.po_status) || isTerminalStatus(po.state)) return;
      var stt = derive(po, rl, pos);
      if (stt.status !== "open" && stt.status !== "partial") return;
      linesOf(po).forEach(function (l, i) {
        if ((stt.lines[i] || {}).recv) return;
        var id = itemIdFor(l); if (!id) return;
        var q = parseFloat(String(l.qty || l.quantity || "").replace(/,/g, "")) || 0;
        addQty(into, id, q, poKey(po));
      });
    });
    return into;
  }
  // POs the home On Order tile is counting: a low/out item whose open qty
  // already covers the suggested reorder. Distinct POs only.
  function openOnOrderCount() {
    var col;
    try { col = collectOnOrder(); } catch (e) { return 0; }
    var items = [];
    try { items = (window.DB && DB.items) ? DB.items() : []; } catch (e) { return 0; }
    var pos = {};
    items.forEach(function (i) {
      var re = Number(i.reorder) || 0;
      if (!(re > 0) || !i || i.id == null) return;
      var oh = 0;
      try { oh = Number(DB.onHand ? DB.onHand(i.id) : 0) || 0; } catch (e2) { oh = 0; }
      if (!(oh <= 0 || oh < re)) return;
      var rec = col[i.id];
      if (!rec || !(rec.qty > 0)) return;
      var need = Math.max(re - oh, Math.round(re * 0.5));
      if (rec.qty < need) return;
      Object.keys(rec.pos).forEach(function (k) { if (k) pos[k] = true; });
    });
    return Object.keys(pos).length;
  }
  function paintNavBadges() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var n = 0;
    try { n = openOnOrderCount(); } catch (e) { n = 0; }
    var text = n > 0 ? String(n) : "";
    var buttons = nav.querySelectorAll ? nav.querySelectorAll(".navitem") : [];
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var oc = btn.getAttribute("onclick") || "";
      if (oc.indexOf("purchasing") < 0 && oc.indexOf("expreceipts") < 0) continue;
      // reorder15 and other items must not match; require the tab id token.
      if (!/UI_go\(['"]purchasing['"]\)/.test(oc) && !/UI_go\(['"]expreceipts['"]\)/.test(oc)) continue;
      var badge = btn.querySelector(".navbadge");
      if (!text) {
        if (badge) badge.parentNode.removeChild(badge);
        continue;
      }
      if (badge && badge.getAttribute("data-po-open") === "1" && badge.textContent === text) continue;
      if (badge) badge.parentNode.removeChild(badge);
      var span = document.createElement("span");
      span.className = "navbadge";
      span.setAttribute("data-po-open", "1");
      span.title = n === 1 ? "1 open PO" : (n + " open POs");
      span.textContent = text;
      btn.appendChild(span);
    }
  }
  function watchNav() {
    if (typeof MutationObserver !== "function" || !document.getElementById) return;
    var nav = document.getElementById("nav");
    if (!nav || nav.__poBadgeObs) return;
    var obs = new MutationObserver(function () { paintNavBadges(); });
    nav.__poBadgeObs = obs;
    obs.observe(nav, { childList: true });
    paintNavBadges();
  }

  function install() {
    if (!window.DB || DB.__poStatus) return !!(window.DB && DB.__poStatus);
    DB.__poStatus = true;

    // Expected Receipts: same shape as db.js, but received/closed uses derived status
    DB.expectedReceipts = function () {
      var out = [], rl = rlog(), pos = allPos();
      pos.forEach(function (po) {
        var st = derive(po, rl, pos);
        linesOf(po).forEach(function (l, i) {
          var ship = lineShip(l); if (!ship) return;
          var li = st.lines[i] || {};
          var recv = !!li.recv || st.status === "closed";
          out.push({
            poId: po.id, po_num: po.po_num || "", vendor: po.vendor || "", idx: i,
            item: l.item || l.item_no || "", desc: l.desc || l.description || l.product || "",
            qty: l.qty || l.quantity || "", uom: l.uom || l.unit_of_measure || "",
            ship: ship, recv: recv,
            recv_date: li.recv ? (li.recv_date || "") : (recv ? (st.reason || "closed") : ""),
            poStatus: st.status
          });
        });
      });
      return out;
    };

    // On Order: open (unreceived) lines on OPEN supplier POs, mapped to app item ids,
    // unioned with legacy purchase_orders that are ordered/partial (not received).
    DB.onOrderMap = function () {
      var m = {}, col = collectOnOrder();
      Object.keys(col).forEach(function (id) { m[id] = col[id].qty; });
      return m;
    };
    DB.onOrder = function (itemId) { return DB.onOrderMap()[itemId] || 0; };
    return true;
  }

  window.POSTATUS = {
    AGED_DAYS: AGED_DAYS,
    derive: derive,
    statusOf: statusOf,
    getFilter: function () { return filter; },
    setFilter: function (f) {
      filter = (f === "all" || f === "closed" || f === "partial") ? f : "open";
      try { localStorage.setItem(LS_FILTER, filter); } catch (e) {}
    },
    filter: function (list) {
      if (filter === "all") return list;
      var rl = rlog();
      return list.filter(function (po) {
        var s = derive(po, rl, list).status;
        if (filter === "open") return s === "open" || s === "partial";
        return s === filter;
      });
    },
    counts: function (list) {
      var rl = rlog(), c = { open: 0, partial: 0, closed: 0, all: list.length };
      list.forEach(function (po) {
        var s = derive(po, rl, list).status;
        if (s === "partial") c.partial++;
        else if (s === "closed") c.closed++;
        else c.open++;
      });
      return c;
    },
    openOnOrderCount: openOnOrderCount,
    statusLabel: statusLabel,
    statusPill: function (notes) {
      var label = statusLabel(notes);
      if (!label) return "";
      return ' <span class="pill status fc-chip ' + noteClass(label) + '" title="Purchasing status">' + escHtml(label) + '</span>';
    },
    pill: function (po) {
      var st = statusOf(po);
      if (st.status === "partial") return ' <span class="pill partial fc-chip fc-partial" title="Partially Received">Partially received</span>';
      return st.status === "closed"
        ? ' <span class="pill ok fc-chip fc-closed" title="' + escHtml(st.reason) + '">Closed' + (st.reason && st.reason !== "Received" ? " &middot; " + escHtml(st.reason) : "") + '</span>'
        : ' <span class="pill low fc-chip fc-open">Open</span>';
    },
    toggleHtml: function (list) {
      var c = this.counts(list);
      var b = function (v, lbl) { return '<button class="' + (filter === v ? "active" : "") + '" onclick="UI.poStatusFilter(\'' + v + '\')">' + lbl + '</button>'; };
      var openN = c.open + c.partial;
      return '<div class="ordtabs" style="margin:0 0 10px">' + b("open", "Open (" + openN + ")") + b("partial", "Partially Received (" + c.partial + ")") + b("closed", "Closed (" + c.closed + ")") + b("all", "All (" + c.all + ")") + '</div>';
    },
    install: install
  };

  // db.js loads before this file, so install immediately (re-check on DOM ready).
  if (!install()) document.addEventListener("DOMContentLoaded", install);
  if (document.getElementById && document.getElementById("nav")) watchNav();
  else document.addEventListener("DOMContentLoaded", watchNav);
})();

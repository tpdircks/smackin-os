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
   Overrides DB.expectedReceipts (adds receiving_log evidence; closed POs drop
   out of the open list) and DB.onOrderMap (On Order tile now reads open
   supplier_pos lines, unioned with the legacy purchase_orders result).
   Exposes window.POSTATUS for the Purchasing list filter. Read-only.
   ==========================================================================*/
(function () {
  "use strict";
  var AGED_DAYS = 120;
  var LS_FILTER = "po-status-filter";
  var filter = "open";
  try { filter = localStorage.getItem(LS_FILTER) || "open"; } catch (e) {}

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

  function rlogFor(po, rlog) {
    var pn = norm(po.po_num); if (!pn) return [];
    return rlog.filter(function (r) {
      var q = norm(r.po_num); if (!q) return false;
      return q === pn || (pn.length >= 6 && q.indexOf(pn) >= 0) || (q.length >= 8 && pn.indexOf(q) >= 0);
    });
  }
  function lineMatchesLog(l, r) {
    var c = String(r.contents || "") + " " + String(r.notes || "");
    if (l.item && norm(c).indexOf(norm(l.item)) >= 0 && norm(l.item).length >= 4) return true;
    var lw = words(l.desc || l.description || l.product), cw = words(c); if (!lw.length || !cw.length) return false;
    var hit = lw.filter(function (w) { return cw.indexOf(w) >= 0; }).length;
    return hit >= Math.min(2, lw.length);
  }

  // Core derivation. Returns { status:'open'|'closed', reason, lines:[{recv,recv_date,src}], rl:[...] }
  function derive(po, rlog) {
    var lines = linesOf(po), rl = rlogFor(po, rlog || []);
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
  function statusOf(po) { return derive(po, rlog()); }

  function install() {
    if (!window.DB || DB.__poStatus) return !!(window.DB && DB.__poStatus);
    DB.__poStatus = true;
    var legacyOnOrder = DB.onOrderMap;

    // Expected Receipts: same shape as db.js, but received/closed uses derived status
    DB.expectedReceipts = function () {
      var out = [], rl = rlog();
      allPos().forEach(function (po) {
        var st = derive(po, rl);
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

    // On Order: open (unreceived) lines on OPEN supplier POs, mapped to app item ids
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
    DB.onOrderMap = function () {
      var m = {};
      try { var lg = legacyOnOrder ? legacyOnOrder() : {}; Object.keys(lg).forEach(function (k) { m[k] = (m[k] || 0) + lg[k]; }); } catch (e) {}
      var rl = rlog();
      allPos().forEach(function (po) {
        var st = derive(po, rl); if (st.status !== "open") return;
        linesOf(po).forEach(function (l, i) {
          if ((st.lines[i] || {}).recv) return;
          var id = itemIdFor(l); if (!id) return;
          var q = parseFloat(String(l.qty || l.quantity || "").replace(/,/g, "")) || 0;
          if (q > 0) m[id] = (m[id] || 0) + q;
        });
      });
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
    setFilter: function (f) { filter = (f === "all" || f === "closed") ? f : "open"; try { localStorage.setItem(LS_FILTER, filter); } catch (e) {} },
    filter: function (list) {
      if (filter === "all") return list;
      var rl = rlog();
      return list.filter(function (po) { return derive(po, rl).status === filter; });
    },
    counts: function (list) {
      var rl = rlog(), c = { open: 0, closed: 0, all: list.length };
      list.forEach(function (po) { c[derive(po, rl).status]++; });
      return c;
    },
    pill: function (po) {
      var st = statusOf(po);
      return st.status === "closed"
        ? ' <span class="pill ok" title="' + st.reason + '">Closed' + (st.reason && st.reason !== "Received" ? " &middot; " + st.reason : "") + '</span>'
        : ' <span class="pill low">Open</span>';
    },
    toggleHtml: function (list) {
      var c = this.counts(list);
      var b = function (v, lbl) { return '<button class="' + (filter === v ? "active" : "") + '" onclick="UI.poStatusFilter(\'' + v + '\')">' + lbl + '</button>'; };
      return '<div class="ordtabs" style="margin:0 0 10px">' + b("open", "Open (" + c.open + ")") + b("closed", "Closed (" + c.closed + ")") + b("all", "All (" + c.all + ")") + '</div>';
    },
    install: install
  };

  // db.js loads before this file, so install immediately (re-check on DOM ready).
  if (!install()) document.addEventListener("DOMContentLoaded", install);
})();

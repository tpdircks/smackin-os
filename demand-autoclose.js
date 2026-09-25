/* Smackin' OS - Demand board auto-close + de-dup (demand-autoclose.js)
   Fixes the Demand board so it self-clears instead of piling up forever.

   Problem it solves (found 2026-09-25): the board had 574 "Open" lines but only
   133 were unique — re-imports of the same SPS POs stacked identical rows (one
   Target line appeared up to 14x), inflating the Cases/Bags KPIs and the
   build-need math ~2x. And nothing ever moved a line to "Shipped".

   What it does (read-only wrapper over DB.demandLines — NO database writes):
     1) De-duplicates: collapses identical lines (same source+PO+flavor+due+cases)
        to a single row, keeping the newest.
     2) Auto-closes: marks a line "Shipped" when its PO matches a Completed order,
        or when its due date is more than CUTOFF_DAYS in the past (already shipped /
        dead). Everything that reads DB.demandLines() — the board, the KPIs, and the
        Mixing/P-Mac build-need engine — becomes correct live.
   The manual "Ship" button, the importer, and the raw rows are untouched; the raw
   accessor stays available as DB.demandLinesRaw().
*/
(function () {
  "use strict";
  var CUTOFF_DAYS = 30;

  function digits(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }
  function dueMs(s) {
    var m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[1] - 1, +m[2]).getTime();
  }
  function shippedPOset() {
    var set = {};
    try {
      var orders = (window.DB && DB.orders) ? DB.orders() : [];
      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (/complete|ship/i.test(o.status || "")) {
          var d = digits(o.customer_po);
          if (d.length >= 4) set[d] = 1;
        }
      }
    } catch (e) {}
    return set;
  }
  function clean(raw) {
    if (!Array.isArray(raw) || !raw.length) return raw || [];
    var shipped = shippedPOset();
    var now = Date.now();
    // de-dup: keep newest per key
    var byKey = {};
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      var key = [r.source, r.po, r.flavor_code, r.due_date, r.cases].join("|");
      var prev = byKey[key];
      if (!prev || String(r.created_at || "") > String(prev.created_at || "")) byKey[key] = r;
    }
    var out = [];
    for (var k in byKey) {
      if (!Object.prototype.hasOwnProperty.call(byKey, k)) continue;
      var row = byKey[k];
      var status = row.status || "Open";
      if (status === "Open") {
        var dg = digits(row.po);
        var due = dueMs(row.due_date);
        var isShipped = (dg.length >= 4 && shipped[dg]) || (due !== null && (now - due) > CUTOFF_DAYS * 86400000);
        if (isShipped) { row = Object.assign({}, row, { status: "Shipped", _autoclosed: true }); }
      }
      out.push(row);
    }
    return out;
  }
  function bind() {
    if (!window.DB || typeof DB.demandLines !== "function") return false;
    if (DB.__demandAutocloseWrapped) return true;
    var orig = DB.demandLines.bind(DB);
    DB.demandLinesRaw = orig;
    DB.demandLines = function () { try { return clean(orig()); } catch (e) { return orig(); } };
    DB.__demandAutocloseWrapped = true;
    return true;
  }
  if (!bind()) { var n = 0; var iv = setInterval(function () { if (bind() || ++n > 40) clearInterval(iv); }, 250); }
})();

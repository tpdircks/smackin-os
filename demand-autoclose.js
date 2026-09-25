/* Smackin' OS - Demand board conservative auto-retire (demand-autoclose.js)

   IMPORTANT CORRECTION (2026-09-25): an earlier version of this file also
   DE-DUPLICATED demand lines by (source|po|flavor_code|due_date|cases). That was
   WRONG — those "duplicate" rows are legitimate per-DC Target allocations (the same
   PO + flavor shipped to many distribution centers, each with its own case count).
   De-duping collapsed them and UNDER-COUNTED real demand (e.g. 1,490 cases -> 669),
   which would tell production to build far too little. There are, in fact, ZERO true
   duplicates (verified: with DC in the key all rows are unique; batches share no POs),
   and the importer already de-dups by replacing prior Open lines per PO. So de-dup is
   REMOVED. Every real open line and its per-DC case/bag count is preserved.

   What it does now (read-only wrapper over DB.demandLines — NO database writes):
     - Marks a line "Shipped" ONLY when its due date is more than CUTOFF_DAYS in the
       past — a line that far past due is dead / already shipped. Nothing else changes.
   Raw rows remain available at DB.demandLinesRaw().
*/
(function () {
  "use strict";
  var CUTOFF_DAYS = 60;
  function dueMs(s) {
    var m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[1] - 1, +m[2]).getTime();
  }
  function derive(raw) {
    if (!Array.isArray(raw) || !raw.length) return raw || [];
    var now = Date.now();
    return raw.map(function (r) {
      if ((r.status || "Open") !== "Open") return r;
      var due = dueMs(r.due_date);
      if (due !== null && (now - due) > CUTOFF_DAYS * 86400000) return Object.assign({}, r, { status: "Shipped", _autoclosed: true });
      return r;
    });
  }
  function bind() {
    if (!window.DB || typeof DB.demandLines !== "function") return false;
    if (DB.__demandAutocloseWrapped) return true;
    var orig = DB.demandLines.bind(DB);
    DB.demandLinesRaw = orig;
    DB.demandLines = function () { try { return derive(orig()); } catch (e) { return orig(); } };
    DB.__demandAutocloseWrapped = true;
    return true;
  }
  if (!bind()) { var n = 0; var iv = setInterval(function () { if (bind() || ++n > 40) clearInterval(iv); }, 250); }
})();

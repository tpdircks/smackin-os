/* ============================================================================
   Smackin' OS - one-time inventory sync (inv-sync-0928.js)
   Applies Adriana's Inventory 2026 update (2026-09-28) to the 14 core finished
   bag totals. Runs once per device (localStorage flag), idempotent (sets each
   item to its target total, so re-running is harmless). Deploys like any other
   file: commit it, and it applies itself the next time the app loads.
   Safe to delete from index.html after everyone has opened the app once.
   ==========================================================================*/
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-09-28";
  var TARGET = {
    "B4-S01": 15000, "B4-S02": 37400, "B4-S03": 40000, "B4-S04": 30200,
    "B4-S08": 23600, "B4-S10": 8800, "B4-S11": 8800,
    "B15-S01": 17000, "B15-S02": 17500, "B15-S03": 32500, "B15-S05": 5750,
    "B15-S06": 8250, "B15-S09": 13500, "B15-S10": 11250
  };
  function alreadyDone() { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } }
  function markDone() { try { localStorage.setItem(FLAG, "1"); } catch (e) {} }

  function run() {
    if (alreadyDone()) return true;
    if (!(window.DB && typeof DB.adjustTotal === "function" && DB.items && DB.items().length)) return false;
    var codes = Object.keys(TARGET), i = 0;
    (function next() {
      if (i >= codes.length) { markDone(); return; }
      var code = codes[i++];
      try {
        Promise.resolve(DB.adjustTotal(code, TARGET[code])).then(next, next);
      } catch (e) { next(); }
    })();
    return true;
  }

  if (!run()) { var n = 0; var iv = setInterval(function () { if (run() || ++n > 60) clearInterval(iv); }, 300); }
})();

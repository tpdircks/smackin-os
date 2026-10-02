/* ============================================================================
   Smackin' OS - one-time inventory sync (inv-sync-1002.js)
   Applies Adriana's Inventory 2026 update (as of 2026-10-01) to the finished
   BAG on-hand totals: 11 standard x 1.5oz + 11 standard x 4oz + 18 limited
   (LTO) 4oz flavors = 40 items. Source: "Inventory SLC 2026" sheet, latest
   (10/01) count block, "Current Total" column.

   IMPORTANT: the app boots in LOCAL mode and only switches to CLOUD once
   Supabase connects. This module WAITS for cloud mode before applying, so the
   totals are written to the shared database (not just this device's cache).
   It applies once per device per dataset (localStorage flag) and is idempotent
   (sets each item to its target via DB.adjustTotal). Safe to delete from
   index.html after every device has opened the app once in cloud mode.
   ==========================================================================*/
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-01-cloud";   // new flag so it re-runs even where the old local-mode run set a flag
  function done() { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(FLAG, "1"); } catch (e) {} }

  var TARGET = {
    "B15-S01": 21250,
    "B15-S02": 18750,
    "B15-S03": 32000,
    "B15-S04": 27750,
    "B15-S05": 3500,
    "B15-S06": 7750,
    "B15-S07": 28500,
    "B15-S08": 13500,
    "B15-S09": 10250,
    "B15-S10": 10750,
    "B15-S11": 16500,
    "B4-S01": 14500,
    "B4-S02": 42700,
    "B4-S03": 42600,
    "B4-S04": 33300,
    "B4-S05": 1700,
    "B4-S06": 8300,
    "B4-S07": 23000,
    "B4-S08": 20000,
    "B4-S09": 7100,
    "B4-S10": 11300,
    "B4-S11": 5700,
    "B4-L01": 24100,
    "B4-L02": 16000,
    "B4-L03": 2700,
    "B4-L04": 16200,
    "B4-L05": 10500,
    "B4-L06": 0,
    "B4-L07": 8600,
    "B4-L08": 1700,
    "B4-L09": 9200,
    "B4-L10": 21100,
    "B4-L11": 6800,
    "B4-L12": 12200,
    "B4-L13": 0,
    "B4-L14": 15600,
    "B4-L15": 1700,
    "B4-L16": 7700,
    "B4-L17": 0,
    "B4-L18": 900
  };

  function ready() {
    return !!(window.DB && DB.mode === "cloud"
      && typeof DB.adjustTotal === "function"
      && typeof DB.itemByCode === "function"
      && DB.items && DB.items().length);
  }

  function apply() {
    var codes = Object.keys(TARGET), i = 0;
    (function next() {
      if (i >= codes.length) { mark(); return; }
      var code = codes[i++];
      try {
        var it = DB.itemByCode(code);
        if (it) { Promise.resolve(DB.adjustTotal(it, TARGET[code])).then(next, next); }
        else { next(); }
      } catch (e) { next(); }
    })();
  }

  function tick() {
    if (done()) return true;      // already applied in cloud
    if (ready()) { apply(); return true; }   // cloud is up -> apply now
    return false;                 // not cloud yet -> keep waiting
  }

  // Poll until the app reaches cloud mode (up to ~2 min), then apply once.
  if (!tick()) {
    var n = 0;
    var iv = setInterval(function () { if (tick() || ++n > 240) clearInterval(iv); }, 500);
  }
})();

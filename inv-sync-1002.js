/* ============================================================================
   Smackin' OS - one-time inventory sync (inv-sync-1002.js)
   Applies Adriana's Inventory 2026 update (as of 2026-10-01) to the finished
   BAG on-hand totals: 11 standard flavors x 1.5oz + 11 standard x 4oz + 18
   limited (LTO) 4oz flavors = 40 items. Source: "Inventory SLC 2026" Google
   Sheet, latest (10/01) count block of each Bags tab, "Current Total" column.
   Runs once per device (localStorage flag), idempotent (sets each item to its
   target total via DB.adjustTotal, so re-running is harmless). Resolves the
   app item by code with DB.itemByCode, then sets its total.
   Safe to delete from index.html after everyone has opened the app once.
   NOTE (not synced here - need your call): 2.75oz bags (app has no 2.75oz
   category yet), 9 NEW 4oz LTO flavors with no app item (Cotton Candy,
   Chipotle Ranch, Cheddar Sour Cream, Strawberry Cheesecake Sports, Loaded
   Nacho Sports, Bacon Jalapeno Sports, Funnel Cake, Dill Ranch, Honey
   Mustard), and raw materials (seed / seasoning / roll film).
   ==========================================================================*/
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-01";
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
  function alreadyDone() { try { return localStorage.getItem(FLAG) === "1"; } catch (e) { return false; } }
  function markDone() { try { localStorage.setItem(FLAG, "1"); } catch (e) {} }

  function run() {
    if (alreadyDone()) return true;
    if (!(window.DB && typeof DB.adjustTotal === "function" && typeof DB.itemByCode === "function" && DB.items && DB.items().length)) return false;
    var codes = Object.keys(TARGET), i = 0;
    (function next() {
      if (i >= codes.length) { markDone(); return; }
      var code = codes[i++];
      try {
        var it = DB.itemByCode(code);
        if (it) { Promise.resolve(DB.adjustTotal(it, TARGET[code])).then(next, next); }
        else { next(); }
      } catch (e) { next(); }
    })();
    return true;
  }

  if (!run()) { var n = 0; var iv = setInterval(function () { if (run() || ++n > 60) clearInterval(iv); }, 300); }
})();

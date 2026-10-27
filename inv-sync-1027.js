/* inv-sync-1027.js - finished-bag on-hand = Adriana's Inventory 2026 counts dated
   2026-10-27 (biweekly update). Cloud-gated + idempotent (writes the SHARED Supabase
   stock table once DB.mode==='cloud', then sets a one-time flag). 40 items:
   11 std x1.5oz, 11 std x4oz, 18 mapped limited x4oz. New/untracked flavors
   (Cotton Candy, Cheddar Sour Cream, Chipotle Ranch, etc.) and 2.75oz not synced. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-27-cloud";
  var TARGET = {
    "B15-S01": 14500,
    "B15-S02": 17250,
    "B15-S03": 28750,
    "B15-S04": 26250,
    "B15-S05": 3250,
    "B15-S06": 7000,
    "B15-S07": 25500,
    "B15-S08": 11250,
    "B15-S09": 31000,
    "B15-S10": 9250,
    "B15-S11": 15000,
    "B4-S01": 14300,
    "B4-S02": 8600,
    "B4-S03": 8100,
    "B4-S04": 16700,
    "B4-S05": 900,
    "B4-S06": 5900,
    "B4-S07": 29100,
    "B4-S08": 18400,
    "B4-S09": 10800,
    "B4-S10": 7600,
    "B4-S11": 7600,
    "B4-L01": 17800,
    "B4-L02": 14100,
    "B4-L03": 1900,
    "B4-L04": 8700,
    "B4-L05": 10200,
    "B4-L06": 2200,
    "B4-L07": 8600,
    "B4-L08": 1700,
    "B4-L09": 6300,
    "B4-L10": 21900,
    "B4-L11": 500,
    "B4-L12": 10300,
    "B4-L13": 0,
    "B4-L14": 12000,
    "B4-L15": 2500,
    "B4-L16": 5000,
    "B4-L17": 0,
    "B4-L18": 300
  };
  function ready() {
    return window.DB && DB.mode === "cloud" && DB.itemByCode && DB.adjustTotal
      && DB.items && DB.items().length > 0;
  }
  function run() {
    if (localStorage.getItem(FLAG)) return true;
    if (!ready()) return false;
    var n = 0;
    Object.keys(TARGET).forEach(function (code) {
      var it = DB.itemByCode(code);
      if (it) { try { DB.adjustTotal(it, TARGET[code]); n++; } catch (e) {} }
    });
    localStorage.setItem(FLAG, new Date().toISOString());
    try { console.log("[inv-sync 10/27] applied", n, "finished-bag counts"); } catch (e) {}
    return true;
  }
  if (run()) return;
  var tries = 0;
  var iv = setInterval(function () { if (run() || ++tries > 240) clearInterval(iv); }, 500);
})();

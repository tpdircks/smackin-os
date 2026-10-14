/* inv-sync-1014.js — finished-bag on-hand = Adriana's Inventory 2026 counts dated
   2026-10-12, with Korean BBQ corrected (she confirmed the 147,000 was a 10x typo;
   true value 14,700). Cloud-gated + idempotent. All 40 items: 11 std x1.5oz,
   11 std x4oz, 18 mapped limited x4oz. New/untracked flavors (Cotton Candy, Cheddar
   Sour Cream, Chipotle Ranch, etc.) and 2.75oz still excluded (no app item yet). */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-14-cloud";
  var TARGET = {
    "B15-S01": 15750,
    "B15-S02": 18500,
    "B15-S03": 31250,
    "B15-S04": 26750,
    "B15-S05": 4750,
    "B15-S06": 7500,
    "B15-S07": 27750,
    "B15-S08": 12250,
    "B15-S09": 8500,
    "B15-S10": 9750,
    "B15-S11": 16750,
    "B4-S01": 16500,
    "B4-S02": 30400,
    "B4-S03": 13200,
    "B4-S04": 12600,
    "B4-S05": 14000,
    "B4-S06": 7600,
    "B4-S07": 28700,
    "B4-S08": 38200,
    "B4-S09": 8600,
    "B4-S10": 10400,
    "B4-S11": 4900,
    "B4-L01": 21000,
    "B4-L02": 22700,
    "B4-L03": 4400,
    "B4-L04": 15200,
    "B4-L05": 10500,
    "B4-L06": 2700,
    "B4-L07": 6400,
    "B4-L08": 1700,
    "B4-L09": 8200,
    "B4-L10": 23100,
    "B4-L11": 4400,
    "B4-L12": 11800,
    "B4-L13": 0,
    "B4-L14": 14700,
    "B4-L15": 2500,
    "B4-L16": 8000,
    "B4-L17": 0,
    "B4-L18": 680
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
    try { console.log("[inv-sync 10/14] applied", n, "finished-bag counts"); } catch (e) {}
    return true;
  }
  if (run()) return;
  var tries = 0;
  var iv = setInterval(function () { if (run() || ++tries > 240) clearInterval(iv); }, 500);
})();

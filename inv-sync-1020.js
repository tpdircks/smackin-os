/* inv-sync-1020.js — finished-bag on-hand = Adriana's Inventory 2026 counts dated
   2026-10-20 (biweekly update). Cloud-gated + idempotent (writes the SHARED Supabase
   stock table once DB.mode==='cloud', then sets a one-time flag). 40 items:
   11 std x1.5oz, 11 std x4oz, 18 mapped limited x4oz. New/untracked flavors
   (Cotton Candy, Cheddar Sour Cream, Chipotle Ranch, etc.) and 2.75oz not synced. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-20-cloud";
  var TARGET = {
    "B15-S01": 11850,
    "B15-S02": 17250,
    "B15-S03": 29500,
    "B15-S04": 26250,
    "B15-S05": 3500,
    "B15-S06": 7000,
    "B15-S07": 26000,
    "B15-S08": 11750,
    "B15-S09": 6500,
    "B15-S10": 9250,
    "B15-S11": 15250,
    "B4-S01": 15000,
    "B4-S02": 32200,
    "B4-S03": 8200,
    "B4-S04": 7900,
    "B4-S05": 5700,
    "B4-S06": 5200,
    "B4-S07": 40600,
    "B4-S08": 23500,
    "B4-S09": 3300,
    "B4-S10": 8000,
    "B4-S11": 7900,
    "B4-L01": 18200,
    "B4-L02": 14200,
    "B4-L03": 2700,
    "B4-L04": 9200,
    "B4-L05": 10300,
    "B4-L06": 500,
    "B4-L07": 6300,
    "B4-L08": 1700,
    "B4-L09": 7100,
    "B4-L10": 21900,
    "B4-L11": 3200,
    "B4-L12": 11000,
    "B4-L13": 0,
    "B4-L14": 12600,
    "B4-L15": 1600,
    "B4-L16": 5600,
    "B4-L17": 0,
    "B4-L18": 640
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
    try { console.log("[inv-sync 10/20] applied", n, "finished-bag counts"); } catch (e) {}
    return true;
  }
  if (run()) return;
  var tries = 0;
  var iv = setInterval(function () { if (run() || ++tries > 240) clearInterval(iv); }, 500);
})();

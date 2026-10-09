/* inv-sync-1009.js — one-time cloud sync of finished-bag on-hand to Adriana's
   Inventory 2026 counts dated 2026-10-08 (biweekly update, emailed 10/08).
   Cloud-gated + idempotent: waits for DB.mode==='cloud' so it writes the SHARED
   Supabase stock table (not the device's local cache), then sets a one-time flag.
   Covers 11 standard x1.5oz, 11 standard x4oz, 18 mapped limited x4oz = 40 items.
   NOT synced (no app item yet / new): Cheddar Sour Cream, Cotton Candy, Chipotle
   Ranch, Dill Ranch, Funnel Cake, Honey Mustard, Bacon Jalapeno Sports, Loaded
   Nacho Sports, Strawberry Cheesecake. 2.75oz not tracked in-app. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-09-cloud";
  var TARGET = {
    "B15-S01": 21250,
    "B15-S02": 18500,
    "B15-S03": 31500,
    "B15-S04": 27000,
    "B15-S05": 5250,
    "B15-S06": 7750,
    "B15-S07": 21750,
    "B15-S08": 12750,
    "B15-S09": 9750,
    "B15-S10": 10500,
    "B15-S11": 16500,
    "B4-S01": 6000,
    "B4-S02": 33000,
    "B4-S03": 6500,
    "B4-S04": 5800,
    "B4-S05": 12400,
    "B4-S06": 7800,
    "B4-S07": 10800,
    "B4-S08": 43500,
    "B4-S09": 8600,
    "B4-S10": 8100,
    "B4-S11": 4900,
    "B4-L01": 23300,
    "B4-L02": 22800,
    "B4-L03": 4400,
    "B4-L04": 15400,
    "B4-L05": 10500,
    "B4-L06": 2100,
    "B4-L07": 6500,
    "B4-L08": 1700,
    "B4-L09": 8200,
    "B4-L10": 23100,
    "B4-L11": 4600,
    "B4-L12": 9500,
    "B4-L13": 0,
    "B4-L14": 14800,
    "B4-L15": 2500,
    "B4-L16": 6800,
    "B4-L17": 0,
    "B4-L18": 600
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
    try { console.log("[inv-sync 10/09] applied", n, "finished-bag counts"); } catch (e) {}
    return true;
  }
  if (run()) return;
  var tries = 0;
  var iv = setInterval(function () { if (run() || ++tries > 240) clearInterval(iv); }, 500);
})();

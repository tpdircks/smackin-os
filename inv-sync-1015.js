/* inv-sync-1015.js — finished-bag on-hand = Adriana's Inventory 2026 counts dated
   2026-10-15 (biweekly update). Cloud-gated + idempotent (writes the SHARED Supabase
   stock table once DB.mode==='cloud', then sets a one-time flag). 40 items:
   11 std x1.5oz, 11 std x4oz, 18 mapped limited x4oz.
   Not synced (no app item yet): Cheddar Sour Cream, Cotton Candy, Chipotle Ranch, Dill
   Ranch, Funnel Cake, Honey Mustard, Bacon Jalapeno Sports, Loaded Nacho Sports,
   Strawberry Cheesecake. 2.75oz not tracked in-app. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-15-cloud";
  var TARGET = {
    "B15-S01": 12350,
    "B15-S02": 17500,
    "B15-S03": 31250,
    "B15-S04": 26750,
    "B15-S05": 3750,
    "B15-S06": 7250,
    "B15-S07": 25750,
    "B15-S08": 12250,
    "B15-S09": 6000,
    "B15-S10": 10000,
    "B15-S11": 15250,
    "B4-S01": 18200,
    "B4-S02": 32700,
    "B4-S03": 18200,
    "B4-S04": 29300,
    "B4-S05": 8600,
    "B4-S06": 7600,
    "B4-S07": 40700,
    "B4-S08": 28100,
    "B4-S09": 3600,
    "B4-S10": 9100,
    "B4-S11": 3000,
    "B4-L01": 18200,
    "B4-L02": 19800,
    "B4-L03": 2300,
    "B4-L04": 14200,
    "B4-L05": 10500,
    "B4-L06": 2700,
    "B4-L07": 6400,
    "B4-L08": 1700,
    "B4-L09": 7700,
    "B4-L10": 22400,
    "B4-L11": 3800,
    "B4-L12": 11500,
    "B4-L13": 0,
    "B4-L14": 13300,
    "B4-L15": 2500,
    "B4-L16": 6100,
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
    try { console.log("[inv-sync 10/15] applied", n, "finished-bag counts"); } catch (e) {}
    return true;
  }
  if (run()) return;
  var tries = 0;
  var iv = setInterval(function () { if (run() || ++tries > 240) clearInterval(iv); }, 500);
})();

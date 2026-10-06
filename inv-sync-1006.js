/* One-time finished-bag count sync - Adriana Inventory SLC 2026, snapshot 2026-10-05.
   Cloud-gated: waits for DB.mode==="cloud" so it writes the SHARED Supabase stock table,
   not just this device's local cache. Idempotent via a dated localStorage flag. */
(function () {
  var FLAG = "inv-sync-2026-10-06-cloud";
  if (localStorage.getItem(FLAG)) return;
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
    "B4-S01": 13100,
    "B4-S02": 37800,
    "B4-S03": 28100,
    "B4-S04": 13400,
    "B4-S05": 1500,
    "B4-S06": 8200,
    "B4-S07": 23300,
    "B4-S08": 13800,
    "B4-S09": 8900,
    "B4-S10": 11200,
    "B4-S11": 5400,
    "B4-L01": 23900,
    "B4-L02": 23300,
    "B4-L03": 4900,
    "B4-L04": 15800,
    "B4-L05": 10500,
    "B4-L06": 0,
    "B4-L07": 9100,
    "B4-L08": 1700,
    "B4-L09": 8800,
    "B4-L10": 23600,
    "B4-L11": 6500,
    "B4-L12": 9900,
    "B4-L13": 0,
    "B4-L14": 15300,
    "B4-L15": 1700,
    "B4-L16": 4800,
    "B4-L17": 0,
    "B4-L18": 900
  };
  function ready() {
    return window.DB && DB.mode === "cloud" && DB.itemByCode && DB.adjustTotal && DB.items && DB.items().length;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (!ready()) { if (tries > 240) clearInterval(iv); return; }
    clearInterval(iv);
    var applied = 0;
    Object.keys(TARGET).forEach(function (code) {
      try { var it = DB.itemByCode(code); if (it) { DB.adjustTotal(it, TARGET[code]); applied++; } } catch (e) {}
    });
    try { localStorage.setItem(FLAG, new Date().toISOString()); } catch (e) {}
    console.log("[inv-sync 2026-10-06] applied", applied, "of", Object.keys(TARGET).length, "to cloud");
  }, 500);
})();

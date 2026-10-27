/* inv-sync-1027c.js - safety net after 10/27b. Honey Mustard (BAG4-L20 / B4-L20) and
   Funnel Cake (TMP-B4-FUNNELCAKE) were already corrected directly in Supabase; this
   re-asserts the targets on other devices via DB.adjustTotal (RECEIVING row only).
   Cloud-gated + idempotent; only writes when the cached on-hand differs from target. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-27c-cloud";
  var TARGET = {
    "B4-L20": 100,              // Honey Mustard
    "TMP-B4-FUNNELCAKE": 200,   // Funnel Cake (RETURNS 32 + RECEIVING 168)
    "TMP-B4-DILLRANCH": 100,    // Dill Ranch
    "TMP-B4-BACONJALAPENO": 4200 // Bacon Jalapeno
  };
  var busy = false;
  function ready() {
    return window.DB && DB.mode === "cloud" && DB.itemByCode && DB.adjustTotal
      && DB.items && DB.items().length > 0;
  }
  async function run() {
    if (localStorage.getItem(FLAG)) return true;
    if (!ready() || busy) return false;
    busy = true;
    try {
      var n = 0, miss = [];
      for (var code in TARGET) {
        var it = DB.itemByCode(code) || DB.itemByCode(code.replace("B4-", "BAG4-"));
        if (!it) { miss.push(code); continue; }
        var cur = DB.onHand ? Number(DB.onHand(it.code)) : NaN;
        if (cur === TARGET[code]) continue;
        await DB.adjustTotal(it, TARGET[code], "inv-sync-1027c"); n++;
      }
      if (miss.length) { console.warn("[inv-sync 10/27c] missing", miss); busy = false; return false; }
      localStorage.setItem(FLAG, new Date().toISOString());
      console.log("[inv-sync 10/27c] adjusted", n, "counts");
      return true;
    } catch (e) { console.warn("[inv-sync 10/27c]", e); busy = false; return false; }
  }
  var tries = 0;
  (function tick() { run().then(function (done) { if (!done && ++tries < 240) setTimeout(tick, 500); }); })();
})();

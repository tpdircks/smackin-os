/* inv-sync-1027b.js - adds/syncs 9 finished 4oz flavors missing from the 10/27 sync
   (Adriana's Inventory 2026, counts dated 2026-10-27). Cloud-gated + idempotent.
   7 flavors already exist in Supabase as TMP-B4-* items (with stock) - reuse them so
   nothing is double-counted. Cotton Candy + Honey Mustard did not exist: created as
   BAG4-L19 / BAG4-L20 via DB.createItem. Does NOT re-run the original 40-item sync. */
(function () {
  "use strict";
  var FLAG = "inv-sync-2026-10-27b-cloud";
  var NEW_ITEMS = [
    { code: "BAG4-L19", flavor: "Cotton Candy" },
    { code: "BAG4-L20", flavor: "Honey Mustard" }
  ];
  var TARGET = {
    "B4-L19": 59300,                        // Cotton Candy (18100 + 41200)
    "TMP-B4-LOADEDNACHO": 24800,            // Loaded Nacho Sports
    "TMP-B4-STRAWBERRYCHEESECAKE": 20400,   // Strawberry Cheesecake Sports
    "TMP-B4-CHIPOTLERANCH": 10900,          // Chipotle Ranch
    "TMP-B4-BACONJALAPENO": 4200,           // Bacon Jalapeno Sports
    "TMP-B4-CHEDDARSOURCREAM": 3200,        // Cheddar Sour Cream
    "TMP-B4-FUNNELCAKE": 200,               // Funnel Cake
    "TMP-B4-DILLRANCH": 100,                // Dill Ranch
    "B4-L20": 100                           // Honey Mustard
  };
  var busy = false;
  function ready() {
    return window.DB && DB.mode === "cloud" && DB.itemByCode && DB.adjustTotal && DB.createItem
      && DB.items && DB.items().length > 0;
  }
  async function ensureItems() {
    for (var i = 0; i < NEW_ITEMS.length; i++) {
      var n = NEW_ITEMS[i], code = n.code.replace("BAG4-", "B4-");
      if (DB.itemByCode(code) || DB.itemByCode(n.code)) continue;
      // createItem sets id=code=rec.code; fix code to B4-Lxx afterwards to match seed shape
      var r = await DB.createItem({ code: n.code, name: "Bags 4oz - " + n.flavor, flavor: n.flavor,
        category: "bag4", unit: "bags", reorder: 0, supplier: null }, "inv-sync-1027b");
      if (!r || !r.ok) throw new Error("create " + n.code + ": " + (r && r.msg));
      // r.item is the cached row object: patch code locally, then persist code=B4-Lxx in Supabase
      r.item.code = code;
      var cfg = window.SMACKIN_CONFIG || {};
      if (window.supabase && cfg.SUPABASE_URL) {
        var c = window.__invSync1027bClient || (window.__invSync1027bClient =
          window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY));
        var u = await c.from("items").update({ code: code }).eq("id", n.code);
        if (u && u.error) console.warn("[inv-sync 10/27b] code fix", n.code, u.error.message);
      }
    }
  }
  async function run() {
    if (localStorage.getItem(FLAG)) return true;
    if (!ready()) return false;
    if (busy) return false;
    busy = true;
    try {
      await ensureItems();
      var n = 0, miss = [];
      for (var code in TARGET) {
        var it = DB.itemByCode(code) || DB.itemByCode(code.replace("B4-", "BAG4-"));
        if (!it) { miss.push(code); continue; }
        await DB.adjustTotal(it, TARGET[code], "inv-sync-1027b"); n++;
      }
      if (miss.length) { console.warn("[inv-sync 10/27b] missing", miss); busy = false; return false; }
      localStorage.setItem(FLAG, new Date().toISOString());
      console.log("[inv-sync 10/27b] applied", n, "counts");
      return true;
    } catch (e) { console.warn("[inv-sync 10/27b]", e); busy = false; return false; }
  }
  var tries = 0;
  (function tick() { run().then(function (done) { if (!done && ++tries < 240) setTimeout(tick, 500); }); })();
})();

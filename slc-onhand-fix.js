/*SLCONHANDFIX*/
/* Smackin OS — SLC display fixes layer. Two jobs, both display-only (no rack/stock rows touched):

   1) ON-HAND ID RESOLUTION.
      slc-counts.js keys SLC_COUNTS by product CODE (e.g. "B4-S03") and overrides DB.onHand.
      But nearly every screen calls DB.onHand(item.id) using the internal ID ("BAG4-S03"),
      which missed the override and fell back to the stale raw rack sum. This wraps DB.onHand
      so a call with EITHER the id or the code resolves to the same SLC sheet number.
      NOTE (fixed 2026-09-17): the id->code map is built from DB.items(). In cloud mode that
      list loads asynchronously, so we must NOT wrap until it is populated — otherwise the map
      is empty and every by-id lookup falls back to the stale number. build() now waits for a
      non-empty item list before wrapping.

   2) RETIRED SEEDS HIDDEN.
      Per Matt/Troy (2026-09-17) we run only two seeds now: Low Salt / White (#4523) and
      Standard / Brown (#4524). The legacy "7% Salt" (SEED-7SALT) and "Extreme" (SEED-EXTREME)
      seeds are retired. They are NOT deleted from the database (data is preserved) — they are
      just filtered out of DB.items() so they no longer appear anywhere in the app. To bring one
      back, remove its code from RETIRED below and redeploy.

   Load AFTER slc-counts.js. Redeploy this one file (and bump its ?b= tag in index.html) if the
   mapping changes. */
(function () {
  if (window.__slcIdFix) return;

  // Item codes/ids to hide from the app entirely (retired seeds).
  var RETIRED = { 'SEED-7SALT': 1, 'SEED-EXTREME': 1 };

  function build() {
    if (!window.DB || typeof DB.onHand !== 'function' || typeof DB.items !== 'function') return false;
    if (DB.onHand.__slcId) return true; // already wrapped

    var baseItems = DB.items.bind(DB);

    // Wait until the (cloud) item list is actually loaded. Wrapping against an empty list would
    // build an empty id->code map and make every by-id on-hand lookup return the stale number.
    var items0;
    try { items0 = baseItems() || []; } catch (e) { return false; }
    if (!items0.length) return false; // retry later

    // id -> code map, built from the FULL (unfiltered) item list so onHand still resolves.
    var idToCode = {};
    items0.forEach(function (it) { if (it && it.id != null) idToCode[it.id] = it.code; });

    // ---- (1) on-hand id/code resolution ----
    var baseOnHand = DB.onHand.bind(DB);
    var f = function (key) {
      var C = window.SLC_COUNTS;
      if (C) {
        if (Object.prototype.hasOwnProperty.call(C, key)) return C[key];   // called with a code
        var code = idToCode[key];                                          // called with an id
        if (code != null && Object.prototype.hasOwnProperty.call(C, code)) return C[code];
      }
      return baseOnHand(key);
    };
    f.__slcId = true; f.__slc = true; f.__base = baseOnHand;
    DB.onHand = f;
    DB.__slcIdMap = idToCode;

    // ---- (2) hide retired seeds from every view (filter DB.items) ----
    DB.items = function () {
      var arr = baseItems() || [];
      return arr.filter(function (it) { return !(it && (RETIRED[it.id] || RETIRED[it.code])); });
    };
    DB.items.__slcId = true;

    // Repaint whatever view is already on screen (covers hot deploys / service-worker updates).
    // Re-clicks the active nav item, which re-renders the current view in place — it does not
    // move the user.
    try {
      if (document.readyState !== 'loading') {
        var a = document.querySelector('.navitem.active');
        if (a) setTimeout(function () { try { a.click(); } catch (e) {} }, 0);
      }
    } catch (e) {}
    return true;
  }

  window.__slcIdFix = true;
  if (!build()) {
    var n = 0, iv = setInterval(function () { if (build() || ++n > 150) clearInterval(iv); }, 100);
  }
})();

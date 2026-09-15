/*SLCONHANDFIX*/
/* Smackin OS — makes the SLC on-hand override resolve by item ID too.

   THE BUG THIS FIXES:
   slc-counts.js keys SLC_COUNTS by product CODE (e.g. "B4-S03") and overrides
   DB.onHand so screens read Adriana's sheet numbers. But almost every screen in
   the app calls DB.onHand(item.id) with the internal ID (e.g. "BAG4-S03"), NOT
   the code. Those calls missed the override and fell through to the raw rack-row
   sum — which is the stale number. Only the Finished Bags browser passed the code,
   so it was the one place that looked correct. Everything else (Dashboard, Produce
   Now, Essential-items table, on-hand snapshot, Reorder Tracker, Demand, Stock
   Build...) showed stale on-hand.

   THE FIX:
   Wrap DB.onHand once more. Build an id -> code map from DB.items(), so a call with
   either the ID or the CODE resolves to the same SLC sheet number. Anything not in
   the sheet still falls through to the app's own math, unchanged.

   NO rack/stock rows are touched — this is display-layer only.
   Load this AFTER slc-counts.js. Redeploy this one file if the mapping ever changes. */
(function () {
  if (window.__slcIdFix) return;

  function build() {
    if (!window.DB || typeof DB.onHand !== 'function' || typeof DB.items !== 'function') return false;
    if (DB.onHand.__slcId) return true; // already wrapped

    var idToCode = {};
    try {
      (DB.items() || []).forEach(function (it) { if (it && it.id != null) idToCode[it.id] = it.code; });
    } catch (e) { return false; }

    var base = DB.onHand.bind(DB); // current onHand (already SLC code-aware from slc-counts.js)
    var f = function (key) {
      var C = window.SLC_COUNTS;
      if (C) {
        if (Object.prototype.hasOwnProperty.call(C, key)) return C[key];   // called with a code
        var code = idToCode[key];                                          // called with an id
        if (code != null && Object.prototype.hasOwnProperty.call(C, code)) return C[code];
      }
      return base(key);
    };
    f.__slcId = true; f.__slc = true; f.__base = base;
    DB.onHand = f;
    DB.__slcIdMap = idToCode;

    // Repaint whatever view is already on screen (covers hot deploys / service-worker updates
    // where the page rendered before this wrapper installed). Re-clicks the active nav item,
    // which re-renders the current view in place — it does not move the user.
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
    var n = 0, iv = setInterval(function () { if (build() || ++n > 60) clearInterval(iv); }, 100);
  }
})();

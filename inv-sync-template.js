/* inv-sync-1105.js
   One cloud pass for Adriana's count 2026-11-05.
   Lot-tracked raw materials are applied per lot (LOT_ROWS): seasoning,
   seed, maltodextrin, oil, and stevia. Quantity, lot, expiration, and
   location are set from the sheet. Expired lots go to QUARANTINE.
   A missing COA stays on QA-HOLD. A line over 100,000 is held.
   A row edited after the sheet time is reported and left alone.
   The pass writes a visible report. It does not finish quietly. */
(function (root) {
  "use strict";
  var COUNT_DATE = "2026-11-05";
  var LOT_ROWS = true;
  var NOTE = root.INV_LOT_PLAN ? root.INV_LOT_PLAN.OPERATOR : "inventory sync from Adriana count 2026-11-05";
  function latest() { return root.ADRIANA_LATEST || null; }
  function plan(stock, items, today) {
    if (!root.INV_LOT_PLAN || !latest()) return null;
    return root.INV_LOT_PLAN.planAll(latest(), stock, items, { today: today });
  }
  var api = { COUNT_DATE: COUNT_DATE, LOT_ROWS: LOT_ROWS, NOTE: NOTE, plan: plan, latest: latest };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) { module.exports = api; return; }
  root.INV_SYNC_LATEST = api;
})(typeof window !== "undefined" ? window : globalThis);

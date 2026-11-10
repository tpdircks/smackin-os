#!/usr/bin/env node
/* Lot sync: apply a sheet lot, zero lots that are not on the sheet,
   send expired lots to quarantine, keep a newer manual edit, hold a
   quantity over 100,000, leave Dill Pickle j1926 alone, and flag drift. */
"use strict";

var plan = require("../inv-lot-plan.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
var TODAY = "2026-11-06";
var AS_OF = "2026-11-05T22:30:00.000Z";

assert(plan.mapLocation("L 46", "Rack C Location") === "C-46-L1", "rack C level code " + plan.mapLocation("L 46", "Rack C Location"));
assert(plan.mapLocation("S 02", "") === "S-02", "standard bin");
assert(plan.mapLocation("L 36", "") === "L-36", "L code without a rack");
assert(plan.lotKey("LOT # j1926") === "J1926", "lot key");
assert(plan.lotKey("#1985-20260724RNA7") === plan.lotKey("1985-20260724RNA7"), "hyphen lot key");
assert(plan.parseExp("7/24/2027") === "2027-07-24", "exp parse");

var dill = plan.planItemLots("SEAS-DLRN", [
  { item: "SEAS-DLRN", desc: "Dill Ranch Snack", lot: "#1985-20260724RNA7", qty: 475, exp: "2027-07-24", locCode: "L 46", note: "Rack C Location" }
], [
  { item_id: "SEAS-DLRN", source_id: "SEAS-DLRN", location: "RECEIVING", lot: "", qty: 500, expires_on: "", updated_at: "2026-08-07T18:39:31Z" }
], { today: TODAY, sheetAsOf: AS_OF });
var dillWrite = dill.actions.filter(function (a) { return a.op !== "match"; });
assert(dillWrite.length === 1 && dillWrite[0].op === "update", "dill ranch reuses the blank row");
assert(dillWrite[0].qty === 475 && dillWrite[0].location === "C-46-L1", "dill ranch qty and rack");
assert(dillWrite[0].lot.indexOf("1985-20260724RNA7") >= 0 && dillWrite[0].expires_on === "2027-07-24", "dill ranch lot and exp");
assert(!dill.actions.some(function (a) { return a.op === "delete"; }), "blank row is not left behind");

var cinnamon = plan.planItemLots("SEAS-S02", [
  { item: "SEAS-S02", lot: "# H 1326", qty: 2000, exp: "2027-09-02", locCode: "S 02", note: "" }
], [
  { source_id: "SEAS-S02", location: "RECEIVING", lot: "# 1326", qty: 2700, updated_at: "2026-09-09T00:00:00Z" },
  { source_id: "SEAS-S02", location: "RECEIVING", lot: "# F1826", qty: 2700, updated_at: "2026-07-15T00:00:00Z" },
  { source_id: "SEAS-S02", location: "RECEIVING", lot: "LOT - G0726", qty: 2700, updated_at: "2026-07-22T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(cinnamon.actions.filter(function (a) { return a.op === "delete"; }).length === 3, "lots missing from the sheet are zeroed");
assert(cinnamon.actions.some(function (a) { return a.op === "insert" && a.qty === 2000 && a.location === "S-02"; }), "sheet lot is inserted");

var apple = plan.planItemLots("TMP-SEAS-APPLEPIE", [
  { item: "TMP-SEAS-APPLEPIE", lot: "# J1O25", qty: 11.3, exp: "2026-10-22", locCode: "A24" }
], [
  { source_id: "TMP-SEAS-APPLEPIE", location: "RECEIVING", lot: "", qty: 12, updated_at: "2026-06-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(apple.actions.some(function (a) { return a.op === "update" && a.location === "QUARANTINE" && a.qty === 11.3; }), "expired lot goes to quarantine");
var appleWrite = apple.actions.filter(function (a) { return a.op === "update" && a.location === "QUARANTINE"; })[0];
var appleHold = plan.holdSpecForAction(appleWrite, { id: "TMP-SEAS-APPLEPIE", category: "seasoning", name: "Seasoning - Apple Pie" });
assert(appleHold && appleHold.status === "held" && appleHold.receiving_log_id == null, "quarantine sync describes a hold, not a receipt");
assert(appleHold.hold_reason.indexOf("QUARANTINE") >= 0 && appleHold.hold_reason.indexOf("Not a receipt") >= 0, "sync hold reason");
assert(appleHold.lot.indexOf("J1O25") >= 0 && appleHold.hold_qty === 11.3, "sync hold keeps the lot and qty");
assert(plan.holdSpecForAction({ op: "insert", item: "BAG4-S01", location: "QUARANTINE", lot: "L", qty: 10 }, { id: "BAG4-S01", category: "bag4", name: "Bags" }) == null, "a bag in quarantine is not a raw sync hold");
assert(plan.holdSpecForAction({ op: "insert", item: "TMP-SEAS-APPLEPIE", location: "RECEIVING", lot: "L", qty: 10 }, { id: "TMP-SEAS-APPLEPIE", category: "seasoning", name: "Seasoning - Apple Pie" }) == null, "good stock does not open a hold");

var manual = plan.planItemLots("SEAS-S08", [
  { item: "SEAS-S08", lot: "#G0726", qty: 650, exp: "2027-07-20", locCode: "S 08" }
], [
  { source_id: "SEAS-S08", location: "RECEIVING", lot: "#G0726", qty: 900, expires_on: "", updated_at: "2026-11-06T15:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(!manual.actions.some(function (a) { return a.op === "update" || a.op === "delete" || a.op === "insert"; }), "newer manual edit is not written");
assert(manual.holds.some(function (h) { return h.reason.indexOf("Manual edit") >= 0; }), "manual edit is reported");

var cap = plan.planAggregate({ item: "FILM4-S02", qty: 168100 }, [
  { source_id: "FILM4-S02", location: "RECEIVING", lot: "", qty: 1000, updated_at: "2026-10-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(!cap.actions.some(function (a) { return a.op !== "match"; }), "over 100000 is not written");
assert(cap.holds.some(function (h) { return h.reason.indexOf("100,000") >= 0; }), "over 100000 is reported");

var pickle = plan.planItemLots("SEAS-S05", [
  { item: "SEAS-S05", lot: "#61005DA500", qty: 4000, exp: "2027-07-05", locCode: "S 05" },
  { item: "SEAS-S05", lot: "# J1926", qty: 950, exp: "2027-10-23", locCode: "S 05", hold: "special", holdReason: "SEAS-S05 Dill Pickle lot j1926 stays untouched pending Adriana (OS 1,350 vs sheet 950)." }
], [
  { source_id: "SEAS-S05", location: "RECEIVING", lot: "# 61005DA500", qty: 4000, expires_on: "2027-07-05", updated_at: "2026-10-26T00:00:00Z" },
  { source_id: "SEAS-S05", location: "RECEIVING", lot: "LOT # j1926", qty: 1350, expires_on: "2027-10-23", updated_at: "2026-11-04T18:44:28Z" },
  { source_id: "SEAS-S05", location: "RECEIVING", lot: "Lot # J0126", qty: 900, updated_at: "2026-10-06T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(!pickle.actions.some(function (a) { return plan.lotKey(a.lot) === "J1926" && a.op !== "match"; }), "j1926 is not rewritten");
assert(pickle.holds.some(function (h) { return h.reason.indexOf("j1926") >= 0; }), "j1926 hold is reported");
assert(pickle.actions.some(function (a) { return a.op === "delete" && plan.lotKey(a.lot) === "J0126"; }), "other dill pickle lots are zeroed");

var coa = plan.planItemLots("SEED-BROWN", [
  { item: "SEED-BROWN", lot: "26230H17", qty: 550, exp: "" }
], [
  { source_id: "SEED-BROWN", location: "RECEIVING", lot: "26230H17", qty: 550, coa_received: "no", coa_released_at: "", updated_at: "2026-10-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(coa.actions.some(function (a) { return a.location === "QA-HOLD" && a.qty === 550; }), "missing COA stays on QA-HOLD");

var flags = plan.reconcile({
  lots: [{ item: "SEAS-DLRN", lot: "#1985-20260724RNA7", qty: 475 }],
  aggregates: [{ item: "BAG4-S01", qty: 7900 }]
}, [
  { item_id: "SEAS-DLRN", location: "RECEIVING", lot: "", qty: 500 },
  { item_id: "BAG4-S01", location: "RECEIVING", lot: "", qty: 6400 }
], [
  { id: "SEAS-DLRN", code: "SEAS-DLRN", category: "seasoning" },
  { id: "BAG4-S01", code: "B4-S01", category: "bag4" }
]);
assert(flags.some(function (f) { return f.item === "SEAS-DLRN" && f.os === 500 && f.sheet === 475; }), "reconcile flags the dill ranch lot");
assert(flags.some(function (f) { return f.item === "BAG4-S01" && f.os === 6400 && f.sheet === 7900; }), "reconcile flags an aggregate");
assert(!plan.drifted(1000, 1004) === false || plan.drifted(1000, 1002), "drift over 1 unit");
assert(plan.drifted(10000, 10002), "2 units flags");
assert(!plan.drifted(10000, 10000.4), "under both thresholds stays quiet");
assert(plan.drifted(100, 100.8), "over 0.5 percent flags");

var agg = plan.planAggregate({ item: "BAG4-S01", qty: 7900 }, [
  { source_id: "BAG4-S01", location: "RECEIVING", lot: "", qty: 6400, updated_at: "2026-10-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(agg.actions.some(function (a) { return a.op === "update" && a.qty === 7900; }), "aggregate sets the sheet total");

var src = require("fs").readFileSync(require("path").join(__dirname, "..", "scripts", "build-inv-sync.js"), "utf8");
assert(src.indexOf("lot") >= 0 && src.indexOf("SKIPPED") < 0, "generator does not skip lot-tracked raw materials");
assert(src.indexOf("planAll") >= 0 || src.indexOf("LOT_ROWS") >= 0, "generator writes lot rows");

var seedLine = plan.parseSeedLine({ item: "SEED-WHITE", lot: "26219H03", qty: 900, packed: "08/07/2026" });
assert(seedLine.exp === "" && seedLine.packed === "2026-08-07" && seedLine.expUnknown, "seed date is packed, not expiration");

var big = plan.planAggregate({ item: "FILM4-S01", qty: 208100 }, [
  { source_id: "FILM4-S01", location: "F-16-L1", lot: "", qty: 229500, updated_at: "2026-10-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(big.actions.some(function (a) { return a.op === "update" && a.qty === 208100; }), "confirmed film total is loaded");
assert(!big.holds.length, "confirmed film total is not re-held");
var jumped = plan.planAggregate({ item: "FILM4-S01", qty: 300000 }, [
  { source_id: "FILM4-S01", location: "F-16-L1", lot: "", qty: 208100, updated_at: "2026-10-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(jumped.holds.some(function (h) { return h.reason.indexOf("100,000") >= 0; }), "a new jump over 100000 is still held");

var pickleNow = plan.planItemLots("SEAS-S05", [
  { item: "SEAS-S05", lot: "#61005DA500", qty: 4000, exp: "2027-07-05", locCode: "S 05" },
  { item: "SEAS-S05", lot: "# J1926", qty: 950, exp: "2027-10-23", locCode: "" }
], [
  { source_id: "SEAS-S05", location: "S-05", lot: "# 61005DA500", qty: 4000, expires_on: "2027-07-05", updated_at: "2026-10-26T00:00:00Z" },
  { source_id: "SEAS-S05", location: "RECEIVING", lot: "LOT # j1926", qty: 1350, expires_on: "2027-10-23", updated_at: "2026-11-04T18:44:28Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(pickleNow.actions.some(function (a) { return plan.lotKey(a.lot) === "J1926" && a.op === "update" && a.qty === 950; }), "j1926 is set to 950");
assert(!pickleNow.actions.some(function (a) { return plan.lotKey(a.lot) === "61005DA500" && a.op !== "match"; }), "life spice lot stays 4000");

var towels = plan.planAggregate({ item: "SUP-PAPTOW12", qty: 2, replaceOpen: "WAREHOUSE" }, [
  { source_id: "SUP-PAPTOW12", location: "RECEIVING", lot: "", qty: -36, updated_at: "2026-08-01T00:00:00Z" },
  { source_id: "SUP-PAPTOW12", location: "WAREHOUSE", lot: "", qty: 39, updated_at: "2026-08-01T00:00:00Z" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(towels.actions.some(function (a) { return a.op === "insert" && a.qty === 2 && a.location === "WAREHOUSE"; }), "paper towels settle at 2 packs");
assert(towels.actions.filter(function (a) { return a.op === "delete"; }).length === 2, "old towel rows are removed");

var ready = require("../prod-ready.js");
assert(!plan.UNSAFE["NUTS-CINNAMONCHURRO"] && !plan.UNSAFE["NUTS-BBQ"], "cashew unsafe strings are gone");
assert(plan.UNSAFE["TMP-F4-UNVAULTEDLIMITED"] && plan.UNSAFE["SUP-BOXX"], "other unsafe rules stay");
var cashewStock = plan.CASHEW_STOCK.map(function (line) {
  return { item_id: line.item, location: line.location, lot: line.lot, qty: line.qty, expires_on: line.exp };
});
var cashew = plan.cashewReport(cashewStock);
assert(cashew.lines.length === 8 && cashew.lines.every(function (l) { return l.match; }), "eight cashew stock lines match");
assert(cashew.churro === 4032 && cashew.bbq === 18432 && cashew.total === 22464, "cashew totals " + cashew.churro + " " + cashew.bbq + " " + cashew.total);
assert(cashew.palletCount === 11 && cashew.palletSum === 22464, "eleven source pallets sum to the stock");
assert(!cashew.pallets.some(function (p) { return p.pallet === "8"; }), "pallet 8 is not in the loaded pallets");
assert(cashew.hold8Qty === 2880 && cashew.hold8InSum === false && cashew.bbq + cashew.hold8Qty === 21312, "pallet 8 stays out of the BBQ sum");
var h26281 = cashew.lines.filter(function (l) { return plan.lotKey(l.lot) === "H26281"; });
assert(h26281.length === 1 && h26281[0].exp === "2027-10-08" && h26281[0].sheet === 8352, "H26281 uses the earliest expiry");
var later = cashew.pallets.filter(function (p) { return plan.lotKey(p.lot) === "H26281" && p.exp === "2027-10-09"; });
assert(later.length === 2 && later.reduce(function (s, p) { return s + p.qty; }, 0) === 3312, "later H26281 pallets stay on the source list");
var cashewPlan = plan.planAll({ lots: [], aggregates: [
  { item: "NUTS-CINNAMONCHURRO", qty: 4032, category: "other", unit: "packs", create: true, unsafe: "old note" },
  { item: "NUTS-BBQ", qty: 18432, category: "other", unit: "packs", create: true, unsafe: "old note" }
] }, cashewStock, [
  { id: "NUTS-CINNAMONCHURRO", code: "NUTS-CINNAMONCHURRO", category: "cashews" },
  { id: "NUTS-BBQ", code: "NUTS-BBQ", category: "cashews" }
], { today: TODAY, sheetAsOf: AS_OF });
assert(!cashewPlan.applied.some(function (a) { return a.item === "NUTS-BBQ" || a.item === "NUTS-CINNAMONCHURRO"; }), "matching cashew totals are not rewritten");
assert(cashewPlan.holds.some(function (h) { return /pallet 8/.test(h.reason); }) && cashewPlan.holds.some(function (h) { return /Oct 15/.test(h.reason); }), "open cashew holds stay on the plan");
assert(ready.kindOf({ id: "MALTO", code: "MALTO", category: "retired", name: "Retired: Maltodextrin" }) === "retired", "retired malto leaves the pool");
assert(ready.kindOf({ id: "TMP-SEAS-MALTODEXTRINCLINTOSECR", code: "TMP-SEAS-MALTODEXTRINCLINTOSECR", category: "seasoning", name: "Seasoning - Maltodextrin Clintose CR-10" }) === "malto", "clintose stays the malto record");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("lot sync checks passed");

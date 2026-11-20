#!/usr/bin/env node
/* Invoice close and blank-DC reconcile. No network. Rows are status changes only. */
"use strict";

var fs = require("fs");
var path = require("path");
var DEMAND = require("../demand.js");
var SPS = require("../sps-map.js");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var TODAY = "2026-11-20";

assert(DEMAND.poMatch("023315762", "23315762"), "leading-zero PO matches");
assert(DEMAND.poMatch("0003942350", "3942350"), "padded KeHE PO matches");
assert(DEMAND.poMatch("3942350-015", "3942350"), "KeHE 810 release suffix matches");
assert(DEMAND.poMatch("394235001", "3942350"), "KeHE 810 glued release matches");
assert(DEMAND.poMatch("MO10106510-01", "MO10106510"), "McLane release suffix matches");
assert(!DEMAND.poMatch("4022836", "4027679"), "different KeHE POs stay apart");
assert(DEMAND.matchesIgnoringBlankDc(
  { partner: "KeHE", po: "3942350", dc: "", flavor: "Ranch" },
  { partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Ranch" }
), "blank DC matches the real DC");
assert(!DEMAND.matchesIgnoringBlankDc(
  { partner: "Target", po: "100", dc: "055", flavor: "Ranch" },
  { partner: "Target", po: "100", dc: "058", flavor: "Ranch" }
), "two Target DCs do not match");

var keheExisting = [
  { id: "dc", partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Cinnamon Churro", bags: 720, cases: 10, qty: 10, status: "Open", imported_by: "SPS UI 2026-11-10" },
  { id: "blank", partner: "KeHE", po: "3942350", dc: "", flavor: "Cinnamon Churro", bags: 720, cases: 10, qty: 10, status: "Open", imported_by: "Troy", batch_id: "SPS-UI-2026-11-13" },
  { id: "gp", partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Garlic Parmesan", bags: 720, cases: 10, qty: 10, status: "Open" }
];
var keheIn = [
  { partner: "KeHE", po: "3942350", dc: "", flavor: "Cinnamon Churro", bags: 800, cases: 12, qty: 12, status: "Open" },
  { partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Garlic Parmesan", bags: 720, cases: 10, qty: 10, status: "Open" }
];
var kehe = DEMAND.reconcileOpen(keheExisting, keheIn, { today: TODAY });
var cinUpdate = kehe.update.filter(function (u) { return u.id === "dc"; })[0];
assert(kehe.insert.length === 0, "blank-DC reconcile inserts nothing");
assert(kehe.update.length === 1 && cinUpdate && cinUpdate.bags === 800 && !cinUpdate.dc, "blank-DC reconcile is 1 update and keeps the real DC");
assert(kehe.close.length === 1 && kehe.close[0].id === "blank" && kehe.close[0].reason === "merged-duplicate", "blank duplicate closes as merged-duplicate");
var keheLive = keheExisting.map(function (row) {
  var copy = Object.assign({}, row);
  if (kehe.close.some(function (c) { return c.id === row.id; })) copy.status = "Complete";
  if (cinUpdate && row.id === "dc") copy.bags = cinUpdate.bags;
  return copy;
});
var keheOpen = keheLive.filter(function (r) { return r.status === "Open"; });
assert(keheOpen.length === 2 && keheOpen.every(function (r) { return r.dc === "0569813430025"; }), "KeHE 3942350 ends as one live set per flavor");
assert(keheExisting.length === 3, "nothing deleted");
var dupes = DEMAND.blankDcDuplicates(keheExisting, { today: TODAY });
assert(dupes.length === 1 && dupes[0].id === "blank" && dupes[0].reason === "merged-duplicate", "reconcileDemandOpen cleanup closes the blank sibling");
assert(read("db.js").indexOf("blankDcDuplicates") >= 0, "DB.reconcileDemandOpen runs the blank-DC cleanup");

var target = [
  { id: "t1", partner: "Target", po: "10002181608", dc: "055", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { id: "t2", partner: "Target", po: "10002181608", dc: "058", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { id: "t3", partner: "Target", po: "10002181608", dc: "3801", flavor: "Ranch", bags: 144, cases: 2, qty: 2, status: "Open" }
];
var targetIn = [
  { partner: "Target", po: "10002181608", dc: "055", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { partner: "Target", po: "10002181608", dc: "058", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { partner: "Target", po: "10002181608", dc: "3801", flavor: "Ranch", bags: 216, cases: 3, qty: 3, status: "Open" },
  { partner: "Target", po: "10002181608", dc: "", flavor: "Ranch", bags: 999, cases: 9, qty: 9, status: "Open" }
];
var targetPlan = DEMAND.reconcileOpen(target, targetIn, { today: TODAY });
assert(targetPlan.insert.length === 0 && targetPlan.close.length === 0, "Target blank row does not insert or collapse");
assert(targetPlan.update.length === 1 && targetPlan.update[0].id === "t3" && targetPlan.update[0].bags === 216 && !targetPlan.update[0].dc, "only the changed Target DC updates");
assert(target.filter(function (r) { return r.dc; }).length === 3, "Target per-store DCs stay distinct");

function poDoc(num, status) {
  var header = { TradingPartnerId: "614ALLSMACKINSU", PurchaseOrderNumber: num, PurchaseOrderDate: "2026-10-01" };
  if (status) header.Status = status;
  return {
    Header: {
      OrderHeader: header,
      Address: [{ AddressTypeCode: "ST", AddressName: "McLane", AddressLocationNumber: "01" }]
    },
    LineItem: [{ OrderLine: { OrderQty: 10, OrderQtyUOM: "CA", PurchasePrice: 10, LineSequenceNumber: "1", GTIN: "00850047865441" }, ProductOrItemDescription: [{ ProductDescription: "SMACKIN SEEDS OG 4OZ" }] }]
  };
}
function asnDoc(num, status) {
  var header = { TradingPartnerId: "614ALLSMACKINSU", ShipmentIdentification: "ASN1", ShipDate: "2026-10-18", BillOfLadingNumber: "BOL1" };
  if (status) header.Status = status;
  return {
    Header: { ShipmentHeader: header },
    OrderLevel: [{ OrderHeader: { PurchaseOrderNumber: num }, PackLevel: [{ ItemLevel: [{ ShipmentLine: { ShipQty: 10, ShipQtyUOM: "CA", GTIN: "00850047865441" } }] }] }]
  };
}
function invDoc(num, partnerId, shipName) {
  return {
    Header: {
      InvoiceHeader: { TradingPartnerId: partnerId || "614ALLSMACKINSU", InvoiceNumber: "INV1", PurchaseOrderNumber: num, InvoiceDate: "2026-10-19" },
      Address: [{ AddressTypeCode: "ST", AddressName: shipName || "McLane", AddressLocationNumber: "01" }]
    },
    LineItem: [{ InvoiceLine: { InvoiceQty: 10, InvoiceQtyUOM: "CA", PurchasePrice: 10, LineSequenceNumber: "1" } }],
    Summary: { TotalAmount: 100 }
  };
}
function evidenceOf(docs) {
  return DEMAND.evidenceFromStates(SPS.interpret(docs.map(function (d) { return { json: d.json, docStatus: d.status || "" }; })));
}

var lines = [
  { id: "m1", partner: "McLane", po: "MO10106510", dc: "01", flavor: "Ranch", status: "Open", source: "SPS", imported_by: "SPS Feed" },
  { id: "m2", partner: "McLane", po: "MO10106510", dc: "02", flavor: "Ranch", status: "Open", source: "SPS", imported_by: "Troy", batch_id: "SPS-UI-2026-11-13" },
  { id: "m3", partner: "McLane", po: "MO10106510", dc: "", flavor: "OG Original", status: "Open", source: "SPS", imported_by: "SPS UI 2026-11-18" },
  { id: "z", partner: "Scheels", po: "00023315762", dc: "9", flavor: "Ranch", status: "Open", source: "SPS", imported_by: "SPS Feed" },
  { id: "stay", partner: "McLane", po: "HP10077063", dc: "01", flavor: "Ranch", status: "Open", source: "SPS" },
  { id: "staged", partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Cinnamon Churro", status: "Open", source: "SPS" },
  { id: "other", partner: "Target", po: "MO10106510", dc: "055", flavor: "Ranch", status: "Open", source: "SPS" }
];
var orders = [
  { id: 11, customer: "McLane", customer_po: "MO10106510", status: "Open", entered_by: "SPS UI 2026-11-18", notes: "keep" },
  { id: 12, customer: "McLane", customer_po: "MO10106510-01", status: "Open", entered_by: "SPS UI 2026-11-10", notes: "" },
  { id: 13, customer: "McLane", customer_po: "HP10077063", status: "Open", entered_by: "SPS UI 2026-11-18", notes: "" },
  { id: 14, customer: "McLane", customer_po: "MO10106510", status: "Open", entered_by: "SPS Feed", notes: "" },
  { id: 15, customer: "KeHE", customer_po: "3942350", status: "Open", entered_by: "SPS UI 2026-11-13", notes: "" },
  { id: 16, customer: "Scheels", customer_po: "23315762", status: "Open", entered_by: "SPS UI 2026-11-18", notes: "" }
];
var before = lines.length;
var invEvidence = evidenceOf([
  { json: poDoc("MO10106510", "Open") },
  { json: asnDoc("MO10106510", "Accepted"), status: "Accepted" },
  { json: invDoc("MO10106510-01") },
  { json: invDoc("023315762", "BPRALLSMACKINSU", "Scheels") }
]);
var closed = DEMAND.planInvoiceClose(lines, orders, invEvidence, {
  today: TODAY,
  staged: [{ partner: "KeHE", po: "3942350" }]
});
assert(closed.deleted === 0 && lines.length === before, "nothing deleted");
function ids(list) { return list.map(function (r) { return String(r.id); }).sort().join(","); }
assert(ids(closed.lines) === "m1,m2,m3,z", "810 closes multi-DC, blank-DC, SPS UI, and leading-zero lines");
assert(closed.lines.every(function (c) { return c.notes.indexOf("[[CLOSED:2026-11-20:sps-810]]") >= 0 && c.status === "Complete"; }), "close note uses Denver sps-810");
assert(!closed.lines.some(function (c) { return c.id === "stay" || c.id === "staged" || c.id === "other"; }), "no-invoice, staged, and other partner stay open");
assert(ids(closed.orders) === "11,12,16", "SPS UI orders close, including the release and leading-zero PO");
assert(!closed.orders.some(function (c) { return c.id === 14 || c.id === 13 || c.id === 15; }), "SPS Feed, no-invoice, and staged orders stay");
assert(closed.logs.length === 5 && closed.logs.some(function (l) { return l.a === "Demand closed" && l.d.indexOf("MO10106510 3 lines") >= 0; }), "addLog once per closed PO");
assert(closed.logs.some(function (l) { return l.a === "Order closed"; }), "addLog per closed order");

var noAsn = evidenceOf([{ json: poDoc("MO10106510", "Open") }, { json: asnDoc("MO10106510") }]);
var noAsnPlan = DEMAND.planInvoiceClose(lines, orders, noAsn, { today: TODAY });
assert(noAsnPlan.lines.length === 0 && noAsnPlan.orders.length === 0, "an 856 without Accepted/Complete does not close");
var asnOnly = evidenceOf([{ json: poDoc("HP10077063", "Open") }, { json: asnDoc("HP10077063", "Complete"), status: "Complete" }]);
var asnPlan = DEMAND.planInvoiceClose([{ id: "s", partner: "McLane", po: "HP10077063", status: "Open", source: "SPS" }], [], asnOnly, { today: TODAY });
assert(asnPlan.lines.length === 1 && asnPlan.lines[0].reason === "sps-810", "856 Complete closes with sps-810");
var rejected = SPS.interpret([{ json: { Header: { InvoiceHeader: { TradingPartnerId: "614ALLSMACKINSU", PurchaseOrderNumber: "HP10077063", InvoiceNumber: "X" } } } }]);
assert(DEMAND.evidenceFromStates(rejected).length === 0, "a rejected 810 is not evidence");

var pastLines = [
  { id: "late", partner: "KeHE", po: "4022836", dc: "", flavor: "Ranch", status: "Open", source: "SPS", batch_id: "SPS-UI-2026-11-18", due_date: "11/18/2026" },
  { id: "prove", partner: "McLane", po: "MO10106510", dc: "01", flavor: "Ranch", status: "Open", source: "SPS", due_date: "11/01/2026" },
  { id: "held", partner: "KeHE", po: "3942350", dc: "0569813430025", flavor: "Ranch", status: "Open", source: "SPS", due_date: "10/07/2026" },
  { id: "soon", partner: "Target", po: "10002181608", dc: "055", flavor: "Ranch", status: "Open", source: "SPS", due_date: "11/20/2026" },
  { id: "faire", partner: "Faire", po: "F1", dc: "", flavor: "Ranch", status: "Open", source: "Faire", due_date: "11/01/2026" }
];
var past = DEMAND.pastDueSafety(pastLines, invEvidence, { today: TODAY, staged: [{ partner: "KeHE", po: "3942350" }] });
assert(past.close.length === 1 && past.close[0].id === "prove" && past.close[0].reason === "sps-810", "nightly closes a past-due line that has an 810");
assert(past.noInvoice.length === 1 && past.noInvoice[0].id === "late", "no-invoice past-due SPS line stays open");
assert(past.flags.indexOf("past-due Open demand > 0") >= 0, "past-due Open demand flag");
assert(past.flags.indexOf("past due, no SPS invoice") >= 0, "past due, no SPS invoice flag");
assert(!past.close.some(function (c) { return c.id === "held" || c.id === "soon" || c.id === "faire"; }), "staged, not-yet-due, and non-SPS lines are not closed");
var clear = DEMAND.pastDueSafety([
  { id: "ok", partner: "Target", po: "10002181608", dc: "055", flavor: "Ranch", status: "Open", source: "SPS", due_date: "12/01/2026" }
], [], { today: TODAY, staged: [] });
assert(clear.pastDueOpen === 0 && clear.flags.length === 0 && clear.close.length === 0, "current demand with nothing past due raises no flag");

var dh = read("data-health.js");
assert(dh.indexOf("past-due Open demand > 0") >= 0 && dh.indexOf("past due, no SPS invoice") >= 0, "Data Health renders both flags");
assert(dh.indexOf("does not close them") >= 0, "Data Health still does not close rows");
assert(dh.indexOf('t: "sps_transactions"') < 0, "sps_transactions is not a freshness row");
var sync = read("supabase/functions/sps-sync/index.js");
assert(sync.indexOf("closeInvoicedPo") >= 0 && sync.indexOf("nightlyPastDue") >= 0, "sps-sync closes on the file and nightly");
assert(sync.indexOf("addLog") >= 0 && sync.indexOf("sps-810") >= 0, "sps-sync logs the sps-810 close");
assert(sync.indexOf('method: "DELETE"') < 0, "sps-sync does not delete demand or order rows");
assert(sync.indexOf("SPS files are never deleted") >= 0, "SPS itself is not modified");
assert(read("demand-autoclose.js").indexOf("No database writes") >= 0, "autoclose stays read-only");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("demand reconcile ok");

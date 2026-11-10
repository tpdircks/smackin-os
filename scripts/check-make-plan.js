#!/usr/bin/env node
/* Make Plan math. No network. No stock writes. */
"use strict";

var fs = require("fs");
var path = require("path");
require("../ecom.js");
var plan = require("../make-plan.js");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var NOW = new Date("2026-11-10T23:00:00Z");
assert(plan.weekMonday(NOW) === "2026-11-09", "Denver week starts Monday 11/9, got " + plan.weekMonday(NOW));
assert(plan.weekLabel("2026-11-09") === "11/9", "week label");

var lines = [
  { partner: "Target", po: "10002133500", due_date: "10/26/2026", flavor: "Backyard BBQ", flavor_code: "S03", bags: 100, status: "Open" },
  { partner: "Target", po: "10002144994", due_date: "11/02/2026", flavor: "Ranch", flavor_code: "S08", bags: 80, status: "Open" },
  { partner: "Target", po: "10002157898", due_date: "11/09/2026", flavor: "Dill Pickle", flavor_code: "S05", bags: 5040, status: "Open" },
  { partner: "Bass Pro", po: "14903367", due_date: "10/22/2026", flavor: "Ranch", flavor_code: "S08", bags: 288, status: "Open" },
  { partner: "Target", po: "ASN1", due_date: "11/12/2026", flavor: "Ranch", bags: 10, status: "Open", notes: "[[SPSSTAGE:asn-accepted]]" },
  { partner: "KeHE", po: "INV1", due_date: "11/12/2026", flavor: "Ranch", bags: 9, status: "Open", notes: "[[SPSSTAGE:invoice-pending]]" },
  { partner: "KeHE", po: "DONE", due_date: "11/12/2026", flavor: "Ranch", bags: 7, status: "Complete" },
  { partner: "KeHE", po: "NEW1", due_date: "11/12/2026", flavor: "OG Original", flavor_code: "S01", bags: 72, status: "New" }
];
var split = plan.splitLines(lines, NOW);
assert(split.excluded.map(function (e) { return e.po; }).join(",") === "10002133500,10002144994", "old Target POs drop");
assert(split.kept.some(function (l) { return l.po === "10002157898"; }), "this week's Target PO stays");
assert(split.kept.some(function (l) { return l.po === "14903367"; }), "past-due non-Target stays");
assert(!split.kept.some(function (l) { return l.po === "ASN1" || l.po === "INV1" || l.po === "DONE"; }), "ASN, invoice, and complete stay out");
assert(split.kept.some(function (l) { return l.po === "NEW1"; }), "SPS New still counts");

var deduped = plan.dedupeOnHand(
  { "Backyard BBQ": { bags: 7600 } },
  { "Backyard BBQ": 7200, "Cheeseburger": 400 }
);
assert(deduped.byFlavor["Backyard BBQ"].bags === 7600 && deduped.byFlavor["Backyard BBQ"].dropped === 7200, "same goods are not added twice");
assert(deduped.byFlavor["Cheeseburger"].bags === 400 && deduped.byFlavor["Cheeseburger"].source === "stock build", "stock build fills a flavor the bag table does not have");

assert(plan.casesOf(8664) === 120 && plan.palletsOf(8664) === 3.5, "workbook case and pallet rounding");
assert(plan.casesOf(8960) === 124 && plan.palletsOf(8960) === 3.6, "workbook total rounding");

var built = plan.build({
  now: NOW,
  lines: lines,
  shipping: [
    { entered_by: "sync:shipstation", status: "awaiting_shipment", created_at: "2026-11-10T21:40:03Z", contents: "SS-DP-4OZ-SINGLE DILL PICKLE x12" },
    { entered_by: "sync:shipstation", status: "shipped", contents: "SS-DP-4OZ-SINGLE DILL PICKLE x99" },
    { entered_by: "sync:shipstation", status: "awaiting_shipment", contents: "SS-CJ-6 CHEDDAR JALAPENO 1.5oz bags (6 Pack) x1" }
  ],
  items: [
    { id: "BAG4-S05", category: "bag4", flavor: "Dill Pickle" },
    { id: "FILM4-S05", category: "film4", flavor: "Dill Pickle" },
    { id: "SEAS-S05", category: "seasoning", flavor: "Dill Pickle" },
    { id: "DT275-BBQ", category: "dollartree275", flavor: "BBQ" },
    { id: "BAG4-S01", category: "bag4", flavor: "OG Original" }
  ],
  stock: [
    { item_id: "BAG4-S05", location: "RECEIVING", qty: 1000, updated_at: "2026-11-10T00:00:00Z" },
    { item_id: "BAG4-S05", location: "QUARANTINE", qty: 5000 },
    { item_id: "BAG4-S05", location: "RETURNS", qty: 40 },
    { item_id: "FILM4-S05", location: "RECEIVING", qty: 200000, updated_at: "2026-11-01T00:00:00Z" },
    { item_id: "SEAS-S05", location: "L-20", qty: 12, updated_at: "2026-11-02T00:00:00Z" },
    { item_id: "DT275-BBQ", location: "RECEIVING", qty: 7920 },
    { item_id: "BAG4-S01", location: "RECEIVING", qty: 50 }
  ],
  stockBuild: [
    { flavor: "Dill Pickle", bags: 7200, on_hand: 100, bagsEach: 72 }
  ],
  purchaseOrders: [],
  recipe: function () { return { seas_lbs: 8 }; }
});
assert(built.wip.note === "No WIP PO-tab orders in OS", "empty PO tab note");
assert(built.headline.toProduce === Math.max(0, (5040 + 12) - 7200) + Math.max(0, 72 - 50) + Math.max(0, 288 - 0), "to produce is demand minus the kept on hand");
var dill = built.required.concat(built.covered).filter(function (r) { return r.flavor === "Dill Pickle"; })[0];
assert(dill && dill.onHand === 7200 && dill.demand === 5052, "Dill keeps the larger count and adds the unshipped 4 oz queue once");
assert(dill.ecom === 12, "shipped ShipStation rows are not demand");
assert(built.ecom.oz15 === 6, "1.5 oz queue is counted aside, not as 4 oz");
assert(dill.film === 0 && dill.filmHeld === 200000, "film over 100,000 is held");
assert(built.dollarTree.total === 7920, "Dollar Tree units stay on the display");
assert(built.headline.demand === 5040 + 12 + 288 + 72, "headline demand skips excluded Target and ASN");
assert(!built.required.concat(built.covered).some(function (r) { return r.flavor === "BBQ"; }), "Dollar Tree flavor is not a 4 oz row");
var pack = plan.emailPack(built);
assert(pack.plain.indexOf("Attached/below is this week's demand report (week of 11/9).") === 0, "email opens with the week line");
assert(pack.html.indexOf("Production required") >= 0 && pack.html.indexOf("Covered from stock") >= 0 && pack.html.indexOf("Demand by customer") >= 0, "email has the three tables");
assert(pack.plain.indexOf("10002133500") >= 0 && pack.plain.indexOf("10002144994") >= 0, "email lists excluded Target POs");
assert(plan.view(built).indexOf("\u2014") < 0 && plan.view(built).indexOf("\u2013") < 0, "plan view has no em dash");
assert(read("make-plan.js").indexOf("\u2014") < 0 && read("make-plan.js").indexOf("\u2013") < 0, "source has no em dash");
assert(read("app.js").indexOf("function viewMakePlan") >= 0 && read("app.js").indexOf("makePlanCopy") >= 0, "Make Plan is a view and can be copied");
assert(read("app.js").indexOf("async function receive(item, qty, lot, op, meta)") < 0 || read("db.js").indexOf("async function receive(item, qty, lot, op, meta)") >= 0, "receive signature stays in db");
assert(read("make-plan.js").indexOf(".insert(") < 0 && read("make-plan.js").indexOf(".update(") < 0 && read("make-plan.js").indexOf(".delete(") < 0, "plan does not write");
assert(read("dept-homes.js").indexOf('primary: "makeplan"') >= 0, "Demand opens Make Plan");
assert(read("index.html").indexOf("make-plan.js?b=1") >= 0, "script tag");
assert(read("service-worker.js").indexOf('"./make-plan.js"') >= 0, "precached");

var refused = plan.build({
  now: NOW,
  lines: [],
  items: [{ id: "DT", category: "dollartree275", flavor: "BBQ" }],
  stock: [{ item_id: "DT", location: "RECEIVING", qty: 332800 }],
  purchaseOrders: [{ id: "PO-1", status: "ordered", lines: [{ item_id: "X" }] }]
});
assert(refused.dollarTree.total === 0 && refused.dollarTree.refused, "332,800 DT units are not used");
assert(refused.headline.demand === 0 && refused.headline.toProduce === 0, "refused DT units do not create production");
assert(refused.wip.connected && refused.wip.rows.length === 1 && refused.wip.note.indexOf("not added to demand") >= 0, "PO rows stay a hook");

var pizza = plan.build({
  now: NOW,
  lines: [],
  shipping: [{ entered_by: "sync:shipstation", status: "awaiting_shipment", contents: "SS-PCA-4OZ-SINGLE PCA PIZZA x92" }],
  items: [{ id: "BAG4-L20", category: "bag4", flavor: "Deep Dish Pizza" }],
  stock: [{ item_id: "BAG4-L20", location: "S24-01", qty: 12183 }],
  purchaseOrders: [{ id: "x", lines: [] }]
});
var pizzaRow = pizza.required.concat(pizza.covered).filter(function (r) { return r.flavor === "PCA Pizza"; })[0];
assert(pizzaRow && pizzaRow.onHand === 12183 && pizzaRow.toProduce === 0, "Deep Dish stock covers PCA Pizza demand");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("make plan ok");

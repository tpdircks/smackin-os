#!/usr/bin/env node
/* Make Plan math. No network. No stock writes. */
"use strict";

var fs = require("fs");
var path = require("path");
require("../ecom.js");
var plan = require("../make-plan.js");
var SPS = require("../sps-map.js");

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
assert(split.kept.some(function (l) { return l.po === "10002133500"; }) && split.kept.some(function (l) { return l.po === "10002144994"; }), "older Target POs stay open");
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
assert(built.headline.toProduce === Math.max(0, (5040 + 12) - 7200) + Math.max(0, 72 - 50) + Math.max(0, 288 + 80) + 100, "to produce keeps older Target bags");
var dill = built.required.concat(built.covered).filter(function (r) { return r.flavor === "Dill Pickle"; })[0];
assert(dill && dill.onHand === 7200 && dill.demand === 5052, "Dill keeps the larger count and adds the unshipped 4 oz queue once");
assert(dill.ecom === 12, "shipped ShipStation rows are not demand");
assert(built.ecom.oz15 === 6, "1.5 oz queue is counted aside, not as 4 oz");
assert(dill.film === 0 && dill.filmHeld === 200000, "film over 100,000 is held");
assert(built.dollarTree.total === 7920, "Dollar Tree units stay on the display");
assert(built.headline.demand === 5040 + 12 + 288 + 72 + 100 + 80, "headline demand keeps every open Target PO");
assert(!built.required.concat(built.covered).some(function (r) { return r.flavor === "BBQ"; }), "Dollar Tree flavor is not a 4 oz row");
var pack = plan.emailPack(built);
assert(pack.plain.indexOf("Attached/below is this week's demand report (week of 11/9).") === 0, "email opens with the week line");
assert(pack.html.indexOf("Production required") >= 0 && pack.html.indexOf("Covered from stock") >= 0 && pack.html.indexOf("Demand by customer") >= 0, "email has the three tables");
assert(pack.plain.indexOf("Excluded Target") < 0 && plan.view(built).indexOf("Excluded Target") < 0, "excluded Target notes are gone");
assert(read("app.js").indexOf("Excluded Target POs") < 0, "order board does not list excluded Target POs");
assert(plan.view(built).indexOf("\u2014") < 0 && plan.view(built).indexOf("\u2013") < 0, "plan view has no em dash");
assert(read("make-plan.js").indexOf("\u2014") < 0 && read("make-plan.js").indexOf("\u2013") < 0, "source has no em dash");
assert(read("app.js").indexOf("function viewMakePlan") >= 0 && read("app.js").indexOf("makePlanCopy") >= 0, "Make Plan is a view and can be copied");
assert(read("app.js").indexOf("async function receive(item, qty, lot, op, meta)") < 0 || read("db.js").indexOf("async function receive(item, qty, lot, op, meta)") >= 0, "receive signature stays in db");
assert(read("make-plan.js").indexOf(".insert(") < 0 && read("make-plan.js").indexOf(".update(") < 0 && read("make-plan.js").indexOf(".delete(") < 0, "plan does not write");
assert(read("dept-homes.js").indexOf('primary: "makeplan"') >= 0, "Demand opens Make Plan");
assert(read("index.html").indexOf("make-plan.js?b=5") >= 0, "script tag");
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

function one(desc, qty, uom, extra) {
  var line = Object.assign({ description: desc, qty: qty, uom: uom, lineNo: "1" }, extra || {});
  return SPS.buildDemand({ partner: "Vistar", po: "PO", orderLines: [line] }, "out")[0];
}
var cashew = one("6/12 4 oz Cashews BBQ Backyard", 93, "Case", { buyerItem: "SMA55478" });
assert(cashew.flavor === "Cashews BBQ" && cashew.flavor_code === "NUTS-BBQ" && cashew.bags === 93 * 72, "cashew BBQ is its own 72-bag case");
assert(cashew.notes.indexOf("[[PACK:cashew]]") >= 0, "cashew pack tag");
var churroSeed = one("6/12 4 oz Seed Sunflower Cinnamon Churro", 25, "Case");
assert(churroSeed.flavor === "Cinnamon Churro" && churroSeed.flavor_code === "S02" && churroSeed.bags === 25 * 72, "seed churro stays seed");
var cashewChurro = one("6/12 4 oz Cashews Cinnamon Churro", 56, "Case", { buyerItem: "SMA55479" });
assert(cashewChurro.flavor === "Cashews Cinnamon Churro" && cashewChurro.bags === 56 * 72, "cashew churro is not seed churro");
var mini = one("6 4 oz Sunflower Mini Bucket Mixed", 284, "Case", { buyerItem: "SMA77037" });
assert(mini.flavor === "Mini Bucket Mixed" && mini.bags === 284 * 24 && mini.notes.indexOf("[[PACK:minibucket]]") >= 0, "mini bucket is 24 per case");
assert(SPS.buildDemand({ partner: "Vistar", po: "PO", orderLines: [{ description: "6 4 oz Sunflower Mini Bucket Mixed", qty: 2, uom: "Case", buyerItem: "SMA77037", lineNo: "1" }] }, "out").length === 1, "mini bucket does not explode");
var candy = one("6/12 4 oz Sunflower Seed Cotton Candy", 149, "Case", { buyerItem: "SMA77039" });
assert(candy.flavor === "Cotton Candy" && candy.flavor_code === "L56" && candy.bags === 149 * 72, "cotton candy is L56 at 72 bags");
var eachLine = one("SMACKIN Sunflower Seeds 4OZ Cinnamon Churro", 648, "Each");
assert(eachLine.flavor === "Cinnamon Churro" && eachLine.bags === 648, "Bass Pro and Target eaches stay eaches");
var kehe = one("Sunflower Seeds Cinnamon Churro Pack : 72", 15, "Case", { pack: 72 });
assert(kehe.flavor === "Cinnamon Churro" && kehe.bags === 15 * 72, "KeHE pack 72 stays 72");
var pizzaSeed = one("6/12 4 oz Seed Sunflower PCA Pizza", 50, "Case");
assert(pizzaSeed.flavor === "PCA Pizza" && pizzaSeed.bags === 50 * 72, "PCA Pizza stays a seed flavor");

var splitPack = plan.build({
  now: NOW,
  lines: [
    { partner: "Vistar", po: "1", flavor: "Cashews BBQ", flavor_code: "NUTS-BBQ", bags: 200, status: "Open", notes: "[[PACK:cashew]]", due_date: "11/19/2026" },
    { partner: "Vistar", po: "1", flavor: "Backyard BBQ", flavor_code: "S03", bags: 100, status: "Open", notes: "[[PACK:seed4]]", due_date: "11/19/2026" },
    { partner: "Vistar", po: "2", flavor: "Mini Bucket Mixed", flavor_code: "SMA77037", bags: 48, status: "Open", notes: "[[PACK:minibucket]]", due_date: "11/19/2026" }
  ],
  items: [
    { id: "BAG4-S03", category: "bag4", flavor: "Backyard BBQ" },
    { id: "NUTS-BBQ", category: "cashews", flavor: "Cashew BBQ", name: "Cashew BBQ" },
    { id: "BKT-STD", category: "bucket", flavor: "Bucket", name: "Bucket - Standard" }
  ],
  stock: [
    { item_id: "BAG4-S03", location: "RECEIVING", qty: 5000 },
    { item_id: "NUTS-BBQ", location: "RACK B", qty: 80 },
    { item_id: "BKT-STD", location: "RECEIVING", qty: 900 }
  ],
  purchaseOrders: []
});
var seedBbq = splitPack.packs[0].required.concat(splitPack.packs[0].covered).filter(function (r) { return r.flavor === "Backyard BBQ"; })[0];
var nutBbq = splitPack.packs[1].required.concat(splitPack.packs[1].covered).filter(function (r) { return r.flavor === "Cashews BBQ"; })[0];
var miniRow = splitPack.packs[2].required.concat(splitPack.packs[2].covered).filter(function (r) { return r.flavor === "Mini Bucket Mixed"; })[0];
assert(seedBbq && seedBbq.onHand === 5000 && seedBbq.toProduce === 0, "seed BBQ keeps bag stock");
assert(nutBbq && nutBbq.onHand === 80 && nutBbq.demand === 200 && nutBbq.toProduce === 120, "cashew need uses NUTS-BBQ only");
assert(miniRow && miniRow.onHand === 0 && miniRow.demand === 48 && miniRow.toProduce === 48, "empty buckets are not mini-bucket stock");
assert(splitPack.headline.demand === 100, "seed headline does not include cashew or mini demand");
var sync = read("supabase/functions/sps-sync/index.js");
assert(sync.indexOf('Deno.env.get("SPS_FOLDER") || "out"') >= 0, "SPS folder default is out");
assert(sync.indexOf('if (f === "testout") f = "out"') >= 0, "a stale testout secret still reads out");
assert(sync.indexOf("MAX_FILES = 30") >= 0 && sync.indexOf("BUDGET_MS = 60000") >= 0, "live folder budget");
assert(sync.indexOf("method: \"DELETE\"") < 0 || sync.indexOf("api.spscommerce.com") >= 0, "SPS list stays a GET");
assert(sync.indexOf("/transactions/v5/data/") >= 0 && sync.indexOf("never deletes or moves") >= 0, "SPS files are not deleted or moved");
assert(sync.indexOf("fetch(url, { headers:") >= 0 && sync.indexOf("fetch(url, { method:") < 0, "SPS list is a GET");

var stagedPlan = plan.build({
  now: NOW,
  lines: [
    { partner: "Target", po: "T1", due_date: "11/09/2026", flavor: "Backyard BBQ", bags: 3600, cases: 50, status: "Open" },
    { partner: "KeHE", po: "K1", due_date: "11/12/2026", flavor: "Backyard BBQ", bags: 2000, cases: 28, status: "Open" }
  ],
  items: [{ id: "BAG4-S03", category: "bag4", flavor: "Backyard BBQ" }],
  stock: [{ item_id: "BAG4-S03", location: "RECEIVING", qty: 1000 }],
  stockBuild: [
    { flavor: "Backyard BBQ", bags: 3600, on_hand: 50, bagsEach: 72, targetStaged: true },
    { flavor: "Backyard BBQ", bags: 720, on_hand: 10, bagsEach: 72 }
  ],
  purchaseOrders: []
});
var bbq = stagedPlan.required.concat(stagedPlan.covered).filter(function (r) { return r.flavor === "Backyard BBQ"; })[0];
assert(bbq && bbq.targetStaged === 3600 && bbq.onHand === 1000 && bbq.toProduce === 1000, "Target staged nets Target demand and loose bags still cover other customers");
assert(stagedPlan.targetStaged.cases === 50, "staged cases stay out of the shared on-hand pool");
assert(plan.view(stagedPlan).indexOf("Target staged") >= 0, "Target staged is its own column");
assert(plan.emailPack(stagedPlan).plain.indexOf("Target staged") >= 0, "email shows Target staged");

var maxDrop = plan.build({
  now: NOW,
  lines: [
    { partner: "Target", po: "T2", due_date: "11/09/2026", flavor: "Ranch", bags: 3600, cases: 50, status: "Open" },
    { partner: "KeHE", po: "K2", due_date: "11/12/2026", flavor: "Ranch", bags: 500, cases: 7, status: "Open" }
  ],
  items: [{ id: "BAG4-S08", category: "bag4", flavor: "Ranch" }],
  stock: [{ item_id: "BAG4-S08", location: "RECEIVING", qty: 10000 }],
  stockBuild: [{ flavor: "Ranch", bags: 3600, on_hand: 50, bagsEach: 72, targetStaged: true }],
  purchaseOrders: []
});
var ranchStaged = maxDrop.required.concat(maxDrop.covered).filter(function (r) { return r.flavor === "Ranch"; })[0];
assert(ranchStaged && ranchStaged.onHand === 10000 && ranchStaged.targetStaged === 3600 && ranchStaged.toProduce === 0, "max() no longer drops Target staged when loose bags are larger");
var mixedAway = plan.dedupeOnHand({ Ranch: { bags: 10000 } }, { Ranch: 3600 });
assert(mixedAway.byFlavor.Ranch.bags === 10000 && mixedAway.byFlavor.Ranch.dropped === 3600, "the old max() would have dropped the smaller Target pile");

var wave = [
  { partner: "Target", po: "10002157898-1", due_date: "11/09/2026", flavor: "Dill Pickle", bags: 5040, cases: 70, status: "Open", load: "ship 11/09/2026 - 11/10/2026" },
  { partner: "Target", po: "10002157898-2", due_date: "11/16/2026", flavor: "Ranch", bags: 720, cases: 10, status: "Open", load: "ship 11/16/2026 - 11/17/2026" },
  { partner: "KeHE", po: "3942350", due_date: "10/7/2026", flavor: "Ranch", bags: 1440, cases: 20, status: "Open", load: "ship 10/07/2026", notes: "[[SPSSTAGE:open]]" },
  { partner: "Target", po: "BOOKED", due_date: "11/02/2026", flavor: "Backyard BBQ", bags: 1440, cases: 20, status: "Open", notes: "New Legend pickup 11/11 9:00 AM MST" },
  { partner: "Target", po: "SHORT", due_date: "10/20/2026", flavor: "Dill Pickle", bags: 7200, cases: 100, status: "Open", load: "ship 10/20/2026 - 10/21/2026" }
];
var states = plan.openDemandStates(wave, {
  today: "2026-11-11",
  stagedCases: 90,
  bookings: plan.bookingsFromOrders([{ customer_po: "BOOKED", appointment: "11/11/2026 9:00 AM MST", notes: "New Legend" }])
});
function posOf(list) { return list.map(function (g) { return g.po; }).sort().join(","); }
assert(posOf(states.awaiting.list) === "10002157898-1,BOOKED", "covered Target POs and booked pickups are awaiting pickup");
assert(posOf(states.past.list) === "3942350,SHORT", "KeHE and uncovered Target POs stay past due");
assert(!states.byPo["10002157898-2"] || states.byPo["10002157898-2"].state === "open", "a future Target wave is not awaiting pickup");
var shipOnly = plan.openDemandStates(wave, { today: "2026-11-11", stagedCases: 0, bookings: {} });
assert(posOf(shipOnly.past.list) === "10002157898-1,3942350,SHORT", "a ship window is not a booked pickup");
assert(posOf(shipOnly.awaiting.list) === "BOOKED", "New Legend pickup text is a booking even when staged cases are zero");
assert(read("app.js").indexOf("Built, awaiting pickup") >= 0, "order board names the awaiting pickup state");
assert(read("data-health.js").indexOf("Built, awaiting pickup") >= 0, "past-due view names the awaiting pickup state");

var keheNote = "On pallet since 9/25; KeHE picking up with PO 4012582 (Daniel Jones email 11/10)";
var heldPlan = plan.build({
  now: NOW,
  lines: [
    { partner: "KeHE", po: "3942350", due_date: "10/7/2026", flavor: "Cinnamon Churro", bags: 720, cases: 10, status: "Open" },
    { partner: "KeHE", po: "3942350", due_date: "10/7/2026", flavor: "Garlic Parmesan", bags: 720, cases: 10, status: "Open" },
    { partner: "KeHE", po: "4012582", due_date: "11/16/2026", flavor: "Cinnamon Churro", bags: 1080, cases: 15, status: "Open" },
    { partner: "Target", po: "T1", due_date: "11/09/2026", flavor: "Backyard BBQ", bags: 3600, cases: 50, status: "Open" }
  ],
  items: [
    { id: "BAG4-S02", category: "bag4", flavor: "Cinnamon Churro" },
    { id: "BAG4-S04", category: "bag4", flavor: "Garlic Parmesan" }
  ],
  stock: [
    { item_id: "BAG4-S02", location: "RECEIVING", qty: 100 },
    { item_id: "BAG4-S04", location: "RECEIVING", qty: 50 }
  ],
  stockBuild: [{ flavor: "Backyard BBQ", bags: 3600, on_hand: 50, bagsEach: 72, targetStaged: true }],
  stagedPos: [{ partner: "KeHE", po: "3942350", pickup_date: "2026-11-19", note: keheNote }],
  purchaseOrders: []
});
var churro = heldPlan.required.concat(heldPlan.covered).filter(function (r) { return r.flavor === "Cinnamon Churro"; })[0];
var garlic = heldPlan.required.concat(heldPlan.covered).filter(function (r) { return r.flavor === "Garlic Parmesan"; })[0];
var heldBbq = heldPlan.required.concat(heldPlan.covered).filter(function (r) { return r.flavor === "Backyard BBQ"; })[0];
assert(churro && churro.demand === 1080 && churro.onHand === 100 && churro.toProduce === 980, "a staged PO is left out of to-produce and is not added to on hand");
assert(!garlic || garlic.demand === 0, "both flavors on the staged PO leave the plan");
assert(heldBbq && heldBbq.targetStaged === 3600 && heldBbq.toProduce === 0, "Target staged stock still nets Target demand");
assert(heldPlan.headline.demand === 1080 + 3600, "headline demand keeps the unmarked PO");
assert(heldPlan.heldPOs.some(function (h) { return h.po === "3942350" && h.bags === 1440 && h.pickup === "2026-11-19"; }), "the staged PO is listed with its pickup");
assert(plan.view(heldPlan).indexOf(keheNote) >= 0, "the staged note is on the plan");
assert(!heldPlan.heldPOs.some(function (h) { return h.po === "4012582"; }), "an unmarked PO stays in the plan");
var marked = plan.openDemandStates([
  { partner: "KeHE", po: "3942350", due_date: "10/7/2026", flavor: "Cinnamon Churro", bags: 720, cases: 10, status: "Open", load: "ship 10/07/2026" },
  { partner: "KeHE", po: "4012582", due_date: "11/16/2026", flavor: "Cinnamon Churro", bags: 1080, cases: 15, status: "Open" },
  { partner: "KeHE", po: "OLD", due_date: "10/1/2026", flavor: "Ranch", bags: 72, cases: 1, status: "Open" }
], { today: "2026-11-11", stagedCases: 0, stagedPos: [{ partner: "KeHE", po: "3942350", pickup_date: "2026-11-19", note: keheNote }] });
assert(marked.past.pos === 1 && marked.past.list[0].po === "OLD", "only an unmarked past-due PO stays past due");
assert(marked.byPo["3942350"].state === "awaiting" && marked.byPo["3942350"].pickup === "2026-11-19", "a marked PO is awaiting pickup on its date");
assert(marked.byPo["4012582"].state === "open", "4012582 is not marked staged");
assert(read("app.js").indexOf("POLINES.canEditCurrent") >= 0, "Order Board uses the PO line editors");
assert(read("db.js").indexOf("POLINES.canEdit") >= 0, "the save refuses anyone who cannot edit PO lines");
assert(read("po-lines.js").indexOf('"troy.dircks@smackinsnacks.com"') >= 0 && read("po-lines.js").indexOf('"michelle.nydegger@smackinsnacks.com"') >= 0 && read("po-lines.js").indexOf('"mattb@smackinsnacks.com"') >= 0, "the same three editors remain");
var stageSql = read("supabase/migrations/20261111150000_demand_po_stage.sql");
assert(stageSql.indexOf("3942350") >= 0 && stageSql.indexOf("2026-11-19") >= 0 && stageSql.indexOf(keheNote) >= 0, "KeHE 3942350 is seeded staged");
assert(stageSql.indexOf("'4012582'") < 0, "4012582 is not stored as a staged PO");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("make plan ok");

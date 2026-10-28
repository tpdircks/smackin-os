/* Checks batch-record math and Lot Trace prefill. No network, no sample sheets. */
var br = require("../batch-record.js");
var assert = require("assert");

global.TRACE = {
  flavors: [
    { code: "S02", name: "Cinnamon Churro", alg: "A2", algTxt: "Milk" },
    { code: "S05", name: "Dill Pickle", alg: "A1", algTxt: "" },
    { code: "S09", name: "Maple Brown Sugar", alg: "A2", algTxt: "Milk" }
  ]
};

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg + " (got " + actual + ", expected " + expected + ")");
}

var recipe = { code: "S09", name: "Maple Brown Sugar", seas_lbs: 7, seas_desc: "7 lbs Buttery Maple", seed_type: "Low Salt", malto_lbs: 3, wip_lbs_per_batch: 7.5, wip_malt_lbs: 2 };
var flavor = global.TRACE.flavors[2];
var rows = br.referenceIngredients(recipe, flavor);
eq(rows[0].formula_lbs, "100", "seed reference weight");
eq(rows[0].formula_src, "reference", "seed marked reference");
eq(rows[1].formula_lbs, "7", "seasoning reference weight");
eq(rows[1].allergen, "Milk", "seasoning allergen from flavor");
eq(br.wipNote(rows[1].formula_lbs, rows[1].wip_lbs), "7.5", "WIP note when the sheet differs");
eq(br.wipNote("3", "2.9"), "", "small WIP gap stays quiet");
eq(br.wipNote(rows[2].formula_lbs, rows[2].wip_lbs), "2", "malt WIP note");

var rec = {
  ingredients: [{ key: "seed", cells: [{ text: "100" }, { text: "JD" }, { text: "50.5" }, { text: "" }] }],
  rework: { used: [{ weight: "2.5" }, { weight: "" }, { weight: "initials" }] },
  disposed: [{ lbs: "1" }, { lbs: "" }]
};
var totals = br.computeTotals(rec);
eq(totals.produced, 150.5, "produced adds plain numbers on the seed row");
eq(totals.rework_added, 2.5, "rework added");
eq(totals.disposed, 1, "disposed");
eq(totals.traceable, 152, "traceable = produced + rework added - disposed");

var day = "2026-10-28";
var labels = {
  "RM1": { lpn: "RM1", kind: "RM", mtype: "SEED", supplier_lot: "SEED-1", item: "Seed" },
  "RM2": { lpn: "RM2", kind: "RM", mtype: "SEAS", supplier_lot: "SEA-9", flavor_code: "S02", item: "Cinnamon" },
  "RM3": { lpn: "RM3", kind: "RM", mtype: "SEAS", supplier_lot: "SEA-8", flavor_code: "S02", item: "Cinnamon" },
  "RM4": { lpn: "RM4", kind: "RM", mtype: "MALTO", supplier_lot: "MAL-1", item: "Malto" },
  "BN1": { lpn: "BN1", kind: "BN", flavor_code: "S02", lot: "S02/3X", created_by: "Sam Lee", created_at: "2026-10-28T15:00:00Z", data: { date: day, mixer: "2" }, parents: ["RM1", "RM2", "RM4"] },
  "BN2": { lpn: "BN2", kind: "BN", flavor_code: "S05", lot: "OTHER", created_at: "2026-10-28T16:00:00Z", data: { date: day }, parents: ["RM1"] },
  "FILM1": { lpn: "FILM1", kind: "RM", mtype: "FILM", supplier_lot: "FILM-A", flavor_code: "S02", flavor: "Cinnamon Churro" },
  "FILM2": { lpn: "FILM2", kind: "RM", mtype: "FILM", supplier_lot: "FILM-B", flavor_code: "S05", flavor: "Dill Pickle" }
};
var events = [
  { type: "CONSUME", lpn: "RM1", ref: "S02/3X", qty: 100, lot: "SEED-1" },
  { type: "CONSUME", lpn: "RM2", ref: "S02/3X", qty: 8.5, lot: "SEA-9" },
  { type: "CONSUME", lpn: "RM3", ref: "S02/3X", qty: 1, lot: "SEA-8" },
  { type: "FILM_ON", lpn: "FILM1", lot: "FILM-A", ts: "2026-10-28T18:00:00Z" },
  { type: "FILM_ON", lpn: "FILM2", lot: "FILM-B", ts: "2026-10-28T18:05:00Z" },
  { type: "MIX", lpn: "BN2", lot: "OTHER", ts: "2026-10-28T16:00:00Z" }
];
var base = br.referenceIngredients({ code: "S02", seas_lbs: 8.5, seas_desc: "8.5 lbs Cinnamon Churro", malto_lbs: 3, seed_type: "Low Salt" }, global.TRACE.flavors[0]);
var scan = br.applyScans(base, "S02", day, labels, events);
eq(scan.batches.length, 1, "one batch column from this flavor");
eq(scan.batches[0].code, "S02/3X", "batch code from the bin");
eq(scan.batches[0].code_src, "scanned", "batch code marked scanned");
eq(scan.batches[0].initials, "SL", "initials from the operator name");
eq(scan.batches[0].initials_src, "scanned", "initials marked scanned");
eq(scan.ingredients[0].lot, "SEED-1", "seed lot from the scan");
eq(scan.ingredients[0].lot_src, "scanned", "seed lot marked scanned");
eq(scan.ingredients[0].cells[0].text, "100", "seed pounds from the consume event");
eq(scan.ingredients[0].cells[0].src, "scanned", "seed cell marked scanned");
eq(scan.ingredients[1].lot, "SEA-9", "first seasoning lot");
eq(scan.ingredients[1].lot_2, "SEA-8", "second seasoning lot");
eq(scan.ingredients[1].cells[0].text, "9.5", "seasoning pounds summed");
eq(scan.film_lots[0], "FILM-A", "matching film lot kept");
eq(scan.film_skipped.length, 1, "other film is not filled in");
eq(scan.film_skipped[0].lot, "FILM-B", "skipped film lot");
eq(br.padBatches(scan.batches).length, 10, "blank form still has 10 batch columns");

var empty = br.applyScans(base, "S02", "2020-01-01", labels, events);
eq(empty.batches.length, 0, "no scans means no invented batches");
eq(empty.ingredients[0].lot, "", "no invented lot");
eq(empty.scanned, 0, "empty day is not a historical record");

var warns = br.filmWarnings(global.TRACE.flavors[0], { film_lots: ["FILM-B"], film_flavor: "Dill", carton_flavor: "S02" }, labels, scan.film_skipped);
assert.ok(warns.some(function (w) { return w.text.indexOf("FILM-B") >= 0 && w.text.indexOf("Dill Pickle") >= 0; }), "film lot mismatch");
assert.ok(warns.some(function (w) { return w.text.indexOf("Film verification") >= 0; }), "typed film flavor mismatch");
assert.ok(!warns.some(function (w) { return w.text.indexOf("Carton verification") >= 0; }), "matching carton flavor stays quiet");
var ok = br.filmWarnings(global.TRACE.flavors[0], { film_lots: ["FILM-A"], film_flavor: "Cinnamon Churro", carton_flavor: "" }, labels, []);
eq(ok.length, 0, "matching film has no warning");

console.log("batch-record checks ok");

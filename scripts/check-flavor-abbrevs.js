#!/usr/bin/env node
/* Distributor abbreviations must resolve to the same flavors as the full names.
   Demand CSV parse, SPS document map, and the Order Board re-map use one rule list.
   No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function same(a, b, msg) { if (a !== b) fail.push(msg + " (" + a + " !== " + b + ")"); }

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var SPS = require("../sps-map.js");

var demandCtx = { window: {}, console: console };
demandCtx.window = demandCtx;
vm.createContext(demandCtx);
vm.runInContext(read("demand.js"), demandCtx, { filename: "demand.js" });
var DEMAND = demandCtx.DEMAND;

// Descriptions that were landing unmapped (verified 2026-10-30), plus the
// whole-word tokens those lines abbreviate. Canonical flavor spelling matches
// FLAVOR_CODES ("Cheddar Jalapeno", "OG Original").
var ABBREV = [
  ["SUNFLOWER SEED CRCKD PEPPR 4OZ", "Cracked Pepper", "S06"],
  ["CRCKD PEPPER", "Cracked Pepper", "S06"],
  ["CRCKD PEPPR", "Cracked Pepper", "S06"],
  ["CRCKD-PEPPR", "Cracked Pepper", "S06"],
  ["CRK", "Cracked Pepper", "S06"],
  ["PEPPR", "Cracked Pepper", "S06"],
  ["SMACKN GRL PRM SNFLWR SDS", "Garlic Parmesan", "S04"],
  ["GRL", "Garlic Parmesan", "S04"],
  ["PRM", "Garlic Parmesan", "S04"],
  ["CHED/JALA", "Cheddar Jalapeno", "S07"],
  ["CHED JLP", "Cheddar Jalapeno", "S07"],
  ["CHDR JAL", "Cheddar Jalapeno", "S07"],
  ["CHED JALA", "Cheddar Jalapeno", "S07"],
  ["CHED", "Cheddar Jalapeno", "S07"],
  ["CHDR", "Cheddar Jalapeno", "S07"],
  ["JALA", "Cheddar Jalapeno", "S07"],
  ["JAL", "Cheddar Jalapeno", "S07"],
  ["JLP", "Cheddar Jalapeno", "S07"],
  ["SNFL RNCH 4Z", "Ranch", "S08"],
  ["RNCH", "Ranch", "S08"],
  ["MPLE BRWN SUG", "Maple Brown Sugar", "S09"],
  ["MPLE", "Maple Brown Sugar", "S09"],
  ["BRWN SUG", "Maple Brown Sugar", "S09"],
  ["BRWN SUGAR", "Maple Brown Sugar", "S09"],
  ["ORIG", "OG Original", "S01"]
];

// Existing full names and older abbreviations. ORIG is last, so a description
// that also contains ORIG keeps the more specific flavor.
var STILL = [
  ["LEMON PEPPER", "Lemon Pepper", "S10"],
  ["LEMON PEP", "Lemon Pepper", "S10"],
  ["LEMON PEPPER ORIG", "Lemon Pepper", "S10"],
  ["DILL PICKLE", "Dill Pickle", "S05"],
  ["DLL PCKL", "Dill Pickle", "S05"],
  ["PICKLE", "Dill Pickle", "S05"],
  ["DILL PICKLE ORIG", "Dill Pickle", "S05"],
  ["BBQ", "Backyard BBQ", "S03"],
  ["BACKYARD BBQ", "Backyard BBQ", "S03"],
  ["BARBEQUE", "Backyard BBQ", "S03"],
  ["BYRD", "Backyard BBQ", "S03"],
  ["BACKYARD BBQ ORIG", "Backyard BBQ", "S03"],
  ["GARLIC PARMESAN", "Garlic Parmesan", "S04"],
  ["GRLC PRMSN", "Garlic Parmesan", "S04"],
  ["GRLC", "Garlic Parmesan", "S04"],
  ["PRMSN", "Garlic Parmesan", "S04"],
  ["CRACKED PEPPER", "Cracked Pepper", "S06"],
  ["CRCK PEP", "Cracked Pepper", "S06"],
  ["BLACK PEPPER", "Cracked Pepper", "S06"],
  ["CHEDDAR JALAPENO", "Cheddar Jalapeno", "S07"],
  ["JALAPENO", "Cheddar Jalapeno", "S07"],
  ["CHD", "Cheddar Jalapeno", "S07"],
  ["RANCH", "Ranch", "S08"],
  ["RANCH ORIG", "Ranch", "S08"],
  ["MAPLE BROWN SUGAR", "Maple Brown Sugar", "S09"],
  ["MAPLE", "Maple Brown Sugar", "S09"],
  ["BROWN SUGAR", "Maple Brown Sugar", "S09"],
  ["MAPLE BROWN SUGAR ORIG", "Maple Brown Sugar", "S09"],
  ["ORIGINAL", "OG Original", "S01"],
  ["OG", "OG Original", "S01"],
  ["THE OG", "OG Original", "S01"],
  ["CINNAMON CHURRO", "Cinnamon Churro", "S02"],
  ["SOUR CREAM & ONION", "Sour Cream & Onion", "S11"],
  ["CHEESEBURGER", "Cheeseburger", "L25"]
];

var UNMAPPED = ["SUNFLOWER SEED 4OZ", "PEPPER", "PEP", "PLAIN SEEDS"];

function demandParsed(items) {
  var lines = ["PO Number,Record Type,Qty Ordered,Unit of Measure,Vendor Style,Product/Item Description,Partner", "PO9,H,1,CA,,,KeHE"];
  items.forEach(function (it) {
    lines.push(["PO9", "D", "2", "CA", it.style || "", it.desc, "KeHE"].join(","));
  });
  return DEMAND.parseSPS(lines.join("\n"));
}

function demandHit(parsed, desc) {
  var hits = parsed.lines.filter(function (l) { return l.desc === desc; });
  return hits.length ? hits[0] : null;
}

function spsHit(desc) {
  var rows = SPS.buildDemand({
    partner: "KeHE",
    po: "PO1",
    orderLines: [{ description: desc, qty: 2, uom: "CA", lineNo: "1" }]
  }, "testout");
  return rows[0];
}

function expectMapped(list, label) {
  var parsed = demandParsed(list.map(function (row) { return { desc: row[0] }; }));
  list.forEach(function (row) {
    var desc = row[0], flavor = row[1], code = row[2];
    var d = demandHit(parsed, desc);
    var s = spsHit(desc);
    eq(!!d, label + " demand line " + desc);
    if (d) {
      same(d.flavor, flavor, label + " demand " + desc);
      same(d.flavor_code, code, label + " demand code " + desc);
    }
    same(s.flavor, flavor, label + " sps " + desc);
    same(s.flavor_code, code, label + " sps code " + desc);
    eq(parsed.warnings.join("\n").indexOf(desc) < 0, label + " demand warning " + desc);
  });
}

expectMapped(ABBREV, "abbrev");
expectMapped(STILL, "still");

var plain = demandParsed(UNMAPPED.map(function (desc) { return { desc: desc }; }));
UNMAPPED.forEach(function (desc) {
  var d = demandHit(plain, desc);
  var s = spsHit(desc);
  same(d && d.flavor, "UNMAPPED: " + desc, "demand stays unmapped " + desc);
  same(d && d.flavor_code, "", "demand unmapped code " + desc);
  same(s.flavor, "UNMAPPED: " + desc, "sps stays unmapped " + desc);
  same(s.flavor_code, "", "sps unmapped code " + desc);
});

// Vendor style still wins over a description token. ORIG must not override it.
var styled = demandParsed([
  { desc: "ORIG", style: "110" },
  { desc: "ORIG", style: "103" },
  { desc: "RNCH", style: "106" },
  { desc: "LEMON PEPPER", style: "105" }
]);
same(styled.lines[0].flavor, "Lemon Pepper", "style 110 beats ORIG");
same(styled.lines[0].flavor_code, "S10", "style 110 code");
same(styled.lines[1].flavor, "Backyard BBQ", "style 103 beats ORIG");
same(styled.lines[2].flavor, "OG Original", "style 106 beats RNCH");
same(styled.lines[2].flavor_code, "S01", "style 106 code");
same(styled.lines[3].flavor, "Cracked Pepper", "style 105 beats lemon text");

var varietyDesc = "SEEDS SUNFLWR 4VAR 48PC";
var variety = demandParsed([{ desc: varietyDesc }]);
same(variety.lines[0].flavor, "Variety Pack", "4VAR demand pack");
same(variety.lines[0].flavor_code, "VP48", "4VAR demand code");
eq(variety.lines.length === 5, "4VAR explodes to pack plus 4 flavors");
var spsVariety = SPS.buildDemand({
  partner: "KeHE", po: "PO1",
  orderLines: [{ description: varietyDesc, qty: 1, uom: "CA", lineNo: "1" }]
}, "testout");
same(spsVariety[0].flavor, "Variety Pack", "4VAR sps pack");
eq(spsVariety.length === 5, "4VAR sps components");

// Whole-word guards: the short token must not match the longer abbreviation.
eq(!/\bgrl\b/i.test("GRLC"), "GRL does not match GRLC");
eq(!/\bprm\b/i.test("PRMSN"), "PRM does not match PRMSN");
eq(!/\bcrck\b/i.test("CRCKD"), "CRCK does not match CRCKD");
eq(!/\bpeppr\b/i.test("LEMON PEPPER"), "PEPPR does not match PEPPER");
eq(!/\borig\b/i.test("ORIGINAL"), "ORIG does not match ORIGINAL");
eq(!/\bjala?\b/i.test("JALAPENO"), "JALA does not match JALAPENO");

// Order Board re-map uses the same abbreviations on rows already stored as UNMAPPED.
var store = {};
var dbCtx = {
  window: {},
  console: console,
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  document: { visibilityState: "visible", addEventListener: function () {} }
};
dbCtx.window = dbCtx;
vm.createContext(dbCtx);
vm.runInContext(read("db.js"), dbCtx, { filename: "db.js" });
var DB = dbCtx.DB;

var remapCases = ABBREV.concat(STILL).concat(UNMAPPED.map(function (desc) { return [desc, "UNMAPPED: " + desc]; }));
DB.importDemand(remapCases.map(function (row, i) {
  return {
    source: "SPS", partner: "KeHE", po: "AB" + i,
    flavor: "UNMAPPED: " + row[0], notes: row[0],
    qty: 1, cases: 1, bags: 72, uom: "CA"
  };
}), { batch_id: "abbrev" }, "test").then(function () {
  return DB.remapDemandFlavors("test");
}).then(function (res) {
  var byNotes = {};
  DB.demandLines().forEach(function (line) { byNotes[line.notes] = line.flavor; });
  remapCases.forEach(function (row) {
    same(byNotes[row[0]], row[1], "remap " + row[0]);
  });
  var expectFixed = remapCases.length - UNMAPPED.length;
  same(res.fixed, expectFixed, "remap fixed count");
  same(res.scanned, remapCases.length, "remap scanned count");

  var html = read("index.html");
  var sw = read("service-worker.js");
  var sync = read("supabase/functions/sps-sync/index.js");
  eq(html.indexOf('src="demand.js?b=3"') >= 0, "demand cache bust");
  eq(html.indexOf('src="sps-map.js?b=4"') >= 0, "sps-map cache bust");
  eq(html.indexOf('src="db.js?b=93"') >= 0, "db cache bust");
  eq(sw.indexOf('const CACHE = "smackin-inv-v253"') >= 0, "cache v253");
  eq(sw.indexOf("smackin-inv-v252") < 0, "old cache gone");
  eq(sync.indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "SPS_FOLDER default stays testout");
  eq(read("app.js").indexOf("\\bcrckd\\b") < 0, "app.js flavor rules untouched");

  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("ok", ABBREV.length, "abbreviations,", STILL.length, "existing flavors");
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});

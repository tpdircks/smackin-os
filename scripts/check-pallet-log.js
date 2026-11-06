/* Pallet log flavor list (Fulfillment -> Pallet log).
   Cotton Candy uses lot code L56. seed-data.js still has an older internal
   bag code L19 named Cotton Candy; the lot master uses L19 for Honey Sriracha.
   Mini Buckets follow the baby-bucket 6-count box.
   Cashew masters: CASH-CIN follows SS-CASH-CIN (Cinnamon Churro Cashews) and
   CASH-BBQ follows SS-CASH-BBQ (BBQ Cashews). Both 12pk and 6pk masters are
   72 bags, so each flavor is one option. Cashew Bucket has no flavor SKU.
   CASH at 6 per case stays in the legacy map for old rows and is not selectable. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var app = read("app.js");
var m = app.match(/const PROD_FLAVORS = (\[[\s\S]*?\n  \]);/);
var legacy = app.match(/const PROD_FLAVOR_LEGACY = (\[[\s\S]*?\n  \]);/);
eq(!!m, "PROD_FLAVORS block");
eq(!!legacy, "PROD_FLAVOR_LEGACY block");
var flavors = m ? vm.runInNewContext("(" + m[1] + ")") : [];
var old = legacy ? vm.runInNewContext("(" + legacy[1] + ")") : [];
var by = {};
flavors.forEach(function (f) { by[f.code] = f; });
var legacyBy = {};
old.forEach(function (f) { legacyBy[f.code] = f; });

var kept = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11",
  "WM-S02", "WM-S03", "WM-S04", "WM-S07", "DISP", "BUCK", "CAMO", "L20", "L21", "L38", "L34"];
kept.forEach(function (code) { eq(!!by[code], "kept " + code); });
eq(by.S01 && by.S01.name === "OG Original" && by.S01.bpc === 72, "S01 unchanged");
eq(by.BUCK && by.BUCK.bpc === 54, "bucket pack unchanged");
eq(by["WM-S02"] && by["WM-S02"].name === "WM Cinnamon Churro (12pk)" && by["WM-S02"].bpc === 12, "walmart churro");
eq(by["WM-S03"] && by["WM-S03"].bpc === 12, "walmart bbq");
eq(by["WM-S04"] && by["WM-S04"].bpc === 12, "walmart garlic");
eq(by["WM-S07"] && by["WM-S07"].bpc === 12, "walmart cheddar");

eq(by.L56 && by.L56.name === "Cotton Candy" && by.L56.bpc === 72, "cotton candy");
eq(by.MINI && by.MINI.name === "Mini Buckets" && by.MINI.bpc === 6, "mini buckets");
eq(!by.CASH, "single Cashews option is not selectable");
eq(!by.L19, "pallet log does not use L19 for Cotton Candy");
eq(legacyBy.CASH && legacyBy.CASH.name === "Cashews" && legacyBy.CASH.bpc === 6, "old CASH rows keep 6 per case");

eq(by["CASH-CIN"] && by["CASH-CIN"].name === "Cashew Cinnamon master (12pk/6pk)" && by["CASH-CIN"].bpc === 72, "cashew cinnamon master");
eq(by["CASH-BBQ"] && by["CASH-BBQ"].name === "Cashew BBQ master (12pk/6pk)" && by["CASH-BBQ"].bpc === 72, "cashew bbq master");
eq(by["CASH-BKT"] && by["CASH-BKT"].name === "Cashew Bucket" && by["CASH-BKT"].bpc === 24, "cashew bucket");

["KR-S02", "KR-S03", "KR-S04", "KR-S07"].forEach(function (code) {
  eq(by[code] && by[code].bpc === 12 && by[code].name.indexOf("Kroger ") === 0 && by[code].name.indexOf("(12pk)") > 0, code);
});
eq(by["KR-S02"].name === "Kroger Cinnamon Churro (12pk)", "kroger churro label");
eq(by["KR-S03"].name === "Kroger Backyard BBQ (12pk)", "kroger bbq label");
eq(by["KR-S04"].name === "Kroger Garlic Parmesan (12pk)", "kroger garlic label");
eq(by["KR-S07"].name === "Kroger Cheddar Jalapeno (12pk)", "kroger cheddar label");

var codes = flavors.map(function (f) { return f.code; });
eq(codes.length === new Set(codes).size, "codes unique");
eq(codes.indexOf("CASH") < 0, "CASH is not a flavor option");
eq(codes.indexOf("WM-S07") < codes.indexOf("KR-S02"), "kroger follows walmart");
eq(codes.indexOf("KR-S07") < codes.indexOf("DISP"), "kroger stays with the 12pk block");
eq(codes.indexOf("CASH-CIN") < codes.indexOf("CASH-BBQ") && codes.indexOf("CASH-BBQ") < codes.indexOf("CASH-BKT"), "cashew order");

["Cotton Candy", "Mini Buckets", "Cashew Cinnamon master (12pk/6pk)", "Cashew BBQ master (12pk/6pk)", "Cashew Bucket", "Kroger Cinnamon Churro (12pk)", "Kroger Backyard BBQ (12pk)", "Kroger Garlic Parmesan (12pk)", "Kroger Cheddar Jalapeno (12pk)"].forEach(function (name) {
  eq(name.indexOf("\u2014") < 0 && name.indexOf("\u2013") < 0, "no dash in " + name);
});

eq(app.indexOf("const fopts = PROD_FLAVORS.map") >= 0, "add pallet uses the current list");
eq(app.indexOf("const qcOpts = PROD_FLAVORS.map") >= 0, "quick log uses the current list");
eq(app.indexOf('value="MASTER"') >= 0, "master note default stays");
eq(app.indexOf('flavor_code: g("pl-flavor")') >= 0, "new rows still store the selected code");
eq(app.indexOf("DB.deleteProdPallet") >= 0, "single-row delete stays");
eq(app.indexOf("PROD_FLAVOR_LEGACY.forEach") >= 0, "legacy codes stay readable");

var sw = read("service-worker.js");
var html = read("index.html");
eq(sw.indexOf('const CACHE = "smackin-inv-v293"') >= 0, "cache");
eq(html.indexOf("app.js?b=207") >= 0, "app bust");
eq(read("build-id.txt").trim() === "smackin-inv-v293", "build id");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("pallet log ok");

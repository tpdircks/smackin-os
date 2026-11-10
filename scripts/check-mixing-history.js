#!/usr/bin/env node
/* Mixing history keeps every Mixing row and does not add packages into bins. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var model = require(path.join(root, "mfg-history-model.js"));
var src = read("mfg-history.js");
var html = read("index.html");

eq(src.indexOf("unionMixing") >= 0 && src.indexOf("partitionPmac") >= 0, "view uses the model");
eq(src.indexOf("MX = res[1]") < 0, "mixing is not the tracker table alone");
eq(html.indexOf("mfg-history-model.js?b=1") >= 0 && html.indexOf("mfg-history.js?b=7") > html.indexOf("mfg-history-model.js"), "script order");
eq(src.indexOf("\u2014") < 0 && read("mfg-history-model.js").indexOf("\u2014") < 0, "no em dash");

eq(model.deptKind("Mixing") === "mixing", "Mixing");
eq(model.deptKind("P.Mac") === "pmac" && model.deptKind("PMAC") === "pmac" && model.deptKind("P-mac") === "pmac", "P-Mac spellings");
eq(model.deptKind("") === "pmac", "blank dept stays packaging");
eq(model.deptKind("Not Found") === "other" && model.deptKind("Tech") === "other", "other depts");

var parts = model.partitionPmac([
  { dept: "P-Mac", run_date: "2026-11-03" },
  { dept: "P.Mac", run_date: "2026-11-03" },
  { dept: "Not Found", run_date: "2026-10-09" },
  { dept: "Mixing", run_date: "2026-10-13" }
]);
eq(parts.pmac.length === 2 && parts.other.length === 1 && parts.mixing.length === 1, "partition");
eq(parts.pmac.concat(parts.other).every(function (r) { return model.deptKind(r.dept) !== "mixing"; }), "pmac side excludes mixing");

var history = [];
for (var i = 0; i < 1161; i++) {
  history.push({ run_date: "2026-09-29", operator: "Darwin Z", flavor_code: "S03", machine: "M6", total_bins: 15 });
}
var detail = [];
for (var j = 0; j < 365; j++) {
  detail.push({
    run_date: j < 7 ? "2026-10-13" : "2026-09-30",
    dept: "Mixing",
    operator: "Luis H.",
    flavor_code: "S07",
    machine: String(40 + (j % 5)),
    total_pkgs: 1000 + j,
    box_count: 10 + (j % 20),
    bag_size: "4.0"
  });
}
var mixed = model.unionMixing(history, detail);
eq(mixed.length === 1161 + 365, "census shapes do not collapse " + mixed.length);
var sum = model.summarizeMixing(mixed);
eq(sum.binRuns === 1161 && sum.pkgRuns === 365, "bins and packages stay separate runs");
eq(sum.bins === 1161 * 15, "bin total ignores packages");
eq(sum.packages === detail.reduce(function (n, r) { return n + r.total_pkgs; }, 0), "package total ignores bins");
var octBins = model.volumeByMonth(mixed, "bins").filter(function (r) { return r.k === "2026-10"; });
eq(octBins.length === 0, "October packages are not plotted as bins");

var dup = model.unionMixing(
  [{ run_date: "2026-09-29", operator: "Luis H.", flavor_code: "S07", machine: "47", total_bins: 41 }],
  [{ run_date: "2026-09-29", dept: "Mixing", operator: "Luis H.", flavor_code: "S07", machine: "47", total_pkgs: 41, box_count: 1 }]
);
eq(dup.length === 1 && dup[0].unit === "bins", "same quantity on the same run is one row");

var keep = model.unionMixing(
  [{ run_date: "2026-10-13", operator: "Luis H.", flavor_code: "S07", machine: "M5", total_bins: 41 }],
  [{ run_date: "2026-10-13", dept: "Mixing", operator: "Luis H.", flavor_code: "S07", machine: "47", total_pkgs: 4100, box_count: 41 }]
);
eq(keep.length === 2, "same date and flavor with a different machine stays");
eq(keep.some(function (r) { return r.unit === "packages" && r.total_pkgs === 4100; }), "package row kept when only box count matches a bin count");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok mixing history");

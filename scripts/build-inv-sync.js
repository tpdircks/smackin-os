#!/usr/bin/env node
/* Build the next Adriana inventory sync.
   Lot-tracked raw materials are included by default: seasoning, seed,
   maltodextrin, oil, and stevia are written per lot. They are not left
   out of the pass. Usage:
     node scripts/build-inv-sync.js
     node scripts/build-inv-sync.js --date 2026-11-19 --lots data/lots.json --csv data/recon.csv --out inv-sync-1119.js
   The written module calls INV_LOT_PLAN.planAll. A future count drops in
   a lot file and a reconciliation csv, then this generator stamps the module. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");

function arg(name, fallback) {
  var i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8")); }

function csvRows(rel) {
  var text = fs.readFileSync(path.join(root, rel), "utf8").replace(/^\uFEFF/, "");
  var rows = [];
  var i = 0;
  var field = "";
  var row = [];
  var quoted = false;
  function pushField() { row.push(field); field = ""; }
  function pushRow() { rows.push(row); row = []; }
  while (i < text.length) {
    var c = text.charAt(i);
    if (quoted) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text.charAt(i + 1) === "\n") i++;
      pushField(); pushRow(); i++; continue;
    }
    field += c; i++;
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  var head = rows.shift() || [];
  return rows.filter(function (r) { return r.length && r.join("").trim(); }).map(function (r) {
    var o = {};
    head.forEach(function (h, n) { o[h] = r[n] == null ? "" : r[n]; });
    return o;
  });
}

var date = arg("--date", "2026-11-05");
var lotsPath = arg("--lots", "data/adriana-lots-2026-11-05.json");
var csvPath = arg("--csv", "data/adriana-2026-11-05-reconciliation.csv");
var stamp = date.slice(5, 7) + date.slice(8, 10);
var outName = arg("--out", "inv-sync-template.js");
if (outName === "inv-sync-1105.js" || outName === "inv-sync-1102.js" || outName === "inv-sync-packaging-1102.js") {
  console.error("refusing to overwrite a historical sync module");
  process.exit(1);
}
var plan = require(path.join(root, "inv-lot-plan.js"));
var lots = readJson(lotsPath);
var parsed = plan.aggregatesFromCsv(csvRows(csvPath));
var latest = {
  sheet: "Inventory SLC 2026",
  countDate: date,
  sheetAsOf: new Date(Date.parse(date + "T07:00:00.000Z") + 86400000).toISOString(),
  today: "2026-11-06",
  source: "Inventory SLC 2026. Newest block on the seasoning, seed, warehouse, bag, and film tabs is " + date + ".",
  lots: lots,
  aggregates: parsed.rows,
  info: parsed.info
};
var latestPath = path.join(root, "data", "adriana-latest.json");
fs.writeFileSync(latestPath, JSON.stringify(latest));
var browser = "window.ADRIANA_LATEST = " + JSON.stringify(latest) + ";\n";
fs.writeFileSync(path.join(root, "adriana-latest.js"), browser);

var template = [
  "/* inv-sync-" + stamp + ".js",
  "   One cloud pass for Adriana's count " + date + ".",
  "   Lot-tracked raw materials are applied per lot (LOT_ROWS): seasoning,",
  "   seed, maltodextrin, oil, and stevia. Quantity, lot, expiration, and",
  "   location are set from the sheet. Expired lots go to QUARANTINE.",
  "   A missing COA stays on QA-HOLD. A line over 100,000 is held.",
  "   A row edited after the sheet time is reported and left alone.",
  "   The pass writes a visible report. It does not finish quietly. */",
  "(function (root) {",
  "  \"use strict\";",
  "  var COUNT_DATE = \"" + date + "\";",
  "  var LOT_ROWS = true;",
  "  var NOTE = root.INV_LOT_PLAN ? root.INV_LOT_PLAN.OPERATOR : \"inventory sync from Adriana count " + date + "\";",
  "  function latest() { return root.ADRIANA_LATEST || null; }",
  "  function plan(stock, items, today) {",
  "    if (!root.INV_LOT_PLAN || !latest()) return null;",
  "    return root.INV_LOT_PLAN.planAll(latest(), stock, items, { today: today });",
  "  }",
  "  var api = { COUNT_DATE: COUNT_DATE, LOT_ROWS: LOT_ROWS, NOTE: NOTE, plan: plan, latest: latest };",
  "  if (typeof module !== \"undefined\" && module.exports && (typeof root === \"undefined\" || !root.document)) { module.exports = api; return; }",
  "  root.INV_SYNC_LATEST = api;",
  "})(typeof window !== \"undefined\" ? window : globalThis);",
  ""
].join("\n");

if (outName === "inv-sync-1105.js") {
  console.error("refusing to overwrite the historical 11/05 module");
  process.exit(1);
}
fs.writeFileSync(path.join(root, outName), template);
console.log("wrote " + outName + " lots " + lots.length + " aggregates " + parsed.rows.length);

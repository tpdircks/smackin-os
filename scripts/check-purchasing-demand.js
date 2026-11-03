#!/usr/bin/env node
/* Purchasing reorder counts Open demand lines only. No network, no stock writes. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function same(a, b, msg) { if (a !== b) fail.push(msg + " (" + a + " !== " + b + ")"); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var store = {};
var lines = [
  { flavor: "Backyard BBQ", bags: 100, status: "Open" },
  { flavor: "backyard bbq", bags: 20, status: "Open", notes: "[[SPSSTAGE:ack-accepted]] Ack Accepted" },
  { flavor: "Backyard-BBQ", bags: 15, status: "Open", notes: "[[SPSSTAGE:asn-accepted]] ASN Accepted" },
  { flavor: "Backyard BBQ", bags: 8, status: "Open", notes: "[[SPSSTAGE:invoice-pending]] Invoice Accepted" },
  { flavor: "Backyard BBQ", bags: 7 },
  { flavor: "Backyard BBQ", bags: "4", status: "Open" },
  { flavor: "Backyard BBQ", bags: 202000, status: "Complete" },
  { flavor: "Backyard BBQ", bags: 58000, status: "Shipped" },
  { flavor: "Backyard BBQ", bags: 9, status: "Test" },
  { flavor: "Dill Pickle", bags: 50, status: "Complete" },
  { flavor: "Cracked Pepper", bags: 0, status: "Open" }
];
store.smackin_inv_app_v1 = JSON.stringify({
  items: [], suppliers: [], stock: [], pos: [], log: [],
  demandLines: lines,
  ecomDemand: [
    { flavor: "Backyard BBQ", bags: 9999, avg_day: 3 },
    { flavor: "Dill Pickle", bags: 10, avg_day: 1 }
  ]
});

var ctx = {
  console: console,
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  document: { visibilityState: "visible", addEventListener: function () {} }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read("db.js"), ctx, { filename: "db.js" });
var DB = ctx.DB;

DB.init().then(function () {
  // 100 + 20 ack + 15 ASN + 8 invoice-accepted-still-open + 7 blank + 4 = 154
  same(DB.flavorDemandBags("Backyard BBQ"), 154, "open bags only");
  same(DB.flavorDemandBags("backyard-bbq"), 154, "flavor match ignores punctuation");
  same(DB.flavorDemandBags("Dill Pickle"), 0, "complete-only flavor is zero");
  same(DB.flavorDemandBags("Cracked Pepper"), 0, "zero open bags stay zero");
  same(DB.flavorDemandBags("Missing"), 0, "unknown flavor is zero");

  var bbq = DB.unifiedDemand("Backyard BBQ");
  same(bbq.sps, 154, "unified sps is open bags");
  same(bbq.ecomWeekly, 21, "ecom weekly stays on its own snapshot");
  same(bbq.ecomPeriod, 9999, "ecom period is not demand lines");
  same(bbq.weekly, 175, "weekly is open sps plus ecom");
  same(DB.unifiedWeeklyBags("Dill Pickle"), 7, "complete sps does not enter weekly");
  same(DB.recommendedSeasReorder("Dill Pickle", "4oz"), 1, "reorder ignores complete bags");
  same(DB.recommendedSeasReorder("Backyard BBQ", "4oz"), 21, "reorder uses open weekly");

  return DB.importDemand([
    { source: "SPS", partner: "KeHE", po: "PO-OPEN", flavor: "Sea Salt", bags: 30, cases: 1, status: "Open" },
    { source: "SPS", partner: "KeHE", po: "PO-DONE", flavor: "Sea Salt", bags: 80, cases: 1, status: "Complete" },
    { source: "SPS", partner: "KeHE", po: "PO-SHIP", flavor: "Sea Salt", bags: 40, cases: 1, status: "Shipped" },
    { source: "SPS", partner: "KeHE", po: "PO-TEST", flavor: "Sea Salt", bags: 11, cases: 1, status: "Test" }
  ], { batch_id: "chk" }, "test");
}).then(function () {
  same(DB.flavorDemandBags("Sea Salt"), 30, "imported complete and shipped stay out");
  var stored = DB.demandLines().filter(function (r) { return r.flavor === "Sea Salt"; });
  same(stored.length, 4, "import still keeps closed lines on the board");

  var fn = read("db.js");
  var start = fn.indexOf("function demandLineIsOpen");
  var end = fn.indexOf("function ecomBagsFor");
  var body = fn.slice(start, end);
  eq(start >= 0 && body.indexOf('=== "Open"') >= 0, "open predicate is status Open");
  eq(body.indexOf("demandLineIsOpen") >= 0, "flavor sum uses the open predicate");
  eq(body.indexOf("\u2014") < 0 && body.indexOf("\u2013") < 0, "db demand comment dash");
  eq(read("scripts/check-purchasing-demand.js").indexOf("\u2014") < 0, "check dash");

  var html = read("index.html");
  var sw = read("service-worker.js");
  eq(read("build-id.txt").trim() === "smackin-inv-v272", "build id");
  eq(sw.indexOf('const CACHE = "smackin-inv-v272"') >= 0, "cache bump");
  eq(html.indexOf('var EMBEDDED = "smackin-inv-v272"') >= 0, "index embedded");
  eq(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v272"') >= 0, "escape embedded");
  eq(html.indexOf('src="db.js?b=96"') >= 0, "db cache bust");
  eq(html.indexOf("sw-escape.js?b=12") >= 0, "escape cache bust");
  eq(read("supabase/functions/sps-sync/index.js").indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "folder stays testout");

  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("purchasing demand ok");
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});

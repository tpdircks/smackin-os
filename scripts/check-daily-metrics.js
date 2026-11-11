#!/usr/bin/env node
/* Daily Metrics opens on the week and month, and does not treat a missing
   weekday as zero. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");

var root = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var src = read("daily-metrics.js");
var app = read("app.js");
var html = read("index.html");
var sw = read("service-worker.js");

assert.strictEqual(src.indexOf("setInterval"), -1, "no timer");
assert.strictEqual(src.indexOf("\u2014"), -1, "no em dash");
assert.ok(src.indexOf("pmac_history") >= 0, "reads pmac history");
assert.ok(src.indexOf("recv_date") >= 0, "receipts use recv_date");
assert.ok(app.indexOf("DAILYMETRICS.view") >= 0, "daily view delegates");
assert.ok(html.indexOf("daily-metrics.js?b=3") >= 0, "script cache bust");
assert.ok(sw.indexOf("./daily-metrics.js") >= 0, "service worker asset");
assert.ok(sw.indexOf('const CACHE = "smackin-inv-v309"') >= 0, "cache bump");

var api = require(path.join(root, "daily-metrics.js"));
assert.strictEqual(api.weekStart("2026-11-10"), "2026-11-09");
assert.strictEqual(api.isPmacDept("P.Mac"), true);
assert.strictEqual(api.isPmacDept("Mixing"), false);
assert.strictEqual(api.isPmacDept("Not Found"), false);
assert.strictEqual(api.cellText({ kind: "missing" }), "Missing");
assert.strictEqual(api.cellText({ kind: "value", n: 0 }), "0");
assert.strictEqual(api.cellText({ kind: "none" }), "No data");
assert.strictEqual(api.cellText(null), "No data");

var model = api.buildModel({
  pmac: [
    { run_date: "2026-11-02", dept: "P-Mac", total_pkgs: 16600, box_count: 166, flavor_code: "S02", flavor_name: "Ranch", bag_size: "4 oz", shift: "1", operator: "A" },
    { run_date: "2026-11-03", dept: "P.Mac", total_pkgs: 25100, box_count: 248, flavor_code: "S03", flavor_name: "BBQ", bag_size: "4 oz", shift: "1", operator: "A" },
    { run_date: "2026-11-05", dept: "P-Mac", total_pkgs: 5700, box_count: 36, flavor_code: "S04", flavor_name: "Dill", bag_size: "1.5 oz", shift: "1", operator: "B" },
    { run_date: "2026-11-03", dept: "Mixing", total_pkgs: 99999, box_count: 9, flavor_code: "MX", flavor_name: "Mix", bag_size: "", shift: "1", operator: "C" }
  ],
  counter: [
    { prod_date: "2026-11-06", channel: "retail", counter_start: 10, counter_end: 10, notes: "Cards only" },
    { prod_date: "2026-11-09", channel: "retail", counter_start: 100, counter_end: 1116, notes: "" },
    { prod_date: "2026-11-04", channel: "retail", counter_start: 10, counter_end: null, notes: "Counter not closed" }
  ],
  pallets: [
    { prod_date: "2026-11-02", channel: "retail", line: "2", flavor_code: "S02", cases: 259, notes: "TARGET" },
    { prod_date: "2026-11-02", channel: "ecom", line: "9", flavor_code: "NO", cases: 9999, notes: "TARGET" },
    { prod_date: "2026-11-03", channel: "retail", line: "2", flavor_code: "WM-S04", cases: 162, notes: "KROGER" },
    { prod_date: "2026-11-03", channel: "retail", line: "2", flavor_code: "S08", cases: 422, notes: "TARGET" },
    { prod_date: "2026-11-04", channel: "retail", line: "2", flavor_code: "S01", cases: 136, notes: "TARGET" },
    { prod_date: "2026-11-05", channel: "retail", line: "2", flavor_code: "MINI", cases: 4500, notes: "MINI BUCKETS" },
    { prod_date: "2026-11-06", channel: "retail", line: "2", flavor_code: "MINI", cases: 4050, notes: "MINI BUCKETS" },
    { prod_date: "2026-11-09", channel: "retail", line: "1", flavor_code: "S04", cases: 120, notes: "MASTER" },
    { prod_date: "2026-11-09", channel: "retail", line: "1", flavor_code: "S03", cases: 30, notes: "MASTER" }
  ],
  fulfill: [
    { fdate: "2026-11-09", ecom_total: 397, amazon_bags: 0, notes: "", entered_by: "Jesus" }
  ],
  ship: [{ ship_date: "2026-10-05" }, { ship_date: "2026-10-30" }],
  recv: [{ recv_date: "2026-11-03" }, { recv_date: "2026-11-04" }],
  quality: [],
  holidays: [{ holiday_date: "2026-11-11" }],
  asof: { pmac: "2026-11-05", ship: "2026-10-30", quality: "" }
}, "2026-11-10");

assert.strictEqual(model.weekFrom, "2026-11-09");
assert.strictEqual(model.week.rolls.pmac.hasData, false, "this week has no P-Mac rows");
assert.strictEqual(model.week.rolls.pmac.total, null, "missing week is not zero");
assert.ok(model.week.rolls.pmac.missing >= 1, "Monday is flagged missing");
assert.strictEqual(model.week.rolls.pmac.pending, 1, "today is not in yet");
assert.strictEqual(model.priorWeek.rolls.pmac.hasData, true);
assert.strictEqual(model.priorWeek.rolls.pmac.total, 41700);
assert.strictEqual(api.compareNote(model.week.rolls.pmac, model.priorWeek.rolls.pmac).indexOf("No data. Prior period: 41,700."), 0);

assert.strictEqual(model.week.rolls.counter.hasData, true);
assert.strictEqual(model.week.rolls.counter.total, 1016);
assert.strictEqual(model.week.rolls.ecom.total, 397);
assert.strictEqual(model.week.rolls.amazon.hasData, true, "a logged zero is data");
assert.strictEqual(model.week.rolls.amazon.total, 0);
assert.strictEqual(model.week.rolls.ship.hasData, false, "no shipment rows is not zero");
assert.strictEqual(model.week.rolls.ship.total, null);
assert.strictEqual(model.week.rolls.cases.total, 150);
assert.strictEqual(model.month.rolls.cases.total, 1129, "mini buckets are not retail cases");
assert.strictEqual(model.month.rolls.mini.total, 8550);
assert.strictEqual(model.week.rolls.quality.hasData, false);

var byDate = {};
model.month.cells.forEach(function (c) { byDate[c.d] = c; });
assert.strictEqual(api.cellText(byDate["2026-11-02"].cases), "259");
assert.strictEqual(api.cellText(byDate["2026-11-03"].cases), "584");
assert.strictEqual(api.cellText(byDate["2026-11-04"].cases), "136");
assert.strictEqual(api.cellText(byDate["2026-11-05"].cases), "4,500 MB");
assert.strictEqual(api.cellText(byDate["2026-11-06"].cases), "4,050 MB");
assert.strictEqual(api.cellText(byDate["2026-11-09"].cases), "150");
assert.strictEqual(byDate["2026-11-03"].cases.cats.TARGET, 422);
assert.strictEqual(byDate["2026-11-03"].cases.cats.KROGER, 162);
assert.strictEqual(byDate["2026-11-01"].pmac.kind, "off");
assert.strictEqual(byDate["2026-11-04"].pmac.kind, "missing");
assert.strictEqual(byDate["2026-11-06"].pmac.kind, "missing");
assert.strictEqual(byDate["2026-11-06"].counter.kind, "value");
assert.strictEqual(byDate["2026-11-06"].counter.n, 0, "equal counters are a real zero");
assert.strictEqual(byDate["2026-11-04"].counter.kind, "none", "a blank counter is not zero");
assert.strictEqual(byDate["2026-11-07"].pmac.kind, "off");
assert.strictEqual(byDate["2026-11-09"].pmac.kind, "missing");
assert.strictEqual(byDate["2026-11-10"].pmac.kind, "pending");
assert.strictEqual(model.month.rolls.pmac.total, 47400, "mixing rows are not added");
assert.strictEqual(model.month.rolls.ship.hasData, false);
assert.strictEqual(model.priorMonth.rolls.ship.hasData, true);
assert.strictEqual(model.priorMonth.rolls.ship.total, 1, "Oct 30 is outside the same-days comparison");
assert.strictEqual(model.month.rolls.recv.total, 2);

var page = api.html(model);
assert.ok(page.indexOf("Retail") >= 0 && page.indexOf("E-com") >= 0 && page.indexOf("Manufacturing") >= 0, "three sections");
assert.ok(page.indexOf("Metal detector boxes") >= 0, "counter is boxes");
assert.ok(page.indexOf("Retail counter bags") < 0, "counter is not labeled bags");
assert.ok(page.indexOf("Logistics") >= 0, "shipments stay out of retail");
assert.ok(page.indexOf("shipping log is stale") >= 0, "stale shipping is called out");
assert.ok(page.indexOf("4,500 MB") >= 0, "mini buckets stay labeled");
assert.ok(page.indexOf("Missing") >= 0, "missing flag is visible");
assert.ok(page.indexOf("No data") >= 0, "empty periods say no data");
assert.ok(page.indexOf("<svg") >= 0, "chart renders");
assert.strictEqual(page.indexOf("\u2014"), -1, "rendered text has no em dash");
assert.ok(page.indexOf('data-metric="pmac" data-state="missing"') >= 0, "week P-Mac tile is not a zero");
assert.ok(page.indexOf("41,700") >= 0, "prior week total is shown");

var day = api.html(model, "day", "2026-11-09");
assert.ok(day.indexOf("Back to week and month") >= 0, "day drill-down");
assert.ok(day.indexOf("No P-Mac rows") >= 0, "day calls out the gap");
assert.ok(day.indexOf("S04") >= 0 && day.indexOf("150") >= 0, "pallet lines for the day");
assert.strictEqual(day.indexOf("\u2014"), -1);

var holiday = api.buildModel({
  holidays: [{ holiday_date: "2026-11-04" }]
}, "2026-11-10");
var off = {};
holiday.month.cells.forEach(function (c) { off[c.d] = c; });
assert.strictEqual(off["2026-11-04"].pmac.kind, "off", "holiday is not a missing weekday");
assert.strictEqual(off["2026-11-05"].pmac.kind, "missing");

var zeroDay = api.html(model, "day", "2026-11-06");
assert.ok(zeroDay.indexOf(">0<") >= 0, "logged zero stays visible on the day");

console.log("ok daily metrics");

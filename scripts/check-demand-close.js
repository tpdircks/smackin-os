#!/usr/bin/env node
/* Invariants for the demand close cleanup. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var src = read("demand-close-cleanup.js");
var auto = read("demand-autoclose.js");
var html = read("index.html");
var sw = read("service-worker.js");
var prod = read("production-orders.js");

eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "cleanup dash");
eq(src.indexOf("flavor_code|due_date|cases") < 0, "no collapsed dedupe key");
eq(src.indexOf("demand_lines") >= 0, "writes demand_lines");
eq(src.indexOf("production-orders") < 0 && src.indexOf("production_orders") < 0, "does not touch production orders");
eq(prod.indexOf("demand-close") < 0, "production-orders.js unchanged by this module");
eq(src.indexOf("nextStatus") < 0 && src.indexOf("NOTE_PAST") < 0, "no age-only Shipped status");
eq(src.indexOf(".update(body)") < 0 && src.indexOf("applyPatches(sb") < 0, "cleanup no longer persists closes");
eq(sw.indexOf('const CACHE = "smackin-inv-v290"') >= 0, "cache bump");
eq(sw.indexOf('"./demand-close-cleanup.js"') >= 0, "sw asset");
eq(html.indexOf('demand-close-cleanup.js?b=3') >= 0, "script tag");
eq(html.indexOf("demand-autoclose.js?b=5") >= 0, "autoclose cache bust");
eq(html.indexOf("demand-autoclose.js?b=5") < html.indexOf("demand-close-cleanup.js?b=3"), "script order");
eq(auto.indexOf("All other old lines remain Open") >= 0, "autoclose leaves every old line open");
eq(auto.indexOf("Subject lines remain Open") < 0 && auto.indexOf("_autoclosed") < 0 && auto.indexOf(".map(function") < 0, "autoclose leaves SPS open and performs no derived writes");
eq(src.indexOf("function isSpsLine") >= 0, "cleanup skips SPS");
eq(auto.indexOf("Per-DC lines remain distinct") >= 0, "dedupe warning kept");

var ctx = { window: {}, console: console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
var D = ctx.DEMANDCLOSE;

eq(D.PAST_DUE_DAYS === 14, "14-day review threshold, not a close threshold");
eq(D.FLAG === "demand-close-2026-10-29-v1", "flag");
eq(D.daysBefore("2026-10-15", "2026-10-29") === 14, "oct 15 is 14 days");
eq(D.daysBefore("2026-10-16", "2026-10-29") === 13, "oct 16 is 13 days");
eq(D.orderNum("10001123456-055") === "123456", "target orderNum");
eq(D.orderNum("10002057571") === "10002057571", "10002 prefix stays");
eq(D.keysOf("14828 817").indexOf("14828817") >= 0, "strip punctuation");
eq(D.keysOf("0142464").indexOf("0142464") >= 0 && D.keysOf("0142464").indexOf("142464") < 0, "keep leading zeros");
eq(D.keysOf("10001123456-055").indexOf("10001123456055") < 0, "do not glue DC suffix");
eq(D.withNote("call Troy", D.NOTE_COMPLETE) === "call Troy | " + D.NOTE_COMPLETE, "keep user note");
eq(D.withNote("call Troy | " + D.NOTE_COMPLETE, D.NOTE_COMPLETE) === "call Troy | " + D.NOTE_COMPLETE, "note once");
eq(/^\d{4}-\d{2}-\d{2}$/.test(D.mountainToday(new Date("2026-10-29T20:00:00Z"))), "mountain date shape");

var TODAY = "2026-10-29";

function line(id, partner, po, due, extra) {
  var row = { id: id, source: "Faire", partner: partner, po: po, due_date: due, status: "Open", notes: "", bags: 10, cases: 1, dc: extra && extra.dc || "" };
  if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
  return row;
}
function spsLine(id, partner, po, due, extra) {
  return line(id, partner, po, due, Object.assign({ source: "SPS" }, extra || {}));
}
function order(po, status) { return { customer_po: po, status: status }; }

function posOf(list) {
  var out = [];
  list.forEach(function (row) { row.pos.forEach(function (p) { out.push(p); }); });
  return out;
}

// Per-DC Target lines stay separate and stay Open. No 856 path in this pass.
var targetLines = [];
for (var i = 0; i < 4; i++) targetLines.push(spsLine("t" + i, "Target", "10002057571", "09/14/2026", { dc: "D" + i, bags: 72, cases: 1 }));
var targetPlan = D.plan(targetLines, [order("10002057571", "Complete")], TODAY);
eq(targetPlan.ship.length === 0, "target not shipped");
eq(targetPlan.notes.length === 0, "target not noted");
eq(targetPlan.report.leftTarget.length === 1 && targetPlan.report.leftTarget[0].lines === 4, "target lines kept");
eq(targetPlan.report.beforeOpenLines === 4, "no collapse");

// All source types retain their Open POs until a source or human proves shipping.
// A past-due date is a review flag only. Even a Complete board row cannot fabricate
// proof for ShipStation or SPS demand without a verified source mapping.
var doneLines = [line("a1", "Core-Mark", "550084", "11/05/2026", { dc: "1" })];
var donePlan = D.plan(doneLines, [order("550084", "Complete")], TODAY);
eq(donePlan.ship.length === 0, "board Complete alone does not close demand");
var past = D.plan([
  line("d1", "McLane", "MI10105790", "10/15/2026", { source: "ShipStation" }),
  line("d2", "KeHE", "3942350", "10/07/2026", { source: "TikTok" }),
  line("d4", "Scheels", "023399086", "", { source: "Shopify" })
], [order("3942350", "Open"), order("023399086", "Open")], TODAY);
eq(past.ship.length === 0, "no age-only or Orders-board closes");
eq(past.report.reviewSource.length === 3, "all real source groups stay in review");
eq(past.report.leftPastDue.length === 2, "past-due groups are review only");
eq(past.notes.length === 1 && past.notes[0].id === "d4", "only the existing blank-date review marker remains");
var spsHold = D.plan([
  spsLine("s1", "McLane", "MO10106510", "10/01/2026"),
  spsLine("s2", "Target", "10002057571", "10/01/2026")
], [order("MO10106510", "Complete")], TODAY);
eq(spsHold.ship.length === 0 && spsHold.notes.length === 0, "SPS not closed by orders or age");
var counts = D.summaryLine(past.report);
eq(counts.closedByPastDue === 0, "no age-only closures reported");
eq(counts.sourceReview === 3 && counts.pastDueReview === 2, "review summary keeps source and age groups");


if (fail.length) {
  fail.forEach(function (m) { console.error("FAIL:", m); });
  process.exit(1);
}
console.log("demand-close checks ok");

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
eq(sw.indexOf('const CACHE = "smackin-inv-v258"') >= 0, "cache bump");
eq(sw.indexOf('"./demand-close-cleanup.js"') >= 0, "sw asset");
eq(html.indexOf('demand-close-cleanup.js?b=1') >= 0, "script tag");
eq(html.indexOf("demand-autoclose.js?b=3") >= 0, "autoclose cache bust");
eq(html.indexOf("demand-autoclose.js?b=3") < html.indexOf("demand-close-cleanup.js?b=1"), "script order");
eq(auto.indexOf("/target/i") >= 0, "autoclose leaves Target open");
eq(auto.indexOf("DE-DUPLICATED") >= 0, "dedupe warning kept");

var ctx = { window: {}, console: console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
var D = ctx.DEMANDCLOSE;

eq(D.PAST_DUE_DAYS === 14, "14 day cutoff");
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
  var row = { id: id, source: "SPS", partner: partner, po: po, due_date: due, status: "Open", notes: "", bags: 10, cases: 1, dc: extra && extra.dc || "" };
  if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
  return row;
}
function order(po, status) { return { customer_po: po, status: status }; }

function posOf(list) {
  var out = [];
  list.forEach(function (row) { row.pos.forEach(function (p) { out.push(p); }); });
  return out;
}

// Per-DC Target lines stay separate and stay Open. No 856 path in this pass.
var targetLines = [];
for (var i = 0; i < 4; i++) targetLines.push(line("t" + i, "Target", "10002057571", "09/14/2026", { dc: "D" + i, bags: 72, cases: 1 }));
var targetPlan = D.plan(targetLines, [order("10002057571", "Complete")], TODAY);
eq(targetPlan.ship.length === 0, "target not shipped");
eq(targetPlan.notes.length === 0, "target not noted");
eq(targetPlan.report.leftTarget.length === 1 && targetPlan.report.leftTarget[0].lines === 4, "target lines kept");
eq(targetPlan.report.beforeOpenLines === 4, "no collapse");

// Non-Target, every matching order Complete, including a future due date.
var doneLines = [
  line("a1", "Core-Mark", "550084", "11/05/2026", { dc: "1" }),
  line("a2", "Core-Mark", "550084", "11/05/2026", { dc: "2" }),
  line("a3", "Core-Mark", "550084", "11/05/2026", { dc: "3" })
];
var donePlan = D.plan(doneLines, [order("550084", "Complete"), order("550084", " complete ")], TODAY);
eq(donePlan.ship.length === 3, "all DC lines ship");
eq(donePlan.ship.every(function (p) { return p.status === "Shipped" && p.notes === D.NOTE_COMPLETE; }), "complete note");
eq(posOf(donePlan.report.closeComplete).indexOf("550084") >= 0, "complete bucket");
eq(donePlan.report.closePastDue.length === 0, "complete wins over due date");

// 10001 prefix on the fulfillment PO matches the stripped demand PO.
var pref = D.plan(
  [line("p1", "Target", "123456", "11/01/2026"), line("p2", "KeHE", "123456", "11/01/2026")],
  [order("10001123456", "Complete")],
  TODAY
);
eq(pref.ship.length === 0, "shared PO with Target stays open");

var pref2 = D.plan(
  [line("p3", "KeHE", "123456", "11/20/2026"), line("p4", "KeHE", "123456-9", "11/20/2026")],
  [order("10001123456-3891", "Complete")],
  TODAY
);
eq(pref2.ship.length === 2, "orderNum match ships both lines");
eq(pref2.ship[0].notes === D.NOTE_COMPLETE && pref2.ship[1].notes === D.NOTE_COMPLETE, "same PO note");

// Mixed stays open even when the due date is far past.
var mixed = D.plan(
  [line("m1", "UNFI", "065091928", "10/07/2026", { notes: "hold" })],
  [order("065091928", "Complete"), order("065091928", "Open")],
  TODAY
);
eq(mixed.ship.length === 0, "mixed not shipped");
eq(mixed.notes.length === 1 && mixed.notes[0].notes === "hold | " + D.NOTE_MIXED, "mixed note keeps user text");
eq(mixed.report.leftMixed.length === 1, "mixed bucket");
eq(mixed.report.closePastDue.length === 0, "mixed beats past-due");

// Past-due: 14 days ships, 13 days stays, blank due stays.
var past = D.plan([
  line("d1", "McLane", "MI10105790", "10/15/2026"),
  line("d2", "McLane", "MG10198555", "10/16/2026"),
  line("d3", "KeHE", "3942350", "10/07/2026"),
  line("d4", "Scheels", "023399086", "")
], [
  order("3942350", "Open"),
  order("023399086", "Open")
], TODAY);
eq(posOf(past.report.closePastDue).sort().join(",") === "3942350,MI10105790", "past-due pos " + posOf(past.report.closePastDue).join(","));
eq(past.ship.length === 2, "two past-due lines");
eq(past.ship.every(function (p) { return p.notes === D.NOTE_PAST && p.status === "Shipped"; }), "past-due note");
eq(posOf(past.report.leftOpen).sort().join(",") === "023399086,MG10198555", "left open " + posOf(past.report.leftOpen).join(","));
eq(past.notes.length === 1 && past.notes[0].id === "d4" && past.notes[0].notes === D.NOTE_DUE, "blank due note");
eq(past.notes[0].status == null, "blank due stays open");

// Second pass is a no-op once notes and status are applied.
var againLines = past.ship.map(function (p) {
  return { id: p.id, source: "SPS", partner: "McLane", po: p.po, due_date: "10/01/2026", status: "Shipped", notes: p.notes, bags: 1, cases: 1 };
}).concat(past.notes.map(function (p) {
  return { id: p.id, source: "SPS", partner: "Scheels", po: "023399086", due_date: "", status: "Open", notes: p.notes, bags: 1, cases: 1 };
}));
var again = D.plan(againLines, [order("023399086", "Open")], TODAY);
eq(again.ship.length === 0 && again.notes.length === 0, "second pass no-op");

// Lowercase Complete and a future non-Target PO still closes.
var future = D.plan(
  [line("f1", "Vistar", "88742755", "11/04/2026")],
  [order("88742755", "Complete")],
  TODAY
);
eq(future.ship.length === 1 && future.report.closeComplete.length === 1, "future complete still closes");

var counts = D.summaryLine(past.report);
eq(counts.beforeOpenPOs === 4, "before pos");
eq(counts.closedByPastDue === 2, "past count");
eq(counts.leftOpen === 2, "left count");
eq(counts.closedByComplete + counts.closedByPastDue + counts.leftTarget + counts.leftMixed + counts.leftOpen === counts.beforeOpenPOs, "buckets cover the board");

if (fail.length) {
  fail.forEach(function (m) { console.error("FAIL:", m); });
  process.exit(1);
}
console.log("demand-close checks ok");

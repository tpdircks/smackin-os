#!/usr/bin/env node
/* Data Health guards: expired stock, SPS quiet feed, receiving gap.
   No network. No stock writes. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert/strict");

var src = fs.readFileSync(path.join(__dirname, "..", "data-health.js"), "utf8");
var c = {
  document: {
    readyState: "loading",
    addEventListener: function () {},
    createElement: function () { return { id: "" }; },
    getElementById: function () { return null; }
  },
  MutationObserver: function () { return { observe: function () {} }; }
};
c.window = c;
c.SMACKIN_CONFIG = {};
c.supabase = {};
vm.createContext(c);
vm.runInContext(src, c);
var api = c.DATAHEALTH && c.DATAHEALTH.forTest;
assert.ok(api && api.expiredOutsideHold && api.spsQuiet && api.receivingGap && api.guardHtml, "guard helpers are testable");

var n = 0;
function eq(actual, expected, msg) {
  assert.equal(actual, expected, msg);
  n++;
}
function ok(cond, msg) {
  assert.ok(cond, msg);
  n++;
}
function noon(iso) {
  return new Date(iso + "T18:00:00Z");
}

var items = [
  { id: "SEAS-BW", name: "Seasoning - Buffalo Wing" },
  { id: "SEAS-CR", name: "Seasoning - Cinnamon Roll Frosting" },
  { id: "SEAS-BP", name: "Seasoning - Banana Pudding" }
];
var stock = [
  { item_id: "SEAS-BW", location: "RECEIVING", lot: "LOT-OLD", qty: 18, expires_on: "2026-08-05" },
  { item_id: "SEAS-CR", location: "RECEIVING", lot: "FHF EXP 2026-11-10", qty: 22.8, expires_on: null },
  { item_id: "SEAS-BP", location: "QUARANTINE", lot: "FHF EXP 2026-10-29", qty: 20, expires_on: "2026-10-29" },
  { item_id: "SEAS-BW", location: "QA-HOLD", lot: "FHF EXP 2026-01-01", qty: 5, expires_on: "2026-01-01" },
  { item_id: "SEAS-CR", location: "RECEIVING", lot: "FHF EXP 2027-09-25", qty: 34.5, expires_on: "2027-09-25" },
  { item_id: "SEAS-BW", location: "RECEIVING", lot: "empty", qty: 0, expires_on: "2020-01-01" }
];
var hits = api.expiredOutsideHold(stock, items, "2026-11-11");
var lots = hits.map(function (row) { return row.lot; }).join(",");
eq(lots, "LOT-OLD,FHF EXP 2026-11-10", "expired lots outside hold are flagged");
eq(hits[0].item, "Seasoning - Buffalo Wing", "dated stock row keeps its item");
eq(hits[0].location, "RECEIVING", "receiving is not a shielded location");
eq(hits[1].expiration, "2026-11-10", "FHF EXP lot label is the expiration when expires_on is blank");
eq(hits[1].qty, 22.8, "the parsed lot keeps its quantity");
ok(!hits.some(function (row) { return row.location === "QUARANTINE"; }), "quarantined expired lot is not flagged");
ok(!hits.some(function (row) { return row.location === "QA-HOLD"; }), "QA-HOLD expired lot is not flagged");
ok(!hits.some(function (row) { return row.expiration === "2027-09-25"; }), "a future date is not flagged");
ok(!hits.some(function (row) { return row.lot === "empty"; }), "a zero quantity row is not flagged");

function sps(last, today) {
  return api.spsQuiet({ lastFile: last, now: noon(today) });
}
var sameDay = sps("2026-11-11", "2026-11-11");
eq(sameDay.quiet, false, "a file today is green");
eq(sameDay.days, 0, "today is zero business days");
var oneDay = sps("2026-11-10", "2026-11-11");
eq(oneDay.quiet, false, "one business day without a file stays green");
eq(oneDay.days, 1, "Tuesday to Wednesday is one business day");
var twoDay = sps("2026-11-09", "2026-11-11");
eq(twoDay.quiet, true, "two business days without a file is red");
eq(twoDay.days, 2, "Monday to Wednesday is two business days");
var overWeekend = sps("2026-11-06", "2026-11-09");
eq(overWeekend.quiet, false, "Friday to Monday is not yet two business days");
eq(overWeekend.days, 1, "Saturday and Sunday are not counted");
var afterWeekend = sps("2026-11-05", "2026-11-09");
eq(afterWeekend.quiet, true, "Thursday to Monday is two business days");
eq(afterWeekend.days, 2, "the weekend between Thursday and Monday adds no days");
var never = api.spsQuiet({ lastFile: "", now: noon("2026-11-11") });
eq(never.quiet, true, "no file on record is red");
eq(never.never, true, "no file is reported as never");
var redTile = api.guardHtml({ sps: { quiet: true, never: false, last: "2026-11-03", days: 6 } });
ok(redTile.indexOf('class="ex bad"') >= 0 && redTile.indexOf("SPS feed") >= 0, "the quiet SPS tile is red");
var greenTile = api.guardHtml({ sps: { quiet: false, never: false, last: "2026-11-11", days: 0 } });
ok(greenTile.indexOf('class="ex ok"') >= 0 && greenTile.indexOf('class="ex bad"') < 0, "a current SPS tile is green");

function recv(last, today) {
  return api.receivingGap({ lastReceipt: last, now: noon(today) });
}
var four = recv("2026-11-05", "2026-11-11");
eq(four.gap, false, "four business days without a receipt stays green");
eq(four.days, 4, "Thursday to Wednesday is four business days");
var five = recv("2026-11-04", "2026-11-11");
eq(five.gap, true, "five business days without a receipt is amber");
eq(five.days, 5, "Wednesday Nov 4 to Wednesday Nov 11 is five business days");
var six = recv("2026-11-03", "2026-11-11");
eq(six.gap, true, "more than five business days stays amber");
eq(six.days, 6, "Tuesday Nov 3 to Wednesday Nov 11 is six business days");
var recvWeekend = recv("2026-11-06", "2026-11-11");
eq(recvWeekend.gap, false, "a Friday receipt is still inside five business days on Wednesday");
eq(recvWeekend.days, 3, "only Monday, Tuesday, and Wednesday count after Friday");
var amberTile = api.guardHtml({ recv: { gap: true, last: "2026-11-04", days: 5 } });
ok(amberTile.indexOf('class="ex warn"') >= 0 && amberTile.indexOf("Receiving gap") >= 0, "the receiving gap tile is amber");
var freshTile = api.guardHtml({ recv: { gap: false, last: "2026-11-10", days: 1 } });
ok(freshTile.indexOf('class="ex ok"') >= 0 && freshTile.indexOf('class="ex warn"') < 0, "a recent receipt stays green");

console.log(n + " data health guard assertions");

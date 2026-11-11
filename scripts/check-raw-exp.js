#!/usr/bin/env node
/* Raw-material expiration. No network. Does not touch finished-goods best-by. */
"use strict";

var fs = require("fs");
var path = require("path");
var rx = require("../raw-exp.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

var seas = { id: "SEAS-S03", code: "SEAS-S03", category: "seasoning", name: "Seasoning - Backyard BBQ" };
var seed = { id: "SEED-BROWN", code: "SEED-BROWN", category: "seed", name: "Sunflower Seed" };
var seeds = { id: "TMP-SEAS-PEANUTBUTTERJELLY", code: "TMP-SEAS-PEANUTBUTTERJELLY", category: "SEEDS", name: "Seasoning - Peanut Butter Jelly" };
var oil = { id: "OIL", code: "OIL", category: "seed", name: "Oil" };
var bag = { id: "B4-S03", code: "B4-S03", category: "bag4", name: "Bags 4oz - Backyard BBQ" };
var film = { id: "FILM4-S03", code: "FILM4-S03", category: "film4", name: "Film 4oz" };

assert(rx.isRawCategory("seasoning") && rx.isRawCategory("SEASONING"), "seasoning");
assert(rx.isRawCategory("seed") && rx.isRawCategory("SEEDS"), "seed");
assert(rx.isRawCategory("oil") && rx.isRawCategory("STEVIA"), "oil and stevia");
assert(!rx.isRawCategory("bag4") && !rx.isRawCategory("film4") && !rx.isRawCategory("mastercase"), "finished and film are not raw");
assert(!rx.isRawCategory("packaging") && !rx.isRawCategory("ROLL FILM 4 OZ"), "packaging is not raw");
assert(rx.isRawItem(seas) && rx.isRawItem(seed) && rx.isRawItem(seeds) && rx.isRawItem(oil), "raw items");
assert(!rx.isRawItem(bag) && !rx.isRawItem(film), "fg and film items");

assert(rx.normLot("Lot # 4209 E") === "LOT4209E", "lot normalize");
assert(rx.normLot("LOT 4209 E") === rx.normLot("Lot#4209E"), "same lot key");
assert(rx.normLot("") === "" && rx.normLot(null) === "", "blank lot key");
assert(rx.dateISO("2027-03-01T00:00:00") === "2027-03-01", "date slice");
assert(rx.dateISO("") === "" && rx.dateISO("soon") === "", "blank date");

var stock = [
  { item_id: "SEAS-S03", location: "RECEIVING", lot: "Lot # 1326", qty: 2700, expires_on: null, exp: "2020-01-01" },
  { item_id: "SEAS-S03", location: "PROD-WEIGH", lot: "", qty: 4500, expires_on: null }
];
var recv = [
  { id: "a", item_id: "SEAS-S03", lot: "LOT 1326", recv_date: "2026-10-01", created_at: "2026-10-01", expires_on: "2027-03-01" },
  { id: "b", item_id: "B4-S03", lot: "FG-1", recv_date: "2026-10-02", expires_on: "2028-01-01" },
  { id: "c", item_id: "SEAS-S08", lot: "Lot # 1326", recv_date: "2026-11-01", expires_on: "2029-01-01" }
];
var hit = rx.resolveExpires(stock[0], seas, stock, recv);
assert(hit.date === "2027-03-01" && hit.source === "receiving_log", "log date matches the lot key");
assert(rx.resolveExpires(stock[0], seas, stock, recv).date !== "2020-01-01", "row.exp is not the raw date");
assert(rx.resolveExpires(stock[1], seas, stock, recv).date === "", "blank lot does not borrow a lotted date");
assert(rx.resolveExpires({ item_id: "B4-S03", lot: "FG-1", qty: 10, expires_on: "2028-01-01", exp: "2028-01-01" }, bag, [], []).date === "", "finished goods stay blank");
assert(rx.lotLines(bag, [{ item_id: "B4-S03", location: "A-01-L1", lot: "FG-1", qty: 10, expires_on: "2028-01-01" }], []).length === 0, "no fg lines");
assert(rx.lotLines(film, [{ item_id: "FILM4-S03", location: "RECEIVING", lot: "F1", qty: 4, expires_on: "2027-01-01" }], []).length === 0, "no film lines");

stock[0].expires_on = "2027-06-15";
assert(rx.resolveExpires(stock[0], seas, stock, recv).source === "stock", "stock date wins");
assert(rx.lotLines(seas, stock, recv).length === 2, "both seasoning piles show");
assert(rx.age("2020-01-01") === "expired", "past date");
assert(rx.age("2099-12-31") === "ok", "far date");
assert(rx.age("") === "", "no age without a date");

var before = [
  { item_id: "SEED-BROWN", location: "RECEIVING", lot: "Lot # 26216", qty: 4700, expires_on: "2027-04-01" }
];
var after = [
  { item_id: "SEED-BROWN", location: "E-21-L1", lot: "Lot # 26216", qty: 4700, expires_on: null }
];
var jobs = rx.stampsAfterMove(seed, before, after, []);
assert(jobs.length === 1 && jobs[0].expiresOn === "2027-04-01" && jobs[0].itemId === "SEED-BROWN", "move copies the date");
assert(rx.stampsAfterMove(bag, before, after, []).length === 0, "fg move copies nothing");
var blankBefore = [{ item_id: "SEED-BROWN", location: "RECEIVING", lot: "", qty: 10, expires_on: "2027-05-01" }];
var blankAfter = [
  { item_id: "SEED-BROWN", location: "E-21-L1", lot: "", qty: 10, expires_on: null },
  { item_id: "SEED-BROWN", location: "STAGING", lot: "", qty: 6, expires_on: null }
];
var blankJobs = rx.stampsAfterMove(seed, blankBefore, blankAfter, []);
assert(blankJobs.length === 2 && blankJobs.every(function (j) { return j.stockOnly && j.location; }), "blank lots stay per location");

assert(rx.WRITE_STOCK === false, "qty writes stay off");
var jal = { id: "TMP-SEAS-BCJALAP", code: "TMP-SEAS-BCJALAP", category: "SEASONING", name: "Bacon Type Jalapeno Popper" };
var missingExp = rx.releaseWarning(jal, "#2-160510", "");
assert(missingExp.indexOf("Expiration is missing") >= 0 && missingExp.indexOf("#2-160510") >= 0, "blank raw expiration warns");
assert(rx.releaseWarning(jal, "#2-160510", "2027-01-01") === "", "a real date does not warn");
assert(rx.releaseWarning(bag, "L1", "") === "", "finished goods do not get the raw warning");
assert(rx.confirmRelease(jal, [{ lot: "#2-160510", expires_on: "2026-11-01" }]) === true, "dated release is not blocked");

var src = read("raw-exp.js");
var db = read("db.js");
var sw = read("service-worker.js");
var html = read("index.html");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em dash");
assert(src.indexOf("trace_labels") < 0 && src.indexOf("kv_status") < 0, "fg shelf life untouched");
assert(src.indexOf("fn_apply_delta") < 0, "no stock delta rpc");
assert(db.indexOf("async function setRawExpires") >= 0, "db stamp");
assert(db.indexOf('update({ expires_on: value })') >= 0, "metadata column only");
assert(db.indexOf('c === "seed" || c === "seeds" || c === "seasoning" || c === "oil" || c === "stevia"') >= 0, "db categories");
assert(sw.indexOf('const CACHE = "smackin-inv-v309"') >= 0 && sw.indexOf("./raw-exp.js") >= 0, "cache and asset");
assert(html.indexOf("raw-exp.js?b=4") >= 0, "script bust");
assert(html.indexOf('var EMBEDDED = "smackin-inv-v309"') >= 0, "embedded build");
assert(read("build-id.txt").trim() === "smackin-inv-v309", "build id");
assert(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v309"') >= 0, "escape build");
assert(html.indexOf("db.js?b=107") >= 0, "db bust");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("raw-exp ok");

#!/usr/bin/env node
/* Dock COA presence. No network. Does not store a COA file. */
"use strict";

var fs = require("fs");
var path = require("path");
var rc = require("../raw-coa.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

var seed = { id: "SEED-BROWN", code: "SEED-BROWN", category: "seed", name: "Sunflower Seed" };
var seeds = { id: "TMP-SEEDS", code: "TMP-SEEDS", category: "SEEDS", name: "Sunflower" };
var seas = { id: "SEAS-S03", code: "SEAS-S03", category: "seasoning", name: "Seasoning - Backyard BBQ" };
var seasStevia = { id: "TMP-SEAS-STEVIASWEETENER", code: "TMP-SEAS-STEVIASWEETENER", category: "seasoning", name: "Seasoning - Stevia Sweetener" };
var maltoSeed = { id: "MALTO", code: "MALTO", category: "seed", name: "Maltodextrin" };
var maltoSeas = { id: "TMP-SEAS-MALTODEXTRINCLINTOSECR", code: "TMP-SEAS-MALTODEXTRINCLINTOSECR", category: "seasoning", name: "Seasoning - Maltodextrin Clintose CR-10" };
var adhesion = { id: "ADH-1", code: "ADH-1", category: "adhesion", name: "Adhesion" };
var oilCat = { id: "OIL-DRUM", code: "OIL-DRUM", category: "oil", name: "Canola" };
var oilLive = { id: "OIL", code: "OIL", category: "seed", name: "Oil" };
var steviaCat = { id: "STEVIA-BAG", code: "STEVIA-BAG", category: "stevia", name: "Sweetener" };
var steviaLive = { id: "STEVIA", code: "STEVIA", category: "seasoning", name: "Stevia" };
var bag = { id: "B4-S03", code: "B4-S03", category: "bag4", name: "Bags 4oz - Backyard BBQ" };
var film = { id: "FILM4-S03", code: "FILM4-S03", category: "film4", name: "Film 4oz" };

assert(rc.isCoaItem(seed) && rc.isHighRisk(seed), "seed shows and holds");
assert(rc.isCoaItem(seeds) && rc.isHighRisk(seeds), "SEEDS category");
assert(rc.isCoaItem(seas) && rc.isHighRisk(seas), "seasoning holds");
assert(rc.isCoaItem(seasStevia) && rc.isHighRisk(seasStevia) && !rc.isOilOrStevia(seasStevia), "seasoning blend stays high risk");
assert(rc.isMaltodextrin(maltoSeed) && rc.isHighRisk(maltoSeed), "maltodextrin filed as seed holds");
assert(rc.isMaltodextrin(maltoSeas) && rc.isHighRisk(maltoSeas), "maltodextrin filed as seasoning holds");
assert(rc.isHighRisk(adhesion), "adhesion category holds");
assert(rc.isCoaItem(oilCat) && rc.isHighRisk(oilCat), "oil category holds");
assert(rc.isCoaItem(oilLive) && rc.isOilOrStevia(oilLive) && rc.isHighRisk(oilLive), "live OIL item is auto-held");
assert(rc.isCoaItem(steviaCat) && rc.isHighRisk(steviaCat), "stevia category holds");
assert(rc.isCoaItem(steviaLive) && rc.isHighRisk(steviaLive), "live STEVIA item is auto-held");
assert(!rc.isCoaItem(bag) && !rc.isCoaItem(film), "bags and film are not this dock check");
assert(!rc.isHighRisk(bag) && !rc.isHighRisk(null), "finished goods do not hold");

assert(rc.normAnswer("Yes") === "yes" && rc.normAnswer("NO") === "no" && rc.normAnswer("N/A") === "na", "answers");
assert(rc.normAnswer("") === "" && rc.normAnswer("maybe") === "", "blank answer");
assert(rc.shouldHold(seed, "no", false) && !rc.shouldHold(seed, "yes", false) && !rc.shouldHold(seed, "na", false), "only No holds");
assert(!rc.shouldHold(seed, "no", true), "a released No does not hold again");
assert(rc.shouldHold(oilLive, "no", false) && rc.shouldHold(steviaLive, "No", false), "oil and stevia No holds");
assert(rc.shouldHold(oilCat, "no", false) && rc.shouldHold(steviaCat, "no", false), "oil and stevia categories hold on No");
assert(!rc.shouldHold(oilLive, "yes", false) && !rc.shouldHold(steviaLive, "na", false), "oil and stevia Yes and N/A do not hold");
assert(!rc.shouldHold(oilLive, "no", true) && !rc.shouldHold(steviaCat, "no", true), "a released oil or stevia No does not hold again");
assert(rc.shouldHold(maltoSeed, "no", false), "maltodextrin No holds");

assert(rc.holdLocation("Good", "") === "QA-HOLD", "empty dock location becomes QA-HOLD");
assert(rc.holdLocation("Good", "A-01-L1") === "QA-HOLD", "a bin is not used for a COA hold");
assert(rc.holdLocation("Quarantine", "A-01-L1") === "QUARANTINE", "quarantine condition stays quarantine");
assert(rc.holdLocation("Good", "QA-HOLD") === "QA-HOLD", "already on QA-HOLD");
assert(rc.COA_HOLD_REASON.indexOf("COA not received at the dock") === 0, "hold reason");

var kept = rc.releaseRecord({
  coa_received: "no",
  coa_note: "folder empty",
  coa_by: "Adriana",
  coa_at: "2026-11-03T18:00:00.000Z"
}, "Brittney", "2026-11-04T16:00:00.000Z", "");
assert(kept.coa_received === "no", "release keeps No");
assert(kept.coa_note === "folder empty" && kept.coa_by === "Adriana", "release keeps the dock note and who marked it");
assert(kept.coa_release_note === "Quality released" && kept.coa_released_by === "Brittney", "release note");
assert(rc.releaseRecord({ coa_received: "no", coa_note: "x" }, "Quality", "t", "checked the folder").coa_release_note === "Quality released. checked the folder", "extra release note");

var stock = [{ item_id: "MALTO", location: "QA-HOLD", lot: "M-1", qty: 50, coa_received: "no", coa_note: "missing", coa_released_at: "" }];
var recv = [{ id: "r1", item_id: "MALTO", lot: "M-1", recv_date: "2026-11-03", coa_received: "yes" }];
var hit = rc.resolveCoa(stock[0], maltoSeed, stock, recv);
assert(hit.received === "no" && hit.note === "missing", "stock answer wins");
var fromLog = rc.resolveCoa({ item_id: "MALTO", lot: "M-1", qty: 50, coa_received: "" }, maltoSeed, stock, recv);
assert(fromLog.received === "yes" && fromLog.recvId === "r1", "log answer fills a blank lot");
var sharedLot = [
  { id: "dill", item_id: "SEAS-DILL", lot: "J1926", recv_date: "2026-11-04", coa_received: "yes" },
  { id: "pep", item_id: "SEAS-PEP", lot: "J1926", recv_date: "2026-11-04", coa_received: "no" }
];
var pepper = { id: "SEAS-PEP", code: "SEAS-PEP", category: "seasoning", name: "Cracked Pepper" };
var sharedHit = rc.resolveCoa({ item_id: "SEAS-PEP", lot: "J1926", qty: 12, coa_received: "" }, pepper, [], sharedLot);
assert(sharedHit.received === "no" && sharedHit.recvId === "pep", "a shared lot does not take the other item COA");
assert(rc.linesFor(bag, [{ item_id: "B4-S03", location: "QA-HOLD", lot: "F", qty: 4, coa_received: "no" }], []).length === 0, "no finished-goods lines");
assert(rc.linesFor(maltoSeed, stock, recv).length === 1 && rc.linesFor(maltoSeed, stock, recv)[0].onHold, "floor line shows the hold");

var src = read("raw-coa.js");
var db = read("db.js");
var sw = read("service-worker.js");
var html = read("index.html");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em dash");
assert(src.indexOf('type="file"') < 0 && src.indexOf("application/pdf") < 0, "file upload stays in coa-docs.js");
assert(src.indexOf("Attach the COA") >= 0, "hint points at the file attach");
assert(src.indexOf("oil, or stevia") >= 0 && src.indexOf("aceite o stevia") >= 0 && src.indexOf("oleo ou stevia") >= 0, "hints name oil and stevia");
assert(src.indexOf("not auto-held") < 0 && src.indexOf("isCoaItem(it) && !isOilOrStevia") < 0, "ui hold includes oil and stevia");
assert(db.indexOf("recorded only") < 0 && db.indexOf("coaTracked(it) && !coaIsOilStevia") < 0, "db hold includes oil and stevia");
assert(src.indexOf("allowRelease") >= 0, "release asks the file store first");
assert(db.indexOf("async function setRawCoa") >= 0, "db stamp");
assert(db.indexOf("async function placeRawCoaHold") >= 0, "qa hold helper");
assert(db.indexOf("async function releaseRawCoa") >= 0, "release helper");
assert(db.indexOf("Does not write coa_received") >= 0, "release leaves the answer column alone");
assert(db.indexOf('coa_received: value || null') >= 0, "answer column");
assert(db.indexOf("COA not received at the dock") >= 0, "hold log reason");
assert(db.indexOf('from: "RECEIVING", to: "QA-HOLD"') < 0, "move is not hardcoded as a string pair");
assert(db.indexOf('"QA-HOLD"') >= 0 && db.indexOf("hold_log") >= 0, "uses QA-HOLD and the hold log");
assert(db.indexOf("fn_apply_delta") >= 0, "stock moves stay on the existing delta helper");
assert(src.indexOf("fn_apply_delta") < 0, "ui module does not call the delta rpc");
assert(sw.indexOf('const CACHE = "smackin-inv-v296"') >= 0 && sw.indexOf("./raw-coa.js") >= 0, "cache and asset");
assert(html.indexOf("raw-coa.js?b=5") >= 0, "script bust");
assert(html.indexOf("coa-docs.js?b=2") >= 0, "coa docs script");
assert(html.indexOf('var EMBEDDED = "smackin-inv-v296"') >= 0, "embedded build");
assert(read("build-id.txt").trim() === "smackin-inv-v296", "build id");
assert(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v296"') >= 0, "escape build");
assert(html.indexOf("db.js?b=103") >= 0, "db bust");
assert(read("receiving-sop.js").indexOf("afterHoldLogReleased") >= 0, "hold log release notifies COA");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("raw-coa ok");

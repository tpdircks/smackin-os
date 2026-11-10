#!/usr/bin/env node
/* QUARANTINE and QA-HOLD stock shows on the HOLD log even with no receipt.
   Releasing it moves that location. A blank raw expiration warns and does not block. */
"use strict";

var fs = require("fs");
var path = require("path");
var sop = require("../receiving-sop.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

var jal = { id: "TMP-SEAS-BCJALAP", name: "Bacon Type Jalapeno Popper" };
var stock = [{ item_id: "TMP-SEAS-BCJALAP", location: "QUARANTINE", lot: "#2-160510", qty: 1000, expires_on: null, updated_at: "2026-11-10T09:23:51Z" }];
var open = sop.stockHoldRows(stock, [jal], [], { onlyMissing: true });
assert(open.length === 1 && open[0].status === "held" && open[0].lot === "#2-160510", "quarantine stock is an open hold");
assert(open[0].hold_qty === 1000 && open[0]._location === "QUARANTINE", "qty and location");
assert(open[0].hold_reason.indexOf("Not a receipt") >= 0, "not a fake receipt");
assert(open[0].id.indexOf("stk:") === 0 && open[0]._stock === true, "synthetic until a hold_log row exists");
assert(sop.dispositionByValue({ held_by: "sync backfill" }) === "", "backfill does not sign the disposition");
assert(sop.qualityReleaseUser("Brittney.Christensen@smackinsnacks.com"), "Brittney can release a hold");
assert(sop.qualityReleaseUser("monica.smith@smackinsnacks.com") && sop.qualityReleaseUser("troy.dircks@smackinsnacks.com"), "Monica and Troy can release a hold");
assert(!sop.qualityReleaseUser("adriana@smackinsnacks.com") && !sop.qualityReleaseUser(""), "other staff still need the inventory PIN");
global.SMK_USER_EMAIL = "brittney.christensen@smackinsnacks.com";
assert(sop.qualityActor() === "brittney.christensen@smackinsnacks.com", "signed-in Quality email is the actor");
assert(sop.dispositionByValue({ held_by: "sync backfill" }) === "brittney.christensen@smackinsnacks.com", "her name prefills the disposition");
global.SMK_USER_EMAIL = "";
assert(sop.qualityActor() === "", "no session is not a Quality release");
assert(sop.stockOriginLocation({ hold_reason: "Sync backfill. Stock was already in QUARANTINE. Not a receipt." }) === "QUARANTINE", "backfill location");

var covered = sop.stockHoldRows(stock, [jal], [{
  id: "h1", status: "held", item_id: "TMP-SEAS-BCJALAP", lot: "#2-160510",
  hold_reason: "Sync backfill. Stock was already in QUARANTINE. Not a receipt. No receiving log was created.",
  held_by: "sync backfill"
}], { onlyMissing: true });
assert(covered.length === 0, "an open sync backfill hold covers the stock row");

var otherItem = sop.stockHoldRows(stock, [jal], [{
  id: "h2", status: "held", item_id: "OTHER", lot: "#2-160510", hold_reason: "COA not received at the dock"
}], { onlyMissing: true });
assert(otherItem.length === 1, "another item does not cover this lot");

var qa = [{ item_id: "SEED-BROWN", location: "QA-HOLD", lot: "26230H17", qty: 550, expires_on: "" }];
var both = sop.stockHoldRows(stock.concat(qa), [jal, { id: "SEED-BROWN", name: "Sunflower Seed" }], [], { onlyMissing: false });
assert(both.length === 2, "QA-HOLD is listed too");
var good = sop.stockHoldRows([{ item_id: "TMP-SEAS-BCJALAP", location: "RECEIVING", lot: "#2-160510", qty: 1000 }], [jal], [], { onlyMissing: false });
assert(good.length === 0, "RECEIVING is not a hold");

var db = read("db.js");
var sync = read("inv-sync-1106.js");
var apply = read("scripts/apply-inv-sync-1106.js");
var sql = read("supabase/migrations/20261110200000_quarantine_hold_log.sql");
var trace = read("trace.js");
var app = read("app.js");
assert(db.indexOf("async function settleStockHold") >= 0 && db.indexOf("async function releaseHeldQty") >= 0, "release writes the hold and moves stock");
assert(db.indexOf('from: "QUARANTINE"') < 0, "location is chosen, not a fixed pair");
assert(db.indexOf("receiving_log_id: null") >= 0, "stock holds do not invent a receipt");
assert(db.indexOf("keepDestExp") >= 0, "an existing expiration is copied, a blank one is not invented");
assert(sync.indexOf("holdSpecForAction") >= 0 && sync.indexOf("ensureQuarantineHold") >= 0, "lot sync creates the hold");
assert(apply.indexOf("ensureQuarantineHold") >= 0, "apply script creates the hold");
assert(sql.indexOf("QUARANTINE") >= 0 && sql.indexOf("receiving_log_id") >= 0 && sql.indexOf("Not a receipt") >= 0, "trigger covers later stock writes");
assert(sql.indexOf("sync backfill") < 0, "the trigger is not the one-time backfill");
assert(trace.indexOf("qaStockRows") >= 0 && trace.indexOf("Quality release") >= 0, "QA Hold lists stock");
assert(app.indexOf("settleStockHold") >= 0 && app.indexOf("confirmRelease") >= 0, "release to good stock warns and records the hold");
assert(app.indexOf("qualityHoldRelease") >= 0 && app.indexOf('fn === "qaConvert" && qualityHoldRelease') >= 0, "quarantine release skips the inventory PIN for Quality");
assert(app.indexOf('"qaScrap"') >= 0 && app.indexOf("ensureUnlocked") >= 0, "scrap and other edits still ask for the PIN");
assert(read("receiving-sop.js").indexOf("SMK_UNLOCK") < 0 && read("trace.js").indexOf("SMK_UNLOCK") < 0 && read("raw-coa.js").indexOf("SMK_UNLOCK") < 0, "HOLD log, QA Hold, and COA release do not open the inventory PIN");
assert(read("receiving-sop.js").indexOf("visibleHolds") >= 0, "HOLD log includes stock with no receipt");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("hold release ok");

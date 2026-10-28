#!/usr/bin/env node
/* Invariants for the WIP mixing approval ship. */
"use strict";

var fs = require("fs");
var vm = require("vm");
var path = require("path");

var root = path.resolve(__dirname, "..");
var ctx = { window: {}, globalThis: null };
ctx.globalThis = ctx.window;
vm.runInNewContext(fs.readFileSync(path.join(root, "recipes.js"), "utf8"), ctx, { filename: "recipes.js" });
vm.runInNewContext(fs.readFileSync(path.join(root, "mixing-recipes.js"), "utf8"), ctx, { filename: "mixing-recipes.js" });

var R = ctx.window.RECIPES;
var M = ctx.window.MXR;
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }

eq(Object.keys(R).length === 54, "expected 54 recipes");
eq(ctx.window.WIP_APPROVED_MISSING && ctx.window.WIP_APPROVED_MISSING.length >= 20, "missing list");

function seas(key) { return R[key].seas_lbs; }
function malto(key) { return R[key].malto_lbs; }

eq(seas("garlicparmesan") === 6.5, "garlic parm rate");
eq(malto("garlicparmesan") === 3, "garlic parm malt");
eq(R.garlicparmesan.approved_sample === "S0496", "garlic sample");
eq(R.garlicparmesan.wip_lbs_per_batch === 7.05, "garlic sheet lbs");
eq(!R.garlicparmesan.seas_source, "garlic was not filled");

eq(seas("dillpickle") === 5.5, "dill rate");
eq(seas("crackedpepper") === 2, "pepper rate");
eq(seas("birthdaycake") === 9.5, "birthday rate");
eq(seas("ranch") === 7, "ranch rate");
eq(seas("maplebrownsugar") === 7, "maple rate");
eq(R.maplebrownsugar.wip_lbs_per_batch === 7.5, "maple sheet");
eq(R.maplebrownsugar.wip_rate_from === "RECIPE-INGREDIENTS LIST", "maple source");
eq(seas("teriyaki") === 6, "teriyaki rate");
eq(seas("strawberrycheesecake") === 9.75, "strawberry rate");

["chipotleranch", "friedchicken", "dijonranch", "jalapenoranch", "dillranchgoodgood", "honeymustardkonnorgriffin", "frenchonionsoup"].forEach(function (key) {
  eq(R[key].seas_lbs != null, key + " filled");
  eq(R[key].seas_source && R[key].seas_source.indexOf("WIP Approved Recipes") === 0, key + " source");
  eq(Number(R[key].seas_lbs) === Number(R[key].wip_lbs_per_batch), key + " matches sheet");
  eq(!M.badgeText(R[key]), key + " should not differ from itself");
});
eq(R.chipotleranch.approved_sample === "S0405", "chipotle latest sample");
eq(R.chipotleranch.seas_lbs === 5.51, "chipotle lbs");
eq(R.frenchonionsoup.seas_lbs === 5.51, "french onion lbs");
eq(R.honeymustardkonnorgriffin.seas_lbs === 8.6, "honey mustard lbs");
eq(R.dijonranch.seas_lbs === 7.05, "dijon lbs");
eq(seas("flamegrilledsteak") == null, "flame grilled stays blank");
eq(seas("pumpkinspice") == null, "pumpkin seasoning stays blank");
eq(malto("pumpkinspice") == null, "pumpkin malt stays blank");

Object.keys(R).forEach(function (key) {
  eq(malto(key) !== 2, key + " malt was not changed to 2");
});

eq(M.approvalLine(R.garlicparmesan) === "Approved: S0496 Life Spice, Matt 08/10/26", "approval line");
eq(M.badgeText(R.garlicparmesan) === "WIP differs: 7.05 vs 6.5 lb", "garlic badge");
eq(M.badgeText(R.dillpickle) === "WIP differs: 7.05 vs 5.5 lb", "dill badge");
eq(M.badgeText(R.crackedpepper) === "WIP differs: 7.05 vs 2 lb", "pepper badge");
eq(M.badgeText(R.ranch) === "WIP differs: 5.95 vs 7 lb", "ranch badge");
eq(M.badgeText(R.maplebrownsugar) === "WIP differs: 7.5 vs 7 lb", "maple badge");
eq(M.badgeText(R.birthdaycake) === "", "birthday under 0.3");
eq(M.badgeText(R.teriyaki) === "", "teriyaki under 0.3");
eq(M.badgeText(R.koreanbbq) === "", "korean under 0.3");
eq(M.maltNote(R.garlicparmesan).indexOf("OS malt is 3.0 lb") >= 0, "malt note");
eq(M.maltNote(R.birthdaycake) === "", "birthday has no ingredients malt");

var card = M.cardHtml(R.garlicparmesan, 100);
eq(card.indexOf("WIP differs: 7.05 vs 6.5 lb") >= 0, "card badge");
eq(card.indexOf("Approved: S0496 Life Spice, Matt 08/10/26") >= 0, "card approval");
eq(card.indexOf("\u2014") < 0, "card em dash");

var files = ["mixing-recipes.js", "scripts/wip-recipe-approvals.py", "scripts/apply-wip-recipes.js", "scripts/check-wip-recipes.js"];
files.forEach(function (rel) {
  var text = fs.readFileSync(path.join(root, rel), "utf8");
  eq(text.indexOf("\u2014") < 0 && text.indexOf("\u2013") < 0, rel + " dash");
});
var added = fs.readFileSync(path.join(root, "recipes.js"), "utf8");
eq(added.indexOf("\u2014") < 0 && added.indexOf("\u2013") < 0, "recipes.js dash");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok", Object.keys(R).length, "recipes,", ctx.window.WIP_APPROVED_MISSING.length, "not in OS");

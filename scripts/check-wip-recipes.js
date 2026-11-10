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

eq(Object.keys(R).length === 69, "expected 69 recipes");
eq(ctx.window.WIP_APPROVED_MISSING && ctx.window.WIP_APPROVED_MISSING.length === 11, "missing list");
eq(!ctx.window.WIP_APPROVED_MISSING.some(function (row) { return /brisket/i.test(row.name || ""); }), "brisket is a recipe, not a missing approval");

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
eq(seas("strawberrycheesecake") === 9, "strawberry rate");

["friedchicken", "dijonranch", "jalapenoranch", "dillranchgoodgood", "honeymustardkonnorgriffin", "frenchonionsoup"].forEach(function (key) {
  eq(R[key].seas_lbs != null, key + " filled");
  eq(R[key].seas_source && R[key].seas_source.indexOf("WIP Approved Recipes") === 0, key + " source");
  eq(Number(R[key].seas_lbs) === Number(R[key].wip_lbs_per_batch), key + " matches sheet");
  eq(!M.badgeText(R[key]), key + " should not differ from itself");
});
eq(R.chipotleranch.approved_sample === "S0405", "chipotle latest sample");
eq(R.chipotleranch.seas_lbs === 7, "chipotle lbs");
eq(R.chipotleranch.wip_lbs_per_batch === 5.51, "chipotle sheet lbs");
eq(M.badgeText(R.chipotleranch) === "WIP differs: 5.51 vs 7 lb", "chipotle differs from the sheet");
eq(R.frenchonionsoup.seas_lbs === 5.51, "french onion lbs");
eq(R.honeymustardkonnorgriffin.seas_lbs === 8.6, "honey mustard lbs");
eq(R.dijonranch.seas_lbs === 7.05, "dijon lbs");
eq(seas("flamegrilledsteak") === 5.75, "flame grilled rate");
eq(R.flamegrilledsteak.name === "Flame-Grilled Steak", "flame grilled name");
eq(R.chilelimon.name === "Chili Lime" && R.chilelimon.seas_lbs === 6 && R.chilelimon.malto_lbs === 3 && R.chilelimon.allergen_level === "A1", "chili lime raw class and pounds stay");
eq(R.chilelimon.fg_allergen_level === "A2" && R.chilelimon.fg_allergens === "Milk", "chili lime finished good is Milk");
eq(R.loadednacho.allergen_level === "A3" && R.loadednacho.seas_lbs === 6, "loaded nacho class and pounds");
eq(R.frenchonionsoup.allergen_level === "A1" && R.frenchonionsoup.malto_lbs == null, "french onion A1 and blank malt");
eq(R.baconjalapeno.allergen_level === "A2", "bacon jalapeno stays A2");
eq(R.smokedbrisket.allergen_level === "A3" && R.smokedbrisket.allergens === "Milk, Soy" && R.smokedbrisket.seas_lbs === 7, "retired brisket keeps Milk, Soy");
eq(R.chilelimon.oil === "None" && R.chilelimon.stevia === "None", "chili lime none keys");
eq(R.backyardbbq.oil === "2 oz" && R.backyardbbq.stevia === "None", "bbq oil stays");
eq(R.maplebrownsugar.stevia === "2 lbs", "maple stevia stays");
eq(seas("pumpkinspice") == null, "pumpkin seasoning stays blank");
eq(malto("pumpkinspice") == null, "pumpkin malt stays blank");
eq(R.pumpkinspice.status === "unassigned" && R.pumpkinspice.name === "Not Assigned" && R.pumpkinspice.former_name === "Pumpkin Spice", "pumpkin is unassigned");
eq(R.pumpkinspice.oil === "None" && !R.pumpkinspice.stevia, "pumpkin oil none only");
eq(R.frenchonionsoup.malto_lbs == null, "L52 malt stays blank");
eq(R.nashvillehot.status === "retired" && R.nashvillehot.successor === "L58", "A01 retired");
eq(R.smokedbrisket.status === "retired" && R.smokedbrisket.successor === "L60", "A11 retired");
eq(R.birthdaycake.status === "retired" && R.birthdaycake.successor === "L57" && R.birthdaycake.allergen_level === "A3", "A18 retired");
eq(R.spicydillpickle.status === "retired" && !R.spicydillpickle.successor, "A19 retired");
eq(R.mexicanstreetcorn.status === "retired" && R.mexicanstreetcorn.successor === "L59", "A23 retired");
eq(R.l58nashvillehot.status === "active" && R.l58nashvillehot.name === "Nashville Hot", "L58 is the live Nashville Hot");
eq(R.everythingbagel.status === "incomplete" && R.everythingbagel.allergen_level === "A3", "L67 stays incomplete");
eq(!M.isLive(R.pumpkinspice) && !M.isLive(R.nashvillehot) && M.isLive(R.l58nashvillehot) && M.isLive(R.everythingbagel), "mixing list drops retired and unassigned");
eq(ctx.window.RECIPE_LOOKUP("Nashville Hot").code === "L58", "name lookup prefers the active code");
eq(ctx.window.RECIPE_LOOKUP("A01").code === "A01", "retired code still resolves");
eq(ctx.window.RECIPE_LOOKUP("Pumpkin Spice").code === "L51", "former name still resolves");

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

#!/usr/bin/env node
/* Apply a WIP recipe patch onto recipes.js.
   Fills seas_lbs only where it is null. Never changes malto_lbs.
   Never replaces a seasoning amount that already has a number. */
"use strict";

var fs = require("fs");
var vm = require("vm");
var path = require("path");

var root = path.resolve(__dirname, "..");
var recipesPath = path.join(root, "recipes.js");
var patchPath = process.argv[2] || "/tmp/wip-recipe-patch.json";

var FIELD_ORDER = [
  "approved_sample", "flavor_house", "vendor_item", "approved_by", "approved_date",
  "approved_text", "wip_sheet_flavor", "wip_g_per_lb", "wip_lbs_per_batch",
  "wip_rate_from", "wip_ing_lbs_per_batch", "wip_malt_lbs", "wip_seed_cell", "seas_source"
];
var FIELD_RE = /^  "(approved_sample|approved_by|approved_date|approved_text|flavor_house|vendor_item|wip_sheet_flavor|wip_g_per_lb|wip_lbs_per_batch|wip_rate_from|wip_ing_lbs_per_batch|wip_malt_lbs|wip_seed_cell|seas_source)":/;

function loadRecipes(src) {
  var ctx = { window: {} };
  vm.runInNewContext(src, ctx, { filename: "recipes.js" });
  return ctx.window;
}

function lit(v) {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return String(v);
  }
  return JSON.stringify(v);
}

function blockBounds(src, key) {
  var token = '"' + key + '": {';
  var start = src.indexOf(token);
  if (start < 0) throw new Error("No recipe block for " + key);
  var close = src.indexOf("\n }", start);
  if (close < 0) throw new Error("No block end for " + key);
  return { start: start, end: close + "\n }".length };
}

function fmtLb(n) {
  var x = Math.round(Number(n) * 100) / 100;
  var s = x.toFixed(2);
  if (s.slice(-2) === "00") return s.slice(0, -3);
  if (s.slice(-1) === "0") return s.slice(0, -1);
  return s;
}

function applyBlock(block, key, entry, cur) {
  var fields = {};
  Object.keys(entry.fields || {}).forEach(function (k) { fields[k] = entry.fields[k]; });
  var fill = false;
  if (entry.fill_from_approved && fields.wip_g_per_lb != null && fields.approved_sample) {
    if (cur.seas_lbs == null) fill = true;
    else if (cur.seas_source && Number(cur.seas_lbs) === Number(fields.wip_lbs_per_batch)) fill = true;
  }
  if (fill) fields.seas_source = "WIP Approved Recipes " + fields.approved_sample;

  var lines = block.split("\n").filter(function (line) { return !FIELD_RE.test(line); });
  if (fill && cur.seas_lbs == null) {
    var desc = fmtLb(fields.wip_lbs_per_batch) + " lbs " + String(cur.name || key).replace(/\s+/g, " ").trim();
    lines = lines.map(function (line) {
      if (/^  "seas_lbs": null,?$/.test(line)) return '  "seas_lbs": ' + lit(fields.wip_lbs_per_batch) + ",";
      if (/^  "seas_desc": null,?$/.test(line)) return '  "seas_desc": ' + JSON.stringify(desc) + ",";
      return line;
    });
  }

  var body = lines.slice();
  while (body.length && body[body.length - 1].trim() === "") body.pop();
  var close = body.pop();
  if (close !== " }") throw new Error("Unexpected close for " + key + ": " + close);
  var last = body.length - 1;
  while (last > 0 && body[last].trim() === "") last--;
  if (!/,\s*$/.test(body[last]) && !/\{\s*$/.test(body[last])) body[last] = body[last] + ",";

  var keys = FIELD_ORDER.filter(function (k) { return fields[k] != null && fields[k] !== ""; });
  keys.forEach(function (k, i) {
    var comma = i === keys.length - 1 ? "" : ",";
    body.push('  "' + k + '": ' + lit(fields[k]) + comma);
  });
  body.push(" }");
  return body.join("\n");
}

function missingSource(list) {
  var clean = list.map(function (row) {
    var o = {};
    ["name", "approved_sample", "flavor_house", "vendor_item", "approved_by", "approved_date", "approved_text", "wip_g_per_lb", "wip_lbs_per_batch", "earlier"].forEach(function (k) {
      if (row[k] != null && row[k] !== "") o[k] = row[k];
    });
    return o;
  });
  return "/* Approved Recipes flavors with no production recipe in Smackin OS. */\nwindow.WIP_APPROVED_MISSING = " + JSON.stringify(clean, null, 1) + ";\n";
}

function main() {
  var patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));
  var src = fs.readFileSync(recipesPath, "utf8");
  var beforeWin = loadRecipes(src);
  var before = beforeWin.RECIPES;
  var keys = Object.keys(patch.recipes || {});
  keys.forEach(function (key) {
    if (!before[key]) throw new Error("Patch key is not a production recipe: " + key);
  });

  var next = src;
  keys.forEach(function (key) {
    var bounds = blockBounds(next, key);
    var block = next.slice(bounds.start, bounds.end);
    var updated = applyBlock(block, key, patch.recipes[key], before[key]);
    next = next.slice(0, bounds.start) + updated + next.slice(bounds.end);
  });

  if (next.indexOf("WIP Approved Recipes fields are optional") < 0) {
    next = next.replace(
      "   BATCH MODEL: 100 lb seed = 1 batch. 4oz bags per batch=400; 1.5oz bags per batch=1067. */",
      "   BATCH MODEL: 100 lb seed = 1 batch. 4oz bags per batch=400; 1.5oz bags per batch=1067.\n   WIP Approved Recipes fields are optional and do not replace a seasoning or malt amount that already has a number. */"
    );
  }

  var missingJs = missingSource(patch.missing || []);
  var missingRe = /\/\* Approved Recipes flavors with no production recipe in Smackin OS\. \*\/\nwindow\.WIP_APPROVED_MISSING = \[[\s\S]*?\];\n/;
  if (missingRe.test(next)) next = next.replace(missingRe, missingJs);
  else next = next.replace("window.RECIPE_LOOKUP = function(name){", missingJs + "window.RECIPE_LOOKUP = function(name){");

  var afterWin = loadRecipes(next);
  var after = afterWin.RECIPES;
  if (Object.keys(after).length !== Object.keys(before).length) {
    throw new Error("Recipe count changed");
  }
  var filled = [];
  Object.keys(before).forEach(function (key) {
    if (before[key].malto_lbs !== after[key].malto_lbs) {
      throw new Error("malto_lbs changed for " + key);
    }
    var had = before[key].seas_lbs;
    var now = after[key].seas_lbs;
    if (had != null && now !== had) throw new Error("seas_lbs overwritten for " + key + " (" + had + " -> " + now + ")");
    if (had == null && now != null) {
      if (!after[key].seas_source) throw new Error("Filled " + key + " without seas_source");
      if (Number(now) !== Number(after[key].wip_lbs_per_batch)) throw new Error("Filled " + key + " does not match the sheet rate");
      filled.push(key + " " + now + " " + after[key].seas_source);
    }
  });
  if (!afterWin.WIP_APPROVED_MISSING || !afterWin.WIP_APPROVED_MISSING.length) {
    throw new Error("Missing-flavor list was not written");
  }

  fs.writeFileSync(recipesPath, next);
  console.log("updated", recipesPath);
  console.log("filled", filled.length);
  filled.sort().forEach(function (line) { console.log("  " + line); });
  console.log("missing", afterWin.WIP_APPROVED_MISSING.length);
}

main();

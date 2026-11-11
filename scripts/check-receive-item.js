#!/usr/bin/env node
/* Receive item entry. No network. No browser.
   Nov 4 2026: picking a box, lid, label, or maltodextrin rewrote the
   expiration label on every paint. The #view observer ran that paint again
   and the tab never took another click or refresh. Seasoning, oil, and
   finished bags did not show that field, so they stayed usable. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var api = require(path.join(root, "pack-receive.js"));

assert(api.setText({ textContent: "Expiration date" }, "Expiration date") === false, "same label does not write");
var changed = { textContent: "Expiration date" };
assert(api.setText(changed, "Fecha de vencimiento") === true && changed.textContent === "Fecha de vencimiento", "language change writes once");
assert(api.setText(null, "Expiration date") === false, "missing node does not write");

function fight(write) {
  var label = { textContent: "Expiration date" };
  var hint = { textContent: "Boxes, buckets, lids, sleeves, labels, and other packaging. Same lot and date as a raw receipt." };
  var steps = 0;
  function paint() {
    steps++;
    if (steps > 6) return { hung: true, steps: steps };
    var mutated = write(label, "Expiration date") || write(hint, hint.textContent);
    if (mutated) return paint();
    return { hung: false, steps: steps };
  }
  return paint();
}
function alwaysWrite(el, text) {
  el.textContent = text;
  return true;
}
var locked = fight(alwaysWrite);
var held = fight(api.setText);
assert(locked.hung === true && locked.steps === 7, "unguarded label write locks the page " + JSON.stringify(locked));
assert(held.hung === false && held.steps === 1, "guarded label write stops " + JSON.stringify(held));

var box = { category: "packaging" };
var malto = { category: "adhesion" };
var seasoning = { category: "seasoning" };
var oil = { category: "oil" };
var bag = { category: "bag4" };
assert(api.isPackItem(box) && api.isPackItem(malto), "box and maltodextrin open the packaging date");
assert(!api.isPackItem(seasoning) && !api.isPackItem(oil) && !api.isPackItem(bag), "seasoning, oil, and bags do not");
assert(api.isFinishedCat("cashews") && api.isFinishedCat("dollartree275") && api.isFinishedCat("DOLLAR TREE 275"), "cashews and dollar tree bags are finished");
assert(!api.isPackItem({ category: "cashews" }) && !api.isPackItem({ category: "dollartree275" }), "cashews and dollar tree bags are not packaging");

var src = read("pack-receive.js");
var html = read("index.html");
var sw = read("service-worker.js");
assert(src.indexOf("function setText") >= 0, "guard exists");
assert(src.indexOf('label.textContent = tx("exp")') < 0, "label write is guarded");
assert(src.indexOf('hint.textContent = tx("expHint")') < 0, "hint write is guarded");
assert(src.indexOf('setText(label, tx("exp"))') >= 0, "label uses setText");
assert(src.indexOf('setText(hint, tx("expHint"))') >= 0, "hint uses setText");
assert(html.indexOf('src="pack-receive.js?b=4"') >= 0, "receive cache bust");
assert(sw.indexOf('const CACHE = "smackin-inv-v312"') >= 0, "cache");
assert(read("build-id.txt").trim() === "smackin-inv-v312", "build id");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "dash");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("receive item checks ok; the Receive click-through still needs a browser");

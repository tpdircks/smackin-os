#!/usr/bin/env node
/* Signed-in identity replaces the Troy fallback when a screen has no operator field.
   Historical rows are not rewritten. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var app = fs.readFileSync(path.join(root, "app.js"), "utf8");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }

var start = app.indexOf("function operatorIdentity(");
var end = app.indexOf("function signedInIdentity(");
eq(start > 0 && end > start, "operatorIdentity is defined");
var src = app.slice(start, end);
var sandbox = {};
vm.runInNewContext(src + "\nthis.operatorIdentity = operatorIdentity;", sandbox);
var id = sandbox.operatorIdentity;
eq(id("", "fulfillment@smackinsnacks.com") === "fulfillment@smackinsnacks.com", "email when no dropdown");
eq(id("   ", "fulfillment@smackinsnacks.com") === "fulfillment@smackinsnacks.com", "blank dropdown uses the session");
eq(id("Jesus", "fulfillment@smackinsnacks.com") === "Jesus", "a chosen operator still wins");
eq(id("", "") === "", "no session and no field stays blank for the caller");

eq(app.indexOf('return e ? e.value : "Troy"') < 0, "opVal no longer returns Troy just because the field is missing");
eq(app.indexOf("function opVal()") >= 0 && app.indexOf("signedInIdentity()") >= 0, "opVal asks who is signed in");
eq(app.indexOf("function opValFor(") >= 0, "opValFor uses the same rule");

function sliceFn(name, next) {
  var at = app.indexOf("function " + name);
  var to = app.indexOf("function " + next, at + 1);
  return app.slice(at, to);
}
var prod = sliceFn("viewProdLog", "fdEnsureDraft");
var ful = sliceFn("viewFulfillDaily", "isEcomItem");
eq(prod.indexOf('id="op"') < 0, "Daily Production has no operator dropdown");
eq(ful.indexOf('id="op"') < 0, "Daily Fulfillment has no operator dropdown");
eq(app.indexOf("DB.addProdPallet(rec, opVal())") >= 0, "pallet save still goes through opVal");
eq(app.indexOf("DB.saveFulfillmentDaily({ fdate: d.date, ecom_labels: ecom, amazon: amazon, notes: d.notes }, opVal())") >= 0, "fulfillment save still goes through opVal");
eq(app.indexOf('from("production_pallets").update') < 0 || app.indexOf("entered_by") >= 0, "no bulk rewrite marker required");
eq(prod.indexOf(".update(") < 0 && ful.indexOf("entered_by: \"Troy\"") < 0, "screens do not stamp Troy into old rows");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok operator identity");

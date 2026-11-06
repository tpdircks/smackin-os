#!/usr/bin/env node
/* A non-admin preset sees the same tabs as the manager list. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var app = read("app.js");
var api = require(path.join(root, "role-tabs.js"));
var m = app.match(/const TABS = (\[[\s\S]*?\]);/);
eq(!!m, "tabs array");
var tabs = JSON.parse(m[1].replace(/;$/, ""));
var troy = api.visibleFor("all", tabs);

["receiving", "production", "mixing", "pmac", "rnd"].forEach(function (role) {
  var got = api.visibleFor(role, tabs);
  eq(got.join("|") === troy.join("|"), role + " matches manager");
  eq(api.BEFORE[role].length < troy.length, role + " used to be shorter");
  eq(api.BEFORE[role].every(function (id) { return troy.indexOf(id) >= 0; }), role + " old tabs still exist");
});
eq(api.visibleFor("adriana", tabs).join("|") === troy.join("|"), "named operator is not a narrower role");
eq(troy.indexOf("history") >= 0 && troy.indexOf("receive") >= 0 && troy.indexOf("prodlog") >= 0, "history, dock, pallet log");
eq(app.indexOf("ROLE_TABS[prefs.role]") < 0, "preset is not applied");
eq(app.indexOf("EDIT_PIN") >= 0 && app.indexOf("PURCH_PIN") >= 0, "edit pins stay");
eq(app.indexOf('["saveAdjust","ordAdd"') >= 0, "pin wrap list stays");
eq(read("role-tabs.js").indexOf("\u2014") < 0, "no em dash");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok role tabs " + troy.length);

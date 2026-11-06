#!/usr/bin/env node
/* Password recovery UI: PASSWORD_RECOVERY + type=recovery hash -> set password. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var gate = read("auth-gate.js");
var html = read("index.html");

eq(gate.indexOf("PASSWORD_RECOVERY") >= 0, "listens for PASSWORD_RECOVERY");
eq(gate.indexOf("type=recovery") >= 0, "detects type=recovery in URL");
var detect = gate.slice(gate.indexOf("function hashLooksLikeRecovery"), gate.indexOf("function recoveryHtml"));
eq(detect.indexOf("location.search") >= 0, "checks the query string");
eq(!/if\s*\(\s*!h\s*\)\s*return false/.test(detect), "empty hash still checks the query");
eq(gate.indexOf("type=recovery&") >= 0, "clears type=recovery from the query");
eq(/updateUser\(\s*\{\s*password\s*:/.test(gate), "calls updateUser({ password })");
eq(gate.indexOf("renderRecovery") >= 0 || gate.indexOf("Choose a new password") >= 0, "recovery form copy");
eq(gate.indexOf("smk-pass2") >= 0, "confirm password field");
eq(gate.indexOf("At least 8 characters") >= 0, "min length messaging");
eq(gate.indexOf("Passwords do not match") >= 0, "mismatch messaging");
eq(gate.indexOf("resetPasswordForEmail") >= 0, "forgot password still sends reset email");
eq(gate.indexOf("signInWithPassword") >= 0, "normal sign-in stays");
eq(gate.indexOf("Save new password") >= 0, "save button label");
eq(html.indexOf("auth-gate.js?b=3") >= 0, "auth-gate cache bust");
eq(gate.indexOf("\u2014") < 0 && gate.indexOf("\u2013") < 0, "no em dash");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok auth recovery");

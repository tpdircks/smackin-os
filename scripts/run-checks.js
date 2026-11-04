#!/usr/bin/env node
/* Run every scripts/check-*.js file. No browser. No network of its own.
   A check that shells out still does whatever that file already did. */
"use strict";

var fs = require("fs");
var path = require("path");
var spawn = require("child_process").spawnSync;

var root = path.resolve(__dirname, "..");
var dir = __dirname;
var syntax = ["app.js", "db.js", "coa-docs.js", "recv-match.js", "raw-coa.js", "service-worker.js", "sw-escape.js"];
var failed = 0;

syntax.forEach(function (rel) {
  var res = spawn(process.execPath, ["--check", path.join(root, rel)], { encoding: "utf8" });
  if (res.status === 0) {
    console.log("syntax ok  " + rel);
    return;
  }
  failed++;
  process.stderr.write(res.stderr || res.stdout || "");
  console.error("syntax FAIL " + rel);
});

var files = fs.readdirSync(dir).filter(function (name) {
  return /^check-.*\.js$/.test(name);
}).sort();

files.forEach(function (name) {
  var res = spawn(process.execPath, [path.join(dir, name)], { encoding: "utf8" });
  if (res.status === 0) {
    var line = String(res.stdout || "").trim().split("\n").pop();
    console.log("pass  " + name + (line ? "  " + line : ""));
    return;
  }
  failed++;
  process.stdout.write(res.stdout || "");
  process.stderr.write(res.stderr || "");
  console.error("FAIL  " + name + "  exit " + res.status);
});

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log(files.length + " checks passed");

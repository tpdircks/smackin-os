#!/usr/bin/env node
/* Department primary screens share the dashboard section grid. No network. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var boards = read("dept-boards.js");
var app = read("app.js");
var css = read("dept-density.css");
var html = read("index.html");
var sw = read("service-worker.js");

eq(sw.indexOf('const CACHE = "smackin-inv-v274"') >= 0, "cache");
eq(sw.indexOf("./dept-boards.js") >= 0, "worker caches boards");
eq(html.indexOf("dept-boards.js?b=1") >= 0, "script");
eq(html.indexOf("dept-density.css?b=2") >= 0, "density css");
eq(css.indexOf(".dept-board") >= 0 && css.indexOf(".dept-section") >= 0 && css.indexOf(".dept-grid") >= 0 && css.indexOf(".dept-span-full") >= 0, "shared utilities");
["purch", "inv", "mixing", "pmac", "ful"].forEach(function (id) {
  eq(boards.indexOf(id + ":") >= 0, "plan " + id);
});
eq(boards.indexOf("ordersRetail") >= 0 && boards.indexOf("ordersEcom") >= 0, "both lanes");
eq(boards.indexOf("fulSections") >= 0, "lane title switches");
eq(boards.indexOf('slots: ["lane"]') >= 0, "one lane card");
["floor", "health", "trend", "tabs", "poadd", "polist", "buy", "drafts", "setup", "today", "log", "makenext", "build", "allen", "scheduled", "results", "consume", "lane"].forEach(function (slot) {
  eq(app.indexOf('data-slot="' + slot + '"') >= 0, "slot " + slot);
});
eq(app.indexOf('data-slot="lane"') === app.lastIndexOf('data-slot="lane"'), "orders card is one slot");
eq(boards.indexOf(".insert(") < 0 && boards.indexOf(".update(") < 0 && boards.indexOf(".from(") < 0, "no writes");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok dept boards");

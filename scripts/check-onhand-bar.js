#!/usr/bin/env node
/* v327: On hand filter bar sticks to the top of the On hand card.
   The board card is its own scroll box, so the bar's top offset is
   measured from the card, not the window. No browser, no network. */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

var css = read("inventory-visual.css");
eq(/\.ivx-bar\s*\{[^}]*position:\s*sticky/.test(css), ".ivx-bar is position: sticky");
eq(css.indexOf(".dept-board[data-dept-board] .ivx-dashcard .ivx-bar { top: -16px; }") >= 0, "on-hand bar pins to the card top");

var density = read("dept-density.css");
var cardAt = density.indexOf(".dept-board[data-dept-board] > .dept-section > .card {");
eq(cardAt >= 0, "board card rule exists");
var cardBlock = cardAt >= 0 ? density.slice(cardAt, density.indexOf("}", cardAt)) : "";
eq(/overflow:\s*auto/.test(cardBlock), "board card is overflow:auto");

var html = read("index.html");
eq(html.indexOf("inventory-visual.css?b=4") >= 0, "index.html has inventory-visual.css?b=4");
eq(html.indexOf('var EMBEDDED = "smackin-inv-v327"') > 0, "index.html EMBEDDED is v327");
eq(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v327"') >= 0, "sw-escape.js EMBEDDED is v327");
eq(read("service-worker.js").indexOf('const CACHE = "smackin-inv-v327"') >= 0, "CACHE is smackin-inv-v327");
eq(read("build-id.txt").trim() === "smackin-inv-v327", "build-id is smackin-inv-v327");

if (failed) { console.log(failed + " on-hand bar check(s) failed"); process.exit(1); }
console.log("on-hand bar ok");

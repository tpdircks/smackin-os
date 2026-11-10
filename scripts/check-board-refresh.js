#!/usr/bin/env node
/* Board and work-order refresh must not rebuild the whole view. No network. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var app = read("app.js");
var wo = read("work-orders.js");
var timerAt = app.indexOf("boardDataTimer = setInterval");
eq(timerAt > 0, "board timer exists");
var timer = app.slice(timerAt, app.indexOf(";", timerAt) + 1);
eq(timer.indexOf("boardRefreshData") >= 0, "board timer calls a targeted refresh");
eq(timer.indexOf("render()") < 0, "board timer does not call full render");
eq(app.indexOf("function boardRefreshData()") >= 0, "targeted board refresh is defined");
eq(app.indexOf("wrap.outerHTML") >= 0, "board refresh replaces the board wrap only");
eq(app.indexOf('querySelector(".boardwrap")') >= 0, "board refresh finds the existing board");
eq(app.indexOf("$(\"view\").innerHTML") < 0 || app.indexOf("function boardRefreshData()") < app.indexOf("function render()"), "full view write stays in render");
var refreshFn = app.slice(app.indexOf("function boardRefreshData()"), app.indexOf("function viewBoard()"));
eq(refreshFn.indexOf("render()") < 0, "board refresh does not call render");
eq(refreshFn.indexOf("scrollTop") >= 0, "board refresh restores scroll");

var loadAt = wo.indexOf("function load(silent)");
var loadFn = wo.slice(loadAt, wo.indexOf("function onClick"));
eq(loadFn.indexOf("paintList()") >= 0, "silent list poll paints the list body");
eq(wo.indexOf("function paintList()") >= 0, "list paint helper exists");
var paint = wo.slice(wo.indexOf("function paintList()"), wo.indexOf("function render()"));
eq(paint.indexOf("wo-body") >= 0, "list paint targets wo-body");
eq(paint.indexOf("wo-root") < 0, "list paint does not rebuild wo-root");
eq(paint.indexOf("scrollTop") >= 0 && paint.indexOf("scrollTo") >= 0, "list paint restores scroll");
eq(refreshFn.indexOf("\u2014") < 0 && paint.indexOf("\u2014") < 0, "new refresh code has no em dash");
eq(wo.indexOf("\u2014") < 0, "work orders stay free of em dashes");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("board refresh ok");

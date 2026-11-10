#!/usr/bin/env node
/* Trace tab open. No network. No browser.
   The live Quality > Trace click still needs a browser: this file checks the
   paging helpers and the reclaim rule that was looping the page. */
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

var api = require(path.join(root, "trace.js"));

assert(api.PAGE === 1000, "page size");
assert(api.pageWindow(0, 1000).from === 0 && api.pageWindow(0, 1000).to === 999, "first page");
assert(api.pageWindow(1000, 1000).from === 1000 && api.pageWindow(1000, 1000).to === 1999, "second page");
assert(api.pageWindow(-5, 0).from === 0 && api.pageWindow(-5, 0).to === 999, "defaults");
assert(api.pageDone(1000, 1000) === false, "full page continues");
assert(api.pageDone(999, 1000) === true, "short page stops");
assert(api.pageDone(0, 1000) === true, "empty page stops");
assert(api.stillCurrent(3, 3) === true, "current load");
assert(api.stillCurrent(2, 3) === false, "cancelled load");

assert(api.reclaimAction(true, true, true) === "keep", "trace root stays");
assert(api.reclaimAction(true, false, true) === "release", "foreign screen releases trace");
assert(api.reclaimAction(true, false, false) === "once", "wiped view redraws once");
assert(api.reclaimAction(false, false, true) === "idle", "inactive trace stays out");
assert(api.viewIsForeign(["qa-root"], "") === true, "checklists are foreign");
assert(api.viewIsForeign(["trc-root"], "") === false, "trace root is not foreign");
assert(api.viewIsForeign(["trc-root"], "1") === false, "coa flag does not hide trace");
assert(api.viewIsForeign([], "1") === true, "coa library is foreign");

var burst = { n: 0, t: 0 };
var oks = [];
for (var i = 0; i < 5; i++) {
  burst = api.allowReclaim(burst, 5000);
  oks.push(burst.ok);
}
assert(oks.join(",") === "true,true,true,false,false", "reclaim burst stops " + oks.join(","));
var reset = api.allowReclaim(burst, 7001);
assert(reset.ok === true && reset.n === 1, "burst window resets");

// Checklist observer used to paint whenever #qa-root was missing, and Trace
// painted whenever #trc-root was missing. That pair never stopped.
function fight(qaStealsTrace) {
  var qa = true;
  var trace = true;
  var view = "trace";
  var steps = 0;
  while (steps < 8) {
    steps++;
    if (qa && view !== "qa" && (qaStealsTrace || view !== "trace")) view = "qa";
    var ids = [];
    if (view === "qa") ids.push("qa-root");
    if (view === "trace") ids.push("trc-root");
    var action = api.reclaimAction(trace, ids.indexOf("trc-root") >= 0, api.viewIsForeign(ids, ""));
    if (action === "keep" || action === "idle") return { hung: false, view: view, steps: steps, action: action };
    if (action === "release") return { hung: false, view: view, steps: steps, action: action, trace: false };
    view = "trace";
  }
  return { hung: true, steps: steps, view: view };
}
var guarded = fight(false);
assert(guarded.hung === false && guarded.view === "trace" && guarded.action === "keep", "guarded checklists leave trace up " + JSON.stringify(guarded));
var stolen = fight(true);
assert(stolen.hung === false && stolen.action === "release", "unguarded steal releases instead of looping " + JSON.stringify(stolen));
var left = fight(false);
left = (function () {
  var trace = true;
  var view = "trace";
  var action = api.reclaimAction(trace, true, api.viewIsForeign(["trc-root"], ""));
  return { hung: false, view: view, action: action };
})();
assert(left.view === "trace" && left.action === "keep", "after checklists release, trace stays");

var trace = read("trace.js");
var qa = read("qa-checklists.js");
var sqf = read("sqf-tasks.js");
var fg = read("fg-lots.js");
var html = read("index.html");
var sw = read("service-worker.js");
assert(trace.indexOf("function releaseOnLeave") >= 0, "trace leaves on main tabs");
assert(trace.indexOf("[data-dept-sub]") >= 0, "trace sees department tabs");
assert(trace.indexOf(".range(win.from, win.to)") >= 0, "paged read");
assert(trace.indexOf("abortSignal") >= 0, "paged read can be aborted");
assert(trace.indexOf("limit(20000)") < 0, "one-shot 20k read is gone");
assert(trace.indexOf('loadingRows: "Loading trace records..."') >= 0, "loading copy");
assert(qa.indexOf("[data-dept-sub]") >= 0, "checklists leave on main tabs");
assert(qa.indexOf('data-dept-sub") === "qacheck"') >= 0, "checklists stay on their own tab");
assert(qa.indexOf('"#trc-root, #sqf-root, #fgl-root, #btr-root, #fa-root, #cd-lot, #dept-home"') >= 0, "checklists do not repaint over trace");
assert(sqf.indexOf("[data-dept-sub]") >= 0 && fg.indexOf("[data-dept-sub]") >= 0, "other quality tabs leave too");
assert(html.indexOf('src="trace.js?b=21"') >= 0, "trace cache bust");
assert(html.indexOf('src="qa-checklists.js?b=3"') >= 0, "checklists cache bust");
assert(sw.indexOf('const CACHE = "smackin-inv-v299"') >= 0, "cache");
assert(read("build-id.txt").trim() === "smackin-inv-v299", "build id");
[trace, qa].forEach(function (src, i) {
  assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "dash " + i);
});

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("trace open checks ok; Quality > Trace click-through still needs a browser");

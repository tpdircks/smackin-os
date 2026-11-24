#!/usr/bin/env node
/* v322 simple layout: top tabs, More folds, Home jobs, short menu names.
   Loads dept-homes.js in a stub sandbox (no DOM work runs). No browser, no network. */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

var docStub = { body: null, getElementById: function () { return null; }, addEventListener: function () {}, documentElement: {} };
var sandbox = { window: {}, document: docStub, setTimeout: setTimeout, console: console };
vm.runInNewContext(read("dept-homes.js"), sandbox);
var DEPT = sandbox.window.DEPT;
eq(!!(DEPT && DEPT.layout && DEPT.go), "DEPT.layout and DEPT.go exist");
var lay = DEPT.layout();
var depts = lay.depts, tools = lay.tools;
function d(id) { return depts.filter(function (x) { return x.id === id; })[0]; }
var shown = depts.filter(function (x) { return !x.hidden; }).map(function (x) { return x.id; });
eq(JSON.stringify(shown) === JSON.stringify(["home", "inb", "prod", "inv", "outb", "qa", "ops"]), "seven top tabs in order: " + shown.join(","));
eq(d("home").label.en === "Home" && d("home").label.es === "Inicio" && d("home").primary === "today", "Home tab opens This week (sub id today)");
eq(d("ops").label.en === "Admin", "Ops is called Admin");
eq(d("prod").label.en === "Production" && d("prod").primary === "prodhub", "Production tab opens its steps");

// Stations: hidden from the bar, still open as their own page, light up the holder tab.
[["demand", "prod"], ["mixing", "prod"], ["pmac", "prod"], ["ful", "outb"]].forEach(function (p) {
  var x = d(p[0]);
  eq(x && x.hidden === true && x.keep === true && x.bar === p[1], p[0] + " is a station under " + p[1]);
});
[["purch", "inb"], ["recv", "inb"], ["ship", "outb"]].forEach(function (p) {
  var x = d(p[0]);
  eq(x && x.hidden === true && !x.keep && x.bar === p[1], p[0] + " still redirects to " + p[1]);
});

// Every subtab and action points at a real tool; every fold item is a subtab.
depts.forEach(function (x) {
  (x.subs || []).concat(x.actions || []).forEach(function (t) { eq(!!tools[t], x.id + " tool exists: " + t); });
  (x.fold || []).forEach(function (t) { eq((x.subs || []).indexOf(t) >= 0, x.id + " fold item is a subtab: " + t); });
  if (!x.hidden) {
    var main = (x.subs || []).filter(function (t) { return (x.fold || []).indexOf(t) < 0; });
    eq(main.length <= 6, x.id + " shows at most 6 subtabs before More (" + main.length + ")");
  }
});
// Hub step numbers: numbered subtabs run 1..n in order.
["inb", "prod", "outb"].forEach(function (id) {
  var x = d(id), last = 0, okOrder = true;
  x.subs.forEach(function (t) {
    var lab = x.short && x.short[t] ? x.short[t].en : "";
    var m = lab.match(/^(\d) /);
    if (!m) return;
    var n = +m[1];
    if (n < last || n > last + 1) okOrder = false;
    last = n;
    eq(/^\d /.test(x.short[t].es || ""), id + " step number in Spanish too: " + t);
  });
  eq(okOrder && last >= 4, id + " steps numbered in order");
});
// No board on station action rows; still reachable.
["mixing", "pmac", "ful"].forEach(function (id) { eq(d(id).actions.indexOf("board") < 0, id + " action row has no TV board"); });
eq(d("home").subs.indexOf("board") >= 0 && d("ops").subs.indexOf("board") >= 0, "TV board under Home and Admin More");
eq(d("outb").subs.indexOf("trailer") >= 0 && d("outb").fold.indexOf("trailer") < 0 && d("outb").short.trailer.en === "3 Trailer release", "Trailer release stays Outbound step 3, not folded");
// Plain names, Spanish filled.
["recvlog", "quarantine", "trQa", "fglots", "quality", "recipes", "hist", "upload", "shipments", "daily", "health", "sps", "today", "prodhub"].forEach(function (t) {
  var ti = tools[t].title;
  eq(ti.es && ti.es !== ti.en || /^(P-Mac|Fulfillment|SKUs)$/.test(ti.en), "Spanish title for " + t);
});
eq(String(tools.recvlog.blurb.en).indexOf("WHSE_FORM") < 0, "no form code jargon on the dock checklist");

// Home jobs
var SH = require(path.join(root, "simple-home.js"));
var deptIds = depts.map(function (x) { return x.id; });
eq(SH.ROLES.length === 7, "seven jobs to pick on Home");
SH.ROLES.forEach(function (r) {
  eq(r.jobs.length >= 4 && r.jobs.length <= 7, r.id + " has 4-7 job buttons");
  eq(!!(r.t.en && r.t.es), r.id + " has EN and ES name");
  r.jobs.forEach(function (j) { eq(!!SH.JOBS[j], r.id + " job exists: " + j); });
});
Object.keys(SH.JOBS).forEach(function (k) {
  var j = SH.JOBS[k], p = j.go.split(":");
  eq(deptIds.indexOf(p[0]) >= 0, k + " goes to a real department: " + p[0]);
  if (p[1]) {
    var x = d(p[0]);
    eq(!!tools[p[1]] && ((x.subs || []).indexOf(p[1]) >= 0 || (x.actions || []).indexOf(p[1]) >= 0), k + " tool is on that page: " + j.go);
  }
  eq(!!(j.t.en && j.t.es && j.h.en && j.h.es), k + " has EN and ES words");
  eq(j.h.en.split(/\s+/).length <= 12, k + " help is one short line");
});

// Short menu names
var SN = require(path.join(root, "simple-nav.js"));
Object.keys(SN.NAMES).forEach(function (k) { eq(!!(SN.NAMES[k].en && SN.NAMES[k].es), "menu name EN+ES: " + k); });
var seen = {};
Object.keys(SN.NAMES).forEach(function (k) { var n = SN.NAMES[k].en; eq(!seen[n], "menu name not repeated: " + n); seen[n] = 1; });

// Hubs
var H = require(path.join(root, "inout-hubs.js"));
eq(typeof H.counts === "function", "hubs give Home its counts");
var hubs = read("inout-hubs.js");
eq(hubs.indexOf("inboundNext(m) + steps") >= 0 && hubs.indexOf("outboundNext(m) + steps") >= 0, "both hubs open with Do this next");

// Wiring and versions
var html = read("index.html");
var iH = html.indexOf('src="inout-hubs.js?b=2"'), iS = html.indexOf('src="simple-home.js?b=2"'), iN = html.indexOf('src="simple-nav.js?b=1"');
eq(iH > 0 && iS > iH && iN > iS, "simple-home and simple-nav load after inout-hubs");
eq(html.indexOf('src="dept-homes.js?b=41"') > 0 && html.indexOf('src="sw-escape.js?b=40"') > 0, "cache bust dept-homes 41, sw-escape 40");
eq(html.indexOf('var EMBEDDED = "smackin-inv-v323"') > 0, "index build v323");
eq(read("sw-escape.js").indexOf('"smackin-inv-v323"') > 0, "sw-escape v323");
var sw = read("service-worker.js");
eq(sw.indexOf('const CACHE = "smackin-inv-v323"') >= 0 && sw.indexOf('"./home-week.js"') > 0 && sw.indexOf('"./simple-home.js"') > 0 && sw.indexOf('"./simple-nav.js"') > 0, "service worker v323 caches the new files");
eq(read("build-id.txt").trim() === "smackin-inv-v323", "build-id v323");
eq(read("app.js").length > 600000, "app.js is whole");

if (failed) { console.log(failed + " simplify check(s) failed"); process.exit(1); }
console.log("simplify ok");

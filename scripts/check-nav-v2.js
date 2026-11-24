#!/usr/bin/env node
/* v325 nav: eleven top tabs, grouped section tabs, one owner tab per screen,
   old department ids still open. Loads dept-homes.js in a stub sandbox.
   No browser, no network. */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

var src = read("dept-homes.js");
var docStub = { body: null, getElementById: function () { return null; }, addEventListener: function () {}, documentElement: {} };
var sandbox = { window: {}, document: docStub, setTimeout: setTimeout, console: console };
vm.runInNewContext(src, sandbox);
var DEPT = sandbox.window.DEPT;
var lay = DEPT.layout();
var depts = lay.depts, tools = lay.tools;
function d(id) { return depts.filter(function (x) { return x.id === id; })[0]; }
var shown = depts.filter(function (x) { return !x.hidden; });
var ids = shown.map(function (x) { return x.id; });

eq(JSON.stringify(ids) === JSON.stringify(["home", "demand", "inb", "mixing", "pmac", "inv", "ret", "ecom", "outb", "qa", "ops"]), "top tabs: " + ids.join(","));
var want = { home: "Home", demand: "Plan", inb: "Inbound", mixing: "Mixing", pmac: "P-Mac", inv: "Inventory", ret: "Retail", ecom: "E-commerce", outb: "Outbound", qa: "Quality", ops: "Admin" };
shown.forEach(function (x) {
  eq(x.label && x.label.en === want[x.id], x.id + " label " + (x.label && x.label.en));
  ["en", "es", "pt"].forEach(function (l) { eq(!!(x.label[l] && x.label[l].length <= 11), x.id + " label fits in " + l + ": " + x.label[l]); });
  eq(!!x.icon, x.id + " has an icon");
  eq(Array.isArray(x.groups) && x.groups.length >= 1, x.id + " has section groups");
  eq(!!tools[x.primary] && x.subs.indexOf(x.primary) >= 0, x.id + " primary is a section tab: " + x.primary);
  (x.subs || []).concat(x.actions || []).forEach(function (t) { eq(!!tools[t], x.id + " tool exists: " + t); });
});
// One line per top tab in the config.
var lines = src.split("\n").filter(function (l) { return /^  tab\("/.test(l); });
eq(lines.length === 11, "one tab(...) line per top tab (" + lines.length + ")");
// Group names in all three languages.
var keys = {};
shown.forEach(function (x) { x.groups.forEach(function (g) { if (g.key) keys[g.key] = 1; }); });
var gm = src.slice(src.indexOf("var NAV_GROUPS = {"), src.indexOf("var NAV_TABS = []"));
Object.keys(keys).forEach(function (k) { eq(new RegExp("\\b" + k + ": NL\\(\"[^\"]+\", \"[^\"]+\", \"[^\"]+\"\\)").test(gm), "group name EN/ES/PT: " + k); });
// One owner tab per screen.
var seen = {};
shown.forEach(function (x) { x.subs.forEach(function (t) { eq(!seen[t], "screen on two tabs: " + t + " (" + seen[t] + ", " + x.id + ")"); seen[t] = x.id; }); });
var owners = { mixing: "mixing", recipes: "mixing", seasoning: "mixing", prodready: "mixing", pmac: "pmac", fglots: "pmac",
  ordersRetail: "ret", sps: "ret", prodlog: "ret", ordersEcom: "ecom", fulfilldaily: "ecom", trElog: "ecom", fulfillerr: "ecom", ecomdemand: "ecom",
  trShip: "outb", trailer: "outb", shiplog: "outb", shipments: "outb", orderdocs: "outb", outhub: "outb",
  coalib: "inb", receive: "inb", returns: "inv", dash: "inv", makeplan: "demand", prodhub: "demand", hist: "demand",
  board: "home", maintenance: "ops", health: "ops", qacheck: "qa", trace: "qa",
  retailprod: "ret", ecomprod: "ecom", trUse: "ecom", batchrec: "mixing", trMix: "mixing", pmacout: "pmac", trPmac: "pmac" };
Object.keys(owners).forEach(function (t) { eq(DEPT.owner(t) === owners[t], "owner of " + t + " is " + owners[t] + " (" + DEPT.owner(t) + ")"); });
// Floor pages: actions first, Inventory opens the Floor, Recipes is a Mixing tab.
eq(d("inv").primary === "dash" && d("inv").floorSel === "#dashBody" && d("inv").floorClass === "inv-floor", "Inventory opens the Floor");
eq(JSON.stringify(d("inv").actions) === JSON.stringify(["receive", "adjust", "count", "move", "alerts"]), "Inventory actions");
eq(d("inv").actionShort.move.en === "Move / Pick" && d("inb").short.move.en === "Put away", "Move / Pick on Inventory, Put away on Inbound");
eq(JSON.stringify(d("mixing").actions) === JSON.stringify(["prodorders", "trMix", "batchrec"]) && d("mixing").subs.indexOf("recipes") >= 0, "Mixing action-first, Recipes is a tab");
eq(JSON.stringify(d("pmac").actions) === JSON.stringify(["prodorders", "pmacout", "trPmac"]), "P-Mac actions");
eq(d("ret").actions.indexOf("retailprod") >= 0 && d("ecom").actions.indexOf("ecomprod") >= 0, "Retail and E-commerce log actions");
// Old ids.
[["prod", "demand"], ["ful", "ret"], ["ship", "outb"], ["purch", "inb"], ["recv", "inb"], ["demand", "demand"], ["mixing", "mixing"], ["pmac", "pmac"], ["outb", "outb"]].forEach(function (p) {
  eq(DEPT.live(p[0]) === p[1], "old id " + p[0] + " opens " + p[1] + " (" + DEPT.live(p[0]) + ")");
});
eq(d("prod").alias === "prodhub", "old Production id opens Production steps");
// Wiring in other modules.
var sh = read("simple-home.js"), hubs = read("inout-hubs.js");
eq(sh.indexOf('"ful:') < 0 && sh.indexOf('go: "prod"') < 0 && sh.indexOf('"prod:') < 0, "Home jobs use the new tabs");
eq(sh.indexOf('root.DEPT.owner("prodhub")') > 0, "Production steps open on their owner tab");
eq(hubs.indexOf('data-smk-go="ful"') < 0 && hubs.indexOf('DEPT.show("ful")') < 0, "Outbound steps use the Retail tab");
eq(read("dept-boards.js").indexOf('ret: "ful", ecom: "ful"') > 0, "Retail and E-commerce reuse the fulfillment boards");
// Board mode hides both bars; ?board= is untouched.
eq(src.indexOf("body.boardmode #deptbar{display:none!important}") > 0 && src.indexOf("body.boardmode #dept-shell{display:none!important}") > 0, "board mode hides the bars");
eq(read("app.js").indexOf('new URLSearchParams(location.search).get("board")') > 0, "?board= still read");
// Copy.
var app = read("app.js");
eq(app.indexOf("Maintainly \u2014") < 0 && app.indexOf("Envial\u0430") < 0, "Maintenance copy: no em dash, no Cyrillic letter");
var navBlock = src.slice(src.indexOf("// ---- v325 nav"), src.indexOf("function liveDept"));
eq(navBlock.indexOf("\u2014") < 0 && sh.indexOf("\u2014") < 0 && hubs.indexOf("\u2014") < 0, "no em dash in nav copy");
// Grouped, compact, scrollable section row.
eq(src.indexOf('class="dsg-wrap"') > 0 && src.indexOf("function fitSubs") > 0 && src.indexOf("dsg-fade-r") > 0, "section row groups with a fade");
eq(src.indexOf("@media(max-width:900px){#deptbar{display:grid;grid-template-columns:repeat(6,") > 0, "narrow screens show all top tabs in a grid");
// Versions.
var html = read("index.html");
eq(html.indexOf('src="dept-homes.js?b=42"') > 0 && html.indexOf('src="simple-home.js?b=3"') > 0 && html.indexOf('src="inout-hubs.js?b=3"') > 0 && html.indexOf('src="dept-boards.js?b=3"') > 0 && html.indexOf('src="app.js?b=223"') > 0, "cache bust on changed files");
eq(read("service-worker.js").indexOf('const CACHE = "smackin-inv-v325"') >= 0 && read("build-id.txt").trim() === "smackin-inv-v325", "v325");

if (failed) { console.log(failed + " nav check(s) failed"); process.exit(1); }
console.log("nav v2 ok");

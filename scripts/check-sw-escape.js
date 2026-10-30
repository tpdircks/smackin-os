#!/usr/bin/env node
/* Hard refresh must drop an older smackin-inv worker. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var BUILD = "smackin-inv-v256";
var sw = read("service-worker.js");
var html = read("index.html");
var boot = read("sw-boot.js");
var escapeSrc = read("sw-escape.js");
var app = read("app.js");
var buildId = read("build-id.txt").trim();

eq(sw.indexOf('const CACHE = "' + BUILD + '"') >= 0, "cache bump");
eq(sw.indexOf("smackin-inv-v254") < 0, "old cache gone");
eq(buildId === BUILD, "build-id.txt matches");
eq(escapeSrc.indexOf('var EMBEDDED = "' + BUILD + '"') >= 0, "escape embedded");
eq(html.indexOf('var EMBEDDED = "' + BUILD + '"') >= 0, "inline embedded");
eq(html.indexOf('sw-escape.js?b=2') >= 0, "escape script");
eq(html.indexOf('sw-boot.js?b=2') >= 0, "boot script");
eq(html.indexOf('app.js?b=192') >= 0, "app cache bust");
eq(boot.indexOf('updateViaCache: "none"') >= 0, "boot skips http cache");
eq(boot.indexOf("__smackinSwEscapeLock") >= 0, "boot yields to reset");
eq(app.indexOf('register("service-worker.js", { updateViaCache: "none" })') >= 0, "app register no cache");
eq(app.indexOf('register("service-worker.js");') < 0, "old register gone");
eq(sw.indexOf('cache: "no-store"') >= 0, "sw no-store");
eq(sw.indexOf("build-id.txt") >= 0 && sw.indexOf("sw-escape.js") >= 0, "sw leaves probes alone");
eq(sw.indexOf("service-worker.js") >= 0, "sw leaves its script alone");
eq(sw.indexOf("function fromNetwork") >= 0, "navigations go to the network");
eq(sw.indexOf("catch (err)") >= 0 && sw.indexOf("cache.match") >= 0, "offline fallback stays");
eq(html.indexOf("unregister") >= 0 && html.indexOf("caches.delete") >= 0, "inline unregisters and deletes");
eq(html.indexOf("location.replace") >= 0, "inline reloads once");
eq(escapeSrc.indexOf('cache: "no-store"') >= 0, "probe no-store");
eq(escapeSrc.indexOf("build-id.txt?t=") >= 0, "probe busts the browser cache");

["service-worker.js", "sw-escape.js", "sw-boot.js", "index.html", "build-id.txt", "scripts/check-sw-escape.js"].forEach(function (rel) {
  var text = read(rel);
  eq(text.indexOf("\u2014") < 0 && text.indexOf("\u2013") < 0, rel + " dash");
});

var escape = require(path.join(root, "sw-escape.js"));
eq(escape.EMBEDDED === BUILD, "export embedded");
eq(escape.versionNum("smackin-inv-v253") === 253, "version parse");
eq(escape.chooseTarget(BUILD, "smackin-inv-v254") === BUILD, "older probe does not downgrade");
eq(escape.chooseTarget(BUILD, "smackin-inv-v260") === "smackin-inv-v260", "newer probe wins");
eq(escape.parseId("\nsmackin-inv-v256\n") === BUILD, "parse id");
eq(escape.isSmackinReg({
  scope: "https://tpdircks.github.io/smackin-os/",
  active: { scriptURL: "https://tpdircks.github.io/smackin-os/service-worker.js" }
}), "our registration");
eq(!escape.isSmackinReg({
  scope: "https://tpdircks.github.io/",
  active: { scriptURL: "https://tpdircks.github.io/other/service-worker.js" }
}), "other github.io worker");

function decided(state) { return escape.plan(state).action; }

eq(decided({
  embedded: BUILD, remote: BUILD, caches: ["smackin-inv-v253"], online: true, busted: ""
}) === "reset", "v253 cache resets");
eq(decided({
  embedded: BUILD, remote: "", caches: ["smackin-inv-v254"], online: true, busted: ""
}) === "reset", "v254 cache resets without a probe");
eq(decided({
  embedded: BUILD, remote: BUILD, caches: [BUILD], online: true, busted: ""
}) === "stay", "current cache stays");
eq(decided({
  embedded: BUILD, remote: BUILD, caches: [], online: true, busted: ""
}) === "stay", "first visit stays");
eq(decided({
  embedded: BUILD, remote: BUILD, caches: ["smackin-inv-v253"], online: true, busted: BUILD
}) === "drop-old", "second load does not navigate again");
eq(decided({
  embedded: BUILD, remote: BUILD, caches: ["smackin-inv-v253", BUILD], online: true, busted: ""
}) === "drop-old", "current cache is not unregistered");
eq(decided({
  embedded: "smackin-inv-v256", remote: "smackin-inv-v260", caches: ["smackin-inv-v256"], online: true, busted: ""
}) === "reset", "newer build-id resets");
eq(decided({
  embedded: "smackin-inv-v256", remote: "", caches: ["smackin-inv-v260"], online: true, busted: ""
}) === "stay", "newer cache is not downgraded");
eq(decided({
  embedded: BUILD, remote: "", caches: ["smackin-inv-v253"], online: false, probeFailed: true, busted: ""
}) === "stay", "offline keeps the shell");
eq(escape.bustUrl("https://tpdircks.github.io/smackin-os/?board=wh", BUILD).indexOf("board=wh") >= 0, "board query kept");
eq(escape.bustUrl("https://tpdircks.github.io/smackin-os/?board=wh", BUILD).indexOf("v=" + BUILD) >= 0, "bust query set");
eq(escape.cleanPath("https://tpdircks.github.io/smackin-os/?board=wh&v=" + BUILD, BUILD) === "/smackin-os/?board=wh", "bust query cleared");

var htmlScript = (html.match(/<script>\s*\/\* Hard-refresh escape[\s\S]*?<\/script>/) || [""])[0];
eq(htmlScript.indexOf("location.replace") >= 0, "inline is in the head");
eq(htmlScript.indexOf("n > mine") >= 0, "inline ignores a newer cache");
eq(htmlScript.indexOf('searchParams.get("v") === EMBEDDED') >= 0, "inline will not loop");

vm.runInNewContext(escapeSrc, {
  module: { exports: {} },
  window: undefined,
  globalThis: {},
  URL: URL,
  Date: Date,
  console: console
});

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("sw-escape ok");

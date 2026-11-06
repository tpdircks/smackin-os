#!/usr/bin/env node
/* Major tabs still have a view, and inventory sync plus Dock save paths stay put. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var app = read("app.js");
var db = read("db.js");
var sync = read("inv-sync-1105.js");
var map = app.slice(app.indexOf("const map = {"), app.indexOf("const DEMAND_FAMILY"));
["home", "daily", "dash", "demand", "demandboard", "purchasing", "receive", "recvlog", "returns", "qa", "adjust", "count", "mixing", "pmac", "pmacout", "produce", "retailprod", "ecomprod", "fulfilldaily", "prodlog", "shiplog", "quality", "maintenance", "people", "settings", "board", "history"].forEach(function (id) {
  eq(map.indexOf(id + ":") >= 0, "view " + id);
});
eq(db.indexOf('sb.rpc("fn_apply_delta"') >= 0, "stock delta stays");
eq(db.indexOf('sb.from("receiving_log").insert') >= 0 && db.indexOf('sb.from("receiving_log").update') >= 0, "dock save stays");
eq(sync.indexOf("adjustTotal") >= 0 && sync.indexOf("audit_log") < 0, "inventory sync module unchanged");
eq(read("pack-receive.js").indexOf("function setText") >= 0, "receive item guard stays");
eq(app.indexOf("function viewReceive") >= 0 && app.indexOf("function viewReceivingLog") >= 0, "receive screens stay");
eq(app.indexOf('histBtn("receiving_log"') >= 0 && app.indexOf('histBtn("items"') >= 0 && app.indexOf('histBtn("production_pallets"') >= 0, "history links");
eq(read("history.js").indexOf("\u2014") < 0, "history copy");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok major tabs");

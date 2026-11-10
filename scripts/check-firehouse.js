#!/usr/bin/env node
/* Fire House box date is the lot. SEAS-L02 is checked against live stock. No writes. */
"use strict";

var fs = require("fs");
var path = require("path");
var https = require("https");
var plan = require("../inv-lot-plan.js");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var db = read("db.js");
var app = read("app.js");
assert(db.indexOf("async function receive(item, qty, lot, op, meta)") >= 0, "DB.receive signature stays");
assert(app.indexOf("RAW_EXP.composeFireHouse") >= 0, "receive composes the Fire House lot");
assert(app.indexOf("Fire House needs the box expiration. That date is the lot.") >= 0, "a missing box date blocks the save");
assert(app.indexOf('id="r-lot"') >= 0 && app.indexOf('id="rl-lot"') >= 0, "lot fields stay on both forms");
assert(app.indexOf("fireHouseFieldLot") >= 0, "the item number stays in the field");

function get(url, key) {
  return new Promise(function (resolve, reject) {
    var req = https.get(url, {
      headers: { apikey: key, Authorization: "Bearer " + key, Accept: "application/json" }
    }, function (res) {
      var body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () {
        if (res.statusCode !== 200) reject(new Error("HTTP " + res.statusCode + " " + body.slice(0, 240)));
        else resolve(JSON.parse(body));
      });
    });
    req.on("error", reject);
  });
}

async function main() {
  var cfgSrc = read("config.js");
  var url = /SUPABASE_URL:\s*"([^"]+)"/.exec(cfgSrc)[1];
  var key = /SUPABASE_ANON_KEY:\s*"([^"]+)"/.exec(cfgSrc)[1];
  var latest = JSON.parse(read("data/adriana-latest.json"));
  var lines = (latest.lots || []).filter(function (l) { return l.item === "SEAS-L02"; });
  assert(lines.length === 5, "snapshot has five pizza rows");
  var sum = lines.reduce(function (s, l) { return s + Number(l.qty); }, 0);
  assert(Math.abs(sum - 785.25) < 0.001, "pizza snapshot totals 785.25, saw " + sum);
  var stock = await get(url + "/rest/v1/stock?item_id=eq.SEAS-L02&select=item_id,location,lot,qty,expires_on,updated_at", key);
  var rows = (stock || []).map(function (r) {
    return {
      source_id: r.item_id,
      item_id: r.item_id,
      location: r.location,
      lot: r.lot || "",
      qty: Number(r.qty),
      expires_on: r.expires_on ? String(r.expires_on).slice(0, 10) : "",
      updated_at: r.updated_at || ""
    };
  }).filter(function (r) { return r.qty > 0; });
  var planned = plan.planItemLots("SEAS-L02", lines, rows, { today: "2026-11-10", sheetAsOf: latest.sheetAsOf });
  var writes = planned.actions.filter(function (a) { return a.op !== "match"; });
  if (writes.length || planned.holds.length || planned.actions.length !== 5) {
    console.error(JSON.stringify({ actions: planned.actions, holds: planned.holds, rows: rows }, null, 2));
  }
  assert(rows.length === 5, "live SEAS-L02 has five lots, saw " + rows.length);
  assert(writes.length === 0 && planned.actions.length === 5 && planned.actions.every(function (a) { return a.op === "match"; }), "SEAS-L02 dry-run is a full match with 0 writes");
  assert(planned.holds.length === 0, "SEAS-L02 dry-run has no holds");
  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("firehouse ok");
}

main().catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

#!/usr/bin/env node
/* Open hold_log rows for stock already sitting in QUARANTINE or QA-HOLD.
   Default is a dry run. Pass --apply to insert.
   Marks the row as a sync backfill. Does not create a receiving_log row,
   and does not change stock location, quantity, or expiration. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var cfg = fs.readFileSync(path.join(root, "config.js"), "utf8");
var url = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
var key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
if (!url || !key) {
  console.error("missing supabase config");
  process.exit(1);
}
var APPLY = process.argv.indexOf("--apply") >= 0;

function headers(extra) {
  return Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    "x-smk-operator": "sync backfill",
    "x-smk-note": "sync backfill"
  }, extra || {});
}
async function rest(pathname, opts) {
  var res = await fetch(url + pathname, opts || { headers: headers(), cache: "no-store" });
  var text = await res.text();
  if (!res.ok) throw new Error(pathname + " " + res.status + " " + text.slice(0, 500));
  return text ? JSON.parse(text) : null;
}
async function page(pathname) {
  var out = [];
  var start = 0;
  for (;;) {
    var join = pathname.indexOf("?") >= 0 ? "&" : "?";
    var rows = await rest(pathname + join + "limit=1000&offset=" + start, { headers: headers(), cache: "no-store" });
    rows = rows || [];
    out = out.concat(rows);
    if (rows.length < 1000) break;
    start += rows.length;
  }
  return out;
}
function lotKey(lot) {
  return String(lot == null ? "" : lot).toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function enc(v) { return encodeURIComponent(v == null ? "" : String(v)); }

async function main() {
  var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on&or=(location.eq.QUARANTINE,location.eq.QA-HOLD)&qty=gt.0");
  var items = await page("/rest/v1/items?select=id,name");
  var holds = await page("/rest/v1/hold_log?select=id,item_id,lot,status&status=eq.held");
  var names = {};
  items.forEach(function (it) { if (it && it.id) names[it.id] = it.name || it.id; });
  var open = {};
  holds.forEach(function (h) {
    if (!h || h.status !== "held") return;
    open[String(h.item_id) + "\n" + lotKey(h.lot)] = 1;
  });
  var todo = stock.filter(function (r) {
    var loc = String(r.location || "").toUpperCase();
    if (loc !== "QUARANTINE" && loc !== "QA-HOLD") return false;
    if (!(Number(r.qty) > 0)) return false;
    return !open[String(r.item_id) + "\n" + lotKey(r.lot)];
  });
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    heldStock: stock.length,
    alreadyOpen: holds.length,
    toInsert: todo.length,
    lots: todo.map(function (r) { return { item: r.item_id, lot: r.lot, location: r.location, qty: r.qty, expires_on: r.expires_on || null }; })
  }, null, 2));
  if (!APPLY) return;
  for (var i = 0; i < todo.length; i++) {
    var r = todo[i];
    var loc = String(r.location || "").toUpperCase();
    await rest("/rest/v1/hold_log", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        hold_at: new Date().toISOString(),
        held_by: "sync backfill",
        item_id: r.item_id,
        item_name: names[r.item_id] || r.item_id,
        lot: r.lot || "",
        hold_qty: Number(r.qty),
        hold_reason: "Sync backfill. Stock was already in " + loc + ". Not a receipt. No receiving log was created.",
        receiving_log_id: null,
        status: "held"
      })
    });
  }
  var after = await rest("/rest/v1/stock?select=item_id,location,lot,qty,expires_on&item_id=eq." + enc("TMP-SEAS-BCJALAP"), { headers: headers(), cache: "no-store" });
  console.log(JSON.stringify({ inserted: todo.length, jalapeno: after }, null, 2));
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/* Standing check: live OS on-hand versus Adriana's latest count block.
   A difference over 0.5% or over 1 unit is printed. Held lines are printed
   with their reason. No writes. */
"use strict";

var fs = require("fs");
var path = require("path");
var plan = require("../inv-lot-plan.js");
var root = path.resolve(__dirname, "..");
var cfg = fs.readFileSync(path.join(root, "config.js"), "utf8");
var url = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
var key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];

function headers() {
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}
async function page(pathname) {
  var out = [];
  var start = 0;
  for (;;) {
    var res = await fetch(url + pathname + (pathname.indexOf("?") >= 0 ? "&" : "?") + "limit=1000&offset=" + start, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(pathname + " " + res.status);
    var rows = await res.json();
    out = out.concat(rows || []);
    if (!rows || rows.length < 1000) break;
    start += rows.length;
  }
  return out;
}
async function main() {
  var latest = JSON.parse(fs.readFileSync(path.join(root, "data", "adriana-latest.json"), "utf8"));
  var items = await page("/rest/v1/items?select=id,code,name,flavor,category,unit&order=id.asc");
  var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on,updated_at,coa_received,coa_released_at&order=item_id.asc,location.asc,lot.asc");
  var today = new Date().toISOString().slice(0, 10);
  var planned = plan.planAll(latest, stock, items, { today: today, sheetAsOf: latest.sheetAsOf });
  var flags = plan.reconcile(latest, stock, items);
  console.log("count " + latest.countDate + " drifts " + planned.applied.length + " matching " + planned.matching.length + " held " + planned.holds.length + " qty-flags " + flags.length);
  planned.holds.forEach(function (h) {
    console.log(["HELD", h.item || h.desc || "", h.lot || "", h.reason].join("\t"));
  });
  flags.forEach(function (f) {
    console.log(["FLAG", f.kind, f.item, f.lot || "", f.os, f.sheet].join("\t"));
  });
  planned.applied.forEach(function (a) {
    if (a.op === "create") return;
    console.log(["DRIFT", a.op, a.item, a.lot || "", a.from ? a.from.qty : "", a.sheet != null ? a.sheet : a.qty, a.location || ""].join("\t"));
  });
  if (planned.applied.length) process.exit(2);
}
main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

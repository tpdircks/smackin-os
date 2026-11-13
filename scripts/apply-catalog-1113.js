#!/usr/bin/env node
/* Place Nov 13, 2026 receipts that had no SKU into RECEIVING.
   Uses the same item insert and fn_apply_delta the app uses.
   Idempotent: a done flag skips a second add. A shortfall is the only delta.
   Rack rows, the generic Advent Calendar box, and the 40 film rolls are not written.
   Default is a dry run. Pass --apply to write. Reads use cache: no-store. */
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
var OPERATOR = "catalog receive 2026-11-13";
var CLOUD_KEY = "catalog-recv-2026-11-13";
var FILM_ID = "16dea42a-e97c-465c-8bc0-9a804716caba";
var PROTECT = ["SEAS-L02", "SUP-SMAADVCAL", "TMP-F15-ADVENTBAG2025"];
var ROWS = [
  { id: "TMP-ADV-12DAYSGREEN", name: "Advent Calendar 12 Days (Green)", flavor: "Advent Calendar 12 Days (Green)", category: "packaging", unit: "ea", qty: 2050, lot: "", exp: "", recv: "17d3dc70-209e-4325-bcca-8e3367033799" },
  { id: "TMP-ADV-24DAYSGREEN", name: "Advent Calendar 24 Days (Green)", flavor: "Advent Calendar 24 Days (Green)", category: "packaging", unit: "ea", qty: 4050, lot: "", exp: "", recv: "7a3fbdd6-1f3b-46d6-b184-e9fcee148350" },
  { id: "TMP-BOXADV-12DAYS", name: "Box Advent Calendar 12 Days", flavor: "Box Advent Calendar 12 Days", category: "packaging", unit: "ea", qty: 2026, lot: "", exp: "", recv: "68d16485-623b-4499-be7e-105940082ba1" },
  { id: "TMP-BOXADV-24DAYS", name: "Box Advent Calendar 24 Days", flavor: "Box Advent Calendar 24 Days", category: "packaging", unit: "ea", qty: 4040, lot: "", exp: "", recv: "817fae7c-aabb-441d-bb9c-158d61b1b10e" },
  { id: "TMP-SEAS-BUFFALORANCHPOPCORN", name: "Seasoning - Buffalo Ranch Popcorn", flavor: "Buffalo Ranch Popcorn", category: "seasoning", unit: "lbs", qty: 45, lot: "11/05/2027/4214", exp: "2027-11-05", recv: "3d3d882f-a2c1-4475-b2f7-3e848b6655fb" }
];

function headers(extra) {
  return Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    "x-smk-operator": OPERATOR
  }, extra || {});
}
function enc(v) { return encodeURIComponent(v == null ? "" : String(v)); }
function num(n) {
  var x = Number(n);
  return x === x ? Math.round(x * 1000) / 1000 : 0;
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
function sig(rows) {
  return (rows || []).map(function (r) {
    return [r.item_id, r.location, r.lot || "", num(r.qty), r.expires_on || ""].join("|");
  }).sort().join("\n");
}
async function stockFor(ids) {
  if (!ids.length) return [];
  return page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on&item_id=in.(" + ids.map(enc).join(",") + ")");
}
function receivingRow(rows, itemId, lot) {
  var want = lot || "";
  var hits = (rows || []).filter(function (r) {
    return r.item_id === itemId && String(r.location || "") === "RECEIVING" && String(r.lot || "") === want;
  });
  return hits[0] || null;
}
async function ensureItem(row) {
  var found = await rest("/rest/v1/items?id=eq." + enc(row.id) + "&select=id,code,name,unit,category", { headers: headers(), cache: "no-store" });
  if (found && found[0]) return found[0];
  if (!APPLY) return null;
  await rest("/rest/v1/items", {
    method: "POST",
    headers: headers({ Prefer: "resolution=ignore-duplicates,return=representation" }),
    body: JSON.stringify({
      id: row.id, code: row.id, name: row.name, flavor: row.flavor,
      category: row.category, unit: row.unit, reorder: 0, supplier: null
    })
  });
  var again = await rest("/rest/v1/items?id=eq." + enc(row.id) + "&select=id,name,unit", { headers: headers(), cache: "no-store" });
  if (!again || !again[0]) throw new Error("item did not read back " + row.id);
  return again[0];
}
async function main() {
  var before = sig(await stockFor(PROTECT));
  var film = await rest("/rest/v1/receiving_log?id=eq." + enc(FILM_ID) + "&select=id,item_id,qty_received,contents", { headers: headers(), cache: "no-store" });
  if (!film || !film[0] || num(film[0].qty_received) !== 40) throw new Error("film roll receipt was not the expected 40");
  var prior = await rest("/rest/v1/kv_status?key=eq." + enc(CLOUD_KEY) + "&select=value", { headers: headers(), cache: "no-store" });
  var done = prior && prior[0] && String(prior[0].value).indexOf("done:") === 0;
  console.log(done ? "done flag is set" : "done flag is not set");
  if (!APPLY) {
    for (var i = 0; i < ROWS.length; i++) {
      var row = ROWS[i];
      var stock = await stockFor([row.id]);
      var hit = receivingRow(stock, row.id, row.lot);
      var elsewhere = stock.filter(function (r) { return String(r.location || "") !== "RECEIVING"; });
      console.log([row.id, "receiving", hit ? num(hit.qty) : 0, "target", row.qty, "other locs", elsewhere.length].join(" "));
    }
    console.log("dry run only");
    return;
  }
  if (done) {
    await verify(before, film[0]);
    console.log("already applied");
    return;
  }
  for (var n = 0; n < ROWS.length; n++) {
    var spec = ROWS[n];
    await ensureItem(spec);
    var now = await stockFor([spec.id]);
    var other = now.filter(function (r) { return String(r.location || "") !== "RECEIVING"; });
    if (other.length) throw new Error(spec.id + " already has stock outside RECEIVING. Not touched.");
    var have = receivingRow(now, spec.id, spec.lot);
    var current = have ? num(have.qty) : 0;
    var delta = num(spec.qty - current);
    if (delta < 0) throw new Error(spec.id + " RECEIVING is " + current + ", above the receipt " + spec.qty);
    if (delta > 0) {
      await rest("/rest/v1/rpc/fn_apply_delta", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ p_item: spec.id, p_loc: "RECEIVING", p_delta: delta, p_lot: spec.lot || "" })
      });
      await rest("/rest/v1/transactions", {
        method: "POST",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          action: "Receive",
          detail: spec.qty + " " + spec.unit + " " + spec.flavor + (spec.lot ? " lot " + spec.lot : "") + " -> RECEIVING",
          operator: OPERATOR
        })
      });
    }
    if (spec.exp) {
      var patched = await rest("/rest/v1/stock?item_id=eq." + enc(spec.id) + "&location=eq.RECEIVING&lot=eq." + enc(spec.lot), {
        method: "PATCH",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify({ expires_on: spec.exp })
      });
      if (!patched || !patched.length) throw new Error("expiration was not saved for " + spec.id);
    }
    var log = await rest("/rest/v1/receiving_log?id=eq." + enc(spec.recv) + "&select=id,item_id,notes,qty_received,lot", { headers: headers(), cache: "no-store" });
    if (!log || !log[0]) throw new Error("missing receipt " + spec.recv);
    if (num(log[0].qty_received) !== spec.qty) throw new Error("receipt qty changed for " + spec.id);
    if (!log[0].item_id) {
      var note = String(log[0].notes || "");
      if (note.indexOf(spec.id) < 0) note = note + " Catalog item " + spec.id + " added. On-hand placed in RECEIVING.";
      await rest("/rest/v1/receiving_log?id=eq." + enc(spec.recv), {
        method: "PATCH",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify({ item_id: spec.id, notes: note })
      });
    }
  }
  await rest("/rest/v1/kv_status?on_conflict=key", {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ key: CLOUD_KEY, value: "done:" + new Date().toISOString(), updated_at: new Date().toISOString() })
  });
  await verify(before, film[0]);
  console.log("applied");
}
async function verify(before, filmBefore) {
  var after = sig(await stockFor(PROTECT));
  if (after !== before) throw new Error("a protected stock row changed");
  var film = await rest("/rest/v1/receiving_log?id=eq." + enc(FILM_ID) + "&select=id,item_id,qty_received", { headers: headers(), cache: "no-store" });
  if (!film || !film[0] || film[0].item_id || num(film[0].qty_received) !== num(filmBefore.qty_received)) {
    throw new Error("film roll receipt was changed");
  }
  for (var i = 0; i < ROWS.length; i++) {
    var row = ROWS[i];
    var item = await rest("/rest/v1/items?id=eq." + enc(row.id) + "&select=id,name,unit,category", { headers: headers(), cache: "no-store" });
    if (!item || !item[0] || item[0].name !== row.name) throw new Error("item readback failed " + row.id);
    var stock = await stockFor([row.id]);
    var other = stock.filter(function (r) { return String(r.location || "") !== "RECEIVING"; });
    if (other.length) throw new Error(row.id + " has a non-RECEIVING row");
    var hit = receivingRow(stock, row.id, row.lot);
    if (!hit || num(hit.qty) !== row.qty) throw new Error(row.id + " on hand " + (hit ? hit.qty : 0) + " wanted " + row.qty);
    if (row.exp && String(hit.expires_on || "").slice(0, 10) !== row.exp) throw new Error(row.id + " expiration " + hit.expires_on);
    console.log([row.id, hit.location, hit.lot || "", num(hit.qty), hit.expires_on || ""].join(" "));
  }
}
main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

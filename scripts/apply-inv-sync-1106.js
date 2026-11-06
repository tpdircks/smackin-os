#!/usr/bin/env node
/* Dry-run or apply Adriana's Nov 5 count, including lot-level raw materials.
   Default is a dry run. Pass --apply to write. Reads are cache: no-store. */
"use strict";

var fs = require("fs");
var path = require("path");
var plan = require("../inv-lot-plan.js");

var root = path.resolve(__dirname, "..");
var cfg = fs.readFileSync(path.join(root, "config.js"), "utf8");
var url = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
var key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
if (!url || !key) {
  console.error("missing supabase config");
  process.exit(1);
}
var APPLY = process.argv.indexOf("--apply") >= 0;
var OPERATOR = plan.OPERATOR;
var CLOUD_KEY = "inv-sync-2026-11-05-lots";
var REPORT_KEY = "inv-sync-2026-11-05-lots-report";

function headers(extra) {
  return Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    "x-smk-operator": OPERATOR,
    "x-smk-note": OPERATOR
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
function csvCell(v) {
  var s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function writeCsv(file, rows) {
  var head = ["result", "item", "lot", "location", "os_before", "sheet", "os_after", "reason"];
  var lines = [head.join(",")];
  rows.forEach(function (r) {
    lines.push(head.map(function (h) { return csvCell(r[h]); }).join(","));
  });
  fs.writeFileSync(file, lines.join("\n") + "\n");
}
function resultRows(planned) {
  var rows = [];
  planned.applied.forEach(function (a) {
    if (a.op === "create") return;
    rows.push({
      result: a.op === "delete" ? "applied" : "applied",
      item: a.item,
      lot: a.lot || (a.from && a.from.lot) || "",
      location: a.location || (a.from && a.from.location) || "",
      os_before: a.from ? a.from.qty : "",
      sheet: a.sheet != null ? a.sheet : a.qty,
      os_after: a.op === "delete" ? 0 : a.qty,
      reason: a.op + (a.expires_on ? " exp " + a.expires_on : "")
    });
  });
  planned.matching.forEach(function (a) {
    rows.push({ result: "already-matching", item: a.item, lot: a.lot || "", location: a.location || "", os_before: a.qty, sheet: a.sheet != null ? a.sheet : a.qty, os_after: a.qty, reason: "already matches the sheet" });
  });
  planned.holds.forEach(function (h) {
    rows.push({ result: "held", item: h.item || h.desc || "", lot: h.lot || "", location: h.location || "", os_before: h.os != null ? h.os : "", sheet: h.sheet != null ? h.sheet : "", os_after: h.os != null ? h.os : "", reason: h.reason });
  });
  planned.notes.forEach(function (n) {
    rows.push({ result: "note", item: n.item || "", lot: n.lot || "", location: "", os_before: "", sheet: "", os_after: "", reason: n.reason });
  });
  return rows;
}
function enc(v) { return encodeURIComponent(v == null ? "" : String(v)); }

async function writeAction(a) {
  if (a.op === "create") {
    await rest("/rest/v1/items", {
      method: "POST",
      headers: headers({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({
        id: a.item, code: a.item, name: a.desc || a.item, flavor: a.desc || a.item,
        category: a.category || "other", unit: a.unit || "ea", reorder: 0, supplier: null
      })
    });
    return;
  }
  if (a.op === "delete") {
    var lot = a.lot || (a.from && a.from.lot) || "";
    var loc = a.location || (a.from && a.from.location);
    await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(loc) + "&lot=eq." + enc(lot), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    });
    return;
  }
  if (a.op === "update") {
    var fromLot = a.from && a.from.lot != null ? a.from.lot : (a.lot || "");
    var fromLoc = a.from && a.from.location ? a.from.location : a.location;
    var body = { qty: a.qty, location: a.location, lot: a.lot || "" };
    if (a.expires_on) body.expires_on = a.expires_on;
    else body.expires_on = null;
    await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(fromLoc) + "&lot=eq." + enc(fromLot), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    });
    return;
  }
  if (a.op === "insert") {
    await rest("/rest/v1/stock", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        item_id: a.item,
        location: a.location,
        lot: a.lot || "",
        qty: a.qty,
        expires_on: a.expires_on || null
      })
    });
  }
}

async function main() {
  var latest = JSON.parse(fs.readFileSync(path.join(root, "data", "adriana-latest.json"), "utf8"));
  var items = await page("/rest/v1/items?select=id,code,name,flavor,category,unit&order=id.asc");
  var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on,updated_at,coa_received,coa_released_at&order=item_id.asc,location.asc,lot.asc");
  var planned = plan.planAll(latest, stock, items, { today: "2026-11-06", sheetAsOf: latest.sheetAsOf });
  var table = resultRows(planned);
  var out = path.join(root, "reports", APPLY ? "inv-sync-1106-applied.csv" : "inv-sync-1106-dry-run.csv");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeCsv(out, table);
  var counts = {};
  table.forEach(function (r) { counts[r.result] = (counts[r.result] || 0) + 1; });
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    stock: stock.length,
    items: items.length,
    actions: planned.actions.length,
    holds: planned.holds.length,
    results: counts,
    file: out
  }));
  if (!APPLY) return;

  var prior = await rest("/rest/v1/kv_status?key=eq." + enc(CLOUD_KEY) + "&select=value", { headers: headers(), cache: "no-store" });
  if (prior && prior[0] && String(prior[0].value).indexOf("done:") === 0) {
    console.log("already done " + prior[0].value);
    return;
  }
  var creates = planned.actions.filter(function (a) { return a.op === "create"; });
  var deletes = planned.actions.filter(function (a) { return a.op === "delete"; });
  var updates = planned.actions.filter(function (a) { return a.op === "update"; });
  var inserts = planned.actions.filter(function (a) { return a.op === "insert"; });
  var steps = creates.concat(deletes, updates, inserts);
  for (var i = 0; i < steps.length; i++) {
    await writeAction(steps[i]);
    if (i % 25 === 0) console.log("wrote " + (i + 1) + "/" + steps.length);
  }
  var touched = {};
  steps.forEach(function (a) { if (a.item) touched[a.item] = 1; });
  var ids = Object.keys(touched);
  for (var n = 0; n < ids.length; n++) {
    await rest("/rest/v1/transactions", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        ts: new Date().toISOString(),
        action: "Count/Adjust",
        detail: ids[n] + " set from Adriana count " + latest.countDate,
        operator: OPERATOR
      })
    });
  }
  var report = {
    at: new Date().toISOString(),
    operator: OPERATOR,
    countDate: latest.countDate,
    applied: planned.applied.length,
    matching: planned.matching.length,
    held: planned.holds.length,
    holds: planned.holds,
    notes: planned.notes
  };
  await rest("/rest/v1/kv_status?on_conflict=key", {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([
      { key: REPORT_KEY, value: JSON.stringify(report) },
      { key: CLOUD_KEY, value: "done:" + new Date().toISOString() }
    ])
  });
  console.log("applied " + steps.length + " stock writes across " + ids.length + " items");
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

#!/usr/bin/env node
/* Apply Adriana's Nov 6 confirmations. Default is a dry run.
   Pass --apply to write. Writer: Adriana confirmation 2026-11-06. */
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
var OPERATOR = "Adriana confirmation 2026-11-06";
var CLOUD_KEY = "adriana-confirm-2026-11-06";
var ALLOW = {
  "SEAS-S05": 1,
  "FILM4-S01": 1, "FILM4-S02": 1, "FILM4-S06": 1, "FILM4-S08": 1, "FILM4-S09": 1, "FILM4-S10": 1, "FILM4-S11": 1,
  "TMP-F4-GOODGOODSALTVINEGAR": 1, "TMP-F4-TERIYAKIANABRUNI": 1,
  "FILM15-S01": 1, "FILM15-S02": 1, "FILM15-S05": 1, "FILM15-S06": 1, "FILM15-S07": 1, "FILM15-S08": 1,
  "SUP-PAPTOW12": 1,
  "SUP-TRASHBLACK": 1, "SUP-TRASHWHITE": 1, "SUP-MASKTOMCLAN": 1, "SUP-MASKDOKU": 1, "SUP-MASKDRHZ": 1,
  "SUP-TRABAG": 1, "SUP-MASDAIPRO": 1,
  "MALTO": 1, "TMP-SEAS-MALTODEXTRINCLINTOSECR": 1,
  "TMP-F15-LOADEDPOTATO": 1, "TMP-F15-LOADEDNACHO": 1,
  "MCASE-BOX": 1, "BOX-S-14632": 1, "CASEBOX-12": 1,
  "SEED-WHITE": 1
};

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
function enc(v) { return encodeURIComponent(v == null ? "" : String(v)); }
function csvCell(v) {
  var s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function writeAction(a) {
  if (a.op === "create") {
    var res = await fetch(url + "/rest/v1/items", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        id: a.item, code: a.item, name: a.desc || a.item, flavor: a.desc || a.item,
        category: a.category || "other", unit: a.unit || "ea", reorder: 0, supplier: null
      })
    });
    if (res.status === 409) return;
    var text = await res.text();
    if (!res.ok) throw new Error("create " + a.item + " " + res.status + " " + text.slice(0, 300));
    if (text.indexOf(a.item) < 0) throw new Error("create " + a.item + " did not return the item");
    return;
  }
  if (a.op === "retire") {
    await rest("/rest/v1/items?id=eq." + enc(a.item), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ name: a.name, flavor: a.name, category: a.category })
    });
    return;
  }
  if (a.op === "patch-item") {
    await rest("/rest/v1/items?id=eq." + enc(a.item), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ name: "Maltodextrin Clintose CR-10 (ADM Corn Processing)", flavor: "Maltodextrin Clintose CR-10 (ADM Corn Processing)" })
    });
    return;
  }
  if (a.op === "delete") {
    var lot = a.from && a.from.lot != null ? a.from.lot : (a.lot || "");
    var loc = a.from && a.from.location ? a.from.location : a.location;
    await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(loc) + "&lot=eq." + enc(lot), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    });
    return;
  }
  if (a.op === "update") {
    var fromLot = a.from && a.from.lot != null ? a.from.lot : (a.lot || "");
    var fromLoc = a.from && a.from.location ? a.from.location : a.location;
    await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(fromLoc) + "&lot=eq." + enc(fromLot), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ qty: a.qty, location: a.location || fromLoc, lot: a.lot || "", expires_on: a.expires_on || null })
    });
    return;
  }
  if (a.op === "insert") {
    await rest("/rest/v1/stock", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        item_id: a.item, location: a.location, lot: a.lot || "", qty: a.qty, expires_on: a.expires_on || null
      })
    });
  }
}

async function main() {
  var latest = JSON.parse(fs.readFileSync(path.join(root, "data", "adriana-latest.json"), "utf8"));
  var items = await page("/rest/v1/items?select=id,code,name,flavor,category,unit,supplier&order=id.asc");
  var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on,updated_at,coa_received,coa_released_at&order=item_id.asc,location.asc,lot.asc");
  var planned = plan.planAll(latest, stock, items, { today: "2026-11-06", sheetAsOf: latest.sheetAsOf });
  var steps = planned.actions.filter(function (a) {
    return ALLOW[a.item] && (a.op === "create" || a.op === "delete" || a.op === "update" || a.op === "insert" || a.op === "retire" || a.op === "patch-item");
  });
  var outside = planned.applied.filter(function (a) { return a.item && !ALLOW[a.item] && a.op !== "create"; });
  var lines = ["result,item,lot,location,os_before,sheet,os_after,reason"];
  steps.forEach(function (a) {
    lines.push(["apply", a.item, a.lot || (a.from && a.from.lot) || "", a.location || (a.from && a.from.location) || "", a.from ? a.from.qty : "", a.sheet != null ? a.sheet : a.qty, a.op === "delete" ? 0 : (a.qty != null ? a.qty : ""), a.op].map(function (v) {
      var s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(","));
  });
  planned.holds.forEach(function (h) {
    if (!ALLOW[h.item] && h.item) return;
    lines.push(["held", h.item || h.desc || "", h.lot || "", h.location || "", h.os != null ? h.os : "", h.sheet != null ? h.sheet : "", h.os != null ? h.os : "", h.reason].map(function (v) {
      var s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(","));
  });
  var out = path.join(root, "reports", APPLY ? "adriana-1106-applied.csv" : "adriana-1106-dry-run.csv");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n") + "\n");
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    writes: steps.length,
    outside: outside.length,
    file: out
  }));
  outside.slice(0, 15).forEach(function (a) { console.log("outside", a.op, a.item, a.qty); });
  if (!APPLY) return;

  var prior = await rest("/rest/v1/kv_status?key=eq." + enc(CLOUD_KEY) + "&select=value", { headers: headers(), cache: "no-store" });
  if (prior && prior[0] && String(prior[0].value).indexOf("done:") === 0) {
    console.log("already done");
    return;
  }
  var rank = { create: 0, delete: 1, update: 2, insert: 3, "patch-item": 4, retire: 5 };
  steps = steps.slice().sort(function (a, b) { return rank[a.op] - rank[b.op]; });
  for (var i = 0; i < steps.length; i++) await writeAction(steps[i]);
  var notes = [
    ["SEED-WHITE", "Lot 26219H03 packed 2026-08-07. Expiration is unknown. 900 lb stays active."],
    ["MCASE-BOX", "Adriana confirmed master case box 5,800."],
    ["BOX-S-14632", "Adriana confirmed baby bucket 3,250."],
    ["CASEBOX-12", "Adriana confirmed box 12 pack 47,125."]
  ];
  for (var n = 0; n < notes.length; n++) {
    await rest("/rest/v1/transactions", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ ts: new Date().toISOString(), action: "Count/Adjust", detail: notes[n][0] + ": " + notes[n][1], operator: OPERATOR })
    });
  }
  var touched = {};
  steps.forEach(function (a) { if (a.item) touched[a.item] = 1; });
  var ids = Object.keys(touched);
  for (var k = 0; k < ids.length; k++) {
    await rest("/rest/v1/transactions", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ ts: new Date().toISOString(), action: "Count/Adjust", detail: ids[k] + " set from Adriana confirmation 2026-11-06", operator: OPERATOR })
    });
  }
  await rest("/rest/v1/kv_status?on_conflict=key", {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ key: CLOUD_KEY, value: "done:" + new Date().toISOString() })
  });
  console.log("applied " + steps.length);
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

#!/usr/bin/env node
/* Daily SPS saved-search load for Smackin OS open demand.
   OS open demand must equal the live SPS Fulfillment "New" and "Open"
   orders from the two saved searches named Target and Exclude Target.

   File format: the SPS 850 CSV export (a header row with "PO Number" and
   "Record Type", H rows for the order, D rows for the lines). Drop both
   search exports. A ShipIQ CSV is optional and only fills pickup dates.

   Steps for a bot:
   1. Export saved search "Target" and saved search "Exclude Target"
      from SPS Fulfillment (New and Open). Save the CSVs.
   2. Dry run (no writes):
      node scripts/sps-ui-load.js target.csv exclude-target.csv
   3. Apply when the dry run looks right:
      node scripts/sps-ui-load.js --apply target.csv exclude-target.csv
   The apply inserts new POs and lines, updates quantities on matching
   partner + PO + DC + flavor rows, and closes other Open rows with
   [[CLOSED:YYYY-MM-DD:not-live-sps-open]]. Rows marked in demand_po_stage
   stay open unless the file shows that PO closed. Running it twice with
   the same files changes no demand rows the second time.
   It also stores kv_status key demand:open-snapshot so Make Plan can
   show vs last load. It does not touch stock, lots, or SPS documents.

   Uses the publishable key already in config.js unless SUPABASE_URL and
   SUPABASE_ANON_KEY are set. No new permission is granted.
*/
"use strict";

var fs = require("fs");
var path = require("path");
var DEMAND = require("../demand.js");

function argList(argv) {
  var apply = false;
  var files = [];
  argv.slice(2).forEach(function (a) {
    if (a === "--apply") apply = true;
    else files.push(a);
  });
  return { apply: apply, files: files };
}

function readConfig() {
  var text = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
  var url = (text.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1] || "";
  var key = (text.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1] || "";
  return {
    url: process.env.SUPABASE_URL || url,
    key: process.env.SUPABASE_ANON_KEY || key
  };
}

function loadFiles(files) {
  var lines = [];
  var ship = { byPO: {} };
  files.forEach(function (file) {
    var text = fs.readFileSync(file, "utf8");
    var type = DEMAND.detectType(text);
    if (type === "shipiq") {
      var shipParsed = DEMAND.parseShipIQ(text);
      Object.keys(shipParsed.byPO).forEach(function (po) { ship.byPO[po] = shipParsed.byPO[po]; });
      return;
    }
    if (type !== "sps") throw new Error(file + " is not an SPS 850 CSV (need PO Number and Record Type)");
    var parsed = DEMAND.parseSPS(text);
    lines = lines.concat(parsed.lines);
    (parsed.warnings || []).forEach(function (w) { console.error("warn " + file + ": " + w); });
  });
  lines.forEach(function (row) {
    var extra = ship.byPO[row.po];
    if (!extra) return;
    if (extra.pickup) row.due_date = extra.pickup;
    if (extra.load) row.load = extra.load;
  });
  return lines;
}

function rest(cfg, query, opts) {
  opts = opts || {};
  return fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/" + query, {
    method: opts.method || "GET",
    headers: {
      apikey: cfg.key,
      Authorization: "Bearer " + cfg.key,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=minimal"
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function (res) {
    return res.text().then(function (text) {
      var data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((opts.method || "GET") + " " + query + " " + res.status + " " + text.slice(0, 300));
      return data;
    });
  });
}

async function main() {
  var args = argList(process.argv);
  if (!args.files.length) {
    console.error("Usage: node scripts/sps-ui-load.js [--apply] target.csv exclude-target.csv");
    process.exit(2);
  }
  var incoming = loadFiles(args.files);
  var cfg = readConfig();
  if (!cfg.url || !cfg.key) throw new Error("Supabase URL and key are missing");
  var open = await rest(cfg, "demand_lines?select=id,partner,po,dc,flavor,flavor_code,qty,cases,bags,due_date,status,notes,batch_id,batch_label,source&status=in.(Open,New)");
  var staged = await rest(cfg, "demand_po_stage?select=partner,po,pickup_date,note");
  var today = DEMAND.denverToday();
  var plan = DEMAND.reconcileOpen(open, incoming, { staged: staged, today: today });
  console.log(JSON.stringify({
    today: today,
    incoming: incoming.length,
    insert: plan.insert.length,
    update: plan.update.length,
    close: plan.close.length,
    unchanged: plan.unchanged,
    refused: plan.refused || "",
    stagedKept: (staged || []).length
  }, null, 2));
  if (!args.apply) {
    console.log("Dry run only. Pass --apply to write demand_lines and demand:open-snapshot.");
    return;
  }
  if (plan.refused) throw new Error("Refusing to apply an empty export");
  var batch = "SPS-UI-" + today;
  var label = "SPS UI " + today;
  var now = new Date().toISOString();
  for (var i = 0; i < plan.close.length; i++) {
    var c = plan.close[i];
    await rest(cfg, "demand_lines?id=eq." + encodeURIComponent(c.id), {
      method: "PATCH",
      body: { status: "Complete", notes: c.notes }
    });
  }
  for (var u = 0; u < plan.update.length; u++) {
    var row = plan.update[u];
    var patch = { qty: row.qty, cases: row.cases, bags: row.bags, batch_id: batch, batch_label: label };
    if (row.due_date) patch.due_date = row.due_date;
    if (row.uom) patch.uom = row.uom;
    await rest(cfg, "demand_lines?id=eq." + encodeURIComponent(row.id), { method: "PATCH", body: patch });
  }
  for (var n = 0; n < plan.insert.length; n += 100) {
    var chunk = plan.insert.slice(n, n + 100).map(function (r) {
      return {
        batch_id: batch, batch_label: label, source: r.source || "SPS",
        partner: r.partner, po: r.po, dc: r.dc || "", flavor: r.flavor, flavor_code: r.flavor_code || "",
        uom: r.uom || "", qty: r.qty || 0, cases: r.cases || 0, bags: r.bags || 0,
        unit_price: r.unit_price || 0, due_date: r.due_date || "", load: r.load || "",
        status: "Open", notes: r.notes || "", imported_by: "sps-ui-load"
      };
    });
    await rest(cfg, "demand_lines", { method: "POST", body: chunk });
  }
  var before = DEMAND.openCensus(open);
  var afterOpen = await rest(cfg, "demand_lines?select=partner,po,bags,status,batch_id,batch_label&status=in.(Open,New)");
  var after = DEMAND.openCensus(afterOpen);
  await rest(cfg, "kv_status?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      key: "demand:open-snapshot",
      value: JSON.stringify({ at: now, current: Object.assign({ at: now }, after), previous: Object.assign({ at: now }, before) }),
      updated_at: now
    }
  });
  console.log("Applied " + batch + ". Insert " + plan.insert.length + ", update " + plan.update.length + ", close " + plan.close.length + ".");
}

if (require.main === module) {
  main().catch(function (err) {
    console.error(err && err.stack || err);
    process.exit(1);
  });
}

module.exports = { loadFiles: loadFiles, argList: argList };

#!/usr/bin/env node
/* Dollar Tree finished goods. No network. No live rows. */
"use strict";

var fs = require("fs");
var path = require("path");
var api = require("../dt-finished.js");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

eq(api.canEdit("inventory@smackinsnacks.com"), "adri can save");
eq(api.canEdit("Troy.Dircks@SmackinSnacks.com"), "troy can save");
eq(!api.canEdit("troy@smackinsnacks.com"), "a different troy address cannot save");
eq(!api.canEdit("michelle.nydegger@smackinsnacks.com"), "michelle is view only");
eq(!api.canEdit("mattb@smackinsnacks.com"), "matt is view only");
eq(!api.canEdit(""), "blank email is view only");

var blank = api.nullableQty("");
var missing = api.nullableQty(null);
var zero = api.nullableQty("0");
var over = api.nullableQty("100001");
eq(blank.ok && blank.value === null && missing.ok && missing.value === null, "unknown qty is null");
eq(zero.ok && zero.value === 0, "a typed zero stays zero");
eq(!over.ok, "over 100000 is refused");

var made = api.rowPayload({
  sku: "DT275-BBQ", pallet_id: "P-1", lot: "", location: "A-01",
  cases: "", units: "", date_built: "2026-11-06", status: "ready_to_ship",
  shipped_reference: "should-clear", notes: "note", entered_by: "Adriana"
}, null, "inventory@smackinsnacks.com");
eq(made.ok && made.row.cases === null && made.row.units === null, "blank numbers stay null");
eq(made.row.status === "ready_to_ship" && made.row.shipped_at === null && made.row.shipped_reference === null, "ready to ship clears shipment fields");
eq(made.row.entered_by_email === "inventory@smackinsnacks.com" && made.row.pallet_id === "P-1", "owner and pallet are stored");

var shipped = api.rowPayload({
  sku: "DT275-CINNAMON", pallet_id: "P-2", cases: "10", units: "120",
  status: "shipped", shipped_reference: "BOL-22", entered_by: "Troy", shipped_at: "2026-11-06T12:00:00.000Z"
}, null, "troy.dircks@smackinsnacks.com");
eq(shipped.ok && shipped.row.status === "shipped" && shipped.row.shipped_reference === "BOL-22" && shipped.row.shipped_at === "2026-11-06T12:00:00.000Z" && shipped.row.cases === 10 && shipped.row.units === 120, "shipped stores the ref and the time");

var other = api.rowPayload({ sku: "DT275-BBQ", pallet_id: "P-3", entered_by: "Matt" }, null, "mattb@smackinsnacks.com");
eq(!other.ok, "another account cannot build a save");
var stolen = api.rowPayload({
  sku: "DT275-BBQ", pallet_id: "P-1", entered_by: "Troy", status: "shipped"
}, { id: "row-1", entered_by_email: "inventory@smackinsnacks.com", status: "ready_to_ship" }, "troy.dircks@smackinsnacks.com");
eq(!stolen.ok && stolen.msg === "own", "troy cannot take adri's pallet");
eq(!api.rowPayload({ sku: "DT275-BBQ", pallet_id: "", entered_by: "Adriana" }, null, "inventory@smackinsnacks.com").ok, "pallet id is required");
eq(!api.rowPayload({ sku: "BAG4-S01", pallet_id: "P-9", entered_by: "Adriana" }, null, "inventory@smackinsnacks.com").ok, "only dollar tree skus");

var view = api.renderHtml({ email: "mattb@smackinsnacks.com", rows: [] });
eq(view.indexOf("id=\"dtfg-save\"") < 0, "view only has no save button");
eq(view.indexOf("id=\"dtfg-empty\"") >= 0, "empty ledger");
eq(view.indexOf("7,920") >= 0 && view.indexOf("68,160") >= 0 && view.indexOf("3,600") >= 0, "stale stock is visible as a note");
eq(view.indexOf("id=\"dtfg-rows\"") < 0, "stale stock is not a pallet row");
eq(view.indexOf("machine 42") >= 0, "unverified pmac run is separate");
eq(view.indexOf(".delete(") < 0 && view.indexOf("DTFINISHED.del") < 0, "no delete control");

var edit = api.renderHtml({
  email: "inventory@smackinsnacks.com",
  rows: [],
  draft: { sku: "DT275-GARLIC", pallet_id: "P-7", cases: "", units: "", notes: "keep me", entered_by: "Adriana" }
});
eq(edit.indexOf('value="P-7"') >= 0 && edit.indexOf('value="keep me"') >= 0, "draft values survive a redraw");
eq(edit.indexOf('id="dtfg-cases" inputmode="decimal" autocomplete="off" value=""') >= 0, "cases box is empty rather than zero");

var src = read("dt-finished.js");
eq(src.indexOf("setInterval") < 0, "no timer");
eq(src.indexOf("SMK_VIEW_LOCKS") >= 0 && src.indexOf("SMK_BUSY") >= 0 && src.indexOf("MutationObserver") >= 0, "form lock and one observer");
eq(src.indexOf(".delete(") < 0, "module does not delete");
eq(src.indexOf("dollar_tree_finished_goods") >= 0, "reads the cloud table");
eq(src.indexOf("localStorage.setItem") < 0, "does not store pallets locally");
eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em dash");
["en", "es", "pt"].forEach(function (k) {
  eq(api.TXT[k] && api.TXT[k].title && api.TXT[k].stale, "copy " + k);
});
eq(read("index.html").indexOf("dt-finished.js?b=1") >= 0, "script tag");
eq(read("service-worker.js").indexOf('"./dt-finished.js"') >= 0, "precached");
eq(read("service-worker.js").indexOf('const CACHE = "smackin-inv-v312"') >= 0, "cache");
eq(read("dept-homes.js").indexOf('"dtfg"') >= 0, "inventory tab");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("dollar tree finished goods ok");

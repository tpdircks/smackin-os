#!/usr/bin/env node
/* Receive / Dock lot matching. No browser, no network, no Supabase writes.
   The legacy lot-only finder is the Nov 4 2026 overwrite: Dill then
   Cracked Pepper, same typed lot J1926, one Dock row. */
"use strict";

var fs = require("fs");
var path = require("path");
var rm = require("../recv-match.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

function legacyFindRecvByLot(rows, lot) {
  var key = rm.normRecvLot(lot);
  if (!key) return null;
  for (var i = 0; i < rows.length; i++) {
    if (rm.normRecvLot(rows[i].lot) === key) return rows[i];
  }
  return null;
}

function applyPlan(rows, next, opts) {
  var plan = rm.planReceiveSave(rows, next, opts || {});
  var out = rows.map(function (r) { return Object.assign({}, r); });
  if (plan.action === "update") {
    var idx = -1;
    for (var i = 0; i < out.length; i++) {
      if (String(out[i].id) === String(plan.id)) idx = i;
    }
    if (idx < 0) return { rows: out, plan: plan, missing: true };
    var patch = plan.rec || {};
    ["recv_date", "supplier", "po_num", "carrier", "tracking", "contents", "lot", "qty_ordered", "qty_received", "condition", "received_by", "notes", "item_id"].forEach(function (k) {
      if (patch[k] !== undefined) out[idx][k] = patch[k];
    });
  } else {
    out.push(Object.assign({
      id: "new-" + (out.length + 1),
      file_name: "",
      coa_received: ""
    }, plan.rec, { id: "new-" + (out.length + 1) }));
  }
  return { rows: out, plan: plan, missing: false };
}

var dill = {
  id: "dill-1",
  item_id: "SEAS-DILL",
  contents: "Rocky Mountain Dill Pickle",
  lot: "J1926",
  supplier: "Seasoning Co",
  po_num: "PO-4481",
  carrier: "XPO",
  recv_date: "2026-11-04",
  qty_received: 40,
  file_name: "dill-coa.pdf",
  coa_received: "yes",
  created_at: "2026-11-04T15:00:00.000Z"
};
var pepper = {
  recv_date: "2026-11-04",
  supplier: "Seasoning Co",
  po_num: "PO-4481",
  carrier: "XPO",
  contents: "Cracked Pepper",
  lot: "j 1926",
  qty_received: 12,
  item_id: "SEAS-PEPPER",
  condition: "Good",
  received_by: "Adriana",
  file_name: "pepper-coa.pdf",
  coa_received: "yes"
};

assert(rm.normRecvLot("j 1926") === "J1926" && rm.normRecvLot("J1926") === "J1926", "lot key ignores case and spaces");
assert(legacyFindRecvByLot([dill], "j 1926").id === "dill-1", "legacy lot-only match returns the Dill row");

var crossed = applyPlan([dill], pepper, {});
assert(crossed.plan.action === "insert", "different item, same lot, inserts");
assert(crossed.plan.warnings.length === 1 && crossed.plan.warnings[0].contents === "Rocky Mountain Dill Pickle", "warns that the lot is already on Dill");
assert(crossed.rows.length === 2, "two different items, same normalized lot, two rows");
assert(crossed.rows[0].id === "dill-1" && crossed.rows[0].qty_received === 40, "Dill qty stays");
assert(crossed.rows[0].contents === "Rocky Mountain Dill Pickle", "Dill name stays");
assert(crossed.rows[0].file_name === "dill-coa.pdf" && crossed.rows[0].coa_received === "yes", "Dill COA stays on the Dill row");
assert(crossed.rows[0].item_id === "SEAS-DILL" && crossed.rows[1].item_id === "SEAS-PEPPER", "each row keeps its item");
assert(crossed.rows[1].qty_received === 12 && crossed.rows[1].contents === "Cracked Pepper", "Pepper is its own row");
assert(rm.lotReuseMessage(crossed.plan.warnings, "en").indexOf("Rocky Mountain Dill Pickle") >= 0, "warn text names the other item");
assert(rm.lotReuseMessage(crossed.plan.warnings, "en").indexOf("not merged") >= 0, "warn text says the rows were not merged");

var again = {
  recv_date: "2026-11-04",
  supplier: "Seasoning Co",
  po_num: "PO-4481",
  carrier: "XPO",
  contents: "Rocky Mountain Dill Pickle",
  lot: "J1926",
  qty_received: 55,
  item_id: "SEAS-DILL",
  condition: "Good",
  received_by: "Adriana"
};
var upsert = applyPlan([dill], again, {});
assert(upsert.plan.action === "update" && upsert.plan.id === "dill-1" && upsert.plan.reason === "same-item-lot-day", "same item, same lot, same day updates that row");
assert(upsert.rows.length === 1 && upsert.rows[0].qty_received === 55, "upsert keeps one row and the new qty");
assert(upsert.rows[0].file_name === "dill-coa.pdf" && upsert.rows[0].coa_received === "yes", "same-item upsert does not clear the COA already on the row");
assert(upsert.plan.warnings.length === 0, "same item is not a lot-reuse warning");

var edited = applyPlan([dill, { id: "pep-1", item_id: "SEAS-PEPPER", contents: "Cracked Pepper", lot: "J1926", supplier: "Seasoning Co", recv_date: "2026-11-04", qty_received: 12, file_name: "pepper-coa.pdf", coa_received: "no" }], {
  recv_date: "2026-11-04",
  supplier: "Seasoning Co",
  contents: "Rocky Mountain Dill Pickle",
  lot: "J1926",
  qty_received: 41,
  item_id: "SEAS-DILL"
}, { editId: "dill-1" });
assert(edited.plan.action === "update" && edited.plan.reason === "edit" && edited.plan.id === "dill-1", "explicit Edit updates that row");
assert(edited.rows[1].id === "pep-1" && edited.rows[1].qty_received === 12 && edited.rows[1].coa_received === "no", "Edit does not touch the other item");
assert(edited.rows[0].qty_received === 41, "Edit writes the Dill qty");

var otherLot = applyPlan([dill], {
  recv_date: "2026-11-04",
  supplier: "Seasoning Co",
  contents: "Cracked Pepper",
  lot: "K2001",
  qty_received: 8,
  item_id: "SEAS-PEPPER"
}, {});
assert(otherLot.plan.action === "insert" && otherLot.plan.warnings.length === 0, "different lots do not warn");
assert(otherLot.rows.length === 2 && otherLot.rows[0].lot === "J1926" && otherLot.rows[1].lot === "K2001", "different items, different lots, two rows");

var nextDay = applyPlan([dill], {
  recv_date: "2026-11-05",
  supplier: "Seasoning Co",
  contents: "Rocky Mountain Dill Pickle",
  lot: "J1926",
  qty_received: 10,
  item_id: "SEAS-DILL"
}, {});
assert(nextDay.plan.action === "insert" && nextDay.rows.length === 2, "same item and lot on a later day is a new row");

var otherSup = applyPlan([dill], {
  recv_date: "2026-11-04",
  supplier: "Other Spice",
  contents: "Rocky Mountain Dill Pickle",
  lot: "J1926",
  qty_received: 4,
  item_id: "SEAS-DILL"
}, {});
assert(otherSup.plan.action === "insert" && otherSup.rows.length === 2, "same item and lot, different supplier, is a new row");

var blank = applyPlan([dill], {
  recv_date: "2026-11-04",
  supplier: "Seasoning Co",
  contents: "Cracked Pepper",
  lot: "",
  qty_received: 3,
  item_id: "SEAS-PEPPER"
}, {});
assert(blank.plan.action === "insert" && blank.plan.warnings.length === 0, "a blank lot does not match Dill");

var stampRows = [
  { id: "dill-1", item_id: "SEAS-DILL", lot: "J1926", coa_received: "yes" },
  { id: "pep-1", item_id: "SEAS-PEPPER", lot: "J-1926", coa_received: "no" }
];
var stamped = rm.receivingLogCoaScope(stampRows, { recvId: "dill-1", itemIds: ["SEAS-PEPPER"], lot: "J1926" });
assert(stamped.length === 0, "a Pepper COA stamp does not write the Dill receipt");
var pepperStamp = rm.receivingLogCoaScope(stampRows, { recvId: "pep-1", itemIds: ["SEAS-PEPPER"], lot: "J1926" });
assert(pepperStamp.length === 1 && pepperStamp[0].id === "pep-1", "stamp stays on the Pepper receipt");
var byLot = rm.receivingLogCoaScope(stampRows, { itemIds: ["SEAS-DILL"], lot: "J1926" });
assert(byLot.length === 1 && byLot[0].id === "dill-1", "lot fallback stays on the same item");
assert(rm.receivingLogCoaScope(stampRows, { itemIds: ["SEAS-PEPPER"], lot: "J1926" })[0].id === "pep-1", "punctuation in the lot still matches that item only");

assert(rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40) === "SEAS-DILL|A-01-L1|40", "adjust key");
assert(rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40) === rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40), "same adjust dedupes");
assert(rm.adjustDedupeKey("SEAS-PEPPER", "A-01-L1", 40) !== rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40), "a different item is a different adjust");
assert(rm.adjustDedupeKey("SEAS-DILL", "A-01-L2", 40) !== rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40), "a different bin is a different adjust");
assert(rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 41) !== rm.adjustDedupeKey("SEAS-DILL", "A-01-L1", 40), "a different qty is a different adjust");

var app = read("app.js");
var db = read("db.js");
var sw = read("service-worker.js");
var html = read("index.html");
assert(/}\)\(\);\s*$/.test(app), "app.js is not truncated");
assert(app.indexOf("findRecvByLot") < 0, "receive no longer matches a Dock row by lot alone");
assert(app.indexOf("planReceiveSave") >= 0, "receive uses the item-scoped plan");
assert(app.indexOf("__smkLastRecvId") >= 0 && app.indexOf("__smkLastRecvItem") >= 0, "the saved receipt id is handed to the COA attach");
assert(app.indexOf("coa_docs") < 0, "app.js does not name the COA table");
assert(db.indexOf("RECVMATCH.adjustDedupeKey") >= 0, "stock adjust uses the shared key");
assert(db.indexOf("RECVMATCH.receivingLogCoaScope") >= 0, "COA stamp uses the item scope");
assert(sw.indexOf("./recv-match.js") >= 0, "service worker caches the helper");
assert(html.indexOf("recv-match.js?b=1") >= 0, "helper script tag");
assert(read("recv-match.js").indexOf("\u2014") < 0 && read("recv-match.js").indexOf("\u2013") < 0, "no em dash");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("recv-match ok");

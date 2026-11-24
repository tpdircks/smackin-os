#!/usr/bin/env node
/* Supplier is required on a receipt. Invoice-pending ages after 3 days.
   No network. No receiving_log writes. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var sop = require("../receiving-sop.js");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

["", "   ", "Unknown", "unknown", "UNKNOWN", " Unknown "].forEach(function (name) {
  eq(sop.supplierBad(name) === true, "bad supplier " + JSON.stringify(name));
  eq(sop.supplierProblem(name).indexOf("I need a real supplier") === 0, "message " + JSON.stringify(name));
  eq(sop.supplierProblem(name).indexOf("\u2014") < 0, "message dash " + JSON.stringify(name));
});
eq(sop.supplierBad("Fire House Flavors") === false, "Fire House is a supplier");
eq(sop.supplierBad("Herman's Nuthouse") === false, "named supplier");
eq(sop.supplierProblem("Other") === "", "Other from the existing list is allowed");

var names = sop.supplierChoices({
  listed: ["Fire House Flavors", "Unknown", "  ", "Sunrich"],
  pos: [{ supplier: "PPC FLEX LLC" }, { supplier: "unknown" }],
  receipts: [{ supplier: "Herman's Nuthouse" }, { supplier: "Unknown" }, { supplier: "" }],
  suppliers: [{ name: "Sunrich / Seed Supplier" }, { name: "Sunrich" }]
});
eq(names.indexOf("Fire House Flavors") >= 0, "listed supplier offered");
eq(names.indexOf("PPC FLEX LLC") >= 0, "supplier PO offered");
eq(names.indexOf("Herman's Nuthouse") >= 0, "prior receipt offered");
eq(names.indexOf("Sunrich / Seed Supplier") >= 0, "supplier master offered");
eq(names.indexOf("Unknown") < 0 && names.indexOf("unknown") < 0, "Unknown is not offered");
eq(names.indexOf("") < 0 && names.indexOf("  ") < 0, "blank is not offered");
eq(names.filter(function (n) { return n === "Sunrich"; }).length === 1, "duplicates collapse");
eq(names.indexOf("Invented Spice Co") < 0, "no invented supplier");

var base = {
  recv_date: "2026-11-19", received_time: "09:00", received_by: "Adriana",
  contents: "Cashews", lot: "H1", qty_received: 1,
  chk_trailer_sealed: "N", chk_trailer_clean: "Y", chk_coa_label: "A",
  chk_approved_supplier: "Y", chk_carrier_sanitation: "A", chk_material_condition: "A",
  allergen: "U", temp_not_measured: true
};
var blank = sop.validate(Object.assign({ supplier: "  " }, base));
eq(blank.length === 1 && blank[0].indexOf("I need a real supplier") === 0, "blank supplier blocks the checklist save");
var unk = sop.validate(Object.assign({ supplier: "UnKnOwN" }, base));
eq(unk.length === 1 && unk[0].indexOf("Unknown") >= 0, "Unknown supplier blocks the checklist save");
eq(sop.validate(Object.assign({ supplier: "Fire House Flavors" }, base)).length === 0, "a real supplier still passes");
eq(sop.draftGaps({ supplier: "Unknown", contents: "Seed", lot: "L1", qty_received: 4, received_by: "Adri" }).join(",") === "supplier", "Unknown is still a gap");

var dhSrc = read("data-health.js");
var c = {
  document: {
    readyState: "loading",
    addEventListener: function () {},
    createElement: function () { return { id: "" }; },
    getElementById: function () { return null; }
  },
  MutationObserver: function () { return { observe: function () {} }; }
};
c.window = c;
c.SMACKIN_CONFIG = {};
c.supabase = {};
vm.createContext(c);
vm.runInContext(dhSrc, c);
var api = c.DATAHEALTH.forTest;
eq(api.calendarDays("2026-11-13", "2026-11-19") === 6, "Nov 13 to Nov 19 is 6 days");
eq(api.calendarDays("2026-11-16", "2026-11-19") === 3, "Nov 16 to Nov 19 is 3 days");
eq(api.calendarDays("2026-11-15", "2026-11-19") === 4, "Nov 15 to Nov 19 is 4 days");
eq(api.INVOICE_PENDING_DAYS === 3, "threshold is 3 days");

var rows = [
  { recv_date: "2026-11-13", supplier: "Herman's Nuthouse", po_num: null, contents: "Cashew Churro", lot: "H 26289", qty_received: "8640", invoice_pending: true },
  { recv_date: "2026-11-13", supplier: "Herman's Nuthouse", po_num: null, contents: "Cashew Churro", lot: "H 26292", qty_received: "7056", invoice_pending: true },
  { recv_date: "2026-11-13", supplier: "Unknown", po_num: null, contents: "Advent Calendar 12 Days Green", lot: "", qty_received: "2050", invoice_pending: true },
  { recv_date: "2026-11-13", supplier: "Unknown", po_num: null, contents: "Advent Calendar 1.5 oz packaging rolls", lot: "", qty_received: "40", invoice_pending: false },
  { recv_date: "2026-11-16", supplier: "PPC FLEX LLC", po_num: "", contents: "Film", lot: "#", qty_received: "1", invoice_pending: true },
  { recv_date: "2026-11-15", supplier: "Acme", po_num: "PO-1", contents: "Oil", lot: "L", qty_received: "2", invoice_pending: true },
  { recv_date: "2026-11-01", supplier: "Acme", po_num: "", contents: "Seed", lot: "S", qty_received: "3", invoice_pending: false },
  { recv_date: "2026-09-09", supplier: "  ", contents: "Bags 4oz - Cinnamon Churro", lot: null, qty_received: "288", invoice_pending: null, po_num: "815-446343" }
];
var pending = api.pendingInvoices(rows, "2026-11-19");
eq(pending.length === 3, "only rows more than 3 days and still pending, got " + pending.length);
eq(pending.some(function (r) { return r.lot === "H 26289" && r.days === 6 && r.qty === "8640" && r.supplier === "Herman's Nuthouse"; }), "Nov 13 cashew is 6 days pending");
eq(pending.some(function (r) { return r.item === "Advent Calendar 12 Days Green" && r.supplier === "Unknown" && r.days === 6; }), "pending Unknown row is listed");
eq(!pending.some(function (r) { return r.item === "Film"; }), "3 days is not more than 3");
eq(!pending.some(function (r) { return r.item === "Oil"; }), "a PO number clears pending");
eq(!pending.some(function (r) { return r.item === "Seed"; }), "a closed invoice is not pending");
eq(!pending.some(function (r) { return r.item.indexOf("packaging rolls") >= 0; }), "invoice_pending false stays off the aging list");

var four = api.pendingInvoices([
  { recv_date: "2026-11-15", supplier: "Acme", po_num: "", contents: "Oil", lot: "L2", qty_received: 4, invoice_pending: true }
], "2026-11-19");
eq(four.length === 1 && four[0].days === 4, "day 4 is pending");

var missing = api.unknownSuppliers(rows);
eq(missing.length === 3, "blank, Unknown pending, and Unknown not pending, got " + missing.length);
eq(missing.some(function (r) { return r.item.indexOf("Cinnamon Churro") >= 0 && r.supplier === "" && r.recv_date === "2026-09-09" && r.qty === "288"; }), "blank supplier is flagged");
eq(missing.some(function (r) { return r.item.indexOf("packaging rolls") >= 0 && r.supplier === "Unknown" && r.qty === "40"; }), "Unknown with a closed invoice is still flagged");
eq(!missing.some(function (r) { return r.supplier === "Herman's Nuthouse" || r.supplier === "Acme"; }), "a real supplier is not flagged");

var html = api.guardHtml({ invoicePending: pending, unknownSupplier: missing });
eq(html.indexOf("Invoice pending more than 3 days") >= 0, "aging flag title");
eq(html.indexOf("Days pending") >= 0 && html.indexOf("H 26289") >= 0 && html.indexOf("8640") >= 0, "aging table");
eq(html.indexOf("Supplier missing") >= 0 && html.indexOf("Adri can fill the supplier") >= 0, "unknown flag");
eq(html.indexOf("I did not change") >= 0, "read only copy");
eq(html.indexOf("\u2014") < 0 && html.indexOf("\u2013") < 0, "flag html has no em dash");
var clear = api.guardHtml({ invoicePending: [], unknownSupplier: [] });
eq(clear.indexOf("I do not see a receipt still waiting") >= 0, "empty aging is ok");
eq(clear.indexOf("I do not see a receipt with a blank or Unknown supplier") >= 0, "empty supplier flag is ok");

var app = read("app.js");
var db = read("db.js");
eq(app.indexOf('id: "r-sup"') >= 0 && app.indexOf('listId: "dl-r-sup"') >= 0, "receive picker");
eq(app.indexOf('id: "rl-supplier"') >= 0 && app.indexOf('listId: "dl-rl-sup"') >= 0, "log picker");
eq(app.indexOf('id="r-save"') >= 0 && app.indexOf('id="rl-save"') >= 0, "save buttons");
eq(app.indexOf("supplierBad(snap.sup)") >= 0 && app.indexOf("supplierBad(supplier)") >= 0, "both saves check the supplier");
eq(app.indexOf("list=\"' + opts.listId") >= 0 && app.indexOf("<select id=\"r-sup\">") < 0, "typed name still uses an input");
eq(db.indexOf("function supplierRejected") >= 0 && db.indexOf("async function addReceivingLog") > db.indexOf("function supplierRejected"), "db rejects before insert");
eq(db.indexOf("const supErr = supplierRejected(rec && rec.supplier)") >= 0, "insert guard");
eq(db.indexOf("supplierChangeBlocked") >= 0, "edit can replace Unknown and cannot newly blank it");
eq(read("trace.js").indexOf("supplierBad(r.supplier)") >= 0 && read("trace.js").indexOf('id="trc-r-save"') >= 0, "trace receive blocks a missing supplier");
eq(read("raw-coa.js").indexOf('toLowerCase() !== "unknown"') >= 0, "coa fallback does not log a blank supplier");
var rawExp = read("raw-exp.js");
eq(rawExp.indexOf("function suggestFireHouseLot") >= 0 && rawExp.indexOf("11/05/2027/4214") >= 0, "Fire House lot hint stays");
eq(rawExp.indexOf("us + \"/\" + item") >= 0, "Fire House lot is still expiration plus item number");
eq(read("service-worker.js").indexOf('const CACHE = "smackin-inv-v319"') >= 0, "cache");
eq(read("build-id.txt").trim() === "smackin-inv-v319", "build id");
var index = read("index.html");
eq(index.indexOf('src="app.js?b=222"') >= 0, "app bust");
eq(index.indexOf('src="db.js?b=111"') >= 0, "db bust");
eq(index.indexOf('src="data-health.js?b=18"') >= 0, "data health bust");
eq(index.indexOf('src="trace.js?b=30"') >= 0, "trace bust");
eq(index.indexOf('src="receiving-sop.js?b=10"') >= 0, "sop bust");
eq(index.indexOf('src="raw-coa.js?b=9"') >= 0, "coa bust");
eq(index.indexOf('src="sw-escape.js?b=36"') >= 0, "escape bust");
eq(dhSrc.indexOf("\u2014") < 0, "data health dash");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("supplier and invoice aging ok");

#!/usr/bin/env node
/* Invoice pending and transport / BOL. No network. No live receipts. */
"use strict";

var fs = require("fs");
var path = require("path");
var sop = require("../receiving-sop.js");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var fresh = sop.resolveInvoicePending({ po_num: "", transport_ref: "", invoice_pending: false }, null, "Adriana");
eq(fresh.invoice_pending === false && !fresh.resolution, "a new receipt defaults to not pending");
var marked = sop.resolveInvoicePending({ po_num: "  ", transport_ref: "BOL 10", invoice_pending: "1" }, null, "Adriana");
eq(marked.invoice_pending === true && marked.transport_ref === "BOL 10" && marked.po_num === "", "checkbox without an invoice stays pending");
var both = sop.resolveInvoicePending({ po_num: "PO-1", transport_ref: "BOL 10", invoice_pending: true }, null, "Adriana");
eq(both.invoice_pending === false && !both.resolution, "a first save with an invoice is not a resolution");
var uncleared = sop.resolveInvoicePending({ po_num: "", invoice_pending: false, transport_ref: "BOL 10" }, { invoice_pending: true, transport_ref: "BOL 10", po_num: "" }, "Jesus");
eq(uncleared.invoice_pending === true && !uncleared.resolution, "unchecking does not clear pending");
var resolved = sop.resolveInvoicePending({
  po_num: "INV-77",
  transport_ref: "BOL 10",
  invoice_pending: true,
  _when: "2026-11-06T19:04:00.000Z"
}, { invoice_pending: true, po_num: "", transport_ref: "OLD" }, "Adriana");
eq(resolved.resolution && resolved.resolution.who === "Adriana" && resolved.resolution.when === "2026-11-06T19:04:00.000Z", "resolution records who and when");
eq(resolved.resolution.old_invoice_pending === true && resolved.resolution.new_invoice_pending === false, "resolution records old and new pending");
eq(resolved.resolution.old_po_num === "" && resolved.resolution.new_po_num === "INV-77" && resolved.resolution.transport_ref === "BOL 10", "resolution records the invoice and keeps the BOL");
eq(sop.validate({
  recv_date: "2026-11-06", received_time: "09:00", received_by: "Adriana",
  supplier: "Example", contents: "Cashews", lot: "H26268", qty_received: 12,
  chk_trailer_sealed: "N", chk_trailer_clean: "Y", chk_coa_label: "A",
  chk_approved_supplier: "Y", chk_carrier_sanitation: "A", chk_material_condition: "A",
  allergen: "U", temp_not_measured: true, po_num: "", transport_ref: "BOL 10"
}).length === 0, "supplier and BOL save without an invoice");

var csv = sop.receivingCsv([{
  recv_date: "2026-11-06", received_by: "Adriana", supplier: "Example", contents: "Cashews",
  lot: "H26268", qty_received: 12, po_num: "", transport_ref: "BOL 10", invoice_pending: true,
  checklist: { allergen: "U", temp_not_measured: true }, on_hold: false
}]);
eq(csv.split("\r\n")[0].indexOf("Transport / BOL #") >= 0, "export header");
eq(csv.indexOf("BOL 10") >= 0 && csv.indexOf("Pending") >= 0, "export values");

var app = read("app.js");
var db = read("db.js");
var hist = read("history.js");
["r-transport", "r-inv-pending", "rl-transport", "rl-inv-pending", "rOptional", "rPendingBadge", "transport_ref", "invoice_pending"].forEach(function (s) {
  eq(app.indexOf(s) >= 0, "app has " + s);
});
eq(app.indexOf('PO / invoice #') >= 0 && app.indexOf("Transporte / BOL #") >= 0 && app.indexOf("Fatura pendente") >= 0, "labels in en es pt");
eq(db.indexOf("transport_ref") >= 0 && db.indexOf("invoice_pending") >= 0, "db persists both columns");
eq(db.indexOf("Invoice pending resolved") >= 0 && db.indexOf("resolveInvoicePending") >= 0, "db logs the resolution");
eq(hist.indexOf("invoiceTrail") >= 0, "history shows the trail");
eq(app.indexOf("\u2014") >= 0 || app.indexOf("rInvPendingHint") >= 0, "hint exists");
eq(app.indexOf("rInvPendingHint") >= 0 && app.slice(app.indexOf("rInvPendingHint"), app.indexOf("rInvPendingHint") + 400).indexOf("\u2014") < 0, "new hint has no em dash");
eq(read("pack-receive.js").indexOf('c === "cashews"') >= 0 && read("pack-receive.js").indexOf('c === "dollartree275"') >= 0, "finished categories");
eq(read("seed-data.js").indexOf('"CASHEWS"') >= 0 && read("seed-data.js").indexOf('"DOLLAR TREE 275"') >= 0, "receive categories");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("invoice pending ok");

#!/usr/bin/env node
/* Receiving SOP: LTL dock can save without a thermometer, a known allergen, or a seal. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var sop = require(path.join(root, "receiving-sop.js"));
var src = read("receiving-sop.js");
var app = read("app.js");
var html = read("index.html");
var sw = read("service-worker.js");

eq(sw.indexOf('const CACHE = "smackin-inv-v302"') >= 0, "cache bump");
eq(html.indexOf("receiving-sop.js?b=7") >= 0, "sop cache bust");
eq(html.indexOf("services.js?b=4") >= 0, "services cache bust");
eq(html.indexOf("raw-coa.js?b=5") >= 0, "coa script kept");
eq(html.indexOf("coa-docs.js?b=2") >= 0, "coa file script");
eq(html.indexOf("dept-homes.js?b=36") >= 0, "dept homes cache bust");
var homes = read("dept-homes.js");
var services = read("services.js");
var recvAt = homes.indexOf('id: "recv"');
var recv = homes.slice(recvAt, homes.indexOf('id: "inv"', recvAt));
eq(recv.indexOf('subs: ["recvlog", "services", "returns", "quarantine"]') >= 0, "services tab on receiving");
eq(recv.indexOf('actions: ["receive", "services", "trRecv"]') >= 0, "services action next to receive");
eq(recv.indexOf("uniform cleaning and other service invoices") >= 0, "receiving intro names uniforms");
var ops = homes.slice(homes.indexOf('id: "ops"'), homes.indexOf("function deptById"));
eq(ops.indexOf('"services"') < 0, "services is not buried on ops");
eq(homes.indexOf('if (btn.id === "svc-nav") return "recv"') >= 0, "sidebar services opens receiving");
eq(services.indexOf("data-dept-sub") >= 0, "services closes when a receiving tab is clicked");
eq(services.indexOf("Uniform cleaning and other service invoices") >= 0, "services screen names uniforms");
eq(src.indexOf("Not saved. Nothing is in the receiving log until Log receipt succeeds.") >= 0, "unsaved banner");
eq(src.indexOf("dockLotClash") >= 0, "shared lot is not a duplicate");
eq(src.indexOf("One row per item and lot") >= 0, "sop copy allows a shared lot");
eq(src.indexOf("|| (key && normLot(row.lot) === key)") < 0, "hold flag does not smear across the lot");
eq(src.indexOf("Attached, not logged:") >= 0, "file chip is not a save");
eq(src.indexOf("This file is not a saved receipt.") >= 0, "receive file is not a log row");
eq(sop.draftGaps({}).join(",") === "supplier,contents,lot,qty,by", "empty log lists header gaps");
eq(sop.draftGaps({ supplier: "A", contents: "Seed", lot: "L1", qty_received: "0", received_by: "Adriana" }).length === 0, "a numeric qty is not a gap");
eq(sop.draftGaps({ supplier: "A", contents: "Seed", lot: "  ", qty_received: 4, received_by: "Adriana" }).join(",") === "lot", "blank lot stays missing");
eq(html.indexOf("app.js?b=211") >= 0, "app cache bust");
eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "receiving-sop dash");
eq(src.indexOf("temp_not_measured") >= 0, "not measured is stored");
eq(src.indexOf('v === "B"') >= 0, "broken seal is the hold");
["Not measured", "No medida", "Nao medida", "Unknown", "Desconocido", "Desconhecido", "N (LTL OK)"].forEach(function (s) {
  eq(src.indexOf(s) >= 0, "copy " + s);
});
["Receive puts stock on hand", "Recibir pone el stock en mano", "Receber coloca o estoque em maos"].forEach(function (s) {
  eq(app.indexOf(s) >= 0, "hint " + s);
});
eq(app.indexOf("const wantLog = !!(supplier || rlCarrier || rlTrack || rlTransport || file)") >= 0, "supplier alone opens the log");
eq(app.indexOf('go("recvlog")') >= 0, "receive navigates to the log");
eq(app.indexOf("DB.receive(") < app.indexOf("wantLog"), "stock receive stays first");
eq(app.indexOf("recvStockGuard") >= 0, "a failed log does not receive stock again");
eq(app.indexOf("recvSkipCapture") >= 0, "the form clears only after a confirmed save");
eq(app.indexOf('if ($("r-qty") || $("rl-supplier")) return true;') >= 0, "open receipt blocks a background wipe");
var recvFn = app.slice(app.indexOf("async receive()"), app.indexOf("_puField()"));
eq(recvFn.indexOf("if (!logId)") >= 0 && recvFn.indexOf('go("receive")') > recvFn.indexOf("if (!logId)"), "receive does not reset before the log id is confirmed");
eq(recvFn.indexOf("recvFile = null") > recvFn.indexOf("if (!logId)"), "the file stays until the log id is confirmed");
var db = read("db.js");
eq(db.indexOf("Receiving log did not confirm a saved row. The form was kept.") >= 0, "insert without an id is a failed save");
eq(db.indexOf("Receiving log update did not confirm. The form was kept.") >= 0, "update without a row is a failed save");
eq(services.indexOf('.select("id")') >= 0, "services save asks for the row id");
eq(services.indexOf("The form was kept.") >= 0, "services keeps the form when save fails");
var htmlSop = global.RECVSOP.fieldsHtml({ supplier: "Example", lot: "LOT-1", item_id: "SEAS-1" });
eq(htmlSop.indexOf('id="rsop-seal-fs"') >= 0, "trailer field is focused");
eq(htmlSop.indexOf('id="rsop-temp-nm"') >= 0, "not measured checkbox");
eq(htmlSop.indexOf("N (LTL OK)") >= 0 && htmlSop.indexOf("Broken") >= 0, "seal choices");
eq(htmlSop.indexOf('value="U"') >= 0, "unknown allergen choice");
eq(htmlSop.indexOf("rsop-temp-warn") >= 0, "temp warning stays");

function base(over) {
  return Object.assign({
    recv_date: "2026-10-30",
    received_time: "09:15",
    received_by: "Adriana",
    supplier: "Example Spice",
    contents: "Ranch seasoning",
    lot: "LOT-1",
    qty_received: 10,
    chk_trailer_sealed: "N",
    chk_trailer_clean: "Y",
    chk_coa_label: "A",
    chk_approved_supplier: "Y",
    chk_carrier_sanitation: "A",
    chk_material_condition: "A",
    allergen: "U",
    temp_not_measured: true,
    temperature_f: "",
    seal_number: "",
    deviation_actions: ""
  }, over || {});
}

eq(sop.validate(base()).length === 0, "LTL with no thermometer and unknown allergen saves");
eq(sop.failingChecks(base()).length === 0, "unsealed LTL does not hold");
eq(sop.validate(base({ temp_not_measured: false, temperature_f: "" })).length > 0, "blank temp still required");
eq(sop.validate(base({ temp_not_measured: false, temperature_f: "72" })).length === 0, "a low reading still saves");
eq(sop.tempWarn(90) === "", "in range does not warn");
eq(sop.tempWarn(72).indexOf("72") >= 0, "below 80 warns and does not block");
eq(sop.tempWarn(79).indexOf("79") >= 0, "79 warns");
eq(sop.tempWarn(111).indexOf("111") >= 0, "above 110 warns");
eq(sop.tempWarn("") === "", "blank temp does not warn");
eq(sop.validate(base({ allergen: "" })).length > 0, "allergen still needs a choice");
eq(sop.validate(base({ allergen: "Y" })).length === 0, "allergen Y saves");
eq(sop.validate(base({ allergen: "N" })).length === 0, "allergen N saves");
eq(sop.failingChecks(base({ allergen: "U" })).length === 0, "unknown allergen does not hold");
eq(sop.validate(base({ chk_trailer_sealed: "Y", seal_number: "" })).length > 0, "sealed trailer needs a seal number");
eq(sop.validate(base({ chk_trailer_sealed: "Y", seal_number: "4451" })).length === 0, "seal number satisfies Y");
eq(sop.validate(base({ chk_trailer_sealed: "N", seal_number: "" })).length === 0, "unsealed LTL does not need a seal number");
eq(sop.failingChecks(base({ chk_trailer_sealed: "B" })).length === 1, "broken seal holds");
eq(sop.validate(base({ chk_trailer_sealed: "B" })).length > 0, "broken seal needs deviation");
eq(sop.validate(base({ chk_trailer_sealed: "B", deviation_actions: "Seal was expected and it was cut" })).length === 0, "broken seal saves with deviation");
eq(sop.failingChecks(base({ chk_trailer_clean: "N" })).length === 1, "other N still holds");
eq(sop.validate(base({ chk_coa_label: "UA", deviation_actions: "Label mismatch" })).length === 0, "UA still saves with deviation");
eq(sop.failingChecks(base({ chk_coa_label: "UA" })).length === 1, "UA still holds");

var nm = sop.recordPatch(base({ temperature_f: "88" }));
eq(nm.temperature_f === null && nm.checklist.temp_not_measured === true, "not measured stores a null temperature");
eq(nm.allergen_flag === null && nm.checklist.allergen === "U", "unknown allergen flag is null and checklist is U");
var yes = sop.recordPatch(base({ allergen: "Y", temp_not_measured: false, temperature_f: "90" }));
eq(yes.allergen_flag === true && yes.temperature_f === 90, "Y and a reading are stored");
var no = sop.recordPatch(base({ allergen: "N" }));
eq(no.allergen_flag === false, "N allergen flag is false");

var csv = sop.receivingCsv([{
  recv_date: "2026-10-30",
  received_by: "Adriana",
  supplier: "Example",
  contents: "Ranch",
  lot: "LOT-1",
  qty_received: 10,
  chk_trailer_sealed: "N",
  seal_number: "",
  checklist: { received_time: "09:15", temp_not_measured: true, allergen: "U" },
  temperature_f: null,
  allergen_flag: null,
  on_hold: false
}, {
  recv_date: "2026-10-30",
  chk_trailer_sealed: "B",
  temperature_f: 72,
  allergen_flag: true,
  checklist: {},
  on_hold: true
}]);
eq(csv.indexOf("NM") >= 0, "csv shows NM");
eq(csv.indexOf(",\"U\",") >= 0 || csv.indexOf(',"U",') >= 0, "csv shows U");
eq(csv.indexOf("Broken") >= 0, "csv shows Broken");
eq(csv.indexOf(",\"Y\",") >= 0, "csv still shows Y");
eq(csv.indexOf("PO / invoice #") >= 0 && csv.indexOf("Transport / BOL #") >= 0 && csv.indexOf("Invoice pending") >= 0, "csv exports invoice and transport");
eq(sop.validate(base()).indexOf("invoice") < 0 && sop.validate(base({ po_num: "" })).length === 0, "invoice is not required");
var pending = sop.resolveInvoicePending({ po_num: "", transport_ref: "BOL-9", invoice_pending: true }, null, "Adriana");
eq(pending.invoice_pending === true && pending.transport_ref === "BOL-9" && !pending.resolution, "new receipt can stay pending");
var kept = sop.resolveInvoicePending({ po_num: "", invoice_pending: false, transport_ref: "BOL-9" }, { invoice_pending: true, po_num: "", transport_ref: "BOL-1" }, "Adriana");
eq(kept.invoice_pending === true && kept.transport_ref === "BOL-9" && !kept.resolution, "pending stays without an invoice");
var cleared = sop.resolveInvoicePending({ po_num: " INV-44 ", transport_ref: "BOL-9", invoice_pending: true, _when: "2026-11-06T18:00:00.000Z" }, { invoice_pending: true, po_num: "", transport_ref: "BOL-9" }, "Adriana");
eq(cleared.invoice_pending === false && cleared.po_num === "INV-44" && cleared.resolution && cleared.resolution.who === "Adriana" && cleared.resolution.old_invoice_pending === true && cleared.resolution.new_po_num === "INV-44" && cleared.resolution.transport_ref === "BOL-9", "invoice clears pending and keeps the BOL");
var trail = sop.invoiceTrail({ invoice_pending: true, po_num: "", transport_ref: "BOL-9" }, { invoice_pending: false, po_num: "INV-44", transport_ref: "BOL-9" }, { user_email: "inventory@smackinsnacks.com", changed_at: "2026-11-06T18:00:00.000Z" });
eq(trail.indexOf("Invoice pending resolved") >= 0 && trail.indexOf("inventory@smackinsnacks.com") >= 0 && trail.indexOf("true -> false") >= 0 && trail.indexOf("INV-44") >= 0, "history trail names who, when, and old/new");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("receiving sop ok");

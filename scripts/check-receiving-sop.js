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

eq(sw.indexOf('const CACHE = "smackin-inv-v261"') >= 0, "cache bump");
eq(html.indexOf("receiving-sop.js?b=2") >= 0, "sop cache bust");
eq(html.indexOf("app.js?b=194") >= 0, "app cache bust");
eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "receiving-sop dash");
eq(src.indexOf("temp_not_measured") >= 0, "not measured is stored");
eq(src.indexOf('v === "B"') >= 0, "broken seal is the hold");
["Not measured", "No medida", "Nao medida", "Unknown", "Desconocido", "Desconhecido", "N (LTL OK)"].forEach(function (s) {
  eq(src.indexOf(s) >= 0, "copy " + s);
});
["Receive puts stock on hand", "Recibir pone el stock en mano", "Receber coloca o estoque em maos"].forEach(function (s) {
  eq(app.indexOf(s) >= 0, "hint " + s);
});
eq(app.indexOf("const wantLog = !!(supplier || rlCarrier || rlTrack || file)") >= 0, "supplier alone opens the log");
eq(app.indexOf('go("recvlog")') >= 0, "receive navigates to the log");
eq(app.indexOf("DB.receive(") < app.indexOf("wantLog"), "stock receive stays first");
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

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("receiving sop ok");

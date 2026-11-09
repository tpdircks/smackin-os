#!/usr/bin/env node
/* Receive open-items panel. No network. No live receipts. */
"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert/strict");
var api = require("../recv-open-items.js");
var plan = require("../inv-lot-plan.js");

var rootDir = path.resolve(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), "utf8"); }

var src = read("recv-open-items.js");
assert.equal(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, true, "no em or en dashes");
assert.equal(src.indexOf(".insert(") < 0 && src.indexOf(".update(") < 0 && src.indexOf(".delete(") < 0, true, "panel does not write");
assert.ok(src.indexOf("from(\"receiving_log\")") >= 0, "reads receiving_log");
assert.ok(src.indexOf("UI_go(\"receive\")") >= 0, "links to Receive");

var holds = plan.openHolds();
var items = api.collect({ receivingLog: [], openHolds: holds });
assert.equal(items.length, 6, "three Herman loads, Oct 15, pallet 8, and Popper");
assert.ok(items.some(function (i) { return /60115930656/.test(i.title + i.detail); }), "CNU");
assert.ok(items.some(function (i) { return /0587996710/.test(i.title + i.detail) && /1752766746/.test(i.title + i.detail); }), "FedEx");
assert.ok(items.some(function (i) { return /375-909332/.test(i.title + i.detail); }), "XPO");
assert.ok(items.some(function (i) { return /same load/.test(i.detail); }), "same-load question");
assert.ok(items.filter(function (i) { return /15,408|15408/.test(i.title + i.detail + String(i.qty || "")); }).length === 1, "Oct 15 once");
assert.ok(items.some(function (i) { return /pallet 8/i.test(i.title + i.detail); }), "pallet 8 hold");
assert.ok(items.some(function (i) { return /Popper/.test(i.title); }), "Popper");

var pending = api.collect({
  receivingLog: [{
    id: "abc",
    invoice_pending: true,
    supplier: "Acme",
    contents: "Film 4oz BBQ",
    recv_date: "2026-11-08",
    transport_ref: "BOL9",
    qty_received: 12
  }],
  openHolds: [],
  skipKnown: true
});
assert.equal(pending.length, 1);
assert.equal(pending[0].source, "invoice_pending");
assert.equal(pending[0].receiving_log_id, "abc");

var held = api.collect({
  receivingLog: [{ id: "h1", on_hold: true, supplier: "Acme", contents: "Oil", lot: "L1", qty_received: 3 }],
  openHolds: [],
  skipKnown: true
});
assert.equal(held[0].source, "receiving_hold");

var coa = api.collect({
  receivingLog: [{ id: "p1", contents: "Bacon Type Jalapeno Popper", coa_received: "No", lot: "2-158928", qty_received: 700 }],
  openHolds: []
});
var pop = coa.filter(function (i) { return /Popper/.test(i.title) || i.source === "coa_no"; });
assert.equal(pop.length, 1, "Popper from live COA No, known item retired");
assert.equal(pop[0].source, "coa_no");

var covered = api.collect({
  receivingLog: [{
    id: "cnu",
    transport_ref: "60115930656",
    contents: "Cashew BBQ",
    lot: "H 26299",
    qty_received: 1000
  }],
  openHolds: []
});
assert.ok(!covered.some(function (i) { return i.id === "hermans-cnu-20260922"; }), "CNU known item retires when logged with lot and bags");
assert.ok(covered.some(function (i) { return i.id === "hermans-fedex-20260924"; }), "FedEx stays until logged");

var cleared = api.collect({
  receivingLog: [{ contents: "Bacon Type Jalapeno Popper", coa_received: "yes", lot: "2-158928", qty_received: 700 }],
  openHolds: []
});
assert.ok(!cleared.some(function (i) { return i.id === "popper-coa-no"; }), "Popper retires when COA is Yes");

var fields = api.prefillFields({
  transport: "60115930656",
  qty: 15408,
  lot: "H1",
  notes: "need lots",
  tracking: "375-909332",
  pallets: 5
});
assert.equal(fields["r-transport"], "60115930656");
assert.equal(fields["r-qty"], "15408");
assert.equal(fields["r-lot"], "H1");
assert.equal(fields["r-tracking"], "375-909332");
assert.equal(fields["r-pal"], "5");
assert.equal(fields["r-notes"], "need lots");

var html = api.renderHtml(items);
assert.ok(html.indexOf("Open items") >= 0, "title");
assert.ok(html.indexOf("Open Receive") >= 0, "button");
assert.ok(html.indexOf("recv-open-count") >= 0 && html.indexOf(">" + items.length + "<") >= 0, "count");
assert.ok(html.indexOf("does not change any data") >= 0, "read-only hint");

var index = read("index.html");
var sw = read("service-worker.js");
assert.ok(index.indexOf('recv-open-items.js?b=1') >= 0, "index wires the module");
assert.ok(sw.indexOf("./recv-open-items.js") >= 0, "sw caches the module");
assert.ok(read("app.js").indexOf('id="r-qty"') >= 0 && read("app.js").indexOf('UI_go') >= 0, "Receive form still exists");

console.log("recv open items ok: " + items.length + " live-default items");

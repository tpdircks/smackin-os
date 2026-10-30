#!/usr/bin/env node
/* SPS Fulfillment lifecycle. Mailbox files do not close an Open order. */
"use strict";

var fs = require("fs");
var path = require("path");
var SPS = require("../sps-map.js");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function same(a, b, msg) { if (a !== b) fail.push(msg + " (" + a + " !== " + b + ")"); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

function po(status) {
  var header = {
    TradingPartnerId: "614ALLSMACKINSU",
    PurchaseOrderNumber: "MO10106510",
    PurchaseOrderDate: "2026-10-01"
  };
  if (status) header.Status = status;
  return {
    Header: {
      OrderHeader: header,
      Address: [{ AddressTypeCode: "ST", AddressName: "McLane", AddressLocationNumber: "01" }]
    },
    LineItem: [{
      OrderLine: {
        OrderQty: 10, OrderQtyUOM: "CA", PurchasePrice: 10,
        LineSequenceNumber: "1", GTIN: "00850047865441"
      },
      ProductOrItemDescription: [{ ProductDescription: "SMACKIN SEEDS OG 4OZ" }]
    }]
  };
}
function ack(status) {
  return {
    Header: {
      OrderAckHeader: {
        TradingPartnerId: "614ALLSMACKINSU",
        PurchaseOrderNumber: "MO10106510",
        Status: status
      }
    }
  };
}
function asn(status) {
  var header = {
    TradingPartnerId: "614ALLSMACKINSU",
    ShipmentIdentification: "ASN1",
    ShipDate: "2026-10-18",
    BillOfLadingNumber: "BOL123456"
  };
  if (status) header.Status = status;
  return {
    Header: { ShipmentHeader: header },
    OrderLevel: [{
      OrderHeader: { PurchaseOrderNumber: "MO10106510" },
      PackLevel: [{
        ItemLevel: [{ ShipmentLine: { ShipQty: 10, ShipQtyUOM: "CA", GTIN: "00850047865441" } }]
      }]
    }]
  };
}
function inv(status) {
  var header = {
    TradingPartnerId: "614ALLSMACKINSU",
    InvoiceNumber: "INV1",
    PurchaseOrderNumber: "MO10106510",
    InvoiceDate: "2026-10-19"
  };
  if (status) header.Status = status;
  return {
    Header: { InvoiceHeader: header },
    LineItem: [{ InvoiceLine: { InvoiceQty: 10, InvoiceQtyUOM: "CA", PurchasePrice: 10, LineSequenceNumber: "1" } }],
    Summary: { TotalAmount: 100 }
  };
}
function fold(docs) {
  var states = SPS.interpret(docs.map(function (d) { return { json: d.json, docStatus: d.status || "" }; })).states;
  return states[SPS.stateKey("614ALLSMACKINSU", "MO10106510")];
}

var openOnly = fold([{ json: po("Open") }]);
same(SPS.boardStatus(openOnly, "out"), "Open", "order open");
same(SPS.buildOrder(openOnly, "out").status, "Open", "live order open");
same(SPS.buildDemand(openOnly, "out")[0].status, "Open", "live demand open");
same(SPS.buildOrder(openOnly, "testout").status, "Test", "testout order is Test");
same(SPS.buildDemand(openOnly, "testout")[0].status, "Test", "testout demand is Test");
eq(SPS.countsForBuild(SPS.buildDemand(openOnly, "out")[0]), "open line still counts");

var throughAsn = fold([
  { json: po("Open") },
  { json: ack("Accepted") },
  { json: asn("Saved") },
  { json: asn("Accepted") }
]);
same(SPS.boardStatus(throughAsn, "out"), "Open", "ASN accepted stays Open");
var asnOrder = SPS.buildOrder(throughAsn, "out");
same(asnOrder.status, "Open", "order row stays Open");
eq(asnOrder.tracking === "BOL123456", "BOL is stored");
eq(asnOrder.notes.indexOf("Ack Accepted") >= 0, "ack note");
eq(asnOrder.notes.indexOf("ASN Accepted") >= 0, "asn note");
var asnDemand = SPS.buildDemand(throughAsn, "out")[0];
same(asnDemand.status, "Open", "demand stays Open after ASN");
eq(/\[\[SPSSTAGE:asn-accepted\]\]/.test(asnDemand.notes), "asn stage tag");
eq(!SPS.countsForBuild(asnDemand), "ASN accepted drops out of build need");

var invoiceOpen = fold([
  { json: po("Open") },
  { json: ack("Accepted") },
  { json: asn("Accepted") },
  { json: inv("Accepted") }
]);
same(SPS.boardStatus(invoiceOpen, "out"), "Open", "invoice accepted while order open stays Open");
eq(SPS.buildOrder(invoiceOpen, "out").status !== "Shipped", "not Shipped");
eq(SPS.buildOrder(invoiceOpen, "out").status !== "Complete", "not Complete");
eq(SPS.stageNote(invoiceOpen).indexOf("Invoice Accepted") >= 0, "invoice note");
eq(!SPS.countsForBuild(SPS.buildDemand(invoiceOpen, "out")[0]), "invoice stage drops out of build need");

var noStatus = fold([{ json: po() }, { json: asn() }, { json: inv() }]);
same(SPS.boardStatus(noStatus, "out"), "Open", "files without status stay Open");
same(SPS.lifecycle(noStatus, { flags: ["overship"] }), "Open", "old flag argument does not ship");
eq(SPS.countsForBuild(SPS.buildDemand(noStatus, "out")[0]), "untagged open line still counts");
eq(SPS.stageId(noStatus) === "open", "no invented stage");

var done = fold([
  { json: po("Open") },
  { json: asn("Accepted") },
  { json: inv("Accepted") },
  { json: po("Complete") }
]);
same(SPS.boardStatus(done, "out"), "Complete", "order complete");
same(SPS.buildOrder(done, "out").status, "Complete", "prefer Complete");
same(SPS.buildDemand(done, "out")[0].status, "Complete", "demand complete");
same(SPS.buildOrder(done, "testout").status, "Test", "testout complete file stays Test");
eq(!SPS.countsForBuild(SPS.buildDemand(done, "out")[0]), "complete demand is not build need");

same(SPS.buildShipment(SPS.mapDocument(asn()), "id", "out").status, "Pending", "ASN file is not shipped");
same(SPS.buildShipment(SPS.mapDocument(asn("Accepted")), "id", "out").status, "Shipped", "accepted ASN log");
same(SPS.buildShipment(SPS.mapDocument(asn("Accepted")), "id", "testout").status, "Test", "test ASN");

eq(SPS.isSpsOrder({ entered_by: "SPS Feed", tracking: "BOL123456", status: "Open" }), "feed row");
eq(SPS.isSpsOrder({ entered_by: "SPS Sync", status: "Open" }), "sync paste row");
eq(!SPS.isSpsOrder({ entered_by: "Shopify", customer: "Faire", tracking: "1Z999", status: "Open" }), "shopify is not SPS");
eq(SPS.countsForBuild({ source: "Shopify", status: "Open", notes: "" }), "shopify open counts");
eq(SPS.countsForBuild({ source: "SPS", status: "Shipped", notes: "" }) === false, "existing shipped rows stay out of build");

var html = read("index.html");
var sw = read("service-worker.js");
var app = read("app.js");
var sync = read("supabase/functions/sps-sync/index.js");
var auto = read("demand-autoclose.js");
eq(html.indexOf('src="sps-map.js?b=6"') >= 0, "sps-map cache bust");
eq(app.indexOf('dmComplete:"Complete"') >= 0, "complete filter label");
eq(app.indexOf("'Complete'") >= 0 && app.indexOf("dmComplete") >= 0, "complete option");
eq(app.indexOf("function orderWaiting") >= 0, "open list ignores SPS tracking");
eq(sw.indexOf('const CACHE = "smackin-inv-v263"') >= 0, "cache v259");
eq(read("build-id.txt").trim() === "smackin-inv-v263", "build id");
eq(sync.indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "folder stays testout");
eq(sync.indexOf('SPS_FOLDER=out') < 0 && sync.indexOf('"out"') >= 0, "out remains a legal folder value");
eq(sync.indexOf("must not delete") >= 0, "order delete disabled");
eq(sync.indexOf("orders?id=in.") < 0, "no order row delete");
eq(auto.indexOf('String(r.source || "") === "SPS"') >= 0, "autoclose skips SPS");
["demand-close-cleanup.js", "scripts/check-sps-lifecycle.js"].forEach(function (rel) {
  var text = read(rel);
  eq(text.indexOf("\u2014") < 0 && text.indexOf("\u2013") < 0, rel + " dash");
});

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("sps lifecycle ok");

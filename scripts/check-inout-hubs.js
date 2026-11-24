#!/usr/bin/env node
/* Inbound / Outbound hubs: model math and department wiring. No browser, no network. */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

var H = require(path.join(root, "inout-hubs.js"));
eq(H.isoOf("11/30/2026") === "2026-11-30" && H.isoOf("2026-11-30T05:00") === "2026-11-30" && H.isoOf("1/2/26") === "2026-01-02", "dates parse");

var inb = H.inboundModel({
  today: "2026-11-24",
  supplierPos: [
    { id: "a", po_num: "MN1", vendor: "Spice", lines: [{ desc: "x", qty: 1, ship: "2026-11-20" }] },
    { id: "b", po_num: "MN2", vendor: "Film", lines: [{ desc: "y", qty: 1, ship: "2026-11-27" }] },
    { id: "c", po_num: "MN3", vendor: "Box", notes: "cancelled", lines: [{ desc: "z", qty: 1 }] }
  ],
  receivingLog: [
    { id: 1, recv_date: "2026-11-24", item_id: "SEAS-1", lot: "L1", coa_received: "No", on_hold: true, supplier: "Spice" },
    { id: 2, recv_date: "2026-11-20", item_id: "FILM-1", lot: "F9", invoice_pending: true },
    { id: 3, recv_date: "2026-10-01", item_id: "FILM-2", lot: "OLD" }
  ],
  stock: [
    { item_id: "FILM-1", location: "RECEIVING", lot: "F9", qty: 500 },
    { item_id: "FILM-2", location: "RECEIVING", lot: "OLD", qty: 9 },
    { item_id: "FILM-3", location: "RECEIVING", lot: "", qty: 70000 }
  ],
  items: [{ id: "SEAS-1", name: "Seasoning" }, { id: "FILM-1", name: "Film" }],
  atLoc: function (id, z) { return id === "SEAS-1" && z === "QA-HOLD" ? 40 : 0; },
  derive: null
});
eq(inb.pos.length === 2, "cancelled PO drops out");
eq(inb.posLate === 1 && inb.posSoon === 1, "late and due-this-week POs");
eq(inb.recvToday === 1, "received today");
eq(inb.coaMissing.length === 1 && inb.recvHolds.length === 1, "missing COA and receiving hold");
eq(inb.invoicePending.length === 1, "invoice pending");
eq(inb.held.length === 1 && inb.held[0].zone === "QA-HOLD", "held stock");
eq(inb.inRecv.length === 1 && inb.inRecv[0].lot === "F9", "put away lists only recent receipts still in RECEIVING, not count corrections");

var out = H.outboundModel({
  today: "2026-11-24",
  demandLines: [{ po: "4022836", cases: 400, status: "Open" }, { po: "4022836", cases: 30, status: "Open" }],
  orders: [
    { status: "Open", customer: "KeHE", customer_po: "4022836", ship_date: "2026-11-23" },
    { status: "Open", customer: "Vistar", customer_po: "88754604", ship_date: "11/25/2026" },
    { status: "Open", customer: "Vistar Retail", customer_po: "88754604", ship_date: "" },
    { status: "Open", customer: "Shopify", order_id: "SH-1", ship_date: "" },
    { status: "Complete", customer: "Target", customer_po: "999", ship_date: "2026-11-01" }
  ],
  lanes: { channel: function (o) { return /shopify/i.test(o.customer) ? "ecom" : "retail"; }, demandChannel: function () { return "retail"; } },
  releases: [
    { ref: "88754604", form_date: "2026-11-24", result: "REJECTED", created_at: "2026-11-24T15:00:00Z" },
    { ref: "88754604", form_date: "2026-11-24", result: "RELEASED", created_at: "2026-11-24T17:00:00Z" }
  ],
  shippingLog: [{ po_num: "88754604", ship_date: "2026-11-24", tracking: "PRO1" }],
  orderDocs: [{ po_num: "4022836", created_at: "2026-11-24T10:00:00Z" }]
});
eq(out.rows.length === 2 && out.ecomOpen === 1, "e-com kept off the retail table");
eq(out.dupRows === 1, "duplicate order rows for one PO show once and are counted");
eq(out.rows[0].po === "4022836" && out.rows[0].late && out.rows[0].cases === 430, "late PO first, cases from demand lines");
eq(out.rows[1].release && out.rows[1].release.result === "RELEASED", "latest release wins");
eq(out.relToday === 1 && out.rejToday === 1, "release counts today");
eq(!!out.rows[1].shipped && out.rows[0].docs === 1, "shipping log and docs matched by PO");
eq(out.notReleasedSoon === 1, "late or soon PO without a release");

var homes = read("dept-homes.js");
eq(homes.indexOf('id: "inb"') > 0 && homes.indexOf('id: "outb"') > 0, "inbound and outbound departments");
eq(/id: "purch",\s*hidden: true,\s*bar: "inb"/.test(homes) && /id: "recv",\s*hidden: true,\s*bar: "inb"/.test(homes) && /id: "ship",\s*hidden: true,\s*bar: "outb"/.test(homes), "old tabs hidden and mapped");
eq(homes.indexOf('fn === "inhub"') > 0 && homes.indexOf('fn === "outhub"') > 0 && homes.indexOf('fn === "trailer"') > 0, "hub tools open");
var html = read("index.html");
eq(html.indexOf("inout-hubs.js?b=") > html.indexOf("outbound-release.js"), "hubs load after trailer release");
eq(read("service-worker.js").indexOf('"./inout-hubs.js"') >= 0, "worker caches hubs");
eq(read("inout-hubs.js").indexOf("\u2014") < 0, "no em dash");
eq(!/\.(insert|update|upsert|delete)\(/.test(read("inout-hubs.js")), "hubs never write");
if (failed) { console.log(failed + " failed"); process.exit(1); }
console.log("inout hubs ok");

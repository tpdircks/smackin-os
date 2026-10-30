#!/usr/bin/env node
/* 810 TDS01 is X12 N2. McLane TotalAmount 641448 means $6,414.48. */
"use strict";

var fs = require("fs");
var path = require("path");
var SPS = require("../sps-map.js");

var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function same(a, b, msg) { if (a !== b) fail.push(msg + " (" + a + " !== " + b + ")"); }

function line(qty, price) {
  return {
    InvoiceLine: { InvoiceQty: qty, InvoiceQtyUOM: "CA", PurchasePrice: price, LineSequenceNumber: "1" }
  };
}
function inv(total, qty, price, number) {
  return {
    Header: {
      InvoiceHeader: {
        TradingPartnerId: "614ALLSMACKINSU",
        InvoiceNumber: number || "SZ10090086-01",
        PurchaseOrderNumber: number || "SZ10090086-01",
        InvoiceDate: "2026-10-07"
      }
    },
    LineItem: [line(qty, price)],
    Summary: { TotalAmount: total, TotalCartonCount: qty }
  };
}

// Stored McLane 810s: raw TDS01 vs line sum. Each pair matched exactly on 2026-10-30.
var pairs = [
  [641448, 6414.48],
  [347904, 3479.04],
  [587088, 5870.88],
  [369648, 3696.48],
  [141336, 1413.36],
  [152208, 1522.08],
  [163080, 1630.8],
  [250056, 2500.56],
  [337032, 3370.32],
  [260928, 2609.28],
  [304416, 3044.16],
  [217440, 2174.4],
  [674064, 6740.64],
  [619704, 6197.04]
];

pairs.forEach(function (pair) {
  var mapped = SPS.mapDocument(inv(pair[0], 1, pair[1], "SZ10090086-01"));
  same(mapped.statedTotal, pair[1], "stated " + pair[0]);
  same(mapped.computedTotal, pair[1], "computed " + pair[0]);
  same(mapped.invoice.stated, pair[1], "invoice stated " + pair[0]);
  var folded = SPS.interpret([{ json: inv(pair[0], 1, pair[1]) }]);
  var flags = [];
  Object.keys(folded.states).forEach(function (k) {
    flags = flags.concat(SPS.flagsOf(folded.states[k]).flags);
  });
  eq(flags.indexOf("total_x100") < 0, "no total_x100 for " + pair[0]);
  eq(flags.indexOf("total_mismatch") < 0, "no total_mismatch for " + pair[0]);
});

// Real SZ10090086-01 lines: 59 cases at $108.72, TDS 641448.
var real = {
  Header: {
    InvoiceHeader: {
      TradingPartnerId: "614ALLSMACKINSU",
      InvoiceNumber: "SZ10090086-01",
      PurchaseOrderNumber: "SZ10090086-01"
    }
  },
  LineItem: [30, 15, 10, 1, 3].map(function (qty, i) {
    return {
      InvoiceLine: {
        InvoiceQty: qty, InvoiceQtyUOM: "CA", PurchasePrice: 108.72,
        LineSequenceNumber: String(i + 1), GTIN: "00850047865441"
      }
    };
  }),
  Summary: { TotalAmount: 641448, TotalCartonCount: 59 }
};
var realMapped = SPS.mapDocument(real);
same(realMapped.statedTotal, 6414.48, "SZ10090086-01 stated");
same(realMapped.computedTotal, 6414.48, "SZ10090086-01 lines");
same(realMapped.partner, "McLane", "partner");

// Already-decimal TDS is left alone.
var dollars = SPS.mapDocument(inv(6414.48, 1, 6414.48));
same(dollars.statedTotal, 6414.48, "decimal stated");

// Whole-dollar total that already matches the lines is not divided.
var whole = SPS.mapDocument(inv(100, 1, 100));
same(whole.statedTotal, 100, "whole dollar stated");

// A real mismatch stays unscaled so it still flags.
var bad = SPS.mapDocument(inv(5000, 1, 90));
same(bad.statedTotal, 5000, "mismatch stays raw");
var badFlags = SPS.flagsOf(SPS.interpret([{ json: inv(5000, 1, 90) }]).states[SPS.stateKey("614ALLSMACKINSU", "SZ10090086-01")]);
eq(badFlags.flags.indexOf("total_mismatch") >= 0, "real mismatch flags");
eq(badFlags.flags.indexOf("total_x100") < 0, "real mismatch is not 100x");

// 850 TotalAmount is already dollars (McLane PO stored 1630.8).
var po = SPS.mapDocument({
  Header: {
    OrderHeader: {
      TradingPartnerId: "614ALLSMACKINSU",
      PurchaseOrderNumber: "MO10106510-01",
      PurchaseOrderDate: "2026-10-01"
    }
  },
  LineItem: [{ OrderLine: { OrderQty: 15, OrderQtyUOM: "CA", PurchasePrice: 108.72, LineSequenceNumber: "1" } }],
  Summary: { TotalAmount: 1630.8 }
});
same(po.docType, "850", "850 kind");
same(po.statedTotal, 1630.8, "850 total not scaled");

// Empty Scheels 810 stays rejected. No invented lines.
var empty = SPS.mapDocument({
  Header: {
    InvoiceHeader: {
      TradingPartnerId: "BPRALLSMACKINSU",
      InvoiceNumber: "023315762",
      PurchaseOrderNumber: "023315762"
    }
  }
});
same(empty.reject, "rejected", "empty 810 rejected");
same(empty.lineCount, 0, "empty 810 has no lines");
same(empty.statedTotal, null, "empty 810 has no total");

// Second copy of a file-level flag stays flagged. A later 856 does not
// re-raise an overship that an earlier file already introduced.
same(SPS.fileFlags(["total_x100"], ["total_x100"], ["total_x100"]).join(","), "total_x100", "duplicate keeps own flag");
same(SPS.fileFlags([], ["total_x100"], ["total_x100"]).join(","), "total_x100", "first copy introduces flag");
same(SPS.fileFlags(["overship"], ["overship"], []).join(","), "", "later file does not repeat a cross-doc flag");
same(SPS.fileFlags([], ["overship", "total_x100"], ["total_x100"]).join(","), "overship,total_x100", "new cross-doc flag plus own flag");

var root = path.resolve(__dirname, "..");
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
var sync = fs.readFileSync(path.join(root, "supabase/functions/sps-sync/index.js"), "utf8");
eq(html.indexOf("sps-map.js?b=4") >= 0, "sps-map cache bust");
eq(sw.indexOf('const CACHE = "smackin-inv-v256"') >= 0, "cache v254");
eq(sw.indexOf("smackin-inv-v250") < 0, "old cache gone");
eq(sync.indexOf("SPS.fileFlags") >= 0, "sync uses fileFlags");
eq(sync.indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "folder default unchanged");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok", pairs.length, "mclane totals");

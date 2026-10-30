#!/usr/bin/env node
/* Retail and e-commerce orders stay on separate boards. No network. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var lanes = require(path.join(root, "order-lanes.js"));
eq(lanes.channel({ entered_by: "SPS Sync", customer: "McLane", status: "Open" }) === "retail", "sps sync is retail");
eq(lanes.channel({ entered_by: "SPS Feed", notes: "[[SPS]] PO", customer: "Target" }) === "retail", "sps feed is retail");
eq(lanes.channel({ entered_by: "Shopify", customer: "Faire", tracking: "1Z999", status: "Open" }) === "ecom", "faire is ecom");
eq(lanes.channel({ customer: "TikTok Shop", entered_by: "Allie" }) === "ecom", "tiktok is ecom");
eq(lanes.channel({ customer: "Jane", entered_by: "sync:shipstation", order_id: "SS-1" }) === "ecom", "shipstation is ecom");
eq(lanes.channel({ customer: "Jane", stripe_link: "https://buy.stripe.com/abc" }) === "ecom", "stripe link is ecom");
eq(lanes.channel({ customer: "Target", customer_po: "100014567", entered_by: "Allie" }) === "retail", "target po is retail");
eq(lanes.channel({ customer: "KeHE", entered_by: "Allie", notes: "[[LANE:ecom]] moved by mistake" }) === "retail", "wholesale name stays retail");
eq(lanes.channel({ entered_by: "SPS Sync", notes: "[[LANE:ecom]]" }) === "retail", "sps beats a lane tag");
eq(lanes.channel({ customer: "Jane Doe", entered_by: "Allie", notes: "" }) === "ecom", "unmarked manual order is ecom");
eq(lanes.channel({ customer: "Jane Doe", entered_by: "Allie", notes: lanes.stamp("call before ship", "retail") }) === "retail", "manual retail tag sticks");
eq(lanes.demandChannel({ source: "SPS", partner: "McLane" }) === "retail", "sps demand is retail");
eq(lanes.demandChannel({ source: "Faire", partner: "Faire" }) === "ecom", "faire demand is ecom");
eq(lanes.displayNotes(lanes.stamp("hello", "ecom")) === "hello", "lane tag is hidden");
eq(lanes.stamp("[[LANE:retail]] hello", "ecom").indexOf("[[LANE:ecom]]") === 0, "restamp replaces the tag");
eq(lanes.stamp("[[LANE:ecom]] hello", "ecom").indexOf("[[LANE:ecom]] [[LANE:") < 0, "one tag only");

var app = read("app.js");
var homes = read("dept-homes.js");
var dash = read("dashboard.js");
var sw = read("service-worker.js");
var html = read("index.html");
eq(app.indexOf("orderLane") >= 0, "orders remember a lane");
eq(app.indexOf("ordersretail") >= 0 && app.indexOf("ordersecom") >= 0, "two order routes");
eq(app.indexOf('t === "ordersretail"') >= 0 && app.indexOf('t === "ordersecom"') >= 0, "go splits the routes");
eq(app.indexOf("ordRetailHint") >= 0 && app.indexOf("ordEcomHint") >= 0, "lane hints");
eq(app.indexOf("Non-SPS / Stripe orders") < 0, "old combined hint is gone");
eq(homes.indexOf('primary: "ordersRetail"') >= 0, "fulfillment opens retail");
eq(homes.indexOf('"ordersEcom"') >= 0, "ecom is its own tab");
eq(homes.indexOf('subs: ["orders",') < 0, "fulfillment does not open one orders tab");
var fulAt = homes.indexOf('id: "ful"');
var fulEnd = homes.indexOf('id: "ship"', fulAt);
var ful = homes.slice(fulAt, fulEnd);
eq(ful.indexOf('"ordersRetail"') < ful.indexOf('"ordersEcom"'), "retail tab before ecom");
eq(ful.indexOf('"board"') >= 0, "fulfillment can open the tv board");
eq(ful.indexOf('"produce", "fglots"') >= 0, "rare produce tools stay later");
var opsAt = homes.indexOf('id: "ops"');
var ops = homes.slice(opsAt, homes.indexOf("function deptById"));
eq(ops.indexOf('"board"') < 0, "tv board is not an ops tab");
var mixAt = homes.indexOf('id: "mixing"');
var mix = homes.slice(mixAt, homes.indexOf('id: "pmac"', mixAt));
eq(mix.indexOf('actions: ["board", "prodorders", "trMix", "batchrec"]') >= 0, "mixing tv board is an action");
var purchAt = homes.indexOf('id: "purch"');
var purch = homes.slice(purchAt, homes.indexOf('id: "recv"', purchAt));
eq(purch.indexOf('actions: ["expreceipts"]') >= 0, "purchasing action is due-in");
eq(purch.indexOf('"reorder15"') > purch.indexOf("subs:"), "1.5oz reorder is a later tab");
eq(dash.indexOf("ordersretail") >= 0 && dash.indexOf("ordersecom") >= 0, "dashboard links the two boards");
eq(dash.indexOf("These are not added together") >= 0, "dashboard does not sum the lanes");
eq(sw.indexOf('"./order-lanes.js"') >= 0, "worker caches lanes");
eq(html.indexOf("order-lanes.js?b=1") >= 0 && html.indexOf("order-lanes.js") < html.indexOf("app.js"), "lanes load before app");
eq(read("order-lanes.js").indexOf("\u2014") < 0 && read("order-lanes.js").indexOf("\u2013") < 0, "no em dash");
["ordRetailHint", "ordEcomHint"].forEach(function (key) {
  eq(app.indexOf(key) >= 0, key);
});
eq(app.indexOf("Shopify, TikTok, ShipStation, Faire, and Stripe") >= 0, "ecom channels named");
eq(read("supabase/functions/sps-sync/index.js").indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "SPS_FOLDER untouched");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok order lanes");

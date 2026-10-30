#!/usr/bin/env node
/* Invariants for Work Orders and the Mixing tools-first layout. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var src = read("work-orders.js");
var mix = read("mixing-recipes.js");
var homes = read("dept-homes.js");
var html = read("index.html");
var sw = read("service-worker.js");
var app = read("app.js");
var paper = read("production-orders.js");

eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "work-orders dash");
eq(homes.indexOf("Open a work order, log bags done") >= 0, "work order card");
eq(src.indexOf("adjustTotal") < 0, "no inventory writes");
eq(src.indexOf("production_orders") >= 0, "reuses production_orders");
eq(src.indexOf("create table if not exists public.production_orders") >= 0, "fallback sql documented");
eq(src.indexOf("work_orders (") < 0, "no new work_orders table");
eq(paper.indexOf("window.PROD_ORDERS") >= 0, "paper orders kept");
eq(app.indexOf("production orders to Mixing") >= 0, "legacy marker");
eq(sw.indexOf('const CACHE = "smackin-inv-v253"') >= 0, "cache v253");
eq(sw.indexOf('const CACHE = "smackin-inv-v249"') < 0, "old cache gone");
eq(sw.indexOf('"./work-orders.js"') >= 0, "sw asset");
eq(sw.indexOf('"./inventory-visual.js"') >= 0 && sw.indexOf('"./inventory-visual.css"') >= 0, "visual assets stay cached");
eq(sw.indexOf("./slc-count-panel.js") < 0 && sw.indexOf("./slc-count-latest.js") < 0 && sw.indexOf("./inv-sync-1027d.js") < 0, "sheet sync is not precached");
eq(html.indexOf("work-orders.js?b=1") >= 0, "script tag");
eq(html.indexOf("mixing-recipes.js?b=3") >= 0, "mixing cache bust");
eq(html.indexOf("dept-homes.js?b=22") >= 0, "dept homes cache bust");
eq(html.indexOf("inventory-visual.js?b=2") >= 0 && html.indexOf("inventory-visual.css?b=2") >= 0, "visual still wired");
eq(html.indexOf("slc-count-panel.js") < 0 && html.indexOf("slc-count-latest.js") < 0 && html.indexOf("inv-sync-1027d.js") < 0, "sheet sync is not loaded");
eq(html.indexOf("app.js") < html.indexOf("work-orders.js"), "loads after app");
var loaded = [];
html.replace(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g, function (_, url) {
  if (url.indexOf("http") === 0) return;
  loaded.push("./" + url.split("?")[0]);
});
loaded.forEach(function (rel) {
  eq(sw.indexOf('"' + rel + '"') >= 0, "sw includes loaded " + rel);
});

var homeMount = mix.slice(mix.indexOf('if (mode === "home")'), mix.indexOf("bind(el);"));
eq(homeMount.indexOf("home.appendChild(el)") >= 0, "recipes go after the mixing tools");
eq(homeMount.indexOf(".dept-lead") < 0, "recipes no longer insert under the title");
eq(homeMount.indexOf("insertBefore") < 0, "recipes are not inserted above the page");

function sectionTools(id) {
  var at = homes.indexOf('id: "' + id + '"');
  eq(at >= 0, id + " dept");
  var slice = homes.slice(at, at + 1200);
  var tools = slice.indexOf("tools:");
  return slice.slice(tools, tools + 180);
}
eq(sectionTools("mixing").indexOf('["prodorders"') === sectionTools("mixing").indexOf("tools:") + "tools: ".length, "mixing work orders first");
eq(sectionTools("pmac").indexOf('["prodorders"') >= 0, "pmac work orders in the line group");
eq(sectionTools("pmac").indexOf('["prodorders"') < sectionTools("pmac").indexOf("pmacout"), "pmac work orders before the log");

var ctx = { window: {}, console: console };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
var W = ctx.WORKORDERS;
eq(W && W.sbKey("Target", "", "Ranch") === "Target_Ranch", "stock key matches Build Need");
eq(W.goalFor("Ranch") === 640, "ranch goal is target plus master case");
eq(W.SB.every(function (i) { return i.cat === "Target" || i.cat === "Master Case"; }), "goals are the build-need cats");

var lines = [
  { flavor: "Ranch", status: "Open", bags: 1000, cases: 10, partner: "KeHE", po: "PO1", due_date: "2026-11-02", flavor_code: "S08" },
  { flavor: "Ranch", status: "Shipped", bags: 9000, cases: 90, partner: "KeHE", po: "PO0", due_date: "2026-09-01" },
  { flavor: "Ranch", status: "Open", bags: 72, cases: 1, partner: "UNFI", po: "PO2", due_date: "2026-11-05" }
];
var stock = {};
stock[W.sbKey("Target", "", "Ranch")] = { on_hand: 4 };
var need = W.buildNeed(lines, stock, { bagsPerCase: 72, codeMap: { Ranch: "S08" } });
var ranch = need.filter(function (r) { return r.flavor === "Ranch"; })[0];
eq(!!ranch, "ranch need row");
eq(ranch.openBags === 1072, "open bags are the open lines only");
eq(ranch.cases === 11, "open cases only");
eq(ranch.onHandCases === 4, "on hand cases");
eq(ranch.toProduce === 636, "stock gap is larger than the order gap");
eq(ranch.toProduceBags === 636 * 72, "bags to make is cases times 72");
eq(ranch.driver === "stock", "driver is stock");
eq(ranch.lines.length === 2, "shipped line is not linked");
eq(ranch.code === "S08", "sku from the line");
eq(need.some(function (r) { return r.flavor === "Backyard BBQ" && r.openBags === 0 && r.toProduceBags === (160 + 480) * 72; }), "stock-only flavor uses its goal");

var today = "2026-10-29";
var paper = [
  { po: "2026.07.29-01", flavor: "Dill Pickle", deadline: "2026-08-03", date: "2026-07-29", pkgs4: 400, priority: "P2-HIGH", status: "" },
  { po: "2026.10.29-09", flavor: "Ranch", deadline: "2026-10-29", date: "2026-10-29", pkgs4: 200, pkgs15: 50 }
];
var cloud = [{ id: "2026.07.29-01", data: { po: "2026.07.29-01", wo: "2026.07.29-01", flavor: "Dill Pickle", status: "Mixing", bags_done: 40, bags_needed: 400, operators: ["Leo"], updated_at: "2026-10-29T12:00:00Z", kind: "work_order" } }];
var merged = W.mergeOrders(paper, cloud, {}, {});
var dill = merged.filter(function (r) { return r.id === "2026.07.29-01"; })[0];
var ranchWo = merged.filter(function (r) { return r.id === "2026.10.29-09"; })[0];
eq(dill.fromCloud && dill.status === "Mixing" && dill.bags_done === 40, "cloud progress overlays paper");
eq(dill.operators.join(",") === "Leo", "operators kept");
eq(W.paperBags(paper[1]) === 250, "paper bags are pkg counts");
eq(ranchWo.bags_needed === 250 && !ranchWo.live, "untouched paper stays a backup");
eq(W.isActive(dill, today), "live mixing order is active");
eq(W.isActive(ranchWo, today), "paper due today is active");
eq(!W.isActive({ id: "old", status: "Open", live: false, target_date: "2026-08-01" }, today), "past paper stays out of active");
eq(W.tabMatch({ status: "Done", target_date: today, updated_at: "" }, "completed", today), "done is completed");
eq(!W.tabMatch({ status: "Done", target_date: today }, "today", today), "done is not today");
eq(W.tabMatch({ status: "Open", target_date: today, live: true }, "today", today), "target today");
eq(W.tabMatch({ status: "Mixing", target_date: "2026-11-01", updated_at: "2026-10-29T01:00:00Z", live: true }, "today", today), "touched today");

var newer = W.mergeOrders(paper, cloud, {}, { "2026.07.29-01": { po: "2026.07.29-01", status: "P-Mac", bags_done: 80, bags_needed: 400, updated_at: "2026-10-29T18:00:00Z", operators: ["Wilson"] } });
var dill2 = newer.filter(function (r) { return r.id === "2026.07.29-01"; })[0];
eq(dill2.status === "P-Mac" && dill2.bags_done === 80, "newer local progress wins");

eq(W.nextWoNumber(["2026.10.29-01", "2026.07.29-04", "2026.10.29-03"], today) === "2026.10.29-04", "WO# increments for the day");
eq(W.nextWoNumber([], today) === "2026.10.29-01", "first WO# of the day");
eq(W.isProdOrdersHtml("Allen's production orders to Mixing &amp; P-Mac"), "detects the old board");
eq(W.isProdOrdersHtml("New Production Order / Orden de Produccion"), "detects the old form");
eq(!W.isProdOrdersHtml('<div id="wo-root"></div>Allen\'s production orders to Mixing'), "own page is not legacy");

var sent = W.payloadOf({ id: "2026.10.29-01", flavor: "Ranch", bags_needed: 100, bags_done: 5, status: "Open", operators: ["Leo", "Wilson"], target_date: today }, "Allen");
eq(sent.kind === "work_order" && sent.po === "2026.10.29-01" && sent.bags_done === 5, "payload");
eq(W.readbackError(sent, { id: sent.po, data: sent }) === "", "read-back matches");
eq(W.readbackError(sent, { id: sent.po, data: Object.assign({}, sent, { status: "Done" }) }).indexOf("status") >= 0, "read-back catches status");
eq(sent.operators.join(",") === "Leo,Wilson", "operators parsed");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("ok work orders", merged.length, "merged");

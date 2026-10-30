#!/usr/bin/env node
/* Purchasing status: digit-run receive match, partial pill, [[STATUS:]] chips. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var src = read("po-status.js");
var app = read("app.js");
var dash = read("dashboard.js");
var html = read("index.html");
var sw = read("service-worker.js");
var auto = read("demand-autoclose.js");
var css = read("styles.css");

eq(src.indexOf("function legacyPoMatch") >= 0, "keeps exact/contains helper");
eq(src.indexOf("digitOverlap") >= 0, "digit-run overlap");
eq(src.indexOf('res.reason = "Partially Received"') >= 0, "partial reason");
eq(src.indexOf("statusLabel") >= 0, "status label parser");
eq(src.indexOf(".from(") < 0 && src.indexOf(".insert(") < 0 && src.indexOf(".update(") < 0, "po-status does not write");
eq(app.indexOf("spoSetStatus") >= 0, "status dropdown writes notes");
eq(app.indexOf("[[STATUS:Awaiting Payment]]") >= 0, "purchasing hint");
eq(app.indexOf("Partially received") >= 0, "expected receipts pill");
eq(app.indexOf("notesWithStatus") >= 0, "status tag preserved");
eq(dash.indexOf("pill partial") >= 0 && dash.indexOf("pill status") >= 0, "dashboard chips");
eq(html.indexOf("po-status.js?b=3") >= 0, "po-status cache bust");
eq(html.indexOf("dashboard.js?b=3") >= 0, "dashboard cache bust");
eq(html.indexOf("app.js?b=191") >= 0, "app cache bust");
eq(html.indexOf("dept-homes.js?b=22") >= 0, "dept-homes cache bust");
eq(html.indexOf("styles.css?b=61") >= 0, "styles cache bust");
eq(html.indexOf("demand-autoclose.js?b=3") >= 0, "target autoclose buster unchanged");
eq(sw.indexOf('const CACHE = "smackin-inv-v254"') >= 0, "cache bump");
eq(sw.indexOf("smackin-inv-v246") < 0, "old cache gone");
eq(auto.indexOf("/target/i") >= 0, "target autoclose still skips Target");
eq(auto.indexOf("Partially received") < 0 && auto.indexOf("[[STATUS:") < 0, "autoclose untouched");
eq(css.indexOf(".pill.partial") >= 0 && css.indexOf(".pill.status") >= 0, "pill styles");

var store = {};
var ctx = {
  console: console,
  localStorage: {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); }
  },
  document: {
    getElementById: function () { return null; },
    addEventListener: function () {}
  }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
var P = ctx.POSTATUS;

function po(num, lines, extra) {
  var row = { id: num, po_num: num, po_date: "2026-10-01", notes: "", lines: lines || [{ desc: "Seasoning", qty: "1" }] };
  if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
  return row;
}
function log(num, contents, date) {
  return { po_num: num, contents: contents || "", recv_date: date || "2026-10-22" };
}

var strawberry = po("MN092326-01", [{ desc: "Strawberry Cheesecake", qty: "27" }]);
var buffalo = po("MN100726-01", [{ desc: "Buffalo Ranch Seasoning", qty: "50" }], { notes: "Rush [[STATUS:Awaiting Payment]]" });
var funnel = po("MN100626-01", [{ desc: "Funnel Cake", qty: "156" }], { notes: "[[status:pre-production]]" });
var ppc = po("MN092226-01", [{ desc: "4 oz film", qty: "100000" }], { notes: "[[STATUS:Pre-Production]]" });
var sibling = po("AB092326-09", [{ desc: "Other", qty: "1" }]);
var catalog = [strawberry, buffalo, funnel, ppc];
var mislog = [log("Txt092326StrChz", "Seasoning - Strawberry Cheesecake")];

var hit = P.derive(strawberry, mislog, catalog);
eq(hit.status === "closed" && hit.reason === "Received", "092326 digit run closes MN092326-01");
eq(P.derive(buffalo, mislog, catalog).status === "open", "digit run does not close Buffalo Ranch");
eq(P.derive(ppc, mislog, catalog).status === "open", "digit run does not close PPC Flex");
eq(P.derive(sibling, mislog, catalog.concat([sibling])).status === "open", "tied 092326 does not close the other PO");

var tied = P.derive(strawberry, mislog, [strawberry, sibling]);
eq(tied.status === "open", "shared digit run is not unique, so neither PO closes");

var longer = [
  log("Txt09232601Extra", "Seasoning - Strawberry Cheesecake"),
  po("MN092326-02", [{ desc: "Other lot", qty: "1" }])
];
var prefer = [strawberry, longer[1], sibling];
eq(P.derive(strawberry, [longer[0]], prefer).status === "closed", "longest digit run wins MN092326-01");
eq(P.derive(longer[1], [longer[0]], prefer).status === "open", "shorter 092326 overlap loses");

var exact = P.derive(strawberry, [log("MN092326-01")], [strawberry, sibling]);
eq(exact.status === "closed", "exact po_num still matches");
eq(P.derive(sibling, [log("MN092326-01")], [strawberry, sibling]).status === "open", "exact match does not spill");

var contained = P.derive(strawberry, [log("xxMN09232601yy")], [strawberry, sibling]);
eq(contained.status === "closed", "existing contains rule still matches");

eq(P.derive(strawberry, [log("ABC12345")], [strawberry]).status === "open", "digit run shorter than 6 does not match");
eq(P.derive(po("NO-SUCH", [{ desc: "Nope" }]), mislog, [buffalo]).status === "open", "no supplier_pos digit match stays open");

var mixed = po("MB101526-01", [
  { desc: "Cracked (Garlic) Pepper", qty: "650", recv: true, recv_date: "2026-10-28", ship: "2026-10-28" },
  { desc: "Dill Pickle", qty: "1350", recv: true, recv_date: "2026-10-27", ship: "2026-10-27" },
  { desc: "Seasoning - Ranch", qty: "1350", item: "716793", ship: "2026-11-01" },
  { desc: "Cinnamon Sugar Seasoning", qty: "2700", ship: "2026-11-02" }
]);
var partial = P.derive(mixed, [], [mixed, strawberry]);
eq(partial.status === "partial" && partial.reason === "Partially Received", "mixed lines are partial");
eq(partial.lines[0].recv && partial.lines[1].recv && !partial.lines[2].recv && !partial.lines[3].recv, "only marked lines are received");

var byLog = po("MB101526-01", [
  { desc: "Dill Pickle", qty: "1350" },
  { desc: "Seasoning - Ranch", qty: "1350" }
]);
var byLogSt = P.derive(byLog, [log("MB101526-01", "Seasoning - Dill Pickle", "2026-10-27")], [byLog]);
eq(byLogSt.status === "partial", "one matching receipt on a multi-line PO is partial");
eq(byLogSt.lines[0].recv && !byLogSt.lines[1].recv, "contents match only the dill line");

var oldPartial = po("MB101526-01", [
  { desc: "Dill Pickle", recv: true },
  { desc: "Ranch" }
], { po_date: "2020-01-01" });
eq(P.derive(oldPartial, [], [oldPartial]).status === "partial", "partial is not aged closed");

var cancelled = po("MB101526-01", [{ desc: "Dill", recv: true }, { desc: "Ranch" }], { notes: "cancelled by vendor" });
eq(P.derive(cancelled, [], [cancelled]).status === "closed" && P.derive(cancelled, [], [cancelled]).reason === "Cancelled", "cancelled still wins");

eq(P.derive(strawberry, [], [strawberry]).status === "open", "unreceived single line stays open");
var done = po("MN092326-01", [{ desc: "A", recv: true }, { desc: "B", recv: true }]);
eq(P.derive(done, [], [done]).status === "closed", "every line received is closed");

eq(P.statusLabel("[[STATUS:Awaiting Payment]]") === "Awaiting Payment", "status label");
eq(P.statusLabel("rush [[status:Pre-Production]] thanks") === "Pre-Production", "status label case");
eq(P.statusLabel("[[ETA:2026-10-21]] only") === "", "eta is not a status");
eq(P.statusLabel("[[STATUS:" + "ABCDEFGHIJ".repeat(5) + "]]") === "", "label longer than 40 is ignored");
eq(P.statusPill("[[STATUS:Awaiting <Payment>]]").indexOf("Awaiting &lt;Payment&gt;") >= 0, "status pill escapes");
eq(P.statusPill("no tag") === "", "no status pill");

ctx.DB = {
  receivingLog: function () { return []; },
  supplierPos: function () { return [mixed, strawberry, buffalo]; },
  purchaseOrders: function () { return []; },
  items: function () { return [{ id: "ranch", code: "716793", name: "Seasoning - Ranch", reorder: 10 }]; },
  onHand: function () { return 0; }
};
eq(P.install(), "install");
var receipts = ctx.DB.expectedReceipts();
var ranch = receipts.filter(function (r) { return r.po_num === "MB101526-01" && r.desc.indexOf("Ranch") >= 0; })[0];
var dill = receipts.filter(function (r) { return r.po_num === "MB101526-01" && r.desc.indexOf("Dill") >= 0; })[0];
eq(ranch && ranch.poStatus === "partial" && ranch.recv === false, "open line keeps partial po status");
eq(dill && dill.recv === true, "received line stays received");
eq(ctx.DB.onOrder("ranch") === 1350, "partial PO still counts unreceived qty");

P.setFilter("open");
var openList = P.filter([mixed, strawberry, buffalo]);
eq(openList.length === 3, "open filter keeps partial POs");
P.setFilter("partial");
var onlyPartial = P.filter([mixed, strawberry, buffalo]);
eq(onlyPartial.length === 1 && onlyPartial[0].po_num === "MB101526-01", "partial filter");
P.setFilter("closed");
eq(P.filter([mixed, done, strawberry]).length === 1, "closed filter");
P.setFilter("all");
eq(P.filter([mixed, strawberry]).length === 2, "all filter");
P.setFilter("nope");
eq(P.getFilter() === "open", "unknown filter falls back to open");
var counts = P.counts([mixed, strawberry, done]);
eq(counts.partial === 1 && counts.open === 1 && counts.closed === 1 && counts.all === 3, "counts");
eq(P.toggleHtml([mixed, strawberry]).indexOf("Partially Received (1)") >= 0, "toggle label");
eq(P.pill(mixed).indexOf("Partially received") >= 0, "partial pill");
eq(P.pill(strawberry).indexOf(">Open<") >= 0, "open pill");
eq(P.pill(done).indexOf("Closed") >= 0, "closed pill");

var notesCtx = { window: {} };
notesCtx.window = notesCtx;
vm.createContext(notesCtx);
var fnStart = app.indexOf("function etaOfNotes");
var fnEnd = app.indexOf("function poLinesOf");
eq(fnStart > 0 && fnEnd > fnStart, "notes helpers present");
vm.runInContext(app.slice(fnStart, fnEnd) + "\nthis.notesWithEta=notesWithEta; this.notesWithStatus=notesWithStatus; this.notesClean=notesClean;", notesCtx);
var tagged = notesCtx.notesWithStatus("[[ETA:2026-10-21]] Other: 3% CC Fee", "Awaiting Payment");
eq(tagged === "[[ETA:2026-10-21]] [[STATUS:Awaiting Payment]] Other: 3% CC Fee", "status tag keeps eta and note text");
eq(notesCtx.notesClean(tagged) === "Other: 3% CC Fee", "notes body hides the tags");
eq(notesCtx.notesWithEta(tagged, "2026-11-02") === "[[ETA:2026-11-02]] [[STATUS:Awaiting Payment]] Other: 3% CC Fee", "eta edit keeps status");
eq(notesCtx.notesWithStatus(tagged, "") === "[[ETA:2026-10-21]] Other: 3% CC Fee", "clearing status keeps eta");
eq(notesCtx.notesWithStatus("[[status:pre-production]] film", "Pre-Production").indexOf("[[STATUS:Pre-Production]]") >= 0, "dropdown rewrites the tag");

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("check-po-status ok");

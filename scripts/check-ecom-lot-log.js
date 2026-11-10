/* Day-level e-com lot log: overlapping windows, out-of-pick close, required from. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var log = require("../ecom-lot-log.js");
var recall = require("../trace-recall.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }
function sliceFn(src, name, next) {
  var i = src.indexOf("function " + name);
  var j = next ? src.indexOf("function " + next, i + 1) : src.length;
  return i < 0 ? "" : src.slice(i, j < 0 ? src.length : j);
}

assert(log.WRITE_STOCK === false, "WRITE_STOCK off");
var samples = [
  ["2026-11-01", { pulledDay: "2026-11-02", endsDay: "2026-11-05", open: false }],
  ["2026-11-02", { pulledDay: "2026-11-02", endsDay: "2026-11-05", open: false }],
  ["2026-11-04", { pulledDay: "2026-11-02", endsDay: "2026-11-05", open: false }],
  ["2026-11-05", { pulledDay: "2026-11-02", endsDay: "2026-11-05", open: false }],
  ["2026-11-09", { pulledDay: "2026-11-02", open: true }],
  ["2026-11-02", { pulledDay: "2026-11-02", endsDay: "2026-11-02", open: false }],
  ["2026-11-03", { pulledDay: "2026-11-02", endsDay: "2026-11-02", open: false }],
  ["", { pulledDay: "2026-11-02", open: true }],
  ["11/02/2026", { pulledDay: "2026-11-02", endsDay: "2026-11-04", open: false }],
  ["2026-11-02", null]
];
samples.forEach(function (s, i) {
  assert(log.inWindow(s[0], s[1]) === recall.inWindow(s[0], s[1]), "inWindow matches recall " + i);
});

function use(lot, fc, name, size, day, bags, op, from, dest) {
  return {
    type: "USE", ts: day + "T18:00:00.000Z", qty: bags, uom: "bags",
    from_loc: from || "", to_loc: dest || "ECOM", lot: lot, operator: op || "Lenny",
    data: { flavor_code: fc, flavor: name, size: size, pull_date: day, manual: true, from_loc: from || "" }
  };
}
function out(lot, fc, name, size, day) {
  return {
    type: "ECOM_OUT", ts: day + "T18:00:00.000Z", qty: null, lot: lot, operator: "Lenny",
    from_loc: "ECOM", to_loc: null,
    data: { flavor_code: fc, flavor: name, size: size, pull_date: day, finished_date: day, out_of_pick: true }
  };
}
var opt = {
  pullInstant: function (e) { return (e.data && e.data.pull_date) + "T18:00:00.000Z"; },
  stamp: function (iso) { return String(iso).slice(0, 10) + " 12:00"; }
};

var overlap = [
  use("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-02", 10, "Lenny", "STAGING"),
  use("L2032/3X9.40", "L20", "Pizza", "4oz", "2026-11-03", 8, "Monica", "PACKOUT")
];
var wins = log.buildWindows(overlap, opt);
assert(wins.length === 2, "two lots stay open together");
assert(wins.every(function (w) { return w.open && !w.endsDay && !w.nextLot; }), "second pull does not close the first");
assert(log.inWindow("2026-11-04", wins[0]) && log.inWindow("2026-11-04", wins[1]), "both in e-com on a later day");
assert(log.inWindow("2026-11-02", wins[0]) && !log.inWindow("2026-11-02", wins[1]), "second lot is not in e-com before its pull");
assert(log.lotsOnDate(wins, "2026-11-04").length === 2, "on-date view keeps both lots");

var closed = overlap.concat([out("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-04")]);
var after = log.buildWindows(closed, opt);
var first = after.filter(function (w) { return w.lot.indexOf("L2031") === 0; })[0];
var second = after.filter(function (w) { return w.lot.indexOf("L2032") === 0; })[0];
assert(first && !first.open && first.finishedDay === "2026-11-04" && first.endsDay === "2026-11-05", "out of pick sets the exclusive next day");
assert(first.endedBy === "out of pick" && !first.nextLot, "close reason is out of pick, not another lot");
assert(log.inWindow("2026-11-04", first) && !log.inWindow("2026-11-05", first), "finish day is in the window and the next day is not");
assert(second && second.open && log.inWindow("2026-11-05", second), "the other lot stays open");

var again = [
  use("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-02", 10, "Lenny", "STAGING"),
  use("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-03", 5, "Lenny", "A-05-L3"),
  out("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-03"),
  use("L2031/3X9.35", "L20", "Pizza", "4oz", "2026-11-05", 4, "Lenny", "PACKOUT")
];
var spans = log.buildWindows(again, opt);
assert(spans.length === 2, "a later pull after out of pick starts a new window");
assert(spans[0].bags === 15 && spans[0].finishedDay === "2026-11-03", "pulls before out of pick add bags");
assert(spans[0].froms.indexOf("STAGING") >= 0 && spans[0].froms.indexOf("A-05-L3") >= 0, "from locations stay on the window");
assert(spans[1].open && spans[1].pulledDay === "2026-11-05" && spans[1].bags === 4, "new span starts at the next pull");
assert(!log.inWindow("2026-11-04", spans[0]) && !log.inWindow("2026-11-04", spans[1]), "the gap day matches neither span");

var mixed = [
  use("L1401/1A1.10", "L14", "Teriyaki", "4oz", "2026-11-02", 6, "Lenny", "STAGING", "LINE"),
  use("L1401/1A1.10", "L14", "Teriyaki", "4oz", "2026-11-02", 12, "Lenny", "STAGING", "ECOM")
];
assert(log.buildWindows(mixed, opt).length === 1, "only USE to ECOM opens a window");
var grouped = log.groupPulls(mixed, "2026-11-02", "2026-11-02", opt);
assert(grouped.length === 2, "line and e-com pulls both show on the day");
assert(grouped.some(function (r) { return r.to === "ECOM" && r.bags === 12; }), "e-com bags grouped");
assert(grouped.some(function (r) { return r.to === "LINE" && r.bags === 6; }), "related line pull kept");

var sameDay = [
  use("S01A/1A1.10", "S01", "OG Original", "1.5oz", "2026-11-02", 10, "Lenny", "STAGING"),
  use("S01A/1A1.10", "S01", "OG Original", "1.5oz", "2026-11-02", 4, "Monica", "PACKOUT"),
  use("S01A/1A1.10", "S01", "OG Original", "1.5oz", "2026-11-01", 99, "Lenny", "STAGING")
];
var dayRows = log.groupPulls(sameDay, "2026-11-02", "2026-11-03", opt);
assert(dayRows.length === 1 && dayRows[0].bags === 14, "same day, lot, flavor, and size sum bags");
assert(dayRows[0].operators.join(",") === "Lenny,Monica", "operators kept");
assert(dayRows[0].froms.join(",") === "STAGING,PACKOUT", "from locations kept");
assert(log.groupPulls(sameDay, "2026-11-03", "2026-11-02", opt).length === 1, "reversed range still includes the day");

assert(log.cleanFrom("") === "" && log.cleanFrom("  ") === "", "blank from is empty");
assert(log.cleanFrom("staging") === "STAGING", "from is trimmed and uppercased");
assert(log.cleanFrom("A-05-L3") === "A-05-L3", "rack code kept");
assert(log.cleanFrom(new Array(50).join("A")) === "", "overlong from is rejected");

var csv = log.toCsv(dayRows, spans, "2026-11-05");
assert(csv.indexOf("section,date,lot") === 1, "csv header");
assert(csv.indexOf("S01A/1A1.10") >= 0 && csv.indexOf("in_ecom") >= 0, "csv has pulls and lots in e-com");
assert(log.toCsv([{ kind: "pull", pull_date: "2026-11-02", lot: '=HYPER', flavor: 'Say "hi"', size: "4oz", bags: 1, froms: [], operators: [], to: "ECOM", saves: 1 }], [], "").indexOf("'=HYPER") >= 0, "csv neutralizes formulas");

var html = log.viewHtml({ events: closed, today: "2026-11-04" });
assert(html.indexOf("trc-elog") >= 0 && html.indexOf("L2032/3X9.40") >= 0, "day view lists the open lot");
assert(html.indexOf("Export CSV") >= 0 && html.indexOf("ECOMLOG.finish(") >= 0, "export and out of pick are on the view");

var trace = read("trace.js");
var homes = read("dept-homes.js");
var index = read("index.html");
var sw = read("service-worker.js");
var manual = sliceFn(trace, "useManual", "useDest");
var finish = sliceFn(trace, "saveEcomOut", "useScan");
assert(manual.indexOf("from_loc: fromLoc") >= 0 && manual.indexOf("from_loc: fromLoc,") >= 0, "manual save stores from_loc");
assert(manual.indexOf("chosenFrom()") >= 0, "manual save requires from");
assert(finish.indexOf('type: "ECOM_OUT"') >= 0 && finish.indexOf('from_loc: "ECOM"') >= 0, "out of pick is an event");
assert(finish.indexOf("updLabel") < 0 && finish.indexOf("DB.move") < 0, "out of pick does not write stock");
assert(trace.indexOf("var WRITE_STOCK = false") >= 0 && trace.indexOf("WRITE_STOCK = true") < 0, "trace stock writes stay off");
assert(read("ecom-lot-log.js").indexOf("DB.move") < 0, "log module does not move stock");
assert(trace.indexOf("ecomWindows(S.events)") >= 0, "recall windows use the shared builder");
assert(trace.indexOf("normLot(x.lot) !== normLot(e.lot) && g.fc === f.fc") < 0, "next same-flavor pull no longer closes the window");
assert(homes.indexOf('trace: "elog"') >= 0, "dept tool");
assert(homes.indexOf('"trace", "trElog", "trLabels"') >= 0, "quality tab");
assert(homes.indexOf('"fglots", "trElog"') >= 0, "fulfillment tab");
assert(index.indexOf('src="ecom-lot-log.js?b=1"') >= 0 && index.indexOf("ecom-lot-log.js") < index.indexOf("trace.js"), "script order");
assert(index.indexOf('src="trace.js?b=21"') >= 0, "trace cache bust");
assert(index.indexOf('src="trace-recall.js?b=2"') >= 0, "recall cache bust");
assert(index.indexOf('src="dept-homes.js?b=35"') >= 0, "dept homes cache bust");
assert(sw.indexOf('const CACHE = "smackin-inv-v299"') >= 0 && sw.indexOf("./ecom-lot-log.js") >= 0, "cache and asset");
assert(read("build-id.txt").trim() === "smackin-inv-v299", "build id");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok");

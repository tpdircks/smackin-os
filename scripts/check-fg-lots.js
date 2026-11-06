/* FG lot best-by: save path, missing shelf-life rule, and no stock writes. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var fg = require("../fg-lots.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

var rule = fg.parseShelfRule('{"confirmed":true,"months":9}');
assert(rule && rule.confirmed === true && rule.months === 9, "confirmed months rule");
assert(fg.parseShelfRule("12") === null, "bare months are not a rule");
assert(fg.parseShelfRule('{"months":12}') === null, "unconfirmed json is not a rule");
assert(fg.parseShelfRule('{"confirmed":false,"months":12}') === null, "confirmed false is not a rule");
assert(fg.parseShelfRule('{"confirmed":true}') === null, "confirmed without months is not a rule");
assert(fg.parseShelfRule({ confirmed: true, months: 0 }) === null, "zero months rejected");
assert(fg.parseShelfRule({ confirmed: true, months: 18.5 }) === null, "fractional months rejected");

var sized = fg.parseShelfRule({ confirmed: true, by_size: { "4oz": 12, "1.5oz": 9 } });
assert(fg.monthsFor(sized, "4oz", "S05") === 12, "4oz months");
assert(fg.monthsFor(sized, "1.5 oz", "S05") === 9, "1.5oz months");
assert(fg.monthsFor(sized, "2.75oz", "S05") == null, "unknown size does not invent months");
assert(fg.addMonths("2026-10-30", 9) === "2027-07-30", "add 9 months");
assert(fg.addMonths("2026-10-30", 12) === "2027-10-30", "add 12 months");
assert(fg.addMonths("2026-01-31", 1) === "2026-02-28", "month clamp");
assert(fg.addMonths("2024-01-31", 1) === "2024-02-29", "leap clamp");

var miss = fg.bestByField({ typed: "", packDate: "2026-10-30", rule: null, lang: "en" });
assert(miss.prefill === "" && miss.value === "", "missing rule leaves best-by blank");
assert(miss.code === "not_set", "missing rule code");
assert(miss.guidance.indexOf("Not set") === 0, "missing rule shows Not set");
var missEs = fg.bestByField({ typed: "", packDate: "2026-10-30", rule: null, lang: "es" });
var missPt = fg.bestByField({ typed: "", packDate: "2026-10-30", rule: null, lang: "pt" });
assert(missEs.guidance.indexOf("No definido") === 0, "spanish not set");
assert(missPt.guidance.indexOf("Nao definido") === 0, "portuguese not set");

var pre = fg.bestByField({ typed: "", packDate: "2026-10-30", size: "4oz", flavor: "S05", rule: rule, lang: "en" });
assert(pre.prefill === "2027-07-30" && pre.value === "2027-07-30" && pre.code === "from_rule", "rule prefills");

var saved = fg.fgLabelExp({ typed: "2027-04-15", packDate: "2026-10-30", rule: null, touched: true, lot: "S0557/4L3.41" });
assert(saved.exp === "2027-04-15" && saved.source === "printed", "best-by save path uses the typed date");
assert(saved.override === false && saved.events.length === 0, "typed date without a rule is not an override");
assert(saved.writes.length === 0 && saved.stockWritten === false, "save path does not write stock");
assert(fg.WRITE_STOCK === false, "WRITE_STOCK off");

var ruled = fg.fgLabelExp({ typed: "2027-07-30", packDate: "2026-10-30", size: "4oz", flavor: "S05", rule: rule, touched: false, lot: "S0557/4L3.41" });
assert(ruled.exp === "2027-07-30" && ruled.source === "rule" && ruled.override === false, "prefill save keeps the rule date");

var over = fg.fgLabelExp({ typed: "2027-08-01", packDate: "2026-10-30", size: "4oz", flavor: "S05", rule: rule, touched: true, lot: "S0557/4L3.41" });
assert(over.override === true && over.exp === "2027-08-01" && over.source === "override", "override keeps the typed date");
assert(over.events.length === 1 && over.events[0].type === "BEST_BY", "override is logged");
assert(over.events[0].data.from === "2027-07-30" && over.events[0].data.to === "2027-08-01", "override from and to");
assert(over.writes.length === 0 && over.stockWritten === false, "override does not write stock");

var cleared = fg.fgLabelExp({ typed: "", packDate: "2026-10-30", size: "4oz", flavor: "S05", rule: rule, touched: true });
assert(cleared.exp === null && cleared.override === true && cleared.events[0].data.to === "", "cleared suggestion is an override");

var picked = fg.pickRule([
  { key: "po:1", value: '{"confirmed":true,"months":4}' },
  { key: "fg_shelf_life_note", value: '{"months":8}' },
  { key: "fg_shelf_life", value: '{"confirmed":true,"months":6}' }
]);
assert(picked && picked.months === 6 && picked.key === "fg_shelf_life", "only a confirmed fg_shelf_life key is used");
assert(fg.shelfKeyOk("fg_shelf_life") && fg.shelfKeyOk("fg_shelf_life_4oz") && !fg.shelfKeyOk("shelf"), "shelf key shape");

var legacy = fg.legacyRows([
  { prod_date: "2026-10-20", channel: "retail", lot: "S0557/4L3.41" },
  { prod_date: "2026-10-26", channel: "retail", lot: "S0557/4L3.41, S0100/4J9.39, nope, L2451" },
  { prod_date: "2026-10-23", channel: "retail", lot: "L2541/4H7.38, S0100/4J9.39, S0347/4J4.40, S0235/9Q2.38, S0835/4H8.37, S0557/4L3.41,S0448/4J3.39,  " },
  { prod_date: "2026-10-26", channel: "ecom", lot: "S0835/4H8.37" }
], { today: "2026-10-30" });
assert(legacy.length === 7, "legacy bag codes " + legacy.length);
legacy.forEach(function (row) {
  assert(row.qty_left == null, "legacy qty stays blank " + row.lot);
  assert(row.size === "", "legacy size stays blank " + row.lot);
  assert(row.exp === "", "legacy best-by stays blank " + row.lot);
  assert(row.source === "logged", "legacy source " + row.lot);
  assert(row.source_label.indexOf("Logged, not palletized") === 0, "legacy label " + row.lot);
});
var dill = legacy.filter(function (r) { return r.lot === "S0557/4L3.41"; })[0];
assert(dill && dill.flavor === "Dill Pickle" && dill.logged_on === "2026-10-26", "legacy flavor and latest day");
assert(legacy.filter(function (r) { return r.lot === "L2451" || r.lot === "NOPE"; }).length === 0, "non bag codes dropped");
assert(legacy.filter(function (r) { return r.lot === "S0835/4H8.37"; }).length === 1, "comma without space kept");

var labels = [
  { kind: "FG", lot: "S0557/4L3.41", flavor_code: "S05", flavor: "Dill Pickle", size: "4oz", exp: "2027-01-01", qty_left: 100, status: "ACTIVE", location: "STAGING", created_at: "2026-10-30T00:00:00Z" },
  { kind: "FG", lot: "S0557/4L3.41", flavor_code: "S05", flavor: "Dill Pickle", size: "4oz", exp: "2027-02-01", qty_left: 40, status: "HOLD", location: "A1", created_at: "2026-10-29T00:00:00Z" },
  { kind: "RM", lot: "SEED1", flavor_code: "", qty_left: 10, status: "RELEASED" },
  { kind: "FG", lot: "  s0100/4j9.39 ", flavor_code: "S01", size: "1.5oz", exp: null, qty_left: 5, status: "ACTIVE", location: "STAGING" }
];
var merged = fg.mergeRegister(labels, [
  { prod_date: "2026-10-26", channel: "retail", lot: "S0557/4L3.41, S0100/4J9.39, S0448/4J3.39" }
], { today: "2026-10-30" });
var pal = merged.filter(function (r) { return r.lot === "S0557/4L3.41"; });
assert(pal.length === 1 && pal[0].source === "pallet", "pallet replaces the logged row");
assert(pal[0].qty_left === 140 && pal[0].exp === "2027-01-01", "qty sums and earliest best-by wins");
assert(pal[0].status === "Mixed", "mixed status");
assert(pal[0].location.indexOf("STAGING") >= 0 && pal[0].location.indexOf("A1") >= 0, "locations");
assert(pal[0].days_left === fg.daysLeft("2027-01-01", "2026-10-30"), "days left");
assert(pal[0].short === true && pal[0].days_left <= fg.SHORT_DAYS, "short-dated flag");
var stillLogged = merged.filter(function (r) { return r.lot === "S0100/4J9.39"; });
assert(stillLogged.length === 1 && stillLogged[0].source === "pallet" && stillLogged[0].qty_left === 5, "cloud pallet wins over the log");
var onlyLog = merged.filter(function (r) { return r.lot === "S0448/4J3.39"; })[0];
assert(onlyLog && onlyLog.source === "logged" && onlyLog.qty_left == null, "logged-only row has no qty");
assert(merged.filter(function (r) { return r.kind === "RM" || r.lot === "SEED1"; }).length === 0, "raw materials stay out");

var shown = fg.filterRows(merged, { short: true, source: "pallet" });
assert(shown.some(function (r) { return r.lot === "S0557/4L3.41"; }) && shown.every(function (r) { return r.short && r.source === "pallet"; }), "filters");
var csv = fg.toCsv(merged);
assert(csv.indexOf("lot,flavor,size,best_by,days_left,short_dated,status,qty_left,location,source") === 0, "csv header");
assert(csv.indexOf("Logged, not palletized") >= 0, "csv names the log");
assert(csv.indexOf("S0448/4J3.39") >= 0, "csv has the logged lot");
var logLine = csv.split("\n").filter(function (line) { return line.indexOf("S0448/4J3.39") >= 0; })[0];
assert(logLine && logLine.split(",").indexOf("") >= 0, "csv qty cell blank for logged row");

assert(fg.healthLine({ count: 0, latest: "", fg: 0 }, "en").indexOf("trace_labels: 0") >= 0, "empty count");
assert(fg.healthLine({ count: 0, latest: "", fg: 0 }, "en").indexOf("none") >= 0, "empty last update");
assert(fg.healthLine({ count: 4, latest: "2026-10-30T18:02:00Z", fg: 3 }, "en").indexOf("trace_labels: 4") >= 0, "live count");
assert(fg.healthLine({ count: null }, "en").indexOf("could not read") >= 0, "read failure");

var LOT_ADDED = [
  ["L53", "Loaded Nacho - Pablo", "A3", "Milk, Soy"],
  ["L54", "Strawberry Cheesecake-Flash", "A2", "Milk"],
  ["L55", "Bacon Jalapeno", "A2", "Milk"],
  ["L56", "Cotton Candy", "A1", ""],
  ["L57", "Birthday Cake", "A2", "Milk"],
  ["L58", "Nashville Hot", "A1", ""],
  ["L59", "Mexican Street Corn", "A2", "Milk"],
  ["L60", "Brisket", "", ""],
  ["L61", "Glazed Donut", "", ""],
  ["L63", "Beer Brat", "", ""]
];
var traceSrc = read("trace.js");
var flavStart = traceSrc.indexOf("var FLAVORS = [");
var flavEnd = traceSrc.indexOf("].map(function (f)", flavStart);
assert(flavStart >= 0 && flavEnd > flavStart, "trace flavor table");
var traceFlavors = vm.runInNewContext(traceSrc.slice(flavStart + "var FLAVORS = ".length, flavEnd + 1));
function traceBy(code) {
  for (var i = 0; i < traceFlavors.length; i++) if (traceFlavors[i][0] === code) return traceFlavors[i];
  return null;
}
var seenCode = {};
traceFlavors.forEach(function (row) {
  assert(!seenCode[row[0]], "duplicate flavor code " + row[0]);
  seenCode[row[0]] = 1;
});
assert(traceBy("L19") && traceBy("L19")[1] === "Honey Sriracha" && traceBy("L19")[2] === "A1", "L19 stays Honey Sriracha");
assert(traceBy("L39") && traceBy("L39")[1] === "Sweet Thai Chili", "L39 stays Sweet Thai Chili");
assert(traceBy("S01") && traceBy("S01")[1] === "OG Original", "S01 stays");
assert(traceBy("L52") && traceBy("L52")[1] === "French Onion Soup" && traceBy("L52")[2] === "", "L52 allergen stays blank");
assert(traceBy("A18") && traceBy("A18")[2] === "A3" && traceBy("A18")[3] === "Milk, Wheat, Soy, Egg", "A18 legacy Birthday Cake");
assert(traceBy("A01") && traceBy("A01")[1] === "Nashville Hot", "A01 legacy stays");
assert(traceBy("A23") && traceBy("A23")[1] === "Mexican Street Corn", "A23 legacy stays");
assert(!traceBy("L62"), "L62 French Onion duplicate is not added");
LOT_ADDED.forEach(function (row) {
  var hit = traceBy(row[0]);
  assert(hit && hit[1] === row[1] && hit[2] === row[2] && hit[3] === row[3], "trace " + row[0] + " " + (hit && hit.join("|")));
  assert(fg.flavorName(row[0]) === row[1], "fg-lots " + row[0]);
});
assert(fg.flavorName("L19") === "Honey Sriracha", "fg-lots L19");
assert(fg.flavorName("L39") === "Sweet Thai Chili", "fg-lots L39");
assert(fg.flavorName("L62") === "L62", "fg-lots has no L62 name");
assert(traceBy("L5641".slice(0, 3))[1] === "Cotton Candy", "lot prefix L56 resolves Cotton Candy");
assert(traceBy("L1941".slice(0, 3))[1] === "Honey Sriracha", "lot prefix L19 resolves Honey Sriracha");

var ecomCtx = { console: console };
ecomCtx.window = ecomCtx;
ecomCtx.globalThis = ecomCtx;
vm.createContext(ecomCtx);
vm.runInContext(read("ecom.js"), ecomCtx, { filename: "ecom.js" });
assert(ecomCtx.ECOM.FLAVORS[0] === "OG Original" && ecomCtx.ECOM.FLAVORS[10] === "Sour Cream & Onion", "core 11 unchanged");
assert(ecomCtx.ECOM.FLAVORS.indexOf("Cotton Candy") > 10, "Cotton Candy is not a core flavor");
var candy = ecomCtx.ECOM.mapRow("SS-X-4OZ-12", "Cotton Candy (12 Bag)", 2);
assert(candy && candy.length === 1 && candy[0].flavor === "Cotton Candy" && candy[0].size === "4oz" && candy[0].bags === 24, "ShipStation desc maps Cotton Candy");
var churro = ecomCtx.ECOM.mapRow("SS-CC-4OZ-6", "", 1);
assert(churro && churro[0].flavor === "Cinnamon Churro", "CC sku stays Cinnamon Churro");

var src = read("fg-lots.js");
var trace = read("trace.js");
var homes = read("dept-homes.js");
var html = read("index.html");
var sw = read("service-worker.js");
var health = read("data-health.js");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em or en dash in fg-lots.js");
assert(!/\.from\(\s*["']stock["']\s*\)/.test(src), "register does not query stock");
assert(!/\.from\(\s*["']stock["']\s*\)/.test(trace), "trace does not query stock");
assert(src.indexOf(".insert(") < 0 && src.indexOf(".upsert(") < 0 && src.indexOf(".update(") < 0 && src.indexOf(".delete(") < 0, "register does not write");
assert(src.indexOf('from("kv_status")') >= 0, "reads shelf life");
assert(src.indexOf('from("production_days")') >= 0, "reads legacy lots");
assert(src.indexOf('from("trace_labels")') >= 0, "reads pallet labels");
assert(trace.indexOf("var WRITE_STOCK = false") >= 0, "trace WRITE_STOCK off");
assert(trace.indexOf("fgExpForSave") >= 0 && trace.indexOf("fgLabelExp") >= 0, "trace uses the best-by save path");
assert(trace.indexOf("isFG ? null") < 0, "FG receive no longer forces a blank exp");
var fin = trace.slice(trace.indexOf("function finishPallet"), trace.indexOf("function pmFinish"));
assert(fin.indexOf("exp: pack.exp") >= 0 && fin.indexOf("BEST_BY") >= 0, "pallet create stores exp and logs overrides");
assert(fin.indexOf("exp: null") < 0, "pallet create does not hard-code a blank exp");
assert(trace.indexOf('bestByNotSet: "Not set. Type the date printed on the bag."') >= 0, "english guidance");
assert(trace.indexOf("No definido. Escriba la fecha impresa en la bolsa.") >= 0, "spanish guidance");
assert(trace.indexOf("Nao definido. Digite a data impressa no saco.") >= 0, "portuguese guidance");
assert(homes.indexOf('fn: "fglots"') >= 0, "dept tool");
assert(homes.indexOf('"produce", "fglots"') >= 0, "fulfillment subtab");
assert(homes.indexOf('subs: ["pmac", "fglots"') >= 0, "pmac subtab");
assert(homes.indexOf('"trLabels", "fglots"') >= 0, "quality subtab");
assert(health.indexOf('t: "trace_events"') >= 0, "data health source");
assert(html.indexOf('src="fg-lots.js?b=3"') >= 0 && html.indexOf("fg-lots.js") < html.indexOf("trace.js"), "script order");
assert(html.indexOf('src="trace.js?b=21"') >= 0, "trace cache bust");
assert(html.indexOf('src="dept-homes.js?b=32"') >= 0, "dept homes cache bust");
assert(html.indexOf('src="data-health.js?b=6"') >= 0, "data health cache bust");
assert(sw.indexOf('const CACHE = "smackin-inv-v290"') >= 0 && sw.indexOf("./fg-lots.js") >= 0, "cache and asset");
assert(read("build-id.txt").trim() === "smackin-inv-v290", "build id");
assert(html.indexOf('var EMBEDDED = "smackin-inv-v290"') >= 0, "index embedded");
assert(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v290"') >= 0, "escape embedded");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok");

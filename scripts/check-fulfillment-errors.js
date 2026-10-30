/* Check the fulfillment error seed, monthly totals, and screen wiring. */
var fs = require("fs");
var path = require("path");
var nc = require("node:crypto");
var fa = require("../fulfillment-analytics.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

var raw = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "wip-fulfillment-errors.json"), "utf8"));
var built = fa.buildSeed(raw);
assert(raw.length === 284, "raw rows " + raw.length);
assert(built.rows.length === 280, "unique rows " + built.rows.length);
assert(built.dropped === 4, "dropped " + built.dropped);

var again = fa.buildSeed(raw.concat(raw));
assert(again.rows.length === 280, "second pass still 280");

built.rows.forEach(function (r) {
  var exp = nc.createHash("sha256").update(fa.seedIdentity(r.order_num, r.date_reported, r.product_ordered), "utf8").digest("hex");
  assert(r.seed_key === exp && r.seed_key.length === 64, "hash " + r.order_num + " " + r.date_reported);
  assert(r.source === fa.SOURCE, "source");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_reported), "date " + r.date_reported);
});

assert(fa.seedKey("#56583", "2023-11-28", "Bucket of 54 VP") === fa.seedKey(" #56583 ", "2023-11-28", " Bucket of 54 VP"), "whitespace key");
assert(fa.seedKey("#56583", "2023-11-28", "Bucket of 54 VP") !== fa.seedKey("#36875", "2023-11-28", "Bucket of 54 VP"), "different orders");

var sum = fa.summarizeErrors(built.rows, "2024-04-20");
assert(sum.total === 280, "total");
assert(sum.cost === 808.88, "cost " + sum.cost);
assert(sum.costRows === 104, "cost rows " + sum.costRows);
assert(sum.open === 280, "open " + sum.open);
assert(sum.min === "2023-04-29", "min " + sum.min);
assert(sum.max === "2024-04-19", "max " + sum.max);
assert(fa.summarizeErrors(built.rows, "2026-10-28").thisMonth === 0, "current month is empty");

var series = fa.monthSeries(built.rows);
assert(series.length === 12, "months " + series.length);
var n = 0;
var cost = 0;
series.forEach(function (s) { n += s.n; cost += s.cost; });
assert(n === 280, "month counts " + n);
assert(Math.round(cost * 100) === 80888, "month cost " + cost);

var april = fa.filterErrors(built.rows, { month: "2024-04" });
assert(april.length === sum.thisMonth && april.length > 0, "april " + april.length);
var openOnly = fa.filterErrors(built.rows, { uncredited: true });
assert(openOnly.length === 280, "uncredited filter");
var found = fa.filterErrors(built.rows, { q: "duplicate entry" });
assert(found.length > 0 && found.every(function (r) {
  return String(r.notes || "").toLowerCase().indexOf("duplicate") >= 0 || String(r.product_received || "").toLowerCase().indexOf("duplicate") >= 0;
}), "search");

assert(fa.returnDupKey({ tracking: "1ZABC", product: "Bag", return_date: "2026-10-01" }) === "1zabc|bag|2026-10-01", "dup key");
assert(fa.returnDupKey({ shipment_id: "S1", item_code: "B4-S01", return_date: "2026-08-03" }) === "s1|b4-s01|2026-08-03", "dup key item");

var cleaned = fa.cleanReturn({ product: "A", qty: 2, channel: "ecom", invented_column: "no", ship_address: "x" });
assert(cleaned.product === "A" && cleaned.qty === 2 && cleaned.invented_column === undefined && cleaned.ship_address === undefined, "return columns");
assert(fa.RETURN_COLS.indexOf("return_date") >= 0 && fa.RETURN_COLS.indexOf("dup_key") >= 0, "known columns");

var retSum = fa.summarizeReturns([
  { channel: "ecom", return_date: "2026-10-02" },
  { channel: "major", return_date: "2026-09-09" },
  { channel: "ecom", return_date: "2026-10-23" }
], "2026-10-28");
assert(retSum.total === 3 && retSum.thisMonth === 2 && retSum.ecom === 2 && retSum.major === 1, "return kpis");

var src = fs.readFileSync(path.join(__dirname, "..", "fulfillment-analytics.js"), "utf8");
assert(src.indexOf("\u2014") < 0, "em dash in fulfillment-analytics.js");
var sql = fs.readFileSync(path.join(__dirname, "..", "fulfillment_errors.sql"), "utf8");
assert(sql.indexOf("\u2014") < 0 && sql.indexOf("fulfillment_errors_all") >= 0, "sql");
var index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(index.indexOf('src="fulfillment-analytics.js?b=2"') >= 0, "index script");
assert(src.indexOf('rest("returns_log",') < 0, "returns tab does not post");
assert(index.indexOf("fulfillment-analytics.js") < index.indexOf("dept-homes.js"), "script order");
var sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert(sw.indexOf("smackin-inv-v259") >= 0 && sw.indexOf("./fulfillment-analytics.js") >= 0 && sw.indexOf("./data/wip-fulfillment-errors.json") >= 0, "cache bump");
var homes = fs.readFileSync(path.join(__dirname, "..", "dept-homes.js"), "utf8");
assert(homes.indexOf("fulfillerr") >= 0 && homes.indexOf('fn: "ferr"') >= 0 && homes.indexOf('id: "ferr"') >= 0, "dept home");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok", built.rows.length, "cost", sum.cost, "months", series.length, "april", april.length);

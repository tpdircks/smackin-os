/* Checks QA checklist forms, print text, and wiring. No network, no scans. */
var fs = require("fs");
var path = require("path");
var qa = require("../qa-checklists.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

assert(qa.TYPES.join(",") === "preop,metal,gmp,pouch", "four form types");
assert(qa.PREOP.length === 10, "preop tasks " + qa.PREOP.length);
assert(qa.DAYS.join(",") === "mon,tue,wed,thu,fri,sat", "week days");
assert(qa.AREAS.join(",") === "mixing,pmac,warehouse", "gmp areas");
assert(qa.paperBanner === "Paper remains backup until QA confirms digital storage.", "banner");
assert(qa.mondayOf("2026-10-28") === "2026-10-26", "wednesday snaps to monday");
assert(qa.mondayOf("2026-10-25") === "2026-10-19", "sunday snaps to previous monday");
assert(qa.mondayOf("2026-10-26") === "2026-10-26", "monday stays");

qa.PREOP.forEach(function (t) {
  assert(t.en && t.es && t.dept_en && t.dept_es && t.key, "preop bilingual " + t.key);
});
["hygiene", "clothing", "handwash", "gloves", "jewelry", "hairnet"].forEach(function (key) {
  var hit = qa.GMP.filter(function (g) { return g.key === key; })[0];
  assert(hit && hit.en && hit.es, "gmp item " + key);
});
var follow = qa.GMP.filter(function (g) { return g.key === "follow"; })[0];
assert(follow && follow.en.indexOf("handwashing") >= 0 && follow.es.indexOf("guantes") >= 0, "gmp follows pre-op line");

function fillPreop(pass) {
  var rec = qa.blank("preop");
  rec.operator = "MS";
  rec.lines.forEach(function (line) { line.marks.mon = pass ? "pass" : "fail"; });
  rec.header.day_meta.mon.initials = "QA";
  rec.header.day_meta.mon.time = "06:30";
  if (!pass) rec.header.deviations[0] = { date: "2026-10-26", deviation: "Dock door open", action: "Closed the door", verification: "QA" };
  return rec;
}
var good = fillPreop(true);
assert(qa.validate(good, "draft").length === 0, "preop draft");
assert(qa.validate(good, "complete").length === 0, "preop complete " + qa.validate(good, "complete").join(","));
var bad = fillPreop(false);
bad.header.deviations = [{ date: "", deviation: "", action: "", verification: "" }];
assert(qa.validate(bad, "complete").indexOf("needDeviation") >= 0, "preop X needs deviation");
var noInit = fillPreop(true);
noInit.header.day_meta.mon.initials = "";
assert(qa.validate(noInit, "complete").indexOf("needDayMeta:mon") >= 0, "preop day initials");

var metal = qa.blank("metal");
metal.form_date = "2026-10-28";
metal.operator = "LS";
metal.reviewer = "BC";
metal.machine = "P-Mac 1";
metal.lines[0] = { time: "08:00", fe: "pass", nf: "pass", ss: "pass", action: "", initials: "LS" };
assert(qa.validate(metal, "complete").length === 0, "metal complete " + qa.validate(metal, "complete").join(","));
metal.lines[0].ss = "fail";
assert(qa.validate(metal, "complete").indexOf("needAction") >= 0, "metal fail needs action");
metal.lines[0].action = "Stopped line, retested, passed";
assert(qa.validate(metal, "complete").length === 0, "metal fail with action");
assert(qa.resultOf(metal) === "fail", "metal result fail");

var gmp = qa.blank("gmp");
gmp.form_date = "2026-10-28";
gmp.operator = "NA";
gmp.machine = "warehouse";
gmp.lines.forEach(function (line) { line.mark = "pass"; });
assert(qa.validate(gmp, "complete").length === 0, "gmp complete " + qa.validate(gmp, "complete").join(","));
gmp.lines[0].mark = "fail";
assert(qa.validate(gmp, "complete").indexOf("needGmpNote") >= 0, "gmp note");
gmp.machine = "";
assert(qa.validate(gmp, "complete").indexOf("needArea") >= 0, "gmp area");

var pouch = qa.blank("pouch");
pouch.form_date = "2026-10-28";
pouch.operator = "BT";
pouch.machine = "Line 2";
pouch.lines[0] = { hour: "10:00", flavor: "Ranch", seal: "pass", weight: "pass", code: "pass", film: "fail", initials: "BT", notes: "" };
assert(qa.validate(pouch, "complete").indexOf("needNotes") >= 0, "pouch notes");
pouch.lines[0].notes = "Changed film roll";
assert(qa.validate(pouch, "complete").length === 0, "pouch complete " + qa.validate(pouch, "complete").join(","));

var row = qa.toRow(good);
assert(row.form_type === "preop" && row.form_date === good.form_date, "row identity");
assert(row.header && row.lines && row.lines.length === 10, "header and lines");
assert(row.status === "draft" && row.operator === "MS", "status and operator");
assert(row.ref === qa.REF.preop, "ref stored");
assert(!row.id, "new row has no id");
assert(qa.readbackError(row, {
  form_type: row.form_type,
  form_date: row.form_date,
  status: row.status,
  operator: row.operator,
  reviewer: row.reviewer,
  machine: row.machine,
  result: row.result,
  ref: row.ref,
  reviewed_at: null,
  header: row.header,
  lines: row.lines
}) === "", "read-back match");
var mismatch = qa.readbackError(row, { form_type: "gmp", form_date: row.form_date, status: row.status, operator: row.operator, reviewer: "", machine: "", result: row.result, ref: row.ref, header: row.header, lines: row.lines });
assert(mismatch.indexOf("Read-back failed") === 0, "read-back mismatch " + mismatch);

["preop", "metal", "gmp", "pouch"].forEach(function (type) {
  var rec = type === "preop" ? good : type === "metal" ? metal : type === "gmp" ? gmp : pouch;
  rec.form_type = type;
  var html = qa.printHtml(rec);
  assert(html.indexOf("QUAL_FORM") < 0, "print hides form number " + type);
  assert(html.indexOf("Approved By: Quality Assurance Manager") >= 0, "print header " + type);
  assert(html.indexOf("Paper remains backup until QA confirms digital storage.") >= 0, "print banner " + type);
  assert(html.indexOf("Smackin' Snacks") >= 0, "print footer " + type);
  assert(html.indexOf("\u2014") < 0 && html.indexOf("\u2013") < 0, "print dashes " + type);
});
var preHtml = qa.printHtml(good);
assert(preHtml.indexOf("La instalación y el almacén están seguros") >= 0, "print keeps Spanish");
assert(preHtml.indexOf("The facility warehouse is secure") >= 0, "print keeps English");
var metalHtml = qa.printHtml(metal);
assert(metalHtml.indexOf("Fe 2.0") >= 0 && metalHtml.indexOf("NF 2.0") >= 0 && metalHtml.indexOf("316 SS 2.0") >= 0, "metal standards");
var gmpHtml = qa.printHtml(gmp);
assert(gmpHtml.indexOf("ADMIN_PRO_1.0") >= 0, "gmp policy cross ref");
assert(gmpHtml.indexOf("No jewelry") >= 0 && gmpHtml.indexOf("Hairnet is worn") >= 0, "gmp extras");
var pouchHtml = qa.printHtml(pouch);
assert(pouchHtml.indexOf("Seal OK") >= 0 && pouchHtml.indexOf("Film OK") >= 0 && pouchHtml.indexOf("Ranch") >= 0, "pouch fields");

var src = fs.readFileSync(path.join(__dirname, "..", "qa-checklists.js"), "utf8");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em or en dash in qa-checklists.js");
assert(src.indexOf("QUAL_FORM_11.0") >= 0 && src.indexOf("QUAL_FORM_21.0") >= 0, "ids kept in source");
assert(src.indexOf("qc_forms") >= 0, "uses qc_forms");
assert(src.indexOf("quality_logs") >= 0, "calls out quality_logs");
assert(src.toLowerCase().indexOf("ocr") >= 0, "ocr called out");
var homes = fs.readFileSync(path.join(__dirname, "..", "dept-homes.js"), "utf8");
assert(homes.indexOf("qacheck") >= 0 && homes.indexOf('fn: "qacheck"') >= 0, "dept home tool");
var sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert(sw.indexOf("smackin-inv-v264") >= 0 && sw.indexOf("./qa-checklists.js") >= 0, "cache bump");
assert(sw.indexOf("smackin-inv-v241") < 0, "old cache gone");
var html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(html.indexOf('src="qa-checklists.js?b=2"') >= 0, "index script");
var emptyDash = qa.completion([]);
assert(emptyDash.total === 0 && emptyDash.complete === 0, "empty total");
assert(emptyDash.byType.preop === 0 && emptyDash.byType.metal === 0 && emptyDash.byType.gmp === 0 && emptyDash.byType.pouch === 0, "empty types");
var dashRows = [
  { form_type: "preop", form_date: "2026-10-26", status: "complete" },
  { form_type: "preop", form_date: "2026-10-26", status: "draft" },
  { form_type: "metal", form_date: "2026-10-28", status: "complete" },
  { form_type: "gmp", form_date: "2026-10-28", status: "draft" },
  { form_type: "pouch", form_date: "2026-10-28", status: "complete" },
  { form_type: "other", form_date: "2026-10-28", status: "complete" }
];
var dash = qa.completion(dashRows);
assert(dash.total === 5 && dash.complete === 3, "known types only");
assert(dash.byType.preop === 2 && dash.completeByType.preop === 1, "preop split");
assert(dash.days[0].date === "2026-10-28" && dash.days[0].metal === 1 && dash.days[0].gmp === 1 && dash.days[0].pouch === 1, "newest day");
assert(dash.days[1].date === "2026-10-26" && dash.days[1].preop === 2, "older day");
assert(html.indexOf("qa-checklists.js") < html.indexOf("dept-homes.js"), "loads before dept homes");

var round = qa.hydrate(qa.toRow(good));
assert(round.lines[0].marks.mon === "pass" && round.header.day_meta.mon.time === "06:30", "hydrate keeps answers");
assert(round.lines.length === 10, "hydrate keeps tasks");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("qa-checklists checks ok");

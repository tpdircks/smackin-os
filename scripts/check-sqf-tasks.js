/* Check the SQF task seed and the filters against Monica's 2026-10-26 list. */
var fs = require("fs");
var path = require("path");
var sqf = require("../sqf-tasks.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

var csvPath = path.join(__dirname, "..", "sqf", "sqf_outstanding_items_2026-10-26.csv");
var text = fs.readFileSync(csvPath, "utf8");
var parsed = sqf.parseCsv(text);
var raw = sqf.raw();
var seed = sqf.seed();

assert(parsed.length === 77, "csv rows " + parsed.length);
assert(raw.length === 77, "embedded rows " + raw.length);
assert(JSON.stringify(parsed) === JSON.stringify(raw), "embedded rows differ from the csv");
assert(seed.length === 77, "seed rows " + seed.length);

var built = parsed.map(sqf.buildRow);
assert(JSON.stringify(built) === JSON.stringify(seed), "seed was not built from the csv");

var asOf = "2026-10-28";
var c = sqf.counts(seed, asOf);
assert(c.open === 67, "open " + c.open);
assert(c.past === 21, "past due " + c.past);
assert(c.in_progress === 2, "in progress " + c.in_progress);
assert(c.done === 8, "done " + c.done);
assert(c.total === 77, "total " + c.total);

var mods = { 2: 0, 11: 0 };
seed.forEach(function (r) { mods[r.module] = (mods[r.module] || 0) + 1; });
assert(mods[11] === 36, "module 11 " + mods[11]);
assert(mods[2] === 41, "module 2 " + mods[2]);

function row(clause) {
  for (var i = 0; i < seed.length; i++) if (seed[i].clause === clause) return seed[i];
  return null;
}

var walls = row("11.1.2.4");
assert(walls && walls.owners.join(",") === "Allen,Todd", "11.1.2.4 owners");
assert(walls && walls.section === "Facility" && walls.due_date === "2026-10-23" && walls.status === "open", "11.1.2.4 fields");
assert(sqf.isPastDue(walls, asOf) === true, "11.1.2.4 past due");

var ra = row("11.1.2.6");
assert(ra && ra.owners.join(",") === "Allen,Todd,Monica", "11.1.2.6 owners");
assert(ra && ra.due_date === "2026-10-31" && sqf.isPastDue(ra, asOf) === false, "11.1.2.6 not past due");

var slash = row("11.4.1.3");
assert(slash && slash.owners.join(",") === "Allen,Brittney,Monica", "backslash owners");
assert(slash && slash.owner_raw.indexOf("\\") >= 0, "owner_raw kept");

assert(row("11.5.1.4").owners.join(",") === "Michelle", "Michelle?");
assert(row("2.1.2.1").owners.join(",") === "All", "All");
assert(row("2.9.2.3").owners.join(",") === "Ken,Brittney", "Ken sentence");
assert(row("2.8.1.4").action_notes === "" && row("2.8.1.4").owners.join(",") === "Monica", "empty notes");
assert(row("11.2.5.1").section === "Sanitation", "section case");
assert(row("2.5.3.2").section === "CAPA", "CAPA");

assert(row("11.2.3.2").status === "done" && row("11.2.3.2").completed_date === null, "completed without a date");
assert(row("11.2.5.2").completed_date === "2026-10-16", "completed 10/16/26");
assert(row("11.4.1.1").completed_date === "2026-10-20", "10/20/26 completed");
assert(row("2.2.3.2").completed_date === "2026-10-21", "completed 10/21/26");
assert(row("2.9.2.1").completed_date === "2026-10-23" && row("2.9.2.1").status === "done", "training completed date");
assert(row("11.2.4.1").status === "in_progress" && row("11.2.4.1").due_date === null, "in process");

seed.forEach(function (r) {
  assert(r.source_file_id === sqf.SOURCE_FILE_ID, "source file " + r.clause);
  assert(r.updated_by === "sqf-import", "updated_by " + r.clause);
});

assert(sqf.parseOwners("Allen/Todd - complete; Monica to complete RA").join(",") === "Allen,Todd,Monica", "parse ra");
assert(sqf.parseOwners("Ken/Brittney\nKen is helping manage this project").join(",") === "Ken,Brittney", "parse ken");
assert(sqf.titleSection("management responsibility") === "Management Responsibility", "title section");
assert(sqf.titleSection("loading/unloading") === "Loading/Unloading", "slash section");
assert(sqf.moduleOf("2.3.2.10") === 2 && sqf.moduleOf("11.1.2.4") === 11, "module");
assert(c.undated === 41, "undated open " + c.undated);
assert(seed.filter(sqf.isUndatedOpen).length === 41, "undated helper");
var wallsBefore = walls.action_notes;
var wallsStatus = walls.status;
var selected = sqf.redatePlan(seed, ["11.1.2.4", "11.2.3.2"], "2027-01-31");
assert(selected.ok && selected.rows.length === 2, "selected redate count");
assert(selected.rows[0].status === "open" && selected.rows[0].action_notes === wallsBefore, "selected keeps notes and status");
assert(walls.due_date === "2026-10-23" && walls.status === wallsStatus && walls.action_notes === wallsBefore, "plan does not mutate the seed");
var openClauses = seed.filter(sqf.isOpenWork).map(function (r) { return r.clause; });
var allOpen = sqf.redatePlan(seed, openClauses, "2027-01-31");
assert(allOpen.rows.length === 69, "all open is not done " + allOpen.rows.length);
assert(allOpen.rows.every(function (r) { return r.due_date === "2027-01-31" && r.status !== "done"; }), "open rows keep status");
assert(sqf.redatePlan(seed, [], "2027-01-31").rows.length === 0, "empty selection");
assert(sqf.redatePlan(seed, ["11.1.2.4"], "Jan 2027").ok === false, "bad date rejected");
var payload = sqf.redatePayload("2027-01-31", "monica", "2026-10-30T00:00:00.000Z");
assert(Object.keys(payload).join(",") === "due_date,updated_by,updated_at", "payload is due date only");
var copy = JSON.parse(JSON.stringify(walls));
copy.owners = walls.owners.slice();
var stamped = sqf.applyDueOnly(copy, "2027-01-31", "ui", "2026-10-30T00:00:00.000Z");
assert(stamped.due_date === "2027-01-31" && stamped.status === "open" && stamped.action_notes === wallsBefore, "apply due only");

var AS30 = "2026-10-30";
var PAST_IDS = ["11.1.6.4", "11.1.7.6", "11.6.4.4", "11.6.4.5", "2.3.2.6", "11.1.7.2", "11.1.7.3", "11.1.7.5", "11.1.8.1", "11.2.1.6", "11.4.1.2", "11.4.1.3", "11.4.1.4", "11.1.5.1", "11.1.5.2", "11.1.2.4", "11.1.2.7", "11.1.2.8", "11.2.1.2", "11.6.4.2", "2.3.4.2"];
var past30 = sqf.filterRows(seed, { past: true }, AS30);
assert(past30.length === PAST_IDS.length, "oct 30 past due count " + past30.length);
PAST_IDS.forEach(function (id) {
  assert(past30.some(function (r) { return r.clause === id && r.status === "open"; }), "past due clause " + id);
});
var ordered = sqf.displaySort(seed, AS30);
var headIds = ordered.slice(0, PAST_IDS.length).map(function (r) { return r.clause; });
PAST_IDS.forEach(function (id) { assert(headIds.indexOf(id) >= 0, "past due sorts first " + id); });
assert(!sqf.isPastDue(ordered[PAST_IDS.length], AS30), "row after past due is not past due");
var mb = sqf.filterRows(seed, { owner: "mb" }, AS30);
assert(mb.length === 42, "monica or brittney open " + mb.length);
assert(mb.every(function (r) {
  return r.status !== "done" && ((r.owners || []).indexOf("Monica") >= 0 || (r.owners || []).indexOf("Brittney") >= 0);
}), "mb filter is open work for those owners");
var keptDates = {};
PAST_IDS.forEach(function (id) { keptDates[id] = row(id).due_date; });
var janPlan = sqf.redatePlan(seed, PAST_IDS, "2027-01-31");
assert(janPlan.rows.length === 21 && janPlan.rows.every(function (r) { return r.status === "open" && r.due_date === "2027-01-31"; }), "jan plan for the 21");
PAST_IDS.forEach(function (id) { assert(row(id).due_date === keptDates[id] && row(id).due_date !== "2027-01-31", "seed date unchanged " + id); });

var past = sqf.filterRows(seed, { past: true }, asOf);
assert(past.length === 21, "past filter " + past.length);
var monica = sqf.filterRows(seed, { owner: "Monica", module: "2" }, asOf);
assert(monica.length > 0 && monica.every(function (r) { return r.owners.indexOf("Monica") >= 0 && r.module === 2; }), "owner and module filter");

var src = fs.readFileSync(path.join(__dirname, "..", "sqf-tasks.js"), "utf8");
assert(src.indexOf("\u2014") < 0, "em dash in sqf-tasks.js");
var homes = fs.readFileSync(path.join(__dirname, "..", "dept-homes.js"), "utf8");
assert(homes.indexOf("sqftasks") >= 0 && homes.indexOf('fn: "sqf"') >= 0, "dept home tool");
var sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert(sw.indexOf('smackin-inv-v264') >= 0 && sw.indexOf("./sqf-tasks.js") >= 0, "cache bump");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok", seed.length, "open", c.open, "past", c.past, "progress", c.in_progress, "done", c.done);

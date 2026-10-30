/* Reader contract for the Daily Fulfillment Gusto roster. No network. */
var fs = require("fs");
var path = require("path");
var roster = require("../gusto-roster.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

var ful = { first_name: "Jesus", last_name: "Arias", department: "Fulfillment", department_uuid: "dept-ful", terminated: false };
var preferred = { preferred_first_name: "Lenny", first_name: "Leonardo", last_name: "Hernandez", department: "Fulfillment", terminated: false };
var ship = { first_name: "Ken", last_name: "Tschanz", department: "Shipping", department_uuid: "dept-ship", terminated: false };
var ops = { first_name: "Adri", last_name: "De Camargo", department: "Operations", terminated: false };
var gone = { first_name: "Former", last_name: "Person", department: "Fulfillment", terminated: true };
var termActive = { first_name: "Leaving", last_name: "Soon", department: "Fulfillment", terminated: false, terminations: [{ active: true }] };
var blank = { first_name: " ", last_name: "", department: "Fulfillment", terminated: false };
var dup = { first_name: "jesus", last_name: "arias", department: " fulfillment ", terminated: false };

var names = roster.fulfillmentNames([ful, preferred, ship, ops, gone, termActive, blank, dup]);
assert(names.join("|") === "Jesus Arias|Lenny Hernandez", "fulfillment only, active, preferred name, deduped: " + names.join("|"));
assert(names.indexOf("Ken Tschanz") < 0, "shipping excluded");
assert(names.indexOf("Adri De Camargo") < 0, "operations excluded");

var byUuid = roster.fulfillmentNames([
  { first_name: "A", last_name: "One", department: "Warehouse", department_uuid: "dept-ful" },
  { first_name: "B", last_name: "Two", department: "Fulfillment", department_uuid: "other" }
], { departmentUuid: "dept-ful" });
assert(byUuid.join("|") === "A One", "uuid filter wins: " + byUuid.join("|"));

var payload = roster.rosterPayload([" Zuleika Tirado ", "zuleika tirado", "Marelis Castillo"], { synced_at: "2026-10-28T18:00:00.000Z" });
assert(payload.source === "gusto" && payload.department === "Fulfillment", "payload shape");
assert(payload.names.join("|") === "Marelis Castillo|Zuleika Tirado", "payload sorted unique: " + payload.names.join("|"));

var parsed = roster.parseRoster(JSON.stringify(payload));
assert(parsed && parsed.names.length === 2 && parsed.synced_at.indexOf("2026-10-28") === 0, "parse gusto json");
assert(roster.parseRoster({ source: "people", department: "Fulfillment", names: ["A"] }) === null, "reject hand list");
assert(roster.parseRoster({ source: "gusto", department: "Company", names: ["A"] }) === null, "reject whole company");
assert(roster.parseRoster({ source: "gusto", names: ["A"] }) === null, "reject missing department");
assert(roster.parseRoster({ source: "gusto", department: "Fulfillment", names: [] }) === null, "reject empty");
assert(roster.parseRoster("not-json") === null, "reject garbage");

var rows = roster.withHistorical(["Jesus Arias", "Lenny Hernandez"], "Former Person");
assert(rows.length === 3, "historical kept");
var hist = rows.filter(function (r) { return r.historical; });
assert(hist.length === 1 && hist[0].name === "Former Person", "historical flag");
assert(roster.withHistorical(["Jesus Arias"], "Jesus Arias").every(function (r) { return !r.historical; }), "current not historical");

var src = fs.readFileSync(path.join(__dirname, "..", "gusto-roster.js"), "utf8");
assert(src.indexOf("kvSet") < 0, "reader does not write kv");
assert(src.indexOf("fetch(") < 0, "reader does not call Gusto");
assert(src.indexOf("GUSTO_API_TOKEN") >= 0 && src.indexOf("sk_") < 0, "documents the secret name and stores no token");

var app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
var fn = app.split("function fdEmployeeList()")[1].split("function ")[0];
assert(fn.indexOf("GUSTO_ROSTER") >= 0, "dropdown reads gusto roster");
assert(fn.indexOf("Shipping") < 0 && fn.indexOf("Operations") < 0, "dropdown helper is not company-wide");
assert(app.indexOf('p.d === "Fulfillment"') >= 0, "directory fallback is Fulfillment");
assert(app.indexOf("fdNotOnTeam") >= 0 && app.indexOf("fdRosterWait") >= 0, "copy for waiting and past names");
assert(app.indexOf("Manage team") < 0, "no manage-team editor");

var html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(html.indexOf('src="gusto-roster.js?b=1"') >= 0, "script tagged");
assert(html.indexOf("gusto-roster.js") < html.indexOf("app.js?b="), "roster script loads before app");

var sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert(sw.indexOf('const CACHE = "smackin-inv-v249"') >= 0, "cache v249");
assert(sw.indexOf("./gusto-roster.js") >= 0, "service worker lists roster script");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("gusto roster checks passed");

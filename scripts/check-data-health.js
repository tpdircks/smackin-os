"use strict";
const fs=require("fs"), vm=require("vm"),assert=require("assert/strict"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"..","data-health.js"),"utf8");
const a=src.indexOf("  function isTestRow("),b=src.indexOf("  function esc(",a);
assert.ok(a>=0&&b>a);
const c={assert,document:{readyState:"loading",addEventListener(){},createElement(){return {id:""}},getElementById(){return null}},MutationObserver:function(){return {observe(){}}}};
c.window=c;c.SMACKIN_CONFIG={};c.supabase={};
vm.createContext(c);vm.runInContext(src,c);
const api=c.DATAHEALTH && c.DATAHEALTH.forTest;
assert.ok(api,"ship a small documented regression surface, not a brittle helper-slicing test");
const rows=[
 {po:"T-1",partner:"Target",status:"Open",due_date:"10/26/2026",batch_id:"SHIP-1"},
 {po:"T-1",partner:"Target",status:"Open",due_date:"10/26/2026",batch_id:"SHIP-1"},
 {po:"K-1",partner:"Kroger",status:"Open",due_date:"11/03/2026",batch_id:"SHIP-2"},
 {po:"test",partner:"does-not-count",status:"Test",due_date:"09/01/2026",batch_id:"SPS-TEST"},
 {po:"T-FUTURE",partner:"Target",status:"Open",due_date:"11/26/2026"}
];
assert.equal(api.isTestRow(rows[3]),true);assert.equal(api.isTestRow(rows[0]),false);
var stuck=api.stuckSummary(rows,+new Date("2026-11-06T12:00:00"));
assert.equal(stuck.pos,2);assert.equal(stuck.lines,3);
assert.equal(stuck.list.map(function(g){return g.po;}).sort().join(","),"K-1,T-1");
assert.ok(src.includes("Past-due open demand"),"past-due panel names the POs");
assert.ok(src.includes("does not close them"),"past-due panel does not autoclose");
assert.equal(src.includes('col: "due_date"'),false,"due dates must not masquerade as import freshness");
assert.equal(src.includes('col: "ship_date"'),true,"business shipping date is distinct from backend sync heartbeat");
const app=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
assert.ok(app.includes('plural(overduePOs, "open PO")'));assert.ok(app.includes('"DC/flavor lines"')||src.includes("DC/flavor lines"));
const d=fs.readFileSync(path.join(__dirname,"..","demand-close-cleanup.js"),"utf8");
assert.equal(d.includes(".update("),false,"review module cannot write demand Shipped from age alone");
const plan=require(path.join(__dirname,"..","inv-lot-plan.js"));
const holds=plan.openHolds();
const notes=plan.openNotes();
assert.ok(holds.some(h=>/pallet 8/.test(h.reason)&&h.sheet===2880),"pallet 8 hold stays open");
assert.ok(holds.some(h=>/Oct 15/.test(h.reason)&&h.sheet===15408),"Oct 15 receipt hold stays open");
assert.ok(notes.some(n=>/not a pallet ledger/.test(n.reason)&&/7,920/.test(n.reason)&&/68,160/.test(n.reason)&&/3,600/.test(n.reason)),"stale dollar tree stock is a note");
assert.ok(notes.some(n=>/not a fully reconciled lot trace/.test(n.reason)&&/2027-10-08/.test(n.reason)&&/2027-10-09/.test(n.reason)),"H26281 expiry caveat");
assert.ok(src.includes("Open exceptions")&&src.includes("planned.notes"),"data health renders the open notes");
assert.equal(src.includes("dollar_tree_finished_goods"),false,"data health does not write the pallet ledger");

const missing = api.missingPmacDays;
assert.ok(missing && api.prettyPmacDate, "missing P-Mac day helpers are exported");
assert.equal(api.prettyPmacDate("2026-11-04"), "Wed Nov 4, 2026");
assert.equal(api.prettyPmacDate("2026-11-06"), "Fri Nov 6, 2026");
const present = {
  "2026-10-19": 1, "2026-10-20": 1, "2026-10-21": 1, "2026-10-22": 1, "2026-10-23": 1,
  "2026-10-26": 1, "2026-10-27": 1, "2026-10-28": 1, "2026-10-29": 1, "2026-10-30": 1,
  "2026-11-02": 1, "2026-11-03": 1, "2026-11-05": 1
};
const monMorning = new Date("2026-11-09T08:20:00-07:00");
const flagged = missing({ present: present, now: monMorning, start: "2026-10-10" });
assert.ok(flagged.indexOf("2026-11-04") >= 0, "Nov 4 flags Monday morning");
assert.ok(flagged.indexOf("2026-11-06") >= 0, "Nov 6 flags Monday morning");
assert.ok(flagged.indexOf("2026-11-09") < 0, "today is not flagged before its next-day 3 PM cutoff");
assert.ok(flagged.indexOf("2026-10-16") >= 0, "other weekday gaps in the window also flag");
const thuBefore = missing({ present: present, now: new Date("2026-11-05T14:59:00-07:00"), start: "2026-10-10" });
assert.ok(thuBefore.indexOf("2026-11-04") < 0, "Nov 4 waits until 3 PM the next day");
const thuAfter = missing({ present: present, now: new Date("2026-11-05T15:00:00-07:00"), start: "2026-10-10" });
assert.ok(thuAfter.indexOf("2026-11-04") >= 0, "Nov 4 flags at 3 PM Thursday");
const satBefore = missing({ present: present, now: new Date("2026-11-07T14:59:00-07:00"), start: "2026-10-10" });
assert.ok(satBefore.indexOf("2026-11-06") < 0, "Nov 6 waits until 3 PM Saturday");
const satAfter = missing({ present: present, now: new Date("2026-11-07T15:00:00-07:00"), start: "2026-10-10" });
assert.ok(satAfter.indexOf("2026-11-06") >= 0, "Nov 6 flags at 3 PM Saturday");
const hol = missing({ present: {}, now: new Date("2026-11-27T12:00:00-07:00"), start: "2026-11-25", holidays: { "2026-11-26": 1 } });
assert.ok(hol.indexOf("2026-11-26") < 0, "company holidays are not flagged");
assert.equal(src.includes("No P-Mac production rows for"), true, "red line copy");
assert.equal(src.includes("ex bad"), true, "red exception style");
assert.equal(src.includes("\u2014"), false, "data health has no em dash");
assert.equal(src.includes('col: "created_at", label: "Trace events"'), false, "trace probe is not created_at");
assert.ok(src.includes('{ t: "trace_events", col: "ts", label: "Trace events"'), "trace probe uses ts");
assert.ok(src.includes('label: "Shipping business dates", warn: 3, bad: 7, business: true, skipTest: true'), "shipping is 3/7 business days");
assert.ok(src.includes('.neq("status", "Test")'), "shipping freshness skips Test rows");
["fulfillment_daily","production_days","production_pallets","wip_production_daily","demand_forecast","machine_live","qc_forms"].forEach(function(t){
  assert.ok(src.includes('t: "' + t + '"'), "freshness row " + t);
});
assert.ok(src.includes('label: "Mixing tracker", warn: 5, bad: 12'), "mixing thresholds unchanged");
assert.ok(src.includes('label: "WIP daily units", warn: 5, bad: 12'), "wip thresholds unchanged");
assert.ok(src.includes('label: "WOS forecast", warn: 30, bad: 60'), "forecast thresholds unchanged");
assert.ok(src.includes('label: "Live machine feed", warn: 14, bad: 30'), "machine live thresholds unchanged");
assert.ok(src.includes('label: "QC forms", warn: 2, bad: 4, business: true'), "qc forms cadence");
var pausedKeys = Object.keys(api.PAUSED_FEEDS).sort();
assert.deepEqual(pausedKeys, ["demand_forecast","machine_live","mixing_history","qc_forms"]);
pausedKeys.forEach(function (k) {
  var entry = api.PAUSED_FEEDS[k];
  assert.equal(entry.key, k, "paused key " + k);
  assert.equal(entry.owner, "Troy Dircks", "owner " + k);
  assert.ok(entry.reason, "reason " + k);
});
assert.equal(api.PAUSED_FEEDS.mixing_history.asOf, "2026-09-29");
assert.equal(api.PAUSED_FEEDS.machine_live.asOf, "2026-09-09");
assert.equal(api.PAUSED_FEEDS.demand_forecast.asOf, "2026-07-17");
assert.equal(api.PAUSED_FEEDS.qc_forms.asOf, "");
var asOf = new Date("2026-11-10T16:00:00-07:00");
function srcOf(table){ return api.sources.filter(function(s){ return s.t === table; })[0]; }
function feed(table, iso, count){
  var srcRow = srcOf(table);
  var n = count == null ? 10 : count;
  var days = api.ageOf(iso, srcRow, asOf);
  return { src: srcRow, latest: iso, count: n, days: days, st: api.statusOf(days, srcRow, n, iso) };
}
function stale(table, iso, count){ return feed(table, iso, count).st.cls; }
assert.equal(stale("mixing_history","2026-09-29"), "grey", "mixing Sep 29 is paused");
assert.equal(feed("mixing_history","2026-09-29").st.txt, "Paused");
assert.equal(feed("mixing_history","2026-09-29").st.owner, "Troy Dircks");
assert.equal(feed("mixing_history","2026-09-29").st.when, "Sep 29, 2026");
assert.equal(stale("wip_production_daily","2026-09-28"), "red", "wip Sep 28 is still stale");
assert.equal(stale("demand_forecast","2026-07-16"), "grey", "forecast on or before Jul 17 stays paused");
assert.equal(stale("demand_forecast","2026-07-17"), "grey", "forecast Jul 17 is paused");
assert.equal(feed("demand_forecast","2026-07-17").st.when, "Jul 17, 2026");
assert.equal(stale("machine_live","2026-09-09"), "grey", "machine live Sep 9 is paused");
assert.equal(feed("machine_live","2026-09-09").st.when, "Sep 9, 2026");
assert.equal(feed("qc_forms", null, 0).st.txt, "Paused");
assert.equal(feed("qc_forms", null, 0).st.when, "never used");
assert.equal(stale("shipping_log","2026-10-23"), "red", "shipping Oct 23 is past 7 business days");
assert.equal(api.businessDaysAgo("2026-10-23", asOf) >= 7, true, "Oct 23 to Nov 10 is at least 7 business days");
assert.equal(stale("fulfillment_daily","2026-11-09"), "green", "fulfillment through Monday is fresh on Tuesday");
var orders = { t: "orders", label: "Orders", warn: 4, bad: 9 };
assert.equal(api.statusOf(null, orders, 0, null).txt, "no data yet", "empty feeds that are not paused stay no data yet");
assert.equal(api.statusOf(api.ageOf("2026-10-01", orders, asOf), orders, 3, "2026-10-01").cls, "red", "orders threshold unchanged");
assert.equal(api.statusOf(null, srcOf("mixing_history"), null, null).txt, "could not read", "a failed read is not hidden as paused");
var revived = feed("mixing_history","2026-09-30");
assert.equal(revived.st.paused, false, "newer mixing data leaves the pause");
assert.equal(revived.st.cls, "red", "newer mixing data uses the same stale rule");
assert.equal(revived.st.note, "new data while paused");
var revivedLive = feed("machine_live","2026-09-10");
assert.equal(revivedLive.st.note, "new data while paused");
assert.equal(revivedLive.st.cls, "red");
var revivedFc = feed("demand_forecast","2026-07-18");
assert.equal(revivedFc.st.note, "new data while paused");
assert.equal(revivedFc.st.paused, false);
var revivedQc = feed("qc_forms","2026-11-10", 1);
assert.equal(revivedQc.st.paused, false, "a first QC form leaves the pause");
assert.equal(revivedQc.st.cls, "green");
assert.equal(revivedQc.st.note, "new data while paused");
var mixRow = api.renderRow(feed("mixing_history","2026-09-29"));
assert.ok(mixRow.indexOf('class="dh-paused"') >= 0, "paused row is grey");
assert.ok(mixRow.indexOf("dh-pill grey") >= 0 && mixRow.indexOf(">Paused<") >= 0, "Paused label");
assert.ok(mixRow.indexOf("Troy Dircks") >= 0 && mixRow.indexOf("Sep 29, 2026") >= 0, "owner and last data");
assert.ok(mixRow.indexOf("dh-red") < 0, "paused mixing is not red");
var qcRow = api.renderRow(feed("qc_forms", null, 0));
assert.ok(qcRow.indexOf("never used") >= 0 && qcRow.indexOf("Troy Dircks") >= 0 && qcRow.indexOf(">Paused<") >= 0, "qc forms never used");
var newRow = api.renderRow(revived);
assert.ok(newRow.indexOf("dh-paused") < 0 && newRow.indexOf("new data while paused") >= 0, "new data is flagged and active");
var saved = api.PAUSED_FEEDS.mixing_history;
delete api.PAUSED_FEEDS.mixing_history;
assert.equal(stale("mixing_history","2026-09-29"), "red", "removing the map entry counts mixing again");
api.PAUSED_FEEDS.mixing_history = saved;
assert.equal(stale("mixing_history","2026-09-29"), "grey", "restored entry pauses mixing");
var sample = ["mixing_history","machine_live","demand_forecast","qc_forms","wip_production_daily","shipping_log","fulfillment_daily"].map(function (t) {
  if (t === "qc_forms") return feed(t, null, 0);
  if (t === "mixing_history") return feed(t, "2026-09-29");
  if (t === "machine_live") return feed(t, "2026-09-09");
  if (t === "demand_forecast") return feed(t, "2026-07-17");
  if (t === "wip_production_daily") return feed(t, "2026-09-28");
  if (t === "shipping_log") return feed(t, "2026-10-23");
  return feed(t, "2026-11-09");
});
var totals = api.tally(sample);
assert.equal(totals.paused, 4, "four paused feeds");
assert.equal(totals.reds, 2, "paused feeds are not in the stale count");
assert.equal(totals.ambers, 0);
var sum = api.summaryHtml(totals);
assert.ok(sum.indexOf("2 stale") >= 0 && sum.indexOf("4 paused") >= 0, "summary names stale and paused separately");
assert.ok(sum.indexOf("6 stale") < 0 && sum.indexOf("All sources current") < 0);
var quiet = api.summaryHtml({ reds: 0, ambers: 0, paused: 4 });
assert.ok(quiet.indexOf("All sources current") >= 0 && quiet.indexOf("4 paused") >= 0 && quiet.indexOf("stale") < 0);
assert.equal(src.includes("\u2014"), false, "data health has no em dash");
assert.ok(src.indexOf("new data while paused") >= 0, "new data copy");
var sps = fs.readFileSync(path.join(__dirname,"..","supabase/functions/sps-sync/index.js"),"utf8");
assert.ok(sps.includes('Deno.env.get("SPS_FOLDER") || "testout"'), "SPS_FOLDER stays testout");
console.log("data health + PO grouping test: 2 POs / 3 lines; no testout; no age-close source; business/import timestamps explicit");

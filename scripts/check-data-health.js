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
["fulfillment_daily","production_days","production_pallets","wip_production_daily","demand_forecast","machine_live"].forEach(function(t){
  assert.ok(src.includes('t: "' + t + '"'), "freshness row " + t);
});
var asOf = new Date("2026-11-10T16:00:00-07:00");
function srcOf(table){ return api.sources.filter(function(s){ return s.t === table; })[0]; }
function stale(table, iso){
  var srcRow = srcOf(table);
  return api.statusOf(api.ageOf(iso, srcRow, asOf), srcRow, 10).cls;
}
assert.equal(stale("mixing_history","2026-09-29"), "red", "mixing Sep 29 is stale");
assert.equal(stale("wip_production_daily","2026-09-28"), "red", "wip Sep 28 is stale");
assert.equal(stale("demand_forecast","2026-07-16"), "red", "forecast July is stale");
assert.equal(stale("machine_live","2026-09-09"), "red", "machine live Sep 9 is stale");
assert.equal(stale("shipping_log","2026-10-23"), "red", "shipping Oct 23 is past 7 business days");
assert.equal(api.businessDaysAgo("2026-10-23", asOf) >= 7, true, "Oct 23 to Nov 10 is at least 7 business days");
assert.equal(stale("fulfillment_daily","2026-11-09"), "green", "fulfillment through Monday is fresh on Tuesday");
console.log("data health + PO grouping test: 2 POs / 3 lines; no testout; no age-close source; business/import timestamps explicit");

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
assert.equal(JSON.stringify(api.stuckSummary(rows,+new Date("2026-11-06T12:00:00"))),JSON.stringify({pos:2,lines:3}));
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
console.log("data health + PO grouping test: 2 POs / 3 lines; no testout; no age-close source; business/import timestamps explicit");

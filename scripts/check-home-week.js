#!/usr/bin/env node
/* v323 Home > This week (home-week.js). No browser, no network.
   Week math, the five top numbers, retail priorities, no past-due, wiring. */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

var src = read("home-week.js");
var HW = require(path.join(root, "home-week.js"));
var F = HW.forTest;
var T = "2026-11-24"; // Tuesday

// week math (Mon to Sun)
eq(F.weekStart("2026-11-24") === "2026-11-23" && F.weekStart("2026-11-23") === "2026-11-23" && F.weekStart("2026-11-29") === "2026-11-23" && F.weekStart("2026-11-30") === "2026-11-30", "week runs Monday to Sunday");
eq(F.dayOfTs("2026-11-24T03:00:00Z") === "2026-11-23", "timestamps use the Denver day");

function ship(n, day, sync, status) { var a = []; for (var i = 0; i < n; i++) a.push({ id: day + sync + status + i, ship_date: day, entered_by: sync ? "sync:shipstation" : "Jesus", status: status, po_num: sync ? "" : "PO-" + i }); return a; }
var raw = {
  mfg: [],
  mixing: [],
  pmac: [{ run_date: "2026-11-16", dept: "P-Mac", total_pkgs: 3000 }, { run_date: "2026-11-16", dept: "P.Mac", total_pkgs: 4000 }, { run_date: "2026-11-16", dept: "Mixing", total_pkgs: 3600 }, { run_date: "2026-11-17", dept: "P-Mac", total_pkgs: 6800 }],
  pallets: [
    { prod_date: "2026-11-23", channel: "retail", cases: 80, notes: "TARGET" }, { prod_date: "2026-11-23", channel: "retail", cases: 232, notes: "MASTER" },
    { prod_date: "2026-11-23", channel: "retail", cases: 999, notes: "MINI BUCKETS" }, { prod_date: "2026-11-23", channel: "ecom", cases: 50, notes: "" },
    { prod_date: "2026-11-16", channel: "retail", cases: 93, notes: "MASTER" }
  ],
  days: [{ prod_date: "2026-11-23", counter_start: 100, counter_end: 1661 }],
  ship: [].concat(ship(1100, "2026-11-23", true, "shipped"), ship(300, "2026-11-23", true, "awaiting_shipment"), ship(29, "2026-11-23", true, "on_hold"), ship(2049, "2026-11-16", true, "shipped"), ship(2, "2026-11-24", false, "")),
  sps: [{ doc_type: "856 Ship Notice", po_number: "PO-0", received_at: "2026-11-24T18:00:00Z" }, { doc_type: "850 Purchase Order", po_number: "X", received_at: "2026-11-24T18:00:00Z" }],
  latest: { mixing: "2026-09-29", pmac: "2026-11-17", pallets: "2026-11-23", ecom: "2026-11-23", teamShip: "2026-11-24", sps856: "2026-11-24" }
};
var m = F.buildModel(raw, T);
eq(m.weekStart === "2026-11-23" && m.weekEnd === "2026-11-29", "this week is Mon 11/23 to Sun 11/29");
eq(m.made.mixing.s.rows === 0 && m.made.mixing.tone === "mute" && m.made.mixing.latest === "2026-09-29", "Mixing: no rows this week, shows latest date, no number invented");
eq(m.made.pmac.s.rows === 0 && m.made.pmac.s.wtd === 0 && m.made.pmac.tone === "warn" && m.made.pmac.s.prev[0] === 7000, "P-Mac: P-Mac and P.Mac depts only, none this week = amber");
eq(m.made.retail.s.wtd === 312 && m.made.retail.unit === "cases" && m.made.retail.s.prevSame === 93, "Retail Production: retail cases, no mini buckets, no e-com");
eq(m.made.retail.detector.wtd === 1561, "metal detector boxes shown as a side line");
eq(m.out.ecom.s.wtd === 1100 && m.out.ecom.s.values[0] === 1100 && m.out.ecom.s.prevSame === 2049, "E-com: only ShipStation rows marked shipped");
eq(m.out.retail.s.wtd === 2 && m.out.retail.s.values[1] === 2, "Retail out: team rows + SPS 856, one per PO per day");
eq(m.out.ecom.tone === "warn", "E-com 54% of last week = amber");

// priorities
var praw = {
  demand: [
    { partner: "Target", po: "10002181608-0554", cases: 300, bags: 1, due_date: "11/23/2026", status: "Open" },
    { partner: "Target", po: "10002181608-0587", cases: 315, bags: 1, due_date: "11/23/2026", status: "Open" },
    { partner: "Target", po: "10002099999-0554", cases: 10, bags: 1, due_date: "11/16/2026", status: "Open" },
    { partner: "KeHE", po: "4022836", cases: 430, bags: 30960, due_date: "11/23/2026", status: "Open" },
    { partner: "KeHE", po: "4028646", cases: 15, bags: 1080, due_date: "11/30/2026", status: "Open" },
    { partner: "Bass Pro", po: "15006058", cases: 44, bags: 3168, due_date: "11/26/2026", status: "Open" },
    { partner: "Core-Mark", po: "0233157210", cases: 25, bags: 1800, due_date: "11/25/2026", status: "Open" },
    { partner: "Newco", po: "N1", cases: 5, bags: 5, due_date: "", status: "Open" },
    { partner: "Vistar", po: "88756956", cases: 50, bags: 3600, due_date: "11/30/2026", status: "Shipped" }
  ],
  orders: [
    { customer: "Target", customer_po: "10002181608-0554", ship_date: "ship 11/23/2026 - 11/24/2026", status: "Open" },
    { customer: "Target", customer_po: "10002168838-0554", ship_date: "ship 11/16/2026 - 11/17/2026", status: "Complete" },
    { customer: "KeHE Distributors", customer_po: "4028646", ship_date: "Nov 17, 2026", status: "Complete" },
    { customer: "Thrifty Retail Services", customer_po: "PO 174676", ship_date: "", status: "Open", stripe_link: "x", notes: "", created_at: "2026-11-20T19:00:00Z" },
    { customer: "Thrifty Retail Services", customer_po: "PO 174676", ship_date: "", status: "Open", notes: "Ship by delivery 12.2.2026", created_at: "2026-11-20T18:00:00Z" },
    { customer: "Old WIP", customer_po: "PO 1", ship_date: "", status: "Open", stripe_link: "x", created_at: "2026-10-01T00:00:00Z" }
  ],
  stage: [{ partner: "Bass Pro", po: "15006058" }],
  palletsLong: [{ prod_date: "2026-11-17", cases: 500, notes: "TARGET" }, { prod_date: "2026-11-20", cases: 301, notes: "TARGET" }, { prod_date: "2026-11-23", cases: 129, notes: "TARGET" }, { prod_date: "2026-11-23", cases: 400, notes: "MASTER" }]
};
var P = F.buildPriorities(praw, T);
var keys = P.rows.map(function (r) { return r.key; });
eq(keys[0] === "10002181608", "rank 1 is the email's #1 (Target 10002181608), window ends today");
eq(keys.indexOf("4022836") < 0 && P.hidden.pastDue.indexOf("4022836") >= 0, "past-due KeHE 4022836 is hidden");
eq(keys.indexOf("10002099999") < 0, "Target PO older than this week is hidden");
eq(keys.indexOf("4028646") < 0, "PO green on the WIP PO tab (Complete) drops off");
eq(keys.indexOf("88756956") < 0, "PO no longer Open in SPS drops off");
eq(keys.indexOf("OLD WIP") < 0 && keys.join(",").indexOf("1") >= 0, "stale WIP rows (over 14 days, not on the list) are hidden");
eq(keys.indexOf("0233157210") === 1, "new PO slotted by ship date before later list rows");
eq(keys[keys.length - 1] === "N1" || keys.indexOf("N1") > keys.indexOf("15006058"), "new undated PO goes last among new rows");
var tgt = P.rows[0];
eq(tgt.cases === 615 && tgt.prog.kind === "target" && tgt.prog.got === 430 && P.targetFrom === "2026-11-18", "Target progress = TARGET cases since the day after the last Target load (430 of 615)");
var bp = P.rows.filter(function (r) { return r.key === "15006058"; })[0];
eq(bp && bp.prog.kind === "staged", "staged PO shows as built");
var cm = P.rows.filter(function (r) { return r.key === "0233157210"; })[0];
eq(cm.prog.kind === "none" && cm.isNew, "no progress data = not started / no data, never guessed");
var th = P.rows.filter(function (r) { return r.key === "174676"; })[0];
eq(th && th.kind === "wip" && th.due === "2026-12-02" && th.customer === "Thrifty Retail Services", "WIP PO tab order shows with its delivery date");

// v324: drop rules for invoiced POs
eq(F.poKey("PO - #177505 ") === "177505" && F.poKey("PO - 000258") === "000258" && F.poKey("PO 174676") === "174676" && F.poKey("10002181608-0554") === "10002181608", "poKey reads PO - #nnn and PO - nnn formats");
function pr2(extra) { var r = JSON.parse(JSON.stringify(praw)); Object.keys(extra).forEach(function (k) { r[k] = (r[k] || []).concat(extra[k]); }); return F.buildPriorities(r, T); }
var thOpen = { orders: [{ customer: "Thrifty Retail Services", customer_po: "PO 174676", order_id: "HEGLKTVY-0020", status: "Open", stripe_link: "x", created_at: "2026-11-24T16:10:00Z" }] };
eq(pr2(thOpen).rows.some(function (r) { return r.key === "174676"; }), "Thrifty shows while its WIP row is Open");
var P2 = pr2({ orders: thOpen.orders.concat([{ customer: "Thrifty Retail Services", customer_po: "PO 174676", order_id: "HEGLKTVY-0020", status: "Complete", stripe_link: "x", created_at: "2026-11-24T18:10:00Z" }]) });
eq(!P2.rows.some(function (r) { return r.key === "174676"; }) && P2.hidden.invoiced.indexOf("174676") >= 0, "Thrifty drops when a Complete (green) WIP row lands, even with older Open copies");
var sdOpen = { customer: "Sidelines Sports", customer_po: "PO - 000258", order_id: "FA714FB8-0023", status: "Open", stripe_link: "x", notes: "WILL CALL PICK UP", created_at: "2026-11-24T13:10:00Z" };
eq(pr2({ orders: [sdOpen] }).rows.some(function (r) { return r.key === "P000258"; }), "Sidelines (list P000258, sheet PO - 000258) shows while Open");
var sdDone = JSON.parse(JSON.stringify(sdOpen)); sdDone.status = "Complete"; sdDone.customer_po = "PO - 000258";
eq(!pr2({ orders: [sdOpen, sdDone] }).rows.some(function (r) { return r.key === "P000258"; }), "Sidelines drops when green: PO - 000258 matches list P000258");
var sdInv = JSON.parse(JSON.stringify(sdOpen)); sdInv.status = "Complete"; sdInv.customer_po = "";
eq(!pr2({ orders: [sdOpen, sdInv] }).rows.some(function (r) { return r.key === "P000258"; }), "WIP order drops by its Stripe invoice # when the PO cell is blank");
var P3 = pr2({ invoices: [{ doc_type: "810 Invoice", po_number: "15006058", received_at: "2026-11-24T15:00:00Z" }] });
eq(!P3.rows.some(function (r) { return r.key === "15006058"; }) && P3.hidden.sps810.indexOf("15006058") >= 0, "SPS 810 invoice drops the PO from Home (display only)");
var P4 = pr2({ invoices: [{ doc_type: "850 Purchase Order", po_number: "15006058" }] });
eq(P4.rows.some(function (r) { return r.key === "15006058"; }), "an 850 alone does not drop a PO");
var P5 = pr2({ orders: thOpen.orders, hide: [{ key: "home:priorities:hide", value: JSON.stringify(["PO 174676", "10002181608"]) }] });
eq(!P5.rows.some(function (r) { return r.key === "174676" || r.key === "10002181608"; }) && P5.hidden.manual.length === 2, "kv home:priorities:hide removes POs with a data change");
var P6 = pr2({ orders: thOpen.orders, hide: [{ key: "home:priorities:hide", value: "not json" }] });
eq(P6.rows.some(function (r) { return r.key === "174676"; }), "bad hide value is ignored, nothing hidden");
eq(src.indexOf('fetchKv("home:priorities:hide")') > 0 && /like\("doc_type", "810%"\)/.test(src), "Home reads the hide list and SPS 810s");

// rendering (EN and ES) via a tiny DOM stub
function render(langEs) {
  var cls = { contains: function (c) { return c === "active"; } };
  var docStub = {
    getElementById: function (id) { if (id === "lang-es" && langEs) return { classList: cls }; return null; },
    addEventListener: function () {}, createElement: function () { return {}; }, head: { appendChild: function () {} }
  };
  var win = { document: docStub, DB: { items: function () { return []; }, demandLines: function () { return []; }, receivingLog: function () { return []; } } };
  var sb = { window: win, document: docStub, Intl: Intl, Date: Date, Math: Math, console: console };
  vm.runInNewContext(read("smk-viz.js"), sb);
  vm.runInNewContext(src, sb);
  var all = JSON.parse(JSON.stringify(raw));
  Object.keys(praw).forEach(function (k) { all[k] = praw[k]; });
  win.HOME_WEEK.inject(all, T);
  return win.HOME_WEEK.top() + win.HOME_WEEK.below();
}
var en = render(false), es = render(true);
var order = ["Mixing", "P-Mac", "Retail Production", "Retail", "E-commerce"].map(function (w) { return en.indexOf('<span class="hw-dot"></span>' + w + "</div>"); }).concat([en.indexOf("Retail order priorities")]);
eq(order.every(function (v, i) { return v >= 0 && (i === 0 || v > order[i - 1]); }), "Home order: Mixing, P-Mac, Retail Production, Retail out, E-com out, priorities (" + order.join(",") + ")");
eq(en.indexOf("No data yet") >= 0 && en.indexOf("Latest entry") >= 0, "no-data tiles say No data yet with the latest entry date");
eq(en.indexOf("New POs are slotted in by ship date") >= 0, "screen says how new POs are ranked");
eq(en.indexOf("Not started / no data") >= 0, "no progress shows Not started / no data");
eq(es.indexOf("Esta semana") >= 0 && es.indexOf("Mezcla") >= 0 && es.indexOf("Prioridades de ordenes retail") >= 0 && es.indexOf("Sin datos todavia") >= 0, "Spanish labels");
eq(/data-smk-go="mixing"/.test(en) && /data-smk-go="pmac"/.test(en) && /data-smk-go="outb:shipments"/.test(en), "tiles tap to their detail tabs");
eq(!/past.?due/i.test(en.replace(/Past-due (orders|POs) are not shown/g, "")), "no past-due rows on Home");
eq(/\u2014/.test(src) === false, "no em dashes in home-week.js");

// read only, no timers
eq(!/\.(insert|update|upsert|delete)\(/.test(src) && !/\.rpc\(/.test(src), "home-week.js never writes");
eq(src.indexOf("setInterval") < 0 && src.indexOf("setTimeout") < 0, "no timers in home-week.js");

// wiring
var html = read("index.html"), sw = read("service-worker.js"), home = read("simple-home.js");
eq(html.indexOf('src="home-week.js?b=2"') > 0 && html.indexOf('src="home-week.js?b=2"') < html.indexOf('src="simple-home.js?b=4"'), "home-week.js loads before simple-home.js");
eq(sw.indexOf('"./home-week.js"') > 0 && sw.indexOf('const CACHE = "smackin-inv-v326"') >= 0, "service worker caches home-week.js on v326");
var hh = home.slice(home.indexOf("function homeHtml()"), home.indexOf("function stepCard("));
eq(hh.indexOf('week("top") + week("below")') >= 0, "Home draws the week numbers");
eq(hh.indexOf("jobCard") < 0 && hh.indexOf("shm-roles") < 0 && hh.indexOf("W.hello") < 0, "Home has no job buttons, role picker or to-do list (v323b)");
eq(src.indexOf("dueNext7") < 0 && en.indexOf("Due in the next 7 days") < 0, "no due-next-7-days to-do card on Home");
eq(en.indexOf("hw-sbad") >= 0 && en.indexOf("Low or out") >= 0, "low/out stock shown as numbers");
var dh = read("dept-homes.js");
eq(dh.indexOf('home.subs = ["desk", "today", "daily", "board"]') >= 0 && dh.indexOf('tab("home", NL("Home", "Inicio", "Inicio"), "home", "desk", "", "desk today daily board")') >= 0, "Home subtabs: Big picture (default), Week, Daily numbers, TV board");

if (failed) { console.log(failed + " home-week check(s) failed"); process.exit(1); }
console.log("home-week ok");

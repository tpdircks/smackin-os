#!/usr/bin/env node
/* v322 visuals (smk-viz.js) and the new dashboard / nav wiring.
   Loads smk-viz.js in a stub sandbox with a fake DB. No browser, no network. */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }
var failed = 0;
function eq(ok, msg) { if (!ok) { failed++; console.log("FAIL: " + msg); } }

function denverDay(off) {
  var d = new Date(Date.now() + (off || 0) * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function mdy(iso) { var p = iso.split("-"); return (+p[1]) + "/" + (+p[2]) + "/" + p[0]; }
var T = denverDay(0), PAST = denverDay(-5), SOON = denverDay(3), WK3 = denverDay(16);

var items = [
  { id: "BAG4-S01", code: "B4-S01", name: "OG 4oz", flavor: "OG Original", category: "bag4", reorder: 1000 },
  { id: "BAG4-S02", code: "B4-S02", name: "Ranch 4oz", flavor: "Ranch", category: "bag4", reorder: 1000 },
  { id: "BAG15-S01", code: "B15-S01", name: "OG 1.5oz", flavor: "OG Original", category: "bag15", reorder: 0 },
  { id: "FILM4-S01", code: "F4-S01", name: "Film OG", flavor: "OG Original", category: "film4", reorder: 500 },
  { id: "SEAS-1", code: "SEAS-1", name: "Seas", flavor: "", category: "seasoning", reorder: 10 }
];
var stock = { "BAG4-S01": 5000, "BAG4-S02": 100, "BAG15-S01": 700, "FILM4-S01": 0, "SEAS-1": 50 };
var demand = [
  { status: "Open", flavor: "OG Original", bags: 2000, due_date: mdy(SOON), po: "A1" },
  { status: "Open", flavor: "Ranch", bags: 900, due_date: SOON, po: "A2" },
  { status: "Open", flavor: "Ranch", bags: 99999, due_date: mdy(PAST), po: "LATE1" },
  { status: "Open", flavor: "Ranch", bags: 400, due_date: mdy(WK3), po: "A3" },
  { status: "Open", flavor: "UNMAPPED: SEEDS", bags: 50, due_date: SOON, po: "A4" },
  { status: "Shipped", flavor: "OG Original", bags: 77777, due_date: SOON, po: "S1" },
  { status: "Open", flavor: "Cashews BBQ", bags: 72, due_date: SOON, po: "A5" }
];
var DB = {
  mode: "cloud",
  items: function () { return items; },
  onHand: function (id) { return stock[id] || 0; },
  demandLines: function () { return demand; },
  receivingLog: function () { return [{ recv_date: T }, { recv_date: T }, { recv_date: PAST }]; },
  shippingLog: function () { return [{ ship_date: T, entered_by: "Jesus" }, { ship_date: PAST, entered_by: "Jesus" }, { ship_date: T, entered_by: "sync:shipstation" }, { ship_date: T, entered_by: "sync:shipstation" }]; },
  stock: function () { return [{ updated_at: "2026-11-20T10:00:00Z" }]; }
};
var docStub = { getElementById: function () { return null; }, addEventListener: function () {}, createElement: function () { return {}; }, head: { appendChild: function () {} } };
var win = { DB: DB, document: docStub };
var sandbox = { window: win, document: docStub, Intl: Intl, Date: Date, Math: Math, console: console };
vm.runInNewContext(read("smk-viz.js"), sandbox);
// v323: P-Mac bags come from pmac_history through home-week.js (production_output is dead).
vm.runInNewContext(read("home-week.js"), sandbox);
win.HOME_WEEK.inject({ pmac: [{ run_date: T, dept: "P-Mac", total_pkgs: 1200 }, { run_date: T, dept: "Mixing", total_pkgs: 999 }], latest: { pmac: T } }, T);
var V = win.SMK_VIZ;
eq(!!(V && V.dashboard && V.homeStrip && V.inbound && V.outbound && V.inventory && V.production), "SMK_VIZ api");
var H = V._h;

// dates
eq(H.isoOf("11/3/2026") === "2026-11-03" && H.isoOf("2026-11-24T05:00:00Z") === "2026-11-24" && H.isoOf("12/7/26") === "2026-12-07", "isoOf formats");
eq(H.addDays("2026-12-31", 1) === "2027-01-01", "addDays crosses year");

// never show past-due demand
var od = H.openDemand();
eq(od.length === 5 && !od.some(function (d) { return d.po === "LATE1" || d.po === "S1"; }), "open demand drops past-due and closed lines");
var cv = H.coverage();
var ranch = cv.rows.filter(function (r) { return r.flavor === "Ranch"; })[0];
eq(ranch && ranch.need === 1300 && ranch.oh === 100 && ranch.short === 1200, "coverage: Ranch need 1300 (past-due excluded), on hand 100");
var og = cv.rows.filter(function (r) { return r.flavor === "OG Original"; })[0];
eq(og && og.oh === 5000 && og.short === 0, "coverage uses 4 oz bags only");
eq(cv.rows[0].flavor === "Ranch", "worst flavor first");
eq(cv.unmapped === 50, "unmapped bags counted, not charted");
eq(cv.noBag.length === 1 && cv.noBag[0] === "Cashews BBQ" && !cv.rows.some(function (r) { return /Cashew/.test(r.flavor); }), "flavors with no 4 oz bag item are listed, not drawn as 0");
var wk = H.demandByWeek(6);
eq(wk[0].bags === 3022 && wk[0].n === 4, "week 1 bags and POs");
eq(wk.reduce(function (s, w) { return s + w.bags; }, 0) === 3422, "6-week total excludes past-due");

// stock health: OK / Low / Out by reorder point
var h = H.stockHealth();
eq(h.ok === 2 && h.low === 1 && h.out === 1, "stock health ok/low/out " + JSON.stringify([h.ok, h.low, h.out]));

// per day
var rd = H.perDay(DB.receivingLog(), function (r) { return r.recv_date; }, null, 14);
eq(rd.length === 14 && rd[13].day === T && rd[13].v === 2 && rd[8].v === 1, "receiving per day");

// shipping: team-logged loads per day; ShipStation parcels only for today
var sd = H.shippedDaily(14);
eq(sd[13].v === 1 && sd[8].v === 1 && H.parcelsToday() === 2, "loads per day skip parcels; parcels today counted");

// drawing helpers
eq(/<svg[^>]*vz-spark/.test(H.sparkline([1, 3, 2])), "sparkline svg");
eq(/vz-cols/.test(H.columns([{ label: "a", v: 3 }])) && /No data/.test(H.columns([])), "columns svg and empty state");
eq(/150%|100%/.test(H.gauge(150, "x", "ok")) && /vz-gauge/.test(H.gauge(40, "x", "warn")), "gauge");
eq(/vz-donut/.test(H.donut([{ v: 1, tone: "ok", label: "a" }], "50%")), "donut");

// panels render with real-data labels
var dash = V.dashboard();
eq(dash.indexOf("Plant at a glance") >= 0 && dash.indexOf("Operational") >= 0 && / MT/.test(dash), "dashboard has title, Operational label and as-of time in MT");
eq(dash.indexOf("LATE1") < 0 && dash.indexOf("99,999") < 0 && dash.indexOf("99999") < 0, "dashboard never shows past-due demand");
eq((dash.match(/vz-tile /g) || []).length === 6, "dashboard has 6 status tiles");
eq(dash.indexOf("data-smk-go=\"inv:alerts\"") >= 0 && dash.indexOf("data-smk-go=\"demand:makeplan\"") >= 0, "tiles open their screens");
eq(/vz-gauge/.test(dash) && /vz-donut/.test(dash) && /vz-cols/.test(dash) && /vz-spark/.test(dash) && /vz-cmark/.test(dash), "dashboard has gauge, donut, columns, sparkline, coverage bars");
eq(dash.indexOf("—") < 0, "no em dash in dashboard copy");
eq(V.homeStrip("floor").indexOf("Today at a glance") >= 0 && V.homeStrip("") === "", "home strip by role, none before a role is picked");
var outM = { rows: [{ po: "P1", due: SOON, soon: false, late: false, release: { result: "RELEASED" }, shipped: null, docs: 1 }, { po: "OLD", due: PAST, late: true }] };
var ob = V.outbound(outM);
eq(ob.indexOf("1 / 1") >= 0 && ob.indexOf("OLD") < 0, "outbound visuals skip past-due rows");
eq(/vz-cols/.test(V.inbound({ pos: [{ expect: SOON }, { expect: "" }], inRecv: [1], coaMissing: [], held: [] })), "inbound visuals");
eq(/vz-donut/.test(V.inventory()), "inventory visuals");
eq(/vz-gauge/.test(V.production()), "production visuals");
eq(V.production().indexOf("1,200") >= 0 && V.production().indexOf("999") < 0, "P-Mac panel reads pmac_history P-Mac dept only");

// local mode shows the not-live banner
DB.mode = "local";
eq(V.dashboard().indexOf("not live plant data") >= 0, "local mode banner");
DB.mode = "cloud";

// INOUT_HUBS.counts() feeds Home and the tiles: it must use the live model once (no double wrap).
var hubSrc = read("inout-hubs.js");
eq(hubSrc.indexOf("inboundModel(liveInbound())") < 0 && hubSrc.indexOf("outboundModel(liveOutbound())") < 0, "counts() does not re-wrap the live models");
var hubWin = {
  DB: { mode: "cloud", supplierPos: function () { return [{ po_num: "P9", vendor: "V", expected: SOON, lines: [] }]; }, stock: function () { return []; }, receivingLog: function () { return []; },
    purchaseOrders: function () { return []; }, items: function () { return []; }, atLoc: function () { return 0; },
    demandLines: function () { return [{ status: "Open", po: "R1", cases: 5, due_date: SOON }, { status: "Open", po: "R0", cases: 5, due_date: PAST }]; },
    orders: function () { return [{ status: "Open", customer_po: "R1", customer: "KeHE" }, { status: "Open", customer_po: "R0", customer: "KeHE" }]; },
    shippingLog: function () { return []; }, orderDocs: function () { return []; } },
  document: docStub, localStorage: { getItem: function () { return null; }, setItem: function () {} }
};
hubWin.window = hubWin;
vm.runInNewContext(hubSrc, { window: hubWin, document: docStub, Intl: Intl, Date: Date, Math: Math, console: console, setTimeout: function () {} });
var hc = hubWin.INOUT_HUBS.counts();
eq(hc.dueIn === 1, "counts(): supplier PO due this week is counted (" + hc.dueIn + ")");
eq(hc.shipSoon === 0 || hc.shipSoon === 1, "counts(): shipSoon is a number");
eq(hc.shipSoon <= 1, "counts(): past-due PO R0 is not counted in shipSoon");

// wiring
var html = read("index.html"), sw = read("service-worker.js"), dashJs = read("dashboard.js"), hubs = read("inout-hubs.js"), home = read("simple-home.js"), inv = read("inventory-visual.js");
eq(html.indexOf('src="smk-viz.js?b=3"') > html.indexOf('src="dashboard.js?b=7"') && html.indexOf('src="smk-viz.js?b=3"') < html.indexOf('src="inventory-visual.js?b=5"'), "smk-viz.js wired after dashboard.js, before inventory-visual.js");
eq(sw.indexOf('"./smk-viz.js"') >= 0 && sw.indexOf('smackin-inv-v326') >= 0, "service worker caches smk-viz.js on v326");
eq(dashJs.indexOf("SMK_VIZ.dashboard()") >= 0, "dashboard calls SMK_VIZ");
eq(dashJs.indexOf("pastDueCard(late)") < 0 && dashJs.indexOf('kpiBtn("df-pastdue"') < 0, "dashboard no longer shows past-due demand");
eq(hubs.indexOf('viz("inbound", m)') >= 0 && hubs.indexOf('viz("outbound", m)') >= 0 && hubs.indexOf("m = hidePastDue(m)") >= 0, "hubs draw visuals and hide past-due");
eq(home.indexOf('week("top")') >= 0 && home.indexOf('week("below")') >= 0 && home.indexOf('viz("production")') >= 0, "home draws This week; production steps draw visuals");
eq(inv.indexOf("SMK_VIZ.inventory()") >= 0, "inventory page draws visuals");
eq(read("smk-viz.js").indexOf("setInterval") < 0 && read("smk-viz.js").indexOf("setTimeout") < 0, "no timers in smk-viz.js");

if (failed) { console.log(failed + " failed"); process.exit(1); }
console.log("smk-viz ok");

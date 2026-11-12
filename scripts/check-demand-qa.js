#!/usr/bin/env node
/* Demand QA: schedule matches Make Plan, pack-aware cases, Denver stamps,
   fulfillment strip, SPS tile, and saved-search reconcile. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");
require("../ecom.js");
var plan = require("../make-plan.js");
var DEMAND = require("../demand.js");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var NOW = new Date("2026-11-12T18:00:00Z");
var stamp = plan.stampDenver("2026-11-10T21:40:03Z");
assert(stamp.indexOf("MST") >= 0 && stamp.indexOf("UTC") < 0, "Denver stamp labels MST, got " + stamp);
assert(plan.stampDenver("2026-07-17T18:00:00Z").indexOf("MDT") >= 0, "July stamp labels MDT");
assert(plan.businessHoursSince("2026-11-12T15:00:00Z", NOW) < 24, "a few hours is not stale");
assert(plan.businessHoursSince("2026-11-10T23:00:00Z", NOW) > 24, "Nov 10 open demand is more than 24 business hours old on Nov 12");
assert(plan.casesOf(71232) === 989, "default cases stay bags/72");
assert(plan.casesOf(71232, "minibucket") === 2968, "mini bucket cases are bags/24");
assert(plan.bagsPerCase("cashew") === 72 && plan.bagsPerCase("seed4") === 72, "cashew masters and 4 oz are 72");

var vistar = plan.build({
  now: NOW,
  lines: [
    { partner: "Vistar", po: "V1", flavor: "Mini Bucket Mixed", flavor_code: "SMA77037", bags: 71232, cases: 2968, status: "Open", notes: "[[PACK:minibucket]]", created_at: "2026-11-11T00:47:08Z" },
    { partner: "Vistar", po: "V1", flavor: "Cotton Candy", bags: 62496, cases: 868, status: "Open", notes: "[[PACK:seed4]]", created_at: "2026-11-11T00:47:08Z" }
  ],
  purchaseOrders: []
});
var channel = vistar.customers.filter(function (c) { return c.channel === "Vistar"; })[0];
assert(channel && channel.bags === 133728 && channel.cases === 3836, "Vistar cases are pack-aware 3836, not bags/72");
assert(plan.casesOf(channel.bags) === 1857, "the old bags/72 rollup is 1857");
var mini = vistar.packs.filter(function (p) { return p.id === "minibucket"; })[0];
assert(mini && mini.headline.toProduce === 71232 && mini.headline.cases === 2968, "mini to-produce cases use 24");
assert(vistar.asOf.spsStale, "SPS snapshot from Nov 10 is amber-stale on Nov 12");
assert(plan.view(vistar).indexOf("Data as of") >= 0 && plan.view(vistar).indexOf("MST") >= 0 && plan.view(vistar).indexOf(" UTC") < 0, "Make Plan banner is Denver");
assert(plan.view(vistar).indexOf("Fulfillment summary") >= 0 && plan.view(vistar).indexOf("Target bags") >= 0, "fulfillment strip");
assert(plan.view(vistar).indexOf("no earlier open-demand snapshot") >= 0, "missing snapshot is labeled");
var sched = plan.scheduleView(vistar);
var made = plan.view(vistar);
assert(sched.indexOf(">989<") < 0, "schedule does not show mini bags divided by 72");
function produceOf(html) {
  var m = html.match(/<b>To produce<\/b>\s*([\d,]+)/);
  return m ? m[1] : "";
}
assert(produceOf(sched) === "62,496" && produceOf(sched) === produceOf(made), "schedule and Make Plan headline to-produce match: " + produceOf(sched) + " vs " + produceOf(made));

var compared = plan.build({
  now: NOW,
  lines: [{ partner: "KeHE", po: "1", flavor: "Ranch", bags: 144, cases: 2, status: "Open" }],
  purchaseOrders: [],
  loadSnapshot: {
    at: "2026-11-11T00:47:08Z",
    current: { bags: 200, pos: 4, lines: 8, keys: ["a", "b", "c", "d"] },
    previous: { bags: 150, pos: 3, lines: 6, keys: ["a", "b", "c"] }
  }
});
assert(plan.view(compared).indexOf("Added") >= 0 && plan.view(compared).indexOf("Closed") >= 0, "vs last load names added and closed");
var diff = plan.censusDiff(compared.loadCompare.previous, compared.loadCompare.current);
assert(diff.bags === 50 && diff.added === 1 && diff.closed === 0 && diff.lines === 2, "snapshot diff");

var staged = [{ partner: "KeHE", po: "3942350" }];
var existing = [
  { id: "a", partner: "KeHE", po: "3942350", dc: "", flavor: "Ranch", bags: 720, cases: 10, qty: 10, status: "Open" },
  { id: "b", partner: "Target", po: "100", dc: "055", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { id: "c", partner: "Vistar", po: "9", dc: "", flavor: "Mini Bucket Mixed", bags: 48, cases: 2, qty: 2, status: "Open", notes: "[[PACK:minibucket]]" },
  { id: "gone", partner: "McLane", po: "55", dc: "1", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" },
  { id: "t", partner: "Target", po: "TEST", dc: "", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open", batch_id: "SPS-TEST" }
];
var incoming = [
  { partner: "Target", po: "100", dc: "055", flavor: "Ranch", bags: 144, cases: 2, qty: 2, status: "Open" },
  { partner: "Vistar", po: "9", dc: "", flavor: "Mini Bucket Mixed", bags: 48, cases: 2, qty: 2, status: "Open" },
  { partner: "Bass Pro", po: "NEW", dc: "", flavor: "Ranch", bags: 72, cases: 1, qty: 1, status: "Open" }
];
var first = DEMAND.reconcileOpen(existing, incoming, { staged: staged, today: "2026-11-12" });
assert(first.insert.length === 1 && first.insert[0].po === "NEW", "new PO is inserted");
assert(first.update.length === 1 && first.update[0].id === "b" && first.update[0].bags === 144, "quantity update");
assert(first.close.length === 1 && first.close[0].id === "gone" && first.close[0].notes.indexOf("[[CLOSED:2026-11-12:not-live-sps-open]]") >= 0, "missing open row closes with the note");
assert(!first.close.some(function (c) { return c.po === "3942350"; }), "staged PO is not closed");
assert(!first.close.some(function (c) { return c.id === "t"; }), "test rows are left alone");
var after = existing.map(function (row) { return Object.assign({}, row); });
after.forEach(function (row) {
  var hit = first.close.filter(function (c) { return c.id === row.id; })[0];
  if (hit) { row.status = "Complete"; row.notes = hit.notes; }
  var upd = first.update.filter(function (u) { return u.id === row.id; })[0];
  if (upd) { row.bags = upd.bags; row.cases = upd.cases; row.qty = upd.qty; }
});
first.insert.forEach(function (row, i) { after.push(Object.assign({ id: "n" + i, status: "Open" }, row)); });
var second = DEMAND.reconcileOpen(after, incoming, { staged: staged, today: "2026-11-12" });
assert(second.insert.length === 0 && second.update.length === 0 && second.close.length === 0, "second load is a no-op");
var explicit = DEMAND.reconcileOpen(existing, [{ partner: "KeHE", po: "3942350", dc: "", flavor: "Ranch", status: "Complete", bags: 0, cases: 0, qty: 0 }], { staged: staged, today: "2026-11-12" });
assert(explicit.close.some(function (c) { return c.id === "a" && c.reason === "sps-closed"; }), "a staged PO closes when the file shows it closed");
assert(DEMAND.reconcileOpen(existing, [], { staged: staged }).refused === "empty", "an empty export does not close the board");

var dhSrc = read("data-health.js");
var dh = {
  document: { readyState: "loading", addEventListener: function () {}, createElement: function () { return {}; }, getElementById: function () { return null; } },
  MutationObserver: function () { return { observe: function () {} }; },
  SMACKIN_CONFIG: {},
  supabase: {}
};
dh.window = dh;
vm.createContext(dh);
vm.runInContext(dhSrc, dh);
var feed = dh.DATAHEALTH.forTest.spsFeed({
  now: NOW,
  sync: { at: "2026-11-12T15:00:04Z", ok: true, folder: "out", listed: 0 },
  demandAt: "2026-11-12T16:00:00Z",
  demandBatch: "SPS-UI-2026-11-12"
});
assert(feed.level === "ok", "a healthy cron with zero files stays green when demand is fresh");
assert(feed.connection.indexOf("0 files listed") >= 0 && feed.connection.indexOf("Folder out") >= 0, "connection states folder and file count");
var staleFiles = dh.DATAHEALTH.forTest.spsFeed({
  now: NOW,
  sync: { at: "2026-11-12T15:00:04Z", ok: true, folder: "out", listed: 0 },
  demandAt: "2026-11-03T18:00:00Z"
});
assert(staleFiles.level === "bad", "stale open demand is red even when the cron is healthy");
var authFail = dh.DATAHEALTH.forTest.spsFeed({
  now: NOW,
  sync: { at: "2026-11-12T15:00:04Z", ok: false, folder: "out", listed: 0, message: "SPS authentication failed" },
  demandAt: "2026-11-12T16:00:00Z"
});
assert(authFail.level === "ok" && authFail.connection.indexOf("authentication failed") >= 0, "a failed run is stated, and color still follows demand");
var tile = dh.DATAHEALTH.forTest.guardHtml({ spsFeed: feed });
assert(tile.indexOf('class="ex ok"') >= 0 && tile.indexOf("Last file received") < 0, "the live tile is not the old file-received line");
var oldTile = dh.DATAHEALTH.forTest.guardHtml({ sps: { quiet: true, never: false, last: "2026-11-03", days: 6 } });
assert(oldTile.indexOf("SPS feed") >= 0, "the old quiet helper still renders for its tests");

var app = read("app.js");
assert(app.indexOf("MAKE_PLAN.scheduleView(MAKE_PLAN.fromDb(DB))") >= 0, "Schedule uses Make Plan");
assert(app.indexOf("toProduce * 72") < 0, "schedule no longer multiplies every pack by 72");
assert(app.indexOf("reconcileDemandOpen") >= 0 && app.indexOf("not-live-sps-open") >= 0, "import reconciles with the close note");
assert(app.indexOf("Forecast vs Target is paused") >= 0 && app.indexOf("Troy Dircks") >= 0, "forecast card is paused");
assert(read("dept-homes.js").indexOf("Paused. Owner Troy Dircks") >= 0, "home card says the forecast is paused");
["viewDemandBoard", "viewDemandImport", "viewEcomDemand", "viewForecastVsTarget", "viewMakePlan", "viewOrders", "viewHome"].forEach(function (name) {
  assert(app.indexOf("function " + name) >= 0, name + " still exists");
});
assert(read("make-plan.js").indexOf(".insert(") < 0 && read("make-plan.js").indexOf(".delete(") < 0, "plan still does not write");
assert(read("po-lines.js").indexOf('"troy.dircks@smackinsnacks.com"') >= 0, "editors unchanged");
assert(read("scripts/sps-ui-load.js").indexOf("--apply") >= 0 && read("scripts/sps-ui-load.js").indexOf("not-live-sps-open") >= 0, "daily load steps are in the script");

function serve() {
  var http = require("http");
  return http.createServer(function (req, res) {
    var u = decodeURIComponent(String(req.url || "/").split("?")[0]);
    if (u === "/") u = "/index.html";
    var file = path.normalize(path.join(root, u));
    if (file.indexOf(root) !== 0) { res.statusCode = 403; res.end(); return; }
    fs.readFile(file, function (err, buf) {
      if (err) { res.statusCode = 404; res.end("missing"); return; }
      if (/\.js$/.test(file)) res.setHeader("Content-Type", "application/javascript");
      else if (/\.html$/.test(file)) res.setHeader("Content-Type", "text/html");
      else if (/\.css$/.test(file)) res.setHeader("Content-Type", "text/css");
      res.end(buf);
    });
  });
}
function installFake() {
  var session = { user: { id: "view-1", email: "viewer@smackinsnacks.com" } };
  function builder(table) {
    var b = {};
    function chain() { return b; }
    ["select", "insert", "update", "upsert", "delete", "eq", "order", "limit", "in", "or", "gte", "lte", "neq", "gt", "range", "single", "maybeSingle"].forEach(function (name) {
      b[name] = chain;
    });
    b.then = function (resolve, reject) {
      var data = [];
      if (table === "items") data = [{ id: "I1", code: "BAG4-S08", name: "Ranch 4oz", category: "bag4", unit: "bags", flavor: "Ranch" }];
      return Promise.resolve({ data: data, error: null }).then(resolve, reject);
    };
    return b;
  }
  window.supabase = {
    createClient: function () {
      var ch = { on: function () { return ch; }, subscribe: function () { return { unsubscribe: function () {} }; } };
      return {
        auth: {
          getSession: function () { return Promise.resolve({ data: { session: session } }); },
          onAuthStateChange: function (cb) {
            setTimeout(function () { try { cb("SIGNED_IN", session); } catch (e) {} }, 0);
            return { data: { subscription: { unsubscribe: function () {} } } };
          },
          signOut: function () { return Promise.resolve({ error: null }); }
        },
        from: builder,
        channel: function () { return ch; },
        removeChannel: function () {}
      };
    }
  };
}
async function smoke() {
  var playwright;
  try { playwright = require("playwright-core"); }
  catch (e) { assert(false, "playwright-core is installed"); return; }
  var server = serve();
  await new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); });
  var port = server.address().port;
  var browser = await playwright.chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  var page = await browser.newPage();
  page.setDefaultTimeout(30000);
  var errors = [];
  page.on("pageerror", function (err) { errors.push(String(err && err.message || err)); });
  await page.route("**/@supabase/supabase-js@2.116.0*", function (route) {
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  });
  await page.route(/service-worker\.js/, function (route) {
    route.fulfill({ status: 200, contentType: "application/javascript", body: "self.addEventListener('install',function(){});" });
  });
  await page.addInitScript(installFake);
  await page.goto("http://127.0.0.1:" + port + "/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(function () { return window.DB && window.UI_go && !document.getElementById("smk-auth"); });
  var tabs = ["makeplan", "demandsched", "demandboard", "demand", "demandimport", "ecomdemand", "forecast", "home", "orders", "daily"];
  for (var i = 0; i < tabs.length; i++) {
    await page.evaluate(function (tab) { window.UI_go(tab); }, tabs[i]);
    var text = await page.locator("#view").innerText();
    assert(text && text.length > 20, tabs[i] + " rendered");
  }
  var pair = await page.evaluate(function () {
    window.UI_go("makeplan");
    var make = document.getElementById("view").innerText;
    window.UI_go("demandsched");
    var sched = document.getElementById("view").innerText;
    return { make: make, sched: sched };
  });
  function grab(text) {
    var m = String(text || "").match(/To produce\s+([\d,]+)/);
    return m ? m[1] : "";
  }
  assert(grab(pair.make) && grab(pair.make) === grab(pair.sched), "rendered Make Plan and Schedule to-produce match (" + grab(pair.make) + " / " + grab(pair.sched) + ")");
  assert(pair.sched.indexOf("2,500 bags") >= 0, "schedule names the pallet size");
  assert(pair.make.indexOf("Fulfillment summary") >= 0, "make plan shows the fulfillment strip");
  await page.evaluate(function () { window.UI_go("forecast"); });
  var forecast = await page.locator("#view").innerText();
  assert(forecast.indexOf("paused") >= 0 && forecast.indexOf("Troy Dircks") >= 0, "forecast tab is labeled paused");
  await page.evaluate(function () { window.UI_go("demandimport"); });
  var imp = await page.locator("#view").innerText();
  assert(imp.indexOf("not-live-sps-open") >= 0, "import explains the close note");
  assert(!errors.length, "no page errors: " + errors.join(" | "));
  await browser.close();
  server.close();
}

smoke().then(function () {
  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("demand qa ok");
}).catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

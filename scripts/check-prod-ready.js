#!/usr/bin/env node
/* Production Readiness math, CSV, and a headless render as a non-admin. */
"use strict";

var fs = require("fs");
var http = require("http");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var P = require(path.join(root, "prod-ready.js"));
var src = read("prod-ready.js");
eq(src.indexOf(".update(") < 0 && src.indexOf(".insert(") < 0, "report does not write");
eq(read("inv-sync-1105.js").indexOf("prod-ready") < 0, "inventory sync untouched");

var today = "2026-11-06";
var brisket = {
  recipes: {},
  missing: [{ name: "Texas Beef Brisket Snack Seasoning", wip_lbs_per_batch: 5.51 }],
  items: [
    { id: "TMP-SEAS-TBB", code: "TMP-SEAS-TBB", name: "Seasoning - Texas Beef Brisket", flavor: "Texas Beef Brisket", category: "seasoning", unit: "lbs" },
    { id: "FILM4-TBB", code: "F4-TBB", name: "Film 4.0 oz - Texas Beef Brisket", flavor: "Texas Beef Brisket", category: "film4", unit: "impr" }
  ],
  stock: [
    { item_id: "TMP-SEAS-TBB", location: "PROD-WEIGH", lot: "A", qty: 11.02, expires_on: "2027-01-01" },
    { item_id: "TMP-SEAS-TBB", location: "QA-HOLD", lot: "B", qty: 5, expires_on: "2027-01-01", coa_received: "no" },
    { item_id: "TMP-SEAS-TBB", location: "PROD-WEIGH", lot: "OLD", qty: 3, expires_on: "2026-01-01" },
    { item_id: "FILM4-TBB", location: "C-01-L1", lot: "F", qty: 800 }
  ],
  recv: [
    { item_id: "TMP-SEAS-TBB", qty_received: 20, recv_date: "2026-10-02", lot: "A", contents: "Texas Beef Brisket Seasoning" }
  ],
  today: today
};
var aligned = P.align(brisket);
var row = aligned.filter(function (r) { return r.key === "texasbeefbrisket"; })[0];
eq(!!row, "texas beef brisket row");
eq(row && row.seasUsable === 11.02, "usable seasoning excludes hold and expired " + (row && row.seasUsable));
eq(row && row.seasHeld === 8, "held plus expired seasoning " + (row && row.seasHeld));
eq(row && row.films["4oz"].usable === 800 && row.films["4oz"].bags === 800, "4 oz film bags");
eq(row && row.films["4oz"].seasBags === Math.floor(11.02 / 5.51 * 400), "seasoning covers 4 oz bags");
eq(row && row.received === 20, "receiving history");
eq(row && row.flags.length === 0, "matched pair is not a mismatch");

var noFilm = P.align({
  recipes: {},
  missing: [{ name: "Texas Beef Brisket Snack Seasoning", wip_lbs_per_batch: 5.51 }],
  items: [brisket.items[0]],
  stock: [brisket.stock[0]],
  recv: [],
  today: today
});
eq(noFilm[0].flags.indexOf("seasoning-no-film") >= 0, "seasoning with no film");
var noSeas = P.align({
  recipes: {},
  items: [brisket.items[1]],
  stock: [brisket.stock[3]],
  recv: [],
  today: today
});
eq(noSeas[0].flags.some(function (f) { return f.indexOf("film-no-seasoning") === 0; }), "film with no seasoning");

var ranch = {
  recipes: { ranch: { code: "S08", name: "Ranch", seas_lbs: 5, malto_lbs: 3, seed_type: "Standard" } },
  missing: [],
  items: [
    { id: "SEED-BROWN", code: "SEED-BROWN", name: "Sunflower Seed - Processed (Brown)", category: "seed", unit: "lbs" },
    { id: "MALTO", code: "MALTO", name: "Maltodextrin (Clintose)", category: "seed", unit: "lbs" },
    { id: "SEAS-S08", code: "SEAS-S08", name: "Seasoning - Ranch", flavor: "Ranch", category: "seasoning", unit: "lbs" },
    { id: "FILM4-S08", code: "F4-S08", name: "Film 4oz - Ranch", flavor: "Ranch", category: "film4", unit: "impr" }
  ],
  stock: [
    { item_id: "SEED-BROWN", location: "D-01-L1", lot: "SD", qty: 1000 },
    { item_id: "MALTO", location: "D-03-L1", lot: "M", qty: 100 },
    { item_id: "SEAS-S08", location: "PROD-WEIGH", lot: "OK", qty: 10, expires_on: "2027-06-01" },
    { item_id: "SEAS-S08", location: "QUARANTINE", lot: "Q", qty: 10, expires_on: "2027-06-01" },
    { item_id: "FILM4-S08", location: "C-01-L1", lot: "FF", qty: 400 }
  ],
  recv: [],
  today: today
};
var ranchRow = P.align(ranch).filter(function (r) { return r.key === "ranch"; })[0];
var bom = P.bomFor(ranchRow, ranch, "4oz");
eq(bom.limit === "Film 4 oz", "film is the limiting input " + bom.limit);
eq(bom.bags === 400, "max bags follow the film " + bom.bags);
var seasIn = bom.inputs.filter(function (i) { return i.kind === "seasoning"; })[0];
eq(seasIn.usable === 10 && seasIn.held === 10 && Math.round(seasIn.batches) === 2, "held seasoning is not usable");
var all = P.bomAll(ranch, "4oz");
eq(all[0].key === "ranch" && all[0].batches > 0, "runnable item sorts first");
var csv = P.alignCsv(P.align(brisket));
eq(csv.indexOf("Texas Beef Brisket") >= 0 && csv.indexOf("Seasoning usable lbs") >= 0, "csv export");
eq(P.toCsv(["A", "B"], [["x", "y,z"]]) === "A,B\nx,\"y,z\"", "csv quotes commas");
var gaps = P.recipeGaps({}, [{ name: "Texas Beef Brisket Snack Seasoning", wip_lbs_per_batch: 5.51 }]);
eq(gaps[0].missing.indexOf("oil amount") >= 0 && gaps[0].missing.indexOf("box or case quantity") >= 0, "missing recipe inputs are named");
var vm = require("vm");
var sandbox = {};
sandbox.window = sandbox;
vm.runInNewContext(read("recipes.js"), sandbox);
var liveGaps = P.recipeGaps(sandbox.RECIPES, sandbox.WIP_APPROVED_MISSING);
eq(liveGaps.some(function (g) { return g.name === "Texas Beef Brisket Snack Seasoning"; }), "live approved list includes brisket");

function serve() {
  return http.createServer(function (req, res) {
    var u = decodeURIComponent(String(req.url || "/").split("?")[0]);
    if (u === "/") u = "/index.html";
    var file = path.normalize(path.join(root, u));
    if (file.indexOf(root) !== 0) { res.statusCode = 403; res.end(); return; }
    fs.readFile(file, function (err, buf) {
      if (err) { res.statusCode = 404; res.end("missing"); return; }
      if (/\.js$/.test(file)) res.setHeader("Content-Type", "application/javascript");
      else if (/\.html$/.test(file)) res.setHeader("Content-Type", "text/html");
      res.end(buf);
    });
  });
}
function installFake() {
  var items = [
    { id: "TMP-SEAS-TBB", code: "TMP-SEAS-TBB", name: "Seasoning - Texas Beef Brisket", flavor: "Texas Beef Brisket", category: "seasoning", unit: "lbs", reorder: 0 },
    { id: "FILM4-TBB", code: "F4-TBB", name: "Film 4.0 oz - Texas Beef Brisket", flavor: "Texas Beef Brisket", category: "film4", unit: "impr", reorder: 0 }
  ];
  var stock = [
    { item_id: "TMP-SEAS-TBB", location: "PROD-WEIGH", lot: "A", qty: 11, expires_on: "2027-01-01" },
    { item_id: "FILM4-TBB", location: "C-01-L1", lot: "F", qty: 400 }
  ];
  function exec(state) {
    if (state.op === "select" && state.table === "items") return { data: items, error: null };
    if (state.op === "select" && state.table === "stock") return { data: stock, error: null };
    if (state.op === "select" && state.table === "receiving_log") {
      return { data: [{ id: 1, item_id: "TMP-SEAS-TBB", qty_received: 11, recv_date: "2026-10-02", lot: "A", contents: "Texas Beef Brisket" }], error: null };
    }
    return { data: [], error: null };
  }
  function builder(table) {
    var state = { table: table, op: "select" };
    var b = {};
    ["select", "order", "limit", "eq", "in", "or", "gte", "lte", "range"].forEach(function (name) {
      b[name] = function () { return b; };
    });
    b.then = function (resolve, reject) { return Promise.resolve(exec(state)).then(resolve, reject); };
    return b;
  }
  var session = { user: { email: "inventory@smackinsnacks.com" } };
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
        channel: function () { return ch; },
        from: function (table) { return builder(table); }
      };
    }
  };
}

function browser() {
  var playwright;
  try { playwright = require("playwright-core"); }
  catch (e) { eq(false, "playwright-core"); return Promise.resolve(); }
  var server = serve();
  return new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); }).then(function () {
    var port = server.address().port;
    return playwright.chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).then(function (browser) {
      return browser.newPage().then(function (page) {
        page.setDefaultTimeout(30000);
        return page.route(/service-worker\.js/, function (route) {
          route.fulfill({ status: 200, contentType: "application/javascript", body: "self.addEventListener('install',function(){});" });
        }).then(function () {
          return page.route("**/@supabase/supabase-js@2.116.0*", function (route) {
            route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
          });
        }).then(function () {
          return page.addInitScript(installFake);
        }).then(function () {
          return page.goto("http://127.0.0.1:" + port + "/index.html", { waitUntil: "domcontentloaded" });
        }).then(function () {
          return page.waitForFunction(function () {
            return window.DB && DB.mode === "cloud" && window.UI_go && window.PRODREADY && !document.getElementById("smk-auth");
          });
        }).then(function () {
          return page.evaluate(function () { window.UI_go("prodready"); });
        }).then(function () {
          return page.waitForSelector("#prod-ready");
        }).then(function () {
          return page.locator("#prod-ready").innerText();
        }).then(function (text) {
          eq(text.indexOf("Production Readiness") >= 0, "screen title");
          eq(text.indexOf("Texas Beef Brisket") >= 0, "brisket on the screen");
          eq(text.indexOf("4 oz") >= 0, "4 oz film column");
          eq(text.indexOf("Newest receipt") >= 0, "freshness line");
          return page.locator("#prod-ready button", { hasText: "Can we run it" }).click();
        }).then(function () {
          return page.locator("#prod-ready").innerText();
        }).then(function (text) {
          eq(/limiting input/i.test(text), "bom table");
          return browser.close();
        });
      }).then(function () { server.close(); });
    });
  });
}

browser().then(function () {
  if (fail.length) {
    fail.forEach(function (msg) { console.error("FAIL", msg); });
    process.exit(1);
  }
  console.log("ok prod ready");
}).catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

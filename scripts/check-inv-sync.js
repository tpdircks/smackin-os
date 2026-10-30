#!/usr/bin/env node
/* The 10/27 sheet sync stays in the repo and is not loaded.
   A loaded apply module can overwrite a newer hand count.
   Older inv-sync files must not ship. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var obsolete = [
  "inv-sync-0928.js", "inv-sync-1002.js", "inv-sync-1006.js", "inv-sync-1009.js",
  "inv-sync-1013.js", "inv-sync-1014.js", "inv-sync-1015.js", "inv-sync-1020.js",
  "inv-sync-1023.js", "inv-sync-1027.js", "inv-sync-1027b.js", "inv-sync-1027c.js"
];
obsolete.forEach(function (rel) {
  assert(!fs.existsSync(path.join(root, rel)), rel + " still in the app");
});

var syncFiles = fs.readdirSync(root).filter(function (name) { return /^inv-sync-.*\.js$/.test(name); });
assert(syncFiles.length === 1 && syncFiles[0] === "inv-sync-1027d.js", "sync files " + syncFiles.join(","));

var htmlFiles = fs.readdirSync(root).filter(function (name) { return /\.html$/.test(name); });
htmlFiles.forEach(function (name) {
  var html = read(name);
  var tags = html.match(/inv-sync-[^"']+\.js/g) || [];
  if (name === "index.html") {
    assert(tags.length === 0, "index does not load a sheet sync");
  } else {
    tags.forEach(function (tag) {
      assert(tag === "inv-sync-1027d.js", name + " loads " + tag);
    });
  }
  obsolete.forEach(function (rel) {
    assert(html.indexOf(rel) < 0, name + " references " + rel);
  });
});

var index = read("index.html");
assert(index.indexOf("inv-sync-1027d.js") < 0, "index does not load the apply module");
assert(index.indexOf("slc-count-latest.js") < 0, "index does not load the count file");
assert(index.indexOf("slc-count-panel.js") < 0, "index does not load the count panel");
assert(fs.existsSync(path.join(root, "inv-sync-1027d.js")), "apply file kept");
assert(fs.existsSync(path.join(root, "slc-count-latest.js")), "count file kept");
assert(fs.existsSync(path.join(root, "slc-count-panel.js")), "panel file kept");

var sw = read("service-worker.js");
assert(sw.indexOf('const CACHE = "smackin-inv-v258"') >= 0, "cache v254");
assert(sw.indexOf("smackin-inv-v242") < 0, "old cache gone");
assert(sw.indexOf("./inv-sync-1027d.js") < 0, "sw does not precache the apply module");
assert(sw.indexOf("./slc-count-latest.js") < 0, "sw does not precache the count file");
assert(sw.indexOf("./slc-count-panel.js") < 0, "sw does not precache the count panel");
obsolete.forEach(function (rel) { assert(sw.indexOf(rel) < 0, "sw lists " + rel); });

var apply = read("inv-sync-1027d.js");
assert(apply.indexOf("inv-sync-2026-10-27d-cloud") >= 0, "new local flag");
assert(apply.indexOf("inv-sync-2026-10-23") < 0, "old 10/23 flag absent");
assert(apply.indexOf("await DB.adjustTotal(it, sheetQty, NOTE)") >= 0, "awaited adjust");
assert(apply.indexOf("function isSyncOperator") >= 0, "manual operator guard");
assert(apply.indexOf("A hand count wins") >= 0, "hand count rule");
assert(apply.indexOf("if (!choice.write)") >= 0, "skips when a hand count owns the total");
assert(apply.indexOf("var TARGET") < 0, "no baked target table");
assert(apply.indexOf('SHEETS = { "Inventory Bags 4 oz": 1, "Inventory Bags 1.5 oz": 1 }') >= 0, "bag sheets only");
assert(apply.indexOf("DT275") < 0 && apply.indexOf("BOX-") < 0, "does not name excluded skus");
["11850", "28000", "36000", "29100", "16700"].forEach(function (n) {
  assert(apply.indexOf(n) < 0, "old or sheet qty baked in module " + n);
});

var panel = read("slc-count-panel.js");
assert(panel.indexOf("inventory@smackinsnacks.com") >= 0, "Adriana address");
assert(panel.indexOf("mailto:") >= 0, "discrepancy mailto");
assert(panel.indexOf("inv-sync-2026-10-27d-report") >= 0, "reads the apply report");

var ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read("slc-count-latest.js"), ctx);
var rows = ctx.window.SLC_COUNT.rows.filter(function (row) {
  return row && row.code && row.sheetDate === "2026-10-27" &&
    (row.sheet === "Inventory Bags 4 oz" || row.sheet === "Inventory Bags 1.5 oz");
});
assert(rows.length === 49, "10/27 bag rows " + rows.length);
assert(rows.every(function (row) { return row.sheetQty === row.sheetQty && row.sheetQty >= 0 && row.sheetQty <= 100000; }), "qty bounds");
assert(rows.every(function (row) { return String(row.code).indexOf("DT275") !== 0 && String(row.code).indexOf("BOX-") !== 0; }), "filter excludes dt and box");

function harness(opts) {
  var store = {};
  var kv = { value: opts.kv || "" };
  var adjusts = [];
  var puts = [];
  var timers = [];
  var onHandQty = opts.onHand;
  var ctx = {
    window: {
      SLC_COUNT: opts.slc,
      SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "k" },
      DB: {
        mode: "cloud",
        itemByCode: function (code) { return opts.item && (opts.item.code === code || opts.item.id === code) ? opts.item : null; },
        adjustTotal: function (it, qty, note) {
          adjusts.push({ code: it.code, qty: qty, note: note });
          onHandQty = qty;
          return Promise.resolve({ ok: true });
        },
        onHand: function () { return onHandQty; },
        kvSet: function (key, val) {
          puts.push({ key: key, val: val });
          if (key === "inv-sync-2026-10-27d") kv.value = String(val);
          return Promise.resolve({ ok: true });
        },
        kvCloudOn: function () { return true; },
        items: function () { return opts.item ? [opts.item] : []; },
        refresh: function () { return Promise.resolve(); }
      }
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    fetch: function (url) {
      url = String(url);
      if (url.indexOf("kv_status") >= 0) {
        return Promise.resolve({
          ok: true,
          json: function () { return Promise.resolve(kv.value ? [{ value: kv.value }] : []); }
        });
      }
      if (url.indexOf("/stock") >= 0) {
        return Promise.resolve({
          ok: true,
          json: function () { return Promise.resolve(opts.stock || [{ location: "RETURNS", qty: onHandQty }]); }
        });
      }
      if (url.indexOf("transactions") >= 0) {
        return Promise.resolve({
          ok: true,
          json: function () { return Promise.resolve(opts.history || []); }
        });
      }
      return Promise.reject(new Error("unexpected " + url));
    },
    setTimeout: function (fn, ms) { timers.push(ms); return setTimeout(fn, ms); },
    console: console,
    encodeURIComponent: encodeURIComponent
  };
  if (opts.flag) store["inv-sync-2026-10-27d-cloud"] = opts.flag;
  ctx.DB = ctx.window.DB;
  vm.createContext(ctx);
  vm.runInContext(apply, ctx);
  return { store: store, kv: kv, adjusts: adjusts, puts: puts, timers: timers };
}
function tick() { return new Promise(function (resolve) { setImmediate(resolve); }); }
async function settle(ms) {
  var end = Date.now() + ms;
  while (Date.now() < end) await tick();
  for (var i = 0; i < 30; i++) await tick();
}

var one = {
  date: "2026-10-27",
  rows: [{ code: "B4-S07", sheet: "Inventory Bags 4 oz", sheetDate: "2026-10-27", sheetQty: 29100, desc: "Cheddar Jalapeno" }]
};
var item = { id: "BAG4-S07", code: "B4-S07", flavor: "Cheddar Jalapeno" };
var syncHist = [{ operator: null, detail: "Cheddar Jalapeno @ RETURNS: 29,100 -> 36,000" }];

(async function () {
  var flagged = harness({ slc: one, item: item, onHand: 36000, flag: "done:already" });
  await settle(50);
  assert(flagged.adjusts.length === 0, "flagged browser does not adjust");
  assert(flagged.timers.length === 0, "flagged browser does not retry");

  var other = harness({
    slc: { date: "2026-11-10", rows: [{ code: "B4-S07", sheet: "Inventory Bags 4 oz", sheetDate: "2026-11-10", sheetQty: 1 }] },
    item: item,
    onHand: 36000
  });
  await settle(50);
  assert(other.adjusts.length === 0 && other.puts.length === 0, "a later count is not applied by this module");

  var skipped = harness({ slc: one, item: item, onHand: 29100 });
  await settle(2000);
  assert(skipped.adjusts.length === 0, "matching on-hand is not written");
  assert(skipped.kv.value.indexOf("done:") === 0, "matching run still finishes once");
  assert(skipped.store["inv-sync-2026-10-27d-cloud"], "local done flag set");

  var applyOnce = harness({ slc: one, item: item, onHand: 36000, history: syncHist });
  await settle(2000);
  assert(applyOnce.adjusts.length === 1, "one adjust");
  assert(applyOnce.adjusts[0] && applyOnce.adjusts[0].qty === 29100 && applyOnce.adjusts[0].note === "inv-sync-1027d", "writes the sheet total");
  assert(applyOnce.kv.value.indexOf("done:") === 0, "cloud done flag");
  var reportPut = applyOnce.puts.filter(function (p) { return p.key === "inv-sync-2026-10-27d-report"; })[0];
  var report = reportPut ? JSON.parse(reportPut.val) : null;
  assert(report && report.rows.length === 1 && report.rows[0].before === 36000 && report.rows[0].after === 29100, "report keeps the previous on-hand");

  var manual = harness({
    slc: one, item: item, onHand: 35000,
    history: [{ operator: "Jesus", detail: "Cheddar Jalapeno @ RETURNS: 36,000 -> 35,000" }]
  });
  await settle(2000);
  assert(manual.adjusts.length === 0, "a named count is not overwritten");
  assert(manual.kv.value.indexOf("done:") === 0, "manual skip still finishes the one pass");
  var manualReport = JSON.parse(manual.puts.filter(function (p) { return p.key === "inv-sync-2026-10-27d-report"; })[0].val);
  assert(manualReport.kept.length === 1 && manualReport.kept[0].operator === "Jesus", "manual is reported, not applied");

  var moved = harness({
    slc: one, item: item, onHand: 36100,
    history: syncHist
  });
  await settle(2000);
  assert(moved.adjusts.length === 0, "a total that is no longer the sync post is left alone");

  var buried = harness({
    slc: one, item: item, onHand: 36000,
    history: [
      { operator: null, detail: "Cheddar Jalapeno @ RETURNS: 1 -> 100" },
      { operator: "Jesus", detail: "Cheddar Jalapeno @ RETURNS: 10 -> 5" },
      { operator: null, detail: "Cheddar Jalapeno @ RETURNS: 29,100 -> 36,000" }
    ]
  });
  await settle(2000);
  assert(buried.adjusts.length === 1, "an older hand count does not block the sync post that is live");

  var oldSheet = harness({
    slc: one, item: item, onHand: 36000,
    history: [{ operator: "Adri Inv 9/21", detail: "Cheddar Jalapeno @ RETURNS: 1 -> 36,000" }]
  });
  await settle(2000);
  assert(oldSheet.adjusts.length === 1, "an old sheet-sync label is not a hand count");

  var later = harness({ slc: one, item: item, onHand: 35000, kv: "done:earlier", history: syncHist });
  await settle(80);
  assert(later.adjusts.length === 0 && later.puts.length === 0, "shared done flag blocks another browser from re-applying");

  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("ok", rows.length, "bag rows");
})();

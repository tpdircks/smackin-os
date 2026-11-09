#!/usr/bin/env node
/* Adriana's Nov 5, 2026 count is the only inv-sync the page loads.
   Lot-tracked seasoning stays in SKIPPED. A live total that no longer
   matches os_total_before is not overwritten. No network. */
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

var src = read("inv-sync-1105.js");
var html = read("index.html");
var sw = read("service-worker.js");
var sync = require("../inv-sync-1105.js");

assert(src.indexOf("\u2014") < 0, "sync copy has no em dash");
assert(src.indexOf("smackin_inv_sync_1105_adriana_done") >= 0, "local done flag");
assert(src.indexOf("D.mode === \"cloud\"") >= 0, "polls for cloud mode");
assert(src.indexOf("await D.adjustTotal(it, target, NOTE)") >= 0, "writes with adjustTotal");
assert(src.indexOf("D.createItem({") >= 0, "creates with createItem");
assert(src.indexOf("NOTE = \"inv-sync-1105-adriana\"") >= 0, "operator note");
assert(sync.NOTE === "inv-sync-1105-adriana", "exported note");
assert(sync.LOCAL_FLAG === "smackin_inv_sync_1105_adriana_done", "exported flag");
assert(sync.ROWS.length === 112, "apply rows " + sync.ROWS.length);
assert(sync.SKIPPED.length === 26, "skipped rows " + sync.SKIPPED.length);
assert(sync.ROWS.filter(function (row) { return row.create; }).length === 26, "new skus");
assert(sync.ROWS.every(function (row) { return !sync.overCap(row.qty) && row.qty <= 100000; }), "targets stay at or under 100000");
assert(sync.SKIPPED.every(function (row) { return sync.lotTracked(row, null); }), "skipped rows are lot-tracked");
assert(sync.ROWS.every(function (row) { return !sync.lotTracked(row, null); }), "apply rows are not lot-tracked raw materials");
var skippedCodes = {};
sync.SKIPPED.forEach(function (row) { skippedCodes[row.code] = 1; });
assert(sync.ROWS.every(function (row) { return !skippedCodes[row.code]; }), "skipped codes are not applied");
["seed", "maltodextrin", "oil", "stevia"].forEach(function (word) {
  assert(src.toLowerCase().indexOf(word) >= 0, "comment names " + word);
});

var tags = html.match(/inv-sync-[^"']+\.js/g) || [];
assert(tags.length === 1 && tags[0] === "inv-sync-1106.js", "index loads the lot sync " + tags.join(","));
assert(html.indexOf('src="inv-sync-1106.js?b=1"') > html.indexOf('src="sw-boot.js'), "lot sync script is last");
assert(html.indexOf("inv-sync-1105.js") < 0 && html.indexOf("inv-sync-1102.js") < 0 && html.indexOf("inv-sync-packaging-1102.js") < 0, "stale loaders are unloaded");
assert(fs.existsSync(path.join(root, "inv-sync-1102.js")) && fs.existsSync(path.join(root, "inv-sync-packaging-1102.js")), "old sync files stay on disk");
assert(sw.indexOf('const CACHE = "smackin-inv-v297"') >= 0, "cache v286");
assert(sw.indexOf('"./inv-sync-1106.js"') >= 0, "sw precaches the lot sync");
assert(sw.indexOf("inv-sync-1105.js") < 0 && sw.indexOf("inv-sync-1102.js") < 0 && sw.indexOf("inv-sync-packaging-1102.js") < 0, "sw drops stale syncs");
assert(read("build-id.txt").trim() === "smackin-inv-v297", "build id");
assert(html.indexOf('var EMBEDDED = "smackin-inv-v297"') >= 0, "index embedded");
assert(read("sw-escape.js").indexOf('var EMBEDDED = "smackin-inv-v297"') >= 0, "escape embedded");

global.DB = {
  itemByCode: function (code) {
    var key = String(code || "").trim().toLowerCase();
    var items = global.DB.items();
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (String(it.code).toLowerCase() === key || String(it.id).toLowerCase() === key || String(it.name).toLowerCase() === key) return it;
    }
    return null;
  },
  items: function () {
    return [
      { id: "BAG4-S01", code: "B4-S01", name: "Bags 4oz - OG", flavor: "OG" },
      { id: "BAG15-S02", code: "B15-S02", name: "Bags 1.5oz - Churro", flavor: "CINNAMON CHURRO" },
      { id: "BOX-160086", code: "BOX-160086", name: "Box 160086" },
      { id: "LID - WHITE", code: "LID - WHITE", name: "BUCKET LID- WHITE" },
      { id: "BAG4-S03", code: "B4-S03", name: "Bags 4oz - BBQ", flavor: "BBQ" }
    ];
  }
};
assert(sync.findItem("BAG4-S01").code === "B4-S01", "BAG4 id maps to B4 code");
assert(sync.findItem("B4-S01").id === "BAG4-S01", "B4 code maps to BAG4 id");
assert(sync.findItem("BAG15-S02").code === "B15-S02", "BAG15 id maps to B15 code");
assert(sync.findItem("B15-S02").id === "BAG15-S02", "B15 code maps to BAG15 id");
assert(sync.findItem("160086").id === "BOX-160086", "160086 maps to BOX-160086");
assert(sync.findItem("BOX-160086").id === "BOX-160086", "BOX-160086 resolves");
assert(sync.findItem("BUCKET LID- WHITE").id === "LID - WHITE", "item name resolves");
assert(sync.findItem("SUP-LABEL12-BBQ", "BBQ") == null, "short new-sku description does not adopt BBQ");

function itemSpec(row) {
  var id = row.code;
  var code = row.code;
  if (/^BAG4-/i.test(row.code)) code = "B4-" + row.code.slice(5);
  if (/^BAG15-/i.test(row.code)) code = "B15-" + row.code.slice(6);
  return { id: id, code: code, name: row.desc, flavor: row.desc, category: row.category, unit: row.unit };
}

function harness(opts) {
  opts = opts || {};
  var store = {};
  var kv = { value: opts.kv || "" };
  var items = {};
  var stock = [];
  var logs = [];
  var warns = [];
  var totals = [];
  var creates = [];
  sync.ROWS.forEach(function (row) {
    if ((opts.hide || []).indexOf(row.code) >= 0) return;
    var spec = itemSpec(row);
    items[spec.id] = spec;
    var qty = Object.prototype.hasOwnProperty.call(opts.qty || {}, row.code) ? opts.qty[row.code] : row.before;
    if (Array.isArray(qty)) {
      qty.forEach(function (part) {
        stock.push({ item_id: spec.id, location: part.location, qty: part.qty, lot: part.lot || "" });
      });
    } else {
      stock.push({ item_id: spec.id, location: "RECEIVING", qty: qty, lot: "" });
    }
  });
  function sumItem(id) {
    return stock.reduce(function (sum, row) {
      return sum + (row.item_id === id ? Number(row.qty) : 0);
    }, 0);
  }
  var DB = {
    mode: "cloud",
    items: function () { return Object.keys(items).map(function (k) { return items[k]; }); },
    itemByCode: function (code) {
      var key = String(code || "").trim().toLowerCase();
      var found = null;
      Object.keys(items).forEach(function (id) {
        var it = items[id];
        if (String(it.code).toLowerCase() === key || String(it.id).toLowerCase() === key || String(it.name).toLowerCase() === key) found = it;
      });
      return found;
    },
    onHand: function (id) {
      var it = items[id] || DB.itemByCode(id);
      return sumItem(it ? it.id : id);
    },
    refresh: function () { return Promise.resolve(); },
    kvCloudOn: function () { return true; },
    kvSet: function (key, val) {
      if (key === sync.CLOUD_KEY) kv.value = String(val);
      return Promise.resolve({ ok: true });
    },
    createItem: function (rec, op) {
      creates.push({ code: rec.code, name: rec.name, category: rec.category, unit: rec.unit, op: op });
      items[rec.code] = { id: rec.code, code: rec.code, name: rec.name, flavor: rec.flavor || rec.name, category: rec.category, unit: rec.unit };
      return Promise.resolve({ ok: true, item: items[rec.code] });
    },
    adjustTotal: function (it, target, op) {
      var rows = stock.filter(function (row) { return row.item_id === it.id; });
      var cur = rows.reduce(function (sum, row) { return sum + Number(row.qty); }, 0);
      if (cur === target) return Promise.resolve({ ok: true, unchanged: true });
      var held = rows.reduce(function (sum, row) {
        var loc = String(row.location || "").toUpperCase();
        return sum + (loc === "RETURNS" || loc === "RETURNS-HOLD" || loc === "QUARANTINE" || loc === "QA-HOLD" ? Number(row.qty) : 0);
      }, 0);
      if (target < held - 0.001) return Promise.resolve({ ok: false, blocked: true });
      totals.push({ code: it.code, id: it.id, qty: target, op: op });
      var recv = rows.filter(function (row) { return row.location === "RECEIVING"; });
      var recvQty = recv.reduce(function (sum, row) { return sum + Number(row.qty); }, 0);
      var next = target - (cur - recvQty);
      if (!recv.length) stock.push({ item_id: it.id, location: "RECEIVING", qty: next, lot: "" });
      else {
        recv[0].qty = next;
        for (var i = 1; i < recv.length; i++) recv[i].qty = 0;
      }
      return Promise.resolve({ ok: true, location: "RECEIVING" });
    }
  };
  var exported = { exports: {} };
  var ctx = {
    module: exported,
    window: {
      SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "k" },
      DB: DB,
      console: {
        log: function () { logs.push(Array.prototype.slice.call(arguments).join(" ")); },
        warn: function (msg, err) { warns.push(String(err && err.message || msg)); }
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
        var ids = [];
        var or = url.match(/or=\(([^)]*)\)/);
        if (or) {
          or[1].split(",").forEach(function (part) {
            var m = /item_id\.eq\.(.*)/.exec(part);
            if (m) ids.push(decodeURIComponent(m[1]));
          });
        } else {
          var one = url.match(/item_id=eq\.([^&]+)/);
          if (one) ids.push(decodeURIComponent(one[1]));
        }
        return Promise.resolve({
          ok: true,
          json: function () {
            return Promise.resolve(stock.filter(function (row) {
              return !ids.length || ids.indexOf(String(row.item_id)) >= 0;
            }));
          }
        });
      }
      return Promise.reject(new Error("unexpected " + url));
    },
    setTimeout: setTimeout,
    console: console,
    encodeURIComponent: encodeURIComponent
  };
  if (opts.flag) store[sync.LOCAL_FLAG] = opts.flag;
  ctx.DB = DB;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return {
    store: store,
    kv: kv,
    logs: logs,
    warns: warns,
    totals: totals,
    creates: creates,
    sumItem: sumItem,
    api: exported.exports,
    run: exported.exports.run
  };
}

function changedRows() {
  return sync.ROWS.filter(function (row) { return Math.abs(Number(row.before) - Number(row.qty)) > 0.5; });
}

(async function () {
  var flagged = harness({ flag: "done:already" });
  assert(await flagged.run() === true && flagged.totals.length === 0 && flagged.creates.length === 0, "local done flag does not write");

  var done = harness({ kv: "done:earlier" });
  assert(await done.run() === true && done.totals.length === 0, "cloud done flag does not write");
  assert(done.store[sync.LOCAL_FLAG], "cloud done copies the local flag");

  var apply = harness({});
  assert(await apply.run() === true, "apply finishes " + apply.warns.join("; "));
  var expectN = changedRows().length;
  assert(apply.totals.length === expectN, "adjusts each changed row " + apply.totals.length + " vs " + expectN);
  assert(apply.totals.every(function (row) { return row.op === sync.NOTE; }), "adjust note");
  assert(apply.creates.length === 0, "existing new-sku codes are not created again");
  var bag = apply.totals.filter(function (row) { return row.id === "BAG4-S02"; })[0];
  assert(bag && bag.code === "B4-S02" && bag.qty === 3300, "bag id is adjusted to the sheet total");
  assert(apply.kv.value.indexOf("done:") === 0, "cloud done flag set");
  assert(apply.store[sync.LOCAL_FLAG], "local done flag set");
  var again = apply.totals.length;
  assert(await apply.run() === true && apply.totals.length === again, "second pass does not write");
  sync.SKIPPED.forEach(function (row) {
    assert(!apply.totals.some(function (hit) { return hit.code === row.code || hit.id === row.code; }), "did not adjust " + row.code);
  });

  var drift = harness({ qty: { "LID - WHITE": 28044 + 10 } });
  assert(await drift.run() === true, "manual drift finishes " + drift.warns.join("; "));
  assert(!drift.totals.some(function (row) { return row.id === "LID - WHITE"; }), "newer total is not overwritten");
  assert(drift.logs.some(function (line) { return line.indexOf("LID - WHITE") >= 0 && line.indexOf("newer manual edit") >= 0; }), "manual skip is logged");
  assert(drift.totals.length === expectN - 1, "other rows still apply");

  var close = harness({ qty: { "LID - WHITE": 28044 + 0.4 } });
  assert(await close.run() === true, "within 0.5 finishes " + close.warns.join("; "));
  assert(close.totals.some(function (row) { return row.id === "LID - WHITE" && row.qty === 22770; }), "within 0.5 still applies");

  var far = harness({ qty: { "LID - WHITE": 28044 + 0.6 } });
  assert(await far.run() === true, "outside 0.5 finishes");
  assert(!far.totals.some(function (row) { return row.id === "LID - WHITE"; }), "outside 0.5 is a manual edit");

  var born = harness({ hide: ["SUP-SHURTAPE"] });
  assert(await born.run() === true, "create finishes " + born.warns.join("; "));
  var made = born.creates.filter(function (row) { return row.code === "SUP-SHURTAPE"; })[0];
  assert(made && made.op === sync.NOTE && made.category === "packaging" && made.unit === "ea" && made.name.indexOf("ShurtTape") >= 0, "creates the tape sku");
  assert(born.totals.some(function (row) { return row.id === "SUP-SHURTAPE" && row.qty === 144; }), "sets the new sku total");

  var cap = harness({});
  cap.api.ROWS.push({ code: "CAP-TEST", before: 1, qty: 100001, category: "packaging", desc: "too big", unit: "ea" });
  cap.api.ROWS.push({ code: "ZERO-PLACE", before: 0, qty: 0, category: "packaging", desc: "empty", unit: "ea", create: true });
  cap.api.ROWS.push({ code: "SEAS-TEST", before: 10, qty: 4, category: "seasoning", desc: "Seasoning test", unit: "lbs" });
  assert(await cap.run() === true, "guards finish " + cap.warns.join("; "));
  assert(!cap.totals.some(function (row) { return row.id === "CAP-TEST" || row.code === "CAP-TEST"; }), "target over 100000 is not applied");
  assert(!cap.creates.some(function (row) { return row.code === "ZERO-PLACE"; }), "zero placeholder is not created");
  assert(!cap.totals.some(function (row) { return row.id === "SEAS-TEST" || row.code === "SEAS-TEST"; }), "lot-tracked row is not adjusted");
  assert(cap.logs.some(function (line) { return line.indexOf("CAP-TEST") >= 0 && line.indexOf("100000") >= 0; }), "cap skip is logged");

  var held = harness({
    qty: { "BKT-BOX": [{ location: "RETURNS", qty: 5900 }] }
  });
  assert(await held.run() === true, "hold guard finishes " + held.warns.join("; "));
  assert(!held.totals.some(function (row) { return row.id === "BKT-BOX"; }), "count below RETURNS is not written");
  assert(held.sumItem("BKT-BOX") === 5900, "RETURNS qty stays put");

  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("ok", sync.ROWS.length, "rows", sync.SKIPPED.length, "skipped");
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});

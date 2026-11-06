#!/usr/bin/env node
/* Packaging 11/02 sync is a separate one-shot from the bag sync.
   Sheet totals are the target. RETURNS and hold locations are not moved.
   Increases go to RECEIVING. No bag rows and no fg_shelf_life. */
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

var src = read("inv-sync-packaging-1102.js");
var ux = read("pack-receive.js");
var html = read("index.html");
var sw = read("service-worker.js");

assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "sync copy has no em dash");
assert(ux.indexOf("\u2014") < 0 && ux.indexOf("\u2013") < 0, "receive copy has no em dash");
assert(src.indexOf("fg_shelf_life") < 0 && ux.indexOf("fg_shelf_life") < 0, "does not set fg shelf life");
assert(src.indexOf("B4-") < 0 && src.indexOf("BAG4-") < 0, "does not name bag skus");
assert(src.indexOf("await D.adjustTotal(it, target, NOTE)") >= 0, "decreases use adjustTotal");
assert(src.indexOf("await D.receive(it, delta, PACK_LOT, NOTE") >= 0, "increases park in RECEIVING");
assert(src.indexOf("below returns or hold qty") >= 0, "hold guard");
assert(src.indexOf("PACK-1102") >= 0, "pack lot");
assert(src.indexOf("SUP-LABPAP") >= 0 && src.indexOf("SUP-LABOB") >= 0, "label paper note");
assert(src.indexOf('{ code: "SUP-LABOB"') < 0, "does not sync a missing SUP-LABOB id");
assert(html.indexOf("inv-sync-packaging-1102.js") < 0, "index does not load the stale packaging sync");
assert(html.indexOf("inv-sync-1102.js") < 0, "index does not load the stale bag sync");
assert(html.indexOf('src="inv-sync-1106.js?b=1"') >= 0, "index loads the lot sync");
assert(html.indexOf('src="pack-receive.js?b=3"') > html.indexOf('src="raw-exp.js'), "receive helper follows raw expiration");
assert(sw.indexOf("./inv-sync-packaging-1102.js") < 0, "sw does not precache the stale packaging sync");
assert(sw.indexOf('"./pack-receive.js"') >= 0, "sw precaches receive helper");
assert(ux.indexOf("3021") >= 0 && ux.indexOf("S-14632") >= 0, "supplier aliases");
assert(ux.indexOf("The Inventory 2026 Google Sheet is not the live count.") >= 0, "sheet is not the live count");

global.DB = {
  items: function () {
    return [
      { id: "MCASE-BOX", code: "MCASE-BOX", name: "Master Case Box", flavor: "Packaging", category: "packaging" },
      { id: "BOX-S-14632", code: "BOX-S-14632", name: "BABY BUCKET MASTER SPORTS WH 6CT", category: "BUCKETS BOX" },
      { id: "LID-BLUE", code: "LID-BLUE", name: "Bucket Lids - Blue", category: "bucket" },
      { id: "LID-DKBLUE", code: "LID-DKBLUE", name: "Bucket Lids - Blue (alt)", category: "bucket" },
      { id: "B4-S01", code: "B4-S01", name: "Bags 4oz", category: "bag4" },
      { id: "SEAS-S01", code: "SEAS-S01", name: "Seasoning", category: "seasoning" }
    ];
  }
};
var receive = require("../pack-receive.js");
assert(receive.candidates("3021")[0].id === "MCASE-BOX", "supplier 3021");
assert(receive.candidates("#3021")[0].id === "MCASE-BOX", "hash 3021");
assert(receive.candidates("S-14632")[0].id === "BOX-S-14632", "supplier S-14632");
assert(receive.candidates("blue").length > 1, "blue is not guessed");
assert(receive.isPackItem(receive.candidates("3021")[0]), "master case is packaging");
assert(!receive.isPackItem({ category: "bag4" }) && !receive.isPackItem({ category: "seasoning" }), "bags and seasoning stay on their own screens");

var sync = require("../inv-sync-packaging-1102.js");
assert(sync.ROWS.length === 33, "row count " + sync.ROWS.length);
assert(sync.CREATES.length === 2, "two new items");
assert(sync.CREATES[0].code === "BOX-S-14632" && sync.CREATES[0].category === "BUCKETS BOX" && sync.CREATES[0].unit === "box" && sync.CREATES[0].qty === 4300, "baby bucket master");
assert(sync.CREATES[1].code === "BKT-STICKER-PIZZA" && sync.CREATES[1].category === "sticker" && sync.CREATES[1].unit === "each" && sync.CREATES[1].qty === 12765, "pizza stickers");
var qtyOf = {};
sync.ROWS.forEach(function (row) { qtyOf[row.code] = row.qty; });
assert(qtyOf["MCASE-BOX"] === 6375, "master case target");
assert(qtyOf["LID-BLUE"] === 4088 && qtyOf["LID-DKBLUE"] === 617, "blue lids stay distinct");
assert(qtyOf["SUP-LABPAP"] === 80850 && qtyOf["SUP-LABECOM"] === 48000, "labels");
assert(qtyOf["SUP-DISHEA"] === 6142, "display head excludes salt and vinegar");
["SUP-BOX", "SUP-BOXX", "POLY-LG", "BKT-STICKER", "B4-S01", "SUP-DISHEA-SV"].forEach(function (code) {
  assert(!Object.prototype.hasOwnProperty.call(qtyOf, code), "held or skipped " + code);
});

function harness(opts) {
  var store = {};
  var kv = { value: opts.kv || "" };
  var items = {};
  var stock = [];
  sync.ROWS.forEach(function (row) {
    items[row.code] = { id: row.code, code: row.code, name: row.code, flavor: row.code, category: "packaging", unit: "each" };
    var qty = Object.prototype.hasOwnProperty.call(opts.qty || {}, row.code) ? opts.qty[row.code] : row.qty;
    if (Array.isArray(qty)) qty.forEach(function (part) { stock.push({ item_id: row.code, location: part.location, qty: part.qty, lot: part.lot || "" }); });
    else stock.push({ item_id: row.code, location: "RECEIVING", qty: qty, lot: "" });
  });
  (opts.hide || []).forEach(function (code) {
    delete items[code];
    for (var h = stock.length - 1; h >= 0; h--) if (stock[h].item_id === code) stock.splice(h, 1);
  });
  var receives = [];
  var adjusts = [];
  var totals = [];
  var creates = [];
  var warns = [];
  function sumItem(code) {
    return stock.reduce(function (s, row) { return s + (row.item_id === code ? Number(row.qty) : 0); }, 0);
  }
  function atLoc(code, loc) {
    return stock.reduce(function (s, row) {
      return s + (row.item_id === code && row.location === loc ? Number(row.qty) : 0);
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
        if (String(it.code).toLowerCase() === key || String(it.id).toLowerCase() === key) found = it;
      });
      return found;
    },
    onHand: function (id) { return sumItem(id); },
    stock: function () { return stock; },
    refresh: function () { return Promise.resolve(); },
    kvCloudOn: function () { return true; },
    kvSet: function (key, val) {
      if (key === sync.CLOUD_KEY) kv.value = String(val);
      return Promise.resolve({ ok: true });
    },
    createItem: function (rec) {
      creates.push(rec.code);
      items[rec.code] = { id: rec.code, code: rec.code, name: rec.name, flavor: rec.flavor, category: rec.category, unit: rec.unit };
      return Promise.resolve({ ok: true, item: items[rec.code] });
    },
    receive: function (it, qty, lot, op, meta) {
      receives.push({ code: it.code, qty: qty, lot: lot, loc: meta && meta.location, op: op });
      stock.push({ item_id: it.id, location: (meta && meta.location) || "RECEIVING", qty: qty, lot: lot || "" });
      return Promise.resolve({ ok: true });
    },
    adjust: function (it, loc, newQty, op) {
      adjusts.push({ code: it.code, loc: loc, qty: newQty, op: op });
      var rows = stock.filter(function (row) { return row.item_id === it.id && row.location === loc; });
      if (!rows.length) stock.push({ item_id: it.id, location: loc, qty: newQty, lot: "" });
      else {
        rows[0].qty = newQty;
        for (var i = 1; i < rows.length; i++) rows[i].qty = 0;
      }
      return Promise.resolve({ ok: true });
    },
    adjustTotal: function (it, target, op) {
      totals.push({ code: it.code, qty: target, op: op });
      var rows = stock.filter(function (row) { return row.item_id === it.id; });
      var cur = rows.reduce(function (s, row) { return s + Number(row.qty); }, 0);
      if (cur === target) return Promise.resolve({ ok: true, unchanged: true });
      var open = rows.filter(function (row) { return !sync.SKIP_LOCS[String(row.location || "").toUpperCase()] && Number(row.qty) !== 0; });
      var loc = "RECEIVING";
      if (open.length) {
        open.sort(function (a, b) { return Number(b.qty) - Number(a.qty); });
        loc = open[0].location;
      }
      var primary = atLoc(it.id, loc);
      var next = target - (cur - primary);
      if (next < -0.001) return Promise.resolve({ ok: false, blocked: true });
      return DB.adjust(it, loc, next, op).then(function () { return { ok: true, location: loc }; });
    }
  };
  var exported = { exports: {} };
  var ctx = {
    module: exported,
    window: {
      SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "k" },
      DB: DB,
      console: { log: function () {}, warn: function (msg, err) { warns.push(String(err && err.message || msg)); } }
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }
    },
    fetch: function (url) {
      url = String(url);
      if (url.indexOf("kv_status") >= 0) {
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve(kv.value ? [{ value: kv.value }] : []); } });
      }
      if (url.indexOf("/stock") >= 0) {
        var code = "";
        var mark = "item_id=eq.";
        var at = url.indexOf(mark);
        if (at >= 0) {
          var rest = url.slice(at + mark.length);
          var end = rest.length;
          var amp = rest.indexOf("&");
          var paren = rest.indexOf(")");
          if (amp >= 0 && amp < end) end = amp;
          if (paren >= 0 && paren < end) end = paren;
          code = decodeURIComponent(rest.slice(0, end));
        }
        return Promise.resolve({
          ok: true,
          json: function () { return Promise.resolve(stock.filter(function (row) { return !code || row.item_id === code; })); }
        });
      }
      return Promise.reject(new Error("unexpected " + url));
    },
    setTimeout: setTimeout,
    console: { log: function () {}, warn: function (msg, err) { warns.push(String(err && err.message || msg)); } },
    encodeURIComponent: encodeURIComponent
  };
  if (opts.flag) store[sync.LOCAL_FLAG] = opts.flag;
  ctx.DB = DB;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { store: store, kv: kv, receives: receives, adjusts: adjusts, totals: totals, creates: creates, warns: warns, sumItem: sumItem, run: exported.exports.run };
}

function tick() { return new Promise(function (resolve) { setImmediate(resolve); }); }
async function settle() {
  for (var i = 0; i < 40; i++) await tick();
  await new Promise(function (resolve) { setTimeout(resolve, 1400); });
  for (var j = 0; j < 20; j++) await tick();
}

(async function () {
  var flagged = harness({ flag: "done:already" });
  var flaggedRun = await flagged.run();
  assert(flaggedRun === true && flagged.receives.length === 0 && flagged.totals.length === 0, "local done flag does not write");

  var done = harness({ kv: "done:earlier" });
  await settle();
  var doneRun = await done.run();
  assert(doneRun === true && done.receives.length === 0 && done.totals.length === 0, "cloud done flag does not write");

  var match = harness({});
  var matchRun = await match.run();
  await settle();
  assert(matchRun === true, "matching pass finishes " + match.warns.join("; "));
  assert(match.receives.length === 0 && match.totals.length === 0, "matching totals are not rewritten");
  assert(match.kv.value.indexOf("done:") === 0, "matching pass sets the done flag");

  var up = harness({ qty: { "CASEBOX-12": 35900 } });
  var upRun = await up.run();
  await settle();
  assert(upRun === true, "increase finishes " + up.warns.join("; "));
  assert(up.receives.length === 1 && up.receives[0].code === "CASEBOX-12" && up.receives[0].qty === 11225 && up.receives[0].lot === "PACK-1102" && up.receives[0].loc === "RECEIVING", "increase parks the gap in RECEIVING");
  assert(up.totals.length === 0, "increase does not call adjustTotal");
  assert(up.sumItem("CASEBOX-12") === 47125, "increase hits the sheet total");

  var down = harness({ qty: { "LID-BLACK": 148 } });
  var downRun = await down.run();
  await settle();
  assert(downRun === true, "decrease finishes " + down.warns.join("; "));
  assert(down.totals.length === 1 && down.totals[0].code === "LID-BLACK" && down.totals[0].qty === 139 && down.totals[0].op === sync.NOTE, "decrease uses adjustTotal");
  assert(down.sumItem("LID-BLACK") === 139, "decrease hits the sheet total");

  var spread = harness({
    qty: { "MCASE-BOX": [{ location: "DOCK-11", qty: 20000 }, { location: "A-01-L1", qty: 12901 }] }
  });
  var spreadRun = await spread.run();
  await settle();
  assert(spreadRun === true, "spread decrease finishes " + spread.warns.join("; "));
  assert(spread.totals.some(function (row) { return row.code === "MCASE-BOX"; }), "spread tries adjustTotal");
  assert(spread.adjusts.some(function (row) { return row.code === "MCASE-BOX"; }), "spread peels open locations");
  assert(spread.sumItem("MCASE-BOX") === 6375, "spread total matches the sheet");

  var held = harness({
    qty: { "BKT-CAMO": [{ location: "RETURNS", qty: 200 }, { location: "RECEIVING", qty: 10 }] }
  });
  var heldRun = await held.run();
  await settle();
  assert(heldRun === true, "hold guard finishes " + held.warns.join("; "));
  assert(!held.totals.some(function (row) { return row.code === "BKT-CAMO"; }) && !held.adjusts.some(function (row) { return row.code === "BKT-CAMO"; }), "qty under RETURNS is not written");
  assert(held.sumItem("BKT-CAMO") === 210, "RETURNS qty stays put");

  var born = harness({ hide: ["BOX-S-14632"], qty: {} });
  born.qty = null;
  var bornRun = await born.run();
  await settle();
  assert(bornRun === true, "create finishes " + born.warns.join("; "));
  assert(born.creates.indexOf("BOX-S-14632") >= 0, "creates the missing baby bucket master");
  assert(born.sumItem("BOX-S-14632") === 4300, "new item is seeded through the sync");

  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("ok", sync.ROWS.length, "packaging rows");
})();

#!/usr/bin/env node
/* Run the packaging sync once against cloud, using the same module the app loads.
   A second run stops on the done flag. Pass --apply to write. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var cfgSrc = fs.readFileSync(path.join(root, "config.js"), "utf8");
var url = (cfgSrc.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
var key = (cfgSrc.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
if (!url || !key) {
  console.error("missing supabase config");
  process.exit(1);
}

function headers(extra) {
  return Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  }, extra || {});
}
async function rest(pathname, opts) {
  var res = await fetch(url + pathname, opts);
  var text = await res.text();
  if (!res.ok) throw new Error(pathname + " " + res.status + " " + text.slice(0, 400));
  return text ? JSON.parse(text) : null;
}
async function page(pathname) {
  var out = [];
  var start = 0;
  var order = pathname.indexOf("/stock") >= 0 ? "item_id.asc,location.asc,lot.asc" : "id.asc";
  for (;;) {
    var rows = await rest(pathname + (pathname.indexOf("?") >= 0 ? "&" : "?") + "order=" + order + "&limit=1000&offset=" + start, { headers: headers() });
    rows = rows || [];
    out = out.concat(rows);
    if (rows.length < 1000) break;
    start += rows.length;
  }
  return out;
}

function num(n) {
  var x = Number(n);
  return x === x ? Math.round(x * 1000) / 1000 : 0;
}
function planQtyDelta(cache, itemId, loc, delta) {
  delta = num(delta);
  if (!delta) return [];
  var rows = cache.filter(function (r) { return r.item_id === itemId && r.location === loc && num(r.qty) > 0; })
    .slice().sort(function (a, b) { return num(b.qty) - num(a.qty); });
  if (delta > 0) return [{ item_id: itemId, location: loc, delta: delta, lot: rows.length ? (rows[0].lot || "") : "" }];
  var left = -delta;
  var out = [];
  rows.forEach(function (r) {
    if (left <= 0) return;
    var take = Math.min(num(r.qty), left);
    if (!(take > 0)) return;
    out.push({ item_id: itemId, location: loc, delta: -take, lot: r.lot || "" });
    left = num(left - take);
  });
  if (left > 0.0001) out.push({ item_id: itemId, location: loc, delta: -left, lot: rows.length ? (rows[0].lot || "") : "" });
  return out;
}

async function main() {
  var apply = process.argv.indexOf("--apply") >= 0;
  var syncSrc = fs.readFileSync(path.join(root, "inv-sync-packaging-1102.js"), "utf8");
  var items = await page("/rest/v1/items?select=id,code,name,flavor,category,unit,reorder,supplier");
  var codes = {};
  items.forEach(function (it) { codes[it.id] = it; if (it.code) codes[it.code] = it; });
  var ids = [];
  var previewExports = { exports: {} };
  var preview = { module: previewExports, window: {}, console: console };
  vm.createContext(preview);
  vm.runInContext(syncSrc, preview);
  var spec = previewExports.exports;
  spec.ROWS.forEach(function (row) { if (ids.indexOf(row.code) < 0) ids.push(row.code); });
  var filter = "or=(" + ids.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")";
  var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty&" + filter);
  function sumOf(code) {
    return stock.reduce(function (s, row) { return s + (row.item_id === code ? num(row.qty) : 0); }, 0);
  }
  spec.ROWS.forEach(function (row) {
    console.log([row.code, sumOf(row.code), "->", row.qty].join("\t"));
  });
  if (!apply) {
    console.log("dry run only");
    return;
  }
  var prior = await rest("/rest/v1/kv_status?key=eq." + encodeURIComponent(spec.CLOUD_KEY) + "&select=value", { headers: headers() });
  if (prior && prior[0] && String(prior[0].value).indexOf("done:") === 0) {
    console.log("already done");
    return;
  }

  var cacheItems = items.slice();
  var cacheStock = stock.map(function (row) { return { item_id: row.item_id, location: row.location, lot: row.lot || "", qty: num(row.qty) }; });
  async function reload(id) {
    var rows = await page("/rest/v1/stock?select=item_id,location,lot,qty&item_id=eq." + encodeURIComponent(id));
    cacheStock = cacheStock.filter(function (row) { return row.item_id !== id; });
    rows.forEach(function (row) {
      cacheStock.push({ item_id: row.item_id, location: row.location, lot: row.lot || "", qty: num(row.qty) });
    });
  }
  async function rpc(itemId, loc, delta, lot) {
    if (!num(delta)) return;
    await rest("/rest/v1/rpc/fn_apply_delta", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ p_item: itemId, p_loc: loc, p_delta: delta, p_lot: lot || "" })
    });
  }
  async function log(action, detail, op) {
    await rest("/rest/v1/transactions", {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ action: action, detail: detail, operator: op })
    });
  }
  function fmt(n) { return (Math.round(num(n) * 100) / 100).toLocaleString("en-US"); }
  var DB = {
    mode: "cloud",
    items: function () { return cacheItems; },
    itemByCode: function (code) {
      var key = String(code || "").trim().toLowerCase();
      for (var i = 0; i < cacheItems.length; i++) {
        var it = cacheItems[i];
        if (String(it.code || "").toLowerCase() === key || String(it.id || "").toLowerCase() === key || String(it.name || "").toLowerCase() === key) return it;
      }
      return null;
    },
    onHand: function (id) {
      var it = DB.itemByCode(id) || { id: id, code: id };
      return cacheStock.reduce(function (s, row) {
        return s + (row.item_id === it.id || row.item_id === it.code ? num(row.qty) : 0);
      }, 0);
    },
    stock: function () { return cacheStock; },
    refresh: async function () {
      var wanted = {};
      spec.ROWS.forEach(function (row) {
        var it = DB.itemByCode(row.code);
        if (it) wanted[it.id] = 1;
      });
      var keys = Object.keys(wanted);
      if (!keys.length) return;
      var got = await page("/rest/v1/stock?select=item_id,location,lot,qty&or=(" + keys.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")");
      cacheStock = got.map(function (row) { return { item_id: row.item_id, location: row.location, lot: row.lot || "", qty: num(row.qty) }; });
    },
    kvCloudOn: function () { return true; },
    kvSet: async function (k, val) {
      await rest("/rest/v1/kv_status?on_conflict=key", {
        method: "POST",
        headers: headers({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({ key: k, value: String(val), updated_at: new Date().toISOString() })
      });
      var got = await rest("/rest/v1/kv_status?key=eq." + encodeURIComponent(k) + "&select=value", { headers: headers() });
      if (!got || !got[0] || String(got[0].value) !== String(val)) return { ok: false };
      return { ok: true };
    },
    createItem: async function (rec) {
      var existing = DB.itemByCode(rec.code);
      if (existing) return { ok: true, item: existing, existed: true };
      var row = {
        id: rec.code, code: rec.code, name: rec.name, flavor: rec.flavor || rec.name,
        category: rec.category || "other", unit: rec.unit || "ea", reorder: Number(rec.reorder) || 0, supplier: rec.supplier || null
      };
      var made = await rest("/rest/v1/items", {
        method: "POST",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify(row)
      });
      var saved = made && made[0] ? made[0] : row;
      cacheItems.push(saved);
      await log("Item created", saved.name + " [" + saved.code + "]", spec.NOTE);
      return { ok: true, item: saved };
    },
    receive: async function (item, qty, lot, op, meta) {
      var loc = (meta && meta.location) || "RECEIVING";
      await rpc(item.id, loc, qty, lot || "");
      await log("Receive", fmt(qty) + " " + (item.unit || "") + " " + (item.flavor || item.name || "") + " -> " + loc, op);
      await reload(item.id);
      return { ok: true, location: loc };
    },
    adjust: async function (item, loc, newQty, op) {
      var cur = cacheStock.reduce(function (s, row) {
        return s + (row.item_id === item.id && row.location === loc ? num(row.qty) : 0);
      }, 0);
      var deltas = planQtyDelta(cacheStock, item.id, loc, num(newQty) - cur);
      for (var i = 0; i < deltas.length; i++) await rpc(deltas[i].item_id, deltas[i].location, deltas[i].delta, deltas[i].lot);
      if (deltas.length) await log("Count/Adjust", (item.flavor || item.code) + " @ " + loc + ": " + fmt(cur) + " -> " + fmt(newQty), op);
      await reload(item.id);
      return { ok: true };
    },
    adjustTotal: async function (item, newTotal) {
      newTotal = num(newTotal);
      var rows = cacheStock.filter(function (row) { return row.item_id === item.id; });
      var cur = rows.reduce(function (s, row) { return s + num(row.qty); }, 0);
      var open = rows.filter(function (row) { return !spec.SKIP_LOCS[String(row.location || "").toUpperCase()] && num(row.qty) !== 0; });
      var loc = "RECEIVING";
      if (open.length) {
        open.sort(function (a, b) { return num(b.qty) - num(a.qty); });
        loc = open[0].location;
      }
      if (newTotal === cur) return { ok: true, unchanged: true, location: loc };
      var primary = rows.filter(function (row) { return row.location === loc; }).reduce(function (s, row) { return s + num(row.qty); }, 0);
      var next = num(newTotal - (cur - primary));
      if (next < -0.001) return { ok: false, blocked: true, location: loc };
      await DB.adjust(item, loc, Math.max(next, 0), spec.NOTE);
      return { ok: true, location: loc };
    }
  };

  var mem = {};
  var sandbox = {
    module: { exports: {} },
    window: { SMACKIN_CONFIG: { SUPABASE_URL: url, SUPABASE_ANON_KEY: key }, DB: DB },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); }
    },
    fetch: fetch,
    setTimeout: setTimeout,
    console: console,
    encodeURIComponent: encodeURIComponent,
    URL: URL,
    Date: Date
  };
  sandbox.DB = DB;
  vm.createContext(sandbox);
  vm.runInContext(syncSrc, sandbox);
  var ran = await sandbox.module.exports.run();
  console.log(ran ? "applied" : "not applied");
  if (!ran) process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});

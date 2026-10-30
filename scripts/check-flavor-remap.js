#!/usr/bin/env node
/* One-shot remap of blank demand flavor codes. No network.
   The 16 live strings are the Oct 30 2026 demand_lines rows. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function same(a, b, msg) { if (a !== b) fail.push(msg + " (" + a + " !== " + b + ")"); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var LIVE = [
  ["1", "UNMAPPED: SMACKN GRL PRM SNFLWR SDS", "Garlic Parmesan", "S04"],
  ["2", "UNMAPPED: SMACKIN CHDR JAL SNFL SD", "Cheddar Jalapeno", "S07"],
  ["3", "UNMAPPED: SUNFLOWER SEED CRCKD PEPPR 4OZ", "Cracked Pepper", "S06"],
  ["4", "UNMAPPED: SMACKIN SNFLWR SDS ORIG", "OG Original", "S01"],
  ["5", "UNMAPPED: SMACKIN SNFLWR SDS CRCKD PEPPER", "Cracked Pepper", "S06"],
  ["6", "UNMAPPED: SMACKIN SNFLWR SDS MPLE BRWN SUG", "Maple Brown Sugar", "S09"],
  ["7", "UNMAPPED: SMACKIN SNFLWR SDS ORIG", "OG Original", "S01"],
  ["8", "UNMAPPED: SMACKIN' SEEDS SNFL CHED JLP 4Z", "Cheddar Jalapeno", "S07"],
  ["9", "UNMAPPED: SMACKIN' SEEDS SNFL RNCH 4Z", "Ranch", "S08"],
  ["10", "UNMAPPED: SMACKIN SNFLWR SDS ORIG", "OG Original", "S01"],
  ["11", "UNMAPPED: SMACKIN' SEEDS SNFL RNCH 4Z", "Ranch", "S08"],
  ["12", "UNMAPPED: SMACKIN' SEEDS SNFL CHED JLP 4Z", "Cheddar Jalapeno", "S07"],
  ["13", "UNMAPPED: SMACKIN SNFLWR SDS CHED/JALA", "Cheddar Jalapeno", "S07"],
  ["14", "UNMAPPED: SMACKIN SNFLWR SDS CRCKD PEPPER", "Cracked Pepper", "S06"],
  ["15", "UNMAPPED: SMACKIN SNFLWR SDS ORIG", "OG Original", "S01"],
  ["16", "UNMAPPED: SMACKIN SNFLWR SDS CHED/JALA", "Cheddar Jalapeno", "S07"]
];

function load(extra) {
  var store = {};
  var rows = extra.rows.map(function (r) { return Object.assign({ status: r.status || "Open" }, r); });
  var updates = [];
  var audits = [];
  var deletes = [];
  var refreshes = 0;
  var tables = [];
  var ctx = {
    console: console,
    setTimeout: function () {},
    location: { search: extra.search || "" },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon" },
    DB: {
      mode: extra.mode || "cloud",
      demandLines: function () { return rows; },
      refresh: function () { refreshes++; return Promise.resolve(); }
    },
    supabase: {
      createClient: function () {
        return {
          from: function (table) {
            tables.push(table);
            var state = { op: "", patch: null, id: null };
            var api = {
              select: function () {
                if (state.op === "update") {
                  if (table !== "demand_lines") return Promise.resolve({ data: null, error: { message: "update " + table } });
                  if (extra.writeError) return Promise.resolve({ data: null, error: { message: extra.writeError } });
                  var keys = Object.keys(state.patch || {});
                  if (keys.join(",") !== "flavor,flavor_code") {
                    return Promise.resolve({ data: null, error: { message: "fields " + keys.join(",") } });
                  }
                  var row = null;
                  for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(state.id)) row = rows[i];
                  if (!row || String(row.flavor_code || "").trim()) return Promise.resolve({ data: [], error: null });
                  var prevStatus = row.status;
                  row.flavor = state.patch.flavor;
                  row.flavor_code = state.patch.flavor_code;
                  updates.push({ id: row.id, flavor: row.flavor, flavor_code: row.flavor_code, status: row.status });
                  if (row.status !== prevStatus) return Promise.resolve({ data: null, error: { message: "status changed" } });
                  return Promise.resolve({ data: [{ id: row.id, flavor: row.flavor, flavor_code: row.flavor_code }], error: null });
                }
                return api;
              },
              update: function (patch) { state.op = "update"; state.patch = patch; return api; },
              insert: function (rec) {
                if (table !== "transactions") return Promise.resolve({ error: { message: "insert " + table } });
                audits.push(rec);
                return Promise.resolve({ error: null });
              },
              delete: function () { deletes.push(table); return Promise.resolve({ error: { message: "delete " + table } }); },
              eq: function (col, val) { if (col === "id") state.id = val; return api; },
              or: function () { return api; },
              order: function () { return api; },
              range: function () {
                var blank = rows.filter(function (r) { return !String(r.flavor_code || "").trim(); });
                return Promise.resolve({ data: blank.map(function (r) { return { id: r.id, flavor: r.flavor, flavor_code: r.flavor_code }; }), error: null });
              }
            };
            return api;
          }
        };
      }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("demand.js"), ctx, { filename: "demand.js" });
  vm.runInContext(read("demand-flavor-remap.js"), ctx, { filename: "demand-flavor-remap.js" });
  return { ctx: ctx, rows: rows, updates: updates, audits: audits, deletes: deletes, tables: tables, refreshes: function () { return refreshes; }, store: store };
}

var src = read("demand-flavor-remap.js");
eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "remap dash");
eq(src.indexOf(".delete(") < 0, "no delete");
eq(src.indexOf('from("stock")') < 0 && src.indexOf("from('stock')") < 0, "no stock");
eq(src.indexOf("demand_lines") >= 0, "writes demand_lines");
eq(src.indexOf("flavor_code") >= 0, "writes flavor_code");

var html = read("index.html");
var sw = read("service-worker.js");
eq(html.indexOf('src="demand-flavor-remap.js?b=1"') >= 0, "script tag");
eq(sw.indexOf('"./demand-flavor-remap.js"') >= 0, "sw asset");
eq(sw.indexOf('const CACHE = "smackin-inv-v261"') >= 0, "cache");
eq(read("build-id.txt").trim() === "smackin-inv-v261", "build id");

var probeRows = LIVE.map(function (r) { return { id: r[0], flavor: r[1], flavor_code: "", status: r[0] === "13" ? "Complete" : (r[0] === "1" || r[0] === "3" ? "Open" : "Shipped") }; });
probeRows.push({ id: "keep", flavor: "UNMAPPED: SUNFLOWER SEED 4OZ", flavor_code: "", status: "Open" });
probeRows.push({ id: "pepper", flavor: "UNMAPPED: PEPPER", flavor_code: "", status: "Open" });
probeRows.push({ id: "coded", flavor: "UNMAPPED: ORIG", flavor_code: "S01", status: "Open" });
probeRows.push({ id: "plain", flavor: "Ranch", flavor_code: "", status: "Shipped" });

var planned = load({ rows: probeRows });
var patches = planned.ctx.DEMANDFLAVOR.plan(probeRows);
same(patches.length, 17, "plan count");
var byId = {};
patches.forEach(function (p) {
  byId[p.id] = p;
  same(Object.keys(p).sort().join(","), "flavor,flavor_code,id", "patch keys " + p.id);
});
LIVE.forEach(function (r) {
  eq(!!byId[r[0]], "planned " + r[1]);
  if (byId[r[0]]) {
    same(byId[r[0]].flavor, r[2], "flavor " + r[1]);
    same(byId[r[0]].flavor_code, r[3], "code " + r[1]);
  }
});
eq(!byId.keep, "plain sunflower stays");
eq(!byId.pepper, "pepper stays");
eq(!byId.coded, "coded row stays");
same(byId.plain && byId.plain.flavor, "Ranch", "blank ranch name");
same(byId.plain && byId.plain.flavor_code, "S08", "blank ranch code");

var dry = load({ rows: probeRows.map(function (r) { return Object.assign({}, r); }), search: "?flavorremap=dry" });
dry.ctx.DEMANDFLAVOR.run().then(function (ok) {
  eq(ok === true, "dry ok");
  eq(dry.updates.length === 0, "dry does not write");
  eq(dry.audits.length === 0, "dry does not audit");
  eq(!dry.store["demand-flavor-remap-2026-10-30-v1"], "dry does not mark done");
  eq(dry.deletes.length === 0, "dry no delete");

  var live = load({ rows: probeRows.map(function (r) { return Object.assign({}, r); }) });
  return live.ctx.DEMANDFLAVOR.run().then(function (liveOk) {
    eq(liveOk === true, "remap ok");
    same(live.updates.length, 17, "writes");
    eq(live.audits.length === 1, "one audit");
    eq(live.audits[0] && live.audits[0].action === "Demand flavor remap", "audit action");
    eq(live.deletes.length === 0, "no deletes");
    eq(live.tables.indexOf("stock") < 0, "stock not opened");
    eq(live.refreshes() === 1, "refresh");
    eq(!!live.store["demand-flavor-remap-2026-10-30-v1"], "done flag");
    var still = {};
    live.rows.forEach(function (r) { still[r.id] = r; });
    LIVE.forEach(function (r) {
      same(still[r[0]].flavor, r[2], "stored flavor " + r[0]);
      same(still[r[0]].flavor_code, r[3], "stored code " + r[0]);
      if (r[0] === "13") same(still[r[0]].status, "Complete", "complete status kept");
      else if (r[0] === "1" || r[0] === "3") same(still[r[0]].status, "Open", "open status kept");
      else same(still[r[0]].status, "Shipped", "shipped status kept");
    });
    same(still.keep.flavor, "UNMAPPED: SUNFLOWER SEED 4OZ", "noise row kept");
    same(String(still.keep.flavor_code || ""), "", "noise code kept");
    same(still.coded.flavor, "UNMAPPED: ORIG", "coded flavor kept");
    same(still.coded.flavor_code, "S01", "coded code kept");
    var before = live.updates.length;
    return live.ctx.DEMANDFLAVOR.run().then(function (again) {
      eq(again === true, "second load ok");
      same(live.updates.length, before, "second load skipped");
      live.ctx.location.search = "?flavorremap=force";
      still["1"].flavor = "UNMAPPED: SMACKN GRL PRM SNFLWR SDS";
      still["1"].flavor_code = "";
      return live.ctx.DEMANDFLAVOR.run().then(function (forced) {
        eq(forced === true, "force ok");
        same(still["1"].flavor, "Garlic Parmesan", "force remapped");
        same(still["1"].flavor_code, "S04", "force code");
        var local = load({ rows: probeRows.map(function (r) { return Object.assign({}, r); }), mode: "local" });
        return local.ctx.DEMANDFLAVOR.run().then(function (localOk) {
          eq(localOk === false, "local mode skips");
          eq(local.updates.length === 0, "local mode does not write");
          eq(!local.store["demand-flavor-remap-2026-10-30-v1"], "local mode leaves flag clear");
          var bad = load({ rows: probeRows.map(function (r) { return Object.assign({}, r); }), writeError: "permission denied" });
          return bad.ctx.DEMANDFLAVOR.run().then(function (badOk) {
            eq(badOk === false, "write failure");
            eq(!bad.store["demand-flavor-remap-2026-10-30-v1"], "write failure leaves flag clear");
          });
        });
      });
    });
  });
}).then(function () {
  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("ok", LIVE.length, "live lines");
}).catch(function (err) {
  console.error(fail.concat([err && err.stack || err]).join("\n"));
  process.exit(1);
});

#!/usr/bin/env node
/* Invariants for the WIP Production history import. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

["wip-production.js", "mfg-history.js", "wip_production_daily.sql", "service-worker.js", "index.html", "scripts/check-wip-production.js"].forEach(function (rel) {
  var text = read(rel);
  eq(text.indexOf("\u2014") < 0 && text.indexOf("\u2013") < 0, rel + " dash");
});

var sw = read("service-worker.js");
var html = read("index.html");
var sql = read("wip_production_daily.sql");
eq(sw.indexOf('const CACHE = "smackin-inv-v253"') >= 0, "cache bump");
eq(sw.indexOf('"./wip-production.js"') >= 0, "sw asset");
eq(html.indexOf('mfg-history.js?b=4') >= 0, "history cache bust");
eq(html.indexOf('wip-production.js?b=1') >= 0, "seed script");
eq(html.indexOf("mfg-history.js?b=4") < html.indexOf("wip-production.js?b=1"), "script order");
eq(sql.indexOf("wip_production_daily") >= 0, "sql table");
eq(sql.indexOf("enable row level security") >= 0, "sql rls");
eq(sql.toLowerCase().indexOf("drop table") < 0, "sql does not drop");
eq(sql.toLowerCase().indexOf("pmac_history") >= 0 && sql.toLowerCase().indexOf("insert into") < 0, "sql does not insert history");
eq(read("wip-production.js").indexOf("pmac_history") >= 0 && read("wip-production.js").indexOf('.from("pmac_history")') < 0, "seed does not query pmac");
eq(read("wip-production.js").indexOf('.from("mixing_history")') < 0, "seed does not query mixing");
eq(read("wip-production.js").indexOf('.from("mfg_daily")') < 0, "seed does not query mfg_daily");
eq(read("wip-production.js").indexOf('.from("production_output")') < 0, "seed does not query production_output");
eq(read("mfg-history.js").indexOf("Daily units (WIP)") >= 0, "segment label");
eq(read("mfg-history.js").indexOf("P-Mac (packaging)") >= 0, "pmac segment kept");
eq(read("mfg-history.js").indexOf(">Mixing<") >= 0, "mixing segment kept");

function storage() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; }
  };
}

function seedContext(opts) {
  var stored = [];
  var upserts = 0;
  var writeError = opts && opts.writeError;
  var ctx = {
    console: {
      log: function () {},
      error: function () { ctx.errors.push([].join.call(arguments, " ")); },
      warn: function () {}
    },
    errors: [],
    setTimeout: function () {},
    localStorage: storage(),
    location: { search: (opts && opts.search) || "" },
    document: { readyState: "loading", addEventListener: function () {} },
    DB: { mode: "cloud" },
    SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "k" },
    supabase: {
      createClient: function () {
        return {
          from: function (table) {
            if (table !== "wip_production_daily") throw new Error("unexpected table " + table);
            var api = {
              upsert: function (rows, options) {
                upserts++;
                if (!options || options.onConflict !== "prod_date,bag_size,flavor,source") {
                  return Promise.resolve({ error: { message: "bad conflict" } });
                }
                if (writeError) return Promise.resolve({ error: { message: writeError } });
                rows.forEach(function (r) {
                  var i = -1;
                  for (var n = 0; n < stored.length; n++) {
                    var cur = stored[n];
                    if (cur.prod_date === r.prod_date && cur.bag_size === r.bag_size && cur.flavor === r.flavor && cur.source === r.source) i = n;
                  }
                  if (i >= 0) stored[i] = Object.assign({}, r);
                  else stored.push(Object.assign({}, r));
                });
                return Promise.resolve({ error: null });
              },
              select: function () { return api; },
              eq: function () { return api; },
              order: function () { return api; },
              range: function (from, to) {
                var rows = stored.filter(function (r) { return r.source === "wip"; }).map(function (r) {
                  return { prod_date: r.prod_date, bag_size: r.bag_size, flavor: r.flavor, units: String(r.units) };
                });
                rows.sort(function (a, b) {
                  if (a.prod_date !== b.prod_date) return a.prod_date < b.prod_date ? -1 : 1;
                  if (a.bag_size !== b.bag_size) return a.bag_size < b.bag_size ? -1 : 1;
                  return a.flavor < b.flavor ? -1 : a.flavor > b.flavor ? 1 : 0;
                });
                return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
              }
            };
            return api;
          }
        };
      }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(read("wip-production.js"), ctx, { filename: "wip-production.js" });
  return { ctx: ctx, stored: stored, upserts: function () { return upserts; } };
}

var probe = seedContext();
var chk = probe.ctx.WIPPROD.check();
eq(chk.ok, "self check " + chk.error);
eq(chk.sourceDays === 871, "source days " + chk.sourceDays);
eq(chk.days === 866, "unit days " + chk.days);
eq(chk.rows === 5635, "rows " + chk.rows);
eq(chk.units === 28606268, "units " + chk.units);
eq(chk.skipped === 93, "skipped " + chk.skipped);
var lines = probe.ctx.WIPPROD.lines();
function spot(date, bag, flavor) {
  for (var i = 0; i < lines.length; i++) {
    var r = lines[i];
    if (r.prod_date === date && r.bag_size === bag && r.flavor === flavor) return r;
  }
  return null;
}
eq(spot("2023-06-05", "4 oz", "BBQ") && spot("2023-06-05", "4 oz", "BBQ").units === 600, "bbq 4 oz");
eq(spot("2023-06-05", "1.5 oz", "BBQ") && spot("2023-06-05", "1.5 oz", "BBQ").units === 1214, "bbq 1.5 oz");
eq(!spot("2025-06-30", "4 oz", "BBQ"), "ss marker skipped");
var bags = {};
lines.forEach(function (r) { bags[r.bag_size] = 1; eq(r.source === "wip", "source"); });
eq(Object.keys(bags).sort().join(",") === "1.5 oz,4 oz", "bag sizes");

var dry = seedContext({ search: "?wipprod=dry" });
dry.ctx.WIPPROD.run().then(function (ok) {
  eq(ok === true, "dry ok");
  eq(dry.upserts() === 0, "dry does not write");
  eq(!dry.ctx.localStorage.getItem("wip-production-2026-10-28-v1"), "dry does not mark done");
  return probe.ctx.WIPPROD.run();
}).then(function (ok) {
  eq(ok === true, "seed ok");
  eq(probe.stored.length === 5635, "stored rows " + probe.stored.length);
  eq(probe.upserts() === 15, "chunks " + probe.upserts());
  eq(!!probe.ctx.localStorage.getItem("wip-production-2026-10-28-v1"), "done flag");
  return probe.ctx.WIPPROD.run();
}).then(function (ok) {
  eq(ok === true, "second load ok");
  eq(probe.upserts() === 15, "second load skipped write");
  probe.ctx.location.search = "?wipprod=force";
  return probe.ctx.WIPPROD.run();
}).then(function (ok) {
  eq(ok === true, "force ok");
  eq(probe.stored.length === 5635, "force did not duplicate");
  eq(probe.upserts() === 30, "force rewrote");
  var bad = seedContext({ writeError: "permission denied" });
  return bad.ctx.WIPPROD.run().then(function (badOk) {
    eq(badOk === false, "write failure returns false");
    eq(!bad.ctx.localStorage.getItem("wip-production-2026-10-28-v1"), "write failure leaves flag clear");
    eq(bad.ctx.errors.join(" ").indexOf("permission denied") >= 0, "write failure is logged");
  });
}).then(function () {
  return renderHistory();
}).then(function () {
  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("ok", chk.sourceDays, "sheet days,", chk.rows, "unit rows,", chk.days, "days with units");
}).catch(function (e) {
  console.error(fail.concat([e && e.stack || e]).join("\n"));
  process.exit(1);
});

function renderHistory() {
  var nodes = {};
  function makeEl() {
    return {
      id: "", style: {}, innerHTML: "", textContent: "", attrs: {}, className: "",
      setAttribute: function (k, v) { this.attrs[k] = v; },
      getAttribute: function (k) { return this.attrs[k] || ""; },
      appendChild: function (c) { if (c && c.id) nodes[c.id] = c; },
      querySelectorAll: function () { return []; }
    };
  }
  var wipRows = [
    { prod_date: "2023-06-05", bag_size: "4 oz", flavor: "BBQ", units: 600, source: "wip" },
    { prod_date: "2023-06-05", bag_size: "1.5 oz", flavor: "BBQ", units: 1214, source: "wip" },
    { prod_date: "2023-07-01", bag_size: "4 oz", flavor: "OG", units: 100, source: "wip" }
  ];
  var view = makeEl(); view.id = "view"; nodes.view = view;
  var nav = makeEl(); nav.id = "nav"; nodes.nav = nav;
  var ctx = {
    console: console,
    setTimeout: setTimeout,
    Promise: Promise,
    MutationObserver: function () { this.observe = function () {}; },
    document: {
      readyState: "complete",
      head: makeEl(),
      documentElement: makeEl(),
      getElementById: function (id) { return nodes[id] || null; },
      createElement: function () { return makeEl(); },
      addEventListener: function () {}
    },
    SMACKIN_CONFIG: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "k" },
    supabase: {
      createClient: function () {
        return {
          from: function (table) {
            var api = {
              select: function () { return api; },
              eq: function () { return api; },
              order: function () { return api; },
              range: function () {
                var rows = table === "wip_production_daily" ? wipRows : [];
                return Promise.resolve({ data: rows, error: null });
              }
            };
            return api;
          }
        };
      }
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.runInNewContext(read("mfg-history.js"), ctx, { filename: "mfg-history.js" });
  ctx.MFGHIST.open();
  return new Promise(function (resolve) { setTimeout(resolve, 30); }).then(function () {
    var pmac = view.innerHTML;
    eq(pmac.indexOf("P-Mac (packaging)") >= 0, "pmac button");
    eq(pmac.indexOf("Daily units (WIP)") >= 0, "wip button on pmac");
    eq(pmac.indexOf("Runs logged") >= 0, "pmac runs card");
    eq(pmac.indexOf("By operator") >= 0, "pmac operator card");
    eq(pmac.indexOf("\u2014") < 0, "pmac em dash");
    ctx.MFGHIST.setDept("mixing");
    var mixing = view.innerHTML;
    eq(mixing.indexOf("Total Bins") >= 0, "mixing bins");
    eq(mixing.indexOf("Daily units (WIP)") >= 0, "wip button on mixing");
    ctx.MFGHIST.setDept("wip");
    var wip = view.innerHTML;
    eq(wip.indexOf("Total units") >= 0, "wip total");
    eq(wip.indexOf("4 oz units") >= 0, "wip 4 oz");
    eq(wip.indexOf("1.5 oz units") >= 0, "wip 1.5 oz");
    eq(wip.indexOf("Production days") >= 0, "wip days");
    eq(wip.indexOf("1,914") >= 0, "wip total value");
    eq(wip.indexOf("1,214") >= 0, "wip 1.5 value");
    eq(wip.indexOf("Units by month") >= 0, "wip months");
    eq(wip.indexOf("Top flavors") >= 0, "wip flavors");
    eq(wip.indexOf("Recent days") >= 0, "wip recent");
    eq(wip.indexOf("BBQ") >= 0 && wip.indexOf("OG") >= 0, "wip flavor names");
    eq(wip.indexOf("2023-06-05") >= 0, "wip recent date");
    eq(wip.indexOf("By operator") < 0, "wip hides operators");
    eq(wip.indexOf("Blank cells and sheet notes are not counted.") >= 0, "wip note");
    eq(wip.indexOf("\u2014") < 0 && wip.indexOf("\u2013") < 0, "wip dash");
  });
}

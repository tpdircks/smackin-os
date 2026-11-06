#!/usr/bin/env node
/* Headless click test: Michelle removes a line on an old saved PO and a new one.
   The page is the real app. Supabase is a fake client so the PATCH is visible. */
"use strict";

var fs = require("fs");
var http = require("http");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }

var playwright;
try { playwright = require("playwright-core"); }
catch (e) {
  console.error("playwright-core is not installed");
  process.exit(1);
}

var OLD_LINES = JSON.stringify([
  { item: "KEEP-OLD", desc: "Stay", qty: "4", price: "1", lot: "LOT-1" },
  { item: "DROP-OLD", desc: "Go", qty: "0", price: "2", lot: "LOT-1", custom: "old-shape" }
]);
var NEW_LINES = [
  { _lid: "n1", item: "KEEP-NEW", desc: "Stay", qty: "5", price: "3", lot: "LOT-1" },
  { _lid: "n2", item: "DROP-NEW", desc: "Go", qty: "1", price: "4", lot: "LOT-1", custom: "new-shape" }
];

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
      else if (/\.css$/.test(file)) res.setHeader("Content-Type", "text/css");
      res.end(buf);
    });
  });
}

function installFake(seed) {
  window.__smkCalls = [];
  window.__smkAudit = [];
  window.__smkPos = seed.pos.map(function (row) { return JSON.parse(JSON.stringify(row)); });
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function exec(state) {
    var table = state.table;
    var op = state.op;
    if (op === "update" && table === "supplier_pos") {
      var id = "";
      var keys = [];
      state.filters.forEach(function (f) { keys.push(f[0]); if (f[0] === "id") id = String(f[1]); });
      var hit = null;
      for (var i = 0; i < window.__smkPos.length; i++) {
        if (String(window.__smkPos[i].id) === id) hit = window.__smkPos[i];
      }
      if (!hit || keys.join(",") !== "id") {
        window.__smkCalls.push({ op: op, table: table, id: id, matchKeys: keys, ok: false });
        return { data: [], error: { message: "no row" } };
      }
      var before = clone(hit);
      Object.keys(state.payload || {}).forEach(function (k) { hit[k] = state.payload[k]; });
      window.__smkCalls.push({ op: "update", table: table, id: id, matchKeys: keys, payload: clone(state.payload) });
      window.__smkAudit.push({
        table_name: "supplier_pos",
        row_pk: id,
        action: "update",
        user_email: "michelle.nydegger@smackinsnacks.com",
        old_row: before,
        new_row: clone(hit)
      });
      return { data: [clone(hit)], error: null };
    }
    if (op === "select" && table === "supplier_pos") return { data: clone(window.__smkPos), error: null };
    if (op === "select" && table === "items") {
      return { data: [{ id: "I1", code: "BAG", name: "Bag", unit: "ea", reorder: 0, supplier: "", category: "pack" }], error: null };
    }
    return { data: [], error: null };
  }
  function builder(table) {
    var state = { table: table, op: "select", filters: [], payload: null };
    var b = {};
    function chain(name, fn) {
      b[name] = function () { fn.apply(null, arguments); return b; };
    }
    chain("select", function () { if (state.op !== "update") state.op = "select"; });
    chain("insert", function (row) { state.op = "insert"; state.payload = row; });
    chain("update", function (row) { state.op = "update"; state.payload = row; });
    chain("upsert", function (row) { state.op = "upsert"; state.payload = row; });
    chain("delete", function () { state.op = "delete"; });
    chain("eq", function (k, v) { state.filters.push([k, v]); });
    chain("order", function () {});
    chain("limit", function () {});
    chain("in", function () {});
    chain("or", function () {});
    chain("gte", function () {});
    chain("lte", function () {});
    chain("neq", function () {});
    chain("range", function () {});
    b.then = function (resolve, reject) {
      return Promise.resolve(exec(state)).then(resolve, reject);
    };
    return b;
  }
  var session = { user: { id: "michelle-1", email: "michelle.nydegger@smackinsnacks.com" } };
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
          signOut: function () { return Promise.resolve({ error: null }); },
          updateUser: function () { return Promise.resolve({ data: { user: session.user }, error: null }); }
        },
        channel: function () { return ch; },
        rpc: function () { return Promise.resolve({ data: null, error: null }); },
        storage: {
          from: function () {
            return {
              upload: function () { return Promise.resolve({ data: { path: "po" }, error: null }); },
              getPublicUrl: function () { return { data: { publicUrl: "https://example.test/po" } }; },
              remove: function () { return Promise.resolve({ data: [], error: null }); }
            };
          }
        },
        from: function (table) { return builder(table); }
      };
    }
  };
}

async function openPo(page, id) {
  await page.evaluate(function (poId) {
    if (window.UI_go) window.UI_go("purchasing");
    window.UI.spoOpen(poId);
  }, id);
  await page.waitForSelector("#pol-saved button[data-po-act='delete']");
}

async function removeLine(page, item) {
  var before = await page.evaluate(function () { return window.__smkCalls.length; });
  var row = page.locator("#pol-saved tr", { has: page.locator("input[value='" + item + "']") });
  await row.locator("button[data-po-act='delete']").click();
  await page.waitForSelector("#pol-confirm-msg");
  var msg = await page.locator("#pol-confirm-msg").innerText();
  eq(msg.indexOf("Delete this line?") >= 0, "confirm is on the page for " + item);
  await page.locator("#pol-confirm-yes").click();
  await page.waitForFunction(function (n) { return window.__smkCalls.length > n; }, before);
  await page.waitForFunction(function (text) {
    var inputs = document.querySelectorAll("#pol-saved input[data-f='item']");
    for (var i = 0; i < inputs.length; i++) if (inputs[i].value === text) return false;
    return inputs.length > 0;
  }, item);
}

async function main() {
  var server = serve();
  await new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); });
  var port = server.address().port;
  var browser = await playwright.chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  var page = await browser.newPage();
  page.setDefaultTimeout(30000);
  await page.route("**/@supabase/supabase-js@2.116.0*", function (route) {
    route.fulfill({ status: 200, contentType: "application/javascript", body: "/* supabase stub */" });
  });
  await page.route(/service-worker\.js/, function (route) {
    route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: "self.addEventListener('install',function(){});" });
  });
  await page.addInitScript(installFake, {
    pos: [
      { id: "OLD", vendor: "Old Mill", po_num: "OLD-1", po_date: "2026-10-01", total: "6", item_count: 2, notes: "legacy", file_url: "", lines: OLD_LINES, created_at: "2026-10-01T00:00:00Z" },
      { id: "NEW", vendor: "New Co", po_num: "NEW-1", po_date: "2026-11-06", total: "19", item_count: 2, notes: "v291", file_url: "", lines: NEW_LINES, created_at: "2026-11-06T00:00:00Z" }
    ]
  });
  var pageErrors = [];
  page.on("pageerror", function (err) { pageErrors.push(String(err && err.message || err)); });
  await page.goto("http://127.0.0.1:" + port + "/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(function () {
    return window.DB && DB.mode === "cloud" && window.UI && window.POLINES && !document.getElementById("smk-auth");
  });

  await openPo(page, "OLD");
  await removeLine(page, "DROP-OLD");
  var oldCall = await page.evaluate(function () { return window.__smkCalls[0]; });
  eq(oldCall && oldCall.op === "update" && oldCall.table === "supplier_pos" && oldCall.id === "OLD", "old PO sends an update " + JSON.stringify(oldCall));
  eq(oldCall.matchKeys.join(",") === "id", "old update matches id");
  var oldLines = JSON.parse(oldCall.payload.lines);
  eq(oldLines.length === 1 && oldLines[0].item === "KEEP-OLD" && oldLines[0].lot === "LOT-1", "old payload keeps the other line");
  eq(!oldLines.some(function (l) { return l.item === "DROP-OLD"; }), "old payload drops the line");
  var oldAudit = await page.evaluate(function () { return window.__smkAudit[0]; });
  eq(oldAudit && oldAudit.table_name === "supplier_pos" && oldAudit.user_email === "michelle.nydegger@smackinsnacks.com", "old history who");
  eq(String(oldAudit.old_row.lines).indexOf("DROP-OLD") >= 0 && String(oldAudit.old_row.lines).indexOf("old-shape") >= 0, "old history has the full previous row");
  eq(String(oldAudit.new_row.lines).indexOf("DROP-OLD") < 0, "old history new row lost the line");
  var oldStill = await page.evaluate(function () {
    var other = window.__smkPos.filter(function (p) { return p.id === "NEW"; })[0];
    var lines = typeof other.lines === "string" ? JSON.parse(other.lines) : other.lines;
    return lines.map(function (l) { return l.item; }).join(",");
  });
  eq(oldStill === "KEEP-NEW,DROP-NEW", "old delete did not touch the other PO");

  await openPo(page, "NEW");
  await removeLine(page, "DROP-NEW");
  var calls = await page.evaluate(function () { return window.__smkCalls; });
  eq(calls.length === 2 && calls[1].id === "NEW" && calls[1].matchKeys.join(",") === "id", "new PO update by id");
  var newLines = JSON.parse(calls[1].payload.lines);
  eq(newLines.length === 1 && newLines[0]._lid === "n1" && newLines[0].item === "KEEP-NEW", "new format deletes only n2");
  var newAudit = await page.evaluate(function () { return window.__smkAudit[1]; });
  eq(!!newAudit, "new history exists");
  if (newAudit) {
    var newOldLines = typeof newAudit.old_row.lines === "string" ? newAudit.old_row.lines : JSON.stringify(newAudit.old_row.lines);
    var newNewLines = typeof newAudit.new_row.lines === "string" ? newAudit.new_row.lines : JSON.stringify(newAudit.new_row.lines);
    eq(newOldLines.indexOf("new-shape") >= 0 && newNewLines.indexOf("DROP-NEW") < 0, "new history row");
  }
  var reloaded = await page.evaluate(function () {
    var row = window.__smkPos.filter(function (p) { return p.id === "NEW"; })[0];
    var lines = typeof row.lines === "string" ? JSON.parse(row.lines) : row.lines;
    return lines.map(function (l) { return l._lid; }).join(",");
  });
  eq(reloaded === "n1", "reload store no longer has the deleted line");

  var previewCalls = await page.evaluate(function () { return window.__smkCalls.length; });
  await page.evaluate(function () {
    window.POLINES.loadPreview({
      lines: JSON.stringify([
        { item: "KEEP-UP", qty: "2", price: "1", lot: "LOT-1" },
        { item: "DROP-UP", qty: "3", price: "1", lot: "LOT-1" },
        { item: "ZERO-UP", qty: "0", price: "1", lot: "LOT-1" }
      ])
    });
    var host = document.createElement("div");
    host.id = "pol-preview-host";
    document.body.appendChild(host);
    host.innerHTML = window.POLINES.previewHtml();
  });
  await page.locator("#pol-preview tr", { has: page.locator("input[value='DROP-UP']") }).locator("button[data-po-act='preview-remove']").click();
  await page.waitForFunction(function () {
    var kept = window.POLINES.linesForSave().map(function (l) { return l.item; });
    return kept.indexOf("KEEP-UP") >= 0 && kept.indexOf("DROP-UP") < 0 && kept.indexOf("ZERO-UP") < 0;
  });
  var afterPreview = await page.evaluate(function () { return window.__smkCalls.length; });
  eq(afterPreview === previewCalls, "preview remove does not write until save");

  await browser.close();
  server.close();
  if (pageErrors.length) eq(false, "page errors " + pageErrors.join(" | "));
  if (fail.length) {
    fail.forEach(function (msg) { console.error("FAIL", msg); });
    process.exit(1);
  }
  console.log("ok po line ui");
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

#!/usr/bin/env node
/* Lot Pull Use search. No network. No browser.
   Matches a lot with spaces and slashes ignored, or a flavor name.
   An empty query is the normal view. */
"use strict";

var fs = require("fs");
var path = require("path");
var spawn = require("child_process").spawnSync;

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function sliceFn(src, start, end) {
  var i = src.indexOf("function " + start);
  var j = src.indexOf("function " + end, i + 1);
  assert(i >= 0 && j > i, "slice " + start);
  return src.slice(i, j);
}

var syntax = spawn(process.execPath, ["--check", path.join(root, "trace.js")], { encoding: "utf8" });
assert(syntax.status === 0, "trace.js syntax " + (syntax.stderr || syntax.stdout || ""));

var api = require(path.join(root, "trace.js"));
var pack = {
  inUse: [
    { lot: "L2031/3X9.35", flavor: "Dill Pickle", fc: "L05", size: "4oz" },
    { lot: "L2099/3X1.00", flavor: "Ranch", fc: "L08", size: "4oz" }
  ],
  out: [
    { lot: "L2031/3X8.10", flavor: "Dill Pickle", fc: "L05", size: "1.5oz" },
    { lot: "S02B/1A2.20", flavor: "Cinnamon Churro", fc: "S02", size: "1.5oz" }
  ],
  stock: [
    { lot: "L2031 / 3X9.35", flavor: "Dill Pickle", fc: "L05", size: "4oz", qty: 400 },
    { lot: "L1804/2B1.12", flavor: "Honey Sriracha", fc: "L19", size: "4oz", qty: 80 }
  ]
};
function lots(list) { return (list || []).map(function (r) { return r.lot; }).join("|"); }

var lotHit = api.useFind("l2031 3x9.35", pack);
assert(lotHit.active === true, "lot search is active");
assert(lots(lotHit.inUse) === "L2031/3X9.35", "lot match includes the in-use row " + lots(lotHit.inUse));
assert(lots(lotHit.out) === "", "lot match does not include a different lot " + lots(lotHit.out));
assert(lots(lotHit.stock) === "L2031 / 3X9.35", "lot match ignores spaces and slashes " + lots(lotHit.stock));

var slash = api.useFind("L2031/3X8.10", pack);
assert(lots(slash.out) === "L2031/3X8.10" && slash.inUse.length === 0 && slash.stock.length === 0, "slash query matches the out-of-use lot");

var flav = api.useFind("PiCkLe", pack);
assert(flav.active === true, "flavor search is active");
assert(lots(flav.inUse) === "L2031/3X9.35", "flavor match in use");
assert(lots(flav.out) === "L2031/3X8.10", "flavor match out of use");
assert(lots(flav.stock) === "L2031 / 3X9.35", "flavor match on hand");
assert(api.useFind("dill pickle", pack).inUse.length === 1, "flavor match ignores spaces");

var none = api.useFind("zzzz-nope", pack);
assert(none.active === true && none.inUse.length === 0 && none.out.length === 0 && none.stock.length === 0, "no match stays on the search and lists nothing");

var cleared = api.useFind("   ", pack);
assert(cleared.active === false, "clear leaves the search inactive");
assert(cleared.inUse.length === 0 && cleared.out.length === 0 && cleared.stock.length === 0, "clear does not keep filtered rows");

var trace = read("trace.js");
var inputFn = sliceFn(trace, "useFindInput", "findListed");
var paintFn = sliceFn(trace, "paintUseFind", "useFindInput");
assert(inputFn.indexOf("render(") < 0, "typing does not call render");
assert(inputFn.indexOf("setTimeout") >= 0 && inputFn.indexOf("setInterval") < 0, "search is debounced without a timer guard");
assert(paintFn.indexOf("hits.innerHTML") >= 0 && paintFn.indexOf("trc-u-find") < 0, "results update in place and do not rewrite the search box");
assert(trace.indexOf('id="trc-u-find"') >= 0, "search box is on the Use tab");
assert(trace.indexOf("TRACE.useFindIn(") >= 0 && trace.indexOf("TRACE.useFindOut(") >= 0, "in use and out of use buttons");
assert(trace.indexOf('findIn: "In use"') >= 0 && trace.indexOf('findOutBtn: "Out of use"') >= 0, "english buttons");
assert(trace.indexOf('findIn: "En uso"') >= 0 && trace.indexOf('findOutBtn: "Fuera de uso"') >= 0, "spanish buttons");
assert(trace.indexOf('findIn: "Em uso"') >= 0 && trace.indexOf('findOutBtn: "Fora de uso"') >= 0, "portuguese buttons");
assert(trace.indexOf("function vShip") >= 0 && trace.indexOf("function vElog") >= 0 && trace.indexOf("function vUse") >= 0, "other lot pull tabs still render");
assert(trace.indexOf('type: "ECOM_OUT"') >= 0 && trace.indexOf("function useManual") >= 0, "status buttons use the existing actions");
assert(trace.indexOf("var WRITE_STOCK = false") >= 0 && trace.indexOf("WRITE_STOCK = true") < 0, "search does not turn stock writes on");
assert(trace.indexOf("\u2014") < 0 && trace.indexOf("\u2013") < 0, "no dash characters");

var html = read("index.html");
var sw = read("service-worker.js");
assert(html.indexOf('src="trace.js?b=28"') >= 0, "trace cache bust");
assert(sw.indexOf('const CACHE = "smackin-inv-v319"') >= 0, "cache");
assert(read("build-id.txt").trim() === "smackin-inv-v319", "build id");

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
  var session = { user: { id: "view-1", email: "lenny@smackinsnacks.com" } };
  function builder() {
    var b = {};
    function chain() { return b; }
    ["select", "insert", "update", "upsert", "delete", "eq", "order", "limit", "in", "or", "gte", "lte", "neq", "gt", "range", "single", "maybeSingle"].forEach(function (name) {
      b[name] = chain;
    });
    b.abortSignal = chain;
    b.then = function (resolve, reject) {
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
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
function seedTrace() {
  var st = TRACE._state();
  st.events.length = 0;
  Object.keys(st.labels).forEach(function (k) { delete st.labels[k]; });
  function useEv(lot, fc, name, size, day, qty) {
    return { type: "USE", ts: day + "T18:00:00.000Z", to_loc: "ECOM", from_loc: "STAGING", lot: lot, qty: qty, operator: "Lenny", data: { flavor_code: fc, flavor: name, size: size, pull_date: day, manual: true } };
  }
  function outEv(lot, fc, name, size, day) {
    return { type: "ECOM_OUT", ts: day + "T18:00:00.000Z", from_loc: "ECOM", lot: lot, qty: null, operator: "Lenny", data: { flavor_code: fc, flavor: name, size: size, pull_date: day, finished_date: day, out_of_pick: true, finished: true } };
  }
  st.events.push(
    useEv("L2031/3X9.35", "L05", "Dill Pickle", "4oz", "2026-11-02", 12),
    useEv("L2031/3X8.10", "L05", "Dill Pickle", "1.5oz", "2026-10-01", 8),
    outEv("L2031/3X8.10", "L05", "Dill Pickle", "1.5oz", "2026-10-20"),
    useEv("L2099/3X1.00", "L08", "Ranch", "4oz", "2026-11-03", 4)
  );
  st.labels["FGTEST-DILL"] = { lpn: "FGTEST-DILL", kind: "FG", lot: "L2031/3X9.35", flavor: "Dill Pickle", flavor_code: "L05", size: "4oz", qty: 400, qty_left: 400, status: "ACTIVE", location: "STAGING", uom: "bags", data: {} };
  st.labels["FGTEST-HOT"] = { lpn: "FGTEST-HOT", kind: "FG", lot: "L1804/2B1.12", flavor: "Honey Sriracha", flavor_code: "L19", size: "4oz", qty: 80, qty_left: 80, status: "ACTIVE", location: "A-05-L3", uom: "bags", data: {} };
  st.ST.op = "Lenny";
  st.ST.tab = "use";
  st.W.use.find = "";
  st.W.use.dest = "ECOM";
  st.W.use.msize = "4oz";
  st.W.use._findShowForm = false;
  TRACE.render();
}

function smoke() {
  var playwright;
  try { playwright = require("playwright-core"); }
  catch (e) { assert(false, "playwright-core is installed"); return Promise.resolve(); }
  var server = serve();
  return new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); }).then(function () {
    var port = server.address().port;
    return playwright.chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).then(function (browser) {
      return browser.newPage().then(function (page) {
        page.setDefaultTimeout(30000);
        var errors = [];
        page.on("pageerror", function (err) { errors.push(String(err && err.message || err)); });
        page.on("console", function (msg) {
          if (msg.type() !== "error") return;
          var t = msg.text();
          if (t.indexOf("Failed to load resource") >= 0 || t.indexOf("favicon") >= 0) return;
          if (t.indexOf("[wip-production]") >= 0) return;
          errors.push(t);
        });
        page.on("dialog", function (d) { d.dismiss(); });
        return page.route(/service-worker\.js/, function (route) {
          return route.fulfill({ status: 200, contentType: "application/javascript", body: "self.addEventListener('install',function(){});" });
        }).then(function () {
          return page.route("**/@supabase/supabase-js@2.116.0*", function (route) {
            return route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
          });
        }).then(function () {
          return page.addInitScript(installFake);
        }).then(function () {
          return page.goto("http://127.0.0.1:" + port + "/index.html", { waitUntil: "domcontentloaded" });
        }).then(function () {
          return page.waitForFunction(function () { return window.TRACE && window.UI_go && window.DB && !document.getElementById("smk-auth"); });
        }).then(function () {
          return page.evaluate(function () { TRACE.go("use"); });
        }).then(function () {
          return page.waitForSelector("#trc-u-find");
        }).then(function () {
          return page.waitForTimeout(400);
        }).then(function () {
          return page.evaluate(seedTrace);
        }).then(function () {
          return page.waitForTimeout(500);
        }).then(function () {
          return page.evaluate(seedTrace);
        }).then(function () {
          var input = page.locator("#trc-u-find");
          return input.click().then(function () {
            return input.fill("l2031 3x9.35");
          }).then(function () {
            return page.waitForTimeout(400);
          }).then(function () {
            return page.locator("#trc-u-hits").innerText();
          }).then(function (hits) {
            assert(hits.indexOf("L2031/3X9.35") >= 0, "screen lot match");
            assert(hits.indexOf("In use now") >= 0 && hits.indexOf("On hand") >= 0, "lot match shows in use and on hand");
            assert(hits.indexOf("8.10") < 0 && hits.indexOf("L2099") < 0 && hits.indexOf("Sriracha") < 0, "lot match hides other lots: " + hits.slice(0, 240));
            assert(hits.indexOf("In use") >= 0 && hits.indexOf("Out of use") >= 0, "action buttons on the lot row");
            return page.evaluate(function () {
              var box = document.getElementById("trc-u-find");
              var normal = document.getElementById("trc-u-normal");
              return { id: document.activeElement && document.activeElement.id, value: box ? box.value : "", hidden: !!(normal && normal.hidden) };
            });
          }).then(function (state) {
            assert(state.id === "trc-u-find", "search keeps focus while filtering");
            assert(state.value === "l2031 3x9.35", "search value stays while filtering");
            assert(state.hidden === true, "search replaces the normal view");
            return page.evaluate(function () { TRACE.render(); });
          }).then(function () {
            return page.evaluate(function () {
              var box = document.getElementById("trc-u-find");
              return { id: document.activeElement && document.activeElement.id, value: box ? box.value : "", hits: (document.getElementById("trc-u-hits") || {}).innerText || "" };
            });
          }).then(function (state) {
            assert(state.value === "l2031 3x9.35", "a full render does not wipe the search");
            assert(state.id === "trc-u-find", "a full render returns focus to the search");
            assert(state.hits.indexOf("L2031/3X9.35") >= 0, "a full render keeps the matches");
            return input.fill("");
          }).then(function () {
            return page.waitForTimeout(50);
          }).then(function () {
            return page.evaluate(function () {
              var box = document.getElementById("trc-u-find");
              var normal = document.getElementById("trc-u-normal");
              var hits = document.getElementById("trc-u-hits");
              return { value: box ? box.value : "x", hidden: !!(normal && normal.hidden), hits: hits ? hits.innerText : "x", form: (normal && normal.innerText) || "" };
            });
          }).then(function (state) {
            assert(state.value === "", "clear empties the box");
            assert(state.hidden === false && state.form.indexOf("Log bags pulled") >= 0, "clear restores the pull form");
            assert(!state.hits.trim(), "clear removes the result list");
            return input.pressSequentially("pickle", { delay: 40 });
          }).then(function () {
            return page.waitForTimeout(450);
          }).then(function () {
            return page.evaluate(function () {
              var box = document.getElementById("trc-u-find");
              return { id: document.activeElement && document.activeElement.id, value: box ? box.value : "", hits: (document.getElementById("trc-u-hits") || {}).innerText || "" };
            });
          }).then(function (state) {
            assert(state.id === "trc-u-find" && state.value === "pickle", "typing a flavor does not wipe the box");
            assert(state.hits.indexOf("Dill Pickle") >= 0 && state.hits.indexOf("8.10") >= 0, "flavor match includes out-of-use history");
            assert(state.hits.indexOf("In use now") >= 0 && state.hits.indexOf("Out of use") >= 0 && state.hits.indexOf("On hand") >= 0, "flavor match lists all three groups");
            assert(state.hits.indexOf("Ranch") < 0 && state.hits.indexOf("Sriracha") < 0, "flavor match skips other products");
            return input.fill("zzzz-nope");
          }).then(function () {
            return page.waitForTimeout(400);
          }).then(function () {
            return page.locator("#trc-u-hits").innerText();
          }).then(function (hits) {
            assert(hits.indexOf("No lot or flavor matches") >= 0, "no match message");
            return input.fill("pickle");
          }).then(function () {
            return page.waitForTimeout(400);
          }).then(function () {
            return page.locator("#trc-u-hits button.primary").first().click();
          }).then(function () {
            return page.locator("#trc-u-mlot").inputValue();
          }).then(function (lot) {
            assert(lot === "L2031/3X9.35", "In use fills the pull form with that lot");
            return page.evaluate(function () {
              var normal = document.getElementById("trc-u-normal");
              var box = document.getElementById("trc-u-find");
              return { shown: !!(normal && !normal.hidden), find: box ? box.value : "" };
            });
          }).then(function (state) {
            assert(state.shown && state.find === "pickle", "In use keeps the search and shows the form");
            var before = page.evaluate(function () { return TRACE._state().events.length; });
            return before.then(function (n) {
              return page.locator("#trc-u-hits button.ghost").first().click().then(function () {
                return page.evaluate(function () { return TRACE._state().events.length; });
              }).then(function (after) {
                assert(after === n, "dismissed Out of use does not write");
              });
            });
          }).then(function () {
            return page.evaluate(function () { TRACE.tab("elog"); });
          }).then(function () {
            return page.waitForSelector("#trc-elog");
          }).then(function () {
            return page.locator("#view").innerText();
          }).then(function (text) {
            assert(text.indexOf("E-com lot log") >= 0, "e-com lot log still renders");
            return page.evaluate(function () { TRACE.tab("ship"); });
          }).then(function () {
            return page.locator("#view").innerText();
          }).then(function (text) {
            assert(text.indexOf("Ship") >= 0 && text.indexOf("outbound") >= 0, "ship tab still renders");
            return page.evaluate(function () { TRACE.leave(); window.UI_go("ordersretail"); });
          }).then(function () {
            return page.waitForFunction(function () {
              var v = document.getElementById("view");
              return v && !document.getElementById("trc-root") && v.innerText.length > 40;
            });
          }).then(function () {
            return page.evaluate(function () { window.UI_go("ordersecom"); });
          }).then(function () {
            return page.waitForTimeout(200);
          }).then(function () {
            return page.locator("#view").innerText();
          }).then(function (text) {
            assert(text.length > 40 && text.indexOf("Trace") < 0, "e-commerce orders still render");
            return page.evaluate(function () { window.UI_go("fulfilldaily"); });
          }).then(function () {
            return page.waitForTimeout(200);
          }).then(function () {
            return page.locator("#view").innerText();
          }).then(function (text) {
            assert(text.indexOf("Fulfillment") >= 0 || text.indexOf("label") >= 0, "daily fulfillment still renders");
            assert(!errors.length, "no console errors: " + errors.join(" | "));
          });
          });
        }).then(function () { return browser.close(); });
      });
    }).then(function () { server.close(); });
}

smoke().then(function () {
  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("use find checks ok");
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});

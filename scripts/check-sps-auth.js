#!/usr/bin/env node
/* SPS token retries, cache, and demand reporting when auth fails. No network. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error("FAIL", msg); }
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

function fakeFetch(script) {
  var calls = 0;
  var bodies = [];
  function fetchFn(url, opts) {
    calls += 1;
    bodies.push(String(opts && opts.body || ""));
    var step = script[Math.min(calls - 1, script.length - 1)];
    if (step && step.throw) return Promise.reject(new Error(step.throw));
    var status = step.status;
    var body = step.body || "";
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status: status,
      text: function () { return Promise.resolve(body); }
    });
  }
  fetchFn.calls = function () { return calls; };
  fetchFn.bodies = function () { return bodies; };
  return fetchFn;
}

function tokenBody(extra) {
  return JSON.stringify(Object.assign({ access_token: "tok-live", expires_in: 3600, token_type: "Bearer" }, extra || {}));
}

(async function () {
  var auth = await import("../supabase/functions/_shared/sps-auth.mjs");
  auth.clearSpsTokenCache();

  assert(auth.retryDelayMs(1, 0) === 500, "first wait is 0.5s");
  assert(auth.retryDelayMs(2, 0) === 1000, "second wait is 1s");
  assert(auth.retryDelayMs(3, 0) === 2000, "third wait is 2s");
  assert(auth.retryDelayMs(4, 0) === 4000, "fourth wait is 4s");
  assert(auth.retryDelayMs(5, 0) === 8000, "fifth wait is 8s");
  assert(auth.retryDelayMs(1, 1) === 625, "jitter adds up to 25%");
  assert(auth.isRetryableStatus(400) && auth.isRetryableStatus(429) && auth.isRetryableStatus(500) && auth.isRetryableStatus(0), "400, 429, 5xx, and network retry");
  assert(!auth.isRetryableStatus(401) && !auth.isRetryableStatus(403), "credential errors do not retry");
  assert(auth.redactAuth('{"error":"invalid_request","client_secret":"super-secret-value","access_token":"tok"}').indexOf("super-secret-value") < 0, "secret stripped from body");
  assert(auth.redactAuth("client_secret=super-secret-value").indexOf("super-secret-value") < 0, "form secret stripped");

  var pauses = [];
  var logs = [];
  var flaky = fakeFetch([
    { status: 400, body: '{"error":"invalid_request","error_description":"client_secret=super-secret-value"}' },
    { status: 200, body: tokenBody() }
  ]);
  auth.clearSpsTokenCache();
  var recovered = await auth.getSpsToken("client-a", "super-secret-value", {
    fetchFn: flaky,
    pause: function (ms) { pauses.push(ms); return Promise.resolve(); },
    rand: 0,
    log: function (line) { logs.push(line); },
    now: function () { return 1_000_000; }
  });
  assert(recovered.token === "tok-live" && recovered.attempts === 2 && recovered.auth_retries === 1 && recovered.cached === false, "400 then success uses the second attempt");
  assert(pauses.length === 1 && pauses[0] === 500, "one backoff after the 400");
  assert(logs.some(function (line) { return line.indexOf("status=400") >= 0 && line.indexOf("code=invalid_request") >= 0; }), "failure log names status and error code");
  assert(logs.join("\n").indexOf("super-secret-value") < 0, "logs omit the secret");
  assert(flaky.bodies().join("\n").indexOf("super-secret-value") >= 0, "the request still sends the secret to SPS");

  var cachedFetch = fakeFetch([{ status: 500, body: "nope" }]);
  var hit = await auth.getSpsToken("client-a", "super-secret-value", {
    fetchFn: cachedFetch,
    pause: function () { return Promise.resolve(); },
    now: function () { return 1_000_000 + 60 * 1000; }
  });
  assert(hit.cached === true && hit.token === "tok-live" && cachedFetch.calls() === 0, "a warm isolate reuses an unexpired token");

  var other = fakeFetch([{ status: 200, body: tokenBody({ access_token: "tok-b" }) }]);
  var otherTok = await auth.getSpsToken("client-b", "other", {
    fetchFn: other,
    pause: function () { return Promise.resolve(); },
    now: function () { return 1_000_000; }
  });
  assert(otherTok.token === "tok-b" && other.calls() === 1, "a different client id does not reuse the cache");

  auth.clearSpsTokenCache();
  var clock = 5_000_000;
  var short = fakeFetch([
    { status: 200, body: tokenBody({ access_token: "short", expires_in: 30 }) },
    { status: 200, body: tokenBody({ access_token: "fresh", expires_in: 3600 }) }
  ]);
  await auth.getSpsToken("client-c", "s", {
    fetchFn: short,
    pause: function () { return Promise.resolve(); },
    now: function () { return clock; }
  });
  var again = await auth.getSpsToken("client-c", "s", {
    fetchFn: short,
    pause: function () { return Promise.resolve(); },
    now: function () { return clock; }
  });
  assert(again.token === "fresh" && again.cached === false && short.calls() === 2, "a token inside the 60s skew is fetched again");

  var denied = fakeFetch([{ status: 401, body: '{"error":"invalid_client"}' }]);
  var deniedWaits = [];
  var deniedErr = null;
  try {
    await auth.getSpsToken("client-d", "s", {
      fetchFn: denied,
      pause: function (ms) { deniedWaits.push(ms); return Promise.resolve(); },
      attempts: 6
    });
  } catch (err) { deniedErr = err; }
  assert(denied.calls() === 1 && deniedWaits.length === 0 && deniedErr && deniedErr.retryable === false, "401 is not retried");

  var waits = [];
  var network = fakeFetch([
    { throw: "socket hang up" },
    { status: 429, body: '{"error":"slow_down"}' },
    { status: 503, body: "unavailable" },
    { status: 200, body: tokenBody({ access_token: "after-net" }) }
  ]);
  auth.clearSpsTokenCache();
  var net = await auth.getSpsToken("client-e", "s", {
    fetchFn: network,
    pause: function (ms) { waits.push(ms); return Promise.resolve(); },
    rand: 0,
    log: function () {}
  });
  assert(net.token === "after-net" && net.attempts === 4 && waits.join(",") === "500,1000,2000", "network, 429, and 503 back off then succeed");

  var allFail = fakeFetch([{ status: 400, body: '{"error":"invalid_request"}' }]);
  var boom = null;
  var failWaits = [];
  auth.clearSpsTokenCache();
  try {
    await auth.getSpsToken("client-f", "s", {
      fetchFn: allFail,
      pause: function (ms) { failWaits.push(ms); return Promise.resolve(); },
      rand: 0,
      attempts: 6
    });
  } catch (err) { boom = err; }
  assert(allFail.calls() === 6 && failWaits.join(",") === "500,1000,2000,4000,8000", "six attempts use the five backoff waits");
  assert(boom && boom.message.indexOf("SPS authentication failed (HTTP 400 invalid_request) after 6 attempts") >= 0, "final error names status, code, and attempt count");

  var sync = read("supabase/functions/sps-sync/index.js");
  var nightlyAt = sync.indexOf("nightly = await nightlyPastDue()");
  var authAt = sync.indexOf("tokenResult = await getSpsToken");
  assert(nightlyAt > 0 && authAt > nightlyAt, "demand nightly runs before SPS auth");
  assert(sync.indexOf("auth_failed: true") >= 0 && sync.indexOf("nightly: nightly") >= 0, "auth failure still reports the nightly demand result");
  assert(sync.indexOf("closeInvoicedPo") >= 0, "per-file demand close remains");

  if (failed) {
    console.error(failed + " failed");
    process.exit(1);
  }
  console.log("sps auth ok");
})().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

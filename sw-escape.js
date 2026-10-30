/* Picks up a newer deploy than the document that loaded this file.
   build-id.txt is fetched with cache no-store so the browser HTTP cache
   cannot hide it. A hard refresh does not need this file: index.html has
   the same check inline, which runs even if this request is swallowed. */
(function (root) {
  var EMBEDDED = "smackin-inv-v260";
  var BUILD_RE = /smackin-inv-v(\d+)/;

  function versionNum(id) {
    var m = BUILD_RE.exec(String(id || ""));
    return m ? parseInt(m[1], 10) : 0;
  }

  function parseId(text) {
    var m = String(text || "").match(/smackin-inv-v\d+/);
    return m ? m[0] : "";
  }

  function chooseTarget(embedded, remote) {
    if (remote && versionNum(remote) > versionNum(embedded)) return remote;
    return embedded || remote || "";
  }

  function isSmackinReg(reg) {
    if (!reg) return false;
    var worker = reg.active || reg.waiting || reg.installing;
    var script = worker && worker.scriptURL ? String(worker.scriptURL) : "";
    var scope = reg.scope ? String(reg.scope) : "";
    if (script.indexOf("/smackin-os/service-worker.js") !== -1) return true;
    if (scope.indexOf("/smackin-os/") !== -1 && script.indexOf("service-worker.js") !== -1) return true;
    return false;
  }

  function plan(state) {
    var target = chooseTarget(state.embedded || "", state.remote || "");
    var keys = (state.caches || []).filter(function (k) {
      return String(k).indexOf("smackin-inv-") === 0;
    });
    var mine = versionNum(target);
    var hasOlder = keys.some(function (k) { return versionNum(k) > 0 && versionNum(k) < mine; });
    var hasTarget = keys.indexOf(target) !== -1;
    var hasNewer = keys.some(function (k) { return versionNum(k) > mine; });
    if (!target || hasNewer) return { action: "stay", target: target };
    if (state.probeFailed && state.online === false && hasOlder) return { action: "stay", target: target };
    if (!hasOlder) return { action: "stay", target: target };
    if (hasTarget || state.busted === target) return { action: "drop-old", target: target };
    return { action: "reset", target: target };
  }

  function bustUrl(href, id) {
    var u = new URL(href);
    u.searchParams.set("v", id);
    return u.href;
  }

  function cleanPath(href, id) {
    var u = new URL(href);
    if (u.searchParams.get("v") !== id) return "";
    u.searchParams.delete("v");
    return u.pathname + u.search + u.hash;
  }

  var api = {
    EMBEDDED: EMBEDDED,
    versionNum: versionNum,
    parseId: parseId,
    chooseTarget: chooseTarget,
    isSmackinReg: isSmackinReg,
    plan: plan,
    bustUrl: bustUrl,
    cleanPath: cleanPath
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }

  root.smackinSwEscape = api;
  if (root.__smackinSwEscapeLock) return;
  if (!root.navigator || !root.navigator.serviceWorker || !root.caches || !root.fetch) return;

  var pageHref = String(root.location && root.location.href || "");
  var busted = "";
  try { busted = new URL(pageHref).searchParams.get("v") || ""; } catch (e) {}

  var probeFailed = false;
  var remoteP = root.fetch("build-id.txt?t=" + Date.now(), { cache: "no-store", credentials: "same-origin" })
    .then(function (resp) {
      if (!resp || !resp.ok) { probeFailed = true; return ""; }
      return resp.text();
    })
    .then(parseId)
    .catch(function () { probeFailed = true; return ""; });

  var remoteOrTimeout = new Promise(function (resolve) {
    var done = false;
    function finish(id) { if (!done) { done = true; resolve(id || ""); } }
    remoteP.then(finish, function () { finish(""); });
    root.setTimeout(function () { probeFailed = true; finish(""); }, 1500);
  });

  Promise.all([
    remoteOrTimeout,
    root.caches.keys(),
    root.navigator.serviceWorker.getRegistrations()
  ]).then(function (out) {
    if (root.__smackinSwEscapeLock) return;
    var decision = plan({
      embedded: EMBEDDED,
      remote: out[0] || "",
      caches: out[1] || [],
      online: root.navigator.onLine !== false,
      probeFailed: probeFailed && !out[0],
      busted: busted
    });
    if (decision.action === "stay") {
      if (!decision.target || busted !== decision.target || !root.history || !root.history.replaceState) return;
      var next = cleanPath(pageHref, decision.target);
      var now = root.location.pathname + root.location.search + root.location.hash;
      if (next && next !== now) root.history.replaceState(null, "", next);
      return;
    }
    var older = (out[1] || []).filter(function (k) {
      return String(k).indexOf("smackin-inv-") === 0 && versionNum(k) > 0 && versionNum(k) < versionNum(decision.target);
    });
    var drop = Promise.all(older.map(function (k) { return root.caches.delete(k); }));
    if (decision.action === "drop-old") {
      return drop.then(function () {
        if (busted !== decision.target || !root.history || !root.history.replaceState) return;
        var dropped = cleanPath(pageHref, decision.target);
        var now = root.location.pathname + root.location.search + root.location.hash;
        if (dropped && dropped !== now) root.history.replaceState(null, "", dropped);
      });
    }
    root.__smackinSwEscapeLock = 1;
    var regs = (out[2] || []).filter(function (reg) { return isSmackinReg(reg); });
    return Promise.all(regs.map(function (reg) { return reg.unregister(); })).then(function () {
      return root.caches.keys();
    }).then(function (keys) {
      var smackin = (keys || []).filter(function (k) { return String(k).indexOf("smackin-inv-") === 0; });
      return Promise.all(smackin.map(function (k) { return root.caches.delete(k); }));
    }).then(function () {
      root.location.replace(bustUrl(pageHref, decision.target));
    });
  }).catch(function () {});
})(typeof window !== "undefined" ? window : globalThis);

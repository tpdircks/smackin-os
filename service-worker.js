/* Offline shell for scanners. Navigations and other same-origin GETs use
   cache: no-store so GitHub Pages max-age=600 cannot stick a previous deploy
   in the browser HTTP cache. Offline falls back to this cache. The worker
   script, build-id.txt, and sw-escape.js are not intercepted. Supabase is
   never touched.
   On every deploy, bump CACHE, build-id.txt, and EMBEDDED in sw-escape.js
   and index.html together. */
const CACHE = "smackin-inv-v260";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./ui-polish.css", "./ui-polish.js", "./stock-alerts.js", "./dept-homes.js", "./dashboard.js", "./demand-wos.js", "./vendor-seed.js", "./vendor-lead.js", "./mixing-recipes.js", "./wip-production.js",
  "./config.js", "./auth-gate.js", "./seed-data.js", "./skus.js", "./demand.js", "./demand-autoclose.js", "./demand-close-cleanup.js", "./demand-flavor-remap.js", "./kits.js", "./ecom.js", "./recipes.js", "./production-orders.js", "./work-orders.js", "./shortdated.js", "./launch-schedule.js", "./allen-reorder.js", "./db.js", "./gusto-roster.js", "./app.js", "./returns-workflow.js", "./fg-lots.js", "./trace.js", "./trace-recall.js", "./receiving-sop.js", "./pmac-log.js", "./po-format.js", "./mfg-history.js", "./mfg-upload.js", "./data-health.js", "./services.js", "./sps-map.js", "./po-status.js", "./batch-record.js", "./sqf-tasks.js", "./qa-checklists.js", "./fulfillment-analytics.js", "./data/wip-fulfillment-errors.json", "./shipping-sync.js", "./shipping-lanes.js", "./outbound-folders.js", "./sps-feed.js",
  "./inventory-visual.js", "./inventory-visual.css", "./floor-clarity.js", "./floor-clarity.css", "./sw-boot.js",
  "./facility.html", "./manifest.webmanifest"
];

function stableUrl(raw) {
  const u = new URL(raw, self.location.href);
  u.search = "";
  u.hash = "";
  return u.href;
}

function bust(path) {
  return path + (path.indexOf("?") >= 0 ? "&" : "?") + "sw=" + CACHE;
}

function leavesBrowser(url) {
  return url.indexOf("service-worker.js") !== -1
    || url.indexOf("build-id.txt") !== -1
    || url.indexOf("sw-escape.js") !== -1;
}

/* Pages request app.js?b=NN. Store one copy per path so offline matches,
   including after a redirect or a decoded body. */
function store(cache, key, resp) {
  try {
    if (!resp || !resp.ok || resp.type === "opaque" || resp.status === 206) return Promise.resolve();
    const href = stableUrl(key);
    if (leavesBrowser(href)) return Promise.resolve();
    const headers = new Headers();
    resp.headers.forEach(function (v, k) {
      if (k === "content-encoding" || k === "content-length" || k === "set-cookie") return;
      try { headers.set(k, v); } catch (err) {}
    });
    return resp.blob().then(function (body) {
      return cache.put(href, new Response(body, { status: resp.status, statusText: resp.statusText, headers: headers }));
    }).catch(function () {});
  } catch (e) {
    return Promise.resolve();
  }
}

function fromNetwork(request) {
  if (request.mode === "navigate" || request.destination === "document") {
    return fetch(request.url, { cache: "no-store", credentials: "same-origin", redirect: "follow" });
  }
  try { return fetch(new Request(request, { cache: "no-store" })); } catch (e) {}
  return fetch(request.url, { cache: "no-store", credentials: "same-origin", redirect: "follow" });
}

self.addEventListener("install", function (e) {
  e.waitUntil((async function () {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(function (path) {
      return fetch(bust(path), { cache: "no-store", credentials: "same-origin" }).then(function (resp) {
        return store(cache, path, resp);
      }).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (e) {
  const url = e.request.url;
  if (url.indexOf("supabase.co") >= 0) return;
  if (e.request.method !== "GET") return;
  if (e.request.cache === "only-if-cached") return;
  const sameOrigin = url.indexOf(self.location.origin) === 0;
  if (!sameOrigin) {
    e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); }));
    return;
  }
  if (leavesBrowser(url)) return;
  e.respondWith((async function () {
    try {
      const resp = await fromNetwork(e.request);
      if (resp && resp.ok) {
        const copy = resp.clone();
        const saved = caches.open(CACHE).then(function (cache) { return store(cache, e.request.url, copy); });
        try { e.waitUntil(saved); } catch (err) {}
      }
      return resp;
    } catch (err) {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(stableUrl(e.request.url));
      if (hit) return hit;
      if (e.request.mode === "navigate") {
        const shell = await cache.match(stableUrl(new URL("./index.html", self.location.href).href))
          || await cache.match(stableUrl(new URL("./", self.location.href).href));
        if (shell) return shell;
      }
      throw err;
    }
  })());
});

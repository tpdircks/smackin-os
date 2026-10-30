/* Offline shell for scanners. Same-origin GETs are revalidated (GitHub Pages
   sends max-age=600, so a plain fetch() repeats the previous deploy). Offline
   falls back to this cache. Supabase is never touched. */
const CACHE = "smackin-inv-v254";
const REPLACING = "https://sw.smackin.invalid/replacing";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./ui-polish.css", "./ui-polish.js", "./stock-alerts.js", "./dept-homes.js", "./dashboard.js", "./demand-wos.js", "./vendor-seed.js", "./vendor-lead.js", "./mixing-recipes.js", "./wip-production.js",
  "./config.js", "./auth-gate.js", "./seed-data.js", "./skus.js", "./demand.js", "./demand-autoclose.js", "./demand-close-cleanup.js", "./kits.js", "./ecom.js", "./recipes.js", "./production-orders.js", "./work-orders.js", "./shortdated.js", "./launch-schedule.js", "./allen-reorder.js", "./db.js", "./gusto-roster.js", "./app.js", "./returns-workflow.js", "./trace.js", "./trace-recall.js", "./receiving-sop.js", "./pmac-log.js", "./po-format.js", "./mfg-history.js", "./mfg-upload.js", "./data-health.js", "./services.js", "./sps-map.js", "./po-status.js", "./batch-record.js", "./sqf-tasks.js", "./qa-checklists.js", "./fulfillment-analytics.js", "./data/wip-fulfillment-errors.json", "./shipping-sync.js", "./shipping-lanes.js", "./outbound-folders.js", "./sps-feed.js",
  "./inventory-visual.js", "./inventory-visual.css", "./sw-boot.js",
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

/* Pages request app.js?b=NN. Store one copy per path so offline matches,
   including after a redirect or a decoded body. */
function store(cache, key, resp) {
  try {
    if (!resp || !resp.ok || resp.type === "opaque" || resp.status === 206) return Promise.resolve();
    const href = stableUrl(key);
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

function revalidate(request) {
  if (request.mode !== "navigate") {
    try { return fetch(new Request(request, { cache: "no-cache" })); } catch (e) {}
  }
  return fetch(request.url, { cache: "no-cache", credentials: "same-origin", redirect: "follow" });
}

self.addEventListener("install", function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    const cache = await caches.open(CACHE);
    if (keys.some(function (k) { return k.indexOf("smackin-inv-") === 0 && k !== CACHE; })) {
      await cache.put(REPLACING, new Response("1")).catch(function () {});
    }
    await Promise.all(ASSETS.map(function (path) {
      return fetch(bust(path), { cache: "no-cache", credentials: "same-origin" }).then(function (resp) {
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
    const cache = await caches.open(CACHE);
    const replacing = await cache.match(REPLACING);
    if (replacing) await cache.delete(REPLACING);
    await self.clients.claim();
    if (!replacing) return;
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(function (client) {
      if (!client.navigate || !client.url) return;
      client.navigate(client.url).catch(function () {});
    });
  })());
});

self.addEventListener("fetch", function (e) {
  const url = e.request.url;
  if (url.indexOf("supabase.co") >= 0) return;
  if (e.request.method !== "GET") return;
  const sameOrigin = url.indexOf(self.location.origin) === 0;
  if (!sameOrigin) {
    e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); }));
    return;
  }
  if (url.indexOf("service-worker.js") !== -1) return;
  e.respondWith((async function () {
    try {
      const resp = await revalidate(e.request);
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
      throw err;
    }
  })());
});

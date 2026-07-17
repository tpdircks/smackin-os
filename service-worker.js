/* Minimal offline cache for the app shell so scanners load fast and keep
   working through brief wifi drops. Data still requires connectivity in
   cloud mode; local mode works fully offline. */
const CACHE = "smackin-inv-v87";
const ASSETS = [
  "./", "./index.html", "./styles.css",
  "./config.js", "./seed-data.js", "./skus.js", "./demand.js", "./kits.js", "./db.js", "./app.js",
  "./facility.html", "./manifest.webmanifest"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = e.request.url;
  if (url.indexOf("supabase.co") >= 0) return;   // never touch API/realtime
  if (e.request.method !== "GET") return;
  const sameOrigin = url.indexOf(self.location.origin) === 0;
  if (sameOrigin) {
    // NETWORK-FIRST for the app shell: always load the freshest deployed version
    // when online, so users never get stuck on a stale cached build. Falls back
    // to cache only when offline (keeps scanners working through wifi drops).
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // cross-origin CDN libs (versioned URLs): cache-first is fine
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  }
});

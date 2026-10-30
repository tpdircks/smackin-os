/* Register after app.js so update checks skip the HTTP cache.
   The head escape unregisters a stale smackin-inv worker first.
   Skip this register when that reset is already navigating away. */
(function () {
  if (!("serviceWorker" in navigator)) return;
  function arm() {
    if (window.__smackinSwEscapeLock) return;
    try {
      navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then(function (reg) {
        if (window.__smackinSwEscapeLock) {
          if (reg && reg.unregister) reg.unregister().catch(function () {});
          return;
        }
        if (reg && typeof reg.update === "function") return reg.update();
      }).catch(function () {});
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
})();

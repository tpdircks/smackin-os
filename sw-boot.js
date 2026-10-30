/* Register after app.js so update checks skip the HTTP cache.
   app.js calls register() on DOMContentLoaded; this listener is added
   later and runs second, with updateViaCache "none". The worker reloads
   open windows when it replaces an older cache. */
(function () {
  if (!("serviceWorker" in navigator)) return;
  function arm() {
    try {
      navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then(function (reg) {
        if (reg && typeof reg.update === "function") return reg.update();
      }).catch(function () {});
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
  else arm();
})();

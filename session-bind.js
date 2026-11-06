/* Point every Supabase client at the same auth storage as the login wall.
   A signed-in session then rides on writes, so the audit trail can read
   the user id and email. With no session, the publishable key stays anon. */
(function () {
  "use strict";
  if (!window.supabase || window.supabase.__smkBound || typeof window.supabase.createClient !== "function") return;
  var orig = window.supabase.createClient;
  function storage() {
    try {
      if (window.localStorage.getItem("smk-persist") === "0") return window.sessionStorage;
    } catch (e) {}
    return window.localStorage;
  }
  window.supabase.createClient = function (url, key, opts) {
    opts = Object.assign({}, opts || {});
    var auth = Object.assign({}, opts.auth || {});
    if (!auth.storage) {
      auth.storage = storage();
      if (auth.persistSession == null) auth.persistSession = true;
      if (auth.autoRefreshToken == null) auth.autoRefreshToken = true;
    }
    opts.auth = auth;
    return orig.call(window.supabase, url, key, opts);
  };
  window.supabase.__smkBound = true;
})();

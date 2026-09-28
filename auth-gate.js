/* ============================================================================
   Smackin' OS - Authentication gate (auth-gate.js)  b=2
   Login wall in front of the whole app + effortless repeat login.

   - Sign-up restricted to @smackinsnacks.com; each person sets their own
     password. Email confirmation required (Supabase "Confirm email" is ON).
   - EASY LOGIN: sessions persist, so a logged-in user skips the wall entirely
     on every later visit (auto-login). Real <form> + autocomplete so the
     browser's own password manager saves and autofills credentials. The last
     email used is remembered and pre-filled. A "Keep me signed in on this
     device" checkbox (on by default) lets a shared computer opt out (session
     lives only until the browser closes).
   - "Forgot password" and "Resend confirmation" included; a "Sign out" button
     appears once authenticated.

   NOTE: this is the UI wall. Locking the database (RLS -> authenticated) is the
   fast-follow that makes it real security.
   Self-contained. Loaded right after config.js so no app data flashes first.
   ==========================================================================*/
(function () {
  "use strict";

  var cfg = window.SMACKIN_CONFIG || {};
  var ALLOWED_DOMAIN = "smackinsnacks.com";
  var REDIRECT = (location.origin + location.pathname);
  var PERSIST_KEY = "smk-persist";   // "0" = session-only, else persistent
  var EMAIL_KEY = "smk-email";       // last email used (for pre-fill)
  var sb = null;

  function ready() { return !!(window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY); }
  function wantPersist() { try { return localStorage.getItem(PERSIST_KEY) !== "0"; } catch (e) { return true; } }
  function savedEmail() { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch (e) { return ""; } }

  // Clear any Supabase auth token from BOTH stores so the chosen persistence wins.
  function clearAllAuth() {
    [window.localStorage, window.sessionStorage].forEach(function (store) {
      try {
        var kill = [];
        for (var i = 0; i < store.length; i++) { var k = store.key(i); if (k && k.indexOf("sb-") === 0) kill.push(k); }
        kill.forEach(function (k) { store.removeItem(k); });
      } catch (e) {}
    });
  }

  // Build a client whose session is stored in localStorage (persistent) or
  // sessionStorage (cleared when the browser closes), per the saved choice.
  function client() {
    if (sb) return sb;
    if (!ready()) return null;
    var store = wantPersist() ? window.localStorage : window.sessionStorage;
    try {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: store }
      });
    } catch (e) { sb = null; }
    return sb;
  }
  function rebuildClient() { sb = null; return client(); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function domainOk(email) { return /@/.test(email) && email.toLowerCase().trim().split("@").pop() === ALLOWED_DOMAIN; }

  // ---- styles -----------------------------------------------------------
  var STYLE = [
    "#smk-auth{position:fixed;inset:0;z-index:2147483000;background:#0f1a30;",
    "background:linear-gradient(160deg,#12213c 0%,#1F3864 60%,#16294a 100%);",
    "display:flex;align-items:center;justify-content:center;font-family:Barlow,system-ui,Arial,sans-serif;padding:20px;overflow:auto}",
    "#smk-auth *{box-sizing:border-box}",
    "#smk-card{width:100%;max-width:400px;background:#fff;border-radius:16px;padding:30px 28px;box-shadow:0 24px 60px rgba(0,0,0,.45)}",
    "#smk-card h1{margin:0;font-size:26px;font-weight:800;color:#1F3864;letter-spacing:.5px}",
    "#smk-card .thin{font-weight:400;color:#5a7bb0}",
    "#smk-sub{margin:4px 0 22px;color:#6b7280;font-size:13px}",
    "#smk-card label.fld{display:block;font-size:12px;font-weight:600;color:#374151;margin:12px 0 5px}",
    "#smk-card input[type=email],#smk-card input[type=password]{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;font-size:15px;font-family:inherit;outline:none}",
    "#smk-card input[type=email]:focus,#smk-card input[type=password]:focus{border-color:#1F3864;box-shadow:0 0 0 3px rgba(31,56,100,.15)}",
    "#smk-remember{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:#374151;cursor:pointer;user-select:none}",
    "#smk-remember input{width:16px;height:16px;accent-color:#1F3864;cursor:pointer}",
    "#smk-btn{width:100%;margin-top:16px;padding:12px;border:0;border-radius:10px;background:#1F3864;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}",
    "#smk-btn:hover{background:#284a86}#smk-btn:disabled{opacity:.6;cursor:default}",
    "#smk-tabs{display:flex;gap:6px;margin-bottom:18px;background:#eef2f7;border-radius:10px;padding:4px}",
    "#smk-tabs button{flex:1;padding:9px;border:0;background:transparent;border-radius:7px;font-weight:700;font-size:13px;color:#64748b;cursor:pointer;font-family:inherit}",
    "#smk-tabs button.on{background:#fff;color:#1F3864;box-shadow:0 1px 3px rgba(0,0,0,.12)}",
    "#smk-msg{margin-top:14px;font-size:13px;line-height:1.45;padding:10px 12px;border-radius:8px;display:none}",
    "#smk-msg.err{display:block;background:#fef2f2;color:#b52024;border:1px solid #fecaca}",
    "#smk-msg.ok{display:block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}",
    "#smk-link{margin-top:14px;text-align:center;font-size:12px}",
    "#smk-link a{color:#1F3864;font-weight:600;text-decoration:none;cursor:pointer}",
    "#smk-foot{margin-top:16px;text-align:center;font-size:11px;color:#94a3b8}",
    "#smk-signout{position:fixed;top:9px;right:12px;z-index:2147482000;background:rgba(255,255,255,.14);color:#fff;",
    "border:1px solid rgba(255,255,255,.3);border-radius:7px;padding:4px 10px;font:600 12px Barlow,system-ui,Arial;cursor:pointer}",
    "#smk-signout:hover{background:rgba(255,255,255,.28)}"
  ].join("");
  function injectStyle() {
    if (document.getElementById("smk-auth-style")) return;
    var s = document.createElement("style"); s.id = "smk-auth-style"; s.textContent = STYLE;
    (document.head || document.documentElement).appendChild(s);
  }

  var mode = "login"; // or "signup"
  function overlayHtml() {
    var email = esc(savedEmail());
    var remember = wantPersist() ? " checked" : "";
    return '<div id="smk-auth"><div id="smk-card">' +
      '<h1>SMACKIN\' <span class="thin">OS</span></h1>' +
      '<div id="smk-sub">Sign in with your Smackin\' Snacks email</div>' +
      '<div id="smk-tabs">' +
      '<button type="button" id="smk-tab-login" class="' + (mode === "login" ? "on" : "") + '">Log in</button>' +
      '<button type="button" id="smk-tab-signup" class="' + (mode === "signup" ? "on" : "") + '">Create account</button>' +
      '</div>' +
      '<form id="smk-form" autocomplete="on">' +
      '<label class="fld" for="smk-email">Work email</label>' +
      '<input id="smk-email" name="email" type="email" autocomplete="username" placeholder="you@' + ALLOWED_DOMAIN + '" value="' + email + '">' +
      '<label class="fld" for="smk-pass">Password</label>' +
      '<input id="smk-pass" name="password" type="password" autocomplete="' + (mode === "signup" ? "new-password" : "current-password") + '" placeholder="' + (mode === "signup" ? "At least 8 characters" : "Your password") + '">' +
      (mode === "login" ? '<label id="smk-remember"><input type="checkbox" id="smk-keep"' + remember + '> Keep me signed in on this device</label>' : '') +
      '<button type="submit" id="smk-btn">' + (mode === "signup" ? "Create account" : "Log in") + '</button>' +
      '</form>' +
      '<div id="smk-msg"></div>' +
      '<div id="smk-link">' +
      (mode === "login" ? '<a id="smk-forgot">Forgot password?</a>' : '<a id="smk-resend">Resend confirmation email</a>') +
      '</div>' +
      '<div id="smk-foot">Access is limited to @' + ALLOWED_DOMAIN + ' accounts.</div>' +
      '</div></div>';
  }

  function $(id) { return document.getElementById(id); }
  function msg(text, kind) { var m = $("smk-msg"); if (!m) return; m.textContent = text; m.className = kind || ""; }
  function busy(b) { var btn = $("smk-btn"); if (btn) { btn.disabled = b; btn.textContent = b ? "Please wait…" : (mode === "signup" ? "Create account" : "Log in"); } }

  function render() {
    injectStyle();
    var existing = $("smk-auth");
    var host = document.createElement("div");
    host.innerHTML = overlayHtml();
    var node = host.firstChild;
    if (existing) existing.replaceWith(node); else document.body.appendChild(node);
    document.body.style.overflow = "hidden";
    wire();
  }

  function wire() {
    $("smk-tab-login").onclick = function () { mode = "login"; render(); };
    $("smk-tab-signup").onclick = function () { mode = "signup"; render(); };
    $("smk-form").onsubmit = function (e) { e.preventDefault(); submit(); };
    if ($("smk-forgot")) $("smk-forgot").onclick = forgot;
    if ($("smk-resend")) $("smk-resend").onclick = resend;
    // focus password if email is already remembered, else focus email
    var em = $("smk-email"), pw = $("smk-pass");
    if (em && em.value && pw) pw.focus(); else if (em) em.focus();
  }

  function submit() {
    var email = ($("smk-email").value || "").trim();
    var pass = $("smk-pass").value || "";
    if (!domainOk(email)) { msg("Use your @" + ALLOWED_DOMAIN + " email address.", "err"); return; }
    if (mode === "signup" && pass.length < 8) { msg("Password must be at least 8 characters.", "err"); return; }
    if (!pass) { msg("Enter your password.", "err"); return; }

    if (mode === "login") {
      var keep = $("smk-keep") ? $("smk-keep").checked : true;
      try { localStorage.setItem(PERSIST_KEY, keep ? "1" : "0"); } catch (e) {}
      try { if (keep) localStorage.setItem(EMAIL_KEY, email); else localStorage.removeItem(EMAIL_KEY); } catch (e) {}
      clearAllAuth();          // make the chosen persistence authoritative
      rebuildClient();         // client now writes to the chosen storage
    }
    var c = client();
    if (!c) { msg("Auth is still loading, try again in a moment.", "err"); return; }
    busy(true); msg("", "");

    if (mode === "signup") {
      c.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: REDIRECT } })
        .then(function (r) {
          busy(false);
          if (r.error) { msg(r.error.message || "Could not create the account.", "err"); return; }
          try { localStorage.setItem(EMAIL_KEY, email); } catch (e) {}
          msg("Account created. Check " + email + " for a confirmation link, then come back and log in.", "ok");
        }).catch(function (e) { busy(false); msg((e && e.message) || "Something went wrong.", "err"); });
    } else {
      c.auth.signInWithPassword({ email: email, password: pass })
        .then(function (r) {
          if (r.error) {
            busy(false);
            var m = (r.error.message || "").toLowerCase();
            if (m.indexOf("confirm") >= 0) msg("Please confirm your email first — check your inbox, or use “Resend confirmation email” on the Create account tab.", "err");
            else msg("Incorrect email or password.", "err");
            return;
          }
          msg("Signed in…", "ok");
          setTimeout(function () { location.reload(); }, 300);
        }).catch(function (e) { busy(false); msg((e && e.message) || "Something went wrong.", "err"); });
    }
  }

  function forgot() {
    var email = ($("smk-email").value || "").trim();
    if (!domainOk(email)) { msg("Enter your @" + ALLOWED_DOMAIN + " email above first.", "err"); return; }
    var c = client(); if (!c) return;
    c.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT }).then(function () {
      msg("If that account exists, a password-reset link is on its way to " + email + ".", "ok");
    }).catch(function () { msg("Could not send the reset email.", "err"); });
  }

  function resend() {
    var email = ($("smk-email").value || "").trim();
    if (!domainOk(email)) { msg("Enter your @" + ALLOWED_DOMAIN + " email above first.", "err"); return; }
    var c = client(); if (!c) return;
    c.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: REDIRECT } }).then(function (r) {
      if (r && r.error) msg(r.error.message || "Could not resend.", "err");
      else msg("Confirmation email re-sent to " + email + ".", "ok");
    }).catch(function () { msg("Could not resend the confirmation email.", "err"); });
  }

  function removeOverlay() { var o = $("smk-auth"); if (o) o.remove(); document.body.style.overflow = ""; }

  function addSignOut(email) {
    if ($("smk-signout")) return;
    injectStyle();
    var b = document.createElement("button");
    b.id = "smk-signout";
    b.title = email ? ("Signed in as " + email) : "Sign out";
    b.textContent = "Sign out";
    b.onclick = function () {
      var c = client();
      var done = function () { clearAllAuth(); location.reload(); };
      if (!c) { done(); return; }
      c.auth.signOut().then(done).catch(done);
    };
    document.body.appendChild(b);
  }

  // ---- boot -------------------------------------------------------------
  function boot() {
    if (!ready()) return false;
    var c = client();
    if (!c) return false;
    c.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      if (session && session.user) { removeOverlay(); addSignOut(session.user.email); }
      else render();
    }).catch(function () { render(); });
    try {
      c.auth.onAuthStateChange(function (_evt, session) {
        if (session && session.user) { removeOverlay(); addSignOut(session.user.email); }
      });
    } catch (e) {}
    return true;
  }

  function start() {
    if (document.body) render();               // wall paints immediately
    if (!boot()) { var n = 0, iv = setInterval(function () { if (boot() || ++n > 60) clearInterval(iv); }, 200); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

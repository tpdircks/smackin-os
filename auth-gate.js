/* ============================================================================
   Smackin' OS - Authentication gate (auth-gate.js)
   Phase 1 of app security (2026-09-26): a login wall in front of the whole app.

   - Sign-up is restricted to @smackinsnacks.com addresses; each person sets
     their own password.
   - Email confirmation is required (Supabase "Confirm email" is ON), so a new
     user must click the link in their email before their first login.
   - Session persists (Supabase localStorage), so returning users stay logged in
     on that device until they sign out.
   - "Forgot password" and "resend confirmation" are included.
   - A small "Sign out" button is added once authenticated.

   IMPORTANT: this is the UI wall. The DATABASE is still readable with the public
   key until the fast-follow that tightens RLS to authenticated-only. Do that next
   for real security. This file uses the same Supabase project/anon key as the app,
   so once a user logs in, their token is available for the locked-down phase.

   Self-contained. Loaded early (right after config.js) so no app data flashes
   before the wall appears.
   ==========================================================================*/
(function () {
  "use strict";

  var cfg = window.SMACKIN_CONFIG || {};
  var ALLOWED_DOMAIN = "smackinsnacks.com";
  var REDIRECT = (location.origin + location.pathname);
  var sb = null;

  function ready() {
    return !!(window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }
  function client() {
    if (!sb && ready()) {
      try {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      } catch (e) { sb = null; }
    }
    return sb;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function domainOk(email) { return /@/.test(email) && email.toLowerCase().trim().split("@").pop() === ALLOWED_DOMAIN; }

  // ---- overlay ----------------------------------------------------------
  var STYLE = [
    "#smk-auth{position:fixed;inset:0;z-index:2147483000;background:#0f1a30;",
    "background:linear-gradient(160deg,#12213c 0%,#1F3864 60%,#16294a 100%);",
    "display:flex;align-items:center;justify-content:center;font-family:Barlow,system-ui,Arial,sans-serif;padding:20px;overflow:auto}",
    "#smk-auth *{box-sizing:border-box}",
    "#smk-card{width:100%;max-width:400px;background:#fff;border-radius:16px;padding:30px 28px;box-shadow:0 24px 60px rgba(0,0,0,.45)}",
    "#smk-card h1{margin:0;font-size:26px;font-weight:800;color:#1F3864;letter-spacing:.5px}",
    "#smk-card .thin{font-weight:400;color:#5a7bb0}",
    "#smk-sub{margin:4px 0 22px;color:#6b7280;font-size:13px}",
    "#smk-card label{display:block;font-size:12px;font-weight:600;color:#374151;margin:12px 0 5px}",
    "#smk-card input{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;font-size:15px;font-family:inherit;outline:none}",
    "#smk-card input:focus{border-color:#1F3864;box-shadow:0 0 0 3px rgba(31,56,100,.15)}",
    "#smk-btn{width:100%;margin-top:18px;padding:12px;border:0;border-radius:10px;background:#1F3864;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}",
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
    return '<div id="smk-auth"><div id="smk-card">' +
      '<h1>SMACKIN\' <span class="thin">OS</span></h1>' +
      '<div id="smk-sub">Sign in with your Smackin\' Snacks email</div>' +
      '<div id="smk-tabs">' +
      '<button id="smk-tab-login" class="' + (mode === "login" ? "on" : "") + '">Log in</button>' +
      '<button id="smk-tab-signup" class="' + (mode === "signup" ? "on" : "") + '">Create account</button>' +
      '</div>' +
      '<label for="smk-email">Work email</label>' +
      '<input id="smk-email" type="email" autocomplete="email" placeholder="you@' + ALLOWED_DOMAIN + '">' +
      '<label for="smk-pass">Password</label>' +
      '<input id="smk-pass" type="password" autocomplete="' + (mode === "signup" ? "new-password" : "current-password") + '" placeholder="' + (mode === "signup" ? "At least 8 characters" : "Your password") + '">' +
      '<button id="smk-btn">' + (mode === "signup" ? "Create account" : "Log in") + '</button>' +
      '<div id="smk-msg"></div>' +
      '<div id="smk-link">' +
      (mode === "login"
        ? '<a id="smk-forgot">Forgot password?</a>'
        : '<a id="smk-resend">Resend confirmation email</a>') +
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
    $("smk-btn").onclick = submit;
    var pass = $("smk-pass");
    pass.onkeydown = function (e) { if (e.key === "Enter") submit(); };
    if ($("smk-forgot")) $("smk-forgot").onclick = forgot;
    if ($("smk-resend")) $("smk-resend").onclick = resend;
  }

  function submit() {
    var email = ($("smk-email").value || "").trim();
    var pass = $("smk-pass").value || "";
    if (!domainOk(email)) { msg("Use your @" + ALLOWED_DOMAIN + " email address.", "err"); return; }
    if (mode === "signup" && pass.length < 8) { msg("Password must be at least 8 characters.", "err"); return; }
    if (!pass) { msg("Enter your password.", "err"); return; }
    var c = client();
    if (!c) { msg("Auth is still loading, try again in a moment.", "err"); return; }
    busy(true); msg("", "");
    if (mode === "signup") {
      c.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: REDIRECT } })
        .then(function (r) {
          busy(false);
          if (r.error) { msg(r.error.message || "Could not create the account.", "err"); return; }
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

  function removeOverlay() {
    var o = $("smk-auth"); if (o) o.remove();
    document.body.style.overflow = "";
  }

  function addSignOut(email) {
    if ($("smk-signout")) return;
    injectStyle();
    var b = document.createElement("button");
    b.id = "smk-signout";
    b.title = email ? ("Signed in as " + email) : "Sign out";
    b.textContent = "Sign out";
    b.onclick = function () {
      var c = client(); if (!c) { location.reload(); return; }
      c.auth.signOut().then(function () { location.reload(); }).catch(function () { location.reload(); });
    };
    document.body.appendChild(b);
  }

  // ---- boot -------------------------------------------------------------
  function boot() {
    if (!ready()) { return false; }
    var c = client();
    if (!c) return false;
    c.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      if (session && session.user) {
        removeOverlay();
        addSignOut(session.user.email);
      } else {
        render();
      }
    }).catch(function () { render(); });
    // keep in sync if auth state changes in another tab
    try {
      c.auth.onAuthStateChange(function (_evt, session) {
        if (session && session.user) { removeOverlay(); addSignOut(session.user.email); }
      });
    } catch (e) {}
    return true;
  }

  // Show the wall ASAP (before app data paints), then confirm session.
  function start() {
    if (document.body) render(); // paint wall immediately; boot() removes it if already logged in
    if (!boot()) {
      var n = 0, iv = setInterval(function () { if (boot() || ++n > 60) clearInterval(iv); }, 200);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

#!/usr/bin/env node
/* token_hash reset links: no verify on load, verify on Save, URL cleaned. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var gate = read("auth-gate.js");
var REDIRECT = "https://tpdircks.github.io/smackin-os/";
var EXPIRED = "This reset link expired. Use Forgot password to get a new one.";
var HEADING = "Set your new Smackin OS password";

function fnBody(src, name) {
  var start = src.indexOf("function " + name + "(");
  if (start < 0) return "";
  var i = src.indexOf("{", start);
  var depth = 0;
  for (var j = i; j < src.length; j++) {
    var ch = src.charAt(j);
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return "";
}

eq(fnBody(gate, "boot").indexOf("verifyOtp") < 0, "boot does not verify");
eq(fnBody(gate, "start").indexOf("verifyOtp") < 0, "start does not verify");
eq(fnBody(gate, "renderRecovery").indexOf("verifyOtp") < 0, "painting the form does not verify");
eq(fnBody(gate, "recoveryTokenHash").indexOf("verifyOtp") < 0, "reading token_hash does not verify");
var submitBody = fnBody(gate, "submitRecovery");
eq(submitBody.indexOf("verifyOtp") >= 0, "Save verifies");
eq(submitBody.indexOf("return savePassword()") > submitBody.indexOf("verifyOtp"), "verify then save password");
eq(submitBody.indexOf("updateUser") >= 0, "Save calls updateUser");
eq(/verifyOtp\(\s*\{\s*token_hash:\s*tokenHash,\s*type:\s*"recovery"\s*\}\s*\)/.test(submitBody), "verifyOtp token_hash recovery");
eq(gate.indexOf("history.replaceState") >= 0, "uses history.replaceState");
eq(gate.indexOf("token_hash=[^&]*") >= 0, "strips token_hash");
eq(gate.indexOf(EXPIRED) >= 0, "expired link copy");
eq(gate.indexOf(HEADING) >= 0, "set-password heading");
eq(gate.indexOf("smk-forgot-back") >= 0, "button back to forgot password");
eq(new RegExp("resetPasswordForEmail\\([\\s\\S]*redirectTo:\\s*\"" + REDIRECT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\"").test(gate), "forgot password redirectTo");
eq(gate.indexOf("\u2014") < 0 && gate.indexOf("\u2013") < 0, "no em dash");
eq((gate.match(/verifyOtp\s*\(/g) || []).length === 1, "single verifyOtp call");

function memStore() {
  var m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    key: function (i) { return Object.keys(m)[i] || null; },
    get length() { return Object.keys(m).length; }
  };
}

function createDocument() {
  var voidTags = { INPUT: 1, BR: 1, IMG: 1, HR: 1, META: 1, LINK: 1 };
  function el(tag) {
    var node = {
      nodeType: 1,
      tagName: String(tag || "div").toUpperCase(),
      id: "",
      className: "",
      type: "",
      value: "",
      disabled: false,
      text: "",
      children: [],
      parent: null,
      style: {},
      onclick: null,
      onsubmit: null,
      attributes: {}
    };
    node.appendChild = function (child) {
      if (child.parent && child.parent.removeChild) child.parent.removeChild(child);
      child.parent = node;
      node.children.push(child);
      return child;
    };
    node.removeChild = function (child) {
      node.children = node.children.filter(function (c) { return c !== child; });
      if (child) child.parent = null;
    };
    node.remove = function () { if (node.parent) node.parent.removeChild(node); };
    node.replaceWith = function (next) {
      if (!node.parent) return;
      var p = node.parent;
      var i = p.children.indexOf(node);
      if (next.parent && next.parent.removeChild) next.parent.removeChild(next);
      next.parent = p;
      p.children.splice(i, 1, next);
      node.parent = null;
    };
    node.focus = function () {};
    Object.defineProperty(node, "textContent", {
      get: function () {
        if (node.children.length) return node.children.map(textOf).join("");
        return node.text;
      },
      set: function (v) { node.text = String(v); node.children = []; }
    });
    Object.defineProperty(node, "innerHTML", {
      set: function (html) { node.children = []; parseInto(node, String(html || "")); }
    });
    Object.defineProperty(node, "firstChild", {
      get: function () { return node.children[0] || null; }
    });
    return node;
  }
  function textOf(n) {
    if (!n) return "";
    if (n.nodeType === 3) return n.text || "";
    return n.textContent;
  }
  function decode(s) {
    return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  function applyAttrs(node, raw) {
    var re = /([:@a-zA-Z0-9_-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    var m;
    while ((m = re.exec(raw))) {
      var key = m[1];
      var val = m[3] != null ? m[3] : (m[4] != null ? m[4] : (m[5] != null ? m[5] : ""));
      node.attributes[key] = val;
      if (key === "id") node.id = val;
      else if (key === "class") node.className = val;
      else if (key === "type") node.type = val;
      else if (key === "value") node.value = decode(val);
      else if (key === "checked") node.checked = true;
    }
  }
  function parseInto(parent, html) {
    var re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
    var stack = [parent];
    var m;
    while ((m = re.exec(html))) {
      if (m[1]) {
        var want = m[1].toUpperCase();
        for (var i = stack.length - 1; i > 0; i--) {
          if (stack[i].tagName === want) { stack.length = i; break; }
        }
      } else if (m[2]) {
        var child = el(m[2]);
        applyAttrs(child, m[3] || "");
        stack[stack.length - 1].appendChild(child);
        if (!voidTags[child.tagName] && m[4] !== "/") stack.push(child);
      } else if (m[5]) {
        var textNode = { nodeType: 3, text: decode(m[5]), parent: null };
        var cur = stack[stack.length - 1];
        textNode.parent = cur;
        cur.children.push(textNode);
      }
    }
  }
  function walk(node, fn) {
    if (!node || node.nodeType !== 1) return;
    fn(node);
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) walk(kids[i], fn);
  }
  var doc = el("#document");
  doc.head = el("head");
  doc.body = el("body");
  doc.documentElement = el("html");
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);
  doc.readyState = "complete";
  doc.createElement = function (tag) { return el(tag); };
  doc.getElementById = function (id) {
    var found = null;
    walk(doc.documentElement, function (n) { if (!found && n.id === id) found = n; });
    return found;
  };
  doc.addEventListener = function () {};
  return doc;
}

function load(search, hash, behavior) {
  var hooks = {
    verify: [],
    update: [],
    order: [],
    urls: [],
    detect: [],
    listener: null,
    reloads: 0
  };
  var document = createDocument();
  var location = {
    origin: "https://tpdircks.github.io",
    pathname: "/smackin-os/",
    search: search,
    hash: hash || "",
    reload: function () { hooks.reloads++; }
  };
  var history = {
    replaceState: function (_s, _t, url) {
      hooks.urls.push(String(url));
      var q = String(url).indexOf("?");
      if (q >= 0) {
        location.pathname = String(url).slice(0, q);
        location.search = String(url).slice(q);
      } else {
        location.pathname = String(url);
        location.search = "";
      }
      location.hash = "";
    }
  };
  var store = memStore();
  var sessionStore = memStore();
  var session = { user: { email: "ken.tschanz@smackinsnacks.com" } };
  var auth = {
    getSession: function () {
      return Promise.resolve({ data: { session: behavior.session || null } });
    },
    onAuthStateChange: function (cb) { hooks.listener = cb; return { data: { subscription: { unsubscribe: function () {} } } }; },
    verifyOtp: function (args) {
      hooks.order.push("verify");
      hooks.verify.push(args);
      var result = behavior.verify ? behavior.verify(args) : { data: { session: session, user: session.user }, error: null };
      return Promise.resolve(result);
    },
    updateUser: function (args) {
      hooks.order.push("update");
      hooks.update.push(args);
      var result = behavior.update ? behavior.update(args) : { data: { user: session.user }, error: null };
      return Promise.resolve(result);
    },
    resetPasswordForEmail: function (email, opts) {
      hooks.reset = { email: email, opts: opts };
      return Promise.resolve({});
    },
    signInWithPassword: function () { return Promise.resolve({ data: {}, error: null }); },
    signUp: function () { return Promise.resolve({ data: {}, error: null }); },
    signOut: function () { return Promise.resolve({}); },
    resend: function () { return Promise.resolve({}); }
  };
  var win = {
    document: document,
    location: location,
    history: history,
    localStorage: store,
    sessionStorage: sessionStore,
    SMACKIN_CONFIG: {
      SUPABASE_URL: "https://otwjxqhhwljwfyqbfuxz.supabase.co",
      SUPABASE_ANON_KEY: "sb_publishable_test"
    },
    supabase: {
      createClient: function (_url, _key, opts) {
        hooks.detect.push(opts && opts.auth && opts.auth.detectSessionInUrl);
        return { auth: auth };
      }
    }
  };
  var sandbox = {
    window: win,
    document: document,
    location: location,
    history: history,
    localStorage: store,
    sessionStorage: sessionStore,
    setTimeout: function (fn) { hooks.timeouts = hooks.timeouts || []; hooks.timeouts.push(fn); return 1; },
    clearTimeout: function () {},
    setInterval: function () { return 1; },
    clearInterval: function () {},
    Promise: Promise,
    decodeURIComponent: decodeURIComponent,
    console: console
  };
  vm.runInNewContext(gate, sandbox, { filename: "auth-gate.js" });
  hooks.document = document;
  hooks.location = location;
  hooks.auth = auth;
  return hooks;
}

function flush() {
  return new Promise(function (resolve) { setImmediate(resolve); });
}

function text(doc, id) {
  var n = doc.getElementById(id);
  return n ? String(n.textContent || "") : "";
}

function submitForm(doc, pass, pass2) {
  var a = doc.getElementById("smk-pass");
  var b = doc.getElementById("smk-pass2");
  if (a) a.value = pass;
  if (b) b.value = pass2;
  var form = doc.getElementById("smk-form");
  form.onsubmit({ preventDefault: function () {} });
}

async function main() {
  var search = "?board=wh&token_hash=abc123&type=recovery";
  var page = load(search, "", {});
  await flush();
  eq(page.verify.length === 0, "load does not verify");
  eq(page.detect.length === 1 && page.detect[0] === false, "token_hash page does not detect session in URL");
  eq(text(page.document, "smk-sub") === HEADING, "heading on load");
  eq(!!page.document.getElementById("smk-pass") && !!page.document.getElementById("smk-pass2"), "password fields");
  eq(text(page.document, "smk-btn").indexOf("Save") >= 0, "Save button");
  eq(!page.document.getElementById("smk-signout"), "not signed in on load");
  if (page.listener) {
    page.listener("SIGNED_IN", { user: { email: "ken.tschanz@smackinsnacks.com" } });
    page.listener("PASSWORD_RECOVERY", { user: { email: "ken.tschanz@smackinsnacks.com" } });
  }
  eq(page.verify.length === 0, "auth events on load do not verify");
  eq(text(page.document, "smk-sub") === HEADING, "form stays up");

  submitForm(page.document, "short", "short");
  await flush();
  eq(page.verify.length === 0, "short password does not verify");
  eq(text(page.document, "smk-msg") === "Password must be at least 8 characters.", "short password message");

  submitForm(page.document, "abcdefgh", "abcdefgi");
  await flush();
  eq(page.verify.length === 0, "mismatch does not verify");
  eq(text(page.document, "smk-msg") === "Passwords do not match.", "mismatch message");

  submitForm(page.document, "abcdefgh", "abcdefgh");
  await flush();
  await flush();
  eq(page.order.join(",") === "verify,update", "verify then updateUser");
  eq(page.verify.length === 1, "one verify on Save");
  eq(page.verify[0].token_hash === "abc123" && page.verify[0].type === "recovery", "verify args");
  eq(page.update.length === 1 && page.update[0].password === "abcdefgh", "updateUser password");
  eq(page.urls.length === 1, "replaceState once");
  eq(page.urls[0].indexOf("token_hash") < 0 && page.urls[0].indexOf("type=recovery") < 0, "URL cleaned");
  eq(page.urls[0].indexOf("board=wh") >= 0, "other query kept");
  eq(page.location.search.indexOf("token_hash") < 0, "location search cleaned");

  var expired = load("?token_hash=used-token&type=recovery", "", {
    verify: function () {
      return { data: { session: null, user: null }, error: { message: "Email link is invalid or has expired", code: "otp_expired" } };
    }
  });
  await flush();
  eq(expired.verify.length === 0, "expired page load does not verify");
  submitForm(expired.document, "abcdefgh", "abcdefgh");
  await flush();
  eq(expired.verify.length === 1 && expired.update.length === 0, "expired link does not update the password");
  eq(text(expired.document, "smk-msg") === EXPIRED, "expired message");
  var back = expired.document.getElementById("smk-forgot-back");
  eq(!!back && back.textContent === "Forgot password", "forgot password button");
  back.onclick();
  eq(!!expired.document.getElementById("smk-forgot"), "back on the Forgot password form");
  eq(text(expired.document, "smk-sub").indexOf("Sign in") >= 0, "login screen");

  var missing = load("?token_hash=gone&type=recovery", "", {
    verify: function () {
      return { data: { session: null, user: null }, error: { message: "One-time token not found" } };
    }
  });
  await flush();
  submitForm(missing.document, "abcdefgh", "abcdefgh");
  await flush();
  eq(text(missing.document, "smk-msg") === EXPIRED, "used token message");
  eq(missing.update.length === 0, "used token does not update");

  var legacy = load("", "#access_token=legacy&type=recovery", {});
  await flush();
  eq(legacy.verify.length === 0, "legacy hash load does not verifyOtp");
  eq(legacy.detect[0] === true, "legacy hash still detects the session");
  eq(text(legacy.document, "smk-sub") === HEADING, "legacy form");
  submitForm(legacy.document, "abcdefgh", "abcdefgh");
  await flush();
  eq(legacy.verify.length === 0 && legacy.update.length === 1, "legacy Save only updates the password");
  eq(legacy.urls.length === 1 && legacy.urls[0].indexOf("access_token") < 0, "legacy hash cleared");

  if (fail.length) {
    fail.forEach(function (msg) { console.error("FAIL", msg); });
    process.exit(1);
  }
  console.log("ok auth token_hash");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});

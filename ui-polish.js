/* ============================================================================
   Smackin' OS - visual polish (ui-polish.js)
   DOM-only. Does not change data, writes, or render().
   Nav work uses one MutationObserver on #nav. No timers.
   Group open/closed state stays in app.js (localStorage key smk-navcollapsed),
   which already keeps the group that holds the active item open.
   ========================================================================== */
(function () {
  "use strict";
  var CAP = 8;
  var BADGE_KEY = "smk-ui-navbadges";
  var gridOpen = { ordnow: false, ordproduce: false };
  var remembered = {};
  var navBusy = false;
  var viewBusy = false;

  function loadBadgeStore() {
    try { return JSON.parse(localStorage.getItem(BADGE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveBadgeStore(store) {
    try {
      var next = JSON.stringify(store);
      if (localStorage.getItem(BADGE_KEY) !== next) localStorage.setItem(BADGE_KEY, next);
    } catch (e) {}
  }

  function isActionBadge(el) {
    if (!el) return false;
    if (el.getAttribute("data-ui-kind") === "action") return true;
    if (el.getAttribute("data-ui-kind") === "count") return false;
    var bg = (el.getAttribute("style") || "").replace(/\s/g, "").toLowerCase();
    if (bg.indexOf("#b52024") >= 0 || bg.indexOf("181,32,36") >= 0) return true;
    if (el.classList.contains("alert")) return true;
    return false;
  }
  function markKind(el) {
    if (!el || el.getAttribute("data-ui-kind")) return el && el.getAttribute("data-ui-kind") === "action";
    var action = isActionBadge(el);
    el.setAttribute("data-ui-kind", action ? "action" : "count");
    return action;
  }
  function itemLabel(btn) {
    var span = btn.querySelector("span");
    return ((span ? span.textContent : btn.textContent) || "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  function hideDupes(nav) {
    var items = Array.prototype.slice.call(nav.querySelectorAll(".navitem"));
    var byLabel = {};
    items.forEach(function (btn) {
      var label = itemLabel(btn);
      if (!label) return;
      (byLabel[label] || (byLabel[label] = [])).push(btn);
    });
    Object.keys(byLabel).forEach(function (label) {
      var list = byLabel[label];
      if (list.length < 2) {
        list[0].classList.remove("ui-nav-dup");
        return;
      }
      var keep = list[0];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id) { keep = list[i]; break; }
      }
      list.forEach(function (btn) { btn.classList.toggle("ui-nav-dup", btn !== keep); });
    });
  }
  function groupKey(g) {
    var btn = g.querySelector(":scope > .navlabel");
    var oc = btn ? (btn.getAttribute("onclick") || "") : "";
    var m = oc.match(/navGroupToggle\('([^']+)'\)/);
    return m ? m[1] : "";
  }
  function syncHeader(label, wanted) {
    if (!label) return;
    var have = label.querySelectorAll('.navbadge[data-ui-group="1"]');
    var keep = {};
    wanted.forEach(function (w) { keep[w.text] = w; });
    Array.prototype.forEach.call(have, function (el) {
      var t = (el.textContent || "").trim();
      if (!keep[t]) { el.parentNode.removeChild(el); return; }
      el.classList.toggle("ui-action", !!keep[t].action);
      el.setAttribute("data-ui-kind", keep[t].action ? "action" : "count");
      delete keep[t];
    });
    Object.keys(keep).forEach(function (t) {
      var span = document.createElement("span");
      span.className = "navbadge" + (keep[t].action ? " ui-action" : "");
      span.setAttribute("data-ui-group", "1");
      span.setAttribute("data-ui-kind", keep[t].action ? "action" : "count");
      span.textContent = t;
      label.appendChild(span);
    });
  }
  function polishBadges(nav) {
    var store = loadBadgeStore();
    var storeChanged = false;
    Array.prototype.forEach.call(nav.querySelectorAll(".navgroup"), function (g) {
      var key = groupKey(g);
      var label = g.querySelector(":scope > .navlabel");
      var items = g.querySelectorAll(":scope > .navitem");
      var collapsed = g.classList.contains("collapsed") || !items.length;
      if (!collapsed) {
        var badges = [];
        Array.prototype.forEach.call(items, function (btn) {
          var b = btn.querySelector(":scope > .navbadge");
          if (!b || b.getAttribute("data-ui-group") === "1") return;
          var action = markKind(b);
          badges.push({ el: b, text: (b.textContent || "").trim(), action: action });
        });
        var freq = {};
        badges.forEach(function (b) { if (b.text) freq[b.text] = (freq[b.text] || 0) + 1; });
        var folded = {};
        Object.keys(freq).forEach(function (t) { if (freq[t] >= 2) folded[t] = true; });
        var wanted = [];
        Object.keys(folded).forEach(function (t) {
          var action = badges.some(function (b) { return b.text === t && b.action; });
          wanted.push({ text: t, action: action });
        });
        badges.forEach(function (b) {
          var fold = !!folded[b.text];
          b.el.classList.toggle("ui-badge-folded", fold);
          b.el.classList.toggle("ui-action", !fold && b.action);
        });
        if (key) {
          remembered[key] = wanted;
          if (JSON.stringify(store[key] || []) !== JSON.stringify(wanted)) {
            store[key] = wanted;
            storeChanged = true;
          }
        }
        syncHeader(label, wanted);
      } else if (key) {
        var saved = remembered[key] || store[key];
        if (saved && !remembered[key]) remembered[key] = saved;
        if (saved && saved.length) syncHeader(label, saved);
      }
    });
    if (storeChanged) saveBadgeStore(store);
    // Badges that are not part of a repeated count: red only when action is needed.
    Array.prototype.forEach.call(nav.querySelectorAll(".navitem > .navbadge"), function (b) {
      if (b.classList.contains("ui-badge-folded")) return;
      var action = markKind(b);
      b.classList.toggle("ui-action", action);
    });
  }
  function polishNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    hideDupes(nav);
    polishBadges(nav);
  }
  function onNav() {
    if (navBusy) return;
    navBusy = true;
    try { polishNav(); } finally { navBusy = false; }
  }

  function capGrid(id) {
    var card = document.getElementById(id);
    if (!card) return;
    var grid = card.querySelector(".ordgrid");
    if (!grid) return;
    var n = grid.querySelectorAll(".ordtile").length;
    var cap = n > CAP;
    grid.classList.toggle("ui-capped", cap && !gridOpen[id]);
    var btn = card.querySelector(":scope > .ui-showall");
    if (!cap) {
      if (btn) btn.parentNode.removeChild(btn);
      return;
    }
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ui-showall";
      btn.addEventListener("click", function () {
        gridOpen[id] = !gridOpen[id];
        capGrid(id);
      });
      grid.insertAdjacentElement("afterend", btn);
    }
    var next = gridOpen[id] ? "Show less" : "Show all";
    if (btn.textContent !== next) btn.textContent = next;
  }
  function cellBlank(td) {
    if (!td) return true;
    var t = (td.innerText || "").replace(/[\u2010-\u2015\-]/g, "").replace(/\s+/g, "");
    return t.length === 0;
  }
  function polishOrders() {
    var body = document.getElementById("ordBody");
    if (!body) return;
    var table = body.closest("table");
    if (!table) return;
    var rows = Array.prototype.filter.call(body.rows, function (tr) {
      return tr.style.display !== "none" && tr.cells.length >= 5;
    });
    var custBlank = rows.length > 0 && rows.every(function (tr) { return cellBlank(tr.cells[0]); });
    var notesBlank = rows.length > 0 && rows.every(function (tr) { return cellBlank(tr.cells[4]); });
    table.classList.toggle("ui-hide-cust", custBlank);
    table.classList.toggle("ui-hide-notes", notesBlank);
  }
  function polishProd() {
    Array.prototype.forEach.call(document.querySelectorAll(".pocard"), function (card) {
      var prio = card.querySelector(".poprio");
      var t = ((prio && prio.textContent) || "").toUpperCase();
      card.classList.toggle("ui-p1", t.indexOf("P1") >= 0 || t.indexOf("CRITICAL") >= 0);
      if (card.getAttribute("data-ui-instr") === "1") return;
      var blocks = card.querySelectorAll(".poinstr");
      card.setAttribute("data-ui-instr", "1");
      if (!blocks.length) return;
      var long = false;
      for (var i = 0; i < blocks.length; i++) {
        if ((blocks[i].textContent || "").trim().length > 90) long = true;
      }
      if (!long) return;
      var wrap = document.createElement("div");
      wrap.className = "ui-instr";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ui-instr-btn";
      btn.textContent = "Show instructions";
      var body = document.createElement("div");
      body.className = "ui-instr-body";
      body.hidden = true;
      blocks[0].parentNode.insertBefore(wrap, blocks[0]);
      Array.prototype.forEach.call(blocks, function (b) { body.appendChild(b); });
      wrap.appendChild(btn);
      wrap.appendChild(body);
      btn.addEventListener("click", function () {
        var open = body.hidden;
        body.hidden = !open;
        btn.textContent = body.hidden ? "Show instructions" : "Hide instructions";
      });
    });
  }
  function polishView() {
    capGrid("ordnow");
    capGrid("ordproduce");
    polishOrders();
    polishProd();
  }
  function onView() {
    if (viewBusy) return;
    viewBusy = true;
    try { polishView(); } finally { viewBusy = false; }
  }

  function placeSignOut() {
    var b = document.getElementById("smk-signout");
    var header = document.querySelector("header");
    if (!b || !header || b.parentNode === header) return;
    header.appendChild(b);
  }
  function watchSignOut() {
    placeSignOut();
    if (!document.body || document.body.__uiSignObs) return;
    var obs = new MutationObserver(placeSignOut);
    document.body.__uiSignObs = obs;
    obs.observe(document.body, { childList: true });
  }

  function boot() {
    var nav = document.getElementById("nav");
    if (nav && !nav.__uiPolishObs && typeof MutationObserver === "function") {
      var obs = new MutationObserver(onNav);
      nav.__uiPolishObs = obs;
      obs.observe(nav, { childList: true, subtree: true });
      onNav();
    }
    var view = document.getElementById("view");
    if (view && !view.__uiPolishObs && typeof MutationObserver === "function") {
      var vobs = new MutationObserver(onView);
      view.__uiPolishObs = vobs;
      vobs.observe(view, { childList: true, subtree: true });
      onView();
    }
    watchSignOut();
    if (!document.documentElement.__uiPolishInput) {
      document.documentElement.__uiPolishInput = true;
      document.addEventListener("input", function (e) {
        if (e.target && e.target.id === "ordSearch") polishOrders();
      });
    }
  }
  var started = false;
  function start() { if (started) return; started = true; boot(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

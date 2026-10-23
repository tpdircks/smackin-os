/* ============================================================================
   Smackin' OS - Stock alerts (stock-alerts.js)
   Sticky out-of-stock / low-stock bar on every screen, a header badge after
   dismiss, row highlighting, and a Low / Out filter on Inventory.
   Counts use the same rule as the dashboard tiles in viewHome:
     OUT: reorder > 0 and DB.onHand(id) <= 0
     LOW: reorder > 0 and 0 < DB.onHand(id) < reorder
   The bar is mounted beside #view, not inside it, so app render() cannot
   destroy the node between touchstart and click. Open state is a class
   (sa-open), not the hidden attribute. Self-contained. Does not edit app.js.
   ========================================================================== */
(function () {
  "use strict";

  var bar = null;
  var badge = null;
  var expanded = false;
  var collapsed = false;
  var pending = null;
  var painting = false;
  var lowOutOnly = false;
  var lastSplit = { out: [], low: [] };

  var COPY = {
    en: {
      out: function (n) { return n + " out of stock"; },
      low: function (n) { return n + " low stock"; },
      onHand: "On hand",
      reorder: "Reorder point",
      dismiss: "Dismiss",
      view: "View items",
      hide: "Hide items",
      open: "Open in Inventory",
      go: "Inventory",
      filter: "Low / Out",
      region: "Stock alerts",
      badge: "Show stock alerts"
    },
    es: {
      out: function (n) { return n + (n === 1 ? " agotado" : " agotados"); },
      low: function (n) { return n + " stock bajo"; },
      onHand: "Disponible",
      reorder: "Punto de reorden",
      dismiss: "Ocultar",
      view: "Ver items",
      hide: "Ocultar items",
      open: "Abrir en Inventario",
      go: "Inventario",
      filter: "Bajo / Agotado",
      region: "Alertas de stock",
      badge: "Ver alertas de stock"
    },
    pt: {
      out: function (n) { return n + (n === 1 ? " esgotado" : " esgotados"); },
      low: function (n) { return n + " estoque baixo"; },
      onHand: "Em estoque",
      reorder: "Ponto de reposicao",
      dismiss: "Ocultar",
      view: "Ver itens",
      hide: "Ocultar itens",
      open: "Abrir no Inventario",
      go: "Estoque",
      filter: "Baixo / Esgotado",
      region: "Alertas de estoque",
      badge: "Ver alertas de estoque"
    }
  };

  function lang() {
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function copy() { return COPY[lang()] || COPY.en; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    var x = Number(n);
    if (isNaN(x)) x = 0;
    return (Math.round(x * 100) / 100).toLocaleString();
  }
  function onHandQty(it) {
    try { return window.DB.onHand(it.id); } catch (e) { return null; }
  }
  function classifyList() {
    var out = [], low = [];
    if (!window.DB || typeof DB.items !== "function" || typeof DB.onHand !== "function") {
      return { out: out, low: low };
    }
    var items = [];
    try { items = DB.items() || []; } catch (e) { items = []; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !(it.reorder > 0)) continue;
      var oh = onHandQty(it);
      if (oh == null) continue;
      if (oh <= 0) out.push({ it: it, oh: oh });
      else if (oh > 0 && oh < it.reorder) low.push({ it: it, oh: oh });
    }
    function byName(a, b) {
      var an = String(a.it.name || a.it.code || "");
      var bn = String(b.it.name || b.it.code || "");
      return an < bn ? -1 : an > bn ? 1 : 0;
    }
    out.sort(byName);
    low.sort(byName);
    return { out: out, low: low };
  }
  function signature(split) {
    function part(list, st) {
      return list.map(function (r) {
        return st + ":" + r.it.id + ":" + r.oh + ":" + r.it.reorder;
      }).sort().join(",");
    }
    return part(split.out, "out") + "|" + part(split.low, "low");
  }

  function styleOnce() {
    if (document.getElementById("sa-style")) return;
    var s = document.createElement("style");
    s.id = "sa-style";
    s.textContent = [
      "#sa-bar{position:sticky;top:0;z-index:70;margin:0;overflow:visible;",
      "border-bottom:4px solid #B52024;background:#fff;color:#303030;",
      "box-shadow:0 10px 28px rgba(181,32,36,.18);",
      "font-family:Barlow,system-ui,Segoe UI,Arial,sans-serif;touch-action:manipulation}",
      "#sa-bar.sa-only-low{border-bottom-color:#E39412;box-shadow:0 10px 28px rgba(227,148,18,.22)}",
      "#sa-bar[hidden]{display:none !important}",
      "#sa-bar .sa-sum{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;cursor:pointer}",
      "#sa-bar .sa-bang{flex:0 0 28px;width:28px;height:28px;border-radius:50%;background:#B52024;color:#fff;",
      "font-weight:800;font-size:16px;display:inline-flex;align-items:center;justify-content:center}",
      "#sa-bar.sa-only-low .sa-bang{background:#E39412;color:#1a1204}",
      "#sa-bar .sa-text{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4px;flex:1;min-width:160px;",
      "font-size:18px;font-weight:800;line-height:1.25}",
      "#sa-bar .sa-out-phrase{color:#B52024}",
      "#sa-bar .sa-low-phrase{color:#C67F16}",
      "#sa-bar .sa-sep{color:#6b7280;font-weight:700}",
      "#sa-bar .sa-view{flex:0 0 auto;min-height:48px;min-width:148px;padding:12px 18px;border:0;border-radius:10px;",
      "background:#B52024;color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer;touch-action:manipulation}",
      "#sa-bar.sa-only-low .sa-view{background:#E39412;color:#1a1204}",
      "#sa-bar .sa-view:hover{filter:brightness(1.08)}",
      "#sa-bar .sa-dismiss{flex:0 0 auto;min-height:48px;padding:12px 14px;background:#fff;color:#303030;",
      "border:1px solid #c3ccd8;border-radius:10px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;touch-action:manipulation}",
      "#sa-bar .sa-list{display:none;border-top:1px solid #ead8d6;max-height:60vh;overflow:auto;",
      "-webkit-overflow-scrolling:touch;padding:8px;flex-direction:column;gap:6px;background:#fff}",
      "#sa-bar.sa-open .sa-list{display:flex}",
      "#sa-bar .sa-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#fff;",
      "border:1px solid #eadfe0;border-radius:8px;padding:10px;cursor:pointer;font:inherit;color:inherit;min-height:48px;touch-action:manipulation}",
      "#sa-bar .sa-item:hover{background:#f7f8fb}",
      "#sa-bar .sa-item-name{flex:1;min-width:140px}",
      "#sa-bar .sa-item-name b{display:block;font-size:14px}",
      "#sa-bar .sa-code{display:block;font-size:12px;color:#667;font-weight:600}",
      "#sa-bar .sa-meta{font-size:13px;white-space:nowrap;color:#445}",
      "#sa-bar .sa-meta b{font-size:14px;color:#1a1a1a}",
      "#sa-bar .sa-go{font-size:12px;font-weight:800;color:#1F3864;white-space:nowrap}",
      "#sa-badge{display:inline-flex;align-items:center;min-height:40px;margin:0 8px;padding:8px 12px;",
      "border:0;border-radius:999px;background:#B52024;color:#fff;font-family:Barlow,system-ui,Segoe UI,Arial,sans-serif;",
      "font-size:14px;font-weight:800;letter-spacing:.2px;cursor:pointer;touch-action:manipulation;white-space:nowrap}",
      "#sa-badge.sa-only-low{background:#E39412;color:#1a1204}",
      "#sa-badge[hidden]{display:none !important}",
      "#sa-lowout{font-weight:800 !important}",
      "#sa-lowout.active{background:#B52024 !important;color:#fff !important;border-color:#B52024 !important}",
      "#sa-bar .sa-chip,#dashBody .sa-chip{display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;",
      "font-size:13px;font-weight:800;letter-spacing:.4px;line-height:1.2;color:#fff;vertical-align:middle}",
      "#sa-bar .sa-chip{margin-left:0}",
      ".sa-chip-out{background:#B52024}",
      ".sa-chip-low{background:#E39412}",
      "#dashBody tr.sa-out > td{background:#F8D0CC !important}",
      "#dashBody tr.sa-low > td{background:#FDE4B8 !important}",
      "#dashBody tr.sa-out > td:first-child{box-shadow:inset 6px 0 0 #B52024}",
      "#dashBody tr.sa-low > td:first-child{box-shadow:inset 6px 0 0 #E39412}",
      "#dashBody tr.sa-focus > td{box-shadow:inset 0 0 0 2px #1F3864}",
      "#dashBody tr.sa-out.sa-focus > td:first-child{box-shadow:inset 6px 0 0 #B52024, inset 0 0 0 2px #1F3864}",
      "#dashBody tr.sa-low.sa-focus > td:first-child{box-shadow:inset 6px 0 0 #E39412, inset 0 0 0 2px #1F3864}",
      "@media (max-width:820px){#sa-bar .sa-text{font-size:16px}#sa-bar .sa-view{flex:1 1 100%}#sa-bar .sa-item{flex-wrap:wrap}#sa-bar .sa-meta{white-space:normal}}",
      "@media print{#sa-bar,#sa-badge{display:none !important}}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureChrome() {
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "sa-bar";
      bar.className = "sa-bar";
      bar.hidden = true;
      bar.setAttribute("role", "region");
      bar.addEventListener("click", onBarClick);
    }
    if (!badge) {
      badge = document.createElement("button");
      badge.id = "sa-badge";
      badge.type = "button";
      badge.hidden = true;
      badge.addEventListener("click", onBadgeClick);
    }
    var header = document.querySelector("header");
    if (header && header.parentNode) {
      if (!(bar.parentNode === header.parentNode && bar.previousSibling === header)) {
        header.parentNode.insertBefore(bar, header.nextSibling);
      }
      var langBox = header.querySelector(".lang");
      var before = langBox || null;
      if (!(badge.parentNode === header && badge.nextSibling === before)) {
        header.insertBefore(badge, before);
      }
      return true;
    }
    return false;
  }

  function rowHtml(rec, st, c) {
    var it = rec.it;
    var chipCls = st === "out" ? "sa-chip-out" : "sa-chip-low";
    var chipTxt = st === "out" ? "OUT" : "LOW";
    return '<button type="button" class="sa-item" data-id="' + esc(it.id) + '" title="' + esc(c.open) + '">' +
      '<span class="sa-chip ' + chipCls + '">' + chipTxt + '</span>' +
      '<span class="sa-item-name"><b>' + esc(it.name || it.code || "") + '</b>' +
      '<span class="sa-code">' + esc(it.code || "") + '</span></span>' +
      '<span class="sa-meta">' + esc(c.onHand) + ' <b>' + fmt(rec.oh) + '</b></span>' +
      '<span class="sa-meta">' + esc(c.reorder) + ' <b>' + fmt(it.reorder) + '</b></span>' +
      '<span class="sa-go">' + esc(c.go) + '</span>' +
      '</button>';
  }

  function summaryHtml(split, c) {
    var text = '<span class="sa-out-phrase">' + esc(c.out(split.out.length)) + '</span>' +
      '<span class="sa-sep">, </span>' +
      '<span class="sa-low-phrase">' + esc(c.low(split.low.length)) + '</span>';
    var viewLabel = expanded ? c.hide : c.view;
    return '<div class="sa-sum">' +
      '<span class="sa-bang" aria-hidden="true">!</span>' +
      '<span class="sa-text">' + text + '</span>' +
      '<button type="button" class="sa-view" aria-expanded="' + (expanded ? "true" : "false") + '">' + esc(viewLabel) + '</button>' +
      '<button type="button" class="sa-dismiss">' + esc(c.dismiss) + '</button>' +
      '</div>';
  }

  function applyVisibility(split) {
    var has = split.out.length + split.low.length > 0;
    var onlyLow = has && split.out.length === 0;
    if (bar) {
      bar.hidden = !has || collapsed;
      bar.classList.toggle("sa-open", !!expanded && !collapsed && has);
      bar.classList.toggle("sa-only-low", onlyLow);
      bar.setAttribute("aria-label", copy().region);
      var btn = bar.querySelector(".sa-view");
      if (btn) {
        btn.textContent = expanded ? copy().hide : copy().view;
        btn.setAttribute("aria-expanded", expanded && !collapsed ? "true" : "false");
      }
    }
    if (badge) {
      badge.hidden = !has || !collapsed;
      badge.classList.toggle("sa-only-low", onlyLow);
      var label = "OUT " + split.out.length + " / LOW " + split.low.length;
      var txt = badge.querySelector(".sa-b-txt");
      if (!txt) {
        badge.innerHTML = '<span class="sa-b-txt"></span>';
        txt = badge.querySelector(".sa-b-txt");
      }
      if (txt.textContent !== label) txt.textContent = label;
      badge.setAttribute("aria-label", copy().badge + ": " + label);
    }
  }

  function renderChrome(split) {
    lastSplit = split;
    if (!bar || !badge) return;
    var c = copy();
    var key = signature(split) + "@" + lang();
    if (bar.getAttribute("data-key") !== key) {
      bar.setAttribute("data-key", key);
      var list = split.out.map(function (r) { return rowHtml(r, "out", c); }).join("") +
        split.low.map(function (r) { return rowHtml(r, "low", c); }).join("");
      bar.innerHTML = summaryHtml(split, c) + '<div class="sa-list">' + list + '</div>';
    }
    applyVisibility(split);
  }

  function codeFromRow(tr, codeMap) {
    var el = tr.querySelector("td .muted.sm");
    if (el) {
      var t = String(el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (t) return t;
    }
    var parts = String(tr.getAttribute("data-txt") || "").toLowerCase().split(/\s+/);
    for (var i = 0; i < parts.length; i++) if (codeMap[parts[i]]) return parts[i];
    return "";
  }
  function placeChip(tr, st) {
    var old = tr.querySelector(".sa-chip");
    if (old) old.remove();
    var chip = document.createElement("span");
    chip.className = "sa-chip " + (st === "out" ? "sa-chip-out" : "sa-chip-low");
    chip.textContent = st === "out" ? "OUT" : "LOW";
    var host = tr.querySelector("td .muted.sm");
    var cell = host ? host.parentNode : (tr.cells && tr.cells[0]);
    if (!cell) return;
    var b = cell.querySelector("b");
    if (b) cell.insertBefore(chip, b.nextSibling);
    else cell.appendChild(chip);
  }
  function paintRows(split) {
    var body = document.getElementById("dashBody");
    if (!body) return;
    var codeMap = {};
    split.low.forEach(function (r) { var c = String(r.it.code || "").toLowerCase(); if (c) codeMap[c] = "low"; });
    split.out.forEach(function (r) { var c = String(r.it.code || "").toLowerCase(); if (c) codeMap[c] = "out"; });
    var rows = body.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var code = codeFromRow(tr, codeMap);
      var st = codeMap[code] || "ok";
      if (tr.getAttribute("data-sa") === st && (st === "ok" || tr.querySelector(".sa-chip"))) continue;
      tr.setAttribute("data-sa", st);
      tr.classList.remove("sa-out", "sa-low");
      var old = tr.querySelector(".sa-chip");
      if (old) old.remove();
      if (st === "ok") continue;
      tr.classList.add(st === "out" ? "sa-out" : "sa-low");
      placeChip(tr, st);
    }
  }

  function ensureFilter() {
    var cat = document.querySelector("#view .catbar");
    if (!cat) return;
    var btn = document.getElementById("sa-lowout");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "sa-lowout";
      btn.type = "button";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        lowOutOnly = !lowOutOnly;
        applyFilter();
      });
      cat.appendChild(btn);
    } else if (btn.parentNode !== cat) {
      cat.appendChild(btn);
    }
    btn.textContent = copy().filter;
    btn.classList.toggle("active", lowOutOnly);
  }
  function applyFilter() {
    ensureFilter();
    var body = document.getElementById("dashBody");
    if (!body) return;
    var input = document.getElementById("dashSearch");
    var q = input ? String(input.value || "").toLowerCase().trim() : "";
    var rows = body.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var txt = tr.getAttribute("data-txt") || "";
      var textOk = !q || txt.indexOf(q) >= 0;
      var alertOk = !lowOutOnly || tr.classList.contains("sa-out") || tr.classList.contains("sa-low");
      tr.style.display = (textOk && alertOk) ? "" : "none";
    }
    var btn = document.getElementById("sa-lowout");
    if (btn) btn.classList.toggle("active", lowOutOnly);
  }

  function applyFocus() {
    if (!pending) return false;
    var body = document.getElementById("dashBody");
    if (!body) return false;
    var q = pending.code;
    var input = document.getElementById("dashSearch");
    if (input && window.UI && typeof UI.dashSearch === "function") {
      if (input.value !== q) { input.value = q; UI.dashSearch(q); }
    }
    var rows = body.querySelectorAll("tr");
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].style.display === "none") continue;
      var code = String((rows[i].querySelector("td .muted.sm") || {}).textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (code === q) { found = rows[i]; break; }
    }
    if (!found) return false;
    found.classList.add("sa-focus");
    try { found.scrollIntoView({ block: "center" }); } catch (e) { try { found.scrollIntoView(); } catch (e2) {} }
    pending = null;
    applyFilter();
    return true;
  }

  function openItem(id) {
    var it = null;
    try {
      var items = DB.items() || [];
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === String(id)) { it = items[i]; break; }
      }
    } catch (e) {}
    if (!it) return;
    pending = { code: String(it.code || it.name || "").toLowerCase(), id: String(it.id) };
    collapsed = false;
    try { if (typeof window.UI_go === "function") window.UI_go("dash"); } catch (e) {}
    try { if (window.UI && typeof UI.cat === "function") UI.cat("all"); } catch (e) {}
    paint();
  }

  function onBarClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var item = t.closest(".sa-item");
    if (item) {
      e.preventDefault();
      openItem(item.getAttribute("data-id"));
      return;
    }
    if (t.closest(".sa-dismiss")) {
      e.preventDefault();
      collapsed = true;
      expanded = false;
      applyVisibility(lastSplit);
      return;
    }
    expanded = !expanded;
    collapsed = false;
    applyVisibility(lastSplit);
  }
  function onBadgeClick(e) {
    e.preventDefault();
    collapsed = false;
    expanded = true;
    applyVisibility(lastSplit);
  }

  function paint() {
    if (painting) return;
    painting = true;
    try {
      var split = classifyList();
      ensureChrome();
      renderChrome(split);
      paintRows(split);
      ensureFilter();
      applyFilter();
      applyFocus();
    } finally {
      painting = false;
    }
  }

  function watchView(view) {
    if (!view || view.__saObs) return;
    var obs = new MutationObserver(function () { paint(); });
    view.__saObs = obs;
    obs.observe(view, { childList: true });
  }
  function boot() {
    styleOnce();
    ensureChrome();
    var view = document.getElementById("view");
    if (view) watchView(view);
    if (!document.documentElement.__saInput) {
      document.documentElement.__saInput = true;
      document.addEventListener("input", function (e) {
        if (e.target && e.target.id === "dashSearch") applyFilter();
      });
    }
    paint();
  }

  if (window.DB && typeof DB.onChange === "function") DB.onChange(function () { paint(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

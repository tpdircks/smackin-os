/* ============================================================================
   Smackin' OS - Mixing recipe approvals (mixing-recipes.js)
   Standalone. Does not edit app.js.

   Shows WIP approval on each Mixing recipe card. An amber badge appears
   when the sheet lb/100 lb batch and the OS seasoning rate differ by more
   than 0.3 lb. Blank seasoning amounts are already filled in recipes.js.
   This file does not change those rates.
   ========================================================================== */
(function (root) {
  "use strict";

  var DIFF_LB = 0.3;
  var seedLb = 100;
  var query = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function fmtNum(v) {
    var n = num(v);
    if (n == null) return "";
    var s = (Math.round(n * 100) / 100).toFixed(2);
    if (s.slice(-2) === "00") return s.slice(0, -3);
    if (s.slice(-1) === "0") return s.slice(0, -1);
    return s;
  }
  function fmtMalt(v) {
    var n = num(v);
    if (n == null) return "";
    return n.toFixed(1);
  }
  function loose(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
  function ratesDiffer(os, wip) {
    var a = num(os);
    var b = num(wip);
    if (a == null || b == null) return false;
    return Math.abs(a - b) > DIFF_LB;
  }
  function recipes() {
    return root.RECIPES || {};
  }
  function list() {
    return Object.keys(recipes()).map(function (k) {
      var r = recipes()[k];
      return r;
    });
  }
  function codeRank(code) {
    var m = /^([A-Z]+)(\d+)$/.exec(String(code || ""));
    if (!m) return "9|9999";
    var group = { S: "0", L: "1", A: "2" }[m[1]] || "3";
    return group + "|" + ("0000" + m[2]).slice(-4);
  }
  function rank(r) {
    if (ratesDiffer(r.seas_lbs, r.wip_lbs_per_batch)) return 0;
    if (r.seas_source) return 1;
    return 2;
  }
  function sorted(rows) {
    return rows.slice().sort(function (a, b) {
      var d = rank(a) - rank(b);
      if (d) return d;
      var c = codeRank(a.code).localeCompare(codeRank(b.code));
      if (c) return c;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }
  function approvalLine(r) {
    if (!r || !r.approved_sample) return "";
    var bits = [r.approved_sample];
    if (r.flavor_house) bits.push(r.flavor_house);
    var tail = [];
    if (r.approved_by) tail.push(r.approved_by);
    if (r.approved_date) tail.push(r.approved_date);
    var line = "Approved: " + bits.join(" ");
    if (tail.length) line += ", " + tail.join(" ");
    return line;
  }
  function badgeText(r) {
    if (!r || !ratesDiffer(r.seas_lbs, r.wip_lbs_per_batch)) return "";
    return "WIP differs: " + fmtNum(r.wip_lbs_per_batch) + " vs " + fmtNum(r.seas_lbs) + " lb";
  }
  function sheetNameLine(r) {
    if (!r.wip_sheet_flavor) return "";
    var a = loose(r.wip_sheet_flavor);
    var b = loose(r.name);
    if (!a || a === b) return "";
    var stripped = a.replace(/seasoning|snack|style|type/g, "");
    if (stripped === b) return "";
    return "WIP flavor: " + r.wip_sheet_flavor;
  }
  function rateLine(r) {
    if (num(r.wip_g_per_lb) != null) {
      return fmtNum(r.wip_g_per_lb) + " g per lb of seed (" + fmtNum(r.wip_lbs_per_batch) + " lb per 100 lb batch on the sheet)";
    }
    if (r.wip_rate_from === "RECIPE-INGREDIENTS LIST" && ratesDiffer(r.seas_lbs, r.wip_lbs_per_batch)) {
      return "Sheet " + fmtNum(r.wip_lbs_per_batch) + " lb per 100 lb batch, from RECIPE-INGREDIENTS LIST";
    }
    return "";
  }
  function osLine(r) {
    if (num(r.seas_lbs) == null) return "Seasoning amount is blank.";
    if (r.seas_source) return "Seasoning " + fmtNum(r.seas_lbs) + " lb per 100 lb batch.";
    return "OS seasoning " + fmtNum(r.seas_lbs) + " lb per 100 lb batch.";
  }
  function maltNote(r) {
    if (num(r.wip_malt_lbs) !== 2) return "";
    if (num(r.malto_lbs) == null) return "WIP malt is 2.0 lb per 100 lb batch. OS malt is blank.";
    if (num(r.malto_lbs) === 2) return "";
    return "WIP malt is 2.0 lb per 100 lb batch. OS malt is " + fmtMalt(r.malto_lbs) + " lb.";
  }
  function ingNote(r) {
    if (num(r.wip_ing_lbs_per_batch) == null || num(r.wip_lbs_per_batch) == null) return "";
    if (!ratesDiffer(r.wip_ing_lbs_per_batch, r.wip_lbs_per_batch)) return "";
    return "Ingredients list: " + fmtNum(r.wip_ing_lbs_per_batch) + " lb per 100 lb batch.";
  }
  function seedCellLine(r) {
    if (num(r.wip_seed_cell) == null) return "";
    return "Sheet seed column: " + fmtNum(r.wip_seed_cell) + ".";
  }
  function findText(r) {
    return [
      r.name, r.code, r.approved_sample, r.flavor_house, r.vendor_item,
      r.wip_sheet_flavor, r.seas_source, badgeText(r)
    ].join(" ").toLowerCase();
  }
  function line(text, cls) {
    if (!text) return "";
    return '<div class="' + cls + '">' + esc(text) + "</div>";
  }
  function cardHtml(r, seed) {
    var badge = badgeText(r);
    var g = num(r.wip_g_per_lb);
    var rate = num(r.seas_lbs);
    var diff = badge ? " mxr-diff" : "";
    return '<article class="mxr-card' + diff + '" data-mxr-find="' + esc(findText(r)) + '">' +
      '<div class="mxr-top"><div><div class="mxr-name">' + esc(r.name || "") + "</div>" +
      '<div class="mxr-code">' + esc(r.code || "") + "</div></div>" +
      (badge ? '<span class="mxr-badge">' + esc(badge) + "</span>" : "") +
      "</div>" +
      line(approvalLine(r), "mxr-app") +
      line(sheetNameLine(r), "mxr-meta") +
      line(r.vendor_item ? "Vendor item " + r.vendor_item : "", "mxr-meta") +
      line(osLine(r), "mxr-meta") +
      line(r.seas_source ? "Source: " + r.seas_source : "", "mxr-src") +
      line(rateLine(r), "mxr-meta") +
      line(ingNote(r), "mxr-meta") +
      line(maltNote(r), "mxr-malt") +
      line(seedCellLine(r), "mxr-meta") +
      '<div class="mxr-batch" data-mxr-batch="' + (rate == null ? "" : String(rate)) + '"' +
      (g == null ? "" : ' data-mxr-g="' + String(g) + '"') + "></div>" +
      "</article>";
  }
  function missingCard(r) {
    var bits = approvalLine(r);
    return '<article class="mxr-card" data-mxr-find="' + esc(findText(r)) + '">' +
      '<div class="mxr-name">' + esc(r.name || "") + "</div>" +
      line(bits, "mxr-app") +
      line(r.vendor_item ? "Vendor item " + r.vendor_item : "", "mxr-meta") +
      line(num(r.wip_g_per_lb) == null ? "" : fmtNum(r.wip_g_per_lb) + " g per lb of seed (" + fmtNum(r.wip_lbs_per_batch) + " lb per 100 lb batch)", "mxr-meta") +
      line(r.earlier ? "Earlier sample " + r.earlier : "", "mxr-meta") +
      '<div class="mxr-meta">Not a production recipe in Smackin OS.</div>' +
      "</article>";
  }
  function counts(rows) {
    var diff = 0;
    var filled = 0;
    rows.forEach(function (r) {
      if (ratesDiffer(r.seas_lbs, r.wip_lbs_per_batch)) diff++;
      if (r.seas_source) filled++;
    });
    return { diff: diff, filled: filled };
  }
  function intro(rows) {
    var c = counts(rows);
    return '<p class="hint mxr-intro">Approval data is from SMACKIN\' WIP Approved Recipes. Grams per lb of seed convert to lb per 100 lb batch as grams x 100 / 453.6. ' +
      c.filled + " blank seasoning amount" + (c.filled === 1 ? "" : "s") + " were filled from that sheet. Seasoning and malt amounts that already had a number are unchanged. " +
      "An amber badge means the sheet rate and the OS rate are more than 0.3 lb apart (" + c.diff + " flavor" + (c.diff === 1 ? "" : "s") + ").</p>";
  }
  function seedControl() {
    return '<label class="mxr-seed">Batch seed (lb) <input id="mxr-seed" type="number" min="0" step="1" value="' + esc(String(seedLb)) + '"></label>';
  }
  function grid(rows) {
    if (!rows.length) return '<p class="mxr-meta">No flavors match.</p>';
    return '<div class="mxr-grid">' + rows.map(function (r) { return cardHtml(r, seedLb); }).join("") + "</div>";
  }
  function missingBlock() {
    var rows = root.WIP_APPROVED_MISSING || [];
    if (!rows.length) return "";
    return '<details class="mxr-missing"><summary>Approved but not in OS (' + rows.length + ")</summary>" +
      '<p class="hint">These flavors are on Approved Recipes. They are not production recipes in Smackin OS yet.</p>' +
      '<div class="mxr-grid">' + rows.map(missingCard).join("") + "</div></details>";
  }
  function shell(mode, rows) {
    var shown = mode === "home" ? rows.filter(function (r) { return rank(r) < 2; }) : rows;
    var open = mode === "home"
      ? '<button type="button" class="ghost sm" id="mxr-open-recipes">Open all recipes</button>'
      : "";
    return '<div class="mxr-bar">' +
      '<h2 class="mxr-h">Mixing recipes</h2>' + open + "</div>" +
      intro(rows) +
      '<div class="mxr-tools">' + seedControl() +
      '<input id="mxr-q" class="mxr-q" type="search" placeholder="Search flavors" value="' + esc(query) + '"></div>' +
      '<div id="mxr-grid">' + grid(shown) + "</div>" +
      missingBlock();
  }
  function paintBatches(rootEl) {
    var seed = num(seedLb);
    if (seed == null) seed = 0;
    var nodes = rootEl.querySelectorAll("[data-mxr-batch]");
    for (var i = 0; i < nodes.length; i++) {
      var rate = nodes[i].getAttribute("data-mxr-batch");
      var g = nodes[i].getAttribute("data-mxr-g");
      var text = "Seasoning for " + fmtNum(seed) + " lb seed: ";
      if (rate == null || rate === "") text += "blank";
      else {
        text += fmtNum(Number(rate) * seed / 100) + " lb";
        if (g) text += " (" + fmtNum(Number(g) * seed) + " g at the sheet rate)";
      }
      nodes[i].textContent = text;
    }
  }
  function applyFilter(rootEl) {
    var q = query.trim().toLowerCase();
    var cards = rootEl.querySelectorAll("[data-mxr-find]");
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var hit = !q || cards[i].getAttribute("data-mxr-find").indexOf(q) >= 0;
      cards[i].style.display = hit ? "" : "none";
      if (hit) shown++;
    }
    var empty = rootEl.querySelector(".mxr-empty");
    if (!shown) {
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "mxr-empty mxr-meta";
        empty.textContent = "No flavors match.";
        var gridEl = rootEl.querySelector("#mxr-grid");
        if (gridEl) gridEl.appendChild(empty);
      }
    } else if (empty) empty.remove();
  }
  function bind(rootEl, rerender) {
    var seedInput = rootEl.querySelector("#mxr-seed");
    if (seedInput) {
      seedInput.addEventListener("input", function () {
        var n = num(seedInput.value);
        seedLb = n == null ? 0 : n;
        paintBatches(rootEl);
      });
    }
    var q = rootEl.querySelector("#mxr-q");
    if (q) q.addEventListener("input", function () { query = q.value || ""; applyFilter(rootEl); });
    var open = rootEl.querySelector("#mxr-open-recipes");
    if (open) open.addEventListener("click", function () {
      if (typeof root.UI_go === "function") root.UI_go("recipes");
    });
    paintBatches(rootEl);
    applyFilter(rootEl);
    if (rerender) rerender();
  }
  function injectStyle() {
    if (document.getElementById("mxr-style")) return;
    var style = document.createElement("style");
    style.id = "mxr-style";
    style.textContent = [
      ".mxr-h{margin:0;font-size:18px}",
      ".mxr-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
      ".mxr-intro{margin:6px 0 8px}",
      ".mxr-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}",
      ".mxr-seed{font-size:13px;font-weight:700}",
      ".mxr-seed input,.mxr-q{margin-left:6px;padding:6px 8px;border:1px solid rgba(128,128,128,.35);border-radius:8px;font:inherit}",
      ".mxr-q{min-width:180px;flex:1}",
      ".mxr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}",
      ".mxr-card{border:1px solid rgba(128,128,128,.22);border-radius:12px;padding:12px;background:rgba(128,128,128,.04)}",
      ".mxr-diff{border-color:#E39412;background:#fff6e4}",
      ".mxr-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}",
      ".mxr-name{font-weight:800;font-size:15px}",
      ".mxr-code{font-size:12px;opacity:.7}",
      ".mxr-badge{display:inline-block;background:#F6C453;color:#6a4100;font-weight:800;font-size:12px;line-height:1.3;padding:4px 8px;border-radius:999px;border:1px solid #E39412}",
      ".mxr-app{font-weight:700;margin-top:8px}",
      ".mxr-meta,.mxr-src,.mxr-malt,.mxr-batch{font-size:12px;margin-top:3px}",
      ".mxr-src{font-weight:700;color:#1F3864}",
      ".mxr-malt{color:#6a4100}",
      ".mxr-batch{font-weight:700;margin-top:8px}",
      ".mxr-missing{margin-top:12px}",
      ".mxr-missing summary{cursor:pointer;font-weight:800}"
    ].join("");
    document.head.appendChild(style);
  }
  function mount(view, mode) {
    var id = mode === "home" ? "mxr-home" : "mxr-root";
    if (view.querySelector("#" + id)) return;
    injectStyle();
    var rows = sorted(list());
    var el = document.createElement("div");
    el.id = id;
    el.className = "card" + (mode === "home" ? " dept-span4" : "");
    el.innerHTML = shell(mode, rows);
    if (mode === "home") {
      var home = view.querySelector('#dept-home[data-dept="mixing"]');
      var lead = home && home.querySelector(".dept-lead");
      if (lead && lead.nextSibling) home.insertBefore(el, lead.nextSibling);
      else if (home) home.appendChild(el);
      else return;
    } else {
      view.insertBefore(el, view.firstChild);
    }
    bind(el);
  }
  function onView() {
    var view = document.getElementById("view");
    if (!view) return;
    var home = view.querySelector('#dept-home[data-dept="mixing"]');
    if (home) {
      if (!home.querySelector("#mxr-home")) mount(view, "home");
      return;
    }
    if ((view.textContent || "").indexOf("Per-Flavor Recipes") >= 0) {
      if (!view.querySelector("#mxr-root")) mount(view, "recipes");
    }
  }
  function start() {
    var view = document.getElementById("view");
    if (!view || view.__mxrObs) return;
    view.__mxrObs = true;
    var obs = new MutationObserver(function () { onView(); });
    obs.observe(view, { childList: true });
    onView();
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }

  root.MXR = {
    DIFF_LB: DIFF_LB,
    ratesDiffer: ratesDiffer,
    approvalLine: approvalLine,
    badgeText: badgeText,
    maltNote: maltNote,
    cardHtml: cardHtml,
    fmtNum: fmtNum
  };
})(typeof window !== "undefined" ? window : globalThis);

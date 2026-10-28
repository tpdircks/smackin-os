/* slc-count-panel.js
   Inventory home: newest Inventory SLC 2026 block beside OS on-hand.
   Review, then apply. Writes only through DB.adjustTotal, and only when
   that write lands on RECEIVING. Racks are never changed.
   Each write is checked with a fresh Supabase stock read (cache: no-store).
   The sheet stays the source until a row is applied and that read matches.
   Weekly Drive pull is a later step. This file only shows the committed block.
*/
(function () {
  "use strict";
  if (window.__slcCountInit) return;
  window.__slcCountInit = true;

  var APPLY_NOTE = "slc-panel-1027";
  var HOLD_QTY = 100000;
  var LARGE_UNITS = 2000;
  var LARGE_PCT = 0.25;
  var MULTI = { "B4-S02": 1, "B4-S04": 1, "BAG4-S02": 1, "BAG4-S04": 1 };
  var BAG_CAT = { bag4: 1, bag15: 1, bag275: 1, dollartree275: 1 };
  var ZONE = { RECEIVING: 1, RETURNS: 1, QUARANTINE: 1, STAGING: 1, "PROD-WEIGH": 1, CAGE: 1, "QA-HOLD": 1 };

  var selected = {};
  var results = {};
  var filterText = "";
  var applying = false;
  var dbBound = false;
  var dbTries = 0;

  function feed() { return window.SLC_COUNT || null; }
  function rows() { return (feed() && feed().rows) || []; }
  function blockKey() {
    var d = feed() && feed().date ? feed().date : "2026-10-27";
    return "slc-panel-" + d;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmt(n) {
    if (n == null || n !== n) return "";
    return Number(n).toLocaleString();
  }
  function appliedMap() {
    try {
      var raw = localStorage.getItem(blockKey());
      var o = raw ? JSON.parse(raw) : null;
      return (o && o.codes) || {};
    } catch (e) { return {}; }
  }
  function markApplied(code) {
    var codes = appliedMap();
    codes[code] = new Date().toISOString();
    try { localStorage.setItem(blockKey(), JSON.stringify({ codes: codes })); } catch (e) {}
  }
  function findItem(code) {
    if (!code || !window.DB || !DB.itemByCode) return null;
    var it = DB.itemByCode(code);
    if (it) return it;
    if (code.indexOf("B4-") === 0) it = DB.itemByCode("BAG4-" + code.slice(3));
    if (!it && code.indexOf("B15-") === 0) it = DB.itemByCode("BAG15-" + code.slice(4));
    return it || null;
  }
  function stockRows(it) {
    if (!it || !window.DB || !DB.stock) return [];
    var id = it.id, code = it.code;
    return (DB.stock() || []).filter(function (r) {
      return r && (r.item_id === id || r.item_id === code);
    });
  }
  function osQty(it) {
    if (!it || !window.DB || !DB.onHand) return null;
    var n = Number(DB.onHand(it.code || it.id));
    return n === n ? n : null;
  }
  function writeLocation(list) {
    var pos = (list || []).filter(function (r) { return Number(r.qty) > 0; });
    if (!pos.length) return "RECEIVING";
    pos.sort(function (a, b) { return Number(b.qty) - Number(a.qty); });
    return String(pos[0].location || "");
  }
  function isRack(loc) {
    var s = String(loc || "").trim().toUpperCase();
    if (!s || ZONE[s] || s.indexOf("DOCK-") === 0) return false;
    return true;
  }
  function isBag(it) {
    if (!it) return false;
    var cat = String(it.category || "").toLowerCase();
    if (BAG_CAT[cat]) return true;
    var code = String(it.code || "");
    return /^(B4-|BAG4-|B15-|BAG15-|DT275-|TMP-B4-|TMP-B15-)/.test(code);
  }
  function isSeedRaw(it) {
    if (!it) return false;
    var cat = String(it.category || "").toLowerCase();
    if (cat === "seed" || cat === "seasoning" || cat === "film4" || cat === "film15" || cat === "raw") return true;
    return /^(SEED|SEAS|OIL|MALTO|F4-|F15-|FILM|RAW)/.test(String(it.code || it.id || ""));
  }
  function lotList(list) {
    var out = [];
    (list || []).forEach(function (r) { if (r.lot) out.push(String(r.lot)); });
    return out;
  }
  function rowKey(row) {
    if (row.code) return row.code;
    return "unmapped:" + (row.sheet || "") + ":" + (row.sheetRows || []).join("-");
  }
  function sizeOf(row) {
    var sheet = row.sheet || "";
    if (sheet.indexOf("2.75") >= 0) return "2.75 oz";
    if (sheet.indexOf("1.5") >= 0) return "1.5 oz";
    if (sheet.indexOf("4 oz") >= 0) return "4 oz";
    if ((row.flags || []).indexOf("packaging") >= 0) return "Packaging";
    return "";
  }
  function isLarge(sheetQty, os) {
    if (os == null || os !== os) return false;
    var diff = Math.abs(sheetQty - os);
    if (diff === 0) return false;
    if (diff > LARGE_UNITS) return true;
    if (os === 0) return true;
    return Math.abs((sheetQty - os) / os) > LARGE_PCT;
  }
  function cloudOn() { return !!(window.DB && DB.mode === "cloud"); }

  function classify(row) {
    var key = rowKey(row);
    var sheetQty = Number(row.sheetQty);
    var flags = row.flags || [];
    var it = findItem(row.code);
    var stock = it ? stockRows(it) : [];
    var loc = it ? writeLocation(stock) : (row.code ? null : null);
    var lots = lotList(stock);
    var os = it ? osQty(it) : null;
    var reasons = [];
    var itemsReady = !!(window.DB && DB.items && DB.items().length);

    if (!row.code || flags.indexOf("unmapped") >= 0) reasons.push("No OS code. Listed, not guessed.");
    if (flags.indexOf("hold-100k") >= 0 || sheetQty > HOLD_QTY) {
      reasons.push("HOLD. Likely a 10x typo. Ask Adriana (inventory@smackinsnacks.com).");
    }
    if (flags.indexOf("multi-lot") >= 0 || MULTI[row.code]) reasons.push("Multi-lot bag (B4-S02 / B4-S04). Not applied.");
    if (flags.indexOf("packaging") >= 0) reasons.push("Packaging. This panel applies finished bags only.");
    if (it && isSeedRaw(it)) reasons.push("Seed or raw. Not applied.");
    if (it && lots.length) reasons.push("Lot-tracked (" + lots.join(", ") + "). Not applied.");
    if (it && !isBag(it) && flags.indexOf("packaging") < 0 && flags.indexOf("unmapped") < 0) {
      reasons.push("Not a finished bag. Not applied.");
    }
    if (row.code && !it && itemsReady) reasons.push("Not in OS.");
    if (it && loc && loc !== "RECEIVING") {
      if (isRack(loc)) reasons.push("On rack " + loc + ". Racks are not changed.");
      else reasons.push("On-hand is at " + loc + ", not RECEIVING. Not applied.");
    }
    if (row.code && appliedMap()[row.code]) reasons.push("Already applied for this count date.");

    var variance = (os == null) ? null : sheetQty - os;
    var large = variance != null && isLarge(sheetQty, os);
    var blocked = reasons.length > 0;
    var canApply = !blocked && !!it && loc === "RECEIVING" && variance !== 0 && sheetQty === sheetQty && sheetQty <= HOLD_QTY;

    var result = results[key];
    var status;
    if (result) status = result.ok ? ("Verified " + fmt(result.qty)) : ("Failed. " + result.msg);
    else if (variance === 0) status = reasons.length ? ("Match. " + reasons[0]) : "Match";
    else if (!itemsReady && row.code) status = "Waiting for OS";
    else if (reasons.length) status = reasons[0];
    else if (large) status = "Large variance. Tick this row on its own.";
    else status = "Review";

    var kind = "review";
    if (result) kind = result.ok ? "ok" : "bad";
    else if (variance === 0) kind = "ok";
    else if (status.indexOf("HOLD") === 0) kind = "hold";
    else if (blocked) kind = "flag";
    else if (large) kind = "large";

    return {
      key: key, it: it, os: os, loc: loc, variance: variance, large: large,
      status: status, reasons: reasons, canApply: canApply, kind: kind, sheetQty: sheetQty
    };
  }

  function pctText(info) {
    if (info.os == null || info.variance == null) return "";
    if (info.os === 0) return info.variance === 0 ? "0%" : "n/a";
    var p = (info.variance / info.os) * 100;
    var rounded = Math.round(p * 10) / 10;
    return (rounded > 0 ? "+" : "") + rounded + "%";
  }
  function varText(info) {
    if (info.variance == null) return "";
    if (info.variance > 0) return "+" + fmt(info.variance);
    return fmt(info.variance);
  }

  function visibleRows() {
    var q = filterText.trim().toLowerCase();
    return rows().filter(function (row) {
      if (!q) return true;
      var blob = ((row.code || "") + " " + (row.desc || "") + " " + (row.sheet || "")).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }

  function bulkKeys() {
    var keys = [];
    visibleRows().forEach(function (row) {
      var info = classify(row);
      if (info.canApply && !info.large) keys.push(info.key);
    });
    return keys;
  }

  function selectedApplyable() {
    var out = [];
    rows().forEach(function (row) {
      var info = classify(row);
      if (selected[info.key] && info.canApply) out.push({ row: row, info: info });
    });
    return out;
  }

  function css() {
    if (document.getElementById("slc-count-css")) return;
    var s = document.createElement("style");
    s.id = "slc-count-css";
    s.textContent =
      "#slc-count-panel{grid-column:1 / -1;margin:0 0 8px;padding:12px 14px;background:#fff;border:1px solid #dbe3ec;border-radius:12px}" +
      "#slc-count-panel h2{margin:0;font:800 18px/1.2 system-ui;color:#04223B}" +
      "#slc-count-panel .slc-sub{margin:4px 0 0;font:13px/1.4 system-ui;color:#3d4c5e;max-width:920px}" +
      "#slc-count-panel .slc-kpis{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}" +
      "#slc-count-panel .slc-kpi{background:#f4f7fa;border:1px solid #dbe3ec;border-radius:10px;padding:6px 10px;min-width:72px}" +
      "#slc-count-panel .slc-kpi b{display:block;font:800 16px system-ui;color:#04223B}" +
      "#slc-count-panel .slc-kpi span{font:11px system-ui;color:#3d4c5e}" +
      "#slc-count-panel .slc-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px}" +
      "#slc-count-q{flex:1;min-width:180px;padding:8px 10px;border:2px solid #cfdae6;border-radius:8px;font:600 14px system-ui;color:#04223B}" +
      "#slc-count-panel button{font:700 13px system-ui;border-radius:8px;border:1px solid #04223B;background:#04223B;color:#fff;padding:8px 12px;cursor:pointer}" +
      "#slc-count-panel button.slc-ghost{background:#fff;color:#04223B}" +
      "#slc-count-panel button:disabled{opacity:.45;cursor:not-allowed}" +
      "#slc-count-panel .slc-note{font:12px system-ui;color:#3d4c5e}" +
      "#slc-count-panel .slc-cloud{font:700 12px system-ui;color:#9a5b00}" +
      ".slc-scroll{overflow:auto;max-height:560px;border:1px solid #dbe3ec;border-radius:8px}" +
      ".slc-tbl{width:100%;border-collapse:collapse;font:13px system-ui;background:#fff}" +
      ".slc-tbl th{position:sticky;top:0;background:#eef3f8;text-align:left;padding:8px;font:700 11px system-ui;color:#04223B;border-bottom:1px solid #dbe3ec;white-space:nowrap}" +
      ".slc-tbl td{padding:7px 8px;border-bottom:1px solid #eef2f6;vertical-align:top;color:#243642}" +
      ".slc-tbl td.n,.slc-tbl th.n{text-align:right;font-variant-numeric:tabular-nums}" +
      ".slc-tbl tr.slc-gap td{background:#f7fafc;font:700 12px system-ui;color:#04223B}" +
      ".slc-code{font:700 12px ui-monospace,monospace;color:#04223B}" +
      ".slc-meta{display:block;font:11px system-ui;color:#3d4c5e}" +
      ".slc-pill{display:inline-block;border-radius:999px;padding:2px 8px;font:700 11px system-ui;background:#eef3f8;color:#04223B}" +
      ".slc-pill.ok{background:#e5f6ea;color:#0d6b32}" +
      ".slc-pill.flag{background:#fff4e5;color:#9a5b00}" +
      ".slc-pill.hold{background:#fde8e8;color:#B52024}" +
      ".slc-pill.large{background:#fff4e5;color:#9a5b00}" +
      ".slc-pill.bad{background:#fde8e8;color:#B52024}" +
      ".slc-pill.review{background:#e7f2fb;color:#006DB6}" +
      ".slc-pos{color:#006DB6;font-weight:700}.slc-neg{color:#B52024;font-weight:700}";
    document.head.appendChild(s);
  }

  function shell() {
    var home = document.querySelector("#view #dept-home[data-dept='inv']");
    if (!home) return null;
    var el = home.querySelector("#slc-count-panel");
    if (el) return el;
    css();
    el = document.createElement("section");
    el.id = "slc-count-panel";
    el.innerHTML =
      '<h2>SLC Count vs OS</h2>' +
      '<p class="slc-sub" id="slc-count-sub"></p>' +
      '<div class="slc-kpis" id="slc-count-kpis"></div>' +
      '<div class="slc-tools">' +
      '<input id="slc-count-q" type="search" placeholder="Filter code or flavor" autocomplete="off" aria-label="Filter count rows">' +
      '<button type="button" class="slc-ghost" id="slc-count-all">Select safe rows</button>' +
      '<button type="button" class="slc-ghost" id="slc-count-clear">Clear</button>' +
      '<button type="button" id="slc-count-apply">Apply selected</button>' +
      '</div>' +
      '<p class="slc-note" id="slc-count-cloud"></p>' +
      '<div id="slc-count-body"></div>';
    var lead = home.querySelector(".dept-lead");
    if (lead && lead.nextSibling) home.insertBefore(el, lead.nextSibling);
    else home.insertBefore(el, home.firstChild);
    wire(el);
    return el;
  }

  function wire(el) {
    var q = el.querySelector("#slc-count-q");
    q.value = filterText;
    q.addEventListener("input", function () {
      filterText = q.value;
      paint();
      var again = document.getElementById("slc-count-q");
      if (again) { again.focus(); try { again.setSelectionRange(filterText.length, filterText.length); } catch (e) {} }
    });
    el.querySelector("#slc-count-all").addEventListener("click", function () {
      var keys = bulkKeys();
      var allOn = keys.length > 0 && keys.every(function (k) { return selected[k]; });
      keys.forEach(function (k) { if (allOn) delete selected[k]; else selected[k] = 1; });
      paint();
    });
    el.querySelector("#slc-count-clear").addEventListener("click", function () {
      selected = {};
      paint();
    });
    el.querySelector("#slc-count-apply").addEventListener("click", function () { applySelected(); });
    el.addEventListener("change", function (e) {
      var box = e.target;
      if (!box || !box.getAttribute || !box.getAttribute("data-slc")) return;
      var key = box.getAttribute("data-slc");
      if (box.checked) selected[key] = 1;
      else delete selected[key];
      paint();
    });
  }

  function paint() {
    var el = document.getElementById("slc-count-panel");
    if (!el || !el.isConnected) return;
    var data = feed();
    var sub = el.querySelector("#slc-count-sub");
    if (sub) {
      if (!data) {
        sub.textContent = "Count file is missing. Nothing to compare.";
      } else {
        sub.textContent = "Sheet " + (data.sheet || "Inventory SLC 2026") + ", count date " + data.date +
          ". Limited 1.5 oz on this file is dated 2026-10-26. The sheet stays the source until you apply a bag row. " +
          "Apply uses DB.adjustTotal and only when that write lands on RECEIVING. A fresh stock read has to match before a row counts as applied. " +
          "Clear the ticks before leaving this screen.";
      }
    }
    var list = data ? visibleRows() : [];
    var differ = 0, held = 0, flagged = 0, ready = 0;
    list.forEach(function (row) {
      var info = classify(row);
      if (info.variance != null && info.variance !== 0) differ++;
      if (info.kind === "hold") held++;
      else if (info.kind === "flag") flagged++;
      if (info.canApply) ready++;
    });
    var kpis = el.querySelector("#slc-count-kpis");
    if (kpis) {
      kpis.innerHTML =
        kpi(list.length, "rows") + kpi(differ, "differ") + kpi(ready, "can apply") +
        kpi(held, "hold") + kpi(flagged, "flagged");
    }
    var cloud = el.querySelector("#slc-count-cloud");
    if (cloud) {
      cloud.className = cloudOn() ? "slc-note" : "slc-cloud";
      cloud.textContent = cloudOn()
        ? "Cloud is on. Checked bag rows write one at a time. Large variances are not included in Select safe rows."
        : "Apply stays off until this browser is on the shared cloud database. You can still review the sheet against whatever on-hand is loaded.";
    }
    var picked = selectedApplyable().length;
    var btn = el.querySelector("#slc-count-apply");
    if (btn) {
      btn.disabled = applying || !cloudOn() || picked === 0;
      btn.textContent = applying ? "Applying..." : ("Apply selected" + (picked ? " (" + picked + ")" : ""));
    }
    var body = el.querySelector("#slc-count-body");
    if (!body) return;
    if (!data) { body.innerHTML = ""; return; }
    body.innerHTML = tableHtml(list);
  }

  function kpi(n, label) {
    return '<div class="slc-kpi"><b>' + esc(fmt(n)) + '</b><span>' + esc(label) + '</span></div>';
  }

  function tableHtml(list) {
    var html = '<div class="slc-scroll"><table class="slc-tbl"><thead><tr>' +
      '<th></th><th>Code</th><th>Description</th><th class="n">Sheet</th><th class="n">OS</th>' +
      '<th class="n">Variance</th><th class="n">%</th><th>Status</th></tr></thead><tbody>';
    var lastSheet = "";
    list.forEach(function (row) {
      if (row.sheet !== lastSheet) {
        lastSheet = row.sheet;
        var when = row.sheetDate && row.sheetDate !== (feed() && feed().date) ? " (" + row.sheetDate + ")" : "";
        html += '<tr class="slc-gap"><td colspan="8">' + esc(row.sheet || "Sheet") + esc(when) + '</td></tr>';
      }
      html += rowHtml(row);
    });
    html += '</tbody></table></div>';
    return html;
  }

  function rowHtml(row) {
    var info = classify(row);
    var check = "";
    if (info.canApply && !(results[info.key] && results[info.key].ok)) {
      check = '<input type="checkbox" data-slc="' + esc(info.key) + '"' + (selected[info.key] ? " checked" : "") +
        (info.large ? ' aria-label="Large variance, tick alone"' : ' aria-label="Include in apply"') + '>';
    }
    var vcls = info.variance > 0 ? "slc-pos" : (info.variance < 0 ? "slc-neg" : "");
    var meta = sizeOf(row);
    if (row.sheetRows && row.sheetRows.length) meta += (meta ? " · " : "") + "rows " + row.sheetRows.join(", ");
    if ((row.flags || []).indexOf("summed") >= 0) meta += (meta ? " · " : "") + "summed lines";
    return '<tr>' +
      '<td>' + check + '</td>' +
      '<td class="slc-code">' + esc(row.code || "(unmapped)") + '</td>' +
      '<td>' + esc(row.desc || "") + (meta ? '<span class="slc-meta">' + esc(meta) + '</span>' : '') + '</td>' +
      '<td class="n">' + esc(fmt(info.sheetQty)) + '</td>' +
      '<td class="n">' + (info.os == null ? "" : esc(fmt(info.os))) + '</td>' +
      '<td class="n ' + vcls + '">' + esc(varText(info)) + '</td>' +
      '<td class="n">' + esc(pctText(info)) + '</td>' +
      '<td><span class="slc-pill ' + esc(info.kind) + '">' + esc(info.status) + '</span></td>' +
      '</tr>';
  }

  function readStock(it) {
    var cfg = window.SMACKIN_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return Promise.reject(new Error("Supabase is not configured"));
    var ids = [];
    if (it.id) ids.push(String(it.id));
    if (it.code && String(it.code) !== String(it.id)) ids.push(String(it.code));
    var filter = ids.length === 1
      ? ("item_id=eq." + encodeURIComponent(ids[0]))
      : ("or=(" + ids.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")");
    var url = String(cfg.SUPABASE_URL).replace(/\/$/, "") + "/rest/v1/stock?" + filter + "&select=item_id,location,lot,qty";
    return fetch(url, {
      cache: "no-store",
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error("stock read failed (" + r.status + ")");
      return r.json();
    });
  }

  function sumQty(list) {
    return (list || []).reduce(function (s, r) { return s + (Number(r.qty) || 0); }, 0);
  }

  async function applySelected() {
    if (applying) return;
    if (!cloudOn()) return;
    var picked = selectedApplyable();
    if (!picked.length) return;
    var lines = picked.map(function (p) {
      return p.row.code + "  OS " + fmt(p.info.os) + "  sheet " + fmt(p.row.sheetQty);
    });
    var ok = window.confirm(
      "Apply " + picked.length + " bag count(s) with DB.adjustTotal?\n\n" +
      lines.join("\n") +
      "\n\nThe write lands on RECEIVING only. Each row is checked with a fresh stock read. Cancel leaves the database unchanged."
    );
    if (!ok) return;
    applying = true;
    paint();
    for (var i = 0; i < picked.length; i++) {
      var row = picked[i].row;
      var key = picked[i].info.key;
      var again = classify(row);
      if (!again.canApply || !again.it) {
        results[key] = { ok: false, msg: again.status || "Blocked before write." };
        delete selected[key];
        continue;
      }
      try {
        await DB.adjustTotal(again.it, Number(row.sheetQty), APPLY_NOTE);
      } catch (e) {
        results[key] = { ok: false, msg: (e && e.message) ? e.message : "adjustTotal failed" };
        delete selected[key];
        continue;
      }
      try {
        var fresh = await readStock(again.it);
        var total = sumQty(fresh);
        if (Number(total) === Number(row.sheetQty)) {
          results[key] = { ok: true, qty: total };
          markApplied(row.code);
        } else {
          results[key] = { ok: false, msg: "Stock read is " + fmt(total) + ", sheet is " + fmt(row.sheetQty) + "." };
        }
      } catch (err) {
        results[key] = { ok: false, msg: (err && err.message) ? err.message : "Could not re-read stock." };
      }
      delete selected[key];
    }
    applying = false;
    paint();
  }

  function mount() {
    var home = document.querySelector("#view #dept-home[data-dept='inv']");
    if (!home) return;
    if (home.querySelector("#slc-count-panel")) return;
    shell();
    paint();
  }

  var scheduled = false;
  function scheduleMount() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; mount(); }, 0);
  }

  function watch() {
    var view = document.getElementById("view");
    var nav = document.getElementById("nav");
    var obs = new MutationObserver(function () { scheduleMount(); });
    if (view) obs.observe(view, { childList: true, subtree: true });
    if (nav) obs.observe(nav, { childList: true, subtree: true });
    scheduleMount();
  }

  function bindDb() {
    if (window.DB && typeof DB.onChange === "function") {
      if (!dbBound) {
        dbBound = true;
        DB.onChange(function () { if (!applying) paint(); });
      }
      return;
    }
    if (++dbTries < 240) setTimeout(bindDb, 500);
  }

  window.SMK_BUSY = window.SMK_BUSY || [];
  window.SMK_BUSY.push(function () {
    if (applying) return true;
    var root = document.getElementById("slc-count-panel");
    if (!root) return false;
    var ae = document.activeElement;
    if (ae && root.contains(ae) && ae.tagName === "INPUT") {
      var t = String(ae.type || "").toLowerCase();
      if (t !== "checkbox" && t !== "button") return true;
    }
    for (var k in selected) { if (selected[k]) return true; }
    return false;
  });

  window.SLCCount = {
    classify: classify,
    refresh: function () { mount(); paint(); },
    feed: feed
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { watch(); bindDb(); });
  else { watch(); bindDb(); }
})();

/* ============================================================================
   Smackin' OS - 60-Day Need / Weeks of Supply (demand-wos.js)
   Standalone. Does not edit app.js.
   Mounts on Forecast vs Target, under the page header.

   On hand: DB.onHand for the finished bag item (bag4 / bag15).
   60-day forecast: 8 x the live demand_forecast weekly snapshot
   (the same weekly bags Forecast vs Target already shows).
   An imported weekly series, saved in kv_status, replaces that
   snapshot for the SKUs it lists.

   Freshness guard (2026-11-03): a forecast only drives WOS when it is
   current. Snapshot: its source_month must end within STALE_DAYS of
   today. Imported series: its last week must reach today (no repeating
   an old last week forever). When nothing is current, WOS, gap, pacing
   need and suggested production are hidden, and the card shows live on
   hand against open SPS orders instead, labeled as operational and not
   a forecast. Built-in samples were removed so they can never read as
   live numbers.

   Calculator math (WIP Calculator tab):
     gap = fcst60 - on hand
     pacing need = fcst60 x pacing
     suggested = pacing need - on hand
     WOS = on hand / (fcst60 / 8)
   Pacing default 0.5, stored at kv key wos:pacing.
   ========================================================================== */
(function (root) {
  "use strict";

  var PACING_KEY = "wos:pacing";
  var SERIES_KEY = "wos:weeks";
  var DEFAULT_PACING = 0.5;
  var WEEKS_IN_60 = 8;
  var FLAVORS = ["OG Original", "Cinnamon Churro", "Backyard BBQ", "Garlic Parmesan", "Dill Pickle", "Cracked Pepper", "Cheddar Jalapeno", "Ranch", "Maple Brown Sugar", "Lemon Pepper", "Sour Cream & Onion", "Cheeseburger", "PCA Pizza", "Variety Pack"];

  var STALE_DAYS = 45;

  function norm(s) {
    return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function canonicalFlavor(s) {
    var n = norm(s);
    for (var i = 0; i < FLAVORS.length; i++) if (norm(FLAVORS[i]) === n) return FLAVORS[i];
    var raw = String(s || "").trim();
    if (!raw) return "";
    return raw.replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }
  function normSize(s) {
    var t = String(s || "").toLowerCase().replace(/\s+/g, "");
    if (t === "4" || t === "4oz") return "4oz";
    if (t === "1.5" || t === "1.5oz") return "1.5oz";
    return "";
  }
  function sizeLabel(size) { return size === "4oz" ? "4OZ" : "1.5OZ"; }
  function skuKey(flavor, size) { return String(flavor || "").toUpperCase() + "-" + sizeLabel(size); }
  function flavorRank(flavor) {
    var i = FLAVORS.indexOf(flavor);
    return i < 0 ? 100 : i;
  }
  function round0(n) {
    n = Number(n);
    if (!isFinite(n)) return 0;
    return Math.round(n);
  }
  function clampPacing(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    if (!isFinite(n) || n < 0) return DEFAULT_PACING;
    if (n > 3) n = 3;
    return Math.round(n * 1000) / 1000;
  }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "").trim());
    if (!m) return null;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(ms) ? null : ms;
  }
  function toDay(v) {
    if (v == null) {
      var n = new Date();
      return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 86400000;
    }
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string") {
      var p = parseISO(v);
      return p == null ? toDay(null) : p / 86400000;
    }
    if (v instanceof Date && !isNaN(v.getTime())) return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()) / 86400000;
    return toDay(null);
  }
  function weekValue(weeks, index) {
    if (!weeks || !weeks.length) return 0;
    if (index < 0) index = 0;
    if (index >= weeks.length) return Number(weeks[weeks.length - 1]) || 0;
    return Number(weeks[index]) || 0;
  }
  // Sum of daily demand over `days`, weekly rate held flat inside each week.
  function sumNextDays(anchorISO, weeks, today, days) {
    var a = parseISO(anchorISO);
    if (a == null || !weeks || !weeks.length) return 0;
    var start = toDay(today);
    var aDay = a / 86400000;
    var total = 0;
    var n = days == null ? 60 : days;
    for (var i = 0; i < n; i++) {
      var idx = Math.floor((start + i - aDay) / 7);
      if (idx < 0) idx = 0;
      total += weekValue(weeks, idx) / 7;
    }
    return total;
  }
  function wosBand(wos) {
    if (wos == null || !isFinite(wos)) return "na";
    if (wos < 2) return "red";
    if (wos <= 4) return "amber";
    return "green";
  }
  // End of a YYYY-MM month as a day number, or null.
  function monthEndDay(ym) {
    var m = /^(\d{4})-(\d{2})/.exec(String(ym || "").trim());
    if (!m) return null;
    return Date.UTC(+m[1], +m[2], 1) / 86400000 - 1;
  }
  function snapshotFresh(sourceMonth, today) {
    var end = monthEndDay(sourceMonth);
    if (end == null) return false;
    return toDay(today) - end <= STALE_DAYS;
  }
  function seriesFresh(s, today) {
    var a = parseISO(s && s.anchor);
    if (a == null || !s.weeks || !s.weeks.length) return false;
    var endDay = a / 86400000 + s.weeks.length * 7;
    return endDay > toDay(today);
  }
  function indexForecast(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var flavor = canonicalFlavor(r.flavor);
      var size = normSize(r.size);
      if (!flavor || !size) return;
      var k = flavor + "|" + size;
      if (!map[k]) map[k] = { flavor: flavor, size: size, weekly: 0, source_month: "" };
      map[k].weekly += Number(r.forecast_bags) || 0;
      if (r.source_month) map[k].source_month = String(r.source_month);
    });
    return map;
  }
  function indexSeries(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      if (!r) return;
      var flavor = canonicalFlavor(r.flavor);
      var size = normSize(r.size);
      if ((!flavor || !size) && r.sku) {
        var parsed = parseSku(r.sku);
        if (parsed) { flavor = parsed.flavor; size = parsed.size; }
      }
      var weeks = (r.weeks || []).map(function (n) { return Number(n) || 0; }).filter(function (n, i, arr) {
        return isFinite(n);
      });
      if (!flavor || !size || !weeks.length) return;
      map[flavor + "|" + size] = { flavor: flavor, size: size, anchor: r.anchor || "2026-01-01", weeks: weeks };
    });
    return map;
  }
  function parseSku(raw) {
    var s = String(raw || "").trim().replace(/\s+/g, " ");
    var m = /^(.*?)[\s\-]+(1\.5|4)\s*oz$/i.exec(s);
    if (!m) return null;
    var flavor = canonicalFlavor(m[1]);
    var size = m[2] === "4" ? "4oz" : "1.5oz";
    if (!flavor) return null;
    return { flavor: flavor, size: size, sku: skuKey(flavor, size) };
  }
  function liveOnHand(items, onHandFn, flavor, size) {
    var cat = size === "4oz" ? "bag4" : "bag15";
    var nf = norm(flavor);
    var hits = (items || []).filter(function (it) { return it && it.category === cat && norm(it.flavor) === nf; });
    if (!hits.length || typeof onHandFn !== "function") return null;
    var qty = 0;
    hits.forEach(function (it) {
      var v = 0;
      try { v = Number(onHandFn(it.id || it.code)); } catch (e) { v = 0; }
      if (!isFinite(v)) v = 0;
      qty += v;
    });
    return qty;
  }
  function build(ctx) {
    ctx = ctx || {};
    var pacing = clampPacing(ctx.pacing);
    var fc = indexForecast(ctx.forecast);
    var series = indexSeries(ctx.series);
    var month = "";
    Object.keys(fc).forEach(function (k) { if (!month && fc[k].source_month) month = fc[k].source_month; });
    var snapOk = snapshotFresh(month, ctx.today);
    var staleSeries = 0;
    var keys = {};
    Object.keys(fc).forEach(function (k) { keys[k] = 1; });
    Object.keys(series).forEach(function (k) { keys[k] = 1; });
    var rows = Object.keys(keys).map(function (k) {
      var base = fc[k] || series[k];
      var flavor = base.flavor;
      var size = base.size;
      var sku = skuKey(flavor, size);
      var fcstRaw = 0;
      var fcstSource = "none";
      var sourceMonth = fc[k] ? (fc[k].source_month || "") : "";
      var weekly = 0;
      var fresh = false;
      if (series[k] && seriesFresh(series[k], ctx.today)) {
        fcstRaw = sumNextDays(series[k].anchor, series[k].weeks, ctx.today, 60);
        fcstSource = "series";
        weekly = weekValue(series[k].weeks, 0);
        fresh = true;
      } else if (fc[k]) {
        if (series[k]) staleSeries++;
        weekly = fc[k].weekly;
        fcstRaw = weekly * WEEKS_IN_60;
        fcstSource = "snapshot";
        fresh = snapshotFresh(sourceMonth, ctx.today);
      } else if (series[k]) {
        staleSeries++;
        fcstSource = "series";
      }
      var live = liveOnHand(ctx.items, ctx.onHand, flavor, size);
      var onHandSource = live != null ? "live" : "none";
      var oh = round0(live != null ? live : 0);
      var fcst = fresh ? round0(fcstRaw) : null;
      var paced = fresh ? round0(fcst * pacing) : null;
      var wos = fresh && fcst > 0 ? oh / (fcst / WEEKS_IN_60) : null;
      return {
        sku: sku, flavor: flavor, size: size,
        onHand: oh, onHandSource: onHandSource,
        fcst: fcst, fcstSource: fcstSource, sourceMonth: sourceMonth, weekly: weekly, fresh: fresh,
        gap: fresh ? fcst - oh : null, paced: paced, suggested: fresh ? paced - oh : null, wos: wos, band: wosBand(wos)
      };
    });
    rows.sort(function (a, b) {
      var d = flavorRank(a.flavor) - flavorRank(b.flavor);
      if (d) return d;
      if (a.size !== b.size) return a.size === "1.5oz" ? -1 : 1;
      return a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0;
    });
    var freshRows = rows.filter(function (r) { return r.fresh; }).length;
    return { pacing: pacing, rows: rows, sourceMonth: month, snapshotFresh: snapOk, staleSeries: staleSeries, freshRows: freshRows, current: freshRows > 0 };
  }
  // Operational view used when no forecast is current: live on hand vs open SPS order bags, by flavor.
  // SPS lines carry flavor but not size, so open bags are shown at flavor level.
  function buildCoverage(ctx) {
    ctx = ctx || {};
    var map = {};
    function row(flavor) {
      var k = norm(flavor);
      if (!map[k]) map[k] = { flavor: flavor, oh4: null, oh15: null, open: 0, lines: 0, due: "" };
      return map[k];
    }
    (ctx.demand || []).forEach(function (d) {
      if (!d || String(d.status || "Open") !== "Open") return;
      var f = canonicalFlavor(d.flavor);
      if (!f || /^unmapped/i.test(f)) return;
      var r = row(f);
      r.open += Number(d.bags) || 0;
      r.lines++;
      var due = dueISO(d.due_date);
      if (due && (!r.due || due < r.due)) r.due = due;
    });
    var seen = {};
    (ctx.items || []).forEach(function (it) {
      if (!it || (it.category !== "bag4" && it.category !== "bag15") || !it.flavor) return;
      var f = canonicalFlavor(it.flavor);
      var size = it.category === "bag4" ? "4oz" : "1.5oz";
      if (seen[f + "|" + size]) return;
      seen[f + "|" + size] = 1;
      var v = liveOnHand(ctx.items, ctx.onHand, f, size);
      var r = row(f);
      if (size === "4oz") r.oh4 = round0(v || 0); else r.oh15 = round0(v || 0);
    });
    var rows = Object.keys(map).map(function (k) {
      var r = map[k];
      r.after4 = r.oh4 == null ? null : r.oh4 - r.open;
      return r;
    }).filter(function (r) { return r.open > 0 || (r.oh4 || 0) > 0 || (r.oh15 || 0) > 0; });
    rows.sort(function (a, b) {
      if (b.open !== a.open) return b.open - a.open;
      var d = flavorRank(a.flavor) - flavorRank(b.flavor);
      if (d) return d;
      return a.flavor < b.flavor ? -1 : 1;
    });
    return rows;
  }
  // SPS due dates arrive as MM/DD/YYYY or YYYY-MM-DD. Returns YYYY-MM-DD or "".
  function dueISO(v) {
    var s = String(v || "").trim();
    if (!s) return "";
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    return m ? m[1] : "";
  }

  function splitCsv(line) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; continue; }
          q = false; continue;
        }
        cur += c; continue;
      }
      if (c === '"') { q = true; continue; }
      if (c === ",") { out.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  }
  function numList(cells) {
    var weeks = [];
    cells.forEach(function (c) {
      if (c == null || String(c).trim() === "") return;
      var n = Number(String(c).replace(/,/g, ""));
      if (isFinite(n)) weeks.push(n);
    });
    return weeks;
  }
  function rowFromParts(skuRaw, anchor, weeks) {
    var parsed = parseSku(skuRaw);
    if (!parsed) return { error: "SKU needs a size, like BACKYARD BBQ-4OZ (" + skuRaw + ")" };
    if (!weeks.length) return { error: "No weekly numbers for " + parsed.sku };
    if (anchor && !parseISO(anchor)) return { error: "Anchor date must be YYYY-MM-DD (" + parsed.sku + ")" };
    return { row: { sku: parsed.sku, flavor: parsed.flavor, size: parsed.size, anchor: anchor || "2026-01-01", weeks: weeks } };
  }
  function parseSeries(text) {
    var raw = String(text || "").trim();
    if (!raw) return { error: "Paste a weekly series first." };
    if (raw.charAt(0) === "[" || raw.charAt(0) === "{") {
      var data;
      try { data = JSON.parse(raw); } catch (e) { return { error: "That JSON did not parse." }; }
      var list = Array.isArray(data) ? data : (data && data.rows) || [];
      if (!list.length) return { error: "No rows in that JSON." };
      var rows = [], err = "";
      list.forEach(function (r) {
        if (err) return;
        var got = rowFromParts(r.sku || skuKey(r.flavor, normSize(r.size)), r.anchor, numList(r.weeks || []));
        if (got.error) err = got.error;
        else rows.push(got.row);
      });
      if (err) return { error: err };
      return { rows: rows };
    }
    var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var rows = [], err = "";
    lines.forEach(function (line, idx) {
      if (err) return;
      var cells = splitCsv(line);
      if (!cells.length) return;
      if (idx === 0 && /^sku$/i.test(cells[0])) return;
      var anchor = "";
      var rest = cells.slice(1);
      if (rest.length && /^\d{4}-\d{2}-\d{2}/.test(rest[0])) { anchor = rest[0].slice(0, 10); rest = rest.slice(1); }
      var got = rowFromParts(cells[0], anchor, numList(rest));
      if (got.error) err = got.error;
      else rows.push(got.row);
    });
    if (err) return { error: err };
    if (!rows.length) return { error: "No SKU rows found. Use sku, anchor, then weekly numbers." };
    return { rows: rows };
  }

  var api = {
    build: build,
    buildCoverage: buildCoverage,
    snapshotFresh: snapshotFresh,
    seriesFresh: seriesFresh,
    STALE_DAYS: STALE_DAYS,
    parseSeries: parseSeries,
    parseSku: parseSku,
    skuKey: skuKey,
    sumNextDays: sumNextDays,
    wosBand: wosBand,
    clampPacing: clampPacing
  };
  root.DEMAND_WOS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (!root.document) return;

  var pacingTouched = false;
  var pacingNow = null;
  var busy = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    var v = round0(n);
    var neg = v < 0;
    var s = String(Math.abs(v));
    var out = "";
    while (s.length > 3) { out = "," + s.slice(-3) + out; s = s.slice(0, -3); }
    return (neg ? "-" : "") + s + out;
  }
  function fmtWos(w) {
    if (w == null || !isFinite(w)) return "n/a";
    return (Math.round(w * 100) / 100).toFixed(2);
  }
  function isForecast(view) {
    if (!view) return false;
    var heads = view.querySelectorAll("h2");
    for (var i = 0; i < heads.length; i++) {
      var t = (heads[i].textContent || "").replace(/\s+/g, " ");
      if (/Forecast vs Target|Pronostico vs Objetivo|Previsao vs Meta/i.test(t)) return true;
    }
    return false;
  }
  function readKv(key) {
    try { if (root.DB && DB.kvGet) return DB.kvGet(key); } catch (e) {}
    return null;
  }
  function readPacing() {
    if (pacingTouched && pacingNow != null) return clampPacing(pacingNow);
    var n = parseFloat(readKv(PACING_KEY));
    if (!isFinite(n)) return DEFAULT_PACING;
    return clampPacing(n);
  }
  function readStoredSeries() {
    var raw = readKv(SERIES_KEY);
    if (!raw) return [];
    try {
      var obj = JSON.parse(raw);
      return (obj && obj.rows) || [];
    } catch (e) { return []; }
  }
  function canCloudWrite() {
    if (!root.DB || DB.mode !== "cloud" || typeof DB.kvSet !== "function") return false;
    if (typeof DB.kvCloudOn === "function" && !DB.kvCloudOn()) return false;
    return true;
  }
  function context() {
    var forecast = [], items = [];
    try { forecast = (DB.forecast && DB.forecast()) || []; } catch (e) { forecast = []; }
    try { items = (DB.items && DB.items()) || []; } catch (e) { items = []; }
    var onHand = function (id) {
      try { return DB.onHand ? DB.onHand(id) : 0; } catch (e2) { return 0; }
    };
    var demand = [];
    try { demand = (DB.demandLines && DB.demandLines()) || []; } catch (e3) { demand = []; }
    return { forecast: forecast, items: items, onHand: onHand, demand: demand, series: readStoredSeries(), pacing: readPacing(), today: null };
  }
  function injectStyle() {
    if (document.getElementById("wos-style")) return;
    var s = document.createElement("style");
    s.id = "wos-style";
    s.textContent = [
      "#wos-root{margin-top:10px}",
      "#wos-root h2{font-size:16px}",
      "#wos-root .hint{margin-bottom:8px}",
      "#wos-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 8px}",
      "#wos-tools label{margin:0;font-size:12px;font-weight:700;color:var(--navy,#04223B)}",
      "#wos-pacing{width:76px;margin-left:6px;padding:4px 8px;font-weight:800;font-size:14px}",
      "#wos-root table{font-size:12.5px}",
      "#wos-root th,#wos-root td{padding:4px 8px;white-space:nowrap}",
      "#wos-root td.sku{font-weight:800;letter-spacing:.01em}",
      "#wos-root tr.wos-total td{background:#E8E8E8;font-weight:800}",
      ".wos-pill{display:inline-block;min-width:52px;text-align:center;padding:1px 8px;border-radius:999px;font-weight:800;font-size:12px}",
      ".wos-red{background:#FBE3E0;color:#7d1b12}",
      ".wos-amber{background:#FFF6E9;color:#7a4d05}",
      ".wos-green{background:#E0F4E8;color:#1d5631}",
      ".wos-na{background:#eef1f5;color:#3d4c5e}",
      ".wos-tag{display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;background:#eef1f5;color:#3d4c5e;font-size:10px;font-weight:800;letter-spacing:.03em;vertical-align:1px}",
      "#wos-extend{margin-top:10px}",
      "#wos-extend summary{cursor:pointer;font-weight:800;font-size:13px;color:var(--navy,#04223B)}",
      "#wos-import{width:100%;min-height:88px;margin-top:8px;font-family:ui-monospace,monospace;font-size:12px}",
      "#wos-root .wos-neg{color:#1d5631}",
      ".wos-stale{margin:8px 0;padding:8px 10px;border-radius:6px;background:#FFF6E9;color:#7a4d05;font-size:12.5px;border:1px solid #f0d9a8}"
    ].join("");
    document.head.appendChild(s);
  }
  function fcstTitle(r) {
    if (r.fcstSource === "series") return "Imported weekly series, next 60 days from today. The last week repeats.";
    if (r.fcstSource === "snapshot") return "8 weeks of the WIP forecast snapshot" + (r.sourceMonth ? " (" + r.sourceMonth + ")" : "") + ".";
    return "";
  }
  function ohTitle(r) {
    if (r.onHandSource === "live") return "Live finished bags on hand.";
    return "No finished bag item, so on hand is 0.";
  }
  function cell(v, cls) {
    return '<td class="right' + (cls || "") + '">' + (v == null ? '<span class="muted">n/a</span>' : fmt(v)) + '</td>';
  }
  function rowHtml(r) {
    var tag = r.fcstSource === "series" && r.fresh ? '<span class="wos-tag">SERIES</span>' : "";
    var ohExtra = r.onHandSource === "none" ? '<div class="muted sm">no bag item</div>' : "";
    var sugCls = r.suggested != null && r.suggested < 0 ? " wos-neg" : "";
    return '<tr data-sku="' + esc(r.sku) + '">' +
      '<td class="sku">' + esc(r.sku) + tag + '</td>' +
      '<td class="right" title="' + esc(ohTitle(r)) + '">' + fmt(r.onHand) + ohExtra + '</td>' +
      '<td class="right" title="' + esc(fcstTitle(r)) + '">' + (r.fcst == null ? '<span class="muted">n/a</span>' : fmt(r.fcst)) + '</td>' +
      cell(r.gap) +
      '<td class="right"><span class="wos-pill wos-' + r.band + '">' + fmtWos(r.wos) + '</span></td>' +
      cell(r.paced) +
      '<td class="right' + sugCls + '"><b>' + (r.suggested == null ? '<span class="muted">n/a</span>' : fmt(r.suggested)) + '</b></td>' +
      '</tr>';
  }
  function staleText(model) {
    var src = model.sourceMonth ? "The forecast snapshot is " + model.sourceMonth + "." : "There is no forecast snapshot.";
    return src + " It is not current, so WOS, gap, pacing need and suggested production are hidden until a current forecast is loaded." +
      (model.staleSeries ? " The imported weekly series ends before today, so it is not used." : "");
  }
  function coverageHtml(rows) {
    if (!rows.length) return '<p class="muted sm">No open SPS order lines and no finished bag stock to show.</p>';
    var tOpen = 0, t4 = 0, t15 = 0;
    var body = rows.map(function (r) {
      tOpen += r.open; t4 += r.oh4 || 0; t15 += r.oh15 || 0;
      var after = r.after4 == null ? '<span class="muted">n/a</span>' : fmt(r.after4);
      var afterCls = r.after4 != null && r.after4 < 0 ? ' style="color:#7d1b12;font-weight:800"' : "";
      return '<tr><td class="sku">' + esc(r.flavor) + '</td>' + cell(r.oh4) + cell(r.oh15) +
        '<td class="right">' + fmt(r.open) + (r.lines ? '<div class="muted sm">' + r.lines + ' line' + (r.lines === 1 ? "" : "s") + '</div>' : "") + '</td>' +
        '<td class="right">' + esc(r.due || "") + '</td>' +
        '<td class="right"' + afterCls + '>' + after + '</td></tr>';
    }).join("");
    return '<div class="tblwrap"><table><thead><tr><th>Flavor</th><th class="right">On Hand 4 oz</th><th class="right">On Hand 1.5 oz</th>' +
      '<th class="right">SPS Open Bags</th><th class="right">Earliest Due</th><th class="right">4 oz After Open Orders</th></tr></thead><tbody>' + body +
      '<tr class="wos-total"><td>TOTAL</td><td class="right">' + fmt(t4) + '</td><td class="right">' + fmt(t15) + '</td><td class="right">' + fmt(tOpen) + '</td><td></td><td></td></tr>' +
      '</tbody></table></div>';
  }
  function fill(rootEl) {
    var ctx = context();
    var model = build(ctx);
    var body = rootEl.querySelector("#wos-body");
    var meta = rootEl.querySelector("#wos-meta");
    var stale = rootEl.querySelector("#wos-stale");
    var cov = rootEl.querySelector("#wos-coverage");
    var main = rootEl.querySelector("#wos-main");
    if (!body) return model;
    if (stale) {
      stale.style.display = model.current ? "none" : "";
      stale.innerHTML = model.current ? "" : '<b>Forecast is stale.</b> ' + esc(staleText(model));
    }
    if (main) main.style.display = model.current ? "" : "none";
    if (cov) {
      cov.style.display = model.current ? "none" : "";
      if (!model.current) {
        cov.innerHTML = '<h3 style="font-size:14px;margin:6px 0">Operational cover: live on hand vs open SPS orders</h3>' +
          '<p class="hint">Not a forecast. Open SPS order bags are a backlog of purchase orders, not a weekly rate, so this does not give weeks of supply. SPS lines carry flavor but not size, so open bags are shown per flavor; retail SPS orders are 4 oz. E-commerce demand is not included.</p>' +
          coverageHtml(buildCoverage(ctx));
      }
    }
    var rows = model.rows.filter(function (r) { return r.fresh; });
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">No current forecast. Import a weekly series that reaches today, or refresh the WIP forecast.</td></tr>';
    } else {
      var gOh = 0, gFc = 0, gGap = 0, gPace = 0, gSug = 0, reds = 0;
      rows.forEach(function (r) {
        gOh += r.onHand; gFc += r.fcst; gGap += r.gap; gPace += r.paced; gSug += r.suggested;
        if (r.band === "red") reds++;
      });
      body.innerHTML = rows.map(rowHtml).join("") +
        '<tr class="wos-total"><td>TOTAL</td><td class="right">' + fmt(gOh) + '</td><td class="right">' + fmt(gFc) + '</td><td class="right">' + fmt(gGap) + '</td><td class="right">' + reds + ' under 2</td><td class="right">' + fmt(gPace) + '</td><td class="right">' + fmt(gSug) + '</td></tr>';
    }
    if (meta) {
      var seriesN = readStoredSeries().length;
      meta.textContent = (model.sourceMonth ? "Snapshot " + model.sourceMonth + (model.snapshotFresh ? "" : " (stale)") + ". " : "No snapshot. ") +
        (seriesN ? seriesN + " imported SKU" + (seriesN === 1 ? "" : "s") + (model.staleSeries ? ", " + model.staleSeries + " ended before today" : "") + ". " : "") +
        "Pacing " + model.pacing + ".";
    }
    markForecastView(model);
    return model;
  }
  // Stale banner on the Forecast vs Target header card, so the WIP columns there do not read as current.
  function markForecastView(model) {
    var view = document.getElementById("view");
    if (!view) return;
    var old = view.querySelector("#fc-stale-note");
    if (model.snapshotFresh || !model.sourceMonth) { if (old && old.parentNode) old.parentNode.removeChild(old); return; }
    if (old) return;
    var first = view.querySelector(".card");
    if (!first || first.id === "wos-root") return;
    var p = document.createElement("p");
    p.id = "fc-stale-note";
    p.className = "wos-stale";
    p.innerHTML = "<b>Stale snapshot.</b> The WIP forecast columns below are from " + esc(model.sourceMonth) + " and are not a current forecast. Use them for reference only.";
    first.appendChild(p);
  }
  function shell() {
    var gate = canCloudWrite();
    return '<div class="suprow"><h2 style="margin:0">60-Day Need / Weeks of Supply</h2></div>' +
      '<p id="wos-stale" class="wos-stale" style="display:none"></p>' +
      '<div id="wos-coverage" style="display:none"></div>' +
      '<div id="wos-main">' +
      '<p class="hint">Live on hand from finished bags. 60-day forecast is 8 weeks of a current WIP snapshot, or an imported weekly series that reaches today. Gap = forecast minus on hand. Pacing-adjusted need = forecast x pacing. Suggested production = pacing-adjusted need minus on hand. Proj. WOS = on hand / (forecast / 8): red under 2, amber 2 to 4, green over 4. A snapshot more than ' + STALE_DAYS + ' days past its month is treated as stale and hidden.</p>' +
      '</div>' +
      '<div id="wos-tools">' +
      '<label>Pacing <input id="wos-pacing" type="number" min="0" max="3" step="0.05" value="' + esc(String(readPacing())) + '" aria-label="Forecast pacing"></label>' +
      '<span id="wos-save" class="muted sm"></span>' +
      '<span id="wos-meta" class="muted sm"></span>' +
      '</div>' +
      '<div class="tblwrap"><table><thead><tr>' +
      '<th>SKU</th><th class="right">On Hand</th><th class="right">60-day Forecast</th><th class="right">Gap</th>' +
      '<th class="right">Proj. WOS</th><th class="right">Pacing-adjusted Need</th><th class="right">Suggested Production</th>' +
      '</tr></thead><tbody id="wos-body"></tbody></table></div>' +
      '<details id="wos-extend"><summary>Load a current weekly forecast</summary>' +
      '<p class="hint" style="margin-top:8px">Paste CSV or JSON. Columns: sku, anchor (YYYY-MM-DD), then one number per week. A series is used only while its last week reaches today. Saving replaces the imported series and overrides the snapshot for those SKUs only. Example format:</p>' +
      '<pre class="sm" style="white-space:pre-wrap;margin:0 0 8px">BACKYARD BBQ-4OZ,2026-11-02,1000,1000,1000,1000,1000,1000,1000,1000,1000</pre>' +
      '<textarea id="wos-import" placeholder="sku,anchor,w1,w2,..."></textarea>' +
      '<div style="margin-top:8px"><button type="button" class="primary sm" id="wos-save-series"' + (gate ? "" : " disabled") + '>Save weekly series</button> ' +
      '<button type="button" class="ghost sm" id="wos-clear-series"' + (gate ? "" : " disabled") + '>Clear imported series</button></div>' +
      '<p id="wos-import-note" class="hint" style="margin-top:8px">' + (gate ? "Saves to the cloud for every screen." : "Weekly forecast import saves to the cloud. Cloud sync is off on this browser.") + '</p>' +
      '</details>';
  }
  function savePacing(n) {
    var note = document.getElementById("wos-save");
    if (!root.DB || typeof DB.kvSet !== "function") {
      if (note) note.textContent = "Shown in this view";
      return;
    }
    if (note) note.textContent = "Saving...";
    DB.kvSet(PACING_KEY, String(n)).then(function (r) {
      var el = document.getElementById("wos-save");
      if (!el) return;
      if (r && r.ok === false) el.textContent = "Pacing did not save";
      else if (r && r.where === "local") el.textContent = "Saved on this device";
      else el.textContent = "Saved";
    });
  }
  function writeSeries(rows, noteText) {
    var note = document.getElementById("wos-import-note");
    if (!canCloudWrite()) {
      if (note) note.textContent = "Weekly forecast import saves to the cloud. Cloud sync is off on this browser.";
      return;
    }
    if (note) note.textContent = "Saving...";
    var payload = JSON.stringify({ updated_at: new Date().toISOString(), rows: rows });
    DB.kvSet(SERIES_KEY, payload).then(function (r) {
      var el = document.getElementById("wos-import-note");
      var host = document.getElementById("wos-root");
      if (r && r.ok === false) { if (el) el.textContent = "Import did not save"; return; }
      if (el) el.textContent = noteText;
      if (host) fill(host);
    });
  }
  function bind(rootEl) {
    var input = rootEl.querySelector("#wos-pacing");
    if (input) {
      input.addEventListener("input", function () {
        var raw = String(input.value || "").trim();
        if (raw === "" || raw === "." || raw === "0.") return;
        var n = parseFloat(raw);
        if (!isFinite(n) || n < 0) return;
        pacingTouched = true;
        pacingNow = n > 3 ? 3 : n;
        fill(rootEl);
      });
      input.addEventListener("change", function () {
        var n = clampPacing(input.value);
        input.value = String(n);
        pacingTouched = true;
        pacingNow = n;
        fill(rootEl);
        savePacing(n);
      });
    }
    var saveBtn = rootEl.querySelector("#wos-save-series");
    if (saveBtn) saveBtn.addEventListener("click", function () {
      var box = rootEl.querySelector("#wos-import");
      var parsed = parseSeries(box ? box.value : "");
      var note = rootEl.querySelector("#wos-import-note");
      if (parsed.error) { if (note) note.textContent = parsed.error; return; }
      writeSeries(parsed.rows, "Saved " + parsed.rows.length + " SKU" + (parsed.rows.length === 1 ? "" : "s") + ". Those SKUs now use the weekly series.");
    });
    var clearBtn = rootEl.querySelector("#wos-clear-series");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      writeSeries([], "Imported series cleared.");
    });
  }
  function mount(view) {
    if (!view || view.querySelector("#wos-root")) return;
    injectStyle();
    var el = document.createElement("div");
    el.id = "wos-root";
    el.className = "card";
    el.innerHTML = shell();
    var cards = view.querySelectorAll(".card");
    var anchor = cards.length ? cards[0] : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else view.appendChild(el);
    fill(el);
    bind(el);
  }
  function onView() {
    if (busy) return;
    var view = document.getElementById("view");
    if (!isForecast(view)) return;
    if (view.querySelector("#wos-root")) return;
    busy = true;
    try { mount(view); } finally { busy = false; }
  }
  function start() {
    var view = document.getElementById("view");
    if (!view || view.__wosObs) return;
    view.__wosObs = true;
    var obs = new MutationObserver(function () { onView(); });
    obs.observe(view, { childList: true });
    onView();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof window !== "undefined" ? window : globalThis);

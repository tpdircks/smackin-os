/* ============================================================================
   Smackin' OS - 60-Day Need / Weeks of Supply (demand-wos.js)
   Standalone. Does not edit app.js.
   Mounts on Forecast vs Target, under the page header.

   On hand: DB.onHand for the finished bag item (bag4 / bag15).
   60-day forecast: 8 x the live demand_forecast weekly snapshot
   (the same weekly bags Forecast vs Target already shows).
   An imported weekly series, saved in kv_status, replaces that
   snapshot for the SKUs it lists. Built-in FORECAST samples are
   used only when the live snapshot and the import are both empty.

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

  // Fully specified FORECAST curves from the WIP brief. Last week repeats.
  var SAMPLE_WEEKS = [
    { flavor: "Variety Pack", size: "1.5oz", anchor: "2026-01-01", weeks: [11804, 11804, 11804, 11804, 18765, 18765, 18765, 18765, 24023, 24023, 24023, 24023, 24023, 28641] },
    { flavor: "Backyard BBQ", size: "4oz", anchor: "2026-01-01", weeks: [4330, 4330, 4330, 4330, 6883, 6883, 6883, 6883, 8811, 8811, 8811, 8811, 8811, 10505] }
  ];
  // Calculator on-hand samples. Used only when that SKU has no bag item.
  var SAMPLE_ON_HAND = {
    "SOUR CREAM & ONION-1.5OZ": 15000,
    "SOUR CREAM & ONION-4OZ": 11560,
    "BACKYARD BBQ-1.5OZ": 28750,
    "BACKYARD BBQ-4OZ": 17964
  };

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
    var samples = indexSeries(SAMPLE_WEEKS);
    var keys = {};
    Object.keys(fc).forEach(function (k) { keys[k] = 1; });
    Object.keys(series).forEach(function (k) { keys[k] = 1; });
    if (!Object.keys(keys).length) Object.keys(samples).forEach(function (k) { keys[k] = 1; });
    var rows = Object.keys(keys).map(function (k) {
      var base = fc[k] || series[k] || samples[k];
      var flavor = base.flavor;
      var size = base.size;
      var sku = skuKey(flavor, size);
      var fcstRaw = 0;
      var fcstSource = "none";
      var sourceMonth = fc[k] ? (fc[k].source_month || "") : "";
      var weekly = 0;
      if (series[k]) {
        fcstRaw = sumNextDays(series[k].anchor, series[k].weeks, ctx.today, 60);
        fcstSource = "series";
        weekly = weekValue(series[k].weeks, 0);
      } else if (fc[k]) {
        weekly = fc[k].weekly;
        fcstRaw = weekly * WEEKS_IN_60;
        fcstSource = "snapshot";
      } else if (samples[k]) {
        fcstRaw = sumNextDays(samples[k].anchor, samples[k].weeks, ctx.today, 60);
        fcstSource = "sample";
      }
      var live = liveOnHand(ctx.items, ctx.onHand, flavor, size);
      var onHandSource = "none";
      var onHandRaw = 0;
      if (live != null) { onHandRaw = live; onHandSource = "live"; }
      else if (SAMPLE_ON_HAND[sku] != null) { onHandRaw = SAMPLE_ON_HAND[sku]; onHandSource = "sample"; }
      var fcst = round0(fcstRaw);
      var oh = round0(onHandRaw);
      var paced = round0(fcst * pacing);
      var wos = fcst > 0 ? oh / (fcst / WEEKS_IN_60) : null;
      return {
        sku: sku, flavor: flavor, size: size,
        onHand: oh, onHandSource: onHandSource,
        fcst: fcst, fcstSource: fcstSource, sourceMonth: sourceMonth, weekly: weekly,
        gap: fcst - oh, paced: paced, suggested: paced - oh, wos: wos, band: wosBand(wos)
      };
    });
    rows.sort(function (a, b) {
      var d = flavorRank(a.flavor) - flavorRank(b.flavor);
      if (d) return d;
      if (a.size !== b.size) return a.size === "1.5oz" ? -1 : 1;
      return a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0;
    });
    return { pacing: pacing, rows: rows };
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
    parseSeries: parseSeries,
    parseSku: parseSku,
    skuKey: skuKey,
    sumNextDays: sumNextDays,
    wosBand: wosBand,
    clampPacing: clampPacing,
    SAMPLE_WEEKS: SAMPLE_WEEKS,
    SAMPLE_ON_HAND: SAMPLE_ON_HAND
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
    return { forecast: forecast, items: items, onHand: onHand, series: readStoredSeries(), pacing: readPacing(), today: null };
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
      "#wos-root .wos-neg{color:#1d5631}"
    ].join("");
    document.head.appendChild(s);
  }
  function fcstTitle(r) {
    if (r.fcstSource === "series") return "Imported weekly series, next 60 days from today. The last week repeats.";
    if (r.fcstSource === "sample") return "Built-in FORECAST sample. Live snapshot is empty.";
    if (r.fcstSource === "snapshot") return "8 weeks of the WIP forecast snapshot" + (r.sourceMonth ? " (" + r.sourceMonth + ")" : "") + ".";
    return "";
  }
  function ohTitle(r) {
    if (r.onHandSource === "live") return "Live finished bags on hand.";
    if (r.onHandSource === "sample") return "Sample on hand. No finished bag item for this SKU yet.";
    return "No finished bag item, so on hand is 0.";
  }
  function rowHtml(r) {
    var tag = "";
    if (r.fcstSource === "series") tag = '<span class="wos-tag">SERIES</span>';
    else if (r.fcstSource === "sample") tag = '<span class="wos-tag">SAMPLE</span>';
    var ohExtra = r.onHandSource === "sample" ? '<span class="wos-tag">SAMPLE</span>' : (r.onHandSource === "none" ? '<div class="muted sm">no bag item</div>' : "");
    var sugCls = r.suggested < 0 ? " wos-neg" : "";
    return '<tr data-sku="' + esc(r.sku) + '">' +
      '<td class="sku">' + esc(r.sku) + tag + '</td>' +
      '<td class="right" title="' + esc(ohTitle(r)) + '">' + fmt(r.onHand) + ohExtra + '</td>' +
      '<td class="right" title="' + esc(fcstTitle(r)) + '">' + fmt(r.fcst) + '</td>' +
      '<td class="right">' + fmt(r.gap) + '</td>' +
      '<td class="right"><span class="wos-pill wos-' + r.band + '">' + fmtWos(r.wos) + '</span></td>' +
      '<td class="right">' + fmt(r.paced) + '</td>' +
      '<td class="right' + sugCls + '"><b>' + fmt(r.suggested) + '</b></td>' +
      '</tr>';
  }
  function fill(rootEl) {
    var model = build(context());
    var body = rootEl.querySelector("#wos-body");
    var meta = rootEl.querySelector("#wos-meta");
    if (!body) return model;
    if (!model.rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">No forecast snapshot yet. Import a weekly series below, or refresh the WIP forecast.</td></tr>';
    } else {
      var gOh = 0, gFc = 0, gGap = 0, gPace = 0, gSug = 0, reds = 0;
      model.rows.forEach(function (r) {
        gOh += r.onHand; gFc += r.fcst; gGap += r.gap; gPace += r.paced; gSug += r.suggested;
        if (r.band === "red") reds++;
      });
      body.innerHTML = model.rows.map(rowHtml).join("") +
        '<tr class="wos-total"><td>TOTAL</td><td class="right">' + fmt(gOh) + '</td><td class="right">' + fmt(gFc) + '</td><td class="right">' + fmt(gGap) + '</td><td class="right">' + reds + ' under 2</td><td class="right">' + fmt(gPace) + '</td><td class="right">' + fmt(gSug) + '</td></tr>';
    }
    if (meta) {
      var seriesN = readStoredSeries().length;
      var month = "";
      model.rows.forEach(function (r) { if (!month && r.sourceMonth) month = r.sourceMonth; });
      meta.textContent = (month ? "Snapshot " + month + ". " : "") +
        (seriesN ? seriesN + " imported SKU" + (seriesN === 1 ? "" : "s") + " use a weekly series. " : "") +
        "Pacing " + model.pacing + ".";
    }
    return model;
  }
  function shell() {
    var gate = canCloudWrite();
    return '<div class="suprow"><h2 style="margin:0">60-Day Need / Weeks of Supply</h2></div>' +
      '<p class="hint">Live on hand from finished bags. 60-day forecast is 8 weeks of the WIP snapshot (the same weekly bags as the table under this one). Gap = forecast minus on hand. Pacing-adjusted need = forecast x pacing. Suggested production = pacing-adjusted need minus on hand. Proj. WOS = on hand / (forecast / 8): red under 2, amber 2 to 4, green over 4.</p>' +
      '<div id="wos-tools">' +
      '<label>Pacing <input id="wos-pacing" type="number" min="0" max="3" step="0.05" value="' + esc(String(readPacing())) + '" aria-label="Forecast pacing"></label>' +
      '<span id="wos-save" class="muted sm"></span>' +
      '<span id="wos-meta" class="muted sm"></span>' +
      '</div>' +
      '<div class="tblwrap"><table><thead><tr>' +
      '<th>SKU</th><th class="right">On Hand</th><th class="right">60-day Forecast</th><th class="right">Gap</th>' +
      '<th class="right">Proj. WOS</th><th class="right">Pacing-adjusted Need</th><th class="right">Suggested Production</th>' +
      '</tr></thead><tbody id="wos-body"></tbody></table></div>' +
      '<details id="wos-extend"><summary>Extend weekly forecast</summary>' +
      '<p class="hint" style="margin-top:8px">Paste CSV or JSON. Columns: sku, anchor (YYYY-MM-DD), then one number per week. The last week repeats. Saving replaces the imported series and overrides the live snapshot for those SKUs only. Other SKUs stay on the snapshot. Built-in samples (used only when the snapshot is empty):</p>' +
      '<pre class="sm" style="white-space:pre-wrap;margin:0 0 8px">VARIETY PACK-1.5OZ,2026-01-01,11804,11804,11804,11804,18765,18765,18765,18765,24023,24023,24023,24023,24023,28641\nBACKYARD BBQ-4OZ,2026-01-01,4330,4330,4330,4330,6883,6883,6883,6883,8811,8811,8811,8811,8811,10505</pre>' +
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
      writeSeries([], "Imported series cleared. Every SKU is back on the live snapshot.");
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

/* ===========================================================================
   Smackin' OS - Visual summaries (smk-viz.js)  v322
   Charts, gauges, progress bars, colored tiles and sparklines for:
     - Home > Big picture (dashboard.js calls SMK_VIZ.dashboard())
     - Home > Today (simple-home.js calls SMK_VIZ.homeStrip(role))
     - Inbound and Outbound hubs (inout-hubs.js calls SMK_VIZ.inbound(m) /
       SMK_VIZ.outbound(m) with the hub model it already built)
     - Inventory > On hand (inventory-visual.js calls SMK_VIZ.inventory())
   Rules:
     - Read only. No Supabase writes, no timers, no network of its own.
     - Every number comes from data the app already loaded (DB.*). Nothing is
       made up. When a source is empty the chart says so instead of drawing.
     - Past-due demand is never shown: open order bags and ship dates before
       today (America/Denver) are left out of every chart and tile.
     - Every panel shows "Operational" and an as-of time.
     - Plain inline SVG and CSS. No chart library, no build step.
   Clicking a tile or chart opens the screen behind it (data-smk-go, handled
   by simple-home.js with DEPT.go).
   Exposes window.SMK_VIZ.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var TZ = "America/Denver";
  var C = { ok: "#2E7D32", warn: "#E08A00", bad: "#C62828", info: "#1F5FA8", navy: "#04223B", orange: "#F26B21", mute: "#9AA5B1", grid: "#E3E8EF" };

  // ---- helpers ---------------------------------------------------------------
  function $(id) { return doc ? doc.getElementById(id) : null; }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) { if (v == null) return ""; if (typeof v === "string") return v; return v[lang()] || v.en || ""; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) { var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
  function fmt(n) { n = Math.round(num(n)); try { return n.toLocaleString("en-US"); } catch (e) { return String(n); } }
  function short(n) {
    n = num(n); var a = Math.abs(n);
    if (a >= 1e6) return (Math.round(n / 1e5) / 10) + "M";
    if (a >= 1e4) return Math.round(n / 1e3) + "k";
    if (a >= 1e3) return (Math.round(n / 100) / 10) + "k";
    return String(Math.round(n));
  }
  function arr(fn) { try { var v = fn(); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function cloud() { try { return !!(root.DB && root.DB.mode === "cloud"); } catch (e) { return false; } }
  function denverDay(d) {
    d = d || new Date();
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function denverClock(d) {
    d = d || new Date();
    try { return new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d) + " MT"; }
    catch (e) { return d.toISOString().slice(0, 16).replace("T", " ") + " UTC"; }
  }
  function addDays(iso, n) {
    var p = String(iso).split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  // Accepts 2026-11-24, 11/24/2026, 11/24/26, ISO timestamps.
  function isoOf(s) {
    s = String(s == null ? "" : s).trim();
    if (!s) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
    if (m) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2); }
    return "";
  }
  function dayLabel(iso) {
    var p = String(iso).split("-");
    if (p.length < 3) return iso;
    return (+p[1]) + "/" + (+p[2]);
  }
  function dow(iso) {
    var p = String(iso).split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var L = { en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], es: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"], pt: ["Do", "Se", "Te", "Qa", "Qi", "Sx", "Sa"] };
    return (L[lang()] || L.en)[d.getUTCDay()];
  }
  function go(target) { return target ? ' data-smk-go="' + esc(target) + '" role="button" tabindex="0"' : ""; }

  // ---- words -----------------------------------------------------------------
  var W = {
    oper: { en: "Operational", es: "Operativo", pt: "Operacional" },
    asOf: { en: "as of", es: "al", pt: "em" },
    local: { en: "Not on the shared cloud database. These charts are not live plant data.", es: "No esta en la base compartida. Estas graficas no son datos en vivo.", pt: "Nao esta na base compartilhada. Estes graficos nao sao dados ao vivo." },
    noData: { en: "No data yet.", es: "Sin datos todavia.", pt: "Sem dados ainda." },
    glance: { en: "Plant at a glance", es: "La planta de un vistazo", pt: "A fabrica num relance" },
    glanceSub: { en: "Green is fine, yellow needs a look, red needs action today. Tap any box to open that screen.", es: "Verde esta bien, amarillo hay que revisar, rojo hay que actuar hoy. Toque un cuadro para abrir la pantalla.", pt: "Verde esta ok, amarelo precisa olhar, vermelho precisa agir hoje. Toque um quadro para abrir a tela." },
    todayGlance: { en: "Today at a glance", es: "Hoy de un vistazo", pt: "Hoje num relance" },
    bags: { en: "bags", es: "bolsas", pt: "sacos" },
    days14: { en: "last 14 days", es: "ultimos 14 dias", pt: "ultimos 14 dias" }
  };

  // ---- data (read only) ------------------------------------------------------
  function today() { return denverDay(); }
  function items() { return arr(function () { return root.DB.items(); }); }
  function onHand(id) { try { return num(root.DB.onHand(id)); } catch (e) { return 0; } }
  function canonFlavor(s) {
    var raw = String(s || "").trim();
    if (!raw || /^unmapped/i.test(raw)) return "";
    try { if (root.DEMAND_WOS && root.DEMAND_WOS.canonicalFlavor) return root.DEMAND_WOS.canonicalFlavor(raw); } catch (e) {}
    return raw;
  }
  function flavorKey(s) { return String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, ""); }

  function stockHealth() {
    var out = { ok: 0, low: 0, out: 0, groups: {} };
    var G = function (cat) {
      cat = String(cat || "").toLowerCase();
      if (cat === "bag4" || cat === "bag15" || cat === "bag275" || cat === "mastercase" || cat === "cashews") return "fin";
      if (cat.indexOf("film") >= 0) return "film";
      if (cat.indexOf("season") >= 0) return "seas";
      if (cat.indexOf("seed") >= 0) return "seed";
      return "pack";
    };
    items().forEach(function (it) {
      var r = num(it.reorder);
      // Same rule as dashboard.js stockSplit and stock-alerts.js, so the counts match.
      if (!(r > 0)) return;
      var q = onHand(it.id);
      var k = q <= 0 ? "out" : (q < r ? "low" : "ok");
      out[k]++;
      var g = G(it.category);
      var row = out.groups[g] || (out.groups[g] = { ok: 0, low: 0, out: 0 });
      row[k]++;
    });
    return out;
  }
  function finishedByFlavor() {
    var map = {};
    items().forEach(function (it) {
      var cat = String(it.category || "");
      if (cat !== "bag4" && cat !== "bag15") return;
      var f = canonFlavor(it.flavor || "");
      if (!f) return;
      var k = flavorKey(f);
      var r = map[k] || (map[k] = { flavor: f, b4: 0, b15: 0, code4: "" });
      var q = onHand(it.id);
      if (cat === "bag4") { r.b4 += q; if (!r.code4) r.code4 = it.code || it.id; } else r.b15 += q;
    });
    return map;
  }
  // Open demand lines, due today or later. Past-due and undated lines are left out.
  function openDemand() {
    var t = today();
    return arr(function () { return root.DB.demandLines(); }).filter(function (d) {
      if (String(d.status || "Open") !== "Open") return false;
      var due = isoOf(d.due_date);
      return !!due && due >= t;
    });
  }
  function coverage() {
    var fin = finishedByFlavor();
    var dem = {}, unmapped = 0;
    openDemand().forEach(function (d) {
      var f = canonFlavor(d.flavor);
      if (!f) { unmapped += num(d.bags); return; }
      var k = flavorKey(f);
      var r = dem[k] || (dem[k] = { flavor: f, bags: 0 });
      r.bags += num(d.bags);
    });
    // Only flavors that have a 4 oz bag item. Cashews, seeds and other packs
    // are counted in noBag instead of being drawn as 0 on hand.
    var noBag = [];
    var rows = Object.keys(dem).filter(function (k) {
      if (fin[k] && fin[k].code4) return true;
      if (dem[k].bags > 0) noBag.push(dem[k].flavor);
      return false;
    }).map(function (k) {
      var oh = fin[k].b4;
      return { flavor: dem[k].flavor, need: dem[k].bags, oh: oh, code: fin[k].code4, short: Math.max(0, dem[k].bags - oh) };
    }).filter(function (r) { return r.need > 0; });
    rows.sort(function (a, b) { return b.short - a.short || b.need - a.need; });
    return { rows: rows, unmapped: unmapped, noBag: noBag };
  }
  function demandByWeek(weeks) {
    var t = today();
    var out = [];
    for (var i = 0; i < weeks; i++) out.push({ from: addDays(t, i * 7), to: addDays(t, i * 7 + 6), bags: 0, pos: {} });
    openDemand().forEach(function (d) {
      var due = isoOf(d.due_date);
      for (var i = 0; i < out.length; i++) {
        if (due >= out[i].from && due <= out[i].to) { out[i].bags += num(d.bags); out[i].pos[String(d.po || "")] = 1; return; }
      }
    });
    out.forEach(function (w) { w.n = Object.keys(w.pos).length; });
    return out;
  }
  function perDay(rows, dateFn, valFn, days, endDay) {
    var end = endDay || today();
    var list = [], idx = {};
    for (var i = days - 1; i >= 0; i--) { var d = addDays(end, -i); idx[d] = list.length; list.push({ day: d, v: 0 }); }
    rows.forEach(function (r) {
      var d = dateFn(r);
      if (d && idx[d] != null) list[idx[d]].v += valFn ? valFn(r) : 1;
    });
    return list;
  }
  function receivedDaily(days) {
    return perDay(arr(function () { return root.DB.receivingLog(); }), function (r) { return isoOf(r.recv_date); }, null, days);
  }
  // Shipping log: the app loads the newest 3000 rows, and ShipStation e-com
  // parcels (entered_by "sync:...") fill that in a few days. Team-logged
  // shipments (retail loads, freight, one-offs) are always loaded in full,
  // so the daily chart uses those. Parcels are only counted for today.
  function isParcel(r) { return /^sync:/i.test(String(r.entered_by || "")); }
  function shippedDaily(days) {
    return perDay(arr(function () { return root.DB.shippingLog(); }).filter(function (r) { return !isParcel(r); }), function (r) { return isoOf(r.ship_date); }, null, days);
  }
  function parcelsToday() {
    var t = today();
    return arr(function () { return root.DB.shippingLog(); }).filter(function (r) { return isParcel(r) && isoOf(r.ship_date) === t; }).length;
  }
  // P-Mac bags per Denver day from pmac_history (home-week.js reads it).
  // v322 read production_output, which has had no rows since Nov 9 2026.
  function pmacInfo(days) {
    try { if (root.HOME_WEEK && root.HOME_WEEK.pmacDaily) return root.HOME_WEEK.pmacDaily(days); } catch (e) {}
    return { days: perDay([], function () { return ""; }, null, days), loaded: false, latest: "" };
  }
  function pmacDaily(days) { return pmacInfo(days).days; }

  function hubCounts() {
    try { return (root.INOUT_HUBS && root.INOUT_HUBS.counts) ? root.INOUT_HUBS.counts() || {} : {}; } catch (e) { return {}; }
  }
  function stockFreshness() {
    var best = "";
    arr(function () { return root.DB.stock(); }).forEach(function (r) { var u = String(r.updated_at || ""); if (u > best) best = u; });
    return best;
  }

  // ---- drawing ---------------------------------------------------------------
  // Colored status tile. tone: ok | warn | bad | info | mute
  function tile(o) {
    return '<div class="vz-tile vz-' + (o.tone || "info") + '"' + go(o.go) + ">" +
      '<div class="vz-tl">' + esc(o.label) + "</div>" +
      '<div class="vz-tn">' + esc(o.value) + (o.unit ? ' <small>' + esc(o.unit) + "</small>" : "") + "</div>" +
      (o.sub ? '<div class="vz-ts">' + esc(o.sub) + "</div>" : "") +
      (o.spark ? '<div class="vz-tsp">' + o.spark + "</div>" : "") +
      "</div>";
  }
  function sparkline(vals, color) {
    if (!vals.length) return "";
    var w = 120, h = 28, max = Math.max.apply(null, vals.concat([1]));
    var step = vals.length > 1 ? w / (vals.length - 1) : w;
    var pts = vals.map(function (v, i) { return (i * step).toFixed(1) + "," + (h - 2 - (v / max) * (h - 4)).toFixed(1); });
    var last = pts[pts.length - 1].split(",");
    return '<svg class="vz-spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline fill="none" stroke="' + (color || C.info) + '" stroke-width="2" points="' + pts.join(" ") + '"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6" fill="' + (color || C.info) + '"/></svg>';
  }
  // Vertical columns. data: [{label, sub, v, tone}]
  function columns(data, opts) {
    opts = opts || {};
    if (!data.length) return '<p class="vz-empty">' + esc(tx(W.noData)) + "</p>";
    var w = opts.w || Math.max(300, data.length * 32), h = opts.h || 150, pad = 12, top = 14, base = h - 30;
    var max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    var bw = (w - pad * 2) / data.length;
    var bars = data.map(function (d, i) {
      var bh = Math.round((d.v / max) * (base - top));
      var x = pad + i * bw + bw * 0.15, y = base - bh;
      var col = d.tone ? (C[d.tone] || d.tone) : (opts.color || C.info);
      return '<g><title>' + esc(d.label + ": " + fmt(d.v)) + "</title>" +
        '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw * 0.7).toFixed(1) + '" height="' + Math.max(bh, d.v > 0 ? 2 : 0) + '" rx="3" fill="' + col + '"/>' +
        (d.v > 0 && opts.values !== false ? '<text x="' + (x + bw * 0.35).toFixed(1) + '" y="' + (y - 3) + '" class="vz-sv">' + esc(short(d.v)) + "</text>" : "") +
        '<text x="' + (x + bw * 0.35).toFixed(1) + '" y="' + (base + 13) + '" class="vz-sx">' + esc(d.label) + "</text>" +
        (d.sub ? '<text x="' + (x + bw * 0.35).toFixed(1) + '" y="' + (base + 25) + '" class="vz-sx vz-sx2">' + esc(d.sub) + "</text>" : "") + "</g>";
    }).join("");
    return '<svg class="vz-cols" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(opts.aria || "") + '">' +
      '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + base + '" y2="' + base + '" stroke="' + C.grid + '"/>' + bars + "</svg>";
  }
  // Half-circle gauge. pct may exceed 100 (capped in the drawing).
  function gauge(pct, label, tone) {
    var p = Math.max(0, Math.min(100, pct));
    var r = 52, cx = 64, cy = 62;
    var a = Math.PI * (1 - p / 100);
    var x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
    var col = C[tone] || tone || C.info;
    var arc = p <= 0 ? "" : '<path d="M ' + (cx - r) + " " + cy + " A " + r + " " + r + " 0 0 1 " + x.toFixed(1) + " " + y.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round"/>';
    return '<svg class="vz-gauge" viewBox="0 0 128 76" role="img" aria-label="' + esc(label) + '">' +
      '<path d="M ' + (cx - r) + " " + cy + " A " + r + " " + r + " 0 0 1 " + (cx + r) + " " + cy + '" fill="none" stroke="' + C.grid + '" stroke-width="12" stroke-linecap="round"/>' + arc +
      '<text x="' + cx + '" y="' + (cy - 4) + '" class="vz-gv">' + esc(Math.round(pct) + "%") + "</text></svg>";
  }
  // Donut. parts: [{v, tone, label}]
  function donut(parts, center) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0);
    var r = 40, c = 2 * Math.PI * r, off = 0;
    var segs = total ? parts.map(function (p) {
      var len = (p.v / total) * c;
      var s = '<circle r="' + r + '" cx="55" cy="55" fill="none" stroke="' + (C[p.tone] || p.tone) + '" stroke-width="16" stroke-dasharray="' + len.toFixed(2) + " " + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 55 55)"><title>' + esc(p.label + ": " + p.v) + "</title></circle>";
      off += len;
      return s;
    }).join("") : '<circle r="' + r + '" cx="55" cy="55" fill="none" stroke="' + C.grid + '" stroke-width="16"/>';
    return '<svg class="vz-donut" viewBox="0 0 110 110" role="img" aria-label="' + esc(center || "") + '">' + segs +
      '<text x="55" y="60" class="vz-dv">' + esc(center || "") + "</text></svg>";
  }
  function legend(parts) {
    return '<div class="vz-leg">' + parts.map(function (p) {
      return '<span><i style="background:' + (C[p.tone] || p.tone) + '"></i>' + esc(p.label) + (p.v != null ? " <b>" + esc(fmt(p.v)) + "</b>" : "") + "</span>";
    }).join("") + "</div>";
  }
  // Horizontal progress bar with optional marker (e.g. demand line).
  function pbar(pct, tone, label, right) {
    var p = Math.max(0, Math.min(100, pct));
    return '<div class="vz-pb"><div class="vz-pbl"><span>' + esc(label) + "</span><b>" + esc(right != null ? right : Math.round(pct) + "%") + "</b></div>" +
      '<div class="vz-pbt"><div style="width:' + p.toFixed(1) + "%;background:" + (C[tone] || tone) + '"></div></div></div>';
  }
  function stacked(parts) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1;
    return '<div class="vz-stk">' + parts.map(function (p) {
      return p.v ? '<div style="width:' + ((p.v / total) * 100).toFixed(1) + "%;background:" + (C[p.tone] || p.tone) + '" title="' + esc(p.label + ": " + p.v) + '"></div>' : "";
    }).join("") + "</div>";
  }
  function imgFor(code) {
    try { return code && root.SMK_INV_VISUAL && root.SMK_INV_VISUAL.imgFor ? root.SMK_INV_VISUAL.imgFor(code) : ""; } catch (e) { return ""; }
  }
  function card(title, sub, body, goTo, extraCls) {
    return '<section class="vz-card' + (extraCls ? " " + extraCls : "") + '">' +
      '<div class="vz-ch"><h3>' + esc(title) + "</h3>" + (goTo ? '<button type="button" class="vz-open"' + go(goTo) + ">" + esc(tx({ en: "Open", es: "Abrir", pt: "Abrir" })) + " &rsaquo;</button>" : "") + "</div>" +
      (sub ? '<p class="vz-sub">' + esc(sub) + "</p>" : "") + body + "</section>";
  }
  function stamp(extra) {
    return '<p class="vz-stamp"><span class="vz-op">' + esc(tx(W.oper)) + "</span> " + esc(tx(W.asOf)) + " " + esc(denverClock()) + (extra ? " · " + esc(extra) : "") + "</p>";
  }
  function banner() { return cloud() ? "" : '<div class="vz-banner">' + esc(tx(W.local)) + "</div>"; }

  // ---- panels ----------------------------------------------------------------
  function coverageChart(limit) {
    var cv = coverage();
    var rows = cv.rows.slice(0, limit || 10);
    if (!rows.length) return '<p class="vz-empty">' + esc(tx({ en: "No open retail orders due today or later.", es: "No hay ordenes retail abiertas desde hoy.", pt: "Nao ha pedidos de varejo abertos a partir de hoje." })) + "</p>";
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.need, r.oh); }).concat([1]));
    var html = rows.map(function (r) {
      var pct = r.need ? Math.min(999, (r.oh / r.need) * 100) : 100;
      var tone = pct >= 100 ? "ok" : (pct >= 50 ? "warn" : "bad");
      var img = imgFor(r.code);
      return '<div class="vz-cov"' + go("demand:makeplan") + ">" +
        (img ? '<img class="vz-cimg" alt="" loading="lazy" src="' + esc(img) + '">' : '<span class="vz-cimg vz-cimg0"></span>') +
        '<div class="vz-cmain"><div class="vz-cl"><b>' + esc(r.flavor) + "</b><span>" + esc(fmt(r.oh)) + " / " + esc(fmt(r.need)) + " " + esc(tx(W.bags)) + "</span></div>" +
        '<div class="vz-ct"><div class="vz-cbar" style="width:' + ((r.oh / max) * 100).toFixed(1) + "%;background:" + C[tone] + '"></div>' +
        '<div class="vz-cmark" style="left:' + ((r.need / max) * 100).toFixed(1) + '%" title="' + esc(tx({ en: "Open orders", es: "Ordenes abiertas", pt: "Pedidos abertos" })) + '"></div></div></div>' +
        '<span class="vz-cp vz-' + tone + 't">' + (pct >= 100 ? "✓" : Math.round(pct) + "%") + "</span></div>";
    }).join("");
    var more = cv.rows.length > rows.length ? '<p class="vz-sub">' + esc((cv.rows.length - rows.length) + " " + tx({ en: "more flavors on the Make Plan.", es: "sabores mas en el Plan.", pt: "sabores a mais no Plano." })) + "</p>" : "";
    var nob = cv.noBag && cv.noBag.length ? '<p class="vz-sub">' + esc(tx({ en: "Not a 4 oz bag item, not charted: ", es: "Sin bolsa de 4 oz, no se grafica: ", pt: "Sem saco de 4 oz, fora do grafico: " }) + cv.noBag.join(", ") + ".") + "</p>" : "";
    var unm = cv.unmapped ? '<p class="vz-sub">' + esc(fmt(cv.unmapped) + " " + tx({ en: "order bags have no flavor match yet (fix on the order board).", es: "bolsas de ordenes sin sabor (corregir en el tablero).", pt: "sacos de pedidos sem sabor (corrigir no painel)." })) + "</p>" : "";
    return legend([{ tone: "ok", label: tx({ en: "Covered", es: "Cubierto", pt: "Coberto" }) }, { tone: "warn", label: tx({ en: "Half or more", es: "Mitad o mas", pt: "Metade ou mais" }) }, { tone: "bad", label: tx({ en: "Short", es: "Falta", pt: "Falta" }) }, { tone: C.navy, label: tx({ en: "| = open orders", es: "| = ordenes abiertas", pt: "| = pedidos abertos" }) }]) + html + more + unm + nob;
  }
  function weeksChart() {
    var wk = demandByWeek(6);
    var data = wk.map(function (w, i) {
      return { label: i === 0 ? tx({ en: "This wk", es: "Esta sem", pt: "Esta sem" }) : dayLabel(w.from), sub: w.n ? w.n + " PO" : "", v: w.bags, tone: i === 0 ? "orange" : "info" };
    });
    if (!wk.some(function (w) { return w.bags > 0; })) return '<p class="vz-empty">' + esc(tx({ en: "No open orders due in the next 6 weeks.", es: "No hay ordenes en las proximas 6 semanas.", pt: "Nao ha pedidos nas proximas 6 semanas." })) + "</p>";
    return columns(data, { aria: "open order bags by week" });
  }
  function healthPanel(h) {
    var parts = [{ v: h.ok, tone: "ok", label: tx({ en: "OK", es: "Bien", pt: "Ok" }) }, { v: h.low, tone: "warn", label: tx({ en: "Low", es: "Bajo", pt: "Baixo" }) }, { v: h.out, tone: "bad", label: tx({ en: "Out", es: "Agotado", pt: "Esgotado" }) }];
    var total = h.ok + h.low + h.out;
    var pctOk = total ? Math.round((h.ok / total) * 100) : 0;
    return '<div class="vz-donutrow">' + donut(parts, pctOk + "%") + '<div>' + legend(parts) +
      '<p class="vz-sub">' + esc(tx({ en: "Items with a reorder point. OK means at or above it.", es: "Items con punto de reorden. Bien = igual o mas.", pt: "Itens com ponto de reposicao. Ok = igual ou acima." })) + "</p></div></div>";
  }
  function groupBars(h) {
    var names = { fin: { en: "Finished bags", es: "Bolsas terminadas", pt: "Sacos prontos" }, film: { en: "Film", es: "Pelicula", pt: "Filme" }, seas: { en: "Seasoning", es: "Sazon", pt: "Tempero" }, seed: { en: "Seeds", es: "Semillas", pt: "Sementes" }, pack: { en: "Boxes and supplies", es: "Cajas y suministros", pt: "Caixas e suprimentos" } };
    return ["fin", "film", "seas", "seed", "pack"].filter(function (k) { return h.groups[k]; }).map(function (k) {
      var g = h.groups[k];
      return '<div class="vz-gb"><div class="vz-pbl"><span>' + esc(tx(names[k])) + "</span><b>" +
        (g.out ? '<em class="vz-badt">' + g.out + " " + esc(tx({ en: "out", es: "agot.", pt: "esg." })) + "</em> " : "") +
        (g.low ? '<em class="vz-warnt">' + g.low + " " + esc(tx({ en: "low", es: "bajo", pt: "baixo" })) + "</em>" : "") +
        (!g.out && !g.low ? '<em class="vz-okt">' + esc(tx({ en: "all OK", es: "todo bien", pt: "tudo ok" })) + "</em>" : "") + "</b></div>" +
        stacked([{ v: g.ok, tone: "ok", label: "OK" }, { v: g.low, tone: "warn", label: "Low" }, { v: g.out, tone: "bad", label: "Out" }]) + "</div>";
    }).join("");
  }
  function productionPanel() {
    var d = pmacDaily(14);
    var todayV = d[d.length - 1].v;
    var prior = d.slice(0, -1).filter(function (x) { return x.v > 0; });
    var avg = prior.length ? prior.reduce(function (s, x) { return s + x.v; }, 0) / prior.length : 0;
    var pct = avg ? (todayV / avg) * 100 : 0;
    var tone = !avg ? "mute" : (pct >= 90 ? "ok" : (pct >= 50 ? "warn" : "bad"));
    if (!d.some(function (x) { return x.v > 0; })) {
      var pi = pmacInfo(14);
      return '<p class="vz-empty">' + esc(tx({ en: "No P-Mac bags logged in the last 14 days.", es: "No hay bolsas P-Mac registradas en 14 dias.", pt: "Nenhum saco P-Mac registrado em 14 dias." })) +
        (pi.latest ? " " + esc(tx({ en: "Latest entry", es: "Ultimo registro", pt: "Ultimo registro" })) + ": " + esc(pi.latest) + "." : "") + "</p>" +
        '<p class="vz-sub">' + esc(tx({ en: "Log bags on the P-Mac page and this chart fills in.", es: "Registre bolsas en la pagina P-Mac y la grafica se llena.", pt: "Registre sacos na pagina P-Mac e o grafico aparece." })) + "</p>";
    }
    var cols = columns(d.map(function (x, i) { return { label: i === d.length - 1 ? tx({ en: "Today", es: "Hoy", pt: "Hoje" }) : dayLabel(x.day), v: x.v, tone: i === d.length - 1 ? "orange" : "info" }; }), { h: 130, aria: "P-Mac bags per day" });
    return '<div class="vz-prodrow"><div class="vz-gw">' + gauge(pct, "today vs average", tone) +
      '<div class="vz-gcap"><b>' + esc(fmt(todayV)) + "</b> " + esc(tx(W.bags)) + "<br><span>" + esc(tx({ en: "vs 14-day avg", es: "vs prom. 14 dias", pt: "vs media 14 dias" })) + " " + esc(fmt(avg)) + "</span></div></div>" +
      '<div class="vz-gcols">' + cols + "</div></div>" +
      '<p class="vz-sub">' + esc(tx({ en: "P-Mac packages from pmac_history. Average counts only days with output. The daily build target is on the P-Mac page.", es: "Paquetes P-Mac de pmac_history. El promedio cuenta solo dias con produccion. La meta del dia esta en la pagina P-Mac.", pt: "Pacotes P-Mac de pmac_history. A media conta so dias com producao. A meta do dia esta na pagina P-Mac." })) + "</p>";
  }

  // Home > Big picture
  function dashboard() {
    styleOnce();
    var t = today();
    var h = stockHealth();
    var c = hubCounts();
    var fin = finishedByFlavor();
    var b4 = 0, b15 = 0;
    Object.keys(fin).forEach(function (k) { b4 += fin[k].b4; b15 += fin[k].b15; });
    var wk = demandByWeek(2);
    var next14 = wk[0].bags + wk[1].bags, next14po = {};
    openDemand().forEach(function (d) { var due = isoOf(d.due_date); if (due <= addDays(t, 13)) next14po[String(d.po || "")] = 1; });
    var ship = shippedDaily(14), recv = receivedDaily(14);
    var ship7 = ship.slice(-7).reduce(function (s, x) { return s + x.v; }, 0);
    var recv7 = recv.slice(-7).reduce(function (s, x) { return s + x.v; }, 0);
    var waitIn = num(c.onHold) + num(c.noCoa);
    var cov = coverage();
    var shortFl = cov.rows.filter(function (r) { return r.short > 0; }).length;
    var fresh = stockFreshness();

    var tiles = '<div class="vz-tiles">' +
      tile({ label: tx({ en: "Finished bags on hand", es: "Bolsas terminadas", pt: "Sacos prontos" }), value: short(b4 + b15), sub: "4 oz " + fmt(b4) + " · 1.5 oz " + fmt(b15), tone: "info", go: "inv" }) +
      tile({ label: tx({ en: "Out of stock", es: "Agotado", pt: "Esgotado" }), value: h.out, unit: tx({ en: "items", es: "items", pt: "itens" }), sub: h.low + " " + tx({ en: "low", es: "bajos", pt: "baixos" }), tone: h.out ? "bad" : (h.low ? "warn" : "ok"), go: "inv:alerts" }) +
      tile({ label: tx({ en: "Flavors short for orders", es: "Sabores que faltan", pt: "Sabores em falta" }), value: shortFl, sub: tx({ en: "of", es: "de", pt: "de" }) + " " + cov.rows.length + " " + tx({ en: "on open orders", es: "con ordenes", pt: "com pedidos" }), tone: shortFl ? "warn" : "ok", go: "demand:makeplan" }) +
      tile({ label: tx({ en: "Orders due in 14 days", es: "Ordenes en 14 dias", pt: "Pedidos em 14 dias" }), value: Object.keys(next14po).length, unit: "PO", sub: fmt(next14) + " " + tx(W.bags), tone: "info", go: "outb" }) +
      tile({ label: tx({ en: "Inbound on hold / no COA", es: "Entrada retenida / sin COA", pt: "Entrada retida / sem COA" }), value: waitIn, sub: num(c.putAway) + " " + tx({ en: "still in RECEIVING", es: "aun en RECEIVING", pt: "ainda em RECEIVING" }), tone: waitIn ? "bad" : (num(c.putAway) ? "warn" : "ok"), go: "inb" }) +
      tile({ label: tx({ en: "Loads shipped, last 7 days", es: "Cargas enviadas, 7 dias", pt: "Cargas enviadas, 7 dias" }), value: ship7, sub: fmt(parcelsToday()) + " " + tx({ en: "e-com parcels today", es: "paquetes e-com hoy", pt: "pacotes e-com hoje" }) + " · " + recv7 + " " + tx({ en: "received", es: "recibidas", pt: "recebidas" }), tone: "info", go: "outb:shiplog", spark: sparkline(ship.map(function (x) { return x.v; }), C.info) }) +
      "</div>";

    var grid1 = '<div class="vz-grid vz-g3">' +
      card(tx({ en: "Can we cover open orders? (4 oz bags)", es: "Cubrimos las ordenes? (bolsas 4 oz)", pt: "Cobrimos os pedidos? (sacos 4 oz)" }),
        tx({ en: "Bar = 4 oz bags on hand. Line = open retail order bags due today or later. Worst first.", es: "Barra = bolsas 4 oz en stock. Linea = bolsas en ordenes abiertas desde hoy. Peor primero.", pt: "Barra = sacos 4 oz em estoque. Linha = sacos em pedidos abertos a partir de hoje. Pior primeiro." }),
        coverageChart(10), "demand:makeplan", "vz-span2") +
      card(tx({ en: "Stock health", es: "Salud del inventario", pt: "Saude do estoque" }), "", healthPanel(h) + groupBars(h), "inv:alerts") +
      "</div>";
    var grid2 = '<div class="vz-grid vz-g3">' +
      card(tx({ en: "Open order bags by week", es: "Bolsas en ordenes por semana", pt: "Sacos em pedidos por semana" }), tx({ en: "Due today or later. Week starts today.", es: "Desde hoy. La semana empieza hoy.", pt: "A partir de hoje. A semana comeca hoje." }), weeksChart(), "outb") +
      card(tx({ en: "P-Mac: bags today", es: "P-Mac: bolsas hoy", pt: "P-Mac: sacos hoje" }), "", productionPanel(), "pmac") +
      card(tx({ en: "Deliveries and shipments", es: "Entregas y envios", pt: "Entregas e envios" }), tx(W.days14),
        '<div class="vz-mini"><span>' + esc(tx({ en: "Received (receiving log)", es: "Recibido (registro)", pt: "Recebido (registro)" })) + "</span>" + columns(recv.map(function (x) { return { label: dow(x.day), v: x.v, tone: "ok" }; }), { h: 90, aria: "deliveries per day" }) + "</div>" +
        '<div class="vz-mini"><span>' + esc(tx({ en: "Loads shipped (logged by the team, not ShipStation parcels)", es: "Cargas enviadas (registradas por el equipo, sin paquetes ShipStation)", pt: "Cargas enviadas (registradas pela equipe, sem pacotes ShipStation)" })) + "</span>" + columns(ship.map(function (x) { return { label: dow(x.day), v: x.v, tone: "info" }; }), { h: 90, aria: "shipments per day" }) + "</div>", "outb:shiplog") +
      "</div>";

    return '<div class="vz vz-dash" id="vz-dash">' +
      '<div class="vz-lead"><div><h2>' + esc(tx(W.glance)) + "</h2><p>" + esc(tx(W.glanceSub)) + "</p></div>" +
      stamp(fresh ? tx({ en: "last stock change", es: "ultimo cambio de stock", pt: "ultima mudanca de estoque" }) + " " + denverClock(new Date(fresh)) : "") + "</div>" +
      banner() + tiles + grid1 + grid2 + "</div>";
  }

  // Home > Today: small strip under the job buttons, picked by role.
  function homeStrip(roleId) {
    styleOnce();
    var c = hubCounts();
    var h = stockHealth();
    var T = {
      out: function () { return tile({ label: tx({ en: "Out of stock", es: "Agotado", pt: "Esgotado" }), value: h.out, sub: h.low + " " + tx({ en: "low", es: "bajos", pt: "baixos" }), tone: h.out ? "bad" : (h.low ? "warn" : "ok"), go: "inv:alerts" }); },
      recv: function () { return tile({ label: tx({ en: "In RECEIVING", es: "En RECEIVING", pt: "Em RECEIVING" }), value: num(c.putAway), sub: tx({ en: "lots to put away", es: "lotes por guardar", pt: "lotes para guardar" }), tone: num(c.putAway) ? "warn" : "ok", go: "inb:move" }); },
      hold: function () { return tile({ label: tx({ en: "On hold / no COA", es: "Retenido / sin COA", pt: "Retido / sem COA" }), value: num(c.onHold) + num(c.noCoa), tone: num(c.onHold) + num(c.noCoa) ? "bad" : "ok", go: "qa:trQa" }); },
      due: function () { return tile({ label: tx({ en: "Deliveries due", es: "Entregas por llegar", pt: "Entregas a chegar" }), value: num(c.dueIn), sub: tx({ en: "this week", es: "esta semana", pt: "esta semana" }), tone: num(c.dueIn) ? "info" : "ok", go: "purch:purchasing" }); },
      ship: function () { return tile({ label: tx({ en: "Ship in 2 days", es: "Salen en 2 dias", pt: "Saem em 2 dias" }), value: num(c.shipSoon), sub: num(c.toRelease) + " " + tx({ en: "trailers not released", es: "trailers sin liberar", pt: "trailers sem liberar" }), tone: num(c.toRelease) ? "warn" : "info", go: "outb" }); },
      pmac: function () {
        var d = pmacDaily(14), v = d[d.length - 1].v;
        return tile({ label: tx({ en: "P-Mac bags today", es: "Bolsas P-Mac hoy", pt: "Sacos P-Mac hoje" }), value: fmt(v), tone: v ? "ok" : "mute", go: "pmac", spark: sparkline(d.map(function (x) { return x.v; }), C.orange) });
      },
      short: function () { var cv = coverage(); var n = cv.rows.filter(function (r) { return r.short > 0; }).length; return tile({ label: tx({ en: "Flavors short for orders", es: "Sabores que faltan", pt: "Sabores em falta" }), value: n, tone: n ? "warn" : "ok", go: "demand:makeplan" }); }
    };
    var byRole = {
      floor: ["recv", "due", "ship", "out"], inventory: ["out", "recv", "hold", "due"], production: ["pmac", "short", "out"],
      quality: ["hold", "recv", "ship"], shipping: ["ship", "short", "out"], office: ["due", "ship", "short", "out"], manager: ["out", "short", "ship", "hold", "pmac"]
    };
    var keys = byRole[roleId] || [];
    if (!keys.length) return "";
    return '<section class="vz vz-strip"><div class="vz-ch"><h3>' + esc(tx(W.todayGlance)) + "</h3>" + stamp() + "</div>" +
      '<div class="vz-tiles vz-tiles-s">' + keys.map(function (k) { return T[k](); }).join("") + "</div></section>";
  }

  // Inbound hub: received per day, POs by expected week, where lots are now.
  function inbound(m) {
    styleOnce();
    m = m || {};
    var t = today();
    var recv = receivedDaily(14);
    var pos = m.pos || [];
    var wk = [];
    for (var i = 0; i < 6; i++) wk.push({ from: addDays(t, i * 7), to: addDays(t, i * 7 + 6), n: 0 });
    var late = 0, nodate = 0;
    pos.forEach(function (p) {
      if (!p.expect) { nodate++; return; }
      if (p.expect < t) { late++; return; }
      for (var i = 0; i < wk.length; i++) if (p.expect >= wk[i].from && p.expect <= wk[i].to) { wk[i].n++; return; }
    });
    var flow = [
      { v: (m.posSoon || 0) + (m.posLate || 0), tone: "info", label: tx({ en: "1 Due this week", es: "1 Llegan esta semana", pt: "1 Chegam esta semana" }), go: "purch:purchasing" },
      { v: (m.inRecv || []).length, tone: "warn", label: tx({ en: "2 In RECEIVING", es: "2 En RECEIVING", pt: "2 Em RECEIVING" }), go: "inb:move" },
      { v: (m.coaMissing || []).length, tone: "bad", label: tx({ en: "3 Missing COA", es: "3 Sin COA", pt: "3 Sem COA" }), go: "inb:coalib" },
      { v: (m.held || []).length, tone: "bad", label: tx({ en: "On hold", es: "Retenido", pt: "Retido" }), go: "inb:quarantine" }
    ];
    var flowHtml = '<div class="vz-tiles vz-tiles-s">' + flow.map(function (f) { return tile({ label: f.label, value: f.v, tone: f.v ? f.tone : "ok", go: f.go }); }).join("") + "</div>";
    return '<div class="vz vz-hub">' + flowHtml + '<div class="vz-grid vz-g2">' +
      card(tx({ en: "Deliveries received per day", es: "Entregas recibidas por dia", pt: "Entregas recebidas por dia" }), tx(W.days14) + " · " + tx({ en: "receiving log", es: "registro de recibo", pt: "registro de recebimento" }),
        columns(recv.map(function (x) { return { label: dow(x.day), sub: dayLabel(x.day), v: x.v, tone: x.day === t ? "orange" : "ok" }; }), { h: 130, aria: "deliveries per day" }), "inb:recvlog") +
      card(tx({ en: "Open supplier POs by expected week", es: "OC abiertas por semana esperada", pt: "OCs abertas por semana prevista" }),
        (late ? late + " " + tx({ en: "past expected date", es: "pasadas de fecha", pt: "passadas da data" }) + " · " : "") + (nodate ? nodate + " " + tx({ en: "with no date", es: "sin fecha", pt: "sem data" }) : ""),
        columns(wk.map(function (w, i) { return { label: i === 0 ? tx({ en: "This wk", es: "Esta sem", pt: "Esta sem" }) : dayLabel(w.from), v: w.n, tone: i === 0 ? "orange" : "info" }; }), { h: 130, aria: "POs by week" }), "purch:purchasing") +
      "</div>" + stamp() + "</div>";
  }

  // Outbound hub: open POs by ship day (today on), and how far each step got.
  function outbound(m) {
    styleOnce();
    m = m || {};
    var t = today();
    var rows = (m.rows || []).filter(function (r) { return !r.late; });
    var days = [];
    for (var i = 0; i < 14; i++) days.push({ day: addDays(t, i), v: 0 });
    var later = 0, nodate = 0;
    rows.forEach(function (r) {
      if (!r.due) { nodate++; return; }
      var idx = Math.round((Date.parse(r.due) - Date.parse(t)) / 86400000);
      if (idx >= 0 && idx < 14) days[idx].v++; else later++;
    });
    var n = rows.length || 0;
    var rel = rows.filter(function (r) { return r.release && r.release.result === "RELEASED"; }).length;
    var shipped = rows.filter(function (r) { return r.shipped; }).length;
    var docs = rows.filter(function (r) { return r.docs > 0; }).length;
    var steps = '<div class="vz-steps">' +
      pbar(n ? 100 : 0, "info", tx({ en: "1 Open retail POs", es: "1 OC retail abiertas", pt: "1 Pedidos varejo abertos" }), String(n)) +
      pbar(n ? (rel / n) * 100 : 0, rel === n && n ? "ok" : "warn", tx({ en: "3 Trailer released", es: "3 Trailer liberado", pt: "3 Trailer liberado" }), rel + " / " + n) +
      pbar(n ? (shipped / n) * 100 : 0, shipped === n && n ? "ok" : "info", tx({ en: "4 Shipment logged", es: "4 Envio registrado", pt: "4 Envio registrado" }), shipped + " / " + n) +
      pbar(n ? (docs / n) * 100 : 0, docs === n && n ? "ok" : "info", tx({ en: "5 Docs in the OS", es: "5 Docs en el OS", pt: "5 Docs no OS" }), docs + " / " + n) +
      "</div>";
    var ship = shippedDaily(14);
    return '<div class="vz vz-hub"><div class="vz-grid vz-g2">' +
      card(tx({ en: "Open retail POs by ship day", es: "OC retail por dia de salida", pt: "Pedidos varejo por dia de saida" }),
        tx({ en: "Next 14 days, today first.", es: "Proximos 14 dias, hoy primero.", pt: "Proximos 14 dias, hoje primeiro." }) + (later ? " " + later + " " + tx({ en: "later", es: "despues", pt: "depois" }) + "." : "") + (nodate ? " " + nodate + " " + tx({ en: "with no date", es: "sin fecha", pt: "sem data" }) + "." : ""),
        columns(days.map(function (d, i) { return { label: dow(d.day), sub: dayLabel(d.day), v: d.v, tone: i === 0 ? "orange" : (i <= 2 ? "warn" : "info") }; }), { h: 130, aria: "open POs by ship day" }), "outb:ordersRetail") +
      card(tx({ en: "How far each open PO got", es: "Que tan avanzada va cada OC", pt: "Quanto cada pedido avancou" }), "", steps +
        '<div class="vz-mini"><span>' + esc(tx({ en: "Loads shipped per day (team log, not parcels)", es: "Cargas por dia (registro del equipo)", pt: "Cargas por dia (registro da equipe)" }) + " · " + tx(W.days14)) + "</span>" + sparkline(ship.map(function (x) { return x.v; }), C.info) + "</div>", "outb:shiplog") +
      "</div>" + stamp() + "</div>";
  }

  // Inventory > On hand: stock health and finished bags by flavor.
  function inventory() {
    styleOnce();
    var h = stockHealth();
    var fin = finishedByFlavor();
    var rows = Object.keys(fin).map(function (k) { return fin[k]; }).filter(function (r) { return r.b4 + r.b15 > 0; })
      .sort(function (a, b) { return (b.b4 + b.b15) - (a.b4 + a.b15); }).slice(0, 12);
    var max = Math.max.apply(null, rows.map(function (r) { return r.b4 + r.b15; }).concat([1]));
    var bars = rows.length ? rows.map(function (r) {
      var img = imgFor(r.code4);
      return '<div class="vz-cov">' + (img ? '<img class="vz-cimg" alt="" loading="lazy" src="' + esc(img) + '">' : '<span class="vz-cimg vz-cimg0"></span>') +
        '<div class="vz-cmain"><div class="vz-cl"><b>' + esc(r.flavor) + "</b><span>" + esc(fmt(r.b4 + r.b15)) + "</span></div>" +
        '<div class="vz-ct"><div class="vz-cbar" style="width:' + ((r.b4 / max) * 100).toFixed(1) + "%;background:" + C.info + '"></div>' +
        '<div class="vz-cbar" style="left:' + ((r.b4 / max) * 100).toFixed(1) + "%;width:" + ((r.b15 / max) * 100).toFixed(1) + "%;background:" + C.orange + '"></div></div></div></div>';
    }).join("") : '<p class="vz-empty">' + esc(tx(W.noData)) + "</p>";
    return '<div class="vz vz-inv" id="vz-inv"><div class="vz-grid vz-g3">' +
      card(tx({ en: "Stock health", es: "Salud del inventario", pt: "Saude do estoque" }), "", healthPanel(h) + groupBars(h), "inv:alerts") +
      card(tx({ en: "Finished bags on hand by flavor (top 12)", es: "Bolsas terminadas por sabor (top 12)", pt: "Sacos prontos por sabor (top 12)" }), "",
        legend([{ tone: "info", label: "4 oz" }, { tone: "orange", label: "1.5 oz" }]) + bars, "", "vz-span2") +
      "</div>" + stamp() + "</div>";
  }

  // Production > Steps: P-Mac output and which flavors are short for orders.
  function production() {
    styleOnce();
    return '<div class="vz vz-prod"><div class="vz-grid vz-g2">' +
      card(tx({ en: "P-Mac: bags today", es: "P-Mac: bolsas hoy", pt: "P-Mac: sacos hoje" }), "", productionPanel(), "pmac") +
      card(tx({ en: "Can we cover open orders? (4 oz bags)", es: "Cubrimos las ordenes? (bolsas 4 oz)", pt: "Cobrimos os pedidos? (sacos 4 oz)" }),
        tx({ en: "Worst first. Due today or later.", es: "Peor primero. Desde hoy.", pt: "Pior primeiro. A partir de hoje." }), coverageChart(6), "demand:makeplan") +
      "</div>" + stamp() + "</div>";
  }

  // ---- style -----------------------------------------------------------------
  var CSS = [
    ".vz{display:flex;flex-direction:column;gap:12px;margin:0 0 12px}",
    ".vz-lead{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 16px}",
    ".vz-lead h2{margin:0 0 2px;font-size:20px;color:#04223B}.vz-lead p{margin:0;color:#374151;font-size:14px}",
    ".vz-stamp{margin:0;font-size:12px;color:#6B7280}.vz-op{display:inline-block;background:#EEF2F7;color:#04223B;border-radius:999px;padding:1px 8px;font-weight:700;font-size:11px}",
    ".vz-banner{background:#fff7e6;border:1px solid #f3c77a;border-radius:8px;padding:8px 12px;font-size:13px;color:#7a4b00}",
    ".vz-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}",
    ".vz-tiles-s{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}",
    ".vz-tile{border-radius:10px;padding:10px 12px;border:1px solid transparent;cursor:pointer;min-height:84px;display:flex;flex-direction:column;gap:2px;transition:transform .08s}",
    ".vz-tile:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(4,34,59,.12)}",
    ".vz-tl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.02em}",
    ".vz-tn{font-size:28px;font-weight:800;line-height:1.1}.vz-tn small{font-size:13px;font-weight:600}",
    ".vz-ts{font-size:12px}.vz-tsp{margin-top:auto}",
    ".vz-ok{background:#E8F5E9;border-color:#A5D6A7;color:#1B5E20}",
    ".vz-warn{background:#FFF4E0;border-color:#F5C26B;color:#7A4B00}",
    ".vz-bad{background:#FDECEA;border-color:#EF9A9A;color:#8E1B1B}",
    ".vz-info{background:#EAF2FB;border-color:#A9C7EA;color:#0E3C6E}",
    ".vz-mute{background:#F3F4F6;border-color:#D1D5DB;color:#374151}",
    ".vz-grid{display:grid;gap:12px}.vz-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.vz-g2{grid-template-columns:repeat(2,minmax(0,1fr))}",
    ".vz-span2{grid-column:span 2}",
    ".vz-card{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 14px;min-width:0}",
    ".vz-ch{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}",
    ".vz-ch h3{margin:0;font-size:15px;color:#04223B}",
    ".vz-open{background:none;border:1px solid #d7dde6;border-radius:999px;padding:2px 10px;font-size:12px;color:#1F5FA8;cursor:pointer}",
    ".vz-sub{margin:4px 0 8px;font-size:12px;color:#6B7280}.vz-empty{margin:8px 0;font-size:13px;color:#6B7280}",
    ".vz-spark{width:100%;height:28px;display:block}",
    ".vz-cols{width:100%;height:auto;display:block}.vz-sv{font-size:10px;fill:#374151;text-anchor:middle;font-weight:700}",
    ".vz-sx{font-size:10px;fill:#6B7280;text-anchor:middle}.vz-sx2{fill:#9AA5B1}",
    ".vz-gauge{width:150px;height:auto}.vz-gv{font-size:20px;font-weight:800;fill:#04223B;text-anchor:middle}",
    ".vz-donut{width:110px;height:110px;flex:none}.vz-dv{font-size:18px;font-weight:800;fill:#04223B;text-anchor:middle}",
    ".vz-donutrow{display:flex;gap:12px;align-items:center;margin:4px 0 8px}",
    ".vz-leg{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;color:#374151;margin:4px 0 8px}",
    ".vz-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}",
    ".vz-pb,.vz-gb{margin:6px 0}.vz-pbl{display:flex;justify-content:space-between;font-size:12px;color:#374151;margin-bottom:3px}",
    ".vz-pbl em{font-style:normal;font-weight:700;margin-left:6px}",
    ".vz-pbt,.vz-stk{height:10px;background:#EEF1F5;border-radius:6px;overflow:hidden;display:flex}",
    ".vz-pbt div{height:100%;border-radius:6px}.vz-stk div{height:100%}",
    ".vz-okt{color:#2E7D32}.vz-warnt{color:#B26A00}.vz-badt{color:#C62828}",
    ".vz-cov{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer}",
    ".vz-cimg{width:30px;height:30px;object-fit:contain;border-radius:6px;background:#F3F4F6;flex:none}",
    ".vz-cmain{flex:1;min-width:0}.vz-cl{display:flex;justify-content:space-between;gap:8px;font-size:12px}",
    ".vz-cl b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vz-cl span{color:#6B7280;white-space:nowrap}",
    ".vz-ct{position:relative;height:12px;background:#EEF1F5;border-radius:6px;margin-top:3px}",
    ".vz-cbar{position:absolute;top:0;left:0;height:100%;border-radius:6px}",
    ".vz-cmark{position:absolute;top:-3px;width:3px;height:18px;background:#04223B;border-radius:2px;margin-left:-1px}",
    ".vz-cp{font-size:12px;font-weight:800;min-width:38px;text-align:right}",
    ".vz-prodrow{display:flex;gap:10px;align-items:center}.vz-gw{text-align:center;flex:none}",
    ".vz-gcap{font-size:12px;color:#374151}.vz-gcap b{font-size:16px;color:#04223B}.vz-gcap span{color:#6B7280}",
    ".vz-gcols{flex:1;min-width:0}",
    ".vz-mini{margin:4px 0}.vz-mini>span{display:block;font-size:12px;color:#374151;font-weight:600}",
    ".df-detail{margin:6px 0 8px}",
    "@media(min-width:1200px){.df-board.df-board-viz{height:auto!important;max-height:none!important;grid-template-rows:auto auto auto}.df-board.df-board-viz>.dept-section{max-height:560px}}",
    ".vz-strip{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:10px 12px;margin-top:12px}",
    "@media(max-width:1000px){.vz-g3{grid-template-columns:1fr 1fr}.vz-span2{grid-column:span 2}}",
    "@media(max-width:700px){.vz-g3,.vz-g2{grid-template-columns:1fr}.vz-span2{grid-column:auto}.vz-prodrow{flex-direction:column}}"
  ].join("\n");
  function styleOnce() {
    if (!doc || $("vz-style")) return;
    var s = doc.createElement("style");
    s.id = "vz-style";
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  // Keyboard: Enter or Space on a tile acts like a click.
  if (doc && doc.addEventListener) {
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target && e.target.closest ? e.target.closest(".vz [data-smk-go]") : null;
      if (t && t.tagName !== "BUTTON") { e.preventDefault(); t.click(); }
    });
  }

  root.SMK_VIZ = {
    dashboard: dashboard, homeStrip: homeStrip, production: production, inbound: inbound, outbound: outbound, inventory: inventory,
    // pure helpers, exported for scripts/check-smk-viz.js
    _h: { isoOf: isoOf, addDays: addDays, sparkline: sparkline, columns: columns, gauge: gauge, donut: donut, pbar: pbar, coverage: coverage, openDemand: openDemand, demandByWeek: demandByWeek, stockHealth: stockHealth, perDay: perDay, today: today, shippedDaily: shippedDaily, parcelsToday: parcelsToday }
  };
})(typeof window !== "undefined" ? window : this);

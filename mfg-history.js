/* ============================================================================
   Smackin' OS - Production History  (mfg-history.js)
   Surfaces Allen's loaded history: pmac_history (per-run P-Mac packaging) and
   mixing_history (per-run Mixing). Read-only. Adds a "Production History" item
   to the Manufacturing (Mixing) nav group and renders a dashboard:
     - summary cards (totals, date range, days)
     - P-Mac / Mixing toggle
     - monthly volume bars
     - top flavors, top operators, and recent runs
   Self-contained, no app.js edit. Loaded after app.js.
   ==========================================================================*/
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null, loaded = false, loading = false;
  var PM = [], MX = [];           // raw rows
  var dept = "pmac";              // or "mixing"

  function isCloud() { return !!(window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY); }
  function client() { if (!sb && isCloud()) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; } } return sb; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

  // ---- load (paginated; tables exceed the 1000-row default) --------------
  function fetchAll(table, cols) {
    var c = client(); if (!c) return Promise.resolve([]);
    var all = [], step = 1000;
    function page(from) {
      return c.from(table).select(cols).order("run_date", { ascending: true }).range(from, from + step - 1)
        .then(function (r) {
          var d = (r && r.data) ? r.data : [];
          all = all.concat(d);
          if (d.length === step) return page(from + step);
          return all;
        });
    }
    return page(0).catch(function () { return all; });
  }
  function load() {
    if (loaded || loading) return Promise.resolve();
    loading = true;
    return Promise.all([
      fetchAll("pmac_history", "run_date,bag_size,flavor_code,flavor_name,operator,box_count,total_pkgs"),
      fetchAll("mixing_history", "run_date,flavor_code,flavor_name,operator,machine,total_bins")
    ]).then(function (res) { PM = res[0] || []; MX = res[1] || []; loaded = true; loading = false; });
  }

  // ---- aggregation -------------------------------------------------------
  function month(d) { return String(d || "").slice(0, 7); }
  function agg(rows, valKey, labelFn) {
    var m = {};
    rows.forEach(function (r) { var k = labelFn(r); if (!k) return; m[k] = (m[k] || 0) + num(r[valKey]); });
    return Object.keys(m).map(function (k) { return { k: k, v: m[k] }; }).sort(function (a, b) { return b.v - a.v; });
  }
  function byMonth(rows, valKey) {
    var m = {};
    rows.forEach(function (r) { var k = month(r.run_date); if (!k) return; m[k] = (m[k] || 0) + num(r[valKey]); });
    return Object.keys(m).sort().map(function (k) { return { k: k, v: m[k] }; });
  }
  function distinctDays(rows) { var s = {}; rows.forEach(function (r) { if (r.run_date) s[r.run_date] = 1; }); return Object.keys(s).length; }
  function total(rows, valKey) { var t = 0; rows.forEach(function (r) { t += num(r[valKey]); }); return t; }
  function dateRange(rows) {
    var mn = null, mx = null;
    rows.forEach(function (r) { var d = r.run_date; if (!d) return; if (!mn || d < mn) mn = d; if (!mx || d > mx) mx = d; });
    return { min: mn, max: mx };
  }

  // ---- render ------------------------------------------------------------
  function monthName(ym) {
    var p = ym.split("-"); if (p.length < 2) return ym;
    var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(+p[1]) - 1] || p[1];
    return mo + " " + p[0].slice(2);
  }
  function barChart(series, unit) {
    if (!series.length) return '<p class="muted">No data.</p>';
    var max = Math.max.apply(null, series.map(function (s) { return s.v; })) || 1;
    return '<div class="mfgbars">' + series.map(function (s) {
      var pct = Math.max(2, Math.round(s.v / max * 100));
      return '<div class="mfgbar-row"><div class="mfgbar-lbl">' + esc(monthName(s.k)) + '</div>' +
        '<div class="mfgbar-track"><div class="mfgbar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="mfgbar-val">' + fmt(s.v) + '</div></div>';
    }).join("") + '</div><p class="hint" style="margin-top:6px">' + unit + ' per month</p>';
  }
  function topTable(series, head, unit, limit) {
    var rows = series.slice(0, limit || 12);
    if (!rows.length) return '<p class="muted">No data.</p>';
    return '<div class="tblwrap"><table class="sortable"><thead><tr><th>' + esc(head) + '</th><th class="right">' + esc(unit) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.k) + '</td><td class="right">' + fmt(r.v) + '</td></tr>'; }).join("") +
      '</tbody></table></div>';
  }
  function recentTable() {
    if (dept === "pmac") {
      var rows = PM.slice(-120).reverse();
      return '<div class="tblwrap"><table class="sortable"><thead><tr><th>Date</th><th>Operator</th><th>Size</th><th>Flavor</th><th class="right">Boxes</th><th class="right">Packages</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var f = (r.flavor_code ? r.flavor_code + " - " : "") + (r.flavor_name || "");
          return '<tr><td class="sm">' + esc(r.run_date) + '</td><td class="sm">' + esc(r.operator || "") + '</td><td class="sm">' + esc(r.bag_size || "") + '</td><td>' + esc(f) + '</td><td class="right">' + fmt(num(r.box_count)) + '</td><td class="right">' + fmt(num(r.total_pkgs)) + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    var mrows = MX.slice(-120).reverse();
    return '<div class="tblwrap"><table class="sortable"><thead><tr><th>Date</th><th>Operator</th><th>Machine</th><th>Flavor</th><th class="right">Bins</th></tr></thead><tbody>' +
      mrows.map(function (r) {
        var f = (r.flavor_code ? r.flavor_code + " - " : "") + (r.flavor_name || "");
        return '<tr><td class="sm">' + esc(r.run_date) + '</td><td class="sm">' + esc(r.operator || "") + '</td><td class="sm">' + esc(r.machine || "") + '</td><td>' + esc(f) + '</td><td class="right">' + fmt(num(r.total_bins)) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }

  function styleOnce() {
    if ($("mfg-hist-style")) return;
    var s = document.createElement("style"); s.id = "mfg-hist-style";
    s.textContent = [
      ".mfgcards{display:flex;flex-wrap:wrap;gap:12px;margin:6px 0 4px}",
      ".mfgcard{flex:1;min-width:150px;background:#f5f7fb;border:1px solid #e3e9f2;border-radius:12px;padding:12px 14px}",
      ".mfgcard .n{font-size:24px;font-weight:800;color:#1F3864}.mfgcard .l{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}",
      ".mfgseg{display:inline-flex;background:#eef2f7;border-radius:9px;padding:3px;margin:2px 0 10px}",
      ".mfgseg button{border:0;background:transparent;padding:7px 16px;border-radius:6px;font-weight:700;font-size:13px;color:#64748b;cursor:pointer;font-family:inherit}",
      ".mfgseg button.on{background:#fff;color:#1F3864;box-shadow:0 1px 3px rgba(0,0,0,.12)}",
      ".mfgbars{display:flex;flex-direction:column;gap:5px;margin-top:6px}",
      ".mfgbar-row{display:flex;align-items:center;gap:8px}",
      ".mfgbar-lbl{width:52px;font-size:11px;color:#6b7280;text-align:right}",
      ".mfgbar-track{flex:1;background:#eef2f7;border-radius:5px;height:16px;overflow:hidden}",
      ".mfgbar-fill{height:100%;background:linear-gradient(90deg,#284a86,#1F3864);border-radius:5px}",
      ".mfgbar-val{width:64px;font-size:12px;font-weight:600;color:#334155;text-align:right}",
      ".mfggrid{display:flex;flex-wrap:wrap;gap:16px}.mfggrid>div{flex:1;min-width:260px}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    if (!loaded) {
      host.innerHTML = '<div class="card"><h2>Production History</h2><p class="muted">Loading 15 months of Mixing &amp; P-Mac history…</p></div>';
      load().then(function () { if ($("mfg-hist-active")) render(); });
      // mark active so the load callback knows this view is still showing
      host.setAttribute("data-mfg", "1");
      var flag = document.createElement("span"); flag.id = "mfg-hist-active"; flag.style.display = "none"; host.appendChild(flag);
      return;
    }
    var rows = dept === "pmac" ? PM : MX;
    var valKey = dept === "pmac" ? "total_pkgs" : "total_bins";
    var unit = dept === "pmac" ? "Packages" : "Bins";
    var rng = dateRange(rows);
    var tot = total(rows, valKey);
    var days = distinctDays(rows);
    var perDay = days ? tot / days : 0;

    var html = '<div class="card"><h2>Production History</h2>' +
      '<p class="hint">Allen\'s Mixing &amp; P-Mac history, loaded from the production trackers. ' + fmt(PM.length) + ' P-Mac runs and ' + fmt(MX.length) + ' Mixing runs on record.</p>' +
      '<div class="mfgseg">' +
      '<button class="' + (dept === "pmac" ? "on" : "") + '" onclick="MFGHIST.setDept(\'pmac\')">P-Mac (packaging)</button>' +
      '<button class="' + (dept === "mixing" ? "on" : "") + '" onclick="MFGHIST.setDept(\'mixing\')">Mixing</button>' +
      '</div>' +
      '<div class="mfgcards">' +
      '<div class="mfgcard"><div class="n">' + fmt(tot) + '</div><div class="l">Total ' + unit + '</div></div>' +
      '<div class="mfgcard"><div class="n">' + fmt(perDay) + '</div><div class="l">Avg ' + unit + '/day</div></div>' +
      '<div class="mfgcard"><div class="n">' + fmt(days) + '</div><div class="l">Production days</div></div>' +
      '<div class="mfgcard"><div class="n">' + fmt(rows.length) + '</div><div class="l">Runs logged</div></div>' +
      '</div>' +
      '<p class="hint">' + (rng.min || "?") + ' → ' + (rng.max || "?") + '</p>' +
      '</div>' +
      '<div class="card"><h2 class="sub2">' + unit + ' by month</h2>' + barChart(byMonth(rows, valKey), unit) + '</div>' +
      '<div class="mfggrid">' +
      '<div class="card"><h2 class="sub2">Top flavors</h2>' + topTable(agg(rows, valKey, function (r) { return (r.flavor_code ? r.flavor_code + " - " : "") + (r.flavor_name || ""); }), "Flavor", unit, 15) + '</div>' +
      '<div class="card"><h2 class="sub2">By operator</h2>' + topTable(agg(rows, valKey, function (r) { return r.operator || ""; }), "Operator", unit, 15) + '</div>' +
      '</div>' +
      '<div class="card"><h2 class="sub2">Recent runs</h2>' + recentTable() + '</div>';

    host.innerHTML = html;
    host.setAttribute("data-mfg", "1");
    var flag = document.createElement("span"); flag.id = "mfg-hist-active"; flag.style.display = "none"; host.appendChild(flag);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }

  window.MFGHIST = {
    open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); markActiveNav(); render(); },
    setDept: function (d) { dept = d; render(); }
  };

  // ---- nav injection (no app.js change) ---------------------------------
  function markActiveNav() {
    try {
      var nav = $("nav"); if (!nav) return;
      nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
      var mine = $("mfg-hist-nav"); if (mine) mine.classList.add("active");
    } catch (e) {}
  }
  function injectNav() {
    var nav = $("nav"); if (!nav) return;
    if ($("mfg-hist-nav")) return;
    // place it right after the P-Mac Log Output ("pmacout") item, inside the Manufacturing group
    var anchor = null, items = nav.querySelectorAll("[onclick]");
    for (var i = 0; i < items.length; i++) { var oc = items[i].getAttribute("onclick") || ""; if (oc.indexOf("pmacout") >= 0) { anchor = items[i]; break; } }
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "mfg-hist-nav";
    btn.setAttribute("onclick", "MFGHIST.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="history"></i><span>Production History</span>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }

  try {
    var mo = new MutationObserver(function () { injectNav(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); });
  else setTimeout(injectNav, 400);
})();

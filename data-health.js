/* ============================================================================
   Smackin' OS - Data Health  (data-health.js)
   Read-only "is anything stuck or stale?" check. Adds a "Data Health" nav item.
   For each key data source it shows how long since it last updated and flags
   anything that's gone quiet (green / amber / red), plus a few exception checks
   (stuck open orders, past-due demand still open). Nothing is changed here; it
   just surfaces exceptions so old data doesn't sit unnoticed.
   Self-contained, no app.js edit.
   ==========================================================================*/
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null;
  function client() { if (!sb && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) {} } return sb; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // sources: freshness column + expected cadence (warn/bad in days)
  var SOURCES = [
    { t: "stock", col: "updated_at", label: "Inventory (stock counts)", warn: 4, bad: 9 },
    { t: "demand_lines", col: "created_at", label: "Demand imports", warn: 12, bad: 25 },
    { t: "orders", col: "created_at", label: "Orders", warn: 4, bad: 9 },
    { t: "pmac_history", col: "run_date", label: "P-Mac production", warn: 5, bad: 12 },
    { t: "mixing_history", col: "run_date", label: "Mixing production", warn: 5, bad: 12 },
    { t: "production_output", col: "created_at", label: "Daily production entry", warn: 6, bad: 14 },
    { t: "shipping_log", col: "created_at", label: "Shipping log (samples/one-offs)", warn: 60, bad: 120 },
    { t: "receiving_log", col: "created_at", label: "Receiving log", warn: 14, bad: 30 },
    { t: "supplier_pos", col: "created_at", label: "Supplier POs", warn: 30, bad: 60 },
    { t: "launch_pipeline", col: "updated_at", label: "Launch pipeline", warn: 45, bad: 90 },
    { t: "machine_live", col: "updated_at", label: "Live machine feed", warn: 3, bad: 14 }
  ];

  function daysAgo(ts) {
    if (!ts) return null;
    var d = new Date(ts); if (isNaN(d)) { var m = String(ts).match(/(\d{4})-(\d{2})-(\d{2})/); if (m) d = new Date(+m[1], +m[2] - 1, +m[3]); }
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function dueMs(s) { var m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]).getTime(); }

  function styleOnce() {
    if ($("dh-style")) return;
    var s = document.createElement("style"); s.id = "dh-style";
    s.textContent = [
      ".dh-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:middle}",
      ".dh-green{background:#16a34a}.dh-amber{background:#e39412}.dh-red{background:#b52024}.dh-grey{background:#9ca3af}",
      ".dh-pill{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700}",
      ".dh-pill.green{background:#dcfce7;color:#166534}.dh-pill.amber{background:#fef3c7;color:#92400e}.dh-pill.red{background:#fee2e2;color:#991b1b}.dh-pill.grey{background:#f1f5f9;color:#64748b}",
      "#dh-exc .ex{padding:11px 14px;border-radius:10px;margin-top:8px;font-size:13.5px}",
      "#dh-exc .ex.warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}",
      "#dh-exc .ex.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function statusOf(days, src, count) {
    if (count === 0) return { cls: "grey", txt: "no data yet" };
    if (days == null) return { cls: "grey", txt: "unknown" };
    if (days >= src.bad) return { cls: "red", txt: days + "d ago" };
    if (days >= src.warn) return { cls: "amber", txt: days + "d ago" };
    return { cls: "green", txt: days === 0 ? "today" : days + "d ago" };
  }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    host.innerHTML = '<div class="card"><h2>Data Health</h2><p class="muted" id="dh-loading">Checking every data source…</p></div>';
    var c = client(); if (!c) { $("dh-loading").textContent = "Not connected."; return; }

    var jobs = SOURCES.map(function (src) {
      return Promise.all([
        c.from(src.t).select(src.col).order(src.col, { ascending: false }).limit(1),
        c.from(src.t).select("*", { count: "exact", head: true })
      ]).then(function (r) {
        var latest = (r[0] && r[0].data && r[0].data[0]) ? r[0].data[0][src.col] : null;
        var count = (r[1] && r[1].count) || 0;
        return { src: src, latest: latest, count: count, days: daysAgo(latest) };
      }).catch(function () { return { src: src, latest: null, count: 0, days: null }; });
    });

    // exception checks
    var excOrders = c.from("orders").select("id,status,ship_date,created_at").neq("status", "Complete").is("ship_date", null)
      .then(function (r) { var d = (r && r.data) || []; var cut = Date.now() - 30 * 86400000; return d.filter(function (o) { var t = new Date(o.created_at).getTime(); return !isNaN(t) && t < cut; }).length; }).catch(function () { return null; });
    var excDemand = c.from("demand_lines").select("due_date,status").eq("status", "Open")
      .then(function (r) { var d = (r && r.data) || []; var now = Date.now(); return d.filter(function (x) { var due = dueMs(x.due_date); return due != null && (now - due) > 60 * 86400000; }).length; }).catch(function () { return null; });

    Promise.all([Promise.all(jobs), excOrders, excDemand]).then(function (all) {
      var rows = all[0], stuckOrders = all[1], oldDemand = all[2];
      var body = rows.map(function (x) {
        var st = statusOf(x.days, x.src, x.count);
        return '<tr><td><span class="dh-dot dh-' + st.cls + '"></span>' + esc(x.src.label) + '</td>' +
          '<td class="right sm">' + x.count.toLocaleString("en-US") + '</td>' +
          '<td class="sm">' + esc(x.latest ? String(x.latest).slice(0, 10) : "—") + '</td>' +
          '<td><span class="dh-pill ' + st.cls + '">' + st.txt + '</span></td></tr>';
      }).join("");
      var reds = rows.filter(function (x) { return statusOf(x.days, x.src, x.count).cls === "red"; }).length;
      var ambers = rows.filter(function (x) { return statusOf(x.days, x.src, x.count).cls === "amber"; }).length;

      var summary = reds ? '<span class="dh-pill red">' + reds + ' stale</span> ' : '';
      summary += ambers ? '<span class="dh-pill amber">' + ambers + ' aging</span> ' : '';
      if (!reds && !ambers) summary = '<span class="dh-pill green">All sources current</span>';

      var exc = '';
      exc += (stuckOrders == null) ? '' : (stuckOrders > 0
        ? '<div class="ex warn"><b>' + stuckOrders + '</b> open order(s) are more than 30 days old with no ship date &mdash; likely stuck. Check the Orders board.</div>'
        : '<div class="ex ok">No stuck open orders (all recent open orders have activity).</div>');
      exc += (oldDemand == null) ? '' : (oldDemand > 0
        ? '<div class="ex warn"><b>' + oldDemand + '</b> demand line(s) are still Open but more than 60 days past due &mdash; likely already shipped or dead.</div>'
        : '<div class="ex ok">No long-past-due demand lingering as Open.</div>');

      host.innerHTML =
        '<div class="card"><h2>Data Health</h2>' +
        '<p class="hint">How current each data source is, and whether anything old is stuck. Green = fresh, amber = aging, red = hasn\'t updated in a while. Read-only &mdash; nothing here changes your data.</p>' +
        '<p style="margin:6px 0 12px">' + summary + '</p>' +
        '<div class="tblwrap"><table class="sortable"><thead><tr><th>Data source</th><th class="right">Records</th><th>Last update</th><th>Freshness</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        '</div>' +
        '<div class="card"><h2 class="sub2">Exceptions</h2><div id="dh-exc">' + (exc || '<p class="muted">No exception checks available.</p>') + '</div></div>';
    });
  }

  window.DATAHEALTH = { open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); markActive(); render(); } };

  function markActive() { try { var nav = $("nav"); if (!nav) return; nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); }); var m = $("dh-nav"); if (m) m.classList.add("active"); } catch (e) {} }
  function injectNav() {
    var nav = $("nav"); if (!nav || $("dh-nav")) return;
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "dh-nav";
    btn.setAttribute("onclick", "DATAHEALTH.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="activity"></i><span>Data Health</span>';
    nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  try { var mo = new MutationObserver(function () { injectNav(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

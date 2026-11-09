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
  function isTestRow(row) {
    return String(row && (row.status || row.entered_by) || "").toLowerCase() === "test" || String(row && row.batch_id || "") === "SPS-TEST" || String(row && row.batch_label || "").toLowerCase().indexOf("testout") >= 0;
  }
  function poGroup(row) { return String(row && (row.partner || "Unknown")) + "|" + String(row && (row.po || "")); }
  function stuckSummary(rows, today) {
    var groups = {};
    (rows || []).forEach(function (row) {
      if (isTestRow(row) || String(row.status || "Open") !== "Open" || !row.po) return;
      var key = poGroup(row);
      if (!groups[key]) groups[key] = { po: row.po, lines: 0, pastDue: false };
      groups[key].lines++;
      var due = dueMs(row.due_date);
      if (due != null && due < today) groups[key].pastDue = true;
    });
    var list = Object.keys(groups).map(function (key) { return groups[key]; }).filter(function (g) { return g.pastDue; });
    return { pos: list.length, lines: list.reduce(function (sum, g) { return sum + g.lines; }, 0) };
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // sources: freshness column + expected cadence (warn/bad in days)
  var SOURCES = [
    { t: "stock", col: "updated_at", label: "Inventory (stock counts)", warn: 4, bad: 9 },
    { t: "demand_lines", col: "created_at", label: "Demand imports", warn: 12, bad: 25 },
    { t: "orders", col: "created_at", label: "Orders", warn: 4, bad: 9 },
    { t: "pmac_history", col: "run_date", label: "P-Mac production", warn: 5, bad: 12, alt: { t: "pmac_log", col: "log_date" } },
    { t: "mixing_history", col: "run_date", label: "Mixing production", warn: 5, bad: 12 },
    { t: "shipping_log", col: "ship_date", label: "Shipping business dates", warn: 30, bad: 45, business: true },
    { t: "receiving_log", col: "created_at", label: "Receiving log", warn: 14, bad: 30 },
    { t: "supplier_pos", col: "created_at", label: "Supplier POs", warn: 30, bad: 60 },
    { t: "launch_pipeline", col: "updated_at", label: "Launch pipeline", warn: 45, bad: 90 },
    { t: "trace_events", col: "created_at", label: "Trace events", warn: 14, bad: 30 }
  ];

  function daysAgo(ts) {
    if (!ts) return null;
    var d = new Date(ts); if (isNaN(d)) { var m = String(ts).match(/(\d{4})-(\d{2})-(\d{2})/); if (m) d = new Date(+m[1], +m[2] - 1, +m[3]); }
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function dueMs(s) { var m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[1] - 1, +m[2]).getTime(); }


  var LOOKBACK_DAYS = 30;
  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad2(n) {
    n = String(n);
    return n.length < 2 ? "0" + n : n;
  }
  function addDays(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + Number(n || 0)));
    return dt.getUTCFullYear() + "-" + pad2(dt.getUTCMonth() + 1) + "-" + pad2(dt.getUTCDate());
  }
  function denverStamp(now) {
    now = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    var parts = {};
    fmt.formatToParts(now).forEach(function (part) { parts[part.type] = part.value; });
    return {
      date: parts.year + "-" + parts.month + "-" + parts.day,
      hour: parseInt(parts.hour, 10),
      minute: parseInt(parts.minute, 10)
    };
  }
  function prettyPmacDate(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return String(iso || "");
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return DAY_NAMES[dt.getUTCDay()] + " " + MONTH_NAMES[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear();
  }
  function asDateMap(src) {
    var out = {};
    if (!src) return out;
    if (Object.prototype.toString.call(src) === "[object Array]") {
      src.forEach(function (d) {
        var k = String(d || "").slice(0, 10);
        if (k) out[k] = 1;
      });
      return out;
    }
    Object.keys(src).forEach(function (k) {
      if (src[k]) out[String(k).slice(0, 10)] = 1;
    });
    return out;
  }
  function isWeekday(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return false;
    var dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    return dow >= 1 && dow <= 5;
  }
  function pastNextDayDeadline(now, iso) {
    var next = addDays(iso, 1);
    var stamp = denverStamp(now);
    if (!next || !stamp.date) return false;
    if (stamp.date > next) return true;
    if (stamp.date < next) return false;
    return stamp.hour > 15 || (stamp.hour === 15 && stamp.minute >= 0);
  }
  function missingPmacDays(opts) {
    opts = opts || {};
    var now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
    var today = denverStamp(now).date;
    var start = opts.start || addDays(today, -LOOKBACK_DAYS);
    var present = asDateMap(opts.present);
    var holidays = asDateMap(opts.holidays);
    var out = [];
    var cursor = start;
    var guard = 0;
    while (cursor && cursor <= today && guard < 400) {
      guard++;
      if (isWeekday(cursor) && !present[cursor] && !holidays[cursor] && pastNextDayDeadline(now, cursor)) out.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return out;
  }
  function loadMissingPmac(c) {
    var now = new Date();
    var start = addDays(denverStamp(now).date, -LOOKBACK_DAYS);
    return Promise.all([
      c.from("pmac_history").select("run_date").gte("run_date", start).limit(5000),
      c.from("time_off_holidays").select("holiday_date").gte("holiday_date", start).limit(200)
    ]).then(function (rs) {
      if (rs[0] && rs[0].error) return null;
      var present = {};
      ((rs[0] && rs[0].data) || []).forEach(function (r) {
        var d = r && r.run_date ? String(r.run_date).slice(0, 10) : "";
        if (d) present[d] = 1;
      });
      var holidays = {};
      ((rs[1] && !rs[1].error && rs[1].data) || []).forEach(function (r) {
        var d = r && r.holiday_date ? String(r.holiday_date).slice(0, 10) : "";
        if (d) holidays[d] = 1;
      });
      return missingPmacDays({ present: present, holidays: holidays, now: now, start: start });
    }).catch(function () { return null; });
  }

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
      "#dh-exc .ex.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}",
      "#dh-exc .ex.bad{background:#fee2e2;border:1px solid #fecaca;color:#991b1b}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function statusOf(days, src, count) {
    if (count == null) return { cls: "red", txt: "could not read" };
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

    function probe(t, col) {
      return Promise.all([
        c.from(t).select(col).order(col, { ascending: false }).limit(1),
        c.from(t).select("*", { count: "exact", head: true })
      ]).then(function (r) {
        var err = (r[0] && r[0].error) || (r[1] && r[1].error);
        if (err) return { latest: null, count: null, err: err.message || "read failed" };
        return { latest: (r[0] && r[0].data && r[0].data[0]) ? r[0].data[0][col] : null, count: (r[1] && r[1].count) || 0 };
      }).catch(function (e) { return { latest: null, count: null, err: (e && e.message) || "read failed" }; });
    }
    // A source with `alt` (e.g. P-Mac: uploaded pmac_history + digital pmac_log) is the union:
    // newest date of either, combined record count (log rows may overlap uploads; count is approximate).
    var jobs = SOURCES.map(function (src) {
      return Promise.all([probe(src.t, src.col), src.alt ? probe(src.alt.t, src.alt.col) : Promise.resolve(null)]).then(function (p) {
        var a = p[0], b = p[1], latest = a.latest;
        if (a.count == null && (!b || b.count == null)) return { src: src, latest: null, count: null, days: null };
        var count = (a.count || 0) + ((b && b.count) || 0);
        if (b) { var bl = b.latest ? String(b.latest).slice(0, 10) : null; if (bl && (!latest || bl > String(latest).slice(0, 10))) latest = bl; }
        return { src: src, latest: latest, count: count, days: daysAgo(latest) };
      }).catch(function () { return { src: src, latest: null, count: 0, days: null }; });
    });

    // exception checks
    var excOrders = c.from("orders").select("id,status,ship_date,created_at,entered_by").neq("status", "Complete").neq("status", "Test").is("ship_date", null)
      .then(function (r) { var d = (r && r.data) || []; var cut = Date.now() - 30 * 86400000; return d.filter(function (o) { var t = new Date(o.created_at).getTime(); return !isTestRow(o) && !isNaN(t) && t < cut; }).length; }).catch(function () { return null; });
    var excDemand = c.from("demand_lines").select("due_date,status,batch_id,batch_label,partner,po").eq("status", "Open").limit(10000)
      .then(function (r) { var midnight = new Date(); midnight.setHours(0,0,0,0); return stuckSummary((r && r.data) || [], midnight.getTime()); }).catch(function () { return null; });
    var excPmac = loadMissingPmac(c);

    Promise.all([Promise.all(jobs), excOrders, excDemand, excPmac]).then(function (all) {
      var rows = all[0], stuckOrders = all[1], oldDemand = all[2], missingPmac = all[3];
      var body = rows.map(function (x) {
        var st = statusOf(x.days, x.src, x.count);
        return '<tr><td><span class="dh-dot dh-' + st.cls + '"></span>' + esc(x.src.label) + '</td>' +
          '<td class="right sm">' + x.count.toLocaleString("en-US") + '</td>' +
          '<td class="sm">' + esc(x.latest ? String(x.latest).slice(0, 10) : "-") + '</td>' +
          '<td><span class="dh-pill ' + st.cls + '">' + st.txt + '</span></td></tr>';
      }).join("");
      var reds = rows.filter(function (x) { return statusOf(x.days, x.src, x.count).cls === "red"; }).length;
      var ambers = rows.filter(function (x) { return statusOf(x.days, x.src, x.count).cls === "amber"; }).length;

      var summary = reds ? '<span class="dh-pill red">' + reds + ' stale</span> ' : '';
      summary += ambers ? '<span class="dh-pill amber">' + ambers + ' aging</span> ' : '';
      if (!reds && !ambers) summary = '<span class="dh-pill green">All sources current</span>';

      var exc = '';
      exc += (stuckOrders == null) ? '' : (stuckOrders > 0
        ? '<div class="ex warn"><b>' + stuckOrders + '</b> open order(s) are more than 30 days old with no ship date. Likely stuck. Check the Orders board.</div>'
        : '<div class="ex ok">No stuck open orders (all recent open orders have activity).</div>');
      exc += (oldDemand == null) ? '' : (oldDemand.pos > 0
        ? '<div class="ex warn"><b>' + oldDemand.pos + '</b> open PO(s) past due across ' + oldDemand.lines + ' DC/flavor lines. Check live order status before closing.</div>'
        : '<div class="ex ok">No real open POs past due.</div>');
      if (missingPmac == null) {
        exc += '';
      } else if (missingPmac.length) {
        exc += missingPmac.map(function (d) {
          return '<div class="ex bad"><b>No P-Mac production rows for ' + esc(prettyPmacDate(d)) + '.</b> The Production Tracking file had no rows for that weekday by 3 PM America/Denver the next day.</div>';
        }).join("");
      } else {
        exc += '<div class="ex ok">No missing weekday P-Mac days in the last ' + LOOKBACK_DAYS + ' days.</div>';
      }

      host.innerHTML =
        '<div class="card"><h2>Data Health</h2>' +
        '<p class="hint">How current each data source is, and whether anything old is stuck. Green = fresh, amber = aging, red = hasn\'t updated in a while. Read-only. Nothing here changes your data.</p>' +
        '<p style="margin:6px 0 12px">' + summary + '</p>' +
        '<div class="tblwrap"><table class="sortable"><thead><tr><th>Data source</th><th class="right">Records</th><th>Last update</th><th>Freshness</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        '</div>' +
        '<div class="card"><h2 class="sub2">Exceptions</h2><div id="dh-exc">' + (exc || '<p class="muted">No exception checks available.</p>') + '</div></div>' +
        '<div class="card" id="dh-sync"><h2 class="sub2">Inventory Sync</h2><p class="muted">Checking Adriana\'s count...</p></div>';
      fillSync();
    });
  }
  function syncRows(list, limit) {
    return (list || []).slice(0, limit).map(function (r) {
      var item = esc(r.item || r.desc || "");
      var lot = esc(r.lot || "");
      var loc = esc(r.location || (r.from && r.from.location) || "");
      var before = r.from && r.from.qty != null ? r.from.qty : (r.os != null ? r.os : "");
      var after = r.op === "delete" ? 0 : (r.qty != null ? r.qty : "");
      var why = esc(r.reason || r.op || "");
      return "<tr><td>" + item + "</td><td>" + lot + "</td><td>" + loc + "</td><td class=\"right\">" + esc(before) + "</td><td class=\"right\">" + esc(r.sheet != null ? r.sheet : "") + "</td><td class=\"right\">" + esc(after) + "</td><td>" + why + "</td></tr>";
    }).join("");
  }
  function fillSync() {
    var el = $("dh-sync");
    if (!el) return;
    var api = window.INV_LOT_PLAN;
    var latest = window.ADRIANA_LATEST;
    var db = window.DB;
    if (!api || !latest || !db || typeof db.stock !== "function" || typeof db.items !== "function" || !db.items().length) {
      el.innerHTML = "<h2 class=\"sub2\">Inventory Sync</h2><p class=\"muted\">Waiting for inventory to load.</p>";
      return;
    }
    var today = new Date().toISOString().slice(0, 10);
    var planned = api.planAll(latest, db.stock(), db.items(), { today: today, sheetAsOf: latest.sheetAsOf });
    var holds = planned.holds || [];
    var drifts = planned.applied || [];
    var matched = planned.matching || [];
    var exc = holds.length
      ? "<div class=\"ex warn\"><b>" + holds.length + "</b> held line" + (holds.length === 1 ? "" : "s") + ". Each one needs a look. The count is an exception, not a silent skip.</div>"
      : "<div class=\"ex ok\">No held lines.</div>";
    exc += drifts.length
      ? "<div class=\"ex warn\"><b>" + drifts.length + "</b> line" + (drifts.length === 1 ? "" : "s") + " still differ from Adriana's " + esc(latest.countDate) + " count.</div>"
      : "<div class=\"ex ok\">On-hand matches the latest Adriana count, except held lines.</div>";
    var head = "<tr><th>Item</th><th>Lot</th><th>Location</th><th class=\"right\">OS before</th><th class=\"right\">Sheet</th><th class=\"right\">OS after</th><th>Reason</th></tr>";
    var noteBlock = (planned.notes || []).map(function (n) {
      return "<div class=\"ex warn\"><b>" + esc(n.title || n.item || "Note") + ".</b> " + esc(n.reason || "") + "</div>";
    }).join("");
    el.innerHTML = "<h2 class=\"sub2\">Inventory Sync</h2>" +
      "<p class=\"hint\">Adriana's Inventory SLC 2026 count " + esc(latest.countDate) + ". This check compares OS on-hand, per item and per lot, with that block. A difference over 0.5% or over 1 unit is listed. Nothing on this screen writes.</p>" +
      exc +
      "<p class=\"sm\">" + drifts.length + " to apply, " + matched.length + " already matching, " + holds.length + " held.</p>" +
      (drifts.length ? "<h3>Still different</h3><div class=\"tblwrap\"><table class=\"sortable\"><thead>" + head + "</thead><tbody>" + syncRows(drifts, 80) + "</tbody></table></div>" : "") +
      (holds.length ? "<h3>Held</h3><div class=\"tblwrap\"><table class=\"sortable\"><thead>" + head + "</thead><tbody>" + syncRows(holds, 80) + "</tbody></table></div>" : "") +
      (noteBlock ? "<h3>Open exceptions</h3>" + noteBlock : "") +
      "<h3>Already matching</h3><p class=\"sm\">" + matched.length + " lines already match. The first 40 are listed.</p><div class=\"tblwrap\"><table><thead>" + head + "</thead><tbody>" + syncRows(matched, 40) + "</tbody></table></div>";
  }

  var dhOpen = false;
  window.DATAHEALTH = { forTest: { isTestRow: isTestRow, stuckSummary: stuckSummary, missingPmacDays: missingPmacDays, prettyPmacDate: prettyPmacDate, denverStamp: denverStamp, addDays: addDays, LOOKBACK_DAYS: LOOKBACK_DAYS }, open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); dhOpen = true; markActive(); render(); } };

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
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#nav .navitem") : null;
    if (t && t.id !== "dh-nav") dhOpen = false;
  }, true);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && dhOpen) render();
  });
  window.SMK_VIEW_LOCKS = window.SMK_VIEW_LOCKS || [];
  window.SMK_VIEW_LOCKS.push(function () { return dhOpen; });
  try { var mo = new MutationObserver(function () { injectNav(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

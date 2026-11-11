/* ============================================================================
   Smackin' OS - Data Health  (data-health.js)
   Read-only "is anything stuck or stale?" check. Adds a "Data Health" nav item.
   For each key data source it shows how long since it last updated and flags
   anything that's gone quiet (green / amber / red), plus a few exception checks
   (stuck open orders, past-due demand still open). Nothing is changed here; it
   just surfaces exceptions so old data doesn't sit unnoticed.
   PAUSED_FEEDS marks feeds that are intentionally not in use. Those rows
   stay grey and out of the stale count. Remove one entry to count it again.
   A later date than asOf leaves the pause. An empty asOf means never used.
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
      if (!groups[key]) groups[key] = { po: row.po, partner: String(row.partner || "Unknown"), lines: 0, bags: 0, pastDue: false, due: "" };
      groups[key].lines++;
      groups[key].bags += Number(row.bags) || 0;
      var due = dueMs(row.due_date);
      if (due != null && due < today) {
        groups[key].pastDue = true;
        if (!groups[key].due) groups[key].due = String(row.due_date || "");
      }
    });
    var list = Object.keys(groups).map(function (key) { return groups[key]; }).filter(function (g) { return g.pastDue; });
    list.sort(function (a, b) { return (a.partner + a.po).localeCompare(b.partner + b.po); });
    return { pos: list.length, lines: list.reduce(function (sum, g) { return sum + g.lines; }, 0), list: list };
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // sources: freshness column + expected cadence (warn/bad in days)
  var SOURCES = [
    { t: "stock", col: "updated_at", label: "Inventory (stock counts)", warn: 4, bad: 9 },
    { t: "demand_lines", col: "created_at", label: "Demand imports", warn: 12, bad: 25 },
    { t: "orders", col: "created_at", label: "Orders", warn: 4, bad: 9 },
    { t: "pmac_history", col: "run_date", label: "P-Mac production", warn: 5, bad: 12, alt: { t: "pmac_log", col: "log_date" } },
    { t: "mixing_history", col: "run_date", label: "Mixing tracker", warn: 5, bad: 12 },
    { t: "wip_production_daily", col: "prod_date", label: "WIP daily units", warn: 5, bad: 12 },
    { t: "fulfillment_daily", col: "fdate", label: "Fulfillment daily", warn: 2, bad: 4, business: true },
    { t: "production_days", col: "prod_date", label: "Production days", warn: 2, bad: 4, business: true },
    { t: "production_pallets", col: "prod_date", label: "Production pallets", warn: 2, bad: 4, business: true },
    { t: "shipping_log", col: "ship_date", label: "Shipping business dates", warn: 3, bad: 7, business: true, skipTest: true },
    { t: "receiving_log", col: "created_at", label: "Receiving log", warn: 14, bad: 30 },
    { t: "supplier_pos", col: "created_at", label: "Supplier POs", warn: 30, bad: 60 },
    { t: "launch_pipeline", col: "updated_at", label: "Launch pipeline", warn: 45, bad: 90 },
    { t: "demand_forecast", col: "updated_at", label: "WOS forecast", warn: 30, bad: 60 },
    { t: "machine_live", col: "updated_at", label: "Live machine feed", warn: 14, bad: 30 },
    { t: "qc_forms", col: "form_date", label: "QC forms", warn: 2, bad: 4, business: true },
    { t: "trace_events", col: "ts", label: "Trace events", warn: 14, bad: 30 }
  ];

  // Remove one entry to count that feed again. asOf is the last data date.
  // A newer date shows the feed as active and flags "new data while paused".
  var PAUSED_FEEDS = {
    mixing_history: { key: "mixing_history", owner: "Troy Dircks", asOf: "2026-09-29", reason: "Mixing tracker is intentionally not in use." },
    machine_live: { key: "machine_live", owner: "Troy Dircks", asOf: "2026-09-09", reason: "Live machine feed is intentionally not in use." },
    demand_forecast: { key: "demand_forecast", owner: "Troy Dircks", asOf: "2026-07-17", reason: "WOS forecast is intentionally not in use." },
    qc_forms: { key: "qc_forms", owner: "Troy Dircks", asOf: "", reason: "QC forms have never been used." }
  };

  function daysAgo(ts, now) {
    if (!ts) return null;
    var d = new Date(ts); if (isNaN(d)) { var m = String(ts).match(/(\d{4})-(\d{2})-(\d{2})/); if (m) d = new Date(+m[1], +m[2] - 1, +m[3]); }
    if (isNaN(d)) return null;
    var base = now instanceof Date ? now.getTime() : Date.now();
    return Math.floor((base - d.getTime()) / 86400000);
  }
  function businessDaysAgo(ts, now) {
    var end = denverStamp(now || new Date()).date;
    var start = String(ts || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !end) return daysAgo(ts, now);
    if (start >= end) return 0;
    var n = 0;
    var cursor = addDays(start, 1);
    var guard = 0;
    while (cursor && cursor <= end && guard < 800) {
      if (isWeekday(cursor)) n++;
      cursor = addDays(cursor, 1);
      guard++;
    }
    return n;
  }
  function ageOf(ts, src, now) {
    if (src && src.business) return businessDaysAgo(ts, now);
    return daysAgo(ts, now);
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
  function prettyDay(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    if (isNaN(dt.getTime())) return "";
    return MONTH_NAMES[dt.getUTCMonth()] + " " + dt.getUTCDate() + ", " + dt.getUTCFullYear();
  }
  function dayKey(ts) {
    var s = String(ts || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }
  function pausedEntry(src) {
    if (!src || !PAUSED_FEEDS) return null;
    return PAUSED_FEEDS[src.t] || null;
  }
  function newerThanPause(entry, latest, count) {
    if (!entry) return false;
    var day = dayKey(latest);
    if (!entry.asOf) return !!(day || (Number(count) > 0));
    return !!(day && day > entry.asOf);
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
      "tr.dh-paused td{color:#64748b;background:#f8fafc}",
      ".dh-owner{display:block;color:#64748b;font-size:12px;font-weight:600;margin-top:2px}",
      "#dh-exc .ex{padding:11px 14px;border-radius:10px;margin-top:8px;font-size:13.5px}",
      "#dh-exc .ex.warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}",
      "#dh-exc .ex.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}",
      "#dh-exc .ex.bad{background:#fee2e2;border:1px solid #fecaca;color:#991b1b}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }

  function statusOf(days, src, count, latest) {
    if (count == null) return { cls: "red", txt: "could not read", paused: false };
    var entry = pausedEntry(src);
    if (entry && !newerThanPause(entry, latest, count)) {
      var when = entry.asOf ? (prettyDay(dayKey(latest) || entry.asOf) || entry.asOf) : "never used";
      return { cls: "grey", txt: "Paused", paused: true, owner: entry.owner || "", when: when, reason: entry.reason || "" };
    }
    var st;
    if (count === 0) st = { cls: "grey", txt: "no data yet" };
    else if (days == null) st = { cls: "grey", txt: "unknown" };
    else {
      var unit = src.business ? " business days ago" : "d ago";
      if (days >= src.bad) st = { cls: "red", txt: days + unit };
      else if (days >= src.warn) st = { cls: "amber", txt: days + unit };
      else st = { cls: "green", txt: days === 0 ? "today" : days + unit };
    }
    st.paused = false;
    if (entry) st.note = "new data while paused";
    return st;
  }
  function lastShown(latest, st) {
    if (st && st.paused) return st.when || "never used";
    if (latest) return String(latest).slice(0, 10);
    return "-";
  }
  function renderRow(x) {
    var st = statusOf(x.days, x.src, x.count, x.latest);
    var countTxt = x.count == null ? "-" : Number(x.count).toLocaleString("en-US");
    var note = "";
    if (st.paused && st.owner) note = '<div class="dh-owner">' + esc(st.owner) + "</div>";
    else if (st.note) note = '<div class="dh-owner">' + esc(st.note) + "</div>";
    var title = st.reason ? ' title="' + esc(st.reason) + '"' : "";
    var trCls = st.paused ? ' class="dh-paused"' : "";
    return "<tr" + trCls + title + "><td><span class=\"dh-dot dh-" + st.cls + "\"></span>" + esc(x.src.label) + note + "</td>" +
      '<td class="right sm">' + countTxt + "</td>" +
      '<td class="sm">' + esc(lastShown(x.latest, st)) + "</td>" +
      '<td><span class="dh-pill ' + st.cls + '">' + esc(st.txt) + "</span></td></tr>";
  }
  function tally(rows) {
    var reds = 0, ambers = 0, paused = 0;
    (rows || []).forEach(function (x) {
      var st = statusOf(x.days, x.src, x.count, x.latest);
      if (st.paused) paused++;
      else if (st.cls === "red") reds++;
      else if (st.cls === "amber") ambers++;
    });
    return { reds: reds, ambers: ambers, paused: paused };
  }
  function summaryHtml(totals) {
    totals = totals || {};
    var reds = totals.reds || 0, ambers = totals.ambers || 0, pausedN = totals.paused || 0;
    var summary = "";
    if (reds) summary += '<span class="dh-pill red">' + reds + " stale</span> ";
    else if (!ambers) summary += '<span class="dh-pill green">All sources current</span> ';
    if (ambers) summary += '<span class="dh-pill amber">' + ambers + " aging</span> ";
    if (pausedN) summary += '<span class="dh-pill grey">' + pausedN + " paused</span>";
    return summary;
  }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    host.innerHTML = '<div class="card"><h2>Data Health</h2><p class="muted" id="dh-loading">Checking every data source…</p></div>';
    var c = client(); if (!c) { $("dh-loading").textContent = "Not connected."; return; }

    function probe(t, col, extra) {
      var latestQ = c.from(t).select(extra && extra.skipTest ? col + ",status" : col).order(col, { ascending: false }).limit(1);
      if (extra && extra.skipTest) latestQ = latestQ.neq("status", "Test");
      return Promise.all([
        latestQ,
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
      return Promise.all([probe(src.t, src.col, src), src.alt ? probe(src.alt.t, src.alt.col) : Promise.resolve(null)]).then(function (p) {
        var a = p[0], b = p[1], latest = a.latest;
        if (a.count == null && (!b || b.count == null)) return { src: src, latest: null, count: null, days: null };
        var count = (a.count || 0) + ((b && b.count) || 0);
        if (b) { var bl = b.latest ? String(b.latest).slice(0, 10) : null; if (bl && (!latest || bl > String(latest).slice(0, 10))) latest = bl; }
        return { src: src, latest: latest, count: count, days: ageOf(latest, src) };
      }).catch(function () { return { src: src, latest: null, count: 0, days: null }; });
    });

    // exception checks
    var excOrders = c.from("orders").select("id,status,ship_date,created_at,entered_by").neq("status", "Complete").neq("status", "Test").is("ship_date", null)
      .then(function (r) { var d = (r && r.data) || []; var cut = Date.now() - 30 * 86400000; return d.filter(function (o) { var t = new Date(o.created_at).getTime(); return !isTestRow(o) && !isNaN(t) && t < cut; }).length; }).catch(function () { return null; });
    var excDemand = Promise.all([
      c.from("demand_lines").select("due_date,status,batch_id,batch_label,partner,po,bags,cases,load,notes").eq("status", "Open").limit(10000),
      c.from("stock_build").select("item_key,on_hand").limit(200).then(function (r) { return r; }).catch(function () { return { data: [] }; }),
      c.from("orders").select("customer_po,appointment,notes,carrier").limit(2000).then(function (r) { return r; }).catch(function () { return { data: [] }; }),
      c.from("demand_po_stage").select("partner,po,pickup_date,note").limit(500).then(function (r) { return r; }).catch(function () { return { data: [] }; })
    ]).then(function (pair) {
      var rows = (pair[0] && pair[0].data) || [];
      var sb = (pair[1] && pair[1].data) || [];
      var orders = (pair[2] && pair[2].data) || [];
      var stagedPos = (pair[3] && pair[3].data) || [];
      var midnight = new Date(); midnight.setHours(0, 0, 0, 0);
      var summary = stuckSummary(rows, midnight.getTime());
      if (window.MAKE_PLAN && typeof MAKE_PLAN.openDemandStates === "function") {
        var staged = 0;
        sb.forEach(function (row) {
          if (String(row.item_key || "").indexOf("Target_") === 0) staged += Number(row.on_hand) || 0;
        });
        var bookings = typeof MAKE_PLAN.bookingsFromOrders === "function" ? MAKE_PLAN.bookingsFromOrders(orders) : {};
        var st = MAKE_PLAN.openDemandStates(rows, {
          today: typeof MAKE_PLAN.denverISO === "function" ? MAKE_PLAN.denverISO(new Date()) : new Date().toISOString().slice(0, 10),
          stagedCases: staged,
          bookings: bookings,
          stagedPos: stagedPos
        });
        summary = {
          pos: st.past.pos,
          lines: st.past.lines,
          list: st.past.list.map(function (g) { return { po: g.po, partner: g.partner, lines: g.lines, bags: g.bags, due: g.dueRaw || g.due }; }),
          awaiting: st.awaiting
        };
      }
      return summary;
    }).catch(function () { return null; });
    var excPmac = loadMissingPmac(c);
    var excGuard = loadGuard(c);

    Promise.all([Promise.all(jobs), excOrders, excDemand, excPmac, excGuard]).then(function (all) {
      var rows = all[0], stuckOrders = all[1], oldDemand = all[2], missingPmac = all[3], guard = all[4];
      var body = rows.map(renderRow).join("");
      var totals = tally(rows);
      var summary = summaryHtml(totals);

      var exc = '';
      exc += (stuckOrders == null) ? '' : (stuckOrders > 0
        ? '<div class="ex warn"><b>' + stuckOrders + '</b> open order(s) are more than 30 days old with no ship date. Likely stuck. Check the Orders board.</div>'
        : '<div class="ex ok">No stuck open orders (all recent open orders have activity).</div>');
      exc += (oldDemand == null) ? '' : (oldDemand.pos > 0
        ? '<div class="ex warn"><b>Past-due open demand.</b> <b>' + oldDemand.pos + '</b> open PO(s) past due across ' + oldDemand.lines + ' DC/flavor lines: ' +
          (oldDemand.list || []).map(function (g) {
            var bags = g.bags ? (", " + g.bags.toLocaleString("en-US") + " bags") : "";
            return esc(g.partner) + " PO " + esc(g.po) + " (due " + esc(g.due || "blank") + ", " + g.lines + " lines" + bags + ")";
          }).join("; ") +
          '. These stay open until a source proves status. This screen does not close them.</div>'
        : '<div class="ex ok">No real open POs past due.</div>');
      if (oldDemand && oldDemand.awaiting && oldDemand.awaiting.pos > 0) {
        exc += '<div class="ex ok"><b>Built, awaiting pickup.</b> <b>' + oldDemand.awaiting.pos + '</b> Target PO(s) are built and waiting for pickup across ' + oldDemand.awaiting.lines + ' lines: ' +
          (oldDemand.awaiting.list || []).map(function (g) {
            var when = g.pickup ? ", pickup " + esc(g.pickup) : "";
            return esc(g.partner) + " PO " + esc(g.po) + " (" + g.lines + " lines" + when + ")";
          }).join("; ") +
          '. They are not past due.</div>';
      }
      if (missingPmac == null) {
        exc += '';
      } else if (missingPmac.length) {
        exc += missingPmac.map(function (d) {
          return '<div class="ex bad"><b>No P-Mac production rows for ' + esc(prettyPmacDate(d)) + '.</b> The Production Tracking file had no rows for that weekday by 3 PM America/Denver the next day.</div>';
        }).join("");
      } else {
        exc += '<div class="ex ok">No missing weekday P-Mac days in the last ' + LOOKBACK_DAYS + ' days.</div>';
      }
      exc += guardHtml(guard);

      host.innerHTML =
        '<div class="card"><h2>Data Health</h2>' +
        '<p class="hint">How current each data source is, and whether anything old is stuck. Green = fresh, amber = aging, red = hasn\'t updated in a while. Paused is grey, names the owner, and is left out of the stale count. Read-only. Nothing here changes your data.</p>' +
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

  function dateISO(v) {
    var m = String(v || "").match(/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  function calendarDays(from, to) {
    var a = Date.parse(String(from) + "T00:00:00Z");
    var b = Date.parse(String(to) + "T00:00:00Z");
    if (isNaN(a) || isNaN(b)) return 0;
    return Math.round((b - a) / 86400000);
  }
  function shieldedLoc(loc) {
    var u = String(loc || "").toUpperCase().replace(/[\s_]+/g, "");
    return u === "QUARANTINE" || u === "QA-HOLD" || u === "QAHOLD";
  }
  function rowExpiry(row) {
    var own = dateISO(row && row.expires_on);
    if (own) return own;
    var lot = String(row && row.lot || "");
    var m = lot.match(/FHF\s*EXP\s*(\d{4}-\d{2}-\d{2})/i);
    return m ? m[1] : "";
  }
  function itemName(items, id) {
    var i;
    for (i = 0; i < (items || []).length; i++) {
      if (items[i].id === id || items[i].code === id) return items[i].name || items[i].code || id;
    }
    return String(id || "");
  }
  function expiredOutsideHold(stock, items, today) {
    today = today || denverStamp(new Date()).date;
    var out = [];
    (stock || []).forEach(function (row) {
      if (!row || !(Number(row.qty) > 0)) return;
      if (shieldedLoc(row.location)) return;
      var exp = rowExpiry(row);
      if (!exp || exp >= today) return;
      out.push({
        item: itemName(items, row.item_id),
        item_id: row.item_id || "",
        lot: String(row.lot || ""),
        location: String(row.location || ""),
        qty: Number(row.qty),
        expiration: exp,
        days: calendarDays(exp, today)
      });
    });
    out.sort(function (a, b) { return b.days - a.days || a.item.localeCompare(b.item); });
    return out;
  }
  function lotWarning(lot, stock, items, today) {
    var key = String(lot || "").trim().toLowerCase();
    if (!key) return "";
    var hits = expiredOutsideHold(stock, items, today).filter(function (row) {
      if (String(row.lot || "").trim().toLowerCase() === key) return true;
      return /fhf/i.test(key) && key.indexOf(row.expiration) >= 0;
    });
    if (!hits.length) return "";
    var h = hits[0];
    return h.item + ", lot " + h.lot + ", expired " + prettyDay(h.expiration) + " (" + h.days + " days). It is in " + h.location + ". Warning only. The lot is not blocked.";
  }
  function spsQuiet(opts) {
    opts = opts || {};
    var now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
    var last = "";
    if (opts.lastFile) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(opts.lastFile))) last = String(opts.lastFile);
      else {
        var parsed = new Date(opts.lastFile);
        last = isNaN(parsed.getTime()) ? "" : denverStamp(parsed).date;
      }
    }
    if (!last) return { quiet: true, last: "", days: null, never: true };
    var days = businessDaysAgo(last, now);
    return { quiet: days >= 2, last: last, days: days, never: false };
  }
  function receivingGap(opts) {
    opts = opts || {};
    var now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
    var last = dateISO(opts.lastReceipt);
    if (!last) return { gap: true, last: "", days: null };
    var days = businessDaysAgo(last, now);
    return { gap: days >= 5, last: last, days: days };
  }
  function readList(q) {
    return q.then(function (r) { return r; }).catch(function () { return { data: [], error: true }; });
  }
  function loadGuard(c) {
    return Promise.all([
      readList(c.from("stock").select("item_id,location,lot,qty,expires_on").gt("qty", 0).limit(5000)),
      readList(c.from("items").select("id,name,code").limit(5000)),
      readList(c.from("sps_transactions").select("received_at,status,payload").order("received_at", { ascending: false }).limit(40)),
      readList(c.from("receiving_log").select("recv_date").order("recv_date", { ascending: false }).limit(30))
    ]).then(function (rs) {
      var now = new Date();
      var today = denverStamp(now).date;
      var stock = (rs[0] && rs[0].data) || [];
      var items = (rs[1] && rs[1].data) || [];
      var files = (rs[2] && rs[2].data) || [];
      var recvs = (rs[3] && rs[3].data) || [];
      var lastFile = "";
      if (!(rs[2] && rs[2].error)) {
        files.forEach(function (row) {
          if (String(row.status || "").toLowerCase() === "test") return;
          var folder = row.payload && row.payload.folder;
          if (folder === "paste") return;
          if (!lastFile || String(row.received_at || "") > lastFile) lastFile = row.received_at || "";
        });
      }
      var lastRecv = "";
      if (!(rs[3] && rs[3].error)) {
        recvs.forEach(function (row) {
          var d = dateISO(row.recv_date);
          if (d > lastRecv) lastRecv = d;
        });
      }
      return {
        expired: (rs[0] && rs[0].error) ? null : expiredOutsideHold(stock, items, today),
        sps: (rs[2] && rs[2].error) ? null : spsQuiet({ lastFile: lastFile, now: now }),
        recv: (rs[3] && rs[3].error) ? null : receivingGap({ lastReceipt: lastRecv, now: now })
      };
    }).catch(function () { return null; });
  }
  function guardHtml(guard) {
    if (!guard) return "";
    var html = "";
    if (guard.expired) {
      if (!guard.expired.length) {
        html += '<div class="ex ok"><b>Expired stock.</b> No on-hand lot is past its date outside quarantine and QA-hold.</div>';
      } else {
        html += '<div class="ex bad"><b>Expired stock outside quarantine.</b> ' + guard.expired.length + " lot" + (guard.expired.length === 1 ? "" : "s") + ". Owner: Quality (Brittney Christensen, Monica Smith). Nothing was moved.</div>";
        html += '<div class="tblwrap"><table><thead><tr><th>Item</th><th>Lot</th><th>Location</th><th class="right">Qty</th><th>Expiration</th><th class="right">Days expired</th></tr></thead><tbody>' +
          guard.expired.map(function (row) {
            return "<tr><td>" + esc(row.item) + "</td><td>" + esc(row.lot) + "</td><td>" + esc(row.location) + "</td><td class=\"right\">" + esc(row.qty) + "</td><td>" + esc(prettyDay(row.expiration)) + "</td><td class=\"right\">" + esc(row.days) + "</td></tr>";
          }).join("") + "</tbody></table></div>";
      }
    }
    if (guard.sps) {
      if (guard.sps.quiet) {
        var when = guard.sps.never ? "never" : prettyDay(guard.sps.last);
        var span = guard.sps.never ? "" : ", " + guard.sps.days + " business days ago";
        html += '<div class="ex bad"><b>SPS feed.</b> Last file received ' + esc(when) + esc(span) + ". New 850s currently need a manual load.</div>";
      } else {
        html += '<div class="ex ok"><b>SPS feed.</b> Last file received ' + esc(prettyDay(guard.sps.last)) + ".</div>";
      }
    }
    if (guard.recv) {
      if (guard.recv.gap) {
        html += '<div class="ex warn"><b>Receiving gap.</b> No receipts in the last 5 business days. Last receipt ' + esc(guard.recv.last ? prettyDay(guard.recv.last) : "never") + ".</div>";
      } else {
        html += '<div class="ex ok"><b>Receiving.</b> A receipt is inside the last 5 business days. Last receipt ' + esc(prettyDay(guard.recv.last)) + ".</div>";
      }
    }
    return html;
  }

  var dhOpen = false;
  window.DATAHEALTH = { forTest: { isTestRow: isTestRow, stuckSummary: stuckSummary, missingPmacDays: missingPmacDays, prettyPmacDate: prettyPmacDate, prettyDay: prettyDay, denverStamp: denverStamp, addDays: addDays, LOOKBACK_DAYS: LOOKBACK_DAYS, sources: SOURCES, PAUSED_FEEDS: PAUSED_FEEDS, daysAgo: daysAgo, businessDaysAgo: businessDaysAgo, ageOf: ageOf, statusOf: statusOf, renderRow: renderRow, tally: tally, summaryHtml: summaryHtml, expiredOutsideHold: expiredOutsideHold, lotWarning: lotWarning, spsQuiet: spsQuiet, receivingGap: receivingGap, shieldedLoc: shieldedLoc }, lotWarning: lotWarning, expiredOutsideHold: expiredOutsideHold, open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); dhOpen = true; markActive(); render(); } };

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

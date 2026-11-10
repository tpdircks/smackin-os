/* ============================================================================
   Smackin' OS - Daily Metrics  (daily-metrics.js)
   Read-only week and month view. The old screen opened on today and summed
   production_output, which is not the live feed, so the page was usually empty.
   This module renders into #view via viewDaily(). No writes, no timers.
   A blank cell means no row. A past weekday with no P-Mac row is flagged
   Missing and is not added in as zero.
   ==========================================================================*/
(function (root) {
  "use strict";

  var cfg = (root && root.SMACKIN_CONFIG) || {};
  var sb = null;
  var state = { mode: "overview", day: "", loaded: false, loading: false, err: "", model: null, gen: 0 };

  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var METRICS = [
    { id: "pmac", label: "P-Mac packages", source: "pmac_history.total_pkgs" },
    { id: "boxes", label: "P-Mac boxes", source: "pmac_history.box_count" },
    { id: "counter", label: "Retail counter bags", source: "production_days (counter end minus start)" },
    { id: "cases", label: "Cases", source: "production_pallets.cases" },
    { id: "ecom", label: "E-com labels", source: "fulfillment_daily.ecom_total" },
    { id: "amazon", label: "Amazon bags", source: "fulfillment_daily.amazon_bags" },
    { id: "ship", label: "Shipments", source: "shipping_log rows by ship_date" },
    { id: "recv", label: "Receipts", source: "receiving_log rows by recv_date" },
    { id: "quality", label: "Quality checks", source: "quality_logs" }
  ];

  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function ymd(v) { return String(v || "").slice(0, 10); }
  function parseISO(iso) {
    var p = ymd(iso).split("-");
    if (p.length < 3 || p[0].length !== 4) return null;
    return { y: +p[0], m: +p[1], d: +p[2] };
  }
  function isoUTC(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }
  function addDays(iso, n) {
    var p = parseISO(iso);
    if (!p) return "";
    return isoUTC(p.y, p.m, p.d + Number(n || 0));
  }
  function dow(iso) {
    var p = parseISO(iso);
    if (!p) return 0;
    return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  }
  function isWeekday(iso) { var d = dow(iso); return d >= 1 && d <= 5; }
  function weekStart(iso) {
    var d = dow(iso);
    return addDays(iso, d === 0 ? -6 : 1 - d);
  }
  function monthStart(iso) { return ymd(iso).slice(0, 7) + "-01"; }
  function addMonthsKeepDay(iso, n) {
    var p = parseISO(iso);
    if (!p) return "";
    var first = new Date(Date.UTC(p.y, p.m - 1 + n, 1));
    var y = first.getUTCFullYear();
    var m = first.getUTCMonth();
    var dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return isoUTC(y, m + 1, Math.min(p.d, dim));
  }
  function daysInRange(a, b) {
    var out = [];
    var cur = a;
    var guard = 0;
    while (cur && b && cur <= b && guard < 400) {
      out.push(cur);
      cur = addDays(cur, 1);
      guard++;
    }
    return out;
  }
  function denverToday(now) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    var parts = {};
    fmt.formatToParts(now instanceof Date ? now : new Date(now || Date.now())).forEach(function (part) {
      parts[part.type] = part.value;
    });
    return parts.year + "-" + parts.month + "-" + parts.day;
  }
  function pretty(iso) {
    var p = parseISO(iso);
    if (!p) return String(iso || "");
    return DOW[dow(iso)] + " " + MON[p.m - 1] + " " + p.d;
  }
  function prettyShort(iso) {
    var p = parseISO(iso);
    if (!p) return String(iso || "");
    return MON[p.m - 1] + " " + p.d;
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function fmt(n) {
    if (n == null || !isFinite(n)) return "";
    var rounded = Math.round(n * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.05) return Math.round(rounded).toLocaleString("en-US");
    return rounded.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isPmacDept(dept) {
    return String(dept || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "pmac";
  }
  function isRetail(channel) {
    if (channel == null || String(channel).trim() === "") return true;
    return /retail/i.test(String(channel));
  }

  function indexPmac(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      if (!isPmacDept(r.dept)) return;
      var d = ymd(r.run_date);
      if (!d) return;
      if (!map[d]) map[d] = { pkgs: 0, boxes: 0, anyPkg: false, anyBox: false, runs: [] };
      var pkgs = num(r.total_pkgs);
      var boxes = num(r.box_count);
      if (pkgs != null) { map[d].pkgs += pkgs; map[d].anyPkg = true; }
      if (boxes != null) { map[d].boxes += boxes; map[d].anyBox = true; }
      map[d].runs.push(r);
    });
    return map;
  }
  function indexCounter(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      if (!isRetail(r.channel)) return;
      var d = ymd(r.prod_date);
      if (!d) return;
      var start = num(r.counter_start);
      var end = num(r.counter_end);
      map[d] = {
        has: start != null && end != null,
        n: start != null && end != null ? end - start : null,
        notes: r.notes || ""
      };
    });
    return map;
  }
  function indexSum(rows, dateField, valueField) {
    var map = {};
    (rows || []).forEach(function (r) {
      var d = ymd(r[dateField]);
      if (!d) return;
      if (!map[d]) map[d] = { n: 0, any: false, rows: [] };
      var v = num(r[valueField]);
      if (v != null) { map[d].n += v; map[d].any = true; }
      map[d].rows.push(r);
    });
    return map;
  }
  function indexFulfill(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var d = ymd(r.fdate);
      if (!d) return;
      if (!map[d]) map[d] = { ecom: 0, amazon: 0, anyEcom: false, anyAmz: false, notes: "", by: "" };
      var ecom = num(r.ecom_total);
      var amazon = num(r.amazon_bags);
      if (ecom != null) { map[d].ecom += ecom; map[d].anyEcom = true; }
      if (amazon != null) { map[d].amazon += amazon; map[d].anyAmz = true; }
      if (r.notes) map[d].notes = r.notes;
      if (r.entered_by) map[d].by = r.entered_by;
    });
    return map;
  }
  function indexCount(rows, field) {
    var map = {};
    (rows || []).forEach(function (r) {
      var d = ymd(r[field]);
      if (!d) return;
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }
  function indexQuality(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var data = r && r.data && typeof r.data === "object" ? r.data : {};
      var d = ymd(data.date || data.dt || r.created_at);
      if (!d) return;
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }

  function pmacField(iso, map, today, holidays, which, failed) {
    if (failed) return { kind: "error" };
    if (iso > today) return { kind: "later" };
    var row = map[iso];
    if (row && row.runs.length) {
      var any = which === "boxes" ? row.anyBox : row.anyPkg;
      if (!any) return { kind: "none", runs: row.runs };
      return { kind: "value", n: which === "boxes" ? row.boxes : row.pkgs, runs: row.runs };
    }
    if (!isWeekday(iso) || holidays[iso]) return { kind: "off" };
    if (iso === today) return { kind: "pending" };
    return { kind: "missing" };
  }
  function counterStatus(iso, map, today, failed) {
    if (failed) return { kind: "error" };
    if (iso > today) return { kind: "later" };
    var row = map[iso];
    if (!row || !row.has) return { kind: "none", notes: row ? row.notes : "" };
    return { kind: "value", n: row.n, notes: row.notes || "" };
  }
  function sumStatus(iso, map, today, failed) {
    if (failed) return { kind: "error" };
    if (iso > today) return { kind: "later" };
    var row = map[iso];
    if (!row || !row.any) return { kind: "none" };
    return { kind: "value", n: row.n, rows: row.rows };
  }
  function flagStatus(iso, map, today, failed, flag) {
    if (failed) return { kind: "error" };
    if (iso > today) return { kind: "later" };
    var row = map[iso];
    if (!row || !row[flag]) return { kind: "none", notes: row ? row.notes : "", by: row ? row.by : "" };
    var n = flag === "anyAmz" ? row.amazon : row.ecom;
    return { kind: "value", n: n, notes: row.notes || "", by: row.by || "" };
  }
  function countStatus(iso, map, today, failed) {
    if (failed) return { kind: "error" };
    if (iso > today) return { kind: "later" };
    if (map[iso] == null) return { kind: "none" };
    return { kind: "value", n: map[iso] };
  }

  function rollup(cells, key) {
    var total = 0, logged = 0, missing = 0, pending = 0, none = 0, error = 0;
    (cells || []).forEach(function (cell) {
      var s = cell[key];
      if (!s) return;
      if (s.kind === "value") { total += s.n; logged++; }
      else if (s.kind === "missing") missing++;
      else if (s.kind === "pending") pending++;
      else if (s.kind === "none") none++;
      else if (s.kind === "error") error++;
    });
    return {
      hasData: logged > 0 && error === 0,
      total: logged > 0 ? total : null,
      logged: logged,
      missing: missing,
      pending: pending,
      none: none,
      error: error
    };
  }
  function compareNote(cur, prior) {
    if (cur.error && !cur.hasData) return "Could not read this feed.";
    if (!prior) return "";
    if (!cur.hasData && prior.hasData) return "No data. Prior period: " + fmt(prior.total) + ".";
    if (cur.hasData && !prior.hasData) return "No prior period to compare.";
    if (!cur.hasData) return "";
    if (prior.total == null) return "";
    if (!prior.total) return "Prior period was 0.";
    var pct = Math.round((cur.total - prior.total) / prior.total * 100);
    if (pct === 0) return "Same as the prior period (" + fmt(prior.total) + ").";
    if (pct > 0) return "Up " + pct + "% vs prior " + fmt(prior.total) + ".";
    return "Down " + Math.abs(pct) + "% vs prior " + fmt(prior.total) + ".";
  }
  function cellText(s) {
    if (!s || s.kind === "none") return "No data";
    if (s.kind === "value") return fmt(s.n);
    if (s.kind === "missing") return "Missing";
    if (s.kind === "pending") return "Not in yet";
    if (s.kind === "off") return "Off";
    if (s.kind === "later") return "Later";
    if (s.kind === "error") return "Could not read";
    return "No data";
  }
  function loggedLine(roll) {
    var bits = [];
    if (roll.logged) bits.push(roll.logged + (roll.logged === 1 ? " day logged" : " days logged"));
    if (roll.missing) bits.push(roll.missing + (roll.missing === 1 ? " weekday missing" : " weekdays missing"));
    if (roll.pending) bits.push("today not in yet");
    return bits.join(", ");
  }

  function statusFor(raw, iso) {
    var today = raw.today;
    var holidays = raw.holidays || {};
    var err = raw.errors || {};
    return {
      d: iso,
      pmac: pmacField(iso, raw.pmac, today, holidays, "pkgs", err.pmac),
      boxes: pmacField(iso, raw.pmac, today, holidays, "boxes", err.pmac),
      counter: counterStatus(iso, raw.counter, today, err.counter),
      cases: sumStatus(iso, raw.cases, today, err.cases),
      ecom: flagStatus(iso, raw.fulfill, today, err.fulfill, "anyEcom"),
      amazon: flagStatus(iso, raw.fulfill, today, err.fulfill, "anyAmz"),
      ship: countStatus(iso, raw.ship, today, err.ship),
      recv: countStatus(iso, raw.recv, today, err.recv),
      quality: countStatus(iso, raw.quality, today, err.quality)
    };
  }
  function cellsFor(raw, dates) {
    return (dates || []).map(function (iso) { return statusFor(raw, iso); });
  }
  function weeksOverlapping(from, to) {
    if (!from || !to) return [];
    var cur = weekStart(from);
    var out = [];
    var guard = 0;
    while (cur <= to && guard < 8) {
      var end = addDays(cur, 6);
      var sliceFrom = cur < from ? from : cur;
      var sliceTo = end > to ? to : end;
      out.push({ start: cur, end: end, from: sliceFrom, to: sliceTo });
      cur = addDays(end, 1);
      guard++;
    }
    return out;
  }

  function buildModel(input, today) {
    input = input || {};
    today = ymd(today);
    var holidays = {};
    (input.holidays || []).forEach(function (r) {
      var d = ymd(r && (r.holiday_date || r));
      if (d) holidays[d] = 1;
    });
    var raw = {
      today: today,
      holidays: holidays,
      errors: input.errors || {},
      pmac: indexPmac(input.pmac),
      counter: indexCounter(input.counter),
      cases: indexSum(input.pallets, "prod_date", "cases"),
      fulfill: indexFulfill(input.fulfill),
      ship: indexCount(input.ship, "ship_date"),
      recv: indexCount(input.recv, "recv_date"),
      quality: indexQuality(input.quality)
    };
    var weekFrom = weekStart(today);
    var weekDates = daysInRange(weekFrom, addDays(weekFrom, 6));
    var elapsed = weekDates.filter(function (d) { return d <= today; });
    var priorElapsed = elapsed.map(function (d) { return addDays(d, -7); });
    var monthFrom = monthStart(today);
    var monthDates = daysInRange(monthFrom, today);
    var priorMonthTo = addMonthsKeepDay(today, -1);
    var priorMonthDates = daysInRange(monthStart(priorMonthTo), priorMonthTo);
    var windowFrom = monthStart(priorMonthTo);
    function pack(dates) {
      var cells = cellsFor(raw, dates);
      var rolls = {};
      METRICS.forEach(function (m) { rolls[m.id] = rollup(cells, m.id); });
      return { dates: dates, cells: cells, rolls: rolls };
    }
    var week = pack(elapsed);
    var priorWeek = pack(priorElapsed);
    var month = pack(monthDates);
    var priorMonth = pack(priorMonthDates);
    var weekChart = cellsFor(raw, weekDates);
    var monthWeeks = weeksOverlapping(monthFrom, today).map(function (w) {
      var packed = pack(daysInRange(w.from, w.to));
      return {
        start: w.start,
        end: w.end,
        from: w.from,
        to: w.to,
        rolls: packed.rolls,
        cells: packed.cells
      };
    });
    return {
      today: today,
      windowFrom: windowFrom,
      weekFrom: weekFrom,
      weekTo: addDays(weekFrom, 6),
      monthFrom: monthFrom,
      priorWeekFrom: priorElapsed[0] || "",
      priorWeekTo: priorElapsed.length ? priorElapsed[priorElapsed.length - 1] : "",
      priorMonthFrom: priorMonthDates[0] || "",
      priorMonthTo: priorMonthTo,
      week: week,
      priorWeek: priorWeek,
      weekChart: weekChart,
      month: month,
      priorMonth: priorMonth,
      monthWeeks: monthWeeks,
      asof: input.asof || {},
      errors: raw.errors,
      lookup: raw
    };
  }

  function client() {
    if (sb) return sb;
    if (!root || !root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
    return sb;
  }
  function fetchRange(table, cols, dateCol, from, to) {
    var c = client();
    if (!c) return Promise.reject(new Error("Shared database is not connected."));
    var all = [];
    var step = 1000;
    function page(offset) {
      return c.from(table).select(cols).gte(dateCol, from).lte(dateCol, to).order(dateCol, { ascending: true }).range(offset, offset + step - 1)
        .then(function (r) {
          if (r && r.error) throw new Error(r.error.message || table);
          var rows = (r && r.data) || [];
          all = all.concat(rows);
          if (rows.length === step) return page(offset + step);
          return all;
        });
    }
    return page(0);
  }
  function fetchLatest(table, cols, orderCol) {
    var c = client();
    if (!c) return Promise.resolve([]);
    return c.from(table).select(cols).order(orderCol, { ascending: false }).limit(40).then(function (r) {
      if (r && r.error) throw new Error(r.error.message || table);
      return (r && r.data) || [];
    });
  }
  function settled(promise) {
    return promise.then(function (rows) { return { ok: true, rows: rows || [] }; }).catch(function (e) {
      return { ok: false, err: (e && e.message) || String(e), rows: [] };
    });
  }
  function firstDate(rows, field, pred) {
    var i;
    for (i = 0; i < (rows || []).length; i++) {
      if (!pred || pred(rows[i])) {
        var d = ymd(rows[i][field]);
        if (d) return d;
      }
    }
    return "";
  }

  function load(today) {
    var from = monthStart(addMonthsKeepDay(today, -1));
    return Promise.all([
      settled(fetchRange("pmac_history", "run_date,dept,total_pkgs,box_count,flavor_code,flavor_name,bag_size,shift,operator,machine", "run_date", from, today)),
      settled(fetchRange("production_days", "prod_date,channel,counter_start,counter_end,notes", "prod_date", from, today)),
      settled(fetchRange("production_pallets", "prod_date,channel,line,flavor_code,cases,notes,entered_by", "prod_date", from, today)),
      settled(fetchRange("fulfillment_daily", "fdate,ecom_total,amazon_bags,notes,entered_by", "fdate", from, today)),
      settled(fetchRange("shipping_log", "ship_date", "ship_date", from, today)),
      settled(fetchRange("receiving_log", "recv_date", "recv_date", from, today)),
      settled(fetchRange("quality_logs", "id,created_at,data", "created_at", from, today + "T23:59:59")),
      settled(client() ? client().from("time_off_holidays").select("holiday_date").gte("holiday_date", from).lte("holiday_date", today).limit(200).then(function (r) {
        if (r && r.error) throw new Error(r.error.message || "holidays");
        return (r && r.data) || [];
      }) : Promise.resolve([])),
      settled(fetchLatest("pmac_history", "run_date,dept", "run_date")),
      settled(fetchLatest("production_days", "prod_date", "prod_date")),
      settled(fetchLatest("production_pallets", "prod_date", "prod_date")),
      settled(fetchLatest("fulfillment_daily", "fdate,amazon_bags", "fdate")),
      settled(fetchLatest("shipping_log", "ship_date", "ship_date")),
      settled(fetchLatest("receiving_log", "recv_date", "recv_date")),
      settled(fetchLatest("quality_logs", "created_at", "created_at")),
      settled(fetchLatest("mixing_history", "run_date", "run_date")),
      settled(fetchLatest("wip_production_daily", "prod_date", "prod_date")),
      settled(fetchLatest("production_output", "prod_date", "prod_date")),
      settled(client() ? client().from("fulfillment_daily").select("fdate,amazon_bags").gt("amazon_bags", 0).order("fdate", { ascending: false }).limit(1).then(function (r) {
        if (r && r.error) throw new Error(r.error.message || "amazon");
        return (r && r.data) || [];
      }) : Promise.resolve([]))
    ]).then(function (parts) {
      var errors = {};
      function take(i, key) {
        if (!parts[i].ok) errors[key] = parts[i].err;
        return parts[i].rows;
      }
      var asof = {
        pmac: firstDate(parts[8].ok ? parts[8].rows : [], "run_date", function (r) { return isPmacDept(r.dept); }),
        counter: firstDate(parts[9].ok ? parts[9].rows : [], "prod_date"),
        cases: firstDate(parts[10].ok ? parts[10].rows : [], "prod_date"),
        ecom: firstDate(parts[11].ok ? parts[11].rows : [], "fdate"),
        amazon: firstDate(parts[18].ok ? parts[18].rows : [], "fdate"),
        ship: firstDate(parts[12].ok ? parts[12].rows : [], "ship_date"),
        recv: firstDate(parts[13].ok ? parts[13].rows : [], "recv_date"),
        quality: firstDate(parts[14].ok ? parts[14].rows : [], "created_at"),
        mixing: firstDate(parts[15].ok ? parts[15].rows : [], "run_date"),
        wip: firstDate(parts[16].ok ? parts[16].rows : [], "prod_date"),
        output: firstDate(parts[17].ok ? parts[17].rows : [], "prod_date")
      };
      return buildModel({
        pmac: take(0, "pmac"),
        counter: take(1, "counter"),
        pallets: take(2, "cases"),
        fulfill: take(3, "fulfill"),
        ship: take(4, "ship"),
        recv: take(5, "recv"),
        quality: take(6, "quality"),
        holidays: take(7, "holidays"),
        errors: errors,
        asof: asof
      }, today);
    });
  }

  function ensureStyle() {
    if (!root || !root.document || root.document.getElementById("dm-style")) return;
    var s = root.document.createElement("style");
    s.id = "dm-style";
    s.textContent = [
      ".dm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px;margin:8px 0 12px}",
      ".dm-kpi{background:var(--navy);color:#fff;border-radius:10px;padding:12px 12px 10px;min-height:108px}",
      ".dm-kpi .n{font-size:26px;font-weight:800;line-height:1.05}",
      ".dm-kpi .l{font-size:12px;font-weight:700;opacity:.92;margin-top:3px}",
      ".dm-kpi .s{font-size:11px;line-height:1.35;opacity:.88;margin-top:6px}",
      ".dm-kpi.none{background:#eef2f6;color:#3d4c5c;border:1px solid var(--line)}",
      ".dm-kpi.none .n{font-size:18px;color:#8a5a12}",
      ".dm-kpi.miss{background:#fff6e9;color:#7a4d05;border:1px solid #f0d7a8}",
      ".dm-kpi.miss .n{font-size:18px;color:#9a3412}",
      ".dm-banner{background:#fff6e9;border:1px solid #f0d7a8;color:#7a4d05;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;margin:0 0 12px}",
      ".dm-charts{display:grid;grid-template-columns:1fr;gap:12px}",
      "@media(min-width:860px){.dm-charts.two{grid-template-columns:1.2fr .8fr}}",
      ".dm-panel{background:#f7fafc;border:1px solid var(--line);border-radius:10px;padding:10px 10px 6px}",
      ".dm-panel h3{margin:0 0 4px;font-size:13px;color:var(--navy)}",
      ".dm-svg{width:100%;height:auto;display:block}",
      ".dm-svg .dm-hit{cursor:pointer}",
      ".dm-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;font-weight:600;color:#445;margin:2px 0 8px}",
      ".dm-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}",
      ".dm-asof{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
      ".dm-chip{font-size:12px;background:var(--light);color:var(--navy);border-radius:999px;padding:4px 8px;font-weight:650}",
      ".dm-date{max-width:180px;flex:0 0 170px}",
      ".dm-date input{width:100%}",
      ".dm-flag{font-weight:800}",
      "td.dm-miss{background:#fff6e9;color:#9a3412;font-weight:800}",
      "td.dm-pend{background:#e7f2fb;color:#04223b;font-weight:800}",
      "td.dm-none{color:#8b97a3}",
      "td.dm-off{color:#9aa6b2}",
      ".dm-day{background:none;border:0;padding:0;color:var(--blue);font:inherit;font-weight:800;cursor:pointer}",
      ".dm-note{white-space:pre-wrap}",
      ".dm-weeks{display:flex;flex-direction:column;gap:6px;margin-top:6px}",
      ".dm-week{display:grid;grid-template-columns:132px 1fr auto;gap:8px;align-items:center}",
      ".dm-week .lbl{font-size:12px;color:#667;text-align:right}",
      ".dm-track{background:#e7eef5;border-radius:6px;height:16px;overflow:hidden}",
      ".dm-fill{height:100%;background:var(--navy);border-radius:6px}",
      ".dm-fill.miss{background:repeating-linear-gradient(135deg,#f0d7a8,#f0d7a8 4px,#fff6e9 4px,#fff6e9 8px)}",
      ".dm-week .val{font-size:12px;font-weight:800;color:var(--navy);min-width:72px;text-align:right}",
      "@media(max-width:640px){.dm-week{grid-template-columns:1fr;gap:2px}.dm-week .lbl{text-align:left}.dm-kpi .n{font-size:22px}}"
    ].join("");
    (root.document.head || root.document.documentElement).appendChild(s);
  }

  function tile(metric, roll, prior) {
    var tone = "none";
    var headline = "No data";
    if (roll.error && !roll.hasData) { tone = "miss"; headline = "Could not read"; }
    else if (roll.hasData) { tone = "value"; headline = fmt(roll.total); }
    else if (roll.missing || roll.pending) { tone = "miss"; headline = "No data"; }
    var sub = roll.error && !roll.hasData ? "This feed did not load." : (roll.hasData || roll.missing || roll.pending ? loggedLine(roll) : "No rows in this period.");
    var cmp = compareNote(roll, prior);
    return '<div class="dm-kpi ' + (tone === "value" ? "" : tone) + '" data-metric="' + metric.id + '" data-state="' + (roll.hasData ? "value" : (roll.missing ? "missing" : "none")) + '">' +
      '<div class="n">' + esc(headline) + '</div>' +
      '<div class="l">' + esc(metric.label) + '</div>' +
      '<div class="s">' + esc(sub) + (cmp ? "<br>" + esc(cmp) : "") + "</div></div>";
  }
  function tiles(rolls, priorRolls) {
    return '<div class="dm-kpis">' + METRICS.map(function (m) {
      return tile(m, rolls[m.id], priorRolls ? priorRolls[m.id] : null);
    }).join("") + '</div>';
  }
  function banner(cells) {
    var missing = [];
    var pending = false;
    (cells || []).forEach(function (c) {
      if (c.pmac && c.pmac.kind === "missing") missing.push(pretty(c.d));
      if (c.pmac && c.pmac.kind === "pending") pending = true;
    });
    if (!missing.length && !pending) return "";
    var text = "";
    if (missing.length) text += "Missing P-Mac (not counted as zero): " + missing.join(", ") + ".";
    if (pending) text += (text ? " " : "") + "Today has no P-Mac row yet.";
    return '<div class="dm-banner">' + esc(text) + '</div>';
  }
  function cellClass(s) {
    if (!s) return "dm-none";
    if (s.kind === "missing") return "dm-miss";
    if (s.kind === "pending") return "dm-pend";
    if (s.kind === "off" || s.kind === "later") return "dm-off";
    if (s.kind === "none" || s.kind === "error") return "dm-none";
    return "";
  }
  function dayTable(cells) {
    var head = "<th>Date</th>" + METRICS.map(function (m) { return '<th class="right">' + esc(m.label) + "</th>"; }).join("");
    var body = cells.map(function (c) {
      var tds = METRICS.map(function (m) {
        var s = c[m.id];
        return '<td class="right ' + cellClass(s) + '">' + esc(cellText(s)) + "</td>";
      }).join("");
      return '<tr><td><button type="button" class="dm-day" onclick="DAILYMETRICS.openDay(\'' + c.d + '\')">' + esc(pretty(c.d)) + "</button></td>" + tds + "</tr>";
    }).join("");
    return '<div class="tblwrap"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  function chart(cells, series, opts) {
    opts = opts || {};
    var id = opts.id || "c";
    var dates = cells.map(function (c) { return c.d; });
    var active = series.filter(function (s) {
      return cells.some(function (c) {
        var st = c[s.key];
        return st && st.kind === "value";
      });
    });
    var showMissing = !!opts.missing;
    var anyMark = showMissing && cells.some(function (c) {
      return c.pmac && (c.pmac.kind === "missing" || c.pmac.kind === "pending");
    });
    var anyAbove = active.some(function (s) {
      return cells.some(function (c) {
        var st = c[s.key];
        return st && st.kind === "value" && st.n;
      });
    });
    if (!active.length && !anyMark) return '<p class="muted">No data in this range.</p>';
    if (active.length && !anyAbove && !anyMark) return '<p class="muted">Logged, and every logged day is 0. Nothing above zero to chart.</p>';
    var W = 760, H = 220, padL = 48, padR = 10, padT = 14, padB = 34;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = Math.max(dates.length, 1);
    var slot = plotW / n;
    var max = 1;
    active.forEach(function (s) {
      cells.forEach(function (c) {
        var st = c[s.key];
        if (st && st.kind === "value" && st.n > max) max = st.n;
      });
    });
    var svg = "";
    var g;
    if (anyAbove) {
      for (g = 0; g <= 2; g++) {
        var yv = max * g / 2;
        var y = padT + plotH - plotH * (g / 2);
        svg += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="#e6edf4"/>';
        svg += '<text x="' + (padL - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="#6E7C8A">' + esc(fmt(yv)) + "</text>";
      }
    } else {
      var base = padT + plotH;
      svg += '<line x1="' + padL + '" y1="' + base.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + base.toFixed(1) + '" stroke="#e6edf4"/>';
      svg += '<text x="' + (padL + 8) + '" y="' + (padT + 14) + '" font-size="12" fill="#8a5a12">No amounts logged in this range</text>';
    }
    svg += '<defs><pattern id="dmh-' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#E08A1E" stroke-width="2"/></pattern></defs>';
    var bw = active.length ? Math.max(4, Math.min(16, (slot * 0.72) / active.length)) : 8;
    cells.forEach(function (c, i) {
      var x0 = padL + slot * i;
      if (showMissing && c.pmac && (c.pmac.kind === "missing" || c.pmac.kind === "pending")) {
        var mh = anyAbove ? plotH * 0.34 : plotH * 0.62;
        var fill = c.pmac.kind === "pending" ? "#d7e8f6" : "url(#dmh-" + id + ")";
        svg += '<rect x="' + (x0 + slot * 0.22).toFixed(1) + '" y="' + (padT + plotH - mh).toFixed(1) + '" width="' + (slot * 0.56).toFixed(1) + '" height="' + mh.toFixed(1) + '" fill="' + fill + '" stroke="#E08A1E" stroke-dasharray="3 2"><title>' + esc(pretty(c.d) + ": " + cellText(c.pmac)) + "</title></rect>";
      }
      active.forEach(function (s, si) {
        var st = c[s.key];
        if (!st || st.kind !== "value" || !st.n) return;
        var h = plotH * (st.n / max);
        var x = x0 + (slot - bw * active.length) / 2 + si * bw;
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (padT + plotH - h).toFixed(1) + '" width="' + Math.max(bw - 1, 2).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + s.color + '" rx="1.5"><title>' + esc(s.name + " " + pretty(c.d) + ": " + fmt(st.n)) + "</title></rect>";
      });
      var label = n > 16 ? String(parseISO(c.d).d) : (DOW[dow(c.d)].slice(0, 1) + " " + parseISO(c.d).d);
      if (n <= 16 || i % 2 === 0) {
        svg += '<text x="' + (x0 + slot / 2).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10" fill="#6E7C8A">' + esc(label) + "</text>";
      }
      svg += '<rect class="dm-hit" x="' + x0.toFixed(1) + '" y="' + padT + '" width="' + slot.toFixed(1) + '" height="' + plotH.toFixed(1) + '" fill="transparent" onclick="DAILYMETRICS.openDay(\'' + c.d + '\')"><title>' + esc(pretty(c.d)) + "</title></rect>";
    });
    var legend = active.map(function (s) {
      return "<span><i style=\"background:" + s.color + "\"></i>" + esc(s.name) + "</span>";
    }).join("");
    if (showMissing) legend += '<span><i style="background:#f0d7a8"></i>Missing or not in yet</span>';
    return '<div class="dm-legend">' + legend + '</div><svg viewBox="0 0 ' + W + " " + H + '" class="dm-svg" role="img" aria-label="' + esc(opts.label || "Chart") + '">' + svg + "</svg>";
  }

  function weekBars(model) {
    var max = 1;
    model.monthWeeks.forEach(function (w) {
      var roll = w.rolls.pmac;
      if (roll.hasData && roll.total > max) max = roll.total;
    });
    if (!model.monthWeeks.length) return "";
    return '<div class="dm-weeks">' + model.monthWeeks.map(function (w) {
      var roll = w.rolls.pmac;
      var label = prettyShort(w.from) + " to " + prettyShort(w.to);
      var width = roll.hasData ? Math.max(4, Math.round(roll.total / max * 100)) : (roll.missing ? 100 : 0);
      var cls = roll.hasData ? "" : " miss";
      var val = roll.hasData ? fmt(roll.total) : (roll.missing ? "Missing" : (roll.pending ? "Not in yet" : "No data"));
      return '<div class="dm-week"><div class="lbl">' + esc(label) + '</div><div class="dm-track"><div class="dm-fill' + cls + '" style="width:' + width + '%"></div></div><div class="val">' + esc(val) + "</div></div>";
    }).join("") + "</div>";
  }

  function asofChips(model) {
    var a = model.asof || {};
    function chip(label, iso, empty) {
      var text = iso ? (label + " through " + pretty(iso)) : (label + ": " + (empty || "no rows"));
      return '<span class="dm-chip">' + esc(text) + "</span>";
    }
    return '<div class="dm-asof">' +
      chip("P-Mac", a.pmac) +
      chip("Retail counter", a.counter) +
      chip("Cases", a.cases) +
      chip("E-com", a.ecom) +
      chip("Amazon bags above zero", a.amazon, "none logged") +
      chip("Shipments", a.ship) +
      chip("Receipts", a.recv) +
      chip("Quality logs", a.quality, "no rows") +
      "</div>";
  }
  function footnote(model) {
    var a = model.asof || {};
    function bit(label, table, iso) {
      return label + " (" + table + ") last entry " + (iso ? pretty(iso) : "has no rows") + ".";
    }
    return '<p class="hint">Not added into these totals: ' + esc(bit("Mixing bins", "mixing_history", a.mixing)) + " " +
      esc(bit("WIP daily units", "wip_production_daily", a.wip)) + " " +
      esc(bit("Old production output log", "production_output", a.output)) +
      " Those feeds are not current for this week.</p>";
  }

  function rangeLine(title, from, to, priorFrom, priorTo) {
    var line = title + ": " + pretty(from) + " through " + pretty(to) + ".";
    if (priorFrom && priorTo) line += " Compared with " + pretty(priorFrom) + " through " + pretty(priorTo) + ".";
    return line;
  }

  function overview(model) {
    var pmacSeries = [{ key: "pmac", name: "P-Mac packages", color: "#04223B" }];
    var mixSeries = [
      { key: "ecom", name: "E-com labels", color: "#F26B21" },
      { key: "counter", name: "Retail counter", color: "#006DB6" }
    ];
    var caseSeries = [{ key: "cases", name: "Cases", color: "#00A341" }];
    return '<div id="dm-root">' +
      '<div class="card"><div class="suprow"><h2 style="margin:0;flex:1">Daily Metrics</h2>' +
      '<div class="dm-date"><input id="dm-date" type="date" min="' + esc(model.windowFrom) + '" max="' + esc(model.today) + '" aria-label="Open one day" onchange="DAILYMETRICS.openDay(this.value)"></div>' +
      '<button type="button" class="ghost sm" onclick="DAILYMETRICS.reload()">Refresh</button></div>' +
      '<p class="hint">Opens on this week and this month. Pick a date to open one day. No data means there is no row. A past weekday with no P-Mac row is marked Missing and is not counted as zero. Today in Denver is ' + esc(pretty(model.today)) + ".</p>" +
      asofChips(model) + "</div>" +
      '<div class="card"><h2>This week</h2><p class="hint">' + esc(rangeLine("Totals use", model.week.dates[0], model.today, model.priorWeekFrom, model.priorWeekTo)) + " The chart shows the full week, including days still ahead.</p>" +
      tiles(model.week.rolls, model.priorWeek.rolls) +
      banner(model.week.cells) +
      '<div class="dm-charts two"><div class="dm-panel"><h3>P-Mac packages by day</h3>' + chart(model.weekChart, pmacSeries, { id: "wp", missing: true, label: "P-Mac packages this week" }) + '</div>' +
      '<div class="dm-panel"><h3>E-com labels and retail counter by day</h3>' + chart(model.weekChart, mixSeries, { id: "wm", label: "E-com and retail counter this week" }) + "</div></div>" +
      '<div class="dm-panel" style="margin-top:12px"><h3>Cases by day</h3>' + chart(model.weekChart, caseSeries, { id: "wc", label: "Cases this week" }) + "</div>" +
      '<h2 class="sub2" style="margin-top:16px">Week by day</h2>' + dayTable(model.weekChart) + "</div>" +
      '<div class="card"><h2>This month</h2><p class="hint">' + esc(rangeLine("Month to date", model.monthFrom, model.today, model.priorMonthFrom, model.priorMonthTo)) + "</p>" +
      tiles(model.month.rolls, model.priorMonth.rolls) +
      banner(model.month.cells) +
      '<div class="dm-panel"><h3>P-Mac packages, month to date</h3>' + chart(model.month.cells, pmacSeries, { id: "mp", missing: true, label: "P-Mac packages this month" }) + "</div>" +
      '<div class="dm-charts two" style="margin-top:12px"><div class="dm-panel"><h3>E-com labels and retail counter</h3>' + chart(model.month.cells, mixSeries, { id: "mm", label: "E-com and retail counter this month" }) + '</div>' +
      '<div class="dm-panel"><h3>Cases</h3>' + chart(model.month.cells, caseSeries, { id: "mc", label: "Cases this month" }) + "</div></div>" +
      '<h2 class="sub2" style="margin-top:16px">Week by week, P-Mac packages</h2><p class="hint">Each bar is only the days in that week that fall inside this month. A hatched bar is not a zero.</p>' + weekBars(model) +
      '<h2 class="sub2" style="margin-top:16px">Month by day</h2>' + dayTable(model.month.cells) + "</div>" +
      '<div class="card">' + footnote(model) + '<p class="hint">Sources: P-Mac packages and boxes from pmac_history (department P-Mac only). Retail counter bags from production_days when both counter readings are filled in. Cases from production_pallets. E-com labels and Amazon bags from fulfillment_daily. Shipments from shipping_log. Receipts from receiving_log. Quality checks from quality_logs.</p></div>' +
      "</div>";
  }

  function dayView(model, iso) {
    var cell = statusFor(model.lookup, iso);
    var rolls = {};
    METRICS.forEach(function (m) { rolls[m.id] = rollup([cell], m.id); });
    var runs = (cell.pmac && cell.pmac.runs) || [];
    var palletRows = (cell.cases && cell.cases.rows) || (model.lookup.cases[iso] && model.lookup.cases[iso].rows) || [];
    var counter = model.lookup.counter[iso];
    var fulfill = model.lookup.fulfill[iso];
    var runTable = "";
    if (runs.length) {
      runTable = '<h2 class="sub2">P-Mac runs</h2><div class="tblwrap"><table><thead><tr><th>Shift</th><th>Operator</th><th>Flavor</th><th>Size</th><th class="right">Packages</th><th class="right">Boxes</th></tr></thead><tbody>' +
        runs.map(function (r) {
          var flavor = (r.flavor_code ? r.flavor_code + " " : "") + (r.flavor_name || "");
          return "<tr><td>" + esc(r.shift || "") + "</td><td>" + esc(r.operator || "") + "</td><td>" + esc(flavor) + "</td><td>" + esc(r.bag_size || "") + '</td><td class="right">' + esc(r.total_pkgs == null || r.total_pkgs === "" ? "No data" : fmt(num(r.total_pkgs))) + '</td><td class="right">' + esc(r.box_count == null || r.box_count === "" ? "No data" : fmt(num(r.box_count))) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    } else if (cell.pmac && cell.pmac.kind === "missing") {
      runTable = '<div class="dm-banner">No P-Mac rows for this weekday. This is missing data, not zero packages.</div>';
    } else if (cell.pmac && cell.pmac.kind === "pending") {
      runTable = '<div class="dm-banner">No P-Mac row for today yet.</div>';
    }
    var palletTable = "";
    if (palletRows.length) {
      palletTable = '<h2 class="sub2">Pallets</h2><div class="tblwrap"><table><thead><tr><th>Line</th><th>Flavor</th><th class="right">Cases</th><th>Notes</th></tr></thead><tbody>' +
        palletRows.map(function (r) {
          return "<tr><td>" + esc(r.line || "") + "</td><td>" + esc(r.flavor_code || "") + '</td><td class="right">' + esc(num(r.cases) == null ? "No data" : fmt(num(r.cases))) + "</td><td>" + esc(r.notes || "") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    var notes = "";
    if (counter && counter.notes) notes += "<p class=\"hint dm-note\"><b>Retail note.</b> " + esc(counter.notes) + "</p>";
    if (fulfill && (fulfill.notes || fulfill.by)) notes += "<p class=\"hint\"><b>Fulfillment.</b> " + esc(fulfill.by ? ("Entered by " + fulfill.by + ". ") : "") + esc(fulfill.notes || "") + "</p>";
    return '<div id="dm-root"><div class="card"><div class="suprow"><h2 style="margin:0;flex:1">' + esc(pretty(iso)) + '</h2>' +
      '<button type="button" class="ghost sm" onclick="DAILYMETRICS.showOverview()">Back to week and month</button></div>' +
      '<p class="hint">One day. No data means that feed has no row for this date.</p>' +
      tiles(rolls, null) + runTable + palletTable + notes + "</div></div>";
  }

  function markup() {
    if (!state.model) {
      return '<div id="dm-root"><div class="card"><h2>Daily Metrics</h2><p class="hint">' + esc(state.err || "Loading this week and this month...") + "</p></div></div>";
    }
    if (state.mode === "day" && state.day) return dayView(state.model, state.day);
    return overview(state.model);
  }
  function paint() {
    if (!root || !root.document) return;
    var host = root.document.getElementById("view");
    if (!host || !host.querySelector("#dm-root")) return;
    var busy = root.SMK_BUSY || [];
    for (var i = 0; i < busy.length; i++) { try { if (busy[i]()) return; } catch (e) {} }
    var ae = root.document.activeElement;
    if (ae && host.contains(ae) && ae.closest && !ae.closest("#dm-root") && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    host.innerHTML = markup();
  }
  function go() {
    if (root && typeof root.UI_go === "function") root.UI_go("daily");
    else paint();
  }

  function view() {
    ensureStyle();
    if (!state.loaded && !state.loading) {
      state.loading = true;
      state.err = "";
      var gen = ++state.gen;
      var today = denverToday(new Date());
      load(today).then(function (model) {
        if (gen !== state.gen) return;
        state.model = model;
        state.loaded = true;
        state.loading = false;
        paint();
      }).catch(function (e) {
        if (gen !== state.gen) return;
        state.loading = false;
        state.err = (e && e.message) || "Could not load Daily Metrics.";
        paint();
      });
    }
    return markup();
  }
  function openDay(iso) {
    iso = ymd(iso);
    if (!iso) return;
    state.mode = "day";
    state.day = iso;
    go();
  }
  function showOverview() {
    state.mode = "overview";
    state.day = "";
    go();
  }
  function reload() {
    state.loaded = false;
    state.loading = false;
    state.model = null;
    state.err = "";
    state.gen++;
    go();
  }

  var api = {
    view: view,
    openDay: openDay,
    showOverview: showOverview,
    reload: reload
  };
  api.forTest = {
    buildModel: buildModel,
    isPmacDept: isPmacDept,
    weekStart: weekStart,
    addDays: addDays,
    denverToday: denverToday,
    rollup: rollup,
    compareNote: compareNote,
    cellText: cellText,
    pretty: pretty,
    METRICS: METRICS,
    html: function (model, mode, day) {
      var prev = { mode: state.mode, day: state.day, model: state.model };
      state.model = model;
      state.mode = mode || "overview";
      state.day = day || "";
      var out = markup();
      state.mode = prev.mode;
      state.day = prev.day;
      state.model = prev.model;
      return out;
    }
  };
  if (root) root.DAILYMETRICS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api.forTest;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));

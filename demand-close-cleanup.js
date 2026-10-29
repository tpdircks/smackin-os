/* ============================================================================
   Smackin' OS - Demand close cleanup (demand-close-cleanup.js)
   One-shot, cloud-gated pass that writes demand_lines.status = 'Shipped'.

   The Order Board, Build Need, and Production Schedule all count
   DB.demandLines() rows whose status is Open. demand-autoclose.js only
   repaints a line as Shipped in the browser after 60 days. It does not
   write the database, so past-due September and early October POs stayed
   open. This module persists the close. It does not de-dupe lines. Target
   per-DC rows share a PO and each keeps its own case count.

   Close an Open, non-Target PO (every demand_lines row for that PO) when:
     1. orders has at least one row whose customer_po matches, and every
        matching row is Complete. A mix of Complete and anything else stays
        Open, with a review:mixed-orders note.
     2. Otherwise, when every line has a due date and the latest due date is
        at least 14 calendar days before today in America/Denver.
        2026-10-15 closes on 2026-10-29. 2026-10-16 stays open.
        A blank due date is not past-due. Those lines stay Open with a Due?
        note.

   PO match: trim, compare the letters and digits, and also the DEMAND.orderNum
   form (text before a dash, then a leading 10001 stripped). Target is never
   closed here. A 2026-10-29 read found no orders match, no shipping_log PO,
   and no 856 for the open Target POs, so they stay Open for Troy.

   Idempotent. localStorage flag demand-close-2026-10-29-v1 skips later loads.
   Bump the flag to run the pass again. ?demandclose=dry logs the plan and
   does not write. ?demandclose=force ignores the flag.
   ========================================================================== */
(function (root) {
  "use strict";

  var FLAG = "demand-close-2026-10-29-v1";
  var PAST_DUE_DAYS = 14;
  var NOTE_COMPLETE = "auto:orders-complete";
  var NOTE_PAST = "auto:past-due";
  var NOTE_MIXED = "review:mixed-orders";
  var NOTE_DUE = "Due?";
  var PAGE = 1000;
  var READ_CAP = 20000;
  var WRITE_CHUNK = 80;

  function alnum(s) {
    return String(s == null ? "" : s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  // Same rule as DEMAND.orderNum: drop a DC suffix, then strip a Target
  // 10001 prefix (10001 plus the order digits).
  function orderNum(po) {
    po = String(po == null ? "" : po).trim();
    var base = po.split("-")[0];
    var m = base.match(/^10001(\d+)$/);
    return m ? m[1] : base;
  }

  function keysOf(po) {
    var keys = [];
    function add(k) { if (k && keys.indexOf(k) < 0) keys.push(k); }
    add(alnum(orderNum(po)));
    // Punctuation still compares. A dash suffix is a DC, so it is not glued
    // back onto the PO (10001123456-055 must not become a different number).
    if (String(po == null ? "" : po).indexOf("-") < 0) add(alnum(po));
    return keys;
  }

  function isTargetPartner(p) {
    return /target/i.test(String(p || ""));
  }

  function dueISO(d) {
    if (d == null) return "";
    d = String(d).trim();
    if (!d) return "";
    var m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (m) return "20" + m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    return "";
  }

  function mountainToday(now) {
    var dt = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    var parts = fmt.formatToParts(dt);
    var y = "", m = "", day = "";
    parts.forEach(function (p) {
      if (p.type === "year") y = p.value;
      else if (p.type === "month") m = p.value;
      else if (p.type === "day") day = p.value;
    });
    if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(day)) throw new Error("bad mountain date");
    return y + "-" + m + "-" + day;
  }

  function daysBefore(due, today) {
    var a = Date.parse(due + "T00:00:00Z");
    var b = Date.parse(today + "T00:00:00Z");
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function withNote(existing, tag) {
    var cur = String(existing == null ? "" : existing).trim();
    tag = String(tag || "").trim();
    if (!tag) return cur;
    if (cur.indexOf(tag) >= 0) return cur;
    return cur ? cur + " | " + tag : tag;
  }

  function isCompleteStatus(status) {
    return String(status || "").trim().toLowerCase() === "complete";
  }

  function boardKey(r) {
    return String(r && r.source || "") + "\t" + String(r && r.po || "");
  }

  function sumNum(lines, field) {
    return lines.reduce(function (s, r) { return s + (Number(r[field]) || 0); }, 0);
  }

  function plan(demandLines, orders, todayISO) {
    var orderRows = [];
    (orders || []).forEach(function (o, idx) {
      if (!o || o.customer_po == null || String(o.customer_po).trim() === "") return;
      var keys = keysOf(o.customer_po);
      if (!keys.length) return;
      orderRows.push({ idx: idx, status: o.status, keys: keys });
    });
    var byKey = {};
    orderRows.forEach(function (o) {
      o.keys.forEach(function (k) {
        if (!byKey[k]) byKey[k] = [];
        byKey[k].push(o);
      });
    });

    var groups = {};
    var groupOrder = [];
    (demandLines || []).forEach(function (r) {
      if (!r || String(r.status || "Open") !== "Open") return;
      var canon = alnum(orderNum(r.po)) || alnum(r.po) || boardKey(r);
      if (!groups[canon]) {
        groups[canon] = { lines: [] };
        groupOrder.push(canon);
      }
      groups[canon].lines.push(r);
    });

    var board = {};
    var ship = [];
    var notes = [];
    var report = {
      today: todayISO,
      pastDueDays: PAST_DUE_DAYS,
      beforeOpenPOs: 0,
      beforeOpenLines: 0,
      closeComplete: [],
      closePastDue: [],
      leftTarget: [],
      leftMixed: [],
      leftOpen: [],
      dueUnknown: []
    };

    groupOrder.forEach(function (gk) {
      var lines = groups[gk].lines;
      var poKeys = {};
      var partners = {};
      lines.forEach(function (r) {
        poKeys[boardKey(r)] = true;
        partners[String(r.partner || "")] = true;
        report.beforeOpenLines++;
      });
      Object.keys(poKeys).forEach(function (k) {
        if (!board[k]) {
          board[k] = true;
          report.beforeOpenPOs++;
        }
      });

      var target = false;
      Object.keys(partners).forEach(function (p) { if (isTargetPartner(p)) target = true; });

      var seenOrder = {};
      var matchList = [];
      lines.forEach(function (r) {
        keysOf(r.po).forEach(function (k) {
          (byKey[k] || []).forEach(function (o) {
            if (seenOrder[o.idx]) return;
            seenOrder[o.idx] = true;
            matchList.push(o);
          });
        });
      });
      var completeN = 0;
      var otherN = 0;
      matchList.forEach(function (o) {
        if (isCompleteStatus(o.status)) completeN++;
        else otherN++;
      });
      var allComplete = matchList.length > 0 && otherN === 0;
      var mixed = completeN > 0 && otherN > 0;

      var blank = false;
      var maxDue = "";
      lines.forEach(function (r) {
        var due = dueISO(r.due_date);
        if (!due) blank = true;
        else if (!maxDue || due > maxDue) maxDue = due;
      });
      var age = maxDue ? daysBefore(maxDue, todayISO) : null;
      var past = !blank && age != null && age >= PAST_DUE_DAYS;

      var pos = [];
      lines.forEach(function (r) {
        var p = String(r.po || "");
        if (pos.indexOf(p) < 0) pos.push(p);
      });
      var summary = {
        partner: Object.keys(partners).filter(Boolean).sort().join(", "),
        pos: pos,
        boardPOs: Object.keys(poKeys).length,
        lines: lines.length,
        bags: sumNum(lines, "bags"),
        cases: sumNum(lines, "cases"),
        due: maxDue,
        orderRows: matchList.length,
        completeRows: completeN,
        otherRows: otherN
      };

      var reason = "";
      if (target) report.leftTarget.push(summary);
      else if (allComplete) {
        reason = "orders-complete";
        report.closeComplete.push(summary);
      } else if (mixed) report.leftMixed.push(summary);
      else if (past) {
        reason = "past-due";
        report.closePastDue.push(summary);
      } else report.leftOpen.push(summary);
      if (!target && !reason && !mixed && blank) report.dueUnknown.push(summary);

      lines.forEach(function (r) {
        var tag = "";
        var nextStatus = "Open";
        if (reason === "orders-complete") {
          nextStatus = "Shipped";
          tag = NOTE_COMPLETE;
        } else if (reason === "past-due") {
          nextStatus = "Shipped";
          tag = NOTE_PAST;
        } else if (!target && mixed) {
          tag = NOTE_MIXED;
          if (!dueISO(r.due_date)) tag = withNote(tag, NOTE_DUE);
        } else if (!target && !dueISO(r.due_date)) tag = NOTE_DUE;
        var nextNotes = withNote(r.notes, tag);
        var prevNotes = String(r.notes == null ? "" : r.notes).trim();
        var statusChanged = nextStatus !== "Open";
        if (!statusChanged && nextNotes === prevNotes) return;
        var patch = {
          id: r.id,
          source: r.source || "",
          po: r.po || "",
          notes: nextNotes
        };
        if (statusChanged) patch.status = "Shipped";
        if (statusChanged) ship.push(patch);
        else notes.push(patch);
      });
    });

    return { ship: ship, notes: notes, report: report };
  }

  function modeFlag() {
    var q = "";
    try { q = String(root.location && root.location.search || ""); } catch (e) { q = ""; }
    if (/demandclose=dry/.test(q)) return "dry";
    if (/demandclose=force/.test(q)) return "force";
    try { if (root.localStorage && root.localStorage.getItem("demand-close-dry") === "1") return "dry"; } catch (e2) {}
    return "";
  }

  function done() {
    try { return root.localStorage.getItem(FLAG) || ""; } catch (e) { return ""; }
  }
  function markDone() {
    try { root.localStorage.setItem(FLAG, new Date().toISOString()); } catch (e) {}
  }

  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!root.__demandCloseClient) {
      try {
        root.__demandCloseClient = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "demand-close-auth" }
        });
      } catch (e) { return null; }
    }
    return root.__demandCloseClient;
  }

  function ready() {
    return !!(root.DB && root.DB.mode === "cloud" && client());
  }

  async function readAll(sb, table, columns, eq) {
    var out = [];
    var from = 0;
    while (out.length < READ_CAP) {
      var q = sb.from(table).select(columns).order("id", { ascending: true });
      if (eq) q = q.eq(eq.col, eq.val);
      var res = await q.range(from, from + PAGE - 1);
      if (res && res.error) throw new Error(res.error.message || "read failed");
      var part = (res && res.data) || [];
      for (var i = 0; i < part.length; i++) out.push(part[i]);
      if (part.length < PAGE) break;
      from += part.length;
    }
    return out;
  }

  async function applyPatches(sb, patches) {
    var groups = {};
    var order = [];
    patches.forEach(function (p) {
      if (!p || p.id == null || p.id === "") throw new Error("demand line is missing an id");
      var key = (p.status || "") + "\n" + (p.notes || "");
      if (!groups[key]) {
        groups[key] = { status: p.status || "", notes: p.notes || "", ids: [] };
        order.push(key);
      }
      groups[key].ids.push(p.id);
    });
    for (var i = 0; i < order.length; i++) {
      var g = groups[order[i]];
      for (var j = 0; j < g.ids.length; j += WRITE_CHUNK) {
        var ids = g.ids.slice(j, j + WRITE_CHUNK);
        var body = { notes: g.notes };
        if (g.status) body.status = g.status;
        var q = sb.from("demand_lines").update(body).in("id", ids).eq("status", "Open");
        var res = await q.select("id");
        if (res && res.error) throw new Error(res.error.message || "update failed");
        var wrote = (res && res.data) || [];
        if (wrote.length !== ids.length) throw new Error("updated " + wrote.length + " of " + ids.length + " demand lines");
      }
    }
  }

  function bucketPOs(list) {
    return list.reduce(function (s, row) { return s + (row.boardPOs || 0); }, 0);
  }

  function summaryLine(report) {
    return {
      beforeOpenPOs: report.beforeOpenPOs,
      beforeOpenLines: report.beforeOpenLines,
      closedByComplete: bucketPOs(report.closeComplete),
      closedByPastDue: bucketPOs(report.closePastDue),
      leftTarget: bucketPOs(report.leftTarget),
      leftMixed: bucketPOs(report.leftMixed),
      leftOpen: bucketPOs(report.leftOpen),
      dueUnknown: bucketPOs(report.dueUnknown)
    };
  }

  async function audit(sb, report) {
    var counts = summaryLine(report);
    var res = await sb.from("transactions").insert({
      action: "Demand auto-close",
      detail: "orders-complete " + counts.closedByComplete + " POs; past-due " + counts.closedByPastDue + " POs; left open " + (counts.leftTarget + counts.leftMixed + counts.leftOpen),
      operator: FLAG
    });
    if (res && res.error) throw new Error(res.error.message || "audit failed");
  }

  var busy = false;
  async function run() {
    var flag = modeFlag();
    if (flag !== "force" && flag !== "dry" && done()) return true;
    if (!ready() || busy) return false;
    busy = true;
    var dry = flag === "dry";
    try {
      var today = mountainToday(new Date());
      var sb = client();
      var lines = await readAll(sb, "demand_lines", "id,source,partner,po,due_date,status,notes,bags,cases", { col: "status", val: "Open" });
      var orders = await readAll(sb, "orders", "id,customer_po,status", null);
      var planned = plan(lines, orders, today);
      console.log("[demand-close]", dry ? "dry" : "plan", summaryLine(planned.report));
      if (!dry) {
        var patches = planned.ship.concat(planned.notes);
        if (patches.length) {
          await applyPatches(sb, patches);
          try { await audit(sb, planned.report); } catch (err) { console.warn("[demand-close] audit", err && err.message ? err.message : err); }
          try { if (root.DB && root.DB.refresh) await root.DB.refresh(); } catch (e2) {}
        }
        markDone();
      }
      busy = false;
      return true;
    } catch (e) {
      console.warn("[demand-close]", e && e.message ? e.message : e);
      busy = false;
      return false;
    }
  }

  root.DEMANDCLOSE = {
    FLAG: FLAG,
    PAST_DUE_DAYS: PAST_DUE_DAYS,
    NOTE_COMPLETE: NOTE_COMPLETE,
    NOTE_PAST: NOTE_PAST,
    NOTE_MIXED: NOTE_MIXED,
    NOTE_DUE: NOTE_DUE,
    plan: plan,
    withNote: withNote,
    keysOf: keysOf,
    orderNum: orderNum,
    dueISO: dueISO,
    mountainToday: mountainToday,
    daysBefore: daysBefore,
    isTargetPartner: isTargetPartner,
    summaryLine: summaryLine,
    run: run
  };

  var tries = 0;
  function tick() {
    run().then(function (ok) {
      if (!ok && ++tries < 240) setTimeout(tick, 500);
    });
  }
  function start() { tick(); }
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);

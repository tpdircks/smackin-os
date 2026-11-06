/* Smackin' OS - Demand close review.
   Age is evidence for a review queue, never proof that a PO shipped.
   SPS is Complete only from the SPS Order document. A due date, ASN, invoice,
   or age cannot close it. ShipStation demand remains Open until a source-backed
   status update or a human review. Existing Shipped rows are never rewritten.
   This module plans source evidence but performs no automatic demand writes.
*/
(function (root) {
  "use strict";

  var FLAG = "demand-close-2026-10-29-v1";
  var PAST_DUE_DAYS = 14;
  var NOTE_COMPLETE = "auto:orders-complete";
  var NOTE_MIXED = "review:mixed-orders";
  var NOTE_DUE = "Due?";
  var PAGE = 1000;
  var READ_CAP = 20000;

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

  function isSpsLine(r) {
    if (!r) return false;
    if (String(r.source || "") === "SPS") return true;
    if (String(r.imported_by || "") === "SPS Feed") return true;
    var batch = String(r.batch_id || "");
    return batch === "SPS-FEED" || batch === "SPS-TEST";
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
      reviewSource: [],
      leftPastDue: [],
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
      var sps = lines.some(isSpsLine);

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
      else if (sps) report.leftOpen.push(summary);
      else report.reviewSource.push(summary);
      if (mixed) report.leftMixed.push(summary);
      if (past) report.leftPastDue.push(summary);
      if (blank) report.dueUnknown.push(summary);
      // No implicit Shipped writes. The report remains read-only so the human
      // or source-owner can verify each source before a separate status action.
      lines.forEach(function (r) {
        if (target || sps) return;
        var tag = mixed ? NOTE_MIXED : "";
        if (!dueISO(r.due_date)) tag = withNote(tag, NOTE_DUE);
        var nextNotes = withNote(r.notes, tag);
        if (nextNotes === String(r.notes == null ? "" : r.notes).trim()) return;
        notes.push({ id: r.id, source: r.source || "", po: r.po || "", notes: nextNotes });
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

  function bucketPOs(list) {
    return list.reduce(function (s, row) { return s + (row.boardPOs || 0); }, 0);
  }
  function summaryLine(report) {
    return {
      beforeOpenPOs: report.beforeOpenPOs,
      beforeOpenLines: report.beforeOpenLines,
      closedByComplete: 0,
      closedByPastDue: 0,
      sourceReview: bucketPOs(report.reviewSource),
      pastDueReview: bucketPOs(report.leftPastDue),
      leftTarget: bucketPOs(report.leftTarget),
      leftMixed: bucketPOs(report.leftMixed),
      leftOpen: bucketPOs(report.leftOpen),
      dueUnknown: bucketPOs(report.dueUnknown)
    };
  }
  var busy = false;
  async function run() {
    var flag = modeFlag();
    if (!ready() || busy) return false;
    busy = true;
    try {
      var sb = client();
      var lines = await readAll(sb, "demand_lines", "id,source,partner,po,due_date,status,notes,bags,cases", { col: "status", val: "Open" });
      var orders = await readAll(sb, "orders", "id,customer_po,status", null);
      var planned = plan(lines, orders, mountainToday(new Date()));
      console.log("[demand-close] read-only review; no Shipped writes", summaryLine(planned.report));
      if (flag === "force") console.log("[demand-close] source-check review returned " + planned.report.reviewSource.length + " PO groups");
      busy = false;
      return true;
    } catch (e) {
      console.warn("[demand-close] review read failed; no demand was changed", e && e.message ? e.message : e);
      busy = false;
      return false;
    }
  }

  root.DEMANDCLOSE = {
    FLAG: FLAG,
    PAST_DUE_DAYS: PAST_DUE_DAYS,
    NOTE_COMPLETE: NOTE_COMPLETE,
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
    isSpsLine: isSpsLine,
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

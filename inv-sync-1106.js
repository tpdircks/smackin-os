/* inv-sync-1106.js
   One cloud pass for Adriana's Nov 5, 2026 count, including lot-level
   raw materials. Seasoning, seed, maltodextrin, oil, and stevia are
   set per lot. The shared done flag stops a later browser from writing
   the same pass again. Every line is applied, already matching, or held
   with a reason. The report is saved for Data Health. */
(function (root) {
  "use strict";
  var LOCAL_FLAG = "smackin_inv_sync_1106_lots_done";
  var CLOUD_KEY = "inv-sync-2026-11-05-lots";
  var REPORT_KEY = "inv-sync-2026-11-05-lots-report";
  var LOCK_MS = 180000;
  var busy = false;
  var myToken = "";

  function planApi() { return root.INV_LOT_PLAN; }
  function latest() { return root.ADRIANA_LATEST; }
  function note() {
    var api = planApi();
    return api ? api.OPERATOR : "inventory sync from Adriana count 2026-11-05";
  }
  function headers() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "x-smk-operator": note(),
      "x-smk-note": note()
    };
  }
  function baseUrl() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
  }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function token() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function enc(v) { return encodeURIComponent(v == null ? "" : String(v)); }
  function ready() {
    var D = root.DB;
    return !!(planApi() && latest() && D && D.mode === "cloud" && D.items && D.items().length && baseUrl() && (root.SMACKIN_CONFIG || {}).SUPABASE_ANON_KEY);
  }
  async function rest(pathname, opts) {
    var res = await fetch(baseUrl() + pathname, opts || { headers: headers(), cache: "no-store" });
    var text = await res.text();
    if (!res.ok) throw new Error(pathname + " " + res.status + " " + text.slice(0, 300));
    return text ? JSON.parse(text) : null;
  }
  async function page(pathname) {
    var out = [];
    var start = 0;
    for (;;) {
      var join = pathname.indexOf("?") >= 0 ? "&" : "?";
      var rows = await rest(pathname + join + "limit=1000&offset=" + start, { headers: headers(), cache: "no-store" });
      rows = rows || [];
      out = out.concat(rows);
      if (rows.length < 1000) break;
      start += rows.length;
    }
    return out;
  }
  async function readState() {
    var rows = await rest("/rest/v1/kv_status?key=eq." + enc(CLOUD_KEY) + "&select=value", { headers: headers(), cache: "no-store" });
    var raw = rows && rows[0] ? String(rows[0].value) : "";
    if (raw.indexOf("done:") === 0) return { phase: "done", raw: raw };
    if (raw.indexOf("lock:") === 0) {
      var parts = raw.split(":");
      return { phase: "lock", token: parts[1] || "", exp: Number(parts[2]), raw: raw };
    }
    return { phase: "open", raw: raw };
  }
  async function kvSet(key, value) {
    await rest("/rest/v1/kv_status?on_conflict=key", {
      method: "POST",
      headers: Object.assign(headers(), { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ key: key, value: value })
    });
  }
  async function writeAction(a) {
    if (a.op === "create") {
      await rest("/rest/v1/items", {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "resolution=ignore-duplicates,return=minimal" }),
        body: JSON.stringify({ id: a.item, code: a.item, name: a.desc || a.item, flavor: a.desc || a.item, category: a.category || "other", unit: a.unit || "ea", reorder: 0, supplier: null })
      });
      return;
    }
    if (a.op === "delete") {
      var lot = a.from && a.from.lot != null ? a.from.lot : (a.lot || "");
      var loc = a.from && a.from.location ? a.from.location : a.location;
      await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(loc) + "&lot=eq." + enc(lot), { method: "DELETE", headers: Object.assign(headers(), { Prefer: "return=minimal" }) });
      return;
    }
    if (a.op === "update") {
      var fromLot = a.from && a.from.lot != null ? a.from.lot : (a.lot || "");
      var fromLoc = a.from && a.from.location ? a.from.location : a.location;
      await rest("/rest/v1/stock?item_id=eq." + enc(a.item) + "&location=eq." + enc(fromLoc) + "&lot=eq." + enc(fromLot), {
        method: "PATCH",
        headers: Object.assign(headers(), { Prefer: "return=minimal" }),
        body: JSON.stringify({ qty: a.qty, location: a.location, lot: a.lot || "", expires_on: a.expires_on || null })
      });
      return;
    }
    if (a.op === "insert") {
      await rest("/rest/v1/stock", {
        method: "POST",
        headers: Object.assign(headers(), { Prefer: "return=minimal" }),
        body: JSON.stringify({ item_id: a.item, location: a.location, lot: a.lot || "", qty: a.qty, expires_on: a.expires_on || null })
      });
    }
  }
  async function ensureQuarantineHold(a, items) {
    var plan = planApi();
    if (!plan || typeof plan.holdSpecForAction !== "function") return;
    var spec = plan.holdSpecForAction(a, plan.findItem(items, a.item));
    if (!spec) return;
    var existing = await rest("/rest/v1/hold_log?status=eq.held&item_id=eq." + enc(spec.item_id) + "&select=id,lot&limit=100", { headers: headers(), cache: "no-store" });
    var key = plan.lotKey(spec.lot);
    var hit = (existing || []).some(function (h) { return plan.lotKey(h.lot) === key; });
    if (hit) return;
    await rest("/rest/v1/hold_log", {
      method: "POST",
      headers: Object.assign(headers(), { Prefer: "return=minimal" }),
      body: JSON.stringify({
        hold_at: new Date().toISOString(),
        held_by: spec.held_by,
        item_id: spec.item_id,
        item_name: spec.item_name,
        lot: spec.lot,
        hold_qty: spec.hold_qty,
        hold_reason: spec.hold_reason,
        receiving_log_id: null,
        status: "held"
      })
    });
  }
  async function run() {
    try { if (root.localStorage && localStorage.getItem(LOCAL_FLAG)) return true; } catch (e) {}
    if (!ready() || busy) return false;
    busy = true;
    try {
      var state = await readState();
      if (state.phase === "done") {
        try { localStorage.setItem(LOCAL_FLAG, state.raw); } catch (e) {}
        return true;
      }
      if (state.phase === "lock" && state.token !== myToken && state.exp > Date.now()) return false;
      myToken = myToken || token();
      await kvSet(CLOUD_KEY, "lock:" + myToken + ":" + (Date.now() + LOCK_MS));
      await sleep(1200);
      state = await readState();
      if (!(state.phase === "lock" && state.token === myToken)) return false;
      var items = await page("/rest/v1/items?select=id,code,name,flavor,category,unit&order=id.asc");
      var stock = await page("/rest/v1/stock?select=item_id,location,lot,qty,expires_on,updated_at,coa_received,coa_released_at&order=item_id.asc,location.asc,lot.asc");
      var today = new Date().toISOString().slice(0, 10);
      var planned = planApi().planAll(latest(), stock, items, { today: today, sheetAsOf: latest().sheetAsOf });
      var steps = planned.actions.filter(function (a) { return a.op === "create" || a.op === "delete" || a.op === "update" || a.op === "insert"; });
      var i;
      for (i = 0; i < steps.length; i++) {
        state = await readState();
        if (!(state.phase === "lock" && state.token === myToken)) throw new Error("lost lock");
        await writeAction(steps[i]);
        await ensureQuarantineHold(steps[i], items);
      }
      var touched = {};
      steps.forEach(function (a) { if (a.item) touched[a.item] = 1; });
      var ids = Object.keys(touched);
      for (i = 0; i < ids.length; i++) {
        await rest("/rest/v1/transactions", {
          method: "POST",
          headers: Object.assign(headers(), { Prefer: "return=minimal" }),
          body: JSON.stringify({ ts: new Date().toISOString(), action: "Count/Adjust", detail: ids[i] + " set from Adriana count " + latest().countDate, operator: note() })
        });
      }
      var report = JSON.stringify({
        at: new Date().toISOString(),
        operator: note(),
        countDate: latest().countDate,
        applied: planned.applied.length,
        matching: planned.matching.length,
        held: planned.holds.length,
        holds: planned.holds,
        notes: planned.notes
      });
      await kvSet(REPORT_KEY, report);
      var done = "done:" + new Date().toISOString();
      await kvSet(CLOUD_KEY, done);
      try { localStorage.setItem(LOCAL_FLAG, done); } catch (e) {}
      if (root.console && root.console.log) root.console.log("[inv-sync 11/06] applied " + planned.applied.length + " matching " + planned.matching.length + " held " + planned.holds.length);
      return true;
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn("[inv-sync 11/06]", e);
      try {
        var st = await readState();
        if (st.phase === "lock" && st.token === myToken) await kvSet(CLOUD_KEY, "retry");
      } catch (err) {}
      myToken = "";
      return false;
    } finally { busy = false; }
  }
  var api = { CLOUD_KEY: CLOUD_KEY, REPORT_KEY: REPORT_KEY, LOCAL_FLAG: LOCAL_FLAG, NOTE: note(), run: run };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.INV_SYNC_1106 = api;
  var tries = 0;
  (function tick() {
    run().then(function (done) {
      if (done || tries > 40) return;
      tries += 1;
      setTimeout(tick, 3000);
    });
  })();
})(typeof window !== "undefined" ? window : globalThis);

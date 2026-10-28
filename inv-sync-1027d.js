/* inv-sync-1027d.js
   The only inventory apply module loaded by the app.
   One shared cloud pass for the 2026-10-27 standard 4 oz and 1.5 oz rows in
   slc-count-latest.js. Quantities are read from that file. This module does
   not keep an older count, and it does not run again after the shared done
   flag is set. A new browser reads that flag and does not write.
   A hand count wins. The pass writes only when the qty at the largest
   location is still the post from a sheet sync (blank operator, inv-sync-*,
   or an older sheet-sync label). A person's name on that post, or a qty
   that post does not explain, is left alone.
   Each allowed adjust is awaited and checked with a fresh stock read. */
(function () {
  "use strict";
  var LOCAL_FLAG = "inv-sync-2026-10-27d-cloud";
  var CLOUD_KEY = "inv-sync-2026-10-27d";
  var REPORT_KEY = "inv-sync-2026-10-27d-report";
  var NOTE = "inv-sync-1027d";
  var COUNT_DATE = "2026-10-27";
  var LOCK_MS = 180000;
  var SHEETS = { "Inventory Bags 4 oz": 1, "Inventory Bags 1.5 oz": 1 };
  var HOLD_QTY = 100000;
  var busy = false;
  var myToken = "";

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
  function token() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function headers() {
    var cfg = window.SMACKIN_CONFIG || {};
    return { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY };
  }
  function baseUrl() {
    var cfg = window.SMACKIN_CONFIG || {};
    return String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
  }
  function ready() {
    var src = window.SLC_COUNT;
    return !!(window.DB && DB.mode === "cloud" && DB.itemByCode && DB.adjustTotal && DB.onHand
      && DB.kvSet && DB.kvCloudOn && DB.kvCloudOn()
      && DB.items && DB.items().length > 0
      && src && src.date === COUNT_DATE && src.rows && src.rows.length
      && baseUrl() && (window.SMACKIN_CONFIG || {}).SUPABASE_ANON_KEY);
  }
  function currentRows() {
    var src = window.SLC_COUNT;
    if (!src || src.date !== COUNT_DATE || !src.rows) return [];
    var out = [];
    src.rows.forEach(function (row) {
      if (!row || !row.code) return;
      if (row.sheetDate !== COUNT_DATE) return;
      if (!SHEETS[row.sheet]) return;
      out.push(row);
    });
    return out;
  }
  function findItem(code) {
    var it = DB.itemByCode(code);
    if (it) return it;
    if (code.indexOf("B4-") === 0) return DB.itemByCode("BAG4-" + code.slice(3));
    if (code.indexOf("B15-") === 0) return DB.itemByCode("BAG15-" + code.slice(4));
    return null;
  }
  function onHandOf(it) {
    var n = Number(DB.onHand(it.code || it.id));
    return n === n ? n : NaN;
  }
  function parseState(raw) {
    raw = raw || "";
    if (raw.indexOf("done:") === 0) return { phase: "done", raw: raw };
    if (raw.indexOf("lock:") === 0) {
      var parts = raw.split(":");
      return { phase: "lock", token: parts[1] || "", exp: Number(parts[2]), raw: raw };
    }
    return { phase: "open", raw: raw };
  }
  async function readState() {
    var url = baseUrl() + "/rest/v1/kv_status?key=eq." + encodeURIComponent(CLOUD_KEY) + "&select=value";
    var res = await fetch(url, { cache: "no-store", headers: headers() });
    if (!res.ok) throw new Error("kv read " + res.status);
    var rows = await res.json();
    return parseState(rows && rows[0] ? String(rows[0].value) : "");
  }
  function sumQty(rows) {
    return (rows || []).reduce(function (sum, row) { return sum + (Number(row.qty) || 0); }, 0);
  }
  async function serverStock(it) {
    var ids = [];
    if (it.id) ids.push(String(it.id));
    if (it.code && String(it.code) !== String(it.id)) ids.push(String(it.code));
    var filter = ids.length === 1
      ? ("item_id=eq." + encodeURIComponent(ids[0]))
      : ("or=(" + ids.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")");
    var url = baseUrl() + "/rest/v1/stock?" + filter + "&select=location,qty";
    var res = await fetch(url, { cache: "no-store", headers: headers() });
    if (!res.ok) throw new Error("stock read " + res.status);
    var rows = await res.json();
    return rows || [];
  }
  async function alignedStock(it) {
    var rows = await serverStock(it);
    if (onHandOf(it) === sumQty(rows)) return rows;
    if (typeof DB.refresh === "function") await DB.refresh();
    rows = await serverStock(it);
    if (onHandOf(it) !== sumQty(rows)) throw new Error("on-hand cache does not match stock for " + (it.code || it.id));
    return rows;
  }
  async function releaseIfHeld() {
    var st = await readState();
    if (st.phase === "lock" && st.token === myToken) await DB.kvSet(CLOUD_KEY, "retry");
  }
  async function holdLock() {
    var st = await readState();
    if (!(st.phase === "lock" && st.token === myToken)) return false;
    var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
    var wrote = await DB.kvSet(CLOUD_KEY, claim);
    if (!wrote || !wrote.ok) return false;
    st = await readState();
    return st.phase === "lock" && st.token === myToken;
  }
  function rememberLocal(raw) {
    try { localStorage.setItem(LOCAL_FLAG, raw || new Date().toISOString()); } catch (e) {}
  }
  function isSyncOperator(op) {
    if (op == null) return true;
    var s = String(op).trim();
    if (!s || s === "undefined") return true;
    if (s.indexOf("inv-sync") === 0) return true;
    // Older sheet imports used these labels. A person's name, including a
    // receipt note, is a hand adjustment and wins.
    if (/^Adri Inv\b/i.test(s)) return true;
    if (/sheet sync/i.test(s)) return true;
    if (/8\/24 count/i.test(s)) return true;
    return false;
  }
  function postedQty(detail) {
    var m = String(detail || "").match(/->\s*([0-9][0-9,]*)\s*$/);
    if (!m) return null;
    var n = Number(m[1].replace(/,/g, ""));
    return n === n ? n : null;
  }
  async function countHistory(flavor) {
    var out = [];
    var offset = 0;
    while (out.length < 400) {
      var url = baseUrl() + "/rest/v1/transactions?action=eq.Count/Adjust&detail=like." +
        encodeURIComponent(flavor + " @*") + "&select=operator,detail&order=ts.desc,id.desc&limit=200&offset=" + offset;
      var res = await fetch(url, { cache: "no-store", headers: headers() });
      if (!res.ok) throw new Error("count history " + res.status);
      var rows = await res.json();
      rows = rows || [];
      for (var i = 0; i < rows.length; i++) out.push(rows[i]);
      if (rows.length < 200) break;
      offset += rows.length;
    }
    return out;
  }
  // The count log stores the qty at one location, not the item total.
  // Write only when that posted location qty is still what is there, the
  // operator was a sheet sync, and the live total is that post plus the
  // other locations. A person's name on the post that explains the live
  // qty wins. The sync does not replace it.
  async function ownership(it, stockRows, sheetQty) {
    var currentQty = sumQty(stockRows);
    if (currentQty === sheetQty) return { write: false, reason: "match" };
    var flavor = it && it.flavor ? String(it.flavor).trim() : "";
    if (!flavor) return { write: false, reason: "no flavor", qty: currentQty };
    var pos = (stockRows || []).filter(function (row) { return Number(row.qty) > 0; });
    if (!pos.length) return { write: false, reason: "not a sync leftover", qty: currentQty };
    pos.sort(function (a, b) { return Number(b.qty) - Number(a.qty); });
    var loc = String(pos[0].location || "");
    var locQty = pos.filter(function (row) { return String(row.location || "") === loc; })
      .reduce(function (sum, row) { return sum + Number(row.qty); }, 0);
    var mark = " @ " + loc + ":";
    var rows = await countHistory(flavor);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].detail || "").indexOf(mark) < 0) continue;
      if (postedQty(rows[i].detail) !== locQty) continue;
      if (!isSyncOperator(rows[i].operator)) {
        return { write: false, reason: "manual", operator: rows[i].operator, qty: currentQty };
      }
      return { write: true };
    }
    return { write: false, reason: "not a sync leftover", qty: currentQty };
  }
  async function run() {
    try {
      if (localStorage.getItem(LOCAL_FLAG)) return true;
    } catch (e) {}
    var feed = window.SLC_COUNT;
    if (feed && feed.date && feed.date !== COUNT_DATE) return true;
    if (!ready()) return false;
    if (busy) return false;
    busy = true;
    try {
      var state = await readState();
      if (state.phase === "done") { rememberLocal(state.raw); return true; }
      if (state.phase === "lock" && state.token !== myToken && state.exp > Date.now()) return false;
      myToken = myToken || token();
      var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
      var claimed = await DB.kvSet(CLOUD_KEY, claim);
      if (!claimed || !claimed.ok) return false;
      await sleep(1200);
      state = await readState();
      if (!(state.phase === "lock" && state.token === myToken)) return false;

      var list = currentRows();
      if (!list.length) throw new Error("no 10/27 bag rows");
      var changed = [];
      var kept = [];
      var missed = [];
      for (var i = 0; i < list.length; i++) {
        if (!(await holdLock())) throw new Error("lost lock");
        var row = list[i];
        var sheetQty = Number(row.sheetQty);
        if (sheetQty !== sheetQty || sheetQty < 0 || sheetQty > HOLD_QTY) {
          throw new Error("refusing qty for " + row.code);
        }
        var it = findItem(row.code);
        if (!it) { missed.push(row.code); continue; }
        var stock = await alignedStock(it);
        var before = sumQty(stock);
        var choice = await ownership(it, stock, sheetQty);
        if (!choice.write) {
          if (choice.reason && choice.reason !== "match") kept.push({
            code: row.code, qty: before, reason: choice.reason, operator: choice.operator || ""
          });
          continue;
        }
        await DB.adjustTotal(it, sheetQty, NOTE);
        var after = sumQty(await serverStock(it));
        if (after !== sheetQty) throw new Error(row.code + " read " + after + " after adjust, target " + sheetQty);
        changed.push({ code: row.code, before: before, after: after });
      }
      if (missed.length) {
        console.warn("[inv-sync 10/27d] missing", missed);
        await releaseIfHeld();
        return false;
      }
      var report = JSON.stringify({ at: new Date().toISOString(), rows: changed, kept: kept });
      var saved = await DB.kvSet(REPORT_KEY, report);
      if (!saved || !saved.ok) throw new Error("could not save the discrepancy report");
      var done = "done:" + new Date().toISOString();
      var fin = await DB.kvSet(CLOUD_KEY, done);
      if (!fin || !fin.ok) throw new Error("could not save the done flag");
      rememberLocal(done);
      console.log("[inv-sync 10/27d] applied", changed.length, "kept", kept.length, "of", list.length);
      return true;
    } catch (e) {
      console.warn("[inv-sync 10/27d]", e);
      try { await releaseIfHeld(); } catch (err) {}
      myToken = "";
      return false;
    } finally {
      busy = false;
    }
  }
  var tries = 0;
  (function tick() {
    run().then(function (done) {
      if (!done && ++tries < 400) setTimeout(tick, 2000);
    });
  })();
})();

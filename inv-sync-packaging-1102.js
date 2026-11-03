/* inv-sync-packaging-1102.js
   One cloud pass for the Warehouse Inventory 11/02/2026 packaging block.
   Sheet: Inventory SLC 2026, file 1I-Bz0Eg80AQt8lI88OoP8racbBCAGvznzZX8p-GI17w,
   tab Warehouse Inventory, dated 11/02/2026.
   Troy Dircks authorized these rows so the sheet total is the OS on-hand
   total (sum of every location). Bag rows stay on inv-sync-1102.js.
   Increases park in RECEIVING on lot PACK-1102 via DB.receive, so a negative
   RECEIVING lot is not deleted by fn_apply_delta.
   Decreases use DB.adjustTotal. RETURNS, RETURNS-HOLD, QUARANTINE, and
   QA-HOLD are never moved. If the drop is larger than the biggest open
   location, the rest is peeled from other open locations, largest first.
   A fresh stock read must equal the target or the pass does not finish.
   The shared done flag stops every later browser from writing again.
   Held, not written: SUP-BOX / SUP-BOXX (sheet #12124 / #12126 look swapped),
   POLY-LG (26000 vs sheet 21000), pallets, DHL, USPS, BOX BLUE INFLUENCER,
   Card Fast delivery Amazon, Box White 0, Hunting Seat box 0,
   and the Salt & Vinegar display head (200).
   Sheet "Label Papper" HL-1785353 qty 80850 is SUP-LABPAP. There is no
   SUP-LABOB item, so that id is not created. */
(function (root) {
  "use strict";
  var LOCAL_FLAG = "inv-sync-packaging-2026-11-02-cloud";
  var CLOUD_KEY = "inv-sync-packaging-2026-11-02";
  var REPORT_KEY = "inv-sync-packaging-2026-11-02-report";
  var NOTE = "inv-sync-packaging-1102";
  var PACK_LOT = "PACK-1102";
  var LOCK_MS = 180000;
  var SKIP_LOCS = { "RETURNS": 1, "QUARANTINE": 1, "QA-HOLD": 1, "RETURNS-HOLD": 1 };
  var CREATES = [
    {
      code: "BOX-S-14632",
      name: "BABY BUCKET MASTER SPORTS WH 6CT (26 1/8 x 17 1/4 x 7 1/2)",
      flavor: "BABY BUCKET MASTER SPORTS WH 6CT (26 1/8 x 17 1/4 x 7 1/2)",
      category: "BUCKETS BOX",
      unit: "box",
      reorder: 0,
      supplier: null,
      qty: 4300
    },
    {
      code: "BKT-STICKER-PIZZA",
      name: "Bucket Stickers - Pizza",
      flavor: "Pizza",
      category: "sticker",
      unit: "each",
      reorder: 0,
      supplier: null,
      qty: 12765
    }
  ];
  var ROWS = [
    { code: "MCASE-BOX", qty: 6375 },
    { code: "BOX-S-14632", qty: 4300 },
    { code: "BOX - BKT SPTS WH 6CT", qty: 1800 },
    { code: "BOX-160086", qty: 8150 },
    { code: "LID - WHITE", qty: 28044 },
    { code: "BKT-UNPR", qty: 2618 },
    { code: "BKT-STD", qty: 1201 },
    { code: "LID-BLUE", qty: 4088 },
    { code: "BKT-SPORTS", qty: 733 },
    { code: "BKT-BOX", qty: 5900 },
    { code: "BKT-CAMO", qty: 159 },
    { code: "LID-BLACK", qty: 139 },
    { code: "CASEBOX-12", qty: 47125 },
    { code: "Box - MC Cashew", qty: 4450 },
    { code: "Box - Cashew 6", qty: 42160 },
    { code: "SUP-DISSHIBOX", qty: 5480 },
    { code: "SUP-BAGDIS", qty: 1880 },
    { code: "LID-DKBLUE", qty: 617 },
    { code: "DISPLAY-4OZ", qty: 5620 },
    { code: "SUP-DISHEA", qty: 6142 },
    { code: "TGT-SHIPPER", qty: 6650 },
    { code: "WM-SHIPPER", qty: 21450 },
    { code: "BOX-24", qty: 1575 },
    { code: "SLV-S01", qty: 12960 },
    { code: "SLV-S03", qty: 2400 },
    { code: "SLV-S04", qty: 18720 },
    { code: "SLV-S05", qty: 1890 },
    { code: "SLV-S07", qty: 25200 },
    { code: "SLV-S08", qty: 10560 },
    { code: "SLV-CHZ", qty: 16640 },
    { code: "SUP-LABECOM", qty: 48000 },
    { code: "BKT-STICKER-PIZZA", qty: 12765 },
    { code: "SUP-LABPAP", qty: 80850 }
  ];
  var busy = false;
  var myToken = "";

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
  function token() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function num(n) {
    var x = Number(n);
    return x === x ? Math.round(x * 1000) / 1000 : 0;
  }
  function same(a, b) { return Math.abs(num(a) - num(b)) < 0.001; }
  function headers() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY };
  }
  function baseUrl() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
  }
  function db() { return root && root.DB; }
  function ready() {
    var D = db();
    return !!(D && D.mode === "cloud" && D.itemByCode && D.adjustTotal && D.adjust && D.receive
      && D.createItem && D.onHand && D.kvSet && D.kvCloudOn && D.kvCloudOn()
      && D.items && D.items().length > 0
      && baseUrl() && (root.SMACKIN_CONFIG || {}).SUPABASE_ANON_KEY);
  }
  function sumQty(rows) {
    return (rows || []).reduce(function (sum, row) { return sum + num(row.qty); }, 0);
  }
  function skipQty(rows) {
    return (rows || []).reduce(function (sum, row) {
      return sum + (SKIP_LOCS[String(row.location || "").toUpperCase()] ? num(row.qty) : 0);
    }, 0);
  }
  function itemIds(it) {
    var ids = [];
    if (it.id) ids.push(String(it.id));
    if (it.code && String(it.code) !== String(it.id)) ids.push(String(it.code));
    return ids;
  }
  function rowsFor(it, rows) {
    var ids = {};
    itemIds(it).forEach(function (id) { ids[id] = 1; });
    return (rows || []).filter(function (row) { return ids[String(row.item_id || "")] || ids[String(row.item || "")]; });
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
  async function serverStock(it) {
    var ids = itemIds(it);
    var filter = ids.length === 1
      ? ("item_id=eq." + encodeURIComponent(ids[0]))
      : ("or=(" + ids.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")");
    var url = baseUrl() + "/rest/v1/stock?" + filter + "&select=item_id,location,qty,lot";
    var res = await fetch(url, { cache: "no-store", headers: headers() });
    if (!res.ok) throw new Error("stock read " + res.status);
    return await res.json() || [];
  }
  async function alignedStock(it) {
    var D = db();
    if (typeof D.refresh === "function") await D.refresh();
    var rows = await serverStock(it);
    var cacheSum = num(D.onHand(it.id || it.code));
    if (!same(cacheSum, sumQty(rows)) && typeof D.refresh === "function") {
      await D.refresh();
      rows = await serverStock(it);
      cacheSum = num(D.onHand(it.id || it.code));
    }
    if (!same(cacheSum, sumQty(rows))) throw new Error("on-hand cache does not match stock for " + (it.code || it.id));
    return rows;
  }
  async function releaseIfHeld() {
    var D = db();
    var st = await readState();
    if (st.phase === "lock" && st.token === myToken) await D.kvSet(CLOUD_KEY, "retry");
  }
  async function holdLock() {
    var D = db();
    var st = await readState();
    if (!(st.phase === "lock" && st.token === myToken)) return false;
    var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
    var wrote = await D.kvSet(CLOUD_KEY, claim);
    if (!wrote || !wrote.ok) return false;
    st = await readState();
    return st.phase === "lock" && st.token === myToken;
  }
  function rememberLocal(raw) {
    try { localStorage.setItem(LOCAL_FLAG, raw || new Date().toISOString()); } catch (e) {}
  }
  async function peel(it, excess) {
    var D = db();
    var guard = 0;
    while (excess > 0.001) {
      if (++guard > 80) throw new Error("could not peel " + (it.code || it.id));
      if (!(await holdLock())) throw new Error("lost lock");
      if (typeof D.refresh === "function") await D.refresh();
      var rows = rowsFor(it, D.stock ? D.stock() : []);
      var by = {};
      rows.forEach(function (row) {
        var loc = String(row.location || "");
        if (SKIP_LOCS[loc.toUpperCase()]) return;
        by[loc] = num((by[loc] || 0) + num(row.qty));
      });
      var locs = Object.keys(by).filter(function (loc) { return by[loc] > 0.001; });
      locs.sort(function (a, b) { return by[b] - by[a]; });
      if (!locs.length) throw new Error("no open location to reduce for " + (it.code || it.id));
      var loc = locs[0];
      var take = Math.min(by[loc], excess);
      var next = num(by[loc] - take);
      if (next < -0.001) throw new Error("refusing a negative location for " + (it.code || it.id));
      await D.adjust(it, loc, next, NOTE);
      excess = num(excess - take);
    }
  }
  async function bringTo(it, target) {
    var D = db();
    var stock = await alignedStock(it);
    var before = num(sumQty(stock));
    var held = num(skipQty(stock));
    if (target < held - 0.001) {
      return { kept: true, before: before, held: held, reason: "below returns or hold qty" };
    }
    if (same(before, target)) return { match: true, before: before, after: before };
    var delta = num(target - before);
    if (delta > 0) {
      await D.receive(it, delta, PACK_LOT, NOTE, { location: "RECEIVING" });
    } else {
      var res = await D.adjustTotal(it, target, NOTE);
      if (res && res.blocked) await peel(it, num(before - target));
      else if (!res || res.ok === false) throw new Error((res && res.msg) || ("adjust failed for " + (it.code || it.id)));
    }
    if (typeof D.refresh === "function") await D.refresh();
    var after = num(sumQty(await serverStock(it)));
    if (!same(after, target)) throw new Error((it.code || it.id) + " read " + after + " after adjust, target " + target);
    return { before: before, after: after };
  }
  async function ensureCreates() {
    var D = db();
    for (var i = 0; i < CREATES.length; i++) {
      if (!(await holdLock())) throw new Error("lost lock");
      var spec = CREATES[i];
      var existing = D.itemByCode(spec.code);
      if (existing) continue;
      var made = await D.createItem({
        code: spec.code, name: spec.name, flavor: spec.flavor,
        category: spec.category, unit: spec.unit, reorder: spec.reorder, supplier: spec.supplier
      }, NOTE);
      if (!made || made.ok === false) throw new Error("create " + spec.code + (made && made.msg ? ": " + made.msg : ""));
      if (!D.itemByCode(spec.code)) throw new Error("missing after create " + spec.code);
    }
  }
  async function run() {
    try {
      if (localStorage.getItem(LOCAL_FLAG)) return true;
    } catch (e) {}
    if (!ready()) return false;
    if (busy) return false;
    busy = true;
    var D = db();
    try {
      var state = await readState();
      if (state.phase === "done") { rememberLocal(state.raw); return true; }
      if (state.phase === "lock" && state.token !== myToken && state.exp > Date.now()) return false;
      myToken = myToken || token();
      var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
      var claimed = await D.kvSet(CLOUD_KEY, claim);
      if (!claimed || !claimed.ok) return false;
      await sleep(1200);
      state = await readState();
      if (!(state.phase === "lock" && state.token === myToken)) return false;

      await ensureCreates();
      var changed = [];
      var kept = [];
      for (var i = 0; i < ROWS.length; i++) {
        if (!(await holdLock())) throw new Error("lost lock");
        var row = ROWS[i];
        var target = num(row.qty);
        if (target < 0 || target > 100000) throw new Error("refusing qty for " + row.code);
        var it = D.itemByCode(row.code);
        if (!it) throw new Error("missing " + row.code);
        var result = await bringTo(it, target);
        if (result.kept) {
          kept.push({ code: row.code, qty: result.before, reason: result.reason, held: result.held, sheet: target });
          continue;
        }
        if (!result.match) changed.push({ code: row.code, before: result.before, after: result.after });
      }
      var report = JSON.stringify({ at: new Date().toISOString(), rows: changed, kept: kept });
      var saved = await D.kvSet(REPORT_KEY, report);
      if (!saved || !saved.ok) throw new Error("could not save the discrepancy report");
      var done = "done:" + new Date().toISOString();
      var fin = await D.kvSet(CLOUD_KEY, done);
      if (!fin || !fin.ok) throw new Error("could not save the done flag");
      rememberLocal(done);
      if (root.console && root.console.log) root.console.log("[inv-sync packaging 11/02] applied", changed.length, "kept", kept.length, "of", ROWS.length);
      return true;
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn("[inv-sync packaging 11/02]", e);
      try { await releaseIfHeld(); } catch (err) {}
      myToken = "";
      return false;
    } finally {
      busy = false;
    }
  }

  var api = {
    NOTE: NOTE,
    PACK_LOT: PACK_LOT,
    CLOUD_KEY: CLOUD_KEY,
    REPORT_KEY: REPORT_KEY,
    LOCAL_FLAG: LOCAL_FLAG,
    SKIP_LOCS: SKIP_LOCS,
    CREATES: CREATES,
    ROWS: ROWS,
    run: run
  };

  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.PACK_SYNC = api;
  var tries = 0;
  (function tick() {
    run().then(function (done) {
      if (!done && ++tries < 400) setTimeout(tick, 2000);
    });
  })();
})(typeof window !== "undefined" ? window : globalThis);

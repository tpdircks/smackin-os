/* ============================================================================
   Smackin' Inventory — data layer
   One interface, two backends:
     - CLOUD  : Supabase (Postgres + realtime) when config keys are present
     - LOCAL  : browser localStorage fallback (single device) otherwise
   The UI (app.js) only ever calls DB.* and never talks to a backend directly.
   ============================================================================ */
window.DB = (function () {
  "use strict";
  const KEY = "smackin_inv_app_v1";
  const cfg = window.SMACKIN_CONFIG || {};
  const seed = window.SMACKIN_SEED;
  let mode = "local";
  let sb = null;                  // supabase client
  let cache = { items: [], suppliers: [], stock: [], pos: [], log: [], seasLots: [], orders: [], rdRequests: [], supplierPos: [], orderDocs: [], consumption: [], seedLots: [], stockBuild: {}, shippingLog: [], receivingLog: [], improvements: [], prodDays: [], prodPallets: [] };
  let subscribers = [];

  function emit() { subscribers.forEach(fn => { try { fn(); } catch (e) {} }); }
  function onChange(fn) { subscribers.push(fn); }

  // ---------- derived reads (work the same in both modes) ----------
  function items() { return cache.items; }
  function suppliers() { return cache.suppliers; }
  function stock() { return cache.stock; }
  function purchaseOrders() { return cache.pos || []; }
  function log() { return cache.log; }
  function seasLots() { return cache.seasLots || []; }
  function seedLots() { return cache.seedLots || []; }
  function stockBuild() { return cache.stockBuild || {}; }
  function shippingLog() { return cache.shippingLog || []; }
  function receivingLog() { return cache.receivingLog || []; }
  function improvements() { return cache.improvements || []; }
  function orders() { return cache.orders || []; }
  function rdRequests() { return cache.rdRequests || []; }
  function supplierPos() { return cache.supplierPos || []; }
  function supplierName(id) { const s = cache.suppliers.find(x => x.id === id); return s ? s.name : id; }
  function itemByCode(code) {
    code = (code || "").trim().toLowerCase();
    if (!code) return null;
    return cache.items.find(i =>
      (i.code || "").toLowerCase() === code ||
      (i.id || "").toLowerCase() === code ||
      (i.name || "").toLowerCase() === code) || null;
  }
  function onHand(id) { return cache.stock.filter(r => r.item_id === id).reduce((s, r) => s + Number(r.qty), 0); }
  function atLoc(id, loc) { return cache.stock.filter(r => r.item_id === id && r.location === loc).reduce((s, r) => s + Number(r.qty), 0); }

  // ---------- LOCAL backend ----------
  const local = {
    loadOrSeed() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) {}
      if (raw) { cache = JSON.parse(raw); if (!cache.pos) cache.pos = []; if (!cache.log) cache.log = []; if (!cache.seasLots) cache.seasLots = []; if (!cache.orders) cache.orders = []; if (!cache.rdRequests) cache.rdRequests = []; if (!cache.supplierPos) cache.supplierPos = []; if (!cache.orderDocs) cache.orderDocs = []; if (!cache.consumption) cache.consumption = []; if (!cache.seedLots) cache.seedLots = []; if (!cache.stockBuild) cache.stockBuild = {}; if (!cache.shippingLog) cache.shippingLog = []; if (!cache.receivingLog) cache.receivingLog = []; if (!cache.improvements) cache.improvements = []; return; }
      const s = seed.build();
      cache = { items: s.items, suppliers: s.suppliers, stock: s.stock, pos: [], log: [], seasLots: [], orders: [], rdRequests: [], supplierPos: [], orderDocs: [], consumption: [], seedLots: [], stockBuild: {}, shippingLog: [], receivingLog: [], improvements: [], prodDays: [], prodPallets: [] };
      this.save();
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {} },
    delta(item_id, location, d, lot) {
      lot = lot || null;
      let row = cache.stock.find(r => r.item_id === item_id && r.location === location && (r.lot || null) === lot);
      if (!row) { row = { item_id, location, qty: 0, lot }; cache.stock.push(row); }
      row.qty = Number(row.qty) + d;
      if (row.qty <= 0) cache.stock = cache.stock.filter(r => r !== row);
    },
    addLog(entry) { cache.log.unshift(entry); if (cache.log.length > 500) cache.log.pop(); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} this.loadOrSeed(); }
  };

  // ---------- CLOUD backend (Supabase) ----------
  const cloud = {
    async loadAll() {
      const [it, su, st, lg, po, pl, sl, od, rd, sp, odc, con, sdl, sbd, slog, rlog, imp, pday, ppal] = await Promise.all([
        sb.from("items").select("*"),
        sb.from("suppliers").select("*"),
        sb.from("stock").select("*"),
        sb.from("transactions").select("*").order("ts", { ascending: false }).limit(500),
        sb.from("purchase_orders").select("*").order("created_at", { ascending: false }),
        sb.from("po_lines").select("*"),
        sb.from("seasoning_lots").select("*").order("exp", { ascending: true }),
        sb.from("orders").select("*").order("created_at", { ascending: false }).limit(2000),
        sb.from("rd_requests").select("*").order("created_at", { ascending: false }).limit(2000),
        sb.from("supplier_pos").select("*").order("created_at", { ascending: false }).limit(2000),
        sb.from("order_docs").select("*").order("created_at", { ascending: false }).limit(3000),
        sb.from("consumption").select("*").order("created_at", { ascending: false }).limit(3000),
        sb.from("seed_lots").select("*").order("created_at", { ascending: false }).limit(3000),
        sb.from("stock_build").select("*").limit(500),
        sb.from("shipping_log").select("*").order("ship_date", { ascending: false }).limit(3000),
        sb.from("receiving_log").select("*").order("recv_date", { ascending: false }).limit(3000),
        sb.from("improvements").select("*").order("created_at", { ascending: false }).limit(3000),
        sb.from("production_days").select("*").limit(2000),
        sb.from("production_pallets").select("*").order("created_at", { ascending: false }).limit(5000)
      ]);
      cache.items = it.data || [];
      cache.suppliers = su.data || [];
      cache.stock = (st.data || []).map(r => ({ item_id: r.item_id, location: r.location, qty: Number(r.qty), lot: r.lot }));
      cache.log = (lg.data || []).map(r => ({ t: r.ts, a: r.action, d: r.detail, u: r.operator }));
      cache.seasLots = (sl && sl.data ? sl.data : []).map(r => ({
        id: r.id, flavor_code: r.flavor_code, product: r.product, lot: r.lot,
        manufacturer: r.manufacturer, exp: r.exp, weight: Number(r.weight) || 0,
        status: r.status || "Good", received_at: r.received_at
      }));
      cache.orders = (od && od.data ? od.data : []).map(r => ({
        id: r.id, customer: r.customer, customer_po: r.customer_po, appointment: r.appointment,
        order_id: r.order_id, stripe_link: r.stripe_link, invoice_date: r.invoice_date,
        ship_date: r.ship_date, tracking: r.tracking, carrier: r.carrier,
        status: r.status || "Open", notes: r.notes, entered_by: r.entered_by, created_at: r.created_at
      }));
      cache.rdRequests = (rd && rd.data ? rd.data : []).map(r => ({
        id: r.id, req_no: r.req_no, req_type: r.req_type, company: r.company,
        contact_name: r.contact_name, contact_email: r.contact_email, items: r.items,
        quantity: r.quantity, needed_by: r.needed_by, purpose: r.purpose,
        requested_by: r.requested_by, status: r.status || "Pending",
        sent_at: r.sent_at, received_at: r.received_at, follow_up: r.follow_up,
        notes: r.notes, created_at: r.created_at
      }));
      cache.supplierPos = (sp && sp.data ? sp.data : []).map(r => ({
        id: r.id, vendor: r.vendor, po_num: r.po_num, po_date: r.po_date, total: r.total,
        item_count: r.item_count, lines: r.lines, file_name: r.file_name, file_url: r.file_url,
        file_path: r.file_path, notes: r.notes, uploaded_by: r.uploaded_by, created_at: r.created_at,
        vendor_addr: r.vendor_addr, vendor_email: r.vendor_email, vendor_phone: r.vendor_phone,
        ship_to: r.ship_to, subtotal: r.subtotal, shipping: r.shipping, tax: r.tax, other: r.other, prepared_by: r.prepared_by
      }));
      cache.orderDocs = (odc && odc.data ? odc.data : []).map(r => ({
        id: r.id, customer: r.customer, po_num: r.po_num, doc_type: r.doc_type, notes: r.notes,
        file_name: r.file_name, file_url: r.file_url, file_path: r.file_path,
        uploaded_by: r.uploaded_by, created_at: r.created_at
      }));
      cache.consumption = (con && con.data ? con.data : []).map(r => ({
        id: r.id, item_code: r.item_code, item_name: r.item_name, qty: Number(r.qty) || 0,
        lot: r.lot, department: r.department, operator: r.operator, created_at: r.created_at
      }));
      cache.seedLots = (sdl && sdl.data ? sdl.data : []).map(r => ({
        id: r.id, seed_code: r.seed_code, product: r.product, lot: r.lot, supplier: r.supplier,
        received_date: r.received_date, weight: Number(r.weight) || 0, status: r.status || "Good", created_at: r.created_at
      }));
      cache.stockBuild = {};
      (sbd && sbd.data ? sbd.data : []).forEach(r => { cache.stockBuild[r.item_key] = { on_hand: Number(r.on_hand) || 0, updated_by: r.updated_by, updated_at: r.updated_at }; });
      cache.shippingLog = (slog && slog.data ? slog.data : []).map(r => ({
        id: r.id, ship_date: r.ship_date, ship_type: r.ship_type, recipient: r.recipient,
        address: r.address, carrier: r.carrier, tracking: r.tracking, requested_by: r.requested_by,
        contents: r.contents, status: r.status || "Shipped", cost: Number(r.cost) || 0,
        notes: r.notes, entered_by: r.entered_by, created_at: r.created_at
      }));
      cache.receivingLog = (rlog && rlog.data ? rlog.data : []).map(r => ({
        id: r.id, recv_date: r.recv_date, supplier: r.supplier, po_num: r.po_num,
        carrier: r.carrier, tracking: r.tracking, contents: r.contents,
        qty_ordered: r.qty_ordered, qty_received: r.qty_received, condition: r.condition || "Good",
        received_by: r.received_by, notes: r.notes, file_name: r.file_name, file_url: r.file_url,
        file_path: r.file_path, entered_by: r.entered_by, created_at: r.created_at
      }));
      cache.improvements = (imp && imp.data ? imp.data : []).map(r => ({
        id: r.id, title: r.title, ci_type: r.ci_type, area: r.area, owner: r.owner,
        priority: r.priority || "Medium", status: r.status || "Idea", problem: r.problem,
        impact: r.impact, opened_date: r.opened_date, completed_date: r.completed_date,
        entered_by: r.entered_by, created_at: r.created_at
      }));
      cache.prodDays = (pday && pday.data ? pday.data : []);
      cache.prodPallets = (ppal && ppal.data ? ppal.data : []);
      const lines = pl.data || [];
      cache.pos = (po.data || []).map(p => ({
        id: p.id, supplier: p.supplier, status: p.status, created: p.created_at,
        ordered: p.ordered, expected: p.expected, operator: p.operator,
        lines: lines.filter(x => x.po_id === p.id).map(x => ({ item_id: x.item_id, qty: Number(x.qty), cost: Number(x.cost), received: Number(x.received) }))
      }));
    },
    // One-time bootstrap: load the item master + opening stock into an empty cloud DB.
    async seedAll() {
      const s = seed.build();
      const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
      if (s.suppliers && s.suppliers.length) await sb.from("suppliers").insert(s.suppliers);
      for (const c of chunk(s.items, 100)) await sb.from("items").insert(c);
      const stockRows = s.stock.map(r => ({ item_id: r.item_id, location: r.location, lot: r.lot || "", qty: r.qty }));
      for (const c of chunk(stockRows, 100)) await sb.from("stock").insert(c);
    },
    async delta(item_id, location, d, lot) {
      // atomic per-row upsert via Postgres function fn_apply_delta (see schema.sql)
      await sb.rpc("fn_apply_delta", { p_item: item_id, p_loc: location, p_delta: d, p_lot: lot || null });
    },
    async addLog(entry) {
      await sb.from("transactions").insert({ action: entry.a, detail: entry.d, operator: entry.u });
    },
    subscribeRealtime() {
      sb.channel("inv")
        .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, async () => { await cloud.loadAll(); emit(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, async () => { await cloud.loadAll(); emit(); })
        .subscribe();
    }
  };

  // ---------- public transaction API ----------
  // Each tx applies one or more stock deltas, writes an audit log row, refreshes, emits.
  async function applyDeltas(deltas, logEntry) {
    if (mode === "cloud") {
      for (const d of deltas) await cloud.delta(d.item_id, d.location, d.delta, d.lot);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      deltas.forEach(d => local.delta(d.item_id, d.location, d.delta, d.lot));
      local.addLog(logEntry);
      local.save();
    }
    emit();
  }

  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString(); }

  // meta: { supplier, invoice, category, pallets, condition, status }
  async function receive(item, qty, lot, op, meta) {
    meta = meta || {};
    const loc = meta.condition === "Quarantine" ? "QUARANTINE" : (meta.location || "RECEIVING");
    const parts = [];
    if (meta.supplier) parts.push("from " + meta.supplier);
    if (meta.invoice) parts.push("inv " + meta.invoice);
    if (meta.pallets) parts.push(meta.pallets + " pal");
    if (lot) parts.push("lot " + lot);
    if (meta.condition && meta.condition !== "Good") parts.push("[" + meta.condition + "]");
    if (meta.status && meta.status !== "Received") parts.push(meta.status);
    const extra = parts.length ? " (" + parts.join(", ") + ")" : "";
    await applyDeltas(
      [{ item_id: item.id, location: loc, delta: qty, lot: lot || null }],
      { a: "Receive", d: fmt(qty) + " " + item.unit + " " + item.flavor + extra + " -> " + loc, u: op, t: new Date().toISOString() }
    );
    return { ok: true, location: loc };
  }
  async function move(item, from, to, qty, op) {
    const avail = atLoc(item.id, from);
    const mv = Math.min(qty, avail);
    if (mv <= 0) return { ok: false, msg: "Nothing at " + from };
    await applyDeltas(
      [{ item_id: item.id, location: from, delta: -mv }, { item_id: item.id, location: to, delta: mv }],
      { a: (from === "RECEIVING" ? "Put-Away" : "Move"), d: fmt(mv) + " " + item.unit + " " + item.flavor + " " + from + " -> " + to, u: op, t: new Date().toISOString() }
    );
    return { ok: true };
  }
  async function adjust(item, loc, newQty, op) {
    const cur = atLoc(item.id, loc);
    await applyDeltas(
      [{ item_id: item.id, location: loc, delta: newQty - cur }],
      { a: "Count/Adjust", d: item.flavor + " @ " + loc + ": " + fmt(cur) + " -> " + fmt(newQty), u: op, t: new Date().toISOString() }
    );
  }
  // Set an item's TOTAL on-hand (location handled automatically) — spreadsheet-style counting.
  async function adjustTotal(item, newTotal, op) {
    newTotal = Number(newTotal);
    const rows = cache.stock.filter(r => r.item_id === item.id);
    const cur = rows.reduce((s, r) => s + Number(r.qty), 0);
    if (newTotal === cur) return { ok: true, unchanged: true };
    let loc;
    if (rows.length) {
      loc = rows.slice().sort((a, b) => Number(b.qty) - Number(a.qty))[0].location;
      const primaryCur = rows.filter(r => r.location === loc).reduce((s, r) => s + Number(r.qty), 0);
      const others = cur - primaryCur;
      await adjust(item, loc, Math.max(newTotal - others, 0), op);
    } else {
      loc = "RECEIVING";
      await adjust(item, loc, newTotal, op);
    }
    return { ok: true, location: loc };
  }
  // Produce finished 4oz bags: +bags, consume 1 film (4oz) impression/bag + seasoning.
  const SEAS_LB_PER_BAG = 0.0035;
  async function produce(flavorCode, qty, loc, op) {
    const bagItem = itemByCode("B4-" + flavorCode) || cache.items.find(i => i.id === "BAG4-" + flavorCode);
    const deltas = [{ item_id: "BAG4-" + flavorCode, location: loc, delta: qty }];
    let detail = "+" + fmt(qty) + " bags " + (bagItem ? bagItem.flavor : flavorCode) + " -> " + loc;
    // consume film from wherever it sits
    let filmNeed = qty, filmUsed = 0;
    cache.stock.filter(r => r.item_id === "FILM4-" + flavorCode).forEach(r => {
      if (filmNeed <= 0) return;
      const take = Math.min(r.qty, filmNeed);
      deltas.push({ item_id: "FILM4-" + flavorCode, location: r.location, delta: -take });
      filmNeed -= take; filmUsed += take;
    });
    let seasNeed = qty * SEAS_LB_PER_BAG, seasUsed = 0;
    cache.stock.filter(r => r.item_id === "SEAS-" + flavorCode).forEach(r => {
      if (seasNeed <= 0) return;
      const take = Math.min(r.qty, seasNeed);
      deltas.push({ item_id: "SEAS-" + flavorCode, location: r.location, delta: -take });
      seasNeed -= take; seasUsed += take;
    });
    detail += " | -" + fmt(filmUsed) + " film, -" + fmt(seasUsed) + " lb seasoning";
    await applyDeltas(deltas, { a: "Produce", d: detail, u: op, t: new Date().toISOString() });
  }
  // ---------- Returns (customer + Amazon) ----------
  // meta: { channel, reason, disposition, rma }
  // Restock -> RETURNS zone; Quarantine -> QUARANTINE; Scrap -> log only (no stock)
  async function returnStock(item, qty, op, meta) {
    meta = meta || {};
    const disp = meta.disposition || "Restock";
    const loc = disp === "Restock" ? "RETURNS" : disp === "Quarantine" ? "QUARANTINE" : null;
    const parts = [];
    if (meta.channel) parts.push(meta.channel);
    if (meta.rma) parts.push("RMA " + meta.rma);
    if (meta.reason) parts.push(meta.reason);
    parts.push("[" + disp + "]");
    const detail = fmt(qty) + " " + item.unit + " " + item.flavor + " (" + parts.join(", ") + ")" + (loc ? " -> " + loc : " (scrapped)");
    const deltas = loc ? [{ item_id: item.id, location: loc, delta: qty, lot: null }] : [];
    await applyDeltas(deltas, { a: "Return", d: detail, u: op, t: new Date().toISOString() });
    return { ok: true, location: loc };
  }

  // ---------- Seasoning lot registry (Lot / Exp / Manufacturer / Weight, FEFO) ----------
  function seasLocalId() { return "SL-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000); }
  async function addSeasLot(rec, op) {
    const row = {
      flavor_code: rec.flavor_code || "", product: rec.product || "", lot: rec.lot || "",
      manufacturer: rec.manufacturer || "", exp: rec.exp || null, weight: Number(rec.weight) || 0,
      status: "Good", received_at: new Date().toISOString()
    };
    const logEntry = { a: "Seasoning lot", d: (row.product || row.flavor_code) + " lot " + row.lot + " " + fmt(row.weight) + " lb (exp " + (row.exp || "n/a") + ")", u: op, t: row.received_at };
    if (mode === "cloud") {
      await sb.from("seasoning_lots").insert(row);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      row.id = seasLocalId();
      cache.seasLots.push(row);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function setSeasLotStatus(id, status, op) {
    const lot = (cache.seasLots || []).find(l => String(l.id) === String(id));
    const logEntry = { a: "Seasoning " + status, d: lot ? ((lot.product || lot.flavor_code) + " lot " + lot.lot) : String(id), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("seasoning_lots").update({ status }).eq("id", id);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      if (lot) lot.status = status;
      local.addLog(logEntry); local.save();
    }
    emit();
  }
  async function updateSeasLot(id, patch, op) {
    const p = { flavor_code: patch.flavor_code || "", product: patch.product || "", lot: patch.lot || "",
      manufacturer: patch.manufacturer || "", exp: patch.exp || null, weight: Number(patch.weight) || 0 };
    const logEntry = { a: "Seasoning edited", d: (p.product || p.flavor_code) + " lot " + p.lot, u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("seasoning_lots").update(p).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      const l = (cache.seasLots || []).find(x => String(x.id) === String(id)); if (l) Object.assign(l, p);
      local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  // Move any Good lot past its expiration into Quarantine. Returns count moved.
  async function quarantineExpiredSeas(op) {
    const today = new Date().toISOString().slice(0, 10);
    const expired = (cache.seasLots || []).filter(l => l.status === "Good" && l.exp && String(l.exp).slice(0, 10) < today);
    for (const l of expired) await setSeasLotStatus(l.id, "Quarantine", op || "system");
    return expired.length;
  }

  // ---------- Shipping Log (outbound shipments: samples, orders, replacements) ----------
  function shipLocalId() { return "SHP-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000); }
  async function addShipping(rec, op) {
    const row = {
      ship_date: rec.ship_date || new Date().toISOString().slice(0, 10),
      ship_type: rec.ship_type || "", recipient: rec.recipient || "", address: rec.address || "",
      carrier: rec.carrier || "", tracking: rec.tracking || "", requested_by: rec.requested_by || "",
      contents: rec.contents || "", status: rec.status || "Shipped", cost: Number(rec.cost) || 0,
      notes: rec.notes || "", entered_by: op || "", created_at: new Date().toISOString()
    };
    const logEntry = { a: "Shipment logged", d: (row.ship_type ? row.ship_type + " - " : "") + row.recipient + (row.tracking ? " (" + row.tracking + ")" : ""), u: op, t: row.created_at };
    if (mode === "cloud") {
      await sb.from("shipping_log").insert(row);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      row.id = shipLocalId();
      cache.shippingLog.unshift(row);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function setShippingStatus(id, status, op) {
    const s = (cache.shippingLog || []).find(x => String(x.id) === String(id));
    const logEntry = { a: "Shipment " + status, d: s ? (s.recipient + (s.tracking ? " (" + s.tracking + ")" : "")) : String(id), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("shipping_log").update({ status }).eq("id", id);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      if (s) s.status = status;
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function updateShipping(id, rec, op) {
    const patch = {
      ship_date: rec.ship_date || null, ship_type: rec.ship_type || "", recipient: rec.recipient || "",
      address: rec.address || "", carrier: rec.carrier || "", tracking: rec.tracking || "",
      requested_by: rec.requested_by || "", contents: rec.contents || "", status: rec.status || "Shipped",
      cost: Number(rec.cost) || 0, notes: rec.notes || ""
    };
    const logEntry = { a: "Shipment edited", d: (patch.recipient || "") + (patch.tracking ? " (" + patch.tracking + ")" : ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("shipping_log").update(patch).eq("id", id);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      const s = (cache.shippingLog || []).find(x => String(x.id) === String(id));
      if (s) Object.assign(s, patch);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function deleteShipping(id, op) {
    if (mode === "cloud") {
      await sb.from("shipping_log").delete().eq("id", id);
      await cloud.loadAll();
    } else {
      cache.shippingLog = (cache.shippingLog || []).filter(x => String(x.id) !== String(id));
      local.save();
    }
    emit();
    return { ok: true };
  }

  // ---------- Receiving Log (inbound shipments + attached paperwork) ----------
  const RECV_BUCKET = "supplier-pos"; // reuse the existing public bucket for receiving paperwork
  async function addReceivingLog(rec, file, op) {
    let file_name = file ? file.name : "", file_path = "", file_url = "";
    if (mode === "cloud" && file) {
      try {
        const path = "recv_" + Date.now() + "_" + (file.name || "doc").replace(/[^\w.\-]+/g, "_");
        const up = await sb.storage.from(RECV_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (up.error) return { ok: false, msg: up.error.message || "upload failed" };
        file_path = path;
        const pub = sb.storage.from(RECV_BUCKET).getPublicUrl(path);
        file_url = (pub && pub.data && pub.data.publicUrl) || "";
      } catch (e) { return { ok: false, msg: String(e) }; }
    }
    const row = {
      recv_date: rec.recv_date || new Date().toISOString().slice(0, 10),
      supplier: rec.supplier || "", po_num: rec.po_num || "", carrier: rec.carrier || "",
      tracking: rec.tracking || "", contents: rec.contents || "",
      qty_ordered: rec.qty_ordered === "" || rec.qty_ordered == null ? null : Number(rec.qty_ordered),
      qty_received: rec.qty_received === "" || rec.qty_received == null ? null : Number(rec.qty_received),
      condition: rec.condition || "Good", received_by: rec.received_by || "",
      notes: rec.notes || "", file_name: file_name, file_path: file_path, file_url: file_url,
      entered_by: op || "", created_at: new Date().toISOString()
    };
    const logEntry = { a: "Receiving logged", d: (row.supplier || "") + (row.po_num ? " PO " + row.po_num : "") + (file_name ? " [" + file_name + "]" : ""), u: op, t: row.created_at };
    if (mode === "cloud") {
      await sb.from("receiving_log").insert(row);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      row.id = "RCV-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000);
      if (file && !file_url) row.file_url = URL.createObjectURL(file);
      cache.receivingLog.unshift(row);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function updateReceivingLog(id, rec, file, op) {
    let filePatch = {};
    if (mode === "cloud" && file) {
      try {
        const path = "recv_" + Date.now() + "_" + (file.name || "doc").replace(/[^\w.\-]+/g, "_");
        const up = await sb.storage.from(RECV_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (up.error) return { ok: false, msg: up.error.message || "upload failed" };
        const pub = sb.storage.from(RECV_BUCKET).getPublicUrl(path);
        filePatch = { file_name: file.name, file_path: path, file_url: (pub && pub.data && pub.data.publicUrl) || "" };
      } catch (e) { return { ok: false, msg: String(e) }; }
    }
    const patch = Object.assign({
      recv_date: rec.recv_date || null, supplier: rec.supplier || "", po_num: rec.po_num || "",
      carrier: rec.carrier || "", tracking: rec.tracking || "", contents: rec.contents || "",
      qty_ordered: rec.qty_ordered === "" || rec.qty_ordered == null ? null : Number(rec.qty_ordered),
      qty_received: rec.qty_received === "" || rec.qty_received == null ? null : Number(rec.qty_received),
      condition: rec.condition || "Good", received_by: rec.received_by || "", notes: rec.notes || ""
    }, filePatch);
    const logEntry = { a: "Receiving edited", d: (patch.supplier || "") + (patch.po_num ? " PO " + patch.po_num : ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("receiving_log").update(patch).eq("id", id);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      const s = (cache.receivingLog || []).find(x => String(x.id) === String(id));
      if (s) Object.assign(s, patch);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function deleteReceivingLog(id, op) {
    if (mode === "cloud") {
      await sb.from("receiving_log").delete().eq("id", id);
      await cloud.loadAll();
    } else {
      cache.receivingLog = (cache.receivingLog || []).filter(x => String(x.id) !== String(id));
      local.save();
    }
    emit();
    return { ok: true };
  }

  // ---------- Item field edit (reorder point / preferred supplier, etc.) ----------
  async function updateItemFields(id, patch, op) {
    const clean = {};
    if (patch.reorder !== undefined) clean.reorder = (patch.reorder === "" || patch.reorder == null) ? 0 : Number(patch.reorder);
    if (patch.supplier !== undefined) clean.supplier = patch.supplier || null;
    if (patch.unit !== undefined) clean.unit = patch.unit;
    if (patch.name !== undefined) clean.name = patch.name;
    if (!Object.keys(clean).length) return { ok: true };
    const it = cache.items.find(x => x.id === id);
    const logEntry = { a: "Item updated", d: (it ? it.name : id) + " " + JSON.stringify(clean), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      const r = await sb.from("items").update(clean).eq("id", id);
      if (r && r.error) return { ok: false, msg: r.error.message || "update failed" };
      if (it) Object.assign(it, clean);
      await cloud.addLog(logEntry);
    } else {
      if (it) Object.assign(it, clean);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }

  // ---------- Daily Production log (Retail pallet log + per-day header) ----------
  function prodDay(date, channel) { channel = channel || "retail"; return (cache.prodDays || []).find(d => d.prod_date === date && (d.channel || "retail") === channel) || null; }
  function prodPallets(date) { return (cache.prodPallets || []).filter(p => p.prod_date === date); }
  async function setProdDay(date, channel, patch, op) {
    channel = channel || "retail";
    const row = Object.assign({ prod_date: date, channel: channel }, patch, { updated_by: op || "", updated_at: new Date().toISOString() });
    ["counter_start", "counter_end", "pallets_used"].forEach(k => { if (row[k] === "" || row[k] == null) delete row[k]; else row[k] = Number(row[k]); });
    if (mode === "cloud") {
      const r = await sb.from("production_days").upsert(row, { onConflict: "prod_date,channel" }).select();
      if (r && r.error) return { ok: false, msg: r.error.message || "save failed" };
      const cur = prodDay(date, channel);
      if (cur) Object.assign(cur, row); else cache.prodDays.push(row);
    } else {
      const cur = prodDay(date, channel);
      if (cur) Object.assign(cur, row); else cache.prodDays.push(row);
      local.save();
    }
    emit();
    return { ok: true };
  }
  async function addProdPallet(rec, op) {
    const row = {
      prod_date: rec.prod_date, channel: rec.channel || "retail", line: rec.line || "",
      flavor_code: rec.flavor_code || "", cases: Number(rec.cases) || 0,
      log_time: rec.log_time || "", notes: rec.notes || "", entered_by: op || "",
      created_at: new Date().toISOString()
    };
    const logEntry = { a: "Pallet logged", d: row.flavor_code + " " + row.cases + " cases (L" + row.line + ")", u: op, t: row.created_at };
    if (mode === "cloud") {
      const r = await sb.from("production_pallets").insert(row).select();
      if (r && r.error) return { ok: false, msg: r.error.message || "save failed" };
      if (r.data && r.data[0]) row.id = r.data[0].id;
      cache.prodPallets.unshift(row); await cloud.addLog(logEntry);
    } else {
      row.id = "pp_" + Date.now(); cache.prodPallets.unshift(row); local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function deleteProdPallet(id, op) {
    if (mode === "cloud") { await sb.from("production_pallets").delete().eq("id", id); }
    cache.prodPallets = (cache.prodPallets || []).filter(p => String(p.id) !== String(id));
    if (mode !== "cloud") local.save();
    emit();
    return { ok: true };
  }

  // ---------- Continuous Improvement (Lean / 5S / Kaizen initiatives) ----------
  const IMP_FIELDS = ["title","ci_type","area","owner","priority","status","problem","impact","opened_date","completed_date"];
  function cleanImp(rec) { const o = {}; IMP_FIELDS.forEach(k => { if (rec[k] !== undefined) o[k] = rec[k] === "" ? null : rec[k]; }); return o; }
  async function addImprovement(rec, op) {
    const row = Object.assign({ status: "Idea", priority: "Medium", opened_date: new Date().toISOString().slice(0, 10) }, cleanImp(rec));
    row.title = row.title || ""; row.entered_by = op || ""; row.created_at = new Date().toISOString();
    const logEntry = { a: "Improvement added", d: (row.ci_type ? row.ci_type + ": " : "") + row.title, u: op, t: row.created_at };
    if (mode === "cloud") {
      await sb.from("improvements").insert(row);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      row.id = "IMP-" + Date.now().toString(36); cache.improvements.unshift(row);
      local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function updateImprovement(id, patch, op) {
    const p = cleanImp(patch);
    const cur = (cache.improvements || []).find(x => String(x.id) === String(id));
    const logEntry = { a: "Improvement updated", d: (cur ? cur.title : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("improvements").update(p).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) Object.assign(cur, p); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function setImprovementStatus(id, status, op) {
    const cur = (cache.improvements || []).find(x => String(x.id) === String(id));
    const patch = { status };
    if (status === "Done") patch.completed_date = new Date().toISOString().slice(0, 10);
    const logEntry = { a: "Improvement " + status, d: (cur ? cur.title : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("improvements").update(patch).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) Object.assign(cur, patch); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function deleteImprovement(id, op) {
    if (mode === "cloud") { await sb.from("improvements").delete().eq("id", id); await cloud.loadAll(); }
    else { cache.improvements = (cache.improvements || []).filter(x => String(x.id) !== String(id)); local.save(); }
    emit(); return { ok: true };
  }

  // ---------- Seed lot registry (Type / Lot / Supplier / Received / Weight - recall trace) ----------
  function seedLocalId() { return "SD-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000); }
  async function addSeedLot(rec, op) {
    const row = {
      seed_code: rec.seed_code || "", product: rec.product || "", lot: rec.lot || "",
      supplier: rec.supplier || "", received_date: rec.received_date || null, weight: Number(rec.weight) || 0,
      status: "Good", created_at: new Date().toISOString()
    };
    const logEntry = { a: "Seed lot", d: (row.product || row.seed_code) + " lot " + row.lot + " " + fmt(row.weight) + " lb (" + (row.supplier || "n/a") + ")", u: op, t: row.created_at };
    if (mode === "cloud") {
      await sb.from("seed_lots").insert(row);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      row.id = seedLocalId();
      cache.seedLots.push(row);
      local.addLog(logEntry); local.save();
    }
    emit();
    return { ok: true };
  }
  async function setSeedLotStatus(id, status, op) {
    const lot = (cache.seedLots || []).find(l => String(l.id) === String(id));
    const logEntry = { a: "Seed " + status, d: lot ? ((lot.product || lot.seed_code) + " lot " + lot.lot) : String(id), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("seed_lots").update({ status }).eq("id", id);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      if (lot) lot.status = status;
      local.addLog(logEntry); local.save();
    }
    emit();
  }
  async function updateSeedLot(id, patch, op) {
    const p = { seed_code: patch.seed_code || "", product: patch.product || "", lot: patch.lot || "",
      supplier: patch.supplier || "", received_date: patch.received_date || null, weight: Number(patch.weight) || 0 };
    const logEntry = { a: "Seed edited", d: (p.product || p.seed_code) + " lot " + p.lot, u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("seed_lots").update(p).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      const l = (cache.seedLots || []).find(x => String(x.id) === String(id)); if (l) Object.assign(l, p);
      local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }

  // ---------- Stock Build (live on-hand vs goals; on-hand entered in-app) ----------
  async function setStockBuildOnHand(itemKey, onHand, op) {
    const row = { item_key: itemKey, on_hand: Number(onHand) || 0, updated_by: op || "", updated_at: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("stock_build").upsert(row, { onConflict: "item_key" });
      await cloud.loadAll();
    } else {
      cache.stockBuild[itemKey] = { on_hand: row.on_hand, updated_by: row.updated_by, updated_at: row.updated_at };
      local.save();
    }
    emit();
    return { ok: true };
  }

  // ---------- Orders (non-SPS / Stripe outbound order log) ----------
  const ORDER_FIELDS = ["customer","customer_po","appointment","order_id","stripe_link","invoice_date","ship_date","tracking","carrier","status","notes","entered_by"];
  function orderLocalId() { return "OR-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000); }
  function cleanOrder(rec) { const o = {}; ORDER_FIELDS.forEach(f => { if (rec[f] !== undefined && rec[f] !== null) o[f] = rec[f]; }); if (!o.status) o.status = "Open"; return o; }
  async function createOrder(rec, op) {
    const row = cleanOrder(rec);
    const logEntry = { a: "Order added", d: (row.customer || "") + " " + (row.customer_po || row.order_id || ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("orders").insert(row);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      row.id = orderLocalId(); row.created_at = new Date().toISOString();
      cache.orders.unshift(row); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function updateOrder(id, patch, op) {
    const p = cleanOrder(patch);
    const cur = (cache.orders || []).find(o => String(o.id) === String(id));
    const logEntry = { a: "Order updated", d: (cur ? (cur.customer + " " + (cur.customer_po || cur.order_id || "")) : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("orders").update(p).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) Object.assign(cur, p); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function setOrderStatus(id, status, op) {
    const cur = (cache.orders || []).find(o => String(o.id) === String(id));
    const logEntry = { a: "Order " + status, d: (cur ? (cur.customer + " " + (cur.customer_po || cur.order_id || "")) : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("orders").update({ status }).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) cur.status = status; local.addLog(logEntry); local.save();
    }
    emit();
  }
  async function deleteOrder(id, op) {
    if (mode === "cloud") { await sb.from("orders").delete().eq("id", id); await cloud.loadAll(); }
    else { cache.orders = cache.orders.filter(o => String(o.id) !== String(id)); local.addLog({ a: "Order deleted", d: String(id), u: op, t: new Date().toISOString() }); local.save(); }
    emit();
  }

  // ---------- R&D / sample requests ----------
  const RD_FIELDS = ["req_no","req_type","company","contact_name","contact_email","items","quantity","needed_by","purpose","requested_by","status","sent_at","received_at","follow_up","notes"];
  function rdLocalId() { return "RD-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000); }
  function cleanRd(rec) { const o = {}; RD_FIELDS.forEach(f => { if (rec[f] !== undefined && rec[f] !== null) o[f] = rec[f]; }); if (!o.status) o.status = "Pending"; return o; }
  function nextRdNumber() {
    const d = new Date();
    const ymd = "" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    const n = (cache.rdRequests || []).filter(r => (r.req_no || "").indexOf("RND-" + ymd) === 0).length + 1;
    return "RND-" + ymd + "-" + pad2(n);
  }
  async function createRdRequest(rec, op) {
    const row = cleanRd(rec);
    if (!row.req_no) row.req_no = nextRdNumber();
    const logEntry = { a: "R&D request", d: row.req_no + " " + (row.company || "") + " - " + (row.items || ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      const { data } = await sb.from("rd_requests").insert(row).select();
      await cloud.addLog(logEntry); await cloud.loadAll();
      emit(); return { ok: true, id: data && data[0] ? data[0].id : null, req_no: row.req_no };
    } else {
      row.id = rdLocalId(); row.created_at = new Date().toISOString();
      cache.rdRequests.unshift(row); local.addLog(logEntry); local.save();
      emit(); return { ok: true, id: row.id, req_no: row.req_no };
    }
  }
  async function updateRdRequest(id, patch, op) {
    const p = cleanRd(patch);
    const cur = (cache.rdRequests || []).find(r => String(r.id) === String(id));
    const logEntry = { a: "R&D updated", d: (cur ? cur.req_no : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("rd_requests").update(p).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) Object.assign(cur, p); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function setRdStatus(id, status, op) {
    const cur = (cache.rdRequests || []).find(r => String(r.id) === String(id));
    const patch = { status }; if (status === "Received") patch.received_at = new Date().toISOString();
    const logEntry = { a: "R&D " + status, d: (cur ? cur.req_no + " " + (cur.company || "") : String(id)), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("rd_requests").update(patch).eq("id", id);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      if (cur) Object.assign(cur, patch); local.addLog(logEntry); local.save();
    }
    emit();
  }
  async function deleteRdRequest(id, op) {
    if (mode === "cloud") { await sb.from("rd_requests").delete().eq("id", id); await cloud.loadAll(); }
    else { cache.rdRequests = cache.rdRequests.filter(r => String(r.id) !== String(id)); local.addLog({ a: "R&D deleted", d: String(id), u: op, t: new Date().toISOString() }); local.save(); }
    emit();
  }
  // Relay the request email through the Supabase Edge Function (which holds the Resend key).
  // payload: { to, cc, subject, html, pdfBase64, pdfName }. Returns {ok, msg}.
  async function sendRdEmail(id, payload, op) {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return { ok: false, msg: "not-configured" };
    const url = cfg.SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/send-rd-request";
    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.SUPABASE_ANON_KEY, "apikey": cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify(payload)
      });
    } catch (e) { return { ok: false, msg: "network" }; }
    if (resp.status === 404) return { ok: false, msg: "not-configured" };
    let body = {}; try { body = await resp.json(); } catch (e) {}
    if (!resp.ok || body.error) return { ok: false, msg: (body && (body.error || body.message)) || ("http " + resp.status) };
    // record that it was sent (status stays Pending until goods arrive)
    await updateRdRequest(id, { sent_at: new Date().toISOString() }, op || "system");
    return { ok: true, id: body.id || null };
  }

  // Fire-and-forget email to Troy when a new order is added (reuses the send-rd-request
  // relay). Silently no-ops until the email backend (Resend) is configured.
  const NOTIFY_TO = "troy.dircks@smackinsnacks.com";
  async function notifyNewOrder(o) {
    o = o || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return { ok: false, msg: "not-configured" };
    const url = cfg.SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/send-rd-request";
    const html = '<div style="font-family:Arial,sans-serif;color:#222">' +
      '<p>A new order was just added in Smackin\' OS:</p><table style="border-collapse:collapse">' +
      ['Customer:' + (o.customer || ''), 'Customer PO#:' + (o.customer_po || ''),
       'Order / INV #:' + (o.order_id || ''), 'Ship date:' + (o.ship_date || o.invoice_date || ''),
       'Carrier:' + (o.carrier || ''), 'Tracking:' + (o.tracking || '')]
        .map(function (r) { var p = r.split(':'); return '<tr><td style="padding:3px 12px 3px 0;color:#667">' + p[0] + '</td><td style="padding:3px 0"><b>' + (p.slice(1).join(':') || '') + '</b></td></tr>'; }).join('') +
      '</table></div>';
    try {
      const r = await fetch(url, { method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.SUPABASE_ANON_KEY, "apikey": cfg.SUPABASE_ANON_KEY },
        body: JSON.stringify({ to: NOTIFY_TO, subject: "New order: " + (o.customer || "") + " " + (o.customer_po || ""), html: html }) });
      if (r.status === 404) return { ok: false, msg: "not-configured" };
      const b = await r.json().catch(() => ({}));
      return (r.ok && !b.error) ? { ok: true } : { ok: false, msg: b.error || ("http " + r.status) };
    } catch (e) { return { ok: false, msg: "network" }; }
  }

  // ---------- Supplier POs (uploaded from external systems) ----------
  const SPO_BUCKET = "supplier-pos";
  async function createSupplierPO(rec, file, op) {
    let file_name = file ? file.name : "", file_path = "", file_url = "";
    if (mode === "cloud" && file) {
      try {
        const path = Date.now() + "_" + (file.name || "po").replace(/[^\w.\-]+/g, "_");
        const up = await sb.storage.from(SPO_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (up.error) return { ok: false, msg: up.error.message || "upload failed" };
        file_path = path;
        const pub = sb.storage.from(SPO_BUCKET).getPublicUrl(path);
        file_url = (pub && pub.data && pub.data.publicUrl) || "";
      } catch (e) { return { ok: false, msg: String(e) }; }
    }
    const row = { vendor: rec.vendor || "", po_num: rec.po_num || "", po_date: rec.po_date || "",
      total: rec.total || "", item_count: Number(rec.item_count) || 0, lines: rec.lines || "",
      notes: rec.notes || "", file_name: file_name, file_path: file_path, file_url: file_url, uploaded_by: op || "",
      vendor_addr: rec.vendor_addr || "", vendor_email: rec.vendor_email || "", vendor_phone: rec.vendor_phone || "",
      ship_to: rec.ship_to || "", subtotal: rec.subtotal || "", shipping: rec.shipping || "", tax: rec.tax || "", other: rec.other || "", prepared_by: rec.prepared_by || "" };
    const logEntry = { a: "Supplier PO", d: (row.vendor || "") + " " + (row.po_num || "") + (file_name ? " [" + file_name + "]" : ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("supplier_pos").insert(row);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      row.id = "SPO-" + Date.now().toString(36); row.created_at = new Date().toISOString();
      if (file && !file_url) row.file_url = URL.createObjectURL(file);
      cache.supplierPos.unshift(row); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function deleteSupplierPO(id, op) {
    const cur = (cache.supplierPos || []).find(s => String(s.id) === String(id));
    if (mode === "cloud") {
      if (cur && cur.file_path) { try { await sb.storage.from(SPO_BUCKET).remove([cur.file_path]); } catch (e) {} }
      await sb.from("supplier_pos").delete().eq("id", id); await cloud.loadAll();
    } else {
      cache.supplierPos = cache.supplierPos.filter(s => String(s.id) !== String(id));
      local.addLog({ a: "Supplier PO deleted", d: cur ? (cur.vendor + " " + cur.po_num) : String(id), u: op, t: new Date().toISOString() }); local.save();
    }
    emit();
  }

  // ---------- Order Docs (fulfilled-order paperwork, SPS-style archive) ----------
  const ODOC_BUCKET = "order-docs";
  async function createOrderDoc(rec, file, op) {
    let file_name = file ? file.name : "", file_path = "", file_url = "";
    if (mode === "cloud" && file) {
      try {
        const path = Date.now() + "_" + (file.name || "doc").replace(/[^\w.\-]+/g, "_");
        const up = await sb.storage.from(ODOC_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (up.error) return { ok: false, msg: up.error.message || "upload failed" };
        file_path = path;
        const pub = sb.storage.from(ODOC_BUCKET).getPublicUrl(path);
        file_url = (pub && pub.data && pub.data.publicUrl) || "";
      } catch (e) { return { ok: false, msg: String(e) }; }
    }
    const row = { customer: rec.customer || "", po_num: rec.po_num || "", doc_type: rec.doc_type || "",
      notes: rec.notes || "", file_name: file_name, file_path: file_path, file_url: file_url, uploaded_by: op || "" };
    const logEntry = { a: "Order doc", d: (row.customer || "") + " " + (row.po_num || "") + " " + (row.doc_type || "") + (file_name ? " [" + file_name + "]" : ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("order_docs").insert(row);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      row.id = "ODC-" + Date.now().toString(36); row.created_at = new Date().toISOString();
      if (file && !file_url) row.file_url = URL.createObjectURL(file);
      cache.orderDocs.unshift(row); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true };
  }
  async function deleteOrderDoc(id, op) {
    const cur = (cache.orderDocs || []).find(s => String(s.id) === String(id));
    if (mode === "cloud") {
      if (cur && cur.file_path) { try { await sb.storage.from(ODOC_BUCKET).remove([cur.file_path]); } catch (e) {} }
      await sb.from("order_docs").delete().eq("id", id); await cloud.loadAll();
    } else {
      cache.orderDocs = cache.orderDocs.filter(s => String(s.id) !== String(id));
      local.addLog({ a: "Order doc deleted", d: cur ? (cur.customer + " " + cur.po_num) : String(id), u: op, t: new Date().toISOString() }); local.save();
    }
    emit();
  }
  function orderDocs() { return cache.orderDocs || []; }

  // ---------- Consumption (Mixing / P-Mac scan-out to production) ----------
  function consumption() { return cache.consumption || []; }
  async function consume(itemCode, qty, lot, dept, op) {
    itemCode = (itemCode || "").trim();
    const item = itemByCode(itemCode);
    const q = Number(qty) || 0;
    if (item && q > 0) { try { await adjustTotal(item, Math.max(onHand(item.id) - q, 0), op); } catch (e) {} }
    const row = { item_code: itemCode, item_name: item ? (item.name || item.flavor || "") : "", qty: q,
      lot: lot || "", department: dept || "", operator: op || "" };
    const logEntry = { a: "Consumed (" + dept + ")", d: itemCode + " x" + q + (lot ? "  lot " + lot : ""), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      await sb.from("consumption").insert(row);
      await cloud.addLog(logEntry); await cloud.loadAll();
    } else {
      row.id = "CON-" + Date.now().toString(36); row.created_at = new Date().toISOString();
      cache.consumption.unshift(row); local.addLog(logEntry); local.save();
    }
    emit(); return { ok: true, itemFound: !!item };
  }

  // ---------- Purchase Orders ----------
  function pad2(n) { return String(n).padStart(2, "0"); }
  function nextPONumber() {
    const d = new Date();
    const ymd = "" + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    const n = (cache.pos || []).filter(p => (p.id || "").indexOf("PO-" + ymd) === 0).length + 1;
    return "PO-" + ymd + "-" + pad2(n);
  }
  // lines: [{ item_id, qty, cost }]
  async function createPO(supplierId, lines, expected, op) {
    const id = nextPONumber();
    const po = {
      id, supplier: supplierId, status: "draft",
      created: new Date().toISOString(), ordered: null, expected: expected || null, operator: op,
      lines: lines.map(l => ({ item_id: l.item_id, qty: Number(l.qty), cost: Number(l.cost) || 0, received: 0 }))
    };
    const logEntry = { a: "PO created", d: po.id + " " + supplierName(supplierId) + " (" + po.lines.length + " lines)", u: op, t: po.created };
    if (mode === "cloud") {
      await sb.from("purchase_orders").insert({ id: po.id, supplier: po.supplier, status: po.status, expected: po.expected, operator: op });
      for (const l of po.lines) await sb.from("po_lines").insert({ po_id: po.id, item_id: l.item_id, qty: l.qty, cost: l.cost, received: 0 });
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      cache.pos.unshift(po);
      local.addLog(logEntry);
      local.save();
    }
    emit();
    return po;
  }
  async function setPOStatus(poId, status, op) {
    const po = (cache.pos || []).find(p => p.id === poId);
    if (!po) return;
    const logEntry = { a: "PO " + status, d: poId + " " + supplierName(po.supplier), u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      const patch = { status }; if (status === "ordered") patch.ordered = new Date().toISOString();
      await sb.from("purchase_orders").update(patch).eq("id", poId);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      po.status = status; if (status === "ordered" && !po.ordered) po.ordered = new Date().toISOString();
      local.addLog(logEntry);
      local.save();
    }
    emit();
  }
  async function deletePO(poId, op) {
    if (mode === "cloud") {
      await sb.from("po_lines").delete().eq("po_id", poId);
      await sb.from("purchase_orders").delete().eq("id", poId);
      await cloud.loadAll();
    } else {
      cache.pos = cache.pos.filter(p => p.id !== poId);
      local.addLog({ a: "PO deleted", d: poId, u: op, t: new Date().toISOString() });
      local.save();
    }
    emit();
  }
  // receipts: { lineIndex: qtyReceivedNow }. Adds received stock to RECEIVING, closes when fully received.
  async function receivePO(poId, receipts, op) {
    const po = (cache.pos || []).find(p => p.id === poId);
    if (!po) return { ok: false, msg: "PO not found" };
    const deltas = []; let any = 0; const detail = [];
    po.lines.forEach((l, idx) => {
      let q = Number(receipts[idx] || 0);
      const outstanding = l.qty - l.received;
      if (q > outstanding) q = outstanding;
      if (!(q > 0)) return;
      deltas.push({ item_id: l.item_id, location: "RECEIVING", delta: q, lot: null });
      l.received += q; any += q;
      const it = cache.items.find(i => i.id === l.item_id);
      detail.push((it ? it.code : l.item_id) + " +" + fmt(q));
    });
    if (any <= 0) return { ok: false, msg: "Nothing to receive" };
    po.status = po.lines.every(l => l.received >= l.qty) ? "received" : "partial";
    const logEntry = { a: "PO receive", d: poId + ": " + detail.join(", ") + " -> RECEIVING (" + po.status + ")", u: op, t: new Date().toISOString() };
    if (mode === "cloud") {
      for (const d of deltas) await cloud.delta(d.item_id, d.location, d.delta, d.lot);
      for (const l of po.lines) await sb.from("po_lines").update({ received: l.received }).eq("po_id", poId).eq("item_id", l.item_id);
      await sb.from("purchase_orders").update({ status: po.status }).eq("id", poId);
      await cloud.addLog(logEntry);
      await cloud.loadAll();
    } else {
      deltas.forEach(d => local.delta(d.item_id, d.location, d.delta, d.lot));
      local.addLog(logEntry);
      local.save();
    }
    emit();
    return { ok: true, status: po.status };
  }

  async function resetDemo() {
    if (mode === "local") { local.reset(); emit(); }
  }

  // ---------- init ----------
  async function init() {
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      try {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        await cloud.loadAll();
        if (!cache.items.length) { await cloud.seedAll(); await cloud.loadAll(); }  // first-run bootstrap
        cloud.subscribeRealtime();
        mode = "cloud";
        return;
      } catch (e) { console.warn("Cloud init failed, falling back to local:", e); }
    }
    mode = "local";
    local.loadOrSeed();
  }

  return {
    init, onChange, get mode() { return mode; },
    items, suppliers, stock, log, itemByCode, onHand, atLoc,
    purchaseOrders, supplierName, createPO, setPOStatus, deletePO, receivePO,
    receive, move, adjust, adjustTotal, produce, resetDemo, updateItemFields,
    prodDay, prodPallets, setProdDay, addProdPallet, deleteProdPallet,
    returnStock, seasLots, addSeasLot, setSeasLotStatus, updateSeasLot, quarantineExpiredSeas,
    seedLots, addSeedLot, setSeedLotStatus, updateSeedLot,
    stockBuild, setStockBuildOnHand,
    shippingLog, addShipping, setShippingStatus, updateShipping, deleteShipping,
    receivingLog, addReceivingLog, updateReceivingLog, deleteReceivingLog,
    improvements, addImprovement, updateImprovement, setImprovementStatus, deleteImprovement,
    orders, createOrder, updateOrder, setOrderStatus, deleteOrder, notifyNewOrder,
    rdRequests, createRdRequest, updateRdRequest, setRdStatus, deleteRdRequest, sendRdEmail,
    supplierPos, createSupplierPO, deleteSupplierPO,
    orderDocs, createOrderDoc, deleteOrderDoc,
    consumption, consume,
    config: (seed ? seed.CONFIG : null), allLocations: (seed ? seed.allLocations : () => []),
    SNAPSHOT: (seed ? seed.SNAPSHOT : ""),
    recvSuppliers: (seed && seed.RECV_SUPPLIERS) || [], recvCategories: (seed && seed.RECV_CATEGORIES) || [],
    recvStatuses: (seed && seed.RECV_STATUSES) || [], conditions: (seed && seed.CONDITIONS) || [],
    returnChannels: (seed && seed.RETURN_CHANNELS) || [], returnReasons: (seed && seed.RETURN_REASONS) || [],
    returnDispositions: (seed && seed.RETURN_DISPOSITIONS) || []
  };
})();

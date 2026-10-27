/* ============================================================================
   Lot recall packet  (trace-recall.js)
   PDF and Excel export for the lot currently open on Lot Trace.
   Trace builds the chain (supplier labels, pallets, Use / Ship). This file
   reads SPS, the orders board, receiving, and ShipStation only when
   DB.mode === "cloud", then writes the packet with the jsPDF and SheetJS
   already loaded by index.html.

   Link strength, on purpose:
   - Supplier lots: parent labels on the finished pallet, plus receiving and
     seed / seasoning registry rows whose lot matches that supplier lot.
   - SPS documents and order-board rows: customer PO on a Ship event or an
     outbound pallet. Those documents do not store the bag lot.
   - ShipStation: the sync leaves lot blank. A row is a candidate only when
     its ship date falls in an e-com pull window and the item text matches
     that flavor. It is not a confirmed lot link.
   ========================================================================== */
(function (root) {
  "use strict";

  var SHIP_COLS = "id,ship_date,ship_type,recipient,address,carrier,tracking,contents,lot,status,cost,notes,entered_by";

  function cfg() { return root.SMACKIN_CONFIG || {}; }
  function cloudClient() {
    if (!(root.DB && root.DB.mode === "cloud")) return null;
    if (!root.supabase || !cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return null;
    try { return root.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY); } catch (e) { return null; }
  }
  function txt(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
  function clip(v, n) {
    var s = txt(v);
    if (s.length <= n) return s;
    return s.slice(0, n - 3) + "...";
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function uniq(list) {
    var out = [], seen = {};
    (list || []).forEach(function (v) {
      var s = txt(v);
      var k = s.toUpperCase();
      if (!s || seen[k]) return;
      seen[k] = 1;
      out.push(s);
    });
    return out;
  }
  function dayKey(s) {
    s = txt(s);
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return us[3] + "-" + ("0" + us[1]).slice(-2) + "-" + ("0" + us[2]).slice(-2);
    return "";
  }
  function addDays(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return "";
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function todayKey() { return new Date().toISOString().slice(0, 10); }
  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    return "$" + v.toFixed(2);
  }
  function safeFile(q) {
    var s = txt(q).replace(/[^\w.\-+]+/g, "_").replace(/^_+|_+$/g, "");
    return (s || "lot").slice(0, 40);
  }
  function stamp(iso) { return dayKey(iso) || todayKey(); }

  function flavorTokens(name) {
    var parts = String(name || "").toLowerCase().split(/[^a-z0-9]+/);
    var shortOk = { og: 1, bbq: 1 };
    var out = [], seen = {};
    parts.forEach(function (p) {
      if (!p || seen[p]) return;
      if (p.length >= 4 || shortOk[p]) { seen[p] = 1; out.push(p); }
    });
    return out;
  }
  function nameOptions(name) {
    var raw = String(name || "").trim();
    var parts = raw.split("/").map(function (s) { return s.trim(); }).filter(Boolean);
    var opts = parts.length > 1 ? parts : [raw];
    return opts.filter(function (n) { return flavorTokens(n).length; });
  }
  function hasWord(text, token) {
    return new RegExp("(^|[^a-z0-9])" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)").test(text);
  }
  function optionHit(contents, name) {
    var tokens = flavorTokens(name);
    if (!tokens.length) return false;
    var text = String(contents || "").toLowerCase();
    for (var i = 0; i < tokens.length; i++) if (!hasWord(text, tokens[i])) return false;
    return true;
  }
  function hitTokens(contents, name) {
    var out = [];
    nameOptions(name).forEach(function (opt) {
      if (!optionHit(contents, opt)) return;
      flavorTokens(opt).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
    });
    return out;
  }
  function matchesFlavor(contents, name, catalog) {
    var mine = hitTokens(contents, name);
    if (!mine.length) return false;
    var list = catalog || [];
    for (var i = 0; i < list.length; i++) {
      var other = list[i] && (list[i].name || list[i]);
      if (!other || String(other).toLowerCase() === String(name || "").toLowerCase()) continue;
      var extra = hitTokens(contents, other).some(function (t) { return mine.indexOf(t) < 0; });
      if (extra) return false;
    }
    return true;
  }
  function mentionedSizes(contents) {
    var t = String(contents || "").toLowerCase();
    var out = [];
    if (t.indexOf("2.75") >= 0) out.push("2.75oz");
    if (/1\.5\s*oz|1\.5oz/.test(t)) out.push("1.5oz");
    if (t.indexOf("4oz") >= 0 || /(^|[^0-9.])4\s*oz/.test(t)) out.push("4oz");
    return out;
  }
  function normSize(s) {
    s = String(s || "").toLowerCase().replace(/\s+/g, "");
    if (s.indexOf("2.75") >= 0) return "2.75oz";
    if (s.indexOf("1.5") >= 0) return "1.5oz";
    if (s.indexOf("4oz") >= 0 || s === "4") return "4oz";
    return s;
  }
  function sizeOk(contents, size) {
    var want = normSize(size);
    if (!want) return true;
    var got = mentionedSizes(contents);
    if (!got.length) return true;
    return got.indexOf(want) >= 0;
  }
  function inWindow(shipDay, w) {
    shipDay = dayKey(shipDay);
    if (!shipDay || !w || !w.pulledDay) return false;
    if (shipDay < w.pulledDay) return false;
    if (w.open || !w.endsDay) return true;
    if (w.endsDay <= w.pulledDay) return shipDay === w.pulledDay;
    return shipDay < w.endsDay;
  }

  function settle(promise, label) {
    return Promise.resolve(promise).then(function (r) {
      if (r && r.error) return { rows: [], error: label + ": " + (r.error.message || "could not read"), capped: false };
      var rows = (r && r.data) || [];
      return { rows: rows, error: "", capped: false };
    }).catch(function (e) {
      return { rows: [], error: label + ": " + ((e && e.message) || "could not read"), capped: false };
    });
  }
  function mergeParts(parts) {
    var rows = [], errors = [], capped = false, seen = {};
    (parts || []).forEach(function (p) {
      if (!p) return;
      if (p.error) errors.push(p.error);
      if (p.capped) capped = true;
      (p.rows || []).forEach(function (row) {
        var id = row && row.id != null ? String(row.id) : "";
        if (id && seen[id]) return;
        if (id) seen[id] = 1;
        rows.push(row);
      });
    });
    return { rows: rows, errors: uniq(errors), capped: capped };
  }

  function loadSps(c, pos) {
    pos = uniq(pos).slice(0, 30);
    if (!pos.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    var jobs = [];
    for (var i = 0; i < pos.length; i += 15) {
      var part = pos.slice(i, i + 15);
      jobs.push(settle(
        c.from("sps_transactions").select("id,doc_type,partner,po_number,status,received_at,payload").in("po_number", part).limit(200),
        "SPS"
      ));
    }
    pos.slice(0, 20).forEach(function (po) {
      jobs.push(settle(
        c.from("sps_transactions").select("id,doc_type,partner,po_number,status,received_at,payload").contains("payload", { po_numbers: [po] }).limit(50),
        "SPS"
      ));
    });
    return Promise.all(jobs).then(mergeParts);
  }
  function loadOrders(c, pos) {
    pos = uniq(pos).slice(0, 30);
    if (!pos.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    var jobs = [];
    for (var i = 0; i < pos.length; i += 15) {
      var part = pos.slice(i, i + 15);
      jobs.push(settle(
        c.from("orders").select("id,customer,customer_po,ship_date,tracking,carrier,status,order_id,notes,entered_by").in("customer_po", part).limit(200),
        "Orders"
      ));
    }
    return Promise.all(jobs).then(mergeParts);
  }
  function loadShipByLot(c, lots) {
    lots = uniq(lots).filter(function (s) { return s.length >= 2; }).slice(0, 40);
    if (!lots.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    var jobs = [];
    for (var i = 0; i < lots.length; i += 20) {
      var part = lots.slice(i, i + 20);
      jobs.push(settle(
        c.from("shipping_log").select(SHIP_COLS).in("lot", part).limit(100),
        "Shipments"
      ));
    }
    return Promise.all(jobs).then(mergeParts);
  }
  function loadShipByPo(c, pos) {
    pos = uniq(pos).slice(0, 20);
    if (!pos.length) return Promise.resolve({ rows: [], errors: [], capped: false, truncated: false });
    var jobs = pos.map(function (po) {
      var needle = String(po).replace(/[%_\\]/g, "");
      if (!needle) return Promise.resolve({ rows: [], error: "", capped: false });
      return settle(
        c.from("shipping_log").select(SHIP_COLS).ilike("contents", "%PO " + needle + "%").limit(40),
        "Shipments"
      );
    });
    return Promise.all(jobs).then(mergeParts);
  }
  function loadShipStation(c, windows) {
    var open = (windows || []).filter(function (w) { return w && w.pulledDay; });
    if (!open.length) return Promise.resolve({ rows: [], errors: [], capped: false, spanCapped: false });
    var start = open[0].pulledDay, end = open[0].open ? todayKey() : (open[0].endsDay || open[0].pulledDay);
    var spanCapped = false;
    open.forEach(function (w) {
      if (w.pulledDay < start) start = w.pulledDay;
      var wEnd = w.open || !w.endsDay ? todayKey() : w.endsDay;
      if (wEnd > end) end = wEnd;
    });
    var capEnd = addDays(start, 180);
    if (capEnd && end > capEnd) { end = capEnd; spanCapped = true; }
    return settle(
      c.from("shipping_log").select(SHIP_COLS).like("entered_by", "sync:%").gte("ship_date", start).lte("ship_date", end).order("ship_date", { ascending: true }).limit(500),
      "ShipStation"
    ).then(function (p) {
      p.spanCapped = spanCapped;
      p.capped = (p.rows || []).length >= 500;
      return { rows: p.rows, errors: p.error ? [p.error] : [], capped: p.capped, spanCapped: spanCapped };
    });
  }
  function loadReceiving(c, lots) {
    lots = uniq(lots).filter(function (s) { return s.length >= 2; }).slice(0, 40);
    if (!lots.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    var jobs = [];
    for (var i = 0; i < lots.length; i += 20) {
      var part = lots.slice(i, i + 20);
      jobs.push(settle(
        c.from("receiving_log").select("id,recv_date,supplier,po_num,contents,lot,qty_received,condition,received_by,notes").in("lot", part).limit(100),
        "Receiving"
      ));
    }
    return Promise.all(jobs).then(mergeParts);
  }
  function loadSeed(c, lots) {
    lots = uniq(lots).filter(function (s) { return s.length >= 2; }).slice(0, 40);
    if (!lots.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    return settle(
      c.from("seed_lots").select("id,seed_code,product,lot,supplier,received_date,weight,status").in("lot", lots).limit(100),
      "Seed registry"
    ).then(function (p) { return { rows: p.rows, errors: p.error ? [p.error] : [], capped: false }; });
  }
  function loadSeason(c, lots) {
    lots = uniq(lots).filter(function (s) { return s.length >= 2; }).slice(0, 40);
    if (!lots.length) return Promise.resolve({ rows: [], errors: [], capped: false });
    return settle(
      c.from("seasoning_lots").select("id,flavor_code,product,lot,manufacturer,exp,weight,location,status,received_at").in("lot", lots).limit(100),
      "Seasoning registry"
    ).then(function (p) { return { rows: p.rows, errors: p.error ? [p.error] : [], capped: false }; });
  }

  function spsView(r) {
    var p = r.payload || {};
    var sum = p.summary || {};
    var ship = sum.shipTo || {};
    var dest = txt([ship.name || "", ship.location ? "(" + ship.location + ")" : ""].filter(Boolean).join(" "));
    var pos = [];
    if (Array.isArray(sum.pos)) pos = sum.pos.slice();
    else if (Array.isArray(p.po_numbers)) pos = p.po_numbers.slice();
    if (r.po_number) pos.unshift(r.po_number);
    var flags = Array.isArray(p.flags) ? p.flags.filter(Boolean) : [];
    var status = txt(r.status);
    if (flags.length) status = (status ? status + " " : "") + "flags: " + flags.join(", ");
    return {
      id: r.id,
      type: txt(r.doc_type || sum.docType),
      partner: txt(r.partner || sum.partner),
      pos: uniq(pos).join(", "),
      status: status,
      received: txt(r.received_at).replace("T", " ").slice(0, 16),
      shipTo: dest,
      bol: txt(sum.bol),
      shipDate: txt(sum.shipDate),
      invoice: txt(sum.invoice),
      lines: sum.lineCount == null ? "" : String(sum.lineCount),
      link: "Customer PO on a Ship event or outbound pallet. SPS does not store the bag lot."
    };
  }
  function orderView(r) {
    var notes = txt(r.notes);
    var block = notes.match(/\[\[SPS\]\]([\s\S]*?)\[\[\/SPS\]\]/);
    var detail = block ? txt(block[1].split("\n").slice(0, 4).join(" | ")) : clip(notes, 180);
    return {
      customer: txt(r.customer),
      po: txt(r.customer_po),
      status: txt(r.status),
      shipDate: txt(r.ship_date),
      carrier: txt(r.carrier),
      tracking: txt(r.tracking),
      orderId: txt(r.order_id),
      entered: txt(r.entered_by),
      detail: detail,
      link: "orders.customer_po matches a PO shipped from this lot. Bag qty is not on the order row."
    };
  }
  function shipView(r, link, strength) {
    return {
      id: r.id,
      date: txt(r.ship_date).slice(0, 16),
      day: dayKey(r.ship_date),
      type: txt(r.ship_type),
      recipient: txt(r.recipient),
      address: txt(r.address),
      carrier: txt(r.carrier),
      tracking: txt(r.tracking),
      contents: txt(r.contents),
      lot: txt(r.lot),
      status: txt(r.status),
      cost: r.cost == null || r.cost === "" ? "" : money(r.cost),
      entered: txt(r.entered_by),
      link: link,
      strength: strength
    };
  }
  function rank(s) { return s === "lot" ? 0 : s === "supplier" ? 1 : s === "po" ? 2 : 3; }
  function linkLabel(s) {
    if (s === "lot") return "Lot match";
    if (s === "supplier") return "Supplier lot";
    if (s === "po") return "Customer PO";
    return "Candidate";
  }

  function baseView(packet) {
    packet = packet || {};
    return {
      query: txt(packet.query),
      runAt: txt(packet.runAt).replace("T", " ").slice(0, 16),
      operator: txt(packet.operator) || "?",
      drill: txt(packet.drill),
      traceMode: packet.traceMode === "cloud" ? "cloud" : "this device",
      loadError: txt(packet.loadError),
      lots: packet.lots || [],
      inbound: packet.inbound || [],
      bins: packet.bins || [],
      pallets: packet.pallets || [],
      moves: packet.moves || [],
      qa: packet.qa || [],
      outbound: packet.outbound || [],
      customers: packet.customers || [],
      windows: packet.windows || [],
      customerPos: uniq(packet.customerPos || []),
      supplierLots: uniq(packet.supplierLots || []),
      supplierPos: uniq(packet.supplierPos || []),
      lotCodes: uniq(packet.lotCodes || []),
      catalog: packet.catalog || [],
      sps: [],
      orders: [],
      shipments: [],
      receiving: [],
      cloud: false,
      errors: [],
      spsPartial: false,
      shipCap: false,
      spanCap: false,
      poLookupCapped: (packet.customerPos || []).length > 20,
      spsFailed: false,
      stationFailed: false
    };
  }

  function attachShipments(view, byLot, byPo, byStation) {
    var finished = {};
    view.lotCodes.forEach(function (lot) { finished[lot.toUpperCase()] = lot; });
    var supplier = {};
    view.supplierLots.forEach(function (lot) { supplier[lot.toUpperCase()] = lot; });
    var rows = [];
    function push(r, strength, link) {
      if (!r) return;
      rows.push(shipView(r, link, strength));
    }
    (byLot.rows || []).forEach(function (r) {
      var key = txt(r.lot).toUpperCase();
      if (finished[key]) push(r, "lot", "shipping_log.lot equals finished lot " + finished[key] + ".");
      else if (supplier[key]) push(r, "supplier", "shipping_log.lot equals supplier lot " + supplier[key] + ".");
    });
    (byPo.rows || []).forEach(function (r) {
      var hit = "";
      var blob = (txt(r.contents) + " " + txt(r.notes)).toUpperCase();
      view.customerPos.forEach(function (po) {
        if (!hit && blob.indexOf(String(po).toUpperCase()) >= 0) hit = po;
      });
      push(r, "po", "Shipment text names customer PO " + (hit || "") + ", and that PO was shipped from this lot in Lot Trace. The ASN does not store the bag lot.");
    });
    (byStation.rows || []).forEach(function (r) {
      var day = dayKey(r.ship_date);
      var lots = [];
      view.windows.forEach(function (w) {
        if (!inWindow(day, w)) return;
        if (!matchesFlavor(r.contents, w.flavor, view.catalog)) return;
        if (!sizeOk(r.contents, w.size)) return;
        if (lots.indexOf(w.lot) < 0) lots.push(w.lot);
      });
      if (!lots.length) return;
      push(r, "candidate", "Candidate for lot " + lots.join(", ") + ". Ship date is inside the e-com pull window and the item text matches the flavor. ShipStation does not store this lot.");
    });
    var best = {}, order = [];
    rows.forEach(function (row) {
      var id = row.id != null ? String(row.id) : row.date + "|" + row.tracking + "|" + row.recipient;
      var prev = best[id];
      if (!prev || rank(row.strength) < rank(prev.strength)) best[id] = row;
      if (!prev) order.push(id);
    });
    view.shipments = order.map(function (id) { return best[id]; }).sort(function (a, b) {
      if (rank(a.strength) !== rank(b.strength)) return rank(a.strength) - rank(b.strength);
      return String(a.day).localeCompare(String(b.day));
    });
  }

  function howLines(view) {
    return [
      "Supplier lots come from parent labels on the finished pallet (receive, mix bin, film). Receiving log and seed or seasoning registry rows are added when their lot matches that supplier lot.",
      "Finished pallets, Hold, and Rejected are the Lot Trace pallet status at the time of this export. Every finished pallet of a matched lot is included, not only the one label that was scanned.",
      "Use and Ship events are Lot Trace. Pulls logged by hand are listed. They do not reduce pallet qty left, so the mass balance E-com column matches the Trace screen and the By hand column is separate.",
      "SPS documents and order-board rows are linked only by the customer PO on a Ship event or outbound pallet. Those records do not include the bag lot code.",
      "ShipStation leaves lot blank. Rows marked Candidate match an e-com pull window and the flavor name in the item text. A ship date is a whole day, so a window that ends the next morning does not include that next calendar day.",
      "Where a section says none recorded, that link is not in the data. This packet does not guess past what was stored."
    ];
  }
  function gapsFor(view) {
    var gaps = [];
    if (view.loadError) gaps.push("Lot Trace did not finish loading: " + view.loadError);
    if (view.traceMode !== "cloud") gaps.push("Lot Trace rows in this packet are from this device. Shared cloud labels were not loaded.");
    if (!view.cloud && view.noClient) gaps.push("SPS, the orders board, receiving, and ShipStation were not read. Cloud mode is on, but the database client is not available.");
    else if (!view.cloud) gaps.push("SPS, the orders board, receiving, and ShipStation were not read. Cloud mode is off, so this packet is Lot Trace only.");
    (view.errors || []).forEach(function (e) { gaps.push(e); });
    if (!view.lots.length && !view.pallets.length && !view.inbound.length && !view.moves.length) {
      gaps.push("Nothing in Lot Trace matches this lookup.");
    }
    if (view.lots.length && !view.inbound.length && !view.receiving.length) {
      gaps.push("No supplier or inbound lot is tied to this finished lot. Parent labels were not scanned, or the supplier lot is not on the receiving log.");
    }
    if (!view.moves.length && !view.outbound.length) gaps.push("No Use or Ship event is recorded for this lookup.");
    if (!view.customerPos.length) gaps.push("No customer PO is on a Ship event or outbound pallet, so SPS orders and ASNs cannot be linked to this lot.");
    else if (view.cloud && !view.sps.length && !view.spsFailed) gaps.push("No SPS document is stored for PO " + view.customerPos.join(", ") + ".");
    else if (view.sps.length) gaps.push("SPS is linked by customer PO only. Those documents do not include the bag lot code.");
    if (view.windows.length && view.cloud && !view.stationFailed && !view.shipments.some(function (s) { return s.strength === "candidate"; })) {
      gaps.push("No ShipStation shipment in the e-com pull window named this flavor.");
    }
    if (view.shipments.some(function (s) { return s.strength === "candidate"; })) {
      gaps.push("ShipStation rows marked Candidate are not a confirmed lot link. The sync stores the order number and item text, and leaves lot blank.");
    }
    if (view.poLookupCapped) gaps.push("More than 20 customer POs were in scope. Shipment text was checked for the first 20 only.");
    if (view.shipCap) gaps.push("ShipStation candidate list stopped at 500 rows.");
    if (view.spanCap) gaps.push("An e-com window was longer than 180 days. ShipStation candidates cover 180 days from the first pull.");
    if (view.spsPartial) gaps.push("Part of the SPS lookup failed. Documents found by PO number are still included.");
    return gaps;
  }

  function enrich(packet) {
    var view = baseView(packet);
    var c = cloudClient();
    if (!c) {
      view.noClient = !!(root.DB && root.DB.mode === "cloud");
      view.how = howLines(view);
      view.gaps = gapsFor(view);
      return Promise.resolve(view);
    }
    view.cloud = true;
    var lotKeys = uniq(view.lotCodes.concat(view.supplierLots));
    return Promise.all([
      loadSps(c, view.customerPos),
      loadOrders(c, view.customerPos),
      loadShipByLot(c, lotKeys),
      loadShipByPo(c, view.customerPos),
      loadShipStation(c, view.windows),
      loadReceiving(c, view.supplierLots),
      loadSeed(c, view.supplierLots),
      loadSeason(c, view.supplierLots)
    ]).then(function (parts) {
      var sps = parts[0], orders = parts[1], byLot = parts[2], byPo = parts[3];
      var station = parts[4], recv = parts[5], seed = parts[6], season = parts[7];
      view.sps = (sps.rows || []).map(spsView);
      view.orders = (orders.rows || []).map(orderView);
      view.shipCap = !!station.capped;
      view.spanCap = !!station.spanCapped;
      if ((sps.errors || []).length && view.sps.length) view.spsPartial = true;
      else if ((sps.errors || []).length) { view.spsFailed = true; view.errors.push(sps.errors[0]); }
      if ((station.errors || []).length && !(station.rows || []).length) view.stationFailed = true;
      [orders, byLot, byPo, station, recv, seed, season].forEach(function (p) {
        if (p && p.errors && p.errors.length && !(p.rows || []).length) view.errors.push(p.errors[0]);
      });
      attachShipments(view, byLot, byPo, station);
      (recv.rows || []).forEach(function (r) {
        view.receiving.push({
          date: txt(r.recv_date).slice(0, 10),
          source: "Receiving log",
          supplier: txt(r.supplier),
          po: txt(r.po_num),
          lot: txt(r.lot),
          qty: r.qty_received == null ? "" : num(r.qty_received),
          status: txt(r.condition),
          detail: txt(r.contents),
          link: "receiving_log.lot matches supplier lot " + txt(r.lot) + "."
        });
      });
      (seed.rows || []).forEach(function (r) {
        view.receiving.push({
          date: txt(r.received_date).slice(0, 10),
          source: "Seed registry",
          supplier: txt(r.supplier),
          po: "",
          lot: txt(r.lot),
          qty: r.weight == null ? "" : num(r.weight),
          status: txt(r.status),
          detail: txt(r.product) + (r.seed_code ? " seed " + txt(r.seed_code) : ""),
          link: "seed_lots.lot matches supplier lot " + txt(r.lot) + "."
        });
      });
      (season.rows || []).forEach(function (r) {
        view.receiving.push({
          date: txt(r.received_at).slice(0, 10),
          source: "Seasoning registry",
          supplier: txt(r.manufacturer),
          po: "",
          lot: txt(r.lot),
          qty: r.weight == null ? "" : num(r.weight),
          status: txt(r.status),
          detail: txt(r.product) + (r.exp ? " exp " + txt(r.exp).slice(0, 10) : ""),
          link: "seasoning_lots.lot matches supplier lot " + txt(r.lot) + "."
        });
      });
      view.orders.forEach(function (o) {
        view.customers.push({
          destination: o.customer,
          po: o.po,
          qty: "",
          source: "Order board (PO link, bag qty not on this row)"
        });
      });
      view.how = howLines(view);
      view.gaps = gapsFor(view);
      return view;
    });
  }

  function sheetEmpty(headers) {
    return [headers, ["None recorded."].concat(headers.slice(1).map(function () { return ""; }))];
  }
  function sheetsOf(view) {
    var summary = [
      ["Lot Recall Packet"],
      ["Query", view.query],
      ["Run", view.runAt],
      ["Operator", view.operator],
      ["Mock recall time", view.drill || ""],
      ["Trace data", view.traceMode],
      [],
      ["Finished lot", "Flavor", "Size", "Status", "Reason", "Packed", "Shipped", "Line", "E-com", "By hand", "Other", "Scrap", "On hand", "Unaccounted", "POs"]
    ];
    if (!view.lots.length) summary.push(["None recorded."]);
    view.lots.forEach(function (r) {
      summary.push([r.lot, r.flavor, r.size, r.state, r.reason, num(r.packed), num(r.shipped), num(r.line), num(r.ecom), num(r.ecomHand), num(r.other), num(r.scrap), num(r.left), num(r.unaccounted), r.posText || ""]);
    });
    summary.push([]);
    summary.push(["How this packet is linked"]);
    view.how.forEach(function (line) { summary.push([line]); });
    summary.push([]);
    summary.push(["Gaps"]);
    if (!view.gaps.length) summary.push(["No extra gap beyond the link notes above."]);
    view.gaps.forEach(function (line) { summary.push([line]); });

    var inbound = [["Label", "Type", "Item", "Flavor", "Supplier", "Supplier lot", "Seed", "PO", "Exp", "Qty", "UOM", "Status", "Where", "Received", "Finished lots"]];
    if (!view.inbound.length) inbound = sheetEmpty(inbound[0]);
    else view.inbound.forEach(function (r) {
      inbound.push([r.lpn, r.type, r.item, r.flavor, r.supplier, r.supplierLot, r.seedCode, r.po, r.exp, r.qty, r.uom, r.status, r.location, r.received, r.finishedLots]);
    });
    var bins = [["Label", "Batch", "Flavor", "Mixer", "Date", "Status", "Finished lots"]];
    if (!view.bins.length) bins = sheetEmpty(bins[0]);
    else view.bins.forEach(function (r) { bins.push([r.lpn, r.batch, r.flavor, r.mixer, r.date, r.status, r.finishedLots]); });
    var pallets = [["Label", "Lot", "Flavor", "Size", "Qty", "Left", "Status", "Hold", "Reason", "Where", "Packed", "Exp", "Station", "By"]];
    if (!view.pallets.length) pallets = sheetEmpty(pallets[0]);
    else view.pallets.forEach(function (r) {
      pallets.push([r.lpn, r.lot, r.flavor, r.size, num(r.qty), num(r.left), r.status, r.hold, r.reason, r.location, r.packed, r.exp, r.station, r.by]);
    });
    var moves = [["When", "Type", "Label", "Lot", "Qty", "UOM", "From", "To", "PO / ref", "Customer", "Operator", "By hand", "Note"]];
    if (!view.moves.length && !view.outbound.length) moves = sheetEmpty(moves[0]);
    else {
      view.moves.forEach(function (r) {
        moves.push([r.when, r.type, r.lpn, r.lot, r.qty === "" ? "" : num(r.qty), r.uom, r.from, r.to, r.ref, r.customer, r.operator, r.byHand ? "yes" : "", r.note]);
      });
      view.outbound.forEach(function (r) {
        moves.push([r.date, "OUTBOUND PALLET", r.lpn, r.lots, num(r.qty), "bags", "", r.customer, r.po, r.customer, "", "", r.status]);
      });
    }
    var qa = [["When", "Action", "Label", "Lot", "Operator", "Reason"]];
    if (!view.qa.length) qa = sheetEmpty(qa[0]);
    else view.qa.forEach(function (r) { qa.push([r.when, r.type, r.lpn, r.lot, r.operator, r.reason]); });
    var customers = [["Destination", "PO", "Qty (bags)", "Source"]];
    if (!view.customers.length) customers = sheetEmpty(customers[0]);
    else view.customers.forEach(function (r) { customers.push([r.destination, r.po, r.qty === "" ? "" : num(r.qty), r.source]); });
    var windows = [["Lot", "Flavor", "Size", "Pulled", "Bags", "By", "Window ends", "Next lot", "Open"]];
    if (!view.windows.length) windows = sheetEmpty(windows[0]);
    else view.windows.forEach(function (r) { windows.push([r.lot, r.flavor, r.size, r.pulled, num(r.bags), r.by, r.open ? "" : r.ends, r.nextLot, r.open ? "yes" : ""]); });
    var sps = [["Type", "Partner", "PO", "Status", "Received", "Ship to", "Ship date", "BOL", "Invoice", "Lines", "Link"]];
    if (!view.sps.length) sps = sheetEmpty(sps[0]);
    else view.sps.forEach(function (r) { sps.push([r.type, r.partner, r.pos, r.status, r.received, r.shipTo, r.shipDate, r.bol, r.invoice, r.lines, r.link]); });
    var orders = [["Customer", "PO", "Status", "Ship date", "Carrier", "Tracking", "Order id", "Entered by", "Detail", "Link"]];
    if (!view.orders.length) orders = sheetEmpty(orders[0]);
    else view.orders.forEach(function (r) { orders.push([r.customer, r.po, r.status, r.shipDate, r.carrier, r.tracking, r.orderId, r.entered, r.detail, r.link]); });
    var ships = [["Link type", "Date", "Type", "Recipient", "Carrier", "Tracking", "Status", "Lot field", "Contents", "Cost", "Entered by", "Why it is here"]];
    if (!view.shipments.length) ships = sheetEmpty(ships[0]);
    else view.shipments.forEach(function (r) {
      ships.push([linkLabel(r.strength), r.date, r.type, r.recipient, r.carrier, r.tracking, r.status, r.lot, r.contents, r.cost, r.entered, r.link]);
    });
    var recv = [["Date", "Source", "Supplier", "PO", "Lot", "Qty", "Status", "Detail", "Link"]];
    if (!view.receiving.length) recv = sheetEmpty(recv[0]);
    else view.receiving.forEach(function (r) { recv.push([r.date, r.source, r.supplier, r.po, r.lot, r.qty, r.status, r.detail, r.link]); });
    var gaps = [["Gap"]];
    if (!view.gaps.length) gaps.push(["No extra gap beyond the link notes on Summary."]);
    else view.gaps.forEach(function (line) { gaps.push([line]); });
    return {
      Summary: summary,
      "Supplier lots": inbound,
      "Mix bins": bins,
      "Finished pallets": pallets,
      "Use and Ship": moves,
      "Status history": qa,
      Customers: customers,
      "E-com windows": windows,
      "SPS documents": sps,
      Orders: orders,
      Shipments: ships,
      Receiving: recv,
      Gaps: gaps
    };
  }

  function writeXlsx(view) {
    var XLSX = root.XLSX;
    if (!XLSX) throw new Error("Spreadsheet library not loaded. Refresh the page.");
    var book = sheetsOf(view);
    var wb = XLSX.utils.book_new();
    Object.keys(book).forEach(function (name) {
      var aoa = book[name];
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      var widest = 12;
      (aoa[0] || []).forEach(function (h, i) {
        var n = String(h || "").length + 2;
        if (!ws["!cols"]) ws["!cols"] = [];
        ws["!cols"][i] = { wch: Math.max(12, Math.min(42, n)) };
        if (n > widest) widest = n;
      });
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
    var file = "Recall " + safeFile(view.query) + " " + stamp(view.runAt) + ".xlsx";
    XLSX.writeFile(wb, file);
    return file;
  }

  function Pdf(ctor) {
    this.doc = new ctor({ unit: "pt", format: "letter" });
    this.M = 36;
    this.R = 576;
    this.y = 48;
    this.pageH = 792;
  }
  Pdf.prototype.need = function (h) {
    if (this.y + h <= 736) return false;
    this.doc.addPage();
    this.y = 48;
    return true;
  };
  Pdf.prototype.rule = function () {
    this.doc.setDrawColor(210, 216, 226);
    this.doc.setLineWidth(0.6);
    this.doc.line(this.M, this.y, this.R, this.y);
    this.y += 12;
  };
  Pdf.prototype.para = function (str, size, style, color) {
    var doc = this.doc;
    doc.setFont("helvetica", style || "normal");
    doc.setFontSize(size || 10);
    var c = color || [34, 34, 34];
    doc.setTextColor(c[0], c[1], c[2]);
    var lines = doc.splitTextToSize(String(str == null ? "" : str), this.R - this.M);
    var step = (size || 10) + 3;
    this.need(lines.length * step + 2);
    doc.text(lines, this.M, this.y);
    this.y += lines.length * step + 2;
  };
  Pdf.prototype.h1 = function (str) { this.para(str, 16, "bold", [31, 56, 100]); };
  Pdf.prototype.h2 = function (str) { this.y += 6; this.para(str, 12, "bold", [31, 56, 100]); this.rule(); };
  Pdf.prototype.table = function (cols, rows) {
    var self = this, doc = this.doc;
    var widths = cols.map(function (c) { return c.w; });
    var sum = widths.reduce(function (a, b) { return a + b; }, 0) || 1;
    var scale = (this.R - this.M) / sum;
    widths = widths.map(function (w) { return w * scale; });
    var used = widths.reduce(function (a, b) { return a + b; }, 0);
    widths[widths.length - 1] += (this.R - this.M) - used;
    function paint(cells, header) {
      doc.setFont("helvetica", header ? "bold" : "normal");
      doc.setFontSize(8);
      var parts = cells.map(function (cell, i) {
        var raw = cell == null || cell === "" ? "" : String(cell);
        return doc.splitTextToSize(clip(raw, 240) || (header ? "" : "-"), Math.max(10, widths[i] - 6));
      });
      var lines = 1;
      parts.forEach(function (p) { if (p.length > lines) lines = p.length; });
      var h = lines * 9 + 7;
      if (self.y + h > 736) {
        doc.addPage();
        self.y = 48;
        if (!header) paint(cols.map(function (c) { return c.t; }), true);
      }
      if (header) {
        doc.setFillColor(31, 56, 100);
        doc.rect(self.M, self.y, self.R - self.M, h, "F");
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(34, 34, 34);
      }
      var x = self.M;
      parts.forEach(function (p, i) {
        doc.text(p, x + 3, self.y + 10);
        x += widths[i];
      });
      self.y += h;
      if (!header) {
        doc.setDrawColor(226, 230, 236);
        doc.line(self.M, self.y, self.R, self.y);
      }
    }
    paint(cols.map(function (c) { return c.t; }), true);
    if (!rows.length) paint(["None recorded."], false);
    rows.forEach(function (r) { paint(r, false); });
    this.y += 6;
  };
  Pdf.prototype.footer = function () {
    var doc = this.doc;
    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text("Smackin' Snacks  |  Lot Recall Packet  |  " + this.query + "  |  Page " + i + " of " + n, 36, 770);
    }
  };

  function writePdf(view) {
    var Ctor = root.jspdf && root.jspdf.jsPDF;
    if (!Ctor) throw new Error("PDF library not loaded. Refresh the page.");
    var pdf = new Pdf(Ctor);
    pdf.query = clip(view.query || "lot", 42);
    pdf.h1("Lot Recall Packet");
    pdf.para("Mock recall and SQF packet for the lot open on Trace. Generated " + (view.runAt || "") + " by " + view.operator + ".", 10, "normal", [70, 70, 70]);
    pdf.para("Lookup: " + (view.query || "-"), 11, "bold");
    if (view.drill) pdf.para("Mock recall time: " + view.drill, 11, "bold", [161, 17, 17]);
    pdf.para("Trace data: " + view.traceMode + (view.loadError ? ". Load note: " + view.loadError : ""), 9, "normal", [70, 70, 70]);

    pdf.h2("Finished lots");
    pdf.table(
      [{ t: "Lot", w: 70 }, { t: "Flavor", w: 70 }, { t: "Status", w: 48 }, { t: "Packed", w: 36 }, { t: "Shipped", w: 40 }, { t: "E-com", w: 36 }, { t: "By hand", w: 40 }, { t: "On hand", w: 40 }, { t: "Unacct", w: 46 }],
      view.lots.map(function (r) {
        return [r.lot, (r.flavor || "") + (r.size ? " " + r.size : ""), r.state + (r.reason ? " (" + r.reason + ")" : ""), r.packed, r.shipped, r.ecom, r.ecomHand, r.left, r.unaccounted];
      })
    );
    pdf.para("Unacct is packed minus shipped, line, pallet e-com, other, scrap, and on hand. By hand is not subtracted. POs: " + (view.lots.map(function (r) { return r.posText ? r.lot + " " + r.posText : ""; }).filter(Boolean).join(" | ") || "none"), 8, "normal", [70, 70, 70]);

    pdf.h2("Supplier and inbound lots");
    pdf.table(
      [{ t: "Supplier lot", w: 70 }, { t: "Supplier", w: 70 }, { t: "Item", w: 80 }, { t: "PO", w: 50 }, { t: "Qty", w: 40 }, { t: "Status", w: 46 }, { t: "Received", w: 50 }, { t: "Finished lots", w: 70 }],
      view.inbound.map(function (r) {
        return [r.supplierLot || r.lpn, r.supplier, r.item, r.po, (r.qty == null ? "" : r.qty) + " " + (r.uom || ""), r.status, r.received, r.finishedLots];
      })
    );
    if (view.bins.length) {
      pdf.h2("Mix bins");
      pdf.table(
        [{ t: "Bin", w: 80 }, { t: "Batch", w: 70 }, { t: "Flavor", w: 80 }, { t: "Mixer", w: 40 }, { t: "Date", w: 50 }, { t: "Finished lots", w: 90 }],
        view.bins.map(function (r) { return [r.lpn, r.batch, r.flavor, r.mixer, r.date, r.finishedLots]; })
      );
    }
    if (view.receiving.length) {
      pdf.h2("Receiving and registries");
      pdf.table(
        [{ t: "Date", w: 48 }, { t: "Source", w: 70 }, { t: "Supplier", w: 70 }, { t: "Lot", w: 70 }, { t: "Qty", w: 36 }, { t: "Detail", w: 110 }],
        view.receiving.map(function (r) { return [r.date, r.source, r.supplier, r.lot, r.qty, r.detail]; })
      );
    }

    pdf.h2("Finished pallets");
    pdf.table(
      [{ t: "Pallet", w: 78 }, { t: "Lot", w: 68 }, { t: "Qty", w: 32 }, { t: "Left", w: 32 }, { t: "Status", w: 48 }, { t: "Hold", w: 42 }, { t: "Where", w: 50 }, { t: "Packed", w: 48 }, { t: "Reason", w: 70 }],
      view.pallets.map(function (r) { return [r.lpn, r.lot, r.qty, r.left, r.status, r.hold, r.location, r.packed, r.reason]; })
    );

    pdf.h2("Use and Ship");
    pdf.table(
      [{ t: "When", w: 68 }, { t: "Type", w: 42 }, { t: "Lot", w: 64 }, { t: "Qty", w: 32 }, { t: "To", w: 70 }, { t: "PO", w: 48 }, { t: "Customer", w: 60 }, { t: "By", w: 48 }],
      view.moves.map(function (r) {
        return [r.when, r.type + (r.byHand ? " hand" : ""), r.lot, r.qty, r.to, r.ref, r.customer, r.operator];
      }).concat(view.outbound.map(function (r) {
        return [r.date, "OB pallet", r.lots, r.qty, r.customer, r.po, r.customer, r.status];
      }))
    );

    pdf.h2("Customers and destinations");
    pdf.table(
      [{ t: "Destination", w: 140 }, { t: "PO", w: 80 }, { t: "Qty", w: 50 }, { t: "Source", w: 160 }],
      view.customers.map(function (r) { return [r.destination, r.po, r.qty, r.source]; })
    );
    if (view.windows.length) {
      pdf.h2("E-com pull windows");
      pdf.table(
        [{ t: "Lot", w: 80 }, { t: "Flavor", w: 80 }, { t: "Pulled", w: 70 }, { t: "Bags", w: 36 }, { t: "Ends", w: 80 }, { t: "Next lot", w: 70 }],
        view.windows.map(function (r) { return [r.lot, (r.flavor || "") + (r.size ? " " + r.size : ""), r.pulled, r.bags, r.open ? "still open" : r.ends, r.nextLot]; })
      );
    }
    if (view.qa.length) {
      pdf.h2("Hold and release history");
      pdf.table(
        [{ t: "When", w: 80 }, { t: "Action", w: 60 }, { t: "Lot", w: 80 }, { t: "Operator", w: 60 }, { t: "Reason", w: 160 }],
        view.qa.map(function (r) { return [r.when, r.type, r.lot, r.operator, r.reason]; })
      );
    }

    pdf.h2("SPS documents");
    pdf.table(
      [{ t: "Type", w: 70 }, { t: "Partner", w: 70 }, { t: "PO", w: 60 }, { t: "Status", w: 50 }, { t: "Ship to", w: 80 }, { t: "BOL", w: 50 }, { t: "Ship date", w: 50 }],
      view.sps.map(function (r) { return [r.type, r.partner, r.pos, r.status, r.shipTo, r.bol, r.shipDate]; })
    );
    pdf.h2("Orders");
    pdf.table(
      [{ t: "Customer", w: 90 }, { t: "PO", w: 60 }, { t: "Status", w: 50 }, { t: "Ship date", w: 55 }, { t: "Tracking", w: 70 }, { t: "Detail", w: 110 }],
      view.orders.map(function (r) { return [r.customer, r.po, r.status, r.shipDate, r.tracking, r.detail]; })
    );
    pdf.h2("Shipments");
    pdf.table(
      [{ t: "Link", w: 52 }, { t: "Date", w: 48 }, { t: "Recipient", w: 70 }, { t: "Tracking", w: 60 }, { t: "Status", w: 40 }, { t: "Contents", w: 150 }],
      view.shipments.map(function (r) { return [linkLabel(r.strength), r.date, r.recipient, r.tracking, r.status, r.contents]; })
    );

    pdf.h2("How this packet is linked");
    view.how.forEach(function (line) { pdf.para(line, 9, "normal", [50, 50, 50]); });
    pdf.h2("Gaps");
    if (!view.gaps.length) pdf.para("No extra gap beyond the link notes above.", 9);
    view.gaps.forEach(function (line) { pdf.para(line, 9, "normal", [120, 40, 40]); });
    pdf.y += 12;
    pdf.para("Reviewed by: ______________________________    Date: ______________", 10);
    pdf.para("Working packet for mock recall drills. Quality reviews it before it is a controlled record.", 8, "normal", [110, 110, 110]);
    pdf.footer();
    var file = "Recall " + safeFile(view.query) + " " + stamp(view.runAt) + ".pdf";
    pdf.doc.save(file);
    return file;
  }

  function exportPacket(fmt, packet) {
    fmt = fmt === "xlsx" ? "xlsx" : "pdf";
    if (fmt === "pdf" && !(root.jspdf && root.jspdf.jsPDF)) {
      return Promise.resolve({ ok: false, msg: "PDF library not loaded. Refresh the page." });
    }
    if (fmt === "xlsx" && !root.XLSX) {
      return Promise.resolve({ ok: false, msg: "Spreadsheet library not loaded. Refresh the page." });
    }
    return enrich(packet).then(function (view) {
      try {
        var file = fmt === "pdf" ? writePdf(view) : writeXlsx(view);
        return { ok: true, file: file };
      } catch (e) {
        return { ok: false, msg: (e && e.message) || "Recall export failed" };
      }
    });
  }

  var api = {
    exportPacket: exportPacket,
    enrich: enrich,
    sheetsOf: sheetsOf,
    matchesFlavor: matchesFlavor,
    inWindow: inWindow,
    dayKey: dayKey,
    flavorTokens: flavorTokens,
    sizeOk: sizeOk,
    gapsFor: gapsFor,
    howLines: howLines,
    baseView: baseView
  };
  root.TRACE_RECALL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================================
   Smackin' OS - Inbound and Outbound hubs (inout-hubs.js)
   Two top tabs replace Purchasing + Receiving and Shipping:
     Inbound:  1 Supplier PO > 2 Receive at the dock > 3 COA / QA check > 4 Put away
     Outbound: 1 Order in > 2 Pick / build pallet > 3 Trailer release (SQF)
               > 4 Ship and record tracking > 5 File the paperwork
   Each step shows what is open right now and the button that opens the
   screen that already does the work. This file only reads. It writes
   nothing to Supabase, stock, orders, POs, or qc_forms.
   Data: DB.supplierPos / receivingLog / purchaseOrders / items / atLoc,
   POSTATUS.derive, DB.stock, DB.demandLines / orders / shippingLog / orderDocs,
   ORDER_LANE (same retail list as the Retail orders board), OUTBOUND_FOLDERS, and a
   read-only select on qc_forms (form_type outbound_trailer_release).
   Opened by dept-homes.js (tools inhub / outhub). No app.js edit.
   Exposes window.INOUT_HUBS. No DOM timers.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var RELEASE_TYPE = "outbound_trailer_release";
  var HOLD_ZONES = ["QA-HOLD", "QUARANTINE", "RETURNS-HOLD"];
  var ROW_CAP = 15;
  var PUTAWAY_DAYS = 14;
  var state = { which: "", active: false, painting: false, rel: null, relAt: 0, relErr: "", relBusy: false, allIn: false, allOut: false };
  var sb = null;

  function $(id) { return doc ? doc.getElementById(id) : null; }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[lang()] || v.en || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function arr(fn) { try { var v = fn(); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function num(v) { var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
  function fmt(n) { try { return Number(n || 0).toLocaleString("en-US"); } catch (e) { return String(n); } }
  function cloud() { try { return !!(root.DB && root.DB.mode === "cloud"); } catch (e) { return false; } }

  // ---- dates (America/Denver) ------------------------------------------
  function denverDay(d) {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date()); }
    catch (e) { return (d || new Date()).toISOString().slice(0, 10); }
  }
  function denverTime(iso) {
    if (!iso) return "";
    try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) + " MT"; }
    catch (e) { return String(iso).slice(0, 16); }
  }
  function addDays(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return iso;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  // 2026-11-30, 11/30/2026, 11/30/26
  function isoOf(s) {
    if (!s) return "";
    s = String(s).trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      var y = m[3].length === 2 ? "20" + m[3] : m[3];
      return y + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    }
    return "";
  }
  function shortDay(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return (+p[1]) + "/" + (+p[2]);
  }
  function poKey(s) { return String(s || "").toUpperCase().replace(/^#/, "").replace(/\s+/g, ""); }
  function normCoa(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase();
    if (s === "n" || s === "no" || s === "false") return "no";
    if (s === "y" || s === "yes" || s === "true") return "yes";
    return s;
  }
  function linesOf(po) {
    try {
      var l = typeof po.lines === "string" ? JSON.parse(po.lines || "[]") : (po.lines || []);
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }

  // ---- words ----------------------------------------------------------
  var W = {
    inTitle: { en: "Inbound: supplier to shelf", es: "Entrada: del proveedor al estante", pt: "Entrada: do fornecedor a prateleira" },
    inIntro: { en: "Every delivery goes through these 4 steps, in order. Each step shows what is open now. Click a button to open that screen.", es: "Cada entrega pasa por estos 4 pasos, en orden. Cada paso muestra lo pendiente. Haga clic en un boton para abrir esa pantalla.", pt: "Cada entrega passa por estas 4 etapas, em ordem. Cada etapa mostra o que esta aberto. Clique num botao para abrir a tela." },
    outTitle: { en: "Outbound: order to truck", es: "Salida: de la orden al camion", pt: "Saida: do pedido ao caminhao" },
    outIntro: { en: "Every retail load goes through these 5 steps, in order. The table below shows each open PO and which steps are done.", es: "Cada carga retail pasa por estos 5 pasos, en orden. La tabla muestra cada OC abierta y que pasos estan hechos.", pt: "Cada carga de varejo passa por estas 5 etapas, em ordem. A tabela mostra cada pedido aberto e quais etapas estao feitas." },
    offline: { en: "This browser is not on the shared cloud database. Counts below are not live plant data.", es: "Este navegador no esta en la base compartida. Lo de abajo no es dato en vivo.", pt: "Este navegador nao esta na base compartilhada. O que aparece abaixo nao e dado ao vivo." },
    attention: { en: "Needs attention", es: "Requiere atencion", pt: "Precisa de atencao" },
    nothing: { en: "Nothing open.", es: "Nada pendiente.", pt: "Nada aberto." },
    other: { en: "Other inbound screens", es: "Otras pantallas de entrada", pt: "Outras telas de entrada" },
    otherOut: { en: "Other outbound screens", es: "Otras pantallas de salida", pt: "Outras telas de saida" },
    showAll: { en: "Show all", es: "Ver todo", pt: "Ver tudo" },
    late: { en: "Late", es: "Atrasado", pt: "Atrasado" },
    notYet: { en: "Not yet", es: "Aun no", pt: "Ainda nao" },
    released: { en: "Released", es: "Liberado", pt: "Liberado" },
    rejected: { en: "Rejected", es: "Rechazado", pt: "Rejeitado" },
    logged: { en: "Logged", es: "Registrado", pt: "Registrado" },
    noDate: { en: "No date", es: "Sin fecha", pt: "Sem data" },
    loading: { en: "Loading trailer releases...", es: "Cargando liberaciones...", pt: "Carregando liberacoes..." },
    moved: { en: "Purchasing, Receiving, and Shipping now live inside Inbound and Outbound. Every screen is still here, in the tabs above.", es: "Compras, Recibo y Envios ahora estan dentro de Entrada y Salida. Todas las pantallas siguen aqui, en las pestanas de arriba.", pt: "Compras, Recebimento e Envios agora ficam em Entrada e Saida. Todas as telas continuam aqui, nas abas acima." }
  };

  // ---- inbound model (pure: pass the data in) ---------------------------
  function inboundModel(src) {
    src = src || {};
    var today = src.today || denverDay();
    var week = addDays(today, 7);
    var rlog = src.receivingLog || [];
    var spos = src.supplierPos || [];
    var pos = [];
    spos.forEach(function (po) {
      var derived = null;
      try { if (src.derive) derived = src.derive(po, rlog, spos); } catch (e) { derived = null; }
      if (derived && derived.status !== "open" && derived.status !== "partial") return;
      if (!derived && /\b(cancel+ed|cancel|void(ed)?)\b/i.test(String(po.notes || ""))) return;
      var raw = linesOf(po), open = [];
      raw.forEach(function (l, i) {
        var recv = derived && derived.lines && derived.lines[i] ? !!derived.lines[i].recv : !!(l.recv || l.received === true);
        if (!recv) open.push(l);
      });
      if (raw.length && !open.length) return;
      var expect = open.map(function (l) { return isoOf(l.ship || l.ship_date || l.expected || l.eta); }).filter(Boolean).sort()[0] || isoOf(po.expected);
      pos.push({ num: po.po_num || po.id || "", vendor: po.vendor || "", expect: expect, nLines: open.length || raw.length, partial: !!(derived && derived.status === "partial"),
        late: !!(expect && expect < today), soon: !!(expect && expect >= today && expect <= week) });
    });
    (src.purchaseOrders || []).forEach(function (po) {
      var st = String(po.status || "").toLowerCase();
      if (st !== "ordered" && st !== "partial") return;
      var open = (po.lines || []).filter(function (l) { return num(l.qty) - num(l.received) > 0; });
      if (!open.length) return;
      var expect = isoOf(po.expected);
      pos.push({ num: po.id || "", vendor: po.supplierName || po.supplier || "", expect: expect, nLines: open.length, partial: st === "partial", legacy: true,
        late: !!(expect && expect < today), soon: !!(expect && expect >= today && expect <= week) });
    });
    pos.sort(function (a, b) { return String(a.expect || "9999").localeCompare(String(b.expect || "9999")) || String(a.num).localeCompare(String(b.num)); });

    var recvToday = 0, invoicePending = [], coaMissing = [], recvHolds = [];
    rlog.forEach(function (r) {
      if (!r) return;
      if (isoOf(r.recv_date) === today) recvToday++;
      if (r.invoice_pending === true) invoicePending.push(r);
      if (normCoa(r.coa_received) === "no" && !r.coa_released_at) coaMissing.push(r);
      if (r.on_hold === true) recvHolds.push(r);
    });
    var held = [], byId = {};
    (src.items || []).forEach(function (it) {
      if (!it) return;
      byId[it.id] = it;
      HOLD_ZONES.forEach(function (z) {
        var q = 0; try { q = num(src.atLoc(it.id, z)); } catch (e) { q = 0; }
        if (q > 0) held.push({ name: it.name || it.code || it.id, code: it.code || it.id, unit: it.unit || "", zone: z, qty: q });
      });
    });
    // Put away: a lot received in the last PUTAWAY_DAYS that still sits in
    // RECEIVING. Count corrections parked in RECEIVING have no receipt and
    // are not listed.
    var lotKey = function (v) { return String(v == null ? "" : v).trim().toUpperCase(); };
    var inRecvStock = {};
    (src.stock || []).forEach(function (r) {
      if (!r || String(r.location || "").toUpperCase() !== "RECEIVING" || !(num(r.qty) > 0)) return;
      var lk = lotKey(r.lot);
      if (!lk) return;
      var k = r.item_id + "|" + lk;
      inRecvStock[k] = (inRecvStock[k] || 0) + num(r.qty);
    });
    var since = addDays(today, -PUTAWAY_DAYS), inRecv = [], seenPut = {};
    rlog.forEach(function (r) {
      if (!r || !r.item_id || isoOf(r.recv_date) < since) return;
      var k = r.item_id + "|" + lotKey(r.lot);
      if (!lotKey(r.lot) || !inRecvStock[k] || seenPut[k]) return;
      seenPut[k] = 1;
      var it = byId[r.item_id] || {};
      inRecv.push({ name: it.name || r.contents || r.item_id, code: it.code || r.item_id, unit: it.unit || "", qty: inRecvStock[k], lot: r.lot, date: isoOf(r.recv_date), supplier: r.supplier || "" });
    });
    return {
      today: today, pos: pos,
      posLate: pos.filter(function (p) { return p.late; }).length,
      posSoon: pos.filter(function (p) { return p.soon; }).length,
      recvToday: recvToday, invoicePending: invoicePending, coaMissing: coaMissing, recvHolds: recvHolds,
      held: held, inRecv: inRecv
    };
  }

  // ---- outbound model (pure) -------------------------------------------
  function laneOfGroup(g, orders, lanes) {
    if (!lanes) return "retail";
    try {
      if (g.order) return lanes.channel(g.order);
      if (g.source === "Orders") {
        var k = poKey(g.po);
        for (var i = 0; i < orders.length; i++) {
          if (poKey(orders[i].customer_po || orders[i].order_id) === k) return lanes.channel(orders[i]);
        }
        return "retail";
      }
      return lanes.demandChannel({ source: g.source, partner: g.customer });
    } catch (e) { return "retail"; }
  }
  function latestBy(rows, keyFn) {
    var m = {};
    (rows || []).forEach(function (r) {
      var k = keyFn(r);
      if (!k) return;
      var t = String(r.reviewed_at || r.created_at || "");
      if (!m[k] || t > String(m[k].reviewed_at || m[k].created_at || "")) m[k] = r;
    });
    return m;
  }
  function outboundModel(src) {
    src = src || {};
    var today = src.today || denverDay();
    var soon = addDays(today, 2);
    var orders = src.orders || [];
    // Same list as the Retail orders board: open orders, retail lane.
    // Cases come from the open demand lines for that PO when there are any.
    // Ship by: the order ship date, else the demand line due date for that
    // PO, else the SPS requested delivery (appointment). invoice_date is the
    // SPS order date and is not used.
    // Two open order rows for the same PO show once; the extra rows are counted.
    var casesByPo = {}, dueByPo = {};
    (src.demandLines || []).forEach(function (d) {
      if (String(d.status || "Open") !== "Open") return;
      var k = poKey(d.po);
      if (!k) return;
      casesByPo[k] = (casesByPo[k] || 0) + num(d.cases);
      var dd = isoOf(d.due_date);
      if (dd && (!dueByPo[k] || dd < dueByPo[k])) dueByPo[k] = dd;
    });
    var groups = [], seenPo = {}, dupRows = 0;
    orders.forEach(function (o) {
      if (String(o.status || "") !== "Open") return;
      var po = String(o.customer_po || o.order_id || "").trim();
      var k = poKey(po);
      var g = { po: po, customer: o.customer || "", due: isoOf(o.ship_date) || dueByPo[k] || isoOf(o.appointment) || "", source: "Orders", order: o, ordered_cases: casesByPo[k] || 0 };
      if (k && seenPo[k]) {
        if (laneOfGroup(g, orders, src.lanes) !== "ecom") dupRows++;
        if (!seenPo[k].due && g.due) seenPo[k].due = g.due;
        return;
      }
      if (k) seenPo[k] = g;
      groups.push(g);
    });
    var rel = latestBy(src.releases || [], function (r) { return poKey(r.ref); });
    var shipByPo = {};
    (src.shippingLog || []).forEach(function (s) {
      var k = poKey(s.po_num);
      if (k) (shipByPo[k] = shipByPo[k] || []).push(s);
    });
    var docsByPo = {};
    (src.orderDocs || []).forEach(function (d) {
      var k = poKey(d.po_num);
      if (k) docsByPo[k] = (docsByPo[k] || 0) + 1;
    });
    var rows = [], ecom = 0;
    groups.forEach(function (g) {
      if (laneOfGroup(g, orders, src.lanes) === "ecom") { ecom++; return; }
      var k = poKey(g.po);
      var due = isoOf(g.due);
      var r = rel[k] || null;
      var ships = shipByPo[k] || [];
      rows.push({
        po: g.po, customer: g.customer || "", due: due, cases: g.ordered_cases || 0,
        late: !!(due && due < today), soon: !!(due && due >= today && due <= soon),
        release: r ? { result: String(r.result || "").toUpperCase(), at: r.reviewed_at || r.created_at || "" } : null,
        shipped: ships.length ? { tracking: ships[0].tracking || ships[0].bol_number || "", carrier: ships[0].carrier || "" } : null,
        docs: docsByPo[k] || 0
      });
    });
    rows.sort(function (a, b) {
      return (b.late - a.late) || String(a.due || "9999").localeCompare(String(b.due || "9999")) || (a.customer + a.po).localeCompare(b.customer + b.po);
    });
    var relToday = (src.releases || []).filter(function (r) { return isoOf(r.form_date) === today; });
    return {
      today: today, rows: rows, ecomOpen: ecom, dupRows: dupRows,
      late: rows.filter(function (r) { return r.late; }).length,
      soon: rows.filter(function (r) { return r.soon; }).length,
      relToday: relToday.filter(function (r) { return String(r.result).toUpperCase() === "RELEASED"; }).length,
      rejToday: relToday.filter(function (r) { return String(r.result).toUpperCase() === "REJECTED"; }).length,
      notReleasedSoon: rows.filter(function (r) { return (r.late || r.soon) && !(r.release && r.release.result === "RELEASED"); }).length,
      shipsToday: (src.shippingLog || []).filter(function (s) { return isoOf(s.ship_date) === today; }).length,
      docsToday: (src.orderDocs || []).filter(function (d) { return isoOf(String(d.created_at || "").slice(0, 10)) === today; }).length,
      withDocs: rows.filter(function (r) { return r.docs > 0; }).length
    };
  }

  // ---- live data --------------------------------------------------------
  function liveInbound() {
    var DB = root.DB;
    return inboundModel({
      today: denverDay(),
      supplierPos: arr(function () { return DB.supplierPos(); }),
      stock: arr(function () { return DB.stock(); }),
      receivingLog: arr(function () { return DB.receivingLog(); }),
      purchaseOrders: arr(function () { return DB.purchaseOrders(); }).map(function (p) {
        var o = Object.assign({}, p);
        try { if (DB.supplierName) o.supplierName = DB.supplierName(p.supplier); } catch (e) {}
        return o;
      }),
      items: arr(function () { return DB.items(); }),
      atLoc: function (id, z) { return DB.atLoc(id, z); },
      derive: root.POSTATUS && root.POSTATUS.derive ? function (po, rl, sp) { return root.POSTATUS.derive(po, rl, sp); } : null
    });
  }
  function liveOutbound() {
    var DB = root.DB;
    return outboundModel({
      today: denverDay(),
      demandLines: arr(function () { return DB.demandLines(); }),
      orders: arr(function () { return DB.orders(); }),
      lanes: root.ORDER_LANE || null,
      releases: state.rel || [],
      shippingLog: arr(function () { return DB.shippingLog(); }),
      orderDocs: arr(function () { return DB.orderDocs(); })
    });
  }
  function client() {
    if (sb) return sb;
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try {
      sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "ioh-auth" }
      });
    } catch (e) { sb = null; }
    return sb;
  }
  // Read only. Last 45 days of trailer releases.
  function loadReleases(force) {
    if (!cloud()) return;
    if (state.relBusy) return;
    if (!force && state.rel && Date.now() - state.relAt < 60000) return;
    var c = client();
    if (!c) return;
    state.relBusy = true;
    var since = addDays(denverDay(), -45);
    c.from("qc_forms").select("ref,form_date,result,reviewed_at,created_at").eq("form_type", RELEASE_TYPE).gte("form_date", since)
      .order("created_at", { ascending: false }).limit(2000).then(function (r) {
        state.relBusy = false;
        if (r && r.error) { state.relErr = r.error.message || "load failed"; return; }
        state.relErr = ""; state.rel = (r && r.data) || []; state.relAt = Date.now();
        if (state.active && state.which === "out" && $("ioh-root")) render();
      }, function (e) { state.relBusy = false; state.relErr = String(e && e.message || e); });
  }

  // ---- render helpers -----------------------------------------------------
  function chip(text, tone) { return '<span class="ioh-chip ioh-' + (tone || "mute") + '">' + esc(text) + "</span>"; }
  function subBtn(id, label, primary) {
    return '<button type="button" class="ioh-btn' + (primary ? " ioh-btn-p" : "") + '" data-dept-sub="' + esc(id) + '">' + esc(label) + "</button>";
  }
  function stepCard(n, title, what, status, buttons) {
    return '<div class="ioh-step"><div class="ioh-n">' + n + '</div><div class="ioh-body"><h3>' + esc(title) + "</h3>" +
      '<p class="ioh-what">' + esc(what) + "</p>" +
      '<div class="ioh-status">' + status + "</div>" +
      '<div class="ioh-btns">' + buttons + "</div></div></div>";
  }
  function arrow() { return '<div class="ioh-arrow" aria-hidden="true">&rsaquo;</div>'; }
  function table(cols, rows, more) {
    if (!rows.length) return '<p class="ioh-empty">' + esc(tx(W.nothing)) + "</p>";
    return '<div class="ioh-tw"><table class="ioh-t"><thead><tr>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>" + (more || "");
  }
  function moreBtn(kind, total) {
    if (total <= ROW_CAP) return "";
    return '<button type="button" class="ioh-link" data-ioh-more="' + kind + '">' + esc(tx(W.showAll)) + " (" + total + ")</button>";
  }

  // ---- inbound page ---------------------------------------------------------
  function inboundHtml(m) {
    var t = {
      s1: { en: "Order from the supplier", es: "Pedir al proveedor", pt: "Pedir ao fornecedor" },
      s1w: { en: "Create the supplier PO and send it. Due in shows what should arrive and when.", es: "Cree la OC y enviela. Por llegar muestra que debe llegar y cuando.", pt: "Crie a OC e envie. A chegar mostra o que deve chegar e quando." },
      s2: { en: "Receive at the dock", es: "Recibir en el muelle", pt: "Receber no cais" },
      s2w: { en: "Count it and save it on Receive (item, lot, qty, best-by). Then finish the Dock checklist: trailer, seal, condition, paperwork.", es: "Cuente y guarde en Recibir (item, lote, cantidad, fecha). Luego termine la lista del muelle: trailer, sello, condicion, papeles.", pt: "Conte e salve em Receber (item, lote, qtd, validade). Depois termine a lista do cais: trailer, lacre, condicao, papeis." },
      s3: { en: "COA and quality check", es: "COA y revision de calidad", pt: "COA e checagem de qualidade" },
      s3w: { en: "Upload the supplier COA. No COA on seed, seasoning, oil, malto, or stevia puts the lot on QA hold until Quality releases it.", es: "Suba el COA. Sin COA en semilla, sazon, aceite, malto o stevia el lote queda en retencion QA hasta que Calidad lo libere.", pt: "Envie o COA. Sem COA em semente, tempero, oleo, malto ou stevia o lote fica em retencao QA ate a Qualidade liberar." },
      s4: { en: "Put away", es: "Guardar", pt: "Guardar" },
      s4w: { en: "Move it from RECEIVING to its rack or floor location so it shows in the right place.", es: "Muevalo de RECEIVING a su rack o ubicacion para que aparezca en el lugar correcto.", pt: "Mova de RECEIVING para o rack ou local certo." }
    };
    var st1 = (m.pos.length ? chip(m.pos.length + " " + tx({ en: "open POs", es: "OC abiertas", pt: "OCs abertas" }), "info") : chip(tx(W.nothing), "ok")) +
      (m.posSoon ? chip(m.posSoon + " " + tx({ en: "due this week", es: "llegan esta semana", pt: "chegam esta semana" }), "warn") : "") +
      (m.posLate ? chip(m.posLate + " " + tx({ en: "past due date", es: "con fecha vencida", pt: "com data vencida" }), "bad") : "");
    var st2 = chip(m.recvToday + " " + tx({ en: "received today", es: "recibidos hoy", pt: "recebidos hoje" }), m.recvToday ? "ok" : "mute") +
      (m.invoicePending.length ? chip(m.invoicePending.length + " " + tx({ en: "invoice pending", es: "factura pendiente", pt: "fatura pendente" }), "warn") : "") +
      (m.recvHolds.length ? chip(m.recvHolds.length + " " + tx({ en: "receiving holds", es: "retenciones de recibo", pt: "retencoes de recebimento" }), "bad") : "");
    var st3 = (m.coaMissing.length ? chip(m.coaMissing.length + " " + tx({ en: "missing COA", es: "sin COA", pt: "sem COA" }), "bad") : chip(tx({ en: "No missing COAs", es: "Sin COA faltantes", pt: "Sem COA faltando" }), "ok")) +
      (m.held.length ? chip(m.held.length + " " + tx({ en: "items on hold", es: "items retenidos", pt: "itens retidos" }), "warn") : "");
    var st4 = m.inRecv.length ? chip(m.inRecv.length + " " + tx({ en: "lots received in 14 days still in RECEIVING", es: "lotes de 14 dias aun en RECEIVING", pt: "lotes de 14 dias ainda em RECEIVING" }), "warn") : chip(tx({ en: "Recent receipts are put away", es: "Recibos recientes guardados", pt: "Recebimentos recentes guardados" }), "ok");

    var steps = '<div class="ioh-steps">' +
      stepCard(1, tx(t.s1), tx(t.s1w), st1, subBtn("purchasing", tx({ en: "Supplier POs", es: "OC de proveedor", pt: "OCs de fornecedor" }), true) + subBtn("expreceipts", tx({ en: "Due in", es: "Por llegar", pt: "A chegar" }))) + arrow() +
      stepCard(2, tx(t.s2), tx(t.s2w), st2, subBtn("receive", tx({ en: "Receive", es: "Recibir", pt: "Receber" }), true) + subBtn("recvlog", tx({ en: "Dock checklist", es: "Lista del muelle", pt: "Lista do cais" }))) + arrow() +
      stepCard(3, tx(t.s3), tx(t.s3w), st3, subBtn("coalib", tx({ en: "Upload / find COA", es: "Subir / buscar COA", pt: "Enviar / achar COA" }), true) + subBtn("quarantine", tx({ en: "On hold", es: "Retenido", pt: "Retido" }))) + arrow() +
      stepCard(4, tx(t.s4), tx(t.s4w), st4, subBtn("move", tx({ en: "Put away", es: "Guardar", pt: "Guardar" }), true)) +
      "</div>";

    // Needs attention: one list, worst first.
    var att = [], coaIds = {};
    m.coaMissing.forEach(function (r) {
      coaIds[r.id] = 1;
      var label = tx({ en: "Missing COA", es: "Sin COA", pt: "Sem COA" }) + (r.on_hold === true ? tx({ en: " (on hold)", es: " (retenido)", pt: " (retido)" }) : "");
      att.push([chip(label, "bad"), esc(r.contents || r.item_id || ""), esc(r.supplier || ""), esc(r.lot || ""), esc(shortDay(isoOf(r.recv_date))), subBtn("coalib", "COA")]);
    });
    m.recvHolds.forEach(function (r) {
      if (coaIds[r.id]) return;
      att.push([chip(tx({ en: "Receiving hold", es: "Retencion", pt: "Retencao" }), "bad"), esc(r.contents || r.item_id || ""), esc(r.supplier || ""), esc(r.lot || ""), esc(shortDay(isoOf(r.recv_date))), subBtn("quarantine", tx({ en: "On hold", es: "Retenido", pt: "Retido" }))]);
    });
    m.pos.filter(function (p) { return p.late; }).forEach(function (p) {
      att.push([chip(tx({ en: "PO past due date", es: "OC vencida", pt: "OC vencida" }), "warn"), esc(p.num), esc(p.vendor), "", esc(shortDay(p.expect)), subBtn("expreceipts", tx({ en: "Due in", es: "Por llegar", pt: "A chegar" }))]);
    });
    m.inRecv.forEach(function (r) {
      att.push([chip(tx({ en: "Still in RECEIVING", es: "Aun en RECEIVING", pt: "Ainda em RECEIVING" }), "warn"), esc(r.name) + ' <span class="ioh-meta">' + esc(r.code) + "</span>", esc(r.supplier), esc(r.lot) + '<div class="ioh-meta">' + fmt(r.qty) + " " + esc(r.unit) + "</div>", esc(shortDay(r.date)), subBtn("move", tx({ en: "Put away", es: "Guardar", pt: "Guardar" }))]);
    });
    m.invoicePending.forEach(function (r) {
      att.push([chip(tx({ en: "Invoice pending", es: "Factura pendiente", pt: "Fatura pendente" }), "info"), esc(r.contents || r.item_id || ""), esc(r.supplier || ""), esc(r.lot || ""), esc(shortDay(isoOf(r.recv_date))), subBtn("recvlog", tx({ en: "Dock checklist", es: "Lista del muelle", pt: "Lista do cais" }))]);
    });
    var attRows = state.allIn ? att : att.slice(0, ROW_CAP);
    var attHtml = '<section class="ioh-card"><h3>' + esc(tx(W.attention)) + "</h3>" +
      table([tx({ en: "What", es: "Que", pt: "O que" }), tx({ en: "Item / PO", es: "Item / OC", pt: "Item / OC" }), tx({ en: "Supplier", es: "Proveedor", pt: "Fornecedor" }), tx({ en: "Lot / qty", es: "Lote / cant.", pt: "Lote / qtd" }), tx({ en: "Date", es: "Fecha", pt: "Data" }), ""], attRows, state.allIn ? "" : moreBtn("in", att.length)) + "</section>";

    var due = m.pos.filter(function (p) { return !p.late; }).slice(0, ROW_CAP).map(function (p) {
      return [esc(p.expect ? shortDay(p.expect) : tx(W.noDate)) + (p.soon ? " " + chip(tx({ en: "this week", es: "esta semana", pt: "esta semana" }), "warn") : ""), "<b>" + esc(p.num) + "</b>" + (p.partial ? " " + chip(tx({ en: "Partly received", es: "Parcial", pt: "Parcial" }), "info") : ""), esc(p.vendor), String(p.nLines)];
    });
    var dueHtml = '<section class="ioh-card"><h3>' + esc(tx({ en: "Coming in (open supplier POs)", es: "Por llegar (OC abiertas)", pt: "A chegar (OCs abertas)" })) + "</h3>" +
      table([tx({ en: "Expected", es: "Esperado", pt: "Esperado" }), "PO", tx({ en: "Supplier", es: "Proveedor", pt: "Fornecedor" }), tx({ en: "Open lines", es: "Lineas", pt: "Linhas" })], due) + "</section>";

    var other = '<section class="ioh-card ioh-other"><h3>' + esc(tx(W.other)) + "</h3><div class=\"ioh-btns\">" +
      subBtn("returns", tx({ en: "Customer returns", es: "Devoluciones", pt: "Devolucoes" })) +
      subBtn("services", tx({ en: "Service invoices (not product)", es: "Facturas de servicio", pt: "Faturas de servico" })) +
      subBtn("reorder15", tx({ en: "1.5oz reorder rule", es: "Regla 1.5oz", pt: "Regra 1.5oz" })) +
      '</div><p class="ioh-meta">' + esc(tx(W.moved)) + "</p></section>";

    return '<div id="ioh-root" class="ioh" data-ioh="in" data-lang="' + lang() + '">' +
      '<div class="ioh-lead"><h2>' + esc(tx(W.inTitle)) + '</h2><p>' + esc(tx(W.inIntro)) + "</p></div>" +
      (cloud() ? "" : '<div class="ioh-banner">' + esc(tx(W.offline)) + "</div>") +
      steps + '<div class="ioh-grid">' + attHtml + dueHtml + "</div>" + other + "</div>";
  }

  // ---- outbound page --------------------------------------------------------
  function outboundHtml(m) {
    var t = {
      s1: { en: "Order comes in", es: "Llega la orden", pt: "Chega o pedido" },
      s1w: { en: "Retail POs come from SPS (850). Check the ship date and cases. E-com orders are a separate board.", es: "Las OC retail llegan de SPS (850). Revise fecha y cajas. E-com es otro tablero.", pt: "Pedidos de varejo chegam do SPS (850). Confira data e caixas. E-com e outro painel." },
      s2: { en: "Pick and build the pallets", es: "Surtir y armar tarimas", pt: "Separar e montar paletes" },
      s2w: { en: "Pull finished pallets for the PO. Use the oldest lot first and check best-by.", es: "Saque tarimas para la OC. Use el lote mas viejo primero y revise la fecha.", pt: "Separe paletes para o pedido. Use o lote mais antigo primeiro e confira a validade." },
      s3: { en: "Inspect trailer and release (SQF)", es: "Inspeccionar trailer y liberar (SQF)", pt: "Inspecionar trailer e liberar (SQF)" },
      s3w: { en: "Before loading: 7 dry van checks, lots, best-by, seal. Any fail means do not load.", es: "Antes de cargar: 7 revisiones, lotes, fecha, sello. Si falla, no se carga.", pt: "Antes de carregar: 7 checagens, lotes, validade, lacre. Falhou, nao carrega." },
      s4: { en: "Ship and record tracking", es: "Enviar y registrar rastreo", pt: "Enviar e registrar rastreio" },
      s4w: { en: "Log the carrier, PRO or tracking, and BOL number for the PO.", es: "Registre transportista, PRO o rastreo y BOL de la OC.", pt: "Registre transportadora, PRO ou rastreio e BOL do pedido." },
      s5: { en: "File the paperwork", es: "Archivar papeles", pt: "Arquivar papeis" },
      s5w: { en: "Signed BOL, packing list, and pull sheet go with the PO, in Order Docs or the customer Drive folder.", es: "BOL firmado, lista de empaque y hoja de surtido van con la OC, en Docs de Orden o la carpeta de Drive.", pt: "BOL assinado, lista e folha de separacao vao com o pedido, em Docs ou na pasta do Drive." }
    };
    var st1 = chip(m.rows.length + " " + tx({ en: "open retail POs", es: "OC retail abiertas", pt: "pedidos varejo abertos" }), "info") +
      (m.soon ? chip(m.soon + " " + tx({ en: "ship in 2 days", es: "salen en 2 dias", pt: "saem em 2 dias" }), "warn") : "") +
      (m.late ? chip(m.late + " " + tx({ en: "past ship date", es: "fecha vencida", pt: "data vencida" }), "bad") : "") +
      (m.dupRows ? chip(m.dupRows + " " + tx({ en: "duplicate order rows (same PO)", es: "filas duplicadas (misma OC)", pt: "linhas duplicadas (mesmo pedido)" }), "warn") : "");
    var st2 = chip(tx({ en: "Scan station (Lot Trace)", es: "Estacion de escaneo", pt: "Estacao de leitura" }), "mute");
    var st3 = (state.rel == null && cloud() ? chip(tx(W.loading), "mute") :
      chip(m.relToday + " " + tx({ en: "released today", es: "liberados hoy", pt: "liberados hoje" }), m.relToday ? "ok" : "mute") +
      (m.rejToday ? chip(m.rejToday + " " + tx({ en: "rejected today", es: "rechazados hoy", pt: "rejeitados hoje" }), "bad") : "") +
      (m.notReleasedSoon ? chip(m.notReleasedSoon + " " + tx({ en: "due soon, not released", es: "por salir sin liberar", pt: "a sair sem liberar" }), "warn") : ""));
    var st4 = chip(m.shipsToday + " " + tx({ en: "shipments logged today (all carriers)", es: "envios registrados hoy", pt: "envios registrados hoje" }), m.shipsToday ? "ok" : "mute");
    var st5 = chip(m.withDocs + " / " + m.rows.length + " " + tx({ en: "open POs have docs in the OS", es: "OC con documentos", pt: "pedidos com documentos" }), m.withDocs ? "info" : "mute");

    var steps = '<div class="ioh-steps ioh-steps5">' +
      stepCard(1, tx(t.s1), tx(t.s1w), st1, subBtn("ordersRetail", tx({ en: "Retail orders", es: "Ordenes retail", pt: "Pedidos varejo" }), true) + subBtn("ordersEcom", tx({ en: "E-com orders", es: "Ordenes e-com", pt: "Pedidos e-com" })) + subBtn("sps", tx({ en: "SPS documents", es: "Documentos SPS", pt: "Documentos SPS" }))) + arrow() +
      stepCard(2, tx(t.s2), tx(t.s2w), st2, subBtn("trShip", tx({ en: "Pick / build pallet", es: "Surtir / armar", pt: "Separar / montar" }), true)) + arrow() +
      stepCard(3, tx(t.s3), tx(t.s3w), st3, subBtn("trailer", tx({ en: "Trailer Release", es: "Liberar trailer", pt: "Liberar trailer" }), true)) + arrow() +
      stepCard(4, tx(t.s4), tx(t.s4w), st4, subBtn("shiplog", tx({ en: "Shipping log", es: "Registro de envios", pt: "Registro de envios" }), true) + subBtn("shipments", tx({ en: "Carrier shipments", es: "Envios del transportista", pt: "Envios da transportadora" }))) + arrow() +
      stepCard(5, tx(t.s5), tx(t.s5w), st5, subBtn("orderdocs", tx({ en: "Order docs", es: "Docs de orden", pt: "Docs do pedido" }), true)) +
      "</div>";

    var list = state.allOut ? m.rows : m.rows.slice(0, ROW_CAP);
    var folders = root.OUTBOUND_FOLDERS;
    var rows = list.map(function (r) {
      var dueCell = r.due ? esc(shortDay(r.due)) : '<span class="ioh-meta">' + esc(tx(W.noDate)) + "</span>";
      if (r.late) dueCell += " " + chip(tx(W.late), "bad");
      else if (r.soon) dueCell += " " + chip(tx({ en: "Soon", es: "Pronto", pt: "Logo" }), "warn");
      var relCell;
      if (r.release && r.release.result === "RELEASED") relCell = chip(tx(W.released), "ok") + ' <span class="ioh-meta">' + esc(denverTime(r.release.at)) + "</span>";
      else if (r.release && r.release.result === "REJECTED") relCell = chip(tx(W.rejected), "bad") + ' <button type="button" class="ioh-link" data-ioh-release="' + esc(r.po) + '" data-ioh-cust="' + esc(r.customer) + '">' + esc(tx({ en: "Redo", es: "Repetir", pt: "Refazer" })) + "</button>";
      else relCell = chip(tx(W.notYet), "mute") + ' <button type="button" class="ioh-link" data-ioh-release="' + esc(r.po) + '" data-ioh-cust="' + esc(r.customer) + '">' + esc(tx({ en: "Start", es: "Iniciar", pt: "Iniciar" })) + "</button>";
      var shipCell = r.shipped ? chip(tx(W.logged), "ok") + (r.shipped.tracking ? ' <span class="ioh-meta">' + esc(r.shipped.tracking) + "</span>" : "") : chip(tx({ en: "Not in log", es: "No registrado", pt: "Nao registrado" }), "mute");
      var docsCell = (r.docs ? chip(r.docs + " " + tx({ en: "files", es: "archivos", pt: "arquivos" }), "ok") : chip(tx({ en: "None in OS", es: "Ninguno", pt: "Nenhum" }), "mute"));
      var href = "";
      try { href = folders && folders.hrefFor ? folders.hrefFor(r.customer) : (folders && folders.match ? folders.match(r.customer) : ""); } catch (e) { href = ""; }
      if (href) docsCell += ' <a class="ioh-link" target="_blank" rel="noopener" href="' + esc(href) + '">Drive</a>';
      return [dueCell, esc(r.customer), "<b>" + esc(r.po) + "</b>", r.cases ? fmt(r.cases) : "", relCell, shipCell, docsCell];
    });
    var tbl = '<section class="ioh-card"><h3>' + esc(tx({ en: "Open retail POs: what is done", es: "OC retail abiertas: que esta hecho", pt: "Pedidos varejo abertos: o que esta feito" })) + "</h3>" +
      '<p class="ioh-meta">' + esc(tx({ en: "Late first, then by ship date. Step 3 reads Trailer Release. Step 4 matches the Shipping log by PO #. Step 5 counts Order Docs by PO #; BOLs kept only on Drive show as None in OS.", es: "Atrasadas primero, luego por fecha. Paso 3 lee Liberar trailer. Paso 4 busca la OC en el registro de envios. Paso 5 cuenta Docs de orden por OC.", pt: "Atrasados primeiro, depois por data. Etapa 3 le Liberar trailer. Etapa 4 procura o pedido no registro de envios. Etapa 5 conta Docs por pedido." })) + "</p>" +
      table([tx({ en: "Ship by", es: "Salida", pt: "Saida" }), tx({ en: "Customer", es: "Cliente", pt: "Cliente" }), "PO", tx({ en: "Cases", es: "Cajas", pt: "Caixas" }), "3 · " + tx({ en: "Trailer release", es: "Liberacion", pt: "Liberacao" }), "4 · " + tx({ en: "Shipped", es: "Enviado", pt: "Enviado" }), "5 · Docs"], rows, state.allOut ? "" : moreBtn("out", m.rows.length)) +
      (state.relErr ? '<p class="ioh-meta">Trailer Release: ' + esc(state.relErr) + "</p>" : "") + "</section>";

    var other = '<section class="ioh-card ioh-other"><h3>' + esc(tx(W.otherOut)) + "</h3><div class=\"ioh-btns\">" +
      '<button type="button" class="ioh-btn" data-ioh-ful="1">' + esc(tx({ en: "Fulfillment: build retail pallets and e-com", es: "Fulfillment: armar retail y e-com", pt: "Fulfillment: montar varejo e e-com" })) + "</button>" +
      '</div><p class="ioh-meta">' + esc(tx(W.moved)) + "</p></section>";

    return '<div id="ioh-root" class="ioh" data-ioh="out" data-lang="' + lang() + '">' +
      '<div class="ioh-lead"><h2>' + esc(tx(W.outTitle)) + '</h2><p>' + esc(tx(W.outIntro)) + "</p></div>" +
      (cloud() ? "" : '<div class="ioh-banner">' + esc(tx(W.offline)) + "</div>") +
      steps + tbl + other + "</div>";
  }

  // ---- screen --------------------------------------------------------------
  var CSS = [
    ".ioh{display:flex;flex-direction:column;gap:12px;padding-bottom:24px}",
    ".ioh-lead{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 16px}",
    ".ioh-lead h2{margin:0 0 4px;font-size:20px;color:#04223B}",
    ".ioh-lead p{margin:0;color:#374151;font-size:14px}",
    ".ioh-banner{background:#fff7e6;border:1px solid #f3c77a;border-radius:8px;padding:8px 12px;font-size:13px;color:#7a4b00}",
    ".ioh-steps{display:grid;grid-template-columns:1fr 18px 1fr 18px 1fr 18px 1fr;gap:6px;align-items:stretch}",
    ".ioh-steps5{grid-template-columns:1fr 18px 1fr 18px 1fr 18px 1fr 18px 1fr}",
    ".ioh-arrow{display:flex;align-items:center;justify-content:center;font-size:30px;color:#F26B21;font-weight:800}",
    ".ioh-step{display:flex;gap:10px;background:#fff;border:1px solid #c5d3e2;border-radius:10px;padding:12px;box-shadow:0 1px 0 rgba(4,34,59,.12)}",
    ".ioh-n{flex:0 0 34px;height:34px;border-radius:50%;background:#04223B;color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}",
    ".ioh-body{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}",
    ".ioh-body h3{margin:0;font-size:16px;color:#04223B;line-height:1.2}",
    ".ioh-what{margin:0;font-size:13px;color:#374151;line-height:1.35}",
    ".ioh-status{display:flex;flex-wrap:wrap;gap:4px}",
    ".ioh-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}",
    ".ioh-btn{font:inherit;font-weight:700;font-size:13px;border:1px solid #006DB6;color:#006DB6;background:#fff;border-radius:7px;padding:6px 10px;cursor:pointer}",
    ".ioh-btn:hover{background:#f3f8fc}",
    ".ioh-btn-p{background:#F26B21;border-color:#d4530d;color:#fff}",
    ".ioh-btn-p:hover{background:#e05e17}",
    ".ioh-chip{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap}",
    ".ioh-ok{background:#e7f6ec;color:#11683a}.ioh-warn{background:#fff1db;color:#8a5200}.ioh-bad{background:#fde8e8;color:#b52024}.ioh-info{background:#e6f0fa;color:#0b4f86}.ioh-mute{background:#eef1f5;color:#4b5563}",
    ".ioh-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:12px}",
    ".ioh-card{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 14px;min-width:0}",
    ".ioh-card h3{margin:0 0 8px;font-size:15px;color:#04223B}",
    ".ioh-tw{overflow-x:auto}",
    ".ioh-t{width:100%;border-collapse:collapse;font-size:13px}",
    ".ioh-t th{text-align:left;background:#04223B;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.03em;padding:6px 8px}",
    ".ioh-t td{border-bottom:1px solid #e5e9f0;padding:6px 8px;vertical-align:middle}",
    ".ioh-t .ioh-btn{padding:3px 8px;font-size:12px}",
    ".ioh-meta{color:#6b7280;font-size:12px}",
    ".ioh-empty{color:#6b7280;font-size:13px;margin:4px 0}",
    ".ioh-link{font:inherit;font-size:12px;font-weight:700;color:#006DB6;background:none;border:0;padding:0 2px;cursor:pointer;text-decoration:underline}",
    ".ioh-other .ioh-btns{margin-bottom:6px}",
    "@media(max-width:1180px){.ioh-steps,.ioh-steps5{grid-template-columns:1fr 1fr}.ioh-arrow{display:none}.ioh-grid{grid-template-columns:1fr}}",
    "@media(max-width:640px){.ioh-steps,.ioh-steps5{grid-template-columns:1fr}}",
    "@media print{.ioh-btn,.ioh-link{display:none}}"
  ].join("\n");
  function styleOnce() {
    if (!doc || $("ioh-style")) return;
    var s = doc.createElement("style");
    s.id = "ioh-style";
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  function render() {
    var view = $("view");
    if (!view || !state.active) return;
    styleOnce();
    var html;
    try {
      html = state.which === "in" ? inboundHtml(liveInbound()) : outboundHtml(liveOutbound());
    } catch (e) {
      html = '<div id="ioh-root" class="ioh"><div class="ioh-banner">' + esc(String(e && e.message || e)) + "</div></div>";
    }
    state.painting = true;
    var old = $("ioh-root");
    if (old && old.parentNode === view) {
      var holder = doc.createElement("div");
      holder.innerHTML = html;
      view.replaceChild(holder.firstChild, old);
    } else {
      view.innerHTML = html;
    }
    state.painting = false;
  }

  function open(which) {
    which = which === "out" ? "out" : "in";
    var deptId = which === "in" ? "inb" : "outb";
    // Opened from somewhere other than its own tab: let the department bar
    // open it, so the tab, subtabs, and Back all line up.
    try {
      var cur = root.DEPT && root.DEPT.current ? root.DEPT.current() : null;
      if (cur && cur.bar !== deptId && root.DEPT.show) { root.DEPT.show(deptId); return; }
    } catch (e) {}
    try { var rel = $("dept-release"); if (rel) rel.click(); } catch (e2) {}
    state.which = which;
    state.active = true;
    try { var nav = $("nav"), bd = $("navBackdrop"); if (nav) nav.classList.remove("open"); if (bd) bd.classList.remove("show"); } catch (e3) {}
    render();
    if (which === "out") loadReleases(false);
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var more = t.closest("[data-ioh-more]");
    if (more && state.active) {
      if (more.getAttribute("data-ioh-more") === "in") state.allIn = true; else state.allOut = true;
      render();
      return;
    }
    var relBtn = t.closest("[data-ioh-release]");
    if (relBtn) {
      var po = relBtn.getAttribute("data-ioh-release") || "";
      var cust = relBtn.getAttribute("data-ioh-cust") || "";
      // Open the Trailer Release subtab first (tab highlight and Back),
      // then prefill this PO.
      var sub = doc.querySelector('#dept-shell [data-dept-sub="trailer"]');
      if (sub) sub.click();
      if (root.OUTBOUND_RELEASE && root.OUTBOUND_RELEASE.open) root.OUTBOUND_RELEASE.open({ po: po, customer: cust });
      return;
    }
    if (t.closest("[data-ioh-ful]")) {
      state.active = false;
      if (root.DEPT && root.DEPT.show) root.DEPT.show("ful");
    }
  }

  if (doc) {
    doc.addEventListener("click", onClick);
    // Leave this screen when another nav or department target is clicked.
    doc.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-sub], [data-dept-tool], #deptbar [data-dept], #dept-back") : null;
      if (!t) return;
      state.active = false;
    }, true);
    // The app's language switch re-renders #view. Take the hub back after it.
    var langKeep = false;
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id) langKeep = state.active;
      }, true);
      doc.addEventListener("click", function (e) {
        if (!(e.target && e.target.id === id) || !langKeep) return;
        setTimeout(function () {
          if (!langKeep) return;
          langKeep = false;
          state.active = true;
          render();
        }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return state.active; });
    var startObs = function () {
      var view = $("view");
      if (!view || view.__iohObs || typeof MutationObserver !== "function") return;
      view.__iohObs = true;
      new MutationObserver(function () {
        if (state.painting || !state.active) return;
        // Another screen took #view without a nav click: step aside.
        if (!$("ioh-root")) state.active = false;
      }).observe(view, { childList: true });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", startObs); else startObs();
    var hookDb = function () {
      if (hookDb.done || !root.DB || typeof root.DB.onChange !== "function") return;
      hookDb.done = true;
      root.DB.onChange(function () {
        if (!state.active || !$("ioh-root")) return;
        var ae = doc.activeElement;
        if (ae && ae.closest && ae.closest("#ioh-root") && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
        render();
      });
    };
    hookDb();
    if (!hookDb.done) doc.addEventListener("DOMContentLoaded", hookDb);
  }

  var api = {
    open: open,
    inbound: function () { open("in"); },
    outbound: function () { open("out"); },
    render: render,
    refreshReleases: function () { loadReleases(true); },
    inboundModel: inboundModel,
    outboundModel: outboundModel,
    isoOf: isoOf,
    poKey: poKey,
    _state: state
  };
  root.INOUT_HUBS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

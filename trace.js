/* ============================================================================
   Lot Trace & Scan  (trace.js)  b=3
   One scan chain from the dock to the customer, built for SQF traceability.

     RECEIVE   raw material in -> our own RM label per pallet/box/roll (supplier lot, exp)
     QA HOLD   food-contact materials start on HOLD until QA releases (COA checked)
     MIXING    scan seed + seasoning + malto labels -> batch code -> BN bin tags
     P-MAC     scan bin tag + film roll -> bag code (batch + machine + week)
               -> finished pallet label FG (lot, flavor, size, bags) -> STAGING
     MOVE      scan any label, scan a location (put-away / moves)
     USE       scan a finished pallet out to the line, e-commerce, samples or scrap
     SHIP      build an outbound pallet for a PO: scan pallets, bags -> OB label w/ lots
     TRACE     type/scan any LPN, lot, supplier lot, PO or seed code -> back + forward
               tree, mass balance, mock recall timer, printable evidence

   Data: Supabase tables trace_labels + trace_events (open RLS like the rest of the
   app). If the tables are missing it runs in LOCAL mode (this device only) and says so.
   Also writes the receipt into the existing Receiving Log (with Lot #) and the
   Seed / Seasoning lot registries, so nothing is typed twice.

   Stock on-hand is NOT changed by this module (Adriana's counts stay the source of
   truth until the scan data is proven). WRITE_STOCK can be flipped later.
   Nav item is injected with a MutationObserver (no timers). Keyboard-wedge scanners
   (NETUM NT-1228BL etc.) type the code + Enter into the focused scan box.
   ==========================================================================*/
(function () {
  "use strict";

  var cfg = window.SMACKIN_CONFIG || {};
  var LS = "trace-local-v1";          // local fallback store
  var LS_ST = "trace-station-v1";     // per-device station settings (operator, machine, tab)

  // ---- flavor master (Allen's Updated Flavor Codes, 2026-08-04) ----------------
  // alg: A1 = none, A2 = milk, A3 = multiple (detail listed)
  var FLAVORS = [
    ["S01", "OG Original", "A1", ""], ["S02", "Cinnamon Churro", "A2", "Milk"], ["S03", "Backyard BBQ", "A2", "Milk"],
    ["S04", "Garlic Parmesan", "A2", "Milk"], ["S05", "Dill Pickle", "A1", ""], ["S06", "Cracked Pepper", "A1", ""],
    ["S07", "Cheddar Jalapeno", "A2", "Milk"], ["S08", "Ranch", "A2", "Milk"], ["S09", "Maple Brown Sugar", "A2", "Milk"],
    ["S10", "Lemon Pepper", "A1", ""], ["S11", "Sour Cream & Onion", "A2", "Milk"],
    ["L14", "Teriyaki", "A3", "Wheat, Soy"], ["L15", "Taco", "A1", ""], ["L16", "Salsa", "A1", ""], ["L17", "Guacamole", "A2", "Milk"],
    ["L18", "Chile Lime", "A2", "Milk"], ["L19", "Honey Sriracha", "A1", ""], ["L20", "Pizza / Deep Dish Pizza", "A3", "Milk, Gluten"],
    ["L21", "Strawberry Cheesecake", "A2", "Milk"], ["L22", "Loaded Nacho", "A2", "Milk"], ["L23", "Cheddar Ghost Pepper", "A3", "Milk, Almond"],
    ["L24", "Parmuffalo", "A2", "Milk"], ["L25", "Cheeseburger", "A2", "Milk"], ["L26", "Buffalo Ranch", "A2", "Milk"],
    ["L27", "Peanut Butter & Jelly", "A3", "Peanut"], ["L28", "Cinnamon Roll", "A2", "Milk"], ["L29", "Spicy Queso", "A2", "Milk"],
    ["L30", "Salted Caramel", "A1", ""], ["L31", "GuacZilla!", "A2", "Milk"], ["L32", "Ketchup", "A1", ""],
    ["L33", "Loaded Potato", "A3", "Milk, Soy"], ["L34", "Honey BBQ", "A1", ""], ["L35", "Chili Cheese Dog", "A2", "Milk"],
    ["L36", "Bacon Mac & Cheese", "A2", "Milk"], ["L37", "Blueberry Pie", "A1", ""], ["L38", "Salt & Vinegar", "A1", ""],
    ["L39", "Sweet Thai Chili", "A1", ""], ["L40", "S'Mores", "A1", ""], ["L41", "Korean BBQ", "A3", "Wheat, Soy"],
    ["L42", "Cheddar Sour Cream", "A2", "Milk"], ["L43", "Funnel Cake", "A2", "Milk"], ["L44", "Chipotle Ranch", "A2", "Milk"],
    ["L45", "Honey Mustard", "A1", ""], ["L46", "Dill Ranch", "A2", "Milk"], ["L47", "Dijon Ranch", "A2", "Milk"],
    ["L48", "Fried Chicken", "A1", ""], ["L49", "Flame Grilled Steak", "A1", ""], ["L50", "Jalapeno Ranch", "A2", "Milk"],
    ["L51", "Pumpkin Spice", "", ""], ["L52", "French Onion Soup", "", ""],
    ["A01", "Nashville Hot", "A1", ""], ["A18", "Birthday Cake", "A3", "Milk, Wheat, Soy, Egg"], ["A23", "Mexican Street Corn", "A2", "Milk"]
  ].map(function (f) { return { code: f[0], name: f[1], alg: f[2], algTxt: f[3] }; });
  function flavorBy(code) { code = String(code || "").toUpperCase(); for (var i = 0; i < FLAVORS.length; i++) if (FLAVORS[i].code === code) return FLAVORS[i]; return null; }

  var MIXERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  var PMACS = ["1", "2", "3", "4", "5", "6", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50"];
  function sizeForMachine(m) { return Number(m) >= 41 ? "4oz" : "1.5oz"; }

  var TYPES = [ // material types at receiving
    { k: "SEED", en: "Raw seed", es: "Semilla cruda", uom: "lb", food: true },
    { k: "SEAS", en: "Seasoning", es: "Sazonador", uom: "lb", food: true },
    { k: "MALTO", en: "Maltodextrin", es: "Maltodextrina", uom: "lb", food: true },
    { k: "OIL", en: "Oil / other ingredient", es: "Aceite / otro ingrediente", uom: "lb", food: true },
    { k: "FILM", en: "Film roll (food contact)", es: "Rollo de película (contacto)", uom: "roll", food: true },
    { k: "PKG", en: "Packaging (cases, boxes, buckets)", es: "Empaque (cajas, cubetas)", uom: "each", food: false },
    { k: "FG", en: "Finished bags (existing pallet)", es: "Bolsas terminadas (tarima existente)", uom: "bags", food: false }
  ];
  function typeBy(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].k === k) return TYPES[i]; return TYPES[0]; }

  var DESTS = [
    { k: "LINE", en: "Fulfillment line (case / display build)", es: "Línea de cumplimiento (armar cajas)" },
    { k: "ECOM", en: "E-commerce line", es: "Línea de e-commerce" },
    { k: "SAMPLE", en: "Samples / R&D", es: "Muestras / I+D" },
    { k: "SCRAP", en: "Scrap / damaged", es: "Desecho / dañado" }
  ];

  // ---- i18n -----------------------------------------------------------------
  var T = {
    en: {
      title: "Lot Trace & Scan (SQF)", navLbl: "Lot Trace & Scan", grpQ: "Quality",
      tRecv: "Receive", tQa: "QA Hold", tMix: "Mixing", tPmac: "P-Mac", tMove: "Move", tUse: "Use", tShip: "Ship", tTrace: "Trace", tLabels: "Labels",
      op: "Operator (your name)", scan: "Scan here", scanPh: "Scan a label (or type it and press Enter)",
      local: "LOCAL MODE: the trace tables are not set up yet, so scans save on this device only.",
      save: "Save", print: "Print labels", reprint: "Reprint", clear: "Clear",
      type: "Material type", item: "Item / description", supplier: "Supplier", po: "PO #", slot: "Supplier lot # (scan or type)",
      exp: "Expiration date", seedCode: "Seed code (internal, e.g. 3X)", flavor: "Flavor", units: "How many labels (pallets / boxes / rolls)",
      qtyEach: "Quantity on EACH label", uom: "Unit", existing: "Existing stock already in the building (no new receipt)",
      relNow: "Release now: COA / paperwork checked", registry: "Also add to the Seed / Seasoning lot registry",
      lotCode: "Lot code on the bags", size: "Bag size", loc: "Location",
      needOp: "Enter your name first.", needLot: "Supplier lot # is required. Every receipt needs a lot.",
      saved: "Saved", labelsMade: "labels created",
      qaHint: "Food-contact materials start on HOLD. Release after the COA is checked. Anything on hold cannot be used in Mixing or P-Mac.",
      release: "Release", reject: "Reject", hold: "Put on hold", noHold: "Nothing on hold.",
      mixer: "Mixer", prefix: "Batch prefix (flavor code + malto + season, e.g. L2031)", batch: "Batch code",
      inputs: "Ingredients scanned", scanInputs: "Scan the seed, seasoning and malto labels you are loading",
      bins: "Bins to tag", makeBins: "Print bin tags", newBatch: "New batch", lbsUsed: "lbs used", markEmpty: "used up",
      machine: "P-Mac machine", loaded: "Loaded now", binLoaded: "Batch / bin", filmLoaded: "Film roll",
      setPrinter: "Set the bag printer to", codeChange: "Code change", bags: "Bags on this pallet", finishPallet: "Finish pallet + print label",
      scrapBags: "Scrap bags", reason: "Reason",
      moveHint: "Scan a label, then scan the location barcode.", scanLoc: "Now scan the location",
      dest: "Where is it going?", qtyTake: "Bags taken (blank = whole pallet)",
      shipHint: "Build an outbound pallet: enter the PO, scan each finished pallet you pull from, enter bags.",
      customer: "Customer", finishShip: "Finish outbound pallet + print label",
      traceHint: "Scan or type any label, lot code, supplier lot, PO or seed code.",
      back: "Backward (where it came from)", fwd: "Forward (where it went)", balance: "Mass balance",
      startDrill: "Start mock recall timer", stopDrill: "Stop timer", printEv: "Print evidence",
      notFound: "Not found", onHold: "ON HOLD - cannot use", expired: "EXPIRED - cannot use", wrongFlavor: "Flavor does not match",
      all: "All", kind: "Kind", status: "Status", search: "Search",
      issue: "Issue found (blank if none). Anything here keeps it ON HOLD", noteIssue: "Note issue (stay on hold)", issueCol: "Issue",
      issuePrompt: "Describe the issue. Examples: No CA warning / Wrong ingredient statement / Spec issue / Shiny film / Swirl design", holdQ: "is released. Put it ON HOLD?"
    },
    es: {
      title: "Rastreo de Lotes y Escaneo (SQF)", navLbl: "Rastreo de Lotes", grpQ: "Calidad",
      tRecv: "Recibir", tQa: "Retención QA", tMix: "Mezcla", tPmac: "P-Mac", tMove: "Mover", tUse: "Usar", tShip: "Enviar", tTrace: "Rastrear", tLabels: "Etiquetas",
      op: "Operador (su nombre)", scan: "Escanee aquí", scanPh: "Escanee una etiqueta (o escriba y presione Enter)",
      local: "MODO LOCAL: las tablas no están listas; los escaneos se guardan solo en este equipo.",
      save: "Guardar", print: "Imprimir etiquetas", reprint: "Reimprimir", clear: "Limpiar",
      type: "Tipo de material", item: "Artículo / descripción", supplier: "Proveedor", po: "Orden de compra #", slot: "Lote del proveedor (escanear o escribir)",
      exp: "Fecha de vencimiento", seedCode: "Código de semilla (interno, ej. 3X)", flavor: "Sabor", units: "Cuántas etiquetas (tarimas / cajas / rollos)",
      qtyEach: "Cantidad en CADA etiqueta", uom: "Unidad", existing: "Inventario que ya está en el edificio (no es recibo nuevo)",
      relNow: "Liberar ahora: COA / papeles revisados", registry: "Agregar también al registro de lotes de semilla / sazonador",
      lotCode: "Código de lote en las bolsas", size: "Tamaño de bolsa", loc: "Ubicación",
      needOp: "Primero escriba su nombre.", needLot: "El lote del proveedor es obligatorio. Cada recibo necesita lote.",
      saved: "Guardado", labelsMade: "etiquetas creadas",
      qaHint: "Los materiales de contacto con alimentos empiezan RETENIDOS. Liberar después de revisar el COA. Lo retenido no se puede usar en Mezcla o P-Mac.",
      release: "Liberar", reject: "Rechazar", hold: "Retener", noHold: "Nada retenido.",
      mixer: "Mezcladora", prefix: "Prefijo del lote (sabor + malto + sazón, ej. L2031)", batch: "Código de lote",
      inputs: "Ingredientes escaneados", scanInputs: "Escanee las etiquetas de semilla, sazonador y malto que va a cargar",
      bins: "Contenedores a etiquetar", makeBins: "Imprimir etiquetas de contenedor", newBatch: "Lote nuevo", lbsUsed: "lbs usadas", markEmpty: "se acabo",
      machine: "Máquina P-Mac", loaded: "Cargado ahora", binLoaded: "Lote / contenedor", filmLoaded: "Rollo de película",
      setPrinter: "Ponga la impresora de bolsas en", codeChange: "Cambio de código", bags: "Bolsas en esta tarima", finishPallet: "Terminar tarima + imprimir etiqueta",
      scrapBags: "Bolsas de desecho", reason: "Razón",
      moveHint: "Escanee una etiqueta y luego la ubicación.", scanLoc: "Ahora escanee la ubicación",
      dest: "¿A dónde va?", qtyTake: "Bolsas tomadas (vacio = tarima completa)",
      shipHint: "Arme una tarima de salida: escriba la orden, escanee cada tarima de donde toma, escriba bolsas.",
      customer: "Cliente", finishShip: "Terminar tarima de salida + imprimir etiqueta",
      traceHint: "Escanee o escriba cualquier etiqueta, lote, lote de proveedor, orden o código de semilla.",
      back: "Hacia atrás (de dónde vino)", fwd: "Hacia adelante (a dónde fue)", balance: "Balance de masa",
      startDrill: "Iniciar cronómetro de simulacro", stopDrill: "Detener", printEv: "Imprimir evidencia",
      notFound: "No encontrado", onHold: "RETENIDO - no usar", expired: "VENCIDO - no usar", wrongFlavor: "El sabor no coincide",
      all: "Todos", kind: "Tipo", status: "Estado", search: "Buscar",
      issue: "Problema encontrado (vacío si no hay). Si escribe algo queda RETENIDO", noteIssue: "Anotar problema (sigue retenido)", issueCol: "Problema",
      issuePrompt: "Describa el problema. Ejemplos: Sin advertencia de California / Ingredientes incorrectos / Problema de especificación / Película brillante / Diseño de remolino", holdQ: "está liberado. ¿Retenerlo?"
    }
  };
  function lang() { var b = document.getElementById("lang-es"); return b && b.classList.contains("active") ? "es" : "en"; }
  function L(k) { var d = T[lang()]; return d[k] != null ? d[k] : (T.en[k] != null ? T.en[k] : k); }
  function LT(o) { return lang() === "es" ? o.es : o.en; }

  // ---- helpers ----------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
  function fmt(n) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function nowISO() { return new Date().toISOString(); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function isoWeek(d) {
    d = d ? new Date(d) : new Date();
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function toast(m) { if (window.UI && typeof window.UI.toast === "function") { try { window.UI.toast(m); return; } catch (e) {} } var t = $("toast"); if (t) { t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2600); } }
  function beep(ok) { try { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; var c = beep.c || (beep.c = new C()); var o = c.createOscillator(), g = c.createGain(); o.frequency.value = ok ? 880 : 220; g.gain.value = 0.08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (ok ? 0.08 : 0.35)); } catch (e) {} }
  var PREFIX = { RM: "RM", BN: "BN", FG: "FG", OB: "OB" };
  function newLpn(kind) { return (PREFIX[kind] || "TR") + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0"); }
  function isOurLpn(s) { return /^(RM|BN|FG|OB)\d{6}-[0-9A-Z]{4}$/.test(String(s || "").trim().toUpperCase()); }
  function cleanScan(s) { return String(s || "").replace(/[\u0000-\u001f]/g, "").trim(); }

  // ---- data layer -----------------------------------------------------------------
  var sb = null, mode = "local", S = { labels: {}, events: [], loaded: false, err: "" };
  function client() {
    if (sb) return sb;
    if (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; } }
    return sb;
  }
  function cloudOk() { return !!(window.DB && window.DB.mode === "cloud" && client()); }
  function localLoad() { var d = lsGet(LS, { labels: {}, events: [] }); S.labels = d.labels || {}; S.events = d.events || []; }
  function localSave() { lsSet(LS, { labels: S.labels, events: S.events.slice(-20000) }); }
  function normLabel(r) {
    if (!r) return r;
    if (typeof r.parents === "string") { try { r.parents = JSON.parse(r.parents); } catch (e) { r.parents = []; } }
    if (!Array.isArray(r.parents)) r.parents = [];
    if (typeof r.data === "string") { try { r.data = JSON.parse(r.data); } catch (e) { r.data = {}; } }
    r.data = r.data || {}; r.qty = num(r.qty); r.qty_left = num(r.qty_left);
    return r;
  }
  function load() {
    if (!cloudOk()) { mode = "local"; localLoad(); S.loaded = true; return Promise.resolve(); }
    var c = client();
    return Promise.all([
      c.from("trace_labels").select("*").order("created_at", { ascending: false }).limit(20000),
      c.from("trace_events").select("*").order("ts", { ascending: false }).limit(20000)
    ]).then(function (r) {
      if (r[0].error || r[1].error) { var e = r[0].error || r[1].error; throw e; }
      mode = "cloud"; S.labels = {};
      (r[0].data || []).forEach(function (x) { S.labels[x.lpn] = normLabel(x); });
      S.events = (r[1].data || []).map(function (e) { if (typeof e.data === "string") { try { e.data = JSON.parse(e.data); } catch (x) { e.data = {}; } } e.data = e.data || {}; return e; }).reverse();
      S.loaded = true; S.err = "";
    }).catch(function (e) { mode = "local"; S.err = (e && (e.message || e.code)) || String(e); localLoad(); S.loaded = true; });
  }
  function fetchOne(lpn) {
    lpn = String(lpn || "").toUpperCase();
    if (S.labels[lpn]) return Promise.resolve(S.labels[lpn]);
    if (mode !== "cloud") return Promise.resolve(null);
    return client().from("trace_labels").select("*").eq("lpn", lpn).limit(1).then(function (r) {
      var x = r && r.data && r.data[0]; if (x) S.labels[x.lpn] = normLabel(x); return x ? S.labels[x.lpn] : null;
    }).catch(function () { return null; });
  }
  function insLabels(rows) {
    rows.forEach(function (r) { r.updated_at = nowISO(); if (!r.created_at) r.created_at = nowISO(); S.labels[r.lpn] = normLabel(r); });
    if (mode !== "cloud") { localSave(); return Promise.resolve({ ok: true }); }
    var out = rows.map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; });
    return client().from("trace_labels").insert(out).then(function (r) { return r && r.error ? { ok: false, msg: r.error.message } : { ok: true }; });
  }
  function updLabel(lpn, patch) {
    var l = S.labels[lpn]; if (l) { for (var k in patch) l[k] = patch[k]; l.updated_at = nowISO(); }
    patch.updated_at = nowISO();
    if (mode !== "cloud") { localSave(); return Promise.resolve({ ok: true }); }
    return client().from("trace_labels").update(patch).eq("lpn", lpn).then(function (r) { return r && r.error ? { ok: false, msg: r.error.message } : { ok: true }; });
  }
  function addEvents(evs) {
    evs.forEach(function (e) { e.ts = e.ts || nowISO(); e.data = e.data || {}; e.operator = e.operator || opName(); S.events.push(e); });
    if (mode !== "cloud") { localSave(); return Promise.resolve({ ok: true }); }
    var out = evs.map(function (e) { return { ts: e.ts, type: e.type, lpn: e.lpn || null, qty: e.qty == null ? null : Number(e.qty), uom: e.uom || null, from_loc: e.from_loc || null, to_loc: e.to_loc || null, ref: e.ref || null, lot: e.lot || null, operator: e.operator || null, data: e.data || {} }; });
    return client().from("trace_events").insert(out).then(function (r) { return r && r.error ? { ok: false, msg: r.error.message } : { ok: true }; });
  }
  function allLabels() { return Object.keys(S.labels).map(function (k) { return S.labels[k]; }); }
  function childrenOf(lpn) { return allLabels().filter(function (l) { return (l.parents || []).indexOf(lpn) >= 0; }); }
  function eventsFor(lpn) { return S.events.filter(function (e) { return e.lpn === lpn; }); }

  // ---- station state (per device) -------------------------------------------
  var ST = lsGet(LS_ST, { tab: "recv", op: "", mixer: "1", machine: "41", ops: [] });
  function saveST() { lsSet(LS_ST, ST); }
  function opName() { return (ST.op || "").trim(); }
  function rememberOp(n) { n = String(n || "").trim(); if (!n) return; ST.op = n; ST.ops = ST.ops || []; if (ST.ops.indexOf(n) < 0) ST.ops.unshift(n); ST.ops = ST.ops.slice(0, 25); saveST(); }

  // working state (in memory; survives app re-renders because we re-render from it)
  var W = {
    recv: { type: "SEED", existing: false, rel: false, reg: true, units: 1, uom: "lb" },
    mix: { flavor: "", prefix: "", inputs: [], bins: 1, lastBins: [] },
    pm: {},            // per machine: { batch, bins:[], film, filmLpn, pendingBins:[], codeChanges:[] }
    move: { lpn: "" },
    use: { dest: "LINE", ref: "" },
    ship: { po: "", customer: "", lines: [] },
    trace: { q: "", drillStart: null },
    labels: { kind: "", status: "", q: "" },
    msg: null
  };
  function pmState(m) { if (!W.pm[m]) W.pm[m] = lsGet("trace-pm-" + m, { batch: "", flavor: "", bins: [], film: "", openBins: [], openFilms: [], changes: [] }); return W.pm[m]; }
  function savePm(m) { lsSet("trace-pm-" + m, W.pm[m]); }

  function flash(txt, kind) { W.msg = { txt: txt, kind: kind || "ok", t: Date.now() }; beep(kind !== "err" && kind !== "warn"); }

  // ---- styles -----------------------------------------------------------------
  function styleOnce() {
    if ($("trc-style")) return;
    var s = document.createElement("style"); s.id = "trc-style";
    s.textContent = [
      "#trc-root .trc-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}",
      "#trc-root .trc-tabs button{border:1px solid #c3ccd8;background:#fff;border-radius:999px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:14px}",
      "#trc-root .trc-tabs button.on{background:#1F3864;color:#fff;border-color:#1F3864}",
      "#trc-root .trc-scan{font-size:22px;padding:14px;border:3px solid #2E75B6;border-radius:10px;font-weight:700;letter-spacing:.5px}",
      "#trc-root .trc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 14px}",
      "#trc-root .trc-msg{padding:12px 14px;border-radius:8px;margin:0 0 12px;font-weight:700;font-size:16px}",
      "#trc-root .trc-msg.ok{background:#e7f6ec;color:#17692f;border:1px solid #9fd8b0}",
      "#trc-root .trc-msg.warn{background:#fff6e0;color:#8a5a00;border:1px solid #f0c96a}",
      "#trc-root .trc-msg.err{background:#fdeaea;color:#a11;border:1px solid #f0a3a3}",
      "#trc-root .trc-big{font-size:34px;font-weight:800;letter-spacing:1px;color:#1F3864;font-family:monospace}",
      "#trc-root .trc-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;background:#eef2f7;color:#334}",
      "#trc-root .trc-pill.HOLD{background:#fff0d6;color:#8a5a00}#trc-root .trc-pill.RELEASED,#trc-root .trc-pill.ACTIVE{background:#e2f4e8;color:#17692f}",
      "#trc-root .trc-pill.REJECTED{background:#fde2e2;color:#a11}#trc-root .trc-pill.EMPTY,#trc-root .trc-pill.SHIPPED{background:#e9e9ee;color:#556}",
      "#trc-root table.trc{width:100%;border-collapse:collapse;font-size:14px}#trc-root table.trc th,#trc-root table.trc td{border-bottom:1px solid #e3e8ef;padding:7px 6px;text-align:left;vertical-align:top}",
      "#trc-root .trc-tree{font-family:monospace;font-size:13px;white-space:pre-wrap;background:#f7f9fc;border:1px solid #e3e8ef;border-radius:8px;padding:10px;overflow:auto}",
      "#trc-root .trc-local{background:#fff0d6;border:1px solid #f0c96a;color:#7a4b00;padding:10px;border-radius:8px;margin-bottom:12px;font-weight:600}",
      "#trc-root .trc-timer{font-size:28px;font-weight:800;font-family:monospace;color:#a11}",
      "#trc-root .trc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
      "@media print{body.trc-printing header,body.trc-printing nav,body.trc-printing .trc-noprint{display:none!important}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  // ---- view plumbing ----------------------------------------------------------
  var ACTIVE = false;
  function open(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    ACTIVE = true; markActive(); styleOnce();
    var host = $("view"); if (host) host.innerHTML = '<div id="trc-root"><div class="card"><h2>' + esc(L("title")) + '</h2><p class="muted">Loading...</p></div></div>';
    try { document.body.classList.remove("nav-open"); } catch (e) {}
    load().then(render);
  }
  function markActive() { try { var nav = $("nav"); if (!nav) return; nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); }); var m = $("trc-nav"); if (m) m.classList.add("active"); } catch (e) {} }

  function render() {
    if (!ACTIVE) return;
    var host = $("view"); if (!host) return;
    var focusId = document.activeElement && document.activeElement.id;
    var tabs = [["recv", "tRecv"], ["qa", "tQa"], ["mix", "tMix"], ["pmac", "tPmac"], ["move", "tMove"], ["use", "tUse"], ["ship", "tShip"], ["trace", "tTrace"], ["labels", "tLabels"]];
    var holdN = allLabels().filter(function (l) { return l.status === "HOLD"; }).length;
    var h = '<div id="trc-root">';
    h += '<div class="card trc-noprint"><h2 style="margin-top:0">' + esc(L("title")) + '</h2>';
    if (mode !== "cloud") h += '<div class="trc-local">' + esc(L("local")) + (S.err ? ' <span class="muted">(' + esc(S.err) + ')</span>' : "") + '</div>';
    h += '<div class="trc-tabs">' + tabs.map(function (t) {
      var extra = t[0] === "qa" && holdN ? ' (' + holdN + ')' : "";
      return '<button class="' + (ST.tab === t[0] ? "on" : "") + '" onclick="TRACE.tab(\'' + t[0] + '\')">' + esc(L(t[1])) + extra + '</button>';
    }).join("") + '</div>';
    h += '<div class="trc-grid"><div><label>' + esc(L("op")) + '</label><input id="trc-op" list="trc-ops" value="' + esc(ST.op || "") + '" onchange="TRACE.setOp(this.value)" autocomplete="off"><datalist id="trc-ops">' + (ST.ops || []).map(function (o) { return '<option value="' + esc(o) + '">'; }).join("") + '</datalist></div></div>';
    h += '</div>';
    if (W.msg && Date.now() - W.msg.t < 20000) h += '<div class="trc-msg ' + W.msg.kind + ' trc-noprint">' + esc(W.msg.txt) + '</div>';
    var fn = { recv: vRecv, qa: vQa, mix: vMix, pmac: vPmac, move: vMove, use: vUse, ship: vShip, trace: vTrace, labels: vLabels }[ST.tab] || vRecv;
    h += fn();
    h += '</div>';
    var sc = host.scrollTop;
    host.innerHTML = h;
    host.scrollTop = sc;
    var f = (focusId && $(focusId)) || $("trc-scan");
    if (f && f.id !== "trc-op") { try { f.focus(); } catch (e) {} }
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  function scanBox(handler, ph) {
    return '<label>' + esc(L("scan")) + '</label><input id="trc-scan" class="trc-scan" autocomplete="off" placeholder="' + esc(ph || L("scanPh")) + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();TRACE.' + handler + '(this.value);this.value=\'\';}">';
  }
  function needOp() { if (!opName()) { flash(L("needOp"), "err"); render(); var o = $("trc-op"); if (o) o.focus(); return true; } return false; }
  function sel(id, opts, cur, onch) {
    return '<select id="' + id + '"' + (onch ? ' onchange="' + onch + '"' : "") + '>' + opts.map(function (o) { var v = typeof o === "string" ? o : o.v; var t = typeof o === "string" ? o : o.t; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? " selected" : "") + '>' + esc(t) + '</option>'; }).join("") + '</select>';
  }
  function flavorOpts(blank) { return (blank ? [{ v: "", t: "-" }] : []).concat(FLAVORS.map(function (f) { return { v: f.code, t: f.code + "  " + f.name }; })); }
  function val(id) { var e = $(id); return e ? e.value : ""; }
  function chk(id) { var e = $(id); return !!(e && e.checked); }
  function pill(s) { return '<span class="trc-pill ' + esc(s) + '">' + esc(s) + '</span>'; }
  function labelUsable(l) {
    if (!l) return L("notFound");
    if (l.status === "HOLD") return L("onHold");
    if (l.status === "REJECTED") return "REJECTED";
    if (l.exp && String(l.exp).slice(0, 10) < today()) return L("expired");
    return "";
  }

  // =========================== RECEIVE ===========================
  function vRecv() {
    var r = W.recv, ty = typeBy(r.type);
    var items = []; try { items = (window.DB && DB.items ? DB.items() : []).map(function (i) { return i.name; }).filter(Boolean); } catch (e) {}
    var sups = []; try { sups = (window.DB && DB.suppliers ? DB.suppliers() : []).map(function (s) { return s.name || s.id; }).filter(Boolean); } catch (e) {}
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tRecv")) + '</h2><div class="trc-grid">';
    h += '<div><label>' + esc(L("type")) + '</label>' + sel("trc-r-type", TYPES.map(function (t) { return { v: t.k, t: LT(t) }; }), r.type, "TRACE.recvType(this.value)") + '</div>';
    h += '<div><label>' + esc(L("item")) + '</label><input id="trc-r-item" list="trc-items" value="' + esc(r.item || "") + '"><datalist id="trc-items">' + items.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + '</datalist></div>';
    if (r.type === "SEAS" || r.type === "FILM" || r.type === "FG") h += '<div><label>' + esc(L("flavor")) + '</label>' + sel("trc-r-flav", flavorOpts(true), r.flavor || "") + '</div>';
    if (r.type === "FG") {
      h += '<div><label>' + esc(L("size")) + '</label>' + sel("trc-r-size", ["4oz", "1.5oz", "2.75oz"], r.size || "4oz") + '</div>';
      h += '<div><label>' + esc(L("lotCode")) + '</label><input id="trc-r-lot" value="' + esc(r.lot || "") + '" placeholder="L2031/3X9.35"></div>';
      h += '<div><label>' + esc(L("loc")) + '</label><input id="trc-r-loc" value="' + esc(r.loc || "STAGING") + '"></div>';
    } else {
      h += '<div><label>' + esc(L("supplier")) + '</label><input id="trc-r-sup" list="trc-sups" value="' + esc(r.supplier || "") + '"><datalist id="trc-sups">' + sups.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + '</datalist></div>';
      if (!r.existing) h += '<div><label>' + esc(L("po")) + '</label><input id="trc-r-po" value="' + esc(r.po || "") + '"></div>';
      h += '<div><label>' + esc(L("slot")) + '</label><input id="trc-r-lot" class="trc-scan" style="font-size:18px;padding:10px" value="' + esc(r.lot || "") + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();var n=document.getElementById(\'trc-r-exp\');if(n)n.focus();}"></div>';
      h += '<div><label>' + esc(L("exp")) + '</label><input id="trc-r-exp" type="date" value="' + esc(r.exp || "") + '"></div>';
      if (r.type === "SEED") h += '<div><label>' + esc(L("seedCode")) + '</label><input id="trc-r-seed" value="' + esc(r.seedCode || "") + '" placeholder="3X"></div>';
      if (ty.food || r.type === "PKG") h += '<div style="grid-column:1/-1"><label>' + esc(L("issue")) + '</label><input id="trc-r-issue" value="' + esc(r.issue || "") + '"></div>';
    }
    h += '<div><label>' + esc(L("units")) + '</label><input id="trc-r-units" type="number" min="1" value="' + esc(r.units || 1) + '"></div>';
    h += '<div><label>' + esc(L("qtyEach")) + '</label><input id="trc-r-qty" type="number" step="any" value="' + esc(r.qty || "") + '"></div>';
    h += '<div><label>' + esc(L("uom")) + '</label>' + sel("trc-r-uom", ["lb", "roll", "impressions", "bags", "cases", "each", "gal"], r.uom || ty.uom) + '</div>';
    h += '</div>';
    if (r.type !== "FG") {
      h += '<label style="font-weight:500"><input type="checkbox" id="trc-r-existing" style="width:auto" ' + (r.existing ? "checked" : "") + ' onchange="TRACE.recvExisting(this.checked)"> ' + esc(L("existing")) + '</label>';
      if (ty.food) h += '<label style="font-weight:500"><input type="checkbox" id="trc-r-rel" style="width:auto" ' + (r.rel ? "checked" : "") + '> ' + esc(L("relNow")) + '</label>';
      if ((r.type === "SEED" || r.type === "SEAS" || r.type === "MALTO") && !r.existing) h += '<label style="font-weight:500"><input type="checkbox" id="trc-r-reg" style="width:auto" ' + (r.reg ? "checked" : "") + '> ' + esc(L("registry")) + '</label>';
    }
    h += '<button class="primary" onclick="TRACE.recvSave()">' + esc(L("save")) + ' + ' + esc(L("print")) + '</button>';
    h += '</div>';
    var recent = allLabels().filter(function (l) { return l.kind === "RM" || (l.kind === "FG" && l.data && l.data.legacy); }).sort(byNewest).slice(0, 15);
    h += '<div class="card"><h2 class="sub2">Recent</h2>' + labelTable(recent) + '</div>';
    return h;
  }
  function byNewest(a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); }
  function recvCapture() {
    var r = W.recv;
    ["item", "sup", "po", "lot", "exp", "seed", "units", "qty", "uom", "flav", "size", "loc", "issue"].forEach(function (k) {
      var e = $("trc-r-" + k); if (!e) return;
      var map = { sup: "supplier", seed: "seedCode", flav: "flavor" };
      r[map[k] || k] = e.value;
    });
    if ($("trc-r-rel")) r.rel = chk("trc-r-rel");
    if ($("trc-r-reg")) r.reg = chk("trc-r-reg");
  }
  function recvType(v) { recvCapture(); if (W.recv.type !== v) { W.recv.item = ""; W.recv.flavor = ""; W.recv.seedCode = ""; W.recv.lot = ""; W.recv.exp = ""; } W.recv.type = v; W.recv.uom = typeBy(v).uom; render(); }
  function recvExisting(b) { recvCapture(); W.recv.existing = !!b; render(); }
  function recvSave() {
    if (needOp()) return;
    recvCapture();
    var r = W.recv, ty = typeBy(r.type), units = Math.max(1, Math.min(200, Math.floor(num(r.units) || 1))), qty = num(r.qty);
    var lot = cleanScan(r.lot);
    if (!lot) { flash(L("needLot"), "err"); render(); return; }
    if (!(qty > 0)) { flash(L("qtyEach") + "?", "err"); render(); return; }
    if ((r.type === "SEAS" || r.type === "FILM" || r.type === "FG") && !r.flavor) { flash(L("flavor") + "?", "err"); render(); return; }
    var fl = flavorBy(r.flavor);
    var rows = [], evs = [], lpns = [], stamp = nowISO();
    for (var i = 0; i < units; i++) {
      var isFG = r.type === "FG";
      var lpn = newLpn(isFG ? "FG" : "RM");
      var issue = String(r.issue || "").trim();
      var status = isFG ? "ACTIVE" : (issue ? "HOLD" : (ty.food && !r.rel ? "HOLD" : "RELEASED"));
      rows.push({
        lpn: lpn, kind: isFG ? "FG" : "RM", mtype: r.type,
        item: r.item || (isFG && fl ? fl.name : "") || LT(ty), flavor_code: fl ? fl.code : "", flavor: fl ? fl.name : "",
        size: isFG ? (r.size || "4oz") : "", lot: isFG ? lot : lot, supplier: isFG ? "" : (r.supplier || ""), supplier_lot: isFG ? "" : lot,
        seed_code: r.type === "SEED" ? String(r.seedCode || "").toUpperCase().trim() : "", exp: isFG ? null : (r.exp || null),
        qty: qty, qty_left: qty, uom: r.uom || ty.uom, status: status, location: isFG ? (r.loc || "STAGING").toUpperCase() : "RECEIVING",
        parents: [], po: r.existing || isFG ? "" : (r.po || ""), station: "RECEIVING",
        data: { issues: issue ? [{ txt: issue, by: opName(), at: stamp }] : [], unit: (i + 1) + " of " + units, legacy: !!(r.existing || isFG), alg: fl ? fl.alg : "", algTxt: fl ? fl.algTxt : "", released_by: status === "RELEASED" && ty.food ? opName() : "" },
        created_by: opName(), created_at: stamp
      });
      evs.push({ type: isFG ? "LEGACY_FG" : (r.existing ? "LEGACY_RM" : "RECEIVE"), lpn: lpn, qty: qty, uom: r.uom || ty.uom, to_loc: rows[i].location, ref: rows[i].po, lot: lot, data: { supplier: r.supplier || "", mtype: r.type } });
      lpns.push(lpn);
    }
    insLabels(rows).then(function (res) {
      if (!res.ok) { flash("Save failed: " + res.msg, "err"); render(); return; }
      return addEvents(evs).then(function () {
        var tasks = [];
        if (!r.existing && r.type !== "FG" && window.DB) {
          if (DB.addReceivingLog) tasks.push(DB.addReceivingLog({ recv_date: today(), supplier: r.supplier, po_num: r.po, contents: (r.item || LT(ty)) + (fl ? " - " + fl.name : ""), lot: lot, qty_received: qty * units, condition: "Good", received_by: opName(), notes: "Trace labels " + lpns[0] + (units > 1 ? " .. " + lpns[lpns.length - 1] : "") + " (" + units + " x " + qty + " " + (r.uom || ty.uom) + ")" + (r.exp ? " exp " + r.exp : "") }, null, opName()).catch(function () {}));
          if (r.reg && r.type === "SEED" && DB.addSeedLot) tasks.push(DB.addSeedLot({ seed_code: rows[0].seed_code, product: r.item || "Raw seed", lot: lot, supplier: r.supplier, received_date: today(), weight: qty * units, internal_code: rows[0].seed_code, pallets: units }, opName()).catch(function () {}));
          if (r.reg && r.type === "SEAS" && DB.addSeasLot) tasks.push(DB.addSeasLot({ flavor_code: fl ? fl.code : "", product: r.item || (fl ? fl.name : "Seasoning"), lot: lot, manufacturer: r.supplier, exp: r.exp || null, weight: qty * units, location: "RECEIVING" }, opName()).catch(function () {}));
          if (r.reg && r.type === "MALTO" && DB.addSeasLot) tasks.push(DB.addSeasLot({ flavor_code: "MALTO", product: r.item || "Maltodextrin", lot: lot, manufacturer: r.supplier, exp: r.exp || null, weight: qty * units, location: "RECEIVING" }, opName()).catch(function () {}));
        }
        return Promise.all(tasks).then(function () {
          printLabels(rows);
          flash(L("saved") + ": " + units + " " + L("labelsMade") + " (" + lot + ")", "ok");
          W.recv = { type: r.type, existing: r.existing, rel: false, reg: r.reg, units: 1, uom: r.uom, supplier: r.supplier, item: r.item, flavor: r.flavor };
          render();
        });
      });
    });
  }

  // =========================== QA HOLD ===========================
  function vQa() {
    var list = allLabels().filter(function (l) { return l.status === "HOLD"; }).sort(byNewest);
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tQa")) + '</h2><p class="hint">' + esc(L("qaHint")) + '</p>';
    h += scanBox("qaScan", L("scanPh") + " (" + L("release") + ")");
    if (!list.length) h += '<p class="muted" style="margin-top:12px">' + esc(L("noHold")) + '</p>';
    else h += '<table class="trc" style="margin-top:12px"><thead><tr><th>Label</th><th>Item</th><th>Supplier / lot</th><th>Exp</th><th>Qty</th><th>' + esc(L("issueCol")) + '</th><th></th></tr></thead><tbody>' + list.map(function (l) {
      var iss = (l.data && l.data.issues) || [];
      return '<tr><td><b>' + esc(l.lpn) + '</b><br><span class="muted sm">' + esc((l.created_at || "").slice(0, 10)) + '</span></td><td>' + esc(l.item) + (l.flavor ? '<br><span class="muted sm">' + esc(l.flavor) + '</span>' : "") + '</td><td>' + esc(l.supplier) + '<br><b>' + esc(l.supplier_lot) + '</b></td><td>' + esc(l.exp || "") + '</td><td>' + fmt(l.qty) + ' ' + esc(l.uom) + '</td><td>' + (iss.length ? '<b style="color:#a11">' + esc(iss[iss.length - 1].txt) + '</b>' + (iss.length > 1 ? ' <span class="muted sm">(+' + (iss.length - 1) + ')</span>' : '') : '') + '</td><td class="trc-row"><button class="ghost sm" onclick="TRACE.qaIssue(\'' + esc(l.lpn) + '\')">' + esc(L("noteIssue")) + '</button><button class="primary sm" onclick="TRACE.qa(\'' + esc(l.lpn) + '\',\'RELEASED\')">' + esc(L("release")) + '</button><button class="ghost danger sm" onclick="TRACE.qa(\'' + esc(l.lpn) + '\',\'REJECTED\')">' + esc(L("reject")) + '</button></td></tr>';
    }).join("") + '</tbody></table>';
    h += '</div>';
    return h;
  }
  function qaSet(lpn, status) {
    if (needOp()) return;
    var reason = "";
    if (status === "REJECTED" || status === "HOLD") { reason = window.prompt(L("reason") + "?") || ""; if (!reason) return; }
    var pre = S.labels[lpn];
    if (status === "RELEASED" && pre && pre.data && pre.data.issues && pre.data.issues.length && !window.confirm(lpn + ": " + pre.data.issues[pre.data.issues.length - 1].txt + "\n\nRelease anyway? (issue fixed / approved)")) return;
    var l = S.labels[lpn]; if (!l) return;
    var data = l.data || {}; data.qa = { status: status, by: opName(), at: nowISO(), reason: reason };
    updLabel(lpn, { status: status, data: data }).then(function () {
      return addEvents([{ type: "QA_" + status, lpn: lpn, lot: l.lot, data: { reason: reason } }]);
    }).then(function () { flash(lpn + " -> " + status, status === "RELEASED" ? "ok" : "warn"); render(); });
  }
  function qaIssue(lpn) {
    if (needOp()) return;
    var l = S.labels[lpn]; if (!l) return;
    var txt = window.prompt(L("issuePrompt")); if (!txt || !String(txt).trim()) return;
    var data = l.data || {}; data.issues = (data.issues || []).concat([{ txt: String(txt).trim(), by: opName(), at: nowISO() }]);
    var was = l.status;
    updLabel(lpn, { status: "HOLD", data: data }).then(function () {
      return addEvents([{ type: "QA_ISSUE", lpn: lpn, lot: l.lot, data: { issue: String(txt).trim(), was: was } }]);
    }).then(function () { flash(lpn + " ON HOLD: " + txt, "warn"); render(); });
  }
  function qaScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    fetchOne(code).then(function (l) {
      if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
      if (l.status === "HOLD") qaSet(code, "RELEASED");
      else if ((l.status === "RELEASED" || l.status === "ACTIVE") && window.confirm(code + " " + L("holdQ"))) qaIssue(code);
      else { flash(code + ": " + l.status, "warn"); render(); }
    });
  }

  // =========================== MIXING ===========================
  function lastPrefixFor(code) {
    var best = null;
    allLabels().forEach(function (l) { if (l.kind === "BN" && l.flavor_code === code && l.data && l.data.prefix) { if (!best || String(l.created_at) > String(best.created_at)) best = l; } });
    return best ? best.data.prefix : code;
  }
  function mixBatchCode() {
    var m = W.mix, seed = m.inputs.filter(function (x) { return x.mtype === "SEED"; })[0];
    var pre = String(m.prefix || "").toUpperCase().trim();
    return pre && seed && seed.seed_code ? pre + "/" + seed.seed_code : "";
  }
  function vMix() {
    var m = W.mix, fl = flavorBy(m.flavor);
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tMix")) + '</h2><div class="trc-grid">';
    h += '<div><label>' + esc(L("mixer")) + '</label>' + sel("trc-m-mixer", MIXERS.map(function (x) { return { v: x, t: "Mixer " + x }; }), ST.mixer, "TRACE.setMixer(this.value)") + '</div>';
    h += '<div><label>' + esc(L("flavor")) + '</label>' + sel("trc-m-flav", flavorOpts(true), m.flavor, "TRACE.mixFlavor(this.value)") + '</div>';
    h += '<div><label>' + esc(L("prefix")) + '</label><input id="trc-m-prefix" value="' + esc(m.prefix || "") + '" onchange="TRACE.mixPrefix(this.value)"></div>';
    h += '</div>';
    if (fl) h += '<p style="margin:10px 0 0"><b>Allergen:</b> <span class="trc-pill ' + (fl.alg === "A1" ? "RELEASED" : "HOLD") + '">' + esc(fl.alg || "?") + '</span> ' + esc(fl.algTxt || (fl.alg === "A1" ? "None" : "")) + '</p>';
    h += '<p class="hint" style="margin-top:12px">' + esc(L("scanInputs")) + '</p>' + scanBox("mixScan");
    h += '<h3 style="margin:14px 0 6px">' + esc(L("inputs")) + '</h3>';
    if (!m.inputs.length) h += '<p class="muted">-</p>';
    else h += '<table class="trc"><thead><tr><th>Type</th><th>Label</th><th>Item / lot</th><th>' + esc(L("lbsUsed")) + '</th><th>' + esc(L("markEmpty")) + '</th><th></th></tr></thead><tbody>' + m.inputs.map(function (x, i) {
      return '<tr><td>' + esc(x.mtype) + '</td><td>' + esc(x.lpn) + '</td><td>' + esc(x.item) + (x.flavor ? " (" + esc(x.flavor) + ")" : "") + '<br><b>' + esc(x.supplier_lot) + '</b>' + (x.seed_code ? ' &middot; seed ' + esc(x.seed_code) : "") + (x.warn ? '<br><span style="color:#a11;font-weight:700">' + esc(x.warn) + '</span>' : "") + '</td>' +
        '<td><input style="width:90px;padding:6px" type="number" step="any" value="' + esc(x.used || "") + '" onchange="TRACE.mixUsed(' + i + ',this.value)"></td>' +
        '<td><input type="checkbox" style="width:auto" ' + (x.empty ? "checked" : "") + ' onchange="TRACE.mixEmpty(' + i + ',this.checked)"></td>' +
        '<td><button class="ghost sm" onclick="TRACE.mixRemove(' + i + ')">x</button></td></tr>';
    }).join("") + '</tbody></table>';
    var bc = mixBatchCode();
    var hasSeed = m.inputs.some(function (x) { return x.mtype === "SEED"; }), hasSeas = m.inputs.some(function (x) { return x.mtype === "SEAS"; }), hasMalto = m.inputs.some(function (x) { return x.mtype === "MALTO"; });
    h += '<p style="margin-top:12px">' + (hasSeed ? "&#10003;" : "&#9744;") + ' Seed &nbsp; ' + (hasSeas ? "&#10003;" : "&#9744;") + ' Seasoning &nbsp; ' + (hasMalto ? "&#10003;" : "&#9744;") + ' Malto</p>';
    h += '<label>' + esc(L("batch")) + '</label><div class="trc-big">' + esc(bc || "-") + '</div>';
    h += '<div class="trc-grid"><div><label>' + esc(L("bins")) + '</label><input id="trc-m-bins" type="number" min="1" value="' + esc(m.bins || 1) + '"></div></div>';
    h += '<div class="trc-row"><button class="primary" onclick="TRACE.mixBins()">' + esc(L("makeBins")) + '</button><button class="ghost" style="margin-top:14px" onclick="TRACE.mixNew()">' + esc(L("newBatch")) + '</button></div>';
    h += '</div>';
    var recent = allLabels().filter(function (l) { return l.kind === "BN"; }).sort(byNewest).slice(0, 12);
    h += '<div class="card"><h2 class="sub2">Recent bins</h2>' + labelTable(recent) + '</div>';
    return h;
  }
  function mixScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    if (needOp()) return;
    fetchOne(code).then(function (l) {
      if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
      if (l.kind !== "RM") { flash(code + ": not a raw material label", "err"); render(); return; }
      var bad = labelUsable(l);
      if (bad) { flash(code + ": " + bad, "err"); render(); return; }
      if (W.mix.inputs.some(function (x) { return x.lpn === code; })) { flash(code + " already scanned", "warn"); render(); return; }
      var warn = "";
      if (l.mtype === "SEAS" && W.mix.flavor && l.flavor_code && l.flavor_code !== W.mix.flavor) warn = L("wrongFlavor") + ": " + l.flavor_code + " vs " + W.mix.flavor;
      if (warn && !window.confirm(warn + "\n\nOK = use anyway (Allen / QA approved)")) { flash(warn, "err"); render(); return; }
      if (!W.mix.flavor && l.mtype === "SEAS" && l.flavor_code) { W.mix.flavor = l.flavor_code; W.mix.prefix = lastPrefixFor(l.flavor_code); }
      W.mix.inputs.push({ lpn: l.lpn, mtype: l.mtype, item: l.item, flavor: l.flavor, supplier_lot: l.supplier_lot, seed_code: l.seed_code, warn: warn, used: "", empty: false });
      flash(code + " OK (" + l.mtype + " " + l.supplier_lot + ")", "ok"); render();
    });
  }
  function mixBins() {
    if (needOp()) return;
    var m = W.mix; m.bins = Math.max(1, Math.min(300, Math.floor(num(val("trc-m-bins")) || 1)));
    var fl = flavorBy(m.flavor);
    if (!fl) { flash(L("flavor") + "?", "err"); render(); return; }
    var seeds = m.inputs.filter(function (x) { return x.mtype === "SEED"; });
    if (!seeds.length) { flash("Scan the seed label first.", "err"); render(); return; }
    if (!m.inputs.some(function (x) { return x.mtype === "SEAS"; }) && !window.confirm("No seasoning scanned. Continue anyway?")) return;
    if (!seeds[0].seed_code) { var sc = window.prompt(L("seedCode") + "?"); if (!sc) return; seeds[0].seed_code = sc.toUpperCase().trim(); updLabel(seeds[0].lpn, { seed_code: seeds[0].seed_code }); }
    var bc = mixBatchCode(); if (!bc) { flash(L("prefix") + "?", "err"); render(); return; }
    var parents = m.inputs.map(function (x) { return x.lpn; }), stamp = nowISO(), rows = [], evs = [];
    var prior = allLabels().filter(function (l) { return l.kind === "BN" && l.lot === bc; }).length;
    for (var i = 0; i < m.bins; i++) {
      var lpn = newLpn("BN");
      rows.push({ lpn: lpn, kind: "BN", mtype: "BIN", item: "Mixed bin", flavor_code: fl.code, flavor: fl.name, size: "", lot: bc, supplier: "", supplier_lot: "", seed_code: seeds[0].seed_code, exp: null, qty: 1, qty_left: 1, uom: "bin", status: "ACTIVE", location: "MIXING", parents: parents, po: "", station: "MIXER " + ST.mixer, data: { prefix: String(m.prefix).toUpperCase().trim(), mixer: ST.mixer, bin_no: prior + i + 1, alg: fl.alg, algTxt: fl.algTxt, date: today() }, created_by: opName(), created_at: stamp });
      evs.push({ type: "MIX", lpn: lpn, qty: 1, uom: "bin", ref: "MIXER " + ST.mixer, lot: bc, data: { inputs: parents } });
    }
    m.inputs.forEach(function (x) {
      var used = num(x.used);
      if (used > 0 || x.empty) {
        var l = S.labels[x.lpn]; var left = l ? Math.max(0, (x.empty ? 0 : num(l.qty_left) - used)) : 0;
        updLabel(x.lpn, { qty_left: left, status: left <= 0 ? "EMPTY" : (l ? l.status : "RELEASED") });
      }
      evs.push({ type: "CONSUME", lpn: x.lpn, qty: num(x.used) || null, uom: "lb", ref: bc, lot: x.supplier_lot, data: { mixer: ST.mixer, bins: m.bins, empty: !!x.empty } });
      x.used = ""; if (x.empty) x.gone = true;
    });
    m.inputs = m.inputs.filter(function (x) { return !x.gone; });
    insLabels(rows).then(function (res) {
      if (!res.ok) { flash("Save failed: " + res.msg, "err"); render(); return; }
      return addEvents(evs).then(function () { printLabels(rows); flash(m.bins + " bin tags: " + bc, "ok"); render(); });
    });
  }

  // =========================== P-MAC ===========================
  function bagCode(p, m) { if (!p.batch) return ""; var d = String(m).slice(-1); return p.batch + d + "." + isoWeek(); }
  function vPmac() {
    var m = ST.machine, p = pmState(m), size = sizeForMachine(m), fl = flavorBy(p.flavor);
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tPmac")) + '</h2><div class="trc-grid">';
    h += '<div><label>' + esc(L("machine")) + '</label>' + sel("trc-p-m", PMACS.map(function (x) { return { v: x, t: "P-Mac " + x + " (" + sizeForMachine(x) + ")" }; }), m, "TRACE.setMachine(this.value)") + '</div></div>';
    h += scanBox("pmScan", "Scan bin tag (BN...) or film roll (RM...)");
    h += '<div class="trc-grid" style="margin-top:12px"><div><label>' + esc(L("binLoaded")) + '</label><div style="font-size:20px;font-weight:800">' + esc(p.batch || "-") + '</div><div class="muted">' + esc(fl ? fl.code + " " + fl.name : "") + (p.openBins.length ? " &middot; " + p.openBins.length + " bin(s) on this pallet" : "") + '</div></div>';
    h += '<div><label>' + esc(L("filmLoaded")) + '</label><div style="font-size:20px;font-weight:800">' + esc(p.film || "-") + '</div><div class="muted">' + esc(p.filmLot || "") + '</div></div></div>';
    var bcode = bagCode(p, m);
    h += '<label>' + esc(L("setPrinter")) + '</label><div class="trc-big">' + esc(bcode || "-") + '</div>';
    if (fl) h += '<p><b>Allergen:</b> ' + esc(fl.alg) + ' ' + esc(fl.algTxt) + ' &middot; <b>' + esc(L("size")) + ':</b> ' + esc(size) + '</p>';
    h += '<div class="trc-grid"><div><label>' + esc(L("bags")) + '</label><input id="trc-p-bags" type="number" min="1" placeholder="e.g. 2500"></div></div>';
    h += '<div class="trc-row"><button class="primary" onclick="TRACE.pmFinish()">' + esc(L("finishPallet")) + '</button><button class="ghost" style="margin-top:14px" onclick="TRACE.pmChange()">' + esc(L("codeChange")) + '</button><button class="ghost" style="margin-top:14px" onclick="TRACE.pmScrap()">' + esc(L("scrapBags")) + '</button></div>';
    if (p.changes && p.changes.length) h += '<p class="muted sm">Code changes today: ' + p.changes.filter(function (c) { return String(c.at).slice(0, 10) === today(); }).map(function (c) { return esc(c.from + " -> " + c.to + " @ " + new Date(c.at).toLocaleTimeString()); }).join(" &middot; ") + '</p>';
    h += '</div>';
    var recent = allLabels().filter(function (l) { return l.kind === "FG" && !(l.data && l.data.legacy); }).sort(byNewest).slice(0, 12);
    h += '<div class="card"><h2 class="sub2">Recent finished pallets</h2>' + labelTable(recent) + '</div>';
    return h;
  }
  function pmScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    if (needOp()) return;
    var m = ST.machine, p = pmState(m);
    fetchOne(code).then(function (l) {
      if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
      var bad = labelUsable(l); if (bad) { flash(code + ": " + bad, "err"); render(); return; }
      if (l.kind === "BN") {
        if (p.batch && l.lot !== p.batch) {
          var ans = window.prompt("CODE CHANGE: new batch " + l.lot + ".\nHow many bags of " + bagCode(p, m) + " are on the pallet right now?\n(They get their own pallet label first. Type 0 if none.)", "0");
          if (ans == null) { flash("Code change cancelled.", "warn"); render(); return; }
          var pre = Math.floor(num(ans));
          var go = pre > 0 ? finishPallet(m, pre) : Promise.resolve(null);
          go.then(function () {
            var from = bagCode(p, m);
            p.changes = (p.changes || []).concat([{ from: from, to: l.lot + String(m).slice(-1) + "." + isoWeek(), at: nowISO() }]).slice(-40);
            addEvents([{ type: "CODE_CHANGE", ref: "PMAC " + m, lot: from, data: { to: l.lot, machine: m } }]);
            p.openBins = []; p.batch = "";
            savePm(m); pmScan(code);
          });
          return;
        }
        p.batch = l.lot; p.flavor = l.flavor_code;
        if (p.openBins.indexOf(l.lpn) < 0) p.openBins.push(l.lpn);
        if (p.filmFlavor && l.flavor_code && p.filmFlavor !== l.flavor_code) flash("Bin loaded, but FILM is " + p.filmFlavor + " and bin is " + l.flavor_code + ". Check the film!", "warn");
        else flash("Bin " + code + " loaded (" + l.lot + ")", "ok");
        updLabel(l.lpn, { location: "PMAC " + m, qty_left: 0, status: "EMPTY" });
        addEvents([{ type: "LOAD_BIN", lpn: l.lpn, ref: "PMAC " + m, lot: l.lot, to_loc: "PMAC " + m }]);
        savePm(m); render(); return;
      }
      if (l.kind === "RM" && l.mtype === "FILM") {
        if (p.flavor && l.flavor_code && l.flavor_code !== p.flavor && !window.confirm(L("wrongFlavor") + ": film " + l.flavor_code + " vs bins " + p.flavor + "\nOK = load anyway")) { flash(L("wrongFlavor"), "err"); render(); return; }
        var evs = [];
        if (p.film && p.film !== l.lpn) evs.push({ type: "FILM_OFF", lpn: p.film, ref: "PMAC " + m, lot: p.filmLot });
        evs.push({ type: "FILM_ON", lpn: l.lpn, ref: "PMAC " + m, lot: l.supplier_lot, to_loc: "PMAC " + m });
        p.film = l.lpn; p.filmLot = l.supplier_lot; p.filmFlavor = l.flavor_code;
        p.openFilms = p.openFilms || []; if (p.openFilms.indexOf(l.lpn) < 0) p.openFilms.push(l.lpn);
        updLabel(l.lpn, { location: "PMAC " + m });
        addEvents(evs); savePm(m); flash("Film roll " + code + " on P-Mac " + m, "ok"); render(); return;
      }
      flash(code + ": scan a bin tag (BN) or film roll (RM film)", "err"); render();
    });
  }
  function pmChange() {
    var m = ST.machine, p = pmState(m);
    var nb = window.prompt("Code change on P-Mac " + m + ". Scan or type the NEW batch code / bin tag:"); if (!nb) return;
    nb = cleanScan(nb).toUpperCase();
    if (isOurLpn(nb)) { pmScan(nb); return; }
    var from = bagCode(p, m);
    p.changes = (p.changes || []).concat([{ from: from, to: nb, at: nowISO() }]).slice(-40);
    p.batch = nb; p.openBins = [];
    addEvents([{ type: "CODE_CHANGE", ref: "PMAC " + m, lot: from, data: { to: nb, machine: m, manual: true } }]);
    savePm(m); flash("Code change recorded " + from + " -> " + bagCode(p, m), "warn"); render();
  }
  function finishPallet(m, bags) {
    var p = pmState(m), fl = flavorBy(p.flavor), lot = bagCode(p, m);
    var parents = (p.openBins || []).concat(p.openFilms && p.openFilms.length ? p.openFilms : (p.film ? [p.film] : []));
    parents = parents.filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    var row = { lpn: newLpn("FG"), kind: "FG", mtype: "FG", item: (fl ? fl.name : p.flavor) + " " + sizeForMachine(m), flavor_code: p.flavor, flavor: fl ? fl.name : "", size: sizeForMachine(m), lot: lot, supplier: "", supplier_lot: "", seed_code: "", exp: null, qty: bags, qty_left: bags, uom: "bags", status: "ACTIVE", location: "STAGING", parents: parents, po: "", station: "PMAC " + m, data: { machine: m, week: isoWeek(), date: today(), alg: fl ? fl.alg : "", algTxt: fl ? fl.algTxt : "", batch: p.batch }, created_by: opName(), created_at: nowISO() };
    return insLabels([row]).then(function (res) {
      if (!res.ok) { flash("Save failed: " + res.msg, "err"); return null; }
      return addEvents([{ type: "PACK", lpn: row.lpn, qty: bags, uom: "bags", ref: "PMAC " + m, lot: lot, to_loc: "STAGING", data: { parents: parents } }]).then(function () {
        // the bin in the hopper and the film on the machine keep feeding the next pallet
        p.openBins = (p.openBins || []).slice(-1); p.openFilms = p.film ? [p.film] : [];
        savePm(m); printLabels([row]); flash("Pallet " + row.lpn + ": " + bags + " bags " + lot + " -> STAGING", "ok");
        return row;
      });
    });
  }
  function pmFinish() {
    if (needOp()) return;
    var m = ST.machine, p = pmState(m), bags = Math.floor(num(val("trc-p-bags")));
    if (!p.batch) { flash("Scan a bin tag first.", "err"); render(); return; }
    if (!(bags > 0)) { flash(L("bags") + "?", "err"); render(); return; }
    if (!p.film && !window.confirm("No film roll scanned on this machine. Finish anyway? (SQF needs the film linked)")) return;
    finishPallet(m, bags).then(render);
  }
  function pmScrap() {
    if (needOp()) return;
    var m = ST.machine, p = pmState(m);
    var n = num(window.prompt(L("scrapBags") + " (P-Mac " + m + ")?")); if (!(n > 0)) return;
    var why = window.prompt(L("reason") + "?") || "";
    addEvents([{ type: "SCRAP", qty: n, uom: "bags", ref: "PMAC " + m, lot: bagCode(p, m), data: { reason: why } }]).then(function () { flash("Scrap " + n + " bags logged", "warn"); render(); });
  }

  // =========================== MOVE ===========================
  function vMove() {
    var mv = W.move, l = mv.lpn ? S.labels[mv.lpn] : null;
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tMove")) + '</h2><p class="hint">' + esc(L("moveHint")) + '</p>';
    h += scanBox("moveScan", l ? L("scanLoc") : L("scanPh"));
    if (l) h += '<p style="margin-top:12px;font-size:18px"><b>' + esc(l.lpn) + '</b> ' + esc(l.item) + ' &middot; ' + esc(l.lot) + ' &middot; ' + fmt(l.qty_left) + ' ' + esc(l.uom) + ' &middot; now at <b>' + esc(l.location) + '</b></p><p class="trc-big" style="font-size:22px">' + esc(L("scanLoc")) + ' &rarr;</p>';
    h += '</div>';
    var recent = S.events.filter(function (e) { return e.type === "MOVE"; }).slice(-15).reverse();
    h += '<div class="card"><h2 class="sub2">Recent moves</h2><table class="trc"><tbody>' + recent.map(function (e) { return '<tr><td>' + esc(String(e.ts).slice(5, 16).replace("T", " ")) + '</td><td>' + esc(e.lpn) + '</td><td>' + esc(e.from_loc) + ' &rarr; <b>' + esc(e.to_loc) + '</b></td><td>' + esc(e.operator) + '</td></tr>'; }).join("") + '</tbody></table></div>';
    return h;
  }
  function moveScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    if (needOp()) return;
    if (isOurLpn(code)) {
      fetchOne(code).then(function (l) {
        if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
        W.move.lpn = code; flash(code + " - " + L("scanLoc"), "ok"); render();
      });
      return;
    }
    if (!W.move.lpn) { flash("Scan the pallet / box label first.", "err"); render(); return; }
    var l = S.labels[W.move.lpn], from = l.location;
    updLabel(l.lpn, { location: code }).then(function () { return addEvents([{ type: "MOVE", lpn: l.lpn, qty: l.qty_left, uom: l.uom, from_loc: from, to_loc: code, lot: l.lot }]); })
      .then(function () { flash(l.lpn + ": " + from + " -> " + code, "ok"); W.move.lpn = ""; render(); });
  }

  // =========================== USE (line / e-com / samples / scrap) ===========================
  function vUse() {
    var u = W.use;
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tUse")) + '</h2><div class="trc-grid">';
    h += '<div><label>' + esc(L("dest")) + '</label>' + sel("trc-u-dest", DESTS.map(function (d) { return { v: d.k, t: LT(d) }; }), u.dest, "TRACE.useDest(this.value)") + '</div>';
    h += '<div><label>' + esc(L("qtyTake")) + '</label><input id="trc-u-qty" type="number" min="1" value="' + esc(u.qty || "") + '"></div>';
    h += '<div><label>Note / reference</label><input id="trc-u-ref" value="' + esc(u.ref || "") + '"></div></div>';
    h += scanBox("useScan");
    h += '</div>';
    var recent = S.events.filter(function (e) { return e.type === "USE"; }).slice(-20).reverse();
    h += '<div class="card"><h2 class="sub2">Recent</h2><table class="trc"><thead><tr><th>When</th><th>Label</th><th>Lot</th><th>Bags</th><th>To</th><th>By</th></tr></thead><tbody>' + recent.map(function (e) { return '<tr><td>' + esc(String(e.ts).slice(5, 16).replace("T", " ")) + '</td><td>' + esc(e.lpn) + '</td><td>' + esc(e.lot) + '</td><td>' + fmt(e.qty) + '</td><td>' + esc(e.to_loc) + (e.ref ? " &middot; " + esc(e.ref) : "") + '</td><td>' + esc(e.operator) + '</td></tr>'; }).join("") + '</tbody></table></div>';
    return h;
  }
  function useDest(v) { W.use.dest = v; W.use.qty = val("trc-u-qty"); W.use.ref = val("trc-u-ref"); render(); }
  function useScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    if (needOp()) return;
    W.use.qty = val("trc-u-qty"); W.use.ref = val("trc-u-ref"); W.use.dest = val("trc-u-dest") || W.use.dest;
    fetchOne(code).then(function (l) {
      if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
      if (l.kind !== "FG") { flash(code + ": scan a finished pallet (FG) label", "err"); render(); return; }
      if (l.status === "HOLD" || l.status === "REJECTED") { flash(code + ": " + L("onHold"), "err"); render(); return; }
      var take = num(W.use.qty) > 0 ? Math.min(num(W.use.qty), l.qty_left) : l.qty_left;
      if (!(take > 0)) { flash(code + " is empty", "err"); render(); return; }
      var left = l.qty_left - take;
      updLabel(l.lpn, { qty_left: left, status: left <= 0 ? "EMPTY" : l.status }).then(function () {
        return addEvents([{ type: "USE", lpn: l.lpn, qty: take, uom: "bags", from_loc: l.location, to_loc: W.use.dest, ref: W.use.ref || "", lot: l.lot, data: { flavor: l.flavor_code, size: l.size } }]);
      }).then(function () { flash(take + " bags " + l.lot + " -> " + W.use.dest + (left > 0 ? " (" + left + " left on pallet)" : " (pallet empty)"), "ok"); W.use.qty = ""; render(); });
    });
  }

  // =========================== SHIP (outbound pallet for a PO) ===========================
  function vShip() {
    var s = W.ship;
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tShip")) + '</h2><p class="hint">' + esc(L("shipHint")) + '</p><div class="trc-grid">';
    h += '<div><label>' + esc(L("po")) + '</label><input id="trc-s-po" value="' + esc(s.po) + '" onchange="TRACE.shipField(\'po\',this.value)"></div>';
    h += '<div><label>' + esc(L("customer")) + '</label><input id="trc-s-cust" value="' + esc(s.customer) + '" onchange="TRACE.shipField(\'customer\',this.value)"></div>';
    h += '<div><label>' + esc(L("qtyTake")) + '</label><input id="trc-s-qty" type="number" min="1"></div></div>';
    h += scanBox("shipScan");
    if (s.lines.length) {
      h += '<table class="trc" style="margin-top:12px"><thead><tr><th>Pallet</th><th>Flavor</th><th>Lot</th><th>Bags</th><th></th></tr></thead><tbody>' + s.lines.map(function (x, i) { return '<tr><td>' + esc(x.lpn) + '</td><td>' + esc(x.flavor) + ' ' + esc(x.size) + '</td><td><b>' + esc(x.lot) + '</b></td><td>' + fmt(x.bags) + '</td><td><button class="ghost sm" onclick="TRACE.shipRemove(' + i + ')">x</button></td></tr>'; }).join("") + '</tbody></table>';
      h += '<button class="primary" onclick="TRACE.shipFinish()">' + esc(L("finishShip")) + '</button>';
    }
    h += '</div>';
    var recent = allLabels().filter(function (l) { return l.kind === "OB"; }).sort(byNewest).slice(0, 12);
    h += '<div class="card"><h2 class="sub2">Recent outbound pallets</h2>' + labelTable(recent) + '</div>';
    return h;
  }
  function shipField(k, v) { W.ship[k] = v; }
  function shipScan(code) {
    code = cleanScan(code).toUpperCase(); if (!code) return;
    if (needOp()) return;
    W.ship.po = val("trc-s-po"); W.ship.customer = val("trc-s-cust");
    var q = num(val("trc-s-qty"));
    fetchOne(code).then(function (l) {
      if (!l) { flash(L("notFound") + ": " + code, "err"); render(); return; }
      if (l.kind !== "FG") { flash(code + ": scan a finished pallet (FG) label", "err"); render(); return; }
      if (l.status === "HOLD" || l.status === "REJECTED") { flash(code + ": " + L("onHold"), "err"); render(); return; }
      var already = W.ship.lines.filter(function (x) { return x.lpn === code; }).reduce(function (a, x) { return a + x.bags; }, 0);
      var avail = l.qty_left - already;
      var bags = q > 0 ? Math.min(q, avail) : avail;
      if (!(bags > 0)) { flash(code + " is empty", "err"); render(); return; }
      W.ship.lines.push({ lpn: l.lpn, flavor: l.flavor, flavor_code: l.flavor_code, size: l.size, lot: l.lot, bags: bags });
      flash(bags + " bags " + l.flavor + " " + l.lot, "ok"); render();
    });
  }
  function shipRemove(i) { W.ship.lines.splice(i, 1); render(); }
  function shipFinish() {
    if (needOp()) return;
    var s = W.ship; s.po = val("trc-s-po") || s.po; s.customer = val("trc-s-cust") || s.customer;
    if (!s.po) { flash(L("po") + "?", "err"); render(); return; }
    if (!s.lines.length) return;
    var parents = s.lines.map(function (x) { return x.lpn; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var total = s.lines.reduce(function (a, x) { return a + x.bags; }, 0);
    var nOnPo = allLabels().filter(function (l) { return l.kind === "OB" && l.po === s.po; }).length;
    var row = { lpn: newLpn("OB"), kind: "OB", mtype: "OB", item: "Outbound pallet", flavor_code: "", flavor: "", size: "", lot: s.lines.map(function (x) { return x.lot; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(" | "), supplier: "", supplier_lot: "", seed_code: "", exp: null, qty: total, qty_left: total, uom: "bags", status: "SHIPPED", location: "DOCK", parents: parents, po: s.po, station: "SHIPPING", data: { customer: s.customer, lines: s.lines, pallet_no: nOnPo + 1 }, created_by: opName(), created_at: nowISO() };
    var evs = [], ups = [];
    s.lines.forEach(function (x) {
      var l = S.labels[x.lpn]; var left = Math.max(0, num(l.qty_left) - x.bags);
      ups.push(updLabel(x.lpn, { qty_left: left, status: left <= 0 ? "EMPTY" : l.status }));
      l.qty_left = left;
      evs.push({ type: "SHIP", lpn: x.lpn, qty: x.bags, uom: "bags", from_loc: l.location, to_loc: "PO " + s.po, ref: s.po, lot: x.lot, data: { customer: s.customer, ob: row.lpn, flavor: x.flavor_code, size: x.size } });
    });
    Promise.all(ups).then(function () { return insLabels([row]); }).then(function () { return addEvents(evs); }).then(function () {
      printLabels([row]); flash("Outbound pallet " + row.lpn + " for PO " + s.po + ": " + total + " bags, lots " + row.lot, "ok");
      W.ship.lines = []; render();
    });
  }

  // =========================== TRACE ===========================
  function findMatches(q) {
    q = cleanScan(q).toUpperCase(); if (!q) return { labels: [], events: [] };
    var labs = allLabels().filter(function (l) {
      return l.lpn === q || String(l.lot || "").toUpperCase() === q || String(l.supplier_lot || "").toUpperCase() === q ||
        String(l.po || "").toUpperCase() === q || String(l.seed_code || "").toUpperCase() === q ||
        (l.kind === "OB" && String(l.lot || "").toUpperCase().split(" | ").indexOf(q) >= 0);
    });
    if (!labs.length) labs = allLabels().filter(function (l) { return String(l.lot || "").toUpperCase().indexOf(q) >= 0 || String(l.supplier_lot || "").toUpperCase().indexOf(q) >= 0; }).slice(0, 50);
    var evs = S.events.filter(function (e) { return String(e.ref || "").toUpperCase() === q; });
    return { labels: labs, events: evs };
  }
  function describe(l) {
    if (!l) return "?";
    var t = l.lpn + "  [" + l.kind + (l.mtype && l.mtype !== l.kind ? " " + l.mtype : "") + "]  ";
    if (l.kind === "RM") t += (l.item || "") + (l.flavor ? " (" + l.flavor + ")" : "") + "  supplier " + (l.supplier || "?") + "  lot " + (l.supplier_lot || "?") + (l.seed_code ? "  seed " + l.seed_code : "") + (l.exp ? "  exp " + l.exp : "") + "  " + fmt(l.qty) + " " + l.uom + (l.po ? "  PO " + l.po : "") + "  rcvd " + String(l.created_at || "").slice(0, 10) + (l.data && l.data.issues && l.data.issues.length ? "  ISSUE: " + l.data.issues.map(function (x) { return x.txt; }).join("; ") : "");
    else if (l.kind === "BN") t += "bin " + (l.data && l.data.bin_no || "") + "  batch " + l.lot + "  " + (l.flavor || "") + "  mixer " + (l.data && l.data.mixer || "") + "  " + String(l.created_at || "").slice(0, 10) + "  by " + (l.created_by || "");
    else if (l.kind === "FG") t += (l.flavor || l.item) + " " + (l.size || "") + "  LOT " + l.lot + "  " + fmt(l.qty) + " bags (" + fmt(l.qty_left) + " left @ " + l.location + ")  " + (l.station || "") + "  " + String(l.created_at || "").slice(0, 10) + (l.data && l.data.legacy ? "  [labeled from existing stock]" : "");
    else if (l.kind === "OB") t += "PO " + l.po + "  " + ((l.data && l.data.customer) || "") + "  " + fmt(l.qty) + " bags  lots " + l.lot + "  " + String(l.created_at || "").slice(0, 10);
    return t + "  " + l.status;
  }
  function backTree(lpn, depth, seen) {
    seen = seen || {}; depth = depth || 0; if (seen[lpn] || depth > 8) return ""; seen[lpn] = 1;
    var l = S.labels[lpn]; var pad = new Array(depth + 1).join("    ");
    var out = pad + (depth ? "<- " : "") + describe(l) + "\n";
    (l && l.parents || []).forEach(function (p) { out += backTree(p, depth + 1, seen); });
    return out;
  }
  function fwdTree(lpn, depth, seen) {
    seen = seen || {}; depth = depth || 0; if (seen[lpn] || depth > 8) return ""; seen[lpn] = 1;
    var l = S.labels[lpn]; var pad = new Array(depth + 1).join("    ");
    var out = pad + (depth ? "-> " : "") + describe(l) + "\n";
    S.events.filter(function (e) { return e.lpn === lpn && (e.type === "USE" || e.type === "SHIP"); }).forEach(function (e) {
      out += pad + "    => " + e.type + " " + fmt(e.qty) + " bags to " + (e.to_loc || "") + (e.ref ? " (" + e.ref + ")" : "") + (e.data && e.data.customer ? " " + e.data.customer : "") + "  " + String(e.ts).slice(0, 16).replace("T", " ") + "  by " + (e.operator || "") + "\n";
    });
    childrenOf(lpn).forEach(function (c) { if (c.kind !== "OB") out += fwdTree(c.lpn, depth + 1, seen); });
    return out;
  }
  function balance(labs) {
    // FG-level mass balance for every finished lot touched by the result set
    var lots = {};
    function addLot(lot) { if (lot && !lots[lot]) lots[lot] = { packed: 0, shipped: 0, line: 0, ecom: 0, other: 0, scrap: 0, left: 0, pos: {} }; return lots[lot]; }
    var fgs = {};
    labs.forEach(function (l) {
      if (l.kind === "FG") fgs[l.lpn] = l;
      if (l.kind === "RM" || l.kind === "BN") { (function walk(x, d) { if (d > 6) return; childrenOf(x).forEach(function (c) { if (c.kind === "FG") fgs[c.lpn] = c; else if (c.kind !== "OB") walk(c.lpn, d + 1); }); })(l.lpn, 0); }
      if (l.kind === "OB") (l.parents || []).forEach(function (p) { if (S.labels[p]) fgs[p] = S.labels[p]; });
    });
    Object.keys(fgs).forEach(function (k) {
      var f = fgs[k], b = addLot(f.lot); b.packed += num(f.qty); b.left += num(f.qty_left);
      S.events.filter(function (e) { return e.lpn === f.lpn; }).forEach(function (e) {
        if (e.type === "SHIP") { b.shipped += num(e.qty); b.pos[e.ref] = (b.pos[e.ref] || 0) + num(e.qty); }
        if (e.type === "USE") { if (e.to_loc === "LINE") b.line += num(e.qty); else if (e.to_loc === "ECOM") b.ecom += num(e.qty); else if (e.to_loc === "SCRAP") b.scrap += num(e.qty); else b.other += num(e.qty); }
      });
    });
    S.events.forEach(function (e) { if (e.type === "SCRAP" && lots[e.lot]) lots[e.lot].scrap += num(e.qty); });
    return lots;
  }
  function vTrace() {
    var t = W.trace, res = findMatches(t.q);
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tTrace")) + '</h2><p class="hint">' + esc(L("traceHint")) + '</p>';
    h += '<div class="trc-noprint">' + scanBox("traceQ") + '</div>';
    h += '<div class="trc-row trc-noprint" style="margin-top:10px">' + (t.drillStart ? '<span class="trc-timer">Started ' + esc(new Date(t.drillStart).toLocaleTimeString()) + ' (' + drillTxt() + ' so far)</span><button class="ghost" onclick="TRACE.drill(false)">' + esc(L("stopDrill")) + '</button>' : '<button class="ghost" onclick="TRACE.drill(true)">' + esc(L("startDrill")) + '</button>') + (t.q ? '<button class="ghost" onclick="TRACE.printEvidence()">' + esc(L("printEv")) + '</button>' : "") + '</div>';
    if (t.drillDone) h += '<p><b>Mock recall time:</b> ' + esc(t.drillDone) + '</p>';
    h += '</div>';
    if (!t.q) return h;
    h += '<div class="card" id="trc-evidence"><h2 class="sub2">Trace: ' + esc(t.q) + '</h2><p class="muted">Run ' + esc(new Date().toLocaleString()) + ' by ' + esc(opName() || "?") + (t.drillStart ? " &middot; mock recall in progress" : "") + '</p>';
    if (!res.labels.length && !res.events.length) return h + '<p><b>' + esc(L("notFound")) + '</b></p></div>';
    var lots = balance(res.labels);
    var lk = Object.keys(lots);
    if (lk.length) {
      h += '<h3>' + esc(L("balance")) + ' (bags)</h3><table class="trc"><thead><tr><th>Finished lot</th><th>Packed</th><th>Shipped (POs)</th><th>Line</th><th>E-com</th><th>Samples/other</th><th>Scrap</th><th>On hand</th><th>Unaccounted</th></tr></thead><tbody>' + lk.map(function (k) {
        var b = lots[k], un = b.packed - b.shipped - b.line - b.ecom - b.other - b.scrap - b.left;
        var pos = Object.keys(b.pos).map(function (p) { return p + ": " + fmt(b.pos[p]); }).join(", ");
        var rec = b.packed ? Math.round((b.packed - Math.max(0, un)) / b.packed * 1000) / 10 : 0;
        return '<tr><td><b>' + esc(k) + '</b></td><td>' + fmt(b.packed) + '</td><td>' + fmt(b.shipped) + (pos ? '<br><span class="muted sm">' + esc(pos) + '</span>' : "") + '</td><td>' + fmt(b.line) + '</td><td>' + fmt(b.ecom) + '</td><td>' + fmt(b.other) + '</td><td>' + fmt(b.scrap) + '</td><td>' + fmt(b.left) + '</td><td style="font-weight:700;color:' + (Math.abs(un) > 0 ? "#a11" : "#17692f") + '">' + fmt(un) + ' <span class="muted sm">(' + rec + '% accounted)</span></td></tr>';
      }).join("") + '</tbody></table>';
    }
    var shown = res.labels.slice(0, 40);
    h += '<h3>' + esc(L("back")) + '</h3><div class="trc-tree">' + esc(shown.map(function (l) { return backTree(l.lpn); }).join("\n")) + '</div>';
    h += '<h3>' + esc(L("fwd")) + '</h3><div class="trc-tree">' + esc(shown.map(function (l) { return fwdTree(l.lpn); }).join("\n")) + '</div>';
    var ecom = S.events.filter(function (e) { return e.type === "USE" && e.to_loc === "ECOM" && (lots[e.lot] || shown.some(function (l) { return l.lot === e.lot; })); });
    if (ecom.length) h += '<h3>E-commerce window</h3><p class="hint">Bags from these lots went to the e-com line on the dates below. Orders shipped from that line from the first date until the lot was used up are in scope (match in ShipStation by ship date).</p><table class="trc"><tbody>' + ecom.map(function (e) { return '<tr><td>' + esc(String(e.ts).slice(0, 16).replace("T", " ")) + '</td><td>' + esc(e.lot) + '</td><td>' + fmt(e.qty) + ' bags</td><td>' + esc(e.operator) + '</td></tr>'; }).join("") + '</tbody></table>';
    if (res.events.length) h += '<h3>Events referencing ' + esc(t.q) + '</h3><table class="trc"><tbody>' + res.events.slice(-60).map(function (e) { return '<tr><td>' + esc(String(e.ts).slice(0, 16).replace("T", " ")) + '</td><td>' + esc(e.type) + '</td><td>' + esc(e.lpn || "") + '</td><td>' + esc(e.lot || "") + '</td><td>' + fmt(e.qty) + ' ' + esc(e.uom || "") + '</td><td>' + esc(e.operator || "") + '</td></tr>'; }).join("") + '</tbody></table>';
    h += '</div>';
    return h;
  }
  function drillTxt() { var s = Math.floor((Date.now() - W.trace.drillStart) / 1000); return String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function drill(on) {
    if (on) {
      W.trace.drillStart = Date.now(); W.trace.drillDone = "";
      addEvents([{ type: "MOCK_RECALL_START", ref: W.trace.q || "", data: {} }]);
    } else {
      var txt = drillTxt(); W.trace.drillDone = txt; W.trace.drillStart = null;
      addEvents([{ type: "MOCK_RECALL_END", ref: W.trace.q || "", data: { elapsed: txt } }]);
    }
    render();
  }
  function traceQ(q) { W.trace.q = cleanScan(q); if (W.trace.drillStart) addEvents([{ type: "TRACE_QUERY", ref: W.trace.q }]); render(); }
  function printEvidence() {
    var ev = $("trc-evidence"); if (!ev) return;
    var w = window.open("", "_blank"); if (!w) { window.print(); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Trace evidence ' + esc(W.trace.q) + '</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#222}table{border-collapse:collapse;width:100%;margin:6px 0 14px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}.trc-tree{font-family:monospace;white-space:pre-wrap;font-size:11px;border:1px solid #ccc;padding:8px}h2{margin:0 0 4px}h3{margin:16px 0 4px}.muted{color:#666}</style></head><body><h1 style="font-size:18px">Smackin\' Snacks - Traceability Evidence</h1>' + ev.innerHTML + (W.trace.drillDone ? '<p><b>Mock recall elapsed time:</b> ' + esc(W.trace.drillDone) + '</p>' : "") + '<p style="margin-top:24px">Reviewed by: ______________________ &nbsp; Date: __________</p></body></html>');
    w.document.close(); setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300);
  }

  // =========================== LABELS list ===========================
  function labelTable(list) {
    if (!list.length) return '<p class="muted">-</p>';
    return '<div class="tblwrap"><table class="trc"><thead><tr><th>Label</th><th>Item</th><th>Lot</th><th>Qty left</th><th>Where</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (l) {
      return '<tr><td><b>' + esc(l.lpn) + '</b><br><span class="muted sm">' + esc(String(l.created_at || "").slice(0, 16).replace("T", " ")) + ' ' + esc(l.created_by || "") + '</span></td><td>' + esc(l.flavor ? l.flavor + (l.size ? " " + l.size : "") : l.item) + (l.kind === "RM" ? '<br><span class="muted sm">' + esc(l.supplier || "") + '</span>' : "") + '</td><td><b>' + esc(l.lot || "") + '</b>' + (l.exp ? '<br><span class="muted sm">exp ' + esc(l.exp) + '</span>' : "") + '</td><td>' + fmt(l.qty_left) + ' ' + esc(l.uom) + '</td><td>' + esc(l.location || "") + '</td><td>' + pill(l.status) + '</td><td class="trc-row"><button class="ghost sm" onclick="TRACE.reprint(\'' + esc(l.lpn) + '\')">' + esc(L("reprint")) + '</button><button class="ghost sm" onclick="TRACE.traceOf(\'' + esc(l.lpn) + '\')">' + esc(L("tTrace")) + '</button></td></tr>';
    }).join("") + '</tbody></table></div>';
  }
  function vLabels() {
    var f = W.labels;
    var list = allLabels().filter(function (l) {
      if (f.kind && l.kind !== f.kind) return false;
      if (f.status && l.status !== f.status) return false;
      if (f.q) { var q = f.q.toUpperCase(); if ((l.lpn + " " + l.lot + " " + l.supplier_lot + " " + l.item + " " + l.flavor + " " + l.location + " " + l.po).toUpperCase().indexOf(q) < 0) return false; }
      return true;
    }).sort(byNewest);
    var h = '<div class="card"><h2 class="sub2">' + esc(L("tLabels")) + ' (' + list.length + ')</h2><div class="trc-grid">';
    h += '<div><label>' + esc(L("kind")) + '</label>' + sel("trc-l-kind", [{ v: "", t: L("all") }, { v: "RM", t: "RM raw material" }, { v: "BN", t: "BN mixed bin" }, { v: "FG", t: "FG finished pallet" }, { v: "OB", t: "OB outbound pallet" }], f.kind, "TRACE.lf('kind',this.value)") + '</div>';
    h += '<div><label>' + esc(L("status")) + '</label>' + sel("trc-l-st", [{ v: "", t: L("all") }, "HOLD", "RELEASED", "ACTIVE", "EMPTY", "SHIPPED", "REJECTED"].map(function (x) { return typeof x === "string" ? { v: x, t: x } : x; }), f.status, "TRACE.lf('status',this.value)") + '</div>';
    h += '<div><label>' + esc(L("search")) + '</label><input id="trc-l-q" value="' + esc(f.q) + '" onchange="TRACE.lf(\'q\',this.value)"></div></div>';
    var onhand = {};
    list.filter(function (l) { return l.kind === "FG" && l.qty_left > 0; }).forEach(function (l) { var k = (l.flavor || l.item) + " " + (l.size || ""); onhand[k] = (onhand[k] || 0) + l.qty_left; });
    var ok = Object.keys(onhand).sort();
    if (ok.length) h += '<p class="muted" style="margin-top:10px"><b>Scanned finished bags on hand:</b> ' + ok.map(function (k) { return esc(k) + ": " + fmt(onhand[k]); }).join(" &middot; ") + '</p>';
    h += '</div><div class="card">' + labelTable(list.slice(0, 300)) + '</div>';
    return h;
  }

  // =========================== LABEL PRINTING (4x6) ===========================
  function barcodeSvg(text) {
    try {
      if (!window.JsBarcode) return '<div style="font:700 20px monospace">' + esc(text) + '</div>';
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      window.JsBarcode(svg, text, { format: "CODE128", width: 3, height: 90, displayValue: true, fontSize: 22, margin: 4 });
      return svg.outerHTML;
    } catch (e) { return '<div style="font:700 20px monospace">' + esc(text) + '</div>'; }
  }
  function labelHtml(l) {
    var d = l.data || {}, top = "", body = "";
    if (l.kind === "RM") {
      top = esc(typeLabel(l.mtype));
      body = '<div class="big">' + esc(l.item || "") + (l.flavor ? '<br><span style="font-size:22px">' + esc(l.flavor) + '</span>' : "") + '</div>' +
        '<div class="kv"><b>Supplier / Proveedor:</b> ' + esc(l.supplier || "") + '</div>' +
        '<div class="lot">LOT ' + esc(l.supplier_lot || "") + '</div>' +
        '<div class="kv"><b>Exp / Vence:</b> ' + esc(l.exp || "-") + ' &nbsp; <b>Qty:</b> ' + fmt(l.qty) + ' ' + esc(l.uom) + (l.seed_code ? ' &nbsp; <b>Seed code:</b> ' + esc(l.seed_code) : "") + '</div>' +
        '<div class="kv"><b>Received / Recibido:</b> ' + esc(String(l.created_at || "").slice(0, 10)) + (l.po ? ' &nbsp; <b>PO</b> ' + esc(l.po) : "") + ' &nbsp; ' + esc(d.unit || "") + '</div>' +
        (l.status === "HOLD" ? '<div class="hold">QA HOLD - RETENIDO<br><span style="font-size:14px">Do not use until released / No usar hasta liberar</span>' + (d.issues && d.issues.length ? '<br><span style="font-size:15px">' + esc(d.issues[d.issues.length - 1].txt) + '</span>' : '') + '</div>' : "");
    } else if (l.kind === "BN") {
      top = "MIXED BIN / CONTENEDOR";
      body = '<div class="big">' + esc(l.flavor) + '</div><div class="lot">BATCH ' + esc(l.lot) + '</div>' +
        '<div class="alg">Allergen ' + esc(d.alg || "") + (d.algTxt ? ": " + esc(d.algTxt) : (d.alg === "A1" ? ": none" : "")) + '</div>' +
        '<div class="kv"><b>Mixer:</b> ' + esc(d.mixer || "") + ' &nbsp; <b>Bin #</b> ' + esc(d.bin_no || "") + ' &nbsp; <b>Date:</b> ' + esc(d.date || "") + '</div><div class="kv"><b>By:</b> ' + esc(l.created_by || "") + '</div>';
    } else if (l.kind === "FG") {
      top = "FINISHED BAGS / BOLSAS TERMINADAS";
      body = '<div class="big">' + esc(l.flavor || l.item) + ' &middot; ' + esc(l.size || "") + '</div><div class="lot">LOT ' + esc(l.lot) + '</div>' +
        '<div class="qty">' + fmt(l.qty) + ' BAGS / BOLSAS</div>' +
        (d.alg ? '<div class="alg">Allergen ' + esc(d.alg) + (d.algTxt ? ": " + esc(d.algTxt) : "") + '</div>' : "") +
        '<div class="kv"><b>Packed:</b> ' + esc(d.date || String(l.created_at || "").slice(0, 10)) + (d.machine ? ' &nbsp; <b>P-Mac</b> ' + esc(d.machine) : "") + ' &nbsp; <b>By:</b> ' + esc(l.created_by || "") + '</div>';
    } else if (l.kind === "OB") {
      top = "OUTBOUND / SALIDA";
      var lines = (d.lines || []).reduce(function (m, x) { var k = x.flavor + " " + x.size + "|" + x.lot; m[k] = (m[k] || 0) + x.bags; return m; }, {});
      body = '<div class="big">PO ' + esc(l.po) + '</div><div class="kv" style="font-size:18px">' + esc(d.customer || "") + ' &nbsp; Pallet ' + esc(d.pallet_no || "") + '</div>' +
        '<table>' + Object.keys(lines).map(function (k) { var p = k.split("|"); return '<tr><td>' + esc(p[0]) + '</td><td><b>' + esc(p[1]) + '</b></td><td style="text-align:right">' + fmt(lines[k]) + '</td></tr>'; }).join("") + '</table>' +
        '<div class="kv"><b>Total bags:</b> ' + fmt(l.qty) + ' &nbsp; <b>Built:</b> ' + esc(String(l.created_at || "").slice(0, 10)) + ' ' + esc(l.created_by || "") + '</div>';
    }
    return '<div class="lbl4x6"><div class="top">' + top + '</div>' + body + '<div class="bc">' + barcodeSvg(l.lpn) + '</div></div>';
  }
  function typeLabel(k) { var t = typeBy(k); return (t.en + " / " + t.es).toUpperCase(); }
  function printLabels(rows) {
    if (!rows || !rows.length) return;
    var css = '@page{size:4in 6in;margin:0}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000}' +
      '.lbl4x6{width:4in;height:6in;box-sizing:border-box;padding:.18in;page-break-after:always;display:flex;flex-direction:column;gap:6px;overflow:hidden}' +
      '.top{font-weight:800;font-size:14px;border-bottom:3px solid #000;padding-bottom:4px;letter-spacing:.5px}' +
      '.big{font-size:28px;font-weight:800;line-height:1.1}.lot{font-size:30px;font-weight:900;font-family:monospace;border:3px solid #000;padding:4px 6px;text-align:center;word-break:break-all}' +
      '.qty{font-size:30px;font-weight:900}.kv{font-size:15px}.alg{font-size:18px;font-weight:800;border:2px dashed #000;padding:3px 6px}' +
      '.hold{font-size:24px;font-weight:900;text-align:center;border:4px solid #000;padding:6px}table{width:100%;border-collapse:collapse;font-size:14px}td{border-bottom:1px solid #000;padding:2px 3px}' +
      '.bc{margin-top:auto;text-align:center}.bc svg{max-width:100%;height:auto}';
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>' + css + '</style></head><body>' + rows.map(labelHtml).join("") + '</body></html>';
    var w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to print labels"); return; }
    w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 350);
  }

  // ---- public API ---------------------------------------------------------------
  window.TRACE = {
    open: open, render: render,
    tab: function (t) { ST.tab = t; saveST(); W.msg = null; if (t !== "trace") {} load().then(render); },
    setOp: function (v) { rememberOp(v); render(); },
    recvType: recvType, recvExisting: recvExisting, recvSave: recvSave,
    qa: qaSet, qaScan: qaScan, qaIssue: qaIssue,
    setMixer: function (v) { ST.mixer = v; saveST(); render(); },
    mixFlavor: function (v) { W.mix.flavor = v; W.mix.prefix = v ? lastPrefixFor(v) : ""; render(); },
    mixPrefix: function (v) { W.mix.prefix = String(v || "").toUpperCase().trim(); render(); },
    mixScan: mixScan, mixBins: mixBins,
    mixUsed: function (i, v) { if (W.mix.inputs[i]) W.mix.inputs[i].used = v; },
    mixEmpty: function (i, b) { if (W.mix.inputs[i]) W.mix.inputs[i].empty = !!b; },
    mixRemove: function (i) { W.mix.inputs.splice(i, 1); render(); },
    mixNew: function () { W.mix = { flavor: "", prefix: "", inputs: [], bins: 1 }; render(); },
    setMachine: function (v) { ST.machine = v; saveST(); render(); },
    pmScan: pmScan, pmChange: pmChange, pmFinish: pmFinish, pmScrap: pmScrap,
    moveScan: moveScan, useDest: useDest, useScan: useScan,
    shipField: shipField, shipScan: shipScan, shipRemove: shipRemove, shipFinish: shipFinish,
    traceQ: traceQ, drill: drill, printEvidence: printEvidence,
    traceOf: function (lpn) { ST.tab = "trace"; W.trace.q = lpn; render(); },
    reprint: function (lpn) { var l = S.labels[lpn]; if (l) printLabels([l]); },
    lf: function (k, v) { W.labels[k] = v; render(); },
    // for testing / other modules
    _state: function () { return { mode: mode, labels: S.labels, events: S.events, W: W, ST: ST }; },
    _load: load, isoWeek: isoWeek, flavors: FLAVORS
  };

  // ---- nav + re-render protection (observer only, no timers) -------------------
  // Lives in the Quality (SQF) group, right under "Compliance / SQF". If the Quality group
  // is collapsed it hides with the group. If a role view hides Quality entirely (floor
  // stations: receiving, mixing, P-Mac), it goes at the top so every station can reach it.
  function qualityAnchor(nav) {
    var keys = ["compliance", "quality", "disposition"];
    for (var i = 0; i < keys.length; i++) { var b = nav.querySelector('.navitem[onclick*="UI_go(\'' + keys[i] + '\')"]'); if (b) return { btn: b, key: keys[i] }; }
    return null;
  }
  function qualityLabel(nav) {
    var labs = nav.querySelectorAll(".navlabel"), want = [T.en.grpQ, T.es.grpQ, "Qualidade"];
    for (var i = 0; i < labs.length; i++) { var t = labs[i].textContent || ""; for (var j = 0; j < want.length; j++) if (t.indexOf(want[j]) >= 0) return labs[i]; }
    return null;
  }
  function injectNav() {
    var nav = $("nav"); if (!nav || $("trc-nav")) return;
    var anc = qualityAnchor(nav);
    if (!anc && qualityLabel(nav)) return;   // Quality group is collapsed: stay hidden with it
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "trc-nav";
    btn.setAttribute("onclick", "TRACE.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="scan-barcode"></i><span>' + esc(L("navLbl")) + '</span>';
    if (anc && anc.key === "compliance") anc.btn.parentNode.insertBefore(btn, anc.btn.nextSibling);
    else if (anc) anc.btn.parentNode.insertBefore(btn, anc.btn);
    else nav.insertBefore(btn, nav.firstChild);
    if (ACTIVE) btn.classList.add("active");
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  // Leaving: any other nav click ends our view before the app renders its own.
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#nav .navitem") : null;
    if (t && t.id !== "trc-nav" && ACTIVE) { ACTIVE = false; }
  }, true);
  // Language switch re-renders the app; bring our view back in the new language.
  ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
    document.addEventListener("click", function (e) { if (e.target && e.target.id === id && ACTIVE) { setTimeout(render, 0); } }, false);
  });
  try {
    var mo = new MutationObserver(function () {
      injectNav();
      // A background app render wiped our view while it is active: redraw from memory once.
      if (ACTIVE) { var v = $("view"); if (v && !v.querySelector("#trc-root")) { markActive(); render(); } }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 500); });
  else setTimeout(injectNav, 500);
})();

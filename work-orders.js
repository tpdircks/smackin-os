/* ============================================================================
   Smackin' OS - Work Orders (work-orders.js)
   Standalone. Does not edit app.js. Replaces the static Production Orders
   screen when that route paints.

   Paper orders in production-orders.js stay on the page. They are not
   deleted and they are not bulk-copied into the database. A row is written
   only when someone saves status, bags done, or a new work order.

   Cloud record: public.production_orders (id text, data jsonb, created_at).
   That is the same table DB.addProdOrder already inserts. No new table.
   Stage also mirrors to kv_status key "po:<WO#>" so the older stage chip
   stays in step. Writes run only when DB.mode is cloud.

   If a save says production_orders does not exist, paste this once in the
   Supabase SQL editor. Do not run it when the table is already there.

   create table if not exists public.production_orders (
     id text primary key,
     data jsonb not null default '{}'::jsonb,
     created_at timestamptz not null default now()
   );

   Bags to make follows the Build Need rule already in the app:
     open cases minus cases on hand (Target + Master Case stock build)
     or the stock goal minus cases on hand, whichever is larger,
     times 72 bags per case.
   Open order bags is the sum of demand_lines.bags still Open. Shipped
   lines are ignored. Those numbers are not estimated.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var LS = "wo-live-v1";
  var BAGS_PER_CASE = 72;
  var STAGES = ["Open", "Mixing", "Labels", "Packaged", "P-Mac", "Done"];
  var TABS = ["active", "today", "completed", "all", "need"];
  var SB = [
    ["Target", "OG Original", 160],
    ["Target", "Cinnamon Churro", 160],
    ["Target", "Backyard BBQ", 160],
    ["Target", "Garlic Parmesan", 160],
    ["Target", "Dill Pickle", 160],
    ["Target", "Cheddar Jalapeno", 160],
    ["Target", "Ranch", 160],
    ["Master Case", "Garlic Parmesan", 480],
    ["Master Case", "OG Original", 180],
    ["Master Case", "Cracked Pepper", 150],
    ["Master Case", "Dill Pickle", 480],
    ["Master Case", "Cinnamon Churro", 480],
    ["Master Case", "Backyard BBQ", 480],
    ["Master Case", "Cheddar Jalapeno", 480],
    ["Master Case", "Ranch", 480],
    ["Master Case", "Sour Cream & Onion", 150],
    ["Master Case", "Maple Brown Sugar", 150],
    ["Master Case", "Lemon Pepper", 150]
  ].map(function (row) {
    return { cat: row[0], name: row[1], goal: row[2], key: sbKey(row[0], "", row[1]) };
  });

  var STR = {
    en: {
      title: "Work Orders",
      hint: "Work orders for Mixing and P-Mac. Bags to make come from open demand and on-hand. Paper orders stay under All until someone updates them here.",
      cloud: "Status and bags done save to the shared database.",
      local: "This browser is not on the shared database. Saves stay on this device.",
      loading: "Loading work orders...",
      active: "Active",
      today: "Today",
      completed: "Completed",
      all: "All",
      need: "Bags needed",
      search: "Search WO, flavor, or operator",
      new: "New work order",
      refresh: "Refresh",
      empty: "Nothing on this tab.",
      wo: "WO#",
      flavor: "Flavor",
      sku: "SKU",
      bagsNeed: "Bags needed",
      bagsDone: "Bags done",
      target: "Target date",
      status: "Status",
      operators: "Operators",
      demand: "Open customer need",
      progress: "Progress",
      save: "Save progress",
      back: "Back to list",
      saved: "Saved to the shared database.",
      savedLocal: "Saved on this device only.",
      saveFail: "Save failed",
      openWo: "Open work order",
      updateWo: "Update work order",
      useNeed: "Use bags to make",
      needHint: "Open order bags is the sum of demand lines still Open. Bags to make uses Build Need: open cases minus cases on hand, or the stock goal if that is higher, times 72 bags a case. Stock on hand is the Target and Master Case count.",
      openBags: "Open order bags",
      onHand: "On hand bags",
      toMake: "Bags to make",
      driverOrder: "order",
      driverStock: "stock",
      covered: "Covered",
      noNeed: "No open demand and no stock gap.",
      partner: "Partner",
      po: "PO",
      due: "Due",
      cases: "Cases",
      who: "Your name",
      paper: "Paper backup",
      live: "Live",
      instructions: "Instructions",
      mixing: "Mixing",
      pmac: "P-Mac",
      apply: "Put this bags-to-make number on the work order",
      needNow: "Demand now says",
      showing: "Showing",
      of: "of",
      more: "more lines",
      flavorNeed: "Flavor is required.",
      bagsBad: "Bags done has to be a number, zero or more.",
      seasLot: "Seasoning lot on file",
      seasVer: "Seasoning lot verified",
      seasHint: "Optional. Operator confirms the lot used matches the lot on file. This does not replace mixing-log lot recording."
    },
    es: {
      title: "Ordenes de trabajo",
      hint: "Ordenes de trabajo para Mezcla y P-Mac. Las bolsas a hacer salen de la demanda abierta y de lo que hay en mano. Las ordenes de papel siguen en Todas hasta que alguien las actualice aqui.",
      cloud: "El estado y las bolsas hechas se guardan en la base compartida.",
      local: "Este navegador no esta en la base compartida. Lo guardado se queda en este equipo.",
      loading: "Cargando ordenes de trabajo...",
      active: "Activas",
      today: "Hoy",
      completed: "Terminadas",
      all: "Todas",
      need: "Bolsas necesarias",
      search: "Buscar OT, sabor u operador",
      new: "Nueva orden",
      refresh: "Actualizar",
      empty: "Nada en esta pestana.",
      wo: "OT#",
      flavor: "Sabor",
      sku: "SKU",
      bagsNeed: "Bolsas necesarias",
      bagsDone: "Bolsas hechas",
      target: "Fecha meta",
      status: "Estado",
      operators: "Operadores",
      demand: "Necesidad del cliente abierta",
      progress: "Avance",
      save: "Guardar avance",
      back: "Volver a la lista",
      saved: "Guardado en la base compartida.",
      savedLocal: "Guardado solo en este equipo.",
      saveFail: "No se guardo",
      openWo: "Abrir orden",
      updateWo: "Actualizar orden",
      useNeed: "Usar bolsas a hacer",
      needHint: "Bolsas de pedidos abiertos es la suma de lineas de demanda aun Abiertas. Bolsas a hacer usa Build Need: cajas abiertas menos cajas en mano, o la meta de stock si es mayor, por 72 bolsas por caja. En mano es el conteo Target y Master Case.",
      openBags: "Bolsas de pedidos abiertos",
      onHand: "Bolsas en mano",
      toMake: "Bolsas a hacer",
      driverOrder: "pedido",
      driverStock: "stock",
      covered: "Cubierto",
      noNeed: "No hay demanda abierta ni falta de stock.",
      partner: "Cliente",
      po: "OC",
      due: "Vence",
      cases: "Cajas",
      who: "Su nombre",
      paper: "Respaldo en papel",
      live: "En vivo",
      instructions: "Instrucciones",
      mixing: "Mezcla",
      pmac: "P-Mac",
      apply: "Poner este numero de bolsas a hacer en la orden",
      needNow: "La demanda ahora dice",
      showing: "Mostrando",
      of: "de",
      more: "lineas mas",
      flavorNeed: "El sabor es obligatorio.",
      bagsBad: "Bolsas hechas tiene que ser un numero, cero o mas.",
      seasLot: "Lote de sazonador en archivo",
      seasVer: "Lote de sazonador verificado",
      seasHint: "Opcional. El operador confirma que el lote usado coincide con el lote en archivo. Esto no reemplaza el registro de lote en el registro de mezcla."
    },
    pt: {
      seasLot: "Lote de tempero no arquivo",
      seasVer: "Lote de tempero verificado",
      seasHint: "Opcional. O operador confirma que o lote usado confere com o lote no arquivo. Isto nao substitui o registro de lote no registro de mistura."
    }
  };

  var tab = "active";
  var query = "";
  var screen = "list";
  var draft = null;
  var orders = [];
  var needs = [];
  var cloudRows = [];
  var msg = "";
  var msgBad = false;
  var holding = false;
  var painting = false;
  var loading = false;
  var saving = false;
  var booted = false;
  var poll = null;

  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(key) {
    var pack = STR[lang()] || STR.en;
    if (pack[key] != null) return pack[key];
    return STR.en[key] || key;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function trim(s) { return String(s == null ? "" : s).trim(); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function fmt(v) {
    if (v == null || v === "") return "-";
    var n = Number(v);
    if (!isFinite(n)) return "-";
    return Math.round(n).toLocaleString("en-US");
  }
  function sbKey(cat, sub, name) {
    return (cat + "|" + (sub || "") + "|" + name).replace(/[^A-Za-z0-9]+/g, "_");
  }
  function isoDate(v) {
    var s = trim(v);
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    return "";
  }
  function mountainToday(now) {
    var dt = now instanceof Date ? now : new Date(now || Date.now());
    try {
      var fmtDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
      var parts = fmtDate.formatToParts(dt);
      var y = "", mo = "", day = "";
      parts.forEach(function (p) {
        if (p.type === "year") y = p.value;
        else if (p.type === "month") mo = p.value;
        else if (p.type === "day") day = p.value;
      });
      if (/^\d{4}$/.test(y) && /^\d{2}$/.test(mo) && /^\d{2}$/.test(day)) return y + "-" + mo + "-" + day;
    } catch (e) {}
    var z = dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2);
    return z;
  }
  function splitOps(v) {
    if (Array.isArray(v)) return v.map(trim).filter(Boolean);
    return String(v || "").split(/[,;/]+/).map(trim).filter(Boolean);
  }
  function stageOf(v) {
    var s = trim(v) || "Open";
    return STAGES.indexOf(s) >= 0 ? s : "Open";
  }
  function paperBags(p) {
    var a = num(p && p.pkgs4);
    var b = num(p && p.pkgs15);
    if (a == null && b == null) return null;
    return (a || 0) + (b || 0);
  }
  function blank(id) {
    return {
      id: id, wo: id, flavor: "", code: "", size: "",
      bags_needed: null, bags_done: 0, target_date: "", status: "Open",
      operators: [], demand: [], priority: "", mix_instr: "", pmac_instr: "",
      bins: "", source: "manual", live: false, fromCloud: false, localOnly: false,
      created_at: "", updated_at: "", updated_by: "", driver: "", open_bags: null,
      seasoning_lot_on_file: "", seasoning_lot_verified: ""
    };
  }
  function fromPaper(p, kvStage) {
    var id = trim(p && p.po);
    var row = blank(id);
    row.flavor = p.flavor || "";
    row.size = p.size || "";
    row.bags_needed = paperBags(p);
    row.target_date = isoDate(p.deadline) || isoDate(p.date) || "";
    row.status = stageOf(kvStage || "Open");
    row.priority = p.priority || "";
    row.mix_instr = p.mix_instr || "";
    row.pmac_instr = p.pmac_instr || "";
    row.bins = p.bins == null ? "" : p.bins;
    row.source = "paper";
    row.live = false;
    row.created_at = isoDate(p.date) || "";
    return row;
  }
  function overlay(base, obj, fromCloud) {
    var row = base || blank(trim(obj.wo || obj.po || obj.id));
    var id = trim(obj.wo || obj.po || row.id);
    if (id) { row.id = id; row.wo = id; }
    if (obj.flavor) row.flavor = obj.flavor;
    if (obj.code) row.code = obj.code;
    if (obj.size) row.size = obj.size;
    if (num(obj.bags_needed) != null) row.bags_needed = num(obj.bags_needed);
    if (num(obj.bags_done) != null) row.bags_done = num(obj.bags_done);
    if (isoDate(obj.target_date || obj.deadline)) row.target_date = isoDate(obj.target_date || obj.deadline);
    if (obj.status) row.status = stageOf(obj.status);
    if (obj.operators != null) row.operators = splitOps(obj.operators);
    if (Array.isArray(obj.demand)) row.demand = obj.demand;
    if (obj.priority) row.priority = obj.priority;
    if (obj.mix_instr) row.mix_instr = obj.mix_instr;
    if (obj.pmac_instr) row.pmac_instr = obj.pmac_instr;
    if (obj.bins != null && obj.bins !== "") row.bins = obj.bins;
    if (obj.source) row.source = obj.source;
    if (obj.driver) row.driver = obj.driver;
    if (num(obj.open_bags) != null) row.open_bags = num(obj.open_bags);
    if (obj.updated_at) row.updated_at = obj.updated_at;
    if (obj.updated_by) row.updated_by = obj.updated_by;
    if (obj.seasoning_lot_on_file != null) row.seasoning_lot_on_file = trim(obj.seasoning_lot_on_file);
    if (obj.seasoning_lot_verified != null) row.seasoning_lot_verified = (obj.seasoning_lot_verified === true || String(obj.seasoning_lot_verified).toUpperCase() === "Y") ? "Y" : "";
    if (obj.created_at && !row.created_at) row.created_at = obj.created_at;
    row.live = true;
    row.fromCloud = !!fromCloud;
    row.localOnly = !fromCloud;
    return row;
  }
  function asObj(v) {
    if (v == null || v === "") return null;
    if (typeof v === "string") {
      try { v = JSON.parse(v); } catch (e) { return null; }
    }
    return v && typeof v === "object" ? v : null;
  }
  function unwrap(raw) {
    if (!raw || typeof raw !== "object") return null;
    var data = asObj(raw.data);
    if (data && raw.flavor == null && raw.po == null && raw.wo == null) return data;
    if (data && !raw.flavor && !raw.po) return data;
    return data || raw;
  }
  function mergeOrders(paper, cloud, kv, localMap) {
    var map = {};
    (paper || []).forEach(function (p) {
      var id = trim(p && p.po);
      if (!id) return;
      var kvStage = kv && kv["po:" + id] != null ? kv["po:" + id] : null;
      map[id] = fromPaper(p, kvStage);
    });
    (cloud || []).forEach(function (raw) {
      var obj = unwrap(raw) || {};
      var id = trim((raw && raw.id) || obj.wo || obj.po);
      if (!id) return;
      map[id] = overlay(map[id], obj, true);
      if (raw && raw.created_at && !map[id].created_at) map[id].created_at = raw.created_at;
    });
    var local = localMap || {};
    Object.keys(local).forEach(function (id) {
      var loc = local[id];
      if (!loc) return;
      var cur = map[id];
      if (cur && cur.fromCloud) {
        var lu = String(loc.updated_at || "");
        var cu = String(cur.updated_at || "");
        if (lu && (!cu || lu > cu)) map[id] = overlay(cur, loc, false);
        return;
      }
      map[id] = overlay(cur, loc, false);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (r) { return r.id; });
  }
  function isActive(wo, today) {
    if (!wo || wo.status === "Done") return false;
    if (wo.live || wo.fromCloud) return true;
    if (wo.status !== "Open") return true;
    return !!(wo.target_date && wo.target_date >= today);
  }
  function isToday(wo, today) {
    if (!wo) return false;
    if (wo.target_date === today) return true;
    return String(wo.updated_at || "").slice(0, 10) === today;
  }
  function tabMatch(wo, which, today) {
    if (which === "all") return true;
    if (which === "completed") return wo.status === "Done";
    if (which === "today") return isToday(wo, today) && wo.status !== "Done";
    if (which === "active") return isActive(wo, today);
    return false;
  }
  function nextWoNumber(ids, today) {
    var prefix = String(today || "").replace(/-/g, ".");
    var n = 0;
    (ids || []).forEach(function (id) {
      id = String(id || "");
      if (id.indexOf(prefix) !== 0) return;
      var m = /-(\d+)$/.exec(id);
      if (m) n = Math.max(n, parseInt(m[1], 10) || 0);
    });
    var seq = String(n + 1);
    if (seq.length < 2) seq = "0" + seq;
    return prefix + "-" + seq;
  }
  function goalFor(flavor) {
    var n = 0;
    SB.forEach(function (i) { if (i.name === flavor) n += i.goal; });
    return n;
  }
  function onHandCases(flavor, stock) {
    var n = 0;
    stock = stock || {};
    SB.forEach(function (i) {
      if (i.name !== flavor) return;
      var row = stock[i.key] || {};
      n += Number(row.on_hand) || 0;
    });
    return n;
  }
  function buildNeed(lines, stock, opts) {
    opts = opts || {};
    var per = opts.bagsPerCase || BAGS_PER_CASE;
    var codeMap = opts.codeMap || {};
    var open = (lines || []).filter(function (r) {
      if (root.SPSMap && typeof root.SPSMap.countsForBuild === "function") return root.SPSMap.countsForBuild(r);
      return (r.status || "Open") === "Open";
    });
    var by = {};
    open.forEach(function (r) {
      var flavor = trim(r.flavor);
      if (!flavor) return;
      if (!by[flavor]) by[flavor] = { flavor: flavor, code: r.flavor_code || codeMap[flavor] || "", cases: 0, openBags: 0, lines: [] };
      var row = by[flavor];
      row.cases += Number(r.cases) || 0;
      row.openBags += Number(r.bags) || 0;
      if (!row.code && (r.flavor_code || codeMap[flavor])) row.code = r.flavor_code || codeMap[flavor] || "";
      row.lines.push({
        partner: r.partner || "",
        po: r.po || "",
        bags: Number(r.bags) || 0,
        cases: Number(r.cases) || 0,
        due: isoDate(r.due_date) || trim(r.due_date),
        code: r.flavor_code || ""
      });
    });
    var names = {};
    Object.keys(by).forEach(function (k) { names[k] = 1; });
    SB.forEach(function (i) { names[i.name] = 1; });
    var list = Object.keys(names).map(function (flavor) {
      var d = by[flavor] || { flavor: flavor, code: codeMap[flavor] || "", cases: 0, openBags: 0, lines: [] };
      var onHand = onHandCases(flavor, stock);
      var demandNeed = Math.max(0, d.cases - onHand);
      var stockNeed = Math.max(0, goalFor(flavor) - onHand);
      var toProduce = Math.max(demandNeed, stockNeed);
      var driver = toProduce <= 0 ? "" : (demandNeed >= stockNeed && demandNeed > 0 ? "order" : "stock");
      var dues = d.lines.map(function (l) { return l.due; }).filter(Boolean).sort();
      return {
        flavor: flavor,
        code: d.code || codeMap[flavor] || "",
        cases: d.cases,
        openBags: d.openBags,
        onHandCases: onHand,
        onHandBags: onHand * per,
        toProduce: toProduce,
        toProduceBags: toProduce * per,
        driver: driver,
        goalCases: goalFor(flavor),
        nextDue: dues[0] || "",
        lines: d.lines.slice().sort(function (a, b) { return String(a.due || "9999").localeCompare(String(b.due || "9999")); })
      };
    });
    list.sort(function (a, b) { return (b.toProduceBags - a.toProduceBags) || (b.openBags - a.openBags) || a.flavor.localeCompare(b.flavor); });
    return list;
  }
  function findNeed(flavor) {
    var n = norm(flavor);
    for (var i = 0; i < needs.length; i++) if (norm(needs[i].flavor) === n) return needs[i];
    return null;
  }
  function activeForFlavor(flavor) {
    var n = norm(flavor);
    var today = mountainToday(new Date());
    var hits = orders.filter(function (w) { return norm(w.flavor) === n && isActive(w, today); });
    hits.sort(function (a, b) { return String(b.updated_at || "").localeCompare(String(a.updated_at || "")); });
    return hits[0] || null;
  }

  function lsGet() {
    try {
      var v = root.localStorage.getItem(LS);
      var o = v ? JSON.parse(v) : {};
      return o && typeof o === "object" ? o : {};
    } catch (e) { return {}; }
  }
  function lsSet(map) {
    try { root.localStorage.setItem(LS, JSON.stringify(map)); } catch (e) {}
  }
  function kvMap() {
    var kv = {};
    if (!root.DB || !root.DB.kvGet) return kv;
    ordersConcatIds().forEach(function (id) {
      var v = null;
      try { v = root.DB.kvGet("po:" + id); } catch (e) { v = null; }
      if (v != null) kv["po:" + id] = v;
    });
    return kv;
  }
  function ordersConcatIds() {
    var ids = [];
    (root.PROD_ORDERS || []).forEach(function (p) { if (p && p.po) ids.push(String(p.po)); });
    cloudRows.forEach(function (r) {
      var obj = unwrap(r) || {};
      var id = (r && r.id) || obj.wo || obj.po;
      if (id) ids.push(String(id));
    });
    Object.keys(lsGet()).forEach(function (id) { ids.push(id); });
    return ids;
  }
  function rebuild() {
    var codes = (root.DEMAND && root.DEMAND.FLAVOR_CODES) || {};
    var lines = [];
    try { lines = root.DB && root.DB.demandLines ? root.DB.demandLines() : []; } catch (e) { lines = []; }
    var stock = {};
    try { stock = root.DB && root.DB.stockBuild ? root.DB.stockBuild() : {}; } catch (e2) { stock = {}; }
    needs = buildNeed(lines, stock, { codeMap: codes, bagsPerCase: (root.DEMAND && root.DEMAND.BAGS_PER_CASE) || BAGS_PER_CASE });
    orders = mergeOrders(root.PROD_ORDERS || [], cloudRows, kvMap(), lsGet());
    orders.forEach(function (w) {
      if (!w.code) {
        var hit = findNeed(w.flavor);
        if (hit && hit.code) w.code = hit.code;
      }
    });
    orders.sort(sortWo);
  }
  function sortWo(a, b) {
    var rank = { "P1-CRITICAL": 0, "P2-HIGH": 1, High: 1, "P3-WATCH": 2, Normal: 3 };
    var ra = rank[a.priority] == null ? 4 : rank[a.priority];
    var rb = rank[b.priority] == null ? 4 : rank[b.priority];
    if (ra !== rb) return ra - rb;
    var da = a.target_date || "9999";
    var db = b.target_date || "9999";
    if (da !== db) return da < db ? -1 : 1;
    return String(a.flavor || "").localeCompare(String(b.flavor || ""));
  }

  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!root.__woClient) {
      try {
        root.__woClient = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "work-orders-auth" }
        });
      } catch (e) { return null; }
    }
    return root.__woClient;
  }
  function cloudOn() {
    return !!(root.DB && root.DB.mode === "cloud" && client());
  }
  function toast(m) {
    if (!doc) return;
    var t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 4200);
  }
  function readCloud() {
    var sb = client();
    if (!sb) return Promise.resolve([]);
    var out = [];
    var from = 0;
    var page = 1000;
    function step() {
      return sb.from("production_orders").select("id,data,created_at").order("id", { ascending: true }).range(from, from + page - 1).then(function (res) {
        if (res && res.error) throw new Error(res.error.message || "read failed");
        var part = (res && res.data) || [];
        for (var i = 0; i < part.length; i++) out.push(part[i]);
        if (part.length < page || out.length >= 5000) return out;
        from += part.length;
        return step();
      });
    }
    return step();
  }
  function payloadOf(row, who) {
    var bagsNeeded = num(row.bags_needed);
    var bagsDone = num(row.bags_done);
    if (bagsDone == null) bagsDone = 0;
    return {
      kind: "work_order",
      live: true,
      po: row.id,
      wo: row.id,
      flavor: row.flavor || "",
      code: row.code || "",
      size: row.size || "",
      bags_needed: bagsNeeded,
      bags_done: bagsDone,
      target_date: isoDate(row.target_date) || "",
      status: stageOf(row.status),
      operators: splitOps(row.operators),
      demand: Array.isArray(row.demand) ? row.demand : [],
      priority: row.priority || "",
      mix_instr: row.mix_instr || "",
      pmac_instr: row.pmac_instr || "",
      bins: row.bins == null ? "" : row.bins,
      source: row.source || "manual",
      driver: row.driver || "",
      open_bags: num(row.open_bags),
      updated_at: new Date().toISOString(),
      updated_by: trim(who),
      created_at: row.created_at || new Date().toISOString(),
      seasoning_lot_on_file: trim(row.seasoning_lot_on_file),
      seasoning_lot_verified: (row.seasoning_lot_verified === true || String(row.seasoning_lot_verified || "").toUpperCase() === "Y") ? "Y" : ""
    };
  }
  function sameQty(a, b) {
    if (a == null || a === "") return b == null || b === "";
    return Number(a) === Number(b);
  }
  function readbackError(sent, got) {
    var data = (got && got.data) || got || {};
    if (String(got.id || data.po || "") !== String(sent.po)) return "Read-back failed: WO# mismatch";
    if (String(data.status || "") !== String(sent.status || "")) return "Read-back failed: status mismatch";
    if (!sameQty(data.bags_done, sent.bags_done)) return "Read-back failed: bags done mismatch";
    if (!sameQty(data.bags_needed, sent.bags_needed)) return "Read-back failed: bags needed mismatch";
    if (splitOps(data.operators).join("|") !== splitOps(sent.operators).join("|")) return "Read-back failed: operators mismatch";
    return "";
  }
  function saveCloud(payload) {
    var sb = client();
    var row = { id: payload.po, data: payload, created_at: payload.created_at };
    return sb.from("production_orders").upsert(row, { onConflict: "id" }).select("id,data,created_at").then(function (up) {
      if (up && up.error) throw new Error(up.error.message || "save failed");
      if (!up || !up.data || !up.data.length) throw new Error("Save failed: not confirmed");
      return sb.from("production_orders").select("id,data,created_at").eq("id", payload.po).limit(1);
    }).then(function (got) {
      if (got && got.error) throw new Error(got.error.message || "read-back failed");
      if (!got || !got.data || !got.data.length) throw new Error("Read-back failed: row not found");
      var err = readbackError(payload, got.data[0]);
      if (err) throw new Error(err);
      return got.data[0];
    });
  }
  function saveLocal(payload) {
    var map = lsGet();
    map[payload.po] = payload;
    lsSet(map);
  }
  function dropLocal(id) {
    var map = lsGet();
    if (!map[id]) return;
    delete map[id];
    lsSet(map);
  }
  function mirrorStage(id, status) {
    if (!root.DB || !root.DB.kvSet) return Promise.resolve();
    return Promise.resolve(root.DB.kvSet("po:" + id, status)).catch(function () {});
  }

  function styleOnce() {
    if (!doc || doc.getElementById("wo-style")) return;
    var s = doc.createElement("style");
    s.id = "wo-style";
    s.textContent = [
      "#wo-root .wo-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}",
      "#wo-root .wo-tabs button{font-size:14px;padding:8px 14px;border:1px solid var(--line,#d7dde6);background:#fff;border-radius:20px;cursor:pointer;font-weight:800;color:#243044;font-family:inherit}",
      "#wo-root .wo-tabs button.on{background:#04223B;color:#fff;border-color:#04223B}",
      "#wo-root .wo-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}",
      "#wo-root .wo-tools input[type=search],#wo-root .wo-grid input,#wo-root .wo-grid select{padding:8px 10px;border:1px solid rgba(128,128,128,.35);border-radius:8px;font:inherit}",
      "#wo-root .wo-tools input[type=search]{flex:1;min-width:180px}",
      "#wo-root .wo-msg{font-weight:700;margin:6px 0}",
      "#wo-root .wo-msg.bad{color:#B52024}",
      "#wo-root table.wo{width:100%;border-collapse:collapse}",
      "#wo-root table.wo th,#wo-root table.wo td{padding:8px 6px;text-align:left;border-bottom:1px solid rgba(128,128,128,.18);vertical-align:top}",
      "#wo-root table.wo tr.wo-row{cursor:pointer}",
      "#wo-root table.wo tr.wo-row:hover{background:rgba(0,109,182,.06)}",
      "#wo-root .wo-bar{height:8px;background:#e6ebf1;border-radius:6px;overflow:hidden;margin-top:4px}",
      "#wo-root .wo-bar span{display:block;height:100%;background:#1F3864}",
      "#wo-root .wo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}",
      "#wo-root .wo-grid label{display:block;font-size:12px;font-weight:800;margin-bottom:4px}",
      "#wo-root .wo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}",
      "#wo-root label.wo-check{display:flex;align-items:center;gap:8px;font-weight:800;margin:10px 0 0;min-height:44px}",
      "#wo-root label.wo-check input{width:auto;margin:0}",
      "#wo-root #wo-slot{max-width:420px}",
      "#wo-root .wo-stages{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}",
      "#wo-root .wo-stages button{font-weight:800}",
      "#wo-root .wo-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800;background:#eef3f8;color:#04223B}",
      "#wo-root .wo-pill.done{background:#e5f6ea;color:#0d6b32}",
      "#wo-root .wo-pill.run{background:#fff4e5;color:#9a5b00}",
      "#wo-root .right{text-align:right}"
    ].join("");
    doc.head.appendChild(s);
  }
  function pct(done, need) {
    if (need == null || need <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((Number(done) || 0) / need * 100)));
  }
  function pill(status) {
    var cls = status === "Done" ? "done" : (status === "Open" ? "" : "run");
    return '<span class="wo-pill ' + cls + '">' + esc(status) + "</span>";
  }
  function filtered() {
    var today = mountainToday(new Date());
    var q = query.trim().toLowerCase();
    return orders.filter(function (w) {
      if (!tabMatch(w, tab, today)) return false;
      if (!q) return true;
      var blob = [w.wo, w.flavor, w.code, w.status, (w.operators || []).join(" "), w.priority].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }
  function listHtml() {
    var rows = filtered();
    var cap = 80;
    var shown = rows.slice(0, cap);
    if (!shown.length) return '<p class="hint">' + esc(tx("empty")) + "</p>";
    var body = shown.map(function (w) {
      var p = pct(w.bags_done, w.bags_needed);
      var bar = p == null ? "" : '<div class="wo-bar"><span style="width:' + p + '%"></span></div>';
      return '<tr class="wo-row" data-wo="open" data-id="' + esc(w.id) + '">' +
        "<td><b>" + esc(w.wo) + "</b>" + (w.live ? "" : '<div class="hint">' + esc(tx("paper")) + "</div>") + "</td>" +
        "<td>" + esc(w.flavor || "-") + (w.code ? '<div class="hint">' + esc(w.code) + "</div>" : "") + "</td>" +
        '<td class="right">' + fmt(w.bags_needed) + "</td>" +
        '<td class="right"><b>' + fmt(w.bags_done) + "</b>" + bar + "</td>" +
        "<td>" + esc(w.target_date || "-") + "</td>" +
        "<td>" + pill(w.status) + "</td>" +
        "<td>" + esc((w.operators || []).join(", ") || "-") + "</td></tr>";
    }).join("");
    var note = rows.length > cap ? '<p class="hint">' + esc(tx("showing")) + " " + cap + " " + esc(tx("of")) + " " + rows.length + ".</p>" : "";
    return note + '<div class="tblwrap"><table class="wo"><thead><tr><th>' + esc(tx("wo")) + "</th><th>" + esc(tx("flavor")) +
      '</th><th class="right">' + esc(tx("bagsNeed")) + '</th><th class="right">' + esc(tx("bagsDone")) + "</th><th>" +
      esc(tx("target")) + "</th><th>" + esc(tx("status")) + "</th><th>" + esc(tx("operators")) + "</th></tr></thead><tbody>" +
      body + "</tbody></table></div>";
  }
  function needHtml() {
    var rows = needs.filter(function (r) { return r.toProduceBags > 0 || r.openBags > 0; });
    if (!rows.length) return '<p class="hint">' + esc(tx("noNeed")) + "</p>";
    var body = rows.map(function (r) {
      var existing = activeForFlavor(r.flavor);
      var btn = existing
        ? '<button type="button" class="ghost sm" data-wo="open" data-id="' + esc(existing.id) + '">' + esc(tx("updateWo")) + "</button>"
        : '<button type="button" class="primary sm" data-wo="from-need" data-flavor="' + esc(r.flavor) + '">' + esc(tx("openWo")) + "</button>";
      var driver = r.driver === "order" ? tx("driverOrder") : (r.driver === "stock" ? tx("driverStock") : tx("covered"));
      return "<tr><td><b>" + esc(r.flavor) + "</b>" + (r.code ? '<div class="hint">' + esc(r.code) + "</div>" : "") + "</td>" +
        '<td class="right">' + fmt(r.openBags) + "</td>" +
        '<td class="right">' + fmt(r.onHandBags) + "</td>" +
        '<td class="right"><b>' + fmt(r.toProduceBags) + "</b>" + '<div class="hint">' + esc(driver) + "</div></td>" +
        "<td>" + esc(r.nextDue || "-") + "</td><td>" + btn + "</td></tr>";
    }).join("");
    return '<p class="hint">' + esc(tx("needHint")) + "</p>" +
      '<div class="tblwrap"><table class="wo"><thead><tr><th>' + esc(tx("flavor")) + '</th><th class="right">' + esc(tx("openBags")) +
      '</th><th class="right">' + esc(tx("onHand")) + '</th><th class="right">' + esc(tx("toMake")) + "</th><th>" + esc(tx("due")) +
      "</th><th></th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  function demandTable(lines) {
    lines = lines || [];
    if (!lines.length) return '<p class="hint">-</p>';
    var cap = 8;
    var body = lines.slice(0, cap).map(function (r) {
      return "<tr><td>" + esc(r.partner || "-") + "</td><td><b>" + esc(r.po || "-") + "</b></td><td class=\"right\">" +
        fmt(r.bags) + "</td><td class=\"right\">" + fmt(r.cases) + "</td><td>" + esc(r.due || "-") + "</td></tr>";
    }).join("");
    var more = lines.length > cap ? '<p class="hint">' + (lines.length - cap) + " " + esc(tx("more")) + ".</p>" : "";
    return '<div class="tblwrap"><table class="wo"><thead><tr><th>' + esc(tx("partner")) + "</th><th>" + esc(tx("po")) +
      '</th><th class="right">' + esc(tx("openBags")) + '</th><th class="right">' + esc(tx("cases")) + "</th><th>" +
      esc(tx("due")) + "</th></tr></thead><tbody>" + body + "</tbody></table></div>" + more;
  }
  function flavorOptions(selected) {
    var names = {};
    needs.forEach(function (r) { if (r.flavor) names[r.flavor] = 1; });
    var rec = root.RECIPES || {};
    Object.keys(rec).forEach(function (k) { if (rec[k] && rec[k].name) names[rec[k].name] = 1; });
    if (selected) names[selected] = 1;
    return Object.keys(names).sort().map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === selected ? " selected" : "") + ">" + esc(name) + "</option>";
    }).join("");
  }
  function detailHtml() {
    var w = draft;
    if (!w) return "";
    var need = findNeed(w.flavor);
    var p = pct(w.bags_done, w.bags_needed);
    var bar = p == null ? "" : '<div class="wo-bar"><span style="width:' + p + '%"></span></div>';
    var stages = ["Open", "Mixing", "P-Mac", "Done"].map(function (s) {
      var on = w.status === s ? "primary" : "ghost";
      return '<button type="button" class="' + on + ' sm" data-wo="stage" data-status="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
    var statusOpts = STAGES.map(function (s) {
      return '<option value="' + esc(s) + '"' + (w.status === s ? " selected" : "") + ">" + esc(s) + "</option>";
    }).join("");
    var flavorField = w.fresh
      ? '<div><label>' + esc(tx("flavor")) + '</label><select id="wo-flavor">' + flavorOptions(w.flavor) + "</select></div>"
      : "<div><label>" + esc(tx("flavor")) + "</label><div><b>" + esc(w.flavor || "-") + "</b>" + (w.code ? " " + esc(w.code) : "") + "</div></div>";
    var banner = "";
    if (need && (need.toProduceBags > 0 || need.openBags > 0)) {
      banner = '<p class="hint">' + esc(tx("needNow")) + " <b>" + fmt(need.toProduceBags) + "</b> (" + esc(need.driver === "stock" ? tx("driverStock") : tx("driverOrder")) +
        '). <button type="button" class="ghost sm" data-wo="apply-need">' + esc(tx("apply")) + "</button></p>";
    }
    var instr = "";
    if (w.mix_instr || w.pmac_instr) {
      instr = "<h3>" + esc(tx("instructions")) + "</h3>" +
        (w.mix_instr ? "<p><b>" + esc(tx("mixing")) + ":</b> " + esc(w.mix_instr) + "</p>" : "") +
        (w.pmac_instr ? "<p><b>" + esc(tx("pmac")) + ":</b> " + esc(w.pmac_instr) + "</p>" : "");
    }
    return '<div class="card"><div class="wo-actions"><button type="button" class="ghost sm" data-wo="back">' + esc(tx("back")) + "</button></div>" +
      "<h2 style=\"margin:8px 0\">" + esc(tx("wo")) + " " + esc(w.wo) + "</h2>" +
      banner +
      '<div class="wo-grid">' + flavorField +
      "<div><label>" + esc(tx("sku")) + '</label><input id="wo-code" value="' + esc(w.code || "") + '"></div>' +
      "<div><label>" + esc(tx("bagsNeed")) + '</label><input id="wo-need" type="number" min="0" step="1" value="' + (w.bags_needed == null ? "" : esc(String(w.bags_needed))) + '"></div>' +
      "<div><label>" + esc(tx("bagsDone")) + '</label><input id="wo-done" type="number" min="0" step="1" value="' + esc(String(w.bags_done || 0)) + '"></div>' +
      "<div><label>" + esc(tx("target")) + '</label><input id="wo-date" type="date" value="' + esc(w.target_date || "") + '"></div>' +
      "<div><label>" + esc(tx("status")) + '</label><select id="wo-status">' + statusOpts + "</select></div>" +
      "<div><label>" + esc(tx("operators")) + '</label><input id="wo-ops" value="' + esc((w.operators || []).join(", ")) + '" placeholder="Leo, Wilson"></div>' +
      "<div><label>" + esc(tx("who")) + '</label><input id="wo-who" value="' + esc(w.updated_by || "") + '"></div></div>' +
      "<div><label>" + esc(tx("seasLot")) + '</label><input id="wo-slot" autocomplete="off" value="' + esc(w.seasoning_lot_on_file || "") + '"></div>' +
      '<label class="wo-check"><input type="checkbox" id="wo-sver"' + (w.seasoning_lot_verified === "Y" ? " checked" : "") + "> " + esc(tx("seasVer")) + "</label>" +
      '<p class="hint">' + esc(tx("seasHint")) + "</p>" +
      '<div class="wo-stages">' + stages + "</div>" +
      "<div><b>" + esc(tx("progress")) + "</b> " + (p == null ? "-" : p + "%") + bar + "</div>" +
      '<div class="wo-actions"><button type="button" class="primary" data-wo="save">' + esc(tx("save")) + "</button></div></div>" +
      '<div class="card"><h2 class="sub2">' + esc(tx("demand")) + "</h2>" + demandTable(w.demand && w.demand.length ? w.demand : (need ? need.lines : [])) + "</div>" +
      (instr ? '<div class="card">' + instr + "</div>" : "");
  }
  function headHtml() {
    var buttons = TABS.map(function (k) {
      return '<button type="button" class="' + (tab === k ? "on" : "") + '" data-wo="tab" data-tab="' + k + '">' + esc(tx(k === "need" ? "need" : k)) + "</button>";
    }).join("");
    var note = cloudOn() ? tx("cloud") : tx("local");
    var alert = msg ? '<p class="wo-msg' + (msgBad ? " bad" : "") + '">' + esc(msg) + "</p>" : "";
    var tools = screen === "list" ? '<div class="wo-tools">' +
      (tab === "need" ? "" : '<input id="wo-q" type="search" placeholder="' + esc(tx("search")) + '" value="' + esc(query) + '">') +
      '<button type="button" class="primary sm" data-wo="new">' + esc(tx("new")) + "</button>" +
      '<button type="button" class="ghost sm" data-wo="refresh">' + esc(tx("refresh")) + "</button></div>" : "";
    return '<div class="card"><h2 style="margin:0">' + esc(tx("title")) + "</h2><p class=\"hint\">" + esc(tx("hint")) + " " + esc(note) + "</p>" +
      '<div class="wo-tabs">' + buttons + "</div>" + tools + alert + "</div>";
  }
  function bodyHtml() {
    if (loading && !orders.length && !needs.length) return '<div class="card"><p class="hint">' + esc(tx("loading")) + "</p></div>";
    if (screen === "detail") return detailHtml();
    if (tab === "need") return '<div class="card">' + needHtml() + "</div>";
    return '<div class="card">' + listHtml() + "</div>";
  }
  function render() {
    var host = doc && doc.getElementById("wo-root");
    if (!host) return;
    painting = true;
    var focusQ = doc.activeElement && doc.activeElement.id === "wo-q";
    host.innerHTML = headHtml() + '<div id="wo-body">' + bodyHtml() + "</div>";
    painting = false;
    if (focusQ) {
      var q = doc.getElementById("wo-q");
      if (q) { q.focus(); try { q.setSelectionRange(query.length, query.length); } catch (e) {} }
    }
  }
  function readDraftFromDom() {
    if (!draft || !doc) return draft;
    var flavor = doc.getElementById("wo-flavor");
    var code = doc.getElementById("wo-code");
    var need = doc.getElementById("wo-need");
    var done = doc.getElementById("wo-done");
    var date = doc.getElementById("wo-date");
    var status = doc.getElementById("wo-status");
    var ops = doc.getElementById("wo-ops");
    var who = doc.getElementById("wo-who");
    var slot = doc.getElementById("wo-slot");
    var sver = doc.getElementById("wo-sver");
    if (flavor) draft.flavor = flavor.value || "";
    if (code) draft.code = trim(code.value);
    if (need) draft.bags_needed = need.value === "" ? null : num(need.value);
    if (done) draft.bags_done = done.value === "" ? 0 : num(done.value);
    if (date) draft.target_date = date.value || "";
    if (status) draft.status = stageOf(status.value);
    if (ops) draft.operators = splitOps(ops.value);
    if (who) draft.updated_by = trim(who.value);
    if (slot) draft.seasoning_lot_on_file = trim(slot.value);
    if (sver) draft.seasoning_lot_verified = sver.checked ? "Y" : "";
    var hit = findNeed(draft.flavor);
    if (hit) {
      draft.code = draft.code || hit.code || "";
      draft.demand = hit.lines || draft.demand;
      draft.driver = hit.driver || draft.driver;
      draft.open_bags = hit.openBags;
    }
    return draft;
  }
  function openId(id) {
    var hit = null;
    for (var i = 0; i < orders.length; i++) if (orders[i].id === id) hit = orders[i];
    if (!hit) return;
    draft = JSON.parse(JSON.stringify(hit));
    draft.fresh = false;
    screen = "detail";
    msg = "";
    render();
  }
  function openNeed(flavor) {
    var existing = activeForFlavor(flavor);
    if (existing) { openId(existing.id); return; }
    var row = findNeed(flavor);
    if (!row) return;
    var today = mountainToday(new Date());
    var id = nextWoNumber(orders.map(function (w) { return w.id; }), today);
    draft = blank(id);
    draft.fresh = true;
    draft.live = true;
    draft.flavor = row.flavor;
    draft.code = row.code || "";
    draft.bags_needed = row.toProduceBags;
    draft.target_date = row.nextDue || today;
    draft.demand = row.lines || [];
    draft.source = "need";
    draft.driver = row.driver || "";
    draft.open_bags = row.openBags;
    screen = "detail";
    msg = "";
    render();
  }
  function openNew(flavor) {
    var today = mountainToday(new Date());
    var id = nextWoNumber(orders.map(function (w) { return w.id; }), today);
    draft = blank(id);
    draft.fresh = true;
    draft.live = true;
    draft.flavor = flavor || "";
    draft.target_date = today;
    draft.source = flavor ? "need" : "manual";
    var hit = flavor ? findNeed(flavor) : null;
    if (hit) {
      draft.code = hit.code || "";
      draft.bags_needed = hit.toProduceBags;
      draft.demand = hit.lines || [];
      draft.driver = hit.driver || "";
      draft.open_bags = hit.openBags;
      draft.target_date = hit.nextDue || today;
      draft.source = "need";
    }
    screen = "detail";
    msg = "";
    render();
  }
  function rememberCloud(saved) {
    var id = saved.id;
    var idx = -1;
    for (var i = 0; i < cloudRows.length; i++) if (String(cloudRows[i].id) === String(id)) idx = i;
    if (idx >= 0) cloudRows[idx] = saved;
    else cloudRows.unshift(saved);
  }
  function saveDraft(nextStatus) {
    if (saving) return;
    readDraftFromDom();
    if (nextStatus) draft.status = stageOf(nextStatus);
    if (!trim(draft.flavor)) { msg = tx("flavorNeed"); msgBad = true; render(); return; }
    if (draft.bags_done == null || draft.bags_done < 0) { msg = tx("bagsBad"); msgBad = true; render(); return; }
    if (draft.bags_needed != null && draft.bags_needed < 0) { msg = tx("bagsBad"); msgBad = true; render(); return; }
    var payload = payloadOf(draft, draft.updated_by);
    saving = true;
    msg = "";
    var done = function (where) {
      saving = false;
      draft.fresh = false;
      draft.live = true;
      draft.fromCloud = where === "cloud";
      draft.localOnly = where !== "cloud";
      draft.updated_at = payload.updated_at;
      draft.status = payload.status;
      draft.bags_done = payload.bags_done;
      draft.bags_needed = payload.bags_needed;
      draft.operators = payload.operators;
      msg = where === "cloud" ? tx("saved") : tx("savedLocal");
      msgBad = false;
      rebuild();
      var again = null;
      for (var i = 0; i < orders.length; i++) if (orders[i].id === draft.id) again = orders[i];
      if (again) draft = JSON.parse(JSON.stringify(again));
      render();
      toast(msg);
    };
    var fail = function (e) {
      saving = false;
      saveLocal(payload);
      rebuild();
      msg = tx("saveFail") + ": " + (e && e.message ? e.message : "not saved");
      msgBad = true;
      render();
      toast(msg);
    };
    if (!cloudOn()) {
      saveLocal(payload);
      mirrorStage(payload.po, payload.status);
      done("local");
      return;
    }
    saveCloud(payload).then(function (saved) {
      dropLocal(payload.po);
      rememberCloud(saved);
      return mirrorStage(payload.po, payload.status);
    }).then(function () {
      done("cloud");
      if (root.DB && root.DB.refresh) {
        try { root.DB.refresh(); } catch (e) {}
      }
    }).catch(fail);
  }

  function load(silent) {
    if (!silent) loading = true;
    var job = cloudOn() ? readCloud() : Promise.resolve([]);
    return job.then(function (rows) {
      cloudRows = rows || [];
      loading = false;
      msgBad = false;
      if (!silent) msg = "";
      rebuild();
      if (doc && doc.getElementById("wo-root")) {
        var ae = doc.activeElement;
        var typing = silent && ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
        if (!typing) render();
      }
    }).catch(function (e) {
      loading = false;
      cloudRows = [];
      rebuild();
      msg = tx("saveFail") + ": " + (e && e.message ? e.message : "not loaded");
      msgBad = true;
      if (doc && doc.getElementById("wo-root")) render();
    });
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-wo]") : null;
    if (!t || !doc.getElementById("wo-root")) return;
    var act = t.getAttribute("data-wo");
    if (act === "tab") {
      tab = t.getAttribute("data-tab") || "active";
      if (TABS.indexOf(tab) < 0) tab = "active";
      screen = "list";
      draft = null;
      render();
      return;
    }
    if (act === "refresh") { load(false); return; }
    if (act === "new") { openNew(""); return; }
    if (act === "back") { screen = "list"; draft = null; render(); return; }
    if (act === "open") { openId(t.getAttribute("data-id") || ""); return; }
    if (act === "from-need") { openNeed(t.getAttribute("data-flavor") || ""); return; }
    if (act === "apply-need") {
      readDraftFromDom();
      var need = findNeed(draft && draft.flavor);
      if (need) draft.bags_needed = need.toProduceBags;
      render();
      return;
    }
    if (act === "stage") { saveDraft(t.getAttribute("data-status")); return; }
    if (act === "save") { saveDraft(null); return; }
  }
  function onInput(e) {
    if (!e.target || e.target.id !== "wo-q") return;
    query = e.target.value || "";
    var body = doc.getElementById("wo-body");
    if (!body || screen !== "list" || tab === "need") return;
    painting = true;
    body.innerHTML = '<div class="card">' + listHtml() + "</div>";
    painting = false;
  }
  function isProdOrdersHtml(html) {
    html = String(html || "");
    if (html.indexOf("wo-root") >= 0) return false;
    return html.indexOf("Allen's production orders to Mixing") >= 0 ||
      html.indexOf("New Production Order / Orden de Produccion") >= 0;
  }
  function isLegacy(view) {
    if (!view || view.querySelector("#wo-root")) return false;
    return isProdOrdersHtml(view.innerHTML || "");
  }
  function mount(view, prefill) {
    styleOnce();
    var bar = view.querySelector("#dept-backbar");
    view.innerHTML = '<div id="wo-root"></div>';
    if (bar) view.insertBefore(bar, view.firstChild);
    holding = true;
    screen = "list";
    tab = "active";
    loading = true;
    render();
    load(false).then(function () {
      if (prefill) openNeed(prefill);
    });
    if (!poll) {
      poll = setInterval(function () {
        if (doc.getElementById("wo-root") && cloudOn() && !saving && screen === "list") load(true);
      }, 20000);
    }
  }
  function onView() {
    if (painting || !doc) return;
    var view = doc.getElementById("view");
    if (!view) return;
    if (view.querySelector("#wo-root")) { holding = true; return; }
    if (!isLegacy(view)) { holding = false; return; }
    var pre = "";
    var sel = view.querySelector("#pn-flavor");
    if (sel && sel.value) pre = sel.value;
    painting = true;
    try { mount(view, pre); }
    finally { painting = false; }
  }
  function start() {
    if (!doc || booted) return;
    booted = true;
    doc.addEventListener("click", onClick);
    doc.addEventListener("input", onInput);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && doc.getElementById("wo-root")) setTimeout(render, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return holding || !!(doc && doc.getElementById("wo-root")); });
    var view = doc.getElementById("view");
    if (view && !view.__woObs) {
      view.__woObs = true;
      var obs = new MutationObserver(function () { onView(); });
      obs.observe(view, { childList: true });
    }
    onView();
  }
  if (doc) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
    else start();
  }

  var api = {
    BAGS_PER_CASE: BAGS_PER_CASE,
    STAGES: STAGES,
    sbKey: sbKey,
    SB: SB,
    mergeOrders: mergeOrders,
    tabMatch: tabMatch,
    isActive: isActive,
    isToday: isToday,
    buildNeed: buildNeed,
    nextWoNumber: nextWoNumber,
    paperBags: paperBags,
    isProdOrdersHtml: isProdOrdersHtml,
    payloadOf: payloadOf,
    readbackError: readbackError,
    goalFor: goalFor,
    onHandCases: onHandCases,
    mountainToday: mountainToday,
    SQL: "create table if not exists public.production_orders (\n  id text primary key,\n  data jsonb not null default '{}'::jsonb,\n  created_at timestamptz not null default now()\n);"
  };
  root.WORKORDERS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

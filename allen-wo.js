/* ============================================================================
   Smackin' OS - Allen shop work order (allen-wo.js)
   Standalone. Does not edit app.js. Prints Allen's bilingual mixing / P-Mac
   work order and lists the BATCH_SHEETS_v_8.4i WO Data history.

   Recipe amounts on this screen come from ALLEN_WO_DATA (Allen's Recipes
   tab), not from recipes.js planning rates. Disputed flavors show a
   PENDING CONFIRMATION flag and stay selectable so the shop can print them.

   New WOs use Allen's yymmdd-## numbers and save through the existing
   public.production_orders table (same path as work-orders.js) only when
   DB.mode is cloud. Offline, they stay in localStorage key wo-live-v1.
   Paper history is not bulk-copied into Supabase.
   ========================================================================== */
(function (root) {
  "use strict";
  var doc = root.document;
  var LS = "wo-live-v1";
  var STAGES = ["Open", "Mixing", "Labels", "Packaged", "P-Mac", "Done"];
  var PRIOS = ["P1-CRITICAL", "P2-HIGH", "P3-WATCH", "High", "Normal"];

  var screen = "list";
  var query = "";
  var selected = null;
  var draft = null;
  var msg = "";
  var msgBad = false;
  var holding = false;
  var painting = false;
  var saving = false;
  var booted = false;
  var extra = {};

  var STR = {
    en: {
      title: "Shop Work Order",
      hint: "Allen's printable mixing and P-Mac work order. History is the BATCH_SHEETS file through November 9, 2026. New orders save to the shared work-order table when this browser is on the cloud.",
      cloud: "New work orders save to the shared database.",
      local: "This browser is not on the shared database. New work orders stay on this device.",
      tabList: "Work orders",
      tabNew: "New work order",
      tabLots: "Lots",
      tabRef: "Packaging & suppliers",
      search: "Search WO, flavor, or code",
      new: "New work order",
      print: "Print",
      back: "Back to list",
      save: "Save work order",
      saved: "Saved to the shared database.",
      savedLocal: "Saved on this device only.",
      saveFail: "Save failed",
      empty: "No work orders match.",
      wo: "WO#",
      date: "Date",
      flavor: "Flavor",
      code: "Code",
      bins: "Bins",
      size: "Size",
      priority: "Priority",
      status: "Packaging",
      pending: "PENDING CONFIRMATION",
      pendingAsk: "Monica / Allen — confirm this recipe before treating the sheet rate as final.",
      warning: "Warning",
      notSelectable: "This flavor is not available for a new work order.",
      flavorNeed: "Pick a flavor that has an approved, complete recipe.",
      source: "Source: BATCH_SHEETS_v_8.4i as of 2026-11-09.",
      lotsHint: "Seasoning, seed, and maltodextrin lots from Allen's tracker tabs. Seasoning quantity is the Current Yes/No flag unless a tab recorded weight.",
      seeds: "Standard seed",
      lowSalt: "Low salt seed",
      sunrich: "Sunrich seed",
      malto: "Maltodextrin",
      seasoning: "Seasoning lots",
      current: "Current",
      suppliers: "Seasoning suppliers",
      packaging: "Packaging types",
      yieldNote: "Package counts use Allen's Calculate sheet: 1.5 oz 535/bin and 250/box, 2.75 oz 260/bin and 120/box, 4.0 oz 200/bin and 100/box, 25 boxes/pallet."
    },
    es: {
      title: "Orden de taller",
      hint: "Orden de trabajo imprimible de Allen para Mezcla y P-Mac. El historial sale de BATCH_SHEETS hasta el 9 de noviembre de 2026. Las ordenes nuevas se guardan en la tabla compartida cuando este navegador esta en la nube.",
      cloud: "Las ordenes nuevas se guardan en la base compartida.",
      local: "Este navegador no esta en la base compartida. Las ordenes nuevas se quedan en este equipo.",
      tabList: "Ordenes",
      tabNew: "Nueva orden",
      tabLots: "Lotes",
      tabRef: "Empaque y proveedores",
      search: "Buscar OT, sabor o codigo",
      new: "Nueva orden",
      print: "Imprimir",
      back: "Volver a la lista",
      save: "Guardar orden",
      saved: "Guardado en la base compartida.",
      savedLocal: "Guardado solo en este equipo.",
      saveFail: "No se guardo",
      empty: "No hay ordenes que coincidan.",
      wo: "OT#",
      date: "Fecha",
      flavor: "Sabor",
      code: "Codigo",
      bins: "Contenedores",
      size: "Tamano",
      priority: "Prioridad",
      status: "Empaque",
      pending: "PENDIENTE DE CONFIRMACION",
      pendingAsk: "Monica / Allen — confirmen esta receta antes de tratar la cantidad de la hoja como final.",
      warning: "Aviso",
      notSelectable: "Este sabor no esta disponible para una orden nueva.",
      flavorNeed: "Elija un sabor con receta completa y aprobada.",
      source: "Fuente: BATCH_SHEETS_v_8.4i al 9 de noviembre de 2026.",
      lotsHint: "Lotes de sazon, semilla y maltodextrina de las pestanas de Allen. La cantidad de sazon es Current Si/No salvo que la pestana tenga peso.",
      seeds: "Semilla estandar",
      lowSalt: "Semilla baja en sal",
      sunrich: "Semilla Sunrich",
      malto: "Maltodextrina",
      seasoning: "Lotes de sazon",
      current: "Actual",
      suppliers: "Proveedores de sazon",
      packaging: "Tipos de empaque",
      yieldNote: "Los paquetes usan la hoja Calculate de Allen: 1.5 oz 535/contenedor y 250/caja, 2.75 oz 260/contenedor y 120/caja, 4.0 oz 200/contenedor y 100/caja, 25 cajas/tarima."
    }
  };

  function data() { return root.ALLEN_WO_DATA || {}; }
  function lots() { return root.ALLEN_LOTS || {}; }
  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    if (es && es.classList.contains("active")) return "es";
    return "en";
  }
  function tx(k) {
    var pack = STR[lang()] || STR.en;
    return pack[k] != null ? pack[k] : (STR.en[k] || k);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function trim(s) { return String(s == null ? "" : s).trim(); }
  function num(v) {
    if (v == null || v === "") return null;
    if (typeof v === "string" && (v === "1/2" || v === "½")) return 0.5;
    if (typeof v === "string" && (v === "1/4" || v === "¼")) return 0.25;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function fmt(v) {
    var n = num(v);
    if (n == null) return "";
    if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toLocaleString("en-US");
    return (Math.round(n * 1000) / 1000).toLocaleString("en-US");
  }
  function dash(v) { return v == null || v === "" ? "—" : String(v); }
  function mountainToday(now) {
    var dt = now instanceof Date ? now : new Date(now || Date.now());
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(dt);
      var y = "", mo = "", day = "";
      parts.forEach(function (p) {
        if (p.type === "year") y = p.value;
        else if (p.type === "month") mo = p.value;
        else if (p.type === "day") day = p.value;
      });
      if (y && mo && day) return y + "-" + mo + "-" + day;
    } catch (e) {}
    return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2);
  }
  function rates() { return data().rates || {}; }
  function recipeOf(code) {
    var recs = data().recipes || {};
    if (code && recs[code]) return recs[code];
    return null;
  }
  function codeOf(code) {
    var list = data().codes || [];
    code = String(code || "").toUpperCase();
    for (var i = 0; i < list.length; i++) if (String(list[i].code || "").toUpperCase() === code) return list[i];
    return null;
  }
  function yieldLine(size, bins, storedPkgs) {
    var r = rates()[size];
    var b = num(bins);
    if (b == null) b = 0;
    var pkgs = storedPkgs != null && storedPkgs !== "" ? num(storedPkgs) : (r && b ? b * r.pkgs_per_bin : null);
    if (pkgs == null) {
      return { bins: bins || "", pkgs: "", boxes: "", pallets: "" };
    }
    var boxn = r ? r.pkgs_per_box : 0;
    var boxes = boxn ? Math.ceil(pkgs / boxn) : null;
    var pallets = boxes != null && r ? boxes / r.boxes_per_pallet : null;
    return { bins: bins == null ? "" : bins, pkgs: pkgs, boxes: boxes, pallets: pallets };
  }
  function totalBins(row) {
    var a = num(row && row.bins15) || 0;
    var b = num(row && row.bins275) || 0;
    var c = num(row && row.bins4) || 0;
    var sum = a + b + c;
    if (sum) return sum;
    return num(row && row.bins);
  }
  function scaleAmt(text, factor) {
    if (text == null || text === "") return "";
    if (!factor || factor === 1) return String(text);
    return String(text).replace(/(\d+(?:\.\d+)?)/g, function (_, n) {
      var x = Number(n) * factor;
      return String(Math.round(x * 1000) / 1000);
    });
  }
  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!root.__awoClient) {
      try {
        root.__awoClient = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "allen-wo-auth" }
        });
      } catch (e) { return null; }
    }
    return root.__awoClient;
  }
  function cloudOn() { return !!(root.DB && root.DB.mode === "cloud" && client()); }
  function toast(m) {
    if (!doc) return;
    var t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 4200);
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
  function paperIds() {
    return (data().work_orders || []).map(function (w) { return w.wo; });
  }
  function nextWoNumber(day) {
    var iso = day || mountainToday(new Date());
    var prefix = iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
    var n = 0;
    function consider(id) {
      id = String(id || "");
      if (id.indexOf(prefix + "-") !== 0) return;
      var m = /-(\d+)$/.exec(id);
      if (m) n = Math.max(n, parseInt(m[1], 10) || 0);
    }
    paperIds().forEach(consider);
    Object.keys(lsGet()).forEach(consider);
    Object.keys(extra).forEach(consider);
    (root.PROD_ORDERS || []).forEach(function (p) { if (p && p.po) consider(p.po); });
    var seq = String(n + 1);
    if (seq.length < 2) seq = "0" + seq;
    return prefix + "-" + seq;
  }
  function payloadOf(row, who) {
    var bins = totalBins(row);
    var y15 = yieldLine("1.5", row.bins15, row.pkgs15);
    var y275 = yieldLine("2.75", row.bins275, row.pkgs275);
    var y4 = yieldLine("4.0", row.bins4, row.pkgs4);
    var bags = (num(y15.pkgs) || 0) + (num(y275.pkgs) || 0) + (num(y4.pkgs) || 0);
    var sizes = [];
    if (num(row.bins15)) sizes.push("1.5 oz");
    if (num(row.bins275)) sizes.push("2.75 oz");
    if (num(row.bins4)) sizes.push("4.0 oz");
    return {
      kind: "work_order",
      live: true,
      po: row.wo,
      wo: row.wo,
      flavor: row.flavor || "",
      code: row.code || "",
      size: sizes.join(", ") || row.size || "",
      bags_needed: bags || null,
      bags_done: num(row.bags_done) || 0,
      target_date: row.deadline || row.date || "",
      status: STAGES.indexOf(row.status) >= 0 ? row.status : "Open",
      operators: [],
      demand: [],
      priority: row.priority || "",
      mix_instr: row.mix_instr || "",
      pmac_instr: row.pmac_instr || "",
      bins: bins == null ? "" : bins,
      bins15: row.bins15 || "",
      bins275: row.bins275 || "",
      bins4: row.bins4 || "",
      pkgs15: y15.pkgs,
      pkgs275: y275.pkgs,
      pkgs4: y4.pkgs,
      packaging: row.packaging || "",
      description: row.description || "",
      seed: row.seed || "",
      start: row.start || "",
      assigned_machines: row.assigned_machines || "",
      source: "allen-wo",
      format: "yymmdd",
      updated_at: new Date().toISOString(),
      updated_by: trim(who),
      created_at: row.created_at || new Date().toISOString()
    };
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
      var sent = payload;
      var data = got.data[0].data || {};
      if (String(got.data[0].id || data.po || "") !== String(sent.po)) throw new Error("Read-back failed: WO# mismatch");
      return got.data[0];
    });
  }
  function saveLocal(payload) {
    var map = lsGet();
    map[payload.po] = payload;
    lsSet(map);
  }
  function allOrders() {
    var map = {};
    (data().work_orders || []).forEach(function (w) {
      map[w.wo] = Object.assign({ source: "allen-sheet" }, w);
    });
    var local = lsGet();
    Object.keys(local).forEach(function (id) {
      var loc = local[id];
      if (!loc) return;
      map[id] = Object.assign({}, map[id] || {}, loc, { wo: id, source: loc.source || "local" });
    });
    Object.keys(extra).forEach(function (id) {
      map[id] = Object.assign({}, map[id] || {}, extra[id], { wo: id });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || "")) || String(b.wo || "").localeCompare(String(a.wo || ""));
    });
  }
  function findOrder(id) {
    var list = allOrders();
    for (var i = 0; i < list.length; i++) if (list[i].wo === id) return list[i];
    return null;
  }

  function styleOnce() {
    if (!doc || doc.getElementById("awo-style")) return;
    var s = doc.createElement("style");
    s.id = "awo-style";
    s.textContent = [
      "#awo-root{max-width:1100px}",
      "#awo-root .awo-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 14px}",
      "#awo-root .awo-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}",
      "#awo-root .awo-tabs button{border:1px solid #c9d3e0;background:#fff;border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer}",
      "#awo-root .awo-tabs button.on{background:#1F3864;color:#fff;border-color:#1F3864}",
      "#awo-root .awo-search{flex:1;min-width:200px;padding:8px 10px;border:1px solid #c9d3e0;border-radius:8px}",
      "#awo-root table.awo-table{width:100%;border-collapse:collapse;font-size:14px}",
      "#awo-root table.awo-table th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5b6b80;padding:8px 6px;border-bottom:1px solid #d7deea}",
      "#awo-root table.awo-table td{padding:8px 6px;border-bottom:1px solid #eef2f7;vertical-align:top}",
      "#awo-root table.awo-table tr{cursor:pointer}",
      "#awo-root table.awo-table tr:hover td{background:#f4f7fb}",
      "#awo-root .awo-flag{display:inline-block;margin-left:6px;background:#f6c343;color:#3a2a00;font-size:10px;font-weight:800;letter-spacing:.03em;padding:2px 6px;border-radius:4px;vertical-align:middle}",
      "#awo-root .awo-warn{display:inline-block;margin-left:6px;background:#FBE3E0;color:#7d1b12;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px}",
      "#awo-root .awo-banner{background:#FFF3CD;border:1px solid #f0d48a;color:#5a4300;border-radius:8px;padding:10px 12px;margin:0 0 12px;font-weight:700}",
      "#awo-root .awo-banner.bad{background:#FBE3E0;border-color:#e7b3ac;color:#7d1b12}",
      "#awo-root .awo-ok{background:#E0F4E8;border:1px solid #b7e0c6;color:#1d5631;border-radius:8px;padding:10px 12px;margin:0 0 12px}",
      "#awo-sheet{background:#fff;color:#111;border:2px solid #1F3864;padding:18px 20px 24px;font-size:13px;line-height:1.35}",
      "#awo-sheet h1{margin:0 0 4px;font-size:22px;letter-spacing:.04em;color:#1F3864}",
      "#awo-sheet .awo-sub{color:#5b6b80;margin:0 0 12px;font-size:12px}",
      "#awo-sheet .awo-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 12px;margin:0 0 12px}",
      "#awo-sheet .awo-field label{display:block;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1F3864}",
      "#awo-sheet .awo-field div,#awo-sheet .awo-field input{min-height:22px;border-bottom:1px solid #c9d3e0;padding:2px 0;font-weight:700}",
      "#awo-sheet .awo-field input{width:100%;border:0;border-bottom:1px solid #c9d3e0;outline:none;font:inherit;font-weight:700;background:transparent}",
      "#awo-sheet h3{margin:16px 0 8px;background:#1F3864;color:#fff;padding:6px 10px;font-size:13px;letter-spacing:.04em}",
      "#awo-sheet table{width:100%;border-collapse:collapse;margin:0 0 8px}",
      "#awo-sheet th,#awo-sheet td{border:1px solid #c9d3e0;padding:6px 8px;text-align:left}",
      "#awo-sheet th{background:#eef2f7;font-size:11px;text-transform:uppercase;letter-spacing:.03em}",
      "#awo-sheet .awo-blank{min-height:28px}",
      "#awo-sheet .awo-alg{font-weight:800;color:#9b1c1c}",
      "#awo-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:0 0 14px}",
      "#awo-form label{display:block;font-size:11px;font-weight:800;color:#1F3864;margin-bottom:4px}",
      "#awo-form input,#awo-form select,#awo-form textarea{width:100%;padding:8px;border:1px solid #c9d3e0;border-radius:8px;font:inherit}",
      "#awo-form textarea{min-height:72px;grid-column:1/-1}",
      "#awo-root .awo-wide{grid-column:1/-1}",
      "@media print{",
      " header,nav,#nav,#navBackdrop,#toast,.awo-noprint{display:none!important}",
      " body{background:#fff}",
      " #view,#awo-root{max-width:none;padding:0;margin:0}",
      " #awo-sheet{border-width:1px;padding:8px}",
      "}"
    ].join("");
    doc.head.appendChild(s);
  }

  function navHtml() {
    return '<div class="awo-tabs awo-noprint">' +
      btnTab("list", tx("tabList")) +
      btnTab("new", tx("tabNew")) +
      btnTab("lots", tx("tabLots")) +
      btnTab("ref", tx("tabRef")) +
      "</div>";
  }
  function btnTab(id, label) {
    return '<button type="button" class="' + (screen === id ? "on" : "") + '" data-awo-tab="' + id + '">' + esc(label) + "</button>";
  }
  function chrome(inner) {
    var cloud = cloudOn();
    return '<div id="awo-root"><div class="card">' +
      '<h2>' + esc(tx("title")) + "</h2>" +
      '<p class="muted">' + esc(tx("hint")) + "</p>" +
      '<p class="muted">' + esc(cloud ? tx("cloud") : tx("local")) + " " + esc(tx("source")) + "</p>" +
      navHtml() +
      (msg ? ('<div class="' + (msgBad ? "awo-banner bad" : "awo-ok") + '">' + esc(msg) + "</div>") : "") +
      inner +
      "</div></div>";
  }

  function renderList() {
    var q = query.toLowerCase();
    var rows = allOrders().filter(function (w) {
      if (!q) return true;
      return [w.wo, w.flavor, w.code, w.description, w.priority, w.packaging].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    var html = '<div class="awo-bar awo-noprint">' +
      '<input class="awo-search" id="awo-q" value="' + esc(query) + '" placeholder="' + esc(tx("search")) + '">' +
      '<button type="button" class="primary" data-awo-tab="new">' + esc(tx("new")) + "</button></div>";
    if (!rows.length) html += '<p class="muted">' + esc(tx("empty")) + "</p>";
    else {
      html += '<div style="overflow:auto"><table class="awo-table"><thead><tr>' +
        "<th>" + esc(tx("wo")) + "</th><th>" + esc(tx("date")) + "</th><th>" + esc(tx("flavor")) + "</th>" +
        "<th>" + esc(tx("bins")) + "</th><th>" + esc(tx("size")) + "</th><th>" + esc(tx("priority")) + "</th>" +
        "<th>" + esc(tx("status")) + "</th></tr></thead><tbody>";
      rows.forEach(function (w) {
        var rec = recipeOf(w.code);
        var flag = (rec && rec.pending_confirmation) || w.pending_confirmation;
        html += '<tr data-awo-open="' + esc(w.wo) + '"><td><b>' + esc(w.wo) + "</b>" +
          (flag ? '<span class="awo-flag">' + esc(tx("pending")) + "</span>" : "") +
          (rec && rec.flag ? '<span class="awo-warn">' + esc(tx("warning")) + "</span>" : "") +
          "</td><td>" + esc(w.date || "") + "</td><td>" + esc(w.flavor || "") +
          (w.code ? ' <span class="muted">' + esc(w.code) + "</span>" : "") +
          "</td><td>" + esc(fmt(totalBins(w)) || dash(w.bins)) + "</td><td>" + esc(w.size || "") +
          "</td><td>" + esc(w.priority || "") + "</td><td>" + esc(w.packaging || "") + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }
    return chrome(html);
  }

  function recipeBlock(row) {
    var rec = recipeOf(row.code) || {};
    var bins = totalBins(row);
    var factor = bins ? (bins / 2) : 1;
    var lines = [
      ["Flavor ID / ID de sabor", rec.code || row.code || ""],
      ["Name / Nombre", rec.name || row.flavor || ""],
      ["Seed type / Tipo de semilla", rec.seed_type || row.seed || ""],
      ["Seed / Semilla", rec.seed_lbs || "100 lbs"],
      ["Water / Agua", rec.water || ""],
      ["Oil / Aceite", rec.oil && String(rec.oil).toLowerCase() !== "none" ? rec.oil : "None"],
      ["Malt / Malta", rec.malt || "2 lbs"],
      ["Seasoning / Condimento", rec.seas_desc || ""],
      ["Vendor / Proveedor", rec.vendor || ""],
      ["Stevia", rec.stevia && String(rec.stevia).toLowerCase() !== "none" ? rec.stevia : "None"]
    ];
    var html = '<table><thead><tr><th></th><th>Per 1 batch / 2 bins</th>' +
      (factor !== 1 ? "<th>Scaled / Escala (" + esc(fmt(bins)) + " bins)</th>" : "") +
      "</tr></thead><tbody>";
    lines.forEach(function (pair) {
      html += "<tr><th>" + esc(pair[0]) + "</th><td>" + esc(pair[1]) + "</td>";
      if (factor !== 1) html += "<td>" + esc(scaleAmt(pair[1], factor)) + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    if (rec.notes || rec.change_note || rec.flag) {
      html += '<p><b>Notes / Notas:</b> ' + esc(rec.flag || rec.notes || "") +
        (rec.change_note ? " " + esc(rec.change_note) : "") + "</p>";
    }
    var cur = currentLotLine(row.code);
    if (cur) html += '<p><b>Seasoning lot on file / Lote de sazon:</b> ' + esc(cur) + "</p>";
    var malt = currentMalto();
    if (malt) html += '<p><b>Malto lot / Lote de malta:</b> ' + esc(malt) + "</p>";
    return html;
  }
  function currentLotLine(code) {
    var list = (lots().seasoning || []).filter(function (x) {
      return String(x.current || "").toLowerCase() === "yes" &&
        (String(x.flavor_id || "") === code || String(x.sheet_code || "") === code);
    });
    if (!list.length) return "";
    return list.map(function (x) {
      var bits = [x.supplier_lot, x.flavor_name, x.supplier, x.exp_date ? ("exp " + x.exp_date) : ""];
      if (x.components && x.components.length) {
        bits = x.components.map(function (c) { return [c.flavor_name, c.supplier_lot, c.supplier].filter(Boolean).join(" "); });
        return bits.join(" + ");
      }
      return bits.filter(Boolean).join(" · ");
    }).join("; ");
  }
  function currentMalto() {
    var list = lots().malto || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].current || "").toLowerCase() === "yes") {
        return [list[i].supplier_lot, list[i].flavor_name, list[i].exp_date ? ("exp " + list[i].exp_date) : ""].filter(Boolean).join(" · ");
      }
    }
    return "";
  }
  function sizeTable(row) {
    var rows = [
      ["1.5 oz", yieldLine("1.5", row.bins15, row.pkgs15)],
      ["2.75 oz", yieldLine("2.75", row.bins275, row.pkgs275)],
      ["4.0 oz", yieldLine("4.0", row.bins4, row.pkgs4)]
    ];
    var html = "<table><thead><tr><th>Size / Tamano</th><th>Bins / Contenedores</th><th>Target pkgs / Paquetes</th><th>Boxes / Cajas</th><th>Pallets / Tarimas</th></tr></thead><tbody>";
    rows.forEach(function (pair) {
      var y = pair[1];
      html += "<tr><td>" + pair[0] + "</td><td>" + esc(dash(y.bins)) + "</td><td>" + esc(fmt(y.pkgs) || "—") +
        "</td><td>" + esc(fmt(y.boxes) || "—") + "</td><td>" + esc(fmt(y.pallets) || "—") + "</td></tr>";
    });
    html += "</tbody></table><p class=\"muted\">" + esc(tx("yieldNote")) + "</p>";
    return html;
  }
  function sheetHtml(row) {
    var rec = recipeOf(row.code) || {};
    var cd = codeOf(row.code) || {};
    var pending = rec.pending_confirmation || row.pending_confirmation;
    var html = '<div id="awo-sheet">';
    html += "<h1>SMACKIN' WORK ORDER / ORDEN DE TRABAJO</h1>";
    html += '<p class="awo-sub">From / De: Allen Back · Mixing &amp; P-Mac</p>';
    if (pending) html += '<div class="awo-banner">' + esc(tx("pending")) + " — " + esc(rec.pending_reason || tx("pendingAsk")) + "</div>";
    if (rec.flag) html += '<div class="awo-banner bad">' + esc(tx("warning")) + ": " + esc(rec.flag) + "</div>";
    html += '<div class="awo-grid">';
    [
      ["WO# / OT#", row.wo],
      ["Date / Fecha", row.date],
      ["Start / Inicio", row.start],
      ["Deadline / Fecha limite", row.deadline],
      ["To / Para", row.to || "Mixing & P-Mac"],
      ["Priority / Prioridad", row.priority],
      ["Packaging / Empaque", row.packaging],
      ["Description / Descripcion", row.description]
    ].forEach(function (pair) {
      html += '<div class="awo-field"><label>' + esc(pair[0]) + "</label><div>" + esc(dash(pair[1])) + "</div></div>";
    });
    html += "</div>";
    html += "<h3>MIXING / MEZCLA</h3>";
    html += '<div class="awo-grid">';
    [
      ["Flavor / Sabor", row.flavor],
      ["Code / Codigo", row.code],
      ["Bins / Contenedores", fmt(totalBins(row)) || row.bins],
      ["Seed / Semilla", rec.seed_type || row.seed]
    ].forEach(function (pair) {
      html += '<div class="awo-field"><label>' + esc(pair[0]) + "</label><div>" + esc(dash(pair[1])) + "</div></div>";
    });
    html += '</div><p class="awo-alg">Allergens / Alergenos: ' +
      esc(dash(cd.allergens || rec.allergens || row.allergens)) +
      (cd.allergen_level || rec.allergen_level || row.allergen_level ? " (" + esc(cd.allergen_level || rec.allergen_level || row.allergen_level) + ")" : "") +
      "</p>";
    html += "<p><b>Instructions / Instrucciones</b></p><p>" + esc(row.mix_instr || "").replace(/\n/g, "<br>") + "</p>";
    html += '<table><thead><tr><th>Completed by / Completado por</th><th>Time / Hora</th><th>Bins mixed / Contenedores mezclados</th><th>Notes / Notas</th></tr></thead>';
    html += '<tbody><tr><td class="awo-blank"></td><td class="awo-blank"></td><td class="awo-blank"></td><td class="awo-blank"></td></tr></tbody></table>';
    html += "<h3>P-MAC</h3>" + sizeTable(row);
    html += "<p><b>P-Mac instructions / Instrucciones de P-Mac</b></p><p>" + esc(row.pmac_instr || "").replace(/\n/g, "<br>") + "</p>";
    html += '<div class="awo-field"><label>Assigned machines / Maquinas asignadas</label><div>' + esc(dash(row.assigned_machines)) + "</div></div>";
    html += '<table><thead><tr><th>Completed by / Completado por</th><th>Time / Hora</th><th>Packages made / Paquetes hechos</th><th>Notes / Notas</th></tr></thead>';
    html += '<tbody><tr><td class="awo-blank"></td><td class="awo-blank"></td><td class="awo-blank"></td><td class="awo-blank"></td></tr></tbody></table>';
    html += "<h3>RECIPE / RECETA (1 batch = 2 bins = 100 lb seed)</h3>" + recipeBlock(row);
    html += "</div>";
    return html;
  }
  function renderDetail() {
    var row = findOrder(selected) || {};
    var bar = '<div class="awo-bar awo-noprint">' +
      '<button type="button" data-awo-tab="list">' + esc(tx("back")) + "</button>" +
      '<button type="button" class="primary" data-awo-print="1">' + esc(tx("print")) + "</button></div>";
    return chrome(bar + sheetHtml(row));
  }
  function selectableCodes() {
    return (data().codes || []).filter(function (c) { return c.selectable; });
  }
  function blankDraft() {
    var today = mountainToday(new Date());
    return {
      date: today,
      wo: nextWoNumber(today),
      to: "Mixing & P-Mac",
      code: "",
      flavor: "",
      bins15: "",
      bins275: "",
      bins4: "",
      packaging: "Standard",
      priority: "P2-HIGH",
      start: today,
      deadline: "",
      description: "",
      mix_instr: "",
      pmac_instr: "",
      assigned_machines: "",
      seed: ""
    };
  }
  function applyFlavorToDraft() {
    if (!draft) return;
    var rec = recipeOf(draft.code) || {};
    var cd = codeOf(draft.code) || {};
    draft.flavor = rec.name || cd.name || draft.flavor;
    draft.seed = rec.seed_type || draft.seed;
  }
  function renderNew() {
    if (!draft) draft = blankDraft();
    applyFlavorToDraft();
    var rec = recipeOf(draft.code) || {};
    var opts = selectableCodes().map(function (c) {
      return '<option value="' + esc(c.code) + '"' + (draft.code === c.code ? " selected" : "") + ">" +
        esc(c.code + " — " + (c.name || "")) + "</option>";
    }).join("");
    var packs = (data().packaging || []).map(function (p) {
      return '<option value="' + esc(p.name) + '"' + (draft.packaging === p.name ? " selected" : "") + ">" + esc(p.name) + "</option>";
    }).join("");
    var prios = PRIOS.map(function (p) {
      return '<option value="' + p + '"' + (draft.priority === p ? " selected" : "") + ">" + p + "</option>";
    }).join("");
    var form = '<form id="awo-form" class="awo-noprint">' +
      '<div><label>Date / Fecha</label><input name="date" type="date" value="' + esc(draft.date || "") + '"></div>' +
      '<div><label>WO# / OT#</label><input name="wo" value="' + esc(draft.wo || "") + '" readonly></div>' +
      '<div class="awo-wide"><label>Flavor / Sabor</label><select name="code"><option value="">Select flavor</option>' + opts + "</select></div>" +
      '<div><label>1.5 oz bins</label><input name="bins15" value="' + esc(draft.bins15) + '"></div>' +
      '<div><label>2.75 oz bins</label><input name="bins275" value="' + esc(draft.bins275) + '"></div>' +
      '<div><label>4.0 oz bins</label><input name="bins4" value="' + esc(draft.bins4) + '"></div>' +
      '<div><label>Packaging / Empaque</label><select name="packaging">' + packs + "</select></div>" +
      '<div><label>Priority / Prioridad</label><select name="priority">' + prios + "</select></div>" +
      '<div><label>Start / Inicio</label><input name="start" type="date" value="' + esc(draft.start || "") + '"></div>' +
      '<div><label>Deadline / Fecha limite</label><input name="deadline" type="date" value="' + esc(draft.deadline || "") + '"></div>' +
      '<div><label>To / Para</label><input name="to" value="' + esc(draft.to || "") + '"></div>' +
      '<div><label>Description / Descripcion</label><input name="description" value="' + esc(draft.description || "") + '"></div>' +
      '<div class="awo-wide"><label>Assigned machines / Maquinas asignadas</label><input name="assigned_machines" value="' + esc(draft.assigned_machines || "") + '"></div>' +
      '<textarea name="mix_instr" placeholder="Mixing instructions / Instrucciones de mezcla">' + esc(draft.mix_instr || "") + "</textarea>" +
      '<textarea name="pmac_instr" placeholder="P-Mac instructions / Instrucciones de P-Mac">' + esc(draft.pmac_instr || "") + "</textarea>" +
      '<div class="awo-wide"><button type="submit" class="primary">' + esc(tx("save")) + "</button> " +
      '<button type="button" data-awo-print="1">' + esc(tx("print")) + "</button></div></form>";
    if (rec.pending_confirmation) form += '<div class="awo-banner">' + esc(tx("pending")) + " — " + esc(rec.pending_reason || tx("pendingAsk")) + "</div>";
    if (rec.flag) form += '<div class="awo-banner bad">' + esc(rec.flag) + "</div>";
    return chrome(form + sheetHtml(draft));
  }
  function readForm(form) {
    if (!form || !draft) return;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      draft[el.name] = el.value;
    });
    if (draft.date && draft.date !== (draft._dateUsed || "")) {
      draft.wo = nextWoNumber(draft.date);
      draft._dateUsed = draft.date;
    }
    applyFlavorToDraft();
  }
  function lotTable(title, rows, cols) {
    if (!rows || !rows.length) return "<h3>" + esc(title) + "</h3><p class=\"muted\">None</p>";
    var html = "<h3>" + esc(title) + " (" + rows.length + ")</h3><div style=\"overflow:auto\"><table class=\"awo-table\"><thead><tr>";
    cols.forEach(function (c) { html += "<th>" + esc(c[1]) + "</th>"; });
    html += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html += "<tr>";
      cols.forEach(function (c) { html += "<td>" + esc(r[c[0]] == null ? "" : r[c[0]]) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }
  function renderLots() {
    var q = query.toLowerCase();
    var seas = (lots().seasoning || []).filter(function (r) {
      if (!q) return true;
      return [r.flavor_id, r.sheet_code, r.flavor_name, r.supplier_lot, r.supplier].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    var html = '<div class="awo-bar awo-noprint"><input class="awo-search" id="awo-q" value="' + esc(query) + '" placeholder="' + esc(tx("search")) + '"></div>';
    html += '<p class="muted">' + esc(tx("lotsHint")) + "</p>";
    html += lotTable(tx("seasoning"), seas, [
      ["flavor_id", "Flavor"], ["seas_code", "Code"], ["code_date", "Code date"],
      ["supplier_lot", "Supplier lot"], ["exp_date", "Exp"], ["flavor_name", "Name"],
      ["supplier", "Supplier"], ["qty", "Qty"], ["current", "On hand"], ["status", "Status"]
    ]);
    html += lotTable(tx("seeds"), lots().seeds_standard || [], [
      ["lot", "Lot"], ["code", "Code"], ["start_use", "Start use"], ["pallet_count", "Pallets"],
      ["bag_count", "Bags"], ["ship_date", "Ship date"], ["comments", "Comments"]
    ]);
    html += lotTable(tx("lowSalt"), lots().seeds_low_salt || [], [
      ["lot", "Lot"], ["code", "Code"], ["start_use", "Start use"], ["pallet_count", "Pallets"],
      ["bag_count", "Bags"], ["company", "Company"], ["ship_date", "Ship date"]
    ]);
    html += lotTable(tx("sunrich"), lots().seeds_sunrich || [], [
      ["lot", "Lot"], ["code", "Code"], ["date", "Date"], ["size", "Size"], ["company", "Company"]
    ]);
    html += lotTable(tx("malto"), lots().malto || [], [
      ["seas_code", "Code"], ["code_date", "Code date"], ["supplier_lot", "Supplier lot"],
      ["exp_date", "Exp"], ["flavor_name", "Name"], ["supplier", "Supplier"], ["current", "Current"]
    ]);
    return chrome(html);
  }
  function renderRef() {
    var html = "<h3>" + esc(tx("packaging")) + "</h3><table class=\"awo-table\"><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>";
    (data().packaging || []).forEach(function (p) {
      html += "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.description || "") + "</td></tr>";
    });
    html += "</tbody></table><h3>" + esc(tx("suppliers")) + "</h3><ul>";
    (data().suppliers || []).forEach(function (s) { html += "<li>" + esc(s) + "</li>"; });
    html += "</ul>";
    return chrome(html);
  }
  function render() {
    if (!doc) return;
    styleOnce();
    var view = doc.getElementById("view");
    if (!view) return;
    holding = true;
    painting = true;
    var html = "";
    try {
      if (screen === "detail") html = renderDetail();
      else if (screen === "new") html = renderNew();
      else if (screen === "lots") html = renderLots();
      else if (screen === "ref") html = renderRef();
      else html = renderList();
      view.innerHTML = html + '<span id="awo-active" style="display:none"></span>';
    } finally {
      painting = false;
    }
    markNav();
    try { if (root.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  function markNav() {
    var nav = doc.getElementById("nav");
    if (!nav) return;
    nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
    var mine = doc.getElementById("awo-nav");
    if (mine) mine.classList.add("active");
  }
  function injectNav() {
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("awo-nav")) return;
    var anchor = doc.getElementById("btr-nav") || doc.getElementById("mfg-hist-nav");
    if (!anchor) {
      var items = nav.querySelectorAll("button.navitem, [onclick]");
      for (var i = 0; i < items.length; i++) {
        var oc = items[i].getAttribute("onclick") || "";
        if (oc.indexOf("pmacout") >= 0 || oc.indexOf("UI_go('mixing')") >= 0) { anchor = items[i]; break; }
      }
    }
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "awo-nav";
    btn.innerHTML = '<i class="navico" data-lucide="clipboard-pen"></i><span>Shop Work Order</span>';
    btn.addEventListener("click", function (ev) { if (ev) ev.preventDefault(); open(); });
    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      else anchor.parentNode.appendChild(btn);
    } else nav.appendChild(btn);
    try { if (root.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  function ensureData(done) {
    if (root.ALLEN_WO_DATA) { done(); return; }
    var existing = doc.querySelector("script[data-allen-wo-data]");
    function finish() { done(); }
    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", finish);
      return;
    }
    var s = doc.createElement("script");
    s.src = "allen-wo-data.js?b=1";
    s.setAttribute("data-allen-wo-data", "1");
    s.onload = finish;
    s.onerror = finish;
    (doc.body || doc.documentElement).appendChild(s);
  }
  function open(opts) {
    opts = opts || {};
    screen = opts.screen || "list";
    selected = opts.wo || null;
    if (opts.screen === "new") draft = blankDraft();
    if (selected) screen = "detail";
    msg = "";
    msgBad = false;
    try {
      var n = doc.getElementById("nav"), bd = doc.getElementById("navBackdrop");
      if (n) n.classList.remove("open");
      if (bd) bd.classList.remove("show");
    } catch (e) {}
    ensureData(function () { render(); });
  }
  function onClick(ev) {
    if (!doc.getElementById("awo-root")) return;
    var t = ev.target;
    if (!t) return;
    var tab = t.getAttribute && t.getAttribute("data-awo-tab");
    if (!tab && t.closest) {
      var b = t.closest("[data-awo-tab]");
      if (b) tab = b.getAttribute("data-awo-tab");
    }
    if (tab) {
      ev.preventDefault();
      screen = tab;
      if (tab === "new" && !draft) draft = blankDraft();
      if (tab !== "detail") selected = null;
      render();
      return;
    }
    var openId = t.getAttribute && t.getAttribute("data-awo-open");
    if (!openId && t.closest) {
      var tr = t.closest("[data-awo-open]");
      if (tr) openId = tr.getAttribute("data-awo-open");
    }
    if (openId) {
      ev.preventDefault();
      selected = openId;
      screen = "detail";
      render();
      return;
    }
    if (t.getAttribute && t.getAttribute("data-awo-print")) {
      ev.preventDefault();
      root.print();
    }
  }
  function onInput(ev) {
    if (!doc.getElementById("awo-root")) return;
    if (ev.target && ev.target.id === "awo-q") {
      query = ev.target.value || "";
      var pos = ev.target.selectionStart;
      render();
      var el = doc.getElementById("awo-q");
      if (el) {
        el.focus();
        try { el.setSelectionRange(pos, pos); } catch (err) {}
      }
      return;
    }
    if (ev.target && ev.target.form && ev.target.form.id === "awo-form") {
      readForm(ev.target.form);
      var sheet = doc.getElementById("awo-sheet");
      if (sheet) {
        var wrap = doc.createElement("div");
        wrap.innerHTML = sheetHtml(draft);
        sheet.parentNode.replaceChild(wrap.firstChild, sheet);
      }
      var woInput = ev.target.form.elements.wo;
      if (woInput && draft.wo) woInput.value = draft.wo;
    }
  }
  function onSubmit(ev) {
    if (!ev.target || ev.target.id !== "awo-form") return;
    ev.preventDefault();
    if (saving) return;
    readForm(ev.target);
    if (!draft.code || !recipeOf(draft.code) || (recipeOf(draft.code) && recipeOf(draft.code).selectable === false)) {
      msg = tx("flavorNeed");
      msgBad = true;
      render();
      return;
    }
    var who = "";
    try { who = (root.DB && root.DB.currentUser && (root.DB.currentUser.name || root.DB.currentUser.email)) || ""; } catch (e) { who = ""; }
    var payload = payloadOf(draft, who);
    saving = true;
    function doneOk(localOnly) {
      saving = false;
      extra[payload.po] = Object.assign({}, draft, payload);
      selected = payload.po;
      screen = "detail";
      draft = null;
      msg = localOnly ? tx("savedLocal") : tx("saved");
      msgBad = false;
      toast(msg);
      render();
    }
    function doneErr(err) {
      saving = false;
      msg = tx("saveFail") + (err && err.message ? ": " + err.message : "");
      msgBad = true;
      render();
    }
    if (cloudOn()) {
      saveCloud(payload).then(function () {
        saveLocal(payload);
        if (root.DB && root.DB.kvSet) {
          try { root.DB.kvSet("po:" + payload.po, payload.status || "Open"); } catch (e) {}
        }
        doneOk(false);
      }).catch(doneErr);
    } else {
      saveLocal(payload);
      doneOk(true);
    }
  }
  function start() {
    if (!doc || booted) return;
    booted = true;
    doc.addEventListener("click", onClick);
    doc.addEventListener("input", onInput);
    doc.addEventListener("change", onInput);
    doc.addEventListener("submit", onSubmit);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && doc.getElementById("awo-root")) setTimeout(render, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return holding || !!(doc && doc.getElementById("awo-active")); });
    try {
      var mo = new MutationObserver(function () { injectNav(); });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 300); });
    else setTimeout(injectNav, 300);
  }
  if (doc) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
    else start();
  }

  var api = {
    open: open,
    openWo: function (id) { open({ wo: id }); },
    print: function () { root.print(); },
    nextWoNumber: nextWoNumber,
    yieldLine: yieldLine,
    payloadOf: payloadOf,
    recipeOf: recipeOf
  };
  root.ALLENWO = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

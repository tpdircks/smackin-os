/* ============================================================================
   Inventory returns (returns-workflow.js)
   Adriana (Inventory) owns disposition. Receiving keeps a shortcut to this
   same screen. One write path: returns_log plus the stock move recorded on
   the row. Hold lands in RETURNS-HOLD and is not available. Release lands
   in RECEIVING. Scrap and Other with no destination do not increase on-hand.
   Delete and edit reverse the stock move this row recorded.
   Legacy Restock rows are left in place. The RETURNS location cleanup list
   is read-only. Nothing here moves that contamination.
   ========================================================================== */
(function (root) {
  "use strict";

  var CONDITIONS = ["Sealed / sellable", "Damaged", "Expired / short-dated", "Opened"];
  var DISPS = ["Hold", "Release", "Scrap", "Other"];
  var OPS = ["Adriana", "Jesus", "Edgar", "Marlin", "Javier", "Ken", "Troy"];
  var HOLD_LOC = { "RETURNS-HOLD": 1, "QUARANTINE": 1, "QA-HOLD": 1 };
  var SCHEMA_SQL = [
    "alter table public.returns_log",
    "  add column if not exists status text,",
    "  add column if not exists inspected_by text,",
    "  add column if not exists inspected_at timestamptz,",
    "  add column if not exists disposed_at timestamptz,",
    "  add column if not exists stock_item_id text,",
    "  add column if not exists stock_qty numeric,",
    "  add column if not exists stock_loc text,",
    "  add column if not exists stock_moves jsonb,",
    "  add column if not exists qty_hold numeric,",
    "  add column if not exists qty_release numeric,",
    "  add column if not exists qty_scrap numeric,",
    "  add column if not exists qty_other numeric;",
    "",
    "notify pgrst, 'reload schema';",
    "",
    "-- Do not update stock from this script.",
    "-- RETURNS rows stay where they are until Adriana confirms a cleanup."
  ].join("\n");

  var I18N = {
    en: {
      title: "Returns",
      own: "Inventory owns disposition. Adriana can Hold, Release to stock, Scrap, or Other in one step. Receiving can open this same screen from the dock.",
      avail: "Available",
      held: "Held",
      legacy: "Still in RETURNS",
      availNote: "Available is on-hand minus RETURNS-HOLD, QUARANTINE, and QA-HOLD. Held is not sellable. The RETURNS location still counts as on-hand until Adriana confirms a cleanup. New releases go to RECEIVING, not RETURNS.",
      log: "Log a return",
      open: "Open returns",
      history: "Returns log",
      cleanup: "RETURNS location (do not auto-clean)",
      hold: "Hold",
      release: "Release to stock",
      scrap: "Scrap",
      other: "Other",
      condition: "Condition",
      notes: "Notes",
      dest: "Stock destination",
      destNone: "No stock change",
      save: "Log return",
      needCond: "Condition is required.",
      needNotes: "Other needs notes.",
      needItems: "Add at least one item and a qty.",
      needDisp: "Pick Hold, Release, Scrap, or Other.",
      schema: "The shared returns log is missing the disposition columns. Troy can run this once in the Supabase SQL editor. Nothing was written.",
      noItem: "That SKU is not a tracked item, so stock was not changed.",
      doneHold: "Held in RETURNS-HOLD. Not available.",
      doneRelease: "Released to RECEIVING. Available.",
      doneScrap: "Scrapped. On-hand was not increased.",
      doneOther: "Logged as Other.",
      doneOtherStock: "Other, stock placed.",
      reversed: "Return removed and its stock move was reversed.",
      shortStop: "Those units are no longer all in the recorded location. Nothing was changed.",
      delShort: "Log removed. Only the units still in the recorded location were taken back out.",
      cleanupNote: "Live qty sitting in RETURNS. This is not a stock adjustment. Count corrections no longer write to RETURNS, QUARANTINE, QA-HOLD, or RETURNS-HOLD. Adriana has to confirm which of these rows are real returns and which are bad count loads before anyone moves them."
    },
    es: {
      title: "Devoluciones",
      own: "Inventario decide el destino. Adriana puede Retener, Liberar a stock, Desechar u Otro en un solo paso. Recibo abre esta misma pantalla.",
      avail: "Disponible",
      held: "Retenido",
      legacy: "Sigue en RETURNS",
      availNote: "Disponible es existencia menos RETURNS-HOLD, QUARANTINE y QA-HOLD. Lo retenido no se vende. RETURNS sigue contando en existencia hasta que Adriana confirme una limpieza. Una liberacion nueva va a RECEIVING, no a RETURNS.",
      log: "Registrar devolucion",
      open: "Devoluciones abiertas",
      history: "Registro",
      cleanup: "Ubicacion RETURNS (no limpiar solo)",
      hold: "Retener",
      release: "Liberar a stock",
      scrap: "Desechar",
      other: "Otro",
      condition: "Condicion",
      notes: "Notas",
      dest: "Destino de stock",
      destNone: "Sin cambio de stock",
      save: "Registrar devolucion",
      needCond: "La condicion es obligatoria.",
      needNotes: "Otro necesita notas.",
      needItems: "Agregue un item y una cantidad.",
      needDisp: "Elija Retener, Liberar, Desechar u Otro.",
      schema: "Faltan columnas de destino en el registro. Troy puede correr este SQL una vez en Supabase. No se escribio nada.",
      noItem: "Ese SKU no es un item rastreado, asi que el stock no cambio.",
      doneHold: "Retenido en RETURNS-HOLD. No disponible.",
      doneRelease: "Liberado a RECEIVING. Disponible.",
      doneScrap: "Desechado. La existencia no subio.",
      doneOther: "Registrado como Otro.",
      doneOtherStock: "Otro, con stock colocado.",
      reversed: "Devolucion eliminada y su movimiento de stock fue revertido.",
      shortStop: "Esas unidades ya no estan todas en la ubicacion registrada. No se cambio nada.",
      delShort: "Registro eliminado. Solo salieron las unidades que aun estaban en la ubicacion registrada.",
      cleanupNote: "Cantidad viva en RETURNS. No es un ajuste. Los conteos ya no escriben en RETURNS, QUARANTINE, QA-HOLD ni RETURNS-HOLD. Adriana confirma que filas son devoluciones reales antes de moverlas."
    },
    pt: {
      title: "Devolucoes",
      own: "Estoque decide o destino. Adriana pode Reter, Liberar para estoque, Descartar ou Outro num passo. Recebimento abre a mesma tela.",
      avail: "Disponivel",
      held: "Retido",
      legacy: "Ainda em RETURNS",
      availNote: "Disponivel e a quantidade menos RETURNS-HOLD, QUARANTINE e QA-HOLD. O retido nao vende. RETURNS continua na quantidade ate Adriana confirmar a limpeza. Liberacao nova vai para RECEIVING, nao para RETURNS.",
      log: "Registrar devolucao",
      open: "Devolucoes abertas",
      history: "Registro",
      cleanup: "Local RETURNS (nao limpar sozinho)",
      hold: "Reter",
      release: "Liberar para estoque",
      scrap: "Descartar",
      other: "Outro",
      condition: "Condicao",
      notes: "Notas",
      dest: "Destino do estoque",
      destNone: "Sem mudanca de estoque",
      save: "Registrar devolucao",
      needCond: "A condicao e obrigatoria.",
      needNotes: "Outro precisa de notas.",
      needItems: "Inclua um item e uma quantidade.",
      needDisp: "Escolha Reter, Liberar, Descartar ou Outro.",
      schema: "Faltam colunas de destino no registro. Troy pode rodar este SQL uma vez no Supabase. Nada foi gravado.",
      noItem: "Esse SKU nao e um item rastreado, entao o estoque nao mudou.",
      doneHold: "Retido em RETURNS-HOLD. Nao disponivel.",
      doneRelease: "Liberado para RECEIVING. Disponivel.",
      doneScrap: "Descartado. A quantidade nao subiu.",
      doneOther: "Registrado como Outro.",
      doneOtherStock: "Outro, com estoque colocado.",
      reversed: "Devolucao removida e o movimento de estoque foi revertido.",
      shortStop: "Essas unidades nao estao mais todas no local registrado. Nada mudou.",
      delShort: "Registro removido. So saiu o que ainda estava no local registrado.",
      cleanupNote: "Quantidade viva em RETURNS. Nao e um ajuste. Contagens nao gravam mais em RETURNS, QUARANTINE, QA-HOLD ou RETURNS-HOLD. Adriana confirma quais linhas sao devolucoes reais antes de mover."
    }
  };

  var channel = "major";
  var showCleanup = false;
  var editId = "";
  var banner = "";
  var busy = false;
  var schemaOk = null;
  var probing = false;
  var logQ = "";

  function lang() {
    var doc = root.document;
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(k) {
    var pack = I18N[lang()] || I18N.en;
    return pack[k] || I18N.en[k] || k;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    n = Number(n) || 0;
    return (Math.round(n * 100) / 100).toLocaleString();
  }
  function toast(m) {
    var t = root.document && root.document.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function db() { return root.DB; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function isHoldLoc(loc) { return !!HOLD_LOC[String(loc || "").toUpperCase()]; }
  function canonDisp(d) {
    d = String(d || "").trim().toLowerCase();
    if (d === "hold") return "Hold";
    if (d === "release" || d === "release to stock") return "Release";
    if (d === "scrap") return "Scrap";
    if (d === "other") return "Other";
    return "";
  }
  function isOpenRow(r) {
    if (!r) return false;
    if (Number(r.qty_hold) > 0) return true;
    return String(r.status || "") === "held";
  }
  function buckets(qty, disp) {
    qty = Number(qty) || 0;
    var b = { qty_hold: 0, qty_release: 0, qty_scrap: 0, qty_other: 0, status: "" };
    if (disp === "Hold") { b.qty_hold = qty; b.status = "held"; }
    else if (disp === "Release") { b.qty_release = qty; b.status = "released"; }
    else if (disp === "Scrap") { b.qty_scrap = qty; b.status = "scrapped"; }
    else if (disp === "Other") { b.qty_other = qty; b.status = "other"; }
    return b;
  }
  function planAdds(parts, disp, dest) {
    disp = canonDisp(disp);
    dest = String(dest || "").trim().toUpperCase();
    if (!disp) return { error: "disp", adds: [] };
    if ((disp === "Other" || disp === "Release") && dest === "RETURNS") {
      return { error: "returns", adds: [] };
    }
    var loc = "";
    if (disp === "Hold") loc = "RETURNS-HOLD";
    else if (disp === "Release") loc = "RECEIVING";
    else if (disp === "Scrap") loc = "";
    else if (disp === "Other") loc = dest;
    var adds = [];
    if (loc) {
      (parts || []).forEach(function (p) {
        var q = Number(p && p.qty) || 0;
        if (p && p.item_id && q > 0) adds.push({ item_id: p.item_id, location: loc, qty: q });
      });
    }
    return { adds: adds, location: loc, disp: disp };
  }
  function legacyLocation(row) {
    if (!row || row.stock_moves) return "";
    var d = String(row.disposition || "");
    if (!row.restocked && d !== "Restock" && d !== "Quarantine") return "";
    if (d === "Quarantine") return "QUARANTINE";
    if (d === "Restock" || row.restocked) return "RETURNS";
    return "";
  }
  function masterCaseBag(code) {
    code = String(code || "");
    var m = code.match(/^MCS-S0?(\d{1,2})$/i);
    if (m) return "B4-S" + ("0" + m[1]).slice(-2);
    m = code.match(/^SLV-S0?(\d{1,2})$/i);
    if (m) return "B15-S" + ("0" + m[1]).slice(-2);
    return "";
  }
  function masterCasePacks(code) { return /^MCS-S/i.test(String(code || "")) ? 72 : 1; }
  function parseSku(val) {
    var s = String(val || "").trim();
    var m = s.match(/\(([^)]+)\)\s*$/);
    return m ? m[1].trim() : s;
  }
  function targetsFor(sku, qty, database) {
    database = database || db();
    qty = Number(qty) || 0;
    var out = { product: sku, item_code: sku, is_kit: false, kit_sku: "", parts: [], tracked: false };
    if (!sku || !(qty > 0)) return out;
    if (String(sku).indexOf("ITEM:") === 0) {
      var code = String(sku).slice(5);
      var bag = masterCaseBag(code);
      var mcItem = bag && database && database.itemByCode ? database.itemByCode(bag) : null;
      var appItem = database && database.itemByCode ? database.itemByCode(code) : null;
      var target = mcItem || appItem;
      out.item_code = code;
      out.product = target ? (target.name || target.flavor || code) : code;
      if (/^MCS-S\d{1,2}$/i.test(code) && !target) out.product = "Master Case (Standard) - " + code;
      if (target) {
        out.tracked = true;
        out.parts.push({ item_id: target.id, item: target, qty: qty * masterCasePacks(code) });
      }
      return out;
    }
    var kits = root.KITS;
    if (kits && kits.isKit && kits.isKit(sku)) {
      var meta = kits.meta ? (kits.meta(sku) || {}) : {};
      var comps = kits.explode ? kits.explode(sku) : null;
      out.product = meta.name || sku;
      out.is_kit = true;
      out.kit_sku = sku;
      var prefix = String(meta.size || "").indexOf("1.5") >= 0 ? "B15-" : "B4-";
      if (comps && database && database.itemByCode) {
        comps.forEach(function (c) {
          var bi = database.itemByCode(prefix + c.code);
          if (bi) out.parts.push({ item_id: bi.id, item: bi, qty: (Number(c.qty) || 0) * qty });
        });
      }
      out.tracked = out.parts.length > 0;
      return out;
    }
    if (database && database.itemByCode) {
      var direct = database.itemByCode(sku);
      if (direct) {
        out.product = direct.name || direct.flavor || sku;
        out.item_code = direct.code || direct.id || sku;
        out.tracked = true;
        out.parts.push({ item_id: direct.id, item: direct, qty: qty });
      }
    }
    return out;
  }
  function recordedMoves(row, database) {
    if (row && Array.isArray(row.stock_moves)) {
      return row.stock_moves.map(function (m) {
        return { item_id: m.item_id, location: String(m.location || "").toUpperCase(), qty: Number(m.qty) || 0 };
      }).filter(function (m) { return m.item_id && m.location && m.qty > 0; });
    }
    var loc = legacyLocation(row);
    if (!loc) return [];
    var hit = targetsFor(row.item_code ? ("ITEM:" + row.item_code) : (row.kit_sku || row.product || ""), row.qty, database);
    if (row.is_kit && row.kit_sku) hit = targetsFor(row.kit_sku, row.qty, database);
    return hit.parts.map(function (p) {
      return { item_id: p.item_id, location: loc, qty: p.qty };
    });
  }
  function itemById(id, database) {
    database = database || db();
    if (!database || !database.itemByCode) return { id: id, flavor: id, name: id, unit: "" };
    return database.itemByCode(id) || { id: id, flavor: id, name: id, unit: "" };
  }
  function summaryOf(adds) {
    if (!adds.length) return { stock_item_id: "", stock_qty: null, stock_loc: "", stock_moves: [] };
    var locs = {};
    var sum = 0;
    adds.forEach(function (a) { locs[a.location] = 1; sum += Number(a.qty) || 0; });
    var keys = Object.keys(locs);
    return {
      stock_item_id: adds[0].item_id,
      stock_qty: Math.round(sum * 1000) / 1000,
      stock_loc: keys.length === 1 ? keys[0] : "multiple",
      stock_moves: adds.map(function (a) { return { item_id: a.item_id, location: a.location, qty: a.qty }; })
    };
  }
  function putsSellable(adds) {
    return adds.some(function (a) { return a.location && !isHoldLoc(a.location); });
  }
  function skuOptions() {
    var D = db();
    if (!D || !D.items) return "";
    var packs = (root.SMACKIN_SKUS || []).map(function (x) {
      var nm = (x.t && String(x.t).trim()) ? String(x.t).trim() : x.s;
      return '<option value="' + esc(nm + " (" + x.s + ")") + '"></option>';
    }).join("");
    var bags = D.items().filter(function (i) { return i.category === "bag4" || i.category === "bag15"; })
      .map(function (i) {
        return '<option value="' + esc((i.name || i.flavor || i.id) + " (ITEM:" + (i.code || i.id) + ")") + '"></option>';
      }).join("");
    var masters = D.items().filter(function (i) {
      var c = String(i.category || "").toLowerCase();
      if (c !== "mastercase" && c !== "master case") return false;
      return !/shipper|box rsc/i.test(String(i.name || ""));
    }).map(function (i) {
      return '<option value="' + esc((i.name || i.id) + " (ITEM:" + (i.code || i.id) + ")") + '"></option>';
    }).join("");
    var std = D.items().filter(function (i) { return i.category === "bag4" && /^B4-S\d{2}$/i.test(String(i.code || "")); })
      .map(function (i) {
        var s = String(i.code).replace(/^B4-/i, "");
        var fl = i.flavor || i.name || s;
        return '<option value="' + esc("Master Case (Standard) - " + fl + " (ITEM:MCS-" + s + ")") + '"></option>';
      }).join("");
    return packs + bags + masters + std;
  }
  function lineHtml() {
    return '<div class="row rw-line" style="gap:8px;align-items:flex-end;margin-bottom:6px">' +
      '<div style="flex:3;min-width:200px"><label>Item</label><input class="rw-sku" list="rw-skus" autocomplete="off" placeholder="Flavor, SKU, or master case"></div>' +
      '<div style="flex:0 0 90px"><label>Qty</label><input class="rw-qty" type="number" min="0" placeholder="0"></div>' +
      '<div style="flex:0 0 auto"><button type="button" class="ghost sm danger" data-rw="del-line">&#10005;</button></div></div>';
  }
  function opt(list, cur, labels) {
    return list.map(function (v) {
      var t = labels && labels[v] ? labels[v] : v;
      return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(t) + "</option>";
    }).join("");
  }
  function dispLabel(v) {
    if (v === "Hold") return tx("hold");
    if (v === "Release") return tx("release");
    if (v === "Scrap") return tx("scrap");
    if (v === "Other") return tx("other");
    return v || "";
  }
  function bagSplit() {
    var D = db();
    var available = 0, held = 0, legacy = 0;
    if (!D || !D.items) return { available: 0, held: 0, legacy: 0 };
    D.items().forEach(function (it) {
      if (!it || (it.category !== "bag4" && it.category !== "bag15")) return;
      var id = it.id;
      if (D.availableOnHand) available += Number(D.availableOnHand(id)) || 0;
      else available += Number(D.onHand(id)) || 0;
      if (D.heldOnHand) held += Number(D.heldOnHand(id)) || 0;
      if (D.atLoc) legacy += Number(D.atLoc(id, "RETURNS")) || 0;
    });
    return { available: available, held: held, legacy: legacy };
  }
  function rows() {
    var D = db();
    return (D && D.returnsLog ? D.returnsLog() : []).slice();
  }
  function render() {
    if (root.UI_go) root.UI_go("returns");
  }
  function view() {
    probe();
    var D = db();
    var split = bagSplit();
    var open = rows().filter(isOpenRow);
    var all = rows();
    var q = logQ.trim().toLowerCase();
    var shown = all.filter(function (r) {
      if (!q) return true;
      return (String(r.product || "") + " " + String(r.item_code || "") + " " + String(r.customer || "") + " " + String(r.order_ref || "") + " " + String(r.tracking || "") + " " + String(r.disposition || "")).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 150);
    var reasons = (D && D.returnReasons && D.returnReasons.length) ? D.returnReasons : ["Damaged", "Wrong item", "Expired", "Other"];
    var schemaBanner = schemaOk === false
      ? '<div class="card" style="border-left:4px solid #B52024"><p><b>' + esc(tx("schema")) + '</b></p><pre style="white-space:pre-wrap;font-size:12px">' + esc(SCHEMA_SQL) + "</pre></div>"
      : "";
    var bannerHtml = banner ? '<div class="card" style="border-left:4px solid #C67F16"><p>' + esc(banner) + "</p></div>" : "";
    var kpis = '<div class="kpis">' +
      '<div class="kpi"><div class="n">' + fmt(split.available) + '</div><div class="l">' + esc(tx("avail")) + " 4oz + 1.5oz</div></div>" +
      '<div class="kpi' + (split.held ? " alert" : "") + '"><div class="n">' + fmt(split.held) + '</div><div class="l">' + esc(tx("held")) + "</div></div>" +
      '<div class="kpi"><div class="n">' + fmt(split.legacy) + '</div><div class="l">' + esc(tx("legacy")) + "</div></div>" +
      '<div class="kpi' + (open.length ? " alert" : "") + '"><div class="n">' + open.length + '</div><div class="l">' + esc(tx("open")) + "</div></div></div>";
    var form = editId ? editCard(editId) : logCard(reasons);
    var queue = '<div class="card"><h2 class="sub2">' + esc(tx("open")) + " (" + open.length + ")</h2>" +
      (open.length ? openTable(open) : '<p class="muted">No open holds.</p>') + "</div>";
    var hist = '<div class="card"><h2 class="sub2">' + esc(tx("history")) + " (" + all.length + ")</h2>" +
      '<label>Search</label><input id="rw-q" autocomplete="off" value="' + esc(logQ) + '" placeholder="Product, customer, order">' +
      histTable(shown) + "</div>";
    var clean = cleanupCard();
    return '<div id="rw-root">' + schemaBanner + bannerHtml +
      '<div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"hint\">" + esc(tx("own")) + "</p>" + kpis +
      '<p class="hint">' + esc(tx("availNote")) + "</p></div>" +
      form + queue + hist + clean + "</div>";
  }
  function logCard(reasons) {
    var dispOpts = opt(DISPS, "Hold", { Hold: tx("hold"), Release: tx("release"), Scrap: tx("scrap"), Other: tx("other") });
    return '<div class="card"><h2 class="sub2">' + esc(tx("log")) + "</h2>" +
      '<div class="row" style="gap:8px;margin-bottom:8px">' +
      '<button type="button" class="' + (channel === "major" ? "primary" : "ghost") + ' sm" data-rw="channel" data-val="major">Major</button>' +
      '<button type="button" class="' + (channel === "ecom" ? "primary" : "ghost") + ' sm" data-rw="channel" data-val="ecom">E-com</button></div>' +
      (channel === "ecom"
        ? '<div class="row"><div><label>Shipment</label><input id="rw-ship" autocomplete="off"></div><div><label>Address</label><input id="rw-addr" autocomplete="off"></div></div>'
        : '<div class="row"><div><label>Customer</label><input id="rw-cust" autocomplete="off" placeholder="Target, KeHE"></div></div>') +
      '<div class="row"><div><label>Order / RMA</label><input id="rw-order" autocomplete="off"></div>' +
      '<div><label>Tracking</label><input id="rw-track" autocomplete="off"></div>' +
      '<div><label>Date</label><input id="rw-date" type="date" value="' + today() + '"></div></div>' +
      '<div class="row"><div><label>Reason</label><select id="rw-reason">' + reasons.map(function (r) { return "<option>" + esc(r) + "</option>"; }).join("") + "</select></div>" +
      '<div><label>' + esc(tx("condition")) + '</label><select id="rw-cond"><option value=""></option>' + CONDITIONS.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select></div>" +
      '<div><label>Disposition</label><select id="rw-disp">' + dispOpts + "</select></div></div>" +
      '<div class="row"><div><label>' + esc(tx("notes")) + '</label><input id="rw-notes" autocomplete="off" placeholder="Required for Other"></div>' +
      '<div><label>' + esc(tx("dest")) + ' (Other)</label><select id="rw-dest">' +
      '<option value="">' + esc(tx("destNone")) + "</option>" +
      '<option value="RECEIVING">RECEIVING (sellable)</option>' +
      '<option value="QUARANTINE">QUARANTINE (held)</option>' +
      '<option value="QA-HOLD">QA-HOLD (held)</option>' +
      '<option value="RETURNS-HOLD">RETURNS-HOLD (held)</option></select></div>' +
      '<div><label>Other location</label><input id="rw-dest-custom" autocomplete="off" placeholder="Only if not listed"></div></div>' +
      '<h3 class="sub2" style="margin:14px 0 6px">Items</h3>' +
      '<datalist id="rw-skus">' + skuOptions() + "</datalist>" +
      '<div id="rw-lines">' + lineHtml() + "</div>" +
      '<button type="button" class="ghost sm" data-rw="add-line">Add item</button>' +
      '<div style="margin-top:10px"><label>Operator</label><select id="rw-op">' + OPS.map(function (n) {
        return '<option' + (n === "Adriana" ? " selected" : "") + ">" + esc(n) + "</option>";
      }).join("") + "</select></div>" +
      '<button type="button" class="primary" data-rw="save"' + (schemaOk === false || busy ? " disabled" : "") + ">" + esc(tx("save")) + "</button></div>";
  }
  function editCard(id) {
    var row = rows().filter(function (r) { return String(r.id) === String(id); })[0];
    if (!row) { editId = ""; return ""; }
    var disp = canonDisp(row.disposition) || (isOpenRow(row) ? "Hold" : "Release");
    return '<div class="card"><h2 class="sub2">Edit return</h2><p class="hint">Saving reverses the stock move this row recorded, then applies the new disposition. Other locations are not touched.</p>' +
      "<p><b>" + esc(row.product || row.item_code || "") + "</b> x" + fmt(row.qty) + "</p>" +
      '<div class="row"><div><label>Qty</label><input id="rw-edit-qty" type="number" min="0" value="' + esc(row.qty) + '"></div>' +
      '<div><label>' + esc(tx("condition")) + '</label><select id="rw-edit-cond"><option value=""></option>' + CONDITIONS.map(function (c) {
        return '<option' + (c === row.condition ? " selected" : "") + ">" + esc(c) + "</option>";
      }).join("") + "</select></div>" +
      '<div><label>Disposition</label><select id="rw-edit-disp">' + opt(DISPS, disp, { Hold: tx("hold"), Release: tx("release"), Scrap: tx("scrap"), Other: tx("other") }) + "</select></div></div>" +
      '<div class="row"><div><label>' + esc(tx("notes")) + '</label><input id="rw-edit-notes" value="' + esc(row.notes || "") + '"></div>' +
      '<div><label>' + esc(tx("dest")) + ' (Other)</label><select id="rw-edit-dest"><option value="">' + esc(tx("destNone")) + '</option><option value="RECEIVING">RECEIVING (sellable)</option><option value="QUARANTINE">QUARANTINE (held)</option><option value="QA-HOLD">QA-HOLD (held)</option><option value="RETURNS-HOLD">RETURNS-HOLD (held)</option></select></div></div>' +
      '<button type="button" class="primary" data-rw="edit-save">Save edit</button> ' +
      '<button type="button" class="ghost" data-rw="edit-cancel">Cancel</button></div>';
  }
  function openTable(open) {
    var body = open.map(function (r) {
      var id = esc(r.id);
      return "<tr><td class=\"sm\">" + esc(String(r.return_date || r.created_at || "").slice(0, 10)) + "</td>" +
        "<td>" + esc(r.product || r.item_code || "") + "<div class=\"muted sm\">" + esc(r.condition || "") + "</div></td>" +
        "<td class=\"right\"><b>" + fmt(r.qty_hold || r.qty) + "</b></td>" +
        "<td><input data-rw-qty=\"" + id + "\" type=\"number\" min=\"0\" value=\"" + esc(r.qty_hold || r.qty) + "\" style=\"max-width:90px\"></td>" +
        "<td><select data-rw-cond=\"" + id + "\"><option value=\"\"></option>" + CONDITIONS.map(function (c) {
          return '<option' + (c === r.condition ? " selected" : "") + ">" + esc(c) + "</option>";
        }).join("") + "</select></td>" +
        "<td><input data-rw-notes=\"" + id + "\" value=\"" + esc(r.notes || "") + "\" placeholder=\"Notes\"></td>" +
        "<td><select data-rw-dest=\"" + id + "\"><option value=\"\">" + esc(tx("destNone")) + "</option><option value=\"RECEIVING\">RECEIVING</option><option value=\"QUARANTINE\">QUARANTINE</option><option value=\"QA-HOLD\">QA-HOLD</option></select></td>" +
        "<td><button type=\"button\" class=\"ghost sm\" data-rw=\"shift\" data-how=\"Release\" data-id=\"" + id + "\">" + esc(tx("release")) + "</button> " +
        "<button type=\"button\" class=\"ghost sm\" data-rw=\"shift\" data-how=\"Scrap\" data-id=\"" + id + "\">" + esc(tx("scrap")) + "</button> " +
        "<button type=\"button\" class=\"ghost sm\" data-rw=\"shift\" data-how=\"Other\" data-id=\"" + id + "\">" + esc(tx("other")) + "</button></td></tr>";
    }).join("");
    return '<div class="tblwrap"><table><thead><tr><th>Date</th><th>Item</th><th class="right">Held</th><th>Qty</th><th>' + esc(tx("condition")) + "</th><th>" + esc(tx("notes")) + "</th><th>" + esc(tx("dest")) + "</th><th></th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  function histTable(shown) {
    if (!shown.length) return '<p class="muted">No returns logged yet.</p>';
    var body = shown.map(function (r) {
      var id = esc(r.id);
      var where = r.stock_loc ? r.stock_loc : (legacyLocation(r) || "");
      var legacy = !r.status && String(r.disposition || "") === "Restock";
      return "<tr><td class=\"sm\">" + esc(String(r.return_date || r.created_at || "").slice(0, 10)) + "</td>" +
        "<td>" + esc(r.customer || r.marketplace || r.channel || "") + "</td>" +
        "<td data-txt=\"" + esc((String(r.product || "") + " " + String(r.item_code || "") + " " + String(r.customer || "") + " " + String(r.order_ref || "") + " " + String(r.tracking || "")).toLowerCase()) + "\">" + esc(r.product || r.item_code || "") + (legacy ? ' <span class="tag">Legacy</span>' : "") + "</td>" +
        "<td class=\"right\"><b>" + fmt(r.qty) + "</b></td>" +
        "<td class=\"sm\">" + esc(r.condition || "") + "</td>" +
        "<td class=\"sm\">" + esc(dispLabel(canonDisp(r.disposition) || r.disposition || "")) + (r.status ? " <span class=\"muted\">" + esc(r.status) + "</span>" : "") + "</td>" +
        "<td class=\"sm\">" + esc(where) + (isHoldLoc(where) ? ' <span class="pill low">held</span>' : (where === "RECEIVING" ? ' <span class="pill ok">available</span>' : "")) + "</td>" +
        "<td><button type=\"button\" class=\"ghost sm\" data-rw=\"edit\" data-id=\"" + id + "\">Edit</button> " +
        "<button type=\"button\" class=\"ghost sm danger\" data-rw=\"delete\" data-id=\"" + id + "\">&#10005;</button></td></tr>";
    }).join("");
    return '<div class="tblwrap"><table class="sortable"><thead><tr><th>Date</th><th>Who</th><th>Item</th><th class="right">Qty</th><th>Condition</th><th>Disposition</th><th>Stock</th><th></th></tr></thead><tbody>' + body + "</tbody></table></div>";
  }
  function cleanupCard() {
    var D = db();
    var by = {};
    ((D && D.stock) ? D.stock() : []).forEach(function (r) {
      if (String(r.location || "").toUpperCase() !== "RETURNS") return;
      var q = Number(r.qty) || 0;
      if (!(q > 0)) return;
      var it = D.itemByCode ? (D.itemByCode(r.item_id) || { name: r.item_id, code: r.item_id, unit: "" }) : { name: r.item_id, code: r.item_id, unit: "" };
      var k = it.code || r.item_id;
      if (!by[k]) by[k] = { name: it.name || k, code: k, unit: it.unit || "", qty: 0 };
      by[k].qty += q;
    });
    var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.qty - a.qty; });
    var total = list.reduce(function (s, r) { return s + r.qty; }, 0);
    var table = "";
    if (showCleanup) {
      table = list.length
        ? '<div class="tblwrap"><table><thead><tr><th>Item</th><th>Code</th><th class="right">Qty in RETURNS</th></tr></thead><tbody>' +
          list.map(function (r) {
            return "<tr><td>" + esc(r.name) + "</td><td class=\"sm\">" + esc(r.code) + "</td><td class=\"right\"><b>" + fmt(r.qty) + "</b> " + esc(r.unit) + "</td></tr>";
          }).join("") + "</tbody></table></div>"
        : "<p class=\"muted\">RETURNS is empty.</p>";
    }
    return '<div class="card"><h2 class="sub2">' + esc(tx("cleanup")) + " (" + fmt(total) + ")</h2>" +
      "<p class=\"hint\">" + esc(tx("cleanupNote")) + "</p>" +
      '<button type="button" class="ghost sm" data-rw="cleanup">' + (showCleanup ? "Hide list" : "Show live RETURNS qty") + "</button>" +
      table + "</div>";
  }
  function val(id) {
    var el = root.document && root.document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  function opName() { return val("rw-op") || "Adriana"; }
  async function unlock() {
    if (typeof root.SMK_UNLOCK === "function") return root.SMK_UNLOCK();
    return true;
  }
  function readLines() {
    var doc = root.document;
    if (!doc) return [];
    return Array.prototype.slice.call(doc.querySelectorAll("#rw-lines .rw-line")).map(function (r) {
      var sku = r.querySelector(".rw-sku");
      var qty = r.querySelector(".rw-qty");
      return { sku: parseSku(sku && sku.value), qty: parseFloat(qty && qty.value) };
    }).filter(function (l) { return l.sku && l.qty > 0; });
  }
  function dupKey(rec) {
    var D = db();
    if (D && D.returnDupKey) return D.returnDupKey(rec);
    var ref = (rec.tracking || rec.shipment_id || rec.order_ref || rec.customer || "").toString().trim().toLowerCase();
    var item = (rec.item_code || rec.kit_sku || rec.product || "").toString().trim().toLowerCase();
    return (ref + "|" + item + "|" + (rec.return_date || "")).toLowerCase();
  }
  async function applyAdds(adds, op, meta) {
    var D = db();
    for (var i = 0; i < adds.length; i++) {
      var a = adds[i];
      var item = itemById(a.item_id, D);
      await D.returnStock(item, a.qty, op, {
        disposition: meta.disposition,
        location: a.location,
        reason: meta.reason || "",
        channel: meta.channel || "",
        rma: meta.rma || ""
      });
    }
  }
  async function reverseMoves(moves, op) {
    var D = db();
    var done = [];
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var item = itemById(m.item_id, D);
      var res = await D.pullStock(item, m.location, m.qty, op);
      done.push({ item_id: m.item_id, location: m.location, qty: m.qty, taken: res.taken || 0, short: res.short || 0 });
      if ((res.short || 0) > 0.0001) {
        for (var j = 0; j < done.length; j++) {
          if (done[j].taken > 0) {
            await D.returnStock(itemById(done[j].item_id, D), done[j].taken, op, {
              disposition: "Hold",
              location: done[j].location,
              reason: "return reverse rolled back"
            });
          }
        }
        return { ok: false, shorts: done };
      }
    }
    return { ok: true, done: done };
  }
  async function reverseForDelete(moves, op) {
    var D = db();
    var short = false;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var res = await D.pullStock(itemById(m.item_id, D), m.location, m.qty, op);
      if ((res.short || 0) > 0.0001) short = true;
    }
    return { short: short };
  }
  function destFrom(selectId, customId) {
    var custom = customId ? val(customId).toUpperCase() : "";
    if (custom) return custom;
    return val(selectId).toUpperCase();
  }
  async function saveNew() {
    if (busy) return;
    if (!(await unlock())) return;
    if (schemaOk === false) { banner = tx("schema"); render(); return; }
    var disp = canonDisp(val("rw-disp"));
    var cond = val("rw-cond");
    var notes = val("rw-notes");
    var dest = destFrom("rw-dest", "rw-dest-custom");
    var lines = readLines();
    if (!disp) { toast(tx("needDisp")); return; }
    if (!cond) { toast(tx("needCond")); return; }
    if (disp === "Other" && !notes) { toast(tx("needNotes")); return; }
    if (!lines.length) { toast(tx("needItems")); return; }
    if (disp === "Other" && dest === "RETURNS") { toast("RETURNS is not a destination. Use RECEIVING for sellable stock."); return; }
    var D = db();
    var op = opName();
    var date = val("rw-date") || today();
    var hdr = {
      channel: channel, return_date: date, reason: val("rw-reason"), condition: cond,
      tracking: val("rw-track"), order_ref: val("rw-order"), notes: notes, inspected_by: op
    };
    if (channel === "ecom") { hdr.shipment_id = val("rw-ship"); hdr.ship_address = val("rw-addr"); }
    else hdr.customer = val("rw-cust");
    busy = true;
    banner = "";
    var logged = 0;
    var untracked = 0;
    try {
      for (var i = 0; i < lines.length; i++) {
        var hit = targetsFor(lines[i].sku, lines[i].qty, D);
        var plan = planAdds(hit.parts, disp, dest);
        if (plan.error === "returns") throw new Error("RETURNS is not a destination.");
        if ((disp === "Hold" || disp === "Release" || (disp === "Other" && dest)) && !hit.tracked) untracked++;
        var adds = hit.tracked ? plan.adds : [];
        if (adds.length) {
          await applyAdds(adds, op, { disposition: disp, reason: hdr.reason, channel: channel, rma: hdr.order_ref });
        }
        var sum = summaryOf(adds);
        var buck = buckets(lines[i].qty, disp);
        var now = new Date().toISOString();
        var rec = Object.assign({}, hdr, sum, buck, {
          product: hit.product, item_code: hit.item_code, is_kit: hit.is_kit, kit_sku: hit.kit_sku,
          qty: lines[i].qty, disposition: disp, restocked: putsSellable(adds),
          inspected_at: now, disposed_at: buck.status === "held" ? null : now
        });
        var res = await D.addReturn(rec, op, false);
        if (res && res.dup) {
          var again = root.confirm ? root.confirm((hit.product || hit.item_code) + "\n\nThis order, item, and date is already logged. Log it again?") : false;
          if (!again) {
            if (adds.length) await reverseForDelete(adds, op);
            continue;
          }
          res = await D.addReturn(rec, op, true);
        }
        if (!res || !res.ok) {
          if (adds.length) await reverseForDelete(adds, op);
          continue;
        }
        logged++;
      }
    } catch (e) {
      busy = false;
      banner = (e && e.message) ? e.message : "Save failed";
      render();
      return;
    }
    busy = false;
    var msg = disp === "Hold" ? tx("doneHold") : disp === "Release" ? tx("doneRelease") : disp === "Scrap" ? tx("doneScrap") : (dest ? tx("doneOtherStock") : tx("doneOther"));
    if (untracked) msg += " " + tx("noItem");
    toast(logged + " logged. " + msg);
    banner = "";
    render();
  }
  function fieldFor(attr, id) {
    var doc = root.document;
    if (!doc) return null;
    return doc.querySelector("[" + attr + "=\"" + id + "\"]");
  }
  async function shiftRow(id, how) {
    if (busy) return;
    if (!(await unlock())) return;
    var D = db();
    var row = rows().filter(function (r) { return String(r.id) === String(id); })[0];
    if (!row || !isOpenRow(row)) return;
    var howDisp = canonDisp(how);
    var qtyEl = fieldFor("data-rw-qty", id);
    var condEl = fieldFor("data-rw-cond", id);
    var notesEl = fieldFor("data-rw-notes", id);
    var destEl = fieldFor("data-rw-dest", id);
    var take = parseFloat(qtyEl && qtyEl.value);
    var held = Number(row.qty_hold) || Number(row.qty) || 0;
    var cond = (condEl && condEl.value || "").trim();
    var notes = (notesEl && notesEl.value || "").trim();
    var dest = (destEl && destEl.value || "").trim().toUpperCase();
    if (!(take > 0) || take - held > 0.0001) { toast("Qty has to be between 1 and the held qty."); return; }
    if (!cond) { toast(tx("needCond")); return; }
    if (howDisp === "Other" && !notes) { toast(tx("needNotes")); return; }
    if (dest === "RETURNS") { toast("RETURNS is not a destination."); return; }
    var op = opName() || "Adriana";
    var moves = recordedMoves(row, D);
    var holdMoves = moves.filter(function (m) { return isHoldLoc(m.location); });
    var full = !(held - take > 0.0001);
    var slice = holdMoves.map(function (m) {
      var q = full ? m.qty : Math.round(m.qty * (take / held) * 1000) / 1000;
      return { item_id: m.item_id, location: m.location, qty: q };
    }).filter(function (m) { return m.qty > 0; });
    var plan = planAdds(slice.map(function (m) { return { item_id: m.item_id, qty: m.qty }; }), howDisp, dest);
    if (plan.error) { toast(tx("needDisp")); return; }
    busy = true;
    var pulled = await reverseMoves(slice, op + " return " + howDisp);
    if (!pulled.ok) {
      busy = false;
      toast(tx("shortStop"));
      return;
    }
    if (plan.adds.length) {
      await applyAdds(plan.adds, op, { disposition: howDisp, reason: row.reason || "", channel: row.channel || "", rma: row.order_ref || "" });
    }
    var next = moves.filter(function (m) { return !isHoldLoc(m.location); });
    if (!full) {
      holdMoves.forEach(function (m) {
        var cut = slice.filter(function (s) { return s.item_id === m.item_id && s.location === m.location; })[0];
        var left = m.qty - (cut ? cut.qty : 0);
        if (left > 0.0001) next.push({ item_id: m.item_id, location: m.location, qty: Math.round(left * 1000) / 1000 });
      });
    }
    plan.adds.forEach(function (a) {
      var found = next.filter(function (m) { return m.item_id === a.item_id && m.location === a.location; })[0];
      if (found) found.qty = Math.round((found.qty + a.qty) * 1000) / 1000;
      else next.push({ item_id: a.item_id, location: a.location, qty: a.qty });
    });
    var leftHold = Math.round((held - take) * 1000) / 1000;
    var patch = summaryOf(next);
    patch.condition = cond;
    patch.notes = notes || row.notes || "";
    patch.qty_hold = leftHold > 0 ? leftHold : 0;
    patch.qty_release = (Number(row.qty_release) || 0) + (howDisp === "Release" ? take : 0);
    patch.qty_scrap = (Number(row.qty_scrap) || 0) + (howDisp === "Scrap" ? take : 0);
    patch.qty_other = (Number(row.qty_other) || 0) + (howDisp === "Other" ? take : 0);
    patch.inspected_by = op;
    patch.inspected_at = new Date().toISOString();
    patch.restocked = putsSellable(next);
    if (leftHold > 0) {
      patch.status = "held";
      patch.disposition = "Hold";
      patch.disposed_at = null;
    } else {
      patch.status = howDisp === "Release" ? "released" : howDisp === "Scrap" ? "scrapped" : "other";
      patch.disposition = howDisp;
      patch.disposed_at = new Date().toISOString();
    }
    await D.updateReturn(id, patch, op);
    busy = false;
    toast(leftHold > 0 ? (fmt(take) + " updated. " + fmt(leftHold) + " still held.") : (howDisp === "Release" ? tx("doneRelease") : howDisp === "Scrap" ? tx("doneScrap") : tx("doneOther")));
    render();
  }
  async function saveEdit() {
    if (busy || !editId) return;
    if (!(await unlock())) return;
    var D = db();
    var row = rows().filter(function (r) { return String(r.id) === String(editId); })[0];
    if (!row) return;
    var qty = parseFloat(val("rw-edit-qty"));
    var disp = canonDisp(val("rw-edit-disp"));
    var cond = val("rw-edit-cond");
    var notes = val("rw-edit-notes");
    var dest = val("rw-edit-dest").toUpperCase();
    if (!(qty > 0)) { toast(tx("needItems")); return; }
    if (!disp) { toast(tx("needDisp")); return; }
    if (!cond) { toast(tx("needCond")); return; }
    if (disp === "Other" && !notes) { toast(tx("needNotes")); return; }
    if (dest === "RETURNS") { toast("RETURNS is not a destination."); return; }
    var op = opName() || row.inspected_by || row.received_by || "Adriana";
    var old = recordedMoves(row, D);
    var sku = row.is_kit && row.kit_sku ? row.kit_sku : (row.item_code ? ("ITEM:" + row.item_code) : (row.product || ""));
    var hit = targetsFor(sku, qty, D);
    var plan = planAdds(hit.parts, disp, dest);
    if (plan.error === "returns") { toast("RETURNS is not a destination."); return; }
    if ((disp === "Hold" || disp === "Release" || (disp === "Other" && dest)) && !hit.tracked) {
      toast(tx("noItem"));
      return;
    }
    busy = true;
    if (old.length) {
      var back = await reverseMoves(old, op + " return edit");
      if (!back.ok) {
        busy = false;
        toast(tx("shortStop"));
        return;
      }
    }
    var adds = hit.tracked ? plan.adds : [];
    if (adds.length) await applyAdds(adds, op, { disposition: disp, reason: row.reason || "", channel: row.channel || "", rma: row.order_ref || "" });
    var sum = summaryOf(adds);
    var buck = buckets(qty, disp);
    var now = new Date().toISOString();
    await D.updateReturn(editId, Object.assign({}, sum, buck, {
      qty: qty, condition: cond, notes: notes, disposition: disp,
      restocked: putsSellable(adds), inspected_by: op, inspected_at: now,
      disposed_at: buck.status === "held" ? null : now
    }), op);
    busy = false;
    editId = "";
    toast("Updated. " + (disp === "Hold" ? tx("doneHold") : disp === "Release" ? tx("doneRelease") : disp === "Scrap" ? tx("doneScrap") : tx("doneOther")));
    render();
  }
  async function removeRow(id) {
    if (busy) return;
    if (!(await unlock())) return;
    var D = db();
    var row = rows().filter(function (r) { return String(r.id) === String(id); })[0];
    if (!row) return;
    var moves = recordedMoves(row, D);
    var where = moves.length ? moves.map(function (m) { return fmt(m.qty) + " from " + m.location; }).join(", ") : "no stock move on file";
    var legacy = !Array.isArray(row.stock_moves);
    var msg = "Remove this return?\n\n" + (row.product || row.item_code || "") + " x" + (row.qty || "") +
      "\nStock to reverse: " + where +
      (legacy ? "\n\nThis is a legacy row. Only units still at that location come out. The rest of RETURNS is not touched." : "");
    if (root.confirm && !root.confirm(msg)) return;
    var op = opName() || "Adriana";
    busy = true;
    var result = { short: false };
    if (moves.length) result = await reverseForDelete(moves, op + " return delete");
    await D.deleteReturn(id, op);
    busy = false;
    if (editId === String(id)) editId = "";
    toast(result.short ? tx("delShort") : tx("reversed"));
    render();
  }
  function probe() {
    if (schemaOk !== null || probing) return;
    var cfg = root.SMACKIN_CONFIG || {};
    var D = db();
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !D || D.mode !== "cloud") { schemaOk = true; return; }
    probing = true;
    var url = String(cfg.SUPABASE_URL).replace(/\/$/, "") + "/rest/v1/returns_log?select=status,stock_moves,qty_hold&limit=1";
    root.fetch(url, {
      cache: "no-store",
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY }
    }).then(function (r) {
      schemaOk = !!r.ok;
      probing = false;
      if (!r.ok && root.document && root.document.getElementById("rw-root") && root.UI_go) root.UI_go("returns");
    }).catch(function () {
      schemaOk = false;
      probing = false;
    });
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-rw]") : null;
    if (!t || !root.document || !root.document.getElementById("rw-root")) return;
    var act = t.getAttribute("data-rw");
    if (act === "channel") { channel = t.getAttribute("data-val") === "ecom" ? "ecom" : "major"; render(); return; }
    if (act === "add-line") {
      var box = root.document.getElementById("rw-lines");
      if (box) box.insertAdjacentHTML("beforeend", lineHtml());
      return;
    }
    if (act === "del-line") {
      var lines = root.document.querySelectorAll("#rw-lines .rw-line");
      var row = t.closest(".rw-line");
      if (!row) return;
      if (lines.length <= 1) {
        var s = row.querySelector(".rw-sku");
        var q = row.querySelector(".rw-qty");
        if (s) s.value = "";
        if (q) q.value = "";
      } else row.remove();
      return;
    }
    if (act === "save") { saveNew(); return; }
    if (act === "shift") { shiftRow(t.getAttribute("data-id"), t.getAttribute("data-how")); return; }
    if (act === "edit") { editId = t.getAttribute("data-id") || ""; render(); return; }
    if (act === "edit-cancel") { editId = ""; render(); return; }
    if (act === "edit-save") { saveEdit(); return; }
    if (act === "delete") { removeRow(t.getAttribute("data-id")); return; }
    if (act === "cleanup") { showCleanup = !showCleanup; render(); }
  }
  function onInput(e) {
    var t = e.target;
    if (!t || t.id !== "rw-q" || !root.document || !root.document.getElementById("rw-root")) return;
    logQ = t.value || "";
    var q = logQ.toLowerCase();
    Array.prototype.forEach.call(root.document.querySelectorAll("#rw-root table.sortable tbody tr"), function (tr) {
      var cell = tr.querySelector("[data-txt]");
      var hay = cell ? (cell.getAttribute("data-txt") || "") : "";
      tr.style.display = !q || hay.indexOf(q) >= 0 ? "" : "none";
    });
  }

  var api = {
    view: view,
    planAdds: planAdds,
    buckets: buckets,
    targetsFor: targetsFor,
    recordedMoves: recordedMoves,
    legacyLocation: legacyLocation,
    isOpenRow: isOpenRow,
    isHoldLoc: isHoldLoc,
    canonDisp: canonDisp,
    parseSku: parseSku,
    masterCaseBag: masterCaseBag,
    masterCasePacks: masterCasePacks,
    SCHEMA_SQL: SCHEMA_SQL,
    CONDITIONS: CONDITIONS,
    DISPS: DISPS
  };
  root.RETURNS_WF = api;
  if (root.document) {
    root.document.addEventListener("click", onClick);
    root.document.addEventListener("input", onInput);
  }
  root.SMK_BUSY = root.SMK_BUSY || [];
  root.SMK_BUSY.push(function () { return busy; });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

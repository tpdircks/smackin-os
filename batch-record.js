/* ============================================================================
   Batch Tracking Record (batch-record.js)
   Mixing screen for the controlled batch sheet. One record per flavor +
   date + shift. Standalone. Does not edit the recipe rates in recipes.js.

   Cross-reference only. Do not print this id on the record:
     Drive file "QUAL_FORM_10.0 Batch Tracking Record Form - All Flavors 12.11.25.xlsx"
     id 1RqXrHo0qB6zoBBKI2NKyetmlaLWZvEeF (Food Safety Documents).
   The xlsx oddHeader / oddFooter are empty. Print chrome copies trace.js
   printEvidence (Smackin SQF style, no document number).

   Shared save needs public.batch_records. Troy or the coordinator runs
   batch_records.sql in the Supabase SQL editor. This file does not run DDL
   and does not backfill paper sheets.

   Writes wait until DB.mode === "cloud". If the shared table is missing, or
   the browser stays local, Save keeps a copy on this device and says so.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var cfg = root.SMACKIN_CONFIG || {};
  var LS = "batch-records-local-v1";
  var BATCH_SLOTS = 10;
  var DC = { name: "Batch Tracking Record", ver: "1.0", eff: "12/11/2025" };

  var STR = {
    en: {
      title: "Batch Tracking Record",
      paper: "Working screen for the batch sheet. Signed paper stays the official record until Monica / Quality accepts this screen. The Drive template stays the master. Nothing here is a backfill of old paper sheets.",
      refNote: "Formula weights are a reference from recipes (lb per 100 lb seed). WIP may differ. Edit any cell. Scanned values come from today's Lot Trace mixing scans.",
      flavor: "Flavor", date: "Date", shift: "Shift", mixer: "Mixer", operator: "Operator",
      allergen: "Allergen", save: "Save record", print: "Print record", fill: "Fill from today's scans",
      status: "Status", draft: "Draft", complete: "Complete", verified: "Verified",
      qa: "QA verification name",
      qaHint: "Name only. This is not an e-sign, and it does not replace the signed paper sheet.",
      ingredient: "Ingredient", formula: "Formula weight (lb)", lot: "Lot #", addtl: "Addtl lot #",
      batch: "Batch", initials: "Initials", addIng: "Add ingredient", addBatch: "Add batch column",
      disposed: "Disposed batches at mixing", reworkUsed: "Rework used", reworkCreated: "Rework created",
      batchNo: "Batch #", lbs: "Lbs disposed", reason: "Reason", timeAdded: "Time added", weight: "Weight",
      addRow: "Add row", produced: "Total pounds produced", reworkAdded: "Total pounds rework added",
      disposedLbs: "Total pounds disposed", traceable: "Total pounds traceable",
      traceHint: "Traceable = produced + rework added - disposed. Produced adds plain numbers in the seed row. Initials alone are not pounds. Confirm this total with Monica if the paper sheet is totaled a different way.",
      packaging: "Packaging data", bars: "Total bars made (bags)", cartonLot: "Lot code on carton",
      filmLot: "Film lot code", filmVer: "Film verification", cartonVer: "Carton verification",
      verFlavor: "Flavor", verInit: "Initials",
      footnote: "*by initialing you are verifying that the correct packaging is being used with the correct allergens declared.",
      scanned: "scanned", typed: "typed", reference: "reference",
      localBanner: "LOCAL: this browser is not on the shared database. Save keeps the record on this device only.",
      tableBanner: "The shared batch_records table is not in Supabase yet. Troy or the coordinator runs batch_records.sql in the SQL editor. Until then, Save keeps a copy on this device only.",
      sqlNote: "Shared save uses batch_records. Troy or the coordinator applies batch_records.sql once.",
      emptySaved: "No batch records saved in Smackin OS yet. Older paper sheets are not loaded here.",
      savedTitle: "Saved in this screen",
      scanShift: "Lot Trace scans are for this flavor and date. Shift is not stored on the scan, so confirm these batches belong to this shift.",
      noScans: "No Lot Trace mixing scans for this flavor on this date. Lots and batch columns are blank until you type them or scans exist.",
      bagMatch: "Bag count filled from P-Mac log rows that share these batch codes.",
      bagMiss: "P-Mac log has runs for this flavor today, but none share these batch codes. Bag count was left blank.",
      discard: "Leave this record without saving the latest edits?",
      needFlavor: "Pick a flavor, date, and shift first.",
      savedOk: "Saved",
      saveFail: "Save failed",
      paperPrint: "Working copy. Signed paper remains the official record until Quality accepts this screen.",
      wip: "WIP",
      remove: "Remove",
      notes: "Notes",
      loading: "Loading the batch record...",
      waitCloud: "Waiting for the shared database...",
      mismatchFilm: "Film lot does not match this flavor.",
      mismatchTyped: "Verification flavor does not match this record.",
      none: "none"
    },
    es: {
      title: "Registro de lote",
      paper: "Pantalla de trabajo para la hoja de lote. El papel firmado sigue siendo el registro oficial hasta que Monica / Calidad acepte esta pantalla. La plantilla de Drive sigue siendo la maestra. Esto no carga hojas de papel antiguas.",
      refNote: "Los pesos de formula son una referencia de las recetas (lb por 100 lb de semilla). WIP puede diferir. Edite cualquier celda. Lo escaneado sale de los escaneos de mezcla de hoy en Rastreo de lotes.",
      flavor: "Sabor", date: "Fecha", shift: "Turno", mixer: "Mezcladora", operator: "Operador",
      allergen: "Alergeno", save: "Guardar registro", print: "Imprimir registro", fill: "Llenar con escaneos de hoy",
      status: "Estado", draft: "Borrador", complete: "Completo", verified: "Verificado",
      qa: "Nombre de verificacion QA",
      qaHint: "Solo el nombre. No es una firma electronica y no reemplaza la hoja de papel firmada.",
      ingredient: "Ingrediente", formula: "Peso de formula (lb)", lot: "Lote #", addtl: "Lote adicional #",
      batch: "Lote", initials: "Iniciales", addIng: "Agregar ingrediente", addBatch: "Agregar columna de lote",
      disposed: "Lotes desechados en mezcla", reworkUsed: "Retrabajo usado", reworkCreated: "Retrabajo creado",
      batchNo: "Lote #", lbs: "Lbs desechadas", reason: "Motivo", timeAdded: "Hora", weight: "Peso",
      addRow: "Agregar fila", produced: "Total libras producidas", reworkAdded: "Total libras de retrabajo agregadas",
      disposedLbs: "Total libras desechadas", traceable: "Total libras rastreables",
      traceHint: "Rastreable = producidas + retrabajo agregado - desechadas. Producidas suma numeros solos en la fila de semilla. Las iniciales solas no son libras. Confirme este total con Monica si la hoja de papel se suma de otra forma.",
      packaging: "Datos de empaque", bars: "Total de barras hechas (bolsas)", cartonLot: "Lote en la caja",
      filmLot: "Lote de pelicula", filmVer: "Verificacion de pelicula", cartonVer: "Verificacion de caja",
      verFlavor: "Sabor", verInit: "Iniciales",
      footnote: "*al poner sus iniciales usted verifica que el empaque correcto se usa con los alergenos declarados.",
      scanned: "escaneado", typed: "escrito", reference: "referencia",
      localBanner: "LOCAL: este navegador no esta en la base compartida. Guardar deja el registro solo en este equipo.",
      tableBanner: "La tabla compartida batch_records aun no esta en Supabase. Troy o el coordinador ejecuta batch_records.sql en el editor SQL. Hasta entonces, Guardar deja una copia solo en este equipo.",
      sqlNote: "El guardado compartido usa batch_records. Troy o el coordinador aplica batch_records.sql una vez.",
      emptySaved: "Aun no hay registros de lote guardados en Smackin OS. Las hojas de papel antiguas no se cargan aqui.",
      savedTitle: "Guardados en esta pantalla",
      scanShift: "Los escaneos de Rastreo de lotes son de este sabor y esta fecha. El turno no esta en el escaneo, confirme que estos lotes son de este turno.",
      noScans: "No hay escaneos de mezcla para este sabor en esta fecha. Los lotes y las columnas quedan en blanco hasta que los escriba o existan escaneos.",
      bagMatch: "El conteo de bolsas sale de filas del registro P-Mac que comparten estos codigos de lote.",
      bagMiss: "El registro P-Mac tiene corridas de este sabor hoy, pero ninguna comparte estos codigos de lote. El conteo de bolsas quedo en blanco.",
      discard: "¿Salir de este registro sin guardar los ultimos cambios?",
      needFlavor: "Primero elija sabor, fecha y turno.",
      savedOk: "Guardado",
      saveFail: "No se guardo",
      paperPrint: "Copia de trabajo. El papel firmado sigue siendo el registro oficial hasta que Calidad acepte esta pantalla.",
      wip: "WIP",
      remove: "Quitar",
      notes: "Notas",
      loading: "Cargando el registro de lote...",
      waitCloud: "Esperando la base compartida...",
      mismatchFilm: "El lote de pelicula no coincide con este sabor.",
      mismatchTyped: "El sabor de verificacion no coincide con este registro.",
      none: "ninguno"
    },
    pt: {
      title: "Registro de lote",
      paper: "Tela de trabalho da ficha de lote. O papel assinado continua o registro oficial ate Monica / Qualidade aceitar esta tela. O modelo no Drive continua o mestre. Isto nao carrega fichas de papel antigas.",
      refNote: "Os pesos da formula sao referencia das receitas (lb por 100 lb de semente). O WIP pode diferir. Edite qualquer celula. O que foi lido vem das leituras de mistura de hoje no rastreio de lote.",
      flavor: "Sabor", date: "Data", shift: "Turno", mixer: "Misturador", operator: "Operador",
      allergen: "Alergeno", save: "Salvar registro", print: "Imprimir registro", fill: "Preencher com leituras de hoje",
      status: "Status", draft: "Rascunho", complete: "Completo", verified: "Verificado",
      qa: "Nome da verificacao QA",
      qaHint: "So o nome. Nao e uma assinatura eletronica e nao substitui a ficha de papel assinada.",
      ingredient: "Ingrediente", formula: "Peso da formula (lb)", lot: "Lote #", addtl: "Lote extra #",
      batch: "Lote", initials: "Iniciais", addIng: "Adicionar ingrediente", addBatch: "Adicionar coluna de lote",
      disposed: "Lotes descartados na mistura", reworkUsed: "Retrabalho usado", reworkCreated: "Retrabalho criado",
      batchNo: "Lote #", lbs: "Lbs descartadas", reason: "Motivo", timeAdded: "Hora", weight: "Peso",
      addRow: "Adicionar linha", produced: "Total de libras produzidas", reworkAdded: "Total de libras de retrabalho",
      disposedLbs: "Total de libras descartadas", traceable: "Total de libras rastreaveis",
      traceHint: "Rastreavel = produzidas + retrabalho adicionado - descartadas. Produzidas soma numeros simples na linha da semente. Iniciais sozinhas nao sao libras. Confirme este total com Monica se a ficha de papel soma de outro jeito.",
      packaging: "Dados de embalagem", bars: "Total de barras feitas (sacos)", cartonLot: "Lote na caixa",
      filmLot: "Lote do filme", filmVer: "Verificacao do filme", cartonVer: "Verificacao da caixa",
      verFlavor: "Sabor", verInit: "Iniciais",
      footnote: "*ao rubricar voce verifica que a embalagem correta esta sendo usada com os alergenos declarados.",
      scanned: "lido", typed: "digitado", reference: "referencia",
      localBanner: "LOCAL: este navegador nao esta na base compartilhada. Salvar guarda o registro so neste aparelho.",
      tableBanner: "A tabela compartilhada batch_records ainda nao esta no Supabase. Troy ou o coordenador executa batch_records.sql no editor SQL. Ate la, Salvar guarda uma copia so neste aparelho.",
      sqlNote: "O salvamento compartilhado usa batch_records. Troy ou o coordenador aplica batch_records.sql uma vez.",
      emptySaved: "Ainda nao ha registros de lote salvos no Smackin OS. Fichas de papel antigas nao sao carregadas aqui.",
      savedTitle: "Salvos nesta tela",
      scanShift: "As leituras do rastreio sao deste sabor e desta data. O turno nao fica na leitura, confirme que estes lotes sao deste turno.",
      noScans: "Nao ha leituras de mistura deste sabor nesta data. Lotes e colunas ficam em branco ate voce digitar ou existirem leituras.",
      bagMatch: "A contagem de sacos veio de linhas do registro P-Mac que compartilham estes codigos de lote.",
      bagMiss: "O registro P-Mac tem corridas deste sabor hoje, mas nenhuma compartilha estes codigos. A contagem de sacos ficou em branco.",
      discard: "Sair deste registro sem salvar as ultimas edicoes?",
      needFlavor: "Escolha sabor, data e turno primeiro.",
      savedOk: "Salvo",
      saveFail: "Nao salvou",
      paperPrint: "Copia de trabalho. O papel assinado continua o registro oficial ate a Qualidade aceitar esta tela.",
      wip: "WIP",
      remove: "Remover",
      notes: "Notas",
      loading: "Carregando o registro de lote...",
      waitCloud: "Aguardando a base compartilhada...",
      mismatchFilm: "O lote do filme nao combina com este sabor.",
      mismatchTyped: "O sabor da verificacao nao combina com este registro.",
      none: "nenhum"
    }
  };

  var sb = null;
  var cache = [];
  var cacheMode = "";
  var tableMissing = false;
  var cur = null;
  var active = false;
  var bagInfo = null;

  function tx(key) {
    var l = lang();
    var pack = STR[l] || STR.en;
    return pack[key] != null ? pack[key] : (STR.en[key] != null ? STR.en[key] : key);
  }
  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function fmtNum(n) {
    if (n == null || !isFinite(Number(n))) return "";
    var s = round2(n).toFixed(2);
    if (s.slice(-3) === ".00") return s.slice(0, -3);
    if (s.slice(-1) === "0") return s.slice(0, -1);
    return s;
  }
  function pounds(s) {
    if (typeof s === "number" && isFinite(s)) return s;
    var t = String(s == null ? "" : s).trim().replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }
  function loose(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function ymd(ts) {
    if (!ts) return "";
    var s = String(ts);
    if (/^\d{4}-\d{2}-\d{2}/.test(s) && s.indexOf("T") < 0 && s.length <= 10) return s.slice(0, 10);
    var d = new Date(s);
    if (isNaN(d.getTime())) return s.slice(0, 10);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function onDay(rowDate, created, runDate) {
    if (rowDate && String(rowDate).slice(0, 10) === runDate) return true;
    return ymd(created) === runDate;
  }
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  function toast(m) {
    if (root.UI && typeof root.UI.toast === "function") { try { root.UI.toast(m); return; } catch (e) {} }
    if (!doc) return;
    var t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2400);
  }
  function lsGet() { try { var v = root.localStorage.getItem(LS); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function lsSet(rows) { try { root.localStorage.setItem(LS, JSON.stringify(rows)); } catch (e) {} }
  function asList(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v) { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  function asObj(v) {
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
    if (typeof v === "string" && v) { try { var p = JSON.parse(v); return p && typeof p === "object" ? p : {}; } catch (e) { return {}; } }
    return {};
  }
  function listLabels(labels) {
    if (!labels) return [];
    if (Array.isArray(labels)) return labels;
    return Object.keys(labels).map(function (k) { return labels[k]; });
  }
  function flavorList() {
    if (root.TRACE && root.TRACE.flavors && root.TRACE.flavors.length) return root.TRACE.flavors;
    var R = root.RECIPES || {};
    return Object.keys(R).map(function (k) {
      var r = R[k];
      return { code: r.code, name: r.name, alg: r.allergen_level || "", algTxt: "" };
    }).filter(function (f) { return f.code; });
  }
  function flavorBy(code) {
    code = String(code || "").toUpperCase();
    var list = flavorList();
    for (var i = 0; i < list.length; i++) if (String(list[i].code).toUpperCase() === code) return list[i];
    return null;
  }
  function recipeByCode(code) {
    var R = root.RECIPES || {};
    var keys = Object.keys(R);
    code = String(code || "").toUpperCase();
    for (var i = 0; i < keys.length; i++) if (String(R[keys[i]].code || "").toUpperCase() === code) return R[keys[i]];
    return null;
  }
  function wipNote(formula, wip) {
    var a = pounds(formula);
    var b = pounds(wip);
    if (a == null || b == null) return "";
    if (Math.abs(a - b) <= 0.3) return "";
    return fmtNum(b);
  }
  function emptyBatch() { return { code: "", code_src: "", initials: "", initials_src: "" }; }
  function emptyCell() { return { text: "", src: "" }; }
  function padBatches(list) {
    var out = (list || []).map(function (b) {
      return { code: b.code || "", code_src: b.code_src || "", initials: b.initials || "", initials_src: b.initials_src || "" };
    });
    while (out.length < BATCH_SLOTS) out.push(emptyBatch());
    return out;
  }
  function blankDisp() { return { batch: "", lbs: "", reason: "" }; }
  function blankUsed() { return { date: "", time: "", weight: "" }; }
  function blankCreated() { return { date: "", weight: "" }; }
  function blankPack() {
    return {
      total_bags: "", bags_src: "", carton_lot: "", carton_src: "",
      film_lots: ["", ""], film_src: ["", ""],
      film_flavor: "", film_initials: "", carton_flavor: "", carton_initials: ""
    };
  }
  function makeIng(partial) {
    return {
      key: partial.key,
      ingredient: partial.ingredient || "",
      ingredient_src: partial.ingredient_src || "",
      allergen: partial.allergen || "",
      allergen_src: partial.allergen_src || "",
      formula_lbs: partial.formula_lbs == null ? "" : String(partial.formula_lbs),
      formula_src: partial.formula_src || "",
      wip_lbs: partial.wip_lbs == null ? "" : String(partial.wip_lbs),
      lot: partial.lot || "",
      lot_src: partial.lot_src || "",
      lot_2: partial.lot_2 || "",
      lot_2_src: partial.lot_2_src || "",
      cells: []
    };
  }
  function referenceIngredients(recipe, flavor) {
    recipe = recipe || null;
    flavor = flavor || {};
    var allergen = flavor.alg === "A1" || !flavor.algTxt ? "" : flavor.algTxt;
    var named = !!(recipe && recipe.code);
    return [
      makeIng({ key: "seed", ingredient: "Seed" + (recipe && recipe.seed_type ? " (" + recipe.seed_type + ")" : ""), formula_lbs: named || flavor.code ? "100" : "", formula_src: named || flavor.code ? "reference" : "", ingredient_src: "reference" }),
      makeIng({ key: "seas", ingredient: (recipe && recipe.seas_desc) || "Seasoning", allergen: allergen, allergen_src: allergen ? "reference" : "", formula_lbs: recipe && recipe.seas_lbs != null ? recipe.seas_lbs : "", formula_src: recipe && recipe.seas_lbs != null ? "reference" : "", wip_lbs: recipe ? recipe.wip_lbs_per_batch : "", ingredient_src: "reference" }),
      makeIng({ key: "malto", ingredient: "Maltodextrin", formula_lbs: recipe && recipe.malto_lbs != null ? recipe.malto_lbs : "", formula_src: recipe && recipe.malto_lbs != null ? "reference" : "", wip_lbs: recipe ? recipe.wip_malt_lbs : "", ingredient_src: "reference" }),
      makeIng({ key: "oil", ingredient: "Oil", ingredient_src: "reference" }),
      makeIng({ key: "stevia", ingredient: "Stevia", ingredient_src: "reference" })
    ];
  }
  function syncCells(rec) {
    var n = rec.batches.length;
    rec.ingredients.forEach(function (row) {
      row.cells = row.cells || [];
      while (row.cells.length < n) row.cells.push(emptyCell());
      if (row.cells.length > n) row.cells = row.cells.slice(0, n);
    });
  }
  function rowKeyFor(label) {
    var item = String((label && label.item) || "") + " " + String((label && label.flavor) || "");
    var mt = String((label && label.mtype) || "").toUpperCase();
    if (/stevia/i.test(item)) return "stevia";
    if (mt === "SEED") return "seed";
    if (mt === "SEAS") return "seas";
    if (mt === "MALTO") return "malto";
    if (mt === "OIL") return "oil";
    if (mt) return "x:" + mt;
    return "";
  }
  function cloneRows(rows, n) {
    return rows.map(function (r) {
      var c = makeIng(r);
      c.lot = r.lot || "";
      c.lot_src = r.lot_src || "";
      c.lot_2 = r.lot_2 || "";
      c.lot_2_src = r.lot_2_src || "";
      c.cells = [];
      for (var i = 0; i < n; i++) c.cells.push(emptyCell());
      return c;
    });
  }
  function rememberLot(row, lot) {
    lot = String(lot || "").trim();
    if (!lot) return;
    if (!row.lot) { row.lot = lot; row.lot_src = "scanned"; return; }
    if (row.lot === lot) return;
    var extra = row.lot_2 ? row.lot_2.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [];
    if (extra.indexOf(lot) >= 0) return;
    extra.push(lot);
    row.lot_2 = extra.join(", ");
    row.lot_2_src = "scanned";
  }
  function applyScans(ingredients, flavorCode, runDate, labels, events) {
    flavorCode = String(flavorCode || "").toUpperCase();
    var labs = listLabels(labels);
    var byLpn = {};
    labs.forEach(function (l) { if (l && l.lpn) byLpn[l.lpn] = l; });
    var bins = labs.filter(function (l) {
      return l && l.kind === "BN" && String(l.flavor_code || "").toUpperCase() === flavorCode && onDay(l.data && l.data.date, l.created_at, runDate);
    });
    bins.sort(function (a, b) { return String(a.created_at || "").localeCompare(String(b.created_at || "")); });
    var groups = [];
    var index = {};
    bins.forEach(function (b) {
      var code = String(b.lot || "").trim();
      if (!code) return;
      if (index[code] == null) {
        index[code] = groups.length;
        groups.push({
          code: code, code_src: "scanned",
          initials: initials(b.created_by), initials_src: b.created_by ? "scanned" : "",
          mixer: b.data && b.data.mixer, parents: []
        });
      }
      var g = groups[index[code]];
      (b.parents || []).forEach(function (p) { if (p && g.parents.indexOf(p) < 0) g.parents.push(p); });
    });
    var rows = cloneRows(ingredients || [], groups.length);
    function rowFor(label) {
      var key = rowKeyFor(label);
      if (!key) return null;
      for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return rows[i];
      var extra = makeIng({ key: key, ingredient: label.item || label.mtype || key, ingredient_src: "scanned" });
      extra.cells = groups.map(function () { return emptyCell(); });
      rows.push(extra);
      return extra;
    }
    groups.forEach(function (g) {
      g.parents.forEach(function (lpn) {
        var lab = byLpn[lpn];
        if (!lab) return;
        var row = rowFor(lab);
        if (!row) return;
        rememberLot(row, lab.supplier_lot || lab.lot || "");
      });
    });
    (events || []).forEach(function (e) {
      if (!e || e.type !== "CONSUME") return;
      var bi = index[String(e.ref || "").trim()];
      if (bi == null) return;
      var lab = e.lpn && byLpn[e.lpn];
      if (!lab) return;
      var row = rowFor(lab);
      if (!row) return;
      var qty = pounds(e.qty);
      if (qty == null) return;
      var curQty = pounds(row.cells[bi].text);
      row.cells[bi].text = fmtNum(round2((curQty || 0) + qty));
      row.cells[bi].src = "scanned";
      rememberLot(row, e.lot || lab.supplier_lot || "");
    });
    var filmLots = [];
    var filmSkipped = [];
    var seenSkip = {};
    (events || []).forEach(function (e) {
      if (!e || e.type !== "FILM_ON") return;
      if (!onDay("", e.ts, runDate)) return;
      var lab = e.lpn && byLpn[e.lpn];
      var lot = String((lab && (lab.supplier_lot || lab.lot)) || e.lot || "").trim();
      var fc = lab ? String(lab.flavor_code || "").toUpperCase() : "";
      if (fc && fc !== flavorCode) {
        var sk = (lot || "?") + "|" + fc;
        if (!seenSkip[sk]) {
          seenSkip[sk] = true;
          filmSkipped.push({ lot: lot, flavor_code: fc, name: lab ? (lab.flavor || "") : "" });
        }
        return;
      }
      if (!fc) return;
      if (lot && filmLots.indexOf(lot) < 0) filmLots.push(lot);
    });
    return {
      batches: groups.map(function (g) { return { code: g.code, code_src: g.code_src, initials: g.initials, initials_src: g.initials_src }; }),
      ingredients: rows,
      film_lots: filmLots,
      film_skipped: filmSkipped,
      mixer: (groups[0] && groups[0].mixer) || "",
      scanned: groups.length
    };
  }
  function sumKey(rec, key) {
    var row = null;
    (rec.ingredients || []).forEach(function (r) { if (r.key === key) row = r; });
    if (!row) return 0;
    var n = 0;
    (row.cells || []).forEach(function (c) {
      var v = pounds(c && c.text);
      if (v != null) n += v;
    });
    return round2(n);
  }
  function sumField(list, field) {
    var n = 0;
    (list || []).forEach(function (r) {
      var v = pounds(r && r[field]);
      if (v != null) n += v;
    });
    return round2(n);
  }
  function computeTotals(rec) {
    var produced = sumKey(rec, "seed");
    var rework = sumField(rec.rework && rec.rework.used, "weight");
    var disposed = sumField(rec.disposed, "lbs");
    return {
      produced: produced,
      rework_added: rework,
      disposed: disposed,
      traceable: round2(produced + rework - disposed)
    };
  }
  function sameFlavorText(text, flavor) {
    var t = loose(text);
    if (!t) return true;
    if (!flavor) return false;
    var code = loose(flavor.code);
    var name = loose(flavor.name);
    if (t === code || t === name) return true;
    if (name && (t.indexOf(name) >= 0 || name.indexOf(t) >= 0)) return true;
    return false;
  }
  function filmWarnings(flavor, packaging, labels, skipped) {
    var out = [];
    packaging = packaging || {};
    var lots = (packaging.film_lots || []).map(function (x) { return String(x || "").trim(); }).filter(Boolean);
    var labs = listLabels(labels).filter(function (l) { return l && String(l.mtype || "").toUpperCase() === "FILM"; });
    function describe(other) {
      if (!other || (!other.code && !other.name)) return "unknown flavor";
      var alg = other.algTxt || (other.alg === "A1" ? "none" : (other.alg || ""));
      return (other.code ? other.code + " " : "") + (other.name || "") + (alg ? " (" + alg + ")" : "");
    }
    lots.forEach(function (lot) {
      var u = lot.toUpperCase();
      var hit = null;
      for (var i = 0; i < labs.length; i++) {
        var l = labs[i];
        if (String(l.supplier_lot || "").toUpperCase() === u || String(l.lot || "").toUpperCase() === u || String(l.lpn || "").toUpperCase() === u) { hit = l; break; }
      }
      if (!hit || !hit.flavor_code) return;
      if (String(hit.flavor_code).toUpperCase() === String(flavor && flavor.code || "").toUpperCase()) return;
      var other = flavorBy(hit.flavor_code) || { code: hit.flavor_code, name: hit.flavor || "", alg: "", algTxt: "" };
      out.push({ lot: lot, text: "Film lot " + lot + " is " + describe(other) + ". This record is " + describe(flavor) + "." });
    });
    (skipped || []).forEach(function (s) {
      if (!s || !s.lot) return;
      if (lots.some(function (lot) { return lot.toUpperCase() === String(s.lot).toUpperCase(); })) return;
      var other = flavorBy(s.flavor_code) || { code: s.flavor_code || "", name: s.name || "", alg: "", algTxt: "" };
      out.push({ lot: s.lot, text: "Lot Trace film " + (s.lot || "(no lot)") + " on this date is " + describe(other) + ". It was not filled in." });
    });
    if (flavor && packaging.film_flavor && !sameFlavorText(packaging.film_flavor, flavor)) {
      out.push({ lot: "", text: "Film verification flavor \"" + packaging.film_flavor + "\" does not match " + flavor.code + " " + flavor.name + "." });
    }
    if (flavor && packaging.carton_flavor && !sameFlavorText(packaging.carton_flavor, flavor)) {
      out.push({ lot: "", text: "Carton verification flavor \"" + packaging.carton_flavor + "\" does not match " + flavor.code + " " + flavor.name + "." });
    }
    return out;
  }

  function traceState() {
    try { return root.TRACE && root.TRACE._state ? root.TRACE._state() : null; } catch (e) { return null; }
  }
  function traceLabels() { var st = traceState(); return st ? st.labels : {}; }
  function traceEvents() { var st = traceState(); return st ? st.events : []; }
  function traceOp() {
    var st = traceState();
    return st && st.ST && st.ST.op ? String(st.ST.op) : "";
  }
  function ensureTrace() {
    if (!root.TRACE || typeof root.TRACE._load !== "function") return Promise.resolve();
    return Promise.resolve(root.TRACE._load()).catch(function () {});
  }
  function client() {
    if (sb) return sb;
    if (root.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
      try { sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
    }
    return sb;
  }
  function appNavReady() {
    return !!(doc && doc.querySelector && doc.querySelector("#nav .navlabel"));
  }
  function waitMode() {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (root.DB && root.DB.mode === "cloud") return resolve("cloud");
        // The app paints the department menu only after DB.init(). Mode is
        // still "local" while that init is in flight, so do not write yet.
        if (appNavReady() && root.DB && root.DB.mode === "local") return resolve("local");
        if (Date.now() - t0 > 8000) return resolve(root.DB && root.DB.mode === "cloud" ? "cloud" : "local");
        setTimeout(tick, 100);
      })();
    });
  }
  function releaseTrace() {
    if (root.TRACE && typeof root.TRACE.leave === "function") { try { root.TRACE.leave(); } catch (e) {} }
  }

  function fresh(flavorCode, runDate, shift, mixer) {
    var flavor = flavorBy(flavorCode) || { code: flavorCode, name: "", alg: "", algTxt: "" };
    var recipe = recipeByCode(flavorCode);
    var rec = {
      id: "",
      run_date: runDate || today(),
      shift: shift || "1st",
      flavor_code: flavor.code || "",
      flavor_name: flavor.name || (recipe ? recipe.name : ""),
      mixer: mixer || "1",
      header: {
        operator: traceOp(),
        allergen: flavor.algTxt || (flavor.alg === "A1" ? "none" : ""),
        allergen_code: flavor.alg || (recipe ? recipe.allergen_level || "" : ""),
        notes: ""
      },
      batches: padBatches([]),
      ingredients: referenceIngredients(recipe, flavor),
      disposed: [blankDisp(), blankDisp()],
      rework: { used: [blankUsed(), blankUsed()], created: [blankCreated(), blankCreated()] },
      packaging: blankPack(),
      status: "draft",
      entered_by: "",
      verified_by: "",
      verified_at: "",
      film_skipped: [],
      scan_count: 0,
      dirty: false
    };
    if (flavor.code) applyScanOnto(rec);
    syncCells(rec);
    return rec;
  }
  function applyScanOnto(rec) {
    var base = referenceIngredients(recipeByCode(rec.flavor_code), flavorBy(rec.flavor_code) || { code: rec.flavor_code, name: rec.flavor_name, alg: rec.header.allergen_code, algTxt: rec.header.allergen });
    var scan = applyScans(base, rec.flavor_code, rec.run_date, traceLabels(), traceEvents());
    rec.batches = padBatches(scan.batches);
    rec.ingredients = scan.ingredients;
    syncCells(rec);
    rec.scan_count = scan.scanned;
    rec.film_skipped = scan.film_skipped;
    if (scan.mixer) rec.mixer = String(scan.mixer);
    rec.packaging.film_lots = ["", ""];
    rec.packaging.film_src = ["", ""];
    scan.film_lots.slice(0, 2).forEach(function (lot, i) {
      rec.packaging.film_lots[i] = lot;
      rec.packaging.film_src[i] = "scanned";
    });
    return scan;
  }
  function hydrate(row) {
    var header = asObj(row.header);
    var pack = asObj(row.packaging);
    var rework = asObj(row.rework);
    var rec = {
      id: row.id || "",
      run_date: String(row.run_date || "").slice(0, 10),
      shift: row.shift || "1st",
      flavor_code: row.flavor_code || "",
      flavor_name: row.flavor_name || "",
      mixer: row.mixer || "1",
      header: {
        operator: header.operator || "",
        allergen: header.allergen || "",
        allergen_code: header.allergen_code || "",
        notes: header.notes || ""
      },
      batches: padBatches(header.batches || []),
      ingredients: asList(row.ingredients).map(function (r) {
        var ing = makeIng(r || {});
        ing.cells = asList(r && r.cells).map(function (c) { return { text: c && c.text != null ? String(c.text) : "", src: c && c.src || "" }; });
        return ing;
      }),
      disposed: asList(row.disposed).map(function (r) { return { batch: r.batch || "", lbs: r.lbs == null ? "" : String(r.lbs), reason: r.reason || "" }; }),
      rework: {
        used: asList(rework.used).map(function (r) { return { date: r.date || "", time: r.time || "", weight: r.weight == null ? "" : String(r.weight) }; }),
        created: asList(rework.created).map(function (r) { return { date: r.date || "", weight: r.weight == null ? "" : String(r.weight) }; })
      },
      packaging: {
        total_bags: pack.total_bags == null ? "" : String(pack.total_bags),
        bags_src: pack.bags_src || "",
        carton_lot: pack.carton_lot || "",
        carton_src: pack.carton_src || "",
        film_lots: [((pack.film_lots || [])[0] || ""), ((pack.film_lots || [])[1] || "")],
        film_src: [((pack.film_src || [])[0] || ""), ((pack.film_src || [])[1] || "")],
        film_flavor: pack.film_flavor || "",
        film_initials: pack.film_initials || "",
        carton_flavor: pack.carton_flavor || "",
        carton_initials: pack.carton_initials || ""
      },
      status: row.status || "draft",
      entered_by: row.entered_by || "",
      verified_by: row.verified_by || "",
      verified_at: row.verified_at || "",
      film_skipped: asList(header.film_skipped),
      scan_count: 0,
      dirty: false
    };
    if (!rec.disposed.length) rec.disposed.push(blankDisp());
    if (!rec.rework.used.length) rec.rework.used.push(blankUsed());
    if (!rec.rework.created.length) rec.rework.created.push(blankCreated());
    syncCells(rec);
    return rec;
  }
  function findCached(flavor, date, shift) {
    flavor = String(flavor || "").toUpperCase();
    for (var i = 0; i < cache.length; i++) {
      var r = cache[i];
      if (String(r.flavor_code || "").toUpperCase() === flavor && String(r.run_date || "").slice(0, 10) === date && String(r.shift || "") === shift) return r;
    }
    return null;
  }
  function loadRows() {
    return waitMode().then(function (mode) {
      if (mode !== "cloud" || !client()) {
        cache = lsGet();
        cacheMode = "local";
        tableMissing = false;
        return cache;
      }
      return client().from("batch_records").select("*").order("run_date", { ascending: false }).order("created_at", { ascending: false }).limit(200).then(function (r) {
        if (r && r.error) {
          var msg = (r.error.message || "") + " " + (r.error.code || "");
          tableMissing = /batch_records|schema cache|does not exist|PGRST205|42P01/i.test(msg);
          cache = lsGet();
          cacheMode = "local";
          return cache;
        }
        tableMissing = false;
        cache = (r && r.data) || [];
        cacheMode = "cloud";
        return cache;
      }).catch(function () {
        cache = lsGet();
        cacheMode = "local";
        return cache;
      });
    });
  }
  function loadBags(rec) {
    bagInfo = null;
    var codes = {};
    (rec.batches || []).forEach(function (b) { if (b.code) codes[String(b.code).toUpperCase()] = true; });
    if (cacheMode !== "cloud" || !client() || !rec.flavor_code) return Promise.resolve(rec);
    return client().from("pmac_log").select("batch_code,total_packages,flavor_code,log_date").eq("log_date", rec.run_date).limit(500).then(function (r) {
      if (!r || r.error) return rec;
      var rows = (r.data || []).filter(function (row) { return String(row.flavor_code || "").toUpperCase() === String(rec.flavor_code).toUpperCase(); });
      var matched = rows.filter(function (row) { return codes[String(row.batch_code || "").toUpperCase()]; });
      var sum = 0;
      var any = false;
      matched.forEach(function (row) {
        if (row.total_packages != null && row.total_packages !== "") { sum += Number(row.total_packages) || 0; any = true; }
      });
      bagInfo = { matched: matched.length, flavorRows: rows.length, sum: any ? sum : null };
      if (any && !rec.packaging.total_bags) {
        rec.packaging.total_bags = String(sum);
        rec.packaging.bags_src = "scanned";
      }
      return rec;
    }).catch(function () { return rec; });
  }

  function field(attrs, value, src) {
    var kind = src === "scanned" || src === "typed" || src === "reference" ? src : "";
    return '<input ' + attrs + ' value="' + esc(value) + '" autocomplete="off"><span class="btr-src ' + kind + '">' + (kind ? esc(tx(kind)) : "") + "</span>";
  }
  function allergenLine(rec) {
    var code = rec.header.allergen_code || "";
    var txt = rec.header.allergen || "";
    if (!code && !txt) return tx("none");
    if (code === "A1" && (!txt || txt === "none")) return "A1: " + tx("none");
    return (code ? code + ": " : "") + (txt || "");
  }
  function warnHtml(rec) {
    var flavor = flavorBy(rec.flavor_code) || { code: rec.flavor_code, name: rec.flavor_name, alg: rec.header.allergen_code, algTxt: rec.header.allergen };
    var warns = filmWarnings(flavor, rec.packaging, traceLabels(), rec.film_skipped);
    if (!warns.length) return "";
    return '<div class="btr-warn" id="btr-warn">' + warns.map(function (w) { return "<div>" + esc(w.text) + "</div>"; }).join("") + "</div>";
  }
  function totalsHtml(rec) {
    var t = computeTotals(rec);
    return '<div class="btr-totals" id="btr-totals">' +
      "<div><b>" + esc(tx("produced")) + "</b><div id=\"btr-n-produced\">" + esc(fmtNum(t.produced)) + "</div></div>" +
      "<div><b>" + esc(tx("reworkAdded")) + "</b><div id=\"btr-n-rework\">" + esc(fmtNum(t.rework_added)) + "</div></div>" +
      "<div><b>" + esc(tx("disposedLbs")) + "</b><div id=\"btr-n-disposed\">" + esc(fmtNum(t.disposed)) + "</div></div>" +
      "<div><b>" + esc(tx("traceable")) + "</b><div id=\"btr-n-trace\">" + esc(fmtNum(t.traceable)) + "</div></div>" +
      "</div>";
  }
  function bannerHtml() {
    if (cacheMode !== "cloud") return '<div class="btr-warn">' + esc(tx("localBanner")) + "</div>";
    if (tableMissing) return '<div class="btr-warn">' + esc(tx("tableBanner")) + "</div>";
    return '<p class="hint">' + esc(tx("sqlNote")) + "</p>";
  }
  function scanNoteHtml(rec) {
    if (!rec.flavor_code) return "";
    if (rec.scan_count > 0) return '<p class="hint">' + esc(tx("scanShift")) + "</p>";
    return '<p class="hint">' + esc(tx("noScans")) + "</p>";
  }
  function bagNoteHtml() {
    if (!bagInfo) return "";
    if (bagInfo.matched > 0) return '<p class="hint">' + esc(tx("bagMatch")) + "</p>";
    if (bagInfo.flavorRows > 0) return '<p class="hint">' + esc(tx("bagMiss")) + "</p>";
    return "";
  }
  function gridHtml(rec) {
    var head = "<tr><th>" + esc(tx("ingredient")) + "</th><th>" + esc(tx("allergen")) + "</th><th>" + esc(tx("formula")) + "</th><th>" + esc(tx("lot")) + "</th>";
    rec.batches.forEach(function (b, i) {
      head += '<th class="btr-batch"><div>' + esc(tx("batch")) + " " + (i + 1) + "</div>" +
        field('data-k="batch" data-i="' + i + '" data-f="code"', b.code, b.code_src) +
        '<div class="btr-sub">' + esc(tx("initials")) + "</div>" +
        field('data-k="batch" data-i="' + i + '" data-f="initials"', b.initials, b.initials_src) +
        "</th>";
    });
    head += "<th>" + esc(tx("addtl")) + "</th><th></th></tr>";
    var body = rec.ingredients.map(function (row, i) {
      var wip = wipNote(row.formula_lbs, row.wip_lbs);
      var cells = '<td>' + field('data-k="ing" data-i="' + i + '" data-f="ingredient"', row.ingredient, row.ingredient_src) + "</td>" +
        '<td>' + field('data-k="ing" data-i="' + i + '" data-f="allergen"', row.allergen, row.allergen_src) + "</td>" +
        "<td>" + field('data-k="ing" data-i="' + i + '" data-f="formula_lbs"', row.formula_lbs, row.formula_src) +
        (wip ? '<div class="btr-wip">' + esc(tx("wip")) + " " + esc(wip) + "</div>" : "") + "</td>" +
        '<td>' + field('data-k="ing" data-i="' + i + '" data-f="lot"', row.lot, row.lot_src) + "</td>";
      rec.batches.forEach(function (b, bi) {
        var cell = (row.cells && row.cells[bi]) || emptyCell();
        cells += '<td>' + field('data-k="cell" data-i="' + i + '" data-b="' + bi + '"', cell.text, cell.src) + "</td>";
      });
      cells += '<td>' + field('data-k="ing" data-i="' + i + '" data-f="lot_2"', row.lot_2, row.lot_2_src) + "</td>";
      cells += '<td><button type="button" class="ghost sm" data-act="del-ing" data-i="' + i + '">' + esc(tx("remove")) + "</button></td>";
      return "<tr>" + cells + "</tr>";
    }).join("");
    return '<div class="btr-scroll"><table class="btr-grid"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
  }
  function miniRows(list, kind) {
    return list.map(function (row, i) {
      if (kind === "disp") {
        return "<tr><td>" + field('data-k="disp" data-i="' + i + '" data-f="batch"', row.batch) + "</td><td>" +
          field('data-k="disp" data-i="' + i + '" data-f="lbs"', row.lbs) + "</td><td>" +
          field('data-k="disp" data-i="' + i + '" data-f="reason"', row.reason) + "</td><td><button type=\"button\" class=\"ghost sm\" data-act=\"del-disp\" data-i=\"" + i + "\">" + esc(tx("remove")) + "</button></td></tr>";
      }
      if (kind === "used") {
        return "<tr><td><input data-k=\"used\" data-i=\"" + i + "\" data-f=\"date\" type=\"date\" value=\"" + esc(row.date) + "\"></td><td>" +
          field('data-k="used" data-i="' + i + '" data-f="time" type="time"', row.time) + "</td><td>" +
          field('data-k="used" data-i="' + i + '" data-f="weight"', row.weight) + "</td><td><button type=\"button\" class=\"ghost sm\" data-act=\"del-used\" data-i=\"" + i + "\">" + esc(tx("remove")) + "</button></td></tr>";
      }
      return "<tr><td><input data-k=\"created\" data-i=\"" + i + "\" data-f=\"date\" type=\"date\" value=\"" + esc(row.date) + "\"></td><td>" +
        field('data-k="created" data-i="' + i + '" data-f="weight"', row.weight) + "</td><td><button type=\"button\" class=\"ghost sm\" data-act=\"del-created\" data-i=\"" + i + "\">" + esc(tx("remove")) + "</button></td></tr>";
    }).join("");
  }
  function savedHtml() {
    if (!cache.length) return '<div class="card"><h2 class="sub2">' + esc(tx("savedTitle")) + "</h2><p class=\"muted\">" + esc(tx("emptySaved")) + "</p></div>";
    var rows = cache.slice(0, 40).map(function (r) {
      var key = esc(String(r.flavor_code || "") + "|" + String(r.run_date || "").slice(0, 10) + "|" + String(r.shift || ""));
      return "<tr><td>" + esc(String(r.run_date || "").slice(0, 10)) + "</td><td>" + esc(r.shift || "") + "</td><td><b>" + esc(r.flavor_code || "") + "</b> " + esc(r.flavor_name || "") + "</td><td>" + esc(r.status || "") + "</td><td>" + esc(r.entered_by || "") + "</td><td><button type=\"button\" class=\"ghost sm\" data-act=\"open-saved\" data-key=\"" + key + "\">" + esc(tx("title")) + "</button></td></tr>";
    }).join("");
    return '<div class="card"><h2 class="sub2">' + esc(tx("savedTitle")) + " (" + cache.length + ")</h2><div class=\"tblwrap\"><table><thead><tr><th>" + esc(tx("date")) + "</th><th>" + esc(tx("shift")) + "</th><th>" + esc(tx("flavor")) + "</th><th>" + esc(tx("status")) + "</th><th>" + esc(tx("operator")) + "</th><th></th></tr></thead><tbody>" + rows + "</tbody></table></div></div>";
  }
  function flavorOpts(sel) {
    return '<option value=""></option>' + flavorList().map(function (f) {
      return '<option value="' + esc(f.code) + '"' + (f.code === sel ? " selected" : "") + ">" + esc(f.code + "  " + f.name) + "</option>";
    }).join("");
  }
  function render() {
    if (!doc) return;
    var host = doc.getElementById("view");
    if (!host || !cur) return;
    var rec = cur;
    var shifts = ["1st", "2nd"].map(function (s) { return '<option' + (rec.shift === s ? " selected" : "") + ">" + s + "</option>"; }).join("");
    var mixers = ["1", "2", "3", "4", "5", "6", "7", "8"].map(function (s) { return '<option value="' + s + '"' + (String(rec.mixer) === s ? " selected" : "") + ">Mixer " + s + "</option>"; }).join("");
    var statuses = ["draft", "complete", "verified"].map(function (s) { return '<option value="' + s + '"' + (rec.status === s ? " selected" : "") + ">" + esc(tx(s)) + "</option>"; }).join("");
    host.innerHTML = '<div id="btr-root">' +
      '<div class="card"><h2>' + esc(tx("title")) + "</h2>" +
      '<p class="hint">' + esc(tx("paper")) + "</p>" +
      '<p class="hint">' + esc(tx("refNote")) + "</p>" +
      bannerHtml() +
      '<div class="row">' +
      '<div style="flex:2"><label>' + esc(tx("flavor")) + '</label><select data-k="key" data-f="flavor">' + flavorOpts(rec.flavor_code) + "</select></div>" +
      '<div><label>' + esc(tx("date")) + '</label><input data-k="key" data-f="date" type="date" value="' + esc(rec.run_date) + '"></div>' +
      '<div><label>' + esc(tx("shift")) + '</label><select data-k="key" data-f="shift">' + shifts + "</select></div>" +
      '<div><label>' + esc(tx("mixer")) + '</label><select data-k="mixer">' + mixers + "</select></div>" +
      "</div>" +
      '<div class="row">' +
      '<div><label>' + esc(tx("operator")) + '</label><input data-k="header" data-f="operator" value="' + esc(rec.header.operator) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("allergen")) + '</label><div class="btr-alg">' + esc(allergenLine(rec)) + "</div></div>" +
      '<div><label>' + esc(tx("status")) + '</label><select data-k="status">' + statuses + "</select></div>" +
      '<div><label>' + esc(tx("qa")) + '</label><input data-k="verified" value="' + esc(rec.verified_by) + '" autocomplete="off"><p class="hint">' + esc(tx("qaHint")) + "</p></div>" +
      "</div>" +
      '<div class="row"><div style="flex:2"><label>' + esc(tx("notes")) + '</label><input data-k="header" data-f="notes" value="' + esc(rec.header.notes) + '" autocomplete="off"></div></div>' +
      scanNoteHtml(rec) +
      '<button type="button" class="primary" data-act="save">' + esc(tx("save")) + '</button> ' +
      '<button type="button" class="ghost" data-act="print">' + esc(tx("print")) + '</button> ' +
      '<button type="button" class="ghost" data-act="fill">' + esc(tx("fill")) + "</button>" +
      "</div>" +
      '<div class="card"><h2 class="sub2">' + esc(tx("ingredient")) + "</h2>" + gridHtml(rec) +
      '<button type="button" class="ghost" data-act="add-ing">' + esc(tx("addIng")) + '</button> ' +
      '<button type="button" class="ghost" data-act="add-batch">' + esc(tx("addBatch")) + "</button></div>" +
      '<div class="card"><div class="btr-split">' +
      '<div><h2 class="sub2">' + esc(tx("disposed")) + '</h2><table class="btr-mini"><thead><tr><th>' + esc(tx("batchNo")) + "</th><th>" + esc(tx("lbs")) + "</th><th>" + esc(tx("reason")) + "</th><th></th></tr></thead><tbody>" + miniRows(rec.disposed, "disp") + '</tbody></table><button type="button" class="ghost sm" data-act="add-disp">' + esc(tx("addRow")) + "</button></div>" +
      '<div><h2 class="sub2">' + esc(tx("reworkUsed")) + '</h2><table class="btr-mini"><thead><tr><th>' + esc(tx("date")) + "</th><th>" + esc(tx("timeAdded")) + "</th><th>" + esc(tx("weight")) + "</th><th></th></tr></thead><tbody>" + miniRows(rec.rework.used, "used") + '</tbody></table><button type="button" class="ghost sm" data-act="add-used">' + esc(tx("addRow")) + "</button></div>" +
      '<div><h2 class="sub2">' + esc(tx("reworkCreated")) + '</h2><table class="btr-mini"><thead><tr><th>' + esc(tx("date")) + "</th><th>" + esc(tx("weight")) + "</th><th></th></tr></thead><tbody>" + miniRows(rec.rework.created, "created") + '</tbody></table><button type="button" class="ghost sm" data-act="add-created">' + esc(tx("addRow")) + "</button></div>" +
      "</div></div>" +
      '<div class="card"><h2 class="sub2">' + esc(tx("traceable")) + "</h2>" + totalsHtml(rec) + '<p class="hint">' + esc(tx("traceHint")) + "</p></div>" +
      '<div class="card" id="btr-pack"><h2 class="sub2">' + esc(tx("packaging")) + "</h2>" +
      '<div class="row">' +
      '<div><label>' + esc(tx("bars")) + "</label>" + field('data-k="pack" data-f="total_bags"', rec.packaging.total_bags, rec.packaging.bags_src) + "</div>" +
      '<div><label>' + esc(tx("cartonLot")) + "</label>" + field('data-k="pack" data-f="carton_lot"', rec.packaging.carton_lot, rec.packaging.carton_src) + "</div>" +
      '<div><label>' + esc(tx("filmLot")) + " 1</label>" + field('data-k="film" data-i="0"', rec.packaging.film_lots[0], rec.packaging.film_src[0]) + "</div>" +
      '<div><label>' + esc(tx("filmLot")) + " 2</label>" + field('data-k="film" data-i="1"', rec.packaging.film_lots[1], rec.packaging.film_src[1]) + "</div>" +
      "</div>" + bagNoteHtml() + warnHtml(rec) +
      '<div class="btr-split">' +
      '<div><h2 class="sub2">' + esc(tx("filmVer")) + '</h2><div class="row"><div><label>' + esc(tx("verFlavor")) + '</label><input data-k="pack" data-f="film_flavor" value="' + esc(rec.packaging.film_flavor) + '" autocomplete="off"></div><div><label>' + esc(tx("verInit")) + '</label><input data-k="pack" data-f="film_initials" value="' + esc(rec.packaging.film_initials) + '" autocomplete="off"></div></div></div>' +
      '<div><h2 class="sub2">' + esc(tx("cartonVer")) + '</h2><div class="row"><div><label>' + esc(tx("verFlavor")) + '</label><input data-k="pack" data-f="carton_flavor" value="' + esc(rec.packaging.carton_flavor) + '" autocomplete="off"></div><div><label>' + esc(tx("verInit")) + '</label><input data-k="pack" data-f="carton_initials" value="' + esc(rec.packaging.carton_initials) + '" autocomplete="off"></div></div></div>' +
      "</div><p class=\"hint\">" + esc(tx("footnote")) + "</p></div>" +
      savedHtml() +
      "</div>";
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    markNav();
  }
  function paintTotals() {
    if (!doc || !cur) return;
    var t = computeTotals(cur);
    var map = { "btr-n-produced": t.produced, "btr-n-rework": t.rework_added, "btr-n-disposed": t.disposed, "btr-n-trace": t.traceable };
    Object.keys(map).forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.textContent = fmtNum(map[id]);
    });
  }
  function setSrcEl(input, src) {
    var tag = input.nextElementSibling;
    if (!tag || !tag.classList || !tag.classList.contains("btr-src")) return;
    var kind = src === "scanned" || src === "typed" || src === "reference" ? src : "";
    tag.className = "btr-src" + (kind ? " " + kind : "");
    tag.textContent = kind ? tx(kind) : "";
  }
  function touchSrc(obj, srcKey) {
    if (!srcKey) return "typed";
    obj[srcKey] = "typed";
    return "typed";
  }
  function onEdit(e) {
    if (!cur) return;
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var k = el.getAttribute("data-k");
    if (!k || k === "key") return;
    cur.dirty = true;
    if (k === "mixer") { cur.mixer = el.value; return; }
    if (k === "status") {
      cur.status = el.value;
      if (cur.status === "verified" && cur.verified_by && !cur.verified_at) cur.verified_at = new Date().toISOString();
      if (cur.status !== "verified") cur.verified_at = "";
      return;
    }
    if (k === "verified") { cur.verified_by = el.value; if (cur.status === "verified") cur.verified_at = cur.verified_at || new Date().toISOString(); return; }
    if (k === "header") { cur.header[el.getAttribute("data-f")] = el.value; return; }
    if (k === "batch") {
      var b = cur.batches[Number(el.getAttribute("data-i"))];
      if (!b) return;
      var f = el.getAttribute("data-f");
      b[f] = el.value;
      b[f === "code" ? "code_src" : "initials_src"] = "typed";
      setSrcEl(el, "typed");
      return;
    }
    if (k === "ing") {
      var row = cur.ingredients[Number(el.getAttribute("data-i"))];
      if (!row) return;
      var fieldName = el.getAttribute("data-f");
      row[fieldName] = el.value;
      var srcName = fieldName === "formula_lbs" ? "formula_src" : (fieldName + "_src");
      if (row[srcName] != null || fieldName === "ingredient" || fieldName === "allergen" || fieldName === "formula_lbs" || fieldName === "lot" || fieldName === "lot_2") {
        row[srcName] = "typed";
        setSrcEl(el, "typed");
      }
      if (fieldName === "formula_lbs") paintTotals();
      return;
    }
    if (k === "cell") {
      var ing = cur.ingredients[Number(el.getAttribute("data-i"))];
      var cell = ing && ing.cells[Number(el.getAttribute("data-b"))];
      if (!cell) return;
      cell.text = el.value;
      cell.src = el.value ? "typed" : "";
      setSrcEl(el, cell.src);
      paintTotals();
      return;
    }
    if (k === "disp") { cur.disposed[Number(el.getAttribute("data-i"))][el.getAttribute("data-f")] = el.value; paintTotals(); return; }
    if (k === "used") { cur.rework.used[Number(el.getAttribute("data-i"))][el.getAttribute("data-f")] = el.value; paintTotals(); return; }
    if (k === "created") { cur.rework.created[Number(el.getAttribute("data-i"))][el.getAttribute("data-f")] = el.value; return; }
    if (k === "pack") {
      var pf = el.getAttribute("data-f");
      cur.packaging[pf] = el.value;
      if (pf === "total_bags") { cur.packaging.bags_src = "typed"; setSrcEl(el, "typed"); }
      if (pf === "carton_lot") { cur.packaging.carton_src = "typed"; setSrcEl(el, "typed"); }
      if (pf === "film_flavor" || pf === "carton_flavor") paintWarn();
      return;
    }
    if (k === "film") {
      var fi = Number(el.getAttribute("data-i"));
      cur.packaging.film_lots[fi] = el.value;
      cur.packaging.film_src[fi] = "typed";
      setSrcEl(el, "typed");
      paintWarn();
    }
  }
  function paintWarn() {
    if (!doc || !cur) return;
    var slot = doc.getElementById("btr-warn");
    var html = warnHtml(cur);
    if (!html) { if (slot) slot.remove(); return; }
    if (slot) { slot.outerHTML = html; return; }
    var pack = doc.getElementById("btr-pack");
    if (!pack) return;
    var wrap = doc.createElement("div");
    wrap.innerHTML = html;
    var split = pack.querySelector(".btr-split");
    if (split) pack.insertBefore(wrap.firstChild, split);
    else pack.appendChild(wrap.firstChild);
  }
  function readKey() {
    var rootEl = doc.getElementById("btr-root");
    if (!rootEl) return { flavor: cur.flavor_code, date: cur.run_date, shift: cur.shift };
    function val(f) { var el = rootEl.querySelector('[data-k="key"][data-f="' + f + '"]'); return el ? el.value : ""; }
    return { flavor: val("flavor"), date: val("date"), shift: val("shift") };
  }
  function loadKey(key, opts) {
    opts = opts || {};
    var flavor = key.flavor || "";
    var date = key.date || today();
    var shift = key.shift || "1st";
    if (!flavor) {
      cur = fresh("", date, shift, opts.mixer || (cur && cur.mixer) || "1");
      cur.run_date = date;
      cur.shift = shift;
      bagInfo = null;
      render();
      return Promise.resolve();
    }
    return ensureTrace().then(function () { return loadRows(); }).then(function () {
      var existing = findCached(flavor, date, shift);
      if (existing && !opts.forceNew) {
        cur = hydrate(existing);
        bagInfo = null;
        render();
        return;
      }
      cur = fresh(flavor, date, shift, opts.mixer || "1");
      return loadBags(cur).then(function () { render(); });
    });
  }
  function onClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
    if (!btn || !cur) return;
    var act = btn.getAttribute("data-act");
    if (act === "save") { save(); return; }
    if (act === "print") { printRecord(); return; }
    if (act === "fill") { fillScans(); return; }
    if (act === "add-ing") {
      cur.ingredients.push(makeIng({ key: "row" + Date.now().toString(36), ingredient_src: "typed" }));
      syncCells(cur); cur.dirty = true; render(); return;
    }
    if (act === "add-batch") {
      cur.batches.push(emptyBatch()); syncCells(cur); cur.dirty = true; render(); return;
    }
    if (act === "add-disp") { cur.disposed.push(blankDisp()); cur.dirty = true; render(); return; }
    if (act === "add-used") { cur.rework.used.push(blankUsed()); cur.dirty = true; render(); return; }
    if (act === "add-created") { cur.rework.created.push(blankCreated()); cur.dirty = true; render(); return; }
    if (act === "del-ing") { cur.ingredients.splice(Number(btn.getAttribute("data-i")), 1); cur.dirty = true; render(); return; }
    if (act === "del-disp") { cur.disposed.splice(Number(btn.getAttribute("data-i")), 1); if (!cur.disposed.length) cur.disposed.push(blankDisp()); cur.dirty = true; render(); return; }
    if (act === "del-used") { cur.rework.used.splice(Number(btn.getAttribute("data-i")), 1); if (!cur.rework.used.length) cur.rework.used.push(blankUsed()); cur.dirty = true; render(); return; }
    if (act === "del-created") { cur.rework.created.splice(Number(btn.getAttribute("data-i")), 1); if (!cur.rework.created.length) cur.rework.created.push(blankCreated()); cur.dirty = true; render(); return; }
    if (act === "open-saved") {
      var parts = String(btn.getAttribute("data-key") || "").split("|");
      if (cur.dirty && !root.confirm(tx("discard"))) return;
      loadKey({ flavor: parts[0], date: parts[1], shift: parts[2] });
    }
  }
  function onKeyChange(e) {
    var el = e.target;
    if (!el || el.getAttribute("data-k") !== "key") return;
    var next = readKey();
    if (cur.dirty && (next.flavor !== cur.flavor_code || next.date !== cur.run_date || next.shift !== cur.shift)) {
      if (!root.confirm(tx("discard"))) { render(); return; }
    }
    loadKey(next, { mixer: cur.mixer });
  }
  function fillScans() {
    if (!cur || !cur.flavor_code) { toast(tx("needFlavor")); return; }
    if (cur.dirty && !root.confirm(tx("discard"))) return;
    ensureTrace().then(function () {
      var mixer = cur.mixer;
      var shift = cur.shift;
      var date = cur.run_date;
      var flavor = cur.flavor_code;
      var keptId = cur.id;
      var keptVerified = cur.verified_by;
      var keptStatus = cur.status;
      cur = fresh(flavor, date, shift, mixer);
      cur.id = keptId;
      cur.verified_by = keptVerified;
      cur.status = keptStatus;
      cur.dirty = true;
      return loadBags(cur);
    }).then(function () { render(); });
  }
  function payload(rec) {
    var totals = computeTotals(rec);
    var row = {
      run_date: rec.run_date,
      shift: rec.shift,
      flavor_code: rec.flavor_code,
      flavor_name: rec.flavor_name,
      mixer: rec.mixer || "",
      header: {
        operator: rec.header.operator || "",
        allergen: rec.header.allergen || "",
        allergen_code: rec.header.allergen_code || "",
        notes: rec.header.notes || "",
        batches: rec.batches,
        film_skipped: rec.film_skipped || []
      },
      ingredients: rec.ingredients,
      disposed: rec.disposed,
      rework: rec.rework,
      totals: totals,
      packaging: rec.packaging,
      status: rec.status || "draft",
      entered_by: rec.header.operator || rec.entered_by || "",
      verified_by: rec.verified_by || "",
      verified_at: rec.status === "verified" ? (rec.verified_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    };
    if (rec.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(rec.id))) row.id = rec.id;
    return row;
  }
  function saveLocal(row) {
    var rows = lsGet();
    var idx = -1;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].flavor_code).toUpperCase() === String(row.flavor_code).toUpperCase() && String(rows[i].run_date).slice(0, 10) === row.run_date && rows[i].shift === row.shift) idx = i;
    }
    if (!row.id) row.id = "BTR-" + Date.now().toString(36);
    row.created_at = idx >= 0 ? (rows[idx].created_at || row.updated_at) : row.updated_at;
    if (idx >= 0) rows[idx] = row; else rows.unshift(row);
    lsSet(rows);
    cache = rows;
    cacheMode = cacheMode || "local";
    return row;
  }
  function save() {
    if (!cur || !cur.flavor_code || !cur.run_date || !cur.shift) { toast(tx("needFlavor")); return; }
    var row = payload(cur);
    waitMode().then(function (mode) {
      if (mode !== "cloud" || !client()) {
        var saved = saveLocal(row);
        cur.id = saved.id;
        cur.dirty = false;
        toast(tx("savedOk"));
        render();
        return;
      }
      var q = client().from("batch_records").upsert(row, { onConflict: "run_date,shift,flavor_code" }).select();
      return q.then(function (r) {
        if (r && r.error) {
          var msg = r.error.message || tx("saveFail");
          tableMissing = /batch_records|schema cache|does not exist|PGRST205|42P01/i.test(msg);
          var kept = saveLocal(row);
          cur.id = kept.id;
          cur.dirty = false;
          toast(tx("savedOk"));
          render();
          return;
        }
        tableMissing = false;
        cacheMode = "cloud";
        var got = r && r.data && r.data[0];
        if (got) cur = hydrate(got);
        else cur.dirty = false;
        return loadRows().then(function () { toast(tx("savedOk")); render(); });
      });
    }).catch(function () { toast(tx("saveFail")); });
  }
  function printRecord() {
    if (!cur || !doc) return;
    var rec = cur;
    var totals = computeTotals(rec);
    var w = root.open("", "_blank");
    if (!w) { root.print(); return; }
    var dcCss = "@page{size:letter landscape;margin:0.7in 0.45in 0.75in 0.45in;" +
      "@top-left{content:\"SMACKIN' SNACKS  |  Approved By: Quality Assurance Manager\";font:bold 9px Arial,sans-serif}" +
      "@top-right{content:\"" + DC.name + "  |  Version " + DC.ver + "  |  Effective " + DC.eff + "\";font:9px Arial,sans-serif}" +
      "@bottom-left{content:\"This document is the property of Smackin' Snacks. Do not copy, reproduce, or distribute without expressed written permission. Smackin' Snacks Inc. 1736 S. 4250 W. SLC, Utah 84104\";font:8px Arial,sans-serif;color:#555}" +
      "@bottom-right{content:\"Page \" counter(page) \" of \" counter(pages);font:9px Arial,sans-serif}}";
    function td(v) { return "<td>" + esc(v || "") + "</td>"; }
    var head = "<tr><th>Ingredient</th><th>Allergen if applicable</th><th>Formula weight (lb)</th><th>Lot #</th>";
    rec.batches.forEach(function (b, i) { head += "<th>Batch " + esc(b.code || "______") + "<br>Initials " + esc(b.initials || "_____") + "</th>"; });
    head += "<th>Addtl lot #</th></tr>";
    var body = rec.ingredients.map(function (row) {
      var cells = td(row.ingredient) + td(row.allergen) + td(row.formula_lbs) + td(row.lot);
      rec.batches.forEach(function (b, i) { cells += td(row.cells[i] && row.cells[i].text); });
      cells += td(row.lot_2);
      return "<tr>" + cells + "</tr>";
    }).join("");
    var disp = rec.disposed.filter(function (r) { return r.batch || r.lbs || r.reason; }).map(function (r) {
      return "<tr>" + td(r.batch) + td(r.lbs) + td(r.reason) + "</tr>";
    }).join("") || "<tr><td colspan=\"3\"></td></tr>";
    var used = rec.rework.used.filter(function (r) { return r.date || r.time || r.weight; }).map(function (r) {
      return "<tr>" + td(r.date) + td(r.time) + td(r.weight) + "</tr>";
    }).join("") || "<tr><td colspan=\"3\"></td></tr>";
    var made = rec.rework.created.filter(function (r) { return r.date || r.weight; }).map(function (r) {
      return "<tr>" + td(r.date) + td(r.weight) + "</tr>";
    }).join("") || "<tr><td colspan=\"2\"></td></tr>";
    var rev = "<h3>Revision History</h3><table><tr><th>Version</th><th>Date</th><th>Change made</th><th>Reason for change</th><th>Approved by</th></tr>" +
      "<tr><td>" + DC.ver + "</td><td>" + DC.eff + "</td><td>Initial release</td><td>SQF document control</td><td>Quality Assurance Manager</td></tr></table>";
    var html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + esc(DC.name) + "</title><style>" + dcCss +
      "body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#222}table{border-collapse:collapse;width:100%;margin:6px 0 12px}th,td{border:1px solid #ccc;padding:3px 4px;text-align:left;vertical-align:top}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:14px 0 4px}h3{margin:16px 0 4px}.muted{color:#555}</style></head><body>" +
      "<h1>" + esc(DC.name) + "</h1>" +
      "<p class=\"muted\">" + esc(tx("paperPrint")) + "</p>" +
      "<p><b>Flavor:</b> " + esc(rec.flavor_code + " " + rec.flavor_name) +
      " &nbsp; <b>Allergen:</b> " + esc(allergenLine(rec)) +
      " &nbsp; <b>Date:</b> " + esc(rec.run_date) +
      " &nbsp; <b>Shift:</b> " + esc(rec.shift) +
      " &nbsp; <b>Mixer:</b> " + esc(rec.mixer) +
      " &nbsp; <b>Operator:</b> " + esc(rec.header.operator) + "</p>" +
      (rec.header.notes ? "<p><b>Notes:</b> " + esc(rec.header.notes) + "</p>" : "") +
      "<table>" + head + body + "</table>" +
      "<h2>Disposed batches at mixing</h2><table><tr><th>Batch #</th><th>Lbs disposed</th><th>Reason</th></tr>" + disp + "</table>" +
      "<h2>Rework used</h2><table><tr><th>Date</th><th>Time added</th><th>Weight</th></tr>" + used + "</table>" +
      "<h2>Rework created</h2><table><tr><th>Date</th><th>Weight</th></tr>" + made + "</table>" +
      "<h2>Production data</h2><table><tr><th>Total pounds produced</th><th>Total pounds rework added</th><th>Total pounds disposed</th><th>Total pounds traceable</th></tr><tr>" +
      td(fmtNum(totals.produced)) + td(fmtNum(totals.rework_added)) + td(fmtNum(totals.disposed)) + td(fmtNum(totals.traceable)) + "</tr></table>" +
      "<p class=\"muted\">Traceable = produced + rework added - disposed.</p>" +
      "<h2>Packaging data</h2><table><tr><th>Total bars made (bags)</th><th>Lot code on carton</th><th>Film lot code</th><th>Film lot code</th></tr><tr>" +
      td(rec.packaging.total_bags) + td(rec.packaging.carton_lot) + td(rec.packaging.film_lots[0]) + td(rec.packaging.film_lots[1]) + "</tr></table>" +
      "<h2>Packaging verification</h2><table><tr><th></th><th>Flavor</th><th>Initials</th></tr>" +
      "<tr><td>Film verification</td>" + td(rec.packaging.film_flavor) + td(rec.packaging.film_initials) + "</tr>" +
      "<tr><td>Carton verification</td>" + td(rec.packaging.carton_flavor) + td(rec.packaging.carton_initials) + "</tr></table>" +
      "<p>" + esc(tx("footnote")) + "</p>" +
      "<p style=\"margin-top:18px\">QA verification (name only, not an e-sign): " + esc(rec.verified_by || "______________________") + " &nbsp; Date: __________</p>" +
      rev + "</body></html>";
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300);
  }

  function markNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || !active) return;
    var mine = doc.getElementById("btr-nav");
    if (!mine) return;
    nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
    mine.classList.add("active");
  }
  function injectNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("btr-nav")) return;
    var anchor = doc.getElementById("trc-nav-mix");
    if (!anchor) {
      var items = nav.querySelectorAll("button.navitem");
      for (var i = 0; i < items.length; i++) {
        var oc = items[i].getAttribute("onclick") || "";
        if (oc === "UI_go('mixing')" || oc.indexOf("UI_go('mixing')") >= 0) { anchor = items[i]; break; }
      }
    }
    if (!anchor) return;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "btr-nav";
    btn.innerHTML = '<i class="navico" data-lucide="clipboard-list"></i><span>Batch Tracking Record</span>';
    btn.addEventListener("click", function (ev) { ev.preventDefault(); open(); });
    if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else anchor.parentNode.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    if (active) markNav();
  }
  function styleOnce() {
    if (!doc || doc.getElementById("btr-style")) return;
    var s = doc.createElement("style");
    s.id = "btr-style";
    s.textContent = "#btr-root .btr-scroll{overflow:auto}#btr-root .btr-grid{min-width:1180px}#btr-root .btr-grid input,#btr-root .btr-mini input{padding:6px 8px;font-size:14px;min-width:72px}#btr-root .btr-grid td:first-child input{min-width:220px}#btr-root .btr-grid td:nth-child(2) input{min-width:120px}#btr-root .btr-grid td:nth-child(4) input,#btr-root .btr-grid td:nth-last-child(2) input{min-width:130px}#btr-root .btr-grid th,#btr-root .btr-grid td{vertical-align:top}#btr-root .btr-src{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;border-radius:4px;padding:1px 5px;margin-top:3px}#btr-root .btr-src:empty{display:none}#btr-root .btr-src.scanned{background:#E0F4E8;color:#1d5631}#btr-root .btr-src.typed{background:#E1EEF7;color:#04223B}#btr-root .btr-src.reference{background:#FFF6E9;color:#7a4d05}#btr-root .btr-warn{background:#FBE3E0;color:#7d1b12;border-radius:8px;padding:8px 10px;margin:8px 0}#btr-root .btr-wip{font-size:11px;font-weight:700;color:#7a4d05;margin-top:3px}#btr-root .btr-alg{font-weight:800;padding-top:12px}#btr-root .btr-totals{display:flex;gap:12px;flex-wrap:wrap}#btr-root .btr-totals>div{flex:1;min-width:140px;background:#04223B;color:#fff;border-radius:10px;padding:12px}#btr-root .btr-totals b{display:block;font-size:12px;font-weight:700;opacity:.85}#btr-root .btr-totals div div{font-size:22px;font-weight:800}#btr-root .btr-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}#btr-root .btr-sub{font-size:11px;font-weight:700;margin-top:6px;color:#445}#btr-root .btr-batch{min-width:108px}";
    doc.head.appendChild(s);
  }
  function open(opts) {
    opts = opts || {};
    if (!doc) return;
    releaseTrace();
    active = true;
    styleOnce();
    var host = doc.getElementById("view");
    if (host) host.innerHTML = '<div id="btr-root"><div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"muted\">" + esc(tx("loading")) + "</p></div></div>";
    try { var n = doc.getElementById("nav"), bd = doc.getElementById("navBackdrop"); if (n) n.classList.remove("open"); if (bd) bd.classList.remove("show"); } catch (e) {}
    var flavor = opts.flavor || "";
    var date = opts.date || today();
    var shift = opts.shift || "1st";
    loadKey({ flavor: flavor, date: date, shift: shift }, { mixer: opts.mixer || "1" });
  }
  function openFromMix() {
    var st = traceState();
    var flavor = st && st.W && st.W.mix ? st.W.mix.flavor : "";
    var mixer = st && st.ST ? st.ST.mixer : "";
    open({ flavor: flavor || "", mixer: mixer || "" });
  }
  function onScreen() {
    return !!(doc && doc.getElementById("btr-root"));
  }

  var api = {
    open: open,
    openFromMix: openFromMix,
    _applyScans: applyScans,
    _computeTotals: computeTotals,
    _filmWarnings: filmWarnings,
    _referenceIngredients: referenceIngredients,
    _wipNote: wipNote,
    _pounds: pounds,
    _padBatches: padBatches
  };
  root.BATCHREC = api;

  if (doc) {
    doc.addEventListener("input", function (e) {
      if (!onScreen()) return;
      onEdit(e);
    }, true);
    doc.addEventListener("change", function (e) {
      if (!onScreen()) return;
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-k") === "key") onKeyChange(e);
      else onEdit(e);
    }, true);
    doc.addEventListener("click", function (e) {
      if (!onScreen()) return;
      onClick(e);
    });
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && active && onScreen()) setTimeout(render, 0);
      }, false);
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return active && onScreen(); });
    try {
      var mo = new MutationObserver(function () {
        injectNav();
        if (active && doc.getElementById("view") && !doc.getElementById("btr-root")) render();
      });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); });
    else setTimeout(injectNav, 400);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      applyScans: applyScans,
      computeTotals: computeTotals,
      filmWarnings: filmWarnings,
      referenceIngredients: referenceIngredients,
      wipNote: wipNote,
      pounds: pounds,
      padBatches: padBatches
    };
  }
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================================
   Receiving SOP checklist (receiving-sop.js)
   WHSE_FORM_1.0 Warehouse Receiving Log and WHSE_FORM_3.0 HOLD Log.
   One receiving row per lot. Any N or UA sets receiving_log.on_hold and
   writes hold_log (status held). Release clears the hold. Thrown away,
   returned to vendor, and other keep the lot out of FEFO and Use.
   Approved supplier is a manual Y/N. The vendor register stays in Drive.
   Temperature is recorded. A dry-range mismatch does not block the save.
   Paper stays the backup until Troy confirms this storage.
   Does not import Smackin Receiving Log.xlsx or the 2023 WIP history.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var cfg = root.SMACKIN_CONFIG || {};
  var LS_HOLDS = "smk-hold-log-v1";
  var FORM_VERSION = "WHSE_FORM_1.0 v1.0 12.12.25";
  var CHECKS = [
    { key: "chk_trailer_sealed", kind: "YN", label: "Trailer Sealed/Padlock" },
    { key: "chk_trailer_clean", kind: "YN", label: "Trailer clean, no pests, no holes, no off odors" },
    { key: "chk_coa_label", kind: "AU", label: "COA/Label Acceptable" },
    { key: "chk_approved_supplier", kind: "YN", label: "Approved Supplier", hint: "supplier" },
    { key: "chk_carrier_sanitation", kind: "AU", label: "Carrier Sanitation" },
    { key: "chk_material_condition", kind: "AU", label: "Material Condition" }
  ];
  var BLOCK = { held: 1, destroyed: 1, returned_to_vendor: 1, other: 1 };
  var RECV_HEAD = [
    "Date and Time", "Receiver", "Supplier", "Raw Material", "Lot #", "# of Cases",
    "Trailer Sealed/Padlock", "Seal #",
    "Trailer clean, no pests, no holes, no off odors",
    "COA/Label Acceptable", "Approved Supplier", "Carrier Sanitation", "Material Condition",
    "Deviation Actions", "Temperature F", "Allergen", "On Hold"
  ];
  var HOLD_HEAD = [
    "Date", "Warehouse Personnel", "Product, Ingredient, or Packaging Affected",
    "Lot #", "Quantity", "Reason for Hold", "Disposition Date", "Disposition"
  ];

  var I18N = {
    en: {
      title: "WHSE_FORM_1.0 Warehouse Receiving Log",
      paper: "Paper Receiving Log and HOLD Log stay the backup until Troy confirms this screen is the stored record.",
      oneLot: "One row per lot. A second lot on the same truck gets its own row.",
      supplierHint: "Manual Y or N. The approved vendor register is the Drive spreadsheet.",
      allergenHint: "Y means an allergen is present and the load is segregated.",
      devHint: "Required when any check is N or UA. That lot is written to the HOLD Log and skipped by FEFO and Use.",
      time: "Time", item: "Item code", seal: "Seal #", temp: "Temperature F",
      allergen: "Allergen present", deviation: "Deviation Actions",
      holdTitle: "WHSE_FORM_3.0 Warehouse HOLD Log",
      holdHint: "Release puts the lot back into FEFO and Use. Thrown away, returned to vendor, and other close the hold and keep the lot unavailable.",
      exportRecv: "Export Receiving Log CSV", exportHold: "Export HOLD Log CSV",
      loading: "Loading the HOLD Log...", emptyHold: "No HOLD Log rows yet.",
      by: "Disposition by", note: "Note", saveDisp: "Save disposition",
      pickDisp: "Pick a disposition.", needBy: "Disposition by is required.",
      needNote: "Other needs a note.",
      releaseAsk: "Release this lot back to FEFO and Use? The checklist still has N or UA.",
      released: "Released. The lot is available again.",
      closed: "Hold closed. The lot stays out of FEFO and Use.",
      held: "ON HOLD",
      willHold: "This save puts the lot ON HOLD.",
      stay: "Checks pass. This lot stays on hold until a release is recorded on the HOLD Log.",
      holdFail: "Receipt saved. HOLD Log write failed.",
      dup: "This lot already has a receiving row. Edit that row. The SOP keeps one row per lot.",
      dateReq: "Date is required.", timeReq: "Time is required.", recvReq: "Receiver is required.",
      supReq: "Supplier is required.", matReq: "Raw material is required.",
      lotReq: "Lot # is required. One row per lot.", qtyReq: "# of cases is required.",
      ynReq: " needs Y or N.", auReq: " needs A or UA.",
      sealReq: "Seal # is required when the trailer is sealed.",
      tempReq: "Temperature F is required. The value is recorded either way.",
      devReq: "Deviation Actions is required when a check is N or UA.",
      algReq: "Allergen present needs Y or N.",
      tempWarn: "Recorded {n} F. Receiving dry range in the SOP is 80 to 110 F. Shipping dry range is 40 to 110 F. This value is saved either way. Tell Monica if those ranges should match."
    },
    es: {
      title: "WHSE_FORM_1.0 Registro de recibo",
      paper: "El papel del registro de recibo y del registro HOLD sigue como respaldo hasta que Troy confirme que esta pantalla es el registro guardado.",
      oneLot: "Una fila por lote. Un segundo lote en el mismo camion lleva su propia fila.",
      supplierHint: "Y o N manual. El registro de proveedores aprobados es la hoja de Drive.",
      allergenHint: "Y significa que hay alergeno y la carga esta separada.",
      devHint: "Obligatorio si alguna revision es N o UA. Ese lote va al registro HOLD y FEFO y Uso lo saltan.",
      time: "Hora", item: "Codigo de item", seal: "Sello #", temp: "Temperatura F",
      allergen: "Alergeno presente", deviation: "Acciones de desviacion",
      holdTitle: "WHSE_FORM_3.0 Registro HOLD",
      holdHint: "Liberar devuelve el lote a FEFO y Uso. Desechado, devuelto al proveedor y otro cierran la retencion y el lote sigue no disponible.",
      exportRecv: "Exportar registro de recibo CSV", exportHold: "Exportar registro HOLD CSV",
      loading: "Cargando el registro HOLD...", emptyHold: "Aun no hay filas en el registro HOLD.",
      by: "Disposicion por", note: "Nota", saveDisp: "Guardar disposicion",
      pickDisp: "Elija una disposicion.", needBy: "Disposicion por es obligatorio.",
      needNote: "Otro necesita una nota.",
      releaseAsk: "Liberar este lote a FEFO y Uso? La lista todavia tiene N o UA.",
      released: "Liberado. El lote vuelve a estar disponible.",
      closed: "Retencion cerrada. El lote sigue fuera de FEFO y Uso.",
      held: "EN HOLD",
      willHold: "Este guardado pone el lote EN HOLD.",
      stay: "Las revisiones pasan. El lote sigue en hold hasta registrar una liberacion en el registro HOLD.",
      holdFail: "Recibo guardado. No se escribio el registro HOLD.",
      dup: "Este lote ya tiene una fila de recibo. Edite esa fila. El SOP guarda una fila por lote.",
      dateReq: "La fecha es obligatoria.", timeReq: "La hora es obligatoria.", recvReq: "Quien recibe es obligatorio.",
      supReq: "El proveedor es obligatorio.", matReq: "La materia prima es obligatoria.",
      lotReq: "El lote es obligatorio. Una fila por lote.", qtyReq: "El numero de cajas es obligatorio.",
      ynReq: " necesita Y o N.", auReq: " necesita A o UA.",
      sealReq: "El sello es obligatorio cuando el trailer esta sellado.",
      tempReq: "La temperatura F es obligatoria. El valor se registra de todas formas.",
      devReq: "Las acciones de desviacion son obligatorias cuando una revision es N o UA.",
      algReq: "Alergeno presente necesita Y o N.",
      tempWarn: "Registrado {n} F. El rango seco de recibo en el SOP es 80 a 110 F. El rango seco de envio es 40 a 110 F. Este valor se guarda igual. Avise a Monica si esos rangos deben coincidir."
    },
    pt: {
      title: "WHSE_FORM_1.0 Registro de recebimento",
      paper: "O papel do registro de recebimento e do registro HOLD continua como copia de apoio ate Troy confirmar que esta tela e o registro guardado.",
      oneLot: "Uma linha por lote. Um segundo lote no mesmo caminhao tem a propria linha.",
      supplierHint: "Y ou N manual. O cadastro de fornecedores aprovados e a planilha do Drive.",
      allergenHint: "Y significa que ha alergeno e a carga esta separada.",
      devHint: "Obrigatorio se alguma checagem for N ou UA. Esse lote vai para o registro HOLD e o FEFO e o Uso pulam ele.",
      time: "Hora", item: "Codigo do item", seal: "Lacre #", temp: "Temperatura F",
      allergen: "Alergeno presente", deviation: "Acoes de desvio",
      holdTitle: "WHSE_FORM_3.0 Registro HOLD",
      holdHint: "Liberar devolve o lote ao FEFO e ao Uso. Descartado, devolvido ao fornecedor e outro fecham a retencao e o lote continua indisponivel.",
      exportRecv: "Exportar registro de recebimento CSV", exportHold: "Exportar registro HOLD CSV",
      loading: "Carregando o registro HOLD...", emptyHold: "Ainda nao ha linhas no registro HOLD.",
      by: "Disposicao por", note: "Nota", saveDisp: "Salvar disposicao",
      pickDisp: "Escolha uma disposicao.", needBy: "Disposicao por e obrigatorio.",
      needNote: "Outro precisa de uma nota.",
      releaseAsk: "Liberar este lote para FEFO e Uso? A lista ainda tem N ou UA.",
      released: "Liberado. O lote volta a ficar disponivel.",
      closed: "Retencao fechada. O lote continua fora do FEFO e do Uso.",
      held: "EM HOLD",
      willHold: "Este salvamento coloca o lote EM HOLD.",
      stay: "As checagens passam. O lote continua em hold ate registrar uma liberacao no registro HOLD.",
      holdFail: "Recebimento salvo. O registro HOLD nao foi gravado.",
      dup: "Este lote ja tem uma linha de recebimento. Edite essa linha. O SOP guarda uma linha por lote.",
      dateReq: "A data e obrigatoria.", timeReq: "A hora e obrigatoria.", recvReq: "Quem recebe e obrigatorio.",
      supReq: "O fornecedor e obrigatorio.", matReq: "A materia-prima e obrigatoria.",
      lotReq: "O lote e obrigatorio. Uma linha por lote.", qtyReq: "O numero de caixas e obrigatorio.",
      ynReq: " precisa de Y ou N.", auReq: " precisa de A ou UA.",
      sealReq: "O lacre e obrigatorio quando o trailer esta lacrado.",
      tempReq: "A temperatura F e obrigatoria. O valor e registrado de qualquer forma.",
      devReq: "As acoes de desvio sao obrigatorias quando uma checagem e N ou UA.",
      algReq: "Alergeno presente precisa de Y ou N.",
      tempWarn: "Registrado {n} F. A faixa seca de recebimento no SOP e 80 a 110 F. A faixa seca de envio e 40 a 110 F. Este valor e salvo mesmo assim. Avise a Monica se essas faixas devem coincidir."
    }
  };

  var holds = [];
  var loaded = false;
  var loadedMode = "";
  var lastFetch = 0;
  var inflight = null;
  var revision = 0;
  var sb = null;

  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(m) {
    if (!doc) return;
    var t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 4200);
  }
  function normLot(lot) {
    return String(lot || "").toUpperCase().replace(/\s+/g, "");
  }
  function isUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
  }
  function checklistOf(r) {
    var c = r && r.checklist;
    if (!c) return {};
    if (typeof c === "string") {
      try { return JSON.parse(c) || {}; } catch (e) { return {}; }
    }
    return c;
  }
  function cloudMode() {
    try { return !!(root.DB && root.DB.mode === "cloud"); } catch (e) { return false; }
  }
  function client() {
    if (sb) return sb;
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
    return sb;
  }
  function readLocal() {
    try { return JSON.parse(root.localStorage.getItem(LS_HOLDS) || "[]"); } catch (e) { return []; }
  }
  function writeLocal(rows) {
    try { root.localStorage.setItem(LS_HOLDS, JSON.stringify(rows || [])); } catch (e) {}
  }
  function recvRows() {
    try { return (root.DB && root.DB.receivingLog) ? root.DB.receivingLog() : []; } catch (e) { return []; }
  }
  function checkValue(input, key) {
    return String(input && input[key] != null ? input[key] : "").trim().toUpperCase();
  }
  function failingChecks(input) {
    var out = [];
    CHECKS.forEach(function (c) {
      var v = checkValue(input, c.key);
      if (v === "N" || v === "UA") out.push({ key: c.key, label: c.label, value: v });
    });
    return out;
  }
  function reasonText(input) {
    var fails = failingChecks(input);
    var parts = [];
    if (fails.length) parts.push(fails.map(function (f) { return f.label + ": " + f.value; }).join("; "));
    var dev = String(input.deviation_actions || "").trim();
    if (dev) parts.push("Deviation: " + dev);
    return parts.join(". ");
  }
  function tempWarn(v) {
    if (v === "" || v == null) return "";
    var n = Number(v);
    if (isNaN(n)) return "";
    if (n >= 80 && n <= 110) return "";
    return tx("tempWarn").replace("{n}", String(n));
  }
  function validate(input) {
    input = input || {};
    var errors = [];
    if (!String(input.recv_date || "").trim()) errors.push(tx("dateReq"));
    if (!String(input.received_time || "").trim()) errors.push(tx("timeReq"));
    if (!String(input.received_by || "").trim()) errors.push(tx("recvReq"));
    if (!String(input.supplier || "").trim()) errors.push(tx("supReq"));
    if (!String(input.contents || "").trim()) errors.push(tx("matReq"));
    if (!normLot(input.lot)) errors.push(tx("lotReq"));
    if (String(input.qty_received == null ? "" : input.qty_received).trim() === "" || isNaN(Number(input.qty_received))) errors.push(tx("qtyReq"));
    CHECKS.forEach(function (c) {
      var v = checkValue(input, c.key);
      if (c.kind === "YN" && v !== "Y" && v !== "N") errors.push(c.label + tx("ynReq"));
      if (c.kind === "AU" && v !== "A" && v !== "UA") errors.push(c.label + tx("auReq"));
    });
    var alg = checkValue(input, "allergen");
    if (!alg && input.allergen_flag === true) alg = "Y";
    if (!alg && input.allergen_flag === false) alg = "N";
    if (alg !== "Y" && alg !== "N") errors.push(tx("algReq"));
    if (checkValue(input, "chk_trailer_sealed") === "Y" && !String(input.seal_number || "").trim()) errors.push(tx("sealReq"));
    if (String(input.temperature_f == null ? "" : input.temperature_f).trim() === "" || isNaN(Number(input.temperature_f))) errors.push(tx("tempReq"));
    if (failingChecks(input).length && !String(input.deviation_actions || "").trim()) errors.push(tx("devReq"));
    if (input.duplicate) errors.push(tx("dup") + (input.duplicate === true ? "" : " (" + input.duplicate + ")"));
    return errors;
  }
  function lotBlocked(list, lot) {
    var key = normLot(lot);
    if (!key) return null;
    var rows = list || [];
    for (var i = 0; i < rows.length; i++) {
      if (normLot(rows[i].lot) === key && BLOCK[rows[i].status]) return rows[i];
    }
    return null;
  }
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function dateTimeCell(r) {
    var day = String((r && r.recv_date) || "").slice(0, 10);
    var t = checklistOf(r).received_time || "";
    return t ? (day + " " + t) : day;
  }
  function allergenCell(r) {
    if (!r || r.allergen_flag == null || r.allergen_flag === "") return "";
    return r.allergen_flag ? "Y" : "N";
  }
  function receivingCsv(rows) {
    var lines = [RECV_HEAD.map(csvCell).join(",")];
    (rows || []).forEach(function (r) {
      lines.push([
        dateTimeCell(r), r.received_by, r.supplier, r.contents, r.lot, r.qty_received,
        r.chk_trailer_sealed, r.seal_number, r.chk_trailer_clean, r.chk_coa_label,
        r.chk_approved_supplier, r.chk_carrier_sanitation, r.chk_material_condition,
        r.deviation_actions, r.temperature_f == null ? "" : r.temperature_f,
        allergenCell(r), r.on_hold ? "Yes" : "No"
      ].map(csvCell).join(","));
    });
    return lines.join("\r\n");
  }
  function dispPhrase(h) {
    var s = String((h && (h.disposition || h.status)) || "");
    if (!s || s === "held") return "";
    if (s === "released") return "Released";
    if (s === "destroyed") return "Thrown away";
    if (s === "returned_to_vendor") return "Returned to vendor";
    if (s === "other") return h.disposition_note ? ("Other: " + h.disposition_note) : "Other";
    return s;
  }
  function denverDay(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d.getTime())) return String(s).slice(0, 10);
    try {
      var fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" });
      return fmt.format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }
  function holdCsv(rows) {
    var lines = [HOLD_HEAD.map(csvCell).join(",")];
    (rows || []).forEach(function (h) {
      var closed = h.status && h.status !== "held";
      lines.push([
        denverDay(h.hold_at), h.held_by, h.item_name, h.lot, h.hold_qty,
        h.hold_reason, closed ? denverDay(h.disposition_at) : "", dispPhrase(h)
      ].map(csvCell).join(","));
    });
    return lines.join("\r\n");
  }
  function download(name, text) {
    if (!doc) return;
    var blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
    var a = doc.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 0);
  }
  function val(id) {
    var el = doc && doc.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  function radioVal(name) {
    if (!doc) return "";
    var el = doc.querySelector('input[name="' + name + '"]:checked');
    return el ? String(el.value || "") : "";
  }
  function nowTime() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function matchItem(code) {
    var q = String(code || "").trim().toLowerCase();
    if (!q || !root.DB || !root.DB.items) return null;
    var items = [];
    try { items = root.DB.items() || []; } catch (e) { items = []; }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (String(it.code || "").toLowerCase() === q || String(it.id || "").toLowerCase() === q) return it;
    }
    return null;
  }
  function duplicateOf(lot, id) {
    var key = normLot(lot);
    if (!key) return "";
    var rows = recvRows();
    for (var i = 0; i < rows.length; i++) {
      if (id && String(rows[i].id) === String(id)) continue;
      if (normLot(rows[i].lot) === key) {
        return String(rows[i].recv_date || "").slice(0, 10) + (rows[i].supplier ? " " + rows[i].supplier : "");
      }
    }
    return "";
  }
  function openHoldFor(id, lot) {
    var key = normLot(lot);
    for (var i = 0; i < holds.length; i++) {
      var h = holds[i];
      if (h.status !== "held") continue;
      if (id && String(h.receiving_log_id || "") === String(id)) return h;
      if (key && normLot(h.lot) === key) return h;
    }
    return null;
  }
  function rowStillFails(id) {
    var rows = recvRows();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) !== String(id)) continue;
      return failingChecks(rows[i]).length > 0;
    }
    return false;
  }
  function radios(name, opts, cur) {
    cur = String(cur || "").toUpperCase();
    return opts.map(function (o) {
      return '<label class="rsop-choice"><input type="radio" name="' + name + '" value="' + o + '"' + (cur === o ? " checked" : "") + "> " + o + "</label>";
    }).join("");
  }
  function fieldsHtml(ed) {
    ed = ed || {};
    var c = checklistOf(ed);
    var time = c.received_time || (ed.id ? "" : nowTime());
    var alg = ed.allergen_flag === true ? "Y" : (ed.allergen_flag === false ? "N" : "");
    var warn = tempWarn(ed.temperature_f);
    var fails = failingChecks(ed);
    var boxes = CHECKS.map(function (chk) {
      var opts = chk.kind === "YN" ? ["Y", "N"] : ["A", "UA"];
      var hint = chk.hint === "supplier" ? '<p class="rsop-sub">' + esc(tx("supplierHint")) + "</p>" : "";
      return "<fieldset><legend>" + esc(chk.label) + "</legend>" + radios("rsop_" + chk.key, opts, ed[chk.key]) + hint + "</fieldset>";
    }).join("");
    kick();
    return '<div id="rsop-box">' +
      "<h3 class=\"sub2\">" + esc(tx("title")) + "</h3>" +
      '<p class="rsop-paper">' + esc(tx("paper")) + "</p>" +
      '<p class="hint">' + esc(tx("oneLot")) + "</p>" +
      '<div class="row"><div><label>' + esc(tx("time")) + '</label><input id="rsop-time" type="time" value="' + esc(time) + '"></div>' +
      '<div><label>' + esc(tx("item")) + '</label><input id="rsop-item" list="dl-items" autocomplete="off" value="' + esc(ed.item_id || "") + '"></div>' +
      '<div><label>' + esc(tx("seal")) + '</label><input id="rsop-seal" autocomplete="off" value="' + esc(ed.seal_number || "") + '"></div>' +
      '<div><label>' + esc(tx("temp")) + '</label><input id="rsop-temp" type="number" step="0.1" inputmode="decimal" value="' + esc(ed.temperature_f == null ? "" : ed.temperature_f) + '"></div></div>' +
      '<p id="rsop-temp-warn" class="rsop-warn"' + (warn ? "" : " hidden") + ">" + esc(warn) + "</p>" +
      '<div id="rsop-checks">' + boxes +
      "<fieldset><legend>" + esc(tx("allergen")) + "</legend>" + radios("rsop_allergen", ["Y", "N"], alg) +
      '<p class="rsop-sub">' + esc(tx("allergenHint")) + "</p></fieldset></div>" +
      "<div><label>" + esc(tx("deviation")) + '</label><textarea id="rsop-dev">' + esc(ed.deviation_actions || "") + "</textarea>" +
      '<p class="hint">' + esc(tx("devHint")) + "</p></div>" +
      '<p id="rsop-preview" class="rsop-hold"' + (fails.length ? "" : " hidden") + ">" + esc(fails.length ? (tx("held") + ". " + reasonText(ed)) : "") + "</p>" +
      '<p id="rsop-err" class="rsop-warn" hidden></p></div>';
  }
  function toolsHtml() {
    return '<p class="rsop-tools"><button type="button" class="ghost" data-rsop="export-recv">' + esc(tx("exportRecv")) +
      '</button> <button type="button" class="ghost" data-rsop="export-hold">' + esc(tx("exportHold")) + "</button></p>";
  }
  function holdInner() {
    if (!loaded) return '<p class="hint">' + esc(tx("loading")) + "</p>";
    if (!holds.length) return '<p class="muted">' + esc(tx("emptyHold")) + "</p>";
    var rows = holds.slice().sort(function (a, b) {
      var ah = a.status === "held" ? 0 : 1;
      var bh = b.status === "held" ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return String(b.hold_at || "").localeCompare(String(a.hold_at || ""));
    });
    var body = rows.map(function (h) {
      var open = h.status === "held";
      var disp = open
        ? '<div class="rsop-actions"><select id="rsop-disp-' + esc(h.id) + '">' +
          '<option value="">' + esc(tx("pickDisp")) + "</option>" +
          '<option value="released">Released</option>' +
          '<option value="destroyed">Thrown away</option>' +
          '<option value="returned_to_vendor">Returned to vendor</option>' +
          '<option value="other">Other</option></select>' +
          '<input id="rsop-note-' + esc(h.id) + '" placeholder="' + esc(tx("note")) + '">' +
          '<input id="rsop-by-' + esc(h.id) + '" placeholder="' + esc(tx("by")) + '" value="' + esc(h.held_by || "") + '">' +
          '<button type="button" class="primary sm" data-rsop="dispose" data-id="' + esc(h.id) + '">' + esc(tx("saveDisp")) + "</button></div>"
        : esc(dispPhrase(h)) + (h.disposition_by ? '<div class="muted sm">' + esc(h.disposition_by) + "</div>" : "");
      return "<tr><td>" + esc(denverDay(h.hold_at)) + "</td><td>" + esc(h.held_by || "") + "</td><td>" + esc(h.item_name || "") +
        "</td><td><b>" + esc(h.lot || "") + "</b></td><td class=\"right\">" + esc(h.hold_qty == null ? "" : h.hold_qty) +
        "</td><td>" + esc(h.hold_reason || "") + "</td><td>" + esc(open ? "" : denverDay(h.disposition_at)) +
        "</td><td>" + disp + "</td></tr>";
    }).join("");
    return '<div class="rsop-scroll"><table><thead><tr>' +
      HOLD_HEAD.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  function holdHtml() {
    kick();
    return '<div class="card" id="rsop-holdcard"><h2 class="sub2">' + esc(tx("holdTitle")) + "</h2>" +
      '<p class="hint">' + esc(tx("holdHint")) + '</p><div id="rsop-holdbox">' + holdInner() + "</div></div>";
  }
  function paintHolds(force) {
    if (!doc) return;
    var box = doc.getElementById("rsop-holdbox");
    if (!box) return;
    var ae = doc.activeElement;
    if (!force && ae && box.contains(ae)) return;
    box.innerHTML = holdInner();
  }
  function showError(msg) {
    if (!doc) return;
    var el = doc.getElementById("rsop-err");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
    if (msg && el.scrollIntoView) { try { el.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }
  function readInput(base) {
    base = base || {};
    var input = {
      recv_date: base.recv_date || "",
      supplier: base.supplier || "",
      received_by: base.received_by || "",
      contents: base.contents || "",
      lot: base.lot || "",
      qty_received: base.qty_received,
      received_time: val("rsop-time"),
      seal_number: val("rsop-seal"),
      temperature_f: val("rsop-temp"),
      deviation_actions: val("rsop-dev"),
      allergen: radioVal("rsop_allergen"),
      item_code: val("rsop-item")
    };
    CHECKS.forEach(function (c) { input[c.key] = radioVal("rsop_" + c.key); });
    return input;
  }
  function prepare(base, opts) {
    opts = opts || {};
    if (!doc || !doc.getElementById("rsop-box")) return { ok: true, rec: base };
    var input = readInput(base);
    var dup = duplicateOf(input.lot, opts.id);
    if (dup) input.duplicate = dup;
    var errors = validate(input);
    if (errors.length) return { ok: false, msg: errors[0] };
    var it = matchItem(input.item_code);
    var fails = failingChecks(input);
    var open = openHoldFor(opts.id, input.lot);
    var rec = Object.assign({}, base, {
      item_id: it ? (it.id || it.code || input.item_code) : (input.item_code || null),
      seal_number: input.seal_number,
      temperature_f: Number(input.temperature_f),
      allergen_flag: input.allergen === "Y",
      deviation_actions: input.deviation_actions,
      on_hold: fails.length > 0 || !!open,
      checklist: {
        version: FORM_VERSION,
        received_time: input.received_time,
        temp_warn: tempWarn(input.temperature_f) ? "outside-80-110" : ""
      }
    });
    CHECKS.forEach(function (c) { rec[c.key] = input[c.key]; });
    if (fails.length && (!rec.condition || rec.condition === "Good")) rec.condition = "Hold";
    if (it && !rec.contents) rec.contents = it.name || rec.contents;
    showError("");
    return { ok: true, rec: rec, held: fails.length > 0, open: open, warn: tempWarn(input.temperature_f) };
  }
  function pokeHoldFlag(id, lot, onHold) {
    var key = normLot(lot);
    recvRows().forEach(function (row) {
      if ((id && String(row.id) === String(id)) || (key && normLot(row.lot) === key)) row.on_hold = !!onHold;
    });
    if (!doc) return;
    var key = normLot(lot);
    var trs = doc.querySelectorAll("#rlBody tr");
    for (var t = 0; t < trs.length; t++) {
      if ((trs[t].getAttribute("data-lot") || "") !== key) continue;
      var flag = trs[t].querySelector(".rsop-holdflag");
      var blocked = !!lotBlocked(holds, lot);
      if (blocked && !flag) {
        var lotCell = trs[t].children[6];
        if (lotCell) lotCell.insertAdjacentHTML("beforeend", ' <span class="pill out rsop-holdflag">HOLD</span>');
      }
      if (!blocked && flag && flag.parentNode) flag.parentNode.removeChild(flag);
    }
  }
  async function writeOnHold(id, onHold) {
    if (!id) return;
    if (!cloudMode()) {
      pokeHoldFlag(id, "", onHold);
      var row = null;
      recvRows().forEach(function (r) { if (String(r.id) === String(id)) row = r; });
      if (row) row.on_hold = !!onHold;
      if (row && root.DB && root.DB.updateReceivingLog) await root.DB.updateReceivingLog(id, row, null, row.received_by || "");
      return;
    }
    var c = client();
    if (!c) return;
    var r = await c.from("receiving_log").update({ on_hold: !!onHold }).eq("id", id);
    if (r && r.error) throw new Error(r.error.message || "on_hold");
    pokeHoldFlag(id, "", onHold);
  }
  async function insertHold(rec, id, op) {
    var row = {
      hold_at: new Date().toISOString(),
      held_by: rec.received_by || op || "",
      item_id: rec.item_id || null,
      item_name: rec.contents || "",
      lot: String(rec.lot || "").trim(),
      hold_qty: rec.qty_received === "" || rec.qty_received == null ? null : Number(rec.qty_received),
      hold_reason: reasonText(rec),
      receiving_log_id: isUuid(id) ? id : null,
      status: "held"
    };
    if (!cloudMode()) {
      row.id = "HLD-" + Date.now().toString(36);
      holds.unshift(row);
      writeLocal(holds);
      revision++;
      return row;
    }
    var c = client();
    if (!c) throw new Error("no database");
    var ins = await c.from("hold_log").insert(row).select("*");
    if (ins.error) throw new Error(ins.error.message || "hold_log");
    var saved = (ins.data && ins.data[0]) || row;
    holds.unshift(saved);
    revision++;
    return saved;
  }
  async function updateOpenHold(h, rec) {
    var patch = {
      hold_reason: reasonText(rec),
      hold_qty: rec.qty_received === "" || rec.qty_received == null ? null : Number(rec.qty_received),
      item_id: rec.item_id || null,
      item_name: rec.contents || "",
      lot: String(rec.lot || "").trim(),
      updated_at: new Date().toISOString()
    };
    if (!cloudMode()) {
      Object.assign(h, patch);
      writeLocal(holds);
      revision++;
      return;
    }
    var c = client();
    if (!c) throw new Error("no database");
    var upd = await c.from("hold_log").update(patch).eq("id", h.id).select("*");
    if (upd.error) throw new Error(upd.error.message || "hold_log");
    if (upd.data && upd.data[0]) Object.assign(h, upd.data[0]);
    else Object.assign(h, patch);
    revision++;
  }
  async function afterSave(info) {
    info = info || {};
    var rec = info.rec || {};
    var id = info.id;
    var fails = failingChecks(rec);
    var open = openHoldFor(id, rec.lot);
    if (!fails.length) {
      if (open) return { ok: true, held: true, note: tx("stay") };
      return { ok: true, held: false, note: tempWarn(rec.temperature_f) };
    }
    if (open) await updateOpenHold(open, rec);
    else await insertHold(rec, id, info.op);
    paintHolds();
    var note = tempWarn(rec.temperature_f);
    return { ok: true, held: true, note: note };
  }
  function lotHeld(lot) {
    var hit = lotBlocked(holds, lot);
    if (hit) return hit;
    var key = normLot(lot);
    if (!key) return null;
    var rows = recvRows();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].on_hold && normLot(rows[i].lot) === key) {
        return { lot: rows[i].lot, status: "held", hold_reason: rows[i].deviation_actions || "Receiving checklist hold", receiving_log_id: rows[i].id };
      }
    }
    return null;
  }
  function holdMessage(lot) {
    var hit = lotHeld(lot);
    if (!hit) return "";
    var why = hit.hold_reason || "";
    return normLot(lot) + " ON HOLD" + (why ? " (" + why + ")" : "");
  }
  function openHolds() {
    return holds.filter(function (h) { return !!BLOCK[h.status]; });
  }
  function exportRecv() { download("WHSE_FORM_1.0_Receiving_Log.csv", receivingCsv(recvRows())); }
  function exportHold() { download("WHSE_FORM_3.0_HOLD_Log.csv", holdCsv(holds)); }
  async function doDispose(id) {
    var h = null;
    for (var i = 0; i < holds.length; i++) if (String(holds[i].id) === String(id)) h = holds[i];
    if (!h || h.status !== "held") return;
    var disp = val("rsop-disp-" + id);
    var note = val("rsop-note-" + id);
    var who = val("rsop-by-" + id);
    if (!disp) return toast(tx("pickDisp"));
    if (!who) return toast(tx("needBy"));
    if (disp === "other" && !note) return toast(tx("needNote"));
    if (disp === "released" && rowStillFails(h.receiving_log_id) && !root.confirm(tx("releaseAsk"))) return;
    var patch = {
      status: disp,
      disposition: disp,
      disposition_at: new Date().toISOString(),
      disposition_note: note,
      disposition_by: who,
      updated_at: new Date().toISOString()
    };
    if (!cloudMode()) Object.assign(h, patch);
    else {
      var c = client();
      if (!c) return toast(tx("holdFail"));
      var upd = await c.from("hold_log").update(patch).eq("id", id).select("*");
      if (upd.error) return toast(upd.error.message || tx("holdFail"));
      if (upd.data && upd.data[0]) Object.assign(h, upd.data[0]);
      else Object.assign(h, patch);
    }
    if (!cloudMode()) writeLocal(holds);
    revision++;
    var still = lotBlocked(holds, h.lot);
    if (h.receiving_log_id) {
      try { await writeOnHold(h.receiving_log_id, !!still); } catch (e) { toast(String(e && e.message || e)); }
    }
    pokeHoldFlag(h.receiving_log_id, h.lot, !!still);
    paintHolds(true);
    toast(disp === "released" && !still ? tx("released") : tx("closed"));
  }
  function paintPreview() {
    if (!doc || !doc.getElementById("rsop-box")) return;
    var input = readInput({});
    var el = doc.getElementById("rsop-preview");
    var fails = failingChecks(input);
    if (el) {
      el.hidden = !fails.length;
      el.textContent = fails.length ? (tx("willHold") + " " + reasonText(input)) : "";
    }
    var warn = doc.getElementById("rsop-temp-warn");
    if (warn && doc.activeElement && doc.activeElement.id === "rsop-temp") {
      var w = tempWarn(input.temperature_f);
      warn.hidden = !w;
      warn.textContent = w;
    }
  }
  function ensureLoaded(force) {
    var mode = cloudMode() ? "cloud" : "local";
    if (loadedMode && loadedMode !== mode) force = true;
    if (inflight) return inflight.then(function () { return revision; });
    if (!force && loaded && (Date.now() - lastFetch) < 15000) return Promise.resolve(revision);
    inflight = (mode === "cloud" ? fetchCloud() : Promise.resolve(readLocal())).then(function (rows) {
      holds = rows || [];
      loaded = true;
      loadedMode = mode;
      lastFetch = Date.now();
      revision++;
      if (mode !== "cloud") writeLocal(holds);
      paintHolds();
      return revision;
    }).catch(function () {
      loaded = true;
      loadedMode = mode;
      lastFetch = Date.now();
      paintHolds();
      return revision;
    }).then(function (rev) { inflight = null; return rev; });
    return inflight;
  }
  function fetchCloud() {
    var c = client();
    if (!c) return Promise.resolve([]);
    return c.from("hold_log").select("*").order("hold_at", { ascending: false }).limit(2000).then(function (r) {
      if (r.error) throw new Error(r.error.message || "hold_log");
      return r.data || [];
    });
  }
  function kick() { ensureLoaded(false); }
  function styleOnce() {
    if (!doc || doc.getElementById("rsop-style")) return;
    var s = doc.createElement("style");
    s.id = "rsop-style";
    s.textContent = [
      "#rsop-box .rsop-paper{background:#f4f7fb;border-left:4px solid #1F3864;padding:8px 10px;margin:8px 0}",
      "#rsop-box .rsop-warn,#rsop-holdbox .rsop-warn{background:#fff6e0;border:1px solid #e0c36a;border-radius:8px;padding:8px 10px;margin:8px 0}",
      "#rsop-box .rsop-hold{background:#fde2e2;border:1px solid #e23b3b;color:#8d1212;border-radius:8px;padding:8px 10px;margin:8px 0;font-weight:700}",
      "#rsop-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:8px 0}",
      "#rsop-checks fieldset{border:1px solid #d5dde8;border-radius:8px;margin:0;padding:8px 10px}",
      "#rsop-checks legend{font-weight:800;color:#1F3864;padding:0 4px}",
      "#rsop-box label.rsop-choice{display:inline-flex;align-items:center;gap:6px;margin:4px 16px 4px 0;font-weight:800;font-size:16px;min-height:44px}",
      "#rsop-box input[type=radio]{width:auto;padding:0;margin:0}",
      "#rsop-box .rsop-sub{margin:4px 0 0;color:#556;font-size:13px}",
      "#rsop-holdbox .rsop-scroll{overflow:auto}",
      "#rsop-holdbox select,#rsop-holdbox input{width:auto;min-width:140px}",
      "#rsop-holdbox .rsop-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
      "#rsop-holdbox button.primary{margin-top:0}"
    ].join("");
    doc.head.appendChild(s);
  }
  function boot() {
    var tries = 0;
    function attempt() {
      tries++;
      if (!root.DB) {
        if (tries < 50) setTimeout(attempt, 200);
        return;
      }
      if (root.DB.mode !== "cloud" && tries < 40 && cfg.SUPABASE_URL) {
        setTimeout(attempt, 250);
        return;
      }
      ensureLoaded(true);
    }
    attempt();
  }

  var api = {
    fieldsHtml: fieldsHtml,
    toolsHtml: toolsHtml,
    holdHtml: holdHtml,
    prepare: prepare,
    afterSave: afterSave,
    showError: showError,
    lotHeld: lotHeld,
    holdMessage: holdMessage,
    openHolds: openHolds,
    ensureLoaded: ensureLoaded,
    normLot: normLot
  };
  root.RECVSOP = api;

  if (doc) {
    styleOnce();
    doc.addEventListener("input", function (e) {
      if (!e.target || e.target.id !== "rsop-temp") return;
      var warn = doc.getElementById("rsop-temp-warn");
      if (!warn) return;
      var w = tempWarn(e.target.value);
      warn.hidden = !w;
      warn.textContent = w;
    });
    doc.addEventListener("change", function (e) {
      if (!e.target || !e.target.name || String(e.target.name).indexOf("rsop_") !== 0) return;
      paintPreview();
    });
    doc.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-rsop]") : null;
      if (!t) return;
      var act = t.getAttribute("data-rsop");
      if (act === "export-recv") { e.preventDefault(); exportRecv(); }
      else if (act === "export-hold") { e.preventDefault(); exportHold(); }
      else if (act === "dispose") {
        e.preventDefault();
        Promise.resolve(doDispose(t.getAttribute("data-id"))).catch(function (err) {
          toast(String(err && err.message || err));
        });
      }
    });
    if (root.DB && root.DB.onChange) {
      root.DB.onChange(function () { ensureLoaded(false); });
    }
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      validate: validate,
      tempWarn: tempWarn,
      failingChecks: failingChecks,
      reasonText: reasonText,
      lotBlocked: lotBlocked,
      receivingCsv: receivingCsv,
      holdCsv: holdCsv,
      normLot: normLot,
      dispPhrase: dispPhrase,
      RECV_HEAD: RECV_HEAD,
      HOLD_HEAD: HOLD_HEAD
    };
  }
})(typeof window !== "undefined" ? window : globalThis);

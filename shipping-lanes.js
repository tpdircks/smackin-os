/* ============================================================================
   Shipping lanes (shipping-lanes.js)
   Lane fields, QA hold, carrier portal links, and CSV export for Shipping Log.
   XPO LTL, WWEX retail ground, and ShipStation e-com. Other keeps samples.
   Screens call window.SHIP_LANES only. No carrier API keys in the browser.
   Hold status values match receiving-sop.js: held, released, destroyed,
   returned_to_vendor, other. An open hold is status held, not Open, so the
   HOLD Log can release it. ShipStation status on_hold is an order hold
   labeled SS hold, separate from QA HOLD.
   Paper BOLs stay the backup until this storage is proven.
   Does not call EasyPost and does not change the ShipStation sync.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var LANE_RE = /\[\[LANE:([\s\S]*?)\]\]/;
  var SHIPSYNC_RE = /\[\[SHIPSYNC:/;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var LS_HOLDS = "smk-hold-log-v1";
  var NUMERIC = { pallet_count: 1, carton_count: 1, weight_lb: 1 };
  var FIELD_KEY = {
    ship_date: "date", recipient: "recipient", address: "address", requested_by: "reqBy",
    contents: "contents", lot: "lot", po_num: "po", bol_number: "bol", pallet_count: "pallets",
    carton_count: "cartons", weight_lb: "weight", freight_class: "fclass", seal_number: "seal",
    tracking: "pro"
  };

  function trackUrl(carrier, num) {
    if (!num) return "";
    var n = encodeURIComponent(String(num).trim());
    if (!n) return "";
    var c = String(carrier || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.indexOf("XPO") === 0) return "https://ltl.xpo.com/webapp/manifestrpts_p_app/shipmentTracking.do?PRO=" + n;
    if (c.indexOf("WORLDWIDE") === 0 || c === "WWEX" || c.indexOf("SPEEDSHIP") === 0) return "https://track.speedship.com/#" + n;
    if (c.indexOf("UPS") === 0) return "https://www.ups.com/track?tracknum=" + n;
    if (c.indexOf("FEDEX") === 0) return "https://www.fedex.com/fedextrack/?trknbr=" + n;
    if (c.indexOf("USPS") === 0) return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + n;
    if (c.indexOf("DHL") === 0) return "https://www.dhl.com/us-en/home/tracking.html?tracking-id=" + n;
    return "";
  }

  var SHIP_LANES = {
    xpo: {
      label: "XPO LTL",
      portal: "https://ltl.xpo.com/",
      provider: "link",
      carrier: "XPO",
      show: ["po_num", "bol_number", "pallet_count", "carton_count", "weight_lb", "freight_class", "seal_number", "pickup_date"],
      required: ["ship_date", "recipient", "address", "requested_by", "contents", "lot", "po_num", "bol_number", "pallet_count", "weight_lb", "freight_class", "seal_number"],
      shipped: ["tracking", "bol_number"],
      track: function (pro) { return trackUrl("XPO", pro); }
    },
    wwex: {
      label: "WWEX Retail Ground",
      portal: "https://speedship.wwex.com/",
      provider: "link",
      carrier: "Worldwide Express",
      show: ["po_num", "bol_number", "pallet_count", "carton_count", "weight_lb", "freight_class", "seal_number", "pickup_date"],
      required: ["ship_date", "recipient", "address", "requested_by", "contents", "lot", "po_num", "bol_number", "carton_count", "weight_lb"],
      shipped: ["tracking", "bol_number"],
      track: function (pro) { return trackUrl("WWEX", pro); }
    },
    shipstation: {
      label: "ShipStation E-com",
      portal: "https://ship.shipstation.com/",
      provider: "sync",
      show: ["po_num", "carton_count", "weight_lb"],
      required: ["ship_date", "recipient", "requested_by", "contents", "lot"],
      shipped: [],
      track: function (pro, carrier) { return trackUrl(carrier || "", pro); }
    },
    other: {
      label: "Other",
      portal: "",
      provider: "manual",
      show: ["po_num", "bol_number", "pallet_count", "carton_count", "weight_lb", "freight_class", "seal_number", "pickup_date"],
      required: ["recipient"],
      shipped: [],
      track: function (pro, carrier) { return trackUrl(carrier || "", pro); }
    }
  };
  root.SHIP_LANES = SHIP_LANES;

  var I18N = {
    en: {
      paper: "Paper BOLs and the paper shipping log stay the backup until this screen is the stored record.",
      lane: "Lane", po: "Customer PO #", poOrder: "Order #", bol: "BOL #", pallets: "Pallet count",
      cartons: "Carton count", weight: "Weight (lb)", fclass: "Freight class", seal: "Seal #",
      pickup: "Appointment / pickup date", pro: "PRO #", date: "Ship date", recipient: "Recipient",
      address: "Ship to address", reqBy: "Requested by", contents: "What was sent", lot: "Lot / batch #",
      hintXpo: "BOL, pallet count, weight, freight class, seal, customer PO, and ship-to address are required. A PRO is required to mark Shipped. Set status to Pending to save before the PRO is assigned.",
      hintWwex: "BOL, carton count, weight, customer PO, and ship-to address are required. A PRO is required to mark Shipped. Set status to Pending to save before the PRO is assigned.",
      hintSs: "Order #, cartons, and weight are optional. Synced ShipStation rows stay read-only except the lot and the QA hold check.",
      hintOther: "Use Other for samples and one-offs. Pick a lane for an XPO, WWEX, or ShipStation shipment.",
      need: "{label} is required.",
      numReq: "{label} needs a number greater than 0.",
      proBol: "{lane} cannot be marked Shipped without a PRO and a BOL.",
      holdBlock: "Lot {lot} is on QA hold. Shipped is blocked. Add a Ship anyway reason, or set status to Pending.",
      holdWhy: "On QA hold",
      shipAnyway: "Ship anyway",
      anywayPh: "Reason required to ship anyway",
      orPending: "Or set status to Pending.",
      placeHold: "Place shipment on hold",
      holdReason: "Reason for hold",
      heldBy: "Held by",
      saveFirst: "Save the shipment first, then place it on hold.",
      lotReq: "Lot is required to place a hold.",
      reasonReq: "A hold reason is required.",
      whoReq: "Held by is required.",
      holdFail: "HOLD Log write failed.",
      noDb: "Not connected.",
      placed: "QA HOLD. The lot is on the HOLD Log.",
      placedPending: "QA HOLD. Status set back to Pending.",
      qaHold: "QA HOLD",
      ssHold: "SS hold",
      bookXpo: "Book in XPO",
      bookWwex: "Book in WWEX",
      openSs: "Open ShipStation",
      track: "Track",
      export: "Export CSV",
      from: "From",
      to: "To",
      laneAll: "All lanes",
      opt: "(opt.)",
      na: "n/a"
    },
    es: {
      paper: "Los BOL en papel y el registro de envios en papel siguen como respaldo hasta que esta pantalla sea el registro guardado.",
      lane: "Canal", po: "PO del cliente #", poOrder: "Pedido #", bol: "BOL #", pallets: "Tarimas",
      cartons: "Cajas", weight: "Peso (lb)", fclass: "Clase de flete", seal: "Sello #",
      pickup: "Cita / fecha de recoleccion", pro: "PRO #", date: "Fecha de envio", recipient: "Destinatario",
      address: "Enviar a", reqBy: "Solicitado por", contents: "Que se envio", lot: "Lote / # de lote",
      hintXpo: "BOL, tarimas, peso, clase de flete, sello, PO del cliente y direccion son obligatorios. El PRO es obligatorio para marcar Enviado. Use Pendiente para guardar antes del PRO.",
      hintWwex: "BOL, cajas, peso, PO del cliente y direccion son obligatorios. El PRO es obligatorio para marcar Enviado. Use Pendiente para guardar antes del PRO.",
      hintSs: "Pedido, cajas y peso son opcionales. Las filas sincronizadas de ShipStation quedan de solo lectura, salvo el lote y la revision de QA hold.",
      hintOther: "Use Otro para muestras y envios sueltos. Elija un canal para XPO, WWEX o ShipStation.",
      need: "{label} es obligatorio.",
      numReq: "{label} necesita un numero mayor que 0.",
      proBol: "{lane} no se puede marcar Enviado sin PRO y BOL.",
      holdBlock: "El lote {lot} esta en QA hold. Enviado esta bloqueado. Agregue un motivo de Enviar de todos modos, o ponga Pendiente.",
      holdWhy: "En QA hold",
      shipAnyway: "Enviar de todos modos",
      anywayPh: "Motivo obligatorio para enviar de todos modos",
      orPending: "O ponga el estado en Pendiente.",
      placeHold: "Poner envio en hold",
      holdReason: "Motivo del hold",
      heldBy: "Retenido por",
      saveFirst: "Guarde el envio primero y luego pongalo en hold.",
      lotReq: "El lote es obligatorio para poner un hold.",
      reasonReq: "El motivo del hold es obligatorio.",
      whoReq: "Retenido por es obligatorio.",
      holdFail: "No se escribio el registro HOLD.",
      noDb: "Sin conexion.",
      placed: "QA HOLD. El lote quedo en el registro HOLD.",
      placedPending: "QA HOLD. El estado volvio a Pendiente.",
      qaHold: "QA HOLD",
      ssHold: "SS hold",
      bookXpo: "Reservar en XPO",
      bookWwex: "Reservar en WWEX",
      openSs: "Abrir ShipStation",
      track: "Rastrear",
      export: "Exportar CSV",
      from: "Desde",
      to: "Hasta",
      laneAll: "Todos los canales",
      opt: "(opc.)",
      na: "n/a"
    },
    pt: {
      paper: "Os BOL em papel e o registro de envio em papel continuam como copia de apoio ate esta tela ser o registro guardado.",
      lane: "Canal", po: "PO do cliente #", poOrder: "Pedido #", bol: "BOL #", pallets: "Paletes",
      cartons: "Caixas", weight: "Peso (lb)", fclass: "Classe de frete", seal: "Lacre #",
      pickup: "Compromisso / data de coleta", pro: "PRO #", date: "Data de envio", recipient: "Destinatario",
      address: "Enviar para", reqBy: "Solicitado por", contents: "O que foi enviado", lot: "Lote / no do lote",
      hintXpo: "BOL, paletes, peso, classe de frete, lacre, PO do cliente e endereco sao obrigatorios. O PRO e obrigatorio para marcar Enviado. Use Pendente para salvar antes do PRO.",
      hintWwex: "BOL, caixas, peso, PO do cliente e endereco sao obrigatorios. O PRO e obrigatorio para marcar Enviado. Use Pendente para salvar antes do PRO.",
      hintSs: "Pedido, caixas e peso sao opcionais. Linhas sincronizadas do ShipStation ficam somente leitura, exceto o lote e a checagem de QA hold.",
      hintOther: "Use Outro para amostras e envios avulsos. Escolha um canal para XPO, WWEX ou ShipStation.",
      need: "{label} e obrigatorio.",
      numReq: "{label} precisa de um numero maior que 0.",
      proBol: "{lane} nao pode ser marcado Enviado sem PRO e BOL.",
      holdBlock: "O lote {lot} esta em QA hold. Enviado esta bloqueado. Informe um motivo de Enviar mesmo assim, ou use Pendente.",
      holdWhy: "Em QA hold",
      shipAnyway: "Enviar mesmo assim",
      anywayPh: "Motivo obrigatorio para enviar mesmo assim",
      orPending: "Ou defina o status como Pendente.",
      placeHold: "Colocar envio em hold",
      holdReason: "Motivo do hold",
      heldBy: "Retido por",
      saveFirst: "Salve o envio primeiro e depois coloque em hold.",
      lotReq: "O lote e obrigatorio para colocar um hold.",
      reasonReq: "O motivo do hold e obrigatorio.",
      whoReq: "Retido por e obrigatorio.",
      holdFail: "O registro HOLD nao foi gravado.",
      noDb: "Sem conexao.",
      placed: "QA HOLD. O lote foi para o registro HOLD.",
      placedPending: "QA HOLD. O status voltou para Pendente.",
      qaHold: "QA HOLD",
      ssHold: "SS hold",
      bookXpo: "Reservar na XPO",
      bookWwex: "Reservar na WWEX",
      openSs: "Abrir ShipStation",
      track: "Rastrear",
      export: "Exportar CSV",
      from: "De",
      to: "Ate",
      laneAll: "Todos os canais",
      opt: "(opc.)",
      na: "n/a"
    }
  };

  var CSV_HEAD = [
    "Ship date", "Lane", "Recipient", "Address", "Carrier", "PRO", "BOL", "Customer PO",
    "Pallet count", "Carton count", "Weight lb", "Freight class", "Seal", "Pickup date",
    "Lot", "Contents", "Status", "QA hold", "Hold log id", "SS hold", "Cost",
    "Requested by", "Entered by", "Created at", "Notes"
  ];

  var state = {
    editId: null,
    columns: true,
    detected: false,
    detectedMode: "",
    pending: null,
    dirty: false,
    syncLock: false,
    holdHit: null,
    holds: [],
    holdsLoaded: false,
    holdCacheAt: 0,
    from: "",
    to: "",
    laneFilter: "",
    painting: false
  };

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
    if (pack[key] != null) return pack[key];
    return I18N.en[key] != null ? I18N.en[key] : key;
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
  function $(id) { return doc ? doc.getElementById(id) : null; }
  function val(id) {
    var el = $(id);
    return el ? String(el.value || "").trim() : "";
  }
  function setVal(id, v) {
    var el = $(id);
    if (el && documentValue(el) !== String(v == null ? "" : v)) el.value = v == null ? "" : String(v);
  }
  function documentValue(el) { return String(el.value || ""); }
  function normLot(lot) { return String(lot || "").toUpperCase().replace(/\s+/g, ""); }
  function isUuid(s) { return UUID_RE.test(String(s || "")); }
  function carrierKey(carrier) {
    var c = String(carrier || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.indexOf("XPO") === 0) return "XPO";
    if (c.indexOf("WORLDWIDE") === 0 || c === "WWEX" || c.indexOf("SPEEDSHIP") === 0) return "WWEX";
    return c;
  }
  function trim(v) { return String(v == null ? "" : v).trim(); }
  function numOrNull(v) {
    if (v === "" || v == null) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function filled(form, key) {
    var v = form ? form[key] : "";
    if (NUMERIC[key]) return Number(v) > 0;
    return trim(v) !== "";
  }
  function isSync(row) {
    if (!row) return false;
    if (String(row.entered_by || "").indexOf("sync:") === 0) return true;
    return SHIPSYNC_RE.test(row.notes || "");
  }
  function parseLane(notes) {
    var m = LANE_RE.exec(notes || "");
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  }
  function stripLane(notes) {
    return String(notes || "").replace(/\[\[LANE:[\s\S]*?\]\]/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function withLane(notes, obj) {
    var base = stripLane(notes);
    var blob = "[[LANE:" + JSON.stringify(obj || {}) + "]]";
    return base ? (base + "\n" + blob) : blob;
  }
  function withAnyway(notes, reason) {
    var why = trim(reason);
    if (!why) return String(notes || "");
    var line = "Ship anyway: " + why;
    var base = String(notes || "");
    if (base.indexOf(line) >= 0) return base;
    base = base.trim();
    return base ? (base + "\n" + line) : line;
  }
  function hasAnyway(notes) { return /Ship anyway:/i.test(notes || ""); }
  function holdBlocks(status) {
    var s = String(status || "").trim().toLowerCase();
    if (!s) return false;
    if (s === "released" || s === "closed") return false;
    return true;
  }
  function laneOf(row) {
    if (!row) return "";
    var lane = String(row.lane || "").toLowerCase();
    if (SHIP_LANES[lane]) return lane;
    var blob = parseLane(row.notes);
    if (blob && SHIP_LANES[String(blob.lane || "").toLowerCase()]) return String(blob.lane).toLowerCase();
    if (isSync(row)) return "shipstation";
    var c = carrierKey(row.carrier);
    if (c === "XPO") return "xpo";
    if (c === "WWEX") return "wwex";
    return "";
  }
  function merged(row) {
    var blob = parseLane(row && row.notes) || {};
    var out = Object.assign({}, blob);
    if (!row) return out;
    ["lane", "po_num", "bol_number", "pallet_count", "carton_count", "weight_lb", "freight_class", "seal_number", "pickup_date", "hold_log_id"].forEach(function (k) {
      if (row[k] != null && row[k] !== "") out[k] = row[k];
    });
    if (row.qa_hold) out.qa_hold = true;
    if (!out.lane) out.lane = laneOf(row) || "other";
    return out;
  }
  function ssHold(row) { return String(row && row.status || "").toLowerCase() === "on_hold"; }
  function findHold(lot, holds, receiving, shipId) {
    var key = normLot(lot);
    var list = holds || [];
    var i, h;
    if (shipId) {
      for (i = 0; i < list.length; i++) {
        h = list[i];
        if (String(h.shipping_log_id || "") === String(shipId) && holdBlocks(h.status)) return h;
      }
    }
    if (key) {
      for (i = 0; i < list.length; i++) {
        h = list[i];
        if (normLot(h.lot) === key && holdBlocks(h.status)) return h;
      }
    }
    var rows = receiving || [];
    if (key) {
      for (i = 0; i < rows.length; i++) {
        if (rows[i].on_hold && normLot(rows[i].lot) === key) {
          return {
            id: rows[i].hold_log_id || "",
            lot: rows[i].lot,
            status: "held",
            hold_reason: rows[i].deviation_actions || rows[i].hold_reason || "Receiving checklist hold",
            receiving_log_id: rows[i].id,
            source: "receiving_log"
          };
        }
      }
    }
    return null;
  }
  function holdLogId(hit) {
    if (!hit || hit.source === "receiving_log") return null;
    return isUuid(hit.id) ? hit.id : null;
  }
  function showQa(row, holds, receiving) {
    if (findHold(row && row.lot, holds, receiving, row && row.id)) return true;
    if (!state.holdsLoaded) return !!(row && row.qa_hold);
    return false;
  }
  function validateShipment(form, opts) {
    opts = opts || {};
    form = form || {};
    if (opts.sync) {
      return holdMessage(form, opts);
    }
    var lane = SHIP_LANES[form.lane] ? form.lane : "other";
    var spec = SHIP_LANES[lane];
    var i, key, label;
    for (i = 0; i < spec.required.length; i++) {
      key = spec.required[i];
      label = tx(FIELD_KEY[key] || key);
      if (key === "po_num" && lane === "shipstation") label = tx("poOrder");
      if (!filled(form, key)) {
        if (NUMERIC[key]) return tx("numReq").replace("{label}", label);
        return tx("need").replace("{label}", label);
      }
    }
    var ship = form.status === "Shipped" || form.status === "Delivered";
    if (ship && (lane === "xpo" || lane === "wwex")) {
      if (!trim(form.tracking) || !trim(form.bol_number)) {
        return tx("proBol").replace("{lane}", spec.label);
      }
    }
    return holdMessage(form, opts);
  }
  function holdMessage(form, opts) {
    var ship = form.status === "Shipped" || form.status === "Delivered";
    if (opts.sync && opts.syncAlready) return "";
    if (!(opts.hold && ship)) return "";
    if (opts.anyway && trim(opts.anywayReason)) return "";
    return tx("holdBlock").replace("{lot}", normLot(form.lot) || trim(form.lot) || "");
  }
  function columnPatch(form) {
    var patch = {
      lane: form.lane || "other",
      po_num: trim(form.po_num) || null,
      bol_number: trim(form.bol_number) || null,
      pallet_count: numOrNull(form.pallet_count),
      carton_count: numOrNull(form.carton_count),
      weight_lb: numOrNull(form.weight_lb),
      freight_class: trim(form.freight_class) || null,
      seal_number: trim(form.seal_number) || null,
      pickup_date: trim(form.pickup_date) || null
    };
    if (form.qa_hold !== undefined) patch.qa_hold = !!form.qa_hold;
    if (form.hold_log_id !== undefined) patch.hold_log_id = form.hold_log_id || null;
    return patch;
  }
  function laneBlob(form) {
    var blob = columnPatch(form);
    blob.lane = form.lane || "other";
    return blob;
  }
  function holdInsert(input) {
    input = input || {};
    var row = {
      hold_at: input.hold_at || new Date().toISOString(),
      held_by: trim(input.held_by),
      item_id: input.item_id || null,
      item_name: trim(input.item_name),
      lot: trim(input.lot),
      hold_qty: input.hold_qty == null || input.hold_qty === "" ? null : Number(input.hold_qty),
      hold_reason: trim(input.reason || input.hold_reason),
      receiving_log_id: null,
      status: "held"
    };
    if (isUuid(input.shipping_log_id)) row.shipping_log_id = input.shipping_log_id;
    return row;
  }
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function laneMatch(row, lane) {
    if (!lane) return true;
    return (laneOf(row) || "other") === lane;
  }
  function filterRows(rows, f) {
    f = f || {};
    return (rows || []).filter(function (r) {
      var d = String(r.ship_date || "").slice(0, 10);
      if (f.from && (!d || d < f.from)) return false;
      if (f.to && (!d || d > f.to)) return false;
      if (!laneMatch(r, f.lane)) return false;
      return true;
    });
  }
  function csvFor(rows, f) {
    var list = filterRows(rows, f);
    var lines = [CSV_HEAD.map(csvCell).join(",")];
    list.forEach(function (r) {
      var src = merged(r);
      var notes = stripLane(r.notes || "");
      lines.push([
        String(r.ship_date || "").slice(0, 10),
        SHIP_LANES[src.lane] ? SHIP_LANES[src.lane].label : (src.lane || ""),
        r.recipient || "",
        r.address || "",
        r.carrier || "",
        r.tracking || "",
        src.bol_number || "",
        src.po_num || "",
        src.pallet_count == null ? "" : src.pallet_count,
        src.carton_count == null ? "" : src.carton_count,
        src.weight_lb == null ? "" : src.weight_lb,
        src.freight_class || "",
        src.seal_number || "",
        src.pickup_date ? String(src.pickup_date).slice(0, 10) : "",
        r.lot || "",
        r.contents || "",
        r.status || "",
        (r.qa_hold || src.qa_hold) ? "Yes" : "No",
        src.hold_log_id || r.hold_log_id || "",
        ssHold(r) ? "Yes" : "No",
        r.cost == null || r.cost === "" ? "" : r.cost,
        r.requested_by || "",
        r.entered_by || "",
        r.created_at || "",
        notes
      ].map(csvCell).join(","));
    });
    return lines.join("\r\n");
  }
  function bookLabel(lane) {
    if (lane === "xpo") return tx("bookXpo");
    if (lane === "wwex") return tx("bookWwex");
    if (lane === "shipstation") return tx("openSs");
    return "";
  }
  function portalHtml(lane, pro, carrier) {
    var spec = SHIP_LANES[lane];
    if (!spec) return "";
    var html = "";
    if (spec.portal && (spec.provider === "link" || lane === "shipstation")) {
      var book = bookLabel(lane);
      if (book) html += '<a class="shlane-link" href="' + esc(spec.portal) + '" target="_blank" rel="noopener">' + esc(book) + "</a>";
    }
    if (spec.track && pro) {
      var href = spec.track(pro, carrier);
      if (href) html += '<a class="shlane-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(tx("track")) + "</a>";
    }
    return html;
  }

  var sbClient = null;
  function cfg() { return root.SMACKIN_CONFIG || {}; }
  function client() {
    if (sbClient) return sbClient;
    if (!root.supabase || !cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return null;
    try { sbClient = root.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY); } catch (e) { sbClient = null; }
    return sbClient;
  }
  function shipRows() {
    try { return (root.DB && root.DB.shippingLog) ? root.DB.shippingLog() : []; } catch (e) { return []; }
  }
  function receivingRows() {
    try { return (root.DB && root.DB.receivingLog) ? root.DB.receivingLog() : []; } catch (e) { return []; }
  }
  function findShip(id) {
    var rows = shipRows();
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
    return null;
  }
  async function detectColumns() {
    var mode = root.DB && root.DB.mode;
    if (state.detected && state.detectedMode === mode) return state.columns;
    if (mode !== "cloud") {
      state.columns = true;
      state.detected = true;
      state.detectedMode = mode || "local";
      return true;
    }
    var c = client();
    if (!c) { state.columns = true; return true; }
    var r = await c.from("shipping_log").select("lane").limit(1);
    if (r && r.error) {
      var msg = String(r.error.message || r.error.code || "");
      state.columns = !/column|42703|schema cache/i.test(msg);
    } else state.columns = true;
    state.detected = true;
    state.detectedMode = mode;
    return state.columns;
  }
  async function loadHolds(force) {
    if (!force && state.holdsLoaded && (Date.now() - state.holdCacheAt) < 15000) return state.holds;
    var rows = [];
    if (root.RECVSOP && root.RECVSOP.ensureLoaded) {
      try { await root.RECVSOP.ensureLoaded(); } catch (e) {}
    }
    if (root.DB && root.DB.mode === "cloud") {
      var c = client();
      if (!c) return state.holds;
      var res = await c.from("hold_log").select("id,lot,status,hold_reason,item_name,shipping_log_id,receiving_log_id").limit(2000);
      if (!res || res.error) return state.holds;
      rows = res.data || [];
    } else {
      try { rows = JSON.parse(root.localStorage.getItem(LS_HOLDS) || "[]"); } catch (e) { rows = []; }
    }
    state.holds = rows;
    state.holdsLoaded = true;
    state.holdCacheAt = Date.now();
    return rows;
  }
  function writeLocalHold(row) {
    var rows = [];
    try { rows = JSON.parse(root.localStorage.getItem(LS_HOLDS) || "[]"); } catch (e) { rows = []; }
    rows.unshift(row);
    try { root.localStorage.setItem(LS_HOLDS, JSON.stringify(rows)); } catch (e2) {}
  }
  function readForm() {
    var lane = val("shlane-lane") || "other";
    if (!SHIP_LANES[lane]) lane = "other";
    return {
      lane: lane,
      ship_date: val("shl-date"),
      recipient: val("shl-recipient"),
      address: val("shl-address"),
      requested_by: val("shl-reqby"),
      contents: val("shl-contents"),
      lot: val("shl-lot"),
      tracking: val("shl-tracking"),
      status: val("shl-status"),
      notes: val("shl-notes"),
      carrier: val("shl-carrier"),
      po_num: val("shlane-po"),
      bol_number: val("shlane-bol"),
      pallet_count: val("shlane-pallets"),
      carton_count: val("shlane-cartons"),
      weight_lb: val("shlane-weight"),
      freight_class: val("shlane-class"),
      seal_number: val("shlane-seal"),
      pickup_date: val("shlane-pickup")
    };
  }
  function editingHint() {
    var date = $("shl-date");
    if (!date) return false;
    var form = date.closest ? date.closest(".ordform") : null;
    if (!form) return false;
    var hints = form.querySelectorAll(".hint");
    for (var i = 0; i < hints.length; i++) {
      if (hints[i].id === "shlane-hint") continue;
      var t = hints[i].textContent || "";
      if (/editing this entry|editando esta entrada/i.test(t)) return true;
    }
    return false;
  }
  function editingRow() {
    if (!editingHint()) return null;
    if (state.editId) {
      var hit = findShip(state.editId);
      if (hit) return hit;
    }
    var tracking = val("shl-tracking");
    var recipient = val("shl-recipient");
    var day = val("shl-date");
    var rows = shipRows();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (tracking && String(r.tracking || "") === tracking && String(r.recipient || "") === recipient && String(r.ship_date || "").slice(0, 10) === day) return r;
    }
    return null;
  }
  function gateStatus(row, status) {
    var next = String(status || "");
    if (next !== "Shipped" && next !== "Delivered") return "";
    if (!row) return "";
    var lane = laneOf(row) || "other";
    var src = merged(row);
    if ((lane === "xpo" || lane === "wwex") && (!trim(row.tracking) || !trim(src.bol_number))) {
      return tx("proBol").replace("{lane}", SHIP_LANES[lane].label);
    }
    var hit = findHold(row.lot, state.holds, receivingRows(), row.id);
    var blocked = state.holdsLoaded ? !!hit : !!(hit || row.qa_hold);
    if (blocked && !hasAnyway(row.notes)) {
      return tx("holdBlock").replace("{lot}", normLot(row.lot) || trim(row.lot));
    }
    return "";
  }

  function styleOnce() {
    if (!doc || $("shlane-style")) return;
    var s = doc.createElement("style");
    s.id = "shlane-style";
    s.textContent = [
      "#shlane-box .shlane-paper{background:#f4f7fb;border-left:4px solid #1F3864;padding:8px 10px;margin:0 0 10px}",
      "#shlane-box .shlane-hold{background:#fde2e2;border:1px solid #e23b3b;color:#8d1212;border-radius:8px;padding:8px 10px;margin:8px 0;font-weight:700}",
      "#shlane-box .shlane-star{color:#7d1b12}",
      "#shlane-box .shlane-opt{color:#889;font-weight:600}",
      "#shlane-links .shlane-link{margin-right:10px}",
      ".shlane-link{font-weight:700;white-space:nowrap}",
      "#shlane-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:0 0 10px}",
      "#shlane-tools label{font-size:12px;font-weight:700;color:#1F3864}",
      "#shlane-tools input,#shlane-tools select{display:block;margin-top:4px}",
      "#shlane-place{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-top:8px}",
      "#shlane-place input{min-width:180px}",
      ".pill.shlane-qa{background:#fde2e2;color:#8d1212;margin-left:4px}",
      ".pill.shlane-ss{background:#fff6e0;color:#7a4d05;margin-left:4px}"
    ].join("");
    (doc.head || doc.documentElement).appendChild(s);
  }
  function fieldHtml(id, key, type) {
    return '<div data-lane-field="' + key + '"><label id="' + id + '-label">' + esc(tx(key === "po_num" ? "po" : FIELD_KEY[key] || key)) + '</label>' +
      '<input id="' + id + '" ' + (type === "number" ? 'type="number" min="0" step="' + (key === "weight_lb" ? "0.01" : "1") + '" inputmode="decimal"' : type === "date" ? 'type="date"' : 'type="text"') +
      ' autocomplete="off"></div>';
  }
  function boxHtml() {
    var opts = ["xpo", "wwex", "shipstation", "other"].map(function (k) {
      return '<option value="' + k + '">' + esc(SHIP_LANES[k].label) + "</option>";
    }).join("");
    return '<div id="shlane-box">' +
      '<p class="shlane-paper">' + esc(tx("paper")) + "</p>" +
      '<div class="row"><div><label>' + esc(tx("lane")) + '</label><select id="shlane-lane">' + opts + "</select></div>" +
      '<div style="flex:2"><p id="shlane-hint" class="hint"></p></div></div>' +
      '<div class="row">' +
        fieldHtml("shlane-po", "po_num") +
        fieldHtml("shlane-bol", "bol_number") +
        fieldHtml("shlane-pallets", "pallet_count", "number") +
        fieldHtml("shlane-cartons", "carton_count", "number") +
      "</div><div class=\"row\">" +
        fieldHtml("shlane-weight", "weight_lb", "number") +
        fieldHtml("shlane-class", "freight_class") +
        fieldHtml("shlane-seal", "seal_number") +
        fieldHtml("shlane-pickup", "pickup_date", "date") +
      "</div>" +
      '<div id="shlane-hold" class="shlane-hold" hidden></div>' +
      '<p id="shlane-links"></p>' +
      '<div id="shlane-place" hidden>' +
        '<div><label>' + esc(tx("holdReason")) + '</label><input id="shlane-holdreason" autocomplete="off"></div>' +
        '<div><label>' + esc(tx("heldBy")) + '</label><input id="shlane-heldby" autocomplete="off"></div>' +
        '<button type="button" class="ghost" id="shlane-placebtn">' + esc(tx("placeHold")) + "</button>" +
      "</div></div>";
  }
  function toolsHtml() {
    var opts = '<option value="">' + esc(tx("laneAll")) + "</option>" +
      ["xpo", "wwex", "shipstation", "other"].map(function (k) {
        return '<option value="' + k + '">' + esc(SHIP_LANES[k].label) + "</option>";
      }).join("");
    return '<div id="shlane-tools">' +
      '<label>' + esc(tx("from")) + '<input id="shlane-from" type="date"></label>' +
      '<label>' + esc(tx("to")) + '<input id="shlane-to" type="date"></label>' +
      '<label>' + esc(tx("lane")) + '<select id="shlane-filter">' + opts + "</select></label>" +
      '<button type="button" class="ghost" id="shlane-export">' + esc(tx("export")) + "</button></div>";
  }
  function markLabel(inputId, on, text) {
    var el = $(inputId);
    if (!el || !el.parentNode) return;
    var label = el.parentNode.querySelector("label");
    if (!label) return;
    if (!label.getAttribute("data-base")) label.setAttribute("data-base", label.textContent || "");
    var base = text || label.getAttribute("data-base") || "";
    label.textContent = base;
    if (on) label.insertAdjacentHTML("beforeend", ' <span class="shlane-star">*</span>');
  }
  function setFieldLabel(id, text, mode) {
    var label = $(id + "-label");
    if (!label) return;
    label.textContent = text;
    if (mode === "req") label.insertAdjacentHTML("beforeend", ' <span class="shlane-star">*</span>');
    else if (mode === "opt") label.insertAdjacentHTML("beforeend", ' <span class="shlane-opt"> ' + esc(tx("opt")) + "</span>");
  }
  function applyLane() {
    var lane = val("shlane-lane") || "other";
    if (!SHIP_LANES[lane]) lane = "other";
    var spec = SHIP_LANES[lane];
    var show = {};
    spec.show.forEach(function (k) { show[k] = 1; });
    var req = {};
    if (!state.syncLock) spec.required.forEach(function (k) { req[k] = 1; });
    ["po_num", "bol_number", "pallet_count", "carton_count", "weight_lb", "freight_class", "seal_number", "pickup_date"].forEach(function (k) {
      var wrap = doc.querySelector('[data-lane-field="' + k + '"]');
      if (wrap) wrap.hidden = !show[k];
    });
    var poLabel = lane === "shipstation" ? tx("poOrder") : tx("po");
    setFieldLabel("shlane-po", poLabel, req.po_num ? "req" : (show.po_num ? "opt" : ""));
    setFieldLabel("shlane-bol", tx("bol"), req.bol_number ? "req" : (show.bol_number ? "opt" : ""));
    setFieldLabel("shlane-pallets", tx("pallets"), req.pallet_count ? "req" : (show.pallet_count ? "opt" : ""));
    setFieldLabel("shlane-cartons", tx("cartons"), req.carton_count ? "req" : (show.carton_count ? "opt" : ""));
    setFieldLabel("shlane-weight", tx("weight"), req.weight_lb ? "req" : (show.weight_lb ? "opt" : ""));
    setFieldLabel("shlane-class", tx("fclass"), req.freight_class ? "req" : (show.freight_class ? "opt" : ""));
    setFieldLabel("shlane-seal", tx("seal"), req.seal_number ? "req" : (show.seal_number ? "opt" : ""));
    setFieldLabel("shlane-pickup", tx("pickup"), "opt");
    markLabel("shl-date", !!req.ship_date);
    markLabel("shl-recipient", !!req.recipient);
    markLabel("shl-address", !!req.address);
    markLabel("shl-reqby", !!req.requested_by);
    markLabel("shl-contents", !!req.contents);
    markLabel("shl-lot", !!req.lot);
    markLabel("shl-tracking", (lane === "xpo" || lane === "wwex"), (lane === "xpo" || lane === "wwex") ? tx("pro") : "");
    var hint = $("shlane-hint");
    if (hint) hint.textContent = lane === "xpo" ? tx("hintXpo") : lane === "wwex" ? tx("hintWwex") : lane === "shipstation" ? tx("hintSs") : tx("hintOther");
    if (!state.syncLock && spec.carrier) {
      var carrier = $("shl-carrier");
      if (carrier) carrier.value = spec.carrier;
    }
    var place = $("shlane-place");
    var row = editingRow();
    if (place) place.hidden = !(row && row.id && String(row.id).indexOf("ord-") !== 0);
    paintLinks();
  }
  function lockSync(on) {
    state.syncLock = !!on;
    var ids = ["shl-date", "shl-type", "shl-status", "shl-recipient", "shl-reqby", "shl-address", "shl-carrier", "shl-tracking", "shl-cost", "shl-contents", "shl-notes", "shlane-lane", "shlane-po", "shlane-bol", "shlane-pallets", "shlane-cartons", "shlane-weight", "shlane-class", "shlane-seal", "shlane-pickup"];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = !!on;
    });
    var lot = $("shl-lot");
    if (lot) lot.disabled = false;
  }
  function prefill(row) {
    var src = merged(row || {});
    var lane = (row && (laneOf(row) || "other")) || "other";
    if (!SHIP_LANES[lane]) lane = "other";
    setVal("shlane-lane", lane);
    setVal("shlane-po", src.po_num || "");
    setVal("shlane-bol", src.bol_number || "");
    setVal("shlane-pallets", src.pallet_count == null ? "" : src.pallet_count);
    setVal("shlane-cartons", src.carton_count == null ? "" : src.carton_count);
    setVal("shlane-weight", src.weight_lb == null ? "" : src.weight_lb);
    setVal("shlane-class", src.freight_class || "");
    setVal("shlane-seal", src.seal_number || "");
    setVal("shlane-pickup", src.pickup_date ? String(src.pickup_date).slice(0, 10) : "");
    var who = $("shlane-heldby");
    if (who && !who.value) who.value = val("op") || "Troy";
    lockSync(row && isSync(row));
    applyLane();
    paintHold(findHold(val("shl-lot"), state.holds, receivingRows(), row && row.id));
  }
  function paintLinks() {
    var el = $("shlane-links");
    if (!el) return;
    var form = readForm();
    var html = portalHtml(form.lane, form.tracking, form.carrier);
    if (el.getAttribute("data-html") === html) return;
    el.setAttribute("data-html", html);
    el.innerHTML = html;
  }
  function paintHold(hit) {
    var el = $("shlane-hold");
    if (!el) return;
    state.holdHit = hit || null;
    if (!hit) {
      if (el.getAttribute("data-on") === "0") return;
      el.hidden = true;
      el.setAttribute("data-on", "0");
      el.setAttribute("data-key", "");
      el.innerHTML = "";
      return;
    }
    var key = String(hit.id || hit.receiving_log_id || "") + "|" + (hit.hold_reason || "") + "|" + normLot(hit.lot);
    if (el.getAttribute("data-key") === key) return;
    var why = val("shlane-why");
    var checked = $("shlane-anyway") && $("shlane-anyway").checked;
    el.hidden = false;
    el.setAttribute("data-on", "1");
    el.setAttribute("data-key", key);
    var reason = hit.hold_reason ? " (" + hit.hold_reason + ")" : "";
    el.innerHTML = esc(tx("holdWhy") + ": " + (normLot(hit.lot) || trim(hit.lot)) + reason) +
      '<div><label><input id="shlane-anyway" type="checkbox"' + (checked ? " checked" : "") + "> " + esc(tx("shipAnyway")) + "</label></div>" +
      '<div><input id="shlane-why" autocomplete="off" placeholder="' + esc(tx("anywayPh")) + '" value="' + esc(why) + '"></div>' +
      '<div class="shlane-opt">' + esc(tx("orPending")) + "</div>";
  }
  function restoreTools() {
    setVal("shlane-from", state.from);
    setVal("shlane-to", state.to);
    setVal("shlane-filter", state.laneFilter);
  }
  function readTools() {
    state.from = val("shlane-from");
    state.to = val("shlane-to");
    state.laneFilter = val("shlane-filter");
  }
  function rowIdFrom(tr) {
    var html = tr.innerHTML || "";
    var m = html.match(/shl(?:Edit|Status|Delete)\('([^']+)'/);
    return m ? m[1] : "";
  }
  function rowFromCells(tr) {
    var cells = tr.cells || [];
    var text = function (i) { return cells[i] ? String(cells[i].textContent || "").trim() : ""; };
    return {
      ship_date: text(0).slice(0, 10),
      carrier: text(3),
      tracking: text(4),
      lot: text(7),
      status: text(8),
      recipient: text(2)
    };
  }
  function decorate() {
    var body = $("shlBody");
    if (!body) return;
    var holds = state.holds || [];
    var receiving = receivingRows();
    var trs = body.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var storedStatus = tr.getAttribute("data-status");
      var storedLot = tr.getAttribute("data-lot");
      var row = null;
      if (tr.getAttribute("data-shipid")) row = findShip(tr.getAttribute("data-shipid"));
      if (!row) {
        var id = rowIdFrom(tr);
        row = id ? findShip(id) : null;
        if (!row) row = rowFromCells(tr);
        if (storedStatus) row = Object.assign({}, row, { status: storedStatus, lot: storedLot || row.lot || "" });
        if (id) tr.setAttribute("data-shipid", id);
      }
      var lane = laneOf(row) || "other";
      tr.setAttribute("data-lane", lane);
      tr.setAttribute("data-date", String(row.ship_date || "").slice(0, 10));
      tr.setAttribute("data-lot", row.lot || "");
      tr.setAttribute("data-status", row.status || "");
      if (tr.getAttribute("data-shlane") !== "1") {
        tr.setAttribute("data-shlane", "1");
        var typeCell = tr.cells && tr.cells[1];
        if (typeCell) typeCell.insertAdjacentHTML("beforeend", '<div class="muted sm">' + esc(SHIP_LANES[lane] ? SHIP_LANES[lane].label : lane) + "</div>");
        var trk = tr.cells && tr.cells[4];
        if (trk) trk.insertAdjacentHTML("beforeend", " " + portalHtml(lane, row.tracking, row.carrier));
      }
      var statusCell = tr.cells && tr.cells[8];
      if (statusCell) {
        var pills = "";
        if (ssHold(row)) pills += '<span class="pill shlane-ss">' + esc(tx("ssHold")) + "</span>";
        if (showQa(row, holds, receiving)) pills += '<span class="pill shlane-qa">' + esc(tx("qaHold")) + "</span>";
        if (tr.getAttribute("data-pills") !== pills) {
          tr.setAttribute("data-pills", pills);
          var old = statusCell.querySelectorAll(".shlane-qa, .shlane-ss");
          for (var p = 0; p < old.length; p++) if (old[p].parentNode) old[p].parentNode.removeChild(old[p]);
          if (pills) statusCell.insertAdjacentHTML("beforeend", " " + pills);
        }
      }
    }
    applyFilter();
  }
  function applyFilter() {
    var body = $("shlBody");
    if (!body) return;
    readTools();
    var q = val("shlSearch").toLowerCase();
    var trs = body.querySelectorAll("tr");
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      var txt = tr.getAttribute("data-txt") || "";
      var d = tr.getAttribute("data-date") || "";
      var lane = tr.getAttribute("data-lane") || "other";
      var ok = true;
      if (q && txt.indexOf(q) < 0) ok = false;
      if (state.from && (!d || d < state.from)) ok = false;
      if (state.to && (!d || d > state.to)) ok = false;
      if (state.laneFilter && lane !== state.laneFilter) ok = false;
      tr.style.display = ok ? "" : "none";
    }
  }
  function download(name, text) {
    if (!doc) return;
    var blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
    var a = doc.createElement("a");
    a.href = root.URL.createObjectURL(blob);
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () {
      root.URL.revokeObjectURL(a.href);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
  }
  function exportCsv() {
    readTools();
    var name = "Shipping_Log";
    if (state.from || state.to) name += "_" + (state.from || "start") + "_" + (state.to || "end");
    if (state.laneFilter) name += "_" + state.laneFilter;
    download(name + ".csv", csvFor(shipRows(), { from: state.from, to: state.to, lane: state.laneFilter }));
  }
  function enhance() {
    if (!doc || state.painting) return;
    var date = $("shl-date");
    if (!date) {
      state.dirty = false;
      state.syncLock = false;
      return;
    }
    state.painting = true;
    try {
      styleOnce();
      if (!$("shlane-box")) {
        var form = date.closest ? date.closest(".ordform") : null;
        if (form) {
          form.insertAdjacentHTML("afterbegin", boxHtml());
          if (!editingHint()) state.editId = null;
          prefill(editingRow());
        }
      }
      var search = $("shlSearch");
      if (search && !$("shlane-tools")) {
        search.insertAdjacentHTML("beforebegin", toolsHtml());
        restoreTools();
      }
      decorate();
      if (!state.holdsLoaded) loadHolds(false).then(function () { decorate(); }).catch(function () {});
    } finally {
      state.painting = false;
    }
  }
  function watch() {
    var view = $("view");
    if (!view || view.__shlaneObs || typeof root.MutationObserver !== "function") return;
    var obs = new root.MutationObserver(function () { enhance(); });
    view.__shlaneObs = obs;
    obs.observe(view, { childList: true, subtree: true });
    enhance();
  }
  async function refreshHoldBanner() {
    var lot = val("shl-lot");
    var row = editingRow();
    await loadHolds(false);
    if (val("shl-lot") !== lot) return;
    paintHold(findHold(lot, state.holds, receivingRows(), row && row.id));
    decorate();
  }
  async function saveWrapped(orig) {
    await detectColumns();
    await loadHolds(false);
    var row = editingRow();
    var sync = !!(row && isSync(row));
    var form = readForm();
    var hit = findHold(form.lot, state.holds, receivingRows(), row && row.id);
    var syncAlready = sync && row && (row.status === form.status) && (form.status === "Shipped" || form.status === "Delivered");
    var err = validateShipment(form, {
      sync: sync,
      hold: hit,
      syncAlready: syncAlready,
      anyway: $("shlane-anyway") && $("shlane-anyway").checked,
      anywayReason: val("shlane-why")
    });
    if (err) {
      paintHold(hit);
      toast(err);
      return;
    }
    var notes = val("shl-notes");
    if (state.columns) notes = stripLane(notes);
    if (hit && (form.status === "Shipped" || form.status === "Delivered") && !syncAlready) {
      notes = withAnyway(notes, val("shlane-why"));
    }
    setVal("shl-notes", notes);
    if (!sync && SHIP_LANES[form.lane] && SHIP_LANES[form.lane].carrier) {
      setVal("shl-carrier", SHIP_LANES[form.lane].carrier);
    }
    form.notes = notes;
    form.qa_hold = !!hit;
    form.hold_log_id = holdLogId(hit);
    if (state.columns) state.pending = columnPatch(form);
    else {
      state.pending = null;
      if (!sync) setVal("shl-notes", withLane(notes, laneBlob(form)));
    }
    state.dirty = false;
    try {
      await orig.call(root.UI);
    } finally {
      state.pending = null;
      state.editId = editingHint() ? state.editId : null;
    }
  }
  async function placeHold() {
    var row = editingRow();
    if (!row || !row.id || String(row.id).indexOf("ord-") === 0) {
      toast(tx("saveFirst"));
      return;
    }
    var lot = val("shl-lot");
    var reason = val("shlane-holdreason");
    var who = val("shlane-heldby") || val("op");
    if (!lot) return toast(tx("lotReq"));
    if (!reason) return toast(tx("reasonReq"));
    if (!who) return toast(tx("whoReq"));
    await detectColumns();
    var payload = holdInsert({
      held_by: who,
      item_name: val("shl-contents") || row.contents || "",
      lot: lot,
      reason: reason,
      shipping_log_id: row.id
    });
    var saved = payload;
    if (root.DB && root.DB.mode === "cloud") {
      var c = client();
      if (!c) return toast(tx("noDb"));
      var ins = await c.from("hold_log").insert(payload).select("*");
      if (ins.error) return toast(ins.error.message || tx("holdFail"));
      saved = (ins.data && ins.data[0]) || payload;
    } else {
      saved.id = "HLD-" + Date.now().toString(36);
      writeLocalHold(saved);
    }
    state.holds = [saved].concat(state.holds || []);
    state.holdsLoaded = true;
    state.holdCacheAt = Date.now();
    var src = merged(row);
    var nextStatus = row.status;
    var pendingBack = false;
    if (!isSync(row) && (row.status === "Shipped" || row.status === "Delivered")) {
      nextStatus = "Pending";
      pendingBack = true;
    }
    var patch = {
      ship_date: row.ship_date, ship_type: row.ship_type || "", recipient: row.recipient || "",
      address: row.address || "", carrier: row.carrier || "", tracking: row.tracking || "",
      requested_by: row.requested_by || "", contents: val("shl-contents") || row.contents || "",
      lot: lot, status: nextStatus || "Pending", cost: row.cost || 0, notes: row.notes || ""
    };
    if (state.columns) {
      patch.lane = src.lane || val("shlane-lane") || "other";
      patch.po_num = src.po_num || "";
      patch.bol_number = src.bol_number || "";
      patch.pallet_count = src.pallet_count;
      patch.carton_count = src.carton_count;
      patch.weight_lb = src.weight_lb;
      patch.freight_class = src.freight_class || "";
      patch.seal_number = src.seal_number || "";
      patch.pickup_date = src.pickup_date || "";
      patch.qa_hold = true;
      patch.hold_log_id = isUuid(saved.id) ? saved.id : null;
    } else {
      patch.notes = withLane(patch.notes, Object.assign(laneBlob(Object.assign({ lane: src.lane || "other" }, src)), {
        qa_hold: true,
        hold_log_id: saved.id || ""
      }));
    }
    state.dirty = false;
    try { if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur(); } catch (e) {}
    await root.DB.updateShipping(row.id, patch, who);
    toast(pendingBack ? tx("placedPending") : tx("placed"));
  }
  async function unlinkShipment(id) {
    // shipping_log.hold_log_id and hold_log.shipping_log_id point at each other.
    // Clear both links before a delete, or Postgres rejects it.
    if (!root.DB || root.DB.mode !== "cloud" || !isUuid(id)) return;
    var c = client();
    if (!c) return;
    await c.from("shipping_log").update({ hold_log_id: null }).eq("id", id);
    await c.from("hold_log").update({ shipping_log_id: null }).eq("shipping_log_id", id);
  }
  function installHooks() {
    if (root.DB && !root.DB.__shlaneWrap && root.DB.addShipping && root.DB.updateShipping) {
      var add = root.DB.addShipping;
      var upd = root.DB.updateShipping;
      var del = root.DB.deleteShipping;
      root.DB.addShipping = function (rec, op) {
        if (state.pending) rec = Object.assign({}, rec, state.pending);
        return add.call(root.DB, rec, op);
      };
      root.DB.updateShipping = function (id, rec, op) {
        if (state.pending) rec = Object.assign({}, rec, state.pending);
        return upd.call(root.DB, id, rec, op);
      };
      if (del) {
        root.DB.deleteShipping = async function (id, op) {
          try { await unlinkShipment(id); } catch (e) {}
          return del.call(root.DB, id, op);
        };
      }
      root.DB.__shlaneWrap = true;
    }
    if (root.UI && !root.UI.__shlaneSave && root.UI.shlSave) {
      var origSave = root.UI.shlSave;
      var origStatus = root.UI.shlStatus;
      var origEdit = root.UI.shlEdit;
      var origCancel = root.UI.shlEditCancel;
      root.UI.shlSave = function () { return saveWrapped(origSave); };
      root.UI.shlStatus = async function (id, status) {
        await loadHolds(false);
        var row = findShip(id);
        var msg = gateStatus(row, status);
        if (msg) { toast(msg); return; }
        return origStatus.call(root.UI, id, status);
      };
      root.UI.shlEdit = function (id) {
        state.editId = id;
        state.dirty = false;
        return origEdit.call(root.UI, id);
      };
      root.UI.shlEditCancel = function () {
        state.editId = null;
        state.dirty = false;
        return origCancel.call(root.UI);
      };
      root.UI.__shlaneSave = true;
    }
  }
  function onInput(e) {
    if (!e.target || !e.target.id) return;
    var id = e.target.id;
    if (id.indexOf("shlane-") === 0 || id.indexOf("shl-") === 0) state.dirty = true;
    if (id === "shlSearch" || id === "shlane-from" || id === "shlane-to") applyFilter();
    if (id === "shl-tracking") paintLinks();
  }
  function onChange(e) {
    if (!e.target || !e.target.id) return;
    var id = e.target.id;
    if (id === "shlane-lane") applyLane();
    if (id === "shl-carrier") paintLinks();
    if (id === "shl-lot" || id === "shl-status") refreshHoldBanner();
    if (id === "shlane-filter" || id === "shlane-from" || id === "shlane-to") applyFilter();
  }
  function onClick(e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "shlane-export") { e.preventDefault(); exportCsv(); }
    if (t.id === "shlane-placebtn") {
      e.preventDefault();
      Promise.resolve(placeHold()).catch(function (err) { toast(String(err && err.message || err)); });
    }
  }

  if (doc) {
    styleOnce();
    doc.addEventListener("input", onInput);
    doc.addEventListener("change", onChange);
    doc.addEventListener("click", onClick);
    root.SMK_BUSY = root.SMK_BUSY || [];
    root.SMK_BUSY.push(function () {
      if (!doc.getElementById("shl-date")) { state.dirty = false; return false; }
      if (state.dirty) return true;
      var ae = doc.activeElement;
      if (!ae || !ae.id) return false;
      return ae.id.indexOf("shlane-") === 0 || ae.id.indexOf("shl-") === 0;
    });
    installHooks();
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { installHooks(); watch(); });
    else { watch(); }
    setTimeout(installHooks, 0);
  }

  var api = {
    SHIP_LANES: SHIP_LANES,
    trackUrl: trackUrl,
    validateShipment: validateShipment,
    holdBlocks: holdBlocks,
    normLot: normLot,
    parseLane: parseLane,
    stripLane: stripLane,
    withLane: withLane,
    withAnyway: withAnyway,
    hasAnyway: hasAnyway,
    laneOf: laneOf,
    isSync: isSync,
    merged: merged,
    findHold: findHold,
    holdInsert: holdInsert,
    columnPatch: columnPatch,
    csvFor: csvFor,
    filterRows: filterRows,
    ssHold: ssHold,
    CSV_HEAD: CSV_HEAD,
    portalHtml: portalHtml,
    gateStatus: gateStatus
  };
  root.SHIPPING_LANES = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

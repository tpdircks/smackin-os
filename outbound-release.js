/* ============================================================================
   Outbound Trailer Inspection and Shipment Release (outbound-release.js)
   SQF Edition 10 (Food Safety Code: Manufacturing)
     11.6.5.2  Vehicles are inspected before loading. One record per shipment.
     2.4.7.1   Product is released by authorized people. Records are kept.

   Dry foods only. Carrier dry van trailers (LTL and truckload) at the dock.
   No temperature fields on purpose: no refrigerated product, no reefers.

   Storage: public.qc_forms (already exists, open RLS, jsonb header/lines,
   audit_log trigger). form_type = "outbound_trailer_release".
     ref        PO number          form_date  ship day (America/Denver)
     machine    dock door          header     trailer, checks, release
     lines      flavor/lot/best-by/cases      result     RELEASED / REJECTED
     operator   typed name/initials           reviewer   signed-in email
     reviewed_at release time      status     "complete"
   Records are not edited after save. A correction is a new record.
   Photo (BOL or trailer) goes through DB.createOrderDoc, so it lands in the
   order-docs bucket AND in Order Docs for that customer and PO.

   Lot hold check: hold_log rows with status "held" and stock rows in
   QA-HOLD / QUARANTINE / RETURNS-HOLD (DB.isHoldLocation) block a release
   when the lot matches. Same normalization as receiving-sop.js.

   Standalone. No app.js edit. Writes only when DB.mode === "cloud".
   Exposes window.OUTBOUND_RELEASE. Open with OUTBOUND_RELEASE.open() or
   OUTBOUND_RELEASE.open({ po: "...", customer: "..." }) from any screen.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var cfg = root.SMACKIN_CONFIG || {};
  var FORM_TYPE = "outbound_trailer_release";
  var FORM_REF = "OUTBOUND_RELEASE v1";
  var DRAFT_LS = "obr-draft-v1";
  var TZ = "America/Denver";

  var TRAILER = ["clean", "dry", "odor", "pests", "floor", "chem", "doors"];
  var PRODUCT = ["label", "metal", "cases", "packlist"];

  var TXT = {
    en: {
      nav: "Trailer Release", title: "Outbound Trailer Inspection & Release",
      sqf: "SQF Ed 10: 11.6.5.2 vehicle inspection before loading, 2.4.7.1 product release. One record per shipment. Dry van trailers only.",
      tabNew: "New release", tabLog: "Release log",
      order: "Order / PO", pickOrder: "Pick an open order (fills PO, customer, ship-to, and flavors)", pickNone: "Type it in below",
      filterOrders: "Search orders", po: "PO #", customer: "Customer", shipTo: "Ship-to", carrier: "Carrier",
      pro: "PRO / BOL #", trailer: "Trailer #", seal: "Seal #", sealNa: "No seal (N/A)", driver: "Driver name (optional)",
      dock: "Dock door", started: "Started", sTrailer: "1. Trailer inspection (before loading)",
      sTrailerHint: "Inspect the empty trailer at the dock before any product goes on.",
      pass: "Pass", fail: "Fail", yes: "Y", no: "N", failNote: "What failed?",
      clean: "Interior clean (no debris, residue, or trash)",
      dry: "Dry: no leaks, holes, or light coming through",
      odor: "No odors",
      pests: "No pests or evidence of pests",
      floor: "Floor in good repair, no protruding nails or damage",
      chem: "No chemicals or incompatible prior load",
      doors: "Doors, seals, and locks work",
      doNotLoad: "DO NOT LOAD. Request another trailer from the carrier. Save this as REJECTED.",
      sProduct: "2. Product loaded", flavor: "Flavor / SKU", lot: "Lot", bestBy: "Best-by", cases: "Cases",
      addLine: "+ Add flavor", remove: "Remove", ordered: "Ordered",
      sChecks: "3. Product checks",
      label: "Label, lot, and best-by match the PO",
      metal: "Metal detector run on all cases, test pieces passed",
      cases: "Case count and case condition OK",
      packlist: "Packing list shows lots by flavor",
      sRelease: "4. Release", relBy: "Released by (name or initials)", relUser: "Signed in as", notSigned: "not signed in",
      photo: "Photo of BOL or trailer (optional)", photoPick: "Add photo", notes: "Notes (optional)",
      rejectReason: "Reason for rejection",
      release: "Release shipment", reject: "Reject / do not ship",
      onHold: "ON QA HOLD. Do not ship this lot.", holdWarn: "Some of this flavor is on hold with no lot. Confirm these cases are not from it.",
      expired: "Best-by is in the past.",
      needPo: "PO # is required.", needCust: "Customer is required.", needCarrier: "Carrier is required.",
      needTrailer: "Trailer # is required.", needSeal: "Enter the seal # or check No seal.",
      needChecks: "Answer every trailer check.", needFailNote: "Write what failed on each Fail.",
      needProd: "Answer every product check with Y.", needLine: "Add at least one flavor with lot, best-by, and cases.",
      needBy: "Type your name or initials.", needReason: "Write the reason for rejecting.",
      heldBlock: "A lot is on QA HOLD. It cannot be released.", expBlock: "A best-by date is in the past.",
      trailerFailBlock: "A trailer check failed. Reject this trailer.",
      caseDiff: "Cases loaded ({a}) do not match cases ordered ({b}). Release anyway?",
      saving: "Saving…", saved: "Saved", notSaved: "Not saved.", offline: "Not connected to cloud. Nothing was saved. The form was kept.",
      readback: "Saved, but the read-back did not match. Check the log.",
      photoFail: "Record saved. Photo upload failed: ",
      from: "From", to: "To", status: "Status", all: "All", released: "RELEASED", rejected: "REJECTED",
      csv: "Export CSV", xlsx: "Export XLSX", empty: "No release records yet.", loading: "Loading…",
      date: "Date", by: "Released by", view: "View", back: "Back to log", pdf: "Download PDF",
      packet: "Add PDF to Order Docs", packetDone: "Added to Order Docs", reason: "Reason",
      newFor: "New release for this PO", correction: "Records are not edited. To correct one, save a new record and note it.",
      clear: "Clear form", clearAsk: "Clear this form?", trailerResult: "Trailer", productResult: "Product",
      authHint: "Only people authorized to release shipments sign here. Lots must already be released by Quality."
    },
    es: {
      nav: "Liberacion de Trailer", title: "Inspeccion de Trailer y Liberacion de Envio",
      sqf: "SQF Ed 10: 11.6.5.2 inspeccion del vehiculo antes de cargar, 2.4.7.1 liberacion de producto. Un registro por envio. Solo trailers secos.",
      tabNew: "Nueva liberacion", tabLog: "Registro",
      order: "Orden / PO", pickOrder: "Elija una orden abierta (llena PO, cliente, destino y sabores)", pickNone: "Escribalo abajo",
      filterOrders: "Buscar ordenes", po: "PO #", customer: "Cliente", shipTo: "Destino", carrier: "Transportista",
      pro: "PRO / BOL #", trailer: "Trailer #", seal: "Sello #", sealNa: "Sin sello (N/A)", driver: "Nombre del chofer (opcional)",
      dock: "Puerta del muelle", started: "Inicio", sTrailer: "1. Inspeccion del trailer (antes de cargar)",
      sTrailerHint: "Revise el trailer vacio en el muelle antes de cargar producto.",
      pass: "Pasa", fail: "Falla", yes: "S", no: "N", failNote: "Que fallo?",
      clean: "Interior limpio (sin basura, residuos ni desechos)",
      dry: "Seco: sin goteras, hoyos ni luz que entre",
      odor: "Sin olores",
      pests: "Sin plagas ni senales de plagas",
      floor: "Piso en buen estado, sin clavos salidos ni danos",
      chem: "Sin quimicos ni carga anterior incompatible",
      doors: "Puertas, sellos y cerraduras funcionan",
      doNotLoad: "NO CARGUE. Pida otro trailer al transportista. Guarde esto como RECHAZADO.",
      sProduct: "2. Producto cargado", flavor: "Sabor / SKU", lot: "Lote", bestBy: "Consumir antes", cases: "Cajas",
      addLine: "+ Agregar sabor", remove: "Quitar", ordered: "Pedido",
      sChecks: "3. Revision del producto",
      label: "Etiqueta, lote y fecha coinciden con la PO",
      metal: "Detector de metales en todas las cajas, piezas de prueba pasaron",
      cases: "Conteo y condicion de cajas OK",
      packlist: "La lista de empaque muestra lotes por sabor",
      sRelease: "4. Liberacion", relBy: "Liberado por (nombre o iniciales)", relUser: "Sesion de", notSigned: "sin sesion",
      photo: "Foto del BOL o trailer (opcional)", photoPick: "Agregar foto", notes: "Notas (opcional)",
      rejectReason: "Razon del rechazo",
      release: "Liberar envio", reject: "Rechazar / no enviar",
      onHold: "EN RETENCION QA. No envie este lote.", holdWarn: "Parte de este sabor esta retenido sin lote. Confirme que estas cajas no son de ahi.",
      expired: "La fecha de consumo ya paso.",
      needPo: "Falta el PO #.", needCust: "Falta el cliente.", needCarrier: "Falta el transportista.",
      needTrailer: "Falta el trailer #.", needSeal: "Escriba el sello # o marque Sin sello.",
      needChecks: "Conteste cada revision del trailer.", needFailNote: "Escriba que fallo en cada Falla.",
      needProd: "Conteste cada revision del producto con S.", needLine: "Agregue al menos un sabor con lote, fecha y cajas.",
      needBy: "Escriba su nombre o iniciales.", needReason: "Escriba la razon del rechazo.",
      heldBlock: "Un lote esta en RETENCION QA. No se puede liberar.", expBlock: "Una fecha de consumo ya paso.",
      trailerFailBlock: "Una revision del trailer fallo. Rechace este trailer.",
      caseDiff: "Cajas cargadas ({a}) no coinciden con cajas pedidas ({b}). Liberar de todos modos?",
      saving: "Guardando…", saved: "Guardado", notSaved: "No se guardo.", offline: "Sin conexion a la nube. No se guardo nada. El formulario se conservo.",
      readback: "Guardado, pero la verificacion no coincidio. Revise el registro.",
      photoFail: "Registro guardado. La foto no se subio: ",
      from: "Desde", to: "Hasta", status: "Estado", all: "Todos", released: "LIBERADO", rejected: "RECHAZADO",
      csv: "Exportar CSV", xlsx: "Exportar XLSX", empty: "Aun no hay registros.", loading: "Cargando…",
      date: "Fecha", by: "Liberado por", view: "Ver", back: "Volver al registro", pdf: "Descargar PDF",
      packet: "Agregar PDF a Order Docs", packetDone: "Agregado a Order Docs", reason: "Razon",
      newFor: "Nueva liberacion para esta PO", correction: "Los registros no se editan. Para corregir, guarde uno nuevo y anotelo.",
      clear: "Borrar formulario", clearAsk: "Borrar este formulario?", trailerResult: "Trailer", productResult: "Producto",
      authHint: "Solo personas autorizadas para liberar envios firman aqui. Los lotes ya deben estar liberados por Calidad."
    }
  };

  // ---------- small helpers ----------
  function lang() {
    if (!doc || !doc.getElementById) return "en";
    var es = doc.getElementById("lang-es");
    return es && es.classList && es.classList.contains("active") ? "es" : "en";
  }
  function T(k, vars) {
    var pack = TXT[lang()] || TXT.en;
    var s = pack[k] != null ? pack[k] : (TXT.en[k] != null ? TXT.en[k] : k);
    if (vars) Object.keys(vars).forEach(function (n) { s = s.split("{" + n + "}").join(String(vars[n])); });
    return s;
  }
  function E(k) { return TXT.en[k] != null ? TXT.en[k] : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return doc ? doc.getElementById(id) : null; }
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isNaN(n) ? 0 : n; }
  function str(v) { return String(v == null ? "" : v).trim(); }
  function normLot(lot) { return String(lot || "").toUpperCase().replace(/\s+/g, ""); }
  function mtDay(ts) {
    var d = ts ? new Date(ts) : new Date();
    if (isNaN(d.getTime())) return "";
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function mtTime(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }).format(d) + " MT";
    } catch (e) { return d.toISOString(); }
  }
  function toast(m, ms) {
    var t = $("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  }
  function userEmail() { try { return String(root.SMK_USER_EMAIL || "").trim().toLowerCase(); } catch (e) { return ""; } }
  function flavorName(code) {
    try { if (root.FGLOTS && typeof root.FGLOTS.flavorName === "function") return root.FGLOTS.flavorName(code) || ""; } catch (e) {}
    return "";
  }

  // ---------- pure model (exported for tests) ----------
  function emptyRecord(prefill) {
    prefill = prefill || {};
    var checks = {};
    TRAILER.forEach(function (k) { checks[k] = { v: "", note: "" }; });
    var prod = {};
    PRODUCT.forEach(function (k) { prod[k] = ""; });
    return {
      started_at: new Date().toISOString(),
      po: str(prefill.po), customer: str(prefill.customer), ship_to: str(prefill.ship_to),
      carrier: str(prefill.carrier), pro_bol: str(prefill.pro_bol), trailer: "", seal: "", seal_na: false,
      driver: "", dock_door: "", order_key: str(prefill.order_key), ordered_cases: num(prefill.ordered_cases) || 0,
      trailer_checks: checks, product_checks: prod,
      lines: (prefill.lines && prefill.lines.length ? prefill.lines : [{}]).map(function (l) {
        return { flavor: str(l.flavor), flavor_code: str(l.flavor_code), lot: str(l.lot), best_by: str(l.best_by), cases: l.cases != null && l.cases !== "" ? String(l.cases) : "", ordered: num(l.ordered || l.cases) || 0 };
      }),
      released_by: "", notes: "", reject_reason: ""
    };
  }

  // holds: { lots: {NORMLOT: reason}, flavorsNoLot: {CODE: true} }
  function lineHold(line, holds) {
    var out = { held: false, warn: false, reason: "" };
    if (!holds) return out;
    var k = normLot(line && line.lot);
    if (k && holds.lots && holds.lots[k]) { out.held = true; out.reason = holds.lots[k]; }
    var code = String(line && line.flavor_code || "").toUpperCase();
    if (!out.held && code && holds.flavorsNoLot && holds.flavorsNoLot[code]) out.warn = true;
    return out;
  }

  function evaluate(rec, holds, today) {
    today = today || mtDay();
    var trailerFails = [], unanswered = [], failNoNote = [];
    TRAILER.forEach(function (k) {
      var c = (rec.trailer_checks || {})[k] || {};
      if (c.v === "fail") { trailerFails.push(k); if (!str(c.note)) failNoNote.push(k); }
      else if (c.v !== "pass") unanswered.push(k);
    });
    var prodNo = [], prodMissing = [];
    PRODUCT.forEach(function (k) {
      var v = (rec.product_checks || {})[k];
      if (v === "N") prodNo.push(k); else if (v !== "Y") prodMissing.push(k);
    });
    var lines = (rec.lines || []).filter(function (l) { return str(l.flavor) || str(l.lot) || str(l.cases) || str(l.best_by); });
    var badLines = lines.filter(function (l) { return !str(l.flavor) || !str(l.lot) || !str(l.best_by) || !(num(l.cases) > 0); });
    var held = [], warn = [], expired = [];
    lines.forEach(function (l) {
      var h = lineHold(l, holds);
      if (h.held) held.push({ lot: l.lot, flavor: l.flavor, reason: h.reason });
      else if (h.warn) warn.push({ lot: l.lot, flavor: l.flavor });
      if (str(l.best_by) && str(l.best_by) < today) expired.push({ lot: l.lot, flavor: l.flavor, best_by: l.best_by });
    });
    var loaded = lines.reduce(function (a, l) { return a + num(l.cases); }, 0);
    var ordered = num(rec.ordered_cases);

    var header = [];
    if (!str(rec.po)) header.push("needPo");
    if (!str(rec.customer)) header.push("needCust");
    if (!str(rec.carrier)) header.push("needCarrier");
    if (!str(rec.trailer)) header.push("needTrailer");

    var release = header.slice();
    if (!str(rec.seal) && !rec.seal_na) release.push("needSeal");
    if (unanswered.length) release.push("needChecks");
    if (trailerFails.length) release.push("trailerFailBlock");
    if (prodNo.length || prodMissing.length) release.push("needProd");
    if (!lines.length || badLines.length) release.push("needLine");
    if (held.length) release.push("heldBlock");
    if (expired.length) release.push("expBlock");
    if (!str(rec.released_by)) release.push("needBy");

    var reject = header.slice();
    if (failNoNote.length) reject.push("needFailNote");
    if (!str(rec.released_by)) reject.push("needBy");
    if (!str(rec.reject_reason) && !trailerFails.length && !held.length && !prodNo.length) reject.push("needReason");

    return {
      trailerFails: trailerFails, unanswered: unanswered, failNoNote: failNoNote,
      prodNo: prodNo, prodMissing: prodMissing, lines: lines, held: held, warn: warn, expired: expired,
      loaded: loaded, ordered: ordered, caseMismatch: ordered > 0 && loaded > 0 && loaded !== ordered,
      canRelease: release.length === 0, releaseErrors: release, rejectErrors: reject,
      mustReject: trailerFails.length > 0
    };
  }

  function rejectReasonText(rec, ev) {
    var parts = [];
    if (ev.trailerFails.length) parts.push("Trailer failed: " + ev.trailerFails.map(function (k) {
      var n = str(((rec.trailer_checks || {})[k] || {}).note);
      return E(k) + (n ? " (" + n + ")" : "");
    }).join("; ") + ". Do not load: request another trailer from carrier.");
    if (ev.held.length) parts.push("Lot on QA HOLD: " + ev.held.map(function (h) { return h.flavor + " " + h.lot; }).join(", ") + ".");
    if (ev.prodNo.length) parts.push("Product check N: " + ev.prodNo.map(E).join("; ") + ".");
    if (str(rec.reject_reason)) parts.push(str(rec.reject_reason));
    return parts.join(" ");
  }

  function buildRow(rec, result, ev, who) {
    var now = new Date().toISOString();
    var lines = ev.lines.map(function (l) {
      var h = { flavor: str(l.flavor), flavor_code: str(l.flavor_code), lot: str(l.lot), best_by: str(l.best_by), cases: num(l.cases) };
      if (l.ordered) h.ordered = num(l.ordered);
      return h;
    });
    var header = {
      form_ref: FORM_REF, sqf: ["11.6.5.2", "2.4.7.1"],
      po: str(rec.po), customer: str(rec.customer), ship_to: str(rec.ship_to), carrier: str(rec.carrier),
      pro_bol: str(rec.pro_bol), trailer: str(rec.trailer), seal: rec.seal_na ? "N/A" : str(rec.seal), seal_na: !!rec.seal_na,
      driver: str(rec.driver), dock_door: str(rec.dock_door), order_key: str(rec.order_key),
      started_at: rec.started_at || now, trailer_checks: rec.trailer_checks, product_checks: rec.product_checks,
      trailer_result: ev.trailerFails.length ? "FAIL" : (ev.unanswered.length ? "INCOMPLETE" : "PASS"),
      cases_loaded: ev.loaded, cases_ordered: ev.ordered || null,
      hold_check: { held: ev.held, warn: ev.warn, checked_at: now },
      released_by_name: str(rec.released_by), released_by_email: who || "", released_at: now,
      notes: str(rec.notes), reject_reason: result === "REJECTED" ? rejectReasonText(rec, ev) : "",
      dry_van: true, lang: lang()
    };
    return {
      form_type: FORM_TYPE, ref: str(rec.po), form_date: mtDay(now), machine: str(rec.dock_door),
      header: header, lines: lines, result: result, operator: str(rec.released_by),
      reviewer: who || "", reviewed_at: now, status: "complete"
    };
  }

  // Open orders for the picker. SPS / retail POs come from demand_lines
  // (they carry flavors and cases). Orders without lines come from orders.
  function groupOrders(demandLines, orders) {
    var map = {}, list = [];
    (demandLines || []).forEach(function (d) {
      if (String(d.status || "Open") !== "Open" || !str(d.po)) return;
      var key = "D|" + (d.source || "") + "|" + (d.partner || "") + "|" + d.po;
      var g = map[key];
      if (!g) {
        g = map[key] = { key: key, po: str(d.po), customer: str(d.partner), ship_to: str(d.dc), due: str(d.due_date), source: str(d.source), lines: [] };
        list.push(g);
      }
      var code = str(d.flavor_code);
      var fl = str(d.flavor);
      if (/^UNMAPPED/i.test(fl) && code) fl = "";
      g.lines.push({ flavor: fl || flavorName(code) || code, flavor_code: code, cases: num(d.cases) || "", ordered: num(d.cases) });
    });
    var seen = {};
    list.forEach(function (g) { seen[g.po.toUpperCase().replace(/\s+/g, "")] = true; });
    (orders || []).forEach(function (o) {
      if (String(o.status || "") !== "Open") return;
      var po = str(o.customer_po || o.order_id);
      if (!po) return;
      var k = po.toUpperCase().replace(/\s+/g, "");
      var key = "O|" + (o.customer || "") + "|" + po;
      if (seen[k] || map[key]) return;
      map[key] = { key: key, po: po, customer: str(o.customer), ship_to: "", carrier: str(o.carrier), due: str(o.ship_date), source: "Orders", lines: [] };
      list.push(map[key]);
    });
    list.forEach(function (g) { g.ordered_cases = g.lines.reduce(function (a, l) { return a + num(l.ordered); }, 0); });
    list.sort(function (a, b) { return (a.customer + a.po).localeCompare(b.customer + b.po); });
    return list;
  }

  function filterRows(rows, f) {
    f = f || {};
    var q = str(f.customer).toLowerCase();
    return (rows || []).filter(function (r) {
      if (r.form_type && r.form_type !== FORM_TYPE) return false;
      var d = String(r.form_date || "").slice(0, 10);
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
      if (f.status && r.result !== f.status) return false;
      if (q) {
        var h = r.header || {};
        var blob = [h.customer, h.po, h.carrier, h.trailer, h.pro_bol].join(" ").toLowerCase();
        if (blob.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  var EXPORT_COLS = ["Record ID", "Date", "Released/Rejected at (MT)", "Status", "PO", "Customer", "Ship-to", "Carrier", "PRO/BOL", "Trailer", "Seal", "Driver", "Dock door",
    "Trailer result"].concat(TRAILER.map(E)).concat(PRODUCT.map(E)).concat(["Flavors / lots / best-by / cases", "Cases loaded", "Cases ordered", "Released by", "Signed-in user", "Reject reason", "Notes", "Photo"]);
  function exportRows(rows) {
    return (rows || []).map(function (r) {
      var h = r.header || {};
      var tc = h.trailer_checks || {}, pc = h.product_checks || {};
      var lines = (r.lines || []).map(function (l) { return [l.flavor, "lot " + l.lot, "BB " + l.best_by, l.cases + " cs"].join(" "); }).join("; ");
      return [r.id || "", r.form_date || "", mtTime(r.reviewed_at || h.released_at), r.result || "", h.po || r.ref || "", h.customer || "", h.ship_to || "", h.carrier || "", h.pro_bol || "", h.trailer || "", h.seal || "", h.driver || "", h.dock_door || r.machine || "",
        h.trailer_result || ""]
        .concat(TRAILER.map(function (k) { var c = tc[k] || {}; return (c.v || "").toUpperCase() + (c.note ? " - " + c.note : ""); }))
        .concat(PRODUCT.map(function (k) { return pc[k] || ""; }))
        .concat([lines, h.cases_loaded != null ? h.cases_loaded : "", h.cases_ordered != null ? h.cases_ordered : "", h.released_by_name || r.operator || "", h.released_by_email || r.reviewer || "", h.reject_reason || "", h.notes || "", (h.photo && h.photo.url) || ""]);
    });
  }
  function csvText(rows) {
    var all = [EXPORT_COLS].concat(exportRows(rows));
    return all.map(function (row) {
      return row.map(function (v) {
        var s = String(v == null ? "" : v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(",");
    }).join("\r\n");
  }

  // ---------- data ----------
  var sb = null;
  function cloudConfigured() { return !!(root.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY); }
  function isCloud() { return !!(root.DB && root.DB.mode === "cloud" && cloudConfigured()); }
  function client() {
    if (sb) return sb;
    if (!cloudConfigured()) return null;
    try {
      sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "obr-auth" }
      });
    } catch (e) { sb = null; }
    return sb;
  }
  function waitCloud(ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (isCloud()) return resolve(true);
        if (!cloudConfigured() || Date.now() - t0 > (ms || 8000)) return resolve(false);
        setTimeout(tick, 150);
      })();
    });
  }
  function loadRows() {
    return waitCloud().then(function (ok) {
      if (!ok || !client()) { state.err = T("offline"); state.rows = []; return []; }
      return client().from("qc_forms").select("*").eq("form_type", FORM_TYPE).order("created_at", { ascending: false }).limit(3000).then(function (r) {
        if (r && r.error) { state.err = r.error.message || "load failed"; state.rows = []; return []; }
        state.err = ""; state.rows = (r && r.data) || []; return state.rows;
      });
    });
  }
  function loadHolds() {
    var holds = { lots: {}, flavorsNoLot: {} };
    try {
      var st = (root.DB && typeof root.DB.stock === "function" ? root.DB.stock() : []) || [];
      var isHold = root.DB && typeof root.DB.isHoldLocation === "function" ? root.DB.isHoldLocation : function (l) { return /^(QA-HOLD|QUARANTINE|RETURNS-HOLD)$/i.test(String(l || "")); };
      st.forEach(function (r) {
        if (!isHold(r.location) || !(Number(r.qty) > 0)) return;
        var k = normLot(r.lot);
        if (k) holds.lots[k] = holds.lots[k] || ("Stock in " + r.location);
        else {
          var m = /-([SLA]\d{2})$/i.exec(String(r.item_id || ""));
          if (m) holds.flavorsNoLot[m[1].toUpperCase()] = true;
        }
      });
    } catch (e) {}
    if (!isCloud() || !client()) return Promise.resolve(holds);
    return client().from("hold_log").select("lot,item_id,item_name,hold_reason,status").eq("status", "held").limit(2000).then(function (r) {
      ((r && r.data) || []).forEach(function (h) {
        var k = normLot(h.lot);
        if (k) holds.lots[k] = "HOLD Log: " + (h.item_name || h.item_id || "") + (h.hold_reason ? " - " + h.hold_reason : "");
      });
      return holds;
    }, function () { return holds; });
  }

  // ---------- state + render ----------
  var state = { active: false, tab: "new", cur: null, rows: null, err: "", filters: { from: "", to: "", customer: "", status: "" }, detailId: "", holds: null, photo: null, orderQ: "", saving: false, dirty: false };

  function saveDraft() { try { if (state.cur) localStorage.setItem(DRAFT_LS, JSON.stringify(state.cur)); } catch (e) {} }
  function loadDraft() { try { var v = localStorage.getItem(DRAFT_LS); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function dropDraft() { try { localStorage.removeItem(DRAFT_LS); } catch (e) {} }

  function styleOnce() {
    if (!doc || $("obr-style")) return;
    var s = doc.createElement("style");
    s.id = "obr-style";
    s.textContent = [
      "#obr-root .obr-tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}",
      "#obr-root .obr-tabs button.on{background:#04223B;color:#fff}",
      "#obr-root .obr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}",
      "#obr-root .obr-chk{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee;flex-wrap:wrap}",
      "#obr-root .obr-chk .obr-q{flex:1 1 260px;font-weight:600}",
      "#obr-root .obr-pf button{min-width:64px;padding:8px 12px;border:1px solid #bbb;background:#fff;border-radius:8px;font-weight:700;margin-left:4px;cursor:pointer}",
      "#obr-root .obr-pf button.pass.on{background:#1d7a3a;color:#fff;border-color:#1d7a3a}",
      "#obr-root .obr-pf button.fail.on{background:#B52024;color:#fff;border-color:#B52024}",
      "#obr-root .obr-note{flex:1 1 100%}",
      "#obr-root .obr-stop{background:#B52024;color:#fff;padding:12px;border-radius:8px;font-weight:800;margin:10px 0}",
      "#obr-root .obr-warn{background:#fff4df;color:#7a4d05;padding:8px 10px;border-radius:8px;margin:6px 0;font-weight:600}",
      "#obr-root .obr-err{color:#B52024;font-weight:600;margin:4px 0}",
      "#obr-root .obr-line{display:grid;grid-template-columns:2fr 1.4fr 1.1fr .8fr auto;gap:8px;align-items:end;margin-bottom:6px}",
      "@media(max-width:700px){#obr-root .obr-line{grid-template-columns:1fr 1fr}}",
      "#obr-root .obr-pill{display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:800}",
      "#obr-root .obr-pill.rel{background:#dff3e5;color:#1d5631}#obr-root .obr-pill.rej{background:#fde2e2;color:#8a1414}",
      "#obr-root .obr-hold{color:#B52024;font-weight:800;font-size:12px}",
      "#obr-root .obr-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}",
      "#obr-root .obr-actions .danger{background:#B52024;color:#fff;border-color:#B52024}",
      "#obr-root table td,#obr-root table th{vertical-align:top}"
    ].join("");
    (doc.head || doc.documentElement).appendChild(s);
  }

  function pf(group, key, val, a, b, la, lb) {
    return '<span class="obr-pf"><button type="button" class="pass' + (val === a ? " on" : "") + '" data-obr-act="' + group + '" data-key="' + key + '" data-v="' + a + '">' + esc(la) + '</button>' +
      '<button type="button" class="fail' + (val === b ? " on" : "") + '" data-obr-act="' + group + '" data-key="' + key + '" data-v="' + b + '">' + esc(lb) + '</button></span>';
  }
  function inp(field, label, val, extra) {
    return '<div><label>' + esc(label) + '</label><input data-obr-f="' + field + '" autocomplete="off" value="' + esc(val) + '"' + (extra || "") + '></div>';
  }

  function ordersList() {
    var dl = [], od = [];
    try { dl = root.DB && root.DB.demandLines ? root.DB.demandLines() : []; } catch (e) {}
    try { od = root.DB && root.DB.orders ? root.DB.orders() : []; } catch (e) {}
    return groupOrders(dl, od);
  }

  function lotOptions(code) {
    if (!code) return "";
    var out = {}, list = [];
    try {
      var st = (root.DB && root.DB.stock ? root.DB.stock() : []) || [];
      var suf = "-" + code.toUpperCase();
      st.forEach(function (r) {
        var id = String(r.item_id || "").toUpperCase();
        if (!r.lot || !(Number(r.qty) > 0) || id.slice(-suf.length) !== suf) return;
        if (root.DB.isHoldLocation && root.DB.isHoldLocation(r.location)) return;
        if (!out[r.lot]) { out[r.lot] = 1; list.push(r.lot); }
      });
    } catch (e) {}
    return list.map(function (l) { return '<option value="' + esc(l) + '"></option>'; }).join("");
  }

  function formHtml() {
    var c = state.cur;
    var ev = evaluate(c, state.holds);
    var orders = ordersList();
    var q = state.orderQ.toLowerCase();
    var shown = orders.filter(function (o) { return !q || (o.customer + " " + o.po + " " + o.ship_to).toLowerCase().indexOf(q) >= 0; }).slice(0, 150);
    var pick = '<div class="card"><h2 class="sub2">' + esc(T("order")) + '</h2>' +
      '<div class="obr-grid"><div><label>' + esc(T("filterOrders")) + '</label><input id="obr-oq" data-obr-oq="1" autocomplete="off" value="' + esc(state.orderQ) + '"></div>' +
      '<div style="grid-column:span 2"><label>' + esc(T("pickOrder")) + '</label><select id="obr-order" data-obr-order="1"><option value="">' + esc(T("pickNone")) + '</option>' +
      shown.map(function (o) {
        return '<option value="' + esc(o.key) + '"' + (o.key === c.order_key ? " selected" : "") + '>' + esc(o.customer + " | " + o.po + (o.ship_to ? " | " + o.ship_to : "") + (o.due ? " | due " + o.due : "") + (o.ordered_cases ? " | " + o.ordered_cases + " cs" : "")) + '</option>';
      }).join("") + '</select></div></div>' +
      '<div class="obr-grid" style="margin-top:8px">' +
      inp("po", T("po"), c.po) + inp("customer", T("customer"), c.customer) + inp("ship_to", T("shipTo"), c.ship_to) +
      inp("carrier", T("carrier"), c.carrier, ' list="obr-carriers" placeholder="XPO, Estes, SAIA…"') + inp("pro_bol", T("pro"), c.pro_bol) +
      inp("trailer", T("trailer"), c.trailer) +
      '<div><label>' + esc(T("seal")) + '</label><input data-obr-f="seal" autocomplete="off" value="' + esc(c.seal) + '"' + (c.seal_na ? " disabled" : "") + '>' +
      '<label style="font-weight:500"><input type="checkbox" data-obr-f="seal_na"' + (c.seal_na ? " checked" : "") + '> ' + esc(T("sealNa")) + '</label></div>' +
      inp("driver", T("driver"), c.driver) + inp("dock_door", T("dock"), c.dock_door) +
      '</div><datalist id="obr-carriers"><option value="XPO"></option><option value="Estes"></option><option value="SAIA"></option><option value="Old Dominion"></option><option value="R+L"></option><option value="TForce"></option><option value="FedEx Freight"></option><option value="Customer pickup"></option></datalist>' +
      '<p class="hint">' + esc(T("started")) + ': ' + esc(mtTime(c.started_at)) + '</p></div>';

    var tr = '<div class="card"><h2 class="sub2">' + esc(T("sTrailer")) + '</h2><p class="hint">' + esc(T("sTrailerHint")) + '</p>' +
      TRAILER.map(function (k) {
        var ch = c.trailer_checks[k] || {};
        return '<div class="obr-chk"><span class="obr-q">' + esc(T(k)) + '</span>' + pf("tchk", k, ch.v, "pass", "fail", T("pass"), T("fail")) +
          (ch.v === "fail" ? '<input class="obr-note" data-obr-note="' + k + '" placeholder="' + esc(T("failNote")) + '" value="' + esc(ch.note) + '">' : "") + '</div>';
      }).join("") +
      (ev.mustReject ? '<div class="obr-stop">' + esc(T("doNotLoad")) + '</div>' : "") + '</div>';

    var lines = '<div class="card"><h2 class="sub2">' + esc(T("sProduct")) + '</h2>' +
      c.lines.map(function (l, i) {
        var h = lineHold(l, state.holds);
        var dlId = "obr-lots-" + i;
        var exp = str(l.best_by) && str(l.best_by) < mtDay();
        return '<div class="obr-line">' +
          '<div><label>' + esc(T("flavor")) + '</label><input data-obr-line="' + i + '" data-k="flavor" value="' + esc(l.flavor) + '"></div>' +
          '<div><label>' + esc(T("lot")) + '</label><input data-obr-line="' + i + '" data-k="lot" list="' + dlId + '" value="' + esc(l.lot) + '"><datalist id="' + dlId + '">' + lotOptions(l.flavor_code) + '</datalist></div>' +
          '<div><label>' + esc(T("bestBy")) + '</label><input type="date" data-obr-line="' + i + '" data-k="best_by" value="' + esc(l.best_by) + '"></div>' +
          '<div><label>' + esc(T("cases")) + (l.ordered ? ' <span class="muted">(' + esc(T("ordered")) + " " + l.ordered + ')</span>' : "") + '</label><input type="number" min="0" step="1" data-obr-line="' + i + '" data-k="cases" value="' + esc(l.cases) + '"></div>' +
          '<div><button type="button" class="ghost sm" data-obr-act="rmline" data-i="' + i + '">' + esc(T("remove")) + '</button></div></div>' +
          (h.held ? '<div class="obr-hold">&#9940; ' + esc(T("onHold")) + ' ' + esc(h.reason) + '</div>' : "") +
          (h.warn ? '<div class="obr-warn">' + esc(T("holdWarn")) + '</div>' : "") +
          (exp ? '<div class="obr-hold">' + esc(T("expired")) + '</div>' : "");
      }).join("") +
      '<button type="button" class="ghost" data-obr-act="addline">' + esc(T("addLine")) + '</button>' +
      (ev.ordered ? '<p class="hint">' + esc(T("cases")) + ': ' + ev.loaded + ' / ' + esc(T("ordered")) + ' ' + ev.ordered + '</p>' : "") + '</div>';

    var pc = '<div class="card"><h2 class="sub2">' + esc(T("sChecks")) + '</h2>' +
      PRODUCT.map(function (k) {
        return '<div class="obr-chk"><span class="obr-q">' + esc(T(k)) + '</span>' + pf("pchk", k, c.product_checks[k], "Y", "N", T("yes"), T("no")) + '</div>';
      }).join("") + '</div>';

    var who = userEmail();
    var rel = '<div class="card"><h2 class="sub2">' + esc(T("sRelease")) + '</h2><p class="hint">' + esc(T("authHint")) + '</p>' +
      '<div class="obr-grid">' + inp("released_by", T("relBy"), c.released_by) +
      '<div><label>' + esc(T("relUser")) + '</label><div style="padding:8px 0;font-weight:600">' + esc(who || T("notSigned")) + '</div></div>' +
      '<div><label>' + esc(T("photo")) + '</label><input type="file" id="obr-photo" accept="image/*,.pdf" capture="environment">' +
      (state.photo ? '<div class="hint">&#128206; ' + esc(state.photo.name) + '</div>' : "") + '</div></div>' +
      '<div><label>' + esc(T("notes")) + '</label><input data-obr-f="notes" autocomplete="off" value="' + esc(c.notes) + '"></div>' +
      '<div><label>' + esc(T("rejectReason")) + '</label><input data-obr-f="reject_reason" autocomplete="off" value="' + esc(c.reject_reason) + '"></div>' +
      '<div id="obr-errs"></div>' +
      '<div class="obr-actions">' +
      '<button type="button" class="primary" data-obr-act="release"' + (ev.mustReject || state.saving ? " disabled" : "") + '>' + esc(T("release")) + '</button>' +
      '<button type="button" class="danger" data-obr-act="reject"' + (state.saving ? " disabled" : "") + '>' + esc(T("reject")) + '</button>' +
      '<button type="button" class="ghost" data-obr-act="clear">' + esc(T("clear")) + '</button></div>' +
      '<p class="hint">' + esc(T("correction")) + '</p></div>';

    return pick + tr + lines + pc + rel;
  }

  function logHtml() {
    if (state.rows == null) return '<div class="card"><p class="muted">' + esc(T("loading")) + '</p></div>';
    var f = state.filters;
    var list = filterRows(state.rows, f);
    var head = '<div class="card"><div class="obr-grid">' +
      '<div><label>' + esc(T("from")) + '</label><input type="date" data-obr-flt="from" value="' + esc(f.from) + '"></div>' +
      '<div><label>' + esc(T("to")) + '</label><input type="date" data-obr-flt="to" value="' + esc(f.to) + '"></div>' +
      '<div><label>' + esc(T("customer")) + '</label><input data-obr-flt="customer" autocomplete="off" value="' + esc(f.customer) + '"></div>' +
      '<div><label>' + esc(T("status")) + '</label><select data-obr-flt="status"><option value="">' + esc(T("all")) + '</option>' +
      '<option value="RELEASED"' + (f.status === "RELEASED" ? " selected" : "") + '>' + esc(T("released")) + '</option>' +
      '<option value="REJECTED"' + (f.status === "REJECTED" ? " selected" : "") + '>' + esc(T("rejected")) + '</option></select></div></div>' +
      '<div class="obr-actions"><button type="button" class="ghost" data-obr-act="csv">' + esc(T("csv")) + '</button><button type="button" class="ghost" data-obr-act="xlsx">' + esc(T("xlsx")) + '</button></div>' +
      (state.err ? '<p class="obr-err">' + esc(state.err) + '</p>' : "") + '</div>';
    var body = !list.length ? '<p class="muted">' + esc(T("empty")) + '</p>' :
      '<div class="tblwrap"><table><thead><tr><th>' + esc(T("date")) + '</th><th>' + esc(T("status")) + '</th><th>' + esc(T("customer")) + '</th><th>' + esc(T("po")) + '</th><th>' + esc(T("carrier")) + '</th><th>' + esc(T("trailer")) + '</th><th>' + esc(T("seal")) + '</th><th>' + esc(T("lot")) + '</th><th>' + esc(T("by")) + '</th><th></th></tr></thead><tbody>' +
      list.map(function (r) {
        var h = r.header || {};
        var rel = r.result === "RELEASED";
        return '<tr><td>' + esc(mtTime(r.reviewed_at || h.released_at) || r.form_date) + '</td><td><span class="obr-pill ' + (rel ? "rel" : "rej") + '">' + esc(rel ? T("released") : T("rejected")) + '</span></td>' +
          '<td>' + esc(h.customer) + '</td><td>' + esc(h.po || r.ref) + '</td><td>' + esc(h.carrier) + '</td><td>' + esc(h.trailer) + '</td><td>' + esc(h.seal) + '</td>' +
          '<td>' + esc((r.lines || []).map(function (l) { return l.lot; }).filter(Boolean).join(", ")) + '</td><td>' + esc(h.released_by_name || r.operator) + '</td>' +
          '<td><button type="button" class="ghost sm" data-obr-act="detail" data-id="' + esc(r.id) + '">' + esc(T("view")) + '</button></td></tr>';
      }).join("") + '</tbody></table></div>';
    return head + '<div class="card"><h2 class="sub2">' + esc(T("tabLog")) + ' (' + list.length + ')</h2>' + body + '</div>';
  }

  function findRow(id) { return (state.rows || []).filter(function (r) { return String(r.id) === String(id); })[0] || null; }

  function detailHtml() {
    var r = findRow(state.detailId);
    if (!r) return '<div class="card"><p class="muted">' + esc(T("empty")) + '</p><button type="button" class="ghost" data-obr-act="tab" data-tab="log">' + esc(T("back")) + '</button></div>';
    var h = r.header || {};
    var rel = r.result === "RELEASED";
    var kv = function (k, v) { return '<tr><th style="text-align:left;width:220px">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>'; };
    var tc = h.trailer_checks || {}, pcx = h.product_checks || {};
    return '<div class="card"><div class="obr-actions" style="margin-top:0"><button type="button" class="ghost" data-obr-act="tab" data-tab="log">' + esc(T("back")) + '</button>' +
      '<button type="button" class="primary" data-obr-act="pdf" data-id="' + esc(r.id) + '">' + esc(T("pdf")) + '</button>' +
      '<button type="button" class="ghost" data-obr-act="packet" data-id="' + esc(r.id) + '">' + esc(T("packet")) + '</button>' +
      '<button type="button" class="ghost" data-obr-act="newfor" data-id="' + esc(r.id) + '">' + esc(T("newFor")) + '</button></div>' +
      '<h2>' + esc(T("title")) + ' <span class="obr-pill ' + (rel ? "rel" : "rej") + '">' + esc(rel ? T("released") : T("rejected")) + '</span></h2>' +
      '<table>' + kv("Record ID", r.id) + kv(T("date"), mtTime(r.reviewed_at || h.released_at)) + kv(T("started"), mtTime(h.started_at)) +
      kv(T("po"), h.po) + kv(T("customer"), h.customer) + kv(T("shipTo"), h.ship_to) + kv(T("carrier"), h.carrier) + kv(T("pro"), h.pro_bol) +
      kv(T("trailer"), h.trailer) + kv(T("seal"), h.seal) + kv(T("driver"), h.driver) + kv(T("dock"), h.dock_door) + '</table>' +
      '<h2 class="sub2">' + esc(T("sTrailer")) + '</h2><table>' + TRAILER.map(function (k) { var c = tc[k] || {}; return kv(T(k), (c.v === "pass" ? T("pass") : c.v === "fail" ? T("fail") : "-") + (c.note ? " - " + c.note : "")); }).join("") + '</table>' +
      '<h2 class="sub2">' + esc(T("sProduct")) + '</h2><table><thead><tr><th>' + esc(T("flavor")) + '</th><th>' + esc(T("lot")) + '</th><th>' + esc(T("bestBy")) + '</th><th>' + esc(T("cases")) + '</th></tr></thead><tbody>' +
      (r.lines || []).map(function (l) { return '<tr><td>' + esc(l.flavor) + '</td><td>' + esc(l.lot) + '</td><td>' + esc(l.best_by) + '</td><td>' + esc(l.cases) + '</td></tr>'; }).join("") + '</tbody></table>' +
      '<h2 class="sub2">' + esc(T("sChecks")) + '</h2><table>' + PRODUCT.map(function (k) { return kv(T(k), pcx[k] || "-"); }).join("") + '</table>' +
      '<h2 class="sub2">' + esc(T("sRelease")) + '</h2><table>' + kv(T("relBy"), h.released_by_name || r.operator) + kv(T("relUser"), h.released_by_email || r.reviewer) +
      (h.reject_reason ? kv(T("reason"), h.reject_reason) : "") + (h.notes ? kv(T("notes"), h.notes) : "") + '</table>' +
      (h.photo && h.photo.url ? '<p><a href="' + esc(h.photo.url) + '" target="_blank" rel="noopener">&#128206; ' + esc(h.photo.name || "photo") + '</a></p>' : "") + '</div>';
  }

  function render() {
    if (!doc) return;
    var host = $("view");
    if (!host) return;
    styleOnce();
    if (!state.cur) state.cur = loadDraft() || emptyRecord();
    var tabs = '<div class="obr-tabs"><button type="button" class="ghost' + (state.tab === "new" ? " on" : "") + '" data-obr-act="tab" data-tab="new">' + esc(T("tabNew")) + '</button>' +
      '<button type="button" class="ghost' + (state.tab !== "new" ? " on" : "") + '" data-obr-act="tab" data-tab="log">' + esc(T("tabLog")) + '</button></div>';
    var body = state.tab === "new" ? formHtml() : state.tab === "detail" ? detailHtml() : logHtml();
    var html = '<div id="obr-root"><div class="card"><h2>' + esc(T("title")) + '</h2><p class="hint">' + esc(T("sqf")) + '</p>' + tabs + '</div>' + body + '</div>';
    var existing = $("obr-root");
    var y = 0;
    try { y = root.scrollY || 0; } catch (e) {}
    if (existing && existing.parentNode === host) existing.outerHTML = html;
    else {
      var shell = $("dept-shell");
      host.innerHTML = html;
      if (shell) host.insertBefore(shell, host.firstChild);
    }
    host.setAttribute("data-obr", "1");
    try { if (existing) root.scrollTo(0, y); } catch (e) {}
  }

  function showErrors(keys) {
    var box = $("obr-errs");
    if (!box) return;
    box.innerHTML = keys.map(function (k) { return '<div class="obr-err">' + esc(T(k)) + '</div>'; }).join("");
  }

  // ---------- actions ----------
  function setPath(field, value) {
    var c = state.cur;
    if (field === "seal_na") { c.seal_na = !!value; if (c.seal_na) c.seal = ""; return true; }
    c[field] = value;
    return false;
  }

  function applyOrder(key) {
    var o = ordersList().filter(function (x) { return x.key === key; })[0];
    var c = state.cur;
    if (!o) { c.order_key = ""; return; }
    c.order_key = o.key; c.po = o.po; c.customer = o.customer; c.ship_to = o.ship_to || c.ship_to;
    if (o.carrier && !c.carrier) c.carrier = o.carrier;
    c.ordered_cases = o.ordered_cases || 0;
    if (o.lines.length) c.lines = o.lines.map(function (l) { return { flavor: l.flavor, flavor_code: l.flavor_code, lot: "", best_by: "", cases: l.cases === "" ? "" : String(l.cases), ordered: l.ordered }; });
  }

  function refreshHolds() {
    return loadHolds().then(function (h) { state.holds = h; return h; });
  }

  function submit(kind) {
    if (state.saving) return;
    var c = state.cur;
    refreshHolds().then(function () {
      var ev = evaluate(c, state.holds);
      var errs = kind === "release" ? ev.releaseErrors : ev.rejectErrors;
      if (errs.length) { render(); showErrors(errs); toast(T(errs[0]), 4000); return; }
      if (kind === "release" && ev.caseMismatch && root.confirm && !root.confirm(T("caseDiff", { a: ev.loaded, b: ev.ordered }))) return;
      return waitCloud().then(function (ok) {
        if (!ok || !client()) { toast(T("offline"), 6000); return; }
        state.saving = true;
        toast(T("saving"));
        var row = buildRow(c, kind === "release" ? "RELEASED" : "REJECTED", ev, userEmail());
        var photo = state.photo;
        return client().from("qc_forms").insert(row).select("*").then(function (r) {
          if (r && r.error) throw new Error(r.error.message || "insert failed");
          var saved = r && r.data && r.data[0];
          if (!saved || !saved.id) throw new Error("no row returned");
          return client().from("qc_forms").select("id,form_type,result,ref").eq("id", saved.id).limit(1).then(function (rb) {
            var got = rb && rb.data && rb.data[0];
            var good = !!(got && got.form_type === FORM_TYPE && got.result === row.result && String(got.ref || "") === row.ref);
            state.saving = false;
            state.dirty = false;
            state.cur = emptyRecord();
            state.photo = null;
            dropDraft();
            state.rows = null;
            state.tab = "detail";
            state.detailId = saved.id;
            toast(good ? T("saved") + " - " + row.result : T("readback"), 5000);
            var after = photo ? attachPhoto(saved, photo) : Promise.resolve();
            return after.then(function () { return loadRows(); }).then(function () { if (state.active) render(); });
          });
        }).catch(function (e) {
          state.saving = false;
          toast(T("notSaved") + " " + (e && e.message ? e.message : e), 7000);
          render();
        });
      });
    });
  }

  function attachPhoto(saved, file) {
    var h = saved.header || {};
    if (!root.DB || typeof root.DB.createOrderDoc !== "function") return Promise.resolve();
    var meta = { customer: h.customer || "", po_num: h.po || "", doc_type: "Trailer/BOL Photo", notes: "Outbound release " + (saved.result || "") + " " + saved.id };
    return root.DB.createOrderDoc(meta, file, h.released_by_name || "").then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.msg) || "upload failed");
      var docs = root.DB.orderDocs ? root.DB.orderDocs() : [];
      var hit = docs.filter(function (d) { return d.file_name === file.name && String(d.po_num || "") === String(meta.po_num) && String(d.notes || "").indexOf(saved.id) >= 0; })[0];
      if (!hit || !hit.file_url) return;
      var header = Object.assign({}, h, { photo: { name: hit.file_name, url: hit.file_url, path: hit.file_path || "", order_doc_id: hit.id || null } });
      return client().from("qc_forms").update({ header: header }).eq("id", saved.id).select("id");
    }).catch(function (e) { toast(T("photoFail") + (e && e.message ? e.message : e), 7000); });
  }

  function pdfFor(r) {
    var J = root.jspdf && root.jspdf.jsPDF;
    if (!J) { toast("PDF library did not load. Refresh the page."); return null; }
    var h = r.header || {};
    var pdf = new J({ unit: "pt", format: "letter" });
    var y = 48, X = 48, W = 516;
    function line(txt, bold, size) {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size || 10);
      var parts = pdf.splitTextToSize(String(txt == null ? "" : txt), W);
      parts.forEach(function (p) { if (y > 744) { pdf.addPage(); y = 48; } pdf.text(p, X, y); y += (size || 10) + 4; });
    }
    function gap() { y += 6; }
    line("Smackin' Snacks - Outbound Trailer Inspection & Shipment Release", true, 14);
    line("SQF Edition 10: 11.6.5.2 (vehicle inspection before loading) and 2.4.7.1 (product release). Dry van, dry foods.", false, 9);
    line("Status: " + (r.result || ""), true, 12);
    line("Record ID: " + r.id + "    Form: " + (h.form_ref || FORM_REF));
    gap();
    line("Shipment", true, 11);
    [["PO", h.po], ["Customer", h.customer], ["Ship-to", h.ship_to], ["Carrier", h.carrier], ["PRO / BOL", h.pro_bol], ["Trailer #", h.trailer], ["Seal #", h.seal], ["Driver", h.driver], ["Dock door", h.dock_door], ["Started", mtTime(h.started_at)]]
      .forEach(function (p) { line(p[0] + ": " + (p[1] || "")); });
    gap();
    line("Trailer inspection (before loading): " + (h.trailer_result || ""), true, 11);
    TRAILER.forEach(function (k) { var c = (h.trailer_checks || {})[k] || {}; line("[" + (c.v ? c.v.toUpperCase() : " - ") + "] " + E(k) + (c.note ? " - " + c.note : "")); });
    gap();
    line("Product loaded", true, 11);
    (r.lines || []).forEach(function (l) { line(l.flavor + " | Lot " + l.lot + " | Best-by " + l.best_by + " | " + l.cases + " cases"); });
    line("Cases loaded: " + (h.cases_loaded != null ? h.cases_loaded : "") + (h.cases_ordered ? "   Cases ordered: " + h.cases_ordered : ""));
    gap();
    line("Product checks", true, 11);
    PRODUCT.forEach(function (k) { line("[" + ((h.product_checks || {})[k] || "-") + "] " + E(k)); });
    var hc = h.hold_check || {};
    line("QA hold check at release: " + ((hc.held && hc.held.length) ? "LOT ON HOLD - " + hc.held.map(function (x) { return x.lot; }).join(", ") : "no held lots matched"));
    gap();
    line(r.result === "RELEASED" ? "Release" : "Rejection", true, 11);
    line((r.result === "RELEASED" ? "Released by: " : "Recorded by: ") + (h.released_by_name || r.operator || "") + "   Signed-in user: " + (h.released_by_email || r.reviewer || ""));
    line("Time: " + mtTime(r.reviewed_at || h.released_at));
    if (h.reject_reason) line("Reason: " + h.reject_reason);
    if (h.notes) line("Notes: " + h.notes);
    if (h.photo && h.photo.url) line("Photo: " + h.photo.url, false, 8);
    gap();
    line("Electronic record from Smackin OS (qc_forms). Printed " + mtTime(new Date().toISOString()) + ".", false, 8);
    return pdf;
  }
  function pdfName(r) {
    var h = r.header || {};
    return ("Trailer-Release_" + (h.customer || "") + "_" + (h.po || "") + "_" + (r.form_date || "")).replace(/[^\w.\-]+/g, "_") + ".pdf";
  }

  function download(name, blob) {
    var a = doc.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 1500);
  }

  function onClick(e) {
    var b = e.target && e.target.closest ? e.target.closest("#obr-root [data-obr-act]") : null;
    if (!b) return;
    var act = b.getAttribute("data-obr-act");
    var c = state.cur;
    if (act === "tab") {
      state.tab = b.getAttribute("data-tab") === "new" ? "new" : "log";
      if (state.tab === "log" && state.rows == null) loadRows().then(function () { if (state.active) render(); });
      render(); return;
    }
    if (act === "tchk") { var k = b.getAttribute("data-key"); c.trailer_checks[k].v = b.getAttribute("data-v"); state.dirty = true; saveDraft(); render(); return; }
    if (act === "pchk") { c.product_checks[b.getAttribute("data-key")] = b.getAttribute("data-v"); state.dirty = true; saveDraft(); render(); return; }
    if (act === "addline") { c.lines.push({ flavor: "", flavor_code: "", lot: "", best_by: "", cases: "", ordered: 0 }); saveDraft(); render(); return; }
    if (act === "rmline") { c.lines.splice(+b.getAttribute("data-i"), 1); if (!c.lines.length) c.lines.push({}); saveDraft(); render(); return; }
    if (act === "release" || act === "reject") { submit(act); return; }
    if (act === "clear") { if (root.confirm && !root.confirm(T("clearAsk"))) return; state.cur = emptyRecord(); state.photo = null; state.dirty = false; dropDraft(); render(); return; }
    if (act === "detail") { state.tab = "detail"; state.detailId = b.getAttribute("data-id"); render(); try { root.scrollTo(0, 0); } catch (x) {} return; }
    if (act === "csv") {
      var list = filterRows(state.rows, state.filters);
      download("trailer-release-log_" + mtDay() + ".csv", new Blob(["\ufeff" + csvText(list)], { type: "text/csv;charset=utf-8" }));
      return;
    }
    if (act === "xlsx") {
      if (!root.XLSX) { toast("XLSX library did not load. Refresh the page."); return; }
      var l2 = filterRows(state.rows, state.filters);
      var wb = root.XLSX.utils.book_new();
      root.XLSX.utils.book_append_sheet(wb, root.XLSX.utils.aoa_to_sheet([EXPORT_COLS].concat(exportRows(l2))), "Releases");
      var lineRows = [["Record ID", "Date", "Status", "PO", "Customer", "Flavor", "Lot", "Best-by", "Cases"]];
      l2.forEach(function (r) { var h = r.header || {}; (r.lines || []).forEach(function (x) { lineRows.push([r.id, r.form_date, r.result, h.po, h.customer, x.flavor, x.lot, x.best_by, x.cases]); }); });
      root.XLSX.utils.book_append_sheet(wb, root.XLSX.utils.aoa_to_sheet(lineRows), "Lots");
      root.XLSX.writeFile(wb, "trailer-release-log_" + mtDay() + ".xlsx");
      return;
    }
    if (act === "pdf") { var r = findRow(b.getAttribute("data-id")); var p = r && pdfFor(r); if (p) p.save(pdfName(r)); return; }
    if (act === "packet") {
      var r2 = findRow(b.getAttribute("data-id"));
      var p2 = r2 && pdfFor(r2);
      if (!p2) return;
      if (!isCloud() || !root.DB || typeof root.DB.createOrderDoc !== "function") { toast(T("offline")); return; }
      var h2 = r2.header || {};
      var file;
      try { file = new File([p2.output("blob")], pdfName(r2), { type: "application/pdf" }); } catch (x) { file = p2.output("blob"); file.name = pdfName(r2); }
      b.disabled = true;
      root.DB.createOrderDoc({ customer: h2.customer || "", po_num: h2.po || "", doc_type: "Trailer Release", notes: (r2.result || "") + " " + r2.id }, file, h2.released_by_name || "").then(function (res) {
        b.disabled = false;
        toast(res && res.ok ? T("packetDone") : T("notSaved") + " " + ((res && res.msg) || ""), 5000);
      }, function (x) { b.disabled = false; toast(T("notSaved") + " " + (x && x.message ? x.message : x), 6000); });
      return;
    }
    if (act === "newfor") {
      var r3 = findRow(b.getAttribute("data-id"));
      var h3 = (r3 && r3.header) || {};
      state.cur = emptyRecord({ po: h3.po, customer: h3.customer, ship_to: h3.ship_to, carrier: h3.carrier, pro_bol: h3.pro_bol, order_key: h3.order_key, ordered_cases: h3.cases_ordered,
        lines: (r3 && r3.lines || []).map(function (l) { return { flavor: l.flavor, flavor_code: l.flavor_code, lot: l.lot, best_by: l.best_by, cases: l.cases, ordered: l.ordered }; }) });
      state.tab = "new"; saveDraft(); render(); return;
    }
  }

  function onInput(e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest("#obr-root")) return;
    var c = state.cur;
    if (t.hasAttribute("data-obr-f")) {
      var f = t.getAttribute("data-obr-f");
      var rerender = setPath(f, t.type === "checkbox" ? t.checked : t.value);
      state.dirty = true; saveDraft();
      if (rerender && e.type === "change") render();
      return;
    }
    if (t.hasAttribute("data-obr-note")) { c.trailer_checks[t.getAttribute("data-obr-note")].note = t.value; state.dirty = true; saveDraft(); return; }
    if (t.hasAttribute("data-obr-line")) {
      var i = +t.getAttribute("data-obr-line"), k = t.getAttribute("data-k");
      if (!c.lines[i]) return;
      c.lines[i][k] = t.value;
      if (k === "flavor" && !c.lines[i].flavor_code) { var m = /\b([SLA]\d{2})\b/i.exec(t.value); if (m) c.lines[i].flavor_code = m[1].toUpperCase(); }
      if (k === "lot" && !c.lines[i].flavor_code) { var m2 = /^([SLA]\d{2})/i.exec(t.value); if (m2) c.lines[i].flavor_code = m2[1].toUpperCase(); }
      state.dirty = true; saveDraft();
      if (e.type === "change" && (k === "lot" || k === "best_by")) render();
      return;
    }
    if (t.hasAttribute("data-obr-flt")) {
      state.filters[t.getAttribute("data-obr-flt")] = t.value;
      if (e.type === "change" || t.type !== "text") render();
      else if (e.type === "input") { clearTimeout(onInput._t); onInput._t = setTimeout(function () { render(); var x = doc.querySelector('[data-obr-flt="customer"]'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 350); }
      return;
    }
    if (t.hasAttribute("data-obr-oq") && e.type === "input") {
      state.orderQ = t.value;
      clearTimeout(onInput._q);
      onInput._q = setTimeout(function () { render(); var x = $("obr-oq"); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 300);
      return;
    }
    if (t.hasAttribute("data-obr-order") && e.type === "change") { applyOrder(t.value); state.dirty = true; saveDraft(); render(); return; }
    if (t.id === "obr-photo" && e.type === "change") { state.photo = t.files && t.files[0] ? t.files[0] : null; render(); return; }
  }

  // ---------- open / nav ----------
  function markNav() {
    try {
      var nav = $("nav");
      if (!nav) return;
      nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
      var mine = $("obr-nav");
      if (mine) mine.classList.add("active");
    } catch (e) {}
  }
  function open(opts) {
    if (opts && opts.preventDefault) { opts.preventDefault(); opts = null; }
    // Same release dept-homes uses: other standalone screens drop their view
    // claim before this one takes #view. Must run before active is set.
    try { var rel = $("dept-release"); if (rel) rel.click(); } catch (e) {}
    state.active = true;
    if (opts && (opts.po || opts.customer)) {
      state.cur = emptyRecord(opts);
      var o = ordersList().filter(function (x) { return x.po.toUpperCase().replace(/\s+/g, "") === str(opts.po).toUpperCase().replace(/\s+/g, ""); })[0];
      if (o) applyOrder(o.key);
      state.tab = "new";
      saveDraft();
    }
    if (opts && opts.tab) state.tab = opts.tab === "log" ? "log" : "new";
    try { var nav = $("nav"), bd = $("navBackdrop"); if (nav) nav.classList.remove("open"); if (bd) bd.classList.remove("show"); } catch (e) {}
    markNav();
    render();
    try { root.scrollTo(0, 0); } catch (e) {}
    waitCloud().then(function () { return refreshHolds(); }).then(function () { if (state.active && onScreen() && state.tab === "new" && !isTyping()) render(); });
    if (state.tab !== "new") loadRows().then(function () { if (state.active) render(); });
  }
  function isTyping() {
    var ae = doc && doc.activeElement;
    return !!(ae && ae.closest && ae.closest("#obr-root") && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
  }
  function onScreen() { return !!$("obr-root"); }

  function injectNav() {
    var nav = $("nav");
    if (!nav || $("obr-nav")) return;
    if (!nav.querySelector(".navitem") && !nav.querySelector(".navlabel")) return;
    var anchor = null, items = nav.querySelectorAll("[onclick]");
    for (var i = 0; i < items.length; i++) { if ((items[i].getAttribute("onclick") || "").indexOf("'shiplog'") >= 0) { anchor = items[i]; break; } }
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "obr-nav";
    btn.innerHTML = '<i class="navico" data-lucide="clipboard-check"></i><span>' + esc(T("nav")) + '</span>';
    btn.addEventListener("click", function (e) { open(e); });
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else nav.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
  }
  // Adds a card to the Shipping and Fulfillment department action rows.
  function injectDept() {
    var shell = $("dept-shell");
    if (!shell) return;
    var dept = shell.getAttribute("data-dept");
    if (dept !== "ship" && dept !== "ful") return;
    var row = shell.querySelector(".dept-action-row");
    if (!row || row.querySelector("#obr-dept-card")) return;
    var b = doc.createElement("button");
    b.type = "button";
    b.className = "dept-card";
    b.id = "obr-dept-card";
    b.innerHTML = '<i class="dept-ico" data-lucide="clipboard-check"></i><span class="dept-card-copy"><strong>' + esc(T("nav")) + '</strong><span>' +
      esc(lang() === "es" ? "Inspeccione el trailer y libere el envio (SQF)." : "Inspect the trailer and release the load (SQF).") + '</span></span>';
    b.addEventListener("click", function (e) { e.stopPropagation(); open(e); });
    row.appendChild(b);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
  }

  var api = {
    FORM_TYPE: FORM_TYPE, TRAILER: TRAILER, PRODUCT: PRODUCT, TXT: TXT,
    open: open, render: render,
    emptyRecord: emptyRecord, evaluate: evaluate, buildRow: buildRow, groupOrders: groupOrders,
    filterRows: filterRows, csvText: csvText, exportRows: exportRows, lineHold: lineHold, normLot: normLot,
    rejectReasonText: rejectReasonText, pdfFor: pdfFor, _state: state
  };
  root.OUTBOUND_RELEASE = api;

  if (doc) {
    doc.addEventListener("click", onClick);
    doc.addEventListener("input", onInput);
    doc.addEventListener("change", onInput);
    // Leave this screen when any other nav / department target is clicked.
    doc.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-sub], [data-dept-tool], #deptbar [data-dept], #dept-back") : null;
      if (!t || t.id === "obr-nav" || t.id === "obr-dept-card") return;
      state.active = false;
    }, true);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id) setTimeout(function () {
          var n = $("obr-nav"); if (n) { var s = n.querySelector("span"); if (s) s.textContent = T("nav"); }
          // The app's language switch re-renders #view; take it back while active.
          if (state.active) render();
        }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return state.active && onScreen(); });
    root.SMK_BUSY = root.SMK_BUSY || [];
    // Background renders are already deferred by the view lock above. The busy
    // flag only holds the screen while a save is in flight, so a half-filled
    // form (kept as a draft on this device) never traps someone on this page.
    root.SMK_BUSY.push(function () { return state.active && onScreen() && state.saving; });
    try {
      var mo = new MutationObserver(function () { injectNav(); injectDept(); });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(function () { injectNav(); injectDept(); }, 400); });
    else setTimeout(function () { injectNav(); injectDept(); }, 400);
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

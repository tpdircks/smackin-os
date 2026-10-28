/* ============================================================================
   Fulfillment Errors (fulfillment-analytics.js)
   Fulfillment analytics for the WIP fulfillment error history: KPI cards,
   a monthly view, a filterable log, and a form to log a new error.
   The Returns tab reads and writes the existing returns_log table.
   The WIP Return Log sheet was an empty template. This screen leaves those
   185 stored returns in place and only adds new ones going forward.
   Cloud-gated seed loads data/wip-fulfillment-errors.json and upserts on a
   hash of order_num + date_reported + product_ordered.
   ?faseed=dry logs the rows and does not write. ?faseed=force writes again.
   A save that does not read back is shown as a failure.
   Loaded before dept-homes.js so Back can wrap FULFILL_ANALYTICS.open.
   ========================================================================== */
(function (root) {
  "use strict";

  var JSON_URL = "data/wip-fulfillment-errors.json";
  var FLAG = "fa-seed-wip-2026-10-28-v1";
  var SOURCE = "wip-import";
  var RETURN_COLS = ["channel", "marketplace", "return_date", "customer", "shipment_id", "product", "tracking", "qty", "is_kit", "reason", "disposition", "restocked", "dup_key", "order_ref", "received_by", "notes"];

  var I18N = {
    en: {
      title: "Fulfillment Errors",
      hint: "Error history from the WIP fulfillment sheet, plus new errors logged here. A blank credited date is still open.",
      tabErrors: "Errors",
      tabReturns: "Returns",
      total: "Total errors",
      cost: "Total cost",
      month: "This month",
      open: "Open / uncredited",
      costRows: "{n} rows include a cost",
      byMonth: "Errors by month",
      perMonth: "errors per month",
      logTitle: "Log error",
      date: "Date reported",
      order: "Order #",
      ordered: "Product ordered",
      received: "Product received",
      notes: "Notes",
      tracking: "Replacement tracking",
      retTrack: "Tracking",
      errCost: "Error cost",
      credited: "Credited date",
      save: "Save error",
      saving: "Saving...",
      saved: "Saved. Read back order {o}.",
      search: "Search order, product, notes, or tracking",
      allMonths: "All months",
      uncredited: "Open / uncredited only",
      showing: "Showing {n} of {t}",
      empty: "No fulfillment errors match these filters.",
      none: "No fulfillment errors yet.",
      loading: "Loading fulfillment errors...",
      recent: "Error log",
      colDate: "Date",
      colOrder: "Order",
      colOrdered: "Ordered",
      colReceived: "Received",
      colNotes: "Notes",
      colTrack: "Tracking",
      colCost: "Cost",
      colCredit: "Credited",
      colSource: "Source",
      srcSheet: "WIP",
      srcManual: "Logged",
      openTag: "Open",
      needDate: "Date reported is required.",
      needOrder: "Order number is required.",
      needOrdered: "Product ordered is required.",
      badCost: "Error cost must be a number.",
      badDate: "Use a real date.",
      dupErr: "Already logged for this order, date, and product. Nothing new was written.",
      saveErr: "Could not save",
      readBack: "Save was not confirmed. Read-back failed",
      cloudOff: "Not saved. The shared database is not connected.",
      seedErr: "Error history did not finish loading",
      retTitle: "Returns",
      retHint: "The WIP Return Log sheet was an empty template. This tab lists the returns already stored in the system. Log new returns here going forward.",
      retTotal: "Returns on file",
      retMonth: "This month",
      retEcom: "E-commerce",
      retMajor: "Major customer",
      retLog: "Log return",
      retDate: "Return date",
      channel: "Channel",
      customer: "Customer",
      market: "Marketplace",
      orderRef: "Order / RMA",
      shipId: "Shipment ID",
      product: "Product",
      qty: "Qty",
      reason: "Reason",
      disp: "Disposition",
      by: "Logged by",
      saveRet: "Save return",
      retSaved: "Saved. Read back {p}.",
      retSearch: "Search customer, product, order, or tracking",
      retRecent: "Returns log",
      retEmpty: "No returns match these filters.",
      retNone: "No returns stored yet.",
      retLoading: "Loading returns...",
      needRetDate: "Return date is required.",
      needProduct: "Product is required.",
      needQty: "Qty must be a number greater than 0.",
      retDup: "This return is already logged: {d} {p} x{q}. Nothing new was written.",
      retAnyway: "Log it again anyway",
      colWho: "Customer",
      colProduct: "Product",
      colQty: "Qty",
      colRef: "Order / tracking",
      colReason: "Reason",
      colDisp: "Disposition",
      colBy: "Logged by",
      ecom: "E-commerce",
      major: "Major customer",
      anyReason: "Reason",
      anyDisp: "Disposition",
      range: "{a} to {b}",
      reload: "Reload"
    },
    es: {
      title: "Errores de Fulfillment",
      hint: "Historial de errores de la hoja WIP, mas errores nuevos registrados aqui. Una fecha de credito en blanco sigue abierta.",
      tabErrors: "Errores",
      tabReturns: "Devoluciones",
      total: "Errores totales",
      cost: "Costo total",
      month: "Este mes",
      open: "Abiertos / sin credito",
      costRows: "{n} filas incluyen un costo",
      byMonth: "Errores por mes",
      perMonth: "errores por mes",
      logTitle: "Registrar error",
      date: "Fecha reportada",
      order: "Orden #",
      ordered: "Producto pedido",
      received: "Producto recibido",
      notes: "Notas",
      tracking: "Rastreo del reemplazo",
      retTrack: "Rastreo",
      errCost: "Costo del error",
      credited: "Fecha de credito",
      save: "Guardar error",
      saving: "Guardando...",
      saved: "Guardado. Se leyo de nuevo la orden {o}.",
      search: "Buscar orden, producto, notas o rastreo",
      allMonths: "Todos los meses",
      uncredited: "Solo abiertos / sin credito",
      showing: "Mostrando {n} de {t}",
      empty: "Ningun error coincide con estos filtros.",
      none: "Aun no hay errores de fulfillment.",
      loading: "Cargando errores de fulfillment...",
      recent: "Registro de errores",
      colDate: "Fecha",
      colOrder: "Orden",
      colOrdered: "Pedido",
      colReceived: "Recibido",
      colNotes: "Notas",
      colTrack: "Rastreo",
      colCost: "Costo",
      colCredit: "Credito",
      colSource: "Origen",
      srcSheet: "WIP",
      srcManual: "Registrado",
      openTag: "Abierto",
      needDate: "La fecha reportada es obligatoria.",
      needOrder: "El numero de orden es obligatorio.",
      needOrdered: "El producto pedido es obligatorio.",
      badCost: "El costo del error debe ser un numero.",
      badDate: "Use una fecha real.",
      dupErr: "Ya esta registrado para esta orden, fecha y producto. No se escribio nada nuevo.",
      saveErr: "No se pudo guardar",
      readBack: "El guardado no quedo confirmado. La relectura fallo",
      cloudOff: "No se guardo. La base compartida no esta conectada.",
      seedErr: "El historial de errores no termino de cargar",
      retTitle: "Devoluciones",
      retHint: "La hoja WIP Return Log era una plantilla vacia. Esta pestana lista las devoluciones que ya estan guardadas. Registre devoluciones nuevas aqui de ahora en adelante.",
      retTotal: "Devoluciones guardadas",
      retMonth: "Este mes",
      retEcom: "E-commerce",
      retMajor: "Cliente mayor",
      retLog: "Registrar devolucion",
      retDate: "Fecha de devolucion",
      channel: "Canal",
      customer: "Cliente",
      market: "Marketplace",
      orderRef: "Orden / RMA",
      shipId: "ID de envio",
      product: "Producto",
      qty: "Cant.",
      reason: "Motivo",
      disp: "Disposicion",
      by: "Registrado por",
      saveRet: "Guardar devolucion",
      retSaved: "Guardado. Se leyo de nuevo {p}.",
      retSearch: "Buscar cliente, producto, orden o rastreo",
      retRecent: "Registro de devoluciones",
      retEmpty: "Ninguna devolucion coincide con estos filtros.",
      retNone: "Aun no hay devoluciones guardadas.",
      retLoading: "Cargando devoluciones...",
      needRetDate: "La fecha de devolucion es obligatoria.",
      needProduct: "El producto es obligatorio.",
      needQty: "La cantidad debe ser un numero mayor que 0.",
      retDup: "Esta devolucion ya esta registrada: {d} {p} x{q}. No se escribio nada nuevo.",
      retAnyway: "Registrarla de nuevo igual",
      colWho: "Cliente",
      colProduct: "Producto",
      colQty: "Cant.",
      colRef: "Orden / rastreo",
      colReason: "Motivo",
      colDisp: "Disposicion",
      colBy: "Registrado por",
      ecom: "E-commerce",
      major: "Cliente mayor",
      anyReason: "Motivo",
      anyDisp: "Disposicion",
      range: "{a} a {b}",
      reload: "Recargar"
    },
    pt: {
      title: "Erros de Fulfillment",
      hint: "Historico de erros da planilha WIP, mais erros novos registrados aqui. Uma data de credito em branco continua aberta.",
      tabErrors: "Erros",
      tabReturns: "Devolucoes",
      total: "Erros totais",
      cost: "Custo total",
      month: "Este mes",
      open: "Abertos / sem credito",
      costRows: "{n} linhas incluem um custo",
      byMonth: "Erros por mes",
      perMonth: "erros por mes",
      logTitle: "Registrar erro",
      date: "Data reportada",
      order: "Pedido #",
      ordered: "Produto pedido",
      received: "Produto recebido",
      notes: "Notas",
      tracking: "Rastreio da reposicao",
      retTrack: "Rastreio",
      errCost: "Custo do erro",
      credited: "Data do credito",
      save: "Salvar erro",
      saving: "Salvando...",
      saved: "Salvo. Pedido {o} lido de volta.",
      search: "Buscar pedido, produto, notas ou rastreio",
      allMonths: "Todos os meses",
      uncredited: "So abertos / sem credito",
      showing: "Mostrando {n} de {t}",
      empty: "Nenhum erro combina com estes filtros.",
      none: "Ainda nao ha erros de fulfillment.",
      loading: "Carregando erros de fulfillment...",
      recent: "Registro de erros",
      colDate: "Data",
      colOrder: "Pedido",
      colOrdered: "Pedido",
      colReceived: "Recebido",
      colNotes: "Notas",
      colTrack: "Rastreio",
      colCost: "Custo",
      colCredit: "Credito",
      colSource: "Origem",
      srcSheet: "WIP",
      srcManual: "Registrado",
      openTag: "Aberto",
      needDate: "A data reportada e obrigatoria.",
      needOrder: "O numero do pedido e obrigatorio.",
      needOrdered: "O produto pedido e obrigatorio.",
      badCost: "O custo do erro deve ser um numero.",
      badDate: "Use uma data real.",
      dupErr: "Ja registrado para este pedido, data e produto. Nada novo foi gravado.",
      saveErr: "Nao foi possivel salvar",
      readBack: "O salvamento nao foi confirmado. A releitura falhou",
      cloudOff: "Nao foi salvo. O banco compartilhado nao esta conectado.",
      seedErr: "O historico de erros nao terminou de carregar",
      retTitle: "Devolucoes",
      retHint: "A planilha WIP Return Log era um modelo vazio. Esta aba lista as devolucoes que ja estao guardadas. Registre devolucoes novas aqui daqui pra frente.",
      retTotal: "Devolucoes guardadas",
      retMonth: "Este mes",
      retEcom: "E-commerce",
      retMajor: "Cliente grande",
      retLog: "Registrar devolucao",
      retDate: "Data da devolucao",
      channel: "Canal",
      customer: "Cliente",
      market: "Marketplace",
      orderRef: "Pedido / RMA",
      shipId: "ID do envio",
      product: "Produto",
      qty: "Qtd",
      reason: "Motivo",
      disp: "Disposicao",
      by: "Registrado por",
      saveRet: "Salvar devolucao",
      retSaved: "Salvo. {p} lido de volta.",
      retSearch: "Buscar cliente, produto, pedido ou rastreio",
      retRecent: "Registro de devolucoes",
      retEmpty: "Nenhuma devolucao combina com estes filtros.",
      retNone: "Ainda nao ha devolucoes guardadas.",
      retLoading: "Carregando devolucoes...",
      needRetDate: "A data da devolucao e obrigatoria.",
      needProduct: "O produto e obrigatorio.",
      needQty: "A quantidade deve ser um numero maior que 0.",
      retDup: "Esta devolucao ja esta registrada: {d} {p} x{q}. Nada novo foi gravado.",
      retAnyway: "Registrar de novo mesmo assim",
      colWho: "Cliente",
      colProduct: "Produto",
      colQty: "Qtd",
      colRef: "Pedido / rastreio",
      colReason: "Motivo",
      colDisp: "Disposicao",
      colBy: "Registrado por",
      ecom: "E-commerce",
      major: "Cliente grande",
      anyReason: "Motivo",
      anyDisp: "Disposicao",
      range: "{a} a {b}",
      reload: "Recarregar"
    }
  };

  var MONTHS = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  };

  var cfg = root.SMACKIN_CONFIG || {};
  var doc = root.document || null;
  var active = false;
  var tab = "errors";
  var errors = null;
  var returns = null;
  var loadError = "";
  var retError = "";
  var seedError = "";
  var banner = "";
  var saving = false;
  var dupForce = false;
  var filters = { q: "", month: "", uncredited: false };
  var retFilters = { q: "" };
  var draft = { date: "", order: "", ordered: "", received: "", notes: "", tracking: "", cost: "", credited: "" };
  var retDraft = { date: "", channel: "ecom", customer: "", market: "", orderRef: "", tracking: "", shipId: "", product: "", qty: "", reason: "", disp: "", notes: "", by: "" };

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
    setTimeout(function () { t.classList.remove("show"); }, 5200);
  }
  function normPart(s) {
    return String(s == null ? "" : s).replace(/[\s\u00a0]+/g, " ").trim().toLowerCase();
  }
  function cleanText(s) {
    if (s == null) return null;
    var t = String(s).replace(/\u00a0/g, " ").trim();
    return t ? t : null;
  }
  function isoDate(s) {
    var t = String(s || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
  }
  function todayDenver() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function monthName(ym) {
    var p = String(ym || "").split("-");
    if (p.length < 2) return ym;
    var names = MONTHS[lang()] || MONTHS.en;
    var mo = names[(+p[1]) - 1] || p[1];
    return mo + " " + String(p[0]).slice(2);
  }
  function money(n) {
    var x = Number(n);
    if (!isFinite(x)) return "";
    var sign = x < 0 ? "-" : "";
    var abs = Math.abs(Math.round(x * 100) / 100);
    return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function clip(s, n) {
    var t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 1) + "...";
  }
  function utf8Bytes(s) {
    s = String(s);
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
        var next = s.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          c = 0x10000 + ((c - 0xD800) << 10) + (next - 0xDC00);
          i++;
        }
      }
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c < 0x800) out += String.fromCharCode(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      else if (c < 0x10000) out += String.fromCharCode(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      else out += String.fromCharCode(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
    return out;
  }
  function sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = "length";
    var i, j;
    var result = "";
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii[lengthProperty] % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }
  function seedIdentity(order, date, product) {
    return normPart(order) + "|" + isoDate(date) + "|" + normPart(product);
  }
  function seedKey(order, date, product) {
    return sha256(utf8Bytes(seedIdentity(order, date, product)));
  }
  function cleanCost(v) {
    if (v == null || v === "") return null;
    var n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, "").trim());
    if (!isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  }
  function toSeedRow(r) {
    var date = isoDate(r && r.date_reported);
    if (!date) return null;
    var order = cleanText(r.order_num) || "";
    var ordered = cleanText(r.product_ordered) || "";
    var credited = isoDate(r.credited_date);
    return {
      date_reported: date,
      order_num: order,
      product_ordered: ordered,
      product_received: cleanText(r.product_received),
      notes: cleanText(r.notes),
      replacement_tracking: cleanText(r.replacement_tracking),
      error_cost: cleanCost(r.error_cost),
      credited_date: credited || null,
      source: SOURCE,
      seed_key: seedKey(order, date, ordered)
    };
  }
  function buildSeed(raw) {
    var seen = {};
    var rows = [];
    var dropped = 0;
    (raw || []).forEach(function (r) {
      var row = toSeedRow(r);
      if (!row) { dropped++; return; }
      if (seen[row.seed_key]) { dropped++; return; }
      seen[row.seed_key] = 1;
      rows.push(row);
    });
    return { rows: rows, dropped: dropped };
  }
  function sameCost(a, b) {
    var x = numCost(a), y = numCost(b);
    if (x == null && y == null) return true;
    if (x == null || y == null) return false;
    return Math.round(x * 100) === Math.round(y * 100);
  }
  function numCost(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function summarizeErrors(rows, today) {
    var month = String(today || "").slice(0, 7);
    var total = 0, cost = 0, costRows = 0, thisMonth = 0, open = 0;
    var min = "", max = "";
    (rows || []).forEach(function (r) {
      total++;
      var c = numCost(r.error_cost);
      if (c != null) { cost += c; costRows++; }
      var d = isoDate(r.date_reported);
      if (month && d.slice(0, 7) === month) thisMonth++;
      if (!isoDate(r.credited_date)) open++;
      if (d && (!min || d < min)) min = d;
      if (d && (!max || d > max)) max = d;
    });
    return { total: total, cost: Math.round(cost * 100) / 100, costRows: costRows, thisMonth: thisMonth, open: open, min: min, max: max };
  }
  function monthSeries(rows) {
    var m = {};
    (rows || []).forEach(function (r) {
      var k = isoDate(r.date_reported).slice(0, 7);
      if (!k || k.length < 7) return;
      if (!m[k]) m[k] = { k: k, n: 0, cost: 0 };
      m[k].n++;
      var c = numCost(r.error_cost);
      if (c != null) m[k].cost += c;
    });
    return Object.keys(m).sort().map(function (k) {
      m[k].cost = Math.round(m[k].cost * 100) / 100;
      return m[k];
    });
  }
  function filterErrors(rows, f) {
    f = f || {};
    var q = normPart(f.q || "");
    return (rows || []).filter(function (r) {
      if (f.month && isoDate(r.date_reported).slice(0, 7) !== f.month) return false;
      if (f.uncredited && isoDate(r.credited_date)) return false;
      if (!q) return true;
      var blob = normPart([r.order_num, r.product_ordered, r.product_received, r.notes, r.replacement_tracking].join(" "));
      return blob.indexOf(q) >= 0;
    });
  }
  function returnDupKey(rec) {
    rec = rec || {};
    var ref = (rec.tracking || rec.shipment_id || rec.order_ref || rec.customer || "").toString().trim().toLowerCase();
    var item = (rec.item_code || rec.kit_sku || rec.product || "").toString().trim().toLowerCase();
    return (ref + "|" + item + "|" + (rec.return_date || "")).toString().trim().toLowerCase();
  }
  function summarizeReturns(rows, today) {
    var month = String(today || "").slice(0, 7);
    var total = 0, thisMonth = 0, ecom = 0, major = 0;
    (rows || []).forEach(function (r) {
      total++;
      var d = isoDate(r.return_date) || isoDate(r.created_at);
      if (month && d.slice(0, 7) === month) thisMonth++;
      if (r.channel === "major") major++;
      else if (r.channel === "ecom") ecom++;
    });
    return { total: total, thisMonth: thisMonth, ecom: ecom, major: major };
  }
  function filterReturns(rows, f) {
    f = f || {};
    var q = normPart(f.q || "");
    if (!q) return rows || [];
    return (rows || []).filter(function (r) {
      var blob = normPart([r.customer, r.marketplace, r.product, r.order_ref, r.tracking, r.shipment_id, r.reason, r.notes].join(" "));
      return blob.indexOf(q) >= 0;
    });
  }
  function reasonList() {
    var seed = root.SMACKIN_SEED || {};
    if (seed.RETURN_REASONS && seed.RETURN_REASONS.length) return seed.RETURN_REASONS.slice();
    return ["Damaged in transit", "Wrong item shipped", "Customer changed mind", "Refused delivery", "Defective product", "Expired", "Overstock / recall", "Address not found", "Moved", "Other"];
  }
  function dispList() {
    var seed = root.SMACKIN_SEED || {};
    if (seed.RETURN_DISPOSITIONS && seed.RETURN_DISPOSITIONS.length) return seed.RETURN_DISPOSITIONS.slice();
    return ["Restock", "Quarantine", "Scrap"];
  }

  function creds() {
    var url = cfg.SUPABASE_URL || (root.SMACKIN_CONFIG && root.SMACKIN_CONFIG.SUPABASE_URL) || "";
    var key = cfg.SUPABASE_ANON_KEY || (root.SMACKIN_CONFIG && root.SMACKIN_CONFIG.SUPABASE_ANON_KEY) || "";
    if (!url || !key) return null;
    return { url: String(url).replace(/\/$/, ""), key: key };
  }
  function rest(path, opts) {
    var c = creds();
    if (!c) return Promise.reject(new Error(tx("cloudOff")));
    opts = opts || {};
    var headers = {
      apikey: c.key,
      Authorization: "Bearer " + c.key,
      Accept: "application/json"
    };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function (k) { headers[k] = opts.headers[k]; });
    }
    if (opts.body != null && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(c.url + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body == null ? undefined : opts.body,
      cache: "no-store"
    }).then(function (r) {
      return r.text().then(function (t) {
        var body = null;
        if (t) {
          try { body = JSON.parse(t); } catch (e) { body = t; }
        }
        if (!r.ok) {
          var msg = "HTTP " + r.status;
          if (body && typeof body === "object") {
            msg = [body.message, body.details, body.hint, body.code].filter(Boolean).join(" ") || msg;
          } else if (body) msg = String(body);
          var err = new Error(msg);
          err.status = r.status;
          err.code = body && body.code;
          throw err;
        }
        return body;
      });
    });
  }
  function fetchAll(table, query) {
    var all = [];
    var step = 1000;
    function page(from) {
      var path = table + "?" + query + "&limit=" + step + "&offset=" + from;
      return rest(path).then(function (rows) {
        rows = rows || [];
        all = all.concat(rows);
        if (rows.length === step) return page(from + step);
        return all;
      });
    }
    return page(0);
  }

  function flagDone() {
    try { return !!root.localStorage.getItem(FLAG); } catch (e) { return false; }
  }
  function markFlag() {
    try { root.localStorage.setItem(FLAG, new Date().toISOString()); } catch (e) {}
  }
  function modeFlag() {
    var q = "";
    try { q = String(root.location && root.location.search || ""); } catch (e) { q = ""; }
    if (/faseed=dry/.test(q)) return "dry";
    if (/faseed=force/.test(q)) return "force";
    return "";
  }
  function loadJson() {
    return fetch(JSON_URL, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Could not load " + JSON_URL + " (HTTP " + r.status + ")");
      return r.json();
    });
  }
  var seeding = false;
  var seedPromise = null;
  function confirmSeed(payload) {
    return fetchAll("fulfillment_errors", "select=seed_key&source=eq." + encodeURIComponent(SOURCE)).then(function (rows) {
      var have = {};
      (rows || []).forEach(function (r) { if (r.seed_key) have[r.seed_key] = 1; });
      var missing = payload.filter(function (r) { return !have[r.seed_key]; });
      if (missing.length) throw new Error("Seed read-back missing " + missing.length + " of " + payload.length + " rows.");
      return payload.length;
    });
  }
  function runSeed() {
    var flag = modeFlag();
    if (flag !== "force" && flag !== "dry" && flagDone()) return Promise.resolve(true);
    if (!creds() || seeding) return Promise.resolve(false);
    seeding = true;
    return loadJson().then(function (raw) {
      var built = buildSeed(raw);
      if (flag === "dry") {
        console.log("[fa-seed] dry", built.rows.length, "dropped", built.dropped);
        seeding = false;
        return true;
      }
      var payload = built.rows;
      var chain = Promise.resolve();
      for (var i = 0; i < payload.length; i += 80) {
        (function (chunk) {
          chain = chain.then(function () {
            return rest("fulfillment_errors?on_conflict=seed_key", {
              method: "POST",
              headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
              body: JSON.stringify(chunk)
            });
          });
        })(payload.slice(i, i + 80));
      }
      return chain.then(function () { return confirmSeed(payload); }).then(function (n) {
        markFlag();
        seedError = "";
        console.log("[fa-seed] applied", n, "dropped", built.dropped);
        seeding = false;
        return true;
      });
    }).catch(function (e) {
      seeding = false;
      seedError = (e && e.message) ? e.message : String(e);
      console.warn("[fa-seed]", seedError);
      return false;
    });
  }
  function ensureSeed() {
    if (!seedPromise) {
      seedPromise = new Promise(function (resolve) {
        var tries = 0;
        function tick() {
          runSeed().then(function (ok) {
            if (ok || ++tries >= 8) resolve();
            else setTimeout(tick, 500);
          });
        }
        tick();
      });
    }
    return seedPromise;
  }

  function loadErrors() {
    if (!creds()) {
      errors = [];
      loadError = tx("cloudOff");
      return Promise.resolve(errors);
    }
    return fetchAll("fulfillment_errors", "select=*&order=date_reported.desc,created_at.desc").then(function (rows) {
      errors = rows || [];
      loadError = "";
      return errors;
    }).catch(function (e) {
      errors = [];
      loadError = (e && e.message) || tx("seedErr");
      return errors;
    });
  }
  function loadReturns() {
    if (!creds()) {
      returns = [];
      retError = tx("cloudOff");
      return Promise.resolve(returns);
    }
    return fetchAll("returns_log", "select=*&order=created_at.desc,id.desc").then(function (rows) {
      returns = rows || [];
      retError = "";
      return returns;
    }).catch(function (e) {
      returns = [];
      retError = (e && e.message) || tx("retLoading");
      return returns;
    });
  }

  function styleOnce() {
    if (!doc || doc.getElementById("fa-style")) return;
    var s = doc.createElement("style");
    s.id = "fa-style";
    s.textContent = [
      "#fa-root .fa-seg{display:inline-flex;background:#eef2f7;border-radius:9px;padding:3px;margin:8px 0}",
      "#fa-root .fa-seg button{border:0;background:transparent;padding:7px 16px;border-radius:6px;font-weight:700;font-size:13px;color:#64748b;cursor:pointer;font-family:inherit}",
      "#fa-root .fa-seg button.on{background:#fff;color:#04223B;box-shadow:0 1px 3px rgba(0,0,0,.12)}",
      "#fa-root .fa-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}",
      "#fa-root .fa-kpis button,#fa-root .fa-kpis .fa-kpi{flex:1;min-width:140px;text-align:left;border:0;border-radius:10px;padding:12px 14px;background:#04223B;color:#fff;font-family:inherit}",
      "#fa-root .fa-kpis button{cursor:pointer}",
      "#fa-root .fa-kpis .fa-kpi{cursor:default}",
      "#fa-root .fa-kpis button strong,#fa-root .fa-kpis .fa-kpi strong{display:block;font-size:22px;font-weight:800}",
      "#fa-root .fa-kpis button span,#fa-root .fa-kpis .fa-kpi span{font-size:12px;opacity:.85}",
      "#fa-root .fa-kpis button.on{outline:3px solid #F26B21}",
      "#fa-root .fa-kpis button.fa-open{background:#8A4B08}",
      "#fa-root .fa-bars{display:flex;flex-direction:column;gap:5px;margin-top:6px}",
      "#fa-root .fa-bar{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:0;cursor:pointer;font-family:inherit;text-align:left}",
      "#fa-root .fa-bar.on .fa-lbl{color:#04223B;font-weight:800}",
      "#fa-root .fa-lbl{width:64px;font-size:11px;color:#6b7280;text-align:right}",
      "#fa-root .fa-track{flex:1;background:#eef2f7;border-radius:5px;height:16px;overflow:hidden}",
      "#fa-root .fa-fill{height:100%;background:linear-gradient(90deg,#284a86,#04223B);border-radius:5px}",
      "#fa-root .fa-val{width:118px;font-size:12px;font-weight:600;color:#334155;text-align:right}",
      "#fa-root .fa-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}",
      "#fa-root .fa-filters > div{min-width:160px;flex:1}",
      "#fa-root .fa-check{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;margin:8px 0 0}",
      "#fa-root .fa-check input{width:auto;margin:0}",
      "#fa-root .fa-fail{background:#FBE3E0;color:#7d1b12;border:1px solid #e7b4ae;border-radius:8px;padding:10px 12px;font-weight:700;margin:8px 0}",
      "#fa-root .fa-note{background:#f4f7fb;border:1px solid #d7e0ea;border-radius:8px;padding:10px 12px;margin:8px 0}",
      "#fa-root table{font-size:13px}",
      "#fa-root td{vertical-align:top}",
      "#fa-root .fa-clip{max-width:220px}",
      "#fa-root .fa-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}"
    ].join("");
    doc.head.appendChild(s);
  }

  function pullDraft() {
    if (!doc || !doc.getElementById("fa-root")) return;
    function take(id, obj, key) {
      var el = doc.getElementById(id);
      if (el) obj[key] = el.value;
    }
    if (doc.getElementById("fa-order")) {
      take("fa-date", draft, "date");
      take("fa-order", draft, "order");
      take("fa-ordered", draft, "ordered");
      take("fa-received", draft, "received");
      take("fa-notes", draft, "notes");
      take("fa-tracking", draft, "tracking");
      take("fa-cost", draft, "cost");
      take("fa-credited", draft, "credited");
    }
    if (doc.getElementById("fa-product")) {
      take("fa-rdate", retDraft, "date");
      take("fa-channel", retDraft, "channel");
      take("fa-customer", retDraft, "customer");
      take("fa-market", retDraft, "market");
      take("fa-orderref", retDraft, "orderRef");
      take("fa-rtrack", retDraft, "tracking");
      take("fa-ship", retDraft, "shipId");
      take("fa-product", retDraft, "product");
      take("fa-qty", retDraft, "qty");
      take("fa-reason", retDraft, "reason");
      take("fa-disp", retDraft, "disp");
      take("fa-rnotes", retDraft, "notes");
      take("fa-by", retDraft, "by");
    }
  }
  function field(label, html) {
    return "<div><label>" + esc(label) + "</label>" + html + "</div>";
  }
  function opt(value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? " selected" : "") + ">" + esc(label) + "</option>";
  }
  function kpi(action, val, label, on) {
    if (!action) return '<div class="fa-kpi"><strong>' + esc(String(val)) + "</strong><span>" + esc(label) + "</span></div>";
    return '<button type="button" data-fa="' + action + '" class="' + (on || "") + '"><strong>' + esc(String(val)) + "</strong><span>" + esc(label) + "</span></button>";
  }
  function barChart(series) {
    if (!series.length) return '<p class="muted">' + esc(tx("none")) + "</p>";
    var max = 1;
    series.forEach(function (s) { if (s.n > max) max = s.n; });
    return '<div class="fa-bars">' + series.map(function (s) {
      var pct = Math.max(2, Math.round(s.n / max * 100));
      var on = filters.month === s.k ? " on" : "";
      var cost = s.cost ? " · " + money(s.cost) : "";
      return '<button type="button" class="fa-bar' + on + '" data-fa="month" data-val="' + esc(s.k) + '">' +
        '<span class="fa-lbl">' + esc(monthName(s.k)) + "</span>" +
        '<span class="fa-track"><span class="fa-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="fa-val">' + s.n + esc(cost) + "</span></button>";
    }).join("") + "</div>";
  }
  function trackCell(s) {
    var t = String(s || "").trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return '<a href="' + esc(t) + '" target="_blank" rel="noopener">' + esc(clip(t, 32)) + "</a>";
    return '<span title="' + esc(t) + '">' + esc(clip(t, 32)) + "</span>";
  }
  function failBox() {
    var parts = "";
    if (banner) parts += '<div class="fa-fail">' + esc(banner) + "</div>";
    if (tab === "errors" && seedError) parts += '<div class="fa-fail">' + esc(tx("seedErr")) + ": " + esc(seedError) + "</div>";
    return parts;
  }

  function errorForm() {
    if (!draft.date) draft.date = todayDenver();
    return '<div class="card"><h2 class="sub2">' + esc(tx("logTitle")) + "</h2>" +
      '<div class="row">' +
      field(tx("date"), '<input id="fa-date" type="date" value="' + esc(draft.date) + '">') +
      field(tx("order"), '<input id="fa-order" value="' + esc(draft.order) + '" autocomplete="off">') +
      field(tx("errCost"), '<input id="fa-cost" inputmode="decimal" value="' + esc(draft.cost) + '" placeholder="0.00" autocomplete="off">') +
      field(tx("credited"), '<input id="fa-credited" type="date" value="' + esc(draft.credited) + '">') +
      "</div>" +
      '<div class="row">' +
      field(tx("ordered"), '<input id="fa-ordered" value="' + esc(draft.ordered) + '" autocomplete="off">') +
      field(tx("received"), '<input id="fa-received" value="' + esc(draft.received) + '" autocomplete="off">') +
      "</div>" +
      field(tx("tracking"), '<input id="fa-tracking" value="' + esc(draft.tracking) + '" autocomplete="off">') +
      field(tx("notes"), '<textarea id="fa-notes" rows="2">' + esc(draft.notes) + "</textarea>") +
      '<div class="fa-tools"><button type="button" class="primary" data-fa="save-error"' + (saving ? " disabled" : "") + ">" + esc(saving ? tx("saving") : tx("save")) + "</button></div></div>";
  }
  function errorTable(shown, all) {
    if (loadError) return '<p class="fa-fail">' + esc(loadError) + "</p>";
    if (!all.length) return '<p class="muted">' + esc(tx("none")) + "</p>";
    if (!shown.length) return '<p class="muted">' + esc(tx("empty")) + "</p>";
    var body = shown.map(function (r) {
      var credited = isoDate(r.credited_date);
      var src = r.source === SOURCE ? tx("srcSheet") : tx("srcManual");
      return "<tr><td class=\"sm\">" + esc(isoDate(r.date_reported)) + "</td>" +
        "<td><b>" + esc(r.order_num || "") + "</b></td>" +
        '<td class="fa-clip" title="' + esc(r.product_ordered || "") + '">' + esc(clip(r.product_ordered || "", 80)) + "</td>" +
        '<td class="fa-clip" title="' + esc(r.product_received || "") + '">' + esc(clip(r.product_received || "", 80)) + "</td>" +
        '<td class="fa-clip" title="' + esc(r.notes || "") + '">' + esc(clip(r.notes || "", 80)) + "</td>" +
        "<td class=\"sm\">" + trackCell(r.replacement_tracking) + "</td>" +
        '<td class="right">' + esc(r.error_cost == null || r.error_cost === "" ? "" : money(r.error_cost)) + "</td>" +
        "<td class=\"sm\">" + (credited ? esc(credited) : '<span class="pill out">' + esc(tx("openTag")) + "</span>") + "</td>" +
        '<td class="sm muted">' + esc(src) + "</td></tr>";
    }).join("");
    return '<div class="tblwrap"><table><thead><tr><th>' + esc(tx("colDate")) + "</th><th>" + esc(tx("colOrder")) + "</th><th>" + esc(tx("colOrdered")) + "</th><th>" + esc(tx("colReceived")) + "</th><th>" + esc(tx("colNotes")) + "</th><th>" + esc(tx("colTrack")) + "</th><th>" + esc(tx("colCost")) + "</th><th>" + esc(tx("colCredit")) + "</th><th>" + esc(tx("colSource")) + "</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  function renderErrors(today) {
    var all = errors || [];
    var sum = summarizeErrors(all, today);
    var series = monthSeries(all);
    var shown = filterErrors(all, filters);
    var months = series.map(function (s) { return s.k; });
    var monthOpts = opt("", tx("allMonths"), filters.month) + months.map(function (m) { return opt(m, monthName(m), filters.month); }).join("");
    var range = sum.min ? '<p class="hint">' + esc(tx("range").replace("{a}", sum.min).replace("{b}", sum.max || sum.min)) + "</p>" : "";
    var openOn = filters.uncredited ? "fa-open on" : "fa-open";
    var monthOn = filters.month && filters.month === today.slice(0, 7) ? "on" : "";
    return '<div class="card"><h2>' + esc(tx("title")) + "</h2>" +
      '<p class="hint">' + esc(tx("hint")) + "</p>" + range + failBox() +
      '<div class="fa-kpis">' +
      kpi("kpi-total", sum.total, tx("total"), filters.month || filters.uncredited ? "" : "on") +
      kpi("", money(sum.cost) || "$0.00", tx("cost"), "") +
      kpi("kpi-month", sum.thisMonth, tx("month"), monthOn) +
      kpi("kpi-open", sum.open, tx("open"), openOn) +
      "</div>" +
      '<p class="hint">' + esc(tx("costRows").replace("{n}", String(sum.costRows))) + "</p></div>" +
      '<div class="card"><h2 class="sub2">' + esc(tx("byMonth")) + "</h2>" + barChart(series) +
      '<p class="hint">' + esc(tx("perMonth")) + "</p></div>" +
      errorForm() +
      '<div class="card"><h2 class="sub2">' + esc(tx("recent")) + "</h2>" +
      '<div class="fa-filters">' +
      "<div><label>" + esc(tx("search")) + '</label><input id="fa-q" value="' + esc(filters.q) + '" autocomplete="off"></div>' +
      "<div><label>" + esc(tx("allMonths")) + '</label><select id="fa-month">' + monthOpts + "</select></div>" +
      "</div>" +
      '<label class="fa-check"><input id="fa-open" type="checkbox"' + (filters.uncredited ? " checked" : "") + "> " + esc(tx("uncredited")) + "</label>" +
      '<p class="muted sm">' + esc(tx("showing").replace("{n}", String(shown.length)).replace("{t}", String(all.length))) + "</p>" +
      errorTable(shown, all) +
      '<div class="fa-tools"><button type="button" class="ghost sm" data-fa="reload">' + esc(tx("reload")) + "</button></div></div>";
  }

  function returnForm() {
    if (!retDraft.date) retDraft.date = todayDenver();
    var reasons = reasonList();
    var disps = dispList();
    var reasonOpts = opt("", tx("anyReason"), retDraft.reason) + reasons.map(function (r) { return opt(r, r, retDraft.reason); }).join("");
    var dispOpts = opt("", tx("anyDisp"), retDraft.disp) + disps.map(function (r) { return opt(r, r, retDraft.disp); }).join("");
    var ch = '<select id="fa-channel">' + opt("ecom", tx("ecom"), retDraft.channel) + opt("major", tx("major"), retDraft.channel) + "</select>";
    var anyway = dupForce ? '<button type="button" class="ghost" data-fa="save-return" data-force="1">' + esc(tx("retAnyway")) + "</button>" : "";
    return '<div class="card"><h2 class="sub2">' + esc(tx("retLog")) + "</h2>" +
      '<div class="row">' +
      field(tx("retDate"), '<input id="fa-rdate" type="date" value="' + esc(retDraft.date) + '">') +
      field(tx("channel"), ch) +
      field(tx("qty"), '<input id="fa-qty" inputmode="decimal" value="' + esc(retDraft.qty) + '" autocomplete="off">') +
      "</div>" +
      '<div class="row">' +
      field(tx("customer"), '<input id="fa-customer" value="' + esc(retDraft.customer) + '" autocomplete="off">') +
      field(tx("market"), '<input id="fa-market" value="' + esc(retDraft.market) + '" autocomplete="off">') +
      field(tx("product"), '<input id="fa-product" value="' + esc(retDraft.product) + '" autocomplete="off">') +
      "</div>" +
      '<div class="row">' +
      field(tx("orderRef"), '<input id="fa-orderref" value="' + esc(retDraft.orderRef) + '" autocomplete="off">') +
      field(tx("retTrack"), '<input id="fa-rtrack" value="' + esc(retDraft.tracking) + '" autocomplete="off">') +
      field(tx("shipId"), '<input id="fa-ship" value="' + esc(retDraft.shipId) + '" autocomplete="off">') +
      "</div>" +
      '<div class="row">' +
      field(tx("reason"), '<select id="fa-reason">' + reasonOpts + "</select>") +
      field(tx("disp"), '<select id="fa-disp">' + dispOpts + "</select>") +
      field(tx("by"), '<input id="fa-by" value="' + esc(retDraft.by) + '" autocomplete="off">') +
      "</div>" +
      field(tx("notes"), '<textarea id="fa-rnotes" rows="2">' + esc(retDraft.notes) + "</textarea>") +
      '<div class="fa-tools"><button type="button" class="primary" data-fa="save-return"' + (saving ? " disabled" : "") + ">" + esc(saving ? tx("saving") : tx("saveRet")) + "</button>" + anyway + "</div></div>";
  }
  function returnTable(shown, all) {
    if (retError) return '<p class="fa-fail">' + esc(retError) + "</p>";
    if (!all.length) return '<p class="muted">' + esc(tx("retNone")) + "</p>";
    if (!shown.length) return '<p class="muted">' + esc(tx("retEmpty")) + "</p>";
    var body = shown.map(function (r) {
      var who = r.customer || r.marketplace || (r.channel === "major" ? tx("major") : tx("ecom"));
      var ref = r.order_ref || r.tracking || r.shipment_id || "";
      var when = isoDate(r.return_date) || isoDate(r.created_at);
      return "<tr><td class=\"sm\">" + esc(when) + "</td>" +
        "<td>" + esc(who) + ' <span class="muted sm">' + esc(r.channel || "") + "</span></td>" +
        '<td class="fa-clip" title="' + esc(r.product || "") + '">' + esc(clip(r.product || r.item_code || "", 80)) + "</td>" +
        '<td class="right">' + esc(r.qty == null ? "" : String(r.qty)) + "</td>" +
        '<td class="sm">' + esc(clip(ref, 40)) + "</td>" +
        "<td class=\"sm\">" + esc(r.reason || "") + "</td>" +
        "<td class=\"sm\">" + esc(r.disposition || "") + (r.restocked ? " ✓" : "") + "</td>" +
        "<td class=\"sm\">" + esc(r.received_by || "") + "</td></tr>";
    }).join("");
    return '<div class="tblwrap"><table><thead><tr><th>' + esc(tx("colDate")) + "</th><th>" + esc(tx("colWho")) + "</th><th>" + esc(tx("colProduct")) + "</th><th>" + esc(tx("colQty")) + "</th><th>" + esc(tx("colRef")) + "</th><th>" + esc(tx("colReason")) + "</th><th>" + esc(tx("colDisp")) + "</th><th>" + esc(tx("colBy")) + "</th></tr></thead><tbody>" + body + "</tbody></table></div>";
  }
  function renderReturns(today) {
    var all = returns || [];
    var sum = summarizeReturns(all, today);
    var shown = filterReturns(all, retFilters);
    return '<div class="card"><h2>' + esc(tx("retTitle")) + "</h2>" +
      '<div class="fa-note">' + esc(tx("retHint")) + "</div>" + failBox() +
      '<div class="fa-kpis">' +
      kpi("", sum.total, tx("retTotal"), "") +
      kpi("", sum.thisMonth, tx("retMonth"), "") +
      kpi("", sum.ecom, tx("retEcom"), "") +
      kpi("", sum.major, tx("retMajor"), "") +
      "</div></div>" +
      returnForm() +
      '<div class="card"><h2 class="sub2">' + esc(tx("retRecent")) + " (" + all.length + ")</h2>" +
      '<div class="fa-filters"><div><label>' + esc(tx("retSearch")) + '</label><input id="fa-rq" value="' + esc(retFilters.q) + '" autocomplete="off"></div></div>' +
      '<p class="muted sm">' + esc(tx("showing").replace("{n}", String(shown.length)).replace("{t}", String(all.length))) + "</p>" +
      returnTable(shown, all) + "</div>";
  }

  function render() {
    if (!doc) return;
    pullDraft();
    styleOnce();
    var host = doc.getElementById("view");
    if (!host) return;
    var today = todayDenver();
    var focus = doc.activeElement;
    var focusId = focus && (focus.id === "fa-q" || focus.id === "fa-rq") ? focus.id : "";
    var focusPos = focusId && focus.selectionStart != null ? focus.selectionStart : 0;
    var seg = '<div class="fa-seg">' +
      '<button type="button" data-fa="tab" data-val="errors" class="' + (tab === "errors" ? "on" : "") + '">' + esc(tx("tabErrors")) + "</button>" +
      '<button type="button" data-fa="tab" data-val="returns" class="' + (tab === "returns" ? "on" : "") + '">' + esc(tx("tabReturns")) + "</button></div>";
    var body = tab === "returns" ? renderReturns(today) : renderErrors(today);
    var waiting = tab === "returns" ? (returns == null && !retError) : (errors == null && !loadError);
    host.innerHTML = '<div id="fa-root">' + seg + (waiting ? '<div class="card"><p class="muted">' + esc(tab === "returns" ? tx("retLoading") : tx("loading")) + "</p></div>" : body) + "</div>";
    if (focusId) {
      var box = doc.getElementById(focusId);
      if (box) {
        box.focus();
        try { box.setSelectionRange(focusPos, focusPos); } catch (e) {}
      }
    }
    markNav();
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e2) {}
  }

  function loud(msg) {
    banner = msg;
    toast(msg);
    saving = false;
    render();
  }
  function parseCostField(raw) {
    var t = String(raw || "").replace(/[$,]/g, "").trim();
    if (!t) return { ok: true, value: null };
    var n = Number(t);
    if (!isFinite(n)) return { ok: false, value: null };
    return { ok: true, value: Math.round(n * 100) / 100 };
  }
  function friendly(err, dupMessage) {
    var msg = (err && err.message) ? err.message : tx("saveErr");
    if (err && (err.code === "23505" || /duplicate key|seed_key/i.test(msg))) return dupMessage || tx("dupErr");
    return tx("saveErr") + ": " + msg;
  }
  function readBackError(id, sent) {
    return rest("fulfillment_errors?id=eq." + encodeURIComponent(id) + "&select=id,order_num,date_reported,product_ordered,error_cost,credited_date,seed_key").then(function (rows) {
      if (!rows || !rows.length) throw new Error(tx("readBack") + ": row missing");
      var got = rows[0];
      if (String(got.order_num || "") !== String(sent.order_num || "")) throw new Error(tx("readBack") + ": order");
      if (isoDate(got.date_reported) !== isoDate(sent.date_reported)) throw new Error(tx("readBack") + ": date");
      if (String(got.seed_key || "") !== String(sent.seed_key || "")) throw new Error(tx("readBack") + ": key");
      if (!sameCost(got.error_cost, sent.error_cost)) throw new Error(tx("readBack") + ": cost");
      if (isoDate(got.credited_date) !== isoDate(sent.credited_date)) throw new Error(tx("readBack") + ": credited");
      return got;
    });
  }
  function saveError() {
    if (saving) return;
    pullDraft();
    if (!creds()) { loud(tx("cloudOff")); return; }
    var date = isoDate(draft.date);
    var order = String(draft.order || "").trim();
    var ordered = String(draft.ordered || "").trim();
    if (!date) { loud(tx("needDate")); return; }
    if (!order) { loud(tx("needOrder")); return; }
    if (!ordered) { loud(tx("needOrdered")); return; }
    var cost = parseCostField(draft.cost);
    if (!cost.ok) { loud(tx("badCost")); return; }
    var credited = String(draft.credited || "").trim();
    if (credited && !isoDate(credited)) { loud(tx("badDate")); return; }
    var row = {
      date_reported: date,
      order_num: order,
      product_ordered: ordered,
      product_received: cleanText(draft.received),
      notes: cleanText(draft.notes),
      replacement_tracking: cleanText(draft.tracking),
      error_cost: cost.value,
      credited_date: isoDate(credited) || null,
      source: "manual",
      seed_key: seedKey(order, date, ordered)
    };
    saving = true;
    banner = "";
    render();
    rest("fulfillment_errors", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    }).then(function (created) {
      var id = created && created[0] && created[0].id;
      if (!id) throw new Error(tx("readBack") + ": no id");
      return readBackError(id, row);
    }).then(function () {
      saving = false;
      banner = "";
      draft.order = "";
      draft.ordered = "";
      draft.received = "";
      draft.notes = "";
      draft.tracking = "";
      draft.cost = "";
      draft.credited = "";
      toast(tx("saved").replace("{o}", order));
      return loadErrors();
    }).then(function () { if (active) render(); }).catch(function (e) {
      loud(friendly(e, tx("dupErr")));
    });
  }
  function cleanReturn(rec) {
    var o = {};
    RETURN_COLS.forEach(function (k) { if (rec[k] !== undefined) o[k] = rec[k]; });
    return o;
  }
  function readBackReturn(id, sent) {
    return rest("returns_log?id=eq." + encodeURIComponent(id) + "&select=id,return_date,product,qty,dup_key,channel").then(function (rows) {
      if (!rows || !rows.length) throw new Error(tx("readBack") + ": row missing");
      var got = rows[0];
      if (String(got.product || "") !== String(sent.product || "")) throw new Error(tx("readBack") + ": product");
      if (String(got.return_date || "") !== String(sent.return_date || "")) throw new Error(tx("readBack") + ": date");
      if (Number(got.qty) !== Number(sent.qty)) throw new Error(tx("readBack") + ": qty");
      return got;
    });
  }
  function saveReturn(force) {
    if (saving) return;
    pullDraft();
    if (!creds()) { loud(tx("cloudOff")); return; }
    var date = isoDate(retDraft.date);
    var product = String(retDraft.product || "").trim();
    var qty = Number(String(retDraft.qty || "").replace(/,/g, "").trim());
    if (!date) { loud(tx("needRetDate")); return; }
    if (!product) { loud(tx("needProduct")); return; }
    if (!isFinite(qty) || qty <= 0) { loud(tx("needQty")); return; }
    var channel = retDraft.channel === "major" ? "major" : "ecom";
    var rec = {
      channel: channel,
      marketplace: cleanText(retDraft.market),
      return_date: date,
      customer: cleanText(retDraft.customer),
      shipment_id: cleanText(retDraft.shipId),
      product: product,
      tracking: cleanText(retDraft.tracking),
      qty: qty,
      is_kit: false,
      reason: cleanText(retDraft.reason),
      disposition: cleanText(retDraft.disp),
      restocked: retDraft.disp === "Restock",
      order_ref: cleanText(retDraft.orderRef),
      received_by: cleanText(retDraft.by),
      notes: cleanText(retDraft.notes)
    };
    rec.dup_key = returnDupKey(rec);
    var row = cleanReturn(rec);
    saving = true;
    banner = "";
    render();
    var gate = force ? Promise.resolve(null) : rest("returns_log?dup_key=eq." + encodeURIComponent(row.dup_key) + "&select=id,return_date,product,qty&limit=1");
    gate.then(function (existing) {
      if (existing && existing.length) {
        dupForce = true;
        var ex = existing[0];
        throw Object.assign(new Error(tx("retDup").replace("{d}", ex.return_date || "").replace("{p}", ex.product || "").replace("{q}", ex.qty == null ? "" : String(ex.qty))), { dup: true });
      }
      return rest("returns_log", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row)
      });
    }).then(function (created) {
      var id = created && created[0] && created[0].id;
      if (!id) throw new Error(tx("readBack") + ": no id");
      return readBackReturn(id, row);
    }).then(function () {
      saving = false;
      dupForce = false;
      banner = "";
      retDraft.customer = "";
      retDraft.market = "";
      retDraft.orderRef = "";
      retDraft.tracking = "";
      retDraft.shipId = "";
      retDraft.product = "";
      retDraft.qty = "";
      retDraft.notes = "";
      toast(tx("retSaved").replace("{p}", product));
      var refresh = root.DB && typeof root.DB.refresh === "function" ? root.DB.refresh() : null;
      return Promise.resolve(refresh).catch(function () { return null; }).then(function () { return loadReturns(); });
    }).then(function () { if (active) render(); }).catch(function (e) {
      if (e && e.dup) loud(e.message);
      else loud(friendly(e));
    });
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-fa]") : null;
    if (!t || !doc.getElementById("fa-root")) return;
    var act = t.getAttribute("data-fa");
    if (act === "tab") {
      tab = t.getAttribute("data-val") === "returns" ? "returns" : "errors";
      banner = "";
      render();
      if (tab === "returns" && returns == null) loadReturns().then(function () { if (active && tab === "returns") render(); });
      return;
    }
    if (act === "month") {
      var m = t.getAttribute("data-val") || "";
      filters.month = filters.month === m ? "" : m;
      render();
      return;
    }
    if (act === "kpi-total") { filters.month = ""; filters.uncredited = false; render(); return; }
    if (act === "kpi-month") {
      var cur = todayDenver().slice(0, 7);
      filters.month = filters.month === cur ? "" : cur;
      render();
      return;
    }
    if (act === "kpi-open") { filters.uncredited = !filters.uncredited; render(); return; }
    if (act === "save-error") { saveError(); return; }
    if (act === "save-return") { saveReturn(t.getAttribute("data-force") === "1"); return; }
    if (act === "reload") {
      var job = tab === "returns" ? loadReturns() : loadErrors();
      job.then(function () { if (active) render(); });
    }
  }
  function onChange(e) {
    var t = e.target;
    if (!t || !doc.getElementById("fa-root")) return;
    if (t.id === "fa-month") { filters.month = t.value || ""; render(); return; }
    if (t.id === "fa-open") { filters.uncredited = !!t.checked; render(); }
  }
  function onInput(e) {
    var t = e.target;
    if (!t || !doc.getElementById("fa-root")) return;
    if (t.id === "fa-q") { filters.q = t.value || ""; render(); return; }
    if (t.id === "fa-rq") { retFilters.q = t.value || ""; render(); }
  }

  function markNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || !active) return;
    var mine = doc.getElementById("fa-nav");
    if (!mine) return;
    var items = nav.querySelectorAll(".navitem.active");
    for (var i = 0; i < items.length; i++) items[i].classList.remove("active");
    mine.classList.add("active");
  }
  function injectNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("fa-nav")) return;
    var anchor = null;
    var items = nav.querySelectorAll("button.navitem");
    for (var i = 0; i < items.length; i++) {
      var oc = items[i].getAttribute("onclick") || "";
      if (oc.indexOf("fulfilldaily") >= 0) { anchor = items[i]; break; }
    }
    if (!anchor) return;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "fa-nav";
    btn.innerHTML = '<i class="navico" data-lucide="alert-triangle"></i><span>Fulfillment Errors</span>';
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (root.FULFILL_ANALYTICS && typeof root.FULFILL_ANALYTICS.open === "function") root.FULFILL_ANALYTICS.open();
      else open();
    });
    if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else anchor.parentNode.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    if (active) markNav();
  }
  function onScreen() {
    return !!(doc && doc.getElementById("fa-root"));
  }
  function open() {
    if (!doc) return;
    active = true;
    tab = tab || "errors";
    styleOnce();
    var host = doc.getElementById("view");
    if (host) host.innerHTML = '<div id="fa-root"><div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"muted\">" + esc(tx("loading")) + "</p></div></div>";
    try {
      var n = doc.getElementById("nav");
      var bd = doc.getElementById("navBackdrop");
      if (n) n.classList.remove("open");
      if (bd) bd.classList.remove("show");
    } catch (e) {}
    markNav();
    var paint = function () {
      var jobs = [loadErrors()];
      if (tab === "returns") jobs.push(loadReturns());
      Promise.all(jobs).then(function () { if (active) render(); });
    };
    paint();
    ensureSeed().then(function () { if (active) paint(); });
  }
  function leaveIfOther(e) {
    var t = e.target && e.target.closest ? e.target.closest("#fa-nav, [data-dept-tool], #nav .navitem, .dept-tab, #dept-back") : null;
    if (!t) return;
    if (t.id === "fa-nav") return;
    if (t.getAttribute && t.getAttribute("data-dept-tool") === "fulfillerr") return;
    active = false;
  }

  var api = {
    open: open,
    seedKey: seedKey,
    seedIdentity: seedIdentity,
    sha256: sha256,
    utf8Bytes: utf8Bytes,
    buildSeed: buildSeed,
    toSeedRow: toSeedRow,
    summarizeErrors: summarizeErrors,
    monthSeries: monthSeries,
    filterErrors: filterErrors,
    returnDupKey: returnDupKey,
    summarizeReturns: summarizeReturns,
    filterReturns: filterReturns,
    cleanReturn: cleanReturn,
    SOURCE: SOURCE,
    JSON_URL: JSON_URL,
    RETURN_COLS: RETURN_COLS
  };
  root.FULFILL_ANALYTICS = api;

  if (doc) {
    doc.addEventListener("click", onClick);
    doc.addEventListener("change", onChange);
    doc.addEventListener("input", onInput);
    doc.addEventListener("click", leaveIfOther, true);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && active) setTimeout(function () { if (active && onScreen()) render(); }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return active && onScreen(); });
    root.SMK_BUSY = root.SMK_BUSY || [];
    root.SMK_BUSY.push(function () { return saving && onScreen(); });
    try {
      var mo = new MutationObserver(function () {
        injectNav();
        if (active && doc.getElementById("view") && !doc.getElementById("fa-root")) render();
      });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); ensureSeed(); });
    else { setTimeout(injectNav, 400); ensureSeed(); }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

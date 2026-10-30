/* ============================================================================
   FG Lots / Best-by  (fg-lots.js)
   Read-only register of finished-goods lots for Fulfillment, P-Mac, and Quality.

   Cloud rows: trace_labels where kind is FG (lot, flavor, size, exp, status,
   qty_left, location). exp is the best-by date typed on the pallet label.

   Legacy rows: retail production_days.lot, comma-separated bag codes, read
   only. Those days were logged, not palletized. Quantity stays blank.

   Shelf life: read kv_status keys fg_shelf_life (and fg_shelf_life_* /
   fg_shelf_life:*) only when the value is confirmed JSON. This file does not
   insert a rule and does not invent months. Stock, racks, and Adriana's
   counts are not written. WRITE_STOCK stays off.

   Standalone. No app.js edit. Loaded before trace.js and dept-homes.js.
   ========================================================================== */
(function (root) {
  "use strict";

  var WRITE_STOCK = false;
  var SHORT_DAYS = 90;
  var LEGACY_DAYS = 180;
  var SHELF_KEY = "fg_shelf_life";
  var BAGCODE_RE = /^[SLA]\d{4}\/\d[A-Z]\d\.\d{1,2}$/;

  var FLAVORS = {
    S01: "OG Original", S02: "Cinnamon Churro", S03: "Backyard BBQ", S04: "Garlic Parmesan",
    S05: "Dill Pickle", S06: "Cracked Pepper", S07: "Cheddar Jalapeno", S08: "Ranch",
    S09: "Maple Brown Sugar", S10: "Lemon Pepper", S11: "Sour Cream & Onion",
    L14: "Teriyaki", L15: "Taco", L16: "Salsa", L17: "Guacamole", L18: "Chile Lime",
    L19: "Honey Sriracha", L20: "Pizza / Deep Dish Pizza", L21: "Strawberry Cheesecake",
    L22: "Loaded Nacho", L23: "Cheddar Ghost Pepper", L24: "Parmuffalo", L25: "Cheeseburger",
    L26: "Buffalo Ranch", L27: "Peanut Butter & Jelly", L28: "Cinnamon Roll", L29: "Spicy Queso",
    L30: "Salted Caramel", L31: "GuacZilla!", L32: "Ketchup", L33: "Loaded Potato",
    L34: "Honey BBQ", L35: "Chili Cheese Dog", L36: "Bacon Mac & Cheese", L37: "Blueberry Pie",
    L38: "Salt & Vinegar", L39: "Sweet Thai Chili", L40: "S'Mores", L41: "Korean BBQ",
    L42: "Cheddar Sour Cream", L43: "Funnel Cake", L44: "Chipotle Ranch", L45: "Honey Mustard",
    L46: "Dill Ranch", L47: "Dijon Ranch", L48: "Fried Chicken", L49: "Flame Grilled Steak",
    L50: "Jalapeno Ranch", L51: "Pumpkin Spice", L52: "French Onion Soup",
    A01: "Nashville Hot", A18: "Birthday Cake", A23: "Mexican Street Corn"
  };

  var TXT = {
    en: {
      title: "FG Lots / Best-by",
      hint: "Finished pallet labels from Lot Trace, plus bag codes logged on Daily Production. Logged rows were not palletized and have no quantity. This screen does not change inventory.",
      noRule: "No confirmed shelf-life rule is on file (kv_status fg_shelf_life). Best-by is only the date someone typed. Product and Quality still need to set the months.",
      hasRule: "A confirmed shelf-life rule is on file. P-Mac can prefill best-by. Change it when the bag shows a different date.",
      healthEmpty: "trace_labels: 0. Last update: none. Finished pallets are not in the cloud yet.",
      healthLive: "trace_labels: {n}. Last update: {when}. FG pallet labels: {fg}.",
      healthFail: "trace_labels: could not read.",
      lot: "Lot", flavor: "Flavor", size: "Size", bestBy: "Best-by", days: "Days left",
      status: "Status", qty: "Qty left", loc: "Location", source: "Source",
      search: "Search lot or flavor", all: "All", shortOnly: "Short-dated only",
      onHand: "On hand only", export: "Export CSV", refresh: "Refresh",
      empty: "No finished lots match these filters.",
      loading: "Loading FG lots...",
      offline: "Not connected. FG lots could not be read.",
      pallet: "Pallet label",
      logged: "Logged, not palletized",
      short: "Short-dated",
      past: "Past best-by",
      left: "{n} days left",
      pastN: "Past by {n} days",
      today: "Today",
      none: "none",
      notSet: "Not set. Type the date printed on the bag.",
      printed: "No shelf-life rule is on file. Saving the date you typed.",
      fromRule: "Filled from the shelf-life rule ({n} months). Change it if the bag shows a different date.",
      override: "Different from the shelf-life rule ({n} months). The date you typed will be saved.",
      cleared: "The shelf-life date was cleared. Best-by will be saved blank.",
      shortHint: "Short-dated means 90 days or less left, or already past best-by. It is a display flag, not a shelf-life rule."
    },
    es: {
      title: "Lotes PT / Consumir antes",
      hint: "Etiquetas de tarima terminada de Rastreo de lotes, mas codigos de bolsa anotados en Produccion diaria. Esas filas no son tarimas y no tienen cantidad. Esta pantalla no cambia el inventario.",
      noRule: "No hay una regla confirmada de vida util (kv_status fg_shelf_life). Consumir antes es solo la fecha que alguien escribio. Producto y Calidad aun deben definir los meses.",
      hasRule: "Hay una regla confirmada de vida util. P-Mac puede llenar consumir antes. Cambiela si la bolsa muestra otra fecha.",
      healthEmpty: "trace_labels: 0. Ultima actualizacion: ninguna. Las tarimas terminadas aun no estan en la nube.",
      healthLive: "trace_labels: {n}. Ultima actualizacion: {when}. Etiquetas de tarima PT: {fg}.",
      healthFail: "trace_labels: no se pudo leer.",
      lot: "Lote", flavor: "Sabor", size: "Tamano", bestBy: "Consumir antes", days: "Dias",
      status: "Estado", qty: "Cant. restante", loc: "Ubicacion", source: "Origen",
      search: "Buscar lote o sabor", all: "Todos", shortOnly: "Solo corta fecha",
      onHand: "Solo en mano", export: "Exportar CSV", refresh: "Actualizar",
      empty: "Ningun lote terminado coincide con estos filtros.",
      loading: "Cargando lotes PT...",
      offline: "Sin conexion. No se pudieron leer los lotes PT.",
      pallet: "Etiqueta de tarima",
      logged: "Anotado, no paletizado",
      short: "Corta fecha",
      past: "Pasado de fecha",
      left: "{n} dias",
      pastN: "Pasado por {n} dias",
      today: "Hoy",
      none: "ninguna",
      notSet: "No definido. Escriba la fecha impresa en la bolsa.",
      printed: "No hay regla de vida util. Se guardara la fecha que escribio.",
      fromRule: "Llenado con la regla de vida util ({n} meses). Cambiela si la bolsa muestra otra fecha.",
      override: "Distinta de la regla de vida util ({n} meses). Se guardara la fecha que escribio.",
      cleared: "Se borro la fecha de la regla. Consumir antes quedara vacio.",
      shortHint: "Corta fecha significa 90 dias o menos, o ya paso la fecha. Es una marca en pantalla, no una regla de vida util."
    },
    pt: {
      title: "Lotes PA / Validade",
      hint: "Etiquetas de palete acabado do Rastreio de lote, mais codigos de saco anotados na Producao diaria. Essas linhas nao sao paletes e nao tem quantidade. Esta tela nao muda o estoque.",
      noRule: "Nao ha regra confirmada de validade (kv_status fg_shelf_life). A validade e so a data que alguem digitou. Produto e Qualidade ainda precisam definir os meses.",
      hasRule: "Ha uma regra confirmada de validade. O P-Mac pode preencher a validade. Mude se o saco mostrar outra data.",
      healthEmpty: "trace_labels: 0. Ultima atualizacao: nenhuma. Paletes acabados ainda nao estao na nuvem.",
      healthLive: "trace_labels: {n}. Ultima atualizacao: {when}. Etiquetas de palete PA: {fg}.",
      healthFail: "trace_labels: nao foi possivel ler.",
      lot: "Lote", flavor: "Sabor", size: "Tamanho", bestBy: "Validade", days: "Dias",
      status: "Status", qty: "Qtd restante", loc: "Local", source: "Origem",
      search: "Buscar lote ou sabor", all: "Todos", shortOnly: "So curto prazo",
      onHand: "So em estoque", export: "Exportar CSV", refresh: "Atualizar",
      empty: "Nenhum lote acabado combina com estes filtros.",
      loading: "Carregando lotes PA...",
      offline: "Sem conexao. Nao foi possivel ler os lotes PA.",
      pallet: "Etiqueta de palete",
      logged: "Anotado, nao paletizado",
      short: "Curto prazo",
      past: "Vencido",
      left: "{n} dias",
      pastN: "Vencido ha {n} dias",
      today: "Hoje",
      none: "nenhuma",
      notSet: "Nao definido. Digite a data impressa no saco.",
      printed: "Nao ha regra de validade. A data digitada sera salva.",
      fromRule: "Preenchido pela regra de validade ({n} meses). Mude se o saco mostrar outra data.",
      override: "Diferente da regra de validade ({n} meses). A data digitada sera salva.",
      cleared: "A data da regra foi apagada. A validade ficara em branco.",
      shortHint: "Curto prazo significa 90 dias ou menos, ou ja passou da validade. E um aviso na tela, nao uma regra de validade."
    }
  };

  function lang() {
    var doc = root.document;
    if (!doc || !doc.getElementById) return "en";
    var pt = doc.getElementById("lang-pt");
    var es = doc.getElementById("lang-es");
    if (pt && pt.classList.contains("active")) return "pt";
    if (es && es.classList.contains("active")) return "es";
    return "en";
  }
  function L(k) {
    var pack = TXT[lang()] || TXT.en;
    if (pack[k] != null) return pack[k];
    return TXT.en[k] != null ? TXT.en[k] : k;
  }
  function fill(s, map) {
    return String(s || "").replace(/\{(\w+)\}/g, function (_, k) {
      return map && map[k] != null ? String(map[k]) : "";
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function ymd(s) {
    s = String(s || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }
  function dateNum(day) {
    var p = String(day || "").split("-");
    if (p.length !== 3) return 0;
    return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(day, n) {
    var base = dateNum(day);
    if (!base) return "";
    var dt = new Date(base);
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }
  function todayYmd() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function wholeMonths(v) {
    if (typeof v === "string" && v.trim() === "") return null;
    var n = Number(v);
    if (!isFinite(n) || n < 1 || n > 60 || Math.round(n) !== n) return null;
    return n;
  }
  function normSize(s) {
    s = String(s || "").toLowerCase().replace(/\s+/g, "");
    if (s.indexOf("2.75") >= 0) return "2.75oz";
    if (s.indexOf("1.5") >= 0) return "1.5oz";
    if (s.indexOf("4oz") >= 0) return "4oz";
    return s;
  }
  function flavorCodeOf(lot) {
    var m = String(lot || "").toUpperCase().match(/^([SLA]\d{2})/);
    return m ? m[1] : "";
  }
  function flavorName(code) {
    code = String(code || "").toUpperCase();
    return FLAVORS[code] || code;
  }
  function shelfKeyOk(key) {
    key = String(key || "");
    if (key === SHELF_KEY) return true;
    if (key.indexOf(SHELF_KEY + "_") === 0) return true;
    if (key.indexOf(SHELF_KEY + ":") === 0) return true;
    return false;
  }
  function mapSizeMonths(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    var out = {};
    var n = 0;
    Object.keys(obj).forEach(function (k) {
      var m = wholeMonths(obj[k]);
      var size = normSize(k);
      if (m == null || !size) return;
      out[size] = m;
      n++;
    });
    return n ? out : null;
  }
  function mapFlavorMonths(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    var out = {};
    var n = 0;
    Object.keys(obj).forEach(function (k) {
      var m = wholeMonths(obj[k]);
      var code = String(k || "").toUpperCase().replace(/\s+/g, "");
      if (m == null || !/^[SLA]\d{2}$/.test(code)) return;
      out[code] = m;
      n++;
    });
    return n ? out : null;
  }
  function parseShelfRule(raw) {
    if (raw == null || raw === "") return null;
    var obj = raw;
    if (typeof raw === "string") {
      var t = raw.trim();
      if (!t || (t.charAt(0) !== "{" && t.charAt(0) !== "[")) return null;
      try { obj = JSON.parse(t); } catch (e) { return null; }
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    if (obj.confirmed !== true) return null;
    var months = wholeMonths(obj.months);
    var bySize = mapSizeMonths(obj.by_size || obj.bySize);
    var byFlavor = mapFlavorMonths(obj.by_flavor || obj.byFlavor);
    if (months == null && !bySize && !byFlavor) return null;
    return { confirmed: true, months: months, bySize: bySize || {}, byFlavor: byFlavor || {} };
  }
  function pickRule(rows) {
    var list = (rows || []).filter(function (r) { return r && shelfKeyOk(r.key); });
    list.sort(function (a, b) {
      if (a.key === SHELF_KEY && b.key !== SHELF_KEY) return -1;
      if (b.key === SHELF_KEY && a.key !== SHELF_KEY) return 1;
      return String(a.key) < String(b.key) ? -1 : 1;
    });
    for (var i = 0; i < list.length; i++) {
      var rule = parseShelfRule(list[i].value);
      if (!rule) continue;
      rule.key = list[i].key;
      return rule;
    }
    return null;
  }
  function monthsFor(rule, size, flavor) {
    if (!rule || rule.confirmed !== true) return null;
    var code = String(flavor || "").toUpperCase();
    if (code && rule.byFlavor && rule.byFlavor[code] != null) return rule.byFlavor[code];
    var sz = normSize(size);
    if (sz && rule.bySize && rule.bySize[sz] != null) return rule.bySize[sz];
    return rule.months == null ? null : rule.months;
  }
  function addMonths(day, months) {
    day = ymd(day);
    months = wholeMonths(months);
    if (!day || months == null) return "";
    var p = day.split("-");
    var y = Number(p[0]);
    var m = Number(p[1]) - 1;
    var d = Number(p[2]);
    var first = new Date(Date.UTC(y, m + months, 1));
    var last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    var dt = new Date(Date.UTC(y, m + months, Math.min(d, last)));
    return dt.toISOString().slice(0, 10);
  }
  function suggestedExp(input) {
    input = input || {};
    var months = monthsFor(input.rule, input.size, input.flavor);
    if (months == null) return "";
    return addMonths(input.packDate, months);
  }
  function textPack(code) {
    var pack = TXT[code] || TXT.en;
    return pack;
  }
  function bestByField(input) {
    input = input || {};
    var code = input.lang || "en";
    if (!TXT[code]) code = "en";
    var pack = textPack(code);
    var rule = input.rule && input.rule.confirmed === true ? input.rule : null;
    var months = rule ? monthsFor(rule, input.size, input.flavor) : null;
    var prefill = months == null ? "" : addMonths(input.packDate, months);
    var typed = ymd(input.typed);
    var touched = !!input.touched;
    var value = touched ? typed : (typed || prefill);
    var kind = "not_set";
    var guidance = pack.notSet;
    if (!rule || months == null) {
      if (value) { kind = "printed"; guidance = pack.printed; }
      else { kind = "not_set"; guidance = pack.notSet; }
    } else if (!value && touched) {
      kind = "cleared";
      guidance = pack.cleared;
    } else if (value && value !== prefill) {
      kind = "override";
      guidance = fill(pack.override, { n: months });
    } else if (prefill) {
      kind = "from_rule";
      guidance = fill(pack.fromRule, { n: months });
      value = value || prefill;
    }
    return { value: value || "", prefill: prefill || "", code: kind, guidance: guidance, months: months };
  }
  function fgLabelExp(input) {
    input = input || {};
    var typed = ymd(input.typed);
    var suggested = suggestedExp(input);
    var source = "blank";
    var override = false;
    if (typed) {
      if (suggested && typed !== suggested) { source = "override"; override = true; }
      else if (suggested) source = "rule";
      else source = "printed";
    } else if (suggested && input.touched) {
      source = "override";
      override = true;
    }
    var events = [];
    if (override) {
      events.push({
        type: "BEST_BY",
        lot: String(input.lot || ""),
        data: { from: suggested || "", to: typed || "", source: "override" }
      });
    }
    return {
      exp: typed || null,
      source: source,
      override: override,
      suggested: suggested || "",
      events: events,
      writes: [],
      stockWritten: WRITE_STOCK
    };
  }
  function daysLeft(exp, today) {
    var a = dateNum(ymd(exp));
    var b = dateNum(ymd(today));
    if (!a || !b) return null;
    return Math.round((a - b) / 86400000);
  }
  function daysText(n, code) {
    var pack = textPack(code || "en");
    if (n == null) return "";
    if (n < 0) return fill(pack.pastN, { n: String(-n) });
    if (n === 0) return pack.today;
    return fill(pack.left, { n: String(n) });
  }
  function rollupStatus(byStatus) {
    var keys = [];
    Object.keys(byStatus || {}).forEach(function (k) {
      if (byStatus[k] > 0) keys.push(k);
    });
    if (!keys.length) keys = Object.keys(byStatus || {});
    if (!keys.length) return "";
    if (keys.length === 1) return keys[0];
    keys.sort();
    return "Mixed";
  }
  function palletRows(labels, opts) {
    opts = opts || {};
    var today = ymd(opts.today) || todayYmd();
    var by = {};
    (labels || []).forEach(function (l) {
      if (!l || String(l.kind || "").toUpperCase() !== "FG") return;
      var lot = String(l.lot || "").toUpperCase().replace(/\s+/g, "");
      if (!lot) return;
      var size = normSize(l.size);
      var key = lot + "|" + size;
      var row = by[key];
      if (!row) {
        var fc = String(l.flavor_code || flavorCodeOf(lot) || "").toUpperCase();
        row = by[key] = {
          lot: lot,
          flavor_code: fc,
          flavor: l.flavor || flavorName(fc),
          size: size,
          exp: "",
          status: "",
          byStatus: {},
          qty_left: 0,
          locations: [],
          source: "pallet",
          source_label: "",
          logged_on: "",
          updated: ""
        };
      }
      var q = Number(l.qty_left);
      if (!isFinite(q)) q = 0;
      row.qty_left += q;
      var st = String(l.status || "").toUpperCase() || "ACTIVE";
      row.byStatus[st] = (row.byStatus[st] || 0) + (q > 0 ? q : 0);
      if (!(q > 0)) row.byStatus[st] = row.byStatus[st] || 0;
      var data = l.data || {};
      var exp = ymd(l.exp) || ymd(data.exp);
      if (exp && (!row.exp || exp < row.exp)) row.exp = exp;
      var loc = String(l.location || "").trim();
      if (loc && row.locations.indexOf(loc) < 0) row.locations.push(loc);
      var ts = String(l.updated_at || l.created_at || "");
      if (ts > row.updated) row.updated = ts;
    });
    return Object.keys(by).map(function (k) {
      var row = by[k];
      row.status = rollupStatus(row.byStatus);
      row.location = row.locations.join(", ");
      row.days_left = row.exp ? daysLeft(row.exp, today) : null;
      row.short = row.days_left != null && row.days_left <= SHORT_DAYS;
      row.source_label = TXT.en.pallet;
      delete row.byStatus;
      delete row.locations;
      return row;
    });
  }
  function legacyRows(days, opts) {
    opts = opts || {};
    var today = ymd(opts.today) || "";
    var seen = {};
    var out = [];
    (days || []).forEach(function (day) {
      if (!day) return;
      var channel = String(day.channel || "").toLowerCase();
      if (channel !== "retail") return;
      var date = ymd(day.prod_date);
      if (today && date && date > today) return;
      String(day.lot || "").split(/[,;\n]+/).forEach(function (part) {
        var lot = String(part || "").toUpperCase().replace(/\s+/g, "");
        if (!BAGCODE_RE.test(lot)) return;
        var row = seen[lot];
        if (!row) {
          var fc = flavorCodeOf(lot);
          row = seen[lot] = {
            lot: lot,
            flavor_code: fc,
            flavor: flavorName(fc),
            size: "",
            exp: "",
            days_left: null,
            short: false,
            status: "Logged",
            qty_left: null,
            location: "",
            source: "logged",
            source_label: "",
            logged_on: "",
            logged_dates: []
          };
          out.push(row);
        }
        if (date && row.logged_dates.indexOf(date) < 0) row.logged_dates.push(date);
      });
    });
    out.forEach(function (row) {
      row.logged_dates.sort();
      row.logged_on = row.logged_dates.length ? row.logged_dates[row.logged_dates.length - 1] : "";
      row.source_label = TXT.en.logged + (row.logged_on ? " (" + row.logged_on + ")" : "");
      delete row.logged_dates;
    });
    return out;
  }
  function mergeRegister(labels, days, opts) {
    var pallets = palletRows(labels, opts);
    var have = {};
    pallets.forEach(function (r) { have[r.lot] = 1; });
    var legacy = legacyRows(days, opts).filter(function (r) { return !have[r.lot]; });
    return pallets.concat(legacy);
  }
  function filterRows(rows, f) {
    f = f || {};
    var q = String(f.q || "").toUpperCase().replace(/\s+/g, "");
    var flavor = String(f.flavor || "").toUpperCase();
    var size = f.size ? normSize(f.size) : "";
    var status = String(f.status || "").toUpperCase();
    var source = String(f.source || "");
    return (rows || []).filter(function (r) {
      if (q) {
        var hay = (r.lot + " " + r.flavor + " " + r.flavor_code).toUpperCase().replace(/\s+/g, "");
        if (hay.indexOf(q) < 0) return false;
      }
      if (flavor && String(r.flavor_code || "").toUpperCase() !== flavor) return false;
      if (size && normSize(r.size) !== size) return false;
      if (status && String(r.status || "").toUpperCase() !== status) return false;
      if (source && r.source !== source) return false;
      if (f.short && !r.short) return false;
      if (f.onHand && !(Number(r.qty_left) > 0)) return false;
      return true;
    }).sort(function (a, b) {
      var da = a.days_left;
      var db = b.days_left;
      if (da == null && db != null) return 1;
      if (db == null && da != null) return -1;
      if (da != null && db != null && da !== db) return da - db;
      if (a.lot !== b.lot) return a.lot < b.lot ? -1 : 1;
      return String(a.size) < String(b.size) ? -1 : 1;
    });
  }
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function sourceText(row) {
    if (!row) return "";
    if (row.source === "logged") return row.source_label || TXT.en.logged;
    return row.source_label || TXT.en.pallet;
  }
  function toCsv(rows) {
    var head = ["lot", "flavor", "size", "best_by", "days_left", "short_dated", "status", "qty_left", "location", "source"];
    var lines = [head.join(",")];
    (rows || []).forEach(function (r) {
      lines.push([
        r.lot, r.flavor, r.size, r.exp || "",
        r.days_left == null ? "" : r.days_left,
        r.short ? "yes" : "no",
        r.status || "",
        r.qty_left == null ? "" : r.qty_left,
        r.location || "",
        sourceText(r)
      ].map(csvCell).join(","));
    });
    return lines.join("\n") + "\n";
  }
  function healthLine(h, code) {
    var pack = textPack(code || "en");
    h = h || {};
    if (h.count == null) return pack.healthFail;
    if (!h.count) return pack.healthEmpty;
    var when = h.latest ? String(h.latest).replace("T", " ").slice(0, 16) : pack.none;
    return fill(pack.healthLive, { n: h.count, when: when, fg: h.fg == null ? 0 : h.fg });
  }

  var ruleCache = { status: "idle", rule: null, pending: null };
  function ruleStatus() { return ruleCache.status; }
  function currentRule() { return ruleCache.rule; }
  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { return root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { return null; }
  }
  function ensureRule() {
    if (ruleCache.status === "ready" || ruleCache.status === "missing") return Promise.resolve(ruleCache.rule);
    if (ruleCache.pending) return ruleCache.pending;
    var c = client();
    if (!c) {
      ruleCache.status = "missing";
      ruleCache.rule = null;
      return Promise.resolve(null);
    }
    ruleCache.status = "loading";
    ruleCache.pending = c.from("kv_status").select("key,value").or(
      "key.eq." + SHELF_KEY + ",key.like." + SHELF_KEY + "_*,key.like." + SHELF_KEY + ":*"
    ).limit(20).then(function (r) {
      ruleCache.pending = null;
      if (r && r.error) {
        ruleCache.status = "missing";
        ruleCache.rule = null;
        return null;
      }
      ruleCache.rule = pickRule((r && r.data) || []);
      ruleCache.status = ruleCache.rule ? "ready" : "missing";
      return ruleCache.rule;
    }).catch(function () {
      ruleCache.pending = null;
      ruleCache.status = "missing";
      ruleCache.rule = null;
      return null;
    });
    return ruleCache.pending;
  }

  var active = false;
  var ui = { q: "", flavor: "", size: "", status: "", source: "", short: false, onHand: false };
  var cache = { rows: [], health: { count: null, latest: "", fg: 0 }, err: "", rule: null };

  function $(id) { return root.document ? root.document.getElementById(id) : null; }
  function onScreen() { return !!($("fgl-root")); }
  function styleOnce() {
    if ($("fgl-style")) return;
    var s = root.document.createElement("style");
    s.id = "fgl-style";
    s.textContent = [
      "#fgl-root .fgl-health{padding:12px 14px;border-radius:10px;font-weight:700;margin:8px 0 12px}",
      "#fgl-root .fgl-health.empty{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}",
      "#fgl-root .fgl-health.live{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}",
      "#fgl-root .fgl-health.fail{background:#fee2e2;border:1px solid #fecaca;color:#991b1b}",
      "#fgl-root .fgl-flag{display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800;background:#ffedd5;color:#9a3412}",
      "#fgl-root .fgl-flag.past{background:#fee2e2;color:#991b1b}",
      "#fgl-root .fgl-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:8px 0 12px}",
      "#fgl-root .fgl-filters label{font-size:13px;font-weight:700;display:block}",
      "#fgl-root .fgl-filters input,#fgl-root .fgl-filters select{min-height:40px}",
      "#fgl-root .fgl-note{font-size:14px}",
      "#fgl-root td.num{text-align:right;font-variant-numeric:tabular-nums}"
    ].join("");
    (root.document.head || root.document.documentElement).appendChild(s);
  }
  function stampOf(row) {
    if (!row) return "";
    var a = String(row.updated_at || "");
    var b = String(row.created_at || "");
    return a > b ? a : b;
  }
  function loadData() {
    var c = client();
    if (!c) return Promise.resolve({ err: "offline", rows: [], health: { count: null, latest: "", fg: 0 }, rule: null });
    var today = todayYmd();
    var since = addDays(today, -LEGACY_DAYS);
    return Promise.all([
      c.from("trace_labels").select("lpn", { count: "exact", head: true }),
      c.from("trace_labels").select("created_at,updated_at").order("created_at", { ascending: false }).limit(1),
      c.from("trace_labels").select("*").eq("kind", "FG").order("created_at", { ascending: false }).limit(20000),
      c.from("production_days").select("prod_date,channel,lot").eq("channel", "retail").gte("prod_date", since).order("prod_date", { ascending: false }).limit(500),
      ensureRule()
    ]).then(function (all) {
      var countRes = all[0] || {};
      var latestRes = all[1] || {};
      var fgRes = all[2] || {};
      var dayRes = all[3] || {};
      var failed = (countRes.error && countRes.error.message) || (fgRes.error && fgRes.error.message) || "";
      var count = countRes.count;
      if (count == null && !countRes.error) count = 0;
      var latest = stampOf(latestRes.data && latestRes.data[0]);
      var labels = fgRes.data || [];
      var days = dayRes.data || [];
      var rows = failed ? [] : mergeRegister(labels, days, { today: today });
      return {
        err: failed,
        rows: rows,
        rule: all[4] || null,
        health: { count: failed ? null : (count || 0), latest: latest, fg: labels.length }
      };
    }).catch(function (e) {
      return { err: (e && e.message) || "read failed", rows: [], health: { count: null, latest: "", fg: 0 }, rule: null };
    });
  }
  function opt(list, cur, blank) {
    var h = '<option value="">' + esc(blank || L("all")) + "</option>";
    list.forEach(function (v) {
      h += '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(v) + "</option>";
    });
    return h;
  }
  function uniq(rows, field) {
    var m = {};
    rows.forEach(function (r) {
      var v = r[field];
      if (v) m[v] = 1;
    });
    return Object.keys(m).sort();
  }
  function render() {
    styleOnce();
    var host = $("view");
    if (!host) return;
    var code = lang();
    var shown = filterRows(cache.rows, ui);
    var healthCls = cache.err ? "fail" : (cache.health.count ? "live" : "empty");
    var healthTxt = cache.err ? L("healthFail") : healthLine(cache.health, code);
    var rule = cache.rule || currentRule();
    var flavors = uniq(cache.rows, "flavor_code");
    var sizes = uniq(cache.rows, "size");
    var statuses = uniq(cache.rows, "status");
    var body = shown.map(function (r) {
      var flag = "";
      if (r.short) {
        var past = r.days_left != null && r.days_left < 0;
        flag = ' <span class="fgl-flag' + (past ? " past" : "") + '">' + esc(past ? L("past") : L("short")) + "</span>";
      }
      var best = r.exp ? esc(r.exp) : "";
      var days = daysText(r.days_left, code);
      var qty = r.qty_left == null ? "" : Number(r.qty_left).toLocaleString("en-US");
      var src = r.source === "logged" ? (L("logged") + (r.logged_on ? " (" + r.logged_on + ")" : "")) : L("pallet");
      return "<tr><td><b>" + esc(r.lot) + "</b></td><td>" + esc(r.flavor || "") + "</td><td>" + esc(r.size || "") +
        "</td><td>" + best + (days ? " <span class=\"muted\">" + esc(days) + "</span>" : "") + flag + "</td><td>" +
        esc(r.status || "") + "</td><td class=\"num\">" + esc(qty) + "</td><td>" + esc(r.location || "") +
        "</td><td>" + esc(src) + "</td></tr>";
    }).join("");
    if (!shown.length) body = '<tr><td colspan="8" class="muted">' + esc(L("empty")) + "</td></tr>";
    var focusId = root.document.activeElement && root.document.activeElement.id;
    var caret = root.document.activeElement && root.document.activeElement.selectionStart;
    host.innerHTML =
      '<div id="fgl-root"><div class="card"><h2>' + esc(L("title")) + "</h2>" +
      '<p class="hint">' + esc(L("hint")) + "</p>" +
      '<div class="fgl-health ' + healthCls + '">' + esc(healthTxt) + "</div>" +
      '<p class="fgl-note">' + esc(rule ? L("hasRule") : L("noRule")) + "</p>" +
      '<p class="muted fgl-note">' + esc(L("shortHint")) + "</p>" +
      '<div class="fgl-filters">' +
      '<div><label>' + esc(L("search")) + '</label><input id="fgl-q" value="' + esc(ui.q) + '"></div>' +
      '<div><label>' + esc(L("flavor")) + '</label><select id="fgl-flavor">' + opt(flavors, ui.flavor) + "</select></div>" +
      '<div><label>' + esc(L("size")) + '</label><select id="fgl-size">' + opt(sizes, ui.size) + "</select></div>" +
      '<div><label>' + esc(L("status")) + '</label><select id="fgl-status">' + opt(statuses, ui.status) + "</select></div>" +
      '<div><label>' + esc(L("source")) + '</label><select id="fgl-source">' +
      '<option value="">' + esc(L("all")) + "</option>" +
      '<option value="pallet"' + (ui.source === "pallet" ? " selected" : "") + ">" + esc(L("pallet")) + "</option>" +
      '<option value="logged"' + (ui.source === "logged" ? " selected" : "") + ">" + esc(L("logged")) + "</option>" +
      "</select></div>" +
      '<label style="font-weight:600"><input id="fgl-short" type="checkbox"' + (ui.short ? " checked" : "") + "> " + esc(L("shortOnly")) + "</label>" +
      '<label style="font-weight:600"><input id="fgl-hand" type="checkbox"' + (ui.onHand ? " checked" : "") + "> " + esc(L("onHand")) + "</label>" +
      "</div>" +
      '<div class="trc-row"><button type="button" class="primary" id="fgl-export">' + esc(L("export")) + '</button> <button type="button" class="ghost" id="fgl-refresh">' + esc(L("refresh")) + "</button></div>" +
      "</div><div class=\"card\"><div class=\"tblwrap\"><table><thead><tr><th>" +
      [L("lot"), L("flavor"), L("size"), L("bestBy"), L("status"), L("qty"), L("loc"), L("source")].map(esc).join("</th><th>") +
      "</th></tr></thead><tbody>" + body + "</tbody></table></div></div></div>";
    bind();
    if (focusId && focusId.indexOf("fgl-") === 0) {
      var again = $(focusId);
      if (again) {
        try { again.focus(); } catch (e) {}
        if (caret != null && again.setSelectionRange) {
          try { again.setSelectionRange(caret, caret); } catch (e2) {}
        }
      }
    }
  }
  function readUi() {
    var q = $("fgl-q"); if (q) ui.q = q.value;
    var flavor = $("fgl-flavor"); if (flavor) ui.flavor = flavor.value;
    var size = $("fgl-size"); if (size) ui.size = size.value;
    var status = $("fgl-status"); if (status) ui.status = status.value;
    var source = $("fgl-source"); if (source) ui.source = source.value;
    var short = $("fgl-short"); if (short) ui.short = !!short.checked;
    var hand = $("fgl-hand"); if (hand) ui.onHand = !!hand.checked;
  }
  function bind() {
    ["fgl-q", "fgl-flavor", "fgl-size", "fgl-status", "fgl-source", "fgl-short", "fgl-hand"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () { readUi(); render(); });
      el.addEventListener("change", function () { readUi(); render(); });
    });
    var ex = $("fgl-export");
    if (ex) ex.addEventListener("click", function () {
      readUi();
      var csv = toCsv(filterRows(cache.rows, ui));
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var a = root.document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fg-lots-" + todayYmd() + ".csv";
      root.document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
    });
    var rf = $("fgl-refresh");
    if (rf) rf.addEventListener("click", function () { open(); });
  }
  function open(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    active = true;
    styleOnce();
    var host = $("view");
    if (host) host.innerHTML = '<div id="fgl-root"><div class="card"><h2>' + esc(L("title")) + "</h2><p>" + esc(L("loading")) + "</p></div></div>";
    try {
      var nav = $("nav");
      var bd = $("navBackdrop");
      if (nav) nav.classList.remove("open");
      if (bd) bd.classList.remove("show");
    } catch (e) {}
    markActive();
    loadData().then(function (res) {
      if (!active) return;
      cache.rows = res.rows || [];
      cache.health = res.health || { count: null, latest: "", fg: 0 };
      cache.err = res.err || "";
      cache.rule = res.rule || null;
      if (res.err === "offline") {
        var host2 = $("view");
        if (host2) host2.innerHTML = '<div id="fgl-root"><div class="card"><h2>' + esc(L("title")) + "</h2><p>" + esc(L("offline")) + "</p></div></div>";
        return;
      }
      render();
    });
  }
  function markActive() {
    try {
      var nav = $("nav");
      if (!nav) return;
      nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
      var m = $("fgl-nav");
      if (m && active) m.classList.add("active");
    } catch (e) {}
  }
  function injectNav() {
    var doc = root.document;
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("fgl-nav")) return;
    if (!nav.querySelector(".navitem") && !nav.querySelector(".navlabel")) return;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "fgl-nav";
    btn.innerHTML = '<i class="navico" data-lucide="calendar-check"></i><span>FG Lots / Best-by</span>';
    btn.addEventListener("click", function (e) {
      if (root.FGLOTS && typeof root.FGLOTS.open === "function") root.FGLOTS.open(e);
      else open(e);
    });
    nav.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
  }

  var api = {
    WRITE_STOCK: WRITE_STOCK,
    SHORT_DAYS: SHORT_DAYS,
    LEGACY_DAYS: LEGACY_DAYS,
    SHELF_KEY: SHELF_KEY,
    BAGCODE_RE: BAGCODE_RE,
    open: open,
    parseShelfRule: parseShelfRule,
    pickRule: pickRule,
    shelfKeyOk: shelfKeyOk,
    monthsFor: monthsFor,
    addMonths: addMonths,
    bestByField: bestByField,
    fgLabelExp: fgLabelExp,
    daysLeft: daysLeft,
    legacyRows: legacyRows,
    palletRows: palletRows,
    mergeRegister: mergeRegister,
    filterRows: filterRows,
    toCsv: toCsv,
    healthLine: healthLine,
    ensureRule: ensureRule,
    currentRule: currentRule,
    ruleStatus: ruleStatus,
    flavorName: flavorName
  };
  root.FGLOTS = api;

  if (root.document) {
    root.document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-tool], .dept-tab") : null;
      if (!t) return;
      if (t.id === "fgl-nav") return;
      if (t.getAttribute && t.getAttribute("data-dept-tool") === "fglots") return;
      active = false;
    }, true);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      root.document.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && active) setTimeout(function () { if (active && onScreen()) render(); }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return active && onScreen(); });
    try {
      var mo = new MutationObserver(function () {
        injectNav();
        if (active && root.document.getElementById("view") && !root.document.getElementById("fgl-root")) render();
      });
      mo.observe(root.document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); });
    else setTimeout(injectNav, 400);
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

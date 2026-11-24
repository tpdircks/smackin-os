/* home-week.js  (v323)
   Home > This week. The Week section on Home. Big picture opens first.

   Top, in this order (Troy, Nov 24 2026):
     1. Bags produced this week: Mixing, P-Mac, Retail Production.
        One number and one Mon to Sun chart each.
     2. Orders out this week: Retail and E-commerce, with a daily chart.
     3. Retail order priorities with progress.
   Below: low or out finished flavors (counts and photos), receiving this week.
   Home is numbers only (v323b): no job buttons or to-do lists.

   Rules
   - Week = Monday to Sunday, America/Denver.
   - Real data only. No targets are stored, so tiles compare to the same
     days of last week. A source with no rows this week says "No data yet"
     with its latest date. Nothing is filled in or guessed.
   - Never shows past-due demand. "Due next 7 days" is due today or later.
   - Read only. Own Supabase client (same pattern as daily-metrics.js),
     paged reads, no writes, no timers.

   Sources
     Mixing             mfg_daily (mixing_15 + mixing_4, bags) when it has rows,
                        else mixing_history (total_bins, bins).
     P-Mac              pmac_history total_pkgs, dept "P-Mac" or "P.Mac" (bags).
     Retail Production  production_pallets cases, channel retail, not MINI BUCKETS
                        (same rule as daily-metrics.js). Unit is cases.
     E-com orders out   shipping_log rows from ShipStation (entered_by sync:*)
                        with status "shipped", by ship_date.
     Retail orders out  shipping_log rows logged by the team (not sync:*) plus
                        SPS 856 ship notices (sps_transactions), distinct PO by day.
*/
(function (root) {
  "use strict";
  var doc = root && root.document;
  var cfg = (root && root.SMACKIN_CONFIG) || {};
  var TZ = "America/Denver";
  var MAX_AGE_MS = 10 * 60 * 1000;

  function $(id) { return doc ? doc.getElementById(id) : null; }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList && es.classList.contains("active")) return "es";
    if (pt && pt.classList && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) { if (v == null) return ""; if (typeof v === "string") return v; return v[lang()] || v.en || ""; }
  function L(en, es, pt) { return { en: en, es: es, pt: pt || es }; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) { var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
  function fmt(n) { n = Math.round(num(n)); try { return n.toLocaleString("en-US"); } catch (e) { return String(n); } }
  function ymd(v) { return String(v || "").slice(0, 10); }
  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function addDays(iso, n) {
    var p = ymd(iso).split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function dow(iso) { var p = ymd(iso).split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function weekStart(iso) { var w = dow(iso); return addDays(iso, w === 0 ? -6 : 1 - w); }
  function denverDay(d) {
    d = d || new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
      var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
      return o.year + "-" + o.month + "-" + o.day;
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  // ISO timestamp (with zone) to the Denver calendar day. Plain dates pass through.
  function dayOfTs(v) {
    var s = String(v || "");
    if (s.length <= 10) return ymd(s);
    var d = new Date(s);
    return isNaN(d.getTime()) ? ymd(s) : denverDay(d);
  }
  var MON = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] };
  var DOW = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"], pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] };
  function dateLabel(iso, withDow) {
    if (!iso) return "";
    var p = ymd(iso).split("-");
    var l = lang();
    var m = (MON[l] || MON.en)[+p[1] - 1];
    var dd = String(+p[2]);
    var core = l === "en" ? m + " " + dd : dd + " " + m;
    return withDow ? (DOW[l] || DOW.en)[dow(iso)] + " " + core : core;
  }
  function dowShort(iso) { return (DOW[lang()] || DOW.en)[dow(iso)]; }

  // ---- words -----------------------------------------------------------------
  var W = {
    title: L("This week", "Esta semana", "Esta semana"),
    oper: L("Operational numbers, not closed books.", "Numeros operativos, no contables.", "Numeros operacionais, nao contabeis."),
    made: L("1. Bags produced this week", "1. Bolsas producidas esta semana", "1. Sacos produzidos esta semana"),
    out: L("2. Orders out this week", "2. Ordenes enviadas esta semana", "2. Pedidos enviados esta semana"),
    mixing: L("Mixing", "Mezcla", "Mistura"),
    pmac: L("P-Mac", "P-Mac", "P-Mac"),
    retailProd: L("Retail Production", "Produccion retail", "Producao varejo"),
    retailOut: L("Retail", "Retail", "Varejo"),
    ecomOut: L("E-commerce", "E-commerce", "E-commerce"),
    bags: L("bags", "bolsas", "sacos"),
    bins: L("bins", "contenedores", "caixas"),
    cases: L("cases", "cajas", "caixas"),
    orders: L("orders", "ordenes", "pedidos"),
    pos: L("POs", "POs", "POs"),
    noData: L("No data yet", "Sin datos todavia", "Sem dados ainda"),
    latest: L("Latest entry", "Ultimo registro", "Ultimo registro"),
    never: L("never", "nunca", "nunca"),
    asOf: L("as of", "al", "em"),
    lastWeek: L("Last week, same days", "Semana pasada, mismos dias", "Semana passada, mesmos dias"),
    lastWeekAll: L("Last week (Mon to Sun)", "Semana pasada (lun a dom)", "Semana passada (seg a dom)"),
    vsLast: L("of last week", "de la semana pasada", "da semana passada"),
    noCompare: L("No rows last week to compare.", "Sin datos la semana pasada para comparar.", "Sem dados na semana passada para comparar."),
    loading: L("Loading this week's numbers...", "Cargando los numeros de esta semana...", "Carregando os numeros desta semana..."),
    offline: L("Not connected to the shared database. Numbers cannot load here.", "Sin conexion a la base compartida. Los numeros no cargan aqui.", "Sem conexao com a base compartilhada. Os numeros nao carregam aqui."),
    failed: L("Could not load", "No se pudo cargar", "Nao foi possivel carregar"),
    refresh: L("Refresh", "Actualizar", "Atualizar"),
    open: L("Open", "Abrir", "Abrir"),
    low: L("Low or out: finished flavors", "Bajos o agotados: sabores terminados", "Baixos ou esgotados: sabores prontos"),
    allOk: L("All finished flavors are above reorder.", "Todos los sabores estan sobre el minimo.", "Todos os sabores estao acima do minimo."),
    outW: L("Out", "Agotado", "Esgotado"),
    lowW: L("Low", "Bajo", "Baixo"),
    onHand: L("on hand", "en stock", "em estoque"),
    recv: L("Receiving this week", "Recibido esta semana", "Recebido esta semana"),
    recvNone: L("Nothing logged as received this week.", "Nada registrado como recibido esta semana.", "Nada registrado como recebido esta semana."),
    loads: L("receipts", "recepciones", "recebimentos"),
    mixUnitNote: L("Counted in bins from mixing_history. Bag counts start when Mixing Detail is turned on.", "Contado en contenedores (mixing_history). Las bolsas empiezan cuando se active Mixing Detail.", "Contado em caixas (mixing_history). Sacos comecam quando Mixing Detail for ativado."),
    retailUnitNote: L("Retail cases from finished pallets (not mini buckets).", "Cajas retail de paletas terminadas (sin mini buckets).", "Caixas varejo de paletes prontos (sem mini buckets)."),
    detector: L("Metal detector boxes", "Cajas por detector de metal", "Caixas no detector de metal"),
    ecomNote: L("ShipStation orders marked shipped. Waiting or on hold orders are not counted.", "Ordenes de ShipStation enviadas. No cuenta las pendientes o retenidas.", "Pedidos ShipStation enviados. Pendentes ou retidos nao contam."),
    retailNote: L("Team-logged retail shipments and SPS ship notices (856), one per PO.", "Envios retail registrados por el equipo y avisos SPS (856), uno por PO.", "Envios varejo registrados pela equipe e avisos SPS (856), um por PO."),
    retailNone: L("No retail shipment logged this week. Log loads in Shipping, or check SPS.", "No hay envio retail registrado esta semana. Registre en Envios o revise SPS.", "Nenhum envio varejo registrado esta semana. Registre em Envios ou veja o SPS."),
    today: L("today", "hoy", "hoje"),
    prio: L("3. Retail order priorities", "3. Prioridades de ordenes retail", "3. Prioridades de pedidos varejo"),
    prioSub: L("Work top to bottom. A PO leaves this list by itself when it is invoiced (gone from SPS New/Open, an SPS 810 invoice, or green on the WIP PO tab). Past-due POs are not shown.", "Trabaje de arriba hacia abajo. Una PO sale sola de la lista cuando se factura (sale de SPS New/Open, tiene factura SPS 810 o queda verde en la pestana WIP PO). No se muestran las vencidas.", "Trabalhe de cima para baixo. Um PO sai sozinho da lista quando e faturado (sai do SPS New/Open, tem fatura SPS 810 ou fica verde na aba WIP PO). Atrasados nao aparecem."),
    prioRule: L("Order starts from the 11/24 priority email. New POs are slotted in by ship date (earliest first); POs with no date go last.", "El orden viene del correo de prioridades del 11/24. Las POs nuevas entran por fecha de envio (la mas pronta primero); las que no tienen fecha van al final.", "A ordem vem do email de prioridades de 11/24. POs novos entram pela data de envio (mais cedo primeiro); sem data vao por ultimo."),
    prioNone: L("No open retail POs right now.", "No hay POs retail abiertas ahora.", "Nenhum PO varejo aberto agora."),
    newPo: L("New, not on 11/24 list", "Nueva, no esta en la lista del 11/24", "Novo, fora da lista de 11/24"),
    wipTag: L("WIP order", "Orden WIP", "Pedido WIP"),
    noDate: L("No date in SPS", "Sin fecha en SPS", "Sem data no SPS"),
    due: L("due", "vence", "vence"),
    notStarted: L("Not started / no data", "Sin empezar / sin datos", "Nao iniciado / sem dados"),
    staged: L("Built, staged for pickup", "Armada, lista para recoger", "Montado, pronto para coleta"),
    progTgt: L("TARGET cases logged since", "Cajas TARGET registradas desde", "Caixas TARGET registradas desde"),
    progNote: L("Progress uses Jesus's daily retail log. Only TARGET cases name a customer, so other POs show no data until the log tags the PO.", "El avance usa el registro diario retail de Jesus. Solo las cajas TARGET dicen el cliente; las demas POs no tienen datos hasta que el registro diga la PO.", "O progresso usa o registro diario varejo do Jesus. So caixas TARGET indicam o cliente; os outros POs ficam sem dados ate o registro marcar o PO."),
    qtyWip: L("qty on WIP sheet", "cantidad en hoja WIP", "qtd na planilha WIP"),
    willcall: L("will call", "recoge el cliente", "cliente retira"),
    more: L("more", "mas", "mais")
  };

  // ---- pure model ----------------------------------------------------------------
  function isPmacDept(d) { return String(d || "").toLowerCase().replace(/[^a-z0-9]/g, "") === "pmac"; }
  function isMini(notes) { var n = String(notes || "").replace(/\s+/g, " ").trim().toUpperCase(); return n === "MINI BUCKETS" || n === "MINI BUCKET"; }
  function isRetailPallet(r) { return String(r.channel || "retail").toLowerCase() === "retail" && !isMini(r.notes); }
  function isSync(r) { return /^sync:/i.test(String(r.entered_by || "")); }
  function isShipped(r) { return String(r.status || "").toLowerCase() === "shipped"; }

  function days7(ws) { var a = []; for (var i = 0; i < 7; i++) a.push(addDays(ws, i)); return a; }
  // Build one series: this week by day, last week by day, and a total.
  function series(rows, dayFn, valFn, ws, today) {
    var cur = days7(ws), prev = days7(addDays(ws, -7));
    var idxC = {}, idxP = {};
    cur.forEach(function (d, i) { idxC[d] = i; });
    prev.forEach(function (d, i) { idxP[d] = i; });
    var c = cur.map(function () { return 0; }), p = prev.map(function () { return 0; });
    var cRows = 0, pRows = 0;
    (rows || []).forEach(function (r) {
      var d = dayFn(r);
      if (!d) return;
      var v = valFn ? valFn(r) : 1;
      if (idxC[d] != null && d <= today) { c[idxC[d]] += v; cRows++; }
      else if (idxP[d] != null) { p[idxP[d]] += v; pRows++; }
    });
    var ti = idxC[today] != null ? idxC[today] : 6;
    // Compare through today if today has output, otherwise through yesterday.
    var upto = c[ti] > 0 ? ti : ti - 1;
    var wtd = c.reduce(function (s, v) { return s + v; }, 0);
    var prevSame = 0;
    for (var i = 0; i <= upto; i++) prevSame += p[i];
    var curSame = 0;
    for (var j = 0; j <= upto; j++) curSame += c[j];
    return { days: cur, values: c, prev: p, wtd: wtd, rows: cRows, prevRows: pRows, prevSame: prevSame, curSame: curSame, uptoIdx: upto, todayIdx: ti };
  }
  function distinctPerDay(list) {
    // list: [{day, key}] -> rows with v=1 per unique (day,key)
    var seen = {}, out = [];
    list.forEach(function (x) { var k = x.day + "|" + x.key; if (!x.day || seen[k]) return; seen[k] = 1; out.push(x); });
    return out;
  }
  function tone(s) {
    if (!s.rows) return s.prevRows ? "warn" : "mute";
    if (!s.prevSame) return "info";
    var pct = (s.curSame / s.prevSame) * 100;
    return pct >= 90 ? "ok" : (pct >= 50 ? "warn" : "bad");
  }
  function maxDay(rows, f, pred) {
    var best = "";
    (rows || []).forEach(function (r) { if (pred && !pred(r)) return; var d = f(r); if (d && d > best) best = d; });
    return best;
  }

  function buildModel(raw, today) {
    raw = raw || {};
    var ws = weekStart(today);
    var lat = raw.latest || {};
    // Mixing: mfg_daily bags first; mixing_history bins as the fallback.
    var mfgRows = (raw.mfg || []).filter(function (r) { return r.mixing_15 != null || r.mixing_4 != null; });
    var mixBags = series(mfgRows, function (r) { return ymd(r.prod_date); }, function (r) { return num(r.mixing_15) + num(r.mixing_4); }, ws, today);
    var mixBins = series(raw.mixing || [], function (r) { return ymd(r.run_date); }, function (r) { return num(r.total_bins); }, ws, today);
    var mix = mixBags.rows || mixBags.prevRows || !(mixBins.rows || mixBins.prevRows) ?
      { s: mixBags, unit: "bags", source: "mfg_daily", latest: lat.mfg || "" } :
      { s: mixBins, unit: "bins", source: "mixing_history", latest: lat.mixing || "" };
    if (!mix.latest) mix.latest = [lat.mfg, lat.mixing].filter(Boolean).sort().pop() || "";
    var pmac = series((raw.pmac || []).filter(function (r) { return isPmacDept(r.dept); }), function (r) { return ymd(r.run_date); }, function (r) { return num(r.total_pkgs); }, ws, today);
    var retail = series((raw.pallets || []).filter(isRetailPallet), function (r) { return ymd(r.prod_date); }, function (r) { return num(r.cases); }, ws, today);
    var det = series(raw.days || [], function (r) { return ymd(r.prod_date); }, function (r) {
      var a = num(r.counter_start), b = num(r.counter_end); return b > a ? b - a : 0;
    }, ws, today);
    var ship = raw.ship || [];
    var ecom = series(ship.filter(function (r) { return isSync(r) && isShipped(r); }), function (r) { return ymd(r.ship_date); }, null, ws, today);
    var retailList = ship.filter(function (r) { return !isSync(r); }).map(function (r, i) {
      return { day: ymd(r.ship_date), key: String(r.po_num || "").trim() || ("row" + (r.id != null ? r.id : i)) };
    }).concat((raw.sps || []).filter(function (r) { return /^856/.test(String(r.doc_type || "")); }).map(function (r, i) {
      return { day: dayOfTs(r.received_at), key: String(r.po_number || "").trim() || ("sps" + i) };
    }));
    var retailOut = series(distinctPerDay(retailList), function (x) { return x.day; }, null, ws, today);
    var retailLatest = [lat.teamShip, lat.sps856].filter(Boolean).sort().pop() || "";
    return {
      today: today, weekStart: ws, weekEnd: addDays(ws, 6),
      made: {
        mixing: { s: mix.s, unit: mix.unit, source: mix.source, latest: mix.latest, tone: tone(mix.s), go: "mixing" },
        pmac: { s: pmac, unit: "bags", source: "pmac_history", latest: lat.pmac || "", tone: tone(pmac), go: "pmac" },
        retail: { s: retail, unit: "cases", source: "production_pallets", latest: lat.pallets || "", tone: tone(retail), go: "home:daily", detector: det }
      },
      out: {
        retail: { s: retailOut, unit: "pos", source: "shipping_log + sps_transactions 856", latest: retailLatest, tone: retailOut.rows ? tone(retailOut) : "warn", go: "outb:shiplog" },
        ecom: { s: ecom, unit: "orders", source: "shipping_log (ShipStation, shipped)", latest: lat.ecom || "", tone: tone(ecom), go: "outb:shipments" }
      },
      errors: raw.errors || []
    };
  }

  // ---- Retail order priorities ---------------------------------------------------------
  // Starting order: Troy's "Retail open order priorities, starting 11/24" list
  // (Outlook, Nov 24 2026). Only POs that are still open in live OS data show.
  // New POs that are not on that list are slotted in by ship date.
  var PRIORITY_LIST = {
    asOf: "2026-11-24",
    source: "Retail open order priorities, starting 11/24",
    pos: [
      ["Target", "10002181608"], ["Hy-Vee", "399148"], ["Bass Pro", "15006058"],
      ["McLane", "ME10149829"], ["McLane", "MK10099825"], ["McLane", "MI10108768"], ["McLane", "SW10107672"], ["McLane", "HP10077063"], ["McLane", "MW10108314"],
      ["Vistar", "88756956"], ["Vistar", "88757643"], ["KeHE", "4022836"],
      ["Target", "10002192961"], ["KeHE", "4027679"], ["KeHE", "4029157"], ["KeHE", "4034091"], ["McLane", "MD10098906"], ["Core-Mark", "0355926930"],
      ["Bass Pro", "15029008"], ["Vistar", "88760926"], ["McLane", "MP10083332"], ["McLane", "SO10091589"], ["Core-Mark", "0483290580"], ["Core-Mark", "0770817690"],
      ["Target", "10002205072"], ["Bass Pro", "15056988"], ["Core-Mark", "1401455080"], ["Core-Mark", "0533256670"],
      ["Thrifty Retail Services", "174676", "wip"], ["Lynco Products", "177505", "wip"], ["Sidelines Sports", "P000258", "wip"]
    ]
  };
  function poKey(po) {
    var s = String(po || "").toUpperCase().replace(/^\s*PO\b[\s#:\-]*/, "").replace(/^[#\-\s]+/, "").trim();
    s = s.split(/[\s\/]/)[0] || "";
    return s.split("-")[0];
  }
  function numKey(po) { var d = poKey(po).replace(/^[A-Z]+(?=\d)/, ""); return /^\d{3,}$/.test(d) ? d : ""; }
  // Manual hide list (kv_status "home:priorities:hide"): JSON array of PO numbers, or
  // {"pos": [...]}. Lets an invoiced PO come off Home with a data change, no deploy.
  function hideSet(rows) {
    var out = {};
    (rows || []).forEach(function (r) {
      var v = r && r.value;
      try { v = typeof v === "string" ? JSON.parse(v) : v; } catch (e) { v = null; }
      var list = Array.isArray(v) ? v : (v && Array.isArray(v.pos) ? v.pos : []);
      list.forEach(function (x) { var k = poKey(x), n = numKey(x); if (k) out[k] = 1; if (n) out["#" + n] = 1; });
    });
    return out;
  }
  function custKey(c) { return String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s/g, ""); }
  function mdyIso(s) {
    var m = String(s || "").match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
    if (!m) return "";
    var y = m[3].length === 2 ? "20" + m[3] : m[3];
    return y + "-" + pad(m[1]) + "-" + pad(m[2]);
  }
  // "ship 11/23/2026 - 11/24/2026" -> end of the window; "ship 11/26/2026; deliver ..." -> ship day.
  function shipWindow(text) {
    var t = String(text || "").trim();
    if (!/^ship\b/i.test(t)) return null;
    var m = t.match(/^ship\s+([\d\/]+)(?:\s*-\s*([\d\/]+))?/i);
    if (!m) return null;
    return { from: mdyIso(m[1]), to: mdyIso(m[2] || m[1]), text: t };
  }
  function buildPriorities(raw, today) {
    raw = raw || {};
    var ws = weekStart(today);
    var orders = raw.orders || [];
    var complete = {}, ordInfo = {}, doneInv = {}, doneNum = {};
    orders.forEach(function (o) {
      var st = String(o.status || "");
      if (st === "Complete") { // green on the WIP PO tab = invoiced
        var n0 = numKey(o.customer_po);
        if (n0) doneNum[n0] = 1;
        if (o.order_id) doneInv[String(o.order_id).trim().toUpperCase()] = 1;
      }
      var k = poKey(o.customer_po);
      if (!k) return;
      if (st === "Complete") complete[k] = 1;
      if (st !== "Open") return;
      var w = shipWindow(o.ship_date);
      var cur = ordInfo[k] || (ordInfo[k] = { win: null });
      if (w && (!cur.win || w.to > cur.win.to)) cur.win = w;
    });
    var inv810 = {};
    (raw.invoices || []).forEach(function (t) {
      if (!/^810/.test(String(t.doc_type || ""))) return;
      var k = poKey(t.po_number), n = numKey(t.po_number);
      if (k) inv810[k] = 1; if (n) inv810["#" + n] = 1;
    });
    var manual = hideSet(raw.hide);
    var hidden = { pastDue: [], invoiced: [], sps810: [], manual: [] };
    function done(r, alias) {
      var keys = [r.key].concat(alias || []);
      var nums = keys.map(numKey).filter(Boolean);
      var hit = function (set) { return keys.some(function (k) { return set[k]; }) || nums.some(function (n) { return set["#" + n]; }); };
      if (keys.some(function (k) { return complete[k]; }) || nums.some(function (n) { return doneNum[n]; }) || (r.inv && doneInv[r.inv])) { hidden.invoiced.push(r.key); return true; }
      if (hit(inv810)) { hidden.sps810.push(r.key); return true; }
      if (hit(manual)) { hidden.manual.push(r.key); return true; }
      return false;
    }
    var staged = {};
    (raw.stage || []).forEach(function (s) { var k = poKey(s.po); if (k) staged[k] = s; });
    // SPS demand, one row per PO
    var by = {};
    (raw.demand || []).forEach(function (d) {
      if (String(d.status || "Open") !== "Open") return;
      var k = poKey(d.po);
      if (!k) return;
      var r = by[k] || (by[k] = { key: k, po: k, customer: String(d.partner || ""), cases: 0, bags: 0, due: "", kind: "sps", target: /target/i.test(String(d.partner || "")) });
      r.cases += num(d.cases);
      r.bags += num(d.bags);
      var due = mdyIso(d.due_date) || (/^\d{4}-\d{2}-\d{2}/.test(String(d.due_date || "")) ? ymd(d.due_date) : "");
      if (due && (!r.due || due < r.due)) r.due = due;
    });
    // WIP PO tab orders (Stripe invoiced, not in SPS): open, with a Stripe link, added in the last 14 days or on the list.
    var seedWip = {};
    PRIORITY_LIST.pos.forEach(function (p) { if (p[2] === "wip") seedWip[custKey(p[0])] = p; });
    var wip = {};
    orders.forEach(function (o) {
      if (String(o.status || "") !== "Open") return;
      var ck = custKey(o.customer);
      if (!ck) return;
      var created = dayOfTs(o.created_at);
      var seed = seedWip[ck];
      if (!o.stripe_link && !seed) return;
      if (!seed && !(created && created >= addDays(today, -14))) return;
      var k = poKey(o.customer_po) || (seed ? seed[1] : "") || ck;
      if (seed) k = seed[1];
      var r = wip[k] || (wip[k] = { key: k, po: k, customer: seed ? seed[0] : String(o.customer || ""), cases: null, bags: null, due: "", kind: "wip", lines: 0, note: "", inv: "", alias: [] });
      if (o.order_id && !r.inv) r.inv = String(o.order_id).trim().toUpperCase();
      var pk = poKey(o.customer_po);
      if (pk && pk !== k && r.alias.indexOf(pk) < 0) r.alias.push(pk);
      r.lines++;
      var nd = mdyIso(o.notes);
      if (nd && (!r.due || nd < r.due)) r.due = nd;
      if (!r.note && /will\s*call/i.test(String(o.notes || ""))) r.note = "willcall";
    });
    var all = [];
    Object.keys(by).forEach(function (k) { if (!done(by[k])) all.push(by[k]); });
    Object.keys(wip).forEach(function (k) { if (!by[k] && !done(wip[k], wip[k].alias)) all.push(wip[k]); });
    var rows = [];
    all.forEach(function (r) {
      var oi = ordInfo[r.key];
      r.win = oi && oi.win ? oi.win : null;
      r.eff = r.win ? r.win.to : r.due;
      if (r.eff && r.eff < today) { hidden.pastDue.push(r.key); return; }      // never past due
      if (r.target && r.eff && r.eff < ws) { hidden.pastDue.push(r.key); return; } // no Target PO older than this week
      r.staged = staged[r.key] || null;
      rows.push(r);
    });
    // rank: list order first, then new POs slotted in by ship date
    var seedIdx = {};
    PRIORITY_LIST.pos.forEach(function (p, i) { seedIdx[p[2] === "wip" ? p[1] : poKey(p[1])] = { i: i, customer: p[0] }; });
    var seeded = rows.filter(function (r) { return seedIdx[r.key]; }).sort(function (a, b) { return seedIdx[a.key].i - seedIdx[b.key].i; });
    seeded.forEach(function (r) { r.customer = seedIdx[r.key].customer; r.isNew = false; });
    var fresh = rows.filter(function (r) { return !seedIdx[r.key]; }).sort(function (a, b) {
      if (a.eff && b.eff) return a.eff < b.eff ? -1 : a.eff > b.eff ? 1 : (b.bags || 0) - (a.bags || 0);
      return a.eff ? -1 : b.eff ? 1 : 0;
    });
    var out = seeded.slice();
    fresh.forEach(function (r) {
      r.isNew = true;
      var at = out.length;
      if (r.eff) for (var i = 0; i < out.length; i++) { if (out[i].eff && out[i].eff > r.eff) { at = i; break; } }
      out.splice(at, 0, r);
    });
    // progress from the daily retail log (production_pallets). Only TARGET-tagged
    // cases name a customer, so only Target POs can be measured. Cases count from
    // the day after the last Target load left, filled in rank order.
    var lastTargetDone = "";
    orders.forEach(function (o) {
      if (String(o.status || "") !== "Complete" || !/target/i.test(String(o.customer || ""))) return;
      var w = shipWindow(o.ship_date);
      if (w && w.to > lastTargetDone) lastTargetDone = w.to;
    });
    var tgtFrom = lastTargetDone ? addDays(lastTargetDone, 1) : "";
    var tgtCases = 0;
    (raw.palletsLong || []).forEach(function (p) {
      if (String(p.notes || "").trim().toUpperCase() !== "TARGET") return;
      var d = ymd(p.prod_date);
      if (tgtFrom && d >= tgtFrom && d <= today) tgtCases += num(p.cases);
    });
    var pool = tgtFrom ? tgtCases : 0;
    out.forEach(function (r, i) {
      r.rank = i + 1;
      if (r.staged) { r.prog = { pct: 100, kind: "staged" }; return; }
      if (r.target && tgtFrom && r.cases > 0) {
        var got = Math.min(pool, r.cases);
        pool -= got;
        r.prog = got > 0 ? { pct: (got / r.cases) * 100, kind: "target", got: got, need: r.cases, from: tgtFrom } : { pct: 0, kind: "none" };
        return;
      }
      r.prog = { pct: 0, kind: "none" };
    });
    return { rows: out, hidden: hidden, targetFrom: tgtFrom, targetCases: tgtCases, list: PRIORITY_LIST };
  }

  // ---- reads (read only) -----------------------------------------------------------
  var sb = null;
  function client() {
    if (sb) return sb;
    if (!root || !root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
    return sb;
  }
  function fetchRange(table, cols, dateCol, from, to, filter) {
    var c = client();
    if (!c) return Promise.reject(new Error("no client"));
    var all = [], step = 1000;
    function page(off) {
      var q = c.from(table).select(cols).gte(dateCol, from).lte(dateCol, to);
      if (filter) q = filter(q);
      return q.order(dateCol, { ascending: true }).range(off, off + step - 1).then(function (r) {
        if (r && r.error) throw new Error(table + ": " + (r.error.message || "error"));
        var rows = (r && r.data) || [];
        all = all.concat(rows);
        return rows.length === step ? page(off + step) : all;
      });
    }
    return page(0);
  }
  function pagedQuery(make, name) {
    var all = [], step = 1000;
    function page(off) {
      return make().range(off, off + step - 1).then(function (r) {
        if (r && r.error) throw new Error(name + ": " + (r.error.message || "error"));
        var rows = (r && r.data) || [];
        all = all.concat(rows);
        return rows.length === step ? page(off + step) : all;
      });
    }
    return page(0);
  }
  function fetchEq(table, cols, col, val) {
    var c = client();
    if (!c) return Promise.reject(new Error("no client"));
    return pagedQuery(function () { return c.from(table).select(cols).eq(col, val).order("po", { ascending: true }); }, table);
  }
  function fetchKv(key) {
    var c = client();
    if (!c) return Promise.reject(new Error("no client"));
    return c.from("kv_status").select("key,value").eq("key", key).limit(1).then(function (r) {
      if (r && r.error) throw new Error("kv_status: " + (r.error.message || "error"));
      return (r && r.data) || [];
    });
  }
  function fetchAll(table, cols) {
    var c = client();
    if (!c) return Promise.reject(new Error("no client"));
    return pagedQuery(function () { return c.from(table).select(cols); }, table);
  }
  function fetchLatest(table, cols, orderCol, filter) {
    var c = client();
    if (!c) return Promise.resolve([]);
    var q = c.from(table).select(cols);
    if (filter) q = filter(q);
    return q.order(orderCol, { ascending: false }).limit(25).then(function (r) {
      if (r && r.error) throw new Error(table + ": " + (r.error.message || "error"));
      return (r && r.data) || [];
    });
  }
  function settled(p, name) {
    return p.then(function (rows) { return { ok: true, rows: rows || [] }; }, function (e) { return { ok: false, rows: [], err: name + ": " + ((e && e.message) || e) }; });
  }
  function load(today) {
    var ws = weekStart(today);
    // Last week for the comparison, and at least 14 days for the P-Mac chart.
    var from = addDays(ws, -7);
    if (addDays(today, -13) < from) from = addDays(today, -13);
    var jobs = [
      settled(fetchRange("mfg_daily", "prod_date,mixing_15,mixing_4,unit", "prod_date", from, today), "mfg_daily"),
      settled(fetchRange("mixing_history", "run_date,total_bins", "run_date", from, today), "mixing_history"),
      settled(fetchRange("pmac_history", "run_date,dept,total_pkgs", "run_date", from, today), "pmac_history"),
      settled(fetchRange("production_pallets", "prod_date,channel,cases,notes", "prod_date", from, today), "production_pallets"),
      settled(fetchRange("production_days", "prod_date,counter_start,counter_end", "prod_date", from, today), "production_days"),
      settled(fetchRange("shipping_log", "id,ship_date,entered_by,status,po_num", "ship_date", from, today), "shipping_log"),
      settled(fetchRange("sps_transactions", "doc_type,po_number,received_at", "received_at", from, today + "T23:59:59"), "sps_transactions"),
      settled(fetchLatest("mfg_daily", "prod_date", "prod_date"), "mfg_daily latest"),
      settled(fetchLatest("mixing_history", "run_date", "run_date"), "mixing_history latest"),
      settled(fetchLatest("pmac_history", "run_date,dept", "run_date"), "pmac_history latest"),
      settled(fetchLatest("production_pallets", "prod_date", "prod_date"), "production_pallets latest"),
      settled(fetchLatest("shipping_log", "ship_date", "ship_date", function (q) { return q.like("entered_by", "sync:%").eq("status", "shipped"); }), "ecom latest"),
      settled(fetchLatest("shipping_log", "ship_date", "ship_date", function (q) { return q.not("entered_by", "like", "sync:%"); }), "team ship latest"),
      settled(fetchLatest("sps_transactions", "received_at", "received_at", function (q) { return q.like("doc_type", "856%"); }), "sps 856 latest"),
      settled(fetchEq("demand_lines", "partner,po,cases,bags,due_date,status,source", "status", "Open"), "demand_lines"),
      settled(fetchRange("orders", "customer,customer_po,order_id,ship_date,status,stripe_link,notes,created_at", "created_at", addDays(today, -60), today + "T23:59:59"), "orders"),
      settled(fetchAll("demand_po_stage", "partner,po,pickup_date,note,updated_at"), "demand_po_stage"),
      settled(fetchRange("production_pallets", "prod_date,channel,cases,notes", "prod_date", addDays(today, -30), today), "production_pallets 30d"),
      settled(fetchRange("sps_transactions", "doc_type,po_number,received_at", "received_at", addDays(today, -90), today + "T23:59:59", function (q) { return q.like("doc_type", "810%"); }), "sps 810"),
      settled(fetchKv("home:priorities:hide"), "priorities hide")
    ];
    return Promise.all(jobs).then(function (p) {
      var errs = p.filter(function (x) { return !x.ok; }).map(function (x) { return x.err; });
      return {
        mfg: p[0].rows, mixing: p[1].rows, pmac: p[2].rows, pallets: p[3].rows, days: p[4].rows, ship: p[5].rows, sps: p[6].rows,
        latest: {
          mfg: maxDay(p[7].rows, function (r) { return ymd(r.prod_date); }),
          mixing: maxDay(p[8].rows, function (r) { return ymd(r.run_date); }),
          pmac: maxDay(p[9].rows, function (r) { return ymd(r.run_date); }, function (r) { return isPmacDept(r.dept); }),
          pallets: maxDay(p[10].rows, function (r) { return ymd(r.prod_date); }),
          ecom: maxDay(p[11].rows, function (r) { return ymd(r.ship_date); }),
          teamShip: maxDay(p[12].rows, function (r) { return ymd(r.ship_date); }),
          sps856: maxDay(p[13].rows, function (r) { return dayOfTs(r.received_at); })
        },
        demand: p[14].rows, orders: p[15].rows, stage: p[16].rows, palletsLong: p[17].rows,
        invoices: p[18].rows, hide: p[19].rows,
        errors: errs
      };
    });
  }

  var state = { raw: null, at: 0, loading: false, err: "", model: null, day: "" };
  function repaint() {
    try {
      if ($("hw-root") && root.SIMPLE_HOME && typeof root.SIMPLE_HOME.render === "function") root.SIMPLE_HOME.render();
    } catch (e) {}
  }
  function ensure(force) {
    var t = denverDay();
    var stale = !state.raw || state.day !== t || (Date.now() - state.at > MAX_AGE_MS);
    if (state.loading || (!force && !stale)) return;
    if (!client()) { state.err = "offline"; return; }
    state.loading = true;
    load(t).then(function (raw) {
      state.raw = raw; state.at = Date.now(); state.day = t; state.loading = false; state.err = "";
      state.model = buildModel(raw, t);
      state.prio = buildPriorities(raw, t);
      repaint();
    }, function (e) {
      state.loading = false; state.err = (e && e.message) || String(e);
      repaint();
    });
  }
  // Tests and screenshots hand in a snapshot instead of reading the database.
  function inject(raw, today) {
    var t = today || denverDay();
    state.raw = raw; state.at = Date.now(); state.day = t; state.loading = false; state.err = "";
    state.model = buildModel(raw, t);
    state.prio = buildPriorities(raw, t);
    return state.model;
  }
  function model() { return state.model; }
  // P-Mac bags per Denver day for smk-viz (dashboard and Production steps).
  // Replaces the old production_output read, which stopped on Nov 9 2026.
  function pmacDaily(days) {
    ensure(false);
    var t = denverDay(), list = [], idx = {};
    for (var i = days - 1; i >= 0; i--) { var d = addDays(t, -i); idx[d] = list.length; list.push({ day: d, v: 0 }); }
    var rows = (state.raw && state.raw.pmac) || [];
    rows.forEach(function (r) { if (!isPmacDept(r.dept)) return; var d = ymd(r.run_date); if (idx[d] != null) list[idx[d]].v += num(r.total_pkgs); });
    return { days: list, loaded: !!state.raw, latest: (state.raw && state.raw.latest && state.raw.latest.pmac) || "" };
  }

  // ---- drawing ------------------------------------------------------------------------
  function H() { return (root.SMK_VIZ && root.SMK_VIZ._h) || {}; }
  var COL = { ok: "#1a9e5a", warn: "#e0a100", bad: "#d64545", info: "#006DB6", mute: "#9aa5b1", orange: "#F26B21" };
  function goAttr(go) { return go ? ' data-smk-go="' + esc(go) + '" role="button" tabindex="0"' : ""; }
  function unitWord(u) { return tx(W[u] || W.bags); }
  function weekChart(s, color, aria) {
    var data = s.days.map(function (d, i) {
      var future = i > s.todayIdx;
      return { label: dowShort(d), sub: i === s.todayIdx ? tx(W.today) : "", v: future ? 0 : s.values[i], tone: future ? "mute" : (i === s.todayIdx ? "orange" : color) };
    });
    var h = H();
    if (h.columns) return h.columns(data, { h: 118, w: 300, aria: aria });
    return "";
  }
  function compareLine(s) {
    if (!s.rows) return "";
    if (!s.prevSame) return '<div class="hw-cmp">' + esc(tx(W.noCompare)) + "</div>";
    var pct = Math.round((s.curSame / s.prevSame) * 100);
    return '<div class="hw-cmp">' + esc(tx(W.lastWeek)) + ": <b>" + esc(fmt(s.prevSame)) + "</b> (" + esc(pct + "% " + tx(W.vsLast)) + ")</div>";
  }
  function latestLine(t) {
    return '<div class="hw-asof">' + esc(tx(W.latest)) + ": " + esc(t.latest ? dateLabel(t.latest, true) : tx(W.never)) + "</div>";
  }
  function bigTile(label, t, note, extra) {
    var s = t.s, has = s.rows > 0;
    var body = has ?
      '<div class="hw-n">' + esc(fmt(s.wtd)) + ' <small>' + esc(unitWord(t.unit)) + "</small></div>" + compareLine(s) +
        '<div class="hw-chart">' + weekChart(s, "info", label + " per day") + "</div>" :
      '<div class="hw-n hw-none">' + esc(tx(W.noData)) + "</div>" +
        '<div class="hw-cmp">' + esc(s.prevRows ? tx(W.lastWeekAll) + ": " + fmt(s.prev.reduce(function (a, b) { return a + b; }, 0)) + " " + unitWord(t.unit) : "") + "</div>";
    return '<div class="hw-tile hw-' + t.tone + '"' + goAttr(t.go) + ' data-hw="' + esc(label) + '">' +
      '<div class="hw-tl"><span class="hw-dot"></span>' + esc(label) + "</div>" + body + latestLine(t) +
      (note ? '<div class="hw-note">' + esc(note) + "</div>" : "") + (extra || "") + "</div>";
  }
  function stamp(m) {
    var range = dateLabel(m.weekStart, true) + " - " + dateLabel(m.weekEnd, true);
    return '<span class="hw-stamp">' + esc(range) + " &middot; " + esc(tx(W.oper)) + " " + esc(tx(W.asOf)) + " " + esc(clock()) + " MT</span>";
  }
  function clock() {
    var d = state.at ? new Date(state.at) : new Date();
    try { return dateLabel(denverDay(d)) + ", " + new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d); } catch (e) { return ""; }
  }

  function prioDate(r) {
    if (r.win) return r.win.from && r.win.to && r.win.from !== r.win.to ? tx(L("ship", "envio", "envio")) + " " + dateLabel(r.win.from) + " - " + dateLabel(r.win.to) : tx(L("ship", "envio", "envio")) + " " + dateLabel(r.win.to);
    if (r.due) return tx(W.due) + " " + dateLabel(r.due, true);
    return tx(W.noDate);
  }
  function prioBar(r) {
    var p = r.prog || { kind: "none", pct: 0 };
    if (p.kind === "none") return '<div class="hw-pbar hw-pnone"><div class="hw-pt"></div><span>' + esc(tx(W.notStarted)) + "</span></div>";
    var pct = Math.max(0, Math.min(100, p.pct));
    var col = pct >= 100 ? COL.ok : (pct >= 50 ? COL.info : COL.warn);
    var label = p.kind === "staged" ? tx(W.staged) : fmt(p.got) + " / " + fmt(p.need) + " " + tx(W.cases) + " (" + Math.round(pct) + "%)";
    var title = p.kind === "target" ? tx(W.progTgt) + " " + dateLabel(p.from) : "";
    return '<div class="hw-pbar"' + (title ? ' title="' + esc(title) + '"' : "") + '><div class="hw-pt"><div style="width:' + pct.toFixed(1) + "%;background:" + col + '"></div></div><span>' + esc(label) + "</span></div>";
  }
  function prioritiesHtml() {
    var P = state.prio;
    if (!P) return "";
    var rows = P.rows || [];
    var LIMIT = 12;
    var body = rows.length ? '<ol class="hw-prio">' + rows.slice(0, LIMIT).map(function (r) {
      var qty = r.kind === "wip" ? tx(W.qtyWip) : fmt(r.cases) + " " + tx(W.cases) + " / " + fmt(r.bags) + " " + tx(W.bags);
      var tags = (r.isNew ? '<em class="hw-tag hw-tnew">' + esc(tx(W.newPo)) + "</em>" : "") +
        (r.kind === "wip" ? '<em class="hw-tag">' + esc(tx(W.wipTag)) + "</em>" : "") +
        (r.note === "willcall" ? '<em class="hw-tag">' + esc(tx(W.willcall)) + "</em>" : "");
      return '<li class="hw-pr' + (r.rank <= 3 ? " hw-ptop" : "") + '"><span class="hw-rk">' + r.rank + "</span>" +
        '<div class="hw-pm"><div class="hw-p1"><b>' + esc(r.customer) + '</b> <span class="hw-po">PO ' + esc(r.po) + "</span>" + tags + "</div>" +
        '<div class="hw-p2">' + esc(prioDate(r)) + " &middot; " + esc(qty) + "</div>" + prioBar(r) + "</div></li>";
    }).join("") + "</ol>" + (rows.length > LIMIT ? '<p class="hw-sub">+' + (rows.length - LIMIT) + " " + esc(tx(W.more)) + "</p>" : "") :
      '<p class="hw-sub">' + esc(tx(W.prioNone)) + "</p>";
    return '<div class="hw-block hw-prio-b" id="hw-prio"><div class="hw-ch"><h3>' + esc(tx(W.prio)) + '</h3><button type="button" class="hw-open" data-smk-go="demand:demandboard">' + esc(tx(W.open)) + " &rsaquo;</button></div>" +
      '<p class="hw-sub">' + esc(tx(W.prioSub)) + "</p>" + '<p class="hw-sub"><b>' + esc(tx(W.prioRule)) + "</b></p>" + body +
      '<p class="hw-note">' + esc(tx(W.progNote)) + "</p></div>";
  }

  function topHtml() {
    styleOnce();
    ensure(false);
    var m = state.model;
    var head = '<div class="hw-head"><h2>' + esc(tx(W.title)) + "</h2>" + (m ? stamp(m) : "") +
      '<button type="button" class="hw-ref" data-hw-refresh="1">' + esc(tx(W.refresh)) + "</button></div>";
    if (!m) {
      var msg = state.err === "offline" ? tx(W.offline) : (state.err ? tx(W.failed) + ": " + state.err : tx(W.loading));
      return '<section id="hw-root" class="hw">' + head + '<p class="hw-msg">' + esc(msg) + "</p></section>";
    }
    var mk = m.made, o = m.out;
    var det = mk.retail.detector;
    var detLine = det && det.rows ? '<div class="hw-note">' + esc(tx(W.detector)) + ": <b>" + esc(fmt(det.wtd)) + "</b></div>" : "";
    var made = '<div class="hw-block"><h3>' + esc(tx(W.made)) + '</h3><div class="hw-grid hw-g3">' +
      bigTile(tx(W.mixing), mk.mixing, mk.mixing.unit === "bins" ? tx(W.mixUnitNote) : "") +
      bigTile(tx(W.pmac), mk.pmac, "") +
      bigTile(tx(W.retailProd), mk.retail, tx(W.retailUnitNote), detLine) + "</div></div>";
    var out = '<div class="hw-block"><h3>' + esc(tx(W.out)) + '</h3><div class="hw-grid hw-g2">' +
      bigTile(tx(W.retailOut), o.retail, o.retail.s.rows ? tx(W.retailNote) : tx(W.retailNone)) +
      bigTile(tx(W.ecomOut), o.ecom, tx(W.ecomNote)) + "</div></div>";
    var err = m.errors && m.errors.length ? '<p class="hw-msg">' + esc(tx(W.failed) + ": " + m.errors.join("; ")) + "</p>" : "";
    return '<section id="hw-root" class="hw">' + head + made + out + prioritiesHtml() + err + "</section>";
  }

  // ---- below the fold (uses the app's loaded tables) ---------------------------------------
  function arr(fn) { try { var v = fn(); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function lowFlavors() {
    var rows = [];
    arr(function () { return root.DB.items(); }).forEach(function (it) {
      var cat = String(it.category || "");
      if (cat !== "bag4" && cat !== "bag15") return;
      var r = num(it.reorder);
      if (!(r > 0)) return;
      var q = 0; try { q = num(root.DB.onHand(it.id)); } catch (e) {}
      if (q >= r) return;
      rows.push({ id: it.id, code: it.code || it.id, name: it.name || it.flavor || it.code, q: q, r: r, out: q <= 0 });
    });
    rows.sort(function (a, b) { return (b.out - a.out) || (a.q / a.r - b.q / b.r); });
    return rows;
  }
  function isoOf(s) {
    var v = String(s || "").trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    var m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + pad(m[1]) + "-" + pad(m[2]); }
    return "";
  }
  function receivedThisWeek(ws, today) {
    var rows = arr(function () { return root.DB.receivingLog(); });
    var n = 0, latest = "";
    rows.forEach(function (r) { var d = isoOf(r.recv_date); if (d > latest) latest = d; if (d >= ws && d <= today) n++; });
    return { n: n, latest: latest };
  }
  function imgFor(code) {
    try { return code && root.SMK_INV_VISUAL && root.SMK_INV_VISUAL.imgFor ? root.SMK_INV_VISUAL.imgFor(code) || "" : ""; } catch (e) { return ""; }
  }
  function card(title, sub, body, go) {
    return '<section class="hw-card"><div class="hw-ch"><h3>' + esc(title) + "</h3>" +
      (go ? '<button type="button" class="hw-open" data-smk-go="' + esc(go) + '">' + esc(tx(W.open)) + " &rsaquo;</button>" : "") + "</div>" +
      (sub ? '<p class="hw-sub">' + esc(sub) + "</p>" : "") + body + "</section>";
  }
  // Below the week blocks: stock as numbers (with photos), and receiving this week.
  // No to-do lists here (Troy, Nov 24: Home is numbers only).
  function belowHtml() {
    styleOnce();
    var today = denverDay(), ws = weekStart(today);
    var low = lowFlavors();
    var nOut = low.filter(function (r) { return r.out; }).length, nLow = low.length - nOut;
    var counts = '<div class="hw-stk2"><div class="hw-sn hw-sbad"><b>' + esc(fmt(nOut)) + "</b><span>" + esc(tx(W.outW)) + '</span></div><div class="hw-sn hw-swarn"><b>' + esc(fmt(nLow)) + "</b><span>" + esc(tx(W.lowW)) + "</span></div></div>";
    var lowBody = counts + (low.length ? '<div class="hw-flv">' + low.slice(0, 8).map(function (r) {
      var src = imgFor(r.code);
      return '<div class="hw-f ' + (r.out ? "hw-fout" : "hw-flow") + '">' +
        (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '<span class="hw-noimg"></span>') +
        '<div><b>' + esc(r.name) + '</b><span>' + esc(r.out ? tx(W.outW) : tx(W.lowW)) + " &middot; " + esc(fmt(r.q)) + " " + esc(tx(W.onHand)) + "</span></div></div>";
    }).join("") + "</div>" + (low.length > 8 ? '<p class="hw-sub">+' + (low.length - 8) + " " + esc(tx(W.more)) + "</p>" : "") : '<p class="hw-sub">' + esc(tx(W.allOk)) + "</p>");
    var rc = receivedThisWeek(ws, today);
    var recvBody = '<div class="hw-n hw-n2">' + esc(fmt(rc.n)) + " <small>" + esc(tx(W.loads)) + "</small></div>" +
      (rc.n ? "" : '<p class="hw-sub">' + esc(tx(W.recvNone)) + "</p>") +
      '<div class="hw-asof">' + esc(tx(W.latest)) + ": " + esc(rc.latest ? dateLabel(rc.latest, true) : tx(W.never)) + "</div>";
    return '<div class="hw hw-below"><div class="hw-grid hw-g2b">' +
      card(tx(W.low), "", lowBody, "inv:alerts") +
      card(tx(W.recv), "", recvBody, "inb") + "</div></div>";
  }

  var CSS = [
    ".hw{display:flex;flex-direction:column;gap:12px}",
    ".hw-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;background:#04223B;color:#fff;border-radius:10px;padding:12px 16px}",
    ".hw-head h2{margin:0;font-size:24px;color:#fff}",
    ".hw-stamp{font-size:13px;color:#cfe3f5;flex:1}",
    ".hw-ref{font:inherit;font-size:13px;font-weight:700;background:#fff;color:#04223B;border:0;border-radius:6px;padding:6px 10px;cursor:pointer}",
    ".hw-msg{margin:0;background:#fff7e6;border:1px solid #f3c77a;border-radius:8px;padding:8px 12px;font-size:14px;color:#7a4b00}",
    ".hw-block h3{margin:4px 0 8px;font-size:18px;color:#04223B}",
    ".hw-grid{display:grid;gap:12px}",
    ".hw-g2b{grid-template-columns:3fr 1fr}",
    ".hw-stk2{display:flex;gap:10px;margin:6px 0}.hw-sn{border-radius:8px;padding:6px 12px;display:flex;align-items:baseline;gap:6px}.hw-sn b{font-size:28px;font-weight:900}.hw-sn span{font-size:13px;font-weight:700}",
    ".hw-sbad{background:#fdeaea;color:#a12a2a}.hw-swarn{background:#fff6dc;color:#7a5600}",
    ".hw-g3{grid-template-columns:repeat(3,1fr)}.hw-g2{grid-template-columns:repeat(2,1fr)}.hw-g3b{grid-template-columns:1.3fr 1.3fr 0.8fr}",
    ".hw-tile{background:#fff;border:1px solid #d7dde6;border-top:6px solid #9aa5b1;border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;gap:4px;min-width:0}",
    ".hw-tile:hover{box-shadow:0 2px 8px rgba(4,34,59,.15)}",
    ".hw-ok{border-top-color:#1a9e5a}.hw-warn{border-top-color:#e0a100}.hw-bad{border-top-color:#d64545}.hw-info{border-top-color:#006DB6}.hw-mute{border-top-color:#9aa5b1}",
    ".hw-tl{font-size:15px;font-weight:800;color:#04223B;display:flex;align-items:center;gap:8px}",
    ".hw-dot{width:12px;height:12px;border-radius:50%;background:#9aa5b1;display:inline-block}",
    ".hw-ok .hw-dot{background:#1a9e5a}.hw-warn .hw-dot{background:#e0a100}.hw-bad .hw-dot{background:#d64545}.hw-info .hw-dot{background:#006DB6}",
    ".hw-n{font-size:40px;font-weight:900;color:#04223B;line-height:1.05}",
    ".hw-n small{font-size:16px;font-weight:700;color:#4b5563}",
    ".hw-n2{font-size:32px}",
    ".hw-none{font-size:24px;color:#6b7280;padding:8px 0}",
    ".hw-cmp{font-size:13px;color:#374151;min-height:16px}",
    ".hw-asof{font-size:12px;color:#6b7280}",
    ".hw-note{font-size:12px;color:#4b5563}",
    ".hw-chart svg{width:100%;height:120px;display:block}",
    ".hw-dim{opacity:.45}",
    ".hw-card{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 14px;min-width:0}",
    ".hw-ch{display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".hw-ch h3{margin:0;font-size:16px;color:#04223B}",
    ".hw-open{font:inherit;font-size:13px;font-weight:700;color:#006DB6;background:none;border:1px solid #c5d3e2;border-radius:6px;padding:4px 8px;cursor:pointer}",
    ".hw-sub{margin:4px 0;font-size:13px;color:#4b5563}",
    ".hw-flv{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-top:8px}",
    ".hw-f{display:flex;gap:8px;align-items:center;border-radius:8px;padding:6px;border:1px solid #eee}",
    ".hw-f img,.hw-noimg{width:40px;height:40px;object-fit:contain;border-radius:6px;background:#f3f4f6;flex:0 0 40px}",
    ".hw-f b{display:block;font-size:13px;color:#04223B;line-height:1.2}",
    ".hw-f span{font-size:12px;color:#4b5563}",
    ".hw-fout{background:#fdeaea;border-color:#f1b3b3}.hw-flow{background:#fff6dc;border-color:#f0d58a}",
    ".hw-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}",
    ".hw-tbl td{padding:5px 4px;border-bottom:1px solid #eef1f5}.hw-tbl .r{text-align:right;white-space:nowrap}",
    ".hw-prio-b{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:12px 14px}",
    ".hw-prio{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}",
    ".hw-pr{display:flex;gap:10px;align-items:flex-start;border:1px solid #e3e8ef;border-radius:8px;padding:8px 10px;min-width:0}",
    ".hw-ptop{border-color:#F26B21;background:#fffaf6}",
    ".hw-rk{flex:0 0 30px;height:30px;border-radius:50%;background:#04223B;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}",
    ".hw-ptop .hw-rk{background:#F26B21}",
    ".hw-pm{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}",
    ".hw-p1{font-size:15px;color:#04223B}.hw-po{font-size:13px;color:#4b5563}",
    ".hw-p2{font-size:13px;color:#374151}",
    ".hw-tag{font-style:normal;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;margin-left:6px;background:#eef2f7;color:#374151;white-space:nowrap}",
    ".hw-tnew{background:#e6f1fb;color:#004f86}",
    ".hw-pbar{display:flex;align-items:center;gap:8px;font-size:12px;color:#374151}",
    ".hw-pt{flex:1;height:10px;background:#eef1f5;border-radius:5px;overflow:hidden}.hw-pt>div{height:100%}",
    ".hw-pnone span{color:#6b7280;font-style:italic}",
    "@media(max-width:1000px){.hw-prio{grid-template-columns:1fr}}",
    "@media(max-width:1000px){.hw-g3,.hw-g3b{grid-template-columns:1fr 1fr}.hw-g2b{grid-template-columns:1fr}}",
    "@media(max-width:640px){.hw-g3,.hw-g2,.hw-g3b,.hw-g2b{grid-template-columns:1fr}.hw-n{font-size:34px}}"
  ].join("\n");
  function styleOnce() {
    if (!doc || $("hw-style")) return;
    var s = doc.createElement("style");
    s.id = "hw-style";
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }
  if (doc && doc.addEventListener) {
    doc.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-hw-refresh]") : null;
      if (!b) return;
      e.preventDefault();
      ensure(true);
      repaint();
    });
  }

  var api = {
    top: topHtml, below: belowHtml, ensure: ensure, inject: inject, model: model, pmacDaily: pmacDaily,
    forTest: { buildModel: buildModel, buildPriorities: buildPriorities, poKey: poKey, shipWindow: shipWindow, PRIORITY_LIST: PRIORITY_LIST, weekStart: weekStart, addDays: addDays, denverDay: denverDay, dayOfTs: dayOfTs, series: series, isoOf: isoOf, lowFlavors: lowFlavors, W: W }
  };
  if (root) root.HOME_WEEK = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);

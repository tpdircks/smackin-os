/* ============================================================================
   E-com lot log  (ecom-lot-log.js)  b=1
   Day rollup of bags fulfillment pulled to e-com, built from trace_events.
   No new table. No stock write. WRITE_STOCK stays off. This file does not
   move inventory and does not create an E-com pick zone.

   A lot stays in the e-com window from its pull day through the day it is
   marked out of pick (event type ECOM_OUT). Another lot of the same flavor
   and size does not close it, so more than one lot can be in pick at once.
   The day comparison is trace-recall.js inWindow: the out-of-pick day is
   included, and the next calendar day is not.
   ========================================================================== */
(function (root) {
  "use strict";

  var WRITE_STOCK = false;
  var RELATED = { ECOM: 1, LINE: 1, SAMPLE: 1, SCRAP: 1 };

  var TXT = {
    en: {
      title: "E-com lot log",
      hint: "Pulls logged to e-com for the dates below, then the lots whose pick window covers one ship day. Fulfillment logs the pull before bags go to e-com pick, and marks a lot out of pick when that lot leaves. This screen does not move inventory. ShipStation rows stay date and flavor possibles until a scanner records the lot.",
      range: "Pulls logged",
      from: "From",
      to: "To",
      onLbl: "Lots in e-com on",
      export: "Export CSV",
      pullsTitle: "Pulls logged",
      onTitle: "Lots in e-com on this date",
      openTitle: "Still in pick",
      emptyPulls: "No e-com pulls in this date range.",
      emptyOn: "No lot window covers this date.",
      emptyOpen: "No lot is still in pick.",
      onHint: "A lot is in e-com from its pull day through the day it is marked out of pick. A second lot of the same flavor does not remove the first.",
      openHint: "Out of pick ends that lot only. It does not move inventory. The date used is the ship day above.",
      colDate: "Date",
      colLot: "Lot",
      colFlavor: "Flavor",
      colSize: "Size",
      colBags: "Bags",
      colFrom: "From",
      colTo: "To",
      colBy: "By",
      colPulled: "Pulled",
      colThrough: "In pick through",
      still: "Still in pick",
      outBtn: "Out of pick",
      toEcom: "E-com",
      toLine: "Line",
      toSample: "Samples",
      toScrap: "Scrap",
      toOut: "Out of pick",
      saves: "saves",
      missing: "E-com lot log did not load. Refresh the page."
    },
    es: {
      title: "Registro de lotes e-com",
      hint: "Salidas registradas a e-com en las fechas de abajo, y los lotes cuya ventana cubre un dia de envio. Fulfillment registra la salida antes de llevar las bolsas al pick de e-com, y marca el lote fuera de pick cuando ese lote sale. Esta pantalla no mueve inventario. Las filas de ShipStation siguen siendo posibles por fecha y sabor hasta que un escaner registre el lote.",
      range: "Salidas registradas",
      from: "Desde",
      to: "Hasta",
      onLbl: "Lotes en e-com el",
      export: "Exportar CSV",
      pullsTitle: "Salidas registradas",
      onTitle: "Lotes en e-com en esta fecha",
      openTitle: "Siguen en pick",
      emptyPulls: "No hay salidas e-com en este rango.",
      emptyOn: "Ninguna ventana de lote cubre esta fecha.",
      emptyOpen: "Ningun lote sigue en pick.",
      onHint: "Un lote esta en e-com desde el dia de la salida hasta el dia que se marca fuera de pick. Un segundo lote del mismo sabor no quita el primero.",
      openHint: "Fuera de pick termina solo ese lote. No mueve inventario. La fecha es el dia de envio de arriba.",
      colDate: "Fecha",
      colLot: "Lote",
      colFlavor: "Sabor",
      colSize: "Tamano",
      colBags: "Bolsas",
      colFrom: "Desde",
      colTo: "A",
      colBy: "Por",
      colPulled: "Salida",
      colThrough: "En pick hasta",
      still: "Sigue en pick",
      outBtn: "Fuera de pick",
      toEcom: "E-com",
      toLine: "Linea",
      toSample: "Muestras",
      toScrap: "Desecho",
      toOut: "Fuera de pick",
      saves: "registros",
      missing: "El registro e-com no cargo. Actualice la pagina."
    }
  };

  function lang() {
    var doc = root.document;
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    return es && es.classList.contains("active") ? "es" : "en";
  }
  function L(k) {
    var d = TXT[lang()] || TXT.en;
    if (d[k] != null) return d[k];
    return TXT.en[k] != null ? TXT.en[k] : k;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) {
    var n = Number(String(v == null ? "" : v).replace(/,/g, ""));
    return isFinite(n) ? n : 0;
  }
  function fmt(n) {
    var x = Number(n);
    if (!isFinite(x)) return "";
    return (Math.round(x * 100) / 100).toLocaleString("en-US");
  }
  function normLot(lot) { return String(lot || "").toUpperCase().replace(/\s+/g, ""); }
  function cleanFrom(raw) {
    var s = String(raw == null ? "" : raw).replace(/[\u0000-\u001f]/g, "").trim().toUpperCase();
    if (!s || s.length > 40) return "";
    return s;
  }
  function showFrom(e) {
    var raw = "";
    if (e) raw = e.from_loc || (e.data && e.data.from_loc) || "";
    return String(raw).replace(/[\u0000-\u001f]/g, "").trim();
  }
  function dayKey(s) {
    s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return us[3] + "-" + ("0" + us[1]).slice(-2) + "-" + ("0" + us[2]).slice(-2);
    return "";
  }
  function addDays(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return "";
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  // Same comparison as trace-recall.js inWindow.
  function inWindow(shipDay, w) {
    shipDay = dayKey(shipDay);
    if (!shipDay || !w || !w.pulledDay) return false;
    if (shipDay < w.pulledDay) return false;
    if (w.open || !w.endsDay) return true;
    if (w.endsDay <= w.pulledDay) return shipDay === w.pulledDay;
    return shipDay < w.endsDay;
  }
  function isOut(e) {
    if (!e || e.type === "USE") return false;
    if (e.type === "ECOM_OUT") return true;
    var d = e.data || {};
    return !!(d.out_of_pick || d.finished);
  }
  function isEcomUse(e) {
    return !!(e && e.type === "USE" && String(e.to_loc || "").toUpperCase() === "ECOM");
  }
  function isRelated(e) {
    if (!e) return false;
    if (isOut(e)) return true;
    return e.type === "USE" && !!RELATED[String(e.to_loc || "").toUpperCase()];
  }
  function defaultInstant(e) {
    var d = (e && e.data) || {};
    var pd = String(d.pull_date || d.finished_date || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(pd)) return pd + "T12:00:00";
    return String((e && e.ts) || "");
  }
  function defaultStamp(iso) {
    var m = String(iso || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] + " 12:00" : String(iso || "").slice(0, 16);
  }
  function defaultFlavor(e) {
    var d = (e && e.data) || {};
    return { fc: d.flavor_code || "", size: d.size || "", name: d.flavor || "" };
  }
  function optsOf(opts) {
    opts = opts || {};
    return {
      pullInstant: opts.pullInstant || defaultInstant,
      stamp: opts.stamp || defaultStamp,
      flavorOf: opts.flavorOf || defaultFlavor
    };
  }
  function pushUniq(list, v) {
    v = String(v || "").trim();
    if (!v || list.indexOf(v) >= 0) return;
    list.push(v);
  }

  function buildWindows(events, opts) {
    var o = optsOf(opts);
    var rows = (events || []).filter(function (e) { return isEcomUse(e) || isOut(e); });
    rows.sort(function (a, b) {
      var c = String(o.pullInstant(a)).localeCompare(String(o.pullInstant(b)));
      if (c) return c;
      return (isOut(a) ? 1 : 0) - (isOut(b) ? 1 : 0);
    });
    var open = {};
    var done = [];
    function closeWin(w, e) {
      var instant = o.pullInstant(e);
      var label = o.stamp(instant);
      var finDay = String(label || "").slice(0, 10);
      var end = addDays(finDay, 1);
      if (!finDay || !end) return;
      w.finished = label;
      w.finishedDay = finDay;
      w.ends = label;
      w.endsDay = end;
      w.open = false;
      w.endedBy = "out of pick";
      w.nextLot = "";
      done.push(w);
    }
    rows.forEach(function (e) {
      var lotKey = normLot(e.lot);
      if (!lotKey) return;
      var f = o.flavorOf(e) || {};
      var size = String(f.size || (e.data && e.data.size) || "");
      if (isOut(e)) {
        Object.keys(open).forEach(function (k) {
          if (k.indexOf(lotKey + "|") !== 0) return;
          if (size && k !== lotKey + "|" + size) return;
          var w = open[k];
          if (!w) return;
          closeWin(w, e);
          delete open[k];
        });
        return;
      }
      var key = lotKey + "|" + size;
      var w = open[key];
      if (!w) {
        var instant = o.pullInstant(e);
        var label = o.stamp(instant);
        w = {
          lot: e.lot || lotKey,
          flavor: f.name || (e.data && e.data.flavor) || "",
          flavorCode: f.fc || (e.data && e.data.flavor_code) || "",
          size: size,
          pulled: label,
          pulledDay: String(label || "").slice(0, 10),
          bags: num(e.qty),
          by: String(e.operator || "").trim(),
          operators: [],
          froms: [],
          ends: "",
          endsDay: "",
          finished: "",
          finishedDay: "",
          nextLot: "",
          endedBy: "",
          open: true
        };
        pushUniq(w.operators, e.operator);
        pushUniq(w.froms, showFrom(e));
        w.by = w.operators.join(", ");
        open[key] = w;
        return;
      }
      w.bags += num(e.qty);
      pushUniq(w.operators, e.operator);
      pushUniq(w.froms, showFrom(e));
      w.by = w.operators.join(", ");
      if (!w.flavor && f.name) w.flavor = f.name;
      if (!w.flavorCode && f.fc) w.flavorCode = f.fc;
    });
    Object.keys(open).sort().forEach(function (k) { done.push(open[k]); });
    done.sort(function (a, b) {
      return String(a.pulledDay).localeCompare(String(b.pulledDay)) || String(a.lot).localeCompare(String(b.lot)) || String(a.size).localeCompare(String(b.size));
    });
    return done;
  }

  function groupPulls(events, fromDay, toDay, opts) {
    var o = optsOf(opts);
    fromDay = dayKey(fromDay);
    toDay = dayKey(toDay);
    if (fromDay && toDay && fromDay > toDay) {
      var swap = fromDay;
      fromDay = toDay;
      toDay = swap;
    }
    var map = {};
    var order = [];
    (events || []).forEach(function (e) {
      if (!isRelated(e)) return;
      var label = o.stamp(o.pullInstant(e));
      var day = String(label || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      if (fromDay && day < fromDay) return;
      if (toDay && day > toDay) return;
      var out = isOut(e);
      var f = o.flavorOf(e) || {};
      var lot = String(e.lot || "").trim();
      var size = String(f.size || (e.data && e.data.size) || "");
      var flavor = String(f.name || (e.data && e.data.flavor) || "");
      var fc = String(f.fc || (e.data && e.data.flavor_code) || "");
      var dest = out ? "OUT" : String(e.to_loc || "").toUpperCase();
      var key = [day, normLot(lot), fc, size, dest].join("|");
      var row = map[key];
      if (!row) {
        row = {
          pull_date: day, lot: lot, flavor: flavor, flavorCode: fc, size: size,
          bags: 0, operators: [], froms: [], to: dest, kind: out ? "out" : "pull", saves: 0
        };
        map[key] = row;
        order.push(key);
      }
      if (!out) row.bags += num(e.qty);
      row.saves += 1;
      pushUniq(row.operators, e.operator);
      pushUniq(row.froms, showFrom(e));
      if (!row.flavor && flavor) row.flavor = flavor;
    });
    var rows = order.map(function (k) { return map[k]; });
    rows.sort(function (a, b) {
      return a.pull_date.localeCompare(b.pull_date) || a.lot.localeCompare(b.lot) || a.size.localeCompare(b.size) || a.to.localeCompare(b.to);
    });
    return rows;
  }

  function lotsOnDate(windows, day) {
    day = dayKey(day);
    if (!day) return [];
    return (windows || []).filter(function (w) { return inWindow(day, w); });
  }

  function destLabel(code) {
    if (code === "OUT") return L("toOut");
    if (code === "ECOM") return L("toEcom");
    if (code === "LINE") return L("toLine");
    if (code === "SAMPLE") return L("toSample");
    if (code === "SCRAP") return L("toScrap");
    return code || "";
  }
  function throughLabel(w) {
    if (!w || w.open) return L("still");
    return w.finishedDay || String(w.finished || w.ends || "").slice(0, 10);
  }
  function csvCell(v) {
    var s = String(v == null ? "" : v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(pulls, active, onDay) {
    var lines = ["section,date,lot,flavor,size,bags,from,to,operators,window,saves"];
    (pulls || []).forEach(function (r) {
      lines.push([
        r.kind === "out" ? "out" : "pull",
        r.pull_date, r.lot, r.flavor, r.size,
        r.kind === "out" ? "" : r.bags,
        (r.froms || []).join("; "),
        r.to || "",
        (r.operators || []).join("; "),
        "",
        r.saves || ""
      ].map(csvCell).join(","));
    });
    (active || []).forEach(function (w) {
      lines.push([
        "in_ecom",
        onDay || "",
        w.lot, w.flavor, w.size, w.bags,
        (w.froms || []).join("; "),
        "ECOM",
        w.by || "",
        w.open ? "open" : (w.finishedDay || ""),
        ""
      ].map(csvCell).join(","));
    });
    return "\uFEFF" + lines.join("\r\n");
  }

  var ui = { from: "", to: "", on: "" };
  var last = { csv: "", name: "ecom-lot-log.csv", open: [] };

  function holdFrom(v) { ui.from = String(v || "").slice(0, 10); }
  function holdTo(v) { ui.to = String(v || "").slice(0, 10); }
  function holdOn(v) { ui.on = String(v || "").slice(0, 10); }
  function paint() {
    if (root.TRACE && typeof root.TRACE.render === "function") root.TRACE.render();
  }
  function setFrom(v) { holdFrom(v); paint(); }
  function setTo(v) { holdTo(v); paint(); }
  function setOn(v) { holdOn(v); paint(); }

  function viewHtml(pack) {
    pack = pack || {};
    var today = dayKey(pack.today) || defaultStamp(new Date().toISOString()).slice(0, 10);
    if (!ui.from) ui.from = today;
    if (!ui.to) ui.to = today;
    if (!ui.on) ui.on = ui.to || today;
    var opt = { flavorOf: pack.flavorOf, pullInstant: pack.pullInstant, stamp: pack.stamp };
    var pulls = groupPulls(pack.events || [], ui.from, ui.to, opt);
    var windows = buildWindows(pack.events || [], opt);
    var active = lotsOnDate(windows, ui.on);
    var open = windows.filter(function (w) { return w && w.open; });
    last.open = open;
    last.csv = toCsv(pulls, active, ui.on);
    last.name = "ecom-lot-log-" + (ui.from || today) + "-to-" + (ui.to || today) + "-on-" + (ui.on || today) + ".csv";
    var h = '<div class="card" id="trc-elog"><h2 class="sub2">' + esc(L("title")) + '</h2><p class="hint">' + esc(L("hint")) + '</p>';
    h += '<div class="trc-grid">';
    h += '<div><label>' + esc(L("from")) + '</label><input id="trc-elog-from" type="date" value="' + esc(ui.from) + '" oninput="ECOMLOG.holdFrom(this.value)" onchange="ECOMLOG.setFrom(this.value)"></div>';
    h += '<div><label>' + esc(L("to")) + '</label><input id="trc-elog-to" type="date" value="' + esc(ui.to) + '" oninput="ECOMLOG.holdTo(this.value)" onchange="ECOMLOG.setTo(this.value)"></div>';
    h += '<div><label>' + esc(L("onLbl")) + '</label><input id="trc-elog-on" type="date" value="' + esc(ui.on) + '" oninput="ECOMLOG.holdOn(this.value)" onchange="ECOMLOG.setOn(this.value)"></div>';
    h += '</div><p style="margin-top:10px"><button type="button" class="primary" onclick="ECOMLOG.exportCsv()">' + esc(L("export")) + '</button></p></div>';
    h += '<div class="card"><h2 class="sub2">' + esc(L("pullsTitle")) + '</h2>';
    h += pulls.length ? tablePulls(pulls) : '<p class="muted">' + esc(L("emptyPulls")) + '</p>';
    h += '</div>';
    h += '<div class="card"><h2 class="sub2">' + esc(L("onTitle")) + '</h2><p class="hint">' + esc(L("onHint")) + '</p>';
    h += active.length ? tableActive(active) : '<p class="muted">' + esc(L("emptyOn")) + '</p>';
    h += '</div>';
    h += '<div class="card"><h2 class="sub2">' + esc(L("openTitle")) + '</h2><p class="hint">' + esc(L("openHint")) + '</p>';
    h += open.length ? tableOpen(open) : '<p class="muted">' + esc(L("emptyOpen")) + '</p>';
    h += '</div>';
    return h;
  }
  function joinShow(list) {
    return (list || []).map(esc).join(", ");
  }
  function tablePulls(rows) {
    var h = '<div class="tblwrap"><table class="trc"><thead><tr><th>' + esc(L("colDate")) + '</th><th>' + esc(L("colLot")) + '</th><th>' + esc(L("colFlavor")) + '</th><th>' + esc(L("colSize")) + '</th><th>' + esc(L("colBags")) + '</th><th>' + esc(L("colFrom")) + '</th><th>' + esc(L("colTo")) + '</th><th>' + esc(L("colBy")) + '</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var bags = r.kind === "out" ? "-" : fmt(r.bags);
      if (r.kind !== "out" && r.saves > 1) bags += ' <span class="muted sm">(' + r.saves + ' ' + esc(L("saves")) + ')</span>';
      h += '<tr><td>' + esc(r.pull_date) + '</td><td><b>' + esc(r.lot) + '</b></td><td>' + esc(r.flavor) + '</td><td>' + esc(r.size) + '</td><td>' + bags + '</td><td>' + joinShow(r.froms) + '</td><td>' + esc(destLabel(r.to)) + '</td><td>' + joinShow(r.operators) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function tableActive(rows) {
    var h = '<div class="tblwrap"><table class="trc"><thead><tr><th>' + esc(L("colLot")) + '</th><th>' + esc(L("colFlavor")) + '</th><th>' + esc(L("colSize")) + '</th><th>' + esc(L("colPulled")) + '</th><th>' + esc(L("colBags")) + '</th><th>' + esc(L("colFrom")) + '</th><th>' + esc(L("colBy")) + '</th><th>' + esc(L("colThrough")) + '</th></tr></thead><tbody>';
    rows.forEach(function (w) {
      h += '<tr><td><b>' + esc(w.lot) + '</b></td><td>' + esc(w.flavor) + '</td><td>' + esc(w.size) + '</td><td>' + esc(w.pulledDay) + '</td><td>' + fmt(w.bags) + '</td><td>' + joinShow(w.froms) + '</td><td>' + esc(w.by) + '</td><td>' + esc(throughLabel(w)) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function tableOpen(rows) {
    var h = '<div class="tblwrap"><table class="trc"><thead><tr><th>' + esc(L("colLot")) + '</th><th>' + esc(L("colFlavor")) + '</th><th>' + esc(L("colSize")) + '</th><th>' + esc(L("colPulled")) + '</th><th>' + esc(L("colBags")) + '</th><th>' + esc(L("colBy")) + '</th><th></th></tr></thead><tbody>';
    rows.forEach(function (w, i) {
      h += '<tr><td><b>' + esc(w.lot) + '</b></td><td>' + esc(w.flavor) + '</td><td>' + esc(w.size) + '</td><td>' + esc(w.pulledDay) + '</td><td>' + fmt(w.bags) + '</td><td>' + esc(w.by) + '</td><td><button type="button" class="ghost sm" onclick="ECOMLOG.finish(' + i + ')">' + esc(L("outBtn")) + '</button></td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function finish(i) {
    var w = last.open[i];
    if (!w || !root.TRACE || typeof root.TRACE.ecomOut !== "function") return;
    root.TRACE.ecomOut(w.lot, w.flavorCode, w.size, ui.on);
  }
  function exportCsv() {
    var text = last.csv || "";
    var doc = root.document;
    if (!text || !doc || !root.URL || !root.Blob) return text;
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var a = doc.createElement("a");
    var url = root.URL.createObjectURL(blob);
    a.href = url;
    a.download = last.name || "ecom-lot-log.csv";
    doc.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (e) {} }, 1500);
    return text;
  }

  var api = {
    WRITE_STOCK: WRITE_STOCK,
    inWindow: inWindow,
    dayKey: dayKey,
    addDays: addDays,
    cleanFrom: cleanFrom,
    buildWindows: buildWindows,
    groupPulls: groupPulls,
    lotsOnDate: lotsOnDate,
    toCsv: toCsv,
    isEcomUse: isEcomUse,
    isOut: isOut,
    isRelated: isRelated,
    viewHtml: viewHtml,
    holdFrom: holdFrom,
    holdTo: holdTo,
    holdOn: holdOn,
    setFrom: setFrom,
    setTo: setTo,
    setOn: setOn,
    finish: finish,
    exportCsv: exportCsv
  };
  root.ECOMLOG = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

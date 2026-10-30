/* ============================================================================
   Smackin' OS - floor clarity (floor-clarity.js)
   Presentation only. Does not write stock, demand, or purchase orders.
   One MutationObserver on #view. No timers.
   Skips while a field in #view is focused, same idea as isBusyEditing(),
   so a background repaint does not rearrange a form mid-entry.
   Demand Complete still calls the existing UI.dmShip confirm.
   Auto-close modules are not touched.
   ========================================================================== */
(function () {
  "use strict";
  if (window.FLOOR_CLARITY) return;

  function lang() {
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) {
    var l = lang();
    return (v && (v[l] || v.en)) || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function editing() {
    var locks = window.SMK_VIEW_LOCKS || [];
    var busy = window.SMK_BUSY || [];
    var i;
    for (i = 0; i < locks.length; i++) { try { if (locks[i]()) return true; } catch (e) {} }
    for (i = 0; i < busy.length; i++) { try { if (busy[i]()) return true; } catch (e2) {} }
    var ae = document.activeElement;
    if (!ae || !ae.closest || !ae.closest("#view")) return false;
    if (ae.tagName === "SELECT") return true;
    if (ae.tagName !== "INPUT" && ae.tagName !== "TEXTAREA") return false;
    var typ = String(ae.type || "").toLowerCase();
    if (typ === "button" || typ === "submit" || typ === "checkbox" || typ === "radio" || typ === "file" || typ === "hidden") return false;
    // An empty scan box is focused on open. That is not a half-typed entry.
    return String(ae.value || "").trim() !== "";
  }
  function dueISO(d) {
    if (!d) return "";
    d = String(d).trim();
    var m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return "";
    var y = m[3];
    if (y.length === 2) y = "20" + y;
    return y + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
  }
  function todayISO() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function numText(s) {
    var n = parseFloat(String(s || "").replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function polishDemand(view) {
    if (view.querySelector("[data-fc-demand]")) return;
    var table = null;
    var tables = view.querySelectorAll("table");
    var i;
    for (i = 0; i < tables.length; i++) {
      if (tables[i].innerHTML.indexOf("UI.dmShip") >= 0) { table = tables[i]; break; }
    }
    if (!table && view.querySelector("[onchange*='dmdSet']")) {
      for (i = 0; i < tables.length; i++) {
        var ths = tables[i].querySelectorAll("th");
        if (ths.length >= 6) { table = tables[i]; break; }
      }
    }
    if (!table || !table.tBodies || !table.tBodies[0]) return;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    var groups = {};
    var order = [];
    rows.forEach(function (tr) {
      var cells = tr.cells;
      if (!cells || cells.length < 6) return;
      var btn = tr.querySelector("button[onclick*='dmShip']");
      var poText = (cells[1].textContent || "").replace(/\s+/g, " ").trim();
      var partner = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      var key = btn ? btn.getAttribute("onclick") : ("shipped|" + partner + "|" + poText);
      if (!groups[key]) {
        groups[key] = {
          poHtml: cells[1].innerHTML,
          partner: partner,
          dueText: (cells[5].textContent || "").replace(/\s+/g, " ").trim(),
          dueISO: "",
          open: !!btn,
          onclick: btn ? btn.getAttribute("onclick") : "",
          lines: []
        };
        order.push(key);
      }
      var due = dueISO(cells[5].textContent || "");
      if (due && (!groups[key].dueISO || due < groups[key].dueISO)) groups[key].dueISO = due;
      groups[key].lines.push({
        flavor: (cells[2].textContent || "").replace(/\s+/g, " ").trim(),
        cases: (cells[3].textContent || "").replace(/\s+/g, " ").trim(),
        bags: (cells[4].textContent || "").replace(/\s+/g, " ").trim()
      });
    });
    if (!order.length) return;
    var today = todayISO();
    var list = order.map(function (k) { return groups[k]; });
    list.sort(function (a, b) {
      function rank(g) {
        if (g.open && g.dueISO && g.dueISO < today) return 0;
        if (g.open && g.dueISO) return 1;
        if (g.open) return 2;
        return 3;
      }
      var d = rank(a) - rank(b);
      if (d) return d;
      return String(a.dueISO || "9999").localeCompare(String(b.dueISO || "9999"));
    });
    var past = list.filter(function (g) { return g.open && g.dueISO && g.dueISO < today; }).length;
    var cards = list.map(function (g) {
      var late = !!(g.open && g.dueISO && g.dueISO < today);
      var shown = g.lines.slice(0, 5).map(function (line) {
        return "<div><b>" + esc(line.flavor || "-") + "</b> · " + esc(line.cases || "0") + " / " + esc(line.bags || "0") + "</div>";
      }).join("");
      var more = g.lines.length > 5 ? '<div class="fc-more">+' + (g.lines.length - 5) + " more</div>" : "";
      var cases = g.lines.reduce(function (s, line) { return s + numText(line.cases); }, 0);
      var act = g.onclick
        ? '<button type="button" class="primary fc-complete" title="' + esc(tx({
            en: "Marks this whole PO shipped.",
            es: "Marca toda esta OC como enviada.",
            pt: "Marca toda esta OC como enviada."
          })) + '" onclick="' + esc(g.onclick) + '">' + esc(tx({ en: "Complete", es: "Completar", pt: "Concluir" })) + "</button>"
        : '<span class="fc-chip fc-closed">' + esc(tx({ en: "Shipped", es: "Enviado", pt: "Enviado" })) + "</span>";
      return '<article class="fc-card' + (late ? " fc-late" : "") + '" data-fc-late="' + (late ? "1" : "0") + '">' +
        '<div class="fc-card-top"><div><div class="fc-po">' + g.poHtml + '</div><div class="fc-partner">' + esc(g.partner) + "</div></div>" +
        '<div>' + (late ? '<span class="fc-chip fc-latechip">' + esc(tx({ en: "Past due", es: "Vencido", pt: "Vencido" })) + "</span> " : "") + act + "</div></div>" +
        '<div class="fc-meta">' + esc(tx({ en: "Due", es: "Vence", pt: "Vence" })) + " " + esc(g.dueText || "-") +
        " · " + g.lines.length + " · " + cases + "</div>" +
        '<div class="fc-lines">' + shown + more + "</div></article>";
    }).join("");
    var host = document.createElement("div");
    host.setAttribute("data-fc-demand", "1");
    host.setAttribute("data-late", "0");
    host.className = "fc-demand";
    host.innerHTML =
      '<div class="fc-actions">' +
      '<button type="button" class="ghost" data-fc="late">' + esc(tx({
        en: "Past due only (" + past + ")",
        es: "Solo vencidos (" + past + ")",
        pt: "So vencidos (" + past + ")"
      })) + "</button>" +
      '<button type="button" class="ghost" data-fc="lines">' + esc(tx({ en: "Line table", es: "Tabla", pt: "Tabela" })) + "</button>" +
      "</div>" +
      '<p class="hint">' + esc(tx({
        en: "Past due is first. Complete marks the whole PO shipped. The line table is still here if you need every row.",
        es: "Lo vencido va primero. Completar marca toda la OC como enviada. La tabla sigue aqui si necesita cada fila.",
        pt: "O vencido vem primeiro. Concluir marca a OC inteira como enviada. A tabela continua aqui se precisar de cada linha."
      })) + "</p>" +
      '<div class="fc-cards">' + cards + "</div>" +
      '<p class="fc-none">' + esc(tx({ en: "Nothing past due in this list.", es: "Nada vencido en esta lista.", pt: "Nada vencido nesta lista." })) + "</p>";
    table.classList.add("fc-srctable");
    table.parentNode.insertBefore(host, table);
  }

  function addReceive(view) {
    if (view.querySelector("[data-fc-recvbar]")) return;
    var create = view.querySelector("[onclick*='poCreateOpen']");
    if (!create || !create.parentNode) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary sm fc-receive";
    btn.setAttribute("data-fc-recvbar", "1");
    btn.setAttribute("onclick", "UI_go('expreceipts')");
    btn.textContent = tx({ en: "Receive", es: "Recibir", pt: "Receber" });
    create.parentNode.insertBefore(btn, create.nextSibling);
  }
  function polishPo(view) {
    if (view.querySelector("#po-vendor, #np-vendor, #po-sup, #spo-vendor")) return;
    var body = view.querySelector("#spoBody");
    if (body && !body.getAttribute("data-fc-po")) {
      body.setAttribute("data-fc-po", "1");
      addReceive(view);
      Array.prototype.forEach.call(body.rows, function (tr) {
        if (!tr.cells || tr.cells.length < 2) return;
        if (tr.querySelector("[data-fc-rowrecv]")) return;
        var open = tr.querySelector(".pill.partial, .pill.low.fc-open, .pill.fc-open");
        var closed = tr.querySelector(".pill.ok");
        if (!open || closed) return;
        var td = tr.cells[tr.cells.length - 1];
        var b = document.createElement("button");
        b.type = "button";
        b.className = "primary sm fc-receive";
        b.setAttribute("data-fc-rowrecv", "1");
        b.textContent = tx({ en: "Receive", es: "Recibir", pt: "Receber" });
        b.setAttribute("onclick", "UI_go('expreceipts')");
        td.insertBefore(b, td.firstChild);
      });
    }
    Array.prototype.forEach.call(view.querySelectorAll("[onclick*='markReceived']"), function (el) {
      el.classList.add("fc-receive");
    });
  }

  function polishDock(view) {
    if (view.querySelector("[data-fc-dock]")) return;
    var recv = view.querySelector("#r-qty");
    var log = view.querySelector("#rl-date");
    if (!recv && !log) return;
    var bar = document.createElement("div");
    bar.className = "fc-actions";
    bar.setAttribute("data-fc-dock", "1");
    function go(tab, label, on) {
      return '<button type="button" class="' + (on ? "primary" : "ghost") + '" onclick="UI_go(\'' + tab + '\')">' + esc(label) + "</button>";
    }
    bar.innerHTML =
      go("receive", tx({ en: "Scan / receive", es: "Escanear / recibir", pt: "Ler / receber" }), !!recv) +
      go("recvlog", tx({ en: "Log receipt", es: "Registrar recibo", pt: "Registrar recebimento" }), !!log) +
      go("returns", tx({ en: "Returns", es: "Devoluciones", pt: "Devolucoes" }), false);
    view.insertBefore(bar, view.firstChild);
    if (recv) {
      var card = recv.closest(".card");
      var hint = card && card.querySelector(":scope > p.hint");
      var save = card && card.querySelector("[onclick*='UI.receive']");
      if (hint && save && save.parentNode) save.parentNode.insertBefore(hint, save.nextSibling);
    }
    var box = view.querySelector("#rsop-box");
    var logSave = view.querySelector("[onclick*='rlSave']");
    if (box && logSave && logSave.parentNode && !view.querySelector(".fc-sop")) {
      var slot = document.createElement("div");
      slot.className = "fc-sop";
      var paper = box.querySelector(".rsop-paper");
      var one = null;
      var kids = box.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].classList && kids[i].classList.contains("hint")) { one = kids[i]; break; }
      }
      if (paper) slot.appendChild(paper);
      if (one) slot.appendChild(one);
      if (slot.childNodes.length) logSave.parentNode.insertBefore(slot, logSave.nextSibling);
    }
    var hold = view.querySelector("#rsop-holdcard");
    if (hold && hold.parentNode) hold.parentNode.appendChild(hold);
  }

  function polishRoster(view) {
    var save = view.querySelector("[onclick*='fdSave']");
    if (!save || save.getAttribute("data-fc-fd")) return;
    var date = view.querySelector("input[type='date']");
    var header = date && date.closest(".card");
    if (!header) return;
    save.setAttribute("data-fc-fd", "1");
    var note = view.querySelector("#fd-roster-note");
    if (note) header.appendChild(note);
    header.appendChild(save);
  }

  function tagBody(view) {
    var body = document.body;
    if (!body) return;
    body.classList.toggle("fc-fd", !!(view.querySelector("[onclick*='fdSave']") || view.querySelector("#fd-roster-note")));
    body.classList.toggle("fc-demand", !!view.querySelector("[onclick*='dmShip'], [data-fc-demand]"));
  }

  var painting = false;
  function onView() {
    if (painting) return;
    var view = document.getElementById("view");
    if (!view) return;
    tagBody(view);
    if (editing()) return;
    painting = true;
    try {
      polishDemand(view);
      polishPo(view);
      polishDock(view);
      polishRoster(view);
    } catch (e) {
      try { console.warn("floor-clarity", e); } catch (x) {}
    } finally {
      painting = false;
    }
  }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-fc]") : null;
    if (!t) return;
    var host = t.closest("[data-fc-demand]");
    if (!host) return;
    var kind = t.getAttribute("data-fc");
    if (kind === "late") {
      var on = host.getAttribute("data-late") !== "1";
      host.setAttribute("data-late", on ? "1" : "0");
      t.classList.toggle("active", on);
      return;
    }
    if (kind === "lines") {
      var table = host.parentNode && host.parentNode.querySelector("table.fc-srctable");
      if (!table) table = document.querySelector("table.fc-srctable");
      if (!table) return;
      table.classList.toggle("fc-show");
      t.classList.toggle("active", table.classList.contains("fc-show"));
    }
  }
  function boot() {
    var view = document.getElementById("view");
    if (!view || view.__fcObs) return;
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(onView);
      view.__fcObs = obs;
      obs.observe(view, { childList: true });
    }
    view.addEventListener("click", onClick);
    onView();
  }

  window.FLOOR_CLARITY = { refresh: onView };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

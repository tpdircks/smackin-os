/* ===========================================================================
   Smackin' OS - Short menu (simple-nav.js)
   The left menu shows only the department list, a "Find a screen" box, and
   an "All screens" fold. The old grouped list (90+ items) is still in the
   DOM and still routes the same way; it is only folded away. Typing in the
   box shows every screen whose name matches, across all groups.
   Also: plain names for screens whose names repeat or are jargon, and
   Spanish names for screens the app shows in English. Labels only; the
   click target of every menu item is unchanged.
   The role picker at the top of the menu is hidden: it no longer changes
   which tabs show (role-tabs.js). Pick your job on Home > Today instead.
   Reads and writes nothing. No DOM timers. Exposes window.SIMPLE_NAV.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var state = { all: false, q: "", busy: false };

  function $(id) { return doc ? doc.getElementById(id) : null; }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) { return v ? (v[lang()] || v.en || "") : ""; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  // Key: element id, else the UI_go target in onclick.
  var NAMES = {
    recvlog: { en: "Dock checklist", es: "Lista del muelle", pt: "Lista do cais" },
    qa: { en: "On hold (quarantine)", es: "Retenido (cuarentena)", pt: "Retido (quarentena)" },
    disposition: { en: "Short-dated stock", es: "Producto con fecha corta", pt: "Produto com validade curta" },
    "trc-nav-recv": { en: "Receive: scan lots", es: "Recibir: escanear lotes", pt: "Receber: escanear lotes" },
    "trc-nav-qa": { en: "Hold or release a lot", es: "Retener o liberar un lote", pt: "Reter ou liberar um lote" },
    "trc-nav-mix": { en: "Mixing: scan lots", es: "Mezcla: escanear lotes", pt: "Mistura: escanear lotes" },
    "trc-nav-pmac": { en: "P-Mac: finish a pallet", es: "P-Mac: terminar paleta", pt: "P-Mac: fechar palete" },
    "trc-nav-move": { en: "Move a lot (scan)", es: "Mover lote (escanear)", pt: "Mover lote (escanear)" },
    "trc-nav-ship": { en: "Ship: scan pallets out", es: "Enviar: escanear paletas", pt: "Enviar: escanear paletes" },
    "trc-nav-labels": { en: "Lot labels", es: "Etiquetas de lote", pt: "Etiquetas de lote" },
    "trc-nav-trace": { en: "Find a lot (trace)", es: "Buscar un lote (rastreo)", pt: "Achar um lote (rastreio)" },
    labels: { en: "Item labels", es: "Etiquetas de item", pt: "Etiquetas de item" },
    mixing: { en: "Mixing status", es: "Estado de mezcla", pt: "Status da mistura" },
    pmac: { en: "P-Mac status", es: "Estado de P-Mac", pt: "Status da P-Mac" },
    "svc-nav": { en: "Services", es: "Servicios", pt: "Servicos" },
    "fa-nav": { en: "Fulfillment errors", es: "Errores de fulfillment", pt: "Erros de fulfillment" },
    recipes: { en: "Recipes", es: "Recetas", pt: "Receitas" },
    prodready: { en: "Ready to produce?", es: "Listo para producir?", pt: "Pronto para produzir?" },
    "shs-nav": { en: "Carrier shipments", es: "Envios de transportista", pt: "Envios da transportadora" },
    prodorders: { en: "Work orders", es: "Ordenes de trabajo", pt: "Ordens de trabalho" },
    reordertracker: { en: "Reorder tracker", es: "Seguimiento de reorden", pt: "Acompanhar reposicao" },
    launch: { en: "New product launches", es: "Lanzamientos", pt: "Lancamentos" },
    "btr-nav": { en: "Batch record", es: "Registro de lote", pt: "Registro de lote" },
    "mfg-hist-nav": { en: "Production history", es: "Historial de produccion", pt: "Historico de producao" },
    "mfg-up-nav": { en: "Upload production file", es: "Subir archivo de produccion", pt: "Enviar arquivo de producao" },
    "sqf-nav": { en: "SQF tasks", es: "Tareas SQF", pt: "Tarefas SQF" },
    quality: { en: "CCP checks", es: "Controles CCP", pt: "Controles CCP" },
    "qa-nav": { en: "Quality checklists", es: "Listas de calidad", pt: "Listas de qualidade" },
    "coa-nav": { en: "Supplier COAs", es: "COA de proveedores", pt: "COA de fornecedores" },
    daily: { en: "Daily numbers", es: "Numeros del dia", pt: "Numeros do dia" },
    board: { en: "TV board", es: "Pizarra TV", pt: "Painel TV" },
    log: { en: "Activity log", es: "Registro de actividad", pt: "Registro de atividade" },
    history: { en: "Edit trail", es: "Historial de cambios", pt: "Historico de alteracoes" },
    "dh-nav": { en: "Data check", es: "Revision de datos", pt: "Checagem de dados" },
    "sf-nav": { en: "Retailer orders (SPS)", es: "Ordenes de clientes (SPS)", pt: "Pedidos de clientes (SPS)" },
    "fgl-nav": { en: "Best-by dates", es: "Fechas de consumo", pt: "Validades" },
    expreceipts: { en: "Due in", es: "Por llegar", pt: "A chegar" },
    purchasing: { en: "Supplier POs", es: "OC de proveedor", pt: "OCs de fornecedor" },
    pmacout: { en: "Log bags off P-Mac", es: "Registrar bolsas de P-Mac", pt: "Registrar sacos da P-Mac" },
    home: { en: "Big picture", es: "Resumen general", pt: "Visao geral" },
    dash: { en: "On hand", es: "Existencias", pt: "Em estoque" },
    stockbuild: { en: "Stock build", es: "Construir inventario", pt: "Montar estoque" }
  };
  // Same screen listed twice: keep the first, fold the copy out of search.
  var DUPES = { "trc-nav-elog-qa": 1 };

  function keyOf(btn) {
    if (btn.id) return btn.id;
    var m = String(btn.getAttribute("onclick") || "").match(/UI_go\('([^']+)'\)/);
    return m ? m[1] : "";
  }
  function relabel(nav) {
    var items = nav.querySelectorAll(".navitem");
    for (var i = 0; i < items.length; i++) {
      var b = items[i];
      if (b.closest("#dept-nav-homes")) continue;
      var k = keyOf(b);
      if (DUPES[k] || (k === "returns" && b.closest(".navgroup") && nav.querySelectorAll(".navitem[onclick*=\"'returns'\"]")[0] !== b)) b.classList.add("snav-dupe");
      var name = NAMES[k];
      if (!name) continue;
      var span = b.querySelector("span:not(.navbadge)");
      var want = tx(name);
      if (span && span.textContent !== want) span.textContent = want;
    }
  }
  function toolsHtml() {
    return '<div class="snav-find"><input id="snav-q" type="search" autocomplete="off" placeholder="' +
      esc(tx({ en: "Find a screen...", es: "Buscar una pantalla...", pt: "Achar uma tela..." })) + '" value="' + esc(state.q) + '">' +
      '<button type="button" id="snav-all" class="snav-all" aria-expanded="' + (state.all ? "true" : "false") + '">' +
      esc(state.all ? tx({ en: "Hide all screens", es: "Ocultar pantallas", pt: "Ocultar telas" }) : tx({ en: "All screens", es: "Todas las pantallas", pt: "Todas as telas" })) +
      ' <span aria-hidden="true">' + (state.all ? "&#9662;" : "&#9656;") + "</span></button></div>";
  }
  function applyFilter(nav) {
    var q = state.q.trim().toLowerCase();
    nav.classList.toggle("snav-on", true);
    nav.classList.toggle("snav-showall", state.all && !q);
    nav.classList.toggle("snav-search", !!q);
    var items = [].filter.call(nav.querySelectorAll(".navitem"), function (b) { return !b.closest("#dept-nav-homes") && b.id !== "dept-release"; });
    var any = false;
    for (var i = 0; i < items.length; i++) {
      var hit = !!q && items[i].textContent.toLowerCase().indexOf(q) >= 0 && !items[i].classList.contains("snav-dupe");
      items[i].classList.toggle("snav-hit", hit);
      if (hit) any = true;
    }
    var none = $("snav-none");
    if (none) none.hidden = !q || any;
  }
  function decorate() {
    var nav = $("nav");
    if (!nav || state.busy || !nav.querySelector(".navitem")) return;
    state.busy = true;
    try {
      relabel(nav);
      var tools = $("snav-tools");
      if (!tools || tools.getAttribute("data-lang") !== lang() || tools.parentNode !== nav) {
        if (tools && tools.parentNode) tools.parentNode.removeChild(tools);
        tools = doc.createElement("div");
        tools.id = "snav-tools";
        tools.setAttribute("data-lang", lang());
        tools.innerHTML = toolsHtml() + '<p id="snav-none" class="snav-none" hidden>' + esc(tx({ en: "No screen with that name.", es: "No hay pantalla con ese nombre.", pt: "Nenhuma tela com esse nome." })) + "</p>";
        var homes = $("dept-nav-homes");
        if (homes && homes.parentNode === nav) nav.insertBefore(tools, homes.nextSibling);
        else nav.insertBefore(tools, nav.firstChild);
      }
      applyFilter(nav);
    } finally { state.busy = false; }
  }

  var CSS = [
    "#nav.snav-on .rolesel{display:none}",
    "#nav.snav-on:not(.snav-showall):not(.snav-search) .navgroup:not(#dept-nav-homes),#nav.snav-on:not(.snav-showall):not(.snav-search) > .navitem{display:none}",
    "#nav.snav-on.snav-showall .snav-dupe{display:none}",
    "#nav.snav-on.snav-search .navgroup:not(#dept-nav-homes) .navlabel{display:none}",
    "#nav.snav-on.snav-search .navgroup:not(#dept-nav-homes) .navitem:not(.snav-hit),#nav.snav-on.snav-search > .navitem:not(.snav-hit){display:none}",
    ".snav-find{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-top:1px solid #e5e9f0;border-bottom:1px solid #e5e9f0;margin:6px 0}",
    "#snav-q{font:inherit;font-size:15px;padding:9px 10px;border:1px solid #9fb3c8;border-radius:8px;width:100%;box-sizing:border-box}",
    ".snav-all{font:inherit;font-size:13px;font-weight:700;text-align:left;background:none;border:0;color:#006DB6;cursor:pointer;padding:4px 2px}",
    ".snav-none{margin:4px 12px;color:#6b7280;font-size:13px}"
  ].join("\n");
  function styleOnce() {
    if (!doc || $("snav-style")) return;
    var s = doc.createElement("style");
    s.id = "snav-style";
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  function boot() {
    var nav = $("nav");
    if (!nav) return;
    styleOnce();
    if (!nav.__snavObs && typeof MutationObserver === "function") {
      nav.__snavObs = true;
      new MutationObserver(function () { if (!state.busy) decorate(); }).observe(nav, { childList: true, subtree: true });
    }
    nav.addEventListener("input", function (e) {
      if (!e.target || e.target.id !== "snav-q") return;
      state.q = e.target.value || "";
      applyFilter(nav);
    });
    nav.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("#snav-all") : null;
      if (!b) return;
      state.all = !state.all;
      var tools = $("snav-tools");
      if (tools) tools.setAttribute("data-lang", "");
      decorate();
    });
    // A screen opened from a search result clears the search.
    nav.addEventListener("click", function (e) {
      var it = e.target && e.target.closest ? e.target.closest(".navitem") : null;
      if (!it || !state.q) return;
      state.q = "";
      var tools = $("snav-tools");
      if (tools) tools.setAttribute("data-lang", "");
    }, true);
    decorate();
  }
  if (doc) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  }

  var api = { NAMES: NAMES, DUPES: DUPES, keyOf: keyOf, refresh: decorate, _state: state };
  root.SIMPLE_NAV = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

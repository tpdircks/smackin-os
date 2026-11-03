/* ============================================================================
   Smackin' OS - Department section boards (dept-boards.js)
   After each render, group the primary cards for Purchasing, Inventory,
   Mixing, P-Mac, and Fulfillment into the shared .dept-board pattern.
   Cards opt in with data-slot. Subflows without a slot are left alone.
   Retail and E-Commerce stay on their own fulfillment screens.
   No stock writes. No timers. One MutationObserver on #view.
   ========================================================================== */
(function () {
  "use strict";

  var painting = false;

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

  var PLANS = {
    purch: {
      here: { purchasing: 1 },
      sections: [
        { slots: ["tabs"], span: true },
        { title: { en: "To order", es: "Por pedir", pt: "Para pedir" }, slots: ["poadd", "buy"] },
        { title: { en: "Open POs", es: "OC abiertas", pt: "OCs abertas" }, slots: ["polist", "drafts"] },
        { title: { en: "Reorder setup", es: "Punto de reorden", pt: "Ponto de reposicao" }, slots: ["setup"], span: true }
      ]
    },
    inv: {
      here: { dash: 1 },
      sections: [
        { title: { en: "On hand", es: "En mano", pt: "Em estoque" }, slots: ["floor"], span: true },
        { title: { en: "Feeds", es: "Fuentes", pt: "Fontes" }, slots: ["health"] },
        { title: { en: "Output", es: "Produccion", pt: "Producao" }, slots: ["trend"] }
      ]
    },
    mixing: {
      here: { mixing: 1 },
      sections: null
    },
    pmac: {
      here: { pmac: 1 },
      sections: null
    },
    ful: {
      here: { ordersRetail: 1, ordersEcom: 1 },
      sections: null
    }
  };

  var PROD_SECTIONS = [
    { title: { en: "This shift", es: "Este turno", pt: "Este turno" }, slots: ["today"] },
    { title: { en: "Materials", es: "Materiales", pt: "Materiais" }, slots: ["consume"] },
    { title: { en: "Log output", es: "Registrar", pt: "Registrar" }, slots: ["log"] },
    { title: { en: "Make next", es: "Hacer luego", pt: "Fazer a seguir" }, slots: ["makenext"] },
    { title: { en: "Still to build", es: "Falta producir", pt: "Falta produzir" }, slots: ["build"] },
    { title: { en: "Allen check", es: "Revision Allen", pt: "Revisao Allen" }, slots: ["allen"] },
    { title: { en: "Scheduled", es: "Programado", pt: "Programado" }, slots: ["scheduled"] },
    { title: { en: "This week", es: "Esta semana", pt: "Esta semana" }, slots: ["results"], span: true }
  ];
  PLANS.mixing.sections = PROD_SECTIONS;
  PLANS.pmac.sections = PROD_SECTIONS;

  function fulSections(here) {
    var retail = here === "ordersRetail";
    return [
      {
        title: retail
          ? { en: "Retail orders", es: "Ordenes retail", pt: "Pedidos varejo" }
          : { en: "E-Commerce orders", es: "Ordenes e-commerce", pt: "Pedidos e-commerce" },
        slots: ["lane"],
        span: true
      }
    ];
  }

  function planFor(dept, here) {
    var plan = PLANS[dept];
    if (!plan || !plan.here[here]) return null;
    if (dept === "ful") return { sections: fulSections(here) };
    return plan;
  }

  function take(bySlot, names) {
    var out = [];
    for (var i = 0; i < names.length; i++) {
      var node = bySlot[names[i]];
      if (node) out.push(node);
    }
    return out;
  }

  function addSection(board, spec, nodes) {
    if (!nodes.length) return;
    if (!spec.title) {
      var hold = document.createElement("div");
      hold.className = "dept-span-full";
      nodes.forEach(function (n) { hold.appendChild(n); });
      board.appendChild(hold);
      return;
    }
    var sec = document.createElement("section");
    sec.className = "dept-section" + (spec.span ? " dept-span-full" : "");
    var h = document.createElement("h3");
    h.className = "dept-sec";
    h.textContent = tx(spec.title);
    sec.appendChild(h);
    if (nodes.length > 1) {
      var grid = document.createElement("div");
      grid.className = "dept-grid";
      nodes.forEach(function (n) { grid.appendChild(n); });
      sec.appendChild(grid);
    } else {
      nodes.forEach(function (n) { sec.appendChild(n); });
    }
    board.appendChild(sec);
  }

  function paint() {
    if (painting) return;
    var view = document.getElementById("view");
    var shell = document.getElementById("dept-shell");
    if (!view || !shell) return;
    var dept = shell.getAttribute("data-dept") || "";
    var here = shell.getAttribute("data-here") || "";
    var plan = planFor(dept, here);
    if (!plan) return;
    var existing = view.querySelector(".dept-board[data-dept-board]");
    if (existing && existing.getAttribute("data-dept") === dept && existing.getAttribute("data-here") === here && existing.getAttribute("data-lang") === lang()) return;
    var cards = view.querySelectorAll(".card[data-slot]");
    if (!cards.length) return;
    var bySlot = {};
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].closest(".dept-board")) continue;
      bySlot[cards[i].getAttribute("data-slot")] = cards[i];
    }
    if (!Object.keys(bySlot).length) return;
    painting = true;
    try {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      var board = document.createElement("div");
      board.className = "dept-board";
      board.setAttribute("data-dept-board", dept);
      board.setAttribute("data-dept", dept);
      board.setAttribute("data-here", here);
      board.setAttribute("data-lang", lang());
      var anchor = null;
      var keys = Object.keys(bySlot);
      for (var k = 0; k < keys.length; k++) {
        if (!anchor || (bySlot[keys[k]].compareDocumentPosition(anchor) & 4)) anchor = bySlot[keys[k]];
      }
      if (anchor && anchor.parentNode === view) view.insertBefore(board, anchor);
      else view.appendChild(board);
      plan.sections.forEach(function (spec) {
        addSection(board, spec, take(bySlot, spec.slots));
      });
    } finally {
      painting = false;
    }
  }

  function boot() {
    var view = document.getElementById("view");
    if (!view) return;
    if (typeof MutationObserver === "function" && !view.__deptBoardObs) {
      var obs = new MutationObserver(function () { paint(); });
      view.__deptBoardObs = obs;
      obs.observe(view, { childList: true });
    }
    paint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

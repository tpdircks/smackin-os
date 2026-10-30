/* ============================================================================
   Smackin' OS - Inventory visual floor view  (inventory-visual.js)
   Presentation only. Enhances the Inventory "Overview" screen (viewDash) after
   app.js renders it:
     - grouped product cards: category, then flavor, then size
     - real bag photos (SKU Lookup image_url first, then the Shopify CDN map
       already used in app.js, then a neutral placeholder)
     - big on-hand totals plus a location breakdown per item
     - sticky filter chips (group, size, in stock only) and a search box that
       also matches locations
     - action buttons that only navigate to the existing Receive / Adjust /
       Move / Count / Returns / Locations screens and prefill the item code and
       location. Saving still happens on those screens with their own buttons.
   Also adds light body classes for Receive, Returns, Adjust, Move and Count so
   inventory-visual.css can enlarge inputs and make the primary button obvious.

   Rules kept:
     - No stock writes. Totals come from DB.onHand (SUM(qty)); location chips
       are DB.stock() rows for the same item key that DB.onHand resolves.
     - No app.js edit, no timers. One MutationObserver on #view.
     - The original table stays in the DOM; a "Table" toggle shows it again.
   ==========================================================================*/
(function () {
  "use strict";
  if (window.SMK_INV_VISUAL) return;

  var VERSION = "1";
  var LS_KEY = "smk-invvis";
  var CDN = "https://smackinsunflowerseeds.com/cdn/shop/files/";
  // Same files as FLAVOR_IMG in app.js, larger width for cards.
  var FLAVOR_IMG = {
    ogoriginal: CDN + "OG_4_Front_c5bc8bec-283d-41cf-86c0-424b7a0c7e0a.png?width=240",
    original: CDN + "OG_4_Front_c5bc8bec-283d-41cf-86c0-424b7a0c7e0a.png?width=240",
    cinnamonchurro: CDN + "CinnamonChurro_4_Front_6c915739-af26-4377-b9b3-1154291fe004.png?width=240",
    backyardbbq: CDN + "BackyardBBQ_4_Front_9369d97c-6a51-45aa-bc06-ab665870f497.png?width=240",
    garlicparmesan: CDN + "GarlicParmesan_4_Front_82d20d78-b47e-4491-9348-c46a82699860.png?width=240",
    dillpickle: CDN + "DillPickle_4_Front_7b599062-fd89-4279-9c87-f4e74c0eea5d.png?width=240",
    cheddarjalapeno: CDN + "CheddarJalapeno_4_Front_c78f4ffd-4063-43a3-a8dd-0bcf6b53729c.png?width=240",
    ranch: CDN + "Ranch_4_Front_80238a8d-81ef-4769-8e0f-ac04663a6534.png?width=240",
    sourcreamonion: CDN + "SourCream_Onion_4_Front_d1bf59f8-2d3b-4f2a-a69e-a3dea130cd27.png?width=240",
    maplebrownsugar: CDN + "MapleBrownSugar_4_Front_2112beec-1fb1-45f6-89ff-ef72a70fe05f.png?width=240",
    lemonpepper: CDN + "LemonPepper_4_Front_2b7bf9f2-5012-4f7f-adc0-ac1e54696466.png?width=240",
    crackedpepper: CDN + "CrackedPepper_4_Front_59837e87-ef45-4540-8540-f98da28bdea2.png?width=240",
    cheeseburger: CDN + "09.09.25_PDP_LTO_Cheeseburger_6Bags.png?width=240",
    honeybbq: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=240",
    arodhoneybbq: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=240",
    honeybbqarod: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=240",
    pizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=240",
    deepdishpizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=240",
    pcapizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=240",
    saltvinegar: CDN + "PDPs_GoodGood6Bag.png?width=240",
    goodgoodsaltvinegar: CDN + "PDPs_GoodGood6Bag.png?width=240",
    guacamole: CDN + "PDPs_6Bag_Guac.png?width=240",
    salsa: CDN + "PDPs_6Bag_Salsa.png?width=240",
    taco: CDN + "PDPs_6Bag_Taco.png?width=240",
    sweetthaichili: CDN + "PDPs_6bagSTC.png?width=240",
    loadedpotato: CDN + "PDPs_6bagLP.png?width=240",
    blueberrypie: CDN + "04.30.26_PDP_LTO_BlueberryPie-6Bags.png?width=240",
    spicyqueso: CDN + "PDPs_SpicyQueso_6Bag.png?width=240",
    chilicheesedog: CDN + "04.30.26_PDP_LTO_ChiliCheeseDog-6Bags.png?width=240",
    baconmaccheese: CDN + "04.30.26_PDP_LTO_BaconMac_Cheese-6Bags.png?width=240"
  };

  var GROUPS = [
    { k: "bags", cats: ["bag4", "bag15"], byFlavor: true, icon: "\uD83D\uDECD\uFE0F" },
    { k: "film", cats: ["film4", "film15"], byFlavor: true, icon: "\uD83C\uDF9E\uFE0F" },
    { k: "seasoning", cats: ["seasoning"], byFlavor: true, icon: "\uD83E\uDDC2" },
    { k: "seed", cats: ["seed"], byFlavor: false, icon: "\uD83C\uDF3B" },
    { k: "packaging", cats: ["packaging", "bucket", "display", "mastercase", "supply"], byFlavor: false, icon: "\uD83D\uDCE6" },
    { k: "other", cats: [], byFlavor: false, icon: "\uD83D\uDDC2\uFE0F" }
  ];
  var SIZE_OF = { bag4: "4 oz", film4: "4 oz", bag15: "1.5 oz", film15: "1.5 oz" };
  var HOLD = { "RETURNS-HOLD": 1, "QUARANTINE": 1, "QA-HOLD": 1 };
  var LOC_SHOW = 6;

  var TXT = {
    en: { title: "Floor view", sub: "Grouped by product, flavor and size. Tap a location to move from it.",
      cards: "Cards", table: "Table", all: "All", bags: "Bags", film: "Film", seasoning: "Seasoning", seed: "Seed / Base",
      packaging: "Packaging", other: "Other", allSizes: "All sizes", instock: "In stock only", search: "Search flavor, code or location",
      receive: "Receive", adjust: "Adjust", move: "Move", count: "Count", returns: "Returns", locations: "Locations",
      adjustCounts: "Adjust counts", movePick: "Move / Pick", cycle: "Cycle count",
      avail: "available", held: "held", more: "more", noLoc: "No location rows", none: "Nothing matches these filters.",
      items: "items", out: "OUT", low: "LOW", ok: "OK", lots: "lots" },
    es: { title: "Vista de piso", sub: "Agrupado por producto, sabor y tamano. Toca una ubicacion para mover desde ahi.",
      cards: "Tarjetas", table: "Tabla", all: "Todo", bags: "Bolsas", film: "Pelicula", seasoning: "Sazon", seed: "Semilla / Base",
      packaging: "Empaque", other: "Otros", allSizes: "Todos", instock: "Solo con stock", search: "Buscar sabor, codigo o ubicacion",
      receive: "Recibir", adjust: "Ajustar", move: "Mover", count: "Contar", returns: "Devoluciones", locations: "Ubicaciones",
      adjustCounts: "Ajustar conteos", movePick: "Mover / Sacar", cycle: "Conteo ciclico",
      avail: "disponible", held: "retenido", more: "mas", noLoc: "Sin ubicaciones", none: "Nada coincide con estos filtros.",
      items: "articulos", out: "AGOTADO", low: "BAJO", ok: "OK", lots: "lotes" },
    pt: { title: "Visao do piso", sub: "Agrupado por produto, sabor e tamanho. Toque em um local para mover dele.",
      cards: "Cartoes", table: "Tabela", all: "Tudo", bags: "Sacos", film: "Filme", seasoning: "Tempero", seed: "Semente / Base",
      packaging: "Embalagem", other: "Outros", allSizes: "Todos", instock: "So com estoque", search: "Buscar sabor, codigo ou local",
      receive: "Receber", adjust: "Ajustar", move: "Mover", count: "Contar", returns: "Devolucoes", locations: "Locais",
      adjustCounts: "Ajustar contagens", movePick: "Mover / Separar", cycle: "Contagem ciclica",
      avail: "disponivel", held: "retido", more: "mais", noLoc: "Sem locais", none: "Nada corresponde aos filtros.",
      items: "itens", out: "SEM", low: "BAIXO", ok: "OK", lots: "lotes" }
  };

  // ---------- small helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { n = Number(n) || 0; return (Math.round(n * 100) / 100).toLocaleString("en-US"); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function t(k) { var d = TXT[lang()] || TXT.en; return d[k] != null ? d[k] : (TXT.en[k] != null ? TXT.en[k] : k); }
  function db() { return window.DB && typeof window.DB.items === "function" ? window.DB : null; }

  var st = (function () {
    var d = { mode: "cards", grp: "all", size: "all", q: "", instock: false };
    try { var s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); for (var k in d) if (s[k] != null && k !== "q") d[k] = s[k]; } catch (e) {}
    return d;
  })();
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify({ mode: st.mode, grp: st.grp, size: st.size, instock: st.instock })); } catch (e) {} }

  // ---------- images ----------
  var PH = {};
  function placeholder(group) {
    if (PH[group]) return PH[group];
    var g = GROUPS.filter(function (x) { return x.k === group; })[0] || GROUPS[GROUPS.length - 1];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
      '<rect width="120" height="120" rx="16" fill="#E1EEF7"/><text x="60" y="74" font-size="46" text-anchor="middle">' + g.icon + '</text></svg>';
    PH[group] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return PH[group];
  }
  function flavorImg(text) {
    var k = norm(text);
    if (!k) return "";
    if (FLAVOR_IMG[k]) return FLAVOR_IMG[k];
    var keys = Object.keys(FLAVOR_IMG).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) if (k.indexOf(keys[i]) >= 0) return FLAVOR_IMG[keys[i]];
    return "";
  }
  function catalogImg(it) {
    var D = db(); if (!D || typeof D.skuCatalogGet !== "function") return "";
    var keys = [it.code, it.id];
    for (var i = 0; i < keys.length; i++) {
      try { var c = keys[i] ? D.skuCatalogGet(keys[i]) : null; if (c && c.image_url) return String(c.image_url); } catch (e) {}
    }
    return "";
  }
  function imgFor(it, group) {
    var u = catalogImg(it);
    if (u) return u;
    if (group === "bags" || group === "film" || group === "seasoning" || it.category === "mastercase") {
      u = flavorImg(it.flavor) || flavorImg(it.name);
      if (u) return u;
    }
    return placeholder(group);
  }

  // ---------- data (read only) ----------
  function groupOf(cat) {
    for (var i = 0; i < GROUPS.length - 1; i++) if (GROUPS[i].cats.indexOf(cat) >= 0) return GROUPS[i].k;
    return "other";
  }
  // Same key choice as DB.onHand -> resolveItemId: rows by id first, else by code.
  function rowsFor(it, stock) {
    var byId = [], byCode = [];
    for (var i = 0; i < stock.length; i++) {
      var r = stock[i]; if (!r) continue;
      if (r.item_id === it.id) byId.push(r); else if (it.code && r.item_id === it.code) byCode.push(r);
    }
    return byId.length ? byId : byCode;
  }
  function locBreakdown(rows) {
    var m = {}, order = [];
    rows.forEach(function (r) {
      var l = r.location || "?";
      if (!m[l]) { m[l] = { loc: l, qty: 0, lots: 0 }; order.push(l); }
      m[l].qty += Number(r.qty) || 0;
      if (r.lot) m[l].lots++;
    });
    return order.map(function (l) { return m[l]; }).filter(function (x) { return Math.abs(x.qty) > 0.0001; })
      .sort(function (a, b) { return b.qty - a.qty; });
  }
  function itemInfo(it, stock) {
    var D = db();
    var total = D.onHand(it.id);
    var held = 0; try { held = D.heldOnHand ? D.heldOnHand(it.id) : 0; } catch (e) { held = 0; }
    var avail = total - held;
    var stat = avail <= 0 ? "out" : (avail < (Number(it.reorder) || 0) ? "low" : "ok");
    return { it: it, total: total, held: held, avail: avail, stat: stat, size: SIZE_OF[it.category] || "", locs: locBreakdown(rowsFor(it, stock)) };
  }
  function sizeRank(s) { return s === "4 oz" ? 0 : s === "1.5 oz" ? 1 : 2; }

  function buildModel() {
    var D = db(); if (!D) return [];
    var stock = (D.stock && D.stock()) || [];
    var q = norm(st.q);
    var groups = {};
    GROUPS.forEach(function (g) { groups[g.k] = { g: g, cards: {}, order: [] }; });
    D.items().forEach(function (it) {
      if (!it || !it.id) return;
      var gk = groupOf(it.category);
      if (st.grp !== "all" && st.grp !== gk) return;
      var size = SIZE_OF[it.category] || "";
      if (st.size !== "all" && size && size !== st.size) return;
      if (st.size !== "all" && !size && (gk === "bags" || gk === "film")) return;
      var info = itemInfo(it, stock);
      if (st.instock && !(info.total > 0)) return;
      if (q) {
        var hay = norm([it.name, it.code, it.id, it.flavor, it.category].join(" ") + " " + info.locs.map(function (l) { return l.loc; }).join(" "));
        if (hay.indexOf(q) < 0) return;
      }
      var G = groups[gk];
      var key = G.g.byFlavor ? "f:" + norm(it.flavor || it.name) : "i:" + it.id;
      if (!G.cards[key]) {
        G.cards[key] = { key: key, title: G.g.byFlavor ? (it.flavor || it.name) : it.name, rows: [], img: "", sortKey: String(it.code || it.id) };
        G.order.push(key);
      }
      var C = G.cards[key];
      C.rows.push(info);
      if (!C.img || C.img.indexOf("data:") === 0) C.img = imgFor(it, gk);
      if (String(it.code || it.id) < C.sortKey) C.sortKey = String(it.code || it.id);
    });
    return GROUPS.map(function (g) {
      var G = groups[g.k];
      var cards = G.order.map(function (k) { var c = G.cards[k]; c.rows.sort(function (a, b) { return sizeRank(a.size) - sizeRank(b.size) || String(a.it.code).localeCompare(String(b.it.code)); }); return c; });
      cards.sort(function (a, b) {
        if (g.byFlavor) return codeRank(a.sortKey) - codeRank(b.sortKey) || a.sortKey.localeCompare(b.sortKey);
        return String(a.title).localeCompare(String(b.title));
      });
      return { g: g, cards: cards };
    }).filter(function (x) { return x.cards.length; });
  }
  // Core flavors (S01..) before LTO (L01..) before anything else.
  function codeRank(code) { var c = String(code).replace(/^[A-Z0-9]+-/i, ""); return /^S\d/i.test(c) ? 0 : /^L\d/i.test(c) ? 1 : 2; }

  // ---------- markup ----------
  function pill(stat) { return '<span class="pill ' + stat + '">' + t(stat) + '</span>'; }
  function rowHtml(r) {
    var it = r.it;
    var chips = r.locs.slice(0, LOC_SHOW).map(function (l) {
      return '<button type="button" class="ivx-loc' + (HOLD[l.loc] ? " hold" : "") + '" data-act="move" data-id="' + esc(it.id) + '" data-loc="' + esc(l.loc) + '" title="' + esc(t("move") + " " + l.loc) + '">' +
        '<span class="ivx-locname">' + esc(l.loc) + '</span><b>' + fmt(l.qty) + '</b>' + (l.lots > 1 ? '<span class="ivx-lots">' + l.lots + ' ' + t("lots") + '</span>' : '') + '</button>';
    }).join("");
    var extra = r.locs.length > LOC_SHOW ? '<button type="button" class="ivx-loc ivx-more" data-act="morelocs">+' + (r.locs.length - LOC_SHOW) + ' ' + t("more") + '</button>' +
      '<span class="ivx-hidden">' + r.locs.slice(LOC_SHOW).map(function (l) {
        return '<button type="button" class="ivx-loc' + (HOLD[l.loc] ? " hold" : "") + '" data-act="move" data-id="' + esc(it.id) + '" data-loc="' + esc(l.loc) + '"><span class="ivx-locname">' + esc(l.loc) + '</span><b>' + fmt(l.qty) + '</b></button>';
      }).join("") + '</span>' : "";
    var heldNote = r.held > 0 ? '<div class="ivx-heldnote">' + fmt(r.avail) + ' ' + t("avail") + ' &middot; ' + fmt(r.held) + ' ' + t("held") + '</div>' : "";
    return '<div class="ivx-row st-' + r.stat + '">' +
      '<div class="ivx-rowtop">' + (r.size ? '<span class="ivx-size">' + esc(r.size) + '</span>' : '') +
        '<span class="ivx-code">' + esc(it.code || it.id) + '</span>' + pill(r.stat) + '</div>' +
      '<div class="ivx-total"><b>' + fmt(r.total) + '</b> <span>' + esc(it.unit || "") + '</span></div>' + heldNote +
      '<div class="ivx-locs">' + (chips || '<span class="muted sm">' + t("noLoc") + '</span>') + extra + '</div>' +
      '<div class="ivx-rowbtns">' +
        '<button type="button" class="ivx-btn" data-act="adjust" data-id="' + esc(it.id) + '">' + t("adjust") + '</button>' +
        '<button type="button" class="ivx-btn" data-act="move" data-id="' + esc(it.id) + '" data-loc="' + esc(r.locs[0] ? r.locs[0].loc : "") + '">' + t("move") + '</button>' +
        '<button type="button" class="ivx-btn" data-act="count" data-id="' + esc(it.id) + '" data-loc="' + esc(r.locs[0] ? r.locs[0].loc : "") + '">' + t("count") + '</button>' +
      '</div></div>';
  }
  function cardHtml(c) {
    var worst = c.rows.some(function (r) { return r.stat === "out"; }) ? "out" : c.rows.some(function (r) { return r.stat === "low"; }) ? "low" : "ok";
    var units = {}; c.rows.forEach(function (r) { var u = r.it.unit || ""; units[u] = (units[u] || 0) + r.total; });
    var uk = Object.keys(units);
    var head = c.rows.length > 1 && uk.length === 1 ? '<div class="ivx-cardtotal"><b>' + fmt(units[uk[0]]) + '</b> ' + esc(uk[0]) + '</div>' : "";
    return '<div class="ivx-card st-' + worst + '">' +
      '<div class="ivx-cardhead"><img class="ivx-img" src="' + esc(c.img) + '" alt="" loading="lazy" decoding="async">' +
        '<div class="ivx-cardtitle"><h3>' + esc(c.title) + '</h3>' + head + '</div></div>' +
      c.rows.map(rowHtml).join("") + '</div>';
  }
  function groupSummary(G) {
    var units = {}, n = 0;
    G.cards.forEach(function (c) { c.rows.forEach(function (r) { n++; var u = r.it.unit || ""; units[u] = (units[u] || 0) + r.total; }); });
    var parts = Object.keys(units).map(function (u) { return '<b>' + fmt(units[u]) + '</b> ' + esc(u); });
    if (G.g.k === "bags") {
      var by = {}; G.cards.forEach(function (c) { c.rows.forEach(function (r) { if (r.size) by[r.size] = (by[r.size] || 0) + r.total; }); });
      parts = Object.keys(by).sort(function (a, b) { return sizeRank(a) - sizeRank(b); }).map(function (s) { return esc(s) + ': <b>' + fmt(by[s]) + '</b>'; }).concat(parts);
    }
    return '<span class="ivx-gsum">' + n + ' ' + t("items") + ' &middot; ' + parts.join(" &middot; ") + '</span>';
  }
  function gridHtml() {
    var model = buildModel();
    if (!model.length) return '<p class="hint ivx-empty">' + t("none") + '</p>';
    return model.map(function (G) {
      return '<section class="ivx-group" data-grp="' + G.g.k + '"><div class="ivx-ghead"><h2>' + G.g.icon + ' ' + t(G.g.k) + '</h2>' + groupSummary(G) + '</div>' +
        '<div class="ivx-grid">' + G.cards.map(cardHtml).join("") + '</div></section>';
    }).join("");
  }
  function chip(kind, val, label) {
    var on = (kind === "grp" && st.grp === val) || (kind === "size" && st.size === val) || (kind === "mode" && st.mode === val);
    return '<button type="button" class="ivx-chip' + (on ? " on" : "") + '" data-' + kind + '="' + val + '">' + label + '</button>';
  }
  function barHtml() {
    var grp = [["all", t("all")], ["bags", t("bags")], ["film", t("film")], ["seasoning", t("seasoning")], ["seed", t("seed")], ["packaging", t("packaging")], ["other", t("other")]]
      .map(function (x) { return chip("grp", x[0], x[1]); }).join("");
    var size = chip("size", "all", t("allSizes")) + chip("size", "4 oz", "4 oz") + chip("size", "1.5 oz", "1.5 oz");
    return '<div class="ivx-bar">' +
      '<div class="ivx-chips">' + grp + '</div>' +
      '<div class="ivx-chips">' + size +
        '<button type="button" class="ivx-chip' + (st.instock ? " on" : "") + '" data-instock="1">' + t("instock") + '</button>' +
        '<span class="ivx-mode">' + chip("mode", "cards", t("cards")) + chip("mode", "table", t("table")) + '</span></div>' +
      '<input id="ivx-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="' + esc(t("search")) + '" value="' + esc(st.q) + '">' +
      '</div>';
  }
  function actionsHtml() {
    var a = [["receive", t("receive"), "ivx-primary"], ["adjust", t("adjustCounts"), ""], ["move", t("movePick"), ""], ["count", t("cycle"), ""], ["returns", t("returns"), ""], ["locations", t("locations"), ""]];
    return '<div class="ivx-actions">' + a.map(function (x) { return '<button type="button" class="ivx-action ' + x[2] + '" data-go="' + x[0] + '">' + x[1] + '</button>'; }).join("") + '</div>';
  }
  function rootHtml() {
    return '<div class="ivx-head"><div><h2 class="ivx-title">' + t("title") + '</h2><p class="hint">' + t("sub") + '</p></div></div>' +
      actionsHtml() + barHtml() + '<div id="ivx-body">' + (st.mode === "cards" ? gridHtml() : "") + '</div>';
  }

  // ---------- navigation helpers (no writes; the target screen's own button saves) ----------
  function itemById(id) { var D = db(); if (!D) return null; return D.items().filter(function (i) { return i.id === id; })[0] || null; }
  function setVal(id, v) {
    var el = $(id); if (!el || v == null || v === "") return el;
    el.value = v;
    try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    return el;
  }
  function focusEl(el) { if (!el) return; try { el.scrollIntoView({ block: "center" }); el.focus(); } catch (e) {} }
  function go(tab) { if (typeof window.UI_go === "function") { window.UI_go(tab); return true; } return false; }
  function goAdjust(it) {
    if (!go("adjust")) return;
    var s = setVal("adjSearch", it.code || it.id);
    if (s && window.UI && typeof window.UI.adjSearch === "function") window.UI.adjSearch(it.code || it.id);
    focusEl($("adj-" + it.id));
  }
  function goMove(it, loc) {
    if (!go("move")) return;
    setVal("m-code", it.code || it.id);
    if (loc) setVal("m-from", loc);
    focusEl($(loc ? "m-to" : "m-from"));
  }
  function goCount(it, loc) {
    if (!go("count")) return;
    setVal("c-code", it.code || it.id);
    if (loc) setVal("c-loc", loc);
    focusEl($(loc ? "c-qty" : "c-loc"));
  }

  // ---------- wiring ----------
  function renderBody() { var b = $("ivx-body"); if (b) b.innerHTML = st.mode === "cards" ? gridHtml() : ""; }
  function applyMode(card) {
    card = card || ($("ivx-root") && $("ivx-root").closest(".card"));
    if (card) card.classList.toggle("ivx-cardsmode", st.mode === "cards");
  }
  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest("button") : null;
    if (!el || !el.closest("#ivx-root")) return;
    var a;
    if ((a = el.getAttribute("data-go"))) { go(a); return; }
    if ((a = el.getAttribute("data-grp"))) { st.grp = a; save(); refreshBar(); renderBody(); return; }
    if ((a = el.getAttribute("data-size"))) { st.size = a; save(); refreshBar(); renderBody(); return; }
    if ((a = el.getAttribute("data-mode"))) { st.mode = a; save(); refreshBar(); applyMode(); renderBody(); return; }
    if (el.getAttribute("data-instock")) { st.instock = !st.instock; save(); refreshBar(); renderBody(); return; }
    a = el.getAttribute("data-act");
    if (a === "morelocs") { var p = el.parentNode; if (p) p.classList.add("ivx-showall"); return; }
    var it = itemById(el.getAttribute("data-id"));
    if (!it) return;
    var loc = el.getAttribute("data-loc") || "";
    if (a === "adjust") goAdjust(it);
    else if (a === "move") goMove(it, loc);
    else if (a === "count") goCount(it, loc);
  }
  function refreshBar() {
    var root = $("ivx-root"); if (!root) return;
    var old = root.querySelector(".ivx-bar"); if (!old) return;
    var q = $("ivx-q"), hadFocus = q && document.activeElement === q;
    var tmp = document.createElement("div"); tmp.innerHTML = barHtml();
    old.parentNode.replaceChild(tmp.firstChild, old);
    if (hadFocus) focusEl($("ivx-q"));
  }
  function onInput(e) {
    if (!e.target || e.target.id !== "ivx-q") return;
    st.q = e.target.value || "";
    renderBody();
  }
  function onImgError(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || !img.classList.contains("ivx-img") || img.__ivxPh) return;
    img.__ivxPh = true;
    var g = img.closest(".ivx-group");
    img.src = placeholder(g ? g.getAttribute("data-grp") : "other");
  }

  function mountDash() {
    var tb = $("dashBody");
    if (!tb || $("ivx-root") || !db()) return;
    var card = tb.closest(".card"); if (!card) return;
    var root = document.createElement("div");
    root.id = "ivx-root";
    root.innerHTML = rootHtml();
    var anchor = card.querySelector(".catbar");
    if (anchor) card.insertBefore(root, anchor); else card.appendChild(root);
    card.classList.add("ivx-dashcard");
    applyMode(card);
  }
  function setBodyClass(name, on) { var b = document.body; if (b && b.classList.contains(name) !== on) b.classList.toggle(name, on); }
  function tagForms() {
    setBodyClass("ivx-recv", !!$("r-qty"));
    setBodyClass("ivx-ret", !!$("rw-root"));
    setBodyClass("ivx-form", !!($("m-code") || $("c-code") || $("adjBody") || $("p-code")));
    setBodyClass("ivx-inv", !!$("dashBody"));
  }
  var busy = false;
  function onView() {
    if (busy) return; busy = true;
    try { tagForms(); mountDash(); } catch (e) { try { console.warn("inventory-visual", e); } catch (x) {} }
    finally { busy = false; }
  }
  function boot() {
    var view = $("view"); if (!view || view.__ivxObs) return;
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(onView);
      view.__ivxObs = obs;
      obs.observe(view, { childList: true });
    }
    view.addEventListener("click", onClick);
    view.addEventListener("input", onInput);
    view.addEventListener("error", onImgError, true);
    onView();
  }

  window.SMK_INV_VISUAL = {
    version: VERSION,
    refresh: function () { var r = $("ivx-root"); if (r) { r.innerHTML = rootHtml(); applyMode(); } else onView(); },
    imgFor: function (codeOrId) { var D = db(); var it = D && D.itemByCode ? D.itemByCode(codeOrId) : null; return it ? imgFor(it, groupOf(it.category)) : ""; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

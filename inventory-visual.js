/* ============================================================================
   Smackin' OS - Inventory visual floor view  (inventory-visual.js)
   Presentation only. Enhances the Inventory "Overview" screen (viewDash) after
   app.js renders it. Grouping follows Matt Bollinger's SMACKIN' WIP.xlsx
   (Current Inventory + Raw Inventory, as of Oct 29, 2026):

     Finished Goods — one card per flavor. Core flavors are the CORE_FLAVORS
     array below, in that exact order. Each card stacks 1.5 oz bags, 4 oz bags,
     and Master Case (category mastercase, linked by flavor). Limited runs sit
     in a subsection after the core list.
     Raw Goods — Packaging (film4/film15 by flavor), Seasoning, Sunflower Seeds
     (category seed, minus adhesion), Adhesion (maltodextrin), then
     Containers / Shippers (packaging, bucket, display, supply). Master cases
     stay on the finished-goods card, not in containers.

   Also:
     - real bag photos (SKU Lookup image_url first, then the Shopify CDN map
       already used in app.js, then a neutral placeholder)
     - big on-hand totals plus a location breakdown per item
     - sticky filter chips (group, size, in stock only) and a search box that
       also matches locations
   - per-item buttons that only navigate to Adjust / Move / Count and prefill
     the item code and location. Saving still happens on those screens.
     The department shell (dept-homes.js) owns the Inventory subtabs and the
     Actions row (Receive, Adjust, Count, Move, Alerts).
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
  if (typeof window !== "undefined" && window.SMK_INV_VISUAL) return;

  var VERSION = "2";
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
    // Short WIP names resolve to the same bag photo as the catalog flavor.
    theog: CDN + "OG_4_Front_c5bc8bec-283d-41cf-86c0-424b7a0c7e0a.png?width=240",
    og: CDN + "OG_4_Front_c5bc8bec-283d-41cf-86c0-424b7a0c7e0a.png?width=240",
    churro: CDN + "CinnamonChurro_4_Front_6c915739-af26-4377-b9b3-1154291fe004.png?width=240",
    garlicparm: CDN + "GarlicParmesan_4_Front_82d20d78-b47e-4491-9348-c46a82699860.png?width=240",
    maple: CDN + "MapleBrownSugar_4_Front_2112beec-1fb1-45f6-89ff-ef72a70fe05f.png?width=240",
    cheddarjal: CDN + "CheddarJalapeno_4_Front_c78f4ffd-4063-43a3-a8dd-0bcf6b53729c.png?width=240",
    cheddarjalapen: CDN + "CheddarJalapeno_4_Front_c78f4ffd-4063-43a3-a8dd-0bcf6b53729c.png?width=240",
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

  // WIP Current Inventory row order. Index 0 is the first card on the floor.
  // aliases are matched with norm() (lowercase, accents and punctuation removed).
  // Short names (OG, Churro, Garlic Parm, Maple, Cheddar Jal.) and catalog names
  // (OG Original, Cinnamon Churro, Garlic Parmesan, Maple Brown Sugar, Cheddar Jalapeno) share one card.
  var CORE_FLAVORS = [
    { id: "backyardbbq", title: "Backyard BBQ", aliases: ["backyardbbq", "backyardbarbecue", "bbq"] },
    { id: "dillpickle", title: "Dill Pickle", aliases: ["dillpickle", "dillpickles"] },
    { id: "og", title: "The OG", aliases: ["theog", "og", "ogoriginal", "original"] },
    { id: "crackedpepper", title: "Cracked Pepper", aliases: ["crackedpepper", "crackedblackpepper"] },
    { id: "churro", title: "Cinnamon Churro", aliases: ["cinnamonchurro", "churro"] },
    { id: "ranch", title: "Ranch", aliases: ["ranch"] },
    { id: "garlicparm", title: "Garlic Parmesan", aliases: ["garlicparmesan", "garlicparm", "garlicparmesean"] },
    { id: "maple", title: "Maple Brown Sugar", aliases: ["maplebrownsugar", "maple", "maplebs"] },
    { id: "cheddarjal", title: "Cheddar Jalapeño", aliases: ["cheddarjalapeno", "cheddarjal", "cheddarjalapen"] },
    { id: "lemonpepper", title: "Lemon Pepper", aliases: ["lemonpepper"] },
    { id: "sourcream", title: "Sour Cream & Onion", aliases: ["sourcreamonion", "sourcreamandonion"] }
  ];
  var CORE_INDEX = {};
  CORE_FLAVORS.forEach(function (c, i) { CORE_INDEX[c.id] = i; });

  // super:"raw" subsections render under one Raw Goods heading, in this order.
  var GROUPS = [
    { k: "finished", super: "", cats: ["bag4", "bag15", "mastercase"], byFlavor: true, icon: "\uD83D\uDECD\uFE0F" },
    { k: "film", super: "raw", cats: ["film4", "film15"], byFlavor: true, icon: "\uD83C\uDF9E\uFE0F" },
    { k: "seasoning", super: "raw", cats: ["seasoning"], byFlavor: true, icon: "\uD83E\uDDC2" },
    { k: "seed", super: "raw", cats: ["seed"], byFlavor: false, icon: "\uD83C\uDF3B" },
    { k: "adhesion", super: "raw", cats: ["adhesion"], byFlavor: false, icon: "\uD83E\uDDEA" },
    { k: "containers", super: "raw", cats: ["packaging", "bucket", "display", "supply"], byFlavor: false, icon: "\uD83D\uDCE6" },
    { k: "other", super: "", cats: [], byFlavor: false, icon: "\uD83D\uDDC2\uFE0F" }
  ];
  var GRP_OK = { all: 1, finished: 1, film: 1, seasoning: 1, seed: 1, adhesion: 1, containers: 1, other: 1 };
  var GRP_ALIAS = { bags: "finished", packaging: "containers" };
  var SIZE_OF = { bag4: "4 oz", film4: "4 oz", bag15: "1.5 oz", film15: "1.5 oz" };
  var GENERIC_FLAVOR = { rawseed: 1, base: 1, bucket: 1, packaging: 1, display: 1, supply: 1, other: 1 };
  var HOLD = { "RETURNS-HOLD": 1, "QUARANTINE": 1, "QA-HOLD": 1 };
  var LOC_SHOW = 6;

  var TXT = {
    en: { title: "Floor view", sub: "Finished goods by flavor (1.5 oz, 4 oz, master case), then raw goods in WIP order.",
      cards: "Cards", table: "Table", all: "All",
      finished: "Finished Goods", lto: "Limited runs", raw: "Raw Goods",
      rawsub: "Packaging, seasoning, sunflower seeds, adhesion, then containers.",
      film: "Packaging", seasoning: "Seasoning", seed: "Sunflower Seeds", adhesion: "Adhesion",
      containers: "Containers / Shippers", other: "Other", mastercase: "Master Case",
      allSizes: "All sizes", instock: "In stock only", search: "Search flavor, code or location",
      receive: "Receive", adjust: "Adjust", move: "Move", count: "Count", returns: "Returns", locations: "Locations",
      adjustCounts: "Adjust counts", movePick: "Move / Pick", cycle: "Cycle count",
      avail: "available", held: "held", more: "more", noLoc: "No location rows", none: "Nothing matches these filters.",
      items: "items", out: "OUT", low: "LOW", ok: "OK", lots: "lots" },
    es: { title: "Vista de piso", sub: "Producto terminado por sabor (1.5 oz, 4 oz, caja master), luego materia prima como el WIP.",
      cards: "Tarjetas", table: "Tabla", all: "Todo",
      finished: "Producto terminado", lto: "Ediciones limitadas", raw: "Materia prima",
      rawsub: "Empaque, sazon, semillas, adhesion y contenedores.",
      film: "Empaque", seasoning: "Sazon", seed: "Semillas de girasol", adhesion: "Adhesion",
      containers: "Contenedores / Cajas", other: "Otros", mastercase: "Caja master",
      allSizes: "Todos", instock: "Solo con stock", search: "Buscar sabor, codigo o ubicacion",
      receive: "Recibir", adjust: "Ajustar", move: "Mover", count: "Contar", returns: "Devoluciones", locations: "Ubicaciones",
      adjustCounts: "Ajustar conteos", movePick: "Mover / Sacar", cycle: "Conteo ciclico",
      avail: "disponible", held: "retenido", more: "mas", noLoc: "Sin ubicaciones", none: "Nada coincide con estos filtros.",
      items: "articulos", out: "AGOTADO", low: "BAJO", ok: "OK", lots: "lotes" },
    pt: { title: "Visao do piso", sub: "Produto acabado por sabor (1.5 oz, 4 oz, caixa master), depois materia-prima como o WIP.",
      cards: "Cartoes", table: "Tabela", all: "Tudo",
      finished: "Produto acabado", lto: "Edicoes limitadas", raw: "Materia-prima",
      rawsub: "Embalagem, tempero, sementes, adesao e conteineres.",
      film: "Embalagem", seasoning: "Tempero", seed: "Sementes de girassol", adhesion: "Adesao",
      containers: "Conteineres / Caixas", other: "Outros", mastercase: "Caixa master",
      allSizes: "Todos", instock: "So com estoque", search: "Buscar sabor, codigo ou local",
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
  function db() {
    if (typeof window === "undefined" || !window.DB || typeof window.DB.items !== "function") return null;
    return window.DB;
  }
  function catOf(it) {
    var raw = it && typeof it === "object" ? it.category : it;
    return String(raw || "").toLowerCase().replace(/[\s_-]+/g, "");
  }
  function groupByKey(k) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].k === k) return GROUPS[i];
    return GROUPS[GROUPS.length - 1];
  }

  var st = (function () {
    var d = { mode: "cards", grp: "all", size: "all", q: "", instock: false };
    try {
      var raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      var s = JSON.parse(raw || "{}");
      for (var k in d) if (s[k] != null && k !== "q") d[k] = s[k];
    } catch (e) {}
    if (GRP_ALIAS[d.grp]) d.grp = GRP_ALIAS[d.grp];
    if (!GRP_OK[d.grp]) d.grp = "all";
    if (d.size !== "all" && d.size !== "4 oz" && d.size !== "1.5 oz") d.size = "all";
    return d;
  })();
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify({ mode: st.mode, grp: st.grp, size: st.size, instock: st.instock })); } catch (e) {} }

  // ---------- flavor identity (WIP order) ----------
  function coreId(text) {
    var k = norm(text);
    if (!k) return "";
    var i, j, c, a, best = "", bestLen = 0;
    for (i = 0; i < CORE_FLAVORS.length; i++) {
      c = CORE_FLAVORS[i];
      for (j = 0; j < c.aliases.length; j++) if (k === c.aliases[j]) return c.id;
    }
    for (i = 0; i < CORE_FLAVORS.length; i++) {
      c = CORE_FLAVORS[i];
      for (j = 0; j < c.aliases.length; j++) {
        a = c.aliases[j];
        if (a.length < 4) continue;
        var hit = k.indexOf(a) === 0 || (a.length >= 6 && k.indexOf(a) >= 0);
        if (hit && a.length > bestLen) { best = c.id; bestLen = a.length; }
      }
    }
    return best;
  }
  function coreTitle(id) {
    for (var i = 0; i < CORE_FLAVORS.length; i++) if (CORE_FLAVORS[i].id === id) return CORE_FLAVORS[i].title;
    return "";
  }
  function flavorText(it) {
    var f = String((it && it.flavor) || "").trim();
    var name = String((it && it.name) || "").trim();
    if (f && !GENERIC_FLAVOR[norm(f)]) return f;
    var m = name.match(/\s[-–—]\s+(.+)$/);
    if (m && m[1]) return m[1].trim();
    return name || f;
  }
  function flavorCore(it) {
    return coreId(flavorText(it)) || coreId(it && it.name) || coreId(it && it.flavor) || "";
  }
  // Maltodextrin is category "seed" in the catalog. Pull it (and anything named adhesion) into its own raw subsection.
  function isAdhesion(it) {
    var h = norm([it && it.id, it && it.code, it && it.name, it && it.flavor].join(" "));
    return h.indexOf("maltodextrin") >= 0 || h.indexOf("malto") >= 0 || h.indexOf("adhesion") >= 0 || h.indexOf("clintose") >= 0;
  }
  // Generic shipper / RSC boxes are containers even if someone filed them as mastercase.
  // Flavored master cases (Target sleeve SLV-*, linked by item.flavor) stay on the finished card.
  function shipperMaster(it) {
    if (catOf(it) !== "mastercase") return false;
    var blob = [it.name, it.code, it.id, it.flavor].join(" ");
    if (/shipper|box\s*rsc/i.test(blob)) return true;
    if (!flavorCore(it) && /^\s*box\b/i.test(String(it.name || ""))) return true;
    return false;
  }
  function sectionOf(it) {
    var c = catOf(it);
    if (c === "adhesion" || (isAdhesion(it) && (c === "seed" || c === "base" || c === "other" || c === ""))) return "adhesion";
    if (c === "bag4" || c === "bag15") return "finished";
    if (c === "mastercase") return shipperMaster(it) ? "containers" : "finished";
    if (c === "film4" || c === "film15") return "film";
    if (c === "seasoning") return "seasoning";
    if (c === "seed") return "seed";
    if (c === "packaging" || c === "bucket" || c === "display" || c === "supply") return "containers";
    return "other";
  }
  function groupOf(it) {
    if (it && typeof it === "object") return sectionOf(it);
    return sectionOf({ category: it });
  }

  // ---------- images ----------
  var PH = {};
  function placeholder(group) {
    if (PH[group]) return PH[group];
    var g = groupByKey(group);
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
    var c = catOf(it);
    if (group === "finished" || group === "film" || group === "seasoning" || c === "mastercase" || c === "bag4" || c === "bag15") {
      u = flavorImg(it.flavor) || flavorImg(it.name) || flavorImg(flavorText(it));
      if (u) return u;
    }
    return placeholder(group);
  }
  function takeImg(card, it, gk) {
    var u = imgFor(it, gk);
    var ph = !u || u.indexOf("data:") === 0;
    var bag = catOf(it) === "bag4" || catOf(it) === "bag15";
    if (!card.img) { card.img = u; card.imgBag = bag && !ph; return; }
    if (card.imgBag) return;
    if (bag && !ph) { card.img = u; card.imgBag = true; return; }
    if (String(card.img).indexOf("data:") === 0 && !ph) card.img = u;
  }

  // ---------- data (read only) ----------
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
    return { it: it, total: total, held: held, avail: avail, stat: stat, locs: locBreakdown(rowsFor(it, stock)) };
  }
  // WIP row order on a flavor card: 1.5 oz, then 4 oz, then Master Case.
  function rowRank(r) {
    var c = catOf(r.it);
    if (c === "bag15" || c === "film15") return 0;
    if (c === "bag4" || c === "film4") return 1;
    if (c === "mastercase") return 2;
    return 3;
  }
  function sizeBadge(it) {
    var c = catOf(it);
    if (c === "bag15" || c === "film15") return "1.5 oz";
    if (c === "bag4" || c === "film4") return "4 oz";
    if (c === "mastercase") return t("mastercase");
    return "";
  }
  function cardKey(it, gk) {
    var g = groupByKey(gk);
    if (!g.byFlavor) return "i:" + it.id;
    var cid = flavorCore(it);
    if (cid) return "core:" + cid;
    return "lto:" + norm(flavorText(it) || it.name || it.id);
  }
  function assemble(items, accept) {
    var groups = {};
    GROUPS.forEach(function (g) { groups[g.k] = { g: g, cards: {}, order: [] }; });
    (items || []).forEach(function (it) {
      if (!it || !it.id) return;
      var info = accept(it);
      if (!info) return;
      var gk = sectionOf(it);
      var G = groups[gk];
      if (!G) return;
      var key = cardKey(it, gk);
      if (!G.cards[key]) {
        var cid = G.g.byFlavor ? flavorCore(it) : "";
        G.cards[key] = {
          key: key,
          title: G.g.byFlavor ? (cid ? coreTitle(cid) : (flavorText(it) || it.name)) : it.name,
          rows: [], img: "", imgBag: false,
          coreIndex: cid ? CORE_INDEX[cid] : -1,
          sortKey: String(it.code || it.id)
        };
        G.order.push(key);
      }
      var C = G.cards[key];
      C.rows.push(info);
      takeImg(C, it, gk);
      if (String(it.code || it.id) < C.sortKey) C.sortKey = String(it.code || it.id);
    });
    return GROUPS.map(function (g) {
      var G = groups[g.k];
      var cards = G.order.map(function (k) {
        var c = G.cards[k];
        c.rows.sort(function (a, b) {
          return rowRank(a) - rowRank(b) || String(a.it.code || a.it.id).localeCompare(String(b.it.code || b.it.id));
        });
        return c;
      });
      cards.sort(function (a, b) {
        if (!g.byFlavor) return String(a.title).localeCompare(String(b.title));
        var ac = a.coreIndex, bc = b.coreIndex;
        if (ac >= 0 && bc >= 0) return ac - bc;
        if (ac >= 0) return -1;
        if (bc >= 0) return 1;
        return String(a.title).localeCompare(String(b.title));
      });
      var core = [], lto = [];
      if (g.k === "finished") cards.forEach(function (c) { (c.coreIndex >= 0 ? core : lto).push(c); });
      return { g: g, cards: cards, core: core, lto: lto };
    }).filter(function (x) { return x.cards.length; });
  }
  function passesFilters(it, info) {
    var gk = sectionOf(it);
    if (st.grp !== "all" && st.grp !== gk) return false;
    var c = catOf(it);
    var size = SIZE_OF[c] || "";
    if (st.size !== "all") {
      if (size && size !== st.size) return false;
      // WIP shows master case on the 4 oz side, so the 4 oz chip keeps it and 1.5 oz hides it.
      if (!size && c === "mastercase") return st.size === "4 oz";
      if (!size && (gk === "finished" || gk === "film")) return false;
    }
    if (st.instock && !(info.total > 0)) return false;
    var q = norm(st.q);
    if (q) {
      var hay = norm([it.name, it.code, it.id, it.flavor, it.category].join(" ") + " " + info.locs.map(function (l) { return l.loc; }).join(" "));
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function buildModel() {
    var D = db(); if (!D) return [];
    var stock = (D.stock && D.stock()) || [];
    return assemble(D.items(), function (it) {
      var info = itemInfo(it, stock);
      return passesFilters(it, info) ? info : null;
    });
  }

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
    var badge = sizeBadge(it);
    var badgeCls = "ivx-size" + (catOf(it) === "mastercase" ? " mc" : "");
    return '<div class="ivx-row st-' + r.stat + '">' +
      '<div class="ivx-rowtop">' + (badge ? '<span class="' + badgeCls + '">' + esc(badge) + '</span>' : '') +
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
    var n = 0, units = {}, bySize = {};
    G.cards.forEach(function (c) {
      c.rows.forEach(function (r) {
        n++;
        var u = r.it.unit || "";
        units[u] = (units[u] || 0) + r.total;
        var lab = sizeBadge(r.it);
        if (lab) bySize[lab] = (bySize[lab] || 0) + r.total;
      });
    });
    var parts;
    if (G.g.k === "finished" || G.g.k === "film") {
      var order = ["1.5 oz", "4 oz", t("mastercase")];
      parts = order.filter(function (s) { return bySize[s] != null; }).map(function (s) { return esc(s) + ': <b>' + fmt(bySize[s]) + '</b>'; });
    } else {
      parts = Object.keys(units).map(function (u) { return '<b>' + fmt(units[u]) + '</b> ' + esc(u); });
    }
    return '<span class="ivx-gsum">' + n + ' ' + t("items") + (parts.length ? ' &middot; ' + parts.join(" &middot; ") : '') + '</span>';
  }
  function cardsGrid(cards) { return '<div class="ivx-grid">' + cards.map(cardHtml).join("") + '</div>'; }
  function sectionHtml(G) {
    var tag = G.g.super === "raw" ? "h3" : "h2";
    var body;
    if (G.g.k === "finished") {
      body = "";
      if (G.core.length) body += cardsGrid(G.core);
      if (G.lto.length) body += '<h3 class="ivx-subhead">' + t("lto") + '</h3>' + cardsGrid(G.lto);
    } else body = cardsGrid(G.cards);
    return '<section class="ivx-group" data-grp="' + G.g.k + '"><div class="ivx-ghead"><' + tag + '>' + G.g.icon + ' ' + t(G.g.k) + '</' + tag + '>' + groupSummary(G) + '</div>' + body + '</section>';
  }
  function gridHtml() {
    var model = buildModel();
    if (!model.length) return '<p class="hint ivx-empty">' + t("none") + '</p>';
    var html = "", rawOpen = false;
    model.forEach(function (G) {
      if (G.g.super === "raw") {
        if (!rawOpen) {
          html += '<section class="ivx-super" data-super="raw"><div class="ivx-superhead"><h2>' + t("raw") + '</h2><p class="hint">' + t("rawsub") + '</p></div>';
          rawOpen = true;
        }
      } else if (rawOpen) {
        html += "</section>";
        rawOpen = false;
      }
      html += sectionHtml(G);
    });
    if (rawOpen) html += "</section>";
    return html;
  }
  function chip(kind, val, label) {
    var on = (kind === "grp" && st.grp === val) || (kind === "size" && st.size === val) || (kind === "mode" && st.mode === val);
    return '<button type="button" class="ivx-chip' + (on ? " on" : "") + '" data-' + kind + '="' + val + '">' + label + '</button>';
  }
  function barHtml() {
    var grp = [["all", t("all")], ["finished", t("finished")], ["film", t("film")], ["seasoning", t("seasoning")], ["seed", t("seed")], ["adhesion", t("adhesion")], ["containers", t("containers")], ["other", t("other")]]
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
  function rootHtml() {
    return '<div class="ivx-head"><div><h2 class="ivx-title">' + t("title") + '</h2><p class="hint">' + t("sub") + '</p></div></div>' +
      barHtml() + '<div id="ivx-body">' + (st.mode === "cards" ? gridHtml() : "") + '</div>';
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

  var api = {
    version: VERSION,
    refresh: function () { var r = $("ivx-root"); if (r) { r.innerHTML = rootHtml(); applyMode(); } else onView(); },
    imgFor: function (codeOrId) { var D = db(); var it = D && D.itemByCode ? D.itemByCode(codeOrId) : null; return it ? imgFor(it, groupOf(it)) : ""; },
    _floor: { CORE_FLAVORS: CORE_FLAVORS, coreId: coreId, sectionOf: sectionOf, flavorText: flavorText, isAdhesion: isAdhesion, assemble: assemble, catOf: catOf }
  };
  if (typeof window !== "undefined") {
    window.SMK_INV_VISUAL = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
    }
  }
  if (typeof module !== "undefined" && module.exports && typeof window === "undefined") module.exports = api;
})();

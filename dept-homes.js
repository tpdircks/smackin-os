/* ============================================================================
   Smackin' OS - Department homes (dept-homes.js)
   Top department bar and a full-page home for each team. Each card opens a
   screen that already exists (UI_go, Lot Trace, or a module open()).
   Fulfillment uses the same card page. The left menu stays. No writes. No timers.
   ========================================================================== */
(function () {
  "use strict";

  var homeId = "";
  var barCurrent = "";
  var shownLang = "";
  var painting = false;
  var paintTries = 0;
  // A department tap blurs the field before click, so remember the mid-entry
  // check from the press itself. Touch sends a later mousedown after the blur.
  var pressBusy = false;
  var touchArmed = false;

  var TAB_DEPT = {
    receive: "recv", recvlog: "recv", returns: "recv", qa: "recv",
    dash: "recv", adjust: "recv", count: "recv", alerts: "recv",
    move: "recv", locations: "recv", facility: "recv", finbags: "recv",
    seasoning: "recv", seed: "recv", skus: "recv", analytics: "recv",
    labels: "recv", recipes: "recv",
    purchasing: "purch", expreceipts: "purch", reorder15: "purch", supplierpos: "purch",
    prodorders: "mfg", reordertracker: "mfg", launch: "mfg", mixing: "mfg",
    pmac: "mfg", pmacout: "mfg", floor: "mfg",
    compliance: "qa", quality: "qa", disposition: "qa",
    maintenance: "maint",
    produce: "ful", retailprod: "ful", ecomprod: "ful", skulookup: "ful",
    prodlog: "ful", fulfilldaily: "ful", flavinv: "ful", stockbuild: "ful",
    orders: "ful", orderdocs: "ful", shiplog: "ful"
  };

  function tx(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    var l = lang();
    return v[l] || v.en || "";
  }
  function lang() {
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 1700);
  }
  function Lbusy() {
    return tx({
      en: "Finish this entry before switching departments.",
      es: "Termine esta entrada antes de cambiar de departamento.",
      pt: "Termine este lancamento antes de trocar de departamento."
    });
  }
  function Lmissing() {
    return tx({
      en: "That screen is not available right now.",
      es: "Esa pantalla no esta disponible ahora.",
      pt: "Essa tela nao esta disponivel agora."
    });
  }

  // Cards point at live nav targets. Titles match the sidebar where the app
  // already has a translation; otherwise they stay in English, same as L().
  var TOOLS = {
    receive: { go: "receive", icon: "package-plus", title: { en: "Receive", es: "Recibir", pt: "Receber" }, blurb: { en: "Check product in and put it on hand.", es: "Reciba producto y dejelo en existencia.", pt: "Receba o produto e coloque em estoque." } },
    recvlog: { go: "recvlog", icon: "inbox", title: { en: "Receiving Log", es: "Registro de Recibo", pt: "Registro de Recebimento" }, blurb: { en: "Log each inbound shipment and its paperwork.", es: "Registre cada envio que entra y su papeleo.", pt: "Registre cada remessa que entra e os documentos." } },
    returns: { go: "returns", icon: "rotate-ccw", title: { en: "Returns", es: "Devoluciones", pt: "Devolucoes" }, blurb: { en: "Take returns back into stock.", es: "Ingrese devoluciones de nuevo al inventario.", pt: "Lance devolucoes de volta ao estoque." } },
    quarantine: { go: "qa", icon: "shield-alert", title: { en: "Quarantine", es: "Cuarentena", pt: "Quarentena" }, blurb: { en: "Review items sitting in quarantine.", es: "Revise lo que esta en cuarentena.", pt: "Revise o que esta em quarentena." } },
    dash: { go: "dash", icon: "layout-dashboard", title: { en: "Overview", es: "Resumen", pt: "Visao geral" }, blurb: { en: "On-hand counts across the building.", es: "Existencias en todo el edificio.", pt: "Quantidades em estoque no predio." } },
    adjust: { go: "adjust", icon: "sliders-horizontal", title: { en: "Adjust", es: "Ajustar", pt: "Ajustar" }, blurb: { en: "Set a count to the number you just counted.", es: "Fije el conteo al numero que acaba de contar.", pt: "Defina a contagem com o numero que voce contou." } },
    count: { go: "count", icon: "clipboard-check", title: { en: "Count", es: "Conteo", pt: "Contagem" }, blurb: { en: "Cycle count: scan the item and the slot.", es: "Conteo ciclico: escanee el item y la ubicacion.", pt: "Contagem ciclica: leia o item e o local." } },
    alerts: { go: "alerts", icon: "bell", title: { en: "Alerts", es: "Alertas", pt: "Alertas" }, blurb: { en: "Out of stock, low stock, and seasoning dates.", es: "Agotado, stock bajo y fechas de sazon.", pt: "Esgotado, estoque baixo e datas de tempero." } },
    shortdated: { go: "disposition", icon: "archive", title: { en: "Short-Dated", es: "Short-Dated", pt: "Short-Dated" }, blurb: { en: "Finished goods flagged by date, with a disposition.", es: "Producto terminado marcado por fecha, con destino.", pt: "Produto acabado marcado por data, com destino." } },
    finbags: { go: "finbags", icon: "shopping-bag", title: { en: "Finished Bags", es: "Bolsas Terminadas", pt: "Sacos Terminados" }, blurb: { en: "Bags staged in storage after P-Mac.", es: "Bolsas en almacenamiento despues de P-Mac.", pt: "Sacos no estoque depois do P-Mac." } },
    move: { go: "move", icon: "arrow-left-right", title: { en: "Move / Pick", es: "Mover / Sacar", pt: "Mover / Separar" }, blurb: { en: "Move or pick inventory between locations.", es: "Mueva o saque inventario entre ubicaciones.", pt: "Mova ou separe estoque entre locais." } },
    locations: { go: "locations", icon: "map-pin", title: { en: "Locations", es: "Ubicaciones", pt: "Locais" }, blurb: { en: "See what is in each location now.", es: "Vea que hay en cada ubicacion ahora.", pt: "Veja o que ha em cada local agora." } },
    facility: { go: "facility", icon: "warehouse", title: { en: "Facility Map", es: "Mapa de Planta", pt: "Mapa da Planta" }, blurb: { en: "Plant map and pallet racks.", es: "Mapa de la planta y racks de tarimas.", pt: "Mapa da planta e racks de paletes." } },
    seasoning: { go: "seasoning", icon: "flame", title: { en: "Seasoning", es: "Sazon", pt: "Tempero" }, blurb: { en: "Seasoning lots, suppliers, and dates.", es: "Lotes de sazon, proveedores y fechas.", pt: "Lotes de tempero, fornecedores e datas." } },
    seed: { go: "seed", icon: "sprout", title: { en: "Seed", es: "Semilla", pt: "Semente" }, blurb: { en: "Raw seed lots on hand.", es: "Lotes de semilla cruda en existencia.", pt: "Lotes de semente crua em estoque." } },
    skus: { go: "skus", icon: "barcode", title: { en: "SKUs", es: "SKUs", pt: "SKUs" }, blurb: { en: "Finished-goods SKU catalog.", es: "Catalogo de SKU de producto terminado.", pt: "Catalogo de SKU de produto acabado." } },
    recipes: { go: "recipes", icon: "chef-hat", title: { en: "Recipes", es: "Recipes", pt: "Recipes" }, blurb: { en: "Batch recipes for mixing.", es: "Recetas de lote para mezcla.", pt: "Receitas de lote para mistura." } },
    analytics: { go: "analytics", icon: "bar-chart-3", title: { en: "Analytics", es: "Analiticas", pt: "Analises" }, blurb: { en: "Inventory reports.", es: "Reportes de inventario.", pt: "Relatorios de estoque." } },
    printlabels: { go: "labels", icon: "tag", title: { en: "Labels", es: "Etiquetas", pt: "Etiquetas" }, blurb: { en: "Print location, item, and LPN labels.", es: "Imprima etiquetas de ubicacion, item y LPN.", pt: "Imprima etiquetas de local, item e LPN." } },
    purchasing: { go: "purchasing", icon: "shopping-cart", title: { en: "Purchasing", es: "Compras", pt: "Compras" }, blurb: { en: "Purchase orders, the buy list, and reorder setup.", es: "Ordenes de compra, lista de compra y puntos de reorden.", pt: "Ordens de compra, lista de compra e pontos de reposicao." } },
    expreceipts: { go: "expreceipts", icon: "container", title: { en: "Expected Receipts", es: "Recepciones Esperadas", pt: "Recebimentos Esperados" }, blurb: { en: "What is due in, and which supplier POs are still open.", es: "Lo que debe llegar y que ordenes de proveedor siguen abiertas.", pt: "O que deve chegar e quais OCs de fornecedor seguem abertas." } },
    reorder15: { go: "reorder15", icon: "repeat", title: { en: "1.5oz Reorder", es: "Reorden 1.5oz", pt: "Reposicao 1.5oz" }, blurb: { en: "Allen's reorder rule for 1.5oz bags.", es: "La regla de reorden de Allen para bolsas 1.5oz.", pt: "A regra de reposicao do Allen para sacos 1.5oz." } },
    sps: { fn: "sps", icon: "plug", title: { en: "SPS Feed", es: "SPS Feed", pt: "SPS Feed" }, blurb: { en: "Inbound SPS documents: orders, shipments, and invoices.", es: "Documentos SPS de entrada: ordenes, envios y facturas.", pt: "Documentos SPS de entrada: pedidos, envios e faturas." } },
    trRecv: { trace: "recv", icon: "package-plus", title: { en: "Receive", es: "Recibir", pt: "Receive" }, blurb: { en: "Lot station: scan a lot in and print labels.", es: "Estacion de lote: escanee un lote y imprima etiquetas.", pt: "Estacao de lote: leia um lote e imprima etiquetas." } },
    trQa: { trace: "qa", icon: "shield-alert", title: { en: "QA Hold", es: "Retención QA", pt: "QA Hold" }, blurb: { en: "Hold or release a lot before it can run.", es: "Retenga o libere un lote antes de usarlo.", pt: "Segure ou libere um lote antes de usar." } },
    trMix: { trace: "mix", icon: "cooking-pot", title: { en: "Mixing", es: "Mezcla", pt: "Mixing" }, blurb: { en: "Lot station: scan ingredients and print bin tags.", es: "Estacion de lote: escanee ingredientes e imprima etiquetas de bin.", pt: "Estacao de lote: leia ingredientes e imprima etiquetas de bin." } },
    trPmac: { trace: "pmac", icon: "package-open", title: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" }, blurb: { en: "Lot station: finish a pallet and print its label.", es: "Estacion de lote: termine una tarima e imprima su etiqueta.", pt: "Estacao de lote: feche um palete e imprima a etiqueta." } },
    trMove: { trace: "move", icon: "arrow-left-right", title: { en: "Move", es: "Mover", pt: "Move" }, blurb: { en: "Lot station: scan a label, then scan the location.", es: "Estacion de lote: escanee la etiqueta y luego la ubicacion.", pt: "Estacao de lote: leia a etiqueta e depois o local." } },
    mixing: { go: "mixing", icon: "cooking-pot", title: { en: "Mixing", es: "Mezcla", pt: "Mistura" }, blurb: { en: "What mixing needs, and usage scanned into the room.", es: "Lo que mezcla necesita y el uso escaneado en el cuarto.", pt: "O que a mistura precisa e o uso lido na sala." } },
    pmac: { go: "pmac", icon: "wrench", title: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" }, blurb: { en: "What P-Mac needs, and usage scanned into the room.", es: "Lo que P-Mac necesita y el uso escaneado en el cuarto.", pt: "O que o P-Mac precisa e o uso lido na sala." } },
    pmacout: { go: "pmacout", icon: "package-open", title: { en: "P-Mac Log Output", es: "P-Mac Log Output", pt: "P-Mac Log Output" }, blurb: { en: "Log finished bags as they come off the line.", es: "Registre bolsas terminadas al salir de la linea.", pt: "Registre sacos prontos ao sair da linha." } },
    floor: { go: "floor", icon: "activity", title: { en: "Now Running", es: "En Marcha", pt: "Em Andamento" }, blurb: { en: "What is mixing, and what each P-Mac is running.", es: "Que se esta mezclando y que corre cada P-Mac.", pt: "O que esta misturando e o que cada P-Mac esta rodando." } },
    prodorders: { go: "prodorders", icon: "clipboard-pen", title: { en: "Prod Orders", es: "Prod Orders", pt: "Prod Orders" }, blurb: { en: "Production orders for Mixing and P-Mac.", es: "Ordenes de produccion para Mezcla y P-Mac.", pt: "Ordens de producao para Mistura e P-Mac." } },
    reordertracker: { go: "reordertracker", icon: "package-search", title: { en: "Reorder Tracker", es: "Reorder Tracker", pt: "Reorder Tracker" }, blurb: { en: "Allen's pallet and bin reorder tracker.", es: "El tracker de reorden de tarimas y bins de Allen.", pt: "O tracker de reposicao de paletes e bins do Allen." } },
    launch: { go: "launch", icon: "rocket", title: { en: "Launches", es: "Launches", pt: "Launches" }, blurb: { en: "New-flavor launch calendar.", es: "Calendario de lanzamiento de sabores nuevos.", pt: "Calendario de lancamento de sabores novos." } },
    hist: { fn: "hist", icon: "history", title: { en: "Production History", es: "Production History", pt: "Production History" }, blurb: { en: "Past mixing and P-Mac runs.", es: "Corridas anteriores de mezcla y P-Mac.", pt: "Corridas anteriores de mistura e P-Mac." } },
    upload: { fn: "up", icon: "upload", title: { en: "Upload Production", es: "Upload Production", pt: "Upload Production" }, blurb: { en: "Load a mixing or P-Mac history file.", es: "Cargue un archivo de historial de mezcla o P-Mac.", pt: "Carregue um arquivo de historico de mistura ou P-Mac." } },
    trace: { trace: "trace", icon: "git-branch", title: { en: "Trace", es: "Rastrear", pt: "Trace" }, blurb: { en: "Look up a label, lot, supplier lot, or PO.", es: "Busque una etiqueta, lote, lote de proveedor u orden.", pt: "Busque uma etiqueta, lote, lote de fornecedor ou OC." } },
    trLabels: { trace: "labels", icon: "tags", title: { en: "Labels", es: "Etiquetas", pt: "Labels" }, blurb: { en: "Search lot labels and reprint one.", es: "Busque etiquetas de lote y reimprima una.", pt: "Busque etiquetas de lote e reimprima uma." } },
    quality: { go: "quality", icon: "microscope", title: { en: "Quality Logs", es: "Quality Logs", pt: "Quality Logs" }, blurb: { en: "CCP checks: allergen changeover, label verify, metal detector.", es: "Registros CCP: cambio de alergeno, verificacion de etiqueta, detector de metal.", pt: "Registros CCP: troca de alergeno, verificacao de rotulo, detector de metal." } },
    compliance: { go: "compliance", icon: "shield-check", title: { en: "Compliance / SQF", es: "Cumplimiento / SQF", pt: "Conformidade / SQF" }, blurb: { en: "Certifications, the SQF calendar, and controlled documents.", es: "Certificaciones, el calendario SQF y documentos controlados.", pt: "Certificacoes, o calendario SQF e documentos controlados." } },
    maintenance: { go: "maintenance", icon: "hard-hat", title: { en: "Maintenance", es: "Mantenimiento", pt: "Manutencao" }, blurb: { en: "Requests, repairs, and projects.", es: "Solicitudes, reparaciones y proyectos.", pt: "Pedidos, reparos e projetos." } },
    services: { fn: "svc", icon: "hand-platter", title: { en: "Services", es: "Services", pt: "Services" }, blurb: { en: "Outsourced services and invoices: uniforms, pest, waste, equipment.", es: "Servicios externos y facturas: uniformes, plagas, basura, equipo.", pt: "Servicos externos e faturas: uniformes, pragas, residuos, equipamento." } },
    produce: { go: "produce", icon: "factory", title: { en: "Produce", es: "Producir", pt: "Produzir" }, blurb: { en: "Record finished 4oz bags off the line.", es: "Registre bolsas 4oz terminadas de la linea.", pt: "Registre sacos 4oz prontos da linha." } },
    retailprod: { go: "retailprod", icon: "store", title: { en: "Retail Production", es: "Produccion Retail", pt: "Producao Varejo" }, blurb: { en: "Scan or pick a retail pallet and add it to stock.", es: "Escanee o elija una paleta retail y sumela al inventario.", pt: "Escaneie ou escolha um palete de varejo e some ao estoque." } },
    ecomprod: { go: "ecomprod", icon: "laptop", title: { en: "E-Commerce", es: "E-Commerce", pt: "E-Commerce" }, blurb: { en: "Scan or pick an e-commerce item and add what you built.", es: "Escanee o elija un item de e-commerce y sume lo producido.", pt: "Escaneie ou escolha um item de e-commerce e some o que produziu." } },
    trUse: { trace: "use", icon: "log-out", title: { en: "E-com lot pull", es: "Salida e-com", pt: "E-com lot pull" }, blurb: { en: "Log bags pulled for e-commerce. One save is the whole lot.", es: "Registre las bolsas tomadas para e-commerce. Un guardado es todo el lote.", pt: "Registre as bolsas separadas para e-commerce. Um salvamento e o lote inteiro." } },
    trShip: { trace: "ship", icon: "truck", title: { en: "Ship", es: "Enviar", pt: "Ship" }, blurb: { en: "Build an outbound pallet: enter the PO and scan each pallet you pull.", es: "Arme una tarima de salida: escriba la orden y escanee cada tarima.", pt: "Monte um palete de saida: escreva a OC e leia cada palete." } },
    skulookup: { go: "skulookup", icon: "scan-search", title: { en: "SKU Lookup", es: "Buscar SKU", pt: "SKU Lookup" }, blurb: { en: "Look up an e-commerce SKU, its picture, and what is inside.", es: "Busque un SKU de e-commerce, su imagen y que contiene.", pt: "Busque um SKU de e-commerce, a imagem e o que tem dentro." } },
    prodlog: { go: "prodlog", icon: "notebook-pen", title: { en: "Daily Production", es: "Produccion Diaria", pt: "Producao Diaria" }, blurb: { en: "Today's retail pallets, lots, and the metal detector counter.", es: "Paletas retail de hoy, lotes y el contador del detector de metal.", pt: "Paletes de varejo de hoje, lotes e o contador do detector de metal." } },
    fulfilldaily: { go: "fulfilldaily", icon: "list-todo", title: { en: "Daily Fulfillment", es: "Cumplimiento Diario", pt: "Cumprimento Diario" }, blurb: { en: "Log today's e-commerce labels and Amazon (FBA) builds.", es: "Registre las etiquetas de e-commerce y la produccion Amazon (FBA) de hoy.", pt: "Registre as etiquetas de e-commerce e a producao Amazon (FBA) de hoje." } },
    flavinv: { go: "flavinv", icon: "bar-chart-2", title: { en: "Flavor Inventory", es: "Inventario de Sabores", pt: "Inventario de Sabores" }, blurb: { en: "On-floor pallets and finished on-hand by flavor.", es: "Paletas en piso y producto terminado en mano, por sabor.", pt: "Paletes no piso e produto acabado em estoque, por sabor." } },
    stockbuild: { go: "stockbuild", icon: "layers", title: { en: "Stock Build", es: "Construir Inventario", pt: "Construir Estoque" }, blurb: { en: "Build progress against the stock goals. Update on hand as you count.", es: "Avance contra las metas de inventario. Actualice en mano al contar.", pt: "Andamento contra as metas de estoque. Atualize em estoque ao contar." } },
    orders: { go: "orders", icon: "receipt", title: { en: "Orders", es: "Ordenes", pt: "Pedidos" }, blurb: { en: "Non-SPS and Stripe orders. Open ones stay on top.", es: "Ordenes no-SPS y Stripe. Las abiertas quedan arriba.", pt: "Pedidos nao-SPS e Stripe. Os abertos ficam no topo." } },
    orderdocs: { go: "orderdocs", icon: "folder", title: { en: "Order Docs", es: "Docs de Orden", pt: "Docs de Pedido" }, blurb: { en: "Paperwork for fulfilled orders: BOL, packing list, pull sheet, invoice.", es: "Papeleo de ordenes cumplidas: BOL, lista de empaque, hoja de picking, factura.", pt: "Papelada de pedidos concluidos: BOL, lista de embalagem, folha de separacao, fatura." } },
    shiplog: { go: "shiplog", icon: "truck", title: { en: "Shipping Log", es: "Registro de Envios", pt: "Registro de Envios" }, blurb: { en: "Log a one-off outbound shipment and its tracking number.", es: "Registre un envio suelto y su numero de rastreo.", pt: "Registre um envio avulso e o numero de rastreio." } },
    shipments: { fn: "shipments", icon: "ship", title: { en: "Shipments", es: "Shipments", pt: "Shipments" }, blurb: { en: "ShipStation shipments the server already synced. This screen only reads them.", es: "Envios de ShipStation que el servidor ya sincronizo. Esta pantalla solo los lee.", pt: "Envios do ShipStation que o servidor ja sincronizou. Esta tela so le." } }
  };

  var DEPTS = [
    {
      id: "recv",
      label: { en: "Receiving / Inventory", es: "Recibo / Inventario", pt: "Recebimento / Estoque" },
      title: { en: "Receiving / Inventory", es: "Recibo / Inventario", pt: "Recebimento / Estoque" },
      intro: { en: "Receive product, count stock, and open the inventory tools already on this floor.", es: "Reciba producto, cuente existencia y abra las herramientas de inventario que ya estan en piso.", pt: "Receba produto, conte estoque e abra as ferramentas de inventario que ja estao no piso." },
      sections: [
        { h: { en: "Receiving", es: "Recibo", pt: "Recebimento" }, tools: ["receive", "recvlog", "returns", "quarantine"] },
        { h: { en: "Stock and counts", es: "Stock y conteos", pt: "Estoque e contagens" }, tools: ["dash", "adjust", "count", "alerts", "shortdated", "finbags", "move", "locations", "facility"] },
        { h: { en: "Items", es: "Items", pt: "Itens" }, tools: ["seasoning", "seed", "skus", "recipes", "analytics", "printlabels"] }
      ]
    },
    {
      id: "purch",
      label: { en: "Purchasing", es: "Compras", pt: "Compras" },
      title: { en: "Purchasing", es: "Compras", pt: "Compras" },
      intro: { en: "Purchase orders, what is due in, and the inbound SPS feed.", es: "Ordenes de compra, lo que debe llegar y el feed SPS de entrada.", pt: "Ordens de compra, o que deve chegar e o feed SPS de entrada." },
      sections: [
        { h: { en: "Purchase orders", es: "Ordenes de compra", pt: "Ordens de compra" }, tools: ["purchasing", "expreceipts", "reorder15"] },
        { h: { en: "Inbound", es: "Entrada", pt: "Entrada" }, tools: ["sps"] }
      ]
    },
    {
      id: "ful",
      label: { en: "Fulfillment", es: "Fulfillment", pt: "Fulfillment" },
      title: { en: "Fulfillment", es: "Fulfillment", pt: "Fulfillment" },
      intro: { en: "Build retail and e-commerce orders, pull lots, and ship what is ready.", es: "Arme ordenes retail y de e-commerce, tome lotes y envie lo que esta listo.", pt: "Monte pedidos de varejo e e-commerce, separe lotes e envie o que esta pronto." },
      sections: [
        { h: { en: "Line", es: "Linea", pt: "Linha" }, tools: ["retailprod", "ecomprod", "trUse", "trShip", "produce", "prodlog", "fulfilldaily"] },
        { h: { en: "Lookup and stock", es: "Busqueda y stock", pt: "Busca e estoque" }, tools: ["skulookup", "flavinv", "stockbuild"] },
        { h: { en: "Orders", es: "Ordenes", pt: "Pedidos" }, tools: ["orders", "orderdocs"] },
        { h: { en: "Shipping", es: "Envios", pt: "Envios" }, tools: ["shiplog", "shipments"] }
      ]
    },
    {
      id: "mfg",
      label: { en: "Manufacturing", es: "Manufactura", pt: "Manufatura" },
      title: { en: "Manufacturing", es: "Manufactura", pt: "Manufatura" },
      intro: { en: "Mix, P-Mac, production orders, the live machines, and the lot stations on this floor.", es: "Mezcla, P-Mac, ordenes de produccion, las maquinas en vivo y las estaciones de lote en piso.", pt: "Mistura, P-Mac, ordens de producao, as maquinas ao vivo e as estacoes de lote no piso." },
      sections: [
        { h: { en: "Lot trace stations", es: "Estaciones de lote", pt: "Estacoes de lote" }, tools: ["trRecv", "trQa", "trMix", "trPmac", "trMove"] },
        { h: { en: "Floor", es: "Piso", pt: "Piso" }, tools: ["mixing", "pmac", "pmacout", "floor"] },
        { h: { en: "Planning and history", es: "Plan y historial", pt: "Plano e historico" }, tools: ["prodorders", "reordertracker", "launch", "hist", "upload"] }
      ]
    },
    {
      id: "qa",
      label: { en: "Quality", es: "Calidad", pt: "Qualidade" },
      title: { en: "Quality", es: "Calidad", pt: "Qualidade" },
      intro: { en: "Lot trace, labels, and the quality records this team already keeps.", es: "Rastreo de lote, etiquetas y los registros de calidad que este equipo ya usa.", pt: "Rastreio de lote, etiquetas e os registros de qualidade que esta equipe ja usa." },
      sections: [
        { h: { en: "Lot trace", es: "Rastreo de lote", pt: "Rastreio de lote" }, tools: ["trace", "trLabels"] },
        { h: { en: "Quality records", es: "Registros de calidad", pt: "Registros de qualidade" }, tools: ["quality", "compliance", "shortdated"] }
      ]
    },
    {
      id: "maint",
      label: { en: "Maintenance", es: "Mantenimiento", pt: "Manutencao" },
      title: { en: "Maintenance", es: "Mantenimiento", pt: "Manutencao" },
      intro: { en: "Maintenance requests and the services log.", es: "Solicitudes de mantenimiento y el registro de servicios.", pt: "Pedidos de manutencao e o registro de servicos." },
      sections: [
        { h: { en: "Shop", es: "Taller", pt: "Oficina" }, tools: ["maintenance"] },
        { h: { en: "Services", es: "Servicios", pt: "Servicos" }, tools: ["services"] }
      ]
    }
  ];

  function deptById(id) {
    for (var i = 0; i < DEPTS.length; i++) if (DEPTS[i].id === id) return DEPTS[i];
    return null;
  }

  function entryInProgress() {
    if (document.getElementById("po-vendor") || document.getElementById("po-sup") ||
        document.getElementById("spo-vendor") || document.getElementById("po-em-body") ||
        document.getElementById("np-vendor") || document.getElementById("pn-to")) return true;
    var busy = window.SMK_BUSY || [];
    for (var i = 0; i < busy.length; i++) {
      try { if (busy[i]()) return true; } catch (e) {}
    }
    var ae = document.activeElement;
    if (!ae || !ae.closest || !ae.closest("#view")) return false;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false;
    var typ = String(ae.type || "").toLowerCase();
    if (typ === "button" || typ === "submit" || typ === "checkbox" || typ === "radio" || typ === "file") return false;
    return true;
  }

  function closeDrawer() {
    var n = document.getElementById("nav");
    var b = document.getElementById("navBackdrop");
    if (n) n.classList.remove("open");
    if (b) b.classList.remove("show");
  }

  function deptOfNav(btn) {
    if (!btn) return "";
    if (btn.id === "svc-nav") return "maint";
    if (btn.id === "sf-nav") return "purch";
    if (btn.id === "shs-nav") return "ful";
    if (btn.id === "mfg-hist-nav" || btn.id === "mfg-up-nav") return "mfg";
    if (btn.getAttribute("data-trc") === "1") {
      var h = btn.getAttribute("data-trc-home") || "";
      if (h === "ful") return "ful";
      if (h === "mfg") return "mfg";
      if (h === "qa") return "qa";
      return "";
    }
    var m = (btn.getAttribute("onclick") || "").match(/UI_go\('([^']+)'\)/);
    if (m && TAB_DEPT[m[1]]) return TAB_DEPT[m[1]];
    return "";
  }

  function ensureRelease() {
    var nav = document.getElementById("nav");
    if (!nav || document.getElementById("dept-release")) return;
    // Wait until the real menu exists. A placeholder button too early makes
    // other modules treat an empty menu as ready and park their items at the top.
    if (!nav.querySelector(".navlabel")) return;
    var dummy = document.createElement("button");
    dummy.type = "button";
    dummy.id = "dept-release";
    dummy.className = "navitem";
    dummy.tabIndex = -1;
    dummy.setAttribute("aria-hidden", "true");
    dummy.style.display = "none";
    nav.appendChild(dummy);
  }

  function releaseOtherViews() {
    ensureRelease();
    var dummy = document.getElementById("dept-release");
    if (dummy) dummy.click();
  }

  function runTool(tool) {
    if (!tool) { toast(Lmissing()); return; }
    if (tool.go) {
      if (typeof window.UI_go === "function") window.UI_go(tool.go);
      else toast(Lmissing());
      return;
    }
    if (tool.trace) {
      if (window.TRACE && typeof TRACE.go === "function") TRACE.go(tool.trace);
      else toast(Lmissing());
      return;
    }
    var fn = tool.fn;
    if (fn === "svc" && window.SERVICES && typeof SERVICES.open === "function") { SERVICES.open(); return; }
    if (fn === "hist" && window.MFGHIST && typeof MFGHIST.open === "function") { MFGHIST.open(); return; }
    if (fn === "up" && window.MFGUPLOAD && typeof MFGUPLOAD.open === "function") { MFGUPLOAD.open(); return; }
    if (fn === "sps" && window.SPSFEED && typeof SPSFEED.open === "function") { SPSFEED.open(); return; }
    if (fn === "shipments" && window.SHIPPING_SYNC && typeof SHIPPING_SYNC.open === "function") { SHIPPING_SYNC.open(); return; }
    toast(Lmissing());
  }

  function cardHtml(id) {
    var tool = TOOLS[id];
    if (!tool) return "";
    return '<button type="button" class="dept-card" data-dept-tool="' + esc(id) + '">' +
      '<i class="dept-ico" data-lucide="' + esc(tool.icon) + '"></i>' +
      '<strong>' + esc(tx(tool.title)) + '</strong>' +
      '<span>' + esc(tx(tool.blurb)) + '</span></button>';
  }

  function homeHtml(dept) {
    var sections = (dept.sections || []).map(function (sec) {
      return '<h2 class="dept-sec">' + esc(tx(sec.h)) + '</h2><div class="dept-grid">' +
        sec.tools.map(cardHtml).join("") + '</div>';
    }).join("");
    return '<div id="dept-home" data-dept="' + esc(dept.id) + '">' +
      '<h1>' + esc(tx(dept.title)) + '</h1>' +
      '<p class="hint">' + esc(tx(dept.intro)) + '</p>' +
      sections + '</div>';
  }

  function paintHome() {
    var view = document.getElementById("view");
    var dept = deptById(homeId);
    if (!view || !dept || dept.passthrough) return;
    var root = view.querySelector("#dept-home");
    if (root && root.getAttribute("data-dept") === homeId && root.getAttribute("data-lang") === lang()) return;
    painting = true;
    view.innerHTML = homeHtml(dept);
    var held = view.querySelector("#dept-home");
    if (held) held.setAttribute("data-lang", lang());
    painting = false;
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }

  function renderBar() {
    var bar = document.getElementById("deptbar");
    if (!bar) return;
    shownLang = lang();
    bar.setAttribute("aria-label", tx({ en: "Departments", es: "Departamentos", pt: "Departamentos" }));
    bar.innerHTML = DEPTS.map(function (d) {
      var on = d.id === barCurrent;
      return '<button type="button" class="dept-tab' + (on ? " on" : "") + '" data-dept="' + d.id + '"' +
        (on ? ' aria-current="page"' : "") + '>' + esc(tx(d.label)) + '</button>';
    }).join("");
  }

  function markBar() {
    var bar = document.getElementById("deptbar");
    if (!bar) return;
    if (lang() !== shownLang) { renderBar(); return; }
    var buttons = bar.querySelectorAll("[data-dept]");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-dept") === barCurrent;
      buttons[i].classList.toggle("on", on);
      if (on) buttons[i].setAttribute("aria-current", "page");
      else buttons[i].removeAttribute("aria-current");
    }
  }

  function syncOffset() {
    var stack = document.getElementById("dept-stack");
    if (!stack) return;
    var h = stack.offsetHeight || 0;
    if (h) document.documentElement.style.setProperty("--dept-stack-h", h + "px");
  }

  function showHome(id) {
    var blocked = pressBusy || entryInProgress();
    pressBusy = false;
    touchArmed = false;
    if (blocked) { toast(Lbusy()); return; }
    var dept = deptById(id);
    if (!dept || dept.passthrough) return;
    releaseOtherViews();
    homeId = id;
    barCurrent = id;
    paintTries = 0;
    closeDrawer();
    paintHome();
    markBar();
    try { window.scrollTo(0, 0); } catch (e) {}
    syncOffset();
  }

  function openTool(id) {
    var tool = TOOLS[id];
    if (!tool) return;
    if (entryInProgress() && !document.getElementById("dept-home")) { toast(Lbusy()); return; }
    homeId = "";
    paintTries = 0;
    closeDrawer();
    markBar();
    runTool(tool);
  }

  function onBarClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-dept]") : null;
    if (!btn) return;
    showHome(btn.getAttribute("data-dept"));
  }

  function onViewClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-dept-tool]") : null;
    if (!btn) return;
    openTool(btn.getAttribute("data-dept-tool"));
  }

  function onView() {
    if (painting) return;
    if (lang() !== shownLang) renderBar();
    if (!homeId) return;
    var view = document.getElementById("view");
    if (!view) return;
    var root = view.querySelector("#dept-home");
    if (root && root.getAttribute("data-dept") === homeId && root.getAttribute("data-lang") === lang()) return;
    if (paintTries > 4) return;
    paintTries++;
    paintHome();
  }

  function onNav() {
    if (painting) return;
    ensureRelease();
  }

  function styleOnce() {
    if (document.getElementById("dept-style")) return;
    var s = document.createElement("style");
    s.id = "dept-style";
    s.textContent = [
      "#dept-stack{position:sticky;top:0;z-index:70}",
      "#deptbar{display:flex;gap:8px;align-items:center;overflow-x:auto;background:#fff;border-bottom:1px solid var(--line,#d7dde6);padding:8px 12px 10px;-webkit-overflow-scrolling:touch}",
      "#deptbar .dept-tab{font-family:inherit;font-weight:800;font-size:14px;line-height:1.2;color:var(--navy,#04223B);background:var(--light,#E1EEF7);border:1px solid transparent;border-radius:999px;padding:10px 14px;cursor:pointer;white-space:nowrap;min-height:44px}",
      "#deptbar .dept-tab:hover{border-color:var(--blue,#006DB6)}",
      "#deptbar .dept-tab.on{background:var(--orange,#F26B21);color:#fff}",
      "nav#nav{top:var(--dept-stack-h,0px);max-height:calc(100vh - var(--dept-stack-h,0px))}",
      "main:has(#dept-home){max-width:none}",
      "#dept-home{padding:8px 0 28px}",
      "#dept-home h1{margin:0 0 6px;color:var(--navy,#04223B);font-size:28px;line-height:1.15}",
      "#dept-home .dept-sec{margin:22px 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5c6b7c;font-weight:800}",
      "#dept-home .dept-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}",
      "#dept-home .dept-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#fff;border:1px solid var(--line,#d7dde6);border-radius:12px;padding:16px 16px 18px;cursor:pointer;min-height:132px;box-shadow:0 1px 2px rgba(0,0,0,.04);font-family:inherit;color:inherit;width:100%}",
      "#dept-home .dept-card:hover{border-color:var(--blue,#006DB6);box-shadow:0 4px 14px rgba(4,34,59,.08)}",
      "#dept-home .dept-card:focus-visible{outline:3px solid var(--blue,#006DB6);outline-offset:2px}",
      "#dept-home .dept-ico{color:var(--orange,#F26B21);width:28px;height:28px;margin-bottom:10px}",
      "#dept-home .dept-ico svg{width:28px;height:28px;stroke-width:1.75}",
      "#dept-home .dept-card strong{display:block;font-size:18px;color:var(--navy,#04223B);margin:0 0 4px}",
      "#dept-home .dept-card span{display:block;font-size:14px;color:#3d4c5e;line-height:1.35;font-weight:500}",
      "body.boardmode #deptbar{display:none!important}",
      "@media(max-width:820px){nav#nav{top:var(--dept-stack-h,0px);height:calc(100vh - var(--dept-stack-h,0px));max-height:none}#dept-home h1{font-size:24px}}",
      "@media print{#deptbar{display:none!important}}"
    ].join("");
    document.head.appendChild(s);
  }

  function buildBar() {
    if (document.getElementById("deptbar")) return;
    styleOnce();
    var header = document.querySelector("header");
    var stack = document.getElementById("dept-stack");
    if (!stack && header && header.parentNode) {
      stack = document.createElement("div");
      stack.id = "dept-stack";
      header.parentNode.insertBefore(stack, header);
      stack.appendChild(header);
    }
    var bar = document.createElement("nav");
    bar.id = "deptbar";
    bar.setAttribute("aria-label", tx({ en: "Departments", es: "Departamentos", pt: "Departamentos" }));
    if (stack) stack.appendChild(bar);
    else {
      var layout = document.querySelector(".layout");
      if (layout && layout.parentNode) layout.parentNode.insertBefore(bar, layout);
      else document.body.appendChild(bar);
    }
    bar.addEventListener("touchstart", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-dept]") : null;
      if (!btn) return;
      touchArmed = true;
      pressBusy = entryInProgress();
    }, { passive: true });
    bar.addEventListener("mousedown", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-dept]") : null;
      if (!btn) return;
      if (touchArmed) { touchArmed = false; return; }
      pressBusy = entryInProgress();
    });
    bar.addEventListener("click", onBarClick);
    renderBar();
    syncOffset();
  }

  function boot() {
    buildBar();
    var nav = document.getElementById("nav");
    var view = document.getElementById("view");
    if (nav && !nav.__deptObs && typeof MutationObserver === "function") {
      var nobs = new MutationObserver(onNav);
      nav.__deptObs = nobs;
      nobs.observe(nav, { childList: true });
      ensureRelease();
    }
    if (view && !view.__deptViewObs && typeof MutationObserver === "function") {
      var vobs = new MutationObserver(onView);
      view.__deptViewObs = vobs;
      vobs.observe(view, { childList: true });
      view.addEventListener("click", onViewClick);
    }
    if (!document.documentElement.__deptNavClick) {
      document.documentElement.__deptNavClick = true;
      document.addEventListener("click", function (e) {
        var t = e.target && e.target.closest ? e.target.closest("#nav .navitem") : null;
        if (!t || t.id === "dept-release") return;
        if (homeId) homeId = "";
        barCurrent = deptOfNav(t);
        markBar();
      }, true);
    }
    if (!window.__deptResize) {
      window.__deptResize = true;
      window.addEventListener("resize", syncOffset);
    }
    window.SMK_VIEW_LOCKS = window.SMK_VIEW_LOCKS || [];
    window.SMK_VIEW_LOCKS.push(function () { return !!homeId; });
  }

  window.DEPT = {
    show: showHome,
    tool: openTool,
    fulfillment: function () { showHome("ful"); },
    current: function () { return { home: homeId, bar: barCurrent }; }
  };

  var started = false;
  function start() {
    if (started) return;
    if (!document.body || !document.getElementById("view") || !document.getElementById("nav")) {
      document.addEventListener("DOMContentLoaded", start);
      return;
    }
    started = true;
    boot();
  }
  start();
})();

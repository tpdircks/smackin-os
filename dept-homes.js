/* ============================================================================
   Smackin' OS - Department homes (dept-homes.js)
   Top department bar and a full-page home for each team. Each card opens a
   screen that already exists (UI_go, Lot Trace, or a module open()).
   Every sidebar group has a tab, equal width: Dashboard, Receiving,
   Inventory, Items, Purchasing, Demand, Manufacturing, Fulfillment,
   Shipping, Quality, Team, Maintenance, Docs, and System. The menu stays
   off-canvas. A click outside the open panel, or Escape, closes it. The
   header button still toggles it. The left sidebar stays collapsed off
   screen. No writes. No timers.
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
    home: "home", daily: "home",
    receive: "recv", recvlog: "recv", returns: "recv", qa: "recv",
    dash: "inv", adjust: "inv", count: "inv", alerts: "inv",
    move: "inv", locations: "inv", facility: "inv", finbags: "inv",
    seasoning: "items", seed: "items", skus: "items", analytics: "items",
    labels: "items", recipes: "items",
    purchasing: "purch", expreceipts: "purch", reorder15: "purch", supplierpos: "purch",
    prodorders: "mfg", reordertracker: "mfg", launch: "mfg", mixing: "mfg",
    pmac: "mfg", pmacout: "mfg", floor: "mfg",
    compliance: "qa", quality: "qa", disposition: "qa",
    maintenance: "maint",
    produce: "ful", retailprod: "ful", ecomprod: "ful", skulookup: "ful",
    prodlog: "ful", fulfilldaily: "ful", flavinv: "ful", stockbuild: "ful",
    orders: "ful", orderdocs: "ful",
    shiplog: "ship",
    demand: "demand", demandboard: "demand", demandsched: "demand", demandimport: "demand",
    ecomdemand: "demand", forecast: "demand",
    people: "team", improve: "team", rd: "team", log: "team",
    reference: "docs", board: "system", settings: "system"
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
    shipments: { fn: "shipments", icon: "ship", title: { en: "Shipments", es: "Shipments", pt: "Shipments" }, blurb: { en: "ShipStation shipments the server already synced. This screen only reads them.", es: "Envios de ShipStation que el servidor ya sincronizo. Esta pantalla solo los lee.", pt: "Envios do ShipStation que o servidor ja sincronizou. Esta tela so le." } },
    desk: { go: "home", icon: "home", title: { en: "Dashboard", es: "Panel", pt: "Painel" }, blurb: { en: "Facility snapshot: stock, orders, and what needs attention.", es: "Resumen de la planta: stock, ordenes y lo que necesita atencion.", pt: "Resumo da planta: estoque, pedidos e o que precisa de atencao." } },
    daily: { go: "daily", icon: "calendar-days", title: { en: "Daily Metrics", es: "Daily Metrics", pt: "Daily Metrics" }, blurb: { en: "Every department's numbers for one day, with a 14-day history.", es: "Los numeros de cada departamento en un dia, con historial de 14 dias.", pt: "Os numeros de cada departamento em um dia, com historico de 14 dias." } },
    demand: { go: "demand", icon: "calendar-clock", title: { en: "By Department", es: "Por Departamento", pt: "Por Departamento" }, blurb: { en: "Today's build target by department.", es: "La meta de produccion de hoy por departamento.", pt: "A meta de producao de hoje por departamento." } },
    demandboard: { go: "demandboard", icon: "list-checks", title: { en: "Order Board", es: "Tablero de Pedidos", pt: "Painel de Pedidos" }, blurb: { en: "Open orders due to ship.", es: "Ordenes abiertas por enviar.", pt: "Pedidos abertos para enviar." } },
    demandsched: { go: "demandsched", icon: "gauge", title: { en: "Production Schedule", es: "Programa de Produccion", pt: "Programa de Producao" }, blurb: { en: "What to produce by flavor against finished bags on hand.", es: "Que producir por sabor contra bolsas terminadas en mano.", pt: "O que produzir por sabor contra sacos prontos em estoque." } },
    demandimport: { go: "demandimport", icon: "file-up", title: { en: "Import Orders", es: "Importar Pedidos", pt: "Importar Pedidos" }, blurb: { en: "Load SPS and ShipIQ exports into the demand board.", es: "Cargue exportaciones SPS y ShipIQ en el tablero de demanda.", pt: "Carregue exportacoes SPS e ShipIQ no painel de demanda." } },
    ecomdemand: { go: "ecomdemand", icon: "globe", title: { en: "E-Com Demand", es: "Demanda E-Com", pt: "Demanda E-Com" }, blurb: { en: "Bags needed per flavor from a ShipStation product-sales export.", es: "Bolsas necesarias por sabor desde una exportacion de ventas de ShipStation.", pt: "Sacos necessarios por sabor a partir de uma exportacao de vendas do ShipStation." } },
    forecast: { go: "forecast", icon: "scale", title: { en: "Forecast vs Target", es: "Pronostico vs Objetivo", pt: "Previsao vs Meta" }, blurb: { en: "Compare the WIP forecast with the app targets. Nothing is changed.", es: "Compare el pronostico WIP con las metas de la app. No cambia nada.", pt: "Compare a previsao WIP com as metas do app. Nada e alterado." } },
    people: { go: "people", icon: "users", title: { en: "People", es: "Personal", pt: "Pessoas" }, blurb: { en: "Team directory and org chart.", es: "Directorio del equipo y organigrama.", pt: "Diretorio da equipe e organograma." } },
    improve: { go: "improve", icon: "trending-up", title: { en: "Continuous Improvement", es: "Mejora Continua", pt: "Melhoria Continua" }, blurb: { en: "Lean, 5S, and Kaizen ideas and projects.", es: "Ideas y proyectos Lean, 5S y Kaizen.", pt: "Ideias e projetos Lean, 5S e Kaizen." } },
    rd: { go: "rd", icon: "flask-conical", title: { en: "R&D", es: "I+D", pt: "P&D" }, blurb: { en: "Research requests and what is still out.", es: "Solicitudes de investigacion y lo que sigue pendiente.", pt: "Pedidos de pesquisa e o que ainda esta pendente." } },
    acct: { go: "log", icon: "history", title: { en: "Accountability", es: "Responsabilidad", pt: "Responsabilidade" }, blurb: { en: "Activity log of what changed.", es: "Registro de actividad de lo que cambio.", pt: "Registro de atividade do que mudou." } },
    reference: { go: "reference", icon: "book-open", title: { en: "Reference / SOPs", es: "Referencia / SOPs", pt: "Referencia / SOPs" }, blurb: { en: "SOPs, cheat sheets, and policies.", es: "SOPs, guias rapidas y politicas.", pt: "SOPs, guias rapidos e politicas." } },
    board: { go: "board", icon: "tv", title: { en: "Board Mode / TV", es: "Modo Pizarra / TV", pt: "Modo Painel / TV" }, blurb: { en: "Open a department board for the TV.", es: "Abra un tablero de departamento para la TV.", pt: "Abra um painel de departamento para a TV." } },
    settings: { go: "settings", icon: "settings", title: { en: "Settings", es: "Ajustes", pt: "Configuracoes" }, blurb: { en: "Connection, lock, and backup.", es: "Conexion, bloqueo y respaldo.", pt: "Conexao, bloqueio e backup." } },
    health: { fn: "health", icon: "activity", title: { en: "Data Health", es: "Data Health", pt: "Data Health" }, blurb: { en: "How fresh each data source is. This screen only reads.", es: "Que tan reciente esta cada fuente de datos. Esta pantalla solo lee.", pt: "Quao recente esta cada fonte de dados. Esta tela so le." } }
  };

  var DEPTS = [
    {
      id: "home",
      live: "home",
      label: { en: "Dashboard", es: "Panel", pt: "Painel" },
      title: { en: "Dashboard", es: "Panel", pt: "Painel" },
      intro: { en: "Facility snapshot: stock, orders pulled today, and open inbound POs.", es: "Resumen de la planta: stock, ordenes tomadas hoy y compras abiertas.", pt: "Resumo da planta: estoque, pedidos puxados hoje e compras abertas." },
      sections: [
        { h: { en: "Facility", es: "Planta", pt: "Planta" }, tools: ["desk", "daily"] }
      ]
    },
    {
      id: "recv",
      label: { en: "Receiving", es: "Recibo", pt: "Receber" },
      title: { en: "Receiving", es: "Recibo", pt: "Recebimento" },
      intro: { en: "Check product in, log the paperwork, take returns, and work quarantine.", es: "Reciba producto, registre el papeleo, tome devoluciones y trabaje cuarentena.", pt: "Receba produto, registre os documentos, lance devolucoes e trabalhe a quarentena." },
      sections: [
        { h: { en: "Inbound", es: "Entrada", pt: "Entrada" }, tools: ["receive", "recvlog", "returns", "quarantine"] }
      ]
    },
    {
      id: "inv",
      label: { en: "Inventory", es: "Inventario", pt: "Estoque" },
      title: { en: "Inventory", es: "Inventario", pt: "Estoque" },
      intro: { en: "Counts, adjustments, moves, and locations.", es: "Conteos, ajustes, movimientos y ubicaciones.", pt: "Contagens, ajustes, movimentos e locais." },
      sections: [
        { h: { en: "Counts", es: "Conteos", pt: "Contagens" }, tools: ["dash", "adjust", "count", "alerts", "finbags", "move"] },
        { h: { en: "Locations", es: "Ubicaciones", pt: "Locais" }, tools: ["locations", "facility"] }
      ]
    },
    {
      id: "items",
      label: { en: "Items", es: "Items", pt: "Itens" },
      title: { en: "Items & Reports", es: "Items y Reportes", pt: "Itens e Relatorios" },
      intro: { en: "Seasoning, seed, SKUs, recipes, and the inventory reports.", es: "Sazon, semilla, SKUs, recetas y los reportes de inventario.", pt: "Tempero, semente, SKUs, receitas e os relatorios de estoque." },
      sections: [
        { h: { en: "Catalog", es: "Catalogo", pt: "Catalogo" }, tools: ["seasoning", "seed", "skus", "recipes", "printlabels"] },
        { h: { en: "Reports", es: "Reportes", pt: "Relatorios" }, tools: ["analytics"] }
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
      id: "demand",
      label: { en: "Demand", es: "Demanda", pt: "Demanda" },
      title: { en: "Demand", es: "Demanda", pt: "Demanda" },
      intro: { en: "What to build, the order board, and the forecast against the target.", es: "Que producir, el tablero de pedidos y el pronostico contra la meta.", pt: "O que produzir, o painel de pedidos e a previsao contra a meta." },
      sections: [
        { h: { en: "Plan", es: "Plan", pt: "Plano" }, tools: ["demand", "demandboard", "demandsched", "forecast"] },
        { h: { en: "Imports", es: "Importar", pt: "Importar" }, tools: ["demandimport", "ecomdemand"] }
      ]
    },
    {
      id: "mfg",
      label: { en: "Mfg", es: "Mfg", pt: "Mfg" },
      title: { en: "Manufacturing", es: "Manufactura", pt: "Manufatura" },
      intro: { en: "Mix, P-Mac, production orders, the live machines, and the lot stations. Demand has its own tab.", es: "Mezcla, P-Mac, ordenes de produccion, las maquinas en vivo y las estaciones de lote. Demanda tiene su propia pestana.", pt: "Mistura, P-Mac, ordens de producao, as maquinas ao vivo e as estacoes de lote. Demanda tem sua propria aba." },
      sections: [
        { h: { en: "Lot trace stations", es: "Estaciones de lote", pt: "Estacoes de lote" }, tools: ["trRecv", "trQa", "trMix", "trPmac", "trMove"] },
        { h: { en: "Floor", es: "Piso", pt: "Piso" }, tools: ["mixing", "pmac", "pmacout", "floor"] },
        { h: { en: "Planning and history", es: "Plan y historial", pt: "Plano e historico" }, tools: ["prodorders", "reordertracker", "launch", "hist", "upload"] }
      ]
    },
    {
      id: "ful",
      label: { en: "Fulfill", es: "Fulfill", pt: "Fulfill" },
      title: { en: "Fulfillment", es: "Fulfillment", pt: "Fulfillment" },
      intro: { en: "Build retail and e-commerce orders and pull lots. Shipping has its own tab.", es: "Arme ordenes retail y de e-commerce y tome lotes. Envios tiene su propia pestana.", pt: "Monte pedidos de varejo e e-commerce e separe lotes. Envios tem sua propria aba." },
      sections: [
        { h: { en: "Line", es: "Linea", pt: "Linha" }, tools: ["retailprod", "ecomprod", "trUse", "produce", "prodlog", "fulfilldaily"] },
        { h: { en: "Lookup and stock", es: "Busqueda y stock", pt: "Busca e estoque" }, tools: ["skulookup", "flavinv", "stockbuild"] },
        { h: { en: "Orders", es: "Ordenes", pt: "Pedidos" }, tools: ["orders", "orderdocs"] }
      ]
    },
    {
      id: "ship",
      label: { en: "Shipping", es: "Envios", pt: "Envios" },
      title: { en: "Shipping", es: "Envios", pt: "Envios" },
      intro: { en: "Log a shipment, read what ShipStation already synced, and build an outbound pallet.", es: "Registre un envio, lea lo que ShipStation ya sincronizo y arme una tarima de salida.", pt: "Registre um envio, leia o que o ShipStation ja sincronizou e monte um palete de saida." },
      sections: [
        { h: { en: "Outbound", es: "Salida", pt: "Saida" }, tools: ["shiplog", "shipments", "trShip"] }
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
      id: "team",
      label: { en: "Team", es: "Equipo", pt: "Equipe" },
      title: { en: "Team & Ops", es: "Equipo y Ops", pt: "Equipe e Ops" },
      intro: { en: "People, continuous improvement, R&D, and the activity log.", es: "Personal, mejora continua, I+D y el registro de actividad.", pt: "Pessoas, melhoria continua, P&D e o registro de atividade." },
      sections: [
        { h: { en: "People and ideas", es: "Personal e ideas", pt: "Pessoas e ideias" }, tools: ["people", "improve", "rd", "acct"] }
      ]
    },
    {
      id: "maint",
      label: { en: "Maint", es: "Mant.", pt: "Manut." },
      title: { en: "Maintenance", es: "Mantenimiento", pt: "Manutencao" },
      intro: { en: "Maintenance requests and the services log.", es: "Solicitudes de mantenimiento y el registro de servicios.", pt: "Pedidos de manutencao e o registro de servicos." },
      sections: [
        { h: { en: "Shop", es: "Taller", pt: "Oficina" }, tools: ["maintenance", "services"] }
      ]
    },
    {
      id: "docs",
      label: { en: "Docs", es: "Docs", pt: "Docs" },
      title: { en: "Docs", es: "Docs", pt: "Docs" },
      intro: { en: "SOPs, cheat sheets, and policies.", es: "SOPs, guias rapidas y politicas.", pt: "SOPs, guias rapidos e politicas." },
      sections: [
        { h: { en: "Reference", es: "Referencia", pt: "Referencia" }, tools: ["reference"] }
      ]
    },
    {
      id: "system",
      label: { en: "System", es: "Sistema", pt: "Sistema" },
      title: { en: "System", es: "Sistema", pt: "Sistema" },
      intro: { en: "TV boards, settings, and how fresh each data source is.", es: "Tableros de TV, ajustes y que tan reciente esta cada fuente.", pt: "Paineis de TV, ajustes e quao recente esta cada fonte." },
      sections: [
        { h: { en: "Setup", es: "Ajustes", pt: "Ajustes" }, tools: ["board", "settings", "health"] }
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

  function drawerOpen() {
    var nav = document.getElementById("nav");
    return !!(nav && nav.classList.contains("open"));
  }

  // The header button toggles the panel. Any other click while it is open
  // is outside the panel (including the dimmed backdrop) and closes it.
  function onDrawerOutside(e) {
    if (!drawerOpen()) return;
    var t = e.target;
    if (t && t.nodeType !== 1) t = t.parentElement;
    if (!t || !t.closest) return;
    if (t.closest("#nav") || t.closest("#navToggle")) return;
    closeDrawer();
  }

  function onDrawerKey(e) {
    if (!drawerOpen()) return;
    if (e.key !== "Escape" && e.key !== "Esc") return;
    closeDrawer();
  }

  function deptOfNav(btn) {
    if (!btn) return "";
    if (btn.id === "svc-nav") return "maint";
    if (btn.id === "dh-nav") return "system";
    if (btn.id === "sf-nav") return "purch";
    if (btn.id === "shs-nav" || btn.id === "trc-nav-ship") return "ship";
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
    if (fn === "health" && window.DATAHEALTH && typeof DATAHEALTH.open === "function") { DATAHEALTH.open(); return; }
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
      return '<button type="button" class="dept-tab' + (on ? " on" : "") + '" data-dept="' + d.id + '" title="' + esc(tx(d.title || d.label)) + '"' +
        (on ? ' aria-current="page"' : "") + '>' + esc(tx(d.label)) + '</button>';
    }).join("");
    scrollActiveTab();
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
    scrollActiveTab();
  }

  function scrollActiveTab() {
    var bar = document.getElementById("deptbar");
    if (!bar) return;
    var onBtn = bar.querySelector(".dept-tab.on");
    if (!onBtn) return;
    var r = onBtn.getBoundingClientRect();
    var b = bar.getBoundingClientRect();
    if (r.left < b.left) bar.scrollLeft -= (b.left - r.left + 8);
    else if (r.right > b.right) bar.scrollLeft += (r.right - b.right + 8);
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
    barCurrent = id;
    paintTries = 0;
    closeDrawer();
    if (dept.live && typeof window.UI_go === "function") {
      homeId = "";
      markBar();
      paintDeptActive();
      window.UI_go(dept.live);
      try { window.scrollTo(0, 0); } catch (e) {}
      syncOffset();
      return;
    }
    homeId = id;
    paintHome();
    markBar();
    paintDeptActive();
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

  function noteDashboard() {
    if (homeId) return;
    var view = document.getElementById("view");
    if (!view || !view.querySelector(".df-lead")) return;
    if (barCurrent !== "home") {
      barCurrent = "home";
      markBar();
      paintDeptActive();
    }
    var lead = view.querySelector(".df-lead");
    if (!lead || lead.querySelector("#dept-daily-link")) return;
    var btn = document.createElement("button");
    btn.id = "dept-daily-link";
    btn.type = "button";
    btn.textContent = tx({ en: "Daily metrics", es: "Metricas del dia", pt: "Metricas do dia" });
    btn.addEventListener("click", function () { openTool("daily"); });
    lead.appendChild(btn);
  }

  function onView() {
    if (painting) return;
    if (lang() !== shownLang) renderBar();
    noteDashboard();
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
    injectDeptNav();
  }

  function paintDeptActive() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var current = homeId || barCurrent;
    var buttons = nav.querySelectorAll("#dept-nav-homes [data-dept-nav]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-dept-nav") === current);
    }
  }

  function injectDeptNav() {
    var nav = document.getElementById("nav");
    if (!nav || !nav.querySelector(".navitem, .navlabel")) return;
    var existing = document.getElementById("dept-nav-homes");
    if (existing && existing.getAttribute("data-lang") === lang()) return;
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var block = document.createElement("div");
    block.className = "navgroup";
    block.id = "dept-nav-homes";
    block.setAttribute("data-lang", lang());
    var label = tx({ en: "Departments", es: "Departamentos", pt: "Departamentos" });
    block.innerHTML = '<div class="navlabel">' + esc(label) + '</div>' +
      DEPTS.map(function (d) {
        var on = d.id === (homeId || barCurrent);
        return '<button type="button" class="navitem' + (on ? " active" : "") + '" data-dept-nav="' + esc(d.id) + '">' +
          '<i class="navico" data-lucide="layout-grid"></i><span>' + esc(tx(d.title || d.label)) + '</span></button>';
      }).join("");
    var firstGroup = nav.querySelector(".navgroup");
    if (firstGroup) nav.insertBefore(block, firstGroup);
    else nav.appendChild(block);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }

  function styleOnce() {
    if (document.getElementById("dept-style")) return;
    var s = document.createElement("style");
    s.id = "dept-style";
    s.textContent = [
      "#dept-stack{position:sticky;top:0;z-index:70}",
      "#dept-stack header{padding:4px 8px!important;gap:8px!important}",
      "#dept-stack .logo{font-size:16px!important;line-height:1.05!important;letter-spacing:0!important}",
      "#dept-stack .sub{font-size:11px!important;line-height:1.1!important}",
      "#dept-stack .beta{font-size:9px!important;padding:1px 4px!important;margin-left:3px!important}",
      "#dept-stack .navtoggle{padding:2px 7px!important;font-size:16px!important;margin-right:2px!important}",
      "#dept-stack .modebadge{padding:2px 6px!important;font-size:10px!important}",
      "#dept-stack .lang button{padding:2px 6px!important;font-size:12px!important;margin-left:3px!important}",
      "#deptbar{display:flex;width:100%;box-sizing:border-box;gap:2px;align-items:stretch;overflow-x:auto;background:#fff;border-bottom:1px solid var(--line,#d7dde6);padding:2px 4px 3px;-webkit-overflow-scrolling:touch}",
      "#deptbar .dept-tab{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;font-family:inherit;font-weight:700;font-size:12px;line-height:1.05;color:var(--navy,#04223B);background:var(--light,#E1EEF7);border:1px solid transparent;border-radius:6px;padding:4px 2px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:28px}",
      "#deptbar .dept-tab:hover{border-color:var(--blue,#006DB6)}",
      "#deptbar .dept-tab.on{background:var(--orange,#F26B21);color:#fff}",
      "#deptbar .dept-tab:focus-visible{outline:3px solid var(--blue,#006DB6);outline-offset:2px}",
      "nav#nav{position:fixed!important;top:0;left:-320px!important;bottom:0;height:100vh;max-height:none!important;width:300px!important;flex:none!important;z-index:80;transform:none!important;transition:left .22s ease;box-shadow:2px 0 14px rgba(0,0,0,.25);visibility:visible!important;pointer-events:auto!important;overflow-y:auto!important;background:#fff}",
      "nav#nav.open{left:0!important}",
      "#navToggle,.navtoggle{display:inline-block!important}",
      "#navBackdrop.show{display:block!important;position:fixed!important;inset:0!important;background:rgba(0,0,0,.4);z-index:75}",
      ".layout{display:block!important;max-width:none!important;width:100%!important;margin:0!important}",
      "main{padding:4px 6px 12px!important}",
      "main,#view{max-width:none!important;width:100%!important;flex:none!important}",
      "#view:has(>.df-lead){display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:stretch}",
      "#view:has(>.df-lead)>.df-banner,#view:has(>.df-lead)>.df-lead,#view:has(>.df-lead)>#df-inbound,#view:has(>.df-lead)>.df-note{grid-column:1 / -1}",
      "#view:has(>.df-lead)>.df-grid{display:contents}",
      "#view .df-grid{gap:6px;margin:0}",
      "#view .df-grid>.card,#view #df-inbound,#view .df-lead{padding:8px 10px;border-radius:8px;margin:0}",
      "#view .df-lead h2{font-size:16px;margin:0}",
      "#view .df-head{margin:0 0 4px;gap:6px}",
      "#view .df-head h2{font-size:15px}",
      "#view .df-empty{font-size:14px;margin:4px 0 2px}",
      "#view .df-scroll{max-height:280px}",
      "#view table.df.df-wide{min-width:0}",
      "#view table.df th,#view table.df td{padding:4px 6px}",
      "#view .df-note{margin:0}",
      "#dept-daily-link{display:inline-block;margin:6px 0 0;padding:0;border:0;background:transparent;color:var(--blue,#006DB6);font:800 13px inherit;cursor:pointer}",
      "#dept-home{padding:0 0 12px}",
      "#dept-home h1{margin:0 0 2px;color:var(--navy,#04223B);font-size:18px;line-height:1.1}",
      "#dept-home .hint{margin:0 0 4px;font-size:12px}",
      "#dept-home .dept-sec{margin:10px 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5c6b7c;font-weight:800}",
      "#dept-home .dept-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:6px}",
      "#dept-home .dept-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#fff;border:1px solid var(--line,#d7dde6);border-radius:8px;padding:8px 10px;cursor:pointer;min-height:0;box-shadow:none;font-family:inherit;color:inherit;width:100%}",
      "#dept-home .dept-card:hover{border-color:var(--blue,#006DB6);box-shadow:0 4px 14px rgba(4,34,59,.08)}",
      "#dept-home .dept-card:focus-visible{outline:3px solid var(--blue,#006DB6);outline-offset:2px}",
      "#dept-home .dept-ico{color:var(--orange,#F26B21);width:22px;height:22px;margin-bottom:6px}",
      "#dept-home .dept-ico svg{width:22px;height:22px;stroke-width:1.75}",
      "#dept-home .dept-card strong{display:block;font-size:14px;color:var(--navy,#04223B);margin:0 0 2px}",
      "#dept-home .dept-card span{display:block;font-size:12px;color:#3d4c5e;line-height:1.25;font-weight:500}",
      "body.boardmode #deptbar{display:none!important}",
      "@media(max-width:1100px){#view:has(>.df-lead){grid-template-columns:repeat(2,minmax(0,1fr))}}",
      "@media(max-width:700px){#view:has(>.df-lead){grid-template-columns:1fr}}",
      "@media(max-width:1080px){#deptbar .dept-tab{flex:1 0 84px;min-width:84px}}",
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
    if (nav) nav.removeAttribute("aria-hidden");
    var toggle = document.getElementById("navToggle");
    if (toggle) toggle.removeAttribute("aria-hidden");
    if (nav && !nav.__deptHomeClick) {
      nav.__deptHomeClick = true;
      nav.addEventListener("touchstart", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-dept-nav]") : null;
        if (!btn) return;
        touchArmed = true;
        pressBusy = entryInProgress();
      }, { passive: true });
      nav.addEventListener("mousedown", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-dept-nav]") : null;
        if (!btn) return;
        if (touchArmed) { touchArmed = false; return; }
        pressBusy = entryInProgress();
      });
      nav.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-dept-nav]") : null;
        if (!btn) return;
        showHome(btn.getAttribute("data-dept-nav"));
      });
    }
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
        if (!t || t.id === "dept-release" || t.getAttribute("data-dept-nav")) return;
        if (homeId) homeId = "";
        barCurrent = deptOfNav(t);
        markBar();
        paintDeptActive();
      }, true);
    }
    if (!window.__deptResize) {
      window.__deptResize = true;
      window.addEventListener("resize", syncOffset);
    }
    if (!document.documentElement.__deptDrawerOff) {
      document.documentElement.__deptDrawerOff = true;
      document.addEventListener("click", onDrawerOutside);
      document.addEventListener("keydown", onDrawerKey);
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

/* ============================================================================
   Smackin' OS - Department homes (dept-homes.js)
   Top department bar and a full-page home for each team. Tool cards sit
   directly under the title so a create or update screen is one tap away.
   Live counts and lists from DB follow those cards. Demand is the
   exception: the live floor (Now Running / In Process) is first, then
   the demand tools and lists. Each card opens a screen that already
   exists (UI_go, Lot Trace, or a module open()).
   Tabs, equal width, left to right: Dashboard, Demand, Purchasing,
   Receiving, Inventory, Mixing, P-Mac, Fulfillment, Shipping, Quality,
   and Ops (Team, Maintenance, Docs, and System). Each tab is a Lucide
   icon beside a short name. No Manufacturing tab.
   The menu stays off-canvas. A click outside the open panel, or Escape,
   closes it. The header button still toggles it. The left sidebar stays
   collapsed off screen. A tool, station, or other screen that replaces
   #view gets one Back control (same place, same wording) to the previous
   screen or the department home. It is a compact chip in the same
   language as the department tabs: navy label, Lucide chevron.
   Dashboard and department homes do not.
   No writes. No timers.
   ========================================================================== */
(function () {
  "use strict";

  var homeId = "";
  var barCurrent = "";
  var shownLang = "";
  var painting = false;
  var paintTries = 0;
  // Where Back returns. Top of the stack is the previous screen.
  // kind: "home" (department id), "go" (UI_go tab), "trace", "mod".
  var backStack = [];
  var backHere = null;
  var backRestoring = false;
  var backPressBusy = false;
  var DEMAND_TABS = { demand: 1, demandboard: 1, demandsched: 1, demandimport: 1, ecomdemand: 1, forecast: 1 };
  // A department tap blurs the field before click, so remember the mid-entry
  // check from the press itself. Touch sends a later mousedown after the blur.
  var pressBusy = false;
  var touchArmed = false;

  var TAB_DEPT = {
    home: "home", daily: "home",
    receive: "recv", recvlog: "recv", returns: "inv", qa: "recv",
    dash: "inv", adjust: "inv", count: "inv", alerts: "inv",
    move: "inv", locations: "inv", facility: "inv", finbags: "inv",
    seed: "inv", skus: "inv", analytics: "inv", labels: "inv",
    seasoning: "mixing", recipes: "mixing",
    purchasing: "purch", expreceipts: "purch", reorder15: "purch", supplierpos: "purch",
    prodorders: "mixing", reordertracker: "mixing", launch: "mixing", mixing: "mixing",
    pmac: "pmac", pmacout: "pmac", floor: "demand",
    compliance: "qa", quality: "qa", disposition: "qa",
    maintenance: "ops",
    produce: "ful", retailprod: "ful", ecomprod: "ful", skulookup: "ful",
    prodlog: "ful", fulfilldaily: "ful", flavinv: "ful", stockbuild: "ful",
    orders: "ful", orderdocs: "ful",
    shiplog: "ship",
    demand: "demand", demandboard: "demand", demandsched: "demand", demandimport: "demand",
    ecomdemand: "demand", forecast: "demand",
    people: "ops", improve: "ops", rd: "ops", log: "ops",
    reference: "ops", board: "ops", settings: "ops"
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
    recvlog: { go: "recvlog", icon: "inbox", title: { en: "Receiving Log", es: "Registro de Recibo", pt: "Registro de Recebimento" }, blurb: { en: "WHSE_FORM_1.0 checklist for each lot. N or UA holds the lot.", es: "Lista WHSE_FORM_1.0 por lote. N o UA retiene el lote.", pt: "Lista WHSE_FORM_1.0 por lote. N ou UA retem o lote." } },
    returns: { go: "returns", icon: "rotate-ccw", title: { en: "Returns", es: "Devoluciones", pt: "Devolucoes" }, blurb: { en: "Adriana's screen. Hold, release to stock, scrap, or other. Dock uses this same screen.", es: "Pantalla de Adriana. Retener, liberar, desechar u otro. El muelle abre la misma pantalla.", pt: "Tela da Adriana. Reter, liberar, descartar ou outro. O cais abre a mesma tela." } },
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
    batchrec: { fn: "batchrec", icon: "clipboard-list", title: { en: "Batch Tracking Record", es: "Registro de lote", pt: "Registro de lote" }, blurb: { en: "One sheet per flavor, date, and shift. Lots can fill from today's mixing scans.", es: "Una hoja por sabor, fecha y turno. Los lotes pueden llenarse con los escaneos de mezcla de hoy.", pt: "Uma ficha por sabor, data e turno. Os lotes podem vir das leituras de mistura de hoje." } },
    trPmac: { trace: "pmac", icon: "package-open", title: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" }, blurb: { en: "Lot station: finish a pallet and print its label.", es: "Estacion de lote: termine una tarima e imprima su etiqueta.", pt: "Estacao de lote: feche um palete e imprima a etiqueta." } },
    trMove: { trace: "move", icon: "arrow-left-right", title: { en: "Move", es: "Mover", pt: "Move" }, blurb: { en: "Lot station: scan a label, then scan the location.", es: "Estacion de lote: escanee la etiqueta y luego la ubicacion.", pt: "Estacao de lote: leia a etiqueta e depois o local." } },
    mixing: { go: "mixing", icon: "cooking-pot", title: { en: "Mixing", es: "Mezcla", pt: "Mistura" }, blurb: { en: "What mixing needs, and usage scanned into the room.", es: "Lo que mezcla necesita y el uso escaneado en el cuarto.", pt: "O que a mistura precisa e o uso lido na sala." } },
    pmac: { go: "pmac", icon: "wrench", title: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" }, blurb: { en: "What P-Mac needs, and usage scanned into the room.", es: "Lo que P-Mac necesita y el uso escaneado en el cuarto.", pt: "O que o P-Mac precisa e o uso lido na sala." } },
    pmacout: { go: "pmacout", icon: "package-open", title: { en: "P-Mac Log Output", es: "P-Mac Log Output", pt: "P-Mac Log Output" }, blurb: { en: "Log finished bags as they come off the line.", es: "Registre bolsas terminadas al salir de la linea.", pt: "Registre sacos prontos ao sair da linha." } },
    floor: { go: "floor", icon: "activity", title: { en: "Now Running / In Process", es: "En marcha / En proceso", pt: "Em andamento / Em processo" }, blurb: { en: "What is mixing, and what each P-Mac is running.", es: "Que se esta mezclando y que corre cada P-Mac.", pt: "O que esta misturando e o que cada P-Mac esta rodando." } },
    prodorders: { go: "prodorders", icon: "clipboard-pen", title: { en: "Prod Orders", es: "Prod Orders", pt: "Prod Orders" }, blurb: { en: "Production orders for Mixing and P-Mac.", es: "Ordenes de produccion para Mezcla y P-Mac.", pt: "Ordens de producao para Mistura e P-Mac." } },
    reordertracker: { go: "reordertracker", icon: "package-search", title: { en: "Reorder Tracker", es: "Reorder Tracker", pt: "Reorder Tracker" }, blurb: { en: "Allen's pallet and bin reorder tracker.", es: "El tracker de reorden de tarimas y bins de Allen.", pt: "O tracker de reposicao de paletes e bins do Allen." } },
    launch: { go: "launch", icon: "rocket", title: { en: "Launches", es: "Launches", pt: "Launches" }, blurb: { en: "New-flavor launch calendar.", es: "Calendario de lanzamiento de sabores nuevos.", pt: "Calendario de lancamento de sabores novos." } },
    hist: { fn: "hist", icon: "history", title: { en: "Production History", es: "Production History", pt: "Production History" }, blurb: { en: "Past mixing and P-Mac runs.", es: "Corridas anteriores de mezcla y P-Mac.", pt: "Corridas anteriores de mistura e P-Mac." } },
    upload: { fn: "up", icon: "upload", title: { en: "Upload Production", es: "Upload Production", pt: "Upload Production" }, blurb: { en: "Load a mixing or P-Mac history file.", es: "Cargue un archivo de historial de mezcla o P-Mac.", pt: "Carregue um arquivo de historico de mistura ou P-Mac." } },
    trace: { trace: "trace", icon: "git-branch", title: { en: "Trace", es: "Rastrear", pt: "Trace" }, blurb: { en: "Look up a label, lot, supplier lot, or PO.", es: "Busque una etiqueta, lote, lote de proveedor u orden.", pt: "Busque uma etiqueta, lote, lote de fornecedor ou OC." } },
    trLabels: { trace: "labels", icon: "tags", title: { en: "Labels", es: "Etiquetas", pt: "Labels" }, blurb: { en: "Search lot labels and reprint one.", es: "Busque etiquetas de lote y reimprima una.", pt: "Busque etiquetas de lote e reimprima uma." } },
    quality: { go: "quality", icon: "microscope", title: { en: "Quality Logs", es: "Quality Logs", pt: "Quality Logs" }, blurb: { en: "CCP checks: allergen changeover, label verify, metal detector.", es: "Registros CCP: cambio de alergeno, verificacion de etiqueta, detector de metal.", pt: "Registros CCP: troca de alergeno, verificacao de rotulo, detector de metal." } },
    qacheck: { fn: "qacheck", icon: "clipboard-check", title: { en: "QA Checklists", es: "Listas de calidad", pt: "Listas de qualidade" }, blurb: { en: "Pre-op, GMP, metal detector, and hourly pouch checks. Paper stays the backup until QA confirms digital storage.", es: "Preoperacional, GMP, detector de metal y revision horaria de bolsas. El papel sigue como respaldo hasta que Calidad confirme el almacenamiento digital.", pt: "Pre-op, GMP, detector de metal e checagem horaria de sache. O papel continua como copia de apoio ate a Qualidade confirmar o armazenamento digital." } },
    compliance: { go: "compliance", icon: "shield-check", title: { en: "Compliance / SQF", es: "Cumplimiento / SQF", pt: "Conformidade / SQF" }, blurb: { en: "Certifications, the SQF calendar, and controlled documents.", es: "Certificaciones, el calendario SQF y documentos controlados.", pt: "Certificacoes, o calendario SQF e documentos controlados." } },
    sqftasks: { fn: "sqf", icon: "list-checks", title: { en: "SQF Tasks", es: "Tareas SQF", pt: "Tarefas SQF" }, blurb: { en: "Outstanding SQF clauses, owners, and due dates. This list is the live copy.", es: "Clausulas SQF pendientes, responsables y fechas. Esta lista es la copia viva.", pt: "Clausulas SQF pendentes, responsaveis e datas. Esta lista e a copia viva." } },
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
    fulfillerr: { fn: "ferr", icon: "alert-triangle", title: { en: "Fulfillment Errors", es: "Errores de Fulfillment", pt: "Erros de Fulfillment" }, blurb: { en: "Error history, cost by month, and returns. Log a new error or return.", es: "Historial de errores, costo por mes y devoluciones. Registre un error o una devolucion.", pt: "Historico de erros, custo por mes e devolucoes. Registre um erro ou uma devolucao." } },
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
      icon: "layout-dashboard",
      label: { en: "Dashboard", es: "Panel", pt: "Painel" },
      title: { en: "Dashboard", es: "Panel", pt: "Painel" },
      intro: { en: "Facility snapshot: stock, orders pulled today, and open inbound POs.", es: "Resumen de la planta: stock, ordenes tomadas hoy y compras abiertas.", pt: "Resumo da planta: estoque, pedidos puxados hoje e compras abertas." },
      sections: [
        { h: { en: "Facility", es: "Planta", pt: "Planta" }, tools: ["desk", "daily"] }
      ]
    },
    {
      id: "demand",
      runningFirst: true,
      icon: "activity",
      label: { en: "Demand", es: "Demanda", pt: "Demanda" },
      title: { en: "Demand", es: "Demanda", pt: "Demanda" },
      intro: { en: "What is running on the floor right now, then what to build and the order board.", es: "Que corre en el piso ahora, luego que producir y el tablero de pedidos.", pt: "O que esta rodando no piso agora, depois o que produzir e o painel de pedidos." },
      sections: [
        { h: { en: "Floor", es: "Piso", pt: "Piso" }, tools: ["floor"] },
        { h: { en: "Plan", es: "Plan", pt: "Plano" }, tools: ["demand", "demandboard", "demandsched", "forecast"] },
        { h: { en: "Imports", es: "Importar", pt: "Importar" }, tools: ["demandimport", "ecomdemand"] }
      ]
    },
    {
      id: "purch",
      icon: "shopping-cart",
      label: { en: "Purchasing", es: "Compras", pt: "Compras" },
      title: { en: "Purchasing", es: "Compras", pt: "Compras" },
      intro: { en: "Purchase orders, what is due in, and the inbound SPS feed.", es: "Ordenes de compra, lo que debe llegar y el feed SPS de entrada.", pt: "Ordens de compra, o que deve chegar e o feed SPS de entrada." },
      sections: [
        { h: { en: "Purchase orders", es: "Ordenes de compra", pt: "Ordens de compra" }, tools: ["purchasing", "expreceipts", "reorder15"] },
        { h: { en: "Inbound", es: "Entrada", pt: "Entrada" }, tools: ["sps"] }
      ]
    },
    {
      id: "recv",
      icon: "package-check",
      label: { en: "Receiving", es: "Recibo", pt: "Receber" },
      title: { en: "Receiving", es: "Recibo", pt: "Recebimento" },
      intro: { en: "Check product in, log the paperwork, and work quarantine. Returns opens Adriana's Inventory screen.", es: "Reciba producto, registre el papeleo y trabaje cuarentena. Devoluciones abre la pantalla de Inventario.", pt: "Receba produto, registre os documentos e trabalhe a quarentena. Devolucoes abre a tela de Estoque." },
      sections: [
        { h: { en: "Inbound", es: "Entrada", pt: "Entrada" }, tools: ["receive", "recvlog", "returns", "quarantine", "trRecv"] }
      ]
    },
    {
      id: "inv",
      icon: "boxes",
      label: { en: "Inventory", es: "Inventario", pt: "Estoque" },
      title: { en: "Inventory", es: "Inventario", pt: "Estoque" },
      intro: { en: "Counts, adjustments, moves, locations, seed, SKUs, labels, and reports.", es: "Conteos, ajustes, movimientos, ubicaciones, semilla, SKUs, etiquetas y reportes.", pt: "Contagens, ajustes, movimentos, locais, semente, SKUs, etiquetas e relatorios." },
      sections: [
        { h: { en: "Returns", es: "Devoluciones", pt: "Devolucoes" }, tools: ["returns"] },
        { h: { en: "Counts", es: "Conteos", pt: "Contagens" }, tools: ["dash", "adjust", "count", "alerts", "finbags", "move", "trMove"] },
        { h: { en: "Locations", es: "Ubicaciones", pt: "Locais" }, tools: ["locations", "facility"] },
        { h: { en: "Catalog", es: "Catalogo", pt: "Catalogo" }, tools: ["seed", "skus", "printlabels"] },
        { h: { en: "Reports", es: "Reportes", pt: "Relatorios" }, tools: ["analytics"] }
      ]
    },
    {
      id: "mixing",
      icon: "flask-conical",
      label: { en: "Mixing", es: "Mezcla", pt: "Mistura" },
      title: { en: "Mixing", es: "Mezcla", pt: "Mistura" },
      intro: { en: "What mixing needs, the lot station, seasoning, recipes, and production history.", es: "Lo que mezcla necesita, la estacion de lote, sazon, recetas y el historial.", pt: "O que a mistura precisa, a estacao de lote, tempero, receitas e o historico." },
      sections: [
        { h: { en: "Floor", es: "Piso", pt: "Piso" }, tools: ["mixing", "trMix", "batchrec"] },
        { h: { en: "Seasoning and recipes", es: "Sazon y recetas", pt: "Tempero e receitas" }, tools: ["seasoning", "recipes"] },
        { h: { en: "Planning and history", es: "Plan y historial", pt: "Plano e historico" }, tools: ["prodorders", "reordertracker", "launch", "hist", "upload"] }
      ]
    },
    {
      id: "pmac",
      icon: "factory",
      label: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" },
      title: { en: "P-Mac", es: "P-Mac", pt: "P-Mac" },
      intro: { en: "What P-Mac needs, bags off the line, and the lot station.", es: "Lo que P-Mac necesita, bolsas de la linea y la estacion de lote.", pt: "O que o P-Mac precisa, sacos da linha e a estacao de lote." },
      sections: [
        { h: { en: "Line", es: "Linea", pt: "Linha" }, tools: ["pmac", "pmacout", "trPmac"] },
        { h: { en: "Planning and history", es: "Plan y historial", pt: "Plano e historico" }, tools: ["prodorders", "hist", "upload"] }
      ]
    },
    {
      id: "ful",
      icon: "package",
      label: { en: "Fulfillment", es: "Fulfillment", pt: "Fulfillment" },
      title: { en: "Fulfillment", es: "Fulfillment", pt: "Fulfillment" },
      intro: { en: "Retail and e-commerce builds, lot trace use, and lot trace ship. Shipping has its own tab.", es: "Produccion retail y e-commerce, salida de lote y envio de lote. Envios tiene su propia pestana.", pt: "Producao de varejo e e-commerce, saida de lote e envio de lote. Envios tem sua propria aba." },
      sections: [
        { h: { en: "Line", es: "Linea", pt: "Linha" }, tools: ["retailprod", "ecomprod", "trUse", "trShip", "produce", "prodlog", "fulfilldaily"] },
        { h: { en: "Lookup and stock", es: "Busqueda y stock", pt: "Busca e estoque" }, tools: ["skulookup", "flavinv", "stockbuild"] },
        { h: { en: "Orders", es: "Ordenes", pt: "Pedidos" }, tools: ["orders", "orderdocs"] },
        { h: { en: "Errors and returns", es: "Errores y devoluciones", pt: "Erros e devolucoes" }, tools: ["fulfillerr"] }
      ]
    },
    {
      id: "ship",
      icon: "ship",
      label: { en: "Shipping", es: "Envios", pt: "Envios" },
      title: { en: "Shipping", es: "Envios", pt: "Envios" },
      intro: { en: "Log a shipment and read what ShipStation already synced.", es: "Registre un envio y lea lo que ShipStation ya sincronizo.", pt: "Registre um envio e leia o que o ShipStation ja sincronizou." },
      sections: [
        { h: { en: "Outbound", es: "Salida", pt: "Saida" }, tools: ["shiplog", "shipments"] }
      ]
    },
    {
      id: "qa",
      icon: "shield-check",
      label: { en: "Quality", es: "Calidad", pt: "Qualidade" },
      title: { en: "Quality", es: "Calidad", pt: "Qualidade" },
      intro: { en: "Lot trace, holds, labels, and the quality records this team already keeps.", es: "Rastreo de lote, retenciones, etiquetas y los registros de calidad que este equipo ya usa.", pt: "Rastreio de lote, retencoes, etiquetas e os registros de qualidade que esta equipe ja usa." },
      sections: [
        { h: { en: "Lot trace", es: "Rastreo de lote", pt: "Rastreio de lote" }, tools: ["trace", "trQa", "trLabels"] },
        { h: { en: "Quality records", es: "Registros de calidad", pt: "Registros de qualidade" }, tools: ["qacheck", "quality", "compliance", "sqftasks", "shortdated"] }
      ]
    },
    {
      id: "ops",
      icon: "settings",
      label: { en: "Ops", es: "Ops", pt: "Ops" },
      title: { en: "Ops", es: "Ops", pt: "Ops" },
      intro: { en: "People, maintenance, documents, and system setup.", es: "Personal, mantenimiento, documentos y ajustes del sistema.", pt: "Pessoas, manutencao, documentos e ajustes do sistema." },
      sections: [
        { h: { en: "Team", es: "Equipo", pt: "Equipe" }, tools: ["people", "improve", "rd", "acct"] },
        { h: { en: "Maintenance", es: "Mantenimiento", pt: "Manutencao" }, tools: ["maintenance", "services"] },
        { h: { en: "Docs", es: "Docs", pt: "Docs" }, tools: ["reference"] },
        { h: { en: "System", es: "Sistema", pt: "Sistema" }, tools: ["board", "settings", "health"] }
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
    if (btn.id === "svc-nav") return "ops";
    if (btn.id === "dh-nav") return "ops";
    if (btn.id === "sf-nav") return "purch";
    if (btn.id === "shs-nav") return "ship";
    if (btn.id === "mfg-hist-nav" || btn.id === "mfg-up-nav" || btn.id === "btr-nav") return "mixing";
    if (btn.id === "sqf-nav") return "qa";
    if (btn.id === "fa-nav") return "ful";
    if (btn.id === "mp-nav-entry" || btn.id === "mp-nav-log") return "mixing";
    var trcHome = {
      "trc-nav-use": "ful",
      "trc-nav-ship": "ful",
      "trc-nav-recv": "recv",
      "trc-nav-qa": "qa",
      "trc-nav-mix": "mixing",
      "trc-nav-pmac": "pmac",
      "trc-nav-move": "inv",
      "trc-nav-trace": "qa",
      "trc-nav-labels": "qa"
    };
    if (trcHome[btn.id]) return trcHome[btn.id];
    if (btn.getAttribute("data-trc") === "1") {
      var h = btn.getAttribute("data-trc-home") || "";
      if (h === "ful") return "ful";
      if (h === "qa") return "qa";
      if (h === "mixing") return "mixing";
      if (h === "pmac") return "pmac";
      if (h === "recv") return "recv";
      if (h === "inv") return "inv";
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
    if (fn === "batchrec" && window.BATCHREC && typeof BATCHREC.open === "function") { BATCHREC.open(); return; }
    if (fn === "sqf" && window.SQFTASKS && typeof SQFTASKS.open === "function") { SQFTASKS.open(); return; }
    if (fn === "ferr" && window.FULFILL_ANALYTICS && typeof FULFILL_ANALYTICS.open === "function") { FULFILL_ANALYTICS.open(); return; }
    if (fn === "qacheck" && window.QACHECK && typeof QACHECK.open === "function") { QACHECK.open(); return; }
    toast(Lmissing());
  }

  function cardHtml(id) {
    var tool = TOOLS[id];
    if (!tool) return "";
    return '<button type="button" class="dept-card" data-dept-tool="' + esc(id) + '">' +
      '<i class="dept-ico" data-lucide="' + esc(tool.icon) + '"></i>' +
      '<span class="dept-card-copy"><strong>' + esc(tx(tool.title)) + '</strong>' +
      '<span>' + esc(tx(tool.blurb)) + '</span></span></button>';
  }

  // ---- Live floor. Read-only. Same records the department screens already use.
  var ROW_CAP = 8;
  var traceState = "idle";

  function cloud() {
    try { return !!(window.DB && DB.mode === "cloud"); } catch (e) { return false; }
  }
  function dbReady() {
    return !!(window.DB && typeof DB.items === "function");
  }
  function arr(fn) {
    try { var v = fn(); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function num(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  function fmt(n) {
    var x = Number(n);
    if (isNaN(x)) x = 0;
    return (Math.round(x * 100) / 100).toLocaleString();
  }
  function slcDay(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function slcToday() { return slcDay(new Date().toISOString()); }
  // Date-only fields (production log, fulfillment daily, retail pallets) are
  // stored with the UTC day the rest of the app writes on those screens.
  function screenDay() { return new Date().toISOString().slice(0, 10); }
  function shiftDay(iso, n) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dueISO(d) {
    if (!d) return "";
    d = String(d).trim();
    var m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + "-" + ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2);
    return "";
  }
  function poKey(s) {
    return String(s || "").toUpperCase().replace(/\s+/g, "").replace(/-\d{2}$/, "");
  }
  function linesOf(po) {
    try {
      var l = typeof po.lines === "string" ? JSON.parse(po.lines || "[]") : (po.lines || []);
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }
  function pill(text, cls) {
    return '<span class="df-pill ' + cls + '">' + esc(text) + "</span>";
  }
  function jump(toolId) {
    if (!toolId) return "";
    return '<button type="button" class="dept-jump" data-dept-tool="' + esc(toolId) + '">' +
      esc(tx({ en: "Open", es: "Abrir", pt: "Abrir" })) + "</button>";
  }
  function stat(n, label, tone) {
    return '<div class="card dept-stat' + (tone ? " dept-" + tone : "") + '"><div class="dept-n">' + esc(n) +
      '</div><div class="dept-l">' + esc(label) + "</div></div>";
  }
  function statRow(cards) {
    return '<div class="dept-statrow">' + cards.join("") + "</div>";
  }
  function panel(title, body, span, toolId) {
    return '<div class="card dept-span' + (span || 2) + '"><div class="df-head"><h2 class="sub2">' + title + "</h2>" +
      jump(toolId) + "</div>" + body + "</div>";
  }
  function sub(text) {
    return '<p class="df-sub">' + esc(text) + "</p>";
  }
  function empty(text) {
    return '<p class="df-empty">' + esc(text) + "</p>";
  }
  function dfTable(cols, rows) {
    if (!rows.length) return "";
    var head = "<tr>" + cols.map(function (c) {
      return "<th" + (c.right ? ' class="right"' : "") + ">" + esc(c.h) + "</th>";
    }).join("") + "</tr>";
    var body = rows.map(function (r, i) {
      var hide = i >= ROW_CAP ? ' data-dept-extra="1" hidden' : "";
      return "<tr" + hide + ">" + r.map(function (cell, j) {
        return "<td" + (cols[j] && cols[j].right ? ' class="right"' : "") + ">" + cell + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var more = rows.length > ROW_CAP
      ? '<button type="button" class="df-more" onclick="DEPT.more(this)">' +
        esc(tx({ en: "Show all " + rows.length, es: "Ver los " + rows.length, pt: "Ver todos os " + rows.length })) + "</button>"
      : "";
    return '<div class="df-scroll"><table class="df"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" + more;
  }
  function notLoaded() {
    return panel(tx({ en: "Live data", es: "Datos en vivo", pt: "Dados ao vivo" }),
      empty(tx({ en: "Inventory data is not loaded yet.", es: "Los datos aun no cargan.", pt: "Os dados ainda nao carregaram." })), 4, "");
  }

  function stockSplit() {
    var out = [], low = [];
    arr(function () { return DB.items(); }).forEach(function (it) {
      if (!it || !(Number(it.reorder) > 0)) return;
      var oh = null;
      try { oh = DB.availableOnHand ? DB.availableOnHand(it.id) : DB.onHand(it.id); } catch (e) { oh = null; }
      if (oh == null || oh !== oh) return;
      if (oh <= 0) out.push({ it: it, oh: oh });
      else if (oh < Number(it.reorder)) low.push({ it: it, oh: oh });
    });
    out.sort(function (a, b) { return String(a.it.name || "").localeCompare(String(b.it.name || "")); });
    low.sort(function (a, b) {
      return (Number(b.it.reorder) - b.oh) - (Number(a.it.reorder) - a.oh);
    });
    return { out: out, low: low };
  }
  function stockRows(list, kind) {
    return list.map(function (r) {
      var it = r.it;
      var gap = Math.max(0, (Number(it.reorder) || 0) - r.oh);
      return [
        '<div class="df-name">' + esc(it.name || it.code || "") + '</div><div class="df-meta">' + esc(it.code || it.id || "") + "</div>",
        "<b>" + fmt(r.oh) + "</b> " + esc(it.unit || ""),
        fmt(it.reorder),
        pill(kind === "out" ? "OUT" : "LOW", kind === "out" ? "df-out" : "df-low") +
          (gap ? '<div class="df-meta">' + fmt(gap) + " short</div>" : "")
      ];
    });
  }
  function quarantineRows() {
    var hold = [];
    var items = arr(function () { return DB.items(); });
    ["QA-HOLD", "QUARANTINE", "RETURNS-HOLD"].forEach(function (z) {
      items.forEach(function (i) {
        var q = 0;
        try { q = Number(DB.atLoc(i.id, z)) || 0; } catch (e) { q = 0; }
        if (q > 0) hold.push({ name: i.name || i.code || i.id, code: i.code || i.id, unit: i.unit || "", zone: z, qty: q });
      });
    });
    hold.sort(function (a, b) { return b.qty - a.qty || String(a.name).localeCompare(String(b.name)); });
    return hold;
  }
  function openSupplierPos() {
    var rlog = arr(function () { return DB.receivingLog(); });
    var out = [];
    var spos = arr(function () { return DB.supplierPos(); });
    spos.forEach(function (po) {
      var derived = null;
      try { if (window.POSTATUS && POSTATUS.derive) derived = POSTATUS.derive(po, rlog, spos); } catch (e) { derived = null; }
      if (derived && derived.status !== "open" && derived.status !== "partial") return;
      if (!derived && /\b(cancel+ed|cancel|void(ed)?)\b/i.test(String(po.notes || ""))) return;
      var raw = linesOf(po);
      var openLines = [];
      var outstanding = 0;
      raw.forEach(function (l, i) {
        var recv = derived && derived.lines && derived.lines[i] ? !!derived.lines[i].recv : !!(l.recv || l.received === true);
        if (recv) return;
        var q = num(l.qty || l.quantity);
        outstanding += q;
        openLines.push({
          desc: l.desc || l.description || l.product || l.item || l.item_no || "Line",
          qty: l.qty || l.quantity || "",
          uom: l.uom || l.unit_of_measure || "",
          ship: String(l.ship || l.ship_date || l.expected || l.eta || "").slice(0, 10)
        });
      });
      if (raw.length && !openLines.length) return;
      var expect = openLines.map(function (l) { return l.ship; }).filter(Boolean).sort()[0] || String(po.expected || "").slice(0, 10);
      var chip = "";
      try { if (window.POSTATUS && POSTATUS.statusLabel) chip = POSTATUS.statusLabel(po.notes); } catch (eChip) { chip = ""; }
      out.push({
        num: po.po_num || po.id || "",
        vendor: po.vendor || "",
        date: String(po.po_date || po.created_at || "").slice(0, 10),
        expect: expect,
        lines: openLines,
        outstanding: outstanding,
        nLines: openLines.length,
        partial: !!(derived && derived.status === "partial"),
        statusLabel: chip
      });
    });
    arr(function () { return DB.purchaseOrders(); }).forEach(function (po) {
      var st = String(po.status || "").toLowerCase();
      if (st !== "ordered" && st !== "partial") return;
      var openLines = [];
      var outstanding = 0;
      (po.lines || []).forEach(function (l) {
        var open = (Number(l.qty) || 0) - (Number(l.received) || 0);
        if (!(open > 0)) return;
        outstanding += open;
        var name = l.item_id;
        try {
          var items = DB.items() || [];
          for (var i = 0; i < items.length; i++) if (items[i].id === l.item_id) { name = items[i].name || name; break; }
        } catch (e) {}
        openLines.push({ desc: name || "Line", qty: open, uom: "", ship: String(po.expected || "").slice(0, 10) });
      });
      if (!openLines.length) return;
      var vendor = po.supplier || "";
      try { if (DB.supplierName) vendor = DB.supplierName(po.supplier) || vendor; } catch (e2) {}
      out.push({
        num: po.id || "", vendor: vendor, date: String(po.created || "").slice(0, 10),
        expect: String(po.expected || "").slice(0, 10), lines: openLines,
        outstanding: outstanding, nLines: openLines.length, legacy: true
      });
    });
    out.sort(function (a, b) { return String(a.expect || "9999").localeCompare(String(b.expect || "9999")) || String(a.num).localeCompare(String(b.num)); });
    return out;
  }
  function poTable(list) {
    return dfTable(
      [{ h: "PO" }, { h: "Vendor" }, { h: "Expected" }, { h: "Still open", right: true }],
      list.map(function (r) {
        var bits = r.lines.slice(0, 3).map(function (l) {
          var q = l.qty === "" || l.qty == null ? "" : fmt(num(l.qty)) || esc(l.qty);
          return esc(l.desc) + (l.qty !== "" && l.qty != null ? " · " + (typeof l.qty === "number" ? fmt(l.qty) : esc(l.qty)) + (l.uom ? " " + esc(l.uom) : "") : "");
        });
        var extra = r.lines.length > 3 ? '<div class="df-meta">+' + (r.lines.length - 3) + " more</div>" : "";
        return [
          "<b>" + esc(r.num || "-") + "</b>" +
            (r.partial ? ' <span class="pill partial">Partially received</span>' : "") +
            (r.statusLabel ? ' <span class="pill status">' + esc(r.statusLabel) + '</span>' : "") +
            (r.legacy ? '<div class="df-meta">Legacy PO</div>' : ""),
          esc(r.vendor || "-"),
          esc(r.expect || "-"),
          "<b>" + fmt(r.outstanding) + "</b>" + '<div class="df-meta">' + r.nLines + (r.nLines === 1 ? " line" : " lines") + "</div>" +
            bits.map(function (s) { return "<div>" + s + "</div>"; }).join("") + extra
        ];
      })
    );
  }
  function recentReceipts() {
    return arr(function () { return DB.receivingLog(); }).slice().sort(function (a, b) {
      return String(b.recv_date || b.created_at || "").localeCompare(String(a.recv_date || a.created_at || ""));
    });
  }
  function recentReturns() {
    return arr(function () { return DB.returnsLog ? DB.returnsLog() : []; }).slice().sort(function (a, b) {
      return String(b.return_date || b.created_at || "").localeCompare(String(a.return_date || a.created_at || ""));
    });
  }
  function sdExpDate(s) {
    s = String(s || "").trim();
    var m;
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[1] - 1, +m[2]);
    if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return new Date(+m[2], +m[1] - 1, 28);
    if ((m = s.match(/^(\d{4})$/))) return new Date(+m[1], 11, 31);
    var d = new Date(s);
    return isNaN(d) ? null : d;
  }
  function sdDays(s) {
    var d = sdExpDate(s);
    return d ? Math.round((d - Date.now()) / 864e5) : null;
  }
  function sdFlag(x) {
    var days = sdDays(x.exp), t = String(x.type || "").toLowerCase();
    if (t.indexOf("off") >= 0) return "OFF-FLAVOR";
    if (days != null && days < 0) return "EXPIRED";
    if (days != null && days <= 120) return "SHORT-DATED";
    if (t.indexOf("discont") >= 0) return "DISCONTINUED";
    return "OK";
  }
  function shortDated() {
    var seed = (typeof window !== "undefined" && window.SHORTDATED_SEED) ? window.SHORTDATED_SEED : [];
    return seed.map(function (x) {
      var flag = sdFlag(x);
      var disp = "Open";
      try { if (DB.kvGet) disp = DB.kvGet("sd:" + x.id) || "Open"; } catch (e) {}
      return {
        flavor: x.flavor, size: x.size, exp: x.exp, type: x.type,
        bags: num(String(x.bags).replace(/[^0-9.]/g, "")),
        flag: flag, disp: disp, days: sdDays(x.exp)
      };
    }).filter(function (r) { return r.flag !== "OK"; });
  }
  function fgOnHand() {
    var bag4 = 0, bag15 = 0, rows = [];
    arr(function () { return DB.items(); }).forEach(function (i) {
      if (i.category !== "bag4" && i.category !== "bag15") return;
      var oh = 0;
      var held = 0;
      try { oh = Number(DB.availableOnHand ? DB.availableOnHand(i.id) : DB.onHand(i.id)) || 0; } catch (e) { oh = 0; }
      try { held = Number(DB.heldOnHand ? DB.heldOnHand(i.id) : 0) || 0; } catch (e2) { held = 0; }
      if (i.category === "bag4") bag4 += oh; else bag15 += oh;
      if (oh > 0 || held > 0) rows.push({ name: i.name || i.flavor || i.code, code: i.code || i.id, unit: i.unit || "", oh: oh, held: held, cat: i.category });
    });
    rows.sort(function (a, b) { return b.oh - a.oh; });
    return { bag4: bag4, bag15: bag15, rows: rows };
  }
  function buyRows() {
    return stockSplit().out.concat(stockSplit().low).map(function (r) {
      var onOrder = 0;
      try { onOrder = DB.onOrder ? Number(DB.onOrder(r.it.id)) || 0 : 0; } catch (e) { onOrder = 0; }
      return { it: r.it, oh: r.oh, gap: Math.max(0, (Number(r.it.reorder) || 0) - r.oh), onOrder: onOrder };
    });
  }
  function orderShipped(o) {
    var t = String((o && o.tracking) || "").trim();
    return !!t && !/^ip$/i.test(t) && /(1z|\d{3,}|pick|deliver|ship|xpo|estes|fedex|ups|odfl|r\+l|saia|old dominion)/i.test(t);
  }
  function openToShip() {
    return arr(function () { return DB.orders(); }).filter(function (o) {
      return (o.status || "Open") !== "Complete" && !orderShipped(o);
    }).sort(function (a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
  }
  function pulledRows() {
    var orders = arr(function () { return DB.orders(); });
    var by = {};
    arr(function () { return DB.demandLines ? DB.demandLines() : []; }).forEach(function (l) {
      var k = poKey(l.po);
      if (!k) return;
      (by[k] = by[k] || []).push(l);
    });
    var known = {};
    var rows = orders.map(function (o) {
      var a = poKey(o.customer_po), b = poKey(o.order_id);
      if (a) known[a] = 1;
      if (b) known[b] = 1;
      var lines = [];
      [a, b].forEach(function (k) { if (k && by[k]) lines = lines.concat(by[k]); });
      var flavors = {};
      lines.forEach(function (l) {
        var f = String(l.flavor || "").replace(/^UNMAPPED:\s*/i, "");
        if (f) flavors[f] = (flavors[f] || 0) + (Number(l.bags) || Number(l.cases) || 0);
      });
      var flav = Object.keys(flavors).sort(function (x, y) { return flavors[y] - flavors[x]; }).slice(0, 3).join(", ");
      return {
        day: slcDay(o.created_at), customer: o.customer || "", po: o.customer_po || o.order_id || "",
        status: o.status || "Open", ship: o.ship_date || o.invoice_date || "", flavors: flav
      };
    }).filter(function (r) { return r.day; });
    var groups = {};
    arr(function () { return DB.demandLines ? DB.demandLines() : []; }).forEach(function (l) {
      var k = poKey(l.po);
      if (!k || known[k]) return;
      var g = groups[k] || (groups[k] = { day: "", at: l.created_at || "", customer: l.partner || "", po: l.po || "", status: l.status || "Open", ship: l.due_date || "", flavors: {} });
      if ((l.created_at || "") < (g.at || "\uffff")) g.at = l.created_at || g.at;
      var f = String(l.flavor || "").replace(/^UNMAPPED:\s*/i, "");
      if (f) g.flavors[f] = (g.flavors[f] || 0) + (Number(l.bags) || Number(l.cases) || 0);
      if (l.due_date) g.ship = l.due_date;
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      var flav = Object.keys(g.flavors).sort(function (a, b) { return g.flavors[b] - g.flavors[a]; }).slice(0, 3).join(", ");
      rows.push({ day: slcDay(g.at), customer: g.customer, po: g.po, status: g.status || "Open", ship: g.ship || "", flavors: flav });
    });
    return rows;
  }
  function pullTable(rows) {
    return dfTable(
      [{ h: "Customer" }, { h: "PO" }, { h: "Status" }, { h: "Flavors" }],
      rows.map(function (r) {
        var low = String(r.status || "Open").toLowerCase();
        var cls = low === "open" ? "df-open" : (low === "shipped" ? "df-ship" : "df-done");
        return [
          '<div class="df-name">' + esc(r.customer || "-") + "</div>",
          "<b>" + esc(r.po || "-") + "</b>",
          pill(r.status || "Open", cls),
          esc(r.flavors || "-")
        ];
      })
    );
  }
  function openDemand() {
    return arr(function () { return DB.demandLines ? DB.demandLines() : []; }).filter(function (r) {
      return (r.status || "Open") === "Open";
    }).slice().sort(function (a, b) {
      return (dueISO(a.due_date) || "9999").localeCompare(dueISO(b.due_date) || "9999") || String(a.partner || "").localeCompare(String(b.partner || ""));
    });
  }
  function ecomShort() {
    var q = {};
    arr(function () { return DB.ecomDemand ? DB.ecomDemand() : []; }).forEach(function (r) {
      if (!r || !r.flavor) return;
      q[r.flavor] = (q[r.flavor] || 0) + (Number(r.bags) || 0);
    });
    var oh = {};
    arr(function () { return DB.items(); }).forEach(function (i) {
      if (i.category !== "bag4" && i.category !== "bag15") return;
      var fl = i.flavor || "";
      if (!fl) return;
      var n = 0;
      try { n = Number(DB.availableOnHand ? DB.availableOnHand(i.id) : DB.onHand(i.id)) || 0; } catch (e) { n = 0; }
      oh[fl] = (oh[fl] || 0) + n;
    });
    return Object.keys(q).map(function (fl) {
      return { flavor: fl, demand: q[fl], oh: oh[fl] || 0, short: Math.max(0, q[fl] - (oh[fl] || 0)) };
    }).filter(function (x) { return x.demand > 0; }).sort(function (a, b) { return b.short - a.short || b.demand - a.demand; });
  }
  function outputToday() {
    var day = screenDay();
    return arr(function () { return DB.productionOutput ? DB.productionOutput() : []; }).filter(function (r) {
      return String(r.prod_date || "").slice(0, 10) === day;
    });
  }
  function machines() {
    return arr(function () { return DB.lineStatus ? DB.lineStatus() : []; }).slice().sort(function (a, b) {
      var area = String(a.area || "").localeCompare(String(b.area || ""));
      return area || ((Number(a.sort) || 0) - (Number(b.sort) || 0));
    });
  }
  function openProdOrders() {
    var custom = arr(function () { return DB.prodOrdersCustom ? DB.prodOrdersCustom() : []; });
    var seeded = (window.PROD_ORDERS || []).slice();
    var stages = { Open: 1, Mixing: 1, Labels: 1, Packaged: 1, "P-Mac": 1, Done: 1 };
    var all = custom.concat(seeded);
    all.forEach(function (o) {
      var st = "Open";
      try { st = (DB.kvGet && DB.kvGet("po:" + o.po)) || "Open"; } catch (e) { st = "Open"; }
      o._stage = stages[st] ? st : "Open";
    });
    return all.filter(function (o) { return o._stage !== "Done"; }).sort(function (a, b) {
      return String(a.deadline || a.date || "9999").localeCompare(String(b.deadline || b.date || "9999"));
    });
  }
  function allenReorder() {
    if (!window.ALLEN_REORDER || !window.ALLEN_CALC || !window.DB) return [];
    var rows = [];
    (ALLEN_REORDER.tiers || []).forEach(function (tier) {
      (tier.flavors || []).forEach(function (f) {
        var p4 = 0, p15 = 0, bins = 0;
        try {
          p4 = (Number(DB.availableOnHand ? DB.availableOnHand("BAG4-" + f.code) : DB.onHand("BAG4-" + f.code)) || 0) / 2500;
          p15 = (Number(DB.availableOnHand ? DB.availableOnHand("BAG15-" + f.code) : DB.onHand("BAG15-" + f.code)) || 0) / 6250;
          var ov4 = DB.kvGet ? DB.kvGet("arp4oz:" + f.code) : null;
          var ov15 = DB.kvGet ? DB.kvGet("arp15oz:" + f.code) : null;
          var bm = DB.kvGet ? DB.kvGet("arbm:" + f.code) : null;
          if (ov4 != null && String(ov4).trim() !== "") p4 = Number(ov4) || 0;
          if (ov15 != null && String(ov15).trim() !== "") p15 = Number(ov15) || 0;
          if (bm != null && String(bm).trim() !== "") bins = Number(bm) || 0;
        } catch (e) {}
        var r = ALLEN_CALC(f, p4, p15, bins);
        if (r && r.triggered) rows.push(r);
      });
    });
    rows.sort(function (a, b) { return (b.binsToOrder || 0) - (a.binsToOrder || 0); });
    return rows;
  }
  function traceLabels() {
    try {
      var st = window.TRACE && TRACE._state ? TRACE._state() : null;
      if (!st || !st.labels) return [];
      return Object.keys(st.labels).map(function (k) { return st.labels[k]; });
    } catch (e) { return []; }
  }
  function heldLabels() {
    return traceLabels().filter(function (l) {
      if (!l) return false;
      var s = String(l.status || "").toUpperCase();
      if (s === "EMPTY" || s === "SHIPPED") return false;
      var loc = String(l.location || "").toUpperCase();
      return s === "HOLD" || s === "REJECTED" || s === "QUARANTINE" || s === "QA-HOLD" || loc === "QUARANTINE" || loc === "QA-HOLD";
    });
  }
  function ensureTrace() {
    if (traceState === "loading" || traceState === "ready" || traceState === "err") return;
    if (!window.TRACE || typeof TRACE._load !== "function") { traceState = "err"; return; }
    if (traceLabels().length) { traceState = "ready"; return; }
    traceState = "loading";
    TRACE._load().then(function () {
      traceState = "ready";
      if (homeId === "qa") paintHome(true);
    }).catch(function () {
      traceState = "err";
      if (homeId === "qa") paintHome(true);
    });
  }
  function qFails(logs) {
    return logs.filter(function (l) {
      if (l.fe === "Fail" || l.nfe === "Fail" || l.ss === "Fail") return true;
      return String(l.checked || "").toLowerCase() === "no";
    });
  }
  function seasLots() {
    var today = screenDay();
    var lots = arr(function () { return DB.seasLots ? DB.seasLots() : []; }).slice().sort(function (a, b) {
      return String(a.exp || "9999").localeCompare(String(b.exp || "9999"));
    });
    var quar = 0, exp = 0, lbs = 0;
    lots.forEach(function (l) {
      lbs += Number(l.weight) || 0;
      if (l.status === "Quarantine") quar++;
      var e = String(l.exp || "").slice(0, 10);
      if (e && e < today && l.status !== "Quarantine") exp++;
    });
    return { lots: lots, quar: quar, exp: exp, lbs: lbs };
  }
  function seedLots() {
    var lots = arr(function () { return DB.seedLots ? DB.seedLots() : []; }).slice().sort(function (a, b) {
      return String(b.received_date || b.received_at || b.created_at || "").localeCompare(String(a.received_date || a.received_at || a.created_at || ""));
    });
    var quar = 0, lbs = 0;
    lots.forEach(function (l) {
      lbs += Number(l.weight) || 0;
      if (l.status === "Quarantine") quar++;
    });
    return { lots: lots, quar: quar, lbs: lbs };
  }

  function liveRecv() {
    var pos = openSupplierPos();
    var receipts = recentReceipts();
    var day = screenDay();
    var todayN = receipts.filter(function (r) { return String(r.recv_date || "").slice(0, 10) === day; }).length;
    var hold = quarantineRows();
    var rets = recentReturns();
    var outstanding = pos.reduce(function (s, r) { return s + r.outstanding; }, 0);
    var holdQty = hold.reduce(function (s, r) { return s + r.qty; }, 0);
    return statRow([
      stat(fmt(pos.length), tx({ en: "Open inbound POs", es: "OC abiertas", pt: "OCs abertas" }), pos.length ? "warn" : ""),
      stat(fmt(outstanding), tx({ en: "Qty still open", es: "Cantidad abierta", pt: "Qtd ainda aberta" })),
      stat(fmt(todayN), tx({ en: "Receipts dated today", es: "Recibos de hoy", pt: "Recebimentos de hoje" })),
      stat(fmt(hold.length), tx({ en: "Quarantine lines", es: "Lineas en cuarentena", pt: "Linhas em quarentena" }), hold.length ? "bad" : "")
    ]) +
      panel(tx({ en: "Open inbound", es: "Entrada abierta", pt: "Entrada aberta" }),
        pos.length ? sub(pos.length + " open " + (pos.length === 1 ? "PO" : "POs") + ". Received and closed stay off this list.") + poTable(pos)
          : empty(tx({ en: "No open inbound POs.", es: "No hay ordenes de compra abiertas.", pt: "Nao ha ordens de compra abertas." })),
        2, "expreceipts") +
      panel(tx({ en: "Recent receipts", es: "Recibos recientes", pt: "Recebimentos recentes" }),
        receipts.length ? dfTable(
          [{ h: "Date" }, { h: "Supplier" }, { h: "PO" }, { h: "Qty", right: true }],
          receipts.map(function (r) {
            var cond = r.condition && r.condition !== "Good" ? pill(r.condition, r.condition === "Damaged" || r.condition === "Hold" ? "df-out" : "df-low") : "";
            return [
              esc(String(r.recv_date || "").slice(0, 10) || "-"),
              '<div class="df-name">' + esc(r.supplier || "-") + "</div>" + (r.contents ? '<div class="df-meta">' + esc(r.contents) + "</div>" : ""),
              esc(r.po_num || "-") + (cond ? "<div>" + cond + "</div>" : ""),
              r.qty_received != null && r.qty_received !== "" ? fmt(r.qty_received) : "-"
            ];
          })
        ) : empty(tx({ en: "No receiving log rows yet.", es: "Aun no hay recibos.", pt: "Ainda nao ha recebimentos." })),
        2, "recvlog") +
      panel(tx({ en: "Quarantine", es: "Cuarentena", pt: "Quarentena" }),
        hold.length ? sub(fmt(holdQty) + " on hold in RETURNS-HOLD, QA-HOLD, or QUARANTINE. Not available to ship.") + dfTable(
          [{ h: "Item" }, { h: "Zone" }, { h: "Qty", right: true }],
          hold.map(function (r) {
            return ['<div class="df-name">' + esc(r.name) + '</div><div class="df-meta">' + esc(r.code) + "</div>", esc(r.zone), "<b>" + fmt(r.qty) + "</b> " + esc(r.unit)];
          })
        ) : empty(tx({ en: "Nothing is sitting in quarantine.", es: "Nada esta en cuarentena.", pt: "Nada esta em quarentena." })),
        2, "quarantine") +
      panel(tx({ en: "Recent returns", es: "Devoluciones recientes", pt: "Devolucoes recentes" }),
        rets.length ? dfTable(
          [{ h: "Date" }, { h: "Who" }, { h: "Product" }, { h: "Qty", right: true }],
          rets.map(function (r) {
            var who = r.channel === "ecom" ? (r.marketplace || "E-com") : (r.customer || "-");
            return [
              esc(String(r.return_date || r.created_at || "").slice(0, 10) || "-"),
              esc(who),
              esc(r.product || r.item_code || "-") + (r.disposition ? '<div class="df-meta">' + esc(r.disposition) + "</div>" : ""),
              fmt(r.qty)
            ];
          })
        ) : empty(tx({ en: "No returns logged.", es: "No hay devoluciones.", pt: "Nao ha devolucoes." })),
        2, "returns");
  }

  function liveInv() {
    var split = stockSplit();
    var fg = fgOnHand();
    var sd = shortDated().filter(function (r) { return r.flag !== "DISCONTINUED" || r.disp === "Open"; });
    var action = sd.filter(function (r) { return r.disp === "Open" && r.flag !== "OK"; });
    var cols = [{ h: "Item" }, { h: "On hand", right: true }, { h: "Reorder", right: true }, { h: "" }];
    var openR = recentReturns().filter(function (r) {
      if (window.RETURNS_WF && RETURNS_WF.isOpenRow) return RETURNS_WF.isOpenRow(r);
      return String(r.status || "") === "held" || Number(r.qty_hold) > 0;
    });
    return statRow([
      stat(fmt(split.out.length), tx({ en: "Out of stock", es: "Agotado", pt: "Esgotado" }), split.out.length ? "bad" : ""),
      stat(fmt(split.low.length), tx({ en: "Low stock", es: "Stock bajo", pt: "Estoque baixo" }), split.low.length ? "warn" : ""),
      stat(fmt(fg.bag4), tx({ en: "4oz available", es: "4oz disponible", pt: "4oz disponivel" })),
      stat(fmt(fg.bag15), tx({ en: "1.5oz available", es: "1.5oz disponible", pt: "1.5oz disponivel" }))
    ]) +
      panel(tx({ en: "Open returns", es: "Devoluciones abiertas", pt: "Devolucoes abertas" }),
        openR.length ? sub(openR.length + " held for Adriana. Release, scrap, or other from Returns.") + dfTable(
          [{ h: "Date" }, { h: "Item" }, { h: "Held", right: true }],
          openR.slice(0, 8).map(function (r) {
            return [
              esc(String(r.return_date || r.created_at || "").slice(0, 10) || "-"),
              esc(r.product || r.item_code || "-"),
              fmt(r.qty_hold || r.qty)
            ];
          })
        ) : empty(tx({ en: "No returns are sitting on hold.", es: "No hay devoluciones retenidas.", pt: "Nao ha devolucoes retidas." })),
        2, "returns") +
      panel(tx({ en: "Out of stock", es: "Agotado", pt: "Esgotado" }),
        split.out.length ? sub("Reorder point set and on-hand at zero.") + dfTable(cols, stockRows(split.out, "out"))
          : empty(tx({ en: "Nothing is out of stock.", es: "Nada esta agotado.", pt: "Nada esta esgotado." })),
        2, "alerts") +
      panel(tx({ en: "Low stock", es: "Stock bajo", pt: "Estoque baixo" }),
        split.low.length ? sub("Above zero and under the reorder point.") + dfTable(cols, stockRows(split.low, "low"))
          : empty(tx({ en: "Nothing is under its reorder point.", es: "Nada esta bajo su punto de reorden.", pt: "Nada esta abaixo do ponto de reposicao." })),
        2, "dash") +
      panel(tx({ en: "Finished goods on hand", es: "Producto terminado", pt: "Produto acabado" }),
        fg.rows.length ? dfTable(
          [{ h: "Item" }, { h: "Size" }, { h: "On hand", right: true }],
          fg.rows.map(function (r) {
            return ['<div class="df-name">' + esc(r.name) + '</div><div class="df-meta">' + esc(r.code) + "</div>", r.cat === "bag4" ? "4oz" : "1.5oz", "<b>" + fmt(r.oh) + "</b> " + esc(r.unit) + (r.held > 0 ? '<div class="df-meta">' + fmt(r.held) + " held</div>" : "")];
          })
        ) : empty(tx({ en: "No finished bags on hand.", es: "No hay bolsas terminadas.", pt: "Nao ha sacos prontos." })),
        2, "finbags") +
      panel(tx({ en: "Short-dated", es: "Short-dated", pt: "Short-dated" }),
        action.length ? sub(action.length + " flagged with disposition still Open. Short-dated is within 120 days.") + dfTable(
          [{ h: "Item" }, { h: "Bags", right: true }, { h: "Flag" }, { h: "Disposition" }],
          action.map(function (r) {
            var cls = r.flag === "SHORT-DATED" ? "df-low" : "df-out";
            var left = r.days == null ? "" : (r.days < 0 ? Math.abs(r.days) + "d ago" : r.days + "d left");
            return [
              '<div class="df-name">' + esc(r.flavor) + '</div><div class="df-meta">' + esc(r.size || "") + (left ? " · " + left : "") + "</div>",
              fmt(r.bags),
              pill(r.flag, cls),
              esc(r.disp)
            ];
          })
        ) : empty(tx({ en: "No open short-dated, expired, or off-flavor rows.", es: "Nada short-dated abierto.", pt: "Nada short-dated aberto." })),
        2, "shortdated") + seedCatalogLive();
  }

  function seasoningLive() {
    var seas = seasLots();
    var recipes = window.RECIPES ? Object.keys(window.RECIPES).length : 0;
    var today = screenDay();
    var note = seas.lots.length + " lots · " + fmt(seas.lbs) + " lb";
    if (seas.exp) note += " · " + seas.exp + " expired";
    if (seas.quar) note += " · " + seas.quar + " in quarantine";
    note += ". " + recipes + " batch recipes on file.";
    return panel(tx({ en: "Seasoning lots", es: "Lotes de sazon", pt: "Lotes de tempero" }),
      sub(note) + (seas.lots.length ? dfTable(
        [{ h: "Product" }, { h: "Lot" }, { h: "Exp" }, { h: "Lb", right: true }],
        seas.lots.map(function (l) {
          var exp = String(l.exp || "").slice(0, 10);
          var bad = l.status === "Quarantine" || (exp && exp < today);
          return [
            '<div class="df-name">' + esc(l.product || l.flavor_code || "-") + "</div>",
            esc(l.lot || "-"),
            esc(exp || "-") + (bad ? " " + pill(l.status === "Quarantine" ? "QUAR" : "EXP", "df-out") : ""),
            fmt(l.weight)
          ];
        })
      ) : empty(tx({ en: "No seasoning lots yet.", es: "Aun no hay lotes de sazon.", pt: "Ainda nao ha lotes de tempero." }))),
      2, "seasoning") +
      panel(tx({ en: "Recipes", es: "Recetas", pt: "Receitas" }),
        sub(recipes + " batch recipes for mixing."),
        2, "recipes");
  }

  function seedCatalogLive() {
    var seed = seedLots();
    var skuN = (window.SMACKIN_SKUS || []).length;
    var catN = 0;
    try { catN = DB.skuCatalog ? Object.keys(DB.skuCatalog() || {}).length : 0; } catch (e) { catN = 0; }
    return panel(tx({ en: "Seed lots", es: "Lotes de semilla", pt: "Lotes de semente" }),
      seed.lots.length ? sub(fmt(seed.lbs) + " lb logged." + (seed.quar ? " " + seed.quar + " in quarantine." : "")) + dfTable(
        [{ h: "Product" }, { h: "Lot" }, { h: "Received" }, { h: "Lb", right: true }],
        seed.lots.map(function (l) {
          return [
            '<div class="df-name">' + esc(l.product || l.seed_code || "-") + "</div>" +
              (l.status === "Quarantine" ? pill("QUAR", "df-out") : ""),
            esc(l.lot || "-"),
            esc(String(l.received_date || l.received_at || "").slice(0, 10) || "-"),
            fmt(l.weight)
          ];
        })
      ) : empty(tx({ en: "No seed lots yet.", es: "Aun no hay lotes de semilla.", pt: "Ainda nao ha lotes de semente." })),
      2, "seed") +
      panel(tx({ en: "SKU catalog", es: "Catalogo SKU", pt: "Catalogo SKU" }),
        sub(skuN + " finished SKUs in the pack list. " + catN + " extra SKUs saved on the catalog."),
        2, "skus");
  }

  function livePurch() {
    var pos = openSupplierPos();
    var buys = buyRows();
    var outstanding = pos.reduce(function (s, r) { return s + r.outstanding; }, 0);
    var covered = buys.filter(function (r) { return r.onOrder >= r.gap && r.gap > 0; }).length;
    return statRow([
      stat(fmt(pos.length), tx({ en: "Open supplier POs", es: "OC de proveedor abiertas", pt: "OCs de fornecedor abertas" }), pos.length ? "warn" : ""),
      stat(fmt(outstanding), tx({ en: "Outstanding qty", es: "Cantidad pendiente", pt: "Qtd pendente" })),
      stat(fmt(buys.length), tx({ en: "Under reorder point", es: "Bajo reorden", pt: "Abaixo da reposicao" }), buys.length ? "bad" : ""),
      stat(fmt(covered), tx({ en: "Shortfall already on a PO", es: "Falta ya en una OC", pt: "Falta ja em uma OC" }))
    ]) +
      panel(tx({ en: "Open supplier POs", es: "OC abiertas", pt: "OCs abertas" }),
        pos.length ? poTable(pos) : empty(tx({ en: "No open supplier POs.", es: "No hay OC abiertas.", pt: "Nao ha OCs abertas." })),
        2, "purchasing") +
      panel(tx({ en: "Buy pressure", es: "Presion de compra", pt: "Pressao de compra" }),
        buys.length ? sub("On hand under the reorder point. On order is open PO qty for that item.") + dfTable(
          [{ h: "Item" }, { h: "On hand", right: true }, { h: "Short", right: true }, { h: "On order", right: true }],
          buys.map(function (r) {
            return [
              '<div class="df-name">' + esc(r.it.name || "") + '</div><div class="df-meta">' + esc(r.it.code || "") + "</div>",
              fmt(r.oh) + " " + esc(r.it.unit || ""),
              "<b>" + fmt(r.gap) + "</b>",
              r.onOrder ? fmt(r.onOrder) : "-"
            ];
          })
        ) : empty(tx({ en: "Nothing is under its reorder point.", es: "Nada esta bajo reorden.", pt: "Nada esta abaixo da reposicao." })),
        2, "reorder15");
  }

  function liveDemand() {
    var open = openDemand();
    var pos = {};
    var cases = 0, bags = 0, unmapped = 0;
    open.forEach(function (r) {
      pos[String(r.source || "") + "|" + String(r.po || "")] = 1;
      cases += Number(r.cases) || 0;
      bags += Number(r.bags) || 0;
      if (/^UNMAPPED/i.test(String(r.flavor || ""))) unmapped++;
    });
    var poN = Object.keys(pos).length;
    var ecom = ecomShort();
    var shortN = ecom.filter(function (x) { return x.short > 0; }).length;
    var logged = outputToday();
    var byDept = {};
    logged.forEach(function (r) {
      var k = r.dept || "other";
      var e = byDept[k] || (byDept[k] = { bags: 0, cases: 0 });
      e.bags += Number(r.bags) || 0;
      e.cases += Number(r.cases) || 0;
    });
    var deptKeys = Object.keys(byDept);
    return statRow([
      stat(fmt(poN), tx({ en: "Open demand POs", es: "OC de demanda abiertas", pt: "OCs de demanda abertas" })),
      stat(fmt(cases), tx({ en: "Open cases", es: "Cajas abiertas", pt: "Caixas abertas" })),
      stat(fmt(bags), tx({ en: "Open bags", es: "Bolsas abiertas", pt: "Sacos abertos" })),
      stat(fmt(shortN), tx({ en: "E-com flavors short", es: "Sabores e-com cortos", pt: "Sabores e-com em falta" }), shortN ? "warn" : "")
    ]) +
      panel(tx({ en: "Open demand", es: "Demanda abierta", pt: "Demanda aberta" }),
        open.length ? sub((unmapped ? unmapped + " unmapped lines. " : "") + "Sorted by due date.") + dfTable(
          [{ h: "Partner" }, { h: "PO" }, { h: "Flavor" }, { h: "Cases", right: true }, { h: "Due" }],
          open.map(function (r) {
            var due = dueISO(r.due_date) || String(r.due_date || "");
            var late = due && due < slcToday();
            return [
              esc(r.partner || "-"),
              "<b>" + esc(r.po || "-") + "</b>",
              esc(String(r.flavor || "").replace(/^UNMAPPED:\s*/i, "Unmapped: ")),
              fmt(r.cases),
              esc(due || "-") + (late ? " " + pill("DUE", "df-out") : "")
            ];
          })
        ) : empty(tx({ en: "No open demand lines.", es: "No hay lineas de demanda abiertas.", pt: "Nao ha linhas de demanda abertas." })),
        2, "demandboard") +
      panel(tx({ en: "E-com queue vs bags on hand", es: "Cola e-com vs bolsas", pt: "Fila e-com vs sacos" }),
        ecom.length ? dfTable(
          [{ h: "Flavor" }, { h: "On hand", right: true }, { h: "Queue", right: true }, { h: "Short", right: true }],
          ecom.map(function (x) {
            return [esc(x.flavor), fmt(x.oh), fmt(x.demand), x.short > 0 ? "<b>" + fmt(x.short) + "</b>" : "-"];
          })
        ) : empty(tx({ en: "No e-com demand snapshot loaded.", es: "No hay demanda e-com cargada.", pt: "Nao ha demanda e-com carregada." })),
        2, "ecomdemand") +
      panel(tx({ en: "Logged today", es: "Registrado hoy", pt: "Registrado hoje" }) + " · " + esc(screenDay()),
        deptKeys.length ? dfTable(
          [{ h: "Department" }, { h: "Bags", right: true }, { h: "Cases", right: true }],
          deptKeys.map(function (k) {
            return [esc(k), fmt(byDept[k].bags), fmt(byDept[k].cases)];
          })
        ) : empty(tx({ en: "Nothing logged on the production entry for this date.", es: "Nada registrado en produccion para esta fecha.", pt: "Nada registrado na producao para esta data." })),
        4, "demand");
  }

  function machineStatus(m) {
    return m.status || "idle";
  }
  function statusLabel(st) {
    if (st === "running") return tx({ en: "Running", es: "En marcha", pt: "Em andamento" });
    if (st === "changeover") return tx({ en: "In process", es: "En proceso", pt: "Em processo" });
    return tx({ en: "Idle", es: "Inactiva", pt: "Parada" });
  }
  // Same Now Running floor the Manufacturing home used to show (line_status / floor).
  function liveRunning() {
    var rank = { running: 0, changeover: 1, idle: 2 };
    var mach = machines().slice().sort(function (a, b) {
      var d = (rank[machineStatus(a)] == null ? 9 : rank[machineStatus(a)]) - (rank[machineStatus(b)] == null ? 9 : rank[machineStatus(b)]);
      if (d) return d;
      var area = String(a.area || "").localeCompare(String(b.area || ""));
      return area || ((Number(a.sort) || 0) - (Number(b.sort) || 0));
    });
    var running = mach.filter(function (m) { return machineStatus(m) === "running"; });
    var change = mach.filter(function (m) { return machineStatus(m) === "changeover"; });
    var idle = mach.filter(function (m) { return machineStatus(m) === "idle"; });
    return statRow([
      stat(running.length + " / " + mach.length, tx({ en: "Now running", es: "En marcha", pt: "Em andamento" }), running.length ? "" : "warn"),
      stat(fmt(change.length), tx({ en: "In process", es: "En proceso", pt: "Em processo" }), change.length ? "warn" : ""),
      stat(fmt(idle.length), tx({ en: "Idle", es: "Inactivas", pt: "Paradas" })),
      stat(fmt(mach.length), tx({ en: "Machines", es: "Maquinas", pt: "Maquinas" }))
    ]) +
      panel(tx({ en: "Now Running / In Process", es: "En marcha / En proceso", pt: "Em andamento / Em processo" }),
        sub(tx({
          en: "Floor board. In process is a changeover. Running is listed first.",
          es: "Tablero de piso. En proceso es un cambio. En marcha va primero.",
          pt: "Painel do piso. Em processo e uma troca. Em andamento vem primeiro."
        })) +
        (mach.length ? dfTable(
          [{ h: "Machine" }, { h: "Flavor" }, { h: "Status" }, { h: "Done", right: true }],
          mach.map(function (m) {
            var st = machineStatus(m);
            var cls = st === "running" ? "df-ship" : (st === "changeover" ? "df-low" : "df-done");
            var goal = Number(m.goal) || 0;
            return [
              '<div class="df-name">' + esc(m.machine || "-") + '</div><div class="df-meta">' + esc(m.area || "") + "</div>",
              esc(m.flavor || "-") + (m.size ? " " + esc(m.size) : ""),
              pill(statusLabel(st), cls),
              fmt(m.done || 0) + (goal ? " / " + fmt(goal) : "")
            ];
          })
        ) : empty(tx({ en: "No machines on the live board.", es: "No hay maquinas en el tablero.", pt: "Nao ha maquinas no painel." }))),
        4, "floor");
  }
  function loggedFor(dept) {
    return outputToday().filter(function (r) { return r.dept === dept; });
  }
  function usedFor(deptName) {
    var want = String(deptName || "").toLowerCase();
    return arr(function () { return DB.consumption ? DB.consumption() : []; }).filter(function (r) {
      return slcDay(r.created_at) === slcToday() && String(r.department || "").toLowerCase() === want;
    });
  }
  function prodOrderPanel(orders, emptyMsg) {
    return panel(tx({ en: "Open production orders", es: "Ordenes de produccion abiertas", pt: "Ordens de producao abertas" }),
      orders.length ? dfTable(
        [{ h: "Flavor" }, { h: "PO" }, { h: "Stage" }, { h: "Due" }],
        orders.map(function (o) {
          var bins = o.bins || o.bins4 || o.bins15;
          return [
            '<div class="df-name">' + esc(o.flavor || "-") + "</div>" + (o.size ? '<div class="df-meta">' + esc(o.size) + "</div>" : ""),
            esc(o.po || "-") + (bins ? '<div class="df-meta">' + esc(String(bins)) + " bins</div>" : ""),
            pill(o._stage, o._stage === "Open" ? "df-open" : "df-ship"),
            esc(o.deadline || o.date || "-")
          ];
        })
      ) : empty(emptyMsg),
      2, "prodorders");
  }
  function loggedPanel(rows, toolId, none) {
    return panel(tx({ en: "Logged today", es: "Registrado hoy", pt: "Registrado hoje" }) + " · " + esc(screenDay()),
      rows.length ? dfTable(
        [{ h: "Shift" }, { h: "Flavor" }, { h: "Bags", right: true }, { h: "Cases", right: true }],
        rows.map(function (r) {
          return [r.shift ? "S" + esc(r.shift) : "-", esc(r.flavor || "-"), fmt(r.bags), fmt(r.cases)];
        })
      ) : empty(none),
      2, toolId);
  }
  function usedPanel(rows, toolId) {
    return panel(tx({ en: "Scanned into the room today", es: "Escaneado hoy", pt: "Lido hoje" }),
      rows.length ? sub(tx({ en: "Consumption scans saved today (SLC).", es: "Escaneos de uso guardados hoy (SLC).", pt: "Leituras de uso salvas hoje (SLC)." })) + dfTable(
        [{ h: "Item" }, { h: "Qty", right: true }],
        rows.map(function (r) {
          return [esc(r.item_name || r.item_code || "-"), fmt(r.qty)];
        })
      ) : empty(tx({ en: "No consumption scans saved today.", es: "No hay escaneos de uso hoy.", pt: "Nao ha leituras de uso hoje." })),
      2, toolId);
  }
  function liveMix() {
    var orders = openProdOrders();
    var allen = allenReorder();
    var logged = loggedFor("mixing");
    var used = usedFor("Mixing");
    var bags = logged.reduce(function (s, r) { return s + (Number(r.bags) || 0); }, 0);
    return statRow([
      stat(fmt(orders.length), tx({ en: "Open prod orders", es: "Ordenes de produccion abiertas", pt: "Ordens de producao abertas" })),
      stat(fmt(bags), tx({ en: "Bags logged today", es: "Bolsas hoy", pt: "Sacos hoje" })),
      stat(fmt(used.length), tx({ en: "Scans today", es: "Escaneos hoy", pt: "Leituras hoje" })),
      stat(fmt(allen.length), tx({ en: "Allen reorder hits", es: "Reorden Allen", pt: "Reposicao Allen" }), allen.length ? "bad" : "")
    ]) +
      prodOrderPanel(orders, tx({ en: "No open production orders.", es: "No hay ordenes de produccion abiertas.", pt: "Nao ha ordens de producao abertas." })) +
      loggedPanel(logged, "mixing", tx({ en: "No mixing output logged for this date.", es: "Nada de mezcla en esta fecha.", pt: "Nada de mistura nesta data." })) +
      usedPanel(used, "mixing") +
      (allen.length ? panel(tx({ en: "Allen reorder", es: "Reorden Allen", pt: "Reposicao Allen" }),
        sub(tx({
          en: "Finished-goods pallets on hand are at or under Allen's trigger. Bins to order already subtract bins mixed.",
          es: "Las tarimas de producto terminado estan en el punto de Allen o debajo. Los bins a pedir ya restan lo mezclado.",
          pt: "Os paletes de produto acabado estao no gatilho do Allen ou abaixo. Os bins a pedir ja descontam o misturado."
        })) +
        dfTable(
          [{ h: "Flavor" }, { h: "4oz pal", right: true }, { h: "1.5oz pal", right: true }, { h: "Bins to order", right: true }],
          allen.map(function (r) {
            return [esc(r.name || r.code || "-"), fmt(r.pallets4), fmt(r.pallets15), "<b>" + fmt(r.binsToOrder) + "</b>"];
          })
        ), 4, "reordertracker") : "") + seasoningLive();
  }
  function livePmac() {
    var orders = openProdOrders().filter(function (o) {
      return o._stage === "P-Mac" || o._stage === "Packaged" || o._stage === "Labels";
    });
    var logged = loggedFor("pmac");
    var used = usedFor("P-Mac");
    var bags = logged.reduce(function (s, r) { return s + (Number(r.bags) || 0); }, 0);
    return statRow([
      stat(fmt(orders.length), tx({ en: "Open prod orders", es: "Ordenes de produccion abiertas", pt: "Ordens de producao abertas" })),
      stat(fmt(bags), tx({ en: "Bags logged today", es: "Bolsas hoy", pt: "Sacos hoje" })),
      stat(fmt(used.length), tx({ en: "Scans today", es: "Escaneos hoy", pt: "Leituras hoje" })),
      stat(fmt(logged.length), tx({ en: "Rows logged today", es: "Filas hoy", pt: "Linhas hoje" }))
    ]) +
      prodOrderPanel(orders, tx({ en: "No open production orders for P-Mac.", es: "No hay ordenes de produccion abiertas para P-Mac.", pt: "Nao ha ordens de producao abertas para P-Mac." })) +
      loggedPanel(logged, "pmac", tx({ en: "No P-Mac output logged for this date.", es: "Nada de P-Mac en esta fecha.", pt: "Nada de P-Mac nesta data." })) +
      usedPanel(used, "pmac");
  }

  function liveFul() {
    var pulled = pulledRows();
    var today = slcToday();
    var yday = shiftDay(today, -1);
    var tRows = pulled.filter(function (r) { return r.day === today; });
    var yRows = pulled.filter(function (r) { return r.day === yday; });
    var open = openToShip();
    var day = screenDay();
    var pallets = [];
    try { pallets = (DB.prodPallets ? DB.prodPallets(day) : []).filter(function (p) { return (p.channel || "retail") === "retail"; }); } catch (e) { pallets = []; }
    var cases = pallets.reduce(function (s, p) { return s + (Number(p.cases) || 0); }, 0);
    var fd = arr(function () { return DB.fulfillmentDaily ? DB.fulfillmentDaily() : []; }).filter(function (r) {
      return String(r.fdate || "").slice(0, 10) === day;
    })[0];
    var ecomN = fd ? Number(fd.ecom_total) || 0 : 0;
    var amz = fd ? Number(fd.amazon_bags) || 0 : 0;
    return statRow([
      stat(fmt(tRows.length), tx({ en: "Pulled today", es: "Entradas hoy", pt: "Entraram hoje" })),
      stat(fmt(yRows.length), tx({ en: "Pulled yesterday", es: "Entradas ayer", pt: "Entraram ontem" })),
      stat(fmt(open.length), tx({ en: "Open to ship", es: "Abiertas por enviar", pt: "Abertas para enviar" }), open.length ? "warn" : ""),
      stat(fmt(cases), tx({ en: "Retail cases logged", es: "Cajas retail", pt: "Caixas varejo" }) + " · " + day)
    ]) +
      panel(tx({ en: "Pulled today", es: "Entradas hoy", pt: "Entraram hoje" }),
        sub("Saved into Smackin OS on " + today + " (SLC).") +
        (tRows.length ? pullTable(tRows) : empty(tx({ en: "No orders pulled today yet.", es: "Ninguna orden entrada hoy.", pt: "Nenhum pedido entrou hoje." }))),
        2, "orders") +
      panel(tx({ en: "Pulled yesterday", es: "Entradas ayer", pt: "Entraram ontem" }),
        yRows.length ? pullTable(yRows) : empty(tx({ en: "No orders pulled yesterday.", es: "Ninguna orden entrada ayer.", pt: "Nenhum pedido entrou ontem." })),
        2, "orders") +
      panel(tx({ en: "Open orders", es: "Ordenes abiertas", pt: "Pedidos abertos" }),
        sub((fd ? "E-com labels " + fmt(ecomN) + " · Amazon " + fmt(amz) + " bags. " : "No daily fulfillment row for " + day + ". ") +
          pallets.length + " retail pallet" + (pallets.length === 1 ? "" : "s") + " logged.") +
        (open.length ? dfTable(
          [{ h: "Customer" }, { h: "PO" }, { h: "Ship / invoice" }],
          open.map(function (o) {
            return [
              '<div class="df-name">' + esc(o.customer || "-") + "</div>",
              "<b>" + esc(o.customer_po || o.order_id || "-") + "</b>",
              esc(o.ship_date || o.invoice_date || "-")
            ];
          })
        ) : empty(tx({ en: "No open orders waiting to ship.", es: "No hay ordenes abiertas por enviar.", pt: "Nao ha pedidos abertos para enviar." }))),
        2, "fulfilldaily") +
      panel(tx({ en: "Retail pallets", es: "Paletas retail", pt: "Paletes varejo" }) + " · " + esc(day),
        pallets.length ? dfTable(
          [{ h: "Line" }, { h: "Flavor" }, { h: "Cases", right: true }],
          pallets.map(function (p) {
            return ["L" + esc(p.line || "-"), esc(p.flavor_code || "-"), fmt(p.cases)];
          })
        ) : empty(tx({ en: "No retail pallets logged for this date.", es: "No hay paletas retail en esta fecha.", pt: "Nao ha paletes de varejo nesta data." })),
        2, "prodlog");
  }

  function liveShip() {
    var open = openToShip();
    var log = arr(function () { return DB.shippingLog(); }).slice().sort(function (a, b) {
      return String(b.ship_date || b.created_at || "").localeCompare(String(a.ship_date || a.created_at || ""));
    });
    var pending = log.filter(function (s) { return s.status === "Pending"; });
    var tracked = arr(function () { return DB.orders(); }).filter(orderShipped).sort(function (a, b) {
      return String(b.ship_date || b.created_at || "").localeCompare(String(a.ship_date || a.created_at || ""));
    });
    return statRow([
      stat(fmt(open.length), tx({ en: "Open to ship", es: "Abiertas por enviar", pt: "Abertas para enviar" }), open.length ? "warn" : ""),
      stat(fmt(pending.length), tx({ en: "Shipping log pending", es: "Envios pendientes", pt: "Envios pendentes" }), pending.length ? "warn" : ""),
      stat(fmt(log.length), tx({ en: "Shipping log rows", es: "Filas del registro", pt: "Linhas do registro" })),
      stat(fmt(tracked.length), tx({ en: "Orders with tracking", es: "Ordenes con rastreo", pt: "Pedidos com rastreio" }))
    ]) +
      panel(tx({ en: "Open to ship", es: "Por enviar", pt: "Para enviar" }),
        open.length ? sub("Orders that are not Complete and do not have a carrier tracking number yet.") + dfTable(
          [{ h: "Customer" }, { h: "PO / order" }, { h: "Ship date" }, { h: "Status" }],
          open.map(function (o) {
            return [
              '<div class="df-name">' + esc(o.customer || "-") + "</div>",
              esc(o.customer_po || o.order_id || "-"),
              esc(o.ship_date || "-"),
              pill(o.status || "Open", "df-open")
            ];
          })
        ) : empty(tx({ en: "Nothing is waiting to ship.", es: "Nada esta por enviar.", pt: "Nada esta para enviar." })),
        2, "orders") +
      panel(tx({ en: "Recent shipments", es: "Envios recientes", pt: "Envios recentes" }),
        (log.length || tracked.length) ? dfTable(
          [{ h: "Date" }, { h: "To" }, { h: "Carrier" }, { h: "Status" }],
          log.map(function (s) {
            var st = s.status || "";
            var cls = st === "Delivered" ? "df-done" : (st === "Pending" ? "df-low" : "df-ship");
            return [esc(String(s.ship_date || "").slice(0, 10) || "-"), esc(s.recipient || "-"), esc(s.carrier || "-"), st ? pill(st, cls) : "-"];
          }).concat(tracked.slice(0, 12).map(function (o) {
            return [
              esc(String(o.ship_date || o.created_at || "").slice(0, 10) || "-"),
              '<div class="df-name">' + esc(o.customer || "-") + '</div><div class="df-meta">Order ' + esc(o.customer_po || o.order_id || "") + "</div>",
              esc(o.carrier || "-"),
              pill("Tracked", "df-ship")
            ];
          }))
        ) : empty(tx({ en: "No shipments in the log or on orders.", es: "No hay envios.", pt: "Nao ha envios." })),
        2, "shiplog");
  }

  function liveQa() {
    ensureTrace();
    var holds = heldLabels();
    var rejected = holds.filter(function (l) { return String(l.status || "").toUpperCase() === "REJECTED"; });
    var quar = quarantineRows();
    var sd = shortDated().filter(function (r) { return r.disp === "Open" && (r.flag === "SHORT-DATED" || r.flag === "EXPIRED" || r.flag === "OFF-FLAVOR"); });
    var logs = arr(function () { return DB.qualityLogs ? DB.qualityLogs() : []; }).slice().sort(function (a, b) {
      return String(b.created_at || b.dt || b.date || "").localeCompare(String(a.created_at || a.dt || a.date || ""));
    });
    var fails = qFails(logs);
    var holdBody;
    if (traceState === "loading") holdBody = empty(tx({ en: "Loading lot holds…", es: "Cargando retenciones…", pt: "Carregando retencoes…" }));
    else if (traceState === "err") holdBody = empty(tx({ en: "Lot holds could not be read.", es: "No se pudieron leer las retenciones.", pt: "Nao foi possivel ler as retencoes." }));
    else if (!holds.length) holdBody = empty(tx({ en: "No lots on hold or rejected.", es: "Ningun lote retenido o rechazado.", pt: "Nenhum lote retido ou rejeitado." }));
    else holdBody = dfTable(
      [{ h: "Lot / label" }, { h: "Item" }, { h: "Status" }, { h: "Where" }],
      holds.map(function (l) {
        var s = String(l.status || "").toUpperCase();
        return [
          "<b>" + esc(l.lot || l.lpn || "-") + "</b>",
          esc(((l.flavor || l.item || "") + " " + (l.size || "")).trim() || "-"),
          pill(s || "HOLD", s === "REJECTED" ? "df-out" : "df-low"),
          esc(l.location || "-")
        ];
      })
    );
    return statRow([
      stat(traceState === "loading" ? "…" : fmt(holds.length - rejected.length), tx({ en: "Lots on hold", es: "Lotes retenidos", pt: "Lotes retidos" }), holds.length ? "bad" : ""),
      stat(traceState === "loading" ? "…" : fmt(rejected.length), tx({ en: "Rejected", es: "Rechazados", pt: "Rejeitados" }), rejected.length ? "bad" : ""),
      stat(fmt(quar.length), tx({ en: "Quarantine lines", es: "Cuarentena", pt: "Quarentena" }), quar.length ? "warn" : ""),
      stat(fmt(fails.length), tx({ en: "CCP fails", es: "Fallos CCP", pt: "Falhas CCP" }), fails.length ? "bad" : "")
    ]) +
      panel(tx({ en: "Holds and rejects", es: "Retenciones y rechazos", pt: "Retencoes e rejeicoes" }), holdBody, 2, "trQa") +
      panel(tx({ en: "Quarantine locations", es: "Ubicaciones de cuarentena", pt: "Locais de quarentena" }),
        quar.length ? dfTable(
          [{ h: "Item" }, { h: "Zone" }, { h: "Qty", right: true }],
          quar.map(function (r) { return [esc(r.name), esc(r.zone), fmt(r.qty)]; })
        ) : empty(tx({ en: "QA-HOLD and QUARANTINE are empty.", es: "Cuarentena vacia.", pt: "Quarentena vazia." })),
        2, "quarantine") +
      panel(tx({ en: "Short-dated still open", es: "Short-dated abierto", pt: "Short-dated aberto" }),
        sd.length ? dfTable(
          [{ h: "Item" }, { h: "Bags", right: true }, { h: "Flag" }],
          sd.map(function (r) {
            return [esc(r.flavor) + '<div class="df-meta">' + esc(r.size || "") + "</div>", fmt(r.bags), pill(r.flag, r.flag === "SHORT-DATED" ? "df-low" : "df-out")];
          })
        ) : empty(tx({ en: "No open short-dated, expired, or off-flavor rows.", es: "Nada short-dated abierto.", pt: "Nada short-dated aberto." })),
        2, "shortdated") +
      panel(tx({ en: "CCP log", es: "Registro CCP", pt: "Registro CCP" }),
        logs.length ? sub(fails.length + " fail" + (fails.length === 1 ? "" : "s") + " in " + logs.length + " entries.") + dfTable(
          [{ h: "When" }, { h: "Type" }, { h: "Flavor" }, { h: "Result" }],
          logs.map(function (l) {
            var fail = qFails([l]).length > 0;
            return [
              esc(String(l.dt || l.date || l.created_at || "").replace("T", " ").slice(0, 16) || "-"),
              esc(l.type || "-"),
              esc(l.flavor || l.equip || "-"),
              fail ? pill("FAIL", "df-out") : pill("OK", "df-ship")
            ];
          })
        ) : empty(tx({ en: "No CCP entries yet.", es: "Aun no hay registros CCP.", pt: "Ainda nao ha registros CCP." })),
        2, "quality");
  }

  function liveTeam() {
    var ideas = arr(function () { return DB.improvements(); }).slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    var openIdeas = ideas.filter(function (i) { return i.status !== "Done"; });
    var inProg = ideas.filter(function (i) { return i.status === "In Progress"; });
    var rd = arr(function () { return DB.rdRequests(); }).slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    var pend = rd.filter(function (r) { return (r.status || "Pending") !== "Received"; });
    var today = screenDay();
    var late = pend.filter(function (r) { var nb = String(r.needed_by || "").slice(0, 10); return nb && nb < today; });
    var log = arr(function () { return DB.log(); }).slice().sort(function (a, b) {
      return String(b.t || "").localeCompare(String(a.t || ""));
    });
    return statRow([
      stat(fmt(openIdeas.length), tx({ en: "Open improvements", es: "Mejoras abiertas", pt: "Melhorias abertas" })),
      stat(fmt(inProg.length), tx({ en: "In progress", es: "En progreso", pt: "Em andamento" })),
      stat(fmt(pend.length), tx({ en: "R&D still out", es: "I+D pendiente", pt: "P&D pendente" }), pend.length ? "warn" : ""),
      stat(fmt(late.length), tx({ en: "R&D overdue", es: "I+D vencido", pt: "P&D atrasado" }), late.length ? "bad" : "")
    ]) +
      panel(tx({ en: "Improvements", es: "Mejoras", pt: "Melhorias" }),
        openIdeas.length ? dfTable(
          [{ h: "Idea" }, { h: "Area" }, { h: "Status" }],
          openIdeas.map(function (i) {
            return [
              '<div class="df-name">' + esc(i.title || "-") + "</div>" + (i.owner ? '<div class="df-meta">' + esc(i.owner) + "</div>" : ""),
              esc(i.area || i.ci_type || "-"),
              pill(i.status || "Idea", i.status === "In Progress" ? "df-ship" : "df-open")
            ];
          })
        ) : empty(tx({ en: "No open improvement items.", es: "No hay mejoras abiertas.", pt: "Nao ha melhorias abertas." })),
        2, "improve") +
      panel(tx({ en: "R&D requests", es: "Solicitudes I+D", pt: "Pedidos P&D" }),
        pend.length ? dfTable(
          [{ h: "Company" }, { h: "Item" }, { h: "Need by" }],
          pend.map(function (r) {
            var nb = String(r.needed_by || "").slice(0, 10);
            return [
              '<div class="df-name">' + esc(r.company || "-") + '</div><div class="df-meta">' + esc(r.req_no || "") + "</div>",
              esc(r.items || "-"),
              esc(nb || "-") + (nb && nb < today ? " " + pill("LATE", "df-out") : "")
            ];
          })
        ) : empty(tx({ en: "No R&D requests still out.", es: "No hay solicitudes I+D pendientes.", pt: "Nao ha pedidos de P&D pendentes." })),
        2, "rd") +
      panel(tx({ en: "Latest activity", es: "Actividad reciente", pt: "Atividade recente" }),
        log.length ? dfTable(
          [{ h: "When" }, { h: "Action" }, { h: "Who" }],
          log.slice(0, 12).map(function (e) {
            var when = "";
            try { when = e.t ? new Date(e.t).toLocaleString() : ""; } catch (err) { when = String(e.t || ""); }
            return [esc(when || "-"), '<div class="df-name">' + esc(e.a || "-") + "</div>" + (e.d ? '<div class="df-meta">' + esc(e.d) + "</div>" : ""), esc(e.u || "-")];
          })
        ) : empty(tx({ en: "No activity log rows yet.", es: "Aun no hay actividad.", pt: "Ainda nao ha atividade." })),
        4, "acct");
  }

  function liveMaint() {
    var all = arr(function () { return DB.maintenance(); });
    var rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    var active = all.filter(function (i) { return i.status !== "Done"; }).sort(function (a, b) {
      return (rank[a.priority] != null ? rank[a.priority] : 2) - (rank[b.priority] != null ? rank[b.priority] : 2);
    });
    var req = all.filter(function (i) { return i.status === "Requested"; }).length;
    var ip = all.filter(function (i) { return i.status === "In Progress"; }).length;
    var wait = all.filter(function (i) { return i.status === "Waiting"; }).length;
    var done = all.filter(function (i) { return i.status === "Done"; }).length;
    return statRow([
      stat(fmt(req), tx({ en: "Requested", es: "Solicitados", pt: "Pedidos" }), req ? "warn" : ""),
      stat(fmt(ip), tx({ en: "In progress", es: "En progreso", pt: "Em andamento" })),
      stat(fmt(wait), tx({ en: "Waiting", es: "En espera", pt: "Aguardando" }), wait ? "bad" : ""),
      stat(fmt(done), tx({ en: "Done", es: "Hechos", pt: "Feitos" }))
    ]) +
      panel(tx({ en: "Open work", es: "Trabajo abierto", pt: "Trabalho aberto" }),
        active.length ? dfTable(
          [{ h: "Request" }, { h: "Area" }, { h: "Priority" }, { h: "Status" }],
          active.map(function (i) {
            var pr = i.priority || "";
            var cls = pr === "Urgent" || pr === "High" ? "df-out" : "df-low";
            return [
              '<div class="df-name">' + esc(i.title || "-") + "</div>" + (i.problem ? '<div class="df-meta">' + esc(i.problem) + "</div>" : ""),
              esc(i.area || "-"),
              pr ? pill(pr, cls) : "-",
              esc(i.status || "-") + (i.status === "Waiting" && i.waiting_on ? '<div class="df-meta">' + esc(i.waiting_on) + "</div>" : "")
            ];
          })
        ) : empty(tx({ en: "No open maintenance requests.", es: "No hay solicitudes abiertas.", pt: "Nao ha pedidos abertos." })),
        4, "maintenance");
  }

  function liveDocs() {
    var docs = arr(function () { return DB.referenceDocs ? DB.referenceDocs() : []; }).slice().sort(function (a, b) {
      return String(b.created_at || b.id || "").localeCompare(String(a.created_at || a.id || ""));
    });
    var by = {};
    docs.forEach(function (d) { var c = d.category || "Other"; by[c] = (by[c] || 0) + 1; });
    var cats = Object.keys(by).sort();
    return statRow([
      stat(fmt(docs.length), tx({ en: "Documents", es: "Documentos", pt: "Documentos" })),
      stat(fmt(cats.length), tx({ en: "Categories", es: "Categorias", pt: "Categorias" })),
      stat(fmt(docs.filter(function (d) { return d.file_url; }).length), tx({ en: "With a file", es: "Con archivo", pt: "Com arquivo" })),
      stat(cats.length ? String(by[cats.slice().sort(function (a, b) { return by[b] - by[a]; })[0]]) : "0",
        cats.length ? cats.slice().sort(function (a, b) { return by[b] - by[a]; })[0] : tx({ en: "Largest category", es: "Categoria mayor", pt: "Maior categoria" }))
    ]) +
      panel(tx({ en: "Library", es: "Biblioteca", pt: "Biblioteca" }),
        docs.length ? (cats.length ? sub(cats.map(function (c) { return c + " " + by[c]; }).join(" · ")) : "") + dfTable(
          [{ h: "Title" }, { h: "Category" }, { h: "Notes" }],
          docs.map(function (d) {
            var title = esc(d.title || d.file_name || "Document");
            if (d.file_url) title = '<a href="' + esc(d.file_url) + '" target="_blank" rel="noopener">' + title + "</a>";
            return [title, esc(d.category || "Other"), esc(d.notes || "")];
          })
        ) : empty(tx({ en: "No SOPs or policies uploaded yet.", es: "Aun no hay SOPs.", pt: "Ainda nao ha SOPs." })),
        4, "reference");
  }

  function liveSystem() {
    var items = arr(function () { return DB.items(); });
    var stock = arr(function () { return DB.stock(); });
    var orders = arr(function () { return DB.orders(); });
    var rows = [
      ["Items", items.length],
      ["Stock rows", stock.length],
      ["Orders", orders.length],
      ["Demand lines", arr(function () { return DB.demandLines ? DB.demandLines() : []; }).length],
      ["Supplier POs", arr(function () { return DB.supplierPos(); }).length],
      ["Receiving log", arr(function () { return DB.receivingLog(); }).length],
      ["Shipping log", arr(function () { return DB.shippingLog(); }).length],
      ["Quality logs", arr(function () { return DB.qualityLogs ? DB.qualityLogs() : []; }).length],
      ["Maintenance", arr(function () { return DB.maintenance(); }).length],
      ["Line status", arr(function () { return DB.lineStatus ? DB.lineStatus() : []; }).length]
    ];
    var snap = "";
    try { snap = DB.SNAPSHOT || ""; } catch (e) { snap = ""; }
    return statRow([
      stat(cloud() ? "CLOUD" : "LOCAL", tx({ en: "Connection", es: "Conexion", pt: "Conexao" }), cloud() ? "" : "warn"),
      stat(fmt(items.length), tx({ en: "Items loaded", es: "Items cargados", pt: "Itens carregados" })),
      stat(fmt(stock.length), tx({ en: "Stock rows loaded", es: "Filas de stock", pt: "Linhas de estoque" })),
      stat(fmt(orders.length), tx({ en: "Orders loaded", es: "Ordenes cargadas", pt: "Pedidos carregados" }))
    ]) +
      panel(tx({ en: "What this screen has loaded", es: "Lo que cargo esta pantalla", pt: "O que esta tela carregou" }),
        sub(snap ? "Snapshot " + snap + "." : "Row counts from the data already on this screen.") +
        dfTable([{ h: "Source" }, { h: "Rows", right: true }], rows.map(function (r) {
          return [esc(r[0]), fmt(r[1])];
        })),
        4, "health");
  }

  function liveFor(id) {
    if (!dbReady()) return notLoaded();
    if (id === "recv") return liveRecv();
    if (id === "inv") return liveInv();
    if (id === "purch") return livePurch();
    if (id === "demand") return liveDemand();
    if (id === "mixing") return liveMix();
    if (id === "pmac") return livePmac();
    if (id === "ful") return liveFul();
    if (id === "ship") return liveShip();
    if (id === "qa") return liveQa();
    if (id === "ops") return liveTeam() + liveMaint() + liveDocs() + liveSystem();
    return "";
  }

  function toolsHtml(dept) {
    return '<div class="dept-tools">' + (dept.sections || []).map(function (sec) {
      return '<h2 class="dept-sec">' + esc(tx(sec.h)) + '</h2><div class="dept-grid">' +
        sec.tools.map(cardHtml).join("") + "</div>";
    }).join("") + "</div>";
  }

  function liveFailed() {
    return panel("Live data", empty(tx({
      en: "Live numbers could not be read.",
      es: "No se pudieron leer los numeros.",
      pt: "Nao foi possivel ler os numeros."
    })), 4, "");
  }
  function homeHtml(dept) {
    var leadLive = "";
    var live = "";
    // Demand puts the floor first. Every other home keeps tools under the title, then live lists.
    if (dept.runningFirst) {
      try { leadLive = dbReady() ? liveRunning() : notLoaded(); } catch (err) { leadLive = liveFailed(); }
      try { live = dbReady() ? liveDemand() : ""; } catch (err) { live = liveFailed(); }
    } else {
      try { live = liveFor(dept.id); } catch (err) { live = liveFailed(); }
    }
    var banner = cloud() ? "" : '<div class="df-banner dept-span4">' + esc(tx({
      en: "This browser is not on the shared cloud database. Counts below are not live plant data.",
      es: "Este navegador no esta en la base compartida. Lo de abajo no es dato en vivo de la planta.",
      pt: "Este navegador nao esta na base compartilhada. O que aparece abaixo nao e dado ao vivo da planta."
    })) + "</div>";
    var head = '<div id="dept-home" class="dept-floor" data-dept="' + esc(dept.id) + '">' +
      '<div class="card dept-lead"><h2>' + esc(tx(dept.title)) + '</h2>' +
      '<p class="hint">' + esc(tx(dept.intro)) + "</p></div>";
    if (dept.runningFirst) return head + banner + leadLive + toolsHtml(dept) + live + "</div>";
    return head + toolsHtml(dept) + banner + live + "</div>";
  }

  function sameStop(a, b) {
    return !!(a && b && a.kind === b.kind && a.id === b.id);
  }
  function toolBy(field, id) {
    var keys = Object.keys(TOOLS);
    for (var i = 0; i < keys.length; i++) {
      if (TOOLS[keys[i]][field] === id) return TOOLS[keys[i]];
    }
    return null;
  }
  function destName(entry) {
    if (!entry) return "";
    if (entry.kind === "home") {
      var dept = deptById(entry.id);
      return dept ? tx(dept.label || dept.title) : "";
    }
    var tool = null;
    if (entry.kind === "go") tool = toolBy("go", entry.id);
    else if (entry.kind === "trace") tool = toolBy("trace", entry.id);
    else if (entry.kind === "mod") tool = toolBy("fn", entry.id);
    return tool ? tx(tool.title) : "";
  }
  function backPhrase(entry) {
    var name = destName(entry);
    if (!name) return tx({ en: "Back", es: "Volver", pt: "Voltar" });
    return tx({
      en: "Back to " + name,
      es: "Volver a " + name,
      pt: "Voltar para " + name
    });
  }
  function currentReturn() {
    if (backStack.length) return backStack[backStack.length - 1];
    return { kind: "home", id: barCurrent || "home" };
  }
  // Remember the screen we are leaving so Back can return to it.
  // Leaving a department home replaces the trail with that home.
  // Demand tabs are siblings: switching them does not add a step.
  function pushBefore(next) {
    if (backRestoring || !next) return;
    if (sameStop(backHere, next)) return;
    if (backHere && backHere.kind === "go" && next.kind === "go" && DEMAND_TABS[backHere.id] && DEMAND_TABS[next.id]) return;
    if (backHere && backHere.kind === "trace" && next.kind === "trace") return;
    if (!backHere) {
      backStack = [{ kind: "home", id: barCurrent || "home" }];
      return;
    }
    if (backHere.kind === "home") {
      backStack = [backHere];
      return;
    }
    var top = backStack[backStack.length - 1];
    if (!sameStop(top, backHere)) backStack.push(backHere);
    if (backStack.length > 12) backStack.shift();
  }
  // Full-screen editors that already have their own Back stay as they are.
  function ownsBack(view) {
    if (view.querySelector("#pn-to, #po-vendor, #np-vendor, #po-sup, #sk-sku")) return true;
    if (view.querySelector("[onclick*='spoCloseDetail'], [onclick*='poCreateBack'], [onclick*='nonPoBack'], [onclick*='poNewClose'], [onclick*='skuEditClose'], [onclick*='UI.poBack']")) return true;
    return false;
  }
  function isDashboard(view) {
    return !!(view && view.querySelector(".df-lead"));
  }
  function removeBackBar(view) {
    var bar = view && view.querySelector("#dept-backbar");
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }
  function restoreStop(entry) {
    if (!entry || entry.kind === "home") {
      showHome(entry && entry.id ? entry.id : (barCurrent || "home"));
      return;
    }
    var landed = false;
    backRestoring = true;
    try {
      if (entry.kind === "go" && typeof window.UI_go === "function") { window.UI_go(entry.id); landed = true; }
      else if (entry.kind === "trace" && window.TRACE && typeof TRACE.go === "function") { TRACE.go(entry.id); landed = true; }
      else if (entry.kind === "mod" && entry.id === "hist" && window.MFGHIST) { MFGHIST.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "up" && window.MFGUPLOAD) { MFGUPLOAD.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "sps" && window.SPSFEED) { SPSFEED.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "shipments" && window.SHIPPING_SYNC) { SHIPPING_SYNC.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "health" && window.DATAHEALTH) { DATAHEALTH.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "svc" && window.SERVICES) { SERVICES.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "sqf" && window.SQFTASKS) { SQFTASKS.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "ferr" && window.FULFILL_ANALYTICS) { FULFILL_ANALYTICS.open(); landed = true; }
      else if (entry.kind === "mod" && entry.id === "qacheck" && window.QACHECK) { QACHECK.open(); landed = true; }
    } finally {
      backRestoring = false;
    }
    if (landed) backHere = entry;
    else showHome(barCurrent || "home");
  }
  // Department tabs refuse to switch while any field is focused. Back is a
  // deliberate leave, so an empty scan box (Receive and the lot stations
  // focus one on open) does not count. A field the user has typed in does.
  function backBlocked() {
    if (document.getElementById("po-vendor") || document.getElementById("po-sup") ||
        document.getElementById("np-vendor") || document.getElementById("pn-to") ||
        document.getElementById("sk-sku")) return true;
    var ae = document.activeElement;
    if (!ae || !ae.closest || !ae.closest("#view")) return false;
    if (ae.tagName !== "INPUT" && ae.tagName !== "TEXTAREA") return false;
    var typ = String(ae.type || "text").toLowerCase();
    if (typ === "button" || typ === "submit" || typ === "checkbox" || typ === "radio" || typ === "file" || typ === "hidden" || typ === "date" || typ === "time" || typ === "datetime-local") return false;
    return String(ae.value || "").trim() !== "";
  }
  function goBack() {
    var blocked = backPressBusy || backBlocked();
    backPressBusy = false;
    if (blocked) { toast(Lbusy()); return; }
    var prev = backStack.length ? backStack.pop() : { kind: "home", id: barCurrent || "home" };
    restoreStop(prev);
  }
  function syncBackBar() {
    var view = document.getElementById("view");
    if (!view || painting || homeId) return;
    if (view.querySelector("#dept-home") || isDashboard(view)) {
      removeBackBar(view);
      if (!backHere) backHere = { kind: "home", id: barCurrent || "home" };
      return;
    }
    if (ownsBack(view)) {
      removeBackBar(view);
      return;
    }
    var phrase = backPhrase(currentReturn());
    var bar = view.querySelector("#dept-backbar");
    if (bar && bar.getAttribute("data-label") === phrase && view.firstChild === bar) return;
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "dept-backbar";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "dept-back";
      btn.addEventListener("touchstart", function () { backPressBusy = backBlocked(); }, { passive: true });
      btn.addEventListener("mousedown", function () { backPressBusy = backBlocked(); });
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        goBack();
      });
      bar.appendChild(btn);
    }
    bar.setAttribute("data-label", phrase);
    var button = bar.querySelector("button");
    button.setAttribute("aria-label", phrase);
    var label = button.querySelector(".dept-back-label");
    if (!label) {
      button.textContent = "";
      var ico = document.createElement("i");
      ico.className = "dept-back-ico";
      ico.setAttribute("data-lucide", "chevron-left");
      ico.setAttribute("aria-hidden", "true");
      label = document.createElement("span");
      label.className = "dept-back-label";
      button.appendChild(ico);
      button.appendChild(label);
    }
    label.textContent = phrase;
    if (button.querySelector("i.dept-back-ico")) {
      try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
    }
    if (view.firstChild !== bar) view.insertBefore(bar, view.firstChild);
  }
  function wrapFn(obj, name, next) {
    if (!obj || typeof obj[name] !== "function" || obj[name].__deptBack) return;
    var orig = obj[name];
    var wrapped = function () {
      if (!backRestoring) {
        pushBefore(next);
        backHere = next;
      }
      return orig.apply(this, arguments);
    };
    wrapped.__deptBack = true;
    obj[name] = wrapped;
  }
  function wrapNavigation() {
    if (typeof window.UI_go === "function" && !window.UI_go.__deptBack) {
      var origGo = window.UI_go;
      var go = function (tab) {
        var nextId = String(tab || "");
        if (!backRestoring) {
          if (nextId === "home") {
            /* Dashboard is a home. The wrapper clears the trail after render. */
          } else {
            var next = { kind: "go", id: nextId };
            pushBefore(next);
            backHere = next;
          }
        }
        var result = origGo.apply(this, arguments);
        if (!backRestoring && nextId === "home") {
          backHere = { kind: "home", id: "home" };
          backStack = [];
        }
        return result;
      };
      go.__deptBack = true;
      window.UI_go = go;
    }
    if (window.TRACE && typeof TRACE.go === "function" && !TRACE.go.__deptBack) {
      var origTrace = TRACE.go;
      var traceGo = function (tab) {
        var next = { kind: "trace", id: String(tab || "") };
        if (!backRestoring) {
          pushBefore(next);
          backHere = next;
        }
        return origTrace.apply(this, arguments);
      };
      traceGo.__deptBack = true;
      TRACE.go = traceGo;
    }
    wrapFn(window.MFGHIST, "open", { kind: "mod", id: "hist" });
    wrapFn(window.MFGUPLOAD, "open", { kind: "mod", id: "up" });
    wrapFn(window.SPSFEED, "open", { kind: "mod", id: "sps" });
    wrapFn(window.SHIPPING_SYNC, "open", { kind: "mod", id: "shipments" });
    wrapFn(window.DATAHEALTH, "open", { kind: "mod", id: "health" });
    wrapFn(window.SERVICES, "open", { kind: "mod", id: "svc" });
    wrapFn(window.SQFTASKS, "open", { kind: "mod", id: "sqf" });
    wrapFn(window.FULFILL_ANALYTICS, "open", { kind: "mod", id: "ferr" });
    wrapFn(window.QACHECK, "open", { kind: "mod", id: "qacheck" });
  }
  function leaveBoardMode() {
    if (!document.body.classList.contains("boardmode")) return;
    var prev = backRestoring;
    backRestoring = true;
    try { if (typeof window.UI_go === "function") window.UI_go("home"); } catch (e) {}
    backRestoring = prev;
    document.body.classList.remove("boardmode");
  }

  function paintHome(force) {
    var view = document.getElementById("view");
    var dept = deptById(homeId);
    if (!view || !dept || dept.passthrough) return;
    var root = view.querySelector("#dept-home");
    if (!force && root && root.getAttribute("data-dept") === homeId && root.getAttribute("data-lang") === lang()) return;
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
        (on ? ' aria-current="page"' : "") + '>' +
        '<i class="dept-tab-ico" data-lucide="' + esc(d.icon || "circle") + '" aria-hidden="true"></i>' +
        '<span class="dept-tab-label">' + esc(tx(d.label)) + '</span></button>';
    }).join("");
    scrollActiveTab();
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
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
    leaveBoardMode();
    barCurrent = id;
    paintTries = 0;
    closeDrawer();
    backHere = { kind: "home", id: id };
    backStack = [];
    if (dept.live && typeof window.UI_go === "function") {
      homeId = "";
      markBar();
      paintDeptActive();
      backRestoring = true;
      window.UI_go(dept.live);
      backRestoring = false;
      backHere = { kind: "home", id: id };
      backStack = [];
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
    if (!homeId) { syncBackBar(); return; }
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
          '<i class="navico" data-lucide="' + esc(d.icon || "layout-grid") + '"></i><span>' + esc(tx(d.title || d.label)) + '</span></button>';
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
      "#dept-stack header{padding:8px 14px!important;gap:12px!important}",
      "#dept-stack .logo{font-size:22px!important;line-height:1.1!important;letter-spacing:.2px!important}",
      "#dept-stack .sub{font-size:13px!important;line-height:1.25!important}",
      "#dept-stack .beta{font-size:11px!important;padding:2px 6px!important;margin-left:6px!important}",
      "#dept-stack .navtoggle{padding:6px 11px!important;font-size:20px!important;margin-right:4px!important}",
      "#dept-stack .modebadge{padding:4px 10px!important;font-size:12px!important}",
      "#dept-stack .lang button{padding:5px 10px!important;font-size:13px!important;margin-left:4px!important}",
      "#deptbar{display:flex;width:100%;box-sizing:border-box;gap:4px;align-items:stretch;overflow-x:auto;background:#f4f7fb;border-bottom:1px solid var(--line,#d7dde6);padding:6px 6px 7px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}",
      "#deptbar .dept-tab{flex:1 1 0;min-width:0;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:6px;text-align:center;font-family:inherit;font-weight:800;font-size:13px;line-height:1.1;color:var(--navy,#04223B);background:#fff;border:1px solid #c5d3e2;border-radius:8px;padding:8px 8px;cursor:pointer;min-height:46px;box-shadow:0 1px 0 rgba(4,34,59,.12)}",
      "#deptbar .dept-tab .dept-tab-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#deptbar .dept-tab .dept-tab-ico, #deptbar .dept-tab svg.dept-tab-ico{flex:0 0 auto;width:18px;height:18px;color:var(--blue,#006DB6);stroke-width:2.25}",
      "#deptbar .dept-tab:hover{border-color:var(--blue,#006DB6);background:#f3f8fc}",
      "#deptbar .dept-tab.on{background:var(--orange,#F26B21);color:#fff;border-color:#d4530d;box-shadow:0 2px 0 rgba(180,62,8,.35)}",
      "#deptbar .dept-tab.on .dept-tab-ico, #deptbar .dept-tab.on svg.dept-tab-ico{color:#fff}",
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
      "#dept-home.dept-floor{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;align-items:start;padding:0 0 12px}",
      "#dept-home>.card,#dept-home .dept-stat{padding:8px 10px;border-radius:8px;margin:0}",
      "#dept-home .dept-lead,#dept-home .dept-span4,#dept-home .dept-statrow,#dept-home .dept-tools,#dept-home .df-banner{grid-column:1 / -1}",
      "#dept-home .dept-span2{grid-column:span 2}",
      "#dept-home .dept-lead h2{font-size:16px;margin:0;color:var(--navy,#04223B)}",
      "#dept-home .dept-lead .hint{margin:2px 0 0;font-size:12px}",
      "#dept-home .dept-statrow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}",
      "#dept-home .dept-n{font-size:22px;font-weight:800;line-height:1.05;color:var(--navy,#04223B)}",
      "#dept-home .dept-l{font-size:12px;font-weight:700;color:#3d4c5e;margin-top:2px}",
      "#dept-home .dept-stat.dept-bad .dept-n{color:#B52024}",
      "#dept-home .dept-stat.dept-warn .dept-n{color:#9a5b00}",
      "#dept-home .df-head{margin:0 0 4px}",
      "#dept-home .df-head h2,#dept-home h2.sub2{font-size:15px;margin:0 0 4px;padding-bottom:2px}",
      "#dept-home .df-sub{margin:0 0 4px;font-size:12px}",
      "#dept-home .df-empty{margin:4px 0 2px;font-size:14px}",
      "#dept-home .df-scroll{max-height:280px}",
      "#dept-home table.df th,#dept-home table.df td{padding:4px 6px}",
      "#dept-home table.df td.right,#dept-home table.df th.right{text-align:right}",
      ".df-banner{border:1px solid #E39412;background:#FFF8EC;border-radius:8px;padding:8px 10px;margin:0;font-weight:700;color:#1a1204}",
      ".df-pill{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.3px;padding:2px 7px;border-radius:999px;color:#fff;vertical-align:middle}",
      ".df-out{background:#B52024}.df-low{background:#E39412;color:#1a1204}.df-open{background:#1F3864}.df-ship{background:#2E6FB5}.df-done{background:#5e6b7a}",
      "table.df{width:100%;border-collapse:collapse}",
      "table.df th{font-size:12px;text-align:left;color:#3d4c5e;font-weight:800;padding:4px 6px;border-bottom:1px solid var(--line,#d7dde6);position:sticky;top:0;background:#fff}",
      "table.df td{padding:4px 6px;border-bottom:1px solid #eef2f6;vertical-align:top;font-size:13px}",
      ".df-name{font-weight:800;color:var(--navy,#04223B)}",
      ".df-meta{font-size:12px;color:#3d4c5e;font-weight:600}",
      ".df-empty{margin:4px 0 2px;font-weight:800;color:var(--navy,#1F3864);font-size:14px}",
      ".df-sub{margin:0 0 4px;color:#3d4c5e;font-size:12px}",
      ".df-scroll{max-height:280px;overflow:auto}",
      ".df-more{display:block;width:100%;margin-top:6px;background:#fff;border:1px solid var(--line,#d7dde6);border-radius:8px;padding:6px 10px;font-family:inherit;font-weight:700;font-size:13px;color:var(--navy,#1F3864);cursor:pointer}",
      ".dept-jump{border:0;background:transparent;color:var(--blue,#006DB6);font:800 12px inherit;cursor:pointer;padding:0;white-space:nowrap}",
      "#dept-home .dept-sec{margin:8px 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5c6b7c;font-weight:800}",
      "#dept-home .dept-tools{margin-top:0}",
      "#dept-home .dept-tools .dept-sec:first-child{margin-top:2px}",
      "#dept-home .dept-statrow,#dept-home>.df-banner{margin-top:2px}",
      "#dept-home .dept-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px}",
      "#dept-home .dept-card{display:flex;flex-direction:row;align-items:flex-start;gap:8px;text-align:left;background:#fff;border:1px solid var(--line,#d7dde6);border-radius:8px;padding:6px 8px;cursor:pointer;min-height:0;box-shadow:none;font-family:inherit;color:inherit;width:100%}",
      "#dept-home .dept-card:hover{border-color:var(--blue,#006DB6);box-shadow:0 4px 14px rgba(4,34,59,.08)}",
      "#dept-home .dept-card:focus-visible{outline:3px solid var(--blue,#006DB6);outline-offset:2px}",
      "#dept-home .dept-ico{color:var(--orange,#F26B21);width:18px;height:18px;margin:1px 0 0;flex:none}",
      "#dept-home .dept-ico svg{width:18px;height:18px;stroke-width:1.75}",
      "#dept-home .dept-card-copy{min-width:0}",
      "#dept-home .dept-card strong{display:block;font-size:13px;color:var(--navy,#04223B);margin:0 0 1px}",
      "#dept-home .dept-card-copy>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;color:#3d4c5e;line-height:1.25;font-weight:500}",
      "body.boardmode #deptbar{display:none!important}",
      "#dept-backbar{position:sticky;top:var(--dept-stack-h,0px);z-index:40;display:flex;align-items:center;box-sizing:border-box;margin:-4px -6px 8px;padding:8px 6px 0;background:#eef1f5;border:0;border-radius:0}",
      "#dept-back{display:inline-flex;align-items:center;gap:6px;max-width:100%;min-height:36px;margin:0;padding:6px 12px 6px 8px;border:1px solid #c5d3e2;border-radius:8px;background:#fff;color:var(--navy,#04223B);box-shadow:0 1px 0 rgba(4,34,59,.12);font-family:inherit;font-weight:700;font-size:13px;line-height:1.1;letter-spacing:0;cursor:pointer}",
      "#dept-back:hover{border-color:var(--blue,#006DB6);background:#f3f8fc;text-decoration:none}",
      "#dept-back:focus-visible{outline:3px solid var(--blue,#006DB6);outline-offset:2px}",
      "#dept-back .dept-back-ico,#dept-back svg.dept-back-ico{flex:0 0 auto;width:16px;height:16px;color:var(--blue,#006DB6);stroke-width:2.25}",
      "#dept-back .dept-back-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "body.boardmode #dept-backbar{position:fixed;top:8px;left:8px;z-index:90;display:inline-flex;width:auto;max-width:calc(100vw - 16px);margin:0;padding:0;background:transparent}",
      "body.boardmode #dept-back{background:rgba(255,255,255,.96);box-shadow:0 2px 8px rgba(0,0,0,.28)}",
      "@media print{#dept-backbar{display:none!important}}",
      "@media(max-width:1100px){#view:has(>.df-lead){grid-template-columns:repeat(2,minmax(0,1fr))}#dept-home.dept-floor,#dept-home .dept-statrow{grid-template-columns:repeat(2,minmax(0,1fr))}#dept-home .dept-span2{grid-column:1 / -1}}",
      "@media(max-width:700px){#view:has(>.df-lead){grid-template-columns:1fr}#dept-home.dept-floor,#dept-home .dept-statrow{grid-template-columns:1fr}#dept-home .dept-span2{grid-column:1 / -1}}",
      "@media(max-width:1360px){#deptbar .dept-tab{font-size:12px;gap:4px;padding:8px 4px}#deptbar .dept-tab .dept-tab-ico,#deptbar .dept-tab svg.dept-tab-ico{width:16px;height:16px}}",
      "@media(max-width:1180px){#deptbar .dept-tab{flex:1 0 112px;min-width:112px}}",
      "@media(max-width:640px){#deptbar .dept-tab{flex:1 0 92px;min-width:92px;min-height:54px;flex-direction:column;gap:2px;padding:6px 4px;font-size:11px}#deptbar .dept-tab .dept-tab-label{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:center;line-height:1.05}}",
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
    wrapNavigation();
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
    if (!window.__deptData && window.DB && typeof DB.onChange === "function") {
      window.__deptData = true;
      DB.onChange(function () { if (homeId && !painting) paintHome(true); });
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
    back: goBack,
    fulfillment: function () { showHome("ful"); },
    current: function () { return { home: homeId, bar: barCurrent }; },
    more: function (btn) {
      var card = btn && btn.parentNode;
      if (!card) return;
      var rows = card.querySelectorAll("[data-dept-extra]");
      for (var i = 0; i < rows.length; i++) rows[i].hidden = false;
      if (btn.parentNode) btn.parentNode.removeChild(btn);
    }
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

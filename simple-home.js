/* ===========================================================================
   Smackin' OS - Simple Home and Production steps (simple-home.js)
   Home tab, "Today" subtab: pick your job once (saved on this device), then
   see one big button per task, with a count when something is waiting.
   Production tab, "Steps" subtab: plan > mix > pack on P-Mac > finished
   lots. Each step has one button that opens the station page that already
   does the work (Demand, Mixing, P-Mac departments stay as they are).
   Reads only. Writes nothing to Supabase. Saves the chosen job in
   localStorage (smk_home_role) on this device only.
   Buttons use data-smk-go="dept" or "dept:tool" and DEPT.go (dept-homes.js).
   Counts come from INOUT_HUBS.counts() when it is loaded.
   v322: SMK_VIZ (smk-viz.js) adds a Today at a glance strip under the job
   buttons and P-Mac / order coverage charts under the Production steps.
   Exposes window.SIMPLE_HOME. No DOM timers.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var ROLE_KEY = "smk_home_role";
  var state = { which: "", active: false, painting: false };

  function $(id) { return doc ? doc.getElementById(id) : null; }
  function lang() {
    var es = $("lang-es"), pt = $("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[lang()] || v.en || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function cloud() { try { return !!(root.DB && root.DB.mode === "cloud"); } catch (e) { return false; } }

  // ---- jobs -------------------------------------------------------------------
  // go: "dept" or "dept:tool". count: key into counts() (optional).
  var JOBS = {
    receive:   { go: "inb:receive", icon: "package-plus", t: { en: "Receive a delivery", es: "Recibir una entrega", pt: "Receber uma entrega" }, h: { en: "Count it and save item, lot, qty, best-by.", es: "Cuente y guarde item, lote, cantidad, fecha.", pt: "Conte e salve item, lote, qtd, validade." }, count: "dueIn" },
    dock:      { go: "inb:recvlog", icon: "clipboard-check", t: { en: "Dock checklist", es: "Lista del muelle", pt: "Lista do cais" }, h: { en: "Trailer, seal, condition, paperwork. One per lot.", es: "Trailer, sello, condicion, papeles. Una por lote.", pt: "Trailer, lacre, condicao, papeis. Uma por lote." } },
    putaway:   { go: "inb:move", icon: "arrow-left-right", t: { en: "Put away / move", es: "Guardar / mover", pt: "Guardar / mover" }, h: { en: "Move stock from RECEIVING to its rack.", es: "Mueva de RECEIVING a su rack.", pt: "Mova de RECEIVING para o rack." }, count: "putAway" },
    count:     { go: "inv:count", icon: "clipboard-list", t: { en: "Count stock", es: "Contar inventario", pt: "Contar estoque" }, h: { en: "Scan the item and the slot, type the count.", es: "Escanee item y lugar, escriba el conteo.", pt: "Escaneie item e local, digite a contagem." } },
    adjust:    { go: "inv:adjust", icon: "sliders-horizontal", t: { en: "Fix a count", es: "Corregir un conteo", pt: "Corrigir uma contagem" }, h: { en: "Set the number you just counted.", es: "Ponga el numero que acaba de contar.", pt: "Coloque o numero que acabou de contar." } },
    alerts:    { go: "inv:alerts", icon: "bell", t: { en: "Low and out of stock", es: "Bajo y agotado", pt: "Baixo e esgotado" }, h: { en: "What to reorder or make next.", es: "Que pedir o producir.", pt: "O que pedir ou produzir." } },
    stock:     { go: "inv", icon: "boxes", t: { en: "See what is on hand", es: "Ver existencias", pt: "Ver estoque" }, h: { en: "Every flavor and item, with photos.", es: "Cada sabor e item, con fotos.", pt: "Cada sabor e item, com fotos." } },
    returns:   { go: "inv:returns", icon: "rotate-ccw", t: { en: "Returns", es: "Devoluciones", pt: "Devolucoes" }, h: { en: "Hold, put back in stock, or scrap.", es: "Retener, regresar a inventario o desechar.", pt: "Reter, voltar ao estoque ou descartar." } },
    trace:     { go: "qa:trace", icon: "git-branch", t: { en: "Find a lot", es: "Buscar un lote", pt: "Achar um lote" }, h: { en: "Where a lot came from and where it went.", es: "De donde vino un lote y a donde fue.", pt: "De onde veio um lote e para onde foi." } },
    plan:      { go: "demand:makeplan", icon: "clipboard-list", t: { en: "What to make today", es: "Que producir hoy", pt: "O que produzir hoje" }, h: { en: "The make plan from open orders.", es: "El plan segun las ordenes abiertas.", pt: "O plano a partir dos pedidos abertos." } },
    mixing:    { go: "mixing", icon: "flask-conical", t: { en: "Mixing", es: "Mezcla", pt: "Mistura" }, h: { en: "Work orders, scan seasoning lots, batch record.", es: "Ordenes, escanear lotes de sazon, registro de lote.", pt: "Ordens, escanear lotes, registro de lote." } },
    mixscan:   { go: "mixing:trMix", icon: "scan-line", t: { en: "Scan mixing lots", es: "Escanear lotes de mezcla", pt: "Escanear lotes da mistura" }, h: { en: "Scan each ingredient lot, print the bin tag.", es: "Escanee cada lote, imprima la etiqueta.", pt: "Escaneie cada lote, imprima a etiqueta." } },
    batchrec:  { go: "mixing:batchrec", icon: "notebook-pen", t: { en: "Batch record", es: "Registro de lote", pt: "Registro de lote" }, h: { en: "One sheet per flavor, date, and shift.", es: "Una hoja por sabor, fecha y turno.", pt: "Uma folha por sabor, data e turno." } },
    pmacout:   { go: "pmac:pmacout", icon: "package-open", t: { en: "Log bags off P-Mac", es: "Registrar bolsas de P-Mac", pt: "Registrar sacos da P-Mac" }, h: { en: "Log finished bags as they come off the line.", es: "Registre bolsas terminadas al salir.", pt: "Registre sacos prontos ao sair da linha." } },
    pallet:    { go: "pmac:trPmac", icon: "package-check", t: { en: "Finish a pallet", es: "Terminar una paleta", pt: "Fechar um palete" }, h: { en: "Scan the pallet and print its label.", es: "Escanee la paleta e imprima su etiqueta.", pt: "Escaneie o palete e imprima a etiqueta." } },
    buildret:  { go: "ret:retailprod", icon: "store", t: { en: "Build a retail pallet", es: "Armar paleta retail", pt: "Montar palete varejo" }, h: { en: "Scan or pick the pallet and add it to stock.", es: "Escanee o elija la paleta y agreguela.", pt: "Escaneie ou escolha o palete e adicione." } },
    buildecom: { go: "ecom:ecomprod", icon: "laptop", t: { en: "Build e-com items", es: "Armar e-com", pt: "Montar e-com" }, h: { en: "Log what you built for e-commerce.", es: "Registre lo que armo para e-commerce.", pt: "Registre o que montou para e-commerce." } },
    lotpull:   { go: "ecom:trUse", icon: "log-out", t: { en: "E-com lot pull", es: "Salida de lote e-com", pt: "Saida de lote e-com" }, h: { en: "Log bags pulled for e-com. One save per lot.", es: "Registre bolsas sacadas para e-com.", pt: "Registre sacos retirados para e-com." } },
    orders:    { go: "ret:ordersRetail", icon: "receipt", t: { en: "Orders to ship", es: "Ordenes por enviar", pt: "Pedidos a enviar" }, h: { en: "Retail POs and their ship dates.", es: "OC retail y sus fechas de envio.", pt: "Pedidos varejo e datas de envio." }, count: "shipSoon" },
    trailer:   { go: "outb:trailer", icon: "truck", t: { en: "Trailer release (SQF)", es: "Liberar trailer (SQF)", pt: "Liberar trailer (SQF)" }, h: { en: "Check the trailer before loading. Fail = do not load.", es: "Revise el trailer antes de cargar. Falla = no cargar.", pt: "Cheque o trailer antes de carregar. Falha = nao carregar." }, count: "toRelease" },
    shiplog:   { go: "outb:shiplog", icon: "send", t: { en: "Log a shipment", es: "Registrar un envio", pt: "Registrar um envio" }, h: { en: "Carrier, PRO or tracking, BOL number.", es: "Transportista, PRO o rastreo, BOL.", pt: "Transportadora, PRO ou rastreio, BOL." } },
    docs:      { go: "outb:orderdocs", icon: "folder", t: { en: "File the paperwork", es: "Archivar los papeles", pt: "Arquivar os papeis" }, h: { en: "Signed BOL, packing list, pull sheet.", es: "BOL firmado, lista de empaque, hoja de surtido.", pt: "BOL assinado, lista de embalagem." } },
    checklists:{ go: "qa:qacheck", icon: "list-checks", t: { en: "Today's quality checklists", es: "Listas de calidad de hoy", pt: "Listas de qualidade de hoje" }, h: { en: "Pre-op and daily checks.", es: "Pre-operacion y revisiones diarias.", pt: "Pre-operacao e checagens diarias." } },
    hold:      { go: "qa:trQa", icon: "shield-alert", t: { en: "Hold or release a lot", es: "Retener o liberar un lote", pt: "Reter ou liberar um lote" }, h: { en: "A held lot cannot be used or shipped.", es: "Un lote retenido no se usa ni se envia.", pt: "Lote retido nao pode ser usado nem enviado." }, count: "onHold" },
    ccp:       { go: "qa:quality", icon: "microscope", t: { en: "CCP checks", es: "Controles CCP", pt: "Controles CCP" }, h: { en: "Allergen changeover, label check, metal detector.", es: "Cambio de alergenos, etiqueta, detector de metales.", pt: "Troca de alergenos, rotulo, detector de metais." } },
    coa:       { go: "inb:coalib", icon: "file-check", t: { en: "Supplier COAs", es: "COA de proveedores", pt: "COA de fornecedores" }, h: { en: "Upload or find a COA. No COA = lot on hold.", es: "Suba o busque un COA. Sin COA = lote retenido.", pt: "Envie ou ache um COA. Sem COA = lote retido." }, count: "noCoa" },
    sqf:       { go: "qa:sqftasks", icon: "list-todo", t: { en: "SQF tasks", es: "Tareas SQF", pt: "Tarefas SQF" }, h: { en: "What is due for SQF this week.", es: "Lo que vence de SQF esta semana.", pt: "O que vence do SQF esta semana." } },
    pos:       { go: "inb:purchasing", icon: "shopping-cart", t: { en: "Supplier POs", es: "OC de proveedor", pt: "OCs de fornecedor" }, h: { en: "Create, send, and track supplier POs.", es: "Cree, envie y siga OC de proveedor.", pt: "Crie, envie e acompanhe OCs." }, count: "dueIn" },
    sps:       { go: "ret:sps", icon: "plug", t: { en: "Retailer orders (SPS)", es: "Ordenes de clientes (SPS)", pt: "Pedidos de clientes (SPS)" }, h: { en: "New POs and documents from SPS.", es: "OC nuevas y documentos de SPS.", pt: "Pedidos novos e documentos do SPS." } },
    importord: { go: "demand:demandimport", icon: "file-up", t: { en: "Load SPS / ShipIQ files", es: "Cargar archivos SPS / ShipIQ", pt: "Carregar arquivos SPS / ShipIQ" }, h: { en: "Put new orders on the demand board.", es: "Ponga ordenes nuevas en el tablero.", pt: "Coloque pedidos novos no painel." } },
    fix:       { go: "ops:maintenance", icon: "hard-hat", t: { en: "Report something broken", es: "Reportar algo roto", pt: "Reportar algo quebrado" }, h: { en: "Maintenance requests and their status.", es: "Solicitudes de mantenimiento y su estado.", pt: "Pedidos de manutencao e status." } },
    big:       { go: "home:desk", icon: "layout-dashboard", t: { en: "Big picture", es: "Resumen general", pt: "Visao geral" }, h: { en: "Out of stock, late orders, open inbound.", es: "Agotados, ordenes tarde, entradas abiertas.", pt: "Esgotados, pedidos atrasados, entradas abertas." } },
    daily:     { go: "home:daily", icon: "calendar-days", t: { en: "Daily numbers", es: "Numeros del dia", pt: "Numeros do dia" }, h: { en: "Today's counts by department.", es: "Conteos de hoy por departamento.", pt: "Contagens de hoje por departamento." } },
    inhub:     { go: "inb", icon: "arrow-down-to-line", t: { en: "Inbound steps", es: "Pasos de entrada", pt: "Etapas de entrada" }, h: { en: "Supplier to shelf, what is open.", es: "Del proveedor al estante, lo pendiente.", pt: "Do fornecedor a prateleira." } },
    prodhub:   { go: "demand:prodhub", icon: "factory", t: { en: "Production steps", es: "Pasos de produccion", pt: "Etapas de producao" }, h: { en: "Plan, mix, pack, finished lots.", es: "Plan, mezcla, empaque, lotes.", pt: "Plano, mistura, embalagem, lotes." } },
    outhub:    { go: "outb", icon: "arrow-up-from-line", t: { en: "Outbound steps", es: "Pasos de salida", pt: "Etapas de saida" }, h: { en: "Order to truck, what is open.", es: "De la orden al camion, lo pendiente.", pt: "Do pedido ao caminhao." }, count: "toRelease" }
  };
  var ROLES = [
    { id: "floor", t: { en: "Floor lead", es: "Lider de piso", pt: "Lider de piso" }, jobs: ["receive", "dock", "putaway", "count", "buildret", "trailer"] },
    { id: "inventory", t: { en: "Inventory", es: "Inventario", pt: "Estoque" }, jobs: ["count", "adjust", "putaway", "stock", "alerts", "returns", "trace"] },
    { id: "production", t: { en: "Mixing / P-Mac", es: "Mezcla / P-Mac", pt: "Mistura / P-Mac" }, jobs: ["plan", "mixing", "mixscan", "batchrec", "pmacout", "pallet"] },
    { id: "quality", t: { en: "Quality / SQF", es: "Calidad / SQF", pt: "Qualidade / SQF" }, jobs: ["checklists", "hold", "ccp", "coa", "sqf", "trailer", "trace"] },
    { id: "shipping", t: { en: "Shipping / Fulfillment", es: "Envios / Fulfillment", pt: "Envios / Fulfillment" }, jobs: ["orders", "buildret", "buildecom", "lotpull", "trailer", "shiplog", "docs"] },
    { id: "office", t: { en: "Office", es: "Oficina", pt: "Escritorio" }, jobs: ["pos", "sps", "importord", "docs", "fix", "big"] },
    { id: "manager", t: { en: "Manager", es: "Gerente", pt: "Gerente" }, jobs: ["big", "inhub", "prodhub", "outhub", "sqf", "daily"] }
  ];
  function roleById(id) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === id) return ROLES[i]; return null; }
  function getRole() { try { return root.localStorage ? root.localStorage.getItem(ROLE_KEY) || "" : ""; } catch (e) { return ""; } }
  function setRole(id) { try { if (root.localStorage) root.localStorage.setItem(ROLE_KEY, id); } catch (e) {} }

  // ---- counts (read only) ---------------------------------------------------
  function counts() {
    var c = {};
    try {
      if (root.INOUT_HUBS && typeof root.INOUT_HUBS.counts === "function") c = root.INOUT_HUBS.counts() || {};
    } catch (e) { c = {}; }
    return c;
  }
  function countLabel(key, n) {
    var L = {
      dueIn: { en: " due this week or late", es: " llegan esta semana o tarde", pt: " chegam esta semana ou atrasados" },
      putAway: { en: " lots still in RECEIVING", es: " lotes aun en RECEIVING", pt: " lotes ainda em RECEIVING" },
      shipSoon: { en: " ship in the next 2 days", es: " salen en los proximos 2 dias", pt: " saem nos proximos 2 dias" },
      toRelease: { en: " not released, ship soon", es: " sin liberar, salen pronto", pt: " sem liberar, saem logo" },
      onHold: { en: " items on hold", es: " items retenidos", pt: " itens retidos" },
      noCoa: { en: " missing COA", es: " sin COA", pt: " sem COA" }
    };
    return n + tx(L[key] || { en: "" });
  }

  // ---- words ------------------------------------------------------------------
  var W = {
    hello: { en: "Your jobs", es: "Sus tareas", pt: "Suas tarefas" },
    pick: { en: "Pick your job once. This device remembers it.", es: "Elija su trabajo una vez. Este equipo lo recuerda.", pt: "Escolha sua funcao uma vez. Este aparelho lembra." },
    yourJob: { en: "Your job:", es: "Su trabajo:", pt: "Sua funcao:" },
    change: { en: "Change", es: "Cambiar", pt: "Trocar" },
    waiting: { en: "Waiting", es: "Pendiente", pt: "Pendente" },
    elsewhere: { en: "Need something else? Use the tabs at the top, or the menu (top left) to search every screen.", es: "Necesita otra cosa? Use las pestanas de arriba, o el menu (arriba a la izquierda) para buscar cualquier pantalla.", pt: "Precisa de outra coisa? Use as abas no topo, ou o menu (canto superior esquerdo) para buscar qualquer tela." },
    offline: { en: "This browser is not on the shared cloud database. Counts are not live plant data.", es: "Este navegador no esta en la base compartida. Los conteos no son datos en vivo.", pt: "Este navegador nao esta na base compartilhada. As contagens nao sao dados ao vivo." },
    prodTitle: { en: "Production: plan to finished pallet", es: "Produccion: del plan a la paleta", pt: "Producao: do plano ao palete" },
    prodIntro: { en: "Every run goes through these 4 steps, in order. Click the orange button to open that station.", es: "Cada corrida pasa por estos 4 pasos, en orden. Haga clic en el boton naranja para abrir esa estacion.", pt: "Cada producao passa por estas 4 etapas, em ordem. Clique no botao laranja para abrir a estacao." }
  };

  // ---- html -------------------------------------------------------------------
  // Visual summary from smk-viz.js (charts and tiles), below the buttons.
  function viz(fn, arg) {
    try { return root.SMK_VIZ && typeof root.SMK_VIZ[fn] === "function" ? root.SMK_VIZ[fn](arg) || "" : ""; } catch (e) { return ""; }
  }
  function goAttr(go) { return ' data-smk-go="' + esc(go) + '"'; }
  function jobCard(id, c) {
    var j = JOBS[id];
    if (!j) return "";
    var n = j.count ? Number(c[j.count] || 0) : 0;
    return '<button type="button" class="shm-job' + (n > 0 ? " shm-hot" : "") + '"' + goAttr(j.go) + ' data-shm-job="' + esc(id) + '">' +
      '<i data-lucide="' + esc(j.icon) + '" aria-hidden="true"></i>' +
      '<span class="shm-jt">' + esc(tx(j.t)) + '</span>' +
      '<span class="shm-jh">' + esc(tx(j.h)) + '</span>' +
      (n > 0 ? '<span class="shm-cnt">' + esc(countLabel(j.count, n)) + "</span>" : "") +
      "</button>";
  }
  // Home opens on "This week": production and orders-out numbers first
  // (home-week.js), then the per-role job buttons, then the smaller cards.
  function week(fn) {
    try { return root.HOME_WEEK && typeof root.HOME_WEEK[fn] === "function" ? root.HOME_WEEK[fn]() || "" : ""; } catch (e) { return ""; }
  }
  // v323b (Troy, Nov 24): Home is numbers only. No job buttons, no role picker,
  // no to-do lists. Week numbers (home-week.js) here; Big picture and Daily
  // numbers are the other Home subtabs.
  function homeHtml() {
    return '<div id="shm-root" class="shm" data-shm="home" data-lang="' + lang() + '">' +
      (cloud() ? "" : '<div class="shm-banner">' + esc(tx(W.offline)) + "</div>") +
      week("top") + week("below") + "</div>";
  }
  function stepCard(n, title, what, go, label, extra) {
    return '<div class="shm-step"><div class="shm-n">' + n + '</div><div class="shm-body"><h3>' + esc(title) + "</h3>" +
      '<p>' + esc(what) + "</p>" +
      '<div class="shm-btns"><button type="button" class="shm-btn"' + goAttr(go) + ">" + esc(label) + "</button>" + (extra || "") + "</div></div></div>";
  }
  function link(go, label) { return '<button type="button" class="shm-link"' + goAttr(go) + ">" + esc(label) + "</button>"; }
  function prodHtml() {
    var arrow = '<div class="shm-arrow" aria-hidden="true">&rsaquo;</div>';
    return '<div id="shm-root" class="shm" data-shm="prod" data-lang="' + lang() + '">' +
      '<div class="shm-lead"><h2>' + esc(tx(W.prodTitle)) + "</h2><p>" + esc(tx(W.prodIntro)) + "</p></div>" +
      '<div class="shm-steps">' +
      stepCard(1, tx({ en: "Plan what to make", es: "Planear que producir", pt: "Planejar o que produzir" }),
        tx({ en: "The make plan turns open orders into bags to make, by flavor.", es: "El plan convierte las ordenes en bolsas por sabor.", pt: "O plano transforma pedidos em sacos por sabor." }),
        "demand:makeplan", tx({ en: "Make plan", es: "Plan", pt: "Plano" }), link("demand:demandboard", tx({ en: "Order board", es: "Tablero", pt: "Painel" }))) + arrow +
      stepCard(2, tx({ en: "Mix the seasoning", es: "Mezclar la sazon", pt: "Misturar o tempero" }),
        tx({ en: "Open the work order, scan each ingredient lot, fill the batch record.", es: "Abra la orden, escanee cada lote, llene el registro.", pt: "Abra a ordem, escaneie cada lote, preencha o registro." }),
        "mixing", tx({ en: "Mixing station", es: "Estacion de mezcla", pt: "Estacao de mistura" }), link("mixing:batchrec", tx({ en: "Batch record", es: "Registro de lote", pt: "Registro de lote" }))) + arrow +
      stepCard(3, tx({ en: "Pack on P-Mac", es: "Empacar en P-Mac", pt: "Embalar na P-Mac" }),
        tx({ en: "P-Mac is the bagging machine. Log bags as they come off the line.", es: "P-Mac es la maquina de bolsas. Registre bolsas al salir.", pt: "P-Mac e a maquina de ensacar. Registre os sacos." }),
        "pmac", tx({ en: "P-Mac station", es: "Estacion P-Mac", pt: "Estacao P-Mac" }), link("pmac:pmacout", tx({ en: "Log bags", es: "Registrar bolsas", pt: "Registrar sacos" }))) + arrow +
      stepCard(4, tx({ en: "Finish the pallet", es: "Terminar la paleta", pt: "Fechar o palete" }),
        tx({ en: "Scan the pallet, print its label, check the lot and best-by date.", es: "Escanee la paleta, imprima la etiqueta, revise lote y fecha.", pt: "Escaneie o palete, imprima a etiqueta, cheque lote e validade." }),
        "pmac:trPmac", tx({ en: "Finish a pallet", es: "Terminar paleta", pt: "Fechar palete" }), link("pmac:fglots", tx({ en: "Best-by dates", es: "Fechas de consumo", pt: "Validades" }))) +
      "</div>" +
      (cloud() ? "" : '<div class="shm-banner">' + esc(tx(W.offline)) + "</div>") +
      viz("production") +
      "</div>";
  }

  var CSS = [
    ".shm{display:flex;flex-direction:column;gap:12px;padding-bottom:24px}",
    ".shm-lead{background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:14px 16px}",
    ".shm-lead h2{margin:0 0 4px;font-size:22px;color:#04223B}",
    ".shm-lead p{margin:0;color:#374151;font-size:15px}",
    ".shm-banner{background:#fff7e6;border:1px solid #f3c77a;border-radius:8px;padding:8px 12px;font-size:13px;color:#7a4b00}",
    ".shm-roles{display:flex;flex-wrap:wrap;gap:8px}",
    ".shm-role{font:inherit;font-size:16px;font-weight:700;padding:12px 18px;border-radius:10px;border:2px solid #006DB6;background:#fff;color:#006DB6;cursor:pointer;min-height:48px}",
    ".shm-role.on{background:#006DB6;color:#fff}",
    ".shm-jobs{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}",
    ".shm-job{font:inherit;text-align:left;display:flex;flex-direction:column;gap:4px;background:#fff;border:2px solid #c5d3e2;border-radius:12px;padding:16px;cursor:pointer;min-height:118px;color:#04223B}",
    ".shm-job:hover{border-color:#F26B21;background:#fffaf6}",
    ".shm-job svg{width:28px;height:28px;color:#F26B21}",
    ".shm-jt{font-size:19px;font-weight:800;line-height:1.2}",
    ".shm-jh{font-size:14px;color:#4b5563;line-height:1.3}",
    ".shm-cnt{align-self:flex-start;margin-top:4px;font-size:13px;font-weight:800;border-radius:999px;padding:3px 10px;background:#fff1db;color:#8a5200}",
    ".shm-hot{border-color:#F26B21}",
    ".shm-lead-s{padding:10px 14px}.shm-lead-s h2{font-size:18px}",
    ".shm-jobs-s{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.shm-jobs-s .shm-job{min-height:0;padding:12px}.shm-jobs-s .shm-jt{font-size:17px}",
    ".shm-foot{color:#6b7280;font-size:13px;margin:0}",
    ".shm-link{font:inherit;font-size:13px;font-weight:700;color:#006DB6;background:none;border:0;padding:0 4px;cursor:pointer;text-decoration:underline}",
    ".shm-steps{display:grid;grid-template-columns:1fr 18px 1fr 18px 1fr 18px 1fr;gap:6px;align-items:stretch}",
    ".shm-arrow{display:flex;align-items:center;justify-content:center;font-size:30px;color:#F26B21;font-weight:800}",
    ".shm-step{display:flex;gap:10px;background:#fff;border:1px solid #c5d3e2;border-radius:10px;padding:12px}",
    ".shm-n{flex:0 0 34px;height:34px;border-radius:50%;background:#04223B;color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center}",
    ".shm-body{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}",
    ".shm-body h3{margin:0;font-size:17px;color:#04223B}",
    ".shm-body p{margin:0;font-size:14px;color:#374151}",
    ".shm-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:auto}",
    ".shm-btn{font:inherit;font-weight:800;font-size:14px;background:#F26B21;border:1px solid #d4530d;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}",
    "@media(max-width:1180px){.shm-steps{grid-template-columns:1fr 1fr}.shm-arrow{display:none}}",
    "@media(max-width:640px){.shm-steps{grid-template-columns:1fr}.shm-jobs{grid-template-columns:1fr}.shm-job{min-height:0}}"
  ].join("\n");
  function styleOnce() {
    if (!doc || $("shm-style")) return;
    var s = doc.createElement("style");
    s.id = "shm-style";
    s.textContent = CSS;
    doc.head.appendChild(s);
  }

  function render() {
    var view = $("view");
    if (!view || !state.active) return;
    styleOnce();
    var html;
    try { html = state.which === "prod" ? prodHtml() : homeHtml(); }
    catch (e) { html = '<div id="shm-root" class="shm"><div class="shm-banner">' + esc(String(e && e.message || e)) + "</div></div>"; }
    state.painting = true;
    var old = $("shm-root");
    if (old && old.parentNode === view) {
      var holder = doc.createElement("div");
      holder.innerHTML = html;
      view.replaceChild(holder.firstChild, old);
    } else {
      view.innerHTML = html;
    }
    state.painting = false;
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e2) {}
  }

  function open(which) {
    which = which === "prod" ? "prod" : "home";
    var deptId = which === "prod" ? "prod" : "home";
    // v325: Production steps live on the Plan tab.
    try { if (which === "prod" && root.DEPT && root.DEPT.owner && root.DEPT.owner("prodhub")) deptId = root.DEPT.owner("prodhub"); } catch (eOwn) {}
    try {
      var cur = root.DEPT && root.DEPT.current ? root.DEPT.current() : null;
      if (cur && cur.bar !== deptId && root.DEPT.show) { root.DEPT.show(deptId); return; }
    } catch (e) {}
    try { var rel = $("dept-release"); if (rel) rel.click(); } catch (e2) {}
    state.which = which;
    state.active = true;
    state.picking = false;
    try { var nav = $("nav"), bd = $("navBackdrop"); if (nav) nav.classList.remove("open"); if (bd) bd.classList.remove("show"); } catch (e3) {}
    render();
  }

  function go(target) {
    var p = String(target || "").split(":");
    if (!p[0]) return;
    state.active = false;
    if (root.DEPT && typeof root.DEPT.go === "function") root.DEPT.go(p[0], p[1] || "");
    else if (root.DEPT && root.DEPT.show) root.DEPT.show(p[0]);
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var r = t.closest("[data-shm-role]");
    if (r && state.active) { setRole(r.getAttribute("data-shm-role")); state.picking = false; render(); return; }
    if (t.closest("[data-shm-change]") && state.active) { state.picking = true; render(); return; }
    var g = t.closest("[data-smk-go]");
    if (g) { e.preventDefault(); go(g.getAttribute("data-smk-go")); }
  }

  if (doc) {
    doc.addEventListener("click", onClick);
    doc.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-sub], [data-dept-tool], #deptbar [data-dept], #dept-back") : null;
      if (t) state.active = false;
    }, true);
    var langKeep = false;
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) { if (e.target && e.target.id === id) langKeep = state.active; }, true);
      doc.addEventListener("click", function (e) {
        if (!(e.target && e.target.id === id) || !langKeep) return;
        setTimeout(function () { if (!langKeep) return; langKeep = false; state.active = true; render(); }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return state.active; });
    var startObs = function () {
      var view = $("view");
      if (!view || view.__shmObs || typeof MutationObserver !== "function") return;
      view.__shmObs = true;
      new MutationObserver(function () {
        if (state.painting || !state.active) return;
        if (!$("shm-root")) state.active = false;
      }).observe(view, { childList: true });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", startObs); else startObs();
    var hookDb = function () {
      if (hookDb.done || !root.DB || typeof root.DB.onChange !== "function") return;
      hookDb.done = true;
      root.DB.onChange(function () { if (state.active && $("shm-root") && state.which === "home") render(); });
    };
    hookDb();
    if (!hookDb.done) doc.addEventListener("DOMContentLoaded", hookDb);
  }

  var api = { open: open, home: function () { open("home"); }, production: function () { open("prod"); }, render: render, go: go,
    JOBS: JOBS, ROLES: ROLES, roleById: roleById, getRole: getRole, setRole: setRole, _state: state };
  root.SIMPLE_HOME = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================================
   Smackin' Inventory — UI layer (talks only to window.DB)
   Scanners: keyboard-wedge (focus a field + scan) AND camera (Scan button).
   ============================================================================ */
(function () {
  "use strict";
  const T = {
    en: { dash:"Overview", home:"Dashboard", receive:"Receive", putaway:"Put-Away", move:"Move / Pick", produce:"Produce",
      count:"Count", locations:"Locations", purchasing:"Purchasing", labels:"Labels", log:"Activity", settings:"Settings",
      onhand:"On hand", item:"Item", unit:"Unit", qty:"Qty", lot:"Lot", status:"Status", reorder:"Reorder pt",
      scanItem:"Scan or type item code / UPC", to:"To location", from:"From location",
      submitReceive:"Receive", submitPut:"Put away", submitMove:"Move / pick", submitProduce:"Record production", submitCount:"Save count",
      operator:"Operator", enter:"Enter quantity", newqty:"Counted quantity", pickFlavor:"Finished flavor (4oz)", qtyBags:"Qty (bags)",
      found:"Found", notfound:"Not found", badloc:"Invalid location", camera:"Scan", totalItems:"Items", lowItems:"Low / out",
      bag4:"4oz bags", bag15:"1.5oz bags", supplier:"Supplier", need:"Suggested order", order:"Order",
      allgood:"Everything is above its reorder point.", reset:"Reset demo data", when:"When", action:"Action", detail:"Detail",
      noLog:"No activity yet.", empty:"Empty", cloud:"CLOUD", localmode:"LOCAL",
      printLoc:"Print all location labels", printItem:"Print item labels", newLpn:"New pallet label (LPN)", print:"Print",
      labelsHint:"Print barcodes on your thermal label printer. Location labels are permanent; a pallet LPN is one barcode per incoming pallet.",
      dashHint:"Live on hand across every location. Filter by category.",
      receiveHint:"Scan an item, enter qty + details, then pick where it goes (scan the slot or tap Section-Bay-Level) - it lands there in one step. Leave the location blank to hold at Receiving.",
      rSupplier:"Supplier", rInvoice:"Invoice / PO #", rCategory:"Category", rPallets:"Pallets", rCondition:"Condition", rStatus:"Status",
      putHint:"Scan the item, then scan the slot barcode OR tap Section - Bay - Level. Moves from Receiving in real time.",
      puDest:"Destination", puSection:"Section", puBay:"Bay", puLevel:"Level", puZones:"Floor / zones", puScanLoc:"A-05-L3 / scan slot barcode",
      moveHint:"Scan item, pick from and to (slot, WIP, Pack-Out, Shipping...).",
      produceHint:"Record finished 4oz bags off the line. Adds bags, consumes film + seasoning.",
      countHint:"Cycle count: scan item + slot, enter the counted quantity; the system adjusts.",
      locHint:"What is in each location now.", purchHint:"Reorder alerts plus full purchase orders.",
      locMap:"Rack map", locList:"List", locFloor:"Floor plan", locOccupied:"Occupied", locEmpty:"Empty", locBlocked:"Blocked", locSection:"Section", locDocks:"Dock doors", locZones:"Zones & staging", locClickHint:"Top-down view of the racks. Green = occupied, click any slot to see what is stored there. Bay 01 is at the dock end.", locNothing:"Nothing stored in this slot.", locSlot:"Slot", locBaysUsed:"slots used", locOfficeEnd:"office end", locFarEnd:"far end",
      locFloorNote:"Top-down map of the building - every place product is stored or moves through. Click a rack section or staging zone to see its contents. Section A/B/C/D letters are a best guess - tell me which physical run is which and I will lock them in.", locStorage:"Storage (racking)", locTransfer:"Production & transfer areas", locStaging:"Staging & work zones",
      reorderSug:"Reorder suggestions", purchOrders:"Purchase orders", newPO:"New PO", createDraft:"Create draft PO",
      chooseSupplier:"Supplier", poExpected:"Expected", poCost:"Unit cost", addLines:"Set quantities to order (0 = skip).",
      savePO:"Save draft PO", markOrdered:"Mark as ordered", receivePO:"Receive", confirmReceipt:"Confirm receipt",
      cancelPO:"Cancel PO", deletePO:"Delete", backList:"Back", orderedQ:"Ordered", received:"Received", outstanding:"Outstanding",
      noPOs:"No purchase orders yet.", poCreated:"PO created", poTotal:"Est. total", recvNow:"Receive now",
      st_draft:"Draft", st_ordered:"Ordered", st_partial:"Partial", st_received:"Received", st_cancelled:"Cancelled",
      returns:"Returns", seasoning:"Seasoning", qa:"Quarantine",
      role:"View", roleAll:"Manager (all)", roleReceiving:"Receiving", roleProduction:"Fulfillment",
      returnsHint:"Log a customer or Amazon return. Restock goes to RETURNS; damaged goes to QA hold.",
      rChannel:"Channel", rReason:"Reason", rDisposition:"Disposition", rRMA:"Order / RMA #",
      submitReturn:"Log return", recentReturns:"Recent returns", noReturns:"No returns logged yet.",
      seasHint:"Track seasoning by lot with expiration (FEFO). Flag expired lots to quarantine.",
      slProduct:"Product / flavor", slLot:"Lot #", slMfr:"Manufacturer", slExp:"Expiration", slWeight:"Weight (lbs)",
      addLot:"Add lot", seasLotsTitle:"Seasoning lots (earliest expiration first)", quarantineExpired:"Quarantine expired lots",
      noLots:"No seasoning lots yet.", markQuar:"Quarantine", markGood:"Mark good", expiredTag:"EXPIRED", quarTag:"QUARANTINE", goodTag:"GOOD",
      seed:"Seed", seedHint:"Log each lot of raw sunflower seed with supplier + lot # for recall traceability. Newest first.", sdType:"Seed type", sdReceived:"Received", seedLotsTitle:"Seed lots (newest first)", noSeedLots:"No seed lots yet.",
      skus:"SKUs", skusHint:"Finished-goods / retail SKU catalog - bundles, singles, and cases with bag count and flavor contents. Reference only.", skuCode:"SKU", skuTitle:"Product", skuBags:"Bags", skuComp:"Contents", skuSearchP:"Search SKU, product, or flavor...", skuCount:"SKUs",
      stockbuild:"Stock Build", sbHint:"Live build progress vs goals. Update On Hand as you go - the whole team sees it instantly. Yellow field = enter today's count.", sbGoal:"Goal", sbOnHand:"On hand", sbToBuild:"To build", sbPallets:"Pallets", sbDone:"Done", sbTotalGoal:"Total goal", sbComplete:"Complete", sbSaved:"Saved", sbRetail:"Retail", sbEcom:"E-Commerce", sb12pk:"12-Pack Boxes",
      retailprod:"Retail Production",ecomprod:"E-Commerce",epHint:"E-commerce / DTC product (variety packs). Scan or pick the item, enter the quantity built, and it is added to stock instantly. ShipStation and TikTok orders will draw this down automatically once connected.", rpHint:"When a pallet is made, scan its product barcode (or pick it), enter the quantity, and it is added to stock instantly. Print the barcode sheet with the button below and post it at the line.", rpScanP:"Scan product barcode", rpPickProduct:"Or pick a product...", rpQty:"Quantity made", rpAdd:"Add to stock", rpAdded:"Added to stock", rpCurrent:"Current on hand", rpRecent:"Recent production", rpNone:"Nothing added yet.", rpPrint:"Print product barcodes", rpNotFound:"Barcode not recognized",
      qaHint:"Quarantined product - do NOT touch (wrapped in red film). Usually expired or has incorrect info. Release good ones back to stock or scrap them.",
      qaTitle:"On quarantine hold (red film - do not touch)", convertGood:"Release to good stock", scrapIt:"Scrap", qaEmpty:"Nothing in quarantine.",
      columns:"Columns", colCategory:"Category", colItem:"Item", colOnhand:"On hand", colReorder:"Reorder", colStatus:"Status", resetCols:"Reset",
      pinTitle:"Enter PIN to make changes", pinHint:"Only staff with the PIN can add or change inventory. Viewing is open to everyone.", pinWrong:"Wrong PIN - try again", pinBtn:"Unlock", locked:"Editing locked", unlocked:"Editing unlocked", lockBtn:"Lock editing",
      adjust:"Adjust", adjustHint:"Set the current count for any item: type the number you counted and Save. Use the search box to find items fast. Leave a box blank to keep it unchanged.", searchItems:"Search item name or code", newCount:"New count", saveCounts:"Save counts", noChanges:"No counts entered", savedN:"Counts saved",
      orders:"Orders", ordersHint:"Non-SPS / Stripe orders. Newest on top; completed orders move to the archive.",
      ordOpen:"Open", ordComplete:"Complete", ordAdd:"+ Add order", ordSave:"Save order", ordCancel:"Cancel",
      oCustomer:"Customer", oPO:"Customer PO #", oOrderId:"Order ID", oInvDate:"Invoice date", oShipDate:"Ship date",
      oTracking:"Tracking / BOL / PRO", oCarrier:"Carrier", oAppt:"Appointment / Opendock", oNotes:"Notes", oStripe:"Stripe link", oStatus:"Status",
      markComplete:"Mark complete", reopen:"Reopen", noOpenOrders:"No open orders. Add one above.", noCompleteOrders:"No completed orders yet.", ordAdded:"Order added", ordSearchP:"Search customer, PO, tracking...", oLegShip:"Shipped", oLegIP:"In process", oLegIssue:"Issue", oEnteredBy:"Entered by", oOther:"Other...", oByOther:"Or type a name", oByPrefix:"by",
      rd:"R&D", roleRnd:"R&D",
      mixing:"Mixing", pmac:"P-Mac", roleMixing:"Mixing (Allen)", rolePmac:"P-Mac (Allen)", grpMixing:"Mixing", grpPmac:"P-Mac",
      deptSoon:"This area is being set up. Allen's team screens will live here - tell us what you'd like tracked and we'll build it in.",
      conHint:"Scan each material as it moves from the racking into this room. Records real-time usage and removes it from inventory. Lot # required on every scan.", conLot:"Lot # (required)", conBtn:"Log usage", conRecent:"Recent usage", conNone:"Nothing logged yet.", conWhen:"When", conMat:"Material", conBy:"By", conErr:"Scan an item, quantity, and lot #", conNotInList:"not in item list",
      grpReceiving:"Receiving", grpInventory:"Inventory", grpProduction:"Fulfillment", grpShipping:"Shipping", grpPurchasing:"Purchasing", grpRnd:"R&D", grpHr:"HR", grpImprove:"Improvement", grpSystem:"System",
      people:"People", hrHint:"Team directory and org chart. Non-sensitive info only - no pay or personal data.", hrGate:"This section shows employee information. Enter the manager PIN to view.",
      hrDir:"Directory", hrOrg:"Org chart", hrRole:"Role", hrDept:"Department", hrStart:"Started", hrMgr:"Reports to", hrSearchP:"Search name or role...", hrCount:"people", hrNoMatch:"No matching people.", hrYr:"yr", hrMo:"mo",
      alerts:"Alerts", alertsHint:"What needs attention now: items to reorder and seasoning lots nearing expiration.",
      alOut:"Out of stock", alLow:"Low - reorder soon", alExp:"Seasoning expiring / expired", alNone:"No alerts - everything is stocked and in date.",
      alOnhand:"On hand", alReorder:"Reorder pt", alSuggest:"Suggested order", alSupplier:"Supplier", alDraftPO:"Draft PO",
      alDays:"days", alExpired:"expired", alLeft:"left", alQuar:"Quarantine",
      alSummaryOut:"Out", alSummaryLow:"Low", alSummaryExp:"Expiring lots",
      homeTitle:"Dashboard", homeHint:"Live stock health for the SLC Fulfillment Center - the essentials at a glance.",
      hOut:"Out of stock", hLow:"Low / reorder", hExp:"Expiring lots", hOpen:"Open orders", hIssues:"Order issues", hRd:"R&D pending",
      hAttention:"Needs attention now", hAllClear:"All clear - nothing urgent right now.", hSnapshot:"On-hand snapshot", hSeeAll:"See all",
      hEssential:"Essential items - stock by flavor", hFlavor:"Flavor", essFilm:"Film 4oz", hBase:"Base materials", hCovered:"OK", hLowShort:"Low", hOutShort:"Out",
      supplierpos:"Supplier POs", spoHint:"Upload the POs you create in outside systems (Excel or PDF). The file is stored and the details are read in automatically when the format is recognized.",
      spoDrop:"Drop a PO file here, or click to choose  (.xlsx, .csv, .pdf)", spoVendor:"Vendor", spoPO:"PO #", spoDate:"PO date", spoTotal:"Total", spoItems:"Line items", spoNotes:"Notes", spoFile:"File", spoUploadedBy:"Uploaded by",
      spoSave:"Save PO", spoCancel:"Clear", spoSaved:"Supplier PO saved", spoNoFile:"Choose a file first", spoParsed:"Read from file", spoDownload:"Download", spoDelete:"Deleted", spoList:"Uploaded supplier POs", spoNone:"No supplier POs yet. Upload one above.", spoSearchP:"Search vendor, PO #...", spoConfirmDel:"Delete this supplier PO?",
      orderdocs:"Order Docs", odocHint:"Store the paperwork for fulfilled orders (BOL, packing list, pull sheet, labels, invoice) by customer and PO - like SPS. Searchable so CS can pull any order's docs fast.",
      odocDrop:"Choose a file to store  (PDF, Excel, image, Word)", odocCustomer:"Customer", odocPO:"PO / Order #", odocType:"Document type", odocSave:"Store document", odocArchive:"Document archive", odocNone:"No documents stored yet. Add one above.", odocSearchP:"Search customer, PO, doc type...", odocSaved:"Document stored", odocConfirmDel:"Delete this document?", odocNoFile:"Choose a file first",
      shiplog:"Shipping Log", shlHint:"Log every outbound shipment - samples, replacements, one-off customer sends. Pick the carrier and the tracking # becomes a clickable link.",
      shlDate:"Date", shlType:"Type", shlRecipient:"Recipient", shlAddress:"Address", shlCarrier:"Carrier", shlTracking:"Tracking #", shlReqBy:"Requested by", shlCost:"Cost", shlContents:"What was sent", shlStatus:"Status", shlNotes:"Notes", shlSave:"Log shipment", shlArchive:"Shipment log", shlNone:"No shipments logged yet. Add one above.", shlSearchP:"Search recipient, tracking, type...", shlLogged:"Shipment logged", shlConfirmDel:"Delete this shipment entry?",
      recvlog:"Receiving Log", rlHint:"Log every inbound shipment and attach the paperwork (packing slip, BOL, invoice). Pick the carrier and the PRO/tracking # becomes a clickable link.",
      rlDrop:"Attach paperwork  (PDF, Excel, image, Word)", rlDate:"Date", rlSupplier:"Supplier", rlPO:"PO #", rlCarrier:"Carrier", rlTracking:"Tracking / PRO #", rlContents:"What was received", rlQtyOrd:"Qty ordered", rlQtyRec:"Qty received", rlShortOver:"Short/Over", rlCondition:"Condition", rlReceivedBy:"Received by", rlNotes:"Notes", rlDoc:"Doc", rlSave:"Log receipt", rlArchive:"Receiving log", rlNone:"No receipts logged yet. Add one above.", rlSearchP:"Search supplier, PO, carrier...", rlLogged:"Receipt logged", rlConfirmDel:"Delete this receiving entry?",
      editRow:"Edit", editingRow:"Editing this entry - change what you need, then Save.", saveChanges:"Save changes", saved:"Saved", rlKeepDoc:"current file kept unless you attach a new one", sortHint:"Click to sort", dlPdf:"Download PDF", dlExcel:"Download Excel",
      finbags:"Finished Bags", fbHint:"Bags that have come off P-Mac and are staged in storage. Inventory counts these; Fulfillment counts the master-case output.", fb4oz:"4oz bags", fb15oz:"1.5oz bags", fbTotal:"All bags",
      pmacout:"Bag Output", pmoHint:"Log finished bags as they come off P-Mac into storage. Pick what's running + the count (a sensor will automate this later).", pmoRunning:"Now running (flavor + size)", pmoQty:"Bags", pmoAdd:"Log bags out", pmoNone:"No bags logged yet this session.",
      improve:"Continuous Improvement", ciHint:"Track Lean, 5S and Kaizen initiatives - ideas, projects in progress, and a running record of wins. Move each one Idea -> In Progress -> Done.",
      ciActive:"Active", ciWins:"Wins", ciIdeas:"Ideas", ciInProgress:"In progress", ciAdd:"Add initiative", ciAdded:"Initiative added",
      ciTitle:"Initiative", ciTitleP:"e.g. Label + zone the receiving staging area", ciType:"Type", ciArea:"Area", ciOwner:"Owner", ciPriority:"Priority", ciStatus:"Status", ciOpened:"Opened",
      ciProblem:"Problem / goal", ciProblemP:"What are we fixing or improving?", ciImpact:"Impact / win", ciImpactHint:"the result", ciImpactP:"What changed? time saved, waste cut, safer, etc.",
      ciCompleted:"Completed", ciReopen:"Reopen", ciNoActive:"No active initiatives. Add one above.", ciNoWins:"No completed wins yet.", ciSearchP:"Search title, type, area, owner...", ciConfirmDel:"Delete this initiative?",
      poCreate:"+ Create PO", poNewTitle:"New Purchase Order", poVendorAddr:"Vendor address", poVendorEmail:"Vendor email", poVendorPhone:"Vendor phone", poShipTo:"Ship to", poPreparedBy:"Prepared by", poAddLine:"+ Add line", poItemNo:"Item #", poDesc:"Description", poQtyL:"Qty", poPriceL:"Price", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Shipping", poTaxL:"Tax", poOtherL:"Other", poGrandL:"Total", poSaveBtn:"Save PO", poBackList:"Back to list", poSavedMsg:"PO saved", poNeedVendor:"Enter a vendor first",
      rdHint:"Request samples and ingredients here. Each request generates a PDF and is tracked Pending until it arrives.",
      rdPending:"Pending", rdDone:"Received", rdAdd:"+ New request", rdSave:"Save request", rdCancel:"Cancel",
      rdType:"Request type", rdCompany:"Company / supplier", rdContact:"Contact name", rdEmail:"Contact email",
      rdItems:"What you are requesting", rdQty:"Quantity", rdNeed:"Needed by", rdPurpose:"Purpose / project", rdReqBy:"Requested by",
      rdFollow:"Follow-up date", rdNotesF:"Notes", rdMarkRecv:"Mark received", rdReopenB:"Reopen",
      rdDownload:"Download PDF", rdSend:"Email request", rdSentTag:"SENT", rdOverdue:"OVERDUE",
      rdNoPending:"No pending requests. Add one above.", rdNoReceived:"No received requests yet.",
      rdAdded:"Request created", rdSearchP:"Search company, item, request #...",
      rdSendOk:"Request emailed", rdSendNo:"Sending is not set up yet - download the PDF and email it.", rdSendFail:"Could not send - download the PDF and email it.",
      rdSending:"Sending...", rdPdfTitle:"SAMPLE / R&D REQUEST", rdReqNo:"Request #", rdDate:"Date", rdTo:"To", rdFrom:"Requested by",
      rdEmailSubject:"Sample request from Smackin' Snacks", rdConfirmRecv:"Mark this request as received?",
      settingsHint:"Mode, layout, and demo controls." },
    es: { dash:"Resumen", home:"Panel", receive:"Recibir", putaway:"Almacenar", move:"Mover / Sacar", produce:"Producir",
      count:"Conteo", locations:"Ubicaciones", purchasing:"Compras", labels:"Etiquetas", log:"Actividad", settings:"Ajustes",
      onhand:"Disponible", item:"Articulo", unit:"Unidad", qty:"Cant.", lot:"Lote", status:"Estado", reorder:"Punto reorden",
      scanItem:"Escanee o escriba codigo / UPC", to:"Hacia ubicacion", from:"Desde ubicacion",
      submitReceive:"Recibir", submitPut:"Almacenar", submitMove:"Mover / sacar", submitProduce:"Registrar produccion", submitCount:"Guardar conteo",
      operator:"Operador", enter:"Ingrese cantidad", newqty:"Cantidad contada", pickFlavor:"Sabor terminado (4oz)", qtyBags:"Cant. (bolsas)",
      found:"Encontrado", notfound:"No encontrado", badloc:"Ubicacion invalida", camera:"Escanear", totalItems:"Articulos", lowItems:"Bajo / agotado",
      bag4:"Bolsas 4oz", bag15:"Bolsas 1.5oz", supplier:"Proveedor", need:"Orden sugerida", order:"Ordenar",
      allgood:"Todo esta sobre su punto de reorden.", reset:"Reiniciar datos demo", when:"Cuando", action:"Accion", detail:"Detalle",
      noLog:"Sin actividad.", empty:"Vacio", cloud:"NUBE", localmode:"LOCAL",
      printLoc:"Imprimir etiquetas de ubicacion", printItem:"Imprimir etiquetas de articulo", newLpn:"Nueva etiqueta de pallet (LPN)", print:"Imprimir",
      labelsHint:"Imprima codigos en su impresora termica. Las de ubicacion son permanentes; el LPN es un codigo por pallet entrante.",
      dashHint:"Disponible en vivo en todas las ubicaciones. Filtre por categoria.",
      receiveHint:"Escanee un articulo, ingrese cant. + detalles, luego elija a donde va (escanee el slot o toque Seccion-Bahia-Nivel) - llega ahi en un paso. Deje la ubicacion en blanco para dejarlo en Recibo.",
      rSupplier:"Proveedor", rInvoice:"Factura / OC #", rCategory:"Categoria", rPallets:"Pallets", rCondition:"Condicion", rStatus:"Estado",
      putHint:"Escanee el articulo, luego escanee el codigo del slot O toque Seccion - Bahia - Nivel. Sale de Recibo en tiempo real.",
      puDest:"Destino", puSection:"Seccion", puBay:"Bahia", puLevel:"Nivel", puZones:"Piso / zonas", puScanLoc:"A-05-L3 / escanee slot",
      moveHint:"Escanee articulo, elija desde y hacia (slot, WIP, Empaque, Embarque...).",
      produceHint:"Registre bolsas 4oz de la linea. Suma bolsas, consume film + sazon.",
      countHint:"Conteo ciclico: escanee articulo + slot, ingrese la cantidad contada.",
      locHint:"Lo que hay en cada ubicacion ahora.", purchHint:"Alertas de reorden mas ordenes de compra.",
      locMap:"Mapa de racks", locList:"Lista", locFloor:"Plano", locOccupied:"Ocupado", locEmpty:"Vacio", locBlocked:"Bloqueado", locSection:"Seccion", locDocks:"Puertas de muelle", locZones:"Zonas y staging", locClickHint:"Vista superior de los racks. Verde = ocupado, haga clic en un slot para ver que hay. La bahia 01 esta junto a los muelles.", locNothing:"Nada almacenado en este slot.", locSlot:"Slot", locBaysUsed:"slots usados", locOfficeEnd:"lado oficina", locFarEnd:"lado lejano",
      locFloorNote:"Plano superior del edificio - cada lugar donde se almacena o mueve producto. Haga clic en una seccion de rack o zona para ver su contenido. Las letras A/B/C/D son un estimado - digame que fila fisica es cual y las fijo.", locStorage:"Almacenamiento (racks)", locTransfer:"Areas de produccion y transferencia", locStaging:"Zonas de staging y trabajo",
      reorderSug:"Sugerencias de reorden", purchOrders:"Ordenes de compra", newPO:"Nueva orden", createDraft:"Crear borrador",
      chooseSupplier:"Proveedor", poExpected:"Esperado", poCost:"Costo unit.", addLines:"Indique cantidades a pedir (0 = omitir).",
      savePO:"Guardar borrador", markOrdered:"Marcar como ordenada", receivePO:"Recibir", confirmReceipt:"Confirmar recibo",
      cancelPO:"Cancelar orden", deletePO:"Eliminar", backList:"Volver", orderedQ:"Pedido", received:"Recibido", outstanding:"Pendiente",
      noPOs:"Aun no hay ordenes de compra.", poCreated:"Orden creada", poTotal:"Total est.", recvNow:"Recibir ahora",
      st_draft:"Borrador", st_ordered:"Ordenada", st_partial:"Parcial", st_received:"Recibida", st_cancelled:"Cancelada",
      returns:"Devoluciones", seasoning:"Sazon", qa:"Cuarentena",
      role:"Vista", roleAll:"Gerente (todo)", roleReceiving:"Recibo", roleProduction:"Fulfillment",
      returnsHint:"Registre una devolucion de cliente o Amazon. Reingreso va a DEVOLUCIONES; danado va a retencion QA.",
      rChannel:"Canal", rReason:"Motivo", rDisposition:"Disposicion", rRMA:"Orden / RMA #",
      submitReturn:"Registrar devolucion", recentReturns:"Devoluciones recientes", noReturns:"Sin devoluciones aun.",
      seasHint:"Controle la sazon por lote con vencimiento (FEFO). Marque lotes vencidos a cuarentena.",
      slProduct:"Producto / sabor", slLot:"Lote #", slMfr:"Fabricante", slExp:"Vencimiento", slWeight:"Peso (lbs)",
      addLot:"Agregar lote", seasLotsTitle:"Lotes de sazon (vencimiento mas proximo primero)", quarantineExpired:"Cuarentena de vencidos",
      noLots:"Sin lotes de sazon aun.", markQuar:"Cuarentena", markGood:"Marcar bueno", expiredTag:"VENCIDO", quarTag:"CUARENTENA", goodTag:"BUENO",
      seed:"Semilla", seedHint:"Registre cada lote de semilla cruda con proveedor + lote # para trazabilidad de retiro. Mas nuevo primero.", sdType:"Tipo de semilla", sdReceived:"Recibido", seedLotsTitle:"Lotes de semilla (mas nuevo primero)", noSeedLots:"Aun no hay lotes de semilla.",
      skus:"SKUs", skusHint:"Catalogo de SKU de producto terminado / retail - paquetes, individuales y cajas con cantidad de bolsas y sabores. Solo referencia.", skuCode:"SKU", skuTitle:"Producto", skuBags:"Bolsas", skuComp:"Contenido", skuSearchP:"Buscar SKU, producto o sabor...", skuCount:"SKUs",
      stockbuild:"Construir Inventario", sbHint:"Progreso de construccion vs metas en vivo. Actualice En Mano segun avanza - todo el equipo lo ve al instante. Campo amarillo = ingrese el conteo de hoy.", sbGoal:"Meta", sbOnHand:"En mano", sbToBuild:"Por hacer", sbPallets:"Paletas", sbDone:"Listo", sbTotalGoal:"Meta total", sbComplete:"Completo", sbSaved:"Guardado", sbRetail:"Minorista", sbEcom:"Comercio Electronico", sb12pk:"Cajas de 12",
      retailprod:"Produccion Retail",ecomprod:"E-Commerce",epHint:"Producto e-commerce / DTC (paquetes variados). Escanee o elija el articulo, ingrese la cantidad producida y se agrega al inventario al instante. Los pedidos de ShipStation y TikTok lo descontaran automaticamente cuando se conecten.", rpHint:"Cuando se hace una paleta, escanee su codigo de producto (o eligalo), ingrese la cantidad y se agrega al inventario al instante. Imprima la hoja de codigos con el boton de abajo y pongala en la linea.", rpScanP:"Escanee codigo del producto", rpPickProduct:"O elija un producto...", rpQty:"Cantidad hecha", rpAdd:"Agregar al inventario", rpAdded:"Agregado al inventario", rpCurrent:"En mano actual", rpRecent:"Produccion reciente", rpNone:"Nada agregado aun.", rpPrint:"Imprimir codigos de producto", rpNotFound:"Codigo no reconocido",
      qaHint:"Producto en cuarentena - NO tocar (envuelto en film rojo). Generalmente vencido o con informacion incorrecta. Libere los buenos a inventario o descartelos.",
      qaTitle:"En cuarentena (film rojo - no tocar)", convertGood:"Liberar a inventario bueno", scrapIt:"Descartar", qaEmpty:"Nada en cuarentena.",
      columns:"Columnas", colCategory:"Categoria", colItem:"Articulo", colOnhand:"Disponible", colReorder:"Reorden", colStatus:"Estado", resetCols:"Reiniciar",
      pinTitle:"Ingrese el PIN para hacer cambios", pinHint:"Solo el personal con el PIN puede agregar o cambiar inventario. Ver es libre para todos.", pinWrong:"PIN incorrecto - intente de nuevo", pinBtn:"Desbloquear", locked:"Edicion bloqueada", unlocked:"Edicion desbloqueada", lockBtn:"Bloquear edicion",
      adjust:"Ajustar", adjustHint:"Fije el conteo actual de cualquier articulo: escriba la cantidad que conto y Guarde. Use el buscador para encontrar articulos rapido. Deje la casilla vacia para no cambiarlo.", searchItems:"Buscar nombre o codigo", newCount:"Nuevo conteo", saveCounts:"Guardar conteos", noChanges:"No ingreso conteos", savedN:"Conteos guardados",
      orders:"Ordenes", ordersHint:"Ordenes no-SPS / Stripe. Las mas nuevas arriba; las completadas pasan al archivo.",
      ordOpen:"Abiertas", ordComplete:"Completadas", ordAdd:"+ Agregar orden", ordSave:"Guardar orden", ordCancel:"Cancelar",
      oCustomer:"Cliente", oPO:"OC del cliente #", oOrderId:"ID de orden", oInvDate:"Fecha factura", oShipDate:"Fecha envio",
      oTracking:"Rastreo / BOL / PRO", oCarrier:"Transportista", oAppt:"Cita / Opendock", oNotes:"Notas", oStripe:"Enlace Stripe", oStatus:"Estado",
      markComplete:"Marcar completada", reopen:"Reabrir", noOpenOrders:"Sin ordenes abiertas. Agregue una arriba.", noCompleteOrders:"Aun no hay ordenes completadas.", ordAdded:"Orden agregada", ordSearchP:"Buscar cliente, OC, rastreo...", oLegShip:"Enviado", oLegIP:"En proceso", oLegIssue:"Problema", oEnteredBy:"Ingresado por", oOther:"Otro...", oByOther:"O escriba un nombre", oByPrefix:"por",
      rd:"I+D", roleRnd:"I+D",
      mixing:"Mezcla", pmac:"P-Mac", roleMixing:"Mezcla (Allen)", rolePmac:"P-Mac (Allen)", grpMixing:"Mezcla", grpPmac:"P-Mac",
      deptSoon:"Esta area se esta configurando. Aqui viviran las pantallas del equipo de Allen - diganos que desea controlar y lo agregamos.",
      conHint:"Escanee cada material al pasar del estante a esta sala. Registra el uso en tiempo real y lo descuenta del inventario. Numero de lote requerido en cada escaneo.", conLot:"Lote # (requerido)", conBtn:"Registrar uso", conRecent:"Uso reciente", conNone:"Nada registrado aun.", conWhen:"Cuando", conMat:"Material", conBy:"Por", conErr:"Escanee articulo, cantidad y lote #", conNotInList:"no esta en la lista",
      grpReceiving:"Recibo", grpInventory:"Inventario", grpProduction:"Fulfillment", grpShipping:"Envios", grpPurchasing:"Compras", grpRnd:"I+D", grpHr:"RH", grpImprove:"Mejora", grpSystem:"Sistema",
      people:"Personal", hrHint:"Directorio del equipo y organigrama. Solo informacion no sensible - sin pago ni datos personales.", hrGate:"Esta seccion muestra informacion de empleados. Ingrese el PIN de gerente para ver.",
      hrDir:"Directorio", hrOrg:"Organigrama", hrRole:"Puesto", hrDept:"Departamento", hrStart:"Ingreso", hrMgr:"Reporta a", hrSearchP:"Buscar nombre o puesto...", hrCount:"personas", hrNoMatch:"Sin coincidencias.", hrYr:"ano", hrMo:"mes",
      alerts:"Alertas", alertsHint:"Lo que necesita atencion ahora: articulos por reordenar y lotes de sazon por vencer.",
      alOut:"Agotado", alLow:"Bajo - reordenar pronto", alExp:"Sazon por vencer / vencida", alNone:"Sin alertas - todo con stock y vigente.",
      alOnhand:"Disponible", alReorder:"Punto reorden", alSuggest:"Orden sugerida", alSupplier:"Proveedor", alDraftPO:"Borrador OC",
      alDays:"dias", alExpired:"vencido", alLeft:"restan", alQuar:"Cuarentena",
      alSummaryOut:"Agotado", alSummaryLow:"Bajo", alSummaryExp:"Lotes por vencer",
      homeTitle:"Panel de control", homeHint:"Estado del inventario en vivo del centro SLC - lo esencial de un vistazo.",
      hOut:"Agotado", hLow:"Bajo / reorden", hExp:"Lotes por vencer", hOpen:"Ordenes abiertas", hIssues:"Ordenes con problema", hRd:"I+D pendiente",
      hAttention:"Necesita atencion ahora", hAllClear:"Todo en orden - nada urgente ahora.", hSnapshot:"Resumen de disponible", hSeeAll:"Ver todo",
      hEssential:"Articulos esenciales - stock por sabor", hFlavor:"Sabor", essFilm:"Film 4oz", hBase:"Materiales base", hCovered:"OK", hLowShort:"Bajo", hOutShort:"Agotado",
      supplierpos:"OC Proveedor", spoHint:"Suba las OC que crea en sistemas externos (Excel o PDF). El archivo se guarda y los datos se leen automaticamente cuando se reconoce el formato.",
      spoDrop:"Suelte un archivo de OC aqui, o haga clic para elegir  (.xlsx, .csv, .pdf)", spoVendor:"Proveedor", spoPO:"OC #", spoDate:"Fecha OC", spoTotal:"Total", spoItems:"Lineas", spoNotes:"Notas", spoFile:"Archivo", spoUploadedBy:"Subido por",
      spoSave:"Guardar OC", spoCancel:"Limpiar", spoSaved:"OC de proveedor guardada", spoNoFile:"Elija un archivo primero", spoParsed:"Leido del archivo", spoDownload:"Descargar", spoDelete:"Eliminado", spoList:"OC de proveedor subidas", spoNone:"Aun no hay OC de proveedor. Suba una arriba.", spoSearchP:"Buscar proveedor, OC #...", spoConfirmDel:"Eliminar esta OC de proveedor?",
      orderdocs:"Docs de Orden", odocHint:"Guarde el papeleo de ordenes cumplidas (BOL, lista de empaque, hoja de picking, etiquetas, factura) por cliente y OC - como SPS. Buscable para que servicio al cliente encuentre los documentos rapido.",
      odocDrop:"Elija un archivo para guardar  (PDF, Excel, imagen, Word)", odocCustomer:"Cliente", odocPO:"OC / # de Orden", odocType:"Tipo de documento", odocSave:"Guardar documento", odocArchive:"Archivo de documentos", odocNone:"Aun no hay documentos. Agregue uno arriba.", odocSearchP:"Buscar cliente, OC, tipo...", odocSaved:"Documento guardado", odocConfirmDel:"Eliminar este documento?", odocNoFile:"Elija un archivo primero",
      shiplog:"Registro de Envios", shlHint:"Registre cada envio saliente - muestras, reemplazos, envios puntuales a clientes. Elija el transportista y el # de rastreo se vuelve un enlace.",
      shlDate:"Fecha", shlType:"Tipo", shlRecipient:"Destinatario", shlAddress:"Direccion", shlCarrier:"Transportista", shlTracking:"# de Rastreo", shlReqBy:"Solicitado por", shlCost:"Costo", shlContents:"Que se envio", shlStatus:"Estado", shlNotes:"Notas", shlSave:"Registrar envio", shlArchive:"Registro de envios", shlNone:"Aun no hay envios. Agregue uno arriba.", shlSearchP:"Buscar destinatario, rastreo, tipo...", shlLogged:"Envio registrado", shlConfirmDel:"Eliminar este registro de envio?",
      recvlog:"Registro de Recibo", rlHint:"Registre cada envio entrante y adjunte el papeleo (remito, BOL, factura). Elija el transportista y el # PRO/rastreo se vuelve un enlace.",
      rlDrop:"Adjuntar papeleo  (PDF, Excel, imagen, Word)", rlDate:"Fecha", rlSupplier:"Proveedor", rlPO:"# OC", rlCarrier:"Transportista", rlTracking:"# Rastreo / PRO", rlContents:"Que se recibio", rlQtyOrd:"Cant. pedida", rlQtyRec:"Cant. recibida", rlShortOver:"Faltante/Sobrante", rlCondition:"Condicion", rlReceivedBy:"Recibido por", rlNotes:"Notas", rlDoc:"Doc", rlSave:"Registrar recibo", rlArchive:"Registro de recibo", rlNone:"Aun no hay recibos. Agregue uno arriba.", rlSearchP:"Buscar proveedor, OC, transportista...", rlLogged:"Recibo registrado", rlConfirmDel:"Eliminar este registro de recibo?",
      editRow:"Editar", editingRow:"Editando esta entrada - cambie lo necesario y guarde.", saveChanges:"Guardar cambios", saved:"Guardado", rlKeepDoc:"se conserva el archivo actual salvo que adjunte uno nuevo", sortHint:"Clic para ordenar", dlPdf:"Descargar PDF", dlExcel:"Descargar Excel",
      finbags:"Bolsas Terminadas", fbHint:"Bolsas que salieron de P-Mac y estan en almacenamiento. Inventario las cuenta; Fulfillment cuenta la salida de cajas maestras.", fb4oz:"Bolsas 4oz", fb15oz:"Bolsas 1.5oz", fbTotal:"Todas las bolsas",
      pmacout:"Salida de Bolsas", pmoHint:"Registre las bolsas terminadas al salir de P-Mac a almacenamiento. Elija lo que corre + la cantidad (un sensor lo automatizara luego).", pmoRunning:"Corriendo ahora (sabor + tamano)", pmoQty:"Bolsas", pmoAdd:"Registrar bolsas", pmoNone:"Aun no hay bolsas esta sesion.",
      improve:"Mejora Continua", ciHint:"Rastree iniciativas Lean, 5S y Kaizen - ideas, proyectos en curso y un registro de logros. Mueva cada una Idea -> En Curso -> Hecho.",
      ciActive:"Activas", ciWins:"Logros", ciIdeas:"Ideas", ciInProgress:"En curso", ciAdd:"Agregar iniciativa", ciAdded:"Iniciativa agregada",
      ciTitle:"Iniciativa", ciTitleP:"ej. Etiquetar y zonificar el area de recibo", ciType:"Tipo", ciArea:"Area", ciOwner:"Responsable", ciPriority:"Prioridad", ciStatus:"Estado", ciOpened:"Abierta",
      ciProblem:"Problema / meta", ciProblemP:"Que estamos arreglando o mejorando?", ciImpact:"Impacto / logro", ciImpactHint:"el resultado", ciImpactP:"Que cambio? tiempo ahorrado, menos desperdicio, mas seguro, etc.",
      ciCompleted:"Completada", ciReopen:"Reabrir", ciNoActive:"No hay iniciativas activas. Agregue una arriba.", ciNoWins:"Aun no hay logros completados.", ciSearchP:"Buscar titulo, tipo, area, responsable...", ciConfirmDel:"Eliminar esta iniciativa?",
      poCreate:"+ Crear OC", poNewTitle:"Nueva Orden de Compra", poVendorAddr:"Direccion del proveedor", poVendorEmail:"Correo del proveedor", poVendorPhone:"Telefono del proveedor", poShipTo:"Enviar a", poPreparedBy:"Preparado por", poAddLine:"+ Agregar linea", poItemNo:"Articulo #", poDesc:"Descripcion", poQtyL:"Cant", poPriceL:"Precio", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Envio", poTaxL:"Impuesto", poOtherL:"Otro", poGrandL:"Total", poSaveBtn:"Guardar OC", poBackList:"Volver a la lista", poSavedMsg:"OC guardada", poNeedVendor:"Ingrese un proveedor primero",
      rdHint:"Solicite muestras e ingredientes aqui. Cada solicitud genera un PDF y se sigue como Pendiente hasta que llega.",
      rdPending:"Pendiente", rdDone:"Recibido", rdAdd:"+ Nueva solicitud", rdSave:"Guardar solicitud", rdCancel:"Cancelar",
      rdType:"Tipo de solicitud", rdCompany:"Empresa / proveedor", rdContact:"Nombre de contacto", rdEmail:"Correo de contacto",
      rdItems:"Que esta solicitando", rdQty:"Cantidad", rdNeed:"Necesario para", rdPurpose:"Proposito / proyecto", rdReqBy:"Solicitado por",
      rdFollow:"Fecha de seguimiento", rdNotesF:"Notas", rdMarkRecv:"Marcar recibido", rdReopenB:"Reabrir",
      rdDownload:"Descargar PDF", rdSend:"Enviar solicitud", rdSentTag:"ENVIADO", rdOverdue:"VENCIDO",
      rdNoPending:"Sin solicitudes pendientes. Agregue una arriba.", rdNoReceived:"Aun no hay solicitudes recibidas.",
      rdAdded:"Solicitud creada", rdSearchP:"Buscar empresa, articulo, solicitud #...",
      rdSendOk:"Solicitud enviada por correo", rdSendNo:"El envio aun no esta configurado - descargue el PDF y enviela.", rdSendFail:"No se pudo enviar - descargue el PDF y enviela.",
      rdSending:"Enviando...", rdPdfTitle:"SOLICITUD DE MUESTRA / I+D", rdReqNo:"Solicitud #", rdDate:"Fecha", rdTo:"Para", rdFrom:"Solicitado por",
      rdEmailSubject:"Solicitud de muestra de Smackin' Snacks", rdConfirmRecv:"Marcar esta solicitud como recibida?",
      settingsHint:"Modo, distribucion y controles demo." },
    pt: { dash:"Visao geral", home:"Painel", receive:"Receber", putaway:"Armazenar", move:"Mover / Separar", produce:"Produzir",
      count:"Contagem", locations:"Locais", purchasing:"Compras", labels:"Etiquetas", log:"Atividade", settings:"Configuracoes",
      onhand:"Em estoque", item:"Item", unit:"Unid.", qty:"Qtd.", lot:"Lote", status:"Status", reorder:"Ponto de reposicao",
      scanItem:"Escaneie ou digite codigo / UPC", to:"Para o local", from:"Do local",
      submitReceive:"Receber", submitPut:"Armazenar", submitMove:"Mover / separar", submitProduce:"Registrar producao", submitCount:"Salvar contagem",
      operator:"Operador", enter:"Digite a quantidade", newqty:"Quantidade contada", pickFlavor:"Sabor finalizado (4oz)", qtyBags:"Qtd. (sacos)",
      found:"Encontrado", notfound:"Nao encontrado", badloc:"Local invalido", camera:"Escanear", totalItems:"Itens", lowItems:"Baixo / esgotado",
      bag4:"Sacos 4oz", bag15:"Sacos 1.5oz", supplier:"Fornecedor", need:"Pedido sugerido", order:"Pedir",
      allgood:"Tudo esta acima do ponto de reposicao.", reset:"Reiniciar dados demo", when:"Quando", action:"Acao", detail:"Detalhe",
      noLog:"Sem atividade ainda.", empty:"Vazio", cloud:"NUVEM", localmode:"LOCAL",
      printLoc:"Imprimir etiquetas de local", printItem:"Imprimir etiquetas de item", newLpn:"Nova etiqueta de palete (LPN)", print:"Imprimir",
      labelsHint:"Imprima codigos na sua impressora termica. As de local sao permanentes; o LPN e um codigo por palete recebido.",
      dashHint:"Estoque ao vivo em todos os locais. Filtre por categoria.",
      receiveHint:"Escaneie um item, digite qtd. + detalhes, depois escolha para onde vai (escaneie o slot ou toque Secao-Baia-Nivel) - chega la em um passo. Deixe o local em branco para segurar no Recebimento.",
      rSupplier:"Fornecedor", rInvoice:"Fatura / OC #", rCategory:"Categoria", rPallets:"Paletes", rCondition:"Condicao", rStatus:"Status",
      putHint:"Escaneie o item, depois escaneie o codigo do slot OU toque Secao - Baia - Nivel. Sai de Recebimento em tempo real.",
      puDest:"Destino", puSection:"Secao", puBay:"Baia", puLevel:"Nivel", puZones:"Piso / zonas", puScanLoc:"A-05-L3 / escaneie slot",
      moveHint:"Escaneie item, escolha de e para (slot, WIP, Empacotamento, Expedicao...).",
      produceHint:"Registre sacos 4oz da linha. Adiciona sacos, consome filme + tempero.",
      countHint:"Contagem ciclica: escaneie item + slot, digite a quantidade contada.",
      locHint:"O que ha em cada local agora.", purchHint:"Alertas de reposicao mais ordens de compra.",
      locMap:"Mapa de racks", locList:"Lista", locFloor:"Planta", locOccupied:"Ocupado", locEmpty:"Vazio", locBlocked:"Bloqueado", locSection:"Secao", locDocks:"Portas de doca", locZones:"Zonas e staging", locClickHint:"Vista de cima dos racks. Verde = ocupado, clique em um slot para ver o que ha. A baia 01 fica junto as docas.", locNothing:"Nada armazenado neste slot.", locSlot:"Slot", locBaysUsed:"slots usados", locOfficeEnd:"lado escritorio", locFarEnd:"lado distante",
      locFloorNote:"Planta de cima do predio - cada lugar onde produto e armazenado ou movimentado. Clique em uma secao de rack ou zona para ver o conteudo. As letras A/B/C/D sao um palpite - diga qual fila fisica e qual e eu fixo.", locStorage:"Armazenamento (racks)", locTransfer:"Areas de producao e transferencia", locStaging:"Zonas de staging e trabalho",
      reorderSug:"Sugestoes de reposicao", purchOrders:"Ordens de compra", newPO:"Nova ordem", createDraft:"Criar rascunho",
      chooseSupplier:"Fornecedor", poExpected:"Esperado", poCost:"Custo unit.", addLines:"Defina as quantidades a pedir (0 = pular).",
      savePO:"Salvar rascunho", markOrdered:"Marcar como pedida", receivePO:"Receber", confirmReceipt:"Confirmar recebimento",
      cancelPO:"Cancelar ordem", deletePO:"Excluir", backList:"Voltar", orderedQ:"Pedido", received:"Recebido", outstanding:"Pendente",
      noPOs:"Ainda nao ha ordens de compra.", poCreated:"Ordem criada", poTotal:"Total est.", recvNow:"Receber agora",
      st_draft:"Rascunho", st_ordered:"Pedida", st_partial:"Parcial", st_received:"Recebida", st_cancelled:"Cancelada",
      returns:"Devolucoes", seasoning:"Tempero", qa:"Quarentena",
      role:"Visao", roleAll:"Gerente (tudo)", roleReceiving:"Recebimento", roleProduction:"Fulfillment",
      returnsHint:"Registre uma devolucao de cliente ou Amazon. Reposicao vai para DEVOLUCOES; danificado vai para retencao QA.",
      rChannel:"Canal", rReason:"Motivo", rDisposition:"Destino", rRMA:"Pedido / RMA #",
      submitReturn:"Registrar devolucao", recentReturns:"Devolucoes recentes", noReturns:"Nenhuma devolucao registrada ainda.",
      seasHint:"Controle o tempero por lote com validade (FEFO). Marque lotes vencidos para quarentena.",
      slProduct:"Produto / sabor", slLot:"Lote #", slMfr:"Fabricante", slExp:"Validade", slWeight:"Peso (lbs)",
      addLot:"Adicionar lote", seasLotsTitle:"Lotes de tempero (validade mais proxima primeiro)", quarantineExpired:"Quarentena de vencidos",
      noLots:"Nenhum lote de tempero ainda.", markQuar:"Quarentena", markGood:"Marcar bom", expiredTag:"VENCIDO", quarTag:"QUARENTENA", goodTag:"BOM",
      seed:"Semente", seedHint:"Registre cada lote de semente crua com fornecedor + lote # para rastreabilidade de recall. Mais novo primeiro.", sdType:"Tipo de semente", sdReceived:"Recebido", seedLotsTitle:"Lotes de semente (mais novo primeiro)", noSeedLots:"Ainda nao ha lotes de semente.",
      skus:"SKUs", skusHint:"Catalogo de SKU de produto acabado / varejo - pacotes, individuais e caixas com contagem de sacos e sabores. Apenas referencia.", skuCode:"SKU", skuTitle:"Produto", skuBags:"Sacos", skuComp:"Conteudo", skuSearchP:"Buscar SKU, produto ou sabor...", skuCount:"SKUs",
      stockbuild:"Construir Estoque", sbHint:"Progresso de construcao vs metas ao vivo. Atualize Em Estoque conforme avanca - toda a equipe ve na hora. Campo amarelo = insira a contagem de hoje.", sbGoal:"Meta", sbOnHand:"Em estoque", sbToBuild:"A fazer", sbPallets:"Paletes", sbDone:"Pronto", sbTotalGoal:"Meta total", sbComplete:"Completo", sbSaved:"Salvo", sbRetail:"Varejo", sbEcom:"E-Commerce", sb12pk:"Caixas de 12",
      retailprod:"Producao Varejo",ecomprod:"E-Commerce",epHint:"Produto e-commerce / DTC (pacotes variados). Escaneie ou escolha o item, insira a quantidade produzida e ela e adicionada ao estoque na hora. Os pedidos do ShipStation e TikTok vao baixar isso automaticamente quando conectados.", rpHint:"Quando um palete e feito, escaneie o codigo do produto (ou escolha), insira a quantidade e ela e adicionada ao estoque na hora. Imprima a folha de codigos com o botao abaixo e coloque na linha.", rpScanP:"Escaneie codigo do produto", rpPickProduct:"Ou escolha um produto...", rpQty:"Quantidade feita", rpAdd:"Adicionar ao estoque", rpAdded:"Adicionado ao estoque", rpCurrent:"Em estoque atual", rpRecent:"Producao recente", rpNone:"Nada adicionado ainda.", rpPrint:"Imprimir codigos de produto", rpNotFound:"Codigo nao reconhecido",
      qaHint:"Produto em quarentena - NAO tocar (embrulhado em filme vermelho). Geralmente vencido ou com informacao incorreta. Libere os bons para o estoque ou descarte-os.",
      qaTitle:"Em quarentena (filme vermelho - nao tocar)", convertGood:"Liberar para estoque bom", scrapIt:"Descartar", qaEmpty:"Nada em quarentena.",
      columns:"Colunas", colCategory:"Categoria", colItem:"Item", colOnhand:"Em estoque", colReorder:"Reposicao", colStatus:"Status", resetCols:"Reiniciar",
      pinTitle:"Digite o PIN para fazer alteracoes", pinHint:"Somente a equipe com o PIN pode adicionar ou alterar o estoque. Visualizar e livre para todos.", pinWrong:"PIN incorreto - tente de novo", pinBtn:"Desbloquear", locked:"Edicao bloqueada", unlocked:"Edicao desbloqueada", lockBtn:"Bloquear edicao",
      adjust:"Ajustar", adjustHint:"Defina a contagem atual de qualquer item: digite a quantidade que contou e Salve. Use a busca para achar itens rapido. Deixe a caixa vazia para nao alterar.", searchItems:"Buscar nome ou codigo", newCount:"Nova contagem", saveCounts:"Salvar contagens", noChanges:"Nenhuma contagem inserida", savedN:"Contagens salvas",
      orders:"Pedidos", ordersHint:"Pedidos nao-SPS / Stripe. Os mais novos no topo; os concluidos vao para o arquivo.",
      ordOpen:"Abertos", ordComplete:"Concluidos", ordAdd:"+ Adicionar pedido", ordSave:"Salvar pedido", ordCancel:"Cancelar",
      oCustomer:"Cliente", oPO:"OC do cliente #", oOrderId:"ID do pedido", oInvDate:"Data da fatura", oShipDate:"Data de envio",
      oTracking:"Rastreio / BOL / PRO", oCarrier:"Transportadora", oAppt:"Agendamento / Opendock", oNotes:"Observacoes", oStripe:"Link Stripe", oStatus:"Status",
      markComplete:"Marcar concluido", reopen:"Reabrir", noOpenOrders:"Sem pedidos abertos. Adicione um acima.", noCompleteOrders:"Ainda nao ha pedidos concluidos.", ordAdded:"Pedido adicionado", ordSearchP:"Buscar cliente, OC, rastreio...", oLegShip:"Enviado", oLegIP:"Em processo", oLegIssue:"Problema", oEnteredBy:"Inserido por", oOther:"Outro...", oByOther:"Ou digite um nome", oByPrefix:"por",
      rd:"P&D", roleRnd:"P&D",
      mixing:"Mistura", pmac:"P-Mac", roleMixing:"Mistura (Allen)", rolePmac:"P-Mac (Allen)", grpMixing:"Mistura", grpPmac:"P-Mac",
      deptSoon:"Esta area esta sendo configurada. As telas da equipe do Allen ficarao aqui - diga o que deseja acompanhar e vamos incluir.",
      conHint:"Escaneie cada material ao passar da prateleira para esta sala. Registra o uso em tempo real e baixa do estoque. Numero de lote obrigatorio em cada leitura.", conLot:"Lote # (obrigatorio)", conBtn:"Registrar uso", conRecent:"Uso recente", conNone:"Nada registrado ainda.", conWhen:"Quando", conMat:"Material", conBy:"Por", conErr:"Escaneie item, quantidade e lote #", conNotInList:"nao esta na lista",
      grpReceiving:"Recebimento", grpInventory:"Estoque", grpProduction:"Fulfillment", grpShipping:"Envios", grpPurchasing:"Compras", grpRnd:"P&D", grpHr:"RH", grpImprove:"Melhoria", grpSystem:"Sistema",
      people:"Pessoas", hrHint:"Diretorio da equipe e organograma. Apenas informacoes nao sensiveis - sem salario ou dados pessoais.", hrGate:"Esta secao mostra informacoes de funcionarios. Digite o PIN de gerente para ver.",
      hrDir:"Diretorio", hrOrg:"Organograma", hrRole:"Cargo", hrDept:"Departamento", hrStart:"Inicio", hrMgr:"Reporta a", hrSearchP:"Buscar nome ou cargo...", hrCount:"pessoas", hrNoMatch:"Nenhuma correspondencia.", hrYr:"ano", hrMo:"mes",
      alerts:"Alertas", alertsHint:"O que precisa de atencao agora: itens para repor e lotes de tempero perto do vencimento.",
      alOut:"Esgotado", alLow:"Baixo - repor em breve", alExp:"Tempero vencendo / vencido", alNone:"Sem alertas - tudo em estoque e no prazo.",
      alOnhand:"Em estoque", alReorder:"Ponto reposicao", alSuggest:"Pedido sugerido", alSupplier:"Fornecedor", alDraftPO:"Rascunho OC",
      alDays:"dias", alExpired:"vencido", alLeft:"restam", alQuar:"Quarentena",
      alSummaryOut:"Esgotado", alSummaryLow:"Baixo", alSummaryExp:"Lotes vencendo",
      homeTitle:"Painel", homeHint:"Saude do estoque ao vivo do centro SLC - o essencial em um relance.",
      hOut:"Esgotado", hLow:"Baixo / reposicao", hExp:"Lotes vencendo", hOpen:"Pedidos abertos", hIssues:"Pedidos com problema", hRd:"P&D pendente",
      hAttention:"Precisa de atencao agora", hAllClear:"Tudo certo - nada urgente agora.", hSnapshot:"Resumo em estoque", hSeeAll:"Ver tudo",
      hEssential:"Itens essenciais - estoque por sabor", hFlavor:"Sabor", essFilm:"Filme 4oz", hBase:"Materiais base", hCovered:"OK", hLowShort:"Baixo", hOutShort:"Esgotado",
      supplierpos:"OC Fornecedor", spoHint:"Envie as OCs que voce cria em sistemas externos (Excel ou PDF). O arquivo e armazenado e os dados sao lidos automaticamente quando o formato e reconhecido.",
      spoDrop:"Solte um arquivo de OC aqui, ou clique para escolher  (.xlsx, .csv, .pdf)", spoVendor:"Fornecedor", spoPO:"OC #", spoDate:"Data OC", spoTotal:"Total", spoItems:"Linhas", spoNotes:"Observacoes", spoFile:"Arquivo", spoUploadedBy:"Enviado por",
      spoSave:"Salvar OC", spoCancel:"Limpar", spoSaved:"OC de fornecedor salva", spoNoFile:"Escolha um arquivo primeiro", spoParsed:"Lido do arquivo", spoDownload:"Baixar", spoDelete:"Excluido", spoList:"OCs de fornecedor enviadas", spoNone:"Ainda nao ha OCs de fornecedor. Envie uma acima.", spoSearchP:"Buscar fornecedor, OC #...", spoConfirmDel:"Excluir esta OC de fornecedor?",
      orderdocs:"Docs de Pedido", odocHint:"Armazene a papelada de pedidos concluidos (BOL, lista de embalagem, folha de separacao, etiquetas, fatura) por cliente e OC - como o SPS. Pesquisavel para o SAC encontrar os documentos rapido.",
      odocDrop:"Escolha um arquivo para armazenar  (PDF, Excel, imagem, Word)", odocCustomer:"Cliente", odocPO:"OC / No do Pedido", odocType:"Tipo de documento", odocSave:"Armazenar documento", odocArchive:"Arquivo de documentos", odocNone:"Nenhum documento ainda. Adicione um acima.", odocSearchP:"Buscar cliente, OC, tipo...", odocSaved:"Documento armazenado", odocConfirmDel:"Excluir este documento?", odocNoFile:"Escolha um arquivo primeiro",
      shiplog:"Registro de Envios", shlHint:"Registre cada envio de saida - amostras, reposicoes, envios avulsos a clientes. Escolha a transportadora e o no de rastreio vira um link.",
      shlDate:"Data", shlType:"Tipo", shlRecipient:"Destinatario", shlAddress:"Endereco", shlCarrier:"Transportadora", shlTracking:"No de Rastreio", shlReqBy:"Solicitado por", shlCost:"Custo", shlContents:"O que foi enviado", shlStatus:"Status", shlNotes:"Notas", shlSave:"Registrar envio", shlArchive:"Registro de envios", shlNone:"Nenhum envio ainda. Adicione um acima.", shlSearchP:"Buscar destinatario, rastreio, tipo...", shlLogged:"Envio registrado", shlConfirmDel:"Excluir este registro de envio?",
      recvlog:"Registro de Recebimento", rlHint:"Registre cada envio recebido e anexe a papelada (romaneio, BOL, fatura). Escolha a transportadora e o no PRO/rastreio vira um link.",
      rlDrop:"Anexar papelada  (PDF, Excel, imagem, Word)", rlDate:"Data", rlSupplier:"Fornecedor", rlPO:"No OC", rlCarrier:"Transportadora", rlTracking:"Rastreio / PRO", rlContents:"O que foi recebido", rlQtyOrd:"Qtd pedida", rlQtyRec:"Qtd recebida", rlShortOver:"Falta/Sobra", rlCondition:"Condicao", rlReceivedBy:"Recebido por", rlNotes:"Notas", rlDoc:"Doc", rlSave:"Registrar recebimento", rlArchive:"Registro de recebimento", rlNone:"Nenhum recebimento ainda. Adicione um acima.", rlSearchP:"Buscar fornecedor, OC, transportadora...", rlLogged:"Recebimento registrado", rlConfirmDel:"Excluir este registro de recebimento?",
      editRow:"Editar", editingRow:"Editando esta entrada - altere o necessario e salve.", saveChanges:"Salvar alteracoes", saved:"Salvo", rlKeepDoc:"o arquivo atual e mantido a menos que anexe um novo", sortHint:"Clique para ordenar", dlPdf:"Baixar PDF", dlExcel:"Baixar Excel",
      finbags:"Sacos Terminados", fbHint:"Sacos que sairam do P-Mac e estao no armazenamento. O Estoque os conta; o Fulfillment conta a saida de caixas master.", fb4oz:"Sacos 4oz", fb15oz:"Sacos 1.5oz", fbTotal:"Todos os sacos",
      pmacout:"Saida de Sacos", pmoHint:"Registre os sacos terminados ao sair do P-Mac para o armazenamento. Escolha o que esta rodando + a quantidade (um sensor automatizara depois).", pmoRunning:"Rodando agora (sabor + tamanho)", pmoQty:"Sacos", pmoAdd:"Registrar sacos", pmoNone:"Nenhum saco registrado nesta sessao.",
      improve:"Melhoria Continua", ciHint:"Acompanhe iniciativas Lean, 5S e Kaizen - ideias, projetos em andamento e um registro de conquistas. Mova cada uma Ideia -> Em Andamento -> Concluido.",
      ciActive:"Ativas", ciWins:"Conquistas", ciIdeas:"Ideias", ciInProgress:"Em andamento", ciAdd:"Adicionar iniciativa", ciAdded:"Iniciativa adicionada",
      ciTitle:"Iniciativa", ciTitleP:"ex. Etiquetar e zonear a area de recebimento", ciType:"Tipo", ciArea:"Area", ciOwner:"Responsavel", ciPriority:"Prioridade", ciStatus:"Status", ciOpened:"Aberta",
      ciProblem:"Problema / meta", ciProblemP:"O que estamos corrigindo ou melhorando?", ciImpact:"Impacto / conquista", ciImpactHint:"o resultado", ciImpactP:"O que mudou? tempo economizado, menos desperdicio, mais seguro, etc.",
      ciCompleted:"Concluida", ciReopen:"Reabrir", ciNoActive:"Nenhuma iniciativa ativa. Adicione uma acima.", ciNoWins:"Nenhuma conquista concluida ainda.", ciSearchP:"Buscar titulo, tipo, area, responsavel...", ciConfirmDel:"Excluir esta iniciativa?",
      poCreate:"+ Criar OC", poNewTitle:"Nova Ordem de Compra", poVendorAddr:"Endereco do fornecedor", poVendorEmail:"Email do fornecedor", poVendorPhone:"Telefone do fornecedor", poShipTo:"Enviar para", poPreparedBy:"Preparado por", poAddLine:"+ Adicionar linha", poItemNo:"Item #", poDesc:"Descricao", poQtyL:"Qtd", poPriceL:"Preco", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Frete", poTaxL:"Imposto", poOtherL:"Outro", poGrandL:"Total", poSaveBtn:"Salvar OC", poBackList:"Voltar a lista", poSavedMsg:"OC salva", poNeedVendor:"Insira um fornecedor primeiro",
      rdHint:"Solicite amostras e ingredientes aqui. Cada solicitacao gera um PDF e e acompanhada como Pendente ate chegar.",
      rdPending:"Pendente", rdDone:"Recebido", rdAdd:"+ Nova solicitacao", rdSave:"Salvar solicitacao", rdCancel:"Cancelar",
      rdType:"Tipo de solicitacao", rdCompany:"Empresa / fornecedor", rdContact:"Nome do contato", rdEmail:"E-mail do contato",
      rdItems:"O que voce esta solicitando", rdQty:"Quantidade", rdNeed:"Necessario ate", rdPurpose:"Finalidade / projeto", rdReqBy:"Solicitado por",
      rdFollow:"Data de acompanhamento", rdNotesF:"Observacoes", rdMarkRecv:"Marcar recebido", rdReopenB:"Reabrir",
      rdDownload:"Baixar PDF", rdSend:"Enviar solicitacao", rdSentTag:"ENVIADO", rdOverdue:"ATRASADO",
      rdNoPending:"Sem solicitacoes pendentes. Adicione uma acima.", rdNoReceived:"Ainda nao ha solicitacoes recebidas.",
      rdAdded:"Solicitacao criada", rdSearchP:"Buscar empresa, item, solicitacao #...",
      rdSendOk:"Solicitacao enviada por e-mail", rdSendNo:"O envio ainda nao esta configurado - baixe o PDF e envie.", rdSendFail:"Nao foi possivel enviar - baixe o PDF e envie.",
      rdSending:"Enviando...", rdPdfTitle:"SOLICITACAO DE AMOSTRA / P&D", rdReqNo:"Solicitacao #", rdDate:"Data", rdTo:"Para", rdFrom:"Solicitado por",
      rdEmailSubject:"Solicitacao de amostra da Smackin' Snacks", rdConfirmRecv:"Marcar esta solicitacao como recebida?",
      settingsHint:"Modo, layout e controles demo." }
  };
  let lang = "en"; const L = k => (T[lang][k] !== undefined ? T[lang][k] : (T.en[k] !== undefined ? T.en[k] : k));
  let active = "home"; let catFilter = "all";
  let purchMode = "list"; let purchSup = null; let receivingPOid = null;
  const TABS = ["home","dash","alerts","adjust","receive","recvlog","putaway","returns","orders","orderdocs","shiplog","rd","qa","move","produce","retailprod","ecomprod","stockbuild","seasoning","seed","skus","mixing","pmac","count","locations","finbags","pmacout","purchasing","supplierpos","people","improve","labels","log","settings"];

  // ---- Role presets: which tabs each role sees (home always first) ----
  const ROLE_TABS = {
    all: TABS.slice(),
    receiving: ["home","alerts","dash","adjust","receive","putaway","returns","qa","count","locations","labels"],
    production: ["home","alerts","dash","adjust","produce","seasoning","move","orders","orderdocs","count","locations"],
    mixing: ["home","alerts","mixing","seasoning","produce","count"],
    pmac: ["home","alerts","pmac","labels"],
    rnd: ["home","rd"]
  };
  const RD_TYPES = ["Seasoning sample","Ingredient sample","Packaging sample","Equipment / other"];
  const ORDER_ENTERERS = ["Allie","Josh","Alex","Troy","Salvador"];
  const ODOC_TYPES = ["BOL","Packing List","Pull Sheet","Labels","Commercial Invoice","ASN","Other"];
  const ODOC_UPLOADERS = ["Javier","Ken","Adriana","Jesus","Troy"];
  const SHIP_TYPES = ["Sample","Customer Order","Replacement","Event","Retail","Other"];
  const SHIP_CARRIERS = ["UPS","FedEx","USPS","XPO","DHL","Other"];
  const SHIP_STATUSES = ["Pending","Shipped","Delivered","Returned"];
  const SHIP_REQUESTERS = ["Matt","Troy","Brittney","Ken","Javier","Adriana","Jesus","Other"];
  const RECV_LOG_CONDITIONS = ["Good","Damaged","Short","Over","Hold"];
  const RECV_LOG_RECEIVERS = ["Adriana","Jesus","Javier","Edgar","Marlin","Jhonny","Ken","Troy","Other"];
  // Real product bag photos (smackinsunflowerseeds.com CDN) keyed by normalized flavor name
  const CDN = "https://smackinsunflowerseeds.com/cdn/shop/files/";
  const FLAVOR_IMG = {
    ogoriginal: CDN + "OG_4_Front_c5bc8bec-283d-41cf-86c0-424b7a0c7e0a.png?width=72",
    cinnamonchurro: CDN + "CinnamonChurro_4_Front_6c915739-af26-4377-b9b3-1154291fe004.png?width=72",
    backyardbbq: CDN + "BackyardBBQ_4_Front_9369d97c-6a51-45aa-bc06-ab665870f497.png?width=72",
    garlicparmesan: CDN + "GarlicParmesan_4_Front_82d20d78-b47e-4491-9348-c46a82699860.png?width=72",
    dillpickle: CDN + "DillPickle_4_Front_7b599062-fd89-4279-9c87-f4e74c0eea5d.png?width=72",
    cheddarjalapeno: CDN + "CheddarJalapeno_4_Front_c78f4ffd-4063-43a3-a8dd-0bcf6b53729c.png?width=72",
    ranch: CDN + "Ranch_4_Front_80238a8d-81ef-4769-8e0f-ac04663a6534.png?width=72",
    sourcreamonion: CDN + "SourCream_Onion_4_Front_d1bf59f8-2d3b-4f2a-a69e-a3dea130cd27.png?width=72",
    maplebrownsugar: CDN + "MapleBrownSugar_4_Front_2112beec-1fb1-45f6-89ff-ef72a70fe05f.png?width=72",
    lemonpepper: CDN + "LemonPepper_4_Front_2b7bf9f2-5012-4f7f-adc0-ac1e54696466.png?width=72",
    crackedpepper: CDN + "CrackedPepper_4_Front_59837e87-ef45-4540-8540-f98da28bdea2.png?width=72"
  };
  function flavorImg(fl) { const k = String(fl || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); return FLAVOR_IMG[k] || ""; }
  // Fuzzy: find a flavor image anywhere inside a longer string (e.g. a SKU title)
  function flavorImgAny(text) { const t = String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); const keys = Object.keys(FLAVOR_IMG).sort((a, b) => b.length - a.length); for (const k of keys) { if (t.indexOf(k) >= 0) return FLAVOR_IMG[k]; } return ""; }
  // Flavor-name cell with an optional small bag thumbnail
  function flavCell(name, img, small) { const cls = small ? "flavimg sm" : "flavimg"; return '<div class="flavcell">' + (img ? '<img class="' + cls + '" src="' + img + '" loading="lazy" alt="">' : '') + '<b>' + esc(name) + '</b></div>'; }
  function trackingUrl(carrier, num) {
    if (!num) return "";
    const n = encodeURIComponent(String(num).trim());
    switch ((carrier || "").toUpperCase()) {
      case "UPS": return "https://www.ups.com/track?tracknum=" + n;
      case "FEDEX": return "https://www.fedex.com/fedextrack/?trknbr=" + n;
      case "USPS": return "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + n;
      case "DHL": return "https://www.dhl.com/us-en/home/tracking.html?tracking-id=" + n;
      default: return "";
    }
  }
  // ---- Stock Build goals (from Jesus's "Stock Build Goals.xlsx"; on-hand entered live in-app) ----
  // cat | sub(Others only) | name | goal | unit | pallet size (for full-pallet calc) | bagsPer (Walmart)
  const SB_ITEMS = [
    { cat:"Target", name:"OG Original", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Cinnamon Churro", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Backyard BBQ", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Garlic Parmesan", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Dill Pickle", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Cheddar Jalapeno", goal:160, unit:"cases", pallet:32 },
    { cat:"Target", name:"Ranch", goal:160, unit:"cases", pallet:32 },
    { cat:"Walmart", name:"Cinnamon Churro", goal:165, unit:"boxes", pallet:165, bagsPer:12 },
    { cat:"Walmart", name:"Backyard BBQ", goal:165, unit:"boxes", pallet:165, bagsPer:12 },
    { cat:"Walmart", name:"Garlic Parmesan", goal:165, unit:"boxes", pallet:165, bagsPer:12 },
    { cat:"Walmart", name:"Cheddar Jalapeno", goal:165, unit:"boxes", pallet:165, bagsPer:12 },
    { cat:"Master Case", name:"Garlic Parmesan", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"OG Original", goal:180, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Cracked Pepper", goal:150, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Dill Pickle", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Cinnamon Churro", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Backyard BBQ", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Cheddar Jalapeno", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Ranch", goal:480, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Sour Cream & Onion", goal:150, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Maple Brown Sugar", goal:150, unit:"cases", pallet:30 },
    { cat:"Master Case", name:"Lemon Pepper", goal:150, unit:"cases", pallet:30 },
    { cat:"Others", sub:"Retail", name:"4VAR Display (48 bags, 4oz)", goal:44, unit:"units" },
    { cat:"Others", sub:"Retail", name:"VP-54 Bucket (54 bags, 1.5oz)", goal:120, unit:"units" },
    { cat:"Others", sub:"E-Com", name:"VP-12 Variety Pack (12 bags, 4oz)", goal:400, unit:"units" },
    { cat:"Others", sub:"E-Com", name:"VP-36 Variety Pack (36 bags, 1.5oz)", goal:400, unit:"units" },
    { cat:"Others", sub:"12-Pack Boxes", name:"All 12-packs", goal:800, unit:"boxes" }
  ].map(x => Object.assign(x, { key: (x.cat + "|" + (x.sub || "") + "|" + x.name).replace(/[^A-Za-z0-9]+/g, "_") }));
  const SB_CATS = ["Target", "Walmart", "Master Case", "Others"];
  // ---- People directory (LIVE roster pulled from Gusto 2026-07-10; non-sensitive only, NO pay) ----
  // name | job title | department | manager. Manager links drive the org chart.
  const PEOPLE = [
    ["Brian Waddick","CEO","Executive",""],
    ["Cole Schaefer","CEO","Executive","Brian Waddick"],
    ["Matt Bollinger","VP of Operations","Operations Management","Cole Schaefer"],
    ["Allen Back","Manufacturing Manager","Operations Management","Matt Bollinger"],
    ["Troy Dircks","Fulfillment Manager","Operations Management","Matt Bollinger"],
    ["Josh Laughlin","VP of Sales","Sales","Brian Waddick"],
    ["Max DeWolf","VP of Marketing","Marketing","Cole Schaefer"],
    ["Amanda Wright","Director of HR","Executive","Cole Schaefer"],
    ["Michelle Nydegger","Human Resource Manager","Human Resources","Amanda Wright"],
    ["Brittney Christensen","QA Manager","Quality","Matt Bollinger"],
    ["Lizeth Toloza","Quality Control Lead","Quality","Brittney Christensen"],
    ["Natalie Acuna","QA Tech","Quality","Brittney Christensen"],
    ["Ken Tschanz","Shipping Manager","Shipping","Troy Dircks"],
    ["Jesus Arias","Fulfillment Supervisor","Fulfillment","Troy Dircks"],
    ["Lenny Hernandez Criado","Fulfillment Lead","Fulfillment","Troy Dircks"],
    ["Jhonny Oviedo","Fulfillment Lead","Fulfillment","Troy Dircks"],
    ["Adri De Camargo","Inventory Specialist","Operations","Troy Dircks"],
    ["Edgar Marquina","Forklift Operator","Operations","Troy Dircks"],
    ["Alejandra Crispin","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Bris Morales","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Britney Herrera","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Dayana Ojeda","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Desiree Moran","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Erika Bolivar Zambrano","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Genry Colmenares","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Lady Juarez","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Marelis Castillo","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Margarita Jaimes","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Mariely Vega","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Maritza Pedraza","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Marlyn Castillo","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Nicholas Matson","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Saide Rojas","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Viviana Zambrano","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Wuilman Mora","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Yarianny Fonseca","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Yenni Lopez de Pena","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Yoiner Pena","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Zuleika Tirado","Fulfillment Associate","Fulfillment","Troy Dircks"],
    ["Leo Ontiveros","Manufacturing Supervisor","Mixing","Allen Back"],
    ["Wilson Delgado","Manufacturing Supervisor","Manufacturing","Allen Back"],
    ["Daniel Henshaw","Contracted Maintenance Technician","Manufacturing","Allen Back"],
    ["Antony Garcia","Mixing Operator","Mixing","Allen Back"],
    ["Darwin Zambrano","Mixing Operator","Mixing","Allen Back"],
    ["David Burgett","Mixing Operator","Mixing","Allen Back"],
    ["Esmar Sandrea-Nunez","Mixing Operator","Mixing","Allen Back"],
    ["Jeison Rangel","Mixing Operator","Mixing","Allen Back"],
    ["Luis Herrera","Mixing Operator","Mixing","Allen Back"],
    ["Wesley Hallett","Mixing Operator","Mixing","Allen Back"],
    ["Gladys Delgado Cuenca","Dish Washer","Mixing","Allen Back"],
    ["Melvin Gonzalez","Dish Washer","Mixing","Allen Back"],
    ["Oscar Roa","Packaging Lead","Packaging","Allen Back"],
    ["Alfredo Rodriguez Sequera","Packaging Operator","Packaging","Allen Back"],
    ["Emerson Estupinan","Packaging Operator","Packaging","Allen Back"],
    ["Franklin Omana Maldonado","Packaging Operator","Packaging","Allen Back"],
    ["Jhonattan Barragan Jaimes","Packaging Operator","Packaging","Allen Back"],
    ["Johnni Puertas","Packaging Operator","Packaging","Allen Back"],
    ["Leonel Marquez-Dimas","Packaging Operator","Packaging","Allen Back"],
    ["Luvencio Rondon Sanchez","Packaging Operator","Packaging","Allen Back"],
    ["Pedro Chacin Angarita","Packaging Operator","Packaging","Allen Back"],
    ["Brandon Androes","Maintenance Technician","Technician","Matt Bollinger"],
    ["Brandon Coronado","Maintenance Technician Apprentice","Technician","Matt Bollinger"],
    ["Dallas Martinez","Technician","Technician","Matt Bollinger"],
    ["Todd Herre","Maintenance Technician","Technician","Matt Bollinger"],
    ["Gloria Perez","Cleaner","Operations","Matt Bollinger"],
    ["Alex Wonderlic","Director of Sales - Grocery","Sales","Josh Laughlin"],
    ["Allie Gale","Director of Sales - Convenience","Sales","Josh Laughlin"],
    ["Alex Case","Marketplace Manager","Marketing","Max DeWolf"],
    ["Ben Trusiak","Director of Partnerships","Marketing","Max DeWolf"],
    ["Eli Johnson","Director of E-Commerce","Marketing","Max DeWolf"],
    ["Marc Anderson","Director of Creative","Marketing","Max DeWolf"],
    ["Ryan Moede","Art Director - Digital","Marketing","Marc Anderson"],
    ["Eric Williams","TikTok Content Creator","Marketing","Max DeWolf"],
    ["Isaac Heilman","TikTok Content Creator","Marketing","Max DeWolf"],
    ["Olivia King","Live Streamer","Marketing","Max DeWolf"],
    ["Megan Matthai","Marketing","Marketing","Max DeWolf"],
    ["Peter Albertson","Marketing","Marketing","Max DeWolf"],
    ["Rajil Wasif","Marketing","Marketing","Max DeWolf"],
    ["Brian Lepro","Independent Contractor","Contractor",""]
  ].map(a => ({ n:a[0], r:a[1], d:a[2], m:a[3] }));
  // ---- left sidebar: tabs grouped by department (NetSuite-style) ----
  const NAV_GROUPS = [
    { key:"", items:["home","alerts"] },
    { key:"grpReceiving", items:["receive","recvlog","returns","qa"] },
    { key:"grpInventory", items:["dash","adjust","count","move","locations","finbags","seasoning","seed","skus","labels"] },
    { key:"grpProduction", items:["produce","retailprod","ecomprod","stockbuild","orders","orderdocs"] },
    { key:"grpShipping", items:["shiplog"] },
    { key:"grpMixing", items:["mixing"] },
    { key:"grpPmac", items:["pmac","pmacout"] },
    { key:"grpPurchasing", items:["purchasing","supplierpos"] },
    { key:"grpRnd", items:["rd"] },
    { key:"grpHr", items:["people"] },
    { key:"grpImprove", items:["improve"] },
    { key:"grpSystem", items:["log","settings"] }
  ];
  // Lucide icon names (clean SVG line icons) rendered via lucide.createIcons()
  const NAV_ICON = {
    home:"home", dash:"layout-dashboard", alerts:"bell", adjust:"sliders-horizontal",
    receive:"package-plus", recvlog:"clipboard-list", putaway:"package-check", returns:"rotate-ccw",
    orders:"receipt", orderdocs:"folder", shiplog:"truck", rd:"flask-conical", qa:"shield-alert",
    move:"arrow-left-right", produce:"factory", retailprod:"package", ecomprod:"laptop", stockbuild:"layers",
    seasoning:"flame", seed:"sprout", skus:"barcode", finbags:"shopping-bag", pmacout:"package-open",
    mixing:"cooking-pot", pmac:"wrench", count:"clipboard-check", locations:"map-pin",
    purchasing:"shopping-cart", supplierpos:"file-text", people:"users", labels:"tag",
    log:"history", settings:"settings", improve:"trending-up" };
  function drawIcons() { try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {} }
  let spoFile = null, spoParsed = null;  // supplier-PO upload state
  let spoSort = { key: "created", dir: -1 };  // Supplier POs table sort (v25)
  let spoView = "list";   // Supplier POs: "list" | "create" (Excel-style PO entry form)
  let poRows = 4;         // number of line-item rows shown in the Create-PO form
  const PO_PREPARERS = ["Michelle", "Matt", "Troy"];
  function spoSortList(list) {
    const k = spoSort.key, dir = spoSort.dir;
    const val = s => {
      if (k === "total") return parseFloat(String(s.total || "").replace(/[^0-9.\-]/g, "")) || 0;
      if (k === "item_count") return Number(s.item_count) || 0;
      if (k === "po_date") return Date.parse(s.po_date) || 0;
      if (k === "created") return String(s.created_at || "");
      return (s[k] || "").toString().toLowerCase();
    };
    return list.slice().sort((a, b) => { const va = val(a), vb = val(b); return va < vb ? -dir : va > vb ? dir : 0; });
  }
  function spoArrow(k) { return spoSort.key === k ? (spoSort.dir > 0 ? " ▲" : " ▼") : ""; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function money(v) { if (v == null || v === "") return ""; const n = parseFloat(String(v).replace(/[$,\s]/g, "")); if (isNaN(n)) return String(v); return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ---- persisted UI prefs (role + dashboard columns) ----
  const PREFS_KEY = "smackin_ui_prefs_v1";
  const ALL_COLS = ["category","item","onhand","reorder","status"];
  const COL_LBL = { category:"colCategory", item:"colItem", onhand:"colOnhand", reorder:"colReorder", status:"colStatus" };
  let prefs = { role:"all", colOrder: ALL_COLS.slice(), colHidden: [], sortKey:"", sortDir:1 };
  (function loadPrefs(){ try { const p = JSON.parse(localStorage.getItem(PREFS_KEY)); if (p) {
    prefs.role = p.role || "all";
    prefs.colOrder = (Array.isArray(p.colOrder) && p.colOrder.length ? p.colOrder : ALL_COLS.slice()).filter(c => ALL_COLS.indexOf(c) >= 0);
    ALL_COLS.forEach(c => { if (prefs.colOrder.indexOf(c) < 0) prefs.colOrder.push(c); });
    prefs.colHidden = Array.isArray(p.colHidden) ? p.colHidden : [];
    prefs.sortKey = p.sortKey || ""; prefs.sortDir = p.sortDir || 1;
  } } catch (e) {} })();
  function savePrefs(){ try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }
  function visibleTabs(){ return ROLE_TABS[prefs.role] || TABS; }
  let colPanel = false; // dashboard column editor open?
  let dragCol = null;
  let orderView = "open"; // orders: "open" | "complete"
  let orderAddOpen = false;
  let peopleView = "dir"; // People: "dir" | "org"
  let locView = "map";    // Locations: "floor" | "map" | "list" (rack grid is default; floor plan optional)
  let puSec = "", puBay = "", puLevel = "";  // Put-Away location picker state (Section/Bay/Level)
  let rpSel = "";                             // Retail Production: selected product key
  let rpRecent = [];                          // Retail Production: recent adds this session
  let shipSortKey = "ship_date", shipSortDir = -1;  // Shipping Log sort state
  let shipSearch = "";                        // Shipping Log filter text
  let recvSortKey = "recv_date", recvSortDir = -1;  // Receiving Log sort state
  let recvFile = null;                        // Receiving Log paperwork upload state
  let shipEditId = null, recvEditId = null, orderEditId = null, seasEditId = null, seedEditId = null;  // inline-edit: id of record being edited
  let pmoSel = "", pmoRecent = [];   // P-Mac bag-output: selected bag item + recent adds this session
  let navCollapsed = (function () { try { return new Set(JSON.parse(localStorage.getItem("smk-navcollapsed") || "[]")); } catch (e) { return new Set(); } })();  // collapsed nav groups
  let ciView = "active", ciAddOpen = false, ciEditId = null;  // Continuous Improvement view/edit state
  const CI_TYPES = ["5S", "Kaizen", "Safety", "Quality", "Efficiency", "Cost Savings", "Waste Reduction", "Other"];
  const CI_AREAS = ["Fulfillment", "Receiving", "Shipping", "Inventory", "Mixing", "P-Mac", "Warehouse", "Office", "Company-wide", "Other"];
  const CI_OWNERS = ["Troy", "Adriana", "Jesus", "Ken", "Javier", "Allen", "Brittney", "Marlin", "Jhonny", "Other"];
  const CI_PRIORITIES = ["High", "Medium", "Low"];
  const CI_STATUSES = ["Idea", "In Progress", "On Hold", "Done"];
  const BAG_STAGE = "PACKOUT";       // finished bags stage here when they come off P-Mac
  let locSel = null;      // selected slot/zone code in the rack map
  // Physically blocked rack slots (numbering unchanged; not storable) - Troy's real floor
  const BLOCKED_SLOTS = new Set(["A-23-L1","B-15-L4","B-16-L4","B-17-L4","B-21-L4","B-22-L4","C-21-L4","C-22-L4","D-17-L4","D-18-L4","D-23-L4","D-24-L4"]);
  let odocFile = null; // order-doc upload state
  let rdView = "pending"; // R&D: "pending" | "received"
  let rdAddOpen = false;
  // ---- new-order counter (badge on the Orders tab, per-device) ----
  const ORDERS_SEEN_KEY = "smackin_orders_seen_v1";
  let ordersSeen = (function(){ try { return localStorage.getItem(ORDERS_SEEN_KEY) || ""; } catch(e){ return ""; } })();
  function markOrdersSeen(){ ordersSeen = new Date().toISOString(); try { localStorage.setItem(ORDERS_SEEN_KEY, ordersSeen); } catch(e){} }
  function newOrdersCount(){ return DB.orders().filter(o => (o.created_at || "") > ordersSeen && (o.status || "Open") !== "Complete").length; }
  const CATS = ["all","bag4","bag15","film4","film15","seasoning","seed","bucket","packaging","display","mastercase"];
  const CATLBL = { all:"All", bag4:"Bags 4oz", bag15:"Bags 1.5oz", film4:"Film 4oz", film15:"Film 1.5oz",
    seasoning:"Seasoning", seed:"Seed/Base", bucket:"Buckets", packaging:"Packaging", display:"Displays", mastercase:"Sleeves" };

  const $ = id => document.getElementById(id);
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString();
  const selOpts = (arr, sel) => (arr || []).map(o => '<option' + (o === sel ? ' selected' : '') + '>' + o + '</option>').join("");
  function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1700); }
  function statusOf(it) { const oh = DB.onHand(it.id); if (oh <= 0) return "out"; if (oh < it.reorder) return "low"; return "ok"; }
  // ---- alerts helpers ----
  const EXPIRY_WARN_DAYS = 30;
  function daysUntil(dstr) { if (!dstr) return null; const d = new Date(String(dstr).slice(0, 10) + "T00:00:00"); if (isNaN(d.getTime())) return null; const t = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00"); return Math.round((d - t) / 86400000); }
  function expiringLots() { return DB.seasLots().filter(l => { const du = daysUntil(l.exp); return (l.status || "Good") !== "Quarantine" && du !== null && du <= EXPIRY_WARN_DAYS; }); }
  function alertCount() { return DB.items().filter(i => i.reorder > 0 && DB.onHand(i.id) < i.reorder).length + expiringLots().length; }
  function validLoc(code) { code = (code || "").trim().toUpperCase();
    return DB.allLocations().indexOf(code) >= 0 || /^[A-E]-\d{2}-L[1-4]$/.test(code); }

  function setLang(l) { lang = l; ["en","es","pt"].forEach(x => { const b = $("lang-" + x); if (b) b.classList.toggle("active", l === x); }); render(); }
  function go(t) { active = t; if (t !== "purchasing") { purchMode = "list"; receivingPOid = null; } if (t === "orders") markOrdersSeen(); closeDrawer(); render(); }
  function opVal() { const e = $("op"); return e ? e.value : "Troy"; }

  // ---------- edit lock (PIN) — viewing is open, changes require the PIN ----------
  const EDIT_PIN = "2210";
  let unlocked = (function(){ try { return sessionStorage.getItem("smk_unlocked") === "1"; } catch (e) { return false; } })();
  function lockEdits() { unlocked = false; try { sessionStorage.removeItem("smk_unlocked"); } catch (e) {} toast(L("locked")); render(); }
  function pinPrompt() {
    return new Promise(res => {
      let m = document.getElementById("pinModal");
      if (!m) { m = document.createElement("div"); m.id = "pinModal"; m.className = "cammodal"; document.body.appendChild(m); }
      m.innerHTML = '<div class="cambox pinbox"><h3>' + L("pinTitle") + '</h3><p class="hint">' + L("pinHint") + '</p>' +
        '<input id="pinIn" type="password" inputmode="numeric" autocomplete="off" placeholder="&#8226;&#8226;&#8226;&#8226;">' +
        '<div class="poactions"><button class="primary sm" id="pinOk">' + L("pinBtn") + '</button>' +
        '<button class="ghost sm" id="pinCancel">' + L("backList") + '</button></div></div>';
      m.style.display = "flex";
      const inp = document.getElementById("pinIn"); setTimeout(() => inp.focus(), 30);
      const done = v => { m.style.display = "none"; res(v); };
      document.getElementById("pinOk").onclick = () => done(inp.value.trim());
      document.getElementById("pinCancel").onclick = () => done(null);
      inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); done(inp.value.trim()); } if (e.key === "Escape") done(null); };
    });
  }
  async function ensureUnlocked() {
    if (unlocked) return true;
    const v = await pinPrompt();
    if (v === null) return false;
    if (v === EDIT_PIN) { unlocked = true; try { sessionStorage.setItem("smk_unlocked", "1"); } catch (e) {} toast(L("unlocked")); render(); return true; }
    toast(L("pinWrong")); return false;
  }

  // ---------- shared field builders ----------
  function opField(def) {
    return '<label>' + L("operator") + '</label><select id="op">' +
      ["Jesus","Adriana","Marlin","Edgar","Troy"].map(n => '<option' + (n === def ? ' selected' : '') + '>' + n + "</option>").join("") + "</select>";
  }
  // Reusable tap-or-scan location picker (Section/Bay/Level chips + scan field + zone chips).
  // Writes the composed code into the field with id=fid. Shared by Receive + Put-Away.
  function locPickerBlock(fid) {
    const cfg = DB.config || { sections: ["A","B","C","D"], baysPerSection: 28, levels: ["L1","L2","L3","L4"],
      zones: ["RECEIVING","ST-01","ST-02","ST-03","ST-04","ST-05","ST-06","ST-07","ST-08","WIP","PACKOUT","CAGE","QUARANTINE"], docks: [] };
    const secChip = s => '<button class="pchip' + (puSec === s ? " on" : "") + '" data-k="sec" data-v="' + s + '" onclick="UI.puPick(\'sec\',\'' + s + '\')">' + s + '</button>';
    const lvlChip = l => '<button class="pchip' + (puLevel === l ? " on" : "") + '" data-k="lvl" data-v="' + l + '" onclick="UI.puPick(\'lvl\',\'' + l + '\')">' + l + '</button>';
    let bayChips = "";
    for (let b = 1; b <= (cfg.baysPerSection || 28); b++) { const bb = String(b).padStart(2, "0");
      bayChips += '<button class="pchip bay' + (puBay === bb ? " on" : "") + '" data-k="bay" data-v="' + bb + '" onclick="UI.puPick(\'bay\',\'' + bb + '\')">' + bb + '</button>'; }
    const zones = (cfg.zones || []).concat((cfg.docks || []).map(d => "DOCK-" + d));
    const zoneChips = zones.map(z => '<button class="pchip zone" onclick="UI.puZone(\'' + z + '\')">' + esc(z) + '</button>').join("");
    const preview = (puSec && puBay && puLevel) ? (puSec + "-" + puBay + "-" + puLevel) : "—";
    return '<div class="pudest"><label>' + L("puDest") + '</label>' +
      '<div class="scanrow"><input id="' + fid + '" list="dl-locs" autocomplete="off" value="' + esc(preview === "—" ? "" : preview) + '" placeholder="' + L("puScanLoc") + '" oninput="UI.puSync()">' +
      '<button type="button" class="cambtn" onclick="UI.cam(\'' + fid + '\')">' + L("camera") + '</button></div>' +
      '<div class="pupreview">&#8594; <b id="pu-code">' + preview + '</b> <span id="pu-warn" class="sm" style="color:var(--red);font-weight:700"></span></div>' +
      '<div class="pgrp"><span class="plab">' + L("puSection") + '</span><div class="pchips">' + cfg.sections.map(secChip).join("") + '</div></div>' +
      '<div class="pgrp"><span class="plab">' + L("puBay") + '</span><div class="pchips baywrap">' + bayChips + '</div></div>' +
      '<div class="pgrp"><span class="plab">' + L("puLevel") + '</span><div class="pchips">' + (cfg.levels || ["L1","L2","L3","L4"]).map(lvlChip).join("") + '</div></div>' +
      '<div class="pgrp"><span class="plab">' + L("puZones") + '</span><div class="pchips">' + zoneChips + '</div></div></div>';
  }
  function itemScan(id, nextId) {
    return '<div class="scan"><label>' + L("scanItem") + '</label>' +
      '<div class="scanrow"><input id="' + id + '" list="dl-items" autocomplete="off" autofocus ' +
      'placeholder="B4-S01 / SEED-WHITE / 850047865199" ' +
      'oninput="UI.lookup(\'' + id + '\',\'' + id + '-f\')" ' +
      'onkeydown="if(event.key===\'Enter\'){event.preventDefault();var n=document.getElementById(\'' + (nextId||"") + '\');if(n)n.focus();}">' +
      '<button type="button" class="cambtn" onclick="UI.cam(\'' + id + '\')">' + L("camera") + '</button></div>' +
      '<div id="' + id + '-f"></div></div>';
  }
  function locInput(id, labelKey) {
    return '<label>' + L(labelKey) + '</label><div class="scanrow">' +
      '<input id="' + id + '" list="dl-locs" autocomplete="off" placeholder="A-05-L3 / ST-02 / DOCK-12">' +
      '<button type="button" class="cambtn" onclick="UI.cam(\'' + id + '\')">' + L("camera") + '</button></div>';
  }

  // ---------- views ----------
  // dashboard column definitions: header (with alignment) + cell renderer + sort value
  const COL_DEF = {
    category: { th: () => '<th data-sort="category">' + L("colCategory") + '</th>',
      td: i => '<td><span class="tag">' + (CATLBL[i.category] || i.category) + '</span></td>',
      val: i => (CATLBL[i.category] || i.category) },
    item: { th: () => '<th data-sort="item">' + L("colItem") + '</th>',
      td: i => '<td><b>' + i.name + '</b><div class="muted sm">' + i.code + '</div></td>',
      val: i => i.name.toLowerCase() },
    onhand: { th: () => '<th class="right" data-sort="onhand">' + L("colOnhand") + '</th>',
      td: i => '<td class="right"><b>' + fmt(DB.onHand(i.id)) + '</b> ' + i.unit + '</td>',
      val: i => DB.onHand(i.id) },
    reorder: { th: () => '<th class="right" data-sort="reorder">' + L("colReorder") + '</th>',
      td: i => '<td class="right muted">' + fmt(i.reorder) + '</td>', val: i => i.reorder },
    status: { th: () => '<th data-sort="status">' + L("colStatus") + '</th>',
      td: i => { const st = statusOf(i); return '<td><span class="pill ' + st + '">' + (st === "out" ? "OUT" : st === "low" ? "LOW" : "OK") + '</span></td>'; },
      val: i => { const st = statusOf(i); return st === "out" ? 0 : st === "low" ? 1 : 2; } }
  };
  function shownCols() { return prefs.colOrder.filter(c => prefs.colHidden.indexOf(c) < 0); }
  function colControls() {
    if (!colPanel) return '<div class="colctl"><button class="ghost sm" onclick="UI.colPanel()">&#9776; ' + L("columns") + '</button></div>';
    const chips = prefs.colOrder.map(c =>
      '<div class="colchip' + (prefs.colHidden.indexOf(c) < 0 ? " on" : "") + '" draggable="true" ' +
      'ondragstart="UI.colDrag(\'' + c + '\')" ondragover="event.preventDefault()" ondrop="UI.colDrop(\'' + c + '\')">' +
      '<span class="grip">&#8942;&#8942;</span>' +
      '<label class="coltog"><input type="checkbox" ' + (prefs.colHidden.indexOf(c) < 0 ? "checked" : "") + ' onchange="UI.colToggle(\'' + c + '\')"> ' + L(COL_LBL[c]) + '</label></div>').join("");
    return '<div class="colctl open"><div class="colctlhead"><b>' + L("columns") + '</b>' +
      '<span><button class="ghost sm" onclick="UI.colReset()">' + L("resetCols") + '</button>' +
      '<button class="ghost sm" onclick="UI.colPanel()">&#10005;</button></span></div>' +
      '<div class="colchips">' + chips + '</div><p class="footnote">Drag to reorder &middot; check to show.</p></div>';
  }
  function viewHome() {
    const items = DB.items();
    const out = items.filter(i => i.reorder > 0 && DB.onHand(i.id) <= 0);
    const low = items.filter(i => i.reorder > 0 && DB.onHand(i.id) > 0 && DB.onHand(i.id) < i.reorder);
    const lots = expiringLots().slice().sort((a, b) => daysUntil(a.exp) - daysUntil(b.exp));
    const expiredLots = lots.filter(l => daysUntil(l.exp) < 0);
    const orders = DB.orders();
    const openO = orders.filter(o => !orderIsComplete(o));
    const issues = orders.filter(o => !orderIsComplete(o) && orderIssue(o));
    const rdPend = DB.rdRequests().filter(r => !rdIsReceived(r));
    const rdOver = rdPend.filter(r => rdIsOverdue(r));
    const bag4 = items.filter(i => i.category === "bag4").reduce((s, i) => s + DB.onHand(i.id), 0);
    const bag15 = items.filter(i => i.category === "bag15").reduce((s, i) => s + DB.onHand(i.id), 0);
    const tile = (n, label, tab, alert) => '<div class="htile' + (alert ? " alert" : "") + '" onclick="UI_go(\'' + tab + '\')"><div class="n">' + n + '</div><div class="l">' + label + '</div></div>';
    const tiles =
      tile(out.length, L("hOut"), "alerts", out.length > 0) +
      tile(low.length, L("hLow"), "alerts", false) +
      tile(lots.length, L("hExp"), "alerts", expiredLots.length > 0) +
      tile(openO.length, L("hOpen"), "orders", false) +
      tile(issues.length, L("hIssues"), "orders", issues.length > 0) +
      tile(rdPend.length, L("hRd"), "rd", rdOver.length > 0);
    const rows = [];
    out.slice(0, 6).forEach(i => rows.push('<tr class="o-issue"><td><span class="pill out">' + L("alOut") + '</span></td><td><b>' + i.name + '</b><div class="muted sm">' + i.code + '</div></td><td class="right"><b>0</b> ' + i.unit + '</td><td class="muted sm">' + L("alSuggest") + ' ' + fmt(suggestQty(i)) + '</td></tr>'));
    issues.slice(0, 6).forEach(o => rows.push('<tr class="o-issue"><td><span class="pill out">' + L("oLegIssue") + '</span></td><td><b>' + (o.customer || "") + '</b><div class="muted sm">' + (o.customer_po || "") + '</div></td><td class="sm">' + (o.ship_date || "") + '</td><td class="muted sm">' + (o.notes || "") + '</td></tr>'));
    expiredLots.slice(0, 6).forEach(l => rows.push('<tr class="o-issue"><td><span class="pill out">' + L("expiredTag") + '</span></td><td><b>' + (l.product || l.flavor_code) + '</b><div class="muted sm">' + (l.lot || "") + '</div></td><td class="sm">' + (l.exp || "").slice(0, 10) + '</td><td class="muted sm">' + Math.abs(daysUntil(l.exp)) + ' ' + L("alDays") + ' ' + L("alExpired") + '</td></tr>'));
    rdOver.slice(0, 6).forEach(r => rows.push('<tr class="o-ip"><td><span class="pill low">' + L("rdOverdue") + '</span></td><td><b>' + (r.company || "") + '</b><div class="muted sm">' + (r.items || "") + '</div></td><td class="sm">' + ((r.needed_by || "").slice(0, 10)) + '</td><td class="muted sm">' + (r.requested_by || "") + '</td></tr>'));
    const attention = rows.length
      ? '<div class="card"><h2 class="sub2">' + L("hAttention") + '</h2><table><tbody>' + rows.join("") + '</tbody></table></div>'
      : '<div class="card"><p class="ok pill big">&#127807; ' + L("hAllClear") + '</p></div>';
    // ---- Essential items: per-flavor stock health (finished bags, film, seasoning) ----
    const bc = code => DB.itemByCode(code);
    const flav = items.filter(i => i.category === "bag4" && /^B4-S\d/.test(i.code))
      .map(i => ({ code: i.code.replace("B4-", ""), name: i.flavor }))
      .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    const ec = it => { if (!it) return '<td class="right ess-na">&mdash;</td>';
      const st = statusOf(it); return '<td class="right ess-' + st + '"><b>' + fmt(DB.onHand(it.id)) + '</b></td>'; };
    const frows = flav.map(f =>
      '<tr><td>' + flavCell(f.name, flavorImg(f.name), true) + '</td>' +
      ec(bc("B4-" + f.code)) + ec(bc("B15-" + f.code)) + ec(bc("F4-" + f.code)) + ec(bc("SEAS-" + f.code)) + '</tr>').join("");
    const essTable = '<div class="card"><div class="suprow"><h2 class="sub2" style="margin:0;flex:1">' + L("hEssential") + '</h2>' +
      '<a class="order sm" onclick="UI_go(\'dash\')" style="cursor:pointer">' + L("hSeeAll") + '</a></div>' +
      '<div class="esslegend"><span class="ess-key ok">' + L("hCovered") + '</span><span class="ess-key low">' + L("hLowShort") + '</span><span class="ess-key out">' + L("hOutShort") + '</span></div>' +
      '<div class="tblwrap"><table class="esstable"><thead><tr><th>' + L("hFlavor") + '</th><th class="right">' + L("bag4") + '</th><th class="right">' + L("bag15") + '</th><th class="right">' + L("essFilm") + '</th><th class="right">' + L("seasoning") + '</th></tr></thead><tbody>' + frows + '</tbody></table></div></div>';
    // ---- Base materials strip (raw seed / malto / oil / stevia gate all production) ----
    const baseTiles = ["SEED-WHITE", "SEED-BROWN", "MALTO", "OIL", "STEVIA"].map(c => {
      const it = bc(c); if (!it) return ""; const st = statusOf(it);
      return '<div class="btile ess-' + st + '"><div class="n">' + fmt(DB.onHand(it.id)) + '<span class="u"> ' + it.unit + '</span></div><div class="l">' + esc(it.name.split(" - ")[0].split(" (")[0]) + '</div></div>';
    }).join("");
    const snapshot = '<div class="card"><div class="suprow"><h2 class="sub2" style="margin:0;flex:1">' + L("hSnapshot") + '</h2><a class="order sm" onclick="UI_go(\'dash\')" style="cursor:pointer">' + L("hSeeAll") + '</a></div>' +
      '<div class="kpis" style="margin-top:10px"><div class="kpi"><div class="n">' + items.length + '</div><div class="l">' + L("totalItems") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(bag4) + '</div><div class="l">' + L("bag4") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(bag15) + '</div><div class="l">' + L("bag15") + '</div></div></div>' +
      '<h2 class="sub2" style="margin:16px 0 8px">' + L("hBase") + '</h2><div class="btiles">' + baseTiles + '</div></div>';
    return '<div class="card"><h2>' + L("homeTitle") + '</h2><p class="hint">' + L("homeHint") + '</p><div class="htiles">' + tiles + '</div></div>' + attention + essTable + snapshot;
  }
  function viewDash() {
    let its = DB.items().filter(i => catFilter === "all" || i.category === catFilter);
    const cols = shownCols();
    if (prefs.sortKey && COL_DEF[prefs.sortKey]) {
      const vf = COL_DEF[prefs.sortKey].val;
      its = its.slice().sort((a, b) => { const x = vf(a), y = vf(b); return (x < y ? -1 : x > y ? 1 : 0) * prefs.sortDir; });
    }
    const bag4 = DB.items().filter(i => i.category === "bag4").reduce((s, i) => s + DB.onHand(i.id), 0);
    const bag15 = DB.items().filter(i => i.category === "bag15").reduce((s, i) => s + DB.onHand(i.id), 0);
    const low = DB.items().filter(i => statusOf(i) !== "ok").length;
    const sbOh = DB.stockBuild ? DB.stockBuild() : {};
    const sbGoal = SB_ITEMS.reduce((s, i) => s + i.goal, 0);
    const sbOn = SB_ITEMS.reduce((s, i) => s + (Number((sbOh[i.key] || {}).on_hand) || 0), 0);
    const sbPct = sbGoal ? Math.round(sbOn / sbGoal * 100) : 0;
    const sbToBuild = Math.max(sbGoal - sbOn, 0);
    const head = cols.map(c => {
      let th = COL_DEF[c].th();
      if (prefs.sortKey === c) th = th.replace("</th>", ' <span class="sortar">' + (prefs.sortDir > 0 ? "&#9650;" : "&#9660;") + "</span></th>");
      return th.replace("<th", '<th onclick="UI.sort(\'' + c + '\')" style="cursor:pointer"');
    }).join("");
    const rows = its.map(i => '<tr>' + cols.map(c => COL_DEF[c].td(i)).join("") + '</tr>').join("");
    const cbar = CATS.map(c => '<button class="' + (c === catFilter ? "active" : "") + '" onclick="UI.cat(\'' + c + '\')">' + (CATLBL[c] || c) + "</button>").join("");
    return '<div class="card"><h2>' + L("dash") + '</h2><p class="hint">' + L("dashHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + DB.items().length + '</div><div class="l">' + L("totalItems") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(bag4) + '</div><div class="l">' + L("bag4") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(bag15) + '</div><div class="l">' + L("bag15") + '</div></div>' +
      '<div class="kpi ' + (low ? "alert" : "") + '"><div class="n">' + low + '</div><div class="l">' + L("lowItems") + '</div></div>' +
      '<div class="kpi" style="cursor:pointer" onclick="UI_go(\'stockbuild\')"><div class="n">' + sbPct + '%</div><div class="l">' + L("stockbuild") + ' &#8250;</div><div class="muted sm">' + fmt(sbToBuild) + ' ' + L("sbToBuild") + '</div></div></div>' +
      '<div class="catbar">' + cbar + '</div>' + colControls() +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function viewAlerts() {
    const out = DB.items().filter(i => i.reorder > 0 && DB.onHand(i.id) <= 0);
    const low = DB.items().filter(i => i.reorder > 0 && DB.onHand(i.id) > 0 && DB.onHand(i.id) < i.reorder);
    const lots = expiringLots().slice().sort((a, b) => (daysUntil(a.exp) - daysUntil(b.exp)));
    const stockRow = i => {
      const oh = DB.onHand(i.id); const sup = DB.suppliers().find(s => s.id === i.supplier);
      const supCell = sup ? (sup.order_url && sup.order_url !== "#" ? '<a class="order sm" href="' + sup.order_url + '" target="_blank" rel="noopener">' + sup.name + ' &#8599;</a>' : sup.name) : (i.supplier || "&mdash;");
      const draft = i.supplier ? ' <button class="ghost sm" onclick="UI.poNew(\'' + i.supplier + '\')">' + L("alDraftPO") + '</button>' : "";
      return '<tr><td><b>' + i.name + '</b><div class="muted sm">' + i.code + '</div></td>' +
        '<td class="right"><b>' + fmt(oh) + '</b> ' + i.unit + '</td><td class="right muted">' + fmt(i.reorder) + '</td>' +
        '<td class="right"><b>' + fmt(suggestQty(i)) + '</b> ' + i.unit + '</td><td>' + supCell + draft + '</td></tr>';
    };
    const stockTable = arr => '<table class="sortable"><thead><tr><th>' + L("item") + '</th><th class="right">' + L("alOnhand") + '</th><th class="right">' + L("alReorder") +
      '</th><th class="right">' + L("alSuggest") + '</th><th>' + L("alSupplier") + '</th></tr></thead><tbody>' + arr.map(stockRow).join("") + '</tbody></table>';
    const lotRow = l => {
      const du = daysUntil(l.exp); const exp = (l.exp || "").slice(0, 10);
      const badge = du < 0 ? '<span class="pill out">' + Math.abs(du) + ' ' + L("alDays") + ' ' + L("alExpired") + '</span>'
        : '<span class="pill low">' + du + ' ' + L("alDays") + ' ' + L("alLeft") + '</span>';
      return '<tr><td><b>' + (l.product || l.flavor_code) + '</b></td><td>' + (l.lot || "&mdash;") + '</td>' +
        '<td' + (du < 0 ? ' class="expd"' : "") + '>' + exp + '</td><td>' + badge + '</td>' +
        '<td><button class="ghost sm danger" onclick="UI.seasStatus(\'' + l.id + '\',\'Quarantine\')">' + L("alQuar") + '</button></td></tr>';
    };
    const anyExpired = lots.some(l => daysUntil(l.exp) < 0);
    let html = '<div class="card"><h2>' + L("alerts") + '</h2><p class="hint">' + L("alertsHint") + '</p>' +
      '<div class="kpis"><div class="kpi' + (out.length ? " alert" : "") + '"><div class="n">' + out.length + '</div><div class="l">' + L("alSummaryOut") + '</div></div>' +
      '<div class="kpi"><div class="n">' + low.length + '</div><div class="l">' + L("alSummaryLow") + '</div></div>' +
      '<div class="kpi' + (anyExpired ? " alert" : "") + '"><div class="n">' + lots.length + '</div><div class="l">' + L("alSummaryExp") + '</div></div></div></div>';
    if (!out.length && !low.length && !lots.length) return html + '<div class="card"><p class="ok pill big">' + L("alNone") + '</p></div>';
    if (out.length) html += '<div class="card"><h2 class="sub2">' + L("alOut") + ' (' + out.length + ')</h2>' + stockTable(out) + '</div>';
    if (low.length) html += '<div class="card"><h2 class="sub2">' + L("alLow") + ' (' + low.length + ')</h2>' + stockTable(low) + '</div>';
    if (lots.length) html += '<div class="card"><h2 class="sub2">' + L("alExp") + ' (' + lots.length + ')</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("slProduct") + '</th><th>' + L("slLot") + '</th><th>' + L("slExp") + '</th><th>' + L("alDays") + '</th><th data-nosort></th></tr></thead><tbody>' + lots.map(lotRow).join("") + '</tbody></table></div>';
    return html;
  }
  function viewAdjust() {
    const its = DB.items().slice().sort((a, b) => (CATLBL[a.category] || a.category).localeCompare(CATLBL[b.category] || b.category) || a.name.localeCompare(b.name));
    const rows = its.map(i => {
      const oh = DB.onHand(i.id);
      const txt = (i.name + " " + i.code + " " + (CATLBL[i.category] || i.category)).toLowerCase();
      return '<tr data-txt="' + txt.replace(/"/g, "") + '"><td><span class="tag">' + (CATLBL[i.category] || i.category) + '</span></td>' +
        '<td><b>' + i.name + '</b><div class="muted sm">' + i.code + '</div></td>' +
        '<td class="right muted">' + fmt(oh) + ' ' + i.unit + '</td>' +
        '<td><input class="adjq" id="adj-' + i.id + '" type="number" min="0" inputmode="numeric" placeholder="' + fmt(oh) + '" data-cur="' + oh + '"></td></tr>';
    }).join("");
    return '<div class="card"><h2>' + L("adjust") + '</h2><p class="hint">' + L("adjustHint") + '</p>' +
      opField("Adriana") +
      '<label style="margin-top:12px">' + L("searchItems") + '</label><input id="adjSearch" autocomplete="off" oninput="UI.adjSearch(this.value)" placeholder="' + L("searchItems") + '">' +
      '<table style="margin-top:10px"><thead><tr><th>' + L("colCategory") + '</th><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th>' + L("newCount") + '</th></tr></thead><tbody id="adjBody">' + rows + '</tbody></table>' +
      '<button class="primary" onclick="UI.saveAdjust()">' + L("saveCounts") + '</button></div>';
  }
  function orderIsComplete(o) { return (o.status || "Open") === "Complete"; }
  // ---- order state for color coding (green=shipped, tan=in process, red=issue) ----
  function orderShipped(o) { const t = (o.tracking || "").trim();
    return !!t && !/^ip$/i.test(t) && /(1z|\d{3,}|pick|deliver|ship|xpo|estes|fedex|ups|odfl|r\+l|saia|old dominion)/i.test(t); }
  function orderIssue(o) { const x = ((o.notes || "") + " " + (o.tracking || "")).toLowerCase();
    return /\b(issue|problem|hold|damage|short|delay|delayed|back ?order|missing|wrong|re ?ship|refus|lost|rejected)\b/.test(x); }
  function orderStateClass(o) { return orderIssue(o) ? "o-issue" : (orderShipped(o) ? "o-ship" : "o-ip"); }
  function viewOrders() {
    const all = DB.orders().slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const openList = all.filter(o => !orderIsComplete(o));
    const compList = all.filter(o => orderIsComplete(o));
    const list = orderView === "complete" ? compList : openList;
    const toggle = '<div class="ordtabs">' +
      '<button class="' + (orderView === "open" ? "active" : "") + '" onclick="UI.ordView(\'open\')">' + L("ordOpen") + ' (' + openList.length + ')</button>' +
      '<button class="' + (orderView === "complete" ? "active" : "") + '" onclick="UI.ordView(\'complete\')">' + L("ordComplete") + ' (' + compList.length + ')</button></div>';
    const eo = orderEditId ? (DB.orders().find(o => String(o.id) === String(orderEditId)) || {}) : {};
    const oediting = !!(orderEditId && eo.id);
    const oav = x => esc(x == null ? "" : x);
    const addForm = (orderAddOpen || oediting) ? (
      '<div class="ordform">' +
      (oediting ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("oCustomer") + '</label><input id="o-cust" autocomplete="off" value="' + oav(eo.customer) + '"></div>' +
      '<div><label>' + L("oPO") + '</label><input id="o-po" autocomplete="off" value="' + oav(eo.customer_po) + '"></div>' +
      '<div><label>' + L("oOrderId") + '</label><input id="o-oid" autocomplete="off" value="' + oav(eo.order_id) + '"></div></div>' +
      '<div class="row"><div><label>' + L("oInvDate") + '</label><input id="o-inv" autocomplete="off" placeholder="mm/dd/yyyy" value="' + oav(eo.invoice_date) + '"></div>' +
      '<div><label>' + L("oShipDate") + '</label><input id="o-ship" autocomplete="off" placeholder="mm/dd/yyyy" value="' + oav(eo.ship_date) + '"></div>' +
      '<div><label>' + L("oCarrier") + '</label><input id="o-carr" autocomplete="off" placeholder="XPO / UPS / ESTES..." value="' + oav(eo.carrier) + '"></div></div>' +
      '<div class="row"><div><label>' + L("oTracking") + '</label><input id="o-trk" autocomplete="off" value="' + oav(eo.tracking) + '"></div>' +
      '<div><label>' + L("oAppt") + ' <span class="muted">(opt.)</span></label><input id="o-appt" autocomplete="off" value="' + oav(eo.appointment) + '"></div>' +
      '<div><label>' + L("oStripe") + ' <span class="muted">(opt.)</span></label><input id="o-stripe" autocomplete="off" value="' + oav(eo.stripe_link) + '"></div></div>' +
      '<div><label>' + L("oNotes") + '</label><input id="o-notes" autocomplete="off" value="' + oav(eo.notes) + '"></div>' +
      '<div class="row"><div><label>' + L("oEnteredBy") + '</label><select id="o-by">' + ORDER_ENTERERS.map(n => '<option' + (oediting && eo.entered_by === n ? ' selected' : '') + '>' + n + '</option>').join("") + '<option value="__other">' + L("oOther") + '</option></select></div>' +
      '<div><label>' + L("oByOther") + ' <span class="muted">(opt.)</span></label><input id="o-by-other" autocomplete="off"></div></div>' +
      '<button class="primary" onclick="UI.ordAdd()">' + (oediting ? L("saveChanges") : L("ordSave")) + '</button> ' +
      '<button class="ghost" style="margin-top:14px" onclick="UI.' + (oediting ? "ordEditCancel" : "ordAddToggle") + '()">' + L("ordCancel") + '</button></div>'
    ) : "";
    const rows = list.length ? list.map(o => {
      const txt = ((o.customer || "") + " " + (o.customer_po || "") + " " + (o.order_id || "") + " " + (o.tracking || "") + " " + (o.carrier || "")).toLowerCase().replace(/"/g, "");
      const trk = o.tracking ? (o.tracking + (o.carrier ? ' <span class="muted sm">' + o.carrier + '</span>' : "")) : (o.carrier || "&mdash;");
      const stripe = o.stripe_link ? ' <a class="order sm" href="' + o.stripe_link + '" target="_blank" rel="noopener">Stripe &#8599;</a>' : "";
      const act = orderIsComplete(o)
        ? '<button class="ghost sm" onclick="UI.ordReopen(\'' + o.id + '\')">' + L("reopen") + '</button>'
        : '<button class="ghost sm" onclick="UI.ordComplete(\'' + o.id + '\')">' + L("markComplete") + '</button>';
      return '<tr class="' + orderStateClass(o) + '" data-txt="' + txt + (o.entered_by ? " " + o.entered_by.toLowerCase() : "") + '"><td><b>' + (o.customer || "&mdash;") + '</b>' + (o.appointment ? '<div class="muted sm">' + o.appointment + '</div>' : "") + (o.entered_by ? '<div class="muted sm">' + L("oByPrefix") + ' ' + o.entered_by + '</div>' : "") + '</td>' +
        '<td>' + (o.customer_po || "&mdash;") + '<div class="muted sm">' + (o.order_id || "") + '</div></td>' +
        '<td class="muted sm">' + (o.ship_date || o.invoice_date || "") + '</td>' +
        '<td>' + trk + stripe + '</td>' +
        '<td>' + (o.notes ? '<span class="sm">' + o.notes + '</span>' : "") + '</td>' +
        '<td>' + act + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.ordEdit(\'' + o.id + '\')">&#9998;</button></td></tr>';
    }).join("") : '<tr><td colspan="6" class="muted">' + (orderView === "complete" ? L("noCompleteOrders") : L("noOpenOrders")) + '</td></tr>';
    return '<div class="card"><div class="suprow"><h2>' + L("orders") + '</h2>' +
      '<button class="primary sm" onclick="UI.ordAddToggle()">' + L("ordAdd") + '</button></div>' +
      '<p class="hint">' + L("ordersHint") + '</p>' + toggle +
      '<div class="ordlegend"><span class="lg lg-ship"></span>' + L("oLegShip") + '<span class="lg lg-ip"></span>' + L("oLegIP") + '<span class="lg lg-issue"></span>' + L("oLegIssue") + '</div>' + addForm +
      '<input id="ordSearch" autocomplete="off" style="margin-top:10px" oninput="UI.ordSearch(this.value)" placeholder="' + L("ordSearchP") + '">' +
      '<table class="sortable" style="margin-top:10px"><thead><tr><th>' + L("oCustomer") + '</th><th>' + L("oPO") + '</th><th>' + L("oShipDate") + '</th><th>' + L("oTracking") + '</th><th>' + L("oNotes") + '</th><th data-nosort></th></tr></thead><tbody id="ordBody">' + rows + '</tbody></table></div>';
  }
  // ---------- R&D / sample requests ----------
  function rdIsReceived(r) { return (r.status || "Pending") === "Received"; }
  function rdIsOverdue(r) { const nb = (r.needed_by || "").slice(0, 10); return nb && nb < new Date().toISOString().slice(0, 10) && !rdIsReceived(r); }
  function rdOp() { const e = $("rd-op"); return e ? e.value : "Troy"; }
  function viewRD() {
    const all = DB.rdRequests().slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const pend = all.filter(r => !rdIsReceived(r));
    const recv = all.filter(r => rdIsReceived(r));
    const list = rdView === "received" ? recv : pend;
    const toggle = '<div class="ordtabs">' +
      '<button class="' + (rdView === "pending" ? "active" : "") + '" onclick="UI.rdView(\'pending\')">' + L("rdPending") + ' (' + pend.length + ')</button>' +
      '<button class="' + (rdView === "received" ? "active" : "") + '" onclick="UI.rdView(\'received\')">' + L("rdDone") + ' (' + recv.length + ')</button></div>';
    const addForm = rdAddOpen ? (
      '<div class="ordform">' +
      '<div class="row"><div><label>' + L("rdType") + '</label><select id="rd-type">' + RD_TYPES.map(t => '<option>' + t + '</option>').join("") + '</select></div>' +
      '<div><label>' + L("rdCompany") + '</label><input id="rd-co" autocomplete="off"></div>' +
      '<div><label>' + L("rdContact") + ' <span class="muted">(opt.)</span></label><input id="rd-cn" autocomplete="off"></div></div>' +
      '<div class="row"><div><label>' + L("rdEmail") + '</label><input id="rd-em" type="email" autocomplete="off" placeholder="name@company.com"></div>' +
      '<div><label>' + L("rdQty") + '</label><input id="rd-qty" autocomplete="off" placeholder="2 lb / 3 samples"></div>' +
      '<div><label>' + L("rdNeed") + ' <span class="muted">(opt.)</span></label><input id="rd-need" type="date"></div></div>' +
      '<div><label>' + L("rdItems") + '</label><input id="rd-items" autocomplete="off" placeholder="Describe the sample / ingredient requested"></div>' +
      '<div class="row"><div><label>' + L("rdPurpose") + ' <span class="muted">(opt.)</span></label><input id="rd-purp" autocomplete="off"></div>' +
      '<div><label>' + L("rdFollow") + ' <span class="muted">(opt.)</span></label><input id="rd-follow" type="date"></div></div>' +
      '<div><label>' + L("rdNotesF") + ' <span class="muted">(opt.)</span></label><input id="rd-notes" autocomplete="off"></div>' +
      '<label>' + L("rdReqBy") + '</label><select id="rd-op">' + ["Michelle", "Troy", "Allie", "Adriana", "Ken"].map(n => "<option>" + n + "</option>").join("") + '</select>' +
      '<button class="primary" onclick="UI.rdAdd()">' + L("rdSave") + '</button> ' +
      '<button class="ghost" style="margin-top:14px" onclick="UI.rdAddToggle()">' + L("rdCancel") + '</button></div>'
    ) : "";
    const rows = list.length ? list.map(r => {
      const txt = ((r.req_no || "") + " " + (r.company || "") + " " + (r.items || "") + " " + (r.contact_name || "") + " " + (r.req_type || "")).toLowerCase().replace(/"/g, "");
      const over = rdIsOverdue(r);
      const needCell = ((r.needed_by || "").slice(0, 10) || "&mdash;") + (over ? ' <span class="pill out">' + L("rdOverdue") + '</span>' : "");
      const sentTag = r.sent_at ? ' <span class="tag">' + L("rdSentTag") + '</span>' : "";
      const statusPill = rdIsReceived(r) ? '<span class="pill ok">' + L("rdDone") + '</span>' : '<span class="pill low">' + L("rdPending") + '</span>';
      const act = rdIsReceived(r)
        ? '<button class="ghost sm" onclick="UI.rdReopen(\'' + r.id + '\')">' + L("rdReopenB") + '</button>'
        : '<button class="ghost sm" onclick="UI.rdSend(\'' + r.id + '\')">' + L("rdSend") + '</button>' +
          '<button class="ghost sm" onclick="UI.rdReceived(\'' + r.id + '\')">' + L("rdMarkRecv") + '</button>';
      return '<tr data-txt="' + txt + '"><td><b>' + (r.company || "&mdash;") + '</b><div class="muted sm">' + (r.req_no || "") + (r.contact_name ? " &middot; " + r.contact_name : "") + '</div></td>' +
        '<td>' + (r.items || "&mdash;") + '<div class="muted sm">' + (r.req_type || "") + (r.quantity ? " &middot; " + r.quantity : "") + '</div></td>' +
        '<td class="sm">' + needCell + '</td>' +
        '<td>' + statusPill + sentTag + '</td>' +
        '<td><button class="ghost sm" onclick="UI.rdPdf(\'' + r.id + '\')">' + L("rdDownload") + '</button>' + act + '</td></tr>';
    }).join("") : '<tr><td colspan="5" class="muted">' + (rdView === "received" ? L("rdNoReceived") : L("rdNoPending")) + '</td></tr>';
    return '<div class="card"><div class="suprow"><h2>' + L("rd") + '</h2>' +
      '<button class="primary sm" onclick="UI.rdAddToggle()">' + L("rdAdd") + '</button></div>' +
      '<p class="hint">' + L("rdHint") + '</p>' + toggle + addForm +
      '<input id="rdSearch" autocomplete="off" style="margin-top:10px" oninput="UI.rdSearch(this.value)" placeholder="' + L("rdSearchP") + '">' +
      '<table class="sortable" style="margin-top:10px"><thead><tr><th>' + L("rdCompany") + '</th><th>' + L("rdItems") + '</th><th>' + L("rdNeed") + '</th><th>' + L("status") + '</th><th data-nosort></th></tr></thead><tbody id="rdBody">' + rows + '</tbody></table></div>';
  }
  function rdDoc(r) {
    const jsPDFctor = window.jspdf && window.jspdf.jsPDF; if (!jsPDFctor) return null;
    const doc = new jsPDFctor({ unit: "pt", format: "letter" });
    const M = 54, W = 612, RM = W - M; let y = 58;
    const navy = [31, 56, 100], grey = [90, 90, 90], ink = [34, 34, 34];
    const rule = yy => { doc.setDrawColor(210, 216, 226); doc.setLineWidth(1); doc.line(M, yy, RM, yy); };
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text("SMACKIN' SNACKS", M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("SLC Fulfillment Center", M, y + 15);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(180, 120, 10);
    doc.text("BETA - PROTOTYPE", RM, y - 6, { align: "right" });
    y += 30; rule(y); y += 26;
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(L("rdPdfTitle"), M, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(L("rdReqNo") + ": " + (r.req_no || ""), M, y);
    doc.text(L("rdDate") + ": " + new Date().toISOString().slice(0, 10), RM, y, { align: "right" }); y += 24;
    doc.setFont("helvetica", "bold"); doc.text(L("rdTo") + ":", M, y);
    doc.setFont("helvetica", "normal");
    const toLines = []; if (r.company) toLines.push(r.company);
    const cc = []; if (r.contact_name) cc.push(r.contact_name); if (r.contact_email) cc.push(r.contact_email);
    if (cc.length) toLines.push(cc.join("   |   "));
    doc.text(toLines.length ? toLines : ["-"], M + 34, y); y += (toLines.length || 1) * 14 + 12;
    doc.setFont("helvetica", "bold"); doc.text(L("rdFrom") + ":", M, y);
    doc.setFont("helvetica", "normal"); doc.text((r.requested_by || "-") + (r.req_type ? "   (" + r.req_type + ")" : ""), M + 80, y); y += 22;
    rule(y); y += 16;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text(L("rdItems").toUpperCase(), M, y); doc.text(L("rdQty").toUpperCase(), 372, y); doc.text(L("rdNeed").toUpperCase(), 466, y);
    y += 6; rule(y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    const itemLines = doc.splitTextToSize(r.items || "-", 300);
    doc.text(itemLines, M, y); doc.text(r.quantity || "-", 372, y); doc.text((r.needed_by || "-").slice(0, 10), 466, y);
    y += Math.max(itemLines.length * 13, 16) + 16; rule(y); y += 22;
    const block = (labelKey, val) => {
      if (!val) return;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]);
      doc.text(L(labelKey).toUpperCase(), M, y); y += 14;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
      const ls = doc.splitTextToSize(val, RM - M); doc.text(ls, M, y); y += ls.length * 13 + 14;
    };
    block("rdPurpose", r.purpose); block("rdNotesF", r.notes);
    doc.setFontSize(8); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("Generated by Smackin' OS (BETA)  -  " + (r.req_no || ""), M, 762);
    return doc;
  }
  function rdEmailHtml(r) {
    const row = (k, v) => v ? '<tr><td style="padding:4px 12px 4px 0;color:#667;font-size:13px">' + k + '</td><td style="padding:4px 0;font-size:13px"><b>' + v + '</b></td></tr>' : "";
    return '<div style="font-family:Arial,sans-serif;color:#222;max-width:560px">' +
      '<p>Hello' + (r.contact_name ? " " + r.contact_name : "") + ',</p>' +
      '<p>Please see the attached sample request from Smackin\' Snacks. Details are below.</p>' +
      '<table style="border-collapse:collapse">' +
      row(L("rdReqNo"), r.req_no) + row(L("rdItems"), r.items) + row(L("rdQty"), r.quantity) +
      row(L("rdNeed"), (r.needed_by || "").slice(0, 10)) + row(L("rdPurpose"), r.purpose) +
      row(L("rdFrom"), r.requested_by) + '</table>' +
      (r.notes ? '<p style="font-size:13px">' + r.notes + '</p>' : "") +
      '<p style="font-size:13px">Thank you,<br>Smackin\' Snacks</p></div>';
  }
  // ---------- Supplier POs (upload from external systems) ----------
  function spoParseFile(file) {
    return new Promise(res => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const empty = { vendor: "", po_num: "", po_date: "", total: "", item_count: 0, lines: "[]", recognized: false };
      if (ext === "pdf" || !window.XLSX) { res(empty); return; }
      const reader = new FileReader();
      reader.onload = e => { try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        res(spoExtract(XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })));
      } catch (err) { res(empty); } };
      reader.onerror = () => res(empty);
      reader.readAsArrayBuffer(file);
    });
  }
  function spoExtract(grid) {
    const flat = grid.map(r => (r || []).map(c => (c == null ? "" : String(c))));
    const nrm = s => s.toLowerCase().replace(/[^a-z0-9#]/g, "");
    const headerRow = pred => { for (let i = 0; i < flat.length; i++) { if (pred(flat[i].map(nrm))) return i; } return -1; };
    const bel = headerRow(h => h.some(x => x.indexOf("belmarkitem") >= 0));
    if (bel >= 0) {
      const H = flat[bel].map(nrm), ci = n => H.findIndex(x => x === n || x.indexOf(n) >= 0);
      const cPO = H.findIndex(x => x === "po"), cItem = ci("belmarkitem"), cDesc = ci("description"), cQty = ci("qtyordered"), cDate = ci("orderdate");
      let po = "", date = "", total = "";
      flat.forEach(row => row.forEach((cell, k) => { const t = (cell || "").toString().trim();
        if (!po && /purchase order\s*#/i.test(t)) po = t.replace(/.*purchase order\s*#/i, "").trim();
        if (!po && /^PO\s*#/i.test(t)) po = t.replace(/^PO\s*#/i, "").trim();
        if (!total && /total price/i.test(t)) { const n = parseFloat(((row[k + 1] || row[k + 2] || "") + "").replace(/[,$]/g, "")); if (n) total = String(Math.round(n * 100) / 100); }
      }));
      const lines = [];
      for (let r = bel + 1; r < flat.length; r++) { const row = flat[r]; if (!row.join("").trim()) continue;
        const g = i => i >= 0 ? (row[i] || "").trim() : "";
        if (!po && cPO >= 0) po = g(cPO); if (!date) date = g(cDate);
        if (!g(cItem) && !g(cDesc)) continue;
        lines.push({ item: g(cItem), desc: g(cDesc), qty: g(cQty) }); }
      return { vendor: "Belmark", po_num: po, po_date: date, total: total, item_count: lines.length, lines: JSON.stringify(lines), recognized: true };
    }
    let po = "", date = "", vendor = "";
    flat.forEach(row => row.forEach(c => { const t = c.trim();
      if (!po && /^PO\s*#/i.test(t)) po = t.replace(/^PO\s*#/i, "").trim();
      if (!date && /^Date:/i.test(t)) date = t.replace(/^Date:/i, "").trim(); }));
    for (let i = 0; i < flat.length; i++) { if (flat[i].some(c => /vendor information/i.test(c))) {
      for (let j = i + 1; j < Math.min(i + 4, flat.length); j++) { const cand = (flat[j][0] || "").trim(); if (cand && !/smackin/i.test(cand)) { vendor = cand; break; } } break; } }
    const hdr = headerRow(h => h.some(x => x === "item#" || x === "item") && h.some(x => x.indexOf("descrip") >= 0));
    const num = v => parseFloat((v || "").toString().replace(/[,$\s]/g, ""));
    const lines = []; let sumT = 0;
    if (hdr >= 0) { const H = flat[hdr].map(nrm);
      const cI = H.findIndex(x => x === "item#" || x === "item"), cD = H.findIndex(x => x.indexOf("descrip") >= 0),
        cQ = H.findIndex(x => x === "quantity" || x === "qty"), cP = H.findIndex(x => x.indexOf("unitprice") >= 0 || x === "price"), cT = H.findIndex(x => x === "total");
      for (let r = hdr + 1; r < flat.length; r++) { const row = flat[r], g = i => i >= 0 ? (row[i] || "").trim() : "";
        const item = g(cI), desc = g(cD), qty = g(cQ), price = g(cP);
        // skip the summary block (Subtotal/Shipping/Tax/Other/Total) and blank filler rows
        if (/\b(sub ?total|shipping|tax|other|grand ?total|^total)\b/i.test((item + " " + desc).trim())) continue;
        if (!item) continue;                              // a real line needs an item code
        if (!num(qty) && !num(price)) continue;           // ...and a quantity or price
        const lt = g(cT); sumT += num(lt) || 0;
        lines.push({ item: item, desc: desc, qty: qty, price: price, total: lt }); } }
    // Prefer the labeled grand "Total" amount over summing the column (avoids double-counting subtotal/total rows)
    let grand = 0;
    for (let r = 0; r < flat.length; r++) { if (r === hdr) continue; const row = flat[r]; const norms = row.map(nrm);
      if (norms.some(x => x === "total")) { row.forEach(c => { const n = num(c); if (!isNaN(n) && n > grand) grand = n; }); } }
    const total = grand > 0 ? grand : (sumT > 0 ? sumT : 0);
    if (po || vendor || lines.length) return { vendor: vendor, po_num: po, po_date: date, total: total ? String(Math.round(total * 100) / 100) : "", item_count: lines.length, lines: JSON.stringify(lines), recognized: !!(po || vendor) };
    return { vendor: "", po_num: "", po_date: "", total: "", item_count: 0, lines: "[]", recognized: false };
  }
  function viewSupplierPos() {
    if (spoView === "create") return viewPoCreate();
    const list = spoSortList(DB.supplierPos());
    let form;
    if (!spoParsed) {
      form = '<div class="spodrop"><input type="file" id="spo-input" accept=".xlsx,.xls,.csv,.pdf" style="display:none" onchange="UI.spoFile(this)">' +
        '<label for="spo-input" class="spodroplabel">&#128228; ' + L("spoDrop") + '</label></div>';
    } else {
      const p = spoParsed;
      form = '<div class="ordform"><p class="hint">' + (p.recognized ? "&#10003; " + L("spoParsed") : "&#128206;") + " &middot; " + esc(spoFile ? spoFile.name : "") + '</p>' +
        '<div class="row"><div><label>' + L("spoVendor") + '</label><input id="spo-vendor" value="' + esc(p.vendor) + '"></div>' +
        '<div><label>' + L("spoPO") + '</label><input id="spo-po" value="' + esc(p.po_num) + '"></div>' +
        '<div><label>' + L("spoDate") + '</label><input id="spo-date" value="' + esc(p.po_date) + '"></div></div>' +
        '<div class="row"><div><label>' + L("spoTotal") + '</label><input id="spo-total" value="' + esc(p.total) + '"></div>' +
        '<div><label>' + L("spoItems") + '</label><input value="' + (p.item_count || 0) + '" disabled></div>' +
        '<div><label>' + L("spoUploadedBy") + '</label><select id="op">' + ["Michelle", "Matt", "Troy"].map(n => "<option>" + n + "</option>").join("") + '</select></div></div>' +
        '<div><label>' + L("spoNotes") + '</label><input id="spo-notes"></div>' +
        '<button class="primary" onclick="UI.spoSave()">' + L("spoSave") + '</button> ' +
        '<button class="ghost" style="margin-top:14px" onclick="UI.spoClear()">' + L("spoCancel") + '</button></div>';
    }
    const rows = list.length ? list.map(s => {
      const txt = ((s.vendor || "") + " " + (s.po_num || "") + " " + (s.file_name || "")).toLowerCase().replace(/"/g, "");
      const dl = s.file_url ? '<a class="order sm" href="' + s.file_url + '" target="_blank" rel="noopener">' + L("spoDownload") + '</a>' : (s.file_name ? '<span class="muted sm">' + s.file_name + '</span>' : "&mdash;");
      return '<tr data-txt="' + txt + '"><td><b>' + (s.vendor || "&mdash;") + '</b>' + (s.uploaded_by ? '<div class="muted sm">' + L("oByPrefix") + " " + s.uploaded_by + '</div>' : "") + '</td>' +
        '<td>' + (s.po_num || "&mdash;") + '</td><td class="sm">' + (s.po_date || "") + '</td>' +
        '<td class="right">' + money(s.total) + '</td><td class="right muted">' + (s.item_count || 0) + '</td>' +
        '<td>' + dl + '</td><td><button class="ghost sm danger" onclick="UI.spoDelete(\'' + s.id + '\')">&#10005;</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + L("spoNone") + '</td></tr>';
    return '<div class="card"><div class="spohead"><h2>' + L("supplierpos") + '</h2>' +
      '<button class="primary sm" onclick="UI.poCreateOpen()">' + L("poCreate") + '</button></div>' +
      '<p class="hint">' + L("spoHint") + '</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("spoList") + ' (' + list.length + ')</h2>' +
      '<input id="spoSearch" autocomplete="off" oninput="UI.spoSearch(this.value)" placeholder="' + L("spoSearchP") + '" style="margin-bottom:10px">' +
      '<table><thead><tr>' +
      '<th class="sortable" onclick="UI.spoSortBy(\'vendor\')">' + L("spoVendor") + spoArrow("vendor") + '</th>' +
      '<th class="sortable" onclick="UI.spoSortBy(\'po_num\')">' + L("spoPO") + spoArrow("po_num") + '</th>' +
      '<th class="sortable" onclick="UI.spoSortBy(\'po_date\')">' + L("spoDate") + spoArrow("po_date") + '</th>' +
      '<th class="right sortable" onclick="UI.spoSortBy(\'total\')">' + L("spoTotal") + spoArrow("total") + '</th>' +
      '<th class="right sortable" onclick="UI.spoSortBy(\'item_count\')">' + L("spoItems") + spoArrow("item_count") + '</th>' +
      '<th>' + L("spoFile") + '</th><th></th></tr></thead><tbody id="spoBody">' + rows + '</tbody></table></div>';
  }
  function poRowInner(i) {
    return '<td><input id="pl-item-' + i + '" autocomplete="off"></td>' +
      '<td><input id="pl-desc-' + i + '" autocomplete="off"></td>' +
      '<td><input id="pl-qty-' + i + '" type="number" min="0" step="any" inputmode="decimal" oninput="UI.poRecalc()"></td>' +
      '<td><input id="pl-price-' + i + '" type="number" min="0" step="any" inputmode="decimal" oninput="UI.poRecalc()"></td>' +
      '<td class="right"><span id="pl-tot-' + i + '">$0.00</span></td>';
  }
  function viewPoCreate() {
    const vendors = Array.from(new Set(DB.supplierPos().map(s => s.vendor).filter(Boolean))).sort();
    const ships = Array.from(new Set(DB.supplierPos().map(s => s.ship_to).filter(Boolean)));
    if (!ships.some(s => /4250 W/i.test(s))) ships.unshift("1736 S 4250 W, Salt Lake City, UT 84104");
    const dl = '<datalist id="dl-po-vendor">' + vendors.map(v => '<option value="' + esc(v) + '"></option>').join("") + '</datalist>' +
      '<datalist id="dl-po-shipto">' + ships.map(v => '<option value="' + esc(v) + '"></option>').join("") + '</datalist>';
    let rows = "";
    for (let i = 0; i < poRows; i++) rows += '<tr>' + poRowInner(i) + '</tr>';
    const today = new Date().toISOString().slice(0, 10);
    return dl + '<div class="card"><div class="spohead"><h2>' + L("poNewTitle") + '</h2>' +
      '<button class="ghost sm" onclick="UI.poBack()">' + L("poBackList") + '</button></div>' +
      '<div class="row"><div><label>' + L("spoVendor") + '</label><input id="po-vendor" list="dl-po-vendor" autocomplete="off" onchange="UI.poVendorFill()" onblur="UI.poVendorFill()"></div>' +
      '<div><label>' + L("spoPO") + '</label><input id="po-num" autocomplete="off"></div>' +
      '<div><label>' + L("spoDate") + '</label><input id="po-date" value="' + today + '"></div></div>' +
      '<div class="row"><div><label>' + L("poVendorAddr") + '</label><input id="po-vaddr" autocomplete="off"></div>' +
      '<div><label>' + L("poVendorEmail") + '</label><input id="po-vemail" autocomplete="off"></div>' +
      '<div><label>' + L("poVendorPhone") + '</label><input id="po-vphone" autocomplete="off"></div></div>' +
      '<div><label>' + L("poShipTo") + '</label><input id="po-shipto" list="dl-po-shipto" autocomplete="off"></div>' +
      '<h3 class="sub2" style="margin-top:14px">' + L("spoItems") + '</h3>' +
      '<table class="potable"><thead><tr><th>' + L("poItemNo") + '</th><th>' + L("poDesc") + '</th><th>' + L("poQtyL") + '</th><th>' + L("poPriceL") + '</th><th class="right">' + L("poLineTot") + '</th></tr></thead><tbody id="po-lines">' + rows + '</tbody></table>' +
      '<button class="ghost sm" onclick="UI.poAddLine()">' + L("poAddLine") + '</button>' +
      '<div class="pototals">' +
      '<div><span>' + L("poSubtotalL") + '</span><b id="po-subtotal">$0.00</b></div>' +
      '<div><span>' + L("poShippingL") + '</span><input id="po-shipping" type="number" min="0" step="any" inputmode="decimal" oninput="UI.poRecalc()"></div>' +
      '<div><span>' + L("poTaxL") + '</span><input id="po-tax" type="number" min="0" step="any" inputmode="decimal" oninput="UI.poRecalc()"></div>' +
      '<div><span>' + L("poOtherL") + '</span><input id="po-other" type="number" min="0" step="any" inputmode="decimal" oninput="UI.poRecalc()"></div>' +
      '<div class="grand"><span>' + L("poGrandL") + '</span><b id="po-grand">$0.00</b></div></div>' +
      '<div class="row" style="margin-top:10px"><div><label>' + L("poPreparedBy") + '</label><select id="po-by">' + PO_PREPARERS.map(n => "<option>" + n + "</option>").join("") + '</select></div>' +
      '<div><label>' + L("spoNotes") + '</label><input id="po-notes" autocomplete="off"></div></div>' +
      '<button class="primary" onclick="UI.poCreate()">' + L("poSaveBtn") + '</button></div>';
  }
  function viewOrderDocs() {
    const list = DB.orderDocs().slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const form = '<div class="ordform">' +
      '<div class="spodrop"><input type="file" id="odoc-input" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.docx" style="display:none" onchange="UI.odocFile(this)">' +
      '<label for="odoc-input" class="spodroplabel">&#128193; ' + L("odocDrop") + '</label></div>' +
      (odocFile ? '<p class="hint">&#128206; ' + esc(odocFile.name) + '</p>' : '') +
      '<div class="row"><div><label>' + L("odocCustomer") + '</label><input id="odoc-cust" list="dl-odoc-cust" autocomplete="off"></div>' +
      '<div><label>' + L("odocPO") + '</label><input id="odoc-po" autocomplete="off"></div></div>' +
      '<div class="row"><div><label>' + L("odocType") + '</label><select id="odoc-type">' + ODOC_TYPES.map(t => "<option>" + t + "</option>").join("") + '</select></div>' +
      '<div><label>' + L("spoUploadedBy") + '</label><select id="op">' + ODOC_UPLOADERS.map(n => "<option>" + n + "</option>").join("") + '</select></div></div>' +
      '<div><label>' + L("spoNotes") + '</label><input id="odoc-notes" autocomplete="off"></div>' +
      '<button class="primary" onclick="UI.odocSave()">' + L("odocSave") + '</button>' +
      (odocFile ? ' <button class="ghost" onclick="UI.odocClear()">' + L("spoCancel") + '</button>' : '') + '</div>';
    const custs = Array.from(new Set(DB.orders().map(o => o.customer).concat(list.map(d => d.customer)).filter(Boolean))).sort();
    const dl = '<datalist id="dl-odoc-cust">' + custs.map(c => '<option value="' + esc(c) + '"></option>').join("") + '</datalist>';
    let body;
    if (!list.length) { body = '<p class="muted">' + L("odocNone") + '</p>'; }
    else {
      const byCust = {};
      list.forEach(d => { const c = d.customer || "(none)"; (byCust[c] = byCust[c] || []).push(d); });
      body = Object.keys(byCust).sort().map(c => {
        const txt = (c + " " + byCust[c].map(d => (d.po_num || "") + " " + (d.doc_type || "") + " " + (d.file_name || "")).join(" ")).toLowerCase().replace(/"/g, "");
        const byPo = {};
        byCust[c].forEach(d => { const p = d.po_num || "(no PO)"; (byPo[p] = byPo[p] || []).push(d); });
        const pos = Object.keys(byPo).sort().map(p => {
          const chips = byPo[p].map(d => {
            const label = d.doc_type || "Doc";
            const inner = d.file_url ? '<a href="' + d.file_url + '" target="_blank" rel="noopener">' + esc(label) + '</a>' : esc(label);
            return '<span class="odchip">' + inner + (d.file_name ? '<span class="odfn">' + esc(d.file_name) + '</span>' : '') + '<button class="odx" title="x" onclick="UI.odocDelete(\'' + d.id + '\')">&#10005;</button></span>';
          }).join("");
          return '<div class="odpo"><div class="odpohead">' + L("odocPO") + ' ' + esc(p) + '</div><div class="odchips">' + chips + '</div></div>';
        }).join("");
        return '<div class="odcust" data-txt="' + txt + '"><div class="odcusthead">' + esc(c) + ' <span class="muted">(' + byCust[c].length + ')</span></div>' + pos + '</div>';
      }).join("");
    }
    return dl + '<div class="card"><h2>' + L("orderdocs") + '</h2><p class="hint">' + L("odocHint") + '</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("odocArchive") + ' (' + list.length + ')</h2>' +
      '<input id="odocSearch" autocomplete="off" oninput="UI.odocSearch(this.value)" placeholder="' + L("odocSearchP") + '" style="margin-bottom:10px">' +
      '<div id="odocBody">' + body + '</div></div>';
  }
  function viewShippingLog() {
    const today = new Date().toISOString().slice(0, 10);
    const ed = shipEditId ? (DB.shippingLog().find(s => String(s.id) === String(shipEditId)) || {}) : {};
    const editing = !!(shipEditId && ed.id);
    const av = x => esc(x == null ? "" : x);
    const selOpt = (arr, cur, def) => arr.map(t => '<option' + (t === (cur != null && cur !== "" ? cur : def) ? " selected" : "") + '>' + t + '</option>').join("");
    const form = '<div class="ordform">' +
      (editing ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("shlDate") + '</label><input id="shl-date" type="date" value="' + (editing && ed.ship_date ? (ed.ship_date + "").slice(0, 10) : today) + '"></div>' +
      '<div><label>' + L("shlType") + '</label><select id="shl-type">' + selOpt(SHIP_TYPES, ed.ship_type, "Sample") + '</select></div>' +
      '<div><label>' + L("shlStatus") + '</label><select id="shl-status">' + selOpt(SHIP_STATUSES, ed.status, "Shipped") + '</select></div></div>' +
      '<div class="row"><div><label>' + L("shlRecipient") + '</label><input id="shl-recipient" autocomplete="off" value="' + av(ed.recipient) + '"></div>' +
      '<div><label>' + L("shlReqBy") + '</label><input id="shl-reqby" list="dl-shl-reqby" autocomplete="off" value="' + av(ed.requested_by) + '"></div></div>' +
      '<div><label>' + L("shlAddress") + '</label><input id="shl-address" autocomplete="off" value="' + av(ed.address) + '"></div>' +
      '<div class="row"><div><label>' + L("shlCarrier") + '</label><select id="shl-carrier">' + selOpt(SHIP_CARRIERS, ed.carrier, "UPS") + '</select></div>' +
      '<div><label>' + L("shlTracking") + '</label><input id="shl-tracking" autocomplete="off" value="' + av(ed.tracking) + '"></div>' +
      '<div><label>' + L("shlCost") + ' <span class="muted">(opt.)</span></label><input id="shl-cost" type="number" min="0" step="0.01" placeholder="0.00" value="' + (editing && Number(ed.cost) ? Number(ed.cost) : "") + '"></div></div>' +
      '<div><label>' + L("shlContents") + '</label><input id="shl-contents" autocomplete="off" value="' + av(ed.contents) + '"></div>' +
      '<div><label>' + L("shlNotes") + ' <span class="muted">(opt.)</span></label><input id="shl-notes" autocomplete="off" value="' + av(ed.notes) + '"></div>' +
      opField("Troy") +
      '<button class="primary" onclick="UI.shlSave()">' + (editing ? L("saveChanges") : L("shlSave")) + '</button>' +
      (editing ? ' <button class="ghost" style="margin-top:14px" onclick="UI.shlEditCancel()">' + L("ordCancel") + '</button>' : '') + '</div>';
    const reqDl = '<datalist id="dl-shl-reqby">' + SHIP_REQUESTERS.map(n => '<option value="' + n + '"></option>').join("") + '</datalist>';
    let list = DB.shippingLog().slice();
    const vf = { ship_date: s => s.ship_date || "", ship_type: s => s.ship_type || "", recipient: s => (s.recipient || "").toLowerCase(), carrier: s => s.carrier || "", requested_by: s => (s.requested_by || "").toLowerCase(), status: s => s.status || "", cost: s => Number(s.cost) || 0 };
    const kf = vf[shipSortKey] || vf.ship_date;
    list.sort((a, b) => { const x = kf(a), y = kf(b); return (x < y ? -1 : x > y ? 1 : 0) * shipSortDir; });
    const th = (key, label, cls) => '<th' + (cls ? ' class="' + cls + '"' : '') + ' style="cursor:pointer" onclick="UI.shlSort(\'' + key + '\')">' + label + (shipSortKey === key ? ' <span class="sortar">' + (shipSortDir > 0 ? "&#9650;" : "&#9660;") + '</span>' : '') + '</th>';
    const stColor = st => st === "Delivered" ? "ok" : st === "Returned" ? "out" : st === "Pending" ? "low" : "";
    const rows = list.map(s => {
      const url = trackingUrl(s.carrier, s.tracking);
      const trk = s.tracking ? (url ? '<a href="' + url + '" target="_blank" rel="noopener">' + esc(s.tracking) + ' &#8599;</a>' : esc(s.tracking)) : '&mdash;';
      const next = { Pending: "Shipped", Shipped: "Delivered" }[s.status];
      const adv = next ? '<button class="ghost sm" onclick="UI.shlStatus(\'' + s.id + '\',\'' + next + '\')">' + next + '</button>' : '';
      const txt = ((s.ship_date || "") + " " + (s.ship_type || "") + " " + (s.recipient || "") + " " + (s.carrier || "") + " " + (s.tracking || "") + " " + (s.requested_by || "") + " " + (s.contents || "") + " " + (s.address || "") + " " + (s.status || "")).toLowerCase().replace(/"/g, "");
      return '<tr data-txt="' + txt + '"><td>' + esc((s.ship_date || "").slice(0, 10)) + '</td><td>' + esc(s.ship_type || "") + '</td>' +
        '<td><b>' + esc(s.recipient || "") + '</b>' + (s.address ? '<div class="muted sm">' + esc(s.address) + '</div>' : '') + '</td>' +
        '<td>' + esc(s.carrier || "") + '</td><td>' + trk + '</td><td class="muted">' + esc(s.requested_by || "") + '</td>' +
        '<td>' + esc(s.contents || "") + '</td>' +
        '<td><span class="pill ' + stColor(s.status) + '">' + esc(s.status || "") + '</span></td>' +
        '<td class="right">' + (Number(s.cost) ? '$' + Number(s.cost).toFixed(2) : '&mdash;') + '</td>' +
        '<td>' + adv + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.shlEdit(\'' + s.id + '\')">&#9998;</button>' +
        ' <button class="ghost sm danger" onclick="UI.shlDelete(\'' + s.id + '\')">&#10005;</button></td></tr>';
    }).join("");
    const totalCost = list.reduce((a, s) => a + (Number(s.cost) || 0), 0);
    const table = list.length ? '<table><thead><tr>' +
      th("ship_date", L("shlDate")) + th("ship_type", L("shlType")) + th("recipient", L("shlRecipient")) +
      th("carrier", L("shlCarrier")) + '<th>' + L("shlTracking") + '</th>' + th("requested_by", L("shlReqBy")) +
      '<th>' + L("shlContents") + '</th>' + th("status", L("shlStatus")) + th("cost", L("shlCost"), "right") + '<th></th>' +
      '</tr></thead><tbody id="shlBody">' + rows + '</tbody></table>' : '<p class="muted">' + L("shlNone") + '</p>';
    return reqDl + '<div class="card"><h2>' + L("shiplog") + '</h2><p class="hint">' + L("shlHint") + '</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("shlArchive") + ' (' + list.length + ')' + (totalCost ? ' &middot; $' + totalCost.toFixed(2) : '') + '</h2>' +
      '<input id="shlSearch" autocomplete="off" oninput="UI.shlSearch(this.value)" placeholder="' + L("shlSearchP") + '" style="margin-bottom:10px">' +
      table + '</div>';
  }
  function viewReceivingLog() {
    const today = new Date().toISOString().slice(0, 10);
    const ed = recvEditId ? (DB.receivingLog().find(s => String(s.id) === String(recvEditId)) || {}) : {};
    const editing = !!(recvEditId && ed.id);
    const av = x => esc(x == null ? "" : x);
    const selOpt = (arr, cur, def) => arr.map(t => '<option' + (t === (cur != null && cur !== "" ? cur : def) ? " selected" : "") + '>' + t + '</option>').join("");
    const qv = n => (n != null && n !== "" ? n : "");
    const form = '<div class="ordform">' +
      (editing ? '<p class="hint">&#9998; ' + L("editingRow") + (ed.file_name ? ' &middot; ' + L("rlKeepDoc") : '') + '</p>' : '') +
      '<div class="spodrop"><input type="file" id="rl-input" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.docx" style="display:none" onchange="UI.rlFile(this)">' +
      '<label for="rl-input" class="spodroplabel">&#128193; ' + L("rlDrop") + '</label></div>' +
      (recvFile ? '<p class="hint">&#128206; ' + esc(recvFile.name) + ' <button class="ghost sm" onclick="UI.rlClear()">' + L("spoCancel") + '</button></p>' : '') +
      '<div class="row"><div><label>' + L("rlDate") + '</label><input id="rl-date" type="date" value="' + (editing && ed.recv_date ? (ed.recv_date + "").slice(0, 10) : today) + '"></div>' +
      '<div><label>' + L("rlSupplier") + '</label><input id="rl-supplier" autocomplete="off" value="' + av(ed.supplier) + '"></div>' +
      '<div><label>' + L("rlPO") + '</label><input id="rl-po" autocomplete="off" value="' + av(ed.po_num) + '"></div></div>' +
      '<div class="row"><div><label>' + L("rlCarrier") + '</label><select id="rl-carrier"><option value=""' + (!ed.carrier ? ' selected' : '') + '></option>' + selOpt(SHIP_CARRIERS, ed.carrier, "") + '</select></div>' +
      '<div><label>' + L("rlTracking") + ' <span class="muted">(PRO)</span></label><input id="rl-tracking" autocomplete="off" value="' + av(ed.tracking) + '"></div>' +
      '<div><label>' + L("rlCondition") + '</label><select id="rl-condition">' + selOpt(RECV_LOG_CONDITIONS, ed.condition, "Good") + '</select></div></div>' +
      '<div><label>' + L("rlContents") + '</label><input id="rl-contents" autocomplete="off" value="' + av(ed.contents) + '"></div>' +
      '<div class="row"><div><label>' + L("rlQtyOrd") + ' <span class="muted">(opt.)</span></label><input id="rl-qord" type="number" min="0" placeholder="0" value="' + qv(ed.qty_ordered) + '"></div>' +
      '<div><label>' + L("rlQtyRec") + ' <span class="muted">(opt.)</span></label><input id="rl-qrec" type="number" min="0" placeholder="0" value="' + qv(ed.qty_received) + '"></div>' +
      '<div><label>' + L("rlReceivedBy") + '</label><input id="rl-by" list="dl-rl-by" autocomplete="off" value="' + av(ed.received_by) + '"></div></div>' +
      '<div><label>' + L("rlNotes") + ' <span class="muted">(opt.)</span></label><input id="rl-notes" autocomplete="off" value="' + av(ed.notes) + '"></div>' +
      opField("Adriana") +
      '<button class="primary" onclick="UI.rlSave()">' + (editing ? L("saveChanges") : L("rlSave")) + '</button>' +
      (editing ? ' <button class="ghost" style="margin-top:14px" onclick="UI.rlEditCancel()">' + L("ordCancel") + '</button>' : '') + '</div>';
    const byDl = '<datalist id="dl-rl-by">' + RECV_LOG_RECEIVERS.map(n => '<option value="' + n + '"></option>').join("") + '</datalist>';
    let list = DB.receivingLog().slice();
    const vf = { recv_date: s => s.recv_date || "", supplier: s => (s.supplier || "").toLowerCase(), po_num: s => s.po_num || "", carrier: s => s.carrier || "", condition: s => s.condition || "", received_by: s => (s.received_by || "").toLowerCase() };
    const kf = vf[recvSortKey] || vf.recv_date;
    list.sort((a, b) => { const x = kf(a), y = kf(b); return (x < y ? -1 : x > y ? 1 : 0) * recvSortDir; });
    const th = (key, label, cls) => '<th' + (cls ? ' class="' + cls + '"' : '') + ' style="cursor:pointer" onclick="UI.rlSort(\'' + key + '\')">' + label + (recvSortKey === key ? ' <span class="sortar">' + (recvSortDir > 0 ? "&#9650;" : "&#9660;") + '</span>' : '') + '</th>';
    const cColor = c => c === "Good" ? "ok" : (c === "Damaged" || c === "Hold") ? "out" : "low";
    const rows = list.map(s => {
      const url = trackingUrl(s.carrier, s.tracking);
      const trk = s.tracking ? (url ? '<a href="' + url + '" target="_blank" rel="noopener">' + esc(s.tracking) + ' &#8599;</a>' : esc(s.tracking)) : '&mdash;';
      const ov = (s.qty_ordered != null && s.qty_received != null) ? (Number(s.qty_ordered) - Number(s.qty_received)) : null;
      const ovTxt = ov === null ? '&mdash;' : (ov === 0 ? '0' : (ov > 0 ? '-' + ov : '+' + Math.abs(ov)));
      const doc = s.file_url ? '<a href="' + s.file_url + '" target="_blank" rel="noopener" title="' + esc(s.file_name || '') + '">&#128206;</a>' : '';
      const txt = ((s.recv_date || "") + " " + (s.supplier || "") + " " + (s.po_num || "") + " " + (s.carrier || "") + " " + (s.tracking || "") + " " + (s.contents || "") + " " + (s.condition || "") + " " + (s.received_by || "")).toLowerCase().replace(/"/g, "");
      return '<tr data-txt="' + txt + '"><td>' + esc((s.recv_date || "").slice(0, 10)) + '</td>' +
        '<td><b>' + esc(s.supplier || "") + '</b></td><td>' + esc(s.po_num || "") + '</td>' +
        '<td>' + esc(s.carrier || "") + '</td><td>' + trk + '</td>' +
        '<td>' + esc(s.contents || "") + '</td>' +
        '<td class="right">' + (s.qty_received != null ? fmt(s.qty_received) : '&mdash;') + '</td>' +
        '<td class="right">' + ovTxt + '</td>' +
        '<td><span class="pill ' + cColor(s.condition) + '">' + esc(s.condition || "") + '</span></td>' +
        '<td class="muted">' + esc(s.received_by || "") + '</td>' +
        '<td class="center">' + doc + '</td>' +
        '<td><button class="ghost sm" title="' + L("editRow") + '" onclick="UI.rlEdit(\'' + s.id + '\')">&#9998;</button>' +
        ' <button class="ghost sm danger" onclick="UI.rlDelete(\'' + s.id + '\')">&#10005;</button></td></tr>';
    }).join("");
    const table = list.length ? '<table><thead><tr>' +
      th("recv_date", L("rlDate")) + th("supplier", L("rlSupplier")) + th("po_num", L("rlPO")) +
      th("carrier", L("rlCarrier")) + '<th>' + L("rlTracking") + '</th>' + '<th>' + L("rlContents") + '</th>' +
      '<th class="right">' + L("rlQtyRec") + '</th>' + '<th class="right">' + L("rlShortOver") + '</th>' +
      th("condition", L("rlCondition")) + th("received_by", L("rlReceivedBy")) + '<th>' + L("rlDoc") + '</th>' + '<th></th>' +
      '</tr></thead><tbody id="rlBody">' + rows + '</tbody></table>' : '<p class="muted">' + L("rlNone") + '</p>';
    return byDl + '<div class="card"><h2>' + L("recvlog") + '</h2><p class="hint">' + L("rlHint") + '</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("rlArchive") + ' (' + list.length + ')</h2>' +
      '<input id="rlSearch" autocomplete="off" oninput="UI.rlSearch(this.value)" placeholder="' + L("rlSearchP") + '" style="margin-bottom:10px">' +
      table + '</div>';
  }
  function viewReceive() {
    return '<div class="card"><h2>' + L("receive") + '</h2><p class="hint">' + L("receiveHint") + '</p>' +
      itemScan("r-code", "r-qty") +
      '<div class="row"><div><label>' + L("qty") + '</label><input id="r-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div><label>' + L("rPallets") + ' <span class="muted">(opt.)</span></label><input id="r-pal" type="number" min="0" step="0.1" placeholder="0"></div>' +
      '<div><label>' + L("lot") + ' <span class="muted">(opt.)</span></label><input id="r-lot" autocomplete="off" placeholder="LOT-0701"></div></div>' +
      '<div class="row"><div><label>' + L("rSupplier") + '</label><select id="r-sup"><option value=""></option>' + selOpts(DB.recvSuppliers) + '</select></div>' +
      '<div><label>' + L("rInvoice") + ' <span class="muted">(opt.)</span></label><input id="r-inv" autocomplete="off" placeholder="INV-..."></div>' +
      '<div><label>' + L("rCategory") + '</label><select id="r-cat"><option value=""></option>' + selOpts(DB.recvCategories) + '</select></div></div>' +
      '<div class="row"><div><label>' + L("rCondition") + '</label><select id="r-cond">' + selOpts(DB.conditions) + '</select></div>' +
      '<div><label>' + L("rStatus") + '</label><select id="r-stat">' + selOpts(DB.recvStatuses) + '</select></div></div>' +
      locPickerBlock("r-loc") +
      opField("Adriana") + '<button class="primary" onclick="UI.receive()">' + L("submitReceive") + '</button></div>';
  }
  function viewPut() {
    return '<div class="card"><h2>' + L("putaway") + '</h2><p class="hint">' + L("putHint") + '</p>' +
      itemScan("p-code", "p-loc") +
      '<div class="row"><div><label>' + L("qty") + '</label><input id="p-qty" type="number" min="0" placeholder="' + L("enter") + '"></div></div>' +
      locPickerBlock("p-loc") +
      opField("Adriana") + '<button class="primary" onclick="UI.put()">' + L("submitPut") + '</button></div>';
  }
  function viewMove() {
    return '<div class="card"><h2>' + L("move") + '</h2><p class="hint">' + L("moveHint") + '</p>' +
      itemScan("m-code", "m-from") +
      '<div class="row"><div>' + locInput("m-from", "from") + '</div><div>' + locInput("m-to", "to") + '</div>' +
      '<div><label>' + L("qty") + '</label><input id="m-qty" type="number" min="0" placeholder="' + L("enter") + '"></div></div>' +
      opField("Adriana") + '<button class="primary" onclick="UI.move()">' + L("submitMove") + '</button></div>';
  }
  function viewProduce() {
    const fin = DB.items().filter(i => i.category === "bag4");
    return '<div class="card"><h2>' + L("produce") + '</h2><p class="hint">' + L("produceHint") + '</p>' +
      '<div class="row"><div><label>' + L("pickFlavor") + '</label><select id="pr-item">' +
      fin.map(i => '<option value="' + i.id + '">' + i.flavor + "</option>").join("") + '</select></div>' +
      '<div><label>' + L("qtyBags") + '</label><input id="pr-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div>' + locInput("pr-loc", "to") + '</div></div>' +
      opField() + '<button class="primary" onclick="UI.produce()">' + L("submitProduce") + '</button></div>';
  }
  function viewCount() {
    return '<div class="card"><h2>' + L("count") + '</h2><p class="hint">' + L("countHint") + '</p>' +
      itemScan("c-code", "c-loc") +
      '<div class="row"><div>' + locInput("c-loc", "to") + '</div><div><label>' + L("newqty") + '</label><input id="c-qty" type="number" min="0" placeholder="' + L("newqty") + '"></div></div>' +
      opField("Adriana") + '<button class="primary" onclick="UI.count()">' + L("submitCount") + '</button></div>';
  }
  function viewReturns() {
    const recent = DB.log().filter(e => e.a === "Return").slice(0, 25);
    const list = recent.length
      ? '<table><thead><tr><th>' + L("when") + '</th><th>' + L("detail") + '</th><th>' + L("operator") + '</th></tr></thead><tbody>' +
        recent.map(e => '<tr><td class="muted sm">' + (e.t ? new Date(e.t).toLocaleString() : "") + '</td><td>' + e.d + '</td><td>' + e.u + '</td></tr>').join("") + '</tbody></table>'
      : '<p class="muted">' + L("noReturns") + '</p>';
    return '<div class="card"><h2>' + L("returns") + '</h2><p class="hint">' + L("returnsHint") + '</p>' +
      itemScan("ret-code", "ret-qty") +
      '<div class="row"><div><label>' + L("qty") + '</label><input id="ret-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div><label>' + L("rChannel") + '</label><select id="ret-chan">' + selOpts(DB.returnChannels) + '</select></div>' +
      '<div><label>' + L("rRMA") + ' <span class="muted">(opt.)</span></label><input id="ret-rma" autocomplete="off" placeholder="RMA / order #"></div></div>' +
      '<div class="row"><div><label>' + L("rReason") + '</label><select id="ret-reason">' + selOpts(DB.returnReasons) + '</select></div>' +
      '<div><label>' + L("rDisposition") + '</label><select id="ret-disp">' + selOpts(DB.returnDispositions) + '</select></div></div>' +
      opField() + '<button class="primary" onclick="UI.doReturn()">' + L("submitReturn") + '</button>' +
      '<h2 class="sub2" style="margin-top:18px">' + L("recentReturns") + '</h2>' + list + '</div>';
  }
  function viewSeasoning() {
    const seas = DB.items().filter(i => i.category === "seasoning" && /^SEAS-/.test(i.id));
    const sed = seasEditId ? (DB.seasLots().find(l => String(l.id) === String(seasEditId)) || {}) : {};
    const sediting = !!(seasEditId && sed.id);
    const av = x => esc(x == null ? "" : x);
    const opts = seas.map(i => { const code = i.id.replace("SEAS-", ""); return '<option value="' + code + '|' + i.flavor + '"' + (sediting && sed.flavor_code === code ? ' selected' : '') + '>' + i.flavor + '</option>'; }).join("");
    const today = new Date().toISOString().slice(0, 10);
    const lots = DB.seasLots().slice().sort((a, b) => (a.exp || "9999") < (b.exp || "9999") ? -1 : 1);
    const body = lots.length ? lots.map(l => {
      const exp = l.exp ? String(l.exp).slice(0, 10) : "";
      const isExp = exp && exp < today;
      const stat = l.status === "Quarantine" ? '<span class="pill out">' + L("quarTag") + '</span>'
        : isExp ? '<span class="pill low">' + L("expiredTag") + '</span>' : '<span class="pill ok">' + L("goodTag") + '</span>';
      const act = l.status === "Quarantine"
        ? '<button class="ghost sm" onclick="UI.seasStatus(\'' + l.id + '\',\'Good\')">' + L("markGood") + '</button>'
        : '<button class="ghost sm danger" onclick="UI.seasStatus(\'' + l.id + '\',\'Quarantine\')">' + L("markQuar") + '</button>';
      return '<tr><td><b>' + (l.product || l.flavor_code) + '</b></td><td>' + (l.lot || "&mdash;") + '</td><td class="muted sm">' + (l.manufacturer || "&mdash;") +
        '</td><td' + (isExp ? ' class="expd"' : "") + '>' + (exp || "&mdash;") + '</td><td class="right">' + fmt(l.weight) + '</td><td>' + stat + '</td><td>' + act + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.seasEdit(\'' + l.id + '\')">&#9998;</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + L("noLots") + '</td></tr>';
    return '<div class="card"><h2>' + L("seasoning") + '</h2><p class="hint">' + L("seasHint") + '</p>' +
      (sediting ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("slProduct") + '</label><select id="sl-prod">' + opts + '</select></div>' +
      '<div><label>' + L("slLot") + '</label><input id="sl-lot" autocomplete="off" placeholder="# 6105" value="' + av(sed.lot) + '"></div>' +
      '<div><label>' + L("slMfr") + '</label><input id="sl-mfr" autocomplete="off" placeholder="Commercial Creations" value="' + av(sed.manufacturer) + '"></div></div>' +
      '<div class="row"><div><label>' + L("slExp") + '</label><input id="sl-exp" type="date" value="' + (sediting && sed.exp ? (sed.exp + "").slice(0, 10) : "") + '"></div>' +
      '<div><label>' + L("slWeight") + '</label><input id="sl-wt" type="number" min="0" step="0.1" placeholder="0" value="' + (sediting && Number(sed.weight) ? Number(sed.weight) : "") + '"></div>' +
      '<div style="align-self:end">' + opField() + '</div></div>' +
      '<button class="primary" onclick="UI.addSeasLot()">' + (sediting ? L("saveChanges") : L("addLot")) + '</button> ' +
      (sediting ? '<button class="ghost" style="margin-top:14px" onclick="UI.seasEditCancel()">' + L("ordCancel") + '</button>' : '<button class="ghost" style="margin-top:14px" onclick="UI.quarExpired()">' + L("quarantineExpired") + '</button>') +
      '<h2 class="sub2" style="margin-top:18px">' + L("seasLotsTitle") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("slProduct") + '</th><th>' + L("slLot") + '</th><th>' + L("slMfr") + '</th><th>' + L("slExp") +
      '</th><th class="right">' + L("slWeight") + '</th><th>' + L("status") + '</th><th data-nosort></th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function viewSeed() {
    const seeds = DB.items().filter(i => /^SEED-/.test(i.id));
    const sedt = seedEditId ? ((DB.seedLots ? DB.seedLots() : []).find(l => String(l.id) === String(seedEditId)) || {}) : {};
    const sdediting = !!(seedEditId && sedt.id);
    const av2 = x => esc(x == null ? "" : x);
    const opts = seeds.map(i => '<option value="' + i.id + '|' + esc(i.name) + '"' + (sdediting && sedt.seed_code === i.id ? ' selected' : '') + '>' + esc(i.name) + '</option>').join("");
    const sups = (Array.isArray(DB.recvSuppliers) && DB.recvSuppliers.length ? DB.recvSuppliers : ["Sunrich", "Other"]);
    const supOpts = sups.map(s => '<option' + (s === (sdediting && sedt.supplier ? sedt.supplier : "Sunrich") ? " selected" : "") + '>' + esc(s) + '</option>').join("");
    const lots = (DB.seedLots ? DB.seedLots() : []).slice().sort((a, b) => (a.received_at || a.created_at || "") < (b.received_at || b.created_at || "") ? 1 : -1);
    const body = lots.length ? lots.map(l => {
      const rec = String(l.received_date || l.received_at || "").slice(0, 10);
      const stat = l.status === "Quarantine" ? '<span class="pill out">' + L("quarTag") + '</span>' : '<span class="pill ok">' + L("goodTag") + '</span>';
      const act = l.status === "Quarantine"
        ? '<button class="ghost sm" onclick="UI.seedStatus(\'' + l.id + '\',\'Good\')">' + L("markGood") + '</button>'
        : '<button class="ghost sm danger" onclick="UI.seedStatus(\'' + l.id + '\',\'Quarantine\')">' + L("markQuar") + '</button>';
      return '<tr><td><b>' + esc(l.product || l.seed_code || "") + '</b></td><td>' + esc(l.lot || "—") + '</td><td class="muted sm">' + esc(l.supplier || "—") +
        '</td><td>' + (rec || "—") + '</td><td class="right">' + fmt(l.weight) + '</td><td>' + stat + '</td><td>' + act + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.seedEdit(\'' + l.id + '\')">&#9998;</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + L("noSeedLots") + '</td></tr>';
    const today = new Date().toISOString().slice(0, 10);
    return '<div class="card"><h2>' + L("seed") + '</h2><p class="hint">' + L("seedHint") + '</p>' +
      (sdediting ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("sdType") + '</label><select id="sd-type">' + opts + '</select></div>' +
      '<div><label>' + L("slLot") + '</label><input id="sd-lot" autocomplete="off" placeholder="# 4471" value="' + av2(sedt.lot) + '"></div>' +
      '<div><label>' + L("supplier") + '</label><select id="sd-sup">' + supOpts + '</select></div></div>' +
      '<div class="row"><div><label>' + L("sdReceived") + '</label><input id="sd-rec" type="date" value="' + (sdediting && sedt.received_date ? (sedt.received_date + "").slice(0, 10) : today) + '"></div>' +
      '<div><label>' + L("slWeight") + '</label><input id="sd-wt" type="number" min="0" step="0.1" placeholder="0" value="' + (sdediting && Number(sedt.weight) ? Number(sedt.weight) : "") + '"></div>' +
      '<div style="align-self:end">' + opField("Adriana") + '</div></div>' +
      '<button class="primary" onclick="UI.addSeedLot()">' + (sdediting ? L("saveChanges") : L("addLot")) + '</button>' +
      (sdediting ? ' <button class="ghost" style="margin-top:14px" onclick="UI.seedEditCancel()">' + L("ordCancel") + '</button>' : '') +
      '<h2 class="sub2" style="margin-top:18px">' + L("seedLotsTitle") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("sdType") + '</th><th>' + L("slLot") + '</th><th>' + L("supplier") + '</th><th>' + L("sdReceived") +
      '</th><th class="right">' + L("slWeight") + '</th><th>' + L("status") + '</th><th data-nosort></th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function viewSkus() {
    const all = (window.SMACKIN_SKUS || []);
    const rows = all.map(s => {
      const hay = ((s.s || "") + " " + (s.t || "") + " " + (s.c || "")).toLowerCase();
      return '<tr data-h="' + esc(hay) + '"><td><b>' + esc(s.s) + '</b></td><td>' + flavCell(s.t, flavorImgAny(s.t), true) + '</td><td class="right">' + esc(s.b) + '</td><td class="muted sm">' + esc(s.c || "—") + '</td></tr>';
    }).join("");
    return '<div class="card"><h2>' + L("skus") + '</h2><p class="hint">' + L("skusHint") + '</p>' +
      '<input id="sku-q" style="width:100%;max-width:420px" oninput="UI.skuFilter(this.value)" placeholder="' + L("skuSearchP") + '" autocomplete="off">' +
      '<div class="muted sm" id="sku-count" style="margin:8px 0">' + all.length + ' ' + L("skuCount") + '</div>' +
      '<table class="sortable"><thead><tr><th>' + L("skuCode") + '</th><th>' + L("skuTitle") + '</th><th class="right">' + L("skuBags") + '</th><th>' + L("skuComp") + '</th></tr></thead><tbody id="sku-body">' + rows + '</tbody></table></div>';
  }
  function viewStockBuild() {
    const oh = DB.stockBuild ? DB.stockBuild() : {};
    const val = k => Number((oh[k] || {}).on_hand) || 0;
    let gGoal = 0, gOn = 0;
    SB_ITEMS.forEach(i => { gGoal += i.goal; gOn += val(i.key); });
    const gPct = gGoal ? Math.round(gOn / gGoal * 100) : 0;
    const gToBuild = Math.max(gGoal - gOn, 0);
    const summary = '<div class="card"><h2>' + L("stockbuild") + '</h2><p class="hint">' + L("sbHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(gGoal) + '</div><div class="l">' + L("sbTotalGoal") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(gOn) + '</div><div class="l">' + L("sbOnHand") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(gToBuild) + '</div><div class="l">' + L("sbToBuild") + '</div></div>' +
      '<div class="kpi"><div class="n">' + gPct + '%</div><div class="l">' + L("sbComplete") + '</div></div></div>' +
      '<div style="margin-top:12px"><button class="ghost sm" onclick="UI.sbReportPdf()">&#11015; ' + L("dlPdf") + '</button> <button class="ghost sm" onclick="UI.sbReportXlsx()">&#11015; ' + L("dlExcel") + '</button></div></div>';
    const barCls = p => p >= 100 ? "ok" : p >= 50 ? "low" : "out";
    const rowHtml = i => {
      const on = val(i.key), goal = i.goal, toBuild = Math.max(goal - on, 0);
      const pct = goal ? Math.round(on / goal * 100) : 0;
      const pallets = i.pallet ? (Math.ceil(toBuild / i.pallet * 10) / 10) : null;
      return '<tr><td>' + flavCell(i.name, flavorImg(i.name), true) + '</td>' +
        '<td class="right muted">' + fmt(goal) + '</td>' +
        '<td class="right"><input class="sbin" type="number" min="0" step="1" value="' + on + '" onchange="UI.sbSet(\'' + i.key + '\',this.value)"></td>' +
        '<td class="right"><b>' + fmt(toBuild) + '</b></td>' +
        '<td class="right muted sm">' + (pallets != null ? pallets : "—") + '</td>' +
        '<td style="min-width:130px"><div class="sbbar"><span class="sbfill ' + barCls(pct) + '" style="width:' + Math.min(pct, 100) + '%"></span></div><span class="sm muted">' + pct + '%</span></td></tr>';
    };
    const thead = '<thead><tr><th>' + L("item") + '</th><th class="right">' + L("sbGoal") + '</th><th class="right">' + L("sbOnHand") + '</th><th class="right">' + L("sbToBuild") + '</th><th class="right">' + L("sbPallets") + '</th><th>' + L("sbDone") + '</th></tr></thead>';
    const catBlock = cat => {
      const items = SB_ITEMS.filter(i => i.cat === cat);
      let cGoal = 0, cOn = 0; items.forEach(i => { cGoal += i.goal; cOn += val(i.key); });
      const cPct = cGoal ? Math.round(cOn / cGoal * 100) : 0;
      const head = '<div class="suprow"><h2 class="sub2" style="margin:0">' + esc(cat) + '</h2><span class="muted sm">' + fmt(cOn) + ' / ' + fmt(cGoal) + ' (' + cPct + '%)</span></div>';
      let body = "";
      if (cat === "Others") {
        ["Retail", "E-Com", "12-Pack Boxes"].forEach(sub => {
          const subItems = items.filter(i => i.sub === sub);
          if (!subItems.length) return;
          const subLbl = sub === "Retail" ? L("sbRetail") : sub === "E-Com" ? L("sbEcom") : L("sb12pk");
          body += '<tr class="sbsub"><td colspan="6">' + esc(subLbl) + '</td></tr>' + subItems.map(rowHtml).join("");
        });
      } else { body = items.map(rowHtml).join(""); }
      return '<div class="card">' + head + '<div class="tblwrap"><table class="sbtable">' + thead + '<tbody>' + body + '</tbody></table></div></div>';
    };
    return summary + SB_CATS.map(catBlock).join("");
  }
  function isEcomItem(i) { return i.cat === "Others" && i.sub === "E-Com"; }
  function productionEntry(channel) {
    const isEcom = channel === "ecom";
    const items = SB_ITEMS.filter(i => isEcom ? isEcomItem(i) : !isEcomItem(i));
    const sel = items.find(i => i.key === rpSel) || null;
    const oh = DB.stockBuild ? DB.stockBuild() : {};
    const curOn = sel ? (Number((oh[sel.key] || {}).on_hand) || 0) : 0;
    const opts = items.map(i => '<option value="' + i.key + '"' + (i.key === rpSel ? ' selected' : '') + '>' + esc(i.cat + " - " + i.name) + '</option>').join("");
    const selBlock = sel
      ? '<div class="rpsel"><div class="rpname">' + esc(sel.cat) + ' &middot; <b>' + esc(sel.name) + '</b></div><div class="muted sm">' + L("rpCurrent") + ': <b>' + fmt(curOn) + '</b> / ' + fmt(sel.goal) + ' ' + esc(sel.unit) + '</div></div>'
      : '';
    const recent = rpRecent.length
      ? '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("qty") + '</th><th>' + L("when") + '</th></tr></thead><tbody>' +
        rpRecent.slice(0, 10).map(r => '<tr><td>' + esc(r.name) + '</td><td class="right"><b>+' + fmt(r.qty) + '</b></td><td class="muted sm">' + esc(r.t) + '</td></tr>').join("") + '</tbody></table>'
      : '<p class="muted">' + L("rpNone") + '</p>';
    const titleKey = isEcom ? "ecomprod" : "retailprod";
    const hintKey = isEcom ? "epHint" : "rpHint";
    // build-progress mini-summary for this channel
    let g = 0, o = 0; items.forEach(i => { g += i.goal; o += (Number((oh[i.key] || {}).on_hand) || 0); });
    const pct = g ? Math.round(o / g * 100) : 0;
    const prog = '<div class="kpis"><div class="kpi"><div class="n">' + fmt(o) + '</div><div class="l">' + L("sbOnHand") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(Math.max(g - o, 0)) + '</div><div class="l">' + L("sbToBuild") + '</div></div>' +
      '<div class="kpi"><div class="n">' + pct + '%</div><div class="l">' + L("sbComplete") + '</div></div></div>';
    return '<div class="card"><div class="suprow"><h2 style="margin:0">' + L(titleKey) + '</h2>' +
      '<button class="ghost sm" onclick="UI.rpPrint()">\u{1F5A8}\u{FE0F} ' + L("rpPrint") + '</button></div>' +
      '<p class="hint">' + L(hintKey) + '</p>' + prog +
      '<div class="scan"><label>' + L("rpScanP") + '</label><div class="scanrow"><input id="rp-scan" autocomplete="off" autofocus placeholder="' + L("rpScanP") + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();UI.rpScan();}">' +
      '<button type="button" class="cambtn" onclick="UI.cam(\'rp-scan\')">' + L("camera") + '</button></div></div>' +
      '<div class="row"><div><label>' + L("rpPickProduct") + '</label><select id="rp-pick" onchange="UI.rpPick(this.value)"><option value="">' + L("rpPickProduct") + '</option>' + opts + '</select></div>' +
      '<div><label>' + L("rpQty") + '</label><input id="rp-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div style="align-self:end">' + opField("Jesus") + '</div></div>' +
      selBlock +
      '<button class="primary" onclick="UI.rpAdd()">' + L("rpAdd") + '</button>' +
      '<h2 class="sub2" style="margin-top:18px">' + L("rpRecent") + '</h2>' + recent + '</div>';
  }
  function viewRetailProd() { return productionEntry("retail"); }
  function viewEcomProd() { return productionEntry("ecom"); }
  function viewQA() {
    const hold = [];
    ["QA-HOLD", "QUARANTINE"].forEach(z => DB.items().forEach(i => { const q = DB.atLoc(i.id, z); if (q > 0) hold.push({ i, z, q }); }));
    const body = hold.length ? hold.map(x =>
      '<tr><td><b>' + x.i.name + '</b><div class="muted sm">' + x.i.code + '</div></td><td>' + x.z + '</td>' +
      '<td class="right"><b>' + fmt(x.q) + '</b> ' + x.i.unit + '</td>' +
      '<td><button class="ghost sm" onclick="UI.qaConvert(\'' + x.i.id + '\',\'' + x.z + '\')">' + L("convertGood") + '</button>' +
      '<button class="ghost sm danger" onclick="UI.qaScrap(\'' + x.i.id + '\',\'' + x.z + '\')">' + L("scrapIt") + '</button></td></tr>').join("")
      : '<tr><td colspan="4" class="muted">' + L("qaEmpty") + '</td></tr>';
    return '<div class="card"><h2>' + L("qa") + '</h2><p class="hint">' + L("qaHint") + '</p>' +
      '<h2 class="sub2">' + L("qaTitle") + '</h2><table><thead><tr><th>' + L("item") + '</th><th>' + L("status") +
      '</th><th class="right">' + L("onhand") + '</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  // Build { location: {qty, items:[{name,code,qty,unit}]} } from raw stock rows in ONE pass.
  function locOccupancy() {
    const map = {};
    (DB.stock() || []).forEach(r => {
      const q = Number(r.qty) || 0; if (q <= 0) return;
      const it = DB.itemByCode(r.item_id) || { name: r.item_id, code: r.item_id, unit: "" };
      const e = map[r.location] || (map[r.location] = { qty: 0, items: [] });
      e.qty += q; e.items.push({ name: it.name, code: it.code, qty: q, unit: it.unit });
    });
    return map;
  }
  function locContentsCard(code, occ) {
    const e = occ[code];
    const rows = (e && e.items.length)
      ? e.items.map(x => '<tr><td>' + esc(x.name) + '</td><td class="right"><b>' + fmt(x.qty) + '</b> ' + esc(x.unit) + '</td><td class="muted sm">' + esc(x.code) + '</td></tr>').join("")
      : '<tr><td colspan="3" class="muted">' + L("locNothing") + '</td></tr>';
    return '<div class="card locsel"><div class="suprow"><h2 class="loc" style="margin:0">' + L("locSlot") + ' ' + esc(code) + '</h2>' +
      '<button class="ghost sm" onclick="UI.locPick(\'\')">&#10005;</button></div>' +
      '<table><tbody>' + rows + '</tbody></table></div>';
  }
  function rackSectionHtml(sec, bays, occ) {
    const levels = ["L4", "L3", "L2", "L1"]; // top to floor
    let used = 0, total = 0;
    let head = '<tr><th class="rk-lvl"></th>';
    for (let b = 1; b <= bays; b++) head += '<th class="rk-bay">' + String(b).padStart(2, "0") + '</th>';
    head += '</tr>';
    const body = levels.map(lv => {
      let tds = '<td class="rk-lvl">' + lv + '</td>';
      for (let b = 1; b <= bays; b++) {
        const code = sec + "-" + String(b).padStart(2, "0") + "-" + lv;
        const blocked = BLOCKED_SLOTS.has(code);
        const has = occ[code] && occ[code].qty > 0;
        if (!blocked) total++;
        if (has) used++;
        const cls = blocked ? "blocked" : has ? "occ" : "empty";
        const sel = locSel === code ? " sel" : "";
        const title = blocked ? code + " (blocked)" : has ? code + " - " + occ[code].items.length + " item(s)" : code + " (empty)";
        tds += '<td class="rk-cell"><span class="slot ' + cls + sel + '" title="' + esc(title) + '"' +
          (blocked ? "" : ' onclick="UI.locPick(\'' + code + '\')"') + '></span></td>';
      }
      return '<tr>' + tds + '</tr>';
    }).join("");
    return '<div class="racksec"><div class="suprow"><h3 style="margin:0">' + L("locSection") + ' ' + sec + '</h3>' +
      '<span class="muted sm">' + used + ' / ' + total + ' ' + L("locBaysUsed") + '</span></div>' +
      '<div class="tblwrap"><table class="rackgrid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
  }
  function zoneTileHtml(code, occ) {
    const has = occ[code] && occ[code].qty > 0;
    const sel = locSel === code ? " sel" : "";
    return '<div class="ztile ' + (has ? "occ" : "empty") + sel + '" onclick="UI.locPick(\'' + code + '\')">' +
      '<div class="zc">' + esc(code) + '</div>' + (has ? '<div class="zq">' + occ[code].items.length + '</div>' : '') + '</div>';
  }
  function viewLocationsMap() {
    const occ = locOccupancy();
    const cfg = DB.config || { sections: ["A", "B", "C", "D"], baysPerSection: 28, docks: [11,12,13,14,15,16,17,18,19],
      zones: ["RECEIVING","RETURNS","QUARANTINE","WIP","PACKOUT","CAGE","PROD-WEIGH","PROD-PACK","SHIPPING","ST-01","ST-02","ST-03","ST-04","ST-05","ST-06","ST-07","ST-08"] };
    const legend = '<div class="racklegend"><span class="rl"><span class="slot occ"></span>' + L("locOccupied") + '</span>' +
      '<span class="rl"><span class="slot empty"></span>' + L("locEmpty") + '</span>' +
      '<span class="rl"><span class="slot blocked"></span>' + L("locBlocked") + '</span></div>';
    const sections = (cfg.sections || []).map(s => rackSectionHtml(s, cfg.baysPerSection || 28, occ)).join("");
    // docks strip (19 office end .. 11 far end)
    const docks = (cfg.docks || []).slice().sort((a, b) => b - a).map(d => zoneTileHtml("DOCK-" + d, occ)).join("");
    const zones = (cfg.zones || []).map(z => zoneTileHtml(z, occ)).join("");
    const sel = locSel ? locContentsCard(locSel, occ) : "";
    return '<div class="card"><div class="suprow"><h2 style="margin:0">' + L("locations") + '</h2>' +
      '<div class="ordtabs"><button class="' + (locView === "floor" ? "active" : "") + '" onclick="UI.locView(\'floor\')">' + L("locFloor") + '</button><button class="' + (locView === "map" ? "active" : "") + '" onclick="UI.locView(\'map\')">' + L("locMap") + '</button>' +
      '<button class="' + (locView === "list" ? "active" : "") + '" onclick="UI.locView(\'list\')">' + L("locList") + '</button></div></div>' +
      '<p class="hint">' + L("locClickHint") + '</p>' + legend + '</div>' +
      sel +
      '<div class="card"><div class="rackmap">' + sections + '</div></div>' +
      '<div class="card"><h2 class="sub2">' + L("locDocks") + '</h2><p class="hint" style="margin-bottom:8px">19 = ' + L("locOfficeEnd") + ' &middot; 11 = ' + L("locFarEnd") + '</p><div class="ztiles">' + docks + '</div>' +
      '<h2 class="sub2" style="margin-top:16px">' + L("locZones") + '</h2><div class="ztiles">' + zones + '</div></div>';
  }
  function viewLocationsList() {
    const used = DB.allLocations().filter(loc => DB.items().some(i => DB.atLoc(i.id, loc) > 0));
    const head = '<div class="card"><div class="suprow"><h2 style="margin:0">' + L("locations") + '</h2>' +
      '<div class="ordtabs"><button class="' + (locView === "floor" ? "active" : "") + '" onclick="UI.locView(\'floor\')">' + L("locFloor") + '</button><button class="' + (locView === "map" ? "active" : "") + '" onclick="UI.locView(\'map\')">' + L("locMap") + '</button>' +
      '<button class="' + (locView === "list" ? "active" : "") + '" onclick="UI.locView(\'list\')">' + L("locList") + '</button></div></div>' +
      '<p class="hint">' + L("locHint") + '</p></div>';
    if (!used.length) return head + '<div class="card"><p class="muted">' + L("locNothing") + '</p></div>';
    return head + used.map(loc => {
      const here = DB.items().map(i => ({ i, q: DB.atLoc(i.id, loc) })).filter(x => x.q > 0);
      const body = here.map(x => '<tr><td>' + x.i.name + '</td><td class="right"><b>' + fmt(x.q) + '</b> ' + x.i.unit + '</td><td class="muted sm">' + x.i.code + '</td></tr>').join("");
      return '<div class="card"><h2 class="loc">' + loc + '</h2><table><tbody>' + body + '</tbody></table></div>';
    }).join("");
  }
  function viewLocationsFloor() {
    const occ = locOccupancy();
    const cfg = DB.config || { docks: [11,12,13,14,15,16,17,18,19],
      zones: ["RECEIVING","RETURNS","QUARANTINE","WIP","PACKOUT","CAGE","PROD-WEIGH","PROD-PACK","SHIPPING","ST-01","ST-02","ST-03","ST-04","ST-05","ST-06","ST-07","ST-08"] };
    // racking run: light-blue rect, clickable -> rack grid; optional big section letter
    const rk = (x, y, w, h, lbl, vert) => {
      let t = "";
      if (lbl) { const cx = x + w / 2, cy = y + h / 2;
        t = vert ? '<text x="' + cx + '" y="' + cy + '" class="fp-sec" text-anchor="middle" transform="rotate(-90 ' + cx + ' ' + cy + ')">' + lbl + '</text>'
                 : '<text x="' + cx + '" y="' + (cy + 3) + '" class="fp-sec" text-anchor="middle">' + lbl + '</text>'; }
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="#E1EEF7" stroke="#006DB6" class="fp-rk" onclick="UI.locView(\'map\')"><title>' + L("locStorage") + '</title></rect>' + t;
    };
    const box = (x, y, w, h, fill, stroke, lines, cls) => {
      const t = lines.map((ln, i) => '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 - (lines.length - 1) * 6 + i * 11 + 3) + '" text-anchor="middle" class="' + cls + '">' + esc(ln) + '</text>').join("");
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + fill + '" stroke="' + stroke + '"/>' + t;
    };
    const svg = '<svg viewBox="88 28 576 384" xmlns="http://www.w3.org/2000/svg" class="floorplan">' +
      '<rect x="93" y="35" width="563" height="366" rx="6" fill="none" stroke="#04223B" stroke-width="2"/>' +
      // racking runs (A/B/C/D letters are a best guess)
      rk(101, 37, 374, 16, "A?", false) +
      rk(101, 64, 13, 110, "", true) + rk(120, 64, 13, 110, "B?", true) + rk(138, 64, 13, 110, "", true) +
      rk(101, 185, 13, 110, "", true) + rk(120, 185, 13, 110, "C?", true) + rk(138, 185, 13, 110, "", true) +
      rk(342, 64, 87, 15, "", false) +
      rk(440, 86, 14, 110, "", true) +
      rk(484, 64, 13, 99, "D?", true) + rk(484, 174, 13, 82, "", true) +
      // production & transfer boxes
      box(200, 64, 98, 110, "#04223B", "#04223B", ["E-COM", "pick line"], "fp-wht") +
      box(254, 196, 131, 110, "#E1EEF7", "#006DB6", ["FULFILLMENT", "Lines 1 & 2 + conveyor"], "fp-lbl") +
      box(271, 312, 99, 19, "#04223B", "#04223B", ["Fulfillment desk -> door"], "fp-wht") +
      box(506, 42, 140, 120, "#E0F4E8", "#00A341", ["P-MAC / BAGGING", "packaging line"], "fp-lbl") +
      box(506, 168, 140, 88, "#E0F4E8", "#00A341", ["MIXING", "weigh / blend / coat"], "fp-lbl") +
      box(506, 261, 140, 131, "#04223B", "#04223B", ["OFFICE SUITE", "R&D / control"], "fp-wht") +
      box(101, 382, 374, 13, "#F2C61E", "#B58A00", ["DOCK DOORS   19 (office) -> 11 (far)"], "fp-dk") +
      box(101, 360, 50, 19, "#FBE3E0", "#B52024", ["FIRE"], "fp-red") +
      box(347, 338, 50, 15, "#FBE3E0", "#B52024", ["FIRE"], "fp-red") +
      box(583, 374, 55, 16, "#FDE6CF", "#C77B07", ["FRONT"], "fp-red") +
      '</svg>';
    const sel = locSel ? locContentsCard(locSel, occ) : "";
    const docks = (cfg.docks || []).slice().sort((a, b) => b - a).map(d => zoneTileHtml("DOCK-" + d, occ)).join("");
    const zones = (cfg.zones || []).map(z => zoneTileHtml(z, occ)).join("");
    return '<div class="card"><div class="suprow"><h2 style="margin:0">' + L("locations") + '</h2>' +
      '<div class="ordtabs"><button class="active" onclick="UI.locView(\'floor\')">' + L("locFloor") + '</button>' +
      '<button onclick="UI.locView(\'map\')">' + L("locMap") + '</button>' +
      '<button onclick="UI.locView(\'list\')">' + L("locList") + '</button></div></div>' +
      '<p class="hint">' + L("locFloorNote") + '</p></div>' +
      sel +
      '<div class="card"><div class="fpwrap">' + svg + '</div></div>' +
      '<div class="card"><h2 class="sub2">' + L("locDocks") + '</h2><div class="ztiles">' + docks + '</div>' +
      '<h2 class="sub2" style="margin-top:16px">' + L("locStaging") + '</h2><div class="ztiles">' + zones + '</div></div>';
  }
  function viewLocations() { return locView === "list" ? viewLocationsList() : locView === "floor" ? viewLocationsFloor() : viewLocationsMap(); }
  const PO_PILL = { draft:"low", ordered:"low", partial:"low", received:"ok", cancelled:"out" };
  function poStatusPill(s) { return '<span class="pill ' + (PO_PILL[s] || "low") + '">' + L("st_" + s) + '</span>'; }
  function suggestQty(i) { const oh = DB.onHand(i.id); return Math.max(i.reorder - oh, Math.round(i.reorder * 0.5)); }

  function viewPurchasing() {
    if (purchMode === "new") return viewPONew();
    let html = '<div class="card"><div class="suprow"><h2>' + L("purchasing") + '</h2>' +
      '<button class="primary sm" onclick="UI.poNew(\'\')">+ ' + L("newPO") + '</button></div>' +
      '<p class="hint">' + L("purchHint") + '</p></div>';

    // --- reorder suggestions, grouped by supplier ---
    const low = DB.items().filter(i => statusOf(i) !== "ok" && i.supplier);
    if (low.length) {
      const bySup = {}; low.forEach(i => { (bySup[i.supplier] = bySup[i.supplier] || []).push(i); });
      html += '<div class="card"><h2 class="sub2">' + L("reorderSug") + '</h2>';
      Object.keys(bySup).forEach(sk => {
        const sup = (DB.suppliers().find(s => s.id === sk)) || { name: sk, order_url: "#" };
        const rows = bySup[sk].map(i => '<tr><td><b>' + i.name + '</b><div class="muted sm">' + i.code + '</div></td>' +
          '<td class="right">' + fmt(DB.onHand(i.id)) + ' ' + i.unit + '</td><td class="right muted">' + fmt(i.reorder) +
          '</td><td class="right"><b>' + fmt(suggestQty(i)) + '</b> ' + i.unit + '</td></tr>').join("");
        html += '<div class="poblock"><div class="suprow"><h3 class="sup">' + sup.name + '</h3><span>' +
          '<a class="order" href="' + sup.order_url + '" target="_blank" rel="noopener">' + L("order") + ' &#8599;</a> ' +
          '<button class="ghost sm" onclick="UI.poNew(\'' + sk + '\')">' + L("createDraft") + '</button></span></div>' +
          '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th class="right">' + L("reorder") +
          '</th><th class="right">' + L("need") + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="card"><p class="ok pill big">' + L("allgood") + '</p></div>';
    }

    // --- existing purchase orders ---
    const pos = DB.purchaseOrders();
    html += '<div class="card"><h2 class="sub2">' + L("purchOrders") + '</h2>';
    html += pos.length ? pos.map(poCard).join("") : '<p class="muted">' + L("noPOs") + '</p>';
    html += '</div>';
    return html;
  }

  function poCard(po) {
    const receiving = receivingPOid === po.id;
    const total = po.lines.reduce((s, l) => s + l.qty * (l.cost || 0), 0);
    const rows = po.lines.map((l, idx) => {
      const it = DB.items().find(i => i.id === l.item_id) || { name: l.item_id, code: "", unit: "" };
      const out = l.qty - l.received;
      let recvInput = "";
      if (receiving) recvInput = out > 0
        ? '<td><input id="rcv-' + po.id + '-' + idx + '" type="number" min="0" max="' + out + '" value="' + out + '"></td>'
        : '<td class="muted sm">&#10003;</td>';
      return '<tr><td>' + it.name + '<div class="muted sm">' + (it.code || "") + '</div></td>' +
        '<td class="right">' + fmt(l.qty) + ' ' + it.unit + '</td>' +
        '<td class="right">' + fmt(l.received) + '</td>' +
        '<td class="right muted">' + fmt(out) + '</td>' +
        '<td class="right muted">' + (l.cost ? money(l.cost) : "&mdash;") + '</td>' + recvInput + '</tr>';
    }).join("");
    let actions = "";
    if (po.status === "draft") actions =
      '<button class="ghost sm" onclick="UI.poOrder(\'' + po.id + '\')">' + L("markOrdered") + '</button>' +
      '<button class="ghost sm danger" onclick="UI.poDelete(\'' + po.id + '\')">' + L("deletePO") + '</button>';
    else if (po.status === "ordered" || po.status === "partial") actions = receiving
      ? '<button class="primary sm" onclick="UI.poReceiveConfirm(\'' + po.id + '\')">' + L("confirmReceipt") + '</button>' +
        '<button class="ghost sm" onclick="UI.poReceiveCancel()">' + L("backList") + '</button>'
      : '<button class="primary sm" onclick="UI.poReceiveOpen(\'' + po.id + '\')">' + L("receivePO") + '</button>' +
        '<button class="ghost sm danger" onclick="UI.poCancel(\'' + po.id + '\')">' + L("cancelPO") + '</button>';
    const meta = (po.expected ? L("poExpected") + ": " + po.expected : "") + (total ? ' &middot; ' + L("poTotal") + " " + money(total) : "");
    return '<div class="poblock"><div class="suprow"><h3>' + po.id + ' &middot; ' + DB.supplierName(po.supplier) + ' ' + poStatusPill(po.status) + '</h3>' +
      '<span class="muted sm">' + meta + '</span></div>' +
      '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("orderedQ") + '</th><th class="right">' + L("received") +
      '</th><th class="right">' + L("outstanding") + '</th><th class="right">' + L("poCost") + '</th>' +
      (receiving ? '<th class="right">' + L("recvNow") + '</th>' : "") + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      (actions ? '<div class="poactions">' + actions + '</div>' : "") + '</div>';
  }

  function viewPONew() {
    const sups = DB.suppliers();
    const sk = purchSup || (sups[0] && sups[0].id) || "";
    const supItems = DB.items().filter(i => i.supplier === sk);
    const supOpts = sups.map(s => '<option value="' + s.id + '"' + (s.id === sk ? " selected" : "") + '>' + s.name + '</option>').join("");
    const rows = supItems.map(i => {
      const sugg = statusOf(i) !== "ok" ? suggestQty(i) : "";
      return '<tr><td>' + i.name + '<div class="muted sm">' + i.code + '</div></td>' +
        '<td class="right muted">' + fmt(DB.onHand(i.id)) + ' ' + i.unit + '</td>' +
        '<td><input id="poq-' + i.id + '" type="number" min="0" value="' + sugg + '"></td>' +
        '<td><input id="poc-' + i.id + '" type="number" min="0" step="0.01" placeholder="0.00"></td></tr>';
    }).join("");
    return '<div class="card"><div class="suprow"><h2>' + L("newPO") + '</h2>' +
      '<button class="ghost sm" onclick="UI.poBack()">' + L("backList") + '</button></div>' +
      '<div class="row"><div><label>' + L("chooseSupplier") + '</label><select id="po-sup" onchange="UI.poSupChange()">' + supOpts + '</select></div>' +
      '<div><label>' + L("poExpected") + '</label><input id="po-exp" type="date"></div></div>' +
      '<p class="hint">' + L("addLines") + '</p>' +
      (supItems.length
        ? '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th>' + L("qty") + '</th><th>' + L("poCost") + ' $</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="muted">&mdash;</p>') +
      opField() + '<button class="primary" onclick="UI.poSave()">' + L("savePO") + '</button></div>';
  }
  function viewLabels() {
    return '<div class="card"><h2>' + L("labels") + '</h2><p class="hint">' + L("labelsHint") + '</p>' +
      '<button class="ghost" onclick="UI.labels(\'loc\')">' + L("printLoc") + '</button>' +
      '<button class="ghost" onclick="UI.labels(\'item\')">' + L("printItem") + '</button>' +
      '<button class="ghost" onclick="UI.labels(\'lpn\')">' + L("newLpn") + '</button>' +
      '<div id="labelArea"></div></div>';
  }
  function viewDept(nameKey) {
    return '<div class="card"><h2>' + L(nameKey) + '</h2>' +
      '<p class="hint">' + L("deptSoon") + '</p>' +
      '<div class="deptplaceholder"><i class="navico depticon" data-lucide="' + (NAV_ICON[nameKey] || "circle") + '"></i></div></div>';
  }
  function viewConsume(dept, titleKey) {
    const list = DB.consumption().filter(c => c.department === dept)
      .slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 60);
    const rows = list.length ? list.map(c => '<tr><td><b>' + esc(c.item_code) + '</b>' +
        (c.item_name ? '<div class="muted sm">' + esc(c.item_name) + '</div>' : '') + '</td>' +
        '<td class="right">' + fmt(c.qty) + '</td><td class="sm">' + esc(c.lot || "") + '</td>' +
        '<td class="muted sm">' + esc(c.operator || "") + '</td>' +
        '<td class="muted sm">' + (c.created_at ? String(c.created_at).slice(0, 16).replace("T", " ") : "") + '</td></tr>').join("")
      : '<tr><td colspan="5" class="muted">' + L("conNone") + '</td></tr>';
    return '<div class="card"><h2>' + L(titleKey) + '</h2><p class="hint">' + L("conHint") + '</p>' +
      itemScan("con-code", "con-qty") +
      '<div class="row"><div><label>' + L("qty") + '</label><input id="con-qty" type="number" min="0" step="any" inputmode="decimal" placeholder="' + L("enter") + '"></div>' +
      '<div><label>' + L("conLot") + '</label><input id="con-lot" autocomplete="off" placeholder="LOT..."></div></div>' +
      opField() +
      '<button class="primary" onclick="UI.consume(\'' + dept + '\')">' + L("conBtn") + '</button>' +
      '<h3 class="sub2" style="margin-top:16px">' + L("conRecent") + '</h3>' +
      '<table class="sortable"><thead><tr><th>' + L("conMat") + '</th><th class="right">' + L("qty") + '</th><th>' + L("conLot") + '</th><th>' + L("conBy") + '</th><th>' + L("conWhen") + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function viewFinishedBags() {
    const b4 = DB.items().filter(i => i.category === "bag4");
    const b15 = DB.items().filter(i => i.category === "bag15");
    const flavors = Array.from(new Set(b4.concat(b15).map(i => i.flavor))).sort();
    const on = (arr, fl) => { const it = arr.find(i => i.flavor === fl); return it ? DB.onHand(it.id) : null; };
    let t4 = 0, t15 = 0;
    const rows = flavors.map(fl => {
      const o4 = on(b4, fl), o15 = on(b15, fl);
      if (o4) t4 += o4; if (o15) t15 += o15;
      const img = flavorImg(fl);
      const nameCell = '<div class="flavcell">' + (img ? '<img class="flavimg" src="' + img + '" alt="" loading="lazy">' : '<span class="flavimg ph"></span>') + '<b>' + esc(fl) + '</b></div>';
      return '<tr><td>' + nameCell + '</td><td class="right">' + (o4 != null ? fmt(o4) : "&mdash;") + '</td><td class="right">' + (o15 != null ? fmt(o15) : "&mdash;") + '</td></tr>';
    }).join("");
    return '<div class="card"><h2>' + L("finbags") + '</h2><p class="hint">' + L("fbHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(t4) + '</div><div class="l">' + L("fb4oz") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(t15) + '</div><div class="l">' + L("fb15oz") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(t4 + t15) + '</div><div class="l">' + L("fbTotal") + '</div></div></div>' +
      '<table class="sortable" style="margin-top:12px"><thead><tr><th>' + L("hFlavor") + '</th><th class="right">' + L("fb4oz") + '</th><th class="right">' + L("fb15oz") + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function viewPmacOut() {
    const bags = DB.items().filter(i => i.category === "bag4" || i.category === "bag15");
    const opts = bags.map(i => '<option value="' + i.id + '"' + (i.id === pmoSel ? " selected" : "") + '>' + esc(i.name) + '</option>').join("");
    const sel = bags.find(i => i.id === pmoSel);
    const selBlock = sel ? '<div class="rpsel"><div class="rpname"><b>' + esc(sel.name) + '</b></div><div class="muted sm">' + L("rpCurrent") + ': <b>' + fmt(DB.onHand(sel.id)) + '</b> ' + esc(sel.unit) + '</div></div>' : "";
    const recent = pmoRecent.length
      ? '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("qty") + '</th><th>' + L("when") + '</th></tr></thead><tbody>' +
        pmoRecent.slice(0, 12).map(r => '<tr><td>' + esc(r.name) + '</td><td class="right"><b>+' + fmt(r.qty) + '</b></td><td class="muted sm">' + esc(r.t) + '</td></tr>').join("") + '</tbody></table>'
      : '<p class="muted">' + L("pmoNone") + '</p>';
    return '<div class="card"><h2>' + L("pmacout") + '</h2><p class="hint">' + L("pmoHint") + '</p>' +
      '<div class="row"><div><label>' + L("pmoRunning") + '</label><select id="pmo-sel" onchange="UI.pmoPick(this.value)"><option value="">' + L("pmoRunning") + '</option>' + opts + '</select></div>' +
      '<div><label>' + L("pmoQty") + '</label><input id="pmo-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div style="align-self:end">' + opField("Jesus") + '</div></div>' + selBlock +
      '<button class="primary" onclick="UI.pmoAdd()">' + L("pmoAdd") + '</button>' +
      '<h2 class="sub2" style="margin-top:18px">' + L("rpRecent") + '</h2>' + recent + '</div>';
  }
  function viewImprove() {
    const all = DB.improvements().slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const active = all.filter(i => i.status !== "Done");
    const wins = all.filter(i => i.status === "Done");
    const list = ciView === "wins" ? wins : active;
    const ideas = all.filter(i => i.status === "Idea").length;
    const inprog = all.filter(i => i.status === "In Progress").length;
    const ed = ciEditId ? (all.find(x => String(x.id) === String(ciEditId)) || {}) : {};
    const editing = !!(ciEditId && ed.id);
    const av = x => esc(x == null ? "" : x);
    const sel = (arr, cur, def) => arr.map(t => '<option' + (t === (cur != null && cur !== "" ? cur : def) ? " selected" : "") + '>' + t + '</option>').join("");
    const toggle = '<div class="ordtabs">' +
      '<button class="' + (ciView === "active" ? "active" : "") + '" onclick="UI.ciView(\'active\')">' + L("ciActive") + ' (' + active.length + ')</button>' +
      '<button class="' + (ciView === "wins" ? "active" : "") + '" onclick="UI.ciView(\'wins\')">' + L("ciWins") + ' (' + wins.length + ')</button></div>';
    const showForm = ciAddOpen || editing;
    const today = new Date().toISOString().slice(0, 10);
    const form = showForm ? ('<div class="ordform">' +
      (editing ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div><label>' + L("ciTitle") + '</label><input id="ci-title" autocomplete="off" value="' + av(ed.title) + '" placeholder="' + L("ciTitleP") + '"></div>' +
      '<div class="row"><div><label>' + L("ciType") + '</label><select id="ci-type">' + sel(CI_TYPES, ed.ci_type, "5S") + '</select></div>' +
      '<div><label>' + L("ciArea") + '</label><select id="ci-area">' + sel(CI_AREAS, ed.area, "Fulfillment") + '</select></div>' +
      '<div><label>' + L("ciOwner") + '</label><input id="ci-owner" list="dl-ci-owner" autocomplete="off" value="' + av(ed.owner) + '"></div></div>' +
      '<div class="row"><div><label>' + L("ciPriority") + '</label><select id="ci-priority">' + sel(CI_PRIORITIES, ed.priority, "Medium") + '</select></div>' +
      '<div><label>' + L("ciStatus") + '</label><select id="ci-status">' + sel(CI_STATUSES, ed.status, "Idea") + '</select></div>' +
      '<div><label>' + L("ciOpened") + '</label><input id="ci-opened" type="date" value="' + (editing && ed.opened_date ? (ed.opened_date + "").slice(0, 10) : today) + '"></div></div>' +
      '<div><label>' + L("ciProblem") + '</label><input id="ci-problem" autocomplete="off" value="' + av(ed.problem) + '" placeholder="' + L("ciProblemP") + '"></div>' +
      '<div><label>' + L("ciImpact") + ' <span class="muted">(' + L("ciImpactHint") + ')</span></label><input id="ci-impact" autocomplete="off" value="' + av(ed.impact) + '" placeholder="' + L("ciImpactP") + '"></div>' +
      opField("Troy") +
      '<button class="primary" onclick="UI.ciSave()">' + (editing ? L("saveChanges") : L("ciAdd")) + '</button> ' +
      '<button class="ghost" style="margin-top:14px" onclick="UI.' + (editing ? "ciEditCancel" : "ciAddToggle") + '()">' + L("ordCancel") + '</button></div>') : "";
    const ownerDl = '<datalist id="dl-ci-owner">' + CI_OWNERS.map(n => '<option value="' + n + '"></option>').join("") + '</datalist>';
    const prC = p => p === "High" ? "out" : p === "Low" ? "" : "low";
    const stC = s => s === "Done" ? "ok" : s === "In Progress" ? "low" : "";
    const nextStatus = { "Idea": "In Progress", "In Progress": "Done", "On Hold": "In Progress" };
    const rows = list.length ? list.map(i => {
      const txt = ((i.title || "") + " " + (i.ci_type || "") + " " + (i.area || "") + " " + (i.owner || "") + " " + (i.status || "") + " " + (i.impact || "")).toLowerCase().replace(/"/g, "");
      const nxt = nextStatus[i.status];
      const adv = nxt ? '<button class="ghost sm" onclick="UI.ciStatus(\'' + i.id + '\',\'' + nxt + '\')">' + esc(nxt) + '</button>'
        : (i.status === "Done" ? '<button class="ghost sm" onclick="UI.ciStatus(\'' + i.id + '\',\'In Progress\')">' + L("ciReopen") + '</button>' : '');
      const nameCell = '<td><b>' + esc(i.title || "") + '</b>' + (i.problem ? '<div class="muted sm">' + esc(i.problem) + '</div>' : '') + '</td>';
      const mid = ciView === "wins"
        ? '<td class="muted sm">' + ((i.completed_date || "").slice(0, 10) || "&mdash;") + '</td><td>' + (i.impact ? '<span class="sm">' + esc(i.impact) + '</span>' : '&mdash;') + '</td>'
        : '<td><span class="pill ' + prC(i.priority) + '">' + esc(i.priority || "") + '</span></td><td><span class="pill ' + stC(i.status) + '">' + esc(i.status || "") + '</span></td>';
      return '<tr data-txt="' + txt + '">' + nameCell +
        '<td><span class="tag">' + esc(i.ci_type || "") + '</span></td>' +
        '<td class="sm">' + esc(i.area || "") + '</td>' +
        '<td class="muted sm">' + esc(i.owner || "") + '</td>' + mid +
        '<td>' + adv + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.ciEdit(\'' + i.id + '\')">&#9998;</button> <button class="ghost sm danger" onclick="UI.ciDelete(\'' + i.id + '\')">&#10005;</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + (ciView === "wins" ? L("ciNoWins") : L("ciNoActive")) + '</td></tr>';
    const head = ciView === "wins"
      ? '<tr><th>' + L("ciTitle") + '</th><th>' + L("ciType") + '</th><th>' + L("ciArea") + '</th><th>' + L("ciOwner") + '</th><th>' + L("ciCompleted") + '</th><th>' + L("ciImpact") + '</th><th data-nosort></th></tr>'
      : '<tr><th>' + L("ciTitle") + '</th><th>' + L("ciType") + '</th><th>' + L("ciArea") + '</th><th>' + L("ciOwner") + '</th><th>' + L("ciPriority") + '</th><th>' + L("ciStatus") + '</th><th data-nosort></th></tr>';
    return ownerDl + '<div class="card"><div class="suprow"><h2 style="margin:0">' + L("improve") + '</h2>' +
      '<button class="primary sm" onclick="UI.ciAddToggle()">' + L("ciAdd") + '</button></div>' +
      '<p class="hint">' + L("ciHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + ideas + '</div><div class="l">' + L("ciIdeas") + '</div></div>' +
      '<div class="kpi"><div class="n">' + inprog + '</div><div class="l">' + L("ciInProgress") + '</div></div>' +
      '<div class="kpi ok"><div class="n">' + wins.length + '</div><div class="l">' + L("ciWins") + '</div></div></div>' +
      toggle + form +
      '<input id="ciSearch" autocomplete="off" style="margin-top:10px" oninput="UI.ciSearch(this.value)" placeholder="' + L("ciSearchP") + '">' +
      '<table class="sortable" style="margin-top:10px"><thead>' + head + '</thead><tbody id="ciBody">' + rows + '</tbody></table></div>';
  }
  function viewMixing() { return viewConsume("Mixing", "mixing"); }
  function viewPmac() { return viewConsume("P-Mac", "pmac"); }
  function tenureStr(s) {
    if (!s) return "";
    const d = new Date(s + "T00:00:00"); if (isNaN(d.getTime())) return "";
    const now = new Date();
    let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) m = 0;
    const y = Math.floor(m / 12), mo = m % 12;
    return (y ? y + " " + L("hrYr") + " " : "") + mo + " " + L("hrMo");
  }
  function personCard(pr) {
    const init = (pr.n || "?").trim().slice(0, 1).toUpperCase();
    return '<div class="pcard"><div class="pav">' + esc(init) + '</div>' +
      '<div class="pmeta"><div class="pname">' + esc(pr.n) + '</div>' +
      '<div class="prole">' + esc(pr.r || "") + '</div>' +
      '</div></div>';
  }
  function orgHtml() {
    const kids = {};
    PEOPLE.forEach(p => { const m = p.m || "__root"; (kids[m] = kids[m] || []).push(p); });
    const names = new Set(PEOPLE.map(p => p.n));
    const roots = PEOPLE.filter(p => !p.m || !names.has(p.m));
    function node(p) {
      const ch = (kids[p.n] || []).slice().sort((a, b) => (a.r || "").localeCompare(b.r || "") || a.n.localeCompare(b.n));
      return '<li><div class="onode"><span class="oname">' + esc(p.n) + '</span><span class="orole">' + esc(p.r || "") + '</span></div>' +
        (ch.length ? '<ul>' + ch.map(node).join("") + '</ul>' : '') + '</li>';
    }
    return '<ul class="orgtree">' + roots.map(node).join("") + '</ul>';
  }
  function viewPeople() {
    if (!unlocked) return '<div class="card"><h2>' + L("people") + '</h2><p class="hint">' + L("hrGate") + '</p>' +
      '<button class="primary" onclick="UI.hrUnlock()">' + L("pinBtn") + '</button></div>';
    const toggle = '<div class="ordtabs">' +
      '<button class="' + (peopleView === "dir" ? "active" : "") + '" onclick="UI.peopleView(\'dir\')">' + L("hrDir") + ' (' + PEOPLE.length + ')</button>' +
      '<button class="' + (peopleView === "org" ? "active" : "") + '" onclick="UI.peopleView(\'org\')">' + L("hrOrg") + '</button></div>';
    let body;
    if (peopleView === "org") { body = orgHtml(); }
    else {
      const byDept = {};
      PEOPLE.forEach(p => { (byDept[p.d] = byDept[p.d] || []).push(p); });
      const order = ["Operations Management", "Fulfillment", "Operations", "Shipping", "Mixing", "Packaging", "Manufacturing", "Quality", "Technician", "Human Resources", "Executive", "Sales", "Marketing", "Contractor"];
      const depts = Object.keys(byDept).sort((a, b) => { const ia = order.indexOf(a), ib = order.indexOf(b); return ((ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)) || a.localeCompare(b); });
      body = '<input class="search" id="pSearch" autocomplete="off" placeholder="' + L("hrSearchP") + '" oninput="UI.peopleSearch(this.value)">' +
        depts.map(d => '<div class="pdept"><div class="pdepthead">' + esc(d || "Other") + ' <span class="muted">(' + byDept[d].length + ')</span></div>' +
          '<div class="pgrid">' + byDept[d].map(pr => '<div class="pcell" data-txt="' + esc((pr.n + ' ' + pr.r).toLowerCase()) + '">' + personCard(pr) + '</div>').join("") + '</div></div>').join("");
    }
    return '<div class="card"><h2>' + L("people") + '</h2><p class="hint">' + L("hrHint") + '</p>' + toggle + body + '</div>';
  }
  function viewLog() {
    const rows = DB.log().length ? DB.log().map(e =>
      '<tr><td class="muted sm">' + (e.t ? new Date(e.t).toLocaleString() : "") + '</td><td><b>' + e.a + '</b></td><td>' + e.d + '</td><td>' + e.u + '</td></tr>').join("")
      : '<tr><td colspan="4" class="muted">' + L("noLog") + '</td></tr>';
    return '<div class="card"><h2>' + L("log") + '</h2><table class="sortable"><thead><tr><th>' + L("when") + '</th><th>' + L("action") + '</th><th>' + L("detail") + '</th><th>' + L("operator") + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function viewSettings() {
    const c = DB.config || {};
    const layout = "Sections " + (c.sections || []).join("/") + ", " + (c.baysPerSection || "?") + " bays x " + ((c.levels || []).length) + " levels; docks 19-11. Snapshot " + DB.SNAPSHOT + ".";
    const MODEMSG = {
      cloud: { en: "CLOUD mode: connected to Supabase. All devices share live data.",
        es: "Modo NUBE: conectado a Supabase. Todos los dispositivos comparten datos.",
        pt: "Modo NUVEM: conectado ao Supabase. Todos os dispositivos compartilham dados ao vivo." },
      local: { en: "LOCAL mode: data saved only in this browser. Add Supabase keys in config.js to enable cloud + multi-scanner sync.",
        es: "Modo LOCAL: datos solo en este navegador. Agregue claves de Supabase en config.js para nube + multi-escaner.",
        pt: "Modo LOCAL: dados salvos apenas neste navegador. Adicione as chaves do Supabase em config.js para nuvem + multi-leitor." }
    };
    const modeLine = (MODEMSG[DB.mode === "cloud" ? "cloud" : "local"])[lang] || MODEMSG[DB.mode === "cloud" ? "cloud" : "local"].en;
    return '<div class="card"><h2>' + L("settings") + '</h2><p class="hint">' + L("settingsHint") + '</p>' +
      '<p><span class="pill ' + (DB.mode === "cloud" ? "ok" : "low") + '">' + (DB.mode === "cloud" ? L("cloud") : L("localmode")) + '</span></p>' +
      '<p class="footnote">' + modeLine + '</p><p class="footnote">' + layout + '</p>' +
      '<p style="margin-top:10px"><span class="pill ' + (unlocked ? "ok" : "low") + '">' + (unlocked ? L("unlocked") : L("locked")) + '</span>' +
      (unlocked ? ' <button class="ghost sm" onclick="UI.lock()">' + L("lockBtn") + '</button>' : "") + '</p>' +
      (DB.mode === "local" ? '<button class="ghost" onclick="UI.reset()">' + L("reset") + '</button>' : "") + '</div>';
  }

  // ---------- actions ----------
  const UI = {
    cat(c) { catFilter = c; render(); },
    locView(v) { locView = v; locSel = null; render(); },
    locPick(code) { locSel = code || null; render(); },
    lookup(inId, outId) { const o = $(outId); if (!o) return; const v = $(inId).value.trim();
      if (!v) { o.innerHTML = ""; return; } const it = DB.itemByCode(v);
      if (it) { o.className = "found"; o.innerHTML = "&#10003; " + L("found") + ": <b>" + it.name + "</b> &middot; " + L("onhand") + " " + fmt(DB.onHand(it.id)) + " " + it.unit; }
      else { o.className = "found notfound"; o.innerHTML = "&#10007; " + L("notfound"); } },
    async receive() {
      const v = id => { const e = $(id); return e ? (e.value || "") : ""; };
      const it = DB.itemByCode(v("r-code")); const q = parseFloat(v("r-qty")); const lot = v("r-lot").trim();
      if (!it) return toast(L("notfound")); if (!(q > 0)) return toast(L("enter"));
      const loc = v("r-loc").trim().toUpperCase();
      if (loc && !validLoc(loc)) return toast(L("badloc"));
      if (loc && BLOCKED_SLOTS.has(loc)) return toast("⛔ " + L("locBlocked"));
      const meta = { supplier: v("r-sup"), invoice: v("r-inv").trim(), category: v("r-cat"),
        pallets: v("r-pal"), condition: v("r-cond") || "Good", status: v("r-stat") || "Received", location: loc || "" };
      const r = await DB.receive(it, q, lot, $("op").value, meta);
      puSec = ""; puBay = ""; puLevel = "";
      toast("+" + fmt(q) + " " + it.name + (r && r.location ? " → " + r.location : "")); go("receive"); },
    // ---- Put-Away location picker (tap Section/Bay/Level, or scan/type the slot) ----
    _puField() { return $("r-loc") || $("p-loc"); },
    puPick(kind, val) {
      if (kind === "sec") puSec = (puSec === val ? "" : val);
      else if (kind === "bay") puBay = (puBay === val ? "" : val);
      else if (kind === "lvl") puLevel = (puLevel === val ? "" : val);
      const code = (puSec && puBay && puLevel) ? (puSec + "-" + puBay + "-" + puLevel) : "";
      const loc = UI._puField(); if (loc) loc.value = code;
      UI._puRefresh(code);
    },
    puZone(z) { puSec = ""; puBay = ""; puLevel = ""; const loc = UI._puField(); if (loc) loc.value = z; UI._puRefresh(z); },
    puSync() { const f = UI._puField(); const v = ((f ? f.value : "") || "").trim().toUpperCase(); const m = v.match(/^([A-E])-(\d{2})-(L[1-4])$/);
      if (m) { puSec = m[1]; puBay = m[2]; puLevel = m[3]; } else { puSec = ""; puBay = ""; puLevel = ""; } UI._puRefresh(v); },
    _puRefresh(code) {
      const c = $("pu-code"); if (c) c.textContent = code || "—";
      document.querySelectorAll(".pudest .pchip[data-k]").forEach(b => { const k = b.getAttribute("data-k"), val = b.getAttribute("data-v");
        b.classList.toggle("on", (k === "sec" && val === puSec) || (k === "bay" && val === puBay) || (k === "lvl" && val === puLevel)); });
      const w = $("pu-warn"); if (w) w.textContent = (code && BLOCKED_SLOTS.has(code)) ? ("⛔ " + L("locBlocked")) : "";
    },
    async put() { const it = DB.itemByCode($("p-code").value); const loc = ($("p-loc").value || "").trim().toUpperCase(); const q = parseFloat($("p-qty").value);
      if (!it) return toast(L("notfound")); if (!validLoc(loc)) return toast(L("badloc")); if (BLOCKED_SLOTS.has(loc)) return toast("⛔ " + L("locBlocked")); if (!(q > 0)) return toast(L("enter"));
      const r = await DB.move(it, "RECEIVING", loc, q, $("op").value); if (!r.ok) return toast(r.msg);
      puSec = ""; puBay = ""; puLevel = ""; toast(it.name + " → " + loc); go("putaway"); },
    // ---- Retail Production: scan product barcode -> qty -> add to Stock Build on-hand ----
    rpScan() { const v = (($("rp-scan") || {}).value || "").trim();
      const it = SB_ITEMS.find(i => i.key === v || i.key.toLowerCase() === v.toLowerCase());
      if (!it) return toast(L("rpNotFound"));
      rpSel = it.key; render(); setTimeout(() => { const q = $("rp-qty"); if (q) q.focus(); }, 40); },
    rpPick(v) { rpSel = v || ""; render(); },
    async rpAdd() { const it = SB_ITEMS.find(i => i.key === rpSel); const q = parseFloat(($("rp-qty") || {}).value);
      if (!it) return toast(L("rpNotFound")); if (!(q > 0)) return toast(L("enter"));
      const cur = Number((DB.stockBuild()[it.key] || {}).on_hand) || 0;
      await DB.setStockBuildOnHand(it.key, cur + q, opVal());
      rpRecent.unshift({ name: it.cat + " - " + it.name, qty: q, t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
      rpSel = ""; toast(L("rpAdded") + " +" + fmt(q)); render(); },
    rpPrint() {
      const w = window.open("", "_blank"); if (!w) return toast("Popup blocked - allow popups");
      const cards = SB_ITEMS.map(i => '<div class="c"><div class="cat">' + esc(i.cat) + '</div><div class="nm">' + esc(i.name) + '</div><svg class="bc" data-code="' + esc(i.key) + '"></svg></div>').join("");
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Retail Line Product Barcodes</title>' +
        '<scr' + 'ipt src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr' + 'ipt>' +
        '<style>body{font-family:Arial;margin:16px;color:#04223B}h1{font-size:18px}.grid{display:flex;flex-wrap:wrap;gap:10px}.c{border:1px solid #ccc;border-radius:8px;padding:8px 8px 4px;width:31%;box-sizing:border-box;text-align:center;page-break-inside:avoid}.cat{font-size:10px;color:#888;text-transform:uppercase;font-weight:bold}.nm{font-size:13px;font-weight:bold;margin:2px 0 4px}.bc{width:100%;height:56px}</style></head><body>' +
        '<h1>Smackin\' Snacks &mdash; Retail Line Product Barcodes</h1><div class="grid">' + cards + '</div>' +
        '<scr' + 'ipt>window.onload=function(){document.querySelectorAll(".bc").forEach(function(s){try{JsBarcode(s,s.getAttribute("data-code"),{format:"CODE128",displayValue:true,fontSize:9,height:42,margin:3});}catch(e){}});setTimeout(function(){window.print();},700);};</scr' + 'ipt>' +
        '</body></html>');
      w.document.close();
    },
    async move() { const it = DB.itemByCode($("m-code").value); const f = ($("m-from").value || "").trim().toUpperCase(); const t = ($("m-to").value || "").trim().toUpperCase(); const q = parseFloat($("m-qty").value);
      if (!it) return toast(L("notfound")); if (!validLoc(f) || !validLoc(t)) return toast(L("badloc")); if (!(q > 0)) return toast(L("enter"));
      const r = await DB.move(it, f, t, q, $("op").value); if (!r.ok) return toast(r.msg); toast(it.name + ": " + f + " -> " + t); go("move"); },
    async produce() { const id = $("pr-item").value; const q = parseFloat($("pr-qty").value); const loc = ($("pr-loc").value || "PACKOUT").trim().toUpperCase();
      if (!(q > 0)) return toast(L("enter")); if (!validLoc(loc)) return toast(L("badloc"));
      await DB.produce(id.replace("BAG4-", ""), q, loc, $("op").value); toast(fmt(q) + " bags produced"); go("produce"); },
    async count() { const it = DB.itemByCode($("c-code").value); const loc = ($("c-loc").value || "").trim().toUpperCase(); const q = parseFloat($("c-qty").value);
      if (!it) return toast(L("notfound")); if (!validLoc(loc)) return toast(L("badloc")); if (!(q >= 0)) return toast(L("newqty"));
      await DB.adjust(it, loc, q, $("op").value); toast(L("count") + " ok"); go("count"); },
    async reset() { if (confirm("Reset demo data?")) { await DB.resetDemo(); toast("reset"); go("dash"); } },
    // ---- Returns ----
    async doReturn() {
      const it = DB.itemByCode($("ret-code").value); const q = parseFloat($("ret-qty").value);
      if (!it) return toast(L("notfound")); if (!(q > 0)) return toast(L("enter"));
      const meta = { channel: $("ret-chan").value, reason: $("ret-reason").value,
        disposition: $("ret-disp").value, rma: ($("ret-rma").value || "").trim() };
      const r = await DB.returnStock(it, q, $("op").value, meta);
      toast(L("submitReturn") + " ✓" + (r.location ? " -> " + r.location : "")); go("returns");
    },
    // ---- Seasoning lots ----
    seasEdit(id) { seasEditId = id; render(); window.scrollTo(0, 0); },
    seasEditCancel() { seasEditId = null; render(); },
    async addSeasLot() {
      const pv = ($("sl-prod").value || "").split("|"); const wt = parseFloat($("sl-wt").value);
      if (!pv[0]) return toast(L("notfound")); if (!(wt > 0)) return toast(L("enter"));
      const rec = { flavor_code: pv[0], product: pv[1] || pv[0], lot: ($("sl-lot").value || "").trim(),
        manufacturer: ($("sl-mfr").value || "").trim(), exp: $("sl-exp").value || null, weight: wt };
      if (seasEditId) { await DB.updateSeasLot(seasEditId, rec, $("op").value); seasEditId = null; toast(L("saved") + " ✓"); render(); return; }
      await DB.addSeasLot(rec, $("op").value);
      toast(L("addLot") + " ✓"); go("seasoning");
    },
    async seasStatus(id, status) { await DB.setSeasLotStatus(id, status, opVal()); toast(status); },
    async quarExpired() { const n = await DB.quarantineExpiredSeas(opVal()); toast(n ? n + " -> " + L("quarTag") : L("allgood")); },
    seedEdit(id) { seedEditId = id; render(); window.scrollTo(0, 0); },
    seedEditCancel() { seedEditId = null; render(); },
    async addSeedLot() {
      const tv = (($("sd-type") || {}).value || "").split("|"); const wt = parseFloat(($("sd-wt") || {}).value);
      if (!tv[0]) return toast(L("notfound")); if (!(wt > 0)) return toast(L("enter"));
      const rec = { seed_code: tv[0], product: tv[1] || tv[0], lot: (($("sd-lot") || {}).value || "").trim(),
        supplier: ($("sd-sup") || {}).value || "", received_date: ($("sd-rec") || {}).value || null, weight: wt };
      if (seedEditId) { await DB.updateSeedLot(seedEditId, rec, opVal()); seedEditId = null; toast(L("saved") + " ✓"); render(); return; }
      await DB.addSeedLot(rec, opVal());
      toast(L("addLot") + " ✓"); go("seed");
    },
    async seedStatus(id, status) { await DB.setSeedLotStatus(id, status, opVal()); toast(status); },
    skuFilter(v) { const q = (v || "").toLowerCase().trim(); let n = 0;
      document.querySelectorAll('#sku-body tr').forEach(tr => { const show = !q || (tr.getAttribute('data-h') || "").indexOf(q) >= 0; tr.style.display = show ? "" : "none"; if (show) n++; });
      const c = document.getElementById('sku-count'); if (c) c.textContent = n + ' ' + L("skuCount"); },
    async sbSet(key, v) { await DB.setStockBuildOnHand(key, parseFloat(v) || 0, opVal()); toast(L("sbSaved") + " ✓"); render(); },
    // ---- P-Mac finished-bags output ----
    pmoPick(v) { pmoSel = v; render(); },
    async pmoAdd() {
      const it = DB.items().find(i => i.id === pmoSel);
      const q = parseFloat(($("pmo-qty") || {}).value);
      if (!it) return toast(L("pmoRunning"));
      if (!(q > 0)) return toast(L("enter"));
      const r = await DB.receive(it, q, "", opVal(), { location: BAG_STAGE });
      if (r && r.ok === false) return toast(r.msg || "error");
      pmoRecent.unshift({ name: it.name, qty: q, t: new Date().toLocaleTimeString() });
      const qEl = $("pmo-qty"); if (qEl) qEl.value = "";
      toast("+" + fmt(q) + " " + it.unit + " ✓"); render();
    },
    _sbReportRows() {
      const oh = DB.stockBuild ? DB.stockBuild() : {};
      const val = k => Number((oh[k] || {}).on_hand) || 0;
      const rows = SB_ITEMS.map(i => { const on = val(i.key); return { cat: i.cat, name: i.name, goal: i.goal, on: on, tb: Math.max(i.goal - on, 0), pct: i.goal ? Math.round(on / i.goal * 100) : 0 }; });
      const g = rows.reduce((s, r) => s + r.goal, 0), o = rows.reduce((s, r) => s + r.on, 0);
      return { rows, g, o, tb: Math.max(g - o, 0), pct: g ? Math.round(o / g * 100) : 0, date: new Date().toISOString().slice(0, 10) };
    },
    sbReportXlsx() {
      const R = UI._sbReportRows();
      const aoa = [["Smackin' Snacks - Stock Build Report", R.date], [], ["Category", "Item", "Goal", "On hand", "To build", "% Complete"]];
      R.rows.forEach(r => aoa.push([r.cat, r.name, r.goal, r.on, r.tb, r.pct + "%"]));
      aoa.push(["TOTAL", "", R.g, R.o, R.tb, R.pct + "%"]);
      const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 9 }, { wch: 9 }, { wch: 11 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Stock Build");
      XLSX.writeFile(wb, "Stock Build Report " + R.date + ".xlsx");
    },
    sbReportPdf() {
      const R = UI._sbReportRows(); const doc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
      let y = 46; doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("Smackin' Snacks - Stock Build Report", 40, y);
      y += 16; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90); doc.text(R.date, 40, y);
      y += 22; doc.setTextColor(20); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Goal " + fmt(R.g) + "     On hand " + fmt(R.o) + "     To build " + fmt(R.tb) + "     " + R.pct + "% complete", 40, y);
      y += 20; doc.setFontSize(8.5);
      const cols = [[40, "Category"], [130, "Item"], [400, "Goal"], [450, "On hand"], [510, "To build"]];
      cols.forEach(c => doc.text(c[1], c[0], y)); y += 4; doc.setDrawColor(200); doc.line(40, y, 560, y); y += 12;
      doc.setFont("helvetica", "normal");
      R.rows.forEach(r => { if (y > 745) { doc.addPage(); y = 46; } doc.text(String(r.cat), 40, y); doc.text(String(r.name).slice(0, 46), 130, y); doc.text(String(r.goal), 400, y); doc.text(String(r.on), 450, y); doc.text(String(r.tb), 510, y); y += 13; });
      y += 4; doc.setDrawColor(200); doc.line(40, y, 560, y); y += 13; doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 40, y); doc.text(String(R.g), 400, y); doc.text(String(R.o), 450, y); doc.text(String(R.tb), 510, y);
      doc.save("Stock Build Report " + R.date + ".pdf");
    },
    // ---- QA hold review ----
    async qaConvert(itemId, zone) {
      const it = DB.items().find(i => i.id === itemId); if (!it) return;
      const q = DB.atLoc(itemId, zone); if (!(q > 0)) return;
      const r = await DB.move(it, zone, "RECEIVING", q, opVal()); if (!r.ok) return toast(r.msg);
      toast(it.name + " -> RECEIVING"); render();
    },
    async qaScrap(itemId, zone) {
      const it = DB.items().find(i => i.id === itemId); if (!it) return;
      if (!confirm(L("scrapIt") + "?")) return;
      await DB.adjust(it, zone, 0, opVal()); toast(L("scrapIt") + " ✓"); render();
    },
    // ---- role + dashboard columns ----
    setRole(r) { prefs.role = r; savePrefs(); if (visibleTabs().indexOf(active) < 0) active = "home"; render(); },
    navGroupToggle(key) { if (navCollapsed.has(key)) navCollapsed.delete(key); else navCollapsed.add(key); try { localStorage.setItem("smk-navcollapsed", JSON.stringify([...navCollapsed])); } catch (e) {} renderNav(); },
    colPanel() { colPanel = !colPanel; render(); },
    colToggle(c) { const i = prefs.colHidden.indexOf(c);
      if (i < 0) { if (shownCols().length <= 1) return toast("!"); prefs.colHidden.push(c); } else prefs.colHidden.splice(i, 1);
      savePrefs(); render(); },
    colReset() { prefs.colOrder = ALL_COLS.slice(); prefs.colHidden = []; prefs.sortKey = ""; savePrefs(); render(); },
    colDrag(c) { dragCol = c; },
    colDrop(c) { if (!dragCol || dragCol === c) return; const o = prefs.colOrder.slice();
      o.splice(o.indexOf(dragCol), 1); o.splice(o.indexOf(c), 0, dragCol); prefs.colOrder = o; dragCol = null; savePrefs(); render(); },
    sort(c) { if (prefs.sortKey === c) prefs.sortDir = -prefs.sortDir; else { prefs.sortKey = c; prefs.sortDir = 1; } savePrefs(); render(); },
    // ---- Adjust (spreadsheet-style counts) ----
    adjSearch(v) { const q = (v || "").toLowerCase().trim();
      document.querySelectorAll("#adjBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    async saveAdjust() {
      const changes = [];
      document.querySelectorAll("#adjBody input.adjq").forEach(inp => {
        const v = (inp.value || "").trim(); if (v === "") return;
        const nv = parseFloat(v); if (!(nv >= 0)) return;
        const cur = parseFloat(inp.getAttribute("data-cur"));
        if (nv !== cur) changes.push({ id: inp.id.replace("adj-", ""), qty: nv });
      });
      if (!changes.length) return toast(L("noChanges"));
      for (const c of changes) { const it = DB.items().find(i => i.id === c.id); if (it) await DB.adjustTotal(it, c.qty, opVal()); }
      toast(L("savedN") + " (" + changes.length + ")"); render();
    },
    // ---- Shipping Log ----
    shlSort(key) { if (shipSortKey === key) shipSortDir = -shipSortDir; else { shipSortKey = key; shipSortDir = (key === "ship_date" || key === "cost") ? -1 : 1; } render(); },
    shlSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#shlBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    shlEdit(id) { shipEditId = id; render(); window.scrollTo(0, 0); },
    shlEditCancel() { shipEditId = null; render(); },
    async shlSave() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const recipient = v("shl-recipient"); if (!recipient) return toast(L("shlRecipient"));
      const by = opVal();
      const rec = { ship_date: v("shl-date"), ship_type: v("shl-type"), recipient: recipient,
        address: v("shl-address"), carrier: v("shl-carrier"), tracking: v("shl-tracking"),
        requested_by: v("shl-reqby"), contents: v("shl-contents"), status: v("shl-status"),
        cost: v("shl-cost"), notes: v("shl-notes") };
      if (shipEditId) { await DB.updateShipping(shipEditId, rec, by); shipEditId = null; toast(L("saved") + " ✓"); }
      else { await DB.addShipping(rec, by); toast(L("shlLogged") + " ✓"); }
      render();
    },
    async shlStatus(id, status) { await DB.setShippingStatus(id, status, opVal()); toast(status + " ✓"); },
    async shlDelete(id) { if (!confirm(L("shlConfirmDel"))) return; await DB.deleteShipping(id, opVal()); toast("✓"); render(); },
    // ---- Receiving Log ----
    rlFile(input) { const f = input.files && input.files[0]; if (!f) return; recvFile = f; render(); },
    rlClear() { recvFile = null; render(); },
    rlSort(key) { if (recvSortKey === key) recvSortDir = -recvSortDir; else { recvSortKey = key; recvSortDir = (key === "recv_date") ? -1 : 1; } render(); },
    rlSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#rlBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    rlEdit(id) { recvEditId = id; recvFile = null; render(); window.scrollTo(0, 0); },
    rlEditCancel() { recvEditId = null; recvFile = null; render(); },
    async rlSave() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const supplier = v("rl-supplier"); if (!supplier) return toast(L("rlSupplier"));
      const by = opVal();
      const rec = { recv_date: v("rl-date"), supplier: supplier, po_num: v("rl-po"),
        carrier: v("rl-carrier"), tracking: v("rl-tracking"), contents: v("rl-contents"),
        qty_ordered: v("rl-qord"), qty_received: v("rl-qrec"), condition: v("rl-condition"),
        received_by: v("rl-by"), notes: v("rl-notes") };
      let res;
      if (recvEditId) { res = await DB.updateReceivingLog(recvEditId, rec, recvFile, by); }
      else { res = await DB.addReceivingLog(rec, recvFile, by); }
      if (res && res.ok === false) return toast(res.msg || "error");
      const wasEdit = !!recvEditId; recvEditId = null; recvFile = null;
      toast((wasEdit ? L("saved") : L("rlLogged")) + " ✓"); render();
    },
    async rlDelete(id) { if (!confirm(L("rlConfirmDel"))) return; await DB.deleteReceivingLog(id, opVal()); toast("✓"); render(); },
    // ---- Continuous Improvement ----
    ciView(v) { ciView = v; render(); },
    ciAddToggle() { ciAddOpen = !ciAddOpen; ciEditId = null; render(); },
    ciEdit(id) { ciEditId = id; ciAddOpen = false; render(); window.scrollTo(0, 0); },
    ciEditCancel() { ciEditId = null; render(); },
    ciSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#ciBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    async ciSave() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const title = v("ci-title"); if (!title) return toast(L("ciTitle"));
      const by = opVal();
      const rec = { title: title, ci_type: v("ci-type"), area: v("ci-area"), owner: v("ci-owner"),
        priority: v("ci-priority"), status: v("ci-status"), opened_date: v("ci-opened"),
        problem: v("ci-problem"), impact: v("ci-impact") };
      if (ciEditId) { await DB.updateImprovement(ciEditId, rec, by); ciEditId = null; toast(L("saved") + " ✓"); }
      else { await DB.addImprovement(rec, by); ciAddOpen = false; toast(L("ciAdded")); }
      render();
    },
    async ciStatus(id, status) { await DB.setImprovementStatus(id, status, opVal()); toast(status + " ✓"); render(); },
    async ciDelete(id) { if (!confirm(L("ciConfirmDel"))) return; await DB.deleteImprovement(id, opVal()); toast("✓"); render(); },
    // ---- Orders ----
    ordView(v) { orderView = v; render(); },
    ordAddToggle() { orderAddOpen = !orderAddOpen; render(); },
    ordSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#ordBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    ordEdit(id) { orderEditId = id; orderAddOpen = false; render(); window.scrollTo(0, 0); },
    ordEditCancel() { orderEditId = null; render(); },
    async ordAdd() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const cust = v("o-cust"); if (!cust) return toast(L("oCustomer"));
      let by = v("o-by-other") || v("o-by") || "Allie"; if (by === "__other") by = "Other";
      const rec = { customer: cust, customer_po: v("o-po"), order_id: v("o-oid"), invoice_date: v("o-inv"),
        ship_date: v("o-ship"), tracking: v("o-trk"), carrier: v("o-carr"), appointment: v("o-appt"),
        stripe_link: v("o-stripe"), notes: v("o-notes"), entered_by: by };
      if (orderEditId) { await DB.updateOrder(orderEditId, rec, by); orderEditId = null; toast(L("saved") + " ✓"); render(); return; }
      rec.status = "Open";
      await DB.createOrder(rec, by);
      try { DB.notifyNewOrder(rec); } catch (e) {}  // emails Troy once the backend is configured; no-ops otherwise
      orderAddOpen = false; orderView = "open"; toast(L("ordAdded")); render();
    },
    async ordComplete(id) { await DB.setOrderStatus(id, "Complete", opVal()); toast(L("markComplete") + " ✓"); },
    async ordReopen(id) { await DB.setOrderStatus(id, "Open", opVal()); toast(L("reopen") + " ✓"); },
    // ---- People / HR ----
    async hrUnlock() { await ensureUnlocked(); },
    peopleView(v) { peopleView = v; render(); },
    peopleSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#view .pcell").forEach(c => { const t = c.getAttribute("data-txt") || ""; c.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; });
      document.querySelectorAll("#view .pdept").forEach(d => { const any = Array.from(d.querySelectorAll(".pcell")).some(c => c.style.display !== "none"); d.style.display = any ? "" : "none"; }); },
    // ---- R&D / sample requests ----
    rdView(v) { rdView = v; render(); },
    rdAddToggle() { rdAddOpen = !rdAddOpen; render(); },
    rdSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#rdBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    async rdAdd() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const co = v("rd-co"), items = v("rd-items");
      if (!co) return toast(L("rdCompany")); if (!items) return toast(L("rdItems"));
      const by = $("rd-op") ? $("rd-op").value : "";
      await DB.createRdRequest({ req_type: v("rd-type"), company: co, contact_name: v("rd-cn"), contact_email: v("rd-em"),
        items: items, quantity: v("rd-qty"), needed_by: v("rd-need"), purpose: v("rd-purp"),
        follow_up: v("rd-follow"), notes: v("rd-notes"), requested_by: by, status: "Pending" }, by || "Troy");
      rdAddOpen = false; rdView = "pending"; toast(L("rdAdded")); render();
    },
    async rdReceived(id) { if (!confirm(L("rdConfirmRecv"))) return; await DB.setRdStatus(id, "Received", rdOp()); toast(L("rdMarkRecv") + " ✓"); },
    async rdReopen(id) { await DB.setRdStatus(id, "Pending", rdOp()); toast(L("rdReopenB") + " ✓"); },
    rdPdf(id) { const r = DB.rdRequests().find(x => String(x.id) === String(id)); if (!r) return;
      const doc = rdDoc(r); if (!doc) return toast("PDF lib not loaded"); doc.save((r.req_no || "request") + ".pdf"); },
    async rdSend(id) {
      const r = DB.rdRequests().find(x => String(x.id) === String(id)); if (!r) return;
      if (!r.contact_email) return toast(L("rdEmail"));
      const doc = rdDoc(r); if (!doc) return toast("PDF lib not loaded");
      const b64 = doc.output("datauristring").split(",")[1];
      toast(L("rdSending"));
      const res = await DB.sendRdEmail(id, { to: r.contact_email, subject: L("rdEmailSubject") + " - " + (r.req_no || ""),
        html: rdEmailHtml(r), pdfBase64: b64, pdfName: (r.req_no || "request") + ".pdf" }, rdOp());
      if (res.ok) { toast(L("rdSendOk")); render(); }
      else if (res.msg === "not-configured") { toast(L("rdSendNo")); }
      else { toast(L("rdSendFail")); }
    },
    // ---- Supplier POs (upload) ----
    async spoFile(input) { const f = input.files && input.files[0]; if (!f) return; spoFile = f; toast(L("spoParsed"));
      spoParsed = (await spoParseFile(f)) || { vendor: "", po_num: "", po_date: "", total: "", item_count: 0, lines: "[]", recognized: false }; render(); },
    spoClear() { spoFile = null; spoParsed = null; render(); },
    async spoSave() {
      if (!spoFile) return toast(L("spoNoFile"));
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const by = $("op") ? $("op").value : "";
      const rec = { vendor: v("spo-vendor"), po_num: v("spo-po"), po_date: v("spo-date"), total: v("spo-total"),
        item_count: (spoParsed && spoParsed.item_count) || 0, lines: (spoParsed && spoParsed.lines) || "[]", notes: v("spo-notes") };
      const res = await DB.createSupplierPO(rec, spoFile, by);
      if (!res.ok) return toast(res.msg || "error");
      spoFile = null; spoParsed = null; toast(L("spoSaved")); render();
    },
    async spoDelete(id) { if (!confirm(L("spoConfirmDel"))) return; await DB.deleteSupplierPO(id, opVal()); toast(L("spoDelete") + " ✓"); },
    spoSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#spoBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    spoSortBy(k) { if (spoSort.key === k) spoSort.dir *= -1; else spoSort = { key: k, dir: (k === "total" || k === "item_count" || k === "po_date") ? -1 : 1 }; render(); },
    // ---- Create PO (Excel-style entry form) ----
    poCreateOpen() { spoView = "create"; poRows = 4; render(); },
    poBack() { spoView = "list"; render(); },
    poAddLine() { const tb = $("po-lines"); if (!tb) return; const i = tb.querySelectorAll("tr").length; const tr = document.createElement("tr"); tr.innerHTML = poRowInner(i); tb.appendChild(tr); },
    poRecalc() {
      let sub = 0;
      document.querySelectorAll("#po-lines tr").forEach(tr => {
        const q = parseFloat((tr.querySelector("[id^=pl-qty-]") || {}).value) || 0;
        const p = parseFloat((tr.querySelector("[id^=pl-price-]") || {}).value) || 0;
        const lt = q * p; sub += lt;
        const ts = tr.querySelector("[id^=pl-tot-]"); if (ts) ts.textContent = money(lt);
      });
      const g = id => { const e = $(id); return e ? parseFloat(e.value) || 0 : 0; };
      const grand = sub + g("po-shipping") + g("po-tax") + g("po-other");
      if ($("po-subtotal")) $("po-subtotal").textContent = money(sub);
      if ($("po-grand")) $("po-grand").textContent = money(grand);
    },
    poVendorFill() {
      const e = $("po-vendor"); const v = e ? (e.value || "").trim() : ""; if (!v) return;
      const recs = DB.supplierPos().filter(s => (s.vendor || "").toLowerCase() === v.toLowerCase()).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      const src = recs.find(s => s.vendor_addr || s.vendor_email || s.vendor_phone || s.ship_to) || recs[0];
      if (!src) return;
      const set = (id, val) => { const el = $(id); if (el && !el.value && val) el.value = val; };
      set("po-vaddr", src.vendor_addr); set("po-vemail", src.vendor_email); set("po-vphone", src.vendor_phone); set("po-shipto", src.ship_to);
    },
    async poCreate() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const vendor = v("po-vendor"); if (!vendor) return toast(L("poNeedVendor"));
      const lines = []; let sub = 0;
      document.querySelectorAll("#po-lines tr").forEach(tr => {
        const g = sel => { const el = tr.querySelector(sel); return el ? (el.value || "").trim() : ""; };
        const item = g("[id^=pl-item-]"), desc = g("[id^=pl-desc-]"), qty = g("[id^=pl-qty-]"), price = g("[id^=pl-price-]");
        if (!item && !desc && !qty && !price) return;
        const lt = (parseFloat(qty) || 0) * (parseFloat(price) || 0); sub += lt;
        lines.push({ item: item, desc: desc, qty: qty, price: price, total: String(Math.round(lt * 100) / 100) });
      });
      const gg = id => parseFloat(v(id)) || 0;
      const grand = sub + gg("po-shipping") + gg("po-tax") + gg("po-other");
      const rec = { vendor: vendor, po_num: v("po-num"), po_date: v("po-date"),
        vendor_addr: v("po-vaddr"), vendor_email: v("po-vemail"), vendor_phone: v("po-vphone"), ship_to: v("po-shipto"),
        lines: JSON.stringify(lines), item_count: lines.length,
        subtotal: String(Math.round(sub * 100) / 100), shipping: v("po-shipping"), tax: v("po-tax"), other: v("po-other"),
        total: String(Math.round(grand * 100) / 100), prepared_by: v("po-by"), notes: v("po-notes") };
      const res = await DB.createSupplierPO(rec, null, rec.prepared_by);
      if (res && res.ok === false) return toast(res.msg || "error");
      spoView = "list"; toast(L("poSavedMsg")); render();
    },
    // ---- Order Docs (fulfilled-order paperwork) ----
    odocFile(input) { const f = input.files && input.files[0]; if (!f) return; odocFile = f; render(); },
    odocClear() { odocFile = null; render(); },
    async odocSave() {
      if (!odocFile) return toast(L("odocNoFile"));
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const by = $("op") ? $("op").value : "";
      const rec = { customer: v("odoc-cust"), po_num: v("odoc-po"), doc_type: v("odoc-type"), notes: v("odoc-notes") };
      const res = await DB.createOrderDoc(rec, odocFile, by);
      if (!res.ok) return toast(res.msg || "error");
      odocFile = null; toast(L("odocSaved")); render();
    },
    async odocDelete(id) { if (!confirm(L("odocConfirmDel"))) return; await DB.deleteOrderDoc(id, opVal()); toast(L("spoDelete") + " ✓"); },
    odocSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#odocBody .odcust").forEach(c => { const t = c.getAttribute("data-txt") || ""; c.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    // ---- Mixing / P-Mac consumption (scan material out to production) ----
    async consume(dept) {
      const code = ($("con-code") ? $("con-code").value : "").trim();
      const qty = parseFloat($("con-qty") ? $("con-qty").value : "") || 0;
      const lot = ($("con-lot") ? $("con-lot").value : "").trim();
      if (!code || !qty || !lot) return toast(L("conErr"));
      const res = await DB.consume(code, qty, lot, dept, opVal());
      toast(L("conBtn") + " ✓" + (res && res.itemFound === false ? " (" + code + " " + L("conNotInList") + ")" : ""));
      render();
    },
    // ---- Purchase Orders ----
    poNew(sk) { purchSup = sk || null; purchMode = "new"; active = "purchasing"; closeDrawer(); render(); },
    poBack() { purchMode = "list"; render(); },
    poSupChange() { purchSup = $("po-sup").value; render(); },
    async poSave() {
      const sk = $("po-sup").value, exp = $("po-exp").value || null, lines = [];
      DB.items().filter(i => i.supplier === sk).forEach(i => {
        const qe = $("poq-" + i.id), ce = $("poc-" + i.id);
        const q = qe ? parseFloat(qe.value) : 0, c = ce ? parseFloat(ce.value) || 0 : 0;
        if (q > 0) lines.push({ item_id: i.id, qty: q, cost: c });
      });
      if (!lines.length) return toast(L("enter"));
      await DB.createPO(sk, lines, exp, opVal()); toast(L("poCreated")); purchMode = "list"; render();
    },
    async poOrder(id) { await DB.setPOStatus(id, "ordered", opVal()); toast(id); },
    async poCancel(id) { if (confirm(L("cancelPO") + " " + id + "?")) await DB.setPOStatus(id, "cancelled", opVal()); },
    async poDelete(id) { if (confirm(L("deletePO") + " " + id + "?")) await DB.deletePO(id, opVal()); },
    poReceiveOpen(id) { receivingPOid = id; render(); },
    poReceiveCancel() { receivingPOid = null; render(); },
    async poReceiveConfirm(id) {
      const po = DB.purchaseOrders().find(p => p.id === id); if (!po) return;
      const r = {}; po.lines.forEach((l, idx) => { const e = $("rcv-" + id + "-" + idx); if (e) r[idx] = parseFloat(e.value) || 0; });
      const res = await DB.receivePO(id, r, opVal()); if (!res.ok) return toast(res.msg);
      receivingPOid = null; toast(L("received") + " &#10003;"); render();
    },
    labels(kind) {
      const area = $("labelArea"); let list = [];
      if (kind === "loc") list = DB.allLocations().map(c => ({ code: c, name: c }));
      else if (kind === "item") list = DB.items().map(i => ({ code: i.code, name: i.name }));
      else if (kind === "lpn") { const lpn = "LPN-" + Date.now().toString().slice(-8); list = [{ code: lpn, name: "Pallet " + lpn }]; }
      area.innerHTML = '<div class="labelgrid" id="labelgrid">' +
        list.map((x, n) => '<div class="lbl"><svg id="bc' + n + '"></svg><div class="lblcap">' + x.name + '</div></div>').join("") +
        '</div><button class="primary" onclick="window.print()">' + L("print") + '</button>';
      list.forEach((x, n) => { try { JsBarcode("#bc" + n, x.code, { format: "CODE128", width: 2, height: 48, fontSize: 13, margin: 6 }); } catch (e) {} });
    },
    async cam(targetId) {
      if (!window.Html5Qrcode) { toast("Camera lib not loaded"); return; }
      let modal = $("camModal");
      if (!modal) { modal = document.createElement("div"); modal.id = "camModal"; modal.className = "cammodal";
        modal.innerHTML = '<div class="cambox"><div id="reader"></div><button class="ghost" id="camClose">Close</button></div>';
        document.body.appendChild(modal); }
      modal.style.display = "flex";
      const reader = new Html5Qrcode("reader");
      const stop = () => { reader.stop().then(() => { modal.style.display = "none"; }).catch(() => { modal.style.display = "none"; }); };
      $("camClose").onclick = stop;
      reader.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        const f = $(targetId); if (f) { f.value = text; f.dispatchEvent(new Event("input")); }
        stop(); toast(text);
      }).catch(() => toast("Camera unavailable"));
    },
    setLang
  };
  window.UI = UI;
  UI.lock = lockEdits;
  // Gate every write action behind the PIN. Viewing stays open.
  ["saveAdjust","ordAdd","ordComplete","ordReopen","receive","put","move","produce","count","doReturn","addSeasLot","seasStatus","quarExpired","qaConvert","qaScrap","poSave","poOrder","poCancel","poDelete","poReceiveConfirm","reset"].forEach(fn => {
    const orig = UI[fn];
    if (typeof orig !== "function") return;
    UI[fn] = async function () { if (!(await ensureUnlocked())) return; return orig.apply(UI, arguments); };
  });

  function refreshDatalists() {
    $("dl-items").innerHTML = DB.items().map(i => '<option value="' + i.code + '">' + i.name + "</option>").join("");
    $("dl-locs").innerHTML = DB.allLocations().map(l => '<option value="' + l + '"></option>').join("");
  }
  function closeDrawer() { const n = $("nav"), b = $("navBackdrop"); if (n) n.classList.remove("open"); if (b) b.classList.remove("show"); }
  function renderNav() {
    const vis = visibleTabs();
    const roleSel = '<select class="rolesel" title="' + L("role") + '" onchange="UI.setRole(this.value)">' +
      [["all", "roleAll"], ["receiving", "roleReceiving"], ["production", "roleProduction"], ["mixing", "roleMixing"], ["pmac", "rolePmac"], ["rnd", "roleRnd"]].map(([v, k]) =>
        '<option value="' + v + '"' + (prefs.role === v ? " selected" : "") + '>' + L(k) + '</option>').join("") + '</select>';
    const navBtn = tb => {
      let badge = "";
      if (tb === "orders" && newOrdersCount() > 0) badge = '<span class="navbadge">' + newOrdersCount() + '</span>';
      else if (tb === "alerts" && alertCount() > 0) badge = '<span class="navbadge alert">' + alertCount() + '</span>';
      return '<button class="navitem ' + (tb === active ? "active" : "") + '" onclick="UI_go(\'' + tb + '\')">' +
        '<i class="navico" data-lucide="' + (NAV_ICON[tb] || "circle") + '"></i><span>' + L(tb) + '</span>' + badge + '</button>';
    };
    let html = roleSel;
    NAV_GROUPS.forEach(g => {
      const items = g.items.filter(t => vis.indexOf(t) >= 0);
      if (!items.length) return;
      if (!g.key) { html += '<div class="navgroup">' + items.map(navBtn).join("") + '</div>'; return; }
      const hasActive = items.indexOf(active) >= 0;
      const collapsed = navCollapsed.has(g.key) && !hasActive;
      html += '<div class="navgroup' + (collapsed ? ' collapsed' : '') + '">' +
        '<button class="navlabel" onclick="UI.navGroupToggle(\'' + g.key + '\')"><span class="navcaret">' + (collapsed ? "▸" : "▾") + '</span>' + L(g.key) + '</button>';
      if (!collapsed) html += items.map(navBtn).join("");
      html += '</div>';
    });
    $("nav").innerHTML = html;
    drawIcons();
  }
  window.UI_go = go;
  // Generic client-side sort for any <table class="sortable">: click a header to sort rows by
  // that column (numeric-aware). Mark a header with data-nosort to skip it (e.g. action columns).
  function sortTableByCol(tbl, idx) {
    const tb = tbl.tBodies[0]; if (!tb) return;
    const rows = Array.from(tb.rows).filter(r => r.cells.length > idx && !r.hasAttribute("data-nosort"));
    if (rows.length < 2) return;
    const dir = (tbl.__sortCol === idx) ? -(tbl.__sortDir || 1) : 1;
    tbl.__sortCol = idx; tbl.__sortDir = dir;
    const val = r => {
      const c = r.cells[idx]; if (!c) return "";
      const t = (c.innerText || "").trim();
      const n = parseFloat(t.replace(/[$,%]/g, ""));
      return (t !== "" && !isNaN(n) && /^[-+$]?[\d,]+(\.\d+)?%?$/.test(t)) ? n : t.toLowerCase();
    };
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
    rows.forEach(r => tb.appendChild(r));
    const hs = tbl.tHead ? tbl.tHead.rows[0].cells : [];
    Array.from(hs).forEach((th, i) => { const old = th.querySelector(".gsar"); if (old) old.remove(); if (i === idx) { const s = document.createElement("span"); s.className = "gsar"; s.textContent = dir > 0 ? " ▲" : " ▼"; th.appendChild(s); } });
  }
  function wireSortable() {
    document.querySelectorAll("#view table.sortable").forEach(tbl => {
      if (!tbl.tHead) return;
      Array.from(tbl.tHead.rows[0].cells).forEach((th, idx) => {
        if (th.hasAttribute("data-nosort")) return;
        th.style.cursor = "pointer"; th.title = th.title || L("sortHint");
        th.onclick = () => sortTableByCol(tbl, idx);
      });
    });
    // Add a visible "sortable" affordance to EVERY clickable header (any sort mechanism):
    // a faint up/down glyph so users know the column can be sorted, plus a hover class.
    document.querySelectorAll("#view thead th").forEach(th => {
      if (th.hasAttribute("data-nosort")) return;
      const clickable = th.onclick || th.getAttribute("onclick");
      if (!clickable) return;
      th.classList.add("th-sortable");
      const active = th.querySelector(".sortar") || th.querySelector(".gsar");
      const idle = th.querySelector(".sortglyph");
      if (active) { if (idle) idle.remove(); }
      else if (!idle) { const g = document.createElement("span"); g.className = "sortglyph"; g.textContent = "↕"; th.appendChild(g); }
    });
  }
  function render() {
    renderNav(); refreshDatalists();
    const map = { home: viewHome, dash: viewDash, alerts: viewAlerts, adjust: viewAdjust, receive: viewReceive, putaway: viewPut, returns: viewReturns, orders: viewOrders, rd: viewRD, qa: viewQA,
      move: viewMove, produce: viewProduce, retailprod: viewRetailProd, ecomprod: viewEcomProd, stockbuild: viewStockBuild, seasoning: viewSeasoning, seed: viewSeed, skus: viewSkus, finbags: viewFinishedBags, pmacout: viewPmacOut, mixing: viewMixing, pmac: viewPmac,
      count: viewCount, locations: viewLocations, purchasing: viewPurchasing, supplierpos: viewSupplierPos, orderdocs: viewOrderDocs, shiplog: viewShippingLog, recvlog: viewReceivingLog, people: viewPeople, improve: viewImprove, labels: viewLabels, log: viewLog, settings: viewSettings };
    $("view").innerHTML = (map[active] || viewHome)();
    $("modeBadge").textContent = DB.mode === "cloud" ? L("cloud") : L("localmode");
    $("modeBadge").className = "modebadge " + (DB.mode === "cloud" ? "ok" : "low");
    try { wireSortable(); } catch (e) {}
    drawIcons();
  }

  // ---------- boot ----------
  window.addEventListener("DOMContentLoaded", async () => {
    $("lang-en").onclick = () => setLang("en");
    $("lang-es").onclick = () => setLang("es");
    if ($("lang-pt")) $("lang-pt").onclick = () => setLang("pt");
    if ($("navToggle")) $("navToggle").onclick = () => { const n = $("nav"), b = $("navBackdrop"); const open = !n.classList.contains("open"); n.classList.toggle("open", open); if (b) b.classList.toggle("show", open); };
    if ($("navBackdrop")) $("navBackdrop").onclick = closeDrawer;
    await DB.init();
    if (!ordersSeen) markOrdersSeen();  // first run: existing orders are not "new"
    DB.onChange(render);
    render();
    if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("service-worker.js"); } catch (e) {} }
  });
})();

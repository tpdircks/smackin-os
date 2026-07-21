/* ============================================================================
   Smackin' Inventory — UI layer (talks only to window.DB)
   Scanners: keyboard-wedge (focus a field + scan) AND camera (Scan button).
   ============================================================================ */
(function () {
  "use strict";
  // build v69 — Demand section
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
      receiveHint:"Scan an item, enter qty + details, then pick where it goes (scan the slot or tap Section-Bay-Level) - it lands there in one step. Leave the location blank to hold at Receiving.",rniNewBtn:"New item (not in list)",rniCancelBtn:"Use existing item",rniTitle:"Create a new item",rniCode:"Item code / SKU",rniName:"Item name",rniNamePh:"e.g. Kraft box 12x9",rniUnit:"Unit",rniHint:"This adds a brand-new item to the master, then receives it below.",rniNeed:"Enter a code and name for the new item",
      rSupplier:"Supplier", rInvoice:"Invoice / PO #", rCategory:"Category", rPallets:"Pallets", rCondition:"Condition", rStatus:"Status",
      putHint:"Scan the item, then scan the slot barcode OR tap Section - Bay - Level. Moves from Receiving in real time.",
      puDest:"Destination", puSection:"Section", puBay:"Bay", puLevel:"Level", puZones:"Floor / zones", puScanLoc:"A-05-L3 / scan slot barcode",
      moveHint:"Scan item, pick from and to (slot, WIP, Pack-Out, Shipping...).",
      produceHint:"Record finished 4oz bags off the line. Adds bags, consumes film + seasoning.",
      countHint:"Cycle count: scan item + slot, enter the counted quantity; the system adjusts.",
      locHint:"What is in each location now.", purchHint:"Reorder alerts plus full purchase orders.",purchBuyList:"Buy List",purchSetup:"Reorder Setup",rsHint:"Set a reorder point and preferred supplier for each item. Items with both set will trigger on the Buy List when stock runs low.",rsNoSup:"— none —",rsNeeds:"Needs setup",rsReady:"Ready",rsReorderPt:"Reorder point",rsNeedShort:"need setup",rsSaved:"Saved",rsSearchP:"Search items...",prodlog:"Daily Production",bags:"Bags",plLot:"Lot #",plShiftLead:"Shift Lead",plCounter:"Metal Detector Box Counter",plStart:"Start Count",plEnd:"End Count",plBoxes:"Boxes Produced",plCounterHint:"Record the counter BEFORE and AFTER the shift. Do not reset it.",plAddPallet:"Add Pallet",plLine:"Line",plFlavor:"Flavor",plCases:"Cases",plNotes:"Notes / Customer",plAdd:"Add to log",plAdded:"Pallet added",plNeedCases:"Enter case count",plLog:"Pallet Log",plPalletsUsed:"Pallets Used",plNoPallets:"No pallets logged yet today.",plSummary:"Daily Summary by Flavor",plCode:"Code",plCasesLogged:"Cases Logged",plVariance:"Variance (counter - log)",
      fulfilldaily:"Daily Fulfillment", fdHint:"Log today's E-Commerce labels and Amazon (FBA) build output, plus notes on any custom/unique orders. Saved per day - also acts as a backup and double-check while automation is built out.",
      fdDate:"Date", fdEcomTitle:"E-Commerce - Labels per Person", fdEcomHint:"One row per person who worked e-com labels today. The day's total is the sum of everyone's labels.",
      fdEmployee:"Employee", fdPickEmployee:"Pick a person...", fdLabelsDone:"# Labels Done", fdAddPerson:"+ Add person", fdEcomLabelsTotal:"E-Com Labels Total",
      fdAmzTitle:"Amazon (FBA)", fdAmzHint:"Pick a SKU (or add a custom one) and the units made. Bags = units x bags/unit - counted separately from e-com labels.",
      fdSku:"SKU", fdPickSku:"Pick a SKU...", fdCustomSku:"+ Custom SKU...", fdCustomSkuPh:"Enter SKU", fdUnitsMade:"Units Made", fdBagsPerUnit:"Bags / Unit", fdBags:"Bags",
      fdAddSku:"+ Add SKU", fdAmzUnitsTotal:"Amazon Units Total", fdAmzBagsTotal:"Amazon Bags Total",
      fdNotesTitle:"Notes", fdNotesHint:"Custom / unique builds or anything special about today's orders.", fdNotesPh:"Notes...",
      fdSave:"Save Day", fdSaved:"Daily Fulfillment saved", fdSummary:"Today's Summary", fdHistory:"Recent Days", fdNoHistory:"No days logged yet.",
      fdRemove:"Remove", fdDeleteConfirm:"Delete this day's entry?", fdHistDate:"Date", fdHistEcom:"E-Com Labels", fdHistAmzBags:"Amazon Bags", fdHistNotes:"Notes", fdHistBy:"Entered by",
      locMap:"Rack map", locList:"List", locFloor:"Floor plan", locOccupied:"Occupied", locEmpty:"Empty", locBlocked:"Blocked", locSection:"Section", locDocks:"Dock doors", locZones:"Zones & staging", locClickHint:"Top-down view of the racks. Green = occupied, click any slot to see what is stored there. Bay 01 is at the dock end.", locNothing:"Nothing stored in this slot.",lmMove:"Move",lmSet:"Fix count",lmAddItem:"Add item",lmAssign:"Place item here",lmEmpty:"Clear to Staging",lmClearConfirm:"Move all items to STAGING from",lmMoveTitle:"Move item to another location",lmSetTitle:"Correct the count",lmAssignTitle:"Place an item in this location",lmDest:"Move to (location)",lmMoveBtn:"Move",lmAssignBtn:"Place here",lmEmptyConfirm:"Remove ALL items from",lmEmptied:"emptied", locSlot:"Slot", locBaysUsed:"slots used", locOfficeEnd:"office end", locFarEnd:"far end", locView3d:"View in 3D",
      locFloorNote:"Top-down map of the building - every place product is stored or moves through. Click a rack section or staging zone to see its contents. Section A/B/C/D letters are a best guess - tell me which physical run is which and I will lock them in.", locStorage:"Storage (racking)", locTransfer:"Production & transfer areas", locStaging:"Staging & work zones",
      reorderSug:"Reorder suggestions", purchOrders:"Purchase orders", newPO:"New PO", createDraft:"Create draft PO",
      chooseSupplier:"Supplier", poExpected:"Expected", poCost:"Unit cost", addLines:"Enter a quantity only for what you are ordering now - leave the rest blank.",
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
      slProduct:"Product / flavor", slLot:"Lot #", slMfr:"Manufacturer", slExp:"Expiration", slWeight:"Weight (lbs)",slLoc:"Location",
      addLot:"Add lot", seasLotsTitle:"Seasoning lots (earliest expiration first)", quarantineExpired:"Quarantine expired lots",
      noLots:"No seasoning lots yet.", markQuar:"Quarantine", markGood:"Mark good", expiredTag:"EXPIRED", quarTag:"QUARANTINE", goodTag:"GOOD",
      seed:"Seed", seedHint:"Log each lot of raw sunflower seed with supplier + lot # for recall traceability. Newest first.", sdType:"Seed type", sdReceived:"Received",sdIntCode:"Internal code",sdPackaging:"Packaging",sdPickPack:"Select packaging...",sdPallets:"# Pallets",sdPalletsShort:"pallet(s)",sdPackDate:"Packaging date", seedLotsTitle:"Seed lots (newest first)", noSeedLots:"No seed lots yet.",
      skus:"SKUs", skusHint:"Finished-goods / retail SKU catalog - bundles, singles, and cases with bag count and flavor contents. Reference only.", skuCode:"SKU", skuTitle:"Product", skuBags:"Bags", skuComp:"Contents", skuSearchP:"Search SKU, product, or flavor...", skuCount:"SKUs",
      stockbuild:"Stock Build", sbHint:"Live build progress vs goals. Update On Hand as you go - the whole team sees it instantly. Yellow field = enter today's count.", sbGoal:"Goal", sbOnHand:"On hand", sbToBuild:"To build", sbPallets:"Pallets", sbDone:"Done", sbTotalGoal:"Total goal", sbComplete:"Complete", sbSaved:"Saved", sbRetail:"Retail", sbEcom:"E-Commerce", sb12pk:"12-Pack Boxes",
      board:"Board Mode / TV", boardPick:"Pick a department", boardPickHint:"Open this on the TV and pick a department, or bookmark the URL (example: ?board=pmac).", boardExit:"Exit", grpDemand:"Demand", demand:"By Department", demandboard:"Order Board", demandsched:"Production Schedule", demandimport:"Import Orders", ecomdemand:"E-Com Demand", forecast:"Forecast vs Target",
      fcHint:"Compare only - the app's targets are not changed by this.", fcSnapshot:"Snapshot", fcFlavor:"Flavor", fcApp4:"App Target (4oz)", fcWip4:"WIP Forecast (4oz)", fcDelta4:"Δ (4oz)", fcApp15:"App Target (1.5oz)", fcWip15:"WIP Forecast (1.5oz)", fcDelta15:"Δ (1.5oz)",
      fcNoAppTarget15:"No per-flavor 1.5oz target in the app (bucket / variety-pack only)", fcNone:"No forecast snapshot yet. Ask Claude to refresh it from the WIP FORECAST sheet.", fcBags:"bags",
      dqMix:"Mixing", dqPmac:"P-Mac", dqFul:"Fulfillment", dqToday:"Today", dqTarget:"Today's target", dqTargetShort:"Today",
      dqDueToday:"Orders due today", dqStock:"Stock replenishment", dqShift:"Shift", dqS1:"Shift 1", dqS2:"Shift 2", dqShiftSplit:"split across 2 shifts",
      dqRemaining:"left", dqPct:"to target", dqBags:"Bags", dqCases:"Cases", dqAll:"All flavors", dqFlavor:"Flavor (optional)",
      dqLog:"Log output", dqLogHint:"Each shift logs what it produced -- this is the shift scoreboard.", dqLogBtn:"Log output", dqEnterQty:"Enter a quantity",
      dqWeekAhead:"Week ahead", dqWeekAheadHint:"Demand due each day", dqResults:"This week's output", dqResultsHint:"Actual logged output, Mon-Sun",
      dqTotal:"Total", dqLogged:"Logged today", dqNothing:"Nothing logged yet today.",
      dqBuildNow:"Orders - build ASAP", dqScheduled:"Scheduled orders (Target / McLane / Bass Pro)", dqScheduledHint:"Held to their routed / scheduled ship dates - not counted in today's build target.", dqShipDate:"Ship date", dqTBD:"awaiting routing",
      dqHintProd:"Today's build target in bags = ASAP orders + stock replenishment, split across both shifts. Log output as you go.", dqHintFul:"Today's fulfillment target in cases = ASAP orders + stock replenishment. Log assembled cases as you go.",
      dmHint:"Every open order due to ship, live. Drop your SPS + ShipIQ exports under Import Orders to refresh; mark a PO Shipped once it leaves.",
      dsHint:"What to produce by flavor: open demand vs finished bags on hand (from Stock Build). Updates as orders ship.",
      diHint:"Drop the same SPS 850 and ShipIQ CSV exports you pull for the weekly report. The app parses them into the live board. Re-dropping an updated export for a PO replaces its lines.",
      dmPartner:"Customer", dmPO:"PO #", dmFlavor:"Flavor", dmCases:"Cases", dmBags:"Bags", dmDue:"Due", dmStatusH:"Status", dmDCs:"DCs", dmLoadH:"Load", dmShip:"Ship", dmShipQ:"Mark this whole PO shipped?", dmOpen:"Open", dmShipped:"Shipped", dmAll:"All", dmNone:"No demand loaded yet. Go to Import Orders to drop your SPS + ShipIQ exports.", dmAllPartners:"All customers", dmAllFlavors:"All flavors", dmTot:"Totals", dmPOs:"POs", dmDueUnknown:"no date",
      dsFlavor:"Flavor", dsDemandCs:"Demand (cs)", dsDemandBags:"Demand (bags)", dsOnHand:"On hand (cs)", dsToProduce:"To produce (cs)", dsPallets:"Pallets", dsFilm:"Film (bags)", dsCovered:"Covered", dsProduce:"Produce", dsBlocked:"Film short", dsNone:"No open demand. Import orders to see the schedule.", dsGrand:"TOTAL",
      diDrop:"Drop SPS 850 + ShipIQ CSV files", diSelected:"file(s) ready", diParse:"Preview", diCommit:"Load into board", diClear:"Clear all demand", diLabel:"Label (e.g. week of)", diWarn:"Warnings", diRecon:"Reconciliation: SPS cases vs ShipIQ cartons", diNoFiles:"Choose CSV files first", diUnknown:"skipped (not SPS/ShipIQ)", diCommitted:"loaded into the board", diConfirmClear:"Delete ALL demand lines? This cannot be undone.", diParsedFiles:"Parsed files", diLinesW:"lines", diReplace:"Re-importing replaces open lines for these POs.",
      ecdHint:"Drop a ShipStation \u201cProduct Sales\u201d CSV export (SKU, Description, QtySold) to see e-commerce bags-needed per flavor. Packs / variety bundles explode into component bags automatically.", ecdDrop:"Drop ShipStation Product Sales CSV", ecdPeriod:"Period (days)", ecdCommit:"Load", ecdClear:"Clear snapshot", ecdConfirmClear:"Delete the current e-com demand snapshot? This cannot be undone.", ecdPreview:"Preview", ecdFlavor:"Flavor", ecd4oz:"4oz bags", ecd15oz:"1.5oz bags", ecdTotal:"Total bags", ecdAvgDay:"Avg / day", ecdUnmapped:"Unmapped SKUs", ecdUnmappedHint:"These SKUs weren\u2019t confidently mapped to a flavor \u2014 review and tell Claude how to map them.", ecdSku:"SKU", ecdDesc:"Description", ecdQty:"Qty sold", ecdNone:"No e-com demand loaded yet. Drop a ShipStation Product Sales CSV above.", ecdLoaded:"loaded into the e-com snapshot", ecdSnapshot:"Current e-com snapshot", ecdSourceLabel:"Source label (e.g. period covered)", ecdNotCsv:"Not a recognized ShipStation Product Sales CSV (need SKU / Description / QtySold columns)", ecdRows:"rows", ecdBagsFrom:"bags mapped", ecdUnmappedUnits:"units unmapped",
      returnsHint2:"Log every return in one place. Pick the channel, scan the item, and the app blocks duplicate returns (same tracking / shipment ID). Kits can be broken down into their flavors automatically.",
      rMajor:"Major Customer", rEcom:"E-Commerce / Amazon", rCustomer:"Customer name", rAddUpc:"Additional UPC", rMarketplace:"Marketplace", rShipment:"Shipment ID", rShipAddr:"Shipping address", rProdCode:"Product code", rUpc:"UPC", rTracking:"Tracking #", rReturnDate:"Return date",
      rIsKit:"This is a variety pack / kit", rExplode:"Break down into flavors", rKitHint:"Enter the kit SKU (e.g. SS-CLSC-4OZ-12PK). On restock it adds each component flavor back to finished-bag inventory.",
      returnsLogTitle:"Returns Log", rWho:"Customer / Marketplace", rRef:"Tracking / Shipment", rKitTag:"KIT", rDup:"DUP", rDupWarn:"This return looks already processed:", rDupOverride:"Log it again anyway?", rDupSkip:"Skipped duplicate", rNeedKitSku:"Enter the kit SKU", rFlavorsRestocked:"flavors restocked", rUnknownKit:"Kit SKU not recognized", rDelConfirm:"Delete this return record?",
      backupTitle:"Backup", backupHint:"Download a full snapshot of all app data (every table) as one JSON file. Save it to OneDrive for a safe offline copy. Tip: set your browser's download folder to your OneDrive so every backup lands there automatically.", backupBtn:"Download full backup", backupDone:"Backup downloaded",
      facility:"Facility Map", facHint:"Interactive 3D digital twin of the SLC plant — exact layout, rooms, systems, and every pallet rack. Drag to rotate, scroll to zoom, click a bay for details. Red-flagged bays are PROPOSED future racking (not yet installed). Rack colors update live: red = occupied, green = available (Sections A-D). Built by Salvador.", facOpen:"Open full screen",
      printRecvBook:"Receiving book (Letter, fill-in)", recvBookDone:"Receiving labels ready",
      averyBtn:"Print Avery 5160 item labels", averyDone:"Avery 5160 labels ready", ident4x6Btn:"4x6 identifier labels", ident4x6Done:"4x6 labels ready",
      batchLabelBtn:"Batch label (4x6)", batchLabelDone:"Batch label ready", batchLabelHint:"Fill in Recipe, Date, and Chef, then print on the 4x6 roll.", batchRecipe:"Recipe / Flavor", batchDate:"Date", batchChef:"Chef / Made By", batchPrint:"Print Batch Label",
      bnTitle:"What to Build Now", bnNone:"No open orders loaded yet. Import SPS + ShipIQ under Demand to see the build need.", bnHintProd:"Bags to produce by flavor — driven by open customer orders OR your minimum stock levels, whichever needs more. So when there are no orders, your stock targets keep the line busy. Green = covered, amber = build, red = film short. The tag shows the driver: order or stock.", bnHintFul:"Production need by flavor, in bags and cases — the greater of open demand or minimum stock level, minus on-hand.", bnDemandBags:"Demand (bags)", bnOnHandBags:"On hand (bags)", bnToProduceBags:"To produce (BAGS)", bnToProduceCs:"To produce (cs)", bnFlavors:"flavors to build", bnDriverOrder:"order", bnDriverStock:"stock", bnAllCovered:"All flavors at target — nothing to build right now.",
      averyHint:"Both buttons include EVERY item in the system automatically — add a product and it appears here, so labels never go stale. The Avery button prints onto the 5160 sticker sheets Adriana has (just set Margins: None, Scale: 100%); the Receiving book is a Letter-size fill-in form for the dock.",
      retailprod:"Retail Production",ecomprod:"E-Commerce",epHint:"E-commerce / DTC product (variety packs). Scan or pick the item, enter the quantity built, and it is added to stock instantly. ShipStation and TikTok orders will draw this down automatically once connected.", rpHint:"When a pallet is made, scan its product barcode (or pick it), enter the quantity, and it is added to stock instantly. Print the barcode sheet with the button below and post it at the line.", rpScanP:"Scan product barcode", rpPickProduct:"Or pick a product...", rpQty:"Quantity made", rpAdd:"Add to stock", rpAdded:"Added to stock", rpCurrent:"Current on hand", rpRecent:"Recent production", rpNone:"Nothing added yet.", rpPrint:"Print product barcodes", rpNotFound:"Barcode not recognized",
      qcTitle:"Quick Case Log", qcHint:"As you finish a master case, pick the flavor and tap +1 Case. Counts go straight into today's Daily Production log.", qcFlavor:"Flavor", qcQty:"Qty", qcCase:"Case", qcScan:"Scan Case", qcToday:"Today", qcAdded:"Logged", qcPickFirst:"Pick a flavor first", qcNotFound:"Flavor not recognized",
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
      analytics:"Analytics", grpReceiving:"Receiving", grpInventory:"Inventory", grpProduction:"Fulfillment", grpShipping:"Shipping", grpPurchasing:"Purchasing", grpRnd:"R&D", grpHr:"HR", grpImprove:"Improvement", grpQuality:"Quality", compliance:"Compliance / SQF", cmpHint:"SQF food-safety program - certifications, the recurring activity schedule, and the controlled documents in the Operations shared drive.", cmpCerts:"Certifications & Audits", cmpCert:"Certification / Audit", cmpFreq:"Frequency", cmpWhen:"When / Notes", cmpBody:"Body", cmpDueThis:"Due this month", cmpAllMonthly:"Only the standard monthly reviews this month.", cmpSchedule:"SQF Activity Schedule", cmpScheduleHint:"Recurring SQF activities by frequency (from the 2026 SQF Calendar). Monthly items are also documented daily/weekly.", cmpDocs:"Document Register", cmpDocsHint:"Key SQF controlled documents - open in the Operations shared drive.", grpDocs:"Reference", reference:"Reference / SOPs", refHint:"SOPs, cheat sheets, and policies from the Smackin Docs library - one click for the floor. Upload a file and pick a category.", refDrop:"Upload document(s)", refSelected:"file(s) ready", refCategory:"Category", refNotes:"Notes (optional)", refSaveBtn:"Add to library", refNone:"No reference documents yet.", refLibrary:"Document Library", refNoFile:"Choose a file first", refSaved:"added", refConfirmDel:"Remove this document?", disposition:"Held Stock", grpSystem:"System",
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
      spoSave:"Save PO", spoCancel:"Clear", spoSaved:"Supplier PO saved", spoNoFile:"Choose a file first", spoParsed:"Read from file", spoDownload:"Download",spoOpenDetails:"Click to see full PO details",spoView2:"View",poNoLines:"No line items on file",poNoFile:"No file attached to this PO", spoDelete:"Deleted", spoList:"Uploaded supplier POs", spoNone:"No supplier POs yet. Upload one above.", spoSearchP:"Search vendor, PO #...", spoConfirmDel:"Delete this supplier PO?",
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
      grpMaintenance:"Maintenance", maintenance:"Maintenance", mtHint:"Track maintenance requests, repairs, and projects - what's active, what's blocking a pending item, and a completed history. Move each one Requested -> In Progress -> Waiting -> Done.",
      mtActive:"Active", mtDone:"Done", mtAdd:"Add request", mtAdded:"Request added",
      mtTitle:"What needs doing", mtTitleP:"e.g. P-Mac auger belt slipping", mtType:"Type", mtArea:"Area / Machine", mtAssignee:"Assignee", mtPriority:"Urgency", mtStatus:"Status", mtOpened:"Opened", mtTarget:"Target date", mtCompleted:"Completed",
      mtProblem:"Problem / description", mtProblemP:"What's wrong or what's needed?", mtNotes:"Notes", mtNotesP:"Additional notes",
      mtWaitingOn:"Waiting on", mtWaitingOnP:"e.g. part on order, vendor quote, approval", mtRequestedBy:"Requested by", mtRequestedByP:"Who's asking",
      mtReopen:"Reopen", mtNoActive:"Nothing active. Add a request above.", mtNoDone:"No completed items yet.", mtSearchP:"Search title, area, assignee...", mtConfirmDel:"Delete this item?",
      mtKpiRequested:"Requested", mtKpiInProgress:"In progress", mtKpiWaiting:"Waiting (blocked)", mtKpiDone:"Done",
      poCreate:"+ Create PO", poNewTitle:"New Purchase Order", poVendorAddr:"Vendor address", poVendorEmail:"Vendor email", poVendorPhone:"Vendor phone", poShipTo:"Ship to", poPreparedBy:"Prepared by", poAddLine:"+ Add line", poItemNo:"Item #", poDesc:"Description", poQtyL:"Qty", poPriceL:"Price", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Shipping", poTaxL:"Tax", poOtherL:"Other", poGrandL:"Total", poSaveBtn:"Save PO", poBackList:"Back to list", poSavedMsg:"PO saved", poNeedVendor:"Enter a vendor first",
      poEmail:"Email PO", poEmailTo:"To", poEmailSubjectL:"Subject", poEmailSubjectTpl:"Purchase Order", poEmailBody:"Message", poEmailSend:"Send email", poEmailCopy:"Copy PO summary",
      poEmailHint:"If email sending isn't set up yet, Send will open this in your email app instead - the PO file link is included in the message so you can attach/share it.",
      poEmailNeedTo:"Enter the vendor's email first", poEmailSending:"Sending...", poEmailOk:"PO emailed", poEmailCopied:"Copied to clipboard",
      poEmailNo:"Sending isn't set up yet - opening your email app instead.", poEmailFail:"Could not send - opening your email app instead.",
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
      floor:"Now Running", floorHint:"Live board — what's mixing and what each P-Mac machine is running right now. Tap to update; a bag-count sensor will feed in later.",
      flAddMachine:"+ Add machine", flMachineNamePrompt:"Machine name (e.g. Mixer 1, PM-3)",
      flNoMachines:"No machines added yet. Tap Add machine to create one.",
      flFlavor:"Flavor", flSize:"Size", flNone:"— none —",
      flRunning:"Running", flChangeover:"Changeover", flIdle:"Idle",
      flUpdated:"updated", flJustNow:"just now", flAgo:"ago",
      flSensor:"bags (sensor)", flDeleteConfirm:"Remove this machine?",
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
      receiveHint:"Escanee un articulo, ingrese cant. + detalles, luego elija a donde va (escanee el slot o toque Seccion-Bahia-Nivel) - llega ahi en un paso. Deje la ubicacion en blanco para dejarlo en Recibo.",rniNewBtn:"Articulo nuevo (no en la lista)",rniCancelBtn:"Usar articulo existente",rniTitle:"Crear un articulo nuevo",rniCode:"Codigo / SKU",rniName:"Nombre del articulo",rniNamePh:"ej. Caja Kraft 12x9",rniUnit:"Unidad",rniHint:"Esto agrega un articulo nuevo al maestro y luego lo recibe abajo.",rniNeed:"Ingrese codigo y nombre del articulo nuevo",
      rSupplier:"Proveedor", rInvoice:"Factura / OC #", rCategory:"Categoria", rPallets:"Pallets", rCondition:"Condicion", rStatus:"Estado",
      putHint:"Escanee el articulo, luego escanee el codigo del slot O toque Seccion - Bahia - Nivel. Sale de Recibo en tiempo real.",
      puDest:"Destino", puSection:"Seccion", puBay:"Bahia", puLevel:"Nivel", puZones:"Piso / zonas", puScanLoc:"A-05-L3 / escanee slot",
      moveHint:"Escanee articulo, elija desde y hacia (slot, WIP, Empaque, Embarque...).",
      produceHint:"Registre bolsas 4oz de la linea. Suma bolsas, consume film + sazon.",
      countHint:"Conteo ciclico: escanee articulo + slot, ingrese la cantidad contada.",
      locHint:"Lo que hay en cada ubicacion ahora.", purchHint:"Alertas de reorden mas ordenes de compra.",purchBuyList:"Lista de compra",purchSetup:"Config. de reorden",rsHint:"Defina un punto de reorden y proveedor preferido para cada articulo. Los articulos con ambos configurados apareceran en la Lista de compra cuando el stock baje.",rsNoSup:"— ninguno —",rsNeeds:"Falta config.",rsReady:"Listo",rsReorderPt:"Punto de reorden",rsNeedShort:"por configurar",rsSaved:"Guardado",rsSearchP:"Buscar articulos...",prodlog:"Produccion Diaria",bags:"Bolsas",plLot:"Lote #",plShiftLead:"Lider de Turno",plCounter:"Contador de Cajas - Detector de Metales",plStart:"Conteo Inicial",plEnd:"Conteo Final",plBoxes:"Cajas Producidas",plCounterHint:"Registrar el contador ANTES y DESPUES del turno. No reiniciar.",plAddPallet:"Agregar Paleta",plLine:"Linea",plFlavor:"Sabor",plCases:"Cajas",plNotes:"Notas / Cliente",plAdd:"Agregar al registro",plAdded:"Paleta agregada",plNeedCases:"Ingrese cantidad de cajas",plLog:"Registro de Paletas",plPalletsUsed:"Paletas Usadas",plNoPallets:"Aun no hay paletas registradas hoy.",plSummary:"Resumen Diario por Sabor",plCode:"Codigo",plCasesLogged:"Cajas Registradas",plVariance:"Variacion (contador - registro)",
      fulfilldaily:"Cumplimiento Diario", fdHint:"Registre las etiquetas de E-Commerce de hoy y la produccion de Amazon (FBA), mas notas de pedidos especiales. Se guarda por dia - tambien sirve de respaldo y doble verificacion mientras se automatiza.",
      fdDate:"Fecha", fdEcomTitle:"E-Commerce - Etiquetas por Persona", fdEcomHint:"Una fila por cada persona que trabajo etiquetas de e-com hoy. El total del dia es la suma de todos.",
      fdEmployee:"Empleado", fdPickEmployee:"Elija una persona...", fdLabelsDone:"# Etiquetas Hechas", fdAddPerson:"+ Agregar persona", fdEcomLabelsTotal:"Total Etiquetas E-Com",
      fdAmzTitle:"Amazon (FBA)", fdAmzHint:"Elija un SKU (o agregue uno personalizado) y las unidades hechas. Bolsas = unidades x bolsas/unidad - se cuenta aparte de las etiquetas e-com.",
      fdSku:"SKU", fdPickSku:"Elija un SKU...", fdCustomSku:"+ SKU personalizado...", fdCustomSkuPh:"Ingrese SKU", fdUnitsMade:"Unidades Hechas", fdBagsPerUnit:"Bolsas / Unidad", fdBags:"Bolsas",
      fdAddSku:"+ Agregar SKU", fdAmzUnitsTotal:"Total Unidades Amazon", fdAmzBagsTotal:"Total Bolsas Amazon",
      fdNotesTitle:"Notas", fdNotesHint:"Construcciones personalizadas o algo especial sobre los pedidos de hoy.", fdNotesPh:"Notas...",
      fdSave:"Guardar Dia", fdSaved:"Cumplimiento Diario guardado", fdSummary:"Resumen de Hoy", fdHistory:"Dias Recientes", fdNoHistory:"Aun no hay dias registrados.",
      fdRemove:"Quitar", fdDeleteConfirm:"Eliminar el registro de este dia?", fdHistDate:"Fecha", fdHistEcom:"Etiquetas E-Com", fdHistAmzBags:"Bolsas Amazon", fdHistNotes:"Notas", fdHistBy:"Ingresado por",
      locMap:"Mapa de racks", locList:"Lista", locFloor:"Plano", locOccupied:"Ocupado", locEmpty:"Vacio", locBlocked:"Bloqueado", locSection:"Seccion", locDocks:"Puertas de muelle", locZones:"Zonas y staging", locClickHint:"Vista superior de los racks. Verde = ocupado, haga clic en un slot para ver que hay. La bahia 01 esta junto a los muelles.", locNothing:"Nada almacenado en este slot.",lmMove:"Mover",lmSet:"Corregir conteo",lmAddItem:"Agregar articulo",lmAssign:"Colocar articulo aqui",lmEmpty:"Enviar a Staging",lmClearConfirm:"Mover todos los articulos a STAGING desde",lmMoveTitle:"Mover articulo a otra ubicacion",lmSetTitle:"Corregir el conteo",lmAssignTitle:"Colocar un articulo en esta ubicacion",lmDest:"Mover a (ubicacion)",lmMoveBtn:"Mover",lmAssignBtn:"Colocar aqui",lmEmptyConfirm:"Quitar TODOS los articulos de",lmEmptied:"vaciado", locSlot:"Slot", locBaysUsed:"slots usados", locOfficeEnd:"lado oficina", locFarEnd:"lado lejano", locView3d:"Ver en 3D",
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
      slProduct:"Producto / sabor", slLot:"Lote #", slMfr:"Fabricante", slExp:"Vencimiento", slWeight:"Peso (lbs)",slLoc:"Ubicacion",
      addLot:"Agregar lote", seasLotsTitle:"Lotes de sazon (vencimiento mas proximo primero)", quarantineExpired:"Cuarentena de vencidos",
      noLots:"Sin lotes de sazon aun.", markQuar:"Cuarentena", markGood:"Marcar bueno", expiredTag:"VENCIDO", quarTag:"CUARENTENA", goodTag:"BUENO",
      seed:"Semilla", seedHint:"Registre cada lote de semilla cruda con proveedor + lote # para trazabilidad de retiro. Mas nuevo primero.", sdType:"Tipo de semilla", sdReceived:"Recibido",sdIntCode:"Codigo interno",sdPackaging:"Empaque",sdPickPack:"Elegir empaque...",sdPallets:"# Paletas",sdPalletsShort:"paleta(s)",sdPackDate:"Fecha de empaque", seedLotsTitle:"Lotes de semilla (mas nuevo primero)", noSeedLots:"Aun no hay lotes de semilla.",
      skus:"SKUs", skusHint:"Catalogo de SKU de producto terminado / retail - paquetes, individuales y cajas con cantidad de bolsas y sabores. Solo referencia.", skuCode:"SKU", skuTitle:"Producto", skuBags:"Bolsas", skuComp:"Contenido", skuSearchP:"Buscar SKU, producto o sabor...", skuCount:"SKUs",
      stockbuild:"Construir Inventario", sbHint:"Progreso de construccion vs metas en vivo. Actualice En Mano segun avanza - todo el equipo lo ve al instante. Campo amarillo = ingrese el conteo de hoy.", sbGoal:"Meta", sbOnHand:"En mano", sbToBuild:"Por hacer", sbPallets:"Paletas", sbDone:"Listo", sbTotalGoal:"Meta total", sbComplete:"Completo", sbSaved:"Guardado", sbRetail:"Minorista", sbEcom:"Comercio Electronico", sb12pk:"Cajas de 12",
      board:"Modo Pizarra / TV", boardPick:"Elija un departamento", boardPickHint:"Abra esto en la TV y elija un departamento, o guarde el URL (ejemplo: ?board=pmac).", boardExit:"Salir", grpDemand:"Demanda", demand:"Por Departamento", demandboard:"Tablero de Pedidos", demandsched:"Programa de Produccion", demandimport:"Importar Pedidos", ecomdemand:"Demanda E-Com", forecast:"Pronostico vs Objetivo",
      fcHint:"Solo comparacion - esto no cambia los objetivos de la aplicacion.", fcSnapshot:"Instantanea", fcFlavor:"Sabor", fcApp4:"Objetivo App (4oz)", fcWip4:"Pronostico WIP (4oz)", fcDelta4:"Δ (4oz)", fcApp15:"Objetivo App (1.5oz)", fcWip15:"Pronostico WIP (1.5oz)", fcDelta15:"Δ (1.5oz)",
      fcNoAppTarget15:"Sin objetivo por sabor de 1.5oz en la app (solo cubeta / variety pack)", fcNone:"Aun no hay instantanea de pronostico. Pida a Claude que la actualice desde la hoja WIP FORECAST.", fcBags:"bolsas",
      dqMix:"Mezcla", dqPmac:"P-Mac", dqFul:"Cumplimiento", dqToday:"Hoy", dqTarget:"Meta de hoy", dqTargetShort:"Hoy",
      dqDueToday:"Pedidos para hoy", dqStock:"Reposicion de stock", dqShift:"Turno", dqS1:"Turno 1", dqS2:"Turno 2", dqShiftSplit:"dividido en 2 turnos",
      dqRemaining:"falta", dqPct:"de la meta", dqBags:"Bolsas", dqCases:"Cajas", dqAll:"Todos los sabores", dqFlavor:"Sabor (opcional)",
      dqLog:"Registrar produccion", dqLogHint:"Cada turno registra lo que produjo.", dqLogBtn:"Registrar", dqEnterQty:"Ingrese una cantidad",
      dqWeekAhead:"Proxima semana", dqWeekAheadHint:"Demanda por dia", dqResults:"Produccion de la semana", dqResultsHint:"Produccion real, Lun-Dom",
      dqTotal:"Total", dqLogged:"Registrado hoy", dqNothing:"Nada registrado hoy aun.",
      dqBuildNow:"Pedidos - armar ya", dqScheduled:"Pedidos programados (Target / McLane / Bass Pro)", dqScheduledHint:"Se envian en sus fechas programadas - no cuentan para la meta de hoy.", dqShipDate:"Fecha de envio", dqTBD:"esperando ruta",
      dqHintProd:"Meta de hoy en bolsas = pedidos para armar ya + reposicion de stock, dividida en los dos turnos. Registre a medida que avanza.", dqHintFul:"Meta de hoy en cajas = pedidos para armar ya + reposicion de stock. Registre las cajas armadas.",
      dmHint:"Cada pedido abierto por enviar, en vivo. Suba sus exportaciones SPS + ShipIQ en Importar Pedidos para actualizar; marque una PO como Enviada cuando salga.",
      dsHint:"Que producir por sabor: demanda abierta vs bolsas terminadas en mano (de Construir Inventario). Se actualiza al enviar pedidos.",
      diHint:"Suba las mismas exportaciones CSV de SPS 850 y ShipIQ que saca para el reporte semanal. La app las convierte en el tablero en vivo. Volver a subir una exportacion actualizada de una PO reemplaza sus lineas.",
      dmPartner:"Cliente", dmPO:"PO #", dmFlavor:"Sabor", dmCases:"Cajas", dmBags:"Bolsas", dmDue:"Vence", dmStatusH:"Estado", dmDCs:"CDs", dmLoadH:"Carga", dmShip:"Enviar", dmShipQ:"Marcar toda esta PO como enviada?", dmOpen:"Abierto", dmShipped:"Enviado", dmAll:"Todos", dmNone:"Aun no hay demanda cargada. Vaya a Importar Pedidos para subir sus exportaciones SPS + ShipIQ.", dmAllPartners:"Todos los clientes", dmAllFlavors:"Todos los sabores", dmTot:"Totales", dmPOs:"POs", dmDueUnknown:"sin fecha",
      dsFlavor:"Sabor", dsDemandCs:"Demanda (cj)", dsDemandBags:"Demanda (bolsas)", dsOnHand:"En mano (cj)", dsToProduce:"Por producir (cj)", dsPallets:"Paletas", dsFilm:"Pelicula (bolsas)", dsCovered:"Cubierto", dsProduce:"Producir", dsBlocked:"Falta pelicula", dsNone:"Sin demanda abierta. Importe pedidos para ver el programa.", dsGrand:"TOTAL",
      diDrop:"Suba archivos CSV SPS 850 + ShipIQ", diSelected:"archivo(s) listos", diParse:"Vista previa", diCommit:"Cargar al tablero", diClear:"Borrar toda la demanda", diLabel:"Etiqueta (ej. semana de)", diWarn:"Advertencias", diRecon:"Reconciliacion: cajas SPS vs cartones ShipIQ", diNoFiles:"Elija archivos CSV primero", diUnknown:"omitido (no es SPS/ShipIQ)", diCommitted:"cargado al tablero", diConfirmClear:"Borrar TODAS las lineas de demanda? No se puede deshacer.", diParsedFiles:"Archivos procesados", diLinesW:"lineas", diReplace:"Reimportar reemplaza las lineas abiertas de estas POs.",
      ecdHint:"Suba una exportacion CSV \u201cProduct Sales\u201d de ShipStation (SKU, Description, QtySold) para ver las bolsas necesarias por sabor en e-commerce. Los paquetes / surtidos se descomponen en bolsas automaticamente.", ecdDrop:"Suba el CSV Product Sales de ShipStation", ecdPeriod:"Periodo (dias)", ecdCommit:"Cargar", ecdClear:"Borrar snapshot", ecdConfirmClear:"Borrar el snapshot actual de demanda e-com? No se puede deshacer.", ecdPreview:"Vista previa", ecdFlavor:"Sabor", ecd4oz:"Bolsas 4oz", ecd15oz:"Bolsas 1.5oz", ecdTotal:"Total bolsas", ecdAvgDay:"Prom / dia", ecdUnmapped:"SKUs sin mapear", ecdUnmappedHint:"Estos SKUs no se pudieron mapear con confianza a un sabor \u2014 revise y digale a Claude como mapearlos.", ecdSku:"SKU", ecdDesc:"Descripcion", ecdQty:"Cantidad vendida", ecdNone:"Aun no hay demanda e-com cargada. Suba un CSV Product Sales de ShipStation arriba.", ecdLoaded:"cargado al snapshot e-com", ecdSnapshot:"Snapshot e-com actual", ecdSourceLabel:"Etiqueta de origen (ej. periodo cubierto)", ecdNotCsv:"No es un CSV Product Sales de ShipStation reconocido (se necesitan columnas SKU / Description / QtySold)", ecdRows:"filas", ecdBagsFrom:"bolsas mapeadas", ecdUnmappedUnits:"unidades sin mapear",
      returnsHint2:"Registre cada devolucion en un solo lugar. Elija el canal, escanee el articulo y la app bloquea devoluciones duplicadas (mismo tracking / Shipment ID). Los kits se pueden desglosar en sus sabores automaticamente.",
      rMajor:"Cliente Mayor", rEcom:"E-Commerce / Amazon", rCustomer:"Nombre del cliente", rAddUpc:"UPC adicional", rMarketplace:"Marketplace", rShipment:"Shipment ID", rShipAddr:"Direccion de envio", rProdCode:"Codigo de producto", rUpc:"UPC", rTracking:"# de rastreo", rReturnDate:"Fecha de devolucion",
      rIsKit:"Es un paquete variado / kit", rExplode:"Desglosar en sabores", rKitHint:"Ingrese el SKU del kit (ej. SS-CLSC-4OZ-12PK). Al reingresar suma cada sabor componente al inventario de bolsas terminadas.",
      returnsLogTitle:"Registro de Devoluciones", rWho:"Cliente / Marketplace", rRef:"Rastreo / Envio", rKitTag:"KIT", rDup:"DUP", rDupWarn:"Esta devolucion parece ya procesada:", rDupOverride:"Registrarla de nuevo?", rDupSkip:"Duplicado omitido", rNeedKitSku:"Ingrese el SKU del kit", rFlavorsRestocked:"sabores reingresados", rUnknownKit:"SKU de kit no reconocido", rDelConfirm:"Eliminar este registro de devolucion?",
      backupTitle:"Respaldo", backupHint:"Descargue una copia completa de todos los datos de la app (cada tabla) en un archivo JSON. Guardelo en OneDrive como copia segura. Consejo: configure la carpeta de descargas de su navegador en su OneDrive para que cada respaldo llegue alli automaticamente.", backupBtn:"Descargar respaldo completo", backupDone:"Respaldo descargado",
      facility:"Mapa de Planta", facHint:"Gemelo digital 3D interactivo de la planta SLC — diseno exacto, salas, sistemas y cada rack de pallets. Arrastre para girar, desplace para zoom, clic en una bahia para detalles. Las bahias en rojo son racking PROPUESTO a futuro (aun no instalado). Los colores de los racks se actualizan en vivo: rojo = ocupado, verde = disponible (Secciones A-D). Creado por Salvador.", facOpen:"Abrir pantalla completa",
      printRecvBook:"Libro de recibo (Carta, llenar)", recvBookDone:"Etiquetas listas", averyBtn:"Imprimir etiquetas Avery 5160", averyDone:"Etiquetas Avery 5160 listas", ident4x6Btn:"Etiquetas identificadoras 4x6", ident4x6Done:"Etiquetas 4x6 listas",
      batchLabelBtn:"Etiqueta de lote (4x6)", batchLabelDone:"Etiqueta de lote lista", batchLabelHint:"Llene Receta, Fecha y Chef, luego imprima en el rollo 4x6.", batchRecipe:"Receta / Sabor", batchDate:"Fecha", batchChef:"Chef / Hecho Por", batchPrint:"Imprimir Etiqueta de Lote",
      bnTitle:"Que Producir Ahora", bnNone:"Aun no hay pedidos abiertos. Importe SPS + ShipIQ en Demanda para ver la necesidad de produccion.", bnHintProd:"Bolsas a producir por sabor — segun pedidos abiertos O sus niveles minimos de inventario, lo que necesite mas. Asi, cuando no hay pedidos, sus metas de stock mantienen la linea ocupada. Verde = cubierto, ambar = producir, rojo = falta pelicula. La etiqueta muestra el origen: pedido o stock.", bnHintFul:"Necesidad de produccion por sabor, en bolsas y cajas — el mayor entre demanda abierta o nivel minimo de stock, menos en mano.", bnDemandBags:"Demanda (bolsas)", bnOnHandBags:"En mano (bolsas)", bnToProduceBags:"Por producir (BOLSAS)", bnToProduceCs:"Por producir (cj)", bnFlavors:"sabores por producir", bnDriverOrder:"pedido", bnDriverStock:"stock", bnAllCovered:"Todos los sabores en meta — nada que producir ahora.",
      averyHint:"Ambos botones incluyen TODOS los articulos del sistema automaticamente — agregue un producto y aparece aqui, asi las etiquetas nunca quedan desactualizadas. El boton Avery imprime en las hojas de stickers 5160 de Adriana (configure Margenes: Ninguno, Escala: 100%); el Libro de recibo es un formulario tamano Carta para llenar en el muelle.",
      retailprod:"Produccion Retail",ecomprod:"E-Commerce",epHint:"Producto e-commerce / DTC (paquetes variados). Escanee o elija el articulo, ingrese la cantidad producida y se agrega al inventario al instante. Los pedidos de ShipStation y TikTok lo descontaran automaticamente cuando se conecten.", rpHint:"Cuando se hace una paleta, escanee su codigo de producto (o eligalo), ingrese la cantidad y se agrega al inventario al instante. Imprima la hoja de codigos con el boton de abajo y pongala en la linea.", rpScanP:"Escanee codigo del producto", rpPickProduct:"O elija un producto...", rpQty:"Cantidad hecha", rpAdd:"Agregar al inventario", rpAdded:"Agregado al inventario", rpCurrent:"En mano actual", rpRecent:"Produccion reciente", rpNone:"Nada agregado aun.", rpPrint:"Imprimir codigos de producto", rpNotFound:"Codigo no reconocido",
      qcTitle:"Registro Rapido de Cajas", qcHint:"Al terminar una caja maestra, elija el sabor y toque +1 Caja. El conteo se agrega directo al registro de Produccion Diaria de hoy.", qcFlavor:"Sabor", qcQty:"Cant.", qcCase:"Caja", qcScan:"Escanear Caja", qcToday:"Hoy", qcAdded:"Registrado", qcPickFirst:"Elija un sabor primero", qcNotFound:"Sabor no reconocido",
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
      analytics:"Analiticas", grpReceiving:"Recibo", grpInventory:"Inventario", grpProduction:"Fulfillment", grpShipping:"Envios", grpPurchasing:"Compras", grpRnd:"I+D", grpHr:"RH", grpImprove:"Mejora", grpQuality:"Calidad", compliance:"Cumplimiento / SQF", cmpHint:"Programa de inocuidad SQF - certificaciones, el calendario de actividades recurrentes y los documentos controlados en la unidad compartida de Operaciones.", cmpCerts:"Certificaciones y Auditorias", cmpCert:"Certificacion / Auditoria", cmpFreq:"Frecuencia", cmpWhen:"Cuando / Notas", cmpBody:"Organismo", cmpDueThis:"Vence este mes", cmpAllMonthly:"Solo las revisiones mensuales estandar este mes.", cmpSchedule:"Calendario de Actividades SQF", cmpScheduleHint:"Actividades SQF recurrentes por frecuencia (del Calendario SQF 2026). Los items mensuales tambien se documentan diario/semanal.", cmpDocs:"Registro de Documentos", cmpDocsHint:"Documentos controlados SQF clave - abrir en la unidad compartida de Operaciones.", grpDocs:"Referencia", reference:"Referencia / SOPs", refHint:"SOPs, hojas de referencia y politicas de la biblioteca Smackin Docs - un clic para el piso. Suba un archivo y elija una categoria.", refDrop:"Subir documento(s)", refSelected:"archivo(s) listos", refCategory:"Categoria", refNotes:"Notas (opcional)", refSaveBtn:"Agregar a la biblioteca", refNone:"Aun no hay documentos de referencia.", refLibrary:"Biblioteca de Documentos", refNoFile:"Elija un archivo primero", refSaved:"agregado(s)", refConfirmDel:"Quitar este documento?", disposition:"Retenido", grpSystem:"Sistema",
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
      spoSave:"Guardar OC", spoCancel:"Limpiar", spoSaved:"OC de proveedor guardada", spoNoFile:"Elija un archivo primero", spoParsed:"Leido del archivo", spoDownload:"Descargar",spoOpenDetails:"Clic para ver los detalles completos de la OC",spoView2:"Ver",poNoLines:"Sin lineas de articulo registradas",poNoFile:"Sin archivo adjunto a esta OC", spoDelete:"Eliminado", spoList:"OC de proveedor subidas", spoNone:"Aun no hay OC de proveedor. Suba una arriba.", spoSearchP:"Buscar proveedor, OC #...", spoConfirmDel:"Eliminar esta OC de proveedor?",
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
      grpMaintenance:"Mantenimiento", maintenance:"Mantenimiento", mtHint:"Rastree solicitudes de mantenimiento, reparaciones y proyectos - que esta activo, que bloquea un pendiente y un historial de completados. Mueva cada uno Solicitado -> En Curso -> Esperando -> Hecho.",
      mtActive:"Activos", mtDone:"Hechos", mtAdd:"Agregar solicitud", mtAdded:"Solicitud agregada",
      mtTitle:"Que se necesita hacer", mtTitleP:"ej. Correa del auger de P-Mac resbalando", mtType:"Tipo", mtArea:"Area / Maquina", mtAssignee:"Asignado a", mtPriority:"Urgencia", mtStatus:"Estado", mtOpened:"Abierta", mtTarget:"Fecha objetivo", mtCompleted:"Completada",
      mtProblem:"Problema / descripcion", mtProblemP:"Que esta mal o que se necesita?", mtNotes:"Notas", mtNotesP:"Notas adicionales",
      mtWaitingOn:"Esperando por", mtWaitingOnP:"ej. pieza pedida, cotizacion del proveedor, aprobacion", mtRequestedBy:"Solicitado por", mtRequestedByP:"Quien lo solicita",
      mtReopen:"Reabrir", mtNoActive:"Nada activo. Agregue una solicitud arriba.", mtNoDone:"Aun no hay elementos completados.", mtSearchP:"Buscar titulo, area, asignado...", mtConfirmDel:"Eliminar este elemento?",
      mtKpiRequested:"Solicitados", mtKpiInProgress:"En curso", mtKpiWaiting:"Esperando (bloqueado)", mtKpiDone:"Hechos",
      poCreate:"+ Crear OC", poNewTitle:"Nueva Orden de Compra", poVendorAddr:"Direccion del proveedor", poVendorEmail:"Correo del proveedor", poVendorPhone:"Telefono del proveedor", poShipTo:"Enviar a", poPreparedBy:"Preparado por", poAddLine:"+ Agregar linea", poItemNo:"Articulo #", poDesc:"Descripcion", poQtyL:"Cant", poPriceL:"Precio", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Envio", poTaxL:"Impuesto", poOtherL:"Otro", poGrandL:"Total", poSaveBtn:"Guardar OC", poBackList:"Volver a la lista", poSavedMsg:"OC guardada", poNeedVendor:"Ingrese un proveedor primero",
      poEmail:"Enviar OC por correo", poEmailTo:"Para", poEmailSubjectL:"Asunto", poEmailSubjectTpl:"Orden de Compra", poEmailBody:"Mensaje", poEmailSend:"Enviar correo", poEmailCopy:"Copiar resumen de OC",
      poEmailHint:"Si el envio de correo aun no esta configurado, Enviar abrira esto en su aplicacion de correo - el enlace del archivo de la OC va incluido en el mensaje para que lo pueda adjuntar/compartir.",
      poEmailNeedTo:"Ingrese primero el correo del proveedor", poEmailSending:"Enviando...", poEmailOk:"OC enviada por correo", poEmailCopied:"Copiado al portapapeles",
      poEmailNo:"El envio de correo aun no esta configurado - abriendo su aplicacion de correo.", poEmailFail:"No se pudo enviar - abriendo su aplicacion de correo.",
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
      floor:"En Marcha", floorHint:"Tablero en vivo — que se esta mezclando y que corre cada maquina P-Mac ahora mismo. Toque para actualizar; un sensor de conteo de bolsas se conectara despues.",
      flAddMachine:"+ Anadir maquina", flMachineNamePrompt:"Nombre de maquina (ej. Mezcladora 1, PM-3)",
      flNoMachines:"Aun no hay maquinas. Toque Anadir maquina para crear una.",
      flFlavor:"Sabor", flSize:"Tamano", flNone:"— ninguno —",
      flRunning:"Corriendo", flChangeover:"Cambio", flIdle:"Inactiva",
      flUpdated:"actualizado", flJustNow:"ahora mismo", flAgo:"hace",
      flSensor:"bolsas (sensor)", flDeleteConfirm:"Quitar esta maquina?",
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
      receiveHint:"Escaneie um item, digite qtd. + detalhes, depois escolha para onde vai (escaneie o slot ou toque Secao-Baia-Nivel) - chega la em um passo. Deixe o local em branco para segurar no Recebimento.",rniNewBtn:"Item novo (nao esta na lista)",rniCancelBtn:"Usar item existente",rniTitle:"Criar um item novo",rniCode:"Codigo / SKU",rniName:"Nome do item",rniNamePh:"ex. Caixa Kraft 12x9",rniUnit:"Unidade",rniHint:"Isto adiciona um item novo ao mestre e depois o recebe abaixo.",rniNeed:"Insira codigo e nome do item novo",
      rSupplier:"Fornecedor", rInvoice:"Fatura / OC #", rCategory:"Categoria", rPallets:"Paletes", rCondition:"Condicao", rStatus:"Status",
      putHint:"Escaneie o item, depois escaneie o codigo do slot OU toque Secao - Baia - Nivel. Sai de Recebimento em tempo real.",
      puDest:"Destino", puSection:"Secao", puBay:"Baia", puLevel:"Nivel", puZones:"Piso / zonas", puScanLoc:"A-05-L3 / escaneie slot",
      moveHint:"Escaneie item, escolha de e para (slot, WIP, Empacotamento, Expedicao...).",
      produceHint:"Registre sacos 4oz da linha. Adiciona sacos, consome filme + tempero.",
      countHint:"Contagem ciclica: escaneie item + slot, digite a quantidade contada.",
      locHint:"O que ha em cada local agora.", purchHint:"Alertas de reposicao mais ordens de compra.",purchBuyList:"Lista de compras",purchSetup:"Config. de reposicao",rsHint:"Defina um ponto de reposicao e fornecedor preferido para cada item. Itens com ambos configurados aparecerao na Lista de compras quando o estoque baixar.",rsNoSup:"— nenhum —",rsNeeds:"Falta config.",rsReady:"Pronto",rsReorderPt:"Ponto de reposicao",rsNeedShort:"a configurar",rsSaved:"Salvo",rsSearchP:"Buscar itens...",prodlog:"Producao Diaria",bags:"Bolsas",plLot:"Lote #",plShiftLead:"Lider de Turno",plCounter:"Contador de Caixas - Detector de Metais",plStart:"Contagem Inicial",plEnd:"Contagem Final",plBoxes:"Caixas Produzidas",plCounterHint:"Registrar o contador ANTES e DEPOIS do turno. Nao reiniciar.",plAddPallet:"Adicionar Palete",plLine:"Linha",plFlavor:"Sabor",plCases:"Caixas",plNotes:"Notas / Cliente",plAdd:"Adicionar ao registro",plAdded:"Palete adicionado",plNeedCases:"Insira a quantidade de caixas",plLog:"Registro de Paletes",plPalletsUsed:"Paletes Usados",plNoPallets:"Nenhum palete registrado hoje ainda.",plSummary:"Resumo Diario por Sabor",plCode:"Codigo",plCasesLogged:"Caixas Registradas",plVariance:"Variacao (contador - registro)",
      fulfilldaily:"Cumprimento Diario", fdHint:"Registre as etiquetas de E-Commerce de hoje e a producao da Amazon (FBA), mais notas de pedidos especiais. Salvo por dia - tambem serve de backup e dupla verificacao enquanto a automacao e construida.",
      fdDate:"Data", fdEcomTitle:"E-Commerce - Etiquetas por Pessoa", fdEcomHint:"Uma linha por pessoa que trabalhou etiquetas de e-com hoje. O total do dia e a soma de todos.",
      fdEmployee:"Funcionario", fdPickEmployee:"Escolha uma pessoa...", fdLabelsDone:"# Etiquetas Feitas", fdAddPerson:"+ Adicionar pessoa", fdEcomLabelsTotal:"Total Etiquetas E-Com",
      fdAmzTitle:"Amazon (FBA)", fdAmzHint:"Escolha um SKU (ou adicione um personalizado) e as unidades feitas. Sacos = unidades x sacos/unidade - contado separado das etiquetas e-com.",
      fdSku:"SKU", fdPickSku:"Escolha um SKU...", fdCustomSku:"+ SKU personalizado...", fdCustomSkuPh:"Digite o SKU", fdUnitsMade:"Unidades Feitas", fdBagsPerUnit:"Sacos / Unidade", fdBags:"Sacos",
      fdAddSku:"+ Adicionar SKU", fdAmzUnitsTotal:"Total Unidades Amazon", fdAmzBagsTotal:"Total Sacos Amazon",
      fdNotesTitle:"Notas", fdNotesHint:"Construcoes personalizadas ou algo especial sobre os pedidos de hoje.", fdNotesPh:"Notas...",
      fdSave:"Salvar Dia", fdSaved:"Cumprimento Diario salvo", fdSummary:"Resumo de Hoje", fdHistory:"Dias Recentes", fdNoHistory:"Nenhum dia registrado ainda.",
      fdRemove:"Remover", fdDeleteConfirm:"Excluir o registro deste dia?", fdHistDate:"Data", fdHistEcom:"Etiquetas E-Com", fdHistAmzBags:"Sacos Amazon", fdHistNotes:"Notas", fdHistBy:"Inserido por",
      locMap:"Mapa de racks", locList:"Lista", locFloor:"Planta", locOccupied:"Ocupado", locEmpty:"Vazio", locBlocked:"Bloqueado", locSection:"Secao", locDocks:"Portas de doca", locZones:"Zonas e staging", locClickHint:"Vista de cima dos racks. Verde = ocupado, clique em um slot para ver o que ha. A baia 01 fica junto as docas.", locNothing:"Nada armazenado neste slot.",lmMove:"Mover",lmSet:"Corrigir contagem",lmAddItem:"Adicionar item",lmAssign:"Colocar item aqui",lmEmpty:"Enviar para Staging",lmClearConfirm:"Mover todos os itens para STAGING de",lmMoveTitle:"Mover item para outra localizacao",lmSetTitle:"Corrigir a contagem",lmAssignTitle:"Colocar um item nesta localizacao",lmDest:"Mover para (localizacao)",lmMoveBtn:"Mover",lmAssignBtn:"Colocar aqui",lmEmptyConfirm:"Remover TODOS os itens de",lmEmptied:"esvaziado", locSlot:"Slot", locBaysUsed:"slots usados", locOfficeEnd:"lado escritorio", locFarEnd:"lado distante", locView3d:"Ver em 3D",
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
      slProduct:"Produto / sabor", slLot:"Lote #", slMfr:"Fabricante", slExp:"Validade", slWeight:"Peso (lbs)",slLoc:"Localizacao",
      addLot:"Adicionar lote", seasLotsTitle:"Lotes de tempero (validade mais proxima primeiro)", quarantineExpired:"Quarentena de vencidos",
      noLots:"Nenhum lote de tempero ainda.", markQuar:"Quarentena", markGood:"Marcar bom", expiredTag:"VENCIDO", quarTag:"QUARENTENA", goodTag:"BOM",
      seed:"Semente", seedHint:"Registre cada lote de semente crua com fornecedor + lote # para rastreabilidade de recall. Mais novo primeiro.", sdType:"Tipo de semente", sdReceived:"Recebido",sdIntCode:"Codigo interno",sdPackaging:"Embalagem",sdPickPack:"Selecionar embalagem...",sdPallets:"# Paletes",sdPalletsShort:"palete(s)",sdPackDate:"Data de embalagem", seedLotsTitle:"Lotes de semente (mais novo primeiro)", noSeedLots:"Ainda nao ha lotes de semente.",
      skus:"SKUs", skusHint:"Catalogo de SKU de produto acabado / varejo - pacotes, individuais e caixas com contagem de sacos e sabores. Apenas referencia.", skuCode:"SKU", skuTitle:"Produto", skuBags:"Sacos", skuComp:"Conteudo", skuSearchP:"Buscar SKU, produto ou sabor...", skuCount:"SKUs",
      stockbuild:"Construir Estoque", sbHint:"Progresso de construcao vs metas ao vivo. Atualize Em Estoque conforme avanca - toda a equipe ve na hora. Campo amarelo = insira a contagem de hoje.", sbGoal:"Meta", sbOnHand:"Em estoque", sbToBuild:"A fazer", sbPallets:"Paletes", sbDone:"Pronto", sbTotalGoal:"Meta total", sbComplete:"Completo", sbSaved:"Salvo", sbRetail:"Varejo", sbEcom:"E-Commerce", sb12pk:"Caixas de 12",
      board:"Modo Painel / TV", boardPick:"Escolha um departamento", boardPickHint:"Abra isto na TV e escolha um departamento, ou salve o URL (exemplo: ?board=pmac).", boardExit:"Sair", grpDemand:"Demanda", demand:"Por Departamento", demandboard:"Painel de Pedidos", demandsched:"Programa de Producao", demandimport:"Importar Pedidos", ecomdemand:"Demanda E-Com", forecast:"Previsao vs Meta",
      fcHint:"Somente comparacao - isso nao altera as metas do aplicativo.", fcSnapshot:"Instantaneo", fcFlavor:"Sabor", fcApp4:"Meta App (4oz)", fcWip4:"Previsao WIP (4oz)", fcDelta4:"Δ (4oz)", fcApp15:"Meta App (1.5oz)", fcWip15:"Previsao WIP (1.5oz)", fcDelta15:"Δ (1.5oz)",
      fcNoAppTarget15:"Sem meta por sabor de 1.5oz no app (somente balde / variety pack)", fcNone:"Ainda sem instantaneo de previsao. Peca ao Claude para atualizar a partir da planilha WIP FORECAST.", fcBags:"sacos",
      dqMix:"Mistura", dqPmac:"P-Mac", dqFul:"Expedicao", dqToday:"Hoje", dqTarget:"Meta de hoje", dqTargetShort:"Hoje",
      dqDueToday:"Pedidos para hoje", dqStock:"Reposicao de estoque", dqShift:"Turno", dqS1:"Turno 1", dqS2:"Turno 2", dqShiftSplit:"dividido em 2 turnos",
      dqRemaining:"falta", dqPct:"da meta", dqBags:"Sacos", dqCases:"Caixas", dqAll:"Todos os sabores", dqFlavor:"Sabor (opcional)",
      dqLog:"Registrar producao", dqLogHint:"Cada turno registra o que produziu.", dqLogBtn:"Registrar", dqEnterQty:"Insira uma quantidade",
      dqWeekAhead:"Proxima semana", dqWeekAheadHint:"Demanda por dia", dqResults:"Producao da semana", dqResultsHint:"Producao real, Seg-Dom",
      dqTotal:"Total", dqLogged:"Registrado hoje", dqNothing:"Nada registrado hoje ainda.",
      dqBuildNow:"Pedidos - montar ja", dqScheduled:"Pedidos programados (Target / McLane / Bass Pro)", dqScheduledHint:"Enviados nas datas programadas - nao contam para a meta de hoje.", dqShipDate:"Data de envio", dqTBD:"aguardando rota",
      dqHintProd:"Meta de hoje em sacos = pedidos para montar ja + reposicao de estoque, dividida nos dois turnos. Registre conforme avanca.", dqHintFul:"Meta de hoje em caixas = pedidos para montar ja + reposicao de estoque. Registre as caixas montadas.",
      dmHint:"Cada pedido aberto a enviar, ao vivo. Envie suas exportacoes SPS + ShipIQ em Importar Pedidos para atualizar; marque uma PO como Enviada quando sair.",
      dsHint:"O que produzir por sabor: demanda aberta vs bolsas prontas em estoque (de Construir Estoque). Atualiza ao enviar pedidos.",
      diHint:"Envie as mesmas exportacoes CSV de SPS 850 e ShipIQ que voce puxa para o relatorio semanal. O app as converte no painel ao vivo. Reenviar uma exportacao atualizada de uma PO substitui suas linhas.",
      dmPartner:"Cliente", dmPO:"PO #", dmFlavor:"Sabor", dmCases:"Caixas", dmBags:"Bolsas", dmDue:"Vence", dmStatusH:"Status", dmDCs:"CDs", dmLoadH:"Carga", dmShip:"Enviar", dmShipQ:"Marcar toda esta PO como enviada?", dmOpen:"Aberto", dmShipped:"Enviado", dmAll:"Todos", dmNone:"Nenhuma demanda carregada ainda. Va em Importar Pedidos para enviar suas exportacoes SPS + ShipIQ.", dmAllPartners:"Todos os clientes", dmAllFlavors:"Todos os sabores", dmTot:"Totais", dmPOs:"POs", dmDueUnknown:"sem data",
      dsFlavor:"Sabor", dsDemandCs:"Demanda (cx)", dsDemandBags:"Demanda (bolsas)", dsOnHand:"Em estoque (cx)", dsToProduce:"A produzir (cx)", dsPallets:"Paletes", dsFilm:"Filme (bolsas)", dsCovered:"Coberto", dsProduce:"Produzir", dsBlocked:"Falta filme", dsNone:"Sem demanda aberta. Importe pedidos para ver o programa.", dsGrand:"TOTAL",
      diDrop:"Envie arquivos CSV SPS 850 + ShipIQ", diSelected:"arquivo(s) prontos", diParse:"Previa", diCommit:"Carregar no painel", diClear:"Limpar toda a demanda", diLabel:"Rotulo (ex. semana de)", diWarn:"Avisos", diRecon:"Reconciliacao: caixas SPS vs cartoes ShipIQ", diNoFiles:"Escolha arquivos CSV primeiro", diUnknown:"ignorado (nao e SPS/ShipIQ)", diCommitted:"carregado no painel", diConfirmClear:"Excluir TODAS as linhas de demanda? Nao pode ser desfeito.", diParsedFiles:"Arquivos processados", diLinesW:"linhas", diReplace:"Reimportar substitui as linhas abertas destas POs.",
      ecdHint:"Envie uma exportacao CSV \u201cProduct Sales\u201d do ShipStation (SKU, Description, QtySold) para ver as bolsas necessarias por sabor no e-commerce. Pacotes / variedades sao decompostos em bolsas automaticamente.", ecdDrop:"Envie o CSV Product Sales do ShipStation", ecdPeriod:"Periodo (dias)", ecdCommit:"Carregar", ecdClear:"Limpar snapshot", ecdConfirmClear:"Excluir o snapshot atual de demanda e-com? Nao pode ser desfeito.", ecdPreview:"Previa", ecdFlavor:"Sabor", ecd4oz:"Bolsas 4oz", ecd15oz:"Bolsas 1.5oz", ecdTotal:"Total de bolsas", ecdAvgDay:"Media / dia", ecdUnmapped:"SKUs nao mapeados", ecdUnmappedHint:"Estes SKUs nao puderam ser mapeados com confianca a um sabor \u2014 revise e diga ao Claude como mapea-los.", ecdSku:"SKU", ecdDesc:"Descricao", ecdQty:"Qtd vendida", ecdNone:"Nenhuma demanda e-com carregada ainda. Envie um CSV Product Sales do ShipStation acima.", ecdLoaded:"carregado no snapshot e-com", ecdSnapshot:"Snapshot e-com atual", ecdSourceLabel:"Rotulo de origem (ex. periodo coberto)", ecdNotCsv:"Nao e um CSV Product Sales do ShipStation reconhecido (precisa das colunas SKU / Description / QtySold)", ecdRows:"linhas", ecdBagsFrom:"bolsas mapeadas", ecdUnmappedUnits:"unidades nao mapeadas",
      returnsHint2:"Registre cada devolucao em um so lugar. Escolha o canal, escaneie o item, e o app bloqueia devolucoes duplicadas (mesmo tracking / Shipment ID). Kits podem ser desmembrados em seus sabores automaticamente.",
      rMajor:"Cliente Grande", rEcom:"E-Commerce / Amazon", rCustomer:"Nome do cliente", rAddUpc:"UPC adicional", rMarketplace:"Marketplace", rShipment:"Shipment ID", rShipAddr:"Endereco de envio", rProdCode:"Codigo do produto", rUpc:"UPC", rTracking:"# de rastreio", rReturnDate:"Data da devolucao",
      rIsKit:"E um pacote variado / kit", rExplode:"Desmembrar em sabores", rKitHint:"Insira o SKU do kit (ex. SS-CLSC-4OZ-12PK). Ao reabastecer, soma cada sabor componente ao estoque de bolsas prontas.",
      returnsLogTitle:"Registro de Devolucoes", rWho:"Cliente / Marketplace", rRef:"Rastreio / Envio", rKitTag:"KIT", rDup:"DUP", rDupWarn:"Esta devolucao parece ja processada:", rDupOverride:"Registrar novamente?", rDupSkip:"Duplicado ignorado", rNeedKitSku:"Insira o SKU do kit", rFlavorsRestocked:"sabores reabastecidos", rUnknownKit:"SKU de kit nao reconhecido", rDelConfirm:"Excluir este registro de devolucao?",
      backupTitle:"Backup", backupHint:"Baixe uma copia completa de todos os dados do app (cada tabela) em um arquivo JSON. Salve no OneDrive como copia segura. Dica: configure a pasta de downloads do seu navegador para o seu OneDrive para que cada backup va para la automaticamente.", backupBtn:"Baixar backup completo", backupDone:"Backup baixado",
      facility:"Mapa da Planta", facHint:"Gemeo digital 3D interativo da planta SLC — layout exato, salas, sistemas e cada rack de paletes. Arraste para girar, role para zoom, clique numa baia para detalhes. Baias em vermelho sao racking PROPOSTO futuro (ainda nao instalado). As cores dos racks atualizam ao vivo: vermelho = ocupado, verde = disponivel (Secoes A-D). Feito pelo Salvador.", facOpen:"Abrir tela cheia",
      printRecvBook:"Livro de recebimento (Carta, preencher)", recvBookDone:"Etiquetas prontas", averyBtn:"Imprimir etiquetas Avery 5160", averyDone:"Etiquetas Avery 5160 prontas", ident4x6Btn:"Etiquetas identificadoras 4x6", ident4x6Done:"Etiquetas 4x6 prontas",
      batchLabelBtn:"Etiqueta de lote (4x6)", batchLabelDone:"Etiqueta de lote pronta", batchLabelHint:"Preencha Receita, Data e Chef, depois imprima no rolo 4x6.", batchRecipe:"Receita / Sabor", batchDate:"Data", batchChef:"Chef / Feito Por", batchPrint:"Imprimir Etiqueta de Lote",
      bnTitle:"O Que Produzir Agora", bnNone:"Nenhum pedido aberto ainda. Importe SPS + ShipIQ em Demanda para ver a necessidade de producao.", bnHintProd:"Bolsas a produzir por sabor — conforme pedidos abertos OU seus niveis minimos de estoque, o que precisar mais. Assim, quando nao ha pedidos, suas metas de estoque mantem a linha ocupada. Verde = coberto, ambar = produzir, vermelho = falta filme. A etiqueta mostra a origem: pedido ou estoque.", bnHintFul:"Necessidade de producao por sabor, em bolsas e caixas — o maior entre demanda aberta ou nivel minimo de estoque, menos em estoque.", bnDemandBags:"Demanda (bolsas)", bnOnHandBags:"Em estoque (bolsas)", bnToProduceBags:"A produzir (BOLSAS)", bnToProduceCs:"A produzir (cx)", bnFlavors:"sabores a produzir", bnDriverOrder:"pedido", bnDriverStock:"estoque", bnAllCovered:"Todos os sabores na meta — nada a produzir agora.",
      averyHint:"Ambos os botoes incluem TODOS os itens do sistema automaticamente — adicione um produto e ele aparece aqui, entao as etiquetas nunca ficam desatualizadas. O botao Avery imprime nas folhas de adesivos 5160 da Adriana (configure Margens: Nenhuma, Escala: 100%); o Livro de recebimento e um formulario tamanho Carta para preencher na doca.",
      retailprod:"Producao Varejo",ecomprod:"E-Commerce",epHint:"Produto e-commerce / DTC (pacotes variados). Escaneie ou escolha o item, insira a quantidade produzida e ela e adicionada ao estoque na hora. Os pedidos do ShipStation e TikTok vao baixar isso automaticamente quando conectados.", rpHint:"Quando um palete e feito, escaneie o codigo do produto (ou escolha), insira a quantidade e ela e adicionada ao estoque na hora. Imprima a folha de codigos com o botao abaixo e coloque na linha.", rpScanP:"Escaneie codigo do produto", rpPickProduct:"Ou escolha um produto...", rpQty:"Quantidade feita", rpAdd:"Adicionar ao estoque", rpAdded:"Adicionado ao estoque", rpCurrent:"Em estoque atual", rpRecent:"Producao recente", rpNone:"Nada adicionado ainda.", rpPrint:"Imprimir codigos de produto", rpNotFound:"Codigo nao reconhecido",
      qcTitle:"Registro Rapido de Caixas", qcHint:"Ao terminar uma caixa mestre, escolha o sabor e toque +1 Caixa. A contagem vai direto para o registro de Producao Diaria de hoje.", qcFlavor:"Sabor", qcQty:"Qtd.", qcCase:"Caixa", qcScan:"Escanear Caixa", qcToday:"Hoje", qcAdded:"Registrado", qcPickFirst:"Escolha um sabor primeiro", qcNotFound:"Sabor nao reconhecido",
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
      analytics:"Analises", grpReceiving:"Recebimento", grpInventory:"Estoque", grpProduction:"Fulfillment", grpShipping:"Envios", grpPurchasing:"Compras", grpRnd:"P&D", grpHr:"RH", grpImprove:"Melhoria", grpQuality:"Qualidade", compliance:"Conformidade / SQF", cmpHint:"Programa de seguranca de alimentos SQF - certificacoes, o calendario de atividades recorrentes e os documentos controlados no drive compartilhado de Operacoes.", cmpCerts:"Certificacoes e Auditorias", cmpCert:"Certificacao / Auditoria", cmpFreq:"Frequencia", cmpWhen:"Quando / Notas", cmpBody:"Orgao", cmpDueThis:"Vence este mes", cmpAllMonthly:"Apenas as revisoes mensais padrao este mes.", cmpSchedule:"Calendario de Atividades SQF", cmpScheduleHint:"Atividades SQF recorrentes por frequencia (do Calendario SQF 2026). Itens mensais tambem documentados diario/semanal.", cmpDocs:"Registro de Documentos", cmpDocsHint:"Documentos controlados SQF principais - abrir no drive compartilhado de Operacoes.", grpDocs:"Referencia", reference:"Referencia / SOPs", refHint:"SOPs, folhas de referencia e politicas da biblioteca Smackin Docs - um clique para o chao de fabrica. Envie um arquivo e escolha uma categoria.", refDrop:"Enviar documento(s)", refSelected:"arquivo(s) prontos", refCategory:"Categoria", refNotes:"Notas (opcional)", refSaveBtn:"Adicionar a biblioteca", refNone:"Ainda nao ha documentos de referencia.", refLibrary:"Biblioteca de Documentos", refNoFile:"Escolha um arquivo primeiro", refSaved:"adicionado(s)", refConfirmDel:"Remover este documento?", disposition:"Retido", grpSystem:"Sistema",
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
      spoSave:"Salvar OC", spoCancel:"Limpar", spoSaved:"OC de fornecedor salva", spoNoFile:"Escolha um arquivo primeiro", spoParsed:"Lido do arquivo", spoDownload:"Baixar",spoOpenDetails:"Clique para ver os detalhes completos da OC",spoView2:"Ver",poNoLines:"Sem itens de linha registrados",poNoFile:"Nenhum arquivo anexado a esta OC", spoDelete:"Excluido", spoList:"OCs de fornecedor enviadas", spoNone:"Ainda nao ha OCs de fornecedor. Envie uma acima.", spoSearchP:"Buscar fornecedor, OC #...", spoConfirmDel:"Excluir esta OC de fornecedor?",
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
      grpMaintenance:"Manutencao", maintenance:"Manutencao", mtHint:"Acompanhe solicitacoes de manutencao, reparos e projetos - o que esta ativo, o que esta bloqueando um pendente e um historico de concluidos. Mova cada um Solicitado -> Em Andamento -> Aguardando -> Concluido.",
      mtActive:"Ativos", mtDone:"Concluidos", mtAdd:"Adicionar solicitacao", mtAdded:"Solicitacao adicionada",
      mtTitle:"O que precisa ser feito", mtTitleP:"ex. Correia do rosca do P-Mac escorregando", mtType:"Tipo", mtArea:"Area / Maquina", mtAssignee:"Responsavel", mtPriority:"Urgencia", mtStatus:"Status", mtOpened:"Aberta", mtTarget:"Data alvo", mtCompleted:"Concluida",
      mtProblem:"Problema / descricao", mtProblemP:"O que esta errado ou o que e necessario?", mtNotes:"Observacoes", mtNotesP:"Observacoes adicionais",
      mtWaitingOn:"Aguardando", mtWaitingOnP:"ex. peca em pedido, orcamento do fornecedor, aprovacao", mtRequestedBy:"Solicitado por", mtRequestedByP:"Quem esta solicitando",
      mtReopen:"Reabrir", mtNoActive:"Nada ativo. Adicione uma solicitacao acima.", mtNoDone:"Nenhum item concluido ainda.", mtSearchP:"Buscar titulo, area, responsavel...", mtConfirmDel:"Excluir este item?",
      mtKpiRequested:"Solicitados", mtKpiInProgress:"Em andamento", mtKpiWaiting:"Aguardando (bloqueado)", mtKpiDone:"Concluidos",
      poCreate:"+ Criar OC", poNewTitle:"Nova Ordem de Compra", poVendorAddr:"Endereco do fornecedor", poVendorEmail:"Email do fornecedor", poVendorPhone:"Telefone do fornecedor", poShipTo:"Enviar para", poPreparedBy:"Preparado por", poAddLine:"+ Adicionar linha", poItemNo:"Item #", poDesc:"Descricao", poQtyL:"Qtd", poPriceL:"Preco", poLineTot:"Total", poSubtotalL:"Subtotal", poShippingL:"Frete", poTaxL:"Imposto", poOtherL:"Outro", poGrandL:"Total", poSaveBtn:"Salvar OC", poBackList:"Voltar a lista", poSavedMsg:"OC salva", poNeedVendor:"Insira um fornecedor primeiro",
      poEmail:"Enviar OC por email", poEmailTo:"Para", poEmailSubjectL:"Assunto", poEmailSubjectTpl:"Ordem de Compra", poEmailBody:"Mensagem", poEmailSend:"Enviar email", poEmailCopy:"Copiar resumo da OC",
      poEmailHint:"Se o envio de email ainda nao estiver configurado, Enviar vai abrir isto no seu aplicativo de email - o link do arquivo da OC esta incluido na mensagem para voce anexar/compartilhar.",
      poEmailNeedTo:"Insira primeiro o email do fornecedor", poEmailSending:"Enviando...", poEmailOk:"OC enviada por email", poEmailCopied:"Copiado para a area de transferencia",
      poEmailNo:"O envio de email ainda nao esta configurado - abrindo seu aplicativo de email.", poEmailFail:"Nao foi possivel enviar - abrindo seu aplicativo de email.",
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
      floor:"Em Andamento", floorHint:"Painel ao vivo — o que esta misturando e o que cada maquina P-Mac esta rodando agora. Toque para atualizar; um sensor de contagem de sacos sera conectado depois.",
      flAddMachine:"+ Adicionar maquina", flMachineNamePrompt:"Nome da maquina (ex. Misturador 1, PM-3)",
      flNoMachines:"Nenhuma maquina ainda. Toque em Adicionar maquina para criar uma.",
      flFlavor:"Sabor", flSize:"Tamanho", flNone:"— nenhum —",
      flRunning:"Rodando", flChangeover:"Troca", flIdle:"Parada",
      flUpdated:"atualizado", flJustNow:"agora mesmo", flAgo:"atras",
      flSensor:"sacos (sensor)", flDeleteConfirm:"Remover esta maquina?",
      settingsHint:"Modo, layout e controles demo." }
  };
  let lang = "en"; const L = k => (T[lang][k] !== undefined ? T[lang][k] : (T.en[k] !== undefined ? T.en[k] : k));
  let active = "home"; let catFilter = "all";
  let purchMode = "list"; let purchSup = null; let receivingPOid = null;
  let purchView = "buy";  // Purchasing: "buy" (Buy List + POs) | "setup" (reorder-point/supplier config)
  let purchSetupCat = "all";  // Reorder-setup category filter
  let plDate = null;  // Daily Production log: selected date (defaults to today)
  // Retail production flavor codes (mirrors Jesus's "Flavors codes" sheet); bpc = bags per case/box
  const PROD_FLAVORS = [
    { code: "S01", name: "OG Original", bpc: 72 }, { code: "S02", name: "Cinnamon Churro", bpc: 72 },
    { code: "S03", name: "Backyard BBQ", bpc: 72 }, { code: "S04", name: "Garlic Parmesan", bpc: 72 },
    { code: "S05", name: "Dill Pickle", bpc: 72 }, { code: "S06", name: "Cracked Pepper", bpc: 72 },
    { code: "S07", name: "Cheddar Jalapeno", bpc: 72 }, { code: "S08", name: "Ranch", bpc: 72 },
    { code: "S09", name: "Maple Brown Sugar", bpc: 72 }, { code: "S10", name: "Lemon Pepper", bpc: 72 },
    { code: "S11", name: "Sour Cream & Onion", bpc: 72 },
    { code: "WM-S02", name: "WM Cinnamon Churro (12pk)", bpc: 12 }, { code: "WM-S03", name: "WM Backyard BBQ (12pk)", bpc: 12 },
    { code: "WM-S04", name: "WM Garlic Parmesan (12pk)", bpc: 12 }, { code: "WM-S07", name: "WM Cheddar Jalapeno (12pk)", bpc: 12 },
    { code: "DISP", name: "Display (4VAR 48pc)", bpc: 48 }, { code: "BUCK", name: "Bucket (1.5oz)", bpc: 54 },
    { code: "CAMO", name: "Camo Bucket", bpc: 54 }, { code: "L20", name: "Pizza", bpc: 72 },
    { code: "L21", name: "Cheeseburger", bpc: 72 }, { code: "L38", name: "Salt & Vinegar", bpc: 72 }, { code: "L34", name: "Honey BBQ", bpc: 72 }
  ];
  const PROD_FMAP = {}; PROD_FLAVORS.forEach(f => PROD_FMAP[f.code] = f);
  // Daily Fulfillment tracker: Amazon (FBA) SKU -> bags-per-unit map. Editable here as new packs are added;
  // any SKU not in this map (custom / free-text entry) defaults to a user-entered bags-per-unit, or 1.
  const AMZ_SKU_BAGS = { "SS-SP-10-FBA": 10, "SS-SP-11-FBA": 11, "SS-VP-7-FBA": 6 };
  const AMZ_SKU_LABELS = {
    "SS-SP-10-FBA": "10-Flavor Variety 1.5oz (10 bags/unit)",
    "SS-SP-11-FBA": "11-Pack Variety 1.5oz (11 bags/unit)",
    "SS-VP-7-FBA": "6-Flavor Variety 1.5oz (6 bags/unit)"
  };
  let fdDate = null;   // Daily Fulfillment: selected date (defaults to today)
  let fdDraft = null;  // Daily Fulfillment: in-progress draft { date, ecom:[{employee,labels}], amazon:[{sku,units,bagsPerUnit}], notes }
  // Seed packaging profiles (Adriana): per = total lbs per pallet -> auto weight = pallets x per
  const SEED_PACKS = [
    { key: "30x50", label: "30 bags x 50 lb / pallet", per: 1500 },
    { key: "30x25", label: "30 bags x 25 lb / pallet", per: 750 },
    { key: "tote", label: "Tote - 1 bag x 1,200 lb", per: 1200 }
  ];
  const SEED_PACK_MAP = {}; SEED_PACKS.forEach(p => SEED_PACK_MAP[p.key] = p);
  const TABS = ["home","dash","analytics","alerts","adjust","receive","recvlog","putaway","returns","orders","orderdocs","shiplog","rd","qa","move","produce","retailprod","ecomprod","prodlog","fulfilldaily","stockbuild","demand","demandboard","demandsched","demandimport","ecomdemand","forecast","seasoning","seed","skus","mixing","pmac","floor","count","locations","facility","finbags","pmacout","purchasing","supplierpos","people","improve","maintenance","compliance","disposition","reference","labels","log","settings","board"];

  // ---- Role presets: which tabs each role sees (home always first) ----
  const ROLE_TABS = {
    all: TABS.slice(),
    receiving: ["home","alerts","dash","adjust","receive","putaway","returns","qa","count","locations","labels"],
    production: ["home","alerts","dash","adjust","produce","seasoning","move","orders","orderdocs","count","locations"],
    mixing: ["home","alerts","mixing","floor","seasoning","produce","count"],
    pmac: ["home","alerts","pmac","floor","labels"],
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
    crackedpepper: CDN + "CrackedPepper_4_Front_59837e87-ef45-4540-8540-f98da28bdea2.png?width=72",
    // LTO / co-brand flavors (batch-label + finished-bags feature)
    cheeseburger: CDN + "09.09.25_PDP_LTO_Cheeseburger_6Bags.png?width=72",
    honeybbq: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=72",
    arodhoneybbq: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=72",
    honeybbqarod: CDN + "04.01.26_PDP_LTO_ARod_6Bags.png?width=72",
    pizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=72",
    deepdishpizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=72",
    pcapizza: CDN + "02.16.26_SMACKINxPCA_4-6Bags.png?width=72",
    saltvinegar: CDN + "PDPs_GoodGood6Bag.png?width=72",
    goodgoodsaltvinegar: CDN + "PDPs_GoodGood6Bag.png?width=72",
    guacamole: CDN + "PDPs_6Bag_Guac.png?width=72",
    salsa: CDN + "PDPs_6Bag_Salsa.png?width=72",
    taco: CDN + "PDPs_6Bag_Taco.png?width=72",
    sweetthaichili: CDN + "PDPs_6bagSTC.png?width=72",
    loadedpotato: CDN + "PDPs_6bagLP.png?width=72",
    blueberrypie: CDN + "04.30.26_PDP_LTO_BlueberryPie-6Bags.png?width=72",
    spicyqueso: CDN + "PDPs_SpicyQueso_6Bag.png?width=72",
    chilicheesedog: CDN + "04.30.26_PDP_LTO_ChiliCheeseDog-6Bags.png?width=72",
    baconmaccheese: CDN + "04.30.26_PDP_LTO_BaconMac_Cheese-6Bags.png?width=72"
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
    ["Brian Lepro","Independent Contractor","Contractor",""],
    ["Lorelei Davis","Fulfillment Associate","Fulfillment","Troy Dircks"]
  ].map(a => ({ n:a[0], r:a[1], d:a[2], m:a[3] }));
  // Daily Fulfillment tracker: anyone who can work e-com labels on a given day -- the whole Fulfillment /
  // Shipping roster, plus the Operations people who report to Troy on the fulfillment side.
  function fdEmployeeList() {
    return PEOPLE.filter(p => p.d === "Fulfillment" || p.d === "Shipping" || (p.d === "Operations" && p.m === "Troy Dircks"))
      .map(p => p.n).sort();
  }
  // ---- left sidebar: tabs grouped by department (NetSuite-style) ----
  const NAV_GROUPS = [
    { key:"", items:["home","alerts"] },
    { key:"grpReceiving", items:["receive","recvlog","returns","qa"] },
    { key:"grpInventory", items:["dash","analytics","adjust","count","move","locations","facility","finbags","seasoning","seed","skus","labels"] },
    { key:"grpProduction", items:["produce","retailprod","ecomprod","prodlog","fulfilldaily","stockbuild","orders","orderdocs"] },
    { key:"grpDemand", items:["demand","demandboard","demandsched","demandimport","ecomdemand","forecast"] },
    { key:"grpShipping", items:["shiplog"] },
    { key:"grpMixing", items:["mixing","floor"] },
    { key:"grpPmac", items:["pmac","pmacout","floor"] },
    { key:"grpPurchasing", items:["purchasing","supplierpos"] },
    { key:"grpRnd", items:["rd"] },
    { key:"grpHr", items:["people"] },
    { key:"grpImprove", items:["improve"] },
    { key:"grpMaintenance", items:["maintenance"] },
    { key:"grpQuality", items:["compliance","disposition"] },
    { key:"grpDocs", items:["reference"] },
    { key:"grpSystem", items:["board","log","settings"] }
  ];
  // Lucide icon names (clean SVG line icons) rendered via lucide.createIcons()
  const NAV_ICON = {
    home:"home", dash:"layout-dashboard", analytics:"bar-chart-3", alerts:"bell", adjust:"sliders-horizontal",
    receive:"package-plus", recvlog:"clipboard-list", putaway:"package-check", returns:"rotate-ccw",
    orders:"receipt", orderdocs:"folder", shiplog:"truck", rd:"flask-conical", qa:"shield-alert",
    move:"arrow-left-right", produce:"factory", retailprod:"package", ecomprod:"laptop", prodlog:"clipboard-list", fulfilldaily:"clipboard-list", stockbuild:"layers",
    seasoning:"flame", seed:"sprout", skus:"barcode", finbags:"shopping-bag", pmacout:"package-open",
    mixing:"cooking-pot", pmac:"wrench", count:"clipboard-check", locations:"map-pin",
    purchasing:"shopping-cart", supplierpos:"file-text", people:"users", labels:"tag",
    board:"tv", log:"history", settings:"settings", improve:"trending-up", maintenance:"hard-hat", compliance:"shield-check", disposition:"archive", reference:"book-open",
    demand:"calendar-clock", demandboard:"list-checks", demandsched:"gauge", demandimport:"file-up", ecomdemand:"globe", forecast:"scale", facility:"warehouse", floor:"activity" };
  function drawIcons() { try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {} }
  let spoFile = null, spoParsed = null;  // supplier-PO upload state
  let spoSort = { key: "created", dir: -1 };  // Supplier POs table sort (v25)
  let spoView = "list";   // Supplier POs: "list" | "create" (Excel-style PO entry form)
  let spoDetailId = null; // Supplier POs: when set, show full-detail view for that PO (v56)
  let poRows = 4;         // number of line-item rows shown in the Create-PO form
  let poEmailOpen = false; // Supplier PO detail: Email PO compose panel open?
  // ---- Demand section state ----
  let retMode = "major";   // Returns entry mode: "major" (customer) | "ecom" (Amazon/marketplace)
  let dmdPartner = "", dmdFlavor = "", dmdStatus = "Open";  // Demand Board filters
  let dmdParsed = null;   // Import preview: { rows, warnings, recon, files }
  let dmdBusy = false;    // import in progress
  let dmdDept = "mixing"; // Demand section: which department dashboard (mixing | pmac | ful)
  // ---- E-Com Demand state (ShipStation Product Sales -> bags-needed-per-flavor) ----
  let ecParsed = null;   // preview: { totals, unmapped, periodDays, files }
  let ecBusy = false;    // load-into-snapshot in progress
  const DMD_FLAVOR_ORDER = ["OG Original","Cinnamon Churro","Backyard BBQ","Garlic Parmesan","Dill Pickle","Cracked Pepper","Cheddar Jalapeno","Ranch","Maple Brown Sugar","Lemon Pepper","Sour Cream & Onion","Cheeseburger","PCA Pizza","Variety Pack"];
  // On-hand finished 4oz cases for a flavor, summed from the Stock Build count (Target + Master Case = 72-bag cases).
  function demandOnHandCases(flavor) {
    const oh = DB.stockBuild ? DB.stockBuild() : {};
    let n = 0;
    SB_ITEMS.forEach(i => { if ((i.cat === "Target" || i.cat === "Master Case") && i.name === flavor) n += Number((oh[i.key] || {}).on_hand) || 0; });
    return n;
  }
  // Film impressions (bags) on hand for a flavor code, from the F4-<code> item if tracked.
  function demandFilmBags(code) {
    if (!code) return null;
    const it = DB.itemByCode ? DB.itemByCode("F4-" + code) : null;
    if (!it) return null;
    const v = DB.onHand ? DB.onHand(it) : 0;
    return v > 0 ? v : null;
  }
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
  let qcFlavor = "";                          // Retail Production: Quick Case Log selected flavor code (writes to the SAME prodPallets store as Production Log)
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
  let mtView = "active", mtAddOpen = false, mtEditId = null;  // Maintenance view/edit state
  const MNT_TYPES = ["Request", "Project", "Repair", "Preventive"];
  const MNT_AREAS = ["P-Mac", "Mixing", "Facility", "Forklift", "Receiving", "Shipping", "Warehouse", "Office", "Other"];
  const MNT_PRIORITIES = ["Urgent", "High", "Medium", "Low"];
  const MNT_STATUSES = ["Requested", "In Progress", "Waiting", "Done"];
  const MNT_ASSIGNEES = ["Daniel Henshaw", "Brandon Androes", "Brandon Coronado", "Todd Herre", "Outside Vendor", "Other"];
  const BAG_STAGE = "PACKOUT";       // finished bags stage here when they come off P-Mac
  let locSel = null;      // selected slot/zone code in the rack map
  let locAct = "";        // editable rack map: "" | "move" | "setqty" | "assign"
  let recvNewItem = false; // Receive: create a brand-new item on the fly
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
  const CATS = ["all","bag4","bag15","film4","film15","seasoning","seed","bucket","packaging","display","mastercase","supply"];
  const CATLBL = { all:"All", bag4:"Bags 4oz", bag15:"Bags 1.5oz", film4:"Film 4oz", film15:"Film 1.5oz",
    seasoning:"Seasoning", seed:"Seed/Base", bucket:"Buckets", packaging:"Packaging", display:"Displays", mastercase:"Sleeves", supply:"Supplies" };

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
  const PURCH_PIN = "0470"; // Purchasing area (Michelle/Matt/Troy)
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
    if (v === EDIT_PIN || v === PURCH_PIN) { unlocked = true; try { sessionStorage.setItem("smk_unlocked", "1"); } catch (e) {} toast(L("unlocked")); render(); return true; }
    toast(L("pinWrong")); return false;
  }

  // ---------- shared field builders ----------
  function opField(def) {
    return '<label>' + L("operator") + '</label><select id="op">' +
      ["Jesus","Adriana","Marlin","Edgar","Troy"].map(n => '<option' + (n === def ? ' selected' : '') + '>' + n + "</option>").join("") + "</select>";
  }
  // Same as opField but with a caller-chosen id — needed when more than one operator
  // field appears on the same page (e.g. the Now Running board has one per section).
  function opFieldPurch(def) {
    return '<label>' + L("operator") + '</label><select id="op">' +
      ["Michelle","Matt","Troy"].map(n => '<option' + (n === def ? ' selected' : '') + '>' + n + "</option>").join("") + "</select>";
  }
  function opFieldFor(id, def) {
    return '<label>' + L("operator") + '</label><select id="' + id + '">' +
      ["Jesus","Adriana","Marlin","Edgar","Troy"].map(n => '<option' + (n === def ? ' selected' : '') + '>' + n + "</option>").join("") + "</select>";
  }
  function opValFor(id) { const e = $(id); return e ? e.value : "Troy"; }
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
    const flav = items.filter(i => i.category === "bag4" && /^B4-(S|L)\d/.test(i.code))
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
      '<table class="sortable" style="margin-top:10px"><thead><tr><th>' + L("colCategory") + '</th><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th data-nosort>' + L("newCount") + '</th></tr></thead><tbody id="adjBody">' + rows + '</tbody></table>' +
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
    if (spoDetailId) return viewPoDetail(spoDetailId);
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
      const poCell = '<a class="polink" onclick="UI.spoOpen(\'' + s.id + '\')" title="' + L("spoOpenDetails") + '">' + (s.po_num || L("spoView2")) + '</a>';
      return '<tr data-txt="' + txt + '"><td><b>' + (s.vendor || "&mdash;") + '</b>' + (s.uploaded_by ? '<div class="muted sm">' + L("oByPrefix") + " " + s.uploaded_by + '</div>' : "") + '</td>' +
        '<td>' + poCell + '</td><td class="sm">' + (s.po_date || "") + '</td>' +
        '<td class="right">' + money(s.total) + '</td><td class="right muted">' + (s.item_count || 0) + '</td>' +
        '<td>' + dl + '</td><td><button class="ghost sm" title="' + L("poEmail") + '" onclick="UI.poEmailFromList(\'' + s.id + '\')">&#9993;</button> <button class="ghost sm danger" onclick="UI.spoDelete(\'' + s.id + '\')">&#10005;</button></td></tr>';
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
  // Parse a supplier PO's line items defensively (imports & Create-PO use slightly different keys).
  // Shared by the detail table render and the Email PO summary builder.
  function poLinesOf(s) {
    let lines = [];
    try { const p = typeof s.lines === "string" ? JSON.parse(s.lines || "[]") : (s.lines || []); if (Array.isArray(p)) lines = p; } catch (e) {}
    const g = (o, keys) => { for (const k of keys) if (o[k] != null && o[k] !== "") return o[k]; return ""; };
    return lines.map(l => ({
      item: g(l, ["item", "item_no", "itemNo", "part", "part_no", "sku", "code"]),
      desc: g(l, ["desc", "description", "name", "product"]),
      qty: g(l, ["qty", "quantity", "cases"]),
      price: g(l, ["price", "unit_price", "unitPrice", "cost"]),
      tot: g(l, ["total", "line_total", "lineTotal", "amount", "ext"])
    }));
  }
  // Plain-text PO summary used to prefill the Email PO body, the mailto fallback, and Copy PO summary.
  function poSummaryText(s) {
    const lines = poLinesOf(s);
    const p = [];
    p.push((s.vendor || "Vendor") + (s.po_num ? " - PO " + s.po_num : ""));
    if (s.po_date) p.push("Date: " + s.po_date);
    if (s.ship_to) p.push("Ship to: " + s.ship_to);
    p.push(""); p.push("Items:");
    if (lines.length) {
      lines.forEach(l => {
        const bits = []; if (l.item) bits.push(l.item); if (l.desc) bits.push(l.desc);
        let row = "  - " + (bits.join(" ") || "(item)");
        if (l.qty !== "") row += "  x" + l.qty;
        if (l.price !== "") row += "  @ " + money(l.price);
        if (l.tot !== "") row += "  = " + money(l.tot);
        p.push(row);
      });
    } else { p.push("  (no line items on file)"); }
    p.push("");
    if (s.subtotal != null && s.subtotal !== "") p.push("Subtotal: " + money(s.subtotal));
    if (s.shipping != null && s.shipping !== "") p.push("Shipping: " + money(s.shipping));
    if (s.tax != null && s.tax !== "") p.push("Tax: " + money(s.tax));
    if (s.other != null && s.other !== "") p.push("Other: " + money(s.other));
    p.push("Total: " + money(s.total));
    if (s.notes) { p.push(""); p.push("Notes: " + s.notes); }
    if (s.file_url) { p.push(""); p.push("PO document: " + s.file_url); }
    return p.join("\n");
  }
  // Inline compose panel for emailing a Supplier PO to the vendor (mirrors the ordform pattern).
  function poEmailForm(s) {
    if (!poEmailOpen) return "";
    const subject = L("poEmailSubjectTpl") + " " + (s.po_num || "") + " — Smackin' Snacks";
    const body = poSummaryText(s);
    return '<div class="ordform">' +
      '<div><label>' + L("poEmailTo") + '</label><input id="po-em-to" type="email" autocomplete="off" value="' + esc(s.vendor_email || "") + '" placeholder="vendor@company.com"></div>' +
      '<div><label>' + L("poEmailSubjectL") + '</label><input id="po-em-subj" autocomplete="off" value="' + esc(subject) + '"></div>' +
      '<div><label>' + L("poEmailBody") + '</label><textarea id="po-em-body" rows="12">' + esc(body) + '</textarea></div>' +
      '<button class="primary" onclick="UI.poEmailSend()">' + L("poEmailSend") + '</button> ' +
      '<button class="ghost" onclick="UI.poEmailCopy()">' + L("poEmailCopy") + '</button> ' +
      '<button class="ghost" onclick="UI.poEmailCancel()">' + L("spoCancel") + '</button>' +
      '<p class="hint">' + L("poEmailHint") + '</p></div>';
  }
  function viewPoDetail(id) {
    const s = DB.supplierPos().find(x => String(x.id) === String(id));
    if (!s) { spoDetailId = null; return viewSupplierPos(); }
    const lines = poLinesOf(s);
    const lineRows = lines.length ? lines.map(l => {
      return '<tr><td>' + esc(l.item) + '</td><td>' + esc(l.desc) + '</td><td class="right">' + esc(l.qty) + '</td>' +
        '<td class="right">' + (l.price !== "" ? money(l.price) : "") + '</td><td class="right">' + (l.tot !== "" ? money(l.tot) : "") + '</td></tr>';
    }).join("") : '<tr><td colspan="5" class="muted">' + L("poNoLines") + '</td></tr>';
    // info field helper: only render rows that have a value
    const fld = (label, val) => (val != null && val !== "") ? '<div class="podf"><span class="podl">' + label + '</span><span class="podv">' + esc(val) + '</span></div>' : "";
    const info = fld(L("spoVendor"), s.vendor) + fld(L("spoPO"), s.po_num) + fld(L("spoDate"), s.po_date) +
      fld(L("poVendorAddr"), s.vendor_addr) + fld(L("poVendorEmail"), s.vendor_email) + fld(L("poVendorPhone"), s.vendor_phone) +
      fld(L("poShipTo"), s.ship_to) + fld(L("poPreparedBy"), s.prepared_by) + fld(L("spoUploadedBy"), s.uploaded_by) +
      fld(L("when"), s.created_at ? String(s.created_at).slice(0, 10) : "");
    const totalsRows =
      (s.subtotal != null && s.subtotal !== "" ? '<div><span>' + L("poSubtotalL") + '</span><b>' + money(s.subtotal) + '</b></div>' : "") +
      (s.shipping != null && s.shipping !== "" ? '<div><span>' + L("poShippingL") + '</span><b>' + money(s.shipping) + '</b></div>' : "") +
      (s.tax != null && s.tax !== "" ? '<div><span>' + L("poTaxL") + '</span><b>' + money(s.tax) + '</b></div>' : "") +
      (s.other != null && s.other !== "" ? '<div><span>' + L("poOtherL") + '</span><b>' + money(s.other) + '</b></div>' : "") +
      '<div class="grand"><span>' + L("spoTotal") + '</span><b>' + money(s.total) + '</b></div>';
    const fileBlock = s.file_url
      ? '<a class="order" href="' + s.file_url + '" target="_blank" rel="noopener">&#128229; ' + L("spoDownload") + (s.file_name ? ' &middot; ' + esc(s.file_name) : "") + '</a>'
      : '<span class="muted">' + L("poNoFile") + '</span>';
    return '<div class="card"><div class="spohead"><h2 style="margin:0">' + esc(s.vendor || L("supplierpos")) + (s.po_num ? ' &middot; ' + L("spoPO") + ' ' + esc(s.po_num) : "") + '</h2>' +
      '<div><button class="primary sm" onclick="UI.poEmailToggle()">&#9993; ' + L("poEmail") + '</button> ' +
      '<button class="ghost sm" onclick="UI.spoCloseDetail()">&#8592; ' + L("poBackList") + '</button></div></div>' +
      '<div class="poinfo">' + info + '</div>' +
      '<div class="podoc">' + fileBlock + '</div>' +
      poEmailForm(s) + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("spoItems") + ' (' + lines.length + ')</h2>' +
      '<table class="potable"><thead><tr><th>' + L("poItemNo") + '</th><th>' + L("poDesc") + '</th><th class="right">' + L("poQtyL") + '</th><th class="right">' + L("poPriceL") + '</th><th class="right">' + L("poLineTot") + '</th></tr></thead><tbody>' + lineRows + '</tbody></table>' +
      '<div class="pototals" style="margin-top:12px">' + totalsRows + '</div>' +
      (s.notes ? '<h3 class="sub2" style="margin-top:14px">' + L("spoNotes") + '</h3><p>' + esc(s.notes) + '</p>' : "") + '</div>';
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
      '<button class="ghost sm" onclick="UI.poCreateBack()">' + L("poBackList") + '</button></div>' +
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
    const newPanel = recvNewItem
      ? '<div class="locact"><h3 class="sub2">' + L("rniTitle") + '</h3>' +
        '<div class="row"><div><label>' + L("rniCode") + '</label><input id="r-newcode" autocomplete="off" placeholder="BOX-1234"></div>' +
        '<div style="flex:2"><label>' + L("rniName") + '</label><input id="r-newname" autocomplete="off" placeholder="' + L("rniNamePh") + '"></div></div>' +
        '<div class="row"><div><label>' + L("rCategory") + '</label><select id="r-newcat">' + selOpts(DB.recvCategories) + '</select></div>' +
        '<div><label>' + L("rniUnit") + '</label><input id="r-newunit" list="dl-units" autocomplete="off" placeholder="ea / case / lbs"></div></div>' +
        '<p class="hint" style="margin:6px 0 0">' + L("rniHint") + '</p></div>' +
        '<datalist id="dl-units"><option value="ea"><option value="case"><option value="box"><option value="bag"><option value="lbs"><option value="pallet"><option value="roll"></datalist>'
      : "";
    const newToggle = '<div style="margin:8px 0 2px"><button class="ghost sm" onclick="UI.recvToggleNew()">' +
      (recvNewItem ? '✕ ' + L("rniCancelBtn") : '➕ ' + L("rniNewBtn")) + '</button></div>';
    return '<div class="card"><h2>' + L("receive") + '</h2><p class="hint">' + L("receiveHint") + '</p>' +
      (recvNewItem ? "" : itemScan("r-code", "r-qty")) + newToggle + newPanel +
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
    const isEcom = retMode === "ecom";
    const tab = (m, lbl) => '<button class="' + (retMode === m ? "primary" : "ghost") + ' sm" onclick="UI.retMode(\'' + m + '\')">' + lbl + '</button>';
    const today = new Date().toISOString().slice(0, 10);
    // channel-specific fields
    const majorFields =
      '<div class="row"><div><label>' + L("rCustomer") + '</label><input id="ret-cust" autocomplete="off" placeholder="Target, KeHE..."></div>' +
      '<div><label>' + L("rAddUpc") + ' <span class="muted">(opt.)</span></label><input id="ret-addupc" autocomplete="off"></div></div>';
    const ecomFields =
      '<div class="row"><div><label>' + L("rMarketplace") + '</label><select id="ret-mkt">' + selOpts(["Amazon", "TikTok Shop", "USPS", "Other"]) + '</select></div>' +
      '<div><label>' + L("rShipment") + '</label><input id="ret-ship" autocomplete="off" placeholder="Shipment ID"></div></div>' +
      '<div class="row"><div><label>' + L("rShipAddr") + ' <span class="muted">(opt.)</span></label><input id="ret-addr" autocomplete="off"></div>' +
      '<div><label>' + L("rProdCode") + ' <span class="muted">(opt.)</span></label><input id="ret-prod" autocomplete="off"></div>' +
      '<div><label>' + L("rUpc") + ' <span class="muted">(opt.)</span></label><input id="ret-upc" autocomplete="off"></div></div>';
    const form = '<div class="card"><h2>' + L("returns") + '</h2><p class="hint">' + L("returnsHint2") + '</p>' +
      '<div class="row" style="gap:8px;margin-bottom:8px">' + tab("major", L("rMajor")) + tab("ecom", L("rEcom")) + '</div>' +
      (isEcom ? ecomFields : majorFields) +
      itemScan("ret-code", "ret-qty") +
      '<div class="row"><div><label>' + L("qty") + '</label><input id="ret-qty" type="number" min="0" placeholder="' + L("enter") + '"></div>' +
      '<div><label>' + L("rTracking") + ' <span class="muted">(opt.)</span></label><input id="ret-track" autocomplete="off" placeholder="1Z... / tracking #"></div>' +
      '<div><label>' + L("rReturnDate") + '</label><input id="ret-date" type="date" value="' + today + '"></div></div>' +
      '<div class="row"><div><label>' + L("rReason") + '</label><select id="ret-reason">' + selOpts(DB.returnReasons) + '</select></div>' +
      '<div><label>' + L("rDisposition") + '</label><select id="ret-disp">' + selOpts(DB.returnDispositions) + '</select></div></div>' +
      '<div class="row"><div><label><input type="checkbox" id="ret-kit" onchange="UI.retKitToggle()"> ' + L("rIsKit") + '</label>' +
      '<input id="ret-kitsku" autocomplete="off" placeholder="SS-CLSC-4OZ-12PK" style="display:none;margin-top:6px"></div>' +
      '<div><label style="visibility:hidden">.</label><label id="ret-explode-wrap" style="display:none"><input type="checkbox" id="ret-explode" checked> ' + L("rExplode") + '</label></div></div>' +
      '<p class="hint" id="ret-kithint" style="display:none">' + L("rKitHint") + '</p>' +
      opField() + '<button class="primary" onclick="UI.doReturn()">' + L("submitReturn") + '</button></div>';
    // returns log
    const log = DB.returnsLog ? DB.returnsLog() : [];
    const dupKeys = {}; log.forEach(r => { const k = (r.dup_key || ""); if (k) dupKeys[k] = (dupKeys[k] || 0) + 1; });
    const rows = log.slice(0, 100).map(r => {
      const dup = r.dup_key && dupKeys[r.dup_key] > 1;
      const who = r.channel === "ecom" ? (r.marketplace || L("rEcom")) : (r.customer || L("rMajor"));
      const ref = r.tracking || r.shipment_id || "";
      return '<tr' + (dup ? ' style="background:#FDECEA"' : '') + '><td class="sm">' + esc(r.return_date || (r.created_at ? r.created_at.slice(0, 10) : "")) + '</td>' +
        '<td>' + esc(who) + (r.channel === "ecom" ? ' <span class="muted sm">e-com</span>' : '') + '</td>' +
        '<td>' + esc(r.product || r.item_code || "") + (r.is_kit ? ' <span class="tag">' + L("rKitTag") + '</span>' : '') + '</td>' +
        '<td class="right"><b>' + fmt(r.qty) + '</b></td>' +
        '<td class="sm muted">' + esc(ref) + (dup ? ' <span class="pill out">' + L("rDup") + '</span>' : '') + '</td>' +
        '<td class="sm">' + esc(r.disposition || "") + (r.restocked ? ' ✓' : '') + '</td>' +
        '<td><button class="ghost sm danger" onclick="UI.delReturn(\'' + r.id + '\')">&#10005;</button></td></tr>';
    }).join("") || '<tr><td colspan="7" class="muted">' + L("noReturns") + '</td></tr>';
    const logCard = '<div class="card"><h2 class="sub2">' + L("returnsLogTitle") + ' (' + log.length + ')</h2>' +
      '<div class="tblwrap"><table class="sortable"><thead><tr><th>' + L("rReturnDate") + '</th><th>' + L("rWho") + '</th><th>' + L("item") + '</th>' +
      '<th class="right">' + L("qty") + '</th><th>' + L("rRef") + '</th><th>' + L("rDisposition") + '</th><th data-nosort></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    return form + logCard;
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
        '</td><td' + (isExp ? ' class="expd"' : "") + '>' + (exp || "&mdash;") + '</td><td class="right">' + fmt(l.weight) + '</td><td>' + (l.location ? '<span class="tag">' + esc(l.location) + '</span>' : "&mdash;") + '</td><td>' + stat + '</td><td>' + act + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.seasEdit(\'' + l.id + '\')">&#9998;</button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + L("noLots") + '</td></tr>';
    return '<div class="card"><h2>' + L("seasoning") + '</h2><p class="hint">' + L("seasHint") + '</p>' +
      (sediting ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("slProduct") + '</label><select id="sl-prod">' + opts + '</select></div>' +
      '<div><label>' + L("slLot") + '</label><input id="sl-lot" autocomplete="off" placeholder="# 6105" value="' + av(sed.lot) + '"></div>' +
      '<div><label>' + L("slMfr") + '</label><input id="sl-mfr" autocomplete="off" placeholder="Commercial Creations" value="' + av(sed.manufacturer) + '"></div></div>' +
      '<div class="row"><div><label>' + L("slExp") + '</label><input id="sl-exp" type="date" value="' + (sediting && sed.exp ? (sed.exp + "").slice(0, 10) : "") + '"></div>' +
      '<div><label>' + L("slWeight") + '</label><input id="sl-wt" type="number" min="0" step="0.1" placeholder="0" value="' + (sediting && Number(sed.weight) ? Number(sed.weight) : "") + '"></div>' +
      '<div><label>' + L("slLoc") + '</label><input id="sl-loc" list="dl-locs" autocomplete="off" placeholder="A-05-L3" value="' + av(sed.location) + '"></div>' +
      '<div style="align-self:end">' + opField() + '</div></div>' +
      '<button class="primary" onclick="UI.addSeasLot()">' + (sediting ? L("saveChanges") : L("addLot")) + '</button> ' +
      (sediting ? '<button class="ghost" style="margin-top:14px" onclick="UI.seasEditCancel()">' + L("ordCancel") + '</button>' : '<button class="ghost" style="margin-top:14px" onclick="UI.quarExpired()">' + L("quarantineExpired") + '</button>') +
      '<h2 class="sub2" style="margin-top:18px">' + L("seasLotsTitle") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("slProduct") + '</th><th>' + L("slLot") + '</th><th>' + L("slMfr") + '</th><th>' + L("slExp") +
      '</th><th class="right">' + L("slWeight") + '</th><th>' + L("slLoc") + '</th><th>' + L("status") + '</th><th data-nosort></th></tr></thead><tbody>' + body + '</tbody></table></div>';
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
      const pk = SEED_PACK_MAP[l.packaging];
      const packDesc = (Number(l.pallets) ? fmt(l.pallets) + " " + L("sdPalletsShort") : "") + (pk ? (Number(l.pallets) ? " · " : "") + esc(pk.label) : "");
      return '<tr><td><b>' + esc(l.product || l.seed_code || "") + '</b></td><td>' + esc(l.lot || "—") + '</td><td>' + (l.internal_code ? '<span class="tag">' + esc(l.internal_code) + '</span>' : "—") + '</td><td class="muted sm">' + esc(l.supplier || "—") +
        '</td><td>' + (rec || "—") + '</td><td class="right">' + fmt(l.weight) + '</td><td class="muted sm">' + (packDesc || "—") + '</td><td>' + stat + '</td><td>' + act + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.seedEdit(\'' + l.id + '\')">&#9998;</button></td></tr>';
    }).join("") : '<tr><td colspan="9" class="muted">' + L("noSeedLots") + '</td></tr>';
    const today = new Date().toISOString().slice(0, 10);
    return '<div class="card"><h2>' + L("seed") + '</h2><p class="hint">' + L("seedHint") + '</p>' +
      (sdediting ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div class="row"><div><label>' + L("sdType") + '</label><select id="sd-type">' + opts + '</select></div>' +
      '<div><label>' + L("slLot") + '</label><input id="sd-lot" autocomplete="off" placeholder="# 4471" value="' + av2(sedt.lot) + '"></div>' +
      '<div><label>' + L("sdIntCode") + '</label><input id="sd-icode" autocomplete="off" placeholder="Code #J" value="' + av2(sedt.internal_code) + '"></div>' +
      '<div><label>' + L("supplier") + '</label><select id="sd-sup">' + supOpts + '</select></div></div>' +
      '<div class="row"><div><label>' + L("sdPackaging") + '</label><select id="sd-pack" onchange="UI.seedCalcWt()"><option value="">' + L("sdPickPack") + '</option>' +
      SEED_PACKS.map(p => '<option value="' + p.key + '"' + (sdediting && sedt.packaging === p.key ? ' selected' : '') + '>' + esc(p.label) + '</option>').join("") + '</select></div>' +
      '<div><label>' + L("sdPallets") + '</label><input id="sd-pallets" type="number" min="0" step="1" oninput="UI.seedCalcWt()" placeholder="0" value="' + (sdediting && Number(sedt.pallets) ? Number(sedt.pallets) : "") + '"></div>' +
      '<div><label>' + L("slWeight") + '</label><input id="sd-wt" type="number" min="0" step="0.1" placeholder="0" value="' + (sdediting && Number(sedt.weight) ? Number(sedt.weight) : "") + '"></div></div>' +
      '<div class="row"><div><label>' + L("sdReceived") + '</label><input id="sd-rec" type="date" value="' + (sdediting && sedt.received_date ? (sedt.received_date + "").slice(0, 10) : today) + '"></div>' +
      '<div><label>' + L("sdPackDate") + '</label><input id="sd-pdate" type="date" value="' + (sdediting && sedt.packaged_date ? (sedt.packaged_date + "").slice(0, 10) : "") + '"></div>' +
      '<div style="align-self:end">' + opField("Adriana") + '</div></div>' +
      '<button class="primary" onclick="UI.addSeedLot()">' + (sdediting ? L("saveChanges") : L("addLot")) + '</button>' +
      (sdediting ? ' <button class="ghost" style="margin-top:14px" onclick="UI.seedEditCancel()">' + L("ordCancel") + '</button>' : '') +
      '<h2 class="sub2" style="margin-top:18px">' + L("seedLotsTitle") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("sdType") + '</th><th>' + L("slLot") + '</th><th>' + L("sdIntCode") + '</th><th>' + L("supplier") + '</th><th>' + L("sdReceived") +
      '</th><th class="right">' + L("slWeight") + '</th><th>' + L("sdPackaging") + '</th><th>' + L("status") + '</th><th data-nosort></th></tr></thead><tbody>' + body + '</tbody></table></div>';
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
  function viewProdLog() {
    const today = new Date().toISOString().slice(0, 10);
    const date = plDate || today;
    const day = DB.prodDay(date, "retail") || {};
    const pallets = DB.prodPallets(date).filter(p => (p.channel || "retail") === "retail");
    const cs = Number(day.counter_start) || 0, ce = Number(day.counter_end) || 0;
    const boxes = ce > cs ? ce - cs : 0;
    const av = v => (v == null || v === "") ? "" : v;
    // pallet log rows (newest first as stored; number ascending by original order)
    const ordered = pallets.slice().reverse();
    const palRows = ordered.length ? ordered.map((p, idx) => {
      const f = PROD_FMAP[p.flavor_code];
      return '<tr><td>' + (idx + 1) + '</td><td>L' + esc(p.line) + '</td><td><b>' + esc(p.flavor_code) + '</b>' + (f ? ' <span class="muted sm">' + esc(f.name) + '</span>' : '') + '</td>' +
        '<td class="right"><b>' + fmt(p.cases) + '</b></td><td class="sm muted">' + esc(p.log_time || '') + '</td><td class="sm">' + esc(p.notes || '') + '</td>' +
        '<td><button class="ghost sm danger" onclick="UI.plDel(\'' + p.id + '\')">&#10005;</button></td></tr>';
    }).join('') : '<tr><td colspan="7" class="muted">' + L("plNoPallets") + '</td></tr>';
    // flavor summary (auto)
    const sum = {}; let totCases = 0, totBags = 0;
    pallets.forEach(p => { const c = p.flavor_code || '?'; sum[c] = (sum[c] || 0) + (Number(p.cases) || 0); });
    Object.keys(sum).forEach(c => { totCases += sum[c]; totBags += sum[c] * (PROD_FMAP[c] ? PROD_FMAP[c].bpc : 72); });
    const sumRows = Object.keys(sum).sort().map(c => {
      const f = PROD_FMAP[c]; const bags = sum[c] * (f ? f.bpc : 72);
      return '<tr><td>' + esc(c) + '</td><td>' + (f ? esc(f.name) : '') + '</td><td class="right"><b>' + fmt(sum[c]) + '</b></td><td class="right muted">' + fmt(bags) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="muted">&mdash;</td></tr>';
    const variance = boxes - totCases;
    const fopts = PROD_FLAVORS.map(f => '<option value="' + f.code + '">' + f.code + ' — ' + esc(f.name) + '</option>').join('');
    // header card: date / lot / shift lead / counter
    const header = '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">' + L("prodlog") + '</h2>' +
      '<input type="date" value="' + date + '" onchange="UI.plDate(this.value)" style="width:auto"></div>' +
      '<div class="row"><div><label>' + L("plLot") + '</label><input value="' + esc(av(day.lot)) + '" onchange="UI.plDay(\'lot\',this.value)"></div>' +
      '<div><label>' + L("plShiftLead") + '</label><input value="' + esc(day.shift_lead != null && day.shift_lead !== "" ? day.shift_lead : "Jesus Arias") + '" onchange="UI.plDay(\'shift_lead\',this.value)"></div></div>' +
      '<h3 class="sub2" style="margin-top:14px">\u{1F4E6} ' + L("plCounter") + '</h3>' +
      '<div class="row"><div><label>' + L("plStart") + '</label><input type="number" value="' + esc(av(day.counter_start)) + '" onchange="UI.plDay(\'counter_start\',this.value)"></div>' +
      '<div><label>' + L("plEnd") + '</label><input type="number" value="' + esc(av(day.counter_end)) + '" onchange="UI.plDay(\'counter_end\',this.value)"></div>' +
      '<div><label>' + L("plBoxes") + '</label><input value="' + fmt(boxes) + '" disabled></div></div>' +
      '<p class="hint" style="margin:8px 0 0">' + L("plCounterHint") + '</p></div>';
    // add-pallet card
    const addCard = '<div class="card"><h2 class="sub2">' + L("plAddPallet") + '</h2>' +
      '<div class="row"><div><label>' + L("plLine") + '</label><select id="pl-line"><option value="1">1</option><option value="2">2</option></select></div>' +
      '<div style="flex:2"><label>' + L("plFlavor") + '</label><select id="pl-flavor">' + fopts + '</select></div>' +
      '<div><label>' + L("plCases") + '</label><input id="pl-cases" type="number" min="0" inputmode="numeric"></div>' +
      '<div><label>' + L("plNotes") + '</label><input id="pl-notes" value="MASTER"></div></div>' +
      '<button class="primary" onclick="UI.plAdd()">' + L("plAdd") + '</button></div>';
    // pallet log + summary
    const logCard = '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + L("plLog") + ' (' + pallets.length + ')</h2>' +
      '<span class="muted sm">' + L("plPalletsUsed") + ': <input type="number" value="' + esc(av(day.pallets_used)) + '" onchange="UI.plDay(\'pallets_used\',this.value)" style="width:70px;display:inline-block;padding:5px"></span></div>' +
      '<table><thead><tr><th>#</th><th>' + L("plLine") + '</th><th>' + L("plFlavor") + '</th><th class="right">' + L("plCases") + '</th><th>' + L("when") + '</th><th>' + L("plNotes") + '</th><th></th></tr></thead><tbody>' + palRows + '</tbody></table></div>';
    const varClass = variance === 0 ? "ok" : "low";
    const sumCard = '<div class="card"><h2 class="sub2">' + L("plSummary") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("plCode") + '</th><th>' + L("hFlavor") + '</th><th class="right">' + L("plCases") + '</th><th class="right">' + L("bags") + '</th></tr></thead><tbody>' + sumRows +
      '<tr><td colspan="2"><b>' + L("total") + '</b></td><td class="right"><b>' + fmt(totCases) + '</b></td><td class="right"><b>' + fmt(totBags) + '</b></td></tr></tbody></table>' +
      '<div class="kpis" style="margin-top:12px"><div class="kpi"><div class="n">' + fmt(boxes) + '</div><div class="l">' + L("plBoxes") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(totCases) + '</div><div class="l">' + L("plCasesLogged") + '</div></div>' +
      '<div class="kpi ' + (variance !== 0 ? "alert" : "") + '"><div class="n">' + fmt(variance) + '</div><div class="l">' + L("plVariance") + '</div></div></div></div>';
    return header + addCard + logCard + sumCard;
  }
  // ---- Daily Fulfillment tracker (Jesus logs E-Com labels/person + Amazon FBA units->bags + notes) ----
  // Manual backup / double-check while automation is built out. One record per day, upsert on fdate.
  function fdEnsureDraft() {
    const today = new Date().toISOString().slice(0, 10);
    const date = fdDate || today;
    if (fdDraft && fdDraft.date === date) return fdDraft;
    const existing = (DB.fulfillmentDaily ? DB.fulfillmentDaily() : []).find(r => r.fdate === date);
    if (existing) {
      fdDraft = {
        date: date, id: existing.id,
        ecom: (existing.ecom_labels && existing.ecom_labels.length) ? existing.ecom_labels.map(r => ({ employee: r.employee || "", labels: r.labels != null ? r.labels : "" })) : [{ employee: "", labels: "" }],
        amazon: (existing.amazon && existing.amazon.length) ? existing.amazon.map(r => ({
          sku: r.sku || "", units: r.units != null ? r.units : "",
          bagsPerUnit: (Number(r.units) ? Math.round((Number(r.bags) / Number(r.units)) * 100) / 100 : (AMZ_SKU_BAGS[r.sku] != null ? AMZ_SKU_BAGS[r.sku] : 1)),
          custom: AMZ_SKU_BAGS[r.sku] === undefined
        })) : [{ sku: "", units: "", bagsPerUnit: "", custom: false }],
        notes: existing.notes || ""
      };
    } else {
      fdDraft = { date: date, id: null, ecom: [{ employee: "", labels: "" }], amazon: [{ sku: "", units: "", bagsPerUnit: "", custom: false }], notes: "" };
    }
    return fdDraft;
  }
  function viewFulfillDaily() {
    const today = new Date().toISOString().slice(0, 10);
    const date = fdDate || today;
    const d = fdEnsureDraft();
    const emps = fdEmployeeList();
    let ecomTotal = 0;
    const ecomRows = d.ecom.map((r, i) => {
      ecomTotal += Number(r.labels) || 0;
      return '<tr><td><select onchange="UI.fdEcomSet(' + i + ',\'employee\',this.value)">' +
        '<option value="">' + L("fdPickEmployee") + '</option>' +
        emps.map(n => '<option value="' + esc(n) + '"' + (n === r.employee ? ' selected' : '') + '>' + esc(n) + '</option>').join("") +
        '</select></td>' +
        '<td><input type="number" min="0" step="1" inputmode="numeric" value="' + esc(r.labels) + '" onchange="UI.fdEcomSet(' + i + ',\'labels\',this.value)" style="width:110px"></td>' +
        '<td><button class="ghost sm danger" onclick="UI.fdEcomRemove(' + i + ')">&#10005;</button></td></tr>';
    }).join("");
    const knownSkuOpts = Object.keys(AMZ_SKU_BAGS).map(k => '<option value="' + k + '">' + k + ' - ' + esc(AMZ_SKU_LABELS[k] || '') + '</option>').join("");
    let amzTotalUnits = 0, amzTotalBags = 0;
    const amzRows = d.amazon.map((r, i) => {
      const isKnown = !r.custom && AMZ_SKU_BAGS[r.sku] !== undefined;
      const bpu = (r.bagsPerUnit !== "" && r.bagsPerUnit != null) ? Number(r.bagsPerUnit) : (isKnown ? AMZ_SKU_BAGS[r.sku] : 1);
      const units = Number(r.units) || 0;
      const bags = units * bpu;
      amzTotalUnits += units; amzTotalBags += bags;
      const selVal = r.custom ? "__custom__" : (r.sku || "");
      return '<tr><td><select onchange="UI.fdAmzSku(' + i + ',this.value)">' +
        '<option value="">' + L("fdPickSku") + '</option>' + knownSkuOpts +
        '<option value="__custom__"' + (selVal === "__custom__" ? ' selected' : '') + '>' + L("fdCustomSku") + '</option>' +
        '</select>' +
        (r.custom ? '<input value="' + esc(r.sku) + '" placeholder="' + L("fdCustomSkuPh") + '" onchange="UI.fdAmzSet(' + i + ',\'sku\',this.value)" style="margin-top:4px;width:160px;display:block">' : '') +
        '</td>' +
        '<td><input type="number" min="0" step="1" inputmode="numeric" value="' + esc(r.units) + '" onchange="UI.fdAmzSet(' + i + ',\'units\',this.value)" style="width:100px"></td>' +
        '<td><input type="number" min="0" step="0.1" value="' + (r.bagsPerUnit !== "" && r.bagsPerUnit != null ? esc(r.bagsPerUnit) : bpu) + '" onchange="UI.fdAmzSet(' + i + ',\'bagsPerUnit\',this.value)" style="width:90px" title="' + L("fdBagsPerUnit") + '"></td>' +
        '<td class="right"><b>' + fmt(bags) + '</b></td>' +
        '<td><button class="ghost sm danger" onclick="UI.fdAmzRemove(' + i + ')">&#10005;</button></td></tr>';
    }).join("");
    const header = '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">' + L("fulfilldaily") + '</h2>' +
      '<input type="date" value="' + date + '" onchange="UI.fdSetDate(this.value)" style="width:auto"></div>' +
      '<p class="hint">' + L("fdHint") + '</p></div>';
    const ecomCard = '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + L("fdEcomTitle") + '</h2>' +
      '<span class="muted sm">' + L("fdEcomLabelsTotal") + ': <b>' + fmt(ecomTotal) + '</b></span></div>' +
      '<p class="hint">' + L("fdEcomHint") + '</p>' +
      '<table><thead><tr><th>' + L("fdEmployee") + '</th><th>' + L("fdLabelsDone") + '</th><th></th></tr></thead><tbody>' + ecomRows + '</tbody></table>' +
      '<button class="ghost" style="margin-top:8px" onclick="UI.fdEcomAddRow()">' + L("fdAddPerson") + '</button></div>';
    const amzCard = '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + L("fdAmzTitle") + '</h2>' +
      '<span class="muted sm">' + fmt(amzTotalUnits) + ' &middot; <b>' + fmt(amzTotalBags) + '</b> ' + L("fdBags").toLowerCase() + '</span></div>' +
      '<p class="hint">' + L("fdAmzHint") + '</p>' +
      '<table><thead><tr><th>' + L("fdSku") + '</th><th>' + L("fdUnitsMade") + '</th><th>' + L("fdBagsPerUnit") + '</th><th class="right">' + L("fdBags") + '</th><th></th></tr></thead><tbody>' + amzRows + '</tbody></table>' +
      '<button class="ghost" style="margin-top:8px" onclick="UI.fdAmzAddRow()">' + L("fdAddSku") + '</button></div>';
    const notesCard = '<div class="card"><h2 class="sub2">' + L("fdNotesTitle") + '</h2><p class="hint">' + L("fdNotesHint") + '</p>' +
      '<textarea id="fd-notes" rows="3" placeholder="' + L("fdNotesPh") + '" onchange="UI.fdNotesSet(this.value)">' + esc(d.notes) + '</textarea></div>';
    const summaryCard = '<div class="card"><h2 class="sub2">' + L("fdSummary") + '</h2>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(ecomTotal) + '</div><div class="l">' + L("fdEcomLabelsTotal") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(amzTotalUnits) + '</div><div class="l">' + L("fdAmzUnitsTotal") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(amzTotalBags) + '</div><div class="l">' + L("fdAmzBagsTotal") + '</div></div></div>' +
      '<button class="primary" style="margin-top:12px" onclick="UI.fdSave()">' + L("fdSave") + '</button></div>';
    const hist = (DB.fulfillmentDaily ? DB.fulfillmentDaily() : []).slice().sort((a, b) => String(b.fdate).localeCompare(String(a.fdate))).slice(0, 10);
    const histRows = hist.length ? hist.map(r => '<tr><td>' + esc(r.fdate) + '</td><td class="right">' + fmt(r.ecom_total) + '</td><td class="right">' + fmt(r.amazon_bags) + '</td><td class="sm">' + esc(r.notes || '') + '</td><td class="sm muted">' + esc(r.entered_by || '') + '</td>' +
      '<td><button class="ghost sm danger" onclick="UI.fdDeleteDay(\'' + r.id + '\')">&#10005;</button></td></tr>').join('') : '<tr><td colspan="6" class="muted">' + L("fdNoHistory") + '</td></tr>';
    const histCard = '<div class="card"><h2 class="sub2">' + L("fdHistory") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("fdHistDate") + '</th><th class="right">' + L("fdHistEcom") + '</th><th class="right">' + L("fdHistAmzBags") + '</th><th>' + L("fdHistNotes") + '</th><th>' + L("fdHistBy") + '</th><th></th></tr></thead><tbody>' + histRows + '</tbody></table></div>';
    return header + ecomCard + amzCard + notesCard + summaryCard + histCard;
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
    // ---- Quick Case Log (retail only): fast +1 / +N case entry as operators finish master cases. ----
    // Writes to the SAME Daily Production store (production_pallets / DB.addProdPallet) used by the
    // Production Log (prodlog) screen, so counts here show up in that day's pallet log + flavor summary.
    let quickCard = "";
    if (!isEcom) {
      const todayD = new Date().toISOString().slice(0, 10);
      const qcPallets = (DB.prodPallets ? DB.prodPallets(todayD) : []).filter(p => (p.channel || "retail") === "retail");
      const qcTotal = qcPallets.reduce((s, p) => s + (Number(p.cases) || 0), 0);
      const qcSelF = PROD_FMAP[qcFlavor] || null;
      const qcFlavorTotal = qcSelF ? qcPallets.filter(p => p.flavor_code === qcFlavor).reduce((s, p) => s + (Number(p.cases) || 0), 0) : 0;
      const qcOpts = PROD_FLAVORS.map(f => '<option value="' + f.code + '"' + (f.code === qcFlavor ? ' selected' : '') + '>' + esc(f.name) + '</option>').join("");
      const qcRecent = qcPallets.slice(0, 8).map(p => { const f = PROD_FMAP[p.flavor_code]; return '<span class="tag">' + esc(f ? f.name : p.flavor_code) + ' +' + fmt(p.cases) + '</span>'; }).join(" ");
      quickCard = '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">\u{1F4E6} ' + L("qcTitle") + '</h2>' +
        '<span class="muted sm">' + L("qcToday") + ': <b>' + fmt(qcTotal) + '</b></span></div>' +
        '<p class="hint">' + L("qcHint") + '</p>' +
        '<div class="row"><div style="flex:2"><label>' + L("qcFlavor") + '</label><select id="qc-flavor" onchange="UI.qcPick(this.value)"><option value="">' + L("qcFlavor") + '&hellip;</option>' + qcOpts + '</select></div>' +
        '<div><label>' + L("qcQty") + '</label><input id="qc-qty" type="number" min="1" step="1" value="1" inputmode="numeric"></div></div>' +
        (qcSelF ? '<p class="muted sm" style="margin:2px 0 8px"><b>' + esc(qcSelF.name) + '</b> ' + L("qcToday").toLowerCase() + ': <b>' + fmt(qcFlavorTotal) + '</b></p>' : '') +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">' +
        '<button class="primary" style="flex:1;min-width:150px;font-size:22px;padding:20px 10px;margin-top:0" onclick="UI.qcAdd(1)">+1 ' + L("qcCase") + '</button>' +
        '<button class="ghost" style="flex:1;min-width:120px;font-size:18px;padding:19px 10px" onclick="UI.qcAdd()">+N ' + L("qcCase") + '</button>' +
        '<button type="button" class="ghost" style="flex:1;min-width:120px;font-size:18px;padding:19px 10px" onclick="UI.qcScan()">\u{1F4F7} ' + L("qcScan") + '</button>' +
        '</div>' +
        '<input id="qc-scan-in" type="hidden" oninput="UI.qcScanResolve(this.value)">' +
        (qcRecent ? '<div style="margin-top:12px">' + qcRecent + '</div>' : '') +
        '</div>';
    }
    return quickCard + '<div class="card"><div class="suprow"><h2 style="margin:0">' + L(titleKey) + '</h2>' +
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
      e.qty += q; e.items.push({ id: it.id || r.item_id, name: it.name, code: it.code, qty: q, unit: it.unit, lot: r.lot || null });
    });
    return map;
  }
  function locContentsCard(code, occ) {
    const e = occ[code];
    const items = (e && e.items) || [];
    const rows = items.length
      ? items.map(x => '<tr><td>' + esc(x.name) + '</td><td class="right"><b>' + fmt(x.qty) + '</b> ' + esc(x.unit) + '</td><td class="muted sm">' + esc(x.code) + '</td></tr>').join("")
      : '<tr><td colspan="3" class="muted">' + L("locNothing") + '</td></tr>';
    const itemOpts = arr => arr.map(x => '<option value="' + esc(x.id) + '">' + esc(x.name) + ' (' + fmt(x.qty) + ' ' + esc(x.unit) + ')</option>').join("");
    const allOpts = DB.items().slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(i => '<option value="' + esc(i.id) + '">' + esc(i.name) + ' [' + esc(i.code) + ']</option>').join("");
    let panel;
    if (locAct === "move") {
      panel = '<div class="locact"><h3 class="sub2">' + L("lmMoveTitle") + '</h3>' +
        '<div class="row"><div><label>' + L("item") + '</label><select id="lm-item">' + itemOpts(items) + '</select></div>' +
        '<div><label>' + L("lmDest") + '</label><input id="lm-dest" list="dl-locs" autocomplete="off" placeholder="A1-03-L2"></div>' +
        '<div><label>' + L("qty") + '</label><input id="lm-qty" type="number" min="0" placeholder="' + L("enter") + '"></div></div>' +
        '<button class="primary" onclick="UI.locMoveGo(\'' + esc(code) + '\')">' + L("lmMoveBtn") + '</button> ' +
        '<button class="ghost" style="margin-top:14px" onclick="UI.locActCancel()">' + L("ordCancel") + '</button></div>';
    } else if (locAct === "setqty") {
      panel = '<div class="locact"><h3 class="sub2">' + L("lmSetTitle") + '</h3>' +
        '<div class="row"><div><label>' + L("item") + '</label><select id="lq-item">' + itemOpts(items) + '</select></div>' +
        '<div><label>' + L("newqty") + '</label><input id="lq-qty" type="number" min="0" placeholder="' + L("newqty") + '"></div></div>' +
        '<button class="primary" onclick="UI.locSetGo(\'' + esc(code) + '\')">' + L("saveChanges") + '</button> ' +
        '<button class="ghost" style="margin-top:14px" onclick="UI.locActCancel()">' + L("ordCancel") + '</button></div>';
    } else if (locAct === "assign") {
      panel = '<div class="locact"><h3 class="sub2">' + L("lmAssignTitle") + '</h3>' +
        '<div class="row"><div><label>' + L("item") + '</label><select id="la-item">' + allOpts + '</select></div>' +
        '<div><label>' + L("qty") + '</label><input id="la-qty" type="number" min="0" placeholder="' + L("enter") + '"></div></div>' +
        '<button class="primary" onclick="UI.locAssignGo(\'' + esc(code) + '\')">' + L("lmAssignBtn") + '</button> ' +
        '<button class="ghost" style="margin-top:14px" onclick="UI.locActCancel()">' + L("ordCancel") + '</button></div>';
    } else {
      const buttons = !items.length
        ? '<button class="ghost sm" onclick="UI.locActStart(\'assign\')">&#10133; ' + L("lmAssign") + '</button>'
        : '<button class="ghost sm" onclick="UI.locActStart(\'move\')">&#8594; ' + L("lmMove") + '</button>' +
          '<button class="ghost sm" onclick="UI.locActStart(\'setqty\')">&#9998; ' + L("lmSet") + '</button>' +
          '<button class="ghost sm" onclick="UI.locActStart(\'assign\')">&#10133; ' + L("lmAddItem") + '</button>' +
          '<button class="ghost sm danger" onclick="UI.locEmpty(\'' + esc(code) + '\')">&#10005; ' + L("lmEmpty") + '</button>';
      panel = '<div class="poactions" style="margin-top:10px">' + buttons + '</div>';
    }
    const is3dRack = /^[A-D]-\d{2}-L[1-4]$/.test(code);
    const view3dLink = is3dRack
      ? '<a class="ghost sm" href="facility.html?v=2&loc=' + encodeURIComponent(code) + '" target="_blank" rel="noopener">&#127760; ' + L("locView3d") + '</a> '
      : "";
    return '<div class="card locsel"><div class="suprow"><h2 class="loc" style="margin:0">' + L("locSlot") + ' ' + esc(code) + '</h2>' +
      '<div>' + view3dLink + '<button class="ghost sm" onclick="UI.locPick(\'\')">&#10005;</button></div></div>' +
      '<table><tbody>' + rows + '</tbody></table>' + panel + '</div>';
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

  function viewReorderSetup(toggle) {
    const sups = DB.suppliers();
    const supOpts = cur => '<option value="">' + L("rsNoSup") + '</option>' + sups.map(s => '<option value="' + s.id + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(s.name) + '</option>').join("");
    let its = DB.items().filter(i => purchSetupCat === "all" || i.category === purchSetupCat);
    its = its.slice().sort((a, b) => {
      const an = (!a.reorder || !a.supplier) ? 0 : 1, bn = (!b.reorder || !b.supplier) ? 0 : 1;
      if (an !== bn) return an - bn;
      return String(a.name).localeCompare(String(b.name));
    });
    const needCount = DB.items().filter(i => !i.reorder || !i.supplier).length;
    const cbar = CATS.map(c => '<button class="' + (c === purchSetupCat ? "active" : "") + '" onclick="UI.purchSetupCat(\'' + c + '\')">' + (CATLBL[c] || c) + '</button>').join("");
    const rows = its.map(i => {
      const oh = DB.onHand(i.id);
      const need = (!i.reorder || !i.supplier);
      const txt = ((i.name || "") + " " + (i.code || "")).toLowerCase().replace(/"/g, "");
      const chip = need ? '<span class="pill low">' + L("rsNeeds") + '</span>' : '<span class="pill ok">' + L("rsReady") + '</span>';
      return '<tr data-txt="' + txt + '"><td><b>' + esc(i.name) + '</b><div class="muted sm">' + esc(i.code || "") + '</div></td>' +
        '<td class="right">' + fmt(oh) + ' ' + esc(i.unit || "") + '</td>' +
        '<td><input type="number" min="0" class="adjq" style="width:88px" value="' + (i.reorder || "") + '" onchange="UI.itemReorder(\'' + i.id + '\',this.value)"></td>' +
        '<td><select onchange="UI.itemSupplier(\'' + i.id + '\',this.value)">' + supOpts(i.supplier) + '</select></td>' +
        '<td>' + chip + '</td></tr>';
    }).join("");
    return '<div class="card"><div class="suprow"><h2 style="flex:1">' + L("purchasing") + '</h2>' +
      '<button class="primary sm" onclick="UI.poNew(\'\')">+ ' + L("newPO") + '</button></div>' +
      toggle + '<p class="hint" style="margin-top:10px">' + L("rsHint") + '</p></div>' +
      '<div class="card"><h2 class="sub2">' + L("purchSetup") + ' &middot; ' + needCount + ' ' + L("rsNeedShort") + '</h2>' +
      '<div class="catbar">' + cbar + '</div>' +
      '<input id="rsSearch" autocomplete="off" oninput="UI.rsSearch(this.value)" placeholder="' + L("rsSearchP") + '" style="margin-bottom:10px">' +
      '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th>' + L("rsReorderPt") + '</th><th>' + L("alSupplier") + '</th><th>' + L("status") + '</th></tr></thead><tbody id="rsBody">' + rows + '</tbody></table></div>';
  }
  // ===== Analytics: Inventory Health (Stock Build coverage vs goal + low/out) =====
  function viewAnalytics() {
    var oh = DB.stockBuild ? DB.stockBuild() : {};
    var on = function(i){ return Number((oh[i.key] || {}).on_hand) || 0; };
    var totGoal = 0, totOn = 0;
    SB_ITEMS.forEach(function(i){ totGoal += i.goal; totOn += on(i); });
    var pct = totGoal ? Math.round(totOn / totGoal * 100) : 0;
    var items = DB.items();
    var low = items.filter(function(i){ return statusOf(i) === "low"; }).length;
    var out = items.filter(function(i){ return statusOf(i) === "out"; }).length;
    var body = "";
    SB_CATS.forEach(function(cat){
      var list = SB_ITEMS.filter(function(i){ return i.cat === cat; });
      if (!list.length) return;
      body += '<h3 class="sub2" style="margin-top:16px">' + esc(cat) + '</h3>';
      body += list.map(function(i){
        var o = on(i), g = i.goal, p = g ? Math.min(100, Math.round(o / g * 100)) : 0;
        var col = o >= g ? "#2E9E5B" : (o >= g * 0.5 ? "#F2A93B" : "#E0533B");
        return '<div style="display:flex;align-items:center;gap:10px;margin:3px 0">' +
          '<div style="width:200px;flex:none;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(i.name) + '</div>' +
          '<div style="flex:1;background:#EEF2F7;border-radius:5px;height:18px"><div style="width:' + Math.max(2, p) + '%;height:100%;border-radius:5px;background:' + col + '"></div></div>' +
          '<div style="width:130px;flex:none;font-size:12px;font-weight:700;text-align:right">' + fmt(o) + ' / ' + fmt(g) + ' ' + esc(i.unit || "") + '</div></div>';
      }).join("");
    });
    return '<div class="card"><h2>&#128202; Inventory Health</h2>' +
      '<p class="hint">Live stock-build coverage against goals, plus reorder health. Green = at/above goal, amber = 50-99%, red = under 50%.</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + pct + '%</div><div class="l">Stock build to goal</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(low) + '</div><div class="l">Items low</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(out) + '</div><div class="l">Items out</div></div></div>' +
      body + '</div>';
  }

  // ===== Disposition / Held Stock (older / short-dated / off-quality inventory awaiting disposition) =====
  var DISPOSITION_ITEMS = [
    {flavor:"Lemon Pepper", kind:"Finished product - 2026 batch", qty:"20,700", unit:"units", date:"Aug 2026", reason:"Off-flavor", status:"Awaiting disposition", note:"Excluded from usage sheet"},
    {flavor:"Lemon Pepper", kind:"Finished product - 2026 batch", qty:"5,000", unit:"units", date:"Sep 2026", reason:"Off-flavor", status:"Awaiting disposition", note:"Excluded from usage sheet"},
    {flavor:"Lemon Pepper", kind:"Finished product - 2026 batch", qty:"5,200", unit:"units", date:"Nov 2026", reason:"Off-flavor", status:"Awaiting disposition", note:"Excluded from usage sheet"},
    {flavor:"Lemon Pepper", kind:"Seasoning - lot #E2725A", qty:"800", unit:"lbs", date:"Exp 06/20/26", reason:"Expired", status:"Awaiting instructions", note:""},
    {flavor:"Lemon Pepper", kind:"Seasoning - lot #E2725B", qty:"2,700", unit:"lbs", date:"Exp 06/20/26", reason:"Expired", status:"Awaiting instructions", note:""}
  ];
  function viewDisposition() {
    var reasonPill = function(r){ return '<span class="pill ' + (r === "Expired" ? "out" : "low") + '">' + esc(r) + '</span>'; };
    var rows = DISPOSITION_ITEMS.map(function(d){ return '<tr>' +
      '<td><b>' + esc(d.flavor) + '</b><div class="muted sm">' + esc(d.kind) + '</div></td>' +
      '<td class="right"><b>' + esc(d.qty) + '</b> ' + esc(d.unit) + '</td>' +
      '<td class="sm">' + esc(d.date) + '</td>' +
      '<td>' + reasonPill(d.reason) + '</td>' +
      '<td class="sm">' + esc(d.status) + (d.note ? '<div class="muted sm">' + esc(d.note) + '</div>' : '') + '</td></tr>'; }).join("");
    var units = 20700 + 5000 + 5200, lbs = 800 + 2700;
    return '<div class="card"><h2>&#128230; Disposition / Held Stock</h2>' +
      '<p class="hint">Older, short-dated, or off-quality inventory pulled from normal stock and held for disposition (sell-off, rework, or scrap). Snapshot from Adriana’s 7/21 inventory update - live editable tracking coming next.</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(units) + '</div><div class="l">Off-quality units (LP)</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(lbs) + '</div><div class="l">Expired seasoning (lbs)</div></div>' +
      '<div class="kpi"><div class="n">' + DISPOSITION_ITEMS.length + '</div><div class="l">Held line items</div></div></div>' +
      '<table class="sortable" style="margin-top:12px"><thead><tr><th>Item</th><th class="right">Qty</th><th>Date / Exp</th><th>Reason</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="hint" style="margin-top:10px">&#9888;&#65039; Confirm with Adriana whether the 30,900 Lemon Pepper (Aug/Sep/Nov 2026) is finished bags or seasoning before we finalize the sell-off.</p></div>';
  }

  function viewPurchasing() {
    if (purchMode === "new") return viewPONew();
    const toggle = '<div class="ordtabs" style="margin:0">' +
      '<button class="' + (purchView === "buy" ? "active" : "") + '" onclick="UI.purchView(\'buy\')">' + L("purchBuyList") + '</button>' +
      '<button class="' + (purchView === "setup" ? "active" : "") + '" onclick="UI.purchView(\'setup\')">' + L("purchSetup") + '</button></div>';
    if (purchView === "setup") return viewReorderSetup(toggle);
    let html = '<div class="card"><div class="suprow"><h2 style="flex:1">' + L("purchasing") + '</h2>' +
      '<button class="primary sm" onclick="UI.poNew(\'\')">+ ' + L("newPO") + '</button></div>' +
      toggle + '<p class="hint" style="margin-top:10px">' + L("purchHint") + '</p></div>';

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
        '<td><input id="poq-' + i.id + '" type="number" min="0" value="" placeholder="' + (sugg || "") + '"></td>' +
        '<td><input id="poc-' + i.id + '" type="number" min="0" step="0.01" placeholder="0.00"></td></tr>';
    }).join("");
    return '<div class="card"><div class="suprow"><h2>' + L("newPO") + '</h2>' +
      '<button class="ghost sm" onclick="UI.poBack()">' + L("backList") + '</button></div>' +
      '<div class="row"><div><label>' + L("chooseSupplier") + '</label><select id="po-sup" onchange="UI.poSupChange()">' + supOpts + '</select></div>' +
      '<div><label>PO date (issued)</label><input type="date" value="' + new Date().toISOString().slice(0,10) + '" disabled></div>' +
      '<div><label>' + L("poExpected") + ' (optional - add when supplier confirms lead time)</label><input id="po-exp" type="date"></div></div>' +
      '<p class="hint">' + L("addLines") + '</p>' +
      (supItems.length
        ? '<table><thead><tr><th>' + L("item") + '</th><th class="right">' + L("onhand") + '</th><th>' + L("qty") + '</th><th>' + L("poCost") + ' $</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="muted">&mdash;</p>') +
      opFieldPurch() + '<button class="primary" onclick="UI.poSave()">' + L("savePO") + '</button></div>';
  }
  function viewLabels() {
    return '<div class="card"><h2>' + L("labels") + '</h2><p class="hint">' + L("labelsHint") + '</p>' +
      '<button class="ghost" onclick="UI.labels(\'loc\')">' + L("printLoc") + '</button>' +
      '<button class="ghost" onclick="UI.labels(\'item\')">' + L("printItem") + '</button>' +
      '<button class="ghost" onclick="UI.labels(\'lpn\')">' + L("newLpn") + '</button>' +
      '<button class="primary" onclick="UI.printAvery5160()">&#127991; ' + L("averyBtn") + '</button>' +
      '<button class="ghost" onclick="UI.printIdent4x6()">&#128230; ' + L("ident4x6Btn") + '</button>' +
      '<button class="ghost" onclick="UI.labels(\'batch\')">&#128221; ' + L("batchLabelBtn") + '</button>' +
      '<button class="ghost" onclick="UI.printRecvBook()">' + L("printRecvBook") + '</button>' +
      '<p class="hint" style="margin-top:8px">' + L("averyHint") + '</p>' +
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
  // ---- Reference / SOP library ----
  const REF_CATS = ["SOP", "Customer Guide", "HR & Team", "Food Safety", "Production", "Inventory", "Other"];
  let refFiles = null;      // pending uploads (FileList)
  function viewReference() {
    const docs = DB.referenceDocs ? DB.referenceDocs() : [];
    const form = '<div class="ordform">' +
      '<div class="spodrop"><input type="file" id="ref-input" multiple style="display:none" onchange="UI.refPick(this)">' +
      '<label for="ref-input" class="spodroplabel">&#128193; ' + L("refDrop") + '</label></div>' +
      (refFiles && refFiles.length ? '<p class="hint">&#128206; ' + refFiles.length + ' ' + L("refSelected") + '</p>' : '') +
      '<div class="row"><div><label>' + L("refCategory") + '</label><select id="ref-cat">' + REF_CATS.map(c => "<option>" + c + "</option>").join("") + '</select></div>' +
      '<div><label>' + L("spoUploadedBy") + '</label><input id="op" value="Troy"></div></div>' +
      '<div><label>' + L("refNotes") + '</label><input id="ref-notes" autocomplete="off"></div>' +
      '<button class="primary" onclick="UI.refSave()">' + L("refSaveBtn") + '</button>' +
      (refFiles && refFiles.length ? ' <button class="ghost" style="margin-top:14px" onclick="UI.refClear()">' + L("spoCancel") + '</button>' : '') + '</div>';
    let body;
    if (!docs.length) { body = '<p class="muted">' + L("refNone") + '</p>'; }
    else {
      const byCat = {}; docs.forEach(d => { const c = d.category || "Other"; (byCat[c] = byCat[c] || []).push(d); });
      const order = REF_CATS.filter(c => byCat[c]).concat(Object.keys(byCat).filter(c => REF_CATS.indexOf(c) < 0));
      body = order.map(c => {
        const chips = byCat[c].map(d => {
          const link = d.file_url ? '<a href="' + d.file_url + '" target="_blank" rel="noopener">' + esc(d.title || d.file_name) + '</a>' : esc(d.title || d.file_name);
          return '<span class="odchip">' + link + (d.notes ? '<span class="odfn">' + esc(d.notes) + '</span>' : '') + '<button class="odx" title="x" onclick="UI.refDelete(\'' + d.id + '\')">&#10005;</button></span>';
        }).join("");
        return '<div class="odcust" data-txt="' + esc((c + " " + byCat[c].map(d => d.title + " " + (d.notes || "")).join(" ")).toLowerCase()) + '"><div class="odcusthead">' + esc(c) + ' <span class="muted">(' + byCat[c].length + ')</span></div><div class="odchips">' + chips + '</div></div>';
      }).join("");
    }
    return '<div class="card"><h2>' + L("reference") + '</h2><p class="hint">' + L("refHint") + '</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("refLibrary") + ' (' + docs.length + ')</h2>' +
      '<input id="refSearch" autocomplete="off" oninput="UI.refSearch(this.value)" placeholder="' + L("rsSearchP") + '" style="margin-bottom:10px">' +
      '<div id="refBody">' + body + '</div></div>';
  }
  // ---- Compliance / SQF (from the SQF Calendar in the Operations shared drive) ----
  const SQF_CERTS = [
    { name: "SQF Certification", freq: "Annually", when: "Recertification audit yearly", body: "SQF (SQFI)" },
    { name: "FDA Registration", freq: "Every even year", when: "Due 2026 (renew every even year)", body: "FDA" },
    { name: "UDAF Inspection", freq: "Annually", when: "State inspection", body: "Utah Dept. of Ag & Food" },
    { name: "HACCP Plan Review", freq: "Annually", when: "April - review & sign", body: "Internal / SQF" },
    { name: "Kosher", freq: "Annually", when: "Certification renewal", body: "Kosher agency" }
  ];
  // months: array of month numbers (1-12) the activity is DUE; empty => ongoing all year
  const SQF_ACTIVITIES = [
    { g: "Monthly", items: [
      "Consumer & Consumer Complaints (review)", "Trend Complaints", "CAPA Reports & Log",
      "Cleaning - Production Floor (daily/weekly, monthly review)", "Cleaning - Warehouse",
      "Cleaning Checklist - Bathrooms/Breakrooms/Garbage", "Daily Walk on Floor", "Trace Gains",
      "ATP Log", "Production Records", "COA's (all raw materials)", "Incident Reports",
      "Monthly Self-Inspection", "Scale Checks (standard weight verification)",
      "SQF Monthly Management Review (meeting)", "GMP for Employees", "Audit 5 records for legibility & accuracy" ] },
    { g: "Quarterly", items: [
      "Glass & Brittle / Hard Plastics Audit (Mar/Jun/Sep/Dec)",
      "Environmental Testing - 2 Salmonella + 2 Listeria (Feb/May/Aug/Nov)" ] },
    { g: "Bi-Annually", items: [ "Food Safety Culture Survey (Feb & Jun)" ] },
    { g: "Annually", items: [
      "SDS Sheets (Feb)", "Product Specifications (Feb)", "Training (Feb)", "Approved Supplier List (Feb)",
      "Mock Recall (Feb)", "GMP for Contract Service Providers (Feb)", "Water Sampling (Mar)", "Air Testing (Mar)",
      "Validation of Labels (Mar)", "Food Defense Risk Assessment (Mar)", "Food Fraud Vulnerability (Mar)",
      "Test of Crisis Plan (Mar)", "Policy Statement - signed (Apr)", "Food Defense Assessment (Apr)",
      "Review HACCP Plan - signed (Apr)", "Backflow Checks (Apr)", "External Scales Calibrated (Apr)",
      "Move Pallets in Warehouse - pest check (Apr)", "SDS Review (Apr)", "Metal Detector / X-Ray Calibrated (Apr)",
      "Master Sanitation Management Review (Apr)", "Quality Dept. Weights (Utah Scale / State of Utah)" ] }
  ];
  const SQF_DOCS = [
    { t: "SQF Code 9.0", u: "" },
    { t: "SQF Certification Roadmap", u: "https://drive.google.com/file/d/1DRUASpo5Ma-P3vR-djvqX22iMwyiNbuk/view" },
    { t: "SQF Calendar 2026", u: "https://drive.google.com/file/d/1D-xrQeNZAtTU6HQc-4te_YsBf_ZJClTH/view" },
    { t: "Food Safety Compliance Index", u: "https://drive.google.com/file/d/1fCtT5Chfpfvc3CBaQK3dPS36H8H00VvH/view" },
    { t: "QF-2.24.1 Validation & Verification Schedule", u: "https://drive.google.com/file/d/1_zHrqI3V8QqztO7RAClMvwdZTLBU4kF_/view" },
    { t: "QP-2.18.0 Verification & Validation Procedure", u: "https://drive.google.com/file/d/1WKLMKbswZqVVRVgbk8xN5pUjroU-x11l/view" },
    { t: "Allergen Validation Log", u: "https://drive.google.com/file/d/1NrZ0_T-8Fv3z2QXVXZApxpJd5Kbxa68H/view" }
  ];
  function viewCompliance() {
    const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date(); const mo = now.getMonth() + 1;
    // Certs & audits
    const certRows = SQF_CERTS.map(c => '<tr><td><b>' + esc(c.name) + '</b></td><td>' + esc(c.freq) + '</td><td class="muted sm">' + esc(c.when) + '</td><td class="muted sm">' + esc(c.body) + '</td></tr>').join("");
    // Activity schedule
    const actCards = SQF_ACTIVITIES.map(gr => {
      const rows = gr.items.map(i => '<tr><td>' + esc(i) + '</td></tr>').join("");
      return '<h3 class="sub2" style="margin-top:12px">' + esc(gr.g) + ' <span class="muted sm">(' + gr.items.length + ')</span></h3><table><tbody>' + rows + '</tbody></table>';
    }).join("");
    // This-month highlight: which annual/quarterly items land this month
    const dueNow = [];
    SQF_ACTIVITIES.forEach(gr => gr.items.forEach(i => {
      const m = i.match(/\(([^)]*)\)/g); if (!m) return;
      const txt = m.join(" ");
      if (new RegExp("\\b" + monthName[mo - 1] + "\\b", "i").test(txt)) dueNow.push(i);
    }));
    const dueCard = '<div class="card"><h2 class="sub2">' + L("cmpDueThis") + ' - ' + monthName[mo - 1] + '</h2>' +
      (dueNow.length ? '<ul style="margin:4px 0 0 18px">' + dueNow.map(i => '<li>' + esc(i) + '</li>').join("") + '</ul>'
        : '<p class="muted">' + L("cmpAllMonthly") + '</p>') + '</div>';
    const docRows = SQF_DOCS.map(d => '<tr><td>' + (d.u ? '<a class="polink" href="' + d.u + '" target="_blank" rel="noopener">' + esc(d.t) + '</a>' : '<b>' + esc(d.t) + '</b> <span class="muted sm">(in Drive)</span>') + '</td></tr>').join("");
    return '<div class="card"><h2>' + L("compliance") + '</h2><p class="hint">' + L("cmpHint") + '</p></div>' +
      '<div class="card"><h2 class="sub2">' + L("cmpCerts") + '</h2>' +
      '<table class="sortable"><thead><tr><th>' + L("cmpCert") + '</th><th>' + L("cmpFreq") + '</th><th>' + L("cmpWhen") + '</th><th>' + L("cmpBody") + '</th></tr></thead><tbody>' + certRows + '</tbody></table></div>' +
      dueCard +
      '<div class="card"><h2 class="sub2">' + L("cmpSchedule") + '</h2><p class="hint">' + L("cmpScheduleHint") + '</p>' + actCards + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("cmpDocs") + '</h2><p class="hint">' + L("cmpDocsHint") + '</p><table><tbody>' + docRows + '</tbody></table></div>';
  }
  // ===== DEMAND SECTION (SPS 850 + ShipIQ live board) =====
  function dmdDot(kind) {
    const c = kind === "covered" ? "#CFE6BE" : kind === "blocked" ? "#F2B6B6" : "#FFE9A8";
    const t = kind === "covered" ? L("dsCovered") : kind === "blocked" ? L("dsBlocked") : L("dsProduce");
    return '<span style="display:inline-block;padding:2px 9px;border-radius:10px;background:' + c + ';color:#222;font-size:12px;font-weight:600">' + t + '</span>';
  }
  function viewDemandBoard() {
    const all = (DB.demandLines ? DB.demandLines() : []);
    if (!all.length) return '<div class="card"><h2>' + L("demandboard") + '</h2><p class="muted">' + L("dmNone") + '</p>' +
      '<button class="primary" onclick="UI_go(\'demandimport\')">' + L("demandimport") + '</button></div>';
    const partners = [...new Set(all.map(r => r.partner))].sort();
    const flavors = [...new Set(all.map(r => r.flavor))].sort();
    let rows = all.filter(r =>
      (dmdStatus === "All" || (r.status || "Open") === dmdStatus) &&
      (!dmdPartner || r.partner === dmdPartner) &&
      (!dmdFlavor || r.flavor === dmdFlavor));
    // sort by due date then partner then po
    rows = rows.slice().sort((a, b) => (String(a.due_date || "9999") + a.partner + a.po).localeCompare(String(b.due_date || "9999") + b.partner + b.po));
    const openRows = all.filter(r => (r.status || "Open") === "Open");
    const totCases = openRows.reduce((s, r) => s + (Number(r.cases) || 0), 0);
    const totBags = openRows.reduce((s, r) => s + (Number(r.bags) || 0), 0);
    const openPOs = new Set(openRows.map(r => r.source + r.po)).size;
    const psel = '<select onchange="UI.dmdSet(\'partner\',this.value)"><option value="">' + L("dmAllPartners") + '</option>' +
      partners.map(p => '<option' + (p === dmdPartner ? ' selected' : '') + '>' + esc(p) + '</option>').join("") + '</select>';
    const fsel = '<select onchange="UI.dmdSet(\'flavor\',this.value)"><option value="">' + L("dmAllFlavors") + '</option>' +
      flavors.map(f => '<option' + (f === dmdFlavor ? ' selected' : '') + '>' + esc(f) + '</option>').join("") + '</select>';
    const ssel = '<select onchange="UI.dmdSet(\'status\',this.value)">' +
      ['Open', 'Shipped', 'All'].map(s => '<option value="' + s + '"' + (s === dmdStatus ? ' selected' : '') + '>' + L(s === "Open" ? "dmOpen" : s === "Shipped" ? "dmShipped" : "dmAll") + '</option>').join("") + '</select>';
    const head = '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">' + L("demand") + '</h2>' +
      '<button class="ghost sm" onclick="UI_go(\'demandimport\')">&#8635; ' + L("demandimport") + '</button></div>' +
      '<p class="hint">' + L("dmHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(openPOs) + '</div><div class="l">' + L("dmPOs") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(totCases) + '</div><div class="l">' + L("dmCases") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(totBags) + '</div><div class="l">' + L("dmBags") + '</div></div></div>' +
      '<div class="row" style="margin-top:10px">' + psel + fsel + ssel + '</div></div>';
    const body = rows.length ? rows.map(r => {
      const open = (r.status || "Open") === "Open";
      const shipBtn = open ? '<button class="ghost sm" onclick="UI.dmShip(\'' + r.source + '\',\'' + esc(r.po) + '\')">' + L("dmShip") + '</button>'
        : '<span class="muted sm">' + L("dmShipped") + '</span>';
      const dc = (r.dc || (r.notes || "")) ? esc(r.dc || "") : "";
      return '<tr><td>' + esc(r.partner) + '</td><td><b>' + esc(r.po) + '</b>' + (r.load ? ' <span class="muted sm">L' + esc(r.load) + '</span>' : '') + '</td>' +
        '<td>' + esc(r.flavor) + '</td><td class="right"><b>' + fmt(r.cases) + '</b></td><td class="right muted">' + fmt(r.bags) + '</td>' +
        '<td class="sm">' + (r.due_date ? esc(r.due_date) : '<span class="muted">' + L("dmDueUnknown") + '</span>') + '</td>' +
        '<td>' + shipBtn + '</td></tr>';
    }).join("") : '<tr><td colspan="7" class="muted">&mdash;</td></tr>';
    const table = '<div class="card"><div class="tblwrap"><table class="sortable"><thead><tr>' +
      '<th>' + L("dmPartner") + '</th><th>' + L("dmPO") + '</th><th>' + L("dmFlavor") + '</th>' +
      '<th class="right">' + L("dmCases") + '</th><th class="right">' + L("dmBags") + '</th><th>' + L("dmDue") + '</th><th data-nosort>' + L("dmStatusH") + '</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
    return head + table;
  }
  // Shared production-need engine: per-flavor bags/cases to build from open demand minus on-hand.
  // Used by the Fulfillment Production Schedule AND the Mixing / P-Mac "What to Build" panels.
  // Target, McLane, Bass Pro/Sportsman's ship on their own routed/scheduled dates; everyone else builds ASAP on receipt.
  function isSchedPartner(p) { return /target|mclane|bass\s*pro|sportsman/i.test(p || ""); }
  function computeBuildNeed(scope) {
    // Two drivers: (1) open customer orders, (2) minimum stock levels (Stock Build goals).
    // scope "buildnow" = ASAP customers only (exclude scheduled Target/McLane/Bass Pro).
    let open = (DB.demandLines ? DB.demandLines() : []).filter(r => (r.status || "Open") === "Open");
    if (scope === "buildnow") open = open.filter(r => !isSchedPartner(r.partner));
    const dem = {};
    open.forEach(r => { const f = r.flavor; if (!dem[f]) dem[f] = { code: r.flavor_code, cases: 0, bags: 0 }; dem[f].cases += Number(r.cases) || 0; dem[f].bags += Number(r.bags) || 0; });
    const goal = {};
    SB_ITEMS.forEach(i => { if (i.cat === "Target" || i.cat === "Master Case") goal[i.name] = (goal[i.name] || 0) + i.goal; });
    const codeMap = (window.DEMAND && DEMAND.FLAVOR_CODES) || {};
    const flavors = Object.keys(Object.assign({}, dem, goal));
    let list = flavors.map(f => {
      const d = dem[f] || { code: "", cases: 0, bags: 0 };
      const code = d.code || codeMap[f] || "";
      const onHand = demandOnHandCases(f);
      const demandNeed = Math.max(0, d.cases - onHand);
      const stockNeed = Math.max(0, (goal[f] || 0) - onHand);
      const toProduce = Math.max(demandNeed, stockNeed);
      const driver = toProduce <= 0 ? "" : (demandNeed >= stockNeed && demandNeed > 0 ? "order" : "stock");
      const film = demandFilmBags(code);
      const kind = toProduce <= 0 ? "covered" : (film != null && film < toProduce * 72) ? "blocked" : "produce";
      const pallets = toProduce > 0 ? Math.ceil(toProduce / 30 * 10) / 10 : 0;
      return { flavor: f, code: code, cases: d.cases, bags: d.bags, goalCases: goal[f] || 0, onHand: onHand, onHandBags: onHand * 72, toProduce: toProduce, toProduceBags: toProduce * 72, driver: driver, film: film, kind: kind, pallets: pallets };
    });
    list.sort((a, b) => (b.toProduce - a.toProduce) || (DMD_FLAVOR_ORDER.indexOf(a.flavor) - DMD_FLAVOR_ORDER.indexOf(b.flavor)));
    const T = { demandCases: 0, demandBags: 0, onHandCases: 0, toProduceCases: 0, toProduceBags: 0 };
    list.forEach(x => { T.demandCases += x.cases; T.demandBags += x.bags; T.onHandCases += x.onHand; T.toProduceCases += x.toProduce; T.toProduceBags += x.toProduceBags; });
    return { list: list, T: T, hasData: list.length > 0, needCount: list.filter(x => x.toProduce > 0).length };
  }
  // Build-need card. audience "prod" = Mixing/P-Mac (bags-forward); "ful" = Fulfillment (bags + cases).
  function buildNeedCard(audience, scope) {
    const n = computeBuildNeed(scope);
    const prod = audience !== "ful";
    if (n.needCount === 0) return '<div class="card"><h2>&#127981; ' + L("bnTitle") + '</h2><p style="color:#2E7D32;font-weight:600;margin:4px 0">&#10003; ' + L("bnAllCovered") + '</p></div>';
    const show = n.list.filter(x => x.toProduce > 0);
    const rows = show.map(x => '<tr><td>' + esc(x.flavor) + (x.code ? ' <span class="muted sm">' + esc(x.code) + '</span>' : '') + (x.driver ? ' <span class="tag" style="font-size:10px">' + L(x.driver === "order" ? "bnDriverOrder" : "bnDriverStock") + '</span>' : '') + '</td>' +
      '<td class="right muted">' + fmt(x.bags) + '</td><td class="right muted">' + fmt(x.onHandBags) + '</td>' +
      '<td class="right"><b>' + fmt(x.toProduceBags) + '</b></td>' + (prod ? '' : '<td class="right muted">' + fmt(x.toProduce) + '</td>') +
      '<td>' + dmdDot(x.kind) + '</td></tr>').join("");
    const th = '<tr><th>' + L("dsFlavor") + '</th><th class="right">' + L("bnDemandBags") + '</th><th class="right">' + L("bnOnHandBags") + '</th><th class="right">' + L("bnToProduceBags") + '</th>' + (prod ? '' : '<th class="right">' + L("bnToProduceCs") + '</th>') + '<th data-nosort>' + L("dmStatusH") + '</th></tr>';
    const kpi = '<div class="kpis"><div class="kpi"><div class="n">' + fmt(n.T.toProduceBags) + '</div><div class="l">' + L("bnToProduceBags") + '</div></div>' +
      (prod ? '' : '<div class="kpi"><div class="n">' + fmt(n.T.toProduceCases) + '</div><div class="l">' + L("bnToProduceCs") + '</div></div>') +
      '<div class="kpi"><div class="n">' + n.needCount + '</div><div class="l">' + L("bnFlavors") + '</div></div></div>';
    return '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">&#127981; ' + L("bnTitle") + '</h2><a class="ghost sm" onclick="UI_go(\'demand\')">' + L("demand") + ' &#8250;</a></div>' +
      '<p class="hint">' + L(prod ? "bnHintProd" : "bnHintFul") + '</p>' + kpi +
      '<div class="tblwrap"><table class="sortable"><thead>' + th + '</thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  // ===== Department-specific demand dashboards (Mixing / P-Mac / Fulfillment) =====
  const DQ_DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function dqToday() { return new Date().toISOString().slice(0, 10); }
  function dqWeekDates() { const now = new Date(); const off = (now.getDay() + 6) % 7; const mon = new Date(now); mon.setDate(now.getDate() - off); const a = []; for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(mon.getDate() + i); a.push(d.toISOString().slice(0, 10)); } return a; }
  function dqAheadDates() { const now = new Date(); const a = []; for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() + i); a.push(d.toISOString().slice(0, 10)); } return a; }
  function dqProdSum(date, dept, shift) {
    return (DB.productionOutput ? DB.productionOutput() : []).filter(r => r.prod_date === date && r.dept === dept && (shift == null || Number(r.shift) === Number(shift)))
      .reduce((a, r) => { a.bags += Number(r.bags) || 0; a.cases += Number(r.cases) || 0; return a; }, { bags: 0, cases: 0 });
  }
  function dqTabs(active) {
    const t = (k, lbl) => '<button class="' + (active === k ? "active" : "") + '" onclick="UI.dmdDept(\'' + k + '\')">' + lbl + '</button>';
    return '<div class="ordtabs" style="margin-bottom:12px">' + t("mixing", L("dqMix")) + t("pmac", L("dqPmac")) + t("ful", L("dqFul")) + '</div>';
  }
  function dqDowLocal(d) { const dt = new Date(d + "T00:00:00"); return DQ_DOW[(dt.getDay() + 6) % 7]; }
  function deptDemandBoard(dept, withTabs) {
    const isFul = dept === "ful";
    const today = dqToday();
    const unit = isFul ? L("dqCases") : L("dqBags");
    const P = v => isFul ? v.cases : v.bags;
    const openAll = (DB.demandLines ? DB.demandLines() : []).filter(r => (r.status || "Open") === "Open");
    // Today's target = ASAP customers (build-on-receipt) + stock replenishment, net on-hand. Scheduled customers are held out.
    const bn = computeBuildNeed("buildnow");
    const buildNowBags = openAll.filter(r => !isSchedPartner(r.partner)).reduce((s, r) => s + (Number(r.bags) || 0), 0);
    const tgtBags = bn.T.toProduceBags, tgtCases = bn.T.toProduceCases;
    const driver = buildNowBags > 0 ? "orders" : "stock";
    const tgt = isFul ? tgtCases : tgtBags;
    const shifts = isFul ? 1 : 2;
    const bar = pct => '<div style="height:8px;background:#ECECEC;border-radius:6px;overflow:hidden;margin-top:5px"><div style="height:100%;width:' + Math.min(100, pct) + '%;background:' + (pct >= 100 ? "#2E7D32" : "#1F3864") + '"></div></div>';
    let shiftCards = "";
    for (let sh = 1; sh <= shifts; sh++) {
      const st = shifts === 1 ? tgt : (sh === 1 ? Math.ceil(tgt / 2) : tgt - Math.ceil(tgt / 2));
      const act = P(dqProdSum(today, dept, sh));
      const pct = st > 0 ? Math.round(act / st * 100) : (act > 0 ? 100 : 0);
      const rem = Math.max(0, st - act);
      shiftCards += '<div class="kpi" style="text-align:left;min-width:155px"><div class="l" style="font-weight:700">' + (shifts === 1 ? L("dqTargetShort") : (sh === 1 ? L("dqS1") : L("dqS2"))) + '</div>' +
        '<div class="n" style="font-size:22px">' + fmt(act) + ' <span class="muted" style="font-size:13px">/ ' + fmt(st) + '</span></div>' +
        '<div class="muted sm">' + pct + '% ' + L("dqPct") + ' &middot; ' + fmt(rem) + ' ' + L("dqRemaining") + '</div>' + bar(pct) + '</div>';
    }
    const driverTag = '<span class="tag">' + (driver === "orders" ? L("dqBuildNow") : L("dqStock")) + '</span>';
    const todayCard = '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">' + L("dqToday") + ' &mdash; ' + today + '</h2>' + driverTag + '</div>' +
      '<p class="hint">' + L(isFul ? "dqHintFul" : "dqHintProd") + '</p>' +
      '<div class="kpis"><div class="kpi ok" style="text-align:left;min-width:160px"><div class="l" style="font-weight:700">' + L("dqTarget") + '</div><div class="n">' + fmt(tgt) + '</div><div class="muted sm">' + unit + (shifts > 1 ? ' &middot; ' + L("dqShiftSplit") : '') + '</div></div>' + shiftCards + '</div></div>';
    const flavOpts = '<option value="">' + L("dqAll") + '</option>' + DMD_FLAVOR_ORDER.map(f => '<option>' + esc(f) + '</option>').join("");
    const shiftSel = shifts > 1 ? '<div><label>' + L("dqShift") + '</label><select id="pl-shift"><option value="1">' + L("dqS1") + '</option><option value="2">' + L("dqS2") + '</option></select></div>' : '';
    const qtyField = isFul ? '<div><label>' + L("dqCases") + '</label><input id="pl-cases" type="number" min="0" placeholder="0"></div>' : '<div><label>' + L("dqBags") + '</label><input id="pl-bags" type="number" min="0" placeholder="0"></div>';
    const logCard = '<div class="card"><h2 class="sub2">' + L("dqLog") + '</h2><p class="hint">' + L("dqLogHint") + '</p>' +
      '<div class="row">' + shiftSel + '<div><label>' + L("dqFlavor") + '</label><select id="pl-flavor">' + flavOpts + '</select></div>' + qtyField + '<div style="align-self:end">' + opField(isFul ? "Jesus" : "Leo") + '</div></div>' +
      '<button class="primary" onclick="UI.prodLog(\'' + dept + '\')">' + L("dqLogBtn") + '</button></div>';
    // Scheduled orders: Target / McLane / Bass Pro — held to their routed/scheduled ship dates, not part of today's build.
    const sched = openAll.filter(r => isSchedPartner(r.partner));
    const schByCust = {};
    sched.forEach(r => { const k = r.partner || "?"; if (!schByCust[k]) schByCust[k] = { bags: 0, cases: 0, due: null }; schByCust[k].bags += Number(r.bags) || 0; schByCust[k].cases += Number(r.cases) || 0; if (r.due_date && (!schByCust[k].due || r.due_date < schByCust[k].due)) schByCust[k].due = r.due_date; });
    const schTotBags = sched.reduce((s, r) => s + (Number(r.bags) || 0), 0), schTotCases = sched.reduce((s, r) => s + (Number(r.cases) || 0), 0);
    const schRows = Object.keys(schByCust).sort().map(k => { const v = schByCust[k]; return '<tr><td>' + esc(k) + '</td><td class="right"><b>' + fmt(isFul ? v.cases : v.bags) + '</b></td><td class="sm">' + (v.due ? esc(v.due) : '<span class="muted">' + L("dqTBD") + '</span>') + '</td></tr>'; }).join("");
    const scheduledCard = schRows ? '<div class="card"><h2 class="sub2">' + L("dqScheduled") + '</h2><p class="hint">' + L("dqScheduledHint") + '</p><div class="tblwrap"><table><thead><tr><th>' + L("dmPartner") + '</th><th class="right">' + unit + '</th><th>' + L("dqShipDate") + '</th></tr></thead><tbody>' + schRows +
      '<tr style="background:#F0F0F0"><td><b>' + L("dqTotal") + '</b></td><td class="right"><b>' + fmt(isFul ? schTotCases : schTotBags) + '</b></td><td></td></tr></tbody></table></div></div>' : '';
    const wk = dqWeekDates();
    const hdr = '<tr><th>' + L("dqShift") + '</th>' + wk.map(d => { const dt = new Date(d + "T00:00:00"); return '<th class="right">' + dqDowLocal(d) + '<br><span class="muted sm">' + (dt.getMonth() + 1) + '/' + dt.getDate() + '</span></th>'; }).join("") + '<th class="right">' + L("dqTotal") + '</th></tr>';
    let bodyRows = ""; const colTot = wk.map(() => 0); let grand = 0;
    const shiftList = isFul ? [null] : [1, 2];
    shiftList.forEach(sh => {
      let rowTot = 0; let cells = "";
      wk.forEach((d, ci) => { const v = P(dqProdSum(d, dept, sh)); rowTot += v; colTot[ci] += v; cells += '<td class="right">' + (v ? fmt(v) : '<span class="muted">&mdash;</span>') + '</td>'; });
      grand += rowTot;
      bodyRows += '<tr><td><b>' + (isFul ? L("dqTargetShort") : (sh === 1 ? L("dqS1") : L("dqS2"))) + '</b></td>' + cells + '<td class="right"><b>' + fmt(rowTot) + '</b></td></tr>';
    });
    const totRow = '<tr style="background:#F0F0F0"><td><b>' + L("dqTotal") + '</b></td>' + colTot.map(v => '<td class="right"><b>' + (v ? fmt(v) : "&mdash;") + '</b></td>').join("") + '<td class="right"><b>' + fmt(grand) + '</b></td></tr>';
    const resultsCard = '<div class="card"><h2 class="sub2">' + L("dqResults") + '</h2><p class="hint">' + L("dqResultsHint") + ' (' + unit + ')</p><div class="tblwrap"><table><thead>' + hdr + '</thead><tbody>' + bodyRows + totRow + '</tbody></table></div>' + dqTodayLog(dept, isFul) + '</div>';
    return (withTabs ? dqTabs(dept) : '') + todayCard + logCard + scheduledCard + resultsCard + buildNeedCard(isFul ? "ful" : "prod", "buildnow");
  }
  function dqTodayLog(dept, isFul) {
    const today = dqToday();
    const rows = (DB.productionOutput ? DB.productionOutput() : []).filter(r => r.prod_date === today && r.dept === dept);
    if (!rows.length) return '<p class="muted sm" style="margin-top:8px">' + L("dqNothing") + '</p>';
    const body = rows.map(r => '<tr><td>' + (isFul ? "" : ("S" + r.shift + " ")) + esc(r.flavor || L("dqAll")) + '</td><td class="right"><b>' + fmt(isFul ? r.cases : r.bags) + '</b> ' + (isFul ? L("dqCases") : L("dqBags")) + '</td><td class="muted sm">' + esc(r.entered_by || "") + '</td><td><button class="ghost sm danger" onclick="UI.prodDel(\'' + r.id + '\')">&#10005;</button></td></tr>').join("");
    return '<h3 class="sub2" style="margin-top:14px;font-size:14px">' + L("dqLogged") + '</h3><table><tbody>' + body + '</tbody></table>';
  }
  function viewDemand() { return deptDemandBoard(dmdDept, true); }
  function viewDemandSched() {
    const open = (DB.demandLines ? DB.demandLines() : []).filter(r => (r.status || "Open") === "Open");
    if (!open.length) return '<div class="card"><h2>' + L("demandsched") + '</h2><p class="muted">' + L("dsNone") + '</p>' +
      '<button class="primary" onclick="UI_go(\'demandimport\')">' + L("demandimport") + '</button></div>';
    const byF = {};
    open.forEach(r => { const f = r.flavor; if (!byF[f]) byF[f] = { flavor: f, code: r.flavor_code, cases: 0, bags: 0 }; byF[f].cases += Number(r.cases) || 0; byF[f].bags += Number(r.bags) || 0; });
    let list = Object.values(byF).map(x => {
      const onHand = demandOnHandCases(x.flavor);
      const toProduce = Math.max(0, x.cases - onHand);
      const film = demandFilmBags(x.code);
      const kind = toProduce <= 0 ? "covered" : (film != null && film < toProduce * 72) ? "blocked" : "produce";
      const pallets = toProduce > 0 ? Math.ceil(toProduce / 30 * 10) / 10 : 0;
      return Object.assign(x, { onHand, toProduce, film, kind, pallets });
    });
    // order by DMD_FLAVOR_ORDER for known flavors, then by toProduce desc
    list.sort((a, b) => (b.toProduce - a.toProduce) || (DMD_FLAVOR_ORDER.indexOf(a.flavor) - DMD_FLAVOR_ORDER.indexOf(b.flavor)));
    const gDem = list.reduce((s, x) => s + x.cases, 0), gOn = list.reduce((s, x) => s + x.onHand, 0), gProd = list.reduce((s, x) => s + x.toProduce, 0);
    const rowsHtml = list.map(x => '<tr><td>' + esc(x.flavor) + (x.code ? ' <span class="muted sm">' + esc(x.code) + '</span>' : '') + '</td>' +
      '<td class="right">' + fmt(x.cases) + '</td><td class="right muted">' + fmt(x.bags) + '</td>' +
      '<td class="right">' + fmt(x.onHand) + '</td><td class="right"><b>' + fmt(x.toProduce) + '</b></td>' +
      '<td class="right"><b>' + fmt(x.toProduce * 72) + '</b></td>' +
      '<td class="right muted sm">' + (x.toProduce > 0 ? x.pallets : "—") + '</td>' +
      '<td class="right muted sm">' + (x.film != null ? fmt(x.film) : "—") + '</td>' +
      '<td>' + dmdDot(x.kind) + '</td></tr>').join("");
    const head = '<div class="card"><h2>' + L("demandsched") + '</h2><p class="hint">' + L("dsHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + fmt(gDem) + '</div><div class="l">' + L("dsDemandCs") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(gOn) + '</div><div class="l">' + L("dsOnHand") + '</div></div>' +
      '<div class="kpi"><div class="n">' + fmt(gProd) + '</div><div class="l">' + L("dsToProduce") + '</div></div></div></div>';
    const table = '<div class="card"><div class="tblwrap"><table class="sortable"><thead><tr>' +
      '<th>' + L("dsFlavor") + '</th><th class="right">' + L("dsDemandCs") + '</th><th class="right">' + L("dsDemandBags") + '</th>' +
      '<th class="right">' + L("dsOnHand") + '</th><th class="right">' + L("dsToProduce") + '</th><th class="right">' + L("bnToProduceBags") + '</th><th class="right">' + L("dsPallets") + '</th>' +
      '<th class="right">' + L("dsFilm") + '</th><th data-nosort>' + L("dmStatusH") + '</th></tr></thead><tbody>' + rowsHtml +
      '<tr style="background:#E8E8E8"><td><b>' + L("dsGrand") + '</b></td><td class="right"><b>' + fmt(gDem) + '</b></td><td></td>' +
      '<td class="right"><b>' + fmt(gOn) + '</b></td><td class="right"><b>' + fmt(gProd) + '</b></td><td class="right"><b>' + fmt(gProd * 72) + '</b></td><td></td><td></td><td></td></tr>' +
      '</tbody></table></div></div>';
    return head + table;
  }
  function viewDemandImport() {
    const cur = (DB.demandLines ? DB.demandLines() : []);
    const openCt = cur.filter(r => (r.status || "Open") === "Open").length;
    const drop = '<div class="card"><h2>' + L("demandimport") + '</h2><p class="hint">' + L("diHint") + '</p>' +
      '<div class="row"><div style="flex:2"><label>' + L("diDrop") + '</label>' +
      '<input id="dmd-files" type="file" accept=".csv,text/csv" multiple onchange="UI.diFiles(this)"></div>' +
      '<div><label>' + L("diLabel") + '</label><input id="dmd-label" placeholder="' + new Date().toISOString().slice(0, 10) + '"></div></div>' +
      '<p class="hint" style="margin:6px 0 0">' + L("diReplace") + '</p>' +
      '<div style="margin-top:10px"><button class="ghost sm danger" onclick="UI.diClearAll()">' + L("diClear") + ' (' + cur.length + ')</button></div></div>';
    if (!dmdParsed) return drop;
    const p = dmdParsed;
    const fileList = '<p class="sm"><b>' + L("diParsedFiles") + ':</b> ' + p.files.map(f => esc(f.name) + ' (' + f.type + (f.type === "unknown" ? " — " + L("diUnknown") : ", " + f.count + " " + L("diLinesW")) + ')').join(" · ") + '</p>';
    const warn = p.warnings.length ? '<div class="card" style="background:#FFF6E5"><b>' + L("diWarn") + ':</b><ul>' + p.warnings.map(w => '<li class="sm">' + esc(w) + '</li>').join("") + '</ul></div>' : '';
    const recon = (p.recon && p.recon.length) ? '<div class="card" style="background:#EAF2FB"><b>' + L("diRecon") + ':</b><ul>' + p.recon.map(w => '<li class="sm">' + esc(w) + '</li>').join("") + '</ul></div>' : '';
    const byF = {}; p.rows.forEach(r => { byF[r.flavor] = (byF[r.flavor] || 0) + (Number(r.cases) || 0); });
    const previewRows = p.rows.slice(0, 60).map(r => '<tr><td>' + esc(r.partner) + '</td><td>' + esc(r.po) + '</td><td>' + esc(r.flavor) + '</td><td class="right">' + fmt(r.cases) + '</td><td class="right muted">' + fmt(r.bags) + '</td><td class="sm">' + esc(r.due_date || "") + '</td></tr>').join("");
    const totCs = p.rows.reduce((s, r) => s + (Number(r.cases) || 0), 0);
    const preview = '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + L("diParse") + ' — ' + p.rows.length + ' ' + L("diLinesW") + ' / ' + fmt(totCs) + ' ' + L("dmCases") + '</h2>' +
      '<button class="primary" onclick="UI.diCommit()"' + (dmdBusy ? ' disabled' : '') + '>' + (dmdBusy ? '…' : L("diCommit")) + '</button></div>' +
      '<div class="tblwrap"><table><thead><tr><th>' + L("dmPartner") + '</th><th>' + L("dmPO") + '</th><th>' + L("dmFlavor") + '</th><th class="right">' + L("dmCases") + '</th><th class="right">' + L("dmBags") + '</th><th>' + L("dmDue") + '</th></tr></thead><tbody>' + previewRows +
      (p.rows.length > 60 ? '<tr><td colspan="6" class="muted sm">+' + (p.rows.length - 60) + ' …</td></tr>' : '') + '</tbody></table></div></div>';
    return drop + fileList + warn + recon + preview;
  }
  // ===== E-Com Demand (ShipStation "Product Sales" CSV -> bags-needed-per-flavor, window.ECOM) =====
  // ===== 1.5oz e-com demand baseline (ShipStation FY Jul2025-Jun2026) — trend + by-flavor =====
  var EC15_MONTHS = ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
  var EC15_BAGS = [170054,243853,227725,174748,239021,210650,84754,113982,294000,241844,269143,189284];
  var EC15_ROWS = [{f:"Backyard BBQ",t:252286,w:4852,c:1},{f:"Dill Pickle",t:224436,w:4316,c:1},{f:"Ranch",t:221919,w:4268,c:1},{f:"Cinnamon Churro",t:210373,w:4046,c:1},{f:"Cheddar Jalapeno",t:207274,w:3986,c:1},{f:"Lemon Pepper",t:198158,w:3811,c:1},{f:"Garlic Parmesan",t:195195,w:3754,c:1},{f:"Maple Brown Sugar",t:189147,w:3637,c:1},{f:"Sour Cream & Onion",t:184011,w:3539,c:1},{f:"Cracked Pepper",t:167138,w:3214,c:1},{f:"OG Original",t:146200,w:2812,c:1},{f:"Spicy Queso",t:53356,w:1026,c:1},{f:"Chili Lime",t:51340,w:987,c:1},{f:"PB&J",t:38047,w:732,c:1},{f:"Buffalo Ranch",t:29494,w:567,c:1},{f:"Cheddar Ghost Pepper",t:28337,w:545,c:1},{f:"Strawberry Cheesecake",t:28220,w:543,c:1},{f:"Cinnamon Roll (LTO)",t:27233,w:524,c:1},{f:"Loaded Potato",t:1779,w:34,c:0},{f:"Guacamole",t:1458,w:28,c:0},{f:"Taco",t:633,w:12,c:0},{f:"Salsa",t:423,w:8,c:0}];
  let ecChartMode = "total";
  function ec15Val(r){ return ecChartMode === "s4" ? r.w*4 : (ecChartMode === "w" ? r.w : r.t); }
  function ecOneFiveCard(){
    var W=700,H=190,pl=44,pr=12,ptp=14,pb=26,iw=W-pl-pr,ih=H-ptp-pb,mx=300000;
    var xf=function(i){return pl+iw*i/11;}, yf=function(v){return ptp+ih*(1-v/mx);};
    var pathd="",area="M"+xf(0).toFixed(1)+" "+yf(0),grid="",dots="",lab="";
    EC15_BAGS.forEach(function(v,i){ pathd+=(i?"L":"M")+xf(i).toFixed(1)+" "+yf(v).toFixed(1)+" "; area+=" L"+xf(i).toFixed(1)+" "+yf(v).toFixed(1); });
    area+=" L"+xf(11).toFixed(1)+" "+yf(0)+" Z";
    [0,100000,200000,300000].forEach(function(g){ grid+='<line x1="'+pl+'" y1="'+yf(g)+'" x2="'+(W-pr)+'" y2="'+yf(g)+'" stroke="#EEF2F7"/><text x="'+(pl-6)+'" y="'+(yf(g)+3)+'" text-anchor="end" font-size="9" fill="#9AA8B8">'+(g/1000)+'k</text>'; });
    var vmax=Math.max.apply(null,EC15_BAGS), vmin=Math.min.apply(null,EC15_BAGS);
    EC15_BAGS.forEach(function(v,i){ var pk=v===vmax,lo=v===vmin; dots+='<circle cx="'+xf(i).toFixed(1)+'" cy="'+yf(v).toFixed(1)+'" r="'+(pk||lo?4:3)+'" fill="'+(pk?"#F26722":lo?"#4C8FD6":"#0B2138")+'"/>'; if(pk||lo){ dots+='<text x="'+xf(i).toFixed(1)+'" y="'+(yf(v)-9)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+(pk?"#F26722":"#4C8FD6")+'">'+Math.round(v/1000)+'k</text>'; } });
    EC15_MONTHS.forEach(function(m,i){ lab+='<text x="'+xf(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="#6B7A8C">'+m+'</text>'; });
    var svg='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Monthly 1.5oz demand">'+grid+'<path d="'+area+'" fill="#F26722" opacity="0.10"/><path d="'+pathd+'" fill="none" stroke="#F26722" stroke-width="2.5"/>'+dots+lab+'</svg>';
    var modes=[["total","Per year"],["w","Per week"],["s4","Stock @ 4 wks"]];
    var mbtn=modes.map(function(m){ var on=ecChartMode===m[0]; return '<button class="ghost sm" style="border-color:'+(on?"#F26722":"#D4DCE6")+';background:'+(on?"#F26722":"#fff")+';color:'+(on?"#fff":"#3A4A5C")+';font-weight:700" onclick="UI.ecChartMode(\''+m[0]+'\')">'+m[1]+'</button>'; }).join(" ");
    var rows=EC15_ROWS.slice().sort(function(a,b){return ec15Val(b)-ec15Val(a);});
    var bmax=ec15Val(rows[0])||1;
    var bars=rows.map(function(r){ var v=ec15Val(r),pct=Math.max(2,v/bmax*100); return '<div style="display:flex;align-items:center;gap:10px;margin:3px 0"><div style="width:150px;flex:none;font-size:12.5px;font-weight:'+(r.c?700:500)+';color:'+(r.c?"#0B2138":"#7A8A9A")+';text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.f)+'</div><div style="flex:1;background:#EEF2F7;border-radius:5px;height:19px"><div style="width:'+pct+'%;height:100%;border-radius:5px;background:'+(r.c?"#F26722":"#F7B48A")+'"></div></div><div style="width:64px;flex:none;font-size:12px;font-weight:700;text-align:right">'+fmt(v)+'</div></div>'; }).join("");
    return '<div class="card"><div class="suprow"><h2 style="margin:0">1.5oz Demand — Last 12 Months</h2><span class="muted sm">ShipStation · Jul 2025–Jun 2026</span></div>'+
      '<p class="hint">Every 1.5oz bag shipped, including those inside 6-packs, cases, buckets &amp; variety packs. 2.46M bags/yr · ~47,290/wk · 84% ship inside multipacks.</p>'+
      '<div style="font-size:13px;font-weight:800;margin:6px 0 2px">Monthly demand (bags)</div>'+svg+
      '<div class="suprow" style="margin-top:12px"><div style="font-size:13px;font-weight:800">By flavor</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+mbtn+'</div></div>'+bars+
      '<p class="hint" style="margin-top:8px">Multipack bags allocated across the 11 core flavors by single-bag share. Stock = weeks × avg weekly demand (starting reorder target; add lead time + safety stock).</p></div>';
  }

  function viewEcomDemand() {
    const snap = (DB.ecomDemand ? DB.ecomDemand() : []);
    const drop = ecOneFiveCard() + '<div class="card"><h2>' + L("ecomdemand") + '</h2><p class="hint">' + L("ecdHint") + '</p>' +
      '<div class="row"><div style="flex:2"><label>' + L("ecdDrop") + '</label>' +
      '<input id="ec-file" type="file" accept=".csv,text/csv" onchange="UI.ecFiles(this)"></div>' +
      '<div><label>' + L("ecdPeriod") + '</label><input id="ec-days" type="number" min="1" value="' + (ecParsed && ecParsed.periodDays ? ecParsed.periodDays : 14) + '" onchange="UI.ecRecalc()"></div>' +
      '<div><label>' + L("ecdSourceLabel") + '</label><input id="ec-label" placeholder="' + new Date().toISOString().slice(0, 10) + '"></div></div>' +
      '<div style="margin-top:10px"><button class="ghost sm danger" onclick="UI.ecClearAll()">' + L("ecdClear") + ' (' + snap.length + ')</button></div></div>';
    if (!ecParsed) return drop + ecSnapshotCard(snap);
    if (ecParsed.error) return drop + '<div class="card" style="background:#FFF6E5">' + esc(ecParsed.error) + '</div>' + ecSnapshotCard(snap);
    const days = ecParsed.periodDays || 14;
    const flavorRows = Object.keys(ecParsed.totals)
      .map(f => { const t = ecParsed.totals[f]; const tot = (t["4oz"] || 0) + (t["1.5oz"] || 0); return { flavor: f, o4: t["4oz"] || 0, o15: t["1.5oz"] || 0, tot, avg: tot / days }; })
      .sort((a, b) => b.tot - a.tot);
    const grand4 = flavorRows.reduce((s, r) => s + r.o4, 0), grand15 = flavorRows.reduce((s, r) => s + r.o15, 0), grandTot = grand4 + grand15;
    const previewRows = flavorRows.map(r => '<tr><td>' + esc(r.flavor) + '</td><td class="right">' + fmt(r.o4) + '</td><td class="right">' + fmt(r.o15) + '</td><td class="right"><b>' + fmt(r.tot) + '</b></td><td class="right muted">' + fmt(Math.round(r.avg * 10) / 10) + '</td></tr>').join("");
    const preview = '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + L("ecdPreview") + ' — ' + fmt(grandTot) + ' ' + L("ecdBagsFrom") + '</h2>' +
      '<button class="primary" onclick="UI.ecCommit()"' + (ecBusy ? ' disabled' : '') + '>' + (ecBusy ? '…' : L("ecdCommit")) + '</button></div>' +
      '<div class="tblwrap"><table class="sortable"><thead><tr><th>' + L("ecdFlavor") + '</th><th class="right">' + L("ecd4oz") + '</th><th class="right">' + L("ecd15oz") + '</th><th class="right">' + L("ecdTotal") + '</th><th class="right">' + L("ecdAvgDay") + '</th></tr></thead><tbody>' + previewRows +
      '<tr><td><b>' + L("dmTot") + '</b></td><td class="right"><b>' + fmt(grand4) + '</b></td><td class="right"><b>' + fmt(grand15) + '</b></td><td class="right"><b>' + fmt(grandTot) + '</b></td><td class="right muted">' + fmt(Math.round((grandTot / days) * 10) / 10) + '</td></tr>' +
      '</tbody></table></div></div>';
    const unm = ecParsed.unmapped || [];
    const unmappedCard = unm.length ? '<div class="card" style="background:#FFF6E5"><b>' + L("ecdUnmapped") + ' (' + unm.length + ', ' + fmt(unm.reduce((s, u) => s + (Number(u.qty) || 0), 0)) + ' ' + L("ecdUnmappedUnits") + ')</b><p class="hint" style="margin:4px 0 8px">' + L("ecdUnmappedHint") + '</p>' +
      '<div class="tblwrap"><table><thead><tr><th>' + L("ecdSku") + '</th><th>' + L("ecdDesc") + '</th><th class="right">' + L("ecdQty") + '</th></tr></thead><tbody>' +
      unm.map(u => '<tr><td class="sm">' + esc(u.sku) + '</td><td class="sm">' + esc(u.desc || "") + '</td><td class="right">' + fmt(u.qty) + '</td></tr>').join("") +
      '</tbody></table></div></div>' : '';
    return drop + preview + unmappedCard + ecSnapshotCard(snap);
  }
  // Persisted E-Com Demand snapshot (what's actually saved in Supabase, survives reload)
  function ecSnapshotCard(snap) {
    if (!snap || !snap.length) return '<div class="card"><p class="hint">' + L("ecdNone") + '</p></div>';
    const byF = {};
    snap.forEach(r => { if (!byF[r.flavor]) byF[r.flavor] = { o4: 0, o15: 0, avg: 0, period: r.period_days || 0, label: r.source_label || "" }; const e = byF[r.flavor]; if (r.size === "4oz") e.o4 += Number(r.bags) || 0; else if (r.size === "1.5oz") e.o15 += Number(r.bags) || 0; e.avg += Number(r.avg_day) || 0; if (r.source_label) e.label = r.source_label; if (r.period_days) e.period = r.period_days; });
    const rows = Object.keys(byF).map(f => Object.assign({ flavor: f }, byF[f], { tot: byF[f].o4 + byF[f].o15 })).sort((a, b) => b.tot - a.tot);
    const label = rows.length ? rows[0].label : "";
    const period = rows.length ? rows[0].period : "";
    const body = rows.map(r => '<tr><td>' + esc(r.flavor) + '</td><td class="right">' + fmt(r.o4) + '</td><td class="right">' + fmt(r.o15) + '</td><td class="right"><b>' + fmt(r.tot) + '</b></td><td class="right muted">' + fmt(Math.round(r.avg * 10) / 10) + '</td></tr>').join("");
    return '<div class="card"><h2 class="sub2">' + L("ecdSnapshot") + (label ? ' — ' + esc(label) : '') + (period ? ' (' + period + 'd)' : '') + '</h2>' +
      '<div class="tblwrap"><table class="sortable"><thead><tr><th>' + L("ecdFlavor") + '</th><th class="right">' + L("ecd4oz") + '</th><th class="right">' + L("ecd15oz") + '</th><th class="right">' + L("ecdTotal") + '</th><th class="right">' + L("ecdAvgDay") + '</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }
  // ===== Forecast vs Target (compare-only: app's current stock/production targets vs the WIP FORECAST snapshot from Supabase) =====
  function viewForecastVsTarget() {
    const fc = (DB.forecast ? DB.forecast() : []);
    const fcWithMonth = fc.find(r => r.source_month);
    const sourceMonth = fcWithMonth ? fcWithMonth.source_month : "";
    // App target (4oz), in bags: sum of Target + Master Case goals (cases) per flavor x 72 bags/case.
    const appGoalCases = {};
    SB_ITEMS.forEach(i => { if (i.cat === "Target" || i.cat === "Master Case") appGoalCases[i.name] = (appGoalCases[i.name] || 0) + i.goal; });
    const appTarget4 = {};
    Object.keys(appGoalCases).forEach(f => { appTarget4[f] = appGoalCases[f] * 72; });
    // WIP forecast by flavor + size (bags), summed in case of dup rows.
    const wip4 = {}, wip15 = {};
    fc.forEach(r => {
      const f = r.flavor; if (!f) return;
      if (r.size === "4oz") wip4[f] = (wip4[f] || 0) + (Number(r.forecast_bags) || 0);
      else if (r.size === "1.5oz") wip15[f] = (wip15[f] || 0) + (Number(r.forecast_bags) || 0);
    });
    const flavors = Array.from(new Set([].concat(Object.keys(appTarget4), Object.keys(wip4), Object.keys(wip15))));
    flavors.sort((a, b) => {
      const ia = DMD_FLAVOR_ORDER.indexOf(a), ib = DMD_FLAVOR_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1; if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    const dash = '<span class="muted">&mdash;</span>';
    const numCell = v => '<td class="right">' + (v == null ? dash : fmt(v)) + '</td>';
    const deltaCell = (app, wip) => {
      if (app == null || wip == null) return '<td class="right">' + dash + '</td>';
      const diff = wip - app;
      const pct = app !== 0 ? Math.abs(diff) / app : (wip !== 0 ? 1 : 0);
      const bg = pct <= 0.10 ? "#CFE6BE" : pct <= 0.25 ? "#FFE9A8" : "#F2B6B6";
      const sign = diff > 0 ? "+" : "";
      return '<td class="right"><span style="display:inline-block;padding:2px 9px;border-radius:10px;background:' + bg + ';color:#222;font-size:12px;font-weight:600">' + sign + fmt(diff) + '</span></td>';
    };
    const rows = flavors.length ? flavors.map(f => {
      const a4 = appTarget4[f] != null ? appTarget4[f] : null;
      const w4 = wip4[f] != null ? wip4[f] : null;
      const w15 = wip15[f] != null ? wip15[f] : null;
      return '<tr><td>' + esc(f) + '</td>' + numCell(a4) + numCell(w4) + deltaCell(a4, w4) +
        '<td class="right muted" title="' + L("fcNoAppTarget15") + '">' + dash + '</td>' + numCell(w15) + deltaCell(null, w15) + '</tr>';
    }).join("") : '<tr><td colspan="7" class="muted">' + L("fcNone") + '</td></tr>';
    const table = '<div class="card"><div class="tblwrap"><table class="sortable"><thead><tr>' +
      '<th>' + L("fcFlavor") + '</th><th class="right">' + L("fcApp4") + '</th><th class="right">' + L("fcWip4") + '</th><th class="right" data-nosort>' + L("fcDelta4") + '</th>' +
      '<th class="right">' + L("fcApp15") + '</th><th class="right">' + L("fcWip15") + '</th><th class="right" data-nosort>' + L("fcDelta15") + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    const head = '<div class="card"><h2>&#9878; ' + L("forecast") + '</h2><p class="hint">' + L("fcHint") + (sourceMonth ? ' ' + L("fcSnapshot") + ': ' + esc(sourceMonth) + '.' : '') + '</p></div>';
    return head + table;
  }
  function viewFacility() {
    return '<div class="card"><div class="suprow"><h2 style="flex:1;margin:0">' + L("facility") + '</h2>' +
      '<a class="ghost sm" href="facility.html?v=2" target="_blank" rel="noopener">' + L("facOpen") + ' &#8599;</a></div>' +
      '<p class="hint">' + L("facHint") + '</p>' +
      '<iframe src="facility.html?v=2" title="Smackin plant 3D twin" loading="lazy" style="width:100%;height:78vh;border:1px solid rgba(0,0,0,.12);border-radius:12px;background:#0b0f1a"></iframe></div>';
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
  function viewMaintenance() {
    const all = DB.maintenance().slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const active = all.filter(i => i.status !== "Done");
    const done = all.filter(i => i.status === "Done");
    const prRank = { "Urgent": 0, "High": 1, "Medium": 2, "Low": 3 };
    const activeSorted = active.slice().sort((a, b) => (prRank[a.priority] != null ? prRank[a.priority] : 2) - (prRank[b.priority] != null ? prRank[b.priority] : 2) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const doneSorted = done.slice().sort((a, b) => String(b.completed_date || "").localeCompare(String(a.completed_date || "")));
    const list = mtView === "done" ? doneSorted : activeSorted;
    const reqCount = all.filter(i => i.status === "Requested").length;
    const ipCount = all.filter(i => i.status === "In Progress").length;
    const waitCount = all.filter(i => i.status === "Waiting").length;
    const ed = mtEditId ? (all.find(x => String(x.id) === String(mtEditId)) || {}) : {};
    const editing = !!(mtEditId && ed.id);
    const av = x => esc(x == null ? "" : x);
    const sel = (arr, cur, def) => arr.map(t => '<option' + (t === (cur != null && cur !== "" ? cur : def) ? " selected" : "") + '>' + t + '</option>').join("");
    const toggle = '<div class="ordtabs">' +
      '<button class="' + (mtView === "active" ? "active" : "") + '" onclick="UI.mtView(\'active\')">' + L("mtActive") + ' (' + active.length + ')</button>' +
      '<button class="' + (mtView === "done" ? "active" : "") + '" onclick="UI.mtView(\'done\')">' + L("mtDone") + ' (' + done.length + ')</button></div>';
    const showForm = mtAddOpen || editing;
    const today = new Date().toISOString().slice(0, 10);
    const form = showForm ? ('<div class="ordform">' +
      (editing ? '<p class="hint">&#9998; ' + L("editingRow") + '</p>' : '') +
      '<div><label>' + L("mtTitle") + '</label><input id="mt-title" autocomplete="off" value="' + av(ed.title) + '" placeholder="' + L("mtTitleP") + '"></div>' +
      '<div class="row"><div><label>' + L("mtType") + '</label><select id="mt-type">' + sel(MNT_TYPES, ed.mtype, "Request") + '</select></div>' +
      '<div><label>' + L("mtArea") + '</label><select id="mt-area">' + sel(MNT_AREAS, ed.area, "Facility") + '</select></div>' +
      '<div><label>' + L("mtAssignee") + '</label><input id="mt-assignee" list="dl-mt-assignee" autocomplete="off" value="' + av(ed.assignee) + '"></div></div>' +
      '<div class="row"><div><label>' + L("mtPriority") + '</label><select id="mt-priority">' + sel(MNT_PRIORITIES, ed.priority, "Medium") + '</select></div>' +
      '<div><label>' + L("mtStatus") + '</label><select id="mt-status">' + sel(MNT_STATUSES, ed.status, "Requested") + '</select></div>' +
      '<div><label>' + L("mtOpened") + '</label><input id="mt-opened" type="date" value="' + (editing && ed.opened_date ? (ed.opened_date + "").slice(0, 10) : today) + '"></div></div>' +
      '<div class="row"><div><label>' + L("mtTarget") + '</label><input id="mt-target" type="date" value="' + (editing && ed.target_date ? (ed.target_date + "").slice(0, 10) : "") + '"></div>' +
      '<div><label>' + L("mtRequestedBy") + '</label><input id="mt-reqby" autocomplete="off" value="' + av(ed.requested_by) + '" placeholder="' + L("mtRequestedByP") + '"></div></div>' +
      '<div><label>' + L("mtProblem") + '</label><input id="mt-problem" autocomplete="off" value="' + av(ed.problem) + '" placeholder="' + L("mtProblemP") + '"></div>' +
      '<div><label>' + L("mtWaitingOn") + '</label><input id="mt-waitingon" autocomplete="off" value="' + av(ed.waiting_on) + '" placeholder="' + L("mtWaitingOnP") + '"></div>' +
      '<div><label>' + L("mtNotes") + '</label><input id="mt-notes" autocomplete="off" value="' + av(ed.notes) + '" placeholder="' + L("mtNotesP") + '"></div>' +
      opField("Troy") +
      '<button class="primary" onclick="UI.mtSave()">' + (editing ? L("saveChanges") : L("mtAdd")) + '</button> ' +
      '<button class="ghost" style="margin-top:14px" onclick="UI.' + (editing ? "mtEditCancel" : "mtAddToggle") + '()">' + L("ordCancel") + '</button></div>') : "";
    const assigneeDl = '<datalist id="dl-mt-assignee">' + MNT_ASSIGNEES.map(n => '<option value="' + n + '"></option>').join("") + '</datalist>';
    const mtP = p => p === "Urgent" ? "out" : p === "High" ? "low" : "";
    const mtSt = s => s === "Done" ? "ok" : s === "Waiting" ? "out" : s === "In Progress" ? "low" : "";
    const nextStatus = { "Requested": "In Progress", "In Progress": "Waiting", "Waiting": "Done" };
    const rows = list.length ? list.map(i => {
      const txt = ((i.title || "") + " " + (i.mtype || "") + " " + (i.area || "") + " " + (i.assignee || "") + " " + (i.status || "") + " " + (i.priority || "") + " " + (i.waiting_on || "") + " " + (i.requested_by || "")).toLowerCase().replace(/"/g, "");
      const nxt = nextStatus[i.status];
      const adv = nxt ? '<button class="ghost sm" onclick="UI.mtStatus(\'' + i.id + '\',\'' + nxt + '\')">' + esc(nxt) + '</button>'
        : (i.status === "Done" ? '<button class="ghost sm" onclick="UI.mtStatus(\'' + i.id + '\',\'In Progress\')">' + L("mtReopen") + '</button>' : '');
      const nameCell = '<td><b>' + esc(i.title || "") + '</b>' + (i.problem ? '<div class="muted sm">' + esc(i.problem) + '</div>' : '') + '</td>';
      const mid = mtView === "done"
        ? '<td class="muted sm">' + ((i.completed_date || "").slice(0, 10) || "&mdash;") + '</td>'
        : '<td><span class="pill ' + mtP(i.priority) + '">' + esc(i.priority || "") + '</span></td><td><span class="pill ' + mtSt(i.status) + '">' + esc(i.status || "") + '</span>' +
          (i.status === "Waiting" && i.waiting_on ? '<div class="sm" style="color:var(--red);font-weight:700;margin-top:2px">&#9203; ' + esc(i.waiting_on) + '</div>' : '') + '</td>';
      return '<tr data-txt="' + txt + '">' + nameCell +
        '<td><span class="tag">' + esc(i.mtype || "") + '</span></td>' +
        '<td class="sm">' + esc(i.area || "") + '</td>' +
        '<td class="muted sm">' + esc(i.assignee || "") + '</td>' + mid +
        '<td>' + adv + ' <button class="ghost sm" title="' + L("editRow") + '" onclick="UI.mtEdit(\'' + i.id + '\')">&#9998;</button> <button class="ghost sm danger" onclick="UI.mtDelete(\'' + i.id + '\')">&#10005;</button></td></tr>';
    }).join("") : '<tr><td colspan="' + (mtView === "done" ? 6 : 7) + '" class="muted">' + (mtView === "done" ? L("mtNoDone") : L("mtNoActive")) + '</td></tr>';
    const head = mtView === "done"
      ? '<tr><th>' + L("mtTitle") + '</th><th>' + L("mtType") + '</th><th>' + L("mtArea") + '</th><th>' + L("mtAssignee") + '</th><th>' + L("mtCompleted") + '</th><th data-nosort></th></tr>'
      : '<tr><th>' + L("mtTitle") + '</th><th>' + L("mtType") + '</th><th>' + L("mtArea") + '</th><th>' + L("mtAssignee") + '</th><th>' + L("mtPriority") + '</th><th>' + L("mtStatus") + '</th><th data-nosort></th></tr>';
    return assigneeDl + '<div class="card"><div class="suprow"><h2 style="margin:0">' + L("maintenance") + '</h2>' +
      '<button class="primary sm" onclick="UI.mtAddToggle()">' + L("mtAdd") + '</button></div>' +
      '<p class="hint">' + L("mtHint") + '</p>' +
      '<div class="kpis"><div class="kpi"><div class="n">' + reqCount + '</div><div class="l">' + L("mtKpiRequested") + '</div></div>' +
      '<div class="kpi"><div class="n">' + ipCount + '</div><div class="l">' + L("mtKpiInProgress") + '</div></div>' +
      '<div class="kpi alert"><div class="n">' + waitCount + '</div><div class="l">' + L("mtKpiWaiting") + '</div></div>' +
      '<div class="kpi ok"><div class="n">' + done.length + '</div><div class="l">' + L("mtKpiDone") + '</div></div></div>' +
      toggle + form +
      '<input id="mtSearch" autocomplete="off" style="margin-top:10px" oninput="UI.mtSearch(this.value)" placeholder="' + L("mtSearchP") + '">' +
      '<table class="sortable" style="margin-top:10px"><thead>' + head + '</thead><tbody id="mtBody">' + rows + '</tbody></table></div>';
  }
  function viewMixing() { return deptDemandBoard("mixing", false) + viewConsume("Mixing", "mixing"); }
  function viewPmac() { return deptDemandBoard("pmac", false) + viewConsume("P-Mac", "pmac"); }
  // ===== Now Running — live floor board (Mixing + P-Mac machines, operator-named, additive) =====
  const FLOOR_TILE_COLORS = ["#F4E1D2","#E8C9C9","#F0DDE0","#DCEBD7","#E3E0F2","#FBEFC5","#F6DDE7","#D9EEF2","#EAE3D0","#D7E8F0","#EDE0EA","#E0E7D9","#F3E5D0"];
  function floorColor(flavor) {
    const i = DMD_FLAVOR_ORDER.indexOf(flavor);
    return i >= 0 ? FLOOR_TILE_COLORS[i % FLOOR_TILE_COLORS.length] : "#ECECEC";
  }
  function floorAgo(iso) {
    if (!iso) return "";
    const ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms) || ms < 0) return L("flJustNow");
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return L("flJustNow");
    if (mins < 60) return mins + "m " + L("flAgo");
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h " + L("flAgo");
    const days = Math.floor(hrs / 24);
    return days + "d " + L("flAgo");
  }
  function floorTile(m) {
    const status = m.status || "idle";
    const flavor = m.flavor || "";
    const idle = status === "idle";
    const col = flavor ? floorColor(flavor) : "#F0F0F0";
    const pillClass = status === "running" ? "flpill-run" : status === "changeover" ? "flpill-chg" : "flpill-idle";
    const flavOpts = '<option value="">' + L("flNone") + '</option>' + DMD_FLAVOR_ORDER.map(f => '<option' + (f === flavor ? ' selected' : '') + '>' + esc(f) + '</option>').join("");
    const sizeOpts = ["4oz","1.5oz"].map(s => '<option' + (s === (m.size || "") ? ' selected' : '') + '>' + s + '</option>').join("");
    const statusBtn = (key, label) => '<button class="floorstatusbtn ' + key + (status === key ? ' on' : '') + '" onclick="UI.flSetStatus(\'' + m.id + '\',\'' + key + '\')">' + esc(label) + '</button>';
    return '<div class="floortile' + (idle ? ' idle' : '') + '">' +
      '<div class="floortilehead"><b class="floormachine">' + esc(m.machine) + '</b>' +
      '<button class="floorx" title="x" onclick="UI.flDelete(\'' + m.id + '\')">&#10005;</button></div>' +
      '<div class="floorflavor" style="background:' + col + '">' + (flavor ? esc(flavor) : L("flNone")) + (m.size ? ' <span class="floorsize">' + esc(m.size) + '</span>' : '') + '</div>' +
      '<div class="floorpillrow"><span class="pill big ' + pillClass + '">' + L(status === "running" ? "flRunning" : status === "changeover" ? "flChangeover" : "flIdle") + '</span></div>' +
      '<div class="muted sm floormeta">' + L("flUpdated") + ' ' + floorAgo(m.updated_at) + (m.updated_by ? ' &middot; ' + esc(m.updated_by) : '') + '</div>' +
      '<div class="muted sm floorsensor">&mdash; ' + L("flSensor") + '</div>' +
      '<div class="floorcontrols">' +
      '<select onchange="UI.flSetFlavor(\'' + m.id + '\',this.value)">' + flavOpts + '</select>' +
      '<select onchange="UI.flSetSize(\'' + m.id + '\',this.value)"><option value="">' + L("flSize") + '</option>' + sizeOpts + '</select>' +
      '<div class="floorstatusbtns">' + statusBtn("running", L("flRunning")) + statusBtn("changeover", L("flChangeover")) + statusBtn("idle", L("flIdle")) + '</div>' +
      '</div></div>';
  }
  function floorSection(area, title, opDefault) {
    const list = (DB.lineStatus ? DB.lineStatus() : []).filter(r => r.area === area).slice().sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
    const tiles = list.length ? '<div class="floorgrid">' + list.map(floorTile).join("") + '</div>'
      : '<p class="muted">' + L("flNoMachines") + '</p>';
    return '<div class="card"><div class="suprow"><h2 class="sub2" style="flex:1;margin:0">' + esc(title) + '</h2>' + opFieldFor("fl-op-" + area, opDefault) + '</div>' +
      tiles +
      '<button class="ghost sm" style="margin-top:10px" onclick="UI.flAdd(\'' + area + '\')">' + L("flAddMachine") + '</button></div>';
  }
  function viewFloor() {
    return '<div class="card"><h2>' + L("floor") + '</h2><p class="hint">' + L("floorHint") + '</p></div>' +
      floorSection("mixing", L("mixing"), "Leo") +
      floorSection("pmac", L("pmac"), "Jesus");
  }
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
      (DB.mode === "local" ? '<button class="ghost" onclick="UI.reset()">' + L("reset") + '</button>' : "") + '</div>' +
      '<div class="card"><h2 class="sub2">' + L("backupTitle") + '</h2><p class="hint">' + L("backupHint") + '</p>' +
      '<button class="primary" onclick="UI.exportBackup()">&#11015; ' + L("backupBtn") + '</button></div>';
  }

  // ---------- actions ----------
  
  // ===== Board Mode (TV department boards) — additive, bilingual EN/ES, auto-refresh =====
  let boardDept = "";
  let boardDataTimer = null, boardClockTimer = null, boardLastRefresh = 0;
  const BOARD_DEPTS = ["mixing", "pmac", "ful"];
  const BOARD_TXT = {
    mixing: { en: "MIXING", es: "MEZCLA" }, pmac: { en: "P-MAC", es: "EMPAQUE" }, ful: { en: "FULFILLMENT", es: "CUMPLIMIENTO" },
    makeNow: { en: "MAKE NOW", es: "HACER AHORA" }, today: { en: "TODAY", es: "HOY" },
    target: { en: "TARGET", es: "META" }, done: { en: "DONE", es: "HECHO" }, toGo: { en: "TO GO", es: "FALTA" },
    shift1: { en: "SHIFT 1", es: "TURNO 1" }, shift2: { en: "SHIFT 2", es: "TURNO 2" },
    stock: { en: "STOCK ON HAND", es: "INVENTARIO" }, orders: { en: "ORDER", es: "PEDIDO" }, stockDriver: { en: "STOCK", es: "REPOSICION" },
    updated: { en: "Updated", es: "Actualizado" }, agoWord: { en: "ago", es: "hace" },
    running: { en: "RUNNING", es: "CORRIENDO" }, idle: { en: "IDLE", es: "INACTIVA" }, changeover: { en: "CHANGEOVER", es: "CAMBIO" },
    nextUp: { en: "NEXT UP", es: "SIGUIENTE" }, noFilm: { en: "LOW FILM", es: "POCA PELICULA" },
    bags: { en: "BAGS", es: "BOLSAS" }, cases: { en: "CASES", es: "CAJAS" },
    allCovered: { en: "ALL COVERED", es: "TODO CUBIERTO" }, exit: { en: "Exit", es: "Salir" },
    pickTitle: { en: "Board Mode - pick a department", es: "Modo Pizarra - elija un departamento" },
    pickHint: { en: "Open this on the TV and pick a department, or bookmark the URL (example: ?board=pmac).", es: "Abra esto en la TV y elija un departamento, o guarde el URL (ejemplo: ?board=pmac)." }
  };
  function bt(key) { const t = BOARD_TXT[key] || { en: key, es: key }; return '<span class="bt-en">' + esc(t.en) + '</span><span class="bt-es">' + esc(t.es) + '</span>'; }
  function boardStartTimers() {
    if (!boardDataTimer) boardDataTimer = setInterval(() => { if (active === "board") { boardLastRefresh = Date.now(); render(); } else boardStopTimers(); }, 30000);
    if (!boardClockTimer) boardClockTimer = setInterval(boardTickClock, 1000);
  }
  function boardStopTimers() {
    if (boardDataTimer) { clearInterval(boardDataTimer); boardDataTimer = null; }
    if (boardClockTimer) { clearInterval(boardClockTimer); boardClockTimer = null; }
  }
  function boardTickClock() {
    const c = $("boardClock"); if (c) c.textContent = new Date().toLocaleTimeString();
    const a = $("boardAgo"); if (a) { const s = Math.max(0, Math.round((Date.now() - boardLastRefresh) / 1000)); a.innerHTML = bt("updated") + " " + s + "s " + bt("agoWord"); }
  }
  function boardChip(kind) { const c = kind === "covered" ? "#00A341" : kind === "blocked" ? "#B52024" : "#F2C61E"; return '<span class="boardchip" style="background:' + c + '"></span>'; }
  function boardData(dept) {
    const isFul = dept === "ful";
    const today = dqToday();
    const P = v => isFul ? v.cases : v.bags;
    const bn = computeBuildNeed("buildnow");
    const tgt = isFul ? bn.T.toProduceCases : bn.T.toProduceBags;
    const shifts = isFul ? 1 : 2;
    const doneToday = P(dqProdSum(today, dept, null));
    const s1 = shifts > 1 ? P(dqProdSum(today, dept, 1)) : null;
    const s2 = shifts > 1 ? P(dqProdSum(today, dept, 2)) : null;
    const pct = tgt > 0 ? Math.round(doneToday / tgt * 100) : (doneToday > 0 ? 100 : 0);
    const out = DB.productionOutput ? DB.productionOutput() : [];
    const rows = bn.list.filter(x => x.toProduce > 0).slice(0, 5).map(x => {
      const produced = out.filter(r => r.prod_date === today && r.dept === dept && r.flavor === x.flavor).reduce((a, r) => a + (isFul ? (Number(r.cases) || 0) : (Number(r.bags) || 0)), 0);
      const qty = isFul ? x.toProduce : x.toProduceBags;
      const rpct = qty > 0 ? Math.min(100, Math.round(produced / qty * 100)) : 0;
      return { flavor: x.flavor, code: x.code, qty: qty, driver: x.driver, kind: x.kind, pct: rpct };
    });
    const goalMap = {};
    SB_ITEMS.forEach(i => { if (i.cat === "Target" || i.cat === "Master Case") goalMap[i.name] = (goalMap[i.name] || 0) + i.goal; });
    const stock = DMD_FLAVOR_ORDER.filter(f => goalMap[f] != null).map(f => {
      const onHand = demandOnHandCases(f);
      const goal = goalMap[f] || 0;
      const st = onHand <= 0 ? "red" : onHand < goal ? "amber" : "green";
      return { flavor: f, onHand: onHand, goal: goal, st: st };
    });
    let machines = null;
    if (dept === "pmac" || dept === "mixing") {
      machines = (DB.lineStatus ? DB.lineStatus() : []).filter(r => r.area === dept).slice().sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)).map(m => {
        const match = bn.list.find(x => x.flavor === m.flavor);
        const target = match ? match.toProduceBags : 0;
        const produced = out.filter(r => r.prod_date === today && r.dept === dept && r.flavor === m.flavor).reduce((a, r) => a + (Number(r.bags) || 0), 0);
        const pctM = target > 0 ? Math.min(100, Math.round(produced / target * 100)) : 0;
        return Object.assign({}, m, { target: target, produced: produced, pct: pctM });
      });
    }
    const runningFlavors = new Set((machines || []).filter(m => m.status === "running").map(m => m.flavor));
    const nextUp = bn.list.filter(x => x.toProduce > 0 && !runningFlavors.has(x.flavor))[0] || null;
    return { dept: dept, today: today, unit: isFul ? "cases" : "bags", tgt: tgt, doneToday: doneToday, pct: pct, shifts: shifts, s1: s1, s2: s2, rows: rows, stock: stock, machines: machines, nextUp: nextUp };
  }
  function boardMakeNowRows(dept, rows) {
    if (!rows.length) return '<div class="board-allcovered">&#10003; ' + bt("allCovered") + '</div>';
    const unitKey = dept === "ful" ? "cases" : "bags";
    return rows.map((x, i) => {
      const driverTxt = x.driver === "order" ? bt("orders") : bt("stockDriver");
      return '<div class="boardrow"><div class="boardrank">' + (i + 1) + '</div>' +
        '<div class="boardflavor">' + boardChip(x.kind) + '<span class="boardflavname">' + esc(x.flavor) + '</span></div>' +
        '<div class="boardqty">' + fmt(x.qty) + '<span class="boardqtyunit">' + bt(unitKey) + '</span></div>' +
        '<div class="boardtag">' + driverTxt + (x.kind === "blocked" ? '<span class="boardwarn">' + bt("noFilm") + '</span>' : '') + '</div>' +
        '<div class="boardbarwrap"><div class="boardbar" style="width:' + x.pct + '%"></div></div></div>';
    }).join("");
  }
  function boardMachineTiles(machines, nextUp) {
    if (!machines || !machines.length) return '<p class="board-nomachines">' + bt("idle") + '</p>';
    const tiles = '<div class="boardmachinegrid">' + machines.map(m => {
      const st = m.status || "idle";
      const stLbl = st === "running" ? bt("running") : st === "changeover" ? bt("changeover") : bt("idle");
      const body = st === "running" ? ('<div class="machineqty">' + fmt(m.produced) + ' / ' + fmt(m.target) + ' ' + bt("bags") + '</div>' +
        '<div class="boardbarwrap sm"><div class="boardbar" style="width:' + Math.min(100, m.pct) + '%"></div></div>') : '';
      return '<div class="machinetile ' + st + '"><div class="machinename">' + esc(m.machine) + '</div>' +
        '<div class="machineflavor">' + (m.flavor ? esc(m.flavor) : '&mdash;') + '</div>' +
        '<div class="machinestatus">' + stLbl + '</div>' + body + '</div>';
    }).join("") + '</div>';
    const next = nextUp ? '<div class="boardnextup">' + bt("nextUp") + ': <b>' + esc(nextUp.flavor) + '</b> &middot; ' + fmt(nextUp.toProduceBags) + ' ' + bt("bags") + '</div>' : '';
    return tiles + next;
  }
  function boardTodayZone(data) {
    const shiftHtml = data.shifts > 1 ?
      '<div class="boardshiftrow"><div class="boardshift"><div class="boardshiftlabel">' + bt("shift1") + '</div><div class="boardshiftval">' + fmt(data.s1) + '</div></div>' +
      '<div class="boardshift"><div class="boardshiftlabel">' + bt("shift2") + '</div><div class="boardshiftval">' + fmt(data.s2) + '</div></div></div>' : '';
    return '<div class="boardtoday"><div class="boardherolabel">' + bt("target") + '</div>' +
      '<div class="boardhero">' + fmt(data.tgt) + '</div><div class="boardherounit">' + bt(data.unit) + '</div>' +
      '<div class="boardbarwrap lg"><div class="boardbar" style="width:' + Math.min(100, data.pct) + '%"></div></div>' +
      '<div class="boardtodaystats"><span>' + fmt(data.doneToday) + ' ' + bt("done") + '</span><span>' + data.pct + '%</span><span>' + fmt(Math.max(0, data.tgt - data.doneToday)) + ' ' + bt("toGo") + '</span></div>' +
      shiftHtml + '</div>';
  }
  function boardStockStrip(stock) {
    return '<div class="boardstockstrip">' + stock.map(s => {
      const col = s.st === "red" ? "#B52024" : s.st === "amber" ? "#F2C61E" : "#00A341";
      return '<div class="boardstocktile" style="border-color:' + col + '"><div class="boardstockdot" style="background:' + col + '"></div>' +
        '<div class="boardstockname">' + esc(s.flavor) + '</div><div class="boardstockqty">' + fmt(s.onHand) + '</div></div>';
    }).join("") + '</div>';
  }
  function boardHeader(dept) {
    const t = BOARD_TXT[dept] || { en: dept, es: dept };
    return '<div class="boardheader"><div class="boarddept"><span class="bt-en">' + esc(t.en) + '</span><span class="bt-es">' + esc(t.es) + '</span></div>' +
      '<div class="boardhdrright"><div class="boardclock" id="boardClock">' + new Date().toLocaleTimeString() + '</div>' +
      '<div class="boardago" id="boardAgo">' + bt("updated") + ' 0s ' + bt("agoWord") + '</div>' +
      '<button class="boardexit" onclick="UI.boardExit()">&times; ' + bt("exit") + '</button></div></div>';
  }
  function boardPicker() {
    const row = BOARD_DEPTS.map(d => '<button class="boardpickbtn" onclick="UI.boardOpen(&#39;' + d + '&#39;)">' + bt(d) + '</button>').join("");
    return '<div class="boardpicker"><div class="boardpicktitle">' + bt("pickTitle") + '</div>' +
      '<div class="boardpickrow">' + row + '</div>' +
      '<p class="boardpickhint">' + bt("pickHint") + '</p></div>';
  }
  function boardHtml(dept) {
    const data = boardData(dept);
    const makeZone = dept === "pmac" ? boardMachineTiles(data.machines, data.nextUp) : boardMakeNowRows(dept, data.rows);
    return '<div class="boardwrap board-' + dept + '">' + boardHeader(dept) +
      '<div class="boardzones"><div class="board-make"><div class="boardzonelabel">' + bt("makeNow") + '</div>' + makeZone + '</div>' +
      '<div class="board-side"><div class="boardzonelabel">' + bt("today") + '</div>' + boardTodayZone(data) + '</div></div>' +
      '<div class="board-stockzone"><div class="boardzonelabel sm">' + bt("stock") + '</div>' + boardStockStrip(data.stock) + '</div></div>';
  }
  function viewBoard() {
    const q = (function () { try { return new URLSearchParams(location.search).get("board") || ""; } catch (e) { return ""; } })();
    const dept = boardDept || q;
    if (!dept || BOARD_DEPTS.indexOf(dept) < 0) return boardPicker();
    boardDept = dept;
    return boardHtml(dept);
  }


  const UI = {
    cat(c) { catFilter = c; render(); },
    ecChartMode(k) { ecChartMode = k; render(); },
    // ---- Demand section ----
    dmdSet(k, v) { if (k === "partner") dmdPartner = v; else if (k === "flavor") dmdFlavor = v; else if (k === "status") dmdStatus = v; render(); },
    dmdDept(d) { dmdDept = d; render(); },
    async prodLog(dept) {
      const isFul = dept === "ful";
      const shiftEl = $("pl-shift"); const shift = shiftEl ? Number(shiftEl.value) : 1;
      const flavor = ($("pl-flavor") ? $("pl-flavor").value : "") || "";
      const bags = isFul ? 0 : Number(($("pl-bags") ? $("pl-bags").value : 0) || 0);
      const cases = isFul ? Number(($("pl-cases") ? $("pl-cases").value : 0) || 0) : 0;
      if (!bags && !cases) return toast(L("dqEnterQty"));
      const r = await DB.addProdOutput({ prod_date: new Date().toISOString().slice(0, 10), dept, shift, flavor, bags, cases }, opVal());
      if (r && r.ok === false) return toast(r.msg || "error");
      toast("✓"); render();
    },
    async prodDel(id) { await DB.deleteProdOutput(id, opVal()); toast("✓"); render(); },
    // ---- Now Running floor board ----
    async flAdd(area) {
      const name = prompt(L("flMachineNamePrompt"));
      if (!name || !name.trim()) return;
      const op = opValFor("fl-op-" + area);
      const r = await DB.addMachine({ area, machine: name.trim() }, op);
      if (r && r.ok === false) return toast(r.msg || "error");
      toast("✓"); render();
    },
    async flSetFlavor(id, val) {
      const m = (DB.lineStatus ? DB.lineStatus() : []).find(r => String(r.id) === String(id));
      const op = opValFor("fl-op-" + (m ? m.area : "mixing"));
      await DB.setLineStatus(id, { flavor: val }, op); toast("✓"); render();
    },
    async flSetSize(id, val) {
      const m = (DB.lineStatus ? DB.lineStatus() : []).find(r => String(r.id) === String(id));
      const op = opValFor("fl-op-" + (m ? m.area : "mixing"));
      await DB.setLineStatus(id, { size: val }, op); toast("✓"); render();
    },
    async flSetStatus(id, val) {
      const m = (DB.lineStatus ? DB.lineStatus() : []).find(r => String(r.id) === String(id));
      const op = opValFor("fl-op-" + (m ? m.area : "mixing"));
      await DB.setLineStatus(id, { status: val }, op); toast("✓"); render();
    },
    async flDelete(id) {
      if (!confirm(L("flDeleteConfirm"))) return;
      const m = (DB.lineStatus ? DB.lineStatus() : []).find(r => String(r.id) === String(id));
      const op = opValFor("fl-op-" + (m ? m.area : "mixing"));
      await DB.deleteMachine(id, op); toast("✓"); render();
    },
    async dmShip(source, po) {
      if (!confirm(L("dmShipQ") + "\n\n" + source + " " + po)) return;
      const r = await DB.shipDemandPO(source, po, opVal());
      toast(po + " → " + L("dmShipped") + (r && r.count ? " (" + r.count + ")" : "")); render();
    },
    diFiles(input) {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      if (!window.DEMAND) { toast("parser not loaded"); return; }
      const readOne = f => new Promise(res => { const fr = new FileReader(); fr.onload = () => res({ name: f.name, text: String(fr.result || "") }); fr.onerror = () => res({ name: f.name, text: "" }); fr.readAsText(f); });
      Promise.all(files.map(readOne)).then(loaded => {
        const D = window.DEMAND; let sps = [], shipiq = { byPO: {} }; const fileInfo = []; const warnings = [];
        loaded.forEach(fo => {
          const type = D.detectType(fo.text);
          if (type === "shipiq") { const r = D.parseShipIQ(fo.text); Object.assign(shipiq.byPO, r.byPO); fileInfo.push({ name: fo.name, type: "ShipIQ", count: Object.keys(r.byPO).length }); (r.warnings || []).forEach(w => warnings.push(fo.name + ": " + w)); }
          else if (type === "sps") { const r = D.parseSPS(fo.text); sps = sps.concat(r.lines); fileInfo.push({ name: fo.name, type: "SPS", count: r.lines.length }); (r.warnings || []).forEach(w => warnings.push(fo.name + ": " + w)); }
          else { fileInfo.push({ name: fo.name, type: "unknown", count: 0 }); }
        });
        const agg = D.aggregate(sps, shipiq);
        dmdParsed = { rows: agg, warnings, recon: agg._recon || [], files: fileInfo };
        render();
      });
    },
    async diCommit() {
      if (!dmdParsed || !dmdParsed.rows.length || dmdBusy) return;
      dmdBusy = true; render();
      const label = (($("dmd-label") || {}).value || "").trim() || new Date().toISOString().slice(0, 10);
      const rows = dmdParsed.rows.map(r => ({ source: r.source, partner: r.partner, po: r.po, dc: (r.dcs || []).join(","), flavor: r.flavor, flavor_code: r.flavor_code, uom: r.uom, qty: r.qty, cases: r.cases, bags: r.bags, unit_price: r.unit_price, due_date: r.due_date, load: r.load || "" }));
      const res = await DB.importDemand(rows, { batch_label: label }, opVal());
      dmdBusy = false; dmdParsed = null;
      toast((res && res.count ? res.count : rows.length) + " " + L("diCommitted")); go("demand");
    },
    async diClearAll() {
      if (!confirm(L("diConfirmClear"))) return;
      await DB.clearAllDemand(opVal()); dmdParsed = null; toast("✓"); render();
    },
    ecFiles(input) {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!window.ECOM) { toast("e-com parser not loaded"); return; }
      const fr = new FileReader();
      fr.onload = () => {
        const text = String(fr.result || "");
        if (window.ECOM.detectType(text) !== "shipstation") { ecParsed = { error: L("ecdNotCsv"), totals: {}, unmapped: [] }; render(); return; }
        const days = Number(($("ec-days") || {}).value) || 14;
        const r = window.ECOM.parseShipStation(text);
        ecParsed = { totals: r.totals, unmapped: r.unmapped, periodDays: days, fileName: f.name };
        render();
      };
      fr.onerror = () => { ecParsed = { error: L("ecdNotCsv"), totals: {}, unmapped: [] }; render(); };
      fr.readAsText(f);
    },
    ecRecalc() {
      if (!ecParsed || ecParsed.error) return;
      ecParsed.periodDays = Number(($("ec-days") || {}).value) || 14;
      render();
    },
    async ecCommit() {
      if (!ecParsed || ecParsed.error || ecBusy) return;
      const days = ecParsed.periodDays || 14;
      const label = (($("ec-label") || {}).value || "").trim() || (ecParsed.fileName || new Date().toISOString().slice(0, 10));
      const rows = [];
      Object.keys(ecParsed.totals).forEach(flavor => {
        const t = ecParsed.totals[flavor];
        ["4oz", "1.5oz"].forEach(size => {
          const bags = t[size] || 0;
          if (bags > 0) rows.push({ flavor, size, bags, avg_day: Math.round((bags / days) * 100) / 100 });
        });
      });
      if (!rows.length) return;
      ecBusy = true; render();
      const res = await DB.addEcomDemand(rows, { period_days: days, source_label: label }, opVal());
      ecBusy = false; ecParsed = null;
      if (res && res.ok === false) { toast(res.msg || "error"); render(); return; }
      toast((res && res.count ? res.count : rows.length) + " " + L("ecdLoaded")); render();
    },
    async ecClearAll() {
      if (!confirm(L("ecdConfirmClear"))) return;
      await DB.clearEcomDemand(opVal()); ecParsed = null; toast("✓"); render();
    },
    locView(v) { locView = v; locSel = null; locAct = ""; render(); },
    locPick(code) { locSel = code || null; locAct = ""; render(); },
    locActStart(mode) { locAct = mode; render(); },
    locActCancel() { locAct = ""; render(); },
    async locMoveGo(code) {
      const id = ($("lm-item") || {}).value; const dest = (($("lm-dest") || {}).value || "").trim().toUpperCase();
      const q = parseFloat(($("lm-qty") || {}).value);
      const it = DB.items().find(i => String(i.id) === String(id));
      if (!it) return toast(L("notfound")); if (!dest) return toast(L("lmDest")); if (!(q > 0)) return toast(L("enter"));
      if (typeof BLOCKED_SLOTS !== "undefined" && BLOCKED_SLOTS.has && BLOCKED_SLOTS.has(dest)) return toast(dest + " " + L("locBlocked"));
      const r = await DB.move(it, code, dest, q, opVal()); if (r && r.ok === false) return toast(r.msg || "error");
      locAct = ""; toast(it.name + ": " + code + " → " + dest); render();
    },
    async locSetGo(code) {
      const id = ($("lq-item") || {}).value; const q = parseFloat(($("lq-qty") || {}).value);
      const it = DB.items().find(i => String(i.id) === String(id));
      if (!it) return toast(L("notfound")); if (!(q >= 0)) return toast(L("enter"));
      await DB.adjust(it, code, q, opVal());
      locAct = ""; toast(L("saved") + " ✓"); render();
    },
    async locAssignGo(code) {
      const id = ($("la-item") || {}).value; const q = parseFloat(($("la-qty") || {}).value);
      const it = DB.items().find(i => String(i.id) === String(id));
      if (!it) return toast(L("notfound")); if (!(q > 0)) return toast(L("enter"));
      const cur = DB.atLoc ? DB.atLoc(it.id, code) : 0;
      await DB.adjust(it, code, (Number(cur) || 0) + q, opVal());
      locAct = ""; toast(it.name + " → " + code); render();
    },
    async locEmpty(code) {
      const occ = locOccupancy(); const e = occ[code]; if (!e || !e.items.length) return;
      if (!confirm(L("lmClearConfirm") + " " + code + "?")) return;
      // Move stock to STAGING (never zero it) so total inventory is preserved when a location is cleared.
      for (const x of e.items) { const it = DB.items().find(i => String(i.id) === String(x.id)); if (it) await DB.move(it, code, "STAGING", Number(x.qty) || 0, opVal()); }
      toast(code + " → STAGING"); render();
    },
    lookup(inId, outId) { const o = $(outId); if (!o) return; const v = $(inId).value.trim();
      if (!v) { o.innerHTML = ""; return; } const it = DB.itemByCode(v);
      if (it) { o.className = "found"; o.innerHTML = "&#10003; " + L("found") + ": <b>" + it.name + "</b> &middot; " + L("onhand") + " " + fmt(DB.onHand(it.id)) + " " + it.unit; }
      else { o.className = "found notfound"; o.innerHTML = "&#10007; " + L("notfound"); } },
    recvToggleNew() { recvNewItem = !recvNewItem; render(); },
    async receive() {
      const v = id => { const e = $(id); return e ? (e.value || "") : ""; };
      // Capture ALL form values FIRST — DB.createItem() re-renders the form (emit) and would wipe these.
      const q = parseFloat(v("r-qty")); const lot = v("r-lot").trim();
      const loc = v("r-loc").trim().toUpperCase();
      const meta = { supplier: v("r-sup"), invoice: v("r-inv").trim(), category: v("r-cat"),
        pallets: v("r-pal"), condition: v("r-cond") || "Good", status: v("r-stat") || "Received", location: loc || "" };
      const op = $("op") ? $("op").value : opVal();
      const newCode = recvNewItem ? v("r-newcode").trim() : "";
      const newName = recvNewItem ? v("r-newname").trim() : "";
      const newCat = recvNewItem ? v("r-newcat") : "";
      const newUnit = recvNewItem ? (v("r-newunit").trim() || "ea") : "";
      const scanCode = v("r-code");
      if (!(q > 0)) return toast(L("enter"));
      if (loc && !validLoc(loc)) return toast(L("badloc"));
      if (loc && BLOCKED_SLOTS.has(loc)) return toast("⛔ " + L("locBlocked"));
      let it;
      if (recvNewItem) {
        if (!newCode || !newName) return toast(L("rniNeed"));
        const cr = await DB.createItem({ code: newCode, name: newName, category: newCat, unit: newUnit }, op);
        if (cr.ok === false) return toast(cr.msg || "error");
        it = cr.item;
      } else {
        it = DB.itemByCode(scanCode);
      }
      if (!it) return toast(L("notfound"));
      const r = await DB.receive(it, q, lot, op, meta);
      puSec = ""; puBay = ""; puLevel = ""; recvNewItem = false;
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
    // ---- Retail Production: Quick Case Log — +1/+N finished master case, logged straight to today's Daily Production (prodPallets) ----
    qcPick(v) { qcFlavor = v || ""; render(); },
    async qcAdd(fixedQty) {
      const code = (($("qc-flavor") || {}).value || qcFlavor || "");
      const f = PROD_FMAP[code];
      if (!f) return toast(L("qcPickFirst"));
      const q = fixedQty != null ? fixedQty : (parseFloat(($("qc-qty") || {}).value) || 0);
      if (!(q > 0)) return toast(L("enter"));
      const today = new Date().toISOString().slice(0, 10);
      const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const r = await DB.addProdPallet({ prod_date: today, channel: "retail", line: "", flavor_code: code, cases: q, log_time: t, notes: "Quick log" }, opVal());
      if (r && r.ok === false) return toast(r.msg || "error");
      qcFlavor = code;
      toast(L("qcAdded") + ": " + f.name + " +" + fmt(q));
      render();
    },
    async qcScan() { await UI.cam("qc-scan-in"); },
    qcScanResolve(v) {
      v = (v || "").trim(); if (!v) return;
      const vl = v.toLowerCase();
      const hit = PROD_FLAVORS.find(f => f.code.toLowerCase() === vl) ||
        PROD_FLAVORS.find(f => vl.indexOf(f.code.toLowerCase()) !== -1) ||
        PROD_FLAVORS.find(f => vl.indexOf(f.name.toLowerCase()) !== -1);
      if (hit) { qcFlavor = hit.code; toast(hit.name); render(); } else { toast(L("qcNotFound")); }
    },
    // 4x6 thermal identifier label (one per PAGE, sized for the Munbyn 4x6) for EVERY item.
    // Big name + big barcode + code = the pallet "product identifier". Always current.
    printIdent4x6() {
      const w = window.open("", "_blank"); if (!w) return toast("Popup blocked - allow popups");
      const SEC = { seed:"Seeds / Raw", seasoning:"Seasoning", film4:"Film 4oz", film15:"Film 1.5oz", mastercase:"Master Case", packaging:"Packaging", bucket:"Buckets", display:"Displays", supply:"Supplies", bag4:"Finished Bags 4oz", bag15:"Finished Bags 1.5oz" };
      const items = DB.items().slice().sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
      const pages = items.map(i => {
        const code = i.code || i.id;
        return '<div class="lbl"><div class="hd">SMACKIN\' SNACKS</div>' +
          '<div class="nm">' + esc(i.name) + '</div>' +
          '<div class="sec">' + esc(SEC[i.category] || i.category || "") + '</div>' +
          '<svg class="bc" data-code="' + esc(code) + '"></svg>' +
          '<div class="cd">' + esc(code) + '</div></div>';
      }).join("");
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>4x6 Item Identifier Labels</title>' +
        '<scr' + 'ipt src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr' + 'ipt>' +
        '<style>' +
        '@page{size:4in 6in;margin:0}' +
        'html,body{margin:0;padding:0;font-family:Arial}' +
        '.bar{background:#1F3864;color:#fff;padding:10px 14px;font-size:13px}.bar b{font-size:15px}.bar ol{margin:6px 0 0 18px;padding:0;line-height:1.5}.btn{display:inline-block;margin-top:8px;background:#fff;color:#1F3864;border:0;border-radius:6px;padding:7px 14px;font-weight:bold;cursor:pointer}' +
        '.lbl{width:4in;height:6in;box-sizing:border-box;padding:0.28in 0.25in;page-break-after:always;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center}' +
        '.hd{font-size:15px;font-weight:bold;letter-spacing:1px;color:#1F3864}' +
        '.nm{font-size:30px;font-weight:bold;line-height:1.05;margin:10px 0 4px}' +
        '.sec{font-size:15px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}' +
        '.bc{width:3.4in;height:1.3in;margin:6px 0}' +
        '.cd{font-size:26px;font-weight:bold;letter-spacing:2px;color:#111}' +
        '@media print{.bar{display:none}}' +
        '</style></head><body>' +
        '<div class="bar"><b>4x6 Item Identifier Labels (' + items.length + ')</b>' +
        '<ol><li>Load the 4x6 label roll (Munbyn).</li><li>Click Print (or Ctrl+P), pick the Munbyn printer.</li><li>Set paper size 4x6, Margins: None, Scale: 100%.</li><li>Print all, or just the page range you need (each item = one label).</li></ol>' +
        '<button class="btn" onclick="window.print()">&#128424; Print now</button></div>' +
        pages +
        '<scr' + 'ipt>window.onload=function(){document.querySelectorAll(".bc").forEach(function(s){try{JsBarcode(s,s.getAttribute("data-code"),{format:"CODE128",displayValue:false,height:90,margin:0});}catch(e){}});};</scr' + 'ipt>' +
        '</body></html>');
      w.document.close();
      toast(L("ident4x6Done") + " (" + items.length + ")");
    },
    // Digital 4x6 Batch Label (RD Batch Label 4x6.xlsx layout): RECIPE / DATE / CHEF,
    // filled in from the form above and printed 1-up at true 4x6 for the Munbyn roll.
    printBatchLabel() {
      const recipe = ($("batch-recipe") ? $("batch-recipe").value : "").trim();
      const date = $("batch-date") ? $("batch-date").value : "";
      const chef = ($("batch-chef") ? $("batch-chef").value : "").trim();
      if (!recipe) return toast(L("batchRecipe") + "?");
      const w = window.open("", "_blank"); if (!w) return toast("Popup blocked - allow popups");
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Batch Label 4x6</title>' +
        '<style>' +
        '@page{size:4in 6in;margin:0}' +
        'html,body{margin:0;padding:0;font-family:Arial}' +
        '.bar{background:#1F3864;color:#fff;padding:10px 14px;font-size:13px}.bar b{font-size:15px}' +
        '.btn{display:inline-block;margin-top:8px;background:#fff;color:#1F3864;border:0;border-radius:6px;padding:7px 14px;font-weight:bold;cursor:pointer}' +
        '.lbl{width:4in;height:6in;box-sizing:border-box;padding:0.12in;page-break-after:always;display:grid;grid-template-columns:18% 10% 72%;grid-template-rows:29.7% 20.3% 29.7% 20.3%;border:2px solid #000}' +
        '.cell{border:1px solid #000;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;padding:4px;box-sizing:border-box;word-break:break-word}' +
        '.cap{background:#e8e8e8;font-weight:bold;font-size:15px;letter-spacing:1px}' +
        '.val{font-size:24px;font-weight:bold}' +
        '.recipecap{background:#e8e8e8;font-weight:bold;font-size:15px;letter-spacing:2px}' +
        '.recipeval{font-size:38px;font-weight:bold;line-height:1.1}' +
        '@media print{.bar{display:none}}' +
        '</style></head><body>' +
        '<div class="bar"><b>Batch Label (4x6)</b> &mdash; Load the 4x6 roll (Munbyn), click Print, set paper 4x6, Margins None, Scale 100%.<br>' +
        '<button class="btn" onclick="window.print()">&#128424; Print now</button></div>' +
        '<div class="lbl">' +
        '<div class="cell val" style="grid-column:1;grid-row:1">' + esc(date) + '</div>' +
        '<div class="cell cap" style="grid-column:1;grid-row:2">DATE</div>' +
        '<div class="cell val" style="grid-column:1;grid-row:3">' + esc(chef) + '</div>' +
        '<div class="cell cap" style="grid-column:1;grid-row:4">CHEF</div>' +
        '<div class="cell recipecap" style="grid-column:2;grid-row:1/5">RECIPE</div>' +
        '<div class="cell recipeval" style="grid-column:3;grid-row:1/5">' + esc(recipe) + '</div>' +
        '</div>' +
        '</body></html>');
      w.document.close();
      toast(L("batchLabelDone"));
    },
    // Avery 5160 sticker sheet (30/sheet, 3 x 10, label 2.625in x 1in) for EVERY current item.
    // Exact grid so it prints perfectly onto the physical Avery 5160 sheets. Always current.
    printAvery5160() {
      const w = window.open("", "_blank"); if (!w) return toast("Popup blocked - allow popups");
      const items = DB.items().slice().sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));
      const cells = items.map(i => {
        const code = i.code || i.id;
        return '<div class="lbl"><div class="nm">' + esc(i.name) + '</div><svg class="bc" data-code="' + esc(code) + '"></svg><div class="cd">' + esc(code) + '</div></div>';
      }).join("");
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Avery 5160 - Smackin Item Labels</title>' +
        '<scr' + 'ipt src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr' + 'ipt>' +
        '<style>' +
        '@page{size:8.5in 11in;margin:0}' +
        'html,body{margin:0;padding:0;font-family:Arial}' +
        '.bar{background:#1F3864;color:#fff;padding:10px 16px;font-size:14px}' +
        '.bar b{font-size:15px}.bar ol{margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.5}' +
        '.btn{display:inline-block;margin-top:8px;background:#fff;color:#1F3864;border:0;border-radius:6px;padding:7px 14px;font-weight:bold;cursor:pointer}' +
        '.sheet{box-sizing:border-box;width:8.5in;padding:0.5in 0.1875in 0 0.1875in}' +
        '.lbl{box-sizing:border-box;float:left;width:2.625in;height:1in;padding:0.05in 0.1in 0;overflow:hidden;text-align:center}' +
        '.lbl:nth-child(3n+1),.lbl:nth-child(3n+2){margin-right:0.125in}' +
        '.lbl:nth-child(3n+1){clear:left}' +
        '.nm{font-size:10px;font-weight:bold;line-height:1.05;max-height:0.28in;overflow:hidden}' +
        '.bc{width:100%;height:0.42in;margin:1px 0}' +
        '.cd{font-size:8px;color:#333;letter-spacing:.3px}' +
        '@media print{.bar{display:none}}' +
        '</style></head><body>' +
        '<div class="bar"><b>Avery 5160 &mdash; Smackin\' Item Labels (' + items.length + ' labels)</b>' +
        '<ol><li>Load the Avery 5160 sheets into the printer.</li>' +
        '<li>Click <b>Print</b> below (or Ctrl+P).</li>' +
        '<li>In the print dialog set <b>Margins: None</b> and <b>Scale: 100%</b> (turn OFF &ldquo;Fit to page&rdquo;).</li>' +
        '<li>Print. Each label lines up with a sticker.</li></ol>' +
        '<button class="btn" onclick="window.print()">&#128424; Print now</button></div>' +
        '<div class="sheet">' + cells + '</div>' +
        '<scr' + 'ipt>window.onload=function(){document.querySelectorAll(".bc").forEach(function(s){try{JsBarcode(s,s.getAttribute("data-code"),{format:"CODE128",displayValue:false,height:30,margin:0});}catch(e){}});};</scr' + 'ipt>' +
        '</body></html>');
      w.document.close();
      toast(L("averyDone") + " (" + items.length + ")");
    },
    // Receiving-label book for EVERY current item — pulls live from the item master so it is
    // never stale (adding an item automatically shows up here). Barcode + fill-in receiving form.
    printRecvBook() {
      const w = window.open("", "_blank"); if (!w) return toast("Popup blocked - allow popups");
      const SEC = { seed:"Seeds & Base", seasoning:"Seasoning", film4:"Film 4oz", film15:"Film 1.5oz", mastercase:"Sleeves & Master Case", packaging:"Packaging & Boxes", bucket:"Buckets & Lids", display:"Displays", supply:"Supplies", bag4:"Finished Bags 4oz", bag15:"Finished Bags 1.5oz" };
      const ORDER = ["seed","seasoning","film4","film15","mastercase","packaging","bucket","display","supply","bag4","bag15"];
      const items = DB.items();
      let body = "";
      const seen = {};
      ORDER.forEach(cat => {
        const list = items.filter(i => i.category === cat).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (!list.length) return;
        list.forEach(i => seen[i.id] = 1);
        body += '<h2 class="sec">' + esc(SEC[cat] || cat) + ' <span class="ct">' + list.length + ' items</span></h2><div class="grp">';
        list.forEach(i => {
          const code = i.code || i.id; const unit = i.unit || "";
          body += '<div class="lbl"><div class="hd">SMACKIN\' &middot; Receiving Label</div>' +
            '<div class="nm">' + esc(i.name) + '</div><div class="cd">' + esc(code) + '  &middot;  ' + esc(SEC[cat] || cat) + '</div>' +
            '<svg class="bc" data-code="' + esc(code) + '"></svg>' +
            '<div class="fld">Date: __________   Lot #: __________</div>' +
            '<div class="fld">Qty: __________ ' + esc(unit) + '   Pallet: ___ of ___</div>' +
            '<div class="fld">Expires: __________</div>' +
            '<div class="fld">Condition:  [ ] Good   [ ] Defective &ndash; Hold</div></div>';
        });
        body += '</div>';
      });
      // any item whose category is not in ORDER (safety: never drop anything)
      const rest = items.filter(i => !seen[i.id]);
      if (rest.length) {
        body += '<h2 class="sec">Other <span class="ct">' + rest.length + ' items</span></h2><div class="grp">';
        rest.forEach(i => { const code = i.code || i.id; body += '<div class="lbl"><div class="hd">SMACKIN\' &middot; Receiving Label</div><div class="nm">' + esc(i.name) + '</div><div class="cd">' + esc(code) + '</div><svg class="bc" data-code="' + esc(code) + '"></svg><div class="fld">Date: __________   Lot #: __________</div><div class="fld">Qty: __________ ' + esc(i.unit || "") + '   Pallet: ___ of ___</div><div class="fld">Condition:  [ ] Good   [ ] Defective &ndash; Hold</div></div>'; });
        body += '</div>';
      }
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Smackin Receiving Labels - All Items</title>' +
        '<scr' + 'ipt src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr' + 'ipt>' +
        '<style>body{font-family:Arial;margin:0;color:#04223B}h2.sec{background:#1F3864;color:#fff;padding:6px 12px;font-size:15px;margin:14px 0 0}h2.sec .ct{font-weight:normal;font-size:11px;opacity:.85}.grp{display:flex;flex-wrap:wrap;padding:6px}.lbl{border:1px solid #bbb;border-radius:8px;padding:8px 10px;margin:6px;width:3.6in;box-sizing:border-box;page-break-inside:avoid}.hd{font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;letter-spacing:.5px}.nm{font-size:14px;font-weight:bold;margin:2px 0}.cd{font-size:11px;color:#555;margin-bottom:3px}.bc{width:100%;height:46px}.fld{font-size:11px;margin:2px 0}@media print{h2.sec{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>' +
        '<div style="padding:8px 12px"><b>SMACKIN\' Receiving Labels &mdash; All Items (' + items.length + ')</b> &nbsp; ' + new Date().toLocaleDateString() + '</div>' +
        body +
        '<scr' + 'ipt>window.onload=function(){document.querySelectorAll(".bc").forEach(function(s){try{JsBarcode(s,s.getAttribute("data-code"),{format:"CODE128",displayValue:true,fontSize:9,height:40,margin:2});}catch(e){}});setTimeout(function(){window.print();},1000);};</scr' + 'ipt>' +
        '</body></html>');
      w.document.close();
      toast(L("recvBookDone") + " (" + items.length + ")");
    },
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
    exportBackup() {
      const T = {}; const g = (k, fn) => { try { T[k] = fn() || []; } catch (e) { T[k] = []; } };
      g("items", () => DB.items()); g("suppliers", () => DB.suppliers()); g("stock", () => DB.stock());
      g("log", () => DB.log()); g("purchaseOrders", () => DB.purchaseOrders()); g("orders", () => DB.orders());
      g("supplierPos", () => DB.supplierPos()); g("orderDocs", () => DB.orderDocs()); g("rdRequests", () => DB.rdRequests());
      g("consumption", () => DB.consumption()); g("seasLots", () => DB.seasLots()); g("seedLots", () => DB.seedLots());
      g("shippingLog", () => DB.shippingLog()); g("receivingLog", () => DB.receivingLog()); g("improvements", () => DB.improvements());
      g("referenceDocs", () => DB.referenceDocs()); g("demandLines", () => DB.demandLines()); g("returnsLog", () => DB.returnsLog());
      try { T.stockBuild = DB.stockBuild(); } catch (e) { T.stockBuild = {}; }
      const payload = { app: "Smackin OS", exported_at: new Date().toISOString(), mode: DB.mode, tables: T };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "smackin-os-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      toast(L("backupDone"));
    },
    // ---- Returns ----
    retMode(m) { retMode = m; render(); },
    retKitToggle() {
      const on = $("ret-kit") && $("ret-kit").checked;
      [["ret-kitsku", ""], ["ret-explode-wrap", ""], ["ret-kithint", ""]].forEach(([id]) => { const e = $(id); if (e) e.style.display = on ? "" : "none"; });
    },
    async delReturn(id) { if (!confirm(L("rDelConfirm"))) return; await DB.deleteReturn(id, opVal()); toast("✓"); render(); },
    async doReturn() {
      const it = DB.itemByCode(($("ret-code") || {}).value); const q = parseFloat(($("ret-qty") || {}).value);
      const isKit = $("ret-kit") && $("ret-kit").checked;
      const kitsku = isKit ? (($("ret-kitsku") || {}).value || "").trim() : "";
      if (!isKit && !it) return toast(L("notfound"));
      if (isKit && !kitsku) return toast(L("rNeedKitSku"));
      if (!(q > 0)) return toast(L("enter"));
      const disp = ($("ret-disp") || {}).value; const restock = (disp === "Restock");
      const rec = {
        channel: retMode, return_date: ($("ret-date") || {}).value || new Date().toISOString().slice(0, 10),
        item_code: it ? it.code : "", product: it ? it.name : kitsku, qty: q,
        tracking: (($("ret-track") || {}).value || "").trim(), reason: ($("ret-reason") || {}).value,
        disposition: disp, is_kit: isKit, kit_sku: kitsku, restocked: restock
      };
      if (retMode === "ecom") {
        rec.marketplace = ($("ret-mkt") || {}).value; rec.shipment_id = (($("ret-ship") || {}).value || "").trim();
        rec.ship_address = (($("ret-addr") || {}).value || "").trim(); rec.upc = (($("ret-upc") || {}).value || "").trim();
        const pc = (($("ret-prod") || {}).value || "").trim(); if (!rec.product || rec.product === kitsku) rec.product = rec.product || pc; if (!rec.item_code) rec.item_code = pc;
      } else {
        rec.customer = (($("ret-cust") || {}).value || "").trim(); rec.add_upc = (($("ret-addupc") || {}).value || "").trim();
      }
      // duplicate prevention
      let res = await DB.addReturn(rec, opVal());
      if (res && res.dup) {
        const ex = res.existing || {};
        if (!confirm(L("rDupWarn") + "\n\n" + (ex.return_date || "") + " · " + (ex.received_by || "") + " · " + (ex.product || ex.item_code || "") + "\n\n" + L("rDupOverride"))) return toast(L("rDupSkip"));
        res = await DB.addReturn(rec, opVal(), true);
      }
      if (!res || !res.ok) return toast("error");
      // restock inventory
      let msg = "";
      if (restock) {
        if (isKit && $("ret-explode") && $("ret-explode").checked && window.KITS) {
          const comps = KITS.explode(kitsku); const meta = KITS.meta(kitsku) || {};
          const prefix = (String(meta.size || "").indexOf("1.5") >= 0) ? "B15-" : "B4-";
          if (comps) { for (const c of comps) { const bi = DB.itemByCode(prefix + c.code); if (bi) await DB.returnStock(bi, c.qty * q, opVal(), { reason: "Kit return", disposition: "Restock" }); } msg = " · " + comps.length + " " + L("rFlavorsRestocked"); }
          else return toast(L("rUnknownKit"));
        } else if (it) {
          await DB.returnStock(it, q, opVal(), { reason: rec.reason, disposition: "Restock" });
        }
      }
      toast(L("submitReturn") + " ✓" + msg); render();
    },
    // ---- Seasoning lots ----
    seasEdit(id) { seasEditId = id; render(); window.scrollTo(0, 0); },
    seasEditCancel() { seasEditId = null; render(); },
    async addSeasLot() {
      const pv = ($("sl-prod").value || "").split("|"); const wt = parseFloat($("sl-wt").value);
      if (!pv[0]) return toast(L("notfound")); if (!(wt > 0)) return toast(L("enter"));
      const rec = { flavor_code: pv[0], product: pv[1] || pv[0], lot: ($("sl-lot").value || "").trim(),
        manufacturer: ($("sl-mfr").value || "").trim(), exp: $("sl-exp").value || null, weight: wt,
        location: (($("sl-loc") || {}).value || "").trim() };
      if (seasEditId) { await DB.updateSeasLot(seasEditId, rec, $("op").value); seasEditId = null; toast(L("saved") + " ✓"); render(); return; }
      await DB.addSeasLot(rec, $("op").value);
      toast(L("addLot") + " ✓"); go("seasoning");
    },
    async seasStatus(id, status) { await DB.setSeasLotStatus(id, status, opVal()); toast(status); },
    async quarExpired() { const n = await DB.quarantineExpiredSeas(opVal()); toast(n ? n + " -> " + L("quarTag") : L("allgood")); },
    seedEdit(id) { seedEditId = id; render(); window.scrollTo(0, 0); },
    seedEditCancel() { seedEditId = null; render(); },
    seedCalcWt() { const pk = SEED_PACK_MAP[($("sd-pack") || {}).value]; const pl = parseFloat(($("sd-pallets") || {}).value) || 0;
      if (pk && pl > 0 && $("sd-wt")) $("sd-wt").value = Math.round(pk.per * pl); },
    async addSeedLot() {
      const tv = (($("sd-type") || {}).value || "").split("|"); const wt = parseFloat(($("sd-wt") || {}).value);
      if (!tv[0]) return toast(L("notfound")); if (!(wt > 0)) return toast(L("enter"));
      const rec = { seed_code: tv[0], product: tv[1] || tv[0], lot: (($("sd-lot") || {}).value || "").trim(),
        supplier: ($("sd-sup") || {}).value || "", received_date: ($("sd-rec") || {}).value || null, weight: wt,
        internal_code: (($("sd-icode") || {}).value || "").trim(), packaged_date: ($("sd-pdate") || {}).value || null,
        pallets: ($("sd-pallets") || {}).value || 0, packaging: ($("sd-pack") || {}).value || "" };
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
    // ---- Maintenance ----
    mtView(v) { mtView = v; render(); },
    mtAddToggle() { mtAddOpen = !mtAddOpen; mtEditId = null; render(); },
    mtEdit(id) { mtEditId = id; mtAddOpen = false; render(); window.scrollTo(0, 0); },
    mtEditCancel() { mtEditId = null; render(); },
    mtSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#mtBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    async mtSave() {
      const v = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const title = v("mt-title"); if (!title) return toast(L("mtTitle"));
      const by = opVal();
      const rec = { title: title, mtype: v("mt-type"), area: v("mt-area"), assignee: v("mt-assignee"),
        priority: v("mt-priority"), status: v("mt-status"), opened_date: v("mt-opened"), target_date: v("mt-target"),
        problem: v("mt-problem"), waiting_on: v("mt-waitingon"), notes: v("mt-notes"), requested_by: v("mt-reqby") };
      if (mtEditId) { await DB.updateMaintenance(mtEditId, rec, by); mtEditId = null; toast(L("saved") + " ✓"); }
      else { await DB.addMaintenance(rec, by); mtAddOpen = false; toast(L("mtAdded")); }
      render();
    },
    async mtStatus(id, status) { await DB.setMaintenanceStatus(id, status, opVal()); toast(status + " ✓"); render(); },
    async mtDelete(id) { if (!confirm(L("mtConfirmDel"))) return; await DB.deleteMaintenance(id, opVal()); toast("✓"); render(); },
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
    spoOpen(id) { spoDetailId = id; render(); window.scrollTo(0, 0); },
    spoCloseDetail() { spoDetailId = null; poEmailOpen = false; render(); },
    // ---- Email PO (Supplier PO -> vendor) ----
    poEmailFromList(id) { spoDetailId = id; poEmailOpen = true; render(); window.scrollTo(0, 0); },
    poEmailToggle() { poEmailOpen = !poEmailOpen; render(); },
    poEmailCancel() { poEmailOpen = false; render(); },
    poEmailCopy() {
      const s = DB.supplierPos().find(x => String(x.id) === String(spoDetailId)); if (!s) return;
      const text = ($("po-em-body") ? $("po-em-body").value : "") || poSummaryText(s);
      const done = () => toast(L("poEmailCopied"));
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
    },
    async poEmailSend() {
      const s = DB.supplierPos().find(x => String(x.id) === String(spoDetailId)); if (!s) return;
      const to = ($("po-em-to") ? $("po-em-to").value : "").trim();
      const subject = ($("po-em-subj") ? $("po-em-subj").value : "").trim();
      const body = ($("po-em-body") ? $("po-em-body").value : "");
      if (!to) return toast(L("poEmailNeedTo"));
      toast(L("poEmailSending"));
      const html = '<div style="font-family:Arial,sans-serif;color:#222;white-space:pre-wrap">' + esc(body).replace(/\n/g, "<br>") + '</div>';
      const res = await DB.emailPO(s, { to: to, subject: subject, html: html }, opVal());
      if (res.ok) { toast(L("poEmailOk")); poEmailOpen = false; render(); return; }
      // Graceful fallback: open a prefilled mailto so the send is still one click away.
      const mailto = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
      toast(res.msg === "not-configured" ? L("poEmailNo") : L("poEmailFail"));
    },
    refPick(input) { refFiles = input.files && input.files.length ? input.files : null; render(); },
    refClear() { refFiles = null; render(); },
    async refSave() {
      if (!refFiles || !refFiles.length) return toast(L("refNoFile"));
      const cat = ($("ref-cat") || {}).value || "Other"; const notes = (($("ref-notes") || {}).value || "").trim();
      const by = ($("op") || {}).value || "Troy";
      let ok = 0, err = "";
      for (const f of refFiles) {
        const r = await DB.createRefDoc({ title: f.name.replace(/\.[^.]+$/, ""), category: cat, notes: notes }, f, by);
        if (r && r.ok) ok++; else err = (r && r.msg) || "error";
      }
      refFiles = null; toast(ok + " " + L("refSaved") + (err ? " - " + err : "")); render();
    },
    async refDelete(id) { if (!confirm(L("refConfirmDel"))) return; await DB.deleteRefDoc(id, opVal()); toast(L("spoDelete") + " ✓"); },
    refSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#refBody .odcust").forEach(el => { const t = el.getAttribute("data-txt") || ""; el.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    // ---- Create PO (Excel-style entry form) ----
    poCreateOpen() { spoView = "create"; poRows = 4; render(); },
    poCreateBack() { spoView = "list"; render(); },
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
    purchView(v) { purchView = v; render(); },
    plDate(v) { plDate = v; render(); },
    async plDay(field, val) { const today = new Date().toISOString().slice(0, 10); const r = await DB.setProdDay(plDate || today, "retail", { [field]: val }, opVal()); if (r && r.ok === false) return toast(r.msg || "error"); render(); },
    async plAdd() {
      const g = id => { const e = $(id); return e ? (e.value || "").trim() : ""; };
      const cases = g("pl-cases"); if (!cases || Number(cases) <= 0) return toast(L("plNeedCases"));
      const now = new Date(); const hh = now.getHours(), mm = String(now.getMinutes()).padStart(2, "0");
      const t = ((hh % 12) || 12) + ":" + mm + " " + (hh < 12 ? "AM" : "PM");
      const today = new Date().toISOString().slice(0, 10);
      const rec = { prod_date: plDate || today, channel: "retail", line: g("pl-line") || "1", flavor_code: g("pl-flavor"), cases: cases, log_time: t, notes: g("pl-notes") };
      const r = await DB.addProdPallet(rec, opVal()); if (r && r.ok === false) return toast(r.msg || "error");
      toast(L("plAdded")); render();
    },
    async plDel(id) { const r = await DB.deleteProdPallet(id, opVal()); if (r && r.ok === false) return toast(r.msg || "error"); render(); },
    // ---- Daily Fulfillment tracker ----
    fdSetDate(v) { fdDate = v; fdDraft = null; render(); },
    fdEcomAddRow() { const d = fdEnsureDraft(); d.ecom.push({ employee: "", labels: "" }); render(); },
    fdEcomSet(idx, field, val) { const d = fdEnsureDraft(); if (d.ecom[idx]) d.ecom[idx][field] = val; render(); },
    fdEcomRemove(idx) { const d = fdEnsureDraft(); d.ecom.splice(idx, 1); if (!d.ecom.length) d.ecom.push({ employee: "", labels: "" }); render(); },
    fdAmzAddRow() { const d = fdEnsureDraft(); d.amazon.push({ sku: "", units: "", bagsPerUnit: "", custom: false }); render(); },
    fdAmzSku(idx, val) {
      const d = fdEnsureDraft(); const r = d.amazon[idx]; if (!r) return;
      if (val === "__custom__") { r.custom = true; r.sku = ""; if (!r.bagsPerUnit) r.bagsPerUnit = 1; }
      else { r.custom = false; r.sku = val; r.bagsPerUnit = AMZ_SKU_BAGS[val] !== undefined ? AMZ_SKU_BAGS[val] : 1; }
      render();
    },
    fdAmzSet(idx, field, val) { const d = fdEnsureDraft(); if (d.amazon[idx]) d.amazon[idx][field] = val; render(); },
    fdAmzRemove(idx) { const d = fdEnsureDraft(); d.amazon.splice(idx, 1); if (!d.amazon.length) d.amazon.push({ sku: "", units: "", bagsPerUnit: "", custom: false }); render(); },
    fdNotesSet(val) { const d = fdEnsureDraft(); d.notes = val; },
    async fdSave() {
      const d = fdEnsureDraft();
      const ecom = d.ecom.filter(r => r.employee || Number(r.labels) > 0).map(r => ({ employee: r.employee || "", labels: Number(r.labels) || 0 }));
      const amazon = d.amazon.filter(r => r.sku || Number(r.units) > 0).map(r => {
        const bpu = (r.bagsPerUnit !== "" && r.bagsPerUnit != null) ? (Number(r.bagsPerUnit) || 0) : (AMZ_SKU_BAGS[r.sku] != null ? AMZ_SKU_BAGS[r.sku] : 1);
        const units = Number(r.units) || 0;
        return { sku: r.sku || "", units: units, bags: units * bpu };
      });
      const res = await DB.saveFulfillmentDaily({ fdate: d.date, ecom_labels: ecom, amazon: amazon, notes: d.notes }, opVal());
      if (res && res.ok === false) return toast(res.msg || "error");
      fdDraft = null; toast(L("fdSaved")); render();
    },
    async fdDeleteDay(id) { if (!confirm(L("fdDeleteConfirm"))) return; await DB.deleteFulfillmentDaily(id, opVal()); fdDraft = null; toast(L("spoDelete") + " ✓"); render(); },
    purchSetupCat(c) { purchSetupCat = c; render(); },
    rsSearch(val) { const q = (val || "").toLowerCase().trim();
      document.querySelectorAll("#rsBody tr").forEach(tr => { const t = tr.getAttribute("data-txt") || ""; tr.style.display = (!q || t.indexOf(q) >= 0) ? "" : "none"; }); },
    async itemReorder(id, val) { const r = await DB.updateItemFields(id, { reorder: val }, opVal()); if (r && r.ok === false) return toast(r.msg || "error"); toast(L("rsSaved")); },
    async itemSupplier(id, val) { const r = await DB.updateItemFields(id, { supplier: val }, opVal()); if (r && r.ok === false) return toast(r.msg || "error"); toast(L("rsSaved")); },
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
      else if (kind === "batch") {
        const today = new Date().toISOString().slice(0, 10);
        area.innerHTML = '<div class="card" style="margin-top:10px"><h3 class="sub2">' + L("batchLabelBtn") + '</h3>' +
          '<p class="hint">' + L("batchLabelHint") + '</p>' +
          '<div class="row"><div><label>' + L("batchRecipe") + '</label><input id="batch-recipe" autocomplete="off" placeholder="' + L("batchRecipe") + '"></div>' +
          '<div><label>' + L("batchDate") + '</label><input id="batch-date" type="date" value="' + today + '"></div></div>' +
          '<div class="row"><div><label>' + L("batchChef") + '</label><input id="batch-chef" autocomplete="off" placeholder="' + L("batchChef") + '"></div></div>' +
          '<button class="primary" onclick="UI.printBatchLabel()">&#128424; ' + L("batchPrint") + '</button></div>';
        return;
      }
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
    setLang,
    boardOpen(d) { boardDept = d; try { const u = new URL(location.href); u.searchParams.set("board", d); history.replaceState(null, "", u.pathname + u.search); } catch (e) {} render(); },
    boardExit() { boardDept = ""; boardStopTimers(); try { const u = new URL(location.href); u.searchParams.delete("board"); history.replaceState(null, "", u.pathname + (u.search || "")); } catch (e) {} go("home"); }
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
    const map = { home: viewHome, dash: viewDash, analytics: viewAnalytics, alerts: viewAlerts, adjust: viewAdjust, receive: viewReceive, putaway: viewPut, returns: viewReturns, orders: viewOrders, rd: viewRD, qa: viewQA,
      move: viewMove, produce: viewProduce, retailprod: viewRetailProd, ecomprod: viewEcomProd, prodlog: viewProdLog, fulfilldaily: viewFulfillDaily, stockbuild: viewStockBuild, seasoning: viewSeasoning, seed: viewSeed, skus: viewSkus, finbags: viewFinishedBags, pmacout: viewPmacOut, mixing: viewMixing, pmac: viewPmac,
      count: viewCount, locations: viewLocations, purchasing: viewPurchasing, supplierpos: viewSupplierPos, orderdocs: viewOrderDocs, shiplog: viewShippingLog, recvlog: viewReceivingLog, people: viewPeople, improve: viewImprove, maintenance: viewMaintenance, compliance: viewCompliance, reference: viewReference, labels: viewLabels, log: viewLog, settings: viewSettings,
      demand: viewDemand, demandboard: viewDemandBoard, demandsched: viewDemandSched, demandimport: viewDemandImport, ecomdemand: viewEcomDemand, forecast: viewForecastVsTarget, facility: viewFacility, floor: viewFloor, board: viewBoard, disposition: viewDisposition };
    $("view").innerHTML = (map[active] || viewHome)();
    $("modeBadge").textContent = DB.mode === "cloud" ? L("cloud") : L("localmode");
    $("modeBadge").className = "modebadge " + (DB.mode === "cloud" ? "ok" : "low");
    try { wireSortable(); } catch (e) {}
    drawIcons();
    document.body.classList.toggle("boardmode", active === "board");
    if (active === "board") { boardLastRefresh = Date.now(); boardStartTimers(); } else { boardStopTimers(); }
  }

  // ---------- boot ----------
  window.addEventListener("DOMContentLoaded", async () => {
    try { const bp = new URLSearchParams(location.search).get("board"); if (bp) { active = "board"; boardDept = bp; } } catch (e) {}
    $("lang-en").onclick = () => setLang("en");
    $("lang-es").onclick = () => setLang("es");
    if ($("lang-pt")) $("lang-pt").onclick = () => setLang("pt");
    if ($("navToggle")) $("navToggle").onclick = () => { const n = $("nav"), b = $("navBackdrop"); const open = !n.classList.contains("open"); n.classList.toggle("open", open); if (b) b.classList.toggle("show", open); };
    if ($("navBackdrop")) $("navBackdrop").onclick = closeDrawer;
    await DB.init();
    if (!ordersSeen) markOrdersSeen(); // first run: existing orders are not "new"
    DB.onChange(render);
    render();
    if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("service-worker.js"); } catch (e) {} }
  });
})();

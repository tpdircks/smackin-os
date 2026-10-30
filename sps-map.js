/* ============================================================================
   Smackin' OS — SPS Commerce document map (sps-map.js)
   Pure mapping for Transaction API v5 JSON (850 / 856 / 810). No network.
   Used by the browser feed and by the sps-sync Edge Function.
   ========================================================================== */
(function (root) {
  "use strict";

  var PARTNERS = {
    "614ALLSMACKINSU": "McLane",
    "614CCPSMACKINSU": "McLane",
    "BPRALLSMACKINSU": "Scheels"
  };
  var FLAVOR_CODES = {
    "OG Original": "S01", "Cinnamon Churro": "S02", "Backyard BBQ": "S03", "Garlic Parmesan": "S04",
    "Dill Pickle": "S05", "Cracked Pepper": "S06", "Cheddar Jalapeno": "S07", "Ranch": "S08",
    "Maple Brown Sugar": "S09", "Lemon Pepper": "S10", "Sour Cream & Onion": "S11",
    "Cheeseburger": "L25", "PCA Pizza": "L20", "Variety Pack": "VP48"
  };
  // Same description rules as demand.js. GRL / PRM are whole words. ORIG stays last so it cannot steal a flavor above.
  // cleanFlavorText drops a stored UNMAPPED prefix, pack sizes (4Z / 4OZ), and brand/seed noise
  // (SMACKIN, SNFL, SNFLWR, SDS, SD) before these rules run.
  var DESC_RULES = [
    [/cinnamon|churro/i, "Cinnamon Churro"],
    [/garlic|parm|\bgrlc\b|prmsn|\bgrl\b|\bprm\b/i, "Garlic Parmesan"],
    [/backyard|bbq|barbe|\bbyrd\b/i, "Backyard BBQ"],
    [/dill|pickle|\bdll\b|\bpckl\b/i, "Dill Pickle"],
    [/crack|\bcrck\b|black pepper|\bcrckd\b|\bcrk\b|\bpeppr\b/i, "Cracked Pepper"],
    [/cheddar|jalap|\bchd\b|\bched\b|\bchdr\b|\bjala?\b|\bjlp\b/i, "Cheddar Jalapeno"],
    [/ranch|\brnch\b/i, "Ranch"],
    [/maple|brown sugar|\bmple\b|\bbrwn sug/i, "Maple Brown Sugar"],
    [/lemon/i, "Lemon Pepper"],
    [/sour cream|onion|s&o|sco/i, "Sour Cream & Onion"],
    [/cheeseburger/i, "Cheeseburger"],
    [/pizza|deep dish|pca/i, "PCA Pizza"],
    [/4\s*-?\s*var|variety/i, "Variety Pack"],
    [/original|\bog\b|\borig\b/i, "OG Original"]
  ];
  var BAGS_PER_CASE = 72;
  var VARIETY_4PACK = ["Cinnamon Churro", "Garlic Parmesan", "Cheddar Jalapeno", "Backyard BBQ"];
  var BAGS_PER_VARIETY = 12;
  var DOC_LABEL = { "850": "850 Purchase Order", "855": "855 Order Ack", "856": "856 Ship Notice", "810": "810 Invoice" };
  var FLAG_LABEL = {
    total_x100: "Invoice total is 100× the line sum. The line sum was stored.",
    total_mismatch: "Invoice total does not equal the line sum. The line sum was stored.",
    overship: "Shipped quantity is above the ordered quantity.",
    invoice_qty_mismatch: "Invoice quantity does not equal the shipped quantity.",
    price_mismatch: "Invoice price does not equal the order price.",
    uom_mismatch: "Quantity units differ, so those quantities were not compared.",
    rejected: "810 file has no line items or no summary."
  };

  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : null;
  }
  function digits(v) { return String(v == null ? "" : v).replace(/\D/g, ""); }
  function pad12(d) {
    if (!d) return "";
    if (d.length > 12) d = d.replace(/^0+/, "");
    if (d.length < 12) return d.padStart(12, "0");
    if (d.length === 12) return d;
    return d.slice(-12);
  }
  // GTIN: strip leading zeros, then pad to 12 so it matches a UPC. ConsumerPackageCode wins when present.
  function normUpc(gtin, consumer) {
    if (consumer != null && String(consumer).trim() !== "") return pad12(digits(consumer));
    return pad12(digits(gtin).replace(/^0+/, ""));
  }
  function cleanPartner(p) {
    p = String(p || "").trim();
    if (/mclane/i.test(p)) return "McLane";
    if (/scheels/i.test(p)) return "Scheels";
    if (/target/i.test(p)) return "Target";
    if (/kehe/i.test(p)) return "KeHE";
    if (/walmart/i.test(p)) return "Walmart";
    return p;
  }
  function partnerFromId(id, shipToName) {
    var key = String(id || "").trim().toUpperCase();
    if (PARTNERS[key]) return PARTNERS[key];
    var named = cleanPartner(shipToName);
    return named || String(id || "").trim();
  }
  function addr(list, code) {
    var rows = Array.isArray(list) ? list : [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].AddressTypeCode || "").toUpperCase() === code) return rows[i];
    }
    return null;
  }
  function addrView(row) {
    if (!row) return null;
    return { name: String(row.AddressName || "").trim(), location: String(row.AddressLocationNumber || "").trim() };
  }
  function dateByQual(dates, qual) {
    var rows = Array.isArray(dates) ? dates : [];
    for (var i = 0; i < rows.length; i++) {
      var q = String(rows[i].DateTimeQualifier == null ? "" : rows[i].DateTimeQualifier);
      if (q === qual || q.padStart(3, "0") === qual) return String(rows[i].Date || rows[i].DateTime || "");
    }
    return "";
  }
  // Same cleaner as demand.js cleanFlavorText. Keep the two copies in step.
  function cleanFlavorText(s) {
    var t = String(s || "");
    t = t.replace(/^(?:unmapped:\s*)+/i, "");
    t = t.replace(/['\u2019]/g, "");
    t = t.replace(/\b\d+(?:\.\d+)?\s*(?:oz|z)\b/ig, " ");
    t = t.replace(/\b(?:smackin|smackn|sunflower|sunflwr|snflwr|seeds|snfl|seed|sds|sd)\b/ig, " ");
    t = t.replace(/[._\-\/]+/g, " ").replace(/\s+/g, " ").trim();
    return t;
  }
  function flavorFromDesc(desc) {
    var d = cleanFlavorText(desc);
    for (var i = 0; i < DESC_RULES.length; i++) if (DESC_RULES[i][0].test(d)) return DESC_RULES[i][1];
    return "";
  }
  function isVarietyFourPack(desc) { return /4\s*-?\s*var/i.test(String(desc || "")); }
  function lineDesc(li) {
    var d = li && li.ProductOrItemDescription;
    if (Array.isArray(d) && d[0] && d[0].ProductDescription) return String(d[0].ProductDescription);
    var n = li && li.Notes;
    if (Array.isArray(n) && n[0] && n[0].Note) return String(n[0].Note);
    return "";
  }
  function retailOf(li) {
    var rows = (li && li.PriceInformation) || [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].PriceTypeIDCode || "").toUpperCase() === "RTL") return num(rows[i].UnitPrice);
    }
    return null;
  }
  function packOf(li) {
    var rows = li && li.PhysicalDetails;
    if (Array.isArray(rows) && rows[0] && rows[0].PackValue != null) return num(rows[0].PackValue);
    return null;
  }
  function joinNotes(notes) {
    if (!Array.isArray(notes)) return "";
    return notes.map(function (n) { return n && n.Note ? String(n.Note).trim() : ""; }).filter(Boolean).join(" ");
  }
  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) return "";
    return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function mdY(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || "");
    return m[2].replace(/^0/, "") + "/" + m[3].replace(/^0/, "") + "/" + m[1];
  }
  function addDays(iso, days) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m || days == null) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    d.setUTCDate(d.getUTCDate() + Number(days));
    return d.toISOString().slice(0, 10);
  }
  function near(a, b, tol) { return a != null && b != null && Math.abs(Number(a) - Number(b)) <= (tol == null ? 0.01 : tol); }
  function uniq(list) {
    var seen = {}; var out = [];
    (list || []).forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  // X12 810 TDS01 (Summary.TotalAmount) is N2: two implied decimal places.
  // McLane files arrive as that integer (641448 means $6,414.48) while
  // InvoiceLine.PurchasePrice is already dollars. Scale only when the raw
  // value is the line sum times 100. A total that already matches the lines,
  // or that matches neither, is left unchanged so a real mismatch still flags.
  // 850 TotalAmount is a different element and is already in dollars.
  function decode810Total(raw, lineSum) {
    if (raw == null || raw === "") return null;
    var n = num(raw);
    if (n == null) return null;
    var scaled = round2(n / 100);
    if (lineSum != null && !near(n, lineSum) && near(scaled, lineSum)) return scaled;
    return n;
  }

  // Fulfillment UI statuses verified 2026-10-30 on commerce.spscommerce.com/fulfillment
  // (Troy Dircks / SMACKIN' Sunflower Seeds). Saved is an outbound draft. Accepted
  // means the partner accepted it. There is no "Sent" status. Workflow Done shows
  // the Order document as Complete.
  var DOC_STATUS = {
    "accepted": "Accepted",
    "accepted manually": "Accepted Manually",
    "cancelled": "Cancelled",
    "canceled": "Cancelled",
    "changed": "Changed",
    "complete": "Complete",
    "done": "Complete",
    "error": "Error",
    "in transit": "In Transit",
    "new": "New",
    "not accepted": "Not Accepted",
    "open": "Open",
    "partially accepted": "Partially Accepted",
    "preview": "Preview",
    "rejected": "Rejected",
    "saved": "Saved",
    "template": "Template"
  };
  function canonDocStatus(v) {
    var s = String(v == null ? "" : v).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    return DOC_STATUS[s] || "";
  }
  function statusFrom(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";
    var keys = ["FulfillmentStatus", "DocumentStatus", "WorkflowStatus", "Status"];
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] == null || typeof obj[keys[i]] === "object") continue;
      var c = canonDocStatus(obj[keys[i]]);
      if (c) return c;
    }
    return "";
  }
  function blankWorkflow() { return { order: "", ack: "", shipment: "", invoice: "" }; }
  function statusSlot(docType) {
    if (docType === "850") return "order";
    if (docType === "855") return "ack";
    if (docType === "856") return "shipment";
    if (docType === "810") return "invoice";
    return "";
  }
  function rememberStatus(state, slot, status) {
    var c = canonDocStatus(status);
    if (!state || !slot || !c) return;
    if (!state.workflow) state.workflow = blankWorkflow();
    state.workflow[slot] = c;
  }
  function takeStatus(entry, mapped) {
    return canonDocStatus(entry && entry.docStatus) || canonDocStatus(mapped && mapped.docStatus) || "";
  }

  function docKind(json) {
    var h = (json && json.Header) || {};
    if (h.OrderHeader) return "850";
    if (h.OrderAckHeader || h.OrderAcknowledgmentHeader || h.OrderAcknowledgementHeader) return "855";
    if (h.ShipmentHeader) return "856";
    if (h.InvoiceHeader) return "810";
    return "unknown";
  }

  function map850(json) {
    var h = json.Header || {};
    var oh = h.OrderHeader || {};
    var ship = addrView(addr(h.Address, "ST"));
    var bill = addrView(addr(h.Address, "BT"));
    var partnerId = String(oh.TradingPartnerId || "").trim();
    var po = String(oh.PurchaseOrderNumber || "").trim();
    var items = Array.isArray(json.LineItem) ? json.LineItem : [];
    var lines = [];
    var computed = 0;
    items.forEach(function (li) {
      var ol = (li && li.OrderLine) || {};
      var qty = num(ol.OrderQty);
      var price = num(ol.PurchasePrice);
      var ext = num(ol.ExtendedItemTotal);
      if (ext == null && qty != null && price != null) ext = round2(qty * price);
      if (ext != null) computed += ext;
      lines.push({
        lineNo: String(ol.LineSequenceNumber || ""),
        buyerItem: String(ol.BuyerPartNumber || ""),
        upc: normUpc(ol.GTIN, ol.ConsumerPackageCode),
        qty: qty, uom: String(ol.OrderQtyUOM || "").trim(),
        unitPrice: price, ext: ext, pack: packOf(li), retail: retailOf(li),
        description: lineDesc(li), po: po
      });
    });
    var qt = (Array.isArray(h.QuantityTotals) && h.QuantityTotals[0]) || {};
    var terms = (Array.isArray(h.PaymentTerms) && h.PaymentTerms[0]) || {};
    var summary = json.Summary || {};
    return {
      docType: "850", label: DOC_LABEL["850"],
      partnerId: partnerId, partner: partnerFromId(partnerId, ship && ship.name),
      pos: po ? [po] : [],
      vendor: String(oh.Vendor || "").trim(),
      poDate: String(oh.PurchaseOrderDate || ""),
      purpose: String(oh.TsetPurposeCode || ""),
      poType: String(oh.PrimaryPOTypeCode || ""),
      termsDays: num(terms.TermsNetDueDays),
      shipTo: ship, billTo: bill,
      dates: {
        requestedDelivery: dateByQual(h.Dates, "002"),
        requestedShip: dateByQual(h.Dates, "010"),
        cancelAfter: dateByQual(h.Dates, "001")
      },
      headerNotes: joinNotes(h.Notes),
      totalQty: num(qt.Quantity), totalUom: String(qt.QuantityUOM || ""),
      weight: num(qt.Weight), volume: num(qt.Volume),
      statedTotal: summary.TotalAmount == null || summary.TotalAmount === "" ? null : num(summary.TotalAmount),
      computedTotal: round2(computed),
      lineCount: summary.TotalLineItemNumber != null ? num(summary.TotalLineItemNumber) : lines.length,
      lines: lines, shipment: null, invoice: null, reject: null,
      docStatus: statusFrom(oh) || statusFrom(h) || statusFrom(json)
    };
  }

  function map855(json) {
    var h = json.Header || {};
    var ah = h.OrderAckHeader || h.OrderAcknowledgmentHeader || h.OrderAcknowledgementHeader || {};
    var ship = addrView(addr(h.Address, "ST"));
    var partnerId = String(ah.TradingPartnerId || "").trim();
    var po = String(ah.PurchaseOrderNumber || "").trim();
    return {
      docType: "855", label: DOC_LABEL["855"],
      partnerId: partnerId, partner: partnerFromId(partnerId, ship && ship.name),
      pos: po ? [po] : [],
      vendor: "", poDate: String(ah.PurchaseOrderDate || ""), purpose: "", poType: "", termsDays: null,
      shipTo: ship, billTo: null, dates: {}, headerNotes: joinNotes(h.Notes),
      totalQty: null, totalUom: "", weight: null, volume: null,
      statedTotal: null, computedTotal: null, lineCount: 0,
      lines: [], shipment: null, invoice: null, reject: null,
      docStatus: statusFrom(ah) || statusFrom(h) || statusFrom(json)
    };
  }

  function map856(json) {
    var h = json.Header || {};
    var sh = h.ShipmentHeader || {};
    var ship = addrView(addr(h.Address, "ST"));
    var partnerId = String(sh.TradingPartnerId || "").trim();
    var carrier = "";
    var ci = Array.isArray(h.CarrierInformation) ? h.CarrierInformation[0] : null;
    if (ci) carrier = String(ci.CarrierAlphaCode || ci.CarrierRouting || "").trim();
    var qw = (Array.isArray(h.QuantityAndWeight) && h.QuantityAndWeight[0]) || {};
    var sscc = [];
    var byPo = {};
    var pos = [];
    (Array.isArray(json.OrderLevel) ? json.OrderLevel : []).forEach(function (ol) {
      var po = String(((ol || {}).OrderHeader || {}).PurchaseOrderNumber || "").trim();
      if (po && pos.indexOf(po) < 0) pos.push(po);
      if (!byPo[po]) byPo[po] = {};
      (Array.isArray(ol.PackLevel) ? ol.PackLevel : []).forEach(function (pack) {
        var marks = (pack && pack.MarksAndNumbersCollection) || [];
        marks.forEach(function (m) { if (m && m.MarksAndNumbers1) sscc.push(String(m.MarksAndNumbers1)); });
        (Array.isArray(pack.ItemLevel) ? pack.ItemLevel : []).forEach(function (item) {
          var sl = (item && item.ShipmentLine) || {};
          var upc = normUpc(sl.GTIN, sl.ConsumerPackageCode);
          var key = upc || String(sl.BuyerPartNumber || "");
          if (!key) return;
          if (!byPo[po][key]) byPo[po][key] = {
            lineNo: "", buyerItem: String(sl.BuyerPartNumber || ""), upc: upc,
            qty: 0, uom: String(sl.ShipQtyUOM || "").trim(), unitPrice: null, ext: null,
            pack: null, retail: null, description: lineDesc(item), po: po
          };
          byPo[po][key].qty += num(sl.ShipQty) || 0;
          if (sl.ShipQtyUOM) byPo[po][key].uom = String(sl.ShipQtyUOM).trim();
        });
      });
    });
    var lines = [];
    Object.keys(byPo).forEach(function (po) {
      Object.keys(byPo[po]).forEach(function (k) { lines.push(byPo[po][k]); });
    });
    return {
      docType: "856", label: DOC_LABEL["856"],
      partnerId: partnerId, partner: partnerFromId(partnerId, ship && ship.name),
      pos: pos, vendor: "", poDate: "", purpose: "", poType: "", termsDays: null,
      shipTo: ship, billTo: null,
      dates: {}, headerNotes: joinNotes(h.Notes),
      totalQty: null, totalUom: "", weight: num(qw.Weight), volume: null,
      statedTotal: null, computedTotal: null, lineCount: lines.length,
      lines: lines,
      shipment: {
        id: String(sh.ShipmentIdentification || "").trim(),
        shipDate: String(sh.ShipDate || ""),
        asnDate: String(sh.ShipNoticeDate || ""),
        asnTime: String(sh.ShipNoticeTime || ""),
        bol: String(sh.BillOfLadingNumber || "").trim(),
        carrier: carrier,
        cartons: num(qw.LadingQuantity),
        sscc: sscc
      },
      invoice: null, reject: null,
      docStatus: statusFrom(sh) || statusFrom(h) || statusFrom(json)
    };
  }

  function map810(json) {
    var h = json.Header || {};
    var ih = h.InvoiceHeader || {};
    var ship = addrView(addr(h.Address, "ST"));
    var partnerId = String(ih.TradingPartnerId || "").trim();
    var po = String(ih.PurchaseOrderNumber || "").trim();
    var items = Array.isArray(json.LineItem) ? json.LineItem : [];
    var summary = json.Summary;
    var reject = (!items.length || !summary || typeof summary !== "object") ? "rejected" : null;
    var lines = [];
    var computed = 0;
    if (!reject) {
      items.forEach(function (li) {
        var il = (li && li.InvoiceLine) || {};
        var qty = num(il.InvoiceQty);
        var price = num(il.PurchasePrice);
        var ext = (qty != null && price != null) ? round2(qty * price) : null;
        if (ext != null) computed += ext;
        lines.push({
          lineNo: String(il.LineSequenceNumber || ""),
          buyerItem: String(il.BuyerPartNumber || ""),
          upc: normUpc(il.GTIN, il.ConsumerPackageCode),
          qty: qty, uom: String(il.InvoiceQtyUOM || "").trim(),
          unitPrice: price, ext: ext, pack: packOf(li), retail: null,
          description: lineDesc(li), po: po
        });
      });
    }
    var terms = (Array.isArray(h.PaymentTerms) && h.PaymentTerms[0]) || {};
    var invDate = String(ih.InvoiceDate || "");
    var due = String(terms.TermsNetDueDate || "") || addDays(invDate, num(terms.TermsNetDueDays));
    var lineSum = reject ? null : round2(computed);
    var stated = reject ? null : decode810Total(summary && summary.TotalAmount, lineSum);
    return {
      docType: "810", label: DOC_LABEL["810"],
      partnerId: partnerId, partner: partnerFromId(partnerId, ship && ship.name),
      pos: po ? [po] : [],
      vendor: "", poDate: String(ih.PurchaseOrderDate || ""), purpose: "", poType: "",
      termsDays: num(terms.TermsNetDueDays),
      shipTo: ship, billTo: addrView(addr(h.Address, "BT")),
      dates: {}, headerNotes: joinNotes(h.Notes),
      totalQty: null, totalUom: "", weight: null, volume: null,
      statedTotal: stated,
      computedTotal: lineSum,
      lineCount: lines.length, lines: lines, shipment: null,
      docStatus: statusFrom(ih) || statusFrom(h) || statusFrom(json),
      invoice: {
        number: String(ih.InvoiceNumber || "").trim(),
        date: invDate,
        bol: String(ih.BillOfLadingNumber || "").trim(),
        shipDate: String(ih.ShipDate || ""),
        due: due,
        poDate: String(ih.PurchaseOrderDate || ""),
        cartonCount: !reject && summary ? num(summary.TotalCartonCount) : null,
        stated: stated,
        computed: lineSum
      },
      reject: reject
    };
  }

  function mapDocument(json, docStatus) {
    var kind = docKind(json || {});
    var mapped;
    if (kind === "850") mapped = map850(json);
    else if (kind === "855") mapped = map855(json);
    else if (kind === "856") mapped = map856(json);
    else if (kind === "810") mapped = map810(json);
    else mapped = {
      docType: "unknown", label: "Unknown", partnerId: "", partner: "", pos: [],
      vendor: "", poDate: "", purpose: "", poType: "", termsDays: null,
      shipTo: null, billTo: null, dates: {}, headerNotes: "", totalQty: null, totalUom: "",
      weight: null, volume: null, statedTotal: null, computedTotal: null, lineCount: 0,
      lines: [], shipment: null, invoice: null, reject: null, docStatus: ""
    };
    mapped.docStatus = canonDocStatus(docStatus) || canonDocStatus(mapped.docStatus) || statusFrom(json);
    return mapped;
  }

  function stateKey(partnerId, po) { return String(partnerId || "") + "\u001f" + String(po || ""); }
  function blankState(mapped, po) {
    return {
      partnerId: mapped.partnerId || "", partner: mapped.partner || "", po: po || "",
      vendor: "", poDate: "", purpose: "", poType: "", termsDays: null,
      shipTo: null, billTo: null, dates: {}, headerNotes: "",
      totalQty: null, totalUom: "", weight: null, volume: null,
      lines: {}, orderLines: [], invoices: [], shipments: [],
      workflow: blankWorkflow()
    };
  }
  function lineSlot(state, upc, buyer) {
    var key = upc || ("item:" + (buyer || "?"));
    if (!state.lines[key]) state.lines[key] = {
      upc: upc || "", buyerItem: buyer || "", orderQty: null, orderUom: "", price: null,
      shipQty: null, shipUom: "", invoiceQty: null, invoiceUom: "", invoicePrice: null, desc: ""
    };
    return state.lines[key];
  }

  function applyMapped(state, mapped) {
    if (mapped.partner) state.partner = mapped.partner;
    if (mapped.partnerId) state.partnerId = mapped.partnerId;
    if (mapped.docType === "850") {
      state.vendor = mapped.vendor || state.vendor;
      state.poDate = mapped.poDate || state.poDate;
      state.purpose = mapped.purpose || state.purpose;
      state.poType = mapped.poType || state.poType;
      state.termsDays = mapped.termsDays != null ? mapped.termsDays : state.termsDays;
      state.shipTo = mapped.shipTo || state.shipTo;
      state.billTo = mapped.billTo || state.billTo;
      state.dates = mapped.dates || state.dates;
      state.headerNotes = mapped.headerNotes || state.headerNotes;
      state.totalQty = mapped.totalQty;
      state.totalUom = mapped.totalUom || "";
      state.weight = mapped.weight;
      state.volume = mapped.volume;
      state.orderLines = (mapped.lines || []).filter(function (l) { return !l.po || l.po === state.po; });
      Object.keys(state.lines).forEach(function (k) {
        state.lines[k].orderQty = null; state.lines[k].orderUom = ""; state.lines[k].price = null;
      });
      state.orderLines.forEach(function (l) {
        var slot = lineSlot(state, l.upc, l.buyerItem);
        slot.orderQty = (slot.orderQty || 0) + (l.qty || 0);
        slot.orderUom = l.uom || slot.orderUom;
        if (l.unitPrice != null) slot.price = l.unitPrice;
        if (l.description) slot.desc = l.description;
        if (l.buyerItem) slot.buyerItem = l.buyerItem;
      });
    } else if (mapped.docType === "856" && mapped.shipment) {
      if (mapped.shipTo) state.shipTo = mapped.shipTo;
      state.shipments.push(mapped.shipment);
      (mapped.lines || []).forEach(function (l) {
        if (l.po && l.po !== state.po) return;
        var slot = lineSlot(state, l.upc, l.buyerItem);
        slot.shipQty = (slot.shipQty || 0) + (l.qty || 0);
        slot.shipUom = l.uom || slot.shipUom;
        if (l.buyerItem) slot.buyerItem = l.buyerItem;
      });
    } else if (mapped.docType === "810" && !mapped.reject && mapped.invoice) {
      state.invoices.push(mapped.invoice);
      (mapped.lines || []).forEach(function (l) {
        if (l.po && l.po !== state.po) return;
        var slot = lineSlot(state, l.upc, l.buyerItem);
        slot.invoiceQty = (slot.invoiceQty || 0) + (l.qty || 0);
        slot.invoiceUom = l.uom || slot.invoiceUom;
        if (l.unitPrice != null) slot.invoicePrice = l.unitPrice;
      });
    }
    return state;
  }

  // entries: [{json}] oldest first. Returns { states: {key: state} }.
  function interpret(entries) {
    var states = {};
    (entries || []).forEach(function (entry) {
      var mapped = entry && entry.mapped ? entry.mapped : mapDocument(entry && entry.json, entry && entry.docStatus);
      if (mapped.reject && mapped.docType === "810") {
        var poR = (mapped.pos && mapped.pos[0]) || "";
        var keyR = stateKey(mapped.partnerId, poR);
        if (!states[keyR]) states[keyR] = blankState(mapped, poR);
        states[keyR].rejected = true;
        if (mapped.invoice) states[keyR].invoices.push(Object.assign({ rejected: true }, mapped.invoice));
        rememberStatus(states[keyR], "invoice", takeStatus(entry, mapped));
        return;
      }
      var pos = mapped.pos && mapped.pos.length ? mapped.pos : [""];
      pos.forEach(function (po) {
        var key = stateKey(mapped.partnerId, po);
        if (!states[key]) states[key] = blankState(mapped, po);
        applyMapped(states[key], mapped);
        rememberStatus(states[key], statusSlot(mapped.docType), takeStatus(entry, mapped));
      });
    });
    return { states: states };
  }

  function uomClash(a, b) {
    a = String(a || "").toUpperCase(); b = String(b || "").toUpperCase();
    return !!(a && b && a !== b);
  }

  function flagsOf(state) {
    var flags = [];
    var details = [];
    if (!state) return { flags: flags, details: details };
    if (state.rejected) {
      flags.push("rejected");
      details.push(state.po ? ("PO " + state.po + ": " + FLAG_LABEL.rejected) : FLAG_LABEL.rejected);
    }
    (state.invoices || []).forEach(function (inv) {
      if (!inv || inv.rejected || inv.stated == null || inv.computed == null) return;
      if (near(inv.stated, inv.computed)) return;
      if (near(inv.stated / 100, inv.computed)) {
        flags.push("total_x100");
        details.push("Invoice " + (inv.number || "") + " says " + money(inv.stated) + " but the lines sum to " + money(inv.computed) + " (100×).");
      } else {
        flags.push("total_mismatch");
        details.push("Invoice " + (inv.number || "") + " says " + money(inv.stated) + " but the lines sum to " + money(inv.computed) + ".");
      }
    });
    Object.keys(state.lines || {}).forEach(function (k) {
      var l = state.lines[k];
      var who = l.upc || l.buyerItem || k;
      if (l.orderQty != null && l.shipQty != null && l.shipQty > l.orderQty + 0.001) {
        if (uomClash(l.orderUom, l.shipUom)) {
          flags.push("uom_mismatch");
          details.push(who + " units differ (" + l.orderUom + " ordered, " + l.shipUom + " shipped).");
        } else {
          flags.push("overship");
          details.push(who + " shipped " + l.shipQty + " against order qty " + l.orderQty + ".");
        }
      }
      if (l.shipQty != null && l.invoiceQty != null && Math.abs(l.shipQty - l.invoiceQty) > 0.001) {
        if (uomClash(l.shipUom, l.invoiceUom)) {
          flags.push("uom_mismatch");
          details.push(who + " units differ (" + l.shipUom + " shipped, " + l.invoiceUom + " invoiced).");
        } else {
          flags.push("invoice_qty_mismatch");
          details.push(who + " invoiced " + l.invoiceQty + " against shipped " + l.shipQty + ".");
        }
      }
      if (l.price != null && l.invoicePrice != null && Math.abs(l.price - l.invoicePrice) > 0.001) {
        flags.push("price_mismatch");
        details.push(who + " order price " + money(l.price) + " vs invoice price " + money(l.invoicePrice) + ".");
      }
    });
    return { flags: uniq(flags), details: uniq(details) };
  }

  // Flags written on one stored file. Cross-document issues count only when
  // this file introduces them. A flag this file produces by itself (810 total,
  // rejected) is kept when an earlier copy already raised it, so a duplicate
  // invoice is not stored live with an empty flag list and the same note.
  function fileFlags(prevFlags, nowFlags, ownFlags) {
    var prev = prevFlags || [];
    var now = nowFlags || [];
    var out = now.filter(function (f) { return prev.indexOf(f) < 0; });
    (ownFlags || []).forEach(function (f) {
      if (now.indexOf(f) >= 0 && out.indexOf(f) < 0) out.push(f);
    });
    return out;
  }

  function casesBags(line) {
    var qty = Number(line.qty) || 0;
    var desc = line.description || "";
    var uom = line.uom || "";
    var pack = line.pack && line.pack > 0 ? line.pack : BAGS_PER_CASE;
    if (isVarietyFourPack(desc)) {
      return { flavor: "Variety Pack", code: FLAVOR_CODES["Variety Pack"], cases: qty, bags: 0, components: true, packQty: qty };
    }
    var flavor = flavorFromDesc(desc);
    var eaches = /each|^ea$|\bea\b/i.test(uom);
    var cases, bags;
    if (eaches) { bags = qty; cases = Math.round(qty / pack); }
    else { cases = qty; bags = qty * pack; }
    return {
      flavor: flavor || ("UNMAPPED: " + (desc || line.buyerItem || line.upc || "line")),
      code: flavor ? (FLAVOR_CODES[flavor] || "") : "",
      cases: cases, bags: bags, components: false
    };
  }

  // Order document Complete is the only live close. An 856 or 810 file, a BOL,
  // or an invoice Accepted status does not close the order while the Order
  // document is still Open (or has no status). testout is never live demand.
  function orderIsComplete(state) {
    var w = (state && state.workflow) || {};
    return w.order === "Complete";
  }
  function boardStatus(state, folder) {
    if (folder !== "out") return "Test";
    if (orderIsComplete(state)) return "Complete";
    return "Open";
  }
  function stageNote(state) {
    if (orderIsComplete(state)) return "";
    var w = (state && state.workflow) || {};
    var parts = [];
    if (w.ack === "Accepted" || w.ack === "Accepted Manually") parts.push("Ack Accepted");
    else if (w.ack) parts.push("Ack " + w.ack);
    if (w.shipment === "Saved") parts.push("ASN Saved");
    else if (w.shipment === "Accepted" || w.shipment === "Accepted Manually") parts.push("ASN Accepted");
    else if (w.shipment) parts.push("ASN " + w.shipment);
    if (w.invoice === "Accepted" || w.invoice === "Accepted Manually") parts.push("Invoice Accepted");
    else if (w.invoice === "Saved" || w.invoice === "New" || w.invoice === "Open" || w.invoice === "Preview" || w.invoice === "In Transit" || w.invoice === "Partially Accepted") parts.push("Invoice pending");
    else if (w.invoice) parts.push("Invoice " + w.invoice);
    if (w.order && w.order !== "Open" && w.order !== "New" && w.order !== "Complete") parts.push("Order " + w.order);
    return parts.join(" · ");
  }
  // Build Need skips these only when a real Fulfillment status was stored.
  // A mailbox 856/810 with no status is not tagged, so those Open lines still count.
  function stageId(state) {
    if (orderIsComplete(state)) return "complete";
    var w = (state && state.workflow) || {};
    var invoiceLater = {
      "Saved": 1, "New": 1, "Open": 1, "Preview": 1, "In Transit": 1,
      "Partially Accepted": 1, "Accepted": 1, "Accepted Manually": 1, "Complete": 1
    };
    if (invoiceLater[w.invoice]) return "invoice-pending";
    if (w.shipment === "Accepted" || w.shipment === "Accepted Manually" || w.shipment === "Complete") return "asn-accepted";
    if (w.shipment === "Saved" || w.shipment === "Preview" || w.shipment === "Template") return "asn-saved";
    if (w.ack === "Accepted" || w.ack === "Accepted Manually") return "ack-accepted";
    return "open";
  }
  function stageBits(state) {
    var id = stageId(state);
    var human = stageNote(state);
    return " [[SPSSTAGE:" + id + "]]" + (human ? "[[SPSNOTE:" + human + "]]" : "");
  }
  var BUILD_SKIP = { "asn-accepted": 1, "invoice-pending": 1, "complete": 1 };
  function countsForBuild(line) {
    if (!line || String(line.status || "Open") !== "Open") return false;
    var sps = String(line.source || "") === "SPS" || String(line.imported_by || "") === "SPS Feed" || String(line.batch_id || "") === "SPS-FEED";
    if (!sps) return true;
    var m = String(line.notes || "").match(/\[\[SPSSTAGE:([a-z0-9-]+)\]\]/);
    if (!m) return true;
    return !BUILD_SKIP[m[1]];
  }
  function stageLabel(line) {
    var m = String(line && line.notes || "").match(/\[\[SPSNOTE:([\s\S]*?)\]\]/);
    return m ? m[1].trim() : "";
  }
  function isSpsOrder(o) {
    if (!o) return false;
    var by = String(o.entered_by || "");
    if (by === "SPS Feed" || by === "SPS Sync") return true;
    return /\[\[SPS\]\]/.test(String(o.notes || ""));
  }

  function buildDemand(state, folder) {
    var live = folder === "out";
    var rows = [];
    var bits = stageBits(state);
    (state.orderLines || []).forEach(function (line) {
      var math = casesBags(line);
      var dc = (state.shipTo && (state.shipTo.location || state.shipTo.name)) || "";
      var base = {
        batch_id: live ? "SPS-FEED" : "SPS-TEST",
        batch_label: live ? "SPS" : "SPS testout",
        source: "SPS",
        partner: state.partner || "Unknown",
        po: state.po,
        dc: dc,
        uom: line.uom || "",
        unit_price: line.unitPrice || 0,
        due_date: mdY(state.dates && state.dates.requestedDelivery) || mdY(state.dates && state.dates.requestedShip) || "",
        status: boardStatus(state, folder),
        imported_by: "SPS Feed"
      };
      rows.push(Object.assign({}, base, {
        _key: "line|" + (line.lineNo || "") + "|" + (line.upc || line.buyerItem || ""),
        flavor: math.flavor, flavor_code: math.code,
        qty: line.qty || 0, cases: math.cases, bags: math.bags,
        notes: "[[SPSFEED:" + (line.lineNo || "") + ":" + (line.upc || "") + "]]" + bits + " " +
          (line.description || "") + (line.buyerItem ? " · buyer " + line.buyerItem : "") +
          (line.retail != null ? " · retail " + money(line.retail) : "")
      }));
      if (math.components) {
        VARIETY_4PACK.forEach(function (flavor) {
          var compBags = math.packQty * BAGS_PER_VARIETY;
          rows.push(Object.assign({}, base, {
            _key: "comp|" + (line.lineNo || "") + "|" + flavor,
            flavor: flavor, flavor_code: FLAVOR_CODES[flavor] || "",
            uom: "Bags", qty: 0, cases: compBags / BAGS_PER_CASE, bags: compBags, unit_price: 0,
            notes: "[[SPSFEED:comp:" + flavor + "]]" + bits + " Variety Pack component"
          }));
        });
      }
    });
    return rows;
  }

  function noteBlock(state, flagInfo, folder) {
    var lines = [];
    if (folder !== "out") lines.push("Test file only. It is not a live warehouse order.");
    var head = "SPS " + (folder === "out" ? "live" : "testout") + " · " + (state.partner || "Partner") + " · PO " + (state.po || "");
    if (state.vendor) head += " · vendor " + state.vendor;
    lines.push(head);
    if (state.shipTo && (state.shipTo.name || state.shipTo.location)) {
      lines.push("Ship to " + (state.shipTo.name || "") + (state.shipTo.location ? " (" + state.shipTo.location + ")" : ""));
    }
    if (state.dates && state.dates.requestedDelivery) lines.push("Requested delivery " + mdY(state.dates.requestedDelivery));
    var stage = stageNote(state);
    if (stage) lines.push(stage);
    var inv = (state.invoices || []).filter(function (x) { return x && !x.rejected; }).slice(-1)[0];
    if (inv) {
      var bit = "Invoice " + (inv.number || "");
      if (inv.computed != null) bit += " · line sum " + money(inv.computed);
      if (inv.stated != null && !near(inv.stated, inv.computed)) bit += " · file said " + money(inv.stated);
      lines.push(bit);
    }
    (flagInfo.details || []).slice(0, 4).forEach(function (d) { lines.push(d); });
    return "[[SPS]]\n" + lines.join("\n") + "\n[[/SPS]]";
  }
  function mergeNotes(existing, block) {
    var text = String(existing || "");
    if (/\[\[SPS\]\][\s\S]*?\[\[\/SPS\]\]/.test(text)) return text.replace(/\[\[SPS\]\][\s\S]*?\[\[\/SPS\]\]/, block).trim();
    if (!text.trim()) return block;
    return (text.trim() + "\n" + block).trim();
  }

  // Second arg used to be flag info. Flags do not close an order. Folder
  // "out" is live. Anything else, including testout, is Test.
  function lifecycle(state, folder) {
    if (folder && typeof folder !== "string") folder = "out";
    return boardStatus(state, folder || "out");
  }

  function buildOrder(state, folder, existingNotes, flagInfo) {
    flagInfo = flagInfo || flagsOf(state);
    var live = folder === "out";
    var inv = (state.invoices || []).filter(function (x) { return x && !x.rejected; }).slice(-1)[0];
    var ship = (state.shipments || []).slice(-1)[0];
    var life = boardStatus(state, folder);
    return {
      customer: state.partner || "",
      customer_po: state.po || "",
      appointment: mdY(state.dates && state.dates.requestedDelivery) || "",
      order_id: (inv && inv.number) || state.vendor || (ship && ship.id) || "",
      invoice_date: mdY(inv && inv.date) || mdY(state.poDate) || "",
      ship_date: mdY(ship && ship.shipDate) || mdY(state.dates && state.dates.requestedShip) || "",
      tracking: live && ship && ship.bol ? ship.bol : "",
      carrier: ship && ship.carrier ? ship.carrier : "",
      // Test stays Test. Live stays Open until the Order document is Complete.
      // BOL on tracking does not change this status.
      status: life,
      notes: mergeNotes(existingNotes, noteBlock(state, flagInfo, folder)),
      entered_by: "SPS Feed"
    };
  }

  function buildShipment(mapped, id, folder) {
    var s = mapped.shipment || {};
    var live = folder === "out";
    var asnStatus = canonDocStatus(mapped && mapped.docStatus);
    var logStatus = "Test";
    if (live) {
      logStatus = (asnStatus === "Accepted" || asnStatus === "Accepted Manually" || asnStatus === "Complete") ? "Shipped" : "Pending";
    }
    var bits = (mapped.lines || []).map(function (l) {
      return (l.upc || l.buyerItem || "item") + " × " + (l.qty || 0) + (l.uom ? " " + l.uom : "") + (l.po ? " (PO " + l.po + ")" : "");
    });
    var sscc = (s.sscc || []).slice(0, 20).join(", ");
    return {
      id: id,
      ship_date: mdY(s.shipDate || s.asnDate) || "",
      ship_type: live ? "856 ASN" : "856 ASN test",
      recipient: mapped.partner || "",
      address: mapped.shipTo ? ((mapped.shipTo.name || "") + (mapped.shipTo.location ? " #" + mapped.shipTo.location : "")) : "",
      carrier: s.carrier || "",
      tracking: s.bol || s.id || "",
      requested_by: "SPS Feed",
      contents: bits.join("; ").slice(0, 1800),
      lot: s.id || "",
      status: logStatus,
      cost: 0,
      notes: ("[[SPS]]\nASN " + (s.id || "") + (s.bol ? " · BOL " + s.bol : "") +
        (s.cartons != null ? " · cartons " + s.cartons : "") +
        (sscc ? "\nSSCC " + sscc : "") + "\n[[/SPS]]").slice(0, 1800),
      entered_by: "SPS Feed"
    };
  }

  function flagLabel(code) { return FLAG_LABEL[code] || code; }

  // PostgREST matches eq values that are percent-encoded as-is. Wrapping them in
  // quotes makes the quotes part of the value, so the lookup misses and every
  // SPS file inserts another order.
  function pgEq(column, value) {
    if (typeof value === "number" || (typeof value === "string" && /^-?\d+$/.test(value))) {
      return column + "=eq." + String(value);
    }
    return column + "=eq." + encodeURIComponent(String(value == null ? "" : value));
  }
  // Among duplicate SPS Feed rows for one partner+PO, keep the 850. That row's
  // notes include "vendor <number>". Later 856/810 copies can repeat that line
  // once the 850 is already stored, so the earliest of those rows is the 850.
  function pickSpsOrderKeeper(rows) {
    var list = (rows || []).filter(function (r) { return r && r.id != null && r.id !== ""; });
    if (!list.length) return null;
    var withVendor = list.filter(function (r) { return /vendor\s+\S/i.test(String(r.notes || "")); });
    var pool = (withVendor.length ? withVendor : list).slice();
    pool.sort(function (a, b) { return Number(a.id) - Number(b.id); });
    return pool[0];
  }

  var api = {
    mapDocument: mapDocument,
    interpret: interpret,
    flagsOf: flagsOf,
    fileFlags: fileFlags,
    buildOrder: buildOrder,
    buildDemand: buildDemand,
    buildShipment: buildShipment,
    canonDocStatus: canonDocStatus,
    boardStatus: boardStatus,
    lifecycle: lifecycle,
    stageNote: stageNote,
    stageId: stageId,
    stageLabel: stageLabel,
    countsForBuild: countsForBuild,
    isSpsOrder: isSpsOrder,
    orderIsComplete: orderIsComplete,
    partnerFromId: partnerFromId,
    normUpc: normUpc,
    flagLabel: flagLabel,
    money: money,
    stateKey: stateKey,
    pgEq: pgEq,
    pickSpsOrderKeeper: pickSpsOrderKeeper,
    DOC_LABEL: DOC_LABEL
  };
  root.SPSMap = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

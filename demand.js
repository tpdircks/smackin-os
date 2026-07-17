// Smackin' OS — SPS 850 + ShipIQ demand parser (window.DEMAND).
// Turns the same CSV exports Troy pulls for the weekly Demand Report into live board rows.
(function (root) {
  "use strict";

  const FLAVOR_CODES = { "OG Original":"S01","Cinnamon Churro":"S02","Backyard BBQ":"S03","Garlic Parmesan":"S04","Dill Pickle":"S05","Cracked Pepper":"S06","Cheddar Jalapeno":"S07","Ranch":"S08","Maple Brown Sugar":"S09","Lemon Pepper":"S10","Sour Cream & Onion":"S11","Cheeseburger":"L25","PCA Pizza":"L20","Variety Pack":"VP48" };
  // Target "Vendor Style" code -> flavor
  const STYLE_MAP = { "101":"Cinnamon Churro","102":"Garlic Parmesan","103":"Backyard BBQ","104":"Dill Pickle","105":"Cracked Pepper","106":"OG Original","107":"Cheddar Jalapeno","108":"Ranch","109":"Maple Brown Sugar","110":"Lemon Pepper","111":"Sour Cream & Onion","135":"Cheeseburger" };
  // description keyword -> flavor (fallback + non-Target). Descriptions come from SPS 850 exports and are often
  // abbreviated (e.g. "CRCK PEP", "DLL PCKL", "GRLC PRM") — patterns include both the full word and the common
  // abbreviation so similar shorthand keeps resolving without a code change.
  const DESC_RULES = [
    [/cinnamon|churro/i, "Cinnamon Churro"],
    [/garlic|parm|\bgrlc\b|prmsn/i, "Garlic Parmesan"],
    [/backyard|bbq|barbe|\bbyrd\b/i, "Backyard BBQ"],
    [/dill|pickle|\bdll\b|\bpckl\b/i, "Dill Pickle"],
    [/crack|\bcrck\b|black pepper/i, "Cracked Pepper"],
    [/cheddar|jalap|\bchd\b/i, "Cheddar Jalapeno"],
    [/ranch/i, "Ranch"],
    [/maple|brown sugar/i, "Maple Brown Sugar"],
    [/lemon/i, "Lemon Pepper"],
    [/sour cream|onion|s&o|sco/i, "Sour Cream & Onion"],
    [/cheeseburger/i, "Cheeseburger"],
    [/pizza|deep dish|pca/i, "PCA Pizza"],
    [/4\s*-?\s*var|variety/i, "Variety Pack"],
    [/original|\bog\b/i, "OG Original"]
  ];
  const BAGS_PER_CASE = 72;
  // "SEEDS SUNFLWR 4VAR 48PC" (UPC 850047865830, SKU SS-VP-48 "Retail Display 48CT (4oz)") is a fixed 4-flavor
  // assortment: 4 cases of 12 large resealable 4oz bags = 48 bags/unit. Composition confirmed 2026-07-16 from
  // Smackin's own Faire wholesale listing (https://www.faire.com/product/p_fwwzu3b7ht), which lists the "Variety"
  // flavor option for this SKU as: Cinnamon Churro, Garlic Parmesan, Cheddar Jalapeño, Backyard BBQ (12 bags each).
  const VARIETY_4PACK_COMPONENTS = ["Cinnamon Churro", "Garlic Parmesan", "Cheddar Jalapeno", "Backyard BBQ"];
  const BAGS_PER_VARIETY_FLAVOR = 12;
  function isVarietyFourPack(desc) { return /4\s*-?\s*var/i.test(String(desc || "")); }

  function parseCSV(text) {
    const rows = []; let row = [], field = "", i = 0, q = false;
    text = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function headerIndex(headers) {
    const idx = {};
    headers.forEach((h, i) => { idx[String(h).trim().toLowerCase()] = i; });
    return function (name) { const k = String(name).trim().toLowerCase(); return idx[k] != null ? idx[k] : -1; };
  }

  // Normalize a description for matching: collapse punctuation/dashes/extra whitespace so abbreviations like
  // "CRCK-PEP" / "CRCK.PEP" / "CRCK  PEP" all match the same as "CRCK PEP" (keeps "&" intact for the S&O rule).
  function normDesc(s) { return String(s || "").replace(/[._\-]+/g, " ").replace(/\s+/g, " ").trim(); }

  function flavorFromStyleOrDesc(style, desc) {
    style = String(style || "").trim();
    if (STYLE_MAP[style]) return STYLE_MAP[style];
    const d = normDesc(desc);
    for (const rule of DESC_RULES) { if (rule[0].test(d)) return rule[1]; }
    return null;
  }

  function isBucketOrVariety(desc) { return /bucket|variety|1\.5\s*oz|1\.5oz|54ct|display/i.test(String(desc || "")); }

  function firstDate(s) {
    s = String(s || "").trim(); if (!s) return "";
    const m = s.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || s.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : "";
  }

  function parseSPS(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { lines: [], warnings: ["Empty file"] };
    const H = headerIndex(rows[0]);
    const cPO = H("po number"), cRec = H("record type"), cQty = H("qty ordered"),
      cUom = H("unit of measure"), cStyle = H("vendor style"), cDesc = H("product/item description"),
      cPrice = H("unit price"), cPartner = H("partner"), cShipName = H("ship to name"),
      cBillName = H("bill to name"), cBuyName = H("buying party name"),
      cDeliver = H("delivery dates"), cShipDates = H("ship dates"), cReqDel = H("requested delivery date"),
      cMustArrive = H("must arrive by");
    if (cPO < 0 || cRec < 0) return { lines: [], warnings: ["Not an SPS 850 file (missing PO Number / Record Type)"] };

    const meta = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]; if (!row || row.length <= cRec) continue;
      if (String(row[cRec]).trim().toUpperCase() !== "H") continue;
      const po = String(row[cPO] || "").trim(); if (!po) continue;
      let partner = (cPartner >= 0 && row[cPartner]) ? String(row[cPartner]).trim() : "";
      if (!partner) partner = (cBuyName >= 0 && row[cBuyName] ? row[cBuyName] : (cBillName >= 0 && row[cBillName] ? row[cBillName] : (cShipName >= 0 ? row[cShipName] : ""))).toString().trim();
      const due = firstDate(cDeliver >= 0 ? row[cDeliver] : "") || firstDate(cShipDates >= 0 ? row[cShipDates] : "") ||
        firstDate(cReqDel >= 0 ? row[cReqDel] : "") || firstDate(cMustArrive >= 0 ? row[cMustArrive] : "");
      meta[po] = { partner: cleanPartner(partner), due };
    }

    const lines = [], warnings = [], unmatched = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]; if (!row || row.length <= cRec) continue;
      if (String(row[cRec]).trim().toUpperCase() !== "D") continue;
      const po = String(row[cPO] || "").trim(); if (!po) continue;
      const m = meta[po] || { partner: "", due: "" };
      const qty = Math.round(Number(String(row[cQty] || "0").replace(/[^0-9.\-]/g, "")) || 0);
      if (!qty) continue;
      const uom = (cUom >= 0 ? String(row[cUom] || "").trim() : "") || "Each";
      const desc = cDesc >= 0 ? String(row[cDesc] || "").trim() : "";
      const style = cStyle >= 0 ? String(row[cStyle] || "").trim() : "";
      const price = cPrice >= 0 ? Number(String(row[cPrice] || "0").replace(/[^0-9.\-]/g, "")) || 0 : 0;
      const order = orderNum(po);
      const dc = po.indexOf("-") >= 0 ? po.split("-").pop() : "";
      // "4VAR 48PC" retail-display SKU: track it as one "Variety Pack" line (cases = # of 48-ct units ordered,
      // bags 0 so it doesn't double-count against the 72-bags/case flavor math), then explode the known
      // composition into component-flavor lines (bags only, cases expressed as bag-equivalent so build/production
      // need — computeBuildNeed() in app.js — picks up the real bag demand for those flavors).
      if (isVarietyFourPack(desc)) {
        const packs = qty; // each ordered unit = one 48-bag (4-flavor x 12) display/case
        lines.push({
          source: "SPS", partner: m.partner || "Unknown", po: order, dc,
          flavor: "Variety Pack", flavor_code: FLAVOR_CODES["Variety Pack"] || "",
          uom, qty, cases: packs, bags: 0, unit_price: price, due_date: m.due || "", desc
        });
        VARIETY_4PACK_COMPONENTS.forEach(function (compFlavor) {
          const compBags = packs * BAGS_PER_VARIETY_FLAVOR;
          lines.push({
            source: "SPS", partner: m.partner || "Unknown", po: order, dc,
            flavor: compFlavor, flavor_code: FLAVOR_CODES[compFlavor] || "",
            uom: "Bags", qty: 0, cases: compBags / BAGS_PER_CASE, bags: compBags,
            unit_price: 0, due_date: m.due || "", desc: "Variety Pack component (" + desc + ")"
          });
        });
        continue;
      }
      const flavor = flavorFromStyleOrDesc(style, desc);
      const bucket = isBucketOrVariety(desc);
      const eaches = /each|ea\b/i.test(uom);
      let cases, bags;
      if (eaches) { bags = bucket ? 0 : qty; cases = Math.round(qty / BAGS_PER_CASE); }
      else { cases = qty; bags = bucket ? 0 : qty * BAGS_PER_CASE; }
      if (!flavor) { unmatched[desc || style || "?"] = (unmatched[desc || style || "?"] || 0) + 1; }
      lines.push({
        source: "SPS", partner: m.partner || "Unknown", po: order, dc,
        flavor: flavor || ("UNMAPPED: " + (desc || style)), flavor_code: flavor ? (FLAVOR_CODES[flavor] || "") : "",
        uom, qty, cases, bags, unit_price: price, due_date: m.due || "", desc
      });
    }
    Object.keys(unmatched).forEach(k => warnings.push("Unmapped flavor (" + unmatched[k] + " lines): " + k));
    return { lines, warnings };
  }

  function parseShipIQ(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { byPO: {}, warnings: ["Empty file"] };
    const H = headerIndex(rows[0]);
    const cPO = H("purchase order number"), cCart = H("cartons"), cPick = H("pickup date"),
      cLoad = H("load number"), cDest = H("destination");
    if (cPO < 0 || cCart < 0) return { byPO: {}, warnings: ["Not a ShipIQ file (missing PO / Cartons)"] };
    const byPO = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]; if (!row || row.length <= cPO) continue;
      const po = orderNum(String(row[cPO] || "").trim()); if (!po) continue;
      const cart = Math.round(Number(String(row[cCart] || "0").replace(/[^0-9.\-]/g, "")) || 0);
      if (!byPO[po]) byPO[po] = { cartons: 0, pickup: "", load: "", dest: "" };
      byPO[po].cartons += cart;
      if (!byPO[po].pickup && cPick >= 0) byPO[po].pickup = firstDate(row[cPick]);
      if (!byPO[po].load && cLoad >= 0) byPO[po].load = String(row[cLoad] || "").trim();
      if (!byPO[po].dest && cDest >= 0) byPO[po].dest = String(row[cDest] || "").trim();
    }
    return { byPO, warnings: [] };
  }

  function orderNum(po) {
    po = String(po || "").trim();
    const base = po.split("-")[0];
    const m = base.match(/^10001(\d+)$/);           // Target: strip 10001 prefix (10001 + 6-digit order)
    return m ? m[1] : base;
  }
  function cleanPartner(p) {
    p = String(p || "").trim();
    if (/target/i.test(p)) return "Target";
    if (/bass\s*pro|sportsman/i.test(p)) return "Bass Pro";
    if (/kehe/i.test(p)) return "KeHE";
    if (/vistar/i.test(p)) return "Vistar";
    if (/core-?mark/i.test(p)) return "Core-Mark";
    if (/scheels/i.test(p)) return "Scheels";
    if (/fareway/i.test(p)) return "Fareway";
    if (/mclane/i.test(p)) return "McLane";
    if (/hy-?vee/i.test(p)) return "Hy-Vee";
    if (/unfi|supervalu|millbrook/i.test(p)) return "UNFI";
    if (/cooper\s*booth/i.test(p)) return "Cooper Booth";
    if (/walmart/i.test(p)) return "Walmart";
    return p;
  }

  function aggregate(spsLines, shipiq) {
    const byKey = {};
    spsLines.forEach(l => {
      const k = [l.source, l.partner, l.po, l.flavor].join("|");
      if (!byKey[k]) byKey[k] = Object.assign({}, l, { qty: 0, cases: 0, bags: 0, dcs: [] });
      byKey[k].qty += l.qty; byKey[k].cases += l.cases; byKey[k].bags += l.bags;
      if (l.dc && byKey[k].dcs.indexOf(l.dc) < 0) byKey[k].dcs.push(l.dc);
    });
    const out = Object.keys(byKey).map(k => byKey[k]);
    if (shipiq && shipiq.byPO) {
      const spsCasesByPO = {};
      out.forEach(r => { if (r.partner === "Target") spsCasesByPO[r.po] = (spsCasesByPO[r.po] || 0) + r.cases; });
      out.forEach(r => { const s = shipiq.byPO[r.po]; if (s) { if (s.pickup) r.due_date = s.pickup; if (s.load) r.load = s.load; } });
      const recon = [];
      Object.keys(spsCasesByPO).forEach(po => { const s = shipiq.byPO[po]; if (s && Math.abs(s.cartons - spsCasesByPO[po]) > 1) recon.push("PO " + po + ": SPS " + spsCasesByPO[po] + " cs vs ShipIQ " + s.cartons + " cartons"); });
      Object.keys(shipiq.byPO).forEach(po => { if (spsCasesByPO[po] == null) recon.push("PO " + po + " in ShipIQ but no SPS lines (export it)"); });
      out._recon = recon;
    }
    return out;
  }

  function detectType(text) {
    const nl = text.indexOf("\n"); const head = (nl > 0 ? text.slice(0, nl) : text).toLowerCase();
    if (head.indexOf("purchase order number") >= 0 && head.indexOf("cartons") >= 0) return "shipiq";
    if (head.indexOf("record type") >= 0 && head.indexOf("po number") >= 0) return "sps";
    return "unknown";
  }

  root.DEMAND = { parseCSV, parseSPS, parseShipIQ, aggregate, orderNum, cleanPartner, detectType, FLAVOR_CODES, STYLE_MAP, BAGS_PER_CASE, VARIETY_4PACK_COMPONENTS, isVarietyFourPack };
})(window);

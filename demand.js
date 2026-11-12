// Smackin' OS — SPS 850 + ShipIQ demand parser (window.DEMAND).
// Turns the same CSV exports Troy pulls for the weekly Demand Report into live board rows.
(function (root) {
  "use strict";

  const FLAVOR_CODES = { "OG Original":"S01","Cinnamon Churro":"S02","Backyard BBQ":"S03","Garlic Parmesan":"S04","Dill Pickle":"S05","Cracked Pepper":"S06","Cheddar Jalapeno":"S07","Ranch":"S08","Maple Brown Sugar":"S09","Lemon Pepper":"S10","Sour Cream & Onion":"S11","Cheeseburger":"L25","PCA Pizza":"L20","Variety Pack":"VP48","Cotton Candy":"L56","Cashews BBQ":"NUTS-BBQ","Cashews Cinnamon Churro":"NUTS-CINNAMONCHURRO","Mini Bucket Mixed":"SMA77037" };
  // Target "Vendor Style" code -> flavor
  const STYLE_MAP = { "101":"Cinnamon Churro","102":"Garlic Parmesan","103":"Backyard BBQ","104":"Dill Pickle","105":"Cracked Pepper","106":"OG Original","107":"Cheddar Jalapeno","108":"Ranch","109":"Maple Brown Sugar","110":"Lemon Pepper","111":"Sour Cream & Onion","135":"Cheeseburger" };
  // description keyword -> flavor (fallback + non-Target). Descriptions come from SPS 850 exports and are often
  // abbreviated (e.g. "CRCK PEP", "CRCKD PEPPR", "DLL PCKL", "GRLC PRM", "GRL PRM", "CHED/JALA", "RNCH", "MPLE BRWN SUG", "ORIG").
  // Patterns include both the full word and the common abbreviation so similar shorthand keeps resolving without a code change.
  // GRL and PRM are whole words so they do not eat GRLC / PRMSN. ORIG stays last so that short token cannot steal
  // Lemon Pepper, Dill Pickle, BBQ, or any more specific flavor above.
  // Distributor lines also wrap the flavor in brand and pack noise ("SMACKIN' SEEDS SNFL ... 4Z", "SNFLWR SDS",
  // "4OZ"). cleanFlavorText strips that, and a stored "UNMAPPED:" label, before these rules run.
  const DESC_RULES = [
    [/cashews?\b.*\b(bbq|backyard)\b|\b(bbq|backyard)\b.*\bcashews?\b/i, "Cashews BBQ"],
    [/cashews?\b.*\b(cinnamon|churro)\b|\b(cinnamon|churro)\b.*\bcashews?\b/i, "Cashews Cinnamon Churro"],
    [/mini\s*bucket/i, "Mini Bucket Mixed"],
    [/cotton\s*candy/i, "Cotton Candy"],
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

  // Prepare a description, or a stored "UNMAPPED: ..." flavor, for the rules.
  // Drop the unmapped prefix, pack sizes (4Z, 4OZ, 1.5OZ), and brand/seed noise
  // (SMACKIN, SMACKN, SUNFLOWER, SNFL, SNFLWR, SEED, SEEDS, SDS, SD). Collapse
  // punctuation so "CRCK-PEP", "CRCK.PEP", and "CHED/JALA" match the spaced form.
  // "&" stays so the S&O rule still hits. Noise is removed before the rules so a
  // short token cannot hide inside SNFLWR or 4OZ, and a saved UNMAPPED label can
  // be parsed again.
  function cleanFlavorText(s) {
    let t = String(s || "");
    t = t.replace(/^(?:unmapped:\s*)+/i, "");
    t = t.replace(/['\u2019]/g, "");
    t = t.replace(/\b\d+(?:\.\d+)?\s*(?:oz|z)\b/ig, " ");
    t = t.replace(/\b(?:smackin|smackn|sunflower|sunflwr|snflwr|seeds|snfl|seed|sds|sd)\b/ig, " ");
    t = t.replace(/[._\-\/]+/g, " ").replace(/\s+/g, " ").trim();
    return t;
  }

  function flavorFromStyleOrDesc(style, desc) {
    style = String(style || "").trim();
    if (STYLE_MAP[style]) return STYLE_MAP[style];
    const d = cleanFlavorText(desc);
    for (const rule of DESC_RULES) { if (rule[0].test(d)) return rule[1]; }
    return null;
  }

  function resolveFlavor(text) {
    const name = flavorFromStyleOrDesc("", text);
    if (!name) return null;
    return { flavor: name, flavor_code: FLAVOR_CODES[name] || "" };
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
      if (/mini\s*bucket|SMA77037/i.test(desc + " " + style)) {
        const eachesMini = /each|ea\b/i.test(uom);
        const miniBags = eachesMini ? qty : qty * 24;
        lines.push({
          source: "SPS", partner: m.partner || "Unknown", po: order, dc,
          flavor: "Mini Bucket Mixed", flavor_code: "SMA77037",
          uom, qty, cases: eachesMini ? Math.round(qty / 24) : qty, bags: miniBags,
          unit_price: price, due_date: m.due || "", desc,
          notes: "[[PACK:minibucket]] [[SPSSTAGE:open]] " + desc
        });
        continue;
      }
      if (isVarietyFourPack(desc)) {
        const packs = qty; // each ordered unit = one 48-bag (4-flavor x 12) display/case
        lines.push({
          source: "SPS", partner: m.partner || "Unknown", po: order, dc,
          flavor: "Variety Pack", flavor_code: FLAVOR_CODES["Variety Pack"] || "",
          uom, qty, cases: packs, bags: 0, unit_price: price, due_date: m.due || "", desc,
          notes: "[[PACK:seed4]] [[SPSSTAGE:open]] " + desc
        });
        VARIETY_4PACK_COMPONENTS.forEach(function (compFlavor) {
          const compBags = packs * BAGS_PER_VARIETY_FLAVOR;
          lines.push({
            source: "SPS", partner: m.partner || "Unknown", po: order, dc,
            flavor: compFlavor, flavor_code: FLAVOR_CODES[compFlavor] || "",
            uom: "Bags", qty: 0, cases: compBags / BAGS_PER_CASE, bags: compBags,
            unit_price: 0, due_date: m.due || "", desc: "Variety Pack component (" + desc + ")",
            notes: "[[PACK:seed4]] [[SPSSTAGE:open]] Variety Pack component (" + desc + ")"
          });
        });
        continue;
      }
      const flavor = flavorFromStyleOrDesc(style, desc);
      const bucket = flavor === "Mini Bucket Mixed" ? false : isBucketOrVariety(desc);
      const eaches = /each|ea\b/i.test(uom);
      const packKind = /^cashews?\b/i.test(flavor || "") ? "cashew" : "seed4";
      let cases, bags;
      if (eaches) { bags = bucket ? 0 : qty; cases = Math.round(qty / BAGS_PER_CASE); }
      else { cases = qty; bags = bucket ? 0 : qty * BAGS_PER_CASE; }
      if (!flavor) { unmatched[desc || style || "?"] = (unmatched[desc || style || "?"] || 0) + 1; }
      lines.push({
        source: "SPS", partner: m.partner || "Unknown", po: order, dc,
        flavor: flavor || ("UNMAPPED: " + (desc || style)), flavor_code: flavor ? (FLAVOR_CODES[flavor] || "") : "",
        uom, qty, cases, bags, unit_price: price, due_date: m.due || "", desc,
        notes: "[[PACK:" + packKind + "]] [[SPSSTAGE:open]] " + desc
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

  function normPart(s) { return String(s || "").trim().toLowerCase(); }
  function lineMatchKey(r) {
    return [normPart(r && r.partner), normPart(r && r.po), normPart(r && r.dc), normPart(r && r.flavor)].join("|");
  }
  function stageKey(partner, po) { return normPart(partner) + "\n" + normPart(po); }
  function isLiveOpen(r) {
    if (!r) return false;
    var st = String(r.status || "");
    if (st !== "Open" && st !== "New") return false;
    if (String(r.batch_id || "") === "SPS-TEST") return false;
    if (String(r.batch_label || "").toLowerCase().indexOf("testout") >= 0) return false;
    return true;
  }
  function closedStatus(st) {
    st = String(st || "").toLowerCase();
    return st === "complete" || st === "closed" || st === "cancelled" || st === "canceled";
  }
  function closeNote(existing, today, reason) {
    var tag = "[[CLOSED:" + today + ":" + (reason || "not-live-sps-open") + "]]";
    var cur = String(existing || "").trim();
    if (cur.indexOf(tag) >= 0) return cur;
    return cur ? cur + " " + tag : tag;
  }
  function denverToday(now) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(now || new Date());
    } catch (e) {
      return new Date(now || Date.now()).toISOString().slice(0, 10);
    }
  }
  function numSum(n) { n = Number(n); return isFinite(n) ? n : 0; }
  function openCensus(lines) {
    var keys = {};
    var bags = 0;
    var n = 0;
    (lines || []).forEach(function (line) {
      if (!isLiveOpen(line)) return;
      n += 1;
      bags += numSum(line.bags);
      keys[stageKey(line.partner, line.po)] = 1;
    });
    var list = Object.keys(keys).sort();
    return { bags: Math.round(bags * 1000) / 1000, pos: list.length, lines: n, keys: list };
  }
  // Full saved-search reconcile. incoming is the live New and Open set.
  // Staged POs stay open unless the file itself shows that PO closed.
  function reconcileOpen(existing, incoming, opts) {
    opts = opts || {};
    var today = opts.today || denverToday();
    if (!incoming || !incoming.length) return { insert: [], update: [], close: [], unchanged: 0, refused: "empty", today: today };
    var staged = {};
    (opts.staged || []).forEach(function (row) {
      if (row && row.po) staged[stageKey(row.partner, row.po)] = true;
    });
    var closedPo = {};
    incoming.forEach(function (row) {
      if (closedStatus(row.status)) closedPo[stageKey(row.partner, row.po)] = true;
    });
    var want = {};
    incoming.forEach(function (row) {
      if (closedStatus(row.status)) return;
      var k = lineMatchKey(row);
      if (!want[k]) want[k] = Object.assign({}, row, { qty: 0, cases: 0, bags: 0 });
      want[k].qty += numSum(row.qty);
      want[k].cases += numSum(row.cases);
      want[k].bags += numSum(row.bags);
      if (!want[k].due_date && row.due_date) want[k].due_date = row.due_date;
      if (!want[k].notes && row.notes) want[k].notes = row.notes;
    });
    var have = {};
    (existing || []).forEach(function (row) {
      if (!isLiveOpen(row)) return;
      var k = lineMatchKey(row);
      if (!have[k]) have[k] = [];
      have[k].push(row);
    });
    var insert = [];
    var update = [];
    var close = [];
    var unchanged = 0;
    Object.keys(want).forEach(function (k) {
      var next = want[k];
      var rows = have[k] || [];
      if (!rows.length) { insert.push(next); return; }
      var keeper = rows[0];
      var due = String(next.due_date || "");
      var sameDue = !due || due === String(keeper.due_date || "");
      var same = numSum(keeper.bags) === numSum(next.bags) && numSum(keeper.cases) === numSum(next.cases) && numSum(keeper.qty) === numSum(next.qty) && sameDue;
      if (same) unchanged += 1;
      else update.push({
        id: keeper.id,
        qty: next.qty,
        cases: next.cases,
        bags: next.bags,
        due_date: due || keeper.due_date || "",
        uom: next.uom || keeper.uom || ""
      });
      rows.slice(1).forEach(function (extra) {
        close.push({ id: extra.id, partner: extra.partner, po: extra.po, notes: closeNote(extra.notes, today, "merged-duplicate"), reason: "merged-duplicate" });
      });
      have[k] = [];
    });
    Object.keys(have).forEach(function (k) {
      (have[k] || []).forEach(function (row) {
        var sk = stageKey(row.partner, row.po);
        if (staged[sk] && !closedPo[sk]) return;
        var reason = closedPo[sk] ? "sps-closed" : "not-live-sps-open";
        close.push({ id: row.id, partner: row.partner, po: row.po, notes: closeNote(row.notes, today, reason), reason: reason });
      });
    });
    return { insert: insert, update: update, close: close, unchanged: unchanged, today: today };
  }

  function detectType(text) {
    const nl = text.indexOf("\n"); const head = (nl > 0 ? text.slice(0, nl) : text).toLowerCase();
    if (head.indexOf("purchase order number") >= 0 && head.indexOf("cartons") >= 0) return "shipiq";
    if (head.indexOf("record type") >= 0 && head.indexOf("po number") >= 0) return "sps";
    return "unknown";
  }

  root.DEMAND = { parseCSV, parseSPS, parseShipIQ, aggregate, orderNum, cleanPartner, detectType, FLAVOR_CODES, STYLE_MAP, BAGS_PER_CASE, VARIETY_4PACK_COMPONENTS, isVarietyFourPack, cleanFlavorText, resolveFlavor, flavorFromStyleOrDesc, reconcileOpen, openCensus, closeNote, lineMatchKey, denverToday };
  if (typeof module !== "undefined" && module.exports) module.exports = root.DEMAND;
})(typeof window !== "undefined" ? window : globalThis);

(function (root) {
  "use strict";
  const FLAVORS = [
    "OG Original", "Cinnamon Churro", "Backyard BBQ", "Garlic Parmesan", "Dill Pickle", "Cracked Pepper",
    "Cheddar Jalapeno", "Ranch", "Maple Brown Sugar", "Lemon Pepper", "Sour Cream & Onion",
    "Cheeseburger", "PCA Pizza", "Good Good Salt & Vinegar", "Honey BBQ (A-Rod)", "Salsa", "Taco", "Guacamole",
    "Chili Cheese Dog", "Blueberry Pie", "Birthday Cake", "Mexican Street Corn", "Nashville Hot",
    "Bacon Mac & Cheese", "Korean BBQ (King of Juco)", "S'mores", "Teriyaki (Ana Bruni)", "Sweet Thai Chili",
    "Loaded Potato", "Spicy Queso", "Chili Lime", "Ketchup"
  ];
  const CORE11 = FLAVORS.slice(0, 11);
  const DESC_RULES = [
    [/good good/i, "Good Good Salt & Vinegar"],
    [/honey bbq|a-?rod/i, "Honey BBQ (A-Rod)"],
    [/korean bbq|king of juco/i, "Korean BBQ (King of Juco)"],
    [/backyard bbq/i, "Backyard BBQ"],
    [/pca pizza|deep dish/i, "PCA Pizza"],
    [/cheeseburger/i, "Cheeseburger"],
    [/chili cheese dog/i, "Chili Cheese Dog"],
    [/cheddar jalap/i, "Cheddar Jalapeno"],
    [/cinnamon churro/i, "Cinnamon Churro"],
    [/cracked pepper/i, "Cracked Pepper"],
    [/dill pickle/i, "Dill Pickle"],
    [/garlic parm/i, "Garlic Parmesan"],
    [/guacamole/i, "Guacamole"],
    [/lemon pepper/i, "Lemon Pepper"],
    [/loaded potato/i, "Loaded Potato"],
    [/maple brown sugar/i, "Maple Brown Sugar"],
    [/nashville hot/i, "Nashville Hot"],
    [/bacon mac/i, "Bacon Mac & Cheese"],
    [/birthday cake/i, "Birthday Cake"],
    [/blueberry pie/i, "Blueberry Pie"],
    [/mexican street corn/i, "Mexican Street Corn"],
    [/sweet thai chili/i, "Sweet Thai Chili"],
    [/spicy queso/i, "Spicy Queso"],
    [/chili lime/i, "Chili Lime"],
    [/ketchup/i, "Ketchup"],
    [/s'?mores/i, "S'mores"],
    [/teriyaki/i, "Teriyaki (Ana Bruni)"],
    [/sour cream/i, "Sour Cream & Onion"],
    [/\branch\b/i, "Ranch"],
    [/\bsalsa\b/i, "Salsa"],
    [/\btaco\b/i, "Taco"],
    [/"?og"?\s*original|\boriginal\b/i, "OG Original"]
  ];
  const CODE_RULES = [
    ["GGSV", "Good Good Salt & Vinegar"], ["HBB", "Honey BBQ (A-Rod)"], ["KBBQ", "Korean BBQ (King of Juco)"],
    ["BBCAMO", "Backyard BBQ"], ["DPCAMO", "Dill Pickle"], ["OGCAMO", "OG Original"],
    ["PCA", "PCA Pizza"], ["CCD", "Chili Cheese Dog"], ["CH", "Cheeseburger"],
    ["CJ", "Cheddar Jalapeno"], ["CC", "Cinnamon Churro"], ["CP", "Cracked Pepper"],
    ["BB", "Backyard BBQ"], ["DP", "Dill Pickle"], ["GP", "Garlic Parmesan"], ["GU", "Guacamole"],
    ["LP", "Lemon Pepper"], ["LDP", "Loaded Potato"], ["MB", "Maple Brown Sugar"], ["NH", "Nashville Hot"],
    ["BMC", "Bacon Mac & Cheese"], ["BC", "Birthday Cake"], ["BP", "Blueberry Pie"], ["STC", "Sweet Thai Chili"],
    ["SQ", "Spicy Queso"], ["SA", "Salsa"], ["SC", "Sour Cream & Onion"], ["TC", "Taco"], ["CL", "Chili Lime"],
    ["KE", "Ketchup"], ["CR", "Ranch"], ["OG", "OG Original"]
  ];
  function flavorFromDesc(desc) { const d = String(desc || ""); for (const [re, f] of DESC_RULES) { if (re.test(d)) return f; } return null; }
  function flavorFromCode(sku) {
    const body = String(sku || "").toUpperCase().replace(/^SS-/, "");
    for (const [code, f] of CODE_RULES) { if (body.indexOf(code + "-") === 0) return f; }
    return null;
  }
  function resolveFlavor(sku, desc) { return flavorFromDesc(desc) || flavorFromCode(sku) || null; }
  function sizeOf(sku, desc) {
    const s = (String(sku || "") + " " + String(desc || ""));
    if (/1\.5\s*-?\s*(oz|ounce)/i.test(s)) return "1.5oz";
    if (/4\s*-?\s*(oz|ounce)/i.test(s)) return "4oz";
    return null;
  }
  function kitLookup(sku) {
    if (!root.KITS) return null;
    let key = root.KITS.find(sku);
    if (key) return key;
    const tok = s => String(s || "").toUpperCase().split("-").filter(Boolean).sort().join("-");
    const want = tok(sku);
    const boms = root.KITS.BOMS || {};
    return Object.keys(boms).find(k => tok(k) === want) || null;
  }
  const VAR4 = ["Cinnamon Churro", "Garlic Parmesan", "Cheddar Jalapeno", "Backyard BBQ"];
  const CLASSIC6 = ["Dill Pickle", "Backyard BBQ", "Garlic Parmesan", "Cracked Pepper", "Cinnamon Churro", "OG Original"];
  function numFromDesc(desc) {
    const d = String(desc || "");
    let m = d.match(/\((\d+)\s*Bag/i); if (m) return +m[1];
    m = d.match(/Case of (\d+)/i); if (m) return +m[1];
    m = d.match(/Bucket of (\d+)/i); if (m) return +m[1];
    m = d.match(/Sample\w* Pack of (\d+)/i); if (m) return +m[1];
    m = d.match(/\((\d+)\s*Pack\)/i); if (m) return +m[1];
    m = d.match(/(\d+)\s*Pack\)/i); if (m) return +m[1];
    return null;
  }
  function numFromSku(sku) {
    const s = String(sku || "");
    let m = s.match(/-(\d+)PK/i); if (m) return +m[1];
    m = s.match(/-(\d+)-FB[AM]\b/i); if (m) return +m[1];
    m = s.match(/-(\d+)$/); if (m) return +m[1];
    return null;
  }
  const UNMAPPED_RE = /BUCKET-EMPTY|VAULT|DISPLAY SHIPPER|SEASON SUPPLY|\bSZN-SUPPLY\b|PARMUFFALO|RD-US-48|FIESTA PACK|LIMITED EDITION VARIETY|SPCH-17PK|VP-8-D2C|8\s*Flavor|10\s*Flavor/i;
  function mapRow(sku, desc, qty) {
    sku = String(sku || "").trim(); desc = String(desc || "").trim(); qty = Number(qty) || 0;
    if (!qty) return [];
    const SKU = sku.toUpperCase();
    const size = sizeOf(sku, desc);
    if (UNMAPPED_RE.test(SKU + " " + desc)) return null;
    if (SKU === "SS-VP-1.5OZ-54PK" || SKU === "SS-VP-1.5OZ-54PK-WS") return null;
    if (/-SINGLE$/i.test(SKU)) {
      const f = resolveFlavor(sku, desc);
      if (!f || !size) return null;
      return [{ flavor: f, size, bags: qty }];
    }
    if (/mastercase/i.test(desc) || /MASTERCASE/i.test(SKU)) {
      const f = resolveFlavor(sku, desc);
      if (!f) return null;
      return [{ flavor: f, size: size || "4oz", bags: qty * 72 }];
    }
    const kitKey = kitLookup(sku);
    if (kitKey) {
      const comps = root.KITS.explode(kitKey) || [];
      const meta = root.KITS.meta(kitKey) || {};
      const kSize = meta.size === "1.5OZ" ? "1.5oz" : meta.size === "4OZ" ? "4oz" : (size || "4oz");
      if (comps.length) return comps.map(c => ({ flavor: c.flavor, size: kSize, bags: qty * c.qty }));
    }
    if (/-11PK|-11-FB[AM]\b/i.test(SKU) || /sample\w* pack of 11/i.test(desc) || /11\s*flavor/i.test(desc)) {
      const n = numFromSku(sku) || numFromDesc(desc) || 11;
      const base = Math.floor(n / 11), rem = n - base * 11;
      return CORE11.map((f, idx) => ({ flavor: f, size: "1.5oz", bags: qty * (base + (idx < rem ? 1 : 0)) }));
    }
    if (/6\s*Flavor Variety/i.test(desc)) {
      return CLASSIC6.map(f => ({ flavor: f, size: size || "1.5oz", bags: qty }));
    }
    if (/^SS-(VP|RD-VP)-/.test(SKU) || SKU.indexOf("-VP-") >= 0) {
      const n = numFromSku(sku) || numFromDesc(desc) || (SKU.indexOf("48") >= 0 ? 48 : null);
      if (n) {
        const per = Math.round((n / 48) * 12);
        if (per > 0) return VAR4.map(f => ({ flavor: f, size: size || "4oz", bags: qty * per }));
      }
      return null;
    }
    if (desc.indexOf("+") === -1) {
      const f = resolveFlavor(sku, desc);
      const n = numFromDesc(desc) || numFromSku(sku);
      if (f && n && size) return [{ flavor: f, size, bags: qty * n }];
    }
    return null;
  }
  function parseCSV(text) {
    const rows = []; let row = [], field = "", i = 0, q = false;
    text = String(text).replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    while (i < text.length) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; } field += c; i++; continue; }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function detectType(text) {
    const head = String(text || "").slice(0, 2000).toLowerCase();
    return (head.indexOf("qtysold") >= 0 && head.indexOf("sku") >= 0) ? "shipstation" : "unknown";
  }
  function parseShipStation(text) {
    const rows = parseCSV(text);
    if (!rows.length) return { totals: {}, unmapped: [], warnings: ["Empty file"] };
    const head = rows[0].map(h => String(h).trim().toLowerCase());
    const iSku = head.indexOf("sku"), iDesc = head.indexOf("description"), iQty = head.indexOf("qtysold");
    if (iSku < 0 || iQty < 0) return { totals: {}, unmapped: [], warnings: ["Not a ShipStation Product Sales file (missing SKU / QtySold)"] };
    const totals = {}; const unmapped = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]; if (!row || row.length <= iQty) continue;
      const sku = row[iSku], desc = iDesc >= 0 ? row[iDesc] : "", qty = Number(row[iQty]) || 0;
      if (!sku || !qty) continue;
      const mapped = mapRow(sku, desc, qty);
      if (!mapped || !mapped.length) { unmapped.push({ sku, desc, qty }); continue; }
      mapped.forEach(m => {
        if (!totals[m.flavor]) totals[m.flavor] = { "4oz": 0, "1.5oz": 0 };
        totals[m.flavor][m.size] = (totals[m.flavor][m.size] || 0) + m.bags;
      });
    }
    return { totals, unmapped, warnings: [] };
  }
  root.ECOM = { FLAVORS, parseCSV, detectType, parseShipStation, mapRow };
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================================
   Smackin' Inventory — shared seed data + warehouse config
   Used by BOTH the web app (local mode) and the Supabase SQL seed generator.
   All quantities from the Inventory SLC workbook, snapshot dated 2026-07-02.
   ============================================================================ */
(function (root) {
  "use strict";

  // ---- Warehouse location model (Racking Location System SOP) -------------
  // Section-Bay-Level, e.g. A-05-L3. Bay 01 starts at the dock doors.
  const CONFIG = {
    sections: ["A", "B", "C", "D"],   // racking runs (E reserved)
    baysPerSection: 28,               // 28 bays/section (112 positions x 4 sections). Per Adriana's map.
    levels: ["L1", "L2", "L3", "L4"], // L1 floor .. L4 top
    docks: [11, 12, 13, 14, 15, 16, 17, 18, 19], // 19 = office end, 11 = far end
    zones: ["RECEIVING", "STAGING", "RETURNS", "QUARANTINE", "WIP", "PACKOUT", "CAGE", "PROD-WEIGH", "PROD-PACK", "SHIPPING",
            "ST-01", "ST-02", "ST-03", "ST-04", "ST-05", "ST-06", "ST-07", "ST-08"]
  };

  // ---- Returns pick-lists -------------------------------------------------
  const RETURN_CHANNELS = ["Customer", "Amazon"];
  const RETURN_REASONS = ["Damaged in transit", "Wrong item shipped", "Customer changed mind",
    "Defective product", "Expired", "Overstock / recall", "Address not found", "Moved", "Other"];
  const RETURN_DISPOSITIONS = ["Restock", "Quarantine", "Scrap"];

  // ---- Receiving pick-lists (from Adriana's Receiving Log SETTINGS tab) -----
  const RECV_SUPPLIERS = [
    // Manufacturers (ingredients / seasonings / seed)
    "BlueGrass", "Rocky Mountain Spice Company", "Commercial Creamery Company", "Fire House Flavors",
    "Great American Spice Company", "Savor Seasoning", "Chesapeake Spice", "Spiceology", "Regal Spice",
    "Distributed by - WALMART", "Elite Spice", "ADM Corn Processing", "My Spice Sage", "In the Raw", "Sunrich",
    // Other suppliers (packaging / logistics / labels / uniforms)
    "Deline Box & Display", "Box Essentials LLC", "Weber Logistic", "Ernest - Salt Lake City",
    "ULINE", "BELMARK", "ALSCO",
    "Other"];
  const RECV_CATEGORIES = ["SEEDS", "OIL", "STEVIA", "SEASONING", "ROLL FILM 1.5 OZ", "ROLL FILM 4 OZ",
    "MASTER CASE", "TARGET MASTER CASE", "WAL MART BOX", "BOX 12 PCK", "BOX 24 PCK", "SLEEVES TARGET",
    "DISPLAY", "POLYMAILERS", "UNPRINTED BUCKETS", "STANDART BUCKETS", "BACKYARD SP BUCKETS", "BUCKETS BOX",
    "BUCKETS BOX (SEAT BLACK)", "BUCKETS STICKERS", "SMALL STICKERS", "LABEL", "LABEL FLAVOR", "HOT STAMPS RIBBON",
    "GAYLORD", "PALLETES", "PLASTIC BOX", "FIESTA BOX", "HALLOWEEN BOX", "ADVENT CALENDAR", "BOX DHL", "BOX USPS",
    "HAND TAPE", "MACHINE TAPE", "TAPE DISPENSER", "SHRINK WRAP HAND", "SHRINK WRAP( MACHINE)",
    "GLOVES", "MASCK", "CAP FACE", "PAPPER TOWEL", "PAPPER CUPS", "UNIFORMS"];
  const RECV_STATUSES = ["Received", "Pending", "Under Review", "Return"];
  const CONDITIONS = ["Good", "Quarantine"];

  function rackSlots() {
    const out = [];
    CONFIG.sections.forEach(s => {
      for (let b = 1; b <= CONFIG.baysPerSection; b++) {
        const bb = String(b).padStart(2, "0");
        CONFIG.levels.forEach(l => out.push(s + "-" + bb + "-" + l));
      }
    });
    return out;
  }
  function allLocations() {
    return [...rackSlots(), ...CONFIG.zones, ...CONFIG.docks.map(d => "DOCK-" + d)];
  }

  // ---- Suppliers (order URLs are placeholders — replace with Matt's real URLs) ----
  const SUPPLIERS = [
    { id: "seed", name: "Sunrich / Seed Supplier", order_url: "https://www.example-seed-supplier.com/order" },
    { id: "seas", name: "Seasoning Supplier",      order_url: "https://www.example-seasoning.com/order" },
    { id: "film", name: "Printed Film Supplier",   order_url: "https://www.example-film.com/order" },
    { id: "pack", name: "Packaging / Box Supplier",order_url: "https://www.example-packaging.com/order" },
    { id: "buck", name: "Bucket Supplier",         order_url: "https://www.example-buckets.com/order" }
  ];

  // ---- Flavors (standard S01-S11) -----------------------------------------
  const FL = [
    ["S01", "OG Original"], ["S02", "Cinnamon Churro"], ["S03", "Backyard BBQ"],
    ["S04", "Garlic Parmesan"], ["S05", "Dill Pickle"], ["S06", "Cracked Pepper"],
    ["S07", "Cheddar Jalapeno"], ["S08", "Ranch"], ["S09", "Maple Brown Sugar"],
    ["S10", "Lemon Pepper"], ["S11", "Sour Cream & Onion"]
  ];

  // 2026-07-02 figures (from "Inventory 70226.xlsx" — last COMPLETE count block;
  // the 2026-07-06 4oz block was Adriana's in-progress count, so 4oz uses 07-02).
  const FILM4  = { S01:171000,S02:66000,S03:63000,S04:159600,S05:151000,S06:63600,S07:237600,S08:91800,S09:0,S10:0,S11:79200 };
  const FILM15 = { S01:92300,S02:272000,S03:113400,S04:144000,S05:163800,S06:131272,S07:110500,S08:113600,S09:27700,S10:68200,S11:58500 };
  const BAG4   = { S01:19200,S02:24100,S03:1800,S04:4100,S05:2000,S06:3600,S07:3600,S08:11800,S09:900,S10:7600,S11:10900 };
  const BAG15  = { S01:19500,S02:13750,S03:8750,S04:7000,S05:4500,S06:13250,S07:16500,S08:21250,S09:6500,S10:6500,S11:6750 };
  const SEAS   = { S01:0,S02:1100,S03:4400,S04:4450,S05:3100,S06:2400,S07:5350,S08:1250,S09:1765,S10:3600,S11:1075 };

  // ---- Build item master + opening stock ----------------------------------
  function build() {
    const items = [];
    const stock = [];
    const put = (item_id, location, qty) => { if (qty > 0) stock.push({ item_id, location, qty, lot: null }); };

    // Base ingredients — quantities from 2026-07-02 count (Inventory 70226.xlsx)
    items.push({ id:"SEED-WHITE", code:"SEED-WHITE", name:"Sunflower Seed - Low Salt / White (Sunrich)", flavor:"Raw seed", category:"seed", unit:"lbs", reorder:15000, supplier:"seed" });
    items.push({ id:"SEED-BROWN", code:"SEED-BROWN", name:"Sunflower Seed - Processed (Brown)", flavor:"Raw seed", category:"seed", unit:"lbs", reorder:20000, supplier:"seed" });
    items.push({ id:"MALTO", code:"MALTO", name:"Maltodextrin (Clintose CR-10)", flavor:"Base", category:"seed", unit:"lbs", reorder:3000, supplier:"seas" });
    items.push({ id:"OIL", code:"OIL", name:"Oil", flavor:"Base", category:"seed", unit:"lbs", reorder:100, supplier:"seas" });
    items.push({ id:"STEVIA", code:"STEVIA", name:"Stevia", flavor:"Base", category:"seasoning", unit:"lbs", reorder:20, supplier:"seas" });
    put("SEED-WHITE", "D-01-L1", 27000); put("SEED-BROWN", "D-02-L1", 39000); put("MALTO", "D-03-L1", 7500);
    put("OIL", "PROD-WEIGH", 175); put("STEVIA", "PROD-WEIGH", 32.5);

    FL.forEach(([c, name]) => {
      items.push({ id:"SEAS-"+c, code:"SEAS-"+c, name:"Seasoning - "+name, flavor:name, category:"seasoning", unit:"lbs", reorder:800, supplier:"seas" });
      items.push({ id:"FILM4-"+c, code:"F4-"+c, name:"Film 4oz - "+name, flavor:name, category:"film4", unit:"impr", reorder:120000, supplier:"film" });
      items.push({ id:"FILM15-"+c, code:"F15-"+c, name:"Film 1.5oz - "+name, flavor:name, category:"film15", unit:"impr", reorder:100000, supplier:"film" });
      items.push({ id:"BAG4-"+c, code:"B4-"+c, name:"Bags 4oz - "+name, flavor:name, category:"bag4", unit:"bags", reorder:8640, supplier:null });
      items.push({ id:"BAG15-"+c, code:"B15-"+c, name:"Bags 1.5oz - "+name, flavor:name, category:"bag15", unit:"bags", reorder:8640, supplier:null });
    });
    FL.forEach(([c], i) => {
      const sec = ["A", "B"][i % 2], bay = String((i % 6) + 1).padStart(2, "0");
      put("BAG4-"+c, sec+"-"+bay+"-L1", BAG4[c]);
      put("BAG15-"+c, sec+"-"+bay+"-L2", BAG15[c]);
      put("FILM4-"+c, "C-"+bay+"-L"+((i % 3) + 1), FILM4[c]);
      put("FILM15-"+c, "C-"+bay+"-L4", FILM15[c]);
      put("SEAS-"+c, "PROD-WEIGH", SEAS[c]);
    });

    const bk = [
      ["BKT-UNPR","Bucket - Unprinted Standard","ST-01",7345,"buck",1000],
      ["BKT-STD","Bucket - Standard (printed)","ST-01",1525,"buck",1000],
      ["BKT-SPORTS","Bucket - Backyard Sports","ST-02",767,"buck",300],
      ["BKT-CAMO","Bucket - Hunting (Camo)","ST-02",306,"buck",300],
      ["LID-BLUE","Bucket Lids - Blue","ST-03",8938,"buck",1000],
      ["LID-DKBLUE","Bucket Lids - Blue (alt)","ST-03",649,"buck",500],
      ["LID-BLACK","Bucket Lids - Black","ST-03",287,"buck",300],
      ["BKT-BOX","Bucket Box","D-06-L1",7175,"pack",2000],
      ["BKT-STICKER","Bucket Stickers","CAGE",37000,"pack",5000]
    ];
    bk.forEach(([id,name,loc,qty,sup,re]) => {
      items.push({ id, code:id, name, flavor:"Bucket", category:"bucket", unit:"each", reorder:re, supplier:sup });
      put(id, loc, qty);
    });

    const pk = [
      ["POLY-SM","Poly Mailers - Small","D-07-L1",28800,10000],
      ["POLY-LG","Poly Mailers - Large","D-07-L2",42000,10000],
      ["CASEBOX-12","Box 12pk 4oz","D-08-L1",72508,8000],
      ["BOX-24","Box 24pk 4oz","D-08-L2",1025,2000],
      ["MCASE-BOX","Master Case Box","D-09-L1",8025,5000],
      ["WM-SHIPPER","Wal-Mart Shipper","D-10-L2",30550,2000],
      ["TGT-SHIPPER","Target MC Shipper","D-10-L3",4900,2000],
      ["STICKER-SM","Small Stickers","CAGE",112000,50000]
    ];
    pk.forEach(([id,name,loc,qty,re]) => {
      items.push({ id, code:id, name, flavor:"Packaging", category:"packaging", unit:"each", reorder:re, supplier:"pack" });
      put(id, loc, qty);
    });
    items.push({ id:"DISPLAY-4OZ", code:"DISPLAY-4OZ", name:"Retail Display 4oz", flavor:"Display", category:"display", unit:"each", reorder:1000, supplier:"pack" });
    put("DISPLAY-4OZ", "D-10-L1", 6150);

    const slv = [["S01",19920],["S02",31200],["S03",19360],["S04",28580],["S05",14040],["S07",32160],["S08",22800],["CHZ",24000]];
    slv.forEach(([c, qty]) => {
      const nm = c === "CHZ" ? "Cheeseburger" : (FL.find(f => f[0] === c) || [null, c])[1];
      items.push({ id:"SLV-"+c, code:"SLV-"+c, name:"Target Sleeve - "+nm, flavor:nm, category:"mastercase", unit:"each", reorder:5000, supplier:"pack" });
      put("SLV-"+c, "CAGE", qty);
    });

    return { items, stock, suppliers: SUPPLIERS, config: CONFIG };
  }

  const SMACKIN = { build, allLocations, rackSlots, CONFIG, SNAPSHOT: "2026-07-02",
    RECV_SUPPLIERS, RECV_CATEGORIES, RECV_STATUSES, CONDITIONS,
    RETURN_CHANNELS, RETURN_REASONS, RETURN_DISPOSITIONS };
  if (typeof module !== "undefined" && module.exports) module.exports = SMACKIN;
  root.SMACKIN_SEED = SMACKIN;
})(typeof window !== "undefined" ? window : globalThis);

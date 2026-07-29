/* ============================================================================
   Smackin' Inventory — shared seed data + warehouse config
   Used by BOTH the web app (local mode) and the Supabase SQL seed generator.
   All quantities from the Inventory SLC workbook, snapshot dated 2026-07-02.
   ============================================================================ */
(function (root) {
  "use strict";

  // ---- Warehouse location model (Racking Location System SOP) -------------
  // Section-Bay-Level, e.g. A-05-L3. Bay 01 starts at the dock doors.
  // Real racking geometry per the 3D Facility Map (each section can differ):
  //   from = first bay #, bays = last bay #, levels = shelf levels, skip = missing bays (openings).
  const SECTION_GEOM = [
    { id: "A", from: 1, bays: 28, levels: 4 },
    { id: "B", from: 1, bays: 28, levels: 4 },
    { id: "C", from: 1, bays: 28, levels: 4 },
    { id: "D", from: 1, bays: 28, levels: 4 },
    { id: "E", from: 1, bays: 22, levels: 3, skip: [17, 18, 19, 20], use: "Raw seed (received)" }, // back wall, emergency-exit gap bays 17-20
    { id: "F", from: 3, bays: 22, levels: 4 },  // bays 1-2 removed for the Mixing-room door
    { id: "G", from: 1, bays: 12, levels: 4 },
    { id: "H", from: 1, bays: 4,  levels: 4 }
  ];
  // 4 oz floor storage — one entry per flavor LINE; high-demand flavors have 2 lines (from the map).
  const FLOOR_4OZ = [
    ["S01", "Original", 2], ["S02", "Cinnamon Churro", 2], ["S03", "Backyard BBQ", 2], ["S04", "Garlic Parmesan", 2],
    ["S05", "Dill Pickle", 2], ["S06", "Cracked Pepper", 1], ["S07", "Cheddar Jalapeno", 2], ["S08", "Ranch", 2],
    ["S09", "Maple Brown Sugar", 1], ["S10", "Lemon Pepper", 1], ["S11", "Sour Cream & Onion", 1], ["S12", "Limited Flavor", 1],
    ["S13", "Teriyaki", 1], ["S14", "Taco", 1], ["S15", "Salsa", 1], ["S16", "Guacamole", 1], ["S17", "Chile Limon", 1],
    ["S18", "Honey Sriracha", 1], ["S19", "Deep Dish Pizza", 1], ["S20", "Strawberry Cheesecake", 1], ["S21", "Loaded Nacho Potato", 1],
    ["S22", "Cheddar Ghost Pepper", 1], ["S23", "Parmuffalo", 1], ["S24", "Cheeseburger", 1], ["S25", "Buffalo Ranch", 1], ["S26", "Peanut Butter & Jelly", 1]
  ];
  // 1.5 oz floor storage (back demarcated area) — 8 SKUs S27-S34, each 2 rows (Salvador's map spec).
  const FLOOR_15OZ = [
    ["S27", "Original", 2], ["S28", "Cinnamon Churros", 2], ["S29", "Backyard BBQ", 2], ["S30", "Garlic Parmesan", 2],
    ["S31", "Dill Pickle", 2], ["S32", "Cracked Pepper", 2], ["S33", "Cheddar Jalapeno", 2], ["S34", "Ranch", 2]
  ];
  const CONFIG = {
    sections: SECTION_GEOM.map(s => s.id),   // ["A".."H"] — real racking runs
    sectionGeom: SECTION_GEOM,
    baysPerSection: 28,               // legacy default (per-section geometry lives in sectionGeom)
    levels: ["L1", "L2", "L3", "L4"], // L1 floor .. L4 top
    docks: [11, 12, 13, 14, 15, 16, 17, 18, 19], // 19 = office end, 11 = far end
    // ST-01..08 kept for existing bucket/packaging stock; finished bags now live on the S-floor slots.
    zones: ["RECEIVING", "STAGING", "RETURNS", "QUARANTINE", "WIP", "PACKOUT", "CAGE", "PROD-WEIGH", "PROD-PACK", "SHIPPING", "PACKAGING",
            "ST-01", "ST-02", "ST-03", "ST-04", "ST-05", "ST-06", "ST-07", "ST-08"],
    floor4: FLOOR_4OZ,
    floor15: FLOOR_15OZ
  };
  // Floor location codes: 4 oz = S01.. (with -1/-2 when a flavor has 2 lines); 1.5 oz = S27.. (one per core flavor).
  function floorLineSlots(arr) { const out = []; arr.forEach(f => { for (let l = 1; l <= f[2]; l++) out.push(f[2] > 1 ? f[0] + "-" + l : f[0]); }); return out; }
  function floor4Slots() { return floorLineSlots(FLOOR_4OZ); }
  function floor15Slots() { return floorLineSlots(FLOOR_15OZ); }
  // Label lookup for floor codes (for tiles/pickers): code -> "flavor · 4oz/1.5oz".
  function floorLabel(code) {
    const b = String(code).split("-")[0];
    const f4 = FLOOR_4OZ.find(f => f[0] === b); if (f4) return f4[1] + " · 4oz";
    const f15 = FLOOR_15OZ.find(f => f[0] === b); if (f15) return f15[1] + " · 1.5oz";
    return "";
  }

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
    SECTION_GEOM.forEach(s => {
      for (let b = (s.from || 1); b <= s.bays; b++) {
        if (s.skip && s.skip.indexOf(b) >= 0) continue;
        const bb = String(b).padStart(2, "0");
        for (let l = 1; l <= (s.levels || 4); l++) out.push(s.id + "-" + bb + "-L" + l);
      }
    });
    return out;
  }
  function floorSlots() { return [...floor4Slots(), ...floor15Slots()]; }
  function allLocations() {
    return [...rackSlots(), ...floorSlots(), ...CONFIG.zones, ...CONFIG.docks.map(d => "DOCK-" + d)];
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

  // ---- LTO / co-brand flavors — 4oz finished bags only (no film/seasoning SKUs tracked yet).
  // On-hand from the 2026-07-16 inventory sheet. Codes: the WIP "SMACKIN' WIP" Google Sheet's
  // RECIPE-INGREDIENTS LIST tab carries some of these as "LE <name>" recipe rows (noted below);
  // the rest have no code/UPC on file anywhere checked (WIP tabs, skus.js) — L## are new internal
  // codes assigned here for tracking only, not a real SKU/UPC. Reorder left at 0 (no stock GOAL)
  // so these never inflate production targets or trip low/out-of-stock alerts.
  const LE = [
    ["L01", "Cheeseburger"],                    // WIP RECIPE list: "LE Cheese Burger"
    ["L02", "Deep Dish Pizza"],                  // WIP RECIPE list: "LE Pizza"
    ["L03", "Good Good Salt & Vinegar"],         // co-brand; no WIP code found
    ["L04", "Honey BBQ (A-Rod)"],                // co-brand; no WIP code found
    ["L05", "Salsa"],                            // WIP RECIPE list: "LE SALSA"
    ["L06", "Taco"],                             // WIP RECIPE list: "LE TACO"
    ["L07", "Guacamole"],                        // WIP RECIPE list: "LE GUACAMOLE"
    ["L08", "Chili Cheese Dog"],                 // no WIP code found
    ["L09", "Blueberry Pie"],                    // no WIP code found
    ["L10", "Birthday Cake"],                    // no WIP code found; 0 on hand
    ["L11", "Mexican Street Corn"],              // no WIP code found; 0 on hand
    ["L12", "Nashville Hot"],                    // no WIP code found; 0 on hand
    ["L13", "Bacon Mac & Cheese"],               // no WIP code found; 0 on hand
    ["L14", "Korean BBQ (King of Juco)"],        // no WIP code found; 0 on hand
    ["L15", "S'mores"],                          // no WIP code found; 0 on hand
    ["L16", "Teriyaki (Ana Bruni)"],             // WIP RECIPE list: "LE Ana Bruni Teriyaki"; 0 on hand
    ["L17", "Sweet Thai Chili"],                 // no WIP code found; 0 on hand
    ["L18", "Loaded Potato"]                     // WIP RECIPE list: "LE Loaded Baked Paotato"; 0 on hand
  ];
  const BAG4LE = { L01:5800, L02:1600, L03:6200, L04:6700, L05:2600, L06:3200, L07:5500, L08:1300, L09:5000,
    L10:0, L11:0, L12:0, L13:0, L14:0, L15:0, L16:0, L17:0, L18:0 };

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

    // LTO / co-brand flavors — finished 4oz bags only, no Target/Master Case stock goal (reorder:0)
    LE.forEach(([c, name]) => {
      items.push({ id:"BAG4-"+c, code:"B4-"+c, name:"Bags 4oz - "+name, flavor:name, category:"bag4", unit:"bags", reorder:0, supplier:null });
    });
    LE.forEach(([c], i) => {
      const sec = ["C", "D"][i % 2], bay = String(20 + Math.floor(i / 2)).padStart(2, "0");
      put("BAG4-"+c, sec+"-"+bay+"-L1", BAG4LE[c]);
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

  const SMACKIN = { build, allLocations, rackSlots, floorSlots, floor4Slots, floor15Slots, floorLabel, CONFIG, SNAPSHOT: "2026-07-02",
    RECV_SUPPLIERS, RECV_CATEGORIES, RECV_STATUSES, CONDITIONS,
    RETURN_CHANNELS, RETURN_REASONS, RETURN_DISPOSITIONS };
  if (typeof module !== "undefined" && module.exports) module.exports = SMACKIN;
  root.SMACKIN_SEED = SMACKIN;
})(typeof window !== "undefined" ? window : globalThis);

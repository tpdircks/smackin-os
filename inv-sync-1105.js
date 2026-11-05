/* inv-sync-1105.js
   One cloud pass for Adriana's Nov 5, 2026 inventory counts.
   Polls until DB.mode is cloud. The localStorage flag
   smackin_inv_sync_1105_adriana_done and the shared kv done flag
   stop a later browser from writing the same pass again.
   A row is written only when a fresh on-hand read still equals
   os_total_before within 0.5. A newer total is a manual edit:
   it is skipped and logged. A target over 100000 is refused.
   DB.adjustTotal applies the new total. This module does not move
   stock between racks and does not rewrite rack locations itself.
   Lot-tracked raw materials stay in SKIPPED and are not adjusted:
   seasoning, seed, maltodextrin, oil, stevia, and any other
   multi-lot raw row. Seed, maltodextrin, oil, and stevia had no
   validated change in this pass. Packaging, bags, film, boxes,
   buckets, and supplies are applied, including sleeves (mastercase)
   and the display head. New SKUs use DB.createItem, then the total.
   A zero-quantity placeholder is not created. */
(function (root) {
  "use strict";
  var LOCAL_FLAG = "smackin_inv_sync_1105_adriana_done";
  var CLOUD_KEY = "inv-sync-2026-11-05-adriana";
  var REPORT_KEY = "inv-sync-2026-11-05-adriana-report";
  var NOTE = "inv-sync-1105-adriana";
  var LOCK_MS = 180000;
  var CAP = 100000;
  var TOL = 0.5;
  /* Lot-tracked raw materials. Listed here instead of being passed
     to adjustTotal. Totals below are the sheet targets that were
     validated and then held. */
  var SKIPPED = [
    { code: "SEAS - RCH UP", before: 2050, qty: 1500, category: "SEASONING", desc: "Ranch Upgrade", unit: "lbs" },
    { code: "TMP - SEAS - JalpRch – Seasoning", before: 994, qty: 497, category: "SEASONING", desc: "Jalapeno Ranch", unit: "lbs" },
    { code: "TMP - SEAS- ChickenBaconTypeRanch", before: 550, qty: 500, category: "SEASONING", desc: "Chiken Bacon Type Ranch", unit: "lbs" },
    { code: "TMP-SEAS-BCJALAP", before: 700, qty: 0, category: "SEASONING", desc: "Bacon Type Jalapeno Popper", unit: "lbs" },
    { code: "TMP-SEAS-LOADEDPOTATO", before: 315, qty: 180, category: "SEASONING", desc: "Loaded Potato Popcorn", unit: "lbs" },
    { code: "TMP-SEAS-Snickerdoodle Style - seasoning", before: 591, qty: 1141, category: "SEASONING", desc: "Glazed Donut Style", unit: "lbs" },
    { code: "SEAS-CPRN", before: 500, qty: 150, category: "seasoning", desc: "Chipotle Ranch", unit: "lbs" },
    { code: "SEAS-DLRN", before: 500, qty: 475, category: "seasoning", desc: "Dill Ranch Snack", unit: "lbs" },
    { code: "SEAS-HMSN", before: 550, qty: 500, category: "seasoning", desc: "Honey Mustard Snack", unit: "lbs" },
    { code: "SEAS-S10", before: 2700, qty: 2350, category: "seasoning", desc: "Lemon Pepper", unit: "lbs" },
    { code: "TMP-SEAS-BIRTHDAYCAKE", before: 350, qty: 200, category: "seasoning", desc: "Birthday Cake", unit: "lbs" },
    { code: "TMP-SEAS-BLUEBERRYMUFFIN", before: 1974, qty: 687, category: "seasoning", desc: "Blueberry Muffin", unit: "lbs" },
    { code: "TMP-SEAS-CHICKENNOODLE", before: 0, qty: 11, category: "seasoning", desc: "Chicken Noodle", unit: "lbs" },
    { code: "TMP-SEAS-EVERYTHINGBAGEL", before: 0, qty: 92.5, category: "seasoning", desc: "Everything Bagel", unit: "lbs" },
    { code: "TMP-SEAS-FLAMINGHOTCHEDDARGHOST", before: 0, qty: 45, category: "seasoning", desc: "Flaming Hot Cheddar Ghost Pepper", unit: "lbs" },
    { code: "TMP-SEAS-GARDENSALSASNACK", before: 0, qty: 238.2, category: "seasoning", desc: "Garden Salsa Snack", unit: "lbs" },
    { code: "TMP-SEAS-HONEYBBQPOPCORN", before: 0, qty: 1225, category: "seasoning", desc: "Honey BBQ Popcorn", unit: "lbs" },
    { code: "TMP-SEAS-KOREANBBQSNACK", before: 1150, qty: 1200, category: "seasoning", desc: "Korean BBQ Snack", unit: "lbs" },
    { code: "TMP-SEAS-MAPLEBOURBONDEREKWOLF", before: 0, qty: 6.9, category: "seasoning", desc: "Maple Bourbon,Derek Wolf", unit: "lbs" },
    { code: "TMP-SEAS-NASHVILLEHOT", before: 600, qty: 300, category: "seasoning", desc: "Nashville Hot", unit: "lbs" },
    { code: "TMP-SEAS-PUMPKINPIESPICE", before: 0, qty: 47, category: "seasoning", desc: "Pumpkin Pie Spice", unit: "lbs" },
    { code: "TMP-SEAS-SALTVINEGAR", before: 0, qty: 3500, category: "seasoning", desc: "Salt & Vinegar", unit: "lbs" },
    { code: "TMP-SEAS-SMORESSEASONING", before: 0, qty: 4.4, category: "seasoning", desc: "S'mores Seasoning", unit: "lbs" },
    { code: "TMP-SEAS-SPICYGUACAMOLE", before: 0, qty: 200, category: "seasoning", desc: "Spicy Guacamole", unit: "lbs" },
    { code: "TMP-SEAS-SPICYNACHO", before: 0, qty: 700, category: "seasoning", desc: "Spicy Nacho", unit: "lbs" },
    { code: "TMP-SEAS-TIKKAMASSALA", before: 0, qty: 14, category: "seasoning", desc: "Tikka Massala", unit: "lbs" }
  ];
  var ROWS = [
    { code: "LID - WHITE", before: 28044, qty: 22770, category: "BACKYARD SP BUCKETS", desc: "BUCKET LID- WHITE", unit: "ea" },
    { code: "Box - Cashew 6", before: 42160, qty: 40600, category: "BOX 12 PCK", desc: "CASHEW  6 CT", unit: "box" },
    { code: "BOX - BKT SPTS WH 6CT", before: 1800, qty: 2025, category: "BUCKETS BOX", desc: "BUCKET BOX  SPORTS WH 6CT", unit: "box" },
    { code: "TMP-F4-COTTONCANDY", before: 114000, qty: 45150, category: "ROLL FILM 4 OZ", desc: "COTTON CANDY", unit: "bag" },
    { code: "BAG15-S02", before: 16500, qty: 16000, category: "bag15", desc: "CINNAMON CHURRO", unit: "bags" },
    { code: "BAG15-S06", before: 6750, qty: 6500, category: "bag15", desc: "CRACKED PEPPER", unit: "bags" },
    { code: "BAG15-S07", before: 25500, qty: 25000, category: "bag15", desc: "CHEDDAR JALAPENO", unit: "bags" },
    { code: "BAG15-S08", before: 11250, qty: 10750, category: "bag15", desc: "RANCH", unit: "bags" },
    { code: "BAG15-S09", before: 29250, qty: 27800, category: "bag15", desc: "MAPLE BROWN SUGAR", unit: "bags" },
    { code: "TMP-B15-CHEDDARSOURCREAM", before: 0, qty: 5000, category: "bag15", desc: "CHEDDAR SOUR CREAM", unit: "bags", create: true },
    { code: "TMP-B15-PEANUTBUTTERJELLY", before: 250, qty: 200, category: "bag15", desc: "PEANUT BUTTER & JELLY", unit: "bags" },
    { code: "BAG4-L02", before: 13400, qty: 12500, category: "bag4", desc: "DEEP DISH PIZZA", unit: "bags" },
    { code: "BAG4-L03", before: 1200, qty: 800, category: "bag4", desc: "GOOD GOOD VINEGAR SALT", unit: "bags" },
    { code: "BAG4-L04", before: 8200, qty: 8500, category: "bag4", desc: "HONEY BBQ", unit: "bags" },
    { code: "BAG4-L05", before: 10200, qty: 11000, category: "bag4", desc: "SALSA", unit: "bags" },
    { code: "BAG4-L09", before: 6800, qty: 5300, category: "bag4", desc: "BLUEBERRY PIE", unit: "bags" },
    { code: "BAG4-L10", before: 20800, qty: 20200, category: "bag4", desc: "BIRTHDAY CAKE", unit: "bags" },
    { code: "BAG4-L12", before: 10100, qty: 8700, category: "bag4", desc: "NASHVILLE HOT", unit: "bags" },
    { code: "BAG4-L14", before: 11400, qty: 11200, category: "bag4", desc: "KING OF JUCO  - KOREAN BBQ", unit: "bags" },
    { code: "BAG4-L16", before: 4300, qty: 4000, category: "bag4", desc: "TERIYAKI - ANA BRUNI", unit: "bags" },
    { code: "BAG4-L18", before: 230, qty: 330, category: "bag4", desc: "LOADED POTATO", unit: "bags" },
    { code: "BAG4-L19", before: 57700, qty: 57500, category: "bag4", desc: "COTTON CANDY", unit: "bags" },
    { code: "BAG4-L20", before: 100, qty: 0, category: "bag4", desc: "HONEY MUSTARD", unit: "bags" },
    { code: "BAG4-S01", before: 6400, qty: 7900, category: "bag4", desc: "\"OG\" ORIGINAL", unit: "bags" },
    { code: "BAG4-S02", before: 8000, qty: 3300, category: "bag4", desc: "CINNAMON CHURRO", unit: "bags" },
    { code: "BAG4-S03", before: 1800, qty: 11800, category: "bag4", desc: "BBQ", unit: "bags" },
    { code: "BAG4-S04", before: 28000, qty: 31700, category: "bag4", desc: "GARLIC PARMESAN", unit: "bags" },
    { code: "BAG4-S05", before: 5000, qty: 19700, category: "bag4", desc: "DILL PICKLE", unit: "bags" },
    { code: "BAG4-S06", before: 5400, qty: 5300, category: "bag4", desc: "CRACKED PEPPER", unit: "bags" },
    { code: "BAG4-S07", before: 22700, qty: 16200, category: "bag4", desc: "CHEDDAR JALAPENO", unit: "bags" },
    { code: "BAG4-S08", before: 12600, qty: 7100, category: "bag4", desc: "RANCH", unit: "bags" },
    { code: "BAG4-S09", before: 11500, qty: 11400, category: "bag4", desc: "MAPLE BROWN SUGAR", unit: "bags" },
    { code: "BAG4-S10", before: 7000, qty: 6700, category: "bag4", desc: "LEMON PEPPER", unit: "bags" },
    { code: "BAG4-S11", before: 7200, qty: 7000, category: "bag4", desc: "SOUR CREAM & ONION", unit: "bags" },
    { code: "TMP-B4-BACONJALAPENO", before: 26400, qty: 15200, category: "bag4", desc: "BACON JALAPENO SPORTS", unit: "bags" },
    { code: "TMP-B4-CHEDDARSOURCREAM", before: 3500, qty: 2000, category: "bag4", desc: "CHEDDAR SOUR CREAM", unit: "bags" },
    { code: "TMP-B4-CHIPOTLERANCH", before: 7500, qty: 7300, category: "bag4", desc: "CHIPOTLE RANCH", unit: "bags" },
    { code: "TMP-B4-DILLRANCH", before: 100, qty: 0, category: "bag4", desc: "DILL RANCH", unit: "bags" },
    { code: "TMP-B4-LOADEDNACHO", before: 49000, qty: 43700, category: "bag4", desc: "LOADED NACHO  SPORTS", unit: "bags" },
    { code: "TMP-B4-STRAWBERRYCHEESECAKE", before: 48200, qty: 50100, category: "bag4", desc: "STRAWBERRY CHEESECAKE SPORTS", unit: "bags" },
    { code: "BKT-BOX", before: 5900, qty: 5825, category: "bucket", desc: "BUCKET BOX ( STANDART AND BACKYARD)", unit: "each" },
    { code: "BKT-UNPR", before: 2618, qty: 2856, category: "bucket", desc: "UNPRINTED STANDARD BLUE BUCKET", unit: "each" },
    { code: "SUP-DISHEASV", before: 0, qty: 200, category: "display", desc: "Display Head  Salt & Vinegar", unit: "ea", create: true },
    { code: "FILM15-S03", before: 100800, qty: 87400, category: "film15", desc: "BACKYARD BBQ", unit: "impr" },
    { code: "FILM15-S04", before: 94500, qty: 95000, category: "film15", desc: "GARLIC PARMESAN", unit: "impr" },
    { code: "FILM15-S09", before: 36400, qty: 9200, category: "film15", desc: "MAPLE BROWN SUGAR", unit: "impr" },
    { code: "FILM15-S11", before: 81360, qty: 79160, category: "film15", desc: "SOUR CREAM & ONION", unit: "impr" },
    { code: "TMP-F15-ADVENTBAG2025", before: 0, qty: 9000, category: "film15", desc: "ADVENT BAG 2025", unit: "impr", create: true },
    { code: "TMP-F15-GRIMREAPERRANCH", before: 0, qty: 7000, category: "film15", desc: "GRIM REAPER RANCH", unit: "impr", create: true },
    { code: "TMP-F15-HONEYSHIRACHA", before: 0, qty: 1200, category: "film15", desc: "HONEY SHIRACHA", unit: "ea" },
    { code: "TMP-F15-KETCHUP", before: 0, qty: 1400, category: "film15", desc: "KETCHUP", unit: "ea" },
    { code: "TMP-F15-PEANUTBUTTERJELLY", before: 0, qty: 4150, category: "film15", desc: "PEANUT BUTTER &  JELLY", unit: "ea" },
    { code: "TMP-F15-SOURSCREAMINONION", before: 0, qty: 7000, category: "film15", desc: "SOUR SCREAMIN ONION", unit: "impr", create: true },
    { code: "TMP-F15-TERIYAKI", before: 0, qty: 500, category: "film15", desc: "TERIYAKI", unit: "ea" },
    { code: "TMP-F275-GARLIC", before: 89200, qty: 88600, category: "film275", desc: "GARLIC PARMESAN", unit: "ea" },
    { code: "FILM4-S03", before: 117000, qty: 48000, category: "film4", desc: "BACKYARD BBQ", unit: "impr" },
    { code: "FILM4-S04", before: 120300, qty: 30000, category: "film4", desc: "GARLIC PARMESAN", unit: "impr" },
    { code: "FILM4-S05", before: 123000, qty: 54400, category: "film4", desc: "DILL PICKLE", unit: "impr" },
    { code: "FILM4-S07", before: 114900, qty: 48300, category: "film4", desc: "CHEDDAR JALAPENO", unit: "impr" },
    { code: "TMP-F4-BACKYARDSPORTSBBQ", before: 0, qty: 1850, category: "film4", desc: "BACKYARD SPORTS BBQ", unit: "impr", create: true },
    { code: "TMP-F4-BACKYARDSPORTSLOADEDNACHOPABLO", before: 0, qty: 6000, category: "film4", desc: "BACKYARD SPORTS LOADED NACHO-PABLO", unit: "impr", create: true },
    { code: "TMP-F4-BACONJALAPENO", before: 0, qty: 31100, category: "film4", desc: "BACKYARD SPORTS BACON JALAPENO K - MAN", unit: "ea" },
    { code: "TMP-F4-BACONMCCHEESE", before: 0, qty: 20, category: "film4", desc: "BACON MAC & CHEESE", unit: "ea" },
    { code: "TMP-F4-BLUEBERRYPIE", before: 0, qty: 14000, category: "film4", desc: "BLUEBERRY PIE", unit: "ea" },
    { code: "TMP-F4-CHEDDARSOURCREAM", before: 0, qty: 36000, category: "film4", desc: "CHEDDAR SOUR CREAM", unit: "ea" },
    { code: "TMP-F4-CHEESEBURGER", before: 81000, qty: 51600, category: "film4", desc: "CHEESEBURGUER", unit: "ea" },
    { code: "TMP-F4-CHIPOTLERANCH", before: 0, qty: 45220, category: "film4", desc: "CHIPOTLE RANCH", unit: "ea" },
    { code: "TMP-F4-DEEPDISHPIZZA", before: 0, qty: 78900, category: "film4", desc: "DEEP DISH PIZZA", unit: "ea" },
    { code: "TMP-F4-FLAMEGRILLEDSTEAK", before: 0, qty: 400, category: "film4", desc: "FLAME GRILLED STEAK", unit: "impr", create: true },
    { code: "TMP-F4-FUNNELCAKE", before: 0, qty: 6600, category: "film4", desc: "FUNNEL CAKE", unit: "impr", create: true },
    { code: "TMP-F4-HONEYBBQALEXRODRIGUES", before: 0, qty: 63600, category: "film4", desc: "HONEY BBQ  ALEX RODRIGUES", unit: "ea" },
    { code: "TMP-F4-KGHONEYMUSTARD", before: 0, qty: 10000, category: "film4", desc: "KONNOR GRIFFIN HONEY MUSTARD", unit: "impr", create: true },
    { code: "TMP-F4-KOREANBBQKINGOFJUCO", before: 0, qty: 96300, category: "film4", desc: "KOREAN BBQ   - KING OF JUCO", unit: "ea" },
    { code: "TMP-F4-MEXICANSTREET", before: 0, qty: 4000, category: "film4", desc: "MEXICAN STREET", unit: "ea" },
    { code: "TMP-F4-NASHVILLEHOT", before: 0, qty: 1050, category: "film4", desc: "NASHVILLE HOT", unit: "ea" },
    { code: "TMP-F4-SWEETTHAICHILI", before: 0, qty: 50, category: "film4", desc: "SWEET THAI CHILI", unit: "ea" },
    { code: "SLV-S01", before: 12960, qty: 12240, category: "mastercase", desc: "Sleeves - Original", unit: "each" },
    { code: "SLV-S02", before: 27840, qty: 27120, category: "mastercase", desc: "Sleeves - Cinnamon Churro", unit: "each" },
    { code: "SLV-S03", before: 2400, qty: 3360, category: "mastercase", desc: "Sleeves - BBQ", unit: "each" },
    { code: "SLV-S04", before: 18720, qty: 17920, category: "mastercase", desc: "Sleeves - Garlic Parmesan", unit: "each" },
    { code: "SLV-S05", before: 1890, qty: 1350, category: "mastercase", desc: "Sleeves - Dill Pickle", unit: "each" },
    { code: "SLV-S07", before: 25200, qty: 24240, category: "mastercase", desc: "Sleeves - Cheddar Jalapeno", unit: "each" },
    { code: "POLY-LG", before: 26000, qty: 18000, category: "packaging", desc: "Poly Mailers Smackin'  New Bag Large 11 units", unit: "each" },
    { code: "SUP-BLUEINFLUENCER", before: 0, qty: 32, category: "packaging", desc: "BOX BLUE INFLUENCER", unit: "ea", create: true },
    { code: "SUP-BOXDHL", before: 57, qty: 101, category: "packaging", desc: "Box DHL", unit: "ea" },
    { code: "SUP-BOXUSP", before: 3, qty: 29, category: "packaging", desc: "Box USPS", unit: "ea" },
    { code: "SUP-CARDFASTAMAZON", before: 0, qty: 10010, category: "packaging", desc: "Card Fast delivery / Amazon", unit: "ea", create: true },
    { code: "SUP-HANDWRAPRED", before: 0, qty: 3, category: "packaging", desc: "Hand Wrap - Strech Film - Cast Dark Red Lot #1041785", unit: "ea", create: true },
    { code: "SUP-LABEL12-BBQ", before: 0, qty: 35000, category: "packaging", desc: "BBQ", unit: "ea", create: true },
    { code: "SUP-LABEL12-CHEDDARJALAPENO", before: 0, qty: 17500, category: "packaging", desc: "CHEDDAR JALAPENO", unit: "ea", create: true },
    { code: "SUP-LABEL12-CINNAMONCHURROS", before: 0, qty: 31500, category: "packaging", desc: "CINNAMON CHURROS", unit: "ea", create: true },
    { code: "SUP-LABEL12-CRACKEDPEPPER", before: 0, qty: 68500, category: "packaging", desc: "CRACKED PEPPER", unit: "ea", create: true },
    { code: "SUP-LABEL12-DILLPICKLE", before: 0, qty: 36000, category: "packaging", desc: "DILL PICKLE", unit: "ea", create: true },
    { code: "SUP-LABEL12-GARLICPARMESAN", before: 0, qty: 22000, category: "packaging", desc: "GARLIC PARMESAN", unit: "ea", create: true },
    { code: "SUP-LABEL12-LEMONPEPPER", before: 0, qty: 35000, category: "packaging", desc: "LEMON PEPPER", unit: "ea", create: true },
    { code: "SUP-LABEL12-MAPLE", before: 0, qty: 31500, category: "packaging", desc: "MAPLE", unit: "ea", create: true },
    { code: "SUP-LABEL12-ORIGINAL", before: 0, qty: 76500, category: "packaging", desc: "ORIGINAL", unit: "ea", create: true },
    { code: "SUP-LABEL12-RANCH", before: 0, qty: 39000, category: "packaging", desc: "RANCH", unit: "ea", create: true },
    { code: "SUP-LABEL12-SOURCREAMONION", before: 0, qty: 53000, category: "packaging", desc: "SOUR CREAM ONION", unit: "ea", create: true },
    { code: "SUP-LABEL12-VARIETY", before: 0, qty: 81000, category: "packaging", desc: "VARIETY", unit: "ea", create: true },
    { code: "SUP-LABPAP", before: 80850, qty: 78750, category: "packaging", desc: "Label Papper", unit: "ea" },
    { code: "SUP-SHURTAPE", before: 0, qty: 144, category: "packaging", desc: "3\" Hand Tape  \"ShurtTape \"", unit: "ea", create: true },
    { code: "TGT-SHIPPER", before: 6650, qty: 6300, category: "packaging", desc: "TARGET MASTER CASE 12 Box 6 Pck", unit: "each" },
    { code: "WM-SHIPPER", before: 21450, qty: 21700, category: "packaging", desc: "WAL MART 2 PACK SHIPPER", unit: "each" },
    { code: "SUP-3HANTAP", before: 864, qty: 720, category: "supply", desc: "3\" Hand Tape \" IPG \"", unit: "ea" },
    { code: "SUP-FABCON1", before: 1, qty: 0, category: "supply", desc: "Fabuloso Concentrated 1.64 GL", unit: "ea" },
    { code: "SUP-FOR", before: 500, qty: 0, category: "supply", desc: "Fork", unit: "ea" },
    { code: "SUP-GAYDHL", before: 45, qty: 29, category: "supply", desc: "Gaylord  Pallet Black  \" DHL\"", unit: "ea" },
    { code: "SUP-GLOX", before: 7000, qty: 6500, category: "supply", desc: "Gloves", unit: "ea" },
    { code: "SUP-GLOXX", before: 32100, qty: 31700, category: "supply", desc: "Gloves", unit: "ea" },
    { code: "SUP-GLOXXX", before: 8800, qty: 7800, category: "supply", desc: "Gloves", unit: "ea" },
    { code: "SUP-PALWOO", before: 281, qty: 252, category: "supply", desc: "Pallets \" WOODEN\"", unit: "ea" }
  ];
  var busy = false;
  var myToken = "";

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
  function token() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function num(n) {
    var x = Number(n);
    return x === x ? Math.round(x * 1000) / 1000 : 0;
  }
  function same(a, b) { return Math.abs(num(a) - num(b)) < 0.001; }
  function within(a, b) { return Math.abs(num(a) - num(b)) <= TOL; }
  function overCap(n) {
    var x = Number(n);
    return !(x >= 0) || x > CAP;
  }
  function headers() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return { apikey: cfg.SUPABASE_ANON_KEY, Authorization: "Bearer " + cfg.SUPABASE_ANON_KEY };
  }
  function baseUrl() {
    var cfg = (root && root.SMACKIN_CONFIG) || {};
    return String(cfg.SUPABASE_URL || "").replace(/\/$/, "");
  }
  function db() { return root && root.DB; }
  function ready() {
    var D = db();
    return !!(D && D.mode === "cloud" && D.itemByCode && D.adjustTotal && D.createItem && D.onHand
      && D.kvSet && D.kvCloudOn && D.kvCloudOn()
      && D.items && D.items().length > 0
      && baseUrl() && (root.SMACKIN_CONFIG || {}).SUPABASE_ANON_KEY);
  }
  function sumQty(rows) {
    return (rows || []).reduce(function (sum, row) { return sum + num(row.qty); }, 0);
  }
  function aliases(code) {
    var c = String(code || "").trim();
    var out = [];
    function add(v) {
      v = String(v || "").trim();
      if (v && out.indexOf(v) < 0) out.push(v);
    }
    add(c);
    var bag4 = /^BAG4-(.+)$/i.exec(c);
    if (bag4) add("B4-" + bag4[1]);
    var bag15 = /^BAG15-(.+)$/i.exec(c);
    if (bag15) add("B15-" + bag15[1]);
    var b4 = /^B4-(.+)$/i.exec(c);
    if (b4) add("BAG4-" + b4[1]);
    var b15 = /^B15-(.+)$/i.exec(c);
    if (b15) add("BAG15-" + b15[1]);
    if (c === "160086" || c.toUpperCase() === "BOX-160086") {
      add("BOX-160086");
      add("160086");
    }
    return out;
  }
  function findItem(code, name) {
    var D = db();
    if (!D || typeof D.itemByCode !== "function") return null;
    var tries = aliases(code);
    var named = String(name || "").trim();
    if (named && tries.indexOf(named) < 0) tries.push(named);
    var i;
    for (i = 0; i < tries.length; i++) {
      var hit = D.itemByCode(tries[i]);
      if (hit) return hit;
    }
    var want = {};
    tries.forEach(function (t) { want[String(t).trim().toLowerCase()] = 1; });
    var items = D.items ? D.items() : [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      if (want[String(it.name || "").trim().toLowerCase()]) return it;
      if (want[String(it.code || "").trim().toLowerCase()]) return it;
      if (want[String(it.id || "").trim().toLowerCase()]) return it;
    }
    return null;
  }
  function lotTracked(row, it) {
    var cat = String((it && it.category) || (row && row.category) || "").toLowerCase();
    if (cat.indexOf("season") >= 0 || cat === "seed" || cat === "seeds" || cat.indexOf("seed") === 0) return true;
    var blob = [
      row && row.code, row && row.desc, row && row.category,
      it && it.name, it && it.code, it && it.id, it && it.flavor
    ].join(" ").toLowerCase();
    if (blob.indexOf("maltodextrin") >= 0 || blob.indexOf("stevia") >= 0) return true;
    if (/(^|[^a-z])oil([^a-z]|$)/.test(blob)) return true;
    if (/(^|[^a-z])seed([^a-z]|$)/.test(blob)) return true;
    return false;
  }
  function itemIds(it) {
    var ids = [];
    if (it.id) ids.push(String(it.id));
    if (it.code && String(it.code) !== String(it.id)) ids.push(String(it.code));
    return ids;
  }
  function parseState(raw) {
    raw = raw || "";
    if (raw.indexOf("done:") === 0) return { phase: "done", raw: raw };
    if (raw.indexOf("lock:") === 0) {
      var parts = raw.split(":");
      return { phase: "lock", token: parts[1] || "", exp: Number(parts[2]), raw: raw };
    }
    return { phase: "open", raw: raw };
  }
  async function readState() {
    var url = baseUrl() + "/rest/v1/kv_status?key=eq." + encodeURIComponent(CLOUD_KEY) + "&select=value";
    var res = await fetch(url, { cache: "no-store", headers: headers() });
    if (!res.ok) throw new Error("kv read " + res.status);
    var rows = await res.json();
    return parseState(rows && rows[0] ? String(rows[0].value) : "");
  }
  async function serverStock(it) {
    var ids = itemIds(it);
    var filter = ids.length === 1
      ? ("item_id=eq." + encodeURIComponent(ids[0]))
      : ("or=(" + ids.map(function (id) { return "item_id.eq." + encodeURIComponent(id); }).join(",") + ")");
    var url = baseUrl() + "/rest/v1/stock?" + filter + "&select=item_id,location,qty,lot";
    var res = await fetch(url, { cache: "no-store", headers: headers() });
    if (!res.ok) throw new Error("stock read " + res.status);
    return await res.json() || [];
  }
  async function liveTotal(it) {
    var D = db();
    if (typeof D.refresh === "function") await D.refresh();
    var rows = await serverStock(it);
    var serverSum = sumQty(rows);
    var cacheSum = num(D.onHand(it.id || it.code));
    if (!same(cacheSum, serverSum) && typeof D.refresh === "function") {
      await D.refresh();
      rows = await serverStock(it);
      serverSum = sumQty(rows);
      cacheSum = num(D.onHand(it.id || it.code));
    }
    if (!same(cacheSum, serverSum)) throw new Error("on-hand cache does not match stock for " + (it.code || it.id));
    return serverSum;
  }
  async function releaseIfHeld() {
    var D = db();
    var st = await readState();
    if (st.phase === "lock" && st.token === myToken) await D.kvSet(CLOUD_KEY, "retry");
  }
  async function holdLock() {
    var D = db();
    var st = await readState();
    if (!(st.phase === "lock" && st.token === myToken)) return false;
    var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
    var wrote = await D.kvSet(CLOUD_KEY, claim);
    if (!wrote || !wrote.ok) return false;
    st = await readState();
    return st.phase === "lock" && st.token === myToken;
  }
  function rememberLocal(raw) {
    try { localStorage.setItem(LOCAL_FLAG, raw || new Date().toISOString()); } catch (e) {}
  }
  function logLine(msg) {
    if (root.console && root.console.log) root.console.log(msg);
  }
  async function ensureItem(row) {
    var D = db();
    // A new SKU is resolved by its code only. Short descriptions such as
    // "BBQ" are flavor names on other items and must not adopt those rows.
    var it = findItem(row.code, row.create ? "" : row.desc);
    if (it) return it;
    if (!row.create || !(num(row.qty) > 0)) return null;
    if (lotTracked(row, null)) return null;
    var made = await D.createItem({
      code: row.code,
      name: row.desc || row.code,
      flavor: row.desc || row.code,
      category: row.category || "other",
      unit: row.unit || "ea",
      reorder: 0,
      supplier: null
    }, NOTE);
    if (!made || made.ok === false) throw new Error("create " + row.code + (made && made.msg ? ": " + made.msg : ""));
    it = findItem(row.code, "");
    if (!it) throw new Error("missing after create " + row.code);
    return it;
  }
  async function run() {
    try {
      if (localStorage.getItem(LOCAL_FLAG)) return true;
    } catch (e) {}
    if (!ready()) return false;
    if (busy) return false;
    busy = true;
    var D = db();
    try {
      var state = await readState();
      if (state.phase === "done") { rememberLocal(state.raw); return true; }
      if (state.phase === "lock" && state.token !== myToken && state.exp > Date.now()) return false;
      myToken = myToken || token();
      var claim = "lock:" + myToken + ":" + (Date.now() + LOCK_MS);
      var claimed = await D.kvSet(CLOUD_KEY, claim);
      if (!claimed || !claimed.ok) return false;
      await sleep(1200);
      state = await readState();
      if (!(state.phase === "lock" && state.token === myToken)) return false;

      var changed = [];
      var kept = [];
      for (var i = 0; i < ROWS.length; i++) {
        if (!(await holdLock())) throw new Error("lost lock");
        var row = ROWS[i];
        var code = row.code;
        var target = num(row.qty);
        var before = num(row.before);
        if (overCap(target)) {
          logLine("[inv-sync 11/05] skip " + code + " target " + target + " over 100000");
          kept.push({ code: code, reason: "target over 100000", target: target });
          continue;
        }
        if (row.create && !(target > 0)) {
          logLine("[inv-sync 11/05] skip " + code + " zero placeholder");
          kept.push({ code: code, reason: "zero placeholder" });
          continue;
        }
        if (lotTracked(row, null)) {
          logLine("[inv-sync 11/05] skip " + code + " lot-tracked raw material");
          kept.push({ code: code, reason: "lot-tracked" });
          continue;
        }
        var it = await ensureItem(row);
        if (!it) {
          logLine("[inv-sync 11/05] skip " + code + " not in OS");
          kept.push({ code: code, reason: "missing" });
          continue;
        }
        if (lotTracked(row, it)) {
          logLine("[inv-sync 11/05] skip " + code + " lot-tracked raw material");
          kept.push({ code: code, reason: "lot-tracked" });
          continue;
        }
        var current = num(await liveTotal(it));
        if (within(current, target)) {
          kept.push({ code: code, reason: "already", current: current });
          continue;
        }
        if (!within(current, before)) {
          logLine("[inv-sync 11/05] skip " + code + " current " + current + " before " + before + " (newer manual edit)");
          kept.push({ code: code, reason: "manual", current: current, before: before, target: target });
          continue;
        }
        var res = await D.adjustTotal(it, target, NOTE);
        if (res && res.blocked) {
          logLine("[inv-sync 11/05] skip " + code + " count is below RETURNS or a hold location");
          kept.push({ code: code, reason: "blocked", current: current, target: target });
          continue;
        }
        if (!res || res.ok === false) throw new Error((res && res.msg) || ("adjust failed for " + code));
        var after = num(await liveTotal(it));
        if (!within(after, target)) throw new Error(code + " read " + after + " after adjust, target " + target);
        changed.push({ code: code, before: before, after: after });
      }
      var report = JSON.stringify({
        at: new Date().toISOString(),
        note: NOTE,
        rows: changed,
        kept: kept,
        skipped: SKIPPED.map(function (row) { return row.code; })
      });
      var saved = await D.kvSet(REPORT_KEY, report);
      if (!saved || !saved.ok) throw new Error("could not save the discrepancy report");
      var done = "done:" + new Date().toISOString();
      var fin = await D.kvSet(CLOUD_KEY, done);
      if (!fin || !fin.ok) throw new Error("could not save the done flag");
      rememberLocal(done);
      logLine("[inv-sync 11/05] applied " + changed.length + " kept " + kept.length + " of " + ROWS.length);
      return true;
    } catch (e) {
      if (root.console && root.console.warn) root.console.warn("[inv-sync 11/05]", e);
      try { await releaseIfHeld(); } catch (err) {}
      myToken = "";
      return false;
    } finally {
      busy = false;
    }
  }

  var api = {
    NOTE: NOTE,
    LOCAL_FLAG: LOCAL_FLAG,
    CLOUD_KEY: CLOUD_KEY,
    REPORT_KEY: REPORT_KEY,
    CAP: CAP,
    SKIPPED: SKIPPED,
    ROWS: ROWS,
    aliases: aliases,
    findItem: findItem,
    lotTracked: lotTracked,
    overCap: overCap,
    run: run
  };

  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.INV_SYNC_1105 = api;
  var tries = 0;
  (function tick() {
    run().then(function (done) {
      if (!done && ++tries < 400) setTimeout(tick, 2000);
    });
  })();
})(typeof window !== "undefined" ? window : globalThis);

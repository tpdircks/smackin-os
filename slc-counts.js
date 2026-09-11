/*SLCCOUNTS*/
/* Smackin OS — Authoritative on-hand from Adriana's "Inventory SLC 2026" workbook.
   Loaded AFTER db.js/app.js. Overrides DB.onHand(code) so EVERY screen
   (Dashboard, Reorder, Demand, Stock Build, Inventory browser) reads the same
   sheet-sourced number. Codes not present here fall through to the app's own math.
   Update process: when Adriana emails a new sheet, regenerate SLC_COUNTS + SLC_ASOF
   and redeploy this one file. No rack/stock rows are touched. */
(function(){
  window.SLC_ASOF = '2026-09-10';
  window.SLC_SOURCE = 'Inventory SLC 2026 (Adriana)';
  /* 2026-09-10 FULL refresh: every tab dated 9/10. Highlights vs 9/8 — brown seed
     drawn down (95,000 -> 86,050), white seed 62,850; Birthday Cake 4oz 15,000 and
     Cheddar Sour Cream 4oz 11,900 (big runs); 1.5oz Lemon Pepper restocked (0 -> 8,200)
     while 1.5oz film LP fell (70,000 -> 23,000); Sweet Thai Chili 4oz 0; 2.75oz Cinnamon
     68,160. IMPORTANT — LTO 4oz codes (B4-L01..L18) were REALIGNED to the app's real
     DB.items() code->flavor map (from the 9/8 OS backup); the prior file had several
     LTO 4oz flavors filed under the wrong B4-L code (e.g. Birthday Cake was under L17,
     which is Sweet Thai Chili). Numbers below are keyed to the app's own codes so each
     screen shows the correct flavor. Cache re-pulled with buster. */

  var COUNTS = {
    // ===== FINISHED BAGS 4oz (core) =====
    "B4-S01":12600,"B4-S02":14600,"B4-S03":7200,"B4-S04":4400,"B4-S05":4900,
    "B4-S06":13900,"B4-S07":5100,"B4-S08":12400,"B4-S09":7100,"B4-S10":7000,"B4-S11":14200,
    // FINISHED BAGS 4oz (LTO) — keyed to app DB.items() codes (L01=Cheeseburger, L02=Deep Dish Pizza,
    // L03=Good Good S&V, L04=Honey BBQ, L05=Salsa, L06=Taco, L07=Guacamole, L08=Chili Cheese Dog,
    // L09=Blueberry Pie, L10=Birthday Cake, L11=Mexican Street Corn, L12=Nashville Hot,
    // L13=Bacon Mac & Cheese, L14=Korean BBQ, L15=S'mores, L16=Teriyaki, L17=Sweet Thai Chili, L18=Loaded Potato)
    "B4-L01":3800,"B4-L02":800,"B4-L03":10300,"B4-L04":3000,"B4-L05":4700,"B4-L06":40,
    "B4-L07":4300,"B4-L08":1600,"B4-L09":13200,"B4-L10":15000,"B4-L11":4300,"B4-L12":9900,
    "B4-L13":0,"B4-L14":4000,"B4-L15":2100,"B4-L16":10000,"B4-L17":0,"B4-L18":1600,
    "TMP-B4-CHEDDARSOURCREAM":11900,"TMP-B4-CHIPOTLERANCH":8900,"TMP-B4-FUNNELCAKE":5400,
    // ===== FINISHED BAGS 1.5oz (core) =====
    "B15-S01":20750,"B15-S02":22500,"B15-S03":35000,"B15-S04":29750,"B15-S05":8250,
    "B15-S06":10250,"B15-S07":21000,"B15-S08":12250,"B15-S09":22000,"B15-S10":8200,"B15-S11":17250,
    // FINISHED BAGS 1.5oz (LTO)
    "TMP-B15-BBQCAMO":21750,"TMP-B15-BISTRO":100,"TMP-B15-BLOODYMARY":30,"TMP-B15-CINNAMONROLL":0,
    "TMP-B15-DILLPICKLECAMO":16250,"TMP-B15-GUACAMOLE":550,"TMP-B15-HABANEROMANGO":7,"TMP-B15-HONEYBBQ":100,
    "TMP-B15-HOTRAMEN":303,"TMP-B15-KETCHUP":250,"TMP-B15-LOADEDPOTATO":30,"TMP-B15-MOJITO":16,
    "TMP-B15-ORIGINALCAMO":14500,"TMP-B15-PARMUFFALO":50,"TMP-B15-PEANUTBUTTERCUP":100,
    "TMP-B15-PEANUTBUTTERJELLY":441,"TMP-B15-SALSA":250,"TMP-B15-SPICYDILLPICKLE":5,
    "TMP-B15-SPICYQUESO":200,"TMP-B15-TACO":0,
    // ===== FINISHED BAGS 2.75oz (Dollar Tree) =====
    "DT275-BBQ":7920,"DT275-CINNAMON":68160,"DT275-GARLIC":3600,"DT275-LEMONPEPPER":0,

    // ===== SEED / INGREDIENT (seed tab 9/10) =====
    "SEED-BROWN":86050,"SEED-WHITE":62850,"SEED-7SALT":0,"SEED-EXTREME":0,"SEED-TOTE":0,
    "OIL":35,"MALTO":2800,

    // ===== SEASONING (lbs, 9/10, lots summed) — core =====
    "SEAS-S02":2700,"SEAS-S03":3600,"SEAS-S04":0,"SEAS-S05":1750,"SEAS-S06":2050,
    "SEAS-S07":3750,"SEAS-S08":1001,"SEAS-S09":1375,"SEAS-S10":2500,"SEAS-S11":1575,
    // SEASONING — named / LTO
    "SEAS -":30,"SEAS -FC":500,"SEAS- TEXBB":500,"SEAS-BBQC":500,"SEAS-CFRS":500,
    "SEAS-CPRN":300,"SEAS-DLRN":500,"SEAS-GMSC":450,"SEAS-HMSN":550,"SEAS-HTCH":500,
    "SEAS-L01":517.5,"SEAS-L02":1102.5,"SEAS-MPBC":500,"SEAS-PPBC":500,"Seas - BacRP":30,
    "TMP-SEAS-APPLEPIE":11.3,"TMP-SEAS-BACONMACCHEESE":200,"TMP-SEAS-BANANAPUDDING":20.01,
    "TMP-SEAS-BLOODYMARYSNACKS":6,"TMP-SEAS-BLUEBERRYMUFFIN":700,"TMP-SEAS-BUFFALOWING":18,
    "TMP-SEAS-CHEDDARSOURCREAM":0,"TMP-SEAS-CHICKENNOODLE":11,"TMP-SEAS-CHILICHEESE":150,
    "TMP-SEAS-CINNAMONROLLFROSTING":22.8,"TMP-SEAS-COTTONCANDY":2173,"TMP-SEAS-CRABSEAFOODBOIL":6.1,
    "TMP-SEAS-DIJONHERBPOPCORN":68.4,"TMP-SEAS-EVERYTHINGBAGEL":92.5,"TMP-SEAS-FIREHOUSEAMUBLK":6.1,
    "TMP-SEAS-FLAMINGHOTCHEDDARGHOST":45,"TMP-SEAS-FUNNELCAKE":0,"TMP-SEAS-GARDENSALSASNACK":285.84,
    "TMP-SEAS-HABANEROMANGO":5,"TMP-SEAS-HONEYBBQPOPCORN":1750,"TMP-SEAS-KOREANBBQSNACK":1350,
    "TMP-SEAS-LOADEDPOTATOPOPCORN":90,"TMP-SEAS-MAPLEBOURBONDEREKWOLF":6.9,"TMP-SEAS-MEXICANSTREET":100,
    "TMP-SEAS-NASHVILLEHOT":350,"TMP-SEAS-PEANUTBUTTERCUPS":1,"TMP-SEAS-PUMPKINPIESPICE":47,
    "TMP-SEAS-REAPERRANCH":6.9,"TMP-SEAS-SALTVINEGAR":3500,"TMP-SEAS-SMORESSEASONING":4.4,
    "TMP-SEAS-SPICYDILLPICKLE":9.5,"TMP-SEAS-SPICYGARLICBUTTER":36,"TMP-SEAS-SPICYGUACAMOLE":300,
    "TMP-SEAS-SPICYNACHO":700,"TMP-SEAS-STRAWBERRYCHEESECAKE":0,"TMP-SEAS-SWEETTHAICHILE":0,
    "TMP-SEAS-TACOMILDFIREHOUSE":40,"TMP-SEAS-TERIYAKI":1341.36,"TMP-SEAS-TIKKAMASSALA":14,"TMP-SEAS-WALKINGTACO":100,

    // ===== FILM (bag-equivalents, 9/10) — 4oz core =====
    "F4-S01":243900,"F4-S02":418500,"F4-S03":107300,"F4-S04":96300,"F4-S05":66150,
    "F4-S06":276350,"F4-S07":141900,"F4-S08":108050,"F4-S09":312000,"F4-S10":168300,"F4-S11":405600,
    // FILM 1.5oz core
    "F15-S01":110380,"F15-S02":230200,"F15-S03":100900,"F15-S04":94500,"F15-S05":126900,
    "F15-S06":107072,"F15-S07":108770,"F15-S08":135215,"F15-S09":36400,"F15-S10":23000,"F15-S11":76760,
    // FILM 2.75oz
    "TMP-F275-BBQ":83980,"TMP-F275-CINNAMON":168100,"TMP-F275-GARLIC":89200,"TMP-F275-LEMONPEPPER":149700,
    // FILM 4oz LTO
    "TMP-F4-BACONJALAPENO":32400,"TMP-F4-BIRTHDAYCAKE":12500,"TMP-F4-BLUEBERRYPIE":21000,
    "TMP-F4-CHEDDARSOURCREAM":39300,"TMP-F4-CHIPOTLERANCH":58500,"TMP-F4-DEEPDISHPIZZA":115100,
    "TMP-F4-GOODGOODSALTVINEGAR":316300,"TMP-F4-GUACAMOLE":6000,"TMP-F4-HONEYBBQALEXRODRIGUES":96600,
    "TMP-F4-KOREANBBQKINGOFJUCO":112100,"TMP-F4-LOADEDNACHO":41400,"TMP-F4-MEXICANSTREET":12700,
    "TMP-F4-NASHVILLEHOT":7500,"TMP-F4-SALSA":3300,"TMP-F4-STRAWBERRYCHEESECAKE":36500,
    "TMP-F4-SWEETTHAICHILI":50,"TMP-F4-TERIYAKIANABRUNI":134500,

    // ===== PACKAGING (high-value; Warehouse tab 9/10) =====
    "160086":9090,"MCASE-BOX":8750,"TGT-SHIPPER":9450,"WM-SHIPPER":25250,"BOX-24":4575,
    "BKT-UNPR":3584,"BKT-STD":1339,"BKT-SPORTS":767,"BKT-CAMO":167,"BKT-BOX":6850,
    "LID-BLUE":4848,"LID-DKBLUE":647,"LID-BLACK":148,"BKT-STICKER":29000,"STICKER-SM":27000,
    "POLY-SM":22500,"POLY-LG":23000,"DISPLAY-4OZ":5720,
    "SLV-S01":16800,"SLV-S02":27880,"SLV-S03":12700,"SLV-S04":24000,"SLV-S05":7560,"SLV-S07":28560,"SLV-S08":17280
  };
  window.SLC_COUNTS = COUNTS;

  // ---- app-wide override: DB.onHand(code) returns the sheet number when we have it ----
  function wrap(){
    if(!window.DB || typeof DB.onHand!=='function' || DB.onHand.__slc) return !!(window.DB && DB.onHand && DB.onHand.__slc);
    var orig = DB.onHand.bind(DB);
    var f = function(code){
      if(window.SLC_COUNTS && Object.prototype.hasOwnProperty.call(window.SLC_COUNTS, code)) return window.SLC_COUNTS[code];
      return orig(code);
    };
    f.__slc = true; f.__orig = orig; DB.onHand = f; return true;
  }
  if(!wrap()){
    var tries=0;
    (function retry(){ if(wrap() || ++tries>40) return; setTimeout(retry,150); })();
  }
})();

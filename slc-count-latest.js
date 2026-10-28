/* slc-count-latest.js
   Newest finished-bag block from Adriana's Inventory SLC 2026 sheet.
   File id: 1I-Bz0Eg80AQt8lI88OoP8racbBCAGvznzZX8p-GI17w
   Count date on the bag tabs: 2026-10-27.
   Limited Flavors 1.5 oz newest column-A date is 2026-10-26 (no 10/27 block).
   4oz core: column F on the S-id header row.
   4oz LTO: sum of column F for that flavor (several lot lines, each with its own column F).
   1.5oz and 2.75oz: header current total. On this block column F equals that total.
   Limited 1.5oz: column E current total, summed when several lines share one OS code.
   Warehouse tab is supplies. Only sheet id 160086 is included, mapped to BOX-160086.
   Its count is column E (current quantity). Column F there is per pallet.
   Rows with code null are on the sheet and have no OS code. They are not guessed.
   Paper stays the source until a reviewer applies a bag row from the panel.
*/
window.SLC_COUNT = {
  "date": "2026-10-27",
  "source": "1I-Bz0Eg80AQt8lI88OoP8racbBCAGvznzZX8p-GI17w",
  "sheet": "Inventory SLC 2026",
  "blocks": {
    "Inventory Bags 4 oz": {
      "rows": [
        29009,
        29083
      ],
      "date": "2026-10-27"
    },
    "Inventory Bags 1.5 oz": {
      "rows": [
        8575,
        8613
      ],
      "date": "2026-10-27"
    },
    "Inventory Bags 2.75 oz": {
      "rows": [
        321,
        335
      ],
      "date": "2026-10-27"
    },
    "Limited Flavors 1.5 oz": {
      "rows": [
        14348,
        14376
      ],
      "date": "2026-10-26"
    },
    "Warehouse Inventory": {
      "rows": [
        9972,
        10081
      ],
      "date": "2026-10-27",
      "included": "160086 only"
    }
  },
  "rows": [
    {
      "code": "B4-S01",
      "desc": "OG Original",
      "sheetQty": 14300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29009
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S02",
      "desc": "Cinnamon Churro",
      "sheetQty": 8600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29012
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-S03",
      "desc": "Backyard BBQ",
      "sheetQty": 8100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29015
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S04",
      "desc": "Garlic Parmesan",
      "sheetQty": 16700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29018
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-S05",
      "desc": "Dill Pickle",
      "sheetQty": 900,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29021
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S06",
      "desc": "Cracked Pepper",
      "sheetQty": 5900,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29024
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S07",
      "desc": "Cheddar Jalapeno",
      "sheetQty": 29100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29027
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S08",
      "desc": "Ranch",
      "sheetQty": 18400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29030
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S09",
      "desc": "Maple Brown Sugar",
      "sheetQty": 10800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29033
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S10",
      "desc": "Lemon Pepper",
      "sheetQty": 7600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29037
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-S11",
      "desc": "Sour Cream & Onion",
      "sheetQty": 7600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29040
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B4-BACONJALAPENO",
      "desc": "BACON JALAPENO SPORTS",
      "sheetQty": 4200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29043
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L13",
      "desc": "BACON MC & CHEESE",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29044
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L10",
      "desc": "BIRTHDAY CAKE",
      "sheetQty": 21900,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29045
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L09",
      "desc": "BLUEBERRY PIE",
      "sheetQty": 6300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29046
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B4-CHEDDARSOURCREAM",
      "desc": "CHEDDAR SOUR CREAM",
      "sheetQty": 3200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29047
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L01",
      "desc": "CHEESEBURGUER",
      "sheetQty": 17800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29048
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L08",
      "desc": "CHILI CHEESE DOG",
      "sheetQty": 1700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29049
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B4-CHIPOTLERANCH",
      "desc": "CHIPOTLE RANCH",
      "sheetQty": 10900,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29050,
        29051,
        29052
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L19",
      "desc": "COTTON CANDY",
      "sheetQty": 59300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29053,
        29054
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L02",
      "desc": "DEEP DISH PIZZA",
      "sheetQty": 14100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29055,
        29056
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "TMP-B4-DILLRANCH",
      "desc": "DILL RANCH",
      "sheetQty": 100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29057
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B4-FUNNELCAKE",
      "desc": "FUNNEL CAKE",
      "sheetQty": 200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29058
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L03",
      "desc": "GOOD GOOD VINEGAR SALT",
      "sheetQty": 1900,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29059
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L07",
      "desc": "GUACAMOLE",
      "sheetQty": 8600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29060,
        29061,
        29062
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L04",
      "desc": "HONEY BBQ",
      "sheetQty": 8700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29063
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L20",
      "desc": "HONEY MUSTARD",
      "sheetQty": 100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29064
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L14",
      "desc": "KING OF JUCO  - KOREAN BBQ",
      "sheetQty": 12000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29065
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B4-LOADEDNACHO",
      "desc": "LOADED NACHO  SPORTS",
      "sheetQty": 24800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29066,
        29067
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L18",
      "desc": "LOADED POTATO",
      "sheetQty": 300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29068
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L11",
      "desc": "MEXICAN STREET CORN",
      "sheetQty": 500,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29069
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L12",
      "desc": "NASHVILLE HOT",
      "sheetQty": 10300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29070
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L05",
      "desc": "SALSA",
      "sheetQty": 10200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29071,
        29072
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L15",
      "desc": "S'MORES",
      "sheetQty": 2500,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29073,
        29074
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "TMP-B4-STRAWBERRYCHEESECAKE",
      "desc": "STRAWBERRY CHEESECAKE SPORTS",
      "sheetQty": 20400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29075,
        29076
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B4-L17",
      "desc": "SWEET THAI CHILI",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29077
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L06",
      "desc": "TACO                      Blue Bag",
      "sheetQty": 2200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29078
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B4-L16",
      "desc": "TERIYAKI - ANA BRUNI",
      "sheetQty": 5000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29079,
        29080
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B15-S01",
      "desc": "OG Original",
      "sheetQty": 14500,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8575
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S02",
      "desc": "Cinnamon Churro",
      "sheetQty": 17250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8578
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S03",
      "desc": "Backyard BBQ",
      "sheetQty": 28750,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8581,
        8582
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B15-S04",
      "desc": "Garlic Parmesan",
      "sheetQty": 26250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8585
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S05",
      "desc": "Dill Pickle",
      "sheetQty": 3250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8589
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S06",
      "desc": "Cracked Pepper",
      "sheetQty": 7000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8592
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S07",
      "desc": "Cheddar Jalapeno",
      "sheetQty": 25500,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8595
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S08",
      "desc": "Ranch",
      "sheetQty": 11250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8599
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S09",
      "desc": "Maple Brown Sugar",
      "sheetQty": 31000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8603
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S10",
      "desc": "Lemon Pepper",
      "sheetQty": 9250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8606
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "B15-S11",
      "desc": "Sour Cream & Onion",
      "sheetQty": 15000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8609
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "DT275-BBQ",
      "desc": "Backyard BBQ",
      "sheetQty": 7920,
      "sheet": "Inventory Bags 2.75 oz",
      "sheetRows": [
        321
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "DT275-CINNAMON",
      "desc": "Cinnamon Churro",
      "sheetQty": 68160,
      "sheet": "Inventory Bags 2.75 oz",
      "sheetRows": [
        324
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "DT275-GARLIC",
      "desc": "Garlic Parmesan",
      "sheetQty": 3600,
      "sheet": "Inventory Bags 2.75 oz",
      "sheetRows": [
        327
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "DT275-LEMONPEPPER",
      "desc": "Lemon Pepper",
      "sheetQty": 0,
      "sheet": "Inventory Bags 2.75 oz",
      "sheetRows": [
        330
      ],
      "sheetDate": "2026-10-27",
      "flags": []
    },
    {
      "code": "TMP-B15-GUACAMOLE",
      "desc": "GUACAMOLE",
      "sheetQty": 550,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14350,
        14351
      ],
      "sheetDate": "2026-10-26",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "TMP-B15-KETCHUP",
      "desc": "KETCHUP",
      "sheetQty": 250,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14352
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-LOADEDPOTATO",
      "desc": "LOADED POTATO",
      "sheetQty": 30,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14353
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-PEANUTBUTTERJELLY",
      "desc": "PEANUT BUTTER & JELLY",
      "sheetQty": 250,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14355
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-SALSA",
      "desc": "SALSA BAG WHITE",
      "sheetQty": 250,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14356
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-SPICYQUESO",
      "desc": "SPICY QUESO",
      "sheetQty": 200,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14357
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-TACO",
      "desc": "TACO",
      "sheetQty": 250,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14358
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-BISTRO",
      "desc": "BISTRO BLUE BAG",
      "sheetQty": 80,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14365
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-BLOODYMARY",
      "desc": "BLODY MARY",
      "sheetQty": 30,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14366
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-HABANEROMANGO",
      "desc": "HABANERO MANGO",
      "sheetQty": 7,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14367
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-HONEYBBQ",
      "desc": "HONEY BBQ",
      "sheetQty": 100,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14368
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-HOTRAMEN",
      "desc": "HOT RAMEN",
      "sheetQty": 303,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14369
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-MOJITO",
      "desc": "MOJITO",
      "sheetQty": 16,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14370
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-PEANUTBUTTERCUP",
      "desc": "PEANUT BUTTER CUP",
      "sheetQty": 100,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14371
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": "TMP-B15-SPICYDILLPICKLE",
      "desc": "SPICY DILL PICKLE",
      "sheetQty": 5,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14373
      ],
      "sheetDate": "2026-10-26",
      "flags": []
    },
    {
      "code": null,
      "desc": "BACON MC & CHEESE",
      "sheetQty": 5000,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14364
      ],
      "sheetDate": "2026-10-26",
      "flags": [
        "unmapped"
      ]
    },
    {
      "code": null,
      "desc": "SMOKED BRISCKET",
      "sheetQty": 30,
      "sheet": "Limited Flavors 1.5 oz",
      "sheetRows": [
        14372
      ],
      "sheetDate": "2026-10-26",
      "flags": [
        "unmapped"
      ]
    },
    {
      "code": "BOX-160086",
      "desc": "4 CT Master Shipper",
      "sheetQty": 8750,
      "sheet": "Warehouse Inventory",
      "sheetRows": [
        9992
      ],
      "sheetDate": "2026-10-27",
      "flags": [
        "packaging"
      ]
    }
  ]
};

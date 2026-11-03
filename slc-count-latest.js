/* slc-count-latest.js
   Newest finished-bag block from Adriana's Inventory SLC 2026 sheet.
   File id: 1I-Bz0Eg80AQt8lI88OoP8racbBCAGvznzZX8p-GI17w
   Count date on the 4 oz and 1.5 oz bag tabs: 2026-11-02 (sheet header 11/2/26).
   4 oz block rows 29084-29158. 1.5 oz block rows 8614-8652.
   4oz core: column F on the S-id header row.
   4oz LTO: sum of column F for that flavor (several lot lines, each with its own column F).
   1.5oz: header current total (column G).
   No 11/02 bag value is above 100,000.
   The 2.75 oz, Limited Flavors 1.5 oz and Warehouse rows below are the earlier
   10/26-10/27 rows, kept for reference. inv-sync-1102.js does not apply them.
   Rows with code null are on the sheet and have no OS code. They are not guessed.
*/
window.SLC_COUNT = {
  "date": "2026-11-02",
  "source": "1I-Bz0Eg80AQt8lI88OoP8racbBCAGvznzZX8p-GI17w",
  "sheet": "Inventory SLC 2026",
  "blocks": {
    "Inventory Bags 4 oz": {
      "rows": [
        29084,
        29158
      ],
      "date": "2026-11-02"
    },
    "Inventory Bags 1.5 oz": {
      "rows": [
        8614,
        8652
      ],
      "date": "2026-11-02"
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
      "desc": "OG\" ORIGINAL",
      "sheetQty": 6400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29084
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S02",
      "desc": "CINNAMON CHURRO",
      "sheetQty": 8000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29087
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-S03",
      "desc": "BBQ",
      "sheetQty": 1800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29090
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S04",
      "desc": "GARLIC PARMESAN",
      "sheetQty": 28000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29093
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-S05",
      "desc": "DILL PICKLE",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29096
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S06",
      "desc": "CRACKED PEPPER",
      "sheetQty": 5400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29099
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S07",
      "desc": "CHEDDAR JALAPENO",
      "sheetQty": 22700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29102
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S08",
      "desc": "RANCH",
      "sheetQty": 12600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29105
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S09",
      "desc": "MAPLE BROWN SUGAR",
      "sheetQty": 11500,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29108
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S10",
      "desc": "LEMON PEPPER",
      "sheetQty": 7000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29112
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-S11",
      "desc": "SOUR CREAM & ONION",
      "sheetQty": 7200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29115
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-BACONJALAPENO",
      "desc": "BACON JALAPENO SPORTS",
      "sheetQty": 26400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29118,
        29119
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L13",
      "desc": "BACON MC & CHEESE",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29120
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L10",
      "desc": "BIRTHDAY CAKE",
      "sheetQty": 20800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29121
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L09",
      "desc": "BLUEBERRY PIE",
      "sheetQty": 6800,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29122
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-CHEDDARSOURCREAM",
      "desc": "CHEDDAR SOUR CREAM",
      "sheetQty": 2300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29123
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L01",
      "desc": "CHEESEBURGUER",
      "sheetQty": 13700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29124
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L08",
      "desc": "CHILI CHEESE DOG",
      "sheetQty": 1700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29125
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-CHIPOTLERANCH",
      "desc": "CHIPOTLE RANCH",
      "sheetQty": 7500,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29126,
        29127,
        29128
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L19",
      "desc": "COTTON CANDY",
      "sheetQty": 57700,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29129,
        29130
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L02",
      "desc": "DEEP DISH PIZZA",
      "sheetQty": 13400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29131
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-DILLRANCH",
      "desc": "DILL RANCH",
      "sheetQty": 100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29132
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-FUNNELCAKE",
      "desc": "FUNNEL CAKE",
      "sheetQty": 200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29133
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L03",
      "desc": "GOOD GOOD VINEGAR SALT",
      "sheetQty": 1200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29134
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L07",
      "desc": "GUACAMOLE",
      "sheetQty": 8600,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29135,
        29136,
        29137
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L04",
      "desc": "HONEY BBQ",
      "sheetQty": 8200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29138
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L20",
      "desc": "HONEY MUSTARD",
      "sheetQty": 100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29139
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L14",
      "desc": "KING OF JUCO  - KOREAN BBQ",
      "sheetQty": 11400,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29140
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "TMP-B4-LOADEDNACHO",
      "desc": "LOADED NACHO  SPORTS",
      "sheetQty": 49000,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29141,
        29142
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L18",
      "desc": "LOADED POTATO",
      "sheetQty": 230,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29143
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L11",
      "desc": "MEXICAN STREET CORN",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29144
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L12",
      "desc": "NASHVILLE HOT",
      "sheetQty": 10100,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29145
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L05",
      "desc": "SALSA",
      "sheetQty": 10200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29146,
        29147
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L15",
      "desc": "S'MORES",
      "sheetQty": 2500,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29148,
        29149
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "TMP-B4-STRAWBERRYCHEESECAKE",
      "desc": "STRAWBERRY CHEESECAKE SPORTS",
      "sheetQty": 48200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29150,
        29151
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B4-L17",
      "desc": "SWEET THAI CHILI",
      "sheetQty": 0,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29152
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L06",
      "desc": "TACO                      Blue Bag",
      "sheetQty": 2200,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29153
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B4-L16",
      "desc": "TERIYAKI - ANA BRUNI",
      "sheetQty": 4300,
      "sheet": "Inventory Bags 4 oz",
      "sheetRows": [
        29154,
        29155
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "multi-lot"
      ]
    },
    {
      "code": "B15-S01",
      "desc": "OG\" ORIGINAL",
      "sheetQty": 14000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8614
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S02",
      "desc": "CINNAMON CHURRO",
      "sheetQty": 16500,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8617
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S03",
      "desc": "BBQ",
      "sheetQty": 28750,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8620,
        8621
      ],
      "sheetDate": "2026-11-02",
      "flags": [
        "summed"
      ]
    },
    {
      "code": "B15-S04",
      "desc": "GARLIC PARMESAN",
      "sheetQty": 26000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8624
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S05",
      "desc": "DILL PICKLE",
      "sheetQty": 2500,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8628
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S06",
      "desc": "CRACKED PEPPER",
      "sheetQty": 6750,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8631
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S07",
      "desc": "CHEDDAR JALAPENO",
      "sheetQty": 25500,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8634
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S08",
      "desc": "RANCH",
      "sheetQty": 11250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8638
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S09",
      "desc": "MAPLE BROWN SUGAR",
      "sheetQty": 29250,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8642
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S10",
      "desc": "LEMON PEPPER",
      "sheetQty": 9000,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8645
      ],
      "sheetDate": "2026-11-02",
      "flags": []
    },
    {
      "code": "B15-S11",
      "desc": "SOUR CREAM & ONION",
      "sheetQty": 14750,
      "sheet": "Inventory Bags 1.5 oz",
      "sheetRows": [
        8648
      ],
      "sheetDate": "2026-11-02",
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

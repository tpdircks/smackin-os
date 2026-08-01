/* Allen's Flavor Reorder Tracker — the digital version of the spreadsheet Allen uses to decide
   which production POs are needed from current finished-goods on hand (P-Mac line).
   Source: allen-reorder-tracker_6.xlsx (Allen Back, 2026-07-31).

   Logic (per flavor, one PO line):
     - Each size (4.0oz, 1.5oz) has its own TRIGGER (pallets) and ORDER QTY (bins).
     - Status = REORDER when Pallets on Hand <= Trigger for that size.
     - Gross Bins Needed = 4oz Order Qty + 1.5oz Order Qty.
     - Bins to Order  = Gross Bins Needed - Bins Mixed already on hand (shared pool per flavor).
     - Bin allocation back to sizes is proportional to the order-qty split.
     - Pallets from order use the conversion settings below.

   Conversion settings verified against Allen's sheet:
     4.0oz = 200 packages/bin, 2,500 packages/pallet
     1.5oz = 535 packages/bin, 6,250 packages/pallet
*/
(function () {
  window.ALLEN_REORDER = {
    conv: {
      "4oz": { perBin: 200, perPallet: 2500 },
      "15oz": { perBin: 535, perPallet: 6250 }
    },
    // PRIME tier is exact from Allen's sheet. SECONDARY placeholders are editable in-app
    // (triggers/order-qtys default 0 until Allen's secondary numbers are loaded from the file).
    tiers: [
      {
        name: "PRIME FLAVORS",
        flavors: [
          { code: "S02", name: "Cinnamon Churro",   t4: 5.0, q4: 100, t15: 2.0, q15: 34 },
          { code: "S03", name: "Backyard BBQ",      t4: 5.0, q4: 100, t15: 2.0, q15: 34 },
          { code: "S07", name: "Cheddar Jalapeno",  t4: 5.0, q4: 100, t15: 2.0, q15: 34 },
          { code: "S04", name: "Garlic Parmesan",   t4: 5.0, q4: 100, t15: 2.0, q15: 34 },
          { code: "S05", name: "Dill Pickle",       t4: 5.0, q4: 100, t15: 2.0, q15: 34 },
          { code: "S08", name: "Ranch",             t4: 5.0, q4: 100, t15: 2.0, q15: 34 }
        ]
      },
      {
        name: "SECONDARY FLAVORS",
        note: "Triggers/order qtys pending Allen's file — edit in-app or load from the spreadsheet.",
        flavors: [
          { code: "S01", name: "OG Original",         t4: 0, q4: 0, t15: 0, q15: 0 },
          { code: "S10", name: "Lemon Pepper",        t4: 0, q4: 0, t15: 0, q15: 0 },
          { code: "S06", name: "Cracked Pepper",      t4: 0, q4: 0, t15: 0, q15: 0 },
          { code: "S09", name: "Maple Brown Sugar",   t4: 0, q4: 0, t15: 0, q15: 0 },
          { code: "L01", name: "Cheeseburger",        t4: 0, q4: 0, t15: 0, q15: 0 },
          { code: "S11", name: "Sour Cream & Onion",  t4: 0, q4: 0, t15: 0, q15: 0 }
        ]
      }
    ]
  };

  // Pure calculation from a flavor spec + current counts. Returns the full row Allen's sheet computes.
  window.ALLEN_CALC = function (f, pallets4, pallets15, binsMixed) {
    const c = window.ALLEN_REORDER.conv;
    pallets4 = Number(pallets4) || 0; pallets15 = Number(pallets15) || 0; binsMixed = Number(binsMixed) || 0;
    const status4 = (f.q4 > 0 || f.t4 > 0) ? (pallets4 <= f.t4 ? "REORDER" : "OK") : "n/a";
    const status15 = (f.q15 > 0 || f.t15 > 0) ? (pallets15 <= f.t15 ? "REORDER" : "OK") : "n/a";
    const gross = (Number(f.q4) || 0) + (Number(f.q15) || 0);
    const triggered = status4 === "REORDER" || status15 === "REORDER";
    const binsToOrder = gross > 0 ? Math.max(gross - binsMixed, 0) : 0;
    // proportional allocation; give any rounding remainder to 4oz so the two sum exactly
    let alloc4 = gross > 0 ? Math.round(binsToOrder * (Number(f.q4) || 0) / gross) : 0;
    let alloc15 = binsToOrder - alloc4; if (alloc15 < 0) { alloc15 = 0; alloc4 = binsToOrder; }
    const pal4 = alloc4 * c["4oz"].perBin / c["4oz"].perPallet;     // bins -> pallets (4oz)
    const pal15 = alloc15 * c["15oz"].perBin / c["15oz"].perPallet; // bins -> pallets (1.5oz)
    return {
      code: f.code, name: f.name, t4: f.t4, q4: f.q4, t15: f.t15, q15: f.q15,
      pallets4: pallets4, pallets15: pallets15, binsMixed: binsMixed,
      status4: status4, status15: status15, triggered: triggered,
      gross: gross, binsToOrder: binsToOrder, alloc4: alloc4, alloc15: alloc15,
      pal4: Math.round(pal4 * 100) / 100, pal15: Math.round(pal15 * 100) / 100
    };
  };
})();

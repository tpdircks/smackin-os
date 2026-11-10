/* Lot-level inventory sync planner.
   Adriana's count is the on-hand. Raw materials (seasoning, seed,
   maltodextrin, oil, stevia) are applied per lot: quantity, lot,
   expiration, and location.    A lot dated before today goes to QUARANTINE.
   holdSpecForAction describes the hold_log row for that raw lot.
   It does not write, and it does not invent a receiving_log row.
   A lot whose COA answer is No and has not been released stays on QA-HOLD.
   A quantity over 100,000 is held. A stock row edited after the sheet
   time is left alone and reported. SEAS-S05 lot j1926 is held for Adriana.
   Nothing is written here. */
(function (root) {
  "use strict";
  var CAP = 100000;
  /* End of the count date in Salt Lake (MST, UTC-7). Edits on the count
   date, including the same-day sync, are not a newer manual override.
   An edit on the next local day is. */
var SHEET_AS_OF = "2026-11-06T07:00:00.000Z";
  var COUNT_DATE = "2026-11-05";
  var OPERATOR = "inventory sync from Adriana count 2026-11-05";
  var SKIP_LOC = { RETURNS: 1, QUARANTINE: 1, "QA-HOLD": 1, "RETURNS-HOLD": 1 };
  var UNSAFE = {
    "TMP-F4-UNVAULTEDLIMITED": "UNVAULTED / LIMITED FLAVOR does not map to one film SKU.",
    "SUP-BOXX": "Box #12126 is 0 on the sheet and 275 in OS. Suspected swap with #12124. Left unchanged."
  };
  /* Cashew bags confirmed 2026-11-06. Eight stock rows are the loaded
     on-hand. Eleven source pallets roll into those rows. Pallet 8 and the
     Oct 15 receipt stay open and are not part of the totals. */
  var CASHEW_PALLETS = [
    { item: "NUTS-CINNAMONCHURRO", lot: "H 26268", exp: "2027-09-25", location: "RACK B", pallet: "2", boxes: 16, partial24: 0, qty: 2304 },
    { item: "NUTS-CINNAMONCHURRO", lot: "H 26268", exp: "2027-09-25", location: "E-COMMERCE", pallet: "1", boxes: 12, partial24: 0, qty: 1728 },
    { item: "NUTS-BBQ", lot: "H 26267", exp: "2027-09-24", location: "RACK B", pallet: "4", boxes: 16, partial24: 1, qty: 2328 },
    { item: "NUTS-BBQ", lot: "H 26266", exp: "2027-09-23", location: "RACK B", pallet: "2", boxes: 16, partial24: 0, qty: 2304 },
    { item: "NUTS-BBQ", lot: "H 26281", exp: "2027-10-08", location: "RACK B", pallet: "5", boxes: 19, partial24: 0, qty: 2736 },
    { item: "NUTS-BBQ", lot: "H 26281", exp: "2027-10-08", location: "RACK B", pallet: "6", boxes: 16, partial24: 0, qty: 2304 },
    { item: "NUTS-BBQ", lot: "H 26281", exp: "2027-10-09", location: "RACK B", pallet: "5-1/2", boxes: 7, partial24: 0, qty: 1008 },
    { item: "NUTS-BBQ", lot: "H 26281", exp: "2027-10-09", location: "RACK B", pallet: "7", boxes: 16, partial24: 0, qty: 2304 },
    { item: "NUTS-BBQ", lot: "H 26282", exp: "2027-10-09", location: "RACK B", pallet: "9", boxes: 20, partial24: 1, qty: 2904 },
    { item: "NUTS-BBQ", lot: "H 26283", exp: "2027-10-10", location: "RACK B", pallet: "10", boxes: 11, partial24: 4, qty: 1680 },
    { item: "NUTS-BBQ", lot: "H 26266", exp: "2027-09-23", location: "E-COMMERCE", pallet: "1", boxes: 6, partial24: 0, qty: 864 }
  ];
  var CASHEW_STOCK = [
    { item: "NUTS-CINNAMONCHURRO", lot: "H 26268", exp: "2027-09-25", location: "RACK B", qty: 2304, pallet: "2" },
    { item: "NUTS-CINNAMONCHURRO", lot: "H 26268", exp: "2027-09-25", location: "E-COMMERCE", qty: 1728, pallet: "1" },
    { item: "NUTS-BBQ", lot: "H 26267", exp: "2027-09-24", location: "RACK B", qty: 2328, pallet: "4" },
    { item: "NUTS-BBQ", lot: "H 26266", exp: "2027-09-23", location: "RACK B", qty: 2304, pallet: "2" },
    { item: "NUTS-BBQ", lot: "H 26281", exp: "2027-10-08", location: "RACK B", qty: 8352, pallet: "5,6,5-1/2,7", laterExp: "2027-10-09" },
    { item: "NUTS-BBQ", lot: "H 26282", exp: "2027-10-09", location: "RACK B", qty: 2904, pallet: "9" },
    { item: "NUTS-BBQ", lot: "H 26283", exp: "2027-10-10", location: "RACK B", qty: 1680, pallet: "10" },
    { item: "NUTS-BBQ", lot: "H 26266", exp: "2027-09-23", location: "E-COMMERCE", qty: 864, pallet: "1" }
  ];
  /* Adriana confirmed these exact totals on 2026-11-06. The same number
     may pass the 100,000 guard. Any other total over 100,000 is still held. */
  var CONFIRMED_LARGE = {
    "FILM4-S01": 208100,
    "FILM4-S02": 434500,
    "FILM4-S06": 276350,
    "FILM4-S08": 107250,
    "FILM4-S09": 300600,
    "FILM4-S10": 164600,
    "FILM4-S11": 399600,
    "TMP-F4-GOODGOODSALTVINEGAR": 316300,
    "TMP-F4-TERIYAKIANABRUNI": 126600,
    "FILM15-S01": 108780,
    "FILM15-S02": 230200,
    "FILM15-S05": 115700,
    "FILM15-S06": 108000,
    "FILM15-S07": 117770,
    "FILM15-S08": 139715
  };
  var CONFIRM_QTY = {
    "SUP-PAPTOW12": 2,
    "TMP-F15-LOADEDNACHO": 0,
    "TMP-F15-LOADEDPOTATO": 3000,
    "SUP-TRASHBLACK": 140,
    "SUP-TRASHWHITE": 200,
    "SUP-MASKTOMCLAN": 7800,
    "SUP-MASKDOKU": 10850,
    "SUP-MASKDRHZ": 1850,
    "SUP-TRABAG": 0,
    "SUP-MASDAIPRO": 0
  };
  var CONFIRM_CREATE = {
    "SUP-TRASHBLACK": { desc: "Trash bags, black", category: "supply", unit: "ea" },
    "SUP-TRASHWHITE": { desc: "Trash bags, white", category: "supply", unit: "ea" },
    "SUP-MASKTOMCLAN": { desc: "Masks, Tom Clan", category: "supply", unit: "ea" },
    "SUP-MASKDOKU": { desc: "Masks, Doku", category: "supply", unit: "ea" },
    "SUP-MASKDRHZ": { desc: "Masks, DrHZ", category: "supply", unit: "ea" },
    "TMP-F15-LOADEDPOTATO": { desc: "Film 1.5oz - Loaded Potato", category: "film15", unit: "impr" }
  };
  var CONFIRM_REPLACE = { "SUP-PAPTOW12": "WAREHOUSE" };
  var CONFIRM_RETIRE = [
    { item: "MALTO", name: "Retired: Maltodextrin (duplicate of Clintose CR-10)", category: "retired" },
    { item: "SUP-TRABAG", name: "Retired: Trash Bags (split into black and white)", category: "retired" },
    { item: "SUP-MASDAIPRO", name: "Retired: Masks KN95 (split by manufacturer)", category: "retired" }
  ];
  var CONFIRM_PATCH = [
    { item: "TMP-SEAS-MALTODEXTRINCLINTOSECR", supplier: "ADM Corn Processing" }
  ];

  function num(n) {
    var x = Number(n);
    return x === x ? Math.round(x * 1000) / 1000 : 0;
  }
  function pad2(n) {
    n = String(parseInt(n, 10));
    return n.length < 2 ? ("0" + n) : n;
  }
  function lotKey(lot) {
    var s = String(lot == null ? "" : lot).toUpperCase().replace(/LOT/g, "").replace(/#/g, "").replace(/[^A-Z0-9]/g, "");
    if (!s || /^0+$/.test(s)) return "";
    return s;
  }
  function parseExp(v) {
    var s = String(v || "").trim();
    if (!s || s === "*" || /no date/i.test(s) || /^\*+$/.test(s)) return "";
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
    if (!us) return "";
    var y = parseInt(us[3], 10);
    if (y < 100) y += 2000;
    var m = String(parseInt(us[1], 10));
    var d = String(parseInt(us[2], 10));
    if (m.length < 2) m = "0" + m;
    if (d.length < 2) d = "0" + d;
    return y + "-" + m + "-" + d;
  }
  function mapLocation(locCode, note) {
    var code = String(locCode || "").trim();
    var rack = /rack\s*([a-h])/i.exec(String(note || ""));
    var l = /^L\s*(\d+)$/i.exec(code);
    if (l && rack) return rack[1].toUpperCase() + "-" + pad2(l[1]) + "-L1";
    if (l) return "L-" + pad2(l[1]);
    var s = /^S\s*(\d+)$/i.exec(code);
    if (s) return "S-" + pad2(s[1]);
    var a = /^A\s*(\d+)$/i.exec(code);
    if (a) return "A-" + pad2(a[1]) + "-L1";
    if (rack && !code) return "RACK-" + rack[1].toUpperCase();
    if (!code) return "RECEIVING";
    return code.toUpperCase().replace(/\s+/g, "-").replace(/\//g, "-").replace(/[^A-Z0-9-]/g, "");
  }
  function drifted(osQty, sheetQty) {
    var d = Math.abs(num(osQty) - num(sheetQty));
    if (d <= 0.0005) return false;
    if (d > 1) return true;
    var base = Math.abs(num(sheetQty));
    if (!(base > 0)) return false;
    return d / base > 0.005;
  }
  function isManual(row, sheetAsOf) {
    if (!row || !row.updated_at) return false;
    var t = Date.parse(row.updated_at);
    var s = Date.parse(sheetAsOf || SHEET_AS_OF);
    return !isNaN(t) && !isNaN(s) && t > s;
  }
  function coaHeld(row) {
    var ans = String(row && row.coa_received || "").trim().toLowerCase();
    return ans === "no" && !(row && row.coa_released_at);
  }
  function confirmedLarge(item, qty) {
    return Object.prototype.hasOwnProperty.call(CONFIRMED_LARGE, item) && num(CONFIRMED_LARGE[item]) === num(qty);
  }
  /* Seed tab dates are packed dates. They are never an expiration. */
  function parseSeedLine(row) {
    row = row || {};
    var packed = parseExp(row.packed || row.packaged || "");
    return {
      item: row.item || "",
      lot: String(row.lot || "").trim(),
      qty: num(row.qty),
      packed: packed,
      exp: "",
      expUnknown: true,
      note: packed
        ? ("Packed " + packed + ". Expiration is unknown.")
        : "Expiration is unknown. The seed date is a packed date."
    };
  }
  /* Raw lot the sync is about to leave in QUARANTINE. Null for bags,
     film, and any row that is not a raw insert or update. receiving_log_id
     stays null: this is not a receipt. */
  function holdSpecForAction(action, item) {
    if (!action) return null;
    if (action.op !== "insert" && action.op !== "update") return null;
    if (String(action.location || "").toUpperCase() !== "QUARANTINE") return null;
    if (!(num(action.qty) > 0)) return null;
    var it = item || { id: action.item, code: action.item, name: action.desc || "", category: action.category || "" };
    if (!rawItem(it)) return null;
    return {
      held_by: OPERATOR,
      item_id: action.item,
      item_name: it.name || action.desc || action.item || "",
      lot: action.lot || "",
      hold_qty: num(action.qty),
      hold_reason: "Inventory sync placed this raw lot in QUARANTINE. Not a receipt.",
      receiving_log_id: null,
      status: "held"
    };
  }
  function rawItem(it) {
    if (!it) return false;
    var cat = String(it.category || "").toLowerCase();
    if (cat.indexOf("season") >= 0 || cat === "seed" || cat === "seeds" || cat.indexOf("seed") === 0) return true;
    var blob = [it.id, it.code, it.name, it.flavor].join(" ").toLowerCase();
    if (blob.indexOf("maltodextrin") >= 0 || blob.indexOf("stevia") >= 0) return true;
    if (/(^|[^a-z])oil([^a-z]|$)/.test(blob)) return true;
    return false;
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
    return out;
  }
  function findItem(items, code) {
    var wants = {};
    aliases(code).forEach(function (a) { wants[a.toLowerCase()] = 1; });
    var found = null;
    (items || []).forEach(function (it) {
      if (!it || found) return;
      if (wants[String(it.id || "").toLowerCase()] || wants[String(it.code || "").toLowerCase()] || wants[String(it.name || "").toLowerCase()]) found = it;
    });
    return found;
  }
  function rowsFor(stock, it) {
    if (!it) return [];
    var ids = {};
    aliases(it.id).concat(aliases(it.code)).forEach(function (a) { ids[a] = 1; });
    ids[it.id] = 1;
    if (it.code) ids[it.code] = 1;
    return (stock || []).filter(function (r) { return r && ids[r.item_id]; }).map(function (r) {
      return {
        item_id: it.id,
        source_id: r.item_id,
        location: r.location || "",
        lot: r.lot || "",
        qty: num(r.qty),
        expires_on: r.expires_on ? String(r.expires_on).slice(0, 10) : "",
        updated_at: r.updated_at || "",
        coa_received: r.coa_received || "",
        coa_released_at: r.coa_released_at || ""
      };
    });
  }

  function planItemLots(itemId, lines, rows, opts) {
    opts = opts || {};
    var today = opts.today || "2026-11-06";
    var cap = opts.cap || CAP;
    var actions = [];
    var holds = [];
    var notes = [];
    var protectedKeys = {};
    (lines || []).forEach(function (line) {
      if (line.holdNote) notes.push({ item: itemId, lot: line.lot || "", reason: line.holdNote });
      if (line.hold === "special") {
        protectedKeys[lotKey(line.lot)] = line.holdReason || "Special hold.";
        holds.push({ item: itemId, lot: line.lot || "", sheet: num(line.qty), reason: line.holdReason || "Special hold." });
      }
      if (line.hold && line.hold !== "special") {
        holds.push({ item: itemId || "", desc: line.desc || "", lot: line.lot || "", sheet: num(line.qty), reason: line.holdReason || line.hold });
      }
    });
    var active = (lines || []).filter(function (line) { return line.item && !line.hold; });
    active.forEach(function (line) {
      if (num(line.qty) > cap) {
        var key = lotKey(line.lot);
        if (key) protectedKeys[key] = "over cap";
        holds.push({ item: itemId, lot: line.lot || "", sheet: num(line.qty), reason: "Quantity " + num(line.qty) + " is over 100,000. Held as a likely typo." });
      }
    });
    var usable = active.filter(function (line) { return !(num(line.qty) > cap); });
    var grouped = {};
    var targets = [];
    usable.forEach(function (line) {
      if (!(num(line.qty) > 0)) return;
      var key = lotKey(line.lot);
      if (protectedKeys[key]) return;
      var exp = parseExp(line.exp);
      var expired = !!(exp && exp < today);
      var loc = expired ? "QUARANTINE" : mapLocation(line.locCode, line.note);
      var gk = key + "\n" + loc;
      if (!grouped[gk]) {
        grouped[gk] = { lotKey: key, lot: String(line.lot || "").trim(), location: loc, qty: 0, exp: exp, desc: line.desc || "", expired: expired, parts: 0 };
        targets.push(grouped[gk]);
      }
      grouped[gk].qty = num(grouped[gk].qty + num(line.qty));
      grouped[gk].parts += 1;
      if (exp && (!grouped[gk].exp || exp < grouped[gk].exp)) grouped[gk].exp = exp;
    });
    targets.forEach(function (t) {
      if (t.location === "QUARANTINE") return;
      var held = (rows || []).some(function (r) { return lotKey(r.lot) === t.lotKey && t.lotKey && coaHeld(r); });
      if (!held && !t.lotKey) held = (rows || []).some(function (r) { return !lotKey(r.lot) && coaHeld(r); });
      if (held) t.location = "QA-HOLD";
    });
    var merged = [];
    var seen = {};
    targets.forEach(function (t) {
      var gk = t.lotKey + "\n" + t.location;
      if (!seen[gk]) {
        seen[gk] = t;
        merged.push(t);
      } else {
        seen[gk].qty = num(seen[gk].qty + t.qty);
        seen[gk].parts += t.parts;
        if (t.exp && (!seen[gk].exp || t.exp < seen[gk].exp)) seen[gk].exp = t.exp;
      }
    });
    targets = merged;
    targets.forEach(function (t) {
      if (t.parts > 1) notes.push({ item: itemId, lot: t.lot, reason: "Combined " + t.parts + " sheet rows for the same lot at " + t.location + ". Earliest expiration kept." });
    });

    function shield(row) {
      var key = lotKey(row.lot);
      if (key && protectedKeys[key]) return protectedKeys[key];
      if (isManual(row, opts.sheetAsOf || SHEET_AS_OF)) return "manual";
      return "";
    }
    var used = {};
    function take(list) {
      var i;
      for (i = 0; i < list.length; i++) if (!used[list[i]]) return list[i];
      return -1;
    }
    function sameTarget(r, t) {
      return lotKey(r.lot) === t.lotKey && r.location === t.location && num(r.qty) === num(t.qty) && (r.expires_on || "") === (t.exp || "");
    }
    targets.forEach(function (t) {
      var exact = [];
      (rows || []).forEach(function (r, i) {
        if (used[i] || r._alias) return;
        if (sameTarget(r, t)) exact.push(i);
      });
      if (exact.length) {
        used[exact[0]] = 1;
        var hit = rows[exact[0]];
        actions.push({ op: "match", item: hit.source_id || itemId, desc: t.desc, location: t.location, lot: hit.lot || t.lot || "", qty: num(t.qty), expires_on: t.exp || "", sheet: num(t.qty), from: { location: hit.location, lot: hit.lot || "", qty: num(hit.qty) } });
        return;
      }
      var same = [];
      var blanks = [];
      (rows || []).forEach(function (r, i) {
        if (r._alias || shield(r)) return;
        if (t.lotKey && lotKey(r.lot) === t.lotKey) same.push(i);
        else if (!lotKey(r.lot)) blanks.push(i);
      });
      blanks.sort(function (a, b) { return num(rows[b].qty) - num(rows[a].qty); });
      same.sort(function (a, b) { return (rows[a].location === t.location ? 0 : 1) - (rows[b].location === t.location ? 0 : 1); });
      var idx = take(same);
      if (idx < 0) idx = take(blanks);
      if (idx >= 0) {
        used[idx] = 1;
        var r = rows[idx];
        var lot = (t.lotKey && lotKey(r.lot) === t.lotKey && String(r.lot || "").trim()) ? String(r.lot) : t.lot;
        var exp = t.exp || "";
        var unchanged = num(r.qty) === num(t.qty) && r.location === t.location && String(r.lot || "") === lot && (r.expires_on || "") === exp;
        actions.push({
          op: unchanged ? "match" : "update",
          item: r.source_id || itemId,
          desc: t.desc,
          from: { location: r.location, lot: r.lot || "", qty: num(r.qty), expires_on: r.expires_on || "" },
          location: t.location,
          lot: lot,
          qty: num(t.qty),
          expires_on: exp,
          sheet: num(t.qty)
        });
        return;
      }
      var blocked = (rows || []).some(function (r) { return !used[rows.indexOf(r)] && shield(r) && lotKey(r.lot) === t.lotKey; });
      if (blocked) {
        holds.push({ item: itemId, lot: t.lot, sheet: num(t.qty), reason: "Lot " + (t.lot || "(blank)") + " was not rewritten. A newer manual edit or a special hold already covers it." });
        return;
      }
      actions.push({ op: "insert", item: itemId, desc: t.desc, location: t.location, lot: t.lot || "", qty: num(t.qty), expires_on: t.exp || "", sheet: num(t.qty), from: { qty: 0, location: "", lot: "" } });
    });
    (rows || []).forEach(function (r, i) {
      if (used[i]) return;
      var why = shield(r);
      if (why === "manual") {
        holds.push({ item: r.source_id || itemId, lot: r.lot || "", location: r.location, os: num(r.qty), reason: "Manual edit after the sheet date (" + r.updated_at + "). Left at " + num(r.qty) + "." });
        return;
      }
      if (why) {
        holds.push({
          item: r.source_id || itemId,
          lot: r.lot || "",
          location: r.location,
          os: num(r.qty),
          sheet: why === "over cap" ? null : null,
          reason: why === "over cap" ? "This OS lot matches a sheet line over 100,000, so it was not changed." : why
        });
        return;
      }
      if (!(num(r.qty) > 0)) return;
      actions.push({ op: "delete", item: r.source_id || itemId, location: r.location, lot: r.lot || "", qty: 0, from: { location: r.location, lot: r.lot || "", qty: num(r.qty) }, sheet: 0 });
    });
    return { actions: actions, holds: holds, notes: notes };
  }

  function planAggregate(spec, rows, opts) {
    opts = opts || {};
    var cap = opts.cap || CAP;
    var item = spec.item;
    if (spec.unsafe) return { actions: [], holds: [{ item: item, sheet: num(spec.qty), reason: spec.unsafe }] };
    if (num(spec.qty) > cap && !confirmedLarge(item, spec.qty)) return { actions: [], holds: [{ item: item, sheet: num(spec.qty), reason: "Quantity " + num(spec.qty) + " is over 100,000. Held as a likely typo." }] };
    var total = (rows || []).reduce(function (s, r) { return s + num(r.qty); }, 0);
    if ((rows || []).some(function (r) { return isManual(r, opts.sheetAsOf || SHEET_AS_OF); }) && drifted(total, spec.qty)) {
      return { actions: [], holds: [{ item: item, sheet: num(spec.qty), os: num(total), reason: "A stock row was edited after the sheet date. The sheet was not written over it." }] };
    }
    if (!rows.length && !(num(spec.qty) > 0)) return { actions: [{ op: "match", item: item, qty: 0, sheet: 0 }], holds: [] };
    if (!rows.length && num(spec.qty) > 0) {
      if (!spec.create && spec.missing) return { actions: [], holds: [{ item: item, sheet: num(spec.qty), reason: "Item is not in OS. Not created." }] };
      return { actions: [{ op: "create", item: item, desc: spec.desc || item, category: spec.category || "other", unit: spec.unit || "ea" }, { op: "insert", item: item, location: "RECEIVING", lot: "", qty: num(spec.qty), expires_on: "", sheet: num(spec.qty), from: { qty: 0 } }], holds: [] };
    }
    if (!drifted(total, spec.qty) && !spec.replaceOpen) return { actions: [{ op: "match", item: item, qty: num(total), sheet: num(spec.qty) }], holds: [] };
    if (spec.replaceOpen) {
      var place = spec.replaceOpen;
      var meaningful = (rows || []).filter(function (r) { return num(r.qty) !== 0; });
      var clean = meaningful.length === 1 && meaningful[0].location === place && num(meaningful[0].qty) === num(spec.qty);
      if (clean) return { actions: [{ op: "match", item: item, qty: num(spec.qty), sheet: num(spec.qty) }], holds: [] };
      var actions = [];
      meaningful.forEach(function (r) {
        actions.push({ op: "delete", item: r.source_id || item, location: r.location, lot: r.lot || "", qty: 0, sheet: num(spec.qty), from: { location: r.location, lot: r.lot || "", qty: num(r.qty) } });
      });
      if (num(spec.qty) > 0) actions.push({ op: "insert", item: item, location: place, lot: "", qty: num(spec.qty), expires_on: "", sheet: num(spec.qty), from: { qty: num(total) } });
      return { actions: actions, holds: [] };
    }
    var guard = 0;
    var open = [];
    (rows || []).forEach(function (r) {
      if (SKIP_LOC[String(r.location || "").toUpperCase()]) guard += num(r.qty);
      else if (num(r.qty) !== 0) open.push(r);
    });
    if (num(spec.qty) < num(guard) - 0.001) {
      return { actions: [], holds: [{ item: item, sheet: num(spec.qty), os: num(total), reason: "Sheet quantity is below the quantity already in RETURNS or a hold location. Those locations were not changed." }] };
    }
    var need = num(spec.qty - guard);
    var have = open.reduce(function (s, r) { return s + num(r.qty); }, 0);
    var delta = num(need - have);
    var actions = [];
    open.sort(function (a, b) { return num(b.qty) - num(a.qty); });
    if (!open.length) {
      actions.push({ op: "insert", item: item, location: "RECEIVING", lot: "", qty: need, expires_on: "", sheet: num(spec.qty), from: { qty: 0 } });
      return { actions: actions, holds: [] };
    }
    if (delta > 0) {
      var top = open[0];
      actions.push({ op: "update", item: top.source_id || item, location: top.location, lot: top.lot || "", qty: num(top.qty + delta), expires_on: top.expires_on || "", sheet: num(spec.qty), from: { location: top.location, lot: top.lot || "", qty: num(top.qty) } });
      return { actions: actions, holds: [] };
    }
    var left = -delta;
    open.forEach(function (r) {
      if (!(left > 0)) return;
      var take = Math.min(num(r.qty), left);
      var next = num(r.qty - take);
      left = num(left - take);
      if (next <= 0) actions.push({ op: "delete", item: r.source_id || item, location: r.location, lot: r.lot || "", qty: 0, sheet: num(spec.qty), from: { location: r.location, lot: r.lot || "", qty: num(r.qty) } });
      else actions.push({ op: "update", item: r.source_id || item, location: r.location, lot: r.lot || "", qty: next, expires_on: r.expires_on || "", sheet: num(spec.qty), from: { location: r.location, lot: r.lot || "", qty: num(r.qty) } });
    });
    return { actions: actions, holds: [] };
  }

  function aggregatesFromCsv(rows) {
    var out = [];
    var info = [];
    (rows || []).forEach(function (r) {
      if (!r) return;
      if (r.status === "HELD_NO_OS_CONTENTS_MODEL" || String(r.item || "").indexOf("UNMAPPED") === 0) {
        info.push({ item: r.item || "", sheet: num(r.sheet_qty), reason: "Distribution view is not an OS stock line." });
        return;
      }
      if (!r.item) return;
      out.push({
        item: r.item,
        qty: num(r.sheet_qty),
        category: r.category || "",
        unit: r.unit || "ea",
        desc: r.description || r.item,
        create: String(r.new_sku || "").toLowerCase() === "yes",
        status: r.status || "",
        unsafe: UNSAFE[r.item] || ""
      });
    });
    return { rows: out, info: info };
  }

  function openHolds() {
    return [
      {
        item: "NUTS-BBQ",
        lot: "H 26282",
        location: "RACK B",
        sheet: 2880,
        title: "BBQ H 26282 pallet 8",
        reason: "BBQ H 26282 pallet 8, exp 2027-10-09, 20 boxes / 2,880 bags, is in the Oct 15, Oct 20, Oct 22, and Oct 27 source blocks. The Nov 2 block swapped pallet 8 and pallet 9. Nov 5 keeps pallet 9 at 2,904 bags and omits pallet 8. Not loaded. Not part of the 18,432 BBQ total. Ask Adri whether it is still on hand. Yes would raise BBQ to 21,312. No keeps 18,432 and can close this hold."
      },
      {
        item: "",
        lot: "",
        sheet: 15408,
        title: "Oct 15 cashew receipt",
        reason: "Oct 15 block line is 5 Pallets Today, 144, 15408. That looks like 107 supplier boxes. No lot, expiry, supplier, or transport / BOL was recorded. Not backfilled. No supplier invoice is assumed."
      }
    ];
  }
  function openNotes() {
    return [
      {
        item: "NUTS-BBQ",
        lot: "H 26281",
        title: "H 26281 earliest expiry",
        reason: "BBQ lot H 26281 at RACK B is one stock row of 8,352 bags with earliest expiry 2027-10-08. Pallet 5 is 2,736 bags exp 2027-10-08, pallet 6 is 2,304 bags exp 2027-10-08, pallet 5-1/2 is 1,008 bags exp 2027-10-09, and pallet 7 is 2,304 bags exp 2027-10-09. The stock key is item, location, and lot, so the later expiry is not a second row. This is not a fully reconciled lot trace."
      },
      {
        item: "DT275-BBQ",
        title: "Dollar Tree Oct 28 stock",
        reason: "Unconfirmed Oct 28 Dollar Tree on-hand is not a pallet ledger: BBQ 7,920, Cinnamon Churro 68,160, Garlic Parm 3,600. It is not loaded into Dollar Tree Finished Goods. Waiting on Jesus."
      },
      {
        item: "DT275-BBQ",
        title: "Unverified P-Mac run",
        reason: "Unverified P-Mac run on Aug 17: machine 42, flavor S03 BYBBQ, bag size 2.75 oz, 25 boxes, 3,000 packages. No positive Dollar Tree join. Not counted with stock or with the pallet ledger."
      }
    ];
  }
  function cashewReport(stock) {
    var lines = CASHEW_STOCK.map(function (line) {
      var hit = (stock || []).filter(function (r) {
        return r && String(r.item_id || r.item || "") === line.item &&
          lotKey(r.lot) === lotKey(line.lot) &&
          String(r.location || "").toUpperCase() === String(line.location || "").toUpperCase();
      });
      var qty = hit.reduce(function (s, r) { return s + num(r.qty); }, 0);
      var exp = hit.map(function (r) { return String(r.expires_on || r.exp || "").slice(0, 10); }).filter(Boolean).sort()[0] || "";
      return {
        item: line.item,
        lot: line.lot,
        location: line.location,
        sheet: line.qty,
        os: num(qty),
        exp: line.exp,
        osExp: exp,
        match: !drifted(qty, line.qty) && (!hit.length || exp === line.exp)
      };
    });
    function sumItem(id) {
      return lines.filter(function (l) { return l.item === id; }).reduce(function (s, l) { return s + l.sheet; }, 0);
    }
    var palletSum = CASHEW_PALLETS.reduce(function (s, p) { return s + num(p.qty); }, 0);
    return {
      lines: lines,
      pallets: CASHEW_PALLETS,
      palletCount: CASHEW_PALLETS.length,
      palletSum: palletSum,
      churro: sumItem("NUTS-CINNAMONCHURRO"),
      bbq: sumItem("NUTS-BBQ"),
      total: palletSum,
      hold8Qty: 2880,
      hold8InSum: false,
      h26281Exp: "2027-10-08",
      holds: openHolds(),
      notes: openNotes()
    };
  }
  function planAll(latest, stock, items, opts) {
    opts = opts || {};
    var today = opts.today || latest.today || "2026-11-06";
    var sheetAsOf = opts.sheetAsOf || latest.sheetAsOf || SHEET_AS_OF;
    var actions = [];
    var holds = [];
    var notes = [];
    var info = [];
    var lotIds = {};
    var aliasOf = {};
    (latest.lots || []).forEach(function (line) {
      if (line.item) lotIds[line.item] = 1;
      (line.alsoClear || []).forEach(function (id) { aliasOf[id] = line.item; lotIds[id] = 1; });
      if (!line.item && line.hold) {
        holds.push({ item: "", desc: line.desc || "", lot: line.lot || "", sheet: num(line.qty), reason: line.holdReason || line.hold });
      }
    });
    var byItem = {};
    (latest.lots || []).forEach(function (line) {
      if (!line.item) return;
      if (!byItem[line.item]) byItem[line.item] = [];
      byItem[line.item].push(line);
    });
    Object.keys(byItem).forEach(function (id) {
      var it = findItem(items, id) || { id: id, code: id, category: (byItem[id][0] && byItem[id][0].category) || "seasoning" };
      var rows = rowsFor(stock, it);
      Object.keys(aliasOf).forEach(function (alias) {
        if (aliasOf[alias] !== id) return;
        var extra = findItem(items, alias) || { id: alias, code: alias };
        rowsFor(stock, extra).forEach(function (r) {
          r._alias = true;
          r.source_id = alias;
          rows.push(r);
        });
      });
      var planned = planItemLots(id, byItem[id], rows, { today: today, sheetAsOf: sheetAsOf, cap: opts.cap || CAP });
      actions = actions.concat(planned.actions);
      holds = holds.concat(planned.holds);
      notes = notes.concat(planned.notes);
    });
    (items || []).forEach(function (it) {
      if (!rawItem(it) || lotIds[it.id] || lotIds[it.code]) return;
      var qty = rowsFor(stock, it).reduce(function (s, r) { return s + num(r.qty); }, 0);
      if (qty > 0) info.push({ item: it.id, os: num(qty), reason: "Raw item is not on the latest Adriana block. On hand was left unchanged." });
    });
    var seenAgg = {};
    var agg = (latest.aggregates || []).map(function (spec) {
      var copy = Object.assign({}, spec);
      if (Object.prototype.hasOwnProperty.call(CONFIRM_QTY, copy.item)) copy.qty = CONFIRM_QTY[copy.item];
      if (Object.prototype.hasOwnProperty.call(CONFIRM_QTY, copy.item)) copy.unsafe = "";
      if (CONFIRM_CREATE[copy.item]) {
        copy.create = true;
        copy.desc = CONFIRM_CREATE[copy.item].desc;
        copy.category = CONFIRM_CREATE[copy.item].category;
        copy.unit = CONFIRM_CREATE[copy.item].unit;
      }
      if (CONFIRM_REPLACE[copy.item]) copy.replaceOpen = CONFIRM_REPLACE[copy.item];
      if (copy.item === "NUTS-CINNAMONCHURRO" || copy.item === "NUTS-BBQ") {
        copy.unsafe = "";
        copy.category = "cashews";
        copy.unit = "bags";
        copy.create = false;
      }
      seenAgg[copy.item] = 1;
      return copy;
    });
    Object.keys(CONFIRM_CREATE).forEach(function (id) {
      if (seenAgg[id]) return;
      var meta = CONFIRM_CREATE[id];
      agg.push({ item: id, qty: CONFIRM_QTY[id], desc: meta.desc, category: meta.category, unit: meta.unit, create: true, unsafe: "" });
    });
    ["SUP-TRABAG", "SUP-MASDAIPRO"].forEach(function (id) {
      if (seenAgg[id]) return;
      agg.push({ item: id, qty: 0, desc: id, category: "supply", unit: "ea", unsafe: "" });
    });
    agg.forEach(function (spec) {
      if (lotIds[spec.item]) return;
      var it = findItem(items, spec.item);
      var rows = it ? rowsFor(stock, it) : [];
      var copy = Object.assign({}, spec);
      if (!it) copy.missing = true;
      var planned = planAggregate(copy, rows, { today: today, sheetAsOf: sheetAsOf, cap: opts.cap || CAP });
      actions = actions.concat(planned.actions);
      holds = holds.concat(planned.holds);
    });
    CONFIRM_RETIRE.forEach(function (rec) {
      var it = findItem(items, rec.item);
      if (it && String(it.category || "").toLowerCase() === "retired") return;
      actions.push({ op: "retire", item: rec.item, name: rec.name, category: rec.category, desc: rec.name });
    });
    CONFIRM_PATCH.forEach(function (rec) {
      var it = findItem(items, rec.item);
      if (it && String(it.name || "").indexOf(rec.supplier) >= 0) return;
      actions.push({ op: "patch-item", item: rec.item, supplier: rec.supplier, desc: "Maltodextrin Clintose CR-10" });
    });
    notes.push({ item: "SEED-WHITE", lot: "26219H03", reason: "Packed 2026-08-07. Expiration is unknown. The 900 lb stays active." });
    holds = holds.concat(openHolds());
    notes = notes.concat(openNotes());
    notes.push({ item: "MCASE-BOX", reason: "Adriana confirmed 5,800 on 2026-11-06." });
    notes.push({ item: "BOX-S-14632", reason: "Adriana confirmed 3,250 on 2026-11-06." });
    notes.push({ item: "CASEBOX-12", reason: "Adriana confirmed 47,125 on 2026-11-06." });
    info = info.concat(latest.info || []);
    return {
      countDate: latest.countDate || COUNT_DATE,
      operator: OPERATOR,
      actions: actions,
      holds: holds,
      notes: notes,
      info: info,
      applied: actions.filter(function (a) { return a.op === "update" || a.op === "insert" || a.op === "delete" || a.op === "create"; }),
      matching: actions.filter(function (a) { return a.op === "match"; })
    };
  }

  function sheetLotQty(lines) {
    var out = {};
    (lines || []).forEach(function (line) {
      if (!line.item || line.hold || !(num(line.qty) > 0) || num(line.qty) > CAP) return;
      var key = line.item + "\n" + lotKey(line.lot);
      if (!out[key]) out[key] = { item: line.item, lot: line.lot || "", qty: 0 };
      out[key].qty = num(out[key].qty + num(line.qty));
    });
    return Object.keys(out).map(function (k) { return out[k]; });
  }
  function osLotQty(stock, item) {
    var out = {};
    rowsFor(stock, item).forEach(function (r) {
      var key = lotKey(r.lot);
      if (!out[key]) out[key] = 0;
      out[key] = num(out[key] + num(r.qty));
    });
    return out;
  }
  function reconcile(latest, stock, items) {
    var flags = [];
    var seen = {};
    sheetLotQty(latest.lots || []).forEach(function (line) {
      var it = findItem(items, line.item) || { id: line.item, code: line.item };
      var os = osLotQty(stock, it);
      var have = num(os[lotKey(line.lot)] || 0);
      seen[line.item + "\n" + lotKey(line.lot)] = 1;
      if (drifted(have, line.qty)) flags.push({ item: line.item, lot: line.lot || "", os: have, sheet: num(line.qty), kind: "lot" });
    });
    var alias = {};
    (latest.lots || []).forEach(function (line) {
      (line.alsoClear || []).forEach(function (id) { alias[id] = line.item; });
    });
    var itemSheet = {};
    (latest.lots || []).forEach(function (line) {
      if (!line.item || line.hold || num(line.qty) > CAP) return;
      if (!itemSheet[line.item]) itemSheet[line.item] = 0;
      itemSheet[line.item] = num(itemSheet[line.item] + num(line.qty));
    });
    Object.keys(itemSheet).forEach(function (id) {
      var it = findItem(items, id) || { id: id, code: id };
      var have = rowsFor(stock, it).reduce(function (s, r) { return s + num(r.qty); }, 0);
      if (drifted(have, itemSheet[id])) flags.push({ item: id, lot: "", os: num(have), sheet: itemSheet[id], kind: "item" });
    });
    (latest.aggregates || []).forEach(function (spec) {
      if (spec && (spec.item === "NUTS-CINNAMONCHURRO" || spec.item === "NUTS-BBQ")) {
        spec = Object.assign({}, spec, { unsafe: "", category: "cashews", unit: "bags" });
      }
      if (!spec.item || spec.unsafe || num(spec.qty) > CAP || alias[spec.item]) return;
      if (itemSheet[spec.item]) return;
      var it = findItem(items, spec.item);
      if (!it) return;
      var have = rowsFor(stock, it).reduce(function (s, r) { return s + num(r.qty); }, 0);
      if (drifted(have, spec.qty)) flags.push({ item: spec.item, lot: "", os: num(have), sheet: num(spec.qty), kind: "item" });
    });
    return flags;
  }

  var api = {
    CAP: CAP,
    SHEET_AS_OF: SHEET_AS_OF,
    COUNT_DATE: COUNT_DATE,
    OPERATOR: OPERATOR,
    UNSAFE: UNSAFE,
    CASHEW_STOCK: CASHEW_STOCK,
    CASHEW_PALLETS: CASHEW_PALLETS,
    openHolds: openHolds,
    openNotes: openNotes,
    cashewReport: cashewReport,
    CONFIRMED_LARGE: CONFIRMED_LARGE,
    confirmedLarge: confirmedLarge,
    parseSeedLine: parseSeedLine,
    lotKey: lotKey,
    mapLocation: mapLocation,
    parseExp: parseExp,
    drifted: drifted,
    isManual: isManual,
    coaHeld: coaHeld,
    rawItem: rawItem,
    holdSpecForAction: holdSpecForAction,
    planItemLots: planItemLots,
    planAggregate: planAggregate,
    aggregatesFromCsv: aggregatesFromCsv,
    planAll: planAll,
    reconcile: reconcile,
    findItem: findItem
  };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.INV_LOT_PLAN = api;
})(typeof window !== "undefined" ? window : globalThis);

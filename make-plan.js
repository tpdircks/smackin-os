/* Make Plan. Weekly demand report for production.
   Mirrors the Production Schedule tab of Troy's Demand Report workbook.
   View only. It does not write stock, demand, or purchase orders.
   No em dash in any string a person sees. */
(function (root) {
  "use strict";

  var BAGS_PER_CASE = 72;
  var BAGS_PER_PALLET = 2500;
  var FILM_HOLD = 100000;
  var DT_REFUSED = 332800;
  var BAGS_PER_BATCH_4 = 400;
  var SKIP_STAGE = { "asn-accepted": 1, "invoice-pending": 1, complete: 1 };

  function num(n) {
    var x = Number(n);
    return x === x ? x : 0;
  }
  function round3(n) {
    return Math.round(num(n) * 1000) / 1000;
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  }
  function fmt(n) {
    var x = round3(n);
    try { return x.toLocaleString("en-US"); } catch (e) { return String(x); }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function casesOf(bags) {
    return Math.round(num(bags) / BAGS_PER_CASE);
  }
  function palletsOf(bags) {
    return Math.round(num(bags) / BAGS_PER_PALLET * 10) / 10;
  }
  function parseDue(v) {
    var s = String(v || "").trim();
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
  function addDays(iso, days) {
    var d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function denverISO(now) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(now);
    } catch (e) {
      return new Date(now).toISOString().slice(0, 10);
    }
  }
  function weekMonday(now) {
    var iso = denverISO(now || new Date());
    var d = new Date(iso + "T12:00:00Z");
    var back = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - back);
    return d.toISOString().slice(0, 10);
  }
  function weekLabel(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    return String(parseInt(p[1], 10)) + "/" + String(parseInt(p[2], 10));
  }
  function heldLoc(loc) {
    var u = String(loc || "").toUpperCase();
    if (u === "RETURNS" || u === "RETURNS-HOLD" || u === "QUARANTINE" || u === "QA-HOLD") return true;
    return u.indexOf("HOLD") >= 0;
  }
  function isTarget(partner) {
    return /target/i.test(String(partner || ""));
  }
  function stageOf(line) {
    var m = String(line && line.notes || "").match(/\[\[SPSSTAGE:([a-z0-9-]+)\]\]/);
    return m ? m[1] : "";
  }
  function spsCandidate(line) {
    var st = String((line && line.status) || "Open");
    return st === "Open" || st === "New";
  }
  function classifyLine(line) {
    if (!line || !spsCandidate(line)) return { keep: false, reason: "status" };
    var stage = stageOf(line);
    if (stage && SKIP_STAGE[stage]) return { keep: false, reason: "stage" };
    return { keep: true };
  }
  function poStageKey(partner, po) {
    return String(partner || "").trim().toLowerCase() + "\n" + String(po || "").trim();
  }
  function indexStagedPos(rows) {
    var map = {};
    (rows || []).forEach(function (row) {
      if (!row) return;
      var po = String(row.po || "").trim();
      if (!po) return;
      var pickup = parseDue(row.pickup_date || row.pickup) || String(row.pickup_date || row.pickup || "").slice(0, 10);
      map[poStageKey(row.partner, po)] = {
        partner: String(row.partner || ""),
        po: po,
        pickup: pickup,
        note: String(row.note || "")
      };
    });
    return map;
  }
  function prettyDay(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3 || p[0].length !== 4) return String(iso || "");
    return String(parseInt(p[1], 10)) + "/" + String(parseInt(p[2], 10)) + "/" + p[0];
  }
  function splitLines(lines, now) {
    var kept = [];
    (lines || []).forEach(function (line) {
      if (classifyLine(line).keep) kept.push(line);
    });
    return { kept: kept, excluded: [], week: weekMonday(now) };
  }

  function parseShipItem(bit) {
    var m = String(bit || "").trim().match(/^(.*?)\s+x(\d+(?:\.\d+)?)\s*$/i);
    if (!m) return null;
    var left = m[1].trim();
    var sku = left.split(/\s+/)[0] || "";
    return { sku: sku, desc: left.slice(sku.length).trim(), qty: num(m[2]) };
  }
  function ecomFromShipping(rows, mapRow) {
    var by = {};
    var oz15 = 0;
    var unmapped = 0;
    var orders = 0;
    var asOf = "";
    (rows || []).forEach(function (row) {
      if (String(row.entered_by || "") !== "sync:shipstation") return;
      if (String(row.status || "") !== "awaiting_shipment") return;
      orders += 1;
      var at = String(row.created_at || row.updated_at || "");
      if (at > asOf) asOf = at;
      String(row.contents || "").split(";").forEach(function (bit) {
        var item = parseShipItem(bit);
        if (!item || !(item.qty > 0)) return;
        var mapped = typeof mapRow === "function" ? mapRow(item.sku, item.desc, item.qty) : null;
        if (!mapped || !mapped.length) { unmapped += item.qty; return; }
        mapped.forEach(function (m) {
          if (m.size === "1.5oz") { oz15 += num(m.bags); return; }
          if (m.size !== "4oz") return;
          var f = m.flavor || "";
          if (!f) return;
          if (!by[f]) by[f] = 0;
          by[f] = round3(by[f] + num(m.bags));
        });
      });
    });
    return { byFlavor: by, oz15: round3(oz15), unmapped: unmapped, orders: orders, asOf: asOf };
  }

  function bag4OnHand(items, stock) {
    var byId = {};
    (items || []).forEach(function (it) {
      if (String(it.category || "").toLowerCase() !== "bag4") return;
      byId[it.id] = it;
    });
    var out = {};
    var asOf = "";
    (stock || []).forEach(function (row) {
      var it = byId[row.item_id];
      if (!it || !(num(row.qty) > 0) || heldLoc(row.location)) return;
      var f = it.flavor || it.name || "";
      if (!out[f]) out[f] = { bags: 0, asOf: "" };
      out[f].bags = round3(out[f].bags + num(row.qty));
      var at = String(row.updated_at || "");
      if (at > out[f].asOf) out[f].asOf = at;
      if (at > asOf) asOf = at;
    });
    return { byFlavor: out, asOf: asOf };
  }

  function stockBuildBags(rows) {
    var by = {};
    var mixed = 0;
    var asOf = "";
    (rows || []).forEach(function (row) {
      var bags = num(row.bags);
      if (!(bags > 0) && row.bagsEach) bags = round3(num(row.on_hand) * num(row.bagsEach));
      if (!(bags > 0)) return;
      var at = String(row.updated_at || "");
      if (at > asOf) asOf = at;
      if (row.mixed || !row.flavor) { mixed = round3(mixed + bags); return; }
      if (!by[row.flavor]) by[row.flavor] = 0;
      by[row.flavor] = round3(by[row.flavor] + bags);
    });
    return { byFlavor: by, mixed: mixed, asOf: asOf };
  }

  function dedupeOnHand(loose, built) {
    var flavors = {};
    Object.keys(loose || {}).forEach(function (f) { flavors[norm(f)] = f; });
    Object.keys(built || {}).forEach(function (f) { if (!flavors[norm(f)]) flavors[norm(f)] = f; });
    var by = {};
    var notes = [];
    Object.keys(flavors).forEach(function (k) {
      var name = flavors[k];
      var a = 0;
      var b = 0;
      Object.keys(loose || {}).forEach(function (f) { if (norm(f) === k) a = round3(a + loose[f].bags); });
      Object.keys(built || {}).forEach(function (f) { if (norm(f) === k) b = round3(b + built[f]); });
      var used = a;
      var dropped = 0;
      var source = "stock";
      if (a > 0 && b > 0) {
        used = Math.max(a, b);
        dropped = Math.min(a, b);
        source = a >= b ? "stock" : "stock build";
        notes.push(name + ": kept " + fmt(used) + " bags from " + source + ", did not add " + fmt(dropped) + " from the other count.");
      } else if (b > 0) {
        used = b;
        source = "stock build";
      }
      by[name] = { bags: used, loose: a, built: b, dropped: dropped, source: source };
    });
    return { byFlavor: by, notes: notes };
  }

  function filmFor(items, stock) {
    var ids = {};
    (items || []).forEach(function (it) {
      var cat = String(it.category || "").toLowerCase().replace(/[\s_-]+/g, "");
      if (cat !== "film4" && cat !== "rollfilm4oz") return;
      ids[it.id] = it;
    });
    var piles = {};
    (stock || []).forEach(function (row) {
      var it = ids[row.item_id];
      if (!it || !(num(row.qty) > 0) || heldLoc(row.location)) return;
      var f = it.flavor || "";
      if (!piles[f]) piles[f] = { film4: 0, roll: 0, held: 0, asOf: "" };
      var cat = String(it.category || "").toLowerCase().replace(/[\s_-]+/g, "");
      var q = num(row.qty);
      var at = String(row.updated_at || "");
      if (at > piles[f].asOf) piles[f].asOf = at;
      if (q > FILM_HOLD) { piles[f].held = round3(piles[f].held + q); return; }
      if (cat === "rollfilm4oz") piles[f].roll = round3(piles[f].roll + q);
      else piles[f].film4 = round3(piles[f].film4 + q);
    });
    var by = {};
    var asOf = "";
    Object.keys(piles).forEach(function (f) {
      var p = piles[f];
      var confirmed = p.film4 > 0 && p.roll > 0 ? Math.max(p.film4, p.roll) : (p.film4 || p.roll);
      by[f] = { confirmed: confirmed, held: p.held, asOf: p.asOf };
      if (p.asOf > asOf) asOf = p.asOf;
    });
    return { byFlavor: by, asOf: asOf };
  }

  function seasoningFor(items, stock) {
    var ids = {};
    (items || []).forEach(function (it) {
      if (String(it.category || "").toLowerCase() !== "seasoning") return;
      ids[it.id] = it;
    });
    var by = {};
    var asOf = "";
    (stock || []).forEach(function (row) {
      var it = ids[row.item_id];
      if (!it || !(num(row.qty) > 0) || heldLoc(row.location)) return;
      var f = it.flavor || "";
      if (!by[f]) by[f] = { lbs: 0, asOf: "" };
      by[f].lbs = round3(by[f].lbs + num(row.qty));
      var at = String(row.updated_at || "");
      if (at > by[f].asOf) by[f].asOf = at;
      if (at > asOf) asOf = at;
    });
    return { byFlavor: by, asOf: asOf };
  }

  var ALIASES = {
    pcapizza: ["deepdishpizza", "cheezypizza", "cheezypizzapopcorn"],
    deepdishpizza: ["pcapizza", "cheezypizza", "cheezypizzapopcorn"],
    cheezypizza: ["pcapizza", "deepdishpizza", "cheezypizzapopcorn"],
    cheezypizzapopcorn: ["pcapizza", "deepdishpizza", "cheezypizza"]
  };
  function keysFor(flavor) {
    var k = norm(flavor);
    var list = [k];
    (ALIASES[k] || []).forEach(function (a) { if (list.indexOf(a) < 0) list.push(a); });
    return list;
  }
  function eachMatch(map, flavor, fn) {
    var keys = keysFor(flavor);
    var seen = {};
    Object.keys(map || {}).forEach(function (name) {
      var k = norm(name);
      if (keys.indexOf(k) < 0 || seen[k]) return;
      seen[k] = 1;
      fn(map[name], name);
    });
  }

  function dollarTree(items, stock) {
    var ids = {};
    (items || []).forEach(function (it) {
      if (String(it.category || "").toLowerCase() !== "dollartree275") return;
      ids[it.id] = it;
    });
    var rows = [];
    var total = 0;
    var refused = false;
    (stock || []).forEach(function (row) {
      var it = ids[row.item_id];
      if (!it || !(num(row.qty) > 0) || heldLoc(row.location)) return;
      var q = num(row.qty);
      if (q === DT_REFUSED) { refused = true; return; }
      rows.push({ flavor: it.flavor || it.name || it.id, units: q });
      total = round3(total + q);
    });
    if (total === DT_REFUSED) { refused = true; rows = []; total = 0; }
    return { rows: rows, total: total, refused: refused };
  }

  function wipHook(orders) {
    var list = orders || [];
    if (!list.length) return { connected: false, note: "No WIP PO-tab orders in OS", rows: [] };
    return {
      connected: true,
      note: "WIP PO-tab orders are listed and are not added to demand yet.",
      rows: list.map(function (po) {
        return { id: po.id || "", status: po.status || "", lines: (po.lines || []).length };
      })
    };
  }

  function linePack(line) {
    var notes = String(line && line.notes || "");
    var tag = /\[\[PACK:(seed4|cashew|minibucket)\]\]/.exec(notes);
    if (tag) return tag[1];
    var code = String(line && line.flavor_code || "");
    var flavor = String(line && line.flavor || "");
    if (code === "NUTS-BBQ" || code === "NUTS-CINNAMONCHURRO" || /^cashews?\b/i.test(flavor)) return "cashew";
    if (code === "SMA77037" || /mini\s*bucket/i.test(flavor)) return "minibucket";
    return "seed4";
  }
  function cashewOnHand(items, stock) {
    var by = { "Cashews BBQ": 0, "Cashews Cinnamon Churro": 0 };
    var ids = {};
    (items || []).forEach(function (it) { ids[it.id] = it; if (it.code) ids[it.code] = it; });
    (stock || []).forEach(function (row) {
      if (!(num(row.qty) > 0) || heldLoc(row.location)) return;
      var it = ids[row.item_id] || {};
      var id = String(it.id || row.item_id || "");
      var blob = (id + " " + (it.flavor || "") + " " + (it.name || "")).toLowerCase();
      var name = "";
      if (id === "NUTS-BBQ" || (String(it.category || "").toLowerCase() === "cashews" && /bbq/.test(blob))) name = "Cashews BBQ";
      else if (id === "NUTS-CINNAMONCHURRO" || (String(it.category || "").toLowerCase() === "cashews" && /churro|cinnamon/.test(blob))) name = "Cashews Cinnamon Churro";
      if (!name) return;
      by[name] = round3(by[name] + num(row.qty));
    });
    return by;
  }
  function miniOnHand(items, stock) {
    var ids = {};
    (items || []).forEach(function (it) {
      var cat = String(it.category || "").toLowerCase();
      if (cat === "bucket" || cat.indexOf("buckets box") >= 0 || cat.indexOf("backyard sp") >= 0) return;
      var blob = ((it.id || "") + " " + (it.code || "") + " " + (it.name || "") + " " + (it.flavor || "")).toLowerCase();
      if (/mini/.test(blob) && /bucket/.test(blob)) ids[it.id] = 1;
    });
    var bags = 0;
    (stock || []).forEach(function (row) {
      if (!ids[row.item_id] || !(num(row.qty) > 0) || heldLoc(row.location)) return;
      bags = round3(bags + num(row.qty));
    });
    return bags;
  }
  function coreNames(extra) {
    var names = [
      "OG Original", "Cinnamon Churro", "Backyard BBQ", "Garlic Parmesan", "Dill Pickle",
      "Cracked Pepper", "Cheddar Jalapeno", "Ranch", "Maple Brown Sugar", "Lemon Pepper",
      "Sour Cream & Onion", "Cheeseburger", "PCA Pizza"
    ];
    (extra || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    return names;
  }

  function build(input) {
    input = input || {};
    var now = input.now || new Date();
    var week = weekMonday(now);
    var split = splitLines(input.lines || [], now);
    var mapRow = input.mapRow;
    if (!mapRow && root.ECOM && typeof root.ECOM.mapRow === "function") mapRow = root.ECOM.mapRow;
    var ecom = ecomFromShipping(input.shipping || [], mapRow);
    var stagedRows = (input.targetStaged || []).concat((input.stockBuild || []).filter(function (row) { return row.targetStaged; }));
    var staged = {};
    var stagedAsOf = "";
    stagedRows.forEach(function (row) {
      if (!row.flavor) return;
      var bags = num(row.bags);
      if (!(bags > 0) && row.cases) bags = round3(num(row.cases) * BAGS_PER_CASE);
      if (!(bags > 0)) return;
      staged[row.flavor] = round3((staged[row.flavor] || 0) + bags);
      if (String(row.updated_at || "") > stagedAsOf) stagedAsOf = String(row.updated_at);
    });
    var sharedBuild = (input.stockBuild || []).filter(function (row) { return !row.targetStaged; });
    var cashews = cashewOnHand(input.items || [], input.stock || []);
    var minis = miniOnHand(input.items || [], input.stock || []);
    var loose = bag4OnHand(input.items || [], input.stock || []);
    var built = stockBuildBags(sharedBuild);
    var hand = dedupeOnHand(loose.byFlavor, built.byFlavor);
    var film = filmFor(input.items || [], input.stock || []);
    var seas = seasoningFor(input.items || [], input.stock || []);
    var dt = dollarTree(input.items || [], input.stock || []);
    var wip = wipHook(input.purchaseOrders || []);
    var recipe = input.recipe || (root.RECIPE_LOOKUP || null);

    var demand = {};
    var codes = {};
    var earliest = {};
    var customers = {};
    var targetLines = [];
    var otherLines = [];
    var spsAsOf = "";
    var stagedPos = indexStagedPos(input.stagedPos);
    var held = {};
    split.kept.forEach(function (line) {
      var bags = num(line.bags);
      var heldMark = stagedPos[poStageKey(line.partner, line.po)];
      if (heldMark) {
        var hk = poStageKey(line.partner, line.po);
        if (!held[hk]) held[hk] = { partner: line.partner || "", po: String(line.po || ""), bags: 0, cases: 0, pickup: heldMark.pickup, note: heldMark.note };
        held[hk].bags = round3(held[hk].bags + bags);
        held[hk].cases = round3(held[hk].cases + num(line.cases));
        return;
      }
      var f = line.flavor || "Unmapped";
      var pack = linePack(line);
      if (!demand[f]) demand[f] = { sps: 0, ecom: 0, pack: pack, target: 0 };
      if (demand[f].pack !== pack) f = pack + ": " + f;
      if (!demand[f]) demand[f] = { sps: 0, ecom: 0, pack: pack, target: 0 };
      demand[f].sps = round3(demand[f].sps + bags);
      demand[f].pack = pack;
      var partnerEarly = line.partner || "";
      if (isTarget(partnerEarly) && pack === "seed4") demand[f].target = round3((demand[f].target || 0) + bags);
      if (line.flavor_code && !codes[f]) codes[f] = line.flavor_code;
      var due = parseDue(line.due_date);
      if (due && (!earliest[f] || due < earliest[f])) earliest[f] = due;
      var partner = line.partner || "Unknown";
      if (!customers[partner]) customers[partner] = { pos: {}, bags: 0 };
      if (line.po) customers[partner].pos[line.po] = 1;
      customers[partner].bags = round3(customers[partner].bags + bags);
      var row = {
        partner: partner, po: line.po || "", dc: line.dc || "", due: due || String(line.due_date || ""),
        flavor: f, bags: bags
      };
      if (isTarget(partner)) targetLines.push(row);
      else otherLines.push(row);
      var at = String(line.created_at || line.updated_at || "");
      if (at > spsAsOf) spsAsOf = at;
    });
    Object.keys(ecom.byFlavor).forEach(function (f) {
      if (!demand[f]) demand[f] = { sps: 0, ecom: 0, pack: "seed4", target: 0 };
      demand[f].ecom = round3(demand[f].ecom + ecom.byFlavor[f]);
      if (!demand[f].pack) demand[f].pack = "seed4";
      if (!customers["E-com"]) customers["E-com"] = { pos: {}, bags: 0 };
      customers["E-com"].bags = round3(customers["E-com"].bags + ecom.byFlavor[f]);
      customers["E-com"].pos["queue"] = ecom.orders;
    });

    var names = coreNames(Object.keys(demand).filter(function (f) { return !demand[f].pack || demand[f].pack === "seed4"; }));
    ["Cashews BBQ", "Cashews Cinnamon Churro", "Mini Bucket Mixed"].forEach(function (f) {
      if (names.indexOf(f) < 0 && (demand[f] || (f.indexOf("Cashews") === 0 && cashews[f] > 0) || (f === "Mini Bucket Mixed" && minis > 0))) names.push(f);
    });
    var flavors = names.map(function (f) {
      var d = demand[f] || { sps: 0, ecom: 0, pack: f.indexOf("Cashews") === 0 ? "cashew" : (f === "Mini Bucket Mixed" ? "minibucket" : "seed4"), target: 0 };
      var pack = d.pack || "seed4";
      var dem = round3(d.sps + d.ecom);
      var oh = 0;
      var stagedBags = 0;
      if (pack === "cashew") oh = num(cashews[f] || 0);
      else if (pack === "minibucket") oh = num(minis);
      else {
        eachMatch(hand.byFlavor, f, function (row) { oh = round3(oh + num(row.bags)); });
        eachMatch(staged, f, function (bags) { stagedBags = round3(stagedBags + num(bags)); });
      }
      var targetDem = pack === "seed4" ? num(d.target) : 0;
      var uncoveredTarget = Math.max(0, round3(targetDem - stagedBags));
      var otherDem = Math.max(0, round3(dem - targetDem));
      var needShared = round3(otherDem + uncoveredTarget);
      var produce = Math.max(0, round3(needShared - oh));
      var filmConfirmed = 0;
      var filmHeld = 0;
      eachMatch(film.byFlavor, f, function (row) {
        filmConfirmed = round3(filmConfirmed + num(row.confirmed));
        filmHeld = round3(filmHeld + num(row.held));
      });
      var seasLbs = 0;
      eachMatch(seas.byFlavor, f, function (row) { seasLbs = round3(seasLbs + num(row.lbs)); });
      var per = 0;
      if (typeof recipe === "function") {
        var rec = recipe(f);
        if (rec && num(rec.seas_lbs) > 0) per = num(rec.seas_lbs) / BAGS_PER_BATCH_4;
      }
      var seasNeed = round3(produce * per);
      var kind = "covered";
      var ready = "Covered";
      if (pack !== "seed4") {
        if (produce > 0) { kind = "produce"; ready = "Make this pack"; }
      } else if (produce > 0 && filmConfirmed >= produce) { kind = "produce"; ready = "Ready to run"; }
      else if (produce > 0) { kind = "blocked"; ready = "Blocked, no film"; }
      return {
        pack: pack,
        flavor: f,
        code: codes[f] || "",
        demand: dem,
        sps: d.sps,
        ecom: d.ecom,
        onHand: oh,
        targetStaged: stagedBags,
        targetDemand: targetDem,
        toProduce: produce,
        cases: casesOf(produce),
        pallets: palletsOf(produce),
        film: filmConfirmed,
        filmHeld: filmHeld,
        seasoning: seasLbs,
        seasoningNeed: seasNeed,
        earliest: earliest[f] || "",
        ready: ready,
        kind: kind,
        surplus: Math.max(0, round3(oh - needShared))
      };
    }).filter(function (row) {
      return row.demand > 0 || row.onHand > 0 || row.targetStaged > 0;
    });

    function roll(rows) {
      var demandBags = 0;
      var onHandBags = 0;
      var produceBags = 0;
      rows.forEach(function (r) {
        if (r.demand > 0) {
          demandBags = round3(demandBags + r.demand);
          onHandBags = round3(onHandBags + r.onHand);
          produceBags = round3(produceBags + r.toProduce);
        } else onHandBags = round3(onHandBags + r.onHand);
      });
      var required = rows.filter(function (r) { return r.toProduce > 0; })
        .sort(function (a, b) { return b.toProduce - a.toProduce || a.flavor.localeCompare(b.flavor); });
      var covered = rows.filter(function (r) { return r.toProduce <= 0; })
        .sort(function (a, b) { return b.surplus - a.surplus || a.flavor.localeCompare(b.flavor); });
      return {
        required: required,
        covered: covered,
        headline: { demand: demandBags, onHand: onHandBags, toProduce: produceBags, cases: casesOf(produceBags), pallets: palletsOf(produceBags) }
      };
    }
    var packs = [
      Object.assign({ id: "seed4", title: "4 oz seed" }, roll(flavors.filter(function (r) { return r.pack !== "cashew" && r.pack !== "minibucket"; }))),
      Object.assign({ id: "cashew", title: "Cashews" }, roll(flavors.filter(function (r) { return r.pack === "cashew"; }))),
      Object.assign({ id: "minibucket", title: "Mini buckets" }, roll(flavors.filter(function (r) { return r.pack === "minibucket"; })))
    ];
    var required = packs[0].required;
    var covered = packs[0].covered;
    var demandBags = packs[0].headline.demand;
    var onHandBags = packs[0].headline.onHand;
    var produceBags = packs[0].headline.toProduce;

    var custRows = Object.keys(customers).map(function (name) {
      var c = customers[name];
      var poN = name === "E-com" ? (ecom.orders || 0) : Object.keys(c.pos).length;
      return { channel: name, pos: poN, bags: c.bags, cases: casesOf(c.bags) };
    }).sort(function (a, b) { return b.bags - a.bags || a.channel.localeCompare(b.channel); });
    var custBags = custRows.reduce(function (s, c) { return s + c.bags; }, 0);
    custRows.forEach(function (c) {
      c.pct = custBags > 0 ? c.bags / custBags : 0;
    });

    var weeks = { past: 0, thisWeek: 0, next: 0, later: 0, undated: 0 };
    split.kept.forEach(function (line) {
      if (stagedPos[poStageKey(line.partner, line.po)]) return;
      var due = parseDue(line.due_date);
      var bags = num(line.bags);
      if (!due) { weeks.undated = round3(weeks.undated + bags); return; }
      if (due < week) weeks.past = round3(weeks.past + bags);
      else if (due < addDays(week, 7)) weeks.thisWeek = round3(weeks.thisWeek + bags);
      else if (due < addDays(week, 14)) weeks.next = round3(weeks.next + bags);
      else weeks.later = round3(weeks.later + bags);
    });
    weeks.thisWeek = round3(weeks.thisWeek + Object.keys(ecom.byFlavor).reduce(function (s, f) { return s + ecom.byFlavor[f]; }, 0));

    var notes = [];
    required.filter(function (r) { return r.kind === "blocked"; }).forEach(function (r) {
      notes.push(r.flavor + " is blocked. Confirmed film is " + (r.filmHeld > 0 && !(r.film > 0) ? "held" : fmt(r.film)) + " and " + fmt(r.toProduce) + " bags are still to produce.");
    });
    notes.push(wip.note);
    notes.push("E-com is the ShipStation unshipped queue (awaiting_shipment), " + ecom.orders + " orders" + (ecom.asOf ? ", as of " + ecom.asOf.slice(0, 16).replace("T", " ") + " UTC" : "") + ". The e-com demand snapshot is not used.");
    if (ecom.oz15) notes.push("ShipStation also has " + fmt(ecom.oz15) + " bags of 1.5 oz. Those are not in the 4 oz plan.");
    if (ecom.unmapped) notes.push(fmt(ecom.unmapped) + " ShipStation units did not map to a flavor.");
    if (seas.asOf) notes.push("Seasoning on hand as of " + seas.asOf.slice(0, 16).replace("T", " ") + " UTC.");
    if (film.asOf) notes.push("Film on hand as of " + film.asOf.slice(0, 16).replace("T", " ") + " UTC. A film count over 100,000 is held and is not available.");
    if (loose.asOf) notes.push("4 oz bag stock as of " + loose.asOf.slice(0, 16).replace("T", " ") + " UTC.");
    if (built.asOf) notes.push("Stock Build as of " + built.asOf.slice(0, 16).replace("T", " ") + " UTC.");
    if (stagedAsOf) notes.push("Target staged as of " + stagedAsOf.slice(0, 16).replace("T", " ") + " UTC.");
    if (spsAsOf) notes.push("SPS demand lines as of " + spsAsOf.slice(0, 16).replace("T", " ") + " UTC.");
    notes.push("On hand for 4 oz seed uses usable bags (returns, quarantine, QA-hold, and other hold locations are out). Master Case and other non-Target Stock Build cases are the same finished goods as those bags, so the larger of the two counts is kept and the smaller is not added. Target staged cases are reserved against Target demand by flavor first. They are not mixed into on hand, and that larger-of rule does not drop them. PCA Pizza, Deep Dish Pizza, and Cheezy Pizza are one flavor.");
    notes.push("Cashews use NUTS-BBQ and NUTS-CINNAMONCHURRO only. Mini Bucket Mixed is 24 per case from mini-bucket items. Neither is subtracted from 4 oz seed stock.");
    if (built.mixed) notes.push(fmt(built.mixed) + " Stock Build bags are variety or mixed packs and are not assigned to one flavor.");
    Object.keys(held).sort().forEach(function (key) {
      var h = held[key];
      var when = h.pickup ? " Pickup " + prettyDay(h.pickup) + "." : "";
      var extra = h.note ? " " + h.note + "." : "";
      notes.push(h.partner + " " + h.po + " is built and awaiting pickup." + when + extra + " Those " + fmt(h.bags) + " bags are left out of to-produce and are not counted against on-hand stock.");
    });
    notes.push("Dollar Tree 2.75 oz is display only and is not netted against demand.");
    if (dt.refused) notes.push("The unconfirmed 332,800 Dollar Tree units were not used.");
    flavors.forEach(function (r) {
      if (r.toProduce > 0 && r.seasoningNeed > r.seasoning + 0.05) {
        notes.push(r.flavor + " seasoning is short: " + fmt(r.seasoning) + " lb on hand, about " + fmt(r.seasoningNeed) + " lb needed for the bags to produce.");
      }
    });

    var stagedBagsTotal = 0;
    Object.keys(staged).forEach(function (f) { stagedBagsTotal = round3(stagedBagsTotal + staged[f]); });

    return {
      week: week,
      weekLabel: weekLabel(week),
      headline: {
        demand: demandBags,
        onHand: onHandBags,
        toProduce: produceBags,
        cases: casesOf(produceBags),
        pallets: palletsOf(produceBags)
      },
      packs: packs,
      required: required,
      covered: covered,
      customers: custRows,
      weeks: weeks,
      excluded: split.excluded,
      targetLines: targetLines,
      otherLines: otherLines,
      ecom: ecom,
      dedupe: hand.notes,
      targetStaged: { bags: stagedBagsTotal, cases: casesOf(stagedBagsTotal) },
      heldPOs: Object.keys(held).map(function (key) { return held[key]; }),
      dollarTree: dt,
      wip: wip,
      notes: notes,
      asOf: { sps: spsAsOf, ecom: ecom.asOf, stock: loose.asOf, stockBuild: built.asOf, film: film.asOf, seasoning: seas.asOf }
    };
  }

  function filmCell(row) {
    if (row.filmHeld > 0 && !(row.film > 0)) return "held";
    if (row.filmHeld > 0) return fmt(row.film) + " (held " + fmt(row.filmHeld) + ")";
    return row.film ? fmt(row.film) : "0";
  }
  function pct(n) {
    return Math.round(num(n) * 1000) / 10 + "%";
  }

  function emailPack(plan) {
    var intro = "Attached/below is this week's demand report (week of " + plan.weekLabel + ").";
    function line(cells) { return cells.join("\t"); }
    var plain = [intro, "", "Demand " + fmt(plan.headline.demand) + " bags. On hand " + fmt(plan.headline.onHand) + ". To produce " + fmt(plan.headline.toProduce) + " bags (" + fmt(plan.headline.cases) + " cases / " + plan.headline.pallets + " pallets).", "", "PRODUCTION REQUIRED"];
    plain.push(line(["Flavor", "Code", "Demand", "On Hand", "Target staged", "To Produce", "Cases", "Pallets", "Film", "Seasoning lbs", "Earliest Due", "Ready"]));
    plan.required.forEach(function (r) {
      plain.push(line([r.flavor, r.code, r.demand, r.onHand, r.targetStaged || 0, r.toProduce, r.cases, r.pallets, filmCell(r), r.seasoning, r.earliest, r.ready]));
    });
    if (!plan.required.length) plain.push("None. Open demand is covered from stock.");
    plain.push("", "COVERED FROM STOCK");
    plain.push(line(["Flavor", "Code", "Demand", "On Hand", "Target staged", "Surplus"]));
    plan.covered.forEach(function (r) {
      plain.push(line([r.flavor, r.code, r.demand, r.onHand, r.targetStaged || 0, r.surplus]));
    });
    plain.push("", "DEMAND BY CUSTOMER");
    plain.push(line(["Channel", "POs", "Bags", "Cases", "% of demand"]));
    plan.customers.forEach(function (c) {
      plain.push(line([c.channel, c.pos, c.bags, c.cases, pct(c.pct)]));
    });
    plain.push("", "KEY NOTES");
    plan.notes.forEach(function (n) { plain.push("- " + n); });
    function htmlTable(headers, rows) {
      var h = "<tr>" + headers.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr>";
      var b = rows.map(function (row) {
        return "<tr>" + row.map(function (cell) { return "<td>" + esc(cell) + "</td>"; }).join("") + "</tr>";
      }).join("");
      return "<table border=\"1\" cellpadding=\"4\" cellspacing=\"0\">" + h + b + "</table>";
    }
    var html = "<p>" + esc(intro) + "</p><p><b>Demand</b> " + fmt(plan.headline.demand) + " bags. <b>On hand</b> " + fmt(plan.headline.onHand) + ". <b>To produce</b> " + fmt(plan.headline.toProduce) + " bags (" + fmt(plan.headline.cases) + " cases / " + plan.headline.pallets + " pallets).</p>";
    html += "<h3>Production required</h3>" + htmlTable(
      ["Flavor", "Code", "Demand", "On Hand", "Target staged", "To Produce", "Cases", "Pallets", "Film", "Seasoning lbs", "Earliest Due", "Ready"],
      plan.required.map(function (r) { return [r.flavor, r.code, fmt(r.demand), fmt(r.onHand), fmt(r.targetStaged || 0), fmt(r.toProduce), fmt(r.cases), String(r.pallets), filmCell(r), fmt(r.seasoning), r.earliest, r.ready]; })
    );
    html += "<h3>Covered from stock</h3>" + htmlTable(
      ["Flavor", "Code", "Demand", "On Hand", "Target staged", "Surplus"],
      plan.covered.map(function (r) { return [r.flavor, r.code, fmt(r.demand), fmt(r.onHand), fmt(r.targetStaged || 0), fmt(r.surplus)]; })
    );
    html += "<h3>Demand by customer</h3>" + htmlTable(
      ["Channel", "POs", "Bags", "Cases", "% of demand"],
      plan.customers.map(function (c) { return [c.channel, String(c.pos), fmt(c.bags), fmt(c.cases), pct(c.pct)]; })
    );
    html += "<h3>Key notes</h3><ul>" + plan.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    return { plain: plain.join("\n"), html: html };
  }

  function csv(plan) {
    function cell(v) {
      var s = String(v == null ? "" : v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    var rows = [["section", "flavor", "code", "demand", "on_hand", "target_staged", "to_produce", "cases", "pallets", "film", "seasoning_lbs", "earliest_due", "ready", "surplus"]];
    plan.required.forEach(function (r) {
      rows.push(["required", r.flavor, r.code, r.demand, r.onHand, r.targetStaged || 0, r.toProduce, r.cases, r.pallets, filmCell(r), r.seasoning, r.earliest, r.ready, ""]);
    });
    plan.covered.forEach(function (r) {
      rows.push(["covered", r.flavor, r.code, r.demand, r.onHand, r.targetStaged || 0, 0, 0, 0, filmCell(r), r.seasoning, r.earliest, r.ready, r.surplus]);
    });
    return rows.map(function (r) { return r.map(cell).join(","); }).join("\n") + "\n";
  }

  function dot(kind) {
    var color = kind === "covered" ? "#2E7D32" : (kind === "produce" ? "#B7791F" : "#B42318");
    var label = kind === "covered" ? "Covered" : (kind === "produce" ? "Produce, film on hand" : "Blocked, no film");
    return '<span class="mp-dot" style="background:' + color + '"></span> ' + label;
  }
  function ths(list) {
    return "<tr>" + list.map(function (h, i) {
      var right = i > 1 ? ' class="right"' : "";
      return "<th" + right + ">" + esc(h) + "</th>";
    }).join("") + "</tr>";
  }
  function view(plan) {
    var h = plan.headline;
    var packLine = (plan.packs || []).map(function (p) {
      return "<b>" + esc(p.title) + "</b> demand " + fmt(p.headline.demand) + ", on hand " + fmt(p.headline.onHand) + ", to produce " + fmt(p.headline.toProduce);
    }).join("<br>");
    var head = '<div class="card" data-slot="makeplan"><h2>Make Plan</h2>' +
      '<p class="hint">Week of ' + esc(plan.weekLabel) + ' (Monday to Sunday, America/Denver). View only. Pack types are not netted against each other.</p>' +
      '<p style="font-size:18px;margin:8px 0"><b>Demand</b> ' + fmt(h.demand) + ' bags &nbsp; <b>On hand</b> ' + fmt(h.onHand) + ' &nbsp; <b>To produce</b> ' + fmt(h.toProduce) + ' bags (' + fmt(h.cases) + ' cs / ' + h.pallets + ' pallets)</p>' +
      (packLine ? '<p class="hint">' + packLine + "</p>" : "") +
      (plan.targetStaged && plan.targetStaged.bags > 0 ? '<p class="hint">Target staged ' + fmt(plan.targetStaged.bags) + " bags (" + fmt(plan.targetStaged.cases) + " cases). Reserved against Target demand by flavor, and not mixed into on hand.</p>" : "") +
      '<p class="hint">Key: <span class="mp-dot" style="background:#2E7D32"></span> Covered &nbsp; <span class="mp-dot" style="background:#B7791F"></span> Produce this week (film on hand) &nbsp; <span class="mp-dot" style="background:#B42318"></span> Blocked, no film. Production required is largest first.</p>' +
      '<p><button class="primary" type="button" onclick="UI.makePlanCopy()">Copy as email</button> <button class="ghost" type="button" onclick="UI.makePlanCsv()">Download CSV</button></p>' +
      '<p class="hint">Sources: SPS open lines' + (plan.asOf.sps ? " as of " + esc(plan.asOf.sps.slice(0, 16).replace("T", " ")) + " UTC" : "") +
      ". E-com ShipStation unshipped" + (plan.asOf.ecom ? " as of " + esc(plan.asOf.ecom.slice(0, 16).replace("T", " ")) + " UTC" : "") +
      ". 4 oz stock" + (plan.asOf.stock ? " as of " + esc(plan.asOf.stock.slice(0, 16).replace("T", " ")) + " UTC" : "") +
      ". Stock Build" + (plan.asOf.stockBuild ? " as of " + esc(plan.asOf.stockBuild.slice(0, 16).replace("T", " ")) + " UTC" : "") + ".</p></div>";
    var reqBody = plan.required.map(function (r) {
      return "<tr class=\"mp-" + r.kind + "\"><td>" + esc(r.flavor) + "</td><td>" + esc(r.code) + "</td><td class=\"right\">" + fmt(r.demand) + "</td><td class=\"right\">" + fmt(r.onHand) + "</td><td class=\"right\">" + fmt(r.targetStaged || 0) + "</td><td class=\"right\"><b>" + fmt(r.toProduce) + "</b></td><td class=\"right\">" + fmt(r.cases) + "</td><td class=\"right\">" + r.pallets + "</td><td class=\"right\">" + esc(filmCell(r)) + "</td><td class=\"right\">" + fmt(r.seasoning) + "</td><td>" + esc(r.earliest || "") + "</td><td>" + esc(r.ready) + "</td></tr>";
    }).join("") || '<tr><td colspan="12">No production required. Open demand is covered from stock.</td></tr>';
    var req = '<div class="card"><h2 class="sub2">Production required</h2><div class="tblwrap"><table class="sortable"><thead>' +
      ths(["Flavor", "Code", "Demand", "On Hand", "Target staged", "To Produce", "Cases", "Pallets", "Film Avail", "Seasoning (lbs)", "Earliest Due", "Ready to run?"]) +
      "</thead><tbody>" + reqBody + "</tbody></table></div></div>";
    var covBody = plan.covered.map(function (r) {
      return "<tr class=\"mp-covered\"><td>" + esc(r.flavor) + "</td><td>" + esc(r.code) + "</td><td class=\"right\">" + fmt(r.demand) + "</td><td class=\"right\">" + fmt(r.onHand) + "</td><td class=\"right\">" + fmt(r.targetStaged || 0) + "</td><td class=\"right\"><b>" + fmt(r.surplus) + "</b></td></tr>";
    }).join("") || "<tr><td colspan=\"6\">No covered flavors.</td></tr>";
    var cov = '<div class="card"><h2 class="sub2">Covered from stock</h2><div class="tblwrap"><table class="sortable"><thead>' +
      ths(["Flavor", "Code", "Demand", "On Hand", "Target staged", "Surplus"]) + "</thead><tbody>" + covBody + "</tbody></table></div></div>";
    var custBody = plan.customers.map(function (c) {
      return "<tr><td>" + esc(c.channel) + "</td><td class=\"right\">" + fmt(c.pos) + "</td><td class=\"right\">" + fmt(c.bags) + "</td><td class=\"right\">" + fmt(c.cases) + "</td><td class=\"right\">" + pct(c.pct) + "</td></tr>";
    }).join("") || "<tr><td colspan=\"5\">No open demand.</td></tr>";
    var cust = '<div class="card"><h2 class="sub2">Demand by customer</h2><div class="tblwrap"><table><thead>' +
      ths(["Channel", "POs", "Bags", "Cases", "% of demand"]) + "</thead><tbody>" + custBody + "</tbody></table></div></div>";
    var w = plan.weeks;
    var strip = '<div class="card"><h2 class="sub2">Ship week</h2><div class="kpis">' +
      '<div class="kpi"><div class="n">' + fmt(w.past) + "</div><div class=\"l\">Past due</div></div>" +
      '<div class="kpi"><div class="n">' + fmt(w.thisWeek) + "</div><div class=\"l\">This week</div></div>" +
      '<div class="kpi"><div class="n">' + fmt(w.next) + "</div><div class=\"l\">Next week</div></div>" +
      '<div class="kpi"><div class="n">' + fmt(w.later) + "</div><div class=\"l\">Later</div></div></div></div>";
    var note = '<div class="card"><h2 class="sub2">Key notes</h2><ul>' + plan.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>";
    var pos = {};
    plan.targetLines.forEach(function (r) { pos[r.po] = 1; });
    var poList = Object.keys(pos).sort();
    var flavors = {};
    plan.targetLines.forEach(function (r) { flavors[r.flavor] = 1; });
    var fl = Object.keys(flavors).sort();
    var matrix = "<p class=\"hint\">No open Target lines this week.</p>";
    if (poList.length) {
      matrix = '<div class="tblwrap"><table><thead><tr><th>Flavor</th>' + poList.map(function (p) { return "<th class=\"right\">" + esc(p) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        fl.map(function (f) {
          return "<tr><td>" + esc(f) + "</td>" + poList.map(function (p) {
            var bags = 0;
            plan.targetLines.forEach(function (r) { if (r.flavor === f && r.po === p) bags += r.bags; });
            return '<td class="right">' + (bags ? fmt(bags) : "") + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }
    var other = plan.otherLines.length ? '<div class="tblwrap"><table><thead><tr><th>Partner</th><th>PO</th><th>Ship to</th><th>Due</th><th>Flavor</th><th class="right">Bags</th></tr></thead><tbody>' +
      plan.otherLines.map(function (r) {
        return "<tr><td>" + esc(r.partner) + "</td><td>" + esc(r.po) + "</td><td>" + esc(r.dc) + "</td><td>" + esc(r.due) + "</td><td>" + esc(r.flavor) + "</td><td class=\"right\">" + fmt(r.bags) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<p class=\"hint\">No non-Target lines in open demand.</p>";
    var dtRows = plan.dollarTree.rows.length ? "<ul>" + plan.dollarTree.rows.map(function (r) {
      return "<li>" + esc(r.flavor) + ": " + fmt(r.units) + " units (2.75 oz)</li>";
    }).join("") + "</ul>" : "<p class=\"hint\">No Dollar Tree 2.75 oz units in usable stock.</p>";
    var folds = '<details class="card"><summary><b>Target flavor by PO</b></summary>' + matrix + "</details>" +
      '<details class="card"><summary><b>Non-Target PO, ship-to, and due</b></summary>' + other + "</details>" +
      '<div class="card"><h2 class="sub2">Dollar Tree 2.75 oz (display only)</h2><p class="hint">Not netted against 4 oz demand. The unconfirmed 332,800 units are not used.</p>' + dtRows + "</div>";
    var css = "<style>.mp-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px}.mp-produce td{background:#FFF6E0}.mp-blocked td{background:#FDECEC}.mp-covered td{background:#EAF6EE}</style>";
    return css + head + req + cov + cust + strip + note + folds;
  }

  function fromDb(DB, now) {
    var sb = [];
    var items = (root.SB_ITEMS || []);
    var counts = DB && DB.stockBuild ? DB.stockBuild() : {};
    items.forEach(function (item) {
      var row = counts[item.key] || {};
      var bagsEach = 0;
      var mixed = false;
      if (item.cat === "Target" || item.cat === "Master Case") bagsEach = 72;
      else if (item.cat === "Walmart") bagsEach = item.bagsPer || 12;
      else mixed = true;
      if (mixed && /1\.5/.test(item.name || "")) bagsEach = 0;
      if (mixed && /4VAR|12 bags, 4oz|All 12-packs/i.test(item.name || "")) bagsEach = 0;
      sb.push({
        flavor: mixed ? "" : item.name,
        mixed: mixed,
        targetStaged: item.cat === "Target",
        on_hand: num(row.on_hand),
        bagsEach: mixed ? 0 : bagsEach,
        bags: mixed ? 0 : round3(num(row.on_hand) * bagsEach),
        updated_at: row.updated_at || ""
      });
      if (mixed && num(row.on_hand) > 0 && /4oz|4 oz|12-packs|12 bags/i.test(item.name || "") && !/1\.5/.test(item.name || "")) {
        sb[sb.length - 1].bags = round3(num(row.on_hand) * ((/48 bags/.test(item.name) ? 48 : (/12 bags/.test(item.name) ? 12 : 12))));
      }
    });
    return build({
      now: now || new Date(),
      lines: DB && DB.demandLines ? DB.demandLines() : [],
      shipping: DB && DB.shippingLog ? DB.shippingLog() : [],
      items: DB && DB.items ? DB.items() : [],
      stock: DB && DB.stock ? DB.stock() : [],
      stockBuild: sb,
      stagedPos: DB && DB.demandPoStage ? DB.demandPoStage() : [],
      purchaseOrders: DB && DB.purchaseOrders ? DB.purchaseOrders() : [],
      mapRow: root.ECOM && root.ECOM.mapRow,
      recipe: root.RECIPE_LOOKUP
    });
  }

  function isBookedText(text) {
    var blob = String(text || "");
    if (/new\s*legend|\blegend\b|\bbooked\b/i.test(blob)) return true;
    if (/\bpickup\b/i.test(blob) && !/\bship\b/i.test(blob)) return true;
    return false;
  }
  function bookingsFromOrders(orders) {
    var out = {};
    (orders || []).forEach(function (row) {
      var po = String(row.customer_po || row.po_num || row.po || "");
      if (!po) return;
      var appt = String(row.appointment || "").trim();
      var pickup = String(row.pickup_date || "").trim();
      var blob = [appt, pickup, row.notes, row.carrier, row.load, row.lane].join(" ");
      if (appt || pickup || isBookedText(blob)) out[po] = true;
    });
    return out;
  }
  function groupNeedCases(g) {
    if (num(g.cases) > 0) return round3(g.cases);
    if (num(g.bags) > 0) return round3(num(g.bags) / BAGS_PER_CASE);
    return 0;
  }
  function packStates(list) {
    return {
      pos: list.length,
      lines: list.reduce(function (s, g) { return s + g.lines; }, 0),
      cases: round3(list.reduce(function (s, g) { return s + groupNeedCases(g); }, 0)),
      list: list
    };
  }
  function openDemandStates(lines, opts) {
    opts = opts || {};
    var today = opts.today || denverISO(new Date());
    var bookings = opts.bookings || {};
    var marks = indexStagedPos(opts.stagedPos);
    var groups = {};
    (lines || []).forEach(function (line) {
      if (!classifyLine(line).keep) return;
      if (String(line.status || "").toLowerCase() === "test") return;
      if (String(line.batch_id || "") === "SPS-TEST") return;
      if (String(line.batch_label || "").toLowerCase().indexOf("testout") >= 0) return;
      var po = String(line.po || "");
      if (!po) return;
      var g = groups[po] || (groups[po] = {
        po: po, partner: line.partner || "Unknown", cases: 0, bags: 0, lines: 0, due: "", dueRaw: "", text: "", booked: false
      });
      g.cases = round3(g.cases + num(line.cases));
      g.bags = round3(g.bags + num(line.bags));
      g.lines += 1;
      var due = parseDue(line.due_date);
      if (due && (!g.due || due < g.due)) {
        g.due = due;
        g.dueRaw = String(line.due_date || "");
      }
      g.text += " " + [line.load, line.notes, line.appointment, line.pickup_date, line.carrier].join(" ");
      if (bookings[po] || String(line.appointment || "").trim() || String(line.pickup_date || "").trim() || isBookedText(g.text)) g.booked = true;
    });
    var pastCandidates = [];
    var awaiting = [];
    Object.keys(groups).forEach(function (po) {
      var g = groups[po];
      var mark = marks[poStageKey(g.partner, g.po)];
      if (mark) {
        g.state = "awaiting";
        g.pickup = mark.pickup || "";
        g.note = mark.note || "";
        g.marked = true;
        awaiting.push(g);
        return;
      }
      if (!g.due || g.due >= today) { g.state = "open"; return; }
      pastCandidates.push(g);
    });
    pastCandidates.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : (a.po < b.po ? -1 : a.po > b.po ? 1 : 0); });
    var left = num(opts.stagedCases);
    var past = [];
    pastCandidates.forEach(function (g) {
      var target = isTarget(g.partner);
      var need = groupNeedCases(g);
      var covered = false;
      if (target && need > 0 && left + 0.001 >= need) {
        covered = true;
        left = round3(left - need);
      }
      if (target && (covered || g.booked)) {
        g.state = "awaiting";
        awaiting.push(g);
      } else {
        g.state = "past";
        past.push(g);
      }
    });
    return { past: packStates(past), awaiting: packStates(awaiting), byPo: groups, stagedLeft: left };
  }

  var api = {
    BAGS_PER_CASE: BAGS_PER_CASE,
    BAGS_PER_PALLET: BAGS_PER_PALLET,
    FILM_HOLD: FILM_HOLD,
    DT_REFUSED: DT_REFUSED,
    weekMonday: weekMonday,
    weekLabel: weekLabel,
    classifyLine: classifyLine,
    splitLines: splitLines,
    ecomFromShipping: ecomFromShipping,
    dedupeOnHand: dedupeOnHand,
    build: build,
    emailPack: emailPack,
    csv: csv,
    view: view,
    fromDb: fromDb,
    casesOf: casesOf,
    palletsOf: palletsOf,
    denverISO: denverISO,
    bookingsFromOrders: bookingsFromOrders,
    indexStagedPos: indexStagedPos,
    openDemandStates: openDemandStates
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MAKE_PLAN = api;
})(typeof window !== "undefined" ? window : globalThis);

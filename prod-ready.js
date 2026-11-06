/* Production Readiness. Read-only.
   Lines seasoning up with film, then shows whether a recipe can run
   from usable on-hand. Does not write stock or inventory sync. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.PRODREADY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SIZES = [
    { id: "4oz", label: "4 oz", bags: 400, cats: { film4: 1 } },
    { id: "1.5oz", label: "1.5 oz", bags: 1067, cats: { film15: 1 } },
    { id: "2.75oz", label: "2.75 oz", bags: 582, cats: { film275: 1 } }
  ];
  var SIZE_BY_ID = {};
  SIZES.forEach(function (s) { SIZE_BY_ID[s.id] = s; });
  var HOLD = { "RETURNS-HOLD": 1, "QUARANTINE": 1, "QA-HOLD": 1 };
  var state = { tab: "align", flavor: "", size: "all", category: "all", short: false, item: "" };

  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function loose(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
  function flavorKey(name) {
    var s = String(name || "").toLowerCase();
    s = s.replace(/\b(seasoning|snack|snacks|film|films|bags?|impr|impressions|tmp|lto|oz)\b/g, " ");
    s = s.replace(/\d+(\.\d+)?/g, " ");
    return loose(s);
  }
  function catOf(it) {
    return String(it && it.category || "").toLowerCase().replace(/[\s_-]+/g, "");
  }
  function blob(it) {
    return String([it && it.name, it && it.code, it && it.id, it && it.flavor].join(" ")).toLowerCase();
  }
  function sizeFrom(it) {
    var cat = catOf(it);
    var text = blob(it);
    if (SIZE_BY_ID["2.75oz"].cats[cat] || /2\.75/.test(text)) return "2.75oz";
    if (SIZE_BY_ID["1.5oz"].cats[cat] || /1\.5/.test(text)) return "1.5oz";
    if (SIZE_BY_ID["4oz"].cats[cat] || /(^|[^0-9])4(\.0)?\s*oz/.test(text) || /\b4oz\b/.test(text)) return "4oz";
    return "";
  }
  function kindOf(it) {
    var cat = catOf(it);
    var text = blob(it);
    var code = loose(it && (it.code || it.id));
    if (/maltodextrin|clintose/.test(text) || cat === "maltodextrin" || cat === "adhesion" || code === "malto") return "malto";
    if (/\bstevia\b/.test(text) || cat === "stevia" || code === "stevia") return "stevia";
    if (cat === "oil" || code === "oil" || loose(it && it.name) === "oil") return "oil";
    if (cat === "seed" || cat === "seeds") {
      if (/white|lowsalt|low salt/.test(text)) return "seed-white";
      if (/brown|processed/.test(text)) return "seed-brown";
      return "seed";
    }
    if (cat.indexOf("film") === 0 || /\bfilm\b/.test(text)) return "film";
    if (cat === "seasoning" || /^\s*seasoning\b/.test(String(it && it.name || "").toLowerCase())) return "seasoning";
    if (cat === "mastercase" || cat === "packaging" || cat === "bucket") return "pack";
    return "other";
  }
  function holdLoc(loc) {
    return !!HOLD[String(loc || "").toUpperCase()];
  }
  function coaNo(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z]/g, "");
    return s === "n" || s === "no";
  }
  function released(row) {
    return !!(row && (row.coa_released_at || row.coa_released_by));
  }
  function tracked(kind) {
    return kind === "seasoning" || kind === "malto" || kind === "oil" || kind === "stevia" || kind.indexOf("seed") === 0;
  }
  function blockReasons(row, kind, today) {
    var why = [];
    if (holdLoc(row.location)) why.push("hold");
    var exp = String(row.expires_on || "").slice(0, 10);
    if (exp && today && exp < today) why.push("expired");
    if (tracked(kind) && coaNo(row.coa_received) && !released(row)) why.push("coa");
    return why;
  }
  function rowsFor(item, stock) {
    var id = String(item.id || "");
    var code = String(item.code || "");
    return (stock || []).filter(function (r) {
      var rid = String(r.item_id || r.itemId || "");
      return rid === id || (code && rid === code);
    });
  }
  function splitQty(item, stock, today, kind) {
    var usable = 0;
    var held = 0;
    var lots = [];
    rowsFor(item, stock).forEach(function (row) {
      var qty = Number(row.qty) || 0;
      if (qty === 0) return;
      var why = blockReasons(row, kind, today);
      if (why.length) held += qty;
      else if (qty > 0) usable += qty;
      lots.push({
        lot: row.lot || "",
        qty: qty,
        location: row.location || "",
        expires: String(row.expires_on || "").slice(0, 10),
        why: why
      });
    });
    return { usable: usable, held: held, lots: lots };
  }
  function sumItems(list, stock, today, kind) {
    var usable = 0;
    var held = 0;
    var lots = [];
    (list || []).forEach(function (it) {
      var part = splitQty(it, stock, today, kind);
      usable += part.usable;
      held += part.held;
      part.lots.forEach(function (lot) { lots.push(lot); });
    });
    return { usable: usable, held: held, lots: lots };
  }
  function seasRate(recipe) {
    if (!recipe) return null;
    if (num(recipe.seas_lbs) != null) return num(recipe.seas_lbs);
    if (num(recipe.wip_lbs_per_batch) != null) return num(recipe.wip_lbs_per_batch);
    if (num(recipe.wip_ing_lbs_per_batch) != null) return num(recipe.wip_ing_lbs_per_batch);
    return null;
  }
  function maltRate(recipe) {
    if (!recipe) return null;
    if (num(recipe.malto_lbs) != null) return num(recipe.malto_lbs);
    if (num(recipe.wip_malt_lbs) != null) return num(recipe.wip_malt_lbs);
    return null;
  }
  function bagsFor(lbs, perBatch, bags) {
    if (lbs == null || perBatch == null || !(perBatch > 0) || bags == null) return null;
    return Math.floor((lbs / perBatch) * bags);
  }
  function groupName(g) {
    if (g.recipe && g.recipe.name) return g.recipe.name;
    if (g.seas.length && g.seas[0].flavor) return g.seas[0].flavor;
    if (g.seas.length) return String(g.seas[0].name || "").replace(/^seasoning\s*-\s*/i, "");
    var film = null;
    SIZES.forEach(function (s) { if (!film && g.films[s.id].length) film = g.films[s.id][0]; });
    if (film && film.flavor) return film.flavor;
    return g.key;
  }
  function ensure(groups, key, recipe) {
    if (!key) return null;
    if (!groups[key]) {
      groups[key] = { key: key, recipe: recipe || null, seas: [], films: { "4oz": [], "1.5oz": [], "2.75oz": [] }, lto: false };
    }
    if (recipe && !groups[key].recipe) groups[key].recipe = recipe;
    return groups[key];
  }
  function buildGroups(input) {
    var groups = {};
    var recipes = input.recipes || {};
    Object.keys(recipes).forEach(function (k) {
      var r = recipes[k];
      if (!r) return;
      ensure(groups, flavorKey(r.name) || k, r);
    });
    (input.missing || []).forEach(function (r) {
      var g = ensure(groups, flavorKey(r.name), null);
      if (g && !g.recipe) g.recipe = r;
      if (g) g.approvedOnly = true;
    });
    (input.items || []).forEach(function (it) {
      var kind = kindOf(it);
      if (kind === "seasoning") {
        var key = flavorKey(it.flavor || it.name);
        var g = ensure(groups, key, null);
        if (g) {
          g.seas.push(it);
          if (/^tmp/i.test(it.code || it.id || "")) g.lto = true;
        }
      } else if (kind === "film") {
        var size = sizeFrom(it);
        var fkey = flavorKey(it.flavor || it.name);
        var fg = ensure(groups, fkey, null);
        if (fg && size && fg.films[size]) {
          fg.films[size].push(it);
          if (/^tmp/i.test(it.code || it.id || "")) fg.lto = true;
        }
      }
    });
    return groups;
  }
  function receivedFor(seasItems, recv, key) {
    var ids = {};
    (seasItems || []).forEach(function (it) { ids[String(it.id)] = 1; if (it.code) ids[String(it.code)] = 1; });
    var rows = [];
    var qty = 0;
    (recv || []).forEach(function (r) {
      var id = String(r.item_id || "");
      var text = flavorKey([r.contents, r.notes, r.supplier].join(" "));
      var hit = ids[id] || (key && text && (text.indexOf(key) >= 0 || key.indexOf(text) >= 0) && text.length > 6);
      if (!hit) return;
      var q = Number(r.qty_received != null ? r.qty_received : r.qty) || 0;
      qty += q;
      rows.push({ date: String(r.recv_date || "").slice(0, 10), lot: r.lot || "", qty: q });
    });
    rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return { qty: qty, rows: rows };
  }
  function align(input) {
    input = input || {};
    var today = input.today || "";
    var groups = buildGroups(input);
    var rows = Object.keys(groups).map(function (key) {
      var g = groups[key];
      var rate = seasRate(g.recipe);
      var seas = sumItems(g.seas, input.stock, today, "seasoning");
      var recv = receivedFor(g.seas, input.recv, key);
      var films = {};
      var flags = [];
      var anyFilm = false;
      SIZES.forEach(function (size) {
        var part = sumItems(g.films[size.id], input.stock, today, "film");
        var hasItem = g.films[size.id].length > 0;
        if (hasItem) anyFilm = true;
        films[size.id] = {
          label: size.label,
          usable: part.usable,
          held: part.held,
          lots: part.lots,
          bags: Math.floor(part.usable),
          hasItem: hasItem,
          seasBags: bagsFor(seas.usable, rate, size.bags)
        };
        if (seas.usable > 0 && hasItem && part.usable <= 0) flags.push("seasoning-no-film:" + size.id);
        if (part.usable > 0 && seas.usable <= 0) flags.push("film-no-seasoning:" + size.id);
      });
      if (seas.usable > 0 && !anyFilm) flags.push("seasoning-no-film");
      var code = (g.recipe && g.recipe.code) || "";
      if (!code && /^[A-Z]\d+$/i.test(String(g.seas[0] && (g.seas[0].code || "")).split("-").pop() || "")) {
        code = String(g.seas[0].code).split("-").pop();
      }
      return {
        key: key,
        name: groupName(g),
        code: code,
        lto: !!(g.lto || g.approvedOnly || /^l/i.test(code)),
        rate: rate,
        seasUsable: seas.usable,
        seasHeld: seas.held,
        seasLots: seas.lots,
        received: recv.qty,
        receipts: recv.rows,
        films: films,
        flags: flags
      };
    });
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return rows;
  }
  function sharedPool(input, kind) {
    var items = (input.items || []).filter(function (it) { return kindOf(it) === kind; });
    return sumItems(items, input.stock, input.today, kind.indexOf("seed") === 0 ? "seed" : kind);
  }
  function seedKind(recipe) {
    var t = String(recipe && recipe.seed_type || "").toLowerCase();
    if (/low|white/.test(t)) return "seed-white";
    if (/standard|brown|process/.test(t)) return "seed-brown";
    return "seed";
  }
  function oneInput(name, kind, perBatch, unit, pool, note) {
    var batches = perBatch > 0 ? pool.usable / perBatch : null;
    return {
      name: name,
      kind: kind,
      perBatch: perBatch,
      unit: unit,
      usable: pool.usable,
      held: pool.held,
      lots: pool.lots,
      batches: batches,
      note: note || ""
    };
  }
  function bomFor(row, input, sizeId) {
    var size = SIZE_BY_ID[sizeId] || SIZE_BY_ID["4oz"];
    var recipe = null;
    var groups = buildGroups(input);
    var g = groups[row.key];
    recipe = g && g.recipe;
    var inputs = [];
    var seedK = seedKind(recipe);
    var seedPool = seedK === "seed" ? {
      usable: sharedPool(input, "seed-white").usable + sharedPool(input, "seed-brown").usable + sharedPool(input, "seed").usable,
      held: sharedPool(input, "seed-white").held + sharedPool(input, "seed-brown").held + sharedPool(input, "seed").held,
      lots: []
    } : sharedPool(input, seedK);
    var seedNote = recipe && recipe.seed_type ? "" : "Seed type is not on this recipe. Usable seed is all seed on hand.";
    inputs.push(oneInput("Seed", "seed", 100, "lbs", seedPool, seedNote));
    var rate = seasRate(recipe);
    var seasPool = { usable: row.seasUsable, held: row.seasHeld, lots: row.seasLots };
    if (rate == null) inputs.push(oneInput("Seasoning", "seasoning", 0, "lbs", seasPool, "Seasoning amount is not on the recipe."));
    else inputs.push(oneInput("Seasoning", "seasoning", rate, "lbs", seasPool, ""));
    var malt = maltRate(recipe);
    var maltPool = sharedPool(input, "malto");
    if (malt == null) inputs.push(oneInput("Maltodextrin", "malto", 0, "lbs", maltPool, "Maltodextrin amount is not on the recipe."));
    else inputs.push(oneInput("Maltodextrin", "malto", malt, "lbs", maltPool, ""));
    var film = row.films[size.id];
    inputs.push(oneInput("Film " + size.label, "film", size.bags, "bags", {
      usable: film ? film.usable : 0,
      held: film ? film.held : 0,
      lots: film ? film.lots : []
    }, film && film.hasItem ? "" : "No " + size.label + " film item is on the item list."));
    ["oil", "stevia"].forEach(function (kind) {
      var labeled = kind === "oil" ? "Oil" : "Stevia";
      var amount = recipe && num(recipe[kind + "_lbs"]);
      var pool = sharedPool(input, kind);
      if (amount != null && amount > 0) inputs.push(oneInput(labeled, kind, amount, "lbs", pool, ""));
      else inputs.push(oneInput(labeled, kind, 0, "lbs", pool, labeled + " amount is not on the recipe."));
    });
    var limit = null;
    inputs.forEach(function (inp) {
      if (!(inp.perBatch > 0)) return;
      if (!limit || inp.batches < limit.batches) limit = inp;
    });
    var batches = limit ? limit.batches : null;
    return {
      key: row.key,
      name: row.name,
      code: row.code,
      size: size.id,
      sizeLabel: size.label,
      inputs: inputs,
      limit: limit ? limit.name : "",
      batches: batches,
      bags: batches == null ? null : Math.floor(batches * size.bags),
      lto: row.lto
    };
  }
  function bomAll(input, sizeId) {
    var rows = align(input).map(function (row) { return bomFor(row, input, sizeId || "4oz"); });
    rows.sort(function (a, b) {
      var ar = a.batches > 0 ? 0 : 1;
      var br = b.batches > 0 ? 0 : 1;
      if (ar !== br) return ar - br;
      if (ar === 0 && a.bags !== b.bags) return b.bags - a.bags;
      return String(a.name).localeCompare(String(b.name));
    });
    return rows;
  }
  function recipeGaps(recipes, missing) {
    var gaps = [];
    function add(name, where, bits) {
      if (bits.length) gaps.push({ name: name, where: where, missing: bits });
    }
    (missing || []).forEach(function (r) {
      var bits = [];
      if (seasRate(r) == null) bits.push("seasoning amount");
      if (maltRate(r) == null) bits.push("maltodextrin amount");
      if (!r.seed_type) bits.push("seed type");
      bits.push("oil amount");
      bits.push("stevia amount");
      bits.push("box or case quantity");
      add(r.name, "approved list, not a mixing recipe", bits);
    });
    Object.keys(recipes || {}).forEach(function (k) {
      var r = recipes[k];
      var bits = [];
      if (seasRate(r) == null) bits.push("seasoning amount");
      if (maltRate(r) == null) bits.push("maltodextrin amount");
      if (num(r.oil_lbs) == null) bits.push("oil amount");
      if (num(r.stevia_lbs) == null) bits.push("stevia amount");
      bits.push("box or case quantity");
      add(r.name, "mixing recipe", bits);
    });
    return gaps;
  }
  function freshness(input) {
    var newest = "";
    (input.recv || []).forEach(function (r) {
      var d = String(r.recv_date || "").slice(0, 10);
      if (d && d > newest) newest = d;
    });
    var text = newest
      ? "On-hand is the live count in OS. Newest receipt in the receiving log is " + newest + "."
      : "On-hand is the live count in OS. The receiving log has no receipt date.";
    return { newestReceipt: newest, text: text };
  }
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(headers, rows) {
    var lines = [headers.map(csvCell).join(",")];
    rows.forEach(function (row) { lines.push(row.map(csvCell).join(",")); });
    return lines.join("\n");
  }
  function alignCsv(rows) {
    var headers = ["Flavor", "Code", "Seasoning usable lbs", "Seasoning held lbs", "Seasoning received lbs", "4 oz film", "4 oz bags from film", "4 oz bags from seasoning", "1.5 oz film", "1.5 oz bags from film", "1.5 oz bags from seasoning", "2.75 oz film", "Flags"];
    var body = rows.map(function (r) {
      return [r.name, r.code, r.seasUsable, r.seasHeld, r.received,
        r.films["4oz"].usable, r.films["4oz"].bags, r.films["4oz"].seasBags,
        r.films["1.5oz"].usable, r.films["1.5oz"].bags, r.films["1.5oz"].seasBags,
        r.films["2.75oz"].usable, r.flags.join("; ")];
    });
    return toCsv(headers, body);
  }
  function bomCsv(rows) {
    var headers = ["Flavor", "Size", "Input", "Per batch", "Unit", "Usable", "Held", "Batches this input supports", "Limiting", "Max bags"];
    var body = [];
    rows.forEach(function (row) {
      row.inputs.forEach(function (inp) {
        body.push([row.name, row.sizeLabel, inp.name, inp.perBatch || "", inp.unit, inp.usable, inp.held,
          inp.batches == null ? "" : Math.round(inp.batches * 100) / 100,
          inp.name === row.limit ? "yes" : "", row.bags == null ? "" : row.bags]);
      });
    });
    return toCsv(headers, body);
  }
  function passes(row, flt) {
    flt = flt || {};
    if (flt.flavor) {
      var q = flavorKey(flt.flavor);
      var code = String(row.code || "").toLowerCase();
      if (flavorKey(row.name).indexOf(q) < 0 && code.indexOf(String(flt.flavor).toLowerCase()) < 0) return false;
    }
    if (flt.size && flt.size !== "all") {
      var film = row.films && row.films[flt.size];
      if (film && !film.hasItem && !(film.usable > 0)) return false;
    }
    if (flt.onlyShort && !(row.flags && row.flags.length)) return false;
    return true;
  }
  function flagText(flags) {
    return (flags || []).map(function (f) {
      if (f === "seasoning-no-film") return "Seasoning on hand, no film item";
      if (f.indexOf("seasoning-no-film:") === 0) return "Seasoning on hand, no usable " + (SIZE_BY_ID[f.split(":")[1]] || {}).label + " film";
      if (f.indexOf("film-no-seasoning:") === 0) return (SIZE_BY_ID[f.split(":")[1]] || {}).label + " film on hand, no usable seasoning";
      return f;
    }).join("; ");
  }
  function lotText(lots) {
    return (lots || []).filter(function (l) { return l.qty; }).map(function (l) {
      var tag = l.why && l.why.length ? " (" + l.why.join(", ") + ")" : "";
      return (l.lot || "no lot") + " " + l.qty + tag;
    }).join("; ");
  }
  function fmt(n) {
    if (n == null || n === "") return "";
    var v = Math.round(Number(n) * 100) / 100;
    return String(v);
  }

  function liveInput() {
    var db = (typeof globalThis !== "undefined" && globalThis.DB) ? globalThis.DB : null;
    return {
      recipes: (typeof globalThis !== "undefined" && globalThis.RECIPES) || {},
      missing: (typeof globalThis !== "undefined" && globalThis.WIP_APPROVED_MISSING) || [],
      items: db && db.items ? db.items() : [],
      stock: db && db.stock ? db.stock() : [],
      recv: db && db.receivingLog ? db.receivingLog() : [],
      today: new Date().toISOString().slice(0, 10)
    };
  }
  function refresh() {
    if (typeof globalThis !== "undefined" && globalThis.UI_go) globalThis.UI_go("prodready");
  }
  function readFilters() {
    function val(id) {
      var el = document.getElementById(id);
      return el ? el.value : "";
    }
    state.flavor = val("pr-flavor");
    state.size = val("pr-size") || "all";
    state.short = !!(document.getElementById("pr-short") && document.getElementById("pr-short").checked);
    state.item = val("pr-item");
  }
  function download(name, text) {
    if (typeof document === "undefined") return text;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
    return text;
  }
  function view() {
    var input = liveInput();
    var fresh = freshness(input);
    var alignRows = align(input).filter(function (r) {
      return passes(r, { flavor: state.flavor, size: state.size, onlyShort: state.tab === "align" && state.short });
    });
    var bomRows = bomAll(input, state.size === "all" ? "4oz" : state.size);
    if (state.item) {
      var q = flavorKey(state.item);
      bomRows = bomRows.filter(function (r) { return flavorKey(r.name).indexOf(q) >= 0 || String(r.code).toLowerCase().indexOf(state.item.toLowerCase()) >= 0; });
    }
    if (state.tab === "bom" && state.short) bomRows = bomRows.filter(function (r) { return !(r.batches > 0); });
    var gaps = recipeGaps(input.recipes, input.missing);
    var gapNames = {};
    gaps.forEach(function (g) { if (g.where.indexOf("approved") === 0) gapNames[g.name] = 1; });
    var head = '<div class="card" id="prod-ready"><h2>Production Readiness</h2>' +
      '<p class="hint">' + esc(fresh.text) + ' Shared seed, maltodextrin, oil, and stevia are not reserved across flavors. Raw Materials, under Inventory, is still the full item list.</p>' +
      '<div class="ordtabs">' +
      '<button type="button" class="' + (state.tab === "align" ? "active" : "") + '" onclick="PRODREADY.tab(\'align\')">Seasoning and film</button>' +
      '<button type="button" class="' + (state.tab === "bom" ? "active" : "") + '" onclick="PRODREADY.tab(\'bom\')">Can we run it</button>' +
      '</div>' +
      '<div class="row" style="margin-top:10px">' +
      '<div><label>Flavor</label><input id="pr-flavor" value="' + esc(state.flavor) + '" placeholder="Texas Beef Brisket"></div>' +
      '<div><label>Size</label><select id="pr-size">' +
      ["all", "4oz", "1.5oz", "2.75oz"].map(function (id) {
        var label = id === "all" ? "All sizes" : SIZE_BY_ID[id].label;
        return '<option value="' + id + '"' + (state.size === id ? " selected" : "") + ">" + label + "</option>";
      }).join("") +
      '</select></div>' +
      (state.tab === "bom" ? '<div><label>Item</label><input id="pr-item" value="' + esc(state.item) + '" placeholder="One flavor, or leave blank for all"></div>' : "") +
      '<div><label>Only shortages</label><input id="pr-short" type="checkbox"' + (state.short ? " checked" : "") + "></div>" +
      "</div>" +
      '<p><button type="button" class="primary" onclick="PRODREADY.apply()">Apply filter</button> ' +
      '<button type="button" class="ghost" onclick="PRODREADY.exportCsv()">CSV</button> ' +
      '<button type="button" class="ghost" onclick="window.print()">Print / PDF</button></p>';
    var body = "";
    if (state.tab === "align") {
      body = alignTable(alignRows);
    } else if (state.item && bomRows.length === 1) {
      body = bomDetail(bomRows[0]);
    } else {
      body = bomTable(bomRows);
    }
    var gapHtml = '<p class="hint">Oil, stevia, and box or case quantities are not on the mixing recipes, so they are not a limit. ' +
      Object.keys(gapNames).length + " approved flavors are not mixing recipes yet, including Texas Beef Brisket Snack Seasoning.</p>";
    return head + body + gapHtml + "</div>";
  }
  function alignTable(rows) {
    if (!rows.length) return '<p class="muted">No flavors match this filter.</p>';
    var html = '<table class="sortable"><thead><tr><th>Flavor</th><th>Seasoning usable</th><th>Held / quarantine / expired</th><th>Received</th><th>4 oz film</th><th>1.5 oz film</th><th>2.75 oz film</th><th>Flags</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      function filmCell(id) {
        var f = r.films[id];
        if (!f.hasItem && !(f.usable > 0)) return '<td class="muted">none</td>';
        return "<td>" + fmt(f.usable) + " usable" + (f.held ? ", " + fmt(f.held) + " held" : "") +
          "<div class=\"muted sm\">" + (f.bags == null ? "" : fmt(f.bags) + " bags from film") +
          (f.seasBags == null ? "" : " / " + fmt(f.seasBags) + " from seasoning") + "</div></td>";
      }
      html += "<tr><td><b>" + esc(r.name) + "</b>" + (r.code ? " <span class=\"muted sm\">" + esc(r.code) + "</span>" : "") +
        (r.lto ? ' <span class="pill">LTO</span>' : "") +
        "<div class=\"muted sm\">" + esc(lotText(r.seasLots)) + "</div></td>" +
        "<td>" + fmt(r.seasUsable) + " lbs" + (r.rate == null ? '<div class="muted sm">rate not on recipe</div>' : "") + "</td>" +
        "<td>" + fmt(r.seasHeld) + "</td>" +
        "<td>" + fmt(r.received) + "</td>" +
        filmCell("4oz") + filmCell("1.5oz") + filmCell("2.75oz") +
        "<td>" + esc(flagText(r.flags)) + "</td></tr>";
    });
    return html + "</tbody></table>";
  }
  function bomTable(rows) {
    if (!rows.length) return '<p class="muted">No items match this filter.</p>';
    var html = '<table class="sortable"><thead><tr><th>Flavor</th><th>Size</th><th>Max bags</th><th>Limiting input</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var run = r.batches > 0;
      html += '<tr><td><b>' + esc(r.name) + "</b>" + (r.lto ? ' <span class="pill">LTO</span>' : "") + "</td>" +
        "<td>" + esc(r.sizeLabel) + "</td>" +
        "<td>" + (r.bags == null ? "" : fmt(r.bags)) + "</td>" +
        "<td>" + (run ? esc(r.limit) : '<b>Short</b> ' + esc(r.limit || "")) + "</td>" +
        '<td><button type="button" class="ghost sm" onclick="PRODREADY.openItem(\'' + esc(r.key) + '\')">Details</button></td></tr>';
    });
    return html + "</tbody></table>";
  }
  function bomDetail(row) {
    var html = "<h2 class=\"sub2\">" + esc(row.name) + " &middot; " + esc(row.sizeLabel) + "</h2>" +
      "<p>Max producible: <b>" + (row.bags == null ? "n/a" : fmt(row.bags) + " bags") + "</b>. Limiting input: <b>" + esc(row.limit || "none") + "</b>.</p>" +
      '<table><thead><tr><th>Input</th><th>Per batch</th><th>Usable</th><th>Held aside</th><th>Batches this input supports</th></tr></thead><tbody>';
    row.inputs.forEach(function (inp) {
      var mark = inp.name === row.limit ? " <b>(limits the run)</b>" : "";
      html += "<tr><td>" + esc(inp.name) + mark + (inp.note ? '<div class="muted sm">' + esc(inp.note) + "</div>" : "") + "</td>" +
        "<td>" + (inp.perBatch ? fmt(inp.perBatch) + " " + esc(inp.unit) : "") + "</td>" +
        "<td>" + fmt(inp.usable) + "</td><td>" + fmt(inp.held) + (inp.lots && inp.lots.length ? '<div class="muted sm">' + esc(lotText(inp.lots)) + "</div>" : "") + "</td>" +
        "<td>" + (inp.batches == null ? "" : fmt(inp.batches)) + "</td></tr>";
    });
    return html + "</tbody></table>";
  }

  return {
    SIZES: SIZES,
    flavorKey: flavorKey,
    kindOf: kindOf,
    sizeFrom: sizeFrom,
    splitQty: splitQty,
    align: align,
    bomFor: bomFor,
    bomAll: bomAll,
    recipeGaps: recipeGaps,
    freshness: freshness,
    toCsv: toCsv,
    alignCsv: alignCsv,
    bomCsv: bomCsv,
    passes: passes,
    view: view,
    tab: function (name) { state.tab = name; refresh(); },
    openItem: function (key) { state.tab = "bom"; state.item = key; state.short = false; refresh(); },
    apply: function () { readFilters(); refresh(); },
    exportCsv: function () {
      var input = liveInput();
      var text = state.tab === "bom" ? bomCsv(bomAll(input, state.size === "all" ? "4oz" : state.size)) : alignCsv(align(input));
      return download(state.tab === "bom" ? "production-readiness-bom.csv" : "production-readiness-film.csv", text);
    }
  };
});

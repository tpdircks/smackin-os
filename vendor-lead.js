/* ============================================================================
   Smackin' OS - Vendor lead times (vendor-lead.js)
   Standalone. Does not edit app.js.

   Seasoning reorder math uses suppliers.lead_days / 7 when that supplier has
   a lead time, otherwise the existing 5 week lead. Safety stays 2 weeks.
   Belmark film uses lead_days for 1.5oz and lead_days_alt for 4oz.

   Purchasing shows supplier lead, terms, and contact. Draft supplier POs
   prefill email, phone, and remit-to. A zero reorder point can show
   "Sheet suggests N" and is never written over a non-zero reorder.
   ========================================================================== */
(function (root) {
  "use strict";

  var FALLBACK_LEAD_WEEKS = 5;
  var SAFETY_WEEKS = 2;

  var TRADE = {
    film: "Belmark Inc.",
    seas: "Rocky Mountain Spice Co.",
    pack: "PCA",
    seed: "Alternate seed vendor: Sunrich"
  };
  var ALIASES = {
    film: ["printed film supplier", "belmark", "belmark inc", "belmark inc."],
    seed: ["chs"],
    seas: ["seasoning supplier", "rocky mountain spice", "rocky mountain spice co", "rocky mountain spice co.", "rocky mountain"],
    pack: ["packaging / box supplier", "pca", "packaging corp", "packaging corporation of america"]
  };

  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) {
    var x = Number(n);
    if (!isFinite(x)) return "";
    return Math.round(x).toLocaleString("en-US");
  }
  function weeksLabel(w) {
    var n = Math.round(Number(w) * 10) / 10;
    if (!isFinite(n)) return "";
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function suppliers() {
    try { return (root.DB && root.DB.suppliers && root.DB.suppliers()) || []; }
    catch (e) { return []; }
  }
  function supplierById(id) {
    var list = suppliers();
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }
  function items() {
    try { return (root.DB && root.DB.items && root.DB.items()) || []; }
    catch (e) { return []; }
  }
  function itemByCode(code) {
    code = String(code || "").trim();
    if (!code) return null;
    var list = items();
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it) continue;
      if (String(it.code || "") === code || String(it.id || "") === code) return it;
    }
    return null;
  }
  function itemSize(it) {
    var blob = ((it && (String(it.category || "") + " " + String(it.name || "") + " " + String(it.code || "") + " " + String(it.id || ""))) || "").toLowerCase();
    if (/1\.5|film15|bag15|b15-/.test(blob)) return "1.5oz";
    if (/(^|[^0-9])4\s?oz|film4|bag4|b4-/.test(blob)) return "4oz";
    return "";
  }
  // Belmark stores 1.5oz on lead_days and 4oz on lead_days_alt.
  // Other suppliers use lead_days for every size.
  function leadDays(sup, size) {
    if (!sup) return null;
    var main = num(sup.lead_days);
    var alt = num(sup.lead_days_alt);
    if (size === "4oz" && alt != null && alt > 0) return alt;
    if (main != null && main > 0) return main;
    if (alt != null && alt > 0) return alt;
    return null;
  }
  function leadWeeks(sup, size) {
    var days = leadDays(sup, size);
    if (days == null) return null;
    return days / 7;
  }
  function coverWeeks(sup, size) {
    var lead = leadWeeks(sup, size);
    var fallback = lead == null;
    if (fallback) lead = FALLBACK_LEAD_WEEKS;
    return { lead: lead, safety: SAFETY_WEEKS, total: lead + SAFETY_WEEKS, fallback: fallback, days: leadDays(sup, size) };
  }
  function sheetSuggest(it) {
    if (!it) return null;
    var re = num(it.reorder);
    if (re != null && re > 0) return null;
    var sup = String(it.supplier || "");
    var blob = (String(it.name || "") + " " + String(it.code || "") + " " + String(it.category || "")).toLowerCase();
    if (sup === "film" && (/1\.5|film15|4\s?oz|film4/.test(blob))) return 15000;
    if (sup === "seed" && /seed|sunflower/.test(blob)) return 10000;
    if (sup === "seas" && /excalibur/.test(blob)) return 300;
    if (sup === "pack" && /36\s?(ct|pk|pack)/.test(blob)) return 250;
    if (sup === "pack" && /12\s?(ct|pk|pack)/.test(blob)) return 7500;
    if (sup === "pack" && /double sampler|sampler pack/.test(blob)) return 250;
    if (sup === "pack" && /poly\s*mail/.test(blob)) return 1500;
    if (sup === "pack" && /sticker/.test(blob)) return 1500;
    return null;
  }
  function leadPhrase(cover) {
    if (!cover) return "";
    if (cover.fallback) return FALLBACK_LEAD_WEEKS + " wk lead + " + cover.safety + " wk safety";
    var days = cover.days != null ? cover.days + " day lead, " : "";
    return days + weeksLabel(cover.lead) + " wk + " + cover.safety + " wk safety";
  }

  function installReorder() {
    if (!root.DB || typeof root.DB.recommendedSeasReorder !== "function") return false;
    if (root.DB.recommendedSeasReorder.__vl) return true;
    var orig = root.DB.recommendedSeasReorder;
    function wrapped(flavorName, size, weeklyBags, leadWeeksArg, safetyWeeks) {
      if (leadWeeksArg == null) {
        var days = leadDays(supplierById("seas"), "");
        if (days != null) leadWeeksArg = days / 7;
      }
      return orig(flavorName, size, weeklyBags, leadWeeksArg, safetyWeeks);
    }
    wrapped.__vl = true;
    root.DB.recommendedSeasReorder = wrapped;
    return true;
  }

  function matchSupplier(vendorText) {
    var n = norm(vendorText);
    if (!n) return null;
    var list = suppliers();
    var i, id, aliases, sup;
    for (i = 0; i < list.length; i++) {
      sup = list[i];
      if (sup && norm(sup.name) === n) return sup;
      if (sup && norm(sup.id) === n) return sup;
    }
    var ids = Object.keys(ALIASES);
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      aliases = ALIASES[id];
      for (var a = 0; a < aliases.length; a++) {
        if (norm(aliases[a]) === n) return supplierById(id);
      }
    }
    return null;
  }

  function styleOnce() {
    if (!root.document || root.document.getElementById("vl-style")) return;
    var s = root.document.createElement("style");
    s.id = "vl-style";
    s.textContent = [
      "#vl-suppliers .vl-sub{display:block;font-weight:600}",
      "#vl-suppliers td{vertical-align:top}",
      ".vl-note{margin-top:3px}",
      "#vl-vendor-strip{margin:6px 0 0}"
    ].join("");
    (root.document.head || root.document.documentElement).appendChild(s);
  }

  function leadLine(sup) {
    if (!sup) return "No lead time on file";
    var main = num(sup.lead_days);
    var alt = num(sup.lead_days_alt);
    if (main != null && main > 0 && alt != null && alt > 0) {
      return main + " days (1.5oz) / " + alt + " days (4oz)";
    }
    if (main != null && main > 0) return main + " days (" + weeksLabel(main / 7) + " wk)";
    return "No lead time on file";
  }
  function contactBits(sup) {
    if (!sup) return "";
    var bits = [];
    if (sup.contact_name) bits.push(sup.contact_name);
    if (sup.email) bits.push(sup.email);
    if (sup.phone) bits.push(sup.phone);
    if (sup.payment_terms) bits.push(sup.payment_terms);
    if (sup.remit_to) bits.push("Remit to " + sup.remit_to);
    var lead = leadLine(sup);
    if (lead && lead !== "No lead time on file") bits.push("Lead " + lead);
    return bits.join(". ");
  }

  function suppliersCard(view) {
    if (!view.querySelector("[onclick*='UI.purchView']")) return;
    if (view.querySelector("#po-vendor") || view.querySelector("#vl-suppliers")) return;
    styleOnce();
    var list = suppliers().slice().sort(function (a, b) {
      return String(a.name || a.id).localeCompare(String(b.name || b.id));
    });
    var rows = list.map(function (s) {
      var trade = TRADE[s.id] || "";
      var mail = s.email ? '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + "</a>" : "";
      var phone = s.phone ? '<a href="tel:' + esc(String(s.phone).replace(/[^\d+]/g, "")) + '">' + esc(s.phone) + "</a>" : "";
      return "<tr><td><b>" + esc(s.name || s.id) + "</b>" +
        (trade ? '<span class="muted sm vl-sub">' + esc(trade) + "</span>" : "") +
        (s.how_to_order ? '<span class="muted sm vl-sub">How to order: ' + esc(s.how_to_order) + "</span>" : "") +
        "</td><td>" + esc(leadLine(s)) +
        (s.lead_note ? '<div class="muted sm">' + esc(s.lead_note) + "</div>" : "") +
        "</td><td>" + esc(s.payment_terms || "") + "</td><td>" + esc(s.contact_name || "") +
        "</td><td>" + mail + "</td><td>" + phone + "</td><td>" + esc(s.remit_to || "") + "</td></tr>";
    }).join("");
    var card = root.document.createElement("div");
    card.className = "card";
    card.id = "vl-suppliers";
    card.innerHTML = '<h2 class="sub2" style="margin:0 0 6px">Suppliers</h2>' +
      '<p class="hint" style="margin:0 0 10px">Lead time, terms, and contact from the vendor list. Reorder math uses each supplier lead time when it is set, plus the existing 2 week safety. A sheet reorder level is a hint only.</p>' +
      '<div class="tblwrap"><table><thead><tr><th>Supplier</th><th>Lead time</th><th>Terms</th><th>Contact</th><th>Email</th><th>Phone</th><th>Remit to</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="7" class="muted">No suppliers loaded.</td></tr>') +
      "</tbody></table></div>";
    var cards = view.querySelectorAll(".card");
    var anchor = cards.length ? cards[0] : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor.nextSibling);
    else view.appendChild(card);
  }

  function rowItem(tr) {
    var nodes = tr.querySelectorAll(".muted, .df-meta");
    for (var i = 0; i < nodes.length; i++) {
      var parts = String(nodes[i].textContent || "").trim().split(/\s+/);
      var it = itemByCode(parts[0]);
      if (it) return it;
    }
    return null;
  }
  function headerIndex(table, pred) {
    var ths = table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [];
    for (var i = 0; i < ths.length; i++) {
      if (pred(String(ths[i].textContent || ""))) return i;
    }
    return -1;
  }
  function isReorderHeader(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!t || t.length > 40) return false;
    if (t.indexOf("suggest") >= 0 || t.indexOf("suger") >= 0) return false;
    return t === "reorder" || t === "reorder pt" || t === "reorder point" || t.indexOf("reorden") >= 0 || t.indexOf("reposi") >= 0;
  }
  function seasCoverQty(it) {
    if (!it || String(it.category || "").toLowerCase() !== "seasoning") return null;
    if (!root.DB || typeof root.DB.recommendedSeasReorder !== "function") return null;
    var flavor = it.flavor || String(it.name || "").replace(/^Seasoning\s*-\s*/i, "");
    var qty = root.DB.recommendedSeasReorder(flavor, "4oz");
    if (!(qty > 0)) return null;
    return qty;
  }
  function filmCoverQty(it, cover) {
    if (!it || !/^film/i.test(String(it.category || ""))) return null;
    if (!root.DB || typeof root.DB.unifiedWeeklyBags !== "function") return null;
    var wk = root.DB.unifiedWeeklyBags(it.flavor || "");
    if (!(wk > 0)) return null;
    return Math.ceil(wk * cover.total);
  }
  function annotateReorderTables(view) {
    var tables = view.querySelectorAll("table");
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      if (table.getAttribute("data-vl-re") === "1") continue;
      if (table.closest && table.closest("#vl-suppliers")) continue;
      var idx = headerIndex(table, isReorderHeader);
      if (idx < 0) continue;
      var body = table.tBodies && table.tBodies[0];
      if (!body) continue;
      var touched = false;
      for (var r = 0; r < body.rows.length; r++) {
        var tr = body.rows[r];
        var it = rowItem(tr);
        if (!it || !tr.cells[idx] || tr.cells[idx].querySelector(".vl-note")) continue;
        var cell = tr.cells[idx];
        var suggest = sheetSuggest(it);
        var sup = supplierById(it.supplier);
        var size = itemSize(it);
        var cover = sup ? coverWeeks(sup, size) : null;
        var qty = seasCoverQty(it);
        if (qty == null && cover && !cover.fallback) qty = filmCoverQty(it, cover);
        var note = "";
        if (suggest != null) note = "Sheet suggests " + fmt(suggest);
        else if (qty != null && cover) note = "Lead cover " + fmt(qty) + " " + (it.unit || "") + " (" + leadPhrase(cover) + ")";
        else if (cover && !cover.fallback) note = leadPhrase(cover);
        if (!note) continue;
        var div = root.document.createElement("div");
        div.className = "muted sm vl-note" + (suggest != null ? " vl-sheet" : " vl-lead");
        div.textContent = note;
        cell.appendChild(div);
        touched = true;
      }
      if (touched) table.setAttribute("data-vl-re", "1");
    }
  }

  function parseNum(s) {
    var t = String(s || "").replace(/[^0-9.\-]/g, "");
    if (!t || t === "-" || t === ".") return null;
    var n = parseFloat(t);
    return isFinite(n) ? n : null;
  }
  function augmentReorder15(view) {
    var h2 = view.querySelector("h2");
    if (!h2 || !/1\.5oz Reorder|Reorden 1\.5oz|Reposicao 1\.5oz/.test(h2.textContent || "")) return;
    if (view.querySelector("#vl-r15")) return;
    var tables = view.querySelectorAll("table");
    if (!tables.length) return;
    var film = supplierById("film");
    var cover = coverWeeks(film, "1.5oz");
    var banner = root.document.createElement("p");
    banner.id = "vl-r15";
    banner.className = "hint";
    if (cover.fallback) {
      banner.textContent = "1.5oz film has no lead time yet, so lead cover uses " + FALLBACK_LEAD_WEEKS + " wk lead plus " + SAFETY_WEEKS + " wk safety (" + weeksLabel(cover.total) + " wk).";
    } else {
      var alt = num(film && film.lead_days_alt);
      banner.textContent = "1.5oz film lead is " + cover.days + " days (" + weeksLabel(cover.lead) + " wk) plus " + SAFETY_WEEKS + " wk safety, so lead cover is " + weeksLabel(cover.total) + " wk of demand." +
        (alt ? " 4oz film uses " + alt + " days." : "") +
        " If a supplier lead time is missing, cover falls back to " + FALLBACK_LEAD_WEEKS + " wk lead plus the same safety.";
    }
    var host = h2.closest ? h2.closest(".card") : h2.parentNode;
    if (host) host.appendChild(banner);
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var wIdx = headerIndex(table, function (text) { return /wks left|sem\.\s*rest/i.test(text); });
      var ohIdx = headerIndex(table, function (text) { return /on hand|en mano|em estoque|sbOnHand/i.test(String(text)); });
      if (wIdx < 0) {
        var ths = table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells : [];
        for (var h = 0; h < ths.length; h++) {
          var label = String(ths[h].textContent || "");
          if (/Wks left|Sem\. rest|Sem\. apos/.test(label) && /left|rest/i.test(label)) wIdx = h;
        }
      }
      if (ohIdx < 0) ohIdx = 1;
      if (wIdx < 0 || !table.tHead || !table.tBodies[0]) continue;
      var th = root.document.createElement("th");
      th.className = "right";
      th.textContent = "Lead cover";
      table.tHead.rows[0].appendChild(th);
      var rows = table.tBodies[0].rows;
      for (var r = 0; r < rows.length; r++) {
        var tr = rows[r];
        var oh = tr.cells[ohIdx] ? parseNum(tr.cells[ohIdx].textContent) : null;
        var wk = tr.cells[wIdx] ? parseNum(tr.cells[wIdx].textContent) : null;
        var td = root.document.createElement("td");
        td.className = "right";
        var weekly = (oh != null && wk != null && wk > 0) ? oh / wk : null;
        if (weekly != null && weekly > 0) {
          var bags = Math.ceil(weekly * cover.total);
          var under = oh != null && oh < bags;
          td.innerHTML = "<b>" + fmt(bags) + "</b> bags" +
            '<div class="muted sm">' + esc(leadPhrase(cover)) + "</div>" +
            (under ? '<div class="muted sm">Under lead cover</div>' : "");
        } else {
          td.textContent = "-";
        }
        tr.appendChild(td);
      }
      table.setAttribute("data-vl-r15", "1");
    }
  }

  function tuneRecipes(view) {
    var paras = view.querySelectorAll("p.hint");
    for (var i = 0; i < paras.length; i++) {
      var p = paras[i];
      if (p.getAttribute("data-vl") === "1") continue;
      if (!/5 lead \+ 2 safety/.test(p.innerHTML)) continue;
      var days = leadDays(supplierById("seas"), "");
      var phrase = days != null
        ? "lead time plus 2 weeks safety (" + weeksLabel(days / 7) + " wk from a " + days + " day seasoning lead; otherwise 5 wk)"
        : "lead time plus 2 weeks safety (5 wk lead until a seasoning lead time is set)";
      p.innerHTML = p.innerHTML.replace("~7 weeks (5 lead + 2 safety)", phrase);
      p.setAttribute("data-vl", "1");
    }
  }

  function setIfEmpty(id, val) {
    var el = root.document.getElementById(id);
    if (!el || el.value || val == null || val === "") return;
    el.value = val;
  }
  function applySupplierToPo() {
    var input = root.document.getElementById("po-vendor");
    if (!input) return;
    var sup = matchSupplier(input.value);
    var strip = root.document.getElementById("vl-vendor-strip");
    var next = sup ? contactBits(sup) : "";
    if (!sup) {
      if (strip && strip.textContent) strip.textContent = "";
      return;
    }
    setIfEmpty("po-vaddr", sup.remit_to);
    setIfEmpty("po-vemail", sup.email);
    setIfEmpty("po-vphone", sup.phone);
    if (!strip) {
      strip = root.document.createElement("p");
      strip.id = "vl-vendor-strip";
      strip.className = "hint";
      if (input.parentNode && input.parentNode.parentNode) input.parentNode.parentNode.appendChild(strip);
    }
    if (strip.textContent !== next) strip.textContent = next;
  }
  function fillVendorList() {
    var dl = root.document.getElementById("dl-po-vendor");
    if (!dl) return;
    var have = {};
    var opts = dl.querySelectorAll("option");
    for (var i = 0; i < opts.length; i++) have[norm(opts[i].value)] = true;
    function add(label) {
      if (!label || have[norm(label)]) return;
      have[norm(label)] = true;
      var o = root.document.createElement("option");
      o.value = label;
      dl.appendChild(o);
    }
    var list = suppliers();
    for (var s = 0; s < list.length; s++) add(list[s].name);
    add("Belmark Inc.");
    add("Rocky Mountain Spice Co.");
    add("PCA");
    add("CHS");
  }
  function draftSupplierNote() {
    var sel = root.document.getElementById("po-sup");
    if (!sel) return;
    var sup = supplierById(sel.value);
    var note = root.document.getElementById("vl-draft-note");
    if (!sup) { if (note) note.remove(); return; }
    var next = contactBits(sup);
    if (!note) {
      note = root.document.createElement("p");
      note.id = "vl-draft-note";
      note.className = "hint";
      if (sel.parentNode) sel.parentNode.appendChild(note);
    }
    if (note.textContent !== next) note.textContent = next;
  }
  function installPoFill() {
    if (!root.UI || typeof root.UI.poVendorFill !== "function" || root.UI.poVendorFill.__vl) return false;
    var orig = root.UI.poVendorFill;
    function wrapped() {
      var r;
      try { r = orig.apply(this, arguments); } catch (e) { r = undefined; }
      try { applySupplierToPo(); } catch (e2) {}
      return r;
    }
    wrapped.__vl = true;
    root.UI.poVendorFill = wrapped;
    return true;
  }

  var painting = false;
  function onView() {
    if (painting) return;
    var view = root.document && root.document.getElementById("view");
    if (!view) return;
    painting = true;
    try {
      styleOnce();
      try { suppliersCard(view); } catch (e) {}
      try { annotateReorderTables(view); } catch (e2) {}
      try { augmentReorder15(view); } catch (e3) {}
      try { tuneRecipes(view); } catch (e4) {}
      try { fillVendorList(); applySupplierToPo(); draftSupplierNote(); } catch (e5) {}
    } finally { painting = false; }
  }
  function start() {
    installReorder();
    installPoFill();
    var view = root.document.getElementById("view");
    if (view && !view.__vlObs && typeof root.MutationObserver === "function") {
      view.__vlObs = true;
      var obs = new root.MutationObserver(function () { onView(); });
      obs.observe(view, { childList: true, subtree: true });
    }
    onView();
    if (root.DB && typeof root.DB.onChange === "function" && !root.DB.onChange.__vl) {
      root.DB.onChange.__vl = true;
      root.DB.onChange(function () { installReorder(); });
    }
  }

  root.VENDORLEAD = {
    FALLBACK_LEAD_WEEKS: FALLBACK_LEAD_WEEKS,
    SAFETY_WEEKS: SAFETY_WEEKS,
    leadDays: leadDays,
    leadWeeks: leadWeeks,
    coverWeeks: coverWeeks,
    sheetSuggest: sheetSuggest,
    itemSize: itemSize,
    matchSupplier: matchSupplier,
    installReorder: installReorder
  };

  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);

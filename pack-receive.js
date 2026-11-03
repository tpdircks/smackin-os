/* pack-receive.js
   Packaging is received in Smackin OS, not only on the Inventory 2026 sheet.
   The item box accepts the OS code, the name, or a supplier number from the
   11/02 warehouse block (3021, S-14632, 160086, and the sleeve and label ids).
   Lot, quantity, and expiration date sit on Receive for packaging the same
   way raw lots already do. The date is stored on stock.expires_on.
   Finished-goods shelf life is left alone, and this file does not change a quantity. */
(function (root) {
  "use strict";
  if (root && root.PACK_RECEIVE) return;

  var ALIAS = {
    "3021": "MCASE-BOX",
    "216569": "MCASE-BOX",
    "s14632": "BOX-S-14632",
    "14632": "BOX-S-14632",
    "boxs14632": "BOX-S-14632",
    "s14265": "BOX - BKT SPTS WH 6CT",
    "14265": "BOX - BKT SPTS WH 6CT",
    "160086": "BOX-160086",
    "261747": "LID - WHITE",
    "291260": "BKT-BOX",
    "295935": "BKT-BOX",
    "158125": "CASEBOX-12",
    "160949": "Box - MC Cashew",
    "160629": "Box - Cashew 6",
    "293468": "TGT-SHIPPER",
    "158946": "TGT-SHIPPER",
    "158947": "WM-SHIPPER",
    "159017": "BOX-24",
    "290377": "SLV-S01",
    "290369": "SLV-S02",
    "290375": "SLV-S03",
    "290374": "SLV-S04",
    "290376": "SLV-S05",
    "290378": "SLV-S07",
    "290379": "SLV-S08",
    "290124": "DISPLAY-4OZ",
    "290126": "SUP-DISHEA",
    "290488": "SUP-DISSHIBOX",
    "291423": "SUP-BAGDIS",
    "628d1914": "SUP-LABECOM",
    "hl1785353": "SUP-LABPAP",
    "c170bkt": "BKT - White Sports  Bucket 6ct",
    "530889": "BKT-CAMO"
  };

  function lang() {
    if (typeof document === "undefined") return "en";
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  var TXT = {
    en: {
      note: "The Inventory 2026 Google Sheet is not the live count. Enter the receipt here: item, lot, quantity, and expiration date. Leave the location blank and it lands in RECEIVING. Trailer, carrier, and PRO stay optional.",
      go: "Receive packaging",
      exp: "Expiration date",
      expHint: "Boxes, buckets, lids, sleeves, labels, and other packaging. Same lot and date as a raw receipt.",
      several: "Several items match. Pick one: "
    },
    es: {
      note: "La hoja Inventory 2026 no es el conteo en vivo. Registre el recibo aqui: articulo, lote, cantidad y fecha de vencimiento. Si deja el lugar en blanco, entra en RECEIVING. Trailer, transportista y PRO siguen siendo opcionales.",
      go: "Recibir empaque",
      exp: "Fecha de vencimiento",
      expHint: "Cajas, cubetas, tapas, mangas, etiquetas y otro empaque. El mismo lote y fecha que un recibo de materia prima.",
      several: "Varios articulos coinciden. Elija uno: "
    },
    pt: {
      note: "A planilha Inventory 2026 nao e a contagem ao vivo. Lance o recebimento aqui: item, lote, quantidade e validade. Deixe o local em branco e ele entra em RECEIVING. Trailer, transportadora e PRO continuam opcionais.",
      go: "Receber embalagem",
      exp: "Data de validade",
      expHint: "Caixas, baldes, tampas, sleeves, etiquetas e outras embalagens. O mesmo lote e data de um recebimento de materia-prima.",
      several: "Varios itens combinam. Escolha um: "
    }
  };
  function tx(k) {
    var d = TXT[lang()] || TXT.en;
    return d[k] != null ? d[k] : TXT.en[k];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function keyOf(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function catKey(cat) {
    return String(cat || "").toLowerCase().replace(/[\s_-]+/g, "");
  }
  function isRawCat(cat) {
    var c = catKey(cat);
    return c === "seed" || c === "seeds" || c === "seasoning" || c === "oil" || c === "stevia";
  }
  function isFinishedCat(cat) {
    var c = catKey(cat);
    return c === "bag4" || c === "bag15" || c === "film4" || c === "film15";
  }
  function isPackItem(it) {
    return !!(it && !isRawCat(it.category) && !isFinishedCat(it.category));
  }
  function items() {
    var D = root.DB;
    return D && D.items ? D.items() : [];
  }
  function findListed(id) {
    var list = items();
    var want = String(id || "").toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id || "").toLowerCase() === want || String(list[i].code || "").toLowerCase() === want) return list[i];
    }
    return null;
  }
  function aliasText(it) {
    if (!it) return "";
    var id = String(it.id || "");
    var code = String(it.code || "");
    var bits = [];
    Object.keys(ALIAS).forEach(function (k) {
      if (ALIAS[k] === id || ALIAS[k] === code) bits.push(k);
    });
    return bits.join(" ");
  }
  function candidates(raw) {
    var key = keyOf(raw);
    if (!key) return [];
    var exact = ALIAS[key] ? findListed(ALIAS[key]) : null;
    if (exact) return [exact];
    if (key.length < 4) return [];
    var out = [];
    items().forEach(function (it) {
      var hay = keyOf([it.code, it.id, it.name, it.flavor, aliasText(it)].join(" "));
      if (hay.indexOf(key) >= 0) out.push(it);
    });
    return out;
  }
  function resolve(raw) {
    var D = root.DB;
    if (!D || !D.itemByCode) return null;
    return D.itemByCode(raw);
  }

  function enrichList() {
    var list = document.getElementById("dl-items");
    if (!list || list.querySelector("option[data-pk-alias]")) return;
    var extra = "";
    Object.keys(ALIAS).forEach(function (k) {
      var it = findListed(ALIAS[k]);
      if (!it) return;
      extra += '<option data-pk-alias="1" value="' + esc(k) + '">' + esc((it.name || it.code) + " · " + k) + "</option>";
    });
    if (extra) list.insertAdjacentHTML("beforeend", extra);
  }
  function tagRows(sel) {
    var body = document.querySelector(sel);
    if (!body) return;
    Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr) {
      if (tr.getAttribute("data-pk") === "1") return;
      var muted = tr.querySelector(".muted");
      var code = muted ? String(muted.textContent || "").trim() : "";
      var it = code ? findListed(code) : null;
      var extra = it ? aliasText(it) : "";
      if (extra && tr.getAttribute("data-txt") != null) {
        tr.setAttribute("data-txt", tr.getAttribute("data-txt") + " " + extra);
      }
      tr.setAttribute("data-pk", "1");
    });
  }
  function placeNote(host, withButton) {
    if (!host || document.getElementById("pk-live-note")) return;
    var p = document.createElement("p");
    p.id = "pk-live-note";
    p.className = "hint";
    p.style.margin = "0 0 10px";
    p.textContent = tx("note");
    if (withButton) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "primary sm";
      b.style.marginLeft = "8px";
      b.textContent = tx("go");
      b.addEventListener("click", function () {
        if (typeof root.UI_go === "function") root.UI_go("receive");
      });
      p.appendChild(b);
    }
    host.insertBefore(p, host.firstChild);
  }
  function paintNote() {
    var view = document.getElementById("view");
    if (!view) return;
    var old = document.getElementById("pk-live-note");
    if (old && !view.contains(old)) old.parentNode.removeChild(old);
    if (document.getElementById("pk-live-note")) return;
    var receive = document.getElementById("r-qty");
    var card = receive ? receive.closest(".card") : null;
    if (card) { placeNote(card, false); return; }
    var inv = document.getElementById("ivx-root");
    if (inv && inv.parentNode) { placeNote(inv.parentNode, true); return; }
    var dash = document.getElementById("dashSearch");
    var dashCard = dash ? dash.closest(".card") : null;
    if (dashCard) { placeNote(dashCard, true); return; }
    var adj = document.getElementById("adjSearch");
    var adjCard = adj ? adj.closest(".card") : null;
    if (adjCard) { placeNote(adjCard, true); return; }
    var log = document.getElementById("rlBody") || document.getElementById("rl-lot");
    var logCard = log ? log.closest(".card") : null;
    if (logCard) placeNote(logCard, true);
  }
  function paintExp() {
    var lot = document.getElementById("r-lot");
    if (!lot) return;
    var row = lot.closest ? lot.closest(".row") : lot.parentNode;
    if (!row || !row.parentNode) return;
    var raw = document.getElementById("r-exp");
    var rawOn = raw && raw.getAttribute("data-rx-on") === "1";
    var it = resolve(val("r-code") || val("r-newcode"));
    var show = !rawOn && isPackItem(it);
    var box = document.getElementById("pk-exp-field");
    if (!show) {
      if (box) box.style.display = "none";
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.id = "pk-exp-field";
      box.innerHTML = '<label for="pk-exp">' + esc(tx("exp")) + '</label>' +
        '<input id="pk-exp" type="date" autocomplete="off" value="' + esc(root.__smkPkExp || "") + '">' +
        '<p class="hint" style="margin:4px 0 0">' + esc(tx("expHint")) + "</p>";
      row.parentNode.insertBefore(box, row.nextSibling);
    }
    box.style.display = "";
    var label = box.querySelector("label");
    var hint = box.querySelector(".hint");
    if (label) label.textContent = tx("exp");
    if (hint) hint.textContent = tx("expHint");
  }
  function paintScan() {
    var input = document.getElementById("r-code");
    if (!input || input.getAttribute("data-pk") === "1") return;
    input.placeholder = "Code, name, or supplier # (3021, S-14632, 160086)";
    input.setAttribute("data-pk", "1");
  }
  function paint() {
    enrichList();
    tagRows("#dashBody");
    tagRows("#adjBody");
    paintNote();
    paintScan();
    paintExp();
  }
  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  function dateISO(v) {
    var m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  function cfg() { return root.SMACKIN_CONFIG || {}; }
  async function stamp(it, lot, loc, exp) {
    var base = String(cfg().SUPABASE_URL || "").replace(/\/$/, "");
    var key = cfg().SUPABASE_ANON_KEY;
    if (!base || !key || !it) return;
    var headers = {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };
    var id = it.id || it.code;
    var where = "item_id=eq." + encodeURIComponent(id) +
      "&location=eq." + encodeURIComponent(loc || "RECEIVING") +
      "&lot=eq." + encodeURIComponent(lot || "");
    var res = await fetch(base + "/rest/v1/stock?" + where, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ expires_on: exp })
    });
    if (!res.ok) return;
    var logUrl = base + "/rest/v1/receiving_log?item_id=eq." + encodeURIComponent(id) +
      "&lot=eq." + encodeURIComponent(lot || "") + "&order=id.desc&limit=1";
    var found = await fetch(logUrl, { cache: "no-store", headers: headers });
    if (!found.ok) return;
    var logs = await found.json();
    if (logs && logs[0] && logs[0].id != null) {
      await fetch(base + "/rest/v1/receiving_log?id=eq." + encodeURIComponent(logs[0].id), {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ expires_on: exp })
      });
    }
  }

  function wrapItemByCode() {
    var D = root.DB;
    if (!D || typeof D.itemByCode !== "function" || D.itemByCode.__pk) return;
    var orig = D.itemByCode;
    var wrapped = function (code) {
      var hit = orig.call(D, code);
      if (hit) return hit;
      var found = candidates(code);
      return found.length === 1 ? found[0] : null;
    };
    wrapped.__pk = true;
    D.itemByCode = wrapped;
  }
  function wrapLookup() {
    var ui = root.UI;
    if (!ui || typeof ui.lookup !== "function" || ui.lookup.__pk) return;
    var orig = ui.lookup;
    var wrapped = function (inId, outId) {
      orig.apply(ui, arguments);
      var box = document.getElementById(outId);
      var input = document.getElementById(inId);
      if (!box || !input) return;
      if (box.className && box.className.indexOf("notfound") < 0) return;
      var found = candidates(input.value);
      if (found.length < 2) return;
      box.className = "found notfound";
      box.textContent = tx("several") + found.slice(0, 5).map(function (it) { return it.code || it.id; }).join(", ");
    };
    wrapped.__pk = true;
    ui.lookup = wrapped;
  }
  function wrapReceive() {
    var ui = root.UI;
    if (!ui || typeof ui.receive !== "function" || ui.receive.__pk) return;
    var orig = ui.receive;
    var wrapped = async function () {
      var field = document.getElementById("pk-exp-field");
      var exp = field && field.style.display !== "none" ? dateISO(val("pk-exp")) : "";
      var lot = val("r-lot");
      var loc = (val("r-loc") || "RECEIVING").toUpperCase();
      var code = val("r-newcode") || val("r-code");
      var it = resolve(code);
      if (!it && val("r-newcode")) {
        it = { id: val("r-newcode"), code: val("r-newcode"), category: val("r-newcat") };
      }
      var before = it && root.DB && root.DB.onHand ? Number(root.DB.onHand(it.id || it.code)) : NaN;
      try {
        return await orig.apply(ui, arguments);
      } finally {
        var after = it && root.DB && root.DB.onHand ? Number(root.DB.onHand(it.id || it.code)) : NaN;
        if (exp && it && isPackItem(it) && after === after && before === before && after > before) {
          try { await stamp(resolve(it.code) || it, lot, loc, exp); } catch (e) {}
        }
      }
    };
    wrapped.__pk = true;
    ui.receive = wrapped;
  }

  function boot() {
    wrapItemByCode();
    wrapLookup();
    wrapReceive();
    var view = document.getElementById("view");
    if (view && !view.__pkObs && typeof MutationObserver === "function") {
      var obs = new MutationObserver(function () { try { paint(); } catch (e) {} });
      view.__pkObs = obs;
      obs.observe(view, { childList: true, subtree: true });
    }
    if (view && !view.__pkInput) {
      view.__pkInput = true;
      view.addEventListener("input", function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === "r-code" || t.id === "r-newcode" || t.id === "r-newcat") paintExp();
      });
    }
    try { paint(); } catch (e) {}
  }

  var api = { aliasText: aliasText, isPackItem: isPackItem, candidates: candidates, ALIAS: ALIAS };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.PACK_RECEIVE = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot);
    else boot();
    var waits = 0;
    (function arm() {
      if (root.DB && root.UI && root.DB.itemByCode && root.UI.receive) { boot(); return; }
      if (++waits < 80) setTimeout(arm, 50);
    })();
  }
})(typeof window !== "undefined" ? window : globalThis);

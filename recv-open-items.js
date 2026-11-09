/* Read-only open-items panel on Receive.
   Lists invoice-pending receipts, receiving holds, COA-No receipts,
   held reconcile items, and a small known-question list that is easy
   to retire once live data covers the same shipment.
   Prefills the existing Receive form. Does not write, edit, or delete. */
(function (root) {
  "use strict";
  var TXT = {
    en: {
      title: "Open items",
      hint: "Held receipts and open questions. This list does not change any data. Open Receive fills the existing form so you can finish the receipt.",
      empty: "No open receiving items.",
      open: "Open Receive",
      loading: "Loading open items...",
      invoice: "Invoice pending",
      hold: "Receiving hold",
      coa: "COA marked No",
      reconcile: "Inventory hold",
      known: "Open question"
    },
    es: {
      title: "Pendientes",
      hint: "Recibos en espera y preguntas abiertas. Esta lista no cambia datos. Abrir Recibo llena el formulario existente para terminar el recibo.",
      empty: "No hay pendientes de recibo.",
      open: "Abrir Recibo",
      loading: "Cargando pendientes...",
      invoice: "Factura pendiente",
      hold: "Retenido en recibo",
      coa: "COA marcado No",
      reconcile: "Retenido de inventario",
      known: "Pregunta abierta"
    },
    pt: {
      title: "Itens em aberto",
      hint: "Recebimentos retidos e perguntas em aberto. Esta lista nao altera dados. Abrir Recebimento preenche o formulario existente para concluir o recebimento.",
      empty: "Nenhum item de recebimento em aberto.",
      open: "Abrir Recebimento",
      loading: "Carregando itens em aberto...",
      invoice: "Fatura pendente",
      hold: "Retido no recebimento",
      coa: "COA marcado Nao",
      reconcile: "Retido do inventario",
      known: "Pergunta em aberto"
    }
  };

  var KNOWN_OPEN = [
    {
      id: "hermans-cnu-20260922",
      title: "Herman's cashews, CNU BOL 60115930656",
      date: "2026-09-22",
      detail: "5 pallets on 2026-09-22. Need flavor, lots, and bags. Confirm whether this is the same load as FedEx Pro 0587996710 / BOL 1752766746 on 2026-09-24.",
      matchKeys: ["60115930656"],
      kind: "cashew_delivery",
      prefill: {
        transport: "60115930656",
        pallets: 5,
        notes: "Herman's cashews. CNU BOL 60115930656 on 2026-09-22, 5 pallets. Need flavor, lots, and bags. Confirm whether this is the same load as FedEx Pro 0587996710 / BOL 1752766746 on 2026-09-24."
      }
    },
    {
      id: "hermans-fedex-20260924",
      title: "Herman's cashews, FedEx Pro 0587996710 / BOL 1752766746",
      date: "2026-09-24",
      detail: "5 pallets on 2026-09-24. Need flavor, lots, and bags. Confirm whether this is the same load as CNU BOL 60115930656 on 2026-09-22.",
      matchKeys: ["0587996710", "1752766746"],
      kind: "cashew_delivery",
      prefill: {
        transport: "1752766746",
        tracking: "0587996710",
        carrier: "FedEx",
        pallets: 5,
        notes: "Herman's cashews. FedEx Pro 0587996710 / BOL 1752766746 on 2026-09-24, 5 pallets. Need flavor, lots, and bags. Confirm whether this is the same load as CNU BOL 60115930656 on 2026-09-22."
      }
    },
    {
      id: "hermans-xpo-20261001",
      title: "Herman's cashews, XPO Pro 375-909332",
      date: "2026-10-01",
      detail: "9 pallets on 2026-10-01. Need flavor, lots, and bags.",
      matchKeys: ["375-909332", "375909332"],
      kind: "cashew_delivery",
      prefill: {
        tracking: "375-909332",
        carrier: "XPO",
        pallets: 9,
        notes: "Herman's cashews. XPO Pro 375-909332 on 2026-10-01, 9 pallets. Need flavor, lots, and bags."
      }
    },
    {
      id: "cashew-oct15-15408",
      title: "Oct 15 BBQ cashew receipt, 15,408 bags",
      date: "2026-10-15",
      detail: "15,408 bags with no lot info.",
      qty: 15408,
      kind: "oct15",
      prefill: {
        qty: 15408,
        pallets: 5,
        notes: "Oct 15 BBQ cashew receipt of 15,408 bags. No lot, expiry, supplier, or transport / BOL was recorded."
      }
    },
    {
      id: "popper-coa-no",
      title: "Bacon Jalapeno Popper receipt, COA marked No",
      date: "2026-09-04",
      detail: "Elite Spice Bacon Type Jalapeno Popper, 700 lbs, lot 2-158928. COA was marked No.",
      kind: "popper",
      prefill: {
        qty: 700,
        lot: "2-158928",
        notes: "Bacon Type Jalapeno Popper from Elite Spice. 700 lbs, lot 2-158928. COA marked No."
      }
    }
  ];

  function lang() {
    if (typeof document === "undefined") return "en";
    var es = document.getElementById("lang-es");
    var pt = document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(k) {
    var d = TXT[lang()] || TXT.en;
    return d[k] != null ? d[k] : TXT.en[k];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function blob(row) {
    row = row || {};
    return [row.transport_ref, row.tracking, row.po_num, row.notes, row.contents, row.carrier, row.supplier, row.lot, row.item_id].join(" ").toLowerCase();
  }
  function normCoa(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase();
    if (s === "n" || s === "no" || s === "false") return "no";
    if (s === "y" || s === "yes" || s === "true") return "yes";
    return s;
  }
  function num(v) {
    var n = Number(v);
    return n === n ? n : 0;
  }
  function hasLot(row) {
    var lot = String(row && row.lot || "").trim();
    if (!lot || lot === "#" || /^n\/?a$/i.test(lot)) return false;
    return true;
  }
  function isCashewProduct(row) {
    var contents = String(row && row.contents || "").toLowerCase();
    var item = String(row && (row.item_id || "") || "").toLowerCase();
    var text = contents + " " + item;
    if (!/cashew|nuts-bbq|nuts-cinnamon/.test(text)) return false;
    if (/box|film|master case/.test(contents) && !/bag/.test(contents)) return false;
    return true;
  }
  function isPopperRow(row) {
    var text = (String(row && row.contents || "") + " " + String(row && row.item_id || "")).toLowerCase();
    return /popper/.test(text);
  }
  function deliveryCovered(row, keys) {
    if (!row) return false;
    var text = blob(row);
    var hit = (keys || []).some(function (k) { return k && text.indexOf(String(k).toLowerCase()) >= 0; });
    if (!hit) return false;
    return isCashewProduct(row) && hasLot(row) && num(row.qty_received) > 0;
  }
  function knownRetired(known, receivingLog, holds) {
    var rows = receivingLog || [];
    if (known.kind === "cashew_delivery") {
      return rows.some(function (row) { return deliveryCovered(row, known.matchKeys); });
    }
    if (known.kind === "oct15") {
      if ((holds || []).some(function (h) { return num(h.sheet) === 15408 || /oct 15/i.test(String(h.title || "") + " " + String(h.reason || "")); })) return true;
      return rows.some(function (row) {
        return isCashewProduct(row) && String(row.recv_date || "").slice(0, 10) === "2026-10-15" && hasLot(row) && num(row.qty_received) === 15408;
      });
    }
    if (known.kind === "popper") {
      return rows.some(function (row) {
        if (!isPopperRow(row)) return false;
        var ans = normCoa(row.coa_received);
        return ans === "yes" || ans === "no" || !!row.coa_released_at;
      });
    }
    return false;
  }
  function fromRow(row, source, title) {
    row = row || {};
    var bits = [];
    if (row.recv_date) bits.push(String(row.recv_date).slice(0, 10));
    if (row.supplier) bits.push(row.supplier);
    if (row.contents) bits.push(row.contents);
    if (row.lot) bits.push("lot " + row.lot);
    if (row.qty_received != null && row.qty_received !== "") bits.push(row.qty_received + " received");
    if (row.transport_ref) bits.push("BOL " + row.transport_ref);
    if (row.tracking) bits.push("PRO " + row.tracking);
    if (row.po_num) bits.push("PO/invoice " + row.po_num);
    return {
      id: source + "-" + String(row.id || title || "row"),
      source: source,
      title: title,
      detail: bits.join(". "),
      receiving_log_id: row.id || "",
      date: row.recv_date ? String(row.recv_date).slice(0, 10) : "",
      prefill: {
        code: row.item_id || "",
        qty: row.qty_received || "",
        lot: row.lot || "",
        supplier: row.supplier || "",
        invoice: row.po_num || "",
        transport: row.transport_ref || "",
        tracking: row.tracking || "",
        carrier: row.carrier || "",
        notes: row.notes || bits.join(". "),
        invoicePending: row.invoice_pending === true
      }
    };
  }
  function fromHold(h) {
    h = h || {};
    var title = h.title || ((h.item || "Item") + (h.lot ? " lot " + h.lot : "") + " hold");
    return {
      id: "hold-" + [h.item || "", h.lot || "", h.sheet || "", title].join("|"),
      source: "reconcile_hold",
      title: title,
      detail: h.reason || "",
      date: "",
      item: h.item || "",
      lot: h.lot || "",
      qty: h.sheet,
      prefill: {
        code: h.item || "",
        qty: h.sheet || "",
        lot: h.lot || "",
        notes: h.reason || title
      }
    };
  }
  function collect(opts) {
    opts = opts || {};
    var receivingLog = opts.receivingLog || [];
    var holds = opts.openHolds;
    if (!holds) holds = [];
    var items = [];
    var seen = {};
    function add(item) {
      if (!item || !item.id || seen[item.id]) return;
      seen[item.id] = 1;
      items.push(item);
    }
    receivingLog.forEach(function (row) {
      if (!row) return;
      if (row.invoice_pending === true) add(fromRow(row, "invoice_pending", "Invoice pending"));
      if (row.on_hold === true) add(fromRow(row, "receiving_hold", "Receiving hold"));
      if (normCoa(row.coa_received) === "no" && !row.coa_released_at) add(fromRow(row, "coa_no", "COA marked No"));
    });
    holds.forEach(function (h) { add(fromHold(h)); });
    if (!opts.skipKnown) {
      KNOWN_OPEN.forEach(function (known) {
        if (knownRetired(known, receivingLog, holds)) return;
        add({
          id: known.id,
          source: "known",
          title: known.title,
          detail: known.detail,
          date: known.date || "",
          qty: known.qty,
          prefill: known.prefill || {}
        });
      });
    }
    return items;
  }
  function prefillFields(p) {
    p = p || {};
    var out = {};
    if (p.code) out["r-code"] = String(p.code);
    if (p.qty != null && p.qty !== "") out["r-qty"] = String(p.qty);
    if (p.pallets != null && p.pallets !== "") out["r-pal"] = String(p.pallets);
    if (p.lot) out["r-lot"] = String(p.lot);
    if (p.supplier) out["r-sup"] = String(p.supplier);
    if (p.invoice) out["r-inv"] = String(p.invoice);
    if (p.transport) out["r-transport"] = String(p.transport);
    if (p.tracking) out["r-tracking"] = String(p.tracking);
    if (p.carrier) out["r-carrier"] = String(p.carrier);
    if (p.notes) out["r-notes"] = String(p.notes);
    if (p.category) out["r-cat"] = String(p.category);
    return out;
  }
  function applyPrefill(p) {
    var map = prefillFields(p);
    Object.keys(map).forEach(function (id) {
      var el = typeof document === "undefined" ? null : document.getElementById(id);
      if (!el) return;
      el.value = map[id];
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {}
    });
    if (p && p.invoicePending && typeof document !== "undefined") {
      var box = document.getElementById("r-inv-pending");
      var inv = document.getElementById("r-inv");
      if (box && !(inv && String(inv.value || "").trim())) {
        box.checked = true;
        box.disabled = false;
      }
    }
  }
  function sourceLabel(source) {
    if (source === "invoice_pending") return tx("invoice");
    if (source === "receiving_hold") return tx("hold");
    if (source === "coa_no") return tx("coa");
    if (source === "reconcile_hold") return tx("reconcile");
    return tx("known");
  }
  function renderHtml(items, state) {
    state = state || {};
    var rows = items || [];
    var body;
    if (state.loading) body = '<p class="muted" id="recv-open-loading">' + esc(tx("loading")) + "</p>";
    else if (!rows.length) body = '<p class="muted" id="recv-open-empty">' + esc(tx("empty")) + "</p>";
    else {
      body = rows.map(function (item) {
        var payload = JSON.stringify(item.id);
        return '<div class="ex warn recv-open-row" data-open-id="' + esc(item.id) + '">' +
          '<div class="sm">' + esc(sourceLabel(item.source)) + (item.date ? " · " + esc(item.date) : "") + "</div>" +
          "<b>" + esc(item.title) + "</b>" +
          (item.detail ? '<div>' + esc(item.detail) + "</div>" : "") +
          '<button type="button" class="ghost sm" data-recv-open="' + esc(payload) + '" onclick="RECVOPEN.openItem(JSON.parse(this.getAttribute(\'data-recv-open\')))">' +
          esc(tx("open")) + "</button></div>";
      }).join("");
    }
    return '<div class="card" id="recv-open-card"><h2 class="sub2">' + esc(tx("title")) +
      ' <span class="dh-pill amber" id="recv-open-count">' + rows.length + "</span></h2>" +
      '<p class="hint">' + esc(tx("hint")) + "</p>" + body + "</div>";
  }

  var lastItems = [];
  var lastSig = "";
  var loading = false;

  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { return root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { return null; }
  }
  function signature(items) {
    return (items || []).map(function (i) { return i.id; }).join("|") + "|" + lang() + "|" + (loading ? "1" : "0");
  }
  function defaultHolds() {
    if (root.INV_LOT_PLAN && typeof root.INV_LOT_PLAN.openHolds === "function") return root.INV_LOT_PLAN.openHolds();
    return [];
  }
  function paint(items) {
    var receive = typeof document === "undefined" ? null : document.getElementById("r-qty");
    var view = typeof document === "undefined" ? null : document.getElementById("view");
    var existing = typeof document === "undefined" ? null : document.getElementById("recv-open");
    if (!receive || !view) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    var card = receive.closest ? receive.closest(".card") : null;
    var html = renderHtml(items || lastItems, { loading: loading && !(items || lastItems).length });
    var sig = signature(items || lastItems);
    if (existing && existing.getAttribute("data-sig") === sig) return;
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "recv-open";
      if (card && card.parentNode) card.parentNode.insertBefore(existing, card);
      else view.insertBefore(existing, view.firstChild);
    }
    existing.setAttribute("data-sig", sig);
    existing.innerHTML = html;
    lastSig = sig;
  }
  function loadAndPaint() {
    var holds = defaultHolds();
    var fallback = collect({ receivingLog: [], openHolds: holds });
    var c = client();
    if (!c) {
      lastItems = fallback;
      loading = false;
      paint(lastItems);
      return Promise.resolve(lastItems);
    }
    loading = !lastItems.length;
    if (loading) paint(fallback);
    return c.from("receiving_log").select("id,recv_date,supplier,po_num,transport_ref,tracking,carrier,contents,lot,item_id,qty_received,invoice_pending,on_hold,coa_received,coa_released_at,notes").limit(2000)
      .then(function (r) {
        loading = false;
        if (r && r.error) {
          lastItems = fallback;
          paint(lastItems);
          return lastItems;
        }
        lastItems = collect({ receivingLog: (r && r.data) || [], openHolds: holds });
        paint(lastItems);
        return lastItems;
      })
      .catch(function () {
        loading = false;
        lastItems = fallback;
        paint(lastItems);
        return lastItems;
      });
  }
  function openItem(id) {
    var item = null;
    (lastItems || []).forEach(function (it) { if (String(it.id) === String(id)) item = it; });
    if (!item) {
      collect({ receivingLog: [], openHolds: defaultHolds() }).forEach(function (it) {
        if (String(it.id) === String(id)) item = it;
      });
    }
    if (typeof root.UI_go === "function") root.UI_go("receive");
    setTimeout(function () {
      applyPrefill(item && item.prefill ? item.prefill : {});
      var qty = typeof document !== "undefined" ? document.getElementById("r-qty") : null;
      if (qty && qty.scrollIntoView) {
        try { qty.scrollIntoView({ block: "center" }); } catch (e) {}
        try { qty.focus(); } catch (e) {}
      }
    }, 0);
  }

  var api = {
    KNOWN_OPEN: KNOWN_OPEN,
    TXT: TXT,
    collect: collect,
    knownRetired: knownRetired,
    prefillFields: prefillFields,
    applyPrefill: applyPrefill,
    renderHtml: renderHtml,
    normCoa: normCoa,
    deliveryCovered: deliveryCovered
  };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.RECVOPEN = {
    collect: collect,
    openItem: openItem,
    refresh: loadAndPaint,
    prefillFields: prefillFields,
    renderHtml: renderHtml
  };
  if (root.document && typeof MutationObserver === "function") {
    var obs = new MutationObserver(function () {
      if (!document.getElementById("r-qty")) {
        paint([]);
        return;
      }
      if (!document.getElementById("recv-open")) loadAndPaint();
      else paint(lastItems);
    });
    obs.observe(root.document.documentElement, { childList: true, subtree: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { if (document.getElementById("r-qty")) loadAndPaint(); });
    else if (document.getElementById("r-qty")) loadAndPaint();
  }
})(typeof window !== "undefined" ? window : globalThis);

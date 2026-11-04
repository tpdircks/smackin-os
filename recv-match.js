/* ============================================================================
   Smackin' OS - Receive / Dock row matching (recv-match.js)
   Pure helpers. No DOM, no network.

   Receive finalize inserts a receiving_log row. It updates an existing row
   only when the user is editing that row, or when the typed lot already
   belongs to the same item, the same supplier, and the same calendar day.
   A second item on the same trailer (same PO, same typed lot) must not
   overwrite the other item's row, qty, or COA.
   ========================================================================== */
(function (root) {
  "use strict";

  function normRecvLot(lot) {
    return String(lot == null ? "" : lot).toUpperCase().replace(/\s+/g, "");
  }
  function normAlnumLot(lot) {
    return String(lot == null ? "" : lot).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function dayOf(v) {
    return String(v || "").slice(0, 10);
  }
  function supplierKey(v) {
    return String(v == null ? "" : v).trim().toLowerCase();
  }
  // A blank supplier does not split a row. Two typed suppliers must match.
  function sameSupplier(a, b) {
    var x = supplierKey(a);
    var y = supplierKey(b);
    if (!x || !y) return true;
    return x === y;
  }
  function itemKey(v) {
    return String(v == null ? "" : v).trim();
  }
  // Keep checklist, COA answer, and file columns off this patch. A second
  // Receive of the same item must not wipe SOP answers already on the row.
  function mergeDockRec(existing, next) {
    var prev = existing || {};
    var pick = function (a, b) {
      return (a != null && String(a).trim() !== "") ? a : (b == null ? "" : b);
    };
    return {
      recv_date: next.recv_date || prev.recv_date || "",
      supplier: pick(next.supplier, prev.supplier),
      po_num: pick(next.po_num, prev.po_num),
      carrier: pick(next.carrier, prev.carrier),
      tracking: pick(next.tracking, prev.tracking),
      contents: pick(next.contents, prev.contents),
      lot: pick(next.lot, prev.lot),
      qty_ordered: (next.qty_ordered !== "" && next.qty_ordered != null) ? next.qty_ordered : (prev.qty_ordered == null ? "" : prev.qty_ordered),
      qty_received: next.qty_received,
      condition: next.condition || prev.condition || "Good",
      received_by: pick(next.received_by, prev.received_by),
      notes: pick(next.notes, prev.notes),
      item_id: pick(next.item_id, prev.item_id)
    };
  }
  function lotWarnings(rows, next) {
    var lotKey = normRecvLot(next && next.lot);
    var item = itemKey(next && next.item_id);
    var out = [];
    var seen = {};
    if (!lotKey) return out;
    (rows || []).forEach(function (r) {
      if (!r || normRecvLot(r.lot) !== lotKey) return;
      var other = itemKey(r.item_id);
      if (!other || other === item) return;
      var id = String(r.id || other);
      if (seen[id]) return;
      seen[id] = 1;
      out.push({
        lot: (next && next.lot) || lotKey,
        item_id: other,
        contents: r.contents || "",
        id: r.id || ""
      });
    });
    return out;
  }
  function newestFirst(a, b) {
    var byDate = String(b.created_at || "").localeCompare(String(a.created_at || ""));
    if (byDate) return byDate;
    return String(b.id || "").localeCompare(String(a.id || ""));
  }
  // opts.editId: the row the user opened with Edit. That is the only update
  // that ignores the lot. Without it, update only the same item + lot +
  // supplier + calendar day. Anything else inserts.
  function planReceiveSave(rows, next, opts) {
    rows = rows || [];
    next = next || {};
    opts = opts || {};
    var warnings = lotWarnings(rows, next);
    if (opts.editId) {
      return {
        action: "update",
        id: String(opts.editId),
        rec: next,
        warnings: warnings,
        reason: "edit"
      };
    }
    var lotKey = normRecvLot(next.lot);
    var item = itemKey(next.item_id);
    var match = null;
    if (lotKey && item) {
      var hits = rows.filter(function (r) {
        if (!r) return false;
        if (normRecvLot(r.lot) !== lotKey) return false;
        if (itemKey(r.item_id) !== item) return false;
        if (dayOf(r.recv_date) !== dayOf(next.recv_date)) return false;
        if (!sameSupplier(r.supplier, next.supplier)) return false;
        return true;
      });
      hits.sort(newestFirst);
      match = hits[0] || null;
    }
    if (match) {
      return {
        action: "update",
        id: String(match.id),
        rec: mergeDockRec(match, next),
        warnings: warnings,
        reason: "same-item-lot-day"
      };
    }
    return {
      action: "insert",
      id: "",
      rec: next,
      warnings: warnings,
      reason: "insert"
    };
  }
  function lotReuseMessage(warnings, lang) {
    warnings = warnings || [];
    if (!warnings.length) return "";
    var names = [];
    var seen = {};
    warnings.forEach(function (w) {
      var name = String((w && (w.contents || w.item_id)) || "another item");
      if (seen[name]) return;
      seen[name] = 1;
      names.push(name);
    });
    var lot = String((warnings[0] && warnings[0].lot) || "");
    var item = names.join(", ");
    if (lang === "es") {
      return "El lote " + lot + " ya esta en " + item + ". Este recibo no se mezclo con esa fila.";
    }
    if (lang === "pt") {
      return "O lote " + lot + " ja esta em " + item + ". Este recebimento nao foi misturado com essa linha.";
    }
    return "Lot " + lot + " is already on " + item + ". This receipt was not merged into that row.";
  }
  // Same string db.js uses to ignore a double-click adjust.
  function adjustDedupeKey(itemId, loc, newQty) {
    return String(itemId) + "|" + loc + "|" + newQty;
  }
  // Which receiving_log rows a COA stamp may write. An explicit receipt id
  // is used only when that row is the same item (or has no item yet).
  // A lot match never crosses item ids.
  function receivingLogCoaScope(rows, opts) {
    opts = opts || {};
    var idSet = {};
    var hasItem = false;
    (opts.itemIds || []).forEach(function (id) {
      if (id == null || String(id).trim() === "") return;
      idSet[String(id)] = 1;
      hasItem = true;
    });
    function itemOk(r) {
      if (!hasItem) return true;
      if (!r.item_id) return true;
      return !!idSet[String(r.item_id)];
    }
    if (opts.recvId) {
      var id = String(opts.recvId);
      return (rows || []).filter(function (r) {
        return r && String(r.id) === id && itemOk(r);
      });
    }
    var key = normAlnumLot(opts.lot);
    if (!key || !hasItem) return [];
    return (rows || []).filter(function (r) {
      return r && r.item_id && idSet[String(r.item_id)] && normAlnumLot(r.lot) === key;
    });
  }

  var api = {
    normRecvLot: normRecvLot,
    normAlnumLot: normAlnumLot,
    dayOf: dayOf,
    sameSupplier: sameSupplier,
    mergeDockRec: mergeDockRec,
    planReceiveSave: planReceiveSave,
    lotReuseMessage: lotReuseMessage,
    adjustDedupeKey: adjustDedupeKey,
    receivingLogCoaScope: receivingLogCoaScope
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.RECVMATCH = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));

/* Supplier PO line edits (po-lines.js)
   Upload preview and saved-PO line changes for supplier_pos.
   Everyone can still open the Purchasing tabs. Line edits and deletes
   are limited to Troy, Michelle, and Matt, matched by sign-in email.
   A saved change updates one supplier_pos row by id. Lines are matched
   by _lid. Lot, item, and qty are never used as the match key.
   Cloud saves go through DB.updateSupplierPO, so the audit_log trigger
   stores who, when, the table, the record, and the old and new row.
   A line delete's history old_row is the full supplier_pos row. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.POLINES = api;
  if (typeof document !== "undefined") {
    api.bindClicks();
    api.watchEmail();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var EDITORS = {
    "troy.dircks@smackinsnacks.com": true,
    "michelle.nydegger@smackinsnacks.com": true,
    "mattb@smackinsnacks.com": true
  };
  var ITEM_KEYS = ["item", "item_no", "itemNo", "part", "part_no", "sku", "code"];
  var DESC_KEYS = ["desc", "description", "name", "product"];
  var QTY_KEYS = ["qty", "quantity", "cases"];
  var PRICE_KEYS = ["price", "unit_price", "unitPrice", "cost"];
  var UNIT_KEYS = ["unit", "uom", "units", "u_o_m"];
  var ALIAS = { item: ITEM_KEYS, desc: DESC_KEYS, qty: QTY_KEYS, price: PRICE_KEYS, unit: UNIT_KEYS };
  var preview = null;
  var lidSeq = 1;

  function clone(v) {
    if (v == null) return v;
    return JSON.parse(JSON.stringify(v));
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function canEdit(email) {
    return !!EDITORS[String(email || "").trim().toLowerCase()];
  }
  function b64url(s) {
    var t = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    try {
      if (typeof atob === "function") return atob(t);
      if (typeof Buffer !== "undefined") return Buffer.from(t, "base64").toString("utf8");
    } catch (e) {}
    return "";
  }
  function emailFromJwt(token) {
    var part = String(token || "").split(".")[1];
    if (!part) return "";
    try {
      var json = JSON.parse(b64url(part) || "null");
      return json && json.email ? String(json.email) : "";
    } catch (e) { return ""; }
  }
  function emailFromAuthBlob(obj) {
    if (!obj) return "";
    if (typeof obj === "string") {
      var text = obj;
      if (text.indexOf("base64-") === 0) text = b64url(text.slice(7));
      try { obj = JSON.parse(text); } catch (e) { return emailFromJwt(obj); }
    }
    if (!obj || typeof obj !== "object") return "";
    if (obj.user && obj.user.email) return String(obj.user.email);
    if (obj.currentSession && obj.currentSession.user && obj.currentSession.user.email) return String(obj.currentSession.user.email);
    if (obj.data && obj.data.session && obj.data.session.user && obj.data.session.user.email) return String(obj.data.session.user.email);
    var token = obj.access_token || (obj.currentSession && obj.currentSession.access_token) || (obj.session && obj.session.access_token) || "";
    return emailFromJwt(token);
  }
  function readStoredEmail() {
    if (typeof window === "undefined") return "";
    if (window.SMK_USER_EMAIL) return String(window.SMK_USER_EMAIL);
    var stores = [];
    try { if (window.localStorage) stores.push(window.localStorage); } catch (e) {}
    try { if (window.sessionStorage) stores.push(window.sessionStorage); } catch (e2) {}
    for (var s = 0; s < stores.length; s++) {
      var store = stores[s];
      var chunks = [];
      for (var i = 0; i < store.length; i++) {
        var key = store.key(i);
        if (!key || key.indexOf("sb-") !== 0 || key.indexOf("auth-token") < 0) continue;
        if (/\.\d+$/.test(key)) chunks.push(key);
        else {
          var email = emailFromAuthBlob(store.getItem(key) || "");
          if (email) return email;
        }
      }
      if (chunks.length) {
        chunks.sort();
        var joined = "";
        for (var c = 0; c < chunks.length; c++) joined += store.getItem(chunks[c]) || "";
        var fromChunks = emailFromAuthBlob(joined);
        if (fromChunks) return fromChunks;
      }
    }
    return "";
  }
  function currentEmail() { return readStoredEmail(); }
  function sessionClient() {
    if (typeof window === "undefined" || !window.supabase || !window.SMACKIN_CONFIG) return null;
    var cfg = window.SMACKIN_CONFIG;
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || typeof window.supabase.createClient !== "function") return null;
    try { return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { return null; }
  }
  function ensureEmail() {
    var sync = currentEmail();
    if (canEdit(sync)) return Promise.resolve(sync);
    var client = sessionClient();
    if (!client || !client.auth || typeof client.auth.getSession !== "function") return Promise.resolve(sync);
    return client.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      var email = emailFromAuthBlob(session || {});
      if (email) {
        try { window.SMK_USER_EMAIL = email; } catch (e) {}
      }
      return email || currentEmail();
    }).catch(function () { return currentEmail(); });
  }
  function canEditCurrent() { return canEdit(currentEmail()); }
  function actorNow() {
    return { email: currentEmail(), when: new Date().toISOString() };
  }
  function toast(msg) {
    var el = typeof document !== "undefined" ? document.getElementById("toast") : null;
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 2200);
  }
  function refresh() {
    if (typeof window === "undefined" || !window.UI || typeof window.UI.poLinesRefresh !== "function") return;
    window.UI.poLinesRefresh();
  }
  function first(line, keys) {
    if (!line) return "";
    for (var i = 0; i < keys.length; i++) {
      var v = line[keys[i]];
      if (v != null && v !== "") return v;
    }
    return "";
  }
  function num(v) {
    if (v == null) return null;
    var s = String(v).replace(/[$,\s]/g, "").trim();
    if (!s) return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function isZeroQty(line) {
    var raw = first(line, QTY_KEYS);
    if (raw == null || String(raw).trim() === "") return true;
    var n = num(raw);
    return n == null || n === 0;
  }
  function parseLines(raw) {
    var lines = raw;
    var guard = 0;
    while (typeof lines === "string" && guard < 3) {
      guard++;
      try { lines = JSON.parse(lines || "[]"); } catch (e) { lines = []; break; }
    }
    if (!Array.isArray(lines)) return [];
    return lines.map(function (l) { return (l && typeof l === "object") ? l : {}; });
  }
  function newLid() { return "pl-" + (lidSeq++) + "-" + Math.random().toString(36).slice(2, 7); }
  function stampStable(lines) {
    return lines.map(function (l, i) {
      var c = clone(l) || {};
      if (!c._lid) c._lid = "row-" + i;
      return c;
    });
  }
  function lineIndex(lines, lid) {
    var found = -1;
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i] || lines[i]._lid !== lid) continue;
      if (found >= 0) return -1;
      found = i;
    }
    return found;
  }
  function setField(line, field, value) {
    var keys = ALIAS[field];
    if (!keys) {
      if (field === "ship" && value != null) line.ship = value;
      return;
    }
    var hit = false;
    for (var i = 0; i < keys.length; i++) {
      if (line[keys[i]] != null && String(line[keys[i]]) !== "") {
        line[keys[i]] = value;
        hit = true;
      }
    }
    if (!hit) {
      if (value == null || String(value) === "") return;
      line[keys[0]] = value;
    }
  }
  function touchTotal(line) {
    var q = num(first(line, QTY_KEYS));
    var p = num(first(line, PRICE_KEYS));
    if (q == null || p == null) return;
    var t = String(Math.round(q * p * 100) / 100);
    var wrote = false;
    ["total", "line_total", "lineTotal", "amount", "ext"].forEach(function (k) {
      if (line[k] != null && line[k] !== "") { line[k] = t; wrote = true; }
    });
    if (!wrote) line.total = t;
  }
  function display(line, field) {
    if (field === "item") return first(line, ITEM_KEYS);
    if (field === "desc") return first(line, DESC_KEYS);
    if (field === "qty") return first(line, QTY_KEYS);
    if (field === "price") return first(line, PRICE_KEYS);
    if (field === "unit") return first(line, UNIT_KEYS);
    return "";
  }

  function loadPreview(parsed) {
    var raw = parseLines(parsed && parsed.lines);
    preview = {
      lines: raw.map(function (l) {
        var c = clone(l) || {};
        if (!c._lid) c._lid = newLid();
        return c;
      }),
      removed: {},
      showZero: false
    };
    return preview;
  }
  function clearPreview() { preview = null; }
  function previewState() { return preview; }
  function activeLines() {
    if (!preview) return [];
    return preview.lines.filter(function (l) { return !preview.removed[l._lid]; });
  }
  function skippedLines() { return activeLines().filter(isZeroQty); }
  function skippedCount() { return skippedLines().length; }
  function skipNote(n) {
    if (n == null) n = skippedCount();
    if (!n) return "";
    return n + (n === 1 ? " line with 0 qty was skipped" : " lines with 0 qty were skipped");
  }
  function keptLines() {
    return activeLines().filter(function (l) { return !isZeroQty(l); }).map(clone);
  }
  function linesForSave() {
    syncFromDom();
    return keptLines();
  }
  function keptCount() {
    if (!preview) return null;
    return keptLines().length;
  }
  function previewLine(lid) {
    if (!preview) return null;
    for (var i = 0; i < preview.lines.length; i++) {
      if (preview.lines[i]._lid === lid) return preview.lines[i];
    }
    return null;
  }
  function previewSet(el, email) {
    if (!preview || !el) return { ok: false };
    var who = email == null ? currentEmail() : email;
    if (!canEdit(who)) return { ok: false, reason: "forbidden" };
    var lid = el.getAttribute ? el.getAttribute("data-lid") : el.lid;
    var field = el.getAttribute ? el.getAttribute("data-f") : el.field;
    var value = el.value != null ? el.value : el.val;
    var line = previewLine(lid);
    if (!line) return { ok: false, reason: "missing" };
    setField(line, field, value);
    touchTotal(line);
    return { ok: true };
  }
  function syncFromDom() {
    if (!preview || typeof document === "undefined") return;
    var box = document.getElementById("pol-preview");
    if (!box) return;
    var inputs = box.querySelectorAll("[data-lid][data-f]");
    for (var i = 0; i < inputs.length; i++) previewSet(inputs[i], currentEmail());
  }
  function removePreview(lid, email) {
    if (!preview) { toast("There is no upload to edit."); return { ok: false, reason: "missing" }; }
    var who = email == null ? currentEmail() : email;
    if (!canEdit(who)) {
      toast(who ? ("You can't change PO lines (" + who + ").") : "You can't change PO lines. Sign in as Troy, Michelle, or Matt.");
      return { ok: false, reason: "forbidden" };
    }
    syncFromDom();
    if (!previewLine(lid)) { toast("That line is not on this upload."); return { ok: false, reason: "missing" }; }
    preview.removed[lid] = true;
    try { refresh(); } catch (e) {}
    toast("Line removed from this upload.");
    return { ok: true, lines: keptLines() };
  }
  function setShowZero(on, email) {
    if (!preview) return { ok: false };
    var who = email == null ? currentEmail() : email;
    if (!canEdit(who)) return { ok: false, reason: "forbidden" };
    syncFromDom();
    preview.showZero = !!on;
    return { ok: true };
  }
  function toggleZeros() {
    if (!preview || !canEditCurrent()) return;
    syncFromDom();
    preview.showZero = !preview.showZero;
    refresh();
  }
  function inputCell(line, field) {
    var extra = (field === "qty" || field === "price") ? ' inputmode="decimal"' : "";
    return '<td><input data-lid="' + esc(line._lid) + '" data-f="' + field + '" value="' + esc(display(line, field)) + '"' + extra + ' oninput="POLINES.previewSet(this)"></td>';
  }
  function previewHtml() {
    if (!preview) return "";
    var edit = canEditCurrent();
    var skipped = skippedCount();
    var note = skipNote(skipped);
    var show = preview.showZero;
    var rows = activeLines().filter(function (l) { return show || !isZeroQty(l); });
    var noteHtml = note
      ? '<p class="hint" id="pol-skip">' + esc(note) +
        (edit ? ' <button type="button" class="ghost sm" onclick="POLINES.toggleZeros()">' + (show ? "Hide them" : "Show them") + "</button>" : "") +
        "</p>"
      : "";
    if (!rows.length && !note) {
      return '<p class="hint">No line items were read from this file.</p>';
    }
    var body = rows.map(function (l) {
      if (!edit) {
        return "<tr><td>" + esc(display(l, "item")) + "</td><td>" + esc(display(l, "desc")) +
          "</td><td>" + esc(display(l, "qty")) + "</td><td>" + esc(display(l, "unit")) +
          "</td><td>" + esc(display(l, "price")) + "</td><td></td></tr>";
      }
      return "<tr>" + inputCell(l, "item") + inputCell(l, "desc") + inputCell(l, "qty") +
        inputCell(l, "unit") + inputCell(l, "price") +
        '<td><button type="button" class="ghost sm danger" data-po-act="preview-remove" data-lid="' + esc(l._lid) + '">Remove</button></td></tr>';
    }).join("");
    if (!body) body = '<tr><td colspan="6" class="muted">No lines to save yet.</td></tr>';
    return noteHtml +
      '<table class="potable" id="pol-preview"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit</th><th>Price</th><th></th></tr></thead><tbody>' +
      body + "</tbody></table>";
  }

  function host() {
    if (typeof globalThis !== "undefined") return globalThis;
    if (typeof window !== "undefined") return window;
    return {};
  }
  function findPo(id) {
    var list = [];
    var db = host().DB;
    try { list = (db && db.supplierPos) ? db.supplierPos() : []; } catch (e) { list = []; }
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) return list[i];
    }
    return null;
  }
  function blankRow(row) {
    return !String(row.item || "").trim() && !String(row.desc || "").trim() &&
      !String(row.qty || "").trim() && !String(row.price || "").trim() && !String(row.unit || "").trim();
  }
  function applyFields(line, fields) {
    if (!fields) return;
    var beforeQty = String(first(line, QTY_KEYS));
    var beforePrice = String(first(line, PRICE_KEYS));
    ["item", "desc", "qty", "price", "unit"].forEach(function (f) {
      if (fields[f] != null) setField(line, f, fields[f]);
    });
    if (fields.ship != null && String(fields.ship) !== String(line.ship || line.ship_date || "")) line.ship = fields.ship;
    var qtyChanged = fields.qty != null && String(fields.qty) !== beforeQty;
    var priceChanged = fields.price != null && String(fields.price) !== beforePrice;
    if (qtyChanged || priceChanged) touchTotal(line);
  }
  function historyEntry(action, actor, beforePo, afterPo) {
    return {
      table_name: "supplier_pos",
      row_pk: String(beforePo.id),
      action: action,
      changed_at: (actor && actor.when) || new Date().toISOString(),
      user_email: (actor && actor.email) || "",
      operator: (actor && actor.email) || "",
      old_row: clone(beforePo),
      new_row: action === "delete" ? null : clone(afterPo),
      changed_columns: ["lines", "item_count"]
    };
  }
  function saveQuery(poId, patch) {
    return {
      table: "supplier_pos",
      op: "update",
      match: { id: String(poId) },
      matchKeys: ["id"],
      patch: patch
    };
  }
  function planSaved(po, ops, actor) {
    ops = ops || {};
    actor = actor || {};
    var edits = ops.edits || [];
    var deletes = ops.deletes || [];
    var extras = ops.extras || [];
    var hasWork = edits.length || deletes.length || extras.length;
    if (!po || po.id == null) return { ok: false, reason: "missing" };
    if (hasWork && !canEdit(actor.email)) return { ok: false, reason: "forbidden" };
    var before = clone(po);
    var lines = stampStable(parseLines(po.lines));
    var changed = false;
    for (var e = 0; e < edits.length; e++) {
      var at = lineIndex(lines, edits[e].lid);
      if (at < 0) return { ok: false, reason: "missing line" };
      var snap = JSON.stringify(lines[at]);
      applyFields(lines[at], edits[e].fields || {});
      if (JSON.stringify(lines[at]) !== snap) changed = true;
    }
    for (var d = 0; d < deletes.length; d++) {
      var delAt = lineIndex(lines, deletes[d]);
      if (delAt < 0) return { ok: false, reason: "missing line" };
      lines.splice(delAt, 1);
      changed = true;
    }
    for (var x = 0; x < extras.length; x++) {
      if (blankRow(extras[x])) continue;
      var add = { _lid: newLid() };
      applyFields(add, extras[x]);
      if (extras[x].ship) add.ship = extras[x].ship;
      lines.push(add);
      changed = true;
    }
    var next = clone(before);
    next.lines = JSON.stringify(lines);
    next.item_count = lines.length;
    var history = [];
    if (changed && deletes.length && !edits.length && !extras.length) {
      history.push(historyEntry("delete", actor, before, next));
    } else if (changed && deletes.length) {
      history.push(historyEntry("update", actor, before, next));
      history.push(historyEntry("delete", actor, before, next));
    } else if (changed) {
      history.push(historyEntry("update", actor, before, next));
    }
    return {
      ok: true,
      changed: changed,
      lines: lines,
      patch: { lines: next.lines, item_count: next.item_count },
      next: next,
      before: before,
      history: history,
      query: saveQuery(po.id, { lines: next.lines, item_count: next.item_count })
    };
  }
  function applyStore(store, poId, ops, actor) {
    if (!store || !Array.isArray(store.supplier_pos)) return { ok: false, reason: "store" };
    var hits = [];
    for (var i = 0; i < store.supplier_pos.length; i++) {
      if (String(store.supplier_pos[i].id) === String(poId)) hits.push(i);
    }
    if (hits.length !== 1) return { ok: false, reason: "match" };
    var plan = planSaved(store.supplier_pos[hits[0]], ops, actor);
    if (!plan.ok || !plan.changed) return plan;
    var query = plan.query;
    if (!query || query.op !== "update" || query.table !== "supplier_pos") return { ok: false, reason: "match" };
    if (!query.matchKeys || query.matchKeys.length !== 1 || query.matchKeys[0] !== "id") return { ok: false, reason: "match" };
    if (query.match.lot != null || query.matchKeys.indexOf("lot") >= 0) return { ok: false, reason: "lot" };
    if (!Array.isArray(store.audit_log)) store.audit_log = [];
    store.supplier_pos[hits[0]] = plan.next;
    plan.history.forEach(function (h) { store.audit_log.push(h); });
    return plan;
  }
  function linesForForm(po) {
    return stampStable(parseLines(po && po.lines)).map(function (l) {
      return {
        _lid: l._lid,
        item: display(l, "item"),
        desc: display(l, "desc"),
        qty: display(l, "qty"),
        price: display(l, "price"),
        unit: display(l, "unit"),
        ship: String(first(l, ["ship", "ship_date", "shipdate", "expected", "eta"]) || "").slice(0, 10)
      };
    });
  }
  function assemble(po, domRows, actor) {
    var rows = domRows || [];
    var known = {};
    linesForForm(po).forEach(function (l) { known[l._lid] = true; });
    var edits = [];
    var extras = [];
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      if (blankRow(row)) continue;
      if (row.lid && known[row.lid]) {
        if (seen[row.lid]) return { ok: false, reason: "duplicate" };
        seen[row.lid] = true;
        edits.push({
          lid: row.lid,
          fields: { item: row.item, desc: row.desc, qty: row.qty, price: row.price, unit: row.unit, ship: row.ship }
        });
      } else if (!row.lid) {
        extras.push(row);
      } else {
        return { ok: false, reason: "missing line" };
      }
    }
    var deletes = [];
    Object.keys(known).forEach(function (lid) { if (!seen[lid]) deletes.push(lid); });
    return planSaved(po, { edits: edits, deletes: deletes, extras: extras }, actor);
  }
  function linesDiffer(po, domRows) {
    var built = assemble(po, domRows, { email: "michelle.nydegger@smackinsnacks.com", when: "2000-01-01T00:00:00.000Z" });
    return !!(built && built.ok && built.changed);
  }
  function savedEditorHtml(po) {
    var lines = stampStable(parseLines(po.lines));
    var id = esc(po.id);
    var body = lines.map(function (l) {
      var ship = String(first(l, ["ship", "ship_date", "expected", "eta"]) || "").slice(0, 10);
      var flag = (l.recv || l.received === true) ? ' <span class="pill ok">received</span>' : "";
      return '<tr data-lid="' + esc(l._lid) + '">' +
        '<td><input data-f="item" value="' + esc(display(l, "item")) + '"></td>' +
        '<td><input data-f="desc" value="' + esc(display(l, "desc")) + '"></td>' +
        '<td class="sm">' + esc(ship) + flag + "</td>" +
        '<td><input data-f="qty" inputmode="decimal" value="' + esc(display(l, "qty")) + '"></td>' +
        '<td><input data-f="unit" value="' + esc(display(l, "unit")) + '"></td>' +
        '<td><input data-f="price" inputmode="decimal" value="' + esc(display(l, "price")) + '"></td>' +
        '<td><button type="button" class="ghost sm danger" data-po-act="delete" data-po="' + id + '" data-lid="' + esc(l._lid) + '">Remove</button></td></tr>';
    }).join("");
    if (!body) body = '<tr><td colspan="7" class="muted">No line items on file</td></tr>';
    return '<table class="potable" id="pol-saved"><thead><tr><th>Item</th><th>Description</th><th>Ship date</th><th>Qty</th><th>Unit</th><th>Price</th><th></th></tr></thead><tbody>' +
      body + "</tbody></table>" +
      '<button type="button" class="primary" style="margin-top:10px" data-po-act="save" data-po="' + id + '">Save lines</button>';
  }
  function readSavedDom() {
    if (typeof document === "undefined") return [];
    var box = document.getElementById("pol-saved");
    if (!box) return [];
    var rows = box.querySelectorAll("tr[data-lid]");
    var edits = [];
    for (var i = 0; i < rows.length; i++) {
      var fields = {};
      var inputs = rows[i].querySelectorAll("[data-f]");
      for (var j = 0; j < inputs.length; j++) fields[inputs[j].getAttribute("data-f")] = inputs[j].value;
      edits.push({ lid: rows[i].getAttribute("data-lid"), fields: fields });
    }
    return edits;
  }
  var busyFlag = false;
  function poBusy() { return busyFlag; }
  function holdBusy(on) {
    busyFlag = !!on;
    if (typeof window === "undefined") return;
    window.SMK_BUSY = window.SMK_BUSY || [];
    if (window.SMK_BUSY.indexOf(poBusy) < 0) window.SMK_BUSY.push(poBusy);
  }
  function cloudOn() {
    try { var db = host().DB; return !!(db && db.mode === "cloud"); } catch (e) { return false; }
  }
  function denyText(email) {
    if (email) return "You can't change PO lines (" + email + ").";
    return "You can't change PO lines. Sign in as Troy, Michelle, or Matt.";
  }
  function persist(poId, plan, email) {
    var db = host().DB;
    if (!db || typeof db.updateSupplierPO !== "function") return Promise.resolve({ ok: false, msg: "The database is not ready." });
    if (!cloudOn()) return Promise.resolve({ ok: false, msg: "Not connected to the live database, so the line was not changed." });
    return db.updateSupplierPO(poId, plan.patch, email || "");
  }
  function askConfirm(message) {
    return new Promise(function (resolve) {
      if (typeof document === "undefined" || !document.body) { resolve(false); return; }
      var old = document.getElementById("pol-confirm");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var box = document.createElement("div");
      box.id = "pol-confirm";
      box.setAttribute("role", "dialog");
      box.setAttribute("style", "position:fixed;inset:0;z-index:2147483600;background:rgba(4,34,59,.45);display:flex;align-items:center;justify-content:center;padding:16px");
      box.innerHTML = '<div style="background:#fff;border-radius:12px;padding:18px;max-width:420px;width:100%">' +
        '<p id="pol-confirm-msg" style="margin:0 0 14px;font-weight:700">' + esc(message) + "</p>" +
        '<button type="button" id="pol-confirm-yes" class="primary">Delete this line</button> ' +
        '<button type="button" id="pol-confirm-no" class="ghost">Cancel</button></div>';
      document.body.appendChild(box);
      function done(v) {
        if (box.parentNode) box.parentNode.removeChild(box);
        resolve(!!v);
      }
      var yes = document.getElementById("pol-confirm-yes");
      var no = document.getElementById("pol-confirm-no");
      if (yes) yes.onclick = function () { done(true); };
      if (no) no.onclick = function () { done(false); };
    });
  }
  function saveSaved(btn) {
    var poId = btn && btn.getAttribute ? btn.getAttribute("data-po") : btn;
    var edits = readSavedDom();
    holdBusy(true);
    return ensureEmail().then(function (email) {
      if (!canEdit(email)) { toast(denyText(email)); return { ok: false, reason: "forbidden" }; }
      var po = findPo(poId);
      if (!po) { toast("That PO is not on this screen, so the lines were not saved."); return { ok: false, reason: "missing" }; }
      var plan = planSaved(po, { edits: edits }, { email: email, when: new Date().toISOString() });
      if (!plan.ok) { toast(plan.reason === "forbidden" ? denyText(email) : "Those lines could not be saved."); return plan; }
      if (!plan.changed) { toast("No line changes to save."); return plan; }
      return persist(poId, plan, email).then(function (res) {
        if (!res || res.ok === false) { toast((res && res.msg) || "The lines were not saved."); return res || { ok: false }; }
        toast("Lines saved");
        refresh();
        return res;
      });
    }).catch(function (e) {
      toast("The lines were not saved. " + ((e && e.message) || e));
      return { ok: false, reason: "error" };
    }).then(function (res) { holdBusy(false); return res; });
  }
  function deleteSaved(btn) {
    var poId = btn && btn.getAttribute ? btn.getAttribute("data-po") : "";
    var lid = btn && btn.getAttribute ? btn.getAttribute("data-lid") : "";
    holdBusy(true);
    return ensureEmail().then(function (email) {
      if (!canEdit(email)) { toast(denyText(email)); return { ok: false, reason: "forbidden" }; }
      return askConfirm("Delete this line?").then(function (yes) {
        if (!yes) return { ok: false, reason: "cancel" };
        var po = findPo(poId);
        if (!po) { toast("That PO is not on this screen, so the line was not deleted."); return { ok: false, reason: "missing" }; }
        var plan = planSaved(po, { deletes: [lid] }, { email: email, when: new Date().toISOString() });
        if (!plan.ok) {
          toast(plan.reason === "missing line" ? "That line is not on this PO anymore." : "That line could not be deleted.");
          return plan;
        }
        return persist(poId, plan, email).then(function (res) {
          if (!res || res.ok === false) { toast((res && res.msg) || "The line was not deleted."); return res || { ok: false }; }
          toast("Line deleted");
          try { refresh(); } catch (e2) {}
          return res;
        });
      });
    }).catch(function (e) {
      toast("The line was not deleted. " + ((e && e.message) || e));
      return { ok: false, reason: "error" };
    }).then(function (res) { holdBusy(false); return res; });
  }
  var clicksBound = false;
  function onDocClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest("[data-po-act]");
    if (!btn) return;
    e.preventDefault();
    var act = btn.getAttribute("data-po-act");
    if (act === "delete") deleteSaved(btn);
    else if (act === "save") saveSaved(btn);
    else if (act === "preview-remove") removePreview(btn.getAttribute("data-lid"));
  }
  function bindClicks() {
    if (clicksBound || typeof document === "undefined") return;
    clicksBound = true;
    document.addEventListener("click", onDocClick, true);
  }
  function removeEditRow(btn) {
    if (!canEditCurrent()) { toast("You can't change PO lines."); return; }
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm("Delete this line?")) return;
    var tr = btn && btn.closest ? btn.closest("tr") : null;
    if (!tr || !tr.parentNode) return;
    tr.parentNode.removeChild(tr);
    if (typeof window !== "undefined" && window.UI && typeof window.UI.poRecalc === "function") window.UI.poRecalc();
  }
  function watchEmail() {
    if (typeof window === "undefined" || !window.supabase || !window.SMACKIN_CONFIG) return;
    var cfg = window.SMACKIN_CONFIG;
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || typeof window.supabase.createClient !== "function") return;
    var was = canEditCurrent();
    try {
      var client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      client.auth.getSession().then(function (r) {
        var session = r && r.data && r.data.session;
        var email = session && session.user && session.user.email;
        if (email) window.SMK_USER_EMAIL = email;
        if (canEditCurrent() !== was) refresh();
      }).catch(function () {});
    } catch (e) {}
  }

  return {
    EDITORS: EDITORS,
    canEdit: canEdit,
    currentEmail: currentEmail,
    canEditCurrent: canEditCurrent,
    isZeroQty: isZeroQty,
    loadPreview: loadPreview,
    clearPreview: clearPreview,
    previewState: previewState,
    skippedCount: skippedCount,
    skipNote: skipNote,
    setShowZero: setShowZero,
    toggleZeros: toggleZeros,
    previewSet: previewSet,
    removePreview: removePreview,
    linesForSave: linesForSave,
    keptCount: keptCount,
    previewHtml: previewHtml,
    lineIndex: lineIndex,
    planSaved: planSaved,
    applyStore: applyStore,
    saveQuery: saveQuery,
    linesForForm: linesForForm,
    assemble: assemble,
    linesDiffer: linesDiffer,
    savedEditorHtml: savedEditorHtml,
    saveSaved: saveSaved,
    deleteSaved: deleteSaved,
    removeEditRow: removeEditRow,
    bindClicks: bindClicks,
    askConfirm: askConfirm,
    emailFromAuthBlob: emailFromAuthBlob,
    watchEmail: watchEmail
  };
});

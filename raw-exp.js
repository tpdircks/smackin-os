/* ============================================================================
   Smackin' OS - raw material expiration (raw-exp.js)
   Seasoning, seed, oil, and stevia only. Finished-goods best-by and the
   shelf-life confirm stay on their own screens. This file does not read or
   write those, and it does not change stock quantities.

   Adriana enters the date on Receive (next to Lot) and can edit it on the
   Receiving Log. Brittney and Michelle see it on Inventory Overview, on the
   floor cards and in the table. The date is stored on receiving_log.expires_on
   and on the matching stock lot row. A later move copies it. A missing column
   does not block the receipt.
   ========================================================================== */
(function (root) {
  "use strict";
  if (root && root.RAW_EXP) return;

  var WARN_DAYS = 30;
  var pending = null;
  var missingTold = false;
  var painting = false;

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
      label: "Expiration date",
      hint: "Seasoning, seed, oil, and stevia. Finished bags keep their own best-by.",
      lot: "Lot",
      noLot: "No lot",
      noDate: "No date",
      expired: "Expired",
      soon: "Soon",
      saved: "Expiration date saved",
      missing: "Expiration date needs the expires_on columns. The receipt was still saved.",
      expMissing: "Expiration is missing for",
      expBlank: "The expiration date is blank.",
      expAnyway: "Release anyway?",
      hd: "Expiration"
    },
    es: {
      label: "Fecha de vencimiento",
      hint: "Sazon, semilla, aceite y stevia. Las bolsas terminadas conservan su propia fecha.",
      lot: "Lote",
      noLot: "Sin lote",
      noDate: "Sin fecha",
      expired: "Vencido",
      soon: "Pronto",
      saved: "Fecha de vencimiento guardada",
      missing: "La fecha de vencimiento necesita las columnas expires_on. El recibo si se guardo.",
      expMissing: "Falta el vencimiento de",
      expBlank: "La fecha de vencimiento esta en blanco.",
      expAnyway: "Liberar de todos modos?",
      hd: "Vencimiento"
    },
    pt: {
      label: "Data de validade",
      hint: "Tempero, semente, oleo e stevia. Os sacos prontos guardam a propria validade.",
      lot: "Lote",
      noLot: "Sem lote",
      noDate: "Sem data",
      expired: "Vencido",
      soon: "Em breve",
      saved: "Data de validade salva",
      missing: "A data de validade precisa das colunas expires_on. O recebimento foi salvo.",
      expMissing: "Falta a validade de",
      expBlank: "A data de validade esta em branco.",
      expAnyway: "Liberar mesmo assim?",
      hd: "Validade"
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
  function catKey(cat) {
    return String(cat || "").toLowerCase().replace(/[\s_-]+/g, "");
  }
  function isRawCategory(cat) {
    var c = catKey(cat);
    return c === "seed" || c === "seeds" || c === "seasoning" || c === "oil" || c === "stevia";
  }
  function isRawItem(it) {
    return !!(it && isRawCategory(it.category));
  }
  function normLot(lot) {
    return String(lot == null ? "" : lot).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function dateISO(v) {
    if (v == null || v === "") return "";
    var m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  function todayISO() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function sameItem(itemId, it) {
    if (!it || itemId == null || itemId === "") return false;
    return itemId === it.id || (it.code && itemId === it.code);
  }
  function itemById(id) {
    var D = root && root.DB;
    if (!D || !D.items || !id) return null;
    var list = D.items();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id || list[i].code === id) return list[i];
    }
    return null;
  }
  function itemByCode(code) {
    var D = root && root.DB;
    if (!D || !code) return null;
    if (typeof D.itemByCode === "function") {
      var hit = D.itemByCode(code);
      if (hit) return hit;
    }
    return itemById(code);
  }

  // Stock expires_on wins. Else the newest receiving_log row for the same
  // item and the same lot key. A row.exp value is ignored on purpose.
  function resolveExpires(row, it, stock, recv) {
    if (!isRawItem(it) || !row) return { date: "", source: "" };
    var own = dateISO(row.expires_on);
    if (own) return { date: own, source: "stock" };
    var key = normLot(row.lot);
    var i, r, d, rank, best = "", bestRank = "";
    stock = stock || [];
    for (i = 0; i < stock.length; i++) {
      r = stock[i];
      if (!sameItem(r.item_id, it) || normLot(r.lot) !== key) continue;
      d = dateISO(r.expires_on);
      if (d) return { date: d, source: "stock" };
    }
    recv = recv || [];
    for (i = 0; i < recv.length; i++) {
      r = recv[i];
      if (!r.item_id || !sameItem(r.item_id, it) || normLot(r.lot) !== key) continue;
      d = dateISO(r.expires_on);
      if (!d) continue;
      rank = String(r.recv_date || "") + "|" + String(r.created_at || "") + "|" + String(r.id || "");
      if (!best || rank > bestRank) { best = d; bestRank = rank; }
    }
    if (best) return { date: best, source: "receiving_log" };
    return { date: "", source: "" };
  }

  function age(date) {
    var d = dateISO(date);
    if (!d) return "";
    var today = todayISO();
    if (d < today) return "expired";
    var t0 = Date.parse(today + "T00:00:00Z");
    var t1 = Date.parse(d + "T00:00:00Z");
    if (!isNaN(t0) && !isNaN(t1) && (t1 - t0) / 86400000 <= WARN_DAYS) return "soon";
    return "ok";
  }

  function lotLines(it, stock, recv) {
    if (!isRawItem(it)) return [];
    var out = [];
    (stock || []).forEach(function (r) {
      if (!r || !sameItem(r.item_id, it)) return;
      if (!(Math.abs(Number(r.qty) || 0) > 0.0001)) return;
      var hit = resolveExpires(r, it, stock, recv);
      out.push({
        loc: r.location || "",
        lot: r.lot || "",
        qty: Number(r.qty) || 0,
        exp: hit.date,
        source: hit.source
      });
    });
    out.sort(function (a, b) {
      if (!a.exp && b.exp) return 1;
      if (a.exp && !b.exp) return -1;
      if (a.exp !== b.exp) return a.exp < b.exp ? -1 : 1;
      return String(a.loc).localeCompare(String(b.loc));
    });
    return out;
  }

  // Dates to write after a move. Non-blank lots update every location once.
  // Blank lots stay on the single location so two unlotted piles do not share
  // a date. Finished goods return nothing.
  function stampsAfterMove(item, before, after, recv) {
    if (!isRawItem(item)) return [];
    var dates = {};
    (before || []).forEach(function (r) {
      if (!sameItem(r.item_id, item)) return;
      var hit = resolveExpires(r, item, before, recv || []);
      if (hit.date) dates[normLot(r.lot)] = hit.date;
    });
    var out = [];
    var seen = {};
    (after || []).forEach(function (r) {
      if (!sameItem(r.item_id, item)) return;
      var key = normLot(r.lot);
      if (!dates[key] || dateISO(r.expires_on)) return;
      if (key) {
        if (seen[key]) return;
        seen[key] = 1;
        out.push({ itemId: item.id, lot: r.lot || "", location: "", expiresOn: dates[key], stockOnly: false });
      } else {
        out.push({ itemId: item.id, lot: "", location: r.location || "", expiresOn: dates[key], stockOnly: true });
      }
    });
    return out;
  }

  function releaseWarning(item, lot, expiresOn) {
    if (!isRawItem(item)) return "";
    if (dateISO(expiresOn)) return "";
    var name = (item && (item.name || item.id)) || "this lot";
    var lotBit = lot ? " lot " + lot : "";
    return tx("expMissing") + " " + name + lotBit + ". " + tx("expBlank") + " " + tx("expAnyway");
  }
  function confirmRelease(item, rows) {
    var lines = [];
    (rows || []).forEach(function (r) {
      var msg = releaseWarning(item, r && r.lot, r && r.expires_on);
      if (msg && lines.indexOf(msg) < 0) lines.push(msg);
    });
    if (!lines.length) return true;
    var ask = (typeof root.confirm === "function") ? root.confirm : null;
    if (!ask && typeof window !== "undefined" && typeof window.confirm === "function") ask = window.confirm.bind(window);
    if (!ask) return true;
    return !!ask(lines.join("\n"));
  }
  function fmtQty(n) {
    var x = Number(n) || 0;
    try { return x.toLocaleString(); } catch (e) { return String(x); }
  }
  function val(id) {
    if (typeof document === "undefined") return "";
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  function receiveItem() {
    if (typeof document === "undefined") return null;
    if (document.getElementById("r-newcode")) {
      return { id: val("r-newcode"), code: val("r-newcode"), category: val("r-newcat"), name: val("r-newname") };
    }
    var code = val("r-code");
    if (!code) return null;
    return itemByCode(code);
  }
  function showReceiveField() {
    var it = receiveItem();
    if (!it) return true;
    return isRawItem(it);
  }
  function receiveLoc() {
    var loc = val("r-loc").toUpperCase();
    if (loc) return loc;
    if (val("r-cond") === "Quarantine") return "QUARANTINE";
    return "RECEIVING";
  }

  function noteResult(res, toastOk) {
    if (!res) return;
    if (res.missing) {
      if (!missingTold && root.UI && root.UI.toast) {
        missingTold = true;
        root.UI.toast(tx("missing"));
      }
      return;
    }
    if (res.ok === false && res.msg && !res.skipped && root.UI && root.UI.toast) root.UI.toast(res.msg);
    else if (res.ok && toastOk && root.UI && root.UI.toast) root.UI.toast(tx("saved"));
  }

  async function stamp(opts, toastOk) {
    var D = root.DB;
    if (!D || typeof D.setRawExpires !== "function") return { ok: false };
    var res;
    try { res = await D.setRawExpires(opts); }
    catch (e) { res = { ok: false, msg: String(e && e.message || e) }; }
    noteResult(res, toastOk);
    return res;
  }

  function matchLogFromForm() {
    var D = root.DB;
    if (!D || !D.receivingLog || !root.RECVMATCH || typeof root.RECVMATCH.pickDockRow !== "function") return null;
    return root.RECVMATCH.pickDockRow(D.receivingLog(), {
      recvId: val("rl-id"),
      lot: val("rl-lot"),
      itemId: val("rsop-item"),
      supplier: val("rl-supplier"),
      po: val("rl-po"),
      date: val("rl-date"),
      contents: val("rl-contents")
    });
  }
  function rowById(id) {
    var D = root.DB;
    if (!D || !D.receivingLog || !id) return null;
    var rows = D.receivingLog();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(id)) return rows[i];
    }
    return null;
  }

  function fieldHtml(id, value, recvId, itemId) {
    return '<div class="rx-field" data-rx-field="' + id + '"><label for="' + id + '">' + esc(tx("label")) + '</label>' +
      '<input id="' + id + '" type="date" autocomplete="off" value="' + esc(value || "") + '"' +
      (recvId ? ' data-recv-id="' + esc(recvId) + '"' : "") +
      (itemId ? ' data-item-id="' + esc(itemId) + '"' : "") + '>' +
      '<p class="hint rx-hint">' + esc(tx("hint")) + '</p></div>';
  }
  function logFormIsEdit() {
    var view = document.getElementById("view");
    return !!(view && view.innerHTML.indexOf("UI.rlEditCancel") >= 0);
  }

  function paintReceive() {
    var lot = document.getElementById("r-lot");
    if (!lot) return;
    var row = lot.closest ? lot.closest(".row") : lot.parentNode;
    if (!row) return;
    var show = showReceiveField();
    var existing = document.getElementById("r-exp");
    if (!existing) {
      var hold = document.createElement("div");
      var kept = dateISO(root.__smkRecvExp || "");
      hold.innerHTML = fieldHtml("r-exp", kept, "");
      row.appendChild(hold.firstChild);
      existing = document.getElementById("r-exp");
    }
    var box = existing ? existing.closest(".rx-field") : null;
    if (box) box.style.display = show ? "" : "none";
    if (existing) existing.setAttribute("data-rx-on", show ? "1" : "0");
  }

  function paintLogForm() {
    var lot = document.getElementById("rl-lot");
    if (!lot || document.getElementById("rl-exp")) return;
    var row = lot.closest ? lot.closest(".row") : lot.parentNode;
    if (!row || !row.parentNode) return;
    var editing = logFormIsEdit();
    var match = editing ? matchLogFromForm() : null;
    var it = match ? itemById(match.item_id) : null;
    var kept = !editing ? dateISO(root.__smkLogExp || "") : "";
    if (it && !isRawItem(it) && !(match && dateISO(match.expires_on)) && !kept) return;
    var hold = document.createElement("div");
    hold.innerHTML = fieldHtml("rl-exp", match ? dateISO(match.expires_on) : kept, match ? match.id : "", match ? match.item_id : "");
    row.parentNode.insertBefore(hold.firstChild, row.nextSibling);
  }

  function paintLogTable() {
    var body = document.getElementById("rlBody");
    if (!body) return;
    var D = root.DB;
    if (!D || !D.receivingLog) return;
    var logs = D.receivingLog();
    var trs = body.querySelectorAll("tr");
    Array.prototype.forEach.call(trs, function (tr) {
      if (tr.querySelector(".rx-logexp")) return;
      var cells = tr.cells;
      if (!cells || cells.length < 7) return;
      var lotAttr = tr.getAttribute("data-lot") || "";
      var date = String(cells[0].textContent || "").trim().slice(0, 10);
      var sup = String(cells[1].textContent || "").trim().toLowerCase();
      var hit = (root.RECVMATCH && root.RECVMATCH.pickDockRow)
        ? root.RECVMATCH.pickDockRow(logs, {
          recvId: tr.getAttribute("data-recv") || "",
          itemId: tr.getAttribute("data-item") || "",
          lot: lotAttr,
          date: date,
          supplier: sup
        })
        : null;
      if (!hit) return;
      var it = itemById(hit.item_id);
      var exp = dateISO(hit.expires_on);
      if (!exp && !(it && isRawItem(it))) return;
      var el = document.createElement("div");
      el.className = "rx-logexp" + (age(exp) === "expired" ? " rx-past" : "");
      el.textContent = exp ? (tx("label") + " " + exp + (age(exp) === "expired" ? " " + tx("expired") : "")) : tx("noDate");
      cells[6].appendChild(el);
    });
  }

  function lineSig(lines) {
    return lines.map(function (l) {
      return [l.loc, l.lot, l.qty, l.exp].join("|");
    }).join(";");
  }
  function focusedIn(node) {
    var ae = document.activeElement;
    return !!(ae && node && node.contains && node.contains(ae));
  }
  function paintFloor() {
    var D = root.DB;
    if (!D || !D.stock || !D.items) return;
    var stock = D.stock();
    var recv = D.receivingLog ? D.receivingLog() : [];
    var items = D.items();
    function byCode(code) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].code === code || items[i].id === code) return items[i];
      }
      return null;
    }
    var cards = document.querySelectorAll(".ivx-row");
    Array.prototype.forEach.call(cards, function (row) {
      var codeEl = row.querySelector(".ivx-code");
      if (!codeEl) return;
      var it = byCode(String(codeEl.textContent || "").trim());
      if (!isRawItem(it)) return;
      var lines = lotLines(it, stock, recv);
      var sig = lineSig(lines);
      var prev = row.querySelector(".rx-exp");
      if (prev && prev.getAttribute("data-sig") === sig) return;
      if (prev && focusedIn(prev)) return;
      var html = '<div class="rx-hd">' + esc(tx("hd")) + '</div>';
      if (!lines.length) html += '<div class="rx-empty">' + esc(tx("noDate")) + '</div>';
      lines.forEach(function (l) {
        var ag = age(l.exp);
        var lotTxt = l.lot ? l.lot : tx("noLot");
        var flag = ag === "expired" ? (' <b class="rx-past">' + esc(tx("expired")) + "</b>") : (ag === "soon" ? (' <b class="rx-soon">' + esc(tx("soon")) + "</b>") : "");
        html += '<div class="rx-line"><div class="rx-meta">' + esc(l.loc) + " · " + esc(lotTxt) + " · " + esc(fmtQty(l.qty)) +
          (l.exp ? " · " + esc(l.exp) : " · " + esc(tx("noDate"))) + flag + "</div>" +
          '<input class="rx-in" type="date" autocomplete="off" value="' + esc(l.exp) + '" data-item="' + esc(it.id) +
          '" data-lot="' + esc(l.lot) + '" data-loc="' + esc(l.loc) + '" aria-label="' + esc(tx("label")) + '"></div>';
      });
      var box = prev || document.createElement("div");
      box.className = "rx-exp";
      box.setAttribute("data-sig", sig);
      box.innerHTML = html;
      var locs = row.querySelector(".ivx-locs");
      if (!prev) {
        if (locs && locs.parentNode) locs.parentNode.insertBefore(box, locs.nextSibling);
        else row.appendChild(box);
      }
    });

    var dash = document.getElementById("dashBody");
    if (!dash) return;
    Array.prototype.forEach.call(dash.querySelectorAll("tr"), function (tr) {
      var muted = tr.querySelectorAll(".muted");
      var it = null;
      var cell = null;
      for (var m = 0; m < muted.length; m++) {
        var guess = byCode(String(muted[m].textContent || "").trim());
        if (guess && isRawItem(guess)) { it = guess; cell = muted[m].parentNode; break; }
      }
      if (!it || !cell) return;
      var lines = lotLines(it, stock, recv);
      var sig = lineSig(lines);
      var prev = cell.querySelector(".rx-exp");
      if (prev && prev.getAttribute("data-sig") === sig) return;
      if (prev && focusedIn(prev)) return;
      var bits = lines.map(function (l) {
        var lotTxt = l.lot ? l.lot : tx("noLot");
        var ag = age(l.exp);
        return esc(lotTxt) + ": " + (l.exp ? esc(l.exp) : esc(tx("noDate"))) +
          (ag === "expired" ? ' <b class="rx-past">' + esc(tx("expired")) + "</b>" : "");
      });
      var box = prev || document.createElement("div");
      box.className = "rx-exp rx-table";
      box.setAttribute("data-sig", sig);
      box.innerHTML = bits.length ? bits.join("<br>") : esc(tx("noDate"));
      if (!prev) cell.appendChild(box);
    });
  }

  function paint() {
    if (typeof document === "undefined") return;
    paintReceive();
    paintLogForm();
    paintLogTable();
    paintFloor();
  }

  function onView() {
    if (painting) return;
    painting = true;
    try { paint(); } catch (e) { try { console.warn("raw-exp", e); } catch (x) {} }
    finally { painting = false; }
  }

  function arm(name, fn) {
    var ui = root.UI;
    if (!ui || typeof ui[name] !== "function" || ui[name].__rx) return;
    var orig = ui[name];
    var wrapped = fn(orig);
    wrapped.__rx = true;
    ui[name] = wrapped;
  }

  function armDb(name, fn) {
    var D = root.DB;
    if (!D || typeof D[name] !== "function" || D[name].__rx) return;
    var orig = D[name];
    var wrapped = fn(orig);
    wrapped.__rx = true;
    D[name] = wrapped;
  }

  function installHooks() {
    if (!root || !root.DB || !root.UI) return;
    armDb("addReceivingLog", function (orig) {
      return async function (rec, file, op) {
        var p = pending;
        var res = await orig.apply(root.DB, arguments);
        if (p && p.exp && res && res.ok !== false) {
          p.used = true;
          var it = itemByCode(p.code) || itemById(rec && rec.item_id);
          await stamp({
            itemId: it ? it.id : (rec && rec.item_id),
            lot: (rec && rec.lot) || p.lot || "",
            location: p.loc || "",
            expiresOn: p.exp,
            recvId: (res && res.id) || "",
            quiet: true
          }, false);
        }
        return res;
      };
    });
    armDb("updateReceivingLog", function (orig) {
      return async function (id, rec) {
        var p = pending;
        var res = await orig.apply(root.DB, arguments);
        if (p && res && res.ok !== false && (p.exp || p.allowClear)) {
          var recvId = (root.RECVMATCH && root.RECVMATCH.stampRecvId)
            ? root.RECVMATCH.stampRecvId(id, p.recvId)
            : (p.recvId && String(p.recvId) !== String(id) ? "" : (p.recvId || id));
          if (!recvId) return res;
          p.used = true;
          var savedRow = rowById(id);
          var it = itemById((savedRow && savedRow.item_id) || (rec && rec.item_id)) || itemByCode(p.code);
          await stamp({
            itemId: it ? it.id : ((savedRow && savedRow.item_id) || (rec && rec.item_id)),
            lot: (rec && rec.lot != null ? rec.lot : p.lot) || "",
            location: p.loc || "",
            expiresOn: p.exp || "",
            recvId: recvId,
            quiet: true
          }, false);
        }
        return res;
      };
    });
    armDb("move", function (orig) {
      return async function (item) {
        var before = (root.DB.stock ? root.DB.stock() : []).map(function (r) { return Object.assign({}, r); });
        var recv = (root.DB.receivingLog ? root.DB.receivingLog() : []).map(function (r) { return Object.assign({}, r); });
        var res = await orig.apply(root.DB, arguments);
        try {
          if (item && isRawItem(item) && res && res.ok !== false) {
            var after = root.DB.stock ? root.DB.stock() : [];
            var jobs = stampsAfterMove(item, before, after, recv);
            for (var i = 0; i < jobs.length; i++) {
              await stamp({
                itemId: jobs[i].itemId,
                lot: jobs[i].lot,
                location: jobs[i].location,
                expiresOn: jobs[i].expiresOn,
                stockOnly: jobs[i].stockOnly,
                quiet: i < jobs.length - 1
              }, false);
            }
          }
        } catch (e) {}
        return res;
      };
    });
    arm("receive", function (orig) {
      return async function () {
        var el = document.getElementById("r-exp");
        var on = el && el.getAttribute("data-rx-on") === "1";
        var exp = on ? dateISO(el.value) : "";
        pending = exp ? {
          exp: exp,
          lot: val("r-lot"),
          code: val("r-newcode") || val("r-code"),
          loc: receiveLoc(),
          allowClear: false,
          used: false
        } : null;
        try {
          return await orig.apply(root.UI, arguments);
        } finally {
          var p = pending;
          pending = null;
          if (p && p.exp && !p.used) {
            var it = itemByCode(p.code);
            if (it && isRawItem(it)) {
              await stamp({ itemId: it.id, lot: p.lot, location: p.loc, expiresOn: p.exp, stockOnly: !normLot(p.lot) ? true : false, quiet: false }, false);
            }
          }
        }
      };
    });
    arm("rlSave", function (orig) {
      return async function () {
        var el = document.getElementById("rl-exp");
        pending = el ? {
          exp: dateISO(el.value),
          lot: val("rl-lot"),
          code: "",
          loc: "",
          allowClear: true,
          used: false,
          recvId: el.getAttribute("data-recv-id") || "",
          code: el.getAttribute("data-item-id") || ""
        } : null;
        try {
          return await orig.apply(root.UI, arguments);
        } finally {
          pending = null;
        }
      };
    });
  }

  async function saveFloor(input) {
    var it = itemById(input.getAttribute("data-item"));
    if (!isRawItem(it)) return;
    var exp = dateISO(input.value);
    var res = await stamp({
      itemId: it.id,
      lot: input.getAttribute("data-lot") || "",
      location: input.getAttribute("data-loc") || "",
      expiresOn: exp,
      stockOnly: !normLot(input.getAttribute("data-lot") || ""),
      quiet: false
    }, true);
    if (res && res.ok) {
      var box = input.closest ? input.closest(".rx-exp") : null;
      if (box) box.removeAttribute("data-sig");
    }
  }

  function boot() {
    installHooks();
    var view = document.getElementById("view");
    if (!view || view.__rxObs) { onView(); return; }
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(onView);
      view.__rxObs = obs;
      obs.observe(view, { childList: true, subtree: true });
    }
    view.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains("rx-in")) return;
      saveFloor(t);
    });
    view.addEventListener("input", function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === "r-code" || t.id === "r-newcat" || t.id === "r-newcode") paintReceive();
    });
    onView();
  }

  function ensureStyle() {
    if (document.getElementById("rx-style")) return;
    var css = document.createElement("style");
    css.id = "rx-style";
    css.textContent = [
      ".rx-field{flex:1;min-width:180px}",
      ".rx-field input[type=date]{min-height:46px;font-size:17px}",
      ".rx-hint{margin:4px 0 0}",
      ".rx-exp{margin:6px 0 4px;padding:6px 8px;border-radius:8px;background:#f6f8fb}",
      ".rx-hd{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5b6573;margin:0 0 4px}",
      ".rx-line{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}",
      ".rx-meta{flex:1;min-width:160px;font-size:14px}",
      ".rx-in{min-height:40px;font-size:16px}",
      ".rx-past{color:#b42318}",
      ".rx-soon{color:#b54708}",
      ".rx-logexp{font-size:12px;font-weight:700;margin-top:2px}",
      ".rx-table{background:transparent;padding:2px 0;font-size:13px}"
    ].join("");
    document.head.appendChild(css);
  }

  var api = {
    isRawCategory: isRawCategory,
    isRawItem: isRawItem,
    normLot: normLot,
    dateISO: dateISO,
    resolveExpires: resolveExpires,
    lotLines: lotLines,
    stampsAfterMove: stampsAfterMove,
    releaseWarning: releaseWarning,
    confirmRelease: confirmRelease,
    age: age,
    WRITE_STOCK: false
  };

  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.RAW_EXP = api;
  if (root.document) {
    ensureStyle();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})(typeof window !== "undefined" ? window : globalThis);

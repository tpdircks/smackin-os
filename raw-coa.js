/* ============================================================================
   Smackin' OS - dock COA check (raw-coa.js)
   Seed, seasoning, maltodextrin, oil, and stevia. This screen records
   whether the COA was in hand at the dock: Yes, No, or N/A, plus a short note.
   The PDF or photo is stored by coa-docs.js.

   No on seed, seasoning, maltodextrin, oil, or stevia puts the receipt
   on QA Hold. That uses the HOLD Log, receiving_log.on_hold, and the
   QA-HOLD location. Quality release clears the hold and leaves COA = No,
   with a note that Quality released later.
   A missing column does not block the receipt. This file does not upload.
   ========================================================================== */
(function (root) {
  "use strict";
  if (root && root.RAW_COA) return;

  var COA_HOLD_REASON = "COA not received at the dock";
  var pending = null;
  var missingTold = false;
  var painting = false;
  var OPS = ["Jesus", "Adriana", "Marlin", "Edgar", "Troy"];

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
      label: "COA received?",
      note: "Note (optional)",
      hint: "Yes, No, or N/A. No on seed, seasoning, maltodextrin, oil, or stevia puts the lot on QA Hold until Quality releases it. Attach the COA here when you have the file.",
      yes: "Yes", no: "No", na: "N/A",
      hold: "QA Hold",
      release: "Quality release",
      released: "Quality released",
      yourName: "Your name",
      needName: "Enter your name to release the hold.",
      releaseAsk: "Release this QA Hold? COA stays No.",
      saved: "COA answer saved",
      held: "QA Hold until Quality releases it. COA was not received.",
      missing: "COA answers need the coa columns. The receipt was still saved.",
      marked: "Marked by"
    },
    es: {
      label: "COA recibido?",
      note: "Nota (opcional)",
      hint: "Si, No o N/A. No en semilla, sazon, maltodextrina, aceite o stevia pone el lote en QA Hold hasta que Calidad lo libere. Adjunte el COA aqui cuando tenga el archivo.",
      yes: "Si", no: "No", na: "N/A",
      hold: "QA Hold",
      release: "Liberar calidad",
      released: "Calidad libero",
      yourName: "Su nombre",
      needName: "Escriba su nombre para liberar.",
      releaseAsk: "Liberar este QA Hold? COA sigue en No.",
      saved: "Respuesta COA guardada",
      held: "QA Hold hasta que Calidad lo libere. El COA no se recibio.",
      missing: "La respuesta COA necesita las columnas coa. El recibo si se guardo.",
      marked: "Marcado por"
    },
    pt: {
      label: "COA recebido?",
      note: "Nota (opcional)",
      hint: "Sim, Nao ou N/A. Nao em semente, tempero, maltodextrina, oleo ou stevia coloca o lote em QA Hold ate a Qualidade liberar. Anexe o COA aqui quando tiver o arquivo.",
      yes: "Sim", no: "Nao", na: "N/A",
      hold: "QA Hold",
      release: "Liberar qualidade",
      released: "Qualidade liberou",
      yourName: "Seu nome",
      needName: "Digite seu nome para liberar.",
      releaseAsk: "Liberar este QA Hold? COA continua Nao.",
      saved: "Resposta COA salva",
      held: "QA Hold ate a Qualidade liberar. O COA nao foi recebido.",
      missing: "A resposta COA precisa das colunas coa. O recebimento foi salvo.",
      marked: "Marcado por"
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
  function blob(it) {
    return catKey([it && it.id, it && it.code, it && it.name, it && it.flavor].join(" "));
  }
  function isMaltodextrin(it) {
    if (!it) return false;
    var c = catKey(it.category);
    if (c === "adhesion" || c === "maltodextrin" || c === "malto") return true;
    var h = blob(it);
    return h.indexOf("maltodextrin") >= 0 || h.indexOf("malto") >= 0 || h.indexOf("adhesion") >= 0 || h.indexOf("clintose") >= 0;
  }
  function isOilOrStevia(it) {
    if (!it) return false;
    var c = catKey(it.category);
    if (c === "oil" || c === "stevia") return true;
    var id = catKey(it.code || it.id);
    if (id === "oil" || id === "stevia") return true;
    var name = catKey(it.name);
    return name === "oil" || name === "stevia";
  }
  function isCoaItem(it) {
    if (!it) return false;
    if (isMaltodextrin(it) || isOilOrStevia(it)) return true;
    var c = catKey(it.category);
    return c === "seed" || c === "seeds" || c === "seasoning" || c === "oil" || c === "stevia" || c === "adhesion";
  }
  function isHighRisk(it) {
    return !!isCoaItem(it);
  }
  function normAnswer(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z]/g, "");
    if (s === "y" || s === "yes") return "yes";
    if (s === "n" || s === "no") return "no";
    if (s === "na" || s === "notapplicable") return "na";
    return "";
  }
  function shouldHold(it, answer, released) {
    if (released) return false;
    return normAnswer(answer) === "no" && isHighRisk(it);
  }
  function holdLocation(cond, loc) {
    cond = String(cond || "");
    loc = String(loc || "").toUpperCase();
    if (cond === "Quarantine") return "QUARANTINE";
    if (loc === "QA-HOLD" || loc === "QUARANTINE" || loc === "RETURNS-HOLD") return loc;
    return "QA-HOLD";
  }
  function releaseRecord(row, by, at, extra) {
    var base = "Quality released";
    var extraNote = String(extra || "").trim();
    var note = !extraNote || extraNote.toLowerCase() === "quality released" ? base : (base + ". " + extraNote);
    return {
      coa_received: normAnswer(row && row.coa_received),
      coa_note: row && row.coa_note ? String(row.coa_note) : "",
      coa_by: row && row.coa_by ? String(row.coa_by) : "",
      coa_at: (row && row.coa_at) || "",
      coa_released_by: by || "",
      coa_released_at: at || "",
      coa_release_note: note
    };
  }
  function normLot(lot) {
    return String(lot == null ? "" : lot).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function answerLabel(v) {
    v = normAnswer(v);
    if (v === "yes") return tx("yes");
    if (v === "no") return tx("no");
    if (v === "na") return tx("na");
    return "";
  }
  function denverWhen(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Denver",
        year: "numeric", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit"
      }).format(d) + " MT";
    } catch (e) {
      return String(iso);
    }
  }
  function val(id) {
    if (typeof document === "undefined") return "";
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  function operator() {
    var named = val("op");
    return named || "Adriana";
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
    return isCoaItem(it);
  }
  function logDataLot(lot) {
    return String(lot || "").toUpperCase().replace(/\s+/g, "");
  }
  function matchLogFromForm() {
    var D = root.DB;
    if (!D || !D.receivingLog) return null;
    var lot = logDataLot(val("rl-lot"));
    var sup = val("rl-supplier").toLowerCase();
    var po = val("rl-po");
    var date = val("rl-date");
    var rows = D.receivingLog().filter(function (r) {
      if (logDataLot(r.lot) !== lot) return false;
      if (sup && String(r.supplier || "").toLowerCase() !== sup) return false;
      return true;
    });
    if (date) {
      var byDate = rows.filter(function (r) { return String(r.recv_date || "").slice(0, 10) === date; });
      if (byDate.length) rows = byDate;
    }
    if (po) {
      var byPo = rows.filter(function (r) { return String(r.po_num || "") === po; });
      if (byPo.length) rows = byPo;
    }
    return rows[0] || null;
  }
  function findLog(id) {
    var D = root.DB;
    if (!D || !D.receivingLog || !id) return null;
    var rows = D.receivingLog();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(id)) return rows[i];
    }
    return null;
  }
  function logFormIsEdit() {
    var view = document.getElementById("view");
    return !!(view && view.innerHTML.indexOf("UI.rlEditCancel") >= 0);
  }
  function noteResult(res) {
    if (!res) return;
    if (res.missing) {
      if (!missingTold && root.UI && root.UI.toast) {
        missingTold = true;
        root.UI.toast(tx("missing"));
      }
      return;
    }
    if (res.ok === false && res.msg && !res.skipped && root.UI && root.UI.toast) root.UI.toast(res.msg);
  }
  function toast(msg) {
    if (root.UI && root.UI.toast) root.UI.toast(msg);
  }
  async function stamp(opts) {
    var D = root.DB;
    if (!D || typeof D.setRawCoa !== "function") return { ok: false };
    opts = opts || {};
    var write = {
      itemId: opts.itemId,
      lot: opts.lot,
      location: opts.loc || opts.location || "",
      recvId: opts.recvId,
      coaReceived: opts.answer != null ? opts.answer : opts.coaReceived,
      coaNote: opts.note != null ? opts.note : opts.coaNote,
      coaBy: opts.by || opts.coaBy || "",
      coaAt: opts.at || opts.coaAt || null,
      clearRelease: !!opts.clearRelease,
      stockOnly: !!opts.stockOnly,
      quiet: true
    };
    var holdRes = null;
    try {
      if (opts.hold && typeof D.placeRawCoaHold === "function") {
        holdRes = await D.placeRawCoaHold(opts);
        if (holdRes && holdRes.hold && root.RECVSOP && typeof root.RECVSOP.noteExternalHold === "function") {
          root.RECVSOP.noteExternalHold(holdRes.hold);
        }
      } else if (opts.clearHold && typeof D.clearRawCoaHold === "function") {
        holdRes = await D.clearRawCoaHold(opts);
      }
      var res = await D.setRawCoa(write);
      if (holdRes && holdRes.ok === false) res = holdRes;
      noteResult(res);
      if (res && res.ok && opts.toast) toast(tx("saved"));
      return res;
    } catch (e) {
      var fail = { ok: false, msg: String(e && e.message || e) };
      noteResult(fail);
      return fail;
    }
  }

  function fieldHtml(id, answer, note, recvId, itemId) {
    var opts = [["", ""], ["yes", tx("yes")], ["no", tx("no")], ["na", tx("na")]];
    var cur = normAnswer(answer);
    var choices = opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("");
    return '<div class="rc-field" data-rc-field="' + id + '">' +
      '<label for="' + id + '">' + esc(tx("label")) + "</label>" +
      '<select id="' + id + '"' +
      (recvId ? ' data-recv-id="' + esc(recvId) + '"' : "") +
      (itemId ? ' data-item-id="' + esc(itemId) + '"' : "") + ">" + choices + "</select>" +
      '<label for="' + id + '-note">' + esc(tx("note")) + "</label>" +
      '<input id="' + id + '-note" maxlength="160" autocomplete="off" value="' + esc(note || "") + '">' +
      '<p class="hint rc-hint">' + esc(tx("hint")) + "</p></div>";
  }

  function paintReceive() {
    var lot = document.getElementById("r-lot");
    if (!lot) return;
    var row = lot.closest ? lot.closest(".row") : lot.parentNode;
    if (!row) return;
    var show = showReceiveField();
    var existing = document.getElementById("r-coa");
    if (!existing) {
      var hold = document.createElement("div");
      var kept = root.__smkRecvCoa || {};
      hold.innerHTML = fieldHtml("r-coa", kept.answer || "", kept.note || "", "", "");
      var exp = document.getElementById("r-exp");
      var expBox = exp && exp.closest ? exp.closest(".rx-field") : null;
      if (expBox && expBox.parentNode === row) row.insertBefore(hold.firstChild, expBox.nextSibling);
      else row.appendChild(hold.firstChild);
      existing = document.getElementById("r-coa");
    }
    var box = existing ? existing.closest(".rc-field") : null;
    if (box) box.style.display = show ? "" : "none";
    if (existing) existing.setAttribute("data-rc-on", show ? "1" : "0");
  }

  function paintLogForm() {
    var lot = document.getElementById("rl-lot");
    if (!lot || document.getElementById("rl-coa")) return;
    var row = lot.closest ? lot.closest(".row") : lot.parentNode;
    if (!row || !row.parentNode) return;
    var editing = logFormIsEdit();
    var match = editing ? matchLogFromForm() : null;
    var it = match ? itemById(match.item_id) : null;
    var kept = !editing && root.__smkLogCoa ? root.__smkLogCoa : {};
    if (it && !isCoaItem(it) && !(match && normAnswer(match.coa_received)) && !normAnswer(kept.answer)) return;
    var hold = document.createElement("div");
    hold.innerHTML = fieldHtml("rl-coa", match ? match.coa_received : (kept.answer || ""), match ? match.coa_note : (kept.note || ""), match ? match.id : "", match ? match.item_id : "");
    var exp = document.getElementById("rl-exp");
    var expBox = exp && exp.closest ? exp.closest(".rx-field") : null;
    var anchor = expBox || row;
    if (anchor.parentNode) anchor.parentNode.insertBefore(hold.firstChild, anchor.nextSibling);
  }

  function summaryText(row) {
    var ans = answerLabel(row && row.coa_received);
    if (!ans) return "";
    var bits = [tx("label") + " " + ans];
    if (row.coa_note) bits.push(row.coa_note);
    if (row.coa_by || row.coa_at) bits.push(tx("marked") + " " + (row.coa_by || "") + (row.coa_at ? " " + denverWhen(row.coa_at) : ""));
    if (normAnswer(row.coa_received) === "no" && !row.coa_released_at) bits.push(tx("hold"));
    if (row.coa_released_at) bits.push(tx("released") + " " + (row.coa_released_by || "") + " " + denverWhen(row.coa_released_at));
    return bits.join(" · ");
  }
  function releaseHtml(row, itemId, lot, loc) {
    if (!row || normAnswer(row.coa_received) !== "no" || row.coa_released_at) return "";
    return '<span class="rc-line"><input class="rc-who" maxlength="80" autocomplete="name" value="' + esc(operator()) + '" placeholder="' + esc(tx("yourName")) + '" aria-label="' + esc(tx("yourName")) + '">' +
      '<button type="button" class="ghost sm rc-rel" data-item="' + esc(itemId || row.item_id || "") + '" data-lot="' + esc(lot || row.lot || "") + '" data-recv="' + esc(row.id || "") + '" data-loc="' + esc(loc || "") + '">' + esc(tx("release")) + "</button></span>";
  }

  function paintLogTable() {
    var body = document.getElementById("rlBody");
    if (!body || !root.DB || !root.DB.receivingLog) return;
    var logs = root.DB.receivingLog();
    Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr) {
      var cells = tr.cells;
      if (!cells || cells.length < 7) return;
      var lotAttr = tr.getAttribute("data-lot") || "";
      var date = String(cells[0].textContent || "").trim().slice(0, 10);
      var sup = String(cells[1].textContent || "").trim().toLowerCase();
      var hit = null;
      for (var i = 0; i < logs.length; i++) {
        var r = logs[i];
        if (logDataLot(r.lot) !== lotAttr) continue;
        if (date && String(r.recv_date || "").slice(0, 10) !== date) continue;
        if (sup && String(r.supplier || "").trim().toLowerCase() !== sup) continue;
        hit = r;
        break;
      }
      if (!hit || !normAnswer(hit.coa_received)) {
        var stale = tr.querySelector(".rc-log");
        if (stale && !normAnswer(hit && hit.coa_received)) stale.remove();
        return;
      }
      var sig = [hit.coa_received, hit.coa_note, hit.coa_by, hit.coa_at, hit.coa_released_at, hit.on_hold].join("|");
      var prev = tr.querySelector(".rc-log");
      if (prev && prev.getAttribute("data-sig") === sig) return;
      if (prev && prev.contains && document.activeElement && prev.contains(document.activeElement)) return;
      var el = prev || document.createElement("div");
      el.className = "rc-log" + (normAnswer(hit.coa_received) === "no" && !hit.coa_released_at ? " rc-hold" : "");
      el.setAttribute("data-sig", sig);
      el.innerHTML = esc(summaryText(hit)) + releaseHtml(hit, hit.item_id, hit.lot, "");
      if (!prev) cells[6].appendChild(el);
    });
  }

  function linesFor(it, stock, recv) {
    if (!isCoaItem(it)) return [];
    var out = [];
    var seen = {};
    (stock || []).forEach(function (r) {
      if (!r || (r.item_id !== it.id && r.item_id !== it.code)) return;
      if (!(Math.abs(Number(r.qty) || 0) > 0.0001)) return;
      var key = normLot(r.lot) + "|" + (normLot(r.lot) ? "" : (r.location || ""));
      if (seen[key]) return;
      seen[key] = 1;
      var hit = resolveCoa(r, it, stock, recv);
      if (!hit.received) return;
      out.push({
        lot: r.lot || "",
        loc: r.location || "",
        received: hit.received,
        note: hit.note,
        by: hit.by,
        at: hit.at,
        releasedAt: hit.releasedAt,
        releasedBy: hit.releasedBy,
        recvId: hit.recvId,
        onHold: hit.received === "no" && !hit.releasedAt
      });
    });
    return out;
  }
  function resolveCoa(row, it, stock, recv) {
    var own = normAnswer(row && row.coa_received);
    if (own) {
      return {
        received: own, note: row.coa_note || "", by: row.coa_by || "", at: row.coa_at || "",
        releasedAt: row.coa_released_at || "", releasedBy: row.coa_released_by || "", recvId: ""
      };
    }
    var key = normLot(row && row.lot);
    var best = null;
    var bestRank = "";
    (recv || []).forEach(function (r) {
      if (!r || (r.item_id !== it.id && r.item_id !== it.code)) return;
      if (normLot(r.lot) !== key) return;
      if (!normAnswer(r.coa_received)) return;
      var rank = String(r.recv_date || "") + "|" + String(r.created_at || "") + "|" + String(r.id || "");
      if (!best || rank > bestRank) { best = r; bestRank = rank; }
    });
    if (!best) return { received: "", note: "", by: "", at: "", releasedAt: "", releasedBy: "", recvId: "" };
    return {
      received: normAnswer(best.coa_received),
      note: best.coa_note || "",
      by: best.coa_by || "",
      at: best.coa_at || "",
      releasedAt: best.coa_released_at || "",
      releasedBy: best.coa_released_by || "",
      recvId: best.id || ""
    };
  }
  function lineSig(lines) {
    return lines.map(function (l) {
      return [l.loc, l.lot, l.received, l.note, l.releasedAt, l.onHold].join("|");
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
    function paintBox(host, it, before) {
      var lines = linesFor(it, stock, recv);
      var sig = lineSig(lines);
      var prev = host.querySelector(".rc-floor");
      if (!lines.length) {
        if (prev) prev.remove();
        return;
      }
      if (prev && prev.getAttribute("data-sig") === sig) return;
      if (prev && focusedIn(prev)) return;
      var html = "";
      lines.forEach(function (l) {
        var row = {
          coa_received: l.received, coa_note: l.note, coa_by: l.by, coa_at: l.at,
          coa_released_at: l.releasedAt, coa_released_by: l.releasedBy, id: l.recvId, item_id: it.id, lot: l.lot
        };
        var hot = l.onHold ? " rc-hold" : "";
        html += '<div class="rc-line' + hot + '"><div class="rc-meta">' + esc(summaryText(row)) + "</div>" + releaseHtml(row, it.id, l.lot, l.loc) + "</div>";
      });
      var box = prev || document.createElement("div");
      var hotAny = lines.some(function (l) { return l.onHold; });
      box.className = "rc-floor" + (hotAny ? "" : " rc-clear");
      box.setAttribute("data-sig", sig);
      box.innerHTML = html;
      if (!prev) {
        if (before && before.parentNode) before.parentNode.insertBefore(box, before.nextSibling);
        else host.appendChild(box);
      }
    }
    Array.prototype.forEach.call(document.querySelectorAll(".ivx-row"), function (row) {
      var codeEl = row.querySelector(".ivx-code");
      if (!codeEl) return;
      var it = byCode(String(codeEl.textContent || "").trim());
      if (!isCoaItem(it)) return;
      var exp = row.querySelector(".rx-exp");
      var locs = row.querySelector(".ivx-locs");
      paintBox(row, it, exp || locs);
    });
    var dash = document.getElementById("dashBody");
    if (!dash) return;
    Array.prototype.forEach.call(dash.querySelectorAll("tr"), function (tr) {
      var muted = tr.querySelectorAll(".muted");
      var it = null;
      var cell = null;
      for (var m = 0; m < muted.length; m++) {
        var guess = byCode(String(muted[m].textContent || "").trim());
        if (guess && isCoaItem(guess)) { it = guess; cell = muted[m].parentNode; break; }
      }
      if (!it || !cell) return;
      paintBox(cell, it, cell.querySelector(".rx-exp"));
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
    try { paint(); } catch (e) { try { console.warn("raw-coa", e); } catch (x) {} }
    finally { painting = false; }
  }

  function arm(name, fn) {
    var ui = root.UI;
    if (!ui || typeof ui[name] !== "function" || ui[name].__rc) return;
    var orig = ui[name];
    var wrapped = fn(orig);
    wrapped.__rc = true;
    ui[name] = wrapped;
  }
  function armDb(name, fn) {
    var D = root.DB;
    if (!D || typeof D[name] !== "function" || D[name].__rc) return;
    var orig = D[name];
    var wrapped = fn(orig);
    wrapped.__rc = true;
    D[name] = wrapped;
  }
  function planFrom(it, answer, prev, by, lot, recvId, code, loc, qty, itemName) {
    var wasNo = !!(prev && normAnswer(prev.coa_received) === "no");
    var wasReleased = !!(prev && prev.coa_released_at);
    var keepRelease = wasNo && wasReleased && answer === "no";
    return {
      answer: answer,
      note: "",
      by: by,
      lot: lot || "",
      recvId: recvId || "",
      itemId: it ? it.id : "",
      code: code || "",
      loc: loc || "",
      qty: qty,
      itemName: itemName || (it ? it.name : ""),
      hold: shouldHold(it, answer, keepRelease),
      clearHold: wasNo && answer !== "no" && !wasReleased,
      clearRelease: shouldHold(it, answer, false) && wasReleased && !keepRelease,
      keepRelease: keepRelease,
      allowClear: true,
      used: false
    };
  }

  function installHooks() {
    if (!root || !root.DB || !root.UI) return;
    armDb("addReceivingLog", function (orig) {
      return async function (rec) {
        var p = pending;
        var res = await orig.apply(root.DB, arguments);
        if (p && (p.answer || p.allowClear) && res && res.ok !== false) {
          p.used = true;
          var it = itemById(rec && rec.item_id) || itemByCode(p.code);
          var plan = planFrom(it, p.answer, null, p.by, (rec && rec.lot) || p.lot, (res && res.id) || p.recvId, p.code, p.loc, (rec && rec.qty_received) || p.qty, (rec && rec.contents) || p.itemName);
          plan.note = p.note;
          plan.hold = p.holdWanted != null ? (p.answer === "no" && isHighRisk(it) && !p.keepRelease) : plan.hold;
          plan.clearRelease = plan.hold && p.wasReleased;
          await stamp(plan);
        }
        return res;
      };
    });
    armDb("updateReceivingLog", function (orig) {
      return async function (id, rec) {
        var p = pending;
        var res = await orig.apply(root.DB, arguments);
        if (p && res && res.ok !== false && (p.answer || p.allowClear)) {
          p.used = true;
          var it = itemById((rec && rec.item_id) || p.itemId) || itemByCode(p.code);
          var prev = findLog(p.recvId || id);
          var plan = planFrom(it, p.answer, prev, p.by, (rec && rec.lot != null ? rec.lot : p.lot) || "", p.recvId || id, p.code, p.loc, rec && rec.qty_received, (rec && rec.contents) || "");
          plan.note = p.note;
          await stamp(plan);
        }
        return res;
      };
    });
    arm("receive", function (orig) {
      return async function () {
        var el = document.getElementById("r-coa");
        var on = el && el.getAttribute("data-rc-on") === "1";
        var answer = on ? normAnswer(el.value) : "";
        var it = receiveItem();
        var hold = on && shouldHold(it, answer, false);
        var locEl = document.getElementById("r-loc");
        var prevLoc = locEl ? locEl.value : "";
        var loc = hold ? holdLocation(val("r-cond"), val("r-loc")) : (val("r-loc").toUpperCase() || "RECEIVING");
        if (hold && val("r-cond") !== "Quarantine") {
          if (locEl && loc !== "QUARANTINE" && loc !== "RETURNS-HOLD") locEl.value = "QA-HOLD";
          loc = holdLocation(val("r-cond"), val("r-loc"));
        }
        var beforeQty = 0;
        try {
          if (it && it.id && root.DB && root.DB.onHand) beforeQty = Number(root.DB.onHand(it.id)) || 0;
        } catch (e) { beforeQty = 0; }
        pending = answer ? {
          answer: answer,
          note: val("r-coa-note").slice(0, 160),
          by: operator(),
          lot: val("r-lot"),
          code: val("r-newcode") || val("r-code"),
          loc: loc,
          qty: val("r-qty"),
          supplier: val("r-sup"),
          po: val("r-inv"),
          itemName: it ? (it.name || "") : val("r-newname"),
          holdWanted: hold,
          keepRelease: false,
          wasReleased: false,
          allowClear: false,
          used: false
        } : null;
        try {
          return await orig.apply(root.UI, arguments);
        } finally {
          var p = pending;
          try {
            var made = p ? itemByCode(p.code) : null;
            var afterQty = 0;
            if (made && root.DB && root.DB.onHand) afterQty = Number(root.DB.onHand(made.id)) || 0;
            var landed = !!(p && (p.used || afterQty > beforeQty + 0.0001));
            if (!landed && locEl) locEl.value = prevLoc;
            if (!root.__smkRecvLogTried && p && p.answer && landed && !p.used && made && isCoaItem(made)) {
              if (p.holdWanted && root.DB && root.DB.addReceivingLog) {
                var today = new Date().toISOString().slice(0, 10);
                await root.DB.addReceivingLog({
                  recv_date: today,
                  supplier: p.supplier || "",
                  po_num: p.po || "",
                  contents: made.name || p.itemName || "",
                  lot: p.lot || "",
                  qty_received: p.qty,
                  condition: "Hold",
                  received_by: p.by || "",
                  item_id: made.id || made.code || ""
                }, null, p.by || "");
              }
              if (!p.used) {
                await stamp({
                  answer: p.answer,
                  note: p.note,
                  by: p.by,
                  itemId: made.id,
                  lot: p.lot,
                  location: p.loc,
                  qty: p.qty,
                  itemName: made.name || "",
                  hold: !!p.holdWanted,
                  stockOnly: true
                });
              }
            }
            if (landed && p && p.holdWanted) toast(tx("held"));
          } catch (e) { noteResult({ ok: false, msg: String(e && e.message || e) }); }
          pending = null;
        }
      };
    });
    arm("rlSave", function (orig) {
      return async function () {
        var el = document.getElementById("rl-coa");
        var prev = el ? findLog(el.getAttribute("data-recv-id") || "") : null;
        if (!prev) prev = matchLogFromForm();
        var answer = el ? normAnswer(el.value) : "";
        pending = el ? {
          answer: answer,
          note: val("rl-coa-note").slice(0, 160),
          by: operator(),
          lot: val("rl-lot"),
          code: el.getAttribute("data-item-id") || "",
          itemId: el.getAttribute("data-item-id") || "",
          recvId: el.getAttribute("data-recv-id") || (prev && prev.id) || "",
          loc: "",
          allowClear: true,
          keepRelease: !!(prev && normAnswer(prev.coa_received) === "no" && prev.coa_released_at && answer === "no"),
          wasReleased: !!(prev && prev.coa_released_at),
          used: false
        } : null;
        if (pending && !pending.answer && !(prev && normAnswer(prev.coa_received))) pending = null;
        try {
          return await orig.apply(root.UI, arguments);
        } finally {
          pending = null;
        }
      };
    });
  }

  async function releaseFrom(btn) {
    var box = btn.closest ? (btn.closest(".rc-line") || btn.closest(".rc-log") || btn.closest(".rc-floor")) : null;
    var whoEl = box ? box.querySelector(".rc-who") : null;
    var name = whoEl ? String(whoEl.value || "").trim() : operator();
    if (!name) { toast(tx("needName")); return; }
    var lot = btn.getAttribute("data-lot") || "";
    var ask = tx("releaseAsk") + (lot ? "\n" + lot : "");
    if (root.COA_DOCS && typeof root.COA_DOCS.allowRelease === "function") {
      if (!root.COA_DOCS.allowRelease({
        itemId: btn.getAttribute("data-item") || "",
        lot: lot,
        recvId: btn.getAttribute("data-recv") || "",
        ask: ask
      })) return;
    } else if (typeof window !== "undefined" && window.confirm && !window.confirm(ask)) return;
    var D = root.DB;
    if (!D || typeof D.releaseRawCoa !== "function") return;
    var res;
    try {
      res = await D.releaseRawCoa({
        itemId: btn.getAttribute("data-item") || "",
        lot: lot,
        recvId: btn.getAttribute("data-recv") || "",
        by: name,
        note: "",
        location: btn.getAttribute("data-loc") || ""
      });
    } catch (e) {
      res = { ok: false, msg: String(e && e.message || e) };
    }
    noteResult(res);
    if (res && res.ok) {
      toast(tx("released"));
      if (root.RECVSOP && typeof root.RECVSOP.noteExternalRelease === "function") {
        root.RECVSOP.noteExternalRelease(btn.getAttribute("data-recv") || "", lot);
      }
      var host = btn.closest ? btn.closest(".rc-floor, .rc-log") : null;
      if (host) host.removeAttribute("data-sig");
      onView();
    }
  }

  async function afterHoldLogReleased(info) {
    info = info || {};
    var row = findLog(info.id);
    var reason = String(info.reason || "");
    if (!row && info.lot && root.DB && root.DB.receivingLog) {
      var key = normLot(info.lot);
      var logs = root.DB.receivingLog();
      for (var i = 0; i < logs.length; i++) {
        if (normLot(logs[i].lot) !== key) continue;
        if (normAnswer(logs[i].coa_received) !== "no" || logs[i].coa_released_at) continue;
        row = logs[i];
        break;
      }
    }
    if (!row || normAnswer(row.coa_received) !== "no" || row.coa_released_at) return { ok: true, skipped: true };
    var tied = (info.id && String(row.id) === String(info.id)) || reason.indexOf(COA_HOLD_REASON) === 0;
    if (!tied) return { ok: true, skipped: true };
    if (!root.DB || typeof root.DB.releaseRawCoa !== "function") return { ok: false };
    return root.DB.releaseRawCoa({
      itemId: row.item_id || info.itemId || "",
      lot: row.lot || info.lot || "",
      recvId: row.id,
      by: info.by || "",
      note: info.note || "",
      skipHoldWrite: true
    });
  }

  function boot() {
    installHooks();
    var view = document.getElementById("view");
    if (!view || view.__rcObs) { onView(); return; }
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(onView);
      view.__rcObs = obs;
      obs.observe(view, { childList: true, subtree: true });
    }
    view.addEventListener("input", function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === "r-code" || t.id === "r-newcat" || t.id === "r-newcode" || t.id === "r-newname") paintReceive();
    });
    view.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".rc-rel") : null;
      if (!btn) return;
      e.preventDefault();
      releaseFrom(btn);
    });
    onView();
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById("rc-style")) return;
    var css = document.createElement("style");
    css.id = "rc-style";
    css.textContent = [
      ".rc-field{flex:1;min-width:200px}",
      ".rc-field select,.rc-field input{min-height:46px;font-size:17px}",
      ".rc-hint{margin:4px 0 0}",
      ".rc-log{font-size:12px;font-weight:700;margin-top:2px}",
      ".rc-hold{color:#b42318}",
      ".rc-floor{margin:6px 0 4px;padding:6px 8px;border-radius:8px;background:#fde8e8}",
      ".rc-floor.rc-clear{background:#f6f8fb}",
      ".rc-line{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}",
      ".rc-meta{flex:1;min-width:160px;font-size:14px}",
      ".rc-who{min-height:36px;max-width:180px}"
    ].join("");
    document.head.appendChild(css);
  }

  var api = {
    isCoaItem: isCoaItem,
    isHighRisk: isHighRisk,
    isMaltodextrin: isMaltodextrin,
    isOilOrStevia: isOilOrStevia,
    normAnswer: normAnswer,
    shouldHold: shouldHold,
    holdLocation: holdLocation,
    releaseRecord: releaseRecord,
    summaryText: summaryText,
    resolveCoa: resolveCoa,
    linesFor: linesFor,
    afterHoldLogReleased: afterHoldLogReleased,
    COA_HOLD_REASON: COA_HOLD_REASON,
    OPS: OPS
  };

  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.RAW_COA = api;
  if (root.document) {
    ensureStyle();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})(typeof window !== "undefined" ? window : globalThis);

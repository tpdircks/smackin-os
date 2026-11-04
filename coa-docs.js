/* ============================================================================
   Smackin' OS - COA file store (coa-docs.js)
   PDFs and photos of certificates of analysis. Files go in the existing
   public bucket "supplier-pos" with a coa_ prefix (same idea as svc_).
   Metadata lives in coa_docs and points at a lot, item, vendor, and
   receiving_log row when those are known.

   Yes / No / N/A and the QA Hold rules stay in raw-coa.js. A file on a blank
   answer selects Yes. A file on No leaves No, so Quality can open it and
   release the hold later. A missing coa_docs table does not block the receipt.
   This is an ops file store, not an SQF controlled-document register.
   Troy runs coa_docs_table.sql once in the Supabase SQL editor.
   ========================================================================== */
(function (root) {
  "use strict";

  var BUCKET = "supplier-pos";
  var LS = "smk-coa-docs-v1";
  var MAX_BYTES = 25 * 1024 * 1024;
  var ACCEPT = { pdf: 1, png: 1, jpg: 1, jpeg: 1 };

  function extOf(name) {
    var m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  }
  function contentTypeFor(name, fallback) {
    var ext = extOf(name);
    if (ext === "pdf") return "application/pdf";
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    return fallback || "";
  }
  function fileOk(file) {
    if (!file) return false;
    var ext = extOf(file.name);
    if (!ACCEPT[ext]) return false;
    if (file.size != null && Number(file.size) > MAX_BYTES) return false;
    var type = String(file.type || "").toLowerCase();
    if (!type) return true;
    if (ext === "pdf") return type === "application/pdf" || type === "application/x-pdf";
    if (ext === "png") return type === "image/png";
    return type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg";
  }
  function fileTooBig(file) {
    return !!(file && file.size != null && Number(file.size) > MAX_BYTES);
  }
  function storagePath(name, stamp) {
    var base = String(name || "coa").replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
    if (!base || base === "_" ) base = "coa";
    return "coa_" + stamp + "_" + base;
  }
  function normAnswer(v) {
    var s = String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z]/g, "");
    if (s === "y" || s === "yes") return "yes";
    if (s === "n" || s === "no") return "no";
    if (s === "na" || s === "notapplicable") return "na";
    return "";
  }
  // A file confirms Yes when the dock has not already answered.
  // No and N/A stay put so a late email COA does not clear a QA Hold.
  function answerAfterFile(current) {
    var s = normAnswer(current);
    if (!s) return "yes";
    return s;
  }
  function normLot(lot) {
    return String(lot == null ? "" : lot).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function missingTable(error) {
    var msg = String((error && (error.message || error.details || error.code || error.hint)) || error || "");
    return /coa_docs|PGRST205|42P01/i.test(msg);
  }
  function docsFor(rows, q) {
    q = q || {};
    var lot = normLot(q.lot);
    var recv = String(q.recvId || "");
    var item = String(q.itemId || "");
    var out = [];
    var seen = {};
    (rows || []).forEach(function (r) {
      if (!r) return;
      var id = String(r.id || r.file_path || "");
      var byRecv = !!(recv && String(r.receiving_log_id || "") === recv);
      var byLot = !!(lot && normLot(r.lot) === lot);
      if (!byRecv && !byLot) return;
      // A file tied to one receipt or one item does not show on the other
      // item that happens to share the trailer lot.
      if (!byRecv && item && r.item_id && String(r.item_id) !== item) return;
      if (!byRecv && recv && r.receiving_log_id && String(r.receiving_log_id) !== recv) return;
      if (id && seen[id]) return;
      if (id) seen[id] = 1;
      out.push(r);
    });
    return out;
  }
  function releasePreview(rows, q) {
    var hits = docsFor(rows, q);
    return {
      count: hits.length,
      missing: hits.length === 0,
      names: hits.map(function (r) { return r.file_name || "COA"; }),
      urls: hits.map(function (r) { return r.file_url || ""; })
    };
  }
  function releaseMessage(preview, ask, labels) {
    labels = labels || {};
    var missing = labels.missing || "No COA file is attached for this lot.";
    var onFile = labels.onFile || "COA on file:";
    var head = !preview || preview.missing ? missing : (onFile + " " + (preview.names || []).join(", "));
    return ask ? (head + "\n\n" + ask) : head;
  }
  function receiveSaved(before, after) {
    if (!before || !(parseFloat(before.qty) > 0)) return false;
    if (!after || !after.onReceive) return true;
    if (after.coaCleared && !(parseFloat(after.qty) > 0)) return true;
    return false;
  }
  function logSaved(before, after) {
    if (!before || !String(before.supplier || "").trim()) return false;
    if (!after || !after.onLog) return true;
    if (after.coaCleared && !String(after.supplier || "").trim()) return true;
    return false;
  }
  function matchCandidate(doc, logs) {
    var lot = normLot(doc && doc.lot);
    if (!lot) return null;
    var item = String((doc && (doc.item_id || doc.itemId)) || "");
    var hits = (logs || []).filter(function (r) { return r && normLot(r.lot) === lot; });
    if (item) {
      hits = hits.filter(function (r) { return String(r.item_id || "") === item; });
    } else {
      var distinct = {};
      hits.forEach(function (r) {
        if (r.item_id) distinct[String(r.item_id)] = 1;
      });
      // Two items on one lot: do not attach the file to whichever row is newest.
      if (Object.keys(distinct).length > 1) return null;
    }
    if (!hits.length) return null;
    hits.sort(function (a, b) {
      var byDate = String(b.recv_date || "").localeCompare(String(a.recv_date || ""));
      if (byDate) return byDate;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return hits[0];
  }
  function linkPatch(doc, log, by, at) {
    if (!doc || !log || !log.id) return null;
    var patch = { receiving_log_id: String(log.id), matched_at: at || new Date().toISOString() };
    if (by) patch.matched_by = String(by).slice(0, 80);
    if (!doc.item_id && log.item_id) patch.item_id = String(log.item_id);
    if (!doc.item_name && log.contents) patch.item_name = String(log.contents);
    if (!doc.vendor && log.supplier) patch.vendor = String(log.supplier);
    if (!doc.lot && log.lot) patch.lot = String(log.lot);
    return patch;
  }
  function pickRecvRow(rows, meta) {
    meta = meta || {};
    if (meta.recvId) {
      var wanted = String(meta.recvId);
      for (var i = 0; i < (rows || []).length; i++) {
        if (rows[i] && String(rows[i].id) === wanted) return rows[i];
      }
      return null;
    }
    var lot = normLot(meta.lot);
    if (!lot) return null;
    var hits = (rows || []).filter(function (r) { return r && normLot(r.lot) === lot; });
    var item = String(meta.itemId || "");
    if (item) {
      hits = hits.filter(function (r) { return String(r.item_id || "") === item; });
    } else {
      var distinct = {};
      hits.forEach(function (r) {
        if (r.item_id) distinct[String(r.item_id)] = 1;
      });
      if (Object.keys(distinct).length > 1) return null;
    }
    if (meta.vendor) {
      var vendor = String(meta.vendor).toLowerCase();
      var same = hits.filter(function (r) { return String(r.supplier || "").toLowerCase() === vendor; });
      if (same.length) hits = same;
    }
    if (!hits.length) return null;
    hits.sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
    return hits[0];
  }
  function docVisibleForItem(doc, item, lots) {
    if (!doc) return false;
    var ids = {};
    if (item && item.id) ids[String(item.id)] = 1;
    if (item && item.code) ids[String(item.code)] = 1;
    var tagged = String(doc.item_id || "");
    if (tagged && !ids[tagged]) return false;
    if (tagged && ids[tagged]) return true;
    var want = normLot(doc.lot);
    if (!want) return false;
    for (var n = 0; n < (lots || []).length; n++) {
      if (normLot(lots[n]) === want) return true;
    }
    return false;
  }
  function openCoaHold(rows, q) {
    q = q || {};
    var key = normLot(q.lot);
    var recvId = String(q.recvId || "");
    var itemId = String(q.itemId || "");
    for (var i = 0; i < (rows || []).length; i++) {
      var r = rows[i];
      if (!r) continue;
      if (normAnswer(r.coa_received) !== "no" || r.coa_released_at) continue;
      if (recvId && String(r.id) === recvId) return true;
      if (!(key && normLot(r.lot) === key)) continue;
      if (itemId && r.item_id && String(r.item_id) !== itemId) continue;
      if (recvId) continue;
      return true;
    }
    return false;
  }

  var api = {
    BUCKET: BUCKET,
    extOf: extOf,
    contentTypeFor: contentTypeFor,
    fileOk: fileOk,
    fileTooBig: fileTooBig,
    storagePath: storagePath,
    normAnswer: normAnswer,
    answerAfterFile: answerAfterFile,
    normLot: normLot,
    missingTable: missingTable,
    docsFor: docsFor,
    releasePreview: releasePreview,
    releaseMessage: releaseMessage,
    receiveSaved: receiveSaved,
    logSaved: logSaved,
    matchCandidate: matchCandidate,
    linkPatch: linkPatch,
    pickRecvRow: pickRecvRow,
    docVisibleForItem: docVisibleForItem,
    openCoaHold: openCoaHold,
    MAX_BYTES: MAX_BYTES
  };

  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }

  var cfg = (root && root.SMACKIN_CONFIG) || {};
  var sb = null;
  var docs = null;
  var tableMissing = false;
  var missingTold = false;
  var loading = null;
  var slots = { recv: null, log: null };
  var libOpen = false;
  var libFile = null;
  var libDraft = null;
  var libSkip = false;
  var filt = { vendor: "", lot: "", from: "", to: "", q: "" };
  var painting = false;

  function lang() {
    if (!root.document) return "en";
    var es = root.document.getElementById("lang-es");
    var pt = root.document.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  var TXT = {
    en: {
      nav: "Vendor COAs",
      title: "Vendor COAs",
      hint: "COA PDFs and photos. Upload from email here, or attach one on Receive and the Receiving Log. Match a file to a dock receipt later by lot.",
      attach: "Attach COA",
      attachHint: "PDF or photo. A blank answer becomes Yes. No stays No until Quality releases.",
      attached: "Attached, not saved yet:",
      remove: "Remove",
      savedFile: "COA file saved",
      notSaved: "COA file was not saved. The receipt was kept.",
      needTable: "COA files need the coa_docs table. Troy runs coa_docs_table.sql once in the Supabase SQL editor. The receipt was still saved.",
      badType: "Use a PDF, PNG, or JPG.",
      tooBig: "That file is over 25 MB.",
      needFile: "Choose a PDF or photo first.",
      onFile: "COA on file:",
      missing: "No COA file is attached for this lot.",
      releaseContinue: "Release this QA Hold? COA stays No.",
      open: "Open",
      vendor: "Vendor",
      lot: "Lot",
      item: "Item",
      date: "Date",
      note: "Note (optional)",
      by: "Your name",
      save: "Save COA",
      search: "Search vendor, lot, item, file",
      from: "From",
      to: "To",
      none: "No COA files yet.",
      match: "Match lot",
      matched: "Matched to the dock receipt",
      noMatch: "No receiving row has that lot yet.",
      unmatched: "Not linked to a receipt yet",
      del: "Delete",
      deleteAsk: "Remove this COA file?",
      deleted: "COA file removed",
      loading: "Loading COA files...",
      file: "File",
      actions: "Actions",
      libraryFile: "COA file",
      holdMiss: "No COA file yet",
      waiting: "The file is waiting on Vendor COAs. Open that screen and save it again."
    },
    es: {
      nav: "COA de proveedores",
      title: "COA de proveedores",
      hint: "PDF y fotos de COA. Suba el correo aqui, o adjunte uno en Recibir y en el Registro de recibo. Despues puede unir el archivo al recibo por lote.",
      attach: "Adjuntar COA",
      attachHint: "PDF o foto. Una respuesta en blanco pasa a Si. No sigue en No hasta que Calidad libere.",
      attached: "Adjunto, aun no guardado:",
      remove: "Quitar",
      savedFile: "Archivo COA guardado",
      notSaved: "El archivo COA no se guardo. El recibo se mantuvo.",
      needTable: "Los archivos COA necesitan la tabla coa_docs. Troy ejecuta coa_docs_table.sql una vez en el editor SQL de Supabase. El recibo si se guardo.",
      badType: "Use un PDF, PNG o JPG.",
      tooBig: "El archivo pasa de 25 MB.",
      needFile: "Elija un PDF o una foto primero.",
      onFile: "COA en archivo:",
      missing: "No hay archivo COA para este lote.",
      releaseContinue: "Liberar este QA Hold? COA sigue en No.",
      open: "Abrir",
      vendor: "Proveedor",
      lot: "Lote",
      item: "Item",
      date: "Fecha",
      note: "Nota (opcional)",
      by: "Su nombre",
      save: "Guardar COA",
      search: "Buscar proveedor, lote, item, archivo",
      from: "Desde",
      to: "Hasta",
      none: "Aun no hay archivos COA.",
      match: "Unir lote",
      matched: "Unido al recibo del muelle",
      noMatch: "Ningun recibo tiene ese lote todavia.",
      unmatched: "Aun no esta unido a un recibo",
      del: "Borrar",
      deleteAsk: "Quitar este archivo COA?",
      deleted: "Archivo COA quitado",
      loading: "Cargando archivos COA...",
      file: "Archivo",
      actions: "Acciones",
      libraryFile: "Archivo COA",
      holdMiss: "Aun no hay archivo COA",
      waiting: "El archivo espera en COA de proveedores. Abra esa pantalla y guardelo de nuevo."
    },
    pt: {
      nav: "COA de fornecedores",
      title: "COA de fornecedores",
      hint: "PDFs e fotos de COA. Envie o e-mail aqui, ou anexe um em Receber e no Registro de recebimento. Depois una o arquivo ao recebimento pelo lote.",
      attach: "Anexar COA",
      attachHint: "PDF ou foto. Uma resposta em branco vira Sim. Nao continua Nao ate a Qualidade liberar.",
      attached: "Anexado, ainda nao salvo:",
      remove: "Remover",
      savedFile: "Arquivo COA salvo",
      notSaved: "O arquivo COA nao foi salvo. O recebimento foi mantido.",
      needTable: "Os arquivos COA precisam da tabela coa_docs. Troy executa coa_docs_table.sql uma vez no editor SQL do Supabase. O recebimento foi salvo.",
      badType: "Use um PDF, PNG ou JPG.",
      tooBig: "O arquivo passa de 25 MB.",
      needFile: "Escolha um PDF ou uma foto primeiro.",
      onFile: "COA no arquivo:",
      missing: "Nao ha arquivo COA para este lote.",
      releaseContinue: "Liberar este QA Hold? COA continua Nao.",
      open: "Abrir",
      vendor: "Fornecedor",
      lot: "Lote",
      item: "Item",
      date: "Data",
      note: "Nota (opcional)",
      by: "Seu nome",
      save: "Salvar COA",
      search: "Buscar fornecedor, lote, item, arquivo",
      from: "De",
      to: "Ate",
      none: "Ainda nao ha arquivos COA.",
      match: "Unir lote",
      matched: "Unido ao recebimento",
      noMatch: "Nenhum recebimento tem esse lote ainda.",
      unmatched: "Ainda nao esta unido a um recebimento",
      del: "Excluir",
      deleteAsk: "Remover este arquivo COA?",
      deleted: "Arquivo COA removido",
      loading: "Carregando arquivos COA...",
      file: "Arquivo",
      actions: "Acoes",
      libraryFile: "Arquivo COA",
      holdMiss: "Ainda nao ha arquivo COA",
      waiting: "O arquivo esta em COA de fornecedores. Abra essa tela e salve de novo."
    }
  };
  function tx(k) {
    var d = TXT[lang()] || TXT.en;
    return d[k] != null ? d[k] : (TXT.en[k] != null ? TXT.en[k] : k);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return root.document ? root.document.getElementById(id) : null; }
  function val(id) {
    var el = $(id);
    return el ? String(el.value || "").trim() : "";
  }
  function toast(msg) {
    if (root.UI && root.UI.toast) { root.UI.toast(msg); return; }
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function cloudOn() {
    return !!(root.DB && root.DB.mode === "cloud" && root.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }
  function client() {
    if (!sb && cloudOn()) {
      try { sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); }
      catch (e) { sb = null; }
    }
    return sb;
  }
  function lsGet() {
    try { var v = root.localStorage.getItem(LS); return v ? JSON.parse(v) : []; }
    catch (e) { return []; }
  }
  function lsSet(a) {
    try { root.localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {}
  }
  function docRows() { return docs || []; }
  function noteMissing() {
    if (missingTold) return;
    missingTold = true;
    toast(tx("needTable"));
  }
  function load() {
    if (docs) return Promise.resolve(docs);
    if (loading) return loading;
    if (!cloudOn()) {
      docs = lsGet();
      return Promise.resolve(docs);
    }
    var c = client();
    if (!c) {
      docs = [];
      return Promise.resolve(docs);
    }
    loading = c.from("coa_docs").select("*").order("created_at", { ascending: false }).limit(2000).then(function (r) {
      loading = null;
      if (r && r.error) {
        if (missingTable(r.error)) {
          tableMissing = true;
          docs = [];
          return docs;
        }
        docs = [];
        throw new Error(r.error.message || "coa_docs");
      }
      tableMissing = false;
      docs = (r && r.data) || [];
      return docs;
    }).catch(function (e) {
      loading = null;
      if (missingTable(e)) {
        tableMissing = true;
        docs = [];
        return docs;
      }
      docs = [];
      throw e;
    });
    return loading;
  }
  function itemByCode(code) {
    if (!code || !root.DB) return null;
    if (typeof root.DB.itemByCode === "function") {
      var hit = root.DB.itemByCode(code);
      if (hit) return hit;
    }
    var list = root.DB.items ? root.DB.items() : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === code || list[i].code === code) return list[i];
    }
    return null;
  }
  function logs() {
    return (root.DB && root.DB.receivingLog) ? root.DB.receivingLog() : [];
  }
  function findRecvId(meta) {
    meta = Object.assign({}, meta || {});
    if (!meta.recvId && root.__smkLastRecvId) {
      var lastItem = String(root.__smkLastRecvItem || "");
      var item = String(meta.itemId || "");
      if (!item || !lastItem || item === lastItem) meta.recvId = String(root.__smkLastRecvId);
    }
    if (meta.recvId) {
      var pinned = pickRecvRow(logs(), { recvId: meta.recvId });
      if (pinned && pinned.item_id && meta.itemId && String(pinned.item_id) !== String(meta.itemId)) return "";
      return String(meta.recvId);
    }
    var hit = pickRecvRow(logs(), meta);
    return hit && hit.id ? String(hit.id) : "";
  }
  function lotHasOpenCoaHold(lot, recvId, itemId) {
    return openCoaHold(logs(), { lot: lot, recvId: recvId || "", itemId: itemId || "" });
  }
  function operator() {
    return val("op") || val("rl-by") || "Adriana";
  }
  function maybeYes(id) {
    var el = $(id);
    if (!el) return;
    if (el.getAttribute("data-rc-on") === "0") return;
    if (answerAfterFile(el.value) === "yes" && normAnswer(el.value) !== "yes") el.value = "yes";
  }
  function rejectFile(file) {
    if (fileTooBig(file)) { toast(tx("tooBig")); return true; }
    if (!fileOk(file)) { toast(tx("badType")); return true; }
    return false;
  }
  async function uploadFile(file, meta) {
    meta = meta || {};
    if (rejectFile(file)) return { ok: false, kept: true };
    var row = {
      doc_date: meta.docDate || todayISO(),
      vendor: String(meta.vendor || "").trim(),
      lot: String(meta.lot || "").trim(),
      item_id: String(meta.itemId || "").trim(),
      item_name: String(meta.itemName || "").trim(),
      receiving_log_id: meta.recvId ? String(meta.recvId) : null,
      uploaded_by: String(meta.by || "").trim().slice(0, 80),
      note: String(meta.note || "").trim().slice(0, 160),
      file_name: file.name || "coa",
      content_type: contentTypeFor(file.name, file.type || "")
    };
    if (!cloudOn()) {
      var all = lsGet();
      row.id = "coa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
      row.created_at = new Date().toISOString();
      row.file_path = storagePath(file.name, Date.now());
      try { row.file_url = root.URL.createObjectURL(file); } catch (e) { row.file_url = ""; }
      all.unshift(row);
      lsSet(all);
      docs = all;
      return { ok: true, id: row.id, local: true };
    }
    var c = client();
    if (!c) return { ok: false, msg: tx("notSaved"), kept: true };
    var path = storagePath(file.name, Date.now());
    var up;
    try {
      up = await c.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: row.content_type || undefined });
    } catch (e) {
      return { ok: false, msg: String(e && e.message || e), kept: true };
    }
    if (up && up.error) return { ok: false, msg: up.error.message || tx("notSaved"), kept: true };
    var pub = c.storage.from(BUCKET).getPublicUrl(path);
    row.file_path = path;
    row.file_url = (pub && pub.data && pub.data.publicUrl) || "";
    var ins;
    try { ins = await c.from("coa_docs").insert(row).select("id"); }
    catch (e) {
      try { await c.storage.from(BUCKET).remove([path]); } catch (x) {}
      if (missingTable(e)) return { ok: false, missing: true, msg: tx("needTable"), kept: true };
      return { ok: false, msg: String(e && e.message || e), kept: true };
    }
    if (ins && ins.error) {
      try { await c.storage.from(BUCKET).remove([path]); } catch (x) {}
      if (missingTable(ins.error)) return { ok: false, missing: true, msg: tx("needTable"), kept: true };
      return { ok: false, msg: ins.error.message || tx("notSaved"), kept: true };
    }
    var id = ins && ins.data && ins.data[0] && ins.data[0].id;
    if (!id) {
      try { await c.storage.from(BUCKET).remove([path]); } catch (x) {}
      return { ok: false, msg: tx("notSaved"), kept: true };
    }
    docs = null;
    try { await load(); } catch (e) { docs = docs || []; }
    return { ok: true, id: id };
  }
  function holdForLibrary(file, meta) {
    meta = meta || {};
    libFile = file;
    libDraft = {
      doc_date: meta.docDate || todayISO(),
      vendor: meta.vendor || "",
      lot: meta.lot || "",
      item_id: meta.itemId || "",
      note: meta.note || "",
      uploaded_by: meta.by || ""
    };
  }
  function finishUpload(res, slot, file, meta, saved) {
    if (res && res.ok) {
      if (slot && slots[slot] === file) slots[slot] = null;
      toast(tx("savedFile"));
      paint();
      return;
    }
    if (saved) {
      if (slot && slots[slot] === file) slots[slot] = null;
      if (file) holdForLibrary(file, meta);
    }
    if (res && res.missing) noteMissing();
    else toast(((res && res.msg) || tx("notSaved")) + (saved ? " " + tx("waiting") : ""));
    paint();
  }
  function allowRelease(q) {
    q = q || {};
    if (!docs) {
      var pendingAsk = q.ask || tx("releaseContinue");
      if (typeof root.confirm !== "function") return true;
      return root.confirm(tx("loading") + "\n\n" + pendingAsk);
    }
    var preview = releasePreview(docRows(), q);
    if (q.warnOnlyIfMissing && !preview.missing) return true;
    var ask = q.ask || tx("releaseContinue");
    var msg = releaseMessage(preview, ask, { missing: tx("missing"), onFile: tx("onFile") });
    if (typeof root.confirm !== "function") return true;
    return root.confirm(msg);
  }

  function linkHtml(list) {
    if (!list || !list.length) return "";
    return '<div class="cd-links">' + list.map(function (d) {
      var name = d.file_name || "COA";
      if (!d.file_url) return '<span class="cd-name">' + esc(name) + "</span>";
      return '<a href="' + esc(d.file_url) + '" target="_blank" rel="noopener">' + esc(tx("open")) + " " + esc(name) + "</a>";
    }).join(" ") + "</div>";
  }
  function warnHtml(lot, recvId, list, itemId) {
    if (list && list.length) return "";
    if (!lotHasOpenCoaHold(lot, recvId, itemId)) return "";
    return '<span class="cd-miss">' + esc(tx("holdMiss")) + "</span>";
  }
  function pickHtml(attrs) {
    return '<label class="cd-pick">' + esc(tx("attach")) +
      '<input type="file" accept=".pdf,.png,.jpg,.jpeg" ' + attrs + "></label>";
  }
  function setBox(box, html, sig) {
    if (!box) return;
    if (box.getAttribute("data-sig") === sig) return;
    var active = root.document.activeElement;
    var focusedFile = !!(active && active.type === "file" && box.contains(active));
    if (focusedFile) {
      var next = root.document.createElement("div");
      next.innerHTML = html;
      ["cd-links", "cd-pend", "cd-miss", "cd-hint"].forEach(function (cls) {
        var cur = box.querySelector("." + cls);
        var neu = next.querySelector("." + cls);
        if (cur && neu) { if (cur.innerHTML !== neu.innerHTML) cur.innerHTML = neu.innerHTML; }
        else if (!cur && neu) box.appendChild(neu);
        else if (cur && !neu) cur.remove();
      });
      box.setAttribute("data-sig", sig);
      return;
    }
    box.setAttribute("data-sig", sig);
    box.innerHTML = html;
  }
  function readRecvMeta() {
    var code = val("r-newcode") || val("r-code");
    var it = itemByCode(code);
    return {
      lot: val("r-lot"),
      vendor: val("r-sup") || (it && it.supplier) || "",
      itemId: (it && (it.id || it.code)) || code,
      itemName: (it && it.name) || val("r-newname"),
      by: operator(),
      note: val("r-coa-note"),
      recvId: ""
    };
  }
  function readLogMeta() {
    var el = $("rl-coa");
    return {
      lot: val("rl-lot"),
      vendor: val("rl-supplier"),
      itemId: (el && el.getAttribute("data-item-id")) || val("rsop-item") || "",
      itemName: val("rl-contents"),
      recvId: (el && el.getAttribute("data-recv-id")) || "",
      by: operator(),
      note: val("rl-coa-note")
    };
  }
  function paintField(selectId, slot) {
    var sel = $(selectId);
    if (!sel) return;
    var field = sel.closest ? sel.closest(".rc-field") : null;
    if (!field) return;
    var show = sel.getAttribute("data-rc-on") !== "0" && field.style.display !== "none";
    var box = field.querySelector(".cd-attach");
    if (!show) {
      if (box) box.hidden = true;
      return;
    }
    if (!box) {
      box = root.document.createElement("div");
      box.className = "cd-attach";
      field.appendChild(box);
    }
    box.hidden = false;
    var meta = slot === "recv" ? readRecvMeta() : readLogMeta();
    var list = docsFor(docRows(), meta);
    var file = slots[slot];
    var sig = [lang(), file ? file.name + ":" + file.size : "", list.map(function (d) { return d.id || d.file_path; }).join(",")].join("|");
    var pend = file ? '<p class="cd-pend">' + esc(tx("attached")) + " <b>" + esc(file.name) + '</b> <button type="button" class="ghost sm cd-clear" data-cd-clear="' + slot + '">' + esc(tx("remove")) + "</button></p>" : "";
    var html = pickHtml('data-cd-pick="' + slot + '"') + pend + linkHtml(list) + warnHtml(meta.lot, meta.recvId, list, meta.itemId) +
      '<p class="hint cd-hint">' + esc(tx("attachHint")) + "</p>";
    setBox(box, html, sig);
  }
  function paintLogRows() {
    var body = $("rlBody");
    if (!body) return;
    Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr) {
      var cells = tr.cells;
      if (!cells || cells.length < 7) return;
      var lot = tr.getAttribute("data-lot") || cells[6].textContent || "";
      var supplier = cells[1] ? cells[1].textContent || "" : "";
      var itemId = tr.getAttribute("data-item") || "";
      var recvId = tr.getAttribute("data-recv") || "";
      var itemName = cells[5] ? String(cells[5].textContent || "").trim() : "";
      var list = docsFor(docRows(), { lot: lot, itemId: itemId, recvId: recvId });
      var open = lotHasOpenCoaHold(lot, recvId, itemId);
      var coaLine = tr.querySelector(".rc-log");
      if (!list.length && !open && !coaLine) {
        var gone = cells[6].querySelector(".cd-row");
        if (gone) gone.remove();
        return;
      }
      var box = cells[6].querySelector(".cd-row");
      if (!box) {
        box = root.document.createElement("div");
        box.className = "cd-row";
        cells[6].appendChild(box);
      }
      var sig = [lang(), normLot(lot), list.map(function (d) { return d.id || d.file_name; }).join(","), open ? "1" : "0"].join("|");
      var html = linkHtml(list) + warnHtml(lot, recvId, list, itemId) +
        pickHtml('data-cd-now="1" data-lot="' + esc(lot) + '" data-item="' + esc(itemId) + '" data-recv="' + esc(recvId) + '" data-name="' + esc(itemName) + '" data-vendor="' + esc(String(supplier).trim()) + '"');
      setBox(box, html, sig);
    });
  }
  function lotsForItem(it) {
    var out = [];
    var seen = {};
    if (!it || !root.DB || !root.DB.stock) return out;
    root.DB.stock().forEach(function (s) {
      if (!s || (s.item_id !== it.id && s.item_id !== it.code)) return;
      if (!(Math.abs(Number(s.qty) || 0) > 0.0001)) return;
      var key = normLot(s.lot);
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(s.lot);
    });
    return out;
  }
  function paintHost(host, it) {
    if (!host) return;
    var coaItem = !!(it && root.RAW_COA && root.RAW_COA.isCoaItem && root.RAW_COA.isCoaItem(it));
    var lots = lotsForItem(it);
    var itemId = it ? (it.id || it.code || "") : "";
    var list = docRows().filter(function (d) { return docVisibleForItem(d, it, lots); });
    if (!coaItem && !list.length) {
      var old = host.querySelector(":scope > .cd-floor");
      if (!old) old = host.querySelector(".cd-floor");
      if (old && host.contains(old)) old.remove();
      return;
    }
    var showLots = lots.slice();
    list.forEach(function (d) {
      if (d.lot && !showLots.some(function (lot) { return normLot(lot) === normLot(d.lot); })) showLots.push(d.lot);
    });
    if (!showLots.length && list.length) showLots.push("");
    var box = host.querySelector(".cd-floor");
    if (!box) {
      box = root.document.createElement("div");
      box.className = "cd-floor";
      var anchor = host.querySelector(".rc-floor") || host.querySelector(".rx-exp") || host.querySelector(".ivx-locs");
      if (anchor && anchor.parentNode === host) host.insertBefore(box, anchor.nextSibling);
      else host.appendChild(box);
    }
    var sig = [lang(), itemId, showLots.map(normLot).join(","), list.map(function (d) { return d.id || d.file_name; }).join(",")].join("|");
    var html = showLots.map(function (lot) {
      var mine = lot ? docsFor(list, { lot: lot }) : list.filter(function (d) { return !normLot(d.lot); });
      var label = lot ? esc(lot) : "";
      return '<div class="cd-lotline">' + (label ? "<b>" + label + "</b> " : "") + linkHtml(mine) + warnHtml(lot, "", mine) +
        pickHtml('data-cd-now="1" data-lot="' + esc(lot) + '" data-item="' + esc(itemId) + '" data-vendor="' + esc((it && it.supplier) || "") + '" data-name="' + esc((it && it.name) || "") + '"') + "</div>";
    }).join("");
    setBox(box, html, sig);
  }
  function paintFloor() {
    if (!root.DB || !root.DB.items) return;
    var items = root.DB.items();
    function byCode(code) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].code === code || items[i].id === code) return items[i];
      }
      return null;
    }
    Array.prototype.forEach.call(root.document.querySelectorAll(".ivx-row"), function (row) {
      var codeEl = row.querySelector(".ivx-code");
      if (!codeEl) return;
      paintHost(row, byCode(String(codeEl.textContent || "").trim()));
    });
    var dash = $("dashBody");
    if (!dash) return;
    Array.prototype.forEach.call(dash.querySelectorAll("tr"), function (tr) {
      var muted = tr.querySelectorAll(".muted");
      for (var m = 0; m < muted.length; m++) {
        var it = byCode(String(muted[m].textContent || "").trim());
        if (!it) continue;
        if (!(root.RAW_COA && root.RAW_COA.isCoaItem && root.RAW_COA.isCoaItem(it))) {
          var any = docRows().some(function (d) { return d && (d.item_id === it.id || d.item_id === it.code); });
          if (!any) continue;
        }
        paintHost(muted[m].parentNode, it);
        break;
      }
    });
  }
  function paintTrace() {
    var buttons = root.document.querySelectorAll("button[onclick*='TRACE.qa']");
    Array.prototype.forEach.call(buttons, function (btn) {
      var tr = btn.closest ? btn.closest("tr") : null;
      if (!tr || !tr.cells || tr.cells.length < 3) return;
      var b = tr.cells[2].querySelector("b");
      var lot = b ? b.textContent : "";
      var list = docsFor(docRows(), { lot: lot });
      var open = lotHasOpenCoaHold(lot);
      var cell = tr.cells[2];
      if (!list.length && !open) {
        var gone = cell.querySelector(".cd-trace");
        if (gone) gone.remove();
        return;
      }
      var box = cell.querySelector(".cd-trace");
      if (!box) {
        box = root.document.createElement("div");
        box.className = "cd-trace";
        cell.appendChild(box);
      }
      var sig = [lang(), normLot(lot), list.map(function (d) { return d.id || d.file_name; }).join(",")].join("|");
      if (box.getAttribute("data-sig") === sig) return;
      box.setAttribute("data-sig", sig);
      box.innerHTML = linkHtml(list) + warnHtml(lot, "", list);
    });
  }
  function paintHolds() {
    var box = $("rsop-holdbox");
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll("tbody tr"), function (tr) {
      if (!tr.cells || tr.cells.length < 6) return;
      var reason = tr.cells[5].textContent || "";
      if (reason.indexOf("COA not received") < 0) return;
      var lot = (tr.cells[3].textContent || "").trim();
      var list = docsFor(docRows(), { lot: lot });
      var host = tr.cells[5];
      var el = host.querySelector(".cd-hold");
      if (!el) {
        el = root.document.createElement("div");
        el.className = "cd-hold";
        host.appendChild(el);
      }
      var sig = [lang(), normLot(lot), list.map(function (d) { return d.id || d.file_name; }).join(",")].join("|");
      if (el.getAttribute("data-sig") === sig) return;
      el.setAttribute("data-sig", sig);
      el.innerHTML = linkHtml(list) + (list.length ? "" : '<span class="cd-miss">' + esc(tx("missing")) + "</span>");
    });
  }
  function paint() {
    if (!root.document || libOpen) return;
    paintField("r-coa", "recv");
    paintField("rl-coa", "log");
    paintLogRows();
    paintFloor();
    paintTrace();
    paintHolds();
    var navBtn = $("coa-nav");
    if (navBtn) {
      var span = navBtn.querySelector("span");
      if (span && span.textContent !== tx("nav")) span.textContent = tx("nav");
    }
  }
  function onView() {
    if (painting) return;
    painting = true;
    try {
      armUi();
      armTrace();
      injectNav();
      if (libOpen) {
        var host = $("view");
        if (host && !host.querySelector("#cd-lot") && host.getAttribute("data-cd") !== "1") renderLib();
        return;
      }
      paint();
    } catch (e) { try { console.warn("coa-docs", e); } catch (x) {} }
    finally { painting = false; }
  }

  function arm(name, after) {
    var ui = root.UI;
    if (!ui || typeof ui[name] !== "function" || ui[name].__cd) return;
    var orig = ui[name];
    var wrapped = async function () {
      var slot = name === "receive" ? "recv" : "log";
      var file = slots[slot];
      if (file) maybeYes(slot === "recv" ? "r-coa" : "rl-coa");
      var meta = slot === "recv" ? readRecvMeta() : readLogMeta();
      meta.before = slot === "recv"
        ? { qty: val("r-qty"), lot: val("r-lot") }
        : { supplier: val("rl-supplier"), lot: val("rl-lot") };
      var threw = false;
      try { return await orig.apply(ui, arguments); }
      catch (e) { threw = true; throw e; }
      finally {
        if (!threw && file) {
          try { await after(meta, file); }
          catch (err) { toast(String(err && err.message || err)); }
        }
      }
    };
    wrapped.__cd = true;
    ui[name] = wrapped;
  }
  async function afterReceive(meta, file) {
    var after = {
      onReceive: !!$("r-qty"),
      qty: val("r-qty"),
      coaCleared: !root.__smkRecvCoa
    };
    if (!receiveSaved(meta.before, after)) return;
    meta.recvId = findRecvId(meta);
    var res = await uploadFile(file, meta);
    finishUpload(res, "recv", file, meta, true);
  }
  async function afterLog(meta, file) {
    var after = {
      onLog: !!$("rl-supplier"),
      supplier: val("rl-supplier"),
      coaCleared: !root.__smkLogCoa
    };
    if (!logSaved(meta.before, after)) return;
    meta.recvId = findRecvId(meta);
    var res = await uploadFile(file, meta);
    finishUpload(res, "log", file, meta, true);
  }
  function armUi() {
    arm("receive", afterReceive);
    arm("rlSave", afterLog);
  }
  function lotFromTraceButton(lpn) {
    var nodes = root.document.querySelectorAll("button[onclick*='TRACE.qa']");
    for (var i = 0; i < nodes.length; i++) {
      var oc = nodes[i].getAttribute("onclick") || "";
      if (oc.indexOf(String(lpn)) < 0) continue;
      var tr = nodes[i].closest ? nodes[i].closest("tr") : null;
      var b = tr && tr.cells && tr.cells[2] ? tr.cells[2].querySelector("b") : null;
      return b ? b.textContent : "";
    }
    return "";
  }
  function armTrace() {
    if (!root.TRACE || typeof root.TRACE.qa !== "function" || root.TRACE.qa.__cd) return;
    var orig = root.TRACE.qa;
    var wrapped = function (lpn, status) {
      if (status === "RELEASED") {
        var lot = lotFromTraceButton(lpn);
        if (lotHasOpenCoaHold(lot) && !allowRelease({ lot: lot, warnOnlyIfMissing: true, ask: tx("releaseContinue") })) return;
      }
      return orig.apply(root.TRACE, arguments);
    };
    wrapped.__cd = true;
    root.TRACE.qa = wrapped;
  }

  function ensureStyle() {
    if ($("cd-style")) return;
    var css = root.document.createElement("style");
    css.id = "cd-style";
    css.textContent = [
      ".cd-attach,.cd-row,.cd-floor,.cd-trace,.cd-hold{margin-top:6px}",
      ".cd-pick{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;border:1px solid #c5d0e0;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;position:relative}",
      ".cd-pick input{position:absolute;inset:0;opacity:0;cursor:pointer}",
      ".cd-links{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0}",
      ".cd-links a{font-weight:700}",
      ".cd-miss{color:#b42318;font-weight:700}",
      ".cd-pend{margin:4px 0}",
      ".cd-hint{margin:4px 0 0}",
      ".cd-lotline{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0}",
      ".cd-floor{padding:6px 8px;border-radius:8px;background:#f4f7fb}",
      ".cd-lib table{width:100%}",
      ".cd-unmatched{color:#9a6700;font-weight:700}"
    ].join("");
    root.document.head.appendChild(css);
  }
  function injectNav() {
    var nav = $("nav");
    if (!nav || $("coa-nav")) return;
    var anchor = null;
    var items = nav.querySelectorAll("[onclick]");
    for (var i = 0; i < items.length; i++) {
      var oc = items[i].getAttribute("onclick") || "";
      if (oc.indexOf("'quality'") >= 0 || oc.indexOf("'compliance'") >= 0) { anchor = items[i]; break; }
    }
    var btn = root.document.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "coa-nav";
    btn.setAttribute("onclick", "COA_DOCS.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="file-check"></i><span>' + esc(tx("nav")) + "</span>";
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else nav.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
  }
  function markNav() {
    try {
      var nav = $("nav");
      if (!nav) return;
      nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); });
      var mine = $("coa-nav");
      if (mine) mine.classList.add("active");
    } catch (e) {}
  }
  function captureLib() {
    if (!$("cd-lot")) return;
    libDraft = {
      doc_date: val("cd-date"),
      vendor: val("cd-vendor"),
      lot: val("cd-lot"),
      item_id: val("cd-item"),
      note: val("cd-note"),
      uploaded_by: val("cd-by")
    };
  }
  function itemOptions() {
    var list = (root.DB && root.DB.items) ? root.DB.items() : [];
    return list.filter(function (it) {
      return root.RAW_COA && root.RAW_COA.isCoaItem ? root.RAW_COA.isCoaItem(it) : true;
    }).map(function (it) {
      return '<option value="' + esc(it.code || it.id) + '">' + esc(it.name || "") + "</option>";
    }).join("");
  }
  function vendorOptions() {
    var seen = {};
    var html = "";
    function add(v) {
      v = String(v || "").trim();
      if (!v || seen[v.toLowerCase()]) return;
      seen[v.toLowerCase()] = 1;
      html += '<option value="' + esc(v) + '"></option>';
    }
    docRows().forEach(function (d) { add(d.vendor); });
    logs().forEach(function (r) { add(r.supplier); });
    if (root.DB && root.DB.items) root.DB.items().forEach(function (it) { add(it.supplier); });
    return html;
  }
  function filtered() {
    var q = filt.q.toLowerCase();
    return docRows().filter(function (d) {
      var day = String(d.doc_date || d.created_at || "").slice(0, 10);
      if (filt.from && day && day < filt.from) return false;
      if (filt.to && day && day > filt.to) return false;
      if (filt.vendor && String(d.vendor || "").toLowerCase().indexOf(filt.vendor.toLowerCase()) < 0) return false;
      if (filt.lot && normLot(d.lot).indexOf(normLot(filt.lot)) < 0) return false;
      if (!q) return true;
      var blob = [d.vendor, d.lot, d.item_id, d.item_name, d.file_name, d.note, d.uploaded_by].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }
  function renderLib() {
    ensureStyle();
    var host = $("view");
    if (!host) return;
    if (!libSkip) captureLib();
    libSkip = false;
    if (!docs) {
      host.innerHTML = '<div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"muted\">" + esc(tx("loading")) + "</p></div>";
      host.setAttribute("data-cd", "1");
      load().then(function () { if (libOpen) renderLib(); }).catch(function (e) {
        host.innerHTML = '<div class="card"><h2>' + esc(tx("title")) + '</h2><p class="muted">' + esc(e && e.message || e) + "</p></div>";
      });
      return;
    }
    if (tableMissing) noteMissing();
    var src = libDraft || {};
    var av = function (x) { return esc(x == null ? "" : x); };
    var form = '<div class="ordform">' +
      '<div class="spodrop"><input type="file" id="cd-file" accept=".pdf,.png,.jpg,.jpeg" style="display:none" onchange="COA_DOCS.file(this)">' +
      '<label for="cd-file" class="spodroplabel">&#128196; ' + esc(tx("libraryFile")) + "</label></div>" +
      (libFile ? '<p class="hint" id="cd-file-name">&#128206; ' + esc(libFile.name) + ' <button type="button" class="ghost sm" onclick="COA_DOCS.clearFile()">' + esc(tx("remove")) + "</button></p>" : '<p class="hint" id="cd-file-name"></p>') +
      '<div class="row"><div><label>' + esc(tx("date")) + '</label><input id="cd-date" type="date" value="' + esc(src.doc_date || todayISO()) + '"></div>' +
      '<div><label>' + esc(tx("vendor")) + '</label><input id="cd-vendor" list="cd-vendors" autocomplete="off" value="' + av(src.vendor) + '"></div>' +
      '<div><label>' + esc(tx("lot")) + '</label><input id="cd-lot" autocomplete="off" value="' + av(src.lot) + '"></div></div>' +
      '<div class="row"><div><label>' + esc(tx("item")) + '</label><input id="cd-item" list="cd-items" autocomplete="off" value="' + av(src.item_id) + '"></div>' +
      '<div><label>' + esc(tx("by")) + '</label><input id="cd-by" autocomplete="name" value="' + av(src.uploaded_by || operator()) + '"></div></div>' +
      '<div><label>' + esc(tx("note")) + '</label><input id="cd-note" maxlength="160" autocomplete="off" value="' + av(src.note) + '"></div>' +
      '<button class="primary" type="button" onclick="COA_DOCS.save()">' + esc(tx("save")) + "</button></div>" +
      '<datalist id="cd-vendors">' + vendorOptions() + '</datalist><datalist id="cd-items">' + itemOptions() + "</datalist>";
    var list = filtered();
    var rows = list.map(function (d) {
      var day = esc(String(d.doc_date || d.created_at || "").slice(0, 10));
      var file = d.file_url ? '<a href="' + esc(d.file_url) + '" target="_blank" rel="noopener">' + esc(d.file_name || tx("open")) + "</a>" : esc(d.file_name || "");
      var link = d.receiving_log_id
        ? esc(tx("matched"))
        : '<span class="cd-unmatched">' + esc(tx("unmatched")) + "</span>";
      var canMatch = !d.receiving_log_id && matchCandidate(d, logs());
      return "<tr><td>" + day + "</td><td>" + esc(d.vendor || "") + "</td><td><b>" + esc(d.lot || "") + "</b></td><td>" +
        esc(d.item_name || d.item_id || "") + "</td><td>" + file + "</td><td>" + esc(d.note || "") + "</td><td>" + link + "</td><td>" +
        (canMatch ? '<button type="button" class="ghost sm" onclick="COA_DOCS.match(\'' + esc(d.id) + '\')">' + esc(tx("match")) + "</button> " : "") +
        '<button type="button" class="ghost sm danger" onclick="COA_DOCS.del(\'' + esc(d.id) + '\')">' + esc(tx("del")) + "</button></td></tr>";
    }).join("");
    var table = list.length
      ? "<table><thead><tr><th>" + esc(tx("date")) + "</th><th>" + esc(tx("vendor")) + "</th><th>" + esc(tx("lot")) + "</th><th>" + esc(tx("item")) + "</th><th>" + esc(tx("file")) + "</th><th>" + esc(tx("note")) + "</th><th></th><th>" + esc(tx("actions")) + "</th></tr></thead><tbody>" + rows + "</tbody></table>"
      : '<p class="muted">' + esc(tx("none")) + "</p>";
    var banner = tableMissing ? '<p class="cd-miss">' + esc(tx("needTable")) + "</p>" : "";
    host.innerHTML = '<div class="card cd-lib"><h2>' + esc(tx("title")) + "</h2><p class=\"hint\">" + esc(tx("hint")) + "</p>" + banner + form + "</div>" +
      '<div class="card cd-lib"><h2 class="sub2">' + esc(tx("title")) + " (" + list.length + ")</h2>" +
      '<div class="row"><div><label>' + esc(tx("vendor")) + '</label><input id="cd-f-vendor" autocomplete="off" value="' + esc(filt.vendor) + '" oninput="COA_DOCS.filter()"></div>' +
      '<div><label>' + esc(tx("lot")) + '</label><input id="cd-f-lot" autocomplete="off" value="' + esc(filt.lot) + '" oninput="COA_DOCS.filter()"></div>' +
      '<div><label>' + esc(tx("from")) + '</label><input id="cd-f-from" type="date" value="' + esc(filt.from) + '" oninput="COA_DOCS.filter()"></div>' +
      '<div><label>' + esc(tx("to")) + '</label><input id="cd-f-to" type="date" value="' + esc(filt.to) + '" oninput="COA_DOCS.filter()"></div></div>' +
      '<input id="cd-f-q" autocomplete="off" placeholder="' + esc(tx("search")) + '" value="' + esc(filt.q) + '" oninput="COA_DOCS.filter()" style="margin:8px 0">' +
      table + "</div>";
    host.setAttribute("data-cd", "1");
  }
  function readFilt() {
    if (!$("cd-f-q") && !$("cd-f-vendor")) return;
    filt.vendor = val("cd-f-vendor");
    filt.lot = val("cd-f-lot");
    filt.from = val("cd-f-from");
    filt.to = val("cd-f-to");
    filt.q = val("cd-f-q");
  }
  async function saveLib() {
    captureLib();
    if (!libFile) { toast(tx("needFile")); return; }
    var src = libDraft || {};
    var it = itemByCode(src.item_id);
    var res = await uploadFile(libFile, {
      docDate: src.doc_date || todayISO(),
      vendor: src.vendor,
      lot: src.lot,
      itemId: (it && (it.id || it.code)) || src.item_id || "",
      itemName: (it && it.name) || "",
      by: src.uploaded_by || operator(),
      note: src.note,
      recvId: ""
    });
    if (!res || !res.ok) {
      if (res && res.missing) noteMissing();
      else toast((res && res.msg) || tx("notSaved"));
      return;
    }
    libFile = null;
    libDraft = null;
    libSkip = true;
    toast(tx("savedFile"));
    renderLib();
  }
  async function matchOne(id) {
    var doc = docRows().filter(function (d) { return String(d.id) === String(id); })[0];
    if (!doc) return;
    var log = matchCandidate(doc, logs());
    if (!log) { toast(tx("noMatch")); return; }
    var patch = linkPatch(doc, log, operator(), new Date().toISOString());
    if (!patch) return;
    if (!cloudOn()) {
      var all = lsGet();
      all.forEach(function (d) { if (String(d.id) === String(id)) Object.assign(d, patch); });
      lsSet(all);
      docs = all;
      toast(tx("matched"));
      renderLib();
      return;
    }
    var c = client();
    if (!c) return;
    var upd = await c.from("coa_docs").update(patch).eq("id", id).select("id");
    if (upd && upd.error) {
      if (missingTable(upd.error)) noteMissing();
      else toast(upd.error.message || tx("notSaved"));
      return;
    }
    if (!upd || !upd.data || !upd.data.length) { toast(tx("notSaved")); return; }
    docs = null;
    await load();
    toast(tx("matched"));
    renderLib();
  }
  async function delOne(id) {
    if (typeof root.confirm === "function" && !root.confirm(tx("deleteAsk"))) return;
    var doc = docRows().filter(function (d) { return String(d.id) === String(id); })[0];
    if (!cloudOn()) {
      var all = lsGet().filter(function (d) { return String(d.id) !== String(id); });
      lsSet(all);
      docs = all;
      toast(tx("deleted"));
      renderLib();
      return;
    }
    var c = client();
    if (!c) return;
    if (doc && doc.file_path) { try { await c.storage.from(BUCKET).remove([doc.file_path]); } catch (e) {} }
    var gone = await c.from("coa_docs").delete().eq("id", id).select("id");
    if (gone && gone.error) { toast(gone.error.message || tx("notSaved")); return; }
    if (!gone || !gone.data || !gone.data.length) { toast(tx("notSaved")); return; }
    docs = null;
    await load();
    toast(tx("deleted"));
    renderLib();
  }
  async function nowUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (rejectFile(file)) { input.value = ""; return; }
    var lot = input.getAttribute("data-lot") || "";
    var recvGuess = input.getAttribute("data-recv") || findRecvId({
      lot: lot,
      vendor: input.getAttribute("data-vendor") || "",
      itemId: input.getAttribute("data-item") || ""
    });
    var res = await uploadFile(file, {
      lot: lot,
      vendor: input.getAttribute("data-vendor") || "",
      itemId: input.getAttribute("data-item") || "",
      itemName: input.getAttribute("data-name") || "",
      recvId: recvGuess,
      by: operator()
    });
    input.value = "";
    finishUpload(res, "", null);
  }

  root.COA_DOCS = {
    open: function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      libOpen = true;
      markNav();
      libSkip = true;
      renderLib();
    },
    file: function (inp) {
      var f = inp.files && inp.files[0] ? inp.files[0] : null;
      if (f && rejectFile(f)) { inp.value = ""; return; }
      libFile = f;
      var name = $("cd-file-name");
      if (name) name.textContent = f ? (" " + f.name) : "";
    },
    clearFile: function () { libFile = null; var name = $("cd-file-name"); if (name) name.textContent = ""; },
    save: function () { saveLib(); },
    filter: function () {
      var ae = root.document.activeElement;
      var id = ae && ae.id;
      var pos = ae && ae.selectionStart;
      readFilt();
      captureLib();
      libSkip = true;
      renderLib();
      if (!id) return;
      var el = $(id);
      if (!el) return;
      el.focus();
      if (pos != null) { try { el.setSelectionRange(pos, pos); } catch (e) {} }
    },
    match: function (id) { matchOne(id); },
    del: function (id) { delOne(id); },
    allowRelease: allowRelease,
    docsFor: function (q) { return docsFor(docRows(), q); },
    preview: function (q) { return releasePreview(docRows(), q); }
  };
  Object.keys(api).forEach(function (k) { if (root.COA_DOCS[k] == null) root.COA_DOCS[k] = api[k]; });

  function staying(t) {
    if (!t) return false;
    if (t.id === "coa-nav") return true;
    if (t.getAttribute && (t.getAttribute("data-dept-sub") === "coalib" || t.getAttribute("data-dept-tool") === "coalib")) return true;
    return false;
  }
  root.document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-rsop='dispose']") : null;
    if (btn && btn.getAttribute("data-cd-pass") !== "1") {
      var id = btn.getAttribute("data-id") || "";
      var sel = $("rsop-disp-" + id);
      if (sel && sel.value === "released") {
        var tr = btn.closest ? btn.closest("tr") : null;
        var reason = tr && tr.cells && tr.cells[5] ? tr.cells[5].textContent || "" : "";
        if (reason.indexOf("COA not received") >= 0) {
          var lot = tr.cells[3] ? String(tr.cells[3].textContent || "").trim() : "";
          if (!allowRelease({ lot: lot, ask: tx("releaseContinue") })) {
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            return;
          }
        }
      }
    }
    var clr = e.target && e.target.closest ? e.target.closest("[data-cd-clear]") : null;
    if (clr) {
      e.preventDefault();
      slots[clr.getAttribute("data-cd-clear")] = null;
      paint();
      return;
    }
    var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-sub], [data-dept-tool], #deptbar [data-dept], #dept-back") : null;
    if (!t || staying(t)) return;
    libOpen = false;
  }, true);
  root.document.addEventListener("change", function (e) {
    var inp = e.target;
    if (!inp || inp.type !== "file") return;
    if (inp.getAttribute("data-cd-pick")) {
      var slot = inp.getAttribute("data-cd-pick");
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (rejectFile(f)) { inp.value = ""; return; }
      slots[slot] = f;
      maybeYes(slot === "recv" ? "r-coa" : "rl-coa");
      paint();
      return;
    }
    if (inp.getAttribute("data-cd-now") === "1") {
      e.preventDefault();
      nowUpload(inp);
    }
  });
  function boot() {
    ensureStyle();
    injectNav();
    armUi();
    armTrace();
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return libOpen; });
    var view = $("view");
    if (view && !view.__cdObs && typeof root.MutationObserver === "function") {
      var obs = new root.MutationObserver(onView);
      view.__cdObs = obs;
      obs.observe(view, { childList: true, subtree: true });
    }
    load().then(function () { onView(); }).catch(function () { onView(); });
  }
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);

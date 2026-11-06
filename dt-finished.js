/* Dollar Tree finished goods. One row per pallet in
   public.dollar_tree_finished_goods. The screen starts empty.
   Oct 28 on-hand is an unconfirmed note, never a pallet row.
   Save matches the database: inventory@smackinsnacks.com and
   troy.dircks@smackinsnacks.com. Everyone else is view only.
   There is no delete. Unknown cases and units stay blank, not zero.
   Cloud only. One observer. No timer. */
(function (root) {
  "use strict";
  var EDITORS = {
    "inventory@smackinsnacks.com": 1,
    "troy.dircks@smackinsnacks.com": 1
  };
  var SKUS = ["DT275-BBQ", "DT275-CINNAMON", "DT275-GARLIC", "DT275-LEMONPEPPER"];
  var CAP = 100000;
  var STATUSES = ["ready_to_ship", "shipped"];
  var STALE = [
    { sku: "DT275-BBQ", name: "BBQ", qty: 7920 },
    { sku: "DT275-CINNAMON", name: "Cinnamon Churro", qty: 68160 },
    { sku: "DT275-GARLIC", name: "Garlic Parm", qty: 3600 }
  ];
  var PMAC = {
    when: "2026-08-17",
    machine: "42",
    flavor: "S03",
    name: "BYBBQ",
    bag: "2.75 oz",
    boxes: 25,
    packages: 3000
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
      title: "Dollar Tree Finished Goods",
      hint: "Pallets of Dollar Tree 2.75 oz bags. This list starts empty. Save is limited to inventory@smackinsnacks.com and Troy. There is no delete.",
      stale: "Unconfirmed Oct 28 Dollar Tree stock, not loaded as pallets: BBQ 7,920, Cinnamon Churro 68,160, Garlic Parm 3,600. Waiting on Jesus.",
      pmac: "Unverified P-Mac run on Aug 17: machine 42, flavor S03 BYBBQ, 2.75 oz, 25 boxes, 3,000 packages. No match to a Dollar Tree pallet. Not counted.",
      empty: "No Dollar Tree pallets yet.",
      viewOnly: "View only. Saves are limited to inventory@smackinsnacks.com and Troy.",
      signIn: "Sign in to view Dollar Tree finished goods. Nothing is stored in this browser.",
      cloud: "Dollar Tree finished goods load from the cloud only.",
      sku: "SKU", pallet: "Pallet ID", lot: "Lot", location: "Location",
      cases: "Cases", units: "Units", built: "Date built", status: "Status",
      shipRef: "Shipment ref", notes: "Notes", operator: "Operator",
      ready: "Ready to ship", shipped: "Shipped",
      unknown: "unknown", save: "Save pallet", edit: "Save changes", cancel: "Cancel",
      refresh: "Refresh", own: "Only the account that saved this pallet can edit it.",
      needPallet: "Pallet ID is required.",
      needSku: "Choose a Dollar Tree SKU.",
      needBy: "Operator is required.",
      qty: "Cases and units must be blank or a number from 0 to 100,000. Blank means unknown, not zero.",
      shipHint: "Ready to ship stores no shipment ref and no shipped time. Shipped stores the ref and the time. History records who changed it.",
      saved: "Pallet saved.",
      fail: "Not saved.",
      shippedAt: "Shipped time"
    },
    es: {
      title: "Producto terminado Dollar Tree",
      hint: "Tarimas de bolsas Dollar Tree 2.75 oz. Esta lista empieza vacia. Guardar es solo para inventory@smackinsnacks.com y Troy. No hay borrado.",
      stale: "Stock Dollar Tree del 28 de octubre sin confirmar, no cargado como tarimas: BBQ 7,920, Cinnamon Churro 68,160, Garlic Parm 3,600. Esperando a Jesus.",
      pmac: "Corrida P-Mac sin verificar del 17 de agosto: maquina 42, sabor S03 BYBBQ, 2.75 oz, 25 cajas, 3,000 paquetes. Sin union a una tarima Dollar Tree. No se cuenta.",
      empty: "Aun no hay tarimas Dollar Tree.",
      viewOnly: "Solo lectura. Guardar es solo para inventory@smackinsnacks.com y Troy.",
      signIn: "Inicie sesion para ver el producto terminado Dollar Tree. Nada se guarda en este navegador.",
      cloud: "El producto terminado Dollar Tree se carga solo desde la nube.",
      sku: "SKU", pallet: "ID de tarima", lot: "Lote", location: "Ubicacion",
      cases: "Cajas", units: "Unidades", built: "Fecha de armado", status: "Estado",
      shipRef: "Ref. de envio", notes: "Notas", operator: "Operador",
      ready: "Listo para enviar", shipped: "Enviado",
      unknown: "desconocido", save: "Guardar tarima", edit: "Guardar cambios", cancel: "Cancelar",
      refresh: "Actualizar", own: "Solo la cuenta que guardo esta tarima puede editarla.",
      needPallet: "El ID de tarima es obligatorio.",
      needSku: "Elija un SKU de Dollar Tree.",
      needBy: "El operador es obligatorio.",
      qty: "Cajas y unidades van en blanco o un numero de 0 a 100,000. En blanco es desconocido, no cero.",
      shipHint: "Listo para enviar no guarda ref. ni hora. Enviado guarda la ref. y la hora. El historial registra quien lo cambio.",
      saved: "Tarima guardada.",
      fail: "No guardado.",
      shippedAt: "Hora de envio"
    },
    pt: {
      title: "Produto acabado Dollar Tree",
      hint: "Paletes de sacos Dollar Tree 2.75 oz. Esta lista comeca vazia. Salvar e so para inventory@smackinsnacks.com e Troy. Nao ha exclusao.",
      stale: "Estoque Dollar Tree de 28 de outubro sem confirmacao, nao carregado como paletes: BBQ 7,920, Cinnamon Churro 68,160, Garlic Parm 3,600. Aguardando Jesus.",
      pmac: "Corrida P-Mac nao verificada em 17 de agosto: maquina 42, sabor S03 BYBBQ, 2.75 oz, 25 caixas, 3.000 pacotes. Sem ligacao a um palete Dollar Tree. Nao entra na contagem.",
      empty: "Nenhum palete Dollar Tree ainda.",
      viewOnly: "Somente leitura. Salvar e so para inventory@smackinsnacks.com e Troy.",
      signIn: "Entre para ver o produto acabado Dollar Tree. Nada fica neste navegador.",
      cloud: "O produto acabado Dollar Tree vem so da nuvem.",
      sku: "SKU", pallet: "ID do palete", lot: "Lote", location: "Local",
      cases: "Caixas", units: "Unidades", built: "Data de montagem", status: "Status",
      shipRef: "Ref. de envio", notes: "Notas", operator: "Operador",
      ready: "Pronto para enviar", shipped: "Enviado",
      unknown: "desconhecido", save: "Salvar palete", edit: "Salvar alteracoes", cancel: "Cancelar",
      refresh: "Atualizar", own: "So a conta que salvou este palete pode editar.",
      needPallet: "O ID do palete e obrigatorio.",
      needSku: "Escolha um SKU Dollar Tree.",
      needBy: "O operador e obrigatorio.",
      qty: "Caixas e unidades ficam em branco ou um numero de 0 a 100.000. Em branco e desconhecido, nao zero.",
      shipHint: "Pronto para enviar nao grava ref. nem hora. Enviado grava a ref. e a hora. O historico registra quem mudou.",
      saved: "Palete salvo.",
      fail: "Nao salvo.",
      shippedAt: "Hora do envio"
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
  function canEdit(email) {
    return !!EDITORS[String(email || "").trim().toLowerCase()];
  }
  function nullableQty(v) {
    if (v == null) return { ok: true, value: null };
    var s = String(v).trim();
    if (s === "") return { ok: true, value: null };
    if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, msg: "qty" };
    var n = Number(s);
    if (n !== n || n < 0 || n > CAP) return { ok: false, msg: "qty" };
    return { ok: true, value: n };
  }
  function qtyText(v) {
    if (v == null || v === "") return tx("unknown");
    return String(v);
  }
  function cleanStatus(v) {
    var s = String(v || "").trim();
    return STATUSES.indexOf(s) >= 0 ? s : "";
  }
  function rowPayload(input, prev, email) {
    input = input || {};
    prev = prev || null;
    var who = String(email || "").trim();
    if (!canEdit(who)) return { ok: false, msg: "view" };
    var sku = String(input.sku || "").trim();
    if (SKUS.indexOf(sku) < 0) return { ok: false, msg: "sku" };
    var pallet = String(input.pallet_id || "").trim();
    if (!pallet) return { ok: false, msg: "pallet" };
    var by = String(input.entered_by || "").trim();
    if (!by) return { ok: false, msg: "by" };
    var cases = nullableQty(input.cases);
    var units = nullableQty(input.units);
    if (!cases.ok || !units.ok) return { ok: false, msg: "qty" };
    var status = cleanStatus(input.status) || "ready_to_ship";
    var built = String(input.date_built || "").trim();
    if (built && !/^\d{4}-\d{2}-\d{2}$/.test(built)) return { ok: false, msg: "date" };
    var owner = who;
    if (prev) {
      owner = String(prev.entered_by_email || "");
      if (owner.toLowerCase() !== who.toLowerCase()) return { ok: false, msg: "own" };
    }
    var ref = String(input.shipped_reference || "").trim();
    var shippedAt = null;
    if (status === "ready_to_ship") {
      ref = "";
      shippedAt = null;
    } else if (prev && prev.status === "shipped" && prev.shipped_at) {
      shippedAt = prev.shipped_at;
    } else {
      shippedAt = input.shipped_at || new Date().toISOString();
    }
    var row = {
      sku: sku,
      pallet_id: pallet,
      lot: String(input.lot || "").trim() || null,
      location: String(input.location || "").trim() || null,
      cases: cases.value,
      units: units.value,
      date_built: built || null,
      status: status,
      shipped_reference: status === "shipped" ? (ref || null) : null,
      shipped_at: status === "shipped" ? shippedAt : null,
      notes: String(input.notes || "").trim() || null,
      entered_by: by,
      entered_by_email: owner
    };
    return { ok: true, row: row, id: prev ? prev.id : null };
  }
  function skuOptions(current, items) {
    var list = SKUS.slice();
    (items || []).forEach(function (it) {
      if (!it || String(it.category || "") !== "dollartree275") return;
      var id = String(it.id || it.code || "");
      if (id && list.indexOf(id) < 0) list.push(id);
    });
    return list.map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === current ? " selected" : "") + ">" + esc(id) + "</option>";
    }).join("");
  }
  function statusOptions(current) {
    var cur = cleanStatus(current) || "ready_to_ship";
    return STATUSES.map(function (s) {
      var label = s === "shipped" ? tx("shipped") : tx("ready");
      return '<option value="' + s + '"' + (s === cur ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }
  function fieldVal(src, key) {
    if (!src || src[key] == null) return "";
    return src[key];
  }
  function renderHtml(state) {
    state = state || {};
    var email = String(state.email || "");
    var editor = canEdit(email);
    var rows = state.rows || [];
    var draft = state.draft || {};
    var editing = state.editing || null;
    var src = editing || draft;
    var err = state.error || "";
    var note = '<div class="ex warn" id="dtfg-stale"><b>' + esc(tx("stale")) + '</b></div>' +
      '<div class="ex warn" id="dtfg-pmac"><b>' + esc(tx("pmac")) + '</b></div>';
    var form = "";
    if (!editor) {
      form = '<p class="hint" id="dtfg-viewonly">' + esc(tx("viewOnly")) + "</p>";
    } else {
      var ownBlock = "";
      if (editing && String(editing.entered_by_email || "").toLowerCase() !== email.toLowerCase()) {
        ownBlock = '<p class="hint">' + esc(tx("own")) + "</p>";
      }
      form = ownBlock + '<div class="ordform" id="dtfg-form">' +
        (editing ? '<input type="hidden" id="dtfg-id" value="' + esc(editing.id || "") + '">' : "") +
        '<div class="row"><div><label>' + esc(tx("sku")) + '</label><select id="dtfg-sku">' + skuOptions(fieldVal(src, "sku"), state.items) + '</select></div>' +
        '<div><label>' + esc(tx("pallet")) + '</label><input id="dtfg-pallet" autocomplete="off" value="' + esc(fieldVal(src, "pallet_id")) + '"></div>' +
        '<div><label>' + esc(tx("lot")) + '</label><input id="dtfg-lot" autocomplete="off" value="' + esc(fieldVal(src, "lot")) + '"></div></div>' +
        '<div class="row"><div><label>' + esc(tx("location")) + '</label><input id="dtfg-loc" autocomplete="off" value="' + esc(fieldVal(src, "location")) + '"></div>' +
        '<div><label>' + esc(tx("cases")) + '</label><input id="dtfg-cases" inputmode="decimal" autocomplete="off" value="' + esc(fieldVal(src, "cases")) + '"></div>' +
        '<div><label>' + esc(tx("units")) + '</label><input id="dtfg-units" inputmode="decimal" autocomplete="off" value="' + esc(fieldVal(src, "units")) + '"></div></div>' +
        '<div class="row"><div><label>' + esc(tx("built")) + '</label><input id="dtfg-built" type="date" value="' + esc(String(fieldVal(src, "date_built") || "").slice(0, 10)) + '"></div>' +
        '<div><label>' + esc(tx("status")) + '</label><select id="dtfg-status">' + statusOptions(fieldVal(src, "status")) + '</select></div>' +
        '<div><label>' + esc(tx("shipRef")) + '</label><input id="dtfg-shipref" autocomplete="off" value="' + esc(fieldVal(src, "shipped_reference")) + '"></div></div>' +
        '<div><label>' + esc(tx("notes")) + '</label><input id="dtfg-notes" autocomplete="off" value="' + esc(fieldVal(src, "notes")) + '"></div>' +
        '<div><label>' + esc(tx("operator")) + '</label><input id="dtfg-by" autocomplete="off" value="' + esc(fieldVal(src, "entered_by")) + '"></div>' +
        '<p class="hint">' + esc(tx("qty")) + " " + esc(tx("shipHint")) + "</p>" +
        (err ? '<p class="hint" id="dtfg-err">' + esc(err) + "</p>" : "") +
        '<button class="primary" type="button" id="dtfg-save" onclick="DTFINISHED.save()">' + esc(editing ? tx("edit") : tx("save")) + "</button>" +
        (editing ? ' <button class="ghost" type="button" onclick="DTFINISHED.cancel()">' + esc(tx("cancel")) + "</button>" : "") +
        "</div>";
    }
    var body = rows.map(function (r) {
      var canRow = editor && String(r.entered_by_email || "").toLowerCase() === email.toLowerCase();
      var edit = canRow ? '<button class="ghost sm" type="button" onclick="DTFINISHED.edit(\'' + esc(r.id) + '\')">' + esc(tx("edit")) + "</button>" : "";
      return '<tr id="dtfg-row">' +
        "<td>" + esc(r.sku || "") + "</td>" +
        "<td>" + esc(r.pallet_id || "") + "</td>" +
        "<td>" + esc(r.lot || "") + "</td>" +
        "<td>" + esc(r.location || "") + "</td>" +
        "<td>" + esc(qtyText(r.cases)) + "</td>" +
        "<td>" + esc(qtyText(r.units)) + "</td>" +
        "<td>" + esc(r.date_built ? String(r.date_built).slice(0, 10) : "") + "</td>" +
        "<td>" + esc(r.status === "shipped" ? tx("shipped") : tx("ready")) + "</td>" +
        "<td>" + esc(r.shipped_reference || "") + "</td>" +
        "<td>" + esc(r.shipped_at ? String(r.shipped_at).replace("T", " ").slice(0, 16) : "") + "</td>" +
        "<td>" + esc(r.notes || "") + "</td>" +
        "<td>" + esc(r.entered_by || "") + "<div class=\"muted sm\">" + esc(r.entered_by_email || "") + "</div></td>" +
        "<td>" + edit + "</td></tr>";
    }).join("");
    var table = rows.length
      ? '<table><thead><tr><th>' + esc(tx("sku")) + "</th><th>" + esc(tx("pallet")) + "</th><th>" + esc(tx("lot")) + "</th><th>" + esc(tx("location")) + "</th><th>" + esc(tx("cases")) + "</th><th>" + esc(tx("units")) + "</th><th>" + esc(tx("built")) + "</th><th>" + esc(tx("status")) + "</th><th>" + esc(tx("shipRef")) + "</th><th>" + esc(tx("shippedAt")) + "</th><th>" + esc(tx("notes")) + "</th><th>" + esc(tx("operator")) + "</th><th></th></tr></thead><tbody id=\"dtfg-rows\">" + body + "</tbody></table>"
      : '<p class="muted" id="dtfg-empty">' + esc(tx("empty")) + "</p>";
    return '<div id="dtfg-root"><div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"hint\">" + esc(tx("hint")) + "</p>" + note + form +
      ' <button class="ghost sm" type="button" onclick="DTFINISHED.refresh()">' + esc(tx("refresh")) + "</button></div>" +
      '<div class="card">' + table + "</div></div>";
  }

  var open = false;
  var saving = false;
  var rows = [];
  var draft = {};
  var editId = null;
  var email = "";
  var error = "";
  var sb = null;

  function $(id) { return typeof document === "undefined" ? null : document.getElementById(id); }
  function toast(m) {
    var t = $("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function authStore() {
    try {
      if (root.localStorage && root.localStorage.getItem("smk-persist") === "0" && root.sessionStorage) return root.sessionStorage;
    } catch (e) {}
    return root.localStorage || null;
  }
  function client() {
    if (sb) return sb;
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    var store = authStore();
    try {
      sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: store || undefined }
      });
    } catch (e) { sb = null; }
    return sb;
  }
  function readEmail() {
    if (root.SMK_USER_EMAIL) return String(root.SMK_USER_EMAIL);
    if (root.POLINES && typeof root.POLINES.currentEmail === "function") return String(root.POLINES.currentEmail() || "");
    return email || "";
  }
  function ensureEmail() {
    var known = readEmail();
    var c = client();
    if (!c || !c.auth || typeof c.auth.getSession !== "function") return Promise.resolve(known);
    return c.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      var got = session && session.user && session.user.email;
      if (got) email = String(got);
      return email || known;
    }).catch(function () { return known; });
  }
  function capture() {
    if (!$("dtfg-pallet")) return;
    draft = {
      sku: ($("dtfg-sku") || {}).value || "",
      pallet_id: ($("dtfg-pallet") || {}).value || "",
      lot: ($("dtfg-lot") || {}).value || "",
      location: ($("dtfg-loc") || {}).value || "",
      cases: ($("dtfg-cases") || {}).value || "",
      units: ($("dtfg-units") || {}).value || "",
      date_built: ($("dtfg-built") || {}).value || "",
      status: ($("dtfg-status") || {}).value || "",
      shipped_reference: ($("dtfg-shipref") || {}).value || "",
      notes: ($("dtfg-notes") || {}).value || "",
      entered_by: ($("dtfg-by") || {}).value || ""
    };
  }
  function currentEdit() {
    if (!editId) return null;
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(editId)) return rows[i];
    return null;
  }
  function paint() {
    var host = $("view");
    if (!host) return;
    if (!saving) capture();
    var editing = currentEdit();
    host.innerHTML = renderHtml({
      email: email || readEmail(),
      rows: rows,
      draft: draft,
      editing: editing,
      error: error,
      items: root.DB && root.DB.items ? root.DB.items() : []
    });
  }
  function load() {
    var c = client();
    if (!c) return Promise.reject(new Error(tx("cloud")));
    return c.from("dollar_tree_finished_goods").select("id,sku,pallet_id,lot,location,cases,units,date_built,status,shipped_at,shipped_reference,entered_by,entered_by_email,notes,created_at,updated_at").order("date_built", { ascending: false }).limit(1000)
      .then(function (r) {
        if (r && r.error) throw new Error(r.error.message || tx("fail"));
        rows = (r && r.data) ? r.data : [];
        return rows;
      });
  }
  function showLoadError(e) {
    var host = $("view");
    if (!host) return;
    var msg = (e && e.message) || tx("fail");
    if (/sign|jwt|auth|permission|42501/i.test(msg)) msg = tx("signIn");
    host.innerHTML = '<div class="card" id="dtfg-root"><h2>' + esc(tx("title")) + '</h2><p class="hint">' + esc(msg) + "</p></div>";
  }
  function openView() {
    open = true;
    error = "";
    ensureEmail().then(function (who) {
      email = who || "";
      return load();
    }).then(function () {
      if (open) paint();
    }).catch(function (e) {
      if (open) showLoadError(e);
    });
    var host = $("view");
    if (host && !host.querySelector("#dtfg-root")) {
      host.innerHTML = '<div class="card" id="dtfg-root"><h2>' + esc(tx("title")) + '</h2><p class="muted">Loading...</p></div>';
    }
  }
  function save() {
    if (saving) return;
    capture();
    var prev = currentEdit();
    var built = rowPayload(draft, prev, email || readEmail());
    if (!built.ok) {
      error = built.msg === "qty" ? tx("qty") : built.msg === "pallet" ? tx("needPallet") : built.msg === "sku" ? tx("needSku") : built.msg === "by" ? tx("needBy") : built.msg === "own" ? tx("own") : tx("viewOnly");
      paint();
      return;
    }
    var c = client();
    if (!c) { error = tx("cloud"); paint(); return; }
    saving = true;
    var q = prev
      ? c.from("dollar_tree_finished_goods").update(built.row).eq("id", prev.id).select("id")
      : c.from("dollar_tree_finished_goods").insert(built.row).select("id");
    q.then(function (r) {
      saving = false;
      if (r && r.error) {
        error = r.error.message || tx("fail");
        paint();
        return;
      }
      if (!r || !r.data || !r.data.length) {
        error = tx("fail");
        paint();
        return;
      }
      error = "";
      editId = null;
      draft = {};
      toast(tx("saved"));
      load().then(function () { if (open) paint(); }).catch(function (e) { showLoadError(e); });
    }).catch(function (e) {
      saving = false;
      error = (e && e.message) || tx("fail");
      paint();
    });
  }

  var api = {
    EDITORS: EDITORS,
    SKUS: SKUS,
    STALE: STALE,
    PMAC: PMAC,
    CAP: CAP,
    canEdit: canEdit,
    nullableQty: nullableQty,
    qtyText: qtyText,
    rowPayload: rowPayload,
    renderHtml: renderHtml,
    TXT: TXT
  };
  if (typeof module !== "undefined" && module.exports && (typeof root === "undefined" || !root.document)) {
    module.exports = api;
    return;
  }
  root.DTFINISHED = {
    open: openView,
    save: save,
    refresh: function () {
      if (saving) return;
      var ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae.closest && ae.closest("#dtfg-form") && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      capture();
      load().then(function () { if (open) paint(); }).catch(function (e) { showLoadError(e); });
    },
    edit: function (id) {
      capture();
      editId = id;
      error = "";
      paint();
    },
    cancel: function () {
      editId = null;
      draft = {};
      error = "";
      paint();
    },
    canEdit: canEdit,
    rowPayload: rowPayload,
    renderHtml: renderHtml
  };
  if (root.document) {
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return open; });
    root.SMK_BUSY = root.SMK_BUSY || [];
    root.SMK_BUSY.push(function () { return saving && open; });
    root.document.addEventListener("input", function (e) {
      var t = e.target;
      if (!open || !t || !t.closest || !t.closest("#dtfg-root")) return;
      capture();
    });
    root.document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#nav .navitem, [data-dept-sub], [data-dept-tool], #deptbar [data-dept], #dept-back") : null;
      if (!t) return;
      if (t.getAttribute && t.getAttribute("data-dept-sub") === "dtfg") return;
      if (t.getAttribute && t.getAttribute("data-dept-tool") === "dtfg") return;
      open = false;
    }, true);
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(function () {
        if (!open) return;
        var host = root.document.getElementById("view");
        if (!host || host.querySelector("#dtfg-root")) return;
        paint();
      });
      obs.observe(root.document.documentElement, { childList: true, subtree: true });
    }
  }
})(typeof window !== "undefined" ? window : globalThis);

/* ============================================================================
   P-Mac Log Output  (pmac-log.js)
   Digital version of Allen's "P-Mac (Packing Machine) Log v27" — CORE / first pass.
   Captures the Shift Setup block as dated, saved records:
     date, shift, operator, machine #, flavor (+ number), bag size (1.5/2.75/4.0),
     package type (Standard/Unvaulted/Backyard Sports-Pedro/Halloween + add-new),
     batch code, 3 actual weights, allergen, total packages, notes.
   Downtime tracking, production-calc math, and the QA checklist are Phase 2
   (to be designed with Allen). Self-contained: talks to Supabase table `pmac_log`
   directly (cloud) with a localStorage fallback (single device / offline).
   Exposes window.PMACLOG. Loaded AFTER app.js; viewPmacOut() delegates here.
   ==========================================================================*/
(function () {
  "use strict";

  var cfg = window.SMACKIN_CONFIG || {};
  var LS_ROWS = "pmac-log-local";       // local fallback records
  var LS_PKG  = "pmac-log-pkgtypes";    // custom packaging types added by Allen
  var LS_OPS  = "pmac-log-operators";   // operators typed in (self-service list)
  var LS_FLAV = "pmac-log-flavors";     // custom flavors added by Allen

  var BAG_SIZES = ["1.5", "2.75", "4.0"];
  var PKG_BASE  = ["Standard", "Unvaulted", "Backyard Sports-Pedro", "Halloween"];
  var ALLERGENS = ["None", "Milk", "Other"];
  // packages-per-box from Allen's v27 Production Calculation block
  var PER_BOX = { "1.5": 250, "2.75": 120, "4.0": 100 };

  var sb = null;
  var cache = null;   // null = not loaded yet; array once loaded

  // ---- helpers ----------------------------------------------------------
  function isCloud() {
    return !!(window.DB && window.DB.mode === "cloud" && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }
  function client() {
    if (!sb && isCloud()) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; } }
    return sb;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function toast(m) { if (window.UI && typeof window.UI.toast === "function") { try { window.UI.toast(m); return; } catch (e) {} } var t = $("toast"); if (t) { t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2200); } }
  function rerender() {
    var host = document.getElementById("view");
    if (host && (host.querySelector("#pml-date") || host.querySelector("#pmo-sel") || host.querySelector("#pml-loading"))) host.innerHTML = render();
  }

  // Flavor list: derived from the app's bag items (code + clean name), plus any
  // custom flavors Allen adds. "number" = the app flavor code for now (confirm w/ Allen).
  function flavorList() {
    var seen = {}, out = [];
    try {
      var items = (window.DB && window.DB.items) ? window.DB.items() : [];
      items.forEach(function (i) {
        if (!i || (i.category !== "bag4" && i.category !== "bag15" && i.category !== "bag275")) return;
        var name = String(i.name || "").replace(/^Bags?\s+[\d.]+\s*oz\s*[-–]\s*/i, "").trim();
        if (!name) return;
        var code = String(i.code || "").replace(/^B(?:4|15|275)-/i, "");
        var key = name.toLowerCase();
        if (seen[key]) { if (!seen[key].code && code) seen[key].code = code; return; }
        seen[key] = { name: name, code: code }; out.push(seen[key]);
      });
    } catch (e) {}
    lsGet(LS_FLAV, []).forEach(function (f) { var key = String(f.name || "").toLowerCase(); if (key && !seen[key]) { seen[key] = { name: f.name, code: f.code || "" }; out.push(seen[key]); } });
    out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return out;
  }
  function pkgTypes() { return PKG_BASE.concat(lsGet(LS_PKG, [])); }
  function operators() { return lsGet(LS_OPS, ["Wilson Delgado", "Leo Ontiveros"]); }

  // ---- data load / save -------------------------------------------------
  function load() {
    if (isCloud()) {
      var c = client();
      if (!c) { cache = lsGet(LS_ROWS, []); return Promise.resolve(cache); }
      return c.from("pmac_log").select("*").order("log_date", { ascending: false }).order("created_at", { ascending: false }).limit(500)
        .then(function (r) { cache = (r && r.data) ? r.data : []; return cache; })
        .catch(function () { cache = lsGet(LS_ROWS, []); return cache; });
    }
    cache = lsGet(LS_ROWS, []);
    return Promise.resolve(cache);
  }

  function save(row) {
    if (isCloud()) {
      var c = client();
      if (!c) return Promise.resolve(localSave(row));
      return c.from("pmac_log").insert(row).then(function (r) {
        if (r && r.error) throw new Error(r.error.message || "insert failed");
        return { ok: true };
      }).catch(function (e) { return { ok: false, msg: (e && e.message) || String(e) }; });
    }
    return Promise.resolve(localSave(row));
  }
  function localSave(row) {
    var rows = lsGet(LS_ROWS, []);
    row.id = "PML-" + Date.now().toString(36);
    row.created_at = new Date().toISOString();
    rows.unshift(row); lsSet(LS_ROWS, rows); return { ok: true };
  }

  function del(id) {
    if (isCloud()) {
      var c = client();
      if (c) return c.from("pmac_log").delete().eq("id", id).then(function () { return { ok: true }; }).catch(function () { return { ok: false }; });
    }
    var rows = lsGet(LS_ROWS, []).filter(function (r) { return String(r.id) !== String(id); });
    lsSet(LS_ROWS, rows); return Promise.resolve({ ok: true });
  }

  // ---- UI ---------------------------------------------------------------
  function opt(v, sel, label) { return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? " selected" : "") + '>' + esc(label == null ? v : label) + '</option>'; }

  function form() {
    var flavs = flavorList();
    var flavOpts = '<option value="">Flavor / Sabor…</option>' + flavs.map(function (f) { return '<option value="' + esc(f.name) + '" data-code="' + esc(f.code) + '">' + esc(f.code ? (f.code + " — " + f.name) : f.name) + '</option>'; }).join("");
    var pkgOpts = pkgTypes().map(function (p) { return opt(p, "Standard", p); }).join("") + opt("__add__", "", "+ Add packaging type…");
    var sizeOpts = BAG_SIZES.map(function (s) { return opt(s, "4.0", s + " oz"); }).join("");
    var allOpts = ALLERGENS.map(function (a) { return opt(a, "None", a); }).join("");
    var opsList = operators().map(function (o) { return '<option value="' + esc(o) + '">'; }).join("");
    return '<div class="card"><h2>P-Mac Log Output</h2>' +
      '<p class="hint">Digital P-Mac (Packing Machine) log — Shift Setup. Log each run as it comes off P-Mac. ' +
      'Downtime tracking and the QA checklist come next (designing with Allen).</p>' +
      '<div class="row">' +
        '<div><label>Date / Fecha</label><input id="pml-date" type="date" value="' + todayISO() + '"></div>' +
        '<div><label>Shift / Turno</label><select id="pml-shift">' + opt("1st", "", "1st / 1er") + opt("2nd", "", "2nd / 2do") + '</select></div>' +
        '<div><label>Operator / Operador</label><input id="pml-op" list="pml-ops" autocomplete="off" placeholder="Name / Nombre"><datalist id="pml-ops">' + opsList + '</datalist></div>' +
        '<div><label>Mach. # / Máq.</label><input id="pml-mach" autocomplete="off" placeholder="#"></div>' +
      '</div>' +
      '<div class="row">' +
        '<div style="flex:2"><label>Flavor / Sabor</label><select id="pml-flav" onchange="PMACLOG.flavPick(this)">' + flavOpts + '</select></div>' +
        '<div><label>Bag Size</label><select id="pml-size">' + sizeOpts + '</select></div>' +
        '<div><label>Package Type</label><select id="pml-pkg" onchange="PMACLOG.pkgPick(this)">' + pkgOpts + '</select></div>' +
        '<div><label>Batch Code / Lote</label><input id="pml-batch" autocomplete="off"></div>' +
      '</div>' +
      '<div class="row">' +
        '<div><label>Start / Inicio</label><input id="pml-start" type="time"></div>' +
        '<div><label>End / Fin</label><input id="pml-end" type="time"></div>' +
        '<div><label>Allergen / Alérgeno</label><select id="pml-allergen">' + allOpts + '</select></div>' +
        '<div><label>Total Packages</label><input id="pml-total" type="number" min="0" placeholder="0"></div>' +
      '</div>' +
      '<div class="row">' +
        '<div><label>Weight 1 (oz)</label><input id="pml-w1" type="number" step="0.01" placeholder="—"></div>' +
        '<div><label>Weight 2 (oz)</label><input id="pml-w2" type="number" step="0.01" placeholder="—"></div>' +
        '<div><label>Weight 3 (oz)</label><input id="pml-w3" type="number" step="0.01" placeholder="—"></div>' +
        '<div style="flex:2"><label>Notes / Notas</label><input id="pml-notes" autocomplete="off"></div>' +
      '</div>' +
      '<p class="hint" style="margin:2px 0 8px">Min weight at run start: 1.5oz → 1.62 · 2.75oz → 2.97 · 4.0oz → 4.22 oz. ' +
      'Add a new flavor or packaging type from its dropdown.</p>' +
      '<button class="primary" onclick="PMACLOG.saveForm()">Log run / Registrar</button>' +
      '<input type="hidden" id="pml-flavcode" value="">' +
      '</div>';
  }

  function logTable() {
    var rows = cache || [];
    if (!rows.length) return '<div class="card"><h2 class="sub2">Logged runs</h2><p class="muted">No runs logged yet.</p></div>';
    var body = rows.slice(0, 100).map(function (r) {
      var flav = r.flavor_name || "";
      if (r.flavor_code) flav = r.flavor_code + " — " + flav;
      return '<tr>' +
        '<td class="sm">' + esc(r.log_date || "") + '</td>' +
        '<td class="sm">' + esc(r.shift || "") + '</td>' +
        '<td>' + esc(flav) + '</td>' +
        '<td class="sm">' + esc(r.bag_size ? r.bag_size + "oz" : "") + '</td>' +
        '<td class="sm">' + esc(r.package_type || "") + '</td>' +
        '<td class="sm">' + esc(r.batch_code || "") + '</td>' +
        '<td class="right">' + esc(r.total_packages != null && r.total_packages !== "" ? r.total_packages : "—") + '</td>' +
        '<td class="sm muted">' + esc(r.operator || "") + '</td>' +
        '<td><button class="ghost sm danger" onclick="PMACLOG.del(\'' + esc(r.id) + '\')">&#10005;</button></td>' +
      '</tr>';
    }).join("");
    return '<div class="card"><h2 class="sub2">Logged runs (' + rows.length + ')</h2>' +
      '<div class="tblwrap"><table class="sortable"><thead><tr>' +
      '<th>Date</th><th>Shift</th><th>Flavor</th><th>Size</th><th>Package</th><th>Batch</th><th class="right">Pkgs</th><th>Operator</th><th></th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }

  function render() {
    if (cache === null) { load().then(rerender); return '<div class="card" id="pml-loading"><h2>P-Mac Log Output</h2><p class="muted">Loading…</p></div>'; }
    return form() + logTable();
  }

  // ---- handlers (global via window.PMACLOG) -----------------------------
  window.PMACLOG = {
    render: render,
    flavPick: function (selEl) {
      var o = selEl.options[selEl.selectedIndex];
      var code = o ? (o.getAttribute("data-code") || "") : "";
      var h = $("pml-flavcode"); if (h) h.value = code;
    },
    pkgPick: function (selEl) {
      if (selEl.value !== "__add__") return;
      var name = window.prompt("New packaging type / Nuevo tipo de paquete:");
      name = (name || "").trim();
      if (name) { var list = lsGet(LS_PKG, []); if (list.indexOf(name) < 0 && PKG_BASE.indexOf(name) < 0) { list.push(name); lsSet(LS_PKG, list); } }
      rerender();
    },
    del: function (id) {
      if (!window.confirm("Delete this run?")) return;
      del(id).then(function () { return load(); }).then(function () { toast("Deleted"); rerender(); });
    },
    saveForm: function () {
      var v = function (id) { var e = $(id); return e ? String(e.value || "").trim() : ""; };
      var n = function (id) { var x = v(id); return x === "" ? null : Number(x); };
      var flavName = v("pml-flav");
      if (!flavName) { toast("Pick a flavor"); return; }
      var op = v("pml-op");
      if (op) { var ops = operators(); if (ops.indexOf(op) < 0) { ops.push(op); lsSet(LS_OPS, ops); } }
      var pkg = v("pml-pkg"); if (pkg === "__add__") pkg = "";
      var row = {
        log_date: v("pml-date") || todayISO(),
        shift: v("pml-shift"),
        operator: op,
        machine_no: v("pml-mach"),
        flavor_code: v("pml-flavcode"),
        flavor_name: flavName,
        bag_size: v("pml-size"),
        package_type: pkg,
        batch_code: v("pml-batch"),
        start_time: v("pml-start"),
        end_time: v("pml-end"),
        allergen: v("pml-allergen"),
        wt1: n("pml-w1"), wt2: n("pml-w2"), wt3: n("pml-w3"),
        total_packages: n("pml-total"),
        notes: v("pml-notes"),
        entered_by: op
      };
      save(row).then(function (res) {
        if (!res || !res.ok) { toast(res && res.msg ? res.msg : "Save failed"); return; }
        toast("Run logged");
        load().then(rerender);
      });
    },
    // expose per-box constants for Phase 2 production math
    PER_BOX: PER_BOX
  };

  // ---- runtime wiring (no app.js change required) -----------------------
  // The app still renders the legacy "Bag Output" screen for the pmacout tab
  // (id="pmo-sel"). We detect it in #view and swap in P-Mac Log Output, and
  // relabel the nav item. When app.js is updated to delegate directly, this
  // becomes a harmless no-op.
  function swapIfLegacy() {
    var host = document.getElementById("view");
    if (host && host.querySelector("#pmo-sel") && !host.querySelector("#pml-date") && !host.querySelector("#pml-loading")) {
      host.innerHTML = render();
    }
  }
  function relabelNav() {
    try {
      var nav = document.getElementById("nav"); if (!nav) return;
      var els = nav.querySelectorAll("[onclick]");
      for (var k = 0; k < els.length; k++) {
        var oc = els[k].getAttribute("onclick") || "";
        if (oc.indexOf("pmacout") < 0) continue;
        var el = els[k], nodes = el.childNodes;
        for (var j = 0; j < nodes.length; j++) {
          var nd = nodes[j];
          if (nd.nodeType === 3 && /Bag Output|Salida de Bolsas|Sa[ií]da de Sacos/i.test(nd.nodeValue)) {
            nd.nodeValue = nd.nodeValue.replace(/Bag Output|Salida de Bolsas|Sa[ií]da de Sacos/i, "P-Mac Log Output");
          }
        }
      }
    } catch (e) {}
  }
  try {
    var _mo = new MutationObserver(function () { swapIfLegacy(); relabelNav(); });
    _mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(function () { swapIfLegacy(); relabelNav(); }, 200); });
  } else {
    setTimeout(function () { swapIfLegacy(); relabelNav(); }, 200);
  }
})();

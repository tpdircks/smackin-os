/* ============================================================================
   Services Provided  (services.js)
   Adriana's request: a dedicated place to log OUTSOURCED SERVICES (uniform
   cleaning, pest control, waste pickup, equipment service, etc.) instead of
   entering them in the Receiving Log with the materials.
   Fields: date, service type, provider, invoice #, # of services, total cost,
   auto unit cost (total ÷ #), notes, + invoice paperwork upload.
   Self-contained (no app.js edit). Talks to Supabase table `services_log`
   (cloud) with a localStorage fallback. Invoice files go in the existing
   "supplier-pos" bucket with an svc_ prefix. Adds a "Services" item to the
   Receiving nav group. Loaded AFTER app.js. Exposes window.SERVICES.
   ==========================================================================*/
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var BUCKET = "supplier-pos";
  var LS = "services-local";
  var sb = null, cache = null, loading = false, pendFile = null, editId = null, search = "";
  var TYPES = ["Uniform Cleaning", "Pest Control", "Waste / Recycling", "Equipment Service", "Cleaning / Janitorial", "Calibration", "Landscaping", "Other"];

  function isCloud() { return !!(window.DB && window.DB.mode === "cloud" && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY); }
  function client() { if (!sb && isCloud()) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; } } return sb; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function money(n) { return "$" + (Math.round(num(n) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function lsGet() { try { var v = localStorage.getItem(LS); return v ? JSON.parse(v) : []; } catch (e) { return []; } }
  function lsSet(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} }
  function toast(m) { var t = $("toast"); if (t) { t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2200); } }
  function uid() { return "svc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); }

  function load() {
    if (cache) return Promise.resolve(cache);
    var c = client();
    if (!c) { cache = lsGet(); return Promise.resolve(cache); }
    return c.from("services_log").select("*").order("svc_date", { ascending: false }).limit(3000)
      .then(function (r) { cache = (r && r.data) ? r.data : []; return cache; })
      .catch(function () { cache = lsGet(); return cache; });
  }

  function styleOnce() {
    if ($("svc-style")) return;
    var s = document.createElement("style"); s.id = "svc-style";
    s.textContent = ".svc-unit{font-size:13px;color:#006DB6;font-weight:700;margin-top:6px}.svc-paid{font-weight:700}";
    (document.head || document.documentElement).appendChild(s);
  }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    if (!cache) {
      host.innerHTML = '<div class="card"><h2>Services Provided</h2><p class="muted">Loading…</p></div>';
      load().then(function () { if (host.getAttribute("data-svc") === "1") render(); });
      host.setAttribute("data-svc", "1"); return;
    }
    var ed = editId ? (cache.find(function (x) { return String(x.id) === String(editId); }) || {}) : {};
    var editing = !!(editId && ed.id);
    var av = function (x) { return esc(x == null ? "" : x); };
    var opt = function (cur) { return TYPES.map(function (t) { return '<option' + (t === (cur || "") ? " selected" : "") + '>' + t + '</option>'; }).join(""); };
    var form = '<div class="ordform">' +
      (editing ? '<p class="hint">&#9998; Editing an entry' + (ed.file_name ? ' &middot; current file kept unless you attach a new one' : '') + '</p>' : '') +
      '<div class="spodrop"><input type="file" id="svc-file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.docx" style="display:none" onchange="SERVICES.file(this)">' +
      '<label for="svc-file" class="spodroplabel">&#128193; Attach invoice (optional)</label></div>' +
      (pendFile ? '<p class="hint">&#128206; ' + esc(pendFile.name) + ' <button class="ghost sm" onclick="SERVICES.clearFile()">Cancel</button></p>' : '') +
      '<div class="row"><div><label>Date</label><input id="svc-date" type="date" value="' + (editing && ed.svc_date ? (ed.svc_date + "").slice(0, 10) : todayISO()) + '"></div>' +
      '<div><label>Service type</label><select id="svc-type">' + opt(ed.service_type) + '</select></div></div>' +
      '<div class="row"><div><label>Provider / vendor</label><input id="svc-provider" autocomplete="off" value="' + av(ed.provider) + '"></div>' +
      '<div><label>Invoice #</label><input id="svc-inv" autocomplete="off" value="' + av(ed.invoice_num) + '"></div></div>' +
      '<div class="row"><div><label># of services</label><input id="svc-num" type="number" min="0" step="1" oninput="SERVICES.calc()" value="' + (editing && ed.num_services != null ? num(ed.num_services) : "") + '"></div>' +
      '<div><label>Total cost</label><input id="svc-cost" type="number" min="0" step="0.01" placeholder="0.00" oninput="SERVICES.calc()" value="' + (editing && ed.total_cost != null ? num(ed.total_cost) : "") + '"></div>' +
      '<div><label>Unit cost (auto)</label><div class="svc-unit" id="svc-unit">&mdash;</div></div></div>' +
      '<div><label>Notes (optional)</label><input id="svc-notes" autocomplete="off" value="' + av(ed.notes) + '"></div>' +
      '<div><label>Entered by</label><input id="svc-by" autocomplete="off" placeholder="Your name" value="' + av(ed.entered_by) + '"></div>' +
      '<button class="primary" onclick="SERVICES.save()">' + (editing ? "Save changes" : "Add service") + '</button>' +
      (editing ? ' <button class="ghost" style="margin-top:14px" onclick="SERVICES.cancel()">Cancel</button>' : '') + '</div>';

    var list = cache.slice();
    if (search) { var q = search.toLowerCase(); list = list.filter(function (s) { return ((s.service_type || "") + " " + (s.provider || "") + " " + (s.invoice_num || "") + " " + (s.notes || "")).toLowerCase().indexOf(q) >= 0; }); }
    list.sort(function (a, b) { return (b.svc_date || "").localeCompare(a.svc_date || ""); });
    var totCost = list.reduce(function (a, s) { return a + num(s.total_cost); }, 0);
    var rows = list.map(function (s) {
      var file = s.file_url ? '<a href="' + esc(s.file_url) + '" target="_blank" rel="noopener">&#128206;</a>' : '';
      var unit = num(s.num_services) ? money(num(s.total_cost) / num(s.num_services)) : "&mdash;";
      return '<tr><td>' + esc((s.svc_date || "").slice(0, 10)) + '</td><td><b>' + esc(s.service_type || "") + '</b></td>' +
        '<td>' + esc(s.provider || "") + '</td><td>' + esc(s.invoice_num || "") + ' ' + file + '</td>' +
        '<td class="right">' + (num(s.num_services) || "&mdash;") + '</td>' +
        '<td class="right">' + money(s.total_cost) + '</td><td class="right muted">' + unit + '</td>' +
        '<td>' + esc(s.notes || "") + '</td>' +
        '<td><button class="ghost sm" title="Edit" onclick="SERVICES.edit(\'' + s.id + '\')">&#9998;</button> ' +
        '<button class="ghost sm danger" onclick="SERVICES.del(\'' + s.id + '\')">&#10005;</button></td></tr>';
    }).join("");
    var table = list.length ? '<table><thead><tr><th>Date</th><th>Service</th><th>Provider</th><th>Invoice #</th><th class="right">#</th><th class="right">Total</th><th class="right">Unit</th><th>Notes</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="muted">No services logged yet.</p>';

    host.innerHTML = '<div class="card"><h2>Services Provided</h2><p class="hint">Log outsourced services (uniform cleaning, pest control, waste pickup, equipment service…) and attach the invoice. Keeps services separate from received materials.</p>' + form + '</div>' +
      '<div class="card"><h2 class="sub2">Service log (' + list.length + ')' + (totCost ? ' &middot; ' + money(totCost) : '') + '</h2>' +
      '<input id="svc-search" autocomplete="off" oninput="SERVICES.search(this.value)" placeholder="Search service, provider, invoice…" style="margin-bottom:10px">' +
      table + '</div>';
    host.setAttribute("data-svc", "1");
    calc();
  }

  function calc() {
    var n = num(($("svc-num") || {}).value), c = num(($("svc-cost") || {}).value), u = $("svc-unit");
    if (u) u.innerHTML = (n > 0 && c > 0) ? money(c / n) + " / service" : "&mdash;";
  }

  function save() {
    var rec = {
      svc_date: ($("svc-date") || {}).value || todayISO(),
      service_type: ($("svc-type") || {}).value || "Other",
      provider: (($("svc-provider") || {}).value || "").trim(),
      invoice_num: (($("svc-inv") || {}).value || "").trim(),
      num_services: num(($("svc-num") || {}).value),
      total_cost: num(($("svc-cost") || {}).value),
      notes: (($("svc-notes") || {}).value || "").trim(),
      entered_by: (($("svc-by") || {}).value || "").trim()
    };
    rec.unit_cost = rec.num_services > 0 ? Math.round((rec.total_cost / rec.num_services) * 100) / 100 : 0;
    var c = client();
    if (!c) { // local fallback
      var arr = lsGet();
      if (editId) { var i = arr.findIndex(function (x) { return String(x.id) === String(editId); }); if (i >= 0) arr[i] = Object.assign(arr[i], rec); }
      else { rec.id = uid(); rec.created_at = new Date().toISOString(); arr.unshift(rec); }
      lsSet(arr); cache = arr; editId = null; pendFile = null; toast("Saved (this device)"); render(); return;
    }
    toast("Saving…");
    uploadThen(c, rec).then(function (rec2) {
      var q = editId ? c.from("services_log").update(rec2).eq("id", editId) : c.from("services_log").insert(rec2);
      return q.then(function (r) {
        if (r && r.error) { toast("Error: " + r.error.message); return; }
        cache = null; editId = null; pendFile = null;
        return load().then(function () { toast("Saved"); render(); });
      });
    }).catch(function (e) { toast("Error: " + (e && e.message ? e.message : e)); });
  }

  function uploadThen(c, rec) {
    if (!pendFile) return Promise.resolve(rec);
    var path = "svc_" + Date.now() + "_" + (pendFile.name || "doc").replace(/[^\w.\-]+/g, "_");
    return c.storage.from(BUCKET).upload(path, pendFile, { upsert: false, contentType: pendFile.type || undefined })
      .then(function (up) {
        if (up && up.error) throw up.error;
        var pub = c.storage.from(BUCKET).getPublicUrl(path);
        rec.file_name = pendFile.name; rec.file_path = path;
        rec.file_url = pub && pub.data ? pub.data.publicUrl : "";
        return rec;
      });
  }

  window.SERVICES = {
    open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); markActiveNav(); editId = null; pendFile = null; render(); },
    save: save, calc: calc,
    file: function (inp) { pendFile = inp.files && inp.files[0] ? inp.files[0] : null; render(); },
    clearFile: function () { pendFile = null; render(); },
    edit: function (id) { editId = id; pendFile = null; render(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    cancel: function () { editId = null; pendFile = null; render(); },
    del: function (id) {
      if (!confirm("Remove this service entry?")) return;
      var c = client();
      if (!c) { var arr = lsGet().filter(function (x) { return String(x.id) !== String(id); }); lsSet(arr); cache = arr; render(); return; }
      c.from("services_log").delete().eq("id", id).then(function () { cache = null; return load().then(render); });
    },
    search: function (v) { search = v; var host = $("view"); if (!host) return; render(); var el = $("svc-search"); if (el) { el.focus(); el.value = v; } }
  };

  function markActiveNav() {
    try { var nav = $("nav"); if (!nav) return; nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); }); var mine = $("svc-nav"); if (mine) mine.classList.add("active"); } catch (e) {}
  }
  function injectNav() {
    var nav = $("nav"); if (!nav) return;
    if ($("svc-nav")) return;
    var anchor = null, items = nav.querySelectorAll("[onclick]");
    for (var i = 0; i < items.length; i++) { var oc = items[i].getAttribute("onclick") || ""; if (oc.indexOf("recvlog") >= 0) { anchor = items[i]; break; } }
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "svc-nav";
    btn.setAttribute("onclick", "SERVICES.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="hand-platter"></i><span>Services</span>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  try { var mo = new MutationObserver(function () { injectNav(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); });
  else setTimeout(injectNav, 400);
})();

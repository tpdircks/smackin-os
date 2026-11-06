/* Edit trail screen. Reads audit_log with the signed-in session.
   Does not write audit rows. The database trigger does that. */
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null;
  var state = { table: "", user: "", from: "", to: "", sku: "", pk: "" };
  var rows = [];
  var err = "";
  var loading = false;
  var started = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function client() {
    if (sb) return sb;
    if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
    return sb;
  }
  function blob(row) {
    return ((row.row_pk || "") + " " + (row.operator || "") + " " +
      JSON.stringify(row.old_row || {}) + " " + JSON.stringify(row.new_row || {})).toLowerCase();
  }
  function matches(row) {
    if (state.table && row.table_name !== state.table) return false;
    if (state.user) {
      var who = ((row.user_email || "") + " " + (row.actor_role || "") + " " + (row.operator || "")).toLowerCase();
      if (who.indexOf(state.user.toLowerCase()) < 0) return false;
    }
    var text = blob(row);
    var pk = String(state.pk || "").toLowerCase();
    var sku = String(state.sku || "").toLowerCase();
    if (pk && sku) return text.indexOf(pk) >= 0 || text.indexOf(sku) >= 0;
    if (pk) return text.indexOf(pk) >= 0;
    if (sku) return text.indexOf(sku) >= 0;
    return true;
  }
  function who(row) {
    if (row.user_email) return row.user_email;
    if (row.actor_role) return row.actor_role;
    return "anon";
  }
  function when(v) {
    if (!v) return "";
    return String(v).replace("T", " ").replace(/\.\d+.*$/, "").replace(/\+.*/, "");
  }
  function cols(row) {
    var list = row.changed_columns || [];
    if (!list.length) return "";
    return list.slice(0, 8).join(", ");
  }
  function load() {
    var c = client();
    if (!c) { err = "Cloud database is not configured."; rows = []; return Promise.resolve(); }
    loading = true;
    err = "";
    var q = c.from("audit_log").select("id,table_name,row_pk,action,changed_at,user_id,user_email,actor_role,operator,note,changed_columns,old_row,new_row")
      .order("changed_at", { ascending: false })
      .limit(500);
    if (state.table) q = q.eq("table_name", state.table);
    if (state.from) q = q.gte("changed_at", state.from);
    if (state.to) q = q.lte("changed_at", state.to + "T23:59:59");
    return q.then(function (r) {
      loading = false;
      if (r && r.error) {
        rows = [];
        err = r.error.message || "Could not load history. Sign in, then try again.";
        return;
      }
      rows = (r && r.data) ? r.data : [];
    }).catch(function (e) {
      loading = false;
      rows = [];
      err = (e && e.message) || "Could not load history. Sign in, then try again.";
    });
  }
  function field(id, label, value, type) {
    return '<div><label>' + esc(label) + '</label><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value || "") + '"></div>';
  }
  function paint() {
    var host = document.getElementById("view");
    if (!host || !host.querySelector("#hist-root")) return;
    host.innerHTML = view();
  }
  function view() {
    if (!started) {
      started = true;
      load().then(paint);
    }
    var shown = rows.filter(matches);
    var body = "";
    if (loading) body = '<p class="muted">Loading history...</p>';
    else if (err) body = '<p class="hint">' + esc(err) + '</p>';
    else if (!shown.length) body = '<p class="muted">No history rows for this filter.</p>';
    else {
      body = '<div class="tblwrap"><table class="sortable"><thead><tr><th>When</th><th>Table</th><th>Action</th><th>Who</th><th>Operator</th><th>Record</th><th>Changed</th></tr></thead><tbody>' +
        shown.map(function (r) {
          var trail = (window.RECVSOP && RECVSOP.invoiceTrail) ? RECVSOP.invoiceTrail(r.old_row, r.new_row, r) : "";
          return '<tr><td class="sm">' + esc(when(r.changed_at)) + '</td><td>' + esc(r.table_name) + '</td><td>' + esc(r.action) + '</td><td>' + esc(who(r)) + '</td><td>' + esc(r.operator || "") + '</td><td class="sm">' + esc(r.row_pk || "") + '</td><td class="sm">' + esc(cols(r)) + (trail ? '<div>' + esc(trail) + '</div>' : '') + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    return '<div class="card" id="hist-root"><h2>History</h2>' +
      '<p class="hint">Every save recorded by the database. Signed-in changes show the person\'s email. Writes without a signed-in session show as anon. Sync heartbeats are not listed.</p>' +
      '<div class="row">' +
      field("hist-table", "Table", state.table) +
      field("hist-user", "Person", state.user) +
      field("hist-from", "From", state.from, "date") +
      field("hist-to", "To", state.to, "date") +
      field("hist-sku", "Item or SKU", state.sku || state.pk) +
      '</div>' +
      '<button class="primary" type="button" onclick="HIST.apply()">Apply filter</button>' +
      '<p class="hint">' + (loading ? "" : shown.length + " rows.") + '</p>' +
      body + '</div>';
  }
  function readFilters() {
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    state.table = val("hist-table");
    state.user = val("hist-user");
    state.from = val("hist-from");
    state.to = val("hist-to");
    state.sku = val("hist-sku");
    state.pk = "";
  }
  function button(table, pk, sku) {
    var payload = JSON.stringify({
      table: table || "",
      pk: pk == null ? "" : String(pk),
      sku: sku == null ? "" : String(sku)
    });
    return '<button type="button" class="ghost sm" data-hist="' +
      payload.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") +
      '" onclick="HIST.open(JSON.parse(this.getAttribute(\'data-hist\')))">History</button>';
  }
  window.HIST = {
    view: view,
    button: button,
    matches: matches,
    who: who,
    open: function (opts) {
      started = false;
      state = { table: "", user: "", from: "", to: "", sku: "", pk: "" };
      if (opts) {
        state.table = opts.table || "";
        state.user = opts.user || "";
        state.from = opts.from || "";
        state.to = opts.to || "";
        state.sku = opts.sku || "";
        state.pk = opts.pk || "";
      }
      rows = [];
      err = "";
      if (window.UI_go) window.UI_go("history");
    },
    apply: function () {
      readFilters();
      rows = [];
      err = "";
      loading = false;
      started = false;
      var host = document.getElementById("view");
      if (host) host.innerHTML = view();
    }
  };
})();

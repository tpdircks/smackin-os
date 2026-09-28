/* ============================================================================
   Smackin' OS - Production data upload  (mfg-upload.js)
   Lets Allen self-serve: drop a Mixing or P-Mac tracking spreadsheet and it
   parses the run rows and loads any NEW ones into mixing_history / pmac_history
   (deduped against what's already there). No more sending files to be loaded by
   hand. Adds an "Upload Production" item to the Manufacturing nav group.
   Uses the app's SheetJS (window.XLSX). Self-contained, no app.js edit.
   ==========================================================================*/
(function () {
  "use strict";
  var cfg = window.SMACKIN_CONFIG || {};
  var sb = null, parsed = null;   // parsed = {type, rows, fileName}

  function client() { if (!sb && window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) { try { sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); } catch (e) {} } return sb; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function num(v) { if (v == null || v === "") return null; var n = parseFloat(String(v).replace(/[, ]/g, "")); return isNaN(n) ? null : n; }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }

  function dstr(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + "-" + String(v.getMonth() + 1).padStart(2, "0") + "-" + String(v.getDate()).padStart(2, "0");
    var s = String(v).trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + "-" + String(+m[2]).padStart(2, "0") + "-" + String(+m[3]).padStart(2, "0");
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + "-" + String(+m[1]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0"); }
    m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})/); // e.g. 1-May-25
    if (m) { var mo = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }[m[2].slice(0, 3).toLowerCase()]; var yy = +m[3]; if (yy < 100) yy += 2000; if (mo) return yy + "-" + String(mo).padStart(2, "0") + "-" + String(+m[1]).padStart(2, "0"); }
    return "";
  }
  function tstr(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date && !isNaN(v)) return String(v.getHours()).padStart(2, "0") + ":" + String(v.getMinutes()).padStart(2, "0") + ":" + String(v.getSeconds()).padStart(2, "0");
    return String(v).trim();
  }
  function splitFlav(s) {
    s = String(s || "").trim();
    var m = s.match(/^\s*([A-Za-z]?\d{1,2}[A-Za-z]?)\s*[-–]?\s*(.*)$/);
    if (m) return { code: m[1].trim(), name: (m[2] || "").replace(/\*/g, "").trim() };
    return { code: "", name: s.replace(/\*/g, "").trim() };
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // find the header row + build a name->index map
  function headerMap(rows) {
    for (var i = 0; i < Math.min(20, rows.length); i++) {
      var r = rows[i] || [];
      var idx = {}, hasDate = false, hasFlav = false;
      for (var c = 0; c < r.length; c++) { var h = norm(r[c]); if (!h) continue; idx[h] = c; if (h === "date") hasDate = true; if (h.indexOf("flavor") >= 0) hasFlav = true; }
      if (hasDate && hasFlav) return { row: i, idx: idx };
    }
    return null;
  }
  function pick(idx, names) { for (var i = 0; i < names.length; i++) { var k = norm(names[i]); if (idx[k] != null) return idx[k]; } return -1; }

  function parseWorkbook(wb, fileName) {
    // try every sheet; pick the one that looks like a run detail table
    var best = null;
    wb.SheetNames.forEach(function (sn) {
      var rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true });
      var hm = headerMap(rows); if (!hm) return;
      var idx = hm.idx;
      var isPmac = idx[norm("Total Pkgs.")] != null || idx["totalpkgs"] != null || idx["bagsize"] != null || idx["boxcount"] != null;
      var isMix = idx["totalbins"] != null || idx["mach"] != null || idx[norm("Mach #")] != null;
      if (!isPmac && !isMix) return;
      var type = isPmac ? "pmac" : "mixing";
      var out = [];
      for (var i = hm.row + 1; i < rows.length; i++) {
        var r = rows[i] || []; if (!r.length) continue;
        var d = dstr(r[pick(idx, ["date"])]); if (!d || d.slice(0, 2) !== "20") continue;
        if (type === "pmac") {
          var fp = splitFlav(r[pick(idx, ["flavor"])]);
          out.push({ run_date: d, machine: String(r[pick(idx, ["machine", "mach#", "mach"])] || "").trim(), operator: String(r[pick(idx, ["operator", "operators"])] || "").trim(), status: String(r[pick(idx, ["active/inactive", "activeinactive", "status", "active"])] || "").trim(), dept: String(r[pick(idx, ["dept", "dept."])] || "P-Mac").trim(), shift: String(r[pick(idx, ["shift"])] || "").trim(), bag_size: String(r[pick(idx, ["bagsize", "bag size"])] || "").trim(), flavor_code: fp.code, flavor_name: fp.name, box_count: num(r[pick(idx, ["boxcount", "box count"])]), total_pkgs: num(r[pick(idx, ["totalpkgs", "total pkgs.", "totalpackages", "packages"])]) });
        } else {
          var fcCol = pick(idx, ["flavorcode", "flavor code", "code"]);
          var fnCol = pick(idx, ["flavor"]);
          var fc = fcCol >= 0 ? String(r[fcCol] || "").trim() : "";
          var fnRaw = fnCol >= 0 ? String(r[fnCol] || "").trim() : "";
          var fp2 = fc ? { code: fc, name: (fnRaw.indexOf("-") >= 0 ? splitFlav(fnRaw).name : fnRaw.replace(/\*/g, "").trim()) } : splitFlav(fnRaw);
          out.push({ run_date: d, operator: String(r[pick(idx, ["operator", "operators"])] || "").trim(), shift: String(r[pick(idx, ["shift"])] || "").trim(), team: String(r[pick(idx, ["team"])] || "").trim(), flavor_code: fp2.code, flavor_name: fp2.name, machine: String(r[pick(idx, ["mach#", "mach", "machine"])] || "").trim(), total_bins: num(r[pick(idx, ["totalbins", "total bins", "bins"])]), start_time: tstr(r[pick(idx, ["starttime", "start time", "start"])]), end_time: tstr(r[pick(idx, ["endtime", "end time", "end"])]), downtime_min: num(r[pick(idx, ["downtimeminutes", "downtime", "downtimemin"])]) });
        }
      }
      if (out.length && (!best || out.length > best.rows.length)) best = { type: type, rows: out, sheet: sn };
    });
    if (best) best.fileName = fileName;
    return best;
  }

  function keyOf(type, r) {
    return type === "pmac"
      ? [r.run_date, norm(r.operator), r.flavor_code, r.machine, r.total_pkgs, r.box_count].join("|")
      : [r.run_date, norm(r.operator), r.flavor_code, r.machine, r.total_bins].join("|");
  }

  // ---- UI ---------------------------------------------------------------
  function styleOnce() {
    if ($("mfg-up-style")) return;
    var s = document.createElement("style"); s.id = "mfg-up-style";
    s.textContent = [
      "#mfg-drop{border:2px dashed #b8c4d8;border-radius:14px;padding:34px 20px;text-align:center;color:#5a7bb0;background:#f7f9fc;cursor:pointer;transition:all .15s}",
      "#mfg-drop:hover,#mfg-drop.drag{border-color:#1F3864;background:#eef3fb;color:#1F3864}",
      "#mfg-drop .big{font-size:16px;font-weight:700;color:#1F3864}",
      ".mfg-up-msg{margin-top:14px;font-size:13.5px;line-height:1.5;padding:12px 14px;border-radius:9px;display:none}",
      ".mfg-up-msg.err{display:block;background:#fef2f2;color:#b52024;border:1px solid #fecaca}",
      ".mfg-up-msg.ok{display:block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}",
      ".mfg-up-msg.info{display:block;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
  }
  function msg(kind, html) { var m = $("mfg-up-msg"); if (m) { m.className = "mfg-up-msg " + kind; m.innerHTML = html; } }

  function render() {
    styleOnce();
    var host = $("view"); if (!host) return;
    host.innerHTML =
      '<div class="card"><h2>Upload Production Data</h2>' +
      '<p class="hint">Drop your Mixing Room or P-Mac tracking spreadsheet here (.xlsx, .xlsm, or .csv). ' +
      'It reads every run row and adds any new ones to the history &mdash; rows already loaded are skipped automatically, so it is safe to upload the whole file each time.</p>' +
      '<div id="mfg-drop"><div class="big">Drop a spreadsheet, or click to choose</div>' +
      '<div style="margin-top:6px;font-size:12.5px">Mixing Room Detail or P-Mac Detail &mdash; the file Allen keeps</div></div>' +
      '<input id="mfg-file" type="file" accept=".xlsx,.xlsm,.csv,.xls" style="display:none">' +
      '<div id="mfg-up-msg" class="mfg-up-msg"></div>' +
      '<div id="mfg-up-actions" style="margin-top:14px;display:none">' +
      '<button class="primary" id="mfg-import-btn">Import new rows</button> ' +
      '<button class="ghost" id="mfg-cancel-btn">Cancel</button></div>' +
      '</div>' +
      '<div class="card"><h2 class="sub2">What\'s on record now</h2><p class="muted" id="mfg-counts">Checking…</p></div>';
    wire();
    showCounts();
  }
  function showCounts() {
    var c = client(); if (!c) return;
    Promise.all([
      c.from("pmac_history").select("*", { count: "exact", head: true }),
      c.from("mixing_history").select("*", { count: "exact", head: true })
    ]).then(function (r) {
      var pm = (r[0] && r[0].count) || 0, mx = (r[1] && r[1].count) || 0;
      var el = $("mfg-counts"); if (el) el.textContent = fmt(pm) + " P-Mac runs and " + fmt(mx) + " Mixing runs currently loaded.";
    }).catch(function () {});
  }

  function wire() {
    var drop = $("mfg-drop"), file = $("mfg-file");
    drop.onclick = function () { file.click(); };
    file.onchange = function () { if (file.files && file.files[0]) handleFile(file.files[0]); };
    ["dragenter", "dragover"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove("drag"); }); });
    drop.addEventListener("drop", function (ev) { if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]); });
    $("mfg-cancel-btn").onclick = function () { parsed = null; $("mfg-up-actions").style.display = "none"; msg("info", "Cancelled."); };
    $("mfg-import-btn").onclick = doImport;
  }

  function handleFile(f) {
    if (!window.XLSX) { msg("err", "Spreadsheet reader not loaded &mdash; refresh and try again."); return; }
    msg("info", "Reading <b>" + esc(f.name) + "</b>…");
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb = window.XLSX.read(new Uint8Array(e.target.result), { type: "array", cellDates: true });
        var p = parseWorkbook(wb, f.name);
        if (!p || !p.rows.length) { msg("err", "Couldn't find a Mixing or P-Mac run table in that file. Make sure it's the tracker with the detail rows (Date, Operator, Flavor, etc.)."); $("mfg-up-actions").style.display = "none"; parsed = null; return; }
        parsed = p;
        var label = p.type === "pmac" ? "P-Mac packaging" : "Mixing";
        msg("info", "Found <b>" + fmt(p.rows.length) + "</b> " + label + " run rows in <b>" + esc(p.sheet) + "</b>. Click <b>Import new rows</b> to add any that aren't already loaded.");
        $("mfg-up-actions").style.display = "block";
      } catch (err) { msg("err", "Could not read that file: " + esc(err.message || err)); }
    };
    reader.onerror = function () { msg("err", "Could not read that file."); };
    reader.readAsArrayBuffer(f);
  }

  function doImport() {
    if (!parsed) return;
    var c = client(); if (!c) { msg("err", "Not connected."); return; }
    var table = parsed.type === "pmac" ? "pmac_history" : "mixing_history";
    var cols = parsed.type === "pmac"
      ? "run_date,operator,flavor_code,machine,total_pkgs,box_count"
      : "run_date,operator,flavor_code,machine,total_bins";
    $("mfg-import-btn").disabled = true;
    msg("info", "Checking for rows already loaded…");
    // pull existing keys (paginated)
    var existing = {}, step = 1000;
    function pull(from) {
      return c.from(table).select(cols).range(from, from + step - 1).then(function (r) {
        var d = (r && r.data) || []; d.forEach(function (row) { existing[keyOf(parsed.type, row)] = 1; });
        if (d.length === step) return pull(from + step);
      });
    }
    pull(0).then(function () {
      var fresh = parsed.rows.filter(function (row) { return !existing[keyOf(parsed.type, row)]; });
      if (!fresh.length) { msg("ok", "All " + fmt(parsed.rows.length) + " rows were already loaded &mdash; nothing new to add."); $("mfg-import-btn").disabled = false; return; }
      msg("info", "Adding <b>" + fmt(fresh.length) + "</b> new rows…");
      var ins = 0;
      function batch(i) {
        if (i >= fresh.length) { msg("ok", "Done. Added <b>" + fmt(ins) + "</b> new " + (parsed.type === "pmac" ? "P-Mac" : "Mixing") + " rows (" + fmt(parsed.rows.length - fresh.length) + " were already on record)."); $("mfg-up-actions").style.display = "none"; parsed = null; $("mfg-import-btn").disabled = false; showCounts(); return; }
        var chunk = fresh.slice(i, i + 100);
        c.from(table).insert(chunk).then(function (r) {
          if (r && r.error) { msg("err", "Import stopped: " + esc(r.error.message) + " (" + fmt(ins) + " added before the error)."); $("mfg-import-btn").disabled = false; return; }
          ins += chunk.length; msg("info", "Adding rows… " + fmt(ins) + " / " + fmt(fresh.length)); batch(i + 100);
        }).catch(function (e) { msg("err", "Import stopped: " + esc((e && e.message) || e)); $("mfg-import-btn").disabled = false; });
      }
      batch(0);
    }).catch(function (e) { msg("err", "Could not check existing rows: " + esc((e && e.message) || e)); $("mfg-import-btn").disabled = false; });
  }

  window.MFGUPLOAD = { open: function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); markActive(); render(); } };

  // ---- nav injection ----------------------------------------------------
  function markActive() { try { var nav = $("nav"); if (!nav) return; nav.querySelectorAll(".navitem.active").forEach(function (b) { b.classList.remove("active"); }); var m = $("mfg-up-nav"); if (m) m.classList.add("active"); } catch (e) {} }
  function injectNav() {
    var nav = $("nav"); if (!nav || $("mfg-up-nav")) return;
    var anchor = $("mfg-hist-nav");
    if (!anchor) { var items = nav.querySelectorAll("[onclick]"); for (var i = 0; i < items.length; i++) { if ((items[i].getAttribute("onclick") || "").indexOf("pmacout") >= 0) { anchor = items[i]; break; } } }
    var btn = document.createElement("button");
    btn.className = "navitem"; btn.id = "mfg-up-nav";
    btn.setAttribute("onclick", "MFGUPLOAD.open(event)");
    btn.innerHTML = '<i class="navico" data-lucide="upload"></i><span>Upload Production</span>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling); else nav.appendChild(btn);
    try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (e) {}
  }
  try { var mo = new MutationObserver(function () { injectNav(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 450); });
  else setTimeout(injectNav, 450);
})();

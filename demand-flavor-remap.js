/* ============================================================================
   Smackin' OS - Demand flavor remap (demand-flavor-remap.js)
   One-shot, cloud-gated pass that fills flavor and flavor_code on demand
   lines whose flavor_code is still blank.

   Troy's Oct 9-26 SPS imports stored distributor text as
   "UNMAPPED: SMACKIN SNFLWR SDS ORIG" (and the same shape for cheddar,
   ranch, cracked pepper, garlic parmesan, maple brown sugar). The
   abbreviation rules landed later, so those rows never got a code.
   Re-import only replaces Open lines for the same PO, and it does not
   rewrite a Shipped or Complete row. This pass updates the flavor fields
   in place.

   It uses DEMAND.resolveFlavor, which strips the UNMAPPED prefix, pack
   sizes (4Z, 4OZ), and brand/seed noise (SNFL, SNFLWR, SDS, SD) before
   the same rules a new import uses. A line that still does not match is
   left alone. Rows that already have a flavor_code are left alone.

   Writes flavor and flavor_code only. No deletes. Stock is not read or
   written. Status, qty, cases, and bags stay as they are.

   Idempotent. localStorage flag demand-flavor-remap-2026-10-30-v1 skips
   later loads. Bump the flag to run the pass again. ?flavorremap=dry logs
   the plan and does not write. ?flavorremap=force ignores the flag.
   ========================================================================== */
(function (root) {
  "use strict";

  var FLAG = "demand-flavor-remap-2026-10-30-v1";
  var PAGE = 1000;
  var READ_CAP = 20000;

  function blankCode(v) {
    return String(v == null ? "" : v).trim() === "";
  }

  function resolve(text) {
    var D = root.DEMAND;
    if (!D || typeof D.resolveFlavor !== "function") return null;
    var hit = D.resolveFlavor(text);
    if (!hit || !hit.flavor || !hit.flavor_code) return null;
    return { flavor: hit.flavor, flavor_code: hit.flavor_code };
  }

  // rows: demand_lines shaped { id, flavor, flavor_code }.
  // Returns patches of { id, flavor, flavor_code } only.
  function plan(rows) {
    var patches = [];
    (rows || []).forEach(function (r) {
      if (!r || r.id == null || r.id === "") return;
      if (!blankCode(r.flavor_code)) return;
      var hit = resolve(r.flavor);
      if (!hit) return;
      if (String(r.flavor || "") === hit.flavor && !blankCode(r.flavor_code)) return;
      patches.push({ id: r.id, flavor: hit.flavor, flavor_code: hit.flavor_code });
    });
    return patches;
  }

  function modeFlag() {
    var q = "";
    try { q = String(root.location && root.location.search || ""); } catch (e) { q = ""; }
    if (/flavorremap=dry/.test(q)) return "dry";
    if (/flavorremap=force/.test(q)) return "force";
    try { if (root.localStorage && root.localStorage.getItem("demand-flavor-remap-dry") === "1") return "dry"; } catch (e2) {}
    return "";
  }

  function done() {
    try { return root.localStorage.getItem(FLAG) || ""; } catch (e) { return ""; }
  }
  function markDone() {
    try { root.localStorage.setItem(FLAG, new Date().toISOString()); } catch (e) {}
  }

  function client() {
    var cfg = root.SMACKIN_CONFIG || {};
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!root.__demandFlavorClient) {
      try {
        root.__demandFlavorClient = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "demand-flavor-remap-auth" }
        });
      } catch (e) { return null; }
    }
    return root.__demandFlavorClient;
  }

  function ready() {
    return !!(root.DB && root.DB.mode === "cloud" && root.DEMAND && client());
  }

  function remember(id, patch) {
    try {
      var list = root.DB && root.DB.demandLines && root.DB.demandLines();
      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) {
          list[i].flavor = patch.flavor;
          list[i].flavor_code = patch.flavor_code;
          return;
        }
      }
    } catch (e) {}
  }

  async function readBlank(sb) {
    var out = [];
    var from = 0;
    while (out.length < READ_CAP) {
      var res = await sb.from("demand_lines").select("id,flavor,flavor_code").or("flavor_code.is.null,flavor_code.eq.").order("id", { ascending: true }).range(from, from + PAGE - 1);
      if (res && res.error) throw new Error(res.error.message || "read failed");
      var part = (res && res.data) || [];
      for (var i = 0; i < part.length; i++) out.push(part[i]);
      if (part.length < PAGE) break;
      from += part.length;
    }
    return out;
  }

  async function applyOne(sb, patch) {
    var res = await sb.from("demand_lines").update({
      flavor: patch.flavor,
      flavor_code: patch.flavor_code
    }).eq("id", patch.id).or("flavor_code.is.null,flavor_code.eq.").select("id,flavor,flavor_code");
    if (res && res.error) throw new Error(res.error.message || "update failed");
    var wrote = (res && res.data) || [];
    if (wrote.length) remember(patch.id, patch);
    return wrote.length;
  }

  async function audit(sb, n) {
    var res = await sb.from("transactions").insert({
      action: "Demand flavor remap",
      detail: "mapped " + n + " blank flavor codes",
      operator: FLAG
    });
    if (res && res.error) throw new Error(res.error.message || "audit failed");
  }

  var busy = false;
  async function run() {
    var flag = modeFlag();
    if (flag !== "force" && flag !== "dry" && done()) return true;
    if (!ready() || busy) return false;
    busy = true;
    var dry = flag === "dry";
    try {
      var sb = client();
      var rows = await readBlank(sb);
      var patches = plan(rows);
      console.log("[demand-flavor]", dry ? "dry" : "plan", patches.length, "of", rows.length);
      if (!dry) {
        var n = 0;
        for (var i = 0; i < patches.length; i++) n += await applyOne(sb, patches[i]);
        if (n) {
          try { await audit(sb, n); } catch (err) { console.warn("[demand-flavor] audit", err && err.message ? err.message : err); }
        }
        try { if (root.DB && root.DB.refresh) await root.DB.refresh(); } catch (e2) {}
        markDone();
      }
      busy = false;
      return true;
    } catch (e) {
      console.warn("[demand-flavor]", e && e.message ? e.message : e);
      busy = false;
      return false;
    }
  }

  root.DEMANDFLAVOR = {
    FLAG: FLAG,
    plan: plan,
    resolve: resolve,
    blankCode: blankCode,
    run: run
  };

  var tries = 0;
  function tick() {
    run().then(function (ok) {
      if (!ok && ++tries < 240) setTimeout(tick, 500);
    });
  }
  function start() { tick(); }
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }
})(typeof window !== "undefined" ? window : globalThis);

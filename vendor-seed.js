/* ============================================================================
   Smackin' OS - Vendor list seed (vendor-seed.js)
   One-shot, cloud-gated upsert of Vendor List contact, terms, and lead time
   onto the existing supplier rows (film, seed, seas, pack).

   There is no supplier-PO ledger in the workbook. This module does not read
   or write supplier_pos, and it does not import the customer Purchase Orders tab.

   Idempotent: a localStorage done-flag skips later loads. Re-running after the
   flag is cleared writes the same values again. ?vendorseed=dry logs the patch
   and does not write. ?vendorseed=force ignores the done-flag.
   Bucket supplier (buck) is left unchanged. Sticker Mule stays on pack.
   ========================================================================== */
(function (root) {
  "use strict";

  var FLAG = "vendor-seed-2026-10-28-v1";
  var PHONE_RAW = "612-849-7608\u202C";

  function cleanPhone(s) {
    return String(s == null ? "" : s).replace(/[\u202A-\u202E\u200B-\u200F\uFEFF]/g, "").trim();
  }

  function patches() {
    return {
      film: {
        lead_days: 14,
        lead_days_alt: 30,
        lead_note: "Belmark Inc. 14 days for 1.5oz film, 30 days for 4oz film. Sheet reorder level 15000, reorder qty 200000 (suggestion only).",
        contact_name: "Jon Walker",
        email: "jonw@belmark.com",
        phone: cleanPhone(PHONE_RAW),
        remit_to: "600 Heritage Road, De Pere, WI 54115-5310",
        payment_terms: "Net 30",
        how_to_order: "Contact vendor"
      },
      seed: {
        lead_days: 28,
        lead_days_alt: null,
        lead_note: "CHS lead is 4 weeks. Alternate seed vendor Sunrich: 21 days, Ashley Deal, ashley.deal@sunrich.com, 218-643-3335, Net 30. Sheet reorder level 10000, reorder qty 30000 (suggestion only).",
        contact_name: "Travis Schmidt",
        email: "Travis.Schmidt4@chsinc.com",
        phone: "701-799-4410",
        remit_to: "",
        payment_terms: "Net 30",
        how_to_order: "Contact vendor. Alternate seed vendor Sunrich, 21 days: Ashley Deal, ashley.deal@sunrich.com, 218-643-3335, Net 30."
      },
      seas: {
        lead_days: 21,
        lead_days_alt: null,
        lead_note: "Rocky Mountain Spice Co., 21 days (Joelle Freck). Excalibur seasoning is also 21 days, Net 30. Sheet reorder level for Excalibur is 300, reorder qty 1000 (suggestion only).",
        contact_name: "Joelle Freck",
        email: "JFreck@rockymountainspice.com",
        phone: "262-565-8957",
        remit_to: "",
        payment_terms: "Net 30",
        how_to_order: "Contact vendor"
      },
      pack: {
        lead_days: 14,
        lead_days_alt: null,
        lead_note: "PCA, 14 days (Errol Dolin). Sheet reorder levels (suggestion only): 12 ct boxes 7500, qty 15000; 36 ct boxes 250, qty 1000. Sticker Mule (stickers, poly mailers, double sampler poly mailers) is 7 days, terms Upfront. Sheet levels: stickers 1500 qty 5000, poly mailers 1500 qty 5000, double sampler poly mailers 250 qty 1000.",
        contact_name: "Errol Dolin",
        email: "ErrolDolin@packagingcorp.com",
        phone: "708-431-8445",
        remit_to: "",
        payment_terms: "Net 30",
        how_to_order: "Contact vendor. Sticker Mule (stickers, poly mailers, double sampler poly mailers): order by link, 7 day lead, terms Upfront."
      }
    };
  }

  function blank(v) { return v == null || v === ""; }
  function same(row, patch) {
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var a = row ? row[k] : null;
      var b = patch[k];
      if (blank(a) && blank(b)) continue;
      if (String(a) !== String(b)) return false;
    }
    return true;
  }

  function modeFlag() {
    var q = "";
    try { q = String(root.location && root.location.search || ""); } catch (e) { q = ""; }
    if (/vendorseed=dry/.test(q)) return "dry";
    if (/vendorseed=force/.test(q)) return "force";
    try { if (root.localStorage && root.localStorage.getItem("vendor-seed-dry") === "1") return "dry"; } catch (e2) {}
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
    if (!root.__vendorSeedClient) {
      try {
        root.__vendorSeedClient = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "vendor-seed-auth" }
        });
      }
      catch (e) { return null; }
    }
    return root.__vendorSeedClient;
  }

  function ready() {
    return !!(root.DB && root.DB.mode === "cloud" && root.DB.suppliers && root.DB.suppliers().length && client());
  }

  function remember(id, patch) {
    try {
      var list = root.DB.suppliers() || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) { Object.assign(list[i], patch); return; }
      }
    } catch (e) {}
  }

  async function applyOne(sb, id, patch, dry) {
    var cur = await sb.from("suppliers").select("*").eq("id", id).limit(1);
    if (cur && cur.error) throw new Error(cur.error.message || "read failed");
    var row = cur && cur.data && cur.data[0];
    if (!row) {
      console.warn("[vendor-seed] missing supplier", id);
      return "missing";
    }
    if (same(row, patch)) {
      remember(id, patch);
      return "same";
    }
    if (dry) {
      console.log("[vendor-seed] dry run", id, patch);
      return "dry";
    }
    var upd = await sb.from("suppliers").update(patch).eq("id", id).select("id");
    if (upd && upd.error) throw new Error(upd.error.message || "update failed");
    remember(id, patch);
    return "updated";
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
      var all = patches();
      var ids = Object.keys(all);
      var report = {};
      for (var i = 0; i < ids.length; i++) {
        report[ids[i]] = await applyOne(sb, ids[i], all[ids[i]], dry);
        if (report[ids[i]] === "missing") { busy = false; return false; }
      }
      console.log("[vendor-seed]", dry ? "dry run" : "applied", report);
      if (!dry) {
        markDone();
        try { if (root.DB.refresh) await root.DB.refresh(); } catch (e) {}
      }
      busy = false;
      return true;
    } catch (e) {
      console.warn("[vendor-seed]", e && e.message ? e.message : e);
      busy = false;
      return false;
    }
  }

  root.VENDORSEED = { cleanPhone: cleanPhone, patches: patches, run: run, same: same };

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

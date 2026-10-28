/* ============================================================================
   Smackin' Inventory — configuration
   These two values connect the app to your shared Supabase CLOUD database.
   The publishable key is safe to ship in the browser (Row Level Security is on).
   Leave both blank to run locally (data saved only in this browser).
   ============================================================================ */
window.SMACKIN_CONFIG = {
  SUPABASE_URL: "https://otwjxqhhwljwfyqbfuxz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY",
  ORG_NAME: "Smackin' Snacks — SLC Fulfillment",
  // Exact SQF audit day. The Quality SQF Tasks countdown uses this until Monica confirms the day.
  SQF_AUDIT_DATE: "2027-01-31"
  // Shipments are synced by the shipping-sync edge function.
  // SHIPPING_PROVIDER selects the adapter. Today: xpo,worldwide.
  // Later: easypost. shipstation and globalship stay selectable.
  // Credentials are not stored here.
};

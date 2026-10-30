/* ============================================================================
   Smackin' OS - Retail vs E-Commerce order lanes (order-lanes.js)
   Fulfillment must not add EDI/SPS retail orders and Shopify, TikTok,
   ShipStation, Faire, or Stripe e-commerce orders into one count.
   No network. No writes.
   ========================================================================== */
(function (root) {
  "use strict";

  // Same wholesale names demand.js cleanPartner already treats as retail EDI.
  var RETAIL_RE = /\b(mclane|scheels|target|kehe|wal-?mart|walmart|unfi|supervalu|millbrook|bass\s*pro|sportsman|vistar|core-?mark|fareway|hy-?vee|cooper\s*booth|costco|kroger|sam'?s\s*club|meijer|safeway|albertsons|sysco|dot foods|awg)\b/i;
  var ECOM_RE = /shopify|tik\s?tok|ship\s?station|faire|\bstripe\b|\bamazon\b|\bamzn\b|\bfba\b|\bdtc\b|e-?commerce/i;
  var EDI_RE = /\b(sps|edi|shipiq|bill of lading)\b/i;
  var LANE_RE = /\[\[LANE:(retail|ecom)\]\]/i;

  function isSps(o) {
    if (root.SPSMap && typeof root.SPSMap.isSpsOrder === "function") return !!root.SPSMap.isSpsOrder(o);
    var by = String(o && o.entered_by || "").toLowerCase();
    if (by === "sps feed" || by === "sps sync") return true;
    return /\[\[SPS\]\]/.test(String(o && o.notes || ""));
  }
  function blob(parts) {
    return parts.map(function (p) { return p == null ? "" : String(p); }).join(" ");
  }
  function channel(o) {
    if (!o) return "ecom";
    if (isSps(o)) return "retail";
    var text = blob([o.customer, o.entered_by, o.notes, o.order_id, o.customer_po, o.carrier]);
    if (String(o.stripe_link || "").trim() || ECOM_RE.test(text)) return "ecom";
    if (RETAIL_RE.test(text) || EDI_RE.test(text)) return "retail";
    var tagged = String(o.notes || "").match(LANE_RE);
    if (tagged) return tagged[1].toLowerCase();
    return "ecom";
  }
  function demandChannel(line) {
    if (!line) return "retail";
    var text = blob([line.source, line.partner, line.customer, line.imported_by, line.batch_label, line.notes]);
    if (ECOM_RE.test(text)) return "ecom";
    return "retail";
  }
  function displayNotes(notes) {
    return String(notes || "").replace(/\[\[LANE:(?:retail|ecom)\]\]\s*/ig, "").trim();
  }
  function stamp(notes, lane) {
    var n = displayNotes(notes);
    if (lane !== "retail" && lane !== "ecom") lane = "ecom";
    return "[[LANE:" + lane + "]]" + (n ? " " + n : "");
  }

  var api = {
    channel: channel,
    demandChannel: demandChannel,
    displayNotes: displayNotes,
    stamp: stamp,
    current: function () { return "retail"; }
  };
  root.ORDER_LANE = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

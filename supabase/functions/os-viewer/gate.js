// Pure request rules for the read-only ERP gateway. No secrets.
// Node tests import this file. The Deno server imports it too.

export var TABLES = [
  "audit_log",
  "batch_records",
  "coa_docs",
  "consumption",
  "demand_forecast",
  "demand_lines",
  "ecom_demand",
  "fulfillment_daily",
  "fulfillment_errors",
  "hold_log",
  "improvements",
  "incident_reports",
  "items",
  "kv_status",
  "launch_pipeline",
  "line_status",
  "machine_live",
  "maintenance_items",
  "mfg_daily",
  "mixing_history",
  "order_docs",
  "orders",
  "pmac_history",
  "pmac_log",
  "po_lines",
  "production_days",
  "production_orders",
  "production_output",
  "production_pallets",
  "purchase_orders",
  "qc_forms",
  "quality_logs",
  "rd_requests",
  "rd_test_log",
  "receiving_log",
  "reference_docs",
  "returns_log",
  "seasoning_lots",
  "seed_lots",
  "services_log",
  "shipping_log",
  "sku_catalog",
  "sku_map",
  "sps_transactions",
  "sqf_tasks",
  "stock",
  "stock_build",
  "supplier_pos",
  "suppliers",
  "time_off",
  "time_off_groups",
  "time_off_holidays",
  "time_off_sync",
  "trace_events",
  "trace_labels",
  "transactions",
  "wip_production_daily"
];

var DEFAULT_LIMIT = 200;
var MAX_LIMIT = 20000;

function safeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  if (!a || !b || a.length !== b.length) return false;
  var n = 0;
  for (var i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
}

export function isSafeName(name) {
  return /^[a-z][a-z0-9_]*$/.test(String(name || ""));
}

export function tablesFromOpenApi(spec) {
  var paths = spec && spec.paths ? spec.paths : {};
  var out = [];
  Object.keys(paths).forEach(function (p) {
    var m = /^\/([a-z][a-z0-9_]*)\/?$/.exec(p);
    if (!m) return;
    if (m[1] === "rpc") return;
    out.push(m[1]);
  });
  return out;
}

function allowedMap(extra) {
  var m = {};
  TABLES.forEach(function (t) { m[t] = true; });
  (extra || []).forEach(function (t) {
    if (isSafeName(t)) m[t] = true;
  });
  return m;
}

function tokenFrom(headers) {
  headers = headers || {};
  var auth = "";
  var apiKey = "";
  Object.keys(headers).forEach(function (k) {
    var lk = k.toLowerCase();
    if (lk === "authorization") auth = String(headers[k] || "");
    if (lk === "x-api-key") apiKey = String(headers[k] || "");
  });
  var bearer = auth.replace(/^Bearer\s+/i, "").trim();
  return bearer || apiKey.trim();
}

export function dataHeaders(apiKey, readerKey) {
  return {
    apikey: apiKey,
    Authorization: "Bearer " + readerKey,
    Accept: "application/json"
  };
}

export function decide(input) {
  input = input || {};
  var method = String(input.method || "GET").toUpperCase();
  var viewerToken = String(input.viewerToken || "");
  var readerKey = String(input.readerKey || "");
  var publishableKey = String(input.publishableKey || "");
  var allowed = allowedMap(input.extraTables);
  var names = Object.keys(allowed).sort();

  if (method === "OPTIONS") return { status: 204, body: null };
  if (!viewerToken || !safeEqual(tokenFrom(input.headers), viewerToken)) {
    return { status: 401, body: { error: "unauthorized" } };
  }
  if (method !== "GET") {
    return { status: 405, body: { error: "read-only: only GET is allowed" } };
  }
  if (!readerKey || (publishableKey && readerKey === publishableKey)) {
    return { status: 503, body: { error: "Read-only key is not configured." } };
  }

  var seg = String(input.segment || "");
  var action = String(input.action || "");
  if (seg === "tables" || action === "tables") {
    return { status: 200, body: { tables: names, read_only: true } };
  }

  var table = String(input.table || "");
  if (!table) {
    return {
      status: 400,
      body: {
        error: "Read-only gateway. Use /tables to list, or ?table=<name> with PostgREST filters.",
        tables: names
      }
    };
  }
  if (!isSafeName(table) || !allowed[table]) {
    return { status: 400, body: { error: "unknown table: " + table, allowed: names } };
  }

  var params = input.params || {};
  var fwd = {};
  Object.keys(params).forEach(function (k) {
    if (k === "table" || k === "action") return;
    fwd[k] = params[k];
  });
  var limit = parseInt(fwd.limit, 10);
  if (!fwd.limit || !isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  fwd.limit = String(limit);
  return { status: 200, forward: { table: table, params: fwd } };
}

#!/usr/bin/env node
/* os-viewer is GET-only and will not read as anon. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var url = require("url");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var census = ["batch_records","coa_docs","consumption","demand_forecast","demand_lines","ecom_demand","fulfillment_daily","fulfillment_errors","hold_log","improvements","incident_reports","items","kv_status","launch_pipeline","line_status","machine_live","maintenance_items","mfg_daily","mixing_history","order_docs","orders","pmac_history","pmac_log","po_lines","production_days","production_orders","production_output","production_pallets","purchase_orders","qc_forms","quality_logs","rd_requests","rd_test_log","receiving_log","reference_docs","returns_log","seasoning_lots","seed_lots","services_log","shipping_log","sku_catalog","sku_map","sps_transactions","sqf_tasks","stock","stock_build","supplier_pos","suppliers","time_off","time_off_groups","time_off_holidays","time_off_sync","trace_events","trace_labels","transactions","wip_production_daily"];

async function main() {
  var gate = await import(url.pathToFileURL(path.join(root, "supabase/functions/os-viewer/gate.js")).href);
  var src = read("supabase/functions/os-viewer/index.js") + read("supabase/functions/os-viewer/gate.js");
  var sql = read("supabase/migrations/20261106095944_erp_reader.sql");
  census.forEach(function (name) {
    eq(gate.TABLES.indexOf(name) >= 0, "missing " + name);
  });
  eq(gate.TABLES.indexOf("audit_log") >= 0, "audit_log");
  eq(src.indexOf("smk_view_") < 0, "viewer bearer is not in the repo");
  eq(src.indexOf("ERP_READER_KEY") >= 0 && src.indexOf("OS_VIEWER_TOKEN") >= 0, "secrets come from the environment");
  eq(read("supabase/config.toml").indexOf("[functions.os-viewer]") >= 0, "config");
  eq(!/revoke\s+[^;]*\banon\b/i.test(sql), "erp migration does not revoke anon");
  eq(!/revoke\s+[^;]*\bauthenticated\b/i.test(sql), "erp migration does not revoke authenticated");
  eq(sql.indexOf("grant select on all tables in schema public to erp_reader") >= 0, "select grant");
  eq(sql.indexOf("erp_reader_select") >= 0, "select policy");
  eq(sql.indexOf("alter default privileges") >= 0, "future tables");

  var token = "viewer-test-token";
  var reader = "reader-jwt-not-the-publishable-key";
  var pub = "sb_publishable_test";
  var headers = { authorization: "Bearer " + token };
  eq(gate.decide({ method: "GET", headers: {}, viewerToken: token, readerKey: reader, publishableKey: pub }).status === 401, "missing bearer");
  eq(gate.decide({ method: "POST", headers: headers, viewerToken: token, readerKey: reader, publishableKey: pub }).status === 405, "post blocked");
  eq(gate.decide({ method: "GET", headers: headers, viewerToken: token, readerKey: "", publishableKey: pub, table: "items" }).status === 503, "no anon fallback");
  eq(gate.decide({ method: "GET", headers: headers, viewerToken: token, readerKey: pub, publishableKey: pub, table: "items" }).status === 503, "publishable key is not the reader");
  var ok = gate.decide({ method: "GET", headers: headers, viewerToken: token, readerKey: reader, publishableKey: pub, table: "pmac_history", params: { table: "pmac_history", select: "*" } });
  eq(ok.status === 200 && ok.forward.table === "pmac_history" && ok.forward.params.limit === "200" && ok.forward.params.select === "*", "default limit keeps every column");
  var capped = gate.decide({ method: "GET", headers: headers, viewerToken: token, readerKey: reader, publishableKey: pub, table: "orders", params: { table: "orders", limit: "999999" } });
  eq(capped.forward.params.limit === "20000", "limit cap");
  eq(gate.decide({ method: "GET", headers: headers, viewerToken: token, readerKey: reader, publishableKey: pub, table: "rpc/fn_apply_delta" }).status === 400, "rpc blocked");
  var discovered = gate.decide({
    method: "GET", headers: headers, viewerToken: token, readerKey: reader, publishableKey: pub,
    table: "future_widget", extraTables: gate.tablesFromOpenApi({ paths: { "/future_widget": {}, "/rpc/fn_apply_delta": {} } })
  });
  eq(discovered.status === 200 && discovered.forward.table === "future_widget", "openapi tables are readable");
  var hdrs = gate.dataHeaders(pub, reader);
  eq(hdrs.apikey === pub && hdrs.Authorization === "Bearer " + reader, "reader key is the database credential");
  eq(read("docs/erp-reader.md").indexOf("ERP_READER_KEY") >= 0, "docs");

  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("ok os-viewer " + gate.TABLES.length);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});

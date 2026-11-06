// os-viewer: GET-only gateway for Brian and Cole.
// The caller sends the shared bearer (OS_VIEWER_TOKEN).
// Database reads use ERP_READER_KEY, a JWT whose role claim is erp_reader.
// The publishable key is only the apikey project identifier. It is not the
// database role. If the reader key is missing, this function refuses the
// request instead of falling back to anon.
// Docs: docs/erp-reader.md

import { decide, dataHeaders, tablesFromOpenApi } from "./gate.js";

var SUPABASE_URL = "https://otwjxqhhwljwfyqbfuxz.supabase.co";
var PUBLISHABLE = env("OS_VIEWER_APIKEY") || "sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY";
var extra = [];
var extraAt = 0;
var cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

function env(name) {
  try { return String(Deno.env.get(name) || "").trim(); } catch (e) { return ""; }
}

function json(body, status) {
  return new Response(JSON.stringify(body, null, 2), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json" }, cors)
  });
}

async function refreshExtra(readerKey) {
  if (extraAt && Date.now() - extraAt < 5 * 60 * 1000) return;
  try {
    var res = await fetch(SUPABASE_URL + "/rest/v1/", {
      headers: Object.assign({ Accept: "application/openapi+json" }, dataHeaders(PUBLISHABLE, readerKey))
    });
    if (!res.ok) return;
    var spec = await res.json();
    extra = tablesFromOpenApi(spec);
    extraAt = Date.now();
  } catch (e) {
    extraAt = Date.now();
  }
}

Deno.serve(async function (req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  var url = new URL(req.url);
  var headers = {};
  req.headers.forEach(function (v, k) { headers[k] = v; });
  var params = {};
  url.searchParams.forEach(function (v, k) { params[k] = v; });
  var viewer = env("OS_VIEWER_TOKEN");
  var reader = env("ERP_READER_KEY");
  if (reader && reader !== PUBLISHABLE) await refreshExtra(reader);
  var seg = url.pathname.split("/").filter(Boolean).pop() || "";
  var decision = decide({
    method: req.method,
    headers: headers,
    viewerToken: viewer,
    readerKey: reader,
    publishableKey: PUBLISHABLE,
    segment: seg,
    action: params.action || "",
    table: params.table || "",
    params: params,
    extraTables: extra
  });
  if (!decision.forward) return json(decision.body, decision.status);
  var qs = new URLSearchParams(decision.forward.params).toString();
  var upstream = await fetch(
    SUPABASE_URL + "/rest/v1/" + decision.forward.table + "?" + qs,
    { headers: dataHeaders(PUBLISHABLE, reader) }
  );
  var text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: Object.assign({ "content-type": "application/json" }, cors)
  });
});

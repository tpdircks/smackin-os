// prod-tracking-sync
// SharePoint source of truth (Allen Back):
//   Site: Production
//   Path: /sites/Production/Shared Documents/Production Files/1736 - Production Tracking_v12.xlsm
//   Web: https://netorgft5175778.sharepoint.com/:x:/r/sites/Production/_layouts/15/Doc.aspx?sourcedoc=%7B1AA0318A-B5BA-499E-97E3-0F3D300DF8AE%7D&file=1736%20-%20Production%20Tracking_v12.xlsm&fromShare=true&action=default&mobileredirect=true
//   Sourcedoc / item GUID: 1AA0318A-B5BA-499E-97E3-0F3D300DF8AE
// Sheet synced: Detail only (header row: Date, Machine, Operator, Active/ Inactive, Dept., Shift, Bag Size, Flavor, Box Count, Total Pkgs.).
// Mixing Detail is in the same workbook and is NOT imported. Allen will update Mixing before that link is turned on.
// This file remains the single linked source for Mixing later.
// Live Graph pull secrets: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.
//   The app needs application permission to read the Production site (Files.Read.All or Sites.Selected).
// Optional overrides: MS_SITE_HOST, MS_SITE_PATH, MS_FILE_PATH, MS_DRIVE_ITEM_ID,
//   PMAC_STORAGE_BUCKET, PMAC_STORAGE_OBJECT.
// Fallback when those secrets are missing: Storage bucket production-tracking,
//   object 1736-Production-Tracking_v12.xlsm.
// After a successful upload or Graph download, those bytes are upserted into
// that bucket with the service role. The publishable/anon key cannot write
// the bucket, so a client-side storage upload is not the refresh path.
// Manual push: POST JSON { "workbook_base64": "..." } or the raw workbook bytes.
// Writes kv_status keys pmac:last_sync and pmac:source. Lock key pmac:lock.
// Inserts missing pmac_history rows only. Dedupe key matches mfg-upload.js:
//   run_date|norm(operator)|flavor_code|machine|total_pkgs|box_count
// verify_jwt is false. Callers still must send the publishable key, anon key, or service role.

import { SOURCE, notConnectedMessage, parseDetailSheet, planInserts, shouldPersistWorkbook } from "./parse.js";

var PUBLISHABLE = "sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY";
var LOCK_MS = 4 * 60 * 1000;
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pmac-upload",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json" }, CORS)
  });
}
function env(name) {
  try { return String(Deno.env.get(name) || "").trim(); } catch (e) { return ""; }
}
function redact(s) {
  var out = String(s || "");
  try {
    ["MS_CLIENT_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"].forEach(function (name) {
      var v = Deno.env.get(name) || "";
      if (v && v.length > 6) out = out.split(v).join("***");
    });
  } catch (e) { /* env is not readable in every runtime */ }
  return out
    .replace(/client_secret=[^&\s]+/gi, "client_secret=***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .slice(0, 300);
}
function authorized(req) {
  var api = req.headers.get("apikey") || "";
  var auth = req.headers.get("authorization") || "";
  var bearer = auth.toLowerCase().indexOf("bearer ") === 0 ? auth.slice(7).trim() : "";
  var anon = env("SUPABASE_ANON_KEY");
  var service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (service && (bearer === service || api === service)) return true;
  if (anon && (bearer === anon || api === anon)) return true;
  if (api === PUBLISHABLE || bearer === PUBLISHABLE) return true;
  return false;
}
function encFilter(value) {
  return encodeURIComponent(String(value == null ? "" : value)).replace(/[!'()*]/g, function (c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function pgEq(column, value) {
  if (!/^[a-z_]+$/.test(column)) throw new Error("bad filter column");
  var raw = value == null ? "" : String(value);
  var filter;
  if (typeof value === "number" || /^-?\d+$/.test(raw)) filter = column + "=eq." + raw;
  else filter = column + "=eq." + encFilter(raw);
  if (filter.indexOf('"') >= 0 || filter.indexOf("'") >= 0) throw new Error("refusing a quoted PostgREST filter");
  return filter;
}
async function rest(path, opts) {
  var base = env("SUPABASE_URL").replace(/\/+$/, "");
  var key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Supabase service role is not available in the function environment");
  var res = await fetch(base + "/rest/v1/" + path, {
    method: (opts && opts.method) || "GET",
    headers: Object.assign({
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json"
    }, (opts && opts.headers) || {}),
    body: opts && opts.body != null ? JSON.stringify(opts.body) : undefined
  });
  var text = await res.text();
  if (!res.ok) throw new Error("supabase " + res.status + " " + path.split("?")[0] + " " + text.slice(0, 240));
  if (!text) return null;
  return JSON.parse(text);
}
async function getKv(key) {
  var rows = await rest("kv_status?select=value&" + pgEq("key", key) + "&limit=1");
  if (!rows || !rows.length || !rows[0].value) return null;
  try { return JSON.parse(rows[0].value); } catch (e) { return null; }
}
async function setKv(key, obj) {
  await rest("kv_status?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: { key: key, value: JSON.stringify(obj), updated_at: new Date().toISOString() }
  });
}
function graphConfigured() {
  return !!(env("MS_TENANT_ID") && env("MS_CLIENT_ID") && env("MS_CLIENT_SECRET"));
}
function siteHost() { return env("MS_SITE_HOST") || SOURCE.siteHost; }
function sitePath() {
  var p = env("MS_SITE_PATH") || SOURCE.sitePath;
  return p.charAt(0) === "/" ? p : "/" + p;
}
function drivePath() { return (env("MS_FILE_PATH") || SOURCE.drivePath).replace(/^\/+/, ""); }
function storageBucket() { return env("PMAC_STORAGE_BUCKET") || SOURCE.storageBucket; }
function storageObject() { return env("PMAC_STORAGE_OBJECT") || SOURCE.storageObject; }
function storageLabel() { return storageBucket() + "/" + storageObject(); }
function sourceRecord() {
  return {
    name: SOURCE.name,
    file: SOURCE.file,
    site: SOURCE.site,
    path: SOURCE.sharePointPath,
    drive_path: drivePath(),
    web_url: SOURCE.webUrl,
    sourcedoc: SOURCE.sourcedoc,
    sheet: SOURCE.sheet,
    mixing: SOURCE.mixing,
    mixing_note: "Mixing Detail is in this workbook and is not imported yet.",
    storage_bucket: storageBucket(),
    storage_object: storageObject(),
    site_host: siteHost(),
    site_path: sitePath(),
    at: new Date().toISOString()
  };
}
function b64ToBytes(b64) {
  var clean = String(b64 || "").replace(/^data:[^,]*,/, "").replace(/\s/g, "");
  if (!clean) throw new Error("workbook_base64 was empty.");
  var bin = atob(clean);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function readUpload(req) {
  if (req.method !== "POST") return null;
  var ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.indexOf("application/json") >= 0 || ct.indexOf("+json") >= 0) {
    var text = await req.text();
    if (!text.trim()) return null;
    var body;
    try { body = JSON.parse(text); } catch (e) { throw new Error("POST body was not valid JSON."); }
    var b64 = body && (body.workbook_base64 || body.file_base64 || body.xlsx_base64);
    if (!b64) return null;
    return { bytes: b64ToBytes(b64), source: "upload" };
  }
  if (ct.indexOf("multipart/form-data") >= 0) {
    var form = await req.formData();
    var file = form.get("file") || form.get("workbook");
    if (!file || typeof file.arrayBuffer !== "function") return null;
    return { bytes: new Uint8Array(await file.arrayBuffer()), source: "upload" };
  }
  if (ct.indexOf("octet-stream") >= 0 || ct.indexOf("spreadsheet") >= 0 || ct.indexOf("macroenabled") >= 0 || req.headers.get("x-pmac-upload")) {
    return { bytes: new Uint8Array(await req.arrayBuffer()), source: "upload" };
  }
  return null;
}
async function graphToken() {
  var tenant = env("MS_TENANT_ID");
  var client = env("MS_CLIENT_ID");
  var secret = env("MS_CLIENT_SECRET");
  var body = new URLSearchParams();
  body.set("client_id", client);
  body.set("client_secret", secret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");
  var res = await fetch("https://login.microsoftonline.com/" + encodeURIComponent(tenant) + "/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  });
  var text = await res.text();
  if (!res.ok) throw new Error("Microsoft token request failed (" + res.status + "). Check MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET.");
  var parsed;
  try { parsed = JSON.parse(text); } catch (e) { throw new Error("Microsoft token response was not JSON."); }
  if (!parsed.access_token) throw new Error("Microsoft token response had no access token.");
  return parsed.access_token;
}
async function graphGetJson(token, path) {
  var res = await fetch("https://graph.microsoft.com/v1.0" + path, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" }
  });
  var text = await res.text();
  if (!res.ok) throw new Error("Microsoft Graph " + res.status + " " + path.split("?")[0] + " " + text.slice(0, 180));
  return JSON.parse(text);
}
async function graphBytes() {
  var token = await graphToken();
  var site = await graphGetJson(token, "/sites/" + siteHost() + ":" + sitePath());
  if (!site || !site.id) throw new Error("Microsoft Graph did not return the Production site id.");
  var item = env("MS_DRIVE_ITEM_ID");
  var path;
  if (item) {
    if (!/^[A-Za-z0-9!_.-]+$/.test(item)) throw new Error("MS_DRIVE_ITEM_ID is not a drive item id.");
    path = "/sites/" + site.id + "/drive/items/" + item + "/content";
  } else {
    var encoded = drivePath().split("/").filter(Boolean).map(encodeURIComponent).join("/");
    path = "/sites/" + site.id + "/drive/root:/" + encoded + ":/content";
  }
  var res = await fetch("https://graph.microsoft.com/v1.0" + path, {
    headers: { Authorization: "Bearer " + token },
    redirect: "follow"
  });
  if (res.status === 404) {
    throw new Error("Graph did not find " + SOURCE.file + " at " + drivePath() + ". Set MS_FILE_PATH if the drive path differs.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Microsoft Graph refused the app (HTTP " + res.status + "). The app needs read access to the Production site.");
  }
  if (!res.ok) throw new Error("Microsoft Graph download failed (" + res.status + ").");
  return { bytes: new Uint8Array(await res.arrayBuffer()), source: "graph" };
}
function storageObjectUrl() {
  var base = env("SUPABASE_URL").replace(/\/+$/, "");
  var bucket = encodeURIComponent(storageBucket());
  var object = storageObject().split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return base + "/storage/v1/object/" + bucket + "/" + object;
}
function serviceKey() {
  var key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!env("SUPABASE_URL") || !key) throw new Error("Supabase service role is not available in the function environment");
  return key;
}
async function storageBytes() {
  var key = serviceKey();
  var res = await fetch(storageObjectUrl(), { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (res.status === 400 || res.status === 404) return { missing: true };
  if (!res.ok) throw new Error("storage " + res.status + " " + (await res.text()).slice(0, 180));
  return { bytes: new Uint8Array(await res.arrayBuffer()), source: "storage" };
}
// Replace the canonical object. POST + x-upsert covers a missing object and a
// replacement. The service role bypasses storage RLS, so the bucket stays
// closed to the publishable key. Raw bytes, not multipart, so the stored file
// is the workbook itself.
async function storeWorkbook(bytes) {
  if (!bytes || !bytes.byteLength) throw new Error("Refusing to store an empty workbook.");
  var key = serviceKey();
  var res = await fetch(storageObjectUrl(), {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/vnd.ms-excel.sheet.macroenabled.12",
      "cache-control": "no-cache",
      "x-upsert": "true"
    },
    body: bytes
  });
  var text = await res.text();
  if (!res.ok) throw new Error("storage write " + res.status + " " + text.slice(0, 180));
}
async function loadExisting() {
  var all = [];
  var offset = 0;
  var step = 1000;
  for (;;) {
    var rows = await rest(
      "pmac_history?select=id,run_date,operator,flavor_code,machine,total_pkgs,box_count&order=id.asc&limit=" + step + "&offset=" + offset
    );
    var page = rows || [];
    all = all.concat(page);
    if (page.length < step) break;
    offset += step;
  }
  return all;
}
async function deleteDupes(ids) {
  var removed = 0;
  for (var i = 0; i < ids.length; i += 50) {
    var part = ids.slice(i, i + 50);
    part.forEach(function (id) {
      if (!/^[0-9]+$/.test(String(id))) throw new Error("bad duplicate id");
    });
    await rest("pmac_history?id=in.(" + part.join(",") + ")", {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
    removed += part.length;
  }
  return removed;
}
async function insertFresh(rows) {
  var inserted = 0;
  for (var i = 0; i < rows.length; i += 100) {
    var chunk = rows.slice(i, i + 100);
    var got = await rest("pmac_history", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: chunk
    });
    if (!got || got.length !== chunk.length) {
      throw new Error("A batch was not confirmed (" + inserted + " added before that).");
    }
    inserted += got.length;
  }
  return inserted;
}
function summaryMessage(pack, inserted, skipped, removed, repeated) {
  var bits = [];
  if (pack.source === "upload") bits.push("Loaded the workbook from the upload.");
  else if (pack.source === "storage") bits.push("Microsoft Graph is not connected yet (missing_secrets). Loaded the workbook from Storage.");
  else bits.push("Loaded the Detail sheet from SharePoint.");
  bits.push("Added " + inserted + " new P-Mac rows. " + skipped + " were already on record.");
  if (repeated) bits.push("Skipped " + repeated + " repeated rows in the file.");
  if (removed) bits.push("Removed " + removed + " duplicate rows that shared an existing key.");
  return bits.join(" ");
}

Deno.serve(async function (req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!authorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
  var locked = false;
  try {
    await setKv("pmac:source", sourceRecord());
    var lock = await getKv("pmac:lock");
    if (lock && lock.at && Date.now() - Date.parse(lock.at) < LOCK_MS) {
      return json({ ok: true, skipped: "busy" });
    }
    await setKv("pmac:lock", { at: new Date().toISOString() });
    locked = true;

    var pack = await readUpload(req);
    if (!pack && graphConfigured()) pack = await graphBytes();
    if (!pack) {
      var stored = await storageBytes();
      if (stored.missing) {
        var message = notConnectedMessage(storageLabel());
        var miss = {
          at: new Date().toISOString(),
          ok: false,
          error: "missing_secrets",
          missing_secrets: true,
          missing_file: true,
          sheet: SOURCE.sheet,
          file: SOURCE.file,
          message: message
        };
        await setKv("pmac:last_sync", miss);
        return json(Object.assign({ ok: false }, miss));
      }
      pack = stored;
    }

    var parsed = await parseDetailSheet(pack.bytes);
    var existing = await loadExisting();
    var plan = planInserts(existing, parsed.rows);
    var removed = await deleteDupes(plan.deleteIds);
    var inserted = await insertFresh(plan.fresh);
    var status = {
      at: new Date().toISOString(),
      ok: true,
      source: pack.source,
      sheet: parsed.sheet,
      file: SOURCE.file,
      rows: parsed.rows.length,
      inserted: inserted,
      skipped: plan.already,
      repeated: plan.repeated,
      duplicates_removed: removed,
      message: summaryMessage(pack, inserted, plan.already, removed, plan.repeated)
    };
    if (shouldPersistWorkbook(pack.source)) {
      try {
        await storeWorkbook(pack.bytes);
      } catch (storeErr) {
        status.ok = false;
        status.storage_saved = false;
        status.storage_error = redact(storeErr && storeErr.message);
        status.message = status.message + " Storage was not updated: " + status.storage_error;
        await setKv("pmac:last_sync", status);
        console.log("prod-tracking-sync source=" + pack.source + " rows=" + status.rows + " inserted=" + inserted + " storage_saved=false");
        return json(Object.assign({ ok: false }, status), 500);
      }
      status.storage_saved = true;
      status.storage_bytes = pack.bytes.byteLength;
      status.storage_bucket = storageBucket();
      status.storage_object = storageObject();
      status.message = status.message + " Saved the workbook to Storage.";
    }
    await setKv("pmac:last_sync", status);
    console.log("prod-tracking-sync source=" + pack.source + " rows=" + status.rows + " inserted=" + inserted + (status.storage_saved ? " storage_saved=true" : ""));
    return json(Object.assign({ ok: true }, status));
  } catch (err) {
    var message = redact(err && err.message);
    try {
      await setKv("pmac:last_sync", {
        at: new Date().toISOString(),
        ok: false,
        sheet: SOURCE.sheet,
        file: SOURCE.file,
        message: message
      });
    } catch (e2) { /* last-sync write is best effort */ }
    return json({ ok: false, error: message, message: message }, 500);
  } finally {
    if (locked) {
      try { await setKv("pmac:lock", { at: "1970-01-01T00:00:00.000Z" }); } catch (e3) { /* unlock is best effort */ }
    }
  }
});

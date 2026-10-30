// SPS Commerce Transaction API poll. Server-side only.
// Secrets: SPS_CLIENT_ID, SPS_CLIENT_SECRET, SPS_FOLDER (testout | out).
// Reads new files from /transactions/v5/data/{folder}/ and never deletes them.
import "../../../sps-map.js";

var SPS = globalThis.SPSMap;
if (!SPS || typeof SPS.mapDocument !== "function") throw new Error("sps-map.js did not load");

var PUBLISHABLE = "sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY";
var MAX_PAGES = 40;
var MAX_FILES = 8;
var BUDGET_MS = 20000;
var LIST_URL = "https://api.spscommerce.com/transactions/v5/data/";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
function redact(s) {
  return String(s || "")
    .replace(/client_secret=[^&\s]+/gi, "client_secret=***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .slice(0, 300);
}
function authorized(req) {
  var api = req.headers.get("apikey") || "";
  var auth = req.headers.get("authorization") || "";
  var bearer = auth.toLowerCase().indexOf("bearer ") === 0 ? auth.slice(7).trim() : "";
  var anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  var service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (service && (bearer === service || api === service)) return true;
  if (anon && (bearer === anon || api === anon)) return true;
  if (api === PUBLISHABLE || bearer === PUBLISHABLE) return true;
  return false;
}
function folderOf() {
  var f = String(Deno.env.get("SPS_FOLDER") || "testout").trim().toLowerCase();
  if (f !== "testout" && f !== "out") throw new Error("SPS_FOLDER must be testout or out");
  return f;
}
function pgEq(column, value) { return SPS.pgEq(column, value); }
function safeSpsUrl(url) {
  try {
    var u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== "api.spscommerce.com") return "";
    return u.toString();
  } catch (e) { return ""; }
}
async function rest(path, opts) {
  var base = Deno.env.get("SUPABASE_URL");
  var key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
function hexToBytes(hex) {
  var out = new Uint8Array(hex.length / 2);
  for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
async function uuidNamed(name) {
  var ns = hexToBytes("6ba7b8109dad11d180b400c04fd430c8");
  var data = new TextEncoder().encode(String(name));
  var buf = new Uint8Array(ns.length + data.length);
  buf.set(ns, 0);
  buf.set(data, ns.length);
  var hash = new Uint8Array(await crypto.subtle.digest("SHA-1", buf));
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  var hex = Array.from(hash.slice(0, 16)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20, 32);
}
async function getToken(id, secret) {
  var body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", id);
  body.set("client_secret", secret);
  body.set("audience", "https://spscommerce.com");
  var res = await fetch("https://auth.spscommerce.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!res.ok) throw new Error("SPS auth failed (" + res.status + ")");
  var parsed = await res.json();
  if (!parsed.access_token) throw new Error("SPS auth returned no access_token");
  return parsed.access_token;
}
function fileRows(body) {
  var rows = body && (body.results || body.Results);
  if (!rows && Array.isArray(body)) rows = body;
  if (!Array.isArray(rows)) return [];
  var out = [];
  rows.forEach(function (r) {
    if (!r || typeof r !== "object") return;
    var type = String(r.type || r.Type || "file").toLowerCase();
    if (type && type !== "file") return;
    var path = String(r.path || r.Path || "");
    var url = safeSpsUrl(r.url || r.Url || "");
    if (!path || !url) return;
    out.push({ path: path, url: url });
  });
  return out;
}
function nextLink(body, folder) {
  var paging = body && body.paging;
  var next = paging && paging.next;
  if (!next) return "";
  if (typeof next === "string") return safeSpsUrl(next);
  if (next.url) return safeSpsUrl(next.url);
  if (next.cursor) return LIST_URL + folder + "/?limit=1000&cursor=" + encodeURIComponent(next.cursor);
  return "";
}
async function spsGet(url, token) {
  var res = await fetch(url, { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  var text = await res.text();
  if (!res.ok) throw new Error("SPS " + res.status + " " + redact(text));
  try { return JSON.parse(text); } catch (e) { throw new Error("SPS response was not JSON"); }
}
async function listFiles(token, folder) {
  var url = LIST_URL + folder + "/?limit=1000";
  var seen = {};
  var files = [];
  for (var page = 0; page < MAX_PAGES && url; page++) {
    if (seen[url]) break;
    seen[url] = 1;
    var body = await spsGet(url, token);
    fileRows(body).forEach(function (f) { files.push(f); });
    url = nextLink(body, folder);
  }
  return files;
}
async function listProcessed() {
  var set = {};
  var offset = 0;
  while (offset < 20000) {
    var rows = await rest("sps_transactions?select=file_path:payload->>file_path&limit=1000&offset=" + offset);
    if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach(function (r) { if (r.file_path) set[r.file_path] = 1; });
    if (rows.length < 1000) break;
    offset += rows.length;
  }
  return set;
}
function rawDoc(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.document && payload.document.Header) return payload.document;
  if (payload.Header) return payload;
  return null;
}
async function priorEntries(pos) {
  var byPath = {};
  for (var i = 0; i < pos.length; i++) {
    var po = pos[i];
    var byNumber = await rest("sps_transactions?select=payload,received_at&" + pgEq("po_number", po) + "&order=received_at.asc&limit=300");
    var byList = await rest("sps_transactions?select=payload,received_at&payload->po_numbers=cs." + encodeURIComponent(JSON.stringify([po])) + "&order=received_at.asc&limit=300");
    [].concat(byNumber || [], byList || []).forEach(function (row) {
      var path = (row.payload && row.payload.file_path) || "";
      var key = path || String(row.received_at || "") + ":" + i;
      byPath[key] = row;
    });
  }
  return Object.keys(byPath).map(function (k) { return byPath[k]; }).sort(function (a, b) {
    return String(a.received_at || "").localeCompare(String(b.received_at || ""));
  }).filter(function (row) {
    var folder = row.payload && row.payload.folder;
    return folder !== "paste" && rawDoc(row.payload);
  }).map(function (row) {
    return {
      json: rawDoc(row.payload),
      receivedAt: row.received_at,
      filePath: (row.payload && row.payload.file_path) || ""
    };
  });
}
function unionFlags(states, keys) {
  var flags = [];
  var details = [];
  keys.forEach(function (key) {
    var found = SPS.flagsOf(states[key]);
    flags = flags.concat(found.flags);
    details = details.concat(found.details);
  });
  var seen = {};
  return {
    flags: flags.filter(function (f) { if (seen[f]) return false; seen[f] = 1; return true; }),
    details: details
  };
}
async function upsertOrder(state, folder, flagInfo) {
  if (!state.po) return { wrote: false };
  var found = await rest("orders?select=id,notes,customer,customer_po&" + pgEq("customer_po", state.po) + "&" + pgEq("entered_by", "SPS Feed") + "&" + pgEq("customer", state.partner || "") + "&order=id.asc&limit=50");
  if (found && found.length) {
    var keeper = SPS.pickSpsOrderKeeper(found);
    var row = SPS.buildOrder(state, folder, keeper.notes, flagInfo);
    await rest("orders?" + pgEq("id", keeper.id), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: row
    });
    var drop = found.filter(function (r) { return String(r.id) !== String(keeper.id); }).map(function (r) { return r.id; });
    if (drop.length) await deleteFeedOrders(drop);
    return { wrote: true, id: keeper.id };
  }
  var other = await rest("orders?select=id&" + pgEq("customer_po", state.po) + "&entered_by=neq." + encodeURIComponent("SPS Feed") + "&limit=1");
  if (other && other.length) return { wrote: false, skipped: "already_on_board" };
  var created = SPS.buildOrder(state, folder, "", flagInfo);
  await rest("orders", { method: "POST", headers: { Prefer: "return=minimal" }, body: created });
  return { wrote: true };
}
async function replaceDemand(state, folder) {
  if (!state.po) return;
  var planned = SPS.buildDemand(state, folder);
  var rows = [];
  for (var i = 0; i < planned.length; i++) {
    var copy = Object.assign({}, planned[i]);
    var key = copy._key;
    delete copy._key;
    copy.id = await uuidNamed("demand|" + (state.partnerId || "") + "|" + state.po + "|" + key);
    rows.push(copy);
  }
  if (rows.length) {
    await rest("demand_lines?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: rows
    });
  }
  var existing = await rest("demand_lines?select=id&" + pgEq("imported_by", "SPS Feed") + "&" + pgEq("po", state.po) + "&" + pgEq("partner", state.partner || "") + "&limit=500");
  var keep = {};
  rows.forEach(function (r) { keep[r.id] = 1; });
  var drop = (existing || []).map(function (r) { return r.id; }).filter(function (id) { return !keep[id]; });
  if (drop.length) {
    await rest("demand_lines?id=in.(" + drop.join(",") + ")", { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
}
function txPathFilter(path) {
  return "payload->>file_path=eq." + encodeURIComponent(String(path));
}
async function deleteFeedOrders(ids) {
  var clean = (ids || []).map(function (id) { return String(id); }).filter(function (id) { return /^\d+$/.test(id); });
  if (!clean.length) return 0;
  await rest("orders?id=in.(" + clean.join(",") + ")&entered_by=eq." + encodeURIComponent("SPS Feed"), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  return clean.length;
}
function stateFor(interpreted, partner, po) {
  var hits = [];
  Object.keys(interpreted.states || {}).forEach(function (key) {
    var st = interpreted.states[key];
    if (st && st.po === po && st.partner === partner) hits.push(st);
  });
  hits.sort(function (a, b) { return (b.orderLines || []).length - (a.orderLines || []).length; });
  return hits[0] || null;
}
async function listFeedOrders() {
  var rows = [];
  var offset = 0;
  while (offset < 5000) {
    var page = await rest("orders?select=id,customer,customer_po,notes&" + pgEq("entered_by", "SPS Feed") + "&order=id.asc&limit=1000&offset=" + offset);
    if (!Array.isArray(page) || !page.length) break;
    rows = rows.concat(page);
    if (page.length < 1000) break;
    offset += page.length;
  }
  return rows;
}
// Collapse duplicate SPS Feed orders for the same partner + PO. The surviving
// row is the 850. Its fields are rebuilt from every stored document, then the
// extra SPS Feed rows are deleted.
async function mergeDuplicateOrders(folder) {
  var rows = await listFeedOrders();
  var groups = {};
  rows.forEach(function (row) {
    if (!row.customer_po) return;
    var key = String(row.customer || "") + "\u001f" + String(row.customer_po);
    (groups[key] = groups[key] || []).push(row);
  });
  var removed = 0;
  var groupsMerged = 0;
  var keys = Object.keys(groups);
  for (var i = 0; i < keys.length; i++) {
    var group = groups[keys[i]];
    if (group.length < 2) continue;
    var keeper = SPS.pickSpsOrderKeeper(group);
    if (!keeper) continue;
    var partner = keeper.customer || "";
    var po = keeper.customer_po;
    var prior = await priorEntries([po]);
    if (prior.length) {
      var state = stateFor(SPS.interpret(prior), partner, po);
      if (!state) continue;
      var row = SPS.buildOrder(state, folder, keeper.notes, SPS.flagsOf(state));
      await rest("orders?" + pgEq("id", keeper.id), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: row
      });
    }
    var drop = group.filter(function (r) { return String(r.id) !== String(keeper.id); }).map(function (r) { return r.id; });
    removed += await deleteFeedOrders(drop);
    groupsMerged++;
  }
  return { groups: groupsMerged, removed: removed };
}
async function processFile(token, file, folder) {
  var existingTx = await rest("sps_transactions?select=id&" + txPathFilter(file.path) + "&limit=1");
  if (existingTx && existingTx.length) return { flagged: false };
  var doc = await spsGet(file.url, token);
  var mapped = SPS.mapDocument(doc);
  var prior = (await priorEntries(mapped.pos || [])).filter(function (entry) { return entry.filePath !== file.path; });
  var before = SPS.interpret(prior);
  var after = SPS.interpret(prior.concat([{ json: doc }]));
  var keys = (mapped.pos && mapped.pos.length ? mapped.pos : [""]).map(function (po) { return SPS.stateKey(mapped.partnerId, po); });
  var prev = unionFlags(before.states, keys);
  var now = unionFlags(after.states, keys);
  var own = unionFlags(SPS.interpret([{ json: doc }]).states, keys);
  var introduced = SPS.fileFlags(prev.flags, now.flags, own.flags);
  if (mapped.reject && introduced.indexOf("rejected") < 0) introduced.push("rejected");
  var boardNotes = [];
  for (var i = 0; i < keys.length; i++) {
    var state = after.states[keys[i]];
    if (!state || !state.po) continue;
    var one = SPS.flagsOf(state);
    var orderResult = await upsertOrder(state, folder, one);
    if (orderResult.skipped) boardNotes.push("PO " + state.po + " is already on the orders board, so that row was left as-is.");
    if (mapped.docType === "850") await replaceDemand(state, folder);
  }
  if (mapped.docType === "856" && mapped.shipment) {
    var shipId = await uuidNamed("ship|" + file.path);
    await rest("shipping_log?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: SPS.buildShipment(mapped, shipId, folder)
    });
  }
  var status = introduced.length ? "flagged" : "live";
  if (mapped.reject) status = "rejected";
  var raced = await rest("sps_transactions?select=id&" + txPathFilter(file.path) + "&limit=1");
  if (raced && raced.length) return { flagged: introduced.length > 0 || !!mapped.reject };
  await rest("sps_transactions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: {
      doc_type: mapped.label || "Unknown",
      partner: mapped.partner || "",
      po_number: (mapped.pos && mapped.pos[0]) || "",
      direction: "in",
      status: status,
      received_at: new Date().toISOString(),
      payload: {
        file_path: file.path,
        file_url: file.url,
        folder: folder,
        flags: introduced,
        flag_detail: now.details.concat(boardNotes),
        po_numbers: mapped.pos || [],
        summary: {
          docType: mapped.label,
          partner: mapped.partner,
          partnerId: mapped.partnerId,
          pos: mapped.pos,
          vendor: mapped.vendor,
          shipTo: mapped.shipTo,
          lineCount: mapped.lineCount,
          statedTotal: mapped.statedTotal,
          computedTotal: mapped.computedTotal,
          invoice: mapped.invoice ? mapped.invoice.number : "",
          bol: (mapped.shipment && mapped.shipment.bol) || (mapped.invoice && mapped.invoice.bol) || "",
          shipDate: (mapped.shipment && mapped.shipment.shipDate) || (mapped.invoice && mapped.invoice.shipDate) || ""
        },
        document: doc
      }
    }
  });
  return { flagged: introduced.length > 0 || !!mapped.reject };
}

Deno.serve(async function (req) {
  if (req.method === "DELETE") return json({ ok: false, error: "SPS files are never deleted" }, 405);
  if (!authorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
  var locked = false;
  var folder = "testout";
  try {
    folder = folderOf();
    var clientId = Deno.env.get("SPS_CLIENT_ID") || "";
    var clientSecret = Deno.env.get("SPS_CLIENT_SECRET") || "";
    if (!clientId || !clientSecret) {
      await setKv("sps:last_sync", {
        at: new Date().toISOString(), ok: false, folder: folder,
        message: "SPS_CLIENT_ID and SPS_CLIENT_SECRET are not set on the sps-sync function."
      });
      return json({ ok: false, error: "missing_secrets" });
    }
    var lock = await getKv("sps:lock");
    if (lock && lock.at && Date.now() - Date.parse(lock.at) < 4 * 60 * 1000) return json({ ok: true, skipped: "busy" });
    await setKv("sps:lock", { at: new Date().toISOString() });
    locked = true;
    var merged = await mergeDuplicateOrders(folder);
    var started = Date.now();
    var token = await getToken(clientId, clientSecret);
    var files = await listFiles(token, folder);
    var seen = await listProcessed();
    var fresh = files.filter(function (f) { return !seen[f.path]; });
    var processed = 0;
    var flagged = 0;
    var errors = [];
    for (var i = 0; i < fresh.length && processed < MAX_FILES && (Date.now() - started) < BUDGET_MS; i++) {
      try {
        var result = await processFile(token, fresh[i], folder);
        processed++;
        if (result.flagged) flagged++;
      } catch (err) {
        errors.push(fresh[i].path + ": " + redact(err && err.message));
        if (errors.length >= 5) break;
      }
    }
    var summary = {
      at: new Date().toISOString(),
      ok: errors.length === 0,
      folder: folder,
      listed: files.length,
      skipped: files.length - fresh.length,
      pending: fresh.length,
      processed: processed,
      flagged: flagged,
      mergedOrders: merged.removed,
      errors: errors
    };
    await setKv("sps:last_sync", summary);
    console.log("sps-sync folder=" + folder + " processed=" + processed + " pending=" + fresh.length + " merged=" + merged.removed);
    return json(Object.assign({ ok: errors.length === 0 }, summary));
  } catch (err) {
    var message = redact(err && err.message);
    try {
      await setKv("sps:last_sync", { at: new Date().toISOString(), ok: false, folder: folder, message: message });
    } catch (e2) { /* last-sync write is best effort */ }
    return json({ ok: false, error: message }, 500);
  } finally {
    if (locked) {
      try { await setKv("sps:lock", { at: "1970-01-01T00:00:00.000Z" }); } catch (e3) { /* unlock is best effort */ }
    }
  }
});

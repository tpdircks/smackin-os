// Shipping provider poll. Server-side only.
// Secrets: SHIPSTATION_API_KEY, SHIPSTATION_API_SECRET.
// Provider: SHIPPING_PROVIDER=shipstation (default) or globalship (stub).
// Writes normalized rows to shipping_log. Cursor and last run live in kv_status.
// The browser never receives the API key or secret.
var PUBLISHABLE = "sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY";
var SS_BASE = "https://ssapi.shipstation.com";
var MARK = "[[SHIPSYNC:";
var PAGE_CAP = 4;
var PAGE_SIZE = 100;
var FIRST_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
var OVERLAP_MS = 2 * 60 * 1000;
var BUDGET_MS = 20000;
var LOCK_MS = 4 * 60 * 1000;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
function redact(s) {
  var out = String(s || "");
  try {
    var key = Deno.env.get("SHIPSTATION_API_KEY") || "";
    var secret = Deno.env.get("SHIPSTATION_API_SECRET") || "";
    if (key) out = out.split(key).join("***");
    if (secret) out = out.split(secret).join("***");
  } catch (e) { /* env is not readable in every runtime */ }
  return out
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic ***")
    .replace(/api[_-]?key[^&\s]*/gi, "api_key=***")
    .replace(/api[_-]?secret[^&\s]*/gi, "api_secret=***")
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
// PostgREST treats quotes in an eq value as part of the value. A quoted filter
// misses the row and the next insert duplicates it. Encode the value and refuse
// a filter that still contains a quote.
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
function pad(n) { return (n < 10 ? "0" : "") + n; }
// ShipStation v1 date filters are naive timestamps in the store's account
// timezone. Smackin shipment createDates line up with America/Denver wall
// time (weekday mornings around 7:30-8:00). A UTC ISO cursor formatted with
// getUTC* looks like a future local time, so /shipments returns 0 rows.
function isNaiveSsDate(s) {
  s = String(s || "");
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(s) && s.indexOf("Z") < 0 && !/[+-]\d{2}:?\d{2}$/.test(s);
}
function naiveFromParts(d) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
    " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
}
function denverStamp(d) {
  var parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(d);
  var get = function (type) {
    var hit = parts.filter(function (p) { return p.type === type; })[0];
    return hit ? hit.value : "00";
  };
  return get("year") + "-" + get("month") + "-" + get("day") + " " + get("hour") + ":" + get("minute") + ":" + get("second");
}
function ssStamp(input) {
  if (typeof input === "string" && isNaiveSsDate(input)) {
    return input.slice(0, 19).replace("T", " ");
  }
  var d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) d = new Date(Date.now() - FIRST_LOOKBACK_MS);
  return denverStamp(d);
}
function sinceOf(cursorIso) {
  if (!cursorIso) return new Date(Date.now() - FIRST_LOOKBACK_MS);
  if (isNaiveSsDate(cursorIso)) {
    var naive = cursorIso.slice(0, 19).replace("T", " ").replace(" ", "T") + "Z";
    var tNaive = Date.parse(naive);
    if (isNaN(tNaive)) return new Date(Date.now() - FIRST_LOOKBACK_MS);
    return naiveFromParts(new Date(tNaive - OVERLAP_MS));
  }
  var t = Date.parse(cursorIso);
  if (isNaN(t)) return new Date(Date.now() - FIRST_LOOKBACK_MS);
  return new Date(t - OVERLAP_MS);
}
function day(s) {
  s = String(s || "");
  if (!s) return "";
  return s.slice(0, 10);
}
function stableId(key) {
  var h1 = 2166136261, h2 = 2166136261 ^ 0x9e3779b9, h3 = 2166136261 ^ 0x85ebca6b, h4 = 2166136261 ^ 0xc2b2ae35;
  for (var i = 0; i < key.length; i++) {
    var c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
    h3 = Math.imul(h3 ^ c, 3266489917);
    h4 = Math.imul(h4 ^ c, 668265263);
  }
  function hex(n) { return ("00000000" + (n >>> 0).toString(16)).slice(-8); }
  var s = hex(h1) + hex(h2) + hex(h3) + hex(h4);
  return s.slice(0, 8) + "-" + s.slice(8, 12) + "-" + s.slice(12, 16) + "-" + s.slice(16, 20) + "-" + s.slice(20, 32);
}
function marker(rec) { return MARK + rec.provider + ":" + rec.kind + ":" + rec.externalId + "]]"; }
function itemsText(items) {
  return (items || []).map(function (it) {
    var bit = (it.sku ? it.sku + " " : "") + (it.name || "");
    if (it.qty != null && it.qty !== "") bit += " x" + it.qty;
    return bit.trim();
  }).filter(Boolean).join("; ").slice(0, 1800);
}
function carrierName(code) {
  var c = String(code || "").toLowerCase();
  var map = {
    stamps_com: "USPS", usps: "USPS", ups: "UPS", ups_walleted: "UPS",
    fedex: "FedEx", fedex_walleted: "FedEx", dhl_express: "DHL", dhl_ecommerce: "DHL",
    globalpost: "GlobalPost"
  };
  if (!c) return "";
  return map[c] || c.replace(/_/g, " ");
}
function serviceName(code) { return String(code || "").replace(/_/g, " "); }
function mapItems(list) {
  return (list || []).map(function (it) {
    return {
      sku: it.sku || it.lineItemKey || "",
      name: it.name || "",
      qty: it.quantity != null ? it.quantity : (it.qty != null ? it.qty : "")
    };
  }).filter(function (it) { return it.sku || it.name; });
}
function normalizeShipment(raw, provider) {
  if (!raw || raw.shipmentId == null) return null;
  var cost = (Number(raw.shipmentCost) || 0) + (Number(raw.insuranceCost) || 0);
  return {
    provider: provider,
    kind: "shipment",
    externalId: String(raw.shipmentId),
    orderNumber: raw.orderNumber || raw.orderKey || "",
    carrier: carrierName(raw.carrierCode),
    service: serviceName(raw.serviceCode),
    tracking: raw.trackingNumber || "",
    shipDate: day(raw.shipDate || raw.createDate),
    cost: Math.round(cost * 100) / 100,
    status: raw.voided ? "voided" : "shipped",
    items: mapItems(raw.shipmentItems)
  };
}
function normalizeOrder(raw, provider) {
  if (!raw || raw.orderId == null) return null;
  return {
    provider: provider,
    kind: "order",
    externalId: String(raw.orderId),
    orderNumber: raw.orderNumber || raw.orderKey || "",
    carrier: carrierName(raw.carrierCode),
    service: serviceName(raw.serviceCode),
    tracking: raw.trackingNumber || "",
    shipDate: day(raw.shipDate || raw.orderDate || raw.modifyDate),
    cost: Math.round((Number(raw.shippingAmount) || 0) * 100) / 100,
    status: String(raw.orderStatus || "open").toLowerCase(),
    items: mapItems(raw.items)
  };
}
function toRow(rec) {
  return {
    id: stableId(rec.provider + ":" + rec.kind + ":" + rec.externalId),
    ship_date: rec.shipDate || new Date().toISOString().slice(0, 10),
    ship_type: rec.service || rec.kind,
    recipient: rec.orderNumber || "",
    address: "",
    carrier: rec.carrier || "",
    tracking: rec.tracking || "",
    requested_by: "",
    contents: itemsText(rec.items),
    lot: "",
    status: rec.status || "",
    cost: Number(rec.cost) || 0,
    notes: marker(rec),
    entered_by: "sync:" + rec.provider
  };
}
function listRows(body, listKey) {
  var rows = body && body[listKey];
  if (Array.isArray(rows)) return rows;
  if (Array.isArray(body)) return body;
  return [];
}
function hasMore(body, page, fetched, rowCount) {
  if (rowCount <= 0) return false;
  var total = Number(body && body.total);
  var pages = Number(body && body.pages);
  if (isFinite(total) && total > 0) return fetched < total;
  if (isFinite(pages) && pages > 0) return page < pages;
  return rowCount >= PAGE_SIZE;
}
function maxTime(rows, fields) {
  var max = 0;
  (rows || []).forEach(function (row) {
    fields.forEach(function (field) {
      var t = Date.parse(row && row[field]);
      if (!isNaN(t) && t > max) max = t;
    });
  });
  return max;
}
function advance(prev, maxRaw, complete) {
  // Never jump the cursor to Date.toISOString(). That UTC stamp is sent to
  // ShipStation as a naive local time and skips every later shipment.
  if (maxRaw) {
    var next = isNaiveSsDate(maxRaw) ? String(maxRaw) : new Date(maxRaw).toISOString();
    if (prev && !isNaiveSsDate(next) && !isNaiveSsDate(prev) && Date.parse(next) <= Date.parse(prev)) {
      return new Date(Date.parse(prev) + 1000).toISOString();
    }
    return next;
  }
  return prev || "";
}
function maxRaw(rows, fields) {
  var best = "";
  var bestMs = 0;
  (rows || []).forEach(function (row) {
    fields.forEach(function (field) {
      var raw = row && row[field];
      if (raw == null || raw === "") return;
      var s = String(raw);
      var t = Date.parse(isNaiveSsDate(s) ? s.slice(0, 19).replace("T", " ").replace(" ", "T") + "Z" : s);
      if (!isNaN(t) && t >= bestMs) {
        bestMs = t;
        best = s;
      }
    });
  });
  return best;
}
function basicAuth(key, secret) {
  return "Basic " + btoa(String(key) + ":" + String(secret));
}
async function ssGet(path, params, auth) {
  var qs = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
  }).join("&");
  var res = await fetch(SS_BASE + path + "?" + qs, {
    headers: { Authorization: auth, Accept: "application/json" }
  });
  var text = await res.text();
  if (res.status === 429) throw new Error("shipstation 429");
  if (!res.ok) throw new Error("shipstation " + res.status + " " + redact(text));
  try { return JSON.parse(text); } catch (e) { throw new Error("shipstation response was not JSON"); }
}
async function pullList(path, listKey, params, auth, started) {
  var page = 1;
  var out = [];
  var complete = true;
  while (page <= PAGE_CAP) {
    if (Date.now() - started > BUDGET_MS) { complete = false; break; }
    var query = Object.assign({ pageSize: String(PAGE_SIZE), page: String(page) }, params);
    var body = await ssGet(path, query, auth);
    var rows = listRows(body, listKey);
    out = out.concat(rows);
    if (!hasMore(body, page, out.length, rows.length)) { complete = true; break; }
    if (page >= PAGE_CAP) { complete = false; break; }
    page++;
  }
  return { rows: out, complete: complete, pages: page };
}
function mergeShipments(created, voided) {
  var byId = {};
  (created || []).forEach(function (row) {
    if (row && row.shipmentId != null) byId[String(row.shipmentId)] = row;
  });
  (voided || []).forEach(function (row) {
    if (!row || row.shipmentId == null) return;
    var id = String(row.shipmentId);
    if (!byId[id] || row.voided) byId[id] = row;
  });
  return Object.keys(byId).map(function (k) { return byId[k]; });
}

var shipstation = {
  id: "shipstation",
  label: "ShipStation",
  stub: false,
  async fetchUpdated(cursor) {
    var key = Deno.env.get("SHIPSTATION_API_KEY") || "";
    var secret = Deno.env.get("SHIPSTATION_API_SECRET") || "";
    if (!key || !secret) {
      return { missingSecrets: true, shipments: [], orders: [], complete: false };
    }
    var auth = basicAuth(key, secret);
    var started = Date.now();
    var shipSince = ssStamp(sinceOf(cursor.shipments));
    var voidSince = ssStamp(sinceOf(cursor.voids));
    var orderSince = ssStamp(sinceOf(cursor.orders));
    var created = await pullList("/shipments", "shipments", {
      createDateStart: shipSince,
      includeShipmentItems: "true",
      sortBy: "CreateDate",
      sortDir: "ASC"
    }, auth, started);
    var voided = await pullList("/shipments", "shipments", {
      voidDateStart: voidSince,
      includeShipmentItems: "true",
      sortBy: "CreateDate",
      sortDir: "ASC"
    }, auth, started);
    var orders = await pullList("/orders", "orders", {
      modifyDateStart: orderSince,
      sortBy: "ModifyDate",
      sortDir: "ASC"
    }, auth, started);
    return {
      missingSecrets: false,
      rawShipments: mergeShipments(created.rows, voided.rows),
      rawOrders: orders.rows,
      shipments: mergeShipments(created.rows, voided.rows).map(function (row) {
        return normalizeShipment(row, "shipstation");
      }).filter(Boolean),
      orders: orders.rows.map(function (row) { return normalizeOrder(row, "shipstation"); }).filter(Boolean),
      next: {
        shipments: advance(cursor.shipments, maxRaw(created.rows, ["createDate", "shipDate"]), created.complete),
        voids: advance(cursor.voids, maxRaw(voided.rows, ["voidDate", "createDate"]), voided.complete),
        orders: advance(cursor.orders, maxRaw(orders.rows, ["modifyDate", "createDate", "orderDate"]), orders.complete)
      },
      complete: !!(created.complete && voided.complete && orders.complete),
      pages: { shipments: created.pages, voids: voided.pages, orders: orders.pages }
    };
  }
};

var globalship = {
  id: "globalship",
  label: "GlobalShip",
  stub: true,
  async fetchUpdated() {
    return { stub: true, shipments: [], orders: [], complete: true, rawShipments: [], rawOrders: [] };
  }
};

function providerOf() {
  var id = String(Deno.env.get("SHIPPING_PROVIDER") || "shipstation").trim().toLowerCase();
  if (id === "globalship") return globalship;
  if (id === "shipstation") return shipstation;
  return { id: id, label: id, stub: true, unknown: true, fetchUpdated: globalship.fetchUpdated };
}

async function rowsForMarker(markerText) {
  var rows = await rest("shipping_log?select=id,notes&" + pgEq("notes", markerText) + "&limit=10");
  return rows || [];
}
function patchBody(row) {
  var copy = Object.assign({}, row);
  delete copy.id;
  return copy;
}
async function writeRows(recs) {
  var byMarker = {};
  recs.forEach(function (rec) {
    if (!rec || !rec.externalId) return;
    var row = toRow(rec);
    byMarker[row.notes] = row;
  });
  var markers = Object.keys(byMarker);
  var existing = {};
  for (var i = 0; i < markers.length; i += 20) {
    var slice = markers.slice(i, i + 20);
    var found = await Promise.all(slice.map(rowsForMarker));
    slice.forEach(function (markerText, idx) { existing[markerText] = found[idx]; });
  }
  var upserts = [];
  var updated = 0;
  var inserted = 0;
  for (var m = 0; m < markers.length; m++) {
    var markerText = markers[m];
    var row = byMarker[markerText];
    var hits = existing[markerText] || [];
    if (hits.length === 1 && String(hits[0].id) === String(row.id)) {
      upserts.push(row);
      updated++;
      continue;
    }
    if (hits.length) {
      var keeper = hits[0].id;
      await rest("shipping_log?" + pgEq("id", keeper), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: patchBody(row)
      });
      updated++;
      var extras = hits.slice(1).map(function (hit) { return hit.id; }).filter(function (id) {
        return id != null && String(id) !== String(keeper);
      });
      for (var e = 0; e < extras.length; e++) {
        await rest("shipping_log?" + pgEq("id", extras[e]) + "&" + pgEq("notes", markerText), {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      }
      continue;
    }
    upserts.push(row);
    inserted++;
  }
  for (var n = 0; n < upserts.length; n += 100) {
    var part = upserts.slice(n, n + 100);
    await rest("shipping_log?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: part
    });
  }
  return { written: updated + inserted, updated: updated, inserted: inserted };
}

function wantDiag(req) {
  try {
    var url = new URL(req.url);
    if (url.searchParams.get("diag") === "1") return true;
  } catch (e) { /* ignore bad URL */ }
  return false;
}
function storeNames(body) {
  var list = [];
  if (Array.isArray(body)) list = body;
  else if (body && Array.isArray(body.stores)) list = body.stores;
  return list.map(function (s) {
    return {
      storeId: s && s.storeId != null ? s.storeId : null,
      storeName: s && (s.storeName || s.name) || "",
      marketplaceName: s && (s.marketplaceName || s.marketplace) || "",
      active: s ? (s.active !== false) : null
    };
  }).filter(function (s) { return s.storeId != null || s.storeName; });
}
function countSummary(body, listKey) {
  var rows = listRows(body, listKey);
  var total = body && body.total != null ? Number(body.total) : rows.length;
  var pages = body && body.pages != null ? Number(body.pages) : null;
  var first = rows[0] || {};
  var last = rows.length ? rows[rows.length - 1] : {};
  return {
    http_ok: true,
    returned: rows.length,
    total: isFinite(total) ? total : rows.length,
    pages: pages,
    first_createDate: first.createDate || first.createDateUtc || "",
    first_shipDate: first.shipDate || "",
    last_createDate: last.createDate || last.createDateUtc || "",
    last_shipDate: last.shipDate || "",
    first_modifyDate: first.modifyDate || "",
    last_modifyDate: last.modifyDate || ""
  };
}
async function ssProbe(path, params, auth) {
  try {
    var body = await ssGet(path, params, auth);
    return { ok: true, body: body };
  } catch (err) {
    return { ok: false, error: redact(err && err.message) };
  }
}
async function v2Probe(url, headers) {
  try {
    var res = await fetch(url, { headers: Object.assign({ Accept: "application/json" }, headers) });
    var text = await res.text();
    var parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    var labels = parsed && (parsed.labels || parsed.shipments || parsed.orders);
    var count = Array.isArray(labels) ? labels.length : (parsed && parsed.total != null ? Number(parsed.total) : null);
    return {
      http: res.status,
      ok: res.ok,
      total: parsed && parsed.total != null ? Number(parsed.total) : count,
      returned: Array.isArray(labels) ? labels.length : 0,
      pages: parsed && parsed.pages != null ? Number(parsed.pages) : null,
      error: res.ok ? "" : redact(text).slice(0, 180)
    };
  } catch (err) {
    return { http: 0, ok: false, error: redact(err && err.message) };
  }
}
async function runDiag() {
  var key = "";
  var secret = "";
  try { key = Deno.env.get("SHIPSTATION_API_KEY") || ""; } catch (e) { key = ""; }
  try { secret = Deno.env.get("SHIPSTATION_API_SECRET") || ""; } catch (e) { secret = ""; }
  var providerEnv = "";
  try { providerEnv = String(Deno.env.get("SHIPPING_PROVIDER") || ""); } catch (e) { providerEnv = ""; }
  var anonPresent = false;
  try { anonPresent = !!(Deno.env.get("SUPABASE_ANON_KEY") || ""); } catch (e2) { anonPresent = false; }
  var out = {
    ok: true,
    diag: true,
    wrote: false,
    key_source: key ? "env" : "missing",
    hardcoded_shipstation_fallback: false,
    env: {
      SHIPSTATION_API_KEY: !!key,
      SHIPSTATION_API_SECRET: !!secret,
      SHIPPING_PROVIDER: providerEnv || "(unset)",
      SUPABASE_ANON_KEY: anonPresent,
      hardcoded_publishable_fallback: true
    },
    v1: {},
    v2: {}
  };
  if (!key || !secret) {
    out.v1.error = "missing_secrets";
    out.v2.attempted = false;
    return out;
  }
  var auth = basicAuth(key, secret);
  var since = "2026-10-24 00:00:00";
  var created = await ssProbe("/shipments", { createDateStart: since, page: "1", pageSize: "1" }, auth);
  var shipped = await ssProbe("/shipments", { shipDateStart: since, page: "1", pageSize: "1" }, auth);
  var allShip = await ssProbe("/shipments", { page: "1", pageSize: "1" }, auth);
  var orders = await ssProbe("/orders", { modifyDateStart: since, page: "1", pageSize: "1" }, auth);
  var stores = await ssProbe("/stores", {}, auth);
  out.v1.createDateStart_from_2026_10_24 = created.ok ? countSummary(created.body, "shipments") : { http_ok: false, error: created.error };
  out.v1.shipDateStart_from_2026_10_24 = shipped.ok ? countSummary(shipped.body, "shipments") : { http_ok: false, error: shipped.error };
  out.v1.all_shipments_page1 = allShip.ok ? countSummary(allShip.body, "shipments") : { http_ok: false, error: allShip.error };
  out.v1.orders_modifyDateStart_from_2026_10_24 = orders.ok ? countSummary(orders.body, "orders") : { http_ok: false, error: orders.error };
  out.v1.stores = stores.ok ? { http_ok: true, count: storeNames(stores.body).length, names: storeNames(stores.body) } : { http_ok: false, error: stores.error };
  var v2start = "2026-10-24T00:00:00.000Z";
  var v2labels = "https://api.shipstation.com/v2/labels?created_at_start=" + encodeURIComponent(v2start) + "&page_size=1";
  var v2ship = "https://api.shipstation.com/v2/shipments?created_at_start=" + encodeURIComponent(v2start) + "&page_size=1";
  out.v2 = {
    attempted: true,
    note: "Tried the current key as an API-Key header, then as key:secret. No secret values are returned.",
    labels_api_key_only: await v2Probe(v2labels, { "API-Key": key }),
    labels_api_key_with_secret: await v2Probe(v2labels, { "API-Key": key + ":" + secret }),
    shipments_api_key_only: await v2Probe(v2ship, { "API-Key": key })
  };
  return out;
}

function cursorOf(saved, providerId) {
  if (!saved || saved.provider !== providerId) return { shipments: "", voids: "", orders: "" };
  return {
    shipments: saved.shipments || "",
    voids: saved.voids || "",
    orders: saved.orders || ""
  };
}

async function writeRowsUpsertOnly(recs) {
  var byMarker = {};
  recs.forEach(function (rec) {
    if (!rec || !rec.externalId) return;
    var row = toRow(rec);
    byMarker[row.notes] = row;
  });
  var rows = Object.keys(byMarker).map(function (k) { return byMarker[k]; });
  var inserted = 0;
  for (var n = 0; n < rows.length; n += 100) {
    var part = rows.slice(n, n + 100);
    await rest("shipping_log?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: part
    });
    inserted += part.length;
  }
  return { written: inserted, upserted: inserted, inserted: inserted, updated: 0 };
}

function wantBackfill(req) {
  try {
    var url = new URL(req.url);
    if (url.searchParams.get("backfill") === "1") return url.searchParams.get("from") || "2026-10-24";
  } catch (e) { /* ignore */ }
  return "";
}

async function runBackfill(fromDay) {
  var key = Deno.env.get("SHIPSTATION_API_KEY") || "";
  var secret = Deno.env.get("SHIPSTATION_API_SECRET") || "";
  if (!key || !secret) return { ok: false, error: "missing_secrets", wrote: false };
  var auth = basicAuth(key, secret);
  var saved = await getKv("shipping:backfill");
  var start = (saved && saved.createDateStart) || (String(fromDay || "2026-10-24").slice(0, 10) + " 00:00:00");
  var started = Date.now();
  var created = await pullList("/shipments", "shipments", {
    createDateStart: start,
    includeShipmentItems: "true",
    sortBy: "CreateDate",
    sortDir: "ASC"
  }, auth, started);
  var recs = (created.rows || []).map(function (row) {
    return normalizeShipment(row, "shipstation");
  }).filter(Boolean);
  var wrote = await writeRowsUpsertOnly(recs);
  var lastRaw = maxRaw(created.rows, ["createDate", "shipDate"]);
  var nextStart = lastRaw ? ssStamp(lastRaw) : start;
  var state = {
    at: new Date().toISOString(),
    from: fromDay,
    createDateStart: nextStart,
    last_raw: lastRaw || "",
    fetched: recs.length,
    pages: created.pages,
    complete: created.complete,
    written: wrote.written
  };
  await setKv("shipping:backfill", state);
  if (created.complete && recs.length) {
    await setKv("shipping:cursor", {
      provider: "shipstation",
      shipments: lastRaw || nextStart,
      voids: lastRaw || nextStart,
      orders: lastRaw || nextStart
    });
  } else if (created.complete && !recs.length && saved && saved.last_raw) {
    await setKv("shipping:cursor", {
      provider: "shipstation",
      shipments: saved.last_raw,
      voids: saved.last_raw,
      orders: saved.last_raw
    });
  }
  return {
    ok: true,
    backfill: true,
    wrote: true,
    start: start,
    fetched: recs.length,
    written: wrote.written,
    complete: created.complete,
    next: nextStart,
    pages: created.pages
  };
}

Deno.serve(async function (req) {
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!authorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
  if (wantDiag(req)) {
    try { return json(await runDiag()); }
    catch (err) { return json({ ok: false, diag: true, wrote: false, error: redact(err && err.message) }, 500); }
  }
  var backfillFrom = wantBackfill(req);
  if (backfillFrom) {
    var lockBf = await getKv("shipping:lock");
    if (lockBf && lockBf.at && Date.now() - Date.parse(lockBf.at) < LOCK_MS) return json({ ok: true, skipped: "busy" });
    await setKv("shipping:lock", { at: new Date().toISOString() });
    try { return json(await runBackfill(backfillFrom)); }
    catch (err) { return json({ ok: false, backfill: true, error: redact(err && err.message) }, 500); }
    finally {
      try { await setKv("shipping:lock", { at: "1970-01-01T00:00:00.000Z" }); } catch (e3) { /* unlock */ }
    }
  }
  var provider = providerOf();
  var locked = false;
  try {
    if (provider.unknown) {
      await setKv("shipping:last_sync", {
        at: new Date().toISOString(),
        ok: false,
        provider: provider.id,
        label: provider.label,
        stub: true,
        message: "SHIPPING_PROVIDER is not a known adapter."
      });
      return json({ ok: false, error: "unknown_provider", provider: provider.id });
    }
    if (provider.stub) {
      await setKv("shipping:last_sync", {
        at: new Date().toISOString(),
        ok: false,
        provider: provider.id,
        label: provider.label,
        stub: true,
        shipments: 0,
        orders: 0,
        message: provider.label + " is not connected yet."
      });
      return json({ ok: true, stub: true, provider: provider.id });
    }
    var lock = await getKv("shipping:lock");
    if (lock && lock.at && Date.now() - Date.parse(lock.at) < LOCK_MS) return json({ ok: true, skipped: "busy" });
    await setKv("shipping:lock", { at: new Date().toISOString() });
    locked = true;
    var saved = await getKv("shipping:cursor");
    var cursor = cursorOf(saved, provider.id);
    var pack = await provider.fetchUpdated(cursor);
    if (pack.missingSecrets) {
      await setKv("shipping:last_sync", {
        at: new Date().toISOString(),
        ok: false,
        provider: provider.id,
        label: provider.label,
        message: "SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET are not set on the shipping-sync function."
      });
      return json({ ok: false, error: "missing_secrets" });
    }
    var wrote = await writeRows((pack.shipments || []).concat(pack.orders || []));
    var nextCursor = {
      provider: provider.id,
      shipments: pack.next.shipments,
      voids: pack.next.voids,
      orders: pack.next.orders
    };
    await setKv("shipping:cursor", nextCursor);
    var summary = {
      at: new Date().toISOString(),
      ok: true,
      provider: provider.id,
      label: provider.label,
      stub: false,
      shipments: (pack.shipments || []).length,
      orders: (pack.orders || []).length,
      written: wrote.written,
      inserted: wrote.inserted,
      updated: wrote.updated,
      complete: pack.complete,
      pages: pack.pages
    };
    await setKv("shipping:last_sync", summary);
    console.log("shipping-sync provider=" + provider.id + " shipments=" + summary.shipments + " orders=" + summary.orders + " written=" + summary.written);
    return json(Object.assign({ ok: true }, summary));
  } catch (err) {
    var message = redact(err && err.message);
    try {
      await setKv("shipping:last_sync", {
        at: new Date().toISOString(),
        ok: false,
        provider: provider.id,
        label: provider.label,
        message: message
      });
    } catch (e2) { /* last-sync write is best effort */ }
    return json({ ok: false, error: message }, 500);
  } finally {
    if (locked) {
      try { await setKv("shipping:lock", { at: "1970-01-01T00:00:00.000Z" }); } catch (e3) { /* unlock is best effort */ }
    }
  }
});

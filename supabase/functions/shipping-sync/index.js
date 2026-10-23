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
function ssStamp(input) {
  var d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) d = new Date(Date.now() - FIRST_LOOKBACK_MS);
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
    " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
}
function sinceOf(cursorIso) {
  if (!cursorIso) return new Date(Date.now() - FIRST_LOOKBACK_MS);
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
function advance(prev, maxMs, complete) {
  if (complete) return new Date().toISOString();
  if (!maxMs) return prev || "";
  var next = new Date(maxMs).toISOString();
  if (prev && Date.parse(next) <= Date.parse(prev)) return new Date(Date.parse(prev) + 1000).toISOString();
  return next;
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
        shipments: advance(cursor.shipments, maxTime(created.rows, ["createDate", "shipDate"]), created.complete),
        voids: advance(cursor.voids, maxTime(voided.rows, ["voidDate", "createDate"]), voided.complete),
        orders: advance(cursor.orders, maxTime(orders.rows, ["modifyDate", "createDate", "orderDate"]), orders.complete)
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
function cursorOf(saved, providerId) {
  if (!saved || saved.provider !== providerId) return { shipments: "", voids: "", orders: "" };
  return {
    shipments: saved.shipments || "",
    voids: saved.voids || "",
    orders: saved.orders || ""
  };
}

Deno.serve(async function (req) {
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!authorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
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

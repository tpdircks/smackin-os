/* ============================================================================
   Gusto fulfillment roster (reader only)
   Daily Fulfillment's employee dropdown is Troy's Fulfillment department,
   not the whole company. Gusto is the source of truth once access exists.

   Storage (written later by a server sync, never by this file):
     Supabase public.kv_status
     key:   fulfillment-daily-roster
     value: JSON string
       {
         "source": "gusto",
         "department": "Fulfillment",
         "names": ["First Last"],
         "synced_at": "2026-10-28T00:00:00.000Z"
       }

   This browser code only reads that row. A payload is used only when
   source is "gusto" and department is "Fulfillment". Anything else is
   ignored so a whole-company dump cannot fill the dropdown.

   Blocked: Troy cannot connect Gusto yet. Cole and Brian need to approve
   access (Michelle and Matt are copied). Until a real payload is stored,
   the screen keeps the Fulfillment names from the app directory.

   Do not put a Gusto token in this repo. When access exists, set these
   Supabase Edge Function secrets on project otwjxqhhwljwfyqbfuxz:
     GUSTO_API_TOKEN                  employees:read. No pay scope.
     GUSTO_COMPANY_ID                 Gusto company UUID.
     GUSTO_FULFILLMENT_DEPARTMENT     optional, default Fulfillment
     GUSTO_FULFILLMENT_DEPARTMENT_UUID  optional. When set, it wins.
     GUSTO_API_BASE                   optional, default https://api.gusto.com
   The sync itself is not in this change. See docs/gusto-fulfillment-roster.md.
   ========================================================================== */
(function (root) {
  "use strict";

  var ROSTER_KEY = "fulfillment-daily-roster";
  var LS_KEY = "fd-gusto-roster-v1";
  var DEPARTMENT = "Fulfillment";

  function cleanName(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function sortNames(list) {
    return list.slice().sort(function (a, b) { return a.localeCompare(b); });
  }

  function uniqueNames(list) {
    var out = [];
    var seen = {};
    (list || []).forEach(function (value) {
      var name = cleanName(value);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(name);
    });
    return sortNames(out);
  }

  function isFulfillmentDepartment(value) {
    return cleanName(value).toLowerCase() === DEPARTMENT.toLowerCase();
  }

  // Accept only a Gusto payload for the Fulfillment department.
  // Returns null when the row is missing, hand-edited, or company-wide.
  function parseRoster(raw) {
    if (raw == null || raw === "") return null;
    var obj = raw;
    if (typeof raw === "string") {
      try { obj = JSON.parse(raw); } catch (e) { return null; }
    }
    if (!obj || typeof obj !== "object") return null;
    if (obj.source !== "gusto") return null;
    if (!isFulfillmentDepartment(obj.department)) return null;
    if (!Array.isArray(obj.names)) return null;
    var names = uniqueNames(obj.names);
    if (!names.length) return null;
    return {
      source: "gusto",
      department: DEPARTMENT,
      names: names,
      synced_at: cleanName(obj.synced_at)
    };
  }

  function rosterPayload(names, extra) {
    extra = extra || {};
    var department = cleanName(extra.department || DEPARTMENT);
    return {
      source: "gusto",
      department: department,
      names: uniqueNames(names),
      synced_at: cleanName(extra.synced_at)
    };
  }

  function displayName(emp) {
    if (!emp) return "";
    var first = cleanName(emp.preferred_first_name || emp.first_name);
    var last = cleanName(emp.last_name);
    return cleanName(first + " " + last);
  }

  // Active means employed today. A termination that has taken effect counts
  // even if the terminated flag was left false.
  function isActive(emp) {
    if (!emp || emp.terminated === true) return false;
    var terms = emp.terminations;
    if (Array.isArray(terms)) {
      for (var i = 0; i < terms.length; i++) {
        if (terms[i] && terms[i].active === true) return false;
      }
    }
    return true;
  }

  // UUID wins when Troy supplies one. Otherwise match the department name.
  // Default name is Fulfillment. Other departments never pass.
  function inFulfillment(emp, opts) {
    if (!emp) return false;
    opts = opts || {};
    var uuid = cleanName(opts.departmentUuid);
    if (uuid) return cleanName(emp.department_uuid) === uuid;
    var want = cleanName(opts.department || DEPARTMENT).toLowerCase();
    return cleanName(emp.department).toLowerCase() === want;
  }

  function fulfillmentNames(employees, opts) {
    var names = [];
    (employees || []).forEach(function (emp) {
      if (!isActive(emp) || !inFulfillment(emp, opts)) return;
      var name = displayName(emp);
      if (name) names.push(name);
    });
    return uniqueNames(names);
  }

  // Keep a name already logged on this day even after they leave the roster.
  function withHistorical(active, selected) {
    var names = uniqueNames(active);
    var current = {};
    names.forEach(function (n) { current[n.toLowerCase()] = true; });
    var picked = cleanName(selected);
    if (picked && !current[picked.toLowerCase()]) names = uniqueNames(names.concat([picked]));
    return names.map(function (n) {
      return { name: n, historical: !current[n.toLowerCase()] };
    });
  }

  function readCache() {
    try {
      if (typeof localStorage === "undefined") return null;
      return parseRoster(localStorage.getItem(LS_KEY));
    } catch (e) { return null; }
  }

  function writeCache(rec) {
    try {
      if (typeof localStorage === "undefined" || !rec) return;
      localStorage.setItem(LS_KEY, JSON.stringify(rec));
    } catch (e) {}
  }

  function current() {
    var fromCloud = null;
    try {
      if (root.DB && typeof root.DB.kvGet === "function") fromCloud = parseRoster(root.DB.kvGet(ROSTER_KEY));
    } catch (e) { fromCloud = null; }
    if (fromCloud) { writeCache(fromCloud); return fromCloud; }
    return readCache();
  }

  function names() {
    var rec = current();
    return rec ? rec.names.slice() : [];
  }

  function syncedAt() {
    var rec = current();
    if (!rec || !rec.synced_at) return "";
    var s = String(rec.synced_at);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  var api = {
    ROSTER_KEY: ROSTER_KEY,
    DEPARTMENT: DEPARTMENT,
    parseRoster: parseRoster,
    rosterPayload: rosterPayload,
    displayName: displayName,
    isActive: isActive,
    inFulfillment: inFulfillment,
    fulfillmentNames: fulfillmentNames,
    withHistorical: withHistorical,
    names: names,
    syncedAt: syncedAt,
    current: current
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GUSTO_ROSTER = api;
})(typeof window !== "undefined" ? window : globalThis);

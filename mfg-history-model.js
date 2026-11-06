/* Mixing and P-Mac history split. No network. No DOM.
   Detail-sheet rows tagged Mixing are packages, not bins.
   A Detail row is a duplicate of a mixing-tracker row only when the date,
   operator, flavor, machine, and package quantity match that bin run.
   Date and flavor alone are not a duplicate. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MFGHIST_MODEL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function normToken(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function numKey(v) {
    if (v == null || v === "") return "";
    var n = parseFloat(String(v).replace(/,/g, ""));
    if (!isFinite(n)) return "";
    return String(n);
  }
  function runDate(r) {
    return String((r && r.run_date) || "").slice(0, 10);
  }
  function flavorKey(r) {
    var code = normToken(r && r.flavor_code);
    if (code) return code;
    return normToken(r && r.flavor_name);
  }
  function deptKind(dept) {
    var d = normToken(dept);
    if (!d) return "pmac";
    if (d === "mixing" || d === "mix") return "mixing";
    if (d === "pmac") return "pmac";
    return "other";
  }
  function partitionPmac(rows) {
    var pmac = [], mixing = [], other = [];
    (rows || []).forEach(function (r) {
      var k = deptKind(r && r.dept);
      if (k === "mixing") mixing.push(r);
      else if (k === "other") other.push(r);
      else pmac.push(r);
    });
    return { pmac: pmac, mixing: mixing, other: other };
  }
  function identityKey(r, qty) {
    return [runDate(r), normToken(r.operator), flavorKey(r), normToken(r.machine), numKey(qty)].join("|");
  }
  function historyToMixing(r) {
    return {
      run_date: runDate(r),
      flavor_code: r.flavor_code || "",
      flavor_name: r.flavor_name || "",
      operator: r.operator || "",
      machine: r.machine || "",
      shift: r.shift || "",
      total_bins: num(r.total_bins),
      unit: "bins",
      src: "mixing_history"
    };
  }
  function detailToMixing(r) {
    return {
      run_date: runDate(r),
      flavor_code: r.flavor_code || "",
      flavor_name: r.flavor_name || "",
      operator: r.operator || "",
      machine: r.machine || "",
      shift: r.shift || "",
      bag_size: r.bag_size || "",
      total_bins: null,
      total_pkgs: num(r.total_pkgs),
      box_count: num(r.box_count),
      unit: "packages",
      src: "pmac_history"
    };
  }
  function unionMixing(historyRows, detailRows) {
    var seen = {};
    var out = [];
    (historyRows || []).forEach(function (raw) {
      var r = historyToMixing(raw);
      if (!r.run_date) return;
      var k = identityKey(r, r.total_bins);
      if (numKey(r.total_bins) !== "") seen[k] = (seen[k] || 0) + 1;
      out.push(r);
    });
    (detailRows || []).forEach(function (raw) {
      var r = detailToMixing(raw);
      if (!r.run_date) return;
      var k = identityKey(r, r.total_pkgs);
      if (numKey(r.total_pkgs) !== "" && seen[k]) {
        seen[k]--;
        return;
      }
      out.push(r);
    });
    out.sort(function (a, b) {
      if (a.run_date < b.run_date) return -1;
      if (a.run_date > b.run_date) return 1;
      return 0;
    });
    return out;
  }
  function summarizeMixing(rows) {
    var bins = 0, packages = 0, binRuns = 0, pkgRuns = 0, days = {};
    (rows || []).forEach(function (r) {
      if (r.run_date) days[r.run_date] = 1;
      if (r.unit === "packages") { packages += num(r.total_pkgs); pkgRuns++; }
      else { bins += num(r.total_bins); binRuns++; }
    });
    return {
      bins: bins,
      packages: packages,
      binRuns: binRuns,
      pkgRuns: pkgRuns,
      runs: (rows || []).length,
      days: Object.keys(days).length
    };
  }
  function volumeByMonth(rows, unit) {
    var m = {};
    (rows || []).forEach(function (r) {
      if ((r.unit || "bins") !== unit) return;
      var k = String(r.run_date || "").slice(0, 7);
      if (!k) return;
      var v = unit === "packages" ? num(r.total_pkgs) : num(r.total_bins);
      m[k] = (m[k] || 0) + v;
    });
    return Object.keys(m).sort().map(function (k) { return { k: k, v: m[k] }; });
  }
  function flavorLabel(r) {
    return ((r.flavor_code ? r.flavor_code + " - " : "") + (r.flavor_name || "")).trim();
  }
  function flavorRollup(rows) {
    var m = {};
    (rows || []).forEach(function (r) {
      var k = flavorLabel(r);
      if (!k) return;
      if (!m[k]) m[k] = { k: k, bins: 0, packages: 0 };
      if (r.unit === "packages") m[k].packages += num(r.total_pkgs);
      else m[k].bins += num(r.total_bins);
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) {
      if (b.bins !== a.bins) return b.bins - a.bins;
      return b.packages - a.packages;
    });
  }

  return {
    deptKind: deptKind,
    partitionPmac: partitionPmac,
    unionMixing: unionMixing,
    summarizeMixing: summarizeMixing,
    volumeByMonth: volumeByMonth,
    flavorRollup: flavorRollup
  };
});

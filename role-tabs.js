/* Tab visibility. Every signed-in person gets the full manager list.
   The old presets are kept so the regression check can name what changed.
   They are not applied. Edit rights are not decided here. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ROLE_TABS_API = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BEFORE = {
    all: null,
    receiving: ["home", "dash", "adjust", "receive", "putaway", "returns", "qa", "count", "locations", "labels"],
    production: ["home", "dash", "adjust", "produce", "seasoning", "move", "orders", "orderdocs", "count", "locations"],
    mixing: ["home", "mixing", "floor", "seasoning", "produce", "count"],
    pmac: ["home", "pmac", "floor", "labels"],
    rnd: ["home", "rd"]
  };

  function visibleFor(role, canonical) {
    var full = (canonical && canonical.length) ? canonical.slice() : [];
    return full;
  }

  return {
    BEFORE: BEFORE,
    visibleFor: visibleFor
  };
});

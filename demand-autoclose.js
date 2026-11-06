/* Smackin' OS - conservative demand view. Due date is not shipping proof.
   Per-DC lines remain distinct. Target and SPS lines remain Open until a source
   proves their status. All other old lines remain Open for source review too.
   No database writes are performed by this module.
*/
(function () {
  "use strict";
  var CUTOFF_DAYS = 60;
  function dueMs(s) {
    var m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[1] - 1, +m[2]).getTime();
  }
  function derive(raw) { return Array.isArray(raw) ? raw : []; }
  function bind() {
    if (!window.DB || typeof DB.demandLines !== "function") return false;
    if (DB.__demandAutocloseWrapped) return true;
    var orig = DB.demandLines.bind(DB);
    DB.demandLinesRaw = orig;
    DB.demandLines = function () { try { return derive(orig()); } catch (e) { return orig(); } };
    DB.__demandAutocloseWrapped = true;
    return true;
  }
  if (!bind()) { var n = 0; var iv = setInterval(function () { if (bind() || ++n > 40) clearInterval(iv); }, 250); }
})();

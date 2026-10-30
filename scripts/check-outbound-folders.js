/* Customer Drive folder matching for Shipping Log. */
var fs = require("fs");
var path = require("path");
var obf = require("../outbound-folders.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

function urlOf(name) {
  var hit = obf.customers.filter(function (c) { return c.name === name; })[0];
  if (!hit) throw new Error("missing customer " + name);
  return hit.url;
}

assert(obf.customers.length === 51, "51 customers " + obf.customers.length);
assert(obf.parentId === "1R09e8kP3HZAujKKQ76lFezfm1XhpuBzz", "parent id");
assert(obf.parentUrl === "https://drive.google.com/drive/folders/1R09e8kP3HZAujKKQ76lFezfm1XhpuBzz", "parent url");

var seen = {};
obf.customers.forEach(function (c) {
  assert(c.url === "https://drive.google.com/drive/folders/" + c.folder_id, "url " + c.name);
  assert(c.url.indexOf(obf.parentId) < 0, "not parent " + c.name);
  assert(!seen[c.folder_id], "dup id " + c.name);
  seen[c.folder_id] = 1;
});

assert(obf.match("Target") === urlOf("Target"), "Target");
assert(obf.match("McLane") === urlOf("McLane"), "McLane");
assert(obf.match("Scheels") === urlOf("Scheels"), "Scheels");
assert(obf.match("TARGET DC 3806") === urlOf("Target"), "Target DC");
assert(obf.match("McLane / Temple, TX") === urlOf("McLane"), "McLane temple");
assert(obf.match("Scheels All Sports") === urlOf("Scheels"), "Scheels sports");
assert(obf.match("UNFI - Rocklin") === urlOf("UNFI - Rocklin"), "UNFI Rocklin exact");
assert(obf.match("UNFI/MILLBROOK") === urlOf("UNFI/MILLBROOK"), "UNFI millbrook exact");
assert(obf.match("UNFI Millbrook") === urlOf("UNFI/MILLBROOK"), "UNFI Millbrook alias");
assert(obf.match("UNFI Rocklin DC") === urlOf("UNFI - Rocklin"), "UNFI Rocklin DC");
assert(obf.match("UNFI") === null, "bare UNFI is ambiguous");
assert(obf.hrefFor("UNFI") === obf.parentUrl, "bare UNFI opens parent");
assert(obf.match("Hy-Vee") === urlOf("HY VEE"), "Hy-Vee");
assert(obf.match("hyvee") === urlOf("HY VEE"), "hyvee");
assert(obf.match("Coremark") === urlOf("Core-Mark"), "coremark");
assert(obf.match("GFS") === urlOf("Gordon Food Service"), "gfs");
assert(obf.match("TikTok") === urlOf("TIKTOK Shop"), "tiktok");
assert(obf.match("Wal-Mart") === urlOf("Walmart"), "wal mart");
assert(obf.match("Herman") === urlOf("Herman's"), "herman");
assert(obf.match("Intermountain Farmers Association") === urlOf("Intermountain Farmes association"), "intermountain typo");
assert(obf.match("KFM") === urlOf("KFM Affordable Leasing"), "kfm");
assert(obf.match("Affordable Leasing") === urlOf("Affordable Leasing & Distributing"), "affordable not kfm");
assert(obf.match("Bass Pro Shops") === urlOf("Bass Pro"), "bass pro");
assert(obf.match("PIAS") === urlOf("PIAS - Christian Esparza Garcia"), "pias");
assert(obf.match("Play It Again Sports") === urlOf("Play It Again"), "play it again not pias");
assert(obf.match("") === null, "empty");
assert(obf.match("Not A Customer XYZ") === null, "unknown");
assert(obf.hrefFor("Not A Customer XYZ") === obf.parentUrl, "unknown parent");
assert(obf.unmatched(["Target", "UNFI", "Acme Foods", "Target"]).join("|") === "Acme Foods|UNFI", "unmatched list");

var src = fs.readFileSync(path.join(__dirname, "..", "outbound-folders.js"), "utf8");
assert(src.indexOf("\u2014") < 0, "em dash in outbound-folders.js");
assert(src.indexOf("window.OUTBOUND_FOLDERS") >= 0 || src.indexOf("OUTBOUND_FOLDERS") >= 0, "global");
var html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert(html.indexOf("outbound-folders.js") >= 0, "index script");
var sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert(sw.indexOf('const CACHE = "smackin-inv-v250"') >= 0 && sw.indexOf("./outbound-folders.js") >= 0 && sw.indexOf("./wip-production.js") >= 0, "cache bump");
assert(sw.indexOf('const CACHE = "smackin-inv-v241"') < 0, "old cache gone");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok", obf.customers.length, "folders");

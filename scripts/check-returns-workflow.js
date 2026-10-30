/* Inventory returns disposition and adjustTotal location guard. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

var root = path.join(__dirname, "..");
var wfSrc = fs.readFileSync(path.join(root, "returns-workflow.js"), "utf8");
var dbSrc = fs.readFileSync(path.join(root, "db.js"), "utf8");
var appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
var faSrc = fs.readFileSync(path.join(root, "fulfillment-analytics.js"), "utf8");
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var sw = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

assert(wfSrc.indexOf("\u2014") < 0, "em dash in returns-workflow.js");
assert(html.indexOf('src="returns-workflow.js?b=1"') >= 0, "script tag");
assert(html.indexOf("app.js?b=") < html.indexOf("returns-workflow.js?b="), "loads after app");
assert(sw.indexOf('const CACHE = "smackin-inv-v254"') >= 0 && sw.indexOf("./returns-workflow.js") >= 0, "cache");
assert(appSrc.indexOf("RETURNS_WF.view") >= 0, "returns view delegates");
assert(appSrc.indexOf('items:["returns","dash"') >= 0, "inventory nav owns returns");
assert(appSrc.indexOf('items:["receive","recvlog","returns","qa"]') >= 0, "receiving shortcut");
assert(faSrc.indexOf('rest("returns_log",') < 0, "fulfillment does not post returns");
assert(dbSrc.indexOf("ADJUST_SKIP_LOCATIONS") >= 0, "skip list");
["RETURNS", "QUARANTINE", "QA-HOLD", "RETURNS-HOLD"].forEach(function (loc) {
  assert(dbSrc.indexOf('"' + loc + '"') >= 0, "skip " + loc);
});
assert(dbSrc.indexOf("rows.slice().sort((a, b) => Number(b.qty) - Number(a.qty))[0].location") < 0, "old largest-row target is gone");

var window = {};
vm.createContext(window);
vm.runInContext(wfSrc, window);
var RW = window.RETURNS_WF;

var hold = RW.planAdds([{ item_id: "BAG4-S07", qty: 12 }], "Hold", "");
assert(hold.location === "RETURNS-HOLD" && hold.adds.length === 1 && hold.adds[0].qty === 12, "hold location");
assert(RW.isHoldLoc("RETURNS-HOLD") && !RW.isHoldLoc("RECEIVING") && !RW.isHoldLoc("RETURNS"), "hold set");

var rel = RW.planAdds([{ item_id: "BAG4-S01", qty: 4 }], "Release", "RETURNS");
assert(rel.error === "returns" && rel.adds.length === 0, "release refuses RETURNS");
var relOk = RW.planAdds([{ item_id: "BAG4-S01", qty: 4 }], "Release", "");
assert(relOk.location === "RECEIVING" && relOk.adds[0].qty === 4, "release receiving");

var scrap = RW.planAdds([{ item_id: "BAG4-S01", qty: 4 }], "Scrap", "RECEIVING");
assert(scrap.adds.length === 0 && scrap.location === "", "scrap has no stock");

var other = RW.planAdds([{ item_id: "BAG4-S01", qty: 3 }], "Other", "");
assert(other.adds.length === 0, "other without dest");
var otherGo = RW.planAdds([{ item_id: "BAG4-S01", qty: 3 }], "Other", "RECEIVING");
assert(otherGo.location === "RECEIVING" && otherGo.adds.length === 1, "other with dest");
var otherHold = RW.planAdds([{ item_id: "BAG4-S01", qty: 3 }], "Other", "QUARANTINE");
assert(otherHold.location === "QUARANTINE" && RW.isHoldLoc(otherHold.location), "other can stay held");

var buck = RW.buckets(10, "Hold");
assert(buck.status === "held" && buck.qty_hold === 10 && buck.qty_release === 0, "hold bucket");
assert(RW.isOpenRow({ status: "held", qty_hold: 2 }) && !RW.isOpenRow({ status: "", disposition: "Restock", restocked: true, qty_hold: 0 }), "open queue");

assert(RW.legacyLocation({ disposition: "Restock", restocked: true, qty: 6 }) === "RETURNS", "legacy restock location");
assert(RW.legacyLocation({ disposition: "Quarantine", restocked: true }) === "QUARANTINE", "legacy quarantine");
assert(RW.legacyLocation({ disposition: "Scrap", restocked: false }) === "", "legacy scrap");
assert(RW.recordedMoves({ stock_moves: [{ item_id: "BAG4-S07", location: "returns-hold", qty: 5 }] }).length === 1, "recorded moves");
assert(RW.recordedMoves({ stock_moves: [{ item_id: "BAG4-S07", location: "returns-hold", qty: 5 }] })[0].location === "RETURNS-HOLD", "move loc normalized");

var fake = {
  itemByCode: function (code) {
    if (code === "B4-S07" || code === "BAG4-S07") return { id: "BAG4-S07", code: "B4-S07", name: "Bags 4oz - Cheddar Jalapeno" };
    return null;
  }
};
var mc = RW.targetsFor("ITEM:MCS-S07", 2, fake);
assert(mc.tracked && mc.parts.length === 1 && mc.parts[0].item_id === "BAG4-S07" && mc.parts[0].qty === 144, "master case is 72 bags");
var plain = RW.targetsFor("ITEM:B4-S07", 3, fake);
assert(plain.parts[0].qty === 3 && plain.parts[0].item_id === "BAG4-S07", "bag item");

var dbWindow = {
  SMACKIN_CONFIG: {},
  fetch: function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } }); }
};
dbWindow.window = dbWindow;
vm.createContext(dbWindow);
vm.runInContext(dbSrc, dbWindow);
var DB = dbWindow.DB;
assert(DB.adjustTargetLocation([{ location: "RETURNS", qty: 36000 }]) === "RECEIVING", "returns-only parks in receiving");
assert(DB.adjustTargetLocation([
  { location: "RETURNS", qty: 36000 },
  { location: "RECEIVING", qty: 100 }
]) === "RECEIVING", "does not pick the larger RETURNS row");
assert(DB.adjustTargetLocation([
  { location: "ST-01", qty: 5000 },
  { location: "RECEIVING", qty: 100 },
  { location: "RETURNS", qty: 9000 }
]) === "ST-01", "largest non-skip location");
assert(DB.adjustTargetLocation([
  { location: "QUARANTINE", qty: 40 },
  { location: "QA-HOLD", qty: 10 },
  { location: "RETURNS-HOLD", qty: 8 }
]) === "RECEIVING", "hold-only parks in receiving");
assert(DB.isHoldLocation("RETURNS-HOLD") && DB.isHoldLocation("QUARANTINE") && !DB.isHoldLocation("RETURNS") && !DB.isHoldLocation("RECEIVING"), "available hold set");
assert(DB.ADJUST_SKIP_LOCATIONS.indexOf("RETURNS") >= 0 && DB.HOLD_LOCATIONS.indexOf("RETURNS") < 0, "RETURNS is skipped for counts and still on-hand");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("ok returns workflow");

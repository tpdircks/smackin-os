/* Lane rules, QA hold, portal links, and CSV for Shipping Log. */
var lanes = require("../shipping-lanes.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}

function xpo(extra) {
  return Object.assign({
    lane: "xpo",
    ship_date: "2026-10-28",
    recipient: "Costco",
    address: "DC 1",
    requested_by: "Troy",
    contents: "OG 4oz",
    lot: "L1",
    po_num: "PO1",
    bol_number: "BOL1",
    pallet_count: "2",
    weight_lb: "400",
    freight_class: "70",
    seal_number: "S1",
    tracking: "",
    status: "Pending"
  }, extra || {});
}

var pending = lanes.validateShipment(xpo(), {});
assert(pending === "", "xpo pending " + pending);

var noPro = lanes.validateShipment(xpo({ status: "Shipped" }), {});
assert(noPro.indexOf("PRO") >= 0 && noPro.indexOf("BOL") >= 0, "xpo shipped needs PRO and BOL: " + noPro);

var shipped = lanes.validateShipment(xpo({ status: "Shipped", tracking: "123" }), {});
assert(shipped === "", "xpo shipped " + shipped);

var noBol = lanes.validateShipment(xpo({ bol_number: "", status: "Pending" }), {});
assert(noBol.indexOf("BOL") >= 0, "xpo bol " + noBol);

var noPallet = lanes.validateShipment(xpo({ pallet_count: "" }), {});
assert(noPallet.indexOf("Pallet") >= 0, "xpo pallets " + noPallet);

var wwex = Object.assign(xpo({ lane: "wwex", pallet_count: "", carton_count: "12", status: "Pending" }), { freight_class: "", seal_number: "" });
assert(lanes.validateShipment(wwex, {}) === "", "wwex pending without pallet " + lanes.validateShipment(wwex, {}));
var wwexCarton = lanes.validateShipment(Object.assign({}, wwex, { carton_count: "" }), {});
assert(wwexCarton.indexOf("Carton") >= 0, "wwex cartons " + wwexCarton);
var wwexShip = lanes.validateShipment(Object.assign({}, wwex, { status: "Shipped" }), {});
assert(wwexShip.indexOf("PRO") >= 0, "wwex shipped " + wwexShip);

var ss = {
  lane: "shipstation", ship_date: "2026-10-28", recipient: "Web", requested_by: "sync",
  contents: "bag", lot: "", status: "Shipped", tracking: "1Z", bol_number: ""
};
assert(lanes.validateShipment(ss, {}).indexOf("Lot") >= 0, "ss lot");
assert(lanes.validateShipment(ss, { sync: true }) === "", "ss sync skips required");

var held = lanes.validateShipment(xpo({ status: "Shipped", tracking: "123" }), { hold: { status: "held" } });
assert(held.indexOf("QA hold") >= 0, "hold blocks " + held);
var anyway = lanes.validateShipment(xpo({ status: "Shipped", tracking: "123" }), { hold: { status: "held" }, anyway: true, anywayReason: "QA released by phone" });
assert(anyway === "", "ship anyway " + anyway);
var pendingHold = lanes.validateShipment(xpo({ status: "Pending" }), { hold: { status: "held" } });
assert(pendingHold === "", "pending allowed on hold " + pendingHold);
var syncHeld = lanes.validateShipment(ss, { sync: true, syncAlready: true, hold: { status: "held" } });
assert(syncHeld === "", "already shipped sync can save the lot");

assert(lanes.holdBlocks("held") === true, "held");
assert(lanes.holdBlocks("Held") === true, "Held");
assert(lanes.holdBlocks("Open") === true, "Open");
assert(lanes.holdBlocks("destroyed") === true, "destroyed");
assert(lanes.holdBlocks("returned_to_vendor") === true, "returned");
assert(lanes.holdBlocks("other") === true, "other");
assert(lanes.holdBlocks("released") === false, "released");
assert(lanes.holdBlocks("Released") === false, "Released");
assert(lanes.holdBlocks("closed") === false, "closed");
assert(lanes.holdBlocks("") === false, "blank");

var holds = [
  { id: "11111111-1111-4111-8111-111111111111", lot: "ab c", status: "released", hold_reason: "done" },
  { id: "22222222-2222-4222-8222-222222222222", lot: "ABC", status: "held", hold_reason: "coa", shipping_log_id: "33333333-3333-4333-8333-333333333333" }
];
var hit = lanes.findHold("A BC", holds, [], "");
assert(hit && hit.status === "held", "normalized lot hold");
assert(lanes.findHold("ABC", [{ lot: "ABC", status: "released" }], [{ lot: "ABC", on_hold: true, id: "r1", deviation_actions: "N" }], "").source === "receiving_log", "receiving on_hold");
assert(lanes.findHold("NOPE", holds, [], "33333333-3333-4333-8333-333333333333").id === "22222222-2222-4222-8222-222222222222", "link by shipping_log_id");

var marker = "[[SHIPSYNC:shipstation:shipment:99]]";
var notes = lanes.withLane(marker, { lane: "xpo", bol_number: "B9" });
assert(notes.indexOf(marker) >= 0, "shipsync kept");
assert(lanes.parseLane(notes).bol_number === "B9", "parse lane");
assert(lanes.stripLane(notes) === marker, "strip lane " + lanes.stripLane(notes));
var why = lanes.withAnyway(notes, "phone ok");
assert(why.indexOf("Ship anyway: phone ok") >= 0 && why.indexOf(marker) >= 0, "anyway keeps marker");
assert(lanes.hasAnyway(why) === true, "has anyway");

assert(lanes.laneOf({ carrier: "XPO Logistics" }) === "xpo", "infer xpo");
assert(lanes.laneOf({ carrier: "Worldwide Express" }) === "wwex", "infer wwex");
assert(lanes.laneOf({ entered_by: "sync:shipstation", carrier: "UPS" }) === "shipstation", "infer sync");
assert(lanes.isSync({ notes: marker }) === true, "sync marker");
assert(lanes.ssHold({ status: "on_hold" }) === true, "ss hold");
assert(lanes.ssHold({ status: "Shipped", qa_hold: true }) === false, "qa is not ss hold");

var row = lanes.holdInsert({
  held_by: "Troy", item_name: "OG", lot: "L1", reason: "temp",
  shipping_log_id: "33333333-3333-4333-8333-333333333333"
});
assert(row.status === "held", "hold status held");
assert(row.shipping_log_id === "33333333-3333-4333-8333-333333333333", "shipping link");
assert(!lanes.holdInsert({ shipping_log_id: "SHP-local" }).shipping_log_id, "skip bad uuid");

var patch = lanes.columnPatch(xpo({ pickup_date: "", pallet_count: "3", qa_hold: true, hold_log_id: null }));
assert(patch.lane === "xpo" && patch.pallet_count === 3 && patch.pickup_date === null && patch.qa_hold === true, "column patch");

var csv = lanes.csvFor([
  { ship_date: "2026-10-01", lane: "xpo", recipient: "A", tracking: "P1", bol_number: "B", lot: "L", status: "Shipped", qa_hold: true, hold_log_id: "h1", entered_by: "Troy", created_at: "2026-10-01T00:00:00Z", notes: marker + "\n[[LANE:{\"lane\":\"xpo\"}]]", cost: 10 },
  { ship_date: "2026-10-20", lane: "shipstation", recipient: "B", status: "on_hold", qa_hold: false, entered_by: "sync:shipstation", tracking: "1Z", carrier: "UPS", notes: marker + "\n[[LANE:{\"lane\":\"shipstation\"}]]" }
], { from: "2026-10-15", lane: "shipstation" });
assert(csv.indexOf("QA hold") >= 0 && csv.indexOf("SS hold") >= 0, "csv headers");
assert(csv.indexOf("ShipStation E-com") >= 0, "csv lane");
assert(csv.indexOf("\"Yes\"") >= 0, "csv ss hold yes");
assert(csv.indexOf("P1") < 0, "date and lane filter drops xpo");
assert(csv.indexOf(marker) >= 0 && csv.indexOf("[[LANE:") < 0, "csv keeps shipsync and drops lane blob");

assert(lanes.SHIP_LANES.xpo.portal === "https://ltl.xpo.com/", "xpo portal");
assert(lanes.SHIP_LANES.wwex.portal === "https://speedship.wwex.com/", "wwex portal");
assert(lanes.SHIP_LANES.shipstation.portal === "https://ship.shipstation.com/", "ss portal");
assert(lanes.SHIP_LANES.xpo.provider === "link" && lanes.SHIP_LANES.shipstation.provider === "sync", "providers");
assert(lanes.SHIP_LANES.xpo.track("PRO 1") === "https://ltl.xpo.com/webapp/manifestrpts_p_app/shipmentTracking.do?PRO=PRO%201", "xpo track");
assert(lanes.SHIP_LANES.wwex.track("999") === "https://track.speedship.com/#999", "wwex track");
assert(lanes.trackUrl("UPS", "1Z") === "https://www.ups.com/track?tracknum=1Z", "ups track");
var book = lanes.portalHtml("xpo", "999", "XPO");
assert(book.indexOf("https://ltl.xpo.com/") >= 0 && book.indexOf("Book in XPO") >= 0 && book.indexOf("shipmentTracking.do?PRO=999") >= 0, "book and track");

var gate = lanes.gateStatus({ lane: "wwex", tracking: "", bol_number: "", lot: "" }, "Shipped");
assert(gate.indexOf("PRO") >= 0, "status button blocks " + gate);
assert(lanes.gateStatus({ lane: "other", tracking: "", status: "Pending" }, "Shipped") === "", "other status advance");

[pending, noPro, held, anyway, noBol, wwexCarton].forEach(function (msg) {
  assert(msg.indexOf("\u2014") < 0 && msg.indexOf("\u2013") < 0, "dash in " + msg);
});

assert(lanes.CSV_HEAD.indexOf("Entered by") >= 0 && lanes.CSV_HEAD.indexOf("Created at") >= 0 && lanes.CSV_HEAD.indexOf("Hold log id") >= 0, "audit columns");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("shipping lane checks ok");

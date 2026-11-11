#!/usr/bin/env node
/* Supplier PO line preview and saved-line edits. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

var syntax = cp.spawnSync(process.execPath, ["--check", path.join(root, "po-lines.js")], { encoding: "utf8" });
eq(syntax.status === 0, "po-lines syntax " + (syntax.stderr || ""));
var appSyntax = cp.spawnSync(process.execPath, ["--check", path.join(root, "app.js")], { encoding: "utf8" });
eq(appSyntax.status === 0, "app syntax");

var P = require(path.join(root, "po-lines.js"));
var src = read("po-lines.js");
var app = read("app.js");
var db = read("db.js");
var html = read("index.html");
var sw = read("service-worker.js");
var michelle = "michelle.nydegger@smackinsnacks.com";
var troy = "troy.dircks@smackinsnacks.com";
var when = "2026-11-06T15:00:00.000Z";

eq(P.canEdit(michelle) && P.canEdit("Michelle.Nydegger@SmackinSnacks.com"), "michelle");
eq(P.canEdit(troy), "troy");
eq(P.canEdit("mattb@smackinsnacks.com") && P.canEdit("MattB@SmackinSnacks.com"), "matt");
["inventory@smackinsnacks.com", "allen.back@smackinsnacks.com", "brittney.christensen@smackinsnacks.com", "", null, "michelle.nydegger@example.com", "matt@smackinsnacks.com"].forEach(function (email) {
  eq(!P.canEdit(email), "not an editor: " + email);
});

eq(P.skipNote(3) === "3 lines with 0 qty were skipped", "skip note");
eq(P.skipNote(1) === "1 line with 0 qty was skipped", "skip note singular");

P.loadPreview({
  lines: JSON.stringify([
    { item: "FILM-4", desc: "4 oz film", qty: "12", unit: "cs", price: "1.25", lot: "L1" },
    { item: "ZERO", desc: "no qty", qty: "0", price: "4", lot: "L1", extra: "keep-me" },
    { item: "BLANK", desc: "empty qty", qty: "", price: "2" },
    { item: "MISSING", desc: "no qty field", price: "3" },
    { item: "CASES0", description: "cases", cases: "0", quantity: "" }
  ])
});
eq(P.skippedCount() === 4, "four zero lines " + P.skippedCount());
eq(P.skipNote() === "4 lines with 0 qty were skipped", "preview note");
var kept = P.linesForSave();
eq(kept.length === 1 && kept[0].item === "FILM-4" && kept[0].qty === "12", "zeros dropped from save");
eq(kept[0].lot === "L1" && kept[0].unit === "cs", "kept line keeps its fields");

P.setShowZero(true, michelle);
eq(P.previewState().showZero === true, "show zeros");
eq(P.linesForSave().length === 1 && P.linesForSave()[0].item === "FILM-4", "shown zeros still skipped");
var zero = P.previewState().lines.filter(function (l) { return l.item === "ZERO"; })[0];
eq(!!zero, "zero line still in the preview");
P.previewSet({ lid: zero._lid, field: "qty", value: "4" }, michelle);
var afterFix = P.linesForSave();
eq(afterFix.some(function (l) { return l.item === "ZERO" && String(l.qty) === "4"; }), "fixed zero is kept");
eq(afterFix.length === 2, "only the fixed zero joins the save");

P.loadPreview({
  lines: [
    { item: "KEEP", qty: "3", price: "2", lot: "SAME" },
    { item: "DROP", qty: "8", price: "1", lot: "SAME" }
  ]
});
var drop = P.previewState().lines.filter(function (l) { return l.item === "DROP"; })[0];
var denied = P.removePreview(drop._lid, "inventory@smackinsnacks.com");
eq(denied.ok === false && denied.reason === "forbidden", "other users cannot remove a preview line");
eq(P.linesForSave().length === 2, "denied remove stays in the save");
var removed = P.removePreview(drop._lid, "mattb@smackinsnacks.com");
eq(removed.ok === true, "matt can remove a preview line");
var left = P.linesForSave();
eq(left.length === 1 && left[0].item === "KEEP" && left[0].lot === "SAME", "removed line is excluded");
eq(!left.some(function (l) { return l.item === "DROP"; }), "dropped item is gone");

function po(id, lines, extra) {
  var row = {
    id: id,
    vendor: "Belmark",
    po_num: "MN110626",
    po_date: "2026-11-06",
    total: "30",
    item_count: lines.length,
    notes: "Rush [[ETA:2026-12-01]]",
    file_url: "https://example.test/po.pdf",
    file_name: "po.pdf",
    uploaded_by: "Michelle",
    lines: JSON.stringify(lines)
  };
  if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
  return row;
}
var lineA = { _lid: "a", item: "FILM-A", desc: "Film A", qty: "10", price: "1", unit: "cs", lot: "L1", recv: false, custom: "alpha" };
var lineB = { _lid: "b", item: "FILM-B", desc: "Film B", qty: "5", price: "2", unit: "rl", lot: "L1", recv: true, recv_date: "2026-11-01", custom: "beta" };
var lineZero = { _lid: "z", item: "ZERO", desc: "Zero bags", qty: "0", price: "9", unit: "ea", lot: "L1", custom: "zero-row", note_line: "full" };
var target = po("SPO-1", [lineA, lineB, lineZero]);
var sibling = po("SPO-2", [{ _lid: "s", item: "OTHER", qty: "7", price: "3", lot: "L1", custom: "sibling" }], { vendor: "Other Vendor", po_num: "OTHER-1" });
var siblingJson = JSON.stringify(sibling);
var store = { supplier_pos: [target, sibling], audit_log: [] };
var before = JSON.parse(JSON.stringify(target));
var actor = { email: michelle, when: when };

var edit = P.applyStore(store, "SPO-1", { edits: [{ lid: "b", fields: { qty: "9", price: "4", unit: "box" } }] }, actor);
eq(edit.ok === true && edit.changed === true, "edit ok");
eq(store.supplier_pos.length === 2, "edit does not insert a row");
eq(JSON.stringify(store.supplier_pos[1]) === siblingJson, "other PO with the same lot stays");
var edited = JSON.parse(store.supplier_pos[0].lines);
eq(edited.length === 3, "edit keeps every line");
eq(edited[0]._lid === "a" && edited[0].qty === "10" && edited[0].price === "1" && edited[0].custom === "alpha" && edited[0].lot === "L1", "untouched line");
eq(edited[1]._lid === "b" && edited[1].qty === "9" && edited[1].price === "4" && edited[1].unit === "box", "edited line");
eq(edited[1].recv === true && edited[1].recv_date === "2026-11-01" && edited[1].custom === "beta", "edit keeps the rest of that line");
eq(edited[2].qty === "0" && edited[2].custom === "zero-row", "zero line stays until deleted");
eq(edit.query.table === "supplier_pos" && edit.query.op === "update" && edit.query.matchKeys.join(",") === "id", "update matches id");
eq(edit.query.match.lot == null, "update does not match lot");
eq(edit.history.length === 1 && edit.history[0].action === "update", "edit history");
eq(edit.history[0].table_name === "supplier_pos" && edit.history[0].row_pk === "SPO-1", "edit record");
eq(edit.history[0].user_email === michelle && edit.history[0].changed_at === when, "edit who and when");
eq(edit.history[0].old_row && edit.history[0].new_row, "edit old and new");
var histLines = JSON.parse(edit.history[0].new_row.lines);
eq(histLines[1].qty === "9" && histLines[0].qty === "10", "history new row is the edited PO");
eq(store.audit_log.length === 1 && store.audit_log[0].action === "update", "edit wrote the trail");

var blocked = P.applyStore(store, "SPO-1", { edits: [{ lid: "a", fields: { qty: "99" } }] }, { email: "inventory@smackinsnacks.com", when: when });
eq(blocked.ok === false && blocked.reason === "forbidden", "other users cannot edit a saved line");
eq(JSON.parse(store.supplier_pos[0].lines)[0].qty === "10", "forbidden edit did not write");
eq(store.audit_log.length === 1, "forbidden edit wrote no history");
var mattEdit = P.applyStore(store, "SPO-1", { edits: [{ lid: "a", fields: { qty: "11" } }] }, { email: "mattb@smackinsnacks.com", when: when });
eq(mattEdit.ok === true && mattEdit.changed === true, "matt can edit a saved line");
eq(JSON.parse(store.supplier_pos[0].lines)[0].qty === "11" && JSON.parse(store.supplier_pos[0].lines)[1].qty === "9", "matt edit touches only that line");
eq(mattEdit.history[0].action === "update" && mattEdit.history[0].user_email === "mattb@smackinsnacks.com", "matt edit writes history");
eq(JSON.stringify(store.supplier_pos[1]) === siblingJson, "matt edit leaves the other PO");

var beforeDelete = JSON.parse(JSON.stringify(store.supplier_pos[0]));
var del = P.applyStore(store, "SPO-1", { deletes: ["z"] }, { email: "mattb@smackinsnacks.com", when: when });
eq(del.ok === true, "delete ok");
eq(store.supplier_pos.length === 2, "delete does not remove the PO");
eq(JSON.stringify(store.supplier_pos[1]) === siblingJson, "delete leaves the other PO");
var remaining = JSON.parse(store.supplier_pos[0].lines);
eq(remaining.length === 2, "one line removed");
eq(remaining.map(function (l) { return l._lid; }).join(",") === "a,b", "only the zero line was removed");
eq(!remaining.some(function (l) { return l.item === "ZERO" || l._lid === "z"; }), "zero line is gone");
eq(remaining[1].qty === "9" && remaining[0].qty === "11", "earlier edits remain");
eq(del.history.length === 1 && del.history[0].action === "delete", "delete history action");
var dh = del.history[0];
eq(dh.table_name === "supplier_pos" && dh.row_pk === "SPO-1", "delete record");
eq(dh.user_email === "mattb@smackinsnacks.com" && dh.changed_at === when, "matt delete who and when");
eq(dh.new_row == null, "delete new row is empty");
eq(JSON.stringify(dh.old_row) === JSON.stringify(beforeDelete), "delete stores the full old row");
eq(dh.old_row.vendor === "Belmark" && dh.old_row.file_url && dh.old_row.notes.indexOf("ETA") >= 0, "old row keeps PO fields");
eq(dh.old_row.lines.indexOf("zero-row") >= 0 && dh.old_row.lines.indexOf("note_line") >= 0, "old row includes the deleted line");
eq(store.audit_log.length === 3 && store.audit_log[2].action === "delete", "delete wrote the trail");

var formRows = P.linesForForm(store.supplier_pos[0]);
eq(formRows.length === 2 && formRows[0]._lid === "a" && formRows[1]._lid === "b", "edit form lines");
var assembled = P.assemble(store.supplier_pos[0], [
  { lid: "a", item: "FILM-A", desc: "Film A", qty: "10", price: "1", unit: "cs", ship: "" },
  { lid: "", item: "NEW", desc: "Added", qty: "2", price: "6", unit: "cs", ship: "2026-12-02" }
], actor);
eq(assembled.ok && assembled.lines.length === 2, "assemble drops the removed form row and adds the new one");
eq(assembled.lines[0]._lid === "a" && assembled.lines[0].custom === "alpha", "assemble keeps the matched row");
eq(assembled.lines[1].item === "NEW" && assembled.lines[1].qty === "2", "assemble adds one new row");
eq(!assembled.lines.some(function (l) { return l._lid === "b"; }), "missing form row is a delete");
var noMatt = P.assemble(store.supplier_pos[0], [{ lid: "a", item: "HACK", desc: "Film A", qty: "10", price: "1", unit: "cs", ship: "" }], { email: "inventory@smackinsnacks.com", when: when });
eq(noMatt.ok === false && noMatt.reason === "forbidden", "other users cannot assemble a line change");

var oldLines = JSON.stringify([
  { item: "KEEP-OLD", desc: "Stay", qty: "4", price: "1", lot: "LOT-1" },
  { item: "DROP-OLD", desc: "Go", quantity: "0", price: "2", lot: "LOT-1", custom: "old-shape" }
]);
var oldPo = { id: "OLD", vendor: "Old Mill", po_num: "OLD-1", notes: "legacy", file_url: "https://example.test/old", lines: oldLines };
var oldForm = P.linesForForm(oldPo);
eq(oldForm.length === 2 && oldForm[1].item === "DROP-OLD" && oldForm[1]._lid === "row-1", "old lines get stable ids");
var oldStore = { supplier_pos: [JSON.parse(JSON.stringify(oldPo))], audit_log: [] };
var oldDel = P.applyStore(oldStore, "OLD", { deletes: [oldForm[1]._lid] }, actor);
eq(oldDel.ok === true, "old format delete");
var oldLeft = JSON.parse(oldStore.supplier_pos[0].lines);
eq(oldLeft.length === 1 && oldLeft[0].item === "KEEP-OLD" && oldLeft[0].lot === "LOT-1", "old delete keeps the sibling line");
eq(oldDel.history[0].action === "delete" && oldDel.history[0].old_row.lines.indexOf("old-shape") >= 0, "old delete history has the full row");
var dblPo = { id: "DBL", vendor: "Old Mill", lines: JSON.stringify(oldLines) };
var dblForm = P.linesForForm(dblPo);
var dbl = P.planSaved(dblPo, { deletes: [dblForm[0]._lid] }, actor);
eq(dbl.ok === true && dbl.lines.length === 1 && dbl.lines[0].item === "DROP-OLD", "double-encoded lines still delete one row");
var tokenBody = Buffer.from(JSON.stringify({ email: "Michelle.Nydegger@smackinsnacks.com" })).toString("base64url");
eq(P.canEdit(P.emailFromAuthBlob({ access_token: "hdr." + tokenBody + ".sig" })), "jwt email counts as Michelle");

var upd = db.slice(db.indexOf("async function updateSupplierPO"), db.indexOf("function poLinesRaw"));
eq(upd.indexOf('.from("supplier_pos").update(patch).eq("id", id)') >= 0, "db updates one row by id");
eq(upd.indexOf("The PO was not updated.") >= 0, "empty update is a visible failure");
eq(upd.indexOf(".insert(") < 0 && upd.indexOf('eq("lot"') < 0 && upd.indexOf(".eq(\"lot\"") < 0, "db update is not a lot match or insert");
var idxFn = src.slice(src.indexOf("function lineIndex"), src.indexOf("function setField"));
eq(idxFn.indexOf("_lid") >= 0 && idxFn.indexOf("lot") < 0, "line match is the line id");
eq(src.indexOf("Delete this line?") >= 0, "confirm before delete");
eq(src.indexOf("Show them") >= 0 && src.indexOf("lines with 0 qty were skipped") >= 0, "preview copy");
eq(app.indexOf("POLINES.previewHtml()") >= 0 && app.indexOf("POLINES.linesForSave()") >= 0, "upload preview is wired");
eq(app.indexOf("POLINES.savedEditorHtml(s)") >= 0 && app.indexOf("POLINES.assemble(") >= 0, "saved PO edit is wired");
eq(app.indexOf('data-po-act="delete"') >= 0, "edit form remove writes the line");
eq(src.indexOf('data-po-act="delete"') >= 0 && src.indexOf("addEventListener(\"click\", onDocClick, true)") >= 0, "clicks are delegated");
eq(html.indexOf("po-lines.js?b=2") >= 0 && html.indexOf("app.js?b=217") >= 0, "script bust");
eq(sw.indexOf("./po-lines.js") >= 0 && sw.indexOf('const CACHE = "smackin-inv-v310"') >= 0, "cache");
eq(app.indexOf("ROLE_TABS_API") >= 0 && src.indexOf("visibleFor") < 0, "tabs stay open");
eq(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em dash");

if (fail.length) {
  fail.forEach(function (msg) { console.error("FAIL", msg); });
  process.exit(1);
}
console.log("ok po lines " + (4 + 2));

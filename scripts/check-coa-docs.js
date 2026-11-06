#!/usr/bin/env node
/* COA PDF/photo store. No network. Does not change Yes/No/N/A hold rules. */
"use strict";

var fs = require("fs");
var path = require("path");
var cd = require("../coa-docs.js");

var failed = 0;
function assert(cond, msg) {
  if (cond) return;
  failed++;
  console.error("FAIL:", msg);
}
function read(rel) { return fs.readFileSync(path.join(__dirname, "..", rel), "utf8"); }

assert(cd.fileOk({ name: "Bacon-Mac-11654.pdf", type: "application/pdf", size: 1000 }), "pdf");
assert(cd.fileOk({ name: "photo.PNG", type: "image/png", size: 10 }), "png");
assert(cd.fileOk({ name: "scan.jpg", type: "", size: 10 }), "jpg with a blank type");
assert(cd.fileOk({ name: "scan.jpeg", type: "image/jpeg", size: 10 }), "jpeg");
assert(!cd.fileOk({ name: "notes.docx", type: "", size: 10 }), "docx stays out");
assert(!cd.fileOk({ name: "sheet.xlsx", type: "", size: 10 }), "xlsx stays out");
assert(!cd.fileOk({ name: "coa.pdf", type: "application/pdf", size: cd.MAX_BYTES + 1 }), "over 25 MB");
assert(cd.fileTooBig({ size: cd.MAX_BYTES + 1 }) && !cd.fileTooBig({ size: 10 }), "size check");

assert(cd.storagePath("Bacon Mac 11654.pdf", 42) === "coa_42_Bacon_Mac_11654.pdf", "coa_ prefix");
assert(cd.storagePath("svc_invoice.pdf", 1).indexOf("coa_") === 0, "prefix wins");
assert(cd.BUCKET === "supplier-pos", "reuse supplier-pos");

assert(cd.answerAfterFile("") === "yes", "blank answer becomes Yes");
assert(cd.answerAfterFile("Yes") === "yes", "Yes stays Yes");
assert(cd.answerAfterFile("no") === "no", "No stays No");
assert(cd.answerAfterFile("N/A") === "na", "N/A stays N/A");

assert(cd.normLot("11654") === "11654" && cd.normLot("lot 11-654") === "LOT11654", "lot key");

var rows = [
  { id: "a", lot: "11654", item_id: "SEAS-1", receiving_log_id: "r1", file_name: "bacon.pdf", file_url: "https://example/bacon.pdf" },
  { id: "b", lot: "11917", item_id: "", receiving_log_id: "", file_name: "beer.png", file_url: "https://example/beer.png" }
];
assert(cd.docsFor(rows, { lot: "11-654" }).length === 1, "lot match ignores punctuation");
assert(cd.docsFor(rows, { recvId: "r1", lot: "other" })[0].id === "a", "receipt id match");
assert(cd.docsFor(rows, { lot: "11917", itemId: "OTHER" })[0].id === "b", "email upload with a blank item still shows");
var preview = cd.releasePreview(rows, { lot: "11654" });
assert(!preview.missing && preview.names[0] === "bacon.pdf", "release lists the file");
assert(cd.releasePreview(rows, { lot: "missing" }).missing, "missing file warns");
assert(cd.releaseMessage(cd.releasePreview(rows, { lot: "nope" }), "Release?").indexOf("No COA file") === 0, "warn text");
assert(cd.releaseMessage(preview, "Release?").indexOf("bacon.pdf") >= 0, "show text");

assert(!cd.receiveSaved({ qty: "" }, { onReceive: true, qty: "", coaCleared: true }), "empty receive is not a save");
assert(!cd.receiveSaved({ qty: "10" }, { onReceive: true, qty: "10", coaCleared: false }), "failed receive keeps the file");
assert(cd.receiveSaved({ qty: "10" }, { onReceive: false, qty: "", coaCleared: true }), "opened log means the receipt saved");
assert(cd.receiveSaved({ qty: "10" }, { onReceive: true, qty: "", coaCleared: true }), "cleared receive form means saved");
assert(!cd.logSaved({ supplier: "" }, { onLog: true, supplier: "", coaCleared: true }), "log without a supplier is not saved");
assert(!cd.logSaved({ supplier: "Savor" }, { onLog: true, supplier: "Savor", coaCleared: false }), "failed log keeps the file");
assert(cd.logSaved({ supplier: "Savor" }, { onLog: true, supplier: "", coaCleared: true }), "cleared log form means saved");

assert(cd.missingTable({ message: "Could not find the table public.coa_docs in the schema cache" }), "missing table");
assert(cd.missingTable({ code: "PGRST205" }), "postgrest missing table");
assert(!cd.missingTable({ message: "Failed to fetch" }), "network is not a missing table");

var logs = [
  { id: "old", lot: "11654", recv_date: "2026-11-01", supplier: "Old", contents: "Old", item_id: "SEAS-OLD", created_at: "2026-11-01" },
  { id: "new", lot: "11654", recv_date: "2026-11-03", supplier: "Savor", contents: "Bacon Mac", item_id: "SEAS-1", created_at: "2026-11-03" }
];
assert(!cd.matchCandidate({ lot: "11654" }, logs), "a lot on two items is not auto-matched");
var hit = cd.matchCandidate({ lot: "11654", item_id: "SEAS-1" }, logs);
assert(hit && hit.id === "new", "item pins the newest receipt for that item");
assert(cd.matchCandidate({ lot: "11654", item_id: "SEAS-OLD" }, logs).id === "old", "the other item keeps its own receipt");
assert(!cd.matchCandidate({ lot: "11654", item_id: "OTHER" }, logs), "a different item does not take either receipt");
assert(cd.matchCandidate({ lot: "11654" }, [logs[1]]).id === "new", "one item still matches the newest receipt");
var patch = cd.linkPatch({ lot: "11654", vendor: "", item_id: "", item_name: "" }, hit, "Brittney", "2026-11-04T00:00:00.000Z");
assert(patch.receiving_log_id === "new" && patch.vendor === "Savor" && patch.item_name === "Bacon Mac", "match fills vendor and item");
assert(patch.matched_by === "Brittney", "match records who");
assert(!cd.matchCandidate({ lot: "" }, logs), "no lot does not match a receipt");

var sharedDocs = [
  { id: "dill", lot: "J1926", item_id: "SEAS-DILL", receiving_log_id: "dill-1", file_name: "dill.pdf", file_url: "https://example/dill.pdf" },
  { id: "pep", lot: "J1926", item_id: "SEAS-PEPPER", receiving_log_id: "pep-1", file_name: "pepper.pdf", file_url: "https://example/pepper.pdf" }
];
assert(cd.docsFor(sharedDocs, { lot: "J1926", itemId: "SEAS-PEPPER", recvId: "pep-1" }).map(function (d) { return d.id; }).join(",") === "pep", "pepper does not list the dill file");
assert(cd.docsFor(sharedDocs, { lot: "J1926", itemId: "SEAS-DILL" }).map(function (d) { return d.id; }).join(",") === "dill", "dill lists only its file");
var pepperItem = { id: "SEAS-PEPPER", code: "SEAS-PEPPER" };
assert(!cd.docVisibleForItem(sharedDocs[0], pepperItem, ["J1926"]), "floor card hides the other item COA");
assert(cd.docVisibleForItem(sharedDocs[1], pepperItem, ["J1926"]), "floor card keeps this item COA");
var recvRows = [
  { id: "dill-1", item_id: "SEAS-DILL", lot: "J1926", supplier: "Seasoning Co", created_at: "2026-11-04T15:00:00.000Z" },
  { id: "pep-1", item_id: "SEAS-PEPPER", lot: "J1926", supplier: "Seasoning Co", created_at: "2026-11-04T16:00:00.000Z" }
];
assert(cd.pickRecvRow(recvRows, { lot: "J1926", itemId: "SEAS-DILL" }).id === "dill-1", "attach finds the dill receipt");
assert(!cd.pickRecvRow(recvRows, { lot: "J1926", vendor: "Seasoning Co" }), "shared lot without an item is not guessed");
var holds = [
  { id: "dill-1", item_id: "SEAS-DILL", lot: "J1926", coa_received: "no" },
  { id: "pep-1", item_id: "SEAS-PEPPER", lot: "J1926", coa_received: "yes" }
];
assert(cd.openCoaHold(holds, { lot: "J1926", itemId: "SEAS-PEPPER", recvId: "pep-1" }) === false, "pepper is not held because dill is");
assert(cd.openCoaHold(holds, { lot: "J1926", itemId: "SEAS-DILL", recvId: "dill-1" }) === true, "dill hold stays on dill");

var src = read("coa-docs.js");
var raw = read("raw-coa.js");
var sw = read("service-worker.js");
var html = read("index.html");
var sql = read("coa_docs_table.sql");
var homes = read("dept-homes.js");
assert(src.indexOf("\u2014") < 0 && src.indexOf("\u2013") < 0, "no em dash");
assert(src.indexOf('from(BUCKET)') >= 0 || src.indexOf('from(BUCKET)') >= 0, "uploads through storage");
assert(src.indexOf('c.storage.from(BUCKET)') >= 0, "bucket upload");
assert(src.indexOf("setRawCoa") < 0, "does not write the COA answer column itself");
assert(src.indexOf('accept=".pdf,.png,.jpg,.jpeg"') >= 0, "accept list");
assert(src.indexOf("slots[slot] = null") >= 0 && src.indexOf("if (!receiveSaved(meta.before, after)) return;") >= 0, "file stays until the receipt is confirmed");
assert(raw.indexOf('type="file"') < 0, "answer module still has no file input");
assert(raw.indexOf("shouldHold") >= 0, "hold rule stays");
assert(sw.indexOf('const CACHE = "smackin-inv-v290"') >= 0 && sw.indexOf("./coa-docs.js") >= 0, "cache and asset");
assert(html.indexOf("coa-docs.js?b=2") >= 0, "script tag");
assert(html.indexOf('var EMBEDDED = "smackin-inv-v290"') >= 0, "embedded build");
assert(read("build-id.txt").trim() === "smackin-inv-v290", "build id");
assert(sql.indexOf("create table if not exists public.coa_docs") >= 0, "troy sql");
assert(sql.indexOf("supplier-pos") >= 0 && sql.indexOf("coa_") >= 0, "sql names the bucket and prefix");
assert(homes.indexOf('fn: "coa"') >= 0 && homes.indexOf('"coalib"') >= 0, "quality tab");
assert(homes.indexOf("COA_DOCS.open") >= 0, "quality tab opens the library");
assert(read("app.js").indexOf("coa_docs") < 0, "app.js is untouched");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("coa-docs ok");

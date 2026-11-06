#!/usr/bin/env node
/* prod-tracking-sync reads Detail only and inserts missing P-Mac keys. No network. */
"use strict";

var fs = require("fs");
var path = require("path");
var zlib = require("zlib");
var cp = require("child_process");

var root = path.resolve(__dirname, "..");
var fail = [];
function eq(cond, msg) { if (!cond) fail.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

function excelSerial(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1970, 0, 1)) / 86400000) + 25569;
}

function zipStore(files) {
  var locals = [];
  var cds = [];
  var offset = 0;
  files.forEach(function (f) {
    var name = Buffer.from(f.name, "utf8");
    var raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data), "utf8");
    var comp = zlib.deflateRawSync(raw);
    var crc = zlib.crc32(raw) >>> 0;
    var local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    var chunk = Buffer.concat([local, name, comp]);
    locals.push(chunk);
    var cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    cds.push(Buffer.concat([cd, name]));
    offset += chunk.length;
  });
  var localBuf = Buffer.concat(locals);
  var cdBuf = Buffer.concat(cds);
  var eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  return Buffer.concat([localBuf, cdBuf, eocd]);
}

function workbookFiles(serial) {
  var shared = [
    "Date", "Machine", "Operator", "Active/ Inactive", "Dept.", "Shift", "Bag Size", "Flavor", "Box Count", "Total Pkgs.",
    "Alfredo R.", "Active", "P-Mac", "1st", "4.0 oz", "S02 - CinChur", "1.5 oz", "Should Not Import", "M1 - MixMe"
  ];
  var sst = '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + shared.length + '" uniqueCount="' + shared.length + '">' +
    shared.map(function (s) { return "<si><t>" + s + "</t></si>"; }).join("") + "</sst>";
  var styles = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="mm/dd/yyyy"/></numFmts>' +
    '<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>';
  var book = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Mixing Detail" sheetId="1" r:id="rId1"/><sheet name="Detail" sheetId="2" r:id="rId2"/></sheets></workbook>';
  var rels = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
    '</Relationships>';
  function cell(ref, inner) { return '<c r="' + ref + '"' + inner + "</c>"; }
  function ss(ref, i) { return cell(ref, ' t="s"><v>' + i + "</v>"); }
  var detail = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    "<row r=\"1\">" + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i, n) {
      return ss(String.fromCharCode(65 + n) + "1", i);
    }).join("") + "</row>" +
    "<row r=\"2\">" +
      cell("A2", ' s="1"><v>' + (serial + 0.42) + "</v>") +
      cell("B2", "><v>42</v>") +
      ss("C2", 10) + ss("D2", 11) + ss("E2", 12) + ss("F2", 13) + ss("G2", 14) + ss("H2", 15) +
      cell("I2", "><v>7</v>") + cell("J2", "><v>700</v>") +
    "</row>" +
    "<row r=\"3\">" +
      cell("A3", ' s="2"><v>' + serial + "</v>") +
      cell("B3", "><v>42</v>") +
      ss("C3", 10) + ss("D3", 11) + ss("E3", 12) + ss("F3", 13) + ss("G3", 14) + ss("H3", 15) +
      cell("I3", "><v>7</v>") + cell("J3", "><v>700</v>") +
    "</row>" +
    "<row r=\"4\">" +
      cell("A4", ' t="inlineStr"><is><t>10/5/2026</t></is>') +
      cell("B4", "><v>7</v>") +
      ss("C4", 10) + ss("D4", 11) + ss("E4", 12) + ss("F4", 13) + ss("G4", 16) + ss("H4", 15) +
      cell("I4", "><v>2</v>") + cell("J4", "><v>250</v>") +
    "</row>" +
    "<row r=\"5\"></row>" +
    "<row r=\"6\">" + ss("C6", 10) + ss("H6", 15) + "</row>" +
    "</sheetData></worksheet>";
  var mixing = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    "<row r=\"1\">" + ss("A1", 0) + ss("B1", 2) + ss("C1", 7) + cell("D1", ' t="inlineStr"><is><t>Mach #</t></is>') + cell("E1", ' t="inlineStr"><is><t>Total Bins</t></is>') + "</row>" +
    "<row r=\"2\">" + cell("A2", ' s="1"><v>' + serial + "</v>") + ss("B2", 17) + ss("C2", 18) + cell("D2", ' t="inlineStr"><is><t>M4</t></is>') + cell("E2", "><v>12</v>") + "</row>" +
    "</sheetData></worksheet>";
  return [
    { name: "xl/workbook.xml", data: book },
    { name: "xl/_rels/workbook.xml.rels", data: rels },
    { name: "xl/sharedStrings.xml", data: sst },
    { name: "xl/styles.xml", data: styles },
    { name: "xl/worksheets/sheet1.xml", data: mixing },
    { name: "xl/worksheets/sheet2.xml", data: detail },
    { name: "xl/vbaProject.bin", data: Buffer.from("not-xml") }
  ];
}

function assertParsed(mod, parsed, label) {
  eq(parsed.sheet === "Detail", label + " sheet is Detail");
  eq(parsed.rows.length === 3, label + " parsed 3 detail rows, got " + parsed.rows.length);
  var row = parsed.rows[0];
  eq(row.run_date === "2026-09-10", label + " serial date " + row.run_date);
  eq(row.machine === "42", label + " machine");
  eq(row.operator === "Alfredo R.", label + " operator");
  eq(row.status === "Active", label + " status");
  eq(row.dept === "P-Mac", label + " dept");
  eq(row.shift === "1st", label + " shift");
  eq(row.bag_size === "4.0 oz", label + " bag " + row.bag_size);
  eq(row.flavor_code === "S02", label + " code " + row.flavor_code);
  eq(row.flavor_name === "CinChur", label + " name " + row.flavor_name);
  eq(row.box_count === 7, label + " boxes");
  eq(row.total_pkgs === 700, label + " pkgs");
  eq(mod.pmacKey(row) === "2026-09-10|alfredor|S02|42|700|7", label + " dedupe key " + mod.pmacKey(row));
  eq(parsed.rows[1].run_date === "2026-09-10", label + " second date style");
  eq(parsed.rows[2].run_date === "2026-10-05", label + " string date " + parsed.rows[2].run_date);
  eq(parsed.rows[2].bag_size === "1.5 oz", label + " 1.5 oz bag");
  eq(parsed.rows[2].machine === "7", label + " machine 7");
  eq(parsed.rows.every(function (r) { return r.operator !== "Should Not Import" && r.flavor_name !== "MixMe"; }), label + " mixing row excluded");
}

async function main() {
  var mod = await import(path.join(root, "supabase/functions/prod-tracking-sync/parse.js"));
  var serial = excelSerial(2026, 9, 10);
  var files = workbookFiles(serial);
  var parsed = await mod.parseDetailSheet(zipStore(files));
  assertParsed(mod, parsed, "deflate");

  var dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "pmac-"));
  files.forEach(function (f) {
    var dest = path.join(dir, f.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.data);
  });
  var pyZip = path.join(dir, "book.xlsm");
  cp.execFileSync("python3", ["-c", [
    "import zipfile,sys",
    "root, dest = sys.argv[1], sys.argv[2]",
    "z = zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED)",
    "import os",
    "for base, dirs, names in os.walk(root):",
    "  for name in names:",
    "    full = os.path.join(base, name)",
    "    if full == dest: continue",
    "    z.write(full, os.path.relpath(full, root).replace(os.sep, '/'))",
    "z.close()"
  ].join("\n"), dir, pyZip]);
  var parsedPy = await mod.parseDetailSheet(fs.readFileSync(pyZip));
  assertParsed(mod, parsedPy, "python zip");

  var plan = mod.planInserts([
    { id: 10, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: "700.0", box_count: "7.00" },
    { id: 4, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: 700, box_count: 7 }
  ], parsed.rows);
  eq(plan.fresh.length === 1 && plan.fresh[0].bag_size === "1.5 oz", "only the new bag size is inserted");
  eq(plan.already === 2, "both sheet lines of an existing key are already on record");
  eq(plan.deleteIds.length === 0, "two sheet lines keep two database rows, got " + plan.deleteIds.join(","));
  eq(plan.repeated === 0, "a second sheet line is not reported as skipped");

  var short = mod.planInserts([
    { id: 4, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: 700, box_count: 7 }
  ], parsed.rows);
  eq(short.fresh.length === 2 && short.fresh[0].total_pkgs === 700 && short.fresh[1].bag_size === "1.5 oz", "the second copy of a stored key is inserted");
  eq(short.already === 1 && short.deleteIds.length === 0, "the stored copy covers the first sheet line");

  var crowded = mod.planInserts([
    { id: 4, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: 700, box_count: 7 },
    { id: 10, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: 700, box_count: 7 },
    { id: 11, run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "S02", machine: "42", total_pkgs: 700, box_count: 7 }
  ], parsed.rows);
  eq(crowded.fresh.length === 1 && crowded.fresh[0].bag_size === "1.5 oz", "extra database copies do not hide a new bag");
  eq(crowded.deleteIds.join(",") === "11", "only the copy beyond the sheet count is removed, got " + crowded.deleteIds.join(","));

  var orphan = mod.planInserts([
    { id: 1, run_date: "2020-01-01", operator: "Zed", flavor_code: "S01", machine: "1", total_pkgs: 1, box_count: 1 },
    { id: 2, run_date: "2020-01-01", operator: "Zed", flavor_code: "S01", machine: "1", total_pkgs: 1, box_count: 1 }
  ], parsed.rows);
  eq(orphan.deleteIds.join(",") === "2", "a key missing from Detail still keeps the oldest row, got " + orphan.deleteIds.join(","));

  var first = { run_date: "2026-02-09", operator: "Leonel M.", flavor_code: "S05", machine: "2", total_pkgs: 3750, box_count: 15, shift: "1st", bag_size: "1.5 oz" };
  var second = { run_date: "2026-02-09", operator: "Leonel M.", flavor_code: "S05", machine: "2", total_pkgs: 3750, box_count: 15, shift: "2nd", bag_size: "1.5 oz" };
  var leonel = mod.planInserts([Object.assign({ id: 3225 }, first)], [first, second]);
  eq(leonel.fresh.length === 1 && leonel.fresh[0].shift === "2nd", "a second shift with the same packages is inserted");
  eq(leonel.deleteIds.length === 0, "the 1st shift row stays");
  var leonelAgain = mod.planInserts([
    Object.assign({ id: 3225 }, first),
    Object.assign({ id: 9000 }, second)
  ], [first, second]);
  eq(leonelAgain.fresh.length === 0 && leonelAgain.deleteIds.length === 0, "both shifts stay on the next refresh");

  var alex = { run_date: "2025-10-20", operator: "Alex H", flavor_code: "S02", machine: "42", total_pkgs: 3000, box_count: 30, shift: "2nd", bag_size: "4.0 oz" };
  var alexPlan = mod.planInserts([Object.assign({ id: 2454 }, alex)], [alex, Object.assign({}, alex)]);
  eq(alexPlan.fresh.length === 1 && alexPlan.fresh[0].operator === "Alex H", "an identical second Detail line is inserted");
  var alexAgain = mod.planInserts([
    Object.assign({ id: 2454 }, alex),
    Object.assign({ id: 8000 }, alex)
  ], [alex, Object.assign({}, alex)]);
  eq(alexAgain.fresh.length === 0 && alexAgain.deleteIds.length === 0, "an identical pair is not collapsed later");
  eq(mod.pmacKey({ run_date: "2026-09-10", operator: "Alfredo R.", flavor_code: "L37", machine: "41", total_pkgs: 2000, box_count: 20 }) === "2026-09-10|alfredor|L37|41|2000|20", "sample row key");

  var noDetail = files.filter(function (f) { return f.name !== "xl/worksheets/sheet2.xml"; }).map(function (f) {
    if (f.name !== "xl/workbook.xml") return f;
    return { name: f.name, data: String(f.data).replace(/<sheet name="Detail"[^/]*\/>/, "") };
  });
  var threw = "";
  try { await mod.parseDetailSheet(zipStore(noDetail)); } catch (e) { threw = e.message || ""; }
  eq(threw.indexOf("Detail sheet was not found") >= 0 && threw.indexOf("Mixing Detail is not imported") >= 0, "missing Detail is explicit");

  eq(mod.SOURCE.sharePointPath === "/sites/Production/Shared Documents/Production Files/1736 - Production Tracking_v12.xlsm", "sharepoint path");
  eq(mod.SOURCE.sheet === "Detail" && mod.SOURCE.mixing === "deferred", "detail only");
  eq(mod.SOURCE.sourcedoc === "1AA0318A-B5BA-499E-97E3-0F3D300DF8AE", "sourcedoc");
  eq(mod.SOURCE.storageBucket === "production-tracking" && mod.SOURCE.storageObject === "1736-Production-Tracking_v12.xlsm", "storage path");
  eq(mod.shouldPersistWorkbook("upload") === true && mod.shouldPersistWorkbook("graph") === true, "persist upload and graph");
  eq(mod.shouldPersistWorkbook("storage") === false && mod.shouldPersistWorkbook("cron") === false && mod.shouldPersistWorkbook("") === false, "storage read is not written back");
  var miss = mod.notConnectedMessage("production-tracking/1736-Production-Tracking_v12.xlsm");
  eq(miss.indexOf("missing_secrets") >= 0 && miss.indexOf("missing_file") >= 0, "missing message");
  eq(miss.indexOf("MS_TENANT_ID") >= 0 && miss.indexOf("MS_CLIENT_ID") >= 0 && miss.indexOf("MS_CLIENT_SECRET") >= 0, "secret names");

  var fn = read("supabase/functions/prod-tracking-sync/index.js");
  var parseSrc = read("supabase/functions/prod-tracking-sync/parse.js");
  eq(fn.indexOf("pmac:last_sync") >= 0 && fn.indexOf("pmac:source") >= 0 && fn.indexOf("pmac:lock") >= 0, "kv keys");
  eq(fn.indexOf("mixing_history") < 0 && parseSrc.indexOf("mixing_history") < 0, "does not write mixing");
  eq(fn.indexOf('Deno.env.get("SPS_FOLDER")') < 0, "does not touch SPS_FOLDER");
  eq(read("supabase/functions/sps-sync/index.js").indexOf('Deno.env.get("SPS_FOLDER") || "testout"') >= 0, "SPS_FOLDER untouched");
  eq(read("supabase/config.toml").indexOf("[functions.prod-tracking-sync]") >= 0 && read("supabase/config.toml").indexOf("verify_jwt = false") >= 0, "verify_jwt false");
  eq(fn.indexOf("/sites/Production/Shared Documents/Production Files/1736 - Production Tracking_v12.xlsm") >= 0, "comment path");
  eq(fn.indexOf("Mixing Detail is in the same workbook and is NOT imported") >= 0, "mixing deferred comment");
  eq(fn.indexOf("MS_TENANT_ID") >= 0 && fn.indexOf("MS_CLIENT_SECRET") >= 0, "secrets documented");
  var storeAt = fn.indexOf("async function storeWorkbook");
  var storeFn = fn.slice(storeAt, fn.indexOf("async function loadExisting"));
  var keyFn = fn.slice(fn.indexOf("function serviceKey"), fn.indexOf("async function storageBytes"));
  eq(storeAt > 0 && storeFn.indexOf("serviceKey()") >= 0 && keyFn.indexOf("SUPABASE_SERVICE_ROLE_KEY") >= 0, "store uses service role");
  eq(storeFn.indexOf('"x-upsert": "true"') >= 0, "store upserts the existing object");
  eq(storeFn.indexOf("SUPABASE_ANON_KEY") < 0 && storeFn.indexOf("PUBLISHABLE") < 0, "store does not use the public key");
  eq(storeFn.indexOf("application/vnd.ms-excel.sheet.macroenabled.12") >= 0, "workbook content type");
  eq(fn.indexOf("shouldPersistWorkbook(pack.source)") >= 0 && fn.indexOf("Saved the workbook to Storage.") >= 0, "successful fresh sync saves storage");
  eq(fn.indexOf("create policy") < 0 && fn.indexOf("storage.objects") < 0, "does not open the bucket");

  var upload = read("mfg-upload.js");
  eq(upload.indexOf("/functions/v1/prod-tracking-sync") >= 0, "sync url");
  eq(upload.indexOf("Sync now") >= 0 && upload.indexOf("1736 - Production Tracking_v12") >= 0, "upload link");
  eq(upload.indexOf("pmac:last_sync") >= 0, "reads last sync");
  eq(read("mfg-history.js").indexOf("MFGUPLOAD.mountLink") >= 0, "history link");
  eq(read("index.html").indexOf("mfg-upload.js?b=4") >= 0, "upload cache bust");
  eq(read("mfg-upload.js").indexOf('existing[k] = (existing[k] || 0) + 1') >= 0, "upload counts P-Mac lines");
  eq(read("index.html").indexOf("mfg-history.js?b=6") >= 0, "history cache bust");
  eq(read("service-worker.js").indexOf('const CACHE = "smackin-inv-v291"') >= 0, "cache bump");

  var ui = upload.slice(upload.indexOf("Live link to Allen"));
  eq(ui.indexOf("\u2014") < 0 && ui.indexOf("\u2013") < 0, "upload copy has no em dash");
  eq(fn.indexOf("\u2014") < 0, "function copy has no em dash");
  var parseLines = parseSrc.split("\n").filter(function (line) { return line.indexOf("[-") < 0; });
  eq(parseLines.join("\n").indexOf("\u2014") < 0 && parseLines.join("\n").indexOf("\u2013") < 0, "parser copy has no em dash");

  if (fail.length) {
    console.error(fail.join("\n"));
    process.exit(1);
  }
  console.log("prod-tracking-sync ok");
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});

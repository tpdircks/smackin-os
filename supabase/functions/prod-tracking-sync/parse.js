// Detail-sheet parser for Allen Back's production tracker.
// Same P-Mac fields and dedupe key as mfg-upload.js.
// Mixing Detail is ignored here. The workbook stays the linked source for later.

export var SOURCE = {
  name: "1736 - Production Tracking_v12",
  file: "1736 - Production Tracking_v12.xlsm",
  site: "Production",
  siteHost: "netorgft5175778.sharepoint.com",
  sitePath: "/sites/Production",
  sharePointPath: "/sites/Production/Shared Documents/Production Files/1736 - Production Tracking_v12.xlsm",
  drivePath: "Production Files/1736 - Production Tracking_v12.xlsm",
  webUrl: "https://netorgft5175778.sharepoint.com/:x:/r/sites/Production/_layouts/15/Doc.aspx?sourcedoc=%7B1AA0318A-B5BA-499E-97E3-0F3D300DF8AE%7D&file=1736%20-%20Production%20Tracking_v12.xlsm&fromShare=true&action=default&mobileredirect=true",
  sourcedoc: "1AA0318A-B5BA-499E-97E3-0F3D300DF8AE",
  sheet: "Detail",
  mixing: "deferred",
  storageBucket: "production-tracking",
  storageObject: "1736-Production-Tracking_v12.xlsm"
};

var DATE_NUM_FMT = {
  14: 1, 15: 1, 16: 1, 17: 1, 22: 1,
  27: 1, 28: 1, 29: 1, 30: 1, 31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1,
  45: 1, 46: 1, 47: 1,
  50: 1, 51: 1, 52: 1, 53: 1, 54: 1, 55: 1, 56: 1, 57: 1, 58: 1
};

export function notConnectedMessage(storageLabel) {
  return "Microsoft Graph is not connected yet (missing_secrets). Set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET on the prod-tracking-sync function. No workbook was found in Storage at " +
    storageLabel + " (missing_file).";
}

export function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pad(n) { return (n < 10 ? "0" : "") + n; }

function dstr(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v)) {
    return v.getFullYear() + "-" + pad(v.getMonth() + 1) + "-" + pad(v.getDate());
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    var y = +m[3];
    if (y < 100) y += 2000;
    return y + "-" + pad(+m[1]) + "-" + pad(+m[2]);
  }
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})/);
  if (m) {
    var mo = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }[m[2].slice(0, 3).toLowerCase()];
    var yy = +m[3];
    if (yy < 100) yy += 2000;
    if (mo) return yy + "-" + pad(mo) + "-" + pad(+m[1]);
  }
  return "";
}

function splitFlav(s) {
  s = String(s || "").trim();
  var m = s.match(/^\s*([A-Za-z]?\d{1,2}[A-Za-z]?)\s*[-–]?\s*(.*)$/);
  if (m) return { code: m[1].trim(), name: (m[2] || "").replace(/\*/g, "").trim() };
  return { code: "", name: s.replace(/\*/g, "").trim() };
}

function num(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  var n = parseFloat(String(v).replace(/[, ]/g, ""));
  return isNaN(n) ? null : n;
}

function numKey(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return isFinite(v) ? String(v) : "";
  var s = String(v).trim();
  if (!s) return "";
  var n = parseFloat(s.replace(/,/g, ""));
  if (!isFinite(n)) return s;
  return String(n);
}

// Same parts as mfg-upload.js keyOf("pmac"). Numeric columns compare as JS
// numbers so a spreadsheet 700 and a numeric column "700.0" are one key.
export function pmacKey(r) {
  return [
    String(r.run_date || "").slice(0, 10),
    norm(r.operator),
    r.flavor_code == null ? "" : String(r.flavor_code),
    r.machine == null ? "" : String(r.machine),
    numKey(r.total_pkgs),
    numKey(r.box_count)
  ].join("|");
}

export function planInserts(existing, rows) {
  var have = {};
  var idsByKey = {};
  (existing || []).forEach(function (row) {
    var k = pmacKey(row);
    have[k] = 1;
    if (row.id != null && /^[0-9]+$/.test(String(row.id))) {
      if (!idsByKey[k]) idsByKey[k] = [];
      idsByKey[k].push(String(row.id));
    }
  });
  var deleteIds = [];
  Object.keys(idsByKey).forEach(function (k) {
    var ids = idsByKey[k].slice().sort(function (a, b) { return Number(a) - Number(b); });
    for (var i = 1; i < ids.length; i++) deleteIds.push(ids[i]);
  });
  var fresh = [];
  var fileSeen = {};
  var already = 0;
  var repeated = 0;
  (rows || []).forEach(function (row) {
    var k = pmacKey(row);
    if (have[k]) { already++; return; }
    if (fileSeen[k]) { repeated++; return; }
    fileSeen[k] = 1;
    fresh.push(row);
  });
  return { fresh: fresh, deleteIds: deleteIds, already: already, repeated: repeated };
}

function decodeXml(s) {
  return String(s || "")
    .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(parseInt(d, 10)); })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attrs(tag) {
  var o = {};
  var re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  var m;
  while ((m = re.exec(tag))) o[m[1]] = decodeXml(m[2]);
  return o;
}

function siText(inner) {
  var cleaned = String(inner || "")
    .replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")
    .replace(/<phoneticPr\b[^>]*\/>/g, "");
  var parts = [];
  var re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  var m;
  while ((m = re.exec(cleaned))) parts.push(decodeXml(m[1]));
  return parts.join("");
}

function sharedStrings(xml) {
  var out = [];
  if (!xml) return out;
  var re = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  var m;
  while ((m = re.exec(xml))) out.push(m[1] ? siText(m[1]) : "");
  return out;
}

function isDateFormatCode(code) {
  var s = String(code || "").toLowerCase();
  s = s.replace(/\[[^\]]*\]/g, "").replace(/"[^"]*"/g, "");
  if (!s) return false;
  if (s.indexOf("am/pm") >= 0 || s.indexOf("a/p") >= 0) return true;
  return s.indexOf("y") >= 0 || s.indexOf("d") >= 0;
}

function dateStyleFlags(xml) {
  var flags = [];
  if (!xml) return flags;
  var custom = {};
  var nf = /<numFmts\b[^>]*>([\s\S]*?)<\/numFmts>/.exec(xml);
  if (nf) {
    var nre = /<numFmt\b[^>]*\/?>/g;
    var nm;
    while ((nm = nre.exec(nf[1]))) {
      var na = attrs(nm[0]);
      if (na.numFmtId) custom[String(na.numFmtId)] = na.formatCode || "";
    }
  }
  var xfBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!xfBlock) return flags;
  var xre = /<xf\b[^>]*\/?>/g;
  var xm;
  while ((xm = xre.exec(xfBlock[1]))) {
    var a = attrs(xm[0]);
    var id = String(parseInt(a.numFmtId || "0", 10));
    flags.push(!!DATE_NUM_FMT[id] || isDateFormatCode(custom[id]));
  }
  return flags;
}

function excelToYmd(serial) {
  var whole = Math.floor(Number(serial));
  if (!isFinite(whole)) return "";
  var utc = Date.UTC(1970, 0, 1) + (whole - 25569) * 86400000;
  var d = new Date(utc);
  if (isNaN(d.getTime())) return "";
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
}

function colIndex(ref) {
  var m = /^([A-Z]+)/i.exec(String(ref || ""));
  if (!m) return -1;
  var letters = m[1].toUpperCase();
  var n = 0;
  for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function cellValue(at, inner, shared, dateStyles) {
  var t = at.t || "n";
  if (t === "inlineStr") return siText(inner);
  var vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner || "");
  var raw = vMatch ? decodeXml(vMatch[1]).trim() : "";
  if (t === "s") {
    var i = parseInt(raw, 10);
    return shared[i] != null ? shared[i] : "";
  }
  if (t === "b") return raw === "1" ? "TRUE" : "FALSE";
  if (t === "str") return raw;
  if (t === "d") return raw;
  if (raw === "") return "";
  var n = Number(raw);
  if (!isFinite(n)) return raw;
  var styleIdx = at.s != null ? parseInt(at.s, 10) : -1;
  if (styleIdx >= 0 && dateStyles[styleIdx]) return excelToYmd(n);
  return n;
}

function sheetToRows(xml, shared, dateStyles) {
  var rows = [];
  var rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  var rm;
  while ((rm = rowRe.exec(xml))) {
    var cells = [];
    var col = 0;
    var cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    var cm;
    while ((cm = cellRe.exec(rm[1]))) {
      var at = attrs(cm[1]);
      var idx = at.r ? colIndex(at.r) : col;
      if (idx < 0) idx = col;
      cells[idx] = cellValue(at, cm[2] || "", shared, dateStyles);
      col = idx + 1;
    }
    rows.push(cells);
  }
  return rows;
}

function headerMap(rows) {
  for (var i = 0; i < Math.min(20, rows.length); i++) {
    var r = rows[i] || [];
    var idx = {};
    var hasDate = false;
    var hasFlav = false;
    for (var c = 0; c < r.length; c++) {
      var h = norm(r[c]);
      if (!h) continue;
      idx[h] = c;
      if (h === "date") hasDate = true;
      if (h.indexOf("flavor") >= 0) hasFlav = true;
    }
    if (hasDate && hasFlav) return { row: i, idx: idx };
  }
  return null;
}

function pick(idx, names) {
  for (var i = 0; i < names.length; i++) {
    var k = norm(names[i]);
    if (idx[k] != null) return idx[k];
  }
  return -1;
}

function textCell(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number" && isFinite(v)) return String(v);
  return String(v).trim();
}

function asRunDate(v) {
  if (typeof v === "number" && isFinite(v)) return excelToYmd(v);
  return dstr(v);
}

export function rowsFromDetail(rows) {
  var hm = headerMap(rows);
  if (!hm) return { error: "Detail sheet is missing the Date and Flavor headers." };
  var idx = hm.idx;
  var out = [];
  for (var i = hm.row + 1; i < rows.length; i++) {
    var r = rows[i] || [];
    if (!r.length) continue;
    var d = asRunDate(r[pick(idx, ["date"])]);
    if (!d || d.slice(0, 2) !== "20") continue;
    var fp = splitFlav(r[pick(idx, ["flavor"])]);
    out.push({
      run_date: d,
      machine: textCell(r[pick(idx, ["machine", "mach#", "mach"])]),
      operator: textCell(r[pick(idx, ["operator", "operators"])]),
      status: textCell(r[pick(idx, ["active/inactive", "activeinactive", "status", "active"])]),
      dept: textCell(r[pick(idx, ["dept", "dept."])]) || "P-Mac",
      shift: textCell(r[pick(idx, ["shift"])]),
      bag_size: textCell(r[pick(idx, ["bagsize", "bag size"])]),
      flavor_code: fp.code,
      flavor_name: fp.name,
      box_count: num(r[pick(idx, ["boxcount", "box count"])]),
      total_pkgs: num(r[pick(idx, ["totalpkgs", "total pkgs.", "totalpackages", "packages"])])
    });
  }
  return { rows: out, headerRow: hm.row };
}

function sheetIsDetail(name) {
  return String(name || "").trim().toLowerCase() === "detail";
}

function u16(b, o) { return b[o] | (b[o + 1] << 8); }
function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

function findEocd(u8) {
  var min = Math.max(0, u8.length - 22 - 65535);
  for (var i = u8.length - 22; i >= min; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) return i;
  }
  return -1;
}

async function inflateRaw(comp) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("This runtime cannot inflate the workbook.");
  }
  var input = new Uint8Array(comp);
  var stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  var buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function wantZipName(name) {
  var n = String(name || "").replace(/\\/g, "/").toLowerCase();
  if (n.endsWith("/")) return false;
  if (n.indexOf("xl/") !== 0) return false;
  return n.endsWith(".xml") || n.endsWith(".rels");
}

async function unzipXml(bytes) {
  var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  var eocd = findEocd(u8);
  if (eocd < 0) throw new Error("The file is not a zip workbook (.xlsx or .xlsm).");
  // EOCD: signature is 4 bytes, then disk fields. Total entries at +10, directory offset at +16.
  var count = u16(u8, eocd + 10);
  var cdOff = u32(u8, eocd + 16);
  if (count === 0xffff || cdOff === 0xffffffff) throw new Error("Workbook zip is ZIP64, which this sync does not read.");
  var out = {};
  var p = cdOff;
  for (var i = 0; i < count; i++) {
    if (u32(u8, p) !== 0x02014b50) throw new Error("Workbook zip directory is unreadable.");
    var method = u16(u8, p + 10);
    var compSize = u32(u8, p + 20);
    var nameLen = u16(u8, p + 28);
    var extraLen = u16(u8, p + 30);
    var commentLen = u16(u8, p + 32);
    var localOff = u32(u8, p + 42);
    var name = new TextDecoder("utf-8").decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    var key = name.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!wantZipName(key)) continue;
    if (u32(u8, localOff) !== 0x04034b50) throw new Error("Workbook zip entry is unreadable: " + key);
    var localName = u16(u8, localOff + 26);
    var localExtra = u16(u8, localOff + 28);
    var dataOff = localOff + 30 + localName + localExtra;
    var comp = u8.subarray(dataOff, dataOff + compSize);
    var raw;
    if (method === 0) raw = new Uint8Array(comp);
    else if (method === 8) raw = await inflateRaw(comp);
    else throw new Error("Workbook zip uses an unsupported compression method.");
    out[key] = new TextDecoder("utf-8").decode(raw);
  }
  return out;
}

function resolveTarget(target) {
  var t = String(target || "").replace(/\\/g, "/");
  if (!t) return "";
  if (t.charAt(0) === "/") return t.replace(/^\/+/, "");
  var parts = ("xl/" + t).split("/");
  var acc = [];
  parts.forEach(function (part) {
    if (!part || part === ".") return;
    if (part === "..") acc.pop();
    else acc.push(part);
  });
  return acc.join("/");
}

function findFile(files, name) {
  var want = String(name || "").replace(/\\/g, "/").toLowerCase();
  var keys = Object.keys(files);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === want) return files[keys[i]];
  }
  return "";
}

export async function parseDetailSheet(bytes) {
  if (!bytes || !bytes.byteLength) throw new Error("The workbook was empty.");
  var files = await unzipXml(bytes);
  var book = findFile(files, "xl/workbook.xml");
  if (!book) throw new Error("The workbook has no workbook.xml. It may be encrypted or not an .xlsm file.");
  var rels = findFile(files, "xl/_rels/workbook.xml.rels");
  var relMap = {};
  var relRe = /<Relationship\b[^>]*\/?>/g;
  var rm;
  while ((rm = relRe.exec(rels || ""))) {
    var ra = attrs(rm[0]);
    if (ra.Id && ra.Target) relMap[ra.Id] = ra.Target;
  }
  var detailTarget = "";
  var detailName = "";
  var sheetRe = /<sheet\b[^>]*\/?>/g;
  var sm;
  while ((sm = sheetRe.exec(book))) {
    var sa = attrs(sm[0]);
    if (!sheetIsDetail(sa.name)) continue;
    detailName = String(sa.name || "").trim();
    var rid = sa["r:id"] || sa.id || "";
    detailTarget = relMap[rid] || "";
    break;
  }
  if (!detailName) {
    throw new Error("Detail sheet was not found. Mixing Detail is not imported.");
  }
  var sheetPath = resolveTarget(detailTarget);
  var sheetXml = findFile(files, sheetPath);
  if (!sheetXml) throw new Error("Detail sheet was listed but its worksheet XML was missing.");
  var shared = sharedStrings(findFile(files, "xl/sharedStrings.xml"));
  var styles = dateStyleFlags(findFile(files, "xl/styles.xml"));
  var grid = sheetToRows(sheetXml, shared, styles);
  var parsed = rowsFromDetail(grid);
  if (parsed.error) throw new Error(parsed.error);
  return { sheet: detailName, rows: parsed.rows, headerRow: parsed.headerRow };
}

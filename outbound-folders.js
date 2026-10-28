/* ============================================================================
   Outbound customer folders (outbound-folders.js)
   Drive item 12. Shipping and order screens open the customer's
   Fulfillment - Outbound Orders folder (BOL and PO PDFs stay on Drive).
   This file stores folder links only. It does not download or copy PDFs.
   window.OUTBOUND_FOLDERS.match(customerName) returns the folder URL
   or null. The Drive docs button uses the parent folder when match is null.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var PARENT_ID = "1R09e8kP3HZAujKKQ76lFezfm1XhpuBzz";
  var PARENT_URL = "https://drive.google.com/drive/folders/" + PARENT_ID;

  var RAW = {
  "parent_folder_id": "1R09e8kP3HZAujKKQ76lFezfm1XhpuBzz",
  "parent_url": "https://drive.google.com/drive/folders/1R09e8kP3HZAujKKQ76lFezfm1XhpuBzz",
  "customers": [
    {
      "name": "Affiliated Foods",
      "folder_id": "11sxTsom-9wjtTpoabMDAurrNVNNWSiMT",
      "url": "https://drive.google.com/drive/folders/11sxTsom-9wjtTpoabMDAurrNVNNWSiMT"
    },
    {
      "name": "Affordable Leasing & Distributing",
      "folder_id": "1UquBFpQreRqkVw6xAaU-KFbx3zXe5eO9",
      "url": "https://drive.google.com/drive/folders/1UquBFpQreRqkVw6xAaU-KFbx3zXe5eO9"
    },
    {
      "name": "Amazon",
      "folder_id": "1QGoumXuzR54f395fREWKtKxHtBX3dh4b",
      "url": "https://drive.google.com/drive/folders/1QGoumXuzR54f395fREWKtKxHtBX3dh4b"
    },
    {
      "name": "AMCON -Rapid City",
      "folder_id": "1YRrshQ8N2mWD_C_TiDygGAGcAEQ-edsw",
      "url": "https://drive.google.com/drive/folders/1YRrshQ8N2mWD_C_TiDygGAGcAEQ-edsw"
    },
    {
      "name": "American Marketing",
      "folder_id": "1N2isAhCXnUOh6taI8lnuG92Xqjotc0i6",
      "url": "https://drive.google.com/drive/folders/1N2isAhCXnUOh6taI8lnuG92Xqjotc0i6"
    },
    {
      "name": "Andalusia Distributing",
      "folder_id": "1unkSHW5czKsaAH3hcZDMEceBv3vFDiyh",
      "url": "https://drive.google.com/drive/folders/1unkSHW5czKsaAH3hcZDMEceBv3vFDiyh"
    },
    {
      "name": "Bass Pro",
      "folder_id": "1V5flB4-z_p4QBzwRfAbTP1-reGEYrnXZ",
      "url": "https://drive.google.com/drive/folders/1V5flB4-z_p4QBzwRfAbTP1-reGEYrnXZ"
    },
    {
      "name": "Big Willys",
      "folder_id": "16RjCMHsWUsaSytVnuc1RWoCaYY5jW_wT",
      "url": "https://drive.google.com/drive/folders/16RjCMHsWUsaSytVnuc1RWoCaYY5jW_wT"
    },
    {
      "name": "Capitol Distributing",
      "folder_id": "1GLv9vuHtXESA61wohEQi9XnU6CBtMO0u",
      "url": "https://drive.google.com/drive/folders/1GLv9vuHtXESA61wohEQi9XnU6CBtMO0u"
    },
    {
      "name": "Carmela Foods",
      "folder_id": "1pY5vUOV1u-PATrOnFq0FcZnjuwKbwJSB",
      "url": "https://drive.google.com/drive/folders/1pY5vUOV1u-PATrOnFq0FcZnjuwKbwJSB"
    },
    {
      "name": "Chambers & Owen, Inc",
      "folder_id": "160J402GMGgnqFbd9ZMHMBOtcL_2K0oTw",
      "url": "https://drive.google.com/drive/folders/160J402GMGgnqFbd9ZMHMBOtcL_2K0oTw"
    },
    {
      "name": "Cooper Booth",
      "folder_id": "18YIyE9ADq0GP8dE0bIt11ds6LLG46NBA",
      "url": "https://drive.google.com/drive/folders/18YIyE9ADq0GP8dE0bIt11ds6LLG46NBA"
    },
    {
      "name": "Core-Mark",
      "folder_id": "1dN8gSSCzWWv2Owu3I5HX8WE5oGl9liu_",
      "url": "https://drive.google.com/drive/folders/1dN8gSSCzWWv2Owu3I5HX8WE5oGl9liu_"
    },
    {
      "name": "Cow Crack",
      "folder_id": "10s0UzuCcdQjeslLZ92uC3_q2a-LWKpd9",
      "url": "https://drive.google.com/drive/folders/10s0UzuCcdQjeslLZ92uC3_q2a-LWKpd9"
    },
    {
      "name": "Events",
      "folder_id": "1NQ3546s-IuJjhZBmgcg5wMd2P5w6q3l-",
      "url": "https://drive.google.com/drive/folders/1NQ3546s-IuJjhZBmgcg5wMd2P5w6q3l-"
    },
    {
      "name": "Fareway",
      "folder_id": "1ZCZvG3yUgEUgtU0KfLedQhvPKszIHAnL",
      "url": "https://drive.google.com/drive/folders/1ZCZvG3yUgEUgtU0KfLedQhvPKszIHAnL"
    },
    {
      "name": "Fresno Wholesale",
      "folder_id": "1PvBQl_jhk-LXV6JbRtNdATrYshA_TWdc",
      "url": "https://drive.google.com/drive/folders/1PvBQl_jhk-LXV6JbRtNdATrYshA_TWdc"
    },
    {
      "name": "Gordon Food Service",
      "folder_id": "1mt-x5ZArjn9Q7-nx9DGraBN4vA-ADxPu",
      "url": "https://drive.google.com/drive/folders/1mt-x5ZArjn9Q7-nx9DGraBN4vA-ADxPu"
    },
    {
      "name": "Herman's",
      "folder_id": "17e2fxINOm4Ry7IuH-zjhtB-XkiKVlWUP",
      "url": "https://drive.google.com/drive/folders/17e2fxINOm4Ry7IuH-zjhtB-XkiKVlWUP"
    },
    {
      "name": "HY VEE",
      "folder_id": "1e0QpTIVxMIDukzpBBblpUrrKG13KOT8W",
      "url": "https://drive.google.com/drive/folders/1e0QpTIVxMIDukzpBBblpUrrKG13KOT8W"
    },
    {
      "name": "IFA",
      "folder_id": "17-WkA4bnVQEm1AHGV_7cm6aP1g8r-kZn",
      "url": "https://drive.google.com/drive/folders/17-WkA4bnVQEm1AHGV_7cm6aP1g8r-kZn"
    },
    {
      "name": "Imperial",
      "folder_id": "1xtnHckGOGOtirrCMMNZNmkrVDL9_9PzF",
      "url": "https://drive.google.com/drive/folders/1xtnHckGOGOtirrCMMNZNmkrVDL9_9PzF"
    },
    {
      "name": "Intermountain Farmes association",
      "folder_id": "1FIsl19RaAurQfNuerFGNJjxhG_F5LDSd",
      "url": "https://drive.google.com/drive/folders/1FIsl19RaAurQfNuerFGNJjxhG_F5LDSd"
    },
    {
      "name": "J. Martino Provisions",
      "folder_id": "1rlofvG680Z3Gr36MEB2na9xhC2eWqKmH",
      "url": "https://drive.google.com/drive/folders/1rlofvG680Z3Gr36MEB2na9xhC2eWqKmH"
    },
    {
      "name": "KEHE",
      "folder_id": "1jsA6aMkG9WYWMV6vmc9ZLx3yzZiaLBpW",
      "url": "https://drive.google.com/drive/folders/1jsA6aMkG9WYWMV6vmc9ZLx3yzZiaLBpW"
    },
    {
      "name": "KFM Affordable Leasing",
      "folder_id": "1nqFx7M8ybXMbBl_OSjrO5vNz-LobR8pW",
      "url": "https://drive.google.com/drive/folders/1nqFx7M8ybXMbBl_OSjrO5vNz-LobR8pW"
    },
    {
      "name": "Kroger",
      "folder_id": "1_MjF1TLFkyjvdDx19aT5BH-JTVXz7iF5",
      "url": "https://drive.google.com/drive/folders/1_MjF1TLFkyjvdDx19aT5BH-JTVXz7iF5"
    },
    {
      "name": "LOL Distro",
      "folder_id": "177EWDVEIxqkW0JC9lIjmZKO6NwPuEMA9",
      "url": "https://drive.google.com/drive/folders/177EWDVEIxqkW0JC9lIjmZKO6NwPuEMA9"
    },
    {
      "name": "Lynco",
      "folder_id": "1C3x5sL8Y8sdBU9r_Q2QVBAfz6NyINbVj",
      "url": "https://drive.google.com/drive/folders/1C3x5sL8Y8sdBU9r_Q2QVBAfz6NyINbVj"
    },
    {
      "name": "MAG",
      "folder_id": "1fehqfMIHY8WeSgvTs51IaBRSp8_9yrAj",
      "url": "https://drive.google.com/drive/folders/1fehqfMIHY8WeSgvTs51IaBRSp8_9yrAj"
    },
    {
      "name": "McLane",
      "folder_id": "1DQ5o42UbDpUEJv1shUtNdn8zHD-qND6I",
      "url": "https://drive.google.com/drive/folders/1DQ5o42UbDpUEJv1shUtNdn8zHD-qND6I"
    },
    {
      "name": "Midwest Distribution",
      "folder_id": "1y5jYwi01MnMeu2d3VgCiMHDso2Oxwzcs",
      "url": "https://drive.google.com/drive/folders/1y5jYwi01MnMeu2d3VgCiMHDso2Oxwzcs"
    },
    {
      "name": "Milwaukee Brewers",
      "folder_id": "1Svfq9oLRO1-xzZZuhwGS4ZFwVGme1RjV",
      "url": "https://drive.google.com/drive/folders/1Svfq9oLRO1-xzZZuhwGS4ZFwVGme1RjV"
    },
    {
      "name": "Monkey Sports",
      "folder_id": "1TnVsDw9N8NNxWIgXOOkqDBInwOwSRJdn",
      "url": "https://drive.google.com/drive/folders/1TnVsDw9N8NNxWIgXOOkqDBInwOwSRJdn"
    },
    {
      "name": "Pauls Tools Inc",
      "folder_id": "1_DAk5eQOMlanxIY1Beg78dlTB1Ma0zaI",
      "url": "https://drive.google.com/drive/folders/1_DAk5eQOMlanxIY1Beg78dlTB1Ma0zaI"
    },
    {
      "name": "PIAS - Christian Esparza Garcia",
      "folder_id": "1jafvYsprTHj9rz1c7JPFQ9fAMP3rSkmL",
      "url": "https://drive.google.com/drive/folders/1jafvYsprTHj9rz1c7JPFQ9fAMP3rSkmL"
    },
    {
      "name": "Play It Again",
      "folder_id": "1Mpka3BeSw--Y-3cUydtbioV3JQegV2fJ",
      "url": "https://drive.google.com/drive/folders/1Mpka3BeSw--Y-3cUydtbioV3JQegV2fJ"
    },
    {
      "name": "Ropamex Wholesale",
      "folder_id": "18Lx_HbiHPnsRe6te1Tnm3AfV9VQJhtMt",
      "url": "https://drive.google.com/drive/folders/18Lx_HbiHPnsRe6te1Tnm3AfV9VQJhtMt"
    },
    {
      "name": "San Francisco Naturals",
      "folder_id": "1lwfzsmaXu1fhtOuAOXLvMqS3mxeNtCjy",
      "url": "https://drive.google.com/drive/folders/1lwfzsmaXu1fhtOuAOXLvMqS3mxeNtCjy"
    },
    {
      "name": "Savor Seasonings",
      "folder_id": "13LF3QMmmcP6Nkr_ZGsIbR97SMV-JkMdd",
      "url": "https://drive.google.com/drive/folders/13LF3QMmmcP6Nkr_ZGsIbR97SMV-JkMdd"
    },
    {
      "name": "Scheels",
      "folder_id": "1f4aTpD98SN5jTspMME4xAR2eJbLnl1cj",
      "url": "https://drive.google.com/drive/folders/1f4aTpD98SN5jTspMME4xAR2eJbLnl1cj"
    },
    {
      "name": "Sidelines Sports",
      "folder_id": "1OgRRxPdJrr2hdOJ4fVYrpVtgcAY1q_qZ",
      "url": "https://drive.google.com/drive/folders/1OgRRxPdJrr2hdOJ4fVYrpVtgcAY1q_qZ"
    },
    {
      "name": "SuperValu",
      "folder_id": "1IPA67IPEAX2GbIOXf1Tovi87Uh8lj7Ou",
      "url": "https://drive.google.com/drive/folders/1IPA67IPEAX2GbIOXf1Tovi87Uh8lj7Ou"
    },
    {
      "name": "Target",
      "folder_id": "1ih7HaR_ZVy1iW0yHT89cLzSuau6EyRZX",
      "url": "https://drive.google.com/drive/folders/1ih7HaR_ZVy1iW0yHT89cLzSuau6EyRZX"
    },
    {
      "name": "Thrifty",
      "folder_id": "1CueJeJqiQ2i0GVJXfCZFNNtP36lJnrYv",
      "url": "https://drive.google.com/drive/folders/1CueJeJqiQ2i0GVJXfCZFNNtP36lJnrYv"
    },
    {
      "name": "TIKTOK Shop",
      "folder_id": "135uoIBFt3D_gx5v8FLBxcb3ii0_8pCKP",
      "url": "https://drive.google.com/drive/folders/135uoIBFt3D_gx5v8FLBxcb3ii0_8pCKP"
    },
    {
      "name": "TPI Foods",
      "folder_id": "1bd9XXyyi-c-lTsX5LzWFMyxU4wS1WX6m",
      "url": "https://drive.google.com/drive/folders/1bd9XXyyi-c-lTsX5LzWFMyxU4wS1WX6m"
    },
    {
      "name": "UNFI - Rocklin",
      "folder_id": "1h5ud3CkrpLzFEg3cP7IRk0hUEXd9VHbW",
      "url": "https://drive.google.com/drive/folders/1h5ud3CkrpLzFEg3cP7IRk0hUEXd9VHbW"
    },
    {
      "name": "UNFI/MILLBROOK",
      "folder_id": "1n6_vcm9mrh1QA6SsA31fG9kW_DQ9Kw5H",
      "url": "https://drive.google.com/drive/folders/1n6_vcm9mrh1QA6SsA31fG9kW_DQ9Kw5H"
    },
    {
      "name": "Vistar",
      "folder_id": "1hF6wPTTet5k_JSiYcwsmGXMiDyhRz8Oa",
      "url": "https://drive.google.com/drive/folders/1hF6wPTTet5k_JSiYcwsmGXMiDyhRz8Oa"
    },
    {
      "name": "Walmart",
      "folder_id": "1burSIpIPV3siYQECHBMsozIZ0P5QloMv",
      "url": "https://drive.google.com/drive/folders/1burSIpIPV3siYQECHBMsozIZ0P5QloMv"
    }
  ]
};

  // Short names used on the log. Values are folder names from the map.
  // Bare "UNFI" is both Rocklin and Millbrook, so it stays unmatched.
  var ALIASES = {
    "unfi": ["UNFI - Rocklin", "UNFI/MILLBROOK"],
    "unfi rocklin": "UNFI - Rocklin",
    "unfi millbrook": "UNFI/MILLBROOK",
    "rocklin": "UNFI - Rocklin",
    "millbrook": "UNFI/MILLBROOK",
    "mill brook": "UNFI/MILLBROOK",
    "target": "Target",
    "mclane": "McLane",
    "mc lane": "McLane",
    "scheels": "Scheels",
    "scheel": "Scheels",
    "hyvee": "HY VEE",
    "hy vee": "HY VEE",
    "hy": "HY VEE",
    "coremark": "Core-Mark",
    "core mark": "Core-Mark",
    "gfs": "Gordon Food Service",
    "tiktok": "TIKTOK Shop",
    "tik tok": "TIKTOK Shop",
    "basspro": "Bass Pro",
    "bass pro": "Bass Pro",
    "walmart": "Walmart",
    "wal mart": "Walmart",
    "supervalu": "SuperValu",
    "super valu": "SuperValu",
    "herman": "Herman's",
    "hermans": "Herman's",
    "intermountain": "Intermountain Farmes association",
    "intermountain farmers": "Intermountain Farmes association",
    "intermountain farmers association": "Intermountain Farmes association",
    "farmers association": "Intermountain Farmes association",
    "kehe": "KEHE",
    "ifa": "IFA",
    "amcon": "AMCON -Rapid City",
    "kfm": "KFM Affordable Leasing",
    "sfn": "San Francisco Naturals",
    "pias": "PIAS - Christian Esparza Garcia",
    "play it again": "Play It Again",
    "chambers": "Chambers & Owen, Inc",
    "big willy": "Big Willys",
    "big willys": "Big Willys",
    "big willies": "Big Willys"
  };

  var STOP = {
    inc: 1, llc: 1, co: 1, company: 1, the: 1, of: 1, and: 1, corp: 1, corporation: 1,
    ltd: 1, distribution: 1, distributing: 1, dist: 1, wholesale: 1, foods: 1, food: 1,
    dba: 1, store: 1, stores: 1, dc: 1, warehouse: 1, shop: 1, shops: 1
  };

  var CUSTOMERS = (RAW.customers || []).map(function (c) {
    return { name: c.name, folder_id: c.folder_id, url: c.url };
  });

  var records = [];
  var byNorm = {};
  var byName = {};

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(s) { return s.replace(/ /g, ""); }

  function hasPhrase(hay, needle) {
    if (!needle) return false;
    return (" " + hay + " ").indexOf(" " + needle + " ") >= 0;
  }

  function toks(s) {
    return s.split(" ").filter(function (t) { return t && t.length >= 2 && !STOP[t]; });
  }

  CUSTOMERS.forEach(function (c) {
    var rec = { name: c.name, folder_id: c.folder_id, url: c.url, norm: norm(c.name) };
    records.push(rec);
    byNorm[rec.norm] = rec;
    byName[rec.name] = rec;
  });

  function matchedTokens(n, rec) {
    var ft = toks(rec.norm);
    var nmatch = 0;
    for (var i = 0; i < ft.length; i++) if (hasPhrase(n, ft[i])) nmatch++;
    return nmatch;
  }

  function score(n, rec) {
    var fn = rec.norm;
    var nc = compact(n);
    var fc = compact(fn);
    var ft = toks(fn);
    var ct = toks(n);
    if (nc.length >= 4 && nc === fc) return 96;
    if (fn.length >= 3 && hasPhrase(n, fn)) return 94;
    if (fc.length >= 5 && nc.indexOf(fc) === 0) return 90;
    if (nc.length >= 6 && fc.indexOf(nc) === 0) return 86;
    if (ft.length && ft.every(function (t) { return hasPhrase(n, t); })) return 84;
    if (ct.length && ft.length && ct.length <= ft.length && hasPhrase(n, ft[0]) && ct.every(function (t) { return hasPhrase(fn, t); })) return 78;
    return 0;
  }

  function resolveList(names, n) {
    var hit = null;
    for (var i = 0; i < names.length; i++) {
      var folder = byName[names[i]];
      if (!folder) continue;
      var parts = toks(folder.norm).filter(function (t) { return t !== "unfi"; });
      var ok = false;
      for (var j = 0; j < parts.length; j++) if (hasPhrase(n, parts[j])) ok = true;
      if (!ok) continue;
      if (hit) return null;
      hit = folder;
    }
    return hit;
  }

  function pickAlias(n) {
    var bestKey = "";
    var bestVal = null;
    var keys = Object.keys(ALIASES);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var ok = k === n || (k.length >= 3 && hasPhrase(n, k));
      if (!ok) continue;
      if (k.length > bestKey.length) {
        bestKey = k;
        bestVal = ALIASES[k];
      }
    }
    if (!bestKey) return { hit: false, folder: null };
    if (typeof bestVal === "string") return { hit: true, folder: byName[bestVal] || null };
    return { hit: true, folder: resolveList(bestVal, n) };
  }

  function matchInfo(customerName) {
    var n = norm(customerName);
    if (!n) return null;
    if (byNorm[n]) return byNorm[n];
    var alias = pickAlias(n);
    if (alias.hit) return alias.folder;
    var ranked = [];
    for (var i = 0; i < records.length; i++) {
      var s = score(n, records[i]);
      if (s <= 0) continue;
      ranked.push({ rec: records[i], s: s, matched: matchedTokens(n, records[i]) });
    }
    ranked.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      if (b.matched !== a.matched) return b.matched - a.matched;
      return b.rec.norm.length - a.rec.norm.length;
    });
    if (!ranked.length || ranked[0].s < 70) return null;
    if (ranked.length > 1 && ranked[1].s === ranked[0].s && ranked[1].matched === ranked[0].matched) return null;
    return ranked[0].rec;
  }

  function match(customerName) {
    var info = matchInfo(customerName);
    return info ? info.url : null;
  }

  function hrefFor(customerName) {
    return match(customerName) || PARENT_URL;
  }

  function unmatched(names) {
    var out = [];
    var seen = {};
    (names || []).forEach(function (n) {
      var key = String(n || "").replace(/\s+/g, " ").trim();
      if (!key || seen[key]) return;
      seen[key] = 1;
      if (!match(key)) out.push(key);
    });
    out.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
    return out;
  }

  var painting = false;

  function $(id) { return doc ? doc.getElementById(id) : null; }

  function cleanName(s) {
    var t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t || t === "-" || t === "\u2014" || t === "\u2013") return "";
    return t;
  }

  function customerFromCell(tr, index) {
    var cell = tr.cells && tr.cells[index];
    if (!cell) return "";
    var b = cell.querySelector ? cell.querySelector("b") : null;
    if (!b) return "";
    return cleanName(b.textContent);
  }

  function cellLead(cell) {
    if (!cell) return "";
    var t = "";
    for (var n = cell.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) t += n.textContent;
      else break;
    }
    if (!t) t = cell.textContent || "";
    return cleanName(t);
  }

  function syncButton(a, name) {
    var info = matchInfo(name);
    var url = info ? info.url : PARENT_URL;
    var title = info ? ("Drive docs: " + info.name) : "Drive docs: Fulfillment - Outbound Orders";
    var cls = "obf-docs" + (info ? "" : " obf-parent");
    var label = info ? ("Drive docs for " + info.name) : "Drive docs, shared Outbound Orders folder";
    // Attribute writes only. childList changes here retrigger the view observer.
    if (a.getAttribute("href") !== url) a.setAttribute("href", url);
    if (a.getAttribute("target") !== "_blank") a.setAttribute("target", "_blank");
    if (a.getAttribute("rel") !== "noopener noreferrer") a.setAttribute("rel", "noopener noreferrer");
    if (a.title !== title) a.title = title;
    if (a.className !== cls) a.className = cls;
    if (a.textContent !== "Drive docs") a.textContent = "Drive docs";
    if ((a.getAttribute("data-obf-for") || "") !== (name || "")) {
      if (name) a.setAttribute("data-obf-for", name);
      else a.removeAttribute("data-obf-for");
    }
    if (a.getAttribute("aria-label") !== label) a.setAttribute("aria-label", label);
  }

  function makeButton(name) {
    var a = doc.createElement("a");
    syncButton(a, name);
    return a;
  }

  function placeButton(cell, name) {
    if (!cell || !name) return;
    var a = cell.querySelector("a.obf-docs");
    if (!a) {
      cell.appendChild(doc.createTextNode(" "));
      cell.appendChild(makeButton(name));
      return;
    }
    if (a.getAttribute("data-obf-for") !== name || a.getAttribute("href") !== hrefFor(name)) syncButton(a, name);
  }

  function decorateRows(bodyId, nameIndex, minCells) {
    var body = $(bodyId);
    if (!body) return;
    var rows = body.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      if (!tr.cells || tr.cells.length < minCells) continue;
      var name = customerFromCell(tr, nameIndex);
      placeButton(tr.cells[tr.cells.length - 1], name);
    }
  }

  function decorateOrderDocs() {
    if (!doc) return;
    var heads = doc.querySelectorAll("#odocBody .odcusthead");
    for (var i = 0; i < heads.length; i++) {
      var head = heads[i];
      var t = "";
      for (var n = head.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) t += n.textContent;
        else if (n.nodeType === 1 && n.classList && n.classList.contains("obf-docs")) break;
      }
      var name = cleanName(t);
      if (!name) continue;
      var a = head.querySelector("a.obf-docs");
      if (!a) {
        head.appendChild(doc.createTextNode(" "));
        head.appendChild(makeButton(name));
      } else if (a.getAttribute("data-obf-for") !== name) {
        syncButton(a, name);
      }
    }
  }

  function paintField(inputId, linkId) {
    var input = $(inputId);
    if (!input || !input.parentNode) return;
    var name = cleanName(input.value);
    var a = $(linkId);
    if (!name) {
      if (a && a.parentNode) a.parentNode.removeChild(a);
      return;
    }
    if (!a) {
      a = makeButton(name);
      a.id = linkId;
      input.insertAdjacentElement("afterend", a);
      return;
    }
    syncButton(a, name);
  }

  function orderishType(type) {
    return /\b(customer order|retail|event|other)\b/i.test(type || "");
  }

  function noteText(names) {
    var shown = names.slice(0, 10);
    var extra = names.length - shown.length;
    return "No customer folder yet for: " + shown.join(", ") +
      (extra ? ", and " + extra + " more" : "") +
      ". Drive docs opens the shared Outbound Orders folder for those names.";
  }

  function paintNote() {
    var search = $("shlSearch");
    if (!search || !search.parentNode) return;
    var body = $("shlBody");
    var names = [];
    var seen = {};
    if (body) {
      var rows = body.querySelectorAll("tr");
      var limit = Math.min(rows.length, 60);
      for (var i = 0; i < limit; i++) {
        var tr = rows[i];
        if (!tr.cells || tr.cells.length < 8) continue;
        if (!orderishType(cellLead(tr.cells[1]))) continue;
        var name = customerFromCell(tr, 2);
        if (!name || seen[name] || match(name)) continue;
        seen[name] = 1;
        names.push(name);
      }
    }
    names.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
    var existing = $("obf-note");
    if (!names.length) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    var text = noteText(names);
    if (existing) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }
    var p = doc.createElement("p");
    p.id = "obf-note";
    p.textContent = text;
    search.parentNode.insertBefore(p, search);
  }

  function styleOnce() {
    if (!doc || $("obf-style")) return;
    var s = doc.createElement("style");
    s.id = "obf-style";
    s.textContent = [
      "a.obf-docs{display:inline-block;background:#fff;color:var(--navy,#04223B);border:1px solid var(--blue,#006DB6);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;text-decoration:none;line-height:1.2;white-space:nowrap;margin-left:4px;vertical-align:middle}",
      "a.obf-docs.obf-parent{border-style:dashed}",
      "#obf-note{color:#889;font-size:12px;margin:0 0 8px}"
    ].join("");
    (doc.head || doc.documentElement).appendChild(s);
  }

  function enhance() {
    if (!doc || painting) return;
    painting = true;
    try {
      styleOnce();
      decorateRows("shlBody", 2, 8);
      decorateRows("ordBody", 0, 4);
      decorateOrderDocs();
      paintField("shl-recipient", "obf-form");
      paintField("o-cust", "obf-order-form");
      paintNote();
    } finally {
      painting = false;
    }
  }

  function watch() {
    var view = $("view");
    if (!view || view.__obfObs || typeof root.MutationObserver !== "function") return;
    var obs = new root.MutationObserver(function () { enhance(); });
    view.__obfObs = obs;
    obs.observe(view, { childList: true, subtree: true });
    enhance();
  }

  function onInput(e) {
    if (!e.target || !e.target.id) return;
    if (e.target.id === "shl-recipient") paintField("shl-recipient", "obf-form");
    if (e.target.id === "o-cust") paintField("o-cust", "obf-order-form");
  }

  if (doc) {
    styleOnce();
    doc.addEventListener("input", onInput);
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { watch(); enhance(); });
    else { watch(); enhance(); }
  }

  var api = {
    match: match,
    matchInfo: matchInfo,
    hrefFor: hrefFor,
    unmatched: unmatched,
    parentUrl: PARENT_URL,
    parentId: PARENT_ID,
    customers: CUSTOMERS,
    aliases: ALIASES
  };
  root.OUTBOUND_FOLDERS = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

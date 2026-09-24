/* Smackin' OS - PO PDF formatting patch (po-format.js)
   Purchasing fix for Michelle (PPC Flex PO, 2026-09-22):
     1) QTY unit is no longer hard-coded to "lbs". Each line uses its own
        unit if one is set (unit / uom / units); otherwise the quantity
        prints with no unit at all (e.g. "100000").
     2) The unit PRICE prints with up to 5 decimals (e.g. $0.10575) instead
        of rounding to cents ($0.11). Line/Subtotal/Total dollars stay 2-dp.
   This runs after app.js and overrides UI.poPdf (the PO "Download" button).
   Self-contained: it carries its own copies of the small helpers so it does
   not depend on app.js internals.
*/
(function () {
  "use strict";

  function money(v) {
    if (v == null || v === "") return "";
    var n = parseFloat(String(v).replace(/[$,\s]/g, ""));
    if (isNaN(n)) return String(v);
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function moneyP(v) {
    if (v == null || v === "") return "";
    var n = parseFloat(String(v).replace(/[$,\s]/g, ""));
    if (isNaN(n)) return String(v);
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  }
  function notesClean(n) { return String(n || "").replace(/\s*\[\[ETA:\d{4}-\d{2}-\d{2}\]\]\s*/, "").trim(); }
  function poLinesOf(s) {
    var lines = [];
    try { var p = typeof s.lines === "string" ? JSON.parse(s.lines || "[]") : (s.lines || []); if (Array.isArray(p)) lines = p; } catch (e) {}
    var g = function (o, keys) { for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (o[k] != null && o[k] !== "") return o[k]; } return ""; };
    return lines.map(function (l) {
      return {
        item: g(l, ["item", "item_no", "itemNo", "part", "part_no", "sku", "code"]),
        desc: g(l, ["desc", "description", "name", "product"]),
        qty: g(l, ["qty", "quantity", "cases"]),
        price: g(l, ["price", "unit_price", "unitPrice", "cost"]),
        unit: g(l, ["unit", "uom", "units", "u_o_m"]),
        tot: g(l, ["total", "line_total", "lineTotal", "amount", "ext"]),
        ship: String(g(l, ["ship", "ship_date", "shipdate", "expected", "eta"]) || "").slice(0, 10),
        recv: !!(l.recv || l.received === true)
      };
    });
  }

  function poDoc(s) {
    const jsPDFctor = window.jspdf && window.jspdf.jsPDF; if (!jsPDFctor) return null;
    const doc = new jsPDFctor({ unit: "pt", format: "letter" });
    const M = 54, W = 612, RM = W - M; let y = 58;
    const navy = [31, 56, 100], grey = [90, 90, 90], ink = [34, 34, 34];
    const rule = yy => { doc.setDrawColor(210, 216, 226); doc.setLineWidth(1); doc.line(M, yy, RM, yy); };
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text("SMACKIN' SNACKS", M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("SLC Fulfillment Center", M, y + 15);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(180, 120, 10);

    y += 30; rule(y); y += 26;
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text("PURCHASE ORDER", M, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text("PO #: " + (s.po_num || "-"), M, y);
    doc.text("Date: " + (s.po_date || new Date().toISOString().slice(0, 10)), RM, y, { align: "right" }); y += 22;
    const colR = 320;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("VENDOR", M, y); doc.text("SHIP TO", colR, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    const vend = []; if (s.vendor) vend.push(s.vendor); if (s.vendor_addr) vend.push(s.vendor_addr); if (s.vendor_email) vend.push(s.vendor_email); if (s.vendor_phone) vend.push(s.vendor_phone);
    const vlines = []; (vend.length ? vend : ["-"]).forEach(v => doc.splitTextToSize(String(v), colR - M - 12).forEach(x => vlines.push(x)));
    const ship = doc.splitTextToSize(s.ship_to || "-", RM - colR);
    doc.text(vlines, M, y); doc.text(ship, colR, y);
    y += Math.max(vlines.length, ship.length) * 13 + 14; rule(y); y += 16;
    const cItem = M, cDesc = M + 44, cQty = 396, cPrice = 456, cTot = RM;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("ITEM", cItem, y); doc.text("DESCRIPTION", cDesc, y); doc.text("QTY", cQty, y, { align: "right" });
    doc.text("PRICE", cPrice, y, { align: "right" }); doc.text("TOTAL", cTot, y, { align: "right" });
    y += 6; rule(y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(ink[0], ink[1], ink[2]);
    const lines = poLinesOf(s);
    if (lines.length) {
      lines.forEach(l => {
        if (y > 720) { doc.addPage(); y = 58; }
        const descTxt = String(l.desc || "") + (l.ship ? "   (ships " + l.ship + ")" : "");
        const dl = doc.splitTextToSize(descTxt, cQty - cDesc - 44);
        doc.text(String(l.item || ""), cItem, y);
        doc.text(dl.length ? dl : [""], cDesc, y);
        if (l.qty !== "") doc.text(String(l.qty) + (l.unit ? " " + l.unit : ""), cQty, y, { align: "right" });
        if (l.price !== "") doc.text(moneyP(l.price), cPrice, y, { align: "right" });
        if (l.tot !== "") doc.text(money(l.tot), cTot, y, { align: "right" });
        y += Math.max(dl.length * 12, 14);
      });
    } else { doc.text("(no line items on file)", cItem, y); y += 14; }
    y += 4; rule(y); y += 18;
    const tRow = (lbl, val) => { if (val == null || val === "") return; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]); doc.text(lbl, cPrice, y, { align: "right" }); doc.setTextColor(ink[0], ink[1], ink[2]); doc.text(money(val), cTot, y, { align: "right" }); y += 15; };
    tRow("Subtotal", s.subtotal); tRow("Shipping", s.shipping); tRow("Tax", s.tax); tRow("Other", s.other);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text("TOTAL", cPrice, y, { align: "right" }); doc.text(money(s.total), cTot, y, { align: "right" }); y += 24;
    const nc = notesClean(s.notes);
    if (nc) { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]); doc.text("NOTES", M, y); y += 13; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]); const ns = doc.splitTextToSize(nc, RM - M); doc.text(ns, M, y); y += ns.length * 13; }
    doc.setFontSize(8); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text("Generated by Smackin' OS  -  PO " + (s.po_num || ""), M, 762);
    return doc;
  }

  function bind() {
    if (!window.UI) return false;
    window.UI.poPdf = function (id) {
      var s = (window.DB && DB.supplierPos ? DB.supplierPos() : []).find(function (x) { return String(x.id) === String(id); });
      if (!s) return;
      var doc = poDoc(s);
      if (!doc) return (window.toast ? window.toast("PDF lib not loaded") : alert("PDF lib not loaded"));
      doc.save("PO " + (s.po_num || "draft") + (s.vendor ? " - " + s.vendor : "") + ".pdf");
    };
    window.__PO_FORMAT_PATCH = true;
    return true;
  }
  if (!bind()) { var tries = 0; var iv = setInterval(function () { if (bind() || ++tries > 40) clearInterval(iv); }, 250); }
})();

// ============================================================================
// SPS -> Smackin' OS sync  (Supabase Edge Function: sps-sync)
// Deploy:  supabase functions deploy sps-sync
// NOT a GitHub Pages file. Runs server-side because the SPS Transaction API is
// token-based and not reachable from the browser (CORS). It pulls documents
// from the /testout folder (then live) and writes them into sps_transactions,
// which the in-app "SPS Feed" screen reads.
//
// Fill the three TODOs from Raul's API docs (Transaction API + Startup Guide):
//   1. AUTH   - how SPS issues/accepts a token (OAuth client-credentials, or a
//               static API token). Set the secrets with:
//                 supabase secrets set SPS_TOKEN_URL=... SPS_CLIENT_ID=... SPS_CLIENT_SECRET=...
//               or, if it is a static token:  supabase secrets set SPS_API_TOKEN=...
//   2. LIST   - the endpoint that lists documents in /testout
//   3. FETCH  - the endpoint that returns one document as JSON
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;      // service role: server-side only
const SPS_BASE = Deno.env.get("SPS_API_BASE") ?? "";               // e.g. https://api.spscommerce.com
const FOLDER = Deno.env.get("SPS_FOLDER") ?? "testout";

async function getToken(): Promise<string> {
  const stat = Deno.env.get("SPS_API_TOKEN");
  if (stat) return stat;                                            // static-token case
  // TODO 1: OAuth client-credentials — confirm URL/params from the Startup Guide
  const res = await fetch(Deno.env.get("SPS_TOKEN_URL")!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SPS_CLIENT_ID")!,
      client_secret: Deno.env.get("SPS_CLIENT_SECRET")!,
    }),
  });
  const j = await res.json();
  return j.access_token;
}

function parse(doc: any) {
  const find = (re: RegExp, o: any = doc, d = 0): any => {
    if (o == null || d > 8) return null;
    if (Array.isArray(o)) { for (const v of o) { const r = find(re, v, d + 1); if (r != null) return r; } return null; }
    if (typeof o === "object") {
      for (const k in o) if (re.test(k) && (typeof o[k] === "string" || typeof o[k] === "number")) return o[k];
      for (const k in o) { const r = find(re, o[k], d + 1); if (r != null) return r; }
    }
    return null;
  };
  const inv = find(/invoicenumber/i);
  const po = find(/purchaseordernumber|customerordernumber|ponumber|ordernumber/i);
  const asn = find(/shipmentidentification|asnnumber|bolnumber/i);
  const explicit = find(/documenttype|transactionset|transactiontype/i);
  const doc_type = explicit ? String(explicit)
    : inv != null ? "810 Invoice" : asn != null ? "856 Ship Notice" : po != null ? "850 Purchase Order" : "Unknown";
  return {
    doc_type,
    partner: find(/tradingpartner|partnername|retailer|customername|vendorname/i),
    po_number: po != null ? String(po) : (inv != null ? String(inv) : null),
  };
}

Deno.serve(async () => {
  const sb = createClient(SB_URL, SB_SERVICE);
  try {
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };

    // TODO 2: list documents waiting in /testout
    const listRes = await fetch(`${SPS_BASE}/documents?folder=${FOLDER}`, { headers: h });
    const list = await listRes.json();
    const items: any[] = list.documents ?? list.items ?? list ?? [];

    let saved = 0;
    for (const it of items) {
      const id = it.documentId ?? it.id ?? it;
      // TODO 3: fetch one document as JSON
      const docRes = await fetch(`${SPS_BASE}/documents/${id}`, { headers: h });
      const doc = await docRes.json();
      const p = parse(doc);
      const { error } = await sb.from("sps_transactions").insert({
        doc_type: p.doc_type, partner: p.partner, po_number: p.po_number,
        direction: "in", status: "live", received_at: new Date().toISOString(), payload: doc,
      });
      if (!error) saved++;
    }
    return new Response(JSON.stringify({ ok: true, saved }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});

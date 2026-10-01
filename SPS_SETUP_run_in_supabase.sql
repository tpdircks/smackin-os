-- ============================================================================
-- SPS Feed + pending lot columns — run once in Supabase SQL Editor
-- (This is a DATABASE change, NOT a GitHub commit file.)
-- ============================================================================

-- 1) Table the Edge Function writes incoming SPS documents into, and the
--    in-app "SPS Feed" screen reads from.
create table if not exists public.sps_transactions (
  id          bigint generated always as identity primary key,
  doc_type    text,              -- "850 Purchase Order" | "856 Ship Notice" | "810 Invoice"
  partner     text,              -- trading partner (McLane, Core-Mark, ...)
  po_number   text,              -- PO / reference the document is about
  direction   text default 'in',
  status      text default 'live',  -- 'test' for pasted samples, 'live' for the feed
  received_at timestamptz default now(),
  payload     jsonb,             -- the full SPS JSON document
  created_at  timestamptz default now()
);
create index if not exists sps_transactions_po_idx       on public.sps_transactions (po_number);
create index if not exists sps_transactions_received_idx on public.sps_transactions (received_at desc);

-- 2) STILL PENDING from the lot-number work: add lot to the receiving + shipping logs.
alter table public.receiving_log add column if not exists lot text;
alter table public.shipping_log  add column if not exists lot text;

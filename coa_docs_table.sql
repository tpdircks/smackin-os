-- Smackin' OS - Vendor COA files
-- Run ONCE in the Supabase SQL editor (project otwjxqhhwljwfyqbfuxz).
-- Stores metadata for COA PDFs and photos. The bytes stay in the existing
-- public "supplier-pos" bucket under a coa_ prefix. No new bucket.
-- This is an ops/quality file store, not an SQF controlled-document register.
--
-- Public URLs match supplier POs and service invoices: anyone with the link
-- can open the file. Signed URLs were not added, so a scanner can open a COA
-- without an extra token step.

create table if not exists public.coa_docs (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  doc_date          date,
  vendor            text,
  lot               text,
  item_id           text,
  item_name         text,
  receiving_log_id  text,
  file_name         text,
  file_path         text,
  file_url          text,
  content_type      text,
  uploaded_by       text,
  note              text,
  matched_at        timestamptz,
  matched_by        text
);

create index if not exists coa_docs_lot_idx on public.coa_docs (lot);
create index if not exists coa_docs_recv_idx on public.coa_docs (receiving_log_id);
create index if not exists coa_docs_vendor_idx on public.coa_docs (vendor);
create index if not exists coa_docs_created_idx on public.coa_docs (created_at desc);

alter table public.coa_docs enable row level security;

drop policy if exists coa_docs_all on public.coa_docs;
create policy coa_docs_all on public.coa_docs
  for all using (true) with check (true);

grant select, insert, update, delete on public.coa_docs to anon, authenticated, service_role;

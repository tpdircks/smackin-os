-- Smackin' OS — Services Provided module
-- Run ONCE in the Supabase SQL editor (project otwjxqhhwljwfyqbfuxz).
-- Creates the services_log table the Services tab reads/writes.
-- Invoice files reuse the existing public "supplier-pos" storage bucket (svc_ prefix) — no new bucket needed.

create table if not exists public.services_log (
  id            uuid primary key default gen_random_uuid(),
  svc_date      date,
  service_type  text,
  provider      text,
  invoice_num   text,
  num_services  numeric,
  total_cost    numeric,
  unit_cost     numeric,
  notes         text,
  file_name     text,
  file_path     text,
  file_url      text,
  entered_by    text,
  created_at    timestamptz default now()
);

alter table public.services_log enable row level security;

-- Open policy to match the app's other operational tables (anon key, single-tenant internal app)
drop policy if exists "services_log all" on public.services_log;
create policy "services_log all" on public.services_log
  for all using (true) with check (true);

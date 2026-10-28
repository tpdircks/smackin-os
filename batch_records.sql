-- Smackin OS - Batch Tracking Record
-- Run once in the Supabase SQL editor (project otwjxqhhwljwfyqbfuxz).
-- Troy or the coordinator applies this file. The app does not run this DDL.
--
-- Digital worksheet for the controlled batch sheet. The Drive file stays the
-- master template:
--   QUAL_FORM_10.0 Batch Tracking Record Form - All Flavors 12.11.25.xlsx
--   Drive id 1RqXrHo0qB6zoBBKI2NKyetmlaLWZvEeF
-- Do not backfill historical paper sheets into this table.
-- One row per flavor + date + shift. Grids are jsonb, same idea as
-- supplier_pos.lines (a flexible list stored with the row).
-- Open RLS matches pmac_log, mixing_history, and services_log.

create table if not exists public.batch_records (
  id            uuid primary key default gen_random_uuid(),
  run_date      date not null,
  shift         text not null,
  flavor_code   text not null,
  flavor_name   text,
  mixer         text,
  header        jsonb not null default '{}'::jsonb,
  ingredients   jsonb not null default '[]'::jsonb,
  disposed      jsonb not null default '[]'::jsonb,
  rework        jsonb not null default '{}'::jsonb,
  totals        jsonb not null default '{}'::jsonb,
  packaging     jsonb not null default '{}'::jsonb,
  status        text not null default 'draft',
  entered_by    text,
  verified_by   text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint batch_records_run_key unique (run_date, shift, flavor_code)
);

create index if not exists batch_records_date_idx on public.batch_records (run_date);

alter table public.batch_records enable row level security;

drop policy if exists batch_records_all on public.batch_records;
create policy batch_records_all on public.batch_records
  for all using (true) with check (true);

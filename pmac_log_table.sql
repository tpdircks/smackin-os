-- Smackin OS — P-Mac Log Output table
-- Run once in Supabase (project otwjxqhhwljwfyqbfuxz) → SQL Editor.
-- Matches the "Shift Setup" block of Allen's P-Mac (Packing Machine) Log v27.
-- Open RLS to match the rest of the app (anon key is public in config.js).

create table if not exists public.pmac_log (
  id             uuid primary key default gen_random_uuid(),
  log_date       date,
  shift          text,
  operator       text,
  machine_no     text,
  flavor_code    text,
  flavor_name    text,
  bag_size       text,          -- '1.5' | '2.75' | '4.0'
  package_type   text,          -- Standard | Unvaulted | Backyard Sports-Pedro | Halloween | ...
  batch_code     text,
  start_time     text,
  end_time       text,
  allergen       text,
  wt1            numeric,
  wt2            numeric,
  wt3            numeric,
  total_packages integer,
  notes          text,
  entered_by     text,
  created_at     timestamptz default now()
);

alter table public.pmac_log enable row level security;

drop policy if exists pmac_log_all on public.pmac_log;
create policy pmac_log_all on public.pmac_log
  for all using (true) with check (true);

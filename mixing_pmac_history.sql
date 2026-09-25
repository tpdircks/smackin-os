-- Smackin' OS — Mixing + P-Mac historical production tables
-- Run once in Supabase SQL Editor (project otwjxqhhwljwfyqbfuxz).
-- After running, import the two CSVs into these tables via
-- Table Editor -> (table) -> Insert -> Import data from CSV.

-- ============ P-MAC run history (per machine / operator / flavor) ============
create table if not exists public.pmac_history (
  id          bigint generated always as identity primary key,
  run_date    date,
  machine     text,
  operator    text,
  status      text,          -- Active / Inactive
  dept        text,          -- P-Mac
  shift       text,          -- 1st / 2nd
  bag_size    text,          -- 1.5 oz / 4 oz
  flavor_code text,
  flavor_name text,
  box_count   numeric,
  total_pkgs  numeric,
  created_at  timestamptz default now()
);
create index if not exists pmac_history_date_idx on public.pmac_history (run_date);
create index if not exists pmac_history_flavor_idx on public.pmac_history (flavor_code);
alter table public.pmac_history enable row level security;
drop policy if exists pmac_history_all on public.pmac_history;
create policy pmac_history_all on public.pmac_history for all using (true) with check (true);

-- ============ Mixing run history (per operator / flavor / machine) ============
create table if not exists public.mixing_history (
  id           bigint generated always as identity primary key,
  run_date     date,
  operator     text,
  shift        text,
  team         text,
  flavor_code  text,
  flavor_name  text,
  machine      text,          -- M2 / M4 ...
  total_bins   numeric,
  start_time   text,
  end_time     text,
  downtime_min numeric,
  created_at   timestamptz default now()
);
create index if not exists mixing_history_date_idx on public.mixing_history (run_date);
create index if not exists mixing_history_flavor_idx on public.mixing_history (flavor_code);
alter table public.mixing_history enable row level security;
drop policy if exists mixing_history_all on public.mixing_history;
create policy mixing_history_all on public.mixing_history for all using (true) with check (true);

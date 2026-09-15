-- Smackin OS — Manufacturing daily production (Mixing & P-Mac, 1.5oz + 4oz)
-- One row per production date; the app upserts on prod_date.
create table if not exists mfg_daily (
  id         uuid primary key default gen_random_uuid(),
  prod_date  date unique,
  shift      text,
  mixing_15  numeric default 0,
  mixing_4   numeric default 0,
  pmac_15    numeric default 0,
  pmac_4     numeric default 0,
  unit       text default 'packages',
  notes      text,
  entered_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table mfg_daily disable row level security;

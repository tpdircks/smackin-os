-- Smackin OS - WIP Production daily units (Drive item 9)
-- Run once in the Supabase SQL editor (project otwjxqhhwljwfyqbfuxz).
-- Source: SMACKIN' WIP.xlsx tab "Production" (Matt Bollinger). The sheet stays
-- the source of truth. This table is a one-shot import plus a read view.
--
-- Grain is one row per production date + bag size + flavor. That does not fit
-- mfg_daily (one row per date, mixing bins and P-Mac package totals) or
-- production_output (dept, shift, bags, cases for live entry).
-- Do not load this dataset into pmac_history or mixing_history. Those tables
-- are operator runs, not daily retail units.
--
-- oz4 in the sheet is 4 oz. oz15 is 1.5 oz.
-- Open RLS matches pmac_history, mixing_history, and batch_records.
-- The app uses the publishable anon key, so the policy is the shared plant
-- access model, not per-user auth.uid().

create table if not exists public.wip_production_daily (
  id         bigint generated always as identity primary key,
  prod_date  date not null,
  bag_size   text not null,
  flavor     text not null,
  units      numeric not null,
  source     text not null default 'wip',
  created_at timestamptz not null default now(),
  constraint wip_production_daily_natural unique (prod_date, bag_size, flavor, source),
  constraint wip_production_daily_bag_size_chk check (bag_size in ('1.5 oz', '4 oz')),
  constraint wip_production_daily_units_chk check (units >= 0),
  constraint wip_production_daily_flavor_chk check (length(btrim(flavor)) > 0),
  constraint wip_production_daily_source_chk check (length(btrim(source)) > 0)
);

create index if not exists wip_production_daily_date_idx
  on public.wip_production_daily (prod_date);

comment on table public.wip_production_daily is
  'Daily retail production units by flavor from the WIP Production sheet. Not P-Mac or Mixing run history.';

alter table public.wip_production_daily enable row level security;

drop policy if exists wip_production_daily_all on public.wip_production_daily;
create policy wip_production_daily_all on public.wip_production_daily
  for all using (true) with check (true);

grant select, insert, update, delete on public.wip_production_daily to anon, authenticated, service_role;
grant usage, select on sequence public.wip_production_daily_id_seq to anon, authenticated, service_role;

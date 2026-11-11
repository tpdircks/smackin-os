-- Built or staged SPS purchase orders, keyed by partner and PO.
-- A row means the cases are already on a pallet. Make Plan leaves those
-- bags out of to-produce, and the past-due list treats the PO as awaiting pickup.
-- Order Board edits use the same three people who can edit supplier PO lines.

create table if not exists public.demand_po_stage (
  partner text not null,
  po text not null,
  pickup_date date,
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  primary key (partner, po)
);

comment on table public.demand_po_stage is
  'Open SPS POs that are built and waiting for pickup. Keyed by partner and PO.';

alter table public.demand_po_stage enable row level security;

drop policy if exists demand_po_stage_all on public.demand_po_stage;
create policy demand_po_stage_all on public.demand_po_stage
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on table public.demand_po_stage to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.demand_po_stage;
exception when others then
  null;
end $$;

insert into public.demand_po_stage (partner, po, pickup_date, note, updated_by)
values (
  'KeHE',
  '3942350',
  '2026-11-19',
  'On pallet since 9/25; KeHE picking up with PO 4012582 (Daniel Jones email 11/10)',
  'troy.dircks@smackinsnacks.com'
)
on conflict (partner, po) do update set
  pickup_date = excluded.pickup_date,
  note = excluded.note,
  updated_at = now(),
  updated_by = excluded.updated_by;

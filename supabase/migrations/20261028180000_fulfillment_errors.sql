-- Fulfillment error history (Drive item 10). One row per reported order error.
-- Open RLS, same pattern as sqf_tasks and the other plant tables.
-- seed_key is a hash of order_num + date_reported + product_ordered so the
-- WIP import can run again without inserting a second copy.
-- Applied on project otwjxqhhwljwfyqbfuxz. Kept here so the schema sits with the screen.

create table if not exists public.fulfillment_errors (
  id uuid primary key default gen_random_uuid(),
  date_reported date not null,
  order_num text not null default '',
  product_ordered text not null default '',
  product_received text,
  notes text,
  replacement_tracking text,
  error_cost numeric,
  credited_date date,
  source text not null default 'manual',
  seed_key text not null,
  created_at timestamptz not null default now(),
  unique (seed_key)
);

alter table public.fulfillment_errors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fulfillment_errors' and policyname = 'fulfillment_errors_all'
  ) then
    create policy fulfillment_errors_all on public.fulfillment_errors
      for all to public using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.fulfillment_errors to anon, authenticated, service_role;

notify pgrst, 'reload schema';

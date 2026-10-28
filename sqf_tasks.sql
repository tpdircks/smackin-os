-- SQF outstanding items. One row per clause. Open RLS, same pattern as the other plant tables.
-- Already applied on project otwjxqhhwljwfyqbfuxz. Kept here so the schema sits with the screen.
-- The app imports Monica's list once (sqf-tasks.js) and is the live list after that.

create table if not exists public.sqf_tasks (
  clause text primary key,
  module int,
  section text,
  requirement text,
  owner_raw text,
  owners text[],
  action_notes text,
  due_date date,
  due_raw text,
  status text not null default 'open',
  evidence_url text,
  evidence_note text,
  completed_date date,
  source_file_id text,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sqf_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sqf_tasks' and policyname = 'sqf_tasks_all'
  ) then
    create policy sqf_tasks_all on public.sqf_tasks
      for all to public using (true) with check (true);
  end if;
end $$;

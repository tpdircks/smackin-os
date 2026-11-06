-- Read-only ERP identity for the os-viewer gateway.
-- Apply in the Supabase SQL editor or with the Supabase CLI. Do not treat
-- this file as already applied.
--
-- Anon and authenticated grants are left unchanged.
-- The signed-in app still writes with those roles. See docs/erp-reader.md.

create schema if not exists os_private;
revoke all on schema os_private from public;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'erp_reader') then
    create role erp_reader nologin noinherit nobypassrls nocreatedb nocreaterole;
  else
    alter role erp_reader nologin noinherit nobypassrls nocreatedb nocreaterole;
  end if;
end $$;

comment on role erp_reader is
  'SELECT-only API role for the os-viewer gateway. No login and no write grants.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant erp_reader to authenticator;
  end if;
end $$;

grant usage on schema public to erp_reader;

revoke all privileges on all tables in schema public from erp_reader;
grant select on all tables in schema public to erp_reader;

alter default privileges for role postgres in schema public
  grant select on tables to erp_reader;

do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public grant select on tables to erp_reader';
exception
  when insufficient_privilege or undefined_object then
    raise notice 'skipped default privileges for supabase_admin';
end $$;

-- SELECT policies for the reader. Existing public policies stay as they are.
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('drop policy if exists erp_reader_select on public.%I', r.table_name);
    execute format(
      'create policy erp_reader_select on public.%I for select to erp_reader using (true)',
      r.table_name
    );
  end loop;
end $$;

create or replace function os_private.grant_erp_reader()
returns event_trigger
language plpgsql
security definer
set search_path = os_private, public
as $$
declare
  obj record;
  rel text;
begin
  for obj in select * from pg_event_trigger_ddl_commands()
  loop
    if obj.schema_name is distinct from 'public' or obj.object_type is distinct from 'table' then
      continue;
    end if;
    select c.relname into rel from pg_class c where c.oid = obj.objid;
    if rel is null then
      continue;
    end if;
    execute format('grant select on table public.%I to erp_reader', rel);
    execute format('drop policy if exists erp_reader_select on public.%I', rel);
    execute format(
      'create policy erp_reader_select on public.%I for select to erp_reader using (true)',
      rel
    );
  end loop;
end;
$$;

revoke all on function os_private.grant_erp_reader() from public;

drop event trigger if exists os_private_grant_erp_reader;
create event trigger os_private_grant_erp_reader
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function os_private.grant_erp_reader();

do $$
declare
  missing int;
  writable int;
begin
  select count(*) into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not exists (
      select 1 from pg_policy p
      join pg_roles g on g.oid = any (p.polroles)
      where p.polrelid = c.oid
        and p.polname = 'erp_reader_select'
        and g.rolname = 'erp_reader'
    );
  if missing <> 0 then
    raise exception 'erp_reader_select is missing on % public tables', missing;
  end if;

  select count(*) into writable
  from information_schema.role_table_grants
  where grantee = 'erp_reader'
    and table_schema = 'public'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');
  if writable <> 0 then
    raise exception 'erp_reader still has % write grants', writable;
  end if;
end $$;

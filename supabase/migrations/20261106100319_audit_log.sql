-- Append-only edit trail for every public table.
-- Apply after 20261106095944_erp_reader.sql. Do not treat this file as already applied.
--
-- Writes from the signed-in app show auth user id and email from the JWT
-- (the same sub claim auth.uid() reads). Writes with the publishable key
-- show actor_role anon. Direct SQL shows the database user.
--
-- Exclusions (documented in docs/audit-log.md):
--   * audit_log itself is not audited
--   * kv_status keys ending in :last_sync, :lock, or :source (sync heartbeats)
-- A failure to write the trail warns and does not roll back the business save.

create schema if not exists os_private;
revoke all on schema os_private from public;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_pk text,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  actor_role text,
  operator text,
  note text,
  old_row jsonb,
  new_row jsonb,
  changed_columns text[]
);

comment on table public.audit_log is
  'Append-only edit trail. Clients may select. Inserts happen only inside os_private.log_change.';

create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at desc);
create index if not exists audit_log_table_idx on public.audit_log (table_name, changed_at desc);
create index if not exists audit_log_email_idx on public.audit_log (user_email);

revoke all on table public.audit_log from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.audit_log from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.audit_log from authenticated';
    execute 'grant select on table public.audit_log to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'erp_reader') then
    execute 'revoke insert, update, delete, truncate, references, trigger on table public.audit_log from erp_reader';
    execute 'grant select on table public.audit_log to erp_reader';
  end if;
end $$;

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_authenticated on public.audit_log;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'create policy audit_log_select_authenticated on public.audit_log for select to authenticated using (true)';
  end if;
end $$;

drop policy if exists erp_reader_select on public.audit_log;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'erp_reader') then
    execute 'create policy erp_reader_select on public.audit_log for select to erp_reader using (true)';
  end if;
end $$;

create or replace function os_private.log_change()
returns trigger
language plpgsql
security definer
set search_path = os_private, public
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_src jsonb;
  v_claims jsonb := '{}'::jsonb;
  v_headers jsonb := '{}'::jsonb;
  v_raw text;
  v_uid uuid;
  v_email text;
  v_role text;
  v_op text;
  v_note text;
  v_pk text;
  v_key text;
  v_cols text[];
begin
  begin
    if tg_table_name = 'audit_log' then
      return null;
    end if;

    v_new := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
    v_old := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
    v_src := coalesce(v_new, v_old, '{}'::jsonb);

    if tg_table_name = 'kv_status' then
      v_key := coalesce(v_new->>'key', v_old->>'key', '');
      if v_key ~ ':(last_sync|lock|source)$' then
        return null;
      end if;
    end if;

    v_raw := current_setting('request.jwt.claims', true);
    if v_raw is not null and btrim(v_raw) <> '' then
      begin
        v_claims := v_raw::jsonb;
      exception when others then
        v_claims := '{}'::jsonb;
      end;
    end if;

    v_raw := current_setting('request.headers', true);
    if v_raw is not null and btrim(v_raw) <> '' then
      begin
        v_headers := v_raw::jsonb;
      exception when others then
        v_headers := '{}'::jsonb;
      end;
    end if;

    v_role := nullif(v_claims->>'role', '');
    if v_role is null then
      v_role := current_user;
    end if;
    v_email := nullif(v_claims->>'email', '');
    begin
      if coalesce(v_claims->>'sub', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_uid := (v_claims->>'sub')::uuid;
      end if;
    exception when others then
      v_uid := null;
    end;

    v_op := coalesce(
      nullif(v_new->>'operator', ''),
      nullif(v_new->>'updated_by', ''),
      nullif(v_new->>'entered_by', ''),
      nullif(v_new->>'received_by', ''),
      nullif(v_new->>'imported_by', ''),
      nullif(v_old->>'operator', ''),
      nullif(v_old->>'updated_by', ''),
      nullif(v_headers->>'x-smk-operator', '')
    );
    v_note := coalesce(
      nullif(v_headers->>'x-smk-note', ''),
      nullif(v_new->>'note', ''),
      nullif(v_new->>'notes', '')
    );
    if v_note is not null and length(v_note) > 500 then
      v_note := left(v_note, 500);
    end if;

    select string_agg(format('%s=%s', a.attname, coalesce(v_src->>a.attname, '')), '|' order by a.attnum)
      into v_pk
    from pg_index i
    join pg_attribute a
      on a.attrelid = i.indrelid
     and a.attnum = any (i.indkey)
    where i.indrelid = tg_relid
      and i.indisprimary
      and a.attnum > 0
      and not a.attisdropped;
    if v_pk is null or v_pk = '' then
      v_pk := coalesce(v_src->>'id', v_src->>'key', '');
    end if;

    if tg_op = 'INSERT' then
      select coalesce(array_agg(x.k order by x.k), '{}') into v_cols
      from jsonb_object_keys(coalesce(v_new, '{}'::jsonb)) as x(k);
    elsif tg_op = 'DELETE' then
      select coalesce(array_agg(x.k order by x.k), '{}') into v_cols
      from jsonb_object_keys(coalesce(v_old, '{}'::jsonb)) as x(k);
    else
      select coalesce(array_agg(d.k order by d.k), '{}') into v_cols
      from (
        select coalesce(n.key, o.key) as k
        from jsonb_each(coalesce(v_new, '{}'::jsonb)) n
        full outer join jsonb_each(coalesce(v_old, '{}'::jsonb)) o on o.key = n.key
        where n.value is distinct from o.value
      ) d;
    end if;

    insert into public.audit_log (
      table_name, row_pk, action, user_id, user_email, actor_role,
      operator, note, old_row, new_row, changed_columns
    ) values (
      tg_table_name,
      nullif(v_pk, ''),
      lower(tg_op),
      v_uid,
      v_email,
      v_role,
      v_op,
      v_note,
      v_old,
      v_new,
      v_cols
    );
  exception when others then
    raise warning 'audit_log skipped on %.%: %', tg_table_name, tg_op, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function os_private.log_change() from public;

create or replace function os_private.attach_audit_trigger(rel regclass)
returns void
language plpgsql
security definer
set search_path = os_private, public
as $$
declare
  schema_name text;
  rel_name text;
begin
  select n.nspname, c.relname into schema_name, rel_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.oid = rel;
  if schema_name is distinct from 'public' or rel_name is null or rel_name = 'audit_log' then
    return;
  end if;
  execute format('drop trigger if exists audit_log_row on %I.%I', schema_name, rel_name);
  execute format(
    'create trigger audit_log_row after insert or update or delete on %I.%I for each row execute function os_private.log_change()',
    schema_name, rel_name
  );
end;
$$;

revoke all on function os_private.attach_audit_trigger(regclass) from public;

do $$
declare
  r record;
begin
  for r in
    select c.oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'audit_log'
  loop
    perform os_private.attach_audit_trigger(r.oid);
  end loop;
end $$;

create or replace function os_private.attach_audit()
returns event_trigger
language plpgsql
security definer
set search_path = os_private, public
as $$
declare
  obj record;
  relname text;
begin
  for obj in select * from pg_event_trigger_ddl_commands()
  loop
    if obj.schema_name is distinct from 'public' or obj.object_type is distinct from 'table' then
      continue;
    end if;
    select c.relname into relname from pg_class c where c.oid = obj.objid;
    if relname is null or relname = 'audit_log' then
      continue;
    end if;
    perform os_private.attach_audit_trigger(obj.objid);
  end loop;
end;
$$;

revoke all on function os_private.attach_audit() from public;

drop event trigger if exists os_private_attach_audit;
create event trigger os_private_attach_audit
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function os_private.attach_audit();

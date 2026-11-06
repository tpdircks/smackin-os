-- Skip noisy sync heartbeat keys. Never delete or remove audit records.
-- Deployed as audit_cursor_heartbeat_1106 after fixture tests at Nov 6, 2026 MST.
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
      if v_key ~ ':(last_sync|lock|source|cursor)$' then
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

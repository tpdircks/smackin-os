-- Open hold_log row when a raw lot is written into QUARANTINE.
-- Inventory sync, a count script, or any other stock write is covered.
-- This is not a receipt: receiving_log_id stays null.
-- An open hold for the same item and lot is left alone.
-- A blank expiration is not filled in.

create or replace function os_private.ensure_quarantine_hold()
returns trigger
language plpgsql
security definer
set search_path = os_private, public
as $$
declare
  v_cat text;
  v_name text;
  v_id text;
  v_blob text;
  v_raw boolean := false;
  v_key text;
  v_headers jsonb := '{}'::jsonb;
  v_who text;
  v_by text;
  v_reason text;
begin
  if tg_op = 'DELETE' then
    return null;
  end if;
  if upper(coalesce(new.location, '')) <> 'QUARANTINE' then
    return null;
  end if;
  if coalesce(new.qty, 0) <= 0 then
    return null;
  end if;

  select i.category, i.name, i.id
    into v_cat, v_name, v_id
  from public.items i
  where i.id = new.item_id
  limit 1;

  v_blob := lower(coalesce(v_cat, '') || ' ' || coalesce(v_name, '') || ' ' || coalesce(v_id, '') || ' ' || coalesce(new.item_id, ''));
  v_raw := position('season' in lower(coalesce(v_cat, ''))) > 0
    or lower(coalesce(v_cat, '')) in ('seed', 'seeds')
    or lower(coalesce(v_cat, '')) like 'seed%'
    or position('maltodextrin' in v_blob) > 0
    or position('stevia' in v_blob) > 0
    or v_blob ~ '(^|[^a-z])oil([^a-z]|$)';
  if not v_raw then
    return null;
  end if;

  v_key := upper(regexp_replace(coalesce(new.lot, ''), '[^A-Za-z0-9]', '', 'g'));
  if exists (
    select 1
    from public.hold_log h
    where h.status = 'held'
      and h.item_id = new.item_id
      and upper(regexp_replace(coalesce(h.lot, ''), '[^A-Za-z0-9]', '', 'g')) = v_key
  ) then
    return null;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_who := coalesce(v_headers->>'x-smk-operator', v_headers->>'x-smk-note', '');
  if v_who ilike '%inventory sync%' then
    v_by := left(v_who, 80);
    v_reason := 'Inventory sync placed this raw lot in QUARANTINE. Not a receipt.';
  else
    v_by := 'stock hold';
    v_reason := 'Stock is in QUARANTINE. Not a receipt.';
  end if;

  insert into public.hold_log (
    hold_at, held_by, item_id, item_name, lot, hold_qty, hold_reason, receiving_log_id, status
  ) values (
    now(),
    v_by,
    new.item_id,
    coalesce(v_name, new.item_id),
    coalesce(new.lot, ''),
    new.qty,
    v_reason,
    null,
    'held'
  );
  return null;
end;
$$;

revoke all on function os_private.ensure_quarantine_hold() from public;

drop trigger if exists stock_quarantine_hold on public.stock;
create trigger stock_quarantine_hold
  after insert or update on public.stock
  for each row
  execute function os_private.ensure_quarantine_hold();

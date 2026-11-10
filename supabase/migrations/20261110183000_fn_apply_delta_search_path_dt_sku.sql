-- P2.8: explicit search_path, Dollar Tree sku index, and initplan form of
-- auth.uid() / auth.email() on the three Dollar Tree policies that call them.
-- erp_reader_select is unchanged. No other table's policies are touched.

alter function public.fn_apply_delta(text, text, numeric, text)
  set search_path = public;

create index if not exists dollar_tree_finished_goods_sku_idx
  on public.dollar_tree_finished_goods (sku);

drop policy if exists dollar_tree_finished_goods_read on public.dollar_tree_finished_goods;
create policy dollar_tree_finished_goods_read
  on public.dollar_tree_finished_goods
  for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists dollar_tree_finished_goods_adri_insert on public.dollar_tree_finished_goods;
create policy dollar_tree_finished_goods_adri_insert
  on public.dollar_tree_finished_goods
  for insert
  to authenticated
  with check (
    ((select auth.uid()) in (
      select users.id
      from auth.users
      where lower(users.email::text) = any (array['inventory@smackinsnacks.com'::text, 'troy.dircks@smackinsnacks.com'::text])
    ))
    and (lower(entered_by_email) = (select auth.email()))
  );

drop policy if exists dollar_tree_finished_goods_adri_update on public.dollar_tree_finished_goods;
create policy dollar_tree_finished_goods_adri_update
  on public.dollar_tree_finished_goods
  for update
  to authenticated
  using (
    (select auth.uid()) in (
      select users.id
      from auth.users
      where lower(users.email::text) = any (array['inventory@smackinsnacks.com'::text, 'troy.dircks@smackinsnacks.com'::text])
    )
  )
  with check (
    ((select auth.uid()) in (
      select users.id
      from auth.users
      where lower(users.email::text) = any (array['inventory@smackinsnacks.com'::text, 'troy.dircks@smackinsnacks.com'::text])
    ))
    and (lower(entered_by_email) = (select auth.email()))
  );

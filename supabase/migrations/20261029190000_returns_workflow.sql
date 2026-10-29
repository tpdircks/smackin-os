-- Inventory returns disposition columns on the existing returns_log.
-- Applied on project otwjxqhhwljwfyqbfuxz. returns-workflow.js shows this
-- same statement if a browser finds the columns missing.
-- This does not move stock. RETURNS contamination stays until Adriana confirms.

alter table public.returns_log
  add column if not exists status text,
  add column if not exists inspected_by text,
  add column if not exists inspected_at timestamptz,
  add column if not exists disposed_at timestamptz,
  add column if not exists stock_item_id text,
  add column if not exists stock_qty numeric,
  add column if not exists stock_loc text,
  add column if not exists stock_moves jsonb,
  add column if not exists qty_hold numeric,
  add column if not exists qty_release numeric,
  add column if not exists qty_scrap numeric,
  add column if not exists qty_other numeric;

comment on column public.returns_log.status is
  'held, released, scrapped, or other. Null is a legacy row from before Inventory disposition.';
comment on column public.returns_log.stock_moves is
  'JSON array of {item_id, location, qty} this return currently accounts for. Delete and edit reverse these. Null on legacy Restock rows. This column does not move the RETURNS pile.';

notify pgrst, 'reload schema';

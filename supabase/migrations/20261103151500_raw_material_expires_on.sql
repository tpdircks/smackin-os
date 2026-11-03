-- Raw-material expiration for seasoning, seed, oil, and stevia.
-- Nullable on purpose. Finished-goods best-by stays on trace_labels.exp.
-- Apply with Supabase apply_migration. Do not change fn_apply_delta.

alter table public.stock
  add column if not exists expires_on date;

alter table public.receiving_log
  add column if not exists expires_on date;

comment on column public.stock.expires_on is
  'Expiration date for a raw-material lot (seasoning, seed, oil, stevia). Not the finished-goods best-by.';

comment on column public.receiving_log.expires_on is
  'Expiration date entered at receiving for a raw material. Not trace_labels.exp.';

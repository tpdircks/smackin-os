# Edit trail

`public.audit_log` records insert, update, and delete on every public base table. The trigger function is `os_private.log_change`. Clients cannot insert, update, or delete the trail. Signed-in users and `erp_reader` can select it.

## What is stored

| Column | Source |
| --- | --- |
| table_name, row_pk, action, changed_at | the row that changed and its primary key |
| user_id, user_email | JWT `sub` and `email` (the same `sub` `auth.uid()` reads) |
| actor_role | JWT `role`, or the database user when there is no JWT |
| operator | `operator`, `updated_by`, `entered_by`, `received_by`, `imported_by`, or the `x-smk-operator` header |
| note | `x-smk-note`, or `note` / `notes` on the row, trimmed to 500 characters |
| old_row, new_row, changed_columns | before and after images, and the columns that differ |

A publishable-key write has role `anon` and no email, so the History screen shows anon. A signed-in session shows the email. The login wall and `session-bind.js` put that session on Supabase clients that do not pass their own storage.

If the trail insert fails, the trigger logs a warning and the business save still commits.

## Exclusions

- `audit_log` has no trigger. The trail does not record itself.
- `kv_status` rows whose key ends in `:last_sync`, `:lock`, or `:source` are skipped. Those are sync heartbeats (`pmac:last_sync`, `sps:last_sync`, `pmac:lock`, `pmac:source`, and the same pattern for other jobs). Other `kv_status` keys are recorded.
- No other table is excluded. `transactions`, `stock`, receiving, production, and lots are included.

New public tables pick up the trigger from the `os_private_attach_audit` event trigger.

## What already existed

Before this table, attribution was partial:

- `transactions.operator` stores the floor name typed on a count, receipt, or similar action. It is not the login, and it is not written for every table.
- Some rows carry `updated_by` (`production_days`, `stock_build`, `line_status`, `sqf_tasks`, work orders). That is the operator string the screen sent.
- `receiving_log.received_by` is the receiver name on a dock row.
- There is no database trigger and no `audit_log` today. Deletes and edits on orders, POs, stock, and the dock do not keep a before image.

The History screen is the History tab. Item, dock, pallet, seasoning, and seed rows also have a History button. It filters by table, person, date, and item or SKU.

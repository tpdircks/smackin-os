-- Schedule prod-tracking-sync every 5 minutes.
-- Applied with `supabase db push` (no separate SQL step).
-- The function reads Allen's Production Tracking workbook and inserts new pmac_history rows.
-- Graph credentials stay on the function (MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pmac_project_url') then
    perform vault.create_secret(
      'https://otwjxqhhwljwfyqbfuxz.supabase.co',
      'pmac_project_url',
      'Base URL for the prod-tracking-sync cron call'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'pmac_publishable_key') then
    perform vault.create_secret(
      'sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY',
      'pmac_publishable_key',
      'Publishable key the prod-tracking-sync cron sends as apikey'
    );
  end if;
end $$;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname = 'prod-tracking-sync'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'prod-tracking-sync',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pmac_project_url' limit 1)
      || '/functions/v1/prod-tracking-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'pmac_publishable_key' limit 1)
    ),
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  ) as request_id;
  $cron$
);

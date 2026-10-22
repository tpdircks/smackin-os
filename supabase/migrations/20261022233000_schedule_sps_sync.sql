-- Schedule the sps-sync Edge Function every 5 minutes.
-- Applied with `supabase db push` (no separate SQL step).
-- The function still no-ops until SPS_CLIENT_ID and SPS_CLIENT_SECRET are set.
-- It only reads SPS. It does not delete files there.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sps_project_url') then
    perform vault.create_secret(
      'https://otwjxqhhwljwfyqbfuxz.supabase.co',
      'sps_project_url',
      'Base URL for the sps-sync cron call'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'sps_publishable_key') then
    perform vault.create_secret(
      'sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY',
      'sps_publishable_key',
      'Publishable key the sps-sync cron sends as apikey'
    );
  end if;
end $$;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname = 'sps-sync'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'sps-sync',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sps_project_url' limit 1)
      || '/functions/v1/sps-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'sps_publishable_key' limit 1)
    ),
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 25000
  ) as request_id;
  $cron$
);

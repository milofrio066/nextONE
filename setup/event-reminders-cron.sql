-- OPTIONAL SETUP, separate from application migrations. Run only after deploying the API.
-- Enable Supabase Cron and pg_net in the dashboard first.
-- In Supabase Vault create these two secrets through the dashboard:
-- nextone_app_origin = https://nextone-opal.vercel.app
-- nextone_cron_secret = the SAME private value as Vercel CRON_SECRET.
-- Never put real secrets in a GitHub file.
do $$begin
 if not exists(select 1 from vault.decrypted_secrets where name='nextone_app_origin') or not exists(select 1 from vault.decrypted_secrets where name='nextone_cron_secret') then raise exception 'Primero configura los dos secretos en Vault';end if;
end $$;
select cron.schedule('nextone-event-surveys','*/5 * * * *', $job$
 select net.http_post(
  url:=rtrim((select decrypted_secret from vault.decrypted_secrets where name='nextone_app_origin'),'/')||'/api/event-reminders',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='nextone_cron_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 );
$job$);

-- AVORA: programador confiable para notificaciones push.
-- Ejecutar una sola vez en Supabase > SQL Editor.
--
-- Antes de ejecutar este archivo, creá en Supabase Vault dos secretos:
--   nombre: avora_app_url
--   valor:  https://productivity-app-six-pearl.vercel.app
--
--   nombre: avora_cron_secret
--   valor:  exactamente el mismo CRON_SECRET de Vercel
--
-- Vault mantiene estos valores cifrados y evita dejar el secreto en el repositorio
-- o dentro del SQL del job.

create schema if not exists vault;
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- El nombre técnico de la extensión Vault es supabase_vault.
create extension if not exists supabase_vault with schema vault;

do $check$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'avora_app_url'
  ) then
    raise exception 'Falta el secreto avora_app_url en Supabase Vault.';
  end if;

  if not exists (
    select 1 from vault.decrypted_secrets where name = 'avora_cron_secret'
  ) then
    raise exception 'Falta el secreto avora_cron_secret en Supabase Vault.';
  end if;
end
$check$;

-- Si ya existía una versión anterior, la reemplazamos sin duplicar avisos.
select cron.unschedule(jobid)
from cron.job
where jobname = 'avora-notifications';

select cron.schedule(
  'avora-notifications',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'avora_app_url'
      ) || '/api/notifications/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'avora_cron_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    ) as request_id;
  $job$
);

-- Debe devolver una fila con active = true.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'avora-notifications';

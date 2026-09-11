# Notificaciones automáticas de AVORA

## Qué estaba fallando

El workflow de GitHub estaba definido cada 5 minutos, pero GitHub Actions retrasó ejecuciones varias horas. El envío manual funcionaba, aunque el programador no era puntual.

Ahora el envío automático queda a cargo de **Supabase Cron + pg_net**, que llama al endpoint de Vercel cada 5 minutos. El endpoint convierte la hora a la zona horaria de cada usuario y evita duplicados.

El workflow de GitHub queda únicamente para pruebas manuales.

## Configuración inicial (una sola vez)

### 1. Variables de Vercel

En **Vercel > Settings > Environment Variables > Production** deben existir:

- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_SUBJECT` (opcional, por ejemplo `mailto:notifications@avora.app`)
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL=https://productivity-app-six-pearl.vercel.app`

Nunca publiques los valores de las claves.

### 2. Supabase Vault

En **Supabase > Vault**, crear estos dos secretos:

- Nombre: `avora_app_url`
  Valor: `https://productivity-app-six-pearl.vercel.app`
- Nombre: `avora_cron_secret`
  Valor: exactamente el mismo valor que `CRON_SECRET` en Vercel Production

Vault guarda los valores cifrados y el job los lee sin exponerlos en el repositorio.

### 3. Activar las extensiones

- En **Supabase > Integrations > Cron**, activar el módulo `pg_cron`.
- En **Supabase > Database > Extensions**, activar `pg_net` y el módulo que figure como **Vault** (su nombre técnico es `supabase_vault`).

Si alguna ya figura como habilitada, dejala así. Si `supabase_vault` no aparece, no intentes crear una extensión llamada `vault`: el archivo SQL ya usa el nombre técnico correcto.

### 4. Crear el programador

Abrir el archivo [`supabase/notifications-cron.sql`](https://github.com/ramiroalvarado123/productivity-app/blob/main/supabase/notifications-cron.sql) del repositorio, copiarlo completo en **Supabase > SQL Editor** y ejecutar.

La última consulta debe devolver una fila con:

- `jobname = avora-notifications`
- `schedule = */5 * * * *`
- `active = true`

No hace falta volver a agregar la app a la pantalla de inicio ni cambiar el enlace.

## Comprobar ejecuciones

En SQL Editor:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'avora-notifications';

select jobid, status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'avora-notifications'
)
order by start_time desc
limit 10;

select id, status_code, error_msg, created
from net._http_response
order by created desc
limit 10;
```

- `status = succeeded` confirma que Supabase ejecutó el job.
- `status_code = 200` confirma que Vercel procesó el envío.
- Si `sent = 0`, el usuario no tiene una suscripción push válida o no hay ningún aviso vencido en esa ventana.

## Prueba recomendada

1. En AVORA, activar las notificaciones desde un dispositivo compatible.
2. Confirmar que el permiso del navegador esté en “permitido”.
3. Crear un evento para mañana y elegir “1 día antes”.
4. En Notificaciones, elegir un horario de calendario unos minutos adelante y guardar.
5. Esperar la siguiente ejecución de Supabase Cron (máximo unos minutos).
6. Revisar la notificación y la tabla `net._http_response`.

Para una prueba inmediata también se puede usar **GitHub > Actions > AVORA notifications > Run workflow**. Ese botón es solo manual; el funcionamiento diario depende de Supabase Cron.

## Si ya existían tablas

El archivo `supabase/notifications.sql` fue corregido y ahora es idempotente. Se puede ejecutar una vez sin borrar datos. Si la columna de anticipación del calendario todavía no existe, ejecutar también `supabase/notifications-calendar-days.sql`.

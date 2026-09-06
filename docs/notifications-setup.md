# Notificaciones push de AVORA

## Estado

1. Ejecutar \`supabase/notifications.sql\` una sola vez en Supabase > SQL Editor.
2. Si ya habías ejecutado ese archivo, ejecutar también \`supabase/notifications-calendar-days.sql\` para agregar la anticipación del calendario.
3. Abrir AVORA > perfil > Configuración > Notificaciones.
3. En iPhone, abrir AVORA desde un ícono agregado a la pantalla de inicio antes de activar las notificaciones.

## Variables privadas de Vercel

En el proyecto de Vercel, en **Settings > Environment Variables**, agregar para Preview y Production:

- \`SUPABASE_SERVICE_ROLE_KEY\`: la clave \`service_role\` de Supabase > Settings > API. Es secreta y nunca debe ir al repositorio.
- \`VAPID_PRIVATE_KEY\`: generar un par VAPID con \`npx web-push generate-vapid-keys\` y guardar sólo la clave privada.
- \`CRON_SECRET\`: una cadena aleatoria larga.
- \`NEXT_PUBLIC_APP_URL\`: la URL pública de AVORA que usará el aviso al abrirse. Para esta rama: \`https://productivity-app-git-feat-avora-ui-polish-ralvarado-3362.vercel.app\`.
- \`VAPID_SUBJECT\` (opcional): por ejemplo \`mailto:notifications@avora.app\`.

La clave pública VAPID de esta versión ya está incluida en el cliente y el dispatcher. Si se reemplaza por otra, hay que configurar la misma pública en \`NEXT_PUBLIC_VAPID_PUBLIC_KEY\` y \`VAPID_PUBLIC_KEY\`.

## Secrets de GitHub Actions

En GitHub, **Settings > Secrets and variables > Actions**, agregar:

- \`AVORA_CRON_SECRET\`: exactamente el mismo valor de \`CRON_SECRET\`.
- \`AVORA_APP_URL\`: exactamente la URL de Vercel de la aplicación.

El workflow \`.github/workflows/notifications.yml\` llama al dispatcher cada 5 minutos y la aplicación evita duplicados. GitHub ejecuta los workflows programados desde la rama predeterminada; mientras esta rama sea de prueba, usar **Actions > AVORA notifications > Run workflow** para probarlo manualmente o configurar estos cambios en la rama predeterminada antes de lanzar.

## Prueba

1. Activar las notificaciones desde Configuración y aceptar el permiso del navegador.
2. Crear un evento para mañana en Plan.
3. Elegir el horario del calendario, cuántos días antes avisar y el horario del balance diario. Los resúmenes semanal, mensual y anual quedan fijos.
4. Ejecutar manualmente el workflow o esperar la ventana configurada (por defecto, 18:00 para calendario).
5. Revisar que llegue “Recuerda: mañana tienes …” o “Recuerda: en X días tienes …”.
5. Verificar también el balance diario (21:00), el resumen semanal del domingo (20:00), el mensual del último día del mes y el anual del 31 de diciembre.

Si el permiso está activo pero no llega nada, revisar primero que existan las cinco variables de Vercel, que los dos secrets de GitHub coincidan y que la suscripción aparezca en la tabla \`push_subscriptions\`.

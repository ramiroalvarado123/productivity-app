-- AVORA: agrega la anticipación configurable de los avisos de calendario.
-- Ejecutar una vez en Supabase > SQL Editor si ya habías ejecutado notifications.sql.

alter table if exists public.notification_preferences
  add column if not exists calendar_reminder_days_before integer not null default 1;

update public.notification_preferences
set calendar_reminder_days_before = 1
where calendar_reminder_days_before is null
   or calendar_reminder_days_before < 1
   or calendar_reminder_days_before > 30;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_calendar_days_before;

alter table public.notification_preferences
  add constraint notification_preferences_calendar_days_before
  check (calendar_reminder_days_before between 1 and 30);

-- AVORA: separar las suscripciones de la app instalada de las del navegador.
-- Ejecutar una vez en Supabase > SQL Editor si notifications.sql ya estaba aplicado.

alter table public.push_subscriptions
  add column if not exists client_context text not null default 'browser';

update public.push_subscriptions
set client_context = 'browser'
where client_context is null
   or client_context not in ('app', 'browser');

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_client_context,
  add constraint push_subscriptions_client_context
    check (client_context in ('app', 'browser'));

-- El cron usa la clave service_role y necesita privilegios SQL explícitos para
-- leer el Daily Score y registrar la entrega idempotente.
grant usage on schema public to service_role;
grant select on table
  public.profiles,
  public.training_disciplines,
  public.training_logs,
  public.calendar_events,
  public.tasks,
  public.meals,
  public.diet_plans,
  public.daily_checkins,
  public.reading_logs,
  public.focus_sessions,
  public.goals,
  public.monthly_priorities
to service_role;
grant select, insert, update, delete on table
  public.notification_preferences,
  public.push_subscriptions,
  public.notification_deliveries
to service_role;
grant usage, select on all sequences in schema public to service_role;

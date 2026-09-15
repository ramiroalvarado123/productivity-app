-- AVORA: reparación de la alerta de Daily Score + objetivo diario de Foco.
-- Ejecutar una vez en Supabase > SQL Editor. Es seguro volver a ejecutarlo.

begin;

alter table public.profiles
  add column if not exists focus_daily_target_minutes integer not null default 120;

update public.profiles
set focus_daily_target_minutes = 120
where focus_daily_target_minutes is null
   or focus_daily_target_minutes < 30
   or focus_daily_target_minutes > 720;

alter table public.profiles
  drop constraint if exists profiles_focus_daily_target_minutes_check;

alter table public.profiles
  add constraint profiles_focus_daily_target_minutes_check
    check (focus_daily_target_minutes between 30 and 720);

alter table public.daily_checkins
  add column if not exists sleep_quality text;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_sleep_quality_check;

alter table public.daily_checkins
  add constraint daily_checkins_sleep_quality_check
    check (sleep_quality in ('good', 'bad') or sleep_quality is null);

alter table public.calendar_events
  add column if not exists discipline_id bigint
    references public.training_disciplines(id) on delete set null;

alter table public.calendar_events
  add column if not exists quality smallint
    check (quality is null or quality between 1 and 4);

alter table public.push_subscriptions
  add column if not exists client_context text not null default 'browser';

update public.push_subscriptions
set client_context = 'browser'
where client_context is null
   or client_context not in ('app', 'browser');

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_client_context;

alter table public.push_subscriptions
  add constraint push_subscriptions_client_context
    check (client_context in ('app', 'browser'));

-- La clave administrativa del cron no depende de las políticas RLS, pero sí
-- necesita estos privilegios SQL para consultar y registrar entregas.
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

notify pgrst, 'reload schema';

commit;

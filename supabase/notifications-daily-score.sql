-- AVORA: permisos para que el scheduler reconstruya el Daily Score.
-- Ejecutar una vez en Supabase > SQL Editor si notifications.sql ya estaba aplicado.
--
-- El scheduler usa SUPABASE_SERVICE_ROLE_KEY únicamente en el servidor. Estas
-- tablas se leen para calcular el puntaje del día; no se exponen al navegador.

grant usage on schema public to service_role;
grant select on table
  public.training_disciplines,
  public.training_logs,
  public.tasks,
  public.meals,
  public.diet_plans,
  public.daily_checkins,
  public.reading_logs,
  public.focus_sessions,
  public.goals,
  public.monthly_priorities
to service_role;

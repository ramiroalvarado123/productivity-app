-- AVORA: sincronización entre Plan, Entrenamiento y Daily Score.
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.calendar_events
  add column if not exists discipline_id bigint references public.training_disciplines(id) on delete set null;

alter table public.calendar_events
  add column if not exists quality smallint check (quality is null or quality between 1 and 4);

notify pgrst, 'reload schema';

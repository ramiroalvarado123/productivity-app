-- AVORA: mejoras de entrenamiento (ejecutar una vez en Supabase > SQL Editor).
-- Conserva los registros existentes y permite decimales en la duración.

alter table public.training_logs
  alter column duration_minutes type numeric(8,2)
  using duration_minutes::numeric;

alter table public.training_logs
  add column if not exists quality smallint;

alter table public.training_logs
  drop constraint if exists training_logs_quality_check;

alter table public.training_logs
  add constraint training_logs_quality_check
  check (quality is null or quality between 1 and 4);

alter table public.training_disciplines
  add column if not exists priority text not null default 'important';

alter table public.training_disciplines
  drop constraint if exists training_disciplines_priority_check;

alter table public.training_disciplines
  add constraint training_disciplines_priority_check
  check (priority in ('important', 'secondary'));

-- Calidad subjetiva del descanso, opcional para no romper registros anteriores.
alter table public.daily_checkins
  add column if not exists sleep_quality text;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_sleep_quality_check;

alter table public.daily_checkins
  add constraint daily_checkins_sleep_quality_check
  check (sleep_quality in ('good', 'bad') or sleep_quality is null);

-- Agrega la valoración "regular" a la calidad del sueño (aditivo: no toca registros existentes).
alter table public.daily_checkins
  drop constraint if exists daily_checkins_sleep_quality_check;

alter table public.daily_checkins
  add constraint daily_checkins_sleep_quality_check
  check (sleep_quality in ('good', 'regular', 'bad') or sleep_quality is null);

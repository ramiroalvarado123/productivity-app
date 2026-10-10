-- Objetivos de grupo individuales (cada integrante cumple la meta completa) o
-- compartidos (se suma lo de todos). Aditivo: los objetivos existentes quedan "shared".
alter table public.group_goals
  add column if not exists mode text not null default 'shared';

alter table public.group_goals
  drop constraint if exists group_goals_mode_check;
alter table public.group_goals
  add constraint group_goals_mode_check check (mode in ('shared', 'individual'));

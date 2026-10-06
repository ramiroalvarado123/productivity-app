-- La preferencia es nullable para que los perfiles existentes queden "sin definir".
-- Lectura sólo suma dentro del factor Foco cuando vale true.
alter table public.profiles
  add column if not exists reading_relevant boolean;

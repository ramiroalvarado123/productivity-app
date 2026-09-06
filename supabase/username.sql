-- AVORA: nombre de usuario único.
-- Ejecutar una sola vez desde Supabase > SQL Editor, después de schema.sql y friends.sql.
--
-- El nombre de usuario reemplaza al email como forma de invitar amigos desde
-- adentro de la app: nadie tiene que compartir su email para que lo inviten.
-- `avora_find_email_by_username` es `security definer` a propósito, porque la
-- política de `profiles` sólo deja ver la fila propia — sin esto, buscar el
-- email de otra persona por su nombre de usuario devolvería siempre vacío.

alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null and username <> '';

create or replace function public.avora_find_email_by_username(p_username text) returns text
  language sql stable security definer set search_path = public as $$
  select email from public.profiles where lower(username) = lower(p_username) limit 1
$$;
grant execute on function public.avora_find_email_by_username(text) to authenticated;

-- AVORA: que Pro solo se active con una suscripción real (Fase 5.3 del plan).
-- ⚠️ Correr SOLO cuando las compras ya estén funcionando (ver docs/store-release.md). Es aditivo
-- (agrega un trigger), pero desde que se corre el botón de Pro de demostración deja de funcionar.
--
-- Hasta hoy cualquier persona podía ponerse `pro_since` desde la app, porque la política de RLS de
-- `profiles` deja editar la propia fila. Este trigger impide cambiar `pro_since` a quienes entran
-- con una sesión de usuario; el servidor (clave de servicio) y el SQL Editor siguen pudiendo.

create or replace function public.avora_guard_pro_since()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and coalesce(new.pro_since, '') <> '' then
      raise exception 'AVORA Pro se activa con una suscripción.';
    end if;
    if tg_op = 'UPDATE' and new.pro_since is distinct from old.pro_since then
      raise exception 'AVORA Pro se activa con una suscripción.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists avora_guard_pro_since on public.profiles;
create trigger avora_guard_pro_since
  before insert or update on public.profiles
  for each row execute function public.avora_guard_pro_since();

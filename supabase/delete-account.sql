-- AVORA: eliminar la propia cuenta (requisito de App Store y Google Play).
-- Ejecutar una sola vez desde Supabase > SQL Editor. Es aditivo: solo crea una función.
--
-- `avora_delete_my_account()` la llama el endpoint DELETE /api/account con la sesión
-- de quien se borra. Es `security definer` porque tiene que borrar filas de otras
-- personas que lo mencionan (amistades, mensajes, invitaciones) y la fila de auth.users,
-- cosas que ninguna política de RLS le permite hacer a un usuario común.
--
-- Qué borra, todo por el email de la sesión:
--   * Cualquier fila de `public` (sin distinguir mayúsculas) cuyo user_email / friend_email / from_email / to_email
--     sea el suyo (comidas, entrenos, mensajes, invitaciones, ...). Se recorre
--     information_schema, así una tabla nueva con esas columnas queda cubierta sola.
--   * Los grupos que creó: si hay otra persona en el grupo, se lo pasa a quien entró
--     primero; si estaba solo, se borra el grupo.
--   * Su perfil (que arrastra por cascada preferencias de avisos y suscripciones push).
--   * Su usuario de login.
-- Las fotos de perfil (Storage) las borra el endpoint antes de llamar a esta función.

create or replace function public.avora_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_group record;
  v_heir text;
  v_column record;
begin
  if v_uid is null or coalesce(v_email, '') = '' then
    raise exception 'Necesitás iniciar sesión para eliminar tu cuenta.';
  end if;

  -- Grupos propios: no dejar a los demás integrantes sin dueño ni borrarles el grupo.
  for v_group in select id from public.avora_groups where lower(owner_email) = lower(v_email) loop
    select user_email into v_heir
      from public.group_members
      where group_id = v_group.id and lower(user_email) <> lower(v_email)
      order by joined_at
      limit 1;
    if v_heir is null then
      delete from public.avora_groups where id = v_group.id;
    else
      update public.avora_groups set owner_email = v_heir where id = v_group.id;
      update public.group_members set role = 'owner' where group_id = v_group.id and user_email = v_heir;
    end if;
  end loop;

  -- Todo lo que lleve su email en alguna columna de identidad.
  for v_column in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name in ('user_email', 'friend_email', 'from_email', 'to_email', 'owner_email')
  loop
    execute format('delete from public.%I where lower(%I) = lower($1)', v_column.table_name, v_column.column_name)
      using v_email;
  end loop;

  -- Los objetivos de grupo que creó siguen existiendo para los demás: solo se le quita su email.
  update public.group_goals set created_by = '' where lower(created_by) = lower(v_email);

  delete from public.profiles where lower(email) = lower(v_email);
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.avora_delete_my_account() from public, anon;
grant execute on function public.avora_delete_my_account() to authenticated;

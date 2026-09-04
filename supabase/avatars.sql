-- AVORA: foto de perfil.
-- Ejecutar una sola vez desde Supabase > SQL Editor, después de schema.sql.
--
-- Cada cuenta sube su foto a `avatars/{email}/avatar.*`: el nombre de
-- carpeta es el email de la sesión, así que las políticas de storage.objects
-- alcanzan para que cada quien sólo pueda escribir la suya. El bucket es
-- público para lectura porque una foto de perfil no es un dato sensible y
-- así se puede mostrar sin pasar cada vista por el servidor.

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

alter table public.profiles add column if not exists avatar_url text not null default '';

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'email'));

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'email'));

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'email'));

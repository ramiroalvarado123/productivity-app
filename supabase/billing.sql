-- AVORA: registro de suscripciones Pro (RevenueCat → App Store / Google Play).
-- Ejecutar una sola vez desde Supabase > SQL Editor. Es aditivo.
--
-- `profiles.pro_since` sigue siendo lo que lee la app para abrir los candados; esta tabla es el
-- registro de por qué y hasta cuándo (qué producto, en qué tienda, último evento). La escribe solo el
-- servidor con la clave de servicio: las personas únicamente pueden leer la suya.

create table if not exists public.entitlements (
  user_email text primary key references public.profiles(email) on delete cascade,
  active boolean not null default false,
  product_id text not null default '',
  store text not null default '',
  expires_at timestamptz,
  last_event text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists owner_read on public.entitlements;
create policy owner_read on public.entitlements for select to authenticated
  using (user_email = (select auth.jwt() ->> 'email'));

grant select on public.entitlements to authenticated;

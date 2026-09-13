-- AVORA: separar las suscripciones de la app instalada de las del navegador.
-- Ejecutar una vez en Supabase > SQL Editor si notifications.sql ya estaba aplicado.

alter table public.push_subscriptions
  add column if not exists client_context text not null default 'browser';

update public.push_subscriptions
set client_context = 'browser'
where client_context is null
   or client_context not in ('app', 'browser');

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_client_context,
  add constraint push_subscriptions_client_context
    check (client_context in ('app', 'browser'));

-- AVORA: migración segura para la versión de prueba que ya está en uso.
-- Ejecutar una sola vez en Supabase > SQL Editor. No borra datos existentes.

alter table public.calendar_events
  add column if not exists completed_at timestamptz;

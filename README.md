# AVORA

App de progreso personal: entrenamiento, alimentación, sueño, foco (estudio/trabajo), lectura, plan y objetivos, con un **Daily Score** que combina todo según tus prioridades, rachas, amigos y grupos, resumen semanal y funciones con IA. Hoy es una PWA; la idea es publicarla en App Store / Play Store con Capacitor.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript estricto
- Supabase: Postgres + Auth + Storage, accedido por REST (`server/db/postgrest.ts`), con RLS por usuario
- OpenAI (cierre por voz, calorías por foto, plan de dieta) · Web Push (VAPID) con un cron de Supabase cada 5 min
- Deploy en Vercel: **cada push a `main` se publica en producción**

## Correr en local

```bash
npm ci
cp .env.example .env.local   # opcional: sin .env.local usa el proyecto de Supabase de producción
npm run dev
```

Ojo: en local se usa la base **real**. Lo que guardes queda guardado.

## Comandos

- `npm run dev` — desarrollo
- `npm test` — tests de lógica pura
- `npm run check` — lint + typecheck + tests + build (tiene que pasar antes de subir)

## Dónde está cada cosa

- `AGENTS.md` — reglas para trabajar en el repo (las lee cualquier IA)
- `docs/architecture.md` — mapa de carpetas y flujo de datos
- `docs/HANDOFF.md` — estado actual y próximos pasos
- `docs/PLAN_REESTRUCTURACION.md` — plan largo (velocidad, estructura, tiendas)
- `supabase/*.sql` — cambios de base de datos para correr en Supabase → SQL Editor

## Variables de entorno

Ver `.env.example`. En Vercel: Supabase (URL, clave pública y service role), `OPENAI_API_KEY`, `CRON_SECRET`, claves VAPID y `FEEDBACK_WEBHOOK_URL` (opcional).

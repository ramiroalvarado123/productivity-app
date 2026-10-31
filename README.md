# AVORA

App de progreso personal: entrenamiento, alimentación, sueño, foco (estudio/trabajo), lectura, plan y objetivos, con un **Daily Score** que combina todo según tus prioridades, rachas, amigos y grupos, resumen semanal y funciones con IA. Es una PWA y también tiene proyectos nativos (Capacitor) para publicarla en App Store / Play Store: ver `docs/store-release.md`.

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
- `npm run native:ios` / `npm run native:android` — sincroniza y abre el proyecto nativo en Xcode / Android Studio
- `npm run native:sync` — copia la config a `ios/` y `android/` · `npm run native:assets` — regenera íconos y splash

## Dónde está cada cosa

- `AGENTS.md` — reglas para trabajar en el repo (las lee cualquier IA)
- `docs/architecture.md` — mapa de carpetas y flujo de datos
- `docs/HANDOFF.md` — estado actual y próximos pasos
- `docs/PLAN_REESTRUCTURACION.md` — plan largo (velocidad, estructura, tiendas)
- `docs/store-release.md` — guía paso a paso para publicar en App Store y Google Play y cómo hacer cambios después
- `supabase/*.sql` — cambios de base de datos para correr en Supabase → SQL Editor

## Variables de entorno

Ver `.env.example`. En Vercel: Supabase (URL, clave pública y service role), `OPENAI_API_KEY`, `CRON_SECRET`, claves VAPID, `FEEDBACK_WEBHOOK_URL` (opcional) y `NEXT_PUBLIC_SUPPORT_EMAIL` (mail de soporte de las tiendas).

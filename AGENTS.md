# AGENTS.md — Cómo trabajar en AVORA

Lo leen todas las IAs que trabajan en el repo (Claude Code, Codex, Cursor…). Si un pedido contradice estas reglas, preguntá antes.

## Qué es AVORA
App de progreso personal (PWA hoy; iOS/Android con Capacitor después): entrenamiento, alimentación, sueño, foco (estudio/trabajo), lectura, plan/agenda, objetivos, Daily Score, amigos/grupos, notificaciones y funciones con IA (cierre por voz, calorías por foto, plan de dieta).
Stack: Next.js 16 (App Router) + React 19 + TypeScript estricto + Supabase (Postgres/Auth/Storage, por REST sin supabase-js) + OpenAI + Web Push. Deploy: cada push a `main` se publica en Vercel (producción). UI en español rioplatense con voseo.

## Antes de leer código
1. `docs/architecture.md` — mapa de carpetas y flujo de datos. **Usalo para ir directo al archivo correcto en vez de leer archivos enteros.**
2. `docs/HANDOFF.md` — qué quedó a medio hacer y los próximos pasos exactos.
3. `docs/PLAN_REESTRUCTURACION.md` — plan largo (velocidad, estructura, tiendas). Las fases 0, 1 (casi toda), 2 y buena parte de la 3 y 4 ya están hechas: ver HANDOFF.

## Comandos
- `npm run dev` — desarrollo (usa la base REAL de Supabase: lo que guardes queda guardado).
- `npm run check` — lint + typecheck + tests + build. **Tiene que pasar antes de dar por terminada una tarea.**
- `npm test` — tests de lógica pura (`tests/*.test.ts`, node:test + tsx).

## Dónde va cada cosa
- `app/` — SOLO rutas de Next (páginas y `api/**/route.ts`). Finitas: autentican, validan y delegan.
- `features/<área>/` — todo lo de un área: `components/` (UI), `logic/` (puro, testeable), `server/actions.ts` (acciones de `POST /api/progress`), `hooks/`, `constants.ts`.
- `features/app-shell/` — la pantalla principal: `progress-app.tsx` (cascarón: menú, barra, diálogos), `use-workspace-state.tsx` (estado y datos compartidos) y `workspace.ts` (`useWorkspace()`).
- `domain/` — reglas compartidas cliente/servidor: Daily Score (`score.ts`), fechas (`dates.ts`), validación (`validation.ts`), agenda (`schedule.ts`), rachas (`streaks.ts`).
- `shared/` — UI genérica (`ui/`), tipos y helpers de datos (`data/`), utilidades (`lib/`), `api/read-json.ts`, `config/supabase.ts` (URL y clave pública).
- `server/` — solo servidor: sesión (`auth/session.ts`, verifica el JWT localmente), PostgREST (`db/postgrest.ts`), helpers (`db/rows.ts`, `http.ts`), tipos de acciones (`progress/types.ts`).
- `supabase/*.sql` — cambios de base para pegar en Supabase > SQL Editor (siempre aditivos).

## Reglas duras
1. **Archivos chicos**: apuntá a < 400 líneas. Si tenés que tocar uno más grande (`progress-app.tsx`, `use-workspace-state.tsx`, `dispatch/route.ts`, `friends/route.ts`, `globals.css`), primero extraé la parte que vas a cambiar a su `features/<área>/` (hay herramientas en `scripts/refactor/`).
2. **Una sección = un componente** en `features/<área>/components/`. Lee lo compartido con `useWorkspace()`; su estado propio (formularios, fecha elegida) vive en el componente. No agregues estado de una sección a `use-workspace-state.tsx`.
3. **Lógica pura separada**: cálculos y validaciones en `logic/` o `domain/`, sin React ni fetch, con tests en `tests/`.
4. **Daily Score único**: la fórmula vive en `domain/score.ts`. Ojo: el armado del "día" está duplicado entre `use-workspace-state.tsx` y `app/api/notifications/dispatch/route.ts` (pendiente unificar, ver HANDOFF). Si tocás uno, tocá el otro.
5. **Guardar**: `save(payload)` de `useWorkspace()`. El servidor devuelve `patch` (filas cambiadas) y el cliente lo aplica al instante; la recarga completa es silenciosa y con debounce. Nunca esperes una recarga para mostrar "Guardado". Para respuesta instantánea usá estado optimista local (ver `toggleDay` en `training-section.tsx`).
6. **Acción nueva de guardado**: handler en `features/<área>/server/actions.ts` (valida todo, mínimo de consultas o una RPC, devuelve `patched({ upsert, remove })`), y queda registrada sola vía el `...xActions` de `app/api/progress/route.ts`.
7. **Compatibilidad**: no cambies nombres ni forma de acciones/endpoints existentes; hay PWAs instaladas con versiones viejas. Agregá, no rompas.
8. **Base de datos**: cambios solo con un `.sql` nuevo en `supabase/`, aditivo (nunca borrar/renombrar), con RLS e índices. El código nuevo debe seguir andando si el SQL todavía no se corrió (ver `isMissingRpc` y las tablas opcionales en `snapshot.ts`).
9. **Estilos**: hoy todo está en `app/globals.css` (pendiente partir). Agregá estilos nuevos al final con un comentario de sección; sin `!important`.
10. **Textos**: UI en español rioplatense con voseo. Código en inglés. Comentarios en español explicando el porqué.
11. **Secretos** nunca en el código; variable nueva → `.env.example`.
12. **Git**: se trabaja en `main`. Un commit por tarea. **No hagas push** salvo que el humano lo pida (push = producción). Nunca `push --force` ni `reset --hard` de commits subidos; para deshacer, `git revert`.

## Definition of done
- `npm run check` en verde (o lint + `npx tsc --noEmit` + `npm test` + `npx next build`).
- Si cambia algo visible: probarlo en el navegador. Como local usa la base real, para probar sin login se puede crear una página temporal con datos falsos que mockee `fetch` (ver HANDOFF, "Probar la UI sin login") y borrarla antes del commit.
- Contarle al humano qué cambió, qué probaste y qué SQL tiene que correr (si aplica).

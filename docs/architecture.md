# Arquitectura de AVORA (mapa)

Para encontrar rápido dónde está cada cosa. Mantener al día en el mismo commit en que se mueve o agrega algo.

## Flujo de datos

```
app/page.tsx (servidor)  ──► features/app-shell/progress-app.tsx  (cliente, cascarón)
                                  │ useWorkspaceState()  ← features/app-shell/use-workspace-state.tsx
                                  │   • data (todo lo de GET /api/progress), loadData, save, savePhase
                                  │   • series por día + scoreForDate, rachas, avisos, bandeja, amigos
                                  ▼
                       <WorkspaceContext.Provider>
                                  │ useWorkspace()   (features/app-shell/workspace.ts)
                                  ▼
            features/<área>/components/<área>-section.tsx  (estado propio de la sección)

save(payload) ──POST──► app/api/progress/route.ts ──► features/<área>/server/actions.ts
                         (getSessionUser: JWT local)        └─► server/db/postgrest.ts (o RPC) ──► Supabase
             ◄── { ok, patch } ── applyPatch (shared/data/apply-patch.ts) + recarga silenciosa (debounce)

GET /api/progress ──► features/app-shell/server/snapshot.ts (una tanda de consultas en paralelo)
```

## Secciones (cliente)

| Sección | Archivo | Notas |
|---|---|---|
| Inicio | `features/home/components/home-section.tsx` | racha, frase, Daily Score, métricas, plan del día, "Lo que veo en tus datos" |
| Daily Score | `features/score/components/score-section.tsx` | factores + prioridades del mes |
| Físico → Entrenamiento | `features/training/components/training-section.tsx` | + `exercise-session-table.tsx`, `distance-session-form.tsx`, `training-quality-bar.tsx` |
| Físico → Alimentación | **todavía en `progress-app.tsx`** (`mealsPanel`, `dietQuickPanel`, `dietPlannerPanel`, `calorieCalendarPanel`) y su estado en `use-workspace-state.tsx` | ver HANDOFF |
| Foco | `features/focus/components/focus-section.tsx` | |
| Lectura (dentro de Foco → Estudio) | `features/reading/components/reading-section.tsx` | + `study-resources.tsx` (artículos/podcasts, notas) |
| Sueño | `features/sleep/components/sleep-section.tsx` | |
| Plan | `features/plan/components/plan-section.tsx` | + `features/goals/components/goals-panel.tsx` |
| Progreso | `features/stats/components/stats-section.tsx` | Las cuentas Pro ven `features/notifications/components/weekly-ai-review.tsx`; la revisión se guarda por semana. |
| Amigos | **todavía en `progress-app.tsx`** (`circleTab`, `groupsTab`, `friendsPanel`) | ver HANDOFF |
| Pro | `features/pro/components/pro-section.tsx` | compra simulada |
| Cierre por voz | `features/voice-checkin/components/voice-checkin-dialog.tsx` | |
| Notificaciones / resumen semanal | `features/notifications/components/notifications-center.tsx` | El aviso dominical y su pop-up sin IA siguen disponibles para todas las cuentas. La revisión Pro usa `weekly-ai-review.tsx` y `weekly-ai-context.ts`. |
| Configuración / Feedback / Onboarding | **todavía en `progress-app.tsx`** | ver HANDOFF |

## Lógica pura (testeada en `tests/`)

- `domain/score.ts` — fórmula del Daily Score. `domain/streaks.ts` — rachas y tendencias. `domain/schedule.ts` — bloques, huecos.
- `domain/dates.ts` — fechas "AAAA-MM-DD" (zona fija Argentina hoy). `domain/validation.ts` — regex y normalizaciones.
- `features/insights/logic/insights.ts` (agenda) + `patterns.ts` (cruces del historial, ranking del panel).
- `features/notifications/logic/weekly-summary.ts`, `features/home/logic/review.ts`, `features/reading/logic/reading.ts`.

## Servidor

- `app/api/progress/route.ts` — adaptador (≈70 líneas). Acciones por área en `features/*/server/actions.ts`.
- `server/auth/session.ts` — `getSessionUser()` verifica el JWT con las claves públicas de Supabase (jose); acepta cookie o `Authorization: Bearer`.
- `server/db/postgrest.ts` — `selectRows` (con `columns`), `insertRows`, `updateRows`, `deleteRows`, `callRpc`, `camelRow`.
- `app/api/notifications/dispatch/route.ts` — cron cada 5 min (Supabase pg_cron) que manda pushes. Grande y con su propia copia del armado del día (pendiente).
- `app/api/weekly-ai/route.ts` — prepara y guarda revisiones semanales Pro, responde una consulta contextual y conserva únicamente memoria estructurada.
- `app/api/friends/route.ts` — amigos y grupos (grande, pendiente partir).

## Base de datos (`supabase/`)

SQL sueltos, ya aplicados en producción salvo los marcados en HANDOFF. Los nuevos: `performance.sql` (índices + RPC de entrenamiento), `study-resources.sql` (artículos/podcasts), `weekly-ai-review.sql` (revisiones y memoria estructurada Pro).

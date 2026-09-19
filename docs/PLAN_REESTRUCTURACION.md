# AVORA — Plan de reestructuración, velocidad y salida a App Store / Play Store

> **Para quién es este documento:** para la IA (Codex, Claude Code, Cursor, etc.) que va a ejecutar los cambios, y para Tommy y su socio, que la van a guiar.
> **Base analizada:** `origin/main` @ `21f11a8` ("Recalculate historical Daily Score after backfills"), 19/09/2026.
> **Importante:** la copia local de Tommy estaba 3 commits atrás. **Antes de empezar: `git checkout main && git pull`.** Los números de línea citados son de `origin/main @ 21f11a8` y son aproximados: si no coinciden, buscá por el nombre del símbolo.

---

## Índice

0. [Cómo usar este documento](#0-cómo-usar-este-documento)
1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Foto del estado actual](#2-foto-del-estado-actual)
3. [Diagnóstico](#3-diagnóstico)
4. [Arquitectura objetivo](#4-arquitectura-objetivo)
5. [Plan de ejecución por fases](#5-plan-de-ejecución-por-fases)
   - [Fase 0 — Red de seguridad](#fase-0--red-de-seguridad-antes-de-tocar-nada)
   - [Fase 1 — Velocidad al guardar (quick wins)](#fase-1--velocidad-al-guardar-quick-wins)
   - [Fase 2 — Limpieza de restos](#fase-2--limpieza-de-restos-y-nombres-engañosos)
   - [Fase 3 — Frontend: partir `progress-client.tsx`](#fase-3--frontend-partir-progress-clienttsx)
   - [Fase 4 — Backend: API por feature y Daily Score único](#fase-4--backend-api-por-feature-validación-y-daily-score-único)
   - [Fase 5 — Base de datos y seguridad](#fase-5--base-de-datos-y-seguridad)
   - [Fase 6 — CSS](#fase-6--css)
   - [Fase 7 — Reglas permanentes para la IA](#fase-7--reglas-permanentes-para-que-la-ia-construya-ordenado)
   - [Fase 8 — App Store y Play Store](#fase-8--app-store-y-play-store)
6. [Contenido propuesto para `AGENTS.md`](#6-contenido-propuesto-para-agentsmd)
7. [Checklist de regresión manual](#7-checklist-de-regresión-manual)
8. [Decisiones abiertas para los humanos](#8-decisiones-abiertas-para-los-humanos)
9. [Apéndices](#9-apéndices)

---

## 0. Cómo usar este documento

### 0.1 Para Tommy y su socio

- **No le pidan a la IA "hacé todo el documento".** Pídanle **un paso por sesión** (por ejemplo "Fase 1, paso 1.2"). Cada paso está pensado para terminar con la app funcionando igual que antes.
- **Se trabaja siempre en `main`** (sin ramas). La red de seguridad es: un commit por paso, probar en local antes de subir, y saber volver atrás rápido (ver [0.4](#04-trabajar-siempre-en-main-sin-perderse) y [0.5](#05-cómo-se-ven-los-cambios-en-la-app-del-celular)).
- Prompt sugerido para cada sesión:

  > Leé `docs/PLAN_REESTRUCTURACION.md` y `AGENTS.md` (si existe). Ejecutá **solamente** el paso **X.Y**, trabajando en `main`. Respetá las "Reglas de ejecución" de la sección 0.2. Al terminar, corré `npm run check`, hacé **un commit (sin push)**, y contame qué cambiaste, qué riesgos ves y qué tengo que probar en el celular según la sección 7.

  Y cuando lo probaron y está bien: **"Pusheá."**

- Orden recomendado: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**. La Fase 7 (reglas para IA) se puede adelantar apenas termine la Fase 2, así las sesiones siguientes ya trabajan con reglas.

### 0.2 Reglas de ejecución (para la IA que ejecuta)

1. **Un paso por vez.** No mezcles pasos ni "aproveches" para arreglar otras cosas. Si ves algo raro fuera del alcance, anotalo al final de tu respuesta.
2. **Cero cambios de comportamiento en las fases de reestructuración (2, 3, 4, 6).** Primero **mover** código tal cual, después limpiar. Si un cambio altera lo que ve el usuario, frená y avisá.
3. **API retrocompatible.** Hay PWAs instaladas que pueden tener una versión vieja abierta. No cambies nombres ni forma de las acciones de `/api/progress` y `/api/friends`; si hace falta algo nuevo, agregalo sin romper lo viejo.
4. **Base de datos:** nunca borres columnas ni tablas; nunca ejecutes nada contra producción sin backup previo (ver 0.3). Toda modificación va como migración nueva (Fase 5.1).
5. **Antes de terminar cada paso:** `npm run lint`, `npm run typecheck`, `npm test` (cuando exista) y `npm run build` tienen que pasar. Listá qué flujos de la sección 7 hay que probar a mano.
6. **Git:** se trabaja directo en `main`. Antes de empezar, `git pull`. **Un commit por paso** (o por sub-paso lógico), con mensaje que diga el número de paso (ej. `Paso 1.2: guardar sin esperar la recarga completa`). **No hagas push** hasta que el humano lo pida. Nunca `git push --force`, nunca `git reset --hard` sobre commits ya subidos: para deshacer se usa `git revert` (ver 0.4).
7. Si una instrucción de este documento choca con lo que ves en el código (porque cambió), **priorizá no romper nada** y explicá la diferencia.

### 0.3 Backups

Antes de cualquier migración de base de datos: descargar un backup (Supabase Dashboard → Database → Backups, o `supabase db dump` con la Supabase CLI). Si el plan de Supabase es el gratuito, **no hay restauración a un punto en el tiempo**: el dump manual es obligatorio.

### 0.4 Trabajar siempre en `main` sin perderse

Cada push a `main` **se publica solo en la app real** (Vercel deploya `main` a producción). Por eso, sin ramas, el orden es:

1. **Antes de empezar:** `git pull` (para tener lo último del otro). **Nunca trabajen los dos al mismo tiempo sobre la app**: avísense "arranco yo" / "terminé y pusheé".
2. **Marcador antes de cada fase:** `git tag antes-fase-1 && git push --tags` (y así con cada fase). Es un "punto de guardado" con nombre: siempre saben a dónde volver sin acordarse de números de commit.
3. **La IA hace el paso y un commit local** (sin push).
4. **Prueban en local** en el celular (ver 0.5).
5. **Si está bien → push** → en 1–3 minutos está en la app.
6. **Si algo se rompió después del push**, dos formas de volver atrás:
   - **La más rápida (sin tocar el código):** Vercel → proyecto → Deployments → elegir el deploy anterior que andaba bien → **"Instant Rollback"**. La app vuelve a esa versión en segundos. Ojo: según el plan de Vercel puede que solo deje volver al deploy inmediatamente anterior, y mientras dure el rollback Vercel no publica los pushes nuevos (hay que deshacer el rollback desde el mismo panel cuando esté arreglado).
   - **La definitiva (en el código):** pedirle a la IA *"Revertí el último commit con `git revert` y pusheá"*. Eso crea un commit nuevo que deshace el anterior, sin borrar historia; Vercel publica la versión arreglada.
   - Para volver varios pasos: *"Revertí todos los commits desde el tag `antes-fase-3` con `git revert` y pusheá"*.
7. **Ojo con la base de datos:** volver atrás el código **no** deshace cambios en Supabase. Por eso las migraciones siempre son **aditivas** (agregar columnas/tablas/índices, nunca borrar ni renombrar): así el código viejo sigue funcionando con la base nueva y el revert es seguro.

### 0.5 Cómo se ven los cambios en la app del celular

La IA cambia archivos **en la Mac**. La app de Safari (la agregada a inicio) carga la versión que está publicada en Vercel. Entonces:

- **Mientras la IA trabaja, la app del celular NO cambia.** Recién cambia después del push.
- **Después del push:** Vercel tarda 1–3 minutos en publicar (se ve en Vercel → Deployments). La app ya detecta versiones nuevas sola: cada 2 minutos mientras está abierta y cada vez que se vuelve a abrir, se recarga y queda actualizada. **No hace falta volver a agregarla a inicio.** Si tarda, cerrarla del todo (deslizar hacia arriba) y abrirla de nuevo.
- **Condición:** la app instalada tiene que ser la **URL de producción** (la que publica `main`). Si en algún momento la agregaron a inicio desde una URL de preview de otra rama (las que tienen `-git-nombre-de-rama-` en la dirección), esa app **no** se actualiza con `main`: hay que borrarla y agregarla de nuevo desde la URL de producción (Vercel → proyecto → Domains).
- **Probar antes de subir (recomendado en cada paso):**
  1. En la Mac: `npm run dev`. En la terminal aparece una línea `Network: http://192.168.x.x:3000`.
  2. En el iPhone, **con el mismo Wi-Fi**, abrir esa dirección en Safari (no en la app instalada). Se ve la versión con los cambios nuevos.
  3. Limitaciones de esta prueba: el login con Google puede fallar (usar email y contraseña), y no funcionan las notificaciones ni la instalación como app (eso se prueba después del push). Si la página carga pero no responde a los toques, pedirle a la IA que agregue la IP de la Mac en `allowedDevOrigins` de `next.config.ts`.
  4. **Importante:** hoy el modo local usa **la misma base de datos real** (Supabase de producción). Lo que guarden probando queda guardado de verdad. Usen una cuenta de prueba o borren lo que carguen. (A futuro: proyecto Supabase de pruebas, Fase 5.1.)

---

## 1. Resumen ejecutivo

1. **Por qué guardar tarda varios segundos:** cada guardado hace ~4 viajes en cadena a Supabase y después **recarga todo** (`await loadData()`): otros ~6 viajes en cadena más **17 consultas con 5 años de historial completo** (`select *`), y recién ahí muestra "Guardado". Además, cada pedido **escribe** en `profiles` y consulta al servicio de auth de Supabase. Ver [3.1](#31-por-qué-guardar-tarda-varios-segundos).
2. **Arreglo de velocidad (Fase 1):** mostrar "Guardado" apenas responde el POST, actualizar la pantalla con la fila que devuelve el servidor (actualización optimista) y reconciliar en segundo plano. Sacar escrituras y viajes innecesarios del camino, traer menos datos, agregar índices y poner Vercel en la misma región que Supabase. Objetivo: **feedback < 100 ms y confirmación < 600 ms**.
3. **El problema estructural central:** `app/progress-client.tsx` tiene **3.855 líneas / 281 KB**, un solo componente con **~120 `useState`**, todas las secciones, todos los formularios y todos los cálculos. Cada tecla que se escribe re-renderiza y recalcula todo (incluidas estadísticas de hasta 730 días).
4. `app/globals.css` tiene **~2.060 líneas / 190 KB**, con 21 líneas de más de 1.000 caracteres, 39 `!important` y parches de estilo agregados al final que pisan reglas anteriores.
5. `app/api/progress/route.ts` es un `if` gigante con **43 acciones** en un archivo, con validaciones copiadas y pegadas.
6. **La fórmula del Daily Score está duplicada**: una vez en el cliente y otra en `app/api/notifications/dispatch/route.ts`. Los últimos commits ("Align notification Daily Score with…") son justamente el costo de mantener dos copias.
7. **El README describe otra app** (una plantilla de Cloudflare/"vinext"/login con ChatGPT). Eso **confunde a cualquier IA** que lo lea. Hay mucha basura de esa plantilla (Vite, Worker, D1, Drizzle, scripts) y nombres engañosos (`getChatGPTUser` es en realidad el login de Supabase).
8. **Riesgos serios encontrados:** (a) cualquiera puede activarse **Pro gratis** (acción `set_pro` y la tabla `profiles` es editable por su dueño); (b) los endpoints de IA no verifican Pro ni tienen límite de uso (costos de OpenAI); (c) Supabase devuelve **máximo 1000 filas por consulta** por defecto: el historial y las notificaciones se van a calcular con datos incompletos a medida que crezca el uso.
9. **Reglas para la IA de ahora en adelante:** `AGENTS.md` en la raíz (lo leen Codex, Cursor y otros), `CLAUDE.md` que lo importa, reglas de ESLint que **bloquean** archivos gigantes e imports cruzados, CI que corre en `main`, y una plantilla de PR. Contenido listo en la [sección 6](#6-contenido-propuesto-para-agentsmd).
10. **Tiendas:** no hace falta reescribir la app en Swift/Kotlin. Se "empaqueta" con **Capacitor** (misma base de código). Pero hay cambios obligatorios: pagos con compras dentro de la app (Apple/Google), login con Apple, borrar la cuenta desde la app, notificaciones nativas, política de privacidad y consentimiento para enviar datos a OpenAI. Ver [Fase 8](#fase-8--app-store-y-play-store).

---

## 2. Foto del estado actual

### 2.1 Stack real (lo que de verdad se usa)

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16.2 (App Router), React 19.2, TypeScript estricto |
| Estilos | Un solo `app/globals.css` (Tailwind 4 importado pero casi sin usar) |
| Base de datos y login | Supabase (Postgres + Auth + Storage), accedido **a mano por REST** (`app/lib/supabase-db.ts`), sin `supabase-js` |
| Sesión | Cookies httpOnly `avora_access_token` / `avora_refresh_token`; `proxy.ts` refresca el token |
| IA | OpenAI (transcripción + Responses API) en `app/api/voice-checkin`, `estimate-calories`, `diet-plan`, `diet-intake` |
| Notificaciones | Web Push (VAPID) + Supabase Cron (`pg_cron` + `pg_net`) que llama a `/api/notifications/dispatch` cada 5 minutos |
| Deploy | Vercel (sin `vercel.json`: las funciones corren en la región por defecto, `iad1` — Washington) |
| PWA | `public/manifest.webmanifest` + `public/sw.js` + recarga automática por versión |

### 2.2 Archivos más grandes

| Archivo | Tamaño | Comentario |
|---|---|---|
| `app/progress-client.tsx` | 3.855 líneas / 281 KB | Toda la app en un componente |
| `app/globals.css` | ~2.060 líneas / 190 KB | Todo el CSS, con parches superpuestos |
| `app/api/notifications/dispatch/route.ts` | 658 líneas | Copia de la fórmula del Daily Score |
| `app/api/progress/route.ts` | 440 líneas / 42 KB | 43 acciones en un `if` encadenado |
| `app/api/friends/route.ts` | 410 líneas | 21 acciones sociales |
| `supabase/friends.sql` | 435 líneas | Esquema social + funciones |

### 2.3 Estado de los chequeos hoy

- `npm run lint` → **falla con 3 errores** (`app/notification-settings.tsx:71`, `app/progress-client.tsx:~831`, `app/service-worker-registration.tsx:120`) y 4 warnings (variables sin usar: `saveNotifications`, `scoreDelta`, `selectedScorePoint`).
- `npm run typecheck` → en la máquina de Tommy falla porque `node_modules` está desactualizado (falta `web-push`). Se arregla con `npm ci`.
- Tests: existe `tests/logic.test.ts` (32 tests de lógica pura) **pero no hay script `test` en `package.json`** ni `tsx` instalado; nadie los corre.
- CI (`.github/workflows/ci.yml`) solo corre en pushes a la rama vieja `feat/vercel-supabase-migration` y en PRs. **No corre en `main`**, que es donde se trabaja.
- `.github/workflows/sync-early-adopters.yml` mergea `main` automáticamente en `feat/avora-ui-polish` en cada push. Confirmar si sigue siendo necesario (ver sección 8).

---

## 3. Diagnóstico

### 3.1 Por qué guardar tarda varios segundos

Recorrido real de un guardado (ej. "Agregar sesión de foco"):

| # | Dónde | Qué pasa | Viaje de red |
|---|---|---|---|
| 1 | Celular → Vercel | `POST /api/progress` | 1 (internet móvil) |
| 2 | `currentUser()` en `app/api/progress/route.ts:~71` | Consulta `GET /auth/v1/user` a Supabase para saber quién sos | 1 |
| 3 | `currentUser()` | **UPSERT en `profiles` en cada pedido** (una escritura para nada) | 1 |
| 4 | Acción | `owned()` → SELECT para comprobar que el proyecto es tuyo | 1 |
| 5 | Acción | INSERT | 1 |
| 6 | Cliente, `save()` en `app/progress-client.tsx:~1011` | **`await loadData()`**: espera la recarga completa antes de decir "Guardado" | — |
| 7 | Celular → Vercel | `GET /api/progress` | 1 (internet móvil) |
| 8–9 | `currentUser()` otra vez | auth + UPSERT de `profiles` otra vez | 2 |
| 10 | GET | SELECT `profiles` (secuencial) | 1 |
| 11 | GET | SELECT `training_disciplines` (secuencial) | 1 |
| 12 | GET | **17 SELECT en paralelo**, `select *`, **5 años de historial**, tablas sin índices por fecha, sin paginar | 1 (el más lento de los 17) |
| 13 | GET | UPDATE de `books` si detecta libros terminados (un GET que escribe) | 0–1 |
| 14 | Vercel → celular | JSON con todo el historial (incluye transcripciones y diarios de voz de años, que la UI nunca muestra) | descarga pesada |
| 15 | Celular | Re-render del componente de 3.855 líneas; recalcula estadísticas (año actual + anterior = hasta 730 cálculos de Daily Score) aunque estés en otra sección | CPU |
| 16 | Celular | **Recién acá aparece "Guardado"** | |

Además, como el score cambió, se disparan en cascada `POST /api/friends` (`publish_share`) y a veces `log_goal_progress` + `GET /api/friends` (que hace 3 tandas de consultas en cadena).

**Total: ~9–10 viajes en cadena Vercel↔Supabase + 2 idas y vueltas celular↔Vercel + descarga del historial + posible arranque en frío.** Si Supabase no está en la misma región que Vercel (`iad1`), cada viaje cuesta 100–150 ms: solo en latencia se van 1–2 segundos, antes de sumar consultas sin índice, el peso del JSON y el render.

### 3.2 Problemas de estructura (de mayor a menor impacto)

1. **`progress-client.tsx` monolítico.** Tipos, íconos, helpers de fechas, lógica de dieta, lógica del score, 18 `useEffect`, ~120 `useState`, 53 funciones internas y los paneles (`trainingPanel`, `sleepPanel`, `statsPanel`, `friendsPanel`, etc.) como variables JSX que **se construyen en cada render aunque no se muestren**. Cualquier cambio de una IA toca este archivo y arriesga romper otra sección.
2. **Estado mezclado.** Estado de servidor (`data`), estado de formularios de 12 features y estado de navegación viven juntos. Cada tecla en cualquier input re-renderiza toda la app.
3. **API "todo en uno".** `POST /api/progress` con `action` y 43 ramas; validaciones repetidas (la lista de categorías de eventos está copiada en `add_event` y `update_event`; `stringArray` está copiado en 4 archivos; los regex `DATE`/`MONTH`/`USERNAME` en varios).
4. **Daily Score duplicado** (cliente `progress-client.tsx:~1144–1345` y servidor `dispatch/route.ts:~211–335`).
5. **CSS global único** con clases globales, parches encimados ("AVORA: identidad blanca y verde oscuro" al final pisa reglas anteriores) y `!important`.
6. **Migraciones SQL sueltas** en `supabase/*.sql` para "pegar a mano en el SQL Editor", sin orden ni registro de cuáles se aplicaron.
7. **Restos de plantilla** que confunden a las IAs: `README.md`, `vite.config.ts`, `worker/`, `build/`, `db/`, `drizzle/`, `drizzle.config.ts`, `examples/`, `.openai/`, `scripts/`, `tests/rendered-html.test.mjs`, `public/{file,globe,window}.svg`, línea `cache=` de `.npmrc`.
8. **Nombres engañosos:** `app/chatgpt-auth.ts` / `getChatGPTUser()` / ruta `/signout-with-chatgpt` son el login de **Supabase**, no de ChatGPT.
9. **Código duplicado en el cliente:** la grabación de audio (MediaRecorder) está copiada dos veces (cierre por voz y dieta por voz).
10. **Código muerto:** acciones `complete_onboarding`, `toggle_gym`, `update_book_status` (el cliente no las usa); campo `gymDates`; tabla `gym_attendance`; función `saveNotifications`.
11. **Zona horaria fija** `America/Argentina/Buenos_Aires` en cliente (`argentinaDate`) y servidor (`today()`). Para tiendas internacionales hay que usar la zona del usuario.
12. **Identidad por email** (`user_email text` en todas las tablas, `profiles.email` como clave primaria) en lugar de `user_id uuid`. Si alguien cambia el email se "pierden" sus datos; y "Ocultar mi email" de Sign in with Apple genera emails de relay.
13. **Fechas guardadas como `text`** (`meal_date text`, etc.). Funciona porque `YYYY-MM-DD` ordena bien, pero no es ideal.

### 3.3 Bugs y riesgos latentes

| Riesgo | Dónde | Consecuencia | Fase |
|---|---|---|---|
| **Tope de 1000 filas** de Supabase ("Max rows", valor por defecto) | `GET /api/progress` (historial sin paginar) y `dispatch` (lee tablas **enteras de todos los usuarios** sin filtro de fecha) | Con ~3 comidas/día, en menos de un año `mealHistory` queda cortado: estadísticas anuales y rachas "mejor racha" dan mal. En `dispatch`, cuando la suma de todos los usuarios pase 1000 filas en una tabla, el Daily Score de la notificación se calcula con filas arbitrarias | 1.6 / 4.5 |
| **Pro gratis** | acción `set_pro` + política RLS `profiles_owner for all` (el usuario puede editar `pro_since` de su propia fila) | Cualquiera activa Pro sin pagar | 5.3 |
| **IA sin control** | `app/api/{voice-checkin,estimate-calories,diet-plan,diet-intake}` solo verifican login | Cualquier usuario logueado consume OpenAI sin límite, sea Pro o no | 5.4 |
| **Recarga automática** | `service-worker-registration.tsx` recarga la página si cambia la versión (chequeo cada 2 min) | Si hay un deploy mientras alguien escribe, pierde lo que estaba escribiendo | 1.9 |
| **GET que escribe** | `GET /api/progress` hace UPSERT de `profiles`, UPDATE de `books` y puede actualizar metadata de auth | Lento y con efectos secundarios en una lectura | 1.4 / 1.6 |
| Fórmula del score en dos lugares | cliente + `dispatch` | Notificación dice un número y la app otro | 4.4 |

---

## 4. Arquitectura objetivo

### 4.1 Principios

1. **Organizado por feature, no por tipo de archivo.** Todo lo de "Sueño" vive junto: UI, hooks, lógica, servidor, estilos.
2. **Capas con reglas claras:** `app/` (rutas finitas) → `features/` → `shared/` y `domain/` → `server/`. Las features no importan internos de otras features.
3. **La lógica de negocio es TypeScript puro** (`domain/`, `features/*/logic`), testeable, y **se comparte entre cliente y servidor** (el Daily Score existe una sola vez).
4. **Guardar es optimista:** la UI se actualiza al instante, el servidor confirma y devuelve la fila, la reconciliación completa ocurre en segundo plano.
5. **Preparado para tiendas desde ahora:** la UI no depende de Server Components ni de cookies para autenticarse; el acceso al dispositivo pasa por `platform/`.
6. **Archivos chicos:** ≤ 400 líneas por archivo, ≤ 250 por componente (lo hace cumplir ESLint, Fase 7).

### 4.2 Árbol de carpetas objetivo

```
/
├── AGENTS.md                  ← reglas para cualquier IA (sección 6)
├── CLAUDE.md                  ← contiene solo: @AGENTS.md
├── README.md                  ← qué es AVORA, cómo correrla, variables de entorno, deploy
├── docs/
│   ├── architecture.md        ← este mapa y el flujo de datos, mantenido al día
│   ├── decisions/             ← decisiones cortas (0001-capacitor.md, 0002-react-query.md…)
│   ├── notifications-setup.md
│   └── store-release.md       ← checklist de publicación (Fase 8)
├── app/                       ← SOLO rutas de Next. Cada archivo < 80 líneas, sin lógica de negocio
│   ├── layout.tsx
│   ├── page.tsx               ← decide login / onboarding / app y delega
│   ├── auth/callback/page.tsx, auth/reset-password/page.tsx, auth/signout/route.ts
│   ├── invite/[code]/route.ts
│   └── api/
│       ├── progress/route.ts  ← adaptador: sesión → registry de acciones → handler
│       ├── friends/route.ts   ← ídem
│       ├── notifications/{dispatch,preferences,subscribe}/route.ts
│       └── (resto de endpoints, finitos, delegando en features/*/server)
├── features/
│   ├── app-shell/             ← sidebar, barra móvil, topbar, menú de perfil, pull-to-refresh, navegación
│   ├── auth/                  ← AuthPanel, flujos de login
│   ├── onboarding/
│   ├── home/                  ← "Inicio": compone piezas públicas de otras features
│   ├── score/                 ← Daily Score (tarjeta, página, prioridades del mes)
│   ├── stats/
│   ├── training/
│   ├── nutrition/             ← comidas, estimación IA, calculadora, plan de dieta, calendario de calorías
│   ├── sleep/
│   ├── focus/
│   ├── reading/
│   ├── plan/                  ← agenda, calendario, tareas, eventos, plan del día, avisos (insights)
│   ├── goals/
│   ├── voice-checkin/         ← cierre del día por voz + resumen del día + revisión semanal
│   ├── friends/               ← amigos, invitaciones, grupos, objetivos de grupo
│   ├── pro/                   ← planes, paywall, candados (LockedFeature), estado Pro
│   ├── settings/              ← perfil, avatar, idioma, feedback
│   └── notifications/         ← NotificationSettings, registro del service worker, dispatch (server)
│
│   Cada feature tiene esta forma (solo las carpetas que necesite):
│   features/<feature>/
│   ├── components/            ← .tsx de UI (≤ 250 líneas c/u)
│   ├── hooks/                 ← useXxx: estado y datos de la feature
│   ├── logic/                 ← funciones puras + *.test.ts (sin React, sin fetch)
│   ├── server/                ← handlers de acciones, schemas zod, consultas (solo servidor)
│   ├── types.ts
│   ├── <feature>.css          ← estilos de la feature
│   └── index.ts               ← API pública: lo ÚNICO que otras features pueden importar
│
├── domain/                    ← reglas de negocio compartidas cliente/servidor (TS puro)
│   ├── score/                 ← score.ts (fórmula), day-records.ts (armar el día), tests
│   ├── dates.ts               ← zona horaria, weekFor, datePlus, datesBetween…
│   └── constants.ts           ← categorías, kinds, límites, regex de validación
├── shared/
│   ├── ui/                    ← Dropdown, DatePicker, TimeDropdown, Sheet/Modal, SaveButton, BrandMark, icons.tsx, TourOverlay
│   ├── hooks/                 ← useAudioRecorder, usePullToRefresh, useOutsideClick
│   ├── api/                   ← client.ts: apiGet/apiPost, readJson, reintentos, API_BASE_URL, token
│   ├── data/                  ← proveedor/queries de datos, applyPatch, useSaveAction
│   └── lib/                   ← format.ts, quotes.ts
├── server/                    ← infraestructura solo-servidor
│   ├── auth/                  ← session.ts (getSessionUser), cookies.ts, supabase-auth.ts
│   ├── db/                    ← postgrest.ts (hoy supabase-db.ts), admin.ts (service role)
│   └── http.ts                ← ok/fail, withRoute (manejo de errores), parseBody
├── platform/                  ← (Fase 8) adaptadores web/nativo: push, storage, share, haptics
├── styles/
│   ├── tokens.css             ← colores, tipografías, espaciados, radios, sombras
│   ├── base.css               ← reset y estilos de elementos
│   └── index.css              ← importa todo en orden
├── public/
├── supabase/
│   ├── migrations/            ← migraciones versionadas (Supabase CLI)
│   └── legacy/                ← los .sql viejos, solo como referencia histórica
└── tests/                     ← tests de integración (los unitarios van junto al código: *.test.ts)
```

> **Ojo:** `tsconfig.json` hoy solo incluye `app/**`, `proxy.ts` y `next.config.ts`. Al crear carpetas nuevas hay que **agregarlas al `include`** (o pasar a `"**/*.ts", "**/*.tsx"` una vez borrados los restos de la Fase 2). Si no, TypeScript no las chequea.

### 4.3 Flujo de datos objetivo

```
[Componente de feature]
   │  usa
   ▼
[hook de la feature]  ──lee──►  [shared/data: datos en caché (React Query)]
   │                                       ▲
   │ guardar                               │ applyPatch(fila devuelta) al instante
   ▼                                       │ + reconciliación silenciosa en 2º plano
[shared/api/client.ts] ── POST ──► [app/api/progress/route.ts]
                                         │ getSessionUser() (JWT verificado localmente, sin viaje extra)
                                         ▼
                                  [registry de acciones]
                                         │
                                         ▼
                           [features/<x>/server/actions.ts]
                             schema zod → 1 consulta (o 1 RPC) → devuelve filas
                                         │
                                         ▼
                                  [server/db → Supabase]
```

---

## 5. Plan de ejecución por fases

Formato de cada paso: **Qué**, **Cómo**, **Verificación**, **Riesgo**.

---

### Fase 0 — Red de seguridad (antes de tocar nada)

#### 0.1 Poner al día el entorno
- **Qué:** partir de la última versión.
- **Cómo:** `git checkout main && git pull && npm ci`.
- **Verificación:** `npm run typecheck` pasa (ya no falta `web-push`).

#### 0.2 Dejar el lint en verde
- **Qué:** arreglar los 3 errores y 4 warnings actuales (ver 2.3) **sin cambiar comportamiento**.
- **Cómo:** `prefer-const` en `service-worker-registration.tsx:120`; los dos `set-state-in-effect` de `notification-settings.tsx:71` y `progress-client.tsx:~831` (usar el patrón que ya usa el archivo: comentario `eslint-disable` puntual con explicación, o derivar el valor en vez de setearlo en el efecto si es trivial); borrar `saveNotifications`, `scoreDelta`, `selectedScorePoint` si realmente no se usan.
- **Verificación:** `npm run lint` sin errores.

#### 0.3 Script de tests y CI en `main`
- **Qué:** que los tests existentes corran siempre.
- **Cómo:**
  - `npm i -D tsx`.
  - En `package.json`: `"test": "node --import tsx --test \"tests/**/*.test.ts\" \"**/logic/**/*.test.ts\" \"domain/**/*.test.ts\""` (ajustar globs a lo que exista) y `"check": "npm run lint && npm run typecheck && npm test && npm run build"`.
  - En `.github/workflows/ci.yml`: disparar en cada `push` a `main`; agregar el paso `npm test`. Borrar el trigger de `feat/vercel-supabase-migration`. (Como se trabaja en `main`, el CI no bloquea el deploy: es un aviso. Si GitHub muestra ❌ en un commit, arreglarlo o revertirlo antes de seguir.)
- **Verificación:** `npm test` corre los 32 tests y pasan. El workflow corre en GitHub en el próximo push.

#### 0.4 Medir la línea de base de velocidad
- **Qué:** tener números antes/después para demostrar que mejoró.
- **Cómo:**
  - Agregar un header `Server-Timing` en `GET` y `POST` de `/api/progress` con los tiempos de: auth, cada consulta o tanda de consultas, total. (Ej.: `Server-Timing: auth;dur=180, profile;dur=120, queries;dur=640, total;dur=1100`.) Se ve en la pestaña Network del navegador.
  - Con una cuenta **con datos reales** (varias semanas de uso), medir en el celular (Safari → Web Inspector desde la Mac) o en Chrome DevTools con throttling "Fast 4G": duración del POST, duración del GET, tamaño del JSON del GET, tiempo hasta que aparece "Guardado".
  - Anotar los números en `docs/perf-baseline.md`.
- **Objetivos después de la Fase 1:** "Guardado" visible < 100 ms (optimista), POST confirmado < 600 ms (p50), carga inicial < 1,5 s en 4G, JSON inicial < 150 KB.

#### 0.5 Flujo de trabajo entre los dos
- Todo en `main`, siguiendo [0.4](#04-trabajar-siempre-en-main-sin-perderse): `git pull` → paso → commit → prueba local en el celular → push → verificar en la app.
- Crear el primer marcador ahora: `git tag antes-reestructuracion && git push --tags`.
- Uno trabaja por vez; al terminar, avisa al otro que pusheó.

---

### Fase 1 — Velocidad al guardar (quick wins)

Esta fase **no reestructura**: toca lo mínimo para que guardar sea rápido. Hacer los pasos en orden; cada uno mejora por sí solo.

#### 1.1 Misma región para Vercel y Supabase
- **Qué:** que cada viaje Vercel↔Supabase sea de pocos ms.
- **Cómo:** ver la región del proyecto en Supabase (Project Settings → General → Region). Configurar la región de funciones de Vercel igual: Project → Settings → Functions → Function Region, o `vercel.json` con `{ "regions": ["gru1"] }` si Supabase está en São Paulo (`sa-east-1`), `["iad1"]` si está en N. Virginia (`us-east-1`), etc.
- **Verificación:** comparar `Server-Timing` antes/después.
- **Riesgo:** nulo. **Requiere que un humano mire el dashboard** (sección 8).

#### 1.2 Guardar sin esperar la recarga completa (el cambio más importante)
- **Qué:** que "Guardado" aparezca apenas responde el POST, y que la pantalla se actualice con la fila devuelta.
- **Cómo, etapa A (rápida, bajo riesgo):** en `save()` de `progress-client.tsx` (~línea 1011) y en `sendSocial` (~1126):
  1. Después de un POST ok: `finishSaveFeedback(key, true)` **inmediatamente**.
  2. Reemplazar `await loadData()` por `scheduleRefresh()`: una recarga silenciosa **con debounce** (~800 ms) que agrupa varios guardados seguidos en una sola recarga.
  3. En `loadData`, agregar un **número de secuencia** (`loadSeqRef`) y descartar respuestas viejas, para que una recarga lenta no pise datos más nuevos.
  4. La recarga silenciosa no debe mostrar el esqueleto de carga ni el banner de error salvo que falle dos veces seguidas.
  5. **Cuidado con los tildados optimistas** (`pendingTasks`, `pendingEvents`, ~líneas 2034–2059): hoy se limpian después de `save()`. Con la etapa A se limpiarían antes de que lleguen los datos nuevos y la fila "saltaría" al estado viejo. Limpiarlos recién cuando termina la recarga que incluye el cambio (o, mejor, con la etapa B).
  6. Revisar cada llamada a `save(...)` (29 lugares) y `sendSocial(...)`: si alguna lee `data` justo después del `await` esperando el dato nuevo, adaptarla (en general no pasa: resetean formularios o cambian de pestaña).
- **Cómo, etapa B (optimista de verdad):** que el servidor devuelva lo que cambió y el cliente lo aplique al instante.
  - Contrato de respuesta: `{ ok: true, patch?: DataPatch }` con
    ```ts
    type DataPatch = {
      upsert?: Partial<Record<CollectionKey, Array<{ id: number } & Record<string, unknown>>>>; // filas nuevas o editadas
      remove?: Partial<Record<CollectionKey, number[]>>;                                         // ids borrados
      replace?: Partial<Pick<ProgressData, "dailyCheckin" | "dietPlan" | "priorities" | "profile">>;
    };
    ```
  - En el servidor, usar `returnRows: true` (`Prefer: return=representation`) para obtener la fila con el mismo formato que devuelve el GET, y armar el patch. Una acción puede tocar varias colecciones: `add_meal` → `meals` (si es de hoy) y `mealHistory`; `delete_book` → `books` + `readingLogs` + `readingHistory` + `notes` de ese libro.
  - En el cliente: `setData(current => applyPatch(current, result.patch))` antes de `finishSaveFeedback`. La recarga silenciosa de la etapa A queda como red de seguridad.
  - Priorizar las acciones más usadas: `add_meal`, `delete_meal`, `save_sleep`, `add_focus_session`, `toggle_task`, `toggle_event`, `add_task`, `update_task`, `schedule_task`, `add_event`, `update_event`, `delete_event`, `toggle_training`, `save_training`, `add_exercise`, `update_exercise`, `delete_exercise`, `set_training_quality`, `set_plan_training_quality`, `set_pages`, `add_goal`, `toggle_goal`, `delete_goal`. Las complejas (`apply_voice_checkin`, `delete_discipline`) pueden quedarse solo con la recarga silenciosa.
  - **Compatibilidad:** `patch` es un campo nuevo y opcional; clientes viejos lo ignoran.
- **Verificación:** con la red en "Fast 4G", "Guardado" aparece en < 100–600 ms y el dato se ve enseguida. Probar dos guardados rápidos seguidos (no debe "volver atrás" nada). Checklist de la sección 7 para las acciones tocadas.
- **Riesgo:** medio (estado del cliente). Hacerlo con commits por grupo de acciones.

#### 1.3 No preguntarle a Supabase "quién soy" en cada pedido
- **Qué:** `getChatGPTUser()` (`app/chatgpt-auth.ts`) hace `GET /auth/v1/user` en cada request. Verificar el JWT **localmente**.
- **Cómo:**
  - Requisito: el proyecto de Supabase debe usar **JWT Signing Keys asimétricas** (Dashboard → Project Settings → JWT Keys). Si todavía usa el secreto HS256 "legacy", migrar desde ese panel (un humano, sección 8) o, como alternativa, verificar con el secreto en una variable `SUPABASE_JWT_SECRET`.
  - `npm i jose` y:
    ```ts
    import { createRemoteJWKSet, jwtVerify } from "jose";
    const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)); // se cachea en memoria
    const { payload } = await jwtVerify(token, JWKS, { issuer: `${SUPABASE_URL}/auth/v1`, audience: "authenticated" });
    // payload.email, payload.sub, payload.user_metadata
    ```
  - Mantener la misma forma de retorno (`displayName`, `email`, `onboardingCompleted`, `mainGoals`, `usagePreferences`) leyendo `user_metadata` del token. La metadata puede estar hasta ~1 h desactualizada, lo cual es aceptable porque la fuente de verdad es la tabla `profiles` (así ya lo hace `page.tsx`).
  - Envolver con `cache()` de React para que `page.tsx` no la calcule dos veces por request.
  - La seguridad no cambia: PostgREST sigue validando el token en cada consulta.
- **Verificación:** login, logout, sesión vencida (esperar o forzar vencimiento: debe refrescar vía `proxy.ts` o pedir login), `Server-Timing` sin el tramo `auth` de red.
- **Riesgo:** medio (autenticación). Probar bien con cuentas de Google y de email.

#### 1.4 Sacar la escritura de `profiles` de cada pedido
- **Qué:** `currentUser()` en `app/api/progress/route.ts` (y `profileForCurrentUser()` en `app/api/settings/route.ts`) hace un UPSERT en `profiles` en **cada** request.
- **Cómo:** crear `ensureProfile(user)` y llamarlo solo (a) donde se crea la sesión: `app/api/auth/password/route.ts`, `app/api/auth/session/route.ts`; y (b) en el GET de progreso **solo si** el SELECT de `profiles` no encontró fila. Quitar el upsert de `currentUser()`.
- **Verificación:** cuenta nueva (email y Google) → onboarding funciona; cuenta existente → todo igual.
- **Riesgo:** bajo.

#### 1.5 Menos viajes en cada acción
- **Qué:** varias acciones hacen consultas en cadena que sobran.
- **Cómo:**
  - **Borrar/editar por `id` + `userEmail`** ya está protegido por el filtro y por RLS: el `owned()` previo sobra en `toggle_task`, `toggle_event`, `update_task` (la parte de la tarea), `set_training_quality` (hacer el UPDATE filtrando por `userEmail + disciplineId + trainingDate` con `returnRows: true`; si vuelven 0 filas → "Marcá el entrenamiento primero."). Para responder 404 usar la cantidad de filas devueltas.
  - **Chequeos de "padre propio"** (`projectId`, `disciplineId`, `bookId` en inserts) **sí hacen falta** hasta la Fase 5.5 (claves foráneas compuestas). Mientras tanto, cuando haya más de una consulta independiente, correrlas con `Promise.all`.
  - `delete_book`: hoy borra `reading_logs`, `book_notes` y `books` en 3 viajes; las FK ya tienen `on delete cascade`: alcanza con borrar el libro.
  - `apply_voice_checkin`: inserta comidas y entrenamientos **de a uno en un `for`**; `insertRows` acepta arrays: un solo insert por tabla.
  - `set_pages` (versión nueva): 5 consultas en cadena. Dejarlo para una función RPC en la Fase 4.3.
- **Verificación:** checklist de la sección 7 para cada acción tocada.
- **Riesgo:** bajo-medio.

#### 1.6 Adelgazar el `GET /api/progress`
- **Qué:** menos consultas en cadena, menos columnas, nada de escrituras.
- **Cómo:**
  1. **Paralelizar:** `profiles`, `training_disciplines` y el resto en un solo `Promise.all`. Crear las disciplinas por defecto solo si vino vacío (caso raro).
  2. **Sin escrituras en el GET:** sacar el UPDATE de libros terminados (reemplazarlo por una migración única: `update books set status = 'read' where status = 'reading' and total_pages > 0 and current_page >= total_pages;` — `set_pages` ya marca "leído" al guardar) y sacar la sincronización de metadata de auth (se hace en onboarding/settings).
  3. **Consultas duplicadas:** `meals` de hoy ⊂ `mealHistory`; `reading_logs` de hoy ⊂ `readingHistory`; `monthly_priorities` del mes ⊂ `priorityHistory`. Derivarlos en el servidor de la consulta grande (3 consultas menos). Mantener las mismas claves en la respuesta (compatibilidad).
  4. **Columnas:** agregar a `selectRows` una opción `columns` (hoy es siempre `select=*`). Verificado en el código:
     - `daily_checkins` del historial: la UI **nunca** muestra `transcript`, `journal`, `voice_summary`, `habits_json`, `workout_detail`, `study_detail` del historial. Pedir solo `id, entry_date, sleep_minutes, sleep_quality, bedtime, wake_time` para el historial y la fila completa solo para `dailyCheckin` (hoy).
     - `mealHistory`: los cálculos usan `mealDate` y `calories`; `name`/`detail` solo se muestran para hoy/ayer (`mealEntryMeals`). Pedir `id, meal_date, calories` para el historial + filas completas de los últimos 2 días.
     - `exerciseLogs`: hoy trae **todos** los ejercicios de la historia; la UI solo muestra los del entrenamiento seleccionado. Limitar a los `training_logs` del rango visible o cargarlos al abrir una sesión.
     - `tasks` y `calendar_events`: hoy sin límite de fecha. Aplicar el mismo límite de 5 años que el resto (no cambia resultados dentro de ese rango).
  5. **Tope de 1000 filas:** revisar en Supabase (Project Settings → API → Max rows) el valor actual. Como parche inmediato, subirlo (p. ej. 10000). La solución real es la Fase 4.5 (agregados por día en el servidor en lugar de filas crudas de 5 años).
- **Verificación:** comparar el JSON antes/después **para la misma cuenta**: las claves y los valores que usa la UI deben coincidir (se puede hacer un script que compare las dos respuestas ignorando las columnas quitadas). Estadísticas semanal/mensual/anual, rachas y Daily Score de días pasados idénticos.
- **Riesgo:** medio. Es donde es más fácil romper una estadística sin darse cuenta: comparar números antes/después.

#### 1.7 Índices en la base de datos
- **Qué:** que las consultas por usuario + fecha no recorran tablas enteras.
- **Cómo:** migración con el SQL del [Apéndice 9.1](#91-sql-de-índices-fase-17). Después, mirar Supabase → Advisors (Performance / Index Advisor) y sumar lo que sugiera.
- **Verificación:** `Server-Timing` del tramo de consultas baja; `explain analyze` de una consulta de historial usa el índice.
- **Riesgo:** bajo (solo agrega índices).

#### 1.8 Cortar la cascada social después de guardar
- **Qué:** el efecto que publica el score a amigos (`publish_share`, ~línea 1463) y el de objetivos automáticos de grupo (`log_goal_progress` + `loadSocial`, ~línea 1499) se disparan con cada cambio de score.
- **Cómo:** debounce de ~3 s para `publish_share`; en `log_goal_progress`, mandar todos los valores en **un solo POST** (acción nueva `log_goal_progress_batch`, manteniendo la vieja) y no recargar todo el círculo después (aplicar el cambio localmente).
- **Riesgo:** bajo.

#### 1.9 Evitar cálculos y recargas innecesarias en el celular
- **Qué:** reducir el trabajo de cada render mientras llega la Fase 3.
- **Cómo:**
  - Calcular el bloque de estadísticas (`statsWindow`… `scoreAverageY`, ~líneas 2695–2760) **solo si `section === "stats"`** (o `"score"` si la página del score lo usa).
  - Memoizar `scoreForDate` con un `Map` que se reinicia cuando cambia `data` o las prioridades.
  - En `service-worker-registration.tsx`: si hay versión nueva, **no recargar mientras la app está visible**; recargar al volver a abrirla (`visibilitychange` → visible) o mostrar un aviso "Hay una versión nueva — tocá para actualizar".
- **Riesgo:** bajo.

---

### Fase 2 — Limpieza de restos y nombres engañosos

En `main`, con el marcador `antes-fase-2`, un commit por punto. **Antes de borrar cada cosa, verificar con búsqueda que nada la importa.**

1. **Borrar restos de la plantilla "vinext/Sites/Cloudflare":** `vite.config.ts`, `worker/`, `build/`, `db/`, `drizzle/`, `drizzle.config.ts`, `examples/`, `.openai/`, `scripts/install-ci.sh`, `scripts/sites-env.sh`, `scripts/build-verified.sh`, `tests/rendered-html.test.mjs`, `public/file.svg`, `public/globe.svg`, `public/window.svg`, la línea `cache=.sites-runtime/npm-cache` de `.npmrc`, `.vercel-redeploy`. Revisar `public/og.png` (641 KB): no está referenciado; o se usa en `openGraph.images` o se borra.
2. **Reescribir `README.md`** desde cero: qué es AVORA, stack real (2.1), cómo correrla (`npm ci`, `.env.local` a partir de `.env.example`, `npm run dev`), variables de entorno (incluidas las de notificaciones: `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*`, `CRON_SECRET`), cómo se deploya, dónde están las reglas (`AGENTS.md`) y el mapa (`docs/architecture.md`). **Este punto es crítico: el README actual le miente a cualquier IA.**
3. **Renombrar el login:** `app/chatgpt-auth.ts` → `server/auth/session.ts`; `getChatGPTUser` → `getSessionUser`; `updateChatGPTUserMetadata` → `updateAuthMetadata`; `ChatGPTUser` → `SessionUser`; `chatGPTSignInPath`/`chatGPTSignOutPath` → `signInPath`/`signOutPath`. Crear `app/auth/signout/route.ts` y dejar `/signout-with-chatgpt` como **redirección** a la nueva (compatibilidad con PWAs abiertas).
4. **Código muerto:** acciones `complete_onboarding` (el onboarding real es `app/api/onboarding/route.ts`), `toggle_gym`, `update_book_status`; campo `gymDates` en GET y en el tipo del cliente; función `saveNotifications` si no se usa. Documentar (no borrar todavía) la tabla `gym_attendance`.
5. **`app/new-user-preview.tsx` (`/?demo=new-user`):** preguntar si se sigue usando (sección 8). Si no, borrar.
6. **`.env.example`:** completar con todas las variables que usa el código (buscar `process.env.`).
7. **Verificación:** `npm run check` verde, app funcionando igual (sección 7, recorrido rápido).

---

### Fase 3 — Frontend: partir `progress-client.tsx`

**Técnica:** "estrangular" el archivo de a poco. Cada paso extrae **una** pieza a su lugar definitivo, **copiándola tal cual** (mover, no reescribir), y el archivo viejo pasa a importarla. Un commit por extracción, prueba local en el celular (0.5) y push antes de pasar a la siguiente: así, si algo se rompe, se revierte solo esa extracción. El archivo va encogiendo hasta ser solo el `AppShell`.

Ver la tabla completa de "de dónde → a dónde" en el [Apéndice 9.2](#92-mapa-de-dónde--a-dónde-frontend).

#### 3.1 Extraer primero lo puro (sin riesgo)
- Tipos (líneas ~25–106) → `features/*/types.ts` (cada tipo a su feature; los que usan varias → `shared/data/types.ts`).
- Íconos SVG (~110–148) → `shared/ui/icons.tsx`.
- Helpers de fechas (`argentinaDate`, `argentinaMinutes`, `weekFor`, `shiftMonthStart`, `lastDayOfMonth`, `statsWindowFor`, `datesBetween`, `datePlus`, `dateMinus`, `dayDistance`, `weekdayLabel`, `formatDate`, `goalDeadline`, `normalizeClock`, `sleepDuration`, ~224–355) → `domain/dates.ts` (la zona horaria como parámetro con default Argentina).
- Helpers de dieta (`dietNumberDraftsFrom`, `parseDietNumber`, `estimateTargetCalories`, `parseDietPlan`, `DIET_NUMBER_LIMITS`), `preparePhoto` → `features/nutrition/logic/`.
- `normalizedPlanText`, `planDisciplineIdFor` → `domain/score/` (también los usa `dispatch`).
- Agregar tests para lo que se mueva a `domain/`.

#### 3.2 Extraer la derivación del Daily Score a una función pura (y testearla)
- **Qué:** el bloque de ~1144–1345 (`uniqueFocusSessions`, `completedPlanTasks`, `effectiveTrainingLogs`, `effectiveFocusByProjectDate`, `trainingByDate`, `trainingScoreByDate`, `focusByDate`, `readingByDate`, `caloriesByDay`, `mealCountByDate`, `sleepMinutesByDate`, `sleepQualityByDate`, `completionDates`, `dayRecordFor`, `scoreForDate`) es la lógica más valiosa y más frágil.
- **Cómo:** moverlo **idéntico** a `domain/score/day-series.ts` como `buildDaySeries(input)` + `dayRecordFor(series, date)`, y un hook `features/score/hooks/useDaySeries.ts` que lo memoiza. Antes de conectar, escribir **tests de caracterización**: un fixture JSON con datos realistas (entrenamientos con y sin calidad, bloques de plan vinculados y no vinculados, foco manual + tareas completadas del mismo proyecto el mismo día, sueño con calidad, etc.) y el score esperado día por día **calculado con el código actual**.
- **Verificación:** los tests pasan con el código viejo y con el nuevo; los Daily Score de Inicio, página del score y Estadísticas no cambian.

#### 3.3 Capa de datos: `shared/data`
- **Qué:** sacar `loadData`, `save`, `readJson`, `beginSaveFeedback`/`finishSaveFeedback`, `applyPatch` del componente.
- **Cómo (recomendado):** adoptar **TanStack Query** (React Query):
  - `useProgressQuery(today)` → `queryKey: ["progress", today]`, mismo `GET /api/progress`.
  - `useSaveAction()` → `useMutation` que hace el POST, aplica el `patch` con `queryClient.setQueryData` y hace `invalidateQueries` en segundo plano (reemplaza lo hecho a mano en 1.2).
  - `useSaveFeedback(key)` para el estado "Guardando…/Guardado" de cada botón.
  - `shared/api/client.ts`: `apiGet`, `apiPost` con `readJson`, reintentos para 408/425/429/5xx, y una constante `API_BASE_URL` (hoy vacía = mismo origen; en la app nativa será la URL de Vercel).
  - Alternativa sin librería: un `ProgressDataProvider` con Context que exponga lo mismo. Funciona, pero React Query ya resuelve deduplicación, reintentos, caché y actualizaciones optimistas, y las IAs lo conocen muy bien.
- **Verificación:** todo igual que después de la Fase 1.

#### 3.4 Extraer UI compartida y hooks genéricos
- `SaveButtonContent`, `LockedFeature` → `shared/ui/` (LockedFeature puede ir a `features/pro/components`).
- `app/dropdown.tsx`, `date-picker.tsx`, `time-dropdown.tsx`, `tour-overlay.tsx`, `brand-mark.tsx` → `shared/ui/`.
- Los overlays repetidos (`voice-overlay`, `block-action-overlay`, `delete-book-overlay`: todos "fondo + diálogo que se cierra tocando afuera") → un `shared/ui/Sheet.tsx`.
- La grabación de audio **duplicada** (`startVoiceRecording` ~1811 y `startDietRecording` ~1955) → `shared/hooks/useAudioRecorder.ts` con `{ start, stop, recording, seconds }` y los límites de tamaño/tiempo como parámetros.
- Pull-to-refresh (~1052–1125) → `shared/hooks/usePullToRefresh.ts`.
- Menú de perfil que se cierra tocando afuera (~837) → `shared/hooks/useOutsideClick.ts`.

#### 3.5 Extraer cada sección a su feature (una por PR)
- **Orden sugerido (de menos a más acoplada):** quote/frase del día → `pro` (proPanel + checkoutDialog) → `settings` (settingsDialog, feedbackDialog, avatar) → `sleep` → `reading` → `nutrition` → `focus` → `goals` → `training` → `plan` (agenda semanal, calendario mensual, plan del día, insights) → `voice-checkin` → `stats` → `score` → `home` → `friends` → `onboarding` → `app-shell`.
- **Para cada una:**
  1. Crear `features/<x>/components/<X>Section.tsx` y mover el JSX del panel.
  2. **Mover también los `useState` y handlers que solo usa esa sección** (ver [Apéndice 9.3](#93-a-qué-feature-pertenece-cada-usestate)). Los formularios quedan locales a la feature: así escribir en un input deja de re-renderizar toda la app.
  3. Leer datos con los hooks de `shared/data` y de `features/score` (nada de pasar 30 props).
  4. La navegación entre secciones (`openSection`, `openArea`, `openPro`) → un `NavigationContext` en `features/app-shell`.
  5. En el archivo viejo: `{section === "sleep" && <SleepSection />}`.
- **Cuidado con el orden de los hooks:** hoy hay hooks declarados en medio del archivo (por ejemplo `useMemo` de `trainingWeek` y `useId` de `scoreGradientId`) antes del `return` temprano del onboarding (~3658). Al mover, cada hook va al componente que lo usa; nunca quedar un hook después de un `return` condicional.
- **Verificación por sección:** su bloque de la checklist (sección 7) en el celular + escritorio.

#### 3.6 (Opcional, recomendado antes de la Fase 8) Una ruta por sección
- Pasar de `section` en estado a rutas: `/inicio`, `/fisico`, `/foco`, `/sueno`, `/plan`, `/estadisticas`, `/score`, `/amigos`, `/pro` con un `layout.tsx` compartido que contiene el `AppShell` y el proveedor de datos.
- Ventajas: cada sección carga solo su JavaScript, el botón "atrás" funciona, y las notificaciones pueden abrir la sección exacta (hoy abren `/`). Es la base para los "deep links" de la app nativa.
- Mantener `/` funcionando (redirige a `/inicio`).

---

### Fase 4 — Backend: API por feature, validación y Daily Score único

#### 4.1 Infraestructura de servidor
- `app/lib/supabase-db.ts` → `server/db/postgrest.ts` (agregar `columns`, paginación por rango y `count`).
- `adminRequest` de `dispatch/route.ts` → `server/db/admin.ts` (cliente con service role, **solo** servidor).
- `server/http.ts`: `ok`, `fail`, `withRoute(handler)` (try/catch + log + mapeo de errores transitorios a 503, hoy copiado en varias rutas), `parseBody(schema)`.
- `server/auth/session.ts`: `getSessionUser(request?)` que acepte **cookie o `Authorization: Bearer <token>`** (necesario para la app nativa, Fase 8).
- `domain/constants.ts`: regex (`DATE`, `MONTH`, `TIME`, `USERNAME`), listas de categorías de eventos, kinds de disciplinas, estados de libros, límites (máximos de minutos, páginas, calorías…). Hoy están copiados en cliente y servidor.

#### 4.2 Registry de acciones
- **Qué:** que `app/api/progress/route.ts` quede en ~40 líneas.
- **Cómo:**
  ```ts
  // features/sleep/server/actions.ts
  export const sleepActions = {
    save_sleep: defineAction(saveSleepSchema, async ({ email, input }) => { /* 1 upsert */ return { patch }; }),
  };
  // app/api/progress/route.ts
  const registry = { ...trainingActions, ...sleepActions, ...nutritionActions, /* … */ };
  export const POST = withRoute(async (request) => {
    const user = await getSessionUser(request); if (!user) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json(); const action = registry[body.action];
    if (!action) return fail("Acción desconocida.");
    return ok(await action.run({ email: user.email, input: action.schema.parse(body) }));
  });
  ```
- Validación con **zod** (`npm i zod`): un schema por acción en `features/<x>/server/schemas.ts`, reproduciendo **exactamente** los límites actuales (clamps, longitudes máximas, valores permitidos). Los tipos del input salen del schema.
- Mismo nombre de acción, mismo formato de body, mismos mensajes de error → compatibilidad total.
- Lo mismo para `app/api/friends/route.ts` → `features/friends/server/{invites,groups,goals,shares}.ts`.

#### 4.3 Operaciones de varios pasos → funciones de Postgres (RPC)
- `set_pages`, `toggle_training` (chequea detalles antes de borrar), `apply_voice_checkin`, `delete_discipline` (validar que quede al menos una) hacen varias consultas en cadena y no son atómicas. Pasarlas a funciones `security invoker` (respetan RLS) en migraciones y llamarlas con `callRpc`: **1 viaje y todo-o-nada**.
- La lectura social (`readSocial` en `friends/route.ts`, 3 tandas en cadena) → una RPC `avora_social_snapshot()` que devuelva todo en un JSON.

#### 4.4 Daily Score: una sola implementación
- La fórmula ya está en `app/lib/score.ts` (bien). Lo duplicado es **armar el "día"** (`DayRecord`): cliente en 3.2 y servidor en `dispatch/route.ts:~211–335` (`dailyScoreForDate`).
- Hacer que `dispatch` use `domain/score/day-series.ts` con un adaptador que convierta las filas snake_case del admin a la misma forma que usa el cliente. **Test obligatorio:** mismo fixture → mismo score en cliente y servidor.
- De acá en adelante, cualquier cambio de fórmula se hace en un solo lugar (regla de `AGENTS.md`).

#### 4.5 Notificaciones y datos históricos que escalen
- `dispatch` hoy lee **todas** las filas de 12 tablas de **todos** los usuarios cada 5 minutos (y el tope de 1000 filas las corta). Filtrar por fecha (solo ayer/hoy/mañana, cubre todas las zonas horarias) y solo usuarios con push activo; paginar.
- Partir `dispatch/route.ts` en `features/notifications/server/{dispatch.ts, delivery.ts, candidates/calendar.ts, candidates/summary.ts, candidates/daily-score.ts}`.
- **Historial para estadísticas:** en vez de mandar 5 años de filas crudas al celular, una RPC/vista `avora_daily_totals(from, to)` que devuelva **un registro por día** (minutos de foco, páginas, calorías, cantidad de comidas, minutos de sueño, entrenamientos…). El GET inicial trae solo lo reciente (p. ej. 60 días de filas crudas) y Estadísticas pide totales por día del período que se mira. **Validar con los tests de 3.2 que las rachas ("mejor racha") y el anual den igual.**
- Opcional (más adelante): tabla `daily_scores(user_id, date, score, factors jsonb)` recalculada en el servidor al guardar. La usan Inicio, Estadísticas, amigos (`friend_shares`) y notificaciones, y el cliente deja de publicar su score.

#### 4.6 Rutas de IA
- `features/voice-checkin/server`, `features/nutrition/server` para `voice-checkin`, `estimate-calories`, `diet-plan`, `diet-intake`.
- Un único `server/ai/openai.ts` (cliente, modelo configurable por variable de entorno, timeouts, manejo de errores). Hoy el nombre del modelo está escrito a mano en 3 archivos.

---

### Fase 5 — Base de datos y seguridad

#### 5.1 Migraciones versionadas
- Instalar la Supabase CLI. `supabase init` (si hace falta) y `supabase db pull` para generar una **migración base** con el esquema real de producción.
- Mover los `.sql` actuales a `supabase/legacy/` (referencia histórica, con una nota de que ya están aplicados).
- De acá en adelante: `supabase migration new <nombre>` → editar → probar en el proyecto Supabase de pruebas → aplicar. **Nunca más pegar SQL suelto en el editor sin archivo de migración.**
- Recomendado: un segundo proyecto Supabase de **pruebas** (el plan gratuito permite dos proyectos), para probar migraciones y para que `npm run dev` no escriba en los datos reales (configurándolo en `.env.local`).
- Generar tipos: `supabase gen types typescript` → `server/db/database.types.ts`, y usarlos en vez de `Record<string, unknown>`.

#### 5.2 Índices
- Si no se hizo en 1.7, aplicar el [Apéndice 9.1](#91-sql-de-índices-fase-17) como migración.

#### 5.3 Pro no se puede auto-asignar (obligatorio antes de cobrar)
- Sacar `set_pro` del cliente (dejarlo solo si `process.env.ENABLE_FAKE_PRO === "true"` para la demo, nunca en producción real).
- Quitar al rol `authenticated` el permiso de modificar `pro_since` (permisos por columna: `revoke update on public.profiles from authenticated; grant update (display_name, username, avatar_url, focus_daily_target_minutes, main_goals_json, usage_preferences_json, onboarding_completed, updated_at) on public.profiles to authenticated;` — ajustar a las columnas reales).
- A futuro, Pro se decide solo en el servidor a partir de una tabla `entitlements` que escribe el webhook de pagos (Fase 8.5).

#### 5.4 IA con control
- En cada endpoint de IA: verificar Pro **en el servidor** y un límite diario por usuario (tabla `ai_usage(user_email, day, kind, count)` o un rate limiter). Devolver un error claro si se supera.

#### 5.5 Integridad de datos
- Claves foráneas compuestas para que la base garantice que un registro solo apunta a padres del mismo usuario (ej. `unique (id, user_email)` en `focus_projects` + FK `(project_id, user_email)` en `focus_sessions` y `tasks`; ídem disciplinas y libros). Con eso se pueden borrar los chequeos `owned()` de inserts (1.5).
- Revisar que todas las tablas tengan RLS activo (Supabase → Advisors → Security).

#### 5.6 `user_id` en lugar de email (antes de la Fase 8)
- **Por qué:** el email puede cambiar; Sign in with Apple puede dar un email de relay; hoy `profiles.email` es clave primaria y todas las tablas se vinculan por email.
- **Cómo (en varias migraciones, sin cortar el servicio):** agregar `user_id uuid` a cada tabla → completar desde `auth.users` por email → índices → políticas RLS nuevas con `auth.uid()` (manteniendo las viejas mientras dure la transición) → cambiar el código para escribir y filtrar por `user_id` → cuando todo use `user_id`, dejar el email solo como dato.
- **Riesgo:** alto. Hacerlo con backup, primero en el proyecto Supabase de pruebas, y con la app en un estado estable.

#### 5.7 (Opcional) Fechas como `date`
- Convertir columnas `*_date text` a `date`. Bajo beneficio inmediato; hacerlo solo si se hace la 5.6 (ya se tocan todas las tablas).

---

### Fase 6 — CSS

Hacerlo **después** de la Fase 3 (así cada feature ya tiene su carpeta). El riesgo del CSS es el **orden**: hoy reglas del final pisan a las del principio.

1. **Partir sin cambiar el orden:** cortar `globals.css` en archivos por bloque temático respetando el orden actual, e importarlos todos, en ese mismo orden, desde `styles/index.css` (importado en `layout.tsx`). Las líneas de más de 1.000 caracteres se formatean (una declaración por línea) con Prettier/Stylelint — solo formato.
2. **Verificación visual:** capturas de pantalla de cada sección en ancho de celular (375 px) y escritorio, antes y después (Playwright, o a mano). Deben ser idénticas.
3. **Tokens:** extraer colores, tipografías, radios, sombras y espaciados a variables en `styles/tokens.css` (`--color-primary`, `--radius-card`, …) y reemplazar los valores sueltos.
4. **Consolidar parches:** donde una regla posterior pisa a una anterior (p. ej. el bloque "identidad blanca y verde oscuro"), fusionarlas en una sola y borrar la vieja. Eliminar los `!important` uno por uno, verificando visualmente.
5. **Mover a cada feature:** cada bloque temático pasa a `features/<x>/<x>.css` importado por el componente de la sección (o a CSS Modules `*.module.css` si quieren evitar choques de nombres de clase; es más trabajo pero más seguro a futuro). Mantener en `styles/` solo tokens, base y utilidades globales.
6. Decidir sobre Tailwind: hoy está importado pero casi no se usa. O se adopta en serio para lo nuevo, o se saca. Recomendación: **sacarlo** y usar CSS por feature con tokens (consistente con lo que ya existe).

---

### Fase 7 — Reglas permanentes para que la IA construya ordenado

El objetivo es que **cualquier IA** que abra el repo (Codex, Cursor, Claude Code, Copilot…) entienda la estructura y la respete, y que si no la respeta, **el CI lo frene**.

1. **`AGENTS.md` en la raíz** con el contenido de la [sección 6](#6-contenido-propuesto-para-agentsmd). Es el estándar que leen Codex, Cursor y otros agentes.
2. **`CLAUDE.md`** con una sola línea: `@AGENTS.md` (Claude Code importa el archivo). Si usan Cursor: `.cursor/rules/avora.mdc` con `alwaysApply: true` y "Seguí AGENTS.md en la raíz del repo".
3. **`docs/architecture.md`:** el árbol de 4.2, el flujo de 4.3 y la lista de features con una línea de qué hace cada una. Actualizarlo en el mismo commit en que se agrega una feature.
4. **ESLint que hace cumplir las reglas** (en `eslint.config.mjs`):
   ```js
   {
     files: ["**/*.{ts,tsx}"],
     rules: {
       "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
       "no-restricted-imports": ["error", { patterns: [
         { group: ["@/features/*/*", "@/features/*/*/**"], message: "Importá otra feature solo desde su index.ts (@/features/<nombre>)." },
         { group: ["@/server/*", "@/server/**"], message: "server/ es solo para código de servidor (app/api y features/*/server)." },
       ] }],
     },
   },
   // Excepciones TEMPORALES mientras dure la Fase 3; borrarlas al terminar:
   { files: ["app/progress-client.tsx"], rules: { "max-lines": "off" } },
   ```
   Ajustar el segundo patrón para que `app/api/**` y `features/*/server/**` sí puedan importar `@/server`. Para componentes, además, `max-lines-per-function` (~250) como advertencia.
5. **Checklist antes de cada push** (está dentro de `AGENTS.md`, "Antes de terminar"): ¿respeta AGENTS.md? ¿archivos < 400 líneas? ¿migración si cambió la base? ¿tests de lógica nueva? ¿probado en el celular en local? ¿`docs/architecture.md` actualizado?
6. **Plantilla de feature:** `features/_template/` con la estructura vacía y comentarios de qué va en cada archivo (la IA la copia al crear una feature nueva).
7. **CI** (Fase 0.3) corriendo `lint + typecheck + test + build` en cada push a `main`.

---

### Fase 8 — App Store y Play Store

#### 8.0 "Traducir" la app: qué significa y qué opción elegir

No hay que reescribir la app en Swift (iOS) ni en Kotlin (Android). Hay dos caminos:

| | **Capacitor (recomendado)** | **React Native / Expo** |
|---|---|---|
| Qué es | Envuelve la app web actual en una app nativa (WebView) con acceso a funciones del teléfono por plugins | App nativa real con componentes nativos |
| Reuso de código | ~90%: se reusa toda la UI, CSS y lógica | Solo la lógica pura (`domain/`, `features/*/logic`); **toda la UI y el CSS se reescriben** |
| Esfuerzo | Semanas | Meses |
| Sensación | Muy buena si la web está bien optimizada (por eso importan las Fases 1–3) | La mejor |
| Riesgo con Apple | Si es "solo un sitio web empaquetado" Apple lo rechaza (regla 4.2): hay que sumar funciones nativas (push, compras, compartir, vibración) y empaquetar la UI dentro de la app | Bajo |

**Recomendación:** Capacitor ahora. La reestructuración (lógica pura separada en `domain/`) deja abierta la puerta a React Native más adelante si alguna vez hace falta.

La versión web/PWA **sigue existiendo** con el mismo código: tiendas y web conviven.

#### 8.1 Prerrequisitos de código (hacerlos durante las Fases 3–5)
1. **La UI no depende del servidor de Next para arrancar.** Hoy `app/page.tsx` es un Server Component que lee cookies y consulta `profiles`. En la app nativa no hay servidor de Next: el arranque tiene que poder hacerse del lado del cliente (pedir `/api/me` o usar la sesión local).
2. **Autenticación por token, no solo por cookie.** Desde la app nativa, las cookies hacia el dominio de Vercel no son confiables (son "de terceros" para el WebView). `shared/api/client.ts` manda `Authorization: Bearer <access_token>` y `server/auth/session.ts` lo acepta (4.1). En el cliente nativo, la sesión se maneja con `@supabase/supabase-js` guardando el token en almacenamiento seguro del dispositivo, con refresh automático.
3. **CORS** en `app/api/**` para los orígenes de la app nativa (`capacitor://localhost` en iOS, `https://localhost` en Android).
4. **`API_BASE_URL`** configurable: vacío en web, `https://<dominio>` en la app nativa.
5. **`platform/`**: interfaz única para push, almacenamiento, compartir y vibración, con implementación web (la actual) y nativa (plugins de Capacitor). Las features usan `platform/`, nunca `window.navigator` ni plugins directamente.
6. **Rutas por sección** (3.6) para deep links y notificaciones que abran la pantalla correcta.
7. **Zona horaria del usuario** en lugar de Argentina fija (`domain/dates.ts`), si se va a publicar fuera de Argentina.

#### 8.2 Empaquetado con Capacitor
- `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` y `npx cap init` (nombre "AVORA", bundle id tipo `com.avora.app` — decidir, sección 8).
- **La UI va empaquetada dentro de la app** (build estático); la API sigue en Vercel.
  - Next tiene exportación estática (`output: "export"`), pero **no puede exportar las rutas de API ni `proxy.ts`**. Hay que tener un build "web" (normal, en Vercel, con API) y un build "nativo" (solo UI). Opciones: (a) un `next.config.ts` que según `BUILD_TARGET=native` active `output: "export"` y excluya las rutas de API (por ejemplo con `pageExtensions`), o (b) monorepo con `apps/web` (Next completo) y `apps/native` (solo UI) compartiendo `features/`, `shared/`, `domain/`. Empezar por (a); validar contra la documentación vigente de Next al momento de hacerlo.
  - `next/image` con `images.unoptimized: true` en el build nativo (ya usan `unoptimized`).
- **Alternativa rápida solo para pruebas internas:** `server.url` apuntando a la web de Vercel (la app carga el sitio). Sirve para TestFlight/prueba interna rápida, pero **no se recomienda para la revisión de Apple** (riesgo 4.2, pantalla en blanco sin internet).
- En la app nativa: **desactivar** el service worker, la recarga automática por versión y el Web Push (se reemplazan por los mecanismos nativos).
- Íconos y splash: PNG de 1024×1024 → `@capacitor/assets` genera todos los tamaños (hoy el manifest solo tiene un SVG; iOS además necesita `apple-touch-icon` PNG incluso para la PWA).
- Ajustes nativos: barra de estado, áreas seguras (ya usan `viewport-fit=cover`), teclado, botón "atrás" de Android, pantalla sin conexión, vibración en acciones clave, hoja de compartir nativa para links de invitación (`@capacitor/share`).

#### 8.3 Notificaciones nativas
- Web Push **no funciona dentro de la app nativa**. Usar `@capacitor/push-notifications` con Firebase Cloud Messaging (Android) y APNs (iOS, a través de FCM subiendo la clave APNs a Firebase).
- Tabla nueva `push_devices(user_id, platform, token, updated_at)`; `features/notifications/server/delivery.ts` envía por Web Push **o** FCM según el dispositivo. La lógica de "qué avisar y cuándo" (candidates) no cambia.
- Al tocar una notificación, abrir la ruta de la sección (3.6).

#### 8.4 Login en la app nativa
- **Google:** Google bloquea su login dentro de WebViews. Usar el SDK nativo (plugin de Google Sign-In para Capacitor) y `supabase.auth.signInWithIdToken({ provider: "google", token })`.
- **Sign in with Apple: obligatorio en iOS** porque la app ofrece login con Google (regla 4.8 de Apple). Plugin nativo + `signInWithIdToken({ provider: "apple" })`. Tener en cuenta los emails de relay (motivo de la 5.6).
- Email/contraseña: sigue igual. Los links de confirmación y "olvidé mi contraseña" deben abrir la app (Universal Links en iOS con `apple-app-site-association`, App Links en Android con `assetlinks.json`) o resolverse en la web.
- Links de invitación (`/invite/[code]`): mismos Universal/App Links para que abran la app si está instalada.

#### 8.5 Pagos (obligatorio para cobrar Pro)
- **Apple y Google exigen sus propios sistemas de pago** para suscripciones digitales dentro de la app (Apple regla 3.1.1; Google Play Billing). La "simulación de compra" actual (`simulatePayment`) **tiene que desaparecer**: Apple rechaza flujos de pago falsos.
- Recomendado: **RevenueCat** (`@revenuecat/purchases-capacitor`): unifica App Store y Play Store, maneja pruebas gratis, renovaciones y restauración.
  - Productos: mensual y anual (hoy la UI ya tiene `checkoutPlan: "monthly" | "annual"`).
  - Webhook de RevenueCat → `app/api/billing/webhook/route.ts` → tabla `entitlements(user_id, product, active_until, source)` → `isPro` se calcula **en el servidor** (5.3).
  - Botón **"Restaurar compras"** obligatorio.
  - Para la web, si quieren vender también ahí: Stripe (RevenueCat lo soporta) — se puede dejar para después.

#### 8.6 Requisitos de las tiendas (checklist)
- **Borrar la cuenta desde la app** (Apple 5.1.1(v) y Google Play): endpoint `DELETE /api/account` que borra el usuario de Auth y todos sus datos (con service role), más una URL web para pedirlo. Hoy **no existe**.
- **Política de privacidad y términos** publicados en una URL, enlazados en la app y en las fichas de las tiendas. Hoy **no existen**.
- **IA de terceros:** Apple exige avisar claramente y pedir **permiso explícito** antes de enviar datos personales a una IA de terceros (regla 5.1.2(i)). Antes de mandar audio, fotos o datos de dieta a OpenAI: pantalla de consentimiento (una vez, revocable en Configuración). Declararlo también en las etiquetas de privacidad.
- **Etiquetas de privacidad** (App Store "App Privacy") y **Data safety** (Google Play): declarar datos de salud/estado físico (sueño, peso, calorías), audio, fotos, email, identificadores, y que se procesan con OpenAI.
- **Salud y dieta:** aviso visible de que el plan de dieta y las estimaciones de calorías **no reemplazan consejo médico o nutricional**; evitar afirmaciones médicas (Apple 1.4.1).
- **Permisos con texto explicativo:** micrófono (`NSMicrophoneUsageDescription`), cámara y fotos (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`), notificaciones. En Android: `RECORD_AUDIO`, cámara, `POST_NOTIFICATIONS`.
- **Privacy manifest de Apple** (`PrivacyInfo.xcprivacy`) declarando las APIs de "motivo requerido" que use la app y sus plugins.
- **Cuenta de prueba para la revisión** de Apple/Google (con Pro activo o compras en sandbox) y notas explicando cómo probar cada función.
- **Clasificación por edad** (cuestionarios de ambas tiendas).
- **Idioma:** la ficha y la app en los mismos idiomas. Hoy la app es solo español (Configuración muestra "English: próximamente"). Si quieren inglés al lanzar: extraer textos a diccionarios (`shared/i18n/es.ts`, `en.ts`) — conviene hacerlo **durante la Fase 3**, feature por feature, si la decisión es lanzar con inglés (sección 8).

#### 8.7 Cuentas, tiempos y proceso
- **Apple Developer Program:** USD 99/año. Si se registran como empresa necesitan número D-U-N-S. Publicación vía App Store Connect; pruebas con **TestFlight**. Necesitan Mac con Xcode (ya tienen Mac).
- **Google Play Console:** USD 25 una vez. **Las cuentas personales nuevas deben hacer una prueba cerrada con al menos 12 testers durante 14 días seguidos antes de poder publicar en producción**: empezar esto temprano. Target SDK: el que exija Play en ese momento.
- Firmas: Play App Signing (Google guarda la clave) y certificados/perfiles de Apple (Xcode los maneja con "Automatically manage signing").
- Versionado: `versionName`/`versionCode` (Android) y `CFBundleShortVersionString`/`CFBundleVersion` (iOS), subir en cada envío.
- Opcional: automatizar builds con Fastlane, Codemagic o Ionic Appflow.
- Actualizaciones: los cambios de UI llegan con cada versión publicada en las tiendas (o con "live updates" tipo Capgo/Appflow, respetando las reglas de Apple: no cambiar el propósito de la app ni agregar funciones que eviten la revisión).

#### 8.8 Orden sugerido para la Fase 8
1. Prerrequisitos 8.1 (durante Fases 3–5) + 5.3 + 5.6.
2. Privacidad, términos, borrado de cuenta, consentimiento de IA (8.6).
3. Capacitor con la UI empaquetada (8.2) → correr en simuladores.
4. Login nativo (8.4) → push nativo (8.3) → pagos (8.5).
5. TestFlight + prueba cerrada de Google (arrancar los 14 días lo antes posible).
6. Fichas de las tiendas, capturas, cuenta de prueba → enviar a revisión.

Crear `docs/store-release.md` con esta checklist y mantenerla actualizada.

---

## 6. Contenido propuesto para `AGENTS.md`

> La IA ejecutora debe crear `AGENTS.md` en la raíz con este contenido (ajustándolo a la estructura real una vez terminada la Fase 3), y `CLAUDE.md` con la línea `@AGENTS.md`.

````markdown
# AGENTS.md — Cómo trabajar en AVORA

Este archivo lo leen todas las IAs que trabajan en el repo (Codex, Cursor, Claude Code…). Es la fuente de verdad sobre **cómo** se escribe código acá. Si un pedido contradice estas reglas, preguntá antes de hacerlo.

## Qué es AVORA
App de progreso personal (PWA hoy; iOS/Android con Capacitor después): entrenamiento, alimentación, sueño, foco (estudio/trabajo), lectura, plan/agenda, objetivos, Daily Score, amigos y grupos, y funciones con IA (cierre del día por voz, calorías por foto, plan de dieta).
Stack: Next.js (App Router) + React + TypeScript estricto + Supabase (Postgres/Auth/Storage) + OpenAI + Web Push. Deploy en Vercel. UI en español rioplatense.

## Comandos
- `npm run dev` — desarrollo
- `npm run check` — lint + typecheck + tests + build. **Tiene que pasar antes de dar por terminada cualquier tarea.**

## Dónde va cada cosa
- `app/` — SOLO rutas (páginas y `api/**/route.ts`). Finitas: autentican, validan y delegan. Nada de lógica de negocio.
- `features/<feature>/` — todo lo de una funcionalidad: `components/`, `hooks/`, `logic/` (puro + tests), `server/` (acciones, schemas zod, consultas), `types.ts`, `<feature>.css`, `index.ts` (API pública).
- `domain/` — reglas de negocio compartidas por cliente y servidor (Daily Score, fechas, constantes). TypeScript puro.
- `shared/` — UI genérica (`ui/`), hooks genéricos (`hooks/`), cliente HTTP (`api/`), capa de datos (`data/`), utilidades (`lib/`).
- `server/` — infraestructura de servidor: sesión, acceso a base de datos, helpers HTTP.
- `platform/` — acceso al dispositivo (push, almacenamiento, compartir, vibración) con versión web y nativa.
- `styles/` — tokens y estilos base. `supabase/migrations/` — cambios de base de datos.
- Mapa completo y flujo de datos: `docs/architecture.md`.

## Reglas duras
1. **Tamaño:** ningún archivo de más de 400 líneas; componentes de hasta 250. Si tenés que tocar un archivo que ya pasa el límite, primero extraé la parte que vas a cambiar a un archivo nuevo en su lugar correcto.
2. **Una feature, una carpeta.** No agregues UI, lógica ni estilos de una feature en archivos de otra o en archivos compartidos.
3. **Imports entre features solo por su `index.ts`** (`@/features/sleep`). Si dos features necesitan lo mismo: UI/hook genérico → `shared/`; regla de negocio → `domain/`.
4. **Lógica pura separada:** cálculos, fechas, validaciones y el score van en `logic/` o `domain/`, sin React ni fetch, con tests `*.test.ts` al lado.
5. **Daily Score único:** la fórmula y el armado del día viven solo en `domain/score`. Cliente, notificaciones y amigos lo usan. Prohibido copiarlo o reimplementarlo.
6. **Datos en el cliente:** nunca `fetch` directo; usá `shared/api` y los hooks de `shared/data`. Guardar = actualización optimista + reconciliación en segundo plano. **Prohibido recargar todos los datos y esperar esa recarga para mostrar "Guardado".**
7. **Acciones de servidor:** schema zod + handler en `features/<x>/server/` + registro en el registry de la ruta. El handler hace el mínimo de consultas (una, o una RPC), devuelve las filas afectadas como `patch`, y valida todo. Nunca confiar en el cliente para Pro, pagos o permisos.
8. **Base de datos:** todo cambio de esquema es una migración nueva en `supabase/migrations/` (Supabase CLI), con RLS y con índices para las columnas por las que se filtra. Nunca editar una migración ya aplicada. Nunca `select *` de historial: columnas necesarias + rango de fechas.
9. **Estilos:** el CSS de una feature va en su carpeta y usa los tokens de `styles/tokens.css`. Sin `!important`, sin colores ni tamaños sueltos, sin agregar a los estilos globales.
10. **Compatibilidad:** no cambies el nombre ni la forma de una acción o endpoint existente; hay apps instaladas con versiones anteriores. Agregá, no rompas.
11. **Listo para tiendas:** la UI no depende de Server Components ni de cookies para autenticarse; el dispositivo se usa solo vía `platform/`.
12. **Textos:** UI en español rioplatense con voseo ("Registrá", "Elegí"). Nombres de código en inglés. Comentarios en español explicando el porqué, no el qué.
13. **Secretos:** nunca en el código. Variable nueva → `.env.example` + README.
14. **Nada de restos:** sin código muerto, sin `console.log` de debug, sin archivos `v2`, `nuevo`, `old`, `copy`.
15. **Git:** se trabaja directo en `main` (no crees ramas). `git pull` antes de empezar. Un commit por tarea con mensaje claro. **No hagas push** salvo que el humano lo pida (cada push se publica en la app real). Nunca `git push --force` ni `git reset --hard` sobre commits subidos: para deshacer, `git revert`. Los cambios de base de datos son siempre aditivos, para que revertir el código sea seguro.

## Receta: agregar una feature nueva
1. Copiá `features/_template/` a `features/<nombre>/`.
2. Tipos en `types.ts`; lógica pura en `logic/` con tests.
3. Si necesita datos nuevos: migración (tabla con `user_id`/RLS/índices) → acciones en `server/` (zod + handler que devuelve `patch`) → registro en la ruta de API → extender la respuesta de lectura solo con las columnas necesarias.
4. UI en `components/` (componentes chicos), estado en `hooks/`, estilos en `<nombre>.css`.
5. Exportá lo público en `index.ts` y montá la sección en `features/app-shell` (o su ruta).
6. Actualizá `docs/architecture.md` y sumá sus flujos a la checklist de regresión.

## Receta: agregar una acción de guardado
schema zod (con los mismos límites de siempre) → handler (1 consulta/RPC, devuelve filas) → registro en el registry → `useSaveAction` en el hook de la feature con actualización optimista → probar doble guardado rápido y error de red.

## Receta: cambiar la base de datos
`supabase migration new <nombre>` → SQL con RLS + índices → probar en el proyecto de pruebas → backup de producción → aplicar → regenerar tipos (`supabase gen types`).

## Antes de terminar (definition of done)
- `npm run check` en verde.
- Ningún archivo nuevo o tocado supera los límites.
- Tests para lógica nueva o modificada.
- Probado en local desde el celular con `npm run dev` (flujo principal + guardado + recarga).
- Un commit con el número de paso en el mensaje. **Sin push** hasta que un humano lo pida.
- `docs/architecture.md` y `.env.example` actualizados si corresponde.
- En tu respuesta: qué cambiaste, qué probaste y qué tiene que probar un humano.

## Qué NO hacer
- Agregar código a `progress-client.tsx` (mientras exista) o a archivos gigantes.
- Duplicar lógica "porque es más rápido".
- Hacer cambios de base de datos sin migración.
- Mezclar refactor y cambios de comportamiento en el mismo commit.
- Instalar dependencias nuevas sin justificarlo en la respuesta.
````

---

## 7. Checklist de regresión manual

Probar **primero en local** (Safari del celular apuntando a la Mac, ver [0.5](#05-cómo-se-ven-los-cambios-en-la-app-del-celular)) y en escritorio; **después del push**, repasar en la app instalada lo que no se puede probar en local (instalación, notificaciones, login con Google). Después de cada guardado: el dato aparece enseguida, "Guardado" se ve rápido, y **al recargar la página el dato sigue ahí**.

**Acceso**
- [ ] Registro con email (confirmación), login con email, login con Google, "olvidé mi contraseña" y cambio de contraseña, cerrar sesión.
- [ ] Link de invitación abierto sin sesión → login → queda la amistad hecha. Abierto con sesión → aviso correcto.

**Onboarding**
- [ ] Nombre, nombre de usuario (disponible / en uso / formato inválido), 1 a 3 prioridades, resumen semanal, entrar → tour guiado.

**Inicio**
- [ ] Daily Score, métricas según prioridades, frase del día, ajustes de notificaciones compactos.
- [ ] Plan del día: tildar tarea/evento (respuesta instantánea), sugerencias de los avisos que reprograman tareas.
- [ ] Botón "Grabar mi día" (Pro / candado sin Pro).

**Físico → Entrenamiento**
- [ ] Agregar disciplina, cambiar importancia, borrar disciplina (debe quedar al menos una).
- [ ] Marcar/desmarcar día (bloqueo si tiene detalles), valorar calidad.
- [ ] Gimnasio: agregar, editar y borrar ejercicio. Running/ciclismo/natación: duración y distancia (ritmo).
- [ ] Meta semanal, navegar semanas, Daily Score histórico al elegir una fecha pasada.

**Físico → Comidas**
- [ ] Estimación con IA por texto y por foto (Pro), guardar estimación, borrar comida, "cargar ayer".
- [ ] Calculadora rápida de calorías, plan de dieta con IA (generar/guardar), detalles por audio, calendario de calorías.

**Foco**
- [ ] Crear materia/proyecto (estudio y trabajo), sumar sesión (dos veces el mismo día suma), objetivo diario de foco.

**Sueño**
- [ ] Hora de acostarse/levantarse, calidad, cargar ayer, barras de la semana.

**Lectura**
- [ ] Agregar libro con sugerencias y sin ellas (portada), descubrir libros y agregar a "quiero leer".
- [ ] Actualizar página actual (hoy y ayer), terminar libro → pasa a "leídos", notas, borrar libro.

**Plan**
- [ ] Agenda semanal: crear bloque desde un hueco (foco, entrenamiento vinculado a disciplina, etc.), editar con toque largo, borrar, completar, valorar entrenamiento del plan.
- [ ] Calendario mensual, eventos con cuenta regresiva, objetivos: crear, completar, borrar.

**Daily Score / Estadísticas**
- [ ] Cambiar prioridades del mes. Estadísticas semanal/mensual/anual, navegar períodos anteriores, rachas, tendencias, gráfico del score. **Los números deben ser iguales antes y después de cada cambio.**

**Amigos**
- [ ] Invitar por usuario y por link, aceptar/rechazar/revocar, eliminar amigo, ver score y racha de amigos.
- [ ] Grupos: crear (con objetivo e invitaciones), unirse por código, aceptar/rechazar invitación, editar, salir, borrar; objetivos manuales y automáticos (se actualizan solos al registrar datos).

**Pro y configuración**
- [ ] Planes, compra (hoy simulada), cancelar. Candados abren/cierran según Pro.
- [ ] Nombre, usuario, foto de perfil, notificaciones (activar, desactivar, horarios), idioma, enviar feedback.

**PWA y notificaciones**
- [ ] Agregar a inicio en Safari, abrir como app, recibir una notificación (aviso del Daily Score, recordatorio de calendario, resumen), tocarla y que abra la app.
- [ ] Deploy nuevo mientras la app está abierta: no pierde lo que se está escribiendo (después de 1.9).

**Cierre por voz**
- [ ] Grabar, revisar lo interpretado, confirmar → los datos aparecen en cada sección y **no se borra nada que el audio no mencionó**.

---

## 8. Decisiones abiertas para los humanos

La IA ejecutora debe **preguntar** estas cosas en vez de suponerlas:

1. **Región de Supabase** (Project Settings → General) y plan de Vercel → para el paso 1.1.
2. **JWT Signing Keys** en Supabase: ¿el proyecto ya usa claves asimétricas? (Project Settings → JWT Keys) → paso 1.3.
3. **"Max rows"** configurado en Supabase (Project Settings → API) → paso 1.6.
4. ¿Sigue haciendo falta el modo demo `/?demo=new-user`? → Fase 2.
5. ¿Sigue haciendo falta el workflow que mergea `main` en `feat/avora-ui-polish`? ¿Qué ramas viejas se pueden borrar (`feat/supabase-auth`, `lifetrack-mejoras`, `preview/tommy-latest`, …)?
6. Confirmar que Vercel publica `main` en producción y que la app que tienen instalada en el celular es la **URL de producción** (no una de preview de otra rama). Ver 0.5.
7. ¿Adoptar TanStack Query y zod? (recomendado) → Fases 3.3 y 4.2.
8. ¿Lanzar en tiendas solo en español o también en inglés? → define si se extraen textos durante la Fase 3.
9. Nombre legal/empresa para las cuentas de desarrollador, bundle id (`com.avora.app`?), precios de Pro mensual/anual.
10. ¿Vender Pro también en la web (Stripe) o solo en las tiendas?
11. ¿Crear un proyecto Supabase de pruebas para desarrollo local y migraciones?

---

## 9. Apéndices

### 9.1 SQL de índices (Fase 1.7)

Aplicar como migración. Son todos aditivos (`if not exists`). Algunas tablas ya tienen índices por sus `unique` (`daily_checkins`, `monthly_priorities`, `focus_projects`, `training_disciplines`), por eso no aparecen.

```sql
create index if not exists meals_user_date_idx            on public.meals (user_email, meal_date);
create index if not exists training_logs_user_date_idx    on public.training_logs (user_email, training_date);
create index if not exists reading_logs_user_date_idx     on public.reading_logs (user_email, log_date);
create index if not exists focus_sessions_user_date_idx   on public.focus_sessions (user_email, session_date);
create index if not exists calendar_events_user_date_idx  on public.calendar_events (user_email, event_date, event_time);
create index if not exists tasks_user_due_idx             on public.tasks (user_email, due_date);
create index if not exists goals_user_idx                 on public.goals (user_email, target_date);
create index if not exists books_user_idx                 on public.books (user_email, created_at desc);
create index if not exists book_notes_user_idx            on public.book_notes (user_email, created_at desc);
create index if not exists exercise_logs_training_log_idx on public.exercise_logs (training_log_id);
create index if not exists exercise_logs_user_idx         on public.exercise_logs (user_email, created_at desc);
-- Revisar también las tablas sociales y de notificaciones (group_members por user_email y group_id,
-- friend_shares por user_email, push_subscriptions por user_email) según lo que sugiera
-- Supabase → Advisors → Index Advisor.
```

### 9.2 Mapa "de dónde → a dónde" (frontend)

Líneas aproximadas de `app/progress-client.tsx` en `origin/main @ 21f11a8`.

| Hoy | Destino |
|---|---|
| Tipos (~25–106) | `features/*/types.ts` (compartidos → `shared/data/types.ts`) |
| Íconos SVG (~110–148) | `shared/ui/icons.tsx` |
| Constantes de etiquetas/opciones (~149–222) | `features/*/constants.ts` o `domain/constants.ts` |
| Helpers de fechas (~224–355) | `domain/dates.ts` |
| Meta semanal de entrenamiento en `localStorage` (~238–254) | `features/training/hooks/useTrainingWeeklyTarget.ts` |
| Helpers de dieta y `preparePhoto` (~71–85, ~400–455) | `features/nutrition/logic/` |
| `planDisciplineIdFor`, `normalizedPlanText` (~367–399) | `domain/score/` |
| `SaveButtonContent`, `LockedFeature` (~458, ~511) | `shared/ui/` / `features/pro/components/` |
| `DistanceSessionForm`, `TrainingQualityBar` (~473–510) | `features/training/components/` |
| `SavedBookCover`, `CatalogBookCover` (~523–537) | `features/reading/components/` |
| `readJson`, `loadData`, `save`, feedback de guardado (~545, ~855–1030) | `shared/api/client.ts`, `shared/data/` |
| `loadSocial`, `sendSocial`, efectos sociales (~1036, ~1126, ~1440–1520) | `features/friends/hooks/` |
| Pull-to-refresh (~1052–1125) | `shared/hooks/usePullToRefresh.ts` |
| Series por fecha + `dayRecordFor` + `scoreForDate` (~1144–1345) | `domain/score/day-series.ts` + `features/score/hooks/useDaySeries.ts` |
| Prioridades y textos de prioridad (~1344–1360) | `features/score/` |
| Plan del día, huecos, rachas, insights (~1385–1580) | `features/plan/hooks/`, `features/home/` |
| Handlers de configuración, feedback, avatar (~1616–1720) | `features/settings/hooks/` |
| Handlers de libros (~1722–1790) | `features/reading/hooks/` |
| Grabación de voz del cierre (~1792–1860) | `shared/hooks/useAudioRecorder.ts` + `features/voice-checkin/` |
| Comidas, estimación IA, dieta y audio de dieta (~1863–1995) | `features/nutrition/hooks/` (+ `useAudioRecorder`) |
| Pro: `simulatePayment`, `cancelPro` (~2005–2015) | `features/pro/` |
| `toggleTask`, `toggleEvent` optimistas (~2034–2060) | `features/plan/hooks/` |
| `scoreCard`, `compactScoreCard` (~2061–2085) | `features/score/components/` |
| `compactVoiceButton`, `voiceRecorder`, `dayClosePanel`, `weeklyReviewPanel` (~2086, ~2146, ~2439, ~2474) | `features/voice-checkin/components/` |
| `areaMetrics` / `heroMetrics` (~2100–2145) | `features/home/components/` |
| `trainingPanel` (~2169) | `features/training/components/TrainingSection.tsx` |
| `sleepPanel` (~2244) | `features/sleep/components/SleepSection.tsx` |
| `focusPanel` (~2288) | `features/focus/components/FocusSection.tsx` |
| `dayPlanPanel`, `insightsPanel` (~2333, ~2405) | `features/plan/components/` |
| `quotePanel` (~2494) | `features/home/components/` |
| `weekAgendaPanel`, `monthCalendarPanel`, `calendarPanel` (~2555–2694) | `features/plan/components/` |
| Cálculos de estadísticas + `statsPanel` (~2695–2913) | `features/stats/` |
| `mealsPanel`, `dietQuickPanel`, `dietPlannerPanel`, `calorieCalendarPanel` (~2914–2973) | `features/nutrition/components/` |
| `booksPanel` (~2974) | `features/reading/components/ReadingSection.tsx` |
| `goalsPanel` (~3026) | `features/goals/components/` |
| `proPanel`, `checkoutDialog` (~3044, ~3107) | `features/pro/components/` |
| `settingsDialog`, `feedbackDialog` (~3137, ~3182) | `features/settings/components/` |
| Funciones de amigos y grupos + `friendsPanel` (~3200–3657) | `features/friends/` |
| Onboarding (~3658–3708) | `features/onboarding/` |
| Menú de perfil, sidebar, topbar, barra móvil, overlays, `return` (~3709–3855) | `features/app-shell/` |
| `app/notification-settings.tsx`, `app/service-worker-registration.tsx` | `features/notifications/components/` |
| `app/auth-panel.tsx` | `features/auth/components/` |
| `app/dropdown.tsx`, `date-picker.tsx`, `time-dropdown.tsx`, `tour-overlay.tsx`, `brand-mark.tsx` | `shared/ui/` |
| `app/lib/score.ts` | `domain/score/score.ts` |
| `app/lib/streaks.ts`, `schedule.ts`, `insights.ts`, `review.ts`, `reading.ts` | `features/{score,plan,voice-checkin,reading}/logic/` (o `domain/` si los usa el servidor) |
| `app/lib/social.ts` | `features/friends/logic/` + `features/friends/types.ts` |
| `app/lib/format.ts`, `quotes.ts` | `shared/lib/` |
| `app/lib/supabase-db.ts`, `supabase-auth.ts`, `auth-cookies.ts`, `app/chatgpt-auth.ts` | `server/db/`, `server/auth/` |
| `app/globals.css` | `styles/` + `features/*/*.css` (Fase 6) |

### 9.3 A qué feature pertenece cada `useState`

| Feature | Estados (hoy en `progress-client.tsx`) |
|---|---|
| app-shell | `today`, `section`, `tourActive`, `profileMenuOpen`, `loading`, `error`, `saving`, `saveFeedback`, `refreshVersion`, `pullDistance`, `pullRefreshing`, `nowMinutes` (este también lo usa plan) |
| onboarding | `onboardingStep`, `onboardingName`, `onboardingUsername`, `onboardingGoals`, `onboardingPreferences`, `usernameCheck` |
| settings | `settingsOpen`, `settingsView`, `settingsName`, `settingsUsername`, `weeklySummary`, `avatarUploading`, `feedbackOpen`, `feedbackType`, `feedbackSection`, `feedbackMessage`, `feedbackSent` |
| score / stats | `priorityDraft`, `statsPeriod`, `statsOffset`, `selectedScorePointKey` |
| training | `selectedDisciplineId`, `trainingDate`, `editingExerciseId`, `trainingWeekAnchor`, `physicalTab` (compartido con navegación) |
| sleep | `sleepEntryDate`, `sleepBedtime`, `sleepWaketime`, `sleepQuality` |
| focus | `focusEntryDate`, `focusTab`, `focusHours` |
| reading | `readingEntryDate`, `bookTab`, `selectedBookId`, `bookToDelete`, `bookShelfPage`, `pagesInput`, `note`, `bookForm`, `bookDraft`, `bookSuggestions`, `bookSuggestLoading`, `bookMatching`, `bookSuggestionOpen`, `discoverQuery`, `discoverLanguage`, `discoverResults`, `discoverLoading`, `discoverSearched` |
| nutrition | `mealEntryDate`, `aiDescription`, `mealPhoto`, `photoPreview`, `estimating`, `estimate`, `dietForm`, `dietNumberDrafts`, `dietQuickCalories`, `dietQuickCaloriesDraft`, `dietGenerating`, `generatedDietPlan`, `dietRecording`, `dietVoiceLoading`, `dietCalendarCursor` |
| plan / goals | `calendarCursor`, `agendaView`, `weekAnchor`, `slotDraft`, `blockMenu`, `slotCategory`, `slotDuration`, `slotCustomHours`, `pendingTasks`, `pendingEvents`, `goalPeriod`, `customDate` |
| voice-checkin | `voiceOpen`, `recording`, `recordingSeconds`, `voiceLoading`, `voiceResult`, `voiceSaved` |
| pro | `checkoutOpen`, `checkoutPlan`, `checkoutStep` |
| friends | `friendsNotice`, `social`, `friendsTab`, `nudgeOpenFor`, `inviteUsername`, `inviteLink`, `inviteCopied`, `groupWizard`, `groupDraft`, `wizardGoal`, `wizardInvites`, `joinCode`, `groupPanel`, `settingsDraft`, `goalDraft`, `editingGoalId` |

### 9.4 Acciones de la API (para no perder ninguna al reestructurar)

**`POST /api/progress`** (43): `complete_onboarding`\*, `set_pro`, `set_focus_daily_target`, `check_username`, `set_username`, `update_profile`, `toggle_gym`\*, `add_discipline`, `set_discipline_priority`, `delete_discipline`, `set_training_quality`, `set_plan_training_quality`, `toggle_training`, `save_training`, `add_exercise`, `update_exercise`, `delete_exercise`, `save_sleep`, `add_focus_project`, `add_focus_session`, `add_task`, `schedule_task`, `update_task`, `toggle_task`, `toggle_event`, `delete_task`, `add_event`, `update_event`, `delete_event`, `add_meal`, `delete_meal`, `save_diet_plan`, `set_diet_target`, `add_book`, `delete_book`, `set_pages`, `add_note`, `update_book_status`\*, `set_priorities`, `add_goal`, `toggle_goal`, `delete_goal`, `apply_voice_checkin`.
\* sin uso en el cliente actual (Fase 2.4).

**`POST /api/friends`** (21): `invite_friend`, `accept_invite`, `decline_invite`, `revoke_invite`, `dismiss_pending_invite`, `remove_friend`, `publish_share`, `create_group`, `update_group`, `join_group`, `invite_to_group`, `accept_group_invite`, `decline_group_invite`, `revoke_group_invite`, `leave_group`, `remove_group_member`, `delete_group`, `add_group_goal`, `update_group_goal`, `delete_group_goal`, `log_goal_progress`.

**Otras rutas:** `GET /api/progress`, `GET /api/friends`, `/api/onboarding`, `/api/settings`, `/api/avatar`, `/api/feedback`, `/api/book-search`, `/api/voice-checkin`, `/api/estimate-calories`, `/api/diet-plan`, `/api/diet-intake`, `/api/notifications/{dispatch,preferences,subscribe}`, `/api/auth/{password,recover,session,update-password}`, `/api/app-version`, `/invite/[code]`, `/signout-with-chatgpt`, `/auth/callback`, `/auth/reset-password`.

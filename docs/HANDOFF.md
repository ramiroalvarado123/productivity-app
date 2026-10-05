# HANDOFF — estado de la reestructuración y próximos pasos

Última actualización: 2026-10-05. Leé primero `AGENTS.md` y `docs/architecture.md`.

## Ya hecho (commits en `main`, sin push salvo indicación)

1. **Limpieza**: borrados los restos de la plantilla (Vite, worker, D1, Drizzle, scripts). Marca git `antes-gran-reestructuracion` = estado previo.
2. **Estructura por capas**: `app/` (rutas) · `features/<área>/` · `domain/` · `shared/` · `server/`. Imports con `@/…`.
3. **Servidor más rápido**:
   - `getSessionUser()` verifica el JWT localmente (jose + JWKS de Supabase; el proyecto ya usa claves ES256). Antes: un viaje a `/auth/v1/user` por pedido.
   - Sin UPSERT de `profiles` en cada guardado.
   - GET en una sola tanda paralela, "hoy" derivado del historial (3 consultas menos), historial de sueño solo con 6 columnas, sin escrituras.
   - `/api/progress` partido: cada acción en `features/<área>/server/actions.ts`.
   - `toggle_training` y `save_exercises` usan funciones de Postgres (1 viaje, atómico) con respaldo automático al camino viejo si el SQL no está aplicado.
4. **Cliente partido**: `progress-client.tsx` (4.300 líneas) → `features/app-shell/progress-app.tsx` (cascarón, ~1.060) + `use-workspace-state.tsx` (estado compartido, ~1.760) + secciones en `features/*/components/*-section.tsx` (30–300 líneas c/u).
5. **Entrenamientos instantáneos**: marcar/desmarcar un día se ve al toque (optimista) y no bloquea los botones.
6. `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `.env.example` completo, herramientas en `scripts/refactor/`.
7. **Revisión semanal con IA para Pro**: se muestra en Progreso; calcula las métricas en el servidor y guarda una revisión por semana. El aviso push del domingo y el pop-up sin IA siguen para todas las cuentas. La memoria guarda sólo preferencias, prioridades, disponibilidad y restricciones temporales explícitas; no conserva el intercambio.

Cambios de comportamiento intencionales (menores):
- El objetivo de calorías del puntaje/avisos es el **guardado** (antes también tomaba un plan de IA generado y sin guardar).
- Las secciones se "reinician" al cambiar el día (`key={today}`), en vez de un efecto que reseteaba fechas sueltas.

## Lo que tiene que hacer un humano en Supabase / Vercel

1. **Backup** (Database → Backups, o `supabase db dump`).
2. ✅ (aplicado 2026-10-04) **SQL Editor → correr `supabase/performance.sql`** (índices + funciones `avora_toggle_training` / `avora_save_exercises` + marca libros terminados). Es aditivo.
3. **Integrations → Data API → Settings → Max rows**: subir a `10000`. Hoy el GET trae hasta 5 años de historial y Supabase corta en 1.000 filas por consulta por defecto (las comidas superan eso en ~1 año).
4. ✅ Supabase está en São Paulo: `vercel.json` ya tiene `"regions": ["gru1"]`. (Antes:) confirmar región. Las funciones de Vercel corren en `iad1` (EE.UU. Este). Si Supabase está en `us-east-1`, no hay que hacer nada. Si está en São Paulo (`sa-east-1`), agregar `vercel.json` con `{ "regions": ["gru1"] }` (cada consulta pasa de ~120 ms a ~5 ms).
5. **SQL Editor → correr `supabase/weekly-ai-review.sql`** antes de usar la revisión con IA. Crea las dos tablas nuevas con RLS por usuario; no toca preferencias, notificaciones ni el estado del anuncio de Early Adopters.

## Próximos pasos (en orden)

### A. Terminar de partir `progress-app.tsx` (usar `scripts/refactor/extract_section.py`)

Cada paso: escribir el spec (ver `scripts/refactor/specs-done/*.json`), correr extract → `autoimport.py .` → `cleanimports.py . features` → `npx tsc --noEmit` → lint → probar con `scripts/refactor/preview-ui-page.example.tsx` → commit.

1. **Alimentación** → `features/nutrition/components/nutrition-section.tsx`
   - hook: `aiDescription, mealEntryDate, mealPhoto, photoPreview, estimating, estimate, initialDietForm, dietForm, dietNumberDrafts, dietNumberFocusRef, dietQuickCalories, dietQuickCaloriesDraft, dietQuickCaloriesFocusRef, setDietQuickField, beginDietNumberInput, updateDietNumberInput, finishDietNumberInput, beginDietQuickCaloriesInput, updateDietQuickCaloriesInput, finishDietQuickCaloriesInput, dietGenerating, generatedDietPlan, dietRecording, dietVoiceLoading, dietRecorderRef, dietStreamRef, dietChunksRef, dietRecordingBytesRef, dietStopTimerRef, dietCalendarCursor, savedDietPlan, displayedDietPlan, selectMealPhoto, estimateMeal, saveEstimate, generateDietPlan, saveDietPlan, saveDietTarget, addDietDetail, transcribeDietAudio, startDietRecording, stopDietRecording`
   - pantalla: `dietCalendarStart, dietCalendarMonthName, dietCalendarOffset, dietCalendarDays, shiftDietCalendar, caloriesByDate, calorieStatus, mealEntryMeals, mealEntryCalories, mealsPanel, dietEstimate, dietQuickCaloriesValue, dietQuickPanel, dietPlannerPanel, calorieCalendarPanel`
   - render: el `<section className="single-section meals-section">…</section>` de la rama `physicalTab !== "training"`; reemplazarlo por `<NutritionSection key={today} />`.
   - **Antes** de extraer: sacar de `loadData` (hook) el bloque `if (next.dietPlan && !dietHydratedRef.current) {…}` y `dietHydratedRef`; en la sección nueva, hidratar el formulario con un efecto cuando `data.dietPlan` llega (una sola vez, con un ref).
   - Esta sección se va a rehacer con la base de alimentos (ver C): conviene extraerla primero.
2. **Amigos**: primero `GroupsTab` (estado `groupWizard, groupDraft, wizardGoal, wizardInvites, joinCode, groupPanel, settingsDraft, goalDraft, editingGoalId` + `closeGroupWizard, createGroup, joinGroup, toggleGroupPanel, saveGroupSettings, saveGroupGoal, goalFieldset, groupsTab`), después `CircleTab` (`nudgeOpenFor, inviteUsername, inviteLink, inviteCopied` + `inviteFriend, copyInvite, removeFriend, inviteText, shareBox, circleTab`; `myStreak`/`myEmail` van donde se usen) y por último `FriendsSection` (`friendsTab` + `friendsPanel`). `social`, `sendSocial`, `friendsNotice` quedan en el hook (los usa la bandeja de notificaciones).
3. **Configuración y Feedback** → `features/settings/components/settings-dialog.tsx` y `feedback-dialog.tsx`. Antes: dejar `openSettings`/`openFeedback` del hook solo con `setError(""); setXOpen(true); setProfileMenuOpen(false)`, e inicializar el estado del diálogo desde `data.profile` en su `useState` (se monta al abrirse: `{settingsOpen && <SettingsDialog />}`).
4. **Onboarding** → `features/onboarding/components/onboarding-screen.tsx` (estado `onboardingStep…usernameStatus` + el `if (!loading && !data.profile.onboardingCompleted) { return <main…> }`).
5. Modales de racha → `features/engagement/components/streak-modals.tsx`; sidebar/topbar/menú de perfil → `features/app-shell/components/`.

### B. Partir `use-workspace-state.tsx` en hooks

`use-progress-data.ts` (data, loadData, save, feedback de guardado, error) · `use-day-series.ts` (series por día, `dayRecordFor`, `scoreForDate`) · `use-social.ts` · `use-engagement.ts` · `use-insights.ts` · `use-inbox.ts`. `useWorkspaceState` queda componiéndolos.
Después: mover el armado del día a `domain/score/day-series.ts` (puro, con tests de caracterización) y hacer que `app/api/notifications/dispatch/route.ts` use la misma función (hoy tiene su copia en `dailyScoreForDate`).

### C. Base de datos de alimentos (decidido, falta implementar)

Objetivo: el usuario busca un alimento, elige porción o gramos, y calorías + proteínas/carbohidratos/grasas salen solas.
- **Catálogo propio en Supabase** (`supabase/food-catalog.sql`): tabla `food_catalog (id, name, search_name, brand, source 'avora'|'off', external_id unique, kcal_100g, protein_100g, carbs_100g, fat_100g, portions jsonb [{label, grams}], created_at)`, RLS de lectura para `authenticated` e insert solo `source = 'off'`. Sembrar ~150–250 alimentos genéricos en español (incluir típicos argentinos) con valores por 100 g de USDA SR Legacy y porciones caseras (unidad, taza, cucharada, feta…). `search_name` = minúsculas sin acentos (se calcula en JS).
- **Productos envasados**: Open Food Facts en tiempo real (sin clave; mandar `User-Agent: AVORA/1.0 (contacto)`; búsqueda por `search_terms`, `countries_tags=argentina`, campos `code,product_name,brands,nutriments,serving_size,serving_quantity`). Al elegir uno, se cachea en `food_catalog` con `source='off'`.
- **API**: `GET /api/foods/search?q=` (catálogo + OFF, normalizado a `FoodItem`) y acción nueva `add_food_meal { date, foodId | offCode, grams | portionIndex, quantity }` que resuelve el alimento **en el servidor**, calcula macros con `features/nutrition/logic/food-math.ts` (puro, con tests) e inserta en `meals`.
- **Columnas nuevas en `meals`** (aditivas): `food_id bigint references food_catalog on delete set null, grams numeric, quantity numeric, portion_label text`. `calories/protein/carbs/fat` se siguen guardando calculados (el historial no cambia).
- La UI se rehace con los detalles estéticos que va a pasar Tommy.
- (Opcional) USDA FoodData Central para ampliar el catálogo: clave gratis en api.data.gov → `FDC_API_KEY` en Vercel.

### D. CSS
Partir `app/globals.css` (2.400 líneas) en `styles/*.css` respetando el orden (las reglas del final pisan a las de arriba), sin cambiar nada visual; después mover cada bloque a su `features/<área>/`.

### E. Resto del plan largo
`docs/PLAN_REESTRUCTURACION.md`: Fase 5.3 (Pro no auto-asignable), 5.4 (límites de IA), 5.6 (`user_id` en vez de email), Fase 8 (Capacitor/tiendas).

## Probar la UI sin login
Copiar `scripts/refactor/preview-ui-page.example.tsx` a `app/preview-ui/page.tsx`, `npm run dev`, abrir `/preview-ui`. Borrar antes del commit. Si el dev server muestra estilos viejos, `npx next build && npx next start -p 3100`.

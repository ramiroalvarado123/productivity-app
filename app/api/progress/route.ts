import { getChatGPTUser, updateChatGPTUserMetadata } from "../../chatgpt-auth";
import { callRpc, deleteRows, insertRows, selectRows, updateRows } from "../../lib/supabase-db";
import { dateInTimeZone } from "../../lib/format";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const USERNAME = /^[a-z0-9_]{3,20}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const now = () => new Date().toISOString();
const today = () => dateInTimeZone("America/Argentina/Buenos_Aires");
const ok = (extra = {}) => Response.json({ ok: true, ...extra });
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

type ProgressRow = Record<string, unknown> & {
  id: number;
  kind: string;
  displayName: string;
  onboardingCompleted: boolean;
  mainGoalsJson: string;
  usagePreferencesJson: string;
  proSince: string | null;
  disciplineId: number;
  trainingDate: string;
  durationMinutes: number;
  distanceMeters: number;
  notes: string;
  quality: number | null;
  priority: "important" | "secondary";
  entryDate: string;
  dueDate: string | null;
  totalPages: number;
  currentPage: number;
  minutes: number;
  pages: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanTime(value: unknown): string | null {
  const time = String(value ?? "").trim();
  return !time ? "" : TIME.test(time) ? time : null;
}
function numeric(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
function decimal(value: unknown, maximum: number, places = 2) {
  const factor = 10 ** places;
  return Math.max(0, Math.min(maximum, Math.round(numeric(value) * factor) / factor));
}
function trainingQuality(value: unknown): number | null | undefined {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : undefined;
}
function trainingPriority(value: unknown): "important" | "secondary" | null {
  const parsed = String(value ?? "");
  return parsed === "important" || parsed === "secondary" ? parsed : null;
}
function daysBefore(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - days); return value.toISOString().slice(0, 10);
}
function stringArray(value: unknown) {
  try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []; } catch { return []; }
}
async function currentUser() {
  const user = await getChatGPTUser();
  if (user) await insertRows("profiles", { email: user.email, displayName: user.displayName }, { upsert: true, onConflict: ["email"], ignoreDuplicates: true });
  return user;
}
async function owned(table: string, email: string, where: Record<string, string | number | boolean | null> = {}) {
  return selectRows<ProgressRow>(table, { where: { userEmail: email, ...where }, limit: 1 });
}
async function upsert(table: string, values: Record<string, unknown>, conflict: string[]) {
  await insertRows(table, { ...values, updatedAt: now() }, { upsert: true, onConflict: conflict });
}

function isTransientSupabaseError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /Supabase (408|425|429|500|502|503|504)\b/.test(message) || /fetch failed|network/i.test(message);
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const params = new URL(request.url).searchParams;
    const date = DATE.test(params.get("date") ?? "") ? String(params.get("date")) : today();
    const weekStart = DATE.test(params.get("weekStart") ?? "") ? String(params.get("weekStart")) : date;
    const weekEnd = DATE.test(params.get("weekEnd") ?? "") ? String(params.get("weekEnd")) : date;
    const monthKey = MONTH.test(params.get("month") ?? "") ? String(params.get("month")) : date.slice(0, 7);
    const start = daysBefore(date, 5 * 366), email = user.email;
    const profile = (await selectRows<ProgressRow>("profiles", { where: { email }, limit: 1 }))[0];
    if (profile?.onboardingCompleted && !user.onboardingCompleted) await updateChatGPTUserMetadata({ displayName: profile.displayName, onboardingCompleted: true, mainGoals: stringArray(profile.mainGoalsJson), usagePreferences: stringArray(profile.usagePreferencesJson) });

    let disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] });
    if (!disciplines.length) {
      await insertRows("training_disciplines", [{ userEmail: email, name: "Gimnasio", kind: "strength" }, { userEmail: email, name: "Running", kind: "running" }], { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true });
      disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] });
    }
    const result = await Promise.all([
      selectRows<ProgressRow>("training_logs", { where: { userEmail: email }, gte: { trainingDate: start }, lte: { trainingDate: date }, order: [["trainingDate", "desc"], ["id", "desc"]] }),
      selectRows<ProgressRow>("exercise_logs", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
      selectRows<ProgressRow>("meals", { where: { userEmail: email, mealDate: date }, order: [["createdAt", "asc"]] }),
      selectRows<ProgressRow>("meals", { where: { userEmail: email }, gte: { mealDate: start }, lte: { mealDate: date }, order: [["mealDate", "desc"]] }),
      selectRows<ProgressRow>("diet_plans", { where: { userEmail: email }, limit: 1 }),
      selectRows<ProgressRow>("books", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
      selectRows<ProgressRow>("reading_logs", { where: { userEmail: email, logDate: date } }),
      selectRows<ProgressRow>("reading_logs", { where: { userEmail: email }, gte: { logDate: start }, lte: { logDate: date }, order: [["logDate", "desc"]] }),
      selectRows<ProgressRow>("book_notes", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
      selectRows<ProgressRow>("monthly_priorities", { where: { userEmail: email, monthKey }, limit: 1 }),
      selectRows<ProgressRow>("goals", { where: { userEmail: email }, order: [["completedAt", "asc"], ["targetDate", "asc"], ["createdAt", "desc"]] }),
      selectRows<ProgressRow>("daily_checkins", { where: { userEmail: email }, gte: { entryDate: start }, lte: { entryDate: date }, order: [["entryDate", "desc"]] }),
      selectRows<ProgressRow>("focus_projects", { where: { userEmail: email }, order: [["createdAt", "asc"]] }),
      selectRows<ProgressRow>("focus_sessions", { where: { userEmail: email }, gte: { sessionDate: start }, lte: { sessionDate: date }, order: [["sessionDate", "desc"]] }),
      selectRows<ProgressRow>("tasks", { where: { userEmail: email }, order: [["completedAt", "asc"], ["dueDate", "asc"], ["createdAt", "desc"]] }),
      selectRows<ProgressRow>("calendar_events", { where: { userEmail: email }, order: [["eventDate", "asc"], ["eventTime", "asc"]] }),
    ]);
    const [trainingLogs, exerciseLogs, meals, mealHistory, dietPlans, books, readingLogs, readingHistory, notes, priorities, goals, dailyCheckins, focusProjects, focusSessions, tasks, events] = result;
    const completedBookIds = books
      .filter((book) => String(book.status) === "reading" && Number(book.totalPages) > 0 && Number(book.currentPage) >= Number(book.totalPages))
      .map((book) => book.id);
    if (completedBookIds.length) {
      await Promise.all(completedBookIds.map((id) => updateRows("books", { id, userEmail: email }, { status: "read" })));
    }
    const visibleBooks = books.map((book) =>
      completedBookIds.includes(book.id) ? { ...book, status: "read" } : book
    );
    const strength = disciplines.find((row) => row.kind === "strength");
    return Response.json({
      profile: { email, displayName: profile?.displayName ?? user.displayName, username: String(profile?.username ?? ""), avatarUrl: String(profile?.avatarUrl ?? ""), onboardingCompleted: Boolean(profile?.onboardingCompleted || user.onboardingCompleted), mainGoals: profile?.onboardingCompleted ? stringArray(profile.mainGoalsJson) : user.mainGoals, usagePreferences: profile?.onboardingCompleted ? stringArray(profile.usagePreferencesJson) : user.usagePreferences, isPro: Boolean(profile?.proSince), proSince: profile?.proSince ?? "" },
      gymDates: strength ? trainingLogs.filter((row) => row.disciplineId === strength.id && row.trainingDate >= weekStart && row.trainingDate <= weekEnd).map((row) => row.trainingDate) : [],
      disciplines, trainingLogs, exerciseLogs, meals, mealHistory, dietPlan: dietPlans[0] ?? null, books: visibleBooks, readingLogs, readingHistory, notes,
      priorities: priorities[0] ?? { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 },
      goals, dailyCheckin: dailyCheckins.find((row) => row.entryDate === date) ?? null, dailyCheckins, focusProjects, focusSessions, tasks, events,
    });
  } catch (cause) {
    console.error("progress GET", cause);
    if (isTransientSupabaseError(cause)) return fail("Tuvimos un problema temporal al conectar tus datos. Intentá nuevamente en unos segundos.", 503);
    return fail("No se pudieron cargar tus datos. Verificá Supabase.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser(); if (!user) return fail("Necesitás iniciar sesión.", 401);
    const p = await request.json() as Record<string, unknown>, action = String(p.action ?? ""), email = user.email;
    if (action === "complete_onboarding") {
      const displayName = String(p.displayName ?? "").trim().slice(0, 60), goals = Array.isArray(p.mainGoals) ? p.mainGoals.map(String).filter((v: string) => ["training", "nutrition", "focus", "reading", "sleep", "goals"].includes(v)).slice(0, 3) : [], preferences = Array.isArray(p.usagePreferences) ? p.usagePreferences.map(String).filter((v: string) => ["quick", "weekly", "ai"].includes(v)) : [], monthKey = String(p.monthKey ?? "");
      if (displayName.length < 2) return fail("Ingresá tu nombre."); if (!goals.length) return fail("Elegí al menos un objetivo."); if (!MONTH.test(monthKey)) return fail("Mes inválido.");
      await updateRows("profiles", { email }, { displayName, onboardingCompleted: true, mainGoalsJson: JSON.stringify(goals), usagePreferencesJson: JSON.stringify(preferences), updatedAt: now() });
      const weight = (goal: string) => goals.includes(goal) ? 3 : 2; await upsert("monthly_priorities", { userEmail: email, monthKey, gymWeight: weight("training"), nutritionWeight: weight("nutrition"), focusWeight: weight("focus"), readingWeight: weight("reading"), sleepWeight: weight("sleep"), goalsWeight: weight("goals") }, ["userEmail", "monthKey"]);
      if (!await updateChatGPTUserMetadata({ displayName, onboardingCompleted: true, mainGoals: goals, usagePreferences: preferences })) console.warn("progress: onboarding saved but auth metadata could not be synchronized");
      return ok();
    }
    if (action === "set_pro") { const active = Boolean(p.active); await updateRows("profiles", { email }, { proSince: active ? today() : "", updatedAt: now() }); return ok({ isPro: active }); }
    // El nombre de usuario reemplaza al email para invitar amigos desde
    // adentro de la app. `avora_find_email_by_username` es security definer
    // porque la política de `profiles` sólo deja ver la fila propia.
    if (action === "check_username") {
      const username = String(p.username ?? "").trim().toLowerCase();
      if (!USERNAME.test(username)) return ok({ available: false, reason: "format" });
      const owner = await callRpc<string | null>("avora_find_email_by_username", { p_username: username });
      return ok({ available: !owner || owner === email });
    }
    if (action === "set_username") {
      const username = String(p.username ?? "").trim().toLowerCase();
      if (!USERNAME.test(username)) return fail("El nombre de usuario tiene que tener 3 a 20 letras, números o _.");
      const owner = await callRpc<string | null>("avora_find_email_by_username", { p_username: username });
      if (owner && owner !== email) return fail("Ese nombre de usuario ya está en uso.");
      await updateRows("profiles", { email }, { username, updatedAt: now() });
      return ok({ username });
    }
    // Sólo el nombre visible: no toca metas ni preferencias, así que no
    // sincroniza contra la metadata de auth (esa sí las pisa con lo que le
    // pases, y acá no tenemos el valor actual para no perderlas).
    if (action === "update_profile") {
      const displayName = String(p.displayName ?? "").trim().slice(0, 60);
      if (displayName.length < 2) return fail("Ingresá tu nombre.");
      await updateRows("profiles", { email }, { displayName, updatedAt: now() });
      return ok({ displayName });
    }
    if (action === "toggle_gym") {
      const date = String(p.date ?? ""); if (!DATE.test(date)) return fail("Fecha inválida."); let strength = (await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email, kind: "strength" }, limit: 1 }))[0];
      if (!strength) strength = (await insertRows<ProgressRow>("training_disciplines", { userEmail: email, name: "Gimnasio", kind: "strength" }, { upsert: true, onConflict: ["userEmail", "name"], returnRows: true }))[0];
      const row = (await owned("training_logs", email, { disciplineId: strength.id, trainingDate: date }))[0]; if (row) await deleteRows("training_logs", { id: row.id, userEmail: email }); else await insertRows("training_logs", { userEmail: email, disciplineId: strength.id, trainingDate: date }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true }); return ok();
    }
    if (action === "add_discipline") { const name = String(p.name ?? "").trim().slice(0, 50), kind = String(p.kind ?? "other"); if (!name || !["strength", "running", "cycling", "swimming", "sport", "other"].includes(kind)) return fail("Disciplina inválida."); await insertRows("training_disciplines", { userEmail: email, name, kind, priority: "important" }, { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true }); return ok(); }
    if (action === "set_discipline_priority") {
      const disciplineId = Number(p.disciplineId), priority = trainingPriority(p.priority);
      if (!disciplineId || !priority || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Preferencia de disciplina inválida.");
      await updateRows("training_disciplines", { id: disciplineId, userEmail: email }, { priority });
      return ok();
    }
    if (action === "delete_discipline") {
      const disciplineId = Number(p.disciplineId);
      const discipline = (await owned("training_disciplines", email, { id: disciplineId }))[0];
      if (!discipline) return fail("Disciplina no encontrada.", 404);
      const disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email } });
      if (disciplines.length <= 1) return fail("Tiene que quedar al menos una disciplina.");
      await deleteRows("training_disciplines", { id: disciplineId, userEmail: email });
      return ok();
    }
    if (action === "set_training_quality") {
      const disciplineId = Number(p.disciplineId), date = String(p.date ?? ""), quality = trainingQuality(p.quality);
      if (!disciplineId || !DATE.test(date) || quality === undefined || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Valoración inválida.");
      const row = (await owned("training_logs", email, { disciplineId, trainingDate: date }))[0];
      if (!row) return fail("Marcá el entrenamiento primero.");
      await updateRows("training_logs", { id: row.id, userEmail: email }, { quality });
      return ok();
    }
    if (action === "toggle_training") {
      const disciplineId = Number(p.disciplineId), date = String(p.date ?? ""); if (!disciplineId || !DATE.test(date) || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Entrenamiento inválido."); const row = (await owned("training_logs", email, { disciplineId, trainingDate: date }))[0];
      if (row) { if (row.durationMinutes || row.distanceMeters || row.notes || (await owned("exercise_logs", email, { trainingLogId: row.id }))[0]) return fail("Este día tiene detalles cargados. Borrá sus registros antes de desmarcarlo.", 409); await deleteRows("training_logs", { id: row.id, userEmail: email }); }
      else await insertRows("training_logs", { userEmail: email, disciplineId, trainingDate: date }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true }); return ok();
    }
    if (action === "save_training" || action === "add_exercise") {
      const disciplineId = Number(p.disciplineId), date = String(p.date ?? ""); if (!disciplineId || !DATE.test(date) || !(await owned("training_disciplines", email, { id: disciplineId }))[0]) return fail("Elegí una disciplina y fecha válidas.");
      const logs = await insertRows<ProgressRow>("training_logs", { userEmail: email, disciplineId, trainingDate: date, durationMinutes: decimal(p.durationMinutes, 1440), distanceMeters: Math.max(0, Math.min(1e6, Math.round(numeric(p.distanceKm) * 1000))), notes: String(p.notes ?? "").trim().slice(0, 1500) }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], returnRows: true });
      if (action === "add_exercise") { const exercise = String(p.exercise ?? "").trim().slice(0, 80); if (!exercise) return fail("Completá el ejercicio."); await insertRows("exercise_logs", { userEmail: email, trainingLogId: logs[0].id, exercise, weightDeciKg: Math.max(0, Math.min(10000, Math.round(numeric(p.weightKg) * 10))), sets: Math.max(0, Math.min(100, Math.round(Number(p.sets) || 0))), reps: Math.max(0, Math.min(1000, Math.round(Number(p.reps) || 0))), isRecord: Boolean(p.isRecord) }); } return ok();
    }
    if (action === "update_exercise") {
      const id = Number(p.id);
      const existing = await selectRows("exercise_logs", { where: { id, userEmail: email }, limit: 1 });
      if (!existing[0]) return fail("Ejercicio no encontrado.", 404);
      const exercise = String(p.exercise ?? "").trim().slice(0, 80);
      if (!exercise) return fail("Completá el ejercicio.");
      await updateRows("exercise_logs", { id, userEmail: email }, {
        exercise,
        weightDeciKg: Math.max(0, Math.min(10000, Math.round(numeric(p.weightKg) * 10))),
        sets: Math.max(0, Math.min(100, Math.round(Number(p.sets) || 0))),
        reps: Math.max(0, Math.min(1000, Math.round(Number(p.reps) || 0))),
        isRecord: Boolean(p.isRecord),
      });
      return ok();
    }
    if (action === "delete_exercise") { await deleteRows("exercise_logs", { id: Number(p.id), userEmail: email }); return ok(); }
    if (action === "save_sleep") { const date = String(p.date ?? ""); if (!DATE.test(date)) return fail("Fecha inválida."); const sleepQuality = p.sleepQuality === "good" || p.sleepQuality === "bad" ? p.sleepQuality : null; await upsert("daily_checkins", { userEmail: email, entryDate: date, sleepMinutes: Math.max(0, Math.min(1440, Math.round(Number(p.sleepMinutes) || 0))), bedtime: String(p.bedtime ?? "").slice(0, 20), wakeTime: String(p.wakeTime ?? "").slice(0, 20), sleepQuality }, ["userEmail", "entryDate"]); return ok(); }
    if (action === "add_focus_project") { const name = String(p.name ?? "").trim().slice(0, 80), kind = String(p.kind ?? "study"); if (!name || !["study", "work"].includes(kind)) return fail("Completá el nombre y el tipo."); await insertRows("focus_projects", { userEmail: email, name, kind }, { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true }); return ok(); }
    // Cada envío suma un bloque nuevo (podés estudiar la misma materia dos
    // veces en un día): antes borraba el bloque anterior del mismo día y se
    // perdía tiempo real registrado.
    if (action === "add_focus_session") { const projectId = Number(p.projectId), date = String(p.date ?? ""); if (!DATE.test(date) || !(await owned("focus_projects", email, { id: projectId }))[0]) return fail("Elegí un proyecto y fecha válidos."); await insertRows("focus_sessions", { userEmail: email, projectId, sessionDate: date, minutes: Math.max(1, Math.min(1440, Math.round(Number(p.minutes) || 0))), note: String(p.note ?? "").slice(0, 1000) }); return ok(); }
    if (action === "add_task") {
      const title = String(p.title ?? "").trim().slice(0, 180), projectId = Number(p.projectId) || null, dueDate = String(p.dueDate ?? ""), startTime = cleanTime(p.startTime), duration = Math.max(0, Math.min(1440, Math.round(Number(p.durationMinutes) || 0))); if (!title || (dueDate && !DATE.test(dueDate))) return fail("Completá una tarea y fecha válida."); if (startTime === null) return fail("La hora no es válida."); if (startTime && !dueDate) return fail("Para darle un horario, la tarea necesita una fecha."); if (projectId && !(await owned("focus_projects", email, { id: projectId }))[0]) return fail("Proyecto no encontrado.", 404); await insertRows("tasks", { userEmail: email, projectId, title, dueDate: dueDate || null, startTime, durationMinutes: startTime ? duration || 60 : duration }); return ok();
    }
    if (action === "schedule_task") { const id = Number(p.id), startTime = cleanTime(p.startTime), dueDate = String(p.dueDate ?? ""), duration = Math.max(0, Math.min(1440, Math.round(Number(p.durationMinutes) || 0))), row = (await owned("tasks", email, { id }))[0]; if (!row) return fail("Tarea no encontrada.", 404); if (startTime === null || (dueDate && !DATE.test(dueDate))) return fail("Fecha u hora inválida."); const nextDate = dueDate || row.dueDate; if (startTime && !nextDate) return fail("La tarea necesita una fecha."); await updateRows("tasks", { id, userEmail: email }, { startTime, dueDate: nextDate, durationMinutes: startTime ? duration || 60 : 0 }); return ok(); }
    if (action === "toggle_task") {
      const id = Number(p.id);
      if (!(await owned("tasks", email, { id }))[0]) return fail("Tarea no encontrada.", 404);
      await updateRows("tasks", { id, userEmail: email }, { completedAt: p.completed ? now() : null });
      return ok();
    }
    if (action === "toggle_event") {
      const id = Number(p.id);
      if (!(await owned("calendar_events", email, { id }))[0]) return fail("Evento no encontrado.", 404);
      await updateRows("calendar_events", { id, userEmail: email }, { completedAt: p.completed ? now() : null });
      return ok();
    }
    if (action === "delete_task") { await deleteRows("tasks", { id: Number(p.id), userEmail: email }); return ok(); }
    if (action === "add_event") { const title = String(p.title ?? "").trim().slice(0, 180), eventDate = String(p.eventDate ?? ""), eventTime = cleanTime(p.eventTime), category = String(p.category ?? "personal"); if (!title || !DATE.test(eventDate) || eventTime === null || !["personal", "study", "work", "training", "nutrition", "sleep", "reading", "health", "other"].includes(category)) return fail("Completá un evento válido."); await insertRows("calendar_events", { userEmail: email, title, eventDate, eventTime, durationMinutes: Math.max(15, Math.min(1440, Math.round(Number(p.durationMinutes) || 60))), category, notes: String(p.notes ?? "").slice(0, 1500) }); return ok(); }
    if (action === "delete_event") { await deleteRows("calendar_events", { id: Number(p.id), userEmail: email }); return ok(); }
    if (action === "add_meal") { const date = String(p.date ?? ""), name = String(p.name ?? "").trim(); if (!DATE.test(date) || !name) return fail("Completá el nombre y la fecha."); await insertRows("meals", { userEmail: email, mealDate: date, name, detail: String(p.detail ?? "").trim(), calories: Math.max(0, Math.min(10000, Number(p.calories) || 0)), protein: Math.max(0, Math.min(1000, Number(p.protein) || 0)), carbs: Math.max(0, Math.min(2000, Number(p.carbs) || 0)), fat: Math.max(0, Math.min(1000, Number(p.fat) || 0)) }); return ok(); }
    if (action === "delete_meal") { await deleteRows("meals", { id: Number(p.id), userEmail: email }); return ok(); }
    if (action === "save_diet_plan") { const age = Math.round(Number(p.age) || 0), heightCm = Math.round(Number(p.heightCm) || 0), currentWeightDeciKg = Math.round((Number(p.currentWeightKg) || 0) * 10), targetWeightDeciKg = Math.round((Number(p.targetWeightKg) || 0) * 10), targetCalories = Math.round(Number(p.targetCalories) || 0); if (age < 18 || age > 100 || heightCm < 120 || heightCm > 230 || currentWeightDeciKg < 350 || targetWeightDeciKg < 350 || !p.plan || targetCalories < 1000 || targetCalories > 6000) return fail("Revisá los datos del plan."); await upsert("diet_plans", { userEmail: email, age, sex: String(p.sex ?? "unspecified"), heightCm, currentWeightDeciKg, targetWeightDeciKg, activityLevel: String(p.activityLevel ?? "light"), goalPace: String(p.goalPace ?? "gentle"), preferences: String(p.preferences ?? "").slice(0, 500), details: String(p.details ?? "").slice(0, 2000), targetCalories, planJson: JSON.stringify(p.plan).slice(0, 30000) }, ["userEmail"]); return ok(); }
    // Calculadora rápida sin IA: solo fija las calorías objetivo (y el snapshot biométrico que las produjo). Nunca toca planJson/preferences/details de un plan con IA ya guardado.
    if (action === "set_diet_target") { const age = Math.round(Number(p.age) || 0), heightCm = Math.round(Number(p.heightCm) || 0), currentWeightDeciKg = Math.round((Number(p.currentWeightKg) || 0) * 10), targetWeightDeciKg = Math.round((Number(p.targetWeightKg) || 0) * 10), targetCalories = Math.round(Number(p.targetCalories) || 0); if (age < 18 || age > 100 || heightCm < 120 || heightCm > 230 || currentWeightDeciKg < 350 || targetWeightDeciKg < 350 || targetCalories < 1000 || targetCalories > 6000) return fail("Revisá los datos."); const existing = (await owned("diet_plans", email))[0]; await upsert("diet_plans", { userEmail: email, age, sex: String(p.sex ?? "unspecified"), heightCm, currentWeightDeciKg, targetWeightDeciKg, activityLevel: String(p.activityLevel ?? "light"), goalPace: String(p.goalPace ?? "gentle"), preferences: String(existing?.preferences ?? ""), details: String(existing?.details ?? ""), targetCalories, planJson: String(existing?.planJson ?? "") }, ["userEmail"]); return ok(); }
    if (action === "add_book") { const title = String(p.title ?? "").trim(); if (!title) return fail("Ingresá el título del libro."); const status = ["reading", "read", "wishlist"].includes(String(p.status)) ? String(p.status) : "reading", totalPages = Math.max(0, Math.min(20000, Number(p.totalPages) || 0)); await insertRows("books", { userEmail: email, title, author: String(p.author ?? "").trim(), status, totalPages, currentPage: status === "read" ? totalPages : 0, coverUrl: String(p.coverUrl ?? "").slice(0, 1000), externalKey: String(p.externalKey ?? "").slice(0, 300) }); return ok(); }
    if (action === "delete_book") { const bookId = Number(p.bookId); if (!(await owned("books", email, { id: bookId }))[0]) return fail("Libro no encontrado.", 404); await deleteRows("reading_logs", { bookId, userEmail: email }); await deleteRows("book_notes", { bookId, userEmail: email }); await deleteRows("books", { id: bookId, userEmail: email }); return ok(); }
    if (action === "set_pages") {
      const bookId = Number(p.bookId), date = String(p.date ?? ""), pages = Math.max(0, Math.min(5000, Number(p.pages) || 0)), book = (await owned("books", email, { id: bookId }))[0];
      if (!book || !DATE.test(date)) return fail("Datos de lectura inválidos.");
      const previous = (await owned("reading_logs", email, { bookId, logDate: date }))[0];
      const minutes = p.minutes === undefined ? previous?.minutes ?? 0 : Math.max(0, Math.min(1440, Number(p.minutes) || 0));
      const delta = pages - (previous?.pages ?? 0);
      const currentPage = Math.max(0, book.totalPages ? Math.min(book.totalPages, book.currentPage + delta) : book.currentPage + delta);
      const completed = Number(book.totalPages) > 0 && currentPage >= Number(book.totalPages);
      const nextStatus = completed ? "read" : String(book.status) === "read" ? "reading" : book.status;
      await upsert("reading_logs", { userEmail: email, bookId, logDate: date, pages, minutes }, ["userEmail", "bookId", "logDate"]);
      await updateRows("books", { id: bookId, userEmail: email }, { currentPage, status: nextStatus });
      return ok({ completed });
    }
    if (action === "add_note") { const bookId = Number(p.bookId), content = String(p.content ?? "").trim(); if (!content || !(await owned("books", email, { id: bookId }))[0]) return fail("Elegí un libro y escribí una nota."); await insertRows("book_notes", { userEmail: email, bookId, content }); return ok(); }
    if (action === "update_book_status") { const status = String(p.status); if (!["reading", "read", "wishlist"].includes(status)) return fail("Estado inválido."); await updateRows("books", { id: Number(p.bookId), userEmail: email }, { status }); return ok(); }
    if (action === "set_priorities") { const monthKey = String(p.monthKey ?? ""), weight = (v: unknown) => Math.max(1, Math.min(3, Math.round(Number(v) || 2))); if (!MONTH.test(monthKey)) return fail("Mes inválido."); await upsert("monthly_priorities", { userEmail: email, monthKey, gymWeight: weight(p.gymWeight), nutritionWeight: weight(p.nutritionWeight), readingWeight: weight(p.readingWeight), sleepWeight: weight(p.sleepWeight), focusWeight: weight(p.focusWeight), goalsWeight: weight(p.goalsWeight) }, ["userEmail", "monthKey"]); return ok(); }
    if (action === "add_goal") { const title = String(p.title ?? "").trim(), period = String(p.period), category = String(p.category), targetDate = String(p.targetDate ?? ""); if (!title || !["weekly", "monthly", "annual", "custom"].includes(period) || !DATE.test(targetDate)) return fail("Completá un objetivo válido."); await insertRows("goals", { userEmail: email, title: title.slice(0, 180), period, category, targetDate }); return ok(); }
    if (action === "toggle_goal") { await updateRows("goals", { id: Number(p.id), userEmail: email }, { completedAt: p.completed ? now() : null }); return ok(); }
    if (action === "delete_goal") { await deleteRows("goals", { id: Number(p.id), userEmail: email }); return ok(); }
    if (action === "apply_voice_checkin") {
      const date = String(p.date ?? ""), c = p.checkin;
      if (!DATE.test(date) || !isRecord(c)) return fail("El cierre diario no es válido.");
      const clamp = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
      const previous = (await owned("daily_checkins", email, { entryDate: date }))[0] ?? {};
      const sleep = isRecord(c.sleep) ? c.sleep : {};
      const study = isRecord(c.study) ? c.study : {};
      const gym = isRecord(c.gym) ? c.gym : {};
      const reading = isRecord(c.reading) ? c.reading : {};
      const transcript = String(c.transcript ?? "");
      const normalized = transcript.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const mentions = (patterns: string[]) => patterns.some((pattern) => normalized.includes(pattern));
      const gymNo = mentions(["no fui al gimnasio", "no fui a entrenar", "no entrene", "no hice ejercicio", "no corri"]);
      const gymMentioned = !gymNo && (gym.attended === true || Boolean(String(gym.detail ?? "").trim()) || mentions(["gimnasio", "gym", "entrene", "entrenamiento", "pesas", "corrí", "corri", "running", "biciclet", "ciclismo", "natacion", "nadar", "futbol", "yoga", "pilates"]));
      const studyMentioned = Number(study.minutes) > 0 || Boolean(String(study.detail ?? "").trim()) || (Array.isArray(study.tasks) && study.tasks.length > 0) || mentions(["estudie", "estudié", "estudiar", "estudio", "trabaje", "trabajé", "trabajar", "trabajo"]);
      const sleepMentioned = Number(sleep.minutes) > 0 || Boolean(String(sleep.bedtime ?? "").trim()) || Boolean(String(sleep.wakeTime ?? "").trim()) || mentions(["dormi", "dormí", "duermo", "acoste", "acosté", "me levante", "me levanté", "sueno", "sueño"]);
      const waterMentioned = Number(c.waterMl) > 0 || mentions(["agua", "litro", "hidrat"]);
      const habits = Array.isArray(c.habits) ? c.habits.filter((value): value is string => typeof value === "string").slice(0, 12) : [];
      const habitsMentioned = habits.length > 0 || mentions(["habito", "hábito", "medite", "medité", "camine", "caminé", "stretch", "estir"]);
      const journal = String(c.journal ?? "").trim();
      const summary = String(c.summary ?? "").trim();
      const previousHabits = stringArray(previous.habitsJson);
      await upsert("daily_checkins", {
        userEmail: email,
        entryDate: date,
        habitsJson: JSON.stringify(habitsMentioned ? habits : previousHabits),
        workoutDetail: gymMentioned ? String(gym.detail ?? "").slice(0, 1500) : String(previous.workoutDetail ?? ""),
        studyMinutes: studyMentioned ? clamp(study.minutes, 1440) : clamp(previous.studyMinutes, 1440),
        studyDetail: studyMentioned ? String(study.detail ?? "").slice(0, 1500) : String(previous.studyDetail ?? ""),
        sleepMinutes: sleepMentioned ? clamp(sleep.minutes, 1440) : clamp(previous.sleepMinutes, 1440),
        bedtime: sleepMentioned ? String(sleep.bedtime ?? "").slice(0, 20) : String(previous.bedtime ?? ""),
        wakeTime: sleepMentioned ? String(sleep.wakeTime ?? "").slice(0, 20) : String(previous.wakeTime ?? ""),
        sleepQuality: previous.sleepQuality === "good" || previous.sleepQuality === "bad" ? previous.sleepQuality : null,
        waterMl: waterMentioned ? clamp(c.waterMl, 20000) : clamp(previous.waterMl, 20000),
        journal: journal || String(previous.journal ?? ""),
        transcript,
        voiceSummary: summary || String(previous.voiceSummary ?? ""),
      }, ["userEmail", "entryDate"]);

      for (const meal of Array.isArray(c.meals) ? c.meals.filter(isRecord).slice(0, 8) : []) {
        if (String(meal.name ?? "").trim()) {
          await insertRows("meals", {
            userEmail: email,
            mealDate: date,
            name: String(meal.name).slice(0, 80),
            detail: String(meal.detail ?? "").slice(0, 300),
            calories: clamp(meal.calories, 10000),
            protein: clamp(meal.protein, 1000),
            carbs: clamp(meal.carbs, 2000),
            fat: clamp(meal.fat, 1000),
          });
        }
      }

      if (gymMentioned) {
        const disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] });
        const normalizeName = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matched = disciplines.filter((discipline) => normalized.includes(normalizeName(String(discipline.name))));
        const strength = disciplines.find((discipline) => discipline.kind === "strength");
        const selected = matched.length ? matched : strength ? [strength] : [];
        for (const discipline of selected) {
          await insertRows("training_logs", {
            userEmail: email,
            disciplineId: discipline.id,
            trainingDate: date,
            notes: String(gym.detail ?? "").slice(0, 1500),
          }, { upsert: true, onConflict: ["userEmail", "disciplineId", "trainingDate"], ignoreDuplicates: true });
        }
      }

      const readingTitle = String(reading.bookTitle ?? "").trim();
      const readingPages = Math.max(0, Math.min(5000, Math.round(Number(reading.pages) || 0)));
      if (readingPages > 0) {
        const books = await selectRows<ProgressRow>("books", { where: { userEmail: email }, order: [["createdAt", "desc"]] });
        const normalizedTitle = readingTitle.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const book = books.find((candidate) => normalizedTitle && normalizedTitle.includes(String(candidate.title).toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) || books.find((candidate) => candidate.status === "reading");
        if (book) {
          const previousLog = (await owned("reading_logs", email, { bookId: book.id, logDate: date }))[0];
          const currentPage = Math.max(0, book.totalPages ? Math.min(book.totalPages, book.currentPage + readingPages - (previousLog?.pages ?? 0)) : book.currentPage + readingPages);
          const completed = Number(book.totalPages) > 0 && currentPage >= Number(book.totalPages);
          await upsert("reading_logs", { userEmail: email, bookId: book.id, logDate: date, pages: readingPages, minutes: clamp(reading.minutes, 1440) }, ["userEmail", "bookId", "logDate"]);
          await updateRows("books", { id: book.id, userEmail: email }, { currentPage, status: completed ? "read" : "reading" });
        }
      }
      return ok();
    }
    return fail("Acción desconocida.");
  } catch (cause) { console.error("progress POST", cause); return fail("No se pudo guardar. Verificá Supabase.", 500); }
}

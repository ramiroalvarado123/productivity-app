import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { bookNotes, books, calendarEvents, dailyCheckins, dietPlans, exerciseLogs, focusProjects, focusSessions, goals, gymAttendance, meals, monthlyPriorities, profiles, readingLogs, tasks, trainingDisciplines, trainingLogs } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function cleanDate(value: string | null, fallback: string) {
  return value && DATE_PATTERN.test(value) ? value : fallback;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function daysBefore(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

async function authenticatedUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const db = getDb();
  await db.insert(profiles).values({ email: user.email, displayName: user.displayName })
    .onConflictDoUpdate({ target: profiles.email, set: { displayName: user.displayName, updatedAt: sql`CURRENT_TIMESTAMP` } });
  return user;
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const url = new URL(request.url);
  const date = cleanDate(url.searchParams.get("date"), todayUtc());
  const weekStart = cleanDate(url.searchParams.get("weekStart"), date);
  const weekEnd = cleanDate(url.searchParams.get("weekEnd"), date);
  const monthKey = MONTH_PATTERN.test(url.searchParams.get("month") ?? "") ? String(url.searchParams.get("month")) : date.slice(0, 7);
  const db = getDb();
  const historyStart = daysBefore(date, 365);

  let disciplineRows = await db.select().from(trainingDisciplines).where(eq(trainingDisciplines.userEmail, user.email)).orderBy(asc(trainingDisciplines.createdAt), asc(trainingDisciplines.id));
  if (!disciplineRows.length) {
    await db.insert(trainingDisciplines).values([
      { userEmail: user.email, name: "Gimnasio", kind: "strength" },
      { userEmail: user.email, name: "Running", kind: "running" },
    ]).onConflictDoNothing();
    disciplineRows = await db.select().from(trainingDisciplines).where(eq(trainingDisciplines.userEmail, user.email)).orderBy(asc(trainingDisciplines.createdAt), asc(trainingDisciplines.id));
  }

  const legacyGym = await db.select().from(gymAttendance).where(eq(gymAttendance.userEmail, user.email));
  const strengthDiscipline = disciplineRows.find((item) => item.kind === "strength");
  if (strengthDiscipline && legacyGym.length) {
    for (const row of legacyGym) await db.insert(trainingLogs).values({ userEmail: user.email, disciplineId: strengthDiscipline.id, trainingDate: row.attendedDate }).onConflictDoNothing();
  }

  const [trainingRows, exerciseRows, mealRows, mealHistoryRows, dietPlanRows, bookRows, logRows, readingHistoryRows, noteRows, priorityRows, goalRows, dailyRows, projectRows, focusRows, taskRows, eventRows] = await Promise.all([
    db.select().from(trainingLogs).where(and(eq(trainingLogs.userEmail, user.email), gte(trainingLogs.trainingDate, historyStart), lte(trainingLogs.trainingDate, date))).orderBy(desc(trainingLogs.trainingDate), desc(trainingLogs.id)),
    db.select().from(exerciseLogs).where(eq(exerciseLogs.userEmail, user.email)).orderBy(desc(exerciseLogs.createdAt), desc(exerciseLogs.id)),
    db.select().from(meals).where(and(eq(meals.userEmail, user.email), eq(meals.mealDate, date))).orderBy(asc(meals.createdAt), asc(meals.id)),
    db.select().from(meals).where(and(eq(meals.userEmail, user.email), gte(meals.mealDate, historyStart), lte(meals.mealDate, date))).orderBy(desc(meals.mealDate)),
    db.select().from(dietPlans).where(eq(dietPlans.userEmail, user.email)).limit(1),
    db.select().from(books).where(eq(books.userEmail, user.email)).orderBy(desc(books.createdAt), desc(books.id)),
    db.select().from(readingLogs).where(and(eq(readingLogs.userEmail, user.email), eq(readingLogs.logDate, date))),
    db.select().from(readingLogs).where(and(eq(readingLogs.userEmail, user.email), gte(readingLogs.logDate, historyStart), lte(readingLogs.logDate, date))).orderBy(desc(readingLogs.logDate)),
    db.select().from(bookNotes).where(eq(bookNotes.userEmail, user.email)).orderBy(desc(bookNotes.createdAt), desc(bookNotes.id)),
    db.select().from(monthlyPriorities).where(and(eq(monthlyPriorities.userEmail, user.email), eq(monthlyPriorities.monthKey, monthKey))).limit(1),
    db.select().from(goals).where(eq(goals.userEmail, user.email)).orderBy(asc(goals.completedAt), asc(goals.targetDate), desc(goals.createdAt)),
    db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userEmail, user.email), gte(dailyCheckins.entryDate, historyStart), lte(dailyCheckins.entryDate, date))).orderBy(desc(dailyCheckins.entryDate)),
    db.select().from(focusProjects).where(eq(focusProjects.userEmail, user.email)).orderBy(asc(focusProjects.createdAt), asc(focusProjects.id)),
    db.select().from(focusSessions).where(and(eq(focusSessions.userEmail, user.email), gte(focusSessions.sessionDate, historyStart), lte(focusSessions.sessionDate, date))).orderBy(desc(focusSessions.sessionDate), desc(focusSessions.id)),
    db.select().from(tasks).where(eq(tasks.userEmail, user.email)).orderBy(asc(tasks.completedAt), asc(tasks.dueDate), desc(tasks.createdAt)),
    db.select().from(calendarEvents).where(eq(calendarEvents.userEmail, user.email)).orderBy(asc(calendarEvents.eventDate), asc(calendarEvents.eventTime)),
  ]);

  return Response.json({
    profile: { email: user.email, displayName: user.displayName },
    gymDates: strengthDiscipline ? trainingRows.filter((row) => row.disciplineId === strengthDiscipline.id && row.trainingDate >= weekStart && row.trainingDate <= weekEnd).map((row) => row.trainingDate) : [],
    disciplines: disciplineRows,
    trainingLogs: trainingRows,
    exerciseLogs: exerciseRows,
    meals: mealRows,
    mealHistory: mealHistoryRows,
    dietPlan: dietPlanRows[0] ?? null,
    books: bookRows,
    readingLogs: logRows,
    readingHistory: readingHistoryRows,
    notes: noteRows,
    priorities: priorityRows[0] ?? { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 },
    goals: goalRows,
    dailyCheckin: dailyRows.find((row) => row.entryDate === date) ?? null,
    dailyCheckins: dailyRows,
    focusProjects: projectRows,
    focusSessions: focusRows,
    tasks: taskRows,
    events: eventRows,
  });
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  const payload = await request.json() as Record<string, unknown>;
  const action = String(payload.action ?? "");
  const db = getDb();

  if (action === "toggle_gym") {
    const date = String(payload.date ?? "");
    if (!DATE_PATTERN.test(date)) return Response.json({ error: "Fecha inválida." }, { status: 400 });
    const existing = await db.select({ id: gymAttendance.id }).from(gymAttendance).where(and(eq(gymAttendance.userEmail, user.email), eq(gymAttendance.attendedDate, date))).limit(1);
    if (existing[0]) await db.delete(gymAttendance).where(eq(gymAttendance.id, existing[0].id));
    else await db.insert(gymAttendance).values({ userEmail: user.email, attendedDate: date });
    return Response.json({ ok: true });
  }

  if (action === "add_discipline") {
    const name = String(payload.name ?? "").trim().slice(0, 50);
    const kind = String(payload.kind ?? "other");
    if (!name) return Response.json({ error: "Escribí el nombre de la disciplina." }, { status: 400 });
    if (!["strength", "running", "cycling", "swimming", "sport", "other"].includes(kind)) return Response.json({ error: "Tipo de disciplina inválido." }, { status: 400 });
    await db.insert(trainingDisciplines).values({ userEmail: user.email, name, kind: kind as "strength" | "running" | "cycling" | "swimming" | "sport" | "other" }).onConflictDoNothing();
    return Response.json({ ok: true });
  }

  if (action === "toggle_training") {
    const disciplineId = Number(payload.disciplineId);
    const date = String(payload.date ?? "");
    if (!disciplineId || !DATE_PATTERN.test(date)) return Response.json({ error: "Entrenamiento inválido." }, { status: 400 });
    const discipline = await db.select({ id: trainingDisciplines.id }).from(trainingDisciplines).where(and(eq(trainingDisciplines.id, disciplineId), eq(trainingDisciplines.userEmail, user.email))).limit(1);
    if (!discipline[0]) return Response.json({ error: "Disciplina no encontrada." }, { status: 404 });
    const existing = await db.select().from(trainingLogs).where(and(eq(trainingLogs.userEmail, user.email), eq(trainingLogs.disciplineId, disciplineId), eq(trainingLogs.trainingDate, date))).limit(1);
    if (existing[0]) {
      const related = await db.select({ id: exerciseLogs.id }).from(exerciseLogs).where(and(eq(exerciseLogs.userEmail, user.email), eq(exerciseLogs.trainingLogId, existing[0].id))).limit(1);
      if (existing[0].durationMinutes || existing[0].distanceMeters || existing[0].notes || related[0]) return Response.json({ error: "Este día tiene detalles cargados. Borrá sus registros antes de desmarcarlo." }, { status: 409 });
      await db.delete(trainingLogs).where(and(eq(trainingLogs.id, existing[0].id), eq(trainingLogs.userEmail, user.email)));
    } else {
      await db.insert(trainingLogs).values({ userEmail: user.email, disciplineId, trainingDate: date }).onConflictDoNothing();
    }
    return Response.json({ ok: true });
  }

  if (action === "save_training") {
    const disciplineId = Number(payload.disciplineId);
    const date = String(payload.date ?? "");
    const durationMinutes = Math.max(0, Math.min(1440, Math.round(Number(payload.durationMinutes) || 0)));
    const distanceMeters = Math.max(0, Math.min(1_000_000, Math.round((Number(payload.distanceKm) || 0) * 1000)));
    const notes = String(payload.notes ?? "").trim().slice(0, 1500);
    const discipline = await db.select({ id: trainingDisciplines.id }).from(trainingDisciplines).where(and(eq(trainingDisciplines.id, disciplineId), eq(trainingDisciplines.userEmail, user.email))).limit(1);
    if (!discipline[0] || !DATE_PATTERN.test(date)) return Response.json({ error: "Elegí una disciplina y una fecha válidas." }, { status: 400 });
    await db.insert(trainingLogs).values({ userEmail: user.email, disciplineId, trainingDate: date, durationMinutes, distanceMeters, notes })
      .onConflictDoUpdate({ target: [trainingLogs.userEmail, trainingLogs.disciplineId, trainingLogs.trainingDate], set: { durationMinutes, distanceMeters, notes } });
    return Response.json({ ok: true });
  }

  if (action === "add_exercise") {
    const disciplineId = Number(payload.disciplineId);
    const date = String(payload.date ?? "");
    const exercise = String(payload.exercise ?? "").trim().slice(0, 80);
    const weightDeciKg = Math.max(0, Math.min(10000, Math.round((Number(payload.weightKg) || 0) * 10)));
    const sets = Math.max(0, Math.min(100, Math.round(Number(payload.sets) || 0)));
    const reps = Math.max(0, Math.min(1000, Math.round(Number(payload.reps) || 0)));
    const discipline = await db.select({ id: trainingDisciplines.id }).from(trainingDisciplines).where(and(eq(trainingDisciplines.id, disciplineId), eq(trainingDisciplines.userEmail, user.email))).limit(1);
    if (!discipline[0] || !DATE_PATTERN.test(date) || !exercise) return Response.json({ error: "Completá ejercicio, disciplina y fecha." }, { status: 400 });
    await db.insert(trainingLogs).values({ userEmail: user.email, disciplineId, trainingDate: date }).onConflictDoNothing();
    const log = await db.select({ id: trainingLogs.id }).from(trainingLogs).where(and(eq(trainingLogs.userEmail, user.email), eq(trainingLogs.disciplineId, disciplineId), eq(trainingLogs.trainingDate, date))).limit(1);
    if (!log[0]) return Response.json({ error: "No se pudo crear el entrenamiento." }, { status: 500 });
    await db.insert(exerciseLogs).values({ userEmail: user.email, trainingLogId: log[0].id, exercise, weightDeciKg, sets, reps, isRecord: Boolean(payload.isRecord) });
    return Response.json({ ok: true });
  }

  if (action === "delete_exercise") {
    const id = Number(payload.id);
    await db.delete(exerciseLogs).where(and(eq(exerciseLogs.id, id), eq(exerciseLogs.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "save_sleep") {
    const date = String(payload.date ?? "");
    const sleepMinutes = Math.max(0, Math.min(1440, Math.round(Number(payload.sleepMinutes) || 0)));
    const bedtime = String(payload.bedtime ?? "").trim().slice(0, 20);
    const wakeTime = String(payload.wakeTime ?? "").trim().slice(0, 20);
    if (!DATE_PATTERN.test(date)) return Response.json({ error: "Fecha inválida." }, { status: 400 });
    await db.insert(dailyCheckins).values({ userEmail: user.email, entryDate: date, sleepMinutes, bedtime, wakeTime })
      .onConflictDoUpdate({ target: [dailyCheckins.userEmail, dailyCheckins.entryDate], set: { sleepMinutes, bedtime, wakeTime, updatedAt: sql`CURRENT_TIMESTAMP` } });
    return Response.json({ ok: true });
  }

  if (action === "add_focus_project") {
    const name = String(payload.name ?? "").trim().slice(0, 80);
    const kind = String(payload.kind ?? "study");
    if (!name || !["study", "work"].includes(kind)) return Response.json({ error: "Completá el nombre y el tipo." }, { status: 400 });
    await db.insert(focusProjects).values({ userEmail: user.email, name, kind: kind as "study" | "work" }).onConflictDoNothing();
    return Response.json({ ok: true });
  }

  if (action === "add_focus_session") {
    const projectId = Number(payload.projectId);
    const date = String(payload.date ?? "");
    const minutes = Math.max(1, Math.min(1440, Math.round(Number(payload.minutes) || 0)));
    const note = String(payload.note ?? "").trim().slice(0, 1000);
    const project = await db.select({ id: focusProjects.id }).from(focusProjects).where(and(eq(focusProjects.id, projectId), eq(focusProjects.userEmail, user.email))).limit(1);
    if (!project[0] || !DATE_PATTERN.test(date)) return Response.json({ error: "Elegí un proyecto y una fecha válidos." }, { status: 400 });
    await db.delete(focusSessions).where(and(eq(focusSessions.userEmail, user.email), eq(focusSessions.projectId, projectId), eq(focusSessions.sessionDate, date)));
    await db.insert(focusSessions).values({ userEmail: user.email, projectId, sessionDate: date, minutes, note });
    return Response.json({ ok: true });
  }

  if (action === "add_task") {
    const title = String(payload.title ?? "").trim().slice(0, 180);
    const projectId = Number(payload.projectId) || null;
    const dueDate = String(payload.dueDate ?? "");
    if (!title || (dueDate && !DATE_PATTERN.test(dueDate))) return Response.json({ error: "Completá una tarea y una fecha válida." }, { status: 400 });
    if (projectId) {
      const project = await db.select({ id: focusProjects.id }).from(focusProjects).where(and(eq(focusProjects.id, projectId), eq(focusProjects.userEmail, user.email))).limit(1);
      if (!project[0]) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }
    await db.insert(tasks).values({ userEmail: user.email, projectId, title, dueDate: dueDate || null });
    return Response.json({ ok: true });
  }

  if (action === "toggle_task") {
    const id = Number(payload.id);
    await db.update(tasks).set({ completedAt: Boolean(payload.completed) ? sql`CURRENT_TIMESTAMP` : null }).where(and(eq(tasks.id, id), eq(tasks.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "delete_task") {
    const id = Number(payload.id);
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "add_event") {
    const title = String(payload.title ?? "").trim().slice(0, 180);
    const eventDate = String(payload.eventDate ?? "");
    const eventTime = String(payload.eventTime ?? "").trim().slice(0, 10);
    const category = String(payload.category ?? "personal");
    const notes = String(payload.notes ?? "").trim().slice(0, 1500);
    if (!title || !DATE_PATTERN.test(eventDate) || !["personal", "study", "work", "training", "health", "other"].includes(category)) return Response.json({ error: "Completá un evento válido." }, { status: 400 });
    await db.insert(calendarEvents).values({ userEmail: user.email, title, eventDate, eventTime, category: category as "personal" | "study" | "work" | "training" | "health" | "other", notes });
    return Response.json({ ok: true });
  }

  if (action === "delete_event") {
    const id = Number(payload.id);
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "add_meal") {
    const date = String(payload.date ?? "");
    const name = String(payload.name ?? "").trim();
    const detail = String(payload.detail ?? "").trim();
    const calories = Math.max(0, Math.min(10000, Number(payload.calories) || 0));
    const protein = Math.max(0, Math.min(1000, Number(payload.protein) || 0));
    const carbs = Math.max(0, Math.min(2000, Number(payload.carbs) || 0));
    const fat = Math.max(0, Math.min(1000, Number(payload.fat) || 0));
    if (!DATE_PATTERN.test(date) || !name) return Response.json({ error: "Completá el nombre y la fecha." }, { status: 400 });
    await db.insert(meals).values({ userEmail: user.email, mealDate: date, name, detail, calories, protein, carbs, fat });
    return Response.json({ ok: true });
  }

  if (action === "delete_meal") {
    const id = Number(payload.id);
    await db.delete(meals).where(and(eq(meals.id, id), eq(meals.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "save_diet_plan") {
    const age = Math.round(Number(payload.age) || 0);
    const sex = String(payload.sex ?? "unspecified");
    const heightCm = Math.round(Number(payload.heightCm) || 0);
    const currentWeightDeciKg = Math.round((Number(payload.currentWeightKg) || 0) * 10);
    const targetWeightDeciKg = Math.round((Number(payload.targetWeightKg) || 0) * 10);
    const activityLevel = String(payload.activityLevel ?? "light");
    const goalPace = String(payload.goalPace ?? "gentle");
    const preferences = String(payload.preferences ?? "").trim().slice(0, 500);
    const details = String(payload.details ?? "").trim().slice(0, 2000);
    const targetCalories = Math.round(Number(payload.targetCalories) || 0);
    const plan = payload.plan;
    if (age < 18 || age > 100 || heightCm < 120 || heightCm > 230 || currentWeightDeciKg < 350 || currentWeightDeciKg > 3000 || targetWeightDeciKg < 350 || targetWeightDeciKg > 3000) {
      return Response.json({ error: "Revisá edad, altura y pesos antes de guardar." }, { status: 400 });
    }
    if (!['female', 'male', 'unspecified'].includes(sex) || !['sedentary', 'light', 'moderate', 'high'].includes(activityLevel) || !['gentle', 'moderate'].includes(goalPace)) {
      return Response.json({ error: "La configuración del plan no es válida." }, { status: 400 });
    }
    if (!plan || typeof plan !== "object" || targetCalories < 1000 || targetCalories > 6000) {
      return Response.json({ error: "Generá un plan válido antes de guardarlo." }, { status: 400 });
    }
    const values = {
      userEmail: user.email,
      age,
      sex: sex as "female" | "male" | "unspecified",
      heightCm,
      currentWeightDeciKg,
      targetWeightDeciKg,
      activityLevel: activityLevel as "sedentary" | "light" | "moderate" | "high",
      goalPace: goalPace as "gentle" | "moderate",
      preferences,
      details,
      targetCalories,
      planJson: JSON.stringify(plan).slice(0, 30000),
    };
    await db.insert(dietPlans).values(values).onConflictDoUpdate({
      target: dietPlans.userEmail,
      set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
    return Response.json({ ok: true });
  }

  if (action === "add_book") {
    const title = String(payload.title ?? "").trim();
    const author = String(payload.author ?? "").trim();
    const status = ["reading", "read", "wishlist"].includes(String(payload.status)) ? String(payload.status) as "reading" | "read" | "wishlist" : "reading";
    const totalPages = Math.max(0, Math.min(20000, Number(payload.totalPages) || 0));
    const coverUrl = String(payload.coverUrl ?? "").trim().slice(0, 1000);
    const externalKey = String(payload.externalKey ?? "").trim().slice(0, 300);
    if (!title) return Response.json({ error: "Ingresá el título del libro." }, { status: 400 });
    await db.insert(books).values({ userEmail: user.email, title, author, status, totalPages, currentPage: status === "read" ? totalPages : 0, coverUrl, externalKey });
    return Response.json({ ok: true });
  }

  if (action === "set_pages") {
    const bookId = Number(payload.bookId);
    const date = String(payload.date ?? "");
    const pages = Math.max(0, Math.min(5000, Number(payload.pages) || 0));
    const requestedMinutes = payload.minutes === undefined ? null : Math.max(0, Math.min(1440, Number(payload.minutes) || 0));
    if (!bookId || !DATE_PATTERN.test(date)) return Response.json({ error: "Datos de lectura inválidos." }, { status: 400 });
    const owned = await db.select({ id: books.id, currentPage: books.currentPage, totalPages: books.totalPages }).from(books).where(and(eq(books.id, bookId), eq(books.userEmail, user.email))).limit(1);
    if (!owned[0]) return Response.json({ error: "Libro no encontrado." }, { status: 404 });
    const previous = await db.select({ pages: readingLogs.pages, minutes: readingLogs.minutes }).from(readingLogs).where(and(eq(readingLogs.userEmail, user.email), eq(readingLogs.bookId, bookId), eq(readingLogs.logDate, date))).limit(1);
    const minutes = requestedMinutes ?? previous[0]?.minutes ?? 0;
    const delta = pages - (previous[0]?.pages ?? 0);
    const nextCurrentPage = Math.max(0, owned[0].totalPages ? Math.min(owned[0].totalPages, owned[0].currentPage + delta) : owned[0].currentPage + delta);
    await db.insert(readingLogs).values({ userEmail: user.email, bookId, logDate: date, pages, minutes })
      .onConflictDoUpdate({ target: [readingLogs.userEmail, readingLogs.bookId, readingLogs.logDate], set: { pages, minutes, updatedAt: sql`CURRENT_TIMESTAMP` } });
    await db.update(books).set({ currentPage: nextCurrentPage }).where(and(eq(books.id, bookId), eq(books.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "add_note") {
    const bookId = Number(payload.bookId);
    const content = String(payload.content ?? "").trim();
    const owned = await db.select({ id: books.id }).from(books).where(and(eq(books.id, bookId), eq(books.userEmail, user.email))).limit(1);
    if (!owned[0] || !content) return Response.json({ error: "Elegí un libro y escribí una nota." }, { status: 400 });
    await db.insert(bookNotes).values({ userEmail: user.email, bookId, content });
    return Response.json({ ok: true });
  }

  if (action === "update_book_status") {
    const bookId = Number(payload.bookId);
    const status = String(payload.status);
    if (!["reading", "read", "wishlist"].includes(status)) return Response.json({ error: "Estado inválido." }, { status: 400 });
    await db.update(books).set({ status: status as "reading" | "read" | "wishlist" }).where(and(eq(books.id, bookId), eq(books.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "set_priorities") {
    const monthKey = String(payload.monthKey ?? "");
    const normalizeWeight = (value: unknown) => Math.max(1, Math.min(3, Math.round(Number(value) || 2)));
    if (!MONTH_PATTERN.test(monthKey)) return Response.json({ error: "Mes inválido." }, { status: 400 });
    const gymWeight = normalizeWeight(payload.gymWeight);
    const nutritionWeight = normalizeWeight(payload.nutritionWeight);
    const readingWeight = normalizeWeight(payload.readingWeight);
    const sleepWeight = normalizeWeight(payload.sleepWeight);
    const focusWeight = normalizeWeight(payload.focusWeight);
    const goalsWeight = normalizeWeight(payload.goalsWeight);
    await db.insert(monthlyPriorities).values({ userEmail: user.email, monthKey, gymWeight, nutritionWeight, readingWeight, sleepWeight, focusWeight, goalsWeight })
      .onConflictDoUpdate({ target: [monthlyPriorities.userEmail, monthlyPriorities.monthKey], set: { gymWeight, nutritionWeight, readingWeight, sleepWeight, focusWeight, goalsWeight, updatedAt: sql`CURRENT_TIMESTAMP` } });
    return Response.json({ ok: true });
  }

  if (action === "add_goal") {
    const title = String(payload.title ?? "").trim();
    const period = String(payload.period);
    const category = String(payload.category);
    const targetDate = String(payload.targetDate ?? "");
    if (!title || title.length > 180) return Response.json({ error: "Escribí un objetivo más breve." }, { status: 400 });
    if (!["weekly", "monthly", "annual", "custom"].includes(period)) return Response.json({ error: "Plazo inválido." }, { status: 400 });
    if (!["general", "gym", "training", "nutrition", "reading", "study", "work", "sleep", "score", "calendar", "stats", "goals"].includes(category)) return Response.json({ error: "Categoría inválida." }, { status: 400 });
    if (!DATE_PATTERN.test(targetDate)) return Response.json({ error: "Elegí una fecha válida." }, { status: 400 });
    await db.insert(goals).values({
      userEmail: user.email,
      title,
      period: period as "weekly" | "monthly" | "annual" | "custom",
      category: category as "general" | "gym" | "training" | "nutrition" | "reading" | "study" | "work" | "sleep" | "score" | "calendar" | "stats" | "goals",
      targetDate,
    });
    return Response.json({ ok: true });
  }

  if (action === "toggle_goal") {
    const id = Number(payload.id);
    const completed = Boolean(payload.completed);
    if (!id) return Response.json({ error: "Objetivo inválido." }, { status: 400 });
    await db.update(goals).set({ completedAt: completed ? sql`CURRENT_TIMESTAMP` : null }).where(and(eq(goals.id, id), eq(goals.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "delete_goal") {
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "Objetivo inválido." }, { status: 400 });
    await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userEmail, user.email)));
    return Response.json({ ok: true });
  }

  if (action === "apply_voice_checkin") {
    const date = String(payload.date ?? "");
    const raw = payload.checkin;
    if (!DATE_PATTERN.test(date) || !raw || typeof raw !== "object" || Array.isArray(raw)) return Response.json({ error: "El cierre diario no es válido." }, { status: 400 });
    const checkin = raw as Record<string, unknown>;
    const objectValue = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const clamp = (value: unknown, maximum: number) => Math.max(0, Math.min(maximum, Math.round(Number(value) || 0)));
    const gym = objectValue(checkin.gym);
    const reading = objectValue(checkin.reading);
    const study = objectValue(checkin.study);
    const sleep = objectValue(checkin.sleep);

    if (gym.attended === true) {
      await db.insert(gymAttendance).values({ userEmail: user.email, attendedDate: date }).onConflictDoNothing();
    }

    const mealRows = Array.isArray(checkin.meals) ? checkin.meals.slice(0, 8) : [];
    for (const rawMeal of mealRows) {
      const meal = objectValue(rawMeal);
      const name = String(meal.name ?? "").trim().slice(0, 80);
      if (!name) continue;
      await db.insert(meals).values({
        userEmail: user.email, mealDate: date, name, detail: String(meal.detail ?? "").trim().slice(0, 300),
        calories: clamp(meal.calories, 10000), protein: clamp(meal.protein, 1000), carbs: clamp(meal.carbs, 2000), fat: clamp(meal.fat, 1000),
      });
    }

    const bookTitle = String(reading.bookTitle ?? "").trim().slice(0, 150);
    const pages = clamp(reading.pages, 5000);
    const readingMinutes = clamp(reading.minutes, 1440);
    const readingNote = String(reading.note ?? "").trim().slice(0, 2000);
    if (bookTitle || pages || readingMinutes || readingNote) {
      let owned = bookTitle ? await db.select().from(books).where(and(eq(books.userEmail, user.email), sql`lower(${books.title}) = ${bookTitle.toLowerCase()}`)).limit(1) : [];
      if (!owned[0]) owned = await db.select().from(books).where(and(eq(books.userEmail, user.email), eq(books.status, "reading"))).orderBy(desc(books.createdAt)).limit(1);
      if (!owned[0] && bookTitle) {
        await db.insert(books).values({ userEmail: user.email, title: bookTitle, status: "reading" });
        owned = await db.select().from(books).where(and(eq(books.userEmail, user.email), sql`lower(${books.title}) = ${bookTitle.toLowerCase()}`)).orderBy(desc(books.id)).limit(1);
      }
      const book = owned[0];
      if (book) {
        const previous = await db.select().from(readingLogs).where(and(eq(readingLogs.userEmail, user.email), eq(readingLogs.bookId, book.id), eq(readingLogs.logDate, date))).limit(1);
        const nextPages = Math.max(previous[0]?.pages ?? 0, pages);
        const delta = nextPages - (previous[0]?.pages ?? 0);
        const nextCurrentPage = Math.max(0, book.totalPages ? Math.min(book.totalPages, book.currentPage + delta) : book.currentPage + delta);
        await db.insert(readingLogs).values({ userEmail: user.email, bookId: book.id, logDate: date, pages: nextPages, minutes: Math.max(previous[0]?.minutes ?? 0, readingMinutes) })
          .onConflictDoUpdate({ target: [readingLogs.userEmail, readingLogs.bookId, readingLogs.logDate], set: { pages: nextPages, minutes: Math.max(previous[0]?.minutes ?? 0, readingMinutes), updatedAt: sql`CURRENT_TIMESTAMP` } });
        await db.update(books).set({ currentPage: nextCurrentPage }).where(and(eq(books.id, book.id), eq(books.userEmail, user.email)));
        if (readingNote) await db.insert(bookNotes).values({ userEmail: user.email, bookId: book.id, content: readingNote });
      }
    }

    const habits = Array.isArray(checkin.habits) ? checkin.habits.slice(0, 12).map((item) => String(item).trim().slice(0, 80)).filter(Boolean) : [];
    const tasks = Array.isArray(study.tasks) ? study.tasks.slice(0, 10).map((item) => String(item).trim()).filter(Boolean) : [];
    const studyDetail = [String(study.detail ?? "").trim(), tasks.length ? `Tareas: ${tasks.join(" · ")}` : ""].filter(Boolean).join(" — ").slice(0, 1500);
    await db.insert(dailyCheckins).values({
      userEmail: user.email, entryDate: date, habitsJson: JSON.stringify(habits), workoutDetail: String(gym.detail ?? "").trim().slice(0, 1500),
      studyMinutes: clamp(study.minutes, 1440), studyDetail, sleepMinutes: clamp(sleep.minutes, 1440), bedtime: String(sleep.bedtime ?? "").trim().slice(0, 20), wakeTime: String(sleep.wakeTime ?? "").trim().slice(0, 20),
      waterMl: clamp(checkin.waterMl, 20000), journal: String(checkin.journal ?? "").trim().slice(0, 4000), transcript: String(checkin.transcript ?? "").trim().slice(0, 8000), voiceSummary: String(checkin.summary ?? "").trim().slice(0, 1000),
    }).onConflictDoUpdate({ target: [dailyCheckins.userEmail, dailyCheckins.entryDate], set: {
      habitsJson: JSON.stringify(habits), workoutDetail: String(gym.detail ?? "").trim().slice(0, 1500), studyMinutes: clamp(study.minutes, 1440), studyDetail,
      sleepMinutes: clamp(sleep.minutes, 1440), bedtime: String(sleep.bedtime ?? "").trim().slice(0, 20), wakeTime: String(sleep.wakeTime ?? "").trim().slice(0, 20), waterMl: clamp(checkin.waterMl, 20000),
      journal: String(checkin.journal ?? "").trim().slice(0, 4000), transcript: String(checkin.transcript ?? "").trim().slice(0, 8000), voiceSummary: String(checkin.summary ?? "").trim().slice(0, 1000), updatedAt: sql`CURRENT_TIMESTAMP`,
    } });

    const goalRows = Array.isArray(checkin.goals) ? checkin.goals.slice(0, 5) : [];
    for (const rawGoal of goalRows) {
      const goal = objectValue(rawGoal); const title = String(goal.title ?? "").trim().slice(0, 180); const period = String(goal.period); const category = String(goal.category); const targetDate = String(goal.targetDate ?? "");
      if (title && ["weekly", "monthly", "annual", "custom"].includes(period) && ["general", "gym", "nutrition", "reading"].includes(category) && DATE_PATTERN.test(targetDate)) {
        await db.insert(goals).values({ userEmail: user.email, title, period: period as "weekly" | "monthly" | "annual" | "custom", category: category as "general" | "gym" | "nutrition" | "reading", targetDate });
      }
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción desconocida." }, { status: 400 });
}

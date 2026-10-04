import type { SessionUser } from "@/server/auth/session";
import { updateAuthMetadata } from "@/server/auth/session";
import { insertRows, selectRows } from "@/server/db/postgrest";
import { today, type ProgressRow } from "@/server/db/rows";
import type { Timing } from "@/server/http";
import { DATE, MONTH, daysBefore, stringArray } from "@/domain/validation";
import { profilePreferences, profileSeenAnnouncements } from "@/domain/profile-metadata";

/** Columnas del historial de sueño que usa la app (las transcripciones y diarios de voz no viajan). */
const CHECKIN_HISTORY_COLUMNS = ["id", "entryDate", "sleepMinutes", "bedtime", "wakeTime", "sleepQuality"];
const DEFAULT_DISCIPLINES = [{ name: "Gimnasio", kind: "strength" }, { name: "Running", kind: "running" }];

/**
 * Todo lo que necesita la app al abrir: una sola tanda de consultas en
 * paralelo, sin escrituras salvo el primer ingreso (perfil y disciplinas por
 * defecto). Devuelve las mismas claves de siempre: hay PWAs instaladas que las esperan.
 */
export async function readSnapshot(user: SessionUser, params: URLSearchParams, timing: Timing) {
  const email = user.email;
  const date = DATE.test(params.get("date") ?? "") ? String(params.get("date")) : today();
  const weekStart = DATE.test(params.get("weekStart") ?? "") ? String(params.get("weekStart")) : date;
  const weekEnd = DATE.test(params.get("weekEnd") ?? "") ? String(params.get("weekEnd")) : date;
  const monthKey = MONTH.test(params.get("month") ?? "") ? String(params.get("month")) : date.slice(0, 7);
  const start = daysBefore(date, 5 * 366);
  const optional = (rows: Promise<ProgressRow[]>) => rows.catch(() => [] as ProgressRow[]);

  const [
    profiles, disciplineRows, trainingLogs, exerciseLogs, mealHistory, dietPlans, books, readingHistory, notes,
    priorityHistory, goals, dailyCheckins, todayCheckins, focusProjects, focusSessions, tasks, events, resources, resourceNotes,
  ] = await Promise.all([
    selectRows<ProgressRow>("profiles", { where: { email }, limit: 1 }),
    selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] }),
    selectRows<ProgressRow>("training_logs", { where: { userEmail: email }, gte: { trainingDate: start }, lte: { trainingDate: date }, order: [["trainingDate", "desc"], ["id", "desc"]] }),
    selectRows<ProgressRow>("exercise_logs", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
    selectRows<ProgressRow>("meals", { where: { userEmail: email }, gte: { mealDate: start }, lte: { mealDate: date }, order: [["mealDate", "desc"]] }),
    selectRows<ProgressRow>("diet_plans", { where: { userEmail: email }, limit: 1 }),
    selectRows<ProgressRow>("books", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
    selectRows<ProgressRow>("reading_logs", { where: { userEmail: email }, gte: { logDate: start }, lte: { logDate: date }, order: [["logDate", "desc"]] }),
    selectRows<ProgressRow>("book_notes", { where: { userEmail: email }, order: [["createdAt", "desc"]] }),
    selectRows<ProgressRow>("monthly_priorities", { where: { userEmail: email }, order: [["monthKey", "asc"]] }),
    selectRows<ProgressRow>("goals", { where: { userEmail: email }, order: [["completedAt", "asc"], ["targetDate", "asc"], ["createdAt", "desc"]] }),
    selectRows<ProgressRow>("daily_checkins", { where: { userEmail: email }, gte: { entryDate: start }, lte: { entryDate: date }, order: [["entryDate", "desc"]], columns: CHECKIN_HISTORY_COLUMNS }),
    selectRows<ProgressRow>("daily_checkins", { where: { userEmail: email, entryDate: date }, limit: 1 }),
    selectRows<ProgressRow>("focus_projects", { where: { userEmail: email }, order: [["createdAt", "asc"]] }),
    selectRows<ProgressRow>("focus_sessions", { where: { userEmail: email }, gte: { sessionDate: start }, lte: { sessionDate: date }, order: [["sessionDate", "desc"]] }),
    selectRows<ProgressRow>("tasks", { where: { userEmail: email }, order: [["completedAt", "asc"], ["dueDate", "asc"], ["createdAt", "desc"]] }),
    selectRows<ProgressRow>("calendar_events", { where: { userEmail: email }, order: [["eventDate", "asc"], ["eventTime", "asc"]] }),
    // Tablas opcionales (supabase/study-resources.sql): si todavía no se crearon, la app sigue andando con la lista vacía.
    optional(selectRows<ProgressRow>("study_resources", { where: { userEmail: email }, order: [["createdAt", "desc"]] })),
    optional(selectRows<ProgressRow>("resource_notes", { where: { userEmail: email }, order: [["createdAt", "desc"]] })),
  ]);
  timing.mark("queries");

  // Primer ingreso: recién acá se escribe algo.
  let profile = profiles[0];
  if (!profile) {
    profile = (await insertRows<ProgressRow>("profiles", { email, displayName: user.displayName }, { upsert: true, onConflict: ["email"], returnRows: true }))[0];
  }
  let disciplines = disciplineRows;
  if (!disciplines.length) {
    await insertRows("training_disciplines", DEFAULT_DISCIPLINES.map((item) => ({ userEmail: email, ...item })), { upsert: true, onConflict: ["userEmail", "name"], ignoreDuplicates: true });
    disciplines = await selectRows<ProgressRow>("training_disciplines", { where: { userEmail: email }, order: [["createdAt", "asc"], ["id", "asc"]] });
  }
  if (profile?.onboardingCompleted && !user.onboardingCompleted) {
    void updateAuthMetadata({ displayName: profile.displayName, onboardingCompleted: true, mainGoals: stringArray(profile.mainGoalsJson), usagePreferences: profilePreferences(profile.usagePreferencesJson) });
  }
  timing.mark("first_run");

  // Un libro "leyendo" que ya llegó a su última página se muestra como leído
  // (set_pages lo guarda así; esto cubre registros viejos sin escribir en una lectura).
  const visibleBooks = books.map((book) => String(book.status) === "reading" && Number(book.totalPages) > 0 && Number(book.currentPage) >= Number(book.totalPages) ? { ...book, status: "read" } : book);
  const strength = disciplines.find((row) => row.kind === "strength");
  const priorities = priorityHistory.find((row) => row.monthKey === monthKey);
  const todayCheckin = todayCheckins[0] ?? null;

  return {
    profile: {
      email,
      displayName: profile?.displayName ?? user.displayName,
      username: String(profile?.username ?? ""),
      avatarUrl: String(profile?.avatarUrl ?? ""),
      onboardingCompleted: Boolean(profile?.onboardingCompleted || user.onboardingCompleted),
      mainGoals: profile?.onboardingCompleted ? stringArray(profile.mainGoalsJson) : user.mainGoals,
      usagePreferences: profile?.onboardingCompleted ? profilePreferences(profile.usagePreferencesJson) : user.usagePreferences,
      seenAnnouncements: profileSeenAnnouncements(profile?.usagePreferencesJson),
      isPro: Boolean(profile?.proSince),
      proSince: profile?.proSince ?? "",
      focusDailyTargetMinutes: Math.max(30, Math.min(720, Math.round(Number(profile?.focusDailyTargetMinutes) || 120))),
    },
    gymDates: strength ? trainingLogs.filter((row) => row.disciplineId === strength.id && row.trainingDate >= weekStart && row.trainingDate <= weekEnd).map((row) => row.trainingDate) : [],
    disciplines,
    trainingLogs,
    exerciseLogs,
    // "De hoy" sale del historial: mismas filas, una consulta menos.
    meals: mealHistory.filter((row) => row.mealDate === date).sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt))),
    mealHistory,
    dietPlan: dietPlans[0] ?? null,
    books: visibleBooks,
    readingLogs: readingHistory.filter((row) => row.logDate === date),
    readingHistory,
    notes,
    priorities: priorities ?? { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 },
    priorityHistory,
    goals,
    dailyCheckin: todayCheckin,
    dailyCheckins: todayCheckin ? dailyCheckins.map((row) => row.entryDate === date ? todayCheckin : row) : dailyCheckins,
    focusProjects,
    focusSessions,
    tasks,
    events,
    resources,
    resourceNotes,
  };
}

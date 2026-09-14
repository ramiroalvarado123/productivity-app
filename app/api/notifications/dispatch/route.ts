import webpush from "web-push";
import { SUPABASE_URL } from "../../../lib/supabase-auth";
import { inferTaskCategory } from "../../../lib/schedule";
import { scoreForDay, trainingContribution, type DayRecord, type ScoreWeights } from "../../../lib/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Candidate = {
  email: string;
  kind: string;
  referenceKey: string;
  title: string;
  body: string;
  url: string;
};

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
const DEFAULT_VAPID_PUBLIC_KEY = "BFjo70YM_MZxUr28GKf0hneZBkUyvP-wP1SuyFJcpDXF8XphPUTruryDXucj0c1MlAPool4YiNLqeK8zImedOTQ";
const DAILY_SCORE_NUDGE_KIND = "daily_score_nudge";
const DAILY_SCORE_NUDGE_TIME = "17:00";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  return key;
}

function adminHeaders(extra: Record<string, string> = {}) {
  const key = serviceRoleKey();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
  // Las claves nuevas sb_secret_* sólo deben viajar como apikey.
  // La clave legacy service_role (JWT) necesita también Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  return headers;
}

async function adminRequest(table: string, query = "", init: RequestInit = {}): Promise<Row[]> {
  const url = SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : "");
  let lastError: unknown;
  // Supabase puede rechazar temporalmente una consulta por sincronización de
  // reloj o por un reinicio de la API. Reintentamos antes de marcar el cron
  // como fallido; las operaciones usadas aquí son idempotentes.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...adminHeaders(), ...(init.headers ?? {}) },
        cache: "no-store",
      });
      const text = await response.text();
      if (!response.ok) throw new Error("Supabase " + response.status + ": " + text);
      if (!text) return [];
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? parsed as Row[] : [];
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Supabase request failed");
}

function value(row: Row, key: string) {
  return row[key];
}

function stringValue(row: Row, key: string, fallback = "") {
  const item = value(row, key);
  return typeof item === "string" ? item : item == null ? fallback : String(item);
}

function booleanValue(row: Row, key: string, fallback = false) {
  const item = value(row, key);
  return typeof item === "boolean" ? item : fallback;
}

function numberValue(row: Row, key: string, fallback = 0) {
  const item = Number(value(row, key));
  return Number.isFinite(item) ? item : fallback;
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

function safeTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localClock(now: Date, timeZone: string) {
  const zone = safeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const numericHour = Number(part("hour")) % 24;
  return {
    date: part("year") + "-" + part("month") + "-" + part("day"),
    time: pad(numericHour) + ":" + part("minute"),
    weekday: part("weekday"),
  };
}

function dueWithinWindow(current: string, configured: string) {
  const target = validTime(configured);
  if (!target) return false;
  const currentMinutes = Number(current.slice(0, 2)) * 60 + Number(current.slice(3, 5));
  const targetMinutes = Number(target.slice(0, 2)) * 60 + Number(target.slice(3, 5));
  return (currentMinutes - targetMinutes + 1440) % 1440 < 15;
}

function addDays(isoDate: string, amount: number) {
  const date = new Date(isoDate + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: string, month: string) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

type DailyScoreRows = {
  profiles: Row[];
  disciplines: Row[];
  trainingLogs: Row[];
  calendarEvents: Row[];
  tasks: Row[];
  meals: Row[];
  dietPlans: Row[];
  dailyCheckins: Row[];
  readingLogs: Row[];
  focusSessions: Row[];
  goals: Row[];
  priorities: Row[];
};

const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  gymWeight: 2,
  nutritionWeight: 2,
  sleepWeight: 2,
  focusWeight: 2,
  readingWeight: 2,
  goalsWeight: 2,
};

function localDatePart(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function normalizedPlanText(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function planDisciplineIdForRow(event: Row, disciplines: Row[]) {
  const explicit = numberValue(event, "discipline_id");
  if (explicit && disciplines.some((row) => numberValue(row, "id") === explicit)) return explicit;
  const title = normalizedPlanText(stringValue(event, "title"));
  if (title.length < 3) return 0;
  const named = disciplines.find((row) => {
    const name = normalizedPlanText(stringValue(row, "name"));
    return name.includes(title) || title.includes(name) || name.startsWith(title) || title.startsWith(name);
  });
  if (named) return numberValue(named, "id");
  const inferredKind = /gim|gym|pesas|fuerza/.test(title) ? "strength"
    : /correr|running/.test(title) ? "running"
    : /bici|ciclismo/.test(title) ? "cycling"
    : /nadar|natacion/.test(title) ? "swimming"
    : "";
  const candidates = inferredKind ? disciplines.filter((row) => stringValue(row, "kind") === inferredKind) : [];
  return candidates.length === 1 ? numberValue(candidates[0], "id") : 0;
}

function weightsFromRow(row: Row | undefined): ScoreWeights {
  return {
    gymWeight: numberValue(row ?? {}, "gym_weight", 2),
    nutritionWeight: numberValue(row ?? {}, "nutrition_weight", 2),
    sleepWeight: numberValue(row ?? {}, "sleep_weight", 2),
    focusWeight: numberValue(row ?? {}, "focus_weight", 2),
    readingWeight: numberValue(row ?? {}, "reading_weight", 2),
    goalsWeight: numberValue(row ?? {}, "goals_weight", 2),
  };
}

/**
 * Reconstruye el Daily Score con los mismos registros y fórmula que usa la
 * interfaz. No guarda ningún resultado: el scheduler calcula el puntaje al
 * momento de decidir si debe enviar el aviso.
 */
function dailyScoreForDate(email: string, date: string, source: DailyScoreRows) {
  const disciplines = source.disciplines.filter((row) => stringValue(row, "user_email") === email);
  const disciplinePriority = new Map<number, string>(
    disciplines.map((row) => [numberValue(row, "id"), stringValue(row, "priority")]),
  );
  const trainingLogs = source.trainingLogs.filter((row) =>
    stringValue(row, "user_email") === email && stringValue(row, "training_date") === date,
  );
  const calendarEvents = source.calendarEvents.filter((row) =>
    stringValue(row, "user_email") === email
    && stringValue(row, "event_date") === date
    && localDatePart(value(row, "completed_at")) !== "",
  );
  const tasks = source.tasks.filter((row) =>
    stringValue(row, "user_email") === email && stringValue(row, "due_date") === date,
  );
  const completedTrainingTasks = tasks.filter((row) =>
    value(row, "project_id") == null
    && localDatePart(value(row, "completed_at")) !== ""
    && numberValue(row, "duration_minutes") > 0
    && inferTaskCategory(stringValue(row, "title")) === "training",
  );

  const seenTraining = new Set<string>();
  let trainingScore = 0;
  for (const row of trainingLogs) {
    const disciplineId = numberValue(row, "discipline_id");
    const key = date + ":" + disciplineId;
    if (seenTraining.has(key)) continue;
    seenTraining.add(key);
    trainingScore += trainingContribution(
      disciplinePriority.get(disciplineId) === "secondary" ? "secondary" : "important",
      value(row, "quality") == null ? null : numberValue(row, "quality"),
    );
  }
  let unlinkedPlanTraining = 0;
  for (const event of calendarEvents.filter((row) => stringValue(row, "category") === "training")) {
    const disciplineId = planDisciplineIdForRow(event, disciplines);
    if (!disciplineId) {
      trainingScore += 0.5;
      unlinkedPlanTraining += 1;
      continue;
    }
    const key = date + ":" + disciplineId;
    if (seenTraining.has(key)) continue;
    seenTraining.add(key);
    trainingScore += trainingContribution(
      disciplinePriority.get(disciplineId) === "secondary" ? "secondary" : "important",
      value(event, "quality") == null ? null : numberValue(event, "quality"),
    );
  }
  trainingScore = Math.min(1, trainingScore + completedTrainingTasks.length * 0.5);

  const seenFocus = new Set<string>();
  const manualFocusByProject = new Map<number, number>();
  const plannedFocusByProject = new Map<number, number>();
  for (const row of source.focusSessions) {
    if (stringValue(row, "user_email") !== email || stringValue(row, "session_date") !== date) continue;
    const id = String(value(row, "id"));
    if (seenFocus.has(id)) continue;
    seenFocus.add(id);
    const projectId = numberValue(row, "project_id");
    if (!projectId) continue;
    manualFocusByProject.set(projectId, (manualFocusByProject.get(projectId) ?? 0) + numberValue(row, "minutes"));
  }
  for (const row of tasks) {
    const projectId = numberValue(row, "project_id");
    if (!projectId || localDatePart(value(row, "completed_at")) === "" || numberValue(row, "duration_minutes") <= 0) continue;
    plannedFocusByProject.set(projectId, (plannedFocusByProject.get(projectId) ?? 0) + numberValue(row, "duration_minutes"));
  }
  let focusMinutes = [...new Set([...manualFocusByProject.keys(), ...plannedFocusByProject.keys()])]
    .reduce((sum, projectId) => sum + Math.max(manualFocusByProject.get(projectId) ?? 0, plannedFocusByProject.get(projectId) ?? 0), 0);
  focusMinutes += calendarEvents
    .filter((row) => stringValue(row, "category") === "study" || stringValue(row, "category") === "work")
    .reduce((sum, row) => sum + numberValue(row, "duration_minutes"), 0);

  const sleepMinutes = source.dailyCheckins
    .filter((row) => stringValue(row, "user_email") === email && stringValue(row, "entry_date") === date && numberValue(row, "sleep_minutes") > 0)
    .reduce((sum, row) => sum + numberValue(row, "sleep_minutes"), 0);
  const pages = source.readingLogs
    .filter((row) => stringValue(row, "user_email") === email && stringValue(row, "log_date") === date)
    .reduce((sum, row) => sum + numberValue(row, "pages"), 0);
  const mealRows = source.meals.filter((row) =>
    stringValue(row, "user_email") === email && stringValue(row, "meal_date") === date,
  );
  const meals = mealRows.length;
  const calories = mealRows.reduce((sum, row) => sum + numberValue(row, "calories"), 0);
  const targetCalories = numberValue(
    source.dietPlans.find((row) => stringValue(row, "user_email") === email) ?? {},
    "target_calories",
  );
  const completedSomething = source.goals.some((row) =>
    stringValue(row, "user_email") === email && localDatePart(value(row, "completed_at")) === date,
  ) || tasks.some((row) => localDatePart(value(row, "completed_at")) !== "")
    || calendarEvents.length > 0;
  const hasOpenGoals = source.goals.some((row) => {
    if (stringValue(row, "user_email") !== email) return false;
    const created = localDatePart(value(row, "created_at"));
    const completed = localDatePart(value(row, "completed_at"));
    return Boolean(created) && created <= date && (!completed || completed >= date);
  });
  const priority = source.priorities.find((row) =>
    stringValue(row, "user_email") === email && stringValue(row, "month_key") === date.slice(0, 7),
  );
  const profile = source.profiles.find((row) => stringValue(row, "email") === email);
  const focusTargetMinutes = Math.max(30, Math.min(720, Math.round(numberValue(profile ?? {}, "focus_daily_target_minutes", 120))));
  const day: DayRecord = {
    trainingSessions: seenTraining.size + completedTrainingTasks.length + unlinkedPlanTraining,
    trainingScore: trainingScore * 100,
    meals,
    calories,
    targetCalories,
    sleepMinutes,
    focusMinutes,
    focusTargetMinutes,
    pages,
    completedSomething,
    hasOpenGoals,
  };
  return scoreForDay(day, priority ? weightsFromRow(priority) : DEFAULT_SCORE_WEIGHTS);
}

function referenceQuery(email: string, kind: string, referenceKey: string) {
  return new URLSearchParams({
    user_email: "eq." + email,
    kind: "eq." + kind,
    reference_key: "eq." + referenceKey,
  }).toString();
}

async function claimDelivery(candidate: Candidate) {
  const rows = await adminRequest(
    "notification_deliveries",
    new URLSearchParams({ on_conflict: "user_email,kind,reference_key" }).toString(),
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify([{
        user_email: candidate.email,
        kind: candidate.kind,
        reference_key: candidate.referenceKey,
      }]),
    },
  );
  return rows.length > 0;
}

async function releaseDelivery(candidate: Candidate) {
  await adminRequest(
    "notification_deliveries",
    referenceQuery(candidate.email, candidate.kind, candidate.referenceKey),
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

function isExpiredPushError(error: unknown) {
  const statusCode = Number((error as { statusCode?: unknown })?.statusCode);
  return statusCode === 400 || statusCode === 404 || statusCode === 410;
}

function notificationFor(candidate: Candidate) {
  return JSON.stringify({
    title: candidate.title,
    body: candidate.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: candidate.kind + ":" + candidate.referenceKey,
    // La ruta debe ser relativa: así una notificación recibida en la app
    // instalada conserva el origen de esa app y no salta a Safari u otro deploy.
    url: candidate.url,
    data: { url: candidate.url },
  });
}

async function sendCandidate(candidate: Candidate, subscriptions: Row[]) {
  if (!subscriptions.length) return { sent: 0, expired: 0, failed: 0, errors: [] as string[] };
  if (!(await claimDelivery(candidate))) return { sent: 0, expired: 0, failed: 0, errors: [] as string[] };

  let sent = 0;
  let expired = 0;
  let failed = 0;
  const errors: string[] = [];
  await Promise.all(subscriptions.map(async (row) => {
    const endpoint = stringValue(row, "endpoint");
    const p256dh = stringValue(row, "p256dh");
    const auth = stringValue(row, "auth");
    if (!endpoint || !p256dh || !auth) return;
    try {
      await webpush.sendNotification(
        { endpoint, keys: { p256dh, auth } },
        notificationFor(candidate),
        { TTL: 3600 },
      );
      sent += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: unknown })?.statusCode) || undefined;
      const message = error instanceof Error ? error.message : String(error);
      failed += 1;
      errors.push((statusCode ? statusCode + ": " : "") + message);
      console.error("notifications push send failed", {
        email: candidate.email,
        kind: candidate.kind,
        statusCode,
        message,
      });
      if (isExpiredPushError(error)) {
        expired += 1;
        const id = numberValue(row, "id");
        if (id) {
          await adminRequest(
            "push_subscriptions",
            new URLSearchParams({ id: "eq." + id }).toString(),
            { method: "DELETE", headers: { Prefer: "return=minimal" } },
          );
        }
      }
    }
  }));

  if (!sent) await releaseDelivery(candidate);
  return { sent, expired, failed, errors };
}

function summaryCandidates(email: string, profile: Row, preferences: Row, clock: ReturnType<typeof localClock>) {
  const candidates: Candidate[] = [];
  const [year, month, day] = clock.date.split("-");
  const isLastDay = Number(day) === daysInMonth(year, month);
  const isSunday = clock.weekday === "Sun";
  const isNewYearEve = month === "12" && day === "31";
  const isPro = Boolean(stringValue(profile, "pro_since"));

  if (booleanValue(preferences, "daily_balance_enabled", true) && dueWithinWindow(clock.time, stringValue(preferences, "daily_balance_time", "21:00"))) {
    candidates.push({
      email,
      kind: "daily_balance",
      referenceKey: clock.date,
      title: "Balance del día",
      body: isPro ? "Recuerda hacer el balance de tu día, tomará menos de un minuto." : "Recuerda hacer el balance de tu día.",
      url: "/?section=summary",
    });
  }
  if (booleanValue(preferences, "weekly_summary_enabled", true) && isSunday && dueWithinWindow(clock.time, stringValue(preferences, "weekly_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "weekly_summary",
      referenceKey: clock.date,
      title: "Tu resumen semanal",
      body: "Mira tu progreso, tus rachas y las áreas que conviene acomodar.",
      url: "/?section=stats",
    });
  }
  if (booleanValue(preferences, "monthly_summary_enabled", true) && isLastDay && dueWithinWindow(clock.time, stringValue(preferences, "monthly_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "monthly_summary",
      referenceKey: year + "-" + month,
      title: "Tu resumen mensual",
      body: "Cerrá el mes viendo qué avanzó y qué querés priorizar después.",
      url: "/?section=stats",
    });
  }
  if (booleanValue(preferences, "annual_summary_enabled", true) && isNewYearEve && dueWithinWindow(clock.time, stringValue(preferences, "annual_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "annual_summary",
      referenceKey: year,
      title: "Tu resumen anual",
      body: "Repasá todo lo que construiste este año en AVORA.",
      url: "/?section=stats",
    });
  }
  return candidates;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || authorization !== "Bearer " + expectedSecret) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? DEFAULT_VAPID_PUBLIC_KEY;
    if (!privateKey) throw new Error("Falta VAPID_PRIVATE_KEY en el entorno del servidor.");
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:notifications@avora.app", publicKey, privateKey);

    const searchParams = new URL(request.url).searchParams;
    const testNow = searchParams.get("test_now");
    const onlyDailyScore = searchParams.get("only") === DAILY_SCORE_NUDGE_KIND;
    let now = new Date();
    if (testNow) {
      const parsed = new Date(testNow);
      if (Number.isNaN(parsed.getTime())) return Response.json({ error: "test_now inválido." }, { status: 400 });
      now = parsed;
    }
    const [preferenceRows, subscriptions, profiles, events] = await Promise.all([
      adminRequest("notification_preferences", new URLSearchParams({ push_enabled: "eq.true" }).toString()),
      adminRequest("push_subscriptions"),
      adminRequest("profiles", new URLSearchParams({ select: "email,display_name,pro_since" }).toString()),
      adminRequest("calendar_events", new URLSearchParams({ select: "id,user_email,title,event_date,event_time" }).toString()),
    ]);

    let dailyScoreRows: DailyScoreRows | null = null;
    try {
      const [scoreProfiles, disciplines, trainingLogs, calendarEvents, tasks, meals, dietPlans, dailyCheckins, readingLogs, focusSessions, goals, priorities] = await Promise.all([
        adminRequest("profiles", new URLSearchParams({ select: "email,focus_daily_target_minutes" }).toString()),
        adminRequest("training_disciplines", new URLSearchParams({ select: "id,user_email,name,kind,priority" }).toString()),
        adminRequest("training_logs", new URLSearchParams({ select: "id,user_email,discipline_id,training_date,quality" }).toString()),
        adminRequest("calendar_events", new URLSearchParams({ select: "id,user_email,title,event_date,duration_minutes,category,completed_at,discipline_id,quality" }).toString()),
        adminRequest("tasks", new URLSearchParams({ select: "id,user_email,project_id,due_date,duration_minutes,completed_at,title" }).toString()),
        adminRequest("meals", new URLSearchParams({ select: "id,user_email,meal_date,calories" }).toString()),
        adminRequest("diet_plans", new URLSearchParams({ select: "id,user_email,target_calories" }).toString()),
        adminRequest("daily_checkins", new URLSearchParams({ select: "id,user_email,entry_date,sleep_minutes" }).toString()),
        adminRequest("reading_logs", new URLSearchParams({ select: "id,user_email,log_date,pages" }).toString()),
        adminRequest("focus_sessions", new URLSearchParams({ select: "id,user_email,session_date,minutes" }).toString()),
        adminRequest("goals", new URLSearchParams({ select: "id,user_email,created_at,completed_at" }).toString()),
        adminRequest("monthly_priorities", new URLSearchParams({ select: "id,user_email,month_key,gym_weight,nutrition_weight,sleep_weight,focus_weight,reading_weight,goals_weight" }).toString()),
      ]);
      dailyScoreRows = { profiles: scoreProfiles, disciplines, trainingLogs, calendarEvents, tasks, meals, dietPlans, dailyCheckins, readingLogs, focusSessions, goals, priorities };
    } catch (error) {
      // La alerta nueva no debe interrumpir calendario, balance ni resúmenes
      // si la migración de permisos todavía no fue ejecutada en Supabase.
      console.warn("daily score notification source data unavailable", error);
    }

    const profilesByEmail = new Map(profiles.map((row) => [stringValue(row, "email"), row]));
    const subscriptionsByEmail = new Map<string, Row[]>();
    for (const row of subscriptions) {
      const email = stringValue(row, "user_email");
      const current = subscriptionsByEmail.get(email) ?? [];
      current.push(row);
      const appSubscriptions = current.filter((subscription) => stringValue(subscription, "client_context") === "app");
      subscriptionsByEmail.set(email, appSubscriptions.length ? appSubscriptions : current);
    }
    const eventsByEmail = new Map<string, Row[]>();
    for (const row of events) {
      const email = stringValue(row, "user_email");
      const current = eventsByEmail.get(email) ?? [];
      current.push(row);
      eventsByEmail.set(email, current);
    }

    let usersChecked = 0;
    let candidatesFound = 0;
    let sent = 0;
    let expired = 0;
    let failed = 0;
    const errors: string[] = [];
    const diagnostics: Array<{ timezone: string; date: string; time: string; weekday: string; configuredDailyTime: string; configuredCalendarDaysBefore: number; dailyScoreDue: boolean; dailyScoreReady: boolean; dailyScore?: number; candidates: number }> = [];
    for (const preference of preferenceRows) {
      const email = stringValue(preference, "user_email");
      const userSubscriptions = subscriptionsByEmail.get(email) ?? [];
      if (!email || !userSubscriptions.length) continue;
      usersChecked += 1;
      const profile = profilesByEmail.get(email) ?? {};
      const timezone = stringValue(preference, "timezone", DEFAULT_TIMEZONE);
      const clock = localClock(now, timezone);
      const candidates = onlyDailyScore ? [] : summaryCandidates(email, profile, preference, clock);

      if (!onlyDailyScore && booleanValue(preference, "calendar_enabled", true) && dueWithinWindow(clock.time, stringValue(preference, "calendar_reminder_time", "18:00"))) {
        const daysBefore = Math.max(1, Math.min(30, Math.round(numberValue(preference, "calendar_reminder_days_before", 1))));
        const targetDate = addDays(clock.date, daysBefore);
        const dayLabel = daysBefore === 1 ? "mañana" : "en " + daysBefore + " días";
        for (const event of eventsByEmail.get(email) ?? []) {
          if (stringValue(event, "event_date") !== targetDate) continue;
          const eventId = numberValue(event, "id");
          const title = stringValue(event, "title", "un evento");
          const eventTime = validTime(stringValue(event, "event_time"));
          candidates.push({
            email,
            kind: "calendar_reminder",
            referenceKey: String(eventId) + ":" + targetDate,
            title: "Recordatorio de calendario",
            body: "Recuerda: " + dayLabel + " tienes " + title + (eventTime ? " a las " + eventTime + "." : "."),
            url: "/?section=plan",
          });
        }
      }

      const dailyScoreDue = dueWithinWindow(clock.time, DAILY_SCORE_NUDGE_TIME);
      const dailyScore = dailyScoreDue && dailyScoreRows ? dailyScoreForDate(email, clock.date, dailyScoreRows) : undefined;
      if (dailyScoreDue && dailyScore !== undefined && dailyScore < 50) {
        candidates.push({
          email,
          kind: DAILY_SCORE_NUDGE_KIND,
          referenceKey: clock.date,
          title: "¿Estás desperdiciando tu día?",
          body: "Tu Daily Score sigue por debajo de 50. Todavía estás a tiempo: concentrate y levantá el día.",
          url: "/?section=summary",
        });
      }

      candidatesFound += candidates.length;
      diagnostics.push({
        timezone,
        date: clock.date,
        time: clock.time,
        weekday: clock.weekday,
        configuredDailyTime: stringValue(preference, "daily_balance_time", "21:00"),
        configuredCalendarDaysBefore: Math.max(1, Math.min(30, Math.round(numberValue(preference, "calendar_reminder_days_before", 1)))),
        dailyScoreDue,
        dailyScoreReady: dailyScoreRows !== null,
        ...(dailyScore === undefined ? {} : { dailyScore }),
        candidates: candidates.length,
      });

      for (const candidate of candidates) {
        const result = await sendCandidate(candidate, userSubscriptions);
        sent += result.sent;
        expired += result.expired;
        failed += result.failed;
        errors.push(...result.errors);
      }
    }

    return Response.json({
      ok: true,
      checkedAt: now.toISOString(),
      usersChecked,
      candidatesFound,
      sent,
      expired,
      failed,
      errors: errors.slice(0, 3),
      diagnostics,
    });
  } catch (error) {
    console.error("notifications dispatch", error);
    return Response.json({ error: "No se pudieron procesar las notificaciones." }, { status: 500 });
  }
}

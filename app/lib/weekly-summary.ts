/**
 * Resumen semanal: lunes a domingo, área por área. Es lógica pura sobre los
 * registros que ya tiene la app, así que se puede rearmar cualquier semana
 * pasada y siempre coincide con lo que muestran las secciones.
 */

import { formatMinutes, listPhrase, minutesFromClock, pluralize, clockFromMinutes } from "./format";

type Series = Record<string, number>;

export type WeeklySummaryInput = {
  /** Lunes de la semana a resumir. */
  weekStart: string;
  scores: Series;
  training: Series;
  trainingWeeklyTarget: number;
  disciplines: Array<{ id: number; name: string; kind: string }>;
  trainingLogs: Array<{ id: number; disciplineId: number; trainingDate: string; durationMinutes: number; distanceMeters: number; quality?: number | null }>;
  exerciseLogs: Array<{ trainingLogId: number; exercise: string; weightDeciKg: number; sets: number; reps: number; isRecord: boolean }>;
  meals: Array<{ mealDate: string; calories: number; protein: number; carbs: number; fat: number }>;
  targetCalories: number;
  sleep: Array<{ entryDate: string; sleepMinutes: number; bedtime: string; wakeTime: string; sleepQuality?: "good" | "bad" | null }>;
  focus: Series;
  focusTargetMinutes: number;
  focusSessions: Array<{ projectId: number; sessionDate: string; minutes: number }>;
  focusProjects: Array<{ id: number; name: string; kind: "study" | "work" }>;
  readingLogs: Array<{ bookId: number; logDate: string; pages: number; minutes: number }>;
  books: Array<{ id: number; title: string; status: string; totalPages: number; currentPage: number }>;
  notesCreated: string[];
  resourcesDone: Array<{ title: string; updatedAt: string }>;
  goalsCompleted: Array<{ title: string; completedAt: string }>;
  tasksCompleted: number;
};

export type SummaryStat = { label: string; value: string; hint?: string };
export type SummaryArea = {
  key: "training" | "focus" | "sleep" | "nutrition" | "reading" | "goals";
  title: string;
  icon: string;
  headline: string;
  empty: boolean;
  stats: SummaryStat[];
  details: string[];
};
export type WeeklySummary = {
  weekStart: string;
  weekEnd: string;
  label: string;
  headline: string;
  averageScore: number;
  previousAverageScore: number;
  activeDays: number;
  bestDay: { date: string; score: number } | null;
  /** Puntaje de cada día, de lunes a domingo. */
  days: Array<{ date: string; score: number }>;
  highlights: string[];
  areas: SummaryArea[];
};

const QUALITY = ["", "Malo", "Regular", "Bueno", "Muy bueno"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const weekDates = (monday: string) => Array.from({ length: 7 }, (_, index) => shift(monday, index));
const avg = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const sumOver = (series: Series, dates: string[]) => dates.reduce((sum, date) => sum + (series[date] ?? 0), 0);
const kg = (deciKg: number) => (deciKg / 10).toLocaleString("es-AR", { maximumFractionDigits: 1 });
function weekdayName(date: string) {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}
function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)).replace(".", "");
}
/** "+25 min" / "−1 h" contra la semana anterior; vacío si no hay con qué comparar. */
function deltaMinutes(now: number, before: number) {
  if (!before || Math.abs(now - before) < 5) return undefined;
  return `${now > before ? "+" : "−"}${formatMinutes(Math.abs(now - before))} vs. semana anterior`;
}
function deltaCount(now: number, before: number, singular: string, plural = singular) {
  if (!before && !now) return undefined;
  if (now === before) return "igual que la semana anterior";
  const diff = Math.abs(now - before);
  return `${now > before ? "+" : "−"}${diff} ${diff === 1 ? singular : plural} vs. semana anterior`;
}
/** Promedio de horas de reloj tolerando la medianoche (23:30 y 00:30 → 00:00). */
function averageClock(values: string[], pivot: number) {
  const minutes = values.map((value) => minutesFromClock(value)).filter((value): value is number => value !== null).map((value) => (value - pivot + 1440) % 1440);
  return minutes.length ? clockFromMinutes(avg(minutes) + pivot) : "";
}

export function lastClosedWeekStart(today: string, nowMinutes: number, readyAtMinutes = 20 * 60) {
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shift(today, -((day + 6) % 7));
  // El domingo a la noche ya se puede cerrar la semana en curso.
  if (day === 0 && nowMinutes >= readyAtMinutes) return monday;
  return shift(monday, -7);
}

export function buildWeeklySummary(input: WeeklySummaryInput): WeeklySummary {
  const dates = weekDates(input.weekStart);
  const previous = weekDates(shift(input.weekStart, -7));
  const inWeek = (date: string) => date >= dates[0] && date <= dates[6];
  const inPrevious = (date: string) => date >= previous[0] && date <= previous[6];
  const areas: SummaryArea[] = [];
  const highlights: string[] = [];

  // --- Entrenamiento ---------------------------------------------------------
  const sessions = sumOver(input.training, dates);
  const sessionsBefore = sumOver(input.training, previous);
  const logs = input.trainingLogs.filter((log) => inWeek(log.trainingDate));
  const byDiscipline = new Map<number, number>();
  for (const log of logs) byDiscipline.set(log.disciplineId, (byDiscipline.get(log.disciplineId) ?? 0) + 1);
  const disciplineName = (id: number) => input.disciplines.find((item) => item.id === id)?.name ?? "Entrenamiento";
  const distanceKm = logs.reduce((sum, log) => sum + log.distanceMeters, 0) / 1000;
  const durationMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
  const logIds = new Set(logs.map((log) => log.id));
  const exercises = input.exerciseLogs.filter((item) => logIds.has(item.trainingLogId));
  const volume = exercises.reduce((sum, item) => sum + item.weightDeciKg / 10 * item.sets * item.reps, 0);
  const records = exercises.filter((item) => item.isRecord);
  const qualities = logs.map((log) => log.quality ?? 0).filter((value) => value > 0);
  const trainingDays = dates.filter((date) => (input.training[date] ?? 0) > 0).length;
  const trainingStats: SummaryStat[] = [
    { label: "Sesiones", value: String(sessions), hint: deltaCount(sessions, sessionsBefore, "sesión", "sesiones") },
    ...(input.trainingWeeklyTarget ? [{ label: "Meta semanal", value: `${trainingDays}/${input.trainingWeeklyTarget}`, hint: trainingDays >= input.trainingWeeklyTarget ? "cumplida" : `faltaron ${input.trainingWeeklyTarget - trainingDays}` }] : []),
    ...(distanceKm > 0 ? [{ label: "Distancia", value: `${distanceKm.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km` }] : []),
    ...(durationMinutes > 0 ? [{ label: "Tiempo", value: formatMinutes(durationMinutes) }] : []),
    ...(volume > 0 ? [{ label: "Volumen levantado", value: `${Math.round(volume).toLocaleString("es-AR")} kg`, hint: pluralize(exercises.length, "ejercicio", "ejercicios") }] : []),
    ...(qualities.length ? [{ label: "Sensación promedio", value: QUALITY[Math.round(avg(qualities))] }] : []),
  ];
  areas.push({
    key: "training", title: "Entrenamiento", icon: "↗", empty: sessions === 0,
    headline: sessions === 0 ? "Sin entrenamientos esta semana." : input.trainingWeeklyTarget && trainingDays >= input.trainingWeeklyTarget ? `Meta cumplida: entrenaste ${pluralize(trainingDays, "día", "días")}.` : `Entrenaste ${pluralize(trainingDays, "día", "días")}.`,
    stats: trainingStats,
    details: [
      ...(byDiscipline.size ? [[...byDiscipline.entries()].map(([id, count]) => `${disciplineName(id)} ×${count}`).join(" · ")] : []),
      ...records.map((item) => `🏆 Récord en ${item.exercise}: ${kg(item.weightDeciKg)} kg · ${item.sets}×${item.reps}`),
    ],
  });
  if (input.trainingWeeklyTarget && trainingDays >= input.trainingWeeklyTarget) highlights.push(`Cumpliste tu meta de ${pluralize(input.trainingWeeklyTarget, "entrenamiento", "entrenamientos")}.`);
  if (records.length) highlights.push(records.length === 1 ? `Récord personal en ${records[0].exercise}.` : `${records.length} récords personales.`);

  // --- Foco -----------------------------------------------------------------
  const focusTotal = sumOver(input.focus, dates);
  const focusBefore = sumOver(input.focus, previous);
  const focusDays = dates.filter((date) => (input.focus[date] ?? 0) > 0).length;
  const targetDays = dates.filter((date) => (input.focus[date] ?? 0) >= input.focusTargetMinutes).length;
  const byProject = new Map<number, number>();
  for (const session of input.focusSessions.filter((item) => inWeek(item.sessionDate))) byProject.set(session.projectId, (byProject.get(session.projectId) ?? 0) + session.minutes);
  const projects = [...byProject.entries()].sort((left, right) => right[1] - left[1]);
  const studyMinutes = projects.filter(([id]) => input.focusProjects.find((item) => item.id === id)?.kind === "study").reduce((sum, [, minutes]) => sum + minutes, 0);
  const workMinutes = projects.filter(([id]) => input.focusProjects.find((item) => item.id === id)?.kind === "work").reduce((sum, [, minutes]) => sum + minutes, 0);
  areas.push({
    key: "focus", title: "Estudio y trabajo", icon: "⌁", empty: focusTotal === 0,
    headline: focusTotal === 0 ? "Sin horas de foco registradas." : `${formatMinutes(focusTotal)} de foco en ${pluralize(focusDays, "día", "días")}.`,
    stats: [
      { label: "Total", value: formatMinutes(focusTotal), hint: deltaMinutes(focusTotal, focusBefore) },
      { label: "Promedio diario", value: formatMinutes(focusTotal / 7) },
      { label: "Objetivo cumplido", value: `${targetDays}/7 días`, hint: `objetivo ${formatMinutes(input.focusTargetMinutes)}` },
      ...(studyMinutes && workMinutes ? [{ label: "Estudio / trabajo", value: `${formatMinutes(studyMinutes)} / ${formatMinutes(workMinutes)}` }] : []),
    ],
    details: projects.slice(0, 4).map(([id, minutes]) => `${input.focusProjects.find((item) => item.id === id)?.name ?? "Proyecto"}: ${formatMinutes(minutes)}`),
  });
  if (focusBefore > 0 && focusTotal >= focusBefore + 60) highlights.push(`${formatMinutes(focusTotal - focusBefore)} más de foco que la semana anterior.`);

  // --- Sueño ----------------------------------------------------------------
  const nights = input.sleep.filter((item) => inWeek(item.entryDate) && item.sleepMinutes > 0);
  const nightsBefore = input.sleep.filter((item) => inPrevious(item.entryDate) && item.sleepMinutes > 0);
  const sleepAvg = avg(nights.map((item) => item.sleepMinutes));
  const sleepAvgBefore = avg(nightsBefore.map((item) => item.sleepMinutes));
  const longest = [...nights].sort((left, right) => right.sleepMinutes - left.sleepMinutes)[0];
  const shortest = [...nights].sort((left, right) => left.sleepMinutes - right.sleepMinutes)[0];
  const goodNights = nights.filter((item) => item.sleepQuality === "good").length;
  const sevenPlus = nights.filter((item) => item.sleepMinutes >= 420).length;
  areas.push({
    key: "sleep", title: "Sueño", icon: "☾", empty: nights.length === 0,
    headline: !nights.length ? "Sin noches registradas." : `Dormiste ${formatMinutes(sleepAvg)} por noche.`,
    stats: [
      { label: "Promedio", value: nights.length ? formatMinutes(sleepAvg) : "—", hint: deltaMinutes(sleepAvg, sleepAvgBefore) },
      { label: "Noches de 7 h o más", value: `${sevenPlus}/${nights.length}` },
      ...(nights.length ? [{ label: "Horario promedio", value: `${averageClock(nights.map((item) => item.bedtime), 12 * 60) || "—"} → ${averageClock(nights.map((item) => item.wakeTime), 0) || "—"}` }] : []),
      ...(goodNights ? [{ label: "Noches buenas", value: `${goodNights}/${nights.length}` }] : []),
    ],
    details: longest && shortest && longest !== shortest ? [`Más larga: ${weekdayName(longest.entryDate)} (${formatMinutes(longest.sleepMinutes)}) · Más corta: ${weekdayName(shortest.entryDate)} (${formatMinutes(shortest.sleepMinutes)})`] : [],
  });
  if (nights.length >= 3 && sleepAvgBefore && sleepAvg - sleepAvgBefore >= 20) highlights.push(`Dormiste ${formatMinutes(sleepAvg - sleepAvgBefore)} más por noche que la semana anterior.`);

  // --- Alimentación ---------------------------------------------------------
  const meals = input.meals.filter((meal) => inWeek(meal.mealDate));
  const mealDays = [...new Set(meals.map((meal) => meal.mealDate))];
  const perDay = (pick: (meal: WeeklySummaryInput["meals"][number]) => number) => mealDays.length ? meals.reduce((sum, meal) => sum + pick(meal), 0) / mealDays.length : 0;
  const kcal = Math.round(perDay((meal) => meal.calories));
  const onTarget = input.targetCalories ? mealDays.filter((date) => {
    const total = meals.filter((meal) => meal.mealDate === date).reduce((sum, meal) => sum + meal.calories, 0);
    return Math.abs(total / input.targetCalories - 1) <= 0.1;
  }).length : 0;
  areas.push({
    key: "nutrition", title: "Alimentación", icon: "◇", empty: meals.length === 0,
    headline: !meals.length ? "Sin comidas registradas." : input.targetCalories ? `${kcal.toLocaleString("es-AR")} kcal por día contra ${input.targetCalories.toLocaleString("es-AR")} de objetivo.` : `${kcal.toLocaleString("es-AR")} kcal por día en promedio.`,
    stats: [
      { label: "Días registrados", value: `${mealDays.length}/7`, hint: pluralize(meals.length, "comida", "comidas") },
      { label: "Calorías por día", value: kcal ? `${kcal.toLocaleString("es-AR")} kcal` : "—" },
      ...(input.targetCalories && mealDays.length ? [{ label: "Días en objetivo", value: `${onTarget}/${mealDays.length}`, hint: "±10 %" }] : []),
      ...(mealDays.length ? [{ label: "Macros por día", value: `P ${Math.round(perDay((meal) => meal.protein))} · C ${Math.round(perDay((meal) => meal.carbs))} · G ${Math.round(perDay((meal) => meal.fat))} g` }] : []),
    ],
    details: [],
  });

  // --- Lectura y aprendizaje ------------------------------------------------
  const readingLogs = input.readingLogs.filter((log) => inWeek(log.logDate) && (log.pages > 0 || log.minutes > 0));
  const pages = readingLogs.reduce((sum, log) => sum + log.pages, 0);
  const pagesBefore = input.readingLogs.filter((log) => inPrevious(log.logDate)).reduce((sum, log) => sum + log.pages, 0);
  const readingMinutes = readingLogs.reduce((sum, log) => sum + log.minutes, 0);
  const bookIds = [...new Set(readingLogs.map((log) => log.bookId))];
  const finished = input.books.filter((book) => book.status === "read" && bookIds.includes(book.id) && book.totalPages > 0 && book.currentPage >= book.totalPages);
  const notes = input.notesCreated.filter((value) => inWeek(value.slice(0, 10))).length;
  const resources = input.resourcesDone.filter((item) => inWeek(item.updatedAt.slice(0, 10)));
  areas.push({
    key: "reading", title: "Lectura y aprendizaje", icon: "▱", empty: !pages && !notes && !resources.length,
    headline: !pages && !resources.length ? notes ? `Tomaste ${pluralize(notes, "nota", "notas")}.` : "Sin lecturas registradas." : finished.length ? `Terminaste ${listPhrase(finished.map((book) => `“${book.title}”`))}.` : `Leíste ${pluralize(pages, "página", "páginas")}.`,
    stats: [
      { label: "Páginas", value: String(pages), hint: deltaCount(pages, pagesBefore, "pág.") },
      ...(readingMinutes ? [{ label: "Tiempo leyendo", value: formatMinutes(readingMinutes) }] : []),
      ...(notes ? [{ label: "Notas nuevas", value: String(notes) }] : []),
      ...(resources.length ? [{ label: "Artículos y podcasts", value: String(resources.length), hint: "terminados" }] : []),
    ],
    details: [
      ...(bookIds.length ? [`Avanzaste en ${listPhrase(bookIds.map((id) => input.books.find((book) => book.id === id)?.title).filter((title): title is string => Boolean(title)).map((title) => `“${title}”`))}`] : []),
      ...resources.slice(0, 3).map((item) => `✓ ${item.title}`),
    ],
  });
  if (finished.length) highlights.push(`Terminaste ${finished.length === 1 ? `“${finished[0].title}”` : pluralize(finished.length, "libro", "libros")}.`);

  // --- Objetivos ------------------------------------------------------------
  const goals = input.goalsCompleted.filter((goal) => inWeek(goal.completedAt.slice(0, 10)));
  areas.push({
    key: "goals", title: "Objetivos y tareas", icon: "◎", empty: !goals.length && !input.tasksCompleted,
    headline: goals.length ? `Cumpliste ${pluralize(goals.length, "objetivo", "objetivos")}.` : input.tasksCompleted ? `Completaste ${pluralize(input.tasksCompleted, "tarea", "tareas")}.` : "Sin objetivos cerrados esta semana.",
    stats: [
      { label: "Objetivos cumplidos", value: String(goals.length) },
      { label: "Tareas completadas", value: String(input.tasksCompleted) },
    ],
    details: goals.slice(0, 4).map((goal) => `✓ ${goal.title}`),
  });
  if (goals.length) highlights.push(goals.length === 1 ? `Cumpliste “${goals[0].title}”.` : `Cumpliste ${goals.length} objetivos.`);

  // --- Daily Score ------------------------------------------------------------
  const isActive = (date: string) => (input.training[date] ?? 0) > 0 || (input.focus[date] ?? 0) > 0
    || input.sleep.some((item) => item.entryDate === date && item.sleepMinutes > 0)
    || input.meals.some((meal) => meal.mealDate === date)
    || input.readingLogs.some((log) => log.logDate === date && log.pages > 0);
  const days = dates.map((date) => ({ date, score: input.scores[date] ?? 0 }));
  const averageScore = Math.round(avg(days.map((day) => day.score)));
  const previousAverageScore = Math.round(avg(previous.map((date) => input.scores[date] ?? 0)));
  const activeDays = dates.filter(isActive).length;
  const best = days.reduce<{ date: string; score: number } | null>((top, day) => (!top || day.score > top.score ? day : top), null);
  const bestDay = best && best.score > 0 ? best : null;
  if (bestDay) highlights.unshift(`Tu mejor día fue el ${weekdayName(bestDay.date)}: ${bestDay.score}/100.`);

  const headline = activeDays === 0 ? "Una semana sin registros."
    : averageScore >= 70 ? "Una semana muy sólida."
    : averageScore >= 45 ? "Una semana con buen ritmo."
    : "Una semana para reacomodar.";

  return {
    weekStart: dates[0],
    weekEnd: dates[6],
    label: `${shortDate(dates[0])} – ${shortDate(dates[6])}`,
    headline,
    averageScore,
    previousAverageScore,
    activeDays,
    bestDay,
    days,
    highlights: highlights.slice(0, 4),
    areas,
  };
}

import { dateMinus, datePlus, datesBetween } from "@/domain/dates";
import { scoreForDay, scoreWeightsForDate, trainingContribution, type MonthlyScoreWeights } from "@/domain/score";
import { inferTaskCategory } from "@/domain/schedule";
import { planDisciplineIdFor } from "@/domain/plan-disciplines";
import { buildWeeklySummary, type SummaryArea, type WeeklySummary } from "@/features/notifications/logic/weekly-summary";
import type { ProgressData } from "@/shared/data/types";

type UsageStreak = { currentStreak: number; bestStreak: number; totalUseDays: number };
type UpcomingItem = { title: string; date: string; time: string; category: string; kind: "tarea" | "evento" };
type WeeklyEvidence = { weekStart: string; averageScore: number; activeDays: number; focusMinutes: number; trainingSessions: number; sleepAverageMinutes: number | null };
type PriorityEvidence = { key: string; label: string; weight: number; level: string; weeklyActivity: string };

export type WeeklyAiReviewOutput = {
  summary: string;
  wins: string[];
  improvements: string[];
  comparison: string;
  priorityInsights: string[];
  detections: string[];
};

export type WeeklyAiMetrics = {
  weekStart: string;
  weekEnd: string;
  label: string;
  headline: string;
  averageScore: number;
  previousAverageScore: number;
  scoreChange: number | null;
  activeDays: number;
  bestDay: WeeklySummary["bestDay"];
  days: WeeklySummary["days"];
  highlights: string[];
  areas: Array<Pick<SummaryArea, "key" | "title" | "headline" | "empty" | "stats" | "details">>;
  priorities: PriorityEvidence[];
  usageStreak: UsageStreak;
  historyWeeks: WeeklyEvidence[];
  evidenceWeeks: number;
  openGoals: Array<{ title: string; targetDate: string; category: string }>;
  upcoming: UpcomingItem[];
};

/** Datos agregados para el modelo; excluye nombres de tareas, objetivos, libros y proyectos. */
export function weeklyAiModelMetrics(metrics: WeeklyAiMetrics) {
  return {
    weekStart: metrics.weekStart,
    weekEnd: metrics.weekEnd,
    label: metrics.label,
    averageScore: metrics.averageScore,
    previousAverageScore: metrics.previousAverageScore,
    scoreChange: metrics.scoreChange,
    activeDays: metrics.activeDays,
    bestDay: metrics.bestDay,
    days: metrics.days,
    areas: metrics.areas.map(({ key, title, headline, empty, stats }) => ({
      key,
      title,
      headline,
      empty,
      stats: stats.map(({ label, value }) => ({ label, value })),
    })),
    priorities: metrics.priorities,
    usageStreak: metrics.usageStreak,
    historyWeeks: metrics.historyWeeks,
    evidenceWeeks: metrics.evidenceWeeks,
    openGoalCount: metrics.openGoals.length,
    upcomingCount: metrics.upcoming.length,
  };
}

function sumByDate<T>(rows: T[], getDate: (row: T) => string, getValue: (row: T) => number) {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const date = getDate(row);
    totals[date] = (totals[date] ?? 0) + getValue(row);
  }
  return totals;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function rangeSum(series: Record<string, number>, dates: string[]) {
  return dates.reduce((sum, date) => sum + (series[date] ?? 0), 0);
}

function isWithin(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function dateOf(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function priorityLevel(weight: number) {
  return weight >= 3 ? "alta" : weight <= 1 ? "baja" : "media";
}

function buildScoreSeries(data: ProgressData, from: string, through: string) {
  const completedTasks = data.tasks.filter((task) => Boolean(task.completedAt && task.dueDate && task.durationMinutes > 0));
  const completedEvents = data.events.filter((event) => Boolean(event.completedAt && event.eventDate && event.durationMinutes > 0));

  const trainingByKey = new Map<string, ProgressData["trainingLogs"][number]>();
  for (const log of data.trainingLogs) trainingByKey.set(log.trainingDate + ":" + log.disciplineId, log);
  const effectiveTrainingLogs = [...trainingByKey.values()];
  const orphanTrainingEvents: typeof completedEvents = [];
  for (const event of completedEvents) {
    if (event.category !== "training") continue;
    const disciplineId = planDisciplineIdFor(event, data.disciplines);
    if (!disciplineId) {
      orphanTrainingEvents.push(event);
      continue;
    }
    const key = event.eventDate + ":" + disciplineId;
    if (!trainingByKey.has(key)) {
      const syntheticLog = {
        id: -event.id,
        disciplineId,
        trainingDate: event.eventDate,
        durationMinutes: event.durationMinutes,
        distanceMeters: 0,
        notes: event.title,
        quality: event.quality ?? null,
      };
      trainingByKey.set(key, syntheticLog);
      effectiveTrainingLogs.push(syntheticLog);
    }
  }

  const orphanTasks = completedTasks.filter((task) => !task.projectId && task.dueDate && inferTaskCategory(task.title) === "training");
  const trainingByDate = sumByDate(effectiveTrainingLogs, (log) => log.trainingDate, () => 1);
  for (const task of orphanTasks) trainingByDate[task.dueDate as string] = (trainingByDate[task.dueDate as string] ?? 0) + 1;
  for (const event of orphanTrainingEvents) trainingByDate[event.eventDate] = (trainingByDate[event.eventDate] ?? 0) + 1;

  const trainingScoreByDate: Record<string, number> = {};
  const seenTraining = new Set<string>();
  for (const log of effectiveTrainingLogs) {
    const key = log.trainingDate + ":" + log.disciplineId;
    if (seenTraining.has(key)) continue;
    seenTraining.add(key);
    const discipline = data.disciplines.find((item) => item.id === log.disciplineId);
    trainingScoreByDate[log.trainingDate] = Math.min(1, (trainingScoreByDate[log.trainingDate] ?? 0) + trainingContribution(discipline?.priority, log.quality));
  }
  for (const task of orphanTasks) trainingScoreByDate[task.dueDate as string] = Math.min(1, (trainingScoreByDate[task.dueDate as string] ?? 0) + 0.5);
  for (const event of orphanTrainingEvents) trainingScoreByDate[event.eventDate] = Math.min(1, (trainingScoreByDate[event.eventDate] ?? 0) + 0.5);

  const manualFocus = new Map<string, number>();
  const plannedFocus = new Map<string, number>();
  const uniqueSessions = data.focusSessions.filter((item, index, rows) => rows.findIndex((candidate) => candidate.id === item.id) === index);
  for (const session of uniqueSessions) {
    const key = session.sessionDate + ":" + session.projectId;
    manualFocus.set(key, (manualFocus.get(key) ?? 0) + Math.max(0, session.minutes || 0));
  }
  for (const task of completedTasks) {
    if (task.projectId === null || !task.dueDate) continue;
    const key = task.dueDate + ":" + task.projectId;
    plannedFocus.set(key, (plannedFocus.get(key) ?? 0) + Math.max(0, task.durationMinutes || 0));
  }
  const focusByDate: Record<string, number> = {};
  for (const key of new Set([...manualFocus.keys(), ...plannedFocus.keys()])) {
    const split = key.lastIndexOf(":");
    const date = key.slice(0, split);
    const minutes = Math.max(manualFocus.get(key) ?? 0, plannedFocus.get(key) ?? 0);
    focusByDate[date] = (focusByDate[date] ?? 0) + minutes;
  }
  for (const event of completedEvents.filter((item) => item.category === "study" || item.category === "work")) {
    focusByDate[event.eventDate] = (focusByDate[event.eventDate] ?? 0) + Math.max(0, event.durationMinutes || 0);
  }

  const caloriesByDay = sumByDate(data.mealHistory, (meal) => meal.mealDate, (meal) => meal.calories);
  const mealsByDay = sumByDate(data.mealHistory, (meal) => meal.mealDate, () => 1);
  const sleepRows = data.dailyCheckins.filter((row) => row.sleepMinutes > 0);
  const sleepByDate = sumByDate(sleepRows, (row) => row.entryDate, (row) => row.sleepMinutes);
  const sleepQualityByDate = Object.fromEntries(data.dailyCheckins.map((row) => [row.entryDate, row.sleepQuality ?? null]));
  const pagesByDate = sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages);
  const completionDates = new Set<string>([
    ...data.goals.filter((goal) => goal.completedAt).map((goal) => dateOf(goal.completedAt)),
    ...data.tasks.filter((task) => task.completedAt && task.dueDate).map((task) => task.dueDate as string),
    ...data.events.filter((event) => event.completedAt).map((event) => event.eventDate),
  ]);

  const fallbackWeights = {
    gymWeight: data.priorities.gymWeight,
    nutritionWeight: data.priorities.nutritionWeight,
    sleepWeight: data.priorities.sleepWeight,
    focusWeight: data.priorities.focusWeight,
    readingWeight: data.priorities.readingWeight,
    goalsWeight: data.priorities.goalsWeight,
  };
  const history = (data.priorityHistory ?? []) as MonthlyScoreWeights[];
  const targetCalories = data.dietPlan?.targetCalories ?? 0;
  const focusTarget = data.profile.focusDailyTargetMinutes || 120;
  const dates = datesBetween(from, through);
  const scores: Record<string, number> = {};
  for (const date of dates) {
    const hasOpenGoals = data.goals.some((goal) => dateOf(goal.createdAt) <= date && (!goal.completedAt || dateOf(goal.completedAt) >= date));
    scores[date] = scoreForDay({
      trainingSessions: trainingByDate[date] ?? 0,
      trainingScore: (trainingScoreByDate[date] ?? 0) * 100,
      meals: mealsByDay[date] ?? 0,
      calories: caloriesByDay[date] ?? 0,
      targetCalories,
      sleepMinutes: sleepByDate[date] ?? 0,
      sleepQuality: sleepQualityByDate[date] as "good" | "bad" | null,
      focusMinutes: focusByDate[date] ?? 0,
      focusTargetMinutes: focusTarget,
      pages: pagesByDate[date] ?? 0,
      completedSomething: completionDates.has(date),
      hasOpenGoals,
    }, scoreWeightsForDate(date, history, fallbackWeights));
  }

  const activeDates = new Set([
    ...Object.keys(trainingByDate),
    ...data.mealHistory.map((item) => item.mealDate),
    ...data.dailyCheckins.map((item) => item.entryDate),
    ...Object.keys(focusByDate),
    ...data.readingHistory.filter((item) => item.pages > 0).map((item) => item.logDate),
    ...completionDates,
  ]);
  return { scores, trainingByDate, focusByDate, sleepByDate, activeDates, effectiveTrainingLogs, uniqueSessions };
}

export function buildWeeklyAiMetrics(data: ProgressData, weekStart: string, today: string, usageStreak: UsageStreak): WeeklyAiMetrics {
  const weekEnd = datePlus(weekStart, 6);
  const evidenceStart = dateMinus(weekStart, 7 * 7);
  const scoreData = buildScoreSeries(data, evidenceStart, weekEnd);
  const summaryStart = dateMinus(weekStart, 7);
  const summaryDates = datesBetween(summaryStart, weekEnd);
  const summaryScores = Object.fromEntries(summaryDates.map((date) => [date, scoreData.scores[date] ?? 0]));
  const completedGoals = data.goals.filter((goal) => goal.completedAt).map((goal) => ({ title: goal.title, completedAt: goal.completedAt as string }));
  const tasksCompleted = data.tasks.filter((task) => task.completedAt && task.dueDate && task.dueDate >= weekStart && task.dueDate <= weekEnd).length;
  const summary = buildWeeklySummary({
    weekStart,
    scores: summaryScores,
    training: scoreData.trainingByDate,
    trainingWeeklyTarget: 0,
    disciplines: data.disciplines,
    trainingLogs: scoreData.effectiveTrainingLogs,
    exerciseLogs: data.exerciseLogs,
    meals: data.mealHistory,
    targetCalories: data.dietPlan?.targetCalories ?? 0,
    sleep: data.dailyCheckins,
    focus: scoreData.focusByDate,
    focusTargetMinutes: data.profile.focusDailyTargetMinutes || 120,
    focusSessions: scoreData.uniqueSessions,
    focusProjects: data.focusProjects,
    readingLogs: data.readingHistory,
    books: data.books,
    notesCreated: [...data.notes.map((note) => note.createdAt), ...(data.resourceNotes ?? []).map((note) => note.createdAt)],
    resourcesDone: (data.resources ?? []).filter((item) => item.status === "done").map((item) => ({ title: item.title, updatedAt: item.updatedAt ?? item.createdAt })),
    goalsCompleted: completedGoals,
    tasksCompleted,
  });

  const historyWeeks: WeeklyEvidence[] = Array.from({ length: 8 }, (_, index) => {
    const start = dateMinus(weekStart, index * 7);
    const dates = datesBetween(start, datePlus(start, 6));
    const nights = data.dailyCheckins.filter((item) => dates.includes(item.entryDate) && item.sleepMinutes > 0);
    return {
      weekStart: start,
      averageScore: Math.round(average(dates.map((date) => scoreData.scores[date] ?? 0))),
      activeDays: dates.filter((date) => scoreData.activeDates.has(date)).length,
      focusMinutes: rangeSum(scoreData.focusByDate, dates),
      trainingSessions: rangeSum(scoreData.trainingByDate, dates),
      sleepAverageMinutes: nights.length ? Math.round(average(nights.map((night) => night.sleepMinutes))) : null,
    };
  }).reverse();

  const weights = data.priorityHistory?.find((item) => item.monthKey === weekStart.slice(0, 7)) ?? data.priorities;
  const priorityFields: Array<[string, string, number, string]> = [
    ["training", "Entrenamiento", weights.gymWeight, "training"],
    ["nutrition", "Alimentación", weights.nutritionWeight, "nutrition"],
    ["sleep", "Sueño", weights.sleepWeight, "sleep"],
    ["focus", "Estudio y trabajo", weights.focusWeight, "focus"],
    ["reading", "Lectura", weights.readingWeight, "reading"],
    ["goals", "Objetivos", weights.goalsWeight, "goals"],
  ];
  const priorities = priorityFields.map(([key, label, weight, areaKey]) => ({
    key,
    label,
    weight,
    level: priorityLevel(weight),
    weeklyActivity: summary.areas.find((area) => area.key === areaKey)?.headline ?? "Sin datos registrados",
  })).sort((left, right) => right.weight - left.weight).slice(0, 3);

  const upcomingEnd = datePlus(today, 7);
  const upcoming: UpcomingItem[] = [
    ...data.tasks.filter((task) => !task.completedAt && task.dueDate && isWithin(task.dueDate, today, upcomingEnd)).map((task) => ({
      title: task.title.slice(0, 100),
      date: task.dueDate as string,
      time: task.startTime || "",
      category: task.projectId ? (data.focusProjects.find((project) => project.id === task.projectId)?.kind ?? "estudio") : "tarea",
      kind: "tarea" as const,
    })),
    ...data.events.filter((event) => !event.completedAt && isWithin(event.eventDate, today, upcomingEnd)).map((event) => ({
      title: event.title.slice(0, 100),
      date: event.eventDate,
      time: event.eventTime || "",
      category: event.category,
      kind: "evento" as const,
    })),
  ].sort((left, right) => (left.date + left.time).localeCompare(right.date + right.time)).slice(0, 3);

  const openGoals = data.goals.filter((goal) => !goal.completedAt)
    .sort((left, right) => left.targetDate.localeCompare(right.targetDate))
    .slice(0, 3)
    .map((goal) => ({ title: goal.title.slice(0, 100), targetDate: goal.targetDate, category: goal.category }));
  const previousAverageScore = summary.previousAverageScore;
  return {
    weekStart: summary.weekStart,
    weekEnd: summary.weekEnd,
    label: summary.label,
    headline: summary.headline,
    averageScore: summary.averageScore,
    previousAverageScore,
    scoreChange: previousAverageScore ? summary.averageScore - previousAverageScore : null,
    activeDays: summary.activeDays,
    bestDay: summary.bestDay,
    days: summary.days,
    highlights: summary.highlights,
    areas: summary.areas.map((area) => ({ ...area, stats: area.stats.slice(0, 4), details: area.details.slice(0, 3) })),
    priorities,
    usageStreak,
    historyWeeks,
    evidenceWeeks: historyWeeks.filter((week) => week.activeDays >= 3).length,
    openGoals,
    upcoming,
  };
}

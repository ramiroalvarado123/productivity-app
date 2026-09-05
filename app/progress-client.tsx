Warning: truncated output (original token count: 58508)
Total output lines: 3069

"use client";

import Image from "next/image";
import { CSSProperties, FormEvent, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BrandMark } from "./brand-mark";
import { DatePicker } from "./date-picker";
import { Dropdown, type DropdownOption } from "./dropdown";
import { FULL_DAY_HOUR_OPTIONS, TimeFieldPicker } from "./time-dropdown";
import { TourOverlay, type TourStep } from "./tour-overlay";
import { clockFromMinutes, countdownLabel, countdownLabelCapitalized, formatMinutes, listPhrase, minutesFromClock, pluralize } from "./lib/format";
import { quoteForDate } from "./lib/quotes";
import { sparklinePath, streakFor, sumByDate, trendFor, weeklyStreakFor, type Trend } from "./lib/streaks";
import { dayBlocks, dayWindow, freeSlots, overlappingBlocks, unscheduledTasks, type Block } from "./lib/schedule";
import { buildInsights, closeInsights, insightHeadline, planInsights, type ComingDay, type InsightAction } from "./lib/insights";
import { dayClose, isReviewDay, weeklyReview } from "./lib/review";
import { dayFactors, scoreFrom, scoreLabel, type DayRecord, type ScoreWeights } from "./lib/score";
import {
  GOAL_METRICS, GOAL_SOURCES, GROUP_ACCENTS, accentFor, emptySocial, goalPercent, goalPeriodLabel,
  goalSource, goalTotal, goalUnit, goalWindow, initialsFor, inviteMessage, isFresh, mailLink,
  shareStatus, whatsappLink,
  type GoalMetric, type GoalSource, type Group, type GroupAccent, type GroupGoal, type SocialData,
} from "./lib/social";

type User = { displayName: string; username: string; avatarUrl: string; email: string; onboardingCompleted: boolean; mainGoals: string[]; usagePreferences: string[]; isPro: boolean; proSince: string };
type Meal = { id: number; name: string; detail: string; calories: number; protein: number; carbs: number; fat: number; mealDate: string };
type BookStatus = "reading" | "read" | "wishlist";
type Book = { id: number; title: string; author: string; status: BookStatus; totalPages: number; currentPage: number; coverUrl: string; externalKey: string };
type BookSuggestion = { key: string; title: string; author: string; year: number | null; pages: number; coverUrl: string; languages: string[]; openLibraryUrl: string };
type ReadingLog = { id: number; bookId: number; logDate: string; pages: number; minutes: number };
type Note = { id: number; bookId: number; content: string; createdAt: string };
type GoalPeriod = "weekly" | "monthly" | "annual" | "custom";
type GoalCategory = "general" | "gym" | "training" | "nutrition" | "reading" | "study" | "work" | "sleep" | "score" | "calendar" | "stats" | "goals";
type Goal = { id: number; title: string; period: GoalPeriod; category: GoalCategory; targetDate: string; completedAt: string | null; createdAt: string };
type Priorities = { monthKey: string; gymWeight: number; nutritionWeight: number; readingWeight: number; sleepWeight: number; focusWeight: number; goalsWeight: number };
type DailyCheckin = { id: number; entryDate: string; habitsJson: string; workoutDetail: string; studyMinutes: number; studyDetail: string; sleepMinutes: number; bedtime: string; wakeTime: string; waterMl: number; journal: string; transcript: string; voiceSummary: string };
type Discipline = { id: number; name: string; kind: "strength" | "running" | "cycling" | "swimming" | "sport" | "other" };
type TrainingLog = { id: number; disciplineId: number; trainingDate: string; durationMinutes: number; distanceMeters: number; notes: string };
type ExerciseLog = { id: number; trainingLogId: number; exercise: string; weightDeciKg: number; sets: number; reps: number; isRecord: boolean };
type FocusProject = { id: number; name: string; kind: "study" | "work" };
type FocusSession = { id: number; projectId: number; sessionDate: string; minutes: number; note: string };
type Task = { id: number; projectId: number | null; title: string; dueDate: string | null; startTime: string; durationMinutes: number; completedAt: string | null };
type CalendarEvent = { id: number; title: string; eventDate: string; eventTime: string; durationMinutes: number; category: "personal" | "study" | "work" | "training" | "health" | "other"; notes: string };
type VoiceCheckin = { transcript: string; summary: string; gym: { attended: boolean | null; detail: string }; meals: Array<{ name: string; detail: string; calories: number; protein: number; carbs: number; fat: number }>; reading: { bookTitle: string; pages: number; minutes: number; note: string }; habits: string[]; study: { minutes: number; detail: string; tasks: string[] }; sleep: { minutes: number; bedtime: string; wakeTime: string }; waterMl: number; journal: string; goals: Array<{ title: string; period: GoalPeriod; category: GoalCategory; targetDate: string }>; confidence: "low" | "medium" | "high" };
type MealEstimate = { mealName: string; detail: string; estimatedCalories: number; minimumCalories: number; maximumCalories: number; protein: number; carbs: number; fat: number; confidence: "low" | "medium" | "high"; items: Array<{ name: string; portion: string; calories: number }>; caveat: string };
type DietPlanContent = {
  summary: string; targetCalories: number; calorieRangeMinimum: number; calorieRangeMaximum: number; maintenanceCalories: number;
  goalDirection: "lose" | "maintain" | "gain"; paceText: string;
  macros: { proteinGrams: number; carbsGrams: number; fatGrams: number };
  meals: Array<{ slot: string; guidance: string; options: string[] }>;
  weeklyTips: string[]; shoppingBasics: string[]; appliedRestrictions: string[]; safetyNote: string; needsProfessional: boolean;
};
type DietPlanRecord = {
  id: number; age: number; sex: "female" | "male" | "unspecified"; heightCm: number; currentWeightDeciKg: number; targetWeightDeciKg: number;
  activityLevel: "sedentary" | "light" | "moderate" | "high"; goalPace: "gentle" | "moderate"; preferences: string; details: string;
  targetCalories: number; planJson: string; updatedAt: string;
};
type DietForm = {
  age: number; sex: DietPlanRecord["sex"]; heightCm: number; currentWeightKg: number; targetWeightKg: number;
  activityLevel: DietPlanRecord["activityLevel"]; goalPace: DietPlanRecord["goalPace"]; preferences: string; details: string;
};
type ProgressData = {
  profile: User; gymDates: string[]; disciplines: Discipline[]; trainingLogs: TrainingLog[]; exerciseLogs: ExerciseLog[];
  meals: Meal[]; mealHistory: Meal[]; books: Book[]; readingLogs: ReadingLog[]; readingHistory: ReadingLog[]; notes: Note[];
  goals: Goal[]; priorities: Priorities; dailyCheckin: DailyCheckin | null; dailyCheckins: DailyCheckin[];
  focusProjects: FocusProject[]; focusSessions: FocusSession[]; tasks: Task[]; events: CalendarEvent[]; dietPlan: DietPlanRecord | null;
};
type Section = "summary" | "score" | "physical" | "focus" | "sleep" | "plan" | "stats" | "friends" | "pro";
type PhysicalTab = "training" | "meals";
type FocusTab = "study" | "work";
/** Área de la vida a la que apunta un aviso, y dónde vive ahora en la interfaz. */
type InsightTarget = { section: Section; physicalTab?: PhysicalTab; focusTab?: FocusTab };
type StatsPeriod = "weekly" | "monthly" | "annual";
type SettingsView = "home" | "personal" | "language" | "notifications";
type FeedbackType = "positive" | "idea" | "bug" | "dislike";
type SavePhase = "saving" | "saved" | null;

type NavItem = { id: Section; icon: ReactNode; label: string; mobile: string; center?: true };
/** Los campos de un objetivo mientras se escribe, antes de existir en el grupo. */
type GoalDraft = { title: string; source: GoalSource; metric: GoalMetric; targetValue: number; period: GroupGoal["period"]; dueDate: string };
/** Qué se está administrando de un grupo: el engranaje, el más o los amigos. */
type GroupPanelTab = "settings" | "goals" | "members";
const emptyGoalDraft = (): GoalDraft => ({ title: "", source: "manual", metric: "count", targetValue: 3, period: "weekly", dueDate: "" });

const friendsIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6M13 14.5c1-.8 2.1-1.1 3.5-1.1 2.8 0 4.4 1.8 5 5.1" /></svg>;
const physicalIcon = <svg className="physical-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" /><path d="M15 14a5 5 0 0 0-7.584 2" /><path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" /></svg>;
const focusIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 5.2a3.4 3.4 0 0 0-5.3 2.9c0 .5.1.9.3 1.3A3.7 3.7 0 0 0 5 16.5a3.5 3.5 0 0 0 4.2 2.3M14.8 5.2a3.4 3.4 0 0 1 5.3 2.9c0 .5-.1.9-.3 1.3a3.7 3.7 0 0 1-.8 7.1 3.5 3.5 0 0 1-4.2 2.3M12 4v16M8 9.2c1.1.1 2 .7 2.4 1.6M16 9.2c-1.1.1-2 .7-2.4 1.6M8.4 15.1c1-.1 1.7-.5 2.2-1.2M15.6 15.1c-1-.1-1.7-.5-2.2-1.2" /></svg>;
const gearIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="m19.3 14.6.35.2a1.8 1.8 0 0 1-1.8 3.12l-.35-.2a1.8 1.8 0 0 0-2.7 1.56v.4a1.8 1.8 0 0 1-3.6 0v-.4a1.8 1.8 0 0 0-2.7-1.56l-.35.2a1.8 1.8 0 0 1-1.8-3.12l.35-.2a1.8 1.8 0 0 0 0-3.12l-.35-.2a1.8 1.8 0 1 1 1.8-3.12l.35.2a1.8 1.8 0 0 0 2.7-1.56v-.4a1.8 1.8 0 0 1 3.6 0v.4a1.8 1.8 0 0 0 2.7 1.56l.35-.2a1.8 1.8 0 0 1 1.8 3.12l-.35.2a1.8 1.8 0 0 0 0 3.12Z" /></svg>;
const plusIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13" /></svg>;
const statsIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 18 5-5 4 2 6-8" /><circle cx="4" cy="18" r="1.5" /><circle cx="9" cy="13" r="1.5" /><circle cx="13" cy="15" r="1.5" /><circle cx="19" cy="7" r="1.5" /></svg>;

// En escritorio Inicio queda primero. En el celular usamos el mismo conjunto,
// pero Inicio ocupa el cuarto lugar para quedar exactamente en el centro.
const navItems: NavItem[] = [
  { id: "summary", icon: "⌂", label: "Inicio", mobile: "Inicio" },
  { id: "friends", icon: friendsIcon, label: "Amigos", mobile: "Amigos" },
  { id: "physical", icon: physicalIcon, label: "Físico", mobile: "Físico" },
  { id: "focus", icon: focusIcon, label: "Foco", mobile: "Foco" },
  { id: "sleep", icon: "☾", label: "Sueño", mobile: "Sueño" },
  { id: "plan", icon: "◎", label: "Plan", mobile: "Plan" },
  { id: "stats", icon: statsIcon, label: "Estadísticas", mobile: "Datos" },
];
const mobileNavItems: NavItem[] = [
  navItems.find((item) => item.id === "physical")!,
  navItems.find((item) => item.id === "focus")!,
  navItems.find((item) => item.id === "sleep")!,
  { ...navItems.find((item) => item.id === "summary")!, center: true },
  navItems.find((item) => item.id === "plan")!,
  navItems.find((item) => item.id === "stats")!,
  navItems.find((item) => item.id === "friends")!,
];

/** Adónde lleva cada aviso ahora que las secciones se agruparon. */
const insightTargets: Record<string, InsightTarget> = {
  training: { section: "physical", physicalTab: "training" },
  meals: { section: "physical", physicalTab: "meals" },
  focus: { section: "focus" },
  books: { section: "focus", focusTab: "study" },
  sleep: { section: "sleep" },
  goals: { section: "plan" },
  calendar: { section: "plan" },
  score: { section: "score" },
  stats: { section: "stats" },
};
const priorityLabels = ["", "Secundario", "Importante", "Prioridad"];
const FEEDBACK_TYPES: Array<[FeedbackType, string, string, string]> = [
  ["positive", "♡", "Me gustó algo", "Algo que querés que mantengamos."],
  ["idea", "✦", "Tengo una sugerencia", "Una idea, función o cambio que sumarías."],
  ["bug", "!", "Encontré un problema", "Algo no funciona como debería."],
  ["dislike", "−", "Hay algo que no me gusta", "Funciona, pero lo cambiarías."],
];
const FEEDBACK_SECTIONS = ["Inicio", "Daily Score", "Físico", "Foco", "Sueño", "Plan", "Estadísticas", "Amigos", "Cuenta / configuración", "Otra"];
const MAX_VOICE_UPLOAD_BYTES = 900 * 1024;
const VOICE_AUTO_STOP_BYTES = 800 * 1024;
// Safari puede rechazar rutas relativas dentro de previews embebidos. Construir
// la URL desde el origen evita el DOMException "expected pattern" antes de que
// la solicitud llegue al servidor.
const categoryLabels: Record<GoalCategory, string> = { general: "Personal", gym: "Gimnasio", training: "Entrenamiento", nutrition: "Alimentación", reading: "Lectura", study: "Estudio", work: "Trabajo", sleep: "Sueño", score: "Daily Score", calendar: "Calendario", stats: "Estadísticas", goals: "Objetivos" };
const goalAreaOptions: Array<{ value: GoalCategory; label: string }> = [
  { value: "general", label: "Personal / Inicio" }, { value: "score", label: "Daily Score" }, { value: "training", label: "Entrenamiento" },
  { value: "nutrition", label: "Alimentación" }, { value: "sleep", label: "Sueño" }, { value: "study", label: "Estudio" },
  { value: "work", label: "Trabajo" }, { value: "calendar", label: "Calendario / planificación" }, { value: "stats", label: "Estadísticas" },
  { value: "reading", label: "Biblioteca / lectura" }, { value: "goals", label: "Objetivos" },
];
const periodLabels: Record<GoalPeriod, string> = { weekly: "Esta semana", monthly: "Este mes", annual: "Este año", custom: "Plazo personal" };
// Horas que tiene sentido elegir para cada campo del selector de sueño, para
// que la lista de horas sea corta (nadie se acuesta a las 11 de la mañana).
const BEDTIME_HOUR_OPTIONS = ["19", "20", "21", "22", "23", "00", "01", "02", "03", "04", "05"];
const WAKE_HOUR_OPTIONS = ["05", "06", "07", "08", "09", "10", "11", "12", "13", "14"];
const WEEKLY_TARGET_OPTIONS: DropdownOption[] = Array.from({ length: 14 }, (_, index) => ({ value: String(index + 1), label: `${index + 1} por semana` }));
const EVENT_CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "personal", label: "Personal" }, { value: "study", label: "Estudio" }, { value: "work", label: "Trabajo" },
  { value: "training", label: "Entrenamiento" }, { value: "health", label: "Salud" }, { value: "other", label: "Otro" },
];
const kindLabels: Record<Discipline["kind"], string> = { strength: "Fuerza / gimnasio", running: "Running", cycling: "Ciclismo", swimming: "Natación", sport: "Deporte", other: "Otra" };
// Recorrido guiado de la primera vez: sólo elementos de Inicio, para no tener
// que navegar entre secciones mientras el tour está abierto.
const TOUR_STEPS: TourStep[] = [
  { selector: "[data-tour='nav']", title: "Tus áreas, siempre a mano", body: "Entrenamiento, Alimentación, Sueño, Estudio o Trabajo, Plan, Estadísticas y Amigos. Todo vive acá." },
  { selector: "[data-tour='score']", title: "Tu Daily Score", body: "Un puntaje diario armado con lo que registraste y el peso que le diste a cada prioridad." },
  { selector: "[data-tour='metrics']", title: "Lo que más te importa", body: "Estas tarjetas cambian según tus prioridades: acá vas a ver tu avance del día." },
  { selector: "[data-tour='voice']", title: "Cerrá tu día hablando", body: "Contá qué hiciste en 60 segundos en vez de cargar cada cosa a mano." },
  { selector: "[data-tour='profile']", title: "Tu cuenta", body: "Datos personales, membresía y cerrar sesión, todo desde acá." },
];
/** Mensajes cortos para el botón "Mandar un mensaje" del círculo: un empujón, no una conversación. */
const FRIEND_NUDGE_MESSAGES = [
  "¡Vamos que se puede! 💪",
  "¿Cómo va tu semana?",
  "Te extrañamos por acá, ¿todo bien?",
  "¡Gran racha! Seguí así 🔥",
];
const disciplineKindOptions: DropdownOption[] = Object.entries(kindLabels).map(([value, label]) => ({ value, label }));
const bookLanguageOptions = [
  ["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"], ["fr", "Francés"], ["it", "Italiano"], ["de", "Alemán"],
] as const;

function argentinaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
/** Hora actual en Buenos Aires, en minutos desde medianoche. */
function argentinaMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return minutesFromClock(parts) ?? 0;
}

// Meta semanal de entrenamientos para la racha de constancia: vive en este
// navegador (localStorage), no en el servidor, así que se lee con
// useSyncExternalStore en vez de useState+useEffect. Evita el flash de
// hidratación (el snapshot de servidor siempre es el default) y el
// cascading-render de hacer setState dentro de un efecto.
const TRAINING_WEEKLY_TARGET_KEY = "avora:training-weekly-target";
const trainingWeeklyTargetListeners = new Set<() => void>();
function subscribeTrainingWeeklyTarget(onChange: () => void) {
  trainingWeeklyTargetListeners.add(onChange);
  return () => trainingWeeklyTargetListeners.delete(onChange);
}
function getTrainingWeeklyTargetSnapshot() {
  const stored = Number(window.localStorage.getItem(TRAINING_WEEKLY_TARGET_KEY));
  return stored > 0 ? stored : 3;
}
function getTrainingWeeklyTargetServerSnapshot() {
  return 3;
}
function setTrainingWeeklyTargetValue(value: number) {
  const next = Math.min(14, Math.max(1, Math.round(value)));
  window.localStorage.setItem(TRAINING_WEEKLY_TARGET_KEY, String(next));
  trainingWeeklyTargetListeners.forEach((listener) => listener());
}
function weekFor(date: string) {
  const center = new Date(date + "T12:00:00");
  const mondayOffset = (center.getDay() + 6) % 7;
  const monday = new Date(center);
  monday.setDate(center.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return { iso: current.toISOString().slice(0, 10), short: ["L", "M", "M", "J", "V", "S", "D"][index], number: current.getDate() };
  });
}
/** Fecha objetivo para los plazos relativos. "custom" no pasa por acá: ahí el usuario elige el día exacto con el DatePicker. */
function goalDeadline(today: string, period: Exclude<GoalPeriod, "custom">) {
  const date = new Date(today + "T12:00:00");
  if (period === "weekly") date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  if (period === "monthly") date.setMonth(date.getMonth() + 1, 0);
  if (period === "annual") date.setMonth(11, 31);
  return date.toISOString().slice(0, 10);
}
function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
}
function dayDistance(from: string, to: string) {
  return Math.ceil((new Date(to + "T12:00:00").getTime() - new Date(from + "T12:00:00").getTime()) / 86400000);
}
function datePlus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}
/** "mañana" / "el miércoles": cómo se nombra un día cercano al hablar. */
function weekdayLabel(date: string) {
  const name = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(new Date(date + "T12:00:00"));
  return name === "sábado" || name === "domingo" ? `el ${name}` : `el ${name}`;
}
/** Días con actividad dentro de los últimos siete, para el corte semanal. */
function countActiveDays(byDate: Record<string, number>, today: string, days = 7) {
  let count = 0;
  for (let offset = 0; offset < days; offset += 1) {
    if ((byDate[dateMinus(today, offset)] ?? 0) > 0) count += 1;
  }
  return count;
}
function dateMinus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}
/** Valida un "HH:MM" en 24 h (lo que devuelve un input type="time"); si no matchea, el fallback. */
function normalizeClock(value: string, fallback: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}
function sleepDuration(bedtime: string, wakeTime: string) {
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  let minutes = wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.min(minutes, 24 * 60);
}
function durationOptions(minutesList: number[]): DropdownOption[] {
  return minutesList.map((minutes) => ({ value: String(minutes), label: formatMinutes(minutes) }));
}
function formatFocusHours(minutes: number) {
  const hours = Math.max(0, minutes) / 60;
  const value = Number.isInteger(hours) ? String(hours) : hours.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `${value} h`;
}
function projectOptions(projects: Array<{ id: number; name: string }>, noneLabel = "Sin proyecto"): DropdownOption[] {
  return [{ value: "", label: noneLabel }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))];
}
const DIET_ACTIVITY_MULTIPLIERS: Record<DietForm["activityLevel"], number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
/**
 * Mismo cálculo (Mifflin-St Jeor + actividad + ritmo del objetivo) que ya usa
 * el plan con IA como punto de partida — acá es directamente el resultado,
 * sin pasar por la IA. Devuelve null si todavía faltan datos.
 */
function estimateTargetCalories(form: Pick<DietForm, "age" | "heightCm" | "currentWeightKg" | "targetWeightKg" | "sex" | "activityLevel" | "goalPace">) {
  const { age, heightCm, currentWeightKg, targetWeightKg, sex, activityLevel, goalPace } = form;
  if (!age || !heightCm || !currentWeightKg || !targetWeightKg) return null;
  const sexOffset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const basalEstimate = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const maintenanceCalories = Math.round(basalEstimate * DIET_ACTIVITY_MULTIPLIERS[activityLevel]);
  const difference = targetWeightKg - currentWeightKg;
  const adjustment = goalPace === "moderate" ? 450 : 300;
  const minimumCalories = sex === "male" ? 1500 : sex === "female" ? 1200 : 1350;
  const targetCalories = Math.round(Math.max(minimumCalories, Math.min(6000, maintenanceCalories + (difference < -0.5 ? -adjustment : difference > 0.5 ? Math.min(300, adjustment) : 0))) / 10) * 10;
  return { maintenanceCalories, targetCalories };
}
function parseDietPlan(value: string | undefined) {
  try { return value ? JSON.parse(value) as DietPlanContent : null; } catch { return null; }
}
function normalizeBookText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
async function preparePhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
    return blob ? new File([blob], "comida.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * Envuelve una función de pago: muestra el contenido real detrás de un velo
 * borroso con candado. El contenido queda inerte, así que no se puede tocar ni
 * llegar con el teclado; el candado lleva a la comparación de planes.
 */
/** "5:30 min/km": el ritmo no se carga a mano, sale de tiempo y distancia. */
function paceLabel(durationMinutes: number, distanceKm: number) {
  if (!durationMinutes || !distanceKm) return null;
  const totalSeconds = Math.round((durationMinutes * 60) / distanceKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

/** Mantiene el ancho original del botón mientras muestra carga y confirmación. */
function SaveButtonContent({ label, phase }: { label: ReactNode; phase: SavePhase }) {
  return <span className="save-button-content">
    <span className="save-button-label" aria-hidden={phase !== null}>{label}</span>
    {phase === "saving" && <span className="save-button-feedback save-button-loading" role="status" aria-label="Guardando"><i /><i /><i /></span>}
    {phase === "saved" && <span className="save-button-feedback save-button-saved" role="status" aria-label="Guardado">✓</span>}
  </span>;
}

/**
 * Detalle de sesión para disciplinas de distancia (running, ciclismo,
 * natación): distancia + tiempo, con el ritmo calculado en vivo. Es
 * controlado (no FormData) porque necesita recalcular el ritmo mientras se
 * escribe; `key={disciplineId-date}` en el padre lo remonta al cambiar de
 * disciplina o de día, así vuelve a partir de lo que ya había ese día.
 */
function DistanceSessionForm({ disciplineId, date, log, notePlaceholder, saving, savePhase, onSave }: {
  disciplineId: number;
  date: string;
  log: TrainingLog | undefined;
  notePlaceholder: string;
  saving: boolean;
  savePhase: SavePhase;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [durationMinutes, setDurationMinutes] = useState(log?.durationMinutes ?? 0);
  const [distanceKm, setDistanceKm] = useState(log ? log.distanceMeters / 1000 : 0);
  const pace = paceLabel(durationMinutes, distanceKm);
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ action: "save_training", disciplineId, date, durationMinutes, distanceKm, notes: form.get("notes") }); }}>
    <div className="two-fields">
      <label>Distancia (km)<input type="number" min="0" step=".01" value={distanceKm || ""} onChange={(event) => setDistanceKm(Number(event.target.value) || 0)} /></label>
      <label>Tiempo (min)<input type="number" min="0" value={durationMinutes || ""} onChange={(event) => setDurationMinutes(Number(event.target.value) || 0)} /></label>
    </div>
    <div className="pace-preview"><span>◷</span><p><small>RITMO</small><b>{pace ?? "Cargá distancia y tiempo"}</b></p></div>
    <label>Notas<textarea name="notes" defaultValue={log?.notes || ""} placeholder={notePlaceholder} /></label>
    <button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar sesión" phase={savePhase} /></button>
  </form>;
}

function LockedFeature({ title, note, onOpen, children }: { title: string; note: string; onOpen: () => void; children: React.ReactNode }) {
  return <div className="pro-locked">
    <div className="pro-locked-content" inert>{children}</div>
    <button type="button" className="pro-lock-veil" onClick={onOpen}>
      <span className="pro-lock-badge" aria-hidden="true">🔒</span>
      <b>{title}</b>
      <small>{note}</small>
      <span className="pro-lock-cta">Ver AVORA Pro <i>→</i></span>
    </button>
  </div>;
}

function SavedBookCover({ book }: { book: Book }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (book.coverUrl && !imageFailed) {
    return <div className="book-cover book-cover-original"><Image src={book.coverUrl} alt={`Portada de ${book.title}`} width={70} height={98} unoptimized onError={() => setImageFailed(true)} /></div>;
  }
  return <div className="book-cover"><small>{book.author || "MI LIBRO"}</small><b>{book.title}</b></div>;
}

function CatalogBookCover({ book, compact = false }: { book: BookSuggestion; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (book.coverUrl && !imageFailed) return <Image src={book.coverUrl} alt={compact ? "" : `Portada de ${book.title}`} width={compact ? 35 : 96} height={compact ? 48 : 145} unoptimized onError={() => setImageFailed(true)} />;
  if (compact) return <span className="mini-book-placeholder">▱</span>;
  return <div className="result-book-placeholder"><span>▱</span><small>SIN PORTADA</small></div>;
}

const emptyData = (user: User, monthKey: string): ProgressData => ({
  profile: user, gymDates: [], disciplines: [], trainingLogs: [], exerciseLogs: [], meals: [], mealHistory: [], books: [],
  readingLogs: [], readingHistory: [], notes: [], goals: [], priorities: { monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 },
  dailyCheckin: null, dailyCheckins: [], focusProjects: [], focusSessions: [], tasks: [], events: [],
  dietPlan: null,
});

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (response.status === 401) throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
    if (response.status === 413) throw new Error("El archivo es demasiado pesado. Probá nuevamente con uno más chico.");
    throw new Error("El servidor no devolvió una respuesta. Recargá la página e intentá nuevamente.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("No pudimos interpretar la respuesta del servidor. Recargá la página e intentá nuevamente.");
  }
}

export default function ProgressClient({ initialUser, initialError = "", pendingInviteCode = "", inviteResult = "", showTutorial = false }: {
  initialUser: User;
  initialError?: string;
  /** Código guardado al abrir un link de invitación sin sesión. */
  pendingInviteCode?: string;
  /** Resultado de un link abierto ya con sesión, para avisar sin recargar. */
  inviteResult?: "" | "ok" | "error";
  /** Sólo viene en true en el primer redirect después de completar el onboarding (ver `?tour=1`). */
  showTutorial?: boolean;
}) {
  const [today] = useState(argentinaDate);
  const monthKey = today.slice(0, 7);
  const week = useMemo(() => weekFor(today), [today]);
  const [data, setData] = useState<ProgressData>(() => emptyData(initialUser, monthKey));
  const [section, setSection] = useState<Section>("summary");
  const [tourActive, setTourActive] = useState(showTutorial);
  // El query param sólo sirve para prender el tour en este redirect puntual:
  // se lo saca de la URL enseguida para que un refresh no lo repita.
  useEffect(() => {
    if (!showTutorial) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [showTutorial]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("home");
  const [settingsName, setSettingsName] = useState("");
  const [settingsUsername, setSettingsUsername] = useState("");
  const [weeklySummary, setWeeklySummary] = useState(initialUser.usagePreferences.includes("weekly"));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [feedbackSection, setFeedbackSection] = useState("Inicio");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(initialUser.onboardingCompleted);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ key: string; phase: Exclude<SavePhase, null> } | null>(null);
  const saveFeedbackTimerRef = useRef<number | null>(null);
  const [error, setError] = useState(initialError);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [onboardingName, setOnboardingName] = useState(initialUser.displayName);
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingGoals, setOnboardingGoals] = useState<string[]>([]);
  const [onboardingPreferences, setOnboardingPreferences] = useState<string[]>([]);
  const usernameValue = onboardingUsername.trim().toLowerCase();
  const usernameFormatValid = /^[a-z0-9_]{3,20}$/.test(usernameValue);
  // Chequeo en vivo, con debounce, de si el nombre de usuario está libre. El
  // índice único del lado del servidor es la garantía real; esto es sólo para
  // avisar antes de que intenten enviar el formulario. El resultado va con el
  // valor que lo generó: si ya cambiaste lo que escribiste, "checking" se
  // deriva solo (más abajo) en vez de necesitar otro setState acá.
  const [usernameCheck, setUsernameCheck] = useState<{ value: string; status: "available" | "taken" } | null>(null);
  useEffect(() => {
    if (!usernameFormatValid) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "check_username", username: usernameValue }) })
        .then((response) => response.json())
        .then((result: { available?: boolean }) => { if (!cancelled) setUsernameCheck({ value: usernameValue, status: result.available ? "available" : "taken" }); })
        .catch(() => {});
    }, 400);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [usernameValue, usernameFormatValid]);
  const usernameStatus: "idle" | "checking" | "available" | "taken" | "invalid" = !usernameValue ? "idle"
    : !usernameFormatValid ? "invalid"
    : usernameCheck?.value === usernameValue ? usernameCheck.status
    : "checking";
  const [priorityDraft, setPriorityDraft] = useState<Priorities>({ monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 });
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [trainingDate, setTrainingDate] = useState(today);
  const [trainingWeekAnchor, setTrainingWeekAnchor] = useState(today);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("weekly");
  // Meta de entrenamientos por semana, para la racha de constancia. Vive en
  // este navegador (no en el servidor) porque es una preferencia liviana de
  // lectura de la racha, no un dato que otra pantalla necesite.
  const trainingWeeklyTarget = useSyncExternalStore(subscribeTrainingWeeklyTarget, getTrainingWeeklyTargetSnapshot, getTrainingWeeklyTargetServerSnapshot);
  const setTrainingWeeklyTarget = setTrainingWeeklyTargetValue;
  const [calendarCursor, setCalendarCursor] = useState(today.slice(0, 7));
  const [physicalTab, setPhysicalTab] = useState<PhysicalTab>("training");
  const [focusTab, setFocusTab] = useState<FocusTab>("study");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"monthly" | "annual">("annual");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "processing" | "done">("form");
  const [friendsNotice, setFriendsNotice] = useState(
    inviteResult === "ok" ? "¡Listo! Ya son amigos: van a ver el Daily Score del otro." :
    inviteResult === "error" ? "Esa invitación no se pudo usar: puede estar vencida, ya aceptada o ser para otra cuenta." : "",
  );
  const [social, setSocial] = useState<SocialData>(emptySocial);
  const [friendsTab, setFriendsTab] = useState<"circle" | "groups">("circle");
  const [nudgeOpenFor, setNudgeOpenFor] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  // Crear un grupo es un formulario aparte que termina en "Guardar grupo":
  // nombre, objetivo e invitaciones se deciden juntos y una sola vez.
  const [groupWizard, setGroupWizard] = useState(false);
  const [groupDraft, setGroupDraft] = useState({ name: "", accent: "mint" as GroupAccent });
  const [wizardGoal, setWizardGoal] = useState<GoalDraft>(emptyGoalDraft);
  const [wizardInvites, setWizardInvites] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState("");
  // Un grupo ya guardado muestra sólo su objetivo: el nombre, el color, los
  // objetivos y las invitaciones viven detrás de los tres íconos del encabezado.
  const [groupPanel, setGroupPanel] = useState<{ id: number; tab: GroupPanelTab } | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({ name: "", accent: "mint" as GroupAccent });
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  /** Última marca automática publicada por objetivo, para no reenviarla igual. */
  const autoGoalRef = useRef<Record<number, number>>({});
  const publishedShareRef = useRef("");
  const pendingInviteRef = useRef(false);
  // Tildado optimista: la fila responde al toque y recién después se confirma
  // contra el servidor, así no hay medio segundo de pantalla muerta.
  const [pendingTasks, setPendingTasks] = useState<Record<number, boolean>>({});
  const [agendaView, setAgendaView] = useState<"week" | "month">("week");
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [slotDraft, setSlotDraft] = useState<{ date: string; startTime: string } | null>(null);
  const [nowMinutes, setNowMinutes] = useState(argentinaMinutes);
  const [dietCalendarCursor, setDietCalendarCursor] = useState(today.slice(0, 7));
  const [bookTab, setBookTab] = useState<BookStatus>("reading");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [bookShelfPage, setBookShelfPage] = useState(0);
  const [pagesInput, setPagesInput] = useState(0);
  const [note, setNote] = useState("");
  const [bookForm, setBookForm] = useState(false);
  const [bookDraft, setBookDraft] = useState({ title: "", author: "", totalPages: 0, status: "reading" as BookStatus, coverUrl: "", externalKey: "" });
  const [bookSuggestions, setBookSuggestions] = useState<BookSuggestion[]>([]);
  const [bookSuggestLoading, setBookSuggestLoading] = useState(false);
  const [bookMatching, setBookMatching] = useState(false);
  const [bookSuggestionOpen, setBookSuggestionOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLanguage, setDiscoverLanguage] = useState("es");
  const [discoverResults, setDiscoverResults] = useState<BookSuggestion[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearched, setDiscoverSearched] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [mealPhoto, setMealPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [dietForm, setDietForm] = useState<DietForm>({ age: 25, sex: "unspecified", heightCm: 175, currentWeightKg: 75, targetWeightKg: 70, activityLevel: "light", goalPace: "gentle", preferences: "", details: "" });
  // Calculadora rápida (sin IA): null = seguir la sugerencia calculada en vivo; un número = lo que el usuario aceptó o modificó a mano.
  const [dietQuickCalories, setDietQuickCalories] = useState<number | null>(null);
  function setDietQuickField<K extends keyof DietForm>(key: K, value: DietForm[K]) {
    setDietForm((current) => ({ ...current, [key]: value }));
    setDietQuickCalories(null);
  }
  const [dietGenerating, setDietGenerating] = useState(false);
  const [generatedDietPlan, setGeneratedDietPlan] = useState<DietPlanContent | null>(null);
  const [dietRecording, setDietRecording] = useState(false);
  const [dietVoiceLoading, setDietVoiceLoading] = useState(false);
  const [sleepBedtime, setSleepBedtime] = useState("23:00");
  const [sleepWaketime, setSleepWaketime] = useState("07:00");
  const [focusHours, setFocusHours] = useState(0);
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("weekly");
  const [customDate, setCustomDate] = useState(() => datePlus(argentinaDate(), 30));
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCheckin | null>(null);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingBytesRef = useRef(0);
  const dietRecorderRef = useRef<MediaRecorder | null>(null);
  const dietStreamRef = useRef<MediaStream | null>(null);
  const dietChunksRef = useRef<Blob[]>([]);
  const dietRecordingBytesRef = useRef(0);
  const dietStopTimerRef = useRef<number | null>(null);
  const dietHydratedRef = useRef(false);
  const sleepHydratedRef = useRef(false);

  // El menú de cuenta se comporta como un desplegable real: cualquier toque
  // exterior o Escape lo cierra, sin interferir con sus acciones internas.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target) && !mobileProfileRef.current?.contains(target)) setProfileMenuOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => () => {
    if (saveFeedbackTimerRef.current !== null) window.clearTimeout(saveFeedbackTimerRef.current);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/progress?date=" + today + "&weekStart=" + week[0].iso + "&weekEnd=" + week[6].iso + "&month=" + monthKey, { cache: "no-store", credentials: "same-origin" });
      const next = await readJson<ProgressData & { error?: string }>(response);
      if (!response.ok) throw new Error(next.error || "No pudimos cargar tus datos.");
      setData(next);
      setPriorityDraft(next.priorities);
      setSelectedDisciplineId((current) => current ?? next.disciplines[0]?.id ?? null);
      if (next.dietPlan && !dietHydratedRef.current) {
        setDietForm({
          age: next.dietPlan.age,
          sex: next.dietPlan.sex,
          heightCm: next.dietPlan.heightCm,
          currentWeightKg: next.dietPlan.currentWeightDeciKg / 10,
          targetWeightKg: next.dietPlan.targetWeightDeciKg / 10,
          activityLevel: next.dietPlan.activityLevel,
          goalPace: next.dietPlan.goalPace,
          preferences: next.dietPlan.preferences,
          details: next.dietPlan.details,
        });
        setDietQuickCalories(next.dietPlan.targetCalories || null);
        dietHydratedRef.current = true;
      }
      if (next.dailyCheckin && !sleepHydratedRef.current) {
        setSleepBedtime(normalizeClock(next.dailyCheckin.bedtime, "23:00"));
        setSleepWaketime(normalizeClock(next.dailyCheckin.wakeTime, "07:00"));
        sleepHydratedRef.current = true;
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error.");
    } finally {
      setLoading(false);
    }
  }, [today, week, monthKey]);
  // Initial synchronization with the signed-in user's persisted workspace.
  useEffect(() => {
    if (!initialUser.onboardingCompleted) return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData, initialUser.onboardingCompleted]);
  // El plan del día marca "ahora" y no ofrece horarios que ya pasaron.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(argentinaMinutes()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const title = bookDraft.title.trim();
    if (!bookForm || !bookSuggestionOpen || title.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBookSuggestLoading(true);
      try {
        const response = await fetch(`/api/book-search?q=${encodeURIComponent(title)}&limit=6`, { signal: controller.signal });
        const result = await readJson<{ books?: BookSuggestion[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error || "No pudimos buscar libros.");
        setBookSuggestions(result.books ?? []);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setBookSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setBookSuggestLoading(false);
      }
    }, 320);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [bookDraft.title, bookForm, bookSuggestionOpen]);
  // Keep the page counter aligned when the visible book changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => {
      if (seconds >= 59) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        return 60;
      }
      return seconds + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const beginSaveFeedback = useCallback((key: string) => {
    if (saveFeedbackTimerRef.current !== null) window.clearTimeout(saveFeedbackTimerRef.current);
    setSaveFeedback({ key, phase: "saving" });
  }, []);

  const finishSaveFeedback = useCallback((key: string, succeeded: boolean) => {
    if (!succeeded) {
      setSaveFeedback((current) => current?.key === key ? null : current);
      return;
    }
    setSaveFeedback({ key, phase: "saved" });
    saveFeedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback((current) => current?.key === key && current.phase === "saved" ? null : current);
      saveFeedbackTimerRef.current = null;
    }, 1000);
  }, []);

  const savePhase = (key: string): SavePhase => saveFeedback?.key === key ? saveFeedback.phase : null;

  async function save(payload: Record<string, unknown>, feedbackKey = String(payload.action ?? "save")) {
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      await loadData();
      finishSaveFeedback(feedbackKey, true);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
      finishSaveFeedback(feedbackKey, false);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Círculo social. Vive en su propio pedido: es la única parte de la app que
  // lee filas de otras cuentas, y no tiene por qué demorar el resto del panel.
  // ---------------------------------------------------------------------------
  const loadSocial = useCallback(async () => {
    try {
      const response = await fetch("/api/friends", { cache: "no-store", credentials: "same-origin" });
      const next = await readJson<SocialData & { error?: string }>(response);
      if (!response.ok) throw new Error(next.error || "No pudimos cargar tu círculo.");
      setSocial(next);
    } catch (caught) {
      setFriendsNotice(caught instanceof Error ? caught.message : "No pudimos cargar tu círculo.");
    }
  }, []);

  const sendSocial = useCallback(async (payload: Record<string, unknown>, feedbackKey = String(payload.action ?? "social")) => {
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    try {
      const response = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await readJson<{ error?: string } & Record<string, unknown>>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo completar la acción.");
      await loadSocial();
      finishSaveFeedback(feedbackKey, true);
      return result;
    } catch (caught) {
      setFriendsNotice(caught instanceof Error ? caught.message : "No se pudo completar la acción.");
      finishSaveFeedback(feedbackKey, false);
      return null;
    } finally {
      setSaving(false);
    }
  }, [beginSaveFeedback, finishSaveFeedback, loadSocial]);

  // Sólo saca duplicados reales (misma fila repetida): antes agrupaba por
  // proyecto+fecha y se comía sesiones legítimas cuando estudiabas la misma
  // materia dos veces el mismo día.
  const uniqueFocusSessions = useMemo(
    () => data.focusSessions.filter((item, index, rows) => rows.findIndex((candidate) => candidate.id === item.id) === index),
    [data.focusSessions],
  );

  // Series por fecha. Alimentan las tendencias de Estadísticas y también el
  // Daily Score, para que el puntaje de hoy y el del histórico salgan del
  // mismo lugar y nunca se contradigan entre pantallas.
  const trainingByDate = useMemo(() => sumByDate(data.trainingLogs, (row) => row.trainingDate, () => 1), [data.trainingLogs]);
  const focusByDate = sumByDate(uniqueFocusSessions, (row) => row.sessionDate, (row) => row.minutes);
  const readingByDate = sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages);
  const caloriesByDay = sumByDate(data.mealHistory, (row) => row.mealDate, (row) => row.calories);
  const mealCountByDate = sumByDate(data.mealHistory, (row) => row.mealDate, () => 1);
  const sleepMinutesByDate = sumByDate(data.dailyCheckins.filter((row) => row.sleepMinutes > 0), (row) => row.entryDate, (row) => row.sleepMinutes);

  // Fechas en las que cerraste algo. Se arma una vez porque el histórico del
  // Daily Score pregunta por cientos de días seguidos.
  const completionDates = new Set([
    ...data.goals.filter((goal) => goal.completedAt).map((goal) => (goal.completedAt as string).slice(0, 10)),
    ...data.tasks.filter((task) => task.completedAt).map((task) => (task.completedAt as string).slice(0, 10)),
  ]);

  /** Lo que registraste un día cualquiera, tal cual, sin interpretar. */
  const dayRecordFor = (date: string): DayRecord => ({
    trainingSessions: trainingByDate[date] ?? 0,
    meals: mealCountByDate[date] ?? 0,
    sleepMinutes: sleepMinutesByDate[date] ?? 0,
    focusMinutes: focusByDate[date] ?? 0,
    pages: readingByDate[date] ?? 0,
    completedSomething: completionDates.has(date),
    // Un objetivo cuenta como abierto ese día si ya existía y todavía no
    // estaba cerrado: así el histórico no se contamina con objetivos que
    // creaste después.
    hasOpenGoals: data.goals.some((goal) => goal.createdAt.slice(0, 10) <= date && (!goal.completedAt || goal.completedAt.slice(0, 10) >= date)),
  });

  const trainingToday = data.trainingLogs.filter((log) => log.trainingDate === today);
  const trainedToday = trainingToday.length > 0;
  const calories = data.meals.reduce((sum, meal) => sum + meal.calories, 0);
  const pagesToday = data.readingLogs.reduce((sum, log) => sum + log.pages, 0);
  const sleepToday = data.dailyCheckins.find((item) => item.entryDate === today)?.sleepMinutes ?? 0;
  const focusToday = uniqueFocusSessions.filter((item) => item.sessionDate === today).reduce((sum, item) => sum + item.minutes, 0);
  const scoreWeights: ScoreWeights = priorityDraft;
  const factors = dayFactors(dayRecordFor(today));
  const score = scoreFrom(factors, scoreWeights);
  /** El mismo puntaje, para cualquier día del historial cargado. */
  const scoreForDate = (date: string) => scoreFrom(dayFactors(dayRecordFor(date)), scoreWeights);
  const priorityPairs: Array<[string, number]> = [["Entrenamiento", priorityDraft.gymWeight], ["Alimentación", priorityDraft.nutritionWeight], ["Sueño", priorityDraft.sleepWeight], ["Estudio / Trabajo", priorityDraft.focusWeight], ["Lectura", priorityDraft.readingWeight], ["Objetivos", priorityDraft.goalsWeight]];
  const highestPriority = Math.max(...priorityPairs.map((item) => item[1]));
  const topPriorities = priorityPairs.filter((item) => item[1] === highestPriority);
  // Elegir dos o tres áreas en el onboarding es lo normal, así que un empate no
  // significa "equilibrio": significa que esas áreas son las prioritarias.
  // Sólo hay equilibrio real cuando las seis pesan lo mismo.
  const priorityNames = topPriorities.map((item) => item[0]);
  // Sólo hay equilibrio cuando las seis áreas pesan exactamente lo mismo.
  // Cuatro o cinco prioridades siguen siendo una selección válida y deben
  // mostrarse completas en Inicio.
  const balanced = topPriorities.length === priorityPairs.length;
  const priorityCaption = balanced
    ? "Las seis áreas pesan lo mismo en tu Daily Score."
    : priorityNames.length === 1
      ? `${priorityNames[0]} pesa más que el resto en tu Daily Score.`
      : `${listPhrase(priorityNames)} pesan más que el resto en tu Daily Score.`;
  const displayName = data.profile.displayName.split(" ")[0] || "Usuario";
  const activeGoals = data.goals.filter((goal) => !goal.completedAt);
  const selectedDiscipline = data.disciplines.find((item) => item.id === selectedDisciplineId) ?? data.disciplines[0] ?? null;
  const selectedTrainingLog = selectedDiscipline ? data.trainingLogs.find((item) => item.disciplineId === selectedDiscipline.id && item.trainingDate === trainingDate) : undefined;
  const selectedExercises = selectedTrainingLog ? data.exerciseLogs.filter((item) => item.trainingLogId === selectedTrainingLog.id) : [];
  // Cada disciplina tiene un único detalle de sesión posible: nunca conviven
  // el de pesas, el de distancia y el genérico para la misma disciplina.
  const isDistanceDiscipline = selectedDiscipline?.kind === "running" || selectedDiscipline?.kind === "cycling" || selectedDiscipline?.kind === "swimming";
  const trainingDetailTitle = !selectedDiscipline ? "" : selectedDiscipline.kind === "strength" ? "SESIÓN DE GIMNASIO"
    : selectedDiscipline.kind === "running" ? "SESIÓN DE RUNNING"
    : selectedDiscipline.kind === "cycling" ? "SESIÓN DE CICLISMO"
    : selectedDiscipline.kind === "swimming" ? "SESIÓN DE NATACIÓN"
    : "DETALLE DE SESIÓN";
  const booksInTab = data.books.filter((book) => book.status === bookTab);
  const bookShelfPageCount = Math.max(1, Math.ceil(booksInTab.length / 3));
  const visibleBookShelfPage = Math.min(bookShelfPage, bookShelfPageCount - 1);
  const visibleBooks = booksInTab.slice(visibleBookShelfPage * 3, visibleBookShelfPage * 3 + 3);
  const selectedBook = booksInTab.find((book) => book.id === selectedBookId) ?? booksInTab[0] ?? null;
  const selectedReadingLog = selectedBook ? data.readingLogs.find((log) => log.bookId === selectedBook.id) : undefined;
  const savedDietPlan = useMemo(() => parseDietPlan(data.dietPlan?.planJson), [data.dietPlan?.planJson]);
  const displayedDietPlan = generatedDietPlan ?? savedDietPlan;
  const dietTargetCalories = generatedDietPlan?.targetCalories ?? data.dietPlan?.targetCalories ?? 0;
  const calculatedSleepMinutes = sleepDuration(sleepBedtime, sleepWaketime);

  // ---------------------------------------------------------------------------
  // Plan del día: la agenda con horarios, los huecos libres y los avisos que
  // cruzan datos entre secciones. Todo derivado de `data`, sin pedidos extra.
  // ---------------------------------------------------------------------------
  const projectNames = useMemo(
    () => Object.fromEntries(data.focusProjects.map((project) => [project.id, project.name])) as Record<number, string>,
    [data.focusProjects],
  );
  const scheduleInput = useMemo(
    () => ({ tasks: data.tasks, events: data.events, projectNames }),
    [data.tasks, data.events, projectNames],
  );
  const todayBlocks = useMemo(() => dayBlocks(scheduleInput, today), [scheduleInput, today]);
  const todayUnscheduled = useMemo(() => unscheduledTasks(scheduleInput, today), [scheduleInput, today]);
  const lastCheckin = data.dailyCheckins.find((item) => item.sleepMinutes > 0);
  const todayWindow = useMemo(
    () => dayWindow(lastCheckin?.wakeTime ?? "", lastCheckin?.bedtime ?? ""),
    [lastCheckin?.wakeTime, lastCheckin?.bedtime],
  );
  const todaySlots = useMemo(
    () => freeSlots(todayBlocks, todayWindow.start, todayWindow.end),
    [todayBlocks, todayWindow.start, todayWindow.end],
  );

  // Rachas: días consecutivos con actividad en cada área. Entrenamiento es la
  // excepción: nadie entrena todos los días, así que su racha es semanal
  // (semanas seguidas cumpliendo la meta de entrenamientos por semana).
  const readingDates = useMemo(() => new Set(data.readingHistory.filter((item) => item.pages > 0).map((item) => item.logDate)), [data.readingHistory]);
  const focusDates = useMemo(() => new Set(uniqueFocusSessions.map((item) => item.sessionDate)), [uniqueFocusSessions]);
  const goodSleepDates = useMemo(() => new Set(data.dailyCheckins.filter((item) => item.sleepMinutes >= 420).map((item) => item.entryDate)), [data.dailyCheckins]);
  const loggingDates = useMemo(() => new Set([...data.mealHistory.map((item) => item.mealDate), ...data.dailyCheckins.map((item) => item.entryDate)]), [data.mealHistory, data.dailyCheckins]);
  const streaks = useMemo(() => ({
    training: weeklyStreakFor(trainingByDate, trainingWeeklyTarget, today),
    reading: streakFor(readingDates, today),
    focus: streakFor(focusDates, today),
    sleep: streakFor(goodSleepDates, today),
    logging: streakFor(loggingDates, today),
  }), [trainingByDate, trainingWeeklyTarget, readingDates, focusDates, goodSleepDates, loggingDates, today]);

  // El círculo se carga una vez que la cuenta ya pasó el onboarding: antes no
  // hay nada que mostrar y el pedido sólo agregaría ruido.
  useEffect(() => {
    if (!initialUser.onboardingCompleted) return;
    void loadSocial();
  }, [loadSocial, initialUser.onboardingCompleted]);

  // Un link de invitación abierto sin sesión dejó el código esperando: se
  // canjea solo, una sola vez, apenas la persona entra.
  useEffect(() => {
    if (!pendingInviteCode || pendingInviteRef.current) return;
    pendingInviteRef.current = true;
    void (async () => {
      const result = await sendSocial({ action: "accept_invite", code: pendingInviteCode });
      if (result) {
        const name = String(result.friendName ?? "");
        setFriendsNotice(name ? `Ya son amigos con ${name}.` : "¡Listo! Ya son amigos.");
        setSection("friends");
      }
    })();
  }, [pendingInviteCode, sendSocial]);

  // La foto del día que ven los amigos: sólo el número y la racha, nunca los
  // registros que lo componen. Se publica cuando cambia, no en cada render.
  useEffect(() => {
    if (!initialUser.onboardingCompleted || loading) return;
    const signature = `${today}:${score}:${streaks.logging.current}:${streaks.logging.best}`;
    if (publishedShareRef.current === signature) return;
    publishedShareRef.current = signature;
    void fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "publish_share", shareDate: today, score, streak: streaks.logging.current, bestStreak: streaks.logging.best }),
    }).catch(() => { publishedShareRef.current = ""; });
  }, [initialUser.onboardingCompleted, loading, today, score, streaks]);

  // ---------------------------------------------------------------------------
  // Objetivos de grupo que se cuentan solos. Un objetivo puede declarar de qué
  // se alimenta: si dice "entrenamientos", tu marca sale de lo que ya cargaste
  // en Físico y no hay que anotarla dos veces. Lo que viaja al grupo sigue
  // siendo un número, nunca el registro que lo produjo.
  // ---------------------------------------------------------------------------
  const autoSeries = useMemo(() => ({
    training: sumByDate(data.trainingLogs, (row) => row.trainingDate, () => 1),
    focus: sumByDate(uniqueFocusSessions, (row) => row.sessionDate, (row) => row.minutes),
    reading: sumByDate(data.readingHistory, (row) => row.logDate, (row) => row.pages),
    sleep: sumByDate(data.dailyCheckins.filter((row) => row.sleepMinutes >= 420), (row) => row.entryDate, () => 1),
  }), [data.trainingLogs, uniqueFocusSessions, data.readingHistory, data.dailyCheckins]);

  const autoGoalValue = useCallback((goal: GroupGoal) => {
    if (goal.source === "manual") return 0;
    const window = goalWindow(goal, today);
    let total = 0;
    for (const [date, value] of Object.entries(autoSeries[goal.source])) {
      if (date >= window.start && date <= window.end) total += value;
    }
    return total;
  }, [autoSeries, today]);

  useEffect(() => {
    if (!initialUser.onboardingCompleted || loading) return;
    const me = social.me || data.profile.email.toLowerCase();
    const stale = social.groups
      .flatMap((group) => group.goals)
      .filter((goal) => goal.source !== "manual")
      .map((goal) => ({ goalId: goal.id, value: autoGoalValue(goal), saved: goal.contributions.find((item) => item.userEmail === me)?.value ?? 0 }))
      // El `ref` corta el ciclo: sin él, la recarga que sigue al envío vuelve a
      // disparar el efecto antes de que la fila nueva llegue al cliente.
      .filter((row) => row.value !== row.saved && autoGoalRef.current[row.goalId] !== row.value);
    if (!stale.length) return;
    for (const row of stale) autoGoalRef.current[row.goalId] = row.value;
    void (async () => {
      for (const row of stale) {
        await fetch("/api/friends", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ action: "log_goal_progress", goalId: row.goalId, value: row.value }),
        }).catch(() => { delete autoGoalRef.current[row.goalId]; });
      }
      await loadSocial();
    })();
  }, [social.groups, social.me, autoGoalValue, data.profile.email, initialUser.onboardingCompleted, loading, loadSocial]);

  // Sueño reciente contra la semana anterior, para detectar la caída.
  const sleepByDate = useMemo(
    () => Object.fromEntries(data.dailyCheckins.filter((item) => item.sleepMinutes > 0).map((item) => [item.entryDate, item.sleepMinutes])) as Record<string, number>,
    [data.dailyCheckins],
  );
  const recentSleepNights = useMemo(
    () => Array.from({ length: 3 }, (_, index) => sleepByDate[dateMinus(today, index)]).filter((value): value is number => Boolean(value)),
    [sleepByDate, today],
  );
  const earlierSleepNights = useMemo(
    () => Array.from({ length: 7 }, (_, index) => sleepByDate[dateMinus(today, index + 3)]).filter((value): value is number => Boolean(value)),
    [sleepByDate, today],
  );

  // Áreas con actividad reciente, para saber qué objetivo está realmente parado.
  const activeCategories = useMemo(() => {
    const since = dateMinus(today, 5);
    const categories = new Set<string>();
    if (data.trainingLogs.some((item) => item.trainingDate >= since)) { categories.add("training"); categories.add("gym"); }
    if (data.mealHistory.some((item) => item.mealDate >= since)) categories.add("nutrition");
    if (data.readingHistory.some((item) => item.logDate >= since && item.pages > 0)) categories.add("reading");
    if (uniqueFocusSessions.some((item) => item.sessionDate >= since)) { categories.add("study"); categories.add("work"); }
    if (data.dailyCheckins.some((item) => item.entryDate >= since && item.sleepMinutes > 0)) categories.add("sleep");
    return categories;
  }, [data.trainingLogs, data.mealHistory, data.readingHistory, data.dailyCheckins, uniqueFocusSessions, today]);

  // Los tres días siguientes con sus huecos: es lo que permite que un aviso
  // diga "pasalo al miércoles" en vez de "mirá si algo puede pasar a mañana".
  const comingDays = useMemo<ComingDay[]>(() => Array.from({ length: 3 }, (_, index) => {
    const date = datePlus(today, index + 1);
    const blocks = dayBlocks(scheduleInput, date);
    return { date, label: weekdayLabel(date), slots: freeSlots(blocks, todayWindow.start, todayWindow.end) };
  }), [today, scheduleInput, todayWindow.start, todayWindow.end]);

  const insights = useMemo(() => buildInsights({
    today,
    nowMinutes,
    blocks: todayBlocks,
    slots: todaySlots,
    dayWindow: todayWindow,
    unscheduled: todayUnscheduled.map((task) => ({ id: task.id, title: task.title, durationMinutes: task.durationMinutes })),
    sleepLastNight: sleepByDate[today] ?? sleepByDate[dateMinus(today, 1)] ?? 0,
    sleepRecent: recentSleepNights,
    sleepEarlier: earlierSleepNights,
    caloriesToday: calories,
    targetCalories: dietTargetCalories,
    pagesLast3Days: data.readingHistory.filter((item) => item.logDate >= dateMinus(today, 2)).reduce((sum, item) => sum + item.pages, 0),
    booksInProgress: data.books.filter((book) => book.status === "reading").length,
    goalsDueSoon: data.goals
      .filter((goal) => !goal.completedAt && dayDistance(today, goal.targetDate) >= 0 && dayDistance(today, goal.targetDate) <= 7)
      .map((goal) => ({ title: goal.title, days: dayDistance(today, goal.targetDate), category: goal.category })),
    activeCategories,
    overlaps: overlappingBlocks(todayBlocks),
    comingDays,
  }), [today, nowMinutes, todayBlocks, todaySlots, todayWindow, todayUnscheduled, sleepByDate, recentSleepNights, earlierSleepNights, calories, dietTargetCalories, data.readingHistory, data.books, data.goals, activeCategories, comingDays]);
  const planNotices = useMemo(() => planInsights(insights), [insights]);
  const closeNotices = useMemo(() => closeInsights(insights), [insights]);

  const quote = useMemo(() => quoteForDate(today), [today]);
  useEffect(() => {
    if (selectedBook) {
      setSelectedBookId(selectedBook.id);
      setPagesInput(selectedReadingLog?.pages ?? 0);
    } else {
      setSelectedBookId(null);
      setPagesInput(0);
    }
  }, [selectedBook, selectedReadingLog?.pages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function openSection(next: Section) {
    setSection(next);
    // Los pasos del tour sólo existen en Inicio: si navegás a otra sección
    // mientras está abierto, se corta en vez de quedar "esperando".
    if (next !== "summary") setTourActive(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showBookShelfPage(page: number) {
    const nextPage = Math.max(0, Math.min(bookShelfPageCount - 1, page));
    setBookShelfPage(nextPage);
    setSelectedBookId(booksInTab[nextPage * 3]?.id ?? null);
  }
  async function submitForm(event: FormEvent<HTMLFormElement>, payload: Record<string, unknown>) {
    event.preventDefault();
    const ok = await save(payload);
    if (ok) event.currentTarget.reset();
  }
  function openSettings() {
    setSettingsName(data.profile.displayName);
    setSettingsUsername(data.profile.username);
    setWeeklySummary(data.profile.usagePreferences.includes("weekly"));
    setSettingsView("home");
    setError("");
    setSettingsOpen(true);
    setProfileMenuOpen(false);
  }
  function openPersonalSettings() {
    setSettingsName(data.profile.displayName);
    setSettingsUsername(data.profile.username);
    setError("");
    setSettingsView("personal");
  }
  function openFeedback() {
    setFeedbackSent(false);
    setError("");
    setFeedbackOpen(true);
    setProfileMenuOpen(false);
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = settingsName.trim();
    if (trimmedName.length < 2) { setError("Ingresá tu nombre."); return; }
    if (trimmedName !== data.profile.displayName && !await save({ action: "update_profile", displayName: trimmedName }, "personal_settings")) return;
    const trimmedUsername = settingsUsername.trim().toLowerCase();
    if (trimmedUsername !== data.profile.username && !await save({ action: "set_username", username: trimmedUsername }, "personal_settings")) return;
    setSettingsOpen(false);
  }
  async function saveNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const feedbackKey = "notification_settings";
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: data.profile.displayName, weeklySummary }),
      });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos guardar las notificaciones.");
      await loadData();
      finishSaveFeedback(feedbackKey, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar las notificaciones.");
      finishSaveFeedback(feedbackKey, false);
    } finally {
      setSaving(false);
    }
  }
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackMessage.trim().length < 3) return;
    const feedbackKey = "submit_feedback";
    beginSaveFeedback(feedbackKey);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: feedbackType,
          section: feedbackSection,
          message: feedbackMessage.trim(),
          pagePath: window.location.pathname,
          userAgent: navigator.userAgent,
          appVersion: "beta",
        }),
      });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos enviar el comentario.");
      finishSaveFeedback(feedbackKey, true);
      window.setTimeout(() => {
        setFeedbackMessage("");
        setFeedbackSent(true);
      }, 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos enviar el comentario.");
      finishSaveFeedback(feedbackKey, false);
    } finally {
      setSaving(false);
    }
  }
  async function uploadAvatar(file: File | null | undefined) {
    if (!file) return;
    setAvatarUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/avatar", { method: "POST", body: form, credentials: "same-origin" });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos subir la foto.");
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos subir la foto.");
    } finally {
      setAvatarUploading(false);
    }
  }
  function openAddBook(status: BookStatus = bookTab) {
    setBookDraft({ title: "", author: "", totalPages: 0, status, coverUrl: "", externalKey: "" });
    setBookSuggestions([]);
    setBookSuggestionOpen(false);
    setBookForm(true);
  }
  function chooseBookSuggestion(book: BookSuggestion) {
    setBookDraft((current) => ({ ...current, title: book.title, author: book.author === "Autor no informado" ? "" : book.author, totalPages: book.pages || 0, coverUrl: book.coverUrl, externalKey: book.key }));
    setBookSuggestions([]);
    setBookSuggestionOpen(false);
  }
  async function submitNewBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookMatching(true);
    try {
      let resolvedCoverUrl = bookDraft.coverUrl;
      let resolvedExternalKey = bookDraft.externalKey;
      let resolvedAuthor = bookDraft.author;
      let resolvedPages = bookDraft.totalPages;
      if (!resolvedExternalKey) {
        try {
          const query = [bookDraft.title, bookDraft.author].filter(Boolean).join(" ");
          const response = await fetch(`/api/book-search?q=${encodeURIComponent(query)}&limit=8`);
          const result = await readJson<{ books?: BookSuggestion[] }>(response);
          const normalizedTitle = normalizeBookText(bookDraft.title);
          const normalizedAuthor = normalizeBookText(bookDraft.author);
          const match = result.books?.find((book) => normalizeBookText(book.title) === normalizedTitle && (!normalizedAuthor || normalizeBookText(book.author).includes(normalizedAuthor) || normalizedAuthor.includes(normalizeBookText(book.author))));
          if (match) {
            resolvedCoverUrl = match.coverUrl;
            resolvedExternalKey = match.key;
            resolvedAuthor ||= match.author === "Autor no informado" ? "" : match.author;
            resolvedPages ||= match.pages;
          }
        } catch {
          // A manual book can still be saved with the app's default cover.
        }
      }
      const ok = await save({ action: "add_book", title: bookDraft.title, author: resolvedAuthor, totalPages: resolvedPages, status: bookDraft.status, coverUrl: resolvedCoverUrl, externalKey: resolvedExternalKey });
      if (ok) {
        setBookTab(bookDraft.status);
        setBookForm(false);
        setBookDraft({ title: "", author: "", totalPages: 0, status: "reading", coverUrl: "", externalKey: "" });
        setBookSuggestions([]);
      }
    } finally {
      setBookMatching(false);
    }
  }
  async function discoverBooks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (discoverQuery.trim().length < 2) return;
    setDiscoverLoading(true);
    setDiscoverSearched(true);
    setDiscoverResults([]);
    try {
      const response = await fetch(`/api/book-search?q=${encodeURIComponent(discoverQuery.trim())}&language=${discoverLanguage}&mode=discover&limit=8`);
      const result = await readJson<{ books?: BookSuggestion[]; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No pudimos buscar recomendaciones.");
      setDiscoverResults(result.books ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos buscar recomendaciones.");
    } finally {
      setDiscoverLoading(false);
    }
  }
  async function saveDiscoveredBook(book: BookSuggestion) {
    const ok = await save({ action: "add_book", title: book.title, author: book.author === "Autor no informado" ? "" : book.author, totalPages: book.pages, status: "wishlist", coverUrl: book.coverUrl, externalKey: book.key });
    if (ok) setBookTab("wishlist");
  }

  async function analyzeVoiceBlob(blob: Blob, mimeType: string) {
    setVoiceLoading(true);
    setVoiceResult(null);
    setVoiceSaved(false);
    try {
      const form = new FormData();
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", new File([blob], "cierre-del-dia." + extension, { type: mimeType || "audio/webm" }));
      form.append("date", today);
      const response = await fetch("/api/voice-checkin", { method: "POST", body: form });
      const result = await readJson<{ checkin?: VoiceCheckin; error?: string }>(response);
      if (!response.ok || !result.checkin) throw new Error(result.error || "No pudimos interpretar la grabación.");
      setVoiceResult(result.checkin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos interpretar la grabación.");
    } finally {
      setVoiceLoading(false);
    }
  }
  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordingBytesRef.current = 0;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch { return false; } }) || "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      } catch {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        recordingBytesRef.current += event.data.size;
        if (recordingBytesRef.current >= VOICE_AUTO_STOP_BYTES && recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size > MAX_VOICE_UPLOAD_BYTES) setError("La grabación quedó demasiado pesada. Probá hablando durante menos tiempo.");
        else if (blob.size) void analyzeVoiceBlob(blob, blob.type);
      };
      recorder.start(1000);
      setRecordingSeconds(0);
      setRecording(true);
      setVoiceResult(null);
      setVoiceSaved(false);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá el permiso del navegador.");
    }
  }
  function stopVoiceRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  async function applyVoiceCheckin() {
    if (!voiceResult) return;
    const ok = await save({ action: "apply_voice_checkin", date: today, checkin: voiceResult });
    if (ok) {
      setVoiceResult(null);
      setVoiceSaved(true);
    }
  }

  async function selectMealPhoto(file: File | undefined) {
    if (!file) return;
    setEstimating(true);
    const prepared = await preparePhoto(file);
    setMealPhoto(prepared);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(prepared));
    setEstimate(null);
    setEstimating(false);
  }
  async function estimateMeal() {
    if (!aiDescription.trim() && !mealPhoto) return setError("Escribí qué comiste o agregá una foto.");
    setEstimating(true);
    setEstimate(null);
    try {
      const form = new FormData();
      form.append("description", aiDescription.trim());
      if (mealPhoto) form.append("image", mealPhoto);
      const response = await fetch("/api/estimate-calories", { method: "POST", body: form });
      const result = await readJson<{ estimate?: MealEstimate; error?: string }>(response);
      if (!response.ok || !result.estimate) throw new Error(result.error || "No se pudo estimar la comida.");
      setEstimate(result.estimate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo estimar la comida.");
    } finally {
      setEstimating(false);
    }
  }
  async function saveEstimate() {
    if (!estimate) return;
    const ok = await save({ action: "add_meal", date: today, name: estimate.mealName, detail: estimate.detail, calories: estimate.estimatedCalories, protein: estimate.protein, carbs: estimate.carbs, fat: estimate.fat });
    if (ok) {
      setEstimate(null);
      setAiDescription("");
      setMealPhoto(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview("");
    }
  }

  async function generateDietPlan() {
    if (dietForm.age < 18 || !dietForm.heightCm || !dietForm.currentWeightKg || !dietForm.targetWeightKg) {
      setError("Completá edad, altura, peso actual y peso objetivo.");
      return;
    }
    setDietGenerating(true);
    setGeneratedDietPlan(null);
    setError("");
    try {
      const response = await fetch("/api/diet-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dietForm) });
      const result = await readJson<{ plan?: DietPlanContent; error?: string }>(response);
      if (!response.ok || !result.plan) throw new Error(result.error || "No pudimos crear el plan.");
      setGeneratedDietPlan(result.plan);
      setDietForm((current) => ({ ...current, details: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos crear el plan.");
    } finally {
      setDietGenerating(false);
    }
  }

  async function saveDietPlan() {
    if (!generatedDietPlan) return;
    const ok = await save({ action: "save_diet_plan", ...dietForm, targetCalories: generatedDietPlan.targetCalories, plan: generatedDietPlan });
    if (ok) setGeneratedDietPlan(null);
  }

  async function saveDietTarget(targetCalories: number) {
    await save({ action: "set_diet_target", age: dietForm.age, sex: dietForm.sex, heightCm: dietForm.heightCm, currentWeightKg: dietForm.currentWeightKg, targetWeightKg: dietForm.targetWeightKg, activityLevel: dietForm.activityLevel, goalPace: dietForm.goalPace, targetCalories });
  }

  function addDietDetail(detail: string) {
    setDietForm((current) => ({ ...current, details: current.details.includes(detail) ? current.details : [current.details, detail].filter(Boolean).join(current.details ? ". " : "") }));
  }

  async function transcribeDietAudio(blob: Blob, mimeType: string) {
    setDietVoiceLoading(true);
    try {
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", new File([blob], "preferencias." + extension, { type: mimeType || "audio/webm" }));
      const response = await fetch("/api/diet-intake", { method: "POST", body: form });
      const result = await readJson<{ transcript?: string; error?: string }>(response);
      if (!response.ok || !result.transcript) throw new Error(result.error || "No pudimos interpretar el audio.");
      setDietForm((current) => ({ ...current, details: [current.details, result.transcript].filter(Boolean).join(current.details ? ". " : "") }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos interpretar el audio.");
    } finally {
      setDietVoiceLoading(false);
    }
  }

  async function startDietRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError("Este navegador no permite grabar audio.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dietStreamRef.current = stream;
      dietChunksRef.current = [];
      dietRecordingBytesRef.current = 0;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch { return false; } }) || "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      } catch {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }
      dietRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        dietChunksRef.current.push(event.data);
        dietRecordingBytesRef.current += event.data.size;
        if (dietRecordingBytesRef.current >= VOICE_AUTO_STOP_BYTES && recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        setDietRecording(false);
        dietStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (dietStopTimerRef.current) window.clearTimeout(dietStopTimerRef.current);
        const blob = new Blob(dietChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size > MAX_VOICE_UPLOAD_BYTES) setError("La grabación quedó demasiado pesada. Probá hablando durante menos tiempo.");
        else if (blob.size) void transcribeDietAudio(blob, blob.type);
      };
      recorder.start(1000);
      setDietRecording(true);
      dietStopTimerRef.current = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 60000);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá el permiso del navegador.");
    }
  }

  function stopDietRecording() {
    if (dietRecorderRef.current?.state === "recording") dietRecorderRef.current.stop();
  }

  const isPro = data.profile.isPro;
  /** Manda al comparador de planes desde cualquier candado. */
  const openPro = () => openSection("pro");

  /**
   * Simulación de la compra. No hay pasarela ni cobro: espera un momento para
   * que se sienta como un pago real y después activa Pro de verdad en la base,
   * que es lo que hace que los candados se abran en toda la aplicación.
   */
  async function simulatePayment() {
    setCheckoutStep("processing");
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const ok = await save({ action: "set_pro", active: true });
    setCheckoutStep(ok ? "done" : "form");
  }

  async function cancelPro() {
    await save({ action: "set_pro", active: false });
  }

  /** Abre la sección —y la sub-pestaña— donde vive un área. */
  function openArea(area: string) {
    const target = insightTargets[area] ?? { section: "summary" as Section };
    if (target.physicalTab) setPhysicalTab(target.physicalTab);
    if (target.focusTab) setFocusTab(target.focusTab);
    openSection(target.section);
  }

  /** Ejecuta la acción sugerida por un aviso del plan del día. */
  async function applyInsightAction(action: InsightAction) {
    if (action.kind === "open") return openArea(action.section);
    await save({ action: "schedule_task", id: action.taskId, startTime: action.startTime, durationMinutes: action.durationMinutes, dueDate: action.date ?? today });
  }

  /**
   * Tilda una tarea sin esperar al servidor. Mientras la petición viaja, la fila
   * ya muestra el estado nuevo; si falla, `loadData` la devuelve a su lugar.
   */
  async function toggleTask(id: number, completed: boolean) {
    setPendingTasks((current) => ({ ...current, [id]: completed }));
    const ok = await save({ action: "toggle_task", id, completed });
    setPendingTasks((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    return ok;
  }

  /** Estado visible de una tarea: el optimista si lo hay, si no el guardado. */
  const taskDone = (id: number, savedDone: boolean) => pendingTasks[id] ?? savedDone;

  const scoreCard = <article className="score-card">
    <div><p>DAILY SCORE</p><h2>{score >= 75 ? <>Tu día va<br /><em>muy bien.</em></> : <>Cada acción<br /><em>suma.</em></>}</h2><span>{priorityCaption}</span></div>
    <div className="score-ring" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
  </article>;

  // Versión compacta para la fila de Inicio: entra al lado de las métricas y
  // es el único acceso al Daily Score, que ya no está en el menú.
  const compactScoreCard = <button
    type="button"
    className="score-tile"
    data-tour="score"
    onClick={() => openSection("score")}
    aria-label={`Daily Score ${score} de 100. Abrir el detalle.`}
  >
    <div className="score-ring small" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
    <div className="score-tile-copy">
      <p>DAILY SCORE</p>
      <b>{scoreLabel(score)}</b>
      <small>{balanced ? "Ajustar prioridades" : listPhrase(priorityNames)}</small>
    </div>
    <span className="score-tile-go" aria-hidden="true">→</span>
  </button>;

  // El cierre por voz comparte la primera fila con el Daily Score: es una
  // acción principal del día, no un control secundario escondido en la agenda.
  const compactVoiceButton = <button
    type="button"
    className={"voice-hero-button" + (isPro ? "" : " is-locked")}
    data-tour="voice"
    onClick={() => isPro ? setVoiceOpen(true) : openPro()}
    aria-label={isPro ? "Grabar mi día" : "Conocer el cierre del día con AVORA Pro"}
  >
    <span className="voice-hero-record" aria-hidden="true">●</span>
    <span className="voice-hero-copy">
      <small>CIERRE DEL DÍA</small>
      <b>Grabar mi día</b>
      <em>Contalo en 60 segundos</em>
    </span>
    {isPro ? <span className="voice-hero-go" aria-hidden="true">→</span> : <span className="voice-hero-lock" aria-hidden="true"><i>🔒</i><strong>PRO</strong></span>}
  </button>;

  // Las métricas de Inicio siguen a las prioridades del mes: si te importa
  // dormir, la tarjeta que ves es la de sueño.
  const areaMetrics: Record<string, { icon: string; tone: string; label: string; value: string; unit: string; caption: string; area: string }> = {
    gymWeight: {
      icon: "↗", tone: "violet", label: "ENTRENAMIENTOS", area: "training",
      value: String(data.trainingLogs.filter((item) => item.trainingDate >= week[0].iso).length), unit: "esta semana",
      caption: streaks.training.current ? pluralize(streaks.training.current, "semana seguida", "semanas seguidas") : `${data.disciplines.length} disciplinas`,
    },
    focusWeight: {
      icon: "⌁", tone: "coral", label: "FOCO HOY", area: "focus",
      value: (focusToday / 60).toFixed(focusToday % 60 ? 1 : 0), unit: "h",
      caption: formatFocusHours(focusToday),
    },
    sleepWeight: {
      icon: "☾", tone: "mint", label: "SUEÑO", area: "sleep",
      value: sleepToday ? String(Math.round(sleepToday / 6) / 10) : "—", unit: "h",
      caption: sleepToday ? "Último registro" : "Sin registrar",
    },
    nutritionWeight: {
      icon: "◇", tone: "sand", label: "CALORÍAS", area: "meals",
      value: calories ? calories.toLocaleString("es-AR") : "—", unit: "kcal",
      caption: dietTargetCalories ? `de ${dietTargetCalories.toLocaleString("es-AR")} objetivo` : `${data.meals.length} comidas hoy`,
    },
    readingWeight: {
      icon: "▱", tone: "sky", label: "LECTURA", area: "books",
      value: String(pagesToday), unit: "pág.",
      caption: streaks.reading.current ? pluralize(streaks.reading.current, "día leyendo", "días leyendo") : `${data.books.filter((book) => book.status === "reading").length} libros abiertos`,
    },
    goalsWeight: {
      icon: "◎", tone: "violet", label: "OBJETIVOS", area: "goals",
      value: String(activeGoals.length), unit: "activos",
      caption: data.goals.filter((goal) => goal.completedAt).length + " cumplidos",
    },
  };
  // Orden estable cuando varias áreas empatan en peso.
  const metricOrder = ["gymWeight", "focusWeight", "sleepWeight", "nutritionWeight", "readingWeight", "goalsWeight"];
  // Inicio muestra todas las áreas marcadas explícitamente como "Prioridad".
  // Si todavía no hay ninguna, conserva la selección de mayor peso existente;
  // y en el estado inicial completamente equilibrado usa tres accesos útiles.
  const priorityMetricKeys = metricOrder.filter((key) => priorityDraft[key as keyof Omit<Priorities, "monthKey">] === highestPriority);
  const explicitPriorityMetricKeys = metricOrder.filter((key) => priorityDraft[key as keyof Omit<Priorities, "monthKey">] === 3);
  const featuredMetricKeys = explicitPriorityMetricKeys.length ? explicitPriorityMetricKeys : balanced ? metricOrder.slice(0, 3) : priorityMetricKeys;
  const heroMetrics = featuredMetricKeys.map((key) => areaMetrics[key]);

  const voiceRecorder = <article className="panel voice-capture-panel">
    <div className="voice-copy"><p className="voice-eyebrow">CIERRE RÁPIDO CON IA</p><h2>Contá tu día en un minuto.</h2><span>Decí qué entrenaste, qué comiste, cuánto trabajaste o estudiaste, cuánto leíste y dormiste. Revisás el resultado antes de guardarlo.</span><div className="voice-hints"><small>“Corrí 5 km…”</small><small>“Hice sentadilla…”</small><small>“Trabajé 2 horas…”</small><small>“Dormí 7 horas…”</small></div></div>
    <div className="voice-action">
      {!recording && !voiceLoading && <button className="record-button" onClick={() => void startVoiceRecording()}><span>●</span><b>{voiceResult ? "Grabar de nuevo" : "Empezar cierre del día"}</b><small>Máximo 60 segundos</small></button>}
      {recording && <button className="record-button recording" onClick={stopVoiceRecording}><span>■</span><b>Grabando… {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</b><small>Tocá para terminar</small></button>}
      {voiceLoading && <div className="voice-processing"><div className="voice-spinner" /><b>Organizando tu día…</b><small>La grabación no se conserva.</small></div>}
      {voiceSaved && <div className="voice-saved"><span>✓</span><div><b>Cierre guardado</b><small>Los datos ya aparecen en sus secciones.</small></div></div>}
    </div>
    {voiceResult && <div className="voice-review"><div className="voice-review-head"><div><p>REVISÁ ANTES DE GUARDAR</p><h3>{voiceResult.summary || "Esto fue lo que entendimos"}</h3></div><span className={"confidence " + voiceResult.confidence}>Confianza {voiceResult.confidence === "high" ? "alta" : voiceResult.confidence === "medium" ? "media" : "baja"}</span></div><div className="voice-review-grid">
      <div><span>↗</span><p><b>Entrenamiento</b><small>{voiceResult.gym.attended ? "Entrenamiento registrado" : "Sin asistencia"} {voiceResult.gym.detail}</small></p></div>
      <div><span>◇</span><p><b>Comidas</b><small>{voiceResult.meals.length ? voiceResult.meals.map((meal) => meal.name + " ≈" + meal.calories + " kcal").join(" · ") : "Sin comidas"}</small></p></div>
      <div><span>⌁</span><p><b>Estudio / trabajo</b><small>{voiceResult.study.minutes ? formatFocusHours(voiceResult.study.minutes) + " · " : ""}{voiceResult.study.detail || "Sin dato"}</small></p></div>
      <div><span>☾</span><p><b>Sueño</b><small>{voiceResult.sleep.minutes ? Math.round(voiceResult.sleep.minutes / 6) / 10 + " horas" : "Sin dato"}</small></p></div>
      <div><span>▱</span><p><b>Lectura</b><small>{voiceResult.reading.bookTitle || "Libro actual"} · {voiceResult.reading.pages} páginas</small></p></div>
      <div><span>✎</span><p><b>Reflexión</b><small>{voiceResult.journal || "Sin reflexión"}</small></p></div>
    </div><details><summary>Ver transcripción</summary><p>{voiceResult.transcript}</p></details><div className="voice-review-actions"><button className="discard-voice" onClick={() => setVoiceResult(null)}>Descartar</button><button className="confirm-voice" disabled={saving} onClick={() => void applyVoiceCheckin()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("apply_voice_checkin")} /></button></div></div>}
  </article>;

  // Semana navegable del historial de entrenamientos: independiente de "week"
  // (que siempre es la semana actual, usada en Inicio y otras secciones), así
  // se puede deslizar hacia atrás sin afectar el resto de la app.
  const trainingWeek = useMemo(() => weekFor(trainingWeekAnchor), [trainingWeekAnchor]);
  const shiftTrainingWeek = (amount: number) => setTrainingWeekAnchor((current) => dateMinus(current, -amount * 7));
  const trainingPanel = <section className="module-stack">
    <article className="panel section-panel">
      <div className="panel-heading">
        <div><p>TUS DISCIPLINAS</p><h2>Un calendario para cada actividad</h2></div>
        <div className="training-week-meta">
          <label className="training-target-label" htmlFor="training-weekly-target">Meta semanal<Dropdown id="training-weekly-target" className="weekly-target-dropdown" ariaLabel="Meta de entrenamientos por semana" value={String(trainingWeeklyTarget)} onChange={(value) => setTrainingWeeklyTarget(Number(value))} options={WEEKLY_TARGET_OPTIONS} /></label>
        </div>
      </div>
      <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_discipline", name: form.get("name"), kind: form.get("kind") }); }}>
        <input name="name" required placeholder="Nueva disciplina: pádel, fútbol…" />
        <Dropdown name="kind" ariaLabel="Tipo de disciplina" defaultValue="other" options={disciplineKindOptions} />
        <button disabled={saving}><SaveButtonContent label="＋ Agregar" phase={savePhase("add_discipline")} /></button>
      </form>
      <div className="calendar-head training-week-nav">
        <button type="button" onClick={() => shiftTrainingWeek(-1)} aria-label="Semana anterior">‹</button>
        <div className="training-week-nav-title">
          <h2>{formatDate(trainingWeek[0].iso)} – {formatDate(trainingWeek[6].iso)}</h2>
          {trainingWeekAnchor !== today ? <button type="button" className="training-week-today" onClick={() => setTrainingWeekAnchor(today)}>Volver a hoy</button> : <span className="week-pill">{data.trainingLogs.filter((log) => log.trainingDate >= trainingWeek[0].iso && log.trainingDate <= trainingWeek[6].iso).length} sesiones esta semana</span>}
        </div>
        <button type="button" onClick={() => shiftTrainingWeek(1)} aria-label="Semana siguiente">›</button>
      </div>
      <div className="discipline-list">{data.disciplines.map((discipline) => {
        const dates = data.trainingLogs.filter((log) => log.disciplineId === discipline.id && log.trainingDate >= trainingWeek[0].iso && log.trainingDate <= trainingWeek[6].iso).map((log) => log.trainingDate);
        return <div className={"discipline-card " + (selectedDiscipline?.id === discipline.id ? "selected" : "")} key={discipline.id}>
          <button className="discipline-title" onClick={() => setSelectedDisciplineId(discipline.id)}><span>{discipline.kind === "strength" ? "🏋" : discipline.kind === "running" ? "🏃" : discipline.kind === "cycling" ? "🚴" : discipline.kind === "swimming" ? "🏊" : "●"}</span><p><b>{discipline.name}</b><small>{kindLabels[discipline.kind]}</small></p><strong>{dates.length}/7</strong></button>
          <div className="week-row">{trainingWeek.map((day) => {
            const done = dates.includes(day.iso);
            // Primer click en un día: solo lo abre en el detalle de abajo (ver
            // el historial). Un segundo click sobre el mismo día ya
            // seleccionado marca/desmarca la sesión, para no desmarcar por
            // accidente un día que sólo querías mirar.
            const focused = selectedDiscipline?.id === discipline.id && trainingDate === day.iso;
            return <button key={day.iso} className={(done ? "done " : "") + (day.iso === today ? "today" : "") + (focused ? " active" : "")} disabled={saving} onClick={() => { setSelectedDisciplineId(discipline.id); setTrainingDate(day.iso); if (focused) void save({ action: "toggle_training", disciplineId: discipline.id, date: day.iso }); }}><small>{day.short}</small><b>{done ? "✓" : day.number}</b>{day.iso === today && <i />}</button>;
          })}</div>
        </div>;
      })}</div>
    </article>
    {selectedDiscipline && <div className="training-detail-grid single-session">
      <article className="panel">
        <div className="panel-heading"><div><p>{trainingDetailTitle}</p><h2>{selectedDiscipline.name}</h2></div>…8508 tokens truncated…ndencias diarias del período elegido, con comparación contra el período
  // anterior de la misma longitud.
  const trendSpan = statsPeriod === "weekly" ? 7 : statsPeriod === "monthly" ? 30 : 180;
  const trends: Array<{ key: string; icon: string; label: string; trend: Trend; format: (value: number) => string; caption: string; useAverage?: boolean }> = [
    { key: "training", icon: "↗", label: "Entrenamientos", trend: trendFor(trendSpan, today, (date) => trainingByDate[date] ?? 0), format: (value) => String(Math.round(value)), caption: "sesiones registradas" },
    { key: "focus", icon: "⌁", label: "Foco profundo", trend: trendFor(trendSpan, today, (date) => focusByDate[date] ?? 0), format: (value) => formatFocusHours(value), caption: "tiempo de trabajo concentrado" },
    { key: "sleep", icon: "☾", label: "Sueño", trend: trendFor(trendSpan, today, (date) => sleepMinutesByDate[date] ?? 0), format: (value) => formatMinutes(value), caption: "promedio dormido por día", useAverage: true },
    { key: "reading", icon: "▱", label: "Lectura", trend: trendFor(trendSpan, today, (date) => readingByDate[date] ?? 0), format: (value) => `${Math.round(value)} pág.`, caption: "páginas leídas" },
    { key: "nutrition", icon: "◇", label: "Calorías", trend: trendFor(trendSpan, today, (date) => caloriesByDay[date] ?? 0), format: (value) => `${Math.round(value).toLocaleString("es-AR")} kcal`, caption: "promedio diario", useAverage: true },
  ];
  // El Daily Score también es una tendencia: mismo período, mismo criterio de
  // comparación que el resto de las métricas de esta sección.
  const scoreTrend = trendFor(trendSpan, today, scoreForDate);
  const scoreAverage = Math.round(scoreTrend.average);
  const scorePreviousAverage = Math.round(scoreTrend.previousTotal / trendSpan);
  const scoreDelta = scorePreviousAverage > 0 ? scoreAverage - scorePreviousAverage : null;
  // Geometría del gráfico de líneas del Daily Score: un viewBox fijo de
  // 100/altura para que el promedio y cada punto se ubiquen por regla de tres
  // simple, sin depender del ancho real renderizado.
  const scoreGradientId = useId();
  const scoreChartWidth = 600;
  const scoreChartHeight = 130;
  const scoreYFor = (value: number) => scoreChartHeight - (Math.max(0, Math.min(100, value)) / 100) * scoreChartHeight;
  const scoreChartPoints = scoreTrend.points.map((point, index) => ({
    ...point,
    x: scoreTrend.points.length > 1 ? (index / (scoreTrend.points.length - 1)) * scoreChartWidth : scoreChartWidth / 2,
    y: scoreYFor(point.value),
  }));
  const scoreLinePath = scoreChartPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const scoreAreaPath = scoreChartPoints.length
    ? `${scoreLinePath} L${scoreChartPoints[scoreChartPoints.length - 1].x.toFixed(1)},${scoreChartHeight} L${scoreChartPoints[0].x.toFixed(1)},${scoreChartHeight} Z`
    : "";
  const scoreAverageY = scoreYFor(scoreAverage);

  const streakCards: Array<{ key: string; icon: string; label: string; streak: typeof streaks.training; unitSingular: string; unitPlural: string; pendingLabel: string; warningLabel: string }> = [
    { key: "training", icon: "↗", label: "Entrenamiento", streak: streaks.training, unitSingular: "semana", unitPlural: "semanas", pendingLabel: "Esta semana todavía no", warningLabel: `Sumá ${trainingWeeklyTarget} entrenamientos esta semana para no cortarla` },
    { key: "focus", icon: "⌁", label: "Foco", streak: streaks.focus, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día con foco hoy para no cortarla" },
    { key: "reading", icon: "▱", label: "Lectura", streak: streaks.reading, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día leyendo hoy para no cortarla" },
    { key: "sleep", icon: "☾", label: "Sueño de 7 h+", streak: streaks.sleep, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá una noche completa hoy para no cortarla" },
    { key: "logging", icon: "✎", label: "Registro diario", streak: streaks.logging, unitSingular: "día", unitPlural: "días", pendingLabel: "Hoy todavía no", warningLabel: "Registrá un día hoy para no cortarla" },
  ];

  const statsPanel = <section className="module-stack">
    {weeklyReviewPanel}
    <div className="period-switch">{(["weekly", "monthly", "annual"] as StatsPeriod[]).map((period) => <button className={statsPeriod === period ? "active" : ""} key={period} onClick={() => setStatsPeriod(period)}>{period === "weekly" ? "Semanal" : period === "monthly" ? "Mensual" : "Anual"}</button>)}</div>

    <article className="panel score-history-panel">
      <div className="panel-heading">
        <div><p>DAILY SCORE</p><h2>{statsPeriod === "weekly" ? "Últimos 7 días" : statsPeriod === "monthly" ? "Últimos 30 días" : "Últimos 6 meses"}</h2></div>
        <button className="text-link" onClick={() => openSection("score")}>Cómo se calcula →</button>
      </div>
      <div className="score-history">
        <div className="score-history-now">
          <div className="score-ring small" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
          <p><b>Hoy</b><small>{scoreLabel(score)}</small></p>
        </div>
        <div className="score-history-chart">
          <svg
            className="score-line-chart"
            viewBox={`0 0 ${scoreChartWidth} ${scoreChartHeight}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Daily Score de los últimos ${trendSpan} días. Promedio ${scoreAverage} de 100.`}
          >
            <defs>
              <linearGradient id={scoreGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line className="score-average-line" x1="0" y1={scoreAverageY} x2={scoreChartWidth} y2={scoreAverageY} vectorEffect="non-scaling-stroke" />
            {scoreAreaPath && <path className="score-line-area" d={scoreAreaPath} fill={`url(#${scoreGradientId})`} />}
            <path className="score-line-path" d={scoreLinePath} fill="none" vectorEffect="non-scaling-stroke" />
            {scoreChartPoints.map((point) => <circle
              key={point.date}
              className={"score-line-dot " + (point.date === today ? "today" : "")}
              cx={point.x}
              cy={point.y}
              r={point.date === today ? 5 : 3.4}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${formatDate(point.date)} · ${point.value}/100`}</title>
            </circle>)}
          </svg>
          <div className="score-bars-foot">
            <small>{formatDate(scoreTrend.points[0]?.date ?? today)}</small>
            <small>Promedio {scoreAverage}/100{scoreDelta === null ? "" : ` · ${scoreDelta > 0 ? "+" : ""}${scoreDelta} vs. período anterior`}</small>
            <small>Hoy</small>
          </div>
        </div>
      </div>
      <p className="formula-note">Cada barra se reconstruye con lo que registraste ese día y las prioridades que tenés hoy. Los días sin registros valen 0.</p>
    </article>

    <article className="panel streaks-panel">
      <div className="panel-heading"><div><p>CONSTANCIA</p><h2>Tus rachas</h2></div><span className="week-pill">{streakCards.filter((card) => card.streak.current > 0).length} activas</span></div>
      <div className="streak-grid">{streakCards.map((card) => <article key={card.key} className={"streak-card " + (card.streak.current > 0 ? "alive" : "cold")}>
        <span className="streak-icon">{card.icon}</span>
        <b className="streak-count">{card.streak.current}<small>{" " + (card.streak.current === 1 ? card.unitSingular : card.unitPlural)}</small></b>
        <p>{card.label}</p>
        <small>{card.streak.pendingToday ? card.pendingLabel : card.streak.best > card.streak.current ? `Récord: ${card.streak.best}` : card.streak.current > 0 ? "Tu mejor marca" : "Sin racha activa"}</small>
        {card.streak.pendingToday && <i className="streak-warning" title={card.warningLabel} />}
      </article>)}</div>
    </article>

    <article className="panel trend-rows-panel">
      <div className="panel-heading"><div><p>TENDENCIA</p><h2>{statsPeriod === "weekly" ? "Últimos 7 días" : statsPeriod === "monthly" ? "Últimos 30 días" : "Últimos 6 meses"}</h2></div><small className="trend-note">Comparado con el período anterior</small></div>
      <div className="trend-rows">{trends.map((row) => {
        const delta = row.trend.deltaPercent;
        const direction = delta === null ? "flat" : delta > 4 ? "up" : delta < -4 ? "down" : "flat";
        return <div className="trend-row" key={row.key}>
          <span className={"trend-icon " + row.key}>{row.icon}</span>
          <div className="trend-label"><b>{row.label}</b><small>{row.caption}</small></div>
          <svg className="sparkline" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
            <path d={sparklinePath(row.trend.points, 120, 28)} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="trend-values">
            <b>{row.format(row.useAverage ? row.trend.average : row.trend.total)}</b>
            <small className={"trend-delta " + direction}>{delta === null ? "sin base previa" : `${delta > 0 ? "+" : ""}${delta} %`}</small>
          </div>
        </div>;
      })}</div>
    </article>

    <div className="metrics-grid">
      <article><span>↗</span><p>ENTRENAMIENTOS<b>{periodTraining.length}</b><small>{(periodTraining.reduce((sum, item) => sum + item.distanceMeters, 0) / 1000).toFixed(1)} km recorridos</small></p></article>
      <article><span>☾</span><p>SUEÑO PROMEDIO<b>{periodSleep.length ? (periodSleep.reduce((sum, item) => sum + item.sleepMinutes, 0) / periodSleep.length / 60).toFixed(1) : "0"} h</b><small>{periodSleep.length} noches registradas</small></p></article>
      <article><span>⌁</span><p>TRABAJO PROFUNDO<b>{(periodFocus.reduce((sum, item) => sum + item.minutes, 0) / 60).toFixed(1)} h</b><small>{periodFocus.length} bloques de foco</small></p></article>
      <article><span>▱</span><p>PÁGINAS LEÍDAS<b>{periodReading.reduce((sum, item) => sum + item.pages, 0)}</b><small>{periodReading.reduce((sum, item) => sum + item.minutes, 0)} min de lectura</small></p></article>
      <article><span>◇</span><p>CALORÍAS REGISTRADAS<b>{periodMeals.reduce((sum, item) => sum + item.calories, 0).toLocaleString("es-AR")}</b><small>estimación del período</small></p></article>
    </div>
  </section>;
  const dietCalendarStart = new Date(dietCalendarCursor + "-01T12:00:00");
  const dietCalendarMonthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(dietCalendarStart);
  const dietCalendarOffset = (dietCalendarStart.getDay() + 6) % 7;
  const dietCalendarDays = new Date(dietCalendarStart.getFullYear(), dietCalendarStart.getMonth() + 1, 0).getDate();
  const shiftDietCalendar = (amount: number) => {
    const next = new Date(dietCalendarStart);
    next.setMonth(next.getMonth() + amount);
    setDietCalendarCursor(next.toISOString().slice(0, 7));
  };
  const caloriesByDate = data.mealHistory.reduce<Record<string, number>>((totals, meal) => {
    totals[meal.mealDate] = (totals[meal.mealDate] ?? 0) + meal.calories;
    return totals;
  }, {});
  const calorieStatus = (total: number) => {
    if (!total) return "empty";
    if (!dietTargetCalories) return "has-data";
    const difference = Math.abs(total - dietTargetCalories) / dietTargetCalories;
    return difference <= .1 ? "on-target" : difference <= .2 ? "near-target" : "off-target";
  };

  const mealsPanel = <article className="panel section-panel"><div className="panel-heading"><div><p>ENERGÍA DE HOY</p><h2>Comidas</h2></div></div>
    {isPro ? <div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}<input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} /></label>{photoPreview && <div className="photo-preview"><Image src={photoPreview} alt="Comida a analizar" width={38} height={38} unoptimized /><button onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}<button className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Analizar comida"}</button></div>
      {estimate && <div className="estimate-result"><div className="estimate-head"><div><span>ESTIMACIÓN PARA REVISAR</span><input value={estimate.mealName} onChange={(event) => setEstimate({ ...estimate, mealName: event.target.value })} /></div><label><input type="number" value={estimate.estimatedCalories} onChange={(event) => setEstimate({ ...estimate, estimatedCalories: Number(event.target.value) || 0 })} /><small>kcal</small></label></div><input className="estimate-detail" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} /><p>Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p><button className="confirm-estimate" disabled={saving} onClick={() => void saveEstimate()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("add_meal")} /></button></div>}
    </div> : <LockedFeature
      title="Calorías con IA"
      note="Escribí qué comiste o sacale una foto al plato: la app estima calorías y macros."
      onOpen={openPro}
    ><div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea readOnly value="" placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><span className="photo-button">📷 Sacar o subir foto</span><span className="analyze-button">Analizar comida</span></div></div></LockedFeature>}
    <form className="meal-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_meal", date: today, name: form.get("name"), detail: form.get("detail"), calories: form.get("calories"), protein: form.get("protein"), carbs: form.get("carbs"), fat: form.get("fat") }); }}>
      <label>Comida<input name="name" required placeholder="Ej. Milanesa con puré" /></label>
      <label>Detalle<input name="detail" required placeholder="Porción mediana, con ensalada…" /></label>
      <label>Calorías<input name="calories" type="number" min="0" placeholder="kcal" /></label>
      <button disabled={saving}><SaveButtonContent label="＋ Agregar" phase={savePhase("add_meal")} /></button>
    </form>
    <div className="meal-list">{data.meals.map((meal) => <div className="meal-row" key={meal.id}><span>🍽️</span><div><b>{meal.name}</b><small>{meal.detail} · P {meal.protein} / C {meal.carbs} / G {meal.fat}</small></div><strong>≈ {meal.calories} kcal</strong><button className="row-delete" onClick={() => void save({ action: "delete_meal", id: meal.id })}>×</button></div>)}{!data.meals.length && <div className="inline-empty"><span>🥗</span><p><b>Todavía no cargaste comidas</b><small>Usá texto, foto o carga manual.</small></p></div>}</div><div className="calorie-total"><span>Total estimado</span><b>{calories.toLocaleString("es-AR")} kcal</b></div>
  </article>;

  const dietEstimate = estimateTargetCalories(dietForm);
  const dietQuickCaloriesValue = dietQuickCalories ?? dietEstimate?.targetCalories ?? 0;
  const dietQuickPanel = <article className="panel diet-quick-panel">
    <div className="panel-heading"><div><p>CALCULADORA RÁPIDA</p><h2>Calorías objetivo, sin IA</h2></div></div>
    <p className="diet-intro">Completá tus datos y te proponemos una cifra diaria de referencia. Podés aceptarla o modificarla antes de guardarla.</p>
    <div className="diet-fields">
      <label>Peso actual (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.currentWeightKg} onChange={(event) => setDietQuickField("currentWeightKg", Number(event.target.value))} /></label>
      <label>Peso objetivo (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.targetWeightKg} onChange={(event) => setDietQuickField("targetWeightKg", Number(event.target.value))} /></label>
      <label>Altura (cm)<input type="number" min="120" max="230" value={dietForm.heightCm} onChange={(event) => setDietQuickField("heightCm", Number(event.target.value))} /></label>
      <label>Edad<input type="number" min="18" max="100" value={dietForm.age} onChange={(event) => setDietQuickField("age", Number(event.target.value))} /></label>
      <label>Género<Dropdown ariaLabel="Género para la estimación" value={dietForm.sex} onChange={(value) => setDietQuickField("sex", value as DietForm["sex"])} options={[{ value: "unspecified", label: "Prefiero no indicar" }, { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" }]} /></label>
      <label>Actividad<Dropdown ariaLabel="Actividad habitual" value={dietForm.activityLevel} onChange={(value) => setDietQuickField("activityLevel", value as DietForm["activityLevel"])} options={[{ value: "sedentary", label: "Baja / sedentaria" }, { value: "light", label: "Ligera · 1–3 días" }, { value: "moderate", label: "Moderada · 3–5 días" }, { value: "high", label: "Alta · 6–7 días" }]} /></label>
      <label>Intensidad<Dropdown ariaLabel="Intensidad del objetivo" value={dietForm.goalPace} onChange={(value) => setDietQuickField("goalPace", value as DietForm["goalPace"])} options={[{ value: "gentle", label: "Gradual" }, { value: "moderate", label: "Moderado" }]} /></label>
    </div>
    <div className="diet-quick-result">
      <label><span>CALORÍAS OBJETIVO</span><input type="number" min="1000" max="6000" step="10" value={dietQuickCaloriesValue || ""} onChange={(event) => setDietQuickCalories(Number(event.target.value) || 0)} /><small>{dietEstimate ? `Sugerencia: ${dietEstimate.targetCalories.toLocaleString("es-AR")} kcal · mantenimiento ${dietEstimate.maintenanceCalories.toLocaleString("es-AR")} kcal` : "Completá tus datos para calcular una sugerencia."}</small></label>
      <button className="primary-action" type="button" disabled={saving || !dietQuickCaloriesValue} onClick={() => void saveDietTarget(dietQuickCaloriesValue)}><SaveButtonContent label="Guardar objetivo" phase={savePhase("set_diet_target")} /></button>
    </div>
  </article>;

  const dietPlannerPanel = <article className="panel diet-planner-panel">
    <div className="panel-heading"><div><p>PLAN PERSONAL CON IA</p><h2>Armá una alimentación sencilla para tu objetivo</h2></div>{savedDietPlan && <span className="week-pill">Plan guardado</span>}</div>
    <p className="diet-intro">Completá tus datos y contanos qué necesitás. La aplicación calcula una referencia energética y la IA propone opciones intercambiables; no reemplaza la evaluación de un nutricionista.</p>
    <div className="diet-builder-grid">
      <div className="diet-fields">
        <label>Edad<input type="number" min="18" max="100" value={dietForm.age} onChange={(event) => setDietForm({ ...dietForm, age: Number(event.target.value) })} /></label>
        <label>Altura (cm)<input type="number" min="120" max="230" value={dietForm.heightCm} onChange={(event) => setDietForm({ ...dietForm, heightCm: Number(event.target.value) })} /></label>
        <label>Peso actual (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.currentWeightKg} onChange={(event) => setDietForm({ ...dietForm, currentWeightKg: Number(event.target.value) })} /></label>
        <label>Peso objetivo (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.targetWeightKg} onChange={(event) => setDietForm({ ...dietForm, targetWeightKg: Number(event.target.value) })} /></label>
        <label>Sexo para la estimación<Dropdown ariaLabel="Sexo para la estimación" value={dietForm.sex} onChange={(value) => setDietForm({ ...dietForm, sex: value as DietForm["sex"] })} options={[{ value: "unspecified", label: "Prefiero no indicar" }, { value: "male", label: "Masculino" }, { value: "female", label: "Femenino" }]} /></label>
        <label>Actividad habitual<Dropdown ariaLabel="Actividad habitual" value={dietForm.activityLevel} onChange={(value) => setDietForm({ ...dietForm, activityLevel: value as DietForm["activityLevel"] })} options={[{ value: "sedentary", label: "Baja / sedentaria" }, { value: "light", label: "Ligera · 1–3 días" }, { value: "moderate", label: "Moderada · 3–5 días" }, { value: "high", label: "Alta · 6–7 días" }]} /></label>
        <label>Ritmo del objetivo<Dropdown ariaLabel="Ritmo del objetivo" value={dietForm.goalPace} onChange={(value) => setDietForm({ ...dietForm, goalPace: value as DietForm["goalPace"] })} options={[{ value: "gentle", label: "Gradual" }, { value: "moderate", label: "Moderado" }]} /></label>
        <label>Estilo preferido<input value={dietForm.preferences} onChange={(event) => setDietForm({ ...dietForm, preferences: event.target.value })} placeholder="Ej. económico, vegetariano, 4 comidas" /></label>
      </div>
      <div className="diet-conversation"><div className="diet-conversation-head"><span>✦</span><div><b>Contale los detalles a la aplicación</b><small>Intolerancias, alergias, horarios, gustos, presupuesto o alimentos que evitás.</small></div></div><div className="diet-detail-chips">{["Intolerancia a la lactosa", "Sin gluten", "Vegetariano", "Poco tiempo para cocinar"].map((detail) => <button key={detail} type="button" onClick={() => addDietDetail(detail)}>{detail}</button>)}</div><textarea value={dietForm.details} onChange={(event) => setDietForm({ ...dietForm, details: event.target.value })} placeholder="Ej. Soy intolerante a la lactosa, almuerzo fuera de casa y necesito comidas simples…" /><button className={"diet-voice-button " + (dietRecording ? "recording" : "")} type="button" disabled={dietVoiceLoading} onClick={() => dietRecording ? stopDietRecording() : void startDietRecording()}><span>{dietRecording ? "■" : "●"}</span>{dietVoiceLoading ? "Interpretando audio…" : dietRecording ? "Terminar grabación" : "Contarlo por audio"}</button><small className="privacy-note">El audio se transcribe y no se conserva.</small></div>
    </div>
    <button className="generate-diet-button" type="button" disabled={dietGenerating} onClick={() => void generateDietPlan()}>{dietGenerating ? "Creando opciones…" : displayedDietPlan ? "Actualizar mi plan con IA" : "Crear mi plan con IA"}</button>
    {displayedDietPlan && <div className="diet-plan-result"><div className="diet-plan-summary"><div><span>OBJETIVO DIARIO APROXIMADO</span><b>{displayedDietPlan.targetCalories.toLocaleString("es-AR")} kcal</b><small>Rango orientativo {displayedDietPlan.calorieRangeMinimum.toLocaleString("es-AR")}–{displayedDietPlan.calorieRangeMaximum.toLocaleString("es-AR")} kcal · mantenimiento estimado {displayedDietPlan.maintenanceCalories.toLocaleString("es-AR")}</small></div><p>{displayedDietPlan.summary}</p></div><div className="macro-row"><span><b>{displayedDietPlan.macros.proteinGrams} g</b>Proteínas</span><span><b>{displayedDietPlan.macros.carbsGrams} g</b>Carbohidratos</span><span><b>{displayedDietPlan.macros.fatGrams} g</b>Grasas</span></div><div className="diet-meal-options">{displayedDietPlan.meals.map((meal) => <article key={meal.slot}><span>{meal.slot}</span><p>{meal.guidance}</p><ul>{meal.options.map((option) => <li key={option}>{option}</li>)}</ul></article>)}</div><div className="diet-plan-bottom"><div><b>Restricciones aplicadas</b><p>{displayedDietPlan.appliedRestrictions.length ? displayedDietPlan.appliedRestrictions.join(" · ") : "Ninguna indicada"}</p></div><div><b>Importante</b><p>{displayedDietPlan.safetyNote}</p></div></div>{generatedDietPlan && <button className="save-diet-button" type="button" disabled={saving} onClick={() => void saveDietPlan()}><SaveButtonContent label="Guardar este plan y usarlo como objetivo" phase={savePhase("save_diet_plan")} /></button>}</div>}
  </article>;

  const calorieCalendarPanel = <article className="panel calorie-calendar-panel"><div className="calorie-calendar-top"><div><p>SEGUIMIENTO DE LA DIETA</p><h2>Calorías por día</h2><small>{dietTargetCalories ? <>Tu referencia actual es <b>{dietTargetCalories.toLocaleString("es-AR")} kcal diarias.</b></> : "Creá y guardá un plan para comparar cada día con tu objetivo."}</small></div><div className="calorie-calendar-nav"><button onClick={() => shiftDietCalendar(-1)}>‹</button><b>{dietCalendarMonthName}</b><button onClick={() => shiftDietCalendar(1)}>›</button></div></div><div className="calorie-calendar"><div className="calorie-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <b key={day + index}>{day}</b>)}</div><div className="calorie-calendar-cells">{Array.from({ length: dietCalendarOffset }, (_, index) => <span className="blank" key={"diet-blank-" + index} />)}{Array.from({ length: dietCalendarDays }, (_, index) => { const day = index + 1; const iso = dietCalendarCursor + "-" + String(day).padStart(2, "0"); const total = caloriesByDate[iso] ?? 0; return <div className={calorieStatus(total) + (iso === today ? " today" : "")} key={iso} title={total ? total + " kcal registradas" : "Sin comidas registradas"}><span>{day}</span><b>{total ? total.toLocaleString("es-AR") : "—"}</b><small>kcal</small></div>; })}</div></div><div className="calorie-legend"><span><i className="on-target" />En objetivo ±10%</span><span><i className="near-target" />Cerca ±20%</span><span><i className="off-target" />Fuera del rango</span><span><i className="empty" />Sin registro</span></div></article>;

  const booksPanel = <section className="books-layout"><article className="panel section-panel books-panel"><div className="panel-heading"><div><p>TU BIBLIOTECA</p><h2>Libros</h2></div><button className="add-button light" onClick={() => bookForm ? setBookForm(false) : openAddBook(bookTab)}>{bookForm ? "Cerrar" : "＋ Nuevo libro"}</button></div>
    {bookForm && <form className="book-form smart-book-form" onSubmit={(event) => void submitNewBook(event)}><div className="book-title-search"><input name="title" autoComplete="off" required value={bookDraft.title} onFocus={() => { if (bookSuggestions.length) setBookSuggestionOpen(true); }} onChange={(event) => { const title = event.target.value; setBookDraft({ ...bookDraft, title, coverUrl: "", externalKey: "" }); setBookSuggestionOpen(true); if (title.trim().length < 2) { setBookSuggestions([]); setBookSuggestLoading(false); } }} placeholder="Empezá a escribir el título…" />{(bookDraft.title.trim().length >= 2 && bookSuggestionOpen && (bookSuggestLoading || bookSuggestions.length > 0)) && <div className="book-autocomplete">{bookSuggestLoading && <div className="book-searching"><span className="voice-spinner" />Buscando en el catálogo…</div>}{!bookSuggestLoading && bookSuggestions.map((book) => <button type="button" key={book.key} onClick={() => chooseBookSuggestion(book)}><CatalogBookCover book={book} compact /><p><b>{book.title}</b><small>{book.author}{book.year ? ` · ${book.year}` : ""}</small></p>{book.pages > 0 && <em>{book.pages} pág.</em>}</button>)}</div>}</div><input name="author" value={bookDraft.author} onChange={(event) => setBookDraft({ ...bookDraft, author: event.target.value })} placeholder="Autor" /><input name="totalPages" value={bookDraft.totalPages || ""} onChange={(event) => setBookDraft({ ...bookDraft, totalPages: Number(event.target.value) || 0 })} type="number" min="0" placeholder="Páginas" /><Dropdown ariaLabel="Estado del libro" value={bookDraft.status} onChange={(value) => setBookDraft({ ...bookDraft, status: value as BookStatus })} options={[{ value: "reading", label: "Leyendo" }, { value: "read", label: "Leído" }, { value: "wishlist", label: "Quiero leer" }]} /><button disabled={saving || bookMatching}>{bookMatching && savePhase("add_book") === null ? "Identificando…" : <SaveButtonContent label="Guardar" phase={savePhase("add_book")} />}</button></form>}
    <div className="book-tabs">{(["reading", "read", "wishlist"] as BookStatus[]).map((tab) => <button className={bookTab === tab ? "active" : ""} key={tab} onClick={() => { setBookTab(tab); setBookShelfPage(0); setSelectedBookId(null); }}>{tab === "reading" ? "Leyendo" : tab === "read" ? "Leídos" : "Quiero leer"} <i>{data.books.filter((book) => book.status === tab).length}</i></button>)}</div>
    {booksInTab.length ? <><div className="book-shelf-list">{visibleBooks.map((book) => { const isSelected = selectedBook?.id === book.id; return <article className={"current-book shelf-book " + (isSelected ? "selected" : "")} key={book.id}><SavedBookCover book={book} /><div className="book-info"><button type="button" className="book-card-select" aria-pressed={isSelected} onClick={() => setSelectedBookId(book.id)}><span>{bookTab === "reading" ? "LEYENDO AHORA" : bookTab === "read" ? "TERMINADO" : "PRÓXIMA LECTURA"}</span><h3>{book.title}</h3><p>{book.author}</p></button><div className="progress-line"><i style={{ width: String(book.totalPages ? Math.min(100, book.currentPage / book.totalPages * 100) : 0) + "%" }} /></div><small>{book.currentPage} de {book.totalPages || "?"} páginas</small><button type="button" className="delete-book-trigger" onClick={() => setBookToDelete(book)}>Eliminar libro</button></div>{bookTab === "reading" && isSelected ? <div className="page-counter"><label>Páginas hoy</label><div><input type="number" min="0" value={pagesInput} onChange={(event) => setPagesInput(Number(event.target.value) || 0)} /><button className="save-pages" onClick={() => void save({ action: "set_pages", bookId: book.id, date: today, pages: pagesInput })}><SaveButtonContent label="Guardar" phase={savePhase("set_pages")} /></button></div></div> : <button type="button" className="book-select-action" onClick={() => setSelectedBookId(book.id)}>{isSelected ? "✓ Seleccionado" : "Ver notas y detalles"}</button>}</article>; })}</div>{bookShelfPageCount > 1 && <div className="book-shelf-pagination"><button type="button" disabled={visibleBookShelfPage === 0} onClick={() => showBookShelfPage(visibleBookShelfPage - 1)}>← Anteriores</button><span>{visibleBookShelfPage + 1} de {bookShelfPageCount}</span><button type="button" disabled={visibleBookShelfPage === bookShelfPageCount - 1} onClick={() => showBookShelfPage(visibleBookShelfPage + 1)}>Siguientes →</button></div>}</> : <button type="button" className="empty-shelf" onClick={() => openAddBook(bookTab)}><span>＋</span><b>No hay libros en esta lista</b><p>Tocá acá para agregar el primero.</p></button>}
  </article><article className="panel notes-panel section-panel"><div className="panel-heading"><div><p>IDEAS QUE QUEDAN</p><h2>Notas del libro</h2></div></div>{selectedBook ? <><form onSubmit={(event) => { event.preventDefault(); void save({ action: "add_note", bookId: selectedBook.id, content: note }).then((ok) => { if (ok) setNote(""); }); }}><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={"Idea u observación de " + selectedBook.title + "…"} /><button disabled={saving}><SaveButtonContent label="Guardar nota" phase={savePhase("add_note")} /></button></form><div className="notes-list">{data.notes.filter((item) => item.bookId === selectedBook.id).map((item) => <div key={item.id}><span>“</span><p>{item.content}</p></div>)}</div></> : <div className="inline-empty"><span>✎</span><p><b>Elegí un libro</b><small>Sus notas aparecerán acá.</small></p></div>}</article>
  <article className="panel section-panel book-discover-panel"><div className="book-discover-head"><span>✦</span><div><p>DESCUBRIR NUEVAS LECTURAS</p><h2>¿Sobre qué querés leer?</h2><small>Buscá por un tema, una idea o un interés y elegí el idioma de la edición.</small></div></div><form className="book-discover-form" onSubmit={(event) => void discoverBooks(event)}><input value={discoverQuery} onChange={(event) => setDiscoverQuery(event.target.value)} placeholder="Ej. finanzas personales, inteligencia artificial, historia…" /><Dropdown ariaLabel="Idioma del libro" value={discoverLanguage} onChange={setDiscoverLanguage} options={bookLanguageOptions.map(([value, label]) => ({ value, label }))} /><button disabled={discoverLoading || discoverQuery.trim().length < 2}>{discoverLoading ? "Buscando…" : "Buscar libros"}</button></form><div className="book-topic-chips">{["Finanzas personales", "Productividad", "Historia", "Tecnología", "Psicología", "Biografías"].map((topic) => <button type="button" key={topic} onClick={() => setDiscoverQuery(topic)}>{topic}</button>)}</div>{discoverLoading && <div className="discover-loading"><span className="voice-spinner" /><b>Buscando buenas opciones…</b></div>}{!discoverLoading && discoverResults.length > 0 && <div className="book-results-grid">{discoverResults.map((book) => { const isSaved = data.books.some((savedBook) => savedBook.title.toLowerCase() === book.title.toLowerCase() && (!savedBook.author || savedBook.author.toLowerCase() === book.author.toLowerCase())); return <article key={book.key}><CatalogBookCover book={book} /><div className="book-result-copy"><span>{book.year || "Edición disponible"}</span><h3>{book.title}</h3><p>{book.author}</p><small>{book.pages ? `${book.pages} páginas aproximadas` : "Páginas no informadas"}</small></div><div className="book-result-actions"><button type="button" disabled={saving || isSaved} onClick={() => void saveDiscoveredBook(book)}>{isSaved ? "✓ En tu biblioteca" : "＋ Quiero leer"}</button><a href={book.openLibraryUrl} target="_blank" rel="noreferrer">Ver ficha ↗</a></div></article>; })}</div>}{!discoverLoading && discoverSearched && !discoverResults.length && <div className="inline-empty discover-empty"><span>⌕</span><p><b>No encontramos opciones con esos filtros</b><small>Probá con un tema más amplio u otro idioma.</small></p></div>}<p className="catalog-credit">Información bibliográfica y portadas provistas por <a href="https://openlibrary.org/" target="_blank" rel="noreferrer">Open Library</a>.</p></article></section>;

  const priorityEditor = <article className="panel priority-panel"><div className="panel-heading"><div><p>PRIORIDAD DEL MES</p><h2>¿Qué te importa más cumplir?</h2></div></div><p className="panel-intro">Estas prioridades definen el peso de cada área en el Daily Score.</p><div className="priority-list">{([
    ["gymWeight", "Entrenamiento", "↗", "Constancia en todas tus disciplinas"],
    ["nutritionWeight", "Alimentación", "◇", "Registrar comidas y cuidar tu energía"],
    ["sleepWeight", "Sueño", "☾", "Duración y regularidad del descanso"],
    ["focusWeight", "Estudio / Trabajo", "⌁", "Trabajo profundo en materias y proyectos"],
    ["readingWeight", "Lectura", "▱", "Leer y avanzar en tus libros"],
    ["goalsWeight", "Objetivos y organización", "◎", "Completar metas y próximos pasos"],
  ] as Array<[keyof Omit<Priorities, "monthKey">, string, string, string]>).map(([key, label, icon, copy]) => <div className="priority-row" key={key}><span className="priority-icon">{icon}</span><div className="priority-copy"><b>{label}</b><small>{copy}</small></div><div className="priority-options">{[1, 2, 3].map((value) => <button key={value} className={priorityDraft[key] === value ? "active" : ""} onClick={() => setPriorityDraft({ ...priorityDraft, [key]: value })}>{priorityLabels[value]}</button>)}</div></div>)}</div><p className="priority-view-note">Inicio, Calendario y Estadísticas reúnen información de estas áreas, por eso no duplican peso en el puntaje.</p><button className="save-priorities" disabled={saving} onClick={() => void save({ action: "set_priorities", ...priorityDraft, monthKey })}><SaveButtonContent label="Guardar prioridades" phase={savePhase("set_priorities")} /></button></article>;
  const goalTargetDate = goalPeriod === "custom" ? customDate : goalDeadline(today, goalPeriod);
  const goalsPanel = <section className="goals-page"><div className="goals-columns"><article className="panel goal-creator"><div className="panel-heading"><div><p>NUEVO OBJETIVO</p><h2>¿Qué querés conseguir?</h2></div></div><form onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_goal", title: form.get("title"), category: form.get("category"), period: goalPeriod, targetDate: goalTargetDate }); }}><label>Objetivo<input name="title" required placeholder="Ej. Correr mis primeros 10 km" /></label><label>Área<Dropdown name="category" ariaLabel="Área del objetivo" options={goalAreaOptions.map((area) => ({ value: area.value, label: area.label }))} /></label><label>Plazo<Dropdown ariaLabel="Plazo del objetivo" value={goalPeriod} onChange={(value) => setGoalPeriod(value as GoalPeriod)} options={[{ value: "weekly", label: "Esta semana" }, { value: "monthly", label: "Este mes" }, { value: "annual", label: "Este año" }, { value: "custom", label: "Fecha exacta" }]} /></label>{goalPeriod === "custom" && <label>Fecha exacta<DatePicker ariaLabel="Fecha exacta del objetivo" value={customDate} onChange={setCustomDate} min={today} /></label>}<div className="deadline-preview"><span>◎</span><p><small>FECHA OBJETIVO</small><b>{formatDate(goalTargetDate)}</b></p></div><button className="primary-action" disabled={saving}><SaveButtonContent label="Crear objetivo" phase={savePhase("add_goal")} /></button></form></article>
    <article className="panel goal-list-panel"><div className="panel-heading"><div><p>TU CAMINO</p><h2>Objetivos guardados</h2></div><span className="week-pill">{activeGoals.length} activos</span></div><div className="goal-list">{data.goals.map((goal) => <div className={"goal-row " + (goal.completedAt ? "completed" : "")} key={goal.id}><button className="goal-check" onClick={() => void save({ action: "toggle_goal", id: goal.id, completed: !goal.completedAt })}>{goal.completedAt ? "✓" : ""}</button><div><div className="goal-meta"><span className={"category-chip " + goal.category}>{categoryLabels[goal.category]}</span><span>{periodLabels[goal.period]}</span></div><b>{goal.title}</b><small>{goal.completedAt ? "Objetivo cumplido" : formatDate(goal.targetDate) + " · " + countdownLabel(Math.max(0, dayDistance(today, goal.targetDate)))}</small></div><button className="goal-delete" onClick={() => void save({ action: "delete_goal", id: goal.id })}>×</button></div>)}{!data.goals.length && <div className="inline-empty tall"><span>◎</span><p><b>Todavía no hay objetivos</b><small>Empezá con uno concreto.</small></p></div>}</div></article></div></section>;

  // ---------------------------------------------------------------------------
  // AVORA Pro: comparación de planes y simulación de compra
  // ---------------------------------------------------------------------------
  const planRows: Array<{ feature: string; detail: string; free: string | false; pro: string }> = [
    { feature: "Registro de todo", detail: "Entrenamiento, comidas, sueño, foco, lectura y objetivos", free: "Completo", pro: "Completo" },
    { feature: "Plan del día", detail: "Tu agenda hora por hora y los huecos libres", free: "Completo", pro: "Completo" },
    { feature: "Daily Score y rachas", detail: "Puntaje por prioridades, récords y tendencias", free: "Completo", pro: "Completo" },
    { feature: "Recomendaciones diarias", detail: "Cruza sueño, agenda y rachas para decirte qué mover y a qué hora", free: false, pro: "Ilimitadas" },
    { feature: "Cierre del día por voz", detail: "Contás tu día en un minuto y se acomoda solo en cada sección", free: false, pro: "Sin límite" },
    { feature: "Calorías por foto", detail: "Sacás una foto del plato y sale la estimación con macros", free: false, pro: "Sin límite" },
    { feature: "Plan de alimentación", detail: "Calculado con tus datos y adaptado a tus intolerancias", free: false, pro: "Incluido" },
    { feature: "Reprogramación automática", detail: "Dormiste poco: te mueve el bloque difícil al mejor hueco del día", free: false, pro: "Incluido" },
  ];
  const lockedCount = planRows.filter((row) => row.free === false).length;

  const proPanel = <section className="pro-page">
    {isPro ? <article className="panel pro-active">
      <span className="pro-active-badge">✦</span>
      <p>SUSCRIPCIÓN ACTIVA</p>
      <h2>Tenés AVORA Pro.</h2>
      <p className="pro-active-copy">Activada el {formatDate(data.profile.proSince || today)}. Todas las funciones están desbloqueadas en esta cuenta.</p>
      <div className="pro-active-actions">
        <button className="primary-action" onClick={() => openSection("summary")}>Volver a Inicio</button>
        <button className="pro-cancel" disabled={saving} onClick={() => void cancelPro()}>{saving ? "Desactivando…" : "Volver al plan gratuito"}</button>
      </div>
      <small className="pro-demo-note">Demostración: la suscripción se simula localmente y no hay ningún cobro.</small>
    </article> : <>
      <article className="panel pro-hero">
        <p className="pro-eyebrow">AVORA PRO</p>
        <h2>Registrar es la mitad.<br /><em>Decidir es la otra.</em></h2>
        <p className="pro-hero-copy">
          Ya anotás todo. Pro es la parte que lee esos datos por vos y te dice qué mover:
          que dormiste 5 h y tu bloque difícil está a las 8, que hay un hueco libre a las 17,
          que llevás cinco días de racha y hoy todavía no registraste.
        </p>
        <div className="pro-hero-proof">
          <div><b>{lockedCount}</b><small>funciones bloqueadas hoy</small></div>
          <div><b>1 min</b><small>para cerrar el día hablando</small></div>
          <div><b>0</b><small>planillas que llenar a mano</small></div>
        </div>
      </article>

      <article className="panel pro-compare">
        <div className="panel-heading"><div><p>QUÉ CAMBIA</p><h2>Gratis y Pro, lado a lado</h2></div></div>
        <div className="pro-table" role="table">
          <div className="pro-table-head" role="row">
            <span role="columnheader">Función</span>
            <span role="columnheader">Gratis</span>
            <span role="columnheader" className="is-pro">Pro</span>
          </div>
          {planRows.map((row) => <div className={"pro-table-row " + (row.free === false ? "is-locked" : "")} role="row" key={row.feature}>
            <span role="cell"><b>{row.feature}</b><small>{row.detail}</small></span>
            <span role="cell" className="pro-cell-free">{row.free === false ? <i aria-label="No incluido">—</i> : row.free}</span>
            <span role="cell" className="pro-cell-pro">{row.pro}</span>
          </div>)}
        </div>
      </article>

      <article className="panel pro-pricing">
        <div className="pro-plan-switch" role="group" aria-label="Elegí la frecuencia de pago">
          <button className={checkoutPlan === "monthly" ? "active" : ""} onClick={() => setCheckoutPlan("monthly")}>Mensual</button>
          <button className={checkoutPlan === "annual" ? "active" : ""} onClick={() => setCheckoutPlan("annual")}>Anual <i>2 meses gratis</i></button>
        </div>
        <div className="pro-price">
          <b>{checkoutPlan === "annual" ? "$4.990" : "$5.990"}</b>
          <small>por mes{checkoutPlan === "annual" ? ", facturado anual" : ""}</small>
        </div>
        <p className="pro-price-note">{checkoutPlan === "annual" ? "Pagás $59.880 una vez al año y te ahorrás $11.980." : "Cancelás cuando quieras, sin explicaciones."}</p>
        <button className="pro-buy" onClick={() => { setCheckoutStep("form"); setCheckoutOpen(true); }}>Empezar con Pro <span>→</span></button>
        <ul className="pro-reassure">
          <li>Tus datos siguen siendo tuyos: Pro no cambia quién los ve.</li>
          <li>Si cancelás, todo lo que registraste sigue estando.</li>
          <li>Demostración: no se cobra nada y podés volver atrás cuando quieras.</li>
        </ul>
      </article>
    </>}
  </section>;

  const checkoutDialog = checkoutOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && checkoutStep !== "processing") setCheckoutOpen(false); }}>
    <section className="checkout-dialog" role="dialog" aria-modal="true" aria-label="Confirmar suscripción">
      {checkoutStep === "done" ? <div className="checkout-done">
        <span aria-hidden="true">✓</span>
        <h2>Listo, ya tenés Pro.</h2>
        <p>Las recomendaciones, el cierre por voz, las calorías por foto y el plan de alimentación quedaron desbloqueados.</p>
        <button className="primary-action" onClick={() => { setCheckoutOpen(false); openSection("summary"); }}>Ver mi Inicio</button>
      </div> : <>
        <p className="checkout-label">CONFIRMAR SUSCRIPCIÓN</p>
        <h2>AVORA Pro {checkoutPlan === "annual" ? "anual" : "mensual"}</h2>
        <div className="checkout-summary">
          <div><span>Plan</span><b>{checkoutPlan === "annual" ? "Anual (12 meses)" : "Mensual"}</b></div>
          <div><span>Precio</span><b>{checkoutPlan === "annual" ? "$59.880 por año" : "$5.990 por mes"}</b></div>
          <div><span>Equivale a</span><b>{checkoutPlan === "annual" ? "$4.990 por mes" : "$5.990 por mes"}</b></div>
        </div>
        <div className="checkout-demo">
          <span aria-hidden="true">ⓘ</span>
          <p><b>Esto es una demostración.</b> No hay pasarela de pago ni se piden datos de tarjeta: el botón simula la compra y desbloquea las funciones para que puedas probarlas.</p>
        </div>
        <div className="checkout-actions">
          <button type="button" className="checkout-cancel" disabled={checkoutStep === "processing"} onClick={() => setCheckoutOpen(false)}>Cancelar</button>
          <button type="button" className="checkout-pay" disabled={checkoutStep === "processing"} onClick={() => void simulatePayment()}>
            {checkoutStep === "processing" ? <><i className="voice-spinner" />Procesando…</> : "Simular pago y activar"}
          </button>
        </div>
      </>}
    </section>
  </div>;

  const settingsTitles: Record<SettingsView, string> = { home: "Configuración", personal: "Datos personales", language: "Idioma", notifications: "Notificaciones" };
  const settingsDialog = settingsOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
    <section className="checkout-dialog settings-dialog settings-navigation" role="dialog" aria-modal="true" aria-label={settingsTitles[settingsView]}>
      <header className="settings-dialog-head">
        {settingsView !== "home" && <button type="button" className="settings-back" onClick={() => { setError(""); setSettingsView("home"); }} aria-label="Volver a Configuración">←</button>}
        <div><p className="checkout-label">CONFIGURACIÓN</p><h2>{settingsTitles[settingsView]}</h2></div>
        <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Cerrar">×</button>
      </header>

      {settingsView === "home" && <div className="settings-hub">
        <p>CUENTA</p>
        <button type="button" onClick={openPersonalSettings}><span aria-hidden="true">♙</span><div><b>Datos personales</b><small>Nombre, usuario y foto de perfil</small></div><i aria-hidden="true">›</i></button>
        <p>PREFERENCIAS</p>
        <button type="button" onClick={() => setSettingsView("language")}><span aria-hidden="true">文</span><div><b>Idioma</b><small>Español (Argentina)</small></div><i aria-hidden="true">›</i></button>
        <button type="button" onClick={() => setSettingsView("notifications")}><span aria-hidden="true">◌</span><div><b>Notificaciones</b><small>Resúmenes y próximos recordatorios</small></div><i aria-hidden="true">›</i></button>
      </div>}

      {settingsView === "personal" && <>
        <div className="avatar-editor">
          <div className="avatar-preview">{data.profile.avatarUrl ? <Image src={data.profile.avatarUrl} alt="Tu foto de perfil" width={64} height={64} unoptimized /> : <span>{displayName.charAt(0)}</span>}</div>
          <label className="avatar-upload-button">
            {avatarUploading ? "Subiendo…" : "Cambiar foto"}
            <input type="file" accept="image/*" disabled={avatarUploading} onChange={(event) => { void uploadAvatar(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
        </div>
        <form className="data-form settings-form" onSubmit={saveSettings}>
          <label>Nombre<input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} maxLength={60} required /></label>
          <label>Nombre de usuario<div className="username-input"><span>@</span><input value={settingsUsername} onChange={(event) => setSettingsUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} /></div><small className="field-note">3 a 20 letras, números o _. Con esto te invitan tus amigos.</small></label>
          {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
          <div className="checkout-actions">
            <button type="button" className="checkout-cancel" onClick={() => setSettingsOpen(false)}>Cancelar</button>
            <button type="submit" className="checkout-pay" disabled={saving}><SaveButtonContent label="Guardar cambios" phase={savePhase("personal_settings")} /></button>
          </div>
        </form>
      </>}

      {settingsView === "language" && <div className="settings-subpanel">
        <p className="settings-copy">Elegí el idioma de la interfaz de AVORA.</p>
        <button type="button" className="settings-choice is-selected"><span>ES</span><div><b>Español (Argentina)</b><small>Idioma actual</small></div><i>✓</i></button>
        <button type="button" className="settings-choice" disabled><span>EN</span><div><b>English</b><small>Disponible próximamente</small></div><i>Próximamente</i></button>
      </div>}

      {settingsView === "notifications" && <form className="settings-subpanel" onSubmit={saveNotifications}>
        <p className="settings-copy">Elegí qué comunicaciones querés recibir asociadas a tu cuenta.</p>
        <label className="settings-toggle"><input type="checkbox" checked={weeklySummary} onChange={(event) => setWeeklySummary(event.target.checked)} /><span><b>Resumen semanal</b><small>Guardamos tu preferencia para recibir un resumen de tu progreso.</small></span></label>
        <div className="settings-disabled-row"><span><b>Recordatorios push</b><small>Avisos en el celular para tareas y cierres del día.</small></span><i>Próximamente</i></div>
        {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
        <button className="checkout-pay settings-save" disabled={saving}><SaveButtonContent label="Guardar notificaciones" phase={savePhase("notification_settings")} /></button>
        <small className="field-note">La preferencia queda guardada. El envío automático se conectará cuando definamos el proveedor de notificaciones.</small>
      </form>}
    </section>
  </div>;

  const feedbackDialog = feedbackOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackOpen(false); }}>
    <section className="checkout-dialog settings-dialog feedback-dialog" role="dialog" aria-modal="true" aria-label="Ayudanos a mejorar AVORA">
      <header className="settings-dialog-head"><div><p className="checkout-label">TU EXPERIENCIA IMPORTA</p><h2>Ayudanos a mejorar AVORA</h2></div><button type="button" className="settings-close" onClick={() => setFeedbackOpen(false)} aria-label="Cerrar">×</button></header>
      {feedbackSent ? <div className="feedback-success"><span>✓</span><h3>Gracias por ayudarnos.</h3><p>Tu comentario quedó guardado para que podamos revisarlo durante la beta.</p><button type="button" onClick={() => setFeedbackSent(false)}>Enviar otro comentario</button></div> : <form className="feedback-form" onSubmit={submitFeedback}>
        <p className="settings-copy">Puede ser algo que te gustó, una idea, algo que cambiarías o un error.</p>
        <div className="feedback-types">{FEEDBACK_TYPES.map(([value, icon, title, copy]) => <button type="button" key={value} className={feedbackType === value ? "active" : ""} onClick={() => setFeedbackType(value)}><span>{icon}</span><p><b>{title}</b><small>{copy}</small></p><i>{feedbackType === value ? "✓" : ""}</i></button>)}</div>
        <label>¿En qué parte de AVORA?<select value={feedbackSection} onChange={(event) => setFeedbackSection(event.target.value)}>{FEEDBACK_SECTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Contanos un poco más<textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} maxLength={2000} required placeholder={feedbackType === "bug" ? "Ej. Cuando selecciono cuatro prioridades, solo aparecen tres…" : "Escribí tu comentario…"} /></label>
        <div className="feedback-meta"><span>Adjuntamos automáticamente la pantalla, el navegador y la versión para entender el contexto.</span><b>{feedbackMessage.length}/2000</b></div>
        {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
        <button className="checkout-pay settings-save" disabled={saving || feedbackMessage.trim().length < 3}><SaveButtonContent label="Enviar comentario" phase={savePhase("submit_feedback")} /></button>
      </form>}
    </section>
  </div>;

  // ---------------------------------------------------------------------------
  // Amigos y grupos
  // ---------------------------------------------------------------------------
  const myEmail = social.me || data.profile.email.toLowerCase();
  const myStreak = streaks.logging;

  async function inviteFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteCopied(false);
    const result = await sendSocial({ action: "invite_friend", username: inviteUsername.trim().toLowerCase() });
    if (!result) return;
    const link = String(result.link ?? "");
    setInviteLink(link);
    setFriendsNotice(inviteUsername.trim()
      ? `Invitación lista para @${inviteUsername.trim().toLowerCase()}. Le aparece adentro de AVORA.`
      : "Link listo. Compartilo con quien quieras sumar.");
    setInviteUsername("");
  }

  async function copyInvite(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setInviteCopied(true);
    } catch {
      setFriendsNotice("No pudimos copiar el link. Seleccionalo y copialo a mano.");
    }
  }

  async function removeFriend(email: string, name: string) {
    if (!window.confirm(`¿Sacar a ${name} de tu círculo? Dejan de ver el Daily Score del otro.`)) return;
    if (await sendSocial({ action: "remove_friend", email })) setFriendsNotice(`${name} ya no está en tu círculo.`);
  }

  function closeGroupWizard() {
    setGroupWizard(false);
    setGroupDraft({ name: "", accent: "mint" });
    setWizardGoal(emptyGoalDraft());
    setWizardInvites([]);
  }

  /** El grupo se guarda entero: nombre, objetivo e invitaciones de una vez. */
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await sendSocial({
      action: "create_group",
      name: groupDraft.name,
      accent: groupDraft.accent,
      goal: wizardGoal.title.trim() ? wizardGoal : null,
      invites: wizardInvites,
    });
    if (!result) return;
    const invited = Number(result.invited ?? 0);
    closeGroupWizard();
    setFriendsNotice(invited
      ? `Grupo guardado. Le mandamos la invitación a ${pluralize(invited, "persona", "personas")}: entran cuando la aceptan.`
      : "Grupo guardado. Sumá gente cuando quieras desde el ícono de amigos.");
  }

  async function joinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await sendSocial({ action: "join_group", code: joinCode.trim() })) {
      setJoinCode("");
      setFriendsNotice("Entraste al grupo.");
    }
  }

  /** Abre —o cierra— uno de los tres paneles del encabezado de un grupo. */
  function toggleGroupPanel(group: Group, tab: GroupPanelTab) {
    const open = groupPanel?.id === group.id && groupPanel.tab === tab;
    setGroupPanel(open ? null : { id: group.id, tab });
    setEditingGoalId(null);
    setGoalDraft(emptyGoalDraft());
    if (!open && tab === "settings") setSettingsDraft({ name: group.name, accent: group.accent });
  }

  async function saveGroupSettings(event: FormEvent<HTMLFormElement>, groupId: number) {
    event.preventDefault();
    if (await sendSocial({ action: "update_group", groupId, ...settingsDraft })) {
      setFriendsNotice("Listo: el grupo quedó con el nombre y el color nuevos.");
    }
  }

  async function saveGroupGoal(event: FormEvent<HTMLFormElement>, groupId: number) {
    event.preventDefault();
    const editing = editingGoalId;
    const done = editing
      ? await sendSocial({ action: "update_group_goal", goalId: editing, ...goalDraft })
      : await sendSocial({ action: "add_group_goal", groupId, ...goalDraft });
    if (!done) return;
    setGoalDraft(emptyGoalDraft());
    setEditingGoalId(null);
    setFriendsNotice(editing
      ? "Objetivo actualizado."
      : "Objetivo fijado. Cada uno suma su parte y el grupo ve el total.");
  }

  /**
   * Los campos de un objetivo. Son los mismos al crear el grupo y al editarlo
   * después, así que el formulario se escribe una sola vez.
   */
  const goalFieldset = (draft: GoalDraft, update: (next: GoalDraft) => void) => <div className="goal-fields">
    <label className="wide"><span>¿Qué se proponen?</span>
      <input value={draft.title} onChange={(event) => update({ ...draft, title: event.target.value })} placeholder="Entrenar 12 veces este mes" maxLength={120} />
    </label>
    <label className="wide"><span>Cómo se cuenta</span>
      <Dropdown ariaLabel="Cómo se cuenta el objetivo" value={draft.source} onChange={(value) => update({ ...draft, source: value as GoalSource })} options={GOAL_SOURCES.map((source) => ({ value: source.value, label: source.label }))} />
    </label>
    <small className="goal-source-hint">{goalSource(draft.source).hint}</small>
    <label><span>Meta</span>
      <input type="number" min={1} max={100000} value={draft.targetValue} onChange={(event) => update({ ...draft, targetValue: Number(event.target.value) })} />
    </label>
    <label><span>Unidad</span>
      {draft.source === "manual"
        ? <Dropdown ariaLabel="Unidad del objetivo" value={draft.metric} onChange={(value) => update({ ...draft, metric: value as GoalMetric })} options={GOAL_METRICS.map((metric) => ({ value: metric.value, label: metric.label }))} />
        : <input value={goalSource(draft.source).unit} readOnly tabIndex={-1} />}
    </label>
    <label><span>Plazo</span>
      <Dropdown ariaLabel="Plazo del objetivo" value={draft.period} onChange={(value) => update({ ...draft, period: value as GroupGoal["period"] })} options={[{ value: "weekly", label: "Esta semana" }, { value: "monthly", label: "Este mes" }, { value: "custom", label: "Fecha propia" }]} />
    </label>
    {draft.period === "custom" && <label><span>Hasta</span>
      <input type="date" value={draft.dueDate} onChange={(event) => update({ ...draft, dueDate: event.target.value })} />
    </label>}
  </div>;

  const inviteText = inviteMessage(data.profile.displayName, inviteLink);
  const shareBox = inviteLink ? <div className="invite-share">
    <p><small>LINK DE INVITACIÓN</small><code>{inviteLink}</code></p>
    <div className="invite-share-actions">
      <button type="button" onClick={() => void copyInvite(inviteLink)}>{inviteCopied ? "Copiado ✓" : "Copiar link"}</button>
      <a href={whatsappLink(inviteText)} target="_blank" rel="noreferrer">WhatsApp</a>
      <a href={mailLink(inviteText)}>Mail</a>
    </div>
  </div> : null;

  const circleTab = <>
    <article className="panel invite-panel">
      <div className="panel-heading"><div><p>SUMAR GENTE</p><h2>Invitá a un amigo</h2></div></div>
      <form className="invite-form" onSubmit={inviteFriend}>
        <label><span>Nombre de usuario de tu amigo <small>(opcional)</small></span>
          <div className="username-input"><span>@</span><input value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="su_usuario" /></div>
        </label>
        <button type="submit" disabled={saving}>{inviteUsername.trim() ? "Enviar invitación" : "Generar link"} <span>→</span></button>
      </form>
      <small className="invite-hint">Con el nombre de usuario le llega la invitación dentro de AVORA. Sin eso generás un link para mandar por WhatsApp o mail.</small>
      {shareBox}
    </article>

    {social.incoming.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>TE INVITARON</p><h2>{pluralize(social.incoming.length, "invitación pendiente", "invitaciones pendientes")}</h2></div></div>
      <ul className="invite-list">
        {social.incoming.map((invite) => <li key={invite.code}>
          <span className={"friend-avatar " + accentFor(invite.fromEmail)}>{initialsFor(invite.fromName || invite.fromEmail)}</span>
          <p><b>{invite.fromName || invite.fromEmail}</b><small>{invite.fromEmail}</small></p>
          <div>
            <button type="button" className="invite-accept" disabled={saving} onClick={() => void sendSocial({ action: "accept_invite", code: invite.code })}>Aceptar</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "decline_invite", code: invite.code })}>Rechazar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    {social.outgoing.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>ESPERANDO RESPUESTA</p><h2>Invitaciones que mandaste</h2></div></div>
      <ul className="invite-list">
        {social.outgoing.map((invite) => <li key={invite.code}>
          <span className="friend-avatar">{invite.toEmail ? initialsFor(invite.toEmail) : "↗"}</span>
          <p><b>{invite.toEmail || "Link abierto"}</b><small>{invite.toEmail ? "Le aparece al iniciar sesión" : "Lo toma quien abra el link"}</small></p>
          <div>
            <button type="button" onClick={() => void copyInvite(`${window.location.origin}/invite/${invite.code}`)}>Copiar link</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "revoke_invite", code: invite.code })}>Cancelar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    <section className="friends-score-grid">
      <article className="panel friend-score-card is-me">
        <div className="friend-score-head"><span className="friend-avatar">{initialsFor(data.profile.displayName)}</span><p><b>Vos</b><small>{myStreak.current > 0 ? `${pluralize(myStreak.current, "día", "días")} de racha` : "Empezá tu racha hoy"}</small></p></div>
        <div className="friend-score-main">
          <div className="friend-score-ring" style={{ "--friend-score": `${score}%` } as CSSProperties}><span><b>{score}</b><small>/100</small></span></div>
          <p><small>DAILY SCORE</small><b>{scoreLabel(score)}</b><span>Esto es lo único que ven tus amigos: el número y la racha, nunca tus registros.</span></p>
        </div>
      </article>
      {social.friends.map((friend) => {
        // `share` en una constante propia: el estrechamiento de `isFresh` no
        // sobrevive a un acceso por propiedad.
        const share = friend.share;
        const fresh = isFresh(share, today);
        const friendScore = fresh ? share.score : 0;
        return <article className={"panel friend-score-card" + (fresh ? "" : " is-stale")} key={friend.email}>
          <div className="friend-score-head">
            <span className={"friend-avatar " + accentFor(friend.email)}>{initialsFor(friend.name)}</span>
            <p><b>{friend.name}</b><small>{shareStatus(friend.share, today)}</small></p>
            <button type="button" aria-label={`Sacar a ${friend.name} de tu círculo`} onClick={() => void removeFriend(friend.email, friend.name)}>×</button>
          </div>
          <div className="friend-score-main">
            <div className="friend-score-ring" style={{ "--friend-score": `${friendScore}%` } as CSSProperties}><span><b>{fresh ? friendScore : "–"}</b><small>/100</small></span></div>
            <p><small>DAILY SCORE</small><b>{fresh ? share.headline : "Sin datos de hoy"}</b><span>{share?.streak ? `${pluralize(share.streak, "día", "días")} de racha · mejor ${share.bestStreak}` : "Todavía sin racha"}</span></p>
          </div>
          <div className="friend-streak-bar"><small>RACHA DE USO</small><i style={{ width: `${Math.min(100, (share?.streak ?? 0) / Math.max(1, Math.max(myStreak.current, share?.streak ?? 0)) * 100)}%` }} /><b>{share?.streak ?? 0}</b></div>
          <div className="friend-nudge-wrap">
            <button type="button" className="friend-nudge" onClick={() => setNudgeOpenFor(nudgeOpenFor === friend.email ? null : friend.email)}>
              <span>✉ Mandar un mensaje</span><i>{nudgeOpenFor === friend.email ? "▲" : "▼"}</i>
            </button>
            {nudgeOpenFor === friend.email && <div className="ui-dropdown-panel friend-nudge-menu" role="menu">
              {FRIEND_NUDGE_MESSAGES.map((message) => <a key={message} role="menuitem" className="ui-dropdown-option" href={mailLink(message, friend.email)} onClick={() => setNudgeOpenFor(null)}>{message}</a>)}
            </div>}
          </div>
        </article>;
      })}
    </section>

    {social.friends.length === 0 && <p className="friends-empty">Todavía no tenés a nadie en tu círculo. Mandá una invitación y empiecen a compararse el Daily Score.</p>}
  </>;

  const groupsTab = <>
    {social.groupInvites.length > 0 && <article className="panel invite-inbox">
      <div className="panel-heading"><div><p>TE INVITARON A UN GRUPO</p><h2>{pluralize(social.groupInvites.length, "invitación pendiente", "invitaciones pendientes")}</h2></div></div>
      <ul className="invite-list">
        {social.groupInvites.map((invite) => <li key={invite.id}>
          <span className={"friend-avatar " + accentFor(invite.groupName || String(invite.groupId))}>{initialsFor(invite.groupName || "Grupo")}</span>
          <p><b>{invite.groupName || "Un grupo"}</b><small>Te invitó {invite.fromName || invite.fromEmail}</small></p>
          <div>
            <button type="button" className="invite-accept" disabled={saving} onClick={() => void sendSocial({ action: "accept_group_invite", inviteId: invite.id })}>Entrar</button>
            <button type="button" className="invite-decline" disabled={saving} onClick={() => void sendSocial({ action: "decline_group_invite", inviteId: invite.id })}>Rechazar</button>
          </div>
        </li>)}
      </ul>
    </article>}

    <article className="panel group-actions">
      <div className="panel-heading"><div><p>GRUPOS</p><h2>Objetivos en común</h2></div>
        {!groupWizard && <button type="button" className="accountability-add is-inline" onClick={() => setGroupWizard(true)}>＋ Crear grupo</button>}
      </div>
      {groupWizard ? <form className="group-wizard" onSubmit={createGroup}>
        <section className="group-step">
          <p><span>01</span>Nombre y color</p>
          <label className="group-field"><span>¿Cómo se llama el grupo?</span>
            <input autoFocus value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} placeholder="Los del gimnasio" required minLength={2} maxLength={60} />
          </label>
          <div className="group-field"><span>Color</span>
            <div className="group-accents">{GROUP_ACCENTS.map((accent) => <button key={accent} type="button" className={"group-accent " + accent + (groupDraft.accent === accent ? " is-on" : "")} aria-label={`Color ${accent}`} aria-pressed={groupDraft.accent === accent} onClick={() => setGroupDraft({ ...groupDraft, accent })} />)}</div>
          </div>
        </section>

        <section className="group-step">
          <p><span>02</span>El objetivo en común</p>
          {goalFieldset(wizardGoal, setWizardGoal)}
        </section>

        <section className="group-step">
          <p><span>03</span>A quién invitás</p>
          {social.friends.length > 0 ? <>
            <div className="group-invite-picker">
              {social.friends.map((friend) => {
                const chosen = wizardInvites.includes(friend.email);
                return <button key={friend.email} type="button" className={chosen ? "is-on" : ""} aria-pressed={chosen}
                  onClick={() => setWizardInvites(chosen ? wizardInvites.filter((email) => email !== friend.email) : [...wizardInvites, friend.email])}>
                  <span className={"friend-avatar " + accentFor(friend.email)}>{initialsFor(friend.name)}</span>
                  <b>{friend.name}</b><i>{chosen ? "✓" : "＋"}</i>
                </button>;
              })}
            </div>
            <small className="group-step-hint">Les llega una invitación: entran al grupo recién cuando la aceptan.</small>
          </> : <p className="group-step-empty">Todavía no tenés a nadie en tu círculo. Guardá el grupo igual y sumá gente después desde el ícono de amigos.</p>}
        </section>

        <div className="group-wizard-actions">
          <button type="button" className="group-wizard-cancel" onClick={closeGroupWizard}>Cancelar</button>
          <button type="submit" disabled={saving || groupDraft.name.trim().length < 2}><SaveButtonContent label="Guardar grupo" phase={savePhase("create_group")} /></button>
        </div>
      </form> : <form className="group-join" onSubmit={joinGroup}>
        <label><span>¿Te pasaron un código?</span><input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Código del grupo" /></label>
        <button type="submit" disabled={saving || !joinCode.trim()}>Entrar</button>
      </form>}
    </article>

    {social.groups.map((group) => {
      const isOwner = group.isOwner;
      const panel = groupPanel?.id === group.id ? groupPanel.tab : null;
      const candidates = social.friends.filter((friend) =>
        !group.members.some((member) => member.userEmail === friend.email)
        && !group.pending.some((invite) => invite.toEmail === friend.email));
      const tools: Array<[GroupPanelTab, ReactNode, string]> = [
        ["settings", gearIcon, "Configuración del grupo"],
        ["goals", plusIcon, "Objetivos del grupo"],
        ["members", friendsIcon, "Invitar y ver integrantes"],
      ];
      return <article className={"panel group-card " + group.accent} key={group.id}>
        <div className="group-card-head">
          <div className="group-card-id">
            <p>{pluralize(group.members.length, "integrante", "integrantes")}{group.pending.length > 0 ? ` · ${group.pending.length} sin responder` : ""}</p>
            <h3>{group.name}</h3>
          </div>
          <div className="group-member-stack">{group.members.slice(0, 5).map((member) => <span key={member.userEmail} className={accentFor(member.userEmail)} title={member.displayName}>{initialsFor(member.displayName)}</span>)}</div>
          <div className="group-card-tools">
            {tools.map(([tab, icon, label]) => <button key={tab} type="button" className={"group-tool" + (panel === tab ? " is-on" : "")}
              aria-label={`${label}: ${group.name}`} aria-pressed={panel === tab} onClick={() => toggleGroupPanel(group, tab)}>{icon}</button>)}
          </div>
        </div>

        <ul className="group-goal-list">
          {group.goals.map((goal) => {
            const mine = goal.contributions.find((item) => item.userEmail === myEmail)?.value ?? 0;
            const unit = goalUnit(goal);
            return <li key={goal.id}>
              <div className="group-goal-head">
                <div><small>{goalPeriodLabel(goal)}</small><b>{goal.title}</b></div>
                <p><strong>{goalTotal(goal)}</strong><small>de {goal.targetValue} {unit}</small></p>
              </div>
              <div className="accountability-track"><i style={{ width: `${goalPercent(goal)}%` }} /></div>
              <div className="group-goal-mine">
                {goal.source === "manual" ? <>
                  <span>Tu marca</span>
                  <button type="button" aria-label="Restar una" disabled={saving || mine <= 0} onClick={() => void sendSocial({ action: "log_goal_progress", goalId: goal.id, value: mine - 1 })}>−</button>
                  <b>{mine}</b>
                  <button type="button" aria-label="Sumar una" disabled={saving} onClick={() => void sendSocial({ action: "log_goal_progress", goalId: goal.id, value: mine + 1 })}>+</button>
                </> : <span className="group-goal-auto">↻ Se cuenta solo con lo que registrás en {goalSource(goal.source).label} · <b>{mine} {unit}</b></span>}
              </div>
              {group.members.length > 1 && <ul className="group-goal-contributions">
                {group.members.map((member) => {
                  const value = goal.contributions.find((item) => item.userEmail === member.userEmail)?.value ?? 0;
                  return <li key={member.userEmail}>
                    <span className={"friend-avatar " + accentFor(member.userEmail)}>{initialsFor(member.displayName)}</span>
                    <b>{member.displayName}</b><small>{value} {unit}</small>
                  </li>;
                })}
              </ul>}
            </li>;
          })}
          {!group.goals.length && <li className="group-goal-empty">Todavía no hay ningún objetivo. Abrí el ＋ y poné el primero.</li>}
        </ul>

        {panel === "settings" && <form className="group-panel" onSubmit={(event) => void saveGroupSettings(event, group.id)}>
          <p className="step-label">CONFIGURACIÓN DEL GRUPO</p>
          {isOwner ? <>
            <label className="group-field"><span>Nombre</span>
              <input value={settingsDraft.name} onChange={(event) => setSettingsDraft({ ...settingsDraft, name: event.target.value })} required minLength={2} maxLength={60} />
            </label>
            <div className="group-field"><span>Color</span>
              <div className="group-accents">{GROUP_ACCENTS.map((accent) => <button key={accent} type="button" className={"group-accent " + accent + (settingsDraft.accent === accent ? " is-on" : "")} aria-label={`Color ${accent}`} aria-pressed={settingsDraft.accent === accent} onClick={() => setSettingsDraft({ ...settingsDraft, accent })} />)}</div>
            </div>
            <button type="submit" className="group-save" disabled={saving}><SaveButtonContent label="Guardar cambios" phase={savePhase("update_group")} /></button>
          </> : <p className="group-panel-note">El nombre y el color los cambia quien creó el grupo.</p>}
          <div className="group-code">
            <p><small>CÓDIGO DEL GRUPO</small><code>{group.inviteCode}</code></p>
            <button type="button" onClick={() => void copyInvite(group.inviteCode)}>Copiar</button>
          </div>
          <div className="group-danger">
            {isOwner
              ? <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Eliminar "${group.name}"? Se borra para todos los integrantes.`)) void sendSocial({ action: "delete_group", groupId: group.id }); }}>Eliminar grupo</button>
              : <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Salir de "${group.name}"?`)) void sendSocial({ action: "leave_group", groupId: group.id }); }}>Salir del grupo</button>}
          </div>
        </form>}

        {panel === "goals" && <div className="group-panel">
          <p className="step-label">OBJETIVOS DEL GRUPO</p>
          {group.goals.length > 0 && <ul className="group-goal-admin">
            {group.goals.map((goal) => <li key={goal.id}>
              <p><b>{goal.title}</b><small>{goal.targetValue} {goalUnit(goal)} · {goalPeriodLabel(goal).toLowerCase()} · {goal.source === "manual" ? "a mano" : "automático"}</small></p>
              <button type="button" className={editingGoalId === goal.id ? "is-on" : ""} onClick={() => {
                setEditingGoalId(goal.id);
                setGoalDraft({ title: goal.title, source: goal.source, metric: goal.metric, targetValue: goal.targetValue, period: goal.period, dueDate: goal.dueDate });
              }}>Editar</button>
              {(goal.createdBy === myEmail || isOwner) && <button type="button" className="group-goal-drop" disabled={saving} onClick={() => { if (window.confirm(`¿Borrar el objetivo "${goal.title}"?`)) void sendSocial({ action: "delete_group_goal", goalId: goal.id }); }}>Borrar</button>}
            </li>)}
          </ul>}
          <form className="group-goal-form" onSubmit={(event) => void saveGroupGoal(event, group.id)}>
            <p className="step-label">{editingGoalId ? "EDITAR OBJETIVO" : "NUEVO OBJETIVO"}</p>
            {goalFieldset(goalDraft, setGoalDraft)}
            <div className="group-goal-form-actions">
              {editingGoalId !== null && <button type="button" className="group-wizard-cancel" onClick={() => { setEditingGoalId(null); setGoalDraft(emptyGoalDraft()); }}>Cancelar</button>}
              <button type="submit" disabled={saving || goalDraft.title.trim().length < 2}><SaveButtonContent label={editingGoalId ? "Guardar objetivo" : "Fijar objetivo"} phase={savePhase(editingGoalId ? "update_group_goal" : "add_group_goal")} /></button>
            </div>
          </form>
        </div>}

        {panel === "members" && <div className="group-panel">
          <p className="step-label">INTEGRANTES</p>
          <ul className="group-member-list">
            {group.members.map((member) => <li key={member.userEmail}>
              <span className={"friend-avatar " + accentFor(member.userEmail)}>{initialsFor(member.displayName)}</span>
              <b>{member.displayName}{member.userEmail === myEmail ? " (vos)" : ""}</b>
              <small>{member.role === "owner" ? "Creó el grupo" : "Integrante"}</small>
              {isOwner && member.userEmail !== myEmail && <button type="button" disabled={saving} onClick={() => { if (window.confirm(`¿Sacar a ${member.displayName} del grupo?`)) void sendSocial({ action: "remove_group_member", groupId: group.id, email: member.userEmail }); }}>Sacar</button>}
            </li>)}
            {group.pending.map((invite) => <li key={"invite-" + invite.id} className="is-pending">
              <span className="friend-avatar">{initialsFor(invite.toEmail)}</span>
              <b>{invite.toEmail}</b>
              <small>Invitación enviada</small>
              <button type="button" disabled={saving} onClick={() => void sendSocial({ action: "revoke_group_invite", inviteId: invite.id })}>Cancelar</button>
            </li>)}
          </ul>
          {candidates.length > 0 ? <div className="group-add-member">
            <span>Invitar a alguien de tu círculo</span>
            <div>{candidates.map((friend) => <button key={friend.email} type="button" disabled={saving} onClick={() => void sendSocial({ action: "invite_to_group", groupId: group.id, email: friend.email })}>＋ {friend.name}</button>)}</div>
            <small>Le llega una invitación: entra al grupo recién cuando la acepta.</small>
          </div> : <p className="group-panel-note">Todos los de tu círculo ya están adentro o tienen una invitación abierta.</p>}
          <div className="group-code">
            <p><small>CÓDIGO DEL GRUPO</small><code>{group.inviteCode}</code></p>
            <button type="button" onClick={() => void copyInvite(group.inviteCode)}>Copiar</button>
          </div>
        </div>}
      </article>;
    })}

    {!social.groups.length && !groupWizard && <p className="friends-empty">Sin grupos todavía. Creá uno, fijá el objetivo que los une e invitá a tu círculo.</p>}
  </>;

  const friendsPanel = <section className="friends-page">
    <article className="friends-hero">
      <div className="friends-hero-copy">
        <p>ACCOUNTABILITY PARTNERS</p>
        <h2>Avanzar acompañado<br /><em>cambia el compromiso.</em></h2>
        <small>Tus amigos ven tu Daily Score y tu racha de uso. Nada más: ni tus comidas, ni tu sueño, ni lo que escribís.</small>
        <div className="friends-hero-actions">
          <button type="button" className={friendsTab === "circle" ? "" : "secondary"} onClick={() => setFriendsTab("circle")}>Mi círculo{social.incoming.length > 0 ? ` (${social.incoming.length})` : ""}</button>
          <button type="button" className={friendsTab === "groups" ? "" : "secondary"} onClick={() => setFriendsTab("groups")}>Grupos{social.groupInvites.length > 0 ? ` (${social.groupInvites.length})` : ""}</button>
        </div>
      </div>
      <div className="friends-hero-visual" aria-hidden="true">
        <div className="friend-avatar-stack">
          <span>{initialsFor(data.profile.displayName)}</span>
          {social.friends.slice(0, 3).map((friend) => <span key={friend.email}>{initialsFor(friend.name)}</span>)}
        </div>
        <b>{pluralize(social.friends.length, "persona", "personas")}</b><small>en tu círculo</small>
        <div className="friends-weekly-proof"><strong>{myStreak.current}</strong><span>días seguidos<br />usando AVORA</span></div>
      </div>
    </article>
    {friendsNotice && <div className="friends-notice"><span>ⓘ</span><p>{friendsNotice}</p><button type="button" onClick={() => setFriendsNotice("")}>×</button></div>}
    {friendsTab === "circle" ? circleTab : groupsTab}
  </section>;

  const sectionTitles: Record<Section, [string, string]> = {
    summary: ["Buen día, " + displayName, "Tu plan de hoy y lo que conviene acomodar"],
    score: ["Daily Score", "Cómo se arma el puntaje y qué peso tiene cada área"],
    physical: ["Físico", "Entrenamiento y alimentación, el mismo cuerpo"],
    focus: [focusTab === "study" ? "Estudio" : "Trabajo", focusTab === "study" ? "Materias, foco, tareas y lecturas" : "Proyectos, foco profundo y entregas"],
    sleep: ["Sueño", "Horas de descanso y regularidad"],
    plan: ["Plan", "Lo que querés lograr y cuándo entra en el calendario"],
    stats: ["Estadísticas", "Rachas, tendencias y comparaciones"],
    friends: ["Amigos", "Daily Scores, objetivos compartidos y compromiso mutuo"],
    pro: [isPro ? "AVORA Pro" : "Pasate a Pro", isPro ? "Tu suscripción y todo lo que incluye" : "Lo que cambia cuando la app piensa con vos"],
  };
  const dateHeading = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long" }).format(new Date(today + "T12:00:00")).toUpperCase();

  const onboardingGoalOptions = [
    ["training", "↗", "Entrenamiento", "Mejorar constancia y rendimiento"],
    ["focus", "⌁", "Estudio / Trabajo", "Avanzar con foco y organización"],
    ["nutrition", "◇", "Alimentación", "Comer de acuerdo con mis objetivos"],
    ["reading", "▱", "Lectura", "Leer y recordar más"],
    ["sleep", "☾", "Sueño", "Descansar mejor y con regularidad"],
    ["goals", "◎", "Objetivos", "Cumplir metas concretas"],
  ];
  function goBackFromOnboarding() {
    if (onboardingStep === 2) {
      setOnboardingStep(1);
      return;
    }
    window.location.href = "/signout-with-chatgpt?return_to=/";
  }
  if (!loading && !data.profile.onboardingCompleted) {
    const toggleGoal = (goal: string) => setOnboardingGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : current.length < 3 ? [...current, goal] : current);
    const togglePreference = (preference: string) => setOnboardingPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]);
    return <main className="editorial-onboarding">
      <header className="editorial-onboarding-header"><button type="button" className="lifetrack-brand onboarding-brand-back" onClick={goBackFromOnboarding} aria-label={onboardingStep === 2 ? "Volver al primer paso" : "Volver al inicio de sesión"}><span className="brand-mark"><BrandMark /></span><b>AVORA</b></button><span>Paso {onboardingStep} de 2</span></header>
      <div className="editorial-stepper" aria-label={`Paso ${onboardingStep} de 2`}>
        <div className="active"><span>01</span><b>Perfil</b><i /></div><div className={onboardingStep === 2 ? "active" : ""}><span>02</span><b>Prioridades</b></div>
      </div>
      <section className="editorial-onboarding-body">
        <div className="editorial-story">
          <span className="editorial-number">0{onboardingStep}</span>
          {onboardingStep === 1 ? <><h1>Primero,<br />conocerte.</h1><p>Este nombre aparecerá en tu perfil y en tu experiencia diaria.</p></> : <><h1>Tus<br />prioridades.</h1><p>Elegí entre 1 y 3 áreas para personalizar tu Daily Score.</p></>}
        </div>
        <div className="editorial-form-area">
          {onboardingStep === 1 ? <>
            <label className="editorial-name">¿Cómo te llamás?<input autoFocus value={onboardingName} onChange={(event) => setOnboardingName(event.target.value)} maxLength={60} placeholder="Tu nombre" /></label>
            <label className="editorial-name editorial-username">Elegí un nombre de usuario
              <div className="username-input"><span>@</span><input value={onboardingUsername} onChange={(event) => setOnboardingUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={20} placeholder="tu_usuario" /></div>
              <small className={"username-status " + usernameStatus}>
                {usernameStatus === "checking" ? "Comprobando…"
                  : usernameStatus === "available" ? "✓ Disponible"
                  : usernameStatus === "taken" ? "Ya está en uso, probá con otro"
                  : usernameStatus === "invalid" ? "3 a 20 letras, números o _"
                  : "Con esto te van a poder invitar tus amigos"}
              </small>
            </label>
            <button className="editorial-primary" disabled={onboardingName.trim().length < 2 || usernameStatus !== "available"} onClick={() => setOnboardingStep(2)}>Continuar <span>→</span></button>
            <p className="editorial-note"><span>🔒</span> Podés cambiarlo cuando quieras.</p>
            <button type="button" className="editorial-back onboarding-login-back" onClick={goBackFromOnboarding}>← Volver al inicio de sesión</button>
          </> : <>
            <div className="editorial-priority-heading"><p>TUS PRIORIDADES</p><h2>¿Cuáles son tus prioridades?</h2><small>Elegí entre 1 y 3 áreas. Después podés cambiarlas cuando quieras.</small></div>
            <div className="editorial-goals">{onboardingGoalOptions.map(([value, icon, label, copy]) => <button type="button" aria-pressed={onboardingGoals.includes(value)} className={onboardingGoals.includes(value) ? "selected" : ""} key={value} onClick={() => toggleGoal(value)}><span>{icon}</span><p><b>{label}</b><small>{copy}</small></p><i>{onboardingGoals.includes(value) ? "✓" : "+"}</i></button>)}</div>
            <label className="weekly-consent"><input type="checkbox" checked={onboardingPreferences.includes("weekly")} onChange={() => togglePreference("weekly")} /><span aria-hidden="true">✉</span><p><b>Quiero recibir un resumen semanal de mi progreso</b><small>Podrás desactivarlo cuando quieras desde tu perfil.</small></p></label>
            {error && <div className="error-banner">{error}</div>}
            <div className="editorial-actions">
              <button type="button" className="editorial-back" onClick={() => setOnboardingStep(1)}>← Atrás</button>
              <form action="/api/onboarding" method="post" style={{ display: "contents" }}>
                <input type="hidden" name="displayName" value={onboardingName} />
                <input type="hidden" name="username" value={onboardingUsername} />
                <input type="hidden" name="mainGoals" value={JSON.stringify(onboardingGoals)} />
                <input type="hidden" name="usagePreferences" value={JSON.stringify(onboardingPreferences)} />
                <input type="hidden" name="monthKey" value={monthKey} />
                <button type="submit" className="editorial-primary" disabled={!onboardingGoals.length}>Entrar a AVORA <span>→</span></button>
              </form>
            </div>
          </>}
        </div>
      </section>
    </main>;
  }

  const profileMenuActions = <>
    <p>CUENTA</p>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); openSection("pro"); }}>
      <span aria-hidden="true">★</span>
      Gestionar membresía
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={openSettings}>
      <span aria-hidden="true">⚙</span>
      Configuración
    </button>
    <button type="button" className="profile-menu-item" role="menuitem" onClick={openFeedback}>
      <span aria-hidden="true">♡</span>
      Ayudanos a mejorar AVORA
    </button>
    <a className="profile-menu-signout" href="/signout-with-chatgpt?return_to=/" role="menuitem">
      <span aria-hidden="true">↪</span>
      Cerrar sesión
    </a>
  </>;

  return <main className="app-shell">
    <aside className="sidebar"><button type="button" className="side-brand" onClick={() => openSection("summary")} aria-label="Ir a Inicio"><span className="brand-mark small"><BrandMark /></span><b>AVORA</b></button><nav data-tour="nav">{navItems.map((item) => <button key={item.id} className={"nav-item " + (section === item.id ? "active" : "")} onClick={() => openSection(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="profile-menu" ref={profileMenuRef}>
          {profileMenuOpen && <div className="profile-menu-panel" role="menu" aria-label="Opciones de la cuenta">{profileMenuActions}</div>}
          <button
            type="button"
            className="profile-chip profile-chip-button"
            data-tour="profile"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            {data.profile.avatarUrl ? <Image className="profile-chip-avatar" src={data.profile.avatarUrl} alt="" width={36} height={36} unoptimized /> : <span>{displayName.charAt(0)}</span>}
            <div><b>{displayName}</b><small>{data.profile.username ? "@" + data.profile.username : "Datos guardados"}</small></div>
            <i className="profile-menu-chevron" aria-hidden="true">{profileMenuOpen ? "▾" : "▴"}</i>
          </button>
        </div></aside>
    <section className="dashboard"><header className="topbar"><div><p>{dateHeading}</p><h1>{sectionTitles[section][0]} {section === "summary" && <span>👋</span>}</h1><small className="page-subtitle">{sectionTitles[section][1]}</small></div><div className="topbar-actions"><div className={"save-status " + (saving ? "saving" : "")}><i />{saving ? "Guardando…" : "Todo guardado"}</div><div className="mobile-profile-wrap" ref={mobileProfileRef}><button type="button" className="mobile-profile-button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Abrir menú de cuenta">{data.profile.avatarUrl ? <Image src={data.profile.avatarUrl} alt="" width={42} height={42} unoptimized /> : <span>{initialsFor(data.profile.displayName) || displayName.charAt(0)}</span>}</button>{profileMenuOpen && <div className="profile-menu-panel mobile-profile-panel" role="menu" aria-label="Opciones de la cuenta">{profileMenuActions}</div>}</div></div></header>
      {error && <div className="error-banner">{error}<button onClick={() => setError("")}>Cerrar</button></div>}
      {section === "summary" && <>
        {quotePanel}
        <section className={"hero-row " + (loading ? "is-loading" : "")}>
          <div className="hero-primary-grid">{compactScoreCard}{compactVoiceButton}</div>
          <div className="hero-metrics-head"><small>{balanced ? "Tus seis áreas pesan igual" : `Según tu${topPriorities.length > 1 ? "s" : ""} prioridad${topPriorities.length > 1 ? "es" : ""} del mes: ${listPhrase(priorityNames)}`}</small><button type="button" onClick={() => openSection("score")}>Ajustar →</button></div>
          <div className="hero-metrics" data-tiles={heroMetrics.length} data-tour="metrics">
            {heroMetrics.map((metric) => <button
              type="button"
              className="stat-tile"
              key={metric.label}
              onClick={() => openArea(metric.area)}
            >
              <span className={"stat-icon " + metric.tone}>{metric.icon}</span>
              <p>{metric.label}</p>
              <b>{metric.value}<small> {metric.unit}</small></b>
              <span className="stat-caption">{metric.caption}</span>
            </button>)}
          </div>
        </section>
        <section className="plan-grid">
          {dayPlanPanel}
          {isPro ? insightsPanel : <LockedFeature
            title="Recomendaciones del día"
            note="La app cruza tu sueño, tu agenda y tus rachas para decirte qué mover y a qué hora."
            onOpen={openPro}
          >{insightsPanel}</LockedFeature>}
        </section>
      </>}
      {section === "score" && <section className="score-page">
        <button className="back-link" onClick={() => openSection("summary")}>← Volver a Inicio</button>
        <div className="score-main">{scoreCard}<article className="panel score-explanation"><div className="panel-heading"><div><p>CÓMO SE FORMA</p><h2>Tus factores de hoy</h2></div></div>{([
          ["Entrenamiento", factors.training, priorityDraft.gymWeight, "gym"],
          ["Alimentación", factors.nutrition, priorityDraft.nutritionWeight, "nutrition"],
          ["Sueño", factors.sleep, priorityDraft.sleepWeight, "sleep"],
          ["Estudio / Trabajo", factors.focus, priorityDraft.focusWeight, "focus"],
          ["Lectura", factors.reading, priorityDraft.readingWeight, "reading"],
          ["Objetivos / organización", factors.goals, priorityDraft.goalsWeight, "goals"],
        ] as Array<[string, number, number, string]>).map(([label, value, weight, key]) => <div className="factor-row" key={key}><div><b>{label}</b><small>{priorityLabels[weight]}</small></div><div className="factor-track"><i className={key} style={{ width: String(value) + "%" }} /></div><strong>{value}</strong></div>)}<p className="formula-note">El puntaje combina acciones reales de Entrenamiento, Alimentación, Sueño, Estudio/Trabajo, Lectura y Objetivos. Inicio y Estadísticas muestran esos mismos datos y no se cuentan dos veces.</p></article></div>
        {priorityEditor}
      </section>}
      {section === "physical" && <>
        <div className="period-switch section-switch">
          <button className={physicalTab === "training" ? "active" : ""} onClick={() => setPhysicalTab("training")}>Entrenamiento</button>
          <button className={physicalTab === "meals" ? "active" : ""} onClick={() => setPhysicalTab("meals")}>Alimentación</button>
        </div>
        {physicalTab === "training" ? trainingPanel : <section className="single-section meals-section">
          {mealsPanel}
          {dietQuickPanel}
          {isPro ? dietPlannerPanel : <LockedFeature
            title="Plan de alimentación"
            note="Calculado con tu edad, peso y actividad, y adaptado a tus intolerancias."
            onOpen={openPro}
          >{dietPlannerPanel}</LockedFeature>}
          {calorieCalendarPanel}
        </section>}
      </>}
      {section === "focus" && <>
        <div className="period-switch section-switch">
          <button className={focusTab === "study" ? "active" : ""} onClick={() => setFocusTab("study")}>Estudio</button>
          <button className={focusTab === "work" ? "active" : ""} onClick={() => setFocusTab("work")}>Trabajo</button>
        </div>
        {focusPanel}
        {focusTab === "study" && booksPanel}
      </>}
      {section === "sleep" && sleepPanel}
      {section === "plan" && <>{goalsPanel}{calendarPanel}</>}
      {section === "stats" && statsPanel}
      {section === "friends" && friendsPanel}
      {section === "pro" && proPanel}
    </section>
    <nav className="mobile-nav">{mobileNavItems.map((item) => <button key={item.id} className={[section === item.id ? "active" : "", item.center ? "is-center" : ""].filter(Boolean).join(" ")} onClick={() => openSection(item.id)}><span className="nav-icon">{item.icon}</span>{item.mobile}</button>)}</nav>
    {checkoutDialog}
    {settingsDialog}
    {feedbackDialog}
    {tourActive && section === "summary" && <TourOverlay steps={TOUR_STEPS} onDone={() => setTourActive(false)} />}
    {voiceOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVoiceOpen(false); }}>
      <section className="voice-dialog" role="dialog" aria-modal="true" aria-label="Cierre del día">
        <button className="voice-dialog-close" type="button" onClick={() => setVoiceOpen(false)} aria-label="Cerrar">×</button>
        {dayClosePanel}
        {voiceRecorder}
      </section>
    </div>}
    {bookToDelete && <div className="delete-book-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookToDelete(null); }}><section className="delete-book-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-book-title"><span className="delete-book-icon" aria-hidden="true">⌫</span><p>ELIMINAR DE TU BIBLIOTECA</p><h2 id="delete-book-title">¿Eliminar “{bookToDelete.title}”?</h2><small>También se eliminarán sus páginas registradas y sus notas. Esta acción no se puede deshacer.</small><div><button type="button" className="delete-book-cancel" disabled={saving} onClick={() => setBookToDelete(null)}>Cancelar</button><button type="button" className="delete-book-confirm" disabled={saving} onClick={() => { const bookId = bookToDelete.id; void save({ action: "delete_book", bookId }).then((ok) => { if (ok) { setBookToDelete(null); setSelectedBookId(null); setBookShelfPage(0); setPagesInput(0); setNote(""); } }); }}>{saving ? "Eliminando…" : "Sí, eliminar libro"}</button></div></section></div>}
  </main>;
}

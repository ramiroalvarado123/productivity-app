"use client";

import Image from "next/image";
import { CSSProperties, FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clockFromMinutes, countdownLabel, countdownLabelCapitalized, formatMinutes, listPhrase, minutesFromClock, pluralize } from "./lib/format";
import { quoteForDate } from "./lib/quotes";
import { sparklinePath, streakFor, sumByDate, trendFor, type Trend } from "./lib/streaks";
import { dayBlocks, dayWindow, freeSlots, overlappingBlocks, unscheduledTasks, type Block } from "./lib/schedule";
import { buildInsights, closeInsights, insightHeadline, planInsights, type ComingDay, type InsightAction } from "./lib/insights";
import { dayClose, isReviewDay, weeklyReview } from "./lib/review";
import { dayFactors, scoreFrom, scoreLabel, type DayRecord, type ScoreWeights } from "./lib/score";

type User = { displayName: string; email: string; onboardingCompleted: boolean; mainGoals: string[]; usagePreferences: string[]; isPro: boolean; proSince: string };
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

type NavItem = { id: Section; icon: ReactNode; label: string; mobile: string; center?: true };

const friendsIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.5 19c.5-4 2.4-6 5.5-6s5 2 5.5 6M13 14.5c1-.8 2.1-1.1 3.5-1.1 2.8 0 4.4 1.8 5 5.1" /></svg>;
const physicalIcon = <svg className="physical-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5c1.8-2 2.7-4.4 2.7-7.2V9.8a1.8 1.8 0 0 1 3.6 0v2.1l1.8-5.1a2 2 0 0 1 2.6-1.2l.7.3" /><path d="m15 6 .8-.8a1.9 1.9 0 0 1 2.7.1l.6.7c.6.7.9 1.5.9 2.4v2.1a8.8 8.8 0 0 1-8.8 8.8H7.4c-1.4 0-2.5-.3-3.4.2Z" /><path d="M9.8 14.6c2.1-2.2 5.2-2.6 7.6-.8M10.3 11.9h2.8M15.4 6l1.8 1.9" /></svg>;
const focusIcon = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 5.2a3.4 3.4 0 0 0-5.3 2.9c0 .5.1.9.3 1.3A3.7 3.7 0 0 0 5 16.5a3.5 3.5 0 0 0 4.2 2.3M14.8 5.2a3.4 3.4 0 0 1 5.3 2.9c0 .5-.1.9-.3 1.3a3.7 3.7 0 0 1-.8 7.1 3.5 3.5 0 0 1-4.2 2.3M12 4v16M8 9.2c1.1.1 2 .7 2.4 1.6M16 9.2c-1.1.1-2 .7-2.4 1.6M8.4 15.1c1-.1 1.7-.5 2.2-1.2M15.6 15.1c-1-.1-1.7-.5-2.2-1.2" /></svg>;
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
const kindLabels: Record<Discipline["kind"], string> = { strength: "Fuerza / gimnasio", running: "Running", cycling: "Ciclismo", swimming: "Natación", sport: "Deporte", other: "Otra" };
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
function goalDeadline(today: string, period: GoalPeriod, amount: number, unit: "months" | "years") {
  const date = new Date(today + "T12:00:00");
  if (period === "weekly") date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  if (period === "monthly") date.setMonth(date.getMonth() + 1, 0);
  if (period === "annual") date.setMonth(11, 31);
  if (period === "custom") {
    if (unit === "months") date.setMonth(date.getMonth() + amount);
    else date.setFullYear(date.getFullYear() + amount);
  }
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
function trendDayLabel(date: string, daysAgo: number) {
  if (daysAgo === 0) return "Hoy";
  if (daysAgo === 1) return "Ayer";
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(new Date(date + "T12:00:00"));
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}
function parseClock(value: string, fallbackHour: number, fallbackMinute = 0) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : fallbackHour;
  const minute = match ? Number(match[2]) : fallbackMinute;
  return { hour: hour24 % 12 || 12, minute, period: hour24 >= 12 ? "PM" as const : "AM" as const };
}
function clock24(hour: number, minute: number, period: "AM" | "PM") {
  const hour24 = period === "AM" ? hour % 12 : hour % 12 + 12;
  return String(hour24).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}
function sleepDuration(bedtime: string, wakeTime: string) {
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  let minutes = wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.min(minutes, 24 * 60);
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

export default function ProgressClient({ initialUser, initialError = "" }: { initialUser: User; initialError?: string }) {
  const [today] = useState(argentinaDate);
  const monthKey = today.slice(0, 7);
  const week = useMemo(() => weekFor(today), [today]);
  const [data, setData] = useState<ProgressData>(() => emptyData(initialUser, monthKey));
  const [section, setSection] = useState<Section>("summary");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(initialUser.onboardingCompleted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [onboardingName, setOnboardingName] = useState(initialUser.displayName);
  const [onboardingGoals, setOnboardingGoals] = useState<string[]>([]);
  const [onboardingPreferences, setOnboardingPreferences] = useState<string[]>([]);
  const [priorityDraft, setPriorityDraft] = useState<Priorities>({ monthKey, gymWeight: 2, nutritionWeight: 2, readingWeight: 2, sleepWeight: 2, focusWeight: 2, goalsWeight: 2 });
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [trainingDate, setTrainingDate] = useState(today);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("weekly");
  const [calendarCursor, setCalendarCursor] = useState(today.slice(0, 7));
  const [physicalTab, setPhysicalTab] = useState<PhysicalTab>("training");
  const [focusTab, setFocusTab] = useState<FocusTab>("study");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"monthly" | "annual">("annual");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "processing" | "done">("form");
  const [friendsNotice, setFriendsNotice] = useState("");
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
  const [mealForm, setMealForm] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [mealPhoto, setMealPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [dietForm, setDietForm] = useState<DietForm>({ age: 25, sex: "unspecified", heightCm: 175, currentWeightKg: 75, targetWeightKg: 70, activityLevel: "light", goalPace: "gentle", preferences: "", details: "" });
  const [dietGenerating, setDietGenerating] = useState(false);
  const [generatedDietPlan, setGeneratedDietPlan] = useState<DietPlanContent | null>(null);
  const [dietRecording, setDietRecording] = useState(false);
  const [dietVoiceLoading, setDietVoiceLoading] = useState(false);
  const [sleepBedHour, setSleepBedHour] = useState(11);
  const [sleepBedMinute, setSleepBedMinute] = useState(0);
  const [sleepBedPeriod, setSleepBedPeriod] = useState<"AM" | "PM">("PM");
  const [sleepWakeHour, setSleepWakeHour] = useState(7);
  const [sleepWakeMinute, setSleepWakeMinute] = useState(0);
  const [sleepWakePeriod, setSleepWakePeriod] = useState<"AM" | "PM">("AM");
  const [focusAmount, setFocusAmount] = useState(60);
  const [focusUnit, setFocusUnit] = useState<"minutes" | "hours">("minutes");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("weekly");
  const [customLength, setCustomLength] = useState(4);
  const [customUnit, setCustomUnit] = useState<"months" | "years">("months");
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
        dietHydratedRef.current = true;
      }
      if (next.dailyCheckin && !sleepHydratedRef.current) {
        const bedtime = parseClock(next.dailyCheckin.bedtime, 23);
        const wakeTime = parseClock(next.dailyCheckin.wakeTime, 7);
        setSleepBedHour(bedtime.hour); setSleepBedMinute(bedtime.minute); setSleepBedPeriod(bedtime.period);
        setSleepWakeHour(wakeTime.hour); setSleepWakeMinute(wakeTime.minute); setSleepWakePeriod(wakeTime.period);
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

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      await loadData();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const uniqueFocusSessions = useMemo(
    () => data.focusSessions.filter((item, index, rows) => rows.findIndex((candidate) => candidate.projectId === item.projectId && candidate.sessionDate === item.sessionDate) === index),
    [data.focusSessions],
  );

  // Series por fecha. Alimentan las tendencias de Estadísticas y también el
  // Daily Score, para que el puntaje de hoy y el del histórico salgan del
  // mismo lugar y nunca se contradigan entre pantallas.
  const trainingByDate = sumByDate(data.trainingLogs, (row) => row.trainingDate, () => 1);
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
  // Con más de tres áreas empatadas arriba ya no hay foco: enumerarlas cinco
  // por cinco no dice nada y llena la tarjeta de texto.
  const balanced = topPriorities.length > 3;
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
  const booksInTab = data.books.filter((book) => book.status === bookTab);
  const bookShelfPageCount = Math.max(1, Math.ceil(booksInTab.length / 3));
  const visibleBookShelfPage = Math.min(bookShelfPage, bookShelfPageCount - 1);
  const visibleBooks = booksInTab.slice(visibleBookShelfPage * 3, visibleBookShelfPage * 3 + 3);
  const selectedBook = booksInTab.find((book) => book.id === selectedBookId) ?? booksInTab[0] ?? null;
  const selectedReadingLog = selectedBook ? data.readingLogs.find((log) => log.bookId === selectedBook.id) : undefined;
  const savedDietPlan = useMemo(() => parseDietPlan(data.dietPlan?.planJson), [data.dietPlan?.planJson]);
  const displayedDietPlan = generatedDietPlan ?? savedDietPlan;
  const dietTargetCalories = generatedDietPlan?.targetCalories ?? data.dietPlan?.targetCalories ?? 0;
  const bedtimeValue = clock24(sleepBedHour, sleepBedMinute, sleepBedPeriod);
  const wakeTimeValue = clock24(sleepWakeHour, sleepWakeMinute, sleepWakePeriod);
  const calculatedSleepMinutes = sleepDuration(bedtimeValue, wakeTimeValue);

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

  // Rachas: días consecutivos con actividad en cada área.
  const trainingDates = useMemo(() => new Set(data.trainingLogs.map((item) => item.trainingDate)), [data.trainingLogs]);
  const readingDates = useMemo(() => new Set(data.readingHistory.filter((item) => item.pages > 0).map((item) => item.logDate)), [data.readingHistory]);
  const focusDates = useMemo(() => new Set(uniqueFocusSessions.map((item) => item.sessionDate)), [uniqueFocusSessions]);
  const goodSleepDates = useMemo(() => new Set(data.dailyCheckins.filter((item) => item.sleepMinutes >= 420).map((item) => item.entryDate)), [data.dailyCheckins]);
  const loggingDates = useMemo(() => new Set([...data.mealHistory.map((item) => item.mealDate), ...data.dailyCheckins.map((item) => item.entryDate)]), [data.mealHistory, data.dailyCheckins]);
  const streaks = useMemo(() => ({
    training: streakFor(trainingDates, today),
    reading: streakFor(readingDates, today),
    focus: streakFor(focusDates, today),
    sleep: streakFor(goodSleepDates, today),
    logging: streakFor(loggingDates, today),
  }), [trainingDates, readingDates, focusDates, goodSleepDates, loggingDates, today]);

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
      caption: streaks.training.current ? pluralize(streaks.training.current, "día seguido", "días seguidos") : `${data.disciplines.length} disciplinas`,
    },
    focusWeight: {
      icon: "⌁", tone: "coral", label: "FOCO HOY", area: "focus",
      value: (focusToday / 60).toFixed(focusToday % 60 ? 1 : 0), unit: "h",
      caption: `${focusToday} minutos`,
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
  // Inicio muestra exactamente tus prioridades: si elegiste dos áreas ves dos
  // bloques a mitad de ancho cada uno, si elegiste cuatro ves cuatro en
  // cuartos. Cuando las seis pesan lo mismo no hay prioridad que respetar, así
  // que caemos a las tres primeras en el orden de siempre.
  const priorityMetricKeys = metricOrder.filter((key) => priorityDraft[key as keyof Omit<Priorities, "monthKey">] === highestPriority);
  const heroMetrics = (balanced ? metricOrder.slice(0, 3) : priorityMetricKeys.slice(0, 4)).map((key) => areaMetrics[key]);

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
      <div><span>⌁</span><p><b>Estudio / trabajo</b><small>{voiceResult.study.minutes ? voiceResult.study.minutes + " min · " : ""}{voiceResult.study.detail || "Sin dato"}</small></p></div>
      <div><span>☾</span><p><b>Sueño</b><small>{voiceResult.sleep.minutes ? Math.round(voiceResult.sleep.minutes / 6) / 10 + " horas" : "Sin dato"}</small></p></div>
      <div><span>▱</span><p><b>Lectura</b><small>{voiceResult.reading.bookTitle || "Libro actual"} · {voiceResult.reading.pages} páginas</small></p></div>
      <div><span>✎</span><p><b>Reflexión</b><small>{voiceResult.journal || "Sin reflexión"}</small></p></div>
    </div><details><summary>Ver transcripción</summary><p>{voiceResult.transcript}</p></details><div className="voice-review-actions"><button className="discard-voice" onClick={() => setVoiceResult(null)}>Descartar</button><button className="confirm-voice" disabled={saving} onClick={() => void applyVoiceCheckin()}>Confirmar y guardar</button></div></div>}
  </article>;

  const trainingPanel = <section className="module-stack">
    <article className="panel section-panel">
      <div className="panel-heading"><div><p>TUS DISCIPLINAS</p><h2>Un calendario para cada actividad</h2></div><span className="week-pill">{data.trainingLogs.filter((log) => log.trainingDate >= week[0].iso).length} sesiones esta semana</span></div>
      <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_discipline", name: form.get("name"), kind: form.get("kind") }); }}>
        <input name="name" required placeholder="Nueva disciplina: pádel, fútbol…" />
        <select name="kind" defaultValue="other"><option value="strength">Fuerza / gimnasio</option><option value="running">Running</option><option value="cycling">Ciclismo</option><option value="swimming">Natación</option><option value="sport">Deporte</option><option value="other">Otra</option></select>
        <button disabled={saving}>＋ Agregar</button>
      </form>
      <div className="discipline-list">{data.disciplines.map((discipline) => {
        const dates = data.trainingLogs.filter((log) => log.disciplineId === discipline.id && log.trainingDate >= week[0].iso && log.trainingDate <= week[6].iso).map((log) => log.trainingDate);
        return <div className={"discipline-card " + (selectedDiscipline?.id === discipline.id ? "selected" : "")} key={discipline.id}>
          <button className="discipline-title" onClick={() => setSelectedDisciplineId(discipline.id)}><span>{discipline.kind === "strength" ? "🏋" : discipline.kind === "running" ? "🏃" : discipline.kind === "cycling" ? "🚴" : discipline.kind === "swimming" ? "🏊" : "●"}</span><p><b>{discipline.name}</b><small>{kindLabels[discipline.kind]}</small></p><strong>{dates.length}/7</strong></button>
          <div className="week-row">{week.map((day) => {
            const done = dates.includes(day.iso);
            return <button key={day.iso} className={(done ? "done " : "") + (day.iso === today ? "today" : "")} disabled={saving} onClick={() => void save({ action: "toggle_training", disciplineId: discipline.id, date: day.iso })}><small>{day.short}</small><b>{done ? "✓" : day.number}</b>{day.iso === today && <i />}</button>;
          })}</div>
        </div>;
      })}</div>
    </article>
    {selectedDiscipline && <div className={"training-detail-grid " + (selectedDiscipline.kind === "strength" ? "strength-session" : "single-session")}>
      <article className="panel">
        <div className="panel-heading"><div><p>{selectedDiscipline.kind === "strength" ? "SESIÓN DE GIMNASIO" : selectedDiscipline.kind === "running" ? "SESIÓN DE RUNNING" : "DETALLE DE SESIÓN"}</p><h2>{selectedDiscipline.name}</h2></div><input className="date-control" type="date" value={trainingDate} onChange={(event) => setTrainingDate(event.target.value)} /></div>
        <form key={`${selectedDiscipline.id}-${trainingDate}`} className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "save_training", disciplineId: selectedDiscipline.id, date: trainingDate, durationMinutes: form.get("durationMinutes"), distanceKm: form.get("distanceKm"), notes: form.get("notes") }); }}>
          <div className={selectedDiscipline.kind === "running" || selectedDiscipline.kind === "cycling" || selectedDiscipline.kind === "swimming" ? "two-fields" : ""}>
            <label>Duración (min)<input name="durationMinutes" type="number" min="0" defaultValue={selectedTrainingLog?.durationMinutes || ""} /></label>
            {(selectedDiscipline.kind === "running" || selectedDiscipline.kind === "cycling" || selectedDiscipline.kind === "swimming") && <label>Distancia (km)<input name="distanceKm" type="number" min="0" step=".01" defaultValue={selectedTrainingLog?.distanceMeters ? selectedTrainingLog.distanceMeters / 1000 : ""} /></label>}
          </div>
          <label>Notas<textarea name="notes" defaultValue={selectedTrainingLog?.notes || ""} placeholder={selectedDiscipline.kind === "strength" ? "Rutina, sensaciones, técnica…" : selectedDiscipline.kind === "running" ? "Ritmo, sensaciones, recorrido…" : "Sensaciones y detalle de la sesión…"} /></label>
          <button className="primary-action" disabled={saving}>Guardar sesión</button>
        </form>
      </article>
      {selectedDiscipline.kind === "strength" && <article className="panel">
        <div className="panel-heading"><div><p>PESOS Y REPETICIONES</p><h2>Ejercicios</h2></div><span className="week-pill">{selectedExercises.length} cargados</span></div>
        <form className="exercise-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_exercise", disciplineId: selectedDiscipline.id, date: trainingDate, exercise: form.get("exercise"), weightKg: form.get("weightKg"), sets: form.get("sets"), reps: form.get("reps"), isRecord: form.get("isRecord") === "on" }); }}>
          <input name="exercise" required placeholder="Ejercicio (ej. sentadilla)" />
          <div className="three-fields"><label>Kg<input name="weightKg" type="number" min="0" step=".1" /></label><label>Series<input name="sets" type="number" min="0" /></label><label>Reps<input name="reps" type="number" min="0" /></label></div>
          <label className="check-label"><input name="isRecord" type="checkbox" /> Es un récord personal</label>
          <button className="primary-action" disabled={saving}>Agregar ejercicio</button>
        </form>
        <div className="record-list">{selectedExercises.map((item) => <div key={item.id}><span>{item.isRecord ? "🏆" : "↗"}</span><p><b>{item.exercise}</b><small>{item.weightDeciKg / 10} kg · {item.sets} × {item.reps}</small></p><button onClick={() => void save({ action: "delete_exercise", id: item.id })}>×</button></div>)}</div>
      </article>}
    </div>}
  </section>;

  const sleepPanel = <section className="module-stack sleep-page">
    <div className="split-grid">
      <article className="panel"><div className="panel-heading"><div><p>DESCANSO DE HOY</p><h2>Registrar sueño</h2></div><span className="sleep-icon">☾</span></div>
        <form className="data-form sleep-form" onSubmit={(event) => void submitForm(event, { action: "save_sleep", date: today, sleepMinutes: calculatedSleepMinutes, bedtime: bedtimeValue, wakeTime: wakeTimeValue })}>
          <div className="sleep-duration-badge"><span>TIEMPO CALCULADO</span><b>{Math.floor(calculatedSleepMinutes / 60)} h {calculatedSleepMinutes % 60 ? calculatedSleepMinutes % 60 + " min" : ""}</b><small>Entre la hora de acostarte y la de despertarte</small></div>
          <div className="sleep-time-grid">
            <div className="time-picker-card"><span className="time-symbol">☾</span><div><label>Me acosté</label><div className="time-selects"><select aria-label="Hora de acostarse" value={sleepBedHour} onChange={(event) => setSleepBedHour(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>)}</select><i>:</i><select aria-label="Minutos de acostarse" value={sleepBedMinute} onChange={(event) => setSleepBedMinute(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index * 5).map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, "0")}</option>)}</select><select aria-label="Período de acostarse" value={sleepBedPeriod} onChange={(event) => setSleepBedPeriod(event.target.value as "AM" | "PM")}><option>AM</option><option>PM</option></select></div></div></div>
            <div className="time-picker-card wake"><span className="time-symbol">☀</span><div><label>Me desperté</label><div className="time-selects"><select aria-label="Hora de despertarse" value={sleepWakeHour} onChange={(event) => setSleepWakeHour(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>)}</select><i>:</i><select aria-label="Minutos de despertarse" value={sleepWakeMinute} onChange={(event) => setSleepWakeMinute(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index * 5).map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, "0")}</option>)}</select><select aria-label="Período de despertarse" value={sleepWakePeriod} onChange={(event) => setSleepWakePeriod(event.target.value as "AM" | "PM")}><option>AM</option><option>PM</option></select></div></div></div>
          </div>
          <p className="sleep-form-note">Podés ajustar los minutos de a cinco. El reloj inteligente permitirá distinguir tiempo en cama de tiempo realmente dormido.</p>
          <button className="primary-action" disabled={saving}>Guardar descanso</button>
        </form>
      </article>
      <article className="panel sleep-summary"><div className="panel-heading"><div><p>ÚLTIMOS 7 DÍAS</p><h2>Regularidad</h2></div></div>
        <div className="sleep-bars">{week.map((day) => { const minutes = data.dailyCheckins.find((item) => item.entryDate === day.iso)?.sleepMinutes ?? 0; return <div key={day.iso}><span><i style={{ height: String(Math.min(100, minutes / 600 * 100)) + "%" }} /></span><b>{minutes ? Math.round(minutes / 6) / 10 : "—"}</b><small>{day.short}</small></div>; })}</div>
        <p className="soft-note">Objetivo visual de referencia: 8 horas. Cada persona puede necesitar un rango diferente.</p>
      </article>
    </div>
    <article className="panel wearable-panel"><div className="wearable-copy"><span className="wearable-icon">⌚</span><div><p>DISPOSITIVO DE SALUD</p><h2>Importar el sueño desde tu reloj</h2><small>Al conectarlo podremos traer duración real, etapas del sueño, frecuencia cardíaca, oxígeno y regularidad, según lo que admita tu dispositivo.</small></div></div><div className="wearable-actions"><div className="wearable-badges"><span>Apple Health</span><span>Health Connect</span><span>Garmin</span></div><button type="button" disabled>Elegir dispositivo · próximo paso</button></div></article>
  </section>;

  const focusProjectsInTab = data.focusProjects.filter((project) => project.kind === focusTab);
  const focusProjectIds = new Set(focusProjectsInTab.map((project) => project.id));
  const focusSessionsInTab = uniqueFocusSessions.filter((session) => focusProjectIds.has(session.projectId));
  // Las tareas sin proyecto se muestran en las dos vistas: no pertenecen a
  // ninguna de las dos y esconderlas en ambas sería peor.
  const tasksInTab = data.tasks.filter((task) => !task.projectId || focusProjectIds.has(task.projectId));
  const focusTodayInTab = focusSessionsInTab.filter((item) => item.sessionDate === today).reduce((sum, item) => sum + item.minutes, 0);
  const focusWeekInTab = focusSessionsInTab.filter((item) => item.sessionDate >= week[0].iso).reduce((sum, item) => sum + item.minutes, 0);

  const focusPanel = <section className="module-stack">
      <article className="panel focus-workspace"><div className="panel-heading"><div><p>ÁREAS DE FOCO</p><h2>{focusTab === "study" ? "Materias" : "Proyectos"}</h2></div><span className="week-pill">{focusProjectsInTab.length} {focusTab === "study" ? "materias" : "proyectos"}</span></div>
        <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_focus_project", name: form.get("name"), kind: focusTab }); }}><input name="name" required placeholder={focusTab === "study" ? "Ej. Física, Anatomía…" : "Ej. Proyecto web, Cliente…"} /><button>＋ Agregar</button></form>
        <div className="focus-project-grid">{focusProjectsInTab.map((project) => { const todayMinutes = focusSessionsInTab.filter((session) => session.projectId === project.id && session.sessionDate === today).reduce((sum, session) => sum + session.minutes, 0); const weekMinutes = focusSessionsInTab.filter((session) => session.projectId === project.id && session.sessionDate >= week[0].iso).reduce((sum, session) => sum + session.minutes, 0); return <article className={"focus-project-card " + project.kind} key={project.id}><span>{project.kind === "study" ? "📘" : "💼"}</span><div><small>{project.kind === "study" ? "MATERIA" : "PROYECTO"}</small><b>{project.name}</b></div><p><strong>{todayMinutes ? (todayMinutes / 60).toFixed(todayMinutes % 60 ? 1 : 0) + " h" : "—"}</strong><small>hoy</small></p><p><strong>{weekMinutes ? (weekMinutes / 60).toFixed(weekMinutes % 60 ? 1 : 0) + " h" : "—"}</strong><small>semana</small></p></article>; })}{!focusProjectsInTab.length && <div className="inline-empty focus-empty"><span>＋</span><p><b>Agregá tu primera materia o proyecto</b><small>Van a aparecer juntos en este tablero.</small></p></div>}</div>
        {focusProjectsInTab.length > 0 && <form className="data-form focus-session-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const minutes = focusUnit === "hours" ? Math.round(focusAmount * 60) : Math.round(focusAmount); void save({ action: "add_focus_session", projectId: form.get("projectId"), date: today, minutes, note: form.get("note") }); }}>
          <label>{focusTab === "study" ? "Materia" : "Proyecto"}<select name="projectId">{focusProjectsInTab.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Trabajo profundo<div className="focus-duration-control"><input type="number" min={focusUnit === "hours" ? .25 : 1} max={focusUnit === "hours" ? 24 : 1440} step={focusUnit === "hours" ? .25 : 1} value={focusAmount} onChange={(event) => setFocusAmount(Number(event.target.value) || 0)} required /><select value={focusUnit} onChange={(event) => setFocusUnit(event.target.value as "minutes" | "hours")}><option value="minutes">minutos</option><option value="hours">horas</option></select></div><small className="field-help">Se guardará como {focusUnit === "hours" ? Math.round(focusAmount * 60) : Math.round(focusAmount)} minutos para calcular las estadísticas.</small></label>
          <label>Qué avanzaste<input name="note" placeholder="Tema, entrega o avance…" /></label>
          <button className="primary-action">Guardar bloque de foco</button>
        </form>}
      </article>
    <article className="panel weekly-focus"><div><p>{focusTab === "study" ? "ESTUDIO DE HOY" : "TRABAJO DE HOY"}</p><b>{(focusTodayInTab / 60).toFixed(focusTodayInTab % 60 ? 1 : 0)} h</b><small>{focusTodayInTab} minutos de trabajo profundo</small></div><div><p>ESTA SEMANA</p><b>{(focusWeekInTab / 60).toFixed(1)} h</b><small>calculadas desde minutos reales</small></div><button onClick={() => openSection("plan")}>Crear objetivo semanal →</button></article>
      <article className="panel focus-tasks-panel"><div className="panel-heading"><div><p>TAREAS</p><h2>Próximos pasos</h2></div><span className="week-pill">{tasksInTab.filter((item) => item.completedAt).length}/{tasksInTab.length} hechas</span></div>
        <form className="task-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_task", title: form.get("title"), projectId: form.get("projectId"), dueDate: form.get("dueDate"), startTime: form.get("startTime"), durationMinutes: form.get("durationMinutes") }); }}><input name="title" required placeholder="Nueva tarea…" /><select name="projectId"><option value="">Sin proyecto</option>{focusProjectsInTab.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input name="dueDate" type="date" defaultValue={today} /><input name="startTime" type="time" aria-label="Hora de inicio" /><select name="durationMinutes" defaultValue="60" aria-label="Duración">{[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)}</option>)}</select><button>＋</button></form>
        <div className="task-list compact-task-list">{tasksInTab.map((task) => { const done = taskDone(task.id, Boolean(task.completedAt)); return <div className={done ? "completed" : ""} key={task.id}><button className="task-check" aria-pressed={done} onClick={() => void toggleTask(task.id, !done)}>{done ? "✓" : ""}</button><p><b>{task.title}</b><small>{task.dueDate ? formatDate(task.dueDate) : "Sin fecha"}{task.startTime ? ` · ${task.startTime}${task.durationMinutes ? " (" + formatMinutes(task.durationMinutes) + ")" : ""}` : task.dueDate ? " · sin horario" : ""}{task.projectId ? " · " + (data.focusProjects.find((item) => item.id === task.projectId)?.name || "") : ""}</small></p><button className="row-delete" onClick={() => void save({ action: "delete_task", id: task.id })}>×</button></div>; })}{!tasksInTab.length && <div className="inline-empty"><span>✓</span><p><b>No hay tareas pendientes</b><small>Usá la fila de arriba para crear una.</small></p></div>}</div>
      </article>
  </section>;

  const calendarStart = new Date(calendarCursor + "-01T12:00:00");
  const calendarMonthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(calendarStart);
  const calendarOffset = (calendarStart.getDay() + 6) % 7;
  const calendarDays = new Date(calendarStart.getFullYear(), calendarStart.getMonth() + 1, 0).getDate();
  const shiftCalendar = (amount: number) => {
    const next = new Date(calendarStart);
    next.setMonth(next.getMonth() + amount);
    setCalendarCursor(next.toISOString().slice(0, 7));
  };
  const calendarItems = [
    ...data.events.map((item) => ({ key: "e" + item.id, date: item.eventDate, title: item.title, type: item.category, id: item.id, source: "event" })),
    ...data.tasks.filter((item) => item.dueDate).map((item) => ({ key: "t" + item.id, date: item.dueDate as string, title: item.title, type: "task", id: item.id, source: "task" })),
    ...activeGoals.map((item) => ({ key: "g" + item.id, date: item.targetDate, title: item.title, type: "goal", id: item.id, source: "goal" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = calendarItems.filter((item) => item.date >= today).slice(0, 8);
  // ---------------------------------------------------------------------------
  // Plan del día
  // ---------------------------------------------------------------------------
  const blockCategoryLabel: Record<string, string> = {
    task: "Tarea", study: "Estudio", work: "Trabajo", personal: "Personal",
    training: "Entrenamiento", health: "Salud", other: "Otro",
  };
  const currentBlock = todayBlocks.find((block) => !block.done && block.start <= nowMinutes && block.end > nowMinutes);
  const nextBlock = todayBlocks.find((block) => !block.done && block.start > nowMinutes);

  const dayPlanPanel = <article className="panel day-plan">
    <div className="panel-heading">
      <div><p>PLAN DEL DÍA</p><h2>{todayBlocks.length ? "Tu día, hora por hora" : "Todavía no armaste el día"}</h2></div>
      <div className="day-plan-actions">
        <button className="text-link" onClick={() => { setAgendaView("week"); openSection("plan"); }}>Ver la semana →</button>
      </div>
    </div>
    {todayBlocks.length ? <>
      <div className="day-now">
        {currentBlock
          ? <p><i className="live" /><b>Ahora: {currentBlock.title}</b><small>hasta las {clockFromMinutes(currentBlock.end)}</small></p>
          : nextBlock
            ? <p><i /><b>Lo próximo: {nextBlock.title}</b><small>a las {clockFromMinutes(nextBlock.start)}</small></p>
            : <p><i /><b>No queda nada agendado</b><small>el resto del día es tuyo</small></p>}
      </div>
      <ol className="day-timeline">
        {todayBlocks.map((block) => {
          const done = block.taskId ? taskDone(block.taskId, block.done) : block.done;
          const past = block.end <= nowMinutes;
          const live = block.start <= nowMinutes && block.end > nowMinutes;
          const classes = ["day-block", done ? "done" : "", past ? "past" : "", live ? "live" : ""].filter(Boolean).join(" ");
          // Para una tarea, toda la fila es el botón: en el celular apuntarle a
          // un cuadradito de 26 px era la mitad de los toques fallados.
          return <li key={block.key} className={classes}>
            {block.taskId ? <button
              type="button"
              className="day-block-hit"
              aria-pressed={done}
              aria-label={`${block.title}, ${clockFromMinutes(block.start)}. ${done ? "Marcar como pendiente" : "Marcar como hecha"}.`}
              onClick={() => void toggleTask(block.taskId as number, !done)}
            >
              <span className="block-time">{clockFromMinutes(block.start)}<small>{formatMinutes(block.minutes)}</small></span>
              <span className={"block-body " + block.category}>
                <b>{block.title}</b>
                <small>{[blockCategoryLabel[block.category] ?? "Bloque", block.detail].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="block-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.6 3.6L15.5 6.7" /></svg></span>
            </button> : <div className="day-block-hit is-event">
              <span className="block-time">{clockFromMinutes(block.start)}<small>{formatMinutes(block.minutes)}</small></span>
              <span className={"block-body " + block.category}>
                <b>{block.title}</b>
                <small>{[blockCategoryLabel[block.category] ?? "Bloque", block.detail].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="block-check block-check-event" aria-hidden="true" title="Evento del calendario">◇</span>
            </div>}
          </li>;
        })}
      </ol>
    </> : <div className="inline-empty tall">
      <span>◷</span>
      <p><b>Sin bloques para hoy</b><small>Poné una hora a tus tareas y aparecen acá, ordenadas.</small></p>
    </div>}
    {todayUnscheduled.length > 0 && <div className="unscheduled-strip">
      <p>{pluralize(todayUnscheduled.length, "tarea sin horario", "tareas sin horario")}</p>
      <div>{todayUnscheduled.slice(0, 4).map((task) => <span key={task.id}>{task.title}</span>)}</div>
      <button className="text-link" onClick={() => openSection("focus")}>Organizarlas →</button>
    </div>}
    {todaySlots.length > 0 && <p className="slot-hint">
      Huecos libres: {todaySlots.slice(0, 3).map((slot) => `${clockFromMinutes(slot.start)}–${clockFromMinutes(slot.end)}`).join(" · ")}
    </p>}
  </article>;

  const insightsPanel = <article className="panel insights-panel">
    <div className="panel-heading">
      <div><p>LO QUE VEO EN TUS DATOS</p><h2>{insightHeadline(planNotices, score, balanced ? [] : priorityNames)}</h2></div>
    </div>
    {planNotices.length ? <div className="insight-list">
      {planNotices.map((insight) => <article key={insight.id} className={"insight " + insight.tone}>
        <span className="insight-icon">{insight.icon}</span>
        <div className="insight-copy">
          <b>{insight.title}</b>
          <p>{insight.body}</p>
          <details><summary>Por qué aparece esto</summary><p>{insight.because}</p></details>
        </div>
        {insight.action && <button className="insight-action" disabled={saving} onClick={() => void applyInsightAction(insight.action as InsightAction)}>{insight.action.label}</button>}
      </article>)}
    </div> : <div className="inline-empty">
      <span>✓</span>
      <p><b>Nada que corregir</b><small>Cuando el sueño, la agenda o las rachas se crucen mal, te aviso acá.</small></p>
    </div>}
  </article>;

  // ---------------------------------------------------------------------------
  // Los dos cortes: el del día y, los domingos, el de la semana.
  // ---------------------------------------------------------------------------
  const close = dayClose({
    score,
    blocks: todayBlocks,
    trained: trainedToday,
    sleepMinutes: sleepToday,
    focusMinutes: focusToday,
    pages: pagesToday,
    meals: data.meals.length,
    calories,
  });

  const dayClosePanel = <article className="panel day-close">
    <div className="panel-heading">
      <div><p>{nowMinutes >= 18 * 60 ? "CIERRE DEL DÍA" : "CÓMO VIENE EL DÍA"}</p><h2>{close.headline}</h2></div>
      {close.blocksTotal > 0 && <span className="week-pill">{close.blocksDone} de {close.blocksTotal} bloques</span>}
    </div>
    {close.done.length > 0 && <p className="day-close-done">{close.done.join(" · ")}</p>}
    {close.pending.length > 0 && <p className="day-close-pending">Quedó sin cerrar: {listPhrase(close.pending)}.</p>}
    {closeNotices.length > 0 && <div className="day-close-notes">
      {closeNotices.map((notice) => <div key={notice.id}>
        <span aria-hidden="true">{notice.icon}</span>
        <p><b>{notice.title}</b><small>{notice.body}</small></p>
      </div>)}
    </div>}
    {close.done.length === 0 && close.pending.length === 0 && closeNotices.length === 0 && <p className="day-close-done">Cuando registres algo, el balance del día aparece acá.</p>}
  </article>;

  // El corte semanal sólo se arma el domingo: el resto de la semana no hay nada
  // cerrado que mirar y ocuparía lugar por nada.
  const review = isReviewDay(today) ? weeklyReview({
    days: Array.from({ length: 7 }, (_, index) => {
      const date = dateMinus(today, 6 - index);
      return { date, blocks: dayBlocks(scheduleInput, date), score: scoreForDate(date) };
    }),
    areas: [
      { label: "Entrenamiento", activeDays: countActiveDays(trainingByDate, today) },
      { label: "Foco", activeDays: countActiveDays(focusByDate, today) },
      { label: "Lectura", activeDays: countActiveDays(readingByDate, today) },
      { label: "Alimentación", activeDays: countActiveDays(mealCountByDate, today) },
      { label: "Sueño", activeDays: countActiveDays(sleepMinutesByDate, today) },
    ],
    staleGoals: data.goals
      .filter((goal) => !goal.completedAt && !activeCategories.has(goal.category))
      .map((goal) => ({ id: goal.id, title: goal.title, days: dayDistance(today, goal.targetDate) })),
  }) : null;

  const weeklyReviewPanel = review && <article className="panel weekly-review">
    <div className="panel-heading">
      <div><p>DOMINGO</p><h2>Tu semana</h2></div>
      <span className="week-pill">Promedio {review.averageScore}/100</span>
    </div>
    <div className="review-stats">
      <div><b>{review.blocksTotal ? `${review.blocksDone} de ${review.blocksTotal}` : "—"}</b><small>{review.blocksTotal ? `bloques cumplidos · ${review.completionPercent} %` : "no agendaste bloques"}</small></div>
      <div><b>{review.bestDay ? formatDate(review.bestDay.date) : "—"}</b><small>{review.bestDay ? `tu mejor día · ${review.bestDay.score}/100` : "sin registros esta semana"}</small></div>
      <div><b>{review.quietAreas.length ? listPhrase(review.quietAreas) : "Ninguna"}</b><small>{review.quietAreas.length ? "sin registros en toda la semana" : "todas las áreas tuvieron movimiento"}</small></div>
    </div>
    {review.staleGoals.length > 0 && <div className="review-goals">
      <p>OBJETIVOS SIN MOVIMIENTO</p>
      {review.staleGoals.map((goal) => <div key={goal.id}>
        <p><b>{goal.title}</b><small>{countdownLabelCapitalized(goal.days)} · sin actividad en su área</small></p>
        <button disabled={saving} onClick={() => void save({ action: "toggle_goal", id: goal.id, completed: true })}>Cerrarlo</button>
        <button className="ghost" disabled={saving} onClick={() => openSection("plan")}>Sigue en pie</button>
      </div>)}
    </div>}
  </article>;

  const quotePanel = <aside className="quote-strip">
    <span className="quote-mark" aria-hidden="true">“</span>
    <p>{quote.text}</p>
    <b>{quote.author}</b>
  </aside>;

  // ---------------------------------------------------------------------------
  // Agenda semanal por horas
  // ---------------------------------------------------------------------------
  const agendaWeek = useMemo(() => weekFor(weekAnchor), [weekAnchor]);
  const agendaBlocksByDay = useMemo(
    () => Object.fromEntries(agendaWeek.map((day) => [day.iso, dayBlocks(scheduleInput, day.iso)])) as Record<string, Block[]>,
    [agendaWeek, scheduleInput],
  );
  const agendaAllBlocks = useMemo(() => Object.values(agendaBlocksByDay).flat(), [agendaBlocksByDay]);
  const agendaStartHour = Math.floor(Math.min(todayWindow.start, ...agendaAllBlocks.map((block) => block.start), 8 * 60) / 60);
  const agendaEndHour = Math.ceil(Math.max(todayWindow.end, ...agendaAllBlocks.map((block) => block.end), 21 * 60) / 60);
  const agendaHours = Array.from({ length: Math.max(1, agendaEndHour - agendaStartHour) }, (_, index) => agendaStartHour + index);
  const shiftWeek = (amount: number) => setWeekAnchor((current) => dateMinus(current, -amount * 7));

  const weekAgendaPanel = <article className="panel week-agenda">
    <div className="agenda-head">
      <button onClick={() => shiftWeek(-1)} aria-label="Semana anterior">‹</button>
      <div><p>ZOOM DE LA SEMANA</p><h2>{formatDate(agendaWeek[0].iso)} — {formatDate(agendaWeek[6].iso)}</h2></div>
      <button onClick={() => shiftWeek(1)} aria-label="Semana siguiente">›</button>
    </div>
    <div className="agenda-scroll">
      <div className="agenda-grid" style={{ "--hours": String(agendaHours.length) } as CSSProperties}>
        <div className="agenda-corner" />
        {agendaWeek.map((day) => <div className={"agenda-day-head " + (day.iso === today ? "today" : "")} key={day.iso}>
          <small>{day.short}</small><b>{day.number}</b>
        </div>)}
        <div className="agenda-hours">
          {agendaHours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
        </div>
        {agendaWeek.map((day) => {
          const blocks = agendaBlocksByDay[day.iso] ?? [];
          return <div className={"agenda-column " + (day.iso === today ? "today" : "")} key={day.iso}>
            {agendaHours.map((hour) => <button
              key={hour}
              className="agenda-slot"
              aria-label={`Agregar un bloque el ${formatDate(day.iso)} a las ${String(hour).padStart(2, "0")}:00`}
              onClick={() => setSlotDraft({ date: day.iso, startTime: `${String(hour).padStart(2, "0")}:00` })}
            />)}
            {blocks.map((block) => {
              const top = (block.start - agendaStartHour * 60) / 60;
              const height = block.minutes / 60;
              if (top + height <= 0 || top >= agendaHours.length) return null;
              return <div
                key={block.key}
                className={"agenda-block " + block.category + (block.done ? " done" : "")}
                style={{ top: `calc(${Math.max(0, top)} * var(--hour-height))`, height: `calc(${Math.min(height, agendaHours.length - top)} * var(--hour-height) - 3px)` }}
                title={`${block.title} · ${clockFromMinutes(block.start)}–${clockFromMinutes(block.end)}`}
              >
                <b>{block.title}</b>
                <small>{clockFromMinutes(block.start)}</small>
              </div>;
            })}
            {day.iso === today && nowMinutes >= agendaStartHour * 60 && nowMinutes <= agendaEndHour * 60 && <i
              className="agenda-now"
              style={{ top: `calc(${(nowMinutes - agendaStartHour * 60) / 60} * var(--hour-height))` }}
            />}
          </div>;
        })}
      </div>
    </div>
    {slotDraft && <form className="slot-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void save({
        action: "add_task",
        title: form.get("title"),
        projectId: form.get("projectId"),
        dueDate: slotDraft.date,
        startTime: slotDraft.startTime,
        durationMinutes: Number(form.get("durationMinutes")) || 60,
      }).then((ok) => { if (ok) setSlotDraft(null); });
    }}>
      <p>Nuevo bloque · {formatDate(slotDraft.date)} a las {slotDraft.startTime}</p>
      <div className="slot-fields">
        <input name="title" required autoFocus placeholder="Ej. Estudiar capítulo 2" />
        <select name="projectId"><option value="">Sin proyecto</option>{data.focusProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select name="durationMinutes" defaultValue="60">{[30, 45, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)}</option>)}</select>
      </div>
      <div className="slot-actions">
        <button type="button" onClick={() => setSlotDraft(null)}>Cancelar</button>
        <button className="primary-action" disabled={saving}>{saving ? "Guardando…" : "Agregar bloque"}</button>
      </div>
    </form>}
    <p className="agenda-hint">Tocá cualquier franja vacía para poner un bloque ahí.</p>
  </article>;

  const monthCalendarPanel = <article className="panel calendar-panel"><div className="calendar-head"><button onClick={() => shiftCalendar(-1)}>‹</button><h2>{calendarMonthName}</h2><button onClick={() => shiftCalendar(1)}>›</button></div><div className="calendar-grid"><div className="calendar-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((item, index) => <b key={item + index}>{item}</b>)}</div><div className="calendar-cells">{Array.from({ length: calendarOffset }, (_, index) => <span className="blank" key={"blank" + index} />)}{Array.from({ length: calendarDays }, (_, index) => {
    const date = calendarCursor + "-" + String(index + 1).padStart(2, "0");
    const items = calendarItems.filter((item) => item.date === date);
    const daySummary = items.map((item) => item.title).join(", ");
    return <button className={date === today ? "today" : ""} key={date} aria-label={items.length ? `${index + 1}: ${daySummary}` : String(index + 1)} title={daySummary || undefined} onClick={() => { setWeekAnchor(date); setAgendaView("week"); }}><b>{index + 1}</b><div className="calendar-day-events">{items.slice(0, 2).map((item) => <span className={"calendar-event " + item.type} key={item.key}><i />{item.title}</span>)}{items.length > 2 && <small className="calendar-more">+{items.length - 2} más</small>}</div></button>;
  })}</div></div></article>;

  const calendarPanel = <section className="module-stack">
    <div className="period-switch agenda-switch">
      <button className={agendaView === "week" ? "active" : ""} onClick={() => setAgendaView("week")}>Semana por horas</button>
      <button className={agendaView === "month" ? "active" : ""} onClick={() => setAgendaView("month")}>Mes completo</button>
    </div>
    {agendaView === "week" ? weekAgendaPanel : monthCalendarPanel}
    <div className="calendar-layout">
      <article className="panel"><div className="panel-heading"><div><p>NUEVO RECORDATORIO</p><h2>Evento importante</h2></div></div><form className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_event", title: form.get("title"), eventDate: form.get("eventDate"), eventTime: form.get("eventTime"), durationMinutes: form.get("durationMinutes"), category: form.get("category"), notes: form.get("notes") }); }}>
        <label>Evento<input name="title" required placeholder="Examen, turno, carrera…" /></label><div className="three-fields"><label>Fecha<input name="eventDate" type="date" required /></label><label>Hora<input name="eventTime" type="time" /></label><label>Dura<select name="durationMinutes" defaultValue="60">{[30, 60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)}</option>)}</select></label></div><label>Categoría<select name="category"><option value="personal">Personal</option><option value="study">Estudio</option><option value="work">Trabajo</option><option value="training">Entrenamiento</option><option value="health">Salud</option><option value="other">Otro</option></select></label><label>Notas<textarea name="notes" placeholder="Dirección, preparación, información útil…" /></label><button className="primary-action">Guardar evento</button>
      </form></article>
      <article className="panel"><div className="panel-heading"><div><p>LO PRÓXIMO</p><h2>Recordatorios y cuenta regresiva</h2></div><span className="week-pill">{upcoming.length} próximos</span></div><div className="upcoming-list">{upcoming.length ? upcoming.map((item) => <div key={item.key}><span className={"event-dot " + item.type} /><p><b>{item.title}</b><small>{formatDate(item.date)} · {item.source === "goal" ? "Objetivo" : item.source === "task" ? "Tarea" : "Evento"}</small></p><strong>{countdownLabelCapitalized(dayDistance(today, item.date))}</strong>{item.source === "event" && <button onClick={() => void save({ action: "delete_event", id: item.id })}>×</button>}</div>) : <div className="inline-empty"><span>□</span><p><b>No hay fechas próximas</b><small>Agregá un evento, tarea u objetivo.</small></p></div>}</div></article>
    </div>
  </section>;
  const periodDays = statsPeriod === "weekly" ? 7 : statsPeriod === "monthly" ? 30 : 365;
  const statsStart = dateMinus(today, periodDays - 1);
  const periodTraining = data.trainingLogs.filter((item) => item.trainingDate >= statsStart);
  const periodFocus = uniqueFocusSessions.filter((item) => item.sessionDate >= statsStart);
  const periodSleep = data.dailyCheckins.filter((item) => item.entryDate >= statsStart && item.sleepMinutes > 0);
  const periodReading = data.readingHistory.filter((item) => item.logDate >= statsStart);
  const periodMeals = data.mealHistory.filter((item) => item.mealDate >= statsStart);
  const buckets = statsPeriod === "weekly"
    ? Array.from({ length: 7 }, (_, index) => {
      const daysAgo = 6 - index;
      const date = dateMinus(today, daysAgo);
      return { start: date, end: date, label: trendDayLabel(date, daysAgo) };
    })
    : statsPeriod === "monthly"
      ? Array.from({ length: 4 }, (_, index) => ({ start: dateMinus(today, 27 - index * 7), end: dateMinus(today, 21 - index * 7), label: "Sem " + (index + 1) }))
      : Array.from({ length: 12 }, (_, index) => {
        const value = new Date(today + "T12:00:00");
        value.setMonth(value.getMonth() - (11 - index));
        const prefix = value.toISOString().slice(0, 7);
        return { start: prefix + "-01", end: prefix + "-31", label: new Intl.DateTimeFormat("es-AR", { month: "short" }).format(value) };
      });
  const trendValues = buckets.map((bucket) => ({
    label: bucket.label,
    training: periodTraining.filter((item) => item.trainingDate >= bucket.start && item.trainingDate <= bucket.end).length,
    focus: periodFocus.filter((item) => item.sessionDate >= bucket.start && item.sessionDate <= bucket.end).reduce((sum, item) => sum + item.minutes, 0) / 60,
  }));
  const maxTrend = Math.max(1, ...trendValues.flatMap((item) => [item.training, item.focus]));
  // Tendencias diarias del período elegido, con comparación contra el período
  // anterior de la misma longitud.
  const trendSpan = statsPeriod === "weekly" ? 7 : statsPeriod === "monthly" ? 30 : 180;
  const trends: Array<{ key: string; icon: string; label: string; trend: Trend; format: (value: number) => string; caption: string }> = [
    { key: "training", icon: "↗", label: "Entrenamientos", trend: trendFor(trendSpan, today, (date) => trainingByDate[date] ?? 0), format: (value) => String(Math.round(value)), caption: "sesiones registradas" },
    { key: "focus", icon: "⌁", label: "Foco profundo", trend: trendFor(trendSpan, today, (date) => focusByDate[date] ?? 0), format: (value) => formatMinutes(value), caption: "tiempo de trabajo concentrado" },
    { key: "sleep", icon: "☾", label: "Sueño", trend: trendFor(trendSpan, today, (date) => sleepMinutesByDate[date] ?? 0), format: (value) => formatMinutes(value), caption: "horas dormidas registradas" },
    { key: "reading", icon: "▱", label: "Lectura", trend: trendFor(trendSpan, today, (date) => readingByDate[date] ?? 0), format: (value) => `${Math.round(value)} pág.`, caption: "páginas leídas" },
    { key: "nutrition", icon: "◇", label: "Calorías", trend: trendFor(trendSpan, today, (date) => caloriesByDay[date] ?? 0), format: (value) => `${Math.round(value).toLocaleString("es-AR")} kcal`, caption: "energía registrada" },
  ];
  // El Daily Score también es una tendencia: mismo período, mismo criterio de
  // comparación que el resto de las métricas de esta sección.
  const scoreTrend = trendFor(trendSpan, today, scoreForDate);
  const scoreAverage = Math.round(scoreTrend.average);
  const scorePreviousAverage = Math.round(scoreTrend.previousTotal / trendSpan);
  const scoreDelta = scorePreviousAverage > 0 ? scoreAverage - scorePreviousAverage : null;

  const streakCards: Array<{ key: string; icon: string; label: string; streak: typeof streaks.training; unit: string }> = [
    { key: "training", icon: "↗", label: "Entrenamiento", streak: streaks.training, unit: "día entrenando" },
    { key: "focus", icon: "⌁", label: "Foco", streak: streaks.focus, unit: "día con foco" },
    { key: "reading", icon: "▱", label: "Lectura", streak: streaks.reading, unit: "día leyendo" },
    { key: "sleep", icon: "☾", label: "Sueño de 7 h+", streak: streaks.sleep, unit: "noche completa" },
    { key: "logging", icon: "✎", label: "Registro diario", streak: streaks.logging, unit: "día registrando" },
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
          <div className="score-bars" role="img" aria-label={`Daily Score de los últimos ${trendSpan} días. Promedio ${scoreAverage} de 100.`}>
            <i className="score-average-line" style={{ bottom: String(scoreAverage) + "%" }} aria-hidden="true" />
            {scoreTrend.points.map((point) => <span
              key={point.date}
              className={point.date === today ? "today" : ""}
              style={{ height: String(Math.max(point.value, 1)) + "%" }}
              title={`${formatDate(point.date)} · ${point.value}/100`}
            />)}
          </div>
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
        <b className="streak-count">{card.streak.current}<small>{card.streak.current === 1 ? " día" : " días"}</small></b>
        <p>{card.label}</p>
        <small>{card.streak.pendingToday ? "Hoy todavía no" : card.streak.best > card.streak.current ? `Récord: ${card.streak.best}` : card.streak.current > 0 ? "Tu mejor marca" : "Sin racha activa"}</small>
        {card.streak.pendingToday && <i className="streak-warning" title={`Registrá ${card.unit} hoy para no cortarla`} />}
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
            <b>{row.format(row.trend.total)}</b>
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
    <article className="panel trend-panel"><div className="panel-heading"><div><p>COMPARACIÓN</p><h2>Constancia y foco</h2></div><div className="chart-legend"><span><i className="training" />Entrenamientos</span><span><i className="focus" />Horas de foco</span></div></div><div className="trend-chart">{trendValues.map((item) => <div key={item.label}><div className="bar-pair"><i className="training" style={{ height: String(item.training / maxTrend * 100) + "%" }} title={item.training + " entrenamientos"} /><i className="focus" style={{ height: String(item.focus / maxTrend * 100) + "%" }} title={item.focus.toFixed(1) + " h de foco"} /></div><small>{item.label}</small></div>)}</div></article>
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

  const mealsPanel = <article className="panel section-panel"><div className="panel-heading"><div><p>ENERGÍA DE HOY</p><h2>Comidas</h2></div><button className="add-button light" onClick={() => setMealForm(!mealForm)}>＋ Carga manual</button></div>
    {isPro ? <div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea value={aiDescription} onChange={(event) => setAiDescription(event.target.value)} placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><label className="photo-button">📷 {mealPhoto ? "Cambiar foto" : "Sacar o subir foto"}<input type="file" accept="image/*" capture="environment" onChange={(event) => void selectMealPhoto(event.target.files?.[0])} /></label>{photoPreview && <div className="photo-preview"><Image src={photoPreview} alt="Comida a analizar" width={38} height={38} unoptimized /><button onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(""); setMealPhoto(null); }}>×</button></div>}<button className="analyze-button" disabled={estimating || (!mealPhoto && !aiDescription.trim())} onClick={() => void estimateMeal()}>{estimating ? "Analizando…" : "Analizar comida"}</button></div>
      {estimate && <div className="estimate-result"><div className="estimate-head"><div><span>ESTIMACIÓN PARA REVISAR</span><input value={estimate.mealName} onChange={(event) => setEstimate({ ...estimate, mealName: event.target.value })} /></div><label><input type="number" value={estimate.estimatedCalories} onChange={(event) => setEstimate({ ...estimate, estimatedCalories: Number(event.target.value) || 0 })} /><small>kcal</small></label></div><input className="estimate-detail" value={estimate.detail} onChange={(event) => setEstimate({ ...estimate, detail: event.target.value })} /><p>Rango probable: {estimate.minimumCalories}–{estimate.maximumCalories} kcal. {estimate.caveat}</p><button className="confirm-estimate" onClick={() => void saveEstimate()}>Confirmar y guardar</button></div>}
    </div> : <LockedFeature
      title="Calorías con IA"
      note="Escribí qué comiste o sacale una foto al plato: la app estima calorías y macros."
      onOpen={openPro}
    ><div className="ai-meal-box"><div className="ai-meal-title"><span>✦</span><div><b>Estimar con IA</b><small>Escribí qué comiste o mostralo con una foto.</small></div></div><textarea readOnly value="" placeholder="Ej. milanesa con puré, porción mediana…" /><div className="ai-photo-row"><span className="photo-button">📷 Sacar o subir foto</span><span className="analyze-button">Analizar comida</span></div></div></LockedFeature>}
    {mealForm && <form className="meal-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_meal", date: today, name: form.get("name"), detail: form.get("detail"), calories: form.get("calories"), protein: form.get("protein"), carbs: form.get("carbs"), fat: form.get("fat") }); }}><input name="name" required placeholder="Comida" /><input name="detail" required placeholder="Detalle" /><input name="calories" type="number" min="0" placeholder="kcal" /><button>Guardar</button></form>}
    <div className="meal-list">{data.meals.map((meal) => <div className="meal-row" key={meal.id}><span>🍽️</span><div><b>{meal.name}</b><small>{meal.detail} · P {meal.protein} / C {meal.carbs} / G {meal.fat}</small></div><strong>≈ {meal.calories} kcal</strong><button className="row-delete" onClick={() => void save({ action: "delete_meal", id: meal.id })}>×</button></div>)}{!data.meals.length && <div className="inline-empty"><span>🥗</span><p><b>Todavía no cargaste comidas</b><small>Usá texto, foto o carga manual.</small></p></div>}</div><div className="calorie-total"><span>Total estimado</span><b>{calories.toLocaleString("es-AR")} kcal</b></div>
  </article>;

  const dietPlannerPanel = <article className="panel diet-planner-panel">
    <div className="panel-heading"><div><p>PLAN PERSONAL CON IA</p><h2>Armá una alimentación sencilla para tu objetivo</h2></div>{data.dietPlan && <span className="week-pill">Plan guardado</span>}</div>
    <p className="diet-intro">Completá tus datos y contanos qué necesitás. La aplicación calcula una referencia energética y la IA propone opciones intercambiables; no reemplaza la evaluación de un nutricionista.</p>
    <div className="diet-builder-grid">
      <div className="diet-fields">
        <label>Edad<input type="number" min="18" max="100" value={dietForm.age} onChange={(event) => setDietForm({ ...dietForm, age: Number(event.target.value) })} /></label>
        <label>Altura (cm)<input type="number" min="120" max="230" value={dietForm.heightCm} onChange={(event) => setDietForm({ ...dietForm, heightCm: Number(event.target.value) })} /></label>
        <label>Peso actual (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.currentWeightKg} onChange={(event) => setDietForm({ ...dietForm, currentWeightKg: Number(event.target.value) })} /></label>
        <label>Peso objetivo (kg)<input type="number" min="35" max="300" step=".1" value={dietForm.targetWeightKg} onChange={(event) => setDietForm({ ...dietForm, targetWeightKg: Number(event.target.value) })} /></label>
        <label>Sexo para la estimación<select value={dietForm.sex} onChange={(event) => setDietForm({ ...dietForm, sex: event.target.value as DietForm["sex"] })}><option value="unspecified">Prefiero no indicar</option><option value="male">Masculino</option><option value="female">Femenino</option></select></label>
        <label>Actividad habitual<select value={dietForm.activityLevel} onChange={(event) => setDietForm({ ...dietForm, activityLevel: event.target.value as DietForm["activityLevel"] })}><option value="sedentary">Baja / sedentaria</option><option value="light">Ligera · 1–3 días</option><option value="moderate">Moderada · 3–5 días</option><option value="high">Alta · 6–7 días</option></select></label>
        <label>Ritmo del objetivo<select value={dietForm.goalPace} onChange={(event) => setDietForm({ ...dietForm, goalPace: event.target.value as DietForm["goalPace"] })}><option value="gentle">Gradual</option><option value="moderate">Moderado</option></select></label>
        <label>Estilo preferido<input value={dietForm.preferences} onChange={(event) => setDietForm({ ...dietForm, preferences: event.target.value })} placeholder="Ej. económico, vegetariano, 4 comidas" /></label>
      </div>
      <div className="diet-conversation"><div className="diet-conversation-head"><span>✦</span><div><b>Contale los detalles a la aplicación</b><small>Intolerancias, alergias, horarios, gustos, presupuesto o alimentos que evitás.</small></div></div><div className="diet-detail-chips">{["Intolerancia a la lactosa", "Sin gluten", "Vegetariano", "Poco tiempo para cocinar"].map((detail) => <button key={detail} type="button" onClick={() => addDietDetail(detail)}>{detail}</button>)}</div><textarea value={dietForm.details} onChange={(event) => setDietForm({ ...dietForm, details: event.target.value })} placeholder="Ej. Soy intolerante a la lactosa, almuerzo fuera de casa y necesito comidas simples…" /><button className={"diet-voice-button " + (dietRecording ? "recording" : "")} type="button" disabled={dietVoiceLoading} onClick={() => dietRecording ? stopDietRecording() : void startDietRecording()}><span>{dietRecording ? "■" : "●"}</span>{dietVoiceLoading ? "Interpretando audio…" : dietRecording ? "Terminar grabación" : "Contarlo por audio"}</button><small className="privacy-note">El audio se transcribe y no se conserva.</small></div>
    </div>
    <button className="generate-diet-button" type="button" disabled={dietGenerating} onClick={() => void generateDietPlan()}>{dietGenerating ? "Creando opciones…" : displayedDietPlan ? "Actualizar mi plan con IA" : "Crear mi plan con IA"}</button>
    {displayedDietPlan && <div className="diet-plan-result"><div className="diet-plan-summary"><div><span>OBJETIVO DIARIO APROXIMADO</span><b>{displayedDietPlan.targetCalories.toLocaleString("es-AR")} kcal</b><small>Rango orientativo {displayedDietPlan.calorieRangeMinimum.toLocaleString("es-AR")}–{displayedDietPlan.calorieRangeMaximum.toLocaleString("es-AR")} kcal · mantenimiento estimado {displayedDietPlan.maintenanceCalories.toLocaleString("es-AR")}</small></div><p>{displayedDietPlan.summary}</p></div><div className="macro-row"><span><b>{displayedDietPlan.macros.proteinGrams} g</b>Proteínas</span><span><b>{displayedDietPlan.macros.carbsGrams} g</b>Carbohidratos</span><span><b>{displayedDietPlan.macros.fatGrams} g</b>Grasas</span></div><div className="diet-meal-options">{displayedDietPlan.meals.map((meal) => <article key={meal.slot}><span>{meal.slot}</span><p>{meal.guidance}</p><ul>{meal.options.map((option) => <li key={option}>{option}</li>)}</ul></article>)}</div><div className="diet-plan-bottom"><div><b>Restricciones aplicadas</b><p>{displayedDietPlan.appliedRestrictions.length ? displayedDietPlan.appliedRestrictions.join(" · ") : "Ninguna indicada"}</p></div><div><b>Importante</b><p>{displayedDietPlan.safetyNote}</p></div></div>{generatedDietPlan && <button className="save-diet-button" type="button" disabled={saving} onClick={() => void saveDietPlan()}>Guardar este plan y usarlo como objetivo</button>}</div>}
  </article>;

  const calorieCalendarPanel = <article className="panel calorie-calendar-panel"><div className="calorie-calendar-top"><div><p>SEGUIMIENTO DE LA DIETA</p><h2>Calorías por día</h2><small>{dietTargetCalories ? <>Tu referencia actual es <b>{dietTargetCalories.toLocaleString("es-AR")} kcal diarias.</b></> : "Creá y guardá un plan para comparar cada día con tu objetivo."}</small></div><div className="calorie-calendar-nav"><button onClick={() => shiftDietCalendar(-1)}>‹</button><b>{dietCalendarMonthName}</b><button onClick={() => shiftDietCalendar(1)}>›</button></div></div><div className="calorie-calendar"><div className="calorie-weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <b key={day + index}>{day}</b>)}</div><div className="calorie-calendar-cells">{Array.from({ length: dietCalendarOffset }, (_, index) => <span className="blank" key={"diet-blank-" + index} />)}{Array.from({ length: dietCalendarDays }, (_, index) => { const day = index + 1; const iso = dietCalendarCursor + "-" + String(day).padStart(2, "0"); const total = caloriesByDate[iso] ?? 0; return <div className={calorieStatus(total) + (iso === today ? " today" : "")} key={iso} title={total ? total + " kcal registradas" : "Sin comidas registradas"}><span>{day}</span><b>{total ? total.toLocaleString("es-AR") : "—"}</b><small>kcal</small></div>; })}</div></div><div className="calorie-legend"><span><i className="on-target" />En objetivo ±10%</span><span><i className="near-target" />Cerca ±20%</span><span><i className="off-target" />Fuera del rango</span><span><i className="empty" />Sin registro</span></div></article>;

  const booksPanel = <section className="books-layout"><article className="panel section-panel books-panel"><div className="panel-heading"><div><p>TU BIBLIOTECA</p><h2>Libros</h2></div><button className="add-button light" onClick={() => bookForm ? setBookForm(false) : openAddBook(bookTab)}>{bookForm ? "Cerrar" : "＋ Nuevo libro"}</button></div>
    {bookForm && <form className="book-form smart-book-form" onSubmit={(event) => void submitNewBook(event)}><div className="book-title-search"><input name="title" autoComplete="off" required value={bookDraft.title} onFocus={() => { if (bookSuggestions.length) setBookSuggestionOpen(true); }} onChange={(event) => { const title = event.target.value; setBookDraft({ ...bookDraft, title, coverUrl: "", externalKey: "" }); setBookSuggestionOpen(true); if (title.trim().length < 2) { setBookSuggestions([]); setBookSuggestLoading(false); } }} placeholder="Empezá a escribir el título…" />{(bookDraft.title.trim().length >= 2 && bookSuggestionOpen && (bookSuggestLoading || bookSuggestions.length > 0)) && <div className="book-autocomplete">{bookSuggestLoading && <div className="book-searching"><span className="voice-spinner" />Buscando en el catálogo…</div>}{!bookSuggestLoading && bookSuggestions.map((book) => <button type="button" key={book.key} onClick={() => chooseBookSuggestion(book)}><CatalogBookCover book={book} compact /><p><b>{book.title}</b><small>{book.author}{book.year ? ` · ${book.year}` : ""}</small></p>{book.pages > 0 && <em>{book.pages} pág.</em>}</button>)}</div>}</div><input name="author" value={bookDraft.author} onChange={(event) => setBookDraft({ ...bookDraft, author: event.target.value })} placeholder="Autor" /><input name="totalPages" value={bookDraft.totalPages || ""} onChange={(event) => setBookDraft({ ...bookDraft, totalPages: Number(event.target.value) || 0 })} type="number" min="0" placeholder="Páginas" /><select name="status" value={bookDraft.status} onChange={(event) => setBookDraft({ ...bookDraft, status: event.target.value as BookStatus })}><option value="reading">Leyendo</option><option value="read">Leído</option><option value="wishlist">Quiero leer</option></select><button disabled={saving || bookMatching}>{bookMatching ? "Identificando…" : "Guardar"}</button></form>}
    <div className="book-tabs">{(["reading", "read", "wishlist"] as BookStatus[]).map((tab) => <button className={bookTab === tab ? "active" : ""} key={tab} onClick={() => { setBookTab(tab); setBookShelfPage(0); setSelectedBookId(null); }}>{tab === "reading" ? "Leyendo" : tab === "read" ? "Leídos" : "Quiero leer"} <i>{data.books.filter((book) => book.status === tab).length}</i></button>)}</div>
    {booksInTab.length ? <><div className="book-shelf-list">{visibleBooks.map((book) => { const isSelected = selectedBook?.id === book.id; return <article className={"current-book shelf-book " + (isSelected ? "selected" : "")} key={book.id}><SavedBookCover book={book} /><div className="book-info"><button type="button" className="book-card-select" aria-pressed={isSelected} onClick={() => setSelectedBookId(book.id)}><span>{bookTab === "reading" ? "LEYENDO AHORA" : bookTab === "read" ? "TERMINADO" : "PRÓXIMA LECTURA"}</span><h3>{book.title}</h3><p>{book.author}</p></button><div className="progress-line"><i style={{ width: String(book.totalPages ? Math.min(100, book.currentPage / book.totalPages * 100) : 0) + "%" }} /></div><small>{book.currentPage} de {book.totalPages || "?"} páginas</small><button type="button" className="delete-book-trigger" onClick={() => setBookToDelete(book)}>Eliminar libro</button></div>{bookTab === "reading" && isSelected ? <div className="page-counter"><label>Páginas hoy</label><div><input type="number" min="0" value={pagesInput} onChange={(event) => setPagesInput(Number(event.target.value) || 0)} /><button className="save-pages" onClick={() => void save({ action: "set_pages", bookId: book.id, date: today, pages: pagesInput })}>Guardar</button></div></div> : <button type="button" className="book-select-action" onClick={() => setSelectedBookId(book.id)}>{isSelected ? "✓ Seleccionado" : "Ver notas y detalles"}</button>}</article>; })}</div>{bookShelfPageCount > 1 && <div className="book-shelf-pagination"><button type="button" disabled={visibleBookShelfPage === 0} onClick={() => showBookShelfPage(visibleBookShelfPage - 1)}>← Anteriores</button><span>{visibleBookShelfPage + 1} de {bookShelfPageCount}</span><button type="button" disabled={visibleBookShelfPage === bookShelfPageCount - 1} onClick={() => showBookShelfPage(visibleBookShelfPage + 1)}>Siguientes →</button></div>}</> : <button type="button" className="empty-shelf" onClick={() => openAddBook(bookTab)}><span>＋</span><b>No hay libros en esta lista</b><p>Tocá acá para agregar el primero.</p></button>}
  </article><article className="panel notes-panel section-panel"><div className="panel-heading"><div><p>IDEAS QUE QUEDAN</p><h2>Notas del libro</h2></div></div>{selectedBook ? <><form onSubmit={(event) => { event.preventDefault(); void save({ action: "add_note", bookId: selectedBook.id, content: note }).then((ok) => { if (ok) setNote(""); }); }}><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={"Idea u observación de " + selectedBook.title + "…"} /><button>Guardar nota</button></form><div className="notes-list">{data.notes.filter((item) => item.bookId === selectedBook.id).map((item) => <div key={item.id}><span>“</span><p>{item.content}</p></div>)}</div></> : <div className="inline-empty"><span>✎</span><p><b>Elegí un libro</b><small>Sus notas aparecerán acá.</small></p></div>}</article>
  <article className="panel section-panel book-discover-panel"><div className="book-discover-head"><span>✦</span><div><p>DESCUBRIR NUEVAS LECTURAS</p><h2>¿Sobre qué querés leer?</h2><small>Buscá por un tema, una idea o un interés y elegí el idioma de la edición.</small></div></div><form className="book-discover-form" onSubmit={(event) => void discoverBooks(event)}><input value={discoverQuery} onChange={(event) => setDiscoverQuery(event.target.value)} placeholder="Ej. finanzas personales, inteligencia artificial, historia…" /><select aria-label="Idioma del libro" value={discoverLanguage} onChange={(event) => setDiscoverLanguage(event.target.value)}>{bookLanguageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button disabled={discoverLoading || discoverQuery.trim().length < 2}>{discoverLoading ? "Buscando…" : "Buscar libros"}</button></form><div className="book-topic-chips">{["Finanzas personales", "Productividad", "Historia", "Tecnología", "Psicología", "Biografías"].map((topic) => <button type="button" key={topic} onClick={() => setDiscoverQuery(topic)}>{topic}</button>)}</div>{discoverLoading && <div className="discover-loading"><span className="voice-spinner" /><b>Buscando buenas opciones…</b></div>}{!discoverLoading && discoverResults.length > 0 && <div className="book-results-grid">{discoverResults.map((book) => { const isSaved = data.books.some((savedBook) => savedBook.title.toLowerCase() === book.title.toLowerCase() && (!savedBook.author || savedBook.author.toLowerCase() === book.author.toLowerCase())); return <article key={book.key}><CatalogBookCover book={book} /><div className="book-result-copy"><span>{book.year || "Edición disponible"}</span><h3>{book.title}</h3><p>{book.author}</p><small>{book.pages ? `${book.pages} páginas aproximadas` : "Páginas no informadas"}</small></div><div className="book-result-actions"><button type="button" disabled={saving || isSaved} onClick={() => void saveDiscoveredBook(book)}>{isSaved ? "✓ En tu biblioteca" : "＋ Quiero leer"}</button><a href={book.openLibraryUrl} target="_blank" rel="noreferrer">Ver ficha ↗</a></div></article>; })}</div>}{!discoverLoading && discoverSearched && !discoverResults.length && <div className="inline-empty discover-empty"><span>⌕</span><p><b>No encontramos opciones con esos filtros</b><small>Probá con un tema más amplio u otro idioma.</small></p></div>}<p className="catalog-credit">Información bibliográfica y portadas provistas por <a href="https://openlibrary.org/" target="_blank" rel="noreferrer">Open Library</a>.</p></article></section>;

  const priorityEditor = <article className="panel priority-panel"><div className="panel-heading"><div><p>PRIORIDAD DEL MES</p><h2>¿Qué te importa más cumplir?</h2></div></div><p className="panel-intro">Estas prioridades definen el peso de cada área en el Daily Score.</p><div className="priority-list">{([
    ["gymWeight", "Entrenamiento", "↗", "Constancia en todas tus disciplinas"],
    ["nutritionWeight", "Alimentación", "◇", "Registrar comidas y cuidar tu energía"],
    ["sleepWeight", "Sueño", "☾", "Duración y regularidad del descanso"],
    ["focusWeight", "Estudio / Trabajo", "⌁", "Trabajo profundo en materias y proyectos"],
    ["readingWeight", "Lectura", "▱", "Leer y avanzar en tus libros"],
    ["goalsWeight", "Objetivos y organización", "◎", "Completar metas y próximos pasos"],
  ] as Array<[keyof Omit<Priorities, "monthKey">, string, string, string]>).map(([key, label, icon, copy]) => <div className="priority-row" key={key}><span className="priority-icon">{icon}</span><div className="priority-copy"><b>{label}</b><small>{copy}</small></div><div className="priority-options">{[1, 2, 3].map((value) => <button key={value} className={priorityDraft[key] === value ? "active" : ""} onClick={() => setPriorityDraft({ ...priorityDraft, [key]: value })}>{priorityLabels[value]}</button>)}</div></div>)}</div><p className="priority-view-note">Inicio, Calendario y Estadísticas reúnen información de estas áreas, por eso no duplican peso en el puntaje.</p><button className="save-priorities" onClick={() => void save({ action: "set_priorities", ...priorityDraft, monthKey })}>Guardar prioridades</button></article>;
  const goalsPanel = <section className="goals-page"><div className="goals-columns"><article className="panel goal-creator"><div className="panel-heading"><div><p>NUEVO OBJETIVO</p><h2>¿Qué querés conseguir?</h2></div></div><form onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_goal", title: form.get("title"), category: form.get("category"), period: goalPeriod, targetDate: goalDeadline(today, goalPeriod, customLength, customUnit) }); }}><label>Objetivo<input name="title" required placeholder="Ej. Correr mis primeros 10 km" /></label><label>Área<select name="category">{goalAreaOptions.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}</select></label><label>Plazo<select value={goalPeriod} onChange={(event) => setGoalPeriod(event.target.value as GoalPeriod)}><option value="weekly">Esta semana</option><option value="monthly">Este mes</option><option value="annual">Este año</option><option value="custom">Personalizado</option></select></label>{goalPeriod === "custom" && <div className="custom-duration"><label>Dentro de<input type="number" min="1" value={customLength} onChange={(event) => setCustomLength(Number(event.target.value) || 1)} /></label><label>Unidad<select value={customUnit} onChange={(event) => setCustomUnit(event.target.value as "months" | "years")}><option value="months">meses</option><option value="years">años</option></select></label></div>}<div className="deadline-preview"><span>◎</span><p><small>FECHA OBJETIVO</small><b>{formatDate(goalDeadline(today, goalPeriod, customLength, customUnit))}</b></p></div><button className="primary-action">Crear objetivo</button></form></article>
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

  const demoFriends = [
    { name: "Tomi", initials: "T", score: 84, status: "Cerró su día", detail: "Entrenó y completó 3 tareas", tone: "mint" },
    { name: "Sofi", initials: "S", score: 76, status: "En progreso", detail: "Le faltan sueño y lectura", tone: "violet" },
    { name: "Nico", initials: "N", score: 91, status: "Cerró su día", detail: "Nueva mejor marca semanal", tone: "coral" },
  ];
  const friendsPanel = <section className="friends-page">
    <article className="friends-hero">
      <div className="friends-hero-copy">
        <span className="friends-preview-pill">VISTA PREVIA</span>
        <p>ACCOUNTABILITY PARTNERS</p>
        <h2>Avanzar acompañado<br /><em>cambia el compromiso.</em></h2>
        <small>Compartí objetivos con personas de confianza, miren su Daily Score y empújense cuando uno esté por aflojar.</small>
        <div className="friends-hero-actions">
          <button type="button" onClick={() => setFriendsNotice("La invitación va a funcionar cuando conectemos las cuentas reales.")}>＋ Invitar amigo</button>
          <button type="button" className="secondary" onClick={() => setFriendsNotice("Elegí un objetivo desde Planificador para compartirlo con tu compañero.")}>Compartir un objetivo</button>
        </div>
      </div>
      <div className="friends-hero-visual" aria-hidden="true">
        <div className="friend-avatar-stack"><span>R</span><span>T</span><span>S</span><span>N</span></div>
        <b>4 personas</b><small>en tu círculo</small>
        <div className="friends-weekly-proof"><strong>12</strong><span>objetivos cumplidos<br />esta semana</span></div>
      </div>
    </article>
    {friendsNotice && <div className="friends-notice"><span>ⓘ</span><p>{friendsNotice}</p><button type="button" onClick={() => setFriendsNotice("")}>×</button></div>}
    <section className="friends-score-grid">
      {demoFriends.map((friend) => <article className="panel friend-score-card" key={friend.name}>
        <div className="friend-score-head"><span className={"friend-avatar " + friend.tone}>{friend.initials}</span><p><b>{friend.name}</b><small>{friend.status}</small></p><button type="button" aria-label={`Ver perfil de ${friend.name}`}>•••</button></div>
        <div className="friend-score-main"><div className="friend-score-ring" style={{ "--friend-score": `${friend.score}%` } as CSSProperties}><span><b>{friend.score}</b><small>/100</small></span></div><p><small>DAILY SCORE</small><b>{friend.score >= 85 ? "Gran día" : "Buen ritmo"}</b><span>{friend.detail}</span></p></div>
        <button type="button" className="friend-nudge" onClick={() => setFriendsNotice(`Le mandaste un empujón a ${friend.name} en esta demostración.`)}>Enviar un empujón <span>→</span></button>
      </article>)}
    </section>
    <article className="panel accountability-panel">
      <div className="panel-heading"><div><p>OBJETIVOS COMPARTIDOS</p><h2>Compromisos del círculo</h2></div><span className="week-pill">2 activos</span></div>
      <div className="accountability-list">
        <div><span className="accountability-icon">↗</span><div><small>VOS + TOMI · ESTA SEMANA</small><b>Entrenar 3 veces</b><div className="accountability-track"><i style={{ width: "67%" }} /></div></div><p><strong>2/3</strong><small>Tomi 3/3 ✓</small></p></div>
        <div><span className="accountability-icon book">▱</span><div><small>VOS + SOFI · 30 DÍAS</small><b>Leer 20 páginas por día</b><div className="accountability-track"><i style={{ width: "43%" }} /></div></div><p><strong>13/30</strong><small>Sofi 15/30</small></p></div>
      </div>
      <button type="button" className="accountability-add" onClick={() => setFriendsNotice("Esta opción va a permitir elegir un objetivo existente y el amigo con quien compartirlo.")}>＋ Crear compromiso compartido</button>
    </article>
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
      <header className="editorial-onboarding-header"><button type="button" className="lifetrack-brand onboarding-brand-back" onClick={goBackFromOnboarding} aria-label={onboardingStep === 2 ? "Volver al primer paso" : "Volver al inicio de sesión"}><span className="brand-mark">A</span><b>AVORA</b></button><span>Paso {onboardingStep} de 2</span></header>
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
            <button className="editorial-primary" disabled={onboardingName.trim().length < 2} onClick={() => setOnboardingStep(2)}>Continuar <span>→</span></button>
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

  return <main className="app-shell">
    <aside className="sidebar"><button type="button" className="side-brand" onClick={() => openSection("summary")} aria-label="Ir a Inicio"><span className="brand-mark small">A</span><b>AVORA</b></button><nav>{navItems.map((item) => <button key={item.id} className={"nav-item " + (section === item.id ? "active" : "")} onClick={() => openSection(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav><div className="profile-menu">
          {profileMenuOpen && <div className="profile-menu-panel" role="menu" aria-label="Opciones de la cuenta">
            <p>CUENTA</p>
            <a className="profile-menu-signout" href="/signout-with-chatgpt?return_to=/" role="menuitem">
              <span aria-hidden="true">↪</span>
              Cerrar sesión
            </a>
          </div>}
          <button
            type="button"
            className="profile-chip profile-chip-button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            <span>{displayName.charAt(0)}</span>
            <div><b>{displayName}</b><small>Datos guardados</small></div>
            <i className="profile-menu-chevron" aria-hidden="true">{profileMenuOpen ? "▾" : "▴"}</i>
          </button>
        </div></aside>
    <section className="dashboard"><header className="topbar"><div><p>{dateHeading}</p><h1>{sectionTitles[section][0]} {section === "summary" && <span>👋</span>}</h1><small className="page-subtitle">{sectionTitles[section][1]}</small></div><div className={"save-status " + (saving ? "saving" : "")}><i />{saving ? "Guardando…" : "Todo guardado"}</div></header>
      {error && <div className="error-banner">{error}<button onClick={() => setError("")}>Cerrar</button></div>}
      {section === "summary" && <>
        {quotePanel}
        <section className={"hero-row " + (loading ? "is-loading" : "")}>
          <div className="hero-primary-grid">{compactScoreCard}{compactVoiceButton}</div>
          <div className="hero-metrics" data-tiles={heroMetrics.length}>
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

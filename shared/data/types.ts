/** Formas de los datos que devuelve GET /api/progress y que usa toda la app. */
import type { ResourceNote, StudyResource } from "@/features/reading/components/study-resources";

export type User = { displayName: string; username: string; avatarUrl: string; email: string; onboardingCompleted: boolean; mainGoals: string[]; usagePreferences: string[]; isPro: boolean; proSince: string; focusDailyTargetMinutes?: number; seenAnnouncements?: string[] };
export type Meal = { id: number; name: string; detail: string; calories: number; protein: number; carbs: number; fat: number; mealDate: string };
export type BookStatus = "reading" | "read" | "wishlist";
export type Book = { id: number; title: string; author: string; status: BookStatus; totalPages: number; currentPage: number; coverUrl: string; externalKey: string };
export type BookSuggestion = { key: string; title: string; author: string; year: number | null; pages: number; coverUrl: string; languages: string[]; openLibraryUrl: string };
export type ReadingLog = { id: number; bookId: number; logDate: string; pages: number; minutes: number };
export type Note = { id: number; bookId: number; content: string; createdAt: string };
export type GoalPeriod = "weekly" | "monthly" | "annual" | "custom";
export type GoalCategory = "general" | "gym" | "training" | "nutrition" | "reading" | "study" | "work" | "sleep" | "score" | "calendar" | "stats" | "goals";
export type Goal = { id: number; title: string; period: GoalPeriod; category: GoalCategory; targetDate: string; completedAt: string | null; createdAt: string };
export type Priorities = { monthKey: string; gymWeight: number; nutritionWeight: number; readingWeight: number; sleepWeight: number; focusWeight: number; goalsWeight: number };
export type DailyCheckin = { id: number; entryDate: string; habitsJson: string; workoutDetail: string; studyMinutes: number; studyDetail: string; sleepMinutes: number; bedtime: string; wakeTime: string; sleepQuality?: "good" | "bad" | null; waterMl: number; journal: string; transcript: string; voiceSummary: string };
export type Discipline = { id: number; name: string; kind: "strength" | "running" | "cycling" | "swimming" | "sport" | "other"; priority?: "important" | "secondary" };
export type TrainingLog = { id: number; disciplineId: number; trainingDate: string; durationMinutes: number; distanceMeters: number; notes: string; quality?: number | null; planEventId?: number };
export type ExerciseLog = { id: number; trainingLogId: number; exercise: string; weightDeciKg: number; sets: number; reps: number; isRecord: boolean };
export type FocusProject = { id: number; name: string; kind: "study" | "work" };
export type FocusSession = { id: number; projectId: number; sessionDate: string; minutes: number; note: string };
export type Task = { id: number; projectId: number | null; title: string; dueDate: string | null; startTime: string; durationMinutes: number; completedAt: string | null };
export type CalendarEvent = { id: number; title: string; eventDate: string; eventTime: string; durationMinutes: number; category: "personal" | "study" | "work" | "training" | "health" | "nutrition" | "sleep" | "reading" | "other"; notes: string; completedAt: string | null; disciplineId?: number | null; quality?: number | null };
export type SlotCategory = "focus" | "training" | "nutrition" | "sleep" | "study" | "work" | "reading" | "personal" | "other";
export type VoiceCheckin = { transcript: string; summary: string; gym: { attended: boolean | null; detail: string }; meals: Array<{ name: string; detail: string; calories: number; protein: number; carbs: number; fat: number }>; reading: { bookTitle: string; pages: number; minutes: number; note: string }; habits: string[]; study: { minutes: number; detail: string; tasks: string[] }; sleep: { minutes: number; bedtime: string; wakeTime: string }; waterMl: number; journal: string; goals: Array<{ title: string; period: GoalPeriod; category: GoalCategory; targetDate: string }>; confidence: "low" | "medium" | "high" };
export type MealEstimate = { mealName: string; detail: string; estimatedCalories: number; minimumCalories: number; maximumCalories: number; protein: number; carbs: number; fat: number; confidence: "low" | "medium" | "high"; items: Array<{ name: string; portion: string; calories: number }>; caveat: string };
export type DietPlanContent = {
  summary: string; targetCalories: number; calorieRangeMinimum: number; calorieRangeMaximum: number; maintenanceCalories: number;
  goalDirection: "lose" | "maintain" | "gain"; paceText: string;
  macros: { proteinGrams: number; carbsGrams: number; fatGrams: number };
  meals: Array<{ slot: string; guidance: string; options: string[] }>;
  weeklyTips: string[]; shoppingBasics: string[]; appliedRestrictions: string[]; safetyNote: string; needsProfessional: boolean;
};
export type DietPlanRecord = {
  id: number; age: number; sex: "female" | "male" | "unspecified"; heightCm: number; currentWeightDeciKg: number; targetWeightDeciKg: number;
  activityLevel: "sedentary" | "light" | "moderate" | "high"; goalPace: "gentle" | "moderate"; preferences: string; details: string;
  targetCalories: number; planJson: string; updatedAt: string;
};
export type DietForm = {
  age: number; sex: DietPlanRecord["sex"]; heightCm: number; currentWeightKg: number; targetWeightKg: number;
  activityLevel: DietPlanRecord["activityLevel"]; goalPace: DietPlanRecord["goalPace"]; preferences: string; details: string;
};
export type DietNumberKey = "age" | "heightCm" | "currentWeightKg" | "targetWeightKg";
export type DietNumberDrafts = Record<DietNumberKey, string>;

export type ProgressData = {
  profile: User; gymDates: string[]; disciplines: Discipline[]; trainingLogs: TrainingLog[]; exerciseLogs: ExerciseLog[];
  meals: Meal[]; mealHistory: Meal[]; books: Book[]; readingLogs: ReadingLog[]; readingHistory: ReadingLog[]; notes: Note[];
  goals: Goal[]; priorities: Priorities; priorityHistory?: Priorities[]; dailyCheckin: DailyCheckin | null; dailyCheckins: DailyCheckin[];
  focusProjects: FocusProject[]; focusSessions: FocusSession[]; tasks: Task[]; events: CalendarEvent[]; dietPlan: DietPlanRecord | null;
  resources?: StudyResource[]; resourceNotes?: ResourceNote[];
};
export type Section = "summary" | "score" | "physical" | "focus" | "sleep" | "plan" | "stats" | "friends" | "pro";
export type PhysicalTab = "training" | "meals";
export type FocusTab = "study" | "work";
/** Área de la vida a la que apunta un aviso, y dónde vive ahora en la interfaz. */
export type InsightTarget = { section: Section; physicalTab?: PhysicalTab; focusTab?: FocusTab };
export type StatsPeriod = "weekly" | "monthly" | "annual";
export type SettingsView = "home" | "personal" | "language" | "notifications";
export type FeedbackType = "positive" | "idea" | "bug" | "dislike";
export type SavePhase = "saving" | "saved" | null;
export type StreakAction = "visit" | "restore" | "decline" | "dismiss_loss";

import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyAiMetrics, weeklyAiModelMetrics } from "../features/notifications/logic/weekly-ai-context";
import { isMissingWeeklyAiSchema } from "../features/notifications/logic/weekly-ai-schema";
import type { ProgressData } from "../shared/data/types";

test("la revisión semanal deriva el Daily Score y sólo incluye tareas y eventos próximos reales", () => {
  const data = {
    profile: {
      email: "ana@example.com",
      displayName: "Ana",
      username: "ana",
      avatarUrl: "",
      onboardingCompleted: true,
      mainGoals: [],
      usagePreferences: [],
      isPro: true,
      proSince: "2026-01-01",
      focusDailyTargetMinutes: 120,
    },
    gymDates: [],
    disciplines: [],
    trainingLogs: [],
    exerciseLogs: [],
    meals: [],
    mealHistory: [{ id: 1, name: "Comida", detail: "", calories: 2000, protein: 0, carbs: 0, fat: 0, mealDate: "2026-09-28" }],
    books: [],
    readingLogs: [],
    readingHistory: [],
    notes: [],
    goals: [{ id: 2, title: "Objetivo privado", category: "training", targetDate: "2026-10-10", createdAt: "2026-09-01T00:00:00Z", completedAt: null }],
    priorities: { monthKey: "2026-09", gymWeight: 2, nutritionWeight: 2, sleepWeight: 2, focusWeight: 2, readingWeight: 2, goalsWeight: 2 },
    priorityHistory: [],
    dailyCheckin: null,
    dailyCheckins: [{
      id: 1,
      entryDate: "2026-09-28",
      habitsJson: "[]",
      workoutDetail: "",
      studyMinutes: 0,
      studyDetail: "",
      sleepMinutes: 480,
      bedtime: "23:00",
      wakeTime: "07:00",
      sleepQuality: "good" as const,
      waterMl: 0,
      journal: "",
      transcript: "",
      voiceSummary: "",
    }],
    focusProjects: [],
    focusSessions: [],
    tasks: [
      { id: 1, projectId: null, title: "Repasar", dueDate: "2026-10-06", startTime: "09:00", durationMinutes: 30, completedAt: null },
      { id: 2, projectId: null, title: "Entregar", dueDate: "2026-10-08", startTime: "", durationMinutes: 0, completedAt: null },
      { id: 3, projectId: null, title: "Ya hecho", dueDate: "2026-10-06", startTime: "", durationMinutes: 30, completedAt: "2026-10-05T12:00:00Z" },
    ],
    events: [
      { id: 1, title: "Tutoría", eventDate: "2026-10-07", eventTime: "11:00", durationMinutes: 60, category: "study" as const, notes: "", completedAt: null },
    ],
    dietPlan: { targetCalories: 2000 } as ProgressData["dietPlan"],
  } as unknown as ProgressData;

  const metrics = buildWeeklyAiMetrics(data, "2026-09-28", "2026-10-05", {
    currentStreak: 4,
    bestStreak: 9,
    totalUseDays: 18,
  });

  assert.equal(metrics.activeDays, 1);
  assert.equal(metrics.averageScore, 16);
  assert.equal(metrics.bestDay?.score, 50);
  assert.equal(metrics.evidenceWeeks, 0);
  assert.deepEqual(metrics.upcoming.map((item) => item.title), ["Repasar", "Tutoría", "Entregar"]);
  const modelContext = JSON.stringify(weeklyAiModelMetrics(metrics));
  assert.equal(modelContext.includes("Repasar"), false);
  assert.equal(modelContext.includes("Tutoría"), false);
  assert.equal(modelContext.includes("Objetivo privado"), false);
  assert.equal(weeklyAiModelMetrics(metrics).openGoalCount, 1);
  assert.equal(metrics.usageStreak.currentStreak, 4);
});

test("la revisión maneja con claridad una migración semanal de IA pendiente", () => {
  assert.equal(isMissingWeeklyAiSchema(new Error("Supabase 404 (weekly_ai_reviews): PGRST205 schema cache")), true);
  assert.equal(isMissingWeeklyAiSchema(new Error("Supabase 500 (weekly_ai_memory): relation does not exist")), true);
  assert.equal(isMissingWeeklyAiSchema(new Error("network timeout")), false);
});

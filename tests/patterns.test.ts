/** Pruebas de los patrones del historial y del resumen semanal. */

import assert from "node:assert/strict";
import test from "node:test";

import { buildPatternInsights, mondayOf, rankInsights, type PatternInput } from "../app/lib/patterns";
import { buildWeeklySummary, lastClosedWeekStart, type WeeklySummaryInput } from "../app/lib/weekly-summary";
import type { Insight } from "../app/lib/insights";

// Jueves.
const TODAY = "2026-10-08";

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const base = (overrides: Partial<PatternInput> = {}): PatternInput => ({
  today: TODAY, nowMinutes: 10 * 60, training: {}, focus: {}, sleep: {}, bedtimes: {}, wakeTimes: {}, reading: {}, calories: {}, meals: {},
  scores: {}, targetCalories: 0, focusTargetMinutes: 120, trainingWeeklyTarget: 0, priorities: [], books: [], ...overrides,
});
const ids = (input: PatternInput) => buildPatternInsights(input).map((insight) => insight.id);

test("cruza sueño y foco cuando hay muestra suficiente de cada lado", () => {
  const sleep: Record<string, number> = {}, focus: Record<string, number> = {};
  for (let index = 1; index <= 10; index += 1) {
    const date = shift(TODAY, -index);
    sleep[date] = index % 2 ? 480 : 360;
    focus[date] = index % 2 ? 180 : 60;
  }
  const insight = buildPatternInsights(base({ sleep, focus })).find((item) => item.id === "pattern-sleep-focus");
  assert.ok(insight);
  assert.match(insight.title, /2 h más de foco/);
});

test("con poca muestra no inventa patrones y explica cuánto falta", () => {
  const sleep = { [shift(TODAY, -1)]: 480, [shift(TODAY, -2)]: 360 };
  const result = buildPatternInsights(base({ sleep, focus: { [shift(TODAY, -1)]: 200 } }));
  assert.deepEqual(result.map((item) => item.id), ["patterns-warming-up"]);
  assert.match(result[0].title, /4 noches más/);
});

test("meta semanal: avisa cuando ya no hay margen y festeja cuando se cumple", () => {
  const monday = mondayOf(TODAY);
  // Jueves sin entrenar: quedan jueves a domingo (4 días) y faltan 4.
  assert.ok(ids(base({ trainingWeeklyTarget: 4 })).includes("training-target-tight"));
  const done = { [monday]: 1, [shift(monday, 1)]: 1, [shift(monday, 2)]: 1 };
  assert.ok(ids(base({ trainingWeeklyTarget: 3, training: done })).includes("training-target-met"));
  assert.ok(ids(base({ trainingWeeklyTarget: 5, training: done })).includes("training-target-pending"));
});

test("una prioridad sin registros hace días aparece como alerta", () => {
  const result = buildPatternInsights(base({
    priorities: [{ area: "reading", label: "Lectura", weight: 3 }, { area: "sleep", label: "Sueño", weight: 2 }],
    reading: { [shift(TODAY, -5)]: 10 },
  }));
  const alert = result.find((item) => item.id === "priority-neglected-reading");
  assert.equal(alert?.tone, "alert");
  assert.match(alert?.title ?? "", /hace 5 días/);
});

test("racha en riesgo sólo a la tarde y si hoy no hubo registro", () => {
  const reading = { [shift(TODAY, -1)]: 10, [shift(TODAY, -2)]: 10, [shift(TODAY, -3)]: 10, [shift(TODAY, -4)]: 10 };
  assert.ok(!ids(base({ reading, nowMinutes: 10 * 60 })).includes("streak-risk-reading"));
  assert.ok(ids(base({ reading, nowMinutes: 19 * 60 })).includes("streak-risk-reading"));
  assert.ok(!ids(base({ reading: { ...reading, [TODAY]: 5 }, nowMinutes: 19 * 60 })).includes("streak-risk-reading"));
});

test("deuda de sueño propone una hora concreta para acostarse", () => {
  const sleep: Record<string, number> = {}, wakeTimes: Record<string, string> = {};
  for (let index = 0; index < 5; index += 1) { sleep[shift(TODAY, -index)] = 360; wakeTimes[shift(TODAY, -index)] = "07:00"; }
  const insight = buildPatternInsights(base({ sleep, wakeTimes })).find((item) => item.id === "sleep-debt");
  assert.match(insight?.body ?? "", /Acostarte a las 23:30/);
});

test("el ranking no repite área y deja lugar a un logro", () => {
  const make = (id: string, tone: Insight["tone"], area: "sleep" | "focus" | "training" | "reading") => ({ id, tone, area, icon: "", title: id, body: "", because: "", surface: "plan" as const });
  const ranked = rankInsights([
    make("a", "alert", "sleep"), make("b", "alert", "sleep"), make("c", "suggestion", "focus"),
    make("d", "suggestion", "training"), make("e", "suggestion", "reading"), make("f", "win", "training"),
  ], 4);
  assert.deepEqual(ranked.map((item) => item.id), ["a", "c", "d", "f"]);
});

test("la semana cerrada es la actual recién el domingo a la noche", () => {
  assert.equal(lastClosedWeekStart("2026-10-04", 19 * 60), "2026-09-21");
  assert.equal(lastClosedWeekStart("2026-10-04", 20 * 60), "2026-09-28");
  assert.equal(lastClosedWeekStart("2026-10-05", 8 * 60), "2026-09-28");
});

test("el resumen semanal arma cada área con sus números", () => {
  const monday = "2026-09-28";
  const input: WeeklySummaryInput = {
    weekStart: monday,
    scores: { [monday]: 40, [shift(monday, 3)]: 80, [shift(monday, -7)]: 20 },
    training: { [monday]: 1, [shift(monday, 2)]: 1, [shift(monday, 4)]: 1 },
    trainingWeeklyTarget: 3,
    disciplines: [{ id: 1, name: "Gimnasio", kind: "strength" }],
    trainingLogs: [{ id: 9, disciplineId: 1, trainingDate: monday, durationMinutes: 0, distanceMeters: 0, quality: 3 }],
    exerciseLogs: [{ trainingLogId: 9, exercise: "Sentadilla", weightDeciKg: 800, sets: 4, reps: 8, isRecord: true }],
    meals: [{ mealDate: monday, calories: 2000, protein: 120, carbs: 200, fat: 60 }],
    targetCalories: 2100,
    sleep: [{ entryDate: monday, sleepMinutes: 450, bedtime: "23:30", wakeTime: "07:00", sleepQuality: "good" }, { entryDate: shift(monday, 1), sleepMinutes: 390, bedtime: "00:30", wakeTime: "07:00" }],
    focus: { [monday]: 120, [shift(monday, 1)]: 60 },
    focusTargetMinutes: 120,
    focusSessions: [{ projectId: 3, sessionDate: monday, minutes: 120 }],
    focusProjects: [{ id: 3, name: "Análisis", kind: "study" }],
    readingLogs: [{ bookId: 5, logDate: monday, pages: 30, minutes: 40 }],
    books: [{ id: 5, title: "Hábitos atómicos", status: "reading", totalPages: 300, currentPage: 150 }],
    notesCreated: [`${monday}T10:00:00Z`, "2026-09-01T10:00:00Z"],
    resourcesDone: [],
    goalsCompleted: [{ title: "Correr 10 km", completedAt: `${shift(monday, 5)}T10:00:00Z` }],
    tasksCompleted: 2,
  };
  const summary = buildWeeklySummary(input);
  const area = (key: string) => summary.areas.find((item) => item.key === key)!;
  assert.equal(summary.label, "28 sept – 4 oct");
  assert.equal(summary.bestDay?.score, 80);
  assert.equal(summary.averageScore, 17);
  assert.match(area("training").headline, /Meta cumplida/);
  assert.ok(area("training").details.some((detail) => detail.includes("Récord en Sentadilla")));
  assert.equal(area("training").stats.find((stat) => stat.label === "Volumen levantado")?.value, "2.560 kg");
  assert.equal(area("focus").stats[0].value, "3 h");
  assert.equal(area("sleep").stats.find((stat) => stat.label === "Horario promedio")?.value, "00:00 → 07:00");
  assert.equal(area("reading").stats.find((stat) => stat.label === "Notas nuevas")?.value, "1");
  assert.match(area("goals").headline, /Cumpliste 1 objetivo/);
  assert.ok(summary.highlights[0].startsWith("Tu mejor día fue el jueves"));
});

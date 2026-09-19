/**
 * Pruebas de la lógica pura: agenda, huecos, rachas, tendencias y avisos.
 * Se ejecutan con `npm run test:logic` (tsx + el runner de Node).
 */

import assert from "node:assert/strict";
import test from "node:test";

import { countdownLabel, formatMinutes, listPhrase, minutesFromClock, pluralize } from "../app/lib/format";
import { dayBlocks, dayWindow, findSlot, freeSlots, overlappingBlocks, unscheduledTasks } from "../app/lib/schedule";
import { streakFor, trendFor } from "../app/lib/streaks";
import { buildInsights, closeInsights, planInsights, type InsightInput } from "../app/lib/insights";
import { dayClose, isReviewDay, weeklyReview } from "../app/lib/review";
import { dayFactors, scoreFrom, scoreLabel, scoreWeightsForDate, type DayRecord, type ScoreWeights } from "../app/lib/score";
import { quoteForDate, quotes } from "../app/lib/quotes";
import { readingPositionForDate, readingUpdateFromPosition } from "../app/lib/reading";

const TODAY = "2026-08-29";

test("la lectura se edita como página actual sin perder el avance diario", () => {
  assert.equal(readingPositionForDate(50, [{ logDate: "2026-08-29", pages: 5 }], "2026-08-28", 100), 45);
  assert.deepEqual(readingUpdateFromPosition({ currentPage: 37, totalPages: 665, previousPages: 0, laterPages: 0, requestedPosition: 40 }), {
    pages: 3, currentPage: 40, completed: false,
  });
  assert.deepEqual(readingUpdateFromPosition({ currentPage: 322, totalPages: 323, previousPages: 4, laterPages: 0, requestedPosition: 323 }), {
    pages: 5, currentPage: 323, completed: true,
  });
  assert.deepEqual(readingUpdateFromPosition({ currentPage: 323, totalPages: 323, previousPages: 0, laterPages: 0, requestedPosition: 322 }), {
    pages: 0, currentPage: 322, completed: false,
  });
});

const task = (over: Partial<Parameters<typeof dayBlocks>[0]["tasks"][number]> = {}) => ({
  id: 1, title: "Escribir el capítulo 3", dueDate: TODAY, startTime: "08:00",
  durationMinutes: 90, completedAt: null, projectId: 1, ...over,
});
const event = (over: Partial<Parameters<typeof dayBlocks>[0]["events"][number]> = {}) => ({
  id: 1, title: "Almuerzo", eventDate: TODAY, eventTime: "13:00",
  durationMinutes: 90, category: "personal", notes: "", ...over,
});

// --- format ------------------------------------------------------------------

test("countdownLabel no dice “faltan 1 días”", () => {
  assert.equal(countdownLabel(0), "hoy");
  assert.equal(countdownLabel(1), "mañana");
  assert.equal(countdownLabel(2), "faltan 2 días");
  assert.equal(countdownLabel(-1), "ayer");
  assert.equal(countdownLabel(-3), "hace 3 días");
  assert.equal(pluralize(1, "día", "días"), "1 día");
});

test("formatMinutes y listPhrase escriben en castellano", () => {
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(90), "1 h 30 min");
  assert.equal(formatMinutes(120), "2 h");
  assert.equal(listPhrase(["Entrenamiento"]), "Entrenamiento");
  assert.equal(listPhrase(["Entrenamiento", "Lectura"]), "Entrenamiento y Lectura");
  assert.equal(listPhrase(["Entrenamiento", "Lectura", "Sueño"]), "Entrenamiento, Lectura y Sueño");
});

test("minutesFromClock rechaza horas inválidas", () => {
  assert.equal(minutesFromClock("07:30"), 450);
  assert.equal(minutesFromClock("24:00"), null);
  assert.equal(minutesFromClock("7:5"), null);
  assert.equal(minutesFromClock(""), null);
});

// --- agenda ------------------------------------------------------------------

test("dayBlocks ordena por hora y separa las tareas sin horario", () => {
  const input = {
    tasks: [task(), task({ id: 2, title: "Sin hora", startTime: "" })],
    events: [event()],
    projectNames: { 1: "Tesis" },
  };
  const blocks = dayBlocks(input, TODAY);
  assert.deepEqual(blocks.map((block) => block.title), ["Escribir el capítulo 3", "Almuerzo"]);
  assert.equal(blocks[0].detail, "Tesis");
  assert.equal(blocks[0].end, 570);
  assert.deepEqual(unscheduledTasks(input, TODAY).map((row) => row.title), ["Sin hora"]);
});

test("freeSlots devuelve los huecos reales del día", () => {
  const blocks = dayBlocks({ tasks: [task()], events: [event()], projectNames: {} }, TODAY);
  const slots = freeSlots(blocks, 7 * 60, 23 * 60);
  assert.deepEqual(
    slots.map((slot) => [slot.start, slot.end]),
    [[420, 480], [570, 780], [870, 1380]],
  );
});

test("findSlot respeta la hora mínima pedida", () => {
  const slots = [{ start: 420, end: 480, minutes: 60 }, { start: 570, end: 1380, minutes: 810 }];
  assert.deepEqual(findSlot(slots, 90, 16 * 60), { start: 960, end: 1380, minutes: 420 });
  // Un bloque que no entra en ningún hueco devuelve null.
  assert.equal(findSlot([{ start: 420, end: 450, minutes: 30 }], 90), null);
});

test("overlappingBlocks detecta el choque de horarios", () => {
  const blocks = dayBlocks({
    tasks: [task({ startTime: "13:30", durationMinutes: 60 })],
    events: [event()],
    projectNames: {},
  }, TODAY);
  assert.equal(overlappingBlocks(blocks).length, 1);
});

test("dayWindow entiende una hora de acostarse después de medianoche", () => {
  assert.deepEqual(dayWindow("07:00", "23:30"), { start: 450, end: 1380 });
  // 01:10 pertenece al día siguiente: la ventana no puede terminar a la madrugada.
  assert.deepEqual(dayWindow("07:00", "01:10"), { start: 450, end: 1439 });
  assert.deepEqual(dayWindow("", ""), { start: 420, end: 1380 });
});

// --- rachas y tendencias -----------------------------------------------------

test("streakFor cuenta desde ayer cuando hoy todavía no hay registro", () => {
  const dates = ["2026-08-26", "2026-08-27", "2026-08-28"];
  const streak = streakFor(dates, TODAY);
  assert.equal(streak.current, 3);
  assert.equal(streak.pendingToday, true);

  const withToday = streakFor([...dates, TODAY], TODAY);
  assert.equal(withToday.current, 4);
  assert.equal(withToday.pendingToday, false);
});

test("streakFor corta la racha en el día faltante y recuerda el récord", () => {
  const streak = streakFor(["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", "2026-08-28"], TODAY);
  assert.equal(streak.current, 1);
  assert.equal(streak.best, 4);
});

test("trendFor compara contra el período anterior", () => {
  const values: Record<string, number> = {
    "2026-08-29": 10, "2026-08-28": 10, "2026-08-27": 10,
    "2026-08-26": 5, "2026-08-25": 5, "2026-08-24": 5,
  };
  const trend = trendFor(3, TODAY, (date) => values[date] ?? 0);
  assert.equal(trend.total, 30);
  assert.equal(trend.previousTotal, 15);
  assert.equal(trend.deltaPercent, 100);
  assert.equal(trend.points.length, 3);
});

// --- avisos ------------------------------------------------------------------

function baseInput(over: Partial<InsightInput> = {}): InsightInput {
  return {
    today: TODAY,
    nowMinutes: 7 * 60,
    blocks: [],
    slots: [],
    dayWindow: { start: 420, end: 1380 },
    unscheduled: [],
    sleepLastNight: 8 * 60,
    sleepRecent: [],
    sleepEarlier: [],
    caloriesToday: 0,
    targetCalories: 0,
    pagesLast3Days: 5,
    booksInProgress: 0,
    goalsDueSoon: [],
    activeCategories: new Set<string>(),
    overlaps: [],
    comingDays: [],
    ...over,
  };
}

test("dormiste poco + bloque de foco a la mañana ⇒ propone moverlo a un hueco", () => {
  const blocks = dayBlocks({ tasks: [task()], events: [event()], projectNames: {} }, TODAY);
  const slots = freeSlots(blocks, 420, 1380);
  const insights = buildInsights(baseInput({
    sleepLastNight: 350,
    blocks,
    slots,
    nowMinutes: 7 * 60,
  }));

  const moved = insights.find((insight) => insight.id === "sleep-move-focus");
  assert.ok(moved, "debería aparecer la sugerencia de mover el bloque");
  assert.equal(moved.tone, "alert");
  assert.match(moved.title, /Dormiste 5 h 50 min/);
  assert.equal(moved.action?.kind, "schedule_task");
  assert.equal(moved.action?.kind === "schedule_task" && moved.action.taskId, 1);
  // El hueco elegido tiene que ser posterior a las 16:00, no otra vez a la mañana.
  assert.equal(moved.action?.kind === "schedule_task" && moved.action.startTime, "16:00");
});

test("sin bloque de foco por delante, el aviso de sueño es sólo informativo", () => {
  const insights = buildInsights(baseInput({ sleepLastNight: 350, nowMinutes: 14 * 60 }));
  assert.ok(insights.some((insight) => insight.id === "sleep-short"));
  assert.ok(!insights.some((insight) => insight.id === "sleep-move-focus"));
});

test("una noche completa no dispara ningún aviso de sueño", () => {
  const insights = buildInsights(baseInput({ sleepLastNight: 8 * 60 }));
  assert.ok(!insights.some((insight) => insight.id.startsWith("sleep-")));
});

test("el día sobrecargado se mide contra las horas despierto", () => {
  const blocks = dayBlocks({
    tasks: [task({ startTime: "08:00", durationMinutes: 480 })],
    events: [],
    projectNames: {},
  }, TODAY);
  const insights = buildInsights(baseInput({ blocks, dayWindow: { start: 480, end: 1020 } }));
  assert.ok(insights.some((insight) => insight.id === "overloaded"));
});

test("los avisos urgentes van primero", () => {
  const blocks = dayBlocks({ tasks: [task()], events: [event()], projectNames: {} }, TODAY);
  const insights = buildInsights(baseInput({
    sleepLastNight: 350,
    blocks,
    slots: freeSlots(blocks, 420, 1380),
    booksInProgress: 2,
    pagesLast3Days: 0,
  }));
  assert.equal(insights[0].tone, "alert");
  assert.ok(insights.length >= 2);
  // Ninguna sugerencia se cuela antes de una alerta.
  const primeraSugerencia = insights.findIndex((insight) => insight.tone === "suggestion");
  const ultimaAlerta = insights.map((insight) => insight.tone).lastIndexOf("alert");
  assert.ok(primeraSugerencia === -1 || primeraSugerencia > ultimaAlerta);
});

// --- frase del día -----------------------------------------------------------

test("la frase del día es estable y siempre tiene autor", () => {
  assert.deepEqual(quoteForDate(TODAY), quoteForDate(TODAY));
  assert.notEqual(quoteForDate("2026-08-29").text, quoteForDate("2026-09-14").text);
  for (const quote of quotes) {
    assert.ok(quote.text.length > 10, `frase demasiado corta: ${quote.text}`);
    assert.ok(quote.author.length > 2, `falta autor en: ${quote.text}`);
  }
});

// ---------------------------------------------------------------------------
// Daily Score
// ---------------------------------------------------------------------------

const emptyDay: DayRecord = {
  trainingSessions: 0, meals: 0, sleepMinutes: 0, focusMinutes: 0, pages: 0,
  completedSomething: false, hasOpenGoals: false,
};
const evenWeights: ScoreWeights = {
  gymWeight: 2, nutritionWeight: 2, sleepWeight: 2, focusWeight: 2, readingWeight: 2, goalsWeight: 2,
};

test("un día completo llega a 100 y uno vacío a 0", () => {
  const full: DayRecord = {
    trainingSessions: 1, meals: 3, sleepMinutes: 8 * 60, focusMinutes: 2 * 60, pages: 10,
    completedSomething: true, hasOpenGoals: true,
  };
  assert.equal(scoreFrom(dayFactors(full), evenWeights), 100);
  assert.equal(scoreFrom(dayFactors(emptyDay), evenWeights), 0);
});

test("ningún factor pasa de 100 por más que te excedas", () => {
  const excess: DayRecord = { ...emptyDay, trainingSessions: 4, meals: 9, sleepMinutes: 14 * 60, focusMinutes: 10 * 60, pages: 400 };
  const factors = dayFactors(excess);
  for (const [name, value] of Object.entries(factors)) {
    assert.ok(value <= 100, `${name} se pasó de 100: ${value}`);
  }
});

test("un objetivo abierto sin cerrar nada vale la mitad", () => {
  assert.equal(dayFactors({ ...emptyDay, hasOpenGoals: true }).goals, 50);
  assert.equal(dayFactors({ ...emptyDay, hasOpenGoals: true, completedSomething: true }).goals, 100);
});

test("las prioridades cambian el puntaje del mismo día", () => {
  const soloEntrenamiento: DayRecord = { ...emptyDay, trainingSessions: 1 };
  const factors = dayFactors(soloEntrenamiento);
  const parejo = scoreFrom(factors, evenWeights);
  const priorizado = scoreFrom(factors, { ...evenWeights, gymWeight: 3, sleepWeight: 1, readingWeight: 1 });
  assert.ok(priorizado > parejo, `priorizar entrenamiento debería subir el puntaje: ${priorizado} vs ${parejo}`);
});

test("corregir ayer recalcula todas las áreas sin modificar hoy", () => {
  const todayRecord: DayRecord = { ...emptyDay, focusMinutes: 120, pages: 10 };
  const yesterdayBefore: DayRecord = { ...emptyDay, focusMinutes: 60, focusTargetMinutes: 120 };
  const todayScore = scoreFrom(dayFactors(todayRecord), evenWeights);
  const yesterdayScore = scoreFrom(dayFactors(yesterdayBefore), evenWeights);

  const corrections: DayRecord[] = [
    { ...yesterdayBefore, trainingSessions: 1, trainingScore: 80 },
    { ...yesterdayBefore, meals: 3, calories: 2000, targetCalories: 2000 },
    { ...yesterdayBefore, sleepMinutes: 8 * 60, sleepQuality: "good" },
    { ...yesterdayBefore, focusMinutes: 120 },
    { ...yesterdayBefore, pages: 10 },
  ];
  for (const corrected of corrections) {
    assert.ok(scoreFrom(dayFactors(corrected), evenWeights) > yesterdayScore);
  }

  assert.ok(scoreFrom(dayFactors({ ...yesterdayBefore, focusMinutes: 15 }), evenWeights) < yesterdayScore);
  assert.ok(scoreFrom(dayFactors({ ...yesterdayBefore, sleepMinutes: 8 * 60, sleepQuality: "bad" }), evenWeights)
    < scoreFrom(dayFactors({ ...yesterdayBefore, sleepMinutes: 8 * 60, sleepQuality: "good" }), evenWeights));
  assert.equal(scoreFrom(dayFactors(todayRecord), evenWeights), todayScore);
});

test("cada fecha usa las prioridades del mes al que pertenece", () => {
  const september = { monthKey: "2026-09", ...evenWeights, gymWeight: 3, readingWeight: 1 };
  const october = { monthKey: "2026-10", ...evenWeights, gymWeight: 1, readingWeight: 3 };
  const history = [september, october];

  assert.equal(scoreWeightsForDate("2026-09-30", history, october).gymWeight, 3);
  assert.equal(scoreWeightsForDate("2026-10-01", history, september).readingWeight, 3);
  assert.equal(scoreWeightsForDate("fecha-invalida", history, evenWeights), evenWeights);
});

test("sin peso en ninguna área el puntaje es 0 y no NaN", () => {
  const sinPeso: ScoreWeights = { gymWeight: 0, nutritionWeight: 0, sleepWeight: 0, focusWeight: 0, readingWeight: 0, goalsWeight: 0 };
  assert.equal(scoreFrom(dayFactors(emptyDay), sinPeso), 0);
});

test("la etiqueta del puntaje cambia en los umbrales", () => {
  assert.equal(scoreLabel(75), "Tu día va muy bien");
  assert.equal(scoreLabel(74), "Cada acción suma");
  assert.equal(scoreLabel(40), "Cada acción suma");
  assert.equal(scoreLabel(39), "Recién empezás");
});

test("el día sobrecargado propone a qué día correr el último bloque", () => {
  const blocks = dayBlocks({
    tasks: [task({ id: 7, title: "Informe", startTime: "19:00", durationMinutes: 120 })],
    events: [event({ eventTime: "08:00", durationMinutes: 600 })],
    projectNames: {},
  }, TODAY);

  const insights = buildInsights(baseInput({
    blocks,
    dayWindow: { start: 420, end: 1320 },
    nowMinutes: 8 * 60,
    comingDays: [{ date: "2026-01-02", label: "el viernes", slots: [{ start: 600, end: 900, minutes: 300 }] }],
  }));

  const aviso = insights.find((insight) => insight.id === "overloaded");
  assert.ok(aviso, "el día sobrecargado debería avisar");
  assert.equal(aviso.action?.kind, "schedule_task");
  assert.equal(aviso.action?.kind === "schedule_task" && aviso.action.taskId, 7);
  assert.equal(aviso.action?.kind === "schedule_task" && aviso.action.date, "2026-01-02");
  assert.equal(aviso.action?.kind === "schedule_task" && aviso.action.startTime, "10:00");
});

test("sin días libres por delante, el aviso de sobrecarga sólo abre la agenda", () => {
  const blocks = dayBlocks({
    tasks: [task({ id: 7, title: "Informe", startTime: "19:00", durationMinutes: 120 })],
    events: [event({ eventTime: "08:00", durationMinutes: 600 })],
    projectNames: {},
  }, TODAY);
  const insights = buildInsights(baseInput({ blocks, dayWindow: { start: 420, end: 1320 }, nowMinutes: 8 * 60 }));
  const aviso = insights.find((insight) => insight.id === "overloaded");
  assert.equal(aviso?.action?.kind, "open");
});

test("el plan del día no muestra más de tres avisos, y sólo los accionables", () => {
  const blocks = dayBlocks({ tasks: [task()], events: [event()], projectNames: {} }, TODAY);
  const insights = buildInsights(baseInput({
    blocks,
    slots: freeSlots(blocks, 420, 1380),
    sleepLastNight: 350,
    sleepRecent: [300, 310, 320],
    sleepEarlier: [480, 470, 490, 480, 470, 480, 470],
    nowMinutes: 21 * 60,
    caloriesToday: 500,
    targetCalories: 2400,
    pagesLast3Days: 0,
    booksInProgress: 2,
  }));

  const plan = planInsights(insights);
  const cierre = closeInsights(insights);
  assert.ok(plan.length <= 3, `el plan mostró ${plan.length} avisos`);
  assert.ok(plan.every((insight) => insight.surface === "plan"));
  // Los informativos existen, pero no compiten por el plan del día.
  assert.ok(cierre.some((insight) => insight.id === "calories-under"));
  assert.ok(cierre.some((insight) => insight.id === "reading-stalled"));
  assert.ok(!plan.some((insight) => insight.id === "calories-under"));
});

// --- cierres -----------------------------------------------------------------

test("el cierre del día cuenta lo que pasó y lo que quedó", () => {
  const blocks = dayBlocks({
    tasks: [task({ id: 1, title: "Estudiar", completedAt: "2026-01-01 20:00:00" }), task({ id: 2, title: "Leer", startTime: "18:00" })],
    events: [],
    projectNames: {},
  }, TODAY);

  const cierre = dayClose({ score: 78, blocks, trained: true, sleepMinutes: 440, focusMinutes: 90, pages: 24, meals: 3, calories: 2100 });
  assert.match(cierre.headline, /78\/100/);
  assert.equal(cierre.blocksDone, 1);
  assert.equal(cierre.blocksTotal, 2);
  assert.deepEqual(cierre.pending, ["Leer"]);
  assert.ok(cierre.done.includes("entrenaste"));
  assert.ok(cierre.done.some((item) => item.includes("7 h 20 min")));
});

test("un día sin nada registrado lo dice, no inventa un balance", () => {
  const cierre = dayClose({ score: 0, blocks: [], trained: false, sleepMinutes: 0, focusMinutes: 0, pages: 0, meals: 0, calories: 0 });
  assert.match(cierre.headline, /Todavía no hay nada registrado/);
  assert.deepEqual(cierre.done, []);
});

test("la revisión semanal marca las áreas quietas y el mejor día", () => {
  const review = weeklyReview({
    days: [
      { date: "2026-01-05", blocks: [], score: 40 },
      { date: "2026-01-06", blocks: [], score: 82 },
      { date: "2026-01-07", blocks: [], score: 61 },
    ],
    areas: [{ label: "Entrenamiento", activeDays: 3 }, { label: "Lectura", activeDays: 0 }],
    staleGoals: [{ id: 4, title: "Correr 10 km", days: 14 }],
  });

  assert.equal(review.averageScore, 61);
  assert.deepEqual(review.bestDay, { date: "2026-01-06", score: 82 });
  assert.deepEqual(review.quietAreas, ["Lectura"]);
  assert.equal(review.staleGoals.length, 1);
});

test("el corte semanal cae en domingo", () => {
  assert.equal(isReviewDay("2026-01-04"), true);
  assert.equal(isReviewDay("2026-01-05"), false);
});

/**
 * Motor de avisos. Reglas deterministas sobre los datos que la app ya tiene:
 * sin IA, sin llamadas de red y sin nada que el usuario no pueda reconstruir
 * leyendo la explicación de cada aviso.
 *
 * La idea es que los módulos se hablen entre sí. Dormiste poco anoche y tenés
 * un bloque de estudio a las 8 de la mañana: eso lo sabe Sueño y lo sufre
 * Estudio, y hasta ahora ninguna de las dos secciones se enteraba de la otra.
 *
 * Cada regla devuelve, cuando puede, una acción concreta: no "dormiste poco"
 * sino "moveme ese bloque a las 17:00, que tenés el hueco libre".
 */

import { clockFromMinutes, formatMinutes, listPhrase, pluralize } from "./format";
import { type Block, type Slot, findSlot } from "./schedule";

export type InsightTone = "alert" | "suggestion" | "win";

export type InsightAction =
  | { kind: "schedule_task"; label: string; taskId: number; startTime: string; durationMinutes: number; date?: string }
  | { kind: "open"; label: string; section: string };

export type Insight = {
  id: string;
  tone: InsightTone;
  icon: string;
  title: string;
  body: string;
  /** Por qué la app dice esto. Se muestra al desplegar el aviso. */
  because: string;
  /**
   * "plan" compite por los tres lugares del plan del día; "close" sólo aparece
   * en el cierre. La diferencia es si el aviso propone un cambio concreto o
   * solamente cuenta algo: el plan del día es para decidir, no para leer.
   */
  surface: InsightSurface;
  action?: InsightAction;
};

export type InsightSurface = "plan" | "close";

/** Avisos que informan pero no proponen un cambio: van al cierre del día. */
const CLOSE_ONLY = new Set(["sleep-short", "sleep-trend", "calories-under", "reading-stalled"]);

/** Cuántos avisos entran en el plan del día antes de volverse ruido. */
export const PLAN_INSIGHT_LIMIT = 3;

export type InsightInput = {
  today: string;
  /** Minutos desde medianoche, para no sugerir horarios que ya pasaron. */
  nowMinutes: number;
  blocks: Block[];
  slots: Slot[];
  dayWindow: { start: number; end: number };
  unscheduled: Array<{ id: number; title: string; durationMinutes: number }>;
  sleepLastNight: number;
  sleepRecent: number[];
  sleepEarlier: number[];
  caloriesToday: number;
  targetCalories: number;
  pagesLast3Days: number;
  booksInProgress: number;
  goalsDueSoon: Array<{ title: string; days: number; category: string }>;
  activeCategories: Set<string>;
  overlaps: Array<[Block, Block]>;
  /** Los próximos días con sus huecos, para poder correr algo de hoy a mañana. */
  comingDays: ComingDay[];
};

export type ComingDay = { date: string; label: string; slots: Slot[] };

/** Primer día de los que vienen donde entra un bloque de `minutes`. */
function findComingSlot(days: ComingDay[], minutes: number) {
  for (const day of days) {
    const slot = findSlot(day.slots, minutes);
    if (slot) return { date: day.date, label: day.label, slot };
  }
  return null;
}

/** Debajo de esto tratamos la noche como corta. */
const SHORT_SLEEP_MINUTES = 6.5 * 60;
const GOOD_SLEEP_MINUTES = 7 * 60;
/** La franja donde el cansancio de una noche corta pega más fuerte. */
const MORNING_END = 12 * 60;
/** A partir de esta hora conviene reprogramar el foco. */
const RECOVERY_HOUR = 16 * 60;

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const isFocusBlock = (block: Block) => block.category === "study" || block.category === "work" || block.category === "task";

export function buildInsights(input: InsightInput): Insight[] {
  type Rule = Omit<Insight, "surface">;
  const insights: Rule[] = [];

  // 1. Sueño corto + foco temprano → proponer mover el bloque a la tarde.
  if (input.sleepLastNight > 0 && input.sleepLastNight < SHORT_SLEEP_MINUTES) {
    const horas = formatMinutes(input.sleepLastNight);
    const morningFocus = input.blocks
      .filter((block) => !block.done && isFocusBlock(block) && block.start < MORNING_END && block.end > input.nowMinutes)
      .sort((first, second) => first.start - second.start)[0];

    if (morningFocus?.taskId) {
      const slot = findSlot(input.slots, morningFocus.minutes, Math.max(RECOVERY_HOUR, input.nowMinutes));
      insights.push({
        id: "sleep-move-focus",
        tone: "alert",
        icon: "☾",
        title: `Dormiste ${horas}. Tu bloque más exigente es a las ${clockFromMinutes(morningFocus.start)}.`,
        body: slot
          ? `Después de una noche corta la mañana es la peor franja para concentrarte. Tenés libre de ${clockFromMinutes(slot.start)} a ${clockFromMinutes(slot.end)}: mover “${morningFocus.title}” ahí te da la misma cantidad de tiempo en mejor estado.`
          : `Después de una noche corta la mañana es la peor franja para concentrarte, y hoy no te queda ningún hueco libre para mover “${morningFocus.title}”. Si podés, cortalo en dos y dejá la parte difícil para más tarde.`,
        because: `Menos de ${formatMinutes(SHORT_SLEEP_MINUTES)} de sueño y un bloque de foco antes de las 12:00.`,
        action: slot
          ? { kind: "schedule_task", label: `Mover a las ${clockFromMinutes(slot.start)}`, taskId: morningFocus.taskId, startTime: clockFromMinutes(slot.start), durationMinutes: morningFocus.minutes }
          : { kind: "open", label: "Ver la agenda", section: "calendar" },
      });
    } else {
      insights.push({
        id: "sleep-short",
        tone: "alert",
        icon: "☾",
        title: `Dormiste ${horas}: hoy el foco va a costar más.`,
        body: "Es un buen día para bloques cortos y tareas mecánicas. Dejá lo que exige pensar para después del mediodía, cuando el cansancio afloja.",
        because: `El último registro de sueño está por debajo de ${formatMinutes(SHORT_SLEEP_MINUTES)}.`,
        action: { kind: "open", label: "Ir a Estudio / Trabajo", section: "focus" },
      });
    }
  }

  // 2. Noche buena + mañana libre → aprovecharla para lo difícil.
  if (input.sleepLastNight >= GOOD_SLEEP_MINUTES && input.unscheduled.length && input.nowMinutes < MORNING_END) {
    const task = input.unscheduled[0];
    const minutes = Math.max(30, task.durationMinutes || 60);
    const slot = findSlot(input.slots, minutes, Math.max(input.nowMinutes, input.dayWindow.start));
    if (slot && slot.start < MORNING_END) {
      insights.push({
        id: "sleep-good-morning",
        tone: "suggestion",
        icon: "◉",
        title: `Dormiste ${formatMinutes(input.sleepLastNight)} y tenés la mañana libre.`,
        body: `Es la mejor ventana del día para lo que más cuesta. “${task.title}” entra de ${clockFromMinutes(slot.start)} a ${clockFromMinutes(slot.start + minutes)}.`,
        because: "Noche completa registrada y un hueco libre antes del mediodía.",
        action: { kind: "schedule_task", label: `Agendar ${clockFromMinutes(slot.start)}`, taskId: task.id, startTime: clockFromMinutes(slot.start), durationMinutes: minutes },
      });
    }
  }

  // 3. Choque de horarios.
  if (input.overlaps.length) {
    const [first, second] = input.overlaps[0];
    insights.push({
      id: "overlap",
      tone: "alert",
      icon: "▣",
      title: "Tenés dos cosas al mismo tiempo.",
      body: `“${first.title}” termina ${clockFromMinutes(first.end)} y “${second.title}” arranca ${clockFromMinutes(second.start)}. Algo se va a caer solo.`,
      because: "Dos bloques del día se superponen.",
      action: { kind: "open", label: "Acomodar la agenda", section: "calendar" },
    });
  }

  // 5. El sueño viene bajando comparado con la semana previa.
  const recentSleep = average(input.sleepRecent);
  const earlierSleep = average(input.sleepEarlier);
  if (input.sleepRecent.length >= 3 && earlierSleep > 0 && earlierSleep - recentSleep >= 45) {
    insights.push({
      id: "sleep-trend",
      tone: "suggestion",
      icon: "▽",
      title: `Estás durmiendo ${formatMinutes(earlierSleep - recentSleep)} menos que la semana pasada.`,
      body: `Venís de un promedio de ${formatMinutes(earlierSleep)} y estas últimas noches diste ${formatMinutes(recentSleep)}. Todavía no es un problema, pero si sigue así lo vas a sentir en el foco.`,
      because: "Promedio de las últimas 3 noches contra el de las 7 anteriores.",
      action: { kind: "open", label: "Ver Sueño", section: "sleep" },
    });
  }

  // 6. Día sobrecargado: no alcanza con avisar, hay que decir qué correr.
  const scheduled = input.blocks.filter((block) => !block.done).reduce((sum, block) => sum + block.minutes, 0);
  const awake = input.dayWindow.end - input.dayWindow.start;
  if (awake > 0 && scheduled / awake > 0.7) {
    // Lo último del día es lo que menos arrastra al resto si se corre.
    const movable = input.blocks
      .filter((block) => !block.done && block.taskId && block.end > input.nowMinutes)
      .sort((first, second) => second.start - first.start)[0];
    const destination = movable ? findComingSlot(input.comingDays, movable.minutes) : null;

    insights.push({
      id: "overloaded",
      tone: "suggestion",
      icon: "◱",
      title: `Tenés ${formatMinutes(scheduled)} agendados en un día de ${formatMinutes(awake)}.`,
      body: destination && movable
        ? `Sin huecos entre bloques, el primer retraso arrastra a todo lo demás. “${movable.title}” es lo último que entra hoy, y ${destination.label} tenés libre de ${clockFromMinutes(destination.slot.start)} a ${clockFromMinutes(destination.slot.end)}.`
        : "Sin huecos entre bloques, el primer retraso arrastra a todo lo demás. Mirá si algo puede pasar a otro día.",
      because: "Los bloques ocupan más del 70 % de tu ventana despierto.",
      action: destination && movable?.taskId
        ? { kind: "schedule_task", label: `Pasar a ${destination.label}`, taskId: movable.taskId, startTime: clockFromMinutes(destination.slot.start), durationMinutes: movable.minutes, date: destination.date }
        : { kind: "open", label: "Ver la agenda", section: "calendar" },
    });
  }

  // 7. Tareas sin hora y hueco disponible.
  if (input.unscheduled.length && !insights.some((insight) => insight.id === "sleep-good-morning")) {
    const task = input.unscheduled[0];
    const minutes = Math.max(30, task.durationMinutes || 60);
    const slot = findSlot(input.slots, minutes, Math.max(input.nowMinutes, input.dayWindow.start));
    if (slot) {
      insights.push({
        id: "unscheduled",
        tone: "suggestion",
        icon: "◷",
        title: `${pluralize(input.unscheduled.length, "tarea sin hora", "tareas sin hora")} para hoy.`,
        body: `Tenés libre de ${clockFromMinutes(slot.start)} a ${clockFromMinutes(slot.end)}. Ponerle hora a “${task.title}” es lo que hace que aparezca en el plan del día.`,
        because: "Hay tareas con fecha de hoy sin horario y al menos un hueco libre.",
        action: { kind: "schedule_task", label: `Agendar ${clockFromMinutes(slot.start)}`, taskId: task.id, startTime: clockFromMinutes(slot.start), durationMinutes: minutes },
      });
    }
  }

  // 8. Calorías lejos del objetivo del plan, ya avanzado el día.
  if (input.targetCalories > 0 && input.nowMinutes >= 20 * 60) {
    const ratio = input.caloriesToday / input.targetCalories;
    if (input.caloriesToday > 0 && ratio < 0.6) {
      insights.push({
        id: "calories-under",
        tone: "suggestion",
        icon: "◇",
        title: `Registraste ${input.caloriesToday.toLocaleString("es-AR")} kcal de ${input.targetCalories.toLocaleString("es-AR")}.`,
        body: "O comiste bastante menos que tu objetivo, o hay comidas del día sin cargar. Las dos cosas conviene saberlas antes de dormir.",
        because: "Después de las 20:00 con menos del 60 % de las calorías objetivo registradas.",
        action: { kind: "open", label: "Ir a Comidas", section: "meals" },
      });
    }
  }

  // 9. Objetivo cerca sin movimiento en su área.
  const stalled = input.goalsDueSoon.find((goal) => !input.activeCategories.has(goal.category));
  if (stalled) {
    insights.push({
      id: "goal-stalled",
      tone: "suggestion",
      icon: "◎",
      title: `“${stalled.title}” vence en ${pluralize(stalled.days, "día", "días")}.`,
      body: "No hay ningún registro reciente en esa área. Si ya no va a pasar, cerralo; si todavía querés, hoy es el día de darle un paso.",
      because: "Objetivo con vencimiento cercano y sin actividad en su categoría en los últimos 5 días.",
      action: { kind: "open", label: "Ver Objetivos", section: "goals" },
    });
  }

  // 10. Libro empezado y frenado.
  if (input.booksInProgress > 0 && input.pagesLast3Days === 0) {
    insights.push({
      id: "reading-stalled",
      tone: "suggestion",
      icon: "▱",
      title: "Hace tres días que no anotás páginas.",
      body: `Tenés ${pluralize(input.booksInProgress, "libro empezado", "libros empezados")}. Diez páginas cuentan igual que cincuenta para no perder el hilo.`,
      because: "Libros en estado “leyendo” sin registros de lectura en 3 días.",
      action: { kind: "open", label: "Ir a Biblioteca", section: "books" },
    });
  }

  const order: Record<InsightTone, number> = { alert: 0, suggestion: 1, win: 2 };
  return insights
    .map((insight) => ({ ...insight, surface: CLOSE_ONLY.has(insight.id) ? "close" as const : "plan" as const }))
    .sort((first, second) => order[first.tone] - order[second.tone]);
}

/** Los avisos que sí proponen un cambio, recortados a lo que se puede decidir. */
export function planInsights(insights: Insight[]) {
  return insights.filter((insight) => insight.surface === "plan").slice(0, PLAN_INSIGHT_LIMIT);
}

/** Lo informativo, que se lee al final del día y no interrumpe el plan. */
export function closeInsights(insights: Insight[]) {
  return insights.filter((insight) => insight.surface === "close");
}

/** Resumen en una línea para el encabezado del plan del día. */
export function insightHeadline(insights: Insight[], score: number, priorities: string[]) {
  const alerts = insights.filter((insight) => insight.tone === "alert").length;
  if (alerts) return `${pluralize(alerts, "cosa", "cosas")} para acomodar antes de arrancar.`;
  const suggestions = insights.filter((insight) => insight.tone === "suggestion").length;
  if (suggestions) return `${pluralize(suggestions, "sugerencia", "sugerencias")} para que el día rinda más.`;
  if (insights.length) return "Tus datos muestran cosas que van bien.";
  if (score >= 75) return "El día viene bien encaminado.";
  return priorities.length ? `Tu foco de este mes: ${listPhrase(priorities).toLowerCase()}.` : "Nada urgente. Arrancá por lo más difícil.";
}

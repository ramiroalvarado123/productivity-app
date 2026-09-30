/**
 * El plan del día: junta tareas con horario y eventos del calendario en una
 * sola línea de tiempo, y encuentra huecos libres para poder proponer cambios.
 * Todo es aritmética sobre minutos desde medianoche.
 */

import { minutesFromClock } from "./format";

export type BlockKind = "task" | "event";

export type Block = {
  key: string;
  kind: BlockKind;
  category: string;
  title: string;
  detail: string;
  /** Minutos desde medianoche. */
  start: number;
  minutes: number;
  end: number;
  taskId?: number;
  eventId?: number;
  projectId?: number | null;
  disciplineId?: number | null;
  done: boolean;
};

export type Slot = { start: number; end: number; minutes: number };

export type ScheduleInput = {
  tasks: Array<{ id: number; title: string; dueDate: string | null; startTime: string; durationMinutes: number; completedAt: string | null; projectId: number | null }>;
  events: Array<{ id: number; title: string; eventDate: string; eventTime: string; durationMinutes: number; category: string; notes: string; completedAt: string | null; disciplineId?: number | null }>;
  projectNames: Record<number, string>;
  projectKinds?: Record<number, "study" | "work">;
  disciplineNames?: Record<number, string>;
};

export const DEFAULT_DAY_START = 7 * 60;
export const DEFAULT_DAY_END = 23 * 60;
/** Horas visibles en la agenda semanal de Plan; incluye un turno que empieza a las 23:00. */
export const PLAN_AGENDA_HOURS = Array.from({ length: 19 }, (_, index) => index + 5);
/** Un bloque más corto que esto no se ofrece como hueco útil. */
export const MIN_USEFUL_SLOT = 30;

/**
 * Clasifica una tarea sin proyecto para que un bloque del plan pueda impactar
 * el área correcta al completarse. Las tareas con proyecto usan su tipo
 * (estudio/trabajo); estas palabras clave cubren entrenamientos y hábitos que
 * se suelen agendar como tarea rápida.
 */
export function inferTaskCategory(title: string) {
  const normalized = title.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/(entren|gimnas|\bgym\b|correr|running|futbol|deporte|pesas|natacion|nadar|biciclet|ciclismo|yoga|pilates)/.test(normalized)) return "training";
  if (/(desayun|almorz|cenar|comer|cocinar|nutric|aliment)/.test(normalized)) return "nutrition";
  if (/(leer|lectura|libro|pagina)/.test(normalized)) return "reading";
  if (/(dormir|sueno|descansar|acostar)/.test(normalized)) return "sleep";
  return "task";
}

/** Bloques con horario asignado para una fecha, ordenados por hora de inicio. */
export function dayBlocks(input: ScheduleInput, date: string): Block[] {
  const blocks: Block[] = [];

  for (const task of input.tasks) {
    if (task.dueDate !== date) continue;
    const start = minutesFromClock(task.startTime);
    if (start === null) continue;
    const minutes = Math.max(15, task.durationMinutes || 60);
    blocks.push({
      key: `t${task.id}`,
      kind: "task",
      category: task.projectId ? input.projectKinds?.[task.projectId] ?? "study" : inferTaskCategory(task.title),
      title: task.title,
      detail: task.projectId ? input.projectNames[task.projectId] ?? "" : "",
      start,
      minutes,
      end: start + minutes,
      taskId: task.id,
      projectId: task.projectId,
      done: Boolean(task.completedAt),
    });
  }

  for (const event of input.events) {
    if (event.eventDate !== date) continue;
    const start = minutesFromClock(event.eventTime);
    if (start === null) continue;
    const minutes = Math.max(15, event.durationMinutes || 60);
    blocks.push({
      key: `e${event.id}`,
      kind: "event",
      category: event.category,
      title: event.title,
      detail: event.disciplineId ? input.disciplineNames?.[event.disciplineId] ?? event.notes : event.notes,
      start,
      minutes,
      end: start + minutes,
      eventId: event.id,
      disciplineId: event.disciplineId ?? null,
      done: Boolean(event.completedAt),
    });
  }

  return blocks.sort((first, second) => first.start - second.start || first.minutes - second.minutes);
}

/** Tareas de la fecha que todavía no tienen hora asignada. */
export function unscheduledTasks(input: ScheduleInput, date: string) {
  return input.tasks.filter((task) => task.dueDate === date && minutesFromClock(task.startTime) === null);
}

/** Huecos libres dentro de la ventana del día, ignorando bloques ya cumplidos. */
export function freeSlots(blocks: Block[], dayStart: number, dayEnd: number, minimumMinutes = MIN_USEFUL_SLOT): Slot[] {
  const busy = blocks
    .filter((block) => !block.done)
    .map((block) => ({ start: block.start, end: block.end }))
    .sort((first, second) => first.start - second.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const span of busy) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }

  const slots: Slot[] = [];
  let cursor = dayStart;
  for (const span of merged) {
    if (span.start - cursor >= minimumMinutes) slots.push({ start: cursor, end: span.start, minutes: span.start - cursor });
    cursor = Math.max(cursor, span.end);
  }
  if (dayEnd - cursor >= minimumMinutes) slots.push({ start: cursor, end: dayEnd, minutes: dayEnd - cursor });

  return slots;
}

/**
 * Primer hueco donde entra un bloque de `minutes`, no antes de `notBefore`.
 * Es lo que convierte un aviso ("vas a rendir peor") en una acción concreta
 * ("moverlo a las 17:00").
 */
export function findSlot(slots: Slot[], minutes: number, notBefore = 0): Slot | null {
  for (const slot of slots) {
    const start = Math.max(slot.start, notBefore);
    if (slot.end - start >= minutes) return { start, end: slot.end, minutes: slot.end - start };
  }
  return null;
}

/** Bloques que se pisan entre sí, para poder avisar del choque. */
export function overlappingBlocks(blocks: Block[]): Array<[Block, Block]> {
  const active = blocks.filter((block) => !block.done).sort((first, second) => first.start - second.start);
  const collisions: Array<[Block, Block]> = [];
  for (let index = 1; index < active.length; index += 1) {
    if (active[index].start < active[index - 1].end) collisions.push([active[index - 1], active[index]]);
  }
  return collisions;
}

/** Ventana despierto del día, derivada del último registro de sueño. */
export function dayWindow(wakeTime: string, bedtime: string) {
  const wake = minutesFromClock(wakeTime);
  const bedClock = minutesFromClock(bedtime);
  // Acostarse "01:10" pertenece al día siguiente: sin este ajuste la ventana
  // del día terminaría a la madrugada y no quedaría ningún hueco a la tarde.
  const bed = bedClock === null ? null : bedClock < 12 * 60 ? bedClock + 24 * 60 : bedClock;
  return {
    start: wake === null ? DEFAULT_DAY_START : Math.min(wake + 30, 12 * 60),
    end: bed === null ? DEFAULT_DAY_END : Math.min(Math.max(bed - 30, 18 * 60), 24 * 60 - 1),
  };
}

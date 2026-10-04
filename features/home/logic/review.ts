/**
 * Los dos cortes: el del día y el de la semana.
 *
 * El plan del día sirve para decidir qué hacer ahora. Estos cortes son lo
 * contrario: miran hacia atrás y cuentan lo que efectivamente pasó, que es lo
 * único que hace que un día flojo no se sienta como un día vacío.
 */

import { formatMinutes, pluralize } from "@/shared/lib/format";
import type { Block } from "@/domain/schedule";

export type DayCloseInput = {
  score: number;
  blocks: Block[];
  trained: boolean;
  sleepMinutes: number;
  focusMinutes: number;
  pages: number;
  meals: number;
  calories: number;
};

export type DayClose = {
  score: number;
  headline: string;
  /** Lo que sí pasó, en frases cortas. */
  done: string[];
  /** Bloques del día que quedaron sin cerrar. */
  pending: string[];
  blocksDone: number;
  blocksTotal: number;
};

export function dayClose(input: DayCloseInput): DayClose {
  const done: string[] = [];
  if (input.trained) done.push("entrenaste");
  if (input.sleepMinutes > 0) done.push(`dormiste ${formatMinutes(input.sleepMinutes)}`);
  if (input.focusMinutes > 0) done.push(`${formatMinutes(input.focusMinutes)} de foco`);
  if (input.pages > 0) done.push(`${pluralize(input.pages, "página", "páginas")}`);
  if (input.meals > 0) done.push(`${pluralize(input.meals, "comida", "comidas")}${input.calories > 0 ? ` · ${input.calories.toLocaleString("es-AR")} kcal` : ""}`);

  const blocksTotal = input.blocks.length;
  const blocksDone = input.blocks.filter((block) => block.done).length;
  const pending = input.blocks.filter((block) => !block.done).map((block) => block.title);

  const headline = done.length === 0 && blocksTotal === 0
    ? "Todavía no hay nada registrado hoy."
    : input.score >= 75
      ? `Cerraste el día en ${input.score}/100.`
      : input.score >= 40
        ? `El día va en ${input.score}/100.`
        : `El día va en ${input.score}/100, y todavía se puede mover.`;

  return { score: input.score, headline, done, pending, blocksDone, blocksTotal };
}

export type WeeklyReviewInput = {
  /** Los siete días de la semana que cierra, con sus bloques. */
  days: Array<{ date: string; blocks: Block[]; score: number }>;
  /** Áreas con la cantidad de días que tuvieron actividad esta semana. */
  areas: Array<{ label: string; activeDays: number }>;
  /** Objetivos abiertos sin movimiento en su área. */
  staleGoals: Array<{ id: number; title: string; days: number }>;
};

export type WeeklyReview = {
  blocksDone: number;
  blocksTotal: number;
  completionPercent: number;
  averageScore: number;
  bestDay: { date: string; score: number } | null;
  /** Áreas que no registraron nada en toda la semana. */
  quietAreas: string[];
  staleGoals: Array<{ id: number; title: string; days: number }>;
};

export function weeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const allBlocks = input.days.flatMap((day) => day.blocks);
  const blocksTotal = allBlocks.length;
  const blocksDone = allBlocks.filter((block) => block.done).length;

  const scores = input.days.map((day) => day.score);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const bestDay = input.days.reduce<{ date: string; score: number } | null>(
    (best, day) => (best === null || day.score > best.score ? { date: day.date, score: day.score } : best),
    null,
  );

  return {
    blocksDone,
    blocksTotal,
    completionPercent: blocksTotal ? Math.round(blocksDone / blocksTotal * 100) : 0,
    averageScore,
    bestDay: bestDay && bestDay.score > 0 ? bestDay : null,
    quietAreas: input.areas.filter((area) => area.activeDays === 0).map((area) => area.label),
    staleGoals: input.staleGoals,
  };
}

/** El domingo es el día del corte semanal. */
export function isReviewDay(date: string) {
  return new Date(`${date}T12:00:00`).getDay() === 0;
}

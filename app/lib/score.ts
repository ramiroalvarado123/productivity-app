/**
 * El Daily Score, en un solo lugar.
 *
 * Antes la fórmula vivía suelta dentro del componente y sólo sabía calcular
 * "hoy". Acá es una función pura de un día cualquiera, así Inicio, la sección
 * Daily Score y Estadísticas muestran exactamente el mismo número, y el
 * histórico se puede reconstruir con los registros que ya están cargados.
 */

export type ScoreFactors = { training: number; nutrition: number; sleep: number; focus: number; reading: number; goals: number };

export type ScoreWeights = {
  gymWeight: number;
  nutritionWeight: number;
  sleepWeight: number;
  focusWeight: number;
  readingWeight: number;
  goalsWeight: number;
};

/** Lo que hiciste en un día, sin interpretar. */
export type DayRecord = {
  trainingSessions: number;
  meals: number;
  sleepMinutes: number;
  focusMinutes: number;
  pages: number;
  /** Cerraste al menos una tarea u objetivo ese día. */
  completedSomething: boolean;
  /** Tenías algún objetivo abierto ese día. */
  hasOpenGoals: boolean;
};

/** Cuánto hace falta para que un factor llegue a 100. */
export const FULL_SLEEP_MINUTES = 8 * 60;
export const FULL_FOCUS_MINUTES = 2 * 60;
export const FULL_MEALS = 3;
export const FULL_PAGES = 10;

export function dayFactors(day: DayRecord): ScoreFactors {
  return {
    training: day.trainingSessions > 0 ? 100 : 0,
    nutrition: Math.min(100, Math.round(day.meals / FULL_MEALS * 100)),
    sleep: day.sleepMinutes ? Math.min(100, Math.round(day.sleepMinutes / FULL_SLEEP_MINUTES * 100)) : 0,
    focus: Math.min(100, Math.round(day.focusMinutes / FULL_FOCUS_MINUTES * 100)),
    reading: Math.min(100, day.pages * FULL_PAGES),
    goals: day.completedSomething ? 100 : day.hasOpenGoals ? 50 : 0,
  };
}

/** Promedio ponderado de los seis factores según tus prioridades del mes. */
export function scoreFrom(factors: ScoreFactors, weights: ScoreWeights): number {
  const total = weights.gymWeight + weights.nutritionWeight + weights.sleepWeight + weights.focusWeight + weights.readingWeight + weights.goalsWeight;
  if (total <= 0) return 0;
  return Math.round((
    factors.training * weights.gymWeight
    + factors.nutrition * weights.nutritionWeight
    + factors.sleep * weights.sleepWeight
    + factors.focus * weights.focusWeight
    + factors.reading * weights.readingWeight
    + factors.goals * weights.goalsWeight
  ) / total);
}

export function scoreForDay(day: DayRecord, weights: ScoreWeights): number {
  return scoreFrom(dayFactors(day), weights);
}

/** Etiqueta corta para un puntaje, la misma en toda la app. */
export function scoreLabel(score: number) {
  if (score >= 75) return "Tu día va muy bien";
  if (score >= 40) return "Cada acción suma";
  return "Recién empezás";
}

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
  /**
   * Ponderación de las disciplinas completadas ese día (0–100).
   * Cuando falta, se mantiene el comportamiento histórico de "algún entrenamiento".
   */
  trainingScore?: number;
  meals: number;
  /** Calorías registradas y objetivo diario, si el usuario configuró alimentación. */
  calories?: number;
  targetCalories?: number;
  sleepMinutes: number;
  focusMinutes: number;
  /** Objetivo personal de Estudio/Trabajo para ese día; 2 h si aún no se configuró. */
  focusTargetMinutes?: number;
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
/** Dentro de este margen el objetivo de calorías se considera cumplido. */
export const CALORIE_TARGET_TOLERANCE = 0.10;

/**
 * Aporte de una disciplina al factor Entrenamiento.
 * Una actividad importante pesa el doble que una secundaria y la calidad
 * evita que marcar una sesión lleve automáticamente el factor a 100.
 * Sin valoración queda en un punto medio hasta que el usuario la califique.
 */
export function trainingContribution(priority: "important" | "secondary" | undefined, quality: number | null | undefined) {
  const qualityMultiplier = quality === 1 ? 0.4
    : quality === 2 ? 0.6
    : quality === 3 ? 0.8
    : quality === 4 ? 1
    : 0.5;
  return (priority === "secondary" ? 0.5 : 1) * qualityMultiplier;
}

export function nutritionScoreFromCalories(calories: number, targetCalories: number): number | null {
  if (!Number.isFinite(targetCalories) || targetCalories <= 0) return null;
  const actual = Math.max(0, Number.isFinite(calories) ? calories : 0);
  const relativeDifference = Math.abs(actual - targetCalories) / targetCalories;
  if (relativeDifference <= CALORIE_TARGET_TOLERANCE) return 100;
  const remainingRange = Math.max(0.0001, 1 - CALORIE_TARGET_TOLERANCE);
  return Math.max(0, Math.min(100, Math.round((1 - (relativeDifference - CALORIE_TARGET_TOLERANCE) / remainingRange) * 100)));
}

export function dayFactors(day: DayRecord): ScoreFactors {
  const focusTargetMinutes = Number.isFinite(day.focusTargetMinutes) && Number(day.focusTargetMinutes) > 0
    ? Number(day.focusTargetMinutes)
    : FULL_FOCUS_MINUTES;
  return {
    training: typeof day.trainingScore === "number"
      ? Math.max(0, Math.min(100, Math.round(day.trainingScore)))
      : day.trainingSessions > 0 ? 100 : 0,
    nutrition: nutritionScoreFromCalories(day.calories ?? 0, day.targetCalories ?? 0)
      ?? Math.min(100, Math.round(day.meals / FULL_MEALS * 100)),
    sleep: day.sleepMinutes ? Math.min(100, Math.round(day.sleepMinutes / FULL_SLEEP_MINUTES * 100)) : 0,
    focus: Math.min(100, Math.round(day.focusMinutes / focusTargetMinutes * 100)),
    reading: Math.min(100, day.pages * FULL_PAGES),
    goals: day.completedSomething ? 100 : day.hasOpenGoals ? 50 : 0,
  };
}

/** Promedio ponderado de los seis factores según tus prioridades del mes. */
export function scoreFrom(factors: ScoreFactors, weights: ScoreWeights): number {
  // La escala queda siempre ordenada: Prioridad (3) > Importante (2) > Secundario (1),
  // incluso si una fila antigua tuviera un valor fuera del rango.
  const normalizeWeight = (value: number) => Math.max(1, Math.min(3, Math.round(Number(value) || 2)));
  const gymWeight = normalizeWeight(weights.gymWeight);
  const nutritionWeight = normalizeWeight(weights.nutritionWeight);
  const sleepWeight = normalizeWeight(weights.sleepWeight);
  const focusWeight = normalizeWeight(weights.focusWeight);
  const readingWeight = normalizeWeight(weights.readingWeight);
  const goalsWeight = normalizeWeight(weights.goalsWeight);
  const total = gymWeight + nutritionWeight + sleepWeight + focusWeight + readingWeight + goalsWeight;
  if (total <= 0) return 0;
  return Math.round((
    factors.training * gymWeight
    + factors.nutrition * nutritionWeight
    + factors.sleep * sleepWeight
    + factors.focus * focusWeight
    + factors.reading * readingWeight
    + factors.goals * goalsWeight
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

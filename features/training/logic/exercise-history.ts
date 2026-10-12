/** "Última vez" de cada ejercicio, para mostrarla como referencia en la planilla (puro, con tests). */

import type { ExerciseLog, TrainingLog } from "@/shared/data/types";
import { normalizeExerciseName } from "@/features/training/logic/routines";

export type LastExerciseValues = { weightDeciKg: number; sets: number; reps: number; date: string };

/**
 * Por cada ejercicio (por nombre), lo que cargaste la última vez ANTES de `beforeDate`.
 * Sirve para mostrar el peso anterior como referencia al armar la sesión de hoy.
 */
export function lastExerciseValues(exerciseLogs: ExerciseLog[], trainingLogs: TrainingLog[], beforeDate: string) {
  const dateOfLog = new Map(trainingLogs.map((log) => [log.id, log.trainingDate]));
  const result = new Map<string, LastExerciseValues & { exerciseId: number }>();
  for (const item of exerciseLogs) {
    const date = dateOfLog.get(item.trainingLogId);
    const key = normalizeExerciseName(item.exercise);
    if (!date || date >= beforeDate || !key) continue;
    const current = result.get(key);
    if (current && (current.date > date || (current.date === date && current.exerciseId > item.id))) continue;
    result.set(key, { weightDeciKg: item.weightDeciKg, sets: item.sets, reps: item.reps, date, exerciseId: item.id });
  }
  return result;
}

/** Historial de sesiones de gimnasio y "última vez" de cada ejercicio (puro, con tests). */

import type { ExerciseLog, TrainingLog } from "@/shared/data/types";
import { normalizeExerciseName } from "@/features/training/logic/routines";

export type LastExerciseValues = { weightDeciKg: number; sets: number; reps: number; date: string };
export type SessionHistoryItem = { logId: number; date: string; exercises: ExerciseLog[] };

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

/** Sesiones de una disciplina que tienen ejercicios cargados, de la más nueva a la más vieja. */
export function sessionHistory(exerciseLogs: ExerciseLog[], trainingLogs: TrainingLog[], disciplineId: number): SessionHistoryItem[] {
  const logs = new Map(trainingLogs.filter((log) => log.disciplineId === disciplineId && log.id > 0).map((log) => [log.id, log]));
  const grouped = new Map<number, ExerciseLog[]>();
  for (const item of exerciseLogs) {
    if (!logs.has(item.trainingLogId)) continue;
    const list = grouped.get(item.trainingLogId) ?? [];
    list.push(item);
    grouped.set(item.trainingLogId, list);
  }
  return [...grouped.entries()]
    .map(([logId, exercises]) => ({ logId, date: logs.get(logId)!.trainingDate, exercises: [...exercises].sort((left, right) => left.id - right.id) }))
    .sort((left, right) => right.date.localeCompare(left.date) || right.logId - left.logId);
}

const decimal = (value: number) => String(value).replace(".", ",");

/** "60 kg · 4×8": solo muestra lo que realmente se cargó. */
export function describeExercise(item: Pick<ExerciseLog, "weightDeciKg" | "sets" | "reps">) {
  const parts: string[] = [];
  if (item.weightDeciKg > 0) parts.push(`${decimal(item.weightDeciKg / 10)} kg`);
  if (item.sets > 0 && item.reps > 0) parts.push(`${item.sets}×${item.reps}`);
  else if (item.reps > 0) parts.push(`${item.reps} reps`);
  else if (item.sets > 0) parts.push(`${item.sets} series`);
  return parts.join(" · ") || "Sin datos";
}

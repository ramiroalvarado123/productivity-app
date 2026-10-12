/** Rutinas de entrenamiento: validación y forma de las filas (puro, lo usan cliente y servidor). */

import type { RoutineExercise, TrainingRoutine } from "@/shared/data/types";

export const MAX_ROUTINES = 20;
export const MAX_ROUTINE_EXERCISES = 30;
export const MAX_ROUTINE_NAME = 40;

/** Minúsculas, sin acentos y sin espacios de más: "Press  Banca" y "press banca" son el mismo ejercicio. */
export function normalizeExerciseName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Ejercicios de una rutina tal como llegan del cliente: sin vacíos ni repetidos, con límites. */
export function cleanRoutineExercises(value: unknown): RoutineExercise[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const cleaned: RoutineExercise[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const exercise = String(row.exercise ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const key = normalizeExerciseName(exercise);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push({ exercise, sets: Math.max(0, Math.min(100, Math.round(Number(row.sets) || 0))) });
    if (cleaned.length >= MAX_ROUTINE_EXERCISES) break;
  }
  return cleaned;
}

export function cleanRoutineName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_ROUTINE_NAME);
}

/** `exercises_json` guardado como texto; si está roto, la rutina queda vacía en vez de romper la pantalla. */
export function parseRoutineExercises(raw: unknown): RoutineExercise[] {
  try { return cleanRoutineExercises(JSON.parse(String(raw ?? "[]"))); } catch { return []; }
}

export function routineFromRow(row: Record<string, unknown>): TrainingRoutine {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    exercises: parseRoutineExercises(row.exercisesJson),
    createdAt: String(row.createdAt ?? ""),
  };
}

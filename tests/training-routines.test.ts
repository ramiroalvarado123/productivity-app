/** Pruebas de rutinas e historial de sesiones de gimnasio. */

import assert from "node:assert/strict";
import test from "node:test";

import { cleanRoutineExercises, cleanRoutineName, normalizeExerciseName, parseRoutineExercises, routineFromRow } from "@/features/training/logic/routines";
import { lastExerciseValues } from "@/features/training/logic/exercise-history";
import type { ExerciseLog, TrainingLog } from "@/shared/data/types";

const log = (id: number, trainingDate: string, disciplineId = 1): TrainingLog => ({ id, disciplineId, trainingDate, durationMinutes: 0, distanceMeters: 0, notes: "" });
const exercise = (id: number, trainingLogId: number, name: string, weightDeciKg: number, sets: number, reps: number, isRecord = false): ExerciseLog =>
  ({ id, trainingLogId, exercise: name, weightDeciKg, sets, reps, isRecord });

test("los nombres de ejercicio se comparan sin acentos, mayúsculas ni espacios de más", () => {
  assert.equal(normalizeExerciseName("  Press   Báncá "), "press banca");
  assert.equal(normalizeExerciseName("DOMINADAS"), normalizeExerciseName("dominadas"));
});

test("una rutina se limpia: sin vacíos ni repetidos, con límites", () => {
  const cleaned = cleanRoutineExercises([
    { exercise: "  Dominadas ", sets: "4" },
    { exercise: "dominadas", sets: 9 },
    { exercise: "   ", sets: 3 },
    { exercise: "Remo", sets: -2 },
    { exercise: "Curl", sets: 500 },
    "basura",
    null,
  ]);
  assert.deepEqual(cleaned, [{ exercise: "Dominadas", sets: 4 }, { exercise: "Remo", sets: 0 }, { exercise: "Curl", sets: 100 }]);
  assert.deepEqual(cleanRoutineExercises("nada"), []);
  assert.equal(cleanRoutineExercises(Array.from({ length: 50 }, (_, index) => ({ exercise: `Ej ${index}`, sets: 3 }))).length, 30);
});

test("el nombre de la rutina se recorta y normaliza espacios", () => {
  assert.equal(cleanRoutineName("  Pull   A "), "Pull A");
  assert.equal(cleanRoutineName("x".repeat(100)).length, 40);
});

test("exercises_json roto no rompe la pantalla", () => {
  assert.deepEqual(parseRoutineExercises("{no es json"), []);
  const routine = routineFromRow({ id: 3, name: "Pull", exercisesJson: JSON.stringify([{ exercise: "Remo", sets: 3 }]), createdAt: "2026-10-01T00:00:00Z" });
  assert.deepEqual(routine, { id: 3, name: "Pull", exercises: [{ exercise: "Remo", sets: 3 }], createdAt: "2026-10-01T00:00:00Z" });
});

test("la última vez de un ejercicio sale de la sesión anterior más reciente", () => {
  const logs = [log(1, "2026-10-01"), log(2, "2026-10-05"), log(3, "2026-10-09")];
  const exercises = [
    exercise(1, 1, "Dominadas", 0, 3, 6),
    exercise(2, 2, "dominadas", 50, 4, 8),
    exercise(3, 3, "Dominadas", 100, 5, 5),
    exercise(4, 2, "Remo", 400, 3, 10),
  ];
  const last = lastExerciseValues(exercises, logs, "2026-10-09");
  assert.deepEqual(last.get("dominadas"), { weightDeciKg: 50, sets: 4, reps: 8, date: "2026-10-05", exerciseId: 2 });
  assert.equal(last.get("remo")?.weightDeciKg, 400);
  // El día de hoy y los posteriores no cuentan como "última vez".
  assert.equal(lastExerciseValues(exercises, logs, "2026-10-01").size, 0);
});

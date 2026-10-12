"use client";
import type { ExerciseLog, RoutineExercise, SavePhase, TrainingRoutine } from "@/shared/data/types";
import { RoutinePicker } from "@/features/training/components/routine-picker";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { formatDecimalInput } from "@/shared/lib/numbers";
import { normalizeExerciseName } from "@/features/training/logic/routines";
import type { LastExerciseValues } from "@/features/training/logic/exercise-history";
import { useState } from "react";

export type ExerciseDraft = { key: string; id: number; exercise: string; weight: string; sets: string; reps: string; isRecord: boolean };
let exerciseDraftSeq = 0;
export const emptyExerciseDraft = (): ExerciseDraft => ({ key: `new-${++exerciseDraftSeq}`, id: 0, exercise: "", weight: "", sets: "", reps: "", isRecord: false });
export const isBlankExerciseDraft = (row: ExerciseDraft) => !row.exercise.trim() && !row.weight.trim() && !row.sets.trim() && !row.reps.trim() && !row.isRecord;

/**
 * Planilla de la sesión de gimnasio: todos los ejercicios del día en una
 * tabla editable que se guarda de una sola vez. Arranca con lo que ya estaba
 * cargado ese día; el padre la remonta (key) al cambiar de día o al volver
 * del servidor con ids nuevos. Las rutinas cargan ejercicios en esta misma
 * tabla; lo de la última vez se muestra como referencia (placeholder).
 */
export function ExerciseSessionTable({ disciplineId, date, exercises, routines, lastValues, exerciseNames, saving, savePhase, onSave, onSaveRoutine, onDeleteRoutine, onError }: {
  disciplineId: number;
  date: string;
  exercises: ExerciseLog[];
  routines: TrainingRoutine[];
  lastValues: ReadonlyMap<string, LastExerciseValues>;
  exerciseNames: string[];
  saving: boolean;
  savePhase: SavePhase;
  onSave: (payload: Record<string, unknown>) => void;
  onSaveRoutine: (routine: { id: number; name: string; exercises: RoutineExercise[] }) => Promise<boolean>;
  onDeleteRoutine: (routine: TrainingRoutine) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const [rows, setRows] = useState<ExerciseDraft[]>(() => {
    const existing = [...exercises].sort((left, right) => left.id - right.id).map((item) => ({
      key: String(item.id), id: item.id, exercise: item.exercise,
      weight: item.weightDeciKg ? formatDecimalInput(item.weightDeciKg / 10) : "",
      sets: item.sets ? String(item.sets) : "", reps: item.reps ? String(item.reps) : "", isRecord: item.isRecord,
    }));
    return existing.length ? [...existing, emptyExerciseDraft()] : [emptyExerciseDraft(), emptyExerciseDraft(), emptyExerciseDraft()];
  });
  const [routinesOpen, setRoutinesOpen] = useState(false);
  const update = (key: string, patch: Partial<ExerciseDraft>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  const remove = (key: string) => setRows((current) => current.length > 1 ? current.filter((row) => row.key !== key) : [emptyExerciseDraft()]);
  const filled = rows.filter((row) => !isBlankExerciseDraft(row));
  // Una rutina suma sus ejercicios a lo que ya escribiste, sin duplicar los que ya están.
  const applyRoutine = (routine: TrainingRoutine) => {
    setRows((current) => {
      const kept = current.filter((row) => !isBlankExerciseDraft(row));
      const present = new Set(kept.map((row) => normalizeExerciseName(row.exercise)));
      const added = routine.exercises.filter((item) => !present.has(normalizeExerciseName(item.exercise)))
        .map((item) => ({ ...emptyExerciseDraft(), exercise: item.exercise, sets: item.sets ? String(item.sets) : "" }));
      return [...kept, ...added, emptyExerciseDraft()];
    });
    setRoutinesOpen(false);
  };
  const lastFor = (name: string) => lastValues.get(normalizeExerciseName(name));
  return <>
  <form className="exercise-sheet" onSubmit={(event) => {
    event.preventDefault();
    if (filled.some((row) => !row.exercise.trim())) { onError("Completá el nombre de cada ejercicio de la tabla."); return; }
    if (!filled.length && !exercises.length) { onError("Cargá al menos un ejercicio."); return; }
    onSave({ action: "save_exercises", disciplineId, date, exercises: filled.map((row) => ({ id: row.id || undefined, exercise: row.exercise, weightKg: row.weight.trim().replace(",", "."), sets: row.sets, reps: row.reps, isRecord: row.isRecord })) });
  }}>
    <div className="exercise-sheet-tools">
      <button type="button" className="exercise-routine-button" onClick={() => setRoutinesOpen(true)}>Rutinas{routines.length ? ` · ${routines.length}` : ""}</button>
    </div>
    <div className="exercise-sheet-head" aria-hidden="true"><span>Ejercicio</span><span>Kg</span><span>Series</span><span>Reps</span><span title="Récord personal">PR</span><span /></div>
    {rows.map((row, index) => {
      // Referencia de la última sesión: se ve en gris mientras el campo está vacío.
      const last = row.exercise.trim() ? lastFor(row.exercise) : undefined;
      return <div className={"exercise-sheet-row" + (row.isRecord ? " record" : "")} key={row.key} title={last ? `La última vez: ${last.weightDeciKg ? formatDecimalInput(last.weightDeciKg / 10) + " kg" : "sin peso"}, ${last.sets}×${last.reps}` : undefined}>
        <input className="exercise-sheet-name" list="exercise-name-options" aria-label={`Ejercicio ${index + 1}`} placeholder={index === 0 ? "Ej. sentadilla" : "Ejercicio"} value={row.exercise} onChange={(event) => update(row.key, { exercise: event.target.value })} />
        <label><small>Kg</small><input aria-label={`Kg del ejercicio ${index + 1}`} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" placeholder={last?.weightDeciKg ? formatDecimalInput(last.weightDeciKg / 10) : "0"} value={row.weight} onChange={(event) => update(row.key, { weight: event.target.value })} /></label>
        <label><small>Series</small><input aria-label={`Series del ejercicio ${index + 1}`} type="number" inputMode="numeric" min="0" placeholder={last?.sets ? String(last.sets) : "0"} value={row.sets} onChange={(event) => update(row.key, { sets: event.target.value })} /></label>
        <label><small>Reps</small><input aria-label={`Repeticiones del ejercicio ${index + 1}`} type="number" inputMode="numeric" min="0" placeholder={last?.reps ? String(last.reps) : "0"} value={row.reps} onChange={(event) => update(row.key, { reps: event.target.value })} /></label>
        <button type="button" className={"exercise-sheet-record" + (row.isRecord ? " active" : "")} aria-pressed={row.isRecord} aria-label={`Marcar ejercicio ${index + 1} como récord personal`} title="Récord personal" onClick={() => update(row.key, { isRecord: !row.isRecord })}>🏆</button>
        <button type="button" className="exercise-sheet-delete" aria-label={`Quitar fila ${index + 1}`} onClick={() => remove(row.key)}>×</button>
      </div>;
    })}
    <datalist id="exercise-name-options">{exerciseNames.map((name) => <option key={name} value={name} />)}</datalist>
    <div className="exercise-sheet-actions">
      <button type="button" className="exercise-sheet-add" onClick={() => setRows((current) => [...current, emptyExerciseDraft()])}>＋ Agregar fila</button>
      <button className="primary-action" disabled={saving}><SaveButtonContent label={`Guardar entrenamiento${filled.length ? ` · ${filled.length}` : ""}`} phase={savePhase} /></button>
    </div>
  </form>
  {routinesOpen && <RoutinePicker
    routines={routines}
    sessionExercises={filled.filter((row) => row.exercise.trim()).map((row) => ({ exercise: row.exercise.trim(), sets: Math.max(0, Math.round(Number(row.sets) || 0)) }))}
    saving={saving}
    onApply={applyRoutine}
    onSave={onSaveRoutine}
    onDelete={onDeleteRoutine}
    onClose={() => setRoutinesOpen(false)}
  />}
  </>;
}

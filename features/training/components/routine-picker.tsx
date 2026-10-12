"use client";
import { useEffect, useState } from "react";
import { MAX_ROUTINE_EXERCISES, MAX_ROUTINE_NAME } from "@/features/training/logic/routines";
import type { RoutineExercise, TrainingRoutine } from "@/shared/data/types";
import { useWorkspace } from "@/features/app-shell/workspace";

type DraftRow = { key: string; exercise: string; sets: string };
type Draft = { id: number; name: string; rows: DraftRow[] };
let draftSeq = 0;
const blankRow = (): DraftRow => ({ key: `routine-row-${++draftSeq}`, exercise: "", sets: "" });
const rowsFrom = (exercises: RoutineExercise[]): DraftRow[] => {
  const rows = exercises.map((item) => ({ key: `routine-row-${++draftSeq}`, exercise: item.exercise, sets: item.sets ? String(item.sets) : "" }));
  return rows.length ? [...rows, blankRow()] : [blankRow(), blankRow(), blankRow()];
};

/**
 * Pestañita de rutinas: elegís una y sus ejercicios se cargan en la planilla,
 * o armás/editás las tuyas (ej. "Pull": Dominadas, Remo…). No guarda nada de
 * la sesión del día; eso lo hace la planilla.
 */
export function RoutinePicker({ routines, sessionExercises, saving, onApply, onSave, onDelete, onClose }: {
  routines: TrainingRoutine[];
  /** Ejercicios que ya hay escritos en la planilla: permiten guardarla como rutina con un toque. */
  sessionExercises: RoutineExercise[];
  saving: boolean;
  onApply: (routine: TrainingRoutine) => void;
  onSave: (routine: { id: number; name: string; exercises: RoutineExercise[] }) => Promise<boolean>;
  onDelete: (routine: TrainingRoutine) => Promise<boolean>;
  onClose: () => void;
}) {
  // El error global (ej. "falta correr el SQL") queda tapado por el fondo del popup: se repite acá.
  const { error } = useWorkspace();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startNew = (exercises: RoutineExercise[] = []) => { setProblem(""); setDraft({ id: 0, name: "", rows: rowsFrom(exercises) }); };
  const startEdit = (routine: TrainingRoutine) => { setProblem(""); setDraft({ id: routine.id, name: routine.name, rows: rowsFrom(routine.exercises) }); };
  const updateRow = (key: string, patch: Partial<DraftRow>) => setDraft((current) => current && { ...current, rows: current.rows.map((row) => row.key === key ? { ...row, ...patch } : row) });

  const submit = async () => {
    if (!draft) return;
    const exercises = draft.rows.filter((row) => row.exercise.trim()).map((row) => ({ exercise: row.exercise.trim(), sets: Math.max(0, Math.round(Number(row.sets) || 0)) }));
    if (!draft.name.trim()) { setProblem("Ponele un nombre a la rutina."); return; }
    if (!exercises.length) { setProblem("Agregá al menos un ejercicio."); return; }
    setProblem("");
    if (await onSave({ id: draft.id, name: draft.name.trim(), exercises })) setDraft(null);
  };

  return <div className="routine-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="routine-dialog" role="dialog" aria-modal="true" aria-labelledby="routine-title">
      <button type="button" className="routine-close" onClick={onClose} aria-label="Cerrar rutinas">×</button>
      {!draft ? <>
        <p className="routine-eyebrow">RUTINAS</p>
        <h2 id="routine-title">Cargá una rutina</h2>
        <p className="routine-intro">Elegí una y solo completás kg y repeticiones.</p>
        {routines.length ? <div className="routine-list">{routines.map((routine) => <div className="routine-item" key={routine.id}>
          <button type="button" className="routine-apply" onClick={() => onApply(routine)}>
            <b>{routine.name}</b>
            <small>{routine.exercises.length} {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"} · {routine.exercises.map((item) => item.exercise).join(", ")}</small>
          </button>
          <button type="button" className="routine-icon" aria-label={"Editar " + routine.name} title="Editar" onClick={() => startEdit(routine)}>✎</button>
          <button type="button" className="routine-icon" aria-label={"Eliminar " + routine.name} title="Eliminar" disabled={saving} onClick={() => { if (window.confirm("¿Eliminar la rutina " + routine.name + "? Tus sesiones ya guardadas no se tocan.")) void onDelete(routine); }}>×</button>
        </div>)}</div> : <p className="routine-empty">Todavía no armaste ninguna. Creá la primera, por ejemplo <b>Pull</b> con Dominadas, Remo…</p>}
        {error && <p className="routine-problem" role="alert">{error}</p>}
        <div className="routine-footer">
          <button type="button" className="routine-new" onClick={() => startNew()}>＋ Nueva rutina</button>
          {sessionExercises.length > 0 && <button type="button" className="routine-from-session" onClick={() => startNew(sessionExercises)}>Guardar esta sesión como rutina</button>}
        </div>
      </> : <>
        <p className="routine-eyebrow">{draft.id ? "EDITAR RUTINA" : "NUEVA RUTINA"}</p>
        <h2 id="routine-title">{draft.id ? draft.name || "Rutina" : "Armá tu rutina"}</h2>
        <form className="routine-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <input className="routine-name" aria-label="Nombre de la rutina" placeholder="Nombre: Pull, Push, Piernas…" maxLength={MAX_ROUTINE_NAME} autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <div className="routine-rows">{draft.rows.map((row, index) => <div className="routine-row" key={row.key}>
            <input aria-label={`Ejercicio ${index + 1}`} placeholder={index === 0 ? "Ej. Dominadas" : "Ejercicio"} maxLength={80} value={row.exercise} onChange={(event) => updateRow(row.key, { exercise: event.target.value })} />
            <input className="routine-sets" aria-label={`Series del ejercicio ${index + 1}`} type="number" inputMode="numeric" min="0" max="100" placeholder="Series" value={row.sets} onChange={(event) => updateRow(row.key, { sets: event.target.value })} />
            <button type="button" className="routine-icon" aria-label={`Quitar ejercicio ${index + 1}`} onClick={() => setDraft({ ...draft, rows: draft.rows.length > 1 ? draft.rows.filter((item) => item.key !== row.key) : [blankRow()] })}>×</button>
          </div>)}</div>
          {draft.rows.length < MAX_ROUTINE_EXERCISES && <button type="button" className="routine-add" onClick={() => setDraft({ ...draft, rows: [...draft.rows, blankRow()] })}>＋ Agregar ejercicio</button>}
          {(problem || error) && <p className="routine-problem" role="alert">{problem || error}</p>}
          <div className="routine-footer">
            <button type="button" className="routine-back" onClick={() => setDraft(null)}>Volver</button>
            <button className="primary-action" disabled={saving}>{saving ? "Guardando…" : "Guardar rutina"}</button>
          </div>
        </form>
      </>}
    </section>
  </div>;
}

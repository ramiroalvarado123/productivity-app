"use client";
import { DISCIPLINE_PRIORITY_OPTIONS, WEEKLY_TARGET_OPTIONS, disciplineKindOptions, kindLabels } from "@/features/training/constants";
import { DistanceSessionForm } from "@/features/training/components/distance-session-form";
import { Dropdown } from "@/shared/ui/dropdown";
import { ExerciseSessionTable } from "@/features/training/components/exercise-session-table";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { TrainingQualityBar } from "@/features/training/components/training-quality-bar";
import { dateMinus, formatDate, weekFor } from "@/domain/dates";
import { formatDecimalInput } from "@/shared/lib/numbers";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Entrenamiento: disciplinas, semana navegable y detalle de la sesión del día elegido. */
export function TrainingSection() {
  const {
    today,
    data,
    saving,
    setError,
    trainingWeeklyTarget,
    setTrainingWeeklyTarget,
    savePhase,
    save,
    effectiveTrainingLogs,
    historicalScore,
    submitForm,
    toggleEvent,
  } = useWorkspace();
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [trainingDate, setTrainingDate] = useState(today);
  const [trainingWeekAnchor, setTrainingWeekAnchor] = useState(today);
  // Marcado optimista: el día cambia apenas lo tocás y el servidor confirma por detrás.
  // Si el guardado falla, la marca vuelve sola a su estado real.
  const [pendingDays, setPendingDays] = useState<Record<string, boolean>>({});
  const toggleDay = async (disciplineId: number, date: string, nextDone: boolean, planEventId?: number) => {
    const key = disciplineId + ":" + date;
    setPendingDays((current) => ({ ...current, [key]: nextDone }));
    if (planEventId) await toggleEvent(planEventId, false);
    else await save({ action: "toggle_training", disciplineId, date });
    setPendingDays((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const selectedDiscipline = data.disciplines.find((item) => item.id === selectedDisciplineId) ?? data.disciplines[0] ?? null;
  const selectedTrainingLog = selectedDiscipline ? effectiveTrainingLogs.find((item) => item.disciplineId === selectedDiscipline.id && item.trainingDate === trainingDate) : undefined;
  const selectedExercises = selectedTrainingLog ? data.exerciseLogs.filter((item) => item.trainingLogId === selectedTrainingLog.id) : [];
  // Cada disciplina tiene un único detalle de sesión posible: nunca conviven
  // el de pesas, el de distancia y el genérico para la misma disciplina.
  const isDistanceDiscipline = selectedDiscipline?.kind === "running" || selectedDiscipline?.kind === "cycling" || selectedDiscipline?.kind === "swimming";
  const trainingDetailTitle = !selectedDiscipline ? "" : selectedDiscipline.kind === "strength" ? "SESIÓN DE GIMNASIO"
    : selectedDiscipline.kind === "running" ? "SESIÓN DE RUNNING"
    : selectedDiscipline.kind === "cycling" ? "SESIÓN DE CICLISMO"
    : selectedDiscipline.kind === "swimming" ? "SESIÓN DE NATACIÓN"
    : "DETALLE DE SESIÓN";

  // Semana navegable del historial de entrenamientos: independiente de "week"
  // (que siempre es la semana actual, usada en Inicio y otras secciones), así
  // se puede deslizar hacia atrás sin afectar el resto de la app.
  const trainingWeek = useMemo(() => weekFor(trainingWeekAnchor), [trainingWeekAnchor]);
  const shiftTrainingWeek = (amount: number) => setTrainingWeekAnchor((current) => dateMinus(current, -amount * 7));
  const trainingPanel = <section className="module-stack">
    <article className="panel section-panel">
      <div className="panel-heading">
        <div><p>TUS DISCIPLINAS</p><h2>Un calendario para cada actividad</h2></div>
        <div className="training-week-meta">
          <label className="training-target-label" htmlFor="training-weekly-target">Meta semanal<Dropdown id="training-weekly-target" className="weekly-target-dropdown" ariaLabel="Meta de entrenamientos por semana" value={String(trainingWeeklyTarget)} onChange={(value) => setTrainingWeeklyTarget(Number(value))} options={WEEKLY_TARGET_OPTIONS} /></label>
        </div>
      </div>
      <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_discipline", name: form.get("name"), kind: form.get("kind") }); }}>
        <input name="name" required placeholder="Nueva disciplina: pádel, fútbol…" />
        <Dropdown name="kind" ariaLabel="Tipo de disciplina" defaultValue="other" options={disciplineKindOptions} />
        <button disabled={saving}><SaveButtonContent label="＋ Agregar" phase={savePhase("add_discipline")} /></button>
      </form>
      <div className="calendar-head training-week-nav">
        <button type="button" onClick={() => shiftTrainingWeek(-1)} aria-label="Semana anterior">‹</button>
        <div className="training-week-nav-title">
          <h2>{formatDate(trainingWeek[0].iso)} – {formatDate(trainingWeek[6].iso)}</h2>
          {trainingWeekAnchor !== today ? <button type="button" className="training-week-today" onClick={() => setTrainingWeekAnchor(today)}>Volver a hoy</button> : <span className="week-pill">{effectiveTrainingLogs.filter((log) => log.trainingDate >= trainingWeek[0].iso && log.trainingDate <= trainingWeek[6].iso).length} sesiones esta semana</span>}
        </div>
        <button type="button" onClick={() => shiftTrainingWeek(1)} aria-label="Semana siguiente">›</button>
      </div>
      <div className="discipline-list">{data.disciplines.map((discipline) => {
        const dates = effectiveTrainingLogs.filter((log) => log.disciplineId === discipline.id && log.trainingDate >= trainingWeek[0].iso && log.trainingDate <= trainingWeek[6].iso).map((log) => log.trainingDate);
        const focusedLog = selectedDiscipline?.id === discipline.id ? effectiveTrainingLogs.find((log) => log.disciplineId === discipline.id && log.trainingDate === trainingDate) : undefined;
        return <div className={"discipline-card " + (selectedDiscipline?.id === discipline.id ? "selected" : "")} key={discipline.id}>
          <div className="discipline-card-heading">
            <button type="button" className="discipline-title" onClick={() => setSelectedDisciplineId(discipline.id)}><span>{discipline.kind === "strength" ? "🏋" : discipline.kind === "running" ? "🏃" : discipline.kind === "cycling" ? "🚴" : discipline.kind === "swimming" ? "🏊" : "●"}</span><p><b>{discipline.name}</b><small>{kindLabels[discipline.kind]}</small></p><strong>{dates.length}/7</strong></button>
            {data.disciplines.length > 1 && <div className="discipline-priority" role="group" aria-label={"Importancia de " + discipline.name}>
              {DISCIPLINE_PRIORITY_OPTIONS.map((option) => <button key={option.value} type="button" className={discipline.priority === option.value ? "active" : ""} aria-pressed={discipline.priority === option.value} disabled={saving} onClick={() => void save({ action: "set_discipline_priority", disciplineId: discipline.id, priority: option.value })}>{option.label}</button>)}
            </div>}
            {data.disciplines.length > 1 && <button type="button" className="discipline-delete" aria-label={"Eliminar " + discipline.name} title="Eliminar disciplina" disabled={saving} onClick={(event) => { event.stopPropagation(); if (window.confirm("¿Eliminar " + discipline.name + "? También se borrará su historial de entrenamiento.")) void save({ action: "delete_discipline", disciplineId: discipline.id }); }}>×</button>}
          </div>
          <div className="week-row">{trainingWeek.map((day) => {
            const done = pendingDays[discipline.id + ":" + day.iso] ?? dates.includes(day.iso);
            // Primer click en un día: solo lo abre en el detalle de abajo (ver
            // el historial). Un segundo click sobre el mismo día ya
            // seleccionado marca/desmarca la sesión, para no desmarcar por
            // accidente un día que sólo querías mirar.
            const focused = selectedDiscipline?.id === discipline.id && trainingDate === day.iso;
            return <button key={day.iso} className={(done ? "done " : "") + (day.iso === today ? "today" : "") + (focused ? " active" : "")} onClick={() => { setSelectedDisciplineId(discipline.id); setTrainingDate(day.iso); if (focused) void toggleDay(discipline.id, day.iso, !done, focusedLog?.planEventId); }}><small>{day.short}</small><b>{done ? "✓" : day.number}</b>{day.iso === today && <i />}</button>;
          })}</div>
          {focusedLog && <TrainingQualityBar disciplineName={discipline.name} quality={focusedLog.quality} saving={saving} onSelect={(quality) => void save(focusedLog.planEventId ? { action: "set_plan_training_quality", eventId: focusedLog.planEventId, quality } : { action: "set_training_quality", disciplineId: discipline.id, date: trainingDate, quality })} />}
        </div>;
      })}</div>
    </article>
    {selectedDiscipline && <div className="training-detail-grid single-session">
      <article className="panel">
        <div className="panel-heading"><div><p>{trainingDetailTitle}</p><h2>{selectedDiscipline.name}</h2></div><div className="meal-panel-actions"><span className="week-pill">{trainingDate === today ? "Hoy" : formatDate(trainingDate)}</span>{trainingDate !== today && <button type="button" className="meal-backfill-toggle" onClick={() => { setTrainingDate(today); setTrainingWeekAnchor(today); }}>Volver a hoy</button>}</div></div>
        {historicalScore(trainingDate)}
        {selectedDiscipline.kind === "strength" ? <>
          <div className="panel-heading small"><div><p>PESOS Y REPETICIONES</p><h2>Ejercicios</h2></div><span className="week-pill">{selectedExercises.length} cargados</span></div>
          <ExerciseSessionTable
            key={`${selectedDiscipline.id}-${trainingDate}-${selectedExercises.map((item) => item.id).sort((left, right) => left - right).join(".")}`}
            disciplineId={selectedDiscipline.id}
            date={trainingDate}
            exercises={selectedExercises}
            saving={saving}
            savePhase={savePhase("save_exercises")}
            onSave={(payload) => void save(payload)}
            onError={setError}
          />
        </> : isDistanceDiscipline ? <DistanceSessionForm
          key={`${selectedDiscipline.id}-${trainingDate}`}
          disciplineId={selectedDiscipline.id}
          date={trainingDate}
          log={selectedTrainingLog}
          saving={saving}
          savePhase={savePhase("save_training")}
          onSave={(payload) => void save(payload)}
        /> : <form key={`${selectedDiscipline.id}-${trainingDate}`} className="data-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "save_training", disciplineId: selectedDiscipline.id, date: trainingDate, durationMinutes: form.get("durationMinutes"), distanceKm: 0 }); }}>
          <label>Duración (min)<input name="durationMinutes" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" defaultValue={selectedTrainingLog?.durationMinutes ? formatDecimalInput(selectedTrainingLog.durationMinutes) : ""} /></label>
          <button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar sesión" phase={savePhase("save_training")} /></button>
        </form>}
      </article>
    </div>}
  </section>;

  return trainingPanel;
}

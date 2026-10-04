"use client";
import { DayStrip } from "@/shared/ui/day-strip";
import { Dropdown } from "@/shared/ui/dropdown";
import { FOCUS_DAILY_TARGET_OPTIONS, formatFocusHours, parseDecimalInput } from "@/shared/lib/numbers";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { formatDate } from "@/domain/dates";
import { useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Foco: materias o proyectos, horas por día y bloques registrados. */
export function FocusSection() {
  const {
    today,
    week,
    data,
    saving,
    setError,
    focusTab,
    savePhase,
    save,
    uniqueFocusSessions,
    effectiveFocusMinutesFor,
    historicalScore,
    openSection,
    submitForm,
  } = useWorkspace();
  const [focusEntryDate, setFocusEntryDate] = useState(today);
  const [focusHours, setFocusHours] = useState("");
  const adjustFocusHours = (delta: number) => {
    setFocusHours((current) => {
      const currentHours = parseDecimalInput(current) || 0;
      const next = Math.min(24, Math.max(0, Math.round((currentHours + delta) * 100) / 100));
      return next ? next.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : "";
    });
  };

  const focusProjectsInTab = data.focusProjects.filter((project) => project.kind === focusTab);
  const focusProjectIds = new Set(focusProjectsInTab.map((project) => project.id));
  const focusTodayInTab = [...focusProjectIds].reduce((sum, projectId) => sum + effectiveFocusMinutesFor(projectId, (date) => date === today), 0);
  const focusWeekInTab = [...focusProjectIds].reduce((sum, projectId) => sum + effectiveFocusMinutesFor(projectId, (date) => date >= week[0].iso), 0);
  const focusEntryMinutesInTab = [...focusProjectIds].reduce((sum, projectId) => sum + effectiveFocusMinutesFor(projectId, (date) => date === focusEntryDate), 0);
  const focusSessionsInEntry = uniqueFocusSessions
    .filter((session) => focusProjectIds.has(session.projectId) && session.sessionDate === focusEntryDate)
    .sort((left, right) => right.id - left.id);
  const focusPanel = <section className="module-stack">
      <article className="panel focus-workspace"><div className="panel-heading"><div><p>ÁREAS DE FOCO</p><h2>{focusTab === "study" ? "Materias" : "Proyectos"}</h2></div><div className="meal-panel-actions"><label className="training-target-label">Objetivo diario de foco<Dropdown className="weekly-target-dropdown" ariaLabel="Objetivo diario de estudio y trabajo" value={String(data.profile.focusDailyTargetMinutes || 120)} onChange={(value) => void save({ action: "set_focus_daily_target", minutes: Number(value) }, "focus_daily_target")} options={FOCUS_DAILY_TARGET_OPTIONS} /></label><span className="week-pill">{focusProjectsInTab.length} {focusTab === "study" ? "materias" : "proyectos"}</span></div></div>
        <DayStrip label="Elegí el día de foco que querés registrar" value={focusEntryDate} today={today} onChange={setFocusEntryDate} markedDates={new Set(uniqueFocusSessions.filter((session) => focusProjectIds.has(session.projectId)).map((session) => session.sessionDate))} />
        {historicalScore(focusEntryDate)}
        <form className="compact-form" onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_focus_project", name: form.get("name"), kind: focusTab }); }}><input name="name" required placeholder={focusTab === "study" ? "Ej. Física, Anatomía…" : "Ej. Proyecto web, Cliente…"} /><button disabled={saving}><SaveButtonContent label="＋ Agregar" phase={savePhase("add_focus_project")} /></button></form>
        <div className="focus-project-grid">{focusProjectsInTab.map((project) => { const todayMinutes = effectiveFocusMinutesFor(project.id, (date) => date === today); const weekMinutes = effectiveFocusMinutesFor(project.id, (date) => date >= week[0].iso); return <article className={"focus-project-card " + project.kind} key={project.id}><span>{project.kind === "study" ? "📘" : "💼"}</span><div><small>{project.kind === "study" ? "MATERIA" : "PROYECTO"}</small><b>{project.name}</b></div><p><strong>{todayMinutes ? formatFocusHours(todayMinutes) : "—"}</strong><small>hoy</small></p><p><strong>{weekMinutes ? formatFocusHours(weekMinutes) : "—"}</strong><small>semana</small></p><button type="button" className="focus-project-delete" aria-label={`Eliminar ${project.kind === "study" ? "materia" : "proyecto"} ${project.name}`} disabled={saving} onClick={() => { const kind = project.kind === "study" ? "materia" : "proyecto"; if (window.confirm(`¿Eliminar ${kind} “${project.name}”? También se borrarán sus registros de horas. Las tareas vinculadas se conservarán sin asignar a un proyecto.`)) void save({ action: "delete_focus_project", projectId: project.id }); }}>×</button></article>; })}{!focusProjectsInTab.length && <div className="inline-empty focus-empty"><span>＋</span><p><b>Agregá tu primera materia o proyecto</b><small>Van a aparecer juntos en este tablero.</small></p></div>}</div>
        {focusProjectsInTab.length > 0 && <form className="data-form focus-session-form" onSubmit={(event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const hours = parseDecimalInput(focusHours); const minutes = Math.round(hours * 60); if (hours <= 0 || hours > 24 || minutes <= 0) { setError("Indicá una cantidad válida de horas (mayor a 0 y hasta 24)."); return; } void save({ action: "add_focus_session", projectId: form.get("projectId"), date: focusEntryDate, minutes, note: form.get("note") }).then((ok) => { if (ok) { setFocusHours(""); formElement.reset(); } }); }}>
          <label>{focusTab === "study" ? "Materia" : "Proyecto"}<Dropdown name="projectId" ariaLabel={focusTab === "study" ? "Materia" : "Proyecto"} options={focusProjectsInTab.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
          <label>Horas de foco<div className="focus-duration-control"><button type="button" className="stepper-button" aria-label="Restar 15 minutos de foco" onClick={() => adjustFocusHours(-0.25)} disabled={(parseDecimalInput(focusHours) || 0) <= 0}>−</button><input aria-label="Horas de foco" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" value={focusHours} onFocus={(event) => { if (event.currentTarget.value === "0") setFocusHours(""); }} onChange={(event) => setFocusHours(event.target.value)} placeholder="Ej. 1,2 o 1,25" /><button type="button" className="stepper-button" aria-label="Sumar 15 minutos de foco" onClick={() => adjustFocusHours(0.25)} disabled={(parseDecimalInput(focusHours) || 0) >= 24}>＋</button><span>h</span></div></label>
          <label>Qué avanzaste<input name="note" placeholder="Tema, entrega o avance…" /></label>
          <button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar bloque de foco" phase={savePhase("add_focus_session")} /></button>
        </form>}
        {focusProjectsInTab.length > 0 && <section className="focus-session-history" aria-label={`Registros de foco del ${formatDate(focusEntryDate)}`}>
          <div className="focus-session-history-heading"><h3>Bloques de foco</h3><small>{formatDate(focusEntryDate)}</small></div>
          {focusSessionsInEntry.length ? <ul className="focus-session-list">{focusSessionsInEntry.map((session) => {
            const project = data.focusProjects.find((item) => item.id === session.projectId);
            return <li className="focus-session-row" key={session.id}>
              <span aria-hidden="true">◷</span>
              <p><b>{project?.name ?? "Proyecto"}</b><small>{session.note || "Sin descripción"}</small></p>
              <strong>{formatFocusHours(session.minutes)}</strong>
              <button type="button" className="row-delete focus-session-delete" aria-label={`Eliminar registro de ${formatFocusHours(session.minutes)} de ${project?.name ?? "foco"}`} disabled={saving} onClick={() => { if (window.confirm(`¿Eliminar este bloque de ${formatFocusHours(session.minutes)} de ${project?.name ?? "foco"}?`)) void save({ action: "delete_focus_session", id: session.id }); }}>×</button>
            </li>;
          })}</ul> : <p className="focus-session-empty">Todavía no cargaste horas para esta fecha.</p>}
        </section>}
    </article>
    <article className="panel weekly-focus"><div><p>{focusTab === "study" ? "ESTUDIO" : "TRABAJO"} · {focusEntryDate === today ? "HOY" : formatDate(focusEntryDate).toUpperCase()}</p><b>{formatFocusHours(focusEntryDate === today ? focusTodayInTab : focusEntryMinutesInTab)}</b><small>trabajo profundo</small></div><div><p>ESTA SEMANA</p><b>{formatFocusHours(focusWeekInTab)}</b><small>calculadas desde registros reales</small></div><button onClick={() => openSection("plan")}>Crear objetivo semanal →</button></article>
  </section>;

  return focusPanel;
}

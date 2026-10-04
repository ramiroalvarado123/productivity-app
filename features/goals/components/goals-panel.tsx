"use client";
import { DatePicker } from "@/shared/ui/date-picker";
import { Dropdown } from "@/shared/ui/dropdown";
import type { GoalPeriod } from "@/shared/data/types";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { argentinaDate, datePlus, dayDistance, formatDate, goalDeadline } from "@/domain/dates";
import { categoryLabels, goalAreaOptions, periodLabels } from "@/features/goals/constants";
import { countdownLabel } from "@/shared/lib/format";
import { useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Objetivos: crear, completar y borrar metas con plazo. */
export function GoalsPanel() {
  const {
    today,
    data,
    saving,
    savePhase,
    save,
    activeGoals,
    submitForm,
  } = useWorkspace();
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("weekly");
  const [customDate, setCustomDate] = useState(() => datePlus(argentinaDate(), 30));

  const goalTargetDate = goalPeriod === "custom" ? customDate : goalDeadline(today, goalPeriod);
  const goalsPanel = <section className="goals-page"><div className="goals-columns"><article className="panel goal-creator"><div className="panel-heading"><div><p>NUEVO OBJETIVO</p><h2>¿Qué querés conseguir?</h2></div></div><form onSubmit={(event) => { const form = new FormData(event.currentTarget); void submitForm(event, { action: "add_goal", title: form.get("title"), category: form.get("category"), period: goalPeriod, targetDate: goalTargetDate }); }}><label>Objetivo<input name="title" required placeholder="Ej. Correr mis primeros 10 km" /></label><label>Área<Dropdown name="category" ariaLabel="Área del objetivo" options={goalAreaOptions.map((area) => ({ value: area.value, label: area.label }))} /></label><label>Plazo<Dropdown ariaLabel="Plazo del objetivo" value={goalPeriod} onChange={(value) => setGoalPeriod(value as GoalPeriod)} options={[{ value: "weekly", label: "Esta semana" }, { value: "monthly", label: "Este mes" }, { value: "annual", label: "Este año" }, { value: "custom", label: "Fecha exacta" }]} /></label>{goalPeriod === "custom" && <label>Fecha exacta<DatePicker ariaLabel="Fecha exacta del objetivo" value={customDate} onChange={setCustomDate} min={today} /></label>}<div className="deadline-preview"><span>◎</span><p><small>FECHA OBJETIVO</small><b>{formatDate(goalTargetDate)}</b></p></div><button className="primary-action" disabled={saving}><SaveButtonContent label="Crear objetivo" phase={savePhase("add_goal")} /></button></form></article>
    <article className="panel goal-list-panel"><div className="panel-heading"><div><p>TU CAMINO</p><h2>Objetivos guardados</h2></div><span className="week-pill">{activeGoals.length} activos</span></div><div className="goal-list">{data.goals.map((goal) => <div className={"goal-row " + (goal.completedAt ? "completed" : "")} key={goal.id}><button className="goal-check" onClick={() => void save({ action: "toggle_goal", id: goal.id, completed: !goal.completedAt })}>{goal.completedAt ? "✓" : ""}</button><div><div className="goal-meta"><span className={"category-chip " + goal.category}>{categoryLabels[goal.category]}</span><span>{periodLabels[goal.period]}</span></div><b>{goal.title}</b><small>{goal.completedAt ? "Objetivo cumplido" : formatDate(goal.targetDate) + " · " + countdownLabel(Math.max(0, dayDistance(today, goal.targetDate)))}</small></div><button className="goal-delete" onClick={() => void save({ action: "delete_goal", id: goal.id })}>×</button></div>)}{!data.goals.length && <div className="inline-empty tall"><span>◎</span><p><b>Todavía no hay objetivos</b><small>Empezá con uno concreto.</small></p></div>}</div></article></div></section>;

  return goalsPanel;
}

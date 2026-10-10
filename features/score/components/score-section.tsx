"use client";
import type { CSSProperties } from "react";
import type { Priorities } from "@/shared/data/types";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { priorityLabels } from "@/features/score/constants";
import { useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Daily Score: factores de hoy y prioridades del mes. */
export function ScoreSection() {
  const {
    monthKey,
    section,
    saving,
    priorityDraft,
    setPriorityDraft,
    savePhase,
    save,
    factors,
    score,
    priorityCaption,
    openSection,
  } = useWorkspace();
  const [formulaOpen, setFormulaOpen] = useState(false);

  const scoreCard = <article className="score-card">
    <div><p>DAILY SCORE</p><h2>{score >= 75 ? <>Tu día va<br /><em>muy bien.</em></> : <>Cada acción<br /><em>suma.</em></>}</h2><span>{priorityCaption}</span></div>
    <div className="score-ring" style={{ "--score": String(score * 3.6) + "deg" } as CSSProperties}><div><b>{score}</b><small>/100</small></div></div>
  </article>;
  const priorityEditor = <article className="panel priority-panel"><div className="panel-heading"><div><p>PRIORIDAD DEL MES</p><h2>¿Qué te importa más cumplir?</h2></div></div><div className="priority-list">{([
    ["gymWeight", "Entrenamiento", "↗", "Constancia en todas tus disciplinas"],
    ["nutritionWeight", "Alimentación", "◇", "Registrar comidas y cuidar tu energía"],
    ["sleepWeight", "Sueño", "☾", "Duración y regularidad del descanso"],
    ["focusWeight", "Foco", "⌁", "Estudio y trabajo profundo"],
    ["goalsWeight", "Objetivos y organización", "◎", "Completar metas y próximos pasos"],
  ] as Array<[keyof Omit<Priorities, "monthKey">, string, string, string]>).map(([key, label, icon, copy]) => <div className="priority-row" key={key}><span className="priority-icon">{icon}</span><div className="priority-copy"><b>{label}</b><small>{copy}</small></div><div className="priority-options">{[1, 2, 3].map((value) => <button key={value} className={priorityDraft[key] === value ? "active" : ""} onClick={() => setPriorityDraft({ ...priorityDraft, [key]: value })}>{priorityLabels[value]}</button>)}</div></div>)}</div><button className="save-priorities" disabled={saving} onClick={() => void save({ action: "set_priorities", ...priorityDraft, monthKey })}><SaveButtonContent label="Guardar prioridades" phase={savePhase("set_priorities")} /></button></article>;
  const scorePage = section === "score" && <section className="score-page">
        <button className="back-link" onClick={() => openSection("summary")}>← Volver a Inicio</button>
        <div className="score-main">{scoreCard}<article className="panel score-explanation"><div className="panel-heading"><div><p>CÓMO SE FORMA</p><h2>Tus factores de hoy</h2></div><button type="button" className="info-button" aria-expanded={formulaOpen} aria-controls="score-formula" aria-label={formulaOpen ? "Ocultar cómo se calcula el puntaje" : "Ver cómo se calcula el puntaje"} onClick={() => setFormulaOpen((open) => !open)}>i</button></div>{([
          ["Entrenamiento", factors.training, priorityDraft.gymWeight, "gym"],
          ["Alimentación", factors.nutrition, priorityDraft.nutritionWeight, "nutrition"],
          ["Sueño", factors.sleep, priorityDraft.sleepWeight, "sleep"],
          ["Foco", factors.focus, priorityDraft.focusWeight, "focus"],
          ["Objetivos / organización", factors.goals, priorityDraft.goalsWeight, "goals"],
        ] as Array<[string, number, number, string]>).map(([label, value, weight, key]) => <div className="factor-row" key={key}><div><b>{label}</b><small>{priorityLabels[weight]}</small></div><div className="factor-track"><i className={key} style={{ width: String(value) + "%" }} /></div><strong>{value}</strong></div>)}{formulaOpen && <p className="formula-note" id="score-formula">El puntaje combina acciones reales de Entrenamiento, Alimentación, Sueño, Foco y Objetivos. Si marcás la lectura como relevante, suma dentro de Foco hasta 20 puntos; sin definir o como “No relevante”, no cuenta. En Entrenamiento pesan la disciplina y la calidad: Malo 40%, Regular 60%, Bueno 80% y Muy bueno 100%; una disciplina secundaria aporta la mitad que una importante. Alimentación se calcula contra tu objetivo diario de calorías: dentro de un 10% suma 100 y cuanto más te alejás, menos suma. Sueño combina duración y calidad: “Bueno” conserva el puntaje por horas y “Regular” aporta el 85% y “Malo” el 65% de ese valor. Foco suma en proporción a las horas realizadas frente a tu objetivo diario de foco. Las áreas con “Prioridad” pesan 3, las “Importantes” 2 y las “Secundarias” 1. </p>}</article></div>
        {priorityEditor}
      </section>;

  return scorePage;
}

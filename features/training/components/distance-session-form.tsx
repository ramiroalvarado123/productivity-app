"use client";
import { SaveButtonContent } from "@/shared/ui/save-button";
import type { SavePhase, TrainingLog } from "@/shared/data/types";
import { formatDecimalInput, paceLabel, parseDecimalInput } from "@/shared/lib/numbers";
import { useState } from "react";

/**
 * Detalle de sesión para disciplinas de distancia (running, ciclismo,
 * natación): distancia + tiempo, con el ritmo calculado en vivo. Es
 * controlado (no FormData) porque necesita recalcular el ritmo mientras se
 * escribe; `key={disciplineId-date}` en el padre lo remonta al cambiar de
 * disciplina o de día, así vuelve a partir de lo que ya había ese día.
 */
export function DistanceSessionForm({ disciplineId, date, log, saving, savePhase, onSave }: {
  disciplineId: number;
  date: string;
  log: TrainingLog | undefined;
  saving: boolean;
  savePhase: SavePhase;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [durationDraft, setDurationDraft] = useState(log?.durationMinutes ? formatDecimalInput(log.durationMinutes) : "");
  const [distanceDraft, setDistanceDraft] = useState(log?.distanceMeters ? formatDecimalInput(log.distanceMeters / 1000) : "");
  const pace = paceLabel(parseDecimalInput(durationDraft), parseDecimalInput(distanceDraft));
  return <form className="data-form" onSubmit={(event) => { event.preventDefault(); onSave({ action: "save_training", disciplineId, date, durationMinutes: durationDraft, distanceKm: distanceDraft }); }}>
    <div className="two-fields">
      <label>Distancia (km)<input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" value={distanceDraft} onChange={(event) => setDistanceDraft(event.target.value)} /></label>
      <label>Tiempo (min)<input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" value={durationDraft} onChange={(event) => setDurationDraft(event.target.value)} /></label>
    </div>
    <div className="pace-preview"><span>◷</span><p><small>RITMO</small><b>{pace ?? "Cargá distancia y tiempo"}</b></p></div>
    <button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar sesión" phase={savePhase} /></button>
  </form>;
}

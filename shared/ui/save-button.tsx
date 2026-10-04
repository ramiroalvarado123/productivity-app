/** Mantiene el ancho original del botón mientras muestra carga y confirmación. */
import type { ReactNode } from "react";
import type { SavePhase } from "@/shared/data/types";
export function SaveButtonContent({ label, phase }: { label: ReactNode; phase: SavePhase }) {
  return <span className="save-button-content">
    <span className="save-button-label" aria-hidden={phase !== null}>{label}</span>
    {phase === "saving" && <span className="save-button-feedback save-button-loading" role="status" aria-label="Guardando"><i /><i /><i /></span>}
    {phase === "saved" && <span className="save-button-feedback save-button-saved" role="status" aria-label="Guardado">✓</span>}
  </span>;
}

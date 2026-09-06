"use client";

import { useEffect, useState, type CSSProperties } from "react";

export type TourStep = { selector: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

function measure(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/**
 * Recorrido guiado de la primera vez: dimma toda la pantalla salvo un
 * recorte alrededor del elemento del paso actual (el truco de siempre para
 * esto es un box-shadow enorme en un div sin fondo — más simple y con mejor
 * soporte que clip-path/SVG), con un cartel al lado explicando qué es.
 * Sólo avanza con los botones: el resto de la pantalla queda bloqueado a
 * propósito, porque esto es "mostrar", no "practicar".
 */
export function TourOverlay({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  useEffect(() => {
    const update = () => setRect(measure(step.selector));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step.selector]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onDone(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onDone]);

  if (!rect) return null;

  const pad = 8;
  const spotlightStyle: CSSProperties = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  const calloutWidth = 290;
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const calloutTop = spaceBelow > 200 ? rect.top + rect.height + pad + 14 : Math.max(14, rect.top - pad - 14 - 170);
  const calloutLeft = Math.min(Math.max(14, rect.left), window.innerWidth - calloutWidth - 14);
  const isLast = index + 1 >= steps.length;

  return <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Recorrido guiado">
    <div className="tour-spotlight" style={spotlightStyle} />
    <div className="tour-callout" style={{ top: calloutTop, left: calloutLeft, width: calloutWidth }}>
      <p className="tour-step-count">PASO {index + 1} DE {steps.length}</p>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="tour-actions">
        <button type="button" className="tour-skip" onClick={onDone}>Omitir</button>
        <button type="button" className="tour-next" onClick={() => (isLast ? onDone() : setIndex(index + 1))}>{isLast ? "Listo" : "Siguiente →"}</button>
      </div>
    </div>
  </div>;
}

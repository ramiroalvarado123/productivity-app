"use client";
import { dateMinus, weekFor } from "@/domain/dates";
import { useState } from "react";

/**
 * Semana navegable para elegir el día que se registra, igual que el
 * calendario de Físico: flechas para ir de semana en semana y un toque sobre
 * el día lo abre. Los días con datos se marcan con ✓ y no se puede ir al futuro.
 */
export function DayStrip({ value, today, onChange, markedDates, label }: {
  value: string;
  today: string;
  onChange: (date: string) => void;
  markedDates: Set<string>;
  label: string;
}) {
  const [anchor, setAnchor] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  // Si la fecha cambia desde afuera (p. ej. empieza un día nuevo), la semana visible la acompaña.
  if (value !== previousValue) {
    setPreviousValue(value);
    setAnchor(value);
  }
  const week = weekFor(anchor);
  const shortDay = (date: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(date + "T12:00:00")).replace(".", "");
  const atCurrentWeek = week[6].iso >= today;
  const marked = week.filter((day) => markedDates.has(day.iso)).length;
  return <div className="day-strip" role="group" aria-label={label}>
    <div className="calendar-head training-week-nav">
      <button type="button" onClick={() => setAnchor((current) => dateMinus(current, 7))} aria-label="Semana anterior">‹</button>
      <div className="training-week-nav-title">
        <h2>{shortDay(week[0].iso)} – {shortDay(week[6].iso)}</h2>
        {value !== today ? <button type="button" className="training-week-today" onClick={() => { setAnchor(today); onChange(today); }}>Volver a hoy</button> : <span className="week-pill">{marked}/7 días registrados</span>}
      </div>
      <button type="button" onClick={() => setAnchor((current) => dateMinus(current, -7))} disabled={atCurrentWeek} aria-label="Semana siguiente">›</button>
    </div>
    <div className="week-row">{week.map((day) => {
      const done = markedDates.has(day.iso);
      const future = day.iso > today;
      return <button key={day.iso} type="button" disabled={future} aria-pressed={day.iso === value} className={(done ? "done " : "") + (day.iso === today ? "today" : "") + (day.iso === value ? " active" : "")} onClick={() => onChange(day.iso)}><small>{day.short}</small><b>{done ? "✓" : day.number}</b>{day.iso === today && <i />}</button>;
    })}</div>
  </div>;
}

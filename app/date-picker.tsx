"use client";

import { useEffect, useRef, useState } from "react";

type DatePickerProps = {
  id?: string;
  /** Si se pasa, el valor viaja como <input type="hidden"> para forms sin estado (FormData). */
  name?: string;
  ariaLabel?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  /** Fecha mínima seleccionable, "YYYY-MM-DD". Los días anteriores quedan deshabilitados. */
  min?: string;
  placeholder?: string;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function formatShort(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
}
function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const value = new Date(year, month - 1 + amount, 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function daysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}
/** Offset del primer día del mes contra un calendario que arranca en lunes. */
function firstWeekdayOffset(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

/**
 * Selector de fecha con la misma estética que el resto de los desplegables:
 * un botón que abre un panel, esta vez con una grilla de mes en vez de una
 * lista. El valor sigue siendo un "YYYY-MM-DD" plano, así que alimenta el
 * mismo calendario/agenda que ya arma la app con lo que se carga a mano.
 */
export function DatePicker({ id, name, ariaLabel, value, onChange, defaultValue, min, placeholder }: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value : internalValue;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => (currentValue || defaultValue || todayIso()).slice(0, 7));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isControlled || !name) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? "");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [isControlled, name, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function togglePicker() {
    if (!open) setCursor((currentValue || todayIso()).slice(0, 7));
    setOpen((current) => !current);
  }

  function pick(date: string) {
    if (!isControlled) setInternalValue(date);
    onChange?.(date);
    setOpen(false);
  }

  const offset = firstWeekdayOffset(cursor);
  const total = daysInMonth(cursor);
  const today = todayIso();

  return (
    <div className="ui-dropdown date-picker" data-open={open} ref={rootRef}>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <button type="button" id={id} className="ui-dropdown-trigger" aria-haspopup="dialog" aria-label={ariaLabel} aria-expanded={open} onClick={togglePicker}>
        <span>{currentValue ? formatShort(currentValue) : (placeholder ?? "Elegir fecha")}</span>
        <i className="ui-dropdown-caret" aria-hidden="true">⌄</i>
      </button>
      {open && <div className="date-picker-panel" role="dialog" aria-label={ariaLabel}>
        <div className="date-picker-head">
          <button type="button" onClick={() => setCursor((current) => shiftMonth(current, -1))} aria-label="Mes anterior">‹</button>
          <b>{monthLabel(cursor)}</b>
          <button type="button" onClick={() => setCursor((current) => shiftMonth(current, 1))} aria-label="Mes siguiente">›</button>
        </div>
        <div className="date-picker-weekdays">{WEEKDAY_LABELS.map((label, index) => <span key={label + index}>{label}</span>)}</div>
        <div className="date-picker-grid">
          {Array.from({ length: offset }, (_, index) => <span key={"blank" + index} />)}
          {Array.from({ length: total }, (_, index) => {
            const day = index + 1;
            const date = `${cursor}-${String(day).padStart(2, "0")}`;
            const disabled = Boolean(min) && date < (min as string);
            return <button
              type="button"
              key={date}
              disabled={disabled}
              className={(date === currentValue ? "selected " : "") + (date === today ? "today" : "")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); pick(date); }}
            >{day}</button>;
          })}
        </div>
      </div>}
    </div>
  );
}

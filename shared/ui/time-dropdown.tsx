"use client";

import { useEffect, useRef, useState } from "react";
import { Dropdown, type DropdownOption } from "@/shared/ui/dropdown";

const MINUTE_OPTIONS: DropdownOption[] = Array.from({ length: 12 }, (_, index) => {
  const label = String(index * 5).padStart(2, "0");
  return { value: label, label };
});

/** Horas 00 a 23, para campos de horario sin una franja acotada (ej. un evento cualquiera). */
export const FULL_DAY_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

type TimeFieldPickerProps = {
  idPrefix: string;
  label: string;
  hourOptions: string[];
  /** Modo controlado. */
  value?: string;
  onChange?: (value: string) => void;
  /** Modo no controlado (junto con `name`, como un input dentro de un form leído con FormData). */
  name?: string;
  defaultValue?: string;
};

/**
 * Hora + minuto como dos desplegables cortos (no un <select> nativo de 1-12
 * con AM/PM, ni una sola lista gigante con las 24 h en pasos de 5 minutos).
 * `hourOptions` acota las horas a las que tienen sentido para ese campo
 * (por ej. acostarse: 19 a 05), así la lista de horas queda corta y rápida
 * de recorrer.
 */
export function TimeFieldPicker({ idPrefix, label, value, onChange, hourOptions, name, defaultValue }: TimeFieldPickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? `${hourOptions[0]}:00`);
  const currentValue = isControlled ? value : internalValue;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isControlled || !name) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? `${hourOptions[0]}:00`);
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [isControlled, name, defaultValue, hourOptions]);

  function setValue(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  }

  const [hour, minute] = currentValue.split(":");
  const hourDropdownOptions: DropdownOption[] = hourOptions.map((option) => ({ value: option, label: option }));
  return (
    <div className="time-field" ref={rootRef}>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <label htmlFor={idPrefix + "-hour"}>{label}</label>
      <div className="time-field-row">
        <Dropdown id={idPrefix + "-hour"} className="time-dropdown-compact" ariaLabel={`${label}: hora`} value={hour} options={hourDropdownOptions} onChange={(nextHour) => setValue(`${nextHour}:${minute}`)} />
        <i className="time-field-colon">:</i>
        <Dropdown id={idPrefix + "-minute"} className="time-dropdown-compact" ariaLabel={`${label}: minutos`} value={minute} options={MINUTE_OPTIONS} onChange={(nextMinute) => setValue(`${hour}:${nextMinute}`)} />
      </div>
    </div>
  );
}

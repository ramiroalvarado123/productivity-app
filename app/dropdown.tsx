"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

type DropdownProps = {
  id?: string;
  /** Si se pasa, el valor viaja como <input type="hidden"> para que los forms sin estado (FormData) lo lean igual que un <select name=...>. */
  name?: string;
  ariaLabel?: string;
  options: DropdownOption[];
  /** Modo controlado. */
  value?: string;
  onChange?: (value: string) => void;
  /** Modo no controlado (junto con `name`). */
  defaultValue?: string;
  placeholder?: string;
  className?: string;
};

/**
 * Reemplazo de <select> con la estética del selector de hora: un botón que
 * abre una lista corta con scroll suave, sin el look nativo del browser.
 * Funciona controlado (value/onChange) o no controlado (name/defaultValue,
 * como un <select> dentro de un form que se lee con FormData) — incluye
 * soporte para el evento nativo "reset" del form, porque un <input
 * type="hidden"> controlado por React no vuelve solo a su valor por
 * defecto cuando el form llama a .reset().
 */
export function Dropdown({ id, name, ariaLabel, options, value, onChange, defaultValue, placeholder, className }: DropdownProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  // Un <select> nativo vuelve solo al primer <option> cuando la lista de
  // opciones cambia y la seleccionada ya no está (ej. cambiar de pestaña
  // cambia qué proyectos hay para elegir). Por eso el valor efectivo no es
  // el estado crudo: si ya no aparece entre las opciones, se recalcula acá
  // mismo (en el render) en vez de "corregirlo" en un efecto aparte.
  const currentValue = isControlled
    ? value
    : options.some((option) => option.value === internalValue) ? internalValue : (options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isControlled || !name) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? options[0]?.value ?? "");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [isControlled, name, defaultValue, options]);

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

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
  }, [open]);

  function selectOption(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  const selectedLabel = options.find((option) => option.value === currentValue)?.label ?? placeholder ?? "";

  return (
    <div className={"ui-dropdown " + (className ?? "")} data-open={open} ref={rootRef}>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <button type="button" id={id} className="ui-dropdown-trigger" aria-haspopup="listbox" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{selectedLabel}</span>
        <i className="ui-dropdown-caret" aria-hidden="true">⌄</i>
      </button>
      {open && <div className="ui-dropdown-panel" role="listbox" aria-label={ariaLabel} ref={panelRef}>
        {options.map((option) => <button
          type="button"
          key={option.value}
          role="option"
          aria-selected={option.value === currentValue}
          data-selected={option.value === currentValue}
          className={"ui-dropdown-option " + (option.value === currentValue ? "selected" : "")}
          onClick={() => selectOption(option.value)}
        >{option.label}</button>)}
      </div>}
    </div>
  );
}

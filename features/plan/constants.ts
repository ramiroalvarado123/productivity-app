import type { DropdownOption } from "@/shared/ui/dropdown";
export const EVENT_CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "personal", label: "Personal" }, { value: "study", label: "Estudio" }, { value: "work", label: "Trabajo" },
  { value: "training", label: "Entrenamiento" }, { value: "nutrition", label: "Alimentación" }, { value: "sleep", label: "Sueño" },
  { value: "reading", label: "Lectura" }, { value: "health", label: "Salud" }, { value: "other", label: "Otro" },
];
export const SLOT_CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "focus", label: "Estudio / trabajo · elegir proyecto" },
  { value: "training", label: "Entrenamiento · elegir disciplina" },
  { value: "nutrition", label: "Alimentación" },
  { value: "sleep", label: "Sueño" },
  { value: "study", label: "Estudio · elegir materia" },
  { value: "work", label: "Trabajo · elegir proyecto" },
  { value: "reading", label: "Lectura" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Otro" },
];

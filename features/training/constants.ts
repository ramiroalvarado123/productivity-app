import type { Discipline } from "@/shared/data/types";
import type { DropdownOption } from "@/shared/ui/dropdown";
export const WEEKLY_TARGET_OPTIONS: DropdownOption[] = Array.from({ length: 14 }, (_, index) => ({ value: String(index + 1), label: `${index + 1} por semana` }));

export const kindLabels: Record<Discipline["kind"], string> = { strength: "Fuerza / gimnasio", running: "Running", cycling: "Ciclismo", swimming: "Natación", sport: "Deporte", other: "Otra" };

export const disciplineKindOptions: DropdownOption[] = Object.entries(kindLabels).map(([value, label]) => ({ value, label }));
export const TRAINING_QUALITY_OPTIONS = [
  { value: 1, label: "Malo" },
  { value: 2, label: "Regular" },
  { value: 3, label: "Bueno" },
  { value: 4, label: "Muy bueno" },
] as const;
export const DISCIPLINE_PRIORITY_OPTIONS = [
  { value: "secondary", label: "Secundaria" },
  { value: "important", label: "Importante" },
] as const;

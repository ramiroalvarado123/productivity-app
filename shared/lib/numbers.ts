import type { DropdownOption } from "@/shared/ui/dropdown";
import { formatMinutes } from "@/shared/lib/format";
export function averageNumbers(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function durationOptions(minutesList: number[]): DropdownOption[] {
  return minutesList.map((minutes) => ({ value: String(minutes), label: formatMinutes(minutes) }));
}
export const FOCUS_DAILY_TARGET_OPTIONS = durationOptions([30, 60, 90, 120, 150, 180, 240, 300, 360, 480]);
export function formatFocusHours(minutes: number) {
  const hours = Math.max(0, minutes) / 60;
  const value = Number.isInteger(hours) ? String(hours) : hours.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `${value} h`;
}

/** "5:30 min/km": el ritmo no se carga a mano, sale de tiempo y distancia. */
export function paceLabel(durationMinutes: number, distanceKm: number) {
  if (!durationMinutes || !distanceKm) return null;
  const totalSeconds = Math.round((durationMinutes * 60) / distanceKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

export function parseDecimalInput(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
export function formatDecimalInput(value: number) {
  return value > 0 ? String(value).replace(".", ",") : "";
}

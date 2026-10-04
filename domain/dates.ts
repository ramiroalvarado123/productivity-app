/** Fechas como texto "AAAA-MM-DD" (así se guardan): todo se calcula al mediodía para evitar saltos de zona horaria. */
import type { GoalPeriod } from "@/shared/data/types";
import { dateInTimeZone, minutesFromClock } from "@/shared/lib/format";

export function argentinaDate() {
  return dateInTimeZone("America/Argentina/Buenos_Aires");
}
/** Hora actual en Buenos Aires, en minutos desde medianoche. */
export function argentinaMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return minutesFromClock(parts) ?? 0;
}

export function weekFor(date: string) {
  const center = new Date(date + "T12:00:00");
  const mondayOffset = (center.getDay() + 6) % 7;
  const monday = new Date(center);
  monday.setDate(center.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return { iso: current.toISOString().slice(0, 10), short: ["L", "M", "M", "J", "V", "S", "D"][index], number: current.getDate() };
  });
}

export function shiftMonthStart(date: string, offset: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(1);
  value.setMonth(value.getMonth() + offset);
  return value.toISOString().slice(0, 10);
}
export function lastDayOfMonth(monthStart: string) {
  const value = new Date(monthStart + "T12:00:00");
  value.setMonth(value.getMonth() + 1, 0);
  return value.toISOString().slice(0, 10);
}

export function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const total = Math.max(0, Math.round((new Date(end + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / 86400000) + 1);
  for (let index = 0; index < total; index += 1) dates.push(datePlus(start, index));
  return dates;
}
export function averageNumbers(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
/** Fecha objetivo para los plazos relativos. "custom" no pasa por acá: ahí el usuario elige el día exacto con el DatePicker. */
export function goalDeadline(today: string, period: Exclude<GoalPeriod, "custom">) {
  const date = new Date(today + "T12:00:00");
  if (period === "weekly") date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  if (period === "monthly") date.setMonth(date.getMonth() + 1, 0);
  if (period === "annual") date.setMonth(11, 31);
  return date.toISOString().slice(0, 10);
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
}
export function dayDistance(from: string, to: string) {
  return Math.ceil((new Date(to + "T12:00:00").getTime() - new Date(from + "T12:00:00").getTime()) / 86400000);
}
export function datePlus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}
/** "mañana" / "el miércoles": cómo se nombra un día cercano al hablar. */
export function weekdayLabel(date: string) {
  const name = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(new Date(date + "T12:00:00"));
  return name === "sábado" || name === "domingo" ? `el ${name}` : `el ${name}`;
}
/** Días con actividad dentro de los últimos siete, para el corte semanal. */
export function countActiveDays(byDate: Record<string, number>, today: string, days = 7) {
  let count = 0;
  for (let offset = 0; offset < days; offset += 1) {
    if ((byDate[dateMinus(today, offset)] ?? 0) > 0) count += 1;
  }
  return count;
}
export function dateMinus(date: string, days: number) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

/** Valida un "HH:MM" en 24 h (lo que devuelve un input type="time"); si no matchea, el fallback. */
export function normalizeClock(value: string, fallback: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}
export function sleepDuration(bedtime: string, wakeTime: string) {
  const [bedHour, bedMinute] = bedtime.split(":").map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(":").map(Number);
  let minutes = wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.min(minutes, 24 * 60);
}

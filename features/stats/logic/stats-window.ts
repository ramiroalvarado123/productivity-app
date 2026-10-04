import type { StatsPeriod } from "@/shared/data/types";
import { dateMinus, datePlus, formatDate, lastDayOfMonth, shiftMonthStart, weekFor } from "@/domain/dates";
export const STAT_WEEKDAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const STAT_MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export type StatsWindow = { start: string; end: string; title: string };


export function statsWindowFor(period: StatsPeriod, offset: number, reference: string): StatsWindow {
  if (period === "weekly") {
    const monday = weekFor(reference)[0].iso;
    const start = dateMinus(monday, offset * 7);
    const end = datePlus(start, 6);
    return { start, end, title: "Semana del " + formatDate(start) + " al " + formatDate(end) };
  }
  if (period === "monthly") {
    const start = shiftMonthStart(reference, -offset);
    return { start, end: lastDayOfMonth(start), title: new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(start + "T12:00:00")) };
  }
  const year = Number(reference.slice(0, 4)) - offset;
  const start = year + "-01-01";
  return { start, end: year + "-12-31", title: String(year) };
}

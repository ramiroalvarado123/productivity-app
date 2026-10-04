/** Validaciones y normalizaciones compartidas por cliente y servidor. */

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH = /^\d{4}-\d{2}$/;
export const USERNAME = /^[a-z0-9_]{3,20}$/;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "" si viene vacío, la hora si es válida, null si es inválida. */
export function cleanTime(value: unknown): string | null {
  const time = String(value ?? "").trim();
  return !time ? "" : TIME.test(time) ? time : null;
}
/** Número que acepta coma decimal ("1,5"); 0 si no se puede leer. */
export function numeric(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
export function decimal(value: unknown, maximum: number, places = 2) {
  const factor = 10 ** places;
  return Math.max(0, Math.min(maximum, Math.round(numeric(value) * factor) / factor));
}
export function daysBefore(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - days); return value.toISOString().slice(0, 10);
}
export function stringArray(value: unknown) {
  try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []; } catch { return []; }
}

/** Helpers de texto y fecha compartidos por la interfaz. */

/** Devuelve una fecha ISO (AAAA-MM-DD) en la zona horaria indicada. */
export function dateInTimeZone(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** "1 día" / "3 días" — evita el clásico "faltan 1 días". */
export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "hoy" / "mañana" / "falta 1 día" / "faltan 5 días" / "hace 2 días". */
export function countdownLabel(days: number) {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  if (days < 0) return `hace ${pluralize(Math.abs(days), "día", "días")}`;
  return `faltan ${pluralize(days, "día", "días")}`;
}

/** Versión con mayúscula inicial, para cuando arranca una frase. */
export function countdownLabelCapitalized(days: number) {
  const label = countdownLabel(days);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Minutos a "1 h 30 min" / "45 min" / "2 h". */
export function formatMinutes(minutes: number) {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** "Entrenamiento, Lectura y Sueño" — enumeración natural en español. */
export function listPhrase(items: string[]) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** "07:30" → minutos desde medianoche. Devuelve null si no es una hora válida. */
export function minutesFromClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** Minutos desde medianoche → "07:30". Envuelve más allá de las 24 h. */
export function clockFromMinutes(minutes: number) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

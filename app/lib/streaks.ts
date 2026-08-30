/**
 * Rachas y tendencias. Todo se calcula sobre el historial que ya devuelve
 * /api/progress: no hay estado nuevo que guardar ni llamadas extra.
 */

export type TrendPoint = { date: string; value: number };

export type Trend = {
  points: TrendPoint[];
  total: number;
  average: number;
  previousTotal: number;
  /** Variación porcentual contra el período anterior de la misma longitud. */
  deltaPercent: number | null;
  best: number;
};

export type Streak = {
  current: number;
  best: number;
  /** La racha sigue viva pero hoy todavía no se registró nada. */
  pendingToday: boolean;
};

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * Racha de días consecutivos con actividad, contando hacia atrás desde hoy.
 * Si hoy todavía no hay registro la racha no se corta: se cuenta desde ayer y
 * se marca `pendingToday`, que es lo que permite avisar "no la pierdas".
 */
export function streakFor(activeDates: Iterable<string>, today: string): Streak {
  const active = new Set(activeDates);
  const pendingToday = !active.has(today);
  let cursor = pendingToday ? shiftDate(today, -1) : today;
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let previous = "";
  for (const date of sorted) {
    run = previous && shiftDate(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }

  return { current, best: Math.max(best, current), pendingToday: pendingToday && current > 0 };
}

/**
 * Serie diaria de `days` días terminando hoy, más el total del período
 * inmediatamente anterior para poder comparar.
 */
export function trendFor(days: number, today: string, valueForDate: (date: string) => number): Trend {
  const points: TrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    points.push({ date, value: valueForDate(date) });
  }

  let previousTotal = 0;
  for (let offset = days * 2 - 1; offset >= days; offset -= 1) {
    previousTotal += valueForDate(shiftDate(today, -offset));
  }

  const total = points.reduce((sum, point) => sum + point.value, 0);
  const deltaPercent = previousTotal > 0 ? Math.round((total - previousTotal) / previousTotal * 100) : null;

  return {
    points,
    total,
    average: points.length ? total / points.length : 0,
    previousTotal,
    deltaPercent,
    best: Math.max(0, ...points.map((point) => point.value)),
  };
}

/** Agrupa registros por fecha sumando un campo numérico. */
export function sumByDate<T>(rows: T[], dateOf: (row: T) => string, valueOf: (row: T) => number) {
  return rows.reduce<Record<string, number>>((totals, row) => {
    const date = dateOf(row);
    totals[date] = (totals[date] ?? 0) + valueOf(row);
    return totals;
  }, {});
}

/** Puntos de una serie normalizados a 0-100 para dibujar un sparkline. */
export function sparklinePath(points: TrendPoint[], width: number, height: number) {
  if (points.length < 2) return "";
  const maximum = Math.max(1, ...points.map((point) => point.value));
  const step = width / (points.length - 1);
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${(height - point.value / maximum * height).toFixed(1)}`)
    .join(" ");
}

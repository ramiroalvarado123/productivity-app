import type { BadgeSymbol, BadgeTier } from "../badge-icons";

export type BadgeMetric = "bestStreak" | "totalUseDays" | "scoreAbove90Days" | "perfectScoreDays";
export type BadgeStats = Record<BadgeMetric, number>;
export type BadgeDefinition = { id: string; group: string; title: string; metric: BadgeMetric; target: number; symbol: BadgeSymbol; tier: BadgeTier };

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "streak-50", group: "Rachas", title: "50 días seguidos", metric: "bestStreak", target: 50, symbol: "flame", tier: "bronze" },
  { id: "streak-100", group: "Rachas", title: "100 días seguidos", metric: "bestStreak", target: 100, symbol: "flame", tier: "silver" },
  { id: "streak-365", group: "Rachas", title: "365 días seguidos", metric: "bestStreak", target: 365, symbol: "flame", tier: "gold" },
  { id: "use-50", group: "Días de uso total", title: "50 días usando AVORA", metric: "totalUseDays", target: 50, symbol: "calendar", tier: "bronze" },
  { id: "use-100", group: "Días de uso total", title: "100 días usando AVORA", metric: "totalUseDays", target: 100, symbol: "calendar", tier: "silver" },
  { id: "use-200", group: "Días de uso total", title: "200 días usando AVORA", metric: "totalUseDays", target: 200, symbol: "calendar", tier: "gold" },
  { id: "use-500", group: "Días de uso total", title: "500 días usando AVORA", metric: "totalUseDays", target: 500, symbol: "calendar", tier: "platinum" },
  { id: "use-1000", group: "Días de uso total", title: "1000 días usando AVORA", metric: "totalUseDays", target: 1000, symbol: "calendar", tier: "diamond" },
  { id: "score-90-20", group: "Daily Score mayor a 90", title: "20 días arriba de 90", metric: "scoreAbove90Days", target: 20, symbol: "star", tier: "bronze" },
  { id: "score-90-50", group: "Daily Score mayor a 90", title: "50 días arriba de 90", metric: "scoreAbove90Days", target: 50, symbol: "star", tier: "silver" },
  { id: "score-90-100", group: "Daily Score mayor a 90", title: "100 días arriba de 90", metric: "scoreAbove90Days", target: 100, symbol: "star", tier: "gold" },
  { id: "score-100-20", group: "Daily Score perfecto", title: "20 días con 100 puntos", metric: "perfectScoreDays", target: 20, symbol: "target", tier: "bronze" },
  { id: "score-100-50", group: "Daily Score perfecto", title: "50 días con 100 puntos", metric: "perfectScoreDays", target: 50, symbol: "target", tier: "silver" },
  { id: "score-100-100", group: "Daily Score perfecto", title: "100 días con 100 puntos", metric: "perfectScoreDays", target: 100, symbol: "target", tier: "gold" },
];

const validBadgeIds = new Set(BADGE_DEFINITIONS.map((badge) => badge.id));

export function normalizeBadgeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && validBadgeIds.has(id)))];
}

/** Conserva los logros ya publicados aunque luego cambien o borren datos. */
export function mergeBadgeIds(existing: unknown, incoming: unknown): string[] {
  return [...new Set([...normalizeBadgeIds(existing), ...normalizeBadgeIds(incoming)])];
}

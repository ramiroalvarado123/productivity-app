import { emptyAppEngagement, normalizeAppEngagement, type AppEngagement } from "./app-engagement";

const ENGAGEMENT_KEY = "avoraEngagement";

function parsedValue(value: unknown): unknown {
  try {
    return JSON.parse(String(value ?? "[]"));
  } catch {
    return [];
  }
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Lee preferencias viejas (array) y nuevas (sobre JSON con estado de racha). */
export function profilePreferences(value: unknown): string[] {
  const parsed = parsedValue(value);
  if (Array.isArray(parsed)) return strings(parsed);
  if (typeof parsed === "object" && parsed !== null) return strings((parsed as Record<string, unknown>).preferences);
  return [];
}

export function profileEngagement(value: unknown): AppEngagement {
  const parsed = parsedValue(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return emptyAppEngagement();
  return normalizeAppEngagement((parsed as Record<string, unknown>)[ENGAGEMENT_KEY]);
}

/** Actualiza preferencias sin borrar el estado interno de rachas. */
export function usagePreferencesJsonWithPreferences(rawValue: unknown, preferences: string[]) {
  const parsed = parsedValue(rawValue);
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && ENGAGEMENT_KEY in parsed) {
    return JSON.stringify({
      ...(parsed as Record<string, unknown>),
      preferences,
      [ENGAGEMENT_KEY]: profileEngagement(rawValue),
    });
  }
  return JSON.stringify(preferences);
}

/** Guarda rachas en el campo JSON existente, preservando las preferencias. */
export function usagePreferencesJsonWithEngagement(rawValue: unknown, engagement: AppEngagement) {
  return JSON.stringify({
    preferences: profilePreferences(rawValue),
    [ENGAGEMENT_KEY]: normalizeAppEngagement(engagement),
  });
}

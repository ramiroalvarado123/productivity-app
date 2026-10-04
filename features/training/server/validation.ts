export function trainingQuality(value: unknown): number | null | undefined {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : undefined;
}
export function trainingPriority(value: unknown): "important" | "secondary" | null {
  const parsed = String(value ?? "");
  return parsed === "important" || parsed === "secondary" ? parsed : null;
}

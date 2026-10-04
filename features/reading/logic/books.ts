export const bookLanguageOptions = [
  ["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"], ["fr", "Francés"], ["it", "Italiano"], ["de", "Alemán"],
] as const;

export function normalizeBookText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

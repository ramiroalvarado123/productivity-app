/**
 * Actualización optimista: el servidor devuelve las filas que cambió (`patch`)
 * y el cliente las aplica al instante, sin esperar la recarga completa.
 * Es lógica pura: el mismo orden que usa `GET /api/progress` para cada colección.
 */

export type CollectionKey =
  | "trainingLogs" | "exerciseLogs" | "mealHistory" | "readingHistory" | "books" | "notes"
  | "goals" | "dailyCheckins" | "focusSessions" | "tasks" | "events";

export type PatchRow = { id: number } & Record<string, unknown>;

export type DataPatch = {
  /** Filas nuevas o editadas, con el mismo formato que devuelve el GET. */
  upsert?: Partial<Record<CollectionKey, PatchRow[]>>;
  /** Ids borrados. */
  remove?: Partial<Record<CollectionKey, number[]>>;
};

type Direction = "asc" | "desc";

// Debe coincidir con los `order` de las consultas de app/api/progress/route.ts.
const ORDER: Record<CollectionKey, Array<[string, Direction]>> = {
  trainingLogs: [["trainingDate", "desc"], ["id", "desc"]],
  exerciseLogs: [["createdAt", "desc"]],
  mealHistory: [["mealDate", "desc"]],
  readingHistory: [["logDate", "desc"]],
  books: [["createdAt", "desc"]],
  notes: [["createdAt", "desc"]],
  goals: [["completedAt", "asc"], ["targetDate", "asc"], ["createdAt", "desc"]],
  dailyCheckins: [["entryDate", "desc"]],
  focusSessions: [["sessionDate", "desc"]],
  tasks: [["completedAt", "asc"], ["dueDate", "asc"], ["createdAt", "desc"]],
  events: [["eventDate", "asc"], ["eventTime", "asc"]],
};

/** Postgres: en ascendente los nulos van al final; en descendente, al principio. */
function compareValues(a: unknown, b: unknown, direction: Direction) {
  const aNull = a === null || a === undefined, bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return direction === "asc" ? 1 : -1;
  if (bNull) return direction === "asc" ? -1 : 1;
  if (a === b) return 0;
  const result = (a as string | number) < (b as string | number) ? -1 : 1;
  return direction === "asc" ? result : -result;
}

function sortRows(key: CollectionKey, rows: PatchRow[]) {
  const order = ORDER[key];
  return [...rows].sort((left, right) => {
    for (const [field, direction] of order) {
      const result = compareValues(left[field], right[field], direction);
      if (result !== 0) return result;
    }
    return 0;
  });
}

const isCollection = (key: string): key is CollectionKey => key in ORDER;

export function applyPatch<T extends object>(data: T, patch: DataPatch, today: string): T {
  const next = { ...data } as Record<string, unknown>;
  const touched = new Set<string>();
  const rowsOf = (key: string) => Array.isArray(next[key]) ? next[key] as PatchRow[] : null;

  for (const [key, ids] of Object.entries(patch.remove ?? {})) {
    const rows = rowsOf(key);
    if (!isCollection(key) || !rows || !ids?.length) continue;
    next[key] = rows.filter((row) => !ids.includes(row.id));
    touched.add(key);
  }
  for (const [key, incoming] of Object.entries(patch.upsert ?? {})) {
    const rows = rowsOf(key);
    if (!isCollection(key) || !rows || !incoming?.length) continue;
    const byId = new Map(incoming.map((row) => [row.id, row]));
    const known = new Set(rows.map((row) => row.id));
    const created = incoming.filter((row) => !known.has(row.id));
    next[key] = sortRows(key, [...created, ...rows.map((row) => byId.get(row.id) ?? row)]);
    touched.add(key);
  }

  // Las listas de "hoy" salen de las de historial, como en el GET.
  if (touched.has("mealHistory") && Array.isArray(next.meals)) {
    const todays = (next.mealHistory as PatchRow[]).filter((row) => row.mealDate === today);
    next.meals = [...todays].sort((left, right) => compareValues(left.createdAt, right.createdAt, "asc"));
  }
  if (touched.has("readingHistory") && Array.isArray(next.readingLogs)) {
    next.readingLogs = (next.readingHistory as PatchRow[]).filter((row) => row.logDate === today);
  }
  if (touched.has("dailyCheckins") && "dailyCheckin" in next) {
    next.dailyCheckin = (next.dailyCheckins as PatchRow[]).find((row) => row.entryDate === today) ?? null;
  }
  return next as T;
}

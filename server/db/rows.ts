import { insertRows, selectRows } from "@/server/db/postgrest";
import { dateInTimeZone } from "@/shared/lib/format";

/** Fila genérica de las tablas de progreso, con los campos que más se leen tipados. */
export type ProgressRow = Record<string, unknown> & {
  id: number;
  kind: string;
  displayName: string;
  onboardingCompleted: boolean;
  mainGoalsJson: string;
  usagePreferencesJson: string;
  proSince: string | null;
  focusDailyTargetMinutes: number;
  disciplineId: number;
  trainingDate: string;
  durationMinutes: number;
  distanceMeters: number;
  notes: string;
  quality: number | null;
  priority: "important" | "secondary";
  entryDate: string;
  dueDate: string | null;
  totalPages: number;
  currentPage: number;
  minutes: number;
  pages: number;
};

export const now = () => new Date().toISOString();
export const today = () => dateInTimeZone("America/Argentina/Buenos_Aires");

/** Primera fila propia que cumple el filtro (sirve para validar que un padre es tuyo). */
export async function owned(table: string, email: string, where: Record<string, string | number | boolean | null> = {}) {
  return selectRows<ProgressRow>(table, { where: { userEmail: email, ...where }, limit: 1 });
}
export async function upsert(table: string, values: Record<string, unknown>, conflict: string[]) {
  return insertRows<ProgressRow>(table, { ...values, updatedAt: now() }, { upsert: true, onConflict: conflict, returnRows: true });
}

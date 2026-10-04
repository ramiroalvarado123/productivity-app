import type { DataPatch } from "@/shared/data/apply-patch";

export const ok = (extra = {}) => Response.json({ ok: true, ...extra });
/** Devuelve las filas que cambió la acción para que el cliente las aplique sin recargar todo. */
export const patched = (patch: DataPatch, extra = {}) => ok({ patch, ...extra });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** Mide cada tramo del pedido y lo expone en el header Server-Timing (pestaña Network del navegador). */
export function serverTiming() {
  const start = performance.now();
  let last = start;
  const parts: string[] = [];
  return {
    mark(name: string) { const now = performance.now(); parts.push(`${name};dur=${Math.round(now - last)}`); last = now; },
    header() { return [...parts, `total;dur=${Math.round(performance.now() - start)}`].join(", "); },
  };
}
export type Timing = ReturnType<typeof serverTiming>;

export function isTransientSupabaseError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /Supabase (408|425|429|500|502|503|504)\b/.test(message) || /fetch failed|network/i.test(message);
}

/** Una función RPC que todavía no se creó en Supabase (migración sin aplicar). */
export function isMissingRpc(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /Could not find the function|PGRST202|does not exist/i.test(message);
}

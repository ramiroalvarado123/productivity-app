import { accessToken } from "@/server/auth/session";
import { SUPABASE_URL, authHeaders } from "@/shared/config/supabase";

type Scalar = string | number | boolean | null;
type Row = Record<string, unknown>;

const toSnake = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Fila de Postgres (snake_case) al formato que usa la app (camelCase). */
export function camelRow<T extends Row = Row>(row: Row): T {
  return mapKeys(row, toCamel) as T;
}

function mapKeys(row: Row, transform: (key: string) => string): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [transform(key), value]));
}

function encodeFilter(value: Scalar) {
  if (value === null) return "is.null";
  return `eq.${String(value)}`;
}

const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [300, 900, 1800];

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function request(table: string, init: RequestInit = {}, query = new URLSearchParams(), retryable = false) {
  const token = await accessToken();
  if (!token) throw new Error("Sesión de Supabase ausente.");
  const method = String(init.method ?? "GET").toUpperCase();
  const canRetry = retryable || method === "GET";

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        ...init,
        headers: {
          ...authHeaders(token),
          ...(init.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch (cause) {
      if (!canRetry || attempt >= RETRY_DELAYS_MS.length) throw cause;
      await wait(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!response.ok) {
      const detail = await response.text();
      if (canRetry && TRANSIENT_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
        console.warn("[supabase] transient request failure", { table, status: response.status, attempt: attempt + 1 });
        await wait(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(`Supabase ${response.status} (${table}): ${detail}`);
    }
    if (response.status === 204) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  }
}
function filters(query: URLSearchParams, values: Record<string, Scalar> = {}) {
  for (const [key, value] of Object.entries(values)) query.set(toSnake(key), encodeFilter(value));
}

export async function selectRows<T extends Row = Row>(table: string, options: {
  where?: Record<string, Scalar>;
  gte?: Record<string, Scalar>;
  lte?: Record<string, Scalar>;
  ilike?: Record<string, string>;
  /** Filtro por conjunto: `{ userEmail: [...] }` se traduce a `in.(a,b,c)`. */
  inList?: Record<string, Scalar[]>;
  order?: Array<[string, "asc" | "desc"]>;
  limit?: number;
  /** Columnas a traer (camelCase). Por defecto todas: para historiales conviene pedir solo las necesarias. */
  columns?: string[];
} = {}): Promise<T[]> {
  const query = new URLSearchParams({ select: options.columns?.length ? options.columns.map(toSnake).join(",") : "*" });
  filters(query, options.where);
  for (const [key, values] of Object.entries(options.inList ?? {})) {
    // Sin valores PostgREST rechaza `in.()`, y la respuesta correcta es vacía.
    if (!values.length) return [];
    query.set(toSnake(key), `in.(${values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")})`);
  }
  for (const [key, value] of Object.entries(options.gte ?? {})) query.set(toSnake(key), `gte.${String(value)}`);
  for (const [key, value] of Object.entries(options.lte ?? {})) query.set(toSnake(key), `lte.${String(value)}`);
  for (const [key, value] of Object.entries(options.ilike ?? {})) query.set(toSnake(key), `ilike.${value}`);
  if (options.order?.length) query.set("order", options.order.map(([key, direction]) => `${toSnake(key)}.${direction}`).join(","));
  if (options.limit) query.set("limit", String(options.limit));
  const rows = await request(table, {}, query) as Row[];
  return rows.map((row) => mapKeys(row, toCamel) as T);
}

export async function insertRows<T extends Row = Row>(table: string, values: Row | Row[], options: {
  upsert?: boolean;
  onConflict?: string[];
  returnRows?: boolean;
  ignoreDuplicates?: boolean;
} = {}): Promise<T[]> {
  const query = new URLSearchParams();
  if (options.onConflict?.length) query.set("on_conflict", options.onConflict.map(toSnake).join(","));
  const prefer = [
    options.upsert ? `resolution=${options.ignoreDuplicates ? "ignore" : "merge"}-duplicates` : "",
    options.returnRows ? "return=representation" : "return=minimal",
  ].filter(Boolean).join(",");
  const body = (Array.isArray(values) ? values : [values]).map((row) => mapKeys(row, toSnake));
  const rows = await request(table, {
    method: "POST",
    headers: { Prefer: prefer },
    body: JSON.stringify(body),
  }, query, Boolean(options.upsert && options.ignoreDuplicates)) as Row[];
  return rows.map((row) => mapKeys(row, toCamel) as T);
}

export async function updateRows<T extends Row = Row>(table: string, where: Record<string, Scalar>, values: Row, returnRows = false): Promise<T[]> {
  const query = new URLSearchParams();
  filters(query, where);
  const rows = await request(table, {
    method: "PATCH",
    headers: { Prefer: returnRows ? "return=representation" : "return=minimal" },
    body: JSON.stringify(mapKeys(values, toSnake)),
  }, query) as Row[];
  return rows.map((row) => mapKeys(row, toCamel) as T);
}

export async function deleteRows(table: string, where: Record<string, Scalar>) {
  const query = new URLSearchParams();
  filters(query, where);
  await request(table, { method: "DELETE", headers: { Prefer: "return=minimal" } }, query);
}

/**
 * Llama una función `security definer` de Postgres. Se usa para las
 * operaciones que ninguna política puede autorizar desde el cliente: aceptar
 * una invitación (escribe la fila del otro lado) o entrar a un grupo (lee una
 * fila que todavía no es tuya).
 */
export async function callRpc<T = unknown>(fn: string, args: Row = {}): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Sesión de Supabase ausente.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    // Postgres devuelve el `raise exception` en `message`: ese texto ya está
    // escrito para que lo lea una persona, así que se propaga tal cual.
    let message = `Supabase ${response.status}`;
    try { message = (JSON.parse(text) as { message?: string }).message || message; } catch { /* respuesta no JSON */ }
    throw new Error(message);
  }
  const parsed = text ? JSON.parse(text) : null;
  return (Array.isArray(parsed) ? parsed.map((row) => mapKeys(row as Row, toCamel)) : parsed) as T;
}

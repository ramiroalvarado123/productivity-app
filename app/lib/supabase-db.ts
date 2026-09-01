import { cookies } from "next/headers";
import { ACCESS_COOKIE, SUPABASE_URL, authHeaders } from "./supabase-auth";

type Scalar = string | number | boolean | null;
type Row = Record<string, unknown>;

const toSnake = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

function mapKeys(row: Row, transform: (key: string) => string): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [transform(key), value]));
}

function encodeFilter(value: Scalar) {
  if (value === null) return "is.null";
  return `eq.${String(value)}`;
}

async function request(table: string, init: RequestInit = {}, query = new URLSearchParams()) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) throw new Error("Sesión de Supabase ausente.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  if (response.status === 204) return [];
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function filters(query: URLSearchParams, values: Record<string, Scalar> = {}) {
  for (const [key, value] of Object.entries(values)) query.set(toSnake(key), encodeFilter(value));
}

export async function selectRows<T extends Row = Row>(table: string, options: {
  where?: Record<string, Scalar>;
  gte?: Record<string, Scalar>;
  lte?: Record<string, Scalar>;
  ilike?: Record<string, string>;
  order?: Array<[string, "asc" | "desc"]>;
  limit?: number;
} = {}): Promise<T[]> {
  const query = new URLSearchParams({ select: "*" });
  filters(query, options.where);
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
  }, query) as Row[];
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

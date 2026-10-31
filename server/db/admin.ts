import { SUPABASE_URL } from "@/shared/config/supabase";

/**
 * Acceso a la base con la clave de servicio (salta RLS). SOLO para tareas del servidor sin sesión de
 * usuario, como los webhooks de pagos. Nunca para atender un pedido normal de la app.
 */
function adminHeaders(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json", ...extra };
  // Las claves nuevas sb_secret_* viajan solo como apikey; la legacy (JWT) necesita también Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function adminRequest(table: string, query: URLSearchParams, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    ...init,
    headers: adminHeaders(init.headers as Record<string, string> | undefined),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) as unknown : null;
}

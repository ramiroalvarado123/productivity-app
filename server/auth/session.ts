import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { ACCESS_COOKIE, SUPABASE_URL, authHeaders, displayNameFor, type SupabaseUser } from "@/shared/config/supabase";

export type SessionUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  onboardingCompleted: boolean;
  mainGoals: string[];
  usagePreferences: string[];
};

function metadataStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * El token de la sesión: la cookie en la web, o `Authorization: Bearer` cuando
 * llama la app nativa (ahí las cookies hacia otro dominio no son confiables).
 */
export async function accessToken() {
  const bearer = (await headers()).get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? "";
}

// Las claves públicas de Supabase se bajan una vez y quedan en memoria: verificar
// el token pasa a ser un cálculo local en vez de un viaje a /auth/v1/user.
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

function userFromClaims(email: string, metadata: Record<string, unknown>): SessionUser {
  const displayName = displayNameFor({ id: "", email, user_metadata: metadata });
  return {
    displayName,
    email,
    fullName: displayName,
    onboardingCompleted: metadata.onboarding_completed === true,
    mainGoals: metadataStringArray(metadata.main_goals),
    usagePreferences: metadataStringArray(metadata.usage_preferences),
  };
}

async function verifiedClaims(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `${SUPABASE_URL}/auth/v1`, audience: "authenticated" });
    return payload;
  } catch (cause) {
    // Firma inválida o token vencido: no hay sesión. Cualquier otro problema
    // (no se pudo bajar la clave) cae al camino de red de siempre.
    const code = (cause as { code?: string })?.code ?? "";
    if (code.startsWith("ERR_JWT") || code.startsWith("ERR_JWS")) return null;
    throw cause;
  }
}

async function userFromNetwork(token: string): Promise<SessionUser | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(token), cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as SupabaseUser;
  return user.email ? userFromClaims(user.email, user.user_metadata ?? {}) : null;
}

/**
 * Quién está usando la app. Se resuelve una sola vez por pedido (`cache`).
 * La metadata del token puede tener hasta una hora de atraso; la fuente de
 * verdad para nombre y onboarding es la tabla `profiles`.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = await accessToken();
  if (!token) return null;
  try {
    const claims = await verifiedClaims(token);
    if (!claims) return null;
    const email = typeof claims.email === "string" ? claims.email : "";
    if (!email) return null;
    const metadata = typeof claims.user_metadata === "object" && claims.user_metadata !== null ? claims.user_metadata as Record<string, unknown> : {};
    return userFromClaims(email, metadata);
  } catch (cause) {
    console.warn("session: verificación local no disponible, uso /auth/v1/user", cause);
    return userFromNetwork(token);
  }
});

export async function updateAuthMetadata(values: {
  displayName: string;
  onboardingCompleted: boolean;
  mainGoals: string[];
  usagePreferences: string[];
}): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      data: {
        display_name: values.displayName,
        full_name: values.displayName,
        onboarding_completed: values.onboardingCompleted,
        main_goals: values.mainGoals,
        usage_preferences: values.usagePreferences,
      },
    }),
    cache: "no-store",
  });
  return response.ok;
}

export async function requireSessionUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  const next = safeRelativeReturnPath(returnTo);
  return `/?next=${encodeURIComponent(next)}`;
}

export function signOutPath(returnTo = "/"): string {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, type SupabaseSession } from "./supabase-auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookies(session: SupabaseSession) {
  const store = await cookies();
  const maxAge = Math.max(60, Number(session.expires_in ?? 3600));
  store.set(ACCESS_COOKIE, session.access_token, { ...COOKIE_OPTIONS, maxAge });
  store.set(REFRESH_COOKIE, session.refresh_token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 365 });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * Cuando alguien abre un link de invitación sin estar logueado, el código
 * espera acá hasta que termine de entrar. Sobrevive al login porque el flujo
 * de Supabase sólo toca las cookies de sesión.
 */
export const INVITE_COOKIE = "avora_pending_invite";

export async function setPendingInvite(code: string) {
  (await cookies()).set(INVITE_COOKIE, code, { ...COOKIE_OPTIONS, maxAge: 60 * 30 });
}

export async function readPendingInvite() {
  return (await cookies()).get(INVITE_COOKIE)?.value ?? "";
}

export async function clearPendingInvite() {
  (await cookies()).set(INVITE_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

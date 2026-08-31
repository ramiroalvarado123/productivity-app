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
  store.set(REFRESH_COOKIE, session.refresh_token, { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

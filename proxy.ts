import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SUPABASE_URL, authHeaders, type SupabaseSession } from "./app/lib/supabase-auth";

function expiresSoon(token?: string) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now() + 60_000;
  } catch { return true; }
}

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || !expiresSoon(access)) return NextResponse.next();

  const refreshed = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  });
  if (!refreshed.ok) {
    const response = NextResponse.next();
    response.cookies.delete(ACCESS_COOKIE); response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const session = await refreshed.json() as SupabaseSession;
  const headers = new Headers(request.headers);
  const cookie = request.cookies.getAll().filter(({ name }) => name !== ACCESS_COOKIE && name !== REFRESH_COOKIE)
    .map(({ name, value }) => `${name}=${value}`);
  cookie.push(`${ACCESS_COOKIE}=${session.access_token}`, `${REFRESH_COOKIE}=${session.refresh_token}`);
  headers.set("cookie", cookie.join("; "));
  const response = NextResponse.next({ request: { headers } });
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  response.cookies.set(ACCESS_COOKIE, session.access_token, { ...options, maxAge: Math.max(60, Number(session.expires_in ?? 3600)) });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...options, maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

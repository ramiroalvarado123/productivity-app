import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SUPABASE_URL, authHeaders, type SupabaseSession } from "./app/lib/supabase-auth";

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.next();

  let shouldRefresh = !access;
  if (access) {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(access), cache: "no-store" });
    shouldRefresh = !userResponse.ok;
  }
  if (!shouldRefresh) return NextResponse.next();

  const refreshResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  });
  if (!refreshResponse.ok) {
    const response = NextResponse.next();
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const session = await refreshResponse.json() as SupabaseSession;
  const response = NextResponse.next();
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: session.expires_in ?? 3600 });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

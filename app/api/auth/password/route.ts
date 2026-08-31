import { NextResponse } from "next/server";
import { setSessionCookies } from "../../../lib/auth-cookies";
import { SUPABASE_URL, authHeaders, type SupabaseSession } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { action?: string; email?: string; password?: string; name?: string } | null;
  const action = body?.action;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || password.length < 8 || (action !== "login" && action !== "signup")) {
    return NextResponse.json({ error: "Revisá el email y usá una contraseña de al menos 8 caracteres." }, { status: 400 });
  }

  const endpoint = action === "login"
    ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
    : `${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(new URL("/auth/callback", request.url).toString())}`;

  const payload: Record<string, unknown> = { email, password };
  if (action === "signup" && body?.name?.trim()) payload.data = { full_name: body.name.trim() };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Partial<SupabaseSession> & { msg?: string; error_description?: string; code?: string };

  if (!response.ok) {
    return NextResponse.json({ error: data.error_description ?? data.msg ?? "No pudimos completar el acceso." }, { status: response.status });
  }

  if (data.access_token && data.refresh_token) await setSessionCookies(data as SupabaseSession);
  return NextResponse.json({ ok: true, needsConfirmation: action === "signup" && !data.access_token });
}

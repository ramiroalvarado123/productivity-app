import { NextResponse } from "next/server";
import { setSessionCookies } from "@/server/auth/cookies";
import { SUPABASE_URL, authHeaders, type SupabaseSession } from "@/shared/config/supabase";

export async function POST(request: Request) {
  const data = await request.json().catch(() => null) as Partial<SupabaseSession> | null;
  if (!data?.access_token || !data?.refresh_token) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
  }
  const verification = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(data.access_token),
    cache: "no-store",
  });
  if (!verification.ok) return NextResponse.json({ error: "La sesión no es válida o venció." }, { status: 401 });
  await setSessionCookies(data as SupabaseSession);
  return NextResponse.json({ ok: true });
}

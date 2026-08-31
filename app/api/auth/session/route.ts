import { NextResponse } from "next/server";
import { setSessionCookies } from "../../../lib/auth-cookies";
import type { SupabaseSession } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  const data = await request.json().catch(() => null) as Partial<SupabaseSession> | null;
  if (!data?.access_token || !data?.refresh_token) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 400 });
  }
  await setSessionCookies(data as SupabaseSession);
  return NextResponse.json({ ok: true });
}

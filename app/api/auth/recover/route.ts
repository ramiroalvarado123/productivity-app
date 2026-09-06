import { NextResponse } from "next/server";
import { SUPABASE_URL, authHeaders } from "../../../lib/supabase-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Ingresá tu email." }, { status: 400 });
  const redirectTo = new URL("/auth/reset-password", request.url).toString();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ email }), cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { msg?: string; error_description?: string };
  if (!response.ok) return NextResponse.json({ error: data.error_description ?? data.msg ?? "No pudimos enviar el correo." }, { status: response.status });
  return NextResponse.json({ ok: true });
}

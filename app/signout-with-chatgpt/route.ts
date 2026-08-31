import { NextResponse } from "next/server";
import { clearSessionCookies } from "../lib/auth-cookies";

export async function GET(request: Request) {
  await clearSessionCookies();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") ?? "/";
  const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return NextResponse.redirect(new URL(safe, request.url));
}

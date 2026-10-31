import { timingSafeEqual } from "node:crypto";
import { decideFromWebhook } from "@/server/billing/revenuecat";
import { applyProState } from "@/server/billing/apply";

function authorized(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Webhook de RevenueCat: avisa cada compra, renovación y vencimiento de una suscripción. Se configura en
 * RevenueCat → Integrations → Webhooks con la URL de esta ruta y el mismo valor de REVENUECAT_WEBHOOK_SECRET
 * en el campo "Authorization header" (con el prefijo "Bearer ").
 */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const decision = decideFromWebhook(body);
  if (decision.action === "ignore") return Response.json({ ok: true, ignored: decision.reason });
  try {
    await applyProState(decision.email, decision.state, decision.event, { revoke: decision.action === "revoke" });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("revenuecat webhook", error);
    // 500 hace que RevenueCat reintente el aviso más tarde.
    return Response.json({ error: "No pudimos aplicar el evento." }, { status: 500 });
  }
}

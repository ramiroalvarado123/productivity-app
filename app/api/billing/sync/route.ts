import { getSessionUser } from "@/server/auth/session";
import { fail, ok } from "@/server/http";
import { proFromSubscriber } from "@/server/billing/revenuecat";
import { applyProState } from "@/server/billing/apply";

/**
 * Después de comprar o restaurar en la app: el servidor le pregunta a RevenueCat (no confía en lo que diga
 * el cliente) y, si hay Pro vigente, lo activa en el momento sin esperar al webhook. Nunca quita Pro.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) return fail("Las suscripciones todavía no están habilitadas.", 503);

  const email = user.email.toLowerCase();
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return fail("No pudimos verificar tu suscripción. Probá de nuevo en un momento.", 502);

  const state = proFromSubscriber(await response.json().catch(() => null));
  if (state.active) {
    try {
      await applyProState(email, state, "SYNC", { revoke: false });
    } catch (error) {
      console.error("billing sync", error);
      return fail("No pudimos activar tu suscripción. Escribinos y lo resolvemos.", 500);
    }
  }
  return ok({ isPro: state.active });
}

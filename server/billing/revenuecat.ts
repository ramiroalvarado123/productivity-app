/**
 * Lógica pura de las suscripciones Pro con RevenueCat: qué significa cada respuesta/evento.
 * Sin red ni base de datos, para poder probarla (tests/billing.test.ts).
 */

/** Nombre del "entitlement" que se crea en RevenueCat y al que se asocian los productos. */
export const PRO_ENTITLEMENT = "pro";

export type ProState = { active: boolean; expiresAt: string | null; productId: string; store: string };

type SubscriberEntitlement = { expires_date?: string | null; product_identifier?: string };
type SubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, SubscriberEntitlement>;
    subscriptions?: Record<string, { store?: string }>;
  };
};

/** Estado de Pro según `GET /v1/subscribers/{id}` de RevenueCat (la verdad que consultamos desde el servidor). */
export function proFromSubscriber(json: unknown, now = new Date()): ProState {
  const subscriber = (json as SubscriberResponse | null)?.subscriber;
  const entitlement = subscriber?.entitlements?.[PRO_ENTITLEMENT];
  if (!entitlement) return { active: false, expiresAt: null, productId: "", store: "" };
  const expiresAt = entitlement.expires_date ?? null; // null = vitalicio
  const productId = entitlement.product_identifier ?? "";
  return {
    active: expiresAt === null || new Date(expiresAt).getTime() > now.getTime(),
    expiresAt,
    productId,
    store: subscriber?.subscriptions?.[productId]?.store ?? "",
  };
}

export type WebhookDecision =
  | { action: "grant" | "revoke"; email: string; state: ProState; event: string }
  | { action: "ignore"; reason: string };

const GRANT_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE"]);

/** El usuario de RevenueCat es el email de la cuenta; los ids anónimos ($RCAnonymousID:…) se descartan. */
export function emailFromEvent(event: Record<string, unknown>) {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(Array.isArray(event.aliases) ? event.aliases : [])];
  const found = candidates.find((value): value is string => typeof value === "string" && /^[^\s@$]+@[^\s@]+$/.test(value));
  return found ? found.toLowerCase() : "";
}

/** Traduce el evento del webhook de RevenueCat a lo que hay que hacer con la cuenta. */
export function decideFromWebhook(body: unknown, now = new Date()): WebhookDecision {
  const event = (body as { event?: Record<string, unknown> } | null)?.event;
  if (!event || typeof event.type !== "string") return { action: "ignore", reason: "evento inválido" };
  const type = event.type;
  const email = emailFromEvent(event);
  if (!email) return { action: "ignore", reason: "usuario sin email" };

  const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  if (entitlementIds.length && !entitlementIds.includes(PRO_ENTITLEMENT)) return { action: "ignore", reason: "otro entitlement" };

  const expirationMs = typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : null;
  const state: ProState = {
    active: false,
    expiresAt: expirationMs === null ? null : new Date(expirationMs).toISOString(),
    productId: typeof event.product_id === "string" ? event.product_id : "",
    store: typeof event.store === "string" ? event.store : "",
  };

  if (GRANT_EVENTS.has(type)) {
    // Un reenvío viejo de un período ya vencido no debe reactivar Pro.
    if (expirationMs !== null && expirationMs <= now.getTime()) return { action: "ignore", reason: "período ya vencido" };
    return { action: "grant", email, state: { ...state, active: true }, event: type };
  }
  if (type === "EXPIRATION") {
    // Si llegó desordenado y hoy hay un período vigente más nuevo, no se revoca.
    if (expirationMs !== null && expirationMs > now.getTime()) return { action: "ignore", reason: "expiración futura" };
    return { action: "revoke", email, state, event: type };
  }
  // CANCELLATION y BILLING_ISSUE no quitan Pro: sigue activo hasta que llegue EXPIRATION.
  return { action: "ignore", reason: `evento ${type} sin cambios` };
}

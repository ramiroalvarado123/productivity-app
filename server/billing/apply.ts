import { adminRequest } from "@/server/db/admin";
import type { ProState } from "@/server/billing/revenuecat";

function argentinaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

/**
 * Refleja la suscripción en la cuenta: `profiles.pro_since` (lo que lee toda la app para abrir los
 * candados) y, de forma opcional, la tabla `entitlements` como registro. `revoke: false` solo concede
 * (lo usa la sincronización pedida por el cliente: nunca le quita Pro a nadie).
 */
export async function applyProState(email: string, state: ProState, event: string, options: { revoke: boolean }) {
  try {
    await adminRequest("entitlements", new URLSearchParams({ on_conflict: "user_email" }), {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_email: email, active: state.active, product_id: state.productId, store: state.store,
        expires_at: state.expiresAt, last_event: event, updated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Tabla opcional (supabase/billing.sql): sin ella igual se actualiza el perfil.
    console.warn("billing entitlements log unavailable", error);
  }

  if (state.active) {
    // Solo si todavía no era Pro: así se conserva la fecha original de alta.
    await adminRequest("profiles", new URLSearchParams({ email: `eq.${email}`, pro_since: "eq." }), {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ pro_since: argentinaToday(), updated_at: new Date().toISOString() }),
    });
  } else if (options.revoke) {
    await adminRequest("profiles", new URLSearchParams({ email: `eq.${email}` }), {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ pro_since: "", updated_at: new Date().toISOString() }),
    });
  }
}

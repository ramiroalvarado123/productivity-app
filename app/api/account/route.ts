import { accessToken, getSessionUser } from "@/server/auth/session";
import { clearSessionCookies } from "@/server/auth/cookies";
import { callRpc } from "@/server/db/postgrest";
import { fail, isMissingRpc, ok } from "@/server/http";
import { SUPABASE_URL, authHeaders } from "@/shared/config/supabase";

/** Borra las fotos de perfil (Storage no se limpia solo al borrar el usuario). Si falla, no frena el borrado. */
async function removeAvatars(email: string, token: string) {
  try {
    const listing = await fetch(`${SUPABASE_URL}/storage/v1/object/list/avatars`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify({ prefix: email, limit: 100 }), cache: "no-store",
    });
    if (!listing.ok) return;
    const files = await listing.json() as Array<{ name?: string }>;
    const prefixes = files.flatMap((file) => file.name ? [`${email}/${file.name}`] : []);
    if (!prefixes.length) return;
    await fetch(`${SUPABASE_URL}/storage/v1/object/avatars`, {
      method: "DELETE", headers: authHeaders(token), body: JSON.stringify({ prefixes }), cache: "no-store",
    });
  } catch (cause) {
    console.error("account avatars", cause);
  }
}

/** Borra al usuario de RevenueCat (sus datos de compras). No cancela la suscripción en la tienda: eso lo hace la persona. */
async function removeBillingProfile(email: string) {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) return;
  try {
    await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(email.toLowerCase())}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
    });
  } catch (cause) {
    console.error("account billing profile", cause);
  }
}

/**
 * Elimina la cuenta de quien tiene la sesión abierta y todos sus datos (requisito de App Store
 * y Google Play). El trabajo pesado lo hace la función `avora_delete_my_account` (supabase/delete-account.sql).
 */
export async function DELETE() {
  const user = await getSessionUser();
  const token = await accessToken();
  if (!user || !token) return fail("Necesitás iniciar sesión.", 401);

  await removeAvatars(user.email, token);
  try {
    await callRpc("avora_delete_my_account");
  } catch (cause) {
    if (isMissingRpc(cause)) return fail("La eliminación de cuentas todavía no está habilitada. Escribinos y la borramos nosotros.", 503);
    console.error("delete account", cause);
    return fail("No pudimos eliminar tu cuenta. Intentá de nuevo en unos minutos.", 500);
  }
  await removeBillingProfile(user.email);
  await clearSessionCookies();
  return ok();
}

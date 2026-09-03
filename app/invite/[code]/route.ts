import { redirect } from "next/navigation";
import { getChatGPTUser } from "../../chatgpt-auth";
import { callRpc } from "../../lib/supabase-db";
import { setPendingInvite } from "../../lib/auth-cookies";

/**
 * El link que se comparte por WhatsApp o mail.
 *
 * Es un route handler y no una página porque necesita escribir una cookie y
 * redirigir, dos cosas que un Server Component no puede hacer mientras dibuja.
 * Si quien abre el link todavía no tiene sesión, el código queda guardado y se
 * canjea solo apenas entra.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const clean = String(code ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
  if (!clean) redirect("/");

  const user = await getChatGPTUser();
  if (!user) {
    await setPendingInvite(clean);
    redirect("/?invite=pending");
  }

  try {
    await callRpc("avora_accept_friend_invite", { p_code: clean });
  } catch (cause) {
    console.error("invite accept", cause);
    // Puede ser una invitación vencida, ya usada o dirigida a otra cuenta. El
    // detalle exacto no aporta acá: la sección Amigos lo muestra igual.
    redirect("/?invite=error");
  }
  redirect("/?invite=ok");
}

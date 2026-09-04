import { getChatGPTUser } from "../../chatgpt-auth";
import { insertRows } from "../../lib/supabase-db";

const TYPES = new Set(["positive", "idea", "bug", "dislike"]);
const MAX_MESSAGE = 2000;

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return fail("Datos inválidos.");

    const type = String(body.type ?? "");
    const message = String(body.message ?? "").trim();
    const section = String(body.section ?? "Otra").trim().slice(0, 80) || "Otra";
    const pagePath = String(body.pagePath ?? "").trim().slice(0, 300);
    const userAgent = String(body.userAgent ?? "").trim().slice(0, 500);
    const appVersion = String(body.appVersion ?? "beta").trim().slice(0, 40) || "beta";

    if (!TYPES.has(type)) return fail("Elegí un tipo de comentario válido.");
    if (message.length < 3) return fail("Contanos un poco más para poder entender el comentario.");
    if (message.length > MAX_MESSAGE) return fail(`El comentario puede tener hasta ${MAX_MESSAGE} caracteres.`);

    await insertRows("user_feedback", {
      userEmail: user.email,
      type,
      message,
      section,
      status: "pending",
      pagePath,
      userAgent,
      appVersion,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("feedback_submit_failed", error);
    return fail("No pudimos guardar el comentario. Probá nuevamente.", 500);
  }
}

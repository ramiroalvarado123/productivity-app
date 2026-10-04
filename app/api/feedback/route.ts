import { getSessionUser } from "@/server/auth/session";
import { insertRows } from "@/server/db/postgrest";

const TYPES = new Set(["positive", "idea", "bug", "dislike"]);
const MAX_MESSAGE = 2000;
const TYPE_LABELS: Record<string, string> = {
  positive: "Me gustó algo",
  idea: "Tengo una sugerencia",
  bug: "Encontré un problema",
  dislike: "Hay algo que no me gusta",
};

const feedbackWebhookUrl = process.env.FEEDBACK_WEBHOOK_URL?.trim() || "https://script.google.com/macros/s/AKfycbyIg-cLJRFPV2Vgvt6CfD5j8ObnolwU7SeCb8BvbzgQy5hO7HhPcW1rtldQFDyDVELx8w/exec";

async function notifyFeedbackByEmail(values: {
  userEmail: string;
  userName: string;
  type: string;
  message: string;
  section: string;
  pagePath: string;
  userAgent: string;
  appVersion: string;
}) {
  const typeLabel = TYPE_LABELS[values.type] ?? values.type;
  const safeSection = values.section.replace(/[\r\n]+/g, " ");
  try {
    const response = await fetch(feedbackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.userName || values.userEmail, email: values.userEmail, type: typeLabel, message: values.message, section: safeSection, pagePath: values.pagePath || "/", appVersion: values.appVersion, userAgent: values.userAgent || "No disponible" }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("feedback_email_failed", response.status);
      return "failed" as const;
    }
    return "sent" as const;
  } catch (error) {
    console.error("feedback_email_failed", error);
    return "failed" as const;
  }
}

function fail(message: string, status = 400) { return Response.json({ error: message }, { status }); }

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
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
    await insertRows("user_feedback", { userEmail: user.email, type, message, section, status: "pending", pagePath, userAgent, appVersion });
    const emailDelivery = await notifyFeedbackByEmail({ userEmail: user.email, userName: user.fullName || user.displayName, type, message, section, pagePath, userAgent, appVersion });
    return Response.json({ ok: true, emailDelivery });
  } catch (error) {
    console.error("feedback_submit_failed", error);
    return fail("No pudimos guardar el comentario. Probá nuevamente.", 500);
  }
}

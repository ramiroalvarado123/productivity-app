import { getSessionUser } from "@/server/auth/session";
import { callRpc, insertRows, selectRows } from "@/server/db/postgrest";
import { fail, ok } from "@/server/http";
import { CHAT_PAGE_SIZE, cleanChatBody, type ChatMessage } from "@/features/friends/logic/chat";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MISSING_SQL = "Para chatear falta correr supabase/friend-messages.sql en Supabase.";

type Row = Record<string, unknown>;

function toMessage(row: Row): ChatMessage {
  return {
    id: Number(row.id),
    fromEmail: String(row.fromEmail ?? "").toLowerCase(),
    toEmail: String(row.toEmail ?? "").toLowerCase(),
    body: String(row.body ?? ""),
    createdAt: String(row.createdAt ?? ""),
    readAt: row.readAt ? String(row.readAt) : null,
  };
}

/** La tabla todavía no existe (SQL sin correr): la app sigue andando, solo avisa. */
function isMissingTable(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return /friend_messages/.test(message) && /PGRST205|does not exist|Could not find the table/i.test(message);
}

/**
 * GET ?with=<email>[&after=<id>] → la conversación con ese amigo (las últimas, o las nuevas
 * desde `after`). Sin `with` → cuántos mensajes sin leer tengo de cada amigo.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);
  const me = user.email.toLowerCase();
  const params = new URL(request.url).searchParams;
  const other = (params.get("with") ?? "").trim().toLowerCase();

  try {
    if (!other) {
      const unread = await selectRows<Row>("friend_messages", { where: { toEmail: me, readAt: null }, columns: ["fromEmail"], limit: 500 });
      const counts: Record<string, number> = {};
      for (const row of unread) {
        const from = String(row.fromEmail).toLowerCase();
        counts[from] = (counts[from] ?? 0) + 1;
      }
      return Response.json({ unread: counts });
    }
    if (!EMAIL.test(other)) return fail("Amigo inválido.");
    const after = Math.max(0, Number(params.get("after")) || 0);
    const range = after ? { gte: { id: after + 1 } } : {};
    const [sent, received] = await Promise.all([
      selectRows<Row>("friend_messages", { where: { fromEmail: me, toEmail: other }, ...range, order: [["id", "desc"]], limit: CHAT_PAGE_SIZE }),
      selectRows<Row>("friend_messages", { where: { fromEmail: other, toEmail: me }, ...range, order: [["id", "desc"]], limit: CHAT_PAGE_SIZE }),
    ]);
    const messages = [...sent, ...received].map(toMessage).sort((left, right) => left.id - right.id).slice(-CHAT_PAGE_SIZE);
    return Response.json({ messages });
  } catch (cause) {
    if (isMissingTable(cause)) return Response.json({ messages: [], unread: {}, needsSql: true });
    console.error("friend messages GET", cause);
    return fail("No se pudieron cargar los mensajes.", 500);
  }
}

/** POST { to, body } envía un mensaje · POST { markRead: <email> } marca como leídos los de ese amigo. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);
  const me = user.email.toLowerCase();
  const payload = await request.json().catch(() => null) as Row | null;
  if (!payload) return fail("Pedido inválido.");

  try {
    if (payload.markRead) {
      const other = String(payload.markRead).trim().toLowerCase();
      if (!EMAIL.test(other)) return fail("Amigo inválido.");
      try {
        await callRpc("avora_mark_chat_read", { p_email: other });
      } catch (cause) {
        // Sin la función (SQL sin correr) no hay nada que marcar: no es un error para quien lee.
        if (!/Could not find the function|PGRST202|does not exist/i.test(cause instanceof Error ? cause.message : "")) throw cause;
      }
      return ok();
    }

    const to = String(payload.to ?? "").trim().toLowerCase();
    const body = cleanChatBody(payload.body);
    if (!EMAIL.test(to) || to === me) return fail("Elegí a quién escribirle.");
    if (!body) return fail("Escribí un mensaje.");
    const edge = await selectRows<Row>("friendships", { where: { userEmail: me, friendEmail: to }, limit: 1 });
    if (!edge.length) return fail("Solo podés escribirle a alguien de tu círculo.", 403);

    const [row] = await insertRows<Row>("friend_messages", { fromEmail: me, toEmail: to, body }, { returnRows: true });
    return Response.json({ ok: true, message: row ? toMessage(row) : null });
  } catch (cause) {
    if (isMissingTable(cause)) return fail(MISSING_SQL, 409);
    console.error("friend messages POST", cause);
    return fail("No se pudo enviar el mensaje.", 500);
  }
}

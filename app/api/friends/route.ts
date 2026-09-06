import { getChatGPTUser } from "../../chatgpt-auth";
import { callRpc, deleteRows, insertRows, selectRows, updateRows } from "../../lib/supabase-db";
import { clearPendingInvite } from "../../lib/auth-cookies";
import {
  GOAL_METRICS, GOAL_SOURCES, GROUP_ACCENTS, shareHeadline,
  type Friend, type FriendInvite, type FriendShare, type GoalMetric, type GoalSource, type Group,
  type GroupAccent, type GroupGoal, type GroupInvite, type GroupMember, type SocialData,
} from "../../lib/social";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[a-z0-9_]{3,20}$/;
const now = () => new Date().toISOString();
const ok = (extra = {}) => Response.json({ ok: true, ...extra });
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });
const clamp = (value: unknown, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

type Row = Record<string, unknown>;

/**
 * Un código de invitación es una URL pública: quien lo tenga entra. Se arma con
 * el generador criptográfico del runtime, no con Math.random.
 */
function inviteCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 18);
}

/**
 * De dónde cuelga el link que se comparte. En producción manda la variable de
 * entorno; en desarrollo alcanza con el origen del propio pedido.
 */
function siteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

/**
 * Los campos de un objetivo, validados igual al crearlo que al editarlo. Una
 * fuente automática fija su propia métrica: contar "páginas" en un objetivo que
 * se alimenta de los entrenamientos no querría decir nada.
 */
function goalFields(payload: Row): Row | string {
  const title = text(payload.title, 120);
  if (title.length < 2) return "Escribí un objetivo.";
  const source = (GOAL_SOURCES.some((item) => item.value === payload.source) ? String(payload.source) : "manual") as GoalSource;
  const metric = source === "manual"
    ? (GOAL_METRICS.some((item) => item.value === payload.metric) ? String(payload.metric) : "count")
    : GOAL_SOURCES.find((item) => item.value === source)!.metric;
  const period = ["weekly", "monthly", "custom"].includes(String(payload.period)) ? String(payload.period) : "weekly";
  const dueDate = period === "custom" ? String(payload.dueDate ?? "") : "";
  if (dueDate && !DATE.test(dueDate)) return "La fecha límite no es válida.";
  return { title, metric, source, period, dueDate, targetValue: clamp(payload.targetValue, 1, 100000) };
}

/**
 * Sumar a alguien al grupo deja una invitación, nunca una membresía: nadie
 * entra a un grupo sin haber dicho que sí. Devuelve si quedó algo para
 * responder, así el que invita a varios de una no se frena en el primero que
 * ya estaba adentro.
 */
async function inviteToGroup(from: string, fromName: string, groupId: number, groupName: string, target: string) {
  if (!EMAIL.test(target) || target === from) return false;
  const edge = (await selectRows<Row>("friendships", { where: { userEmail: from, friendEmail: target }, limit: 1 }))[0];
  if (!edge) return false;
  const member = await selectRows<Row>("group_members", { where: { groupId, userEmail: target }, limit: 1 });
  if (member.length) return false;
  const open = await selectRows<Row>("group_invites", { where: { groupId, toEmail: target, status: "pending" }, limit: 1 });
  if (open.length) return false;
  await insertRows("group_invites", { groupId, groupName, fromEmail: from, fromName, toEmail: target, status: "pending" });
  return true;
}

async function session() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return { user, email: user.email.toLowerCase() };
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

async function readSocial(email: string): Promise<SocialData> {
  const [edges, invites, memberships, groupInviteRows] = await Promise.all([
    selectRows<Row>("friendships", { where: { userEmail: email }, order: [["createdAt", "asc"]] }),
    selectRows<Row>("friend_invites", { where: { status: "pending" }, order: [["createdAt", "desc"]], limit: 60 }),
    selectRows<Row>("group_members", { where: { userEmail: email } }),
    // La política deja ver las mías y las de mis grupos: las primeras van a la
    // bandeja, las segundas al panel de integrantes del grupo.
    selectRows<Row>("group_invites", { where: { status: "pending" }, order: [["createdAt", "desc"]], limit: 120 }),
  ]);

  const friendEmails = edges.map((row) => String(row.friendEmail));
  const groupIds = memberships.map((row) => Number(row.groupId));

  const [shareRows, groupRows, memberRows, goalRows] = await Promise.all([
    selectRows<Row>("friend_shares", { inList: { userEmail: friendEmails } }),
    selectRows<Row>("avora_groups", { inList: { id: groupIds }, order: [["createdAt", "asc"]] }),
    selectRows<Row>("group_members", { inList: { groupId: groupIds }, order: [["joinedAt", "asc"]] }),
    selectRows<Row>("group_goals", { inList: { groupId: groupIds }, order: [["createdAt", "desc"]] }),
  ]);
  const goalIds = goalRows.map((row) => Number(row.id));
  const progressRows = await selectRows<Row>("group_goal_progress", { inList: { goalId: goalIds } });

  const shares = new Map<string, FriendShare>(shareRows.map((row) => [String(row.userEmail), {
    displayName: String(row.displayName ?? ""),
    shareDate: String(row.shareDate ?? ""),
    score: Number(row.score ?? 0),
    streak: Number(row.streak ?? 0),
    bestStreak: Number(row.bestStreak ?? 0),
    headline: String(row.headline ?? ""),
  }]));

  const friends: Friend[] = edges.map((row) => {
    const friendEmail = String(row.friendEmail);
    const share = shares.get(friendEmail) ?? null;
    return {
      email: friendEmail,
      // El nombre de la foto del día es el más fresco: si la persona lo cambió
      // después de que se armó la amistad, gana ese.
      name: share?.displayName || String(row.friendName || friendEmail),
      since: String(row.createdAt ?? ""),
      share,
    };
  });

  const toInvite = (row: Row): FriendInvite => ({
    id: Number(row.id), code: String(row.code), fromEmail: String(row.fromEmail).toLowerCase(),
    fromName: String(row.fromName ?? ""), toEmail: String(row.toEmail ?? "").toLowerCase(),
    status: "pending", createdAt: String(row.createdAt ?? ""),
  });
  const pending = invites.map(toInvite);

  const groupInvites: GroupInvite[] = groupInviteRows.map((row) => ({
    id: Number(row.id), groupId: Number(row.groupId), groupName: String(row.groupName ?? ""),
    fromEmail: String(row.fromEmail ?? "").toLowerCase(), fromName: String(row.fromName ?? ""),
    toEmail: String(row.toEmail ?? "").toLowerCase(), createdAt: String(row.createdAt ?? ""),
  }));

  const groups: Group[] = groupRows.map((row) => {
    const id = Number(row.id);
    const goals: GroupGoal[] = goalRows.filter((goal) => Number(goal.groupId) === id).map((goal) => ({
      id: Number(goal.id), groupId: id, title: String(goal.title),
      metric: String(goal.metric) as GoalMetric, targetValue: Number(goal.targetValue ?? 0),
      period: String(goal.period) as GroupGoal["period"], dueDate: String(goal.dueDate ?? ""),
      source: (GOAL_SOURCES.some((item) => item.value === goal.source) ? goal.source : "manual") as GoalSource,
      createdBy: String(goal.createdBy ?? "").toLowerCase(), createdAt: String(goal.createdAt ?? ""),
      contributions: progressRows.filter((item) => Number(item.goalId) === Number(goal.id)).map((item) => ({
        userEmail: String(item.userEmail), displayName: String(item.displayName || item.userEmail), value: Number(item.value ?? 0),
      })),
    }));
    const members: GroupMember[] = memberRows.filter((member) => Number(member.groupId) === id).map((member) => ({
      userEmail: String(member.userEmail),
      displayName: String(member.displayName || member.userEmail),
      role: member.role === "owner" ? "owner" : "member",
    }));
    return {
      id, name: String(row.name), purpose: String(row.purpose ?? ""),
      accent: (GROUP_ACCENTS.includes(row.accent as GroupAccent) ? row.accent : "mint") as GroupAccent,
      ownerEmail: String(row.ownerEmail).toLowerCase(),
      isOwner: String(row.ownerEmail).toLowerCase() === email,
      inviteCode: String(row.inviteCode),
      members, goals, pending: groupInvites.filter((invite) => invite.groupId === id),
    };
  });

  return {
    me: email,
    friends,
    incoming: pending.filter((invite) => invite.toEmail === email && invite.fromEmail !== email),
    outgoing: pending.filter((invite) => invite.fromEmail === email),
    groups,
    groupInvites: groupInvites.filter((invite) => invite.toEmail === email),
  };
}

export async function GET() {
  try {
    const active = await session();
    if (!active) return fail("Necesitás iniciar sesión.", 401);
    return Response.json(await readSocial(active.email));
  } catch (cause) {
    console.error("friends GET", cause);
    return fail("No pudimos cargar tu círculo. Verificá que corriste supabase/friends.sql.", 500);
  }
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const active = await session();
    if (!active) return fail("Necesitás iniciar sesión.", 401);
    const { email, user } = active;
    const payload = await request.json() as Row;
    const action = String(payload.action ?? "");

    // --- Amistades -------------------------------------------------------
    if (action === "invite_friend") {
      // Se invita por nombre de usuario, no por email: nadie tiene que
      // compartir su email para que lo sumen al círculo. El resuelve del
      // nombre de usuario al email real vive en una función security
      // definer porque la política de `profiles` sólo deja ver la fila
      // propia.
      const username = text(payload.username, 20).toLowerCase();
      let target = "";
      if (username) {
        if (!USERNAME.test(username)) return fail("Ese nombre de usuario no es válido.");
        const found = await callRpc<string | null>("avora_find_email_by_username", { p_username: username });
        if (!found) return fail("No encontramos a nadie con ese nombre de usuario.");
        target = found.toLowerCase();
      }
      if (target === email) return fail("Ese sos vos.");
      if (target) {
        const already = await selectRows<Row>("friendships", { where: { userEmail: email, friendEmail: target }, limit: 1 });
        if (already.length) return fail("Ya son amigos.");
        const open = await selectRows<Row>("friend_invites", { where: { fromEmail: email, toEmail: target, status: "pending" }, limit: 1 });
        // Reusar la invitación abierta evita llenar la bandeja del otro con
        // copias cada vez que se aprieta el botón.
        if (open.length) return ok({ code: String(open[0].code), link: `${siteOrigin(request)}/invite/${open[0].code}`, reused: true });
      }
      const code = inviteCode();
      await insertRows("friend_invites", { code, fromEmail: email, fromName: user.displayName, toEmail: target, status: "pending" });
      return ok({ code, link: `${siteOrigin(request)}/invite/${code}`, reused: false });
    }
    if (action === "accept_invite") {
      const code = text(payload.code, 64);
      if (!code) return fail("Falta el código de la invitación.");
      const accepted = await callRpc<Array<{ acceptedEmail: string; acceptedName: string }>>("avora_accept_friend_invite", { p_code: code });
      await clearPendingInvite();
      const friend = Array.isArray(accepted) ? accepted[0] : null;
      return ok({ friendName: friend?.acceptedName || friend?.acceptedEmail || "" });
    }
    if (action === "decline_invite") {
      const code = text(payload.code, 64);
      if (!code) return fail("Falta el código de la invitación.");
      await callRpc("avora_decline_friend_invite", { p_code: code });
      await clearPendingInvite();
      return ok();
    }
    if (action === "revoke_invite") {
      const code = text(payload.code, 64);
      if (!code) return fail("Falta el código de la invitación.");
      await updateRows("friend_invites", { code, fromEmail: email }, { status: "revoked", respondedAt: now() });
      return ok();
    }
    if (action === "dismiss_pending_invite") { await clearPendingInvite(); return ok(); }
    if (action === "remove_friend") {
      const target = text(payload.email, 160).toLowerCase();
      if (!EMAIL.test(target)) return fail("Email inválido.");
      await callRpc("avora_remove_friend", { p_email: target });
      return ok();
    }

    // --- La foto del día que ven los amigos ------------------------------
    if (action === "publish_share") {
      const shareDate = String(payload.shareDate ?? "");
      if (!DATE.test(shareDate)) return fail("Fecha inválida.");
      const score = clamp(payload.score, 0, 100);
      await insertRows("friend_shares", {
        userEmail: email, displayName: user.displayName, shareDate, score,
        streak: clamp(payload.streak, 0, 3650), bestStreak: clamp(payload.bestStreak, 0, 3650),
        headline: shareHeadline(score), updatedAt: now(),
      }, { upsert: true, onConflict: ["userEmail"] });
      return ok();
    }

    // --- Grupos ----------------------------------------------------------
    if (action === "create_group") {
      const name = text(payload.name, 60);
      if (name.length < 2) return fail("Poné un nombre para el grupo.");
      const accent = GROUP_ACCENTS.includes(payload.accent as GroupAccent) ? String(payload.accent) : "mint";
      // El grupo se guarda entero de una: nombre, su primer objetivo y las
      // invitaciones. Guardar a medias dejaría un grupo vacío si el objetivo
      // no valida, que es justo lo que el formulario intenta evitar.
      const draft = payload.goal && text((payload.goal as Row).title, 120) ? goalFields(payload.goal as Row) : null;
      if (typeof draft === "string") return fail(draft);
      const created = await callRpc<Row[]>("avora_create_group", {
        p_name: name, p_purpose: text(payload.purpose, 160), p_accent: accent,
        p_code: inviteCode(), p_display_name: user.displayName,
      });
      const group = Array.isArray(created) ? created[0] : null;
      const groupId = group ? Number(group.id) : 0;
      if (!groupId) return fail("No pudimos crear el grupo.", 500);
      if (draft) await insertRows("group_goals", { groupId, ...draft, createdBy: email });
      let invited = 0;
      for (const candidate of (Array.isArray(payload.invites) ? payload.invites : []).slice(0, 25)) {
        if (await inviteToGroup(email, user.displayName, groupId, name, text(candidate, 160).toLowerCase())) invited += 1;
      }
      return ok({ groupId, invited });
    }
    if (action === "update_group") {
      const groupId = Number(payload.groupId);
      const name = text(payload.name, 60);
      if (!groupId || name.length < 2) return fail("Poné un nombre para el grupo.");
      const accent = GROUP_ACCENTS.includes(payload.accent as GroupAccent) ? String(payload.accent) : "mint";
      await updateRows("avora_groups", { id: groupId, ownerEmail: email }, { name, accent });
      // El nombre viaja copiado en las invitaciones abiertas: quien todavía no
      // contestó tiene que ver el nombre nuevo, no el viejo.
      await updateRows("group_invites", { groupId, status: "pending" }, { groupName: name });
      return ok();
    }
    if (action === "join_group") {
      const code = text(payload.code, 64);
      if (!code) return fail("Falta el código del grupo.");
      await callRpc("avora_join_group", { p_code: code, p_display_name: user.displayName });
      return ok();
    }
    if (action === "invite_to_group") {
      const groupId = Number(payload.groupId);
      const target = text(payload.email, 160).toLowerCase();
      if (!groupId || !EMAIL.test(target)) return fail("Elegí un grupo y un amigo válidos.");
      const group = (await selectRows<Row>("avora_groups", { where: { id: groupId }, limit: 1 }))[0];
      if (!group) return fail("Grupo no encontrado.", 404);
      if (!await inviteToGroup(email, user.displayName, groupId, String(group.name), target)) {
        return fail("Sólo podés invitar a gente de tu círculo que todavía no esté en el grupo ni tenga una invitación abierta.");
      }
      return ok();
    }
    if (action === "accept_group_invite") {
      const id = Number(payload.inviteId);
      if (!id) return fail("Invitación inválida.");
      await callRpc("avora_accept_group_invite", { p_id: id, p_display_name: user.displayName });
      return ok();
    }
    if (action === "decline_group_invite") {
      const id = Number(payload.inviteId);
      if (!id) return fail("Invitación inválida.");
      await callRpc("avora_decline_group_invite", { p_id: id });
      return ok();
    }
    if (action === "revoke_group_invite") {
      const id = Number(payload.inviteId);
      if (!id) return fail("Invitación inválida.");
      await updateRows("group_invites", { id }, { status: "revoked", respondedAt: now() });
      return ok();
    }
    if (action === "leave_group") {
      const groupId = Number(payload.groupId);
      if (!groupId) return fail("Grupo inválido.");
      const group = (await selectRows<Row>("avora_groups", { where: { id: groupId }, limit: 1 }))[0];
      if (!group) return fail("Grupo no encontrado.", 404);
      // Si se va quien lo creó, el grupo se queda sin dueño: en ese caso hay
      // que borrarlo explícitamente, no salirse.
      if (String(group.ownerEmail).toLowerCase() === email) return fail("Creaste este grupo: para salir, eliminalo.", 409);
      await deleteRows("group_members", { groupId, userEmail: email });
      return ok();
    }
    if (action === "remove_group_member") {
      const groupId = Number(payload.groupId);
      const target = text(payload.email, 160).toLowerCase();
      if (!groupId || !EMAIL.test(target)) return fail("Datos inválidos.");
      if (target === email) return fail("Para salir usá la opción de salir del grupo.");
      await deleteRows("group_members", { groupId, userEmail: target });
      return ok();
    }
    if (action === "delete_group") {
      const groupId = Number(payload.groupId);
      if (!groupId) return fail("Grupo inválido.");
      await deleteRows("avora_groups", { id: groupId, ownerEmail: email });
      return ok();
    }

    // --- Objetivos en común ----------------------------------------------
    if (action === "add_group_goal") {
      const groupId = Number(payload.groupId);
      if (!groupId) return fail("Elegí el grupo.");
      const draft = goalFields(payload);
      if (typeof draft === "string") return fail(draft);
      await insertRows("group_goals", { groupId, ...draft, createdBy: email });
      return ok();
    }
    if (action === "update_group_goal") {
      const goalId = Number(payload.goalId);
      if (!goalId) return fail("Objetivo inválido.");
      const draft = goalFields(payload);
      if (typeof draft === "string") return fail(draft);
      await updateRows("group_goals", { id: goalId }, draft);
      return ok();
    }
    if (action === "delete_group_goal") {
      const goalId = Number(payload.goalId);
      if (!goalId) return fail("Objetivo inválido.");
      // Los aportes cuelgan del objetivo con `on delete cascade`: borrarlos acá
      // sólo alcanzaría al propio, y los demás quedarían igual.
      await deleteRows("group_goals", { id: goalId });
      return ok();
    }
    if (action === "log_goal_progress") {
      const goalId = Number(payload.goalId);
      if (!goalId) return fail("Objetivo inválido.");
      await insertRows("group_goal_progress", {
        goalId, userEmail: email, displayName: user.displayName,
        value: clamp(payload.value, 0, 100000), updatedAt: now(),
      }, { upsert: true, onConflict: ["goalId", "userEmail"] });
      return ok();
    }

    return fail("Acción desconocida.");
  } catch (cause) {
    console.error("friends POST", cause);
    // Los `raise exception` de Postgres ya vienen redactados para leer.
    const message = cause instanceof Error ? cause.message : "";
    return fail(message && message.length < 160 ? message : "No se pudo guardar. Verificá Supabase.", 500);
  }
}

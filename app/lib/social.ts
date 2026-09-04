/**
 * El círculo social, en un solo lugar.
 *
 * Acá viven los tipos que cruzan servidor y cliente y las funciones puras que
 * los dos lados necesitan calcular igual: el texto de una invitación, la
 * etiqueta de un Daily Score ajeno y el avance de un objetivo de grupo.
 */

export type Friend = {
  email: string;
  name: string;
  since: string;
  /** Su foto del día. Falta mientras el amigo no haya abierto la app hoy. */
  share: FriendShare | null;
};

export type FriendShare = {
  displayName: string;
  shareDate: string;
  score: number;
  streak: number;
  bestStreak: number;
  headline: string;
};

export type InviteStatus = "pending" | "accepted" | "declined" | "revoked";
export type FriendInvite = {
  id: number;
  code: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  status: InviteStatus;
  createdAt: string;
};

export type GroupAccent = "mint" | "violet" | "coral";
export type Group = {
  id: number;
  name: string;
  purpose: string;
  accent: GroupAccent;
  ownerEmail: string;
  /**
   * Si la sesión creó el grupo. Lo resuelve el servidor contra el email del
   * token: comparar el `ownerEmail` con el del perfil en el cliente falla si
   * los dos no coinciden exactamente, y ahí se pierde el acceso al engranaje.
   */
  isOwner: boolean;
  inviteCode: string;
  members: GroupMember[];
  goals: GroupGoal[];
  /** Invitaciones del grupo que todavía nadie respondió. */
  pending: GroupInvite[];
};
export type GroupMember = { userEmail: string; displayName: string; role: "owner" | "member" };

/**
 * Sumar a alguien al grupo no lo mete adentro: le deja una invitación, igual
 * que en el círculo. Nadie entra a un grupo sin haber dicho que sí.
 */
export type GroupInvite = {
  id: number;
  groupId: number;
  /** El nombre viaja en la fila: quien todavía no es integrante no puede leer el grupo. */
  groupName: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  createdAt: string;
};

export type GoalMetric = "count" | "minutes" | "pages" | "sessions";
export type GoalPeriodKind = "weekly" | "monthly" | "custom";
/** De dónde sale tu marca: la cargás a mano o la lee de lo que ya registrás. */
export type GoalSource = "manual" | "training" | "focus" | "reading" | "sleep";
export type GroupGoal = {
  id: number;
  groupId: number;
  title: string;
  metric: GoalMetric;
  targetValue: number;
  period: GoalPeriodKind;
  dueDate: string;
  source: GoalSource;
  createdBy: string;
  createdAt: string;
  contributions: GoalContribution[];
};
export type GoalContribution = { userEmail: string; displayName: string; value: number };

export type SocialData = {
  /**
   * El email con el que quedaron firmadas las filas de esta sesión. Todo lo que
   * compara "esto es mío" usa este valor y no el del perfil: son dos fuentes
   * distintas y basta que difieran para que tu aporte se vea como el de otro.
   */
  me: string;
  friends: Friend[];
  /** Invitaciones que me mandaron y todavía no respondí. */
  incoming: FriendInvite[];
  /** Las que mandé yo y siguen abiertas, con su link para compartir. */
  outgoing: FriendInvite[];
  groups: Group[];
  /** Grupos a los que me invitaron y todavía no contesté. */
  groupInvites: GroupInvite[];
};

export const emptySocial = (): SocialData => ({ me: "", friends: [], incoming: [], outgoing: [], groups: [], groupInvites: [] });

export const GOAL_METRICS: Array<{ value: GoalMetric; label: string; unit: string }> = [
  { value: "count", label: "Veces", unit: "veces" },
  { value: "sessions", label: "Sesiones", unit: "sesiones" },
  { value: "minutes", label: "Minutos", unit: "min" },
  { value: "pages", label: "Páginas", unit: "págs" },
];

export const GROUP_ACCENTS: GroupAccent[] = ["mint", "violet", "coral"];

/**
 * Las fuentes automáticas. Cada una fija su métrica y su unidad: si el objetivo
 * se alimenta de los entrenamientos, elegir "páginas" no querría decir nada.
 */
export const GOAL_SOURCES: Array<{ value: GoalSource; label: string; hint: string; metric: GoalMetric; unit: string }> = [
  { value: "manual", label: "A mano", hint: "Cada integrante carga su marca acá.", metric: "count", unit: "veces" },
  { value: "training", label: "Entrenamientos", hint: "Cuenta los días que registrás un entrenamiento en Físico.", metric: "sessions", unit: "entrenamientos" },
  { value: "focus", label: "Foco", hint: "Suma los minutos de estudio y trabajo que registrás.", metric: "minutes", unit: "min" },
  { value: "reading", label: "Lectura", hint: "Suma las páginas que cargás en tu biblioteca.", metric: "pages", unit: "págs" },
  { value: "sleep", label: "Sueño", hint: "Cuenta las noches de siete horas o más.", metric: "count", unit: "noches" },
];

export function goalSource(source: GoalSource) {
  return GOAL_SOURCES.find((item) => item.value === source) ?? GOAL_SOURCES[0];
}

export function metricUnit(metric: GoalMetric) {
  return GOAL_METRICS.find((item) => item.value === metric)?.unit ?? "veces";
}

/** La unidad que se lee en la tarjeta: la de la fuente manda sobre la métrica. */
export function goalUnit(goal: Pick<GroupGoal, "metric" | "source">) {
  return goal.source === "manual" ? metricUnit(goal.metric) : goalSource(goal.source).unit;
}

/** Iniciales para el avatar: una letra si hay un solo nombre, dos si hay más. */
export function initialsFor(name: string, fallback = "?") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

/** Un color estable por persona, para que el avatar no cambie entre recargas. */
export function accentFor(seed: string): GroupAccent {
  let total = 0;
  for (const character of seed) total = (total + character.charCodeAt(0)) % 997;
  return GROUP_ACCENTS[total % GROUP_ACCENTS.length];
}

/** Cómo se lee el día de otra persona sin ver un solo dato suyo. */
export function shareHeadline(score: number) {
  if (score >= 85) return "Gran día";
  if (score >= 60) return "Buen ritmo";
  if (score >= 30) return "Arrancando";
  return "Todavía sin registrar";
}

/** Lo que ve un amigo cuando la foto del día es de ayer o más vieja. */
export function shareStatus(share: FriendShare | null, today: string) {
  if (!share) return "Todavía no compartió su día";
  if (share.shareDate === today) return share.headline || shareHeadline(share.score);
  return "Sin actividad hoy";
}

export function isFresh(share: FriendShare | null, today: string): share is FriendShare {
  return Boolean(share && share.shareDate === today);
}

function shiftDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * El tramo de días que cuenta para un objetivo. Es lo que le permite a una
 * fuente automática saber cuánto de lo que registraste entra en esta ronda: la
 * semana en curso, el mes en curso, o desde que se fijó el objetivo hasta su
 * fecha límite.
 */
export function goalWindow(goal: Pick<GroupGoal, "period" | "dueDate" | "createdAt">, today: string) {
  if (goal.period === "weekly") {
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const monday = shiftDays(today, -weekday);
    return { start: monday, end: shiftDays(monday, 6) };
  }
  if (goal.period === "monthly") {
    const start = `${today.slice(0, 7)}-01`;
    const next = new Date(`${start}T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { start, end: shiftDays(next.toISOString().slice(0, 10), -1) };
  }
  const start = goal.createdAt.slice(0, 10) || today;
  return { start, end: goal.dueDate || today };
}

export function goalPeriodLabel(goal: Pick<GroupGoal, "period" | "dueDate">) {
  if (goal.period === "weekly") return "ESTA SEMANA";
  if (goal.period === "monthly") return "ESTE MES";
  return goal.dueDate ? `HASTA ${goal.dueDate}` : "SIN PLAZO";
}

export function goalTotal(goal: GroupGoal) {
  return goal.contributions.reduce((sum, item) => sum + item.value, 0);
}

export function goalPercent(goal: GroupGoal) {
  if (goal.targetValue <= 0) return 0;
  return Math.min(100, Math.round(goalTotal(goal) / goal.targetValue * 100));
}

/**
 * El texto que se manda por WhatsApp o mail. Va el link de invitación y nada
 * más: quien lo recibe todavía no tiene cuenta, así que no puede haber ningún
 * dato del que invita más allá de su nombre.
 */
export function inviteMessage(fromName: string, link: string) {
  const who = fromName.trim() || "Un amigo";
  return `${who} te invita a AVORA para que compartan su Daily Score y se empujen entre ustedes. Entrá acá: ${link}`;
}

export function whatsappLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailLink(text: string, toEmail = "") {
  const subject = encodeURIComponent("Te invito a AVORA");
  return `mailto:${toEmail}?subject=${subject}&body=${encodeURIComponent(text)}`;
}

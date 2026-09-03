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
  inviteCode: string;
  members: GroupMember[];
  goals: GroupGoal[];
};
export type GroupMember = { userEmail: string; displayName: string; role: "owner" | "member" };

export type GoalMetric = "count" | "minutes" | "pages" | "sessions";
export type GoalPeriodKind = "weekly" | "monthly" | "custom";
export type GroupGoal = {
  id: number;
  groupId: number;
  title: string;
  metric: GoalMetric;
  targetValue: number;
  period: GoalPeriodKind;
  dueDate: string;
  createdBy: string;
  contributions: GoalContribution[];
};
export type GoalContribution = { userEmail: string; displayName: string; value: number };

export type SocialData = {
  friends: Friend[];
  /** Invitaciones que me mandaron y todavía no respondí. */
  incoming: FriendInvite[];
  /** Las que mandé yo y siguen abiertas, con su link para compartir. */
  outgoing: FriendInvite[];
  groups: Group[];
};

export const emptySocial = (): SocialData => ({ friends: [], incoming: [], outgoing: [], groups: [] });

export const GOAL_METRICS: Array<{ value: GoalMetric; label: string; unit: string }> = [
  { value: "count", label: "Veces", unit: "veces" },
  { value: "sessions", label: "Sesiones", unit: "sesiones" },
  { value: "minutes", label: "Minutos", unit: "min" },
  { value: "pages", label: "Páginas", unit: "págs" },
];

export const GROUP_ACCENTS: GroupAccent[] = ["mint", "violet", "coral"];

export function metricUnit(metric: GoalMetric) {
  return GOAL_METRICS.find((item) => item.value === metric)?.unit ?? "veces";
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

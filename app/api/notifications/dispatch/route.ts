import webpush from "web-push";
import { SUPABASE_URL } from "../../../lib/supabase-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Candidate = {
  email: string;
  kind: string;
  referenceKey: string;
  title: string;
  body: string;
  url: string;
};

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://productivity-app-git-feat-avora-ui-polish-ralvarado-3362.vercel.app";
const DEFAULT_VAPID_PUBLIC_KEY = "BFjo70YM_MZxUr28GKf0hneZBkUyvP-wP1SuyFJcpDXF8XphPUTruryDXucj0c1MlAPool4YiNLqeK8zImedOTQ";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  return key;
}

function adminHeaders(extra: Record<string, string> = {}) {
  const key = serviceRoleKey();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
  // Las claves nuevas sb_secret_* sólo deben viajar como apikey.
  // La clave legacy service_role (JWT) necesita también Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;
  return headers;
}

async function adminRequest(table: string, query = "", init: RequestInit = {}): Promise<Row[]> {
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : ""), {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Supabase " + response.status + ": " + text);
  if (!text) return [];
  const parsed: unknown = JSON.parse(text);
  return Array.isArray(parsed) ? parsed as Row[] : [];
}

function value(row: Row, key: string) {
  return row[key];
}

function stringValue(row: Row, key: string, fallback = "") {
  const item = value(row, key);
  return typeof item === "string" ? item : item == null ? fallback : String(item);
}

function booleanValue(row: Row, key: string, fallback = false) {
  const item = value(row, key);
  return typeof item === "boolean" ? item : fallback;
}

function numberValue(row: Row, key: string, fallback = 0) {
  const item = Number(value(row, key));
  return Number.isFinite(item) ? item : fallback;
}

function validTime(value: string) {
  return /^([01]\\d|2[0-3]):[0-5]\\d$/.test(value) ? value : null;
}

function safeTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localClock(now: Date, timeZone: string) {
  const zone = safeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const numericHour = Number(part("hour")) % 24;
  return {
    date: part("year") + "-" + part("month") + "-" + part("day"),
    time: pad(numericHour) + ":" + part("minute"),
    weekday: part("weekday"),
  };
}

function dueWithinWindow(current: string, configured: string) {
  const target = validTime(configured);
  if (!target) return false;
  const currentMinutes = Number(current.slice(0, 2)) * 60 + Number(current.slice(3, 5));
  const targetMinutes = Number(target.slice(0, 2)) * 60 + Number(target.slice(3, 5));
  return (currentMinutes - targetMinutes + 1440) % 1440 < 15;
}

function addDays(isoDate: string, amount: number) {
  const date = new Date(isoDate + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: string, month: string) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

function referenceQuery(email: string, kind: string, referenceKey: string) {
  return new URLSearchParams({
    user_email: "eq." + email,
    kind: "eq." + kind,
    reference_key: "eq." + referenceKey,
  }).toString();
}

async function claimDelivery(candidate: Candidate) {
  const rows = await adminRequest(
    "notification_deliveries",
    new URLSearchParams({ on_conflict: "user_email,kind,reference_key" }).toString(),
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify([{
        user_email: candidate.email,
        kind: candidate.kind,
        reference_key: candidate.referenceKey,
      }]),
    },
  );
  return rows.length > 0;
}

async function releaseDelivery(candidate: Candidate) {
  await adminRequest(
    "notification_deliveries",
    referenceQuery(candidate.email, candidate.kind, candidate.referenceKey),
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
}

function isExpiredPushError(error: unknown) {
  const statusCode = Number((error as { statusCode?: unknown })?.statusCode);
  return statusCode === 404 || statusCode === 410;
}

function notificationFor(candidate: Candidate) {
  return JSON.stringify({
    title: candidate.title,
    body: candidate.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: candidate.kind + ":" + candidate.referenceKey,
    data: { url: candidate.url },
  });
}

async function sendCandidate(candidate: Candidate, subscriptions: Row[]) {
  if (!subscriptions.length) return { sent: 0, expired: 0 };
  if (!(await claimDelivery(candidate))) return { sent: 0, expired: 0 };

  let sent = 0;
  let expired = 0;
  await Promise.all(subscriptions.map(async (row) => {
    const endpoint = stringValue(row, "endpoint");
    const p256dh = stringValue(row, "p256dh");
    const auth = stringValue(row, "auth");
    if (!endpoint || !p256dh || !auth) return;
    try {
      await webpush.sendNotification(
        { endpoint, keys: { p256dh, auth } },
        notificationFor(candidate),
        { TTL: 3600 },
      );
      sent += 1;
    } catch (error) {
      console.error("notifications push send failed", {
        email: candidate.email,
        kind: candidate.kind,
        statusCode: Number((error as { statusCode?: unknown })?.statusCode) || undefined,
        message: error instanceof Error ? error.message : String(error),
      });
      if (isExpiredPushError(error)) {
        expired += 1;
        const id = numberValue(row, "id");
        if (id) {
          await adminRequest(
            "push_subscriptions",
            new URLSearchParams({ id: "eq." + id }).toString(),
            { method: "DELETE", headers: { Prefer: "return=minimal" } },
          );
        }
      }
    }
  }));

  if (!sent) await releaseDelivery(candidate);
  return { sent, expired };
}

function summaryCandidates(email: string, profile: Row, preferences: Row, clock: ReturnType<typeof localClock>) {
  const candidates: Candidate[] = [];
  const [year, month, day] = clock.date.split("-");
  const isLastDay = Number(day) === daysInMonth(year, month);
  const isSunday = clock.weekday === "Sun";
  const isNewYearEve = month === "12" && day === "31";
  const isPro = Boolean(stringValue(profile, "pro_since"));

  if (booleanValue(preferences, "daily_balance_enabled", true) && dueWithinWindow(clock.time, stringValue(preferences, "daily_balance_time", "21:00"))) {
    candidates.push({
      email,
      kind: "daily_balance",
      referenceKey: clock.date,
      title: "Balance del día",
      body: isPro ? "Recuerda hacer el balance de tu día, tomará menos de un minuto." : "Recuerda hacer el balance de tu día.",
      url: APP_URL + "/?section=summary",
    });
  }
  if (booleanValue(preferences, "weekly_summary_enabled", true) && isSunday && dueWithinWindow(clock.time, stringValue(preferences, "weekly_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "weekly_summary",
      referenceKey: clock.date,
      title: "Tu resumen semanal",
      body: "Mira tu progreso, tus rachas y las áreas que conviene acomodar.",
      url: APP_URL + "/?section=stats",
    });
  }
  if (booleanValue(preferences, "monthly_summary_enabled", true) && isLastDay && dueWithinWindow(clock.time, stringValue(preferences, "monthly_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "monthly_summary",
      referenceKey: year + "-" + month,
      title: "Tu resumen mensual",
      body: "Cerrá el mes viendo qué avanzó y qué querés priorizar después.",
      url: APP_URL + "/?section=stats",
    });
  }
  if (booleanValue(preferences, "annual_summary_enabled", true) && isNewYearEve && dueWithinWindow(clock.time, stringValue(preferences, "annual_summary_time", "20:00"))) {
    candidates.push({
      email,
      kind: "annual_summary",
      referenceKey: year,
      title: "Tu resumen anual",
      body: "Repasá todo lo que construiste este año en AVORA.",
      url: APP_URL + "/?section=stats",
    });
  }
  return candidates;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || authorization !== "Bearer " + expectedSecret) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? DEFAULT_VAPID_PUBLIC_KEY;
    if (!privateKey) throw new Error("Falta VAPID_PRIVATE_KEY en el entorno del servidor.");
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:notifications@avora.app", publicKey, privateKey);

    const now = new Date();
    const [preferenceRows, subscriptions, profiles, events] = await Promise.all([
      adminRequest("notification_preferences", new URLSearchParams({ push_enabled: "eq.true" }).toString()),
      adminRequest("push_subscriptions"),
      adminRequest("profiles", new URLSearchParams({ select: "email,display_name,pro_since" }).toString()),
      adminRequest("calendar_events", new URLSearchParams({ select: "id,user_email,title,event_date,event_time" }).toString()),
    ]);

    const profilesByEmail = new Map(profiles.map((row) => [stringValue(row, "email"), row]));
    const subscriptionsByEmail = new Map<string, Row[]>();
    for (const row of subscriptions) {
      const email = stringValue(row, "user_email");
      const current = subscriptionsByEmail.get(email) ?? [];
      current.push(row);
      subscriptionsByEmail.set(email, current);
    }
    const eventsByEmail = new Map<string, Row[]>();
    for (const row of events) {
      const email = stringValue(row, "user_email");
      const current = eventsByEmail.get(email) ?? [];
      current.push(row);
      eventsByEmail.set(email, current);
    }

    let usersChecked = 0;
    let sent = 0;
    let expired = 0;
    for (const preference of preferenceRows) {
      const email = stringValue(preference, "user_email");
      const userSubscriptions = subscriptionsByEmail.get(email) ?? [];
      if (!email || !userSubscriptions.length) continue;
      usersChecked += 1;
      const profile = profilesByEmail.get(email) ?? {};
      const timezone = stringValue(preference, "timezone", DEFAULT_TIMEZONE);
      const clock = localClock(now, timezone);
      const candidates = summaryCandidates(email, profile, preference, clock);

      if (booleanValue(preference, "calendar_enabled", true) && dueWithinWindow(clock.time, stringValue(preference, "calendar_reminder_time", "18:00"))) {
        const tomorrow = addDays(clock.date, 1);
        for (const event of eventsByEmail.get(email) ?? []) {
          if (stringValue(event, "event_date") !== tomorrow) continue;
          const eventId = numberValue(event, "id");
          const title = stringValue(event, "title", "un evento");
          const eventTime = validTime(stringValue(event, "event_time"));
          candidates.push({
            email,
            kind: "calendar_reminder",
            referenceKey: String(eventId) + ":" + tomorrow,
            title: "Recordatorio de calendario",
            body: "Recuerda: mañana tienes " + title + (eventTime ? " a las " + eventTime + "." : "."),
            url: APP_URL + "/?section=plan",
          });
        }
      }

      for (const candidate of candidates) {
        const result = await sendCandidate(candidate, userSubscriptions);
        sent += result.sent;
        expired += result.expired;
      }
    }

    return Response.json({ ok: true, checkedAt: now.toISOString(), usersChecked, sent, expired });
  } catch (error) {
    console.error("notifications dispatch", error);
    return Response.json({ error: "No se pudieron procesar las notificaciones." }, { status: 500 });
  }
}

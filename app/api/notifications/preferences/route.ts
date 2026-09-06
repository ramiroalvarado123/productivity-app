import { getChatGPTUser } from "../../../chatgpt-auth";
import { insertRows, selectRows } from "../../../lib/supabase-db";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULTS = {
  pushEnabled: false,
  calendarEnabled: true,
  dailyBalanceEnabled: true,
  weeklySummaryEnabled: true,
  monthlySummaryEnabled: true,
  annualSummaryEnabled: true,
  calendarReminderTime: "18:00",
  dailyBalanceTime: "21:00",
  weeklySummaryTime: "20:00",
  monthlySummaryTime: "20:00",
  annualSummaryTime: "20:00",
  timezone: "America/Argentina/Buenos_Aires",
};

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function currentUser() {
  const user = await getChatGPTUser();
  if (user) await insertRows("profiles", { email: user.email, displayName: user.displayName }, { upsert: true, onConflict: ["email"], ignoreDuplicates: true });
  return user;
}

function normalize(row: Record<string, unknown> | undefined) {
  return {
    pushEnabled: Boolean(row?.pushEnabled ?? DEFAULTS.pushEnabled),
    calendarEnabled: Boolean(row?.calendarEnabled ?? DEFAULTS.calendarEnabled),
    dailyBalanceEnabled: Boolean(row?.dailyBalanceEnabled ?? DEFAULTS.dailyBalanceEnabled),
    weeklySummaryEnabled: Boolean(row?.weeklySummaryEnabled ?? DEFAULTS.weeklySummaryEnabled),
    monthlySummaryEnabled: Boolean(row?.monthlySummaryEnabled ?? DEFAULTS.monthlySummaryEnabled),
    annualSummaryEnabled: Boolean(row?.annualSummaryEnabled ?? DEFAULTS.annualSummaryEnabled),
    calendarReminderTime: String(row?.calendarReminderTime ?? DEFAULTS.calendarReminderTime),
    dailyBalanceTime: String(row?.dailyBalanceTime ?? DEFAULTS.dailyBalanceTime),
    weeklySummaryTime: String(row?.weeklySummaryTime ?? DEFAULTS.weeklySummaryTime),
    monthlySummaryTime: String(row?.monthlySummaryTime ?? DEFAULTS.monthlySummaryTime),
    annualSummaryTime: String(row?.annualSummaryTime ?? DEFAULTS.annualSummaryTime),
    timezone: String(row?.timezone ?? DEFAULTS.timezone),
  };
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const row = (await selectRows("notification_preferences", { where: { userEmail: user.email }, limit: 1 }))[0] as Record<string, unknown> | undefined;
    return Response.json({ ...normalize(row), email: user.email });
  } catch (error) {
    console.error("notification preferences GET failed", error);
    return fail("No pudimos cargar las preferencias de notificaciones.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return fail("Datos inválidos.");
    const current = normalize((await selectRows("notification_preferences", { where: { userEmail: user.email }, limit: 1 }))[0] as Record<string, unknown> | undefined);
    const next = {
      pushEnabled: typeof body.pushEnabled === "boolean" ? body.pushEnabled : current.pushEnabled,
      calendarEnabled: typeof body.calendarEnabled === "boolean" ? body.calendarEnabled : current.calendarEnabled,
      dailyBalanceEnabled: typeof body.dailyBalanceEnabled === "boolean" ? body.dailyBalanceEnabled : current.dailyBalanceEnabled,
      weeklySummaryEnabled: typeof body.weeklySummaryEnabled === "boolean" ? body.weeklySummaryEnabled : current.weeklySummaryEnabled,
      monthlySummaryEnabled: typeof body.monthlySummaryEnabled === "boolean" ? body.monthlySummaryEnabled : current.monthlySummaryEnabled,
      annualSummaryEnabled: typeof body.annualSummaryEnabled === "boolean" ? body.annualSummaryEnabled : current.annualSummaryEnabled,
      calendarReminderTime: typeof body.calendarReminderTime === "string" && TIME.test(body.calendarReminderTime) ? body.calendarReminderTime : current.calendarReminderTime,
      dailyBalanceTime: typeof body.dailyBalanceTime === "string" && TIME.test(body.dailyBalanceTime) ? body.dailyBalanceTime : current.dailyBalanceTime,
      weeklySummaryTime: typeof body.weeklySummaryTime === "string" && TIME.test(body.weeklySummaryTime) ? body.weeklySummaryTime : current.weeklySummaryTime,
      monthlySummaryTime: typeof body.monthlySummaryTime === "string" && TIME.test(body.monthlySummaryTime) ? body.monthlySummaryTime : current.monthlySummaryTime,
      annualSummaryTime: typeof body.annualSummaryTime === "string" && TIME.test(body.annualSummaryTime) ? body.annualSummaryTime : current.annualSummaryTime,
      timezone: typeof body.timezone === "string" && body.timezone.length <= 80 ? body.timezone : current.timezone,
      updatedAt: new Date().toISOString(),
    };
    await insertRows("notification_preferences", { userEmail: user.email, ...next }, { upsert: true, onConflict: ["userEmail"] });
    return Response.json({ ok: true, ...next });
  } catch (error) {
    console.error("notification preferences POST failed", error);
    return fail("No pudimos guardar las preferencias.", 500);
  }
}

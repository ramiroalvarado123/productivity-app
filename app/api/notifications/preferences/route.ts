import { getSessionUser } from "@/server/auth/session";
import { insertRows, selectRows } from "@/server/db/postgrest";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULTS = {
  pushEnabled: false,
  calendarEnabled: true,
  dailyBalanceEnabled: true,
  weeklySummaryEnabled: true,
  monthlySummaryEnabled: true,
  annualSummaryEnabled: true,
  calendarReminderTime: "18:00",
  calendarReminderDaysBefore: 1,
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
  const user = await getSessionUser();
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
    calendarReminderDaysBefore: Math.max(1, Math.min(30, Math.round(Number(row?.calendarReminderDaysBefore ?? DEFAULTS.calendarReminderDaysBefore)) || DEFAULTS.calendarReminderDaysBefore)),
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
      // El usuario solo puede elegir el permiso general, los dos horarios
      // editables y la anticipación del calendario. Los demás avisos quedan
      // con la configuración que ya tenían y no aceptan cambios del cliente.
      pushEnabled: typeof body.pushEnabled === "boolean" ? body.pushEnabled : current.pushEnabled,
      calendarEnabled: current.calendarEnabled,
      dailyBalanceEnabled: current.dailyBalanceEnabled,
      weeklySummaryEnabled: current.weeklySummaryEnabled,
      monthlySummaryEnabled: current.monthlySummaryEnabled,
      annualSummaryEnabled: current.annualSummaryEnabled,
      calendarReminderTime: typeof body.calendarReminderTime === "string" && TIME.test(body.calendarReminderTime) ? body.calendarReminderTime : current.calendarReminderTime,
      calendarReminderDaysBefore: typeof body.calendarReminderDaysBefore === "number" && Number.isInteger(body.calendarReminderDaysBefore) && body.calendarReminderDaysBefore >= 1 && body.calendarReminderDaysBefore <= 30 ? body.calendarReminderDaysBefore : current.calendarReminderDaysBefore,
      dailyBalanceTime: typeof body.dailyBalanceTime === "string" && TIME.test(body.dailyBalanceTime) ? body.dailyBalanceTime : current.dailyBalanceTime,
      weeklySummaryTime: current.weeklySummaryTime,
      monthlySummaryTime: current.monthlySummaryTime,
      annualSummaryTime: current.annualSummaryTime,
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

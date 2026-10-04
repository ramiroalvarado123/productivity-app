import { getChatGPTUser } from "@/server/auth/session";
import { EARLY_ADOPTER_ANNOUNCEMENT_ID } from "@/features/notifications/logic/announcements";
import { profileSeenAnnouncements, usagePreferencesJsonWithSeenAnnouncements } from "@/domain/profile-metadata";
import { insertRows, selectRows, updateRows } from "@/server/db/postgrest";

type ProfileRow = Record<string, unknown> & { email: string; displayName: string; usagePreferencesJson: string };

/** Anuncios únicos y resúmenes semanales ("weekly_summary:<lunes>") que se marcan como leídos. */
const SEEN_ID = /^weekly_summary:\d{4}-\d{2}-\d{2}$/;

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);

    const body = await request.json().catch(() => null) as { announcementId?: unknown; ids?: unknown } | null;
    const requested = [
      ...(body?.announcementId === undefined ? [] : [body.announcementId]),
      ...(Array.isArray(body?.ids) ? body.ids : []),
    ];
    const ids = [...new Set(requested.filter((id): id is string => typeof id === "string"))];
    if (!ids.length || ids.length > 20 || ids.some((id) => id !== EARLY_ADOPTER_ANNOUNCEMENT_ID && !SEEN_ID.test(id))) return fail("Anuncio inválido.");

    await insertRows("profiles", { email: user.email, displayName: user.displayName }, {
      upsert: true,
      onConflict: ["email"],
      ignoreDuplicates: true,
    });
    const profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
    if (!profile) return fail("No pudimos cargar tu perfil.", 404);

    const seen = profileSeenAnnouncements(profile.usagePreferencesJson);
    if (ids.every((id) => seen.includes(id))) return Response.json({ ok: true, alreadySeen: true });

    await updateRows("profiles", { email: user.email }, {
      usagePreferencesJson: usagePreferencesJsonWithSeenAnnouncements(profile.usagePreferencesJson, ids),
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true, alreadySeen: false });
  } catch (cause) {
    console.error("announcement seen POST", cause);
    return fail("No pudimos guardar el anuncio. Intentá nuevamente.", 500);
  }
}

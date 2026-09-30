import { getChatGPTUser } from "../../../chatgpt-auth";
import { EARLY_ADOPTER_ANNOUNCEMENT_ID } from "../../../lib/early-adopter-announcement";
import { profileSeenAnnouncements, usagePreferencesJsonWithSeenAnnouncement } from "../../../lib/profile-metadata";
import { insertRows, selectRows, updateRows } from "../../../lib/supabase-db";

type ProfileRow = Record<string, unknown> & { email: string; displayName: string; usagePreferencesJson: string };

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return fail("Necesitás iniciar sesión.", 401);

    const body = await request.json().catch(() => null) as { announcementId?: unknown } | null;
    if (body?.announcementId !== EARLY_ADOPTER_ANNOUNCEMENT_ID) return fail("Anuncio inválido.");

    await insertRows("profiles", { email: user.email, displayName: user.displayName }, {
      upsert: true,
      onConflict: ["email"],
      ignoreDuplicates: true,
    });
    const profile = (await selectRows<ProfileRow>("profiles", { where: { email: user.email }, limit: 1 }))[0];
    if (!profile) return fail("No pudimos cargar tu perfil.", 404);

    const seen = profileSeenAnnouncements(profile.usagePreferencesJson);
    if (seen.includes(EARLY_ADOPTER_ANNOUNCEMENT_ID)) return Response.json({ ok: true, alreadySeen: true });

    await updateRows("profiles", { email: user.email }, {
      usagePreferencesJson: usagePreferencesJsonWithSeenAnnouncement(profile.usagePreferencesJson, EARLY_ADOPTER_ANNOUNCEMENT_ID),
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true, alreadySeen: false });
  } catch (cause) {
    console.error("announcement seen POST", cause);
    return fail("No pudimos guardar el anuncio. Intentá nuevamente.", 500);
  }
}

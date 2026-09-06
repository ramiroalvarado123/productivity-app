import { cookies } from "next/headers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ACCESS_COOKIE, SUPABASE_URL, authHeaders } from "../../lib/supabase-auth";
import { updateRows } from "../../lib/supabase-db";

const MAX_BYTES = 4 * 1024 * 1024;
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/**
 * Sube la foto de perfil al bucket `avatars` de Supabase Storage. Va por acá
 * (no directo del browser a Supabase) porque el token de la sesión vive en
 * una cookie httpOnly que sólo el servidor puede leer.
 */
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return fail("Necesitás iniciar sesión.", 401);

  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return fail("Necesitás iniciar sesión.", 401);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Elegí una imagen.");
  if (!file.type.startsWith("image/")) return fail("Tiene que ser una imagen.");
  if (file.size > MAX_BYTES) return fail("La imagen no puede pesar más de 4 MB.");

  const extension = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
  const path = `${user.email}/avatar.${extension || "jpg"}`;

  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": file.type, "x-upsert": "true" },
    body: await file.arrayBuffer(),
  });
  if (!upload.ok) {
    console.error("avatar upload", upload.status, await upload.text());
    return fail("No pudimos subir la foto.", 502);
  }

  const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?v=${Date.now()}`;
  await updateRows("profiles", { email: user.email }, { avatarUrl });
  return Response.json({ ok: true, avatarUrl });
}

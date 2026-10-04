/** Lee la respuesta de la API con mensajes claros cuando viene vacía o rota. */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (response.status === 401) throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
    if (response.status === 413) throw new Error("El archivo es demasiado pesado. Probá nuevamente con uno más chico.");
    throw new Error("El servidor no devolvió una respuesta. Recargá la página e intentá nuevamente.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("No pudimos interpretar la respuesta del servidor. Recargá la página e intentá nuevamente.");
  }
}

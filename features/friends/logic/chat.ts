/** Chat entre amigos: tipos y reglas puras (sin React ni fetch), compartidas por cliente y servidor. */

export const CHAT_MAX_LENGTH = 500;
/** Cuántos mensajes de una conversación se traen de una vez. */
export const CHAT_PAGE_SIZE = 60;

export type ChatMessage = {
  id: number;
  fromEmail: string;
  toEmail: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

/** Un texto listo para guardar, o `null` si queda vacío después de limpiarlo. */
export function cleanChatBody(value: unknown) {
  const body = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX_LENGTH);
  return body || null;
}

/** Une mensajes ya cargados con los nuevos sin repetir ninguno, en orden de envío. */
export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<number, ChatMessage>();
  for (const message of [...current, ...incoming]) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

/** Cantidad de mensajes que me mandó `friendEmail` y todavía no leí. */
export function unreadFrom(messages: ChatMessage[], friendEmail: string) {
  const friend = friendEmail.toLowerCase();
  return messages.filter((message) => message.fromEmail.toLowerCase() === friend && !message.readAt).length;
}

export function chatTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return sameDay ? time : `${date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · ${time}`;
}

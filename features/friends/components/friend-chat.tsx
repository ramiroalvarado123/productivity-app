"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FRIEND_NUDGE_MESSAGES } from "@/features/friends/constants";
import { CHAT_MAX_LENGTH, chatTime, mergeChatMessages, type ChatMessage } from "@/features/friends/logic/chat";
import { readJson } from "@/shared/api/read-json";

const OPEN_POLL_MS = 4000;
const CLOSED_POLL_MS = 30000;

type UnreadCounts = Record<string, number>;

// Todas las tarjetas piden lo mismo ("cuántos sin leer tengo"): un solo pedido en vuelo alcanza para todas.
let unreadInflight: Promise<UnreadCounts> | null = null;
function loadUnread() {
  unreadInflight ??= fetch("/api/friends/messages", { credentials: "same-origin" })
    .then((response) => response.ok ? readJson<{ unread?: UnreadCounts }>(response) : { unread: {} })
    .then((result) => result.unread ?? {})
    .catch(() => ({}) as UnreadCounts)
    .finally(() => { window.setTimeout(() => { unreadInflight = null; }, 2000); });
  return unreadInflight;
}

/**
 * Chat con un amigo dentro de la app. Los mensajes rápidos de siempre quedan arriba como
 * atajos (un toque y se mandan); abajo se puede escribir lo que quieras.
 */
export function FriendChat({ friend, open, onToggle }: { friend: { email: string; name: string }; open: boolean; onToggle: () => void }) {
  const friendEmail = friend.email.toLowerCase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const lastIdRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(() => {
    void fetch("/api/friends/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ markRead: friendEmail }),
    }).catch(() => undefined);
  }, [friendEmail]);

  const pull = useCallback(async () => {
    try {
      const response = await fetch(`/api/friends/messages?with=${encodeURIComponent(friendEmail)}&after=${lastIdRef.current}`, { credentials: "same-origin" });
      const result = await readJson<{ messages?: ChatMessage[]; needsSql?: boolean; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar los mensajes.");
      if (result.needsSql) setNotice("Para chatear falta correr supabase/friend-messages.sql en Supabase.");
      const incoming = result.messages ?? [];
      if (incoming.length) {
        lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((message) => message.id));
        setMessages((current) => mergeChatMessages(current, incoming));
        if (incoming.some((message) => message.fromEmail === friendEmail && !message.readAt)) markRead();
      }
      setLoaded(true);
    } catch (caught) {
      setLoaded(true);
      if (!lastIdRef.current) setNotice(caught instanceof Error ? caught.message : "No se pudieron cargar los mensajes.");
    }
  }, [friendEmail, markRead]);

  // Con el chat abierto se consulta seguido; cerrado, solo el contador de sin leer.
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      if (open) void pull();
      else void loadUnread().then((counts) => { if (!cancelled) setUnread(counts[friendEmail] ?? 0); });
    };
    tick();
    const timer = window.setInterval(tick, open ? OPEN_POLL_MS : CLOSED_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [open, pull, friendEmail]);

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead]);

  useEffect(() => {
    const list = listRef.current;
    if (open && list) list.scrollTop = list.scrollHeight;
  }, [open, messages.length]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/friends/messages", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ to: friendEmail, body }),
      });
      const result = await readJson<{ message?: ChatMessage | null; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el mensaje.");
      if (result.message) {
        lastIdRef.current = Math.max(lastIdRef.current, result.message.id);
        setMessages((current) => mergeChatMessages(current, [result.message as ChatMessage]));
      } else void pull();
      setDraft("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  return <div className="friend-chat">
    <button type="button" className="friend-nudge" aria-expanded={open} onClick={onToggle}>
      <span>💬 Chatear{unread > 0 && !open ? <em className="friend-chat-badge" aria-label={`${unread} sin leer`}>{unread}</em> : null}</span>
      <i>{open ? "▲" : "▼"}</i>
    </button>
    {open && <div className="friend-chat-panel">
      <div className="friend-chat-list" ref={listRef} role="log" aria-live="polite" aria-label={`Conversación con ${friend.name}`}>
        {!loaded && <p className="friend-chat-empty">Cargando…</p>}
        {loaded && !messages.length && <p className="friend-chat-empty">Todavía no hay mensajes. Mandale uno rápido o escribile lo que quieras.</p>}
        {messages.map((message) => <div key={message.id} className={"friend-chat-bubble " + (message.fromEmail === friendEmail ? "theirs" : "mine")}>
          <p>{message.body}</p>
          <small>{chatTime(message.createdAt)}</small>
        </div>)}
      </div>
      <div className="friend-chat-quick" aria-label="Mensajes rápidos">
        {FRIEND_NUDGE_MESSAGES.map((message) => <button key={message} type="button" disabled={sending} onClick={() => void send(message)}>{message}</button>)}
      </div>
      {notice && <p className="friend-chat-notice" role="alert">{notice}</p>}
      <form className="friend-chat-form" onSubmit={submit}>
        <input value={draft} maxLength={CHAT_MAX_LENGTH} onChange={(event) => setDraft(event.target.value)} placeholder={`Escribile a ${friend.name}…`} aria-label={`Mensaje para ${friend.name}`} />
        <button type="submit" disabled={sending || !draft.trim()}>{sending ? "…" : "Enviar"}</button>
      </form>
    </div>}
  </div>;
}

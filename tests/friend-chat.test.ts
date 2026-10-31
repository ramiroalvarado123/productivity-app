import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_MAX_LENGTH, cleanChatBody, mergeChatMessages, unreadFrom, type ChatMessage } from "@/features/friends/logic/chat";

const msg = (id: number, from: string, readAt: string | null = null): ChatMessage => ({ id, fromEmail: from, toEmail: "yo@x.com", body: `m${id}`, createdAt: "2026-10-31T12:00:00Z", readAt });

test("cleanChatBody limpia espacios, corta el largo y rechaza lo vacío", () => {
  assert.equal(cleanChatBody("  hola \n  mundo  "), "hola mundo");
  assert.equal(cleanChatBody("   "), null);
  assert.equal(cleanChatBody(null), null);
  assert.equal(cleanChatBody("a".repeat(CHAT_MAX_LENGTH + 50))?.length, CHAT_MAX_LENGTH);
});

test("mergeChatMessages no repite mensajes y los deja en orden", () => {
  const merged = mergeChatMessages([msg(1, "a@x.com"), msg(3, "a@x.com")], [msg(2, "b@x.com"), msg(3, "a@x.com")]);
  assert.deepEqual(merged.map((m) => m.id), [1, 2, 3]);
});

test("unreadFrom cuenta solo los no leídos de ese amigo", () => {
  const list = [msg(1, "A@x.com"), msg(2, "a@x.com", "2026-10-31T13:00:00Z"), msg(3, "b@x.com"), msg(4, "a@x.com")];
  assert.equal(unreadFrom(list, "a@x.com"), 2);
});

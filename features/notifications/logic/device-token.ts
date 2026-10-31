/** Forma válida del token de push de cada sistema (para no guardar basura que mande un cliente). */
export function validDeviceToken(platform: "ios" | "android", token: string) {
  if (platform === "ios") return /^[0-9a-fA-F]{64,200}$/.test(token);
  return token.length >= 20 && token.length <= 4096 && /^[\w:.-]+$/.test(token);
}

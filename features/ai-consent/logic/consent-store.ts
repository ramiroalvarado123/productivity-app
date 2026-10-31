import { useSyncExternalStore } from "react";

// El permiso se guarda en el dispositivo: es donde se da y donde se puede retirar.
const KEY = "avora.ai-consent.v1";
const listeners = new Set<() => void>();
let memory = false;

function read() {
  try { return window.localStorage.getItem(KEY) === "granted"; } catch { return false; }
}

function write(granted: boolean) {
  try {
    if (granted) window.localStorage.setItem(KEY, "granted");
    else window.localStorage.removeItem(KEY);
  } catch { /* sin almacenamiento (modo privado): el permiso vale solo hasta recargar */ }
  memory = granted;
  listeners.forEach((listener) => listener());
}

export function hasAiConsent() { return read() || memory; }
export function grantAiConsent() { write(true); }
export function revokeAiConsent() { write(false); }

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useAiConsent() {
  return useSyncExternalStore(subscribe, hasAiConsent, () => false);
}

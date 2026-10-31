import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * ¿Estamos dentro de la app de iOS/Android (Capacitor) y no en el navegador?
 * La app nativa carga esta misma web, así que acá se decide lo que cambia: Web Push,
 * login con Google y pago de Pro no sirven dentro del contenedor nativo.
 */
export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : "web";
}

const subscribe = () => () => {};

/** Para los componentes: el servidor siempre renderiza como web y el cliente se corrige al hidratar. */
export function useIsNative() {
  return useSyncExternalStore(subscribe, isNativeApp, () => false);
}

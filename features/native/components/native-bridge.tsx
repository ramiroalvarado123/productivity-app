"use client";

import { useEffect } from "react";
import { listenForPushTaps, refreshNativePush, unregisterOnSignOut } from "@/features/notifications/logic/native-push";
import { isNativeApp, nativePlatform } from "@/shared/platform/native";

/**
 * Ajustes que solo aplican dentro de la app de iOS/Android: marca el `<html>` para poder
 * ajustar estilos, hace que el botón "atrás" de Android navegue en vez de cerrar la app y conecta
 * los avisos push.
 * En el navegador no hace nada.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const root = document.documentElement;
    const platformClass = `is-native-${nativePlatform()}`;
    root.classList.add("is-native", platformClass);

    let removeBackListener: (() => void) | undefined;
    let cancelled = false;
    if (nativePlatform() === "android") {
      void import("@capacitor/app").then(async ({ App }) => {
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.exitApp();
        });
        if (cancelled) void handle.remove();
        else removeBackListener = () => void handle.remove();
      });
    }

    // Avisos push: renovar el token, abrir la pantalla correcta al tocar un aviso y dar de baja el celular al cerrar sesión.
    let removeTapListener: (() => void) | undefined;
    void refreshNativePush().catch(() => undefined);
    void listenForPushTaps().then((remove) => { if (cancelled) remove(); else removeTapListener = remove; }).catch(() => undefined);
    const removeSignOutHook = unregisterOnSignOut();

    return () => {
      cancelled = true;
      removeBackListener?.();
      removeTapListener?.();
      removeSignOutHook();
      root.classList.remove("is-native", platformClass);
    };
  }, []);

  return null;
}

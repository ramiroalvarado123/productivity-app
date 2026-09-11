"use client";

import { useEffect } from "react";

const SERVICE_WORKER_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const APP_VERSION_CHECK_INTERVAL_MS = 2 * 60 * 1000;

export function ServiceWorkerRegistration() {
  useEffect(() => {
    let refreshing = false;
    let registration: ServiceWorkerRegistration | null = null;
    let serviceWorkerIntervalId: number | undefined;
    let appVersionIntervalId: number | undefined;
    let currentAppVersion = "";

    const reloadOnce = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const checkAppVersion = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/app-version?check=" + Date.now(), {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const body = await response.json().catch(() => null) as { version?: unknown } | null;
        const nextVersion = typeof body?.version === "string" ? body.version : "";
        if (!nextVersion) return;
        if (!currentAppVersion) {
          currentAppVersion = nextVersion;
          return;
        }
        if (nextVersion !== currentAppVersion) reloadOnce();
      } catch {
        // Una comprobación fallida no debe interrumpir el uso de AVORA.
      }
    };

    const handleControllerChange = () => reloadOnce();
    const checkForServiceWorkerUpdate = (nextRegistration: ServiceWorkerRegistration) => {
      void nextRegistration.update().catch(() => {});
    };
    const checkCurrentServiceWorker = () => {
      if (registration) checkForServiceWorkerUpdate(registration);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void checkAppVersion();
      checkCurrentServiceWorker();
    };
    const handlePageShow = () => {
      void checkAppVersion();
      checkCurrentServiceWorker();
    };

    void checkAppVersion();
    appVersionIntervalId = window.setInterval(() => void checkAppVersion(), APP_VERSION_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handlePageShow);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((nextRegistration) => {
          registration = nextRegistration;
          checkForServiceWorkerUpdate(nextRegistration);
          serviceWorkerIntervalId = window.setInterval(
            () => checkForServiceWorkerUpdate(nextRegistration),
            SERVICE_WORKER_UPDATE_INTERVAL_MS,
          );
        })
        .catch(() => {});
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handlePageShow);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      if (serviceWorkerIntervalId !== undefined) window.clearInterval(serviceWorkerIntervalId);
      if (appVersionIntervalId !== undefined) window.clearInterval(appVersionIntervalId);
    };
  }, []);

  return null;
}

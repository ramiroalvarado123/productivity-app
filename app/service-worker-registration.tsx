"use client";

import { useEffect } from "react";

const SERVICE_WORKER_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const APP_VERSION_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  || "BFjo70YM_MZxUr28GKf0hneZBkUyvP-wP1SuyFJcpDXF8XphPUTruryDXucj0c1MlAPool4YiNLqeK8zImedOTQ";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

async function syncStandalonePush(nextRegistration: ServiceWorkerRegistration) {
  if (typeof window === "undefined" || !isStandaloneApp()) return;
  if (!("Notification" in window) || !("PushManager" in window) || Notification.permission !== "granted") return;

  const preferencesResponse = await fetch("/api/notifications/preferences", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!preferencesResponse.ok) return;
  const preferences = await preferencesResponse.json().catch(() => null) as { pushEnabled?: unknown } | null;
  if (preferences?.pushEnabled !== true) return;

  const registration = nextRegistration.active ? nextRegistration : await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
      clientContext: "app",
    }),
  });
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    let refreshing = false;
    let registration: ServiceWorkerRegistration | null = null;
    let serviceWorkerIntervalId: number | undefined;
    let appVersionIntervalId: number | undefined;
    let pushSyncing = false;
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

    const syncPushIfNeeded = () => {
      if (!registration || pushSyncing) return;
      pushSyncing = true;
      void syncStandalonePush(registration)
        .catch(() => {})
        .finally(() => { pushSyncing = false; });
    };

    const handleControllerChange = () => reloadOnce();
    const checkForServiceWorkerUpdate = (nextRegistration: ServiceWorkerRegistration) => {
      void nextRegistration.update().catch(() => {});
    };
    const checkCurrentServiceWorker = () => {
      if (registration) {
        checkForServiceWorkerUpdate(registration);
        syncPushIfNeeded();
      }
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
          syncPushIfNeeded();
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

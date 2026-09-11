"use client";

import { useEffect } from "react";

const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let intervalId: number | undefined;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const checkForUpdate = (registration: ServiceWorkerRegistration) => {
      void registration.update().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.serviceWorker.ready.then(checkForUpdate).catch(() => {});
    };
    const handlePageShow = () => {
      void navigator.serviceWorker.ready.then(checkForUpdate).catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handlePageShow);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        checkForUpdate(registration);
        intervalId = window.setInterval(() => checkForUpdate(registration), UPDATE_INTERVAL_MS);
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handlePageShow);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

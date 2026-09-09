"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => registration.update()).catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  return null;
}

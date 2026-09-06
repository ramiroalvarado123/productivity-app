"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirmando tu acceso…");

  useEffect(() => {
    let active = true;
    async function completeAccess() {
      await Promise.resolve();
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      const expires_in = Number(hashParams.get("expires_in") ?? "3600");
      const error = hashParams.get("error_description") ?? hashParams.get("error") ?? queryParams.get("error_description") ?? queryParams.get("error");
      if (error) {
        if (active) setMessage(error);
        return;
      }
      if (!access_token || !refresh_token) {
        if (active) setMessage("No pudimos completar el acceso. Volvé a intentarlo.");
        return;
      }
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ access_token, refresh_token, expires_in }),
        });
        if (!response.ok) throw new Error("No pudimos guardar la sesión.");
        window.history.replaceState({}, "", "/auth/callback");
        window.location.replace("/");
      } catch (caught) {
        if (active) setMessage(caught instanceof Error ? caught.message : "Error de acceso.");
      }
    }
    void completeAccess();
    return () => { active = false; };
  }, []);

  return <main className="lifetrack-access"><section className="lifetrack-access-body"><div className="lifetrack-access-form"><p className="step-label">AVORA</p><h2>{message}</h2></div></section></main>;
}

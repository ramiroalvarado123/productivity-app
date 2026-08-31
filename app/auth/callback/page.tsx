"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Confirmando tu acceso…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const expires_in = Number(params.get("expires_in") ?? "3600");
    const error = params.get("error_description") ?? params.get("error");
    if (error) { setMessage(error); return; }
    if (!access_token || !refresh_token) { setMessage("No pudimos completar el acceso. Volvé a intentarlo."); return; }

    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token, expires_in }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("No pudimos guardar la sesión.");
      window.history.replaceState({}, "", "/auth/callback");
      window.location.replace("/");
    }).catch((err) => setMessage(err instanceof Error ? err.message : "Error de acceso."));
  }, []);

  return <main className="lifetrack-access"><section className="lifetrack-access-body"><div className="lifetrack-access-form"><p className="step-label">AVORA</p><h2>{message}</h2></div></section></main>;
}

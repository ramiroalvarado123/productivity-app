"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Preparando recuperación…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const expires_in = Number(params.get("expires_in") ?? "3600");
    if (!access_token || !refresh_token) { setMessage("El enlace de recuperación no es válido o venció."); return; }
    fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token, refresh_token, expires_in }) })
      .then((response) => { if (!response.ok) throw new Error(); window.history.replaceState({}, "", "/auth/reset-password"); setReady(true); setMessage(""); })
      .catch(() => setMessage("El enlace de recuperación no es válido o venció."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("Guardando…");
    const response = await fetch("/api/auth/update-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "No pudimos actualizar la contraseña."); return; }
    window.location.replace("/");
  }

  return <main className="lifetrack-access"><section className="lifetrack-access-body"><div className="lifetrack-access-form"><p className="step-label">RECUPERAR ACCESO</p><h2>Nueva contraseña</h2>{message && <p>{message}</p>}{ready && <form onSubmit={submit}><label>Contraseña<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="lifetrack-email-button" type="submit">Guardar contraseña <b>→</b></button></form>}</div></section></main>;
}

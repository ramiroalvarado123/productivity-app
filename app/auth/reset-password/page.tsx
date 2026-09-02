"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Preparando recuperación…");

  useEffect(() => {
    let active = true;
    async function prepareReset() {
      await Promise.resolve();
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const expires_in = Number(params.get("expires_in") ?? "3600");
      if (!access_token || !refresh_token) {
        if (active) setMessage("El enlace de recuperación no es válido o venció.");
        return;
      }
      try {
        const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ access_token, refresh_token, expires_in }) });
        if (!response.ok) throw new Error();
        window.history.replaceState({}, "", "/auth/reset-password");
        if (active) { setReady(true); setMessage(""); }
      } catch {
        if (active) setMessage("El enlace de recuperación no es válido o venció.");
      }
    }
    void prepareReset();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("Guardando…");
    try {
      const response = await fetch("/api/auth/update-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ password }) });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) { setMessage(data.error ?? "No pudimos actualizar la contraseña."); return; }
      window.location.replace("/");
    } catch {
      setMessage("No pudimos actualizar la contraseña. Intentá nuevamente.");
    }
  }

  return <main className="lifetrack-access"><section className="lifetrack-access-body"><div className="lifetrack-access-form"><p className="step-label">RECUPERAR ACCESO</p><h2>Nueva contraseña</h2>{message && <p>{message}</p>}{ready && <form onSubmit={submit}><label>Contraseña <small>(mínimo 8 caracteres)</small><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="lifetrack-email-button" type="submit">Guardar contraseña <b>→</b></button></form>}</div></section></main>;
}

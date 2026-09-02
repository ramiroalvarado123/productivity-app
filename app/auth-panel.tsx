"use client";

import { FormEvent, useState } from "react";
import { SUPABASE_URL } from "./lib/supabase-auth";

type Mode = "login" | "signup" | "recover";

export default function AuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function google() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const endpoint = mode === "recover" ? "/api/auth/recover" : "/api/auth/password";
      const payload = mode === "recover" ? { email } : { action: mode, email, password, name };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string; needsConfirmation?: boolean } : {};
      if (!response.ok) { setMessage(data.error ?? "No pudimos completar la operación."); return; }
      if (mode === "recover") { setMessage("Te enviamos un correo para recuperar tu contraseña."); return; }
      if (data.needsConfirmation) { setMessage("Revisá tu correo y confirmá tu cuenta para entrar a AVORA."); return; }
      window.location.replace("/");
    } catch {
      setMessage("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="lifetrack-access">
    <header className="lifetrack-access-header"><div className="lifetrack-brand"><span className="brand-mark">A</span><b>AVORA</b></div><span>ACCESO SEGURO</span></header>
    <section className="lifetrack-access-body">
      <div className="lifetrack-access-story"><span className="lifetrack-ghost-number">00</span><p className="step-label">TU VIDA, CON MÁS CLARIDAD</p><h1>Todo tu progreso<br />en un solo lugar.</h1><p>Organizá tus objetivos, registrá tus hábitos y entendé qué acciones te acercan a la vida que querés construir.</p></div>
      <div className="lifetrack-access-form">
        <p className="step-label">{mode === "signup" ? "CREAR CUENTA" : mode === "recover" ? "RECUPERAR ACCESO" : "EMPECEMOS"}</p>
        <h2>{mode === "signup" ? "Creá tu cuenta." : mode === "recover" ? "Recuperá tu cuenta." : "Ingresá a AVORA."}</h2>
        {mode !== "recover" && <button className="lifetrack-google-button" type="button" onClick={google}><span>G</span>Continuar con Google <b>→</b></button>}
        {mode !== "recover" && <div className="lifetrack-auth-divider"><span>O</span></div>}
        <form onSubmit={submit} className="lifetrack-auth-options">
          {mode === "signup" && <label className="lifetrack-auth-field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required minLength={2} /></label>}
          <label className="lifetrack-auth-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required /></label>
          {mode !== "recover" && <label className="lifetrack-auth-field"><span>Contraseña <small>(mínimo 8 caracteres)</small></span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingresá tu contraseña" required minLength={8} /></label>}
          <button className="lifetrack-email-button" type="submit" disabled={busy}>{busy ? "Procesando…" : mode === "signup" ? "Crear cuenta" : mode === "recover" ? "Enviar correo" : "Iniciar sesión"} <b>→</b></button>
        </form>
        {message && <small>{message}</small>}
        <div className="lifetrack-auth-links">
          {mode === "login" && <><button type="button" onClick={() => setMode("signup")}>Crear cuenta</button><button type="button" onClick={() => setMode("recover")}>Olvidé mi contraseña</button></>}
          {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>Volver a iniciar sesión</button>}
        </div>
        <small>AVORA no almacena tu contraseña. La autenticación se procesa de forma segura con Supabase.</small>
      </div>
    </section>
  </main>;
}

"use client";

import { FormEvent, useState } from "react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { SUPABASE_URL } from "@/shared/config/supabase";

type Mode = "login" | "signup" | "recover";

export default function AuthPanel({ notice = "" }: { notice?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const isGmail = confirmationEmail.toLowerCase().endsWith("@gmail.com");

  function google() {
    const redirectTo = window.location.origin + "/auth/callback";
    window.location.href = SUPABASE_URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(redirectTo);
  }

  function resetConfirmation() {
    setConfirmationEmail("");
    setMessage("");
    setPassword("");
    setMode("signup");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const endpoint = mode === "recover" ? "/api/auth/recover" : "/api/auth/password";
      const payload = mode === "recover" ? { email } : { action: mode, email, password, name };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { error?: string; needsConfirmation?: boolean } : {};

      if (!response.ok) {
        setMessage(data.error ?? "No pudimos completar la operación.");
        return;
      }

      if (mode === "recover") {
        setMessage("Te enviamos un correo para recuperar tu contraseña.");
        return;
      }

      if (data.needsConfirmation) {
        setConfirmationEmail(email.trim());
        return;
      }

      window.location.replace("/");
    } catch {
      setMessage("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lifetrack-access">
      <header className="lifetrack-access-header">
        <div className="lifetrack-brand">
          <span className="brand-mark"><BrandMark /></span>
          <b>AVORA</b>
        </div>
        <span>{confirmationEmail ? "CONFIRMÁ TU CUENTA" : "ACCESO SEGURO"}</span>
      </header>

      {confirmationEmail ? (
        <section className="lifetrack-confirmation-shell" role="status" aria-live="polite">
          <div className="lifetrack-confirmation-card">
            <span className="lifetrack-confirmation-icon" aria-hidden="true">✉</span>
            <p className="step-label">CUENTA CREADA</p>
            <h1>Revisá tu correo.</h1>
            <p className="lifetrack-confirmation-copy">
              Te enviamos un enlace para activar tu cuenta. Abrilo para continuar con tu nombre,
              elegir tus prioridades y entrar a AVORA.
            </p>

            <div className="lifetrack-confirmation-email">
              <span aria-hidden="true">→</span>
              <div>
                <small>ENVIADO A</small>
                <strong>{confirmationEmail}</strong>
              </div>
            </div>

            <ol className="lifetrack-confirmation-steps">
              <li><span>1</span><p><b>Abrí tu correo</b><small>Buscá el mensaje de confirmación de AVORA.</small></p></li>
              <li><span>2</span><p><b>Confirmá tu cuenta</b><small>Presioná el enlace que aparece en el mensaje.</small></p></li>
              <li><span>3</span><p><b>Volvé a AVORA</b><small>La aplicación te llevará al paso de tu nombre y prioridades.</small></p></li>
            </ol>

            <div className="lifetrack-confirmation-actions">
              {isGmail && (
                <a
                  className="lifetrack-confirmation-primary"
                  href="https://mail.google.com/mail/u/0/#inbox"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir Gmail <b>→</b>
                </a>
              )}
              <button
                className="lifetrack-confirmation-secondary"
                type="button"
                onClick={() => {
                  setConfirmationEmail("");
                  setMessage("");
                  setMode("login");
                }}
              >
                Ya confirmé: iniciar sesión
              </button>
              <button className="lifetrack-confirmation-link" type="button" onClick={resetConfirmation}>
                Usar otro correo
              </button>
            </div>

            <p className="lifetrack-confirmation-note">
              ¿No lo encontrás? Revisá las carpetas Spam, Promociones o Correo no deseado.
            </p>
          </div>
        </section>
      ) : (
        <section className="lifetrack-access-body">
          <div className="lifetrack-access-story">
            <span className="lifetrack-ghost-number">00</span>
            <p className="step-label">TU VIDA, CON MÁS CLARIDAD</p>
            <h1>Todo tu progreso<br />en un solo lugar.</h1>
            <p>Organizá tus objetivos, registrá tus hábitos y entendé qué acciones te acercan a la vida que querés construir.</p>
          </div>

          <div className="lifetrack-access-form">
            {notice && <p className="lifetrack-access-notice">{notice}</p>}
            <p className="step-label">{mode === "signup" ? "CREAR CUENTA" : mode === "recover" ? "RECUPERAR ACCESO" : "EMPECEMOS"}</p>
            <h2>{mode === "signup" ? "Creá tu cuenta." : mode === "recover" ? "Recuperá tu cuenta." : "Ingresá a AVORA."}</h2>
            {mode !== "recover" && <button className="lifetrack-google-button" type="button" onClick={google}><span>G</span>Continuar con Google <b>→</b></button>}
            {mode !== "recover" && <div className="lifetrack-auth-divider"><span>O</span></div>}
            <form onSubmit={submit} className="lifetrack-auth-options">
              {mode === "signup" && <label className="lifetrack-auth-field"><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" required minLength={2} /></label>}
              <label className="lifetrack-auth-field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required /></label>
              {mode !== "recover" && <label className="lifetrack-auth-field"><span>Contraseña {mode === "signup" && <small>(mínimo 8 caracteres)</small>}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresá tu contraseña" required minLength={mode === "signup" ? 8 : undefined} /></label>}
              <button className={"lifetrack-email-button" + (mode === "login" ? " is-primary" : "")} type="submit" disabled={busy}>{busy ? "Procesando…" : mode === "signup" ? "Crear cuenta" : mode === "recover" ? "Enviar correo" : "Iniciar sesión"} <b>→</b></button>
            </form>
            {message && <small>{message}</small>}
            <div className="lifetrack-auth-links">
              {mode === "login" && <><button type="button" onClick={() => setMode("signup")}>Crear cuenta</button><button type="button" onClick={() => setMode("recover")}>Olvidé mi contraseña</button></>}
              {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>Volver a iniciar sesión</button>}
            </div>
            <small>AVORA no almacena tu contraseña. La autenticación se procesa de forma segura con Supabase.</small>
          </div>
        </section>
      )}
    </main>
  );
}

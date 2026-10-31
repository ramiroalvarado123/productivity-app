"use client";

import { useState } from "react";
import { grantAiConsent, revokeAiConsent, useAiConsent } from "@/features/ai-consent/logic/consent-store";

/** Privacidad y cuenta dentro de Configuración: textos legales, permiso de IA y eliminar la cuenta. */
export function AccountPrivacySettings() {
  const aiConsent = useAiConsent();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos eliminar tu cuenta.");
      revokeAiConsent();
      window.location.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos eliminar tu cuenta.");
      setBusy(false);
    }
  }

  return <>
    <p>PRIVACIDAD Y CUENTA</p>
    <button type="button" onClick={() => window.location.assign("/privacidad")}><span aria-hidden="true">⌂</span><div><b>Política de privacidad</b><small>Qué datos usamos y para qué</small></div><i aria-hidden="true">›</i></button>
    <button type="button" onClick={() => window.location.assign("/terminos")}><span aria-hidden="true">§</span><div><b>Términos de uso</b><small>Las reglas para usar AVORA</small></div><i aria-hidden="true">›</i></button>
    <button type="button" onClick={() => window.location.assign("/soporte")}><span aria-hidden="true">?</span><div><b>Ayuda y soporte</b><small>Preguntas frecuentes y contacto</small></div><i aria-hidden="true">›</i></button>
    <button type="button" onClick={() => (aiConsent ? revokeAiConsent() : grantAiConsent())}>
      <span aria-hidden="true">✦</span>
      <div><b>Permiso de IA</b><small>{aiConsent ? "Activado: tocá para retirarlo" : "Desactivado: se te va a pedir al usar una función con IA"}</small></div>
      <i aria-hidden="true">{aiConsent ? "✓" : "›"}</i>
    </button>
    {confirming
      ? <div className="account-delete-confirm" role="alertdialog" aria-labelledby="account-delete-title">
        <b id="account-delete-title">¿Eliminar tu cuenta?</b>
        <p>Se borran para siempre tu perfil, tus registros, tus mensajes, tus amistades y tu foto. No se puede deshacer.</p>
        <p>Si tenés una suscripción Pro, borrar la cuenta no la cancela: cancelala desde los ajustes de tu cuenta de Apple o de Google para que no se siga cobrando.</p>
        {error && <p className="account-delete-error" role="alert">{error}</p>}
        <div>
          <button type="button" className="account-delete-cancel" disabled={busy} onClick={() => { setConfirming(false); setError(""); }}>Cancelar</button>
          <button type="button" className="account-delete-danger" disabled={busy} onClick={() => void deleteAccount()}>{busy ? "Eliminando…" : "Sí, eliminar todo"}</button>
        </div>
      </div>
      : <button type="button" className="account-delete-trigger" onClick={() => setConfirming(true)}><span aria-hidden="true">×</span><div><b>Eliminar mi cuenta</b><small>Borra tu cuenta y todos tus datos</small></div><i aria-hidden="true">›</i></button>}
  </>;
}

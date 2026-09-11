"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type NotificationPreferences = {
  pushEnabled: boolean;
  calendarEnabled: boolean;
  dailyBalanceEnabled: boolean;
  weeklySummaryEnabled: boolean;
  monthlySummaryEnabled: boolean;
  annualSummaryEnabled: boolean;
  calendarReminderTime: string;
  calendarReminderDaysBefore: number;
  dailyBalanceTime: string;
  weeklySummaryTime: string;
  monthlySummaryTime: string;
  annualSummaryTime: string;
  timezone: string;
};

const DEFAULTS: NotificationPreferences = {
  pushEnabled: false,
  calendarEnabled: true,
  dailyBalanceEnabled: true,
  weeklySummaryEnabled: true,
  monthlySummaryEnabled: true,
  annualSummaryEnabled: true,
  calendarReminderTime: "18:00",
  calendarReminderDaysBefore: 1,
  dailyBalanceTime: "21:00",
  weeklySummaryTime: "20:00",
  monthlySummaryTime: "20:00",
  annualSummaryTime: "20:00",
  timezone: "America/Argentina/Buenos_Aires",
};

// La clave pública no es secreta: identifica al servidor que enviará los avisos.
// La clave privada se guarda únicamente en Vercel y nunca llega al navegador.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  || "BFjo70YM_MZxUr28GKf0hneZBkUyvP-wP1SuyFJcpDXF8XphPUTruryDXucj0c1MlAPool4YiNLqeK8zImedOTQ";

function failMessage(value: unknown, fallback: string) {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : fallback;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function responseJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function NotificationSettings({ isPro, compact = false }: { isPro: boolean; compact?: boolean }) {
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
    fetch("/api/notifications/preferences", { cache: "no-store" })
      .then(async (response) => {
        const body = await responseJson(response);
        if (!response.ok) throw new Error(failMessage(body, "No pudimos cargar las preferencias."));
        if (!cancelled) setPreferences((current) => ({ ...current, ...body }));
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "No pudimos cargar las preferencias."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const browserLabel = useMemo(() => {
    if (permission === "granted") return "Permiso concedido en este dispositivo";
    if (permission === "denied") return "Bloqueadas desde el navegador";
    if (permission === "unsupported") return "Este navegador no admite notificaciones push";
    return "Todavía no están activadas en este dispositivo";
  }, [permission]);

  async function save(next: NotificationPreferences) {
    const response = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || next.timezone }),
    });
    const body = await responseJson(response);
    if (!response.ok) throw new Error(failMessage(body, "No pudimos guardar las preferencias."));
    setPreferences((current) => ({ ...current, ...body }));
  }

  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      await save(preferences);
      setNotice("Preferencias guardadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar las preferencias.");
    } finally { setSaving(false); }
  }

  async function enablePush() {
    setError(""); setNotice("");
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPermission("unsupported");
      setError("Este navegador no admite notificaciones push.");
      return;
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isIos && !isStandalone) {
      setError("En iPhone primero agregá AVORA a la pantalla de inicio y abrila desde ese ícono.");
      return;
    }

    setSaving(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setError(nextPermission === "denied" ? "Las notificaciones están bloqueadas en el navegador." : "No se concedió el permiso.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      // Al volver a activar, renovamos la suscripción para recuperar dispositivos
      // que quedaron asociados a una clave VAPID anterior o a un endpoint inválido.
      if (existing) await existing.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
      });
      const body = await responseJson(response);
      if (!response.ok) throw new Error(failMessage(body, "No pudimos registrar este dispositivo."));
      // El endpoint ya guarda push_enabled junto con la suscripción.
      setPreferences((current) => ({ ...current, pushEnabled: true }));
      setNotice("Notificaciones activadas en este dispositivo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos activar las notificaciones.");
    } finally {
      setSaving(false);
    }
  }

  async function disablePush() {
    setError(""); setNotice("");
    setSaving(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      await save({ ...preferences, pushEnabled: false });
      setNotice("Notificaciones desactivadas en este dispositivo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos desactivar las notificaciones.");
    } finally { setSaving(false); }
  }

  if (compact) {
    if (loading || preferences.pushEnabled) return null;
    return <div className="notification-activation-banner" role="status">
      <div><span className="notification-activation-icon" aria-hidden="true">♧</span><p><b>Activá las notificaciones</b><small>Recibí avisos de tus actividades y el cierre del día.</small></p></div>
      <button type="button" className="notification-action" onClick={() => void enablePush()} disabled={saving} aria-busy={saving}>{saving ? "Activando…" : "Activar ahora"}</button>
      {error && <small className="notification-activation-error">{error}</small>}
    </div>;
  }
  if (loading) return <div className="settings-subpanel"><p className="settings-copy">Cargando preferencias…</p></div>;

  return <form className="settings-subpanel notification-settings-panel" onSubmit={saveForm}>
    <p className="settings-copy">Elegí avisos puntuales, sin llenar tu celular de notificaciones.</p>

    <div className="notification-permission-card">
      <div>
        <b>{preferences.pushEnabled ? "Notificaciones activadas" : "Notificaciones desactivadas"}</b>
        <small>{browserLabel}</small>
      </div>
      {preferences.pushEnabled
        ? <button type="button" className="notification-action secondary" onClick={() => void disablePush()} disabled={saving}>Desactivar</button>
        : <button type="button" className="notification-action" onClick={() => void enablePush()} disabled={saving} aria-busy={saving}>{saving ? "Activando…" : "Activar"}</button>}
    </div>

    <p className="notification-section-label">AVISOS</p>
    <div className="settings-disabled-row"><span><b>Actividades del calendario</b><small>Se envía según el horario y la anticipación que elijas.</small></span><i>{preferences.calendarEnabled ? "Activado" : "Desactivado"}</i></div>
    <div className="settings-disabled-row"><span><b>Balance diario</b><small>{isPro ? "Recordatorio para grabar el balance en menos de un minuto." : "Recordatorio para hacer el balance de tu día."}</small></span><i>{preferences.dailyBalanceEnabled ? "Activado" : "Desactivado"}</i></div>
    <div className="settings-disabled-row"><span><b>Resumen semanal</b><small>Todos los domingos.</small></span><i>{preferences.weeklySummaryEnabled ? "Activado" : "Desactivado"}</i></div>
    <div className="settings-disabled-row"><span><b>Resumen mensual</b><small>El último día de cada mes.</small></span><i>{preferences.monthlySummaryEnabled ? "Activado" : "Desactivado"}</i></div>
    <div className="settings-disabled-row"><span><b>Resumen anual</b><small>El 31 de diciembre.</small></span><i>{preferences.annualSummaryEnabled ? "Activado" : "Desactivado"}</i></div>

    <p className="notification-section-label">HORARIOS EDITABLES</p>
    <div className="notification-time-grid">
      <label>Calendario<input type="time" value={preferences.calendarReminderTime} onChange={(event) => setPreferences((current) => ({ ...current, calendarReminderTime: event.target.value }))} /></label>
      <label>Días antes<input type="number" min={1} max={30} inputMode="numeric" value={preferences.calendarReminderDaysBefore} onChange={(event) => setPreferences((current) => ({ ...current, calendarReminderDaysBefore: Math.max(1, Math.min(30, event.target.valueAsNumber || 1)) }))} /></label>
      <label>Balance diario<input type="time" value={preferences.dailyBalanceTime} onChange={(event) => setPreferences((current) => ({ ...current, dailyBalanceTime: event.target.value }))} /></label>
    </div>

    <p className="notification-section-label">HORARIOS FIJOS</p>
    <div className="settings-disabled-row"><span><b>Resumen semanal</b><small>Todos los domingos.</small></span><i>{preferences.weeklySummaryTime}</i></div>
    <div className="settings-disabled-row"><span><b>Resumen mensual</b><small>Último día del mes.</small></span><i>{preferences.monthlySummaryTime}</i></div>
    <div className="settings-disabled-row"><span><b>Resumen anual</b><small>31 de diciembre.</small></span><i>{preferences.annualSummaryTime}</i></div>

    {notice && <div className="success-banner">{notice}</div>}
    {error && <div className="error-banner">{error}<button type="button" onClick={() => setError("")}>Cerrar</button></div>}
    <button type="submit" className="checkout-pay settings-save" disabled={saving}>{saving ? "Guardando…" : "Guardar preferencias"}</button>
    <small className="field-note">Los horarios se interpretan en la zona horaria de tu dispositivo.</small>
  </form>;
}

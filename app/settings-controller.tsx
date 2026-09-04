"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SettingsPanel = "account" | "notifications" | "preferences" | "feedback";
type FeedbackType = "positive" | "idea" | "bug" | "dislike";
type HomeSection = "summary" | "physical" | "focus" | "sleep" | "plan" | "stats" | "friends";

type AccountSettings = {
  displayName: string;
  email: string;
  weeklySummary: boolean;
};

type LocalPreferences = {
  homeSection: HomeSection;
  reduceMotion: boolean;
};

const DEFAULT_ACCOUNT: AccountSettings = { displayName: "", email: "", weeklySummary: false };
const DEFAULT_PREFERENCES: LocalPreferences = { homeSection: "summary", reduceMotion: false };
const HOME_OPTIONS: Array<[HomeSection, string]> = [
  ["summary", "Inicio"],
  ["physical", "Físico"],
  ["focus", "Foco"],
  ["sleep", "Sueño"],
  ["plan", "Plan"],
  ["stats", "Estadísticas"],
  ["friends", "Amigos"],
];
const FEEDBACK_TYPES: Array<[FeedbackType, string, string, string]> = [
  ["positive", "♡", "Me gustó algo", "Algo que querés que mantengamos."],
  ["idea", "✦", "Tengo una sugerencia", "Una idea, función o cambio que sumarías."],
  ["bug", "!", "Encontré un problema", "Algo no funciona como debería."],
  ["dislike", "−", "Hay algo que no me gusta", "Funciona, pero lo cambiarías."],
];
const FEEDBACK_SECTIONS = ["Inicio", "Daily Score", "Físico", "Foco", "Sueño", "Plan", "Estadísticas", "Amigos", "Cuenta / configuración", "Otra"];

function loadLocalPreferences(): LocalPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem("avora_preferences") ?? "{}") as Partial<LocalPreferences>;
    return {
      homeSection: HOME_OPTIONS.some(([value]) => value === parsed.homeSection) ? parsed.homeSection as HomeSection : "summary",
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function sectionButton(section: HomeSection) {
  const label = HOME_OPTIONS.find(([value]) => value === section)?.[1];
  if (!label) return null;
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".sidebar .nav-item")).find((button) => button.textContent?.trim() === label) ?? null;
}

export default function SettingsController() {
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [preferences, setPreferences] = useState<LocalPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [feedbackSection, setFeedbackSection] = useState("Inicio");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const applyPreferences = useCallback((next: LocalPreferences, navigate = false) => {
    document.documentElement.dataset.avoraReduceMotion = next.reduceMotion ? "true" : "false";
    if (navigate && next.homeSection !== "summary") {
      window.setTimeout(() => sectionButton(next.homeSection)?.click(), 80);
    }
  }, []);

  useEffect(() => {
    const stored = loadLocalPreferences();
    setPreferences(stored);
    applyPreferences(stored, true);
  }, [applyPreferences]);

  const loadAccount = useCallback(async () => {
    if (loaded) return;
    try {
      const response = await fetch("/api/settings", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const result = await response.json() as AccountSettings;
      setAccount(result);
      setLoaded(true);
    } catch {
      // El menú puede existir en pantallas públicas: no mostramos un error ahí.
    }
  }, [loaded]);

  const openPanel = useCallback((next: SettingsPanel) => {
    setPanel(next);
    setNotice("");
    setFeedbackSent(false);
    void loadAccount();
    window.setTimeout(() => document.querySelector<HTMLButtonElement>(".profile-chip-button")?.click(), 0);
  }, [loadAccount]);

  useEffect(() => {
    const inject = () => {
      const menu = document.querySelector<HTMLElement>(".profile-menu-panel");
      if (!menu || menu.querySelector("[data-avora-settings-links]")) return;
      const heading = menu.querySelector("p");
      if (heading) heading.textContent = "CONFIGURACIÓN";
      const group = document.createElement("div");
      group.dataset.avoraSettingsLinks = "true";
      group.className = "avora-settings-links";
      const entries: Array<[SettingsPanel, string, string]> = [
        ["account", "○", "Cuenta"],
        ["notifications", "◌", "Notificaciones"],
        ["preferences", "⌘", "Preferencias"],
        ["feedback", "♡", "Ayudanos a mejorar AVORA"],
      ];
      for (const [key, icon, label] of entries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "avora-settings-menu-item";
        button.innerHTML = `<span aria-hidden="true">${icon}</span><b>${label}</b><i aria-hidden="true">›</i>`;
        button.addEventListener("click", () => openPanel(key));
        group.appendChild(button);
      }
      const signout = menu.querySelector(".profile-menu-signout");
      menu.insertBefore(group, signout ?? null);
    };
    inject();
    const observer = new MutationObserver(inject);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [openPanel]);

  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel]);

  async function saveAccountSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: account.displayName, weeklySummary: account.weeklySummary }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos guardar los cambios.");
      setNotice("Cambios guardados.");
      const visibleName = account.displayName.trim().split(" ")[0];
      const profileName = document.querySelector<HTMLElement>(".profile-chip-button b");
      if (profileName && visibleName) profileName.textContent = visibleName;
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No pudimos guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("avora_preferences", JSON.stringify(preferences));
    applyPreferences(preferences, false);
    setNotice("Preferencias guardadas en este dispositivo.");
  }

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackMessage.trim().length < 3) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: feedbackType,
          section: feedbackSection,
          message: feedbackMessage.trim(),
          pagePath: window.location.pathname,
          userAgent: navigator.userAgent,
          appVersion: "beta",
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "No pudimos enviar el comentario.");
      setFeedbackSent(true);
      setFeedbackMessage("");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "No pudimos enviar el comentario.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    {panel && <div className="settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="Configuración de AVORA">
        <header className="settings-dialog-head">
          <div><p>CONFIGURACIÓN</p><h2>{panel === "account" ? "Cuenta" : panel === "notifications" ? "Notificaciones" : panel === "preferences" ? "Preferencias" : "Ayudanos a mejorar AVORA"}</h2></div>
          <button type="button" onClick={() => setPanel(null)} aria-label="Cerrar">×</button>
        </header>

        {panel === "account" && <form className="settings-form" onSubmit={saveAccountSettings}>
          <div className="settings-copy"><b>Tu cuenta</b><span>Estos datos identifican tu experiencia dentro de AVORA.</span></div>
          <label>Nombre visible<input value={account.displayName} onChange={(event) => setAccount({ ...account, displayName: event.target.value })} maxLength={60} placeholder="Tu nombre" /></label>
          <label>Email<input value={account.email} readOnly aria-readonly="true" /></label>
          <small className="settings-help">El email pertenece a tu inicio de sesión y no se cambia desde acá.</small>
          <button className="settings-primary" disabled={saving || account.displayName.trim().length < 2}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </form>}

        {panel === "notifications" && <form className="settings-form" onSubmit={saveAccountSettings}>
          <div className="settings-copy"><b>Qué querés recibir</b><span>Elegí qué comunicaciones querés tener asociadas a tu cuenta.</span></div>
          <label className="settings-toggle"><input type="checkbox" checked={account.weeklySummary} onChange={(event) => setAccount({ ...account, weeklySummary: event.target.checked })} /><span><b>Resumen semanal</b><small>Guardamos tu preferencia para recibir un resumen de tu progreso.</small></span></label>
          <div className="settings-disabled-row"><span><b>Recordatorios push</b><small>Avisos en el celular para tareas y cierres del día.</small></span><i>Próximamente</i></div>
          <button className="settings-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar notificaciones"}</button>
          <small className="settings-help">La preferencia del resumen queda guardada. El envío automático de emails se conectará cuando definamos el proveedor de notificaciones.</small>
        </form>}

        {panel === "preferences" && <form className="settings-form" onSubmit={savePreferences}>
          <div className="settings-copy"><b>Cómo querés usar AVORA</b><span>Estas preferencias son propias de este dispositivo.</span></div>
          <label>Pantalla al abrir AVORA<select value={preferences.homeSection} onChange={(event) => setPreferences({ ...preferences, homeSection: event.target.value as HomeSection })}>{HOME_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="settings-toggle"><input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => setPreferences({ ...preferences, reduceMotion: event.target.checked })} /><span><b>Reducir animaciones</b><small>Hace los cambios de pantalla y transiciones más directos.</small></span></label>
          <button className="settings-primary">Guardar preferencias</button>
        </form>}

        {panel === "feedback" && <form className="settings-form feedback-form" onSubmit={sendFeedback}>
          {feedbackSent ? <div className="feedback-success"><span>✓</span><h3>Gracias por ayudarnos a mejorar AVORA.</h3><p>Tu comentario quedó guardado y podremos revisarlo junto con el resto del feedback de la beta.</p><button type="button" onClick={() => setFeedbackSent(false)}>Enviar otro comentario</button></div> : <>
            <div className="settings-copy"><b>Contanos lo que viste</b><span>Puede ser algo que te gustó, una idea, algo que cambiarías o un error.</span></div>
            <div className="feedback-types">{FEEDBACK_TYPES.map(([value, icon, title, copy]) => <button type="button" key={value} className={feedbackType === value ? "active" : ""} onClick={() => setFeedbackType(value)}><span>{icon}</span><p><b>{title}</b><small>{copy}</small></p><i>{feedbackType === value ? "✓" : ""}</i></button>)}</div>
            <label>¿En qué parte de AVORA?<select value={feedbackSection} onChange={(event) => setFeedbackSection(event.target.value)}>{FEEDBACK_SECTIONS.map((section) => <option key={section}>{section}</option>)}</select></label>
            <label>Contanos un poco más<textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} maxLength={2000} required placeholder={feedbackType === "bug" ? "Ej. Cuando selecciono cuatro prioridades, solo aparecen tres…" : "Escribí tu comentario…"} /></label>
            <div className="feedback-meta"><span>Se adjuntan automáticamente la pantalla, el navegador y la versión de AVORA para ayudarnos a entender el contexto.</span><b>{feedbackMessage.length}/2000</b></div>
            <button className="settings-primary" disabled={saving || feedbackMessage.trim().length < 3}>{saving ? "Enviando…" : "Enviar comentario"}</button>
          </>}
        </form>}

        {notice && <div className={"settings-notice " + (notice === "Cambios guardados." || notice.startsWith("Preferencias guardadas") ? "success" : "")}>{notice}</div>}
      </section>
    </div>}

    <style jsx global>{`
      .avora-settings-links { display: grid; gap: 2px; margin: 4px 0 8px; }
      .avora-settings-menu-item { appearance: none; border: 0; background: transparent; width: 100%; min-height: 42px; display: grid; grid-template-columns: 24px 1fr 16px; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 10px; color: inherit; font: inherit; text-align: left; cursor: pointer; }
      .avora-settings-menu-item:hover { background: rgba(20, 71, 53, .07); }
      .avora-settings-menu-item > span { font-size: 17px; opacity: .75; text-align: center; }
      .avora-settings-menu-item > b { font-size: 13px; font-weight: 650; }
      .avora-settings-menu-item > i { font-style: normal; opacity: .45; font-size: 18px; }
      .settings-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(10, 30, 23, .38); backdrop-filter: blur(5px); display: grid; place-items: center; padding: 24px; }
      .settings-dialog { width: min(620px, 100%); max-height: min(780px, calc(100dvh - 48px)); overflow: auto; background: #f8faf7; border: 1px solid rgba(22, 71, 53, .12); border-radius: 24px; box-shadow: 0 28px 80px rgba(7, 30, 21, .22); color: #17382d; }
      .settings-dialog-head { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start; padding: 26px 28px 20px; background: rgba(248, 250, 247, .96); border-bottom: 1px solid rgba(22, 71, 53, .08); backdrop-filter: blur(12px); }
      .settings-dialog-head p, .settings-copy b { margin: 0; color: #598073; font-size: 11px; letter-spacing: .13em; font-weight: 750; }
      .settings-dialog-head h2 { margin: 3px 0 0; font-family: var(--font-newsreader), serif; font-size: 34px; line-height: 1; font-weight: 520; }
      .settings-dialog-head > button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(22, 71, 53, .12); background: #fff; color: #234b3e; font-size: 24px; cursor: pointer; }
      .settings-form { display: grid; gap: 18px; padding: 24px 28px 30px; }
      .settings-copy { display: grid; gap: 5px; }
      .settings-copy b { color: #365f51; }
      .settings-copy span { color: #63796f; font-size: 14px; line-height: 1.45; }
      .settings-form > label:not(.settings-toggle) { display: grid; gap: 7px; font-size: 12px; font-weight: 700; color: #3d5a50; }
      .settings-form input:not([type="checkbox"]), .settings-form select, .settings-form textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(22, 71, 53, .15); background: #fff; color: #17382d; border-radius: 12px; padding: 12px 13px; font: inherit; font-size: 14px; outline: none; }
      .settings-form input:focus, .settings-form select:focus, .settings-form textarea:focus { border-color: rgba(22, 71, 53, .5); box-shadow: 0 0 0 3px rgba(22, 71, 53, .07); }
      .settings-form input[readonly] { background: #eef2ef; color: #718079; }
      .settings-form textarea { min-height: 138px; resize: vertical; line-height: 1.45; }
      .settings-primary { border: 0; border-radius: 13px; padding: 13px 16px; background: #164735; color: white; font: inherit; font-size: 13px; font-weight: 750; cursor: pointer; }
      .settings-primary:disabled { opacity: .55; cursor: default; }
      .settings-help { color: #718079; font-size: 11px; line-height: 1.45; margin-top: -9px; }
      .settings-toggle, .settings-disabled-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 15px 16px; background: #fff; border: 1px solid rgba(22, 71, 53, .11); border-radius: 14px; }
      .settings-toggle > span, .settings-disabled-row > span { display: grid; gap: 3px; flex: 1; }
      .settings-toggle b, .settings-disabled-row b { font-size: 13px; }
      .settings-toggle small, .settings-disabled-row small { color: #718079; font-size: 11px; line-height: 1.4; }
      .settings-toggle input { width: 42px; height: 23px; accent-color: #164735; }
      .settings-disabled-row { opacity: .62; }
      .settings-disabled-row > i { font-style: normal; white-space: nowrap; font-size: 10px; font-weight: 750; color: #547466; background: #e8efeb; padding: 5px 8px; border-radius: 999px; }
      .feedback-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
      .feedback-types > button { min-height: 86px; border: 1px solid rgba(22, 71, 53, .11); background: #fff; color: #17382d; border-radius: 14px; padding: 12px; display: grid; grid-template-columns: 28px 1fr 18px; gap: 9px; align-items: start; text-align: left; cursor: pointer; }
      .feedback-types > button.active { border-color: #3e7e68; background: #eef6f1; box-shadow: inset 0 0 0 1px rgba(62, 126, 104, .2); }
      .feedback-types > button > span { width: 28px; height: 28px; border-radius: 8px; background: #edf2ef; display: grid; place-items: center; font-size: 15px; }
      .feedback-types > button p { display: grid; gap: 3px; margin: 0; }
      .feedback-types > button p b { font-size: 12px; }
      .feedback-types > button p small { color: #708078; font-size: 10px; line-height: 1.35; }
      .feedback-types > button > i { font-style: normal; color: #2f725a; font-size: 13px; }
      .feedback-meta { display: flex; justify-content: space-between; gap: 16px; color: #718079; font-size: 10px; line-height: 1.4; margin-top: -10px; }
      .feedback-meta b { white-space: nowrap; color: #5c7369; }
      .feedback-success { min-height: 300px; display: grid; place-items: center; align-content: center; gap: 10px; text-align: center; padding: 20px; }
      .feedback-success > span { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 50%; background: #dcefe5; color: #226448; font-size: 25px; }
      .feedback-success h3 { margin: 4px 0 0; font-family: var(--font-newsreader), serif; font-size: 26px; font-weight: 520; }
      .feedback-success p { margin: 0; max-width: 420px; color: #677b72; font-size: 13px; line-height: 1.5; }
      .feedback-success button { margin-top: 10px; border: 0; background: transparent; color: #285f4d; font-weight: 750; cursor: pointer; }
      .settings-notice { margin: 0 28px 26px; padding: 11px 13px; border-radius: 10px; background: #f8e9e7; color: #8b3f37; font-size: 12px; }
      .settings-notice.success { background: #e4f2e9; color: #246143; }
      html[data-avora-reduce-motion="true"] *, html[data-avora-reduce-motion="true"] *::before, html[data-avora-reduce-motion="true"] *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
      @media (max-width: 700px) {
        .settings-overlay { padding: 0; place-items: end center; background: rgba(10, 30, 23, .3); }
        .settings-dialog { width: 100%; max-height: 92dvh; border-radius: 22px 22px 0 0; border-bottom: 0; }
        .settings-dialog-head { padding: 20px 20px 16px; }
        .settings-dialog-head h2 { font-size: 30px; }
        .settings-form { padding: 20px 20px calc(28px + env(safe-area-inset-bottom)); gap: 15px; }
        .feedback-types { grid-template-columns: 1fr; }
        .feedback-types > button { min-height: 72px; }
        .settings-notice { margin: 0 20px 22px; }
      }
    `}</style>
  </>;
}

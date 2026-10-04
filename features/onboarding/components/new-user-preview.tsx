"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/shared/ui/brand-mark";

type PreviewStep = "access" | "profile" | "priorities" | "complete";

const priorityOptions = [
  ["training", "↗", "Entrenamiento", "Mejorar constancia y rendimiento"],
  ["focus", "⌁", "Estudio / Trabajo", "Avanzar con foco y organización"],
  ["nutrition", "◇", "Alimentación", "Comer de acuerdo con mis objetivos"],
  ["reading", "▱", "Lectura", "Leer y recordar más"],
  ["sleep", "☾", "Sueño", "Descansar mejor y con regularidad"],
  ["goals", "◎", "Objetivos", "Cumplir metas concretas"],
] as const;

export default function NewUserPreview() {
  const [step, setStep] = useState<PreviewStep>("access");
  const [name, setName] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [weeklySummary, setWeeklySummary] = useState(false);

  const togglePriority = (priority: string) => {
    setPriorities((current) => current.includes(priority)
      ? current.filter((item) => item !== priority)
      : current.length < 3 ? [...current, priority] : current);
  };

  if (step === "access") {
    return <main className="lifetrack-access preview-user-flow">
      <header className="lifetrack-access-header">
        <div className="lifetrack-brand"><span className="brand-mark"><BrandMark /></span><b>AVORA</b></div>
        <span>VISTA DE USUARIO NUEVO</span>
      </header>
      <section className="lifetrack-access-body">
        <div className="lifetrack-access-story">
          <span className="lifetrack-ghost-number">00</span>
          <p className="step-label">TU VIDA, CON MÁS CLARIDAD</p>
          <h1>Todo tu progreso<br />en un solo lugar.</h1>
          <p>Organizá tus objetivos, registrá tus hábitos y entendé qué acciones te acercan a la vida que querés construir.</p>
        </div>
        <div className="lifetrack-access-form">
          <p className="step-label">EMPECEMOS</p>
          <h2>Ingresá a AVORA.</h2>
          <p>Accedé o creá tu cuenta. Tus registros quedan separados y protegidos para cada usuario.</p>
          <div className="lifetrack-auth-options">
            <button className="lifetrack-google-button" type="button" onClick={() => setStep("profile")}><span>G</span>Continuar con Google <b>→</b></button>
            <div className="lifetrack-auth-divider"><span>O</span></div>
            <button className="lifetrack-email-button" type="button" onClick={() => setStep("profile")}><span>@</span>Continuar con correo electrónico <b>→</b></button>
          </div>
          <small>Esta es una demostración visual: no inicia sesión ni modifica los datos de tu cuenta.</small>
        </div>
      </section>
    </main>;
  }

  if (step === "complete") {
    return <main className="editorial-onboarding preview-user-flow">
      <header className="editorial-onboarding-header"><div className="lifetrack-brand"><span className="brand-mark"><BrandMark /></span><b>AVORA</b></div><span>RECORRIDO COMPLETO</span></header>
      <section className="preview-complete">
        <span>✓</span><p className="step-label">TODO LISTO</p><h1>Bienvenido a AVORA, {name}.</h1>
        <p>Así termina la configuración inicial de un usuario nuevo. En el uso real, desde acá se abre el Inicio con todas las áreas personalizadas.</p>
        <div><button type="button" onClick={() => { setStep("access"); setName(""); setPriorities([]); setWeeklySummary(false); }}>Volver a empezar</button><Link href="/">Entrar a mi cuenta real →</Link></div>
      </section>
    </main>;
  }

  const currentStep = step === "profile" ? 1 : 2;
  return <main className="editorial-onboarding preview-user-flow">
    <header className="editorial-onboarding-header"><div className="lifetrack-brand"><span className="brand-mark"><BrandMark /></span><b>AVORA</b></div><span>Paso {currentStep} de 2 · Vista de usuario nuevo</span></header>
    <div className="editorial-stepper" aria-label={`Paso ${currentStep} de 2`}>
      <div className="active"><span>01</span><b>Perfil</b><i /></div><div className={currentStep === 2 ? "active" : ""}><span>02</span><b>Prioridades</b></div>
    </div>
    <section className="editorial-onboarding-body">
      <div className="editorial-story">
        <span className="editorial-number">0{currentStep}</span>
        {step === "profile" ? <><h1>Primero,<br />conocerte.</h1><p>Este nombre aparecerá en tu perfil y en tu experiencia diaria.</p></> : <><h1>Tus<br />prioridades.</h1><p>Elegí entre 1 y 3 áreas para personalizar tu Daily Score.</p></>}
      </div>
      <div className="editorial-form-area">
        {step === "profile" ? <>
          <label className="editorial-name">¿Cómo te llamás?<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Tu nombre" /></label>
          <button className="editorial-primary" disabled={name.trim().length < 2} onClick={() => setStep("priorities")}>Continuar <span>→</span></button>
          <p className="editorial-note"><span>🔒</span> Podés cambiarlo cuando quieras.</p>
        </> : <>
          <div className="editorial-priority-heading"><p>TUS PRIORIDADES</p><h2>¿Cuáles son tus prioridades?</h2><small>Elegí entre 1 y 3 áreas. Después podés cambiarlas cuando quieras.</small></div>
          <div className="editorial-goals">{priorityOptions.map(([value, icon, label, copy]) => <button type="button" aria-pressed={priorities.includes(value)} className={priorities.includes(value) ? "selected" : ""} key={value} onClick={() => togglePriority(value)}><span>{icon}</span><p><b>{label}</b><small>{copy}</small></p><i>{priorities.includes(value) ? "✓" : "+"}</i></button>)}</div>
          <label className="weekly-consent"><input type="checkbox" checked={weeklySummary} onChange={(event) => setWeeklySummary(event.target.checked)} /><span aria-hidden="true">✉</span><p><b>Quiero recibir un resumen semanal de mi progreso</b><small>Podrás desactivarlo cuando quieras desde tu perfil.</small></p></label>
          <div className="editorial-actions"><button type="button" className="editorial-back" onClick={() => setStep("profile")}>← Atrás</button><button type="button" className="editorial-primary" disabled={!priorities.length} onClick={() => setStep("complete")}>Entrar a AVORA <span>→</span></button></div>
        </>}
      </div>
    </section>
  </main>;
}

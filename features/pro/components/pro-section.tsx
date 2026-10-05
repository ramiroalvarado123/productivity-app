"use client";
import { formatDate } from "@/domain/dates";
import { useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** AVORA Pro: comparación de planes y compra simulada. */
export function ProSection() {
  const {
    today,
    data,
    saving,
    save,
    openSection,
    isPro,
  } = useWorkspace();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<"monthly" | "annual">("annual");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "processing" | "done">("form");
  /**
   * Simulación de la compra. No hay pasarela ni cobro: espera un momento para
   * que se sienta como un pago real y después activa Pro de verdad en la base,
   * que es lo que hace que los candados se abran en toda la aplicación.
   */
  async function simulatePayment() {
    setCheckoutStep("processing");
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const ok = await save({ action: "set_pro", active: true });
    setCheckoutStep(ok ? "done" : "form");
  }
  async function cancelPro() {
    await save({ action: "set_pro", active: false });
  }

  // ---------------------------------------------------------------------------
  // AVORA Pro: comparación de planes y simulación de compra
  // ---------------------------------------------------------------------------
  const planRows: Array<{ feature: string; detail: string; free: string | false; pro: string }> = [
    { feature: "Registro de todo", detail: "Entrenamiento, comidas, sueño, foco, lectura y objetivos", free: "Completo", pro: "Completo" },
    { feature: "Plan del día", detail: "Tu agenda hora por hora y los huecos libres", free: "Completo", pro: "Completo" },
    { feature: "Daily Score y rachas", detail: "Puntaje por prioridades, récords y tendencias", free: "Completo", pro: "Completo" },
    { feature: "Recomendaciones diarias", detail: "Cruza sueño, agenda y rachas para decirte qué mover y a qué hora", free: false, pro: "Ilimitadas" },
    { feature: "Cierre del día por voz", detail: "Contás tu día en un minuto y se acomoda solo en cada sección", free: false, pro: "Sin límite" },
    { feature: "Calorías por foto", detail: "Sacás una foto del plato y sale la estimación con macros", free: false, pro: "Sin límite" },
    { feature: "Plan de alimentación", detail: "Calculado con tus datos y adaptado a tus intolerancias", free: false, pro: "Incluido" },
    { feature: "Revisión semanal con IA", detail: "Compara tu progreso, prioridades y próximos pasos con tus datos", free: false, pro: "Incluida" },
    { feature: "Reprogramación automática", detail: "Dormiste poco: te mueve el bloque difícil al mejor hueco del día", free: false, pro: "Incluido" },
  ];
  const lockedCount = planRows.filter((row) => row.free === false).length;
  const proPanel = <section className="pro-page">
    {isPro ? <article className="panel pro-active">
      <span className="pro-active-badge">✦</span>
      <p>SUSCRIPCIÓN ACTIVA</p>
      <h2>Tenés AVORA Pro.</h2>
      <p className="pro-active-copy">Activada el {formatDate(data.profile.proSince || today)}. Todas las funciones están desbloqueadas en esta cuenta.</p>
      <div className="pro-active-actions">
        <button className="primary-action" onClick={() => openSection("summary")}>Volver a Inicio</button>
        <button className="pro-cancel" disabled={saving} onClick={() => void cancelPro()}>{saving ? "Desactivando…" : "Volver al plan gratuito"}</button>
      </div>
      <small className="pro-demo-note">Demostración: la suscripción se simula localmente y no hay ningún cobro.</small>
    </article> : <>
      <article className="panel pro-hero">
        <p className="pro-eyebrow">AVORA PRO</p>
        <h2>Registrar es la mitad.<br /><em>Decidir es la otra.</em></h2>
        <p className="pro-hero-copy">
          Ya anotás todo. Pro es la parte que lee esos datos por vos y te dice qué mover:
          que dormiste 5 h y tu bloque difícil está a las 8, que hay un hueco libre a las 17,
          que llevás cinco días de racha y hoy todavía no registraste.
        </p>
        <div className="pro-hero-proof">
          <div><b>{lockedCount}</b><small>funciones bloqueadas hoy</small></div>
          <div><b>1 min</b><small>para cerrar el día hablando</small></div>
          <div><b>0</b><small>planillas que llenar a mano</small></div>
        </div>
      </article>

      <article className="panel pro-compare">
        <div className="panel-heading"><div><p>QUÉ CAMBIA</p><h2>Gratis y Pro, lado a lado</h2></div></div>
        <div className="pro-table" role="table">
          <div className="pro-table-head" role="row">
            <span role="columnheader">Función</span>
            <span role="columnheader">Gratis</span>
            <span role="columnheader" className="is-pro">Pro</span>
          </div>
          {planRows.map((row) => <div className={"pro-table-row " + (row.free === false ? "is-locked" : "")} role="row" key={row.feature}>
            <span role="cell"><b>{row.feature}</b><small>{row.detail}</small></span>
            <span role="cell" className="pro-cell-free">{row.free === false ? <i aria-label="No incluido">—</i> : row.free}</span>
            <span role="cell" className="pro-cell-pro">{row.pro}</span>
          </div>)}
        </div>
      </article>

      <article className="panel pro-pricing">
        <div className="pro-plan-switch" role="group" aria-label="Elegí la frecuencia de pago">
          <button className={checkoutPlan === "monthly" ? "active" : ""} onClick={() => setCheckoutPlan("monthly")}>Mensual</button>
          <button className={checkoutPlan === "annual" ? "active" : ""} onClick={() => setCheckoutPlan("annual")}>Anual <i>2 meses gratis</i></button>
        </div>
        <div className="pro-price">
          <b>{checkoutPlan === "annual" ? "$4.990" : "$5.990"}</b>
          <small>por mes{checkoutPlan === "annual" ? ", facturado anual" : ""}</small>
        </div>
        <p className="pro-price-note">{checkoutPlan === "annual" ? "Pagás $59.880 una vez al año y te ahorrás $11.980." : "Cancelás cuando quieras, sin explicaciones."}</p>
        <button className="pro-buy" onClick={() => { setCheckoutStep("form"); setCheckoutOpen(true); }}>Empezar con Pro <span>→</span></button>
        <ul className="pro-reassure">
          <li>Tus datos siguen siendo tuyos: Pro no cambia quién los ve.</li>
          <li>Si cancelás, todo lo que registraste sigue estando.</li>
          <li>Demostración: no se cobra nada y podés volver atrás cuando quieras.</li>
        </ul>
      </article>
    </>}
  </section>;
  const checkoutDialog = checkoutOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && checkoutStep !== "processing") setCheckoutOpen(false); }}>
    <section className="checkout-dialog" role="dialog" aria-modal="true" aria-label="Confirmar suscripción">
      {checkoutStep === "done" ? <div className="checkout-done">
        <span aria-hidden="true">✓</span>
        <h2>Listo, ya tenés Pro.</h2>
        <p>Las recomendaciones, el cierre por voz, las calorías por foto y el plan de alimentación quedaron desbloqueados.</p>
        <button className="primary-action" onClick={() => { setCheckoutOpen(false); openSection("summary"); }}>Ver mi Inicio</button>
      </div> : <>
        <p className="checkout-label">CONFIRMAR SUSCRIPCIÓN</p>
        <h2>AVORA Pro {checkoutPlan === "annual" ? "anual" : "mensual"}</h2>
        <div className="checkout-summary">
          <div><span>Plan</span><b>{checkoutPlan === "annual" ? "Anual (12 meses)" : "Mensual"}</b></div>
          <div><span>Precio</span><b>{checkoutPlan === "annual" ? "$59.880 por año" : "$5.990 por mes"}</b></div>
          <div><span>Equivale a</span><b>{checkoutPlan === "annual" ? "$4.990 por mes" : "$5.990 por mes"}</b></div>
        </div>
        <div className="checkout-demo">
          <span aria-hidden="true">ⓘ</span>
          <p><b>Esto es una demostración.</b> No hay pasarela de pago ni se piden datos de tarjeta: el botón simula la compra y desbloquea las funciones para que puedas probarlas.</p>
        </div>
        <div className="checkout-actions">
          <button type="button" className="checkout-cancel" disabled={checkoutStep === "processing"} onClick={() => setCheckoutOpen(false)}>Cancelar</button>
          <button type="button" className="checkout-pay" disabled={checkoutStep === "processing"} onClick={() => void simulatePayment()}>
            {checkoutStep === "processing" ? <><i className="voice-spinner" />Procesando…</> : "Simular pago y activar"}
          </button>
        </div>
      </>}
    </section>
  </div>;

  return <>{proPanel}{checkoutDialog}</>;
}

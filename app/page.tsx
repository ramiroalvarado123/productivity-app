import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import ProgressClient from "./progress-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (user) {
    return <ProgressClient initialUser={{ displayName: user.displayName, email: user.email, onboardingCompleted: false, mainGoals: [], usagePreferences: [] }} />;
  }

  return (
    <main className="access-page access-page-professional">
      <section className="access-intro">
        <div className="access-brand"><div className="brand-mark">M</div><b>Mi Progreso</b></div>
        <div className="access-promise">
          <p className="eyebrow">TU VIDA, CON MÁS CLARIDAD</p>
          <h1>Todo tu progreso<br />en un solo lugar.</h1>
          <p className="intro-copy">Organizá tus objetivos, registrá tus hábitos y entendé qué acciones te acercan a la vida que querés construir.</p>
        </div>
        <div className="access-proof" aria-label="Áreas principales de la aplicación">
          <div><span>◉</span><p><b>Daily Score</b><small>Alineado con tus prioridades.</small></p></div>
          <div><span>↗</span><p><b>Progreso integral</b><small>Entrenamiento, foco, nutrición y descanso.</small></p></div>
          <div><span>✦</span><p><b>Asistencia con IA</b><small>Menos tiempo cargando datos.</small></p></div>
        </div>
      </section>
      <section className="access-panel">
        <div className="mobile-brand"><span className="brand-mark small">M</span><b>Mi Progreso</b></div>
        <div className="access-card real-access">
          <p className="step-label">ACCESO SEGURO</p>
          <h2>Volvé a tu progreso.</h2>
          <p className="access-subtitle">Ingresá o creá tu cuenta usando Google o tu correo. Tus registros quedan separados y protegidos para cada usuario.</p>
          <a className="primary-button access-link" href={chatGPTSignInPath("/")}><span className="access-methods"><i>G</i><i>@</i></span>Continuar con Google o correo <b>→</b></a>
          <div className="access-divider"><span>AL CONTINUAR</span></div>
          <div className="privacy-list compact">
            <div><span>✓</span><p><b>Tu cuenta, tus datos</b><small>Nadie más ve tus registros personales.</small></p></div>
            <div><span>✓</span><p><b>Sin contraseñas en la app</b><small>El acceso se completa en una pantalla segura.</small></p></div>
          </div>
          <p className="demo-note">Al ingresar aceptás configurar tu perfil personal. Mi Progreso no almacena tu contraseña.</p>
        </div>
      </section>
    </main>
  );
}

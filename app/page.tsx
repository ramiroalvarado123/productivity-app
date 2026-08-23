import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import NewUserPreview from "./new-user-preview";
import ProgressClient from "./progress-client";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams?: Promise<{ demo?: string }> }) {
  const params = searchParams ? await searchParams : {};
  if (params.demo === "new-user") return <NewUserPreview />;

  const user = await getChatGPTUser();

  if (user) {
    return <ProgressClient initialUser={{ displayName: user.displayName, email: user.email, onboardingCompleted: false, mainGoals: [], usagePreferences: [] }} />;
  }

  const signInPath = chatGPTSignInPath("/");

  return (
    <main className="lifetrack-access">
      <header className="lifetrack-access-header">
        <div className="lifetrack-brand"><span className="brand-mark">L</span><b>LifeTrack</b></div>
        <span>ACCESO SEGURO</span>
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
          <h2>Ingresá a LifeTrack.</h2>
          <p>Accedé o creá tu cuenta. Tus registros quedan separados y protegidos para cada usuario.</p>
          <div className="lifetrack-auth-options">
            <a className="lifetrack-google-button" href={signInPath}><span>G</span>Continuar con Google <b>→</b></a>
            <div className="lifetrack-auth-divider"><span>O</span></div>
            <a className="lifetrack-email-button" href={signInPath}><span>@</span>Continuar con correo electrónico <b>→</b></a>
          </div>
          <small>La opción de acceso se confirma en el siguiente paso seguro. LifeTrack no almacena tu contraseña.</small>
        </div>
      </section>
    </main>
  );
}

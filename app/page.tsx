import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import ProgressClient from "./progress-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (user) {
    return <ProgressClient initialUser={{ displayName: user.displayName, email: user.email }} />;
  }

  return (
    <main className="access-page">
      <div className="access-orb access-orb-one" /><div className="access-orb access-orb-two" />
      <section className="access-intro">
        <div className="brand-mark">M</div>
        <p className="eyebrow">TODO TU PROGRESO, EN UN SOLO LUGAR</p>
        <h1>Construí días que<br />se sientan bien.</h1>
        <p className="intro-copy">Entrená, comé mejor, leé más y entendé tu progreso sin convertir tu vida en una planilla.</p>
        <div className="preview-stack" aria-hidden="true">
          <div className="mini-card mini-score"><span>Tu día</span><b>82</b><small>Muy buen ritmo</small></div>
          <div className="mini-card mini-gym"><span>Esta semana</span><b>3 entrenamientos</b><div className="mini-dots"><i /><i /><i /><i /></div></div>
          <div className="mini-card mini-book"><span>Leyendo ahora</span><b>Tu próximo libro</b><small>Leé un poco cada día</small></div>
        </div>
      </section>
      <section className="access-panel">
        <div className="mobile-brand"><span className="brand-mark small">M</span><b>Mi Progreso</b></div>
        <div className="access-card real-access">
          <p className="step-label">TU ESPACIO PERSONAL</p>
          <h2>Tu progreso empieza hoy.</h2>
          <p className="access-subtitle">Ingresá con tu cuenta de ChatGPT. Todo lo que cargues quedará guardado y disponible cuando vuelvas.</p>
          <div className="privacy-list">
            <div><span>✓</span><p><b>Datos persistentes</b><small>No se borran al cerrar o recargar.</small></p></div>
            <div><span>✓</span><p><b>Tu espacio privado</b><small>Cada usuario tiene sus propios registros.</small></p></div>
            <div><span>✓</span><p><b>Listo para probar</b><small>Usalo día a día y mejoramos sobre datos reales.</small></p></div>
          </div>
          <a className="primary-button access-link" href={chatGPTSignInPath("/")}>Ingresar con ChatGPT <span>→</span></a>
          <p className="demo-note">Primera versión personal · Tus datos quedan asociados a tu cuenta</p>
        </div>
      </section>
    </main>
  );
}

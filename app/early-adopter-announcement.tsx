"use client";

export function EarlyAdopterAnnouncement({
  busy,
  error,
  onAcknowledge,
}: {
  busy: boolean;
  error: string;
  onAcknowledge: () => void;
}) {
  return <div className="early-announcement-overlay" role="presentation">
    <section className="early-announcement-dialog" role="dialog" aria-modal="true" aria-labelledby="early-announcement-title" aria-describedby="early-announcement-copy">
      <button type="button" className="early-announcement-close" disabled={busy} onClick={onAcknowledge} aria-label="Cerrar anuncio">×</button>
      <div className="early-announcement-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M8 21.5v6a2 2 0 0 0 2 2h4l16 9V10l-16 9H10a2 2 0 0 0-2 2.5Z" />
          <path d="M30 17.5c4.3 1 7 3.2 7 7s-2.7 6-7 7M15 30l3 10h7l-5-7.7M38 17l3-3M39 25h5M38 33l3 3" />
        </svg>
      </div>
      <p className="early-announcement-kicker">NOVEDADES DE AVORA</p>
      <h1 id="early-announcement-title">ANUNCIO</h1>
      <h2>Early adopters:</h2>
      <div className="early-announcement-copy" id="early-announcement-copy">
        <p>Queríamos avisarles que trajimos grandes actualizaciones.</p>
        <p>Entre las más importantes, hemos aumentado el tiempo de respuesta de prácticamente todas las secciones para que puedan cargar los datos aún más rápido.</p>
        <p>Agregamos un sistema de rachas, con la posibilidad de restablecerla siempre y cuando hayan usado 7 días seguidos la aplicación (pueden tocar en el fueguito para entenderlo mejor). También incorporamos un sistema de insignias que cada persona va a ir consiguiendo y acumulando con el pasar del tiempo; tocando en su perfil van a poder encontrarlas. Tanto las rachas como las insignias las van a poder visualizar su círculo de amigos, para que puedan tomar noción de cómo evoluciona su entorno.</p>
        <p>Además, estuvimos solucionando bugs y detalles.</p>
        <p>Seguimos trabajando con la app y les recordamos que es de gran ayuda que nos manden sus feedbacks y sugerencias, que nos ayudan muchísimo!!!</p>
      </div>
      {error && <p className="early-announcement-error" role="alert">{error}</p>}
      <button type="button" className="early-announcement-ack" disabled={busy} onClick={onAcknowledge}>
        {busy ? "Guardando…" : "Entendido"}
        <span aria-hidden="true">→</span>
      </button>
      <small className="early-announcement-footnote">Gracias por ser parte de AVORA desde el comienzo.</small>
    </section>
  </div>;
}

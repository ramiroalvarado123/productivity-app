/**
 * Envuelve una función de pago: muestra el contenido real detrás de un velo
 * borroso con candado. El contenido queda inerte, así que no se puede tocar ni
 * llegar con el teclado; el candado lleva a la comparación de planes.
 */

export function LockedFeature({ title, note, onOpen, children }: { title: string; note: string; onOpen: () => void; children: React.ReactNode }) {
  return <div className="pro-locked">
    <div className="pro-locked-content" inert>{children}</div>
    <button type="button" className="pro-lock-veil" onClick={onOpen}>
      <span className="pro-lock-badge" aria-hidden="true">🔒</span>
      <b>{title}</b>
      <small>{note}</small>
      <span className="pro-lock-cta">Ver AVORA Pro <i>→</i></span>
    </button>
  </div>;
}

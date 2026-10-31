import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/shared/ui/brand-mark";
import { LEGAL_LAST_UPDATE, SUPPORT_EMAIL } from "@/shared/config/legal";

/** Cómo contactarnos: el mail si está configurado; si no, el canal de comentarios dentro de la app. */
export function ContactLine() {
  return SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    : <>la opción <b>Enviar comentarios</b> dentro de la app (menú de tu perfil)</>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page">
    <header className="legal-header">
      <Link className="legal-brand" href="/"><span className="brand-mark"><BrandMark /></span><b>AVORA</b></Link>
      <Link className="legal-back" href="/">Volver a AVORA</Link>
    </header>
    <article className="legal-body">
      <h1>{title}</h1>
      <p className="legal-updated">Última actualización: {LEGAL_LAST_UPDATE}</p>
      {children}
      <nav className="legal-footer" aria-label="Más información">
        <Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/soporte">Soporte</Link>
      </nav>
    </article>
  </main>;
}

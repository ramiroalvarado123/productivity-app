"use client";

import { useEffect, useRef, useState } from "react";
import { AI_CONSENT_DECLINED_MESSAGE, requiresAiConsent } from "@/features/ai-consent/logic/consent";
import { grantAiConsent, hasAiConsent } from "@/features/ai-consent/logic/consent-store";

/**
 * Pantalla de permiso para la IA. Vive en el layout y se interpone en los pedidos que
 * mandan datos a OpenAI (ver AI_ENDPOINTS): si todavía no hay permiso, los frena hasta
 * que la persona acepte; si rechaza, el pedido falla con un mensaje y no sale nada.
 * Se hace sobre `fetch` y no en cada pantalla para que ninguna función con IA (hoy o
 * futura) pueda olvidarse del permiso.
 */
export function AiConsentHost() {
  const [open, setOpen] = useState(false);
  const pending = useRef<Promise<boolean> | null>(null);
  const resolve = useRef<((accepted: boolean) => void) | null>(null);

  useEffect(() => {
    const original = window.fetch;
    const ask = () => {
      pending.current ??= new Promise<boolean>((done) => {
        resolve.current = (accepted) => { pending.current = null; resolve.current = null; done(accepted); };
        setOpen(true);
      });
      return pending.current;
    };

    window.fetch = async (input, init) => {
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");
      const url = input instanceof Request ? input.url : String(input);
      if (!requiresAiConsent(url, method, window.location.origin) || hasAiConsent()) return original.call(window, input, init);
      if (await ask()) return original.call(window, input, init);
      return Response.json({ error: AI_CONSENT_DECLINED_MESSAGE }, { status: 403 });
    };
    return () => { window.fetch = original; };
  }, []);

  function answer(accepted: boolean) {
    if (accepted) grantAiConsent();
    setOpen(false);
    resolve.current?.(accepted);
  }

  if (!open) return null;
  return <div className="voice-overlay" role="presentation">
    <section className="checkout-dialog ai-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
      <p className="checkout-label">TU PRIVACIDAD</p>
      <h2 id="ai-consent-title">Antes de usar la IA</h2>
      <p>Para esta función, AVORA envía a <b>OpenAI</b>, un proveedor de inteligencia artificial externo, solo lo que vos le pedís que analice:</p>
      <ul className="ai-consent-list">
        <li>el audio de tu voz (cierre del día o plan de dieta por voz),</li>
        <li>la foto o la descripción de tu comida,</li>
        <li>los datos que cargaste para armar tu plan de alimentación o tu revisión semanal.</li>
      </ul>
      <p>Se usan únicamente para devolverte el resultado. Los resultados son orientativos y <b>no reemplazan el consejo de un médico o nutricionista</b>.</p>
      <p className="ai-consent-links">Más detalles en la <a href="/privacidad">Política de privacidad</a>. Podés retirar el permiso cuando quieras desde Configuración.</p>
      <div className="checkout-actions">
        <button type="button" className="checkout-cancel" onClick={() => answer(false)}>Ahora no</button>
        <button type="button" className="checkout-pay" onClick={() => answer(true)}>Aceptar y continuar</button>
      </div>
    </section>
  </div>;
}

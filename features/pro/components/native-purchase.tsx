"use client";

import { useEffect, useState } from "react";
import { loadPlans, purchasePlan, purchasesConfigured, restorePurchases, type Plan } from "@/features/pro/logic/native-purchases";
import { nativePlatform } from "@/shared/platform/native";

type Loaded = { status: "loading" } | { status: "unavailable" } | { status: "ready"; plans: Plan[] };

/** Suscripción a Pro dentro de la app de iPhone/Android (App Store / Google Play vía RevenueCat). */
export function NativePurchase({ email }: { email: string }) {
  const platform = nativePlatform() === "android" ? "android" : "ios";
  const store = platform === "ios" ? "Apple" : "Google Play";
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const [kind, setKind] = useState<"monthly" | "annual">("annual");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    if (!purchasesConfigured(platform)) { setLoaded({ status: "unavailable" }); return; }
    loadPlans(email, platform)
      .then((plans) => { if (!cancelled) setLoaded(plans.length ? { status: "ready", plans } : { status: "unavailable" }); })
      .catch(() => { if (!cancelled) setLoaded({ status: "unavailable" }); });
    return () => { cancelled = true; };
  }, [email, platform]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loaded.status === "loading") return <article className="panel pro-pricing"><p className="pro-price-note">Cargando planes…</p></article>;
  if (loaded.status === "unavailable") {
    return <article className="panel pro-pricing">
      <h3>Las suscripciones llegan pronto a la app</h3>
      <p className="pro-price-note">Todavía no se puede activar Pro desde acá. Apenas esté disponible, vas a poder hacerlo directamente desde esta pantalla.</p>
    </article>;
  }

  const monthly = loaded.plans.find((plan) => plan.kind === "monthly");
  const annual = loaded.plans.find((plan) => plan.kind === "annual");
  const selected = (kind === "annual" ? annual : monthly) ?? annual ?? monthly ?? loaded.plans[0];
  const period = selected.kind === "annual" ? "año" : "mes";

  async function finish(action: Promise<{ ok: true } | { ok: false; cancelled: boolean; error: string }>) {
    setBusy(true);
    setMessage("");
    const result = await action;
    if (result.ok) { window.location.replace("/"); return; }
    if (!result.cancelled) setMessage(result.error);
    setBusy(false);
  }

  return <article className="panel pro-pricing">
    {monthly && annual && <div className="pro-plan-switch" role="group" aria-label="Elegí la frecuencia de pago">
      <button className={selected === monthly ? "active" : ""} onClick={() => setKind("monthly")}>Mensual</button>
      <button className={selected === annual ? "active" : ""} onClick={() => setKind("annual")}>Anual</button>
    </div>}
    <div className="pro-price"><b>{selected.price}</b><small>por {period}</small></div>
    <button className="pro-buy" disabled={busy} onClick={() => void finish(purchasePlan(selected, email, platform))}>
      {busy ? "Procesando…" : "Suscribirme a Pro"} <span>→</span>
    </button>
    <button className="pro-cancel" disabled={busy} onClick={() => void finish(restorePurchases(email, platform))}>Restaurar compras</button>
    {message && <p className="pro-price-note" role="alert">{message}</p>}
    <ul className="pro-reassure">
      <li>Suscripción con renovación automática cada {period}. El pago se carga a tu cuenta de {store} al confirmar la compra.</li>
      <li>Se renueva sola salvo que la canceles al menos 24 horas antes de que termine el período. Podés administrarla o cancelarla cuando quieras desde los ajustes de tu cuenta de {store}.</li>
      <li>Al suscribirte aceptás los <a href="/terminos">Términos de uso</a> y la <a href="/privacidad">Política de privacidad</a>.</li>
    </ul>
  </article>;
}

import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

/**
 * Compras de AVORA Pro dentro de la app de iPhone/Android, con RevenueCat (que habla con la App Store y
 * Google Play). El usuario de RevenueCat es el email de la cuenta. Después de cada compra el servidor
 * le vuelve a preguntar a RevenueCat y recién ahí activa Pro (`/api/billing/sync`).
 */

type Platform = "ios" | "android";
export type Plan = { id: string; kind: "monthly" | "annual" | "other"; price: string; raw: PurchasesPackage };
export type PurchaseResult = { ok: true } | { ok: false; cancelled: boolean; error: string };

// Son las claves PÚBLICAS del SDK de RevenueCat (una por tienda): pueden viajar en la app.
const SDK_KEYS: Record<Platform, string> = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "",
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",
};

export function purchasesConfigured(platform: Platform) {
  return SDK_KEYS[platform].length > 0;
}

async function sdk() {
  return (await import("@revenuecat/purchases-capacitor")).Purchases;
}

let configuredFor = "";

async function prepare(email: string, platform: Platform) {
  const purchases = await sdk();
  if (!configuredFor) await purchases.configure({ apiKey: SDK_KEYS[platform], appUserID: email });
  else if (configuredFor !== email) await purchases.logIn({ appUserID: email });
  configuredFor = email;
  return purchases;
}

function kindOf(pkg: PurchasesPackage): Plan["kind"] {
  const type = String(pkg.packageType);
  return type === "MONTHLY" ? "monthly" : type === "ANNUAL" ? "annual" : "other";
}

/** Los planes que ofrece la tienda, con el precio ya en la moneda de quien lo ve. */
export async function loadPlans(email: string, platform: Platform): Promise<Plan[]> {
  const purchases = await prepare(email, platform);
  const offerings = await purchases.getOfferings();
  return (offerings.current?.availablePackages ?? []).map((pkg) => ({
    id: pkg.identifier, kind: kindOf(pkg), price: pkg.product.priceString, raw: pkg,
  }));
}

async function syncPro(): Promise<PurchaseResult> {
  const response = await fetch("/api/billing/sync", { method: "POST", credentials: "same-origin" });
  const body = await response.json().catch(() => ({})) as { isPro?: boolean; error?: string };
  if (!response.ok) return { ok: false, cancelled: false, error: body.error || "No pudimos verificar tu suscripción." };
  if (!body.isPro) return { ok: false, cancelled: false, error: "No encontramos una suscripción activa para esta cuenta." };
  return { ok: true };
}

export async function purchasePlan(plan: Plan, email: string, platform: Platform): Promise<PurchaseResult> {
  try {
    const purchases = await prepare(email, platform);
    await purchases.purchasePackage({ aPackage: plan.raw });
    return await syncPro();
  } catch (cause) {
    const error = cause as { userCancelled?: boolean | null; message?: string };
    if (error.userCancelled) return { ok: false, cancelled: true, error: "" };
    return { ok: false, cancelled: false, error: error.message || "No pudimos completar la compra." };
  }
}

/** Obligatorio en las dos tiendas: recuperar una suscripción ya comprada (otro celular, reinstalación). */
export async function restorePurchases(email: string, platform: Platform): Promise<PurchaseResult> {
  try {
    const purchases = await prepare(email, platform);
    await purchases.restorePurchases();
    return await syncPro();
  } catch (cause) {
    return { ok: false, cancelled: false, error: cause instanceof Error ? cause.message : "No pudimos restaurar tus compras." };
  }
}

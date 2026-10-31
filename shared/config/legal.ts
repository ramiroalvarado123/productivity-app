// Datos que muestran las páginas legales (/privacidad, /terminos, /soporte).
// Las tiendas piden un contacto de soporte: definí NEXT_PUBLIC_SUPPORT_EMAIL en Vercel.
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

/** Se actualiza a mano cada vez que cambia el texto de privacidad o de términos. */
export const LEGAL_LAST_UPDATE = "31 de octubre de 2026";

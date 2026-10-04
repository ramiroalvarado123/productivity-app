import type { SVGProps } from "react";

export type BadgeSymbol = "flame" | "calendar" | "star" | "target";
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

type BadgeEmblemProps = {
  symbol: BadgeSymbol;
  tier: BadgeTier;
  locked?: boolean;
  size?: number;
  className?: string;
};

/** Medalla vectorial propia: el símbolo identifica la categoría y el metal el nivel. */
export function BadgeEmblem({ symbol, tier, locked = false, size = 48, className = "" }: BadgeEmblemProps) {
  return <svg
    className={`badge-emblem badge-tier-${tier}${locked ? " is-locked" : ""}${className ? ` ${className}` : ""}`}
    width={size}
    height={size * 1.12}
    viewBox="0 0 72 82"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20 45h13l-3 30-8-6-8 4 3-24 3-4Z" className="badge-ribbon" />
    <path d="M39 45h13l4 4 3 24-8-4-8 6-4-30Z" className="badge-ribbon" />
    <path d="m20 58 10 3" className="badge-ribbon-fold" />
    <path d="m52 58-10 3" className="badge-ribbon-fold" />
    <circle cx="36" cy="31" r="25" className="badge-medal-rim" />
    <circle cx="36" cy="31" r="20" className="badge-medal-face" />
    <circle cx="36" cy="31" r="16.5" className="badge-medal-inner" />
    <path d="M23.5 17.5a18 18 0 0 1 22-3" className="badge-medal-glint" />
    {symbol === "flame" && <g className="badge-glyph badge-glyph-flame">
      <path d="M37 19c1 4-2 6-2 9 0 1.5.8 2.6 2 3.4-.3-2.5 1.7-4 2-6.2 3.2 2.4 5 5.1 5 8.2a8 8 0 1 1-16 0c0-4.4 2.8-7.6 6-11.4.7 2.3 1.1 3.5 1 5.2 1.5-2.1 2.1-4.6 2-8.2Z" className="badge-glyph-fill" />
      <path d="M36.5 31c1.5 2 3.5 3.2 3.5 5.7a4 4 0 1 1-8 0c0-1.7 1-3.1 2.4-4.7.1 1.3.7 2 1.5 2.4.5-1 .7-2 .6-3.4Z" className="badge-glyph-highlight" />
    </g>}
    {symbol === "calendar" && <g className="badge-glyph badge-glyph-calendar">
      <rect x="26" y="23" width="20" height="17" rx="3" className="badge-glyph-stroke" />
      <path d="M31 21v5M41 21v5M27 29h18" className="badge-glyph-stroke" />
      <path d="M31 33h2m5 0h2m-9 4h2m5 0h2" className="badge-glyph-dots" />
    </g>}
    {symbol === "star" && <path d="m36 21 3.3 6.8 7.5 1.1-5.4 5.2 1.3 7.4-6.7-3.5-6.7 3.5 1.3-7.4-5.4-5.2 7.5-1.1L36 21Z" className="badge-glyph-star" />}
    {symbol === "target" && <g className="badge-glyph badge-glyph-target">
      <circle cx="36" cy="31" r="10" className="badge-glyph-stroke" />
      <circle cx="36" cy="31" r="5.5" className="badge-glyph-stroke" />
      <path d="m35 32 9-10m-4 0h4v4" className="badge-glyph-arrow" />
    </g>}
    <circle cx="36" cy="31" r="2" className="badge-medal-pin" />
  </svg>;
}

type StreakFlameIconProps = SVGProps<SVGSVGElement>;

/** Llama de racha en SVG (estilo Duolingo: cuerpo naranja, gota amarilla y chispas) para conservar nitidez incluso en el chip pequeño. */
export function StreakFlameIcon(props: StreakFlameIconProps) {
  return <svg viewBox="0 0 32 36" fill="none" focusable="false" aria-hidden="true" {...props}>
    <path d="M3 12.6c0-2.2 2.3-3.2 3.8-1.9l1.9 1.6 5.4-7c1-1.3 2.8-1.3 3.8 0l8.5 10.6c1.7 2.1 2.6 4.5 2.6 7.2C29 29.3 23.2 34 16 34S3 29.3 3 22.4Z" className="streak-flame-outer" />
    <path d="M14.9 19.2c.6-.8 1.6-.8 2.2 0l3.4 4.4c.7.9 1 1.9 1 3 0 3-2.5 5.3-5.5 5.3s-5.5-2.3-5.5-5.3c0-1.1.3-2.1 1-3Z" className="streak-flame-inner" />
    <rect x="7.2" y="2.1" width="3.2" height="3.2" rx=".8" transform="rotate(45 8.8 3.7)" className="streak-flame-spark" />
    <circle cx="13.6" cy="1.4" r="1" className="streak-flame-spark" />
  </svg>;
}

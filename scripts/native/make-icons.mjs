// Dibuja el ícono y la pantalla de inicio de las apps nativas a partir de la marca de
// AVORA (la misma de public/favicon.svg) y deja los PNG maestros en resources/.
// Después `npm run native:assets` los reparte en todos los tamaños que piden iOS y Android.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GREEN = "#164735";
const PAPER = "#f7f8f4";
// Trazos de la marca en un cuadro de 100×100; ocupan de x=2 a 94 y de y=16 a 80.
const MARK = (fill) => `
  <path d="M28 30 L54 80 L42 80 L28 52 L14 80 L2 80 Z" fill="${fill}" fill-opacity="0.4"/>
  <path d="M60 16 L94 80 L79 80 L60 44 L41 80 L26 80 Z" fill="${fill}"/>`;

/** SVG cuadrado de `size` px con la marca centrada ocupando `markWidth` px de ancho. */
function canvas(size, { background, markFill, markWidth }) {
  const scale = markWidth / 92;
  const x = size / 2 - 48 * scale;
  const y = size / 2 - 48 * scale;
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}<g transform="translate(${x} ${y}) scale(${scale})">${MARK(markFill)}</g></svg>`);
}

const out = fileURLToPath(new URL("../../resources/", import.meta.url));
mkdirSync(out, { recursive: true });
const png = (name, svg) => sharp(svg).png().toFile(out + name);

await Promise.all([
  // iOS: cuadrado y sin transparencia (Apple le pone las esquinas redondeadas).
  png("icon-only.png", canvas(1024, { background: GREEN, markFill: "#ffffff", markWidth: 600 })),
  // Android adaptable: la marca queda dentro del 66 % central porque cada fabricante recorta distinto.
  png("icon-foreground.png", canvas(1024, { background: null, markFill: "#ffffff", markWidth: 440 })),
  png("icon-background.png", canvas(1024, { background: GREEN, markFill: GREEN, markWidth: 1 })),
  png("splash.png", canvas(2732, { background: PAPER, markFill: GREEN, markWidth: 560 })),
]);
console.log("Íconos y splash maestros listos en resources/");

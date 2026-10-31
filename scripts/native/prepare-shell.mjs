// Genera native-shell/offline.html a partir de la plantilla, escribiendo la dirección
// del sitio. Se corre solo dentro de `npm run native:sync`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const serverUrl = process.env.CAP_SERVER_URL ?? "https://productivity-app-six-pearl.vercel.app";
if (!/^https:\/\/[^\s"'<>]+$/.test(serverUrl)) {
  console.error(`CAP_SERVER_URL tiene que ser una dirección https:// válida (recibí "${serverUrl}").`);
  process.exit(1);
}

const template = readFileSync(new URL("native-shell/offline.template.html", root), "utf8");
writeFileSync(fileURLToPath(new URL("native-shell/offline.html", root)), template.replace("__SERVER_URL__", serverUrl));
console.log(`Pantalla sin conexión lista → reintenta en ${serverUrl}`);

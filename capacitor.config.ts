import type { CapacitorConfig } from "@capacitor/cli";

// Dirección de la web de AVORA (la de Vercel). La app de las tiendas es un
// "marco" nativo que carga este sitio: por eso un cambio publicado en `main`
// llega a las apps ya instaladas sin pasar por la revisión de Apple/Google.
// Para apuntar a otra dirección (por ejemplo tu dominio propio):
//   CAP_SERVER_URL=https://app.tudominio.com npm run native:sync
const serverUrl = process.env.CAP_SERVER_URL ?? "https://productivity-app-six-pearl.vercel.app";

const config: CapacitorConfig = {
  // ⚠️ El identificador NO se puede cambiar una vez publicada la app en las tiendas.
  appId: "com.avora.app",
  appName: "AVORA",
  // Carpeta con la pantalla de "sin conexión". La interfaz real viene de `server.url`.
  webDir: "native-shell",
  server: {
    url: serverUrl,
    // Si el sitio no carga (sin internet), se muestra esta página local en vez de una pantalla en blanco.
    errorPath: "offline.html",
    cleartext: false,
  },
  ios: {
    // Color de fondo mientras carga (evita el destello blanco).
    backgroundColor: "#f7f8f4",
  },
  android: {
    backgroundColor: "#f7f8f4",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#f7f8f4",
      showSpinner: false,
    },
    PushNotifications: {
      // Con la app abierta, el aviso también se muestra.
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      // La app es clara: íconos oscuros en la barra de estado.
      style: "LIGHT",
    },
  },
};

export default config;

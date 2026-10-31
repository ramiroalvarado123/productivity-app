import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Restos del build de Vite anterior a la migración: no son código fuente.
    "dist/**",
    // Proyectos nativos generados por Capacitor y sus recursos: no son código fuente de la app.
    "android/**",
    "ios/**",
    "native-shell/**",
    "resources/**",
  ]),
]);

export default eslintConfig;

# Herramientas de refactor (Python 3, sin dependencias)

Se usaron para partir `progress-client.tsx`. Sirven para seguir partiendo lo que falta.

- `extract_section.py <repo> <spec.json>` — saca una sección de `features/app-shell/progress-app.tsx`
  y su estado propio de `features/app-shell/use-workspace-state.tsx` a un componente nuevo que lee lo
  compartido con `useWorkspace()`. Ver el formato del spec en el docstring y ejemplos en `specs-done/`.
- `autoimport.py <repo>` — agrega los imports que faltan según los errores "Cannot find name" de `tsc`.
- `cleanimports.py <repo> [carpeta]` — saca imports y miembros de `useWorkspace()` que ESLint marca sin usar.
- `move.py <repo> <mapping.txt>` — `git mv` + reescribe todos los imports (`viejo -> nuevo` por línea).

Flujo típico: escribir el spec → `extract_section.py` → `autoimport.py` → `cleanimports.py . features`
→ `npx tsc --noEmit` → `npm run lint` → probar en el navegador → commit.
Si `extract_section.py` deja errores raros, `git checkout` de los dos archivos y ajustar el spec.

# Línea de base de velocidad

Números **antes** de la Fase 1, para poder comparar después. Objetivos del plan (sección 5, paso 0.4):
"Guardado" visible < 100 ms, POST confirmado < 600 ms (p50), carga inicial < 1,5 s en 4G, JSON inicial < 150 KB.

## Cómo medir

`GET` y `POST /api/progress` devuelven el header `Server-Timing` con los tramos del servidor, en ms:

| Tramo | Qué mide |
|---|---|
| `auth` | Preguntarle a Supabase quién es el usuario |
| `profile_upsert` | UPSERT en `profiles` (se elimina en el paso 1.4) |
| `profile`, `disciplines` | (solo GET) consultas en cadena previas a la tanda grande |
| `queries` | (solo GET) las 17 consultas en paralelo |
| `books_update` | (solo GET) actualización de libros terminados |
| `action` | (solo POST) lo que tarda la acción en sí |
| `total` | Todo el pedido dentro del servidor |

1. Usar una cuenta **con datos reales** (varias semanas de uso).
2. Chrome DevTools → Network → throttling **Fast 4G** (o Safari → Web Inspector desde la Mac con el iPhone).
3. Cargar la app y guardar algo (p. ej. una sesión de foco). En Network, abrir cada request → Headers → `Server-Timing`.
4. Repetir 3–5 veces y anotar la mediana.

## Números (completar)

Fecha de medición: _pendiente_ · Commit: _pendiente_ · Cuenta: _pendiente_ · Red: Fast 4G

| Métrica | Valor |
|---|---|
| `POST /api/progress` — duración total (cliente) | |
| `POST /api/progress` — `Server-Timing` (auth / profile_upsert / action / total) | |
| `GET /api/progress` — duración total (cliente) | |
| `GET /api/progress` — `Server-Timing` (auth / profile_upsert / profile / disciplines / queries / books_update / total) | |
| `GET /api/progress` — tamaño del JSON | |
| Tiempo desde tocar "guardar" hasta ver "Guardado" | |

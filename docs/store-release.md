# Publicar AVORA en App Store y Google Play

Guía pensada para alguien que nunca publicó una app. Andá en orden y no te saltees pasos.
Los números (precios, tamaños de captura, versiones mínimas) los cambian Apple y Google seguido: cuando esta guía diga "verificá", mirá la pantalla de la tienda.

---

## 1. Cómo funciona lo que quedó armado

AVORA sigue siendo **una sola app web** (la de Vercel). Las apps de las tiendas son un **marco nativo** (hecho con Capacitor) que abre esa misma web dentro de una ventana, más algunas cosas propias del celular (ícono, pantalla de inicio, permisos, pantalla "sin conexión", botón atrás de Android).

```
Tu código (este repo)
   ├── git push → Vercel → la web (https://productivity-app-six-pearl.vercel.app)
   └── carpetas ios/ y android/  → el "marco" que se sube a las tiendas
                                    y que, al abrirse, carga la web de Vercel
```

**Consecuencia importante:** cuando cambiás una pantalla, un texto o la lógica y hacés push a `main`, **las apps ya instaladas se actualizan solas** la próxima vez que se abren. No hay que volver a subir nada a las tiendas. Solo hay que subir una versión nueva cuando cambia el "marco" (ver sección 7).

### Qué quedó hecho en el código
- Proyectos nativos de **iOS** (`ios/`) y **Android** (`android/`) generados y configurados. Ver `capacitor.config.ts`.
- **Ícono y pantalla de inicio** en todos los tamaños (se dibujan desde la marca de AVORA con `npm run native:assets`).
- **Pantalla "Sin conexión"** con botón Reintentar (en vez de una pantalla en blanco, que Apple rechaza).
- **Permisos** de micrófono, cámara y fotos con su texto en español (iOS: `ios/App/App/Info.plist`; Android: `AndroidManifest.xml`).
- iOS solo para **iPhone** (así no te piden capturas de iPad) y en vertical.
- **Eliminar cuenta** desde la app (Configuración → Privacidad y cuenta). Lo piden Apple y Google.
- **Páginas públicas**: `/privacidad`, `/terminos`, `/soporte`. Las dos tiendas piden una dirección de privacidad y una de soporte.
- **Permiso para la IA**: antes de mandar audio, fotos o datos a OpenAI, la app pide permiso (y se puede retirar). Lo pide Apple (regla 5.1.2).
- **Notificaciones push nativas** (iPhone por APNs, Android por Firebase): el celular se registra al activar los avisos en Configuración → Notificaciones, y el mismo cron que ya enviaba avisos web ahora también los manda al celular. Al tocar un aviso se abre la pantalla correcta. Quedan **dormidas hasta que pegues las claves** (sección 5).
- **Suscripción Pro con compras dentro de la app** (RevenueCat → App Store / Google Play): precios que devuelve la tienda, "Restaurar compras", texto legal de renovación automática, "Administrar suscripción", y un webhook + verificación en el servidor que activan y quitan Pro solos. También quedan **dormidas hasta que pegues las claves**.
- Dentro de la app nativa se **apagan** cosas que ahí no andan: service worker y Web Push, el botón de Google y el "pago" simulado de Pro (Apple y Google prohíben pagos que no sean los suyos).

### Qué NO está hecho (y por qué conviene dejarlo así por ahora)
| Falta | Por qué | Cuándo hace falta |
|---|---|---|
| **Entrar con Google / Apple** en la app nativa | Google bloquea su login dentro de estas ventanas y Apple te obliga a sumar "Iniciar con Apple" si ofrecés Google. Hoy se entra con **email y contraseña**, que es lo que evita el problema. Sumarlo exige crear 3 credenciales más en Google/Apple/Supabase. | Opcional. Se puede agregar después. |
| **Que los links de invitación y de confirmación abran la app** | Necesita tu dominio propio y datos que solo existen cuando tengas las cuentas (Team ID, huella del certificado). | Mejora, no obligatorio. Hoy esos links abren el navegador. |

### Riesgo honesto con Apple
Apple rechaza apps que son "solo un sitio web metido en un marco" (regla 4.2). AVORA tiene mucho a favor: es una app completa con cuenta, datos propios, cámara, micrófono, ícono, pantalla sin conexión y funciones que no existen como página web suelta. Aun así **puede pasar que la primera revisión pida más funciones nativas**. Si pasa, el plan B (empaquetar la interfaz dentro de la app, `docs/PLAN_REESTRUCTURACION.md` § 8.2) está descrito y lo hacemos juntos. No lo hagas por las dudas: es bastante trabajo.

---

## 2. Decisiones que tenés que tomar ANTES de empezar

1. **Identificador de la app** (`com.avora.app`). **No se puede cambiar una vez publicada.** Es único en el mundo: si alguien más ya lo usa, Apple/Google te lo van a rechazar al crearla. Si querés otro, se cambia en 3 lugares *antes* de crear la app en las tiendas: `capacitor.config.ts` (`appId`), `android/app/build.gradle` (`applicationId`; el `namespace` se deja como está) y en Xcode (target App → General → Bundle Identifier). Pedime que lo haga si querés otro.
2. **Dirección de la web** que carga la app. Hoy es `https://productivity-app-six-pearl.vercel.app` (la que figura en `docs/notifications-setup.md`). Confirmá que es la de **producción**. Lo ideal es tener un dominio propio (ej. `app.tumarca.com`) porque queda más profesional y no depende de Vercel. Si lo tenés, pasale a Vercel el dominio y corré `CAP_SERVER_URL=https://app.tumarca.com npm run native:sync`.
3. **Mail de soporte**. Las tiendas lo piden y lo mostramos en las páginas legales. Es público: usá uno de AVORA, no el personal.
4. **Nombre del titular**: Apple/Google muestran el nombre con el que te registrás (tu nombre o el de una empresa). Si es una empresa, Apple pide número D-U-N-S (tarda semanas en sacarse).

---

## 3. Cuentas (empezá hoy: tardan días)

| | Apple | Google |
|---|---|---|
| Dónde | developer.apple.com/programs | play.google.com/console |
| Costo | USD 99 por año | USD 25, una sola vez |
| Demora | Hasta 2 días si todo está bien | Verificación de identidad: días |
| Necesitás | Apple ID con verificación en dos pasos, documento | Cuenta Google, documento, tarjeta |

**Google tiene una regla clave para cuentas personales nuevas:** antes de poder publicar en producción tenés que hacer una **prueba cerrada con al menos 12 testers durante 14 días seguidos** (verificalo en Play Console, puede cambiar). Conseguí esos 12 amigos/familiares con Gmail **ahora**: los 14 días son lo que más demora de todo el proceso.

---

## 4. Preparar la web y la base (una sola vez)

Esto afecta a la app real. Hacelo con calma.

1. **Supabase → SQL Editor:** pegá y corré `supabase/delete-account.sql`. Crea la función que borra cuentas. Es aditivo (solo agrega una función). La probé con un Postgres de prueba, pero **la primera vez en producción probala con una cuenta de prueba tuya**, no con la real.
2. **Vercel → Settings → Environment Variables:** agregá
   - `NEXT_PUBLIC_SUPPORT_EMAIL` = el mail de soporte.
   - `NEXT_PUBLIC_SITE_URL` = la dirección de producción (hoy el código usa una dirección de vista previa por defecto).
3. **Publicar el código nuevo:** los cambios de esta sesión (páginas legales, borrar cuenta, permiso de IA) tienen que estar en producción **antes** de enviar la app, porque la app carga la web. Hacé `git push` a `main` (o pedímelo). Recordá: **push = producción**.
4. Abrí en el navegador `https://TU-DIRECCION/privacidad`, `/terminos` y `/soporte` y verificá que se ven.
5. **Cuenta de prueba para los revisores.** Apple y Google van a querer entrar a la app. Supabase te pide confirmar el mail, y ellos no pueden. Creá una cuenta **ya confirmada**: Supabase → Authentication → Users → *Add user* → marcá *Auto Confirm User* (mail por ejemplo `revision@tumarca.com`, contraseña larga). Entrá una vez con ella, completá el onboarding y cargá algunos datos de ejemplo. Para que vean todas las funciones, en SQL Editor: `update public.profiles set pro_since = '2026-10-31' where email = 'revision@tumarca.com';`

---

## 4b. Claves y servicios de las notificaciones y los pagos

Todo el código ya está. Lo que falta son **tus claves**, que solo vos podés crear porque dependen de tus cuentas. Cada clave se pega en **Vercel → Settings → Environment Variables** (en *Production*) y después se hace un **Redeploy** (Deployments → ⋯ → Redeploy). Los nombres exactos están en `.env.example`.

> Mientras una clave falte, esa función queda apagada y la app sigue andando normal. Podés hacer primero las notificaciones y después los pagos.

### A. Base de datos (Supabase → SQL Editor)
Corré, en este orden, cada archivo (son aditivos):
1. `supabase/push-devices.sql` — tabla de celulares para los avisos.
2. `supabase/billing.sql` — registro de suscripciones.
3. `supabase/pro-lockdown.sql` — **NO todavía.** Se corre el día del lanzamiento (ver paso F), porque desde ahí el botón de Pro de demostración deja de funcionar.

### B. Notificaciones en iPhone (necesita la cuenta de Apple Developer)
1. developer.apple.com → **Certificates, Identifiers & Profiles → Keys → ➕**.
2. Ponele un nombre (ej. "AVORA push"), tildá **Apple Push Notifications service (APNs)** → Continue → Register.
3. **Download** (se baja un `.p8`; Apple lo muestra una sola vez, guardalo). Anotá el **Key ID** que aparece.
4. Tu **Team ID** está en developer.apple.com → Membership details.
5. En Vercel creá:
   - `APNS_KEY_ID` = el Key ID
   - `APNS_TEAM_ID` = el Team ID
   - `APNS_PRIVATE_KEY` = todo el contenido del `.p8` (con las líneas `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`; si Vercel te deja pegarlo con saltos de línea, pegalo tal cual)
   - `APNS_BUNDLE_ID` = `com.avora.app` (o el identificador que elijas)
   - `APNS_ENV` = `production`. Solo si probás con una compilación de Xcode (no TestFlight), ponelo en `sandbox` mientras probás y volvelo a `production`.

### C. Notificaciones en Android (necesita una cuenta de Google)
1. console.firebase.google.com → **Agregar proyecto** (nombre AVORA; Analytics no hace falta).
2. En el proyecto: **Agregar app → Android**. Nombre del paquete: `com.avora.app` (o el tuyo). Registrar.
3. Descargá **`google-services.json`** y copialo a **`android/app/google-services.json`**. (Se puede subir a git: no es secreto.)
4. Firebase → ⚙ Configuración del proyecto → **Cuentas de servicio → Generar nueva clave privada**. Se baja un `.json`.
5. En Vercel creá `FCM_SERVICE_ACCOUNT` con **todo el contenido** de ese JSON (en una línea).
6. `npm run native:sync` y volvé a generar el AAB (sección 6).

### D. Pagos: las tiendas
**Apple (App Store Connect):**
1. **Acuerdos, impuestos y banca → Paid Apps**: aceptá el contrato y cargá tus datos bancarios e impositivos (sin esto no se puede cobrar).
2. En tu app → **Monetización → Suscripciones** → creá un **grupo** ("AVORA Pro") y dentro **dos suscripciones**: `avora_pro_monthly` (1 mes) y `avora_pro_annual` (1 año). Cargá precio, nombre visible y una captura de la pantalla de Pro para la revisión.
3. Las suscripciones tienen que **enviarse a revisión junto con la versión** de la app.

**Google (Play Console):**
1. **Perfil de pagos** (Configuración → Perfil de pagos): completalo.
2. Play pide que **ya haya subido un build** (aunque sea en prueba interna) para poder crear suscripciones.
3. **Monetizar → Productos → Suscripciones** → creá `avora_pro` con dos **planes base**: mensual y anual. Cargá precios y activalos.

### E. Pagos: RevenueCat (revenuecat.com, gratis hasta cierto monto de ingresos)
1. Creá una cuenta y un **proyecto** "AVORA".
2. **Apps**: agregá la de **App Store** (con tu Bundle ID) y la de **Play Store** (con el nombre de paquete). RevenueCat te guía para conectar cada tienda (en Apple una clave "In-App Purchase" de App Store Connect; en Google una cuenta de servicio). Seguí sus pasos en pantalla.
3. **Products**: importá o creá los productos de arriba.
4. **Entitlements** → creá uno llamado exactamente **`pro`** y asociale los dos productos de cada tienda.
5. **Offerings** → en la oferta **default** agregá dos *packages*: **Monthly** y **Annual**, cada uno con sus productos.
6. **Claves** (Project settings → API keys):
   - Clave pública de **iOS** (`appl_…`) → Vercel `NEXT_PUBLIC_REVENUECAT_IOS_KEY`
   - Clave pública de **Android** (`goog_…`) → Vercel `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`
   - Clave **secreta** (`sk_…`) → Vercel `REVENUECAT_SECRET_API_KEY`
7. **Webhook** (Integrations → Webhooks → New): URL `https://TU-DIRECCION/api/billing/webhook`. En *Authorization header* poné `Bearer ` seguido de un texto largo que inventes, y ese mismo texto (sin "Bearer") va en Vercel como `REVENUECAT_WEBHOOK_SECRET`. Tocá "Send test event": tiene que dar 200.
8. Redeploy en Vercel y `npm run native:sync`.

### F. Probar y lanzar los pagos
- **iPhone:** en App Store Connect → Usuarios y acceso → **Sandbox** creá un tester. Las compras desde TestFlight son de prueba y no cobran.
- **Android:** en Play Console → Configuración → **Pruebas de licencia** agregá tu Gmail. Las compras desde pruebas internas/cerradas no cobran.
- Probá: suscribirte, que aparezca Pro, cerrar y abrir la app, **Restaurar compras** en otro dispositivo y cancelar.
- **El día del lanzamiento:** corré `supabase/pro-lockdown.sql` (a partir de ahí nadie puede activarse Pro por su cuenta: solo el servidor, al recibir una compra real) y poné en Vercel `NEXT_PUBLIC_WEB_PRO_DEMO` = `off`. Las cuentas que ya tienen Pro de demostración **lo conservan**.
- En Xcode: target App → **Signing & Capabilities** → **➕ Capability → In-App Purchase** (un clic). El de *Push Notifications* ya viene configurado.

---

## 5. iOS (App Store)

### 5.1 Instalar lo necesario (una vez)
1. Instalá **Xcode** desde la App Store de la Mac (pesa más de 10 GB, tarda). Hoy tu Mac solo tiene las "Command Line Tools", no alcanza.
2. Abrí Xcode una vez y aceptá la licencia. Después, en la Terminal:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. En Xcode → Settings → Accounts, agregá tu Apple ID de desarrollador.

### 5.2 Probar en el simulador y en tu iPhone
```bash
npm run native:ios
```
Se abre Xcode. Arriba elegí un iPhone de simulador y tocá ▶. Después probalo en **tu iPhone real** (conectalo con cable, en el menú de dispositivos elegilo; en el iPhone: Ajustes → Privacidad y seguridad → Modo desarrollador). Probá sí o sí en el teléfono real: **grabar voz, sacar foto del plato, subir foto de perfil, crear cuenta, iniciar sesión, borrar una cuenta de prueba y modo avión** (tiene que salir "Sin conexión").

### 5.3 Firmar
En Xcode: click en **App** (arriba a la izquierda, ícono azul) → target **App** → pestaña **Signing & Capabilities** → tildá *Automatically manage signing* → elegí tu **Team**. Si da error de Bundle ID ya usado, volvé a la sección 2.

### 5.4 Crear la ficha en App Store Connect
En appstoreconnect.apple.com → Apps → ➕ Nueva app. Vas a completar:
- Nombre (AVORA), idioma principal (Español), Bundle ID (el de la lista), SKU (cualquier texto, ej. `avora-ios`).
- **Subtítulo, descripción, palabras clave, URL de soporte (`/soporte`), URL de privacidad (`/privacidad`)**.
- **Capturas de pantalla** de iPhone (verificá los tamaños que pide hoy). Sacalas desde el simulador (⌘S).
- **Categoría**: Salud y bienestar, o Productividad.
- **Clasificación por edad**: es un cuestionario. Respondé con sinceridad (no hay contenido para adultos; sí hay chat entre usuarios).
- **App Privacy** ("etiquetas de privacidad"): ver tabla en la sección 8.
- **Información para la revisión**: la cuenta de prueba de la sección 4 y el texto de la sección 9.

### 5.5 Subir la compilación
1. En Xcode, arriba elegí **Any iOS Device (arm64)**.
2. Menú **Product → Archive** (tarda).
3. Se abre el Organizer → **Distribute App → App Store Connect → Upload**.
4. A los minutos aparece en App Store Connect → TestFlight. Primero probala ahí con **TestFlight** (te llega a tu iPhone como app real).
5. Cuando esté todo bien: en la ficha, elegí esa compilación y **Enviar a revisión**. Demora entre horas y unos días. Si te rechazan, te explican el motivo y podés responder o corregir.

---

## 6. Android (Google Play)

### 6.1 Instalar lo necesario (una vez)
Instalá **Android Studio** (developer.android.com/studio). Al primer arranque deja instalar el SDK. Después abrilo.

### 6.2 Probar
```bash
npm run native:android
```
Se abre Android Studio. Esperá a que termine el "Gradle sync" (abajo, puede tardar mucho la primera vez). Creá un teléfono virtual (Device Manager) o conectá tu Android con la depuración USB activada y tocá ▶. Probá lo mismo que en iOS. **Fijate especialmente** que arriba el contenido no quede tapado por la barra de estado (en versiones recientes de Android la pantalla ocupa todo el alto): si pasa, avisame y lo ajusto.

### 6.3 Generar el archivo para subir (AAB)
1. Menú **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. **Create new…** para crear tu **llave de firma (keystore)**. Elegí una contraseña, guardá el archivo `.jks`.
3. ⚠️ **Guardá el `.jks` y las contraseñas en un lugar seguro con copia** (por ejemplo tu gestor de contraseñas y un pendrive). Si lo perdés, no podés volver a actualizar la app. **No lo subas a git.** (Play App Signing de Google guarda además la clave final, pero esta de subida igual la necesitás).
4. Elegí **release** y terminá. Te da un `app-release.aab`.

### 6.4 Play Console
1. play.google.com/console → **Crear app** (nombre AVORA, español, app gratuita).
2. Completá el panel de "Configurar tu app": **política de privacidad** (`/privacidad`), **acceso a la app** (cuenta de prueba), **anuncios** (No), **clasificación de contenido**, **público objetivo** (mayores de 13), **seguridad de los datos** (Data safety: ver sección 8), **app de salud** si te lo pregunta (declará que es de bienestar, no médica).
3. Subí el `.aab` primero en **Pruebas cerradas** (Testing → Closed testing), agregá los 12 testers por mail y esperá los 14 días.
4. Con eso cumplido, pedí **acceso a producción** y subí el mismo AAB en Producción.

---

## 7. Cómo hacer un cambio después

| Qué cambiaste | Qué hacés | ¿Pasa por las tiendas? |
|---|---|---|
| Pantallas, textos, estilos, lógica, API, base de datos, precios mostrados (los precios reales se cambian en las tiendas) | 1) `npm run check` en verde 2) commit 3) `git push` a `main` | **No.** Vercel publica y las apps lo toman solas al abrirse. |
| Permisos, ícono, nombre, pantalla de inicio, plugins de Capacitor, `capacitor.config.ts` | Ver abajo | **Sí**, versión nueva en ambas tiendas. |

Una nota de buena fe: Apple permite que la web que cargás cambie, pero **no** cambiar el propósito de la app ni agregar cosas pensadas para saltarse la revisión (por ejemplo, vender algo digital sin sus compras).

**Para sacar una versión nueva del marco:**
1. Hacé el cambio (por ejemplo `npm run native:assets` si cambiaste el ícono o `capacitor.config.ts`).
2. `npm run native:sync` (copia todo a `ios/` y `android/`).
3. **Subí el número de versión**:
   - iOS: en Xcode → target App → General → *Version* (ej. 1.1) y *Build* (ej. 2). **El Build tiene que ser mayor que el anterior** cada vez que subís.
   - Android: en `android/app/build.gradle` → `versionCode` (entero, siempre más alto) y `versionName`.
4. Repetí la sección 5.5 (iOS) y 6.3 + subir a Play (Android).

**Cambiar el ícono o la pantalla de inicio:** editá los dibujos en `scripts/native/make-icons.mjs` (o reemplazá los PNG de `resources/` por los tuyos de 1024×1024 y 2732×2732, dejando de correr el script) y corré `npm run native:assets`.
> ⚠️ Corré siempre `npm run native:assets` y **no** `capacitor-assets generate` pelado: sin las opciones que lleva el script, también pisa los íconos de la PWA en `public/`.

---

## 8. Qué declarar en las etiquetas de privacidad

Los formularios de Apple ("App Privacy") y de Google ("Seguridad de los datos") piden lo mismo con otras palabras. Declará:

| Dato | Se recopila | Para qué | Vinculado a la persona |
|---|---|---|---|
| Email, nombre, nombre de usuario | Sí | Funcionamiento de la app, cuenta | Sí |
| Foto de perfil | Sí (opcional) | Funcionamiento de la app | Sí |
| Salud y estado físico (entrenamiento, comidas/calorías, sueño, peso) | Sí | Funcionamiento de la app | Sí |
| Audio (voz) | Se procesa, no se guarda | Funcionamiento de la app (se envía a OpenAI para transcribir) | No se almacena |
| Fotos (de comida) | Se procesan, no se guardan | Funcionamiento de la app (se envía a OpenAI) | No se almacena |
| Mensajes (chat entre amigos) | Sí | Funcionamiento de la app | Sí |
| Comentarios al equipo | Sí | Funcionamiento de la app | Sí |
| Identificador del dispositivo (token de notificaciones) | Sí | Funcionamiento de la app (avisos push) | Sí |
| Historial de compras / estado de suscripción | Sí | Funcionamiento de la app (RevenueCat, Apple/Google) | Sí |

- **Rastreo (tracking): No.** No hay publicidad ni analítica de terceros.
- **Datos compartidos con terceros:** OpenAI (IA), RevenueCat (suscripciones), Supabase y Vercel (infraestructura), y Apple/Google (avisos y pagos).
- **Cifrado en tránsito:** Sí. **Se puede pedir borrar los datos:** Sí (Configuración → Eliminar mi cuenta).
- Revisá estas respuestas contra lo que diga `/privacidad` en el momento de enviar: tienen que coincidir.

---

## 9. Texto sugerido para "Notas para el revisor"

> AVORA es una app de seguimiento de hábitos personales (entrenamiento, alimentación, sueño, foco, lectura y objetivos) con un puntaje diario. Para probarla, entrá con la cuenta de prueba indicada (ya tiene datos de ejemplo y todas las funciones desbloqueadas).
> - Cierre del día por voz y calorías por foto: usan el micrófono y la cámara; antes de enviar datos a OpenAI la app muestra una pantalla de permiso.
> - Eliminar cuenta: Configuración (menú del perfil) → Privacidad y cuenta → Eliminar mi cuenta.
> - Suscripción AVORA Pro (mensual y anual, renovación automática) desde la pestaña Pro; incluye "Restaurar compras". La cuenta de prueba ya tiene Pro activo; para ver el flujo de compra usar una cuenta nueva con un usuario sandbox.
> - Las estimaciones de calorías y los planes son orientativos y no reemplazan el consejo de un profesional de la salud.



---

## 10. Checklist final

- [ ] Cuenta de Apple Developer aprobada
- [ ] Cuenta de Google Play aprobada y 12 testers consiguidos
- [ ] `supabase/delete-account.sql` corrido y probado con una cuenta de prueba
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL` y `NEXT_PUBLIC_SITE_URL` en Vercel
- [ ] Código publicado en `main` y `/privacidad`, `/terminos`, `/soporte` abren
- [ ] Cuenta de prueba para revisores creada (con datos y Pro)
- [ ] SQL de la sección 4b corridos (`push-devices`, `billing`) y claves de APNs, Firebase y RevenueCat en Vercel con Redeploy
- [ ] Productos de suscripción creados en App Store Connect y Play Console, y conectados a RevenueCat (entitlement `pro`)
- [ ] Compra de prueba, restaurar y cancelar funcionando en iPhone y Android; webhook de RevenueCat devuelve 200
- [ ] Día del lanzamiento: `pro-lockdown.sql` corrido y `NEXT_PUBLIC_WEB_PRO_DEMO=off`
- [ ] Texto legal revisado por alguien de confianza (lo redacté yo como borrador razonable, pero no soy abogado: ajustalo a tu situación real, y a tu país si publicás fuera de Argentina)
- [ ] Probado en iPhone real y Android real: registro, login, voz, foto, borrar cuenta, modo avión
- [ ] Capturas de pantalla y textos de las fichas listos
- [ ] iOS: Archive subido, probado en TestFlight, enviado a revisión
- [ ] Android: AAB firmado, prueba cerrada de 14 días hecha, enviado a producción
- [ ] Guardaste el `.jks` y sus contraseñas en dos lugares

---

## Glosario rápido
- **Bundle ID / applicationId:** el "DNI" único de la app (`com.avora.app`).
- **Archive:** compilar la app lista para subir (Xcode).
- **TestFlight:** la forma oficial de probar la app de iOS antes de publicarla.
- **AAB:** el archivo que se sube a Google Play (reemplazó al APK).
- **Keystore (.jks):** tu llave de firma de Android. Perderla = no poder actualizar la app.
- **Capacitor:** la herramienta que arma el "marco" nativo alrededor de la web.

import { ContactLine } from "@/features/legal/components/legal-page";

export function PrivacyContent() {
  return <>
    <p>AVORA es una aplicación de progreso personal: te ayuda a registrar y entender tu entrenamiento, alimentación, sueño, foco, lectura, agenda y objetivos. Esta política explica qué datos usamos, para qué, con quién los compartimos y qué podés hacer con ellos.</p>

    <h2>Qué datos guardamos</h2>
    <ul>
      <li><b>Tu cuenta:</b> email, nombre, nombre de usuario, foto de perfil y las prioridades que elegís al empezar.</li>
      <li><b>Lo que registrás:</b> entrenamientos y ejercicios, comidas con sus calorías y macronutrientes, plan de alimentación (edad, sexo, altura, peso, nivel de actividad, objetivos, preferencias e intolerancias), sueño, sesiones de foco, lectura, tareas, eventos del calendario, objetivos y cierres del día.</li>
      <li><b>Lo social:</b> tus amigos y grupos, los mensajes que intercambiás con ellos y tu puntaje diario y racha, que es lo único de tu actividad que ven tus amigos.</li>
      <li><b>Tus comentarios</b> si nos escribís desde la app.</li>
      <li><b>Datos del dispositivo para avisos:</b> si activás las notificaciones, la suscripción necesaria para enviártelas y tus preferencias de horarios.</li>
    </ul>
    <p>Parte de esta información (como el peso, la alimentación o el sueño) se considera dato de salud y bienestar. La usamos únicamente para darte el servicio.</p>

    <h2>Para qué los usamos</h2>
    <ul>
      <li>Mostrarte tu progreso, tu Daily Score, tus rachas y tus resúmenes.</li>
      <li>Enviarte los avisos que elegiste.</li>
      <li>Ofrecerte las funciones con inteligencia artificial que vos activás (ver más abajo).</li>
      <li>Permitir que te conectes con amigos y grupos.</li>
      <li>Mantener el servicio seguro y corregir errores.</li>
    </ul>
    <p>No vendemos tus datos, no mostramos publicidad y no te rastreamos entre otras aplicaciones o sitios.</p>

    <h2>Inteligencia artificial</h2>
    <p>Algunas funciones envían datos a <b>OpenAI</b>, un proveedor externo, solamente cuando las usás y después de que nos des tu permiso:</p>
    <ul>
      <li><b>Cierre del día y plan de dieta por voz:</b> el audio que grabás, para transcribirlo y ordenarlo.</li>
      <li><b>Calorías por foto o descripción:</b> la foto o el texto de tu comida.</li>
      <li><b>Plan de alimentación y revisión semanal:</b> los datos que cargaste para generarlos.</li>
    </ul>
    <p>Según las condiciones vigentes de OpenAI para su API, los datos enviados por este medio no se usan para entrenar sus modelos. El audio no se guarda en AVORA después de transcribirlo. Podés retirar el permiso cuando quieras desde <b>Configuración → Privacidad y cuenta</b>; las funciones con IA dejan de funcionar hasta que lo vuelvas a dar.</p>
    <p>Los resultados de la IA son orientativos y <b>no reemplazan el consejo de un médico o nutricionista</b>.</p>

    <h2>Con quién compartimos datos</h2>
    <p>Solo con los proveedores que hacen posible el servicio, que los tratan por encargo nuestro:</p>
    <ul>
      <li><b>Supabase:</b> base de datos, inicio de sesión y almacenamiento de fotos de perfil.</li>
      <li><b>Vercel:</b> alojamiento de la aplicación.</li>
      <li><b>OpenAI:</b> funciones con IA, como se explicó arriba.</li>
      <li><b>RevenueCat:</b> gestiona las suscripciones Pro (recibe tu email como identificador y el estado de la compra); el pago lo procesan Apple o Google.</li>
      <li><b>Apple y Google:</b> para enviarte notificaciones push al celular se usa un identificador del dispositivo.</li>
      <li><b>Open Library:</b> recibe el texto que escribís al buscar un libro.</li>
      <li><b>Google:</b> si elegís entrar con tu cuenta de Google en la versión web, y el servicio que recibe los comentarios que nos enviás.</li>
    </ul>
    <p>Tus amigos y los integrantes de tus grupos ven tu nombre, tu foto, tu puntaje diario y tu racha, y los mensajes que les enviás. Nada más de tu actividad.</p>

    <h2>Cuánto tiempo los conservamos</h2>
    <p>Mientras tengas tu cuenta. Si la eliminás, borramos tus datos de forma permanente (ver abajo).</p>

    <h2>Tus derechos y cómo eliminar tu cuenta</h2>
    <p>Podés ver y editar tus datos desde la app. Para <b>eliminar tu cuenta y todos tus datos</b> andá a <b>Configuración → Privacidad y cuenta → Eliminar mi cuenta</b>. Se borran tu perfil, tus registros, tus mensajes, tus amistades y tu foto, y no se pueden recuperar. También podés pedirlo escribiéndonos.</p>
    <p>Además podés pedirnos acceso, corrección o eliminación de tus datos personales. Quien reside en Argentina puede reclamar ante la Agencia de Acceso a la Información Pública, que es el órgano de control de la ley 25.326.</p>

    <h2>Seguridad</h2>
    <p>Las comunicaciones viajan cifradas y cada cuenta solo puede leer sus propios datos. Ningún sistema es infalible, pero trabajamos para proteger tu información.</p>

    <h2>Menores</h2>
    <p>AVORA no está dirigida a menores de 13 años y no recopilamos datos de ellos a sabiendas.</p>

    <h2>Cambios y contacto</h2>
    <p>Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, te avisamos en la app. Para cualquier consulta escribinos por <ContactLine />.</p>
  </>;
}

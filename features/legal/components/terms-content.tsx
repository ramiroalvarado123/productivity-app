import { ContactLine } from "@/features/legal/components/legal-page";

export function TermsContent() {
  return <>
    <p>Al crear una cuenta o usar AVORA aceptás estos términos. Si no estás de acuerdo, no uses la aplicación.</p>

    <h2>Qué es AVORA</h2>
    <p>Una herramienta para registrar y organizar tu progreso personal. Es un servicio de bienestar general: <b>no es un servicio médico ni de nutrición</b>.</p>

    <h2>Salud y bienestar</h2>
    <p>Las calorías estimadas, los planes de alimentación, las recomendaciones y las revisiones generadas con IA son orientativos y pueden contener errores. No reemplazan el diagnóstico, el tratamiento ni el consejo de un profesional de la salud. Consultá con un médico o nutricionista antes de cambiar tu alimentación o tu entrenamiento, sobre todo si tenés una condición de salud. Dejá de usar cualquier recomendación que te haga sentir mal.</p>

    <h2>Tu cuenta</h2>
    <p>Sos responsable de la información que cargás y de mantener tu contraseña en secreto. Tenés que darnos datos verdaderos y no usar la cuenta de otra persona. Podés eliminar tu cuenta cuando quieras desde Configuración.</p>

    <h2>Uso permitido</h2>
    <p>No uses AVORA para acosar o enviar contenido ilegal u ofensivo a otras personas, ni para intentar acceder a datos ajenos, interferir con el servicio o usarlo de forma automatizada. Podemos suspender cuentas que incumplan estas reglas.</p>

    <h2>Amigos, grupos y mensajes</h2>
    <p>Lo que compartís con tus amigos y grupos (tu puntaje, tu racha y tus mensajes) lo ven esas personas. Sos responsable de lo que escribís. Podés quitar amigos y salir de grupos en cualquier momento.</p>

    <h2>Planes y pagos</h2>
    <p>AVORA tiene un plan gratuito y un plan Pro con funciones adicionales. Las condiciones y los precios de las suscripciones se muestran antes de contratarlas. Las compras hechas desde las tiendas de aplicaciones se rigen también por las condiciones de Apple o Google, que son quienes cobran y gestionan los reembolsos.</p>

    <h2>Contenido y propiedad</h2>
    <p>Tus datos son tuyos. Nos das permiso para guardarlos y procesarlos únicamente para prestarte el servicio. AVORA, su diseño y su software son de sus titulares y no se pueden copiar ni revender sin permiso.</p>

    <h2>Disponibilidad y responsabilidad</h2>
    <p>Hacemos lo posible para que AVORA funcione siempre, pero se ofrece &ldquo;tal cual&rdquo; y puede tener interrupciones o errores. En la medida que la ley lo permita, no somos responsables de daños indirectos derivados del uso del servicio.</p>

    <h2>Cambios y contacto</h2>
    <p>Podemos actualizar estos términos; si el cambio es importante te avisamos en la app. Seguir usando AVORA después del cambio implica aceptarlo. Consultas: <ContactLine />.</p>
  </>;
}

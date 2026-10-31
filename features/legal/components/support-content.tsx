import { ContactLine } from "@/features/legal/components/legal-page";

export function SupportContent() {
  return <>
    <p>¿Algo no funciona o tenés una duda? Escribinos por <ContactLine /> y te respondemos lo antes posible.</p>

    <h2>Preguntas frecuentes</h2>
    <h3>¿Cómo elimino mi cuenta y mis datos?</h3>
    <p>Dentro de la app: <b>Configuración → Privacidad y cuenta → Eliminar mi cuenta</b>. Se borran tu perfil, tus registros, tus mensajes, tus amistades y tu foto de forma permanente.</p>
    <h3>No me llega el mail de confirmación</h3>
    <p>Revisá las carpetas Spam o Promociones. Si seguís sin verlo, volvé a crear la cuenta con el mismo correo o escribinos.</p>
    <h3>Olvidé mi contraseña</h3>
    <p>En la pantalla de ingreso elegí <b>Olvidé mi contraseña</b> y te enviamos un enlace para crear una nueva.</p>
    <h3>¿Cómo retiro el permiso de la IA?</h3>
    <p><b>Configuración → Privacidad y cuenta → Permiso de IA</b>.</p>
    <h3>¿Cómo cancelo mi suscripción Pro?</h3>
    <p>Las suscripciones hechas desde la App Store o Google Play se cancelan desde los ajustes de tu cuenta de Apple o de Google (en la app: Pro → Administrar suscripción). Eliminar tu cuenta de AVORA no cancela la suscripción.</p>
    <h3>Compré Pro y no se activó, o cambié de celular</h3>
    <p>Abrí Pro y tocá <b>Restaurar compras</b>. Si sigue sin aparecer, escribinos con el recibo de la compra.</p>
    <h3>No me llegan los avisos</h3>
    <p>Activalos en <b>Configuración → Notificaciones</b> y revisá que el celular los permita en sus Ajustes.</p>
  </>;
}

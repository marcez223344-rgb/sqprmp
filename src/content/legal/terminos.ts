import { brand } from "@/config/brand";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";

/**
 * Terms of service (es-419). DRAFT pending legal review (docs/DECISIONS.md D-09): the owner
 * must confirm company data, jurisdiction and consumer-law wording before public launch.
 * Version = legal.termsVersion; bump it when the text changes materially.
 */
export const termsVersion = legal.termsVersion;

export const termsMarkdown = `
## 1. Quiénes somos

**${brand.productName}** es un servicio ofrecido por **${brand.legalName}** («nosotros»), con domicilio en ${brand.legalAddress}, CUIT ${brand.taxId}. Contacto: ${brand.supportEmail}. Las facturas se emiten como monotributista (comprobante tipo C).

## 2. Qué ofrecemos

Una plataforma en línea para aprender SQL mediante lecciones, ejercicios con ejecución de consultas en un entorno aislado, cuestionarios, elementos de progreso (XP, monedas virtuales, rachas, insignias) y certificados de finalización con verificación pública.

Los certificados acreditan la finalización de contenidos dentro de la plataforma. **No son títulos oficiales** ni están reconocidos por autoridades educativas.

## 3. Cuenta

- Necesitas una cuenta de Google para ingresar. Eres responsable del acceso a tu cuenta.
- Debes tener al menos ${limits.profile.minAge} años.
- Elige un alias respetuoso. Podemos cambiar o bloquear alias ofensivos o que suplanten a otras personas.
- Una cuenta es personal e intransferible.

## 4. Plan gratuito y acceso completo

- El plan gratuito incluye las lecciones teóricas marcadas como gratuitas y los primeros ${limits.freeExerciseLimit} ejercicios que abras.
- El acceso completo se adquiere mediante un **pago único** que otorga acceso de por vida al contenido del curso vigente y a las actualizaciones que decidamos incorporar, mientras el servicio exista.
- Los precios se publican en la página de precios en la moneda indicada. Los pagos por transferencia se activan tras la verificación manual del comprobante (habitualmente dentro de las 48 horas hábiles). Los pagos con tarjeta se procesan mediante un proveedor externo que emite el comprobante correspondiente.
- Los códigos promocionales y becas son personales, tienen las condiciones indicadas al emitirlos y pueden revocarse ante uso indebido.

## 5. Derecho de arrepentimiento y reembolsos

Si el contenido no es lo que esperabas, puedes solicitar la devolución del pago dentro de los **${brand.refundDays} días corridos** desde la compra, escribiendo a ${brand.supportEmail}. Reintegramos por el mismo medio de pago cuando sea posible. Este derecho no limita los que te otorgan las normas de defensa del consumidor de tu país (en Argentina, Ley 24.240 y normas complementarias).

## 6. Uso aceptable

No está permitido:

- Compartir tu cuenta o el contenido pago con terceros, ni redistribuir lecciones, ejercicios, soluciones o datasets.
- Intentar vulnerar el entorno de ejecución de SQL, acceder a datos de otras personas o interferir con el servicio.
- Automatizar el uso de la plataforma (bots, scraping) sin autorización escrita.
- Obtener recompensas, insignias o certificados mediante trampas o manipulación técnica.

Ante infracciones podemos suspender o cerrar la cuenta y revocar certificados. En casos de fraude de pago no corresponde reembolso.

## 7. Propiedad intelectual

Lecciones, ejercicios, soluciones, datasets, marcas y diseño son propiedad de ${brand.legalName} o de sus licenciantes. Te concedemos una licencia personal, no exclusiva e intransferible para usarlos con fines de aprendizaje mientras tu cuenta esté activa. Las consultas SQL que escribes son tuyas; nos autorizas a almacenarlas para validar tus respuestas y mejorar la retroalimentación.

## 8. Disponibilidad y cambios

Trabajamos para que el servicio esté disponible de forma continua, pero puede haber interrupciones por mantenimiento o causas ajenas. Podemos modificar, agregar o retirar contenidos y funcionalidades; si retiráramos el servicio de forma definitiva, avisaremos con al menos 60 días de anticipación y ofreceremos descargar los certificados obtenidos.

## 9. Limitación de responsabilidad

El servicio se ofrece «tal cual». No garantizamos resultados laborales ni académicos. Nuestra responsabilidad total frente a ti se limita al importe que hayas pagado por el servicio, salvo en los casos en que la ley no permita esta limitación.

## 10. Datos personales

El tratamiento de tus datos se rige por la [Política de privacidad](/privacidad).

## 11. Cambios a estos términos

Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha y, si el cambio es relevante, te lo comunicaremos en la plataforma. Continuar usando el servicio implica aceptar la versión vigente.

## 12. Ley aplicable y jurisdicción

Estos términos se rigen por las leyes de la República Argentina. Para cualquier controversia serán competentes los tribunales ordinarios de ${brand.jurisdiction}, sin perjuicio de los derechos que te correspondan como consumidor en tu domicilio.

_Versión ${legal.termsVersion}._
`;

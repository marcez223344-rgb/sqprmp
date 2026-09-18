import { brand } from "@/config/brand";
import { legal } from "@/config/legal";

/**
 * Privacy policy (es-419). DRAFT pending legal review (docs/DECISIONS.md D-09). Mirrors what
 * the system actually does (docs/SECURITY.md §privacy): keep both in sync.
 */
export const privacyVersion = legal.privacyVersion;

export const privacyMarkdown = `
## 1. Responsable

**${brand.legalName}**, ${brand.legalAddress}. Contacto para privacidad: ${brand.supportEmail}.

## 2. Qué datos tratamos

| Dato | Origen | Para qué |
| --- | --- | --- |
| Nombre, correo y avatar de tu cuenta de Google | Google, al ingresar | Crear e identificar tu cuenta |
| Nombre para mostrar, alias, avatar elegido, país, año de nacimiento, género (opcional), nivel de SQL, objetivo, meta semanal | Tú, al registrarte | Personalizar la experiencia y verificar la edad mínima |
| Consultas SQL que escribes, intentos, pistas usadas, resultados de cuestionarios, progreso, XP, monedas, rachas e insignias | Tu uso de la plataforma | Validar respuestas, darte retroalimentación y registrar tu progreso |
| Compras, comprobantes de transferencia, códigos canjeados | Tú y los proveedores de pago | Otorgar el acceso comprado, facturación y prevención de fraude |
| Certificados emitidos (nombre impreso, fecha, ruta) | La plataforma | Emitir y permitir la verificación pública por código |
| Eventos de uso (páginas de la app, ejercicios iniciados, quizzes enviados) sin contenido de consultas ni datos sensibles | La plataforma | Medir y mejorar el producto (analítica propia, sin terceros) |
| Registros técnicos (dirección IP anonimizada, navegador, errores) | Tu navegador y nuestros servidores | Seguridad, límites de uso y diagnóstico |

No tratamos datos de tarjetas: los pagos con tarjeta se realizan en la plataforma del proveedor de pago, que nos informa solo el estado de la operación.

## 3. Base legal

Tratamos tus datos para prestar el servicio que contratas (ejecución del contrato), para cumplir obligaciones legales (facturación, prevención de fraude) y, en el caso de las comunicaciones de marketing, con tu consentimiento, que puedes retirar en cualquier momento desde tu perfil.

## 4. Con quién compartimos datos

- **Proveedores de infraestructura** que procesan datos por nuestra cuenta: alojamiento de la aplicación (Vercel) y base de datos y autenticación (Supabase), con servidores fuera de Argentina (Estados Unidos), bajo cláusulas contractuales de protección de datos.
- **Google**, como proveedor de identidad al ingresar.
- **Proveedores de pago** (Hotmart para tarjetas; entidades bancarias y billeteras para transferencias), únicamente los datos necesarios para procesar la operación.
- Autoridades, cuando una norma lo exija.

No vendemos datos personales ni usamos herramientas de analítica o publicidad de terceros.

## 5. Verificación pública de certificados

Quien tenga el código de verificación de un certificado puede ver: el nombre impreso en el certificado, la ruta completada, la fecha de emisión y si el certificado está vigente o fue revocado. No se muestra tu correo ni otros datos.

## 6. Conservación

Conservamos tus datos mientras tu cuenta esté activa. Si la eliminas, borramos o anonimizamos tus datos personales dentro de los 30 días, salvo los que debamos conservar por obligaciones legales (comprobantes de compra, hasta el plazo fiscal aplicable) y los certificados emitidos, que se mantienen para poder verificarlos, con el nombre impreso que elegiste.

## 7. Tus derechos

Puedes acceder, rectificar, actualizar o suprimir tus datos, y oponerte a ciertos tratamientos. Desde tu perfil puedes editar tus datos, exportarlos o solicitar la eliminación de la cuenta; también puedes escribirnos a ${brand.supportEmail}. Respondemos dentro de los 10 días hábiles.

En Argentina, la Agencia de Acceso a la Información Pública (órgano de control de la Ley 25.326) tiene la atribución de atender denuncias y reclamos por incumplimiento de las normas de protección de datos personales.

## 8. Seguridad

Aplicamos medidas técnicas y organizativas: cifrado en tránsito, control de acceso por filas en la base de datos, entorno aislado para la ejecución de SQL (tus consultas nunca tocan la base de datos de la aplicación), registro de auditoría de acciones administrativas y revisión periódica de dependencias.

## 9. Cookies

Usamos únicamente cookies necesarias para mantener tu sesión y tus preferencias (por ejemplo, el tema claro/oscuro). No usamos cookies de seguimiento de terceros.

## 10. Menores

El servicio está dirigido a personas mayores de 18 años. Si detectamos una cuenta de una persona menor, la eliminamos.

## 11. Cambios

Publicaremos las actualizaciones de esta política con su fecha de versión. Si el cambio afecta de forma sustancial el tratamiento de tus datos, te lo comunicaremos en la plataforma.

_Versión ${legal.privacyVersion}._
`;

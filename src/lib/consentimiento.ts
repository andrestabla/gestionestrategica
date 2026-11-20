// Autorización de tratamiento de datos personales y compromiso de confidencialidad de quien entra a la plataforma
// (primer ingreso con cuenta, acceso por código o QR). La empresa cliente es la responsable del tratamiento; Algoritmo T
// S.A.S., que opera la plataforma, es el encargado. Marco legal: Colombia, Ley 1581 de 2012 y Decreto 1074 de 2015;
// Ecuador, Ley Orgánica de Protección de Datos Personales (2021). La aceptación queda con fecha y versión en la cuenta,
// y se pide de nuevo cuando cambia la versión de los documentos (src/lib/legal).
import { VERSION_ACEPTACION, PROVEEDOR } from "@/lib/legal";

export const CONSENT_VERSION = VERSION_ACEPTACION;

/** Frase corta que acompaña la casilla de aceptación. */
export const consentSummary = (company: string): string =>
  `Autorizo el tratamiento de mis datos personales (nombre, correo y mi participación) con fines exclusivamente metodológicos a favor de ${company}, responsable del tratamiento. ${PROVEEDOR.razon}, que opera la plataforma, actúa solo como encargado.`;

/** Texto completo, en párrafos. */
export const consentText = (company: string): string[] => [
  `Responsable del tratamiento: ${company}. Los datos personales que registras en esta plataforma (nombre, correo electrónico, cargo o rol y la actividad que generas en ella: evaluaciones, comentarios, decisiones) se usan únicamente con fines metodológicos del proceso de gestión estratégica de ${company}: identificarte como participante, atribuir tus aportes y consolidar los resultados y su seguimiento.`,
  `${PROVEEDOR.razon}, que desarrolla y opera la plataforma, actúa únicamente como encargado del tratamiento: la opera por cuenta de la empresa, no usa los datos para fines propios, comerciales ni de perfilamiento y no los cede a terceros. Se apoya en proveedores de infraestructura (alojamiento, base de datos, archivos, correo e inteligencia artificial) ubicados en Brasil y Estados Unidos, obligados a confidencialidad y seguridad.`,
  `Los datos se conservan mientras dure el proceso de ${company} con la plataforma y se eliminan a su cierre o a solicitud de la empresa. No cargues datos sensibles (salud, origen étnico, creencias, afiliación sindical o política) ni datos de menores de edad.`,
  "Al marcar la casilla autorizas este tratamiento de forma libre, previa, expresa e informada. Sin esa autorización no es posible registrar tu participación.",
];

/** Puntos del compromiso de confidencialidad que se aceptan junto con la autorización. */
export const compromisoPuntos = (company: string): string[] => [
  `La información que veo (estrategia, cifras, diagnósticos, decisiones e informes) es de ${company}: la uso solo para participar en su proceso y no la comparto con personas ajenas, ni en redes o herramientas externas no autorizadas.`,
  "Cuido los informes y archivos que descargo y respeto la reserva de los aportes de otras personas y de las respuestas anónimas de los equipos.",
  "Mi cuenta es personal: no comparto mi contraseña ni mis códigos, ni intento acceder a lo que mi rol no permite.",
  `Si sospecho un uso indebido de mi cuenta o una filtración, aviso de inmediato a la empresa y a ${PROVEEDOR.correo}.`,
];

/** Marco legal aplicable según el país de la empresa. */
export const consentLegal = (country?: "CO" | "EC" | string): string =>
  country === "EC"
    ? "Este tratamiento se rige por la Ley Orgánica de Protección de Datos Personales de Ecuador (2021) y su reglamento."
    : "Este tratamiento se rige por la Ley 1581 de 2012, el Decreto 1074 de 2015 y las demás normas sobre protección de datos personales (habeas data) de Colombia.";

/** Derechos del titular y cómo ejercerlos, para el aviso de primer ingreso y el perfil. */
export const consentRights = (contact: string = PROVEEDOR.correo): string =>
  `Como titular puedes conocer, actualizar y rectificar tus datos, pedir prueba de esta autorización, revocarla y solicitar la supresión de tu información. Desde «Mi perfil» puedes actualizar tus datos básicos, cambiar tu contraseña y eliminar tu cuenta, lo que borra tu información de la plataforma. También puedes escribir a ${contact}.`;

// Autorización de tratamiento de datos personales (nombre y correo) de quien entra a la
// plataforma (primer ingreso con cuenta, acceso por QR o comentarios públicos): fines
// metodológicos, a favor de la empresa cliente; 4Shine Empresas solo intermedia. Marco legal:
// Colombia, Ley 1581 de 2012 y Decreto 1377 de 2013 (habeas data); Ecuador, Ley Orgánica de
// Protección de Datos Personales (2021). El consentimiento queda con fecha y versión en la cuenta.
export const CONSENT_VERSION = "2026-11";

/** Frase corta que acompaña la casilla de aceptación. */
export const consentSummary = (company: string): string =>
  `Autorizo el tratamiento de mis datos personales (nombre y correo) con fines exclusivamente metodológicos a favor de ${company}, responsable del tratamiento. 4Shine Empresas, desarrollador y proveedor de la plataforma, actúa solo como intermediario.`;

/** Texto completo, en párrafos. */
export const consentText = (company: string): string[] => [
  `Responsable del tratamiento: ${company}. Los datos personales que registras en esta plataforma (nombre, correo electrónico y la actividad que generas en ella: evaluaciones, comentarios, decisiones) se emplean únicamente con fines metodológicos del proceso de planeación estratégica de ${company}: identificarte como participante, atribuir tus aportes y consolidar los resultados de la convención y de su seguimiento.`,
  "4Shine Empresas, desarrollador y proveedor de la plataforma, actúa únicamente como intermediario (encargado del tratamiento): opera la plataforma por cuenta de la empresa, no usa los datos para fines propios, comerciales ni de perfilamiento, y no los cede a terceros.",
  `Los datos se conservan mientras dure el proceso de gestión estratégica de ${company} y se eliminan o anonimizan a su cierre o a solicitud de la empresa. Puedes pedir el acceso, la corrección o la eliminación de tus datos a través del equipo de estrategia de ${company} o escribiendo a plataforma@algoritmot.com.`,
  "Al marcar la casilla autorizas este tratamiento de forma libre, previa, expresa e informada. Sin esa autorización no es posible registrar tu participación.",
];

/** Marco legal aplicable según el país de la empresa. */
export const consentLegal = (country?: "CO" | "EC" | string): string =>
  country === "EC"
    ? "Este tratamiento se rige por la Ley Orgánica de Protección de Datos Personales de Ecuador (2021) y su reglamento."
    : "Este tratamiento se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 y las demás normas sobre protección de datos personales (habeas data) de Colombia.";

/** Derechos del titular y cómo ejercerlos, para el aviso de primer ingreso y el perfil. */
export const consentRights = (contact = "plataforma@algoritmot.com"): string =>
  `Como titular puedes conocer, actualizar y rectificar tus datos, pedir prueba de esta autorización, revocarla y solicitar la supresión de tu información. Desde «Mi perfil» puedes actualizar tus datos básicos, cambiar tu contraseña y eliminar tu cuenta, lo que borra toda tu información de la plataforma. También puedes escribir a ${contact}.`;

// Autorización de tratamiento de datos personales (nombre y correo) de quien
// entra por QR o deja comentarios públicos: fines metodológicos, a favor de la
// empresa cliente; Algoritmo T y 4Shine Empresas solo intermedian.
export const CONSENT_VERSION = "2026-10";

/** Frase corta que acompaña la casilla de aceptación. */
export const consentSummary = (company: string): string =>
  `Autorizo el tratamiento de mis datos personales (nombre y correo) con fines exclusivamente metodológicos a favor de ${company}, responsable del tratamiento. Algoritmo T (desarrollador) y 4Shine Empresas (proveedor) actúan solo como intermediarios.`;

/** Texto completo, en párrafos. */
export const consentText = (company: string): string[] => [
  `Responsable del tratamiento: ${company}. Los datos personales que registras en esta plataforma (nombre, correo electrónico y la actividad que generas en ella: evaluaciones, comentarios, decisiones) se emplean únicamente con fines metodológicos del proceso de planeación estratégica de ${company}: identificarte como participante, atribuir tus aportes y consolidar los resultados de la convención y de su seguimiento.`,
  "Algoritmo T, desarrollador de la plataforma, y 4Shine Empresas, proveedor del servicio, actúan únicamente como intermediarios (encargados del tratamiento): operan la plataforma por cuenta de la empresa, no usan los datos para fines propios, comerciales ni de perfilamiento, y no los ceden a terceros.",
  `Los datos se conservan mientras dure el proceso de gestión estratégica de ${company} y se eliminan o anonimizan a su cierre o a solicitud de la empresa. Puedes pedir el acceso, la corrección o la eliminación de tus datos a través del equipo de estrategia de ${company} o escribiendo a plataforma@algoritmot.com.`,
  "Al marcar la casilla autorizas este tratamiento de forma libre, previa, expresa e informada. Sin esa autorización no es posible registrar tu participación.",
];

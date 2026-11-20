// ─────────────────────────────────────────────────────────────────────────────
// Documentos legales de la plataforma: una sola fuente para las páginas públicas (/privacidad, /seguridad, /legal),
// los Word que se entregan para revisión y firma (src/server/legal-docx.ts) y los textos que cada persona acepta al
// entrar. Cada documento tiene versión y fecha de vigencia; cambiar su contenido exige subir la versión.
// Las plantillas (acuerdo de confidencialidad y contrato de transmisión) llevan campos {{…}} que se llenan con los
// datos de la empresa cliente; lo que falte queda como espacio para completar a mano antes de firmar.
// ─────────────────────────────────────────────────────────────────────────────

/** Quien presta el servicio y opera la plataforma. */
export const PROVEEDOR = {
  razon: "Algoritmo T S.A.S.",
  nit: "901.449.696-2",
  domicilio: "Calle 147 # 13-84, Bogotá D. C.",
  telefono: "+57 304 454 4525",
  correo: "plataforma@algoritmot.com",
  web: "www.algoritmot.com",
  plataforma: "gestionestrategica.io",
  producto: "Gestión estratégica",
  oficial: "Andrés Tabla Rico",
  cargoOficial: "Oficial de protección de datos personales",
  representante: "Andrés Tabla Rico",
} as const;

/** Proveedores de infraestructura que tratan datos por cuenta de Algoritmo T (subencargados). */
export const SUBENCARGADOS: { nombre: string; servicio: string; datos: string; ubicacion: string; garantia: string }[] = [
  { nombre: "Vercel Inc.", servicio: "Alojamiento y ejecución de la aplicación web", datos: "Todo el tráfico de la plataforma, en tránsito y durante su procesamiento", ubicacion: "Región de São Paulo (Brasil) para la ejecución; red de entrega global", garantia: "Acuerdo de tratamiento de datos del proveedor y certificación SOC 2 Tipo II" },
  { nombre: "Neon Inc. (sobre Amazon Web Services)", servicio: "Base de datos PostgreSQL", datos: "Cuentas, catálogo estratégico, diagnósticos, decisiones, proyectos y registro de auditoría", ubicacion: "AWS sa-east-1, São Paulo (Brasil)", garantia: "Acuerdo de tratamiento de datos del proveedor; cifrado en reposo y en tránsito" },
  { nombre: "Cloudflare Inc. (R2)", servicio: "Almacenamiento de archivos", datos: "Evidencias, materiales, logos y documentos cargados", ubicacion: "Infraestructura de Cloudflare según la ubicación del depósito", garantia: "Acuerdo de tratamiento de datos del proveedor; cifrado en reposo" },
  { nombre: "Amazon Web Services Inc. (SES)", servicio: "Envío de correos transaccionales", datos: "Nombre y correo del destinatario y el contenido del aviso (accesos, códigos, recuperación de contraseña)", ubicacion: "us-east-1 (Estados Unidos)", garantia: "Acuerdo de tratamiento de datos de AWS" },
  { nombre: "OpenAI, L.L.C.", servicio: "Asistencia con inteligencia artificial (informes, validaciones y sugerencias), solo si la empresa la tiene activa", datos: "Información de negocio y resultados agregados del caso; no se envían correos ni datos de contacto de las personas", ubicacion: "Estados Unidos", garantia: "Términos de la API: los datos no se usan para entrenar modelos y se retienen hasta 30 días para control de abuso" },
];

export type Bloque = string | { lista: string[] } | { tabla: { cabeza: string[]; filas: string[][] } } | { nota: string };
export type Seccion = { id: string; titulo: string; bloques: Bloque[] };
export type DocLegal = {
  id: DocId;
  titulo: string;
  corto: string;               // nombre breve para menús
  version: string;             // AAAA-MM-DD de la versión vigente
  resumen: string;             // una o dos frases para el índice
  plantilla?: boolean;         // se firma con cada empresa: lleva campos {{…}}
  firmas?: { parte: string; campos: string[] }[];
  secciones: Seccion[];
};
export type DocId = "tratamiento" | "seguridad" | "confidencialidad" | "transmision" | "compromiso";

/** Datos con los que se llena una plantilla para una empresa. Lo que falte queda como línea para completar. */
export type DatosFirma = Partial<Record<
  "cliente" | "nit_cliente" | "domicilio_cliente" | "ciudad_cliente" | "representante_cliente" | "documento_representante" |
  "correo_cliente" | "fecha" | "domicilio_proveedor" | "telefono_proveedor" | "representante_proveedor" | "proyecto" | "vigencia_meses" | "nombre" | "correo" | "rol", string>>;

const VACIO = "__________________";
/** Reemplaza los campos {{…}} por los datos dados; los que falten quedan como línea para completar. */
export const llenar = (texto: string, d: DatosFirma = {}): string =>
  texto.replace(/\{\{([a-z_]+)\}\}/g, (_, k: string) => (d as Record<string, string | undefined>)[k]?.trim() || VACIO);

export const llenarBloque = (b: Bloque, d: DatosFirma): Bloque =>
  typeof b === "string" ? llenar(b, d)
    : "lista" in b ? { lista: b.lista.map((x) => llenar(x, d)) }
    : "tabla" in b ? { tabla: { cabeza: b.tabla.cabeza, filas: b.tabla.filas.map((f) => f.map((x) => llenar(x, d))) } }
    : { nota: llenar(b.nota, d) };

export const llenarDoc = (doc: DocLegal, d: DatosFirma = {}): DocLegal => ({
  ...doc,
  titulo: llenar(doc.titulo, d),
  secciones: doc.secciones.map((s) => ({ ...s, titulo: llenar(s.titulo, d), bloques: s.bloques.map((b) => llenarBloque(b, d)) })),
  firmas: doc.firmas?.map((f) => ({ parte: llenar(f.parte, d), campos: f.campos.map((c) => llenar(c, d)) })),
});

/** Fecha legible: «20 de noviembre de 2026». */
export const fechaLarga = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

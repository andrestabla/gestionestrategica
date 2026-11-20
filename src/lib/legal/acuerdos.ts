// Acuerdos firmados con cada empresa cliente (Administración → Acuerdos): los datos con que se llenan las plantillas
// y el estado de cada acuerdo (pendiente, enviado, firmado), con la fecha, quién firmó y la copia firmada en PDF.
// Reglas puras; el servidor lo guarda en la empresa (Company.acuerdos).

import type { DatosFirma } from "./base";

export const ACUERDOS_EMPRESA = ["confidencialidad", "transmision"] as const;
export type AcuerdoId = (typeof ACUERDOS_EMPRESA)[number];
export const esAcuerdoId = (x: unknown): x is AcuerdoId => typeof x === "string" && (ACUERDOS_EMPRESA as readonly string[]).includes(x);

export type EstadoAcuerdo = "pendiente" | "enviado" | "firmado";
export const ESTADOS_ACUERDO: { id: EstadoAcuerdo; label: string }[] = [
  { id: "pendiente", label: "Pendiente" }, { id: "enviado", label: "Enviado para firma" }, { id: "firmado", label: "Firmado" },
];

export type ArchivoAcuerdo = { key: string; name: string; size: number; at: string; by: string };
export type RegistroAcuerdo = {
  estado: EstadoAcuerdo;
  version?: string;        // versión del modelo enviada o firmada
  fecha?: string;          // AAAA-MM-DD de la firma
  firmante?: string;       // quién firmó por la empresa
  archivo?: ArchivoAcuerdo;
  at: string; by: string;
};

/** Datos de la empresa para llenar los acuerdos. */
export const CAMPOS_FIRMA = [
  { key: "cliente", label: "Razón social", ph: "Andina Suministros S.A.S." },
  { key: "nit_cliente", label: "NIT", ph: "900.000.000-0" },
  { key: "domicilio_cliente", label: "Domicilio (dirección y ciudad)", ph: "Calle 00 # 00-00, Bogotá D. C." },
  { key: "ciudad_cliente", label: "Ciudad de firma", ph: "Bogotá D. C." },
  { key: "representante_cliente", label: "Representante legal", ph: "Nombre completo" },
  { key: "documento_representante", label: "Documento del representante", ph: "C. C. 00.000.000" },
  { key: "correo_cliente", label: "Correo para notificaciones", ph: "juridica@empresa.com" },
  { key: "proyecto", label: "Nombre del proceso", ph: "Planeación estratégica 2027" },
] as const satisfies readonly { key: keyof DatosFirma; label: string; ph: string }[];
export type CampoFirma = (typeof CAMPOS_FIRMA)[number]["key"];
export type DatosEmpresaFirma = Partial<Record<CampoFirma, string>>;

export type Acuerdos = { datos?: DatosEmpresaFirma; docs?: Partial<Record<AcuerdoId, RegistroAcuerdo>> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida los datos de firma enviados por la administración (todos opcionales). */
export function parseDatosFirma(input: unknown): { ok: true; datos: DatosEmpresaFirma } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Envía los datos de la empresa para los acuerdos." };
  const o = input as Record<string, unknown>, datos: DatosEmpresaFirma = {};
  for (const c of CAMPOS_FIRMA) {
    const v = str(o[c.key], 200);
    if (!v) continue;
    if (c.key === "correo_cliente" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, error: "El correo para notificaciones no es válido." };
    datos[c.key] = v;
  }
  return { ok: true, datos };
}

/** Valida un cambio de estado de un acuerdo. */
export function parseEstado(input: unknown): { ok: true; estado: EstadoAcuerdo; fecha?: string; firmante?: string } | { ok: false; error: string } {
  const o = (input ?? {}) as Record<string, unknown>;
  const estado = o.estado;
  if (estado !== "pendiente" && estado !== "enviado" && estado !== "firmado") return { ok: false, error: "Estado inválido: pendiente, enviado o firmado." };
  if (estado !== "firmado") return { ok: true, estado };
  const fecha = str(o.fecha, 10), firmante = str(o.firmante, 120);
  if (!FECHA_RE.test(fecha) || Number.isNaN(Date.parse(fecha))) return { ok: false, error: "Indica la fecha de la firma." };
  if (firmante.length < 3) return { ok: false, error: "Indica quién firmó por la empresa." };
  return { ok: true, estado, fecha, firmante };
}

/** Lee lo guardado en la base, descartando lo que no tenga la forma esperada. */
export function readAcuerdos(raw: unknown): Acuerdos | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const d = parseDatosFirma(o.datos ?? {});
  const docs: Acuerdos["docs"] = {};
  const fuente = (o.docs ?? {}) as Record<string, unknown>;
  for (const id of ACUERDOS_EMPRESA) {
    const r = fuente[id] as RegistroAcuerdo | undefined;
    if (r && (r.estado === "pendiente" || r.estado === "enviado" || r.estado === "firmado") && typeof r.at === "string") docs[id] = r;
  }
  const out: Acuerdos = {};
  if (d.ok && Object.keys(d.datos).length) out.datos = d.datos;
  if (Object.keys(docs).length) out.docs = docs;
  return out.datos || out.docs ? out : undefined;
}

/** Datos con que se llena una plantilla para la empresa: lo registrado y, si falta la razón social, el nombre de la empresa. */
export const datosFirmaDe = (empresa: { name: string; city?: string }, a?: Acuerdos, extra: DatosFirma = {}): DatosFirma => ({
  cliente: a?.datos?.cliente || empresa.name,
  ...(empresa.city ? { ciudad_cliente: empresa.city } : {}),
  ...a?.datos,
  ...extra,
});

import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { acuerdosOf, aceptacionesEmpresa, catalog, setDatosAcuerdos, setEstadoAcuerdo } from "@/server/store";
import { ACUERDO_CONFIDENCIALIDAD, CONTRATO_TRANSMISION, COMPROMISO_CONFIDENCIALIDAD, datosFirmaDe, esAcuerdoId } from "@/lib/legal";
import { CONSENT_VERSION } from "@/lib/consentimiento";
import { can } from "@/lib/permissions";

// Administración → Acuerdos (equipo consultor, manage_users).
// GET /api/td/acuerdos — datos de firma, estado de cada acuerdo, modelos vigentes y registro de aceptaciones de la empresa.
// PUT /api/td/acuerdos { datos } — guarda los datos de la empresa para llenar los acuerdos.
//     { doc, estado, fecha?, firmante? } — cambia el estado de un acuerdo (firmado exige fecha y firmante).
const VERSIONES = { confidencialidad: ACUERDO_CONFIDENCIALIDAD.version, transmision: CONTRATO_TRANSMISION.version } as const;

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Los acuerdos los administra el equipo consultor." }, { status: 403 });
  const a = acuerdosOf();
  const ac = aceptacionesEmpresa(user);
  return NextResponse.json({
    acuerdos: a ?? {},
    datos: datosFirmaDe(catalog().company, a),
    modelos: [ACUERDO_CONFIDENCIALIDAD, CONTRATO_TRANSMISION, COMPROMISO_CONFIDENCIALIDAD].map((d) => ({ id: d.id, corto: d.corto, version: d.version, resumen: d.resumen })),
    vigente: CONSENT_VERSION,
    aceptaciones: ac.ok ? ac.filas : [],
  });
});

export const PUT = withTenant(async (req: Request, _ctx: unknown, user) => {
  const body = await req.json().catch(() => null) as { datos?: unknown; doc?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  if ("datos" in body) {
    const r = setDatosAcuerdos(user, body.datos);
    return r.ok ? NextResponse.json({ acuerdos: r.acuerdos, datos: datosFirmaDe(catalog().company, r.acuerdos) }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (!esAcuerdoId(body.doc)) return NextResponse.json({ error: "Indica el acuerdo: confidencialidad o transmision." }, { status: 400 });
  const r = setEstadoAcuerdo(user, body.doc, body, VERSIONES[body.doc]);
  return r.ok ? NextResponse.json({ acuerdos: r.acuerdos }) : NextResponse.json({ error: r.error }, { status: r.status });
});

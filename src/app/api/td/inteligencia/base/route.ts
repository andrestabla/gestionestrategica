import { NextResponse } from "next/server";
import { withTenant } from "../../_helpers";
import { lineasMadurez } from "@/server/store";
import { baseEmpresa, estadoBase, investigarIndustria, quitarInvestigacion } from "@/server/inteligencia-base";

// Base de Inteligencia de la empresa.
// GET  /api/td/inteligencia/base — la base de hechos (curada del sector + investigada para su industria), su estado
//      (cuándo se investigó, con qué modelo, si quedó desactualizada) y las líneas con que se clasifica lo digital.
// POST /api/td/inteligencia/base — investiga la industria con el modelo y búsqueda en la web y reemplaza la base
//      investigada. Solo el advisor o el administrador.
// DELETE /api/td/inteligencia/base — quita la base investigada: queda solo la curada del sector.
export const maxDuration = 300;

const puede = (role: string) => role === "ADMIN" || role === "CONSULTOR";
const cuerpo = (role: string) => ({ ...estadoBase(), base: baseEmpresa(), lineas: lineasMadurez(), puedeActualizar: puede(role) });

export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => NextResponse.json(cuerpo(user.role)));

export const POST = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NextResponse.json({ error: "La base de Inteligencia la actualiza el advisor." }, { status: 403 });
  const r = await investigarIndustria(user.email);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(cuerpo(user.role));
});

export const DELETE = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NextResponse.json({ error: "La base de Inteligencia la administra el advisor." }, { status: 403 });
  const r = await quitarInvestigacion(user.email);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(cuerpo(user.role));
});

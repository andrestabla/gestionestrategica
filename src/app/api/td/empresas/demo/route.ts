import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies } from "@/server/store";
import { crearDemoSiegfried } from "@/server/demo-siegfried";

// POST /api/td/empresas/demo { recrear?: boolean } — crea la instancia «TEST SIEGFRIED» con todo el recorrido hecho.
// Solo el administrador de la plataforma.
export const maxDuration = 120;
export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can(user, "manage_companies")) return NextResponse.json({ error: "Solo el administrador de la plataforma crea la instancia demo." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const r = await crearDemoSiegfried(user, { recrear: body?.recrear === true });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r, { status: 201 });
}

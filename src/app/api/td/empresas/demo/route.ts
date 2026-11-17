import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { hydrateCompanies, sesionVigente } from "@/server/store";
import { crearDemoSiegfried } from "@/server/demo-siegfried";
import { crearDemoAndina } from "@/server/demo-andina";

// POST /api/td/empresas/demo { demo?: "siegfried" | "andina", recrear?: boolean } — construye una instancia demo con todo
// el recorrido hecho: «DEMO SIEGFRIED» (por defecto, uso interno) o Andina Suministros (caso ficticio para clientes
// potenciales; se reinicia conservando sus cuentas). Solo el administrador de la plataforma.
export const maxDuration = 300;
export async function POST(req: Request) {
  await hydrateCompanies();
  const user = await getSession();
  if (!user || !(await sesionVigente(user)).ok) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!can(user, "manage_companies")) return NextResponse.json({ error: "Solo el administrador de la plataforma crea las instancias demo." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const opts = { recrear: body?.recrear === true, archivos: true };
  const r = body?.demo === "andina" ? await crearDemoAndina(user, opts) : await crearDemoSiegfried(user, opts);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r, { status: 201 });
}

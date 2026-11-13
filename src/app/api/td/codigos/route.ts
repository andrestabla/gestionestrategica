import { NextResponse } from "next/server";
import { withTenant } from "../_helpers";
import { crearCodigo, listarCodigos, codigoDe, anularCodigoAcceso, companyBySlug } from "@/server/store";
import { enviarCodigoAcceso, enlaceCodigo } from "@/server/codigos";
import { originOf } from "@/app/api/td/convencion/acceso/route";
import { estadoCodigo, formatoCodigo, type CodigoAcceso } from "@/lib/codigos";

// Códigos de acceso a los diagnósticos (administrador y advisor).
// GET   /api/td/codigos — los códigos generados (el admin, todos; el advisor, los suyos), con su estado.
// POST  /api/td/codigos { name, email, organization?, scope } — genera el código y lo envía al correo de la persona.
// PATCH /api/td/codigos { id, accion: "reenviar" | "anular" } — vuelve a enviar el correo o anula un código sin usar.
const puede = (role: string) => role === "ADMIN" || role === "CONSULTOR";
const NO = () => NextResponse.json({ error: "Los códigos de acceso los administra el administrador o el advisor." }, { status: 403 });
const vista = (c: CodigoAcceso, origin: string) => ({ ...c, codigo: formatoCodigo(c.code), estado: estadoCodigo(c), enlace: enlaceCodigo(origin, c), empresa: c.companySlug ? companyBySlug(c.companySlug)?.name ?? c.companySlug : null });

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NO();
  const origin = originOf(req);
  return NextResponse.json({ codigos: (await listarCodigos(user)).map((c) => vista(c, origin)) });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NO();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const r = await crearCodigo(user, body ?? {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const origin = originOf(req), e = await enviarCodigoAcceso(r.codigo, origin);
  // el código queda creado aunque el correo falle: se puede reenviar o copiar para entregarlo por otro medio
  return NextResponse.json({ codigo: vista(e.ok ? e.codigo : r.codigo, origin), enviado: e.ok, ...(e.ok ? {} : { aviso: `El código se generó, pero el correo no se pudo enviar: ${e.error}` }) }, { status: 201 });
});

export const PATCH = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!puede(user.role)) return NO();
  const body = await req.json().catch(() => null) as { id?: unknown; accion?: unknown } | null;
  const id = String(body?.id ?? ""), origin = originOf(req);
  if (body?.accion === "anular") {
    const r = await anularCodigoAcceso(user, id);
    return r.ok ? NextResponse.json({ codigo: vista(r.codigo, origin) }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (body?.accion === "reenviar") {
    const c = await codigoDe(user, id);
    if (!c) return NextResponse.json({ error: "Ese código no existe o lo generó otra persona." }, { status: 404 });
    const estado = estadoCodigo(c);
    if (estado !== "enviado" && estado !== "sin_enviar") return NextResponse.json({ error: estado === "usado" ? "El código ya se usó." : estado === "vencido" ? "El código venció: genera uno nuevo." : "El código está anulado: genera uno nuevo." }, { status: 422 });
    const e = await enviarCodigoAcceso(c, origin);
    return e.ok ? NextResponse.json({ codigo: vista(e.codigo, origin), enviado: true }) : NextResponse.json({ error: e.error }, { status: 503 });
  }
  return NextResponse.json({ error: "Indica la acción: reenviar o anular." }, { status: 400 });
});

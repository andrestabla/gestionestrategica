import { NextResponse, after } from "next/server";
import { consultarCodigo, canjearCodigo, entrarConCodigo, hydrateCompanies, hydrateFromDb } from "@/server/store";
import { setSession } from "@/lib/session";
import { runWithTenant } from "@/server/tenant";
import { investigarIndustria } from "@/server/inteligencia-base";
import { iaDisponible } from "@/server/ia";
import { ALCANCES, formatoCodigo } from "@/lib/codigos";
import { enmascarar } from "@/lib/dos-pasos";
import { frenado, ipDe } from "@/server/freno";

// POST /api/auth/codigo-acceso — uso de un código de acceso a los diagnósticos (página pública /codigo).
//   { codigo }                                   consulta el código: a quién pertenece, qué incluye y si ya se usó.
//   { codigo, accion: "registrar", organizacion… } crea el espacio de la organización y abre la sesión de la persona.
//   { codigo, accion: "entrar" }                 vuelve a entrar con un código ya usado.
// El espacio nace limitado a los diagnósticos del código; su base de Inteligencia se investiga después de responder.
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.codigo !== "string") return NextResponse.json({ error: "Escribe tu código." }, { status: 400 });
  // freno a quien pruebe códigos al azar
  if (frenado(`codigo-acceso:${ipDe(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos y vuelve a escribir tu código." }, { status: 429 });
  await hydrateCompanies();
  if (body.accion === "registrar") {
    const r = await canjearCodigo(body.codigo, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    await setSession(r.user);
    const slug = r.slug;
    after(async () => {
      try { await runWithTenant(slug, async () => { await hydrateFromDb(); if (iaDisponible()) await investigarIndustria("plataforma"); }); }
      catch (e) { console.error("[4shine] base de inteligencia al usar un código:", (e as Error).message); }
    });
    return NextResponse.json({ ok: true, next: r.next });
  }
  if (body.accion === "entrar") {
    const r = await entrarConCodigo(body.codigo);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    await setSession(r.user);
    return NextResponse.json({ ok: true, next: r.next });
  }
  const q = await consultarCodigo(body.codigo);
  if (!q.ok) return NextResponse.json({ error: q.error }, { status: q.status });
  const c = q.codigo;
  return NextResponse.json({ ok: true, estado: q.estado, codigo: formatoCodigo(c.code), nombre: c.name, correo: enmascarar(c.email), organizacion: c.organization ?? "", invita: c.createdByName,
    alcance: ALCANCES.filter((a) => c.scope.includes(a.id)).map((a) => ({ id: a.id, label: a.label })), vence: c.expiresAt });
}

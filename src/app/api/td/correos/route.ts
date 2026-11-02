import { NextResponse } from "next/server";
import { withTenant, inTenant } from "../_helpers";
import { getUsers, companyBySlug, listMailLog, listCompanies } from "@/server/store";
import { can } from "@/lib/permissions";
import { sendMail, mailConfigured } from "@/server/mail";
import { renderLibre } from "@/lib/plantillas-correo";
import { originOf } from "@/app/api/td/convencion/acceso/route";

// GET  /api/td/correos[?empresa=slug&limit=] — registro de envíos (admin: todos o por empresa; advisor: su empresa).
// POST /api/td/correos — correo nuevo: { modo: "directo", para: ["a@x.co", …] } o { modo: "empresa", empresa: slug, roles?: [...] },
//      con subject y body (misma sintaxis de las plantillas; variables {{nombre}}, {{empresa}}, {{correo}}).
export const maxDuration = 60;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES = ["ADMIN", "CONSULTOR", "LIDER", "RESPONSABLE", "DIRECTIVO"];

export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  const url = new URL(req.url);
  const pedida = url.searchParams.get("empresa");
  const companySlug = user.role === "ADMIN" ? (pedida || null) : (user.company?.slug ?? null);
  const limit = Number(url.searchParams.get("limit") ?? 200) || 200;
  const envios = await listMailLog({ limit, companySlug });
  return NextResponse.json({ envios, configurado: mailConfigured(), empresas: user.role === "ADMIN" ? listCompanies().map((c) => ({ slug: c.slug, name: c.name, active: c.active })) : [] });
});

export const POST = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  if (!mailConfigured()) return NextResponse.json({ error: "El envío de correo no está configurado (Administración → Integraciones → AWS SES)." }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const subject = String(body.subject ?? "").trim(), texto = String(body.body ?? "").trim();
  if (!subject || subject.length > 200) return NextResponse.json({ error: "El asunto es obligatorio (máximo 200 caracteres)." }, { status: 422 });
  if (!texto || texto.length > 6000) return NextResponse.json({ error: "El cuerpo es obligatorio (máximo 6.000 caracteres)." }, { status: 422 });

  type Dest = { email: string; nombre: string; empresa: string; companySlug: string | null };
  let destinatarios: Dest[] = []; let kind: "directo" | "grupal" = "directo"; let companyName = user.company?.name ?? "";
  if (body.modo === "empresa") {
    kind = "grupal";
    const slug = String(body.empresa ?? user.company?.slug ?? "");
    if (user.role !== "ADMIN" && slug !== user.company?.slug) return NextResponse.json({ error: "Solo puedes escribir a tu empresa." }, { status: 403 });
    const c = companyBySlug(slug); if (!c) return NextResponse.json({ error: "La empresa no existe." }, { status: 404 });
    companyName = c.name;
    const roles: string[] = Array.isArray(body.roles) ? body.roles.filter((r: unknown) => ROLES.includes(String(r))) : [];
    const users = await inTenant(slug, async () => getUsers());
    destinatarios = users.filter((u) => u.active && (!roles.length || roles.includes(u.role))).map((u) => ({ email: u.email, nombre: u.name, empresa: c.name, companySlug: c.slug }));
  } else {
    const lista: string[] = Array.isArray(body.para) ? body.para : String(body.para ?? "").split(/[\s,;]+/);
    const correos = [...new Set(lista.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
    const malos = correos.filter((x) => !EMAIL.test(x));
    if (!correos.length) return NextResponse.json({ error: "Indica al menos un destinatario." }, { status: 422 });
    if (malos.length) return NextResponse.json({ error: `Correo no válido: ${malos.slice(0, 3).join(", ")}` }, { status: 422 });
    // si el destinatario es una cuenta de la empresa activa, se personaliza con su nombre
    const propios = getUsers();
    destinatarios = correos.map((email) => { const u = propios.find((x) => x.email.toLowerCase() === email); return { email, nombre: u?.name ?? email.split("@")[0], empresa: companyName || "4Shine Empresas", companySlug: u ? (user.company?.slug ?? null) : null }; });
  }
  if (!destinatarios.length) return NextResponse.json({ error: "No hay destinatarios activos con ese criterio." }, { status: 422 });
  if (destinatarios.length > 200) return NextResponse.json({ error: "Máximo 200 destinatarios por envío." }, { status: 422 });

  const origin = originOf(req);
  const enviados: string[] = []; const fallidos: { to: string; error: string }[] = [];
  for (const d of destinatarios) {
    const m = renderLibre({ subject, body: texto }, { nombre: d.nombre, empresa: d.empresa, correo: d.email, enlace: `${origin}${d.companySlug ? `/${d.companySlug}` : ""}/login` }, { company: companyName || undefined, origin });
    const r = await sendMail({ to: d.email, subject: m.subject, text: m.text, html: m.html }, { kind, by: user.email, companySlug: d.companySlug });
    if (r.ok) enviados.push(d.email); else fallidos.push({ to: d.email, error: r.error });
  }
  return NextResponse.json({ enviados, fallidos });
});

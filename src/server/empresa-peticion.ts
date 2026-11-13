// Empresa sobre la que opera una petición a la API.
//
// Regla: una petición nunca opera sobre una empresa distinta de la que muestra la página que la originó. La sesión
// (cookie) guarda una empresa activa, pero es una sola para todas las pestañas; la página, en cambio, sabe en qué
// empresa está. Por eso manda la empresa de la petición —el prefijo de la URL (/empresa/api/…) o la que declara la
// página— y la de la sesión solo se usa cuando la petición no dice ninguna (p. ej. desde /empresas).
//
// Si la empresa pedida no es la activa de la sesión (otra pestaña la cambió), se opera sobre la pedida siempre que
// la cuenta tenga acceso a ella —el administrador de la plataforma, o una cuenta con esa empresa como principal o
// membresía, con el rol y el ámbito que tiene ALLÍ—; si no lo tiene, la petición se rechaza sin tocar nada. La
// sesión no cambia: cada pestaña sigue operando en su empresa.

import type { SessionUser } from "@/lib/session";
import { companyBySlug, membresiaEn, sesionVigente, exigeCodigoEn, hydrateCompanies } from "@/server/store";

export type EmpresaPeticion =
  | { ok: true; slug: string; actor: SessionUser }
  | { ok: false; status: number; error: string; verificar?: string; recargar?: true };

/** `url`: empresa del prefijo de la ruta (cabecera x-tenant del proxy). `pagina`: empresa de la página que lanzó la
    petición (x-tenant-pagina o Referer). `actor` es la sesión tal como opera en la empresa resuelta. */
export async function resolverEmpresa(user: SessionUser, origen: { url?: string | null; pagina?: string | null } = {}): Promise<EmpresaPeticion> {
  await hydrateCompanies();
  // la cookie va firmada, pero la cuenta pudo cambiar desde que se emitió: se vuelve a mirar en cada petición
  const vigente = await sesionVigente(user);
  if (!vigente.ok) return { ok: false, status: 401, error: vigente.error };
  const sesion = user.company?.slug ?? null;
  const pedida = origen.url ?? origen.pagina ?? null;
  const slug = pedida ?? sesion;
  if (!slug) return { ok: false, status: 409, error: user.role === "ADMIN" ? "Elige una empresa para operar." : "Tu cuenta no tiene empresa asignada." };
  const c = companyBySlug(slug);
  let actor = user;
  if (user.role !== "ADMIN") {
    // rol y ámbito son siempre los que la cuenta tiene HOY en la empresa de la petición, no los que traía la cookie
    const m = c ? membresiaEn(vigente.cuenta, slug) : null;
    if (!m) {
      if (slug === sesion) return { ok: false, status: 401, error: "Tu cuenta ya no tiene acceso a esta empresa. Vuelve a iniciar sesión." };
      if (origen.url) return { ok: false, status: 403, error: "Esta ruta es de otra empresa. Entra por el enlace de la tuya." };
      return { ok: false, status: 409, recargar: true, error: `Esta página es de otra empresa y tu sesión ${user.company ? `está ahora en «${user.company.name || user.company.slug}»` : "ya no tiene una empresa activa"}. No se hizo ningún cambio: recarga la página para continuar.` };
    }
    actor = { ...user, role: rolDeSesion(user, m), line: m.line, responsibleId: m.responsibleId };
  }
  if (slug !== sesion && c) actor = { ...actor, company: { slug: c.slug, name: c.name, shortName: c.shortName, mode: c.mode } };
  if (!c) return { ok: false, status: 409, error: slug === sesion ? "La empresa de tu sesión ya no existe." : "La empresa de esta página ya no existe." };
  if (!c.active && user.role !== "ADMIN") return { ok: false, status: 403, error: "La empresa está desactivada." };
  // acceso en dos pasos: la empresa solo admite sesiones que pasaron por el código enviado al correo
  if (exigeCodigoEn(slug) && !user.mfa) return { ok: false, status: 401, error: "Esta empresa exige el acceso en dos pasos. Vuelve a iniciar sesión para recibir el código en tu correo.", verificar: `/${slug}/login?verificar=1` };
  // el modo de la empresa viaja en la sesión; si la cookie es anterior o la empresa cambió de modo, se toma de la empresa
  if (actor.company && c.mode && actor.company.mode !== c.mode) actor = { ...actor, company: { ...actor.company, mode: c.mode } };
  return { ok: true, slug, actor };
}

/** Rol con el que opera la sesión. Es el de la cuenta, con una excepción prevista: quien entró por el QR de la
    convención como líder de su tribu edita durante esa sesión aunque su cuenta sea de miembro o de directivo, siempre
    que tenga tribu (sin tribu no habría ámbito que limitara lo que edita). */
function rolDeSesion(user: SessionUser, m: { role: SessionUser["role"]; responsibleId?: string }): SessionUser["role"] {
  if (user.qr && user.role === "LIDER" && (m.role === "RESPONSABLE" || m.role === "DIRECTIVO") && m.responsibleId) return "LIDER";
  return m.role;
}

import { NextResponse } from "next/server";
import { withTenant, inTenant } from "../../_helpers";
import { listCompanies, getUsers } from "@/server/store";
import { can } from "@/lib/permissions";

// GET /api/td/users/existentes — cuentas que ya existen en otras empresas de la plataforma (solo el administrador),
// para agregarlas a la empresa activa por membresía sin crearlas de nuevo.
export const GET = withTenant(async (_req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_companies")) return NextResponse.json({ error: "Solo el administrador de la plataforma consulta las cuentas de otras empresas." }, { status: 403 });
  const actual = user.company?.slug;
  const aqui = new Set(getUsers().map((u) => u.email.toLowerCase()));
  const out: { email: string; name: string; role: string; company: string; companyName: string }[] = [];
  for (const c of listCompanies()) {
    if (c.slug === actual || !c.active) continue;
    try {
      const us = await inTenant(c.slug, async () => getUsers());
      for (const u of us) {
        if (!u.active || u.membresia || aqui.has(u.email.toLowerCase()) || out.some((x) => x.email === u.email.toLowerCase())) continue;
        out.push({ email: u.email.toLowerCase(), name: u.name, role: u.role, company: c.slug, companyName: c.name });
      }
    } catch { /* una empresa que no hidrata no bloquea la lista */ }
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return NextResponse.json({ users: out });
});

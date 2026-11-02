import { NextResponse } from "next/server";
import { withTenant, inTenant } from "../../_helpers";
import { getUsers, companyBySlug } from "@/server/store";
import { can } from "@/lib/permissions";

// GET /api/td/correos/destinatarios?empresa=slug — cuentas activas de una empresa para un envío grupal.
// El admin de plataforma consulta cualquier empresa; el advisor, solo la suya.
export const GET = withTenant(async (req: Request, _ctx: unknown, user) => {
  if (!can(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  const slug = new URL(req.url).searchParams.get("empresa") || user.company?.slug || "";
  if (user.role !== "ADMIN" && slug !== user.company?.slug) return NextResponse.json({ error: "Solo puedes escribir a tu empresa." }, { status: 403 });
  const c = companyBySlug(slug);
  if (!c) return NextResponse.json({ error: "La empresa no existe." }, { status: 404 });
  const users = await inTenant(slug, async () => getUsers());
  return NextResponse.json({ empresa: { slug: c.slug, name: c.name }, usuarios: users.filter((u) => u.active).map((u) => ({ email: u.email, name: u.name, role: u.role })) });
});

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBranding, hydrateFromDb, hydrateCompanies, companyBySlug } from "@/server/store";
import { runWithTenant, DEFAULT_TENANT } from "@/server/tenant";

// GET /api/branding — configuración de marca PÚBLICA (el login la necesita
// antes de autenticar). Con sesión, la de la empresa activa; sin sesión, la
// de la empresa demo. No expone nada sensible.
export async function GET() {
  await hydrateCompanies();
  const user = await getSession();
  const slug = user?.company?.slug && companyBySlug(user.company.slug) ? user.company.slug : DEFAULT_TENANT;
  return runWithTenant(slug, async () => {
    await hydrateFromDb();
    return NextResponse.json({ branding: getBranding() });
  });
}

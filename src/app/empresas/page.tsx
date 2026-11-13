import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hydrateCompanies, listCompanies, tenantView, getUsers, companyBySlug, sesionVigente } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { CompanyChooser, type ChooserCompany } from "@/components/company-chooser";

// Pantalla del administrador de la plataforma: elige con qué empresa operar.
// Es la primera pantalla tras el login y a la que vuelve «Cambiar de empresa».
export default async function EmpresasPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  await hydrateCompanies();
  if (!(await sesionVigente(user)).ok) redirect("/login");
  const admin = user.role === "ADMIN";
  // quien no administra la plataforma elige solo entre las empresas a las que pertenece (si son varias)
  const mias = (user.empresas ?? []).map((e) => companyBySlug(e.slug)).filter((c): c is NonNullable<typeof c> => !!c && c.active);
  if (!admin && mias.length < 2) redirect(user.company ? `/${user.company.slug}/panel` : "/panel");
  const all = admin ? listCompanies() : mias;
  const companies: ChooserCompany[] = [];
  for (const c of all) {
    let stats = { users: 0, initiatives: 0, kpis: 0, people: 0 };
    try {
      stats = await inTenant(c.slug, async () => {
        const v = tenantView();
        return { users: getUsers().filter((u) => u.active).length, initiatives: v.catalog.initiatives.length, kpis: v.catalog.kpis.length, people: v.catalog.people.length };
      });
    } catch { /* una empresa que no hidrata no bloquea la pantalla */ }
    companies.push({
      slug: c.slug, name: c.name, shortName: c.shortName, sector: c.sector, city: c.city, department: c.department,
      country: c.country ?? "CO", currency: c.currency ?? "COP", active: c.active, template: c.template ?? "vacia", ...stats,
    });
  }
  companies.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es"));
  return <CompanyChooser companies={companies} current={user.company?.slug ?? null} userName={user.name} admin={admin} roles={admin ? undefined : Object.fromEntries((user.empresas ?? []).map((e) => [e.slug, e.role]))} />;
}

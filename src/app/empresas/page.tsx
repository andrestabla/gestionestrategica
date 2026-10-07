import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hydrateCompanies, listCompanies, tenantView, getUsers } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { CompanyChooser, type ChooserCompany } from "@/components/company-chooser";

// Pantalla del administrador de la plataforma: elige con qué empresa operar.
// Es la primera pantalla tras el login y a la que vuelve «Cambiar de empresa».
export default async function EmpresasPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/panel");
  await hydrateCompanies();
  const all = listCompanies();
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
  return <CompanyChooser companies={companies} current={user.company?.slug ?? null} userName={user.name} />;
}

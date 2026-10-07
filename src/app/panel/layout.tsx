import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell";
import { UserProvider } from "@/components/user-context";
import { hydrateCompanies, companyBySlug, listCompanies, tenantView } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { CatalogProvider } from "@/components/catalog-context";
import { emptyView } from "@/lib/vista";

// Cada sesión opera dentro de una empresa. El admin de plataforma puede no
// tener ninguna activa (p. ej. recién creada la plataforma): se le lleva a
// administrar empresas. Los demás roles sin empresa no pueden operar.
export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const user = await getSession();
  if (!user) redirect("/login");
  await hydrateCompanies();
  const company = user.company ? companyBySlug(user.company.slug) : null;
  const companies = user.role === "ADMIN" ? listCompanies().map((c) => ({ slug: c.slug, name: c.name, shortName: c.shortName, active: c.active })) : [];
  const noCompany = !company || (!company.active && user.role !== "ADMIN");
  // la vista de la empresa activa, resuelta en el servidor para esta sesión
  const view = company ? await inTenant(company.slug, async () => tenantView()) : null;
  // el proveedor envuelve también al shell (buscador, notificaciones): sin
  // empresa activa, una vista vacía deja la interfaz utilizable para el admin
  return (
    <UserProvider user={user}>
      <CatalogProvider initial={view ?? emptyView()}>
        <AppShell user={user} companies={companies}>
          {noCompany && user.role !== "ADMIN" ? (
            <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-muted">
              Tu cuenta no tiene una empresa activa asignada. Pide al administrador de la plataforma que te asigne una.
            </p>
          ) : view ? children : (
            <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-muted">
              No hay empresas activas. Crea una en Administración → Empresas.
            </p>
          )}
        </AppShell>
      </CatalogProvider>
    </UserProvider>
  );
}

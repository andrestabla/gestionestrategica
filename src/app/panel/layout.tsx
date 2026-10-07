import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell";
import { UserProvider } from "@/components/user-context";
import { hydrateCompanies, companyBySlug, listCompanies } from "@/server/store";

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
  return (
    <UserProvider user={user}>
      <AppShell user={user} companies={companies}>
        {noCompany && user.role !== "ADMIN" ? (
          <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-muted">
            Tu cuenta no tiene una empresa activa asignada. Pide al administrador de la plataforma que te asigne una.
          </p>
        ) : children}
      </AppShell>
    </UserProvider>
  );
}

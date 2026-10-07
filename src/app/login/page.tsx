import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { LoginClient, type LoginCompany } from "./login-client";

// /login (admin y acceso genérico) y /<empresa>/login (acceso de esa empresa:
// el proxy reescribe la ruta y deja la empresa en la cabecera x-tenant).
export default async function LoginPage() {
  const tenant = (await headers()).get("x-tenant");
  let company: LoginCompany | null = null;
  if (tenant) {
    await hydrateCompanies();
    const c = companyBySlug(tenant);
    if (!c || !c.active) notFound();
    company = { slug: c.slug, name: c.name, shortName: c.shortName };
  }
  return <LoginClient tenant={tenant} company={company} />;
}

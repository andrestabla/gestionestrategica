import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { LoginClient, type LoginCompany } from "./login-client";

export const metadata: Metadata = { title: "Iniciar sesión · Gestión estratégica" };

// /login (admin y acceso genérico) y /<empresa>/login (acceso de esa empresa:
// el proxy reescribe la ruta y deja la empresa en la cabecera x-tenant).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ verificar?: string }> }) {
  const tenant = (await headers()).get("x-tenant");
  let company: LoginCompany | null = null;
  if (tenant) {
    await hydrateCompanies();
    const c = companyBySlug(tenant);
    if (!c || !c.active) notFound();
    company = { slug: c.slug, name: c.name, shortName: c.shortName };
  }
  // ?verificar=1: la sesión anterior no había pasado por el código y la empresa ahora exige el acceso en dos pasos
  return <LoginClient tenant={tenant} company={company} verificar={Boolean((await searchParams).verificar)} />;
}

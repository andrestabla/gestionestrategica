import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hydrateCompanies, companyBySlug, catalog } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { accessSection, sectionOfToken } from "@/lib/acceso";
import { AccesoClient } from "./acceso-client";

// /<empresa>/acceso/<token>: el proxy deja la empresa en x-tenant. Sin empresa
// o con un token que no es de ninguna sección, no existe.
export default async function AccesoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = (await headers()).get("x-tenant");
  if (!tenant) notFound();
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) notFound();
  const section = sectionOfToken(c.access, token);
  if (!section) notFound();
  const s = accessSection(section);
  // en Priorización se elige la tribu: las que tienen iniciativas en el catálogo
  const tribes = await inTenant(c.slug, async () => { const cat = catalog(); return cat.responsibles.filter((r) => cat.initiatives.some((i) => i.ownerId === r.id)).map((r) => ({ id: r.id, name: r.dependencia || r.cargo })); });
  return <AccesoClient tenant={c.slug} token={token} company={{ name: c.name, shortName: c.shortName }} section={{ id: s.id, label: s.label, what: s.what }} tribes={tribes} />;
}

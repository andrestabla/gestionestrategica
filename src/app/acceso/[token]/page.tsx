import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hydrateCompanies, companyBySlug, catalog } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { accessSection, sectionOfToken, accessEnabled } from "@/lib/acceso";
import { AccesoClient } from "./acceso-client";

// /<empresa>/acceso/<token>: el proxy deja la empresa en x-tenant. Sin empresa
// o con un token que no es de ninguna sección, no existe.
/** El organizador desactivó el QR: nadie entra (tampoco por la URL corta) hasta que lo active de nuevo. */
export function AccesoCerrado({ name }: { name: string }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-[20px] font-extrabold text-ink">{name}</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">El acceso por QR está desactivado en este momento. El equipo organizador lo activa cuando empiece el bloque; vuelve a escanear el QR o abre el enlace de nuevo en unos minutos.</p>
    </main>
  );
}

export default async function AccesoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = (await headers()).get("x-tenant");
  if (!tenant) notFound();
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) notFound();
  const section = sectionOfToken(c.access, token);
  if (!section) notFound();
  if (!accessEnabled(c.access, section)) return <AccesoCerrado name={c.name} />;
  const s = accessSection(section);
  // en Priorización se elige la tribu: las que tienen iniciativas en el catálogo
  const tribes = await inTenant(c.slug, async () => { const cat = catalog(); return cat.responsibles.filter((r) => cat.initiatives.some((i) => i.ownerId === r.id)).map((r) => ({ id: r.id, name: r.dependencia || r.cargo })); });
  return <AccesoClient tenant={c.slug} token={token} company={{ name: c.name, shortName: c.shortName }} section={{ id: s.id, label: s.label, what: s.what }} tribes={tribes} />;
}

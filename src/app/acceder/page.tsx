import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { hydrateCompanies, companyBySlug } from "@/server/store";
import { accessEnabled } from "@/lib/acceso";
import { AccesoCerrado } from "../acceso/[token]/page";

// /<empresa>/acceder: URL corta y memorizable para quien entra desde un computador (sin escanear el QR).
// Lleva al enlace vigente del QR de la convención; si se regenera el QR, esta URL sigue valiendo.
export default async function AccederPage() {
  const tenant = (await headers()).get("x-tenant");
  if (!tenant) notFound();
  await hydrateCompanies();
  const c = companyBySlug(tenant);
  if (!c || !c.active) notFound();
  const token = c.access?.convencion?.token;
  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-[20px] font-extrabold text-ink">{c.name}</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">La convención aún no tiene el acceso activo. El equipo organizador lo habilita desde la plataforma; vuelve a intentar en unos minutos.</p>
      </main>
    );
  }
  if (!accessEnabled(c.access, "convencion")) return <AccesoCerrado name={c.name} />;
  redirect(`/${c.slug}/acceso/${token}`);
}

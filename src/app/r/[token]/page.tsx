// Informe consolidado del diagnóstico, de solo lectura y sin nombres: lo comparten el administrador o el
// advisor con el comité mediante un enlace firmado (token HMAC del secreto del servidor). Server component
// que arma las cifras y entrega el informe ejecutivo (componente cliente) con la lectura guardada.

import { notFound } from "next/navigation";
import { verifyInformeToken, splitSignedLink } from "@/lib/public-token";
import { hydrateCompanies, companyBySlug, getInforme, platformResponses } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { consolidate } from "@/lib/od";
import { datosDesdeComite } from "@/lib/informe-datos";
import { InformeEjecutivo } from "@/components/informe-ejecutivo";

export const dynamic = "force-dynamic";

export default async function InformePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = splitSignedLink(token);
  if (!link) notFound();
  const { slug, token: firma } = link;
  await hydrateCompanies();
  const company = companyBySlug(slug);
  if (!company?.active || !verifyInformeToken(slug, firma)) notFound();
  const { informe, datos } = await inTenant(slug, async () => {
    const resp = platformResponses().filter((x) => x.tipo === "f1");
    const C = consolidate(resp);
    const datos = datosDesdeComite(C.dims.map((d) => ({ code: d.code, m: d.f1, sd: d.sd1, n: resp.length })), resp.length, resp.map((x) => Object.keys(x.r).length));
    return { informe: getInforme("consolidado", "consolidado"), datos };
  });
  const fecha = informe ? new Date(informe.at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "lectura vigente";
  return (
    <main className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6">
      <InformeEjecutivo kind="consolidado" empresa={company.name} fecha={fecha} datos={datos} informe={informe?.informe ?? null}
        estado={informe ? "listo" : "pendiente"} meta={informe ? `Lectura con IA generada el ${fecha} · modelo ${informe.model} · enlace de solo lectura, sin nombres.` : "Enlace de solo lectura, sin nombres."} />
    </main>
  );
}

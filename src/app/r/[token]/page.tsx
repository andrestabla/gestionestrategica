// Informe consolidado del diagnóstico, de solo lectura y sin nombres: lo comparten el administrador o el
// advisor con el comité mediante un enlace firmado (token HMAC del secreto del servidor). Server component.

import { notFound } from "next/navigation";
import { verifyInformeToken, splitSignedLink } from "@/lib/public-token";
import { hydrateCompanies, companyBySlug, getInforme, platformResponses, f1CountForPublic } from "@/server/store";
import { inTenant } from "@/app/api/td/_helpers";
import { consolidate, recommend } from "@/lib/od";
import { CAPS, THRESHOLD, levelName } from "@/data/mapa";
import { InformeView } from "@/components/informe-ia";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const f = (x: number | null) => (x == null ? "—" : x.toFixed(2).replace(".", ","));

export default async function InformePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = splitSignedLink(token);
  if (!link) notFound();
  const { slug, token: firma } = link;
  await hydrateCompanies();
  const company = companyBySlug(slug);
  if (!company?.active || !verifyInformeToken(slug, firma)) notFound();
  const { informe, C, rec, n } = await inTenant(slug, async () => {
    const C = consolidate(platformResponses());
    return { informe: getInforme("consolidado", "consolidado"), C, rec: recommend(C), n: f1CountForPublic() };
  });
  const fecha = informe ? new Date(informe.at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <main className="mx-auto max-w-[960px] px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="kicker mb-1">Gestión estratégica · {company.name}</div>
          <h1 className="text-[24px] font-extrabold leading-tight text-ink">Informe consolidado del diagnóstico de capacidades</h1>
          <p className="mt-1 text-[13px] text-muted">Autoevaluación directiva (Fuente 1) de {n} {n === 1 ? "integrante" : "integrantes"} del comité, agregada y sin nombres{fecha ? ` · análisis del ${fecha}` : ""}. Lectura de solo consulta.</p>
        </div>
        <PrintButton />
      </header>
      <section className="panel mb-6 p-5">
        <div className="label mb-3">Las cuatro capacidades · promedio del comité</div>
        <div className="grid gap-3 sm:grid-cols-4">
          {C.caps.map((c) => { const cap = CAPS.find((x) => x.name === c.name); return (
            <div key={c.name} className="rounded-xl bg-surface-2/70 px-4 py-3">
              <div className="num text-[11px] font-bold uppercase tracking-wider text-faint">{cap?.code}</div>
              <div className="text-[14px] font-extrabold text-ink">{c.name}</div>
              <div className={`num mt-1 text-[22px] font-extrabold ${c.f1 != null && c.f1 < THRESHOLD ? "text-bad" : "text-ink"}`}>{f(c.f1)}</div>
              <div className="text-[12px] text-muted">{c.f1 != null ? levelName(c.f1) : "sin dato"}</div>
            </div>
          ); })}
        </div>
        <p className="mt-3 text-[12px] text-muted">Umbral de práctica instalada: 3,0. Nivel de acompañamiento según la regla del método: <b className="text-ink">{rec.level}</b>.</p>
      </section>
      <section className="panel mb-6 p-5">
        <div className="label mb-3">Las diecisiete dimensiones</div>
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="py-1.5">Dimensión</th><th className="py-1.5">Capacidad</th><th className="num py-1.5 text-center">Promedio</th><th className="py-1.5">Nivel</th></tr></thead>
          <tbody>{C.dims.map((d) => <tr key={d.code} className="border-t border-line"><td className="py-1.5"><b className="text-ink">{d.code}</b> · {d.name}</td><td className="py-1.5 text-muted">{CAPS.find((c) => c.n === d.line)?.name}</td><td className={`num py-1.5 text-center ${d.f1 != null && d.f1 < THRESHOLD ? "font-bold text-bad" : ""}`}>{f(d.f1)}</td><td className="py-1.5">{d.f1 != null ? levelName(d.f1) : "—"}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel p-5">
        {informe ? <InformeView informe={informe.informe} meta={`Generado el ${fecha} · modelo ${informe.model}`} /> : <p className="text-[13px] italic text-faint">El análisis con IA aún no se ha generado. El advisor lo genera desde la plataforma y aparece aquí.</p>}
      </section>
      <footer className="mt-8 text-[11px] uppercase tracking-[0.14em] text-faint">Gestión estratégica · plataforma de Algoritmo T · informe de solo lectura</footer>
    </main>
  );
}

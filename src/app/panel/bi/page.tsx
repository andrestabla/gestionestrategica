"use client";

// M7 · Inteligencia: el contexto del sector con datos reales (Supersociedades
// vía datos.gov.co) y la puerta a los observatorios de Algoritmo T. Cada
// lectura declara su fuente; el sector se configura por CIIU con el script
// scripts/sector-fetch.ts (npm run sector:fetch).

import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { fmtNum } from "@/data/demo";
import { sectorFor, fmtMillones, shortName } from "@/data/sector";
import { ExternalLink, Briefcase, Map as MapIcon, TrendingUp, FileOutput, Factory, Database } from "lucide-react";

const SOURCES = [
  {
    icon: MapIcon, title: "Territorio y demanda",
    desc: "Actividad industrial y de construcción por departamento: dónde está la demanda que la empresa aún no atiende y qué sede la cubre mejor.",
    tags: ["33 departamentos", "Licencias de construcción", "Parques industriales"],
    href: "https://www.algoritmot.com/bi/regional",
  },
  {
    icon: Briefcase, title: "Talento y empleabilidad",
    desc: "Oferta de perfiles comerciales, logísticos y administrativos en las ciudades donde opera y donde planea abrir.",
    tags: ["OLE", "DANE · GEIH"],
    href: "https://www.algoritmot.com/bi/laboral",
  },
  {
    icon: TrendingUp, title: "Señales de crecimiento",
    desc: "Importaciones de insumos industriales, precios de referencia y ciclos de compra de los sectores cliente.",
    tags: ["DIAN", "Banco de la República"],
    href: "https://www.algoritmot.com/bi/oferta",
  },
  {
    icon: FileOutput, title: "Espacio de trabajo",
    desc: "Informes propios combinando sector, territorio y los resultados del diagnóstico, exportables en PDF y CSV.",
    tags: ["Autonomía"],
    href: "https://www.algoritmot.com/bi/workspace",
  },
];

export default function BiPage() {
  const v = useCatalog();
  const company = v.catalog.company;
  const s = sectorFor(v.catalog);
  const year = s.source.cut.slice(0, 4);
  const maxDept = Math.max(...s.departments.map((d) => d.share));
  const maxSize = Math.max(...s.sizes.map((x) => x.n));
  return (
    <>
      <PageHeader kicker="M7 · Inteligencia" title={`Inteligencia del sector · ${company.sector}`}
        desc="El contexto que el diagnóstico no mide: cómo se mueve el sector, quién lo concentra, dónde está la demanda y qué talento hay disponible. Llega con datos desde el primer día, sin que la empresa tenga que aportarlos." actions={<AccessChip module="bi" />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Sociedades que reportan" value={s.n} foot={`${s.ciiu.map((c) => c.code).join(" · ")} · corte ${year}`} />
        <StatCard label="Ingresos del sector" value={s.totals.revenue / 1_000_000} decimals={1} prefix="$ " unit="billones" foot={`${s.totals.growth !== null ? `${s.totals.growth > 0 ? "+" : ""}${fmtNum(s.totals.growth, 1)} % frente a ${Number(year) - 1}` : ""}`} />
        <StatCard label="Crecimiento mediano" value={s.dist.growth.p50 ?? 0} decimals={1} unit="%" foot={`cuartiles ${fmtNum(s.dist.growth.p25 ?? 0, 1)} % y ${fmtNum(s.dist.growth.p75 ?? 0, 1)} %`} accent="linear-gradient(90deg, var(--n4), var(--n5))" />
        <StatCard label="Margen operacional mediano" value={s.dist.opMargin.p50 ?? 0} decimals={1} unit="%" foot={`margen bruto mediano ${fmtNum(s.dist.grossMargin.p50 ?? 0, 1)} %`} accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="rise rise-1">
          <CardHeader title="Concentración y tamaño" sub="participación de las mayores y sociedades por franja de ingresos" />
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Top 5", s.concentration.top5Share], ["Top 10", s.concentration.top10Share], ["Top 20", s.concentration.top20Share]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-surface-2/60 px-2 py-2.5"><div className="num text-[18px] font-extrabold text-ink">{fmtNum(v as number, 1)} %</div><div className="text-[10px] uppercase tracking-wide text-faint">{l}</div></div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {s.sizes.map((b) => (
                <div key={b.band} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-32 shrink-0 text-ink-soft">{b.band}</span>
                  <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(b.n / maxSize) * 100}%`, background: "var(--grad-brand)" }} /></div>
                  <span className="num w-8 text-right font-bold text-ink">{b.n}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10.5px] leading-snug text-faint">Sector fragmentado: las veinte mayores suman {fmtNum(s.concentration.top20Share, 0)} % de los ingresos; la mayoría factura menos de 30.000 M.</p>
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Dónde está el sector" sub="participación en ingresos por departamento del domicilio" />
          <div className="space-y-2 px-5 pb-4">
            {s.departments.slice(0, 8).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-32 shrink-0 truncate text-ink-soft">{d.name}</span>
                <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(d.share / maxDept) * 100}%`, background: "var(--cyan-deep)" }} /></div>
                <span className="num w-14 text-right font-bold text-ink">{fmtNum(d.share, 1)} %</span>
                <span className="num w-8 text-right text-faint">{d.n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rise rise-3">
          <CardHeader title="Actividades CIIU incluidas" sub="sociedades, ingresos y medianas por actividad" />
          <div className="space-y-2.5 px-5 pb-4">
            {s.byCiiu.map((c) => (
              <div key={c.code} className="rounded-xl bg-surface-2/60 px-3 py-2.5">
                <div className="flex items-center gap-2"><span className="num text-[10.5px] font-extrabold text-cyan-deep">{c.code}</span><span className="num ml-auto text-[10.5px] text-faint">{c.n} soc. · {fmtMillones(c.revenue)}</span></div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-ink">{c.name}</div>
                <div className="num mt-1 text-[10.5px] text-muted">crecimiento mediano {fmtNum(c.growthP50 ?? 0, 1)} % · margen operacional {fmtNum(c.opMarginP50 ?? 0, 1)} %</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rise rise-3 mb-5">
        <CardHeader title={`Las diez mayores del sector en ${year}`} sub="ingresos de actividades ordinarias, crecimiento y margen operacional · COP millones" />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Sociedad</th><th className="px-2 py-2">Departamento</th><th className="px-2 py-2">CIIU</th><th className="num px-2 py-2 text-right">Ingresos</th><th className="num px-2 py-2 text-right">Crecimiento</th><th className="num px-2 py-2 text-right">Margen op.</th></tr></thead>
            <tbody>
              {s.peers.slice(0, 10).map((p) => (
                <tr key={p.nit} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold text-ink" title={p.name}>{shortName(p.name, 4)}</td>
                  <td className="px-2 py-2 text-muted">{p.dept}</td>
                  <td className="num px-2 py-2 text-muted">{p.ciiu}</td>
                  <td className="num px-2 py-2 text-right font-bold text-ink">{fmtNum(p.revenue, 0)}</td>
                  <td className="num px-2 py-2 text-right" style={{ color: (p.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{p.growth !== null ? `${fmtNum(p.growth, 1)} %` : "—"}</td>
                  <td className="num px-2 py-2 text-right text-muted">{p.opMargin !== null ? `${fmtNum(p.opMargin, 1)} %` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-faint">
          <Database size={12} className="mt-0.5 shrink-0" />
          <span><b className="text-muted">{s.source.name}.</b> {s.source.note} Datasets: {s.source.datasets.map((d, i) => <span key={d.id}>{i > 0 && " · "}<a href={d.url} target="_blank" rel="noreferrer" className="text-cyan-deep hover:underline">{d.name}</a></span>)}. Consulta del {s.source.fetchedAt}; se actualiza con <code className="num">npm run sector:fetch</code>.</span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card hover className="rise rise-1 p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--navy) 100%)" }}><Factory size={20} className="text-white" /></div>
          <h3 className="mt-3.5 text-[16px] font-bold tracking-tight text-ink">Sector y competencia</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">Tamaño, crecimiento, concentración y márgenes de referencia del sector, con las sociedades que lo componen: la base del Benchmark (M2).</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{["Supersociedades", "datos.gov.co", "CIIU rev. 4"].map((t) => <span key={t} className="chip">{t}</span>)}</div>
          <a href="https://www.algoritmot.com/bi/regional" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-cyan-deep hover:underline">Abrir observatorio <ExternalLink size={13} /></a>
        </Card>
        {SOURCES.map((o, i) => (
          <Card key={o.title} hover className={`rise rise-${Math.min(i + 2, 4)} p-6`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--navy) 100%)" }}><o.icon size={20} className="text-white" /></div>
            <h3 className="mt-3.5 text-[16px] font-bold tracking-tight text-ink">{o.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{o.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{o.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
            <a href={o.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-cyan-deep hover:underline">Abrir observatorio <ExternalLink size={13} /></a>
          </Card>
        ))}
      </div>

      <p className="rise rise-4 mt-5 rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-[12.5px] leading-relaxed text-muted">
        El sector de referencia se define por los códigos CIIU de la empresa (Administración → empresa). En producción el módulo enlaza con el BI de Algoritmo T mediante inicio de sesión unificado, de modo que el equipo navega los observatorios y genera informes sin una segunda credencial.
      </p>
    </>
  );
}

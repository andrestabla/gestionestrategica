"use client";

// M7 · Inteligencia: el contexto del sector con datos reales (Supersociedades
// en Colombia, ranking de la SCVS en Ecuador), la lectura de demanda y
// competencia por territorio, y las fuentes u observatorios del país de la
// empresa. Cada lectura declara su fuente; el sector se configura por CIIU
// (scripts/sector-fetch.ts y scripts/sector_fetch_ec.py).

import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { useCatalog } from "@/components/catalog-context";
import { fmtNum } from "@/data/demo";
import { sectorFor, fmtMillones, shortName } from "@/data/sector";
import { observatoriesFor, type Observatory } from "@/data/observatorios";
import { EC_POPULATION, EC_POPULATION_SOURCE } from "@/data/demanda-ec";
import { demandByTerritory, coverage, openMarkets, competitorsByTerritory } from "@/lib/demanda";
import { ExternalLink, Briefcase, Map as MapIcon, TrendingUp, FileOutput, Factory, Database, ShieldCheck, Users } from "lucide-react";

const ICONS: Record<Observatory["icon"], typeof Factory> = { factory: Factory, map: MapIcon, briefcase: Briefcase, trend: TrendingUp, file: FileOutput, shield: ShieldCheck };
const PRESENCE_LABEL = { sede: "Sede", cobertura: "Cobertura", oportunidad: "Oportunidad", ninguna: "Sin presencia" } as const;
const PRESENCE_CLS = { sede: "chip chip-cyan", cobertura: "chip chip-ok", oportunidad: "chip chip-gold", ninguna: "chip" } as const;
const fmtPeople = (n: number) => n >= 1_000_000 ? `${fmtNum(n / 1_000_000, 2)} M` : n >= 1000 ? `${fmtNum(n / 1000, 0)} mil` : String(n);

export default function BiPage() {
  const v = useCatalog();
  const company = v.catalog.company;
  const s = sectorFor(v.catalog);
  const year = s.source.cut.slice(0, 4);
  const maxDept = Math.max(...s.departments.map((d) => d.share));
  const maxSize = Math.max(...s.sizes.map((x) => x.n));
  const isEC = company.country === "EC";
  const unitName = isEC ? "provincia" : "departamento";
  const usd = /USD/i.test(s.units);
  const observatories = observatoriesFor(company.country);
  const smallBand = s.sizes[0];
  const smallPct = s.n ? Math.round((smallBand.n / s.n) * 100) : 0;
  // demanda por territorio: con población oficial solo para Ecuador por ahora
  const demand = isEC ? demandByTerritory(EC_POPULATION, s.departments, v.catalog.territories, true) : [];
  const cov = demand.length ? coverage(demand) : null;
  const open = openMarkets(demand, 4);
  const competition = competitorsByTerritory(s.peers, v.catalog.territories, 3).filter((c) => c.count > 0);
  return (
    <>
      <PageHeader kicker="M7 · Inteligencia" title={`Inteligencia del sector · ${company.sector}`}
        desc="El contexto que el diagnóstico no mide: cómo se mueve el sector, quién lo concentra, dónde está la demanda y qué talento hay disponible. Llega con datos desde el primer día, sin que la empresa tenga que aportarlos." actions={<AccessChip module="bi" />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Sociedades que reportan" value={s.n} foot={`${s.ciiu.map((c) => c.code).join(" · ")} · corte ${year}`} />
        <StatCard label="Ingresos del sector" value={usd ? s.totals.revenue / 1000 : s.totals.revenue / 1_000_000} decimals={usd ? 2 : 1} prefix="$ " unit={usd ? "mil millones USD" : "billones"} foot={`${s.totals.growth !== null ? `${s.totals.growth > 0 ? "+" : ""}${fmtNum(s.totals.growth, 1)} % frente a ${Number(year) - 1}` : ""}`} />
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
            <p className="mt-3 text-[10.5px] leading-snug text-faint">{s.concentration.top20Share >= 60 ? "Sector concentrado" : "Sector fragmentado"}: las veinte mayores suman {fmtNum(s.concentration.top20Share, 0)} % de los ingresos y el {smallPct} % de las sociedades está en la franja «{smallBand.band}» ({s.units}).</p>
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Dónde está el sector" sub={`participación en ingresos por ${unitName} del domicilio`} />
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
        <CardHeader title={`Las diez mayores del sector en ${year}`} sub={`ingresos de actividades ordinarias, crecimiento y margen operacional · ${s.units}`} />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Sociedad</th><th className="px-2 py-2">{unitName[0].toUpperCase() + unitName.slice(1)}</th><th className="px-2 py-2">CIIU</th><th className="num px-2 py-2 text-right">Ingresos</th><th className="num px-2 py-2 text-right">Crecimiento</th><th className="num px-2 py-2 text-right">Margen op.</th></tr></thead>
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

      {/* demanda por territorio (población oficial) */}
      {cov && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Población con sede o cobertura" value={cov.coveredPct} decimals={1} unit="%" foot={`${fmtPeople(cov.covered)} habitantes en ${demand.filter((d) => d.presence === "sede" || d.presence === "cobertura").length} ${unitName}s`} accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
            <StatCard label="Población en oportunidades declaradas" value={cov.opportunityPct} decimals={1} unit="%" foot={`${fmtPeople(cov.opportunity)} habitantes en ${demand.filter((d) => d.presence === "oportunidad").length} ${unitName}s`} accent="linear-gradient(90deg, var(--gold), #a87a14)" />
            <StatCard label="Población sin presencia ni plan" value={cov.nonePct} decimals={1} unit="%" foot={`${fmtPeople(cov.none)} habitantes · ${open.map((o) => o.name).slice(0, 3).join(", ")}${open.length > 3 ? "…" : ""}`} accent="linear-gradient(90deg, var(--n4), var(--n5))" />
          </div>
          <Card className="rise rise-2 mb-5">
            <CardHeader title={`Demanda y competencia por ${unitName}`} sub={`población del censo, sociedades del sector domiciliadas allí y su facturación por habitante · ${s.units}`} />
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="px-3 py-2">{unitName[0].toUpperCase() + unitName.slice(1)}</th><th className="px-2 py-2">Presencia</th><th className="num px-2 py-2 text-right">Población</th><th className="num px-2 py-2 text-right">% nacional</th><th className="num px-2 py-2 text-right">Sociedades</th><th className="num px-2 py-2 text-right">Ingresos sector</th><th className="num px-2 py-2 text-right">USD / habitante</th></tr></thead>
                <tbody>
                  {demand.map((d) => (
                    <tr key={d.name} className={`border-t border-line ${d.presence === "ninguna" && d.population >= 400000 ? "bg-gold-wash/30" : ""}`}>
                      <td className="px-3 py-2 font-semibold text-ink">{d.name}</td>
                      <td className="px-2 py-2"><span className={`${PRESENCE_CLS[d.presence]} !py-0 text-[9.5px]`}>{PRESENCE_LABEL[d.presence]}{d.weight ? ` · peso ${d.weight}` : ""}</span></td>
                      <td className="num px-2 py-2 text-right font-bold text-ink">{fmtNum(d.population, 0)}</td>
                      <td className="num px-2 py-2 text-right text-muted">{fmtNum(d.share, 1)} %</td>
                      <td className="num px-2 py-2 text-right text-muted">{d.companies || "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{d.revenue ? fmtNum(d.revenue, 1) : "—"}</td>
                      <td className="num px-2 py-2 text-right" style={{ color: d.perCapita === null ? "var(--faint)" : d.perCapita < 20 ? "var(--ok)" : "var(--ink)" }}>{d.perCapita !== null ? fmtNum(d.perCapita, 1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-start gap-2 border-t border-line px-5 py-3 text-[11px] leading-relaxed text-faint">
              <Database size={12} className="mt-0.5 shrink-0" />
              <span><b className="text-muted">{EC_POPULATION_SOURCE.name}.</b> {EC_POPULATION_SOURCE.note} Las sociedades y sus ingresos son las del ranking de la SCVS por {unitName} del domicilio: una {unitName} con mucha población y pocos ingresos declarados del sector (en verde) es demanda atendida desde otra {unitName} o por farmacias independientes fuera del ranking. Las filas sombreadas son {unitName}s de más de 400 mil habitantes sin presencia ni plan.</span>
            </div>
          </Card>
        </>
      )}

      {/* competencia en los territorios de la empresa */}
      {competition.length > 0 && (
        <Card className="rise rise-2 mb-5">
          <CardHeader title="Competencia donde operas y donde planeas abrir" sub={`sociedades del sector domiciliadas en cada ${unitName} de tu territorio, con las tres mayores · ${s.units}`} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {competition.map(({ territory: t, count, revenue, top }) => (
              <div key={t.name} className="rounded-xl bg-surface-2/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-extrabold text-ink">{t.name}</span>
                  <span className={`${PRESENCE_CLS[t.presence]} !py-0 text-[9.5px]`}>{PRESENCE_LABEL[t.presence]}</span>
                  <span className="num ml-auto text-[10.5px] text-faint">{count} soc. · {fmtNum(revenue, 0)}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {top.map((p) => (
                    <li key={p.nit} className="flex items-center gap-2 text-[11.5px]">
                      <Users size={10} className="shrink-0 text-faint" />
                      <span className="truncate text-ink-soft" title={p.name}>{shortName(p.name, 3)}</span>
                      <span className="num ml-auto shrink-0 font-bold text-ink">{fmtNum(p.revenue, 0)}</span>
                      <span className="num w-12 shrink-0 text-right text-[10px]" style={{ color: (p.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{p.growth !== null ? `${fmtNum(p.growth, 0)} %` : "—"}</span>
                    </li>
                  ))}
                </ul>
                {t.reading && <p className="mt-2 text-[10.5px] italic leading-snug text-faint">{t.reading}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {observatories.map((o, i) => {
          const Icon = ICONS[o.icon];
          return (
            <Card key={o.title} hover className={`rise rise-${Math.min(i + 1, 4)} p-6`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--navy) 100%)" }}><Icon size={20} className="text-white" /></div>
              <h3 className="mt-3.5 text-[16px] font-bold tracking-tight text-ink">{o.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{o.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{o.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              <a href={o.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-cyan-deep hover:underline">{o.cta} <ExternalLink size={13} /></a>
            </Card>
          );
        })}
      </div>

      <p className="rise rise-4 mt-5 rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-[12.5px] leading-relaxed text-muted">
        {isEC
          ? "El sector de referencia se define por el código CIIU de la empresa (Administración → empresa). Para Ecuador el módulo enlaza con las fuentes oficiales (SCVS, INEC, ARCSA, BCE); los observatorios propios de Algoritmo T para el país se incorporarán a medida que se construyan."
          : "El sector de referencia se define por los códigos CIIU de la empresa (Administración → empresa). En producción el módulo enlaza con el BI de Algoritmo T mediante inicio de sesión unificado, de modo que el equipo navega los observatorios y genera informes sin una segunda credencial."}
      </p>
    </>
  );
}

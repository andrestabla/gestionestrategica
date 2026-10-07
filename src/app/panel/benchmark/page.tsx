"use client";

// M2 · Benchmark: la posición de la empresa frente al sector con datos reales
// de la Superintendencia de Sociedades (datos.gov.co): crecimiento, márgenes,
// rentabilidad y endeudamiento de las sociedades que reportan en su CIIU, y la
// presencia territorial frente a dónde está el sector. Los estados financieros
// de la empresa son los que declara al cierre (en demo, ilustrativos).

import { useState } from "react";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { PeerBars, PertinenceQuadrant, ColombiaImpactMap } from "@/components/charts";
import { TERRITORIES, INSTITUTION, FINANCIALS, fmtNum } from "@/data/demo";
import { SECTOR, sectorComparison, sectorQuadrant, sectorPeerBars, fmtMillones } from "@/data/sector";
import { MapPin, Building2, Target, Database } from "lucide-react";

const PRESENCE = { sede: ["Sede", "var(--navy)"], cobertura: ["Cobertura", "var(--cyan)"], oportunidad: ["Oportunidad", "var(--gold)"] } as const;

export default function BenchmarkPage() {
  const [dept, setDept] = useState<string | null>(null);
  const sector = SECTOR;
  const year = sector.source.cut.slice(0, 4);
  const byDept = Object.fromEntries(sector.departments.map((d) => [d.name, d]));
  const mapValues = Object.fromEntries(sector.departments.map((d) => [d.name, d.n]));
  const home = TERRITORIES.filter((t) => t.presence === "sede").map((t) => t.name);
  const sel = TERRITORIES.find((t) => t.name === dept);
  const selSector = dept ? byDept[dept] : null;
  const cmp = sectorComparison(sector);
  const growth = cmp.find((c) => c.key === "growth")!;
  const opm = cmp.find((c) => c.key === "opMargin")!;
  const bars = sectorPeerBars(home, sector);
  const points = sectorQuadrant(sector);
  const homeSector = sector.departments.filter((d) => home.includes(d.name));
  const sizeBand = sector.sizes.find((s) => (s.band.startsWith("10.000") && FINANCIALS.revenue >= 10000 && FINANCIALS.revenue < 30000) || (s.band.startsWith("Hasta") && FINANCIALS.revenue < 10000) || (s.band.startsWith("30.000") && FINANCIALS.revenue >= 30000 && FINANCIALS.revenue < 100000) || (s.band.startsWith("Más") && FINANCIALS.revenue >= 100000));

  return (
    <>
      <PageHeader kicker="M2 · Benchmark" title="Posición sectorial y territorio"
        desc={`${INSTITUTION.name} frente a las ${fmtNum(sector.n, 0)} sociedades del sector (${sector.ciiu.map((c) => c.code).join(", ")}) que reportan a Supersociedades (corte ${year}): cuánto crece, cuánto margen deja y dónde está el sector que compite por sus clientes.`}
        actions={<AccessChip module="benchmark" />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Sociedades del sector" value={sector.n} foot={`${sector.ciiu.map((c) => c.code).join(" · ")} · corte ${year}`} />
        <StatCard label="Crecimiento de ingresos" value={growth.value} decimals={1} unit="%" delta={growth.median !== null ? growth.value - growth.median : undefined} good={growth.better}
          foot={`mediana del sector ${fmtNum(growth.median ?? 0, 1)} % · percentil ${growth.percentile}`} />
        <StatCard label="Margen operacional" value={opm.value} decimals={1} unit="%" delta={opm.median !== null ? opm.value - opm.median : undefined} good={opm.better}
          foot={`mediana del sector ${fmtNum(opm.median ?? 0, 1)} % · percentil ${opm.percentile}`} accent="linear-gradient(90deg, var(--n4), var(--n5))" />
        <StatCard label="Competidores en sus sedes" value={homeSector.reduce((a, d) => a + d.n, 0)} foot={`${homeSector.map((d) => d.name.replace(" D.C.", "")).join(", ")} · ${fmtNum(homeSector.reduce((a, d) => a + d.share, 0), 0)} % de los ingresos del sector`} accent="linear-gradient(90deg, var(--gold), #a87a14)" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="rise rise-1">
          <CardHeader title="Dónde está el sector y dónde está la empresa" sub="intensidad: sociedades del sector por departamento · borde: sedes de la empresa · clic para leer el territorio" />
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-[300px_1fr]">
            <ColombiaImpactMap values={mapValues} selected={dept} onSelect={setDept} home={home} unit=" sociedades" />
            <div className="space-y-1.5">
              {TERRITORIES.map((t) => {
                const d = byDept[t.name];
                return (
                  <button key={t.name} onClick={() => setDept(dept === t.name ? null : t.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${dept === t.name ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                    <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRESENCE[t.presence][1] }} />
                    <span className="font-bold text-ink">{t.name}</span>
                    <span className="num ml-auto text-[10.5px] text-faint">{d ? `${d.n} soc. · ${fmtNum(d.share, 1)} %` : "sin sociedades"}</span>
                    <span className="chip">{PRESENCE[t.presence][0]}</span>
                  </button>
                );
              })}
              <div className="pt-2 text-[10.5px] text-faint">Otros departamentos con sector: {sector.departments.filter((d) => !TERRITORIES.some((t) => t.name === d.name)).slice(0, 6).map((d) => `${d.name} (${d.n})`).join(", ")}.</div>
            </div>
          </div>
          {(sel || selSector) && (
            <div className="border-t border-line px-5 py-3 text-[12.5px] text-ink-soft">
              <MapPin size={12} className="mr-1 inline text-cyan-deep" /><b>{dept}.</b> {sel?.reading}{" "}
              {selSector
                ? <span className="text-muted">En {year} reportaron allí {selSector.n} sociedades del sector con ingresos por {fmtMillones(selSector.revenue)} ({fmtNum(selSector.share, 1)} % del país).</span>
                : <span className="text-muted">Ninguna sociedad del sector reporta domicilio allí: la demanda se atiende desde otros departamentos.</span>}
            </div>
          )}
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Posición sectorial" sub={`margen operacional × crecimiento, en percentiles del sector · ${sector.comparables.length} pares de 10.000 a 100.000 M`} />
          <div className="px-4 pb-3">
            <PertinenceQuadrant points={points}
              labels={["Crece sin margen", "Crece con margen", "Estancada", "Margen sin crecimiento"]}
              axes={["Margen operacional (percentil) →", "Crecimiento (percentil) →"]} />
          </div>
          <div className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">
            {INSTITUTION.shortName} crece más que la mediana del sector (percentil {growth.percentile}) con un margen operacional por {opm.better ? "encima" : "debajo"} de la mediana (percentil {opm.percentile}): el cuadrante donde el crecimiento exige más control, más reuniones y más gente. Los frameworks de Ejecución y Multiplicación mueven el punto hacia la derecha.
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-3">
          <CardHeader title={bars.metric} sub="pares comparables con domicilio en los departamentos con sede · línea: mediana del sector" />
          <div className="px-5 pb-5"><PeerBars peers={bars.peers} nationalAvg={bars.nationalAvg} refLabel="mediana del sector" /></div>
        </Card>
        <Card className="rise rise-4">
          <CardHeader title="Razones financieras frente al sector" sub={`cierre ${FINANCIALS.year} de ${INSTITUTION.shortName} · mediana y mejor cuartil de las ${fmtNum(sector.n, 0)} sociedades`} />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Razón</th><th className="num px-2 py-2 text-right">{INSTITUTION.shortName}</th><th className="num px-2 py-2 text-right">Mediana</th><th className="num px-2 py-2 text-right">Mejor cuartil</th><th className="num px-2 py-2 text-right">Percentil</th></tr></thead>
              <tbody>
                {cmp.map((c) => (
                  <tr key={c.key} className="border-t border-line" title={c.help}>
                    <td className="px-3 py-2 text-ink">{c.name}{c.lowerIsBetter && <span className="text-[10px] text-faint"> · menos es mejor</span>}</td>
                    <td className="num px-2 py-2 text-right font-extrabold" style={{ color: c.better ? "var(--ok)" : "var(--bad)" }}>{fmtNum(c.value, 1)} {c.unit}</td>
                    <td className="num px-2 py-2 text-right text-muted">{c.median !== null ? fmtNum(c.median, 1) : "—"}</td>
                    <td className="num px-2 py-2 text-right text-muted">{c.best !== null ? fmtNum(c.best, 1) : "—"}</td>
                    <td className="num px-2 py-2 text-right">
                      <span className="inline-block h-[6px] w-16 overflow-hidden rounded-full bg-surface-2 align-middle"><span className="block h-full rounded-full" style={{ width: `${c.percentile}%`, background: c.better ? "var(--ok)" : "var(--warn)" }} /></span>
                      <span className="ml-2 font-bold text-ink">{c.percentile}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-[11.5px] text-faint">
            <span className="flex items-center gap-1"><Building2 size={12} /> {sizeBand ? `Franja de ingresos «${sizeBand.band}»: ${sizeBand.n} sociedades.` : ""}</span>
            <span className="flex items-center gap-1"><Target size={12} /> Verde: igual o mejor que la mediana.</span>
            <span className="flex items-center gap-1"><Database size={12} /> {sector.source.name} · consulta {sector.source.fetchedAt}.</span>
          </div>
        </Card>
      </div>
    </>
  );
}

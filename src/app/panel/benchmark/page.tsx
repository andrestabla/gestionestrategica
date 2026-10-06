"use client";

// M2 · Benchmark: posición sectorial frente a pares comparables y presencia
// territorial por departamento. Datos ilustrativos; en operación se alimentan
// del BI de Algoritmo T (M7) y de los registros de la empresa.

import { useState } from "react";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { PeerBars, PertinenceQuadrant, ColombiaImpactMap } from "@/components/charts";
import { TERRITORIES, BENCHMARK, QUADRANT, KPIS, INSTITUTION, fmtNum } from "@/data/demo";
import { kpiHealth } from "@/lib/logic";
import { MapPin, Building2, Target } from "lucide-react";

const PRESENCE = { sede: ["Sede", "var(--navy)"], cobertura: ["Cobertura", "var(--cyan)"], oportunidad: ["Oportunidad", "var(--gold)"] } as const;
// referencia sectorial ilustrativa para cuatro indicadores clave
const SECTOR_REF: Record<string, { peerAvg: number; best: number }> = {
  "EJE-01": { peerAvg: 84, best: 93 }, "EJE-02": { peerAvg: 4.9, best: 2.1 }, "DIR-02": { peerAvg: 25, best: 31 }, "DIR-03": { peerAvg: 58, best: 72 },
};

export default function BenchmarkPage() {
  const [dept, setDept] = useState<string | null>(null);
  const values = Object.fromEntries(TERRITORIES.map((t) => [t.name, t.weight]));
  const sel = TERRITORIES.find((t) => t.name === dept);
  const sedes = TERRITORIES.filter((t) => t.presence === "sede").length;
  return (
    <>
      <PageHeader kicker="M2 · Benchmark" title="Posición sectorial y territorio"
        desc={`${INSTITUTION.name} frente a distribuidores comparables de ${INSTITUTION.sector.toLowerCase()}: dónde está, dónde vende y qué tan lejos queda de los mejores del sector.`}
        actions={<AccessChip module="benchmark" />} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Departamentos con sede" value={sedes} foot="Bogotá, Medellín y Cali" />
        <StatCard label="Departamentos atendidos" value={TERRITORIES.filter((t) => t.presence !== "oportunidad").length} foot="con sede o cobertura desde una sede" />
        <StatCard label="Oportunidades identificadas" value={TERRITORIES.filter((t) => t.presence === "oportunidad").length} foot="demanda sin cobertura directa" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="rise rise-1">
          <CardHeader title="Presencia territorial" sub="peso comercial por departamento · clic para leer el territorio" />
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-[300px_1fr]">
            <ColombiaImpactMap values={values} selected={dept} onSelect={setDept} />
            <div className="space-y-1.5">
              {TERRITORIES.map((t) => (
                <button key={t.name} onClick={() => setDept(dept === t.name ? null : t.name)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${dept === t.name ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PRESENCE[t.presence][1] }} />
                  <span className="font-bold text-ink">{t.name}</span>
                  <span className="chip ml-auto">{PRESENCE[t.presence][0]}</span>
                </button>
              ))}
            </div>
          </div>
          {sel && <div className="border-t border-line px-5 py-3 text-[12.5px] text-ink-soft"><MapPin size={12} className="mr-1 inline text-cyan-deep" /><b>{sel.name}.</b> {sel.reading}</div>}
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Posición sectorial" sub="capacidad organizacional (madurez 4Shine) contra crecimiento" />
          <div className="px-4 pb-3"><PertinenceQuadrant points={QUADRANT.points} /></div>
          <div className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">Andina crece más que su capacidad instalada: el cuadrante donde el crecimiento exige más control, más reuniones y más gente. Los frameworks mueven el punto hacia la derecha.</div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-3">
          <CardHeader title={BENCHMARK.metric} sub="pares comparables y promedio del sector" />
          <div className="px-5 pb-5"><PeerBars peers={BENCHMARK.peers} nationalAvg={BENCHMARK.nationalAvg} /></div>
        </Card>
        <Card className="rise rise-4">
          <CardHeader title="Indicadores frente al sector" sub="último valor de Andina, promedio de pares y mejor del sector" />
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Indicador</th><th className="num px-2 py-2 text-right">Andina</th><th className="num px-2 py-2 text-right">Pares</th><th className="num px-2 py-2 text-right">Mejor</th></tr></thead>
              <tbody>
                {Object.entries(SECTOR_REF).map(([code, ref]) => {
                  const k = KPIS.find((x) => x.code === code)!; const h = kpiHealth(k);
                  const better = k.goodDirection === "up" ? h.latest >= ref.peerAvg : h.latest <= ref.peerAvg;
                  return (
                    <tr key={code} className="border-t border-line"><td className="px-3 py-2"><span className="num text-[10.5px] font-bold text-cyan-deep">{code}</span> <span className="text-ink">{k.name}</span></td><td className="num px-2 py-2 text-right font-extrabold" style={{ color: better ? "var(--ok)" : "var(--bad)" }}>{fmtNum(h.latest, 1)} {k.unit}</td><td className="num px-2 py-2 text-right text-muted">{fmtNum(ref.peerAvg, 1)}</td><td className="num px-2 py-2 text-right text-muted">{fmtNum(ref.best, 1)}</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[11.5px] text-faint"><Building2 size={12} /> Referencias ilustrativas de distribuidores regionales; en operación provienen del módulo de inteligencia. <Target size={12} className="ml-2" /> Verde: igual o mejor que los pares.</div>
        </Card>
      </div>
    </>
  );
}

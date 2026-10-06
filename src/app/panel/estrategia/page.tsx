"use client";

// M3 · Mapa estratégico: Cuadro de Mando Integral de 5 perspectivas
// (impacto → sostenibilidad → comunidad → procesos → innovación) con la
// cadena completa objetivo → KPI → capacidad → iniciativa, más el catálogo
// de capacidades con brecha y responsable.

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Card, CardHeader } from "@/components/ui";
import { AccessChip } from "@/components/user-context";
import { CAPABILITIES, KPIS, INITIATIVES, LINES, fmtNum } from "@/data/demo";
import { PERSPECTIVES, CMI_OBJECTIVES, responsible } from "@/data/cmi";
import { X, Target, Gauge, Network, ListChecks } from "lucide-react";

export default function CapacidadesPage() {
  const [objId, setObjId] = useState<string | null>("OE-10");

  const obj = objId ? CMI_OBJECTIVES.find((o) => o.id === objId) : null;
  const objKpis = obj ? KPIS.filter((k) => obj.kpis.includes(k.code)) : [];
  const objInis = obj ? INITIATIVES.filter((i) => i.cmi === obj.id) : [];
  const objCaps = obj
    ? CAPABILITIES.filter((c) => objInis.some((i) => i.capability === c.id))
    : [];

  return (
    <>
      <PageHeader kicker="M3 · Mapa estratégico" title="Cuadro de Mando Integral"
        desc="Cinco perspectivas encadenadas: el impacto se sostiene en la comunidad, la comunidad en los procesos y los procesos en la innovación. Cada objetivo declara sus indicadores, capacidades e iniciativas."  actions={<AccessChip module="capacidades" />} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── mapa por perspectivas ── */}
        <div className="min-w-0 space-y-3">
          {PERSPECTIVES.map((p, pi) => {
            const objectives = CMI_OBJECTIVES.filter((o) => o.perspective === p.id);
            return (
              <div key={p.id} className={`panel rise rise-${Math.min(pi + 1, 4)} overflow-hidden`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 pb-2 pt-3.5">
                  <span className="h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: p.color }} />
                  <span className="text-[13.5px] font-extrabold uppercase tracking-[0.08em] text-ink">{p.name}</span>
                  <span className="text-[11px] text-faint">{p.sub}</span>
                  <span className="ml-auto hidden text-[11px] text-faint sm:block">{objectives.length} objetivos</span>
                </div>
                <div className="grid gap-2 px-4 pb-4 sm:grid-cols-3">
                  {objectives.map((o) => {
                    const active = objId === o.id;
                    const inis = INITIATIVES.filter((i) => i.cmi === o.id).length;
                    return (
                      <button key={o.id} onClick={() => setObjId(active ? null : o.id)}
                        className={`rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                          active
                            ? "text-white shadow-md"
                            : "bg-surface-2 hover:bg-surface-3"
                        }`}
                        style={active ? { background: p.color } : undefined}>
                        <div className={`num text-[9.5px] font-bold ${active ? "text-white/70" : "text-faint"}`}>
                          {o.id}
                        </div>
                        <div className={`mt-0.5 text-[12px] font-semibold leading-snug ${active ? "text-white" : "text-ink"}`}>
                          {o.name}
                        </div>
                        <div className={`num mt-1.5 text-[9.5px] ${active ? "text-white/70" : "text-faint"}`}>
                          {o.kpis.length} KPI{inis > 0 ? ` · ${inis} iniciativa${inis > 1 ? "s" : ""}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── cadena del objetivo ── */}
        <div className="min-w-0 lg:sticky lg:top-[70px] lg:self-start">
          <Card className="rise rise-2">
            {!obj ? (
              <div className="px-5 py-6 text-[12.5px] italic text-faint">
                Selecciona un objetivo del mapa para ver su cadena: indicadores,
                capacidades e iniciativas que lo mueven.
              </div>
            ) : (
              <>
                <CardHeader title={obj.id} sub="Cadena del objetivo"
                  right={
                    <button onClick={() => setObjId(null)}
                      className="rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink">
                      <X size={15} />
                    </button>
                  } />
                <div className="space-y-4 px-5 pb-5">
                  <div className="flex items-start gap-2.5">
                    <Target size={15} className="mt-0.5 shrink-0 text-navy" />
                    <p className="text-[13px] font-semibold leading-snug text-ink">{obj.name}</p>
                  </div>

                  <div>
                    <div className="label mb-2 flex items-center gap-1.5">
                      <Gauge size={11} /> Indicadores
                    </div>
                    <div className="space-y-1.5">
                      {objKpis.map((k) => {
                        const last = k.series[k.series.length - 1];
                        return (
                          <Link key={k.code} href="/panel/kpi"
                            className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2 transition-colors hover:bg-cyan-wash">
                            <span className="num text-[9.5px] font-bold text-cyan-deep">{k.code}</span>
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{k.name}</span>
                            <span className="num text-[11px] font-bold text-ink">
                              {fmtNum(last.value, 1)} <span className="text-[9px] font-medium text-faint">{k.unit}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {objCaps.length > 0 && (
                    <div>
                      <div className="label mb-2 flex items-center gap-1.5">
                        <Network size={11} /> Capacidades
                      </div>
                      <div className="space-y-1.5">
                        {objCaps.map((c) => (
                          <div key={c.id} className="rounded-lg bg-surface-2 px-3 py-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[12px] font-semibold text-ink">{c.name}</span>
                              <span className="num text-[10px] text-muted">{c.current} → {c.target}</span>
                            </div>
                            <div className="mt-1 text-[10.5px] text-faint">{c.owner}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="label mb-2 flex items-center gap-1.5">
                      <ListChecks size={11} /> Iniciativas
                    </div>
                    {objInis.length === 0 ? (
                      <p className="text-[11.5px] italic text-faint">
                        Sin iniciativas asociadas todavía: el objetivo se mueve con la
                        operación regular.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {objInis.map((i) => (
                          <Link key={i.id} href={`/panel/iniciativas/${i.id}`}
                            className="block rounded-lg bg-gold-wash px-3 py-2 transition-transform hover:translate-x-0.5">
                            <div className="text-[12px] font-semibold text-ink">{i.name}</div>
                            <div className="num mt-0.5 text-[10px]" style={{ color: "var(--gold)" }}>
                              {i.subsistema} · avance {i.progress} % · {responsible(i.ownerId).dependencia}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── catálogo de capacidades ── */}
      <div className="rise rise-3 mt-8">
        <div className="kicker mb-4">Catálogo de capacidades · nivel actual → meta</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => {
            const line = LINES.find((l) => l.n === c.line)!;
            const inis = INITIATIVES.filter((i) => i.capability === c.id);
            return (
              <div key={c.id} className="panel panel-lift p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-bold leading-snug text-ink">{c.name}</span>
                  <span className="chip shrink-0" style={{ color: line.color }}>{line.code}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(c.current / 5) * 100}%`, background: line.color }} />
                    <div className="absolute top-0 h-full border-l-[1.5px] border-dashed border-gold"
                      style={{ left: `${(c.target / 5) * 100}%` }} />
                  </div>
                  <span className="num text-[11px] font-bold text-muted">{c.current} → {c.target}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between text-[10.5px] text-faint">
                  <span>{c.owner}</span>
                  <span className="num">{inis.length} iniciativa{inis.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

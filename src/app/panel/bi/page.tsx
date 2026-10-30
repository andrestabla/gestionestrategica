"use client";

// M7 · Inteligencia: el contexto del sector con datos abiertos sistematizados por la plataforma. Para Colombia:
// Supersociedades (tamaño, crecimiento, márgenes, concentración, territorio y las sociedades del sector), INVIMA
// (registros sanitarios y presentaciones por titular, mezcla terapéutica, vencimientos), Comisión Nacional de
// Precios (control directo de precios y la exposición de cada titular), Banco de la República (TRM), DANE
// (población por departamento) y una base de hechos con fuente verificable. Para Ecuador: ranking de la SCVS e INEC.
// La empresa se ubica en cada lectura por su nombre. Cada cifra declara su fuente y su corte.

import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { useCatalog } from "@/components/catalog-context";
import { useBase } from "@/components/user-context";
import { fmtNum } from "@/data/demo";
import { sectorFor, sectorKeyDe, fmtMillones, shortName } from "@/data/sector";
import { inteligenciaOf, titularDe, coincideEmpresa, atc2Nombre } from "@/data/inteligencia";
import { EC_POPULATION, EC_POPULATION_SOURCE } from "@/data/demanda-ec";
import { CO_POPULATION, CO_POPULATION_SOURCE } from "@/data/demanda-co";
import { demandByTerritory, coverage, openMarkets, competitorsByTerritory } from "@/lib/demanda";
import { baseDe, type Tema } from "@/data/conocimiento-sector";
import { Database, Users, ShieldCheck, FlaskConical, Landmark, ExternalLink, Scale, Award, BookOpen } from "lucide-react";
import { MapaSector, Dispersion, RankingActividad, comparables, CanalesBarra, RadarAtc, Productos } from "@/components/inteligencia-graficos";

const PRESENCE_LABEL = { sede: "Sede", cobertura: "Cobertura", oportunidad: "Oportunidad", ninguna: "Sin presencia" } as const;
const PRESENCE_CLS = { sede: "chip chip-cyan", cobertura: "chip chip-ok", oportunidad: "chip chip-gold", ninguna: "chip" } as const;
const fmtPeople = (n: number) => n >= 1_000_000 ? `${fmtNum(n / 1_000_000, 2)} M` : n >= 1000 ? `${fmtNum(n / 1000, 0)} mil` : String(n);
const TEMAS: { id: Tema; label: string }[] = [
  { id: "regulacion", label: "Regulación y precios" }, { id: "mercado", label: "Mercado y competencia" }, { id: "macro", label: "Macro y comercio exterior" },
  { id: "demanda", label: "Demanda y canales" }, { id: "margen", label: "Márgenes" }, { id: "expansion", label: "Expansión" }, { id: "talento", label: "Talento" }, { id: "cliente", label: "Cliente" },
];

export default function BiPage() {
  const v = useCatalog();
  const base = useBase();
  const company = v.catalog.company;
  const s = sectorFor(v.catalog);
  const key = sectorKeyDe(company);
  const year = s.source.cut.slice(0, 4);
  const maxDept = Math.max(...s.departments.map((d) => d.share));
  const maxSize = Math.max(...s.sizes.map((x) => x.n));
  const isEC = company.country === "EC";
  const unitName = isEC ? "provincia" : "departamento";
  const Unit = unitName[0].toUpperCase() + unitName.slice(1);
  const plural = (n: number) => `${n} ${n === 1 ? unitName : `${unitName}s`}`;
  const usd = /USD/i.test(s.units);
  const smallBand = s.sizes[0];
  const smallPct = s.n ? Math.round((smallBand.n / s.n) * 100) : 0;

  // la empresa entre las sociedades del sector (por nombre)
  const selfIdx = s.peers.findIndex((p) => coincideEmpresa(company, p.name));
  const selfPeer = selfIdx >= 0 ? s.peers[selfIdx] : null;
  const selfCiiuRank = selfPeer ? s.peers.filter((p) => p.ciiu === selfPeer.ciiu).findIndex((p) => p.nit === selfPeer.nit) + 1 : 0;
  const top = s.peers.slice(0, 10);
  const tabla = selfPeer && selfIdx >= 10 ? [...top, selfPeer] : top;

  // inteligencia regulatoria y macro (INVIMA · CNPMDM · TRM), si el sector la tiene
  const intel = inteligenciaOf(key);
  const titular = titularDe(company, intel);
  const regShareMercado = intel ? Math.round((intel.regulados.expedientes / intel.invima.registros) * 1000) / 10 : 0;
  const topTitulares = intel ? (titular && titular.rank > 12 ? [...intel.invima.top.slice(0, 12), titular] : intel.invima.top.slice(0, 12)) : [];
  const atcMax = intel ? Math.max(...intel.invima.atcMercado.map((a) => a.share ?? 0)) : 0;
  const totalTit = titular ? titular.atc1.reduce((a, b) => a + b.n, 0) : 0;
  const fabrica = titular ? titular.modalidades.filter((m) => /FABRICAR/.test(m.modalidad)).reduce((a, m) => a + m.n, 0) : 0;
  const importa = titular ? titular.modalidades.filter((m) => /IMPORTAR/.test(m.modalidad) && !/FABRICAR/.test(m.modalidad)).reduce((a, m) => a + m.n, 0) : 0;

  // demanda y competencia por territorio: población oficial (DANE o INEC) cruzada con las sociedades del sector
  const population = isEC ? EC_POPULATION : CO_POPULATION;
  const popSource = isEC ? EC_POPULATION_SOURCE : CO_POPULATION_SOURCE;
  const demandAll = demandByTerritory(population, s.departments, v.catalog.territories, true);
  const cov = coverage(demandAll);
  const open = openMarkets(demandAll, 4);
  const demand = demandAll.filter((d, i) => i < 12 || d.presence !== "ninguna" || d.companies > 0).slice(0, 18);
  const competition = competitorsByTerritory(s.peers, v.catalog.territories, 3).filter((c) => c.count > 0);

  // mapa: sedes declaradas y domicilio según Supersociedades; comparables: fabricantes presentes en Supersociedades e INVIMA
  const home = v.catalog.territories.filter((t) => t.presence === "sede").map((t) => t.name);
  const domicilio = selfPeer?.dept ?? null;
  const ciiuFoco = selfPeer?.ciiu ?? (intel ? "C2100" : null);
  const peersFoco = ciiuFoco ? s.peers.filter((p) => p.ciiu === ciiuFoco) : s.peers;
  const comps = comparables(s, intel, selfPeer, titular, ciiuFoco, 8);
  const pctC = (a: number, c: { institucional: number; comercial: number; muestraMedica: number }) => { const t = c.institucional + c.comercial + c.muestraMedica; return t ? Math.round((a / t) * 1000) / 10 : 0; };

  // hechos con fuente, por tema
  const kb = baseDe(company);
  const grupos = kb ? TEMAS.map((t) => ({ ...t, hechos: kb.hechos.filter((h) => h.temas[0] === t.id) })).filter((g) => g.hechos.length) : [];
  const fuenteDe = (id: string) => kb?.fuentes.find((f) => f.id === id);

  return (
    <>
      <PageHeader kicker="M7 · Inteligencia" title={`Inteligencia del sector · ${s.label}`}
        desc="El contexto que el diagnóstico no mide, con datos abiertos sistematizados: cómo se mueve el sector y quién lo concentra, dónde está la empresa frente a sus pares, qué portafolio y qué exposición regulatoria tiene cada competidor, dónde está la demanda y qué señales del entorno conviene vigilar. Cada cifra declara su fuente y su corte." />

      {/* ── el sector en cifras ── */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sociedades que reportan" value={s.n} foot={`${s.ciiu.map((c) => c.code).join(" · ")} · corte ${year}`} />
        <StatCard label="Ingresos del sector" value={usd ? s.totals.revenue / 1000 : s.totals.revenue / 1_000_000} decimals={usd ? 2 : 1} prefix="$ " unit={usd ? "mil millones USD" : "billones"} foot={`${s.totals.growth !== null ? `${fmtNum(s.totals.growth, 1)} % frente al año anterior` : "sin comparativo"} · ${smallPct} % de las sociedades factura ${smallBand.band.toLowerCase()}`} />
        <StatCard label="Crecimiento mediano" value={s.dist.growth.p50 ?? 0} decimals={1} unit="%" foot={`cuartiles ${fmtNum(s.dist.growth.p25 ?? 0, 1)} % y ${fmtNum(s.dist.growth.p75 ?? 0, 1)} %`} accent="linear-gradient(90deg, var(--cyan), var(--cyan-deep))" />
        <StatCard label="Margen operacional mediano" value={s.dist.opMargin.p50 ?? 0} decimals={1} unit="%" foot={`margen bruto mediano ${fmtNum(s.dist.grossMargin.p50 ?? 0, 1)} %`} accent="linear-gradient(90deg, var(--gold), #a87d1e)" />
      </div>

      {/* ── la empresa frente al sector ── */}
      {selfPeer && (
        <Card className="rise rise-1 mb-5">
          <CardHeader title={`${company.shortName || company.name} entre las sociedades del sector`} sub={`posición por ingresos de ${year} entre las ${s.n} sociedades que reportaron · ${s.units}`} />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-surface-2/60 px-4 py-3"><div className="label">Puesto en el sector</div><div className="num mt-1 text-[26px] font-extrabold text-ink">#{selfIdx + 1}</div><div className="text-[12px] text-muted">de {s.n} sociedades · #{selfCiiuRank} entre {s.byCiiu.find((c) => c.code === selfPeer.ciiu)?.n ?? "—"} con CIIU {selfPeer.ciiu}</div></div>
            <div className="rounded-xl bg-surface-2/60 px-4 py-3"><div className="label">Ingresos {year}</div><div className="num mt-1 text-[26px] font-extrabold text-ink">{fmtMillones(selfPeer.revenue)}</div><div className="text-[12px] text-muted">{s.peers[0] ? `${fmtNum((selfPeer.revenue / s.peers[0].revenue) * 100, 1)} % de la mayor (${shortName(s.peers[0].name, 2)})` : ""}</div></div>
            <div className="rounded-xl bg-surface-2/60 px-4 py-3"><div className="label">Crecimiento</div><div className="num mt-1 text-[26px] font-extrabold" style={{ color: (selfPeer.growth ?? 0) >= (s.dist.growth.p50 ?? 0) ? "var(--ok)" : "var(--bad)" }}>{selfPeer.growth !== null ? `${fmtNum(selfPeer.growth, 1)} %` : "—"}</div><div className="text-[12px] text-muted">mediana del sector {fmtNum(s.dist.growth.p50 ?? 0, 1)} % · cuartil superior {fmtNum(s.dist.growth.p75 ?? 0, 1)} %</div></div>
            <div className="rounded-xl bg-surface-2/60 px-4 py-3"><div className="label">Margen operacional</div><div className="num mt-1 text-[26px] font-extrabold" style={{ color: (selfPeer.opMargin ?? 0) >= (s.dist.opMargin.p50 ?? 0) ? "var(--ok)" : "var(--bad)" }}>{selfPeer.opMargin !== null ? `${fmtNum(selfPeer.opMargin, 1)} %` : "—"}</div><div className="text-[12px] text-muted">mediana del sector {fmtNum(s.dist.opMargin.p50 ?? 0, 1)} % · de su CIIU {fmtNum(s.byCiiu.find((c) => c.code === selfPeer.ciiu)?.opMarginP50 ?? 0, 1)} %</div></div>
          </div>
        </Card>
      )}

      {/* ── mapa y dispersión ── */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card className="rise rise-1">
          <CardHeader title={`${isEC ? "Ecuador" : "Colombia"}: sector, población y competencia`} sub={`tres lentes sobre el mismo mapa · ${domicilio ? `domicilio de la empresa en ${domicilio}` : "sin domicilio identificado"}${home.length ? ` · sedes declaradas: ${home.join(", ")}` : " · la empresa aún no declara sedes ni cobertura"}`} />
          <MapaSector s={s} demand={demandAll} home={home} domicilio={domicilio} country={isEC ? "EC" : "CO"} unitName={unitName} peers={s.peers} />
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Crecimiento frente a margen operacional" sub={`las ${s.peers.length} mayores del sector en ${year}; tamaño del punto según ingresos · ${ciiuFoco ? `en color, las de la actividad ${ciiuFoco}` : ""}`} />
          <div className="px-4 pb-3"><Dispersion s={s} selfNit={selfPeer?.nit ?? null} ciiuFoco={ciiuFoco} /></div>
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">Arriba a la derecha crecen por encima de la mediana con más margen que la mediana; abajo a la izquierda, lo contrario. {selfPeer ? `${company.shortName || company.name} aparece en dorado.` : "La empresa aparecerá en dorado cuando su razón social figure en la ficha."} Valores extremos recortados a los bordes.</p>
        </Card>
      </div>

      {/* ── ranking de la actividad y comparativo de laboratorios ── */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="rise rise-2">
          <CardHeader title={ciiuFoco ? `Ranking ${ciiuFoco}` : "Ranking del sector"} sub={`${peersFoco.length} sociedades de ${s.byCiiu.find((c) => c.code === ciiuFoco)?.name?.split(",")[0].toLowerCase() ?? "la actividad"} por ingresos ${year} · crecimiento y margen al lado · miles de millones`} />
          <div className="px-5 pb-5"><RankingActividad peers={peersFoco} selfNit={selfPeer?.nit ?? null} /></div>
        </Card>
        <Card className="rise rise-3">
          <CardHeader title="Comparativo de laboratorios" sub="las sociedades de la actividad que también están entre los titulares con más registros: finanzas (Supersociedades) y portafolio regulatorio (INVIMA · CNPMDM) en una sola fila" />
          {comps.length ? (
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full min-w-[720px] text-[12px]">
                <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">Laboratorio</th><th className="px-2 py-2 text-right">Ingresos</th><th className="px-2 py-2 text-right">Crec.</th><th className="px-2 py-2 text-right">Margen op.</th><th className="px-2 py-2 text-right">Registros</th><th className="px-2 py-2 text-right">CUM</th><th className="px-2 py-2 text-right">Regulados</th><th className="px-2 py-2 text-right">Institucional</th><th className="px-2 py-2 text-right">Muestras</th></tr></thead>
                <tbody>
                  {comps.map((c) => (
                    <tr key={c.nombre} className={`border-t border-line ${c.self ? "bg-gold-wash/40" : ""}`}>
                      <td className={`px-3 py-2 ${c.self ? "font-extrabold text-ink" : "font-semibold text-ink"}`} title={c.nombre}>{shortName(c.nombre, 3)}{c.self && <span className="chip chip-gold ml-2 !py-0 text-[11px]">tu empresa</span>}</td>
                      <td className="num px-2 py-2 text-right font-bold text-ink">{c.peer ? fmtNum(c.peer.revenue, 0) : "—"}</td>
                      <td className="num px-2 py-2 text-right" style={{ color: (c.peer?.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{c.peer?.growth != null ? `${fmtNum(c.peer.growth, 1)} %` : "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{c.peer?.opMargin != null ? `${fmtNum(c.peer.opMargin, 1)} %` : "—"}</td>
                      <td className="num px-2 py-2 text-right text-ink">{c.titular?.registros ?? "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{c.titular ? fmtNum(c.titular.cums, 0) : "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{c.titular ? `${fmtNum(c.titular.regulados.share, 1)} %` : "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{c.titular ? `${fmtNum(pctC(c.titular.canales.institucional, c.titular.canales), 1)} %` : "—"}</td>
                      <td className="num px-2 py-2 text-right text-muted">{c.titular ? `${fmtNum(pctC(c.titular.canales.muestraMedica, c.titular.canales), 1)} %` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="px-5 pb-5 text-[12.5px] text-muted">Sin inteligencia regulatoria para este sector: el comparativo cruza Supersociedades con el INVIMA.</p>}
          <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">Institucional: presentaciones cuya descripción comercial declara uso institucional u hospitalario; muestras: presentaciones marcadas como muestra médica (proxy de intensidad promocional con el cuerpo médico). El resto es canal comercial. Un laboratorio con menos exposición a precios regulados y más canal comercial compite por marca y prescripción; uno con mucha presentación institucional, por licitaciones y precio.</p>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="rise rise-1">
          <CardHeader title="Concentración y tamaño" sub="participación de las mayores y sociedades por franja de ingresos" />
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Top 5", s.concentration.top5Share], ["Top 10", s.concentration.top10Share], ["Top 20", s.concentration.top20Share]].map(([l, val]) => (
                <div key={l as string} className="rounded-xl bg-surface-2/60 px-2 py-2.5"><div className="num text-[18px] font-extrabold text-ink">{fmtNum(val as number, 1)} %</div><div className="text-[12px] uppercase tracking-wider text-faint">{l}</div></div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {s.sizes.map((b) => (
                <div key={b.band} className="flex items-center gap-2 text-[12px]">
                  <span className="w-32 shrink-0 text-ink-soft">{b.band}</span>
                  <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(b.n / maxSize) * 100}%`, background: "var(--grad-brand)" }} /></div>
                  <span className="num w-8 text-right font-bold text-ink">{b.n}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-snug text-faint">{s.concentration.top20Share >= 60 ? "Sector concentrado" : "Sector fragmentado"}: las veinte mayores suman {fmtNum(s.concentration.top20Share, 0)} % de los ingresos.</p>
          </div>
        </Card>
        <Card className="rise rise-2">
          <CardHeader title="Dónde está el sector" sub={`participación en ingresos por ${unitName} del domicilio`} />
          <div className="space-y-2 px-5 pb-4">
            {s.departments.slice(0, 8).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-[12px]">
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
              <div key={c.code} className={`rounded-xl px-3 py-2.5 ${selfPeer?.ciiu === c.code ? "bg-gold-wash/50 ring-1 ring-gold/40" : "bg-surface-2/60"}`}>
                <div className="flex items-center gap-2"><span className="num text-[12px] font-extrabold text-cyan-deep">{c.code}</span>{selfPeer?.ciiu === c.code && <span className="chip chip-gold !py-0 text-[11px]">tu actividad</span>}<span className="num ml-auto text-[12px] text-faint">{c.n} soc. · {fmtMillones(c.revenue)}</span></div>
                <div className="mt-0.5 text-[12px] leading-snug text-ink">{c.name}</div>
                <div className="num mt-1 text-[12px] text-muted">crecimiento mediano {fmtNum(c.growthP50 ?? 0, 1)} % · margen operacional {fmtNum(c.opMarginP50 ?? 0, 1)} %</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rise rise-3 mb-5">
        <CardHeader title={`Las diez mayores del sector en ${year}`} sub={`ingresos de actividades ordinarias, crecimiento y margen operacional · ${s.units}${selfPeer && selfIdx >= 10 ? " · tu empresa al final, en su puesto" : ""}`} />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">#</th><th className="px-2 py-2">Sociedad</th><th className="px-2 py-2">{Unit}</th><th className="px-2 py-2">CIIU</th><th className="px-2 py-2 text-right">Ingresos</th><th className="px-2 py-2 text-right">Crec.</th><th className="px-2 py-2 text-right">Margen op.</th></tr></thead>
            <tbody>
              {tabla.map((p) => {
                const self = selfPeer?.nit === p.nit;
                return (
                  <tr key={p.nit} className={`border-t border-line ${self ? "bg-gold-wash/40" : ""}`}>
                    <td className="num px-3 py-2 text-muted">{s.peers.indexOf(p) + 1}</td>
                    <td className="px-2 py-2 font-semibold text-ink" title={p.name}>{shortName(p.name, 4)}{self && <span className="chip chip-gold ml-2 !py-0 text-[11px]">tu empresa</span>}</td>
                    <td className="px-2 py-2 text-muted">{p.dept}</td>
                    <td className="num px-2 py-2 text-muted">{p.ciiu}</td>
                    <td className="num px-2 py-2 text-right font-bold text-ink">{fmtNum(p.revenue, 0)}</td>
                    <td className="num px-2 py-2 text-right" style={{ color: (p.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{p.growth !== null ? `${fmtNum(p.growth, 1)} %` : "—"}</td>
                    <td className="num px-2 py-2 text-right text-muted">{p.opMargin !== null ? `${fmtNum(p.opMargin, 1)} %` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-start gap-2 border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">
          <Database size={12} className="mt-0.5 shrink-0" />
          <span><b className="text-muted">{s.source.name}.</b> {s.source.note} Datasets: {s.source.datasets.map((d, i) => <span key={d.id}>{i > 0 && " · "}<a href={d.url} target="_blank" rel="noreferrer" className="text-cyan-deep hover:underline">{d.name}</a></span>)}.</span>
        </div>
      </Card>

      {/* ── inteligencia regulatoria y macro ── */}
      {intel && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Registros sanitarios vigentes" value={intel.invima.registros} foot={`${fmtNum(intel.invima.cums, 0)} presentaciones (CUM) de ${fmtNum(intel.invima.titulares, 0)} titulares · INVIMA`} />
            <StatCard label="Presentaciones con precio regulado" value={intel.regulados.presentaciones} foot={`${intel.regulados.mercadosRelevantes} mercados relevantes · ${fmtNum(regShareMercado, 1)} % de los registros · ${intel.regulados.circularPrincipal}`} />
            <StatCard label="TRM" value={intel.trm.valor} decimals={2} prefix="$ " foot={`${intel.trm.fecha} · ${intel.trm.variacion12m > 0 ? "+" : ""}${fmtNum(intel.trm.variacion12m, 1)} % a doce meses (${fmtNum(intel.trm.hace12m, 2)} el ${intel.trm.fecha12m})`} accent={intel.trm.variacion12m <= 0 ? "linear-gradient(90deg, var(--ok), #2f8f5f)" : "linear-gradient(90deg, var(--bad), #a33)"} />
            {titular
              ? <StatCard label="Tu portafolio en el INVIMA" value={titular.registros} unit="registros" foot={`titular #${titular.rank} por registros vigentes · ${fmtNum(titular.cums, 0)} presentaciones · ${fmtNum(titular.regulados.share, 1)} % con precio regulado`} accent="linear-gradient(90deg, var(--gold), #a87d1e)" />
              : <StatCard label="Tu portafolio en el INVIMA" value={0} foot="la empresa no está entre los 40 titulares con más registros vigentes; se ubica por el nombre de la ficha" />}
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            <Card className="rise rise-1">
              <CardHeader title="Titulares con más registros sanitarios vigentes" sub="registros, presentaciones comerciales, exposición al control directo de precios y vencimientos a 36 meses · INVIMA y CNPMDM" />
              <div className="overflow-x-auto px-2 pb-3">
                <table className="w-full min-w-[560px] text-[12px]">
                  <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">#</th><th className="px-2 py-2">Titular</th><th className="px-2 py-2 text-right">Registros</th><th className="px-2 py-2 text-right">CUM</th><th className="px-2 py-2 text-right">Regulados</th><th className="px-2 py-2 text-right">Mercados</th><th className="px-2 py-2 text-right">Vencen 36 m</th></tr></thead>
                  <tbody>
                    {topTitulares.map((t) => {
                      const self = titular?.key === t.key;
                      return (
                        <tr key={t.key} className={`border-t border-line ${self ? "bg-gold-wash/40" : ""}`}>
                          <td className="num px-3 py-2 text-muted">{t.rank}</td>
                          <td className="px-2 py-2 font-semibold text-ink" title={t.nombre}>{shortName(t.nombre, 3)}{self && <span className="chip chip-gold ml-2 !py-0 text-[11px]">tu empresa</span>}</td>
                          <td className="num px-2 py-2 text-right font-bold text-ink">{t.registros}</td>
                          <td className="num px-2 py-2 text-right text-muted">{fmtNum(t.cums, 0)}</td>
                          <td className="num px-2 py-2 text-right" style={{ color: t.regulados.share > regShareMercado * 1.2 ? "var(--bad)" : "var(--ink)" }}>{fmtNum(t.regulados.share, 1)} %</td>
                          <td className="num px-2 py-2 text-right text-muted">{t.regulados.mercadosRelevantes}</td>
                          <td className="num px-2 py-2 text-right text-muted">{t.vencimientos.en36m}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">Regulados: porcentaje de los registros del titular con al menos una presentación bajo precio máximo de venta ({intel.regulados.circularPrincipal}, vigente desde {intel.regulados.vigenciaDesde}); el promedio del mercado es {fmtNum(regShareMercado, 1)} %. Más exposición al control directo significa menos libertad de precio y más sensibilidad a la TRM, que la Comisión usa para actualizar los topes.</p>
            </Card>

            <Card className="rise rise-2">
              <CardHeader title={titular ? `Portafolio de ${company.shortName || company.name}` : "Grupos terapéuticos del mercado"} sub={titular ? "registros vigentes por grupo terapéutico frente al mercado · INVIMA" : "participación de cada grupo ATC en los registros vigentes · INVIMA"} />
              <div className="px-5 pb-4">
                {titular && (
                  <div className="mb-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-surface-2/60 px-2 py-2"><div className="num text-[18px] font-extrabold text-ink">{fabrica}</div><div className="text-[11.5px] uppercase tracking-wider text-faint">fabrica y vende</div></div>
                    <div className="rounded-xl bg-surface-2/60 px-2 py-2"><div className="num text-[18px] font-extrabold text-ink">{importa}</div><div className="text-[11.5px] uppercase tracking-wider text-faint">importa y vende</div></div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {intel.invima.atcMercado.slice(0, 10).map((a) => {
                    const mio = titular?.atc1.find((x) => x.code === a.code);
                    const mioShare = titular && totalTit ? Math.round(((mio?.n ?? 0) / totalTit) * 1000) / 10 : null;
                    return (
                      <div key={a.code} className="text-[12px]">
                        <div className="flex items-baseline justify-between gap-2"><span className="truncate text-ink-soft"><b className="num text-cyan-deep">{a.code}</b> {a.name}</span><span className="num shrink-0 text-faint">{fmtNum(a.share ?? 0, 1)} %{mioShare !== null ? <> · <b className="text-ink">{fmtNum(mioShare, 1)} %</b></> : ""}</span></div>
                        <div className="relative mt-0.5 h-[7px] overflow-hidden rounded-full bg-surface-2">
                          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((a.share ?? 0) / atcMax) * 100}%`, background: "var(--cyan-deep)", opacity: 0.45 }} />
                          {mioShare !== null && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (mioShare / atcMax) * 100)}%`, background: "var(--gold)" }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {titular && (
                  <>
                    <div className="label mb-1.5 mt-4">Grupos con más registros</div>
                    <div className="flex flex-wrap gap-1.5">{titular.atc2.slice(0, 8).map((a) => <span key={a.code} className="chip" title={a.name}><b className="num mr-1">{a.code}</b> {atc2Nombre(a.code, a.name)} · {a.n}</span>)}</div>
                    <p className="mt-3 text-[12px] leading-snug text-faint">{titular.vencimientos.en36m ? `${titular.vencimientos.en36m} registros vencen en los próximos 36 meses (${titular.vencimientos.en12m} en 12).` : "Ningún registro con fecha de vencimiento en los próximos 36 meses."} En {titular.regulados.mercadosRelevantes} mercados relevantes hay precio máximo para alguna de sus presentaciones. Barra azul: participación del grupo en los registros del mercado; dorada: en los de la empresa.</p>
                  </>
                )}
                {!titular && <p className="mt-3 text-[12px] leading-snug text-faint">Cuando la ficha de la empresa (Administración → Empresas) lleve su razón social, la plataforma la ubica entre los titulares y compara su portafolio con el mercado.</p>}
              </div>
            </Card>
          </div>
        </>
      )}

      {intel && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <Card className="rise rise-1">
            <CardHeader title="Canales por presentación" sub="comercial, institucional y muestra médica · INVIMA (descripción comercial del CUM)" />
            <div className="space-y-3 px-5 pb-4">
              <CanalesBarra c={intel.invima.canalesMercado} label="Todo el mercado" />
              {titular && <CanalesBarra c={titular.canales} label={company.shortName || company.name} self />}
              {comps.filter((c) => !c.self && c.titular).slice(0, 5).map((c) => <CanalesBarra key={c.nombre} c={c.titular!.canales} label={shortName(c.nombre, 2)} />)}
              <div className="flex flex-wrap gap-3 pt-1 text-[11.5px] text-faint"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: "var(--cyan-deep)" }} />comercial</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: "var(--navy)" }} />institucional</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: "var(--gold)" }} />muestra médica</span></div>
            </div>
          </Card>
          {titular ? (
            <>
              <Card className="rise rise-2">
                <CardHeader title="Mezcla terapéutica" sub={`${company.shortName || company.name} (dorado) frente al mercado (gris) · % de registros por grupo ATC`} />
                <div className="px-4 pb-4"><RadarAtc titular={titular} intel={intel} /></div>
              </Card>
              <Card className="rise rise-3">
                <CardHeader title={`Marcas de ${company.shortName || company.name}`} sub={`${titular.productos.length} marcas con más presentaciones vigentes, por grupo terapéutico · INVIMA`} />
                <div className="px-5 pb-5"><Productos titular={titular} /></div>
              </Card>
            </>
          ) : (
            <Card className="rise rise-2 lg:col-span-2">
              <CardHeader title="Portafolio y marcas" sub="se muestran cuando la empresa está entre los titulares con más registros" />
              <p className="px-5 pb-5 text-[12.5px] text-muted">Con la razón social en la ficha de la empresa, la plataforma ubica su portafolio en el INVIMA: marcas, grupos terapéuticos, canales y exposición a precios regulados.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── demanda y competencia por territorio ── */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Población con sede o cobertura" value={cov.coveredPct} decimals={1} unit="%" foot={`${fmtPeople(cov.covered)} habitantes en ${plural(demandAll.filter((d) => d.presence === "sede" || d.presence === "cobertura").length)}${v.catalog.territories.length ? "" : " · la empresa aún no declara territorios"}`} />
        <StatCard label="Población en oportunidades declaradas" value={cov.opportunityPct} decimals={1} unit="%" foot={`${fmtPeople(cov.opportunity)} habitantes en ${plural(demandAll.filter((d) => d.presence === "oportunidad").length)}`} />
        <StatCard label="Población sin presencia ni plan" value={cov.nonePct} decimals={1} unit="%" foot={`${fmtPeople(cov.none)} habitantes · ${open.map((o) => o.name).slice(0, 3).join(", ")}${open.length > 3 ? "…" : ""}`} />
      </div>
      <Card className="rise rise-2 mb-5">
        <CardHeader title={`Demanda y competencia por ${unitName}`} sub={`población oficial, sociedades del sector domiciliadas allí y su facturación por habitante · ${s.units}`} />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-wider text-faint"><th className="px-3 py-2">{Unit}</th><th className="px-2 py-2">Presencia</th><th className="px-2 py-2 text-right">Población</th><th className="px-2 py-2 text-right">% nac.</th><th className="px-2 py-2 text-right">Sociedades</th><th className="px-2 py-2 text-right">Ingresos</th><th className="px-2 py-2 text-right">Por habitante</th></tr></thead>
            <tbody>
              {demand.map((d) => (
                <tr key={d.name} className={`border-t border-line ${d.presence === "ninguna" && d.population >= 1_000_000 && d.companies === 0 ? "bg-gold-wash/30" : ""}`}>
                  <td className="px-3 py-2 font-semibold text-ink">{d.name}</td>
                  <td className="px-2 py-2"><span className={`${PRESENCE_CLS[d.presence]} !py-0 text-[11px]`}>{PRESENCE_LABEL[d.presence]}{d.weight ? ` · peso ${d.weight}` : ""}</span></td>
                  <td className="num px-2 py-2 text-right font-bold text-ink">{fmtNum(d.population, 0)}</td>
                  <td className="num px-2 py-2 text-right text-muted">{fmtNum(d.share, 1)} %</td>
                  <td className="num px-2 py-2 text-right text-muted">{d.companies || "—"}</td>
                  <td className="num px-2 py-2 text-right text-muted">{d.revenue ? fmtNum(d.revenue, 0) : "—"}</td>
                  <td className="num px-2 py-2 text-right" style={{ color: d.perCapita === null ? "var(--faint)" : "var(--ink)" }}>{d.perCapita !== null ? fmtNum(d.perCapita, 0) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-start gap-2 border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">
          <Database size={12} className="mt-0.5 shrink-0" />
          <span><b className="text-muted"><a href={popSource.url} target="_blank" rel="noreferrer" className="text-cyan-deep hover:underline">{popSource.name}</a>.</b> {popSource.note} Las sociedades y sus ingresos son las del sector por {unitName} del domicilio: una {unitName} con mucha población y pocas sociedades domiciliadas es demanda atendida desde otra parte, no demanda vacía. Las filas doradas son {unitName}s de más de un millón de habitantes sin sociedad del sector domiciliada. La presencia la declara la empresa en su ficha de territorios.</span>
        </div>
      </Card>

      {competition.length > 0 && (
        <Card className="rise rise-2 mb-5">
          <CardHeader title="Competencia donde operas y donde planeas abrir" sub={`sociedades del sector domiciliadas en cada ${unitName} de tu territorio, con las tres mayores · ${s.units}`} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {competition.map(({ territory: t, count, revenue, top: tres }) => (
              <div key={t.name} className="rounded-xl bg-surface-2/60 px-4 py-3">
                <div className="flex items-center gap-2"><span className="text-[13px] font-extrabold text-ink">{t.name}</span><span className={`${PRESENCE_CLS[t.presence]} !py-0 text-[11px]`}>{PRESENCE_LABEL[t.presence]}</span><span className="num ml-auto text-[12px] text-faint">{count} soc. · {fmtNum(revenue, 0)}</span></div>
                <ul className="mt-2 space-y-1">
                  {tres.map((p) => (
                    <li key={p.nit} className="flex items-center gap-2 text-[12px]"><Users size={10} className="shrink-0 text-faint" /><span className="truncate text-ink-soft" title={p.name}>{shortName(p.name, 3)}</span><span className="num ml-auto shrink-0 font-bold text-ink">{fmtNum(p.revenue, 0)}</span><span className="num w-12 shrink-0 text-right text-[12px]" style={{ color: (p.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{p.growth !== null ? `${fmtNum(p.growth, 0)} %` : "—"}</span></li>
                  ))}
                </ul>
                {t.reading && <p className="mt-2 text-[12px] italic leading-snug text-faint">{t.reading}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── señales del entorno con fuente ── */}
      {kb && grupos.length > 0 && (
        <Card className="rise rise-3 mb-5">
          <CardHeader title="Señales del entorno" sub={`${kb.hechos.length} hechos con cifra, fecha y fuente verificable · ${kb.nombre} · alimentan también al asistente de OKR`} />
          <div className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
            {grupos.map((g) => (
              <div key={g.id}>
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-faint">
                  {g.id === "regulacion" ? <ShieldCheck size={13} /> : g.id === "macro" ? <Landmark size={13} /> : g.id === "mercado" ? <Scale size={13} /> : g.id === "demanda" ? <Users size={13} /> : g.id === "margen" ? <Award size={13} /> : <FlaskConical size={13} />}
                  {g.label} <span className="num font-normal normal-case tracking-normal">· {g.hechos.length}</span>
                </div>
                <ul className="space-y-2">
                  {g.hechos.map((h) => {
                    const f = fuenteDe(h.fuente);
                    return (
                      <li key={h.id} className="rounded-xl bg-surface-2/60 px-4 py-3">
                        <p className="text-[12.5px] leading-snug text-ink">{h.hecho}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-faint">
                          {f && <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-deep hover:underline">{f.editor} · {f.fecha} <ExternalLink size={10} /></a>}
                          {f && <span className={`chip !py-0 text-[11px] ${f.tipo === "oficial" ? "chip-ok" : ""}`}>{f.tipo}</span>}
                          {h.nota && <span className="italic">{h.nota}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── fuentes y cortes ── */}
      <Card className="rise rise-4">
        <CardHeader title="Fuentes y cortes de esta lectura" sub="todo lo que muestra el módulo sale de datos abiertos, sistematizados por la plataforma; la empresa no tiene que aportar nada" />
        <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
          <li className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px]"><Database size={14} className="mt-0.5 shrink-0 text-cyan-deep" /><span><b className="text-ink">{s.source.name}</b> · corte {s.source.cut.slice(0, 10)}, extraído el {s.source.fetchedAt.slice(0, 10)}. <span className="text-muted">Tamaño, crecimiento, márgenes, concentración, territorio y sociedades del sector.</span></span></li>
          {intel?.fuentes.map((f) => <li key={f.id} className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px]"><Database size={14} className="mt-0.5 shrink-0 text-cyan-deep" /><span><a href={f.url} target="_blank" rel="noreferrer" className="font-bold text-ink hover:text-cyan-deep">{f.name}</a> · extraído el {intel.fetchedAt.slice(0, 10)}. <span className="text-muted">{f.note}</span></span></li>)}
          <li className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px]"><Database size={14} className="mt-0.5 shrink-0 text-cyan-deep" /><span><a href={popSource.url} target="_blank" rel="noreferrer" className="font-bold text-ink hover:text-cyan-deep">{popSource.name}</a>. <span className="text-muted">{popSource.note}</span></span></li>
          {kb && <li className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-4 py-3 text-[12.5px]"><BookOpen size={14} className="mt-0.5 shrink-0 text-cyan-deep" /><span><b className="text-ink">Base de hechos · {kb.nombre}</b> · {kb.fuentes.length} fuentes ({kb.fuentes.filter((f) => f.tipo === "oficial").length} oficiales). <span className="text-muted">Prensa económica, gremios y consultoras se citan como tales; las cifras oficiales priman cuando difieren.</span></span></li>}
        </ul>
        <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-faint">El sector de referencia se define en la ficha de la empresa (<Link href={`${base}/panel/admin`} className="text-cyan-deep hover:underline">Administración → Empresas</Link>, «Sector de referencia»); si no está definido, la plataforma lo infiere del CIIU o del sector declarado. Los datos se actualizan con los extractores de la plataforma en cada corte de las fuentes.</p>
      </Card>
    </>
  );
}

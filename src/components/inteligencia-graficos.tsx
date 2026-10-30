"use client";

// Gráficos del módulo de Inteligencia (M7): mapa de Colombia con lentes (sector, población, competidores) y
// la lectura del territorio elegido; dispersión crecimiento × margen de las sociedades del sector con la
// empresa resaltada; ranking de la actividad de la empresa; comparativo de laboratorios que cruza
// Supersociedades e INVIMA; canales por presentación; portafolio de marcas. SVG propio, sin librerías.

import { useState } from "react";
import { ColombiaImpactMap, MiniRadar } from "@/components/charts";
import { fmtNum } from "@/data/demo";
import { shortName, type SectorData, type SectorPeer } from "@/data/sector";
import { normTitular, atc2Nombre, type Inteligencia, type TitularDetalle, type Canales } from "@/data/inteligencia";
import type { TerritoryDemand } from "@/lib/demanda";
import { MapPin, Users } from "lucide-react";

const PRESENCE_LABEL = { sede: "Sede", cobertura: "Cobertura", oportunidad: "Oportunidad", ninguna: "Sin presencia" } as const;

/* ─── Mapa con lentes ─────────────────────────────────────────────────────── */
type Lente = "sector" | "poblacion" | "competidores";
export function MapaSector({ s, demand, home, domicilio, country, unitName, peers }: {
  s: SectorData; demand: TerritoryDemand[]; home: string[]; domicilio: string | null; country: "CO" | "EC"; unitName: string; peers: SectorPeer[];
}) {
  const [lente, setLente] = useState<Lente>("sector");
  const [sel, setSel] = useState<string | null>(domicilio);
  const values: Record<string, number> =
    lente === "sector" ? Object.fromEntries(s.departments.map((d) => [d.name, Math.round(d.share * 10) / 10]))
    : lente === "poblacion" ? Object.fromEntries(demand.map((d) => [d.name, Math.round(d.population / 1000)]))
    : Object.fromEntries(s.departments.map((d) => [d.name, d.n]));
  const unit = lente === "sector" ? " % de los ingresos" : lente === "poblacion" ? " mil habitantes" : " sociedades";
  const d = sel ? demand.find((x) => x.name === sel) : null;
  const sd = sel ? s.departments.find((x) => x.name === sel) : null;
  const top = sel ? peers.filter((p) => p.dept === sel).slice(0, 4) : [];
  const marcas = [...new Set([...home, ...(domicilio ? [domicilio] : [])])];
  return (
    <div className="grid gap-4 px-5 pb-5 md:grid-cols-[300px_1fr]">
      <div>
        <div className="mb-2 flex flex-wrap gap-1">
          {([["sector", "Ingresos del sector"], ["poblacion", "Población"], ["competidores", "Sociedades"]] as [Lente, string][]).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setLente(id)} className={`chip ${lente === id ? "chip-cyan" : ""}`}>{l}</button>
          ))}
        </div>
        <ColombiaImpactMap values={values} selected={sel} onSelect={setSel} home={marcas} unit={unit} country={country} />
        <p className="mt-1 text-[11.5px] leading-snug text-faint">Intensidad: {lente === "sector" ? "participación en los ingresos del sector" : lente === "poblacion" ? "población proyectada" : "sociedades del sector domiciliadas"} por {unitName}. Borde oscuro: {domicilio ? "domicilio de la empresa y sedes declaradas" : "sedes declaradas"}. Clic para leer el territorio.</p>
      </div>
      <div>
        {!sel && <p className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-[12.5px] text-muted"><MapPin size={12} className="mr-1 inline text-faint" />Elige un {unitName} en el mapa para ver su población, las sociedades del sector domiciliadas allí y las mayores.</p>}
        {sel && (
          <div className="rounded-xl bg-surface-2/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-extrabold text-ink">{sel}</span>
              {domicilio === sel && <span className="chip chip-gold !py-0 text-[11px]">domicilio de la empresa</span>}
              {d && d.presence !== "ninguna" && <span className="chip chip-cyan !py-0 text-[11px]">{PRESENCE_LABEL[d.presence]}</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <div><div className="label">Población</div><div className="num text-[16px] font-extrabold leading-tight text-ink">{d ? fmtNum(d.population, 0) : "—"}</div><div className="text-[11.5px] text-faint">{d ? `${fmtNum(d.share, 1)} % del país` : ""}</div></div>
              <div><div className="label">Sociedades</div><div className="num text-[17px] font-extrabold text-ink">{sd?.n ?? 0}</div><div className="text-[11.5px] text-faint">del sector domiciliadas</div></div>
              <div><div className="label">Ingresos</div><div className="num text-[17px] font-extrabold text-ink">{sd ? `${fmtNum(sd.share, 1)} %` : "—"}</div><div className="text-[11.5px] text-faint">{sd ? `${fmtNum(sd.revenue / 1e6, 2)} billones` : "del sector"}</div></div>
              <div><div className="label">Por habitante</div><div className="num text-[17px] font-extrabold text-ink">{d?.perCapita !== null && d?.perCapita !== undefined ? fmtNum(d.perCapita, 0) : "—"}</div><div className="text-[11.5px] text-faint">pesos facturados allí</div></div>
            </div>
            {top.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {top.map((p) => <li key={p.nit} className="flex items-center gap-2 text-[12px]"><Users size={10} className="shrink-0 text-faint" /><span className="truncate text-ink-soft" title={p.name}>{shortName(p.name, 3)}</span><span className="num ml-auto shrink-0 font-bold text-ink">{fmtNum(p.revenue, 0)}</span><span className="num w-12 shrink-0 text-right" style={{ color: (p.growth ?? 0) >= 0 ? "var(--ok)" : "var(--bad)" }}>{p.growth !== null ? `${fmtNum(p.growth, 0)} %` : "—"}</span></li>)}
              </ul>
            ) : <p className="mt-3 text-[12px] italic text-faint">Ninguna de las sesenta mayores del sector tiene domicilio aquí: la demanda se atiende desde otros territorios.</p>}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          {demand.slice(0, 6).map((x) => (
            <button key={x.name} type="button" onClick={() => setSel(x.name)} className={`rounded-lg px-3 py-2 text-left transition-colors ${sel === x.name ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
              <div className="font-bold text-ink">{x.name}</div>
              <div className="num text-[11.5px] text-faint">{fmtNum(x.population / 1e6, 2)} M hab. · {x.companies} soc.</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Dispersión crecimiento × margen ─────────────────────────────────────── */
export function Dispersion({ s, selfNit, ciiuFoco }: { s: SectorData; selfNit: string | null; ciiuFoco: string | null }) {
  const W = 520, H = 300, padL = 44, padB = 34, padT = 14, padR = 14;
  const xs = { min: -30, max: 60 }, ys = { min: -20, max: 50 };
  const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const px = (g: number) => padL + ((cl(g, xs.min, xs.max) - xs.min) / (xs.max - xs.min)) * (W - padL - padR);
  const py = (m: number) => padT + (1 - (cl(m, ys.min, ys.max) - ys.min) / (ys.max - ys.min)) * (H - padT - padB);
  const pts = s.peers.filter((p) => p.growth !== null && p.opMargin !== null);
  const self = pts.find((p) => p.nit === selfNit) ?? null;
  const medG = s.dist.growth.p50 ?? 0, medM = s.dist.opMargin.p50 ?? 0;
  const r = (p: SectorPeer) => 3 + Math.sqrt(p.revenue / (s.peers[0]?.revenue || 1)) * 9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Crecimiento frente a margen operacional de las sociedades del sector">
      <rect x={px(medG)} y={padT} width={W - padR - px(medG)} height={py(medM) - padT} fill="#eaf4ee" opacity=".7" rx={8} />
      <rect x={padL} y={py(medM)} width={px(medG) - padL} height={H - padB - py(medM)} fill="#fbeaea" opacity=".6" rx={8} />
      {[-20, 0, 20, 40, 60].map((g) => <g key={g}><line x1={px(g)} x2={px(g)} y1={padT} y2={H - padB} stroke="var(--line)" strokeWidth=".6" /><text x={px(g)} y={H - padB + 13} textAnchor="middle" fontSize="9.5" fill="var(--faint)">{g} %</text></g>)}
      {[-20, 0, 20, 40].map((m) => <g key={m}><line x1={padL} x2={W - padR} y1={py(m)} y2={py(m)} stroke="var(--line)" strokeWidth=".6" /><text x={padL - 6} y={py(m) + 3} textAnchor="end" fontSize="9.5" fill="var(--faint)">{m} %</text></g>)}
      <line x1={px(medG)} x2={px(medG)} y1={padT} y2={H - padB} stroke="var(--cyan-deep)" strokeDasharray="4 3" strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={py(medM)} y2={py(medM)} stroke="var(--cyan-deep)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={px(medG) + 4} y={padT + 10} fontSize="9.5" fill="var(--cyan-deep)">mediana crecimiento {fmtNum(medG, 1)} %</text>
      <text x={W - padR - 4} y={py(medM) - 4} textAnchor="end" fontSize="9.5" fill="var(--cyan-deep)">mediana margen {fmtNum(medM, 1)} %</text>
      {pts.map((p) => {
        const mine = p.nit === selfNit, foco = ciiuFoco ? p.ciiu === ciiuFoco : true;
        return (
          <circle key={p.nit} cx={px(p.growth!)} cy={py(p.opMargin!)} r={mine ? Math.max(8, r(p)) : r(p)}
            fill={mine ? "var(--gold)" : foco ? "var(--cyan-deep)" : "var(--faint)"} fillOpacity={mine ? 1 : foco ? 0.55 : 0.3}
            stroke={mine ? "var(--ink)" : "var(--surface)"} strokeWidth={mine ? 1.5 : 0.8}>
            <title>{`${p.name} · crecimiento ${fmtNum(p.growth!, 1)} % · margen operacional ${fmtNum(p.opMargin!, 1)} % · ingresos ${fmtNum(p.revenue, 0)} M`}</title>
          </circle>
        );
      })}
      {self && <text x={px(self.growth!) + 14} y={py(self.opMargin!) + 4} fontSize="11.5" fontWeight="800" fill="var(--ink)">{shortName(self.name, 2)}</text>}
      <text x={(W + padL) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--faint)">Crecimiento de ingresos {s.source.cut.slice(0, 4)} →</text>
      <text x={11} y={(H - padB + padT) / 2} textAnchor="middle" fontSize="10" fill="var(--faint)" transform={`rotate(-90 11 ${(H - padB + padT) / 2})`}>Margen operacional →</text>
    </svg>
  );
}

/* ─── Ranking de la actividad ─────────────────────────────────────────────── */
export function RankingActividad({ peers, selfNit, limit = 12 }: { peers: SectorPeer[]; selfNit: string | null; limit?: number }) {
  const lista = peers.slice(0, limit);
  const self = peers.find((p) => p.nit === selfNit);
  const rows = self && !lista.includes(self) ? [...lista, self] : lista;
  const max = rows[0]?.revenue || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((p) => {
        const mine = p.nit === selfNit;
        return (
          <div key={p.nit} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 text-[12px]">
            <span className="num text-right text-faint">{peers.indexOf(p) + 1}</span>
            <div>
              <div className="flex items-baseline justify-between gap-2"><span className={`truncate ${mine ? "font-extrabold text-ink" : "text-ink-soft"}`} title={p.name}>{shortName(p.name, 3)}</span><span className="num shrink-0 text-faint">{p.growth !== null ? `${fmtNum(p.growth, 0)} %` : "—"} · {p.opMargin !== null ? `${fmtNum(p.opMargin, 0)} %` : "—"}</span></div>
              <div className="mt-0.5 h-[7px] overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(p.revenue / max) * 100}%`, background: mine ? "var(--gold)" : "var(--cyan-deep)", opacity: mine ? 1 : 0.6 }} /></div>
            </div>
            <span className={`num w-20 text-right ${mine ? "font-extrabold text-ink" : "text-ink-soft"}`}>{fmtNum(p.revenue / 1000, 1)} mm</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Comparativo de laboratorios: Supersociedades × INVIMA ──────────────── */
export type Comparable = { nombre: string; self: boolean; peer: SectorPeer | null; titular: TitularDetalle | null };
export function comparables(s: SectorData, intel: Inteligencia | null, selfPeer: SectorPeer | null, titular: TitularDetalle | null, ciiu: string | null, max = 8): Comparable[] {
  const porClave = new Map<string, TitularDetalle>();
  for (const t of intel?.invima.top ?? []) porClave.set(t.key, t);
  const match = (name: string) => { const k = normTitular(name); return porClave.get(k) ?? [...porClave.values()].find((t) => t.key.includes(k) || k.includes(t.key)) ?? null; };
  const out: Comparable[] = [];
  if (selfPeer || titular) out.push({ nombre: selfPeer?.name ?? titular!.nombre, self: true, peer: selfPeer, titular });
  for (const p of s.peers.filter((p) => (!ciiu || p.ciiu === ciiu) && p.nit !== selfPeer?.nit)) {
    const t = match(p.name);
    if (!t) continue;
    out.push({ nombre: p.name, self: false, peer: p, titular: t });
    if (out.length >= max) break;
  }
  return out;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export function CanalesBarra({ c, label, self = false }: { c: Canales; label: string; self?: boolean }) {
  const total = c.institucional + c.comercial + c.muestraMedica || 1;
  const seg = [[c.comercial, "var(--cyan-deep)", "comercial"], [c.institucional, "var(--navy)", "institucional"], [c.muestraMedica, "var(--gold)", "muestra médica"]] as const;
  return (
    <div className="text-[12px]">
      <div className="flex items-baseline justify-between gap-2"><span className={self ? "font-extrabold text-ink" : "text-ink-soft"}>{label}</span><span className="num text-faint">{fmtNum(pct(c.institucional, total), 0)} % inst. · {fmtNum(pct(c.muestraMedica, total), 0) } % muestras</span></div>
      <div className="mt-0.5 flex h-[9px] overflow-hidden rounded-full bg-surface-2">
        {seg.map(([n, color, t]) => <div key={t} title={`${t}: ${fmtNum(n, 0)} presentaciones`} style={{ width: `${(n / total) * 100}%`, background: color, opacity: self ? 1 : 0.75 }} />)}
      </div>
    </div>
  );
}

export function RadarAtc({ titular, intel }: { titular: TitularDetalle; intel: Inteligencia }) {
  const total = titular.atc1.reduce((a, b) => a + b.n, 0) || 1;
  const top = intel.invima.atcMercado.slice(0, 8);
  const maxShare = Math.max(...top.map((a) => a.share ?? 0), ...top.map((a) => pct(titular.atc1.find((x) => x.code === a.code)?.n ?? 0, total)));
  return <MiniRadar color="var(--gold)" max={Math.ceil(maxShare / 5) * 5} axes={top.map((a) => ({ label: a.code, value: pct(titular.atc1.find((x) => x.code === a.code)?.n ?? 0, total), target: a.share ?? 0 }))} />;
}

export function Productos({ titular }: { titular: TitularDetalle }) {
  const grupos = new Map<string, { nombre: string; presentaciones: number }[]>();
  for (const p of titular.productos) { const g = grupos.get(p.atc2) ?? []; g.push(p); grupos.set(p.atc2, g); }
  const orden = [...grupos].sort((a, b) => b[1].reduce((x, y) => x + y.presentaciones, 0) - a[1].reduce((x, y) => x + y.presentaciones, 0));
  return (
    <div className="space-y-2.5">
      {orden.map(([atc2, ps]) => (
        <div key={atc2 || "sin"}>
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-faint"><span className="num text-cyan-deep">{atc2 || "—"}</span> {atc2Nombre(atc2, "sin grupo")}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{ps.map((p) => <span key={p.nombre} className="chip" title={`${p.presentaciones} presentaciones comerciales`}>{p.nombre.charAt(0) + p.nombre.slice(1).toLowerCase()} <span className="num ml-1 text-faint">{p.presentaciones}</span></span>)}</div>
        </div>
      ))}
    </div>
  );
}

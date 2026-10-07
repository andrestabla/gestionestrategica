// ─────────────────────────────────────────────────────────────────────────────
// Benchmark sectorial con datos reales de la Superintendencia de Sociedades
// (datos abiertos · datos.gov.co). El JSON por sector lo produce
// scripts/sector-fetch.ts; aquí se tipa, se elige el sector de la empresa y se
// calculan las posiciones (percentiles) frente a la distribución del sector.
// ─────────────────────────────────────────────────────────────────────────────

import suministros from "./sector/suministros-industriales.json";
import { INSTITUTION, FINANCIALS } from "./demo";

export type Quantiles = { n: number; p10: number | null; p25: number | null; p50: number | null; p75: number | null; p90: number | null };
export type SectorPeer = {
  nit: string; name: string; dept: string; city: string; ciiu: string;
  revenue: number; revenuePrev: number | null; growth: number | null;
  grossMargin: number | null; opMargin: number | null; netMargin: number | null;
  roa: number | null; assets: number | null; equity: number | null; leverage: number | null;
};
export type SectorData = {
  key: string; label: string;
  ciiu: { code: string; name: string }[];
  source: { name: string; datasets: { id: string; name: string; url: string }[]; cut: string; fetchedAt: string; note: string };
  units: string; n: number;
  totals: { revenue: number; revenuePrev: number; growth: number | null; assets: number };
  dist: { growth: Quantiles; grossMargin: Quantiles; opMargin: Quantiles; netMargin: Quantiles; roa: Quantiles; leverage: Quantiles; revenue: Quantiles };
  sizes: { band: string; n: number }[];
  concentration: { top5Share: number; top10Share: number; top20Share: number };
  departments: { name: string; n: number; revenue: number; share: number }[];
  byCiiu: { code: string; name: string; n: number; revenue: number; growthP50: number | null; opMarginP50: number | null }[];
  peers: SectorPeer[];
  comparables: SectorPeer[];
};

/** Sectores disponibles en la plataforma (uno por archivo JSON). */
export const SECTORS: Record<string, SectorData> = {
  "suministros-industriales": suministros as SectorData,
};

export const sectorOf = (key: string): SectorData | null => SECTORS[key] ?? null;

/** Sector de la empresa activa. */
export const SECTOR: SectorData = SECTORS[INSTITUTION.sectorKey] ?? suministros as SectorData;

/** Posición de un valor dentro de la distribución (0..1), interpolando entre los
    percentiles publicados. Para métricas donde «menos es mejor» (endeudamiento)
    se invierte con `lowerIsBetter`. */
export function percentileOf(q: Quantiles, v: number, lowerIsBetter = false): number {
  const pts: [number, number][] = [];
  if (q.p10 !== null) pts.push([q.p10, 0.1]);
  if (q.p25 !== null) pts.push([q.p25, 0.25]);
  if (q.p50 !== null) pts.push([q.p50, 0.5]);
  if (q.p75 !== null) pts.push([q.p75, 0.75]);
  if (q.p90 !== null) pts.push([q.p90, 0.9]);
  if (pts.length < 2) return 0.5;
  let r: number;
  if (v <= pts[0][0]) r = Math.max(0.02, pts[0][1] - 0.08 * ((pts[0][0] - v) / Math.max(1, Math.abs(pts[0][0]))));
  else if (v >= pts[pts.length - 1][0]) r = Math.min(0.98, pts[pts.length - 1][1] + 0.08 * ((v - pts[pts.length - 1][0]) / Math.max(1, Math.abs(pts[pts.length - 1][0]))));
  else {
    r = 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (v >= x0 && v <= x1) { r = x1 === x0 ? y0 : y0 + ((v - x0) / (x1 - x0)) * (y1 - y0); break; }
    }
  }
  r = Math.min(0.98, Math.max(0.02, r));
  return lowerIsBetter ? 1 - r : r;
}

export type RatioKey = "growth" | "grossMargin" | "opMargin" | "netMargin" | "roa" | "leverage";
export const RATIOS: { key: RatioKey; name: string; unit: string; lowerIsBetter?: boolean; help: string }[] = [
  { key: "growth", name: "Crecimiento de ingresos", unit: "%", help: "Ingresos de actividades ordinarias del año frente al anterior." },
  { key: "grossMargin", name: "Margen bruto", unit: "%", help: "Ganancia bruta sobre ingresos." },
  { key: "opMargin", name: "Margen operacional", unit: "%", help: "Ganancia por actividades de operación sobre ingresos." },
  { key: "netMargin", name: "Margen neto", unit: "%", help: "Ganancia del ejercicio sobre ingresos." },
  { key: "roa", name: "Rentabilidad del activo (ROA)", unit: "%", help: "Ganancia del ejercicio sobre total de activos." },
  { key: "leverage", name: "Endeudamiento", unit: "%", lowerIsBetter: true, help: "Total pasivos sobre total de activos." },
];

/** Razones financieras de la empresa activa, derivadas de FINANCIALS (demo). */
export function companyRatios(): Record<RatioKey, number> {
  const f = FINANCIALS;
  const pct = (a: number, b: number) => Math.round((a / b) * 1000) / 10;
  return {
    growth: pct(f.revenue - f.revenuePrev, f.revenuePrev),
    grossMargin: pct(f.grossProfit, f.revenue),
    opMargin: pct(f.operatingProfit, f.revenue),
    netMargin: pct(f.netProfit, f.revenue),
    roa: pct(f.netProfit, f.assets),
    leverage: pct(f.liabilities, f.assets),
  };
}

/** Comparación de la empresa con el sector, razón por razón. */
export function sectorComparison(sector: SectorData = SECTOR) {
  const mine = companyRatios();
  return RATIOS.map((r) => {
    const q = sector.dist[r.key];
    const value = mine[r.key];
    const pct = percentileOf(q, value, r.lowerIsBetter);
    const best = r.lowerIsBetter ? q.p25 : q.p75;
    return { ...r, value, median: q.p50, best, percentile: Math.round(pct * 100), better: q.p50 !== null && (r.lowerIsBetter ? value <= q.p50 : value >= q.p50) };
  });
}

/** Puntos del cuadrante: rentabilidad (margen operacional) × crecimiento, en
    percentiles del sector, para la empresa y los pares comparables. */
export function sectorQuadrant(sector: SectorData = SECTOR) {
  const mine = companyRatios();
  const pt = (name: string, op: number, g: number, self = false) => ({
    name, x: percentileOf(sector.dist.opMargin, op), y: percentileOf(sector.dist.growth, g), self,
  });
  return [
    pt(INSTITUTION.shortName, mine.opMargin, mine.growth, true),
    ...sector.comparables.map((p) => pt(shortName(p.name), p.opMargin ?? 0, p.growth ?? 0)),
  ];
}

/** Pares de referencia para las barras: comparables de los departamentos donde
    la empresa tiene sede, ordenados por crecimiento. */
export function sectorPeerBars(depts: string[], sector: SectorData = SECTOR, limit = 6) {
  const mine = companyRatios();
  const home = sector.comparables.filter((p) => depts.includes(p.dept) && p.growth !== null).slice(0, limit);
  return {
    metric: `Crecimiento de ingresos ${sector.source.cut.slice(0, 4)}`,
    nationalAvg: sector.dist.growth.p50 ?? 0,
    peers: [
      ...home.map((p) => ({ name: shortName(p.name), value: p.growth!, self: false })),
      { name: INSTITUTION.shortName, value: mine.growth, self: true },
    ].sort((a, b) => b.value - a.value),
  };
}

/** «COLOMBIANA DE REPRESENTACIONES INGENIERIA Y SUMINISTROS S.A.» → «Colombiana de Representaciones…» */
export function shortName(razon: string, words = 3): string {
  const stop = new Set(["SA", "SAS", "LTDA", "S", "A", "&", "CIA", "Y", "E", "SCA", "EN", "C", "BIC", "ESP", "SCS"]);
  const toks = razon.split(/\s+/).filter((t) => !stop.has(t.toUpperCase().replace(/[.,]/g, "")));
  const minor = new Set(["DE", "DEL", "LA", "LAS", "LOS", "EL", "PARA", "POR", "CON"]);
  const cap = (t: string) => minor.has(t.toUpperCase()) ? t.toLowerCase() : t.length <= 3 ? t : t.charAt(0) + t.slice(1).toLowerCase();
  const base = toks.slice(0, words).map(cap).join(" ");
  return toks.length > words ? base + "…" : base;
}

export const fmtMillones = (v: number) =>
  v >= 1_000_000 ? `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(v / 1_000_000)} billones`
    : v >= 1000 ? `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v / 1000)} mil millones`
      : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v)} millones`;

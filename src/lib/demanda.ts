// Lectura de demanda y competencia por territorio (M7 · Inteligencia).
// Cruza la población por unidad territorial, las sociedades del sector
// domiciliadas allí y la presencia de la empresa (sede, cobertura,
// oportunidad). Reglas puras: sin estado ni dependencias de datos.

import type { Territory } from "@/data/demo";

export type Presence = Territory["presence"] | "ninguna";

export type TerritoryDemand = {
  name: string;
  population: number;
  presence: Presence;
  weight: number | null;         // peso comercial declarado por la empresa (1–3)
  companies: number;             // sociedades del sector domiciliadas allí
  revenue: number;               // ingresos del sector allí (unidades del dataset)
  perCapita: number | null;      // ingresos del sector por habitante (misma unidad × 1e6 / población)
  share: number;                 // % de la población nacional
};

export type Coverage = {
  total: number;
  covered: number; coveredPct: number;           // provincias con sede o cobertura
  opportunity: number; opportunityPct: number;   // declaradas como oportunidad
  none: number; nonePct: number;                 // sin presencia ni plan
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

/** Una fila por unidad territorial, ordenadas por población. */
export function demandByTerritory(
  population: { name: string; population: number }[],
  sectorUnits: { name: string; n: number; revenue: number }[],
  territories: Territory[],
  unitsAreMillions = true,
): TerritoryDemand[] {
  const total = population.reduce((a, p) => a + p.population, 0);
  return population
    .map((p) => {
      const s = sectorUnits.find((u) => u.name === p.name);
      const t = territories.find((x) => x.name === p.name);
      const revenue = s?.revenue ?? 0;
      return {
        name: p.name, population: p.population,
        presence: (t?.presence ?? "ninguna") as Presence, weight: t?.weight ?? null,
        companies: s?.n ?? 0, revenue,
        perCapita: p.population > 0 && revenue > 0 ? Math.round(((unitsAreMillions ? revenue * 1e6 : revenue) / p.population) * 10) / 10 : null,
        share: pct(p.population, total),
      };
    })
    .sort((a, b) => b.population - a.population);
}

/** Cuánta población queda cubierta, en oportunidad o sin presencia. */
export function coverage(rows: TerritoryDemand[]): Coverage {
  const total = rows.reduce((a, r) => a + r.population, 0);
  const sum = (f: (r: TerritoryDemand) => boolean) => rows.filter(f).reduce((a, r) => a + r.population, 0);
  const covered = sum((r) => r.presence === "sede" || r.presence === "cobertura");
  const opportunity = sum((r) => r.presence === "oportunidad");
  const none = sum((r) => r.presence === "ninguna");
  return { total, covered, coveredPct: pct(covered, total), opportunity, opportunityPct: pct(opportunity, total), none, nonePct: pct(none, total) };
}

/** Territorios sin presencia ni plan, ordenados por población: dónde mirar primero. */
export const openMarkets = (rows: TerritoryDemand[], top = 5): TerritoryDemand[] =>
  rows.filter((r) => r.presence === "ninguna").slice(0, top);

/** Competidores domiciliados en cada territorio donde la empresa está o planea estar. */
export function competitorsByTerritory<P extends { name: string; dept: string; revenue: number; growth: number | null }>(
  peers: P[], territories: Territory[], top = 3,
): { territory: Territory; count: number; revenue: number; top: P[] }[] {
  return territories.map((t) => {
    const here = peers.filter((p) => p.dept === t.name).sort((a, b) => b.revenue - a.revenue);
    return { territory: t, count: here.length, revenue: here.reduce((a, p) => a + p.revenue, 0), top: here.slice(0, top) };
  });
}

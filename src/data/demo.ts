// ─────────────────────────────────────────────────────────────────────────────
// 4Shine Empresas · Datos ilustrativos de Andina Suministros (empresa
// ficticia de distribución de suministros industriales, 85 colaboradores,
// sedes en Bogotá, Medellín y Cali). Fuente única del modo demo y del seed.
// Los valores son de ejemplo; la información real se produce con el
// diagnóstico 4Shine-OD y la instalación de los frameworks.
// ─────────────────────────────────────────────────────────────────────────────

import { CAPS, DIMS, LEVELS as MAP_LEVELS } from "@/data/mapa";

export const INSTITUTION = {
  slug: "andina",
  name: "Andina Suministros",
  shortName: "Andina",
  city: "Bogotá",
  department: "Cundinamarca",
  sector: "Distribución de suministros industriales",
  size: "85 colaboradores · 3 sedes",
  // sector de referencia para M2 y M7 (src/data/sector/<sectorKey>.json) y
  // actividad principal CIIU rev. 4 A.C. con la que reporta a Supersociedades
  sectorKey: "suministros-industriales",
  ciiu: "G4659",
};

/** Estados financieros de cierre de la empresa (COP millones), con la misma
    estructura que reportan las sociedades a Supersociedades: permiten ubicar a
    Andina en la distribución real del sector. Valores ilustrativos. */
export const FINANCIALS = {
  year: 2025,
  revenue: 38_400, revenuePrev: 33_900,
  grossProfit: 10_560, operatingProfit: 1_997, netProfit: 1_190,
  assets: 21_500, liabilities: 11_700, equity: 9_800,
};
export const COMPANY = INSTITUTION;

/** Las cuatro capacidades conservan el índice «line» 1..4 en toda la plataforma. */
export const LINES = CAPS.map((c) => ({
  n: c.n, code: c.code, name: c.name, short: c.name, verb: c.verb, color: c.color, question: c.q,
}));

/** Las 17 dimensiones del mapa, con la capacidad a la que pertenecen. */
export const DIMENSIONS = DIMS.map((d) => ({ key: d.code, line: d.line, name: d.name, defn: d.defn }));
export const dimensionsOf = (line: number) => DIMENSIONS.filter((d) => d.line === line);

export const LEVELS = MAP_LEVELS;

// capacidad → dimensión → { value, target } — derivado de la medición publicada vigente
import { currentAssessment, previousAssessment } from "./cmi";
export const SCORES = currentAssessment().scores!;

export const lineScore = (n: number) => {
  const dims = Object.values(SCORES[n]);
  return dims.reduce((a, d) => a + d.value, 0) / dims.length;
};
export const lineTarget = (n: number) => {
  const dims = Object.values(SCORES[n]);
  return dims.reduce((a, d) => a + d.target, 0) / dims.length;
};
export const institutionScore = () =>
  LINES.reduce((a, l) => a + lineScore(l.n), 0) / LINES.length;

// Medición anterior: promedio por capacidad del corte publicado previo
export const PREV_SCORES: Record<number, number> = Object.fromEntries(
  [1, 2, 3, 4].map((n) => {
    const prev = previousAssessment();
    if (!prev?.scores) return [n, lineScore(n)];
    const dims = Object.values(prev.scores[n]);
    return [n, dims.reduce((acc, d) => acc + d.value, 0) / dims.length];
  }),
);

// Evidencias, KPI e iniciativas: la fuente detallada vive en ./cmi.
import {
  KPI_CATALOG, INITIATIVES_FULL, EVIDENCE_CATALOG, responsible,
} from "./cmi";

export const EVIDENCES = EVIDENCE_CATALOG.map((e) => ({
  ...e,
  source: responsible(e.sourceId).dependencia,
}));

// ─── Capacidades del mapa estratégico: cada dimensión es una capacidad que
//     las iniciativas instalan; su nivel actual y su meta vienen de la medición.
export const OBJECTIVES = [
  { id: "ob1", name: "Crecer con rentabilidad abriendo nuevos mercados" },
  { id: "ob2", name: "Cumplir la promesa al cliente de forma consistente" },
  { id: "ob3", name: "Operar sin depender del fundador ni de personas clave" },
];
const OBJ_OF_LINE: Record<number, string> = { 1: "ob1", 2: "ob3", 3: "ob2", 4: "ob3" };

export const CAPABILITIES = DIMS.map((d) => ({
  id: d.code, line: d.line, objective: OBJ_OF_LINE[d.line], name: d.name,
  current: SCORES[d.line][d.code].value, target: SCORES[d.line][d.code].target,
  owner: responsible({ 1: "R01", 2: "R01", 3: "R03", 4: "R04" }[d.line]!).dependencia,
}));

// ─── KPI ─────────────────────────────────────────────────────────────────────

export const KPIS = KPI_CATALOG.map((k) => ({
  ...k,
  owner: responsible(k.ownerId).dependencia,
}));
export type KpiDemo = (typeof KPIS)[number];

// ─── Iniciativas ─────────────────────────────────────────────────────────────

export const INITIATIVES = INITIATIVES_FULL.map((i) => ({
  ...i,
  owner: responsible(i.ownerId).dependencia,
}));
export type InitiativeDemo = (typeof INITIATIVES)[number];

// ─── Territorio · presencia por departamento ─────────────────────────────────

export type Territory = {
  name: string;                 // departamento
  weight: 1 | 2 | 3;            // peso comercial
  presence: "sede" | "cobertura" | "oportunidad";
  reading: string;
};

export const TERRITORIES: Territory[] = [
  { name: "Cundinamarca", weight: 3, presence: "sede", reading: "Sede principal y bodega central; concentra el 52 % de las ventas." },
  { name: "Bogotá D.C.", weight: 3, presence: "sede", reading: "Mercado base de clientes industriales y de construcción." },
  { name: "Antioquia", weight: 2, presence: "sede", reading: "Sede Medellín, abierta en 2023; segunda en ventas y la mejor en recompra." },
  { name: "Valle del Cauca", weight: 2, presence: "sede", reading: "Sede Cali; margen bajo por fletes y dependencia de dos clientes grandes." },
  { name: "Atlántico", weight: 2, presence: "oportunidad", reading: "Barranquilla: la réplica prevista para 2027 con la ficha de unidad replicable." },
  { name: "Santander", weight: 1, presence: "cobertura", reading: "Atendido desde Bogotá con entregas semanales." },
  { name: "Boyacá", weight: 1, presence: "cobertura", reading: "Clientes mineros e industriales atendidos desde Bogotá." },
  { name: "Risaralda", weight: 1, presence: "cobertura", reading: "Atendido desde Medellín." },
  { name: "Bolívar", weight: 1, presence: "oportunidad", reading: "Demanda industrial de Cartagena sin cobertura directa." },
];

// El benchmark sectorial (M2) y la inteligencia (M7) leen datos reales de
// Supersociedades desde src/data/sector.ts; aquí solo quedan los estados
// financieros ilustrativos de Andina (FINANCIALS) que la ubican en el sector.

export const DEMO_USERS = [
  { email: "admin@algoritmot.com", name: "Admin de la Plataforma", role: "ADMIN", password: "4shine-demo-2026" },
  { email: "advisor@4shine.co", name: "Advisor 4Shine", role: "CONSULTOR", password: "4shine-demo-2026" },
  { email: "gerencia@andina.example", name: "Laura Restrepo", role: "LIDER", password: "4shine-demo-2026" },
  { email: "operaciones@andina.example", name: "Carolina Vélez", role: "RESPONSABLE", line: 3, password: "4shine-demo-2026" },
  { email: "junta@andina.example", name: "Junta de socios", role: "DIRECTIVO", password: "4shine-demo-2026" },
] as const;

export const fmtCOP = (v: number) =>
  "$ " + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v);

export const fmtNum = (v: number, d = 1) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(v);

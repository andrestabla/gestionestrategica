// ─────────────────────────────────────────────────────────────────────────────
// Inteligencia regulatoria y macro por sector (M7): el JSON por sector lo produce
// scripts/inteligencia-fetch.ts desde datos abiertos (INVIMA, Comisión Nacional de
// Precios, Banco de la República). Aquí se tipa, se resuelve el sector de la empresa
// y se ubica a la empresa entre los titulares por su nombre. Sin JSON para el sector,
// el módulo simplemente no muestra estas lecturas.
// ─────────────────────────────────────────────────────────────────────────────

import farmaCo from "./inteligencia/farmaceutico-colombia.json";

export type AtcCount = { code: string; name: string; n: number; share?: number };
export type TitularDetalle = {
  rank: number; key: string; nombre: string; registros: number; cums: number;
  atc1: AtcCount[]; atc2: AtcCount[];
  vencimientos: { en12m: number; en36m: number; porAno: { ano: number; n: number }[] };
  regulados: { expedientes: number; share: number; mercadosRelevantes: number };
  modalidades: { modalidad: string; n: number }[];
};
export type Inteligencia = {
  key: string; fetchedAt: string;
  fuentes: { id: string; name: string; url: string; note: string }[];
  invima: { registros: number; titulares: number; cums: number; titularesAgrupados: number; atcMercado: AtcCount[]; top: TitularDetalle[] };
  regulados: { presentaciones: number; mercadosRelevantes: number; expedientes: number; circularPrincipal: string; vigenciaDesde: string };
  trm: { valor: number; fecha: string; hace12m: number; fecha12m: string; variacion12m: number };
};

export const INTELIGENCIA: Record<string, Inteligencia> = {
  "farmaceutico-colombia": farmaCo as Inteligencia,
};
export const inteligenciaOf = (sectorKey: string): Inteligencia | null => INTELIGENCIA[sectorKey] ?? null;

/** Misma normalización que el extractor: mayúsculas sin tildes, sin forma jurídica ni puntuación. */
export const normTitular = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(S\.?A\.?S?\.?|LTDA\.?|S\.?\s?EN\s?C\.?|INC\.?|LLC|LIMITED|LIMITADA|CIA\.?|CO\.?|CORP\.?|GMBH|AG|BV|N\.?V\.?|PLC|SPA|SRL|S\.?L\.?)\b/g, " ")
  .replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const GENERICAS = new Set(["LABORATORIOS", "LABORATORIO", "FARMACEUTICA", "FARMACEUTICOS", "PRODUCTOS", "COLOMBIA", "GRUPO", "INDUSTRIAS", "INDUSTRIA", "COMPANIA", "DE", "LA", "EL", "Y", "DEL", "LOS", "LAS"]);

/** ¿Este nombre (titular, sociedad) es la empresa? Compara las palabras propias del nombre de la empresa,
    sin forma jurídica ni genéricos, con el nombre normalizado. */
export function coincideEmpresa(c: { name: string; shortName?: string }, nombre: string): boolean {
  const k = normTitular(nombre);
  const candidatos = [c.shortName, c.name].filter((x): x is string => !!x).map(normTitular)
    .map((x) => x.split(" ").filter((w) => w.length >= 3 && !GENERICAS.has(w)).join(" ")).filter(Boolean);
  return candidatos.some((cand) => k === cand || k.split(" ").includes(cand) || k.includes(cand) || cand.includes(k));
}

/** Titular que corresponde a la empresa: coincide el nombre o el nombre corto (sin palabras genéricas) con la
    clave del titular. Devuelve nulo si la empresa no está entre los titulares con detalle. */
export function titularDe(c: { name: string; shortName?: string }, data: Inteligencia | null): TitularDetalle | null {
  if (!data) return null;
  const candidatos = [c.shortName, c.name].filter((x): x is string => !!x).map(normTitular)
    .map((x) => x.split(" ").filter((w) => w.length >= 3 && !GENERICAS.has(w)).join(" ")).filter(Boolean);
  for (const cand of candidatos) {
    const hit = data.invima.top.find((t) => t.key === cand) ?? data.invima.top.find((t) => t.key.split(" ").includes(cand)) ?? data.invima.top.find((t) => t.key.includes(cand) || cand.includes(t.key));
    if (hit) return hit;
  }
  return null;
}

/** Nombres de los grupos terapéuticos ATC de nivel 2 (los que aparecen en registros colombianos). */
export const ATC2: Record<string, string> = {
  A01: "Preparados estomatológicos", A02: "Trastornos relacionados con la acidez", A03: "Trastornos funcionales gastrointestinales", A04: "Antieméticos", A05: "Terapia biliar y hepática",
  A06: "Laxantes", A07: "Antidiarreicos y antiinfecciosos intestinales", A08: "Preparados contra la obesidad", A09: "Digestivos", A10: "Fármacos para la diabetes", A11: "Vitaminas", A12: "Suplementos minerales", A13: "Tónicos", A14: "Anabolizantes sistémicos", A16: "Otros del tracto alimentario y metabolismo",
  B01: "Antitrombóticos", B02: "Antihemorrágicos", B03: "Antianémicos", B05: "Sustitutos de la sangre y soluciones", B06: "Otros agentes hematológicos",
  C01: "Terapia cardíaca", C02: "Antihipertensivos", C03: "Diuréticos", C04: "Vasodilatadores periféricos", C05: "Vasoprotectores", C07: "Betabloqueantes", C08: "Bloqueantes de canales de calcio", C09: "Sistema renina-angiotensina", C10: "Hipolipemiantes",
  D01: "Antifúngicos dermatológicos", D02: "Emolientes y protectores", D03: "Cicatrizantes", D04: "Antipruriginosos", D05: "Antipsoriásicos", D06: "Antibióticos y quimioterápicos dermatológicos", D07: "Corticosteroides dermatológicos", D08: "Antisépticos y desinfectantes", D10: "Antiacneicos", D11: "Otros dermatológicos",
  G01: "Antiinfecciosos y antisépticos ginecológicos", G02: "Otros ginecológicos", G03: "Hormonas sexuales y moduladores", G04: "Urológicos",
  H01: "Hormonas hipofisarias e hipotalámicas", H02: "Corticosteroides sistémicos", H03: "Terapia tiroidea", H04: "Hormonas pancreáticas", H05: "Homeostasis del calcio",
  J01: "Antibacterianos sistémicos", J02: "Antimicóticos sistémicos", J04: "Antimicobacterianos", J05: "Antivirales sistémicos", J06: "Sueros inmunes e inmunoglobulinas", J07: "Vacunas",
  L01: "Antineoplásicos", L02: "Terapia endocrina oncológica", L03: "Inmunoestimulantes", L04: "Inmunosupresores",
  M01: "Antiinflamatorios y antirreumáticos", M02: "Tópicos para dolor articular y muscular", M03: "Relajantes musculares", M04: "Antigotosos", M05: "Enfermedades óseas", M09: "Otros del sistema musculoesquelético",
  N01: "Anestésicos", N02: "Analgésicos", N03: "Antiepilépticos", N04: "Antiparkinsonianos", N05: "Psicolépticos", N06: "Psicoanalépticos", N07: "Otros del sistema nervioso",
  P01: "Antiprotozoarios", P02: "Antihelmínticos", P03: "Ectoparasiticidas",
  R01: "Preparados nasales", R02: "Preparados para la garganta", R03: "Enfermedades obstructivas de las vías respiratorias", R05: "Tos y resfriado", R06: "Antihistamínicos sistémicos", R07: "Otros del sistema respiratorio",
  S01: "Oftalmológicos", S02: "Otológicos", S03: "Oftalmológicos y otológicos",
  V01: "Alérgenos", V03: "Otros productos terapéuticos", V04: "Agentes diagnósticos", V06: "Nutrientes generales", V07: "Otros productos no terapéuticos", V08: "Medios de contraste",
};
export const atc2Nombre = (code: string, fallback?: string) => ATC2[code] ?? fallback ?? code;

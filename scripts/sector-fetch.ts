// Extrae y agrega el benchmark sectorial desde los datos abiertos de la
// Superintendencia de Sociedades (datos.gov.co · Socrata) para un conjunto de
// códigos CIIU. Produce src/data/sector/<clave>.json, que alimenta M2
// (Benchmark) y M7 (Inteligencia).
//
//   npx tsx scripts/sector-fetch.ts suministros-industriales G4659 G4663 G4669
//   npx tsx scripts/sector-fetch.ts --corte 2024-12-31 <clave> <CIIU…>
//
// Datasets (estados financieros de fin de ejercicio, NIIF plenas y pymes):
//   6hqw-m3dm  Carátula (NIT, razón social, CIIU, departamento)
//   prwj-nzxa  Estado de resultado integral
//   pfdp-zks5  Estado de situación financiera
// Los valores vienen en miles de pesos («Unidad de diligenciamiento»); aquí se
// expresan en millones de COP. Las tildes de los conceptos están almacenadas
// como U+FFFD en el portal, por eso los nombres de concepto llevan ese carácter.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://www.datos.gov.co/resource";
const DS = { caratula: "6hqw-m3dm", resultado: "prwj-nzxa", situacion: "pfdp-zks5" } as const;
const DS_NAMES: Record<keyof typeof DS, string> = {
  caratula: "Carátula · estados financieros de fin de ejercicio",
  resultado: "Estado de resultado integral",
  situacion: "Estado de situación financiera",
};

const argv = process.argv.slice(2);
let cut = "2025-12-31";
const ci = argv.indexOf("--corte");
if (ci >= 0) { cut = argv[ci + 1]; argv.splice(ci, 2); }
const [key, ...ciiuCodes] = argv;
if (!key || ciiuCodes.length === 0) {
  console.error("uso: tsx scripts/sector-fetch.ts [--corte AAAA-MM-DD] <clave> <CIIU…>");
  process.exit(1);
}
const CUT = `${cut}T00:00:00.000`;

type Row = Record<string, string>;
async function soql(ds: string, params: Record<string, string>): Promise<Row[]> {
  const url = new URL(`${BASE}/${ds}.json`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const out: Row[] = [];
  const limit = 50000;
  for (let offset = 0; ; offset += limit) {
    url.searchParams.set("$limit", String(limit));
    url.searchParams.set("$offset", String(offset));
    let res: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    if (!res || !res.ok) throw new Error(`Socrata ${ds}: ${res?.status} ${await res?.text()}`);
    const page = (await res.json()) as Row[];
    out.push(...page);
    if (page.length < limit) break;
  }
  return out;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const chunks = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// Nombres de departamento tal como los usa el mapa de la plataforma (src/data/geo.ts)
const DEPT: Record<string, string> = {
  "BOGOTA D.C.": "Bogotá D.C.", "BOGOTA": "Bogotá D.C.", "ANTIOQUIA": "Antioquia", "VALLE": "Valle del Cauca",
  "VALLE DEL CAUCA": "Valle del Cauca", "ATLANTICO": "Atlántico", "CUNDINAMARCA": "Cundinamarca", "SANTANDER": "Santander",
  "BOLIVAR": "Bolívar", "RISARALDA": "Risaralda", "NORTE DE SANTANDER": "Norte de Santander", "CALDAS": "Caldas",
  "MAGDALENA": "Magdalena", "META": "Meta", "BOYACA": "Boyacá", "TOLIMA": "Tolima", "HUILA": "Huila", "QUINDIO": "Quindío",
  "CAUCA": "Cauca", "NARIÑO": "Nariño", "NARINO": "Nariño", "CORDOBA": "Córdoba", "CESAR": "Cesar", "SUCRE": "Sucre",
  "LA GUAJIRA": "La Guajira", "GUAJIRA": "La Guajira", "CASANARE": "Casanare", "ARAUCA": "Arauca", "CAQUETA": "Caquetá",
  "PUTUMAYO": "Putumayo", "CHOCO": "Chocó", "AMAZONAS": "Amazonas", "GUAVIARE": "Guaviare", "GUAINIA": "Guainía",
  "VAUPES": "Vaupés", "VICHADA": "Vichada", "SAN ANDRES": "San Andrés y Providencia",
  "ARCHIPIELAGO DE SAN ANDRES, PROVIDENCIA Y SANTA CATALINA": "San Andrés y Providencia",
};
const dept = (v: string) => DEPT[v.trim().toUpperCase()] ?? v.trim();

// Nombres CIIU rev. 4 A.C. con tildes (el portal las almacena como U+FFFD)
const CIIU_NAMES: Record<string, string> = {
  G4610: "Comercio al por mayor a cambio de una retribución o por contrata",
  G4620: "Comercio al por mayor de materias primas agropecuarias; animales vivos",
  G4631: "Comercio al por mayor de productos alimenticios",
  G4632: "Comercio al por mayor de bebidas y tabaco",
  G4641: "Comercio al por mayor de productos textiles, productos confeccionados para uso doméstico",
  G4642: "Comercio al por mayor de prendas de vestir",
  G4643: "Comercio al por mayor de calzado",
  G4644: "Comercio al por mayor de aparatos y equipo de uso doméstico",
  G4645: "Comercio al por mayor de productos farmacéuticos, medicinales, cosméticos y de tocador",
  G4649: "Comercio al por mayor de otros utensilios domésticos n.c.p.",
  G4651: "Comercio al por mayor de computadores, equipo periférico y programas de informática",
  G4652: "Comercio al por mayor de equipo, partes y piezas electrónicos y de telecomunicaciones",
  G4653: "Comercio al por mayor de maquinaria y equipo agropecuarios",
  G4659: "Comercio al por mayor de otros tipos de maquinaria y equipo n.c.p.",
  G4661: "Comercio al por mayor de combustibles sólidos, líquidos, gaseosos y productos conexos",
  G4662: "Comercio al por mayor de metales y productos metalíferos",
  G4663: "Comercio al por mayor de materiales de construcción, artículos de ferretería, pinturas, productos de vidrio, equipo y materiales de fontanería y calefacción",
  G4664: "Comercio al por mayor de productos químicos básicos, cauchos y plásticos en formas primarias y productos químicos de uso agropecuario",
  G4665: "Comercio al por mayor de desperdicios, desechos y chatarra",
  G4669: "Comercio al por mayor de otros productos n.c.p.",
  G4690: "Comercio al por mayor no especializado",
};

const A = "�"; // carácter con el que el portal almacena las vocales con tilde
const C = {
  ciiu: `Clasificaci${A}n Industrial Internacional Uniforme Versi${A}n 4 A.C (CIIU)`,
  razon: `Raz${A}n social de la sociedad`,
  dep: `Departamento de la direcci${A}n del domicilio`,
  ciudad: `Ciudad de la direcci${A}n del domicilio`,
  ingresos: "Ingresos de actividades ordinarias",
  bruta: "Ganancia bruta",
  operacional: `Ganancia (p${A}rdida) por actividades de operaci${A}n`,
  neta: `Ganancia (p${A}rdida)`,
  activos: "Total de activos",
  patrimonio: "Patrimonio total",
  pasivos: "Total pasivos",
};

async function main() {
  console.error(`Corte ${cut} · CIIU ${ciiuCodes.join(", ")}`);
  // 1) Empresas del sector (carátula, CIIU)
  const ciiuRows = await soql(DS.caratula, {
    $select: "nit,valor",
    $where: `fecha_corte=${q(CUT)} AND concepto=${q(C.ciiu)} AND (${ciiuCodes.map((c) => `valor like ${q(c + "%")}`).join(" OR ")})`,
  });
  const ciiuOf = new Map<string, string>();
  const ciiuName = new Map<string, string>();
  for (const r of ciiuRows) {
    const code = r.valor.slice(0, 5);
    ciiuOf.set(r.nit, code);
    if (!ciiuName.has(code)) ciiuName.set(code, r.valor.replace(/^[A-Z]\d{4}\s*-\s*/, "").replace(/\uFFFD/g, "·").trim());
  }
  const nits = [...ciiuOf.keys()];
  console.error(`${nits.length} empresas con CIIU del sector`);

  // 2) Razón social y departamento
  const name = new Map<string, string>(), dep = new Map<string, string>(), city = new Map<string, string>();
  for (const batch of chunks(nits, 150)) {
    const rows = await soql(DS.caratula, {
      $select: "nit,concepto,valor",
      $where: `fecha_corte=${q(CUT)} AND nit in (${batch.join(",")}) AND concepto in (${[C.razon, C.dep, C.ciudad].map(q).join(",")})`,
    });
    for (const r of rows) {
      // en razones sociales en mayúsculas el carácter perdido es casi siempre la Ñ
      if (r.concepto === C.razon) name.set(r.nit, r.valor.replace(/\uFFFD/g, "Ñ").trim());
      else if (r.concepto === C.dep) dep.set(r.nit, dept(r.valor));
      else city.set(r.nit, r.valor.replace(/\uFFFD/g, "Ñ").trim());
    }
  }

  // 3) Resultado integral (actual y anterior) y situación financiera (actual)
  type Fin = { ing?: number; ingPrev?: number; bruta?: number; op?: number; neta?: number; act?: number; pat?: number; pas?: number };
  const fin = new Map<string, Fin>();
  const F = (nit: string) => fin.get(nit) ?? (fin.set(nit, {}), fin.get(nit)!);
  const num = (v: string) => { const n = Number(String(v).replace(/,/g, "")); return Number.isFinite(n) ? n / 1e3 : undefined; }; // miles de pesos → millones
  for (const batch of chunks(nits, 150)) {
    const rows = await soql(DS.resultado, {
      $select: "nit,concepto,periodo,valor",
      $where: `fecha_corte=${q(CUT)} AND nit in (${batch.join(",")}) AND concepto in (${[C.ingresos, C.bruta, C.operacional, C.neta].map(q).join(",")})`,
    });
    for (const r of rows) {
      const v = num(r.valor); if (v === undefined) continue;
      const f = F(r.nit);
      const actual = r.periodo === "Periodo Actual";
      if (r.concepto === C.ingresos) { if (actual) f.ing = v; else f.ingPrev = v; }
      else if (!actual) continue;
      else if (r.concepto === C.bruta) f.bruta = v;
      else if (r.concepto === C.operacional) f.op = v;
      else if (r.concepto === C.neta) f.neta = v;
    }
    const bal = await soql(DS.situacion, {
      $select: "nit,concepto,valor",
      $where: `fecha_corte=${q(CUT)} AND periodo='Periodo Actual' AND nit in (${batch.join(",")}) AND concepto in (${[C.activos, C.patrimonio, C.pasivos].map(q).join(",")})`,
    });
    for (const r of bal) {
      const v = num(r.valor); if (v === undefined) continue;
      const f = F(r.nit);
      if (r.concepto === C.activos) f.act = v; else if (r.concepto === C.patrimonio) f.pat = v; else f.pas = v;
    }
    process.stderr.write(".");
  }
  console.error("");

  // 4) Agregación
  type Peer = {
    nit: string; name: string; dept: string; city: string; ciiu: string;
    revenue: number; revenuePrev: number | null; growth: number | null;
    grossMargin: number | null; opMargin: number | null; netMargin: number | null;
    roa: number | null; assets: number | null; equity: number | null; leverage: number | null;
  };
  const peers: Peer[] = [];
  for (const nit of nits) {
    const f = fin.get(nit);
    if (!f || !f.ing || f.ing <= 0) continue;
    const pct = (a?: number, b?: number) => a !== undefined && b ? Math.round((a / b) * 1000) / 10 : null;
    peers.push({
      nit, name: name.get(nit) ?? `NIT ${nit}`, dept: dep.get(nit) ?? "Sin dato", city: city.get(nit) ?? "", ciiu: ciiuOf.get(nit)!,
      revenue: Math.round(f.ing), revenuePrev: f.ingPrev ? Math.round(f.ingPrev) : null,
      growth: f.ingPrev && f.ingPrev > 0 ? Math.round(((f.ing - f.ingPrev) / f.ingPrev) * 1000) / 10 : null,
      grossMargin: pct(f.bruta, f.ing), opMargin: pct(f.op, f.ing), netMargin: pct(f.neta, f.ing),
      roa: pct(f.neta, f.act), assets: f.act ? Math.round(f.act) : null, equity: f.pat ? Math.round(f.pat) : null,
      leverage: pct(f.pas, f.act),
    });
  }
  peers.sort((a, b) => b.revenue - a.revenue);

  const quant = (xs: number[], p: number) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i);
    return Math.round((s[lo] + (s[hi] - s[lo]) * (i - lo)) * 10) / 10;
  };
  const dist = (sel: (p: Peer) => number | null) => {
    // recorte de valores extremos para que un dato atípico no deforme el cuartil
    const xs = peers.map(sel).filter((v): v is number => v !== null && Number.isFinite(v) && Math.abs(v) <= 500);
    return { n: xs.length, p10: quant(xs, 0.1), p25: quant(xs, 0.25), p50: quant(xs, 0.5), p75: quant(xs, 0.75), p90: quant(xs, 0.9) };
  };
  const revenue = peers.reduce((a, p) => a + p.revenue, 0);
  const withPrev = peers.filter((p) => p.revenuePrev);
  const revenuePrev = withPrev.reduce((a, p) => a + p.revenuePrev!, 0);
  const revenueSame = withPrev.reduce((a, p) => a + p.revenue, 0);
  const share = (k: number) => Math.round((peers.slice(0, k).reduce((a, p) => a + p.revenue, 0) / revenue) * 1000) / 10;
  const bands = [
    { band: "Hasta 10.000 M", lo: 0, hi: 10000 }, { band: "10.000 a 30.000 M", lo: 10000, hi: 30000 },
    { band: "30.000 a 100.000 M", lo: 30000, hi: 100000 }, { band: "Más de 100.000 M", lo: 100000, hi: Infinity },
  ].map((b) => ({ band: b.band, n: peers.filter((p) => p.revenue >= b.lo && p.revenue < b.hi).length }));
  const byDept = new Map<string, { n: number; revenue: number }>();
  for (const p of peers) { const d = byDept.get(p.dept) ?? { n: 0, revenue: 0 }; d.n++; d.revenue += p.revenue; byDept.set(p.dept, d); }
  const departments = [...byDept].map(([name, d]) => ({ name, n: d.n, revenue: Math.round(d.revenue), share: Math.round((d.revenue / revenue) * 1000) / 10 }))
    .sort((a, b) => b.revenue - a.revenue);
  const byCiiu = ciiuCodes.map((code) => {
    const ps = peers.filter((p) => p.ciiu === code);
    const g = ps.map((p) => p.growth).filter((v): v is number => v !== null && Math.abs(v) <= 500);
    const m = ps.map((p) => p.opMargin).filter((v): v is number => v !== null && Math.abs(v) <= 500);
    return { code, name: CIIU_NAMES[code] ?? ciiuName.get(code) ?? code, n: ps.length, revenue: Math.round(ps.reduce((a, p) => a + p.revenue, 0)), growthP50: quant(g, 0.5), opMarginP50: quant(m, 0.5) };
  });

  // Pares comparables: empresas medianas (10.000 a 100.000 M de ingresos), muestra
  // uniforme por tamaño de hasta 40 para el cuadrante y las barras de M2.
  const band = peers.filter((p) => p.revenue >= 10000 && p.revenue < 100000 && p.growth !== null && p.opMargin !== null && Math.abs(p.growth) <= 150 && Math.abs(p.opMargin) <= 60);
  const step = Math.max(1, Math.floor(band.length / 40));
  const comparables = band.filter((_, i) => i % step === 0).slice(0, 40);

  const out = {
    key,
    label: byCiiu.length === 1 ? byCiiu[0].name : "Comercio al por mayor · " + byCiiu.map((c) => c.code).join(", "),
    ciiu: byCiiu.map((c) => ({ code: c.code, name: c.name })),
    source: {
      name: "Superintendencia de Sociedades · Portal de datos abiertos (datos.gov.co)",
      datasets: (Object.keys(DS) as (keyof typeof DS)[]).map((k) => ({ id: DS[k], name: DS_NAMES[k], url: `https://www.datos.gov.co/resource/${DS[k]}` })),
      cut, fetchedAt: new Date().toISOString().slice(0, 10),
      note: "Sociedades que reportan estados financieros de fin de ejercicio a Supersociedades (NIIF plenas y pymes). No incluye microempresas ni sociedades fuera de supervisión; es la referencia de empresas formales medianas y grandes del sector.",
    },
    units: "COP millones",
    n: peers.length,
    totals: { revenue: Math.round(revenue), revenuePrev: Math.round(revenuePrev), growth: revenuePrev ? Math.round(((revenueSame - revenuePrev) / revenuePrev) * 1000) / 10 : null, assets: Math.round(peers.reduce((a, p) => a + (p.assets ?? 0), 0)) },
    dist: {
      growth: dist((p) => p.growth), grossMargin: dist((p) => p.grossMargin), opMargin: dist((p) => p.opMargin),
      netMargin: dist((p) => p.netMargin), roa: dist((p) => p.roa), leverage: dist((p) => p.leverage), revenue: dist((p) => p.revenue),
    },
    sizes: bands,
    concentration: { top5Share: share(5), top10Share: share(10), top20Share: share(20) },
    departments,
    byCiiu,
    peers: peers.slice(0, 60),
    comparables,
  };
  const file = resolve(process.cwd(), "src/data/sector", `${key}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
  console.error(`→ ${file}: ${out.n} empresas, ingresos ${Math.round(revenue / 1000).toLocaleString("es-CO")} mil millones, crecimiento mediano ${out.dist.growth.p50} %, margen operacional mediano ${out.dist.opMargin.p50} %`);
}
main().catch((e) => { console.error(e); process.exit(1); });

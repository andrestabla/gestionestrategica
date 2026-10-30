// Extrae y sistematiza la inteligencia regulatoria y macro del sector farmacéutico colombiano desde datos
// abiertos (datos.gov.co · Socrata) y la guarda en src/data/inteligencia/<clave>.json para M7 (Inteligencia):
//   · INVIMA · Código Único de Medicamentos vigentes (i7cb-raxc): registros sanitarios y CUM por titular,
//     mezcla terapéutica (ATC) del mercado y de cada titular grande, vencimientos de registro por año.
//   · Comisión Nacional de Precios · precio máximo de venta por presentación (nauz-qkjw): cuántas
//     presentaciones y mercados relevantes están bajo control directo y la exposición de cada titular.
//   · Banco de la República · TRM (32sa-8pi3): tasa vigente y variación a doce meses.
//
//   npx tsx scripts/inteligencia-fetch.ts farmaceutico-colombia [--top 40]
//
// El JSON no conoce a ninguna empresa fija: trae detalle de los `top` titulares con más registros vigentes;
// la plataforma ubica a la empresa por su nombre entre ellos.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://www.datos.gov.co/resource";
const DS = { cum: "i7cb-raxc", precios: "nauz-qkjw", trm: "32sa-8pi3" } as const;
const argv = process.argv.slice(2);
let top = 40;
const ti = argv.indexOf("--top"); if (ti >= 0) { top = Number(argv[ti + 1]) || 40; argv.splice(ti, 2); }
const [key] = argv;
if (!key) { console.error("uso: tsx scripts/inteligencia-fetch.ts <clave> [--top N]"); process.exit(1); }

type Row = Record<string, string>;
async function soql(ds: string, params: Record<string, string>, pageSize = 50000): Promise<Row[]> {
  const out: Row[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${BASE}/${ds}.json`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("$limit", String(pageSize)); url.searchParams.set("$offset", String(offset));
    let res: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
    if (!res || !res.ok) throw new Error(`Socrata ${ds}: ${res?.status} ${await res?.text()}`);
    const page = (await res.json()) as Row[];
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export const ATC1: Record<string, string> = {
  A: "Tracto alimentario y metabolismo", B: "Sangre y órganos hematopoyéticos", C: "Sistema cardiovascular", D: "Dermatológicos",
  G: "Sistema genitourinario y hormonas sexuales", H: "Preparados hormonales sistémicos", J: "Antiinfecciosos de uso sistémico",
  L: "Antineoplásicos e inmunomoduladores", M: "Sistema musculoesquelético", N: "Sistema nervioso", P: "Antiparasitarios",
  R: "Sistema respiratorio", S: "Órganos de los sentidos", V: "Varios",
};

/** Los titulares aparecen con variantes tipográficas (puntos, espacios, S.A. / S.A.S.): se agrupan por una clave
    normalizada que conserva la razón social y descarta la forma jurídica. */
const norm = (s: string) => s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\b(S\.?A\.?S?\.?|LTDA\.?|S\.?\s?EN\s?C\.?|INC\.?|LLC|LIMITED|LIMITADA|CIA\.?|CO\.?|CORP\.?|GMBH|AG|BV|N\.?V\.?|PLC|SPA|SRL|S\.?L\.?)\b/g, " ")
  .replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const parseDate = (s?: string) => { if (!s) return null; const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : (Number.isNaN(Date.parse(s)) ? null : new Date(s)); };

async function main() {
  const fetchedAt = new Date().toISOString();
  // 1) Registros vigentes por titular (clave normalizada) y universo
  console.error("INVIMA · registros por titular…");
  const porTitular = await soql(DS.cum, { $select: "titular,count(distinct expediente) as n,count(*) as cums", $where: "estadoregistro='Vigente'", $group: "titular" });
  const grupos = new Map<string, { nombre: string; variantes: string[]; registros: number; cums: number }>();
  for (const r of porTitular) {
    const k = norm(r.titular ?? ""); if (!k) continue;
    const g = grupos.get(k) ?? { nombre: r.titular, variantes: [], registros: 0, cums: 0 };
    g.variantes.push(r.titular); g.registros += Number(r.n); g.cums += Number(r.cums);
    if ((r.titular?.length ?? 0) > g.nombre.length) g.nombre = r.titular;   // la variante más completa como nombre visible
    grupos.set(k, g);
  }
  const ranking = [...grupos.entries()].map(([k, g]) => ({ key: k, ...g })).sort((a, b) => b.registros - a.registros);
  const totales = (await soql(DS.cum, { $select: "count(distinct expediente) as reg,count(distinct titular) as tit,count(*) as cums", $where: "estadoregistro='Vigente'" }))[0];
  console.error(`${ranking.length} titulares · ${totales.reg} registros vigentes · ${totales.cums} CUM`);

  // 2) Mezcla terapéutica del mercado (ATC nivel 1, registros distintos)
  console.error("INVIMA · mezcla ATC del mercado…");
  const atcRows = await soql(DS.cum, { $select: "atc,count(distinct expediente) as n", $where: "estadoregistro='Vigente'", $group: "atc" });
  const atc1Mercado = new Map<string, number>();
  for (const r of atcRows) { const c = (r.atc ?? "").trim().charAt(0).toUpperCase(); if (!ATC1[c]) continue; atc1Mercado.set(c, (atc1Mercado.get(c) ?? 0) + Number(r.n)); }
  const totalAtc = [...atc1Mercado.values()].reduce((a, b) => a + b, 0);
  const atcMercado = [...atc1Mercado].map(([code, n]) => ({ code, name: ATC1[code], n, share: Math.round((n / totalAtc) * 1000) / 10 })).sort((a, b) => b.n - a.n);

  // 3) Precios regulados (control directo): todas las presentaciones con su expediente
  console.error("CNPMDM · precios máximos…");
  const precios = await soql(DS.precios, { $select: "cum,id_mr,mercado_relevante,circular_cnpmdm,fecha_de_inicio_vigencia_precio_maximo_de_venta" });
  const regPorExpediente = new Map<string, Set<string>>();
  for (const r of precios) { const exp = (r.cum ?? "").split("-")[0]; if (!exp) continue; (regPorExpediente.get(exp) ?? regPorExpediente.set(exp, new Set()).get(exp)!).add(r.mercado_relevante); }
  const circulares = new Map<string, number>(); for (const r of precios) circulares.set(r.circular_cnpmdm, (circulares.get(r.circular_cnpmdm) ?? 0) + 1);
  const vigencias = precios.map((r) => r.fecha_de_inicio_vigencia_precio_maximo_de_venta).filter(Boolean).sort();
  const regulados = {
    presentaciones: precios.length, mercadosRelevantes: new Set(precios.map((r) => r.id_mr)).size, expedientes: regPorExpediente.size,
    circularPrincipal: [...circulares.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "", vigenciaDesde: vigencias.length ? vigencias[vigencias.length - 1].slice(0, 10) : "",
  };

  // 4) Detalle de los titulares grandes: expedientes, ATC nivel 2, vencimientos, exposición a precio regulado
  const detalle = ranking.slice(0, top);
  console.error(`INVIMA · detalle de ${detalle.length} titulares…`);
  const variantes = detalle.flatMap((t) => t.variantes);
  const filas: Row[] = [];
  const cums: Row[] = [];   // una fila por presentación comercial: producto, descripción, muestra médica
  for (let i = 0; i < variantes.length; i += 40) {
    const lote = variantes.slice(i, i + 40);
    filas.push(...await soql(DS.cum, { $select: "titular,expediente,atc,descripcionatc,fechavencimiento,fechaexpedicion,modalidad", $where: `estadoregistro='Vigente' AND titular in (${lote.map(q).join(",")})`, $group: "titular,expediente,atc,descripcionatc,fechavencimiento,fechaexpedicion,modalidad" }));
    cums.push(...await soql(DS.cum, { $select: "titular,expediente,producto,descripcioncomercial,muestramedica,estadocum", $where: `estadoregistro='Vigente' AND titular in (${lote.map(q).join(",")})` }));
    process.stderr.write(".");
  }
  console.error("");
  const hoy = new Date(); const en = (m: number) => new Date(hoy.getFullYear(), hoy.getMonth() + m, hoy.getDate());
  const titulares = detalle.map((t, i) => {
    const mias = filas.filter((f) => norm(f.titular ?? "") === t.key);
    const expedientes = new Map<string, Row>();
    for (const f of mias) if (!expedientes.has(f.expediente)) expedientes.set(f.expediente, f);
    const atc2 = new Map<string, { name: string; n: number }>();
    const atc1 = new Map<string, number>();
    for (const f of expedientes.values()) {
      const code = (f.atc ?? "").trim().toUpperCase();
      if (code) { const k2 = code.slice(0, 3); const e = atc2.get(k2) ?? { name: (f.descripcionatc ?? "").trim(), n: 0 }; e.n++; atc2.set(k2, e); atc1.set(code[0], (atc1.get(code[0]) ?? 0) + 1); }
    }
    const venc = [...expedientes.values()].map((f) => parseDate(f.fechavencimiento)).filter((d): d is Date => !!d);
    const porAno = new Map<number, number>(); for (const d of venc) porAno.set(d.getFullYear(), (porAno.get(d.getFullYear()) ?? 0) + 1);
    const reg = [...expedientes.keys()].filter((e) => regPorExpediente.has(e));
    const mercados = new Set(reg.flatMap((e) => [...regPorExpediente.get(e)!]));
    const modalidades = new Map<string, number>(); for (const f of expedientes.values()) { const m = (f.modalidad ?? "").trim(); if (m) modalidades.set(m, (modalidades.get(m) ?? 0) + 1); }
    // presentaciones comerciales del titular: canal (institucional / comercial / muestra médica) y marcas
    const misCums = cums.filter((c) => norm(c.titular ?? "") === t.key);
    const canales = { institucional: 0, comercial: 0, muestraMedica: 0, activas: 0 };
    for (const c of misCums) {
      if ((c.estadocum ?? "").toLowerCase().startsWith("activo")) canales.activas++;
      if ((c.muestramedica ?? "").toLowerCase().startsWith("s")) canales.muestraMedica++;
      else if (/INSTITUCIONAL|HOSPITALARI/i.test(c.descripcioncomercial ?? "")) canales.institucional++;
      else canales.comercial++;
    }
    const marca = (p: string) => (p ?? "").replace(/[®™]/g, "").replace(/\s+/g, " ").trim().split(/\s+/).filter((w) => !/^\d|^(MG|ML|G|MCG|UI|X|POR|TABLETAS?|CAPSULAS?|JARABE|SOLUCION|CREMA|GEL|SUSPENSION|INYECTABLE|GOTAS|TABLETA|CAPSULA|RECUBIERTA|RECUBIERTAS)$/i.test(w)).slice(0, 2).join(" ").toUpperCase();
    const marcas = new Map<string, { n: number; atc2: Map<string, number> }>();
    for (const c of misCums) {
      const m = marca(c.producto); if (!m) continue;
      const e = marcas.get(m) ?? { n: 0, atc2: new Map() }; e.n++;
      const f = expedientes.get(c.expediente); const k2 = (f?.atc ?? "").trim().toUpperCase().slice(0, 3); if (k2) e.atc2.set(k2, (e.atc2.get(k2) ?? 0) + 1);
      marcas.set(m, e);
    }
    const productos = [...marcas].map(([nombre, e]) => ({ nombre, presentaciones: e.n, atc2: [...e.atc2].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "" })).sort((x, y) => y.presentaciones - x.presentaciones).slice(0, 30);
    return {
      rank: i + 1, key: t.key, nombre: t.nombre, registros: t.registros, cums: t.cums,
      atc1: [...atc1].map(([code, n]) => ({ code, name: ATC1[code] ?? code, n })).sort((a, b) => b.n - a.n),
      atc2: [...atc2].map(([code, e]) => ({ code, name: e.name, n: e.n })).sort((a, b) => b.n - a.n).slice(0, 12),
      vencimientos: { en12m: venc.filter((d) => d <= en(12)).length, en36m: venc.filter((d) => d <= en(36)).length, porAno: [...porAno].sort((a, b) => a[0] - b[0]).map(([ano, n]) => ({ ano, n })) },
      regulados: { expedientes: reg.length, share: expedientes.size ? Math.round((reg.length / expedientes.size) * 1000) / 10 : 0, mercadosRelevantes: mercados.size },
      modalidades: [...modalidades].map(([modalidad, n]) => ({ modalidad, n })).sort((a, b) => b.n - a.n),
      canales, productos,
    };
  });

  // 4b) canales del mercado: presentaciones institucionales, comerciales y muestras médicas (todas las vigentes)
  console.error("INVIMA · canales del mercado…");
  const mm = await soql(DS.cum, { $select: "muestramedica,count(*) as n", $where: "estadoregistro='Vigente'", $group: "muestramedica" });
  const inst = await soql(DS.cum, { $select: "count(*) as n", $where: "estadoregistro='Vigente' AND (upper(descripcioncomercial) like '%INSTITUCIONAL%' OR upper(descripcioncomercial) like '%HOSPITALARI%') AND muestramedica not in ('Si','SI','si')" });
  const totalCum = Number(totales.cums);
  const muestra = mm.filter((r) => (r.muestramedica ?? "").toLowerCase().startsWith("s")).reduce((a, r) => a + Number(r.n), 0);
  const institucional = Number(inst[0]?.n ?? 0);
  const canalesMercado = { institucional, comercial: Math.max(0, totalCum - institucional - muestra), muestraMedica: muestra };

  // 5) TRM: vigente y hace doce meses
  console.error("Banco de la República · TRM…");
  const trmHoy = (await soql(DS.trm, { $select: "valor,vigenciadesde", $order: "vigenciadesde DESC", $limit: "1" }))[0];
  const hace12 = new Date(trmHoy.vigenciadesde); hace12.setFullYear(hace12.getFullYear() - 1);
  const trmAnt = (await soql(DS.trm, { $select: "valor,vigenciadesde", $where: `vigenciadesde <= '${hace12.toISOString().slice(0, 19)}'`, $order: "vigenciadesde DESC", $limit: "1" }))[0];
  const trm = { valor: Number(trmHoy.valor), fecha: trmHoy.vigenciadesde.slice(0, 10), hace12m: Number(trmAnt.valor), fecha12m: trmAnt.vigenciadesde.slice(0, 10), variacion12m: Math.round(((Number(trmHoy.valor) / Number(trmAnt.valor)) - 1) * 1000) / 10 };

  const out = {
    key, fetchedAt,
    fuentes: [
      { id: "invima-cum", name: "INVIMA · Código Único de Medicamentos vigentes", url: "https://www.datos.gov.co/Salud-y-Protecci-n-Social/C-DIGO-NICO-DE-MEDICAMENTOS-VIGENTES/i7cb-raxc", note: "Registros sanitarios vigentes y sus presentaciones (CUM), con titular, ATC, modalidad y vencimiento." },
      { id: "cnpmdm-precios", name: "Comisión Nacional de Precios de Medicamentos · precio máximo de venta por presentación", url: "https://www.datos.gov.co/Salud-y-Protecci-n-Social/Precio-m-ximo-de-venta-de-los-medicamentos-por-pre/nauz-qkjw", note: "Presentaciones bajo control directo de precios por mercado relevante y circular." },
      { id: "banrep-trm", name: "Banco de la República · Tasa representativa del mercado", url: "https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3", note: "TRM diaria publicada por la Superintendencia Financiera." },
    ],
    invima: { registros: Number(totales.reg), titulares: Number(totales.tit), cums: Number(totales.cums), titularesAgrupados: ranking.length, atcMercado, canalesMercado, top: titulares },
    regulados, trm,
  };
  const file = resolve(process.cwd(), "src/data/inteligencia", `${key}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
  console.error(`→ ${file}: ${titulares.length} titulares con detalle · ${regulados.presentaciones} presentaciones reguladas · TRM ${trm.valor} (${trm.variacion12m} % a 12 m)`);
}
main().catch((e) => { console.error(e); process.exit(1); });

// Contexto de la empresa para el análisis con IA del diagnóstico: lo que la plataforma ya sabe de ella
// (datos de entrada: sector, tamaño, horizontes, prioridades, objetivos, resultados clave, iniciativas,
// cifras financieras si las hay) y los insights de Inteligencia (benchmark sectorial de Supersociedades /
// Superintendencia de Compañías) y las alertas del tablero. Texto compacto en español para el encargo.

import { catalog, tenantView } from "@/server/store";
import { leversOf, horizonsOf } from "@/data/catalogo";
import { sectorOf, sectorKeyDe, posicionPropia } from "@/data/sector";
import { inteligenciaOf, titularDe, coincideEmpresa } from "@/data/inteligencia";
import { executiveSummary } from "@/lib/logic";
import { resumenMercadoFarma } from "@/data/mercado-farma-co";

const n1 = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(1).replace(".", ","));

export function contextoEmpresa(): string {
  const cat = catalog();
  const c = cat.company;
  const out: string[] = [];
  out.push(`CONTEXTO DE LA EMPRESA (datos cargados en la plataforma):`);
  out.push(`- ${c.name}${c.sector ? ` · sector ${c.sector}` : ""}${c.size ? ` · tamaño ${c.size}` : ""}${c.city || c.department ? ` · ${[c.city, c.department].filter(Boolean).join(", ")}` : ""}${c.country ? ` · ${c.country === "EC" ? "Ecuador" : "Colombia"}` : ""}${c.ciiu ? ` · CIIU ${c.ciiu}` : ""}.`);
  const hz = horizonsOf(c); if (hz.length) out.push(`- Horizontes de planeación: ${hz.map((h) => `${h.label} (${h.months} meses)`).join(", ")}.`);
  const lv = leversOf(c); if (lv.length) out.push(`- Prioridades estratégicas: ${lv.map((l) => `${l.name}${l.desc ? ` — ${l.desc}` : ""}${l.indicator ? ` [indicador: ${l.indicator}]` : ""}`).join("; ")}.`);
  const objs = cat.objectives ?? []; if (objs.length) out.push(`- Objetivos (${objs.length}): ${objs.slice(0, 12).map((o) => o.name).join("; ")}${objs.length > 12 ? "; …" : ""}.`);
  const kpis = cat.kpis ?? []; if (kpis.length) out.push(`- Resultados clave e indicadores definidos: ${kpis.length}.`);
  const inis = cat.initiatives ?? [];
  if (inis.length) {
    const porEstado = inis.reduce<Record<string, number>>((a, i) => { a[i.status] = (a[i.status] ?? 0) + 1; return a; }, {});
    out.push(`- Iniciativas: ${inis.length} (${Object.entries(porEstado).map(([k, v]) => `${v} ${k.toLowerCase().replace("_", " ")}`).join(", ")}); ${inis.filter((i) => i.kpi).length} vinculadas a un resultado clave.`);
  }
  const fin = cat.financials as { years?: { year: number; revenue?: number; growth?: number; opMargin?: number }[] } | null;
  if (fin?.years?.length) { const last = fin.years[fin.years.length - 1]; out.push(`- Cifras financieras (último año cargado ${last.year}): ingresos ${last.revenue ?? "—"}${last.growth != null ? `, crecimiento ${n1(last.growth)} %` : ""}${last.opMargin != null ? `, margen operacional ${n1(last.opMargin)} %` : ""}.`); }
  // Inteligencia: benchmark del sector solo si la empresa tiene sector de referencia asignado
  const s = sectorOf(sectorKeyDe(c));
  if (s) {
    out.push(`SECTOR DE REFERENCIA: ${s.label} (actividades ${s.ciiu.map((c) => `${c.code} ${c.name}`).join("; ")}).`);
    out.push(`INTELIGENCIA DEL SECTOR (${s.label}, ${s.source.name}, corte ${s.source.cut.slice(0, 4)}): ${s.n} sociedades; crecimiento mediano ${n1(s.dist.growth.p50)} % (cuartiles ${n1(s.dist.growth.p25)} a ${n1(s.dist.growth.p75)}); margen operacional mediano ${n1(s.dist.opMargin.p50)} %; margen bruto mediano ${n1(s.dist.grossMargin.p50)} %; las veinte mayores concentran ${n1(s.concentration.top20Share)} % de los ingresos (${s.concentration.top20Share >= 60 ? "sector concentrado" : "sector fragmentado"}); territorios con más peso: ${s.departments.slice(0, 3).map((d) => `${d.name} ${n1(d.share)} %`).join(", ")}.`);
    // la empresa entre las sociedades del sector: su actividad propia (CIIU), su puesto y sus cifras frente a las medianas de esa actividad
    const idx = s.peers.findIndex((p) => coincideEmpresa(c, p.name));
    const propio = idx >= 0 ? s.peers[idx] : null;
    const act = propio ? s.byCiiu.find((x) => x.code === propio.ciiu) : null;
    if (act) out.push(`ACTIVIDAD PROPIA DE LA EMPRESA: ${act.code} ${act.name}: ${act.n} sociedades, crecimiento mediano ${n1(act.growthP50)} %, margen operacional mediano ${n1(act.opMarginP50)} %. Compara a la empresa con esta actividad, no con el sector completo.`);
    if (propio) out.push(`POSICIÓN DE LA EMPRESA (${s.source.name}, ${s.source.cut.slice(0, 4)}): puesto ${idx + 1} de ${s.n} por ingresos${act ? ` y ${s.peers.filter((p) => p.ciiu === propio.ciiu).findIndex((p) => p.nit === propio.nit) + 1} de ${act.n} en su actividad` : ""}; ingresos ${Math.round(propio.revenue).toLocaleString("es-CO")} millones; crecimiento ${propio.growth == null ? "—" : n1(propio.growth) + " %"}; margen operacional ${propio.opMargin == null ? "—" : n1(propio.opMargin) + " %"}.`);
    // sin la empresa en la fuente: su posición con los estados financieros que declara en la ficha
    const dec = propio ? null : posicionPropia(s, cat);
    if (dec) {
      const p = dec.peer;
      out.push(`POSICIÓN DE LA EMPRESA (con los estados financieros que declara en su ficha, frente a ${s.source.name} ${s.source.cut.slice(0, 4)}): puesto ${dec.rank} de ${s.n} por ingresos y ${dec.ciiuRank} de ${dec.ciiuN} en su actividad ${p.ciiu}; ingresos ${Math.round(p.revenue).toLocaleString("es-CO")} millones; crecimiento ${p.growth == null ? "—" : n1(p.growth) + " %"}; margen bruto ${n1(p.grossMargin)} %; margen operacional ${n1(p.opMargin)} %.`);
    }
    // competidores directos curados del sector: con quién se compara de verdad la empresa
    if (s.foco?.pares.length) {
      const pares = s.foco.pares.filter((x) => x.revenue < 150_000);
      const med = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
      out.push(`COMPETIDORES DIRECTOS (${s.foco.nombre}; ${s.foco.pares.length} sociedades, cifras de ${s.source.name} ${s.source.cut.slice(0, 4)}): ${s.foco.pares.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 14).map((x) => `${x.name.split(" ").slice(0, 4).join(" ")} (${x.segmento}, ${x.dept}, ingresos ${Math.round(x.revenue).toLocaleString("es-CO")} M, crecimiento ${n1(x.growth)} %, margen operacional ${n1(x.opMargin)} %)`).join("; ")}. Medianas de los de tamaño comparable: crecimiento ${n1(med(pares.map((x) => x.growth)))} %, margen bruto ${n1(med(pares.map((x) => x.grossMargin)))} %, margen operacional ${n1(med(pares.map((x) => x.opMargin)))} %. Compara a la empresa con ellos antes que con el sector completo.`);
    }
  } else {
    out.push("INTELIGENCIA DEL SECTOR: sin benchmark sectorial asignado a esta empresa todavía (no inventes cifras del sector).");
  }
  // Inteligencia regulatoria y macro (INVIMA, precios regulados, TRM), con la posición de la empresa si está entre los titulares grandes
  const intel = inteligenciaOf(sectorKeyDe(c));
  if (intel) {
    const t = titularDe(c, intel);
    out.push(`INTELIGENCIA REGULATORIA (${intel.fetchedAt.slice(0, 10)}): ${intel.invima.registros} registros sanitarios vigentes de ${intel.invima.titulares} titulares; ${intel.regulados.presentaciones} presentaciones bajo precio máximo (${intel.regulados.circularPrincipal}, desde ${intel.regulados.vigenciaDesde}); TRM ${n1(intel.trm.valor)} (${n1(intel.trm.variacion12m)} % a doce meses).${t ? ` La empresa es el titular #${t.rank} por registros vigentes (${t.registros} registros, ${t.cums} presentaciones); ${t.regulados.share} % de sus registros tiene precio regulado (${t.regulados.mercadosRelevantes} mercados relevantes); grupos terapéuticos principales: ${t.atc1.slice(0, 3).map((a) => `${a.name} (${a.n})`).join(", ")}; ${t.vencimientos.en36m} registros vencen en 36 meses.` : ""}`);
  }
  // Mercado farmacéutico colombiano (IQVIA · Close-Up): lectura interna de Siegfried, para las empresas del sector
  if (sectorKeyDe(c) === "farmaceutico-colombia") out.push(resumenMercadoFarma());
  // Tablero: alertas vigentes (solo si hay seguimiento cargado)
  try {
    const v = tenantView();
    const es = executiveSummary(v);
    if (es.alerts.length) out.push(`ALERTAS DEL TABLERO: ${es.alertCounts.critical} críticas, ${es.alertCounts.warning} de atención. Principales: ${es.alerts.slice(0, 4).map((a) => a.title ?? a.kind).join("; ")}.`);
  } catch { /* sin vista de la empresa: se omite */ }
  return out.join("\n");
}

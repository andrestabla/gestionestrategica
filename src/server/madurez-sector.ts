// Madurez digital · cruce con el sector. Reúne lo que la plataforma sabe del sector de la empresa para
// el informe de resultados: las cifras del benchmark (Supersociedades / Superintendencia de Compañías),
// el mercado (IQVIA y Close-Up, para la industria farmacéutica de Colombia) y los hechos con fuente de
// la base de conocimiento. Con eso se arman las gráficas del informe y los hechos numerados que el
// modelo cita. Solo lectura del catálogo de la empresa activa.

import { catalog } from "@/server/store";
import { sectorOf, sectorKeyDe, sectorComparison, DEFAULT_SECTOR_KEY } from "@/data/sector";
import { industriaDe } from "@/lib/inteligencia-base";
import { coincideEmpresa } from "@/data/inteligencia";
import type { Tema } from "@/data/conocimiento-sector";
import { baseEmpresa } from "@/server/inteligencia-base";
import { leversOf } from "@/data/catalogo";
import { MERCADO_FARMA_CO } from "@/data/mercado-farma-co";
import type { FuenteCitada } from "@/lib/madurez-ia";

export type SectorRatio = { key: string; name: string; unit: string; p25: number | null; p50: number | null; p75: number | null; empresa: number | null; percentil: number | null; lowerIsBetter: boolean };
export type SectorCruce = {
  label: string; fuente: string; corte: string; n: number;
  ratios: SectorRatio[];
  actividades: { code: string; name: string; n: number; growthP50: number | null; opMarginP50: number | null; propia: boolean }[];
  top20: number;
  /** Cómo está la industria en transformación digital: cifras de adopción y lo que han hecho otras empresas, con el número de la cita. */
  industria: {
    datos: { n: number; linea: number; indicador: string; valor: number; unidad: string; alcance: string; anio: string }[];
    pares: { n: number; empresa: string; que: string; anio: string; linea: number }[];
  };
  mercado: null | {
    fuente: string; fecha: string;
    crecimiento: { grupo: string; corte: string; mercado: number; empresa: number; nombre: string }[];
    canales: { anio: string; retail: number; institucional: number }[];
    cagr: { periodo: string; retail: number; institucional: number };
    mezcla: { mat: string; comercial: number; institucional: number }[];
    posicion: { rank: number; ms: number; msDelta: number; corte: string };
  };
};

// los temas más cercanos a la madurez digital van primero: así quedan con los números más bajos y a la vista del modelo
const ORDEN: Tema[] = ["digital", "cliente", "regulacion", "mercado", "demanda", "salud", "margen", "expansion", "talento", "liderazgo", "macro"];

function numerados() {
  const base = baseEmpresa(); if (!base) return [];
  const rank = (temas: Tema[]) => Math.min(...temas.map((t) => { const i = ORDEN.indexOf(t); return i < 0 ? ORDEN.length : i; }));
  return [...base.hechos].sort((a, b) => rank(a.temas) - rank(b.temas)).map((h, i) => ({ n: i + 1, h, f: base.fuentes.find((x) => x.id === h.fuente)! }));
}

/** Hechos del sector de la empresa, numerados desde 1, con su fuente completa. */
export function hechosSector(): FuenteCitada[] {
  return numerados().map(({ n, h, f }) => ({ n, hecho: h.hecho, titulo: f.titulo, editor: f.editor, fecha: f.fecha, url: f.url, ...(h.nota ? { nota: h.nota } : {}) }));
}

/** Prioridades estratégicas de la empresa, para cruzarlas con la madurez. */
export const prioridadesEstrategicas = () => leversOf(catalog().company).map((l) => ({ nombre: l.name, ...(l.desc ? { desc: l.desc } : {}) }));

/** Cifras del sector y de la industria para las gráficas del informe. El benchmark financiero solo se incluye si la
    empresa tiene asignado un sector con datos (no el sector por defecto); nulo si no hay nada que mostrar. */
export function sectorCruce(): SectorCruce | null {
  const cat = catalog(), c = cat.company, key = sectorKeyDe(c);
  const s = key !== DEFAULT_SECTOR_KEY || c.sectorKey === DEFAULT_SECTOR_KEY ? sectorOf(key) : null;
  const nums = numerados();
  const industria: SectorCruce["industria"] = {
    datos: nums.filter((x) => x.h.dato).map(({ n, h }) => ({ n, ...h.dato! })),
    pares: nums.filter((x) => x.h.par).map(({ n, h }) => ({ n, empresa: h.par!.empresa, que: h.hecho, anio: h.par!.anio, linea: h.par!.linea })),
  };
  if (!s) return industria.datos.length || industria.pares.length ? { label: industriaDe(c), fuente: "", corte: "", n: 0, ratios: [], actividades: [], top20: 0, industria, mercado: null } : null;
  const cmp = sectorComparison(cat);
  const ratios: SectorRatio[] = ([["growth", "Crecimiento de ingresos"], ["opMargin", "Margen operacional"], ["grossMargin", "Margen bruto"]] as const)
    .filter(([k]) => s.dist[k].p50 !== null)
    .map(([k, name]) => { const q = s.dist[k], mine = cmp.find((r) => r.key === k); return { key: k, name, unit: "%", p25: q.p25, p50: q.p50, p75: q.p75, empresa: mine?.value ?? null, percentil: mine?.percentile ?? null, lowerIsBetter: false }; });
  const propio = s.peers.find((p) => coincideEmpresa(c, p.name));
  const ciiu = (propio?.ciiu ?? c.ciiu ?? "").toUpperCase().replace(/\s+/g, "");
  const m = MERCADO_FARMA_CO;
  return {
    label: s.label, fuente: s.source.name, corte: s.source.cut.slice(0, 4), n: s.n, ratios,
    actividades: s.byCiiu.map((a) => ({ code: a.code, name: a.name, n: a.n, growthP50: a.growthP50, opMarginP50: a.opMarginP50, propia: !!ciiu && a.code.toUpperCase() === ciiu })),
    top20: s.concentration.top20Share,
    industria,
    mercado: key !== m.sectorKey ? null : {
      fuente: m.fuentes.join(" · "), fecha: m.fecha,
      crecimiento: [
        { grupo: "Ventas en valores", corte: `${m.corporaciones.fuente}, ${m.corporaciones.corte}`, mercado: m.corporaciones.mercado.crec2026, empresa: m.corporaciones.siegfried.crec, nombre: "Siegfried" },
        { grupo: "Prescripciones", corte: `${m.closeUp.fuente}, ${m.closeUp.corte}`, mercado: m.closeUp.mercadoCrec, empresa: m.closeUp.siegfried.crec, nombre: "Siegfried" },
      ],
      canales: m.proyeccion.filas.map((f) => ({ anio: f.anio, retail: f.retail, institucional: f.institucional })),
      cagr: { periodo: m.proyeccion.cagr.periodo, retail: m.proyeccion.cagr.retail, institucional: m.proyeccion.cagr.institucional },
      mezcla: m.segmentos.valores.map((v) => ({ mat: v.mat, comercial: v.comercial, institucional: v.institucional })),
      posicion: { rank: m.corporaciones.siegfried.rank, ms: m.corporaciones.siegfried.ms, msDelta: m.corporaciones.siegfried.msDelta, corte: `${m.corporaciones.fuente}, ${m.corporaciones.corte}` },
    },
  };
}

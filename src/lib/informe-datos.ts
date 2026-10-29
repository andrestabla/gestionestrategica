// Datos del informe ejecutivo de la autoevaluación: estructuras puras (sin React) que arman las
// cifras por capacidad y dimensión desde una respuesta individual o desde promedios del comité.

import { CAPS, DIMS } from "@/data/mapa";

export type DimEjec = { code: string; name: string; capCode: string; capName: string; defn: string; m: number | null; n: number; tot: number; sd?: number | null; prac?: { code: string; text: string; v?: number }[] };
export type CapEjec = { code: string; name: string; verb: string; color: string; q: string; m: number | null; n: number; tot: number };
export type DatosEjec = { caps: CapEjec[]; dims: DimEjec[]; answered: number; total: number; personas?: number };

export function capsDesdeDims(dims: DimEjec[]): CapEjec[] {
  return CAPS.map((c) => {
    const xs = dims.filter((d) => d.capCode === c.code);
    const con = xs.filter((d) => d.m != null);
    return { code: c.code, name: c.name, verb: c.verb, color: c.color, q: c.q, m: con.length ? con.reduce((a, d) => a + (d.m as number), 0) / con.length : null, n: xs.reduce((a, d) => a + d.n, 0), tot: xs.reduce((a, d) => a + d.tot, 0) };
  });
}

/** Una persona: promedio de las prácticas respondidas de cada dimensión, con las prácticas para el detalle. */
export function datosDesdeRespuesta(r: Record<string, number>): DatosEjec {
  const dims: DimEjec[] = DIMS.map((d) => {
    const vals = d.prac.map((p) => r[p.code]).filter((x): x is number => typeof x === "number");
    const cap = CAPS.find((c) => c.code === d.code.slice(0, 3))!;
    return { code: d.code, name: d.name, capCode: cap.code, capName: cap.name, defn: d.defn, m: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length, tot: d.prac.length, prac: d.prac.map((p) => ({ code: p.code, text: p.f1, v: r[p.code] })) };
  });
  return { caps: capsDesdeDims(dims), dims, answered: dims.reduce((a, x) => a + x.n, 0), total: 68 };
}

/** Comité: promedio y dispersión por dimensión a partir de los promedios de cada persona. */
export function datosDesdeComite(porDim: { code: string; m: number | null; sd: number | null; n: number }[], personas: number, respondidasPorPersona: number[]): DatosEjec {
  const dims: DimEjec[] = DIMS.map((d) => {
    const x = porDim.find((p) => p.code === d.code);
    const cap = CAPS.find((c) => c.code === d.code.slice(0, 3))!;
    return { code: d.code, name: d.name, capCode: cap.code, capName: cap.name, defn: d.defn, m: x?.m ?? null, sd: x?.sd ?? null, n: x?.n ?? 0, tot: personas };
  });
  const answered = respondidasPorPersona.length ? Math.round(respondidasPorPersona.reduce((a, b) => a + b, 0) / respondidasPorPersona.length) : 0;
  return { caps: capsDesdeDims(dims), dims, answered, total: 68, personas };
}

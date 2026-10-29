// Lectura de una autoevaluación directiva (Fuente 1): promedio por dimensión y por capacidad con lo
// contestado, y qué conviene mirar primero (dimensiones bajo el umbral ordenadas por arrastre).
// Reglas puras: las usan la pestaña del diagnóstico y el informe con IA.

import { CAPS, DIMS, THRESHOLD, DRAG_WEIGHT, type Dimension } from "@/data/mapa";
import { avg } from "@/lib/od";

export type LecturaDim = { d: Dimension & { line: number }; m: number | null; n: number };
export type LecturaCap = { cap: (typeof CAPS)[number]; m: number | null; n: number; tot: number };
export type LecturaF1 = { dims: LecturaDim[]; caps: LecturaCap[]; answered: number; prios: (LecturaDim & { p: number })[] };

export function lecturaF1(r: Record<string, number>): LecturaF1 {
  const dims: LecturaDim[] = DIMS.map((d) => { const vals = d.prac.map((p) => r[p.code]); return { d, m: avg(vals), n: vals.filter((x) => typeof x === "number").length }; });
  const caps: LecturaCap[] = CAPS.map((c) => {
    const xs = dims.filter((x) => x.d.cap === c.name);
    return { cap: c, m: avg(xs.map((x) => x.m)), n: xs.reduce((a, x) => a + x.n, 0), tot: xs.reduce((a, x) => a + x.d.prac.length, 0) };
  });
  const answered = dims.reduce((a, x) => a + x.n, 0);
  const prios = dims.filter((x) => x.m != null && x.m < THRESHOLD).map((x) => ({ ...x, p: (THRESHOLD - (x.m as number)) * DRAG_WEIGHT(x.d.code) })).sort((a, b) => b.p - a.p);
  return { dims, caps, answered, prios };
}

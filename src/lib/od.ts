// ─────────────────────────────────────────────────────────────────────────────
// 4Shine-OD · Motor de calificación del diagnóstico (documento técnico v2.0,
// secciones 7 y 8). Funciones puras, sin UI ni red, equivalentes a las del
// diagnóstico en línea (od.js) para que ambos lean igual las mismas respuestas.
//   Test:   promedio por capacidad, cobertura, etapa (hipótesis), patrones.
//   Completo: F1 y F2 por promedios, F3 por nivel de rúbrica, madurez
//   = 0,40·F3 + 0,30·F1 + 0,30·F2 con techo de evidencia F3 + 1, señales
//   (relato sobre realidad, brecha jerárquica, instalada pero no vivida,
//   comité sin diagnóstico compartido), prioridad = (3,0 − M) × arrastre
//   y nivel de acompañamiento.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CAPS, DIMS, TEST, TEST_QUESTIONS, DRAG_WEIGHT, F2_GENERAL, THRESHOLD, levelOf,
} from "@/data/mapa";

/* ═══ Respuestas ═══ */

export type Answers = Record<string, number | string | undefined>;
export type Response = {
  tipo: "test" | "f1" | "f2" | "f3";
  meta: Record<string, string | boolean | undefined>;
  r: Answers;            // test: 1..25 · f1/f2: códigos · f3: V | P | N por práctica
  v?: Answers;           // test: puntuación verificada por el consultor
  n?: Record<string, string>;
  lv?: Record<string, number>;   // f3: nivel 1–5 por dimensión
};

const num = (x: unknown): x is number => typeof x === "number" && !Number.isNaN(x);
export const avg = (a: unknown[]): number | null => {
  const v = a.filter(num);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
export const sdev = (a: unknown[]): number | null => {
  const v = a.filter(num);
  if (v.length < 2) return null;
  const m = avg(v)!;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / (v.length - 1));
};
export const round1 = (x: number) => Math.round(x * 10) / 10;

/* ═══ Test de capacidad empresarial ═══ */

export type TestReading = {
  caps: { n: number; name: string; avg: number | null; cov: number; reportable: boolean }[];
  pending: number[];
  stage: string; hypothesis: string | null; provisional: boolean; beyond: boolean;
  patterns: { qs: number[]; hip: string; accion: string }[];
  lows: { n: number; q: string; value: number; codes: string[] }[];
};

export function rangeText(x: number | null) {
  if (!num(x)) return "";
  const R = TEST.rangos;
  return x < 2 ? R[0] : x < 3 ? R[1] : x < 4 ? R[2] : x < 4.5 ? R[3] : R[4];
}

export function readTest(r: Answers): TestReading {
  const val = (n: number) => (num(r[n]) ? (r[n] as number) : null);
  const low = (n: number) => { const x = val(n); return x !== null && x < THRESHOLD; };
  const ok = (n: number) => { const x = val(n); return x !== null && x >= THRESHOLD; };
  const caps = TEST.bloques.map((b, i) => {
    const vs = b.qs.map((q) => val(q.n));
    const cov = vs.filter(num).length;
    return { n: i + 1, name: b.cap, avg: cov ? avg(vs) : null, cov, reportable: cov >= 5 };
  });
  const capAvg = Object.fromEntries(caps.map((c) => [c.name, c.avg]));
  const pending = TEST_QUESTIONS.filter((q) => r[q.n] === "NI" || r[q.n] == null).map((q) => q.n);
  // etapa: primer umbral, en orden, cuyas preguntas orientadoras promedian menos de 3,0
  const E = TEST.etapas;
  let stage: string | null = null, provisional = false;
  for (let i = 0; i < 4; i++) {
    const vs = E[i].orient.map(val);
    if (vs.some((x) => x === null)) provisional = true;
    const a = avg(vs);
    if (a !== null && a < THRESHOLD) { stage = E[i].name; break; }
  }
  const opt = r[25] ? TEST.q25.find((o) => o.k === r[25]) : null;
  const hypothesis = opt?.etapa ?? null;
  let beyond = false;
  if (!stage) { if (hypothesis === "Reinventar") stage = "Reinventar"; else { stage = "Multiplicar"; beyond = true; } }
  const conds = [
    low(1) && low(2), low(4) && low(5), low(7) && low(8), low(19) && ok(7) && ok(8),
    low(13) && low(14) && low(15), low(16) && low(18), low(20) && low(21), low(23),
    low(24) && num(capAvg["Ejecución"]) && (capAvg["Ejecución"] as number) >= THRESHOLD,
  ];
  const orient = E.find((e) => e.name === stage)?.orient ?? [];
  const patterns = TEST.patrones
    .map((p, i) => ({ p, on: conds[i], cont: i === 0 || i === 5, st: p.qs.some((n) => orient.includes(n)) }))
    .filter((x) => x.on)
    .sort((a, b) => (Number(b.cont) - Number(a.cont)) || (Number(b.st) - Number(a.st)))
    .map((x) => x.p);
  const lows = TEST_QUESTIONS.filter((q) => low(q.n))
    .map((q) => ({ n: q.n, q: q.q, value: val(q.n)!, codes: q.codes }))
    .sort((a, b) => a.value - b.value);
  return { caps, pending, stage, hypothesis, provisional, beyond, patterns, lows };
}

/* ═══ Diagnóstico completo ═══ */

export type Flag = { key: string; severe: boolean };
export type DimResult = {
  code: string; name: string; line: number;
  f1: number | null; f2: number | null; f2raw: number | null; f3: number | null;
  m: number | null; level: number; base: string; flags: Flag[]; sd1: number | null;
  verified: number; marked: number; priority: number;
};
export type CapResult = { n: number; name: string; m: number | null; f1: number | null; f2: number | null; f3: number | null };
export type Consolidated = {
  f1n: number; f2n: number; hasF3: boolean; okF2: boolean;
  dims: DimResult[]; caps: CapResult[]; priorities: DimResult[];
  general: { code: string; text: string; avg: number | null }[];
  openAnswers: string[];
};

export function consolidate(items: Response[]): Consolidated {
  const F1 = items.filter((x) => x.tipo === "f1");
  const F2 = items.filter((x) => x.tipo === "f2");
  const F3 = items.filter((x) => x.tipo === "f3").slice(-1)[0];
  const okF2 = F2.length >= 5;
  const dims: DimResult[] = DIMS.map((d) => {
    const p1 = F1.map((f) => avg(d.prac.map((p) => f.r[p.code])));
    const f1 = avg(p1), sd1 = sdev(p1);
    const f2raw = avg(F2.map((f) => avg(d.f2.map((q) => f.r[q.code]))));
    const f2 = okF2 ? f2raw : null;
    const f3 = F3 && num(F3.lv?.[d.code]) ? (F3.lv![d.code] as number) : null;
    const marks = F3 ? d.prac.map((p) => F3.r[p.code]) : [];
    let m: number | null = null, base = "";
    const flags: Flag[] = [];
    if (num(f1)) {
      if (f3 === null) {
        m = Math.min(num(f2) ? (f1 + f2) / 2 : f1, 2.9);
        flags.push({ key: "No verificada", severe: true }); base = "Sin evidencia: máximo 2,9";
      } else {
        if (num(f2)) { m = 0.4 * f3 + 0.3 * f1 + 0.3 * f2; base = "40/30/30"; }
        else { m = 0.55 * f3 + 0.45 * f1; base = "55/45, sin F2"; }
        if (m > f3 + 1) { m = f3 + 1; base += " · techo de evidencia"; }
      }
      if (f3 !== null && f1 - f3 >= 1.5) flags.push({ key: "Relato sobre realidad", severe: true });
      if (num(f2) && f1 - f2 >= 1.5) flags.push({ key: "Brecha jerárquica", severe: true });
      if (num(sd1) && sd1 > 1) flags.push({ key: "Comité sin diagnóstico compartido", severe: false });
    }
    if (f3 !== null && f3 >= 4 && num(f2) && f2 <= 2.5) flags.push({ key: "Instalada pero no vivida", severe: false });
    if (num(m)) m = round1(m);
    return {
      code: d.code, name: d.name, line: d.line, f1, f2, f2raw, f3, m, level: num(m) ? levelOf(m) : 0,
      base, flags, sd1,
      verified: marks.filter((x) => x === "V").length, marked: marks.filter(Boolean).length,
      priority: num(m) && m < THRESHOLD ? (THRESHOLD - m) * DRAG_WEIGHT(d.code) : 0,
    };
  });
  const caps: CapResult[] = CAPS.map((c) => {
    const ds = dims.filter((x) => x.line === c.n);
    return { n: c.n, name: c.name, m: avg(ds.map((x) => x.m)), f1: avg(ds.map((x) => x.f1)), f2: avg(ds.map((x) => x.f2)), f3: avg(ds.map((x) => x.f3)) };
  });
  return {
    f1n: F1.length, f2n: F2.length, hasF3: Boolean(F3), okF2, dims, caps,
    priorities: dims.filter((x) => x.priority > 0).sort((a, b) => b.priority - a.priority),
    general: F2_GENERAL.map((q) => ({ code: q.code, text: q.text, avg: avg(F2.map((f) => f.r[q.code])) })),
    openAnswers: F2.map((f) => f.n?.abierta).filter((x): x is string => Boolean(x && x.trim())),
  };
}

/* ═══ Nivel de acompañamiento ═══ */

export type Recommendation = { level: "Enterprise Elite" | "Growth Partner" | "Focus" | "Sin intervención estructural"; text: string; notNeeded: string };

export function recommend(c: Consolidated): Recommendation {
  const gap = c.caps.filter((x) => num(x.m) && x.m < THRESHOLD);
  const by = Object.fromEntries(c.dims.map((x) => [x.code, x.m]));
  const ceo = num(by["LID-1"]) && by["LID-1"]! < THRESHOLD && num(by["MUL-5"]) && by["MUL-5"]! < THRESHOLD;
  const ok = c.caps.filter((x) => num(x.m) && x.m >= THRESHOLD).map((x) => x.name);
  const notNeeded = ok.length
    ? `Lo que la empresa no necesita hoy: ${ok.join(", ")} ${ok.length > 1 ? "están" : "está"} suficientemente ${ok.length > 1 ? "instaladas" : "instalada"}.`
    : "";
  const n = gap.length;
  if (n >= 3 || ceo) return { level: "Enterprise Elite", text: "Sistema anual. " + (ceo && n < 3 ? "El liderazgo del CEO (LID-1) y el desacoplamiento de dependencias (MUL-5) están en brecha a la vez: el CEO es patrocinador y cuello de botella." : "Tres o más capacidades están por debajo del umbral."), notNeeded };
  if (n === 2) return { level: "Growth Partner", text: `Ruta de unos seis meses con dos bloques en secuencia: ${gap.map((x) => x.name).join(" y ")}.`, notNeeded };
  if (n === 1) return { level: "Focus", text: `Un bloque sobre ${gap[0].name}, con línea base y seguimiento, o talleres de 4 a 20 horas si el cliente prioriza una dimensión o práctica. Si la brecha tiene causa raíz en otra capacidad, corresponde Growth Partner.`, notNeeded };
  return { level: "Sin intervención estructural", text: "Ninguna capacidad está en brecha. Se sugiere una profundización puntual en la dimensión más débil o un ciclo de mejora anual.", notNeeded };
}

/* ═══ Contraste de participantes del test ═══ */

export function testContrast(tests: Response[]) {
  return TEST_QUESTIONS.map((q) => {
    const vs = tests.map((t) => t.r[q.n]).filter(num) as number[];
    return { q, vs, d: vs.length > 1 ? Math.max(...vs) - Math.min(...vs) : 0 };
  }).filter((x) => x.d >= 2);
}

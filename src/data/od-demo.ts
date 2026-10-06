// ─────────────────────────────────────────────────────────────────────────────
// Respuestas ilustrativas del diagnóstico 4Shine-OD de Andina Suministros:
// 5 autoevaluaciones directivas, 9 respuestas de equipos, la evidencia
// documental del advisor y 3 tests. Generadas de forma determinista con el
// MISMO procedimiento que la demo del diagnóstico en línea, de modo que la
// plataforma y las páginas en línea cuentan la misma historia.
// ─────────────────────────────────────────────────────────────────────────────

import { DIMS, F2_GENERAL, TEST_QUESTIONS } from "@/data/mapa";
import type { Response } from "@/lib/od";

export const DEMO_COMPANY = "Andina Suministros";

const BASE: Record<string, number> = {
  "DIR-1": 3.6, "DIR-2": 3.4, "DIR-3": 2.9, "DIR-4": 2.7,
  "LID-1": 2.4, "LID-2": 3.1, "LID-3": 2.9, "LID-4": 2.3,
  "EJE-1": 2.8, "EJE-2": 2.2, "EJE-3": 2.6, "EJE-4": 3.0,
  "MUL-1": 2.4, "MUL-2": 2.0, "MUL-3": 2.2, "MUL-4": 2.6, "MUL-5": 1.8,
};

function build(): Response[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const sc = (mu: number) => Math.max(1, Math.min(5, Math.round(mu + (rnd() - 0.5) * 1.8)));
  const out: Response[] = [];
  const cargos = ["Gerente general", "Gerente comercial", "Jefe de operaciones", "Jefe administrativa", "Jefe de servicio"];
  const nombres = ["Laura Restrepo", "Mauricio Peña", "Carolina Vélez", "Patricia Londoño", "Jorge Salazar"];
  cargos.forEach((c, i) => {
    const r: Response["r"] = {};
    DIMS.forEach((d) => d.prac.forEach((p) => { r[p.code] = sc(BASE[d.code] + (i === 0 ? 1.2 : 0.6)); }));
    out.push({ tipo: "f1", meta: { empresa: DEMO_COMPANY, nombre: nombres[i], cargo: c }, r });
  });
  for (let k = 0; k < 9; k++) {
    const r: Response["r"] = {};
    DIMS.forEach((d) => d.f2.forEach((q) => { r[q.code] = sc(BASE[d.code] - 0.2); }));
    F2_GENERAL.forEach((q) => { r[q.code] = sc(2.8); });
    out.push({
      tipo: "f2", meta: { empresa: DEMO_COMPANY }, r,
      n: { abierta: k === 2 ? "Que las decisiones no tengan que pasar todas por gerencia." : k === 5 ? "Que lo que se acuerda en las reuniones se cumpla." : "" },
    });
  }
  const r3: Response["r"] = {}, lv: Record<string, number> = {};
  DIMS.forEach((d) => {
    lv[d.code] = Math.max(1, Math.min(5, Math.round(BASE[d.code] - 0.1)));
    d.prac.forEach((p, j) => {
      const L = lv[d.code];
      r3[p.code] = L >= 4 ? (j < 3 ? "V" : "P") : L === 3 ? (j < 2 ? "V" : "P") : L === 2 ? (j < 1 ? "V" : j < 3 ? "P" : "N") : (j < 1 ? "P" : "N");
    });
  });
  out.push({ tipo: "f3", meta: { empresa: DEMO_COMPANY, nombre: "Advisor 4Shine" }, r: r3, lv });
  const tests: [string, number, string][] = [["Gerente general", 0.9, "C"], ["Jefe de operaciones", 0, "B"], ["Gerente comercial", 0.4, "C"]];
  const cb: Record<number, number> = { 1: 3.3, 2: 2.5, 3: 2.6, 4: 2.1 };
  tests.forEach((t, i) => {
    const r: Response["r"] = {};
    TEST_QUESTIONS.forEach((q) => { r[q.n] = sc(cb[q.line] + t[1]); });
    r[1] = 4; r[2] = 3; r[25] = t[2];
    out.push({ tipo: "test", meta: { empresa: DEMO_COMPANY, nombre: ["Laura Restrepo", "Carolina Vélez", "Mauricio Peña"][i], cargo: t[0] }, r });
  });
  return out;
}

export const OD_RESPONSES: Response[] = build();

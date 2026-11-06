import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, consolidate, fueraDelOrden, type Evaluation } from "../src/lib/priorizacion";

const ev = (D: number, E: number, M: number, L: number, estrategica = true): Evaluation => ({ iniId: "x", by: "a@b", name: "A", role: "DIRECTIVO", at: "", scores: { D, E, M, L } as Evaluation["scores"], type: estrategica ? { contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "ESTRATEGICO", permanencia: "TACTICO" } : { contribucion: "TACTICO", profundidad: "TACTICO", alcance: "TACTICO", permanencia: "TACTICO" }, notes: {} } as unknown as Evaluation);

test("rank (F16): solo estratégicas elegibles con posición; empates por impacto y luego evidencia; el resto aparte con motivo", () => {
  const evals: Record<string, Evaluation[]> = {
    a: [ev(3, 4, 3, 3)],          // 82,5
    b: [ev(4, 3, 3, 3)],          // 82,5 · gana por impacto
    c: [ev(4, 4, 2, 2)],          // 85 · capacidad primero, pero sigue en el orden
    d: [ev(2, 4, 4, 4)],          // no elegible (D 2)
    e: [ev(4, 4, 4, 4, false)],   // táctica
    f: [],                        // sin evaluar
  };
  const r = rank([{ id: "a", horizon: "H1" }, { id: "b", horizon: "H1" }, { id: "c", horizon: "H1" }, { id: "d", horizon: "H1" }, { id: "e", horizon: "H1" }, { id: "f", horizon: "H1" }], (id) => consolidate(evals[id] ?? []), ["H1"]);
  assert.deepEqual(r.map((x) => [x.id, x.position, x.fuera]), [["c", 1, null], ["b", 2, null], ["a", 3, null], ["e", 0, "tactica"], ["d", 0, "no-elegible"], ["f", 0, "sin-evaluar"]]);
  assert.ok(r.every((x) => x.suggested === null), "la plataforma ya no sugiere horizonte");
  assert.equal(fueraDelOrden(consolidate([])), "sin-evaluar");
});

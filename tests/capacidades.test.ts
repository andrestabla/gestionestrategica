import { test } from "node:test";
import assert from "node:assert/strict";
import { FRENTES, ITEMS_CAP, lecturaCapacidades, normalizarRevision, faltaPorDescribir, parseChecklistPersonalizado, parsePropuestaCapacidades, checklistHash } from "../src/lib/capacidades";

const todo = (n: 1 | 2 | 3) => Object.fromEntries(ITEMS_CAP.map((i) => [i.code, n]));

test("el checklist genérico tiene cinco frentes con 2 o 3 afirmaciones y tres niveles descritos", () => {
  assert.equal(FRENTES.length, 5);
  for (const f of FRENTES) { assert.ok(f.items.length >= 2 && f.items.length <= 3, f.name); for (const i of f.items) assert.ok(i.niveles[1] && i.niveles[2] && i.niveles[3] && i.pregunta, i.code); }
  assert.equal(new Set(ITEMS_CAP.map((i) => i.code)).size, ITEMS_CAP.length);
});

test("lectura: por frente el nivel más bajo; semáforo lista, ajustes o brechas", () => {
  assert.equal(lecturaCapacidades({ respuestas: todo(3), falta: {} }).semaforo, "lista");
  const parcial = { ...todo(3), P2: 2 as const };
  const l = lecturaCapacidades({ respuestas: parcial, falta: {} });
  assert.equal(l.semaforo, "ajustes");
  assert.equal(l.frentes.find((f) => f.key === "proceso")!.nivel, 2);
  assert.deepEqual(l.brechas.map((b) => b.key), ["proceso"]);
  assert.equal(lecturaCapacidades({ respuestas: { ...todo(3), T3: 1 }, falta: {} }).semaforo, "brechas");
  const inc = lecturaCapacidades({ respuestas: { U1: 3 }, falta: {} });
  assert.equal(inc.completa, false); assert.equal(inc.semaforo, null); assert.equal(inc.respondidas, 1);
});

test("normalizar: exige todas las afirmaciones y «qué haría falta» en los frentes no instalados", () => {
  const sin = normalizarRevision({ respuestas: { U1: 3 } }, "i1", "a@b.c");
  assert.equal(sin.ok, false);
  const invalido = normalizarRevision({ respuestas: { ...todo(3), C2: 9 }, falta: {} }, "i1", "a@b.c");
  assert.equal(invalido.ok, false); if (!invalido.ok) assert.match(invalido.error, /Faltan 1/);
  const r = { respuestas: { ...todo(3), C1: 1, T1: "2" }, falta: { conocimiento: "" } };
  const falta = normalizarRevision(r, "i1", "a@b.c");
  assert.equal(falta.ok, false); if (!falta.ok) assert.match(falta.error, /conocimiento/);
  assert.deepEqual(faltaPorDescribir({ respuestas: { ...todo(3), C1: 1, T1: 2 }, falta: { tecnologia: "integrar" } }), ["conocimiento"]);
  const ok = normalizarRevision({ respuestas: { ...todo(3), C1: 1, T1: "2" }, falta: { conocimiento: " Formar a 22 visitadores; T1 ", tecnologia: "Integrar CRM", unidad: "sobra" } }, "i1", "a@b.c");
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.revision.respuestas.T1, 2);
  assert.equal(ok.revision.falta.conocimiento, "Formar a 22 visitadores; T1");
  assert.equal(ok.revision.falta.unidad, "sobra");   // se guarda el texto aunque el frente esté instalado
  assert.equal(ok.revision.checklist, checklistHash(FRENTES));
  assert.equal(lecturaCapacidades(ok.revision).semaforo, "brechas");
});

test("checklist personalizado: cinco frentes con 2 o 3 afirmaciones válidas; uno incompleto invalida todo", () => {
  const item = (n: number) => ({ texto: `Afirmación adaptada número ${n}`, pregunta: "¿Pregunta?", niveles: { "1": "no", "2": "parcial", "3": "sí" } });
  const raw = { resumen: "Pone a prueba la integración del CRM.", frentes: FRENTES.map((f) => ({ key: f.key, que: `Qué comprueba ${f.name}`, items: [item(1), item(2), item(3), item(4)] })) };
  const p = parseChecklistPersonalizado(raw);
  assert.ok(p);
  assert.equal(p!.frentes.length, 5);
  assert.deepEqual(p!.frentes.map((f) => f.items.length), [3, 3, 3, 3, 3]);
  assert.deepEqual(p!.frentes[2].items.map((i) => i.code), ["R1", "R2", "R3"]);
  assert.notEqual(checklistHash(p!.frentes), checklistHash(FRENTES));
  const malo = { frentes: raw.frentes.map((f, i) => (i === 4 ? { ...f, items: [item(1)] } : f)) };
  assert.equal(parseChecklistPersonalizado(malo), null);
  // una revisión hecha con el genérico se lee con el personalizado solo por los códigos que coinciden
  const rev = normalizarRevision({ respuestas: todo(3), falta: {} }, "i1", "x");
  assert.ok(rev.ok && rev.revision.checklist !== checklistHash(p!.frentes));
});

test("lectura inicial del modelo: solo códigos del checklist en vigor y «falta» solo donde hay brecha", () => {
  const raw = { resumen: "ok", items: [...ITEMS_CAP.map((i) => ({ code: i.code.toLowerCase(), nivel: 3, justificacion: "hecho" })), { code: "ZZ", nivel: 1 }], falta: { unidad: "nada", tecnologia: "integrar" } };
  const p = parsePropuestaCapacidades(raw);
  assert.ok(p);
  assert.equal(Object.keys(p!.respuestas).length, ITEMS_CAP.length);
  assert.deepEqual(p!.falta, {});
  const p2 = parsePropuestaCapacidades({ items: ITEMS_CAP.map((i) => ({ code: i.code, nivel: i.code === "T1" ? 1 : 3 })), falta: { tecnologia: "integrar", unidad: "nada" } });
  assert.deepEqual(p2!.falta, { tecnologia: "integrar" });
  assert.equal(parsePropuestaCapacidades({ items: [{ code: "U1", nivel: 2 }] }), null);
});

// Regla de tipo estratégica/táctica configurable por empresa: regla 4Shine
// (tres de cuatro marcas) y regla Cresio (tres criterios obligatorios).
import { test } from "node:test";
import assert from "node:assert/strict";
import { typeOf, consolidate, decisionCheck, typeRuleLabel, validationLabel, validationCriteriaCount, TYPE_RULES, DEFAULT_TYPE_RULE, type Evaluation } from "../src/lib/priorizacion";
import { typeRuleOf } from "../src/data/catalogo";
import { parseTypeRule } from "../src/server/store";

const CR = TYPE_RULES.cresio;
const ev = (type: Record<string, "ESTRATEGICO" | "TACTICO">, scores = { D: 4, E: 3, M: 3, L: 4 }): Evaluation =>
  ({ iniId: "x", by: "a@a.co", name: "A", role: "LIDER", scores, type, at: "" });

test("regla 4Shine por defecto: tres de cuatro marcas", () => {
  assert.equal(DEFAULT_TYPE_RULE.criteria.length, 4);
  assert.equal(DEFAULT_TYPE_RULE.min, 3);
  assert.equal(typeOf({ contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "TACTICO", permanencia: "ESTRATEGICO" }), "ESTRATEGICO");
  assert.equal(typeOf({ contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "TACTICO", permanencia: "TACTICO" }), "TACTICO");
  assert.equal(typeRuleOf(undefined), DEFAULT_TYPE_RULE);
  assert.equal(typeRuleOf({ typeRule: undefined }), DEFAULT_TYPE_RULE);
});

test("regla Cresio: impacto, transversalidad y potencial, los tres obligatorios", () => {
  assert.deepEqual(CR.criteria.map((c) => c.key), ["impacto", "transversalidad", "potencial"]);
  assert.equal(CR.min, 3);
  assert.equal(typeOf({ impacto: "ESTRATEGICO", transversalidad: "ESTRATEGICO", potencial: "ESTRATEGICO" }, CR), "ESTRATEGICO");
  assert.equal(typeOf({ impacto: "ESTRATEGICO", transversalidad: "TACTICO", potencial: "ESTRATEGICO" }, CR), "TACTICO");
  // las marcas de la regla 4Shine no cuentan bajo la regla Cresio
  assert.equal(typeOf({ contribucion: "ESTRATEGICO", profundidad: "ESTRATEGICO", alcance: "ESTRATEGICO", permanencia: "ESTRATEGICO" }, CR), "TACTICO");
  assert.match(typeRuleLabel(CR), /obligatorios/);
  assert.match(typeRuleLabel(), /3 o más/);
  // la validación completa de Cresio son siete criterios: 1 a 3 de tipo y 4 a 7 de la matriz
  assert.equal(validationCriteriaCount(CR), 7);
  assert.match(validationLabel(CR), /^7 criterios: 1 a 3 de tipo .*; 4 a 7 de priorización/);
  assert.equal(validationCriteriaCount(), 8);
});

test("consolidación con regla de empresa y bloqueo de lo táctico", () => {
  const all = { impacto: "ESTRATEGICO", transversalidad: "ESTRATEGICO", potencial: "ESTRATEGICO" } as const;
  const c = consolidate([ev(all), ev({ ...all, transversalidad: "TACTICO" })], CR);
  assert.equal(c.strategicVotes, 1);
  assert.equal(c.type, "ESTRATEGICO");          // mayoría no estricta: 1 de 2
  assert.equal(c.evaluators[1].type, "TACTICO");
  const t = consolidate([ev({ ...all, potencial: "TACTICO" })], CR);
  assert.equal(t.type, "TACTICO");
  assert.equal(t.transfer, true);
  // bajo la regla 4Shine lo táctico no se bloquea
  const t4 = consolidate([ev({ contribucion: "TACTICO", profundidad: "TACTICO", alcance: "TACTICO", permanencia: "ESTRATEGICO" })]);
  assert.equal(t4.type, "TACTICO"); assert.equal(t4.transfer, false);
  assert.equal(decisionCheck("IMPLEMENTAR", t4).ok, true);
  const r = decisionCheck("IMPLEMENTAR", t);
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /táctica/);
  assert.equal(decisionCheck("PREPARAR", t).ok, false);
  assert.equal(decisionCheck("BACKLOG", t).ok, true);
  assert.equal(decisionCheck("RENUNCIAR", t, "sustituida por una alianza").ok, true);
  assert.equal(decisionCheck("IMPLEMENTAR", consolidate([ev(all)], CR)).ok, true);
});

test("parseTypeRule: identificadores, regla propia y errores", () => {
  assert.deepEqual(parseTypeRule(undefined), { ok: true, rule: undefined });
  assert.deepEqual(parseTypeRule("4shine"), { ok: true, rule: undefined });      // la regla por defecto no se guarda
  const c = parseTypeRule("cresio"); assert.equal(c.ok, true); assert.equal((c as { rule?: { id?: string } }).rule?.id, "cresio");
  const stored = parseTypeRule(JSON.parse(JSON.stringify(CR)));                 // como vuelve de la base
  assert.equal(stored.ok, true); assert.equal((stored as { rule?: { criteria: unknown[] } }).rule?.criteria.length, 3);
  assert.equal(parseTypeRule("otra").ok, false);
  assert.equal(parseTypeRule({ criteria: [{ key: "a", name: "Uno solo" }], min: 1 }).ok, false);
  const own = parseTypeRule({ criteria: [{ key: "A", name: "Impacto" }, { key: "b", name: "Alcance" }], min: 5 });
  assert.equal(own.ok, false);
  const ok = parseTypeRule({ id: "mia", criteria: [{ key: "A", name: "Impacto", strategic: "sí", tactical: "no" }, { key: "b", name: "Alcance" }], min: 2 });
  assert.equal(ok.ok, true); assert.deepEqual((ok as { rule?: { criteria: { key: string }[]; min: number } }).rule?.criteria.map((x) => x.key), ["a", "b"]);
});

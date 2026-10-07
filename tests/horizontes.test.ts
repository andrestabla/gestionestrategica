// Horizontes de planeación por empresa: validación, orden del portafolio y
// ubicación de las iniciativas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { horizonsOf, horizonLabel, horizonColor, DEFAULT_HORIZONS } from "../src/data/catalogo";
import { rank, type Consolidated } from "../src/lib/priorizacion";
import { quartersFor } from "../src/components/charts";
import { resetStore, parseHorizons, createCompany, updateCompany, catalog, upsertInitiative, upsertObjective } from "../src/server/store";
import { runWithTenant } from "../src/server/tenant";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@algoritmot.com", name: "Admin", role: "ADMIN" };
const CRESIO = [{ id: "H1", label: "H1 · 2027", months: 12 }, { id: "H2", label: "H2 · 2030", months: 36 }, { id: "H3", label: "H3 · 2033", months: 72 }];

test("horizontes: sin definición rigen corto y mediano; con definición, los de la empresa", () => {
  assert.deepEqual(horizonsOf({ horizons: undefined }), DEFAULT_HORIZONS);
  assert.deepEqual(horizonsOf({ horizons: [] }), DEFAULT_HORIZONS);
  assert.equal(horizonLabel({ horizons: CRESIO }, "H2"), "H2 · 2030");
  assert.equal(horizonLabel({ horizons: CRESIO }, "X"), "X");
  assert.notEqual(horizonColor({ horizons: CRESIO }, "H1"), horizonColor({ horizons: CRESIO }, "H3"));
});

test("horizontes: validación (id, etiqueta, meses crecientes, máximo seis)", () => {
  assert.ok(parseHorizons(CRESIO).ok);
  assert.ok(!parseHorizons([{ id: "H1", label: "A", months: 12 }, { id: "H1", label: "B", months: 24 }]).ok, "repetido");
  assert.ok(!parseHorizons([{ id: "H1", label: "Uno", months: 36 }, { id: "H2", label: "Dos", months: 12 }]).ok, "no crecientes");
  assert.ok(!parseHorizons([{ id: "", label: "Uno", months: 12 }]).ok, "sin id");
  assert.ok(!parseHorizons([{ id: "H1", label: "Uno", months: 0 }]).ok, "sin plazo");
  assert.ok(!parseHorizons(Array.from({ length: 7 }, (_, i) => ({ id: `H${i}`, label: `H ${i}`, months: 12 * (i + 1) }))).ok, "máximo seis");
  const r = parseHorizons([{ id: "h1 ", label: "Primero", months: "12" }]);
  assert.ok(r.ok && r.horizons?.[0].id === "H1" && r.horizons[0].months === 12, "normaliza id y meses");
});

test("rank: agrupa por los horizontes de la empresa, en su orden, y los desconocidos al final", () => {
  const none: Consolidated = { n: 0, avg: { D: 0, E: 0, M: 0, L: 0 }, rounded: { D: 1, E: 1, M: 1, L: 1 }, score: 0, eligible: false, capacityFirst: true, type: null, strategicVotes: 0, spread: 0, lowConsensus: false, evaluators: [] };
  const items = [{ id: "a", horizon: "H3" }, { id: "b", horizon: "H1" }, { id: "c", horizon: "ZZ" }, { id: "d", horizon: "H2" }];
  const out = rank(items, () => none, ["H1", "H2", "H3"]);
  assert.deepEqual(out.map((o) => o.id), ["b", "d", "a", "c"]);
  assert.ok(out.every((o) => o.position === 1));
});

test("gantt: el eje de trimestres se adapta al rango de las iniciativas", () => {
  assert.deepEqual(quartersFor([]).slice(0, 2), ["2026-T3", "2026-T4"]);
  const q = quartersFor([{ start: "2027-T1", end: "2030-T4" }, { start: "2026-T3", end: "2027-T2" }]);
  assert.equal(q[0], "2026-T3"); assert.equal(q[q.length - 1], "2030-T4"); assert.equal(q.length, 18);
});

test("empresa: los horizontes se guardan y las iniciativas solo toman uno de ellos", async () => {
  resetStore();
  const c = await createCompany(admin, { name: "Horizontes SA", template: "vacia", horizons: CRESIO });
  assert.ok(c.ok);
  const bad = await updateCompany(admin, "horizontes-sa", { horizons: [{ id: "H1", label: "x", months: -1 }] });
  assert.ok(!bad.ok && bad.status === 422);
  await runWithTenant("horizontes-sa", async () => {
    assert.deepEqual(catalog().company.horizons?.map((h) => h.id), ["H1", "H2", "H3"]);
    const actor: SessionUser = { ...admin, company: { slug: "horizontes-sa", name: "Horizontes SA", shortName: "H" } };
    const oe = upsertObjective(actor, { id: "OE-01", perspective: "clientes", name: "Objetivo de prueba", kpis: [] } as never);
    assert.ok(oe.ok, (oe as { error?: string }).error);
    const ok = upsertInitiative(actor, { name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "OE-01", horizon: "H3", start: "2027-T1", end: "2033-T4" } as never);
    assert.ok(ok.ok, (ok as { error?: string }).error);
    assert.equal(catalog().initiatives.find((i) => i.id === ok.id)!.horizon, "H3");
    const fallback = upsertInitiative(actor, { name: "Otra iniciativa de prueba", capability: "DIR-1", cmi: "OE-01", horizon: "MEDIANO", start: "2027-T1", end: "2027-T4" } as never);
    assert.ok(fallback.ok);
    assert.equal(catalog().initiatives.find((i) => i.id === fallback.id)!.horizon, "H1", "un horizonte ajeno cae en el primero de la empresa");
  });
  resetStore();
});

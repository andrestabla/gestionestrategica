import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant, DEFAULT_TENANT } from "../src/server/tenant";
import { resetStore, catalog, getDecisions, getMetas, getTasks, getRisks, getGastos, getMadurez, listCompanies, getChecklistsCap, getRevisionesCap, getCapture } from "../src/server/store";
import { crearDemoAndina } from "../src/server/demo-andina";
import { okrObjectivesOf, objetivosSinPrioridad, pasaAPriorizacion } from "../src/lib/convencion";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("Andina Suministros se reconstruye como caso demo completo, sin avisos y conservando su historia", async () => {
  runWithTenant(DEFAULT_TENANT, () => resetStore());
  const r = await crearDemoAndina(admin, { recrear: true });
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.deepEqual(r.avisos, []);
  const co = listCompanies().find((c) => c.slug === DEFAULT_TENANT)!;
  assert.equal(co.template, "vacia");
  assert.equal(co.mode, "acompanamiento");
  runWithTenant(DEFAULT_TENANT, () => {
    const c = catalog();
    assert.equal((c.company.levers ?? []).length, 4);
    // la historia previa: mediciones de capacidades, evidencias, finanzas y territorio
    assert.equal(c.assessments.filter((a) => a.status === "PUBLICADA").length, 2);
    assert.equal(c.evidences.length, 68);
    assert.ok(c.financials && c.territories.length >= 9);
    // línea base 2026 y objetivos 2027 con los casos de cada regla de paso
    assert.equal(c.objectives.filter((o) => o.horizon === "LB").length, 10);
    assert.equal(okrObjectivesOf(c, "H1").length, 9, "a Resultados clave pasan los nueve vigentes con prioridad");
    assert.deepEqual(objetivosSinPrioridad(c, "H1").map((o) => o.id), ["OE-21"]);
    assert.ok(c.objectives.find((o) => o.id === "OE-20")?.descartado);
    assert.deepEqual(c.initiatives.filter((i) => !pasaAPriorizacion(c, i)).map((i) => i.id), ["in17", "in18", "in19"]);
    assert.equal(Object.keys(getDecisions()).length >= 14 || getDecisions().size >= 14, true);
    assert.ok(getMetas().some((m) => m.cierre), "el primer trimestre de la cascada está cerrado");
    assert.ok(getTasks().length >= 60);
    assert.ok(getRisks().length >= 10 && getGastos().length >= 20);
    assert.ok(Object.keys(getChecklistsCap()).length >= 1 && Object.keys(getRevisionesCap()).length >= 12);
    assert.equal(Object.keys(getCapture()).length, 40, "la captura A3 va en curso");
    assert.ok(getMadurez(admin).cuts.length === 1, "la madurez digital tiene su corte publicado");
  });
  // reconstruirla otra vez da el mismo resultado (sin duplicados)
  const r2 = await crearDemoAndina(admin, { recrear: true });
  assert.ok(r2.ok && r2.avisos.length === 0, r2.ok ? r2.avisos.join(" · ") : r2.error);
  assert.deepEqual(r2.ok && r2.resumen, r.resumen);
});

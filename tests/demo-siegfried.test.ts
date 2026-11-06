import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, catalog, getDecisions, getRevisionesCap, getChecklistsCap, getMetas, getAlineacion, listCompanies, calificables } from "../src/server/store";
import { crearDemoSiegfried } from "../src/server/demo-siegfried";
import { lecturaCapacidades } from "../src/lib/capacidades";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("la instancia demo TEST SIEGFRIED se crea con todo el recorrido hecho y sin avisos", async () => {
  resetStore();
  const r = await crearDemoSiegfried(admin);
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.deepEqual(r.avisos, []);
  assert.ok(listCompanies().some((c) => c.slug === "test-siegfried"));
  runWithTenant("test-siegfried", () => {
    const c = catalog();
    assert.equal(c.company.mode, "acompanamiento");
    assert.equal((c.company.levers ?? []).length, 7);
    assert.equal(c.objectives.filter((o) => o.horizon === "H1").length, 20);
    assert.ok(c.kpis.length >= 80);
    assert.equal(c.initiatives.length, 22);
    assert.ok(c.initiatives.every((i) => i.kpi && i.start && i.end && i.budgetPlanned > 0 && i.objetivo.length > 15));
    assert.equal(getAlineacion("H1", "alineacion")?.informe.items.length, 20);
    assert.equal(getAlineacion("H1", "alineacion-ini")?.informe.items.length, 22);
    assert.equal(r.resumen.calificaciones, 66);
    const dec = getDecisions();
    assert.equal(Object.values(dec).filter((d) => d.decision === "IMPLEMENTAR").length, 9);
    assert.equal(Object.values(dec).filter((d) => d.decision === "PREPARAR").length, 6);
    const rev = getRevisionesCap();
    assert.equal(Object.keys(rev).length, 15);
    assert.equal(lecturaCapacidades(rev.i13, getChecklistsCap().i13.frentes).semaforo, "brechas");
    assert.equal(lecturaCapacidades(rev.i14).semaforo, "lista");
    assert.match(rev.i13.notas ?? "", /CRM/);
    assert.equal(getMetas().length, 13);
    assert.ok(Object.values(calificables()).every((x) => x.ok));
  });
  const otra = await crearDemoSiegfried(admin);
  assert.ok(!otra.ok && otra.status === 409);
});

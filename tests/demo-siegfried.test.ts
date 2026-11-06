import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, catalog, getDecisions, getRevisionesCap, getChecklistsCap, getMetas, getAlineacion, getArticulaciones, listCompanies, calificables } from "../src/server/store";
import { crearDemoSiegfried } from "../src/server/demo-siegfried";
import { lecturaCapacidades } from "../src/lib/capacidades";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("la instancia DEMO SIEGFRIED se crea con el recorrido ideal completo y sin avisos", async () => {
  resetStore();
  const r = await crearDemoSiegfried(admin);
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.deepEqual(r.avisos, []);
  assert.ok(listCompanies().some((c) => c.slug === "demo-siegfried"));
  runWithTenant("demo-siegfried", () => {
    const c = catalog();
    assert.equal(c.company.mode, "acompanamiento");
    assert.equal((c.company.levers ?? []).length, 7);
    assert.equal(c.objectives.filter((o) => o.horizon === "H1").length, 16);
    assert.ok(c.objectives.filter((o) => o.horizon === "H1").every((o) => /^(Aumentar|Elevar|Consolidar|Obtener|Garantizar|Reducir|Mantener|Lograr|Acortar|Asegurar|Anticipar)\b/.test(o.name) && !!o.indicator));
    assert.ok((c.company.levers ?? []).every((l) => /Resultado del ciclo/.test(l.desc ?? "") && /Renuncia/.test(l.desc ?? "")));
    assert.ok(c.kpis.length >= 75);
    assert.equal(c.initiatives.length, 22);
    assert.ok(c.initiatives.every((i) => i.kpi && i.start && i.end && i.budgetPlanned > 0 && i.objetivo.length > 15));
    assert.equal(getAlineacion("H1", "alineacion")?.informe.items.length, 16);
    assert.equal(getAlineacion("H1", "alineacion-ini")?.informe.items.length, 22);
    assert.equal(r.resumen.calificaciones, 66);
    const dec = getDecisions();
    assert.equal(Object.values(dec).filter((d) => d.decision === "IMPLEMENTAR").length, 10);
    assert.equal(Object.values(dec).filter((d) => d.decision === "PREPARAR").length, 6);
    const rev = getRevisionesCap();
    assert.equal(Object.keys(rev).length, 16);
    assert.equal(lecturaCapacidades(rev.in01, getChecklistsCap().in01.frentes).semaforo, "brechas");
    assert.equal(lecturaCapacidades(rev.in06).semaforo, "lista");
    assert.match(rev.in01.notas ?? "", /CRM/);
    assert.equal(getMetas().length, 16);
    assert.ok(getMetas().every((m) => m.persona));
    const arts = getArticulaciones();
    assert.equal(Object.keys(arts).length, 22);
    assert.ok(Object.values(arts).every((a) => a.areas.filter((x) => x.rol === "LIDERA").length === 1 && a.areas.length >= 2));
    assert.equal(r.resumen.articulaciones, 22);
    assert.ok(Object.values(calificables()).every((x) => x.ok));
  });
  const otra = await crearDemoSiegfried(admin);
  assert.ok(!otra.ok && otra.status === 409);
});

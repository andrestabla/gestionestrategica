// En acompañamiento el comité directivo define la estrategia: prioridades, objetivos, resultados clave,
// iniciativas, capacidades, cascada y la decisión de tiempo del portafolio. Fuera de ese modo el directivo sigue en lectura; la IA la dispara el advisor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative, removeInitiative, saveChecklistCap, saveArticulacion, catalog } from "../src/server/store";
import { can, describeAccess } from "../src/lib/permissions";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const empresa = (mode: "acompanamiento" | "convencion" | "completa") => ({ slug: "acompanada-sa", name: "Acompañada SA", shortName: "Acompañada", mode });
const directivo = (mode: "acompanamiento" | "convencion" | "completa"): SessionUser => ({ email: "d@sf.example", name: "Directiva", role: "DIRECTIVO", company: empresa(mode) });

test("permisos: el directivo edita la estrategia solo en acompañamiento; la IA y la plataforma siguen cerradas", () => {
  const d = directivo("acompanamiento");
  for (const a of ["manage_catalog", "edit_initiatives", "edit_tasks", "report_kpi", "decide_initiatives", "create_initiatives", "evaluate_initiatives"] as const) assert.ok(can(d, a), a);
  for (const a of ["manage_users", "manage_platform", "publish_maturity", "undo_any"] as const) assert.ok(!can(d, a), a);
  assert.ok(!can(directivo("convencion"), "decide_initiatives"));
  assert.ok(!can(directivo("convencion"), "manage_catalog"));
  assert.ok(!can(directivo("completa"), "manage_catalog"));
  assert.ok(!can({ email: "d@sf.example", name: "Directiva", role: "DIRECTIVO" }, "manage_catalog"));
  assert.equal(describeAccess(d, "kpi").label, "Edición completa");
  assert.equal(describeAccess(directivo("convencion"), "kpi").label, "Lectura");
});

test("acompañamiento: el directivo crea, edita y elimina prioridades, objetivos, KR e iniciativas y articula la cascada; no personaliza el checklist", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Acompañada SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  const d = directivo("acompanamiento");
  await runWithTenant("acompanada-sa", async () => {
    assert.ok(upsertResponsible(admin, { id: "R01", cargo: "Director comercial", dependencia: "Comercial", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(d, [{ id: "EXC", name: "Excelencia comercial", order: 1, ownerId: "R01", indicator: "Share (IQVIA) · DDD" }]).ok);
    assert.ok(upsertObjective(d, { id: "OE-01", perspective: "clientes", name: "Aumentar la participación de mercado en Rx, medida por el share en valores", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertKpi(d, { code: "EXC-27-01", line: 1, cmi: "OE-01", name: "Share Rx: de 3 % a 3,3 %", unit: "%", baseline: 3, target: 3.3, ownerId: "R01", definition: "Share en valores", formula: "ventas ÷ mercado", frequency: "Mensual", source: "IQVIA", due: "2027-T4" }).ok);
    const ini = upsertInitiative(d, { id: "in01", name: "Modelo omnicanal del panel médico", capability: "MUL-4", cmi: "OE-01", ownerId: "R01", kpi: "EXC-27-01", start: "2027-T1", end: "2027-T4", budgetPlanned: 100, objetivo: "Cubrir el panel", metaResultado: "100 % de cobertura" });
    assert.ok(ini.ok, JSON.stringify(ini));
    assert.ok(saveArticulacion(d, "in01", { areas: [{ areaId: "R01", rol: "LIDERA", prioridad: 1, persona: "Gerente", contribucion: "Ejecutar el ciclo omnicanal con el panel" }] }).ok);
    const cl = saveChecklistCap(d, "in01", [], "x", "m");
    assert.ok(!cl.ok && cl.status === 403);
    assert.ok(removeInitiative(d, "in01").ok);
    assert.ok(setLevers(d, []).ok);
    assert.equal((catalog().company.levers ?? []).length, 0);
    // el mismo directivo, en una empresa en convención, no toca el catálogo
    const r = setLevers(directivo("convencion"), [{ id: "EXC", name: "Excelencia comercial", order: 1 }]);
    assert.ok(!r.ok && r.status === 403);
  });
});

// Reglas del día 2 de la convención: Dirección 3x3 es fuente de consulta (el
// líder de tribu no la modifica) y un OKR por palanca (dos solo si uno no basta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, upsertResponsible, setLevers, upsertObjective, removeObjective, catalog } from "../src/server/store";
import { okrChecks } from "../src/lib/convencion";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const lider: SessionUser = { email: "l@a.co", name: "Líder", role: "LIDER", responsibleId: "R01" };

test("convención: el líder no toca Dirección 3x3 pero sí escribe los OKR de su tribu; el advisor edita todo", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Reglas SA", template: "vacia" })).ok);
  assert.ok((await updateCompany(admin, "reglas-sa", { mode: "convencion", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("reglas-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Uno", rolPlataforma: "LIDER" }).ok);
    assert.ok(setLevers(advisor, [{ id: "MS", name: "Market Share", order: 1, ownerId: "R01" }]).ok);
    const dir = upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Objetivo directivo de la palanca", kpis: [], lever: "MS", horizon: "H1" });
    assert.ok(dir.ok);
    const bloqueado = upsertObjective(lider, { id: "OE-01", perspective: "clientes", name: "Intento del líder sobre Dirección 3x3", kpis: [], lever: "MS", horizon: "H1" });
    assert.equal(bloqueado.ok, false); assert.equal((bloqueado as { status: number }).status, 403);
    assert.equal(removeObjective(lider, "OE-01").ok, false);
    assert.equal(catalog().objectives.find((o) => o.id === "OE-01")?.name, "Objetivo directivo de la palanca");
    assert.ok(okrChecks(catalog(), "H1").some((i) => i.kind === "palanca-sin-okr" && i.ref === "MS"), "sin OKR en la palanca hay alerta alta");
    for (let n = 1; n <= 2; n++) assert.ok(upsertObjective(lider, { perspective: "clientes", name: `Objetivo ${n} de la tribu para 2027`, kpis: [], lever: "MS", horizon: "H1", okr: true }).ok, "el líder sí escribe los OKR de su tribu");
    const issues = okrChecks(catalog(), "H1");
    assert.ok(issues.some((i) => i.kind === "palanca-muchos-objetivos" && i.ref === "MS" && /un solo OKR por tribu/.test(i.text)), "dos objetivos en una palanca disparan la alerta");
    assert.ok(removeObjective(lider, "MS-O2").ok);
    assert.ok(!okrChecks(catalog(), "H1").some((i) => i.kind === "palanca-muchos-objetivos" || i.kind === "palanca-sin-okr"), "con un solo OKR no hay alerta");
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Ajuste ratificado por el relator", kpis: [], lever: "MS", horizon: "H1" }).ok);
  });
  resetStore();
});

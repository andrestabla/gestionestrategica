// Módulos encendidos o apagados por empresa (node:test + tsx): validación de la lista,
// guardado en la empresa, resolución de la ruta al módulo y nombres por modo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, catalog } from "../src/server/store";
import { parseModulesOff, moduleEnabled, moduleOfRoute, moduleLabel, modulesForMode, ALL_MODULES } from "../src/lib/modulos";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };

test("módulos: nulo o vacío = todos encendidos; desconocidos se rechazan; se normaliza al orden del menú", () => {
  assert.deepEqual(parseModulesOff(undefined), { ok: true, modulesOff: undefined });
  assert.deepEqual(parseModulesOff([]), { ok: true, modulesOff: undefined });
  assert.deepEqual(parseModulesOff(["portafolio", "benchmark", "benchmark"]), { ok: true, modulesOff: ["benchmark", "portafolio"] });
  assert.equal(parseModulesOff(["nada"]).ok, false);
  assert.equal(parseModulesOff("benchmark").ok, false);
  assert.equal(moduleEnabled({}, "benchmark"), true);
  assert.equal(moduleEnabled({ modulesOff: ["benchmark"] }, "benchmark"), false);
  assert.ok(ALL_MODULES.length >= 15);
});

test("módulos: cada modo lista los suyos y los nombra con su vocabulario", () => {
  const ac = modulesForMode("acompanamiento").map((m) => m.id);
  assert.deepEqual(ac, ["diagnostico", "prioridades", "direccion", "okr", "iniciativas", "priorizacion", "portafolio", "inteligencia"]);
  assert.ok(modulesForMode("convencion").map((m) => m.id).includes("itinerario"));
  assert.ok(modulesForMode("completa").map((m) => m.id).includes("benchmark"));
  assert.equal(moduleLabel("direccion", "acompanamiento"), "Objetivos directivos");
  assert.equal(moduleLabel("direccion", "convencion"), "Dirección 3x3");
  assert.equal(moduleLabel("benchmark", "completa"), "Benchmark");
});

test("módulos: la ruta se resuelve al módulo según el modo; panel y administración no son módulos", () => {
  assert.equal(moduleOfRoute("/panel", null, "acompanamiento"), null);
  assert.equal(moduleOfRoute("/panel/admin/empresas", null, "completa"), null);
  assert.equal(moduleOfRoute("/panel/diagnostico/autoevaluacion/responder", null, "acompanamiento"), "diagnostico");
  assert.equal(moduleOfRoute("/panel/estrategia/resultados-clave", null, "acompanamiento"), "okr");
  assert.equal(moduleOfRoute("/panel/estrategia/resultados-clave", null, "completa"), "estrategia");
  assert.equal(moduleOfRoute("/panel/convencion", "okr", "convencion"), "okr");
  assert.equal(moduleOfRoute("/panel/convencion", null, "convencion"), "direccion");
  assert.equal(moduleOfRoute("/panel/convencion", "okr", "completa"), "convencion");
  assert.equal(moduleOfRoute("/panel/iniciativas/INI-01", null, "completa"), "seguimiento");
  assert.equal(moduleOfRoute("/panel/bi", null, "acompanamiento"), "inteligencia");
});

test("módulos: la empresa guarda los apagados y los puede volver a encender", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Solo Diagnóstico SA", template: "vacia", mode: "acompanamiento", modulesOff: ["inteligencia", "portafolio"] })).ok);
  assert.equal((await updateCompany(admin, "solo-diagnostico-sa", { modulesOff: ["x"] })).ok, false);
  await runWithTenant("solo-diagnostico-sa", async () => {
    assert.deepEqual(catalog().company.modulesOff, ["portafolio", "inteligencia"]);
    assert.equal(moduleEnabled(catalog().company, "portafolio"), false);
    assert.equal(moduleEnabled(catalog().company, "diagnostico"), true);
  });
  assert.ok((await updateCompany(admin, "solo-diagnostico-sa", { modulesOff: [] })).ok);
  await runWithTenant("solo-diagnostico-sa", async () => { assert.equal(catalog().company.modulesOff, undefined); });
});

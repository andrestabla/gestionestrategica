// En el acompañamiento una iniciativa puede quedar momentáneamente sin resultado clave (vuelve a la columna de pendientes
// y no pasa a Priorización), y su presupuesto se registra en COP o en USD con puntos de miles.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, setLevers, upsertObjective, upsertKpi, upsertInitiative, calificabilidad, catalog, saveAlineacion, evaluateInitiative } from "../src/server/store";
import { initiativesOfKr, pasaAPriorizacion } from "../src/lib/convencion";
import { formatoMiles, leerMonto, fmtMonto } from "../src/lib/dinero";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@d.co", name: "Directivo", role: "DIRECTIVO", company: { slug: "sin-kr-sa", name: "Sin KR SA", mode: "acompanamiento" } } as SessionUser;
const kr = (code: string, cmi: string) => ({ code, line: 1, cmi, name: `Indicador ${code}: de 12 % a 100 %`, unit: "%", baseline: 12, target: 100, ownerId: "R01", definition: "Definición completa del indicador", formula: "a ÷ b", frequency: "Trimestral" as const, source: "CRM", due: "2027-T4" });
const base = { name: "Programa de captación de clientes nuevos", capability: "DIR-2", ownerId: "R01", start: "2027-T1", end: "2027-T3", objetivo: "Identificar y atraer clientes nuevos con mercadeo digital", metaResultado: "40 clientes nuevos" };

test("montos: puntos de miles al escribir, coma decimal y lectura del valor", () => {
  assert.equal(formatoMiles("40000000"), "40.000.000");
  assert.equal(formatoMiles("40.000.0000"), "400.000.000", "reagrupa al seguir escribiendo");
  assert.equal(formatoMiles("1250,5"), "1.250,5");
  assert.equal(formatoMiles("12.500,759"), "12.500,75");
  assert.equal(formatoMiles("abc"), "");
  assert.equal(formatoMiles("007"), "7");
  assert.equal(leerMonto("40.000.000"), 40_000_000);
  assert.equal(leerMonto("1.250,50"), 1250.5);
  assert.equal(leerMonto(""), 0);
  assert.equal(fmtMonto(40_000_000, "COP"), "COP 40.000.000");
  assert.equal(fmtMonto(12_500, "USD"), "USD 12.500");
  assert.equal(fmtMonto(900, undefined), "COP 900");
});

test("acompañamiento: la iniciativa puede quedar sin resultado clave y vuelve a los pendientes; presupuesto en COP o USD", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Sin KR SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("sin-kr-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Gerente", dependencia: "Gerencia general", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Innovación comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Aumentar la participación de mercado, medida por el share", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertKpi(advisor, kr("K1", "OE-01")).ok);

    // nace vinculada, con presupuesto en dólares
    const r = upsertInitiative(directivo, { ...base, id: "in01", cmi: "OE-01", kpi: "K1", budgetPlanned: 12_500, budgetCurrency: "USD" }); assert.ok(r.ok, JSON.stringify(r));
    let i = catalog().initiatives.find((x) => x.id === "in01")!;
    assert.equal(i.budgetCurrency, "USD"); assert.equal(i.budgetPlanned, 12_500);
    assert.ok(pasaAPriorizacion(catalog(), i));

    // el comité le quita el resultado clave: el formulario envía kpi vacío y el objetivo vacío
    const q = upsertInitiative(directivo, { ...i, kpi: "", krExtra: [], cmi: "" }); assert.ok(q.ok, JSON.stringify(q));
    i = catalog().initiatives.find((x) => x.id === "in01")!;
    assert.equal(i.kpi, ""); assert.equal(i.krExtra, undefined);
    assert.equal(i.cmi, "OE-01", "conserva el objetivo que tenía");
    assert.equal(initiativesOfKr(catalog(), "K1").length, 0, "ya no aparece bajo el resultado clave");
    assert.ok(!pasaAPriorizacion(catalog(), i), "sin resultado clave no pasa a Priorización");
    assert.match(calificabilidad(i).motivo ?? "", /sin resultado clave/);
    assert.equal(i.budgetCurrency, "USD", "un guardado que no envía la moneda la conserva");

    // y se vuelve a vincular; cambia la moneda a pesos
    assert.ok(upsertInitiative(directivo, { ...i, kpi: "K1", cmi: "", budgetPlanned: 40_000_000, budgetCurrency: "COP" }).ok);
    i = catalog().initiatives.find((x) => x.id === "in01")!;
    assert.equal(i.kpi, "K1"); assert.equal(i.cmi, "OE-01", "el objetivo se toma del resultado clave"); assert.equal(i.budgetCurrency, "COP");

    // también puede nacer sin resultado clave ni objetivo
    const n = upsertInitiative(directivo, { ...base, name: "Comité primario de lanzamientos", cmi: "", kpi: "" }); assert.ok(n.ok, JSON.stringify(n));
    const nueva = catalog().initiatives.find((x) => x.id === n.id)!;
    assert.equal(nueva.kpi, ""); assert.equal(nueva.cmi, ""); assert.equal(nueva.budgetCurrency, undefined);
    assert.ok(!pasaAPriorizacion(catalog(), nueva));
    // una moneda que no es COP ni USD se ignora; un objetivo inexistente con resultado clave inexistente se rechaza
    assert.ok(upsertInitiative(directivo, { ...nueva, budgetCurrency: "EUR" as never }).ok);
    assert.equal(catalog().initiatives.find((x) => x.id === n.id)!.budgetCurrency, undefined);
    const mal = upsertInitiative(directivo, { ...base, cmi: "OE-99", kpi: "ZZ" }); assert.ok(!mal.ok);
  });
});

test("fuera del acompañamiento el objetivo sigue siendo obligatorio al crear", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Completa SA", template: "vacia", mode: "completa", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("completa-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Gerente", dependencia: "Gerencia general", rolPlataforma: "RESPONSABLE" }).ok);
    const r = upsertInitiative(advisor, { ...base, cmi: "", kpi: "" }); assert.ok(!r.ok && /objetivo/.test(r.error));
  });
});

test("acompañamiento: toda iniciativa vinculada se califica, aunque esté incompleta, sin validar o parcialmente alineada", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Califica SA", template: "vacia", mode: "acompanamiento", typeRule: "cresio", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("califica-sa", async () => {
    assert.ok(upsertResponsible(advisor, { id: "R01", cargo: "Gerente", dependencia: "Gerencia general", rolPlataforma: "RESPONSABLE" }).ok);
    assert.ok(setLevers(advisor, [{ id: "EXC", name: "Innovación comercial", order: 1, ownerId: "R01" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "OE-01", perspective: "clientes", name: "Aumentar la participación de mercado, medida por el share", kpis: [], lever: "EXC", horizon: "H1" }).ok);
    assert.ok(upsertKpi(advisor, kr("K1", "OE-01")).ok);
    const ini = (id: string) => catalog().initiatives.find((x) => x.id === id)!;
    const valida = (items: { id: string; color: string }[]) => assert.ok(saveAlineacion(advisor, "H1", "h", { horizon: "H1", items, resumen: "" } as unknown as Parameters<typeof saveAlineacion>[3], "prueba", "alineacion-ini").ok);

    // vinculada, sin fechas ni presupuesto y sin validar: se califica y el aviso dice qué falta
    assert.ok(upsertInitiative(advisor, { id: "in01", name: "Programa de captación de clientes nuevos", cmi: "OE-01", kpi: "K1", ownerId: "R01", capability: "DIR-2" }).ok);
    let cal = calificabilidad(ini("in01"));
    assert.ok(cal.ok); assert.match(cal.aviso ?? "", /formulación incompleta/); assert.match(cal.aviso ?? "", /sin validar/);
    const ev = evaluateInitiative(advisor, "in01", { scores: { D: 3, E: 3, M: 3, L: 3 }, type: {} });
    assert.ok(ev.ok || !/No se califica todavía/.test(ev.error), "el servidor ya no rechaza la calificación por la condición de entrada");

    // completa y en amarillo: se califica; en rojo también; en verde no lleva aviso
    assert.ok(upsertInitiative(advisor, { ...base, id: "in02", cmi: "OE-01", kpi: "K1", budgetPlanned: 40_000_000 }).ok);
    valida([{ id: "in02", color: "amarillo" }]);
    cal = calificabilidad(ini("in02")); assert.ok(cal.ok); assert.match(cal.aviso ?? "", /parcialmente alineada/);
    valida([{ id: "in02", color: "rojo" }]);
    cal = calificabilidad(ini("in02")); assert.ok(cal.ok); assert.match(cal.aviso ?? "", /replantear/);
    valida([{ id: "in02", color: "verde" }]);
    cal = calificabilidad(ini("in02")); assert.ok(cal.ok); assert.equal(cal.aviso, undefined);

    // sin resultado clave sigue sin calificarse
    assert.ok(upsertInitiative(advisor, { ...base, id: "in02", cmi: "OE-01", kpi: "", budgetPlanned: 40_000_000 }).ok);
    cal = calificabilidad(ini("in02")); assert.ok(!cal.ok); assert.match(cal.motivo ?? "", /sin resultado clave/);
  });
});

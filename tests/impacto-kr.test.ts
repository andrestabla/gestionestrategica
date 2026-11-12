// Impacto de la ejecución en los resultados clave (node:test + tsx): pulso del proyecto, paso al
// resultado clave, clasificación de movimientos y registro de riesgos con sus permisos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, resetStore, upsertResponsible, upsertPerson, upsertObjective, upsertKpi, upsertInitiative, createTask, upsertRisk, removeRisk, getRisks, tenantView, getAudit } from "../src/server/store";
import { pulsoProyecto, impactoKr, movimientos, krMedido, nivelDe, REGLAS, EFECTO } from "../src/lib/impacto-kr";
import { riskError, severidad, nivelRiesgo, type ProjectRisk } from "../src/lib/riesgos";
import { hoyDe, hoyReal, vencida, vencePronto, DEMO_TODAY, type Task } from "../src/data/proyectos";
import type { InitiativeFull, KpiFull } from "../src/data/cmi";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "andrestablarico@gmail.com", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@a.co", name: "Junta", role: "DIRECTIVO" };
const ini = { id: "i1", name: "Proyecto uno", status: "EN_CURSO", ownerId: "R01", kpi: "KR-1", krExtra: ["KR-2"] } as unknown as InitiativeFull;
const T = (id: string, o: Partial<Task>): Task => ({ id, iniId: "i1", title: id, desc: "", assigneeId: "P01", start: "2027-01-01", due: "2027-01-31", status: "POR_HACER", ...o });
const riesgo = (o: Partial<ProjectRisk>): ProjectRisk => ({ id: "RG-i1-01", iniId: "i1", title: "Proveedor único", category: "EXTERNO", probability: 4, impact: 5, status: "ABIERTO", createdBy: "x", createdAt: "", updatedAt: "", ...o });

test("fechas: la empresa real usa la fecha de hoy y la de demostración su fecha fija", () => {
  assert.equal(hoyDe({ template: "demo" }), DEMO_TODAY);
  assert.equal(hoyDe({ template: "vacia" }), hoyReal());
  assert.match(hoyReal(), /^\d{4}-\d{2}-\d{2}$/);
  const t = T("a", { due: "2027-02-10" });
  assert.deepEqual([vencida(t, "2027-02-10"), vencida(t, "2027-02-11"), vencida({ ...t, status: "HECHA" }, "2027-03-01"), vencePronto(t, "2027-02-01"), vencePronto(t, "2027-01-01")], [false, true, false, true, false]);
});

test("pulso: sin plan no hay señal; al día y sin riesgos la confianza es 100; cada señal resta lo que dicen las reglas", () => {
  const vacio = pulsoProyecto(ini, [], [], "2027-02-01");
  assert.deepEqual([vacio.avance, vacio.confianza, vacio.nivel, vacio.factores.length], [null, null, "SIN_SENAL", 0]);
  // dos tareas: una cerrada a tiempo y otra que aún no empieza → al día
  const alDia = pulsoProyecto(ini, [T("a", { status: "HECHA" }), T("b", { start: "2027-03-01", due: "2027-03-31" })], [], "2027-02-10");
  assert.deepEqual([alDia.avance, alDia.esperado, alDia.ritmo, alDia.confianza, alDia.nivel], [50, 50, 0, 100, "A_FAVOR"]);
  // la misma, pero la primera sigue abierta diez días después de su compromiso y es un entregable
  const atrasada = pulsoProyecto(ini, [T("a", { status: "EN_CURSO", requiresEvidence: true }), T("b", { start: "2027-03-01", due: "2027-03-31" })], [], "2027-02-10");
  const puntos = Object.fromEntries(atrasada.factores.map((f) => [f.clave, f.puntos]));
  assert.deepEqual(puntos, { RITMO: -21, VENCIDAS: -5.5, ENTREGABLES_ATRASADOS: -4 });   // ritmo: 20 % frente a 50 % → −30 pp × 0,7; vencida: 4 + 10 días × 0,15
  assert.deepEqual([atrasada.confianza, atrasada.nivel, atrasada.tareas.vencidas, atrasada.tareas.diasAtraso, atrasada.entregables.atrasados], [70, "EN_OBSERVACION", 1, 10, 1]);   // 100 − 30,5 → 69,5 ≈ 70
  // riesgos: severidad 20 abierto resta 20/25 × 8; en mitigación la mitad; cerrado nada
  const conRiesgo = (status: ProjectRisk["status"]) => pulsoProyecto(ini, [T("a", { status: "HECHA" })], [riesgo({ status })], "2027-02-10");
  assert.deepEqual((["ABIERTO", "EN_MITIGACION", "MATERIALIZADO", "CERRADO"] as const).map((s) => conRiesgo(s).confianza), [94, 97, 89, 100]);
  // bloqueo y cronograma corrido
  const bloq = pulsoProyecto(ini, [T("a", { status: "BLOQUEADA", due: "2027-03-31" })], [], "2027-01-01", { a: 30 });
  assert.deepEqual(Object.fromEntries(bloq.factores.map((f) => [f.clave, f.puntos])), { RITMO: 6, BLOQUEADAS: -5, CRONOGRAMA: -5 });
  assert.deepEqual([nivelDe(null), nivelDe(80), nivelDe(79), nivelDe(59)], ["SIN_SENAL", "A_FAVOR", "EN_OBSERVACION", "EN_CONTRA"]);
});

test("del proyecto al resultado clave: pesa 1 el principal y 0,5 el adicional; sin señal no entra a la confianza", () => {
  const kr = (code: string): KpiFull => ({ code, line: 1, cmi: "OE-01", name: code, definition: "", formula: "", unit: "%", frequency: "Trimestral", source: "", ownerId: "R01", baseline: 10, target: 30, goodDirection: "up", series: [{ period: "2026-T4", value: 12 }, { period: "2027-T1", value: 20 }] });
  const i2 = { ...ini, id: "i2", name: "Proyecto dos", kpi: "KR-2", krExtra: [] } as unknown as InitiativeFull;
  const i3 = { ...ini, id: "i3", name: "Sin plan", kpi: "KR-2", krExtra: [] } as unknown as InitiativeFull;
  const v = { initiatives: [ini, i2, i3], kpis: [kr("KR-1"), kr("KR-2"), kr("KR-3")], tasks: [T("a", { status: "EN_CURSO", requiresEvidence: true }), T("b", { start: "2027-03-01", due: "2027-03-31" }), T("c", { iniId: "i2", status: "HECHA" })] } as never;
  const imp = impactoKr(v, [], "2027-02-10");
  assert.deepEqual(imp.krs.map((k) => k.code), ["KR-1", "KR-2"]);   // KR-3 no lo mueve nadie; primero el que más preocupa
  const k1 = imp.krs[0], k2 = imp.krs[1];
  assert.deepEqual([k1.confianza, k1.nivel, k1.proyectos.map((p) => [p.iniId, p.peso, p.principal])], [70, "EN_OBSERVACION", [["i1", 1, true]]]);
  assert.deepEqual(k2.proyectos.map((p) => [p.iniId, p.peso]), [["i2", 0.4], ["i3", 0.4], ["i1", 0.2]]);
  assert.equal(k2.cobertura, 0.6);                                   // i3 no tiene plan ni riesgos
  assert.equal(k2.confianza, Math.round((0.4 * 100 + 0.2 * 70) / 0.6));
  assert.equal(k2.avance, Math.round(((0.4 * 100 + 0.2 * 20) / 0.6) * 10) / 10);
  assert.ok(k2.factores.every((f) => f.iniId === "i1") && k2.factores[0].puntosKr === Math.round(-21 * (0.2 / 0.6) * 10) / 10);
  assert.deepEqual(imp.pesos.i1, [{ code: "KR-1", peso: 1 }, { code: "KR-2", peso: 0.2 }]);
  assert.deepEqual(krMedido(kr("x")), { valor: 20, periodo: "2027-T1", base: 10, meta: 30, avance: 50, tendencia: "MEJORA" });
  assert.equal(krMedido({ ...kr("x"), series: [] }).avance, null);
  assert.equal(krMedido({ ...kr("x"), goodDirection: "down", baseline: 30, target: 10, series: [{ period: "2027-T1", value: 25 }] }).avance, 25);
});

test("movimientos: cada cambio de la auditoría queda con su efecto, a favor o en contra, y llega a los KR del proyecto", () => {
  const v = { initiatives: [ini], kpis: [], tasks: [T("T-i1-01", { requiresEvidence: true }), T("T-i1-02", {})] } as never;
  const pesos = { i1: [{ code: "KR-1", peso: 1 }, { code: "KR-2", peso: 0.2 }] };
  const ev = (entityId: string, change: string, n: number) => ({ id: n, at: `2027-02-0${n}T10:00:00.000Z`, actor: "Ana", entityId, change });
  const ms = movimientos([
    ev("T-i1-01", "estado EN_REVISION → HECHA", 1), ev("T-i1-02", "estado EN_CURSO → HECHA", 2), ev("T-i1-02", "estado EN_CURSO → BLOQUEADA", 3),
    ev("T-i1-02", "compromiso 2027-02-10 → 2027-02-25 · nota actualizada", 4), ev("T-i1-02", "reprogramación en cadena: -14 días · 3 tareas (T-i1-02, T-i1-03)", 5),
    ev("RG-i1-01", "riesgo registrado · «Proveedor único» · severidad 20", 6), ev("RG-i1-01", "estado ABIERTO → CERRADO · severidad 20", 7), ev("RG-i1-01", "estado ABIERTO → MATERIALIZADO · nivel 12 → 20 · severidad 20", 8),
    ev("cat:i1", "iniciativa actualizada", 9), ev("T-i9-01", "estado EN_CURSO → HECHA", 9), ev("T-i1-02", "responsable P01 → P02", 9),
  ], v, [riesgo({})], pesos);
  assert.deepEqual(ms.map((m) => [m.tipo, m.puntos]), [
    ["ENTREGABLE_CUMPLIDO", EFECTO.entregableCumplido], ["TAREA_CERRADA", EFECTO.tareaCerrada], ["TAREA_BLOQUEADA", EFECTO.bloqueo],
    ["FECHA_CORRIDA", -3], ["FECHA_ADELANTADA", 2], ["RIESGO_NUEVO", -6.4], ["RIESGO_CERRADO", 6.4], ["RIESGO_MATERIALIZADO", -7.4],   // −(20/25 × (14 − 8)) − (8/25 × 8)
  ]);
  assert.deepEqual(ms[0].krs, [{ code: "KR-1", puntos: 5 }, { code: "KR-2", puntos: 1 }]);
  assert.equal(ms[5].refTitulo, "Proveedor único");
  assert.equal(REGLAS.riesgos.ABIERTO, 8);
});

test("riesgos: reglas, permisos, auditoría legible por el tablero y efecto en la lectura", async () => {
  assert.equal(riskError({ title: "abc" }), "Describe el riesgo en al menos 5 caracteres.");
  assert.ok(/mitigación exige/.test(riskError({ title: "Proveedor único", category: "EXTERNO", probability: 3, impact: 3, status: "EN_MITIGACION" }) ?? ""));
  assert.deepEqual([severidad({ probability: 4, impact: 5 }), nivelRiesgo(20), nivelRiesgo(8), nivelRiesgo(7)], [20, "ALTO", "MEDIO", "BAJO"]);
  resetStore();
  assert.ok((await createCompany(admin, { name: "Riesgos SA", template: "vacia" })).ok);
  await runWithTenant("riesgos-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Gerente general", dependencia: "Gerencia", rolPlataforma: "LIDER" }).ok);
    assert.ok(upsertPerson(advisor, { name: "Ana Pérez", cargo: "Gerente general", dependencia: "Gerencia", email: "ana@riesgos.example", responsibleId: "R01" }).ok);
    assert.ok(upsertObjective(advisor, { perspective: "financiera", name: "Crecer 20 % con margen", kpis: [], line: 1 }).ok);
    assert.ok(upsertKpi(advisor, { code: "DIR-01", line: 1, cmi: "OE-01", name: "Crecimiento de ventas", unit: "%", frequency: "Trimestral", ownerId: "R01", baseline: 5, target: 20, goodDirection: "up" }).ok);
    const i = upsertInitiative(advisor, { name: "Plan comercial por cuentas", cmi: "OE-01", capability: "EJE-2", ownerId: "R01", kpi: "DIR-01" });
    assert.ok(i.ok);
    const dato = { iniId: i.id!, title: "Proveedor único del insumo crítico", category: "EXTERNO" as const, probability: 4, impact: 5, status: "ABIERTO" as const };
    const sinPermiso = upsertRisk(directivo, dato);
    assert.ok(!sinPermiso.ok && sinPermiso.status === 403);
    assert.ok(!upsertRisk(advisor, { ...dato, iniId: "i99" }).ok);
    assert.ok(!upsertRisk(advisor, { ...dato, probability: 6 }).ok);
    const r = upsertRisk(advisor, dato);
    assert.ok(r.ok && r.risk.id === `RG-${i.id}-01` && getRisks(i.id).length === 1);
    assert.equal(getAudit(r.risk.id)[0].change, "riesgo registrado · «Proveedor único del insumo crítico» · severidad 20");
    const sinRespuesta = upsertRisk(advisor, { id: r.risk.id, status: "EN_MITIGACION" });
    assert.ok(!sinRespuesta.ok && sinRespuesta.status === 422);
    const mit = upsertRisk(advisor, { id: r.risk.id, status: "EN_MITIGACION", mitigation: "Calificar un segundo proveedor", probability: 2 });
    assert.ok(mit.ok && mit.risk.createdAt === r.risk.createdAt);
    assert.equal(getAudit(r.risk.id)[0].change, "estado ABIERTO → EN_MITIGACION · nivel 20 → 10 · respuesta actualizada · severidad 10");
    assert.ok(upsertRisk(advisor, { id: r.risk.id }).ok && getAudit(r.risk.id).length === 2);   // sin cambios no deja traza
    // la lectura del proyecto y del resultado clave refleja el riesgo
    const imp = impactoKr(tenantView(), getRisks(), "2027-02-10");
    const p = imp.proyectos.find((x) => x.iniId === i.id)!;
    assert.deepEqual([p.confianza, p.riesgos.vivos, p.factores[0].clave, imp.krs[0].code, imp.krs[0].confianza], [98, 1, "RIESGOS", "DIR-01", 98]);
    const ms = movimientos(getAudit().map((a) => ({ ...a })), tenantView(), getRisks(), imp.pesos);
    // el movimiento lleva todos sus cambios y toma el tipo del que más pesa (aquí, la baja de nivel de 20 a 10)
    assert.deepEqual(ms.map((m) => [m.tipo, m.puntos]), [["RIESGO_CAMBIA", 4.8], ["RIESGO_NUEVO", -6.4]]);
    assert.equal(ms[0].texto, "Riesgo en mitigación · El riesgo baja de 20 a 10");
    assert.ok(!removeRisk(directivo, r.risk.id).ok);
    assert.ok(removeRisk(advisor, r.risk.id).ok && getRisks().length === 0);
    void createTask;
  });
});

test("ruta crítica: holgura por dependencias, tareas críticas, conflicto, ciclo y fin previsto con el estado a la fecha", async () => {
  const { rutaCritica, formaCiclo, sumarDias } = await import("../src/lib/ruta-critica");
  assert.equal(sumarDias("2027-01-31", 1), "2027-02-01");
  // A (ene) → B (feb) → D (mar, hito); C (feb, corta) también alimenta D y tiene holgura
  const A = T("A", { start: "2027-01-01", due: "2027-01-31", status: "HECHA" });
  const B = T("B", { start: "2027-02-01", due: "2027-02-28", dependsOn: ["A"], status: "EN_CURSO" });
  const C = T("C", { start: "2027-02-01", due: "2027-02-10", dependsOn: ["A"] });
  const D = T("D", { start: "2027-03-01", due: "2027-03-15", dependsOn: ["B", "C"], milestone: true });
  const r = rutaCritica([A, B, C, D], "2027-02-05");
  assert.deepEqual([r.fin, r.finPrevisto, r.desvio, r.ciclo], ["2027-03-15", "2027-03-15", 0, false]);
  assert.deepEqual(r.criticas, ["A", "B", "D"]);
  assert.deepEqual(["A", "B", "C", "D"].map((id) => r.nodos[id].holgura), [0, 0, 18, 0]);   // C puede correrse 18 días sin mover el fin
  assert.ok(!r.nodos.C.critica && !r.nodos.C.conflicto);
  // el mismo plan visto el 10 de marzo: B sigue en curso y vencida → empuja a D y el fin se corre
  const tarde = rutaCritica([A, B, C, D], "2027-03-10");
  assert.equal(tarde.nodos.B.finPrevisto, sumarDias("2027-03-10", Math.round(27 * 0.6)));   // le falta el 60 % de sus 27 días
  assert.equal(tarde.nodos.D.finPrevisto, sumarDias(tarde.nodos.B.finPrevisto, 14));
  assert.ok(tarde.desvio > 0 && tarde.finPrevisto === tarde.nodos.D.finPrevisto && tarde.nodos.D.atraso === tarde.desvio);
  // conflicto: una tarea que empieza antes de que termine su dependencia
  assert.ok(rutaCritica([A, T("E", { start: "2027-01-15", due: "2027-02-01", dependsOn: ["A"] })], "2027-01-01").nodos.E.conflicto);
  // ciclo
  assert.ok(formaCiclo([A, B, C, D], "A", ["D"]) && !formaCiclo([A, B, C, D], "C", ["B"]));
  assert.ok(rutaCritica([{ ...A, dependsOn: ["D"] }, B, C, D], "2027-02-05").ciclo);
  // el motor de impacto recoge el fin previsto y cuenta el hito como compromiso formal
  const p = pulsoProyecto(ini, [A, B, C, D].map((t) => ({ ...t, iniId: "i1" })), [], "2027-03-10");
  assert.deepEqual([p.fin?.planeado, p.fin?.criticas, p.fin?.hitos, p.fin?.hitosCumplidos, p.entregables.total], ["2027-03-15", 3, 1, 0, 1]);
  assert.ok((p.fin?.desvio ?? 0) >= 5 && p.factores.some((f) => f.clave === "FIN_PREVISTO" && f.puntos < 0));
});

test("presupuesto: ejecutado contra avance, valor ganado, índice de costo, proyección al cierre y su efecto en la confianza", async () => {
  const { presupuestoDe, totalesPorMoneda, gastoError, dinero, dineroCorto } = await import("../src/lib/presupuesto");
  const base = { id: "i1", budgetPlanned: 100_000_000, budgetCommitted: 0, budgetExecuted: 0 };
  const g = (tipo: "EJECUCION" | "COMPROMISO", monto: number, iniId = "i1") => ({ id: `GS-${iniId}-${monto}`, iniId, tipo, concepto: "Consultoría", monto, fecha: "2027-02-01", by: "x", at: "" });
  // sin presupuesto, sin ejecución y en línea
  assert.equal(presupuestoDe({ ...base, budgetPlanned: 0 }, [], 50).estado, "SIN_PRESUPUESTO");
  assert.equal(presupuestoDe(base, [], 50).estado, "SIN_EJECUCION");
  const enLinea = presupuestoDe(base, [g("EJECUCION", 40_000_000), g("COMPROMISO", 60_000_000), g("EJECUCION", 9, "i2")], 50);
  assert.deepEqual([enLinea.ejecutado, enLinea.comprometido, enLinea.pctEjecutado, enLinea.valorGanado, enLinea.indiceCosto, enLinea.brecha, enLinea.proyeccion, enLinea.sobrecosto, enLinea.disponible, enLinea.estado],
    [40_000_000, 60_000_000, 40, 50_000_000, 1.25, -10, 80_000_000, -20_000_000, 40_000_000, "EN_LINEA"]);
  // gasta más rápido de lo que avanza: 60 % ejecutado con 30 % de avance → proyecta el doble
  const alerta = presupuestoDe(base, [g("EJECUCION", 60_000_000)], 30);
  assert.deepEqual([alerta.brecha, alerta.indiceCosto, alerta.proyeccion, alerta.sobrecosto, alerta.estado], [30, 0.5, 200_000_000, 100_000_000, "ALERTA"]);
  // el saldo de apertura de la ficha cuenta; ejecutado por encima de lo planeado es sobrecosto
  const sobre = presupuestoDe({ ...base, budgetExecuted: 90_000_000, budgetCurrency: "USD" as const }, [g("EJECUCION", 20_000_000)], 80);
  assert.deepEqual([sobre.ejecutado, sobre.apertura.ejecutado, sobre.estado, sobre.moneda, sobre.disponible], [110_000_000, 90_000_000, "SOBRECOSTO", "USD", -10_000_000]);
  // sin plan de trabajo no hay valor ganado ni proyección; con poco avance tampoco se proyecta
  assert.deepEqual([presupuestoDe(base, [g("EJECUCION", 10_000_000)], null).brecha, presupuestoDe(base, [g("EJECUCION", 10_000_000)], 5).proyeccion], [null, null]);
  assert.deepEqual(totalesPorMoneda([enLinea, alerta, sobre]).map((t) => [t.moneda, t.proyectos, t.planeado, t.ejecutado, t.pctEjecutado, t.pctAvance]), [["COP", 2, 200_000_000, 100_000_000, 50, 40], ["USD", 1, 100_000_000, 110_000_000, 110, 80]]);
  assert.equal(gastoError({ tipo: "EJECUCION", concepto: "Consultoría", monto: 0, fecha: "2027-02-01" }), "El monto es un número mayor que cero.");
  assert.equal(gastoError({ tipo: "EJECUCION", concepto: "Consultoría", monto: 10, fecha: "2027-02-01" }), null);
  assert.deepEqual([dinero(12_500_000, "COP"), dineroCorto(12_500_000, "COP"), dineroCorto(130_000, "USD"), dineroCorto(2_400_000_000, "COP")], ["COP 12.500.000", "COP 12,5 M", "USD 130 mil", "COP 2,4 mil M"]);
  // en el motor: la brecha de 30 puntos resta 30 × 0,3 = 9; comprometer 25 % más de lo planeado resta 25 × 0,4 → tope 8
  const conPres = { ...ini, budgetPlanned: 100_000_000, budgetCommitted: 0, budgetExecuted: 0 } as InitiativeFull;
  const tareas = [T("a", { status: "HECHA" }), T("b", { status: "EN_CURSO", due: "2027-06-30" }), T("c", { start: "2027-04-01", due: "2027-06-30" }), T("d", { start: "2027-04-01", due: "2027-06-30" })];   // avance 35 %
  const p = pulsoProyecto(conPres, tareas, [], "2027-02-10", {}, [g("EJECUCION", 65_000_000), g("COMPROMISO", 125_000_000)]);
  assert.deepEqual([p.avance, p.presupuesto.brecha, p.presupuesto.estado], [35, 30, "ALERTA"]);
  assert.deepEqual(Object.fromEntries(p.factores.filter((f) => f.clave === "PRESUPUESTO" || f.clave === "SOBRECOMPROMISO").map((f) => [f.clave, f.puntos])), { PRESUPUESTO: -9, SOBRECOMPROMISO: -8 });
  // en el store: permisos, proyecto con presupuesto y traza legible por el tablero
  const { addGasto, removeGasto, getGastos } = await import("../src/server/store");
  resetStore();
  assert.ok((await createCompany(admin, { name: "Presupuesto SA", template: "vacia" })).ok);
  await runWithTenant("presupuesto-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Gerente general", dependencia: "Gerencia", rolPlataforma: "LIDER" }).ok);
    assert.ok(upsertObjective(advisor, { perspective: "financiera", name: "Crecer 20 % con margen", kpis: [], line: 1 }).ok);
    assert.ok(upsertKpi(advisor, { code: "DIR-01", line: 1, cmi: "OE-01", name: "Crecimiento de ventas", unit: "%", frequency: "Trimestral", ownerId: "R01", baseline: 5, target: 20, goodDirection: "up" }).ok);
    const sin = upsertInitiative(advisor, { name: "Proyecto sin presupuesto", cmi: "OE-01", capability: "EJE-2", ownerId: "R01", kpi: "DIR-01" });
    const con = upsertInitiative(advisor, { name: "Proyecto con presupuesto", cmi: "OE-01", capability: "EJE-2", ownerId: "R01", budgetPlanned: 50_000_000 });
    const mov = { tipo: "EJECUCION" as const, concepto: "Anticipo del proveedor", monto: 12_000_000, fecha: "2027-02-01" };
    const sinPermiso = addGasto(directivo, { ...mov, iniId: con.id });
    assert.ok(!sinPermiso.ok && sinPermiso.status === 403);
    const sinPlan = addGasto(advisor, { ...mov, iniId: sin.id });
    assert.ok(!sinPlan.ok && /no tiene presupuesto planeado/.test(sinPlan.error));
    assert.ok(!addGasto(advisor, { ...mov, iniId: con.id, monto: -5 }).ok);
    const ok = addGasto(advisor, { ...mov, iniId: con.id });
    assert.ok(ok.ok && ok.gasto.id === `GS-${con.id}-01` && getGastos(con.id).length === 1);
    assert.equal(getAudit(ok.gasto.id)[0].change, "ejecución registrada por COP 12.000.000 · «Anticipo del proveedor»");
    const imp = impactoKr(tenantView(), [], "2027-02-10", {}, getGastos());
    assert.deepEqual([imp.proyectos.find((x) => x.iniId === con.id)!.presupuesto.ejecutado, imp.proyectos.find((x) => x.iniId === con.id)!.presupuesto.estado], [12_000_000, "EN_LINEA"]);
    const ms = movimientos(getAudit().map((a) => ({ ...a })), tenantView(), [], imp.pesos);
    assert.deepEqual([ms[0].tipo, ms[0].puntos, ms[0].texto], ["GASTO", 0, "Ejecución de presupuesto: COP 12.000.000"]);
    assert.ok(!removeGasto(directivo, ok.gasto.id).ok && removeGasto(advisor, ok.gasto.id).ok && getGastos().length === 0);
  });
});

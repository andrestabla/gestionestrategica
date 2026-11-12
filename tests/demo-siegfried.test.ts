import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { resetStore, catalog, getDecisions, getRevisionesCap, getChecklistsCap, getMetas, getAlineacion, getArticulaciones, listCompanies, calificables, getTasks, getUploads, getRisks, getGastos, getMadurez, tenantView, deviationDays, effectiveInitiatives, effectiveKpiSeries, activityFeed } from "../src/server/store";
import { crearDemoSiegfried } from "../src/server/demo-siegfried";
import { lecturaCapacidades } from "../src/lib/capacidades";
import { okrObjectivesOf, objetivosSinPrioridad, pasaAPriorizacion, krFaltantes, initiativesOfKr } from "../src/lib/convencion";
import { impactoKr, movimientos } from "../src/lib/impacto-kr";
import { rutaCritica } from "../src/lib/ruta-critica";
import { presupuestoDe } from "../src/lib/presupuesto";
import { hoyDe } from "../src/data/proyectos";
import { overallLevel } from "../src/lib/madurez";
import { instrumentOf } from "../src/data/madurez";
import { pdfSimple } from "../src/server/demo-siegfried-ejecucion";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.test", name: "Admin", role: "ADMIN" };

test("la instancia DEMO SIEGFRIED se crea con el recorrido ideal completo, un caso de cada regla de paso y sin avisos", async () => {
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
    assert.equal(c.objectives.filter((o) => o.horizon === "H1").length, 18);
    // un caso de cada regla de paso: descartado, sin prioridad, iniciativa sin KR y KR de sostenimiento
    const oe17 = c.objectives.find((o) => o.id === "OE-17")!, oe18 = c.objectives.find((o) => o.id === "OE-18")!;
    assert.ok(oe17.descartado && /renuncia/.test(oe17.motivoDescarte ?? ""));
    assert.ok(!oe18.lever && !oe18.descartado);
    assert.deepEqual(okrObjectivesOf(c, "H1").length, 16, "a Resultados clave pasan los dieciséis vigentes con prioridad");
    assert.deepEqual(objetivosSinPrioridad(c, "H1").map((o) => o.id), ["OE-18"]);
    assert.deepEqual(c.initiatives.filter((i) => !pasaAPriorizacion(c, i)).map((i) => i.id), ["in23", "in24", "in25"], "la que no tiene resultado clave y las dos mapeadas con categoría");
    assert.deepEqual(c.initiatives.filter((i) => i.categoria).map((i) => [i.id, i.categoria, i.cmi, i.kpi]), [["in24", "especial", "", ""], ["in25", "disruptiva", "", ""]]);
    // iniciativas que mueven más de un resultado clave (de 1 a 3)
    assert.deepEqual(c.initiatives.find((i) => i.id === "in01")!.krExtra, ["EXC-27-05"]);
    assert.deepEqual(initiativesOfKr(c, "OPE-27-04").map((i) => i.id), ["in08"]);
    const sost = c.kpis.find((k) => k.code === "FIN-27-04")!;
    assert.equal(sost.goodDirection, "keep"); assert.equal(sost.target, sost.baseline); assert.deepEqual(krFaltantes(sost), []);
    assert.ok(c.objectives.filter((o) => o.horizon === "H1").every((o) => /^(Aumentar|Elevar|Consolidar|Obtener|Garantizar|Reducir|Mantener|Lograr|Acortar|Asegurar|Anticipar)\b/.test(o.name) && !!o.indicator));
    assert.ok((c.company.levers ?? []).every((l) => /Resultado del ciclo/.test(l.desc ?? "") && /Renuncia/.test(l.desc ?? "")));
    assert.ok(c.kpis.length >= 75);
    assert.equal(c.initiatives.length, 25);
    assert.ok(c.initiatives.every((i) => (i.kpi || i.id === "in23" || i.categoria) && i.start && i.end && i.budgetPlanned >= 1_000_000 && i.objetivo.length > 15));
    const ali = getAlineacion("H1", "alineacion")!.informe.items;
    assert.equal(ali.length, 17, "dieciséis en verde y el que no tiene prioridad en amarillo; el descartado no se valida");
    assert.equal(ali.filter((x) => x.color === "verde").length, 16); assert.equal(ali.find((x) => x.id === "OE-18")?.color, "amarillo");
    const aliIni = getAlineacion("H1", "alineacion-ini")!.informe.items;
    assert.equal(aliIni.length, 25); assert.equal(aliIni.filter((x) => x.color === "verde").length, 22);
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
    const cal = calificables();
    assert.ok(Object.entries(cal).every(([id, x]) => (["in23", "in24", "in25"].includes(id) ? !x.ok : x.ok)), "todas calificables salvo las que no tienen resultado clave");
  });
  const otra = await crearDemoSiegfried(admin);
  assert.ok(!otra.ok && otra.status === 409);
});

test("la demo queda a mitad de ejecución: proyectos con su historia, riesgos, presupuesto, mediciones, cierre de trimestre y madurez digital", async () => {
  resetStore();
  const r = await crearDemoSiegfried(admin, { recrear: true });
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.deepEqual(r.avisos, []);
  runWithTenant("demo-siegfried", () => {
    const c = catalog(), v = tenantView(), hoy = hoyDe(c.company);
    assert.equal(hoy, "2027-05-17", "la demo vive detenida en su fecha fija");
    assert.equal(c.people.length, 16);
    assert.ok(c.people.every((p) => c.responsibles.some((x) => x.id === p.responsibleId) && /@demo-siegfried\.demo$/.test(p.email)));

    // plan de trabajo: los dieciséis proyectos decididos, con todos los estados y ninguna tarea cerrada sin evidencia
    const tasks = getTasks();
    assert.equal(new Set(tasks.map((t) => t.iniId)).size, 16);
    assert.equal(tasks.length, r.resumen.tareas); assert.ok(tasks.length >= 65);
    for (const st of ["HECHA", "EN_REVISION", "EN_CURSO", "BLOQUEADA", "POR_HACER"]) assert.ok(tasks.some((t) => t.status === st), `hay tareas en ${st}`);
    assert.ok(tasks.filter((t) => t.status === "HECHA").every((t) => getUploads(t.id).length > 0 && t.due <= hoy));
    assert.ok(tasks.filter((t) => t.status === "BLOQUEADA").every((t) => (t.note ?? "").length > 10));
    assert.ok(tasks.some((t) => t.milestone) && tasks.some((t) => t.requiresEvidence) && tasks.some((t) => deviationDays(t) > 0));
    assert.ok(tasks.every((t) => (t.dependsOn ?? []).every((d) => tasks.some((x) => x.id === d && x.iniId === t.iniId && x.due < t.start))), "ninguna tarea empieza antes de que termine la que la precede");
    assert.ok(getUploads().some((u) => u.status === "VERIFICADA") && getUploads().some((u) => u.status === "PENDIENTE"));
    for (const id of new Set(tasks.map((t) => t.iniId))) { const rc = rutaCritica(tasks.filter((t) => t.iniId === id), hoy); assert.ok(!rc.ciclo && rc.criticas.length > 0, `ruta crítica de ${id}`); }

    // riesgos y presupuesto
    const risks = getRisks(), gastos = getGastos();
    assert.equal(risks.length, 13);
    for (const st of ["ABIERTO", "EN_MITIGACION", "MATERIALIZADO", "CERRADO"]) assert.ok(risks.some((x) => x.status === st), `hay riesgos en ${st}`);
    assert.ok(risks.filter((x) => x.status !== "ABIERTO").every((x) => x.mitigation));
    assert.equal(gastos.length, r.resumen.movimientosPresupuesto); assert.ok(gastos.length >= 28);
    assert.ok(gastos.every((g) => g.fecha <= hoy && g.monto >= 1_000_000));

    // tablero de impacto: proyectos a favor, en observación y en contra; resultados clave medidos; movimientos con signo
    const desvios = Object.fromEntries(tasks.map((t) => [t.id, deviationDays(t)]));
    const imp = impactoKr(v, risks, hoy, desvios, gastos);
    const conPlan = imp.proyectos.filter((p) => p.tareas.total > 0);
    assert.equal(conPlan.length, 16);
    const niveles = new Set(conPlan.map((p) => p.nivel));
    assert.ok(niveles.size === 3, `los tres niveles de confianza aparecen (${[...niveles].join(", ")})`);
    assert.ok(imp.krs.length >= 16 && imp.krs.some((k) => k.medido.valor !== null));
    const estados = new Set(c.initiatives.map((i) => presupuestoDe(i, gastos, conPlan.find((p) => p.iniId === i.id)?.avance ?? null, "COP").estado));
    for (const e of ["EN_LINEA", "ALERTA", "SIN_EJECUCION"]) assert.ok(estados.has(e as never), `hay proyectos con presupuesto ${e}`);

    // mediciones del primer trimestre y avance de las iniciativas
    const kr = c.kpis.find((k) => k.code === "EXC-27-04")!;
    assert.deepEqual(effectiveKpiSeries(kr.code).map((s) => s.period), ["2026-T4", "2027-T1"]);
    assert.equal(effectiveKpiSeries("FIN-27-04").at(-1)!.value, c.kpis.find((k) => k.code === "FIN-27-04")!.baseline, "el de sostenimiento se mantiene");
    assert.ok(effectiveKpiSeries("OPE-27-01").at(-1)!.value > c.kpis.find((k) => k.code === "OPE-27-01")!.baseline, "uno empeora (más hallazgos abiertos que en la línea base)");
    const inis = effectiveInitiatives();
    assert.equal(inis.find((i) => i.id === "in06")!.status, "EN_RIESGO"); assert.equal(inis.find((i) => i.id === "in07")!.progress, 90);
    assert.ok(inis.filter((i) => ["in02", "in18", "in24"].includes(i.id)).every((i) => i.status === "PLANEADA" && i.progress === 0));

    // cascada: el primer trimestre cerrado con cumplimiento y aprendizaje; el segundo, en curso
    const metas = getMetas();
    assert.ok(metas.filter((m) => m.quarter === "2027-T1").every((m) => m.cierre && m.cierre.aprendizaje.length > 20));
    assert.ok(metas.filter((m) => m.quarter === "2027-T2").every((m) => !m.cierre && m.estado === "EN_CURSO"));
    for (const e of ["CUMPLIDA", "PARCIAL"]) assert.ok(metas.some((m) => m.estado === e));

    // madurez digital: diez personas (una a medias), las 48 variables calificadas y un corte publicado
    const ins = instrumentOf("empresa");
    const mad = getMadurez({ email: "advisor@demo-siegfried.demo", name: "Advisor 4Shine", role: "CONSULTOR" } as SessionUser);
    assert.equal(mad.participacion.personas, 10); assert.equal(mad.participacion.completas, 9);
    assert.equal(mad.progress.level, ins.variables.length); assert.equal(mad.progress.dik, ins.variables.length);
    assert.equal(mad.cuts.length, 1); assert.match(mad.cuts[0].label, /Línea base/);
    const nivel = overallLevel(ins, mad.vars)!;
    assert.ok(nivel > 1.8 && nivel < 3.2, `nivel general plausible (${nivel.toFixed(2)})`);
    assert.ok(Object.values(mad.safeguards).some((s) => s.status === "FALLA"));
    assert.ok(Object.values(mad.vars).every((x) => (x.hallazgo ?? "").length > 20 && (x.recomendacion ?? "").length > 20));
  });
  // los movimientos salen de la auditoría, fechada en el momento que cada registro representa (nunca después del «hoy» de la demo)
  await runWithTenant("demo-siegfried", async () => {
    const v = tenantView(), risks = getRisks(), tasks = getTasks();
    const imp = impactoKr(v, risks, "2027-05-17", Object.fromEntries(tasks.map((t) => [t.id, deviationDays(t)])), getGastos());
    const { events } = await activityFeed({ limit: 500 });
    assert.ok(events.every((e) => e.at.slice(0, 10) <= "2027-05-17" && e.at.slice(0, 10) >= "2026-11-01"), "la auditoría no tiene fechas fuera de la historia de la demo");
    const movs = movimientos(events, v, risks, imp.pesos);
    assert.ok(movs.length >= 80);
    for (const tipo of ["ENTREGABLE_CUMPLIDO", "TAREA_CERRADA", "TAREA_BLOQUEADA", "FECHA_CORRIDA", "EVIDENCIA", "RIESGO_NUEVO", "RIESGO_MATERIALIZADO", "RIESGO_EN_MITIGACION", "RIESGO_CERRADO", "GASTO"]) assert.ok(movs.some((m) => m.tipo === tipo), `hay movimientos ${tipo}`);
    assert.ok(movs.some((m) => m.puntos > 0) && movs.some((m) => m.puntos < 0));
  });
});

test("el PDF de ejemplo de las evidencias es un PDF válido con texto acentuado", () => {
  const pdf = pdfSimple("Acta de aprobación — plan de certificación", ["Proyecto: «Plan de certificación BPM»", "Línea con eñe y tildes: señal, está, único."]);
  const txt = pdf.toString("latin1");
  assert.ok(txt.startsWith("%PDF-1.4") && txt.trimEnd().endsWith("%%EOF"));
  const xref = Number(/startxref\n(\d+)/.exec(txt)![1]);
  assert.equal(txt.slice(xref, xref + 4), "xref");
  assert.match(txt, /certificaci\xf3n/);
});

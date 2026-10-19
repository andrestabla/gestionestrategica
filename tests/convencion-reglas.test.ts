// Reglas del día 2 de la convención: Dirección 3x3 es fuente de consulta (el
// líder de tribu no la modifica) y un OKR por palanca (dos solo si uno no basta).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, upsertResponsible, setLevers, upsertObjective, removeObjective, catalog } from "../src/server/store";
import { okrChecks } from "../src/lib/convencion";
import { typeRuleOf } from "../src/data/catalogo";
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

test("convención: el líder de tribu solo toca el OKR, los KR y las iniciativas de su tribu; no decide ni califica otras tribus", async () => {
  const { upsertKpi, removeKpi, upsertInitiative, removeInitiative, evaluateInitiative, decideInitiative, setPrioSession, resetPrioSession, getEvaluations } = await import("../src/server/store");
  const otro: SessionUser = { email: "o@a.co", name: "Líder dos", role: "LIDER", responsibleId: "R02" };
  const gerencia: SessionUser = { email: "g@a.co", name: "Gerencia", role: "LIDER" };
  resetStore();
  assert.ok((await createCompany(admin, { name: "Ambito SA", template: "vacia" })).ok);
  assert.ok((await updateCompany(admin, "ambito-sa", { mode: "convencion", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("ambito-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Uno", rolPlataforma: "LIDER" }).ok);
    assert.ok(upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Dos", rolPlataforma: "LIDER" }).ok);
    assert.ok(setLevers(advisor, [{ id: "MS", name: "Market Share", order: 1, ownerId: "R01" }, { id: "MAR", name: "Margen", order: 2, ownerId: "R02" }]).ok);
    assert.ok(upsertObjective(advisor, { id: "MS-O1", perspective: "clientes", name: "Objetivo rector de Market Share", kpis: [], lever: "MS", horizon: "H1", okr: true }).ok);
    assert.ok(upsertObjective(advisor, { id: "MAR-O1", perspective: "financiera", name: "Objetivo rector de Margen", kpis: [], lever: "MAR", horizon: "H1", okr: true }).ok);
    // objetivos: solo el de su palanca
    assert.equal((upsertObjective(lider, { id: "MAR-O1", perspective: "financiera", name: "Intento sobre la otra tribu", kpis: [], lever: "MAR", horizon: "H1", okr: true }) as { status?: number }).status, 403);
    assert.equal((upsertObjective(lider, { perspective: "financiera", name: "Objetivo nuevo en palanca ajena", kpis: [], lever: "MAR", horizon: "H1", okr: true }) as { status?: number }).status, 403);
    assert.ok(upsertObjective(lider, { id: "MS-O1", perspective: "clientes", name: "Objetivo rector de Market Share (ajustado)", kpis: [], lever: "MS", horizon: "H1", okr: true }).ok);
    // resultados clave: solo bajo el objetivo de su tribu
    const kr = (u: SessionUser, code: string, cmi: string) => upsertKpi(u, { code, cmi, name: `Resultado clave ${code} al 15 %`, unit: "%", baseline: 1, target: 2, ownerId: "R01", due: "2027-T4", definition: "Fórmula y fuente" });
    assert.ok(kr(lider, "MS-01", "MS-O1").ok);
    assert.equal((kr(lider, "MAR-01", "MAR-O1") as { status?: number }).status, 403);
    assert.ok(kr(advisor, "MAR-01", "MAR-O1").ok);
    assert.equal((upsertKpi(lider, { code: "MAR-01", cmi: "MS-O1", name: "Robo de un KR ajeno", unit: "%" }) as { status?: number }).status, 403);
    assert.equal((removeKpi(lider, "MAR-01") as { status?: number }).status, 403);
    assert.ok(removeKpi(otro, "MAR-01").ok);
    // iniciativas: solo las de su tribu, y las nuevas con su tribu como dueña
    const ini = (u: SessionUser, extra: Record<string, unknown>) => upsertInitiative(u, { name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "MS-O1", horizon: "H1", ...extra });
    assert.equal((ini(lider, { ownerId: "R02" }) as { status?: number }).status, 403);
    const mia = ini(lider, { ownerId: "R01" }); assert.ok(mia.ok);
    const ajena = ini(otro, { ownerId: "R02", cmi: "MAR-O1" }); assert.ok(ajena.ok);
    assert.equal((upsertInitiative(lider, { id: (ajena as { id: string }).id, name: "Edición de una iniciativa ajena", capability: "DIR-1", cmi: "MAR-O1", ownerId: "R02", horizon: "H1" }) as { status?: number }).status, 403);
    assert.equal((removeInitiative(lider, (ajena as { id: string }).id) as { status?: number }).status, 403);
    assert.ok(upsertInitiative(gerencia, { id: (ajena as { id: string }).id, name: "Gerencia sí edita cualquier iniciativa", capability: "DIR-1", cmi: "MAR-O1", ownerId: "R02", horizon: "H1" }).ok);
    // calificación: el líder de tribu abre la de su tribu y no califica las de otra; no decide
    assert.ok(upsertInitiative(lider, { id: (mia as { id: string }).id, name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "MS-O1", ownerId: "R01", horizon: "H1", kpi: "MS-01" }).ok);
    assert.equal((setPrioSession(lider, "R02", "abrir") as { status?: number }).status, 403);
    assert.ok(setPrioSession(lider, "R01", "abrir").ok);
    const ev = { scores: { D: 3, E: 3, M: 3, L: 3 }, type: Object.fromEntries(typeRuleOf(catalog().company).criteria.map((c) => [c.key, "ESTRATEGICO"])) };
    assert.ok(evaluateInitiative(lider, (mia as { id: string }).id, ev).ok);
    // reiniciar la calificación de una tribu: solo advisor o admin; borra sus calificaciones y deja la sesión sin abrir
    assert.equal((resetPrioSession(lider, "R01") as { status?: number }).status, 403);
    const reinicio = resetPrioSession(advisor, "R01"); assert.ok(reinicio.ok); assert.equal((reinicio as { removed: number }).removed, 1);
    assert.equal(getEvaluations((mia as { id: string }).id).length, 0);
    assert.equal((evaluateInitiative(lider, (mia as { id: string }).id, ev) as { status?: number }).status, 403, "sin sesión abierta no se califica");
    assert.ok(setPrioSession(lider, "R01", "abrir").ok, "la sesión vuelve a abrirse desde cero");
    assert.ok(evaluateInitiative(lider, (mia as { id: string }).id, ev).ok);
    assert.ok(kr(advisor, "MAR-02", "MAR-O1").ok);
    // solo se vincula a un resultado clave completo: con cifra en el nombre, base, meta, dueño, plazo y definición
    assert.ok(upsertKpi(advisor, { code: "MS-09", cmi: "MS-O1", name: "Resultado sin cifra ni meta", unit: "%", ownerId: "R01" }).ok);
    const incompleto = upsertInitiative(lider, { id: (mia as { id: string }).id, name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "MS-O1", ownerId: "R01", horizon: "H1", kpi: "MS-09" }) as { status?: number; error?: string };
    assert.equal(incompleto.status, 422); assert.match(incompleto.error ?? "", /incompleto/);
    assert.ok(removeKpi(advisor, "MS-09").ok);
    // cada resultado clave recibe como máximo dos iniciativas
    const segunda = ini(lider, { ownerId: "R01", kpi: "MS-01" }); assert.ok(segunda.ok, "segunda iniciativa en MS-01");
    const tercera = ini(lider, { ownerId: "R01", kpi: "MS-01" }) as { status?: number; error?: string };
    assert.equal(tercera.status, 422); assert.match(tercera.error ?? "", /máximo 2/);
    assert.ok(upsertInitiative(lider, { id: (segunda as { id: string }).id, name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "MS-O1", ownerId: "R01", horizon: "H1", kpi: "MS-01" }).ok, "editar una ya vinculada no cuenta de nuevo");
    assert.ok(removeInitiative(lider, (segunda as { id: string }).id).ok);
    // el líder vincula únicamente a los resultados clave del OKR de su tribu
    assert.equal((upsertInitiative(lider, { id: (mia as { id: string }).id, name: "Iniciativa de prueba larga", capability: "DIR-1", cmi: "MS-O1", ownerId: "R01", horizon: "H1", kpi: "MAR-02" }) as { status?: number }).status, 403);
    assert.ok(upsertInitiative(gerencia, { id: (ajena as { id: string }).id, name: "Gerencia sí edita cualquier iniciativa", capability: "DIR-1", cmi: "MAR-O1", ownerId: "R02", horizon: "H1", kpi: "MAR-02" }).ok);
    assert.ok(setPrioSession(otro, "R02", "abrir").ok);
    assert.equal((evaluateInitiative(lider, (ajena as { id: string }).id, ev) as { status?: number }).status, 403, "el líder no califica iniciativas de otra tribu");
    assert.equal((decideInitiative(lider, (mia as { id: string }).id, { decision: "IMPLEMENTAR" }) as { status?: number }).status, 403);
    // reglas de calidad: un KR sin definición queda incompleto y uno sin iniciativa es alerta alta
    assert.ok(!okrChecks(catalog(), "H1").some((i) => i.kind === "kr-sin-iniciativa"), "todos los KR tienen iniciativa");
    assert.ok(upsertKpi(advisor, { code: "MS-02", cmi: "MS-O1", name: "Resultado sin definición", unit: "%", baseline: 1, target: 2, ownerId: "R01", due: "2027-T4" }).ok);
    const issues = okrChecks(catalog(), "H1");
    assert.ok(issues.some((i) => i.kind === "kr-sin-iniciativa" && i.ref === "MS-02" && i.level === "alto"), "KR sin iniciativa: alerta alta");
    assert.ok(issues.some((i) => i.kind === "kr-incompleto" && i.ref === "MS-02" && /definición/.test(i.text)), "sin definición ni fórmula el KR está incompleto");
  });
  resetStore();
});

test("convención: el itinerario lo administra el equipo organizador; quien entra por el QR solo lo ve", async () => {
  const { setItinerary, publishItinerary } = await import("../src/server/store");
  const porQr: SessionUser = { email: "q@a.co", name: "Gerencia por QR", role: "LIDER", qr: true };
  const IT = { title: "Convención de prueba", days: [{ id: "d1", title: "Día 1" }], items: [{ id: "d1-01", day: "d1", time: "8:00", minutes: 30, title: "Apertura", kind: "conferencia", who: "Relator", method: "Enmarcar.", materials: [], platform: "Deck" }] };
  resetStore();
  assert.ok((await createCompany(admin, { name: "Itinerario SA", template: "vacia" })).ok);
  assert.ok((await updateCompany(admin, "itinerario-sa", { mode: "convencion", horizons: [{ id: "H1", label: "H1 · 2027", months: 12 }] })).ok);
  await runWithTenant("itinerario-sa", async () => {
    assert.ok(upsertResponsible(advisor, { cargo: "Líder de tribu", dependencia: "Tribu Uno", rolPlataforma: "LIDER" }).ok);
    assert.equal((setItinerary(lider, IT) as { status?: number }).status, 403, "el líder de tribu no modifica el itinerario");
    assert.equal((setItinerary(porQr, IT) as { status?: number }).status, 403, "quien entra por el QR no modifica el itinerario");
    assert.ok(setItinerary(advisor, IT).ok);
    assert.equal((publishItinerary(porQr, true) as { status?: number }).status, 403);
    assert.ok(publishItinerary(advisor, true).ok);
  });
  resetStore();
});

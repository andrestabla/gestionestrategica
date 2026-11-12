// Madurez digital (node:test + tsx): integridad de los dos instrumentos, reglas de
// cálculo, instrumento según el tipo de organización, permisos de captura y publicación.

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithTenant } from "../src/server/tenant";
import { createCompany, updateCompany, resetStore, getMadurez, captureMadurez, respondMadurez, setMadSafeguard, publishMadurez, saveMadInforme, getInforme } from "../src/server/store";
import { INSTRUMENTS, instrumentOf } from "../src/data/madurez";
import { instrumentIssues, P, E, S, gapReading, practiceState, sufficientEvidence, cellOf, overallLevel, generalIndex, aiqOf, progressOf, type Captures } from "../src/lib/madurez";
import { MODULES, moduleOfRoute } from "../src/lib/modulos";
import { faltantesParte, encargoMadInforme, encargoMadLectura, parseMadInforme, parseMadLectura, minimoInforme, minimoLectura, conDato, respuestasValidas } from "../src/lib/madurez-ia";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = { email: "admin@plataforma.example", name: "Admin", role: "ADMIN" };
const advisor: SessionUser = { email: "a@a.co", name: "Advisor", role: "CONSULTOR" };
const directivo: SessionUser = { email: "d@empresa.example", name: "Directiva", role: "DIRECTIVO" };
const lider: SessionUser = { email: "L@empresa.example", name: "Líder", role: "LIDER" };
const cap = (o: Partial<Captures[string]>) => ({ by: "x", at: "2026-11-10T00:00:00.000Z", ...o });

test("madurez: los dos instrumentos están completos y el de empresa no habla de educación", () => {
  assert.deepEqual(instrumentIssues(INSTRUMENTS.empresa), []);
  assert.deepEqual(instrumentIssues(INSTRUMENTS.educativa), []);
  assert.equal(INSTRUMENTS.educativa.variables.length, 52);
  assert.equal(INSTRUMENTS.empresa.variables.length, 48);
  assert.equal(instrumentOf(undefined).kind, "empresa");
  assert.ok(!/instituci[oó]n|universidad|docente|estudiante/i.test(JSON.stringify(INSTRUMENTS.empresa)));
  assert.ok(!/Valledupar|Aguachica|UPC/.test(JSON.stringify(INSTRUMENTS.educativa)));
});

test("madurez: el módulo existe en los tres modos y su ruta se reconoce", () => {
  const m = MODULES.find((x) => x.id === "madurez")!;
  assert.deepEqual([...m.modes].sort(), ["acompanamiento", "completa", "convencion"]);
  assert.equal(moduleOfRoute("/panel/madurez/captura", null, "acompanamiento"), "madurez");
});

test("madurez: reglas de cálculo sobre una captura", () => {
  const c = cap({ perception: 5, d: 4, i: 2, k: 0, level: 2, target: 4 });
  assert.equal(P(c), 100);
  assert.equal(E(c), 0.25 * 100 + 0.35 * 50);
  assert.equal(S(c), 0.4 * 100 + 0.6 * 42.5);
  assert.equal(gapReading(c), "SOBREESTIMACION");
  assert.equal(practiceState(c), "ADOPCION");
  assert.equal(practiceState(cap({ d: 0, i: 0, k: 0 })), "AUSENTE");
  assert.equal(practiceState(cap({ d: 3, i: 3, k: 3 })), "IMPACTO");
  assert.ok(!sufficientEvidence(c) && sufficientEvidence(cap({ d: 2, i: 2, k: 1 })));
  assert.equal(S(cap({ perception: 3 })), null);   // sin evidencia no hay puntuación verificada
  const ins = INSTRUMENTS.empresa, celda = ins.variables.filter((v) => v.line === 1 && v.dimension === "organizacional");
  const caps: Captures = { [celda[0].id]: cap({ level: 2, target: 4 }), [celda[1].id]: cap({ level: 4 }) };
  assert.deepEqual(cellOf(ins, caps, 1, "organizacional"), { value: 3, target: 4, n: celda.length, graded: 2 });
  assert.equal(overallLevel(ins, caps), 3);
  assert.equal(generalIndex(ins, caps), null);
  assert.equal(overallLevel(ins, {}), null);
  assert.equal(progressOf(ins, caps).level, 2);
  const ai = ins.aiq[0].variableIds[0], sg = ins.safeguards.find((s) => s.cap !== null)!;
  const conIa: Captures = { [ai]: cap({ perception: 5, d: 4, i: 4, k: 4 }) };
  assert.equal(aiqOf(ins, conIa, {}).capped, 100);
  const tope = aiqOf(ins, conIa, { [sg.id]: { status: "FALLA" } });
  assert.ok(tope.capApplied && tope.capped === sg.cap);
});

test("madurez: nace vacía, la percepción la responde cada persona, la calificación es del advisor y el corte exige todas las variables", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Digital SA", template: "vacia" })).ok);
  await runWithTenant("digital-sa", async () => {
    const ini = getMadurez(directivo);
    assert.equal(ini.kind, "empresa");
    assert.deepEqual([Object.keys(ini.vars).length, ini.cuts.length, ini.progress.level, ini.puede.calificar], [0, 0, 0, false]);
    const ins = instrumentOf("empresa"), v0 = ins.variables[0].id;
    // la percepción es de cada persona: se responde por afirmación y la variable lleva el promedio
    assert.ok(respondMadurez(directivo, v0, 4).ok);
    assert.ok(respondMadurez(lider, v0, 5).ok);
    assert.ok(respondMadurez(lider, ins.variables[1].id, 0).ok);            // «No lo sé» cuenta como respondida, no entra al promedio
    const noAdvisor = respondMadurez(advisor, v0, 3);
    assert.ok(!noAdvisor.ok && noAdvisor.status === 403);
    const invalida = respondMadurez(directivo, v0, 6);
    assert.ok(!invalida.ok && invalida.status === 422);
    assert.ok(!respondMadurez(directivo, "NO-EXISTE", 3).ok);
    const tras = getMadurez(lider);
    assert.deepEqual([tras.vars[v0].perception, tras.vars[v0].perceptionN, tras.vars[ins.variables[1].id]], [4.5, 2, undefined]);
    assert.deepEqual([tras.mia.answers, tras.mia.done, tras.participacion.personas, tras.participacion.completas, "lista" in tras.participacion], [{ [v0]: 5, [ins.variables[1].id]: 0 }, null, 2, 0, false]);
    assert.deepEqual(getMadurez(advisor).participacion.lista?.map((r) => [r.name, r.respondidas]), [["Líder", 2], ["Directiva", 1]]);
    assert.ok(respondMadurez(directivo, v0, null).ok);                      // borra su respuesta
    assert.equal(getMadurez(directivo).vars[v0].perception, 5);
    assert.ok(respondMadurez(directivo, v0, 4).ok);
    for (const sinPermiso of [captureMadurez(directivo, v0, { level: 3 }), captureMadurez(directivo, v0, { perception: 2 })]) assert.ok(!sinPermiso.ok && sinPermiso.status === 403);
    const fuera = captureMadurez(advisor, v0, { level: 6 });
    assert.ok(!fuera.ok && fuera.status === 422);
    assert.ok(!captureMadurez(advisor, "NO-EXISTE", { level: 3 }).ok);
    const ok = captureMadurez(advisor, v0, { d: 3, i: 2, k: 1, level: 3, target: 4, hallazgo: "  Hay política sin despliegue.  " });
    assert.ok(ok.ok && ok.capture.perception === 4.5 && ok.capture.hallazgo === "Hay política sin despliegue.");
    const borra = captureMadurez(advisor, v0, { hallazgo: "", target: null });
    assert.ok(borra.ok && borra.capture.hallazgo === undefined && borra.capture.target === undefined);
    assert.ok(!setMadSafeguard(directivo, "SG-1", "FALLA", "").ok);
    assert.ok(setMadSafeguard(advisor, "SG-1", "FALLA", "Sin inventario").ok);
    const parcial = publishMadurez(advisor, "Línea base");
    assert.ok(!parcial.ok && parcial.status === 422);
    assert.ok(!publishMadurez(directivo, "x").ok);
    for (const v of ins.variables) assert.ok(captureMadurez(advisor, v.id, { level: 3 }).ok);
    const pub = publishMadurez(advisor, "Línea base");
    assert.ok(pub.ok && pub.cut.label === "Línea base" && Object.keys(pub.cut.vars).length === ins.variables.length && pub.cut.safeguards["SG-1"].status === "FALLA");
    // el corte no cambia aunque la captura siga
    assert.ok(captureMadurez(advisor, v0, { level: 5 }).ok);
    // quien responde todas las afirmaciones queda con el diagnóstico completo
    for (const v of ins.variables) assert.ok(respondMadurez(directivo, v.id, 3).ok);
    const completo = getMadurez(directivo);
    assert.ok(completo.mia.done && completo.participacion.completas === 1);
    const fin = getMadurez(advisor);
    assert.deepEqual([fin.cuts[0].vars[v0].perception, fin.cuts[0].vars[v0].perceptionN, fin.vars[v0].perception], [4.5, 2, 4]);
    assert.equal(fin.cuts[0].vars[v0].level, 3);
    assert.equal(fin.vars[v0].level, 5);
    assert.ok(fin.puede.calificar);
  });
});

test("madurez: una institución educativa usa el instrumento original", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Instituto Uno", template: "vacia", orgKind: "educativa" })).ok);
  await runWithTenant("instituto-uno", async () => {
    const m = getMadurez(advisor);
    assert.equal(m.kind, "educativa");
    assert.equal(m.progress.total, 52);
    assert.ok(captureMadurez(advisor, "AV-ORG-1", { perception: 2 }).ok);
    assert.ok(!captureMadurez(advisor, instrumentOf("empresa").variables[0].id, { perception: 2 }).ok);
  });
  // al cambiar el tipo, la captura del otro instrumento deja de mostrarse
  assert.ok((await updateCompany(admin, "instituto-uno", { orgKind: "empresa" })).ok);
  await runWithTenant("instituto-uno", async () => {
    const m = getMadurez(advisor);
    assert.deepEqual([m.kind, m.progress.total, Object.keys(m.vars).length], ["empresa", 48, 0]);
  });
});

test("madurez con IA: el encargo lleva las cifras de la medición y la respuesta del modelo se valida", () => {
  const ins = INSTRUMENTS.empresa, [a, b, c] = ins.variables;
  const caps: Captures = {
    [a.id]: cap({ perception: 4.5, perceptionN: 2, d: 1, i: 1, k: 0, level: 2, target: 4, hallazgo: "La estrategia existe solo en una presentación." }),
    [b.id]: cap({ perception: 2, perceptionN: 1, d: 3, i: 3, k: 3, level: 4 }),
    [c.id]: cap({ perception: 3, perceptionN: 1 }),
  };
  assert.deepEqual([minimoInforme(ins), minimoLectura(ins), conDato(ins, caps)], [12, 24, 3]);
  const sg = { [ins.safeguards[0].id]: { status: "FALLA" as const } };
  const e = encargoMadInforme({ empresa: { name: "Digital SA", sector: "Comercio" }, contexto: "CONTEXTO DE PRUEBA", ins, caps, sg, medicion: { etiqueta: "Línea base", fecha: "10 de noviembre de 2026", publicada: false }, participacion: { personas: 2, completas: 1 }, previo: null });
  for (const trozo of ["Digital SA · Comercio", "CONTEXTO DE PRUEBA", "captura en curso: cifras provisionales", `${a.id} · ${a.name}`, "percepción 4,5 de 5 (2 resp.)", "brecha P−E +", "hallazgo «La estrategia existe solo en una presentación.»", `hoy «${a.rubric[1]}»`, `nivel siguiente «${a.rubric[2]}»`, "MEDICIÓN PARCIAL", "Falla", "No hay corte anterior", '"prioridades"'])
    assert.ok(e.partes.map((p) => p.user).join("\n").includes(trozo), `falta en el encargo: ${trozo}`);
  // el informe se pide en cuatro partes sobre los mismos datos: panorama, líneas, industria y plan
  assert.deepEqual(e.partes.map((p) => p.id), ["panorama", "lineas", "industria", "plan"]);
  assert.ok(e.partes.every((p) => p.user.includes("Digital SA · Comercio")), "todas las partes llevan los datos de la medición");
  const parte = (id: string) => e.partes.find((p) => p.id === id)!.user;
  assert.ok(parte("panorama").includes('"patrones"') && !parte("panorama").includes('"comparacion"') && parte("industria").includes('"comparacion"') && parte("plan").includes('"escenarios"'));
  assert.ok(parte("industria").includes("no hay una base de hechos cargada"));
  const conHechos = encargoMadInforme({ empresa: { name: "Digital SA" }, ins, caps, sg, medicion: { etiqueta: "x", fecha: "x", publicada: true }, participacion: { personas: 1, completas: 1 }, hechos: [{ n: 1, hecho: "El 40 % de las empresas usa analítica.", editor: "Gremio", fecha: "2026" }], prioridades: [{ nombre: "Excelencia comercial", desc: "crecer" }] });
  const plan = conHechos.partes.find((p) => p.id === "plan")!.user;
  assert.ok(plan.includes("[1] El 40 % de las empresas usa analítica. (Gremio, 2026)") && plan.includes("1. Excelencia comercial — crecer"));
  // una parte corta se detecta para volver a pedirla; una completa pasa
  const ctx = { lineas: 4, dimensiones: 4, prioridades: 7, hechos: 10 };
  const largo = (n: number) => Array.from({ length: n }, () => "palabra").join(" ");
  const corta = faltantesParte("plan", { estrategia: [{}, {}], prioridades: [{ primer_paso: "x", por_que_ahora: "y" }], ruta: [{}, {}, {}], indicadores: [], preguntas: [], escenarios: {} }, ctx);
  assert.ok(corta.some((x) => x.includes("«estrategia» trae 2 elementos y debe traer 7")) && corta.some((x) => x.includes("«prioridades» trae 1")));
  assert.deepEqual(faltantesParte("plan", { estrategia: Array(7).fill({}), prioridades: Array(8).fill({ primer_paso: largo(25), por_que_ahora: largo(30) }), ruta: [{}, {}, {}], indicadores: Array(6).fill({}), preguntas: Array(8).fill("¿?"), escenarios: { si_no_se_actua: largo(70), si_se_ejecuta: largo(70) } }, ctx), []);
  assert.ok(faltantesParte("panorama", { resumen: ["corto"] }, ctx).length >= 4);
  assert.ok(e.system.includes("no inventes cifras") && e.system.includes("empresas medianas"));
  assert.ok(encargoMadInforme({ empresa: { name: "Instituto" }, ins: INSTRUMENTS.educativa, caps: {}, sg: {}, medicion: { etiqueta: "x", fecha: "x", publicada: true }, participacion: { personas: 0, completas: 0 } }).system.includes("instituciones de educación superior"));

  const answers = Object.fromEntries(ins.variables.map((v, k) => [v.id, k % 6]));   // 0 = «No lo sé»
  assert.equal(respuestasValidas(ins, answers), 40);
  const l = encargoMadLectura({ empresa: { name: "Digital SA" }, ins, answers, persona: { nombre: "Laura", rol: "líder" }, fecha: "hoy" });
  for (const trozo of ["Laura (líder)", "40 valoradas, 8 «No lo sé», 0 sin responder, de 48", "→ No lo sé", "→ 5 (Totalmente de acuerdo)", '"puntos_ciegos"']) assert.ok(l.user.includes(trozo), `falta en el encargo: ${trozo}`);
  assert.ok(l.system.includes("no es una evaluación de la persona"));

  const informe = parseMadInforme({ titulo: "  Mucha percepción, poca evidencia ", resumen: "Uno.\n\nDos.", lineas: [{ linea: "L1 · Clientes", lectura: "x" }, { lectura: "sin línea" }], prioridades: [{ orden: "2", variable: "B", primer_paso: "b" }, { orden: 1, variable: "A", primer_paso: "a" }], preguntas: ["¿Quién responde?", ""], ruta: [{ horizonte: "0 a 90 días", foco: "f" }] });
  assert.deepEqual([informe.titulo, informe.resumen, informe.lineas.length, informe.prioridades.map((p) => p.variable), informe.preguntas, informe.fortalezas, informe.hipotesis_central], ["Mucha percepción, poca evidencia", ["Uno.", "Dos."], 1, ["A", "B"], ["¿Quién responde?"], [], undefined]);
  assert.throws(() => parseMadInforme({ titulo: "x", resumen: [] }), /incompleto/);
  const lectura = parseMadLectura({ resumen: ["a"], lineas: [{ linea: "L1", lectura: "x" }], alertas: [{ afirmacion: "Datos", lectura: "y" }, { lectura: "z" }], puntos_ciegos: "" });
  assert.deepEqual([lectura.titulo, lectura.alertas.length, lectura.confianza, lectura.puntos_ciegos], ["Tu lectura", 1, [], undefined]);
  assert.throws(() => parseMadLectura({}), /incompleta/);
});

test("madurez con IA: la lectura personal la guarda su dueño y el informe de resultados, el advisor", async () => {
  resetStore();
  assert.ok((await createCompany(admin, { name: "Informe SA", template: "vacia" })).ok);
  await runWithTenant("informe-sa", async () => {
    const ajeno = saveMadInforme(directivo, "madurez-persona", "l@empresa.example", "h", { titulo: "x" });
    assert.ok(!ajeno.ok && ajeno.status === 403);
    assert.ok(saveMadInforme(lider, "madurez-persona", "l@empresa.example", "h1", { titulo: "Mi lectura" }).ok);   // la clave es el correo en minúsculas
    const sinPermiso = saveMadInforme(directivo, "madurez", "curso", "h", { titulo: "x" });
    assert.ok(!sinPermiso.ok && sinPermiso.status === 403);
    assert.ok(saveMadInforme(advisor, "madurez", "curso", "h2", { titulo: "Informe" }).ok);
    assert.deepEqual([getInforme("madurez-persona", "l@empresa.example")?.inputHash, getInforme("madurez", "curso")?.inputHash, getInforme("madurez", "C1")], ["h1", "h2", null]);
  });
});

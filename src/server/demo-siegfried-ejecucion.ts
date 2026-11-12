// Capa de ejecución de la instancia «DEMO SIEGFRIED»: lo que pasa después del método, a la fecha fija de la demo.
// Directorio de personas, plan de trabajo de los proyectos decididos (con su historia: inicios, cierres con
// evidencia, bloqueos y fechas corridas), riesgos, presupuesto, mediciones del primer trimestre, avance de las
// iniciativas, cierre del trimestre en la cascada y la medición de madurez digital con su corte publicado.
//
// Todo pasa por las funciones del store, con el reloj fijado en la fecha que cada registro representa: así la
// auditoría —de donde el tablero de impacto lee los movimientos— cuenta la historia en su orden. Las escrituras
// sobre un mismo registro se hacen por rondas, vaciando la cola entre una y otra, para que lleguen a la base en orden.

import { DEMO_HOY, PERSONAS, PLANES, ESTADO_TAREA, RIESGOS, GASTOS, AVANCE_KR_T1, AVANCE_KR_POR_DEFECTO, NOTAS_KR_T1, AVANCE_INICIATIVAS, CIERRES_T1, MADUREZ_PERFIL, MADUREZ_SESGO, MADUREZ_SALVAGUARDAS, MADUREZ_CORTE, type TareaDemo } from "@/data/demo-siegfried/ejecucion";
import { DEMO_SLUG, DEMO_NAME, KRS, EVALUADORES, F1_DIRECTIVOS } from "@/data/demo-siegfried/contenido";
import { upsertPerson, createTask, updateTask, attachEvidence, verifyUploadedEvidence, upsertRisk, addGasto, reportKpi, updateInitiative, getMetas, upsertMeta, cerrarMeta, respondMadurezLote, captureMadurez, setMadSafeguard, publishMadurez, flushOrError, catalog } from "@/server/store";
import { fijarReloj } from "@/server/tenant";
import { putObject } from "@/server/storage";
import { sumarDias } from "@/lib/ruta-critica";
import { instrumentOf } from "@/data/madurez";
import type { SessionUser } from "@/lib/session";

type R = { ok: boolean; error?: string };
const demoUser = (u: { email: string; name: string; role: SessionUser["role"] }): SessionUser => ({ ...u, company: { slug: DEMO_SLUG, name: DEMO_NAME } } as SessionUser);
const pid = (n: number) => `P${String(n).padStart(2, "0")}`;
const correo = (name: string) => `${name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@demo-siegfried.demo`;
const persona = (n: number): SessionUser => demoUser({ email: correo(PERSONAS[n - 1].name), name: PERSONAS[n - 1].name, role: "LIDER" });
const min = (a: string, b: string) => (a < b ? a : b);
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** PDF mínimo de una página (Helvetica, texto en Latin-1) para las evidencias de ejemplo. */
export function pdfSimple(titulo: string, lineas: string[]): Buffer {
  const esc = (s: string) => s.replace(/[^\x20-\xff]/g, "-").replace(/([\\()])/g, "\\$1");
  const partir = (s: string, n = 88) => { const out: string[] = []; let l = ""; for (const w of s.split(/\s+/)) { if ((l + " " + w).trim().length > n) { out.push(l); l = w; } else l = (l + " " + w).trim(); } if (l) out.push(l); return out; };
  const cuerpo = lineas.flatMap((l) => (l ? partir(l) : [""]));
  const texto = ["BT", "/F2 16 Tf", "56 730 Td", ...partir(titulo, 60).flatMap((l, i) => [i ? "0 -20 Td" : "", `(${esc(l)}) Tj`]), "/F1 10.5 Tf", "0 -30 Td", ...cuerpo.flatMap((l) => [`(${esc(l)}) Tj`, "0 -15 Td"]), "ET"].filter(Boolean).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`,
  ];
  let out = "%PDF-1.4\n"; const off: number[] = [];
  objs.forEach((o, i) => { off.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Siembra la capa de ejecución. Se llama dentro del contexto de la empresa demo. `archivos`: escribe el PDF de cada evidencia. */
export async function sembrarEjecucion(avisos: string[], opts: { archivos?: boolean } = {}): Promise<Record<string, number>> {
  const check = (what: string, r: R) => { if (!r.ok) avisos.push(`${what}: ${r.error ?? "falló"}`); return r.ok; };
  const vaciar = async () => { const e = await flushOrError(); if (e && !avisos.includes(`escritura en la base: ${e}`)) avisos.push(`escritura en la base: ${e}`); };
  const usados = new Map<string, number>();
  /** Fija el reloj en el día dado, a una hora hábil de Bogotá, avanzando un par de minutos por cada registro de ese día. */
  const reloj = (dia: string) => { const n = usados.get(dia) ?? 0; usados.set(dia, n + 1); const m = n * 3; fijarReloj(`${dia}T${String(14 + Math.floor(m / 60) % 9).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00.000Z`); };
  const advisor = demoUser(EVALUADORES[2]);
  const c = catalog();
  const nombreIni = (id: string) => c.initiatives.find((i) => i.id === id)?.name ?? id;

  // 1. directorio de personas
  reloj("2026-12-07");
  for (const [n, p] of PERSONAS.entries()) check(`persona ${p.name}`, upsertPerson(advisor, { id: pid(n + 1), ...p, email: correo(p.name) }));

  // 2. plan de trabajo: cada proyecto carga su plan unos días antes de empezar; después, la historia de cada tarea
  type Op = { dia: string; run: () => R | Promise<R>; what: string };
  const historias: Op[][] = [];
  const idTarea: Record<string, string[]> = {};
  const evidencia: Record<string, string> = {};
  const archivos: Promise<void>[] = [];
  let tareas = 0, evidencias = 0;
  for (const [ini, plan] of Object.entries(PLANES).sort((a, b) => a[1][0].ini.localeCompare(b[1][0].ini))) {
    const lider = persona(plan[0].quien);
    reloj(sumarDias(plan.reduce((a, t) => min(a, t.ini), plan[0].ini), -5));
    idTarea[ini] = [];
    for (const [n, t] of plan.entries()) {
      const r = createTask(lider, { iniId: ini, title: t.t, desc: t.d, assigneeId: pid(t.quien), coAssigneeIds: (t.con ?? []).map(pid), start: t.ini, due: t.corre ? sumarDias(t.fin, -t.corre) : t.fin,
        dependsOn: (t.dep ?? []).map((d) => idTarea[ini][d - 1]), requiresEvidence: Boolean(t.ent), milestone: Boolean(t.hito) });
      if (!check(`tarea ${ini} ${n + 1}`, r) || !r.ok) { idTarea[ini].push(""); continue; }
      const id = r.task.id; idTarea[ini].push(id); tareas++;
      historias.push(historiaDe(ini, id, t));
    }
  }
  function historiaDe(ini: string, id: string, t: TareaDemo): Op[] {
    const quien = persona(t.quien), ops: Op[] = [];
    if (t.est === "P") return ops;
    const tope = min(t.fin, DEMO_HOY);
    ops.push({ dia: t.ini, what: `${id} inicia`, run: () => updateTask(quien, id, { status: "EN_CURSO" }) });
    if (t.corre) ops.push({ dia: min(sumarDias(t.fin, -t.corre - 4), sumarDias(DEMO_HOY, -5)), what: `${id} corre su fecha`, run: () => updateTask(quien, id, { due: t.fin, ...(t.nota && t.est !== "B" ? { note: t.nota } : {}) }) });
    else if (t.nota && t.est !== "B") ops.push({ dia: sumarDias(tope, -6), what: `${id} nota`, run: () => updateTask(quien, id, { note: t.nota }) });
    if (t.est === "H" || t.est === "R") {
      const cierre = t.est === "H" ? t.fin : min(t.fin, sumarDias(DEMO_HOY, -4));
      const titulo = t.soporte ?? `Entregable para revisión: ${t.t}`;
      ops.push({ dia: sumarDias(cierre, -1), what: `${id} evidencia`, run: () => {
        const clave = `${DEMO_SLUG}/${id}.pdf`;
        const pdf = pdfSimple(titulo, [`Proyecto: ${nombreIni(ini)}`, `Actividad ${id}: ${t.t}`, `Responsable: ${PERSONAS[t.quien - 1].name} · ${PERSONAS[t.quien - 1].cargo}`, `Fecha: ${sumarDias(cierre, -1)}`, "", t.d, "", "Documento de ejemplo de la instancia de demostración. Su contenido es ficticio."]);
        const r = attachEvidence(quien, id, { fileName: `${titulo.replace(/[^A-Za-z0-9áéíóúñÁÉÍÓÚÑ ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60)}.pdf`, filePath: clave, size: pdf.length, mime: "application/pdf" }, { title: titulo, kind: t.ent ? "Entregable" : "Documento" });
        if (r.ok) { evidencia[id] = r.evidence.id; evidencias++; if (opts.archivos) archivos.push(putObject("uploads", clave, pdf, "application/pdf")); }
        return r;
      } });
      ops.push({ dia: cierre, what: `${id} ${t.est === "H" ? "se cierra" : "a revisión"}`, run: () => updateTask(quien, id, { status: ESTADO_TAREA[t.est] }) });
      if (t.est === "H" && t.fin <= sumarDias(DEMO_HOY, -25))   // las más recientes siguen por verificar
        ops.push({ dia: sumarDias(t.fin, 3), what: `${id} verificación`, run: () => (evidencia[id] ? verifyUploadedEvidence(advisor, evidencia[id]) : { ok: true }) });
    }
    if (t.est === "B") ops.push({ dia: sumarDias(tope, -12), what: `${id} se bloquea`, run: () => updateTask(quien, id, { status: "BLOQUEADA", blockNote: t.nota ?? "Bloqueada por una dependencia externa." }) });
    return ops;
  }
  await vaciar();
  for (let ronda = 0; historias.some((h) => h.length > ronda); ronda++) {
    for (const op of historias.map((h) => h[ronda]).filter(Boolean).sort((a, b) => a.dia.localeCompare(b.dia))) { reloj(op.dia); check(op.what, await op.run()); }
    await vaciar();
  }
  try { await Promise.all(archivos); } catch (e) { avisos.push(`archivos de evidencia: ${(e as Error).message}`); }

  // 3. riesgos: nacen abiertos y después pasan a su estado actual (en mitigación, materializado o cerrado)
  const idRiesgo: string[] = [];
  for (const r of [...RIESGOS.entries()].sort((a, b) => a[1].alta.localeCompare(b[1].alta))) {
    const [n, x] = r; reloj(x.alta);
    const res = upsertRisk(persona(x.quien ?? PLANES[x.ini][0].quien), { iniId: x.ini, title: x.title, desc: x.desc, category: x.cat, probability: x.p, impact: x.i, status: "ABIERTO", ownerId: x.quien ? pid(x.quien) : undefined, due: x.fecha });
    if (check(`riesgo ${x.ini} ${n + 1}`, res) && res.ok) idRiesgo[n] = res.risk.id;
  }
  await vaciar();
  for (const [n, x] of [...RIESGOS.entries()].filter(([, x]) => x.st !== "ABIERTO").sort((a, b) => (a[1].cambio ?? "").localeCompare(b[1].cambio ?? ""))) {
    reloj(x.cambio ?? sumarDias(DEMO_HOY, -7));
    if (idRiesgo[n]) check(`riesgo ${x.ini} ${n + 1} → ${x.st}`, upsertRisk(persona(x.quien ?? PLANES[x.ini][0].quien), { id: idRiesgo[n], status: x.st, mitigation: x.resp }));
  }

  // 4. presupuesto: compromisos y ejecuciones en su fecha
  let gastos = 0;
  for (const g of [...GASTOS].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    reloj(g.fecha);
    if (check(`gasto ${g.ini} · ${g.concepto}`, addGasto(persona(PLANES[g.ini]?.[0].quien ?? 6), { iniId: g.ini, tipo: g.tipo, concepto: g.concepto, monto: g.millones * 1_000_000, fecha: g.fecha, soporte: g.soporte }))) gastos++;
  }

  // 5. mediciones del primer trimestre de los resultados clave (la línea base ya está en la serie)
  let mediciones = 0;
  const dueno = (areaId: string) => { const n = PERSONAS.findIndex((p) => p.responsibleId === areaId); return persona(n >= 0 ? n + 1 : 1); };
  for (const [n, k] of KRS.entries()) {
    const tramo = k.target - k.baseline, f = k.goodDirection === "keep" ? 0 : (AVANCE_KR_T1[k.code] ?? AVANCE_KR_POR_DEFECTO);
    const dec = k.unit === "número" || (Number.isInteger(k.baseline) && Number.isInteger(k.target) && Math.abs(tramo) >= 10) ? 0 : Math.abs(tramo) < 1 ? 2 : 1;
    const valor = Math.max(0, Math.round((k.baseline + tramo * f) * 10 ** dec) / 10 ** dec);
    reloj(sumarDias("2027-04-08", n % 6));
    if (check(`medición ${k.code}`, reportKpi(dueno(k.ownerId), k.code, "2027-T1", valor, NOTAS_KR_T1[k.code]))) mediciones++;
  }

  // 6. avance y estado de las iniciativas en ejecución, con su entrada de bitácora
  for (const [id, a] of Object.entries(AVANCE_INICIATIVAS)) {
    reloj(sumarDias(DEMO_HOY, -3));
    check(`avance ${id}`, updateInitiative(persona(PLANES[id]?.[0].quien ?? 1), id, { progress: a.progress, status: a.status, ...(a.log ? { log: a.log } : {}) }));
  }

  // 7. cascada: se cierra el primer trimestre (cumplimiento y aprendizaje) y el segundo queda en curso
  await vaciar();
  let cierres = 0;
  for (const m of getMetas()) {
    if (m.quarter === "2027-T2") { reloj("2027-04-12"); check(`meta ${m.initiative} ${m.quarter} en curso`, upsertMeta(advisor, { ...m, estado: "EN_CURSO" })); continue; }
    const cierre = CIERRES_T1[`${m.initiative}|${m.areaId}`]; if (m.quarter !== "2027-T1" || !cierre) continue;
    reloj("2027-04-09");
    if (check(`cierre ${m.initiative} ${m.areaId}`, cerrarMeta(dueno(m.areaId), m.id, { cumplimiento: cierre.c, aprendizaje: cierre.a }))) cierres++;
  }

  // 8. madurez digital: percepción de los diez directivos, evidencia y nivel del advisor, salvaguardas y corte publicado
  const ins = instrumentOf("empresa"), azar = rng(20270417);
  const linea = (id: string) => id.split("-")[0];
  const nivel: Record<string, number> = {};
  for (const v of ins.variables) nivel[v.id] = clamp((MADUREZ_PERFIL[linea(v.id)]?.[v.dimension] ?? 2) + (azar() < 0.22 ? 1 : azar() < 0.2 ? -1 : 0), 1, 5);
  let percepciones = 0;
  for (const [n, d] of F1_DIRECTIVOS.entries()) {
    const r: Record<string, number> = {};
    for (const [i, v] of ins.variables.entries()) {
      if (n === F1_DIRECTIVOS.length - 1 && i >= 31) break;   // una persona dejó el diagnóstico a medias
      const tecnica = v.dimension === "tecnologica" || v.dimension === "datos";
      r[v.id] = azar() < (tecnica && n !== 6 ? 0.09 : 0.02) ? 0 : clamp(Math.round(nivel[v.id] + (MADUREZ_SESGO[linea(v.id)] ?? 0) + (azar() - 0.5) * 1.8 + ((n % 3) - 1) * 0.25), 1, 5);
    }
    reloj(sumarDias("2027-03-15", n));
    if (check(`percepción ${d.email}`, respondMadurezLote(demoUser({ email: d.email, name: d.name, role: "DIRECTIVO" }), r))) percepciones++;
  }
  const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  for (const [i, v] of ins.variables.entries()) {
    const L = nivel[v.id];
    const d = clamp(L - 1 + (azar() < 0.4 ? 1 : 0), 0, 4), ii = clamp(L - 1 - (azar() < 0.3 ? 1 : 0), 0, 4), k = clamp(L - 2 + (azar() < 0.3 ? 1 : 0), 0, 4);
    const doc = v.evidence.find((e) => e.component === "D")?.what, uso = v.evidence.find((e) => e.component === "I")?.what;
    reloj(sumarDias("2027-04-05", Math.floor(i / 6)));
    check(`madurez ${v.id}`, captureMadurez(advisor, v.id, { d, i: ii, k, level: L, target: Math.min(5, L + (L <= 2 ? 2 : 1)),
      hallazgo: `${v.rubric[L - 1]}${doc ? ` Se revisó: ${minus(doc)}${ii <= 1 && uso ? `; no se encontró ${minus(uso)}` : ""}.` : ""}`,
      recomendacion: L < 5 ? `Para subir al nivel ${L + 1}: ${minus(v.rubric[L])}` : "Sostener la práctica y revisarla cada ciclo con los datos de resultado." }));
  }
  const notasSg = ["Hay inventario de los sistemas en uso, pero dos no tienen responsable designado.", "", "No se hace evaluación de privacidad antes de iniciar tratamientos de datos de pacientes y médicos.", "Un incidente menor de 2026 se gestionó sin registro formal.", ""];
  for (const [n, s] of ins.safeguards.entries()) { reloj("2027-04-15"); check(`salvaguarda ${s.id}`, setMadSafeguard(advisor, s.id, MADUREZ_SALVAGUARDAS[n] ?? "PARCIAL", notasSg[n] ?? "")); }
  reloj("2027-04-19");
  check("corte de madurez digital", publishMadurez(advisor, MADUREZ_CORTE));

  fijarReloj(null);
  await vaciar();
  return { personas: PERSONAS.length, tareas, evidencias, riesgos: idRiesgo.filter(Boolean).length, movimientosPresupuesto: gastos, mediciones, cierresTrimestre: cierres, percepcionesMadurez: percepciones, variablesMadurez: ins.variables.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Capacidades para ejecutar (marco 4Shine Empresas): con el portafolio decidido, cada iniciativa se recorre con
// un checklist de cinco frentes para reconocer si la capacidad de ejecutarla está instalada o qué haría falta:
// unidad (quién la ejecuta), proceso (el flujo que la soporta), procedimiento (cómo se hace, documentado y en
// uso), conocimiento (la gente sabe hacerlo) y tecnología (sistemas, datos y herramientas). Cada frente tiene
// dos o tres afirmaciones; cada una se califica en tres niveles con su descripción, para calificar con criterio.
// La lectura por frente es el nivel más bajo de sus afirmaciones (lo que falta frena todo el frente) y el
// semáforo de la iniciativa sale de los cinco frentes.
// ─────────────────────────────────────────────────────────────────────────────

export type FrenteKey = "unidad" | "proceso" | "procedimiento" | "conocimiento" | "tecnologia";
export type NivelCap = 1 | 2 | 3;
export const NIVEL_CAP: Record<NivelCap, string> = { 1: "No existe", 2: "Parcial", 3: "Instalada" };

export type ItemCap = { code: string; texto: string; pregunta: string; niveles: Record<NivelCap, string> };
export type Frente = { key: FrenteKey; name: string; que: string; items: ItemCap[] };

export const FRENTES: Frente[] = [
  { key: "unidad", name: "Unidad", que: "Quién ejecuta la iniciativa: un equipo o área con dueño, autoridad y dedicación real.", items: [
    { code: "U1", texto: "Hay un responsable con autoridad sobre la iniciativa y su presupuesto.", pregunta: "¿Quién responde por la iniciativa y puede decidir sobre recursos y prioridades sin escalar cada paso?",
      niveles: { 1: "No hay responsable nombrado o no tiene autoridad sobre el presupuesto.", 2: "Hay responsable, pero decide escalando o comparte la autoridad con otra área.", 3: "Responsable nombrado, con autoridad sobre presupuesto y prioridades de la iniciativa." } },
    { code: "U2", texto: "El equipo que la ejecuta existe y tiene dedicación asignada.", pregunta: "¿Hay personas con horas o dedicación reservadas para esta iniciativa, además de su trabajo habitual?",
      niveles: { 1: "No hay equipo; se haría «cuando se pueda» sobre la carga actual.", 2: "Hay personas identificadas, pero sin dedicación reservada o con roles por cubrir.", 3: "Equipo conformado, con roles y dedicación asignada desde el inicio." } },
    { code: "U3", texto: "La unidad tiene la capacidad de coordinar a las otras áreas que la iniciativa necesita.", pregunta: "¿Las áreas de las que depende reconocen a esta unidad y tienen acordado qué entregan y cuándo?",
      niveles: { 1: "Las dependencias con otras áreas no están identificadas ni acordadas.", 2: "Identificadas, pero sin acuerdo formal de entregas o con conflictos de prioridad.", 3: "Dependencias acordadas con cada área, con responsable y fecha." } },
  ] },
  { key: "proceso", name: "Proceso", que: "El flujo de trabajo que la iniciativa necesita o modifica: entradas, actividades, salidas y controles.", items: [
    { code: "P1", texto: "El proceso que soporta la iniciativa está definido, con entradas, salidas y dueño.", pregunta: "¿Se puede dibujar hoy el proceso de punta a punta y decir quién es su dueño?",
      niveles: { 1: "No hay proceso definido; cada quien lo hace a su manera.", 2: "Existe de hecho, pero sin dueño claro o con tramos sin definir.", 3: "Proceso definido de punta a punta, con dueño, entradas, salidas y controles." } },
    { code: "P2", texto: "El proceso se mide: tiene indicadores de operación y se revisan.", pregunta: "¿Hay datos de volumen, tiempo, costo o calidad del proceso que alguien mire con una frecuencia fija?",
      niveles: { 1: "No se mide.", 2: "Se mide a veces o solo cuando hay un problema.", 3: "Indicadores definidos, con dato periódico y revisión fija." } },
    { code: "P3", texto: "El proceso soporta el volumen o la cobertura que la iniciativa exige.", pregunta: "Si la iniciativa duplica el volumen o cambia el alcance, ¿el proceso aguanta sin rehacerse?",
      niveles: { 1: "Habría que rediseñarlo o hoy ya está saturado.", 2: "Aguanta con ajustes conocidos y acotados.", 3: "Tiene holgura o escala sin cambios de fondo." } },
  ] },
  { key: "procedimiento", name: "Procedimiento", que: "Cómo se hace cada paso: documentado, aprobado y en uso, con roles y criterios de aceptación.", items: [
    { code: "R1", texto: "Los pasos críticos están documentados y aprobados.", pregunta: "¿Existe un documento vigente que diga cómo se hace, quién lo hace y qué se acepta?",
      niveles: { 1: "No hay documentación o está obsoleta.", 2: "Documentación parcial o sin aprobar; depende de la memoria de algunas personas.", 3: "Procedimientos vigentes, aprobados y con control de versiones." } },
    { code: "R2", texto: "Los procedimientos se cumplen en la práctica y se auditan.", pregunta: "¿Lo que dice el documento es lo que ocurre en el puesto de trabajo, y alguien lo verifica?",
      niveles: { 1: "No se siguen o nadie lo verifica.", 2: "Se siguen en parte; se verifica solo ante incidentes.", 3: "Se cumplen y se verifican con una rutina definida (auditoría, lista de chequeo, revisión)." } },
  ] },
  { key: "conocimiento", name: "Conocimiento", que: "Las personas saben hacerlo: competencias técnicas, experiencia previa y aprendizaje asegurado.", items: [
    { code: "C1", texto: "Las personas que ejecutan tienen la competencia técnica que la iniciativa exige.", pregunta: "¿Han hecho algo equivalente antes, o tienen la formación y la certificación que se requieren?",
      niveles: { 1: "No está la competencia en la empresa; habría que contratarla o aprenderla desde cero.", 2: "Está en pocas personas o de forma incompleta; hay que formar o acompañar.", 3: "Competencia presente y demostrada en más de una persona." } },
    { code: "C2", texto: "El conocimiento no depende de una sola persona.", pregunta: "Si quien más sabe no está, ¿la iniciativa sigue?",
      niveles: { 1: "Depende de una persona clave.", 2: "Dos personas lo saben, sin documentación ni relevo formado.", 3: "Conocimiento documentado y repartido; hay relevo." } },
    { code: "C3", texto: "Hay un plan para cerrar las brechas de conocimiento antes de arrancar.", pregunta: "¿Está definido qué formación, acompañamiento o contratación hace falta, con fecha y presupuesto?",
      niveles: { 1: "No se ha identificado qué falta.", 2: "Se sabe qué falta, pero sin plan con fecha ni presupuesto.", 3: "Plan de cierre de brechas definido, financiado y en marcha (o no hace falta)." } },
  ] },
  { key: "tecnologia", name: "Tecnología", que: "Sistemas, datos y herramientas que la iniciativa necesita: disponibles, integrados y con datos confiables.", items: [
    { code: "T1", texto: "Los sistemas o herramientas que la iniciativa necesita existen y están disponibles.", pregunta: "¿Qué sistema la soporta (ERP, CRM, plataforma, equipo) y está contratado, instalado y licenciado?",
      niveles: { 1: "No existe o no está contratado.", 2: "Existe, pero falta módulo, licencias, capacidad o la implantación está a medias.", 3: "Disponible, implantado y con capacidad para el alcance de la iniciativa." } },
    { code: "T2", texto: "Los datos que la iniciativa necesita existen, son confiables y tienen dueño.", pregunta: "¿Los datos para operar y medir la iniciativa están completos, actualizados y alguien responde por ellos?",
      niveles: { 1: "No existen o no son confiables.", 2: "Existen con vacíos, duplicados o sin dueño; hay que depurarlos.", 3: "Datos completos, confiables y con dueño definido." } },
    { code: "T3", texto: "Los sistemas involucrados están integrados en lo que la iniciativa requiere.", pregunta: "¿La información fluye entre los sistemas sin reprocesos manuales en los tramos críticos?",
      niveles: { 1: "No hay integración; todo es manual.", 2: "Integración parcial con reprocesos o con un proyecto de integración pendiente.", 3: "Integrados en los tramos que la iniciativa necesita." } },
  ] },
];

export const itemsDe = (frentes: Frente[] = FRENTES): (ItemCap & { frente: FrenteKey })[] => frentes.flatMap((f) => f.items.map((i) => ({ ...i, frente: f.key })));
export const ITEMS_CAP = itemsDe(FRENTES);

/** Checklist personalizado de una iniciativa: los mismos cinco frentes, con afirmaciones, preguntas y niveles adaptados
    por el modelo al contexto de la iniciativa y de la empresa. Lo genera el advisor o el admin; sin él, rige el genérico. */
export type ChecklistCap = { iniId: string; frentes: Frente[]; resumen: string; by: string; at: string; model: string };
export const checklistHash = (frentes: Frente[]): string => { const t = JSON.stringify(frentes.map((f) => f.items.map((i) => [i.code, i.texto]))); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36); };

/** Revisión de una iniciativa: nivel por afirmación y «qué haría falta» por frente (obligatorio cuando el frente no está instalado). */
export type RevisionCapacidades = {
  iniId: string;
  respuestas: Record<string, NivelCap>;              // U1…T3
  falta: Partial<Record<FrenteKey, string>>;         // qué haría falta para instalar el frente
  checklist: string;                                 // hash del checklist con el que se respondió (genérico o personalizado)
  by: string; at: string;
};

export type Semaforo = "lista" | "ajustes" | "brechas";
export const SEMAFORO: Record<Semaforo, { label: string; desc: string }> = {
  lista: { label: "Lista para ejecutar", desc: "Los cinco frentes están instalados." },
  ajustes: { label: "Con ajustes", desc: "Ningún frente falta del todo, pero hay capacidades parciales que se cierran mientras arranca." },
  brechas: { label: "Con brechas críticas", desc: "Al menos un frente no existe: se resuelve antes de arrancar o se registra como iniciativa habilitante." },
};

export type LecturaFrente = { key: FrenteKey; name: string; nivel: NivelCap | null; faltantes: string[]; falta?: string };
export type LecturaCapacidades = { completa: boolean; respondidas: number; total: number; frentes: LecturaFrente[]; semaforo: Semaforo | null; brechas: LecturaFrente[] };

export const isNivelCap = (v: unknown): v is NivelCap => v === 1 || v === 2 || v === 3;

/** Lectura de una revisión (puede estar incompleta): por frente, el nivel más bajo de sus afirmaciones. */
export function lecturaCapacidades(r: Pick<RevisionCapacidades, "respuestas" | "falta"> | null | undefined, checklist: Frente[] = FRENTES): LecturaCapacidades {
  const resp = r?.respuestas ?? {};
  const items = itemsDe(checklist);
  const frentes: LecturaFrente[] = checklist.map((f) => {
    const niveles = f.items.map((i) => resp[i.code]).filter(isNivelCap);
    const nivel = niveles.length === f.items.length ? (Math.min(...niveles) as NivelCap) : null;
    const faltantes = f.items.filter((i) => isNivelCap(resp[i.code]) && resp[i.code] < 3).map((i) => i.code);
    return { key: f.key, name: f.name, nivel, faltantes, falta: r?.falta?.[f.key]?.trim() || undefined };
  });
  const respondidas = items.filter((i) => isNivelCap(resp[i.code])).length;
  const completa = frentes.every((f) => f.nivel !== null);
  const semaforo: Semaforo | null = !completa ? null : frentes.some((f) => f.nivel === 1) ? "brechas" : frentes.some((f) => f.nivel === 2) ? "ajustes" : "lista";
  return { completa, respondidas, total: items.length, frentes, semaforo, brechas: frentes.filter((f) => f.nivel !== null && f.nivel < 3) };
}

/** Frentes no instalados que aún no dicen qué haría falta: la revisión no se registra sin eso. */
export const faltaPorDescribir = (r: Pick<RevisionCapacidades, "respuestas" | "falta">, checklist: Frente[] = FRENTES): FrenteKey[] =>
  lecturaCapacidades(r, checklist).brechas.filter((f) => !f.falta).map((f) => f.key);

/** Normaliza lo que llega del cliente o del modelo: solo códigos conocidos, niveles 1 a 3 y textos acotados. */
export function normalizarRevision(input: unknown, iniId: string, by: string, checklist: Frente[] = FRENTES): { ok: true; revision: RevisionCapacidades } | { ok: false; error: string } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rin = (o.respuestas && typeof o.respuestas === "object" ? o.respuestas : {}) as Record<string, unknown>;
  const respuestas: Record<string, NivelCap> = {};
  for (const i of itemsDe(checklist)) { const v = Number(rin[i.code]); if (isNivelCap(v)) respuestas[i.code] = v; }
  const fin = (o.falta && typeof o.falta === "object" ? o.falta : {}) as Record<string, unknown>;
  const falta: Partial<Record<FrenteKey, string>> = {};
  for (const f of FRENTES) { const t = typeof fin[f.key] === "string" ? (fin[f.key] as string).trim().slice(0, 600) : ""; if (t) falta[f.key] = t; }
  const lect = lecturaCapacidades({ respuestas, falta }, checklist);
  if (!lect.completa) return { ok: false, error: `Faltan ${lect.total - lect.respondidas} afirmaciones por calificar.` };
  const sinTexto = faltaPorDescribir({ respuestas, falta }, checklist);
  if (sinTexto.length) return { ok: false, error: `Describe qué haría falta en: ${sinTexto.map((k) => FRENTES.find((f) => f.key === k)!.name.toLowerCase()).join(", ")}.` };
  return { ok: true, revision: { iniId, respuestas, falta, checklist: checklistHash(checklist), by, at: new Date().toISOString() } };
}

/* ═══ Asistente IA: lectura inicial de los cinco frentes a partir de lo que la plataforma sabe ═══ */

export type PropuestaCapacidades = { respuestas: Record<string, NivelCap>; falta: Partial<Record<FrenteKey, string>>; justificacion: Record<string, string>; resumen: string };

export function encargoCapacidades(p: {
  empresa: { name: string; sector?: string; size?: string };
  ini: { id: string; name: string; objetivo?: string; start?: string; end?: string; budgetPlanned?: number; capability?: string; capabilityName?: string; owner?: string; observaciones?: string; decision?: string | null };
  kr?: { code: string; name: string; baseline?: string; target?: string; unit?: string; due?: string };
  objetivo?: { id: string; name: string };
  prioridad?: { name: string; sponsor?: string };
  diagnostico?: string;   // lectura del diagnóstico (Fuente 1) por capacidad, si existe
  ayuda: string;          // texto de la ayuda metodológica
  contexto: string; fecha: string;
  checklist?: Frente[];   // el personalizado de la iniciativa, si existe
}): { system: string; user: string } {
  const frentes = p.checklist ?? FRENTES;
  const system = `Eres el advisor de 4Shine Empresas. Conoces a fondo la empresa, su sector y su estrategia cargada en la plataforma. Tu tarea: hacer una lectura inicial, prudente y verificable, de si la empresa tiene instaladas las capacidades para ejecutar una iniciativa, siguiendo el checklist de cinco frentes de la ayuda metodológica. Responde solo con JSON válido. No inventes hechos: cuando no hay evidencia en el contexto, califica 2 (parcial) y explica en la justificación qué habría que verificar. Califica 3 solo con evidencia explícita; califica 1 cuando el contexto muestra que la capacidad no existe. Escribe en español de Colombia, en frases cortas y concretas.`;
  const user = [
    `Fecha: ${p.fecha}.`, p.ayuda, "", p.contexto, "",
    `INICIATIVA A REVISAR: ${p.ini.id} · ${p.ini.name}`,
    p.ini.objetivo ? `Qué logra: ${p.ini.objetivo}` : "",
    p.kr ? `Resultado clave que mueve: ${p.kr.code} ${p.kr.name}${p.kr.baseline != null ? ` · base ${p.kr.baseline}` : ""}${p.kr.target != null ? ` · meta ${p.kr.target}` : ""}${p.kr.unit ? ` ${p.kr.unit}` : ""}${p.kr.due ? ` · plazo ${p.kr.due}` : ""}` : "Sin resultado clave vinculado.",
    p.objetivo ? `Objetivo directivo: ${p.objetivo.id} ${p.objetivo.name}` : "",
    p.prioridad ? `Prioridad estratégica: ${p.prioridad.name}${p.prioridad.sponsor ? ` · sponsor ${p.prioridad.sponsor}` : ""}` : "",
    `Responsable: ${p.ini.owner ?? "sin responsable"} · inicio ${p.ini.start || "—"} · fin ${p.ini.end || "—"} · presupuesto planeado ${p.ini.budgetPlanned ?? 0}`,
    p.ini.capabilityName ? `Capacidad que declara instalar: ${p.ini.capability} ${p.ini.capabilityName}` : "",
    p.ini.decision ? `Decisión de tiempo en el portafolio: ${p.ini.decision}` : "",
    p.ini.observaciones ? `Observaciones registradas: ${p.ini.observaciones}` : "",
    p.diagnostico ? `DIAGNÓSTICO DE CAPACIDAD ORGANIZACIONAL (Fuente 1, consolidado): ${p.diagnostico}` : "",
    "",
    "AFIRMACIONES A CALIFICAR (1 = no existe, 2 = parcial, 3 = instalada):",
    ...frentes.flatMap((f) => [`[${f.name}] ${f.que}`, ...f.items.map((i) => `  ${i.code}: ${i.texto} — ${i.pregunta} Niveles: 1 ${i.niveles[1]} · 2 ${i.niveles[2]} · 3 ${i.niveles[3]}`)]),
    "",
    `Devuelve JSON con esta forma: {"resumen": "dos frases con la lectura general", "items": [{"code": "U1", "nivel": 2, "justificacion": "hecho o verificación pendiente"}, …una por afirmación…], "falta": {"unidad": "qué haría falta (solo si el frente queda en 1 o 2)", "proceso": "", "procedimiento": "", "conocimiento": "", "tecnologia": ""}}. En «falta» escribe acciones concretas (qué, quién, cuándo), no generalidades.`,
  ].filter((l) => l !== "").join("\n");
  return { system, user };
}

export function parsePropuestaCapacidades(raw: unknown, checklist: Frente[] = FRENTES): PropuestaCapacidades | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.items) ? (o.items as Record<string, unknown>[]) : [];
  const items = itemsDe(checklist);
  const respuestas: Record<string, NivelCap> = {}; const justificacion: Record<string, string> = {};
  for (const it of arr) {
    const code = String(it.code ?? "").toUpperCase().trim(); const n = Number(it.nivel);
    if (!items.some((i) => i.code === code) || !isNivelCap(n)) continue;
    respuestas[code] = n; justificacion[code] = typeof it.justificacion === "string" ? it.justificacion.trim().slice(0, 400) : "";
  }
  if (Object.keys(respuestas).length < items.length / 2) return null;
  const fin = (o.falta && typeof o.falta === "object" ? o.falta : {}) as Record<string, unknown>;
  const falta: Partial<Record<FrenteKey, string>> = {};
  const lect = lecturaCapacidades({ respuestas, falta: {} }, checklist);
  for (const f of FRENTES) {
    const t = typeof fin[f.key] === "string" ? (fin[f.key] as string).trim().slice(0, 600) : "";
    const lf = lect.frentes.find((x) => x.key === f.key);
    if (t && lf && lf.nivel !== null && lf.nivel < 3) falta[f.key] = t;   // solo donde hay brecha
  }
  return { respuestas, falta, justificacion, resumen: typeof o.resumen === "string" ? o.resumen.trim().slice(0, 600) : "" };
}

/* ═══ Asistente IA: checklist personalizado por iniciativa (solo advisor o admin) ═══
   Los cinco frentes son fijos; el modelo adapta las afirmaciones, las preguntas guía y la descripción de los tres
   niveles al contexto de la iniciativa y de la empresa, para que quien califica lo haga con criterio y no en abstracto. */

export function encargoPersonalizarChecklist(p: Parameters<typeof encargoCapacidades>[0]): { system: string; user: string } {
  const system = `Eres el advisor de 4Shine Empresas. Conoces a fondo la empresa, su sector y su estrategia cargada en la plataforma. Tu tarea: adaptar el checklist de capacidades para ejecutar (cinco frentes: unidad, proceso, procedimiento, conocimiento y tecnología) a UNA iniciativa concreta, de modo que cada afirmación, su pregunta guía y la descripción de sus tres niveles hablen de esa iniciativa, de sus áreas, procesos, sistemas, datos y personas reales, con el lenguaje del negocio y del sector. Conserva la lógica del checklist genérico (qué comprueba cada frente) y el número de afirmaciones por frente (2 o 3). Responde solo con JSON válido, en español de Colombia, con frases cortas y verificables. No inventes nombres de personas; usa cargos y áreas.`;
  const base = encargoCapacidades({ ...p, checklist: FRENTES }).user;
  const user = base.replace("AFIRMACIONES A CALIFICAR (1 = no existe, 2 = parcial, 3 = instalada):", "CHECKLIST GENÉRICO DE REFERENCIA (adáptalo a esta iniciativa; no lo repitas tal cual):")
    .replace(/Devuelve JSON con esta forma:[\s\S]*$/, `Devuelve JSON con esta forma: {"resumen": "una frase sobre qué capacidades concretas pone a prueba esta iniciativa", "frentes": [{"key": "unidad", "que": "qué comprueba este frente para esta iniciativa (una frase)", "items": [{"code": "U1", "texto": "afirmación adaptada", "pregunta": "pregunta guía adaptada, con el nombre del área, proceso, sistema o dato real", "niveles": {"1": "cómo se ve «no existe» aquí", "2": "cómo se ve «parcial» aquí", "3": "cómo se ve «instalada» aquí"}}]}, …los cinco frentes en este orden: unidad (códigos U1…), proceso (P1…), procedimiento (R1…), conocimiento (C1…), tecnologia (T1…)…]}. Cada frente con 2 o 3 afirmaciones; cada nivel con una frase concreta y distinguible de las otras dos.`);
  return { system, user };
}

export function parseChecklistPersonalizado(raw: unknown): { frentes: Frente[]; resumen: string } | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.frentes) ? (o.frentes as Record<string, unknown>[]) : [];
  const prefijo: Record<FrenteKey, string> = { unidad: "U", proceso: "P", procedimiento: "R", conocimiento: "C", tecnologia: "T" };
  const frentes: Frente[] = [];
  for (const base of FRENTES) {
    const f = arr.find((x) => String(x.key ?? "").toLowerCase() === base.key);
    const its = Array.isArray(f?.items) ? (f!.items as Record<string, unknown>[]) : [];
    const items: ItemCap[] = [];
    for (const it of its.slice(0, 3)) {
      const texto = typeof it.texto === "string" ? it.texto.trim().slice(0, 240) : "";
      const pregunta = typeof it.pregunta === "string" ? it.pregunta.trim().slice(0, 300) : "";
      const nv = (it.niveles && typeof it.niveles === "object" ? it.niveles : {}) as Record<string, unknown>;
      const n = (k: string) => (typeof nv[k] === "string" ? (nv[k] as string).trim().slice(0, 240) : "");
      if (texto.length < 10 || !n("1") || !n("2") || !n("3")) continue;
      items.push({ code: `${prefijo[base.key]}${items.length + 1}`, texto, pregunta, niveles: { 1: n("1"), 2: n("2"), 3: n("3") } });
    }
    if (items.length < 2) return null;   // un frente incompleto invalida la personalización: rige el genérico
    frentes.push({ key: base.key, name: base.name, que: typeof f?.que === "string" && (f.que as string).trim() ? (f.que as string).trim().slice(0, 300) : base.que, items });
  }
  return { frentes, resumen: typeof o.resumen === "string" ? o.resumen.trim().slice(0, 400) : "" };
}

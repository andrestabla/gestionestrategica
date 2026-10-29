// Informe profundo y cualitativo del diagnóstico con IA, según el método 4Shine Empresas.
// Aquí viven el encargo al modelo (contexto del método + datos de la lectura) y la validación de su
// respuesta. Reglas puras: el servidor llama al modelo (src/server/ia.ts) y guarda el resultado.

import { CAPS, DIMS, LEVELS, FRAMEWORKS, STAGES, THRESHOLD, type Dimension } from "@/data/mapa";
import type { Consolidated, Recommendation } from "@/lib/od";
import type { LecturaF1 } from "@/lib/f1";

export type InformeKind = "f1" | "consolidado";

export type InformeIA = {
  titulo: string;
  hipotesis_central?: string;
  resumen: string[];
  dimensiones?: { dimension: string; lectura: string }[];
  capacidades: { capacidad: string; puntaje: number | null; lectura: string }[];
  fortalezas: { dimension: string; por_que: string }[];
  brechas: { dimension: string; puntaje: number | null; que_revela: string; evidencia_a_verificar: string; framework: string }[];
  patrones: string;
  prioridades: { orden: number; dimension: string; framework: string; primer_paso: string }[];
  preguntas: string[];
  dispersion?: { dimension: string; lectura: string }[];
  nivel_acompanamiento?: { nivel: string; por_que: string };
  nota_metodologica: string;
};

export type InformeGuardado = { kind: InformeKind; subject: string; inputHash: string; informe: InformeIA; model: string; by: string; at: string };

type Empresa = { name: string; sector?: string; levers?: { name: string; desc?: string }[]; mode?: string };

const fmt = (x: number | null | undefined, d = 2) => (x == null ? "—" : x.toFixed(d).replace(".", ","));
const fwName = (id: string) => FRAMEWORKS.find((f) => f.id === id)?.name ?? id;

/** Contexto del método que el modelo necesita para leer con criterio (compacto: ~1.800 palabras). */
export function contextoMetodo(dimsDetalle: string[] = []): string {
  const caps = CAPS.map((c) => `- ${c.code} ${c.name} (${c.verb}): ${c.q}`).join("\n");
  const escala = LEVELS.map((l) => `${l.n} ${l.name}: ${l.desc}`).join(" · ");
  const dims = DIMS.map((d) => `- ${d.code} ${d.name} [${d.cap}]: ${d.defn} Frameworks que la instalan: ${d.fws.map(fwName).join(", ") || "—"}.`).join("\n");
  const rubricas = DIMS.filter((d) => dimsDetalle.includes(d.code)).map((d: Dimension) => `- ${d.code}: nivel 1-2 «${d.rub[0]}»; nivel 3 «${d.rub[1]}»; nivel 4-5 «${d.rub[2]}»`).join("\n");
  const etapas = STAGES.map((s) => `${s.name} (lidera ${s.lider}; soporte ${s.soporte})`).join(" → ");
  return [
    "MÉTODO 4SHINE EMPRESAS (fuente única de la plataforma Gestión estratégica):",
    "Cuatro capacidades organizacionales, en orden de instalación:", caps,
    `Diecisiete dimensiones (cuatro por capacidad; cinco en Multiplicación), cada una con cuatro prácticas observables:`, dims,
    rubricas ? "Rúbricas de las dimensiones en foco:\n" + rubricas : "",
    `Escala de madurez de 1 a 5: ${escala}. Umbral de práctica instalada: ${THRESHOLD.toFixed(1).replace(".", ",")}. Una práctica declarada y no demostrada con evidencia queda como máximo en 2,9 (techo de evidencia).`,
    `Etapas de crecimiento: ${etapas}.`,
    "Niveles de acompañamiento: Focus (una capacidad en brecha: un bloque de trabajo), Growth Partner (dos: ruta de unos seis meses), Enterprise Elite (tres o más, o liderazgo del CEO y desacoplamiento de dependencias en brecha a la vez: sistema anual).",
    "Principios de lectura: la autoevaluación directiva (Fuente 1) es el relato de la dirección; se contrasta con la percepción de equipos (Fuente 2) y la evidencia documental (Fuente 3). Sin F2 ni F3, las conclusiones se enuncian como hipótesis a verificar. Un promedio alto no borra una dimensión débil. Se prioriza por arrastre: las dimensiones de Dirección y Ejecución bajo el umbral frenan a las demás.",
  ].filter(Boolean).join("\n");
}

const SISTEMA = `Eres el advisor senior de 4Shine Empresas. Escribes informes de diagnóstico para comités directivos de empresas medianas en Colombia y Ecuador: profundos, concretos, en español neutro de Colombia, con tono profesional y directo, sin halagos vacíos ni jerga de moda. Lo que analizas es la evaluación que un directivo (o el comité) hace de SU COMPAÑÍA, nunca un diagnóstico de la persona: no juzgues a quien respondió, no uses «tu desempeño» ni atribuyas rasgos personales. Todo se enuncia como hipótesis sobre la organización, a contrastar con las lecturas de los pares, la percepción de los equipos y la evidencia documental; usa formulaciones como «la lectura sugiere», «la hipótesis es», «habría que verificar». Cada afirmación se apoya en las cifras recibidas y en el método. Nunca inventes datos que no estén en la entrada. Reglas estrictas: (1) una dimensión o capacidad marcada «—» no tiene respuesta: no es brecha, ni fortaleza, ni hallazgo; solo puedes decir que está pendiente de responder y no entra en prioridades ni en patrones; (2) las brechas y prioridades salen únicamente de dimensiones con puntaje bajo el umbral; si no hay ninguna, dilo y propone como prioridad completar la lectura; (3) si hay una sola autoevaluación no existe dispersión ni desacuerdo entre miembros: no lo menciones; (4) escribe los decimales con coma (2,5) y conserva los códigos de dimensión tal como llegan. No uses listas de viñetas dentro de los párrafos. Responde únicamente con el JSON pedido.`;

const FORMATO = `Devuelve un JSON con exactamente estas claves:
{
 "titulo": string (una línea, sin la palabra «informe», sobre la compañía),
 "hipotesis_central": string (una sola frase de 20-35 palabras: la hipótesis principal sobre la compañía que deja esta lectura),
 "resumen": string[] (dos o tres párrafos de 60-110 palabras: qué muestra la lectura, qué la explica, qué está en juego; en lenguaje de hipótesis),
 "dimensiones": [{"dimension": "código · nombre", "lectura": string (20-35 palabras: qué sugiere ese puntaje a la luz del marco y qué habría que verificar)}] (todas las dimensiones con puntaje, en el orden recibido),
 "capacidades": [{"capacidad": "Dirección|Liderazgo|Ejecución|Multiplicación", "puntaje": number|null, "lectura": string (40-80 palabras)}] (las cuatro),
 "fortalezas": [{"dimension": "código · nombre", "por_que": string (30-60 palabras)}] (dos a cuatro),
 "brechas": [{"dimension": "código · nombre", "puntaje": number|null, "que_revela": string (40-80 palabras), "evidencia_a_verificar": string (qué documento, ritual o indicador comprobaría la práctica), "framework": string (el framework del método que la instala)}] (las dimensiones bajo el umbral, de mayor a menor arrastre; máximo seis),
 "patrones": string (80-140 palabras: relaciones entre brechas, causa raíz probable, etapa de crecimiento que sugiere),
 "prioridades": [{"orden": 1, "dimension": "código · nombre", "framework": string, "primer_paso": string (acción concreta para los próximos 90 días, con responsable sugerido)}] (tres),
 "preguntas": string[] (cuatro a seis preguntas incómodas y útiles para la sesión de devolución con el comité),
 "nota_metodologica": string (40-70 palabras sobre qué fuentes faltan y cómo cambia la lectura al incorporarlas)__EXTRA__
}`;
const EXTRA_CONSOLIDADO = `,
 "dispersion": [{"dimension": "código · nombre", "lectura": string (qué conversación abre ese desacuerdo)}] (solo las dimensiones listadas como dispersas en la entrada; lista vacía si hay una sola autoevaluación o no hay dispersión),
 "nivel_acompanamiento": {"nivel": "Focus|Growth Partner|Enterprise Elite|Sin intervención estructural", "por_que": string (30-60 palabras; parte del nivel que indica la regla del método y matiza solo con lo que la lectura sustenta)}`;
const formato = (kind: InformeKind) => FORMATO.replace("__EXTRA__", kind === "consolidado" ? EXTRA_CONSOLIDADO : "");

export function encargoF1(args: { empresa: Empresa; persona: { nombre: string; cargo?: string }; lectura: LecturaF1; fecha: string }): { system: string; user: string } {
  const { empresa, persona, lectura, fecha } = args;
  const dimsFoco = lectura.prios.slice(0, 6).map((x) => x.d.code);
  const lineas = lectura.dims.map((x) => `${x.d.code} ${x.d.name}: ${fmt(x.m)} (${x.n} de ${x.d.prac.length} ítems)`).join("\n");
  const caps = lectura.caps.map((c) => `${c.cap.name}: ${fmt(c.m)} (${c.n} de ${c.tot} ítems)`).join("\n");
  const user = [
    contextoMetodo(dimsFoco),
    "",
    `EMPRESA: ${empresa.name}${empresa.sector ? ` · ${empresa.sector}` : ""}.`,
    empresa.levers?.length ? `Prioridades estratégicas declaradas: ${empresa.levers.map((l) => l.name).join("; ")}.` : "",
    `LECTURA: autoevaluación directiva individual (Fuente 1) de ${persona.nombre}${persona.cargo ? `, ${persona.cargo}` : ""}, guardada el ${fecha}. ${lectura.answered} de 68 afirmaciones respondidas.`,
    "Promedio por capacidad:", caps,
    "Promedio por dimensión:", lineas,
    lectura.prios.length ? `Dimensiones bajo el umbral ordenadas por arrastre: ${lectura.prios.map((x) => `${x.d.code} (${fmt(x.m)})`).join(", ")}.` : "Ninguna dimensión bajo el umbral.",
    "",
    lectura.answered < 68 ? `LECTURA PARCIAL: faltan ${68 - lectura.answered} afirmaciones; las dimensiones con «—» no se interpretan.` : "",
    "Escribe el informe ejecutivo de esta evaluación: es la lectura que este directivo hace de la compañía, individual y confidencial. Habla de «la compañía» y de «esta lectura»; dirígete al directivo solo para proponerle qué contrastar con sus pares y qué llevar a la conversación del comité. Distingue lo que la organización declara de lo que habría que demostrar.",
    formato("f1"),
  ].filter(Boolean).join("\n");
  return { system: SISTEMA, user };
}

export function encargoConsolidado(args: { empresa: Empresa; C: Consolidated; rec: Recommendation; n: number; dispersion: { code: string; name: string; sd: number | null }[]; fecha: string; cobertura?: number[] }): { system: string; user: string } {
  const { empresa, C, rec, n, dispersion, fecha, cobertura } = args;
  const dimsFoco = C.priorities.slice(0, 6).map((d) => d.code);
  const caps = C.caps.map((c) => `${c.name}: F1 ${fmt(c.f1)} · F2 ${fmt(c.f2)} · F3 ${fmt(c.f3)} · madurez ${fmt(c.m)}`).join("\n");
  const dims = C.dims.map((d) => `${d.code} ${d.name}: F1 ${fmt(d.f1)} · madurez ${fmt(d.m)} · base «${d.base}»${d.flags.length ? ` · banderas: ${d.flags.map((f) => f.key).join(", ")}` : ""}`).join("\n");
  const disp = n < 2 ? "" : dispersion.filter((x) => x.sd != null).sort((a, b) => (b.sd ?? 0) - (a.sd ?? 0)).slice(0, 6).map((x) => `${x.code} ${x.name}: desviación ${fmt(x.sd)}`).join("; ");
  const user = [
    contextoMetodo(dimsFoco),
    "",
    `EMPRESA: ${empresa.name}${empresa.sector ? ` · ${empresa.sector}` : ""}.`,
    empresa.levers?.length ? `Prioridades estratégicas declaradas: ${empresa.levers.map((l) => `${l.name}${l.desc ? ` (${l.desc})` : ""}`).join("; ")}.` : "",
    `LECTURA CONSOLIDADA del comité al ${fecha}: ${n} autoevaluaciones directivas (Fuente 1)${C.okF2 ? `, ${C.f2n} respuestas de equipos (Fuente 2)` : ", sin percepción de equipos"}${C.hasF3 ? ", con evidencia documental (Fuente 3)" : ", sin evidencia documental"}.`,
    cobertura?.length ? `Cobertura: cada persona respondió ${cobertura.join(", ")} de 68 afirmaciones; las dimensiones con «—» no tienen respuesta y no se interpretan.` : "",
    "Por capacidad:", caps,
    "Por dimensión:", dims,
    disp ? `Dispersión entre miembros del comité (donde no coinciden): ${disp}.` : "Sin dispersión relevante entre miembros.",
    `Nivel de acompañamiento que sugiere la regla del método: ${rec.level}. ${rec.text} ${rec.notNeeded}`,
    "",
    n === 1 ? "Hay una sola autoevaluación: el consolidado coincide con esa lectura individual y no hay dispersión que interpretar." : "",
    "Escribe el informe para el comité directivo y su advisor: lectura colectiva, dónde la dirección se ve de forma distinta entre sí (dispersión, si la hay) y qué significa, hipótesis de causa raíz, y la ruta de acompañamiento.",
    formato("consolidado"),
  ].filter(Boolean).join("\n");
  return { system: SISTEMA, user };
}

/** Valida y normaliza la respuesta del modelo; lanza si no tiene la forma mínima. */
export function parseInforme(raw: unknown): InformeIA {
  const o = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : null);
  const arr = <T,>(v: unknown, f: (x: Record<string, unknown>) => T | null): T[] => (Array.isArray(v) ? v.map((x) => f((x ?? {}) as Record<string, unknown>)).filter((x): x is T => x !== null) : []);
  const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : typeof v === "string" && v.trim() ? v.split(/\n\n+/).map((x) => x.trim()).filter(Boolean) : []);
  const informe: InformeIA = {
    titulo: s(o.titulo, 160) || "Lectura del diagnóstico",
    hipotesis_central: s(o.hipotesis_central, 400) || undefined,
    resumen: strs(o.resumen),
    capacidades: arr(o.capacidades, (x) => (s(x.capacidad) ? { capacidad: s(x.capacidad, 40), puntaje: num(x.puntaje), lectura: s(x.lectura) } : null)),
    fortalezas: arr(o.fortalezas, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), por_que: s(x.por_que) } : null)),
    brechas: arr(o.brechas, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), puntaje: num(x.puntaje), que_revela: s(x.que_revela), evidencia_a_verificar: s(x.evidencia_a_verificar), framework: s(x.framework, 160) } : null)),
    dimensiones: arr(o.dimensiones, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), lectura: s(x.lectura, 600) } : null)),
    patrones: s(o.patrones, 3000),
    prioridades: arr(o.prioridades, (x) => (s(x.dimension) ? { orden: num(x.orden) ?? 0, dimension: s(x.dimension, 120), framework: s(x.framework, 160), primer_paso: s(x.primer_paso) } : null)).sort((a, b) => a.orden - b.orden),
    preguntas: strs(o.preguntas),
    nota_metodologica: s(o.nota_metodologica, 1500),
  };
  if (Array.isArray(o.dispersion)) informe.dispersion = arr(o.dispersion, (x) => (s(x.dimension) ? { dimension: s(x.dimension, 120), lectura: s(x.lectura) } : null));
  const na = (o.nivel_acompanamiento ?? null) as Record<string, unknown> | null;
  if (na && s(na.nivel)) informe.nivel_acompanamiento = { nivel: s(na.nivel, 80), por_que: s(na.por_que) };
  if (!informe.resumen.length || !informe.capacidades.length) throw new Error("El modelo devolvió un informe incompleto; inténtalo de nuevo.");
  return informe;
}

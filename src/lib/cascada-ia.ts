// Asistente de articulación entre áreas (cascada trimestral): el modelo propone, para una iniciativa, qué áreas
// participan, cuál lidera, con qué prioridad, quién (cargo o equipo) y qué debe hacer cada una, con el contexto
// de la empresa. El advisor confirma o edita. Reglas puras: encargo y lectura de la respuesta.

import { normalizarArticulacion, type Articulacion } from "@/lib/cascada";

export function encargoArticulacion(p: {
  empresa: { name: string; sector?: string; size?: string };
  ini: { id: string; name: string; objetivo?: string; metaResultado?: string; start?: string; end?: string; owner?: string; ownerId?: string; observaciones?: string };
  kr?: { code: string; name: string }; objetivo?: { id: string; name: string }; prioridad?: { name: string };
  areas: { id: string; nombre: string; cargo: string; personas: string[] }[];
  capacidades?: string;   // lectura de capacidades para ejecutar (brechas y qué haría falta), si existe
  contexto: string; fecha: string;
}): { system: string; user: string } {
  const system = `Eres el advisor de 4Shine Empresas. Conoces a fondo la empresa y su estrategia cargada en la plataforma. Tu tarea: para UNA iniciativa del portafolio, declarar cómo se articula el trabajo entre las áreas de la empresa: qué áreas participan (de 2 a 5, solo las del catálogo), cuál lidera (una sola, normalmente la del responsable de la iniciativa), con qué prioridad (1 = la que más aporta), quién la ejecuta en cada área (cargo o equipo, nunca nombres de personas inventados; usa los cargos del catálogo cuando existan) y qué debe hacer cada área: una contribución concreta y verificable (qué entrega, para cuándo). Ninguna iniciativa es de una sola área: muestra la interdependencia real. Responde solo con JSON válido, en español de Colombia, frases cortas.`;
  const user = [
    `Fecha: ${p.fecha}.`, p.contexto, "",
    `INICIATIVA: ${p.ini.id} · ${p.ini.name}`,
    p.ini.objetivo ? `Qué logra: ${p.ini.objetivo}` : "", p.ini.metaResultado ? `Meta de resultado: ${p.ini.metaResultado}` : "",
    `Responsable (área dueña): ${p.ini.owner ?? "sin responsable"}${p.ini.ownerId ? ` (${p.ini.ownerId})` : ""} · inicio ${p.ini.start || "—"} · fin ${p.ini.end || "—"}`,
    p.kr ? `Resultado clave que mueve: ${p.kr.code} ${p.kr.name}` : "", p.objetivo ? `Objetivo directivo: ${p.objetivo.id} ${p.objetivo.name}` : "", p.prioridad ? `Prioridad estratégica: ${p.prioridad.name}` : "",
    p.ini.observaciones ? `Observaciones: ${p.ini.observaciones}` : "",
    p.capacidades ? `CAPACIDADES PARA EJECUTAR (revisión registrada): ${p.capacidades}` : "",
    "", "ÁREAS DEL CATÁLOGO (usa solo estos ids):",
    ...p.areas.map((a) => `- ${a.id}: ${a.nombre} · ${a.cargo}${a.personas.length ? ` · personas: ${a.personas.join(", ")}` : ""}`),
    "",
    `Devuelve JSON con esta forma: {"areas": [{"areaId": "R05", "rol": "LIDERA", "prioridad": 1, "persona": "cargo o equipo que ejecuta", "contribucion": "qué debe hacer esta área en la iniciativa (entregable concreto)", "entrega": "para cuándo o cómo se verifica"}, …]}. Una sola área con rol LIDERA; las demás CONTRIBUYE. Prioridad 1..n sin repetir.`,
  ].filter((l) => l !== "").join("\n");
  return { system, user };
}

export function parseArticulacion(raw: unknown, iniId: string, by: string, areas: string[]): Articulacion | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = Array.isArray(o.areas) ? (o.areas as Record<string, unknown>[]) : [];
  const limpias: Record<string, unknown>[] = arr.map((a) => ({ ...a, areaId: String(a.areaId ?? "").toUpperCase().trim() })).filter((a) => areas.includes(String(a.areaId)));
  const sinRepetir = limpias.filter((a, i) => limpias.findIndex((b) => b.areaId === a.areaId) === i);
  if (sinRepetir.filter((a) => a.rol === "LIDERA").length > 1) { let primera = true; for (const a of sinRepetir) { if (a.rol === "LIDERA") { if (!primera) a.rol = "CONTRIBUYE"; primera = false; } } }
  const r = normalizarArticulacion({ areas: sinRepetir }, iniId, by, { areas });
  return r.ok ? r.articulacion : null;
}

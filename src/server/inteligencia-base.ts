// Base de Inteligencia de la empresa activa: la combina (curada del sector + investigada por industria),
// la investiga con el modelo y búsqueda en la web y la guarda. La usan el módulo de Inteligencia, el
// asistente de OKR y el informe de madurez digital.

import { catalog, getBaseInteligencia, saveBaseInteligencia, lineasMadurez, effectiveIntegration, flushOrError } from "@/server/store";
import { buscarJson, iaDisponible } from "@/server/ia";
import { baseDe, type BaseConocimiento } from "@/data/conocimiento-sector";
import { baseCombinada, encargoInvestigacion, industriaDe, parseInvestigacion, type BaseInvestigada } from "@/lib/inteligencia-base";

export const baseInvestigada = (): BaseInvestigada | null => { const g = getBaseInteligencia(); const b = g?.base as BaseInvestigada | undefined; return b && b.version === 1 && Array.isArray(b.hechos) ? b : null; };
/** Base de hechos de la empresa: curada y, si ya se investigó su industria, investigada. */
export const baseEmpresa = (): BaseConocimiento | null => baseCombinada(catalog().company, baseInvestigada());

/** Estado de la base para quien la consulta. */
export function estadoBase() {
  const c = catalog().company, inv = baseInvestigada(), g = getBaseInteligencia(), industria = industriaDe(c), curada = baseDe(c);
  return {
    disponible: iaDisponible(), industria,
    curada: curada ? { nombre: curada.nombre, hechos: curada.hechos.length } : null,
    investigada: inv ? { at: inv.at, model: inv.model, by: g?.by ?? "", hechos: inv.hechos.length, fuentes: inv.fuentes.length, digitales: inv.hechos.filter((h) => h.temas.includes("digital")).length, consultadas: inv.consultadas, descartados: inv.descartados, industria: inv.industria } : null,
    // la industria o el país de la ficha cambiaron después de investigar
    desactualizada: !!inv && !!industria && inv.industria !== industria,
    falta: !industria ? "La ficha de la empresa no dice a qué industria pertenece: completa el sector o la actividad CIIU en Administración → empresa." : null,
  };
}

/** Investiga la industria de la empresa y guarda la base. `by`: quien lo pide, o «plataforma» al crear el espacio. */
export async function investigarIndustria(by: string): Promise<{ ok: true; base: BaseInvestigada } | { ok: false; status: number; error: string }> {
  const c = catalog().company, industria = industriaDe(c);
  if (!industria) return { ok: false, status: 422, error: "La ficha de la empresa no dice a qué industria pertenece: completa el sector o la actividad CIIU." };
  if (!iaDisponible()) return { ok: false, status: 503, error: "El modelo no está configurado en Administración → Integraciones (OpenAI)." };
  const lineas = lineasMadurez(), { system, bloques } = encargoInvestigacion(c, lineas, !!baseDe(c));
  let respuestas;
  try { respuestas = await Promise.all(bloques.map((b) => buscarJson(system, b.user, { country: c.country === "EC" ? "EC" : "CO" }))); }
  catch (e) { return { ok: false, status: 502, error: (e as Error).message }; }
  const model = effectiveIntegration("openai")?.fields.model?.trim() || "gpt-4o-mini";
  const base = parseInvestigacion(respuestas, { industria, model, at: new Date().toISOString() }, lineas);
  if (!base.hechos.length) return { ok: false, status: 502, error: base.descartados ? `La investigación devolvió ${base.descartados} hechos, pero ninguna de sus fuentes estaba entre las páginas consultadas, así que no se guardó nada. Inténtalo de nuevo.` : "La investigación no devolvió hechos; inténtalo de nuevo." };
  saveBaseInteligencia(by, base, model, industria);
  const bad = await flushOrError(); if (bad) return { ok: false, status: 500, error: bad };
  return { ok: true, base };
}

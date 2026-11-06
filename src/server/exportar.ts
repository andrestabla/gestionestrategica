// «Descargar decisiones»: lo decidido en cada módulo, como documento con la marca de la plataforma, en PDF, DOCX o
// XLSX. Aquí se arma el contenido (un documento = secciones con tablas y notas); los formatos los producen
// exportar-pdf, exportar-docx y exportar-xlsx a partir de la misma estructura.

import { catalog, getAlineacion, getDecisions, consolidatedOf, getRevisionesCap, getChecklistsCap, getMetas, getArticulaciones, getF1Responses } from "@/server/store";
import { leversOf, horizonsOf, horizonesBase, horizonLabel } from "@/data/catalogo";
import { keyResultsOf, initiativesOfKr } from "@/lib/convencion";
import { rank, decisionLabel, LEVEL_NAMES, type Decision } from "@/lib/priorizacion";
import { lecturaCapacidades, FRENTES, SEMAFORO, NIVEL_CAP } from "@/lib/capacidades";
import { ROL_AREA, trimestreLabel, type MetaTrimestral } from "@/lib/cascada";
import { lecturaF1 } from "@/lib/f1";
import { DIMS, THRESHOLD } from "@/data/mapa";
import { avg } from "@/lib/od";
import { vocabOf } from "@/lib/vocabulario";
import { SEMAFORO as SEM_ALI } from "@/lib/alineacion";
import type { ValidacionIni } from "@/lib/iniciativas-ia";
import type { SessionUser } from "@/lib/session";

export type Seccion = { titulo: string; intro?: string; columnas: string[]; filas: string[][]; anchos?: number[]; notas?: string[] };
export type Documento = { modulo: ModuloExport; titulo: string; subtitulo: string; empresa: string; fecha: string; secciones: Seccion[]; pie: string };

export const MODULOS_EXPORT = ["prioridades", "objetivos", "resultados-clave", "iniciativas", "priorizacion", "portafolio", "capacidades", "cascada", "diagnostico"] as const;
export type ModuloExport = (typeof MODULOS_EXPORT)[number];
export const esModuloExport = (x: unknown): x is ModuloExport => MODULOS_EXPORT.includes(x as ModuloExport);

const n = (v: number | null | undefined, d = 1) => (v == null || Number.isNaN(v) ? "—" : v.toLocaleString("es-CO", { maximumFractionDigits: d }));
const fecha = () => new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

export function documentoDecisiones(modulo: ModuloExport, user: SessionUser): Documento {
  const c = catalog();
  const V = vocabOf(c.company);
  const levers = leversOf(c.company);
  const hz = horizonsOf(c.company);
  const h1 = hz[0];
  const area = (id?: string) => c.responsibles.find((r) => r.id === id)?.dependencia ?? (id ? id : "—");
  const leverName = (id?: string) => levers.find((l) => l.id === id)?.name ?? "—";
  const leverOfIni = (iniId: string) => { const i = c.initiatives.find((x) => x.id === iniId); const o = c.objectives.find((x) => x.id === i?.cmi); return leverName(o?.lever); };
  const base: Omit<Documento, "modulo" | "titulo" | "subtitulo" | "secciones"> = { empresa: c.company.name, fecha: fecha(), pie: `${V.kicker} · Gestión estratégica · 4Shine Empresas · generado el ${fecha()} por ${user.name}` };

  if (modulo === "prioridades") {
    return { ...base, modulo, titulo: V.levers, subtitulo: "Las apuestas del ciclo con su sponsor, su indicador y su tesis", secciones: [
      { titulo: `${V.levers} (${levers.length})`, columnas: ["N.º", V.lever, "Sponsor", "Indicador que la mide", "Tesis o descripción", "Estado"], anchos: [5, 22, 15, 22, 28, 8],
        filas: [...levers].sort((a, b) => a.order - b.order).map((l) => [String(l.order), l.name, area(l.ownerId), l.indicator ?? "—", l.desc ?? "—", l.propuesta ? "Propuesta" : "Aprobada"]),
        notas: ["De cada prioridad salen de 1 a 3 objetivos directivos del año, con sus resultados clave e iniciativas."] },
    ] };
  }

  if (modulo === "objetivos") {
    const ali = getAlineacion(h1?.id ?? "", "alineacion");
    const item = (id: string) => ali?.informe.items.find((x) => x.id === id);
    const objs = c.objectives.filter((o) => o.horizon === h1?.id && !o.okr);
    const filas = [...levers].sort((a, b) => a.order - b.order).flatMap((l) => objs.filter((o) => o.lever === l.id).map((o) => { const it = item(o.id); return [o.id, l.name, o.name, o.indicator ?? "—", String(keyResultsOf(c, o).length), it ? SEM_ALI[it.color].label : "Sin validar", it ? [...it.recomendaciones].slice(0, 3).join(" · ") : "—"]; }));
    const secciones: Seccion[] = [{ titulo: `${V.tabs.direccion} · ${h1 ? h1.label : ""} (${objs.length})`, intro: ali ? `Validación de alineación del ${ali.at.slice(0, 10)}: ${ali.informe.items.filter((x) => x.color === "verde").length} alineados, ${ali.informe.items.filter((x) => x.color === "amarillo").length} parciales, ${ali.informe.items.filter((x) => x.color === "rojo").length} no alineados.` : "Sin validación de alineación registrada.",
      columnas: ["Id", V.lever, "Objetivo directivo", "Indicador impulsor", "KR", "Validación", "Qué hacer"], anchos: [7, 14, 30, 16, 4, 10, 19], filas, notas: ali?.informe.resumen ? [ali.informe.resumen] : [] }];
    for (const hb of horizonesBase(c.company)) {
      const lb = c.objectives.filter((o) => o.horizon === hb.id);
      if (lb.length) secciones.push({ titulo: `Consulta · ${hb.label}`, columnas: ["Id", V.lever, "Objetivo", "Resultados"], anchos: [8, 18, 34, 40], filas: lb.map((o) => [o.id, leverName(o.lever), o.name, c.kpis.filter((k) => k.cmi === o.id || o.kpis.includes(k.code)).map((k) => { const last = k.series?.length ? k.series[k.series.length - 1] : null; return `${k.name}${last ? ` = ${n(last.value)} ${k.unit}` : ""}`; }).join(" · ") || "—"]) });
    }
    return { ...base, modulo, titulo: V.tabs.direccion, subtitulo: `Objetivos del horizonte ${h1?.label ?? ""} por ${V.leverLow}, con su validación de alineación`, secciones };
  }

  if (modulo === "resultados-clave") {
    const objs = c.objectives.filter((o) => o.horizon === h1?.id && !o.okr);
    const filas = [...levers].sort((a, b) => a.order - b.order).flatMap((l) => objs.filter((o) => o.lever === l.id).flatMap((o) => keyResultsOf(c, o).map((k) => [l.name, o.id, k.code, k.name, n(k.baseline), n(k.target), k.unit, area(k.ownerId), k.due ?? "—", String(initiativesOfKr(c, k.code).length)])));
    return { ...base, modulo, titulo: V.tabs.okr, subtitulo: `Resultados clave de ${h1?.label ?? ""} por objetivo: línea base, meta, dueño y plazo`, secciones: [
      { titulo: `${V.tabs.okr} (${filas.length})`, columnas: [V.lever, "Objetivo", "KR", "Resultado clave", "Base", "Meta", "Unidad", "Dueño", "Plazo", "Inic."], anchos: [13, 7, 9, 28, 6, 6, 7, 12, 7, 5], filas, notas: ["De 2 a 4 resultados clave por objetivo (máximo 5); cada uno con línea base, meta distinta de la base, unidad, dueño, plazo y fórmula."] },
    ] };
  }

  if (modulo === "iniciativas") {
    const val = getAlineacion(h1?.id ?? "", "alineacion-ini");
    const items = (val?.informe as unknown as ValidacionIni | undefined)?.items ?? [];
    const item = (id: string) => items.find((x) => x.id === id);
    const filas = c.initiatives.map((i) => { const it = item(i.id); return [i.id, i.name, leverOfIni(i.id), i.cmi, i.kpi || "—", area(i.ownerId), `${i.start || "—"} a ${i.end || "—"}`, i.capability || "—", n(i.budgetPlanned, 0), it ? SEM_ALI[it.color].label : "Sin validar", it ? it.recomendaciones.slice(0, 3).join(" · ") : "—"]; });
    return { ...base, modulo, titulo: V.tabs.iniciativas, subtitulo: "Qué iniciativa mueve cada resultado clave, con su formulación y su validación", secciones: [
      { titulo: `${V.tabs.iniciativas} (${filas.length})`, intro: val ? `Validación de iniciativas del ${val.at.slice(0, 10)}: ${items.filter((x) => x.color === "verde").length} alineadas, ${items.filter((x) => x.color === "amarillo").length} parciales, ${items.filter((x) => x.color === "rojo").length} por replantear.` : "Sin validación registrada.",
        columnas: ["Id", "Iniciativa", V.lever, "Objetivo", "KR", "Responsable", "Inicio y fin", "Capacidad", "Presupuesto", "Validación", "Qué hacer"], anchos: [5, 20, 11, 6, 7, 10, 9, 6, 7, 8, 11], filas },
    ] };
  }

  if (modulo === "priorizacion" || modulo === "portafolio") {
    const decisions = getDecisions();
    const ranking = rank(c.initiatives.map((i) => ({ id: i.id, horizon: i.horizon, name: i.name })), consolidatedOf, hz.map((h) => h.id));
    const filas = ranking.map((r) => { const d = decisions[r.id]; const i = c.initiatives.find((x) => x.id === r.id)!; return [r.position ? String(r.position) : "—", i.name, leverOfIni(i.id), area(i.ownerId), r.c.n ? n(r.c.score) : "—", r.c.n ? `D ${r.c.rounded.D} · E ${r.c.rounded.E} · M ${r.c.rounded.M} · L ${r.c.rounded.L}` : "sin calificar", r.c.n ? (r.c.type === "ESTRATEGICO" ? "Estratégica" : "Táctica") : "—", String(r.c.n), d ? decisionLabel(d.decision as Decision) : "Sin decisión", d?.rationale ?? "—"]; });
    const secciones: Seccion[] = [{ titulo: modulo === "priorizacion" ? "Ranking consolidado" : "Portafolio decidido", intro: modulo === "priorizacion" ? `Puntaje = (40·D + 30·E + 20·M + 10·L) ÷ 4 sobre los promedios redondeados; niveles ${Object.entries(LEVEL_NAMES).map(([k, v]) => `${k} ${v}`).join(", ")}. Orden solo entre estratégicas elegibles (impacto ≥ 3).` : "Decisión de tiempo de cada iniciativa con su sustento; las tácticas se transfieren al área y no compiten en el portafolio.",
      columnas: ["Pos.", "Iniciativa", V.lever, "Responsable", "Puntaje", "Consolidado", "Tipo", "Eval.", "Decisión", "Sustento"], anchos: [4, 20, 12, 10, 6, 14, 8, 4, 10, 12], filas }];
    if (modulo === "portafolio") {
      const porDec = (["IMPLEMENTAR", "PREPARAR", "BACKLOG", "RENUNCIAR"] as Decision[]).map((d) => [decisionLabel(d), String(Object.values(decisions).filter((x) => x.decision === d).length), c.initiatives.filter((i) => decisions[i.id]?.decision === d).map((i) => i.name).join(" · ") || "—"]);
      secciones.unshift({ titulo: "Resumen por decisión", columnas: ["Decisión", "Iniciativas", "Cuáles"], anchos: [18, 8, 74], filas: porDec });
    }
    return { ...base, modulo, titulo: modulo === "priorizacion" ? V.tabs.priorizacion : V.tabs.portafolio, subtitulo: modulo === "priorizacion" ? "Calificación consolidada, tipo, elegibilidad y orden de las iniciativas" : "Lo que la empresa decidió hacer, cuándo y por qué", secciones };
  }

  if (modulo === "capacidades") {
    const rev = getRevisionesCap(); const chk = getChecklistsCap(); const decisions = getDecisions();
    const elegibles = c.initiatives.filter((i) => { const d = decisions[i.id]?.decision; return d === "IMPLEMENTAR" || d === "PREPARAR"; });
    const filas = elegibles.map((i) => { const r = rev[i.id]; const fr = chk[i.id]?.frentes ?? FRENTES; const l = r ? lecturaCapacidades(r, fr) : null; return [i.name, area(i.ownerId), decisionLabel(decisions[i.id]?.decision as Decision), chk[i.id] ? "Personalizado" : "Genérico", l?.semaforo ? SEMAFORO[l.semaforo].label : "Sin revisar", ...FRENTES.map((f) => { const lf = l?.frentes.find((x) => x.key === f.key); return lf?.nivel ? `${lf.nivel} ${NIVEL_CAP[lf.nivel]}` : "—"; }), l ? l.brechas.map((b) => `${b.name}: ${b.falta ?? "sin describir"}`).join(" · ") || "—" : "—", r?.notas ?? "—"]; });
    return { ...base, modulo, titulo: "Capacidades para ejecutar", subtitulo: "Checklist de cinco frentes por iniciativa del portafolio: qué está instalado y qué haría falta", secciones: [
      { titulo: `Iniciativas revisadas (${filas.filter((f) => f[4] !== "Sin revisar").length} de ${filas.length})`, columnas: ["Iniciativa", "Dueño", "Decisión", "Checklist", "Capacidad", ...FRENTES.map((f) => f.name), "Qué haría falta", "Notas"], anchos: [14, 8, 8, 7, 9, 6, 6, 7, 7, 6, 14, 8], filas, notas: ["Niveles: 1 no existe, 2 parcial, 3 instalada. Por frente, el nivel más bajo de sus afirmaciones. Semáforo: lista (todo en 3), con ajustes (sin 1), con brechas críticas (algún 1)."] },
    ] };
  }

  if (modulo === "cascada") {
    const metas = getMetas(); const arts = getArticulaciones(); const decisions = getDecisions();
    const year = Number(h1?.label.match(/\d{4}/)?.[0] ?? new Date().getFullYear());
    const inis = c.initiatives.filter((i) => { const d = decisions[i.id]?.decision; return d === "IMPLEMENTAR" || d === "PREPARAR" || arts[i.id] || metas.some((m) => m.initiative === i.id); });
    const filasArt = inis.flatMap((i) => (arts[i.id]?.areas ?? []).map((a) => [leverOfIni(i.id), i.cmi, i.kpi || "—", i.name, area(a.areaId), ROL_AREA[a.rol], String(a.prioridad), a.persona ?? "—", a.contribucion, a.entrega ?? "—"]));
    const filasMetas = metas.filter((m) => m.quarter.startsWith(`${year}-`)).map((m: MetaTrimestral) => [trimestreLabel(m.quarter), leverName(m.lever), m.objective ?? "—", m.kpi ?? "—", c.initiatives.find((i) => i.id === m.initiative)?.name ?? "—", area(m.areaId), m.persona ?? "—", m.meta, m.criterio || "—", m.hitos.map((h) => `${h.name}${h.fecha ? ` (${h.fecha})` : ""} [${h.estado.toLowerCase()}]`).join(" · ") || "—", m.depende.map((d) => `${area(d.areaId)}: ${d.que}`).join(" · ") || "—", m.cierre ? `${m.cierre.cumplimiento} %` : m.estado.toLowerCase().replace("_", " ")]);
    return { ...base, modulo, titulo: "Cascada y plan trimestral", subtitulo: `${V.lever} → objetivo → resultado clave → iniciativa → área → persona o equipo → meta por trimestre (${year})`, secciones: [
      { titulo: `Articulación entre áreas (${inis.length} iniciativas)`, columnas: [V.lever, "Objetivo", "KR", "Iniciativa", "Área", "Rol", "Prior.", "Persona o equipo", "Qué debe hacer", "Entrega"], anchos: [10, 6, 7, 16, 9, 7, 4, 11, 20, 10], filas: filasArt },
      { titulo: `Metas trimestrales ${year} (${filasMetas.length})`, columnas: ["Trim.", V.lever, "Objetivo", "KR", "Iniciativa", "Área", "Persona o equipo", "Meta", "Criterio de éxito", "Hitos", "Depende de", "Estado"], anchos: [5, 8, 6, 7, 11, 8, 9, 13, 11, 10, 8, 4], filas: filasMetas },
    ] };
  }

  // diagnóstico: autoevaluación directiva consolidada por dimensión
  const rows = getF1Responses(user);
  const lecturas = rows.map((x) => lecturaF1(x.r));
  const filas = DIMS.map((d) => { const ms = lecturas.map((l) => l.dims.find((x) => x.d.code === d.code)?.m ?? null).filter((m): m is number => m != null); const m = avg(ms); return [d.code, d.name, d.cap, n(m), String(ms.length), m == null ? "Sin dato" : m < THRESHOLD ? "Brecha" : "Instalada", c.initiatives.filter((i) => (i.capability ?? "").startsWith(d.code)).map((i) => i.name).join(" · ") || "—"]; }).sort((a, b) => (a[3] === "—" ? 9 : Number(a[3].replace(",", "."))) - (b[3] === "—" ? 9 : Number(b[3].replace(",", "."))));
  return { ...base, modulo, titulo: "Diagnóstico · autoevaluación directiva", subtitulo: `Consolidado de ${rows.length} autoevaluación${rows.length === 1 ? "" : "es"} por dimensión frente al umbral ${THRESHOLD.toFixed(1)}`, secciones: [
    { titulo: "Capacidad organizacional por dimensión", columnas: ["Código", "Dimensión", "Capacidad", "Promedio", "Resp.", "Lectura", "Iniciativas que la instalan"], anchos: [7, 22, 12, 8, 6, 9, 36], filas, notas: ["Escala de 1 a 5; una dimensión bajo el umbral es una brecha: conviene que la cascada reserve hitos para instalarla antes de exigir resultado."] },
  ] };
}
